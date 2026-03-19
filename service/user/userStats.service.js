const userStats = require("../../models/userActivityStats.model.js");
const mongoose = require('mongoose');
const Comment = require('../../models/Comments.model');
const { toggleCommentStats, togglePostLike } = require("../../helpers/dbHelpers.js");
const userActivityStats = require("../../constants/variables.constants.js");
const { isPostExist, validateComment, createError, isUserExist } = require("../../helpers/dbHelpers.js");
const resMessages = require("../../constants/resMessages.constants.js");
const Block = require("../../models/block.model.js");
const { getIo, getUserSocketId } = require("../../socket");
const Notification = require("../../models/notification.model.js");
const User = require("../../models/user.model.js");
const enums = require("../../constants/enum.constants.js");
const pushNotification = require("../../utils/pushNotification.js");
const Conversation = require("../../models/conversations.model.js");



const safeEmit = (socketId, event, payload) => {
    try {
        const io = getIo();
        if (io && socketId) io.to(socketId).emit(event, payload);
    } catch (err) {
        console.error(`Socket emit failed [${event}]:`, err.message);
    }
};


const emitBellBadge = async (userId) => {
    try {
        const socketId = getUserSocketId(userId.toString());
        if (!socketId) return;

        const notificationUnread = await Notification.countDocuments({
            user: userId,
            isRead: false
        });

        safeEmit(socketId, "badgeCountUpdate", { notificationUnread });
    } catch (err) {
        console.error("emitBellBadge failed:", err.message);
    }
};



