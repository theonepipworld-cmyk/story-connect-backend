const User = require('../../models/user.model');
const mongoose = require('mongoose');
const { createError, isUserExist, isConversationExist } = require("../../helpers/dbHelpers.js");
const Block = require("../../models/block.model.js");
const Message = require("../../models/message.model.js");
const Conversation = require("../../models/conversations.model.js");
const { getIo, getAllUserSocketIds } = require("../../socket");
const enums = require("../../constants/enum.constants.js");
const pushNotification = require("../../utils/pushNotification.js");

const emitToUser = (userId, event, payload) => {
    const io = getIo();
    getAllUserSocketIds(userId.toString()).forEach(sid => {
        io.to(sid).emit(event, payload);
    });
};

const emitToUsers = (userIds, event, payload) => {
    userIds.forEach(uid => emitToUser(uid, event, payload));
};

const sendPushNotification = async (receiver, body, data) => {
    if (!receiver?.device_token || !receiver?.isPushNotification) return;
    try {
        await pushNotification.androidPushNotification(receiver.device_token, body, "message", data);
    } catch (error) {
        if (
            error.code === 'messaging/invalid-argument' ||
            error.code === 'messaging/registration-token-not-registered'
        ) {
            await User.findByIdAndUpdate(receiver._id, { device_token: null });
        }
    }
};

const getTotalUnseenCount = async (userId) => {
    const allConversations = await Conversation.find({
        participants: new mongoose.Types.ObjectId(userId)
    }).select('unseenCount');

    return allConversations.reduce((total, conv) => {
        const entry = conv.unseenCount.find(u => u.userId.toString() === userId.toString());
        return total + (entry?.count || 0);
    }, 0);
};

const validateMessageAction = async (conversationId, messageId, userId) => {
    if (!userId) throw createError(404, 'userNotFound', 'notFound');

    const user = await isUserExist(userId);
    if (!user) throw createError(404, 'userNotFound', 'notFound');

    const conversation = await isConversationExist(conversationId);
    if (!conversation.participants.some(p => p.toString() === userId.toString())) {
        throw createError(403, 'receiverNotPart', 'notFound');
    }

    const message = await Message.findById(messageId);
    if (!message) throw createError(404, 'messageNotFound', 'notFound');

    if (message.sender.toString() !== userId.toString()) {
        throw createError(403, 'NotAuthorized', 'customError');
    }

    if (message.conversationId.toString() !== conversationId.toString()) {
        throw createError(400, 'invalidConversation', 'customError');
    }

    return { user, conversation, message };
};

