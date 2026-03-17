
const mongoose = require("mongoose");
const { isPostExist, createError, postAggregationPipeline, isUserExist, isCommunityExist, getAllFriends } = require("../../helpers/dbHelpers.js")
const resMessages = require("../../constants/resMessages.constants.js");
const Friend = require("../../models/friends.model.js");
const User = require("../../models/user.model.js")
const CommunityMember = require("../../models/communityMember.model.js")
const enums = require("../../constants/enum.constants.js")
const Block = require("../../models/block.model");
const { getIo } = require("../../socket");
const Notification = require("../../models/notification.model.js");



exports.getUserNotificationService = async (userId) => {
    try {
        if (!userId) {
            throw createError(404, 'userNotFound', 'notFound');
        }
        const user = await isUserExist(userId);
        if (!user) {
            throw createError(404, 'userNotFound', 'notFound');
        }

        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const result = await Notification.find({
            user: user._id,
            createdAt: { $gte: lastMonth } 
        })
            .populate("sender", "username avatarUrl")
            .populate("postId", "mediaUrls")
            .sort({ createdAt: -1 });

        return result;

    } catch (error) {
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
        return result;

    }
    catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
}

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