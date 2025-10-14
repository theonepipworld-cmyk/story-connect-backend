const User = require('../../models/user.model');
const mongoose = require('mongoose');
const { uploadFileToS3 } = require('../../utils/s3.util');
const { errorResponse, successResponse } = require('../../utils/responseHandler.util');
const resMessages = require("../../constants/resMessages.constants.js")
const { isPostExist, createError, isUserExist, isConversationExist } = require("../../helpers/dbHelpers.js")
const UserStats = require("../../models/userActivityStats.model");
const Block = require("../../models/block.model.js");
const Message = require("../../models/message.model.js")
const Conversation = require("../../models/conversations.model.js")
const { deleteFileFromS3 } = require("../../utils/s3.util.js")
const { getIo } = require("../../socket");
const enums = require("../../constants/enum.constants.js")
const pushNotification = require("../../utils/pushNotification.js")
const { getOnlineUsers } = require("../../socket.js")




exports.sendMessageToUserService = async (senderId, receiverId, messageText, type, files = []) => {
    try {
        if (!senderId || !receiverId || (!messageText && files.length === 0)) {
            throw createError(resMessages.validation.missingFields);
        }

        const onlineUsers = getOnlineUsers();


        const sender = await isUserExist(senderId);
        const receiver = await isUserExist(receiverId);
        if (!sender) throw createError(404, resMessages.validation.invalidSender);
        if (!receiver) throw createError(404, resMessages.validation.invalidReceiver);


        if (senderId.toString() === receiverId.toString()) throw createError(404, resMessages.validation.cannotMessageYourself);

        const isBlocked = await Block.findOne({ blocker: receiverId, blocked: senderId });
        if (isBlocked) throw createError(404, resMessages.validation.userBlocked);


        const isReceiverOnline = onlineUsers.has(receiverId.toString());
        const messageStatus = isReceiverOnline ? enums.messages_Status.DELIVERED : enums.messages_Status.SENT;


        let conversation = await Conversation.findOne({ participants: { $all: [senderId, receiverId] } });
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

        const messages = [];

        // Handle text message
        if (messageText) {
            const textMessage = new Message({
                conversationId: conversation._id,
                sender: senderId,
                text: messageText,
                type: "text",
                status: messageStatus
            });
            const savedTextMessage = await textMessage.save();
            messages.push(savedTextMessage);

            const io = getIo();
            io.emit("newMessage", savedTextMessage);
            conversation.lastMessage = {
                _id: savedTextMessage._id,
                text: savedTextMessage.text,
                type: savedTextMessage.type,
                status: savedTextMessage.status,
                sender: savedTextMessage.sender
            };


            let unseenEntry = conversation.unseenCount.find(u => u.userId.toString() === receiverId.toString());
            if (unseenEntry) unseenEntry.count += 1;
            else conversation.unseenCount.push({ userId: receiverId, count: 1 });

            if (receiver.device_token) {
                await pushNotification.androidPushNotification(receiver.device_token, messageText, "message", {
                    conversationId: conversation._id.toString(),
                    senderId: senderId.toString()
                });
            }
        }

        // Handle files
        files = Array.isArray(files) ? files : [];
        for (const file of files) {
            const uploadedFile = await uploadFileToS3(file, `messages/${conversation._id}`);
            const fileType = file.mimetype.startsWith("image/") ? "image"
                : file.mimetype.startsWith("video/") ? "video"
                    : "file";

            const fileMessage = new Message({
                conversationId: conversation._id,
                sender: senderId,
                text: uploadedFile.Location,
                type: fileType,
                status: messageStatus
            });
            const savedFileMessage = await fileMessage.save();
            messages.push(savedFileMessage);

            const io = getIo();
            io.emit("newMessage", savedFileMessage);

            conversation.lastMessage = {
                _id: savedFileMessage._id,
                text: savedFileMessage.text,
                type: savedFileMessage.type,
                status: savedFileMessage.status,
                sender: savedFileMessage.sender
            };


            let unseenEntry = conversation.unseenCount.find(u => u.userId.toString() === receiverId.toString());
            if (unseenEntry) unseenEntry.count += 1;
            else conversation.unseenCount.push({ userId: receiverId, count: 1 });

            if (receiver.device_token) {
                await pushNotification.androidPushNotification(receiver.device_token, `📎 Sent a ${fileType}`, "message", {
                    conversationId: conversation._id.toString(),
                    senderId: senderId.toString(),
                    fileType
                });
            }
        }

        conversation.updatedAt = new Date();
        await conversation.save();

        return messages;

    } catch (error) {
        throw error;
    }
};