exports.sendMessageToUserService = async (senderId, receiverId, messageText, type, files = []) => {
    try {
        const filesArr = Array.isArray(files) ? files : [];

        if (!senderId || !receiverId || (!messageText && filesArr.length === 0)) {
            throw createError(400, 'missingFields', 'validation');
        }

        const [sender, receiver] = await Promise.all([
            isUserExist(senderId),
            isUserExist(receiverId)
        ]);

        if (!sender || !receiver) throw createError(404, 'invalidUser', 'validation');
        if (senderId.toString() === receiverId.toString()) {
            throw createError(400, 'cannotMessageYourself', 'validation');
        }

        const isBlocked = await Block.findOne({
            $or: [
                { blocker: receiverId, blocked: senderId },
                { blocker: senderId, blocked: receiverId }
            ]
        });

        if (isBlocked) {
            const blockedByThem = isBlocked.blocker.toString() === receiverId.toString();
            return [{
                blocked: true,
                message: blockedByThem
                    ? "You have been blocked by this user"
                    : "You have blocked this user"
            }];
        }

        const receiverSocketIds = getAllUserSocketIds(receiverId.toString());
        const messageStatus = receiverSocketIds.length > 0
            ? enums.messages_Status.DELIVERED
            : enums.messages_Status.SENT;

        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }
        });

        if (!conversation) {
            conversation = new Conversation({
                participants: [senderId, receiverId],
                unseenCount: [
                    { userId: senderId, count: 0 },
                    { userId: receiverId, count: 0 }
                ]
            });
            await conversation.save();
        }

        // Increment unseen count for receiver BEFORE emitting
        // so the emitted unseenCount value is already correct
        const unseen = conversation.unseenCount.find(
            u => u.userId.toString() === receiverId.toString()
        );

        if (unseen) {
            unseen.count++;
        } else {
            conversation.unseenCount.push({ userId: receiverId, count: 1 });
        }

        const receiverNewUnseenCount = conversation.unseenCount.find(
            u => u.userId.toString() === receiverId.toString()
        )?.count || 1;

        const emitNewMessage = (savedMessage) => {
            const basePayload = savedMessage.toObject();

            const conversationUpdate = {
                conversationId: conversation._id.toString(),
                lastMessage: savedMessage.text,
                lastMessageType: savedMessage.type,
                lastMessageAt: savedMessage.createdAt,
                lastMessageStatus: savedMessage.status,
                lastMessageSenderId: senderId.toString(),
                participant: {
                    _id: sender._id,
                    username: sender.username,
                    avatarUrl: sender.avatarUrl,
                }
            };

            // Emit to sender — unseenCount 0 (their own message, no badge)
            getAllUserSocketIds(senderId.toString()).forEach(sid => {
                getIo().to(sid).emit("newMessage", {
                    ...basePayload,
                    conversationId: conversation._id.toString(),
                    senderId: senderId.toString(),
                    senderName: sender.username,
                    senderAvatar: sender.avatarUrl,
                    isFromMe: true
                });

                getIo().to(sid).emit("conversationUpdated", {
                    ...conversationUpdate,
                    unseenCount: 0
                });
            });

            // Emit to receiver — send correct (already incremented) unseenCount
            if (receiverSocketIds.length > 0) {
                receiverSocketIds.forEach(sid => {
                    getIo().to(sid).emit("newMessage", {
                        ...basePayload,
                        conversationId: conversation._id.toString(),
                        senderId: senderId.toString(),
                        senderName: sender.username,
                        senderAvatar: sender.avatarUrl,
                        isFromMe: false
                    });

                    getIo().to(sid).emit("conversationUpdated", {
                        ...conversationUpdate,
                        unseenCount: receiverNewUnseenCount
                    });

                    getIo().to(sid).emit("badgeCountUpdate", {
                        chatUnread: receiverNewUnseenCount
                    });
                });
            }
        };

        // FIXED: save only ObjectId in conversation.lastMessage
        const updateConversationState = (savedMessage) => {
            conversation.lastMessage = savedMessage._id;
        };

        /** Call after conversation.save() so getTotalUnseenCount matches DB */
        const emitReceiverTotalBadge = async () => {
            if (receiverSocketIds.length === 0) return;
            const totalChatUnread = await getTotalUnseenCount(receiverId.toString());
            emitToUser(receiverId.toString(), "badgeCountUpdate", { chatUnread: totalChatUnread });
        };

        const messages = [];

        if (messageText && Array.isArray(files) && files.length > 0) {
            const uploadedFiles = files.map(file => ({
                url: file.location,
                mimeType: file.mimetype
            }));

            const savedMessage = await new Message({
                conversationId: conversation._id,
                sender: senderId,
                text: messageText,
                type: "post",
                files: uploadedFiles,
                status: messageStatus
            }).save();

            messages.push(savedMessage);
            updateConversationState(savedMessage);
            emitNewMessage(savedMessage);

            await sendPushNotification(receiver, messageText, {
                conversationId: conversation._id.toString(),
                senderId: senderId.toString(),
                senderName: sender.username?.toString(),
                senderImage: sender.avatarUrl?.toString(),
                type: "post"
            });

            conversation.updatedAt = new Date();
            await conversation.save();
            await emitReceiverTotalBadge();
            return messages;
        }

        if (messageText && (!files || files.length === 0)) {
            const savedMessage = await new Message({
                conversationId: conversation._id,
                sender: senderId,
                text: messageText,
                type: "text",
                status: messageStatus
            }).save();

            messages.push(savedMessage);
            updateConversationState(savedMessage);
            emitNewMessage(savedMessage);

            await sendPushNotification(receiver, messageText, {
                conversationId: conversation._id.toString(),
                senderId: senderId.toString()
            });
        }

        if ((!messageText || messageText.trim() === "") && Array.isArray(files) && files.length > 0) {
            for (const file of files) {
                const fileType = file.mimetype.startsWith("image/")
                    ? "image"
                    : file.mimetype.startsWith("video/") ? "video" : "file";

                const savedMessage = await new Message({
                    conversationId: conversation._id,
                    sender: senderId,
                    text: file.location,
                    type: fileType,
                    status: messageStatus
                }).save();

                messages.push(savedMessage);
                updateConversationState(savedMessage);
                emitNewMessage(savedMessage);

                await sendPushNotification(receiver, `Sent a ${fileType}`, {
                    conversationId: conversation._id.toString(),
                    senderId: senderId.toString()
                });
            }
        }

        conversation.updatedAt = new Date();
        await conversation.save();
        await emitReceiverTotalBadge();
        return messages;

    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};

