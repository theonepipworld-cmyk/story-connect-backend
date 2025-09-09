
const mongoose = require("mongoose");
const { isPostExist, createError, postAggregationPipeline, isUserExist, isCommunityExist, getAllFriends } = require("../../helpers/dbHelpers.js")
const resMessages = require("../../constants/resMessages.constants.js");
const Friend = require("../../models/friends.model.js");
const User = require("../../models/user.model.js")
const CommunityMember = require("../../models/communityMember.model.js")
const enums = require("../../constants/enum.constants.js")
const Block = require("../../models/block.model");


exports.sendFriendReqService = async (userId, friendReqId) => {
    try {
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
        const isBlocked = await Block.findOne({
            $or: [
                { blocker: userId, blocked: friendReqId },
                { blocker: friendReqId, blocked: userId }
            ]
        });
        if (isBlocked) {
            throw createError(403, resMessages.validation.userBlocked);
        }
        let isRequested = false
        const existing = await Friend.findOne({
            $or: [
                { requester: userId, recipient: friendReqId },
                { requester: friendReqId, recipient: userId }
            ]
        });

        if (existing) {
            if (existing.status === enums.friend_Request_status.PENDING) {
                isRequested = true;
                throw createError(400, resMessages.customError.friendReqSent);
            }
            if (existing.status === enums.friend_Request_status.ACCEPTED) {
                throw createError(400, resMessages.customError.alreadyFriend);
            }
            if (existing.status === enums.friend_Request_status.REJECTED) {
                existing.status = enums.friend_Request_status.PENDING
                await existing.save();
                return existing;
            }
        }

        const result = await Friend.create({
            requester: userId,
            recipient: friendReqId,
            status: enums.friend_Request_status.PENDING
        });

        if (result) {
            isRequested = true;
        }
        return {
            result,
            isRequested
        };
    } catch (error) {
        throw createError(500, error.message);
    }
};


exports.respondFriendReqService = async (userId, friendReqId, action) => {
    try {
        if (!userId || !friendReqId) {
            throw createError(400, resMessages.notFound.userOrFriendIdNotFound);
        }
        console.log(userId, friendReqId)
        const user = await isUserExist(userId);
        const requester = await isUserExist(friendReqId);

        if (!requester) {
            throw createError(400, resMessages.notFound.userNotFound);
        }
        const existing = await Friend.findOne({
            requester: friendReqId,
            recipient: user._id
        });


        if (!existing) {
            throw createError(404, resMessages.notFound.userOrFriendIdNotFound);
        }
        const isBlocked = await Block.findOne({
            $or: [
                { blocker: userId, blocked: friendReqId },
                { blocker: friendReqId, blocked: userId }
            ]
        });
        if (isBlocked) {
            throw createError(403, resMessages.validation.userBlocked);
        }

        if (existing.status === enums.friend_Request_status.ACCEPTED) {
            throw createError(400, resMessages.customError.alreadyFriend);
        }

        if (existing.status === enums.friend_Request_status.REJECTED) {
            throw createError(400, resMessages.customError.alreadyRejected);
        }

        if (action === enums.friend_Request_status.ACCEPTED) {
            existing.status = enums.friend_Request_status.ACCEPTED;
        } else if (action === enums.friend_Request_status.REJECTED) {
            existing.status = enums.friend_Request_status.REJECTED;
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
            status: enums.friend_Request_status.PENDING
        }).populate({
            path: "requester",
            select: "name email avatarUrl currentCountry",
            match: {
                _id: { $nin: await Block.distinct("blocked", { blocker: userId }) }
            }
        });
        if (!pendingReq || pendingReq.length === 0) {
            throw createError(404, resMessages.customError.noPendingReq);
        }
        return pendingReq;
    }
    catch (error) {
        throw createError(500, error.message);
    }
};


