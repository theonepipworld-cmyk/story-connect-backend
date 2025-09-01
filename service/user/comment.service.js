const User = require('../../models/user.model');
const mongoose = require('mongoose');
const { uploadFileToS3 } = require('../../utils/s3.util');
const { DEFAULT_AVATAR_URL } = require('../../constants/variables.constants');
const { errorResponse, successResponse } = require('../../utils/responseHandler.util');
const resMessages = require("../../constants/resMessages.constants.js")
const Comment = require('../../models/Comments.model');
const { isPostExist, createError, isUserExist } = require("../../helpers/dbHelpers.js")
const UserStats = require("../../models/userActivityStats.model");
const Block = require("../../models/block.model.js");


exports.addCommentService = async (postId, userId, commentString, parentCommentId = null) => {
    try {
        if (!userId) {
            throw createError(400, resMessages.notFound.userNotFound);
        }

        const post = await isPostExist(postId);
        if (!post) {
            throw createError(400, resMessages.notFound.postNotFound);
        }

        const blocked = await Block.findOne({
            $or: [
                { blocker: post.userId, blocked: userId },
                { blocker: userId, blocked: post.userId }
            ]
        });

        if (blocked) {
            throw createError(403, resMessages.validation.userBlocked);
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
    } catch (error) {
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

        //delete that comment from userstats

        await UserStats.updateOne(
            { "commentLikes.commentId": commentId },
            { $pull: { commentLikes: { commentId: commentId } } }
        );
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

exports.getTopLevelCommentService = async (postId, page, limit, userId) => {
    try {
        if (!userId) {
            throw createError(400, resMessages.notFound.userNotFound);
        }

        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, resMessages.notFound.userNotFound);
        }

        const isPostIdExist = await isPostExist(postId);
        if (!isPostIdExist) {
            throw createError(400, resMessages.notFound.postNotFound);
        }

        const offset = (page - 1) * limit;
        const blocked = await Block.find({
            $or: [{ blocker: userId }, { blocked: userId }]
        });

        const blockedUserIds = blocked.map(b =>
            b.blocker.toString() === userId.toString() ? b.blocked : b.blocker
        );

        const topLevelComments = await Comment.aggregate([
            {
                $match: {
                    postId: new mongoose.Types.ObjectId(postId),
                    parentCommentId: null,
                    userId: { $nin: blockedUserIds }
                }
            },
            {
                $facet: {
                    data: [
                        { $sort: { createdAt: -1 } },
                        { $skip: offset },
                        { $limit: limit },
                        {
                            $lookup: {
                                from: "users",
                                localField: "userId",
                                foreignField: "_id",
                                as: "userInfo"
                            }
                        },
                        { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: "userstats",
                                let: {
                                    commentIdStr: { $toString: "$_id" },
                                    userIdStr: user._id.toString()
                                },
                                pipeline: [
                                    { $match: { postId: new mongoose.Types.ObjectId(postId) } },
                                    { $unwind: { path: "$commentLikes", preserveNullAndEmptyArrays: true } },
                                    {
                                        $match: {
                                            $expr: { $eq: ["$commentLikes.commentId", "$$commentIdStr"] }
                                        }
                                    },
                                    {
                                        $project: {
                                            _id: 0,
                                            totalLikes: { $ifNull: ["$commentLikes.totalLikes", 0] },
                                            userIds: { $ifNull: ["$commentLikes.userIds", []] }
                                        }
                                    }
                                ],
                                as: "likesInfo"
                            }
                        },
                        {
                            $addFields: {
                                isCommentLikedByMe: {
                                    $anyElementTrue: {
                                        $map: {
                                            input: { $ifNull: ["$likesInfo", []] },
                                            as: "like",
                                            in: {
                                                $anyElementTrue: {
                                                    $map: {
                                                        input: { $ifNull: ["$$like.userIds", []] },
                                                        as: "uid",
                                                        in: { $eq: ["$$uid", user._id.toString()] }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                content: 1,
                                createdAt: 1,
                                username: "$userInfo.username",
                                profilePicture: "$userInfo.avatarUrl",
                                currentCountry: {
                                    $ifNull: ["$userInfo.currentCountry", { code: "", name: "" }]
                                },
                                replyCount: 1,
                                isCommentLikedByMe: 1
                            }
                        }
                    ],
                    totalCount: [{ $count: "count" }]
                }
            }
        ]);

        if (!topLevelComments) {
            throw new Error(resMessages.customError.notFound);
        }

        const data = topLevelComments[0].data;
        const total = topLevelComments[0].totalCount[0]?.count || 0;

        return {
            data,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                limit: parseInt(limit)
            }
        };
    } catch (error) {
        throw new Error(error.message);
    }
};




exports.getReplyCommentService = async (postId, page, limit, parentCommentId, userId) => {
    try {
        if (!userId) {
            throw createError(400, resMessages.notFound.userNotFound);
        }

        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, resMessages.notFound.userNotFound);
        }

        const isPostIdExist = await isPostExist(postId);
        if (!isPostIdExist) {
            throw createError(400, resMessages.notFound.postNotFound);
        }

        const offset = (page - 1) * limit;

        const blocked = await Block.find({
            $or: [{ blocker: userId }, { blocked: userId }]
        });

        const blockedUserIds = blocked.map(b =>
            b.blocker.toString() === userId.toString() ? b.blocked : b.blocker
        );

        const replyComments = await Comment.aggregate([
            {
                $match: {
                    postId: new mongoose.Types.ObjectId(postId),
                    parentCommentId: new mongoose.Types.ObjectId(parentCommentId),
                    userId: { $nin: blockedUserIds } 
                }
            },
            {
                $facet: {
                    data: [
                        { $sort: { createdAt: -1 } },
                        { $skip: offset },
                        { $limit: limit },
                        {
                            $lookup: {
                                from: "users",
                                localField: "userId",
                                foreignField: "_id",
                                as: "userInfo"
                            }
                        },
                        { $unwind: "$userInfo" },
                        {
                            $lookup: {
                                from: "userstats",
                                let: { commentIdStr: { $toString: "$_id" } },
                                pipeline: [
                                    { $match: { postId: new mongoose.Types.ObjectId(postId) } },
                                    { $unwind: "$commentLikes" },
                                    {
                                        $match: {
                                            $expr: { $eq: ["$commentLikes.commentId", "$$commentIdStr"] }
                                        }
                                    },
                                    {
                                        $project: {
                                            _id: 0,
                                            totalLikes: "$commentLikes.totalLikes",
                                            userIds: "$commentLikes.userIds"
                                        }
                                    }
                                ],
                                as: "likesInfo"
                            }
                        },
                        {
                            $addFields: {
                                isCommentLikedByMe: {
                                    $anyElementTrue: {
                                        $map: {
                                            input: { $ifNull: ["$likesInfo", []] },
                                            as: "like",
                                            in: {
                                                $anyElementTrue: {
                                                    $map: {
                                                        input: { $ifNull: ["$$like.userIds", []] },
                                                        as: "uid",
                                                        in: { $eq: ["$$uid", user._id.toString()] }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                content: 1,
                                createdAt: 1,
                                username: "$userInfo.username",
                                profilePicture: "$userInfo.avatarUrl",
                                currentCountry: "$userInfo.currentCountry",
                                totalLikes: {
                                    $ifNull: [{ $arrayElemAt: ["$likesInfo.totalLikes", 0] }, 0]
                                },
                                replyCount: 1,
                                isCommentLikedByMe: 1,
                                parentCommentId: parentCommentId
                            }
                        }
                    ],
                    totalCount: [{ $count: "count" }]
                }
            }
        ]);

        if (!replyComments) {
            throw new Error(resMessages.customError.notFound);
        }

        const data = replyComments[0].data;
        const total = replyComments[0].totalCount[0]?.count || 0;

        return {
            data,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                limit: parseInt(limit)
            }
        };
    } catch (error) {
        throw new Error(error.message);
    }
};





