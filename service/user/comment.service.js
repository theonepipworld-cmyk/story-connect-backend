const User = require('../../models/user.model');
const mongoose = require('mongoose');
const { uploadFileToS3 } = require('../../utils/s3.util');
const { DEFAULT_AVATAR_URL } = require('../../constants/variables.constants');
const { errorResponse, successResponse } = require('../../utils/responseHandler.util');
const resMessages = require("../../constants/resMessages.constants.js");
const Comment = require('../../models/Comments.model');
const { isPostExist, createError, isUserExist } = require("../../helpers/dbHelpers.js");
const UserStats = require("../../models/userActivityStats.model");
const Block = require("../../models/block.model.js");
const Notification = require("../../models/notification.model.js");
const pushNotification = require("../../utils/pushNotification.js");
const { getIo, getAllUserSocketIds } = require("../../socket");
const enums = require("../../constants/enum.constants.js");



const safeEmit = (socketIds, event, payload) => {
    try {
        const io = getIo();
        if (!io || !socketIds) return;
        const ids = Array.isArray(socketIds) ? socketIds : [socketIds];
        ids.forEach(socketId => {
            if (socketId) io.to(socketId).emit(event, payload);
        });
    } catch (err) {
        console.error(`Socket emit failed [${event}]:`, err.message);
    }
};

const emitBellBadge = async (userId) => {
    try {
        const socketIds = getAllUserSocketIds(userId.toString());
        if (!socketIds.length) return;

        const notificationUnread = await Notification.countDocuments({
            user: userId,
            isRead: false
        });

        safeEmit(socketIds, "badgeCountUpdate", { notificationUnread });
    } catch (err) {
        console.error("emitBellBadge failed:", err.message);
    }
};

