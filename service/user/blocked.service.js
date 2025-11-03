const mongoose = require("mongoose");
const { isUserExist, createError } = require("../../helpers/dbHelpers.js");
const resMessages = require("../../constants/resMessages.constants.js");
const Friend = require("../../models/friends.model.js");
const CommunityMember = require("../../models/communityMember.model.js");
const enums = require("../../constants/enum.constants.js");
const Block = require("../../models/block.model.js");
const Community = require("../../models/community.model.js");

exports.blockUserService = async (userId, blockUserId) => {
  try {
    if (!userId || !blockUserId) throw createError(400, 'userNotFound', 'notFound');

    const user = await isUserExist(userId);
    if (!user) throw createError(404, 'userNotFound', 'notFound');

    const alreadyBlocked = await Block.findOne({ blocker: userId, blocked: blockUserId });
    if (alreadyBlocked) return alreadyBlocked;

    const result = await Block.create({ blocker: userId, blocked: blockUserId });

    if (result) {
      // Remove friendship if exists
      await Friend.findOneAndDelete({
        status: enums.friend_Request_status.ACCEPTED,
        $or: [
          { requester: userId, recipient: blockUserId },
          { requester: blockUserId, recipient: userId }
        ]
      });

      // Remove from user's communities
      const communities = await Community.find({ userId });
      const communityIds = communities.map(c => c._id);

      await CommunityMember.deleteMany({
        communityId: { $in: communityIds },
        userId: blockUserId
      });
    }

    return result;
  } catch (error) {
    if (error.statusCode) throw error;
      throw createError(500, 'serverError','error');
  }
};

exports.unblockUserService = async (userId, unblockUserId) => {
  try {
    if (!userId || !unblockUserId) throw createError(400, 'missingFields', 'validation');
    const user = await isUserExist(userId);
    if (!user) throw createError(404, 'userNotFound', 'notFound');

    const isBlocked = await Block.findOne({ blocker: userId, blocked: unblockUserId });
    if (!isBlocked) throw createError(400, 'userNotBlocked', 'notFound');

    const result = await Block.deleteOne({ blocker: userId, blocked: unblockUserId });

    return result;
  } catch (error) {
    if (error.statusCode) throw error;
    throw createError(500, 'serverError','error');
  }
};

exports.getBlockedUserService = async (page, limit, userId) => {
  try {
    if (!userId) throw createError(400, 'missingFields', 'validation');

    const user = await isUserExist(userId);
    if (!user) throw createError(404, 'userNotFound', 'notFound');

    const offset = (page - 1) * limit;

    const allBlockedUsers = await Block.aggregate([
      { $match: { blocker: user._id } },
      {
        $facet: {
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: offset },
            { $limit: limit },
            {
              $lookup: {
                from: "users",
                localField: "blocked",
                foreignField: "_id",
                as: "blockedUser"
              }
            },
            { $unwind: { path: "$blockedUser", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                blocker: 1,
                createdAt: 1,
                updatedAt: 1,
                "blockedUser._id":1,
                "blockedUser.email": 1,
                "blockedUser.avatarUrl": 1,
                "blockedUser.username": 1,
                "blockedUser.curentCountry": 1
              }
            }
          ],
          count: [{ $count: "total" }]
        }
      }
    ]);

    if (!allBlockedUsers || allBlockedUsers.length === 0) {
      throw createError(404, 'noBlockUser', 'notFound');
    }

    const total = allBlockedUsers[0]?.count[0]?.total || 0;

    return {
      data: allBlockedUsers[0]?.data || [],
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      }
    };
  } catch (error) {
    if (error.statusCode) throw error;
    throw createError(500, 'serverError','error');
  }
};
