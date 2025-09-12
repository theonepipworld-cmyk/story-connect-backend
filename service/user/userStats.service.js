const userStats = require("../../models/userActivityStats.model.js");
const Comment = require('../../models/Comments.model')
const { toggleCommentStats, togglePostLike } = require("../../helpers/dbHelpers.js")
const userActivityStats = require("../../constants/variables.constants.js")
const { isPostExist, validateComment, createError, isUserExist } = require("../../helpers/dbHelpers.js")
const resMessages = require("../../constants/resMessages.constants.js");
const Block = require("../../models/block.model.js");
const { getIo } = require("../../socket");
const Notification = require("../../models/notification.model.js");
const enums = require("../../constants/enum.constants.js")

//add likes ,views ,commentlikes of users on post
exports.addStatsService = async (postId, type, commentId, userId, username, parentCommentId) => {
    try {
        if (!userId || !username) {
            throw createError(400, resMessages.notFound.userNotFound);
        }

        const user = await isUserExist(userId);
        if (!user) {
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
            throw createError(403, resMessages.validation.userNotLikedorView);
        }

        if (type === userActivityStats.userStats.CommentLikes) {
            if (!commentId) throw createError(400, resMessages.notFound.commentNotFound);
            await validateComment(postId, commentId, parentCommentId);
        }

        if (type === userActivityStats.userStats.CommentReplyLike) {
            if (!parentCommentId || !commentId) throw createError(400, resMessages.notFound.commentNotFound);
            await validateComment(postId, commentId, parentCommentId, true);
        }

        let stats = await userStats.findOne({ postId });
        if (!stats) {
            stats = await userStats.create({
                postId,
                likes: [],
                views: [],
                commentLikes: [],
                totalLikes: 0,
                totalViews: 0
            });
        }

        if (type === userActivityStats.userStats.Likes) {
            const liked = togglePostLike(stats, user);
            if (liked && post.userId.toString() !== userId.toString()) {
                await Notification.create({
                    user: post.userId,
                    sender: userId,
                    type: enums.notification_Types.LIKE,
                    message: `${username} ${resMessages.notifications.likedPost}`,
                    postId
                });
                const io = getIo();
                io.emit("post_liked", { postId, userId, username });
            }

        } else if (type === userActivityStats.userStats.Views) {
            const alreadyView = stats.views.some(v => v.userId.toString() === userId.toString());
            if (!alreadyView) stats.views.push({ userId, userName: username });
            stats.totalViews = stats.views.length;

        }
        else if (type.startsWith("comment")) {
            toggleCommentStats(stats, userId, commentId, parentCommentId);
            const comment = await Comment.findById(commentId).populate("userId", "username");

            if (comment && comment.userId.toString() !== userId.toString()) {
                await Notification.create({
                    user: comment.userId,
                    sender: userId,
                    type: enums.notification_Types.comment,
                    message: `${username} ${resMessages.notifications.comment}`,
                    postId
                });
                const io = getIo();
                io.emit("comment_liked", { postId, commentId, userId, username });
            }
        }

        await stats.save();
        return stats;
        // let responseData = {};
        // if (type === userActivityStats.userStats.Likes) {
        //     responseData = {
        //         totalLikes: stats.totalLikes,
        //         //likes: stats.likes
        //     };
        // } else if (type === userActivityStats.userStats.Views) {
        //     responseData = {
        //         totalViews: stats.totalViews,
        //         //views: stats.views
        //     };
        // } else if (type.startsWith("comment")) {
        //     responseData = {
        //         commentLikes: stats.commentLikes
        //     };
        // }

        // return responseData;
       

    } catch (error) {
        throw new Error(error.message);
    }
};


//get all liked or views users those liked or view the post
exports.getAllLikedUserService = async (postId, type, userId) => {
    try {
        const isPostIdExist = await isPostExist(postId);
        if (!isPostIdExist) {
            throw createError(400, resMessages.notFound.postNotFound);
        }

        const blocked = await Block.find({
            $or: [{ blocker: userId }, { blocked: userId }]
        });

        const blockedUserIds = (blocked || []).map(b =>
            b.blocker.toString() === userId.toString() ? b.blocked : b.blocker
        );

        let stats;
        if (type === userActivityStats.userStats.Likes) {
            stats = await userStats.findOne({ postId }).select("likes");
        } else if (type === userActivityStats.userStats.Views) {
            stats = await userStats.findOne({ postId }).select("views");
        }

        if (!stats) {
            throw new Error(resMessages.customError.noUserStatsFound);
        }

        let resultArr = type === userActivityStats.userStats.Likes ? stats.likes : stats.views;

        resultArr = resultArr.filter(u => !blockedUserIds.some(bid => bid.toString() === u.userId.toString()));

        return resultArr;
    } catch (error) {
        throw new Error(error.message);
    }
};