exports.getUserConversationService = async (userId, page = 1, limit = 10, search = "") => {
    try {
        if (!userId) {
            throw createError(404, resMessages.validation.missingFields);
        }

        const user = await isUserExist(userId);
        if (!user) {
            throw createError(404, resMessages.notFound.userNotFound);
        }

        const offset = (page - 1) * limit;

        const conversations = await Conversation.aggregate([
            {
                $match: {
                    participants: new mongoose.Types.ObjectId(userId),
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "participants",
                    foreignField: "_id",
                    as: "participantsInfo",
                },
            },

            ...(search
                ? [
                    {
                        $addFields: {
                            participantsInfo: {
                                $filter: {
                                    input: "$participantsInfo",
                                    as: "p",
                                    cond: {
                                        $regexMatch: {
                                            input: "$$p.username",
                                            regex: search,
                                            options: "i",
                                        },
                                    },
                                },
                            },
                        },
                    },
                ]
                : []),

            {
                $match: {
                    "participantsInfo.0": { $exists: true },
                },
            },
            {
                $addFields: {
                    otherParticipant: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$participantsInfo",
                                    as: "p",
                                    cond: { $ne: ["$$p._id", new mongoose.Types.ObjectId(userId)] },
                                },
                            },
                            0,
                        ],
                    },
                    unseenCountForUser: {
                        $arrayElemAt: [
                            {
                                $map: {
                                    input: {
                                        $filter: {
                                            input: "$unseenCount",
                                            as: "u",
                                            cond: { $eq: ["$$u.userId", new mongoose.Types.ObjectId(userId)] },
                                        },
                                    },
                                    as: "matched",
                                    in: "$$matched.count",
                                },
                            },
                            0,
                        ],
                    },
                },
            },
            {
                $lookup: {
                    from: "messages",
                    localField: "lastMessage",
                    foreignField: "_id",
                    as: "lastMessageInfo",
                },
            },
            {
                $unwind: {
                    path: "$lastMessageInfo",
                    preserveNullAndEmptyArrays: true,
                },
            },
            { $sort: { updatedAt: -1 } },
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
                                    isOnline: { $ifNull: ["$otherParticipant.isOnline", false] },
                                },
                                lastMessage: "$lastMessageInfo.text",
                                lastMessageId: "$lastMessageInfo._id",
                                lastMessageAt: "$lastMessageInfo.createdAt",
                                lastMessageStatus: "$lastMessageInfo.status",
                                unseenCount: { $ifNull: ["$unseenCountForUser", 0] },
                                updatedAt: 1,
                            },
                        },
                    ],
                    totalCount: [{ $count: "count" }],
                },
            },
        ]);

        const data = conversations[0].data;
        const total = conversations[0].totalCount[0]?.count || 0;

        return {
            data,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                limit: parseInt(limit),
            },
        };
    } catch (error) {
        throw error;
    }
};


