const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");
const{blockUserService ,unblockUserService ,getBlockedUserService} = require("../../../service/user/blocked.service.js")


exports.blockedUser = async (req, res) => {
    try {
        const blocked = await blockUserService(req.user.id, req.params.id)
        return res.status(200).json(
            successResponse(resMessages.success.blockedSuccessfully, blocked));
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
}

exports.UnblockUser = async (req, res) => {
    try {
        const unblocked = await unblockUserService(req.user.id, req.params.id)
        return res.status(200).json(
            successResponse(resMessages.success.unBlockSuccessfully, unblocked));
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
};

exports.getBlockUsers = async (req, res) => {
    try {
        const search = req.query.search || ""
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { data, pagination } = await getBlockedUserService( page, limit, req.user.id)
        return res.status(200).json(
            successResponse(resMessages.success.blockedSuccessfully, data, pagination));
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
}

