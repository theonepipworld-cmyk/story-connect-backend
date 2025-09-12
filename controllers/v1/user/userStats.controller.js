const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");
const { isPostExist } = require('../../../helpers/dbHelpers.js');
const { addStatsService, getAllLikedUserService } = require("../../../service/user/userStats.service.js")
const userActivityStats = require("../../../constants/variables.constants.js")


//handle user stats of likes ad views of post and comments
exports.addUserStats = async (req, res) => {
    try {
        const { postId, type, commentId, parentCommentId } = req.body;
        console.log("user-sttas", req.body)
        const { id, username } = req.user
        const addStats = await addStatsService(postId, type, commentId, id, username, parentCommentId);
        if (type === userActivityStats.userStats.Likes) {
            message = resMessages.success.likeSuccessful;
        } else if (type === userActivityStats.userStats.Views) {
            message = resMessages.success.viewSuccessfully;
        }
        return res.status(200).json(
            successResponse(message, addStats)
        );
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
};
//handle get all like or views
exports.getAllLikeOrViewUser = async (req, res) => {
    try {
        const { postId, type } = req.query
        const getAllLikedUser = await getAllLikedUserService(postId, type)
        return res.status(200).json(
            successResponse(resMessages.success.getSuccessful, getAllLikedUser)
        );
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
};

