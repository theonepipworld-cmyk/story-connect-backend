
const mongoose = require("mongoose");
const { isPostExist, createError, postAggregationPipeline, isUserExist, isCommunityExist, getAllFriends } = require("../../helpers/dbHelpers.js")
const resMessages = require("../../constants/resMessages.constants.js");
const Friend = require("../../models/friends.model.js");
const User = require("../../models/user.model.js")
const CommunityMember = require("../../models/communityMember.model.js")


exports.sendFriendReqService = async (userId, friendReqId) => {
    try {
        console.log(userId ,friendReqId)
        if (!userId || !friendReqId) {
            throw createError(400, resMessages.notFound.userOrFriendIdNotFound);
        }
        if (userId.toString() === friendReqId.toString()) {
            throw createError(400, resMessages.customError.notSendReqYourself);
        }
        const user = await isUserExist(userId);
        const recipient = await isUserExist(friendReqId);
        if (!recipient) {
            throw createError(400, resMessages.notFound.ReqUser);
        }

        const existing = await Friend.findOne({
            $or: [
                { requester: userId, recipient: friendReqId },
                { requester: friendReqId, recipient: userId }
            ]
        });

        if (existing) {
            if (existing.status === "pending") {
                throw createError(400, resMessages.customError.friendReqSent);
            }
            if (existing.status === "accepted") {
                throw createError(400, resMessages.customError.alreadyFriend);
            }
        }

        const result = await Friend.create({
            requester: userId,
            recipient: friendReqId,
            status: "pending"
        });

        return result;
    } catch (error) {
        throw createError(500, error.message);
    }
};


exports.respondFriendReqService = async (userId, friendReqId, action) => {
    try {
        if (!userId || !friendReqId) {
            throw createError(400, resMessages.notFound.userOrFriendIdNotFound);
        }
  console.log(userId ,friendReqId)
        const user = await isUserExist(userId);
        const requester = await isUserExist(friendReqId);

        if (!requester) {
            throw createError(400, resMessages.notFound.userNotFound);
        }
        const existing = await Friend.findOne({
            requester: friendReqId, 
            recipient: userId  
        });

        if (!existing) {
            throw createError(404, resMessages.notFound.userOrFriendIdNotFound);
        }

        if (existing.status === "accepted") {
            throw createError(400, resMessages.customError.alreadyFriend);
        }

        if (existing.status === "rejected") {
            throw createError(400, resMessages.customError.alreadyRejected);
        }

        // Only the recipient can accept/reject
        if (action === "accept") {
            existing.status = "accepted";
        } else if (action === "reject") {
            existing.status = "rejected";
        } else {
            throw createError(400, resMessages.validation.invalidFriendAction);
        }

        await existing.save();
        return existing;

    } catch (error) {
        throw createError(500, error.message);
    }
};


exports.getAllpendingReqService = async (userId) => {
    try {
        if (!userId) {
            throw createError(400, resMessages.notFound.userNotFound);
        }
        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, resMessages.notFound.userNotFound);
        }

        const pendingReq = await Friend.find({
            recipient: userId,
            status: "pending"
        }).populate("requester", "name email avatarUrl currentCountry")

        if (!pendingReq || pendingReq.length === 0) {
            throw createError(404, resMessages.customError.noPendingReq);
        }
        return pendingReq;
    }
    catch (error) {
        throw createError(500, error.message);
    }
};


exports.getAllFriendService = async (userId, page = 1, limit = 10) => {
    try {
        if (!userId) {
            throw createError(400, resMessages.notFound.userNotFound);
        }

        const skip = (page - 1) * limit;
        const total = await Friend.countDocuments({
            status: "accepted",
            $or: [{ requester: userId }, { recipient: userId }]
        });
        const allFriends = await getAllFriends(userId)
        if (!allFriends || allFriends.length === 0) {
            throw createError(404, resMessages.customError.noFriends);
        }

        return {
            allFriends,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                limit: parseInt(limit),
            },
        };

    } catch (error) {
        throw createError(500, error.message);
    }
};

