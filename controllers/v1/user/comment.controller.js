const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");
const { DEFAULT_AVATAR_URL } = require("../../../constants/variables.constants.js");
const User = require('../../../models/user.model.js');
const { addCommentService, updateCommentService, deleteCommentService, getTopLevelCommentService, getReplyCommentService } = require("../../../service/user/comment.service.js");

//add Comment by users
exports.addComment = async (req, res) => {
    try {
        const { postId, comment, parentCommentId } = req.body;
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


//update comments
exports.updateComment = async (req, res) => {
    try {
        const { postId, commentId, parentCommentId, content } = req.body;
        const userId = req.user.id;
        const updateComment = await updateCommentService(postId, commentId, parentCommentId, content, userId);
        return res.status(200).json(
            successResponse(resMessages.success.updateSuccessful, updateComment)
        );
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
};
//delete comments
exports.deleteComment = async (req, res) => {
    try {
        const { postId, commentId, parentCommentId } = req.body;
        const userId = req.user.id;
        console.log(postId, commentId);
        const result = await deleteCommentService(postId, commentId, parentCommentId, userId)
        return res.status(200).json(
            successResponse(resMessages.success.deleteSuccessful, result)
        );
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
};


//get toplevel comments
exports.getTopLevelComment = async (req, res) => {
    try {
        const postId = req.query.id
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { data, pagination } = await getTopLevelCommentService(postId, page, limit);

        return res.status(200).json(
            successResponse(resMessages.success.getSuccessful, data, pagination)
        );
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
}
//get reply level comments
exports.getReplyComments = async (req, res) => {
    try {
        const postId = req.query.id
        const parentCommentId = req.query.parent_id
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const { data, pagination } = await getReplyCommentService(postId, page, limit, parentCommentId);
        return res.status(200).json(
            successResponse(resMessages.success.getSuccessful, data, pagination)
        );
    }
    catch (err) {
        return res.status(400).json(errorResponse(err.message));
    }
}

