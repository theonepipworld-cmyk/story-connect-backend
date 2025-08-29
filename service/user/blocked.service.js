
const mongoose = require("mongoose");
const { isPostExist, createError, postAggregationPipeline, isUserExist, isCommunityExist, getAllFriends } = require("../../helpers/dbHelpers.js")
const resMessages = require("../../constants/resMessages.constants.js");
const Friend = require("../../models/friends.model.js");
const User = require("../../models/user.model.js")
const CommunityMember = require("../../models/communityMember.model.js")
const enums = require("../../constants/enum.constants.js")
const Block = require("../../models/block.model.js")
const Community = require("../../models/community.model.js")


exports.blockUserService = async (userId, BlockUserId) => {
    try {
        if (!userId || !BlockUserId) {
            throw createError(400, resMessages.notFound.userNotFound);
        }
        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, resMessages.notFound.userNotFound);
        }

        const alreadyBlocked = await Block.findOne({ blocker: userId, blocked: BlockUserId });
        if (alreadyBlocked) {
            return alreadyBlocked;
        }

        const result = await Block.create({
            blocker: userId,
            blocked: BlockUserId
        })
        if (result) {
            await Friend.findOneAndDelete({
                status: enums.friend_Request_status.ACCEPTED,
                $or: [
                    { requester: userId, recipient: BlockUserId },
                    { requester: BlockUserId, recipient: userId }
                ]
            });
            const Communities = await Community.find({
                userId: userId
            })

            const communitiesId = Communities.map((c) => c._id)
            await CommunityMember.deleteMany({
                communityId: { $in: communitiesId },
                userId: BlockUserId
            });

        }
        return result;
    }
    catch (error) {
        throw createError(500, error.message);
    }
};

exports.unblockUserService = async (userId, unblockUserId) => {
    try {
        if (!userId || !unblockUserId) {
            throw createError(400, resMessages.validation.missingFields);
        }

        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, resMessages.notFound.userNotFound);
        }

        const isBlocked = await Block.findOne({ blocker: userId, blocked: unblockUserId });
        if (!isBlocked) {
            throw createError(400, resMessages.notFound.userNotBlocked);
        }

       const result =  await Block.deleteOne({ blocker: userId, blocked: unblockUserId });

        return result;
    } catch (error) {
        throw createError(500, error.message);
    }
};

exports.getBlockedUserService = async (page, limit, userId) => {
  try {
    if (!userId) {
      throw createError(400, resMessages.validation.missingFields);
    }

    const user = await isUserExist(userId);
    if (!user) {
      throw createError(400, resMessages.notFound.userNotFound);
    }

    const offset = (page - 1) * limit;

    const allBlockUser = await Block.aggregate([
      {
        $match: { blocker: user._id }
      },
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
            {
            $unwind:{path:"$blockedUser",preserveNullAndEmptyArrays: true}
            },
            {
                $project:{
                    _id:1,
                    blocker:1,
                    createdAt:1,
                    updatedAt:1,
                    "blockedUser.email":1,
                    "blockedUser.avatarUrl":1,
                    "blockedUser.username":1,
                    "blockedUser.curentCountry":1
                }
            }
          ],
          count: [
            { $count: "total" }
          ]
        }
      }
    ]);

    if (!allBlockUser || allBlockUser.length === 0) {
      throw createError(400, resMessages.notFound.noBlockUser);
    }
    const total = allBlockUser[0]?.count[0]?.total || 0

    return {
      data: allBlockUser[0]?.data || [],
         pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                limit,
            }
    };
  } catch (error) {
    throw createError(500, error.message);
  }
};