exports.getAllMutualservice = async (loginUserId, otherUserId, page, limit) => {
    try {
        const skip = (page - 1) * limit;
        if (!loginUserId || !otherUserId) {
            throw createError(400, resMessages.notFound.userOrFriendIdNotFound);
        }

        const user = await isUserExist(loginUserId);
        const recipient = await isUserExist(otherUserId);
        if (!user || !recipient) {
            throw createError(400, resMessages.notFound.userNotFound);
        }
        let mutualFriends = []
        let total = 0
        if (user._id != recipient._id) {
            const loginUserFriend = await getAllFriends(user._id);
            const profileUserFriend = await getAllFriends(recipient._id);

            const loginFriendIds = loginUserFriend.map(f => f._id.toString());
            const profileFriendIds = profileUserFriend.map(f => f._id.toString());

            const mutualFriendIds = loginFriendIds.filter(id =>
                profileFriendIds.includes(id)
            );

            total = mutualFriendIds.length;

            mutualFriends = await User.find({ _id: { $in: mutualFriendIds } })
                .select("name email avatarUrl currentCountry")
                .skip(skip)
                .limit(limit);
        }

        return {
            mutualFriends,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                limit: parseInt(limit),
            },
        }
    }
    catch (error) {
        throw createError(500, error.message);
    }
}

exports.getSuggestionFriendsService = async (userId, page = 1, limit = 20) => {
    try {
        if (!userId) {
            throw createError(400, resMessages.notFound.userNotFound);
        }

        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, resMessages.notFound.userNotFound);
        }

        const allFriends = await getAllFriends(user._id);
        const allFriendIds = allFriends.map(f =>
            f.requester.toString() === user._id.toString()
                ? f.recipient.toString()
                : f.requester.toString()
        );

        let allFriendsOfFriends = [];
        await Promise.all(
            allFriendIds.map(async (fid) => {
                const fof = await getAllFriends(fid);
                const fofIds = fof.map(f =>
                    f.requester.toString() === fid.toString()
                        ? f.recipient.toString()
                        : f.requester.toString()
                );
                allFriendsOfFriends.push(...fofIds);
            })
        );

        const fofCountMap = allFriendsOfFriends.reduce((acc, id) => {
            acc[id] = (acc[id] || 0) + 1;
            return acc;
        }, {});

        const sameLocationUsers = await User.find({
            "currentCountry.code": user.currentCountry?.code,
            _id: { $ne: user._id }
        });

        const communityMemberships = await CommunityMember.find({ userId: user._id });
        const communityIds = communityMemberships.map(c => c.communityId);
        const matchedCommunityUsers = await CommunityMember.find({
            communityId: { $in: communityIds },
            userId: { $ne: user._id }
        }).populate("userId");

        const communityUserIds = matchedCommunityUsers.map(c => c.userId._id.toString());

        let suggestionIds = new Set([
            ...Object.keys(fofCountMap),
            ...sameLocationUsers.map(u => u._id.toString()),
            ...communityUserIds
        ]);
        allFriendIds.push(user._id.toString());
        suggestionIds = [...suggestionIds].filter(id => !allFriendIds.includes(id));
        suggestionIds = suggestionIds.sort(() => 0.5 - Math.random()).slice(0, 100);

        const total = suggestionIds.length;
        const totalPages = Math.ceil(total / limit);
        const skip = (page - 1) * limit;
        const paginatedSuggestions = suggestionIds.slice(skip, skip + limit);

        const suggestions = await User.find({ _id: { $in: paginatedSuggestions } });

        // attach mutual friends count if needed
        const finalSuggestions = suggestions.map(u => ({
            ...u.toObject(),
            mutualFriendsCount: fofCountMap[u._id.toString()] || 0
        }));


        return {
            suggestions: finalSuggestions,
            pagination: {
                total,
                totalPages,
                currentPage: parseInt(page),
                limit: parseInt(limit),
            }
        };

    } catch (error) {
        throw createError(500, error.message);
    }
};




