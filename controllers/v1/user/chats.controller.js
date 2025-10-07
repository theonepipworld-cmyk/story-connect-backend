const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");
const { DEFAULT_AVATAR_URL } = require("../../../constants/variables.constants.js");
const User = require('../../../models/user.model.js');
const { sendMessageToUserService,
    getUserConversationService,
    loadMoreMessagesService,
    seenMessageService,
    deliveredMessageService,
    updateMessageService,
    deleteMessageservice,
    deleteConversationService } = require("../../../service/user/chats.service.js")


exports.sendMessageToUser = async (req, res) => {
    try {
        const { receiverId, message, type } = req.body;
        const senderId = req.user.id;
        const files = req.files;

        const sendMessage = await sendMessageToUserService(
            senderId,
            receiverId,
            message,
            type || "text",
            files || null
        );

        return res
            .status(200)
            .json(successResponse(resMessages.success.messageSent, sendMessage));
    } catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
};


exports.getConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || ""
        const { data, pagination } = await getUserConversationService(userId, page, limit,search);
        return res.status(200).json(successResponse(resMessages.success.fetchSuccessfully, data, pagination));
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
};

exports.getloadMoreMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const { conversationId, lastMessageId } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { data, pagination } = await loadMoreMessagesService(userId, conversationId, lastMessageId, limit)
        return res.status(200).json(successResponse(resMessages.success.fetchSuccessfully, data, pagination));
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
};

exports.seenMessage = async (req, res) => {
    try {
        const receiverId = req.user.id
        const seenMessages = await seenMessageService(req.params.conversationId, receiverId)
        return res.status(200).json(successResponse(resMessages.success.messageSeen));
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
};

exports.deliveredMessage = async (req, res) => {
    try {
        const deliveredMessages = await deliveredMessageService(req.params.conversationId, req.user.id)
        return res.status(200).json(successResponse(resMessages.success.messagedelivered));
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
}

exports.updateMessage = async (req, res) => {
    try {
        const updatedMessage = await updateMessageService(req.body.conversationId, req.body.messageId, req.body.text, req.user.id)
        return res.status(200).json(successResponse(resMessages.success.updateSuccessful));
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
};

exports.deleteMessage = async (req, res) => {
    try {
        const deletedMessage = await deleteMessageservice(req.params.conversationId, req.params.messageId, req.user.id)
        return res.status(200).json(successResponse(resMessages.success.deleteSuccessful));
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
}

exports.deleteConversation = async (req, res) => {
    try {
        const deletedConversation = await deleteConversationService(req.params.conversationId, req.user.id)
        return res.status(200).json(successResponse(resMessages.success.deleteSuccessful));
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
}