exports.loadMoreMessagesService = async (userId, conversationId, lastMessageId, limit = 10, page = 1) => {
    try {
        if (!userId || !conversationId || !lastMessageId) {
            throw createError(404, resMessages.validation.missingFields);
        }

        const user = await isUserExist(userId);
        if (!user) {
            throw createError(404, resMessages.notFound.userNotFound);
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            throw createError(404, resMessages.validation.invalidConversationId);
        }

        if (!conversation.participants.includes(new mongoose.Types.ObjectId(userId))) {
            throw createError(403, resMessages.auth.unauthorizedAccess);
        }

        const totalMessages = await Message.countDocuments({ conversationId });
        const totalPages = Math.ceil(totalMessages / limit);
        const skip = (page - 1) * limit;

        const lastMessage = await Message.findById(lastMessageId);
        if (!lastMessage) {
            throw createError(404, resMessages.validation.invalidMessageId);
        }

        const messages = await Message.find({
            conversationId,
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("sender", "username avatarUrl currentCountry");



        await Conversation.updateOne(
            { _id: conversationId, "unseenCount.userId": userId },
            { $set: { "unseenCount.$.count": 0 } },
            { timestamps: false }
        );

        await Message.updateMany(
            { conversationId, sender: { $ne: userId }, status: { $ne: enums.messages_Status.SEEN } },
            { $set: { status: enums.messages_Status.SEEN, updatedAt: new Date() } }
        );

        return {
            data: messages.reverse(),
            pagination: {
                total: totalMessages,
                totalPages,
                currentPage: page,
                limit,
                hasMore: page < totalPages,
            },

        };
    } catch (error) {
        throw error;
    }
};



exports.seenMessageService = async (conversationId, receiverId) => {
    try {
        if (!receiverId) {
            throw createError(403, resMessages.notFound.userNotFound);
        }
        const receiver = await isUserExist(receiverId)
        if (!receiver) {
            throw createError(403, resMessages.notFound.userNotFound);
        }

        const conversation = await isConversationExist(conversationId)
        if (!conversation.participants.some(p => p.toString() === receiverId)) {
            throw createError(403, resMessages.notFound.receiverNotPart);
        }

        const result = await Message.updateMany(
            {
                conversationId,
                sender: { $ne: receiverId },
                status: { $ne: "seen" }
            },
            { $set: { status: "seen" } }
        );

        conversation.unseenCount = conversation.unseenCount.map((u) => {
            if (u.userId.toString() === receiverId.toString()) {
                return { ...u, count: 0 };
            }
            return u;
        });
        await conversation.save();
        const io = getIo();

        io.emit("messages_seen", {
            conversationId,
            seenBy: receiverId,
            data: result
        });


        return result;


    }

    catch (error) {
        throw error;
    }
}

exports.deliveredMessageService = async (conversationId, receiverId) => {
    try {
        if (!receiverId) {
            throw createError(403, resMessages.notFound.userNotFound);
        }
        const receiver = await isUserExist(receiverId)
        if (!receiver) {
            throw createError(403, resMessages.notFound.userNotFound);
        }
        const conversation = await isConversationExist(conversationId)
        if (!conversation.participants.some(p => p.toString() === receiverId)) {
            throw createError(403, resMessages.notFound.receiverNotPart);
        }
        const result = await Message.updateMany(
            {
                conversationId,
                sender: { $ne: receiverId },
                status: "sent"
            },
            { $set: { status: "delivered" } }
        );
        const io = getIo();
        io.emit("messages_delivered", {
            conversationId,
            deliveredBy: receiverId,
            data: result
        });


        return result;
    }

    catch (error) {
        throw error;
    }
};

exports.updateMessageService = async (conversationId, messageId, messageText, userId) => {
    try {
        const { message } = await validateMessageAction(conversationId, messageId, userId);
        const update = await Message.updateOne(
            { _id: messageId },
            { $set: { text: messageText } }
        );
        const io = getIo();
        io.emit("messages_updated", {
            conversationId,
            updatedby: userId,
            updatedMessage: message
        });
        return update;
    } catch (error) {
        throw error;
    }
};

exports.deleteMessageservice = async (conversationId, messageId, userId) => {
    try {
        const { message } = await validateMessageAction(conversationId, messageId, userId);
        const deleted = await Message.deleteOne({ _id: messageId });
        const io = getIo();
        io.emit("messages_deleted", {
            conversationId,
            deletedby: userId,
            deletedMessage: message
        });
        return deleted;
    } catch (error) {
        throw error;
    }
};

exports.deleteConversationService = async (conversationId, userId) => {
    try {
        if (!userId) {
            throw createError(403, resMessages.notFound.userNotFound);
        }
        const user = await isUserExist(userId)
        if (!user) {
            throw createError(403, resMessages.notFound.userNotFound);
        }
        const conversation = await isConversationExist(conversationId)
        if (!conversation.participants.some(p => p.toString() === userId)) {
            throw createError(403, resMessages.notFound.receiverNotPart);
        }
        const result = await Conversation.updateOne(
            { _id: conversationId },
            { $addToSet: { hiddenBy: userId } }
        );
        return result;
    }
    catch (error) {
        throw error;
    }
}


const validateMessageAction = async (conversationId, messageId, userId) => {
    if (!userId) throw createError(403, resMessages.notFound.userNotFound);

    const user = await isUserExist(userId);
    if (!user) throw createError(403, resMessages.notFound.userNotFound);

    const conversation = await isConversationExist(conversationId);
    if (!conversation.participants.some(p => p.toString() === userId.toString())) {
        throw createError(403, resMessages.notFound.receiverNotPart);
    }

    const message = await Message.findById(messageId);
    if (!message) throw createError(404, resMessages.notFound.messageNotFound);

    if (message.sender.toString() !== userId.toString()) {
        throw createError(403, resMessages.customError.NotAuthorized);
    }

    if (message.conversationId.toString() !== conversationId.toString()) {
        throw createError(400, resMessages.customError.invalidConversation);
    }

    return { user, conversation, message };
};

