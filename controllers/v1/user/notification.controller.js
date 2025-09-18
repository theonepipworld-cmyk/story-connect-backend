
const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");
const { DEFAULT_AVATAR_URL } = require("../../../constants/variables.constants.js");
const User = require('../../../models/user.model.js');
const {getUserNorificationService,makeAllUserNotificationReadService} = require("../../../service/user/notification.service.js")


exports.getUserNotifications = async (req, res) => {
    try {
        const result = await getUserNorificationService(req.user?.id)
        return res.status(200).json(successResponse(resMessages.success.fetchSuccessfully, result));
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
}


exports.makeAllUserNotificationRead = async (req, res) => {
    try {
        const result = await makeAllUserNotificationReadService(req.user?.id)
        return res.status(200).json(successResponse(resMessages.success.seenSuccessfully));
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
}