exports.addCommentService = async (postId, userId, commentString, parentCommentId = null) => {
    try {
        if (!userId) throw createError(404, 'userNotFound', 'notFound');

        const [post, user] = await Promise.all([
            isPostExist(postId),
            isUserExist(userId)
        ]);

        if (!post) throw createError(404, 'postNotFound', 'notFound');
        if (!user) throw createError(404, 'userNotFound', 'notFound');

        const blocked = await Block.findOne({
            $or: [
                { blocker: post.userId, blocked: userId },
                { blocker: userId, blocked: post.userId }
            ]
        });

        if (blocked) {
            const blockedByThem = blocked.blocker.toString() === post.userId.toString();
            throw createError(403, blockedByThem ? 'youHaveBeenBlocked' : 'youHaveBlockedThisUser', 'validation');
        }

        const comment = await Comment.create({
            userId,
            postId,
            parentCommentId: parentCommentId || null,
            content: commentString
        });

        if (parentCommentId) {
            await Comment.findByIdAndUpdate(parentCommentId, { $inc: { replyCount: 1 } });
        }

        const totalComments = await Comment.countDocuments({ postId });
        console.log(`Total comments for post ${postId}: ${totalComments}`);

        if (post.userId.toString() !== userId.toString()) {
            const postOwner = await User.findById(post.userId);

            await Promise.all([
                (async () => {
                    if (!postOwner?.device_token || !postOwner?.isPushNotification) return;

                    try {
                        await pushNotification.androidPushNotification(
                            postOwner.device_token,
                            `${user.username} ${resMessages.notifications.comment}`,
                            "comment",
                            {
                                postId: postId.toString(),
                                commentId: comment._id.toString(),
                                senderId: userId.toString(),
                                avatarUrl: userId.avatarUrl,
                                parentCommentId: parentCommentId ? parentCommentId.toString() : ""
                            }
                        );
                    } catch (error) {
                        console.error(`Failed to send push to user ${postOwner._id}:`, error.message);

                        if (
                            error.code === 'messaging/invalid-argument' ||
                            error.code === 'messaging/registration-token-not-registered'
                        ) {
                            await User.findByIdAndUpdate(postOwner._id, { device_token: null });
                        }
                    }
                })(),

                Notification.create({
                    user: post.userId,
                    sender: userId,
                    type: enums.notification_Types.COMMENT,
                    message: `${user.username} ${resMessages.notifications.comment}`,
                    postId,
                    commentId: comment._id,
                    parentCommentId: parentCommentId || null
                })
            ]);

            const postOwnerSocketIds = getAllUserSocketIds(post.userId.toString());
            console.log(`Post owner socket IDs for user ${post.userId}:`, postOwnerSocketIds);

            safeEmit(userId, "comment_added", { totalComments, postId });

            safeEmit(postOwnerSocketIds, "new_comment", {
                type: "new_comment",
                title: user.username,
                body: parentCommentId ? "Replied to your comment" : "Commented on your post",
                avatar: user.avatarUrl,
                href: `/posts/${postId}?commentId=${comment._id}${parentCommentId ? `&parentCommentId=${parentCommentId}` : ""}`,

                postId: postId.toString(),
                commentId: comment._id.toString(),
                parentCommentId: parentCommentId ? parentCommentId.toString() : "",

                senderId: userId.toString(),
                senderName: user.username,
                senderAvatar: user.avatarUrl,

                sender: {
                    _id: user._id,
                    username: user.username,
                    avatarUrl: user.avatarUrl
                }
            });

            await emitBellBadge(post.userId);


        }



        return comment;
    } catch (error) {
        console.log("addCommentService error:>>>", error);
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};

exports.updateCommentService = async (postId, commentId, parentCommentId, content, userId) => {
    try {
        const isPostIdExist = await isPostExist(postId);
        if (!isPostIdExist) throw createError(404, 'postNotFound', 'notFound');

        if (!userId) throw createError(404, 'userNotFound', 'notFound');

        const comment = await Comment.findById(commentId);
        if (!comment) throw createError(404, 'commentNotFound', 'notFound');

        if (comment.userId.toString() !== userId.toString()) {
            throw createError(403, 'NotAuthorized', 'customError');
        }

        const filter = { _id: commentId, postId, userId };

        if (parentCommentId) {
            if (
                !comment.parentCommentId ||
                comment.parentCommentId.toString() !== parentCommentId.toString()
            ) {
                throw createError(400, 'commentIdNotMatch', 'customError');
            }
            filter.parentCommentId = parentCommentId;
        } else {
            if (comment.parentCommentId) {
                throw createError(400, 'parentCommentIdInvalid', 'customError');
            }
            filter.parentCommentId = null;
        }

        const updatedComment = await Comment.findOneAndUpdate(
            filter,
            { content, isEdited: true },
            { new: true }
        );

        if (!updatedComment) throw createError(404, 'commentNotFound', 'notFound');

        return updatedComment;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};


exports.deleteCommentService = async (postId, commentId, parentCommentId, userId) => {
    try {
        const isPostIdExist = await isPostExist(postId);
        if (!isPostIdExist) throw createError(404, 'postNotFound', 'notFound');

        if (!userId) throw createError(404, 'userNotFound', 'notFound');

        const comment = await Comment.findById(commentId)
            .populate("userId", "_id")
            .populate("postId", "userId");

        if (!comment) throw createError(404, 'commentNotFound', 'notFound');

        const isCommentOwner = comment.userId._id.toString() === userId.toString();
        const isPostOwner = comment.postId.userId.toString() === userId.toString();

        if (!isCommentOwner && !isPostOwner) {
            throw createError(403, 'NotAuthorized', 'customError');
        }

        const filter = { _id: commentId, postId };
        if (parentCommentId) filter.parentCommentId = parentCommentId;

        const isTopLevel = !comment.parentCommentId;
        if (isTopLevel) {
            const replyIds = await Comment.find(
                { parentCommentId: commentId },
                "_id"
            ).lean();
            const replyIdStrings = replyIds.map((r) => r._id.toString());

            await Promise.all([
                Comment.deleteMany({
                    $or: [{ _id: commentId }, { parentCommentId: commentId }]
                }),
                UserStats.updateOne(
                    { "commentLikes.commentId": commentId.toString() },
                    { $pull: { commentLikes: { commentId: commentId.toString() } } }
                ),
                replyIdStrings.length > 0
                    ? UserStats.updateMany(
                        { "commentLikes.commentId": { $in: replyIdStrings } },
                        { $pull: { commentLikes: { commentId: { $in: replyIdStrings } } } }
                    )
                    : Promise.resolve()
            ]);
        } else {
            const deleteResult = await Comment.deleteOne(filter);

            if (deleteResult.deletedCount === 0) {
                throw createError(400, 'commentNotDeleted', 'customError');
            }

            await Promise.all([
                UserStats.updateOne(
                    { "commentLikes.commentId": commentId.toString() },
                    { $pull: { commentLikes: { commentId: commentId.toString() } } }
                ),
                Comment.findByIdAndUpdate(parentCommentId, { $inc: { replyCount: -1 } })
            ]);
        }

        return { success: true, message: resMessages.success.deleteSuccessful };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};


exports.getTopLevelCommentService = async (postId, page, limit, userId) => {
    try {
        page = parseInt(page);
        limit = parseInt(limit);

        if (!userId) throw createError(404, 'userNotFound', 'notFound');

        const [user, isPostIdExist] = await Promise.all([
            isUserExist(userId),
            isPostExist(postId)
        ]);

        if (!user) throw createError(404, 'userNotFound', 'notFound');
        if (!isPostIdExist) throw createError(404, 'postNotFound', 'notFound');

        const offset = (page - 1) * limit;

        const blocked = await Block.find({
            $or: [{ blocker: userId }, { blocked: userId }]
        });
        const blockedUserIds = blocked.map((b) =>
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
                        {
                            $unwind: {
                                path: "$userInfo",
                                preserveNullAndEmptyArrays: true
                            }
                        },
                        {
                            $lookup: {
                                from: "userstats",
                                let: { commentIdStr: { $toString: "$_id" } },
                                pipeline: [
                                    { $match: { postId: new mongoose.Types.ObjectId(postId) } },
                                    { $unwind: { path: "$commentLikes", preserveNullAndEmptyArrays: true } },
                                    { $match: { $expr: { $eq: ["$commentLikes.commentId", "$$commentIdStr"] } } },
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
                                userId: "$userInfo._id",
                                profilePicture: "$userInfo.avatarUrl",
                                currentCountry: { $ifNull: ["$userInfo.currentCountry", { code: "", name: "" }] },
                                replyCount: 1,
                                totalLikes: { $ifNull: [{ $arrayElemAt: ["$likesInfo.totalLikes", 0] }, 0] },
                                isCommentLikedByMe: 1
                            }
                        }
                    ],
                    totalCount: [{ $count: "count" }]
                }
            }
        ]);

        const data = topLevelComments[0].data;
        const total = topLevelComments[0].totalCount[0]?.count || 0;

        return {
            data,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                limit
            }
        };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};


