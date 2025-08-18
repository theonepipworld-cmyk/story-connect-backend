const User = require('../../models/user.model');
const mongoose = require('mongoose');
const { uploadFileToS3 } = require('../../utils/s3.util');
const { DEFAULT_AVATAR_URL } = require('../../constants/variables.constants');
const { errorResponse, successResponse } = require('../../utils/responseHandler.util');
const resMessages = require("../../constants/resMessages.constants.js")
const Comment = require('../../models/Comments.model');
const { isPostExist, createError } = require("../../helpers/dbHelpers.js")
const userStats = require("../../models/userActivityStats.model.js");

//add comments
exports.addCommentService = async (postId, userId, commentString, parentCommentId = null) => {
    try {
        const isPostIdExist = await isPostExist(postId);
        if (!isPostIdExist) {
            throw createError(400, resMessages.notFound.postNotFound);
        }
        if (!userId) {
            throw createError(400, resMessages.notFound.userNotFound);
        }
        const comment = await Comment.create({
            userId: userId,
            postId: postId,
            parentCommentId: parentCommentId || null,
            content: commentString
        });

        if (!comment) {
            throw createError(400, resMessages.notFound.commentNotFound);
        }
        if (parentCommentId) {
            await Comment.findByIdAndUpdate(
                parentCommentId,
                { $inc: { replyCount: 1 } }
            );
        }
        return comment;
    }
    catch (error) {
        throw error;
    }
};

//update comment by whom uploaded this
exports.updateCommentService = async (postId, commentId, parentCommentId, content, userId) => {
    try {
        const isPostIdExist = await isPostExist(postId);
        if (!isPostIdExist) {
            throw createError(400, resMessages.notFound.postNotFound);
        }
        if (!userId) {
            throw createError(400, resMessages.notFound.userNotFound);
        }
        const comment = await Comment.findById(commentId);
        if (!comment) {
            throw createError(400, resMessages.notFound.commentNotFound);
        }
        if (comment.userId.toString() !== userId.toString()) {
            throw new Error(resMessages.customError.NotAuthorized);
        }
        const filter = {
            _id: commentId,
            postId: postId,
            userId: userId
        };
        if (parentCommentId) {
            if (!comment.parentCommentId || comment.parentCommentId.toString() !== parentCommentId.toString()) {
                throw new Error(resMessages.customError.commentIdNotMatch);
            }
            filter.parentCommentId = parentCommentId;
        } else {
            if (comment.parentCommentId) {
                throw new Error(resMessages.customError.parentCommentIdInvalid);
            }
            filter.parentCommentId = { $in: [null] };
        }

        const updatedComment = await Comment.findOneAndUpdate(
            filter,
            { content, isEdited: true },
            { new: true }
        );
        if (!updatedComment) {
            throw createError(400, resMessages.notFound.commentNotFound);
        }
        return updatedComment;
    } catch (error) {
        throw error
    }
};
//delete comment by user who upload the commenta and also ownerUser of the profile
exports.deleteCommentService = async (postId, commentId, parentCommentId, userId) => {
    try {
        const isPostIdExist = await isPostExist(postId);
        if (!isPostIdExist) {
            throw createError(400, resMessages.notFound.postNotFound);
        }
        if (!userId) {
            throw createError(400, resMessages.notFound.userNotFound);
        }
        const comment = await Comment.findById(commentId)
            .populate("userId", "_id")
            .populate("postId", "userId");

        if (!comment) {
            throw createError(400, resMessages.notFound.commentNotFound);
        }
        const isCommentOwner = comment.userId._id.toString() === userId.toString();
        const isPostOwner = comment.postId.userId.toString() === userId.toString();

        if (!isCommentOwner && !isPostOwner) {
            throw new Error(resMessages.customError.NotAuthorized);
        }
        const filter = { _id: commentId, postId: postId };
        if (parentCommentId) {
            filter.parentCommentId = parentCommentId;
        }
        const deleteResult = await Comment.deleteOne(filter);
        if (deleteResult.deletedCount === 0) {
            throw new Error(resMessages.customError.commentNotDeleted);
        }
        if (parentCommentId) {
            await Comment.findByIdAndUpdate(
                parentCommentId,
                { $inc: { replyCount: -1 } }
            );
        }
        return { success: true, message: resMessages.success.deleteSuccessful };

    } catch (error) {
        throw new Error(error.message);
    }
};
//load top level comments
exports.getTopLevelCommentService = async (postId, page, limit) => {
    try {
        const offset = (page - 1) * limit;
        const isPostIdExist = await isPostExist(postId);
        if (!isPostIdExist) {
            throw createError(400, resMessages.notFound.postNotFound);
        }
//aggregtion to get likes ,profilepicture,username from diffeent collection
        const topLevelComments = await Comment.aggregate([
            {
                $match: {
                    postId: new mongoose.Types.ObjectId(postId),
                    parentCommentId: null
                }
            },
            { $sort: { createdAt: -1 } },
            { $skip: offset },
            { $limit: limit },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",  //Comment.userId,
                    foreignField: "_id",
                    as: "userInfo"
                }
            },
            { $unwind: "$userInfo" },
             {
                $project: {
                    _id: 1,
                    content: 1,
                    createdAt: 1,
                    username: "$userInfo.username",
                    profilePicture: "$userInfo.avatarUrl"
                }
            },
            {
                $lookup: {
                    from: "userstats",
                    let: { commentIdStr: { $toString: "$_id" } },
                    pipeline: [
                        { $match: { postId: new mongoose.Types.ObjectId(postId) } },
                        { $unwind: "$commentLikes" },
                        { $match: { $expr: { $eq: ["$commentLikes.commentId", "$$commentIdStr"] } } },
                        {
                            $project: {
                                _id: 0,
                                totalLikes: "$commentLikes.totalLikes",
                            }
                        }
                    ],
                    as: "likesInfo"
                }
            },
        ]);
        if (!topLevelComments) {
            throw new Error(resMessages.customError.notFound)
        }
        return topLevelComments;
    } catch (error) {
        throw new Error(error.message);
    }
};

