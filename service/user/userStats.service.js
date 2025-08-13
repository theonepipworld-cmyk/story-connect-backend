const userStats = require("../../models/userActivityStats.model.js");
const Comment = require('../../models/Comments.model')
const { toggleCommentStats, togglePostLike } = require("../../helpers/dbHelpers.js")


exports.addStatsService = async (postId, type, commentId, userId, username, parentCommentId) => {
    try {

        if (type === "commentLike") {
            if (!commentId) throw new Error("commentId required for comment actions");
            if (parentCommentId) {
                const parentComment = await Comment.findOne({
                    _id: parentCommentId,
                    postId: postId
                });

                if (!parentComment) {
                    throw new Error("Invalid parentCommentId for this post");
                }

                const childComment = await Comment.findOne({
                    _id: commentId,
                    parentCommentId: parentCommentId,
                    postId: postId
                });

                if (!childComment) {
                    throw new Error("commentId is not a reply to the given parentCommentId");
                }
            } else {
                const comment = await Comment.findOne({
                    _id: commentId,
                    postId: postId
                });
                if (!comment) {
                    throw new Error("Invalid commentId for this post");
                }
            }
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
        if (type === "likes") {
            togglePostLike(stats, userId, username);
        } else if (type === "views") {
            const alreadyView = stats.views.some(v => v.userId.toString() === userId.toString());
            if (!alreadyView) stats.views.push({ userId, username });
            stats.totalViews = stats.views.length;
        }
        // else if (type === "commentLike") {
        //     if (!commentId) throw new Error("commentId required for commentLike");

        //     const existing = stats.commentLikes.find(cl => cl.commentId.toString() === commentId.toString() && cl.userId.toString() === userId.toString());
        //     if (!existing) {
        //         stats.commentLikes.push({ commentId, userId});
        //     }
        // }

        // else if (type === "commentDislike") {
        //     if (!commentId) throw new Error("commentId required for commentDislike");

        //     const index = stats.commentLikes.findIndex(cl => cl.commentId.toString() === commentId.toString() && cl.userId.toString() === userId.toString());
        //     if (index !== -1) {
        //         stats.commentLikes.splice(index, 1);
        //     }
        // }
        // else if(type == "commentReplyLike"){
        //        if (!commentId || !parentCommentId) throw new Error("both commentId nd parentid required for commentLike");

        //     const existing = stats.commentLikes.find(cl => cl.commentId.toString() === commentId.toString() && cl.userId.toString() === userId.toString());
        //     if (!existing) {
        //         stats.commentLikes.push({ commentId, userId,parentCommentId});
        //     }
        // }
        //   else if(type == "commentReplyDisLike"){
        //        if (!commentId || !parentCommentId) throw new Error("both commentId nd parentid required for commentLike");

        //       const index = stats.commentLikes.findIndex(cl => cl.commentId.toString() === commentId.toString() && cl.userId.toString() === userId.toString());
        //     if (index !== -1) {
        //         stats.commentLikes.splice(index, 1);
        //     }
        // }

        else if (type.startsWith("comment")) {
            toggleCommentStats(stats, userId, commentId, parentCommentId);
        }
        await stats.save();
        return stats;

    } catch (error) {
        console.error("Error in addStats:", error);
        throw new Error(error.message || "Failed to add stats");
    }
};

exports.getAllLikedUserService = async (postId, type) => {
    try {
        if (!postId) {
            throw new Error("postId is undefined or null");
        }
        if (!type) {
            throw new Error("type is required");
        }

        let stats;

        if (type === "like") {
            stats = await userStats.findOne({ postId }).select("likes");
        }
        else if (type === "views") {
            stats = await userStats.findOne({ postId }).select("views");
        }
        else {
            throw new Error("Invalid type");
        }

        if (!stats) {
            throw new Error("No stats found for this post");
        }
        return type === "like" ? stats.likes : stats.views;

    } catch (error) {
        console.error("Error in getAllLikedUserService:", error);
        throw new Error(error.message || "Failed to get Users");
    }
};