exports.getReplyCommentService = async (postId, page, limit, parentCommentId, userId) => {
    try {
        page = parseInt(page);
        limit = parseInt(limit);

        if (!userId) throw createError(404, 'userNotFound', 'notFound');

        const [user, isPostIdExist] = await Promise.all([
            isUserExist(userId),
            isPostExist(postId)
        ]);

        if (!user) throw createError(404, 'userNotFound', 'notFound');
        if (!isPostIdExist) throw createError(404, 'postNotFound', 'notFound');

        const offset = (page - 1) * limit;

        const blocked = await Block.find({
            $or: [{ blocker: userId }, { blocked: userId }]
        });
        const blockedUserIds = blocked.map((b) =>
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
                        { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: "userstats",
                                let: { commentIdStr: { $toString: "$_id" } },
                                pipeline: [
                                    { $match: { postId: new mongoose.Types.ObjectId(postId) } },
                                    { $unwind: { path: "$commentLikes", preserveNullAndEmptyArrays: true } },
                                    { $match: { $expr: { $eq: ["$commentLikes.commentId", "$$commentIdStr"] } } },
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
                                userId: "$userInfo._id",
                                profilePicture: "$userInfo.avatarUrl",
                                currentCountry: "$userInfo.currentCountry",
                                totalLikes: { $ifNull: [{ $arrayElemAt: ["$likesInfo.totalLikes", 0] }, 0] },
                                replyCount: 1,
                                isCommentLikedByMe: 1,
                                parentCommentId: "$parentCommentId"
                            }
                        }
                    ],
                    totalCount: [{ $count: "count" }]
                }
            }
        ]);

        const data = replyComments[0].data;
        const total = replyComments[0].totalCount[0]?.count || 0;

        return {
            data,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                limit
            }
        };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};