const userStats = require("../../models/userActivityStats.model.js");
const Comment = require('../../models/Comments.model')
const { toggleCommentStats, togglePostLike } = require("../../helpers/dbHelpers.js")
const userActivityStats = require("../../constants/variables.constants.js")
const { isPostExist, validateComment, createError ,isUserExist} = require("../../helpers/dbHelpers.js")
const resMessages = require("../../constants/resMessages.constants.js");

//add likes ,views ,commentlikes of users on post
exports.addStatsService = async (postId, type, commentId, userId, username, parentCommentId) => {
    try {
        if (!userId || !username) {
            throw createError(400, resMessages.notFound.userNotFound);
        }   
          const user = await isUserExist(userId)
          if(!user){
            throw createError(400, resMessages.notFound.userNotFound);
          }
        const isPostIdExist = await isPostExist(postId);
        if (!isPostIdExist) {
            throw createError(400, resMessages.notFound.postNotFound);
        }
        if (type === userActivityStats.userStats.CommentLikes) {
            console.log(type)
            console.log(commentId)
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
                postId: postId,
                likes: [],
                views: [],
                commentLikes: [],
                totalLikes: 0,
                totalViews: 0
            });
        };
        if (type === userActivityStats.userStats.Likes) {
            togglePostLike(stats,user);
        } else if (type === userActivityStats.userStats.Views) {
            const alreadyView = stats.views.some(v => v.userId.toString() === userId.toString());
            if (!alreadyView) stats.views.push({ userId, userName:username });
            stats.totalViews = stats.views.length;
        }
        else if (type.startsWith("comment")) {
            toggleCommentStats(stats, userId, commentId, parentCommentId);
        }
        await stats.save();
        return stats;

    } catch (error) {
        throw new Error(error.message);
    }
};


//get all liked or views users those liked or view the post
exports.getAllLikedUserService = async (postId, type) => {
    try {
        const isPostIdExist = await isPostExist(postId);
        if (!isPostIdExist) {
            throw createError(400, resMessages.notFound.postNotFound);
        }
        let stats;
        if (type === userActivityStats.userStats.Likes) {
            stats = await userStats.findOne({ postId }).select("likes");
        }
        else if (type === userActivityStats.userStats.Views) {
            stats = await userStats.findOne({ postId }).select("views");
        }
        if (!stats) {
            throw new Error(resMessages.customError.noUserStatsFound);
        }
        return type === userActivityStats.userStats.Likes ? stats.likes : stats.views;

    } catch (error) {
        throw new Error(error.message);
    }
};