exports.getUserConversationService = async (userId, page = 1, limit = 10, search = "") => {
    try {
        if (!userId) throw createError(400, 'missingFields', 'validation');

        const user = await isUserExist(userId);
        if (!user) throw createError(404, 'userNotFound', 'notFound');

        const offset = (page - 1) * limit;

        const blockedUsers = await Block.find({
            $or: [{ blocker: userId }, { blocked: userId }]
        }).lean();

        const blockedUserIds = blockedUsers.map(b =>
            b.blocker.toString() === userId.toString()
                ? b.blocked.toString()
                : b.blocker.toString()
        );

        const conversations = await Conversation.aggregate([
            { $match: { participants: new mongoose.Types.ObjectId(userId) } },
            {
                $lookup: {
                    from: "users",
                    localField: "participants",
                    foreignField: "_id",
                    as: "participantsInfo"
                }
            },
            ...(search ? [{
                $addFields: {
                    participantsInfo: {
                        $filter: {
                            input: "$participantsInfo",
                            as: "p",
                            cond: { $regexMatch: { input: "$$p.username", regex: search, options: "i" } }
                        }
                    }
                }
            }] : []),
            { $match: { "participantsInfo.0": { $exists: true } } },
            {
                $addFields: {
                    otherParticipant: {
                        $arrayElemAt: [{
                            $filter: {
                                input: "$participantsInfo",
                                as: "p",
                                cond: { $ne: ["$$p._id", new mongoose.Types.ObjectId(userId)] }
                            }
                        }, 0]
                    },
                    unseenCountForUser: {
                        $arrayElemAt: [{
                            $map: {
                                input: {
                                    $filter: {
                                        input: "$unseenCount",
                                        as: "u",
                                        cond: { $eq: ["$$u.userId", new mongoose.Types.ObjectId(userId)] }
                                    }
                                },
                                as: "matched",
                                in: "$$matched.count"
                            }
                        }, 0]
                    }
                }
            },
            { $lookup: { from: "messages", localField: "lastMessage", foreignField: "_id", as: "lastMessageInfo" } },
            { $unwind: { path: "$lastMessageInfo", preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    isBlocked: {
                        $in: ["$otherParticipant._id", blockedUserIds.map(id => new mongoose.Types.ObjectId(id))]
                    },
                    isBlockedByMe: {
                        $in: ["$otherParticipant._id", blockedUsers
                            .filter(b => b.blocker.toString() === userId.toString())
                            .map(b => new mongoose.Types.ObjectId(b.blocked))
                        ]
                    }
                }
            },
            { $sort: { "lastMessageInfo.createdAt": -1 } },
            {
                $facet: {
                    data: [
                        { $skip: offset },
                        { $limit: limit },
                        {
                            $project: {
                                _id: 1,
                                participant: {
                                    _id: "$otherParticipant._id",
                                    username: "$otherParticipant.username",
                                    avatarUrl: "$otherParticipant.avatarUrl",
                                    isOnline: { $ifNull: ["$otherParticipant.isOnline", false] }
                                },
                                isBlocked: 1,
                                isBlockedByMe: 1,
                                lastMessage: "$lastMessageInfo.text",
                                lastMessageId: "$lastMessageInfo._id",
                                lastMessageAt: "$lastMessageInfo.createdAt",
                                lastMessageStatus: "$lastMessageInfo.status",
                                lastMessageType: "$lastMessageInfo.type",
                                unseenCount: { $ifNull: ["$unseenCountForUser", 0] },
                                lastMessageSenderId: "$lastMessageInfo.sender",
                                updatedAt: 1
                            }
                        }
                    ],
                    totalCount: [{ $count: "count" }]
                }
            }
        ]);

        const data = conversations[0]?.data || [];
        const total = conversations[0]?.totalCount[0]?.count || 0;

        return {
            data,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                limit: parseInt(limit)
            }
        };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};

