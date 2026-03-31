const mongoose = require("mongoose");
const { isUserExist, createError } = require("../../helpers/dbHelpers.js");
const resMessages = require("../../constants/resMessages.constants.js");
const Friend = require("../../models/friends.model.js");
const CommunityMember = require("../../models/communityMember.model.js");
const enums = require("../../constants/enum.constants.js");
const Block = require("../../models/block.model.js");
const Community = require("../../models/community.model.js");
const { getIo, getAllUserSocketIds } = require("../../socket");
const { getMessage } = require("../../constants/locales/index.js");


const emitToUser = (userId, event, payload) => {
  try {
    const io = getIo();
    const socketIds = getAllUserSocketIds(userId.toString());
    socketIds.forEach((sid) => io.to(sid).emit(event, payload));
  } catch (err) {
    console.error(`Socket emit failed [${event}]:`, err?.message || err);
  }
};



exports.blockUserService = async (userId, blockUserId) => {
  try {
    if (!userId || !blockUserId) throw createError(400, 'userNotFound', 'notFound');
    const user = await isUserExist(userId);
    if (!user) throw createError(404, 'userNotFound', 'notFound');
    const alreadyBlocked = await Block.findOne({ blocker: userId, blocked: blockUserId });
    if (alreadyBlocked) return alreadyBlocked;

    const result = await Block.create({ blocker: userId, blocked: blockUserId });

    if (result) {
      const [blockerCommunities, blockedCommunities] = await Promise.all([
        Community.find({ userId }),
        Community.find({ userId: blockUserId }),

        Friend.findOneAndDelete({
          $or: [
            { requester: userId, recipient: blockUserId },
            { requester: blockUserId, recipient: userId }
          ]
        })
      ]);

      await Promise.all([
        CommunityMember.deleteMany({
          communityId: { $in: blockerCommunities.map(c => c._id) },
          userId: blockUserId
        }),
        CommunityMember.deleteMany({
          communityId: { $in: blockedCommunities.map(c => c._id) },
          userId
        })
      ]);

      emitToUser(blockUserId.toString(), "user_blocked", {
        blockedBy: userId,
        message: "You have been blocked"
      });
    }

    return result;
  } catch (error) {
    if (error.statusCode) throw error;
    throw createError(500, 'serverError', 'error');
  }
};

exports.unblockUserService = async (userId, unblockUserId) => {
  try {
    if (!userId || !unblockUserId) throw createError(400, 'missingFields', 'validation');

    const user = await isUserExist(userId);
    if (!user) throw createError(404, 'userNotFound', 'notFound');

    const isBlocked = await Block.findOne({ blocker: userId, blocked: unblockUserId });
    if (!isBlocked) throw createError(404, 'userNotBlocked', 'notFound');

    const result = await Block.deleteOne({ blocker: userId, blocked: unblockUserId });

    emitToUser(unblockUserId.toString(), "user_unblocked", {
      unblockedBy: userId,
      message: "You have been unblocked"
    });

    return result;
  } catch (error) {
    if (error.statusCode) throw error;
    throw createError(500, 'serverError', 'error');
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
                "blockedUser._id": 1,
                "blockedUser.email": 1,
                "blockedUser.avatarUrl": 1,
                "blockedUser.username": 1,
                "blockedUser.currentCountry": 1
              }
            }
          ],
          count: [{ $count: "total" }]
        }
      }
    ]);


    const total = allBlockedUsers[0]?.count[0]?.total || 0;

    return {
      data: allBlockedUsers[0]?.data || [],
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