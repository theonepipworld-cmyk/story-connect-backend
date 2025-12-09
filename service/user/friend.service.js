
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
const pushNotification = require("../../utils/pushNotification.js")


exports.sendFriendReqService = async (userId, friendReqId) => {
    try {
        if (!userId || !friendReqId) {
            throw createError(400, 'userOrFriendIdNotFound', 'notFound');
        }
        if (userId.toString() === friendReqId.toString()) {
            throw createError(400, 'notSendReqYourself', 'customError');
        }
        const user = await isUserExist(userId);
        const recipient = await isUserExist(friendReqId);
        if (!recipient) {
            throw createError(400, 'ReqUser', 'notFound');
        }
        const isBlocked = await Block.findOne({
            $or: [
                { blocker: userId, blocked: friendReqId },
                { blocker: friendReqId, blocked: userId }
            ]
        });
        if (isBlocked) {
            throw createError(403, 'userBlocked', 'validation');
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
                throw createError(400, 'friendReqSent', 'customError');
            }
            if (existing.status === enums.friend_Request_status.ACCEPTED) {
                throw createError(400, 'alreadyFriend', 'customError');
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
            const io = getIo();
            io.emit("friend_request_received", {
                from: userId,
                to: friendReqId,
                data: result,
            });

            await Notification.create({
                user: friendReqId,
                sender: userId,
                type: enums.notification_Types.FRIEND_REQUEST,
                message: `${user.username} ${resMessages.notifications.sendFriendReq}`,
                postId: null
            });


            if (recipient.device_token) {
                try {
                    await pushNotification.androidPushNotification(
                        recipient.device_token,
                        `${user.username} ${resMessages.notifications.sendFriendReq}`,
                        "friend_request",
                        { senderId: userId.toString(), type: "friend_request" }
                    );
                } catch (error) {
                    console.error(`Failed to send friend request push to user ${recipient._id}:`, error.message);
                    if (error.code === 'messaging/invalid-argument' ||
                        error.code === 'messaging/registration-token-not-registered') {
                        await User.update(
                            { device_token: null },
                            { where: { id: recipient._id } }
                        );
                        console.log(`Cleared invalid device token for user ${recipient._id}`);
                    }
                }
            }

        }
        return {
            result,
            isRequested
        };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};


exports.respondFriendReqService = async (userId, friendReqId, action) => {
    try {
        if (!userId || !friendReqId) {
            throw createError(400, 'userOrFriendIdNotFound', 'notFound');
        }
        if (userId === friendReqId) {
            throw createError(400, 'idIsSame', 'validation');
        }
        const user = await isUserExist(userId);
        const requester = await isUserExist(friendReqId);

        if (!requester) {
            throw createError(400, 'userNotFound', 'notFound');

        }
        const existing = await Friend.findOne({
            requester: new mongoose.Types.ObjectId(friendReqId),
            recipient: user._id
        });
        console.log(existing)


        if (!existing) {
            throw createError(404, 'noFriendFound', 'notFound');
        }
        const isBlocked = await Block.findOne({
            $or: [
                { blocker: userId, blocked: friendReqId },
                { blocker: friendReqId, blocked: userId }
            ]
        });
        if (isBlocked) {
            throw createError(403, 'userBlocked', 'validation');
        }

        if (existing.status === enums.friend_Request_status.ACCEPTED) {
            throw createError(400, 'alreadyFriend', 'customError');
        }

        if (existing.status === enums.friend_Request_status.REJECTED) {
            throw createError(400, 'alreadyRejected', 'customError');
        }

        if (action === enums.friend_Request_status.ACCEPTED) {
            existing.status = enums.friend_Request_status.ACCEPTED;
        } else if (action === enums.friend_Request_status.REJECTED) {
            existing.status = enums.friend_Request_status.REJECTED;
        } else {
            throw createError(400, 'invalidFriendAction', 'validation');
        }



        await existing.save();
        const io = getIo();
        io.emit("friend_request_responded", {
            from: userId,
            to: friendReqId,
            data: existing,
        });

        await Notification.create({
            user: existing.requester,
            sender: userId,
            type: existing.status === enums.friend_Request_status.ACCEPTED
                ? enums.notification_Types.FRIEND_REQUEST_ACCEPTED
                : enums.notification_Types.FRIEND_REQUEST,
            message: existing.status === enums.friend_Request_status.ACCEPTED
                ? `${user.username} ${resMessages.notifications.acceptedFriendReq}`
                : `${user.username} ${resMessages.notifications.rejectedFriendReq}`,
            postId: null
        });
        return existing;

    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};


exports.getAllpendingReqService = async (userId) => {
    try {
        if (!userId) {
            throw createError(400, 'userNotFound', 'notFound');
        }
        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, 'userNotFound', 'notFound');
        }

        const pendingReq = await Friend.find({
            recipient: userId,
            status: enums.friend_Request_status.PENDING
        }).populate({
            path: "requester",
            select: "username email avatarUrl currentCountry",
            match: {
                _id: { $nin: await Block.distinct("blocked", { blocker: userId }) }
            }
        });
        if (!pendingReq || pendingReq.length === 0) {
            throw createError(404, 'noPendingReq', 'customError');
        }
        return pendingReq;
    }
    catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};