// ─── FIXED: loadMoreMessagesService ──────────────────────────────────────────
// REMOVED all automatic seen marking from here.
// Seen marking ONLY happens via seenMessageService which frontend calls
// explicitly when user is actually viewing the conversation.
// This was the ROOT CAUSE of the bug — loading chat history was marking
// messages as seen even when user was on a different conversation.
exports.loadMoreMessagesService = async (userId, conversationId, lastMessageId, limit = 10, page = 1) => {
    try {
        // lastMessageId is optional — don't throw if missing
        if (!userId || !conversationId) {
            throw createError(400, 'missingFields', 'validation');
        }

        const user = await isUserExist(userId);
        if (!user) throw createError(404, 'userNotFound', 'notFound');

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) throw createError(404, 'invalidConversationId', 'validation');

        if (!conversation.participants.some(p => p.toString() === userId.toString())) {
            throw createError(403, 'unauthorizedAccess', 'auth');
        }

        // Validate lastMessageId only if provided
        if (lastMessageId) {
            const lastMessage = await Message.findById(lastMessageId);
            if (!lastMessage) throw createError(404, 'invalidMessageId', 'validation');
        }

        const skip = (page - 1) * limit;
        const [totalMessages, messages] = await Promise.all([
            Message.countDocuments({ conversationId }),
            Message.find({ conversationId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("sender", "username avatarUrl currentCountry")
        ]);

        const totalPages = Math.ceil(totalMessages / limit);

        // ✅ NO seen marking here — frontend calls seenMessageService explicitly
        // when user is confirmed to be viewing the conversation (after 800ms delay)

        return {
            data: messages.reverse(),
            pagination: {
                total: totalMessages,
                totalPages,
                currentPage: page,
                limit,
                hasMore: page < totalPages
            }
        };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};

// ─── FIXED: seenMessageService ────────────────────────────────────────────────
// Added early return if unseenCount is already 0 — prevents ghost seen events
// being emitted when there's nothing to mark.
exports.seenMessageService = async (conversationId, receiverId) => {
    try {
        if (!receiverId) throw createError(400, 'userNotFound', 'notFound');

        const receiver = await isUserExist(receiverId);
        if (!receiver) throw createError(404, 'userNotFound', 'notFound');

        const conversation = await isConversationExist(conversationId);
        if (!conversation.participants.some(p => p.toString() === receiverId.toString())) {
            throw createError(403, 'receiverNotPart', 'notFound');
        }

        // ✅ FIX: Early return if nothing to mark seen
        // Without this, seen tick was being emitted even when count was already 0
        const unseenEntry = conversation.unseenCount.find(
            u => u.userId.toString() === receiverId.toString()
        );

        if (!unseenEntry || unseenEntry.count === 0) {
            // Check if any messages are actually unseen before bailing
            const hasUnseenMessages = await Message.exists({
                conversationId,
                sender: { $ne: receiverId },
                status: { $ne: "seen" }
            });

            if (!hasUnseenMessages) {
                return { modifiedCount: 0 };
            }
        }

        // Update message status first. If there are no messages that actually
        // need marking, don't clear unseenCount and don't emit seen events.
        // This prevents "ghost seen" where unseenCount becomes 0 even though
        // everything was already marked as seen.
        const result = await Message.updateMany(
            { conversationId, sender: { $ne: receiverId }, status: { $ne: "seen" } },
            { $set: { status: "seen" } }
        );

        const matchedCount = result?.matchedCount ?? 0;
        const modifiedCount = result?.modifiedCount ?? 0;

        if (!result || Number(matchedCount) === 0 || Number(modifiedCount) === 0) {
            console.log(
                '[seenMessageService] matchedCount=0, skipping emits',
                { conversationId, receiverId, matchedCount, modifiedCount }
            );
            return { modifiedCount: 0 };
        }

        // Now it's safe to clear the receiver's unseenCount.
        await Conversation.updateOne(
            { _id: conversationId, "unseenCount.userId": receiverId },
            { $set: { "unseenCount.$.count": 0 } },
            { timestamps: false }
        );

        const senderId = conversation.participants.find(
            p => p.toString() !== receiverId.toString()
        );

        const senderUnseenCount = senderId
            ? (conversation.unseenCount.find(
                u => u.userId.toString() === senderId.toString()
            )?.count || 0)
            : 0;

        // Receiver side unseen count is cleared; sender side should keep its own unseen count.
        const conversationUpdateForSender = {
            conversationId: conversation._id.toString(),
            lastMessageStatus: "seen",
            unseenCount: senderUnseenCount
        };

        const conversationUpdateForReceiver = {
            conversationId: conversation._id.toString(),
            lastMessageStatus: "seen",
            unseenCount: 0
        };

        if (senderId) {
            emitToUser(senderId.toString(), "messages_seen", {
                conversationId,
                seenBy: receiverId,
                data: result
            });
            emitToUser(senderId.toString(), "conversationUpdated", conversationUpdateForSender);
        }

        const totalChatUnread = await getTotalUnseenCount(receiverId.toString());
        emitToUser(receiverId.toString(), "conversationUpdated", conversationUpdateForReceiver);
        emitToUser(receiverId.toString(), "badgeCountUpdate", { chatUnread: totalChatUnread });
        console.log('[seenMessageService] emitted conversationUpdated', {
            conversationId: conversation._id.toString(),
            receiverId: receiverId.toString(),
            unseenCountForReceiver: 0,
            unseenCountForSender: senderUnseenCount
        });

        return result;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};

exports.deliveredMessageService = async (conversationId, receiverId) => {
    try {
        if (!receiverId) throw createError(400, 'userNotFound', 'notFound');

        const receiver = await isUserExist(receiverId);
        if (!receiver) throw createError(404, 'userNotFound', 'notFound');

        const conversation = await isConversationExist(conversationId);
        if (!conversation.participants.some(p => p.toString() === receiverId.toString())) {
            throw createError(403, 'receiverNotPart', 'notFound');
        }

        const result = await Message.updateMany(
            { conversationId, sender: { $ne: receiverId }, status: "sent" },
            { $set: { status: "delivered" } }
        );

        if (result.modifiedCount === 0) return result;

        const senderId = conversation.participants.find(
            p => p.toString() !== receiverId.toString()
        );

        const conversationUpdate = {
            conversationId: conversation._id.toString(),
            lastMessageStatus: "delivered"
        };

        if (senderId) {
            emitToUser(senderId.toString(), "messages_delivered", {
                conversationId,
                deliveredTo: receiverId,
                data: result
            });
            emitToUser(senderId.toString(), "conversationUpdated", conversationUpdate);
        }

        emitToUser(receiverId.toString(), "conversationUpdated", conversationUpdate);

        return result;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};

exports.updateMessageService = async (conversationId, messageId, messageText, userId) => {
    try {
        const { message, conversation } = await validateMessageAction(conversationId, messageId, userId);

        const update = await Message.updateOne(
            { _id: messageId },
            { $set: { text: messageText, updatedAt: new Date() } }
        );

        const otherParticipantId = conversation.participants.find(
            p => p.toString() !== userId.toString()
        );

        const payload = {
            conversationId,
            updatedMessage: { ...message.toObject(), text: messageText }
        };

        emitToUsers(
            [userId.toString(), otherParticipantId?.toString()].filter(Boolean),
            "messages_updated",
            payload
        );

        return update;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};

exports.deleteMessageservice = async (conversationId, messageId, userId) => {
    try {
        const { message, conversation } = await validateMessageAction(conversationId, messageId, userId);

        const deleted = await Message.deleteOne({ _id: messageId });

        const otherParticipantId = conversation.participants.find(
            p => p.toString() !== userId.toString()
        );

        const payload = {
            conversationId,
            deletedMessage: message
        };

        emitToUsers(
            [userId.toString(), otherParticipantId?.toString()].filter(Boolean),
            "messages_deleted",
            payload
        );

        return deleted;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};

exports.deleteConversationService = async (conversationId, userId) => {
    try {
        if (!userId) throw createError(400, 'userNotFound', 'notFound');

        const user = await isUserExist(userId);
        if (!user) throw createError(404, 'userNotFound', 'notFound');

        const conversation = await isConversationExist(conversationId);
        if (!conversation.participants.some(p => p.toString() === userId.toString())) {
            throw createError(403, 'receiverNotPart', 'notFound');
        }

        const result = await Conversation.updateOne(
            { _id: conversationId },
            { $addToSet: { hiddenBy: userId } }
        );

        emitToUser(userId.toString(), "conversation_deleted", { conversationId });

        return result;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};