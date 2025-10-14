const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");
const { DEFAULT_AVATAR_URL } = require("../../../constants/variables.constants.js");
const User = require('../../../models/user.model.js');
const { getMessage } = require("../../../constants/locales/index.js");
const { addCommentService, updateCommentService, deleteCommentService, getTopLevelCommentService, getReplyCommentService } = require("../../../service/user/comment.service.js");


const getLang = (req) => req.lang || 'en';
//add Comment by users
exports.addComment = async (req, res) => {
    try {
        const lang = getLang(req);
        const { postId, comment, parentCommentId } = req.body;
        const newComment = await addCommentService(postId, req.user.id, comment, parentCommentId);

        return res.status(200).json(
            successResponse(getMessage(lang, 'success', 'createSuccessful'), newComment)
        );
    } catch (err) {
        const lang = getLang(req);
        return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
    }
};


//update comments
exports.updateComment = async (req, res) => {
    try {
        const lang = getLang(req);
        const { postId, commentId, parentCommentId, content } = req.body;
        const userId = req.user.id;
        const updatedComment = await updateCommentService(postId, commentId, parentCommentId, content, userId);

        return res.status(200).json(
            successResponse(getMessage(lang, 'success', 'updateSuccessful'), updatedComment)
        );
    } catch (err) {
        const lang = getLang(req);
        return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
    }
};

// Delete Comment
exports.deleteComment = async (req, res) => {
    try {
        const lang = getLang(req);
        const { postId, commentId, parentCommentId } = req.body;
        const userId = req.user.id;
        const result = await deleteCommentService(postId, commentId, parentCommentId, userId);

        return res.status(200).json(
            successResponse(getMessage(lang, 'success', 'deleteSuccessful'), result)
        );
    } catch (err) {
        const lang = getLang(req);
        return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
    }
};

// Get Top-Level Comments
exports.getTopLevelComment = async (req, res) => {
    try {
        const lang = getLang(req);
        const postId = req.query.id;
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { data, pagination } = await getTopLevelCommentService(postId, page, limit, userId);

        return res.status(200).json(
            successResponse(getMessage(lang, 'success', 'getSuccessful'), data, pagination)
        );
    } catch (err) {
        const lang = getLang(req);
        return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
    }
};

// Get Reply Comments
exports.getReplyComments = async (req, res) => {
    try {
        const lang = getLang(req);
        const postId = req.query.id;
        const userId = req.user.id;
        const parentCommentId = req.query.parent_id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const { data, pagination } = await getReplyCommentService(postId, page, limit, parentCommentId, userId);

        return res.status(200).json(
            successResponse(getMessage(lang, 'success', 'getSuccessful'), data, pagination)
        );
    } catch (err) {
        const lang = getLang(req);
        return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
    }
};