//load the reply comments
exports.getReplyCommentService = async (postId, page, limit, parentCommentId) => {
    try {
        const offset = (page - 1) * limit;
        const isPostIdExist = await isPostExist(postId);
        if (!isPostIdExist) {
            throw createError(400, resMessages.notFound.postNotFound);
        }
        //aggregtion to get likes ,profilepicture,username from diffeent collection
        const replyComments = await Comment.aggregate([
            {
                $match: {
                    postId: new mongoose.Types.ObjectId(postId),
                    parentCommentId: new mongoose.Types.ObjectId(parentCommentId)
                }
            },
            {
                $skip: offset
            },
            {
                $sort: { createdAt: -1 },
            },
            {
                $limit: limit
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",  //Comment.userId,
                    foreignField: "_id",
                    as: "userInfo"
                }
            },
            { $unwind: "$userInfo" },
            {
                $project: {
                    _id: 1,
                    content: 1,
                    createdAt: 1,
                    username: "$userInfo.username",
                    profilePicture: "$userInfo.avatarUrl"
                }
            },

            {
                $lookup: {
                    from: "userstats",
                    let: { commentIdStr: { $toString: "$_id" } },
                    pipeline: [
                        { $match: { postId: new mongoose.Types.ObjectId(postId) } },
                        { $unwind: "$commentLikes" },
                        { $match: { $expr: { $eq: ["$commentLikes.commentId", "$$commentIdStr"] } } },
                        {
                            $project: {
                                _id: 0,
                                totalLikes: "$commentLikes.totalLikes",
                            }
                        }
                    ],
                    as: "likesInfo"
                }
            },
        ]);
        if (!replyComments) {
            throw new Error(resMessages.customError.notFound)
        }
        return replyComments;
    } catch (error) {
        throw new Error(error.message);
    }

}





