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
    console.log("Emitting event -------", getAllUserSocketIds(userId.toString()));
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


// Helper: map uploaded files to mediaUrls schema shape
const mapFilesToMediaUrls = (files) => {
    return files.map(file => ({
        url: file.location,
        thumbnailUrl: file.thumbnailUrl ?? null,
        mediaType: file.mimetype.startsWith("image/") ? "image"
            : file.mimetype.startsWith("video/") ? "video" : "file"
    }));
};


exports.sendMessageToUserService = async (senderId, receiverId, messageText, type, files = []) => {
    try {
        if (!senderId || !receiverId || (!messageText && files.length === 0)) {
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


        const emitNewMessage = (savedMessage) => {
            const basePayload = savedMessage.toObject();
            const conversationUpdate = {
                conversationId: conversation._id.toString(),
                lastMessage: savedMessage.text,
                lastMessageType: savedMessage.type,
                lastMessageAt: savedMessage.createdAt,
                lastMessageStatus: savedMessage.status,
                participant: {
                    _id: sender._id,
                    username: sender.username,
                    avatarUrl: sender.avatarUrl,
                }
            };


            getAllUserSocketIds(senderId.toString()).forEach(sid => {
                getIo().to(sid).emit("newMessage", {
                    ...basePayload,
                    senderName: sender.username,
                    senderAvatar: sender.avatarUrl,
                    isFromMe: true
                });
                getIo().to(sid).emit("conversationUpdated", {
                    ...conversationUpdate,
                    unseenCount: 0
                });
            });


            if (receiverSocketIds.length > 0) {
                const currentUnseen = conversation.unseenCount.find(
                    u => u.userId.toString() === receiverId.toString()
                )?.count || 0;

                receiverSocketIds.forEach(sid => {
                    getIo().to(sid).emit("newMessage", {
                        ...basePayload,
                        senderName: sender.username,
                        senderAvatar: sender.avatarUrl,
                        isFromMe: false
                    });
                    getIo().to(sid).emit("conversationUpdated", {
                        ...conversationUpdate,
                        unseenCount: currentUnseen
                    });
                    getIo().to(sid).emit("badgeCountUpdate", {
                        chatUnread: currentUnseen + 1
                    });
                });
            }
        };


        const updateConversationState = (savedMessage) => {
            conversation.lastMessage = {
                _id: savedMessage._id,
                text: savedMessage.text,
                type: savedMessage.type,
                status: savedMessage.status,
                sender: savedMessage.sender
            };
            const unseen = conversation.unseenCount.find(
                u => u.userId.toString() === receiverId.toString()
            );
            unseen
                ? unseen.count++
                : conversation.unseenCount.push({ userId: receiverId, count: 1 });
        };

        const messages = [];


        // Case 1: text + files together → type "post"
        if (messageText && Array.isArray(files) && files.length > 0) {
            const savedMessage = await new Message({
                conversationId: conversation._id,
                sender: senderId,
                text: messageText,
                type: "post",
                mediaUrls: mapFilesToMediaUrls(files),
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
            return messages;
        }


        // Case 2: text only → type "text"
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
                senderId: senderId.toString(),
                senderImage: sender.avatarUrl?.toString(),
            });
        }


        // Case 3: files only → one message per file
        if ((!messageText || messageText.trim() === "") && Array.isArray(files) && files.length > 0) {
            for (const file of files) {
                const fileType = file.mimetype.startsWith("image/") ? "image"
                    : file.mimetype.startsWith("video/") ? "video" : "file";

                const savedMessage = await new Message({
                    conversationId: conversation._id,
                    sender: senderId,
                    text: file.location,
                    type: fileType,
                    mediaUrls: [{
                        url: file.location,
                        thumbnailUrl: file.thumbnailUrl ?? null,
                        mediaType: fileType
                    }],
                    status: messageStatus
                }).save();

                messages.push(savedMessage);
                updateConversationState(savedMessage);
                emitNewMessage(savedMessage);


                await sendPushNotification(receiver, `Sent a ${fileType}`, {
                    conversationId: conversation._id.toString(),
                    senderId: senderId.toString(),
                    senderImage: sender.avatarUrl?.toString(),
                });
            }
        }

        conversation.updatedAt = new Date();
        await conversation.save();
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




exports.loadMoreMessagesService = async (userId, conversationId, lastMessageId, limit = 10, page = 1) => {
    try {
        if (!userId || !conversationId || !lastMessageId) {
            throw createError(400, 'missingFields', 'validation');
        }

        const user = await isUserExist(userId);
        if (!user) throw createError(404, 'userNotFound', 'notFound');

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) throw createError(404, 'invalidConversationId', 'validation');

        if (!conversation.participants.some(p => p.toString() === userId.toString())) {
            throw createError(403, 'unauthorizedAccess', 'auth');
        }

        const lastMessage = await Message.findById(lastMessageId);
        if (!lastMessage) throw createError(404, 'invalidMessageId', 'validation');

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
        const hasUnread = await Message.exists({
            conversationId,
            sender: { $ne: userId },
            status: { $ne: enums.messages_Status.SEEN }
        });

        if (hasUnread) {
            await Promise.all([
                Conversation.updateOne(
                    { _id: conversationId, "unseenCount.userId": userId },
                    { $set: { "unseenCount.$.count": 0 } },
                    { timestamps: false }
                ),
                Message.updateMany(
                    { conversationId, sender: { $ne: userId }, status: { $ne: enums.messages_Status.SEEN } },
                    { $set: { status: enums.messages_Status.SEEN, updatedAt: new Date() } }
                )
            ]);
        }

        const senderId = conversation.participants.find(p => p.toString() !== userId.toString());
        console.log("senderId for seen update:----", senderId);

        if (hasUnread && senderId) {
            // emitToUser(senderId.toString(), "messages_seen", {
            //     conversationId,
            //     seenBy: userId
            // });

            // emitToUser(senderId.toString(), "conversationUpdated", {
            //     conversationId: conversation._id.toString(),
            //     lastMessageStatus: "seen",
            //     unseenCount: 0
            // });

            // emitToUser(userId.toString(), "conversationUpdated", {
            //     conversationId: conversation._id.toString(),
            //     lastMessageStatus: "seen",
            //     unseenCount: 0
            // });
        }

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
        console.log("ERROR::", error);
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};




exports.seenMessageService = async (conversationId, loggedInUserId) => {
    try {
        if (!loggedInUserId) throw createError(400, 'userNotFound', 'notFound');

        const receiver = await isUserExist(loggedInUserId);
        if (!receiver) throw createError(404, 'userNotFound', 'notFound');

        const conversation = await isConversationExist(conversationId);
        if (!conversation.participants.some(p => p.toString() === loggedInUserId.toString())) {
            throw createError(403, 'receiverNotPart', 'notFound');
        }

        console.log(" message seeen ---", conversation.lastMessage);

        const result = await Message.updateMany(
            { conversationId, sender: { $ne: loggedInUserId }, status: { $ne: "seen" } },
            { $set: { status: "seen" } }
        );

        const matchedCount = Number(result?.matchedCount ?? 0);
        const modifiedCount = Number(result?.modifiedCount ?? 0);
        if (matchedCount === 0 || modifiedCount === 0) {
            return { modifiedCount: 0 };
        }

        await Conversation.updateOne(
            { _id: conversationId, "unseenCount.userId": loggedInUserId },
            { $set: { "unseenCount.$.count": 0 } },
            { timestamps: false }
        );

        const senderId = conversation.participants.find(
            p => p.toString() !== loggedInUserId.toString()
        );

        const senderUnseenCount = senderId
            ? (conversation.unseenCount.find(u => u.userId.toString() === senderId.toString())?.count || 0)
            : 0;

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

        const lastMsg = await Message.findById(conversation.lastMessage).select("sender");

        if (
            senderId &&
            lastMsg &&
            lastMsg.sender.toString() !== loggedInUserId.toString()
        ) {
            emitToUser(senderId.toString(), "messages_seen", {
                conversationId,
                seenBy: loggedInUserId
            });

            emitToUser(senderId.toString(), "conversationUpdated", conversationUpdateForSender);
        }

        // ✅ receiver updates
        const totalChatUnread = await getTotalUnseenCount(loggedInUserId.toString());

        emitToUser(loggedInUserId.toString(), "conversationUpdated", conversationUpdateForReceiver);
        emitToUser(loggedInUserId.toString(), "badgeCountUpdate", { chatUnread: totalChatUnread });

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