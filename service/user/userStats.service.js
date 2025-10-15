const userStats = require("../../models/userActivityStats.model.js");
const Comment = require('../../models/Comments.model')
const { toggleCommentStats, togglePostLike } = require("../../helpers/dbHelpers.js")
const userActivityStats = require("../../constants/variables.constants.js")
const { isPostExist, validateComment, createError, isUserExist } = require("../../helpers/dbHelpers.js")
const resMessages = require("../../constants/resMessages.constants.js");
const Block = require("../../models/block.model.js");
const { getIo } = require("../../socket");
const Notification = require("../../models/notification.model.js");
const User = require("../../models/user.model.js")
const enums = require("../../constants/enum.constants.js")
const pushNotification = require("../../utils/pushNotification.js")

//add likes ,views ,commentlikes of users on post
exports.addStatsService = async (postId, type, commentId, userId, username, parentCommentId) => {
    try {
        if (!userId || !username) {
            throw createError(400, 'userNotFound', 'notFound');
        }

        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, 'userNotFound', 'notFound');
        }

        const post = await isPostExist(postId);
        if (!post) {
            throw createError(400, 'postNotFound', 'notFound');
        }

        const blocked = await Block.findOne({
            $or: [
                { blocker: post.userId, blocked: userId },
                { blocker: userId, blocked: post.userId }
            ]
        });


        if (blocked) {
            throw createError(403, 'userNotLikedorView', 'validation');
        }

        if (type === userActivityStats.userStats.CommentLikes) {
            if (!commentId) throw createError(400, 'commentNotFound', 'notFound');
            await validateComment(postId, commentId, parentCommentId);
        }

        if (type === userActivityStats.userStats.CommentReplyLike) {
            if (!parentCommentId || !commentId) throw createError(400, 'commentNotFound', 'notFound');
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
                const postOwner = await isUserExist(post.userId);
                if (postOwner && postOwner.device_token) {
                    try {
                        await pushNotification.androidPushNotification(
                            postOwner.device_token,
                            `${username} ${resMessages.notifications.likedPost}`,
                            "like",
                            { postId: postId.toString(), senderId: userId.toString() }
                        );
                    } catch (error) {
                        console.error(`Failed to send post like push to user ${postOwner._id}:`, error.message);

                        // Optional: Clear invalid token
                        if (error.code === 'messaging/invalid-argument' ||
                            error.code === 'messaging/registration-token-not-registered') {
                            await User.update(
                                { device_token: null },
                                { where: { id: postOwner._id } }
                            );
                            console.log(`Cleared invalid device token for user ${postOwner._id}`);
                        }
                    }
                }
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

                const commentOwner = comment.userId;
                if (commentOwner && commentOwner.device_token) {
                    try {
                        await pushNotification.androidPushNotification(
                            commentOwner.device_token,
                            `${username} ${resMessages.notifications.comment}`,
                            "comment",
                            {
                                postId: postId.toString(),
                                commentId: commentId.toString(),
                                senderId: userId.toString(),
                                parentCommentId: parentCommentId ? parentCommentId.toString() : null
                            }
                        );
                    } catch (error) {
                        console.error(`Failed to send comment push to user ${commentOwner._id}:`, error.message);       
                        if (error.code === 'messaging/invalid-argument' ||
                            error.code === 'messaging/registration-token-not-registered') {
                            await User.update(
                                { device_token: null },
                                { where: { id: commentOwner._id } }
                            );
                            console.log(`Cleared invalid device token for user ${commentOwner._id}`);
                        }
                    }
                }

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
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};


//get all liked or views users those liked or view the post
exports.getAllLikedUserService = async (postId, type, userId) => {
    try {
        const isPostIdExist = await isPostExist(postId);
        if (!isPostIdExist) {
            throw createError(400, 'postNotFound', 'notFound');
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
            throw new Error(400, 'noUserStatsFound', 'customError');
        }

        let resultArr = type === userActivityStats.userStats.Likes ? stats.likes : stats.views;

        resultArr = resultArr.filter(u => !blockedUserIds.some(bid => bid.toString() === u.userId.toString()));

        return resultArr;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};
