const User = require('../../models/user.model');
const mongoose = require('mongoose');
const { uploadFileToS3 } = require('../../utils/s3.util');
const { DEFAULT_AVATAR_URL } = require('../../constants/variables.constants');
const resMessages = require("../../constants/resMessages.constants.js");
const Comment = require('../../models/Comments.model');
const { isPostExist, createError, isUserExist } = require("../../helpers/dbHelpers.js");
const UserStats = require("../../models/userActivityStats.model");
const Block = require("../../models/block.model.js");
const pushNotification = require("../../utils/pushNotification.js");


// ADD COMMENT
exports.addCommentService = async (postId, userId, commentString, parentCommentId = null) => {
    try {
        if (!userId) throw createError(400, 'userNotFound', 'notFound');

        const post = await isPostExist(postId);
        if (!post) throw createError(400, 'postNotFound', 'notFound');

        const blocked = await Block.findOne({
            $or: [
                { blocker: post.userId, blocked: userId },
                { blocker: userId, blocked: post.userId }
            ]
        });
        if (blocked) throw createError(403, 'userBlocked', 'validation');

        const comment = await Comment.create({
            userId,
            postId,
            parentCommentId: parentCommentId || null,
            content: commentString
        });
        if (!comment) throw createError(400, 'commentNotFound', 'notFound');

        if (parentCommentId) {
            await Comment.findByIdAndUpdate(parentCommentId, { $inc: { replyCount: 1 } });
        }

        if (post.userId.toString() !== userId.toString()) {
            const postOwner = await User.findById(post.userId);
            if (postOwner?.device_token) {
                const notificationMessage = parentCommentId
                    ? `${userId} replied to your comment.`
                    : `${userId} commented on your post.`;
                await pushNotification.androidPushNotification(postOwner.device_token, notificationMessage, "comment", {
                    postId: postId.toString(),
                    commentId: comment._id.toString(),
                    senderId: userId.toString(),
                    parentCommentId: parentCommentId ? parentCommentId.toString() : null
                });
            }
        }

        return comment;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError','error');
    }
};


// UPDATE COMMENT
exports.updateCommentService = async (postId, commentId, parentCommentId, content, userId) => {
    try {
        if (!userId) throw createError(400, 'userNotFound', 'notFound');
        const postExists = await isPostExist(postId);
        if (!postExists) throw createError(400, 'postNotFound', 'notFound');

        const comment = await Comment.findById(commentId);
        if (!comment) throw createError(400, 'commentNotFound', 'notFound');

        if (comment.userId.toString() !== userId.toString()) {
            throw createError(403, 'NotAuthorized', 'customError');
        }

        const filter = { _id: commentId, postId, userId };
        if (parentCommentId) {
            if (!comment.parentCommentId || comment.parentCommentId.toString() !== parentCommentId.toString()) {
                throw createError(400, 'commentIdNotMatch', 'customError');
            }
            filter.parentCommentId = parentCommentId;
        } else {
            if (comment.parentCommentId) {
                throw createError(400, 'parentCommentIdInvalid', 'customError');
            }
            filter.parentCommentId = { $in: [null] };
        }

        const updatedComment = await Comment.findOneAndUpdate(filter, { content, isEdited: true }, { new: true });
        if (!updatedComment) throw createError(400, 'commentNotFound', 'notFound');

        return updatedComment;
    } catch (error) {
        if (error.statusCode) throw error;
         throw createError(500, 'serverError','error');
    }
};


// DELETE COMMENT
exports.deleteCommentService = async (postId, commentId, parentCommentId, userId) => {
    try {
        if (!userId) throw createError(400, 'userNotFound', 'notFound');
        const postExists = await isPostExist(postId);
        if (!postExists) throw createError(400, 'postNotFound', 'notFound');

        const comment = await Comment.findById(commentId).populate("userId", "_id").populate("postId", "userId");
        if (!comment) throw createError(400,'commentNotFound', 'notFound');

        const isCommentOwner = comment.userId._id.toString() === userId.toString();
        const isPostOwner = comment.postId.userId.toString() === userId.toString();
        if (!isCommentOwner && !isPostOwner) throw createError(403, 'NotAuthorized', 'customError');

        const filter = { _id: commentId, postId };
        if (parentCommentId) filter.parentCommentId = parentCommentId;

        const deleteResult = await Comment.deleteOne(filter);
        if (deleteResult.deletedCount === 0) throw createError(400, 'commentNotDeleted', 'customError');

        await UserStats.updateOne(
            { "commentLikes.commentId": commentId },
            { $pull: { commentLikes: { commentId } } }
        );

        if (parentCommentId) await Comment.findByIdAndUpdate(parentCommentId, { $inc: { replyCount: -1 } });

        return { success: true, message: resMessages.success.deleteSuccessful };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError','error');
    }
};


// GET TOP-LEVEL COMMENTS
exports.getTopLevelCommentService = async (postId, page, limit, userId) => {
    try {
        if (!userId) throw createError(400, 'userNotFound', 'notFound');
        const user = await isUserExist(userId);
        if (!user) throw createError(400, 'userNotFound', 'notFound');

        const postExists = await isPostExist(postId);
        if (!postExists) throw createError(400,'postNotFound', 'notFound');

        const offset = (page - 1) * limit;
        const blocked = await Block.find({ $or: [{ blocker: userId }, { blocked: userId }] });
        const blockedUserIds = blocked.map(b => b.blocker.toString() === userId.toString() ? b.blocked : b.blocker);

        const topLevelComments = await Comment.aggregate([
            { $match: { postId: new mongoose.Types.ObjectId(postId), parentCommentId: null, userId: { $nin: blockedUserIds } } },
            { $sort: { createdAt: -1 } },
            { $skip: offset },
            { $limit: limit },
            { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "userInfo" } },
            { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } }
        ]);

        const total = await Comment.countDocuments({ postId, parentCommentId: null, userId: { $nin: blockedUserIds } });

        return { data: topLevelComments, pagination: { total, totalPages: Math.ceil(total / limit), currentPage: page, limit } };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError','error');
    }
};


// GET REPLY COMMENTS
exports.getReplyCommentService = async (postId, page, limit, parentCommentId, userId) => {
    try {
        if (!userId) throw createError(400, 'userNotFound', 'notFound');
        const user = await isUserExist(userId);
        if (!user) throw createError(400, 'userNotFound', 'notFound');

        const postExists = await isPostExist(postId);
        if (!postExists) throw createError(400, 'postNotFound', 'notFound');

        const offset = (page - 1) * limit;
        const blocked = await Block.find({ $or: [{ blocker: userId }, { blocked: userId }] });
        const blockedUserIds = blocked.map(b => b.blocker.toString() === userId.toString() ? b.blocked : b.blocker);

        const replyComments = await Comment.aggregate([
            { $match: { postId: new mongoose.Types.ObjectId(postId), parentCommentId: new mongoose.Types.ObjectId(parentCommentId), userId: { $nin: blockedUserIds } } },
            { $sort: { createdAt: -1 } },
            { $skip: offset },
            { $limit: limit },
            { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "userInfo" } },
            { $unwind: "$userInfo" }
        ]);

        const total = await Comment.countDocuments({ postId, parentCommentId, userId: { $nin: blockedUserIds } });

        return { data: replyComments, pagination: { total, totalPages: Math.ceil(total / limit), currentPage: page, limit } };
    } catch (error) {
        if (error.statusCode) throw error;
         throw createError(500, 'serverError','error');
    }
};