exports.getAllFriendService = async (userId, page = 1, limit = 10, loginUserId) => {
    try {
        if (!userId || !loginUserId) {
            throw createError(400, 'userNotFound', 'notFound');
        }

        console.log("loginUserId:", loginUserId);
        console.log("userId:", userId);

        const loginUser = await isUserExist(loginUserId)
        if (!loginUser) {
            throw createError(400, 'userNotFound', 'notFound');
        }

        const skip = (page - 1) * limit;
        const total = await Friend.countDocuments({
            status: enums.friend_Request_status.ACCEPTED,
            $or: [{ requester: userId }, { recipient: userId }]
        });
        const allUserFriends = await getAllFriends(userId);
        if (!allUserFriends || allUserFriends.length === 0) {
            throw createError(404, 'noFriends', 'customError');;
        }

        const alLoginUserFriends = await getAllFriends(loginUserId)
        const LoginUserSendingRequest = await Friend.find({
            requester: loginUserId,
            status: enums.friend_Request_status.PENDING
        });

        const loginUserSenderIds = new Set(LoginUserSendingRequest.map((f) => f.recipient.toString()));
        const allLoginUserFriendsId = new Set(alLoginUserFriends.map((f) => f._id.toString()));

        const blockedUsers = await Block.find({
            $or: [{ blocker: loginUser._id }, { blocked: loginUser._id }]
        });

        const blockedIds = blockedUsers.map(b => {
            if (b.blocker.toString() === loginUserId.toString()) {
                return b.blocked.toString();
            }
            if (b.blocked.toString() === loginUserId.toString()) {
                return b.blocker.toString();
            }
            return null;
        }).filter(Boolean);


        const filteredFriends = allUserFriends
            .filter((f) => {
                if (!f || !f._id) return false;
                const id = f._id.toString();
                return !blockedIds.includes(id);
            })
            .map((f) => {
                const id = f._id?.toString() ?? null;
                return {
                    ...(typeof f.toObject === "function" ? f.toObject() : f),
                    isThisUserFriend: id ? allLoginUserFriendsId.has(id) : false,
                    isPendingReq: id ? loginUserSenderIds.has(id) : false
                };
            });

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
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};


exports.getAllMutualservice = async (loginUserId, otherUserId, page, limit) => {
    try {
        const skip = (page - 1) * limit;
        if (!loginUserId || !otherUserId) {
            throw createError(400, 'userOrFriendIdNotFound', 'notFound');
        }

        if (loginUserId.toString() === otherUserId.toString()) {
            throw createError(400, 'noMutualFriend', 'notFound');
        }

        const user = await isUserExist(loginUserId);
        const recipient = await isUserExist(otherUserId);
        if (!user || !recipient) {
            throw createError(400, 'userNotFound', 'notFound');
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
                .select("username email avatarUrl currentCountry bio")
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
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
}

exports.getSuggestionFriendsService = async (page = 1, limit = 10, search, userId) => {
    try {
        if (!userId) throw createError(400, 'userNotFound', 'notFound');

        const user = await isUserExist(userId);
        if (!user) throw createError(400, 'userNotFound', 'notFound');


        const allFriends = await getAllFriends(user._id);
        const allFriendIds = allFriends.map(f => f._id.toString());
        allFriendIds.push(user._id.toString());


        const pendingRequests = await Friend.find({
            status: enums.friend_Request_status.PENDING,
            $or: [{ requester: user._id }, { recipient: user._id }]
        });
        const pendingUserIds = new Set(
            pendingRequests.map(req =>
                req.requester.toString() === user._id.toString() ? req.recipient.toString() : req.requester.toString()
            )
        );


        const blockedUsers = await Block.find({ $or: [{ blocker: userId }, { blocked: userId }] });
        const blockedIds = blockedUsers.map(b =>
            b.blocker.toString() === userId.toString() ? b.blocked.toString() : b.blocker.toString()
        );


        const fof = await Friend.find({
            $or: [
                { requester: { $in: allFriendIds }, status: enums.friend_Request_status.ACCEPTED },
                { recipient: { $in: allFriendIds }, status: enums.friend_Request_status.ACCEPTED }
            ]
        }).distinct("requester recipient");
        const fofIds = fof.map(id => id.toString()).filter(id => !allFriendIds.includes(id) && !blockedIds.includes(id));

        const fofCountMap = fofIds.reduce((acc, id) => {
            acc[id] = (acc[id] || 0) + 1;
            return acc;
        }, {});


        const sameLocationIds = await User.find(
            { "currentCountry.code": user.currentCountry?.code, _id: { $nin: [...allFriendIds, ...blockedIds] } },
            "_id"
        ).distinct("_id");


        const communityIds = await CommunityMember.find({ userId: user._id }).distinct("communityId");
        const communityUserIds = await CommunityMember.find({
            communityId: { $in: communityIds },
            userId: { $nin: [...allFriendIds, ...blockedIds] }
        }).distinct("userId");


        let suggestionIds = new Set([
            ...fofIds,
            ...sameLocationIds.map(id => id.toString()),
            ...communityUserIds.map(id => id.toString())
        ]);


        if (suggestionIds.size < limit) {
            const excludedIds = new Set([...allFriendIds, ...blockedIds, ...suggestionIds]);
            const additionalUsers = await User.find({
                _id: { $nin: Array.from(excludedIds) },
                ...(search ? { username: { $regex: search, $options: "i" } } : {})
            })
                .limit(limit - suggestionIds.size)
                .select("_id");

            additionalUsers.forEach(u => suggestionIds.add(u._id.toString()));
        }


        suggestionIds = Array.from(suggestionIds);


        for (let i = suggestionIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [suggestionIds[i], suggestionIds[j]] = [suggestionIds[j], suggestionIds[i]];
        }


        const total = suggestionIds.length;
        const totalPages = Math.ceil(total / limit);
        const skip = (page - 1) * limit;
        const paginatedSuggestions = suggestionIds.slice(skip, skip + limit);


        const suggestions = await User.find(
            { _id: { $in: paginatedSuggestions } },
            "username email avatarUrl currentCountry bio profession"
        );


        const finalSuggestions = suggestions.map(u => ({
            ...u.toObject(),
            isThisUserFriend: allFriendIds.includes(u._id.toString()),
            isreqPending: pendingUserIds.has(u._id.toString()),
            mutualFriendsCount: fofCountMap[u._id.toString()] || 0
        }));

        return {
            suggestions: finalSuggestions,
            pagination: { total, totalPages, currentPage: parseInt(page), limit: parseInt(limit) }
        };

    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};



exports.unfriendReqService = async (loginUserId, unfriendUserId) => {
    try {
        if (!loginUserId) {
            throw createError(400, 'userNotFound', 'notFound');
        }
        const user = await isUserExist(loginUserId);
        if (!user) {
            throw createError(400, 'userNotFound', 'notFound');
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
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
}




