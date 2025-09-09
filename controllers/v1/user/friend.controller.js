const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");
const { sendFriendReqService,
    respondFriendReqService,
    getAllpendingReqService,
    getAllFriendService,
    getAllMutualservice,
    getSuggestionFriendsService ,
    unfriendReqService } = require("../../../service/user/friend.service.js")


exports.sendFriendReq = async (req, res) => {
    try {
        const {result,isRequested} = await sendFriendReqService(req.user.id, req.params.id);
        return res.status(200).json(successResponse(resMessages.success.sendReqSuccessfully,isRequested));
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
};


exports.respondFriendReq = async (req, res) => {
    try {
        const { action } = req.body;
        console.log(req.user.id, req.params.id)
        await respondFriendReqService(req.user.id, req.params.id, action);
        return res.status(200).json(
            successResponse(
                action === "accepted"
                    ? resMessages.success.acceptReqSuccessfully
                    : resMessages.success.rejectReqSuccessfully
            )
        );
    } catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
};


exports.getAllPendingReq = async (req, res) => {
    try {
        const pendingReq = await getAllpendingReqService(req.user.id);
        return res.status(200).json(successResponse(resMessages.success.fetchSuccessfully, pendingReq));
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
};

exports.getAllUserFriends = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { allFriends, pagination } = await getAllFriendService(req.params.id, page, limit,req.user.id)
        return res.status(200).json(successResponse(resMessages.success.fetchSuccessfully, allFriends, pagination));
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
}

exports.getAllMutualFriends = async (req, res) => {
    try {
        const { mutualFriends, pagination } = await getAllMutualservice(req.user.id, req.params.id)
        return res.status(200).json(successResponse(resMessages.success.fetchSuccessfully, mutualFriends, pagination));
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
}


exports.getSuggestionFriends = async (req, res) => {
    try {
        const { suggestions, pagination } = await getSuggestionFriendsService(req.user.id)
        return res.status(200).json(successResponse(resMessages.success.fetchSuccessfully, suggestions, pagination));
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
}

exports.unfriendReq = async (req, res) => {
    try {
        const unfriend = await unfriendReqService(req.user.id,req.params.id)
        return res.status(200).json(successResponse(resMessages.success.unFriendSuccessfully));
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
}
