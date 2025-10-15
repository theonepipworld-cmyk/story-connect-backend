
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
        throw createError(400, 'userNotFound', 'notFound');
        }

        const user = await isUserExist(userId);
        if (!user) {
          throw createError(400, 'userNotFound', 'notFound');
        }

        const result = await Notification.find({
            user: user._id,
            isRead: false
        })
            .populate("sender", "name avatarUrl")
            .sort({ createdAt: -1 });

        return result;
    }
    catch (error) {
           if (error.statusCode) throw error;
         throw createError(500, 'serverError','error');
    }
};



exports.makeAllUserNotificationReadService = async (userId) => {
    try {
       const result =  await Notification.updateMany(
            { user: userId, isRead: false },
            { $set: { isRead: true } }
        );
        return result;

    }
    catch (error) {
        if (error.statusCode) throw error;
      throw createError(500, 'serverError','error');
    }
}