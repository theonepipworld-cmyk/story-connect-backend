const User = require('../../models/user.model');
const mongoose = require('mongoose');
const { uploadFileToS3 } = require('../../utils/s3.util');
const { createError, isUserExist, isConversationExist } = require("../../helpers/dbHelpers.js");
const Block = require("../../models/block.model.js");
const Message = require("../../models/message.model.js");
const Conversation = require("../../models/conversations.model.js");
const { getIo } = require("../../socket");
const enums = require("../../constants/enum.constants.js");
const pushNotification = require("../../utils/pushNotification.js");
const { getOnlineUsers } = require("../../socket.js");
const resMessages = require("../../constants/resMessages.constants.js");


// SEND MESSAGE
exports.sendMessageToUserService = async (senderId, receiverId, messageText, type, files = []) => {
    try {
        if (!senderId || !receiverId || (!messageText && files.length === 0)) {
            throw createError(400, 'missingFields', 'validation');
        }
        const onlineUsers = getOnlineUsers();

        const sender = await isUserExist(senderId);
        if (!sender) throw createError(404, 'invalidSender', 'validation');

        const receiver = await isUserExist(receiverId);
        if (!receiver) throw createError(404, 'invalidReceiver', 'validation');

        if (senderId.toString() === receiverId.toString()) throw createError(400, 'cannotMessageYourself', 'validation');

        const isBlocked = await Block.findOne({ blocker: receiverId, blocked: senderId });
        if (isBlocked) throw createError(403, 'userBlocked', 'validation');

        const messageStatus = onlineUsers.has(receiverId.toString())
            ? enums.messages_Status.DELIVERED
            : enums.messages_Status.SENT;



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

        // TEXT MESSAGE
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

            console.log('Sending FCM to token:', receiver.device_token);

            if (receiver.device_token) {
                try {
                    await pushNotification.androidPushNotification(
                        receiver.device_token,
                        messageText,
                        "message",
                        {
                            conversationId: conversation._id.toString(),
                            senderId: senderId.toString(),
                            senderName:sender.username.toString(),
                            senderImage:sender.avatarUrl.toString(),
                            lastMessageId: savedTextMessage._id.toString()
                        }
                    );
                } catch (error) {
                    console.error(`Failed to send push to user ${receiver._id}:`, error.message);
                    if (error.code === 'messaging/invalid-argument' ||
                        error.code === 'messaging/registration-token-not-registered') {
                        await User.update(
                            { device_token: null },
                            { where: { id: receiver._id } }
                        );
                        console.log(`Cleared invalid device token for user ${receiver._id}`);
                    }
                }
            }
        }

        // FILES
        files = Array.isArray(files) ? files : [];
        for (const file of files) {
            const uploadedFile = await uploadFileToS3(file, `messages/${conversation._id}`);
            const fileType = file.mimetype.startsWith("image/") ? "image" : file.mimetype.startsWith("video/") ? "video" : "file";

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
                try {
                    await pushNotification.androidPushNotification(receiver.device_token, `Sent a ${fileType}`, "message", {
                        conversationId: conversation._id.toString(),
                        senderId: senderId.toString(),
                        fileType
                    });
                }
                catch (error) {
                    console.error(`Failed to send push to user ${receiver._id}:`, error.message);
                    if (error.code === 'messaging/invalid-argument' ||
                        error.code === 'messaging/registration-token-not-registered') {
                        await User.update(
                            { device_token: null },
                            { where: { id: receiver._id } }
                        );
                        console.log(`Cleared invalid device token for user ${receiver._id}`);
                    }

                }
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


// GET USER CONVERSATIONS
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
            b.blocker.toString() === userId.toString() ? b.blocked.toString() : b.blocker.toString()
        );

        const conversations = await Conversation.aggregate([
            { $match: { participants: new mongoose.Types.ObjectId(userId) } },
            {
                $lookup: {
                    from: "users",
                    localField: "participants",
                    foreignField: "_id",
                    as: "participantsInfo",
                }
            },
            ...(search
                ? [{
                    $addFields: {
                        participantsInfo: {
                            $filter: {
                                input: "$participantsInfo",
                                as: "p",
                                cond: { $regexMatch: { input: "$$p.username", regex: search, options: "i" } }
                            }
                        }
                    }
                }]
                : []),
            { $match: { "participantsInfo.0": { $exists: true } } },
            {
                $addFields: {
                    otherParticipant: {
                        $arrayElemAt: [
                            { $filter: { input: "$participantsInfo", as: "p", cond: { $ne: ["$$p._id", new mongoose.Types.ObjectId(userId)] } } },
                            0
                        ]
                    },
                    unseenCountForUser: {
                        $arrayElemAt: [
                            { $map: { input: { $filter: { input: "$unseenCount", as: "u", cond: { $eq: ["$$u.userId", new mongoose.Types.ObjectId(userId)] } } }, as: "matched", in: "$$matched.count" } },
                            0
                        ]
                    }
                }
            },
            { $lookup: { from: "messages", localField: "lastMessage", foreignField: "_id", as: "lastMessageInfo" } },
            { $unwind: { path: "$lastMessageInfo", preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    isBlocked: {
                        $in: ["$otherParticipant._id", blockedUserIds.map(id => new mongoose.Types.ObjectId(id))]
                    }
                }
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
                                isBlocked: 1,
                                lastMessage: "$lastMessageInfo.text",
                                lastMessageId: "$lastMessageInfo._id",
                                lastMessageAt: "$lastMessageInfo.createdAt",
                                lastMessageStatus: "$lastMessageInfo.status",
                                unseenCount: { $ifNull: ["$unseenCountForUser", 0] },
                                updatedAt: 1,
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
                limit: parseInt(limit),
            }
        };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};
exports.loadMoreMessagesService = async (
    userId,
    conversationId,
    lastMessageId,
    limit = 10,
    page = 1
) => {
    try {
        if (!userId || !conversationId || !lastMessageId) {
            throw createError(404, resMessages.validation.missingFields);
        }


        const user = await isUserExist(userId);
        if (!user) throw createError(404, 'userNotFound', 'notFound');

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) throw createError(404, 'invalidConversationId', 'validation');


        if (!conversation.participants.includes(new mongoose.Types.ObjectId(userId))) {
            throw createError(403, 'unauthorizedAccess', 'auth');
        }

        //const participants = conversation.participants.map(p => p.toString());
        // const receiverId = participants.find(p => p !== userId);
        //const onlineUsers = getOnlineUsers();

        const totalMessages = await Message.countDocuments({ conversationId });
        const totalPages = Math.ceil(totalMessages / limit);
        const skip = (page - 1) * limit;


        const lastMessage = await Message.findById(lastMessageId);
        if (!lastMessage) throw createError(404, 'invalidMessageId', 'validation');


        const messages = await Message.find({ conversationId })
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
            {
                conversationId,
                sender: { $ne: userId },
                status: { $ne: enums.messages_Status.SEEN }
            },
            { $set: { status: enums.messages_Status.SEEN, updatedAt: new Date() } }
        );

        // const onlineUsersSet = new Set(onlineUsers); 
        //const receiverOnline = onlineUsersSet.has(receiverId); 

        return {
            //receiverOnline,
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
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};




// SEEN MESSAGE
exports.seenMessageService = async (conversationId, receiverId) => {
    try {
        if (!receiverId) throw createError(403, 'userNotFound', 'notFound');

        const receiver = await isUserExist(receiverId);
        if (!receiver) throw createError(403, 'userNotFound', 'notFound');

        const conversation = await isConversationExist(conversationId);
        if (!conversation.participants.some(p => p.toString() === receiverId)) {
            throw createError(403, 'receiverNotPart', 'notFound');
        }

        const result = await Message.updateMany(
            { conversationId, sender: { $ne: receiverId }, status: { $ne: "seen" } },
            { $set: { status: "seen" } }
        );

        conversation.unseenCount = conversation.unseenCount.map(u => u.userId.toString() === receiverId.toString() ? { ...u, count: 0 } : u);
        await conversation.save();

        getIo().emit("messages_seen", { conversationId, seenBy: receiverId, data: result });

        return result;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};


// DELIVERED MESSAGE
exports.deliveredMessageService = async (conversationId, receiverId) => {
    try {
        if (!receiverId) throw createError(403, 'userNotFound', 'notFound');

        const receiver = await isUserExist(receiverId);
        if (!receiver) throw createError(403, 'userNotFound', 'notFound');

        const conversation = await isConversationExist(conversationId);
        if (!conversation.participants.some(p => p.toString() === receiverId)) {
            throw createError(403, 'receiverNotPart', 'notFound');
        }

        const result = await Message.updateMany(
            { conversationId, sender: { $ne: receiverId }, status: "sent" },
            { $set: { status: "delivered" } }
        );

        getIo().emit("messages_delivered", { conversationId, deliveredBy: receiverId, data: result });
        return result;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};


// UPDATE MESSAGE
exports.updateMessageService = async (conversationId, messageId, messageText, userId) => {
    try {
        const { message } = await validateMessageAction(conversationId, messageId, userId);

        const update = await Message.updateOne({ _id: messageId }, { $set: { text: messageText } });
        getIo().emit("messages_updated", { conversationId, updatedby: userId, updatedMessage: message });

        return update;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};


// DELETE MESSAGE
exports.deleteMessageservice = async (conversationId, messageId, userId) => {
    try {
        const { message } = await validateMessageAction(conversationId, messageId, userId);

        const deleted = await Message.deleteOne({ _id: messageId });
        getIo().emit("messages_deleted", { conversationId, deletedby: userId, deletedMessage: message });

        return deleted;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');;
    }
};


// DELETE CONVERSATION
exports.deleteConversationService = async (conversationId, userId) => {
    try {
        if (!userId) throw createError(403, 'userNotFound', 'notFound');

        const user = await isUserExist(userId);
        if (!user) throw createError(403, 'userNotFound', 'notFound');

        const conversation = await isConversationExist(conversationId);
        if (!conversation.participants.some(p => p.toString() === userId)) {
            throw createError(403, 'receiverNotPart', 'notFound');
        }

        const result = await Conversation.updateOne(
            { _id: conversationId },
            { $addToSet: { hiddenBy: userId } }
        );

        return result;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};


// VALIDATE MESSAGE ACTION
const validateMessageAction = async (conversationId, messageId, userId) => {
    if (!userId) throw createError(403, 'userNotFound', 'notFound');

    const user = await isUserExist(userId);
    if (!user) throw createError(403, 'userNotFound', 'notFound');

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
