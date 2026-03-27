const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const { getMessage } = require("../../../constants/locales/index.js");
const {
    sendFriendReqService,
    respondFriendReqService,
    getAllpendingReqService,
    getAllFriendService,
    getAllMutualservice,
    getSuggestionFriendsService,
    unfriendReqService,
    cancelFriendReqService
} = require("../../../service/user/friend.service.js");


const getLang = (req) => req.lang || 'en';

exports.sendFriendReq = async (req, res) => {
    try {
        const lang = getLang(req);
        const { result, isRequested } = await sendFriendReqService(req.user.id, req.params.id, lang);
        return res.status(200).json(successResponse(getMessage(lang, 'success', 'sendReqSuccessfully'), isRequested));
    }
    catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
}


exports.respondFriendReq = async (req, res) => {
    try {
        const lang = getLang(req);
        const { action } = req.body;
        await respondFriendReqService(req.user.id, req.params.id, action, lang);
        return res.status(200).json(
            successResponse(
                action === "accepted"
                    ? getMessage(lang, 'success', 'acceptReqSuccessfully')
                    : getMessage(lang, 'success', 'rejectReqSuccessfully')
            )
        );
    } catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
};

exports.getAllPendingReq = async (req, res) => {
    try {
        const lang = getLang(req);
        const pendingReq = await getAllpendingReqService(req.user.id);
        return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), pendingReq));
    }
    catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
};

exports.getAllUserFriends = async (req, res) => {
    try {
        const lang = getLang(req);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { allFriends, pagination } = await getAllFriendService(req.params.id, page, limit, req.user.id);
        return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), allFriends, pagination));
    }
    catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
};

exports.getAllMutualFriends = async (req, res) => {
    try {
        const lang = getLang(req);
        const { mutualFriends, pagination } = await getAllMutualservice(req.user.id, req.params.id);
        return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), mutualFriends, pagination));
    }
    catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
};

exports.getSuggestionFriends = async (req, res) => {
    try {
        const lang = getLang(req);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || "";
        const { suggestions, pagination } = await getSuggestionFriendsService(page, limit, search, req.user.id);
        return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), suggestions, pagination));
    }
    catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
};

exports.unfriendReq = async (req, res) => {
    try {
        const lang = getLang(req);
        await unfriendReqService(req.user.id, req.params.id);
        return res.status(200).json(successResponse(getMessage(lang, 'success', 'unFriendSuccessfully')));
    }
    catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
};

exports.cancelFriendReq = async (req, res) => {
    try {
        const lang = getLang(req);
        const response = await cancelFriendReqService(req.user.id, req.params.id, lang);
        return res.status(200).json(successResponse(getMessage(lang, 'success', 'cancelReqSuccessfully'), response));
    }
    catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
}