exports.addStatsService = async (postId, type, commentId, userId, username, parentCommentId) => {
    try {
        if (!userId || !username) {
            throw createError(400, 'userNotFound', 'notFound');
        }

        const user = await isUserExist(userId);
        if (!user) throw createError(404, 'userNotFound', 'notFound');

        const post = await isPostExist(postId);
        if (!post) throw createError(404, 'postNotFound', 'notFound');

        const blocked = await Block.findOne({
            $or: [
                { blocker: post.userId, blocked: userId },
                { blocker: userId, blocked: post.userId }
            ]
        });
        if (blocked) throw createError(403, 'userNotLikedorView', 'validation');

        if (type === userActivityStats.userStats.CommentLikes) {
            if (!commentId) throw createError(400, 'commentNotFound', 'notFound');
            await validateComment(postId, commentId, parentCommentId);
        }

        if (type === userActivityStats.userStats.CommentReplyLike) {
            if (!parentCommentId || !commentId) throw createError(400, 'commentNotFound', 'notFound');
            await validateComment(postId, commentId, parentCommentId, true);
        }

        let stats = await userStats.findOneAndUpdate(
            { postId },
            {
                $setOnInsert: {
                    postId,
                    likes: [],
                    views: [],
                    commentLikes: [],
                    totalLikes: 0,
                    totalViews: 0
                }
            },
            { upsert: true, new: true }
        );

    
        if (type === userActivityStats.userStats.Likes) {
            const liked = togglePostLike(stats, user);

            if (liked && post.userId.toString() !== userId.toString()) {
                const postOwner = await isUserExist(post.userId);

                // Push notification
                if (postOwner?.device_token) {
                    try {
                        await pushNotification.androidPushNotification(
                            postOwner.device_token,
                            `${username} ${resMessages.notifications.likedPost}`,
                            "like",
                            { postId: postId.toString(), senderId: userId.toString() }
                        );
                    } catch (error) {
                        console.error(`Failed to send like push to user ${postOwner._id}:`, error.message);
                        if (
                            error.code === 'messaging/invalid-argument' ||
                            error.code === 'messaging/registration-token-not-registered'
                        ) {
                            await User.findByIdAndUpdate(postOwner._id, { device_token: null });
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

               
                const postOwnerSocketId = getUserSocketId(post.userId.toString());
                safeEmit(postOwnerSocketId, "post_liked", { postId, userId, username });
                await emitBellBadge(post.userId);
            }

     
        } else if (type === userActivityStats.userStats.Views) {
            const alreadyView = stats.views.some(v => v.userId.toString() === userId.toString());
            if (!alreadyView) stats.views.push({ userId, userName: username });
            stats.totalViews = stats.views.length;

        
        } else if (type.startsWith("comment")) {
            toggleCommentStats(stats, userId, commentId, parentCommentId);

            const comment = await Comment.findById(commentId).populate("userId", "_id username");

            if (comment && comment.userId?._id.toString() !== userId.toString()) {
                const commentOwnerFull = await User.findById(comment.userId._id)
                    .select("device_token username");

                // Push notification
                if (commentOwnerFull?.device_token) {
                    try {
                        await pushNotification.androidPushNotification(
                            commentOwnerFull.device_token,
                            `${user.username} ${resMessages.notifications.commentLike}`,
                            "commentLike",
                            {
                                postId: String(postId),
                                commentId: String(commentId),
                                senderId: String(userId),
                                parentCommentId: parentCommentId ? String(parentCommentId) : ""
                            }
                        );
                    } catch (error) {
                        console.error(`Failed to send comment push to user ${commentOwnerFull._id}:`, error.message);
                        if (
                            error.code === 'messaging/invalid-argument' ||
                            error.code === 'messaging/registration-token-not-registered' ||
                            error.code === 'messaging/invalid-registration-token' ||
                            error.code === 'messaging/invalid-payload'
                        ) {
                            await User.findByIdAndUpdate(commentOwnerFull._id, { device_token: null });
                        }
                    }
                }

              
                await Notification.create({
                    user: comment.userId._id,
                    sender: userId,
                    type: enums.notification_Types.LIKE,
                    message: `${username} ${resMessages.notifications.commentLike}`,
                    postId
                });

         
                const commentOwnerSocketId = getUserSocketId(comment.userId._id.toString());
                safeEmit(commentOwnerSocketId, "comment_liked", { postId, commentId, userId, username });
                await emitBellBadge(comment.userId._id);  
            }
        }

        await stats.save();
        return stats;

    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};



exports.getAllLikedUserService = async (postId, type, userId) => {
    try {
        const isPostIdExist = await isPostExist(postId);
        if (!isPostIdExist) throw createError(404, 'postNotFound', 'notFound');

        const blocked = await Block.find({
            $or: [{ blocker: userId }, { blocked: userId }]
        });

        const blockedUserIds = (blocked || [])
            .map(b => b.blocker.toString() === userId.toString() ? b.blocked : b.blocker)
            .filter(Boolean);

        let stats;
        if (type === userActivityStats.userStats.Likes) {
            stats = await userStats.findOne({ postId }).select("likes");
        } else if (type === userActivityStats.userStats.Views) {
            stats = await userStats.findOne({ postId }).select("views");
        }

        if (!stats) throw createError(404, 'noUserStatsFound', 'notFound');

        let resultArr = type === userActivityStats.userStats.Likes ? stats.likes : stats.views;
        resultArr = resultArr.filter(u =>
            !blockedUserIds.some(bid => bid.toString() === u.userId.toString())
        );

        return resultArr;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};



exports.getBadgeCountsService = async (userId) => {
    try {
        if (!userId) throw createError(400, 'missingFields', 'validation');

        const user = await isUserExist(userId);
        if (!user) throw createError(404, 'userNotFound', 'notFound');

        const [conversations, notificationUnread] = await Promise.all([
            Conversation.find({
                participants: new mongoose.Types.ObjectId(userId)
            }).select('unseenCount'),

            Notification.countDocuments({
                user: userId,
                isRead: false
            })
        ]);

        const chatUnread = conversations.reduce((total, conv) => {
            const entry = conv.unseenCount.find(
                u => u.userId.toString() === userId.toString()
            );
            return total + (entry?.count || 0);
        }, 0);

        return { chatUnread, notificationUnread };

    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};