exports.getAllFriendService = async (userId, page = 1, limit = 10, loginUserId) => {
    try {
        if (!userId || !loginUserId) {
            throw createError(400, resMessages.notFound.userNotFound);
        }

        const loginUser = await isUserExist(loginUserId)
        if (!loginUser) {
            throw createError(400, resMessages.notFound.userNotFound);
        }

        const skip = (page - 1) * limit;
        const total = await Friend.countDocuments({
            status: enums.friend_Request_status.ACCEPTED,
            $or: [{ requester: userId }, { recipient: userId }]
        });
        const allUserFriends = await getAllFriends(userId);
        if (!allUserFriends || allUserFriends.length === 0) {
            throw createError(404, resMessages.customError.noFriends);
        }

        const alLoginUserFriends = await getAllFriends(loginUserId)
        const LoginUserSendingRequest = await Friend.find({
            requester: loginUserId,
            status: enums.friend_Request_status.PENDING
        });

        const loginUserSenderIds = new Set(LoginUserSendingRequest.map((f)=>f.recipient.toString()));
        const allLoginUserFriendsId = new Set(alLoginUserFriends.map((f) => f._id.toString()));

        const blockedUsers = await Block.find({
            $or: [{ blocker: loginUser._id }, { blocked: loginUser._id }]
        });
        const blockedIds = blockedUsers.map(b =>
            b.blocker.toString() === userId.toString() ? b.blocked.toString() : b.blocker.toString()
        );
        const filteredFriends = allUserFriends
            .filter((f) => !blockedIds.includes(f._id.toString()))
            .map((f) => ({
                ...f.toObject(),
                isThisUserFriend: allLoginUserFriendsId.has(f._id.toString()),
                isPendingReq:loginUserSenderIds.has(f._id.toString())
            }));

        return {
            allFriends: filteredFriends,
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

        if (loginUserId.toString() === otherUserId.toString()) {
            throw createError(400, resMessages.notFound.noMutualFriend);
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
            const profileFriendIds = new Set(profileUserFriend.map(f => f._id.toString()));


            const mutualFriendIds = loginFriendIds.filter(id =>
                profileFriendIds.has(id)
            );

            total = mutualFriendIds.length;
            mutualFriends = await User.find({ _id: { $in: mutualFriendIds } })
                .select("name email avatarUrl currentCountry bio")
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
        const allFriendIds = allFriends.map(f => f._id.toString());

        const blockedUsers = await Block.find({
            $or: [{ blocker: userId }, { blocked: userId }]
        });
        const blockedIds = blockedUsers.map(b =>
            b.blocker.toString() === userId.toString() ? b.blocked.toString() : b.blocker.toString()
        );

        let allFriendsOfFriends = [];
        await Promise.all(
            allFriendIds.map(async (fid) => {
                const fof = await getAllFriends(fid);
                const fofIds = fof.map(f => f._id.toString());
                allFriendsOfFriends.push(...fofIds);
            })
        );

        const fofCountMap = allFriendsOfFriends.reduce((acc, id) => {
            if (!blockedIds.includes(id)) {
                acc[id] = (acc[id] || 0) + 1;
            }
            return acc;
        }, {});

        const sameLocationUsers = await User.find({
            "currentCountry.code": user.currentCountry?.code,
            _id: { $ne: user._id, $nin: blockedIds }
        });

        const communityMemberships = await CommunityMember.find({ userId: user._id });
        const communityIds = communityMemberships.map(c => c.communityId);
        const matchedCommunityUsers = await CommunityMember.find({
            communityId: { $in: communityIds },
            userId: { $ne: user._id, $nin: blockedIds }
        }).populate("userId");

        const communityUserIds = matchedCommunityUsers.map(c => c.userId._id.toString());

        let suggestionIds = new Set([
            ...Object.keys(fofCountMap),
            ...sameLocationUsers.map(u => u._id.toString()),
            ...communityUserIds
        ]);

        allFriendIds.push(user._id.toString());
        suggestionIds = [...suggestionIds].filter(
            id => !allFriendIds.includes(id) && !blockedIds.includes(id)
        );


        suggestionIds = suggestionIds.sort(() => 0.5 - Math.random()).slice(0, 100);

        const total = suggestionIds.length;
        const totalPages = Math.ceil(total / limit);
        const skip = (page - 1) * limit;
        const paginatedSuggestions = suggestionIds.slice(skip, skip + limit);

        // final user fetch
        const suggestions = await User.find({
            _id: { $in: paginatedSuggestions }
        }).select("name email avatarUrl currentCountry bio");

        // attach mutual friend count
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

exports.unfriendReqService = async (loginUserId, unfriendUserId) => {
    try {
        if (!loginUserId) {
            throw createError(400, resMessages.notFound.userNotFound);
        }
        const user = await isUserExist(loginUserId);
        if (!user) {
            throw createError(400, resMessages.notFound.userNotFound);
        }
        const result = await Friend.deleteOne({
            status: enums.friend_Request_status.ACCEPTED,
            $or: [
                { requester: loginUserId, recipient: unfriendUserId },
                { requester: unfriendUserId, recipient: loginUserId }
            ]
        })
        if (result.deletedCount === 0) {
            throw createError(404, resMessages.customError.noFriends);
        }
        return result;
    }
    catch (error) {
        throw createError(500, error.message);
    }
}




