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
const { getMessage } = require("../../../constants/locales/index.js");


const getLang = (req) => req.lang || 'en';

exports.sendMessageToUser = async (req, res) => {
    try {
        const lang = getLang(req);
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
            .json(successResponse(getMessage(lang, 'success', 'messageSent'), sendMessage));
    } catch (err) {
        const lang = getLang(req);
        return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
    }
};



exports.getConversations = async (req, res) => {
    try {
        const lang = getLang(req);
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";

        const { data, pagination } = await getUserConversationService(userId, page, limit, search);

        return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), data, pagination));
    } catch (err) {
        const lang = getLang(req);
        return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
    }
};

exports.getloadMoreMessages = async (req, res) => {
    try {
        const lang = getLang(req);
        const userId = req.user.id;
        const { conversationId, lastMessageId } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const { data, pagination } = await loadMoreMessagesService(userId, conversationId, lastMessageId, limit, page);

        return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), data, pagination));
    } catch (err) {
        const lang = getLang(req);
        return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
    }
};

exports.seenMessage = async (req, res) => {
    try {
        const lang = getLang(req);
        const receiverId = req.user.id;
        await seenMessageService(req.params.conversationId, receiverId);

        return res.status(200).json(successResponse(getMessage(lang, 'success', 'messageSeen')));
    } catch (err) {
        const lang = getLang(req);
        return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
    }
};

exports.deliveredMessage = async (req, res) => {
    try {
        const lang = getLang(req);
        await deliveredMessageService(req.params.conversationId, req.user.id);

        return res.status(200).json(successResponse(getMessage(lang, 'success', 'messagedelivered')));
    } catch (err) {
        const lang = getLang(req);
        return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
    }
};

exports.updateMessage = async (req, res) => {
    try {
        const lang = getLang(req);
        await updateMessageService(req.body.conversationId, req.body.messageId, req.body.text, req.user.id);

        return res.status(200).json(successResponse(getMessage(lang, 'success', 'updateSuccessful')));
    } catch (err) {
        const lang = getLang(req);
        return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
    }
};

exports.deleteMessage = async (req, res) => {
    try {
        const lang = getLang(req);
        await deleteMessageservice(req.params.conversationId, req.params.messageId, req.user.id);

        return res.status(200).json(successResponse(getMessage(lang, 'success', 'deleteSuccessful')));
    } catch (err) {
        const lang = getLang(req);
        return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
    }
};

exports.deleteConversation = async (req, res) => {
    try {
        const lang = getLang(req);
        await deleteConversationService(req.params.conversationId, req.user.id);

        return res.status(200).json(successResponse(getMessage(lang, 'success', 'deleteSuccessful')));
    } catch (err) {
        const lang = getLang(req);
        return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
    }
};