const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");
const { DEFAULT_AVATAR_URL } = require("../../../constants/variables.constants.js");
const User = require('../../../models/user.model.js');
const {isPostExist} = require('../../../helpers/dbHelpers.js');
const { addCommentService, updateCommentService, deleteCommentService ,getCommentService} = require("../../../service/user/comment.service.js")
exports.addComment = async(req, res) => {
    try {
        const { postId, comment, parentCommentId } = req.body;

        if (!postId || !comment) {
            return res.status(400).json(
                errorResponse(
                    resMessages.generalError.somethingWentWrong,
                    resMessages.validation.missingFields + ": postId, comment"
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
        const newComment = await addCommentService(
            postId,
            req.user.id,
            comment,
            parentCommentId
        );

        return res.status(200).json(
            successResponse(resMessages.success.createSuccessful, newComment)
        );
    } catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
};

exports.updateComment = async (req, res) => {
    try {
        const { postId, commentId, parentCommentId, content } = req.body;
        const userId = req.user.id;

        if (!userId) {
            return res.status(401).json(
                errorResponse(resMessages.generalError.somethingWentWrong,
                    resMessages.notFound.userNotFound)
            );
        }

        if (!postId || !content || !commentId) {
            return res.status(400).json(
                errorResponse(
                    resMessages.generalError.somethingWentWrong,
                    resMessages.validation.missingFields + ": postId, content ,commentId"
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

        const updateComment = await updateCommentService(postId, commentId, parentCommentId, content, userId);
        return res.status(200).json(
            successResponse(resMessages.success.updateSuccessful, updateComment)
        );
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const { postId, commentId, parentCommentId } = req.body;
          const userId = req.user.id;

        if (!userId) {
            return res.status(401).json(
                errorResponse(resMessages.generalError.somethingWentWrong,
                    resMessages.notFound.userNotFound)
            );
        }

        if (!postId || !commentId) {
            return res.status(400).json(
                errorResponse(
                    resMessages.generalError.somethingWentWrong,
                    resMessages.validation.missingFields + ": postId ,commentId"
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

        const result = await deleteCommentService(postId, commentId, parentCommentId,userId)
        return res.status(200).json(
            successResponse(resMessages.success.deleteSuccessful, result)
        );


    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
};



exports.getComment =async(req,res)=>{
    try{
        const{postId} = req.query
        const userId = req.user.id;
        if (!userId) {
            return res.status(401).json(
                errorResponse(resMessages.generalError.somethingWentWrong,
                    resMessages.notFound.userNotFound)
            );
        }

        if (!postId) {
            return res.status(400).json(
                errorResponse(
                    resMessages.generalError.somethingWentWrong,
                    resMessages.validation.missingFields + ": postId"
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
        const result= await getCommentService(postId);

       return res.status(200).json(
            successResponse(resMessages.success.getSuccessful, result)
        );
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
}

