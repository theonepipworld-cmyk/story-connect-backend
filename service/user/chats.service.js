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
const io = require("../../server.js")


exports.sendMessageToUserService = async (senderId, receiverId, messageText, type, files = []) => {
    try {
        if (!senderId || !receiverId || (!messageText && files.length === 0)) {
            throw createError(resMessages.validation.missingFields);
        }

        const sender = await isUserExist(senderId);
        const receiver = await isUserExist(receiverId);
        if (!sender) throw createError(404, resMessages.validation.invalidSender);
        if (!receiver) throw createError(404, resMessages.validation.invalidReceiver);

        if (senderId.toString() === receiverId.toString()) throw createError(404, resMessages.validation.cannotMessageYourself);

        const isBlocked = await Block.findOne({ blocker: receiverId, blocked: senderId });
        if (isBlocked) throw createError(404, resMessages.validation.userBlocked);

        let conversation = await Conversation.findOne({ participants: { $all: [senderId, receiverId] } });
        if (!conversation) {
            conversation = new Conversation({ participants: [senderId, receiverId], unseenCount: {} });
            await conversation.save();
        }

        const messages = [];


        if (messageText) {
            const textMessage = new Message({
                conversationId: conversation._id,
                sender: senderId,
                text: messageText,
                type: "text",
                status: "sent"
            });
            const savedTextMessage = await textMessage.save();
            messages.push(savedTextMessage);

            io.to(receiverId.toString()).emit("newMessage", savedTextMessage);


            conversation.lastMessage = savedTextMessage._id;
            const unseenEntry = conversation.unseenCount.map((u) => u.userId.toString() === receiverId.toString())
            if (unseenEntry) {
                unseenEntry.count += 1
            }
            else {
                conversation.unseenCount.push({ userId: receiverId, count: 1 });
            }
        }


        files = Array.isArray(files) ? files : [];
        for (const file of files) {
            const uploadedFile = await uploadFileToS3(file, `messages/${conversation._id}/`);
            const fileType = file.mimetype.startsWith("image/")
                ? "image"
                : file.mimetype.startsWith("video/")
                    ? "video"
                    : "file";

            const fileMessage = new Message({
                conversationId: conversation._id,
                sender: senderId,
                text: uploadedFile.Location,
                type: fileType,
                status: "sent"
            });
            const savedFileMessage = await fileMessage.save();
            messages.push(savedFileMessage);

            io.to(receiverId.toString()).emit("newMessage", savedFileMessage);


            conversation.lastMessage = savedFileMessage._id;
            const unseenEntry = conversation.unseenCount.map((u) => u.userId.toString() === receiverId.toString())
            if (unseenEntry) {
                unseenEntry.count += 1
            }
            else {
                conversation.unseenCount.push({ userId: receiverId, count: 1 });
            }
        }

        conversation.updatedAt = new Date();
        await conversation.save();

        return messages;
    } catch (error) {
        throw error;
    }
};


exports.getUserConversationService = async (userId, page = 1, limit = 10) => {
    try {
        if (!userId) {
            throw createError(404, resMessages.validation.missingFields);
        }

        const user = await isUserExist(userId);
        if (!user) {
            throw createError(404, resMessages.validation.invalidUser);
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
            {
                $unwind: {
                    path: "$participantsInfo",
                    preserveNullAndEmptyArrays: true,
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
            {
                $sort: { updatedAt: -1 },
            },
            {
                $facet: {
                    data: [
                        { $skip: offset },
                        { $limit: limit },
                        {
                            $project: {
                                _id: 1,
                                participants: 1,
                                "participantsInfo._id": 1,
                                "participantsInfo.username": 1,
                                "participantsInfo.avatarUrl": 1,
                                lastMessage: "$lastMessageInfo.text",
                                lastMessageAt: "$lastMessageInfo.createdAt",
                                unseenCount: 1,
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

exports.loadMoreMessagesService = async (userId, conversationId, lastMessageId, page = 1, limit = 20) => {
    try {
        if (!userId || !conversationId || !lastMessageId) {
            throw createError(404, resMessages.validation.missingFields);
        }
        console.log(conversationId, lastMessageId, userId)

        const offset = (page - 1) * limit;

        const user = await isUserExist(userId);
        if (!user) {
            throw createError(404, resMessages.notFound.userNotFound);
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            throw createError(404, resMessages.validation.invalidConversationId);
        }

        if (!conversation.participants.includes(new mongoose.Types.ObjectId(userId))) {
            throw createError(404, resMessages.auth.unauthorizedAccess);
        }

        const lastMessage = await Message.findById(lastMessageId);
        if (!lastMessage) {
            throw createError(404, resMessages.validation.invalidMessageId);
        }
        const totalCount = await Message.countDocuments({
            conversationId: conversationId,
        });

        const messages = await Message.find({
            conversationId: conversationId,
            _id: { $lt: lastMessageId },
        })
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .populate("sender", "username avatarUrl currentCountry");

        return {
            data: messages,
            pagination: {
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                currentPage: parseInt(page),
                limit: parseInt(limit),
                hasMore: messages.length === limit,
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

        console.log(receiverId)
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

        return update;
    } catch (error) {
        throw error;
    }
};

exports.deleteMessageservice = async (conversationId, messageId, userId) => {
    try {
        const { message } = await validateMessageAction(conversationId, messageId, userId);
        const deleted = await Message.deleteOne({ _id: messageId });

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

