const mongoose = require("mongoose");
const { isPostExist, createError, postAggregationPipeline, isUserExist, isCommunityExist, getAllFriends } = require("../../helpers/dbHelpers.js")
const resMessages = require("../../constants/resMessages.constants.js");
const Friend = require("../../models/friends.model.js");
const User = require("../../models/user.model.js")
const CommunityMember = require("../../models/communityMember.model.js")
const enums = require("../../constants/enum.constants.js")
const Block = require("../../models/block.model");
const { getIo, getAllUserSocketIds } = require("../../socket");
const Notification = require("../../models/notification.model.js");
const Post = require("../../models/post.model.js")

exports.getUserNotificationService = async (userId) => {
    try {
        if (!userId) throw createError(404, 'userNotFound', 'notFound');

        const user = await isUserExist(userId);
        if (!user) throw createError(404, 'userNotFound', 'notFound');

        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const notifications = await Notification.find({
            user: user._id,
            createdAt: { $gte: lastMonth }
        })
            .populate("sender", "username avatarUrl currentCountry")
            .sort({ createdAt: -1 })
            .lean();

        const postIds = notifications
            .map((item) => item.postId)
            .filter(Boolean);

        const posts = await Post.collection
            .find({ _id: { $in: postIds } })
            .project({ mediaUrls: 1 })
            .toArray();

        const postMap = {};
        posts.forEach((post) => {
            postMap[post._id.toString()] = post;
        });

        const result = notifications.map((item) => ({
            ...item,
            postId: item.postId
                ? postMap[item.postId.toString()] || null
                : null
        }));

        return result;

    } catch (error) {
        console.log(error)
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};


exports.makeAllUserNotificationReadService = async (userId) => {
    try {
        const result = await Notification.updateMany(
            { user: userId, isRead: false },
            { $set: { isRead: true } }
        );

        const socketIds = getAllUserSocketIds(userId.toString());
        if (socketIds.length > 0) {
            const io = getIo();
            socketIds.forEach(socketId => {
                io.to(socketId).emit("badgeCountUpdate", { notificationUnread: 0 });
            });
        }

        return result;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};


exports.changeStatusPushNotificationService = async (userId, isPushNotification) => {
    try {
        if (!userId) throw createError(404, 'userNotFound', 'notFound');
        if (typeof isPushNotification !== 'boolean') throw createError(400, 'InvalidPushNotification', 'validation');

        const user = await User.findByIdAndUpdate(
            userId,
            { isPushNotification },
            { new: true, select: 'isPushNotification username email' }
        );

        if (!user) throw createError(404, 'userNotFound', 'notFound');

        return {
            message: `Push notification ${isPushNotification ? 'enabled' : 'disabled'} successfully.`,
            user
        };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'Server error', { error: error.message });
    }
};