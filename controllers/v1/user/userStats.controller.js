const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");
const { isPostExist } = require('../../../helpers/dbHelpers.js');
const { addStatsService ,getAllLikedUserService} = require("../../../service/user/userStats.service.js")


exports.addUserStats = async (req, res) => {
    try {
        const { postId, type, commentId , parentCommentId } = req.body;
        const { id, username } = req.user
        console.log(req.user)
        if (!id || !username) {
            return res.status(400).json(
                errorResponse(
                    resMessages.generalError.somethingWentWrong,
                    resMessages.validation.missingFields + ": id ,username"
                )
            );
        }
        if (!postId || !type) {
            return res.status(400).json(
                errorResponse(
                    resMessages.generalError.somethingWentWrong,
                    resMessages.validation.missingFields + ": postId ,type"
                )
            );
        }
        if (type == "commentLike") {
            if (!commentId) {
                return res.status(400).json(
                    errorResponse(
                        resMessages.generalError.somethingWentWrong,
                        resMessages.validation.missingFields + ":commentId"
                    )
                );
            }
        }
        if(type == "commentReplyLike"){
            if(!parentCommentId || !commentId){
                  return res.status(400).json(
                    errorResponse(
                        resMessages.generalError.somethingWentWrong,
                        resMessages.validation.missingFields + ":parentCommentId,commentId"
                    )
                );
            }
        }
        const isPostIdExist = await isPostExist(postId);
        if (!isPostIdExist) {
            return res.status(400).json(
                errorResponse(
                    resMessages.generalError.somethingWentWrong,
                    resMessages.notFound.postNotFound
                )
            );
        }

        const addStats = await addStatsService(postId, type, commentId, id, username,parentCommentId);
        return res.status(200).json(
            successResponse(resMessages.success.addSuccessful, addStats)
        );
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
};

exports.getAllLikeOrViewUser = async (req, res) => {
    try {
        const { postId ,type } = req.body
        if (!postId || !type) {
            return res.status(400).json(
                errorResponse(
                    resMessages.generalError.somethingWentWrong,
                    resMessages.validation.missingFields + ": postId,type"
                )
            );
        }
        const isPostIdExist = await isPostExist(postId);
        if (!isPostIdExist) {
            return res.status(400).json(
                errorResponse(
                    resMessages.generalError.somethingWentWrong,
                    resMessages.notFound.postNotFound
                )
            );
        }

        const getAllLikedUser = await getAllLikedUserService(postId,type)
         return res.status(200).json(
            successResponse(resMessages.success.getSuccessful, getAllLikedUser)
        );
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
};

