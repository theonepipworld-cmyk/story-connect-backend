const mongoose = require("mongoose");
const {
    isPostExist,
    createError,
    postAggregationPipeline,
    isUserExist,
    isCommunityExist,
    getAllFriends
} = require("../../helpers/dbHelpers.js");
const resMessages = require("../../constants/resMessages.constants.js");
const Friend = require("../../models/friends.model.js");
const User = require("../../models/user.model.js");
const CommunityMember = require("../../models/communityMember.model.js");
const enums = require("../../constants/enum.constants.js");
const Block = require("../../models/block.model");
const { getIo, getAllUserSocketIds } = require("../../socket");
const Notification = require("../../models/notification.model.js");
const pushNotification = require("../../utils/pushNotification.js");
const { getMessage } = require("../../constants/locales/index.js");



const clearDeviceToken = async (userId) => {
    try {
        await User.updateOne({ _id: userId }, { $set: { device_token: null } });
        console.log(`Cleared invalid device token for user ${userId}`);
    } catch (err) {
        console.error(`Failed to clear device token for user ${userId}:`, err.message);
    }
};

const sendPush = async (user, title, type, data) => {
    if (!user?.device_token) return;
    try {
        await pushNotification.androidPushNotification(user.device_token, title, type, data);
    } catch (error) {
        console.error(`Failed to send push to user ${user._id}:`, error.message);
        if (
            error.code === "messaging/invalid-argument" ||
            error.code === "messaging/registration-token-not-registered"
        ) {
            await clearDeviceToken(user._id);
        }
    }
};


const emitToUser = (userId, event, payload) => {
    try {
        const io = getIo();
        const socketIds = getAllUserSocketIds(userId.toString());
        socketIds.forEach((sid) => io.to(sid).emit(event, payload));
    } catch (err) {
        console.error(`Socket emit failed [${event}]:`, err?.message || err);
    }
};

const emitNotificationUnread = async (userId) => {
    try {
        const count = await Notification.countDocuments({ user: userId, isRead: false });
        emitToUser(userId, "badgeCountUpdate", { notificationUnread: count });
    } catch (err) {
        // silent
    }
};



exports.sendFriendReqService = async (userId, friendReqId, lang = 'en') => {
    try {
        if (!userId || !friendReqId) {
            throw createError(404, "userOrFriendIdNotFound", "notFound");
        }

        if (userId.toString() === friendReqId.toString()) {
            throw createError(400, "notSendReqYourself", "customError");
        }

        const [user, recipient] = await Promise.all([
            isUserExist(userId),
            isUserExist(friendReqId)
        ]);

        if (!user) throw createError(404, "userNotFound", "notFound");
        if (!recipient) throw createError(404, "ReqUser", "notFound");

        const isBlocked = await Block.findOne({
            $or: [
                { blocker: friendReqId, blocked: userId },
                { blocker: userId, blocked: friendReqId }
            ]
        });

        if (isBlocked) {
            const blockedByThem = isBlocked.blocker.toString() === friendReqId.toString();
            throw createError(403, blockedByThem ? 'You have been blocked by this user' : 'You have blocked this user', 'validation');
        }

        const existingFriend = await Friend.findOne({
            $or: [
                { requester: userId, recipient: friendReqId },
                { requester: friendReqId, recipient: userId }
            ]
        });

        if (existingFriend) {
            if (existingFriend.status === enums.friend_Request_status.PENDING) {
                throw createError(400, "friendReqSent", "customError");
            }

            if (existingFriend.status === enums.friend_Request_status.ACCEPTED) {
                throw createError(400, "alreadyFriend", "customError");
            }

            if (existingFriend.status === enums.friend_Request_status.REJECTED) {
                existingFriend.requester = userId;
                existingFriend.recipient = friendReqId;
                existingFriend.status = enums.friend_Request_status.PENDING;
                await existingFriend.save();

                const notifMessage = getMessage(lang, 'notifications', 'sendFriendReq');

                emitToUser(friendReqId.toString(), "friend_request_received", {
                    from: userId,
                    to: friendReqId,
                    sender: {
                        _id: user._id,
                        username: user.username,
                        avatarUrl: user.avatarUrl || null,
                    },
                    message: notifMessage,
                    data: existingFriend
                });

                await Promise.all([
                    Notification.create({
                        user: friendReqId,
                        sender: userId,
                        type: enums.notification_Types.FRIEND_REQUEST,
                        message: `${user.username} ${notifMessage}`,
                        postId: null
                    }),
                    sendPush(
                        recipient,
                        `${user.username} ${notifMessage}`,
                        "friend_request",
                        { senderId: userId.toString(), type: "friend_request" }
                    )
                ]);

                // Update notification unread count for recipient immediately.
                await emitNotificationUnread(friendReqId);

                return { result: existingFriend, isRequested: true };
            }
        }

        const newFriendDoc = await Friend.create({
            requester: userId,
            recipient: friendReqId,
            status: enums.friend_Request_status.PENDING
        });

        if (!newFriendDoc) throw createError(500, "serverError", "error");


        const notifMessage = getMessage(lang, 'notifications', 'sendFriendReq');

        emitToUser(friendReqId.toString(), "friend_request_received", {
            from: userId,
            to: friendReqId,
            sender: {
                _id: user._id,
                username: user.username,
                avatarUrl: user.avatarUrl || null,
            },
            message: notifMessage,
            data: newFriendDoc
        });

        await Promise.all([
            Notification.create({
                user: friendReqId,
                sender: userId,
                type: enums.notification_Types.FRIEND_REQUEST,
                message: `${user.username} ${notifMessage}`,
                postId: null
            }),
            sendPush(
                recipient,
                `${user.username} ${notifMessage}`,
                "friend_request",
                { senderId: userId.toString(), type: "friend_request" }
            )
        ]);

        // Update notification unread count for recipient immediately.
        await emitNotificationUnread(friendReqId);

        return { result: newFriendDoc, isRequested: true };

    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, "serverError", "error");
    }
};

exports.respondFriendReqService = async (userId, friendReqId, action, lang = 'en') => {
    try {
        if (!userId || !friendReqId) {
            throw createError(404, "userOrFriendIdNotFound", "notFound");
        }

        if (userId.toString() === friendReqId.toString()) {
            throw createError(400, "idIsSame", "validation");
        }

        const [user, requester] = await Promise.all([
            isUserExist(userId),
            isUserExist(friendReqId)
        ]);

        if (!user) throw createError(404, "userNotFound", "notFound");
        if (!requester) throw createError(404, "userNotFound", "notFound");

        const [existing, isBlocked] = await Promise.all([
            Friend.findOne({
                requester: new mongoose.Types.ObjectId(friendReqId),
                recipient: user._id
            }),
            Block.findOne({
                $or: [
                    { blocker: userId, blocked: friendReqId },
                    { blocker: friendReqId, blocked: userId }
                ]
            })
        ]);

        if (!existing) throw createError(404, "noFriendFound", "notFound");
        if (isBlocked) {
            const blockedByThem = isBlocked.blocker.toString() === friendReqId.toString();
            throw createError(403, blockedByThem ? "youHaveBeenBlocked" : "youHaveBlockedThisUser", "validation");
        }

        if (existing.status === enums.friend_Request_status.ACCEPTED) {
            throw createError(400, "alreadyFriend", "customError");
        }
        if (existing.status === enums.friend_Request_status.REJECTED) {
            throw createError(400, "alreadyRejected", "customError");
        }

        if (action === enums.friend_Request_status.ACCEPTED) {
            existing.status = enums.friend_Request_status.ACCEPTED;
        } else if (action === enums.friend_Request_status.REJECTED) {
            existing.status = enums.friend_Request_status.REJECTED;
        } else {
            throw createError(400, "invalidFriendAction", "validation");
        }

        await existing.save();

        const isAccepted = existing.status === enums.friend_Request_status.ACCEPTED;
        const notifMessage = `${user.username} ${isAccepted
                ? getMessage(lang, 'notifications', 'acceptedFriendReq')
                : getMessage(lang, 'notifications', 'rejectedFriendReq')
            }`;
        const notifType = isAccepted
            ? enums.notification_Types.FRIEND_REQUEST_ACCEPTED
            : enums.notification_Types.FRIEND_REQUEST_REJECTED;

        await Promise.all([
            Notification.findOneAndDelete({
                user: userId,
                sender: friendReqId,
                type: enums.notification_Types.FRIEND_REQUEST
            }),

            Notification.create({
                user: existing.requester,
                sender: userId,
                type: notifType,
                message: notifMessage,
                postId: null
            })
        ]);


        emitToUser(friendReqId.toString(), "friend_request_responded", {
            from: userId,
            to: friendReqId,
            responder: {
                _id: user._id,
                username: user.username,
                avatarUrl: user.avatarUrl || null,
            },
            message: notifMessage,
            status: existing.status,
            data: existing
        });

        emitToUser(userId.toString(), "notification_deleted", {
            type: enums.notification_Types.FRIEND_REQUEST,
            sender: friendReqId
        });

        await sendPush(
            requester,
            notifMessage,
            isAccepted ? "friend_request_accepted" : "friend_request_rejected",
            {
                responderId: userId.toString(),
                type: isAccepted ? "friend_request_accepted" : "friend_request_rejected"
            }
        );

        // Update both users' notification unread counts.
        await emitNotificationUnread(userId);
        await emitNotificationUnread(existing.requester);

        return existing;

    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, "serverError", "error");
    }
};



exports.getAllpendingReqService = async (userId) => {
    try {
        if (!userId) {
            throw createError(404, "userNotFound", "notFound");
        }
        const user = await isUserExist(userId);
        if (!user) {
            throw createError(404, "userNotFound", "notFound");
        }


        const blockedUsers = await Block.find({
            $or: [{ blocker: userId }, { blocked: userId }]
        });

        const blockedIds = blockedUsers.map((b) =>
            b.blocker.toString() === userId.toString()
                ? b.blocked.toString()
                : b.blocker.toString()
        );

        const pendingReq = await Friend.find({
            recipient: userId,
            status: enums.friend_Request_status.PENDING
        }).populate({
            path: "requester",
            select: "username email avatarUrl currentCountry",

            match: {
                _id: { $nin: blockedIds }
            }
        });


        const filtered = pendingReq.filter((r) => r.requester !== null);
        return filtered;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, "serverError", "error");
    }
};



exports.getAllFriendService = async (userId, page = 1, limit = 10, loginUserId) => {
    try {

        page = parseInt(page);
        limit = parseInt(limit);

        if (!userId || !loginUserId) {
            throw createError(404, "userNotFound", "notFound");
        }

        const loginUser = await isUserExist(loginUserId);
        if (!loginUser) {
            throw createError(404, "userNotFound", "notFound");
        }


        const [allUserFriends, allLoginUserFriends, loginUserSendingRequests, blockedUsers] =
            await Promise.all([
                getAllFriends(userId),
                getAllFriends(loginUserId),
                Friend.find({ requester: loginUserId, status: enums.friend_Request_status.PENDING }),
                Block.find({ $or: [{ blocker: loginUser._id }, { blocked: loginUser._id }] })
            ]);

        if (!allUserFriends || allUserFriends.length === 0) {
            return {
                allFriends: [],
                pagination: { total: 0, totalPages: 0, currentPage: page, limit }
            };
        }

        const loginUserSenderIds = new Set(loginUserSendingRequests.map((f) => f.recipient.toString()));
        const allLoginUserFriendsId = new Set(allLoginUserFriends.map((f) => f._id.toString()));

        const blockedIds = new Set(
            blockedUsers
                .map((b) => {
                    if (b.blocker.toString() === loginUserId.toString()) return b.blocked.toString();
                    if (b.blocked.toString() === loginUserId.toString()) return b.blocker.toString();
                    return null;
                })
                .filter(Boolean)
        );

        const filteredFriends = allUserFriends
            .filter((f) => f?._id && !blockedIds.has(f._id.toString()))
            .map((f) => {
                const id = f._id?.toString() ?? null;
                return {
                    ...(typeof f.toObject === "function" ? f.toObject() : f),
                    isThisUserFriend: id ? allLoginUserFriendsId.has(id) : false,
                    isPendingReq: id ? loginUserSenderIds.has(id) : false
                };
            });


        const total = filteredFriends.length;
        const skip = (page - 1) * limit;
        const paginated = filteredFriends.slice(skip, skip + limit);

        return {
            allFriends: paginated,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                limit
            }
        };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, "serverError", "error");
    }
};



exports.getAllMutualservice = async (loginUserId, otherUserId, page, limit) => {
    try {

        page = parseInt(page);
        limit = parseInt(limit);
        const skip = (page - 1) * limit;

        if (!loginUserId || !otherUserId) {
            throw createError(404, "userOrFriendIdNotFound", "notFound");
        }


        if (loginUserId.toString() === otherUserId.toString()) {
            throw createError(400, "sameUser", "validation");
        }

        const [user, recipient] = await Promise.all([
            isUserExist(loginUserId),
            isUserExist(otherUserId)
        ]);

        if (!user || !recipient) {
            throw createError(404, "userNotFound", "notFound");
        }


        const [loginUserFriends, profileUserFriends] = await Promise.all([
            getAllFriends(user._id),
            getAllFriends(recipient._id)
        ]);

        const loginFriendIds = loginUserFriends.map((f) => f._id.toString());
        const profileFriendIds = new Set(profileUserFriends.map((f) => f._id.toString()));

        const mutualFriendIds = loginFriendIds.filter((id) => profileFriendIds.has(id));
        const total = mutualFriendIds.length;

        const mutualFriends = await User.find({ _id: { $in: mutualFriendIds } })
            .select("username email avatarUrl currentCountry bio")
            .skip(skip)
            .limit(limit);

        return {
            mutualFriends,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                limit
            }
        };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, "serverError", "error");
    }
};



exports.getSuggestionFriendsService = async (page = 1, limit = 10, search, userId) => {
    try {

        page = parseInt(page);
        limit = parseInt(limit);

        if (!userId) throw createError(404, "userNotFound", "notFound");

        const user = await isUserExist(userId);
        if (!user) throw createError(404, "userNotFound", "notFound");

        const allFriends = await getAllFriends(user._id);
        const allFriendIds = allFriends.map((f) => f._id.toString());
        allFriendIds.push(user._id.toString());

        const [pendingRequests, blockedUsers] = await Promise.all([
            Friend.find({
                status: enums.friend_Request_status.PENDING,
                $or: [{ requester: user._id }, { recipient: user._id }]
            }),
            Block.find({
                $or: [{ blocker: userId }, { blocked: userId }]
            })
        ]);

        const pendingUserIds = new Set(
            pendingRequests.map((req) =>
                req.requester.toString() === user._id.toString()
                    ? req.recipient.toString()
                    : req.requester.toString()
            )
        );

        const blockedIds = blockedUsers.map((b) =>
            b.blocker.toString() === userId.toString()
                ? b.blocked.toString()
                : b.blocker.toString()
        );

        const excludedIds = new Set([...allFriendIds, ...blockedIds]);


        const [fofRequesterIds, fofRecipientIds] = await Promise.all([
            Friend.find({
                requester: { $in: allFriendIds },
                status: enums.friend_Request_status.ACCEPTED
            }).distinct("recipient"),
            Friend.find({
                recipient: { $in: allFriendIds },
                status: enums.friend_Request_status.ACCEPTED
            }).distinct("requester")
        ]);

        const fofRaw = [...fofRequesterIds, ...fofRecipientIds].map((id) => id.toString());

        const fofCountMap = {};
        for (const id of fofRaw) {
            if (!excludedIds.has(id)) {
                fofCountMap[id] = (fofCountMap[id] || 0) + 1;
            }
        }

        const fofIds = Object.keys(fofCountMap);

        const [sameLocationIds, communityIds] = await Promise.all([
            User.find(
                {
                    "currentCountry.code": user.currentCountry?.code,
                    _id: { $nin: Array.from(excludedIds) }
                },
                "_id"
            ).distinct("_id"),
            CommunityMember.find({ userId: user._id }).distinct("communityId")
        ]);

        const communityUserIds = await CommunityMember.find({
            communityId: { $in: communityIds },
            userId: { $nin: Array.from(excludedIds) }
        }).distinct("userId");

        let suggestionIds = new Set([
            ...fofIds,
            ...sameLocationIds.map((id) => id.toString()),
            ...communityUserIds.map((id) => id.toString())
        ]);


        if (suggestionIds.size < limit) {
            const fullyExcluded = new Set([...excludedIds, ...suggestionIds]);


            const additionalUsers = await User.find({
                _id: { $nin: Array.from(fullyExcluded) },
                ...(search ? { username: { $regex: search, $options: "i" } } : {})
            })
                .limit(limit - suggestionIds.size)
                .select("_id");

            additionalUsers.forEach((u) => suggestionIds.add(u._id.toString()));
        }

        let suggestionIdsArr = Array.from(suggestionIds);

        suggestionIdsArr.sort((a, b) => (fofCountMap[b] || 0) - (fofCountMap[a] || 0));

        const total = suggestionIdsArr.length;
        const totalPages = Math.ceil(total / limit);
        const skip = (page - 1) * limit;
        const paginatedIds = suggestionIdsArr.slice(skip, skip + limit);

        const suggestions = await User.find(
            {
                _id: { $in: paginatedIds },
                ...(search ? { username: { $regex: search, $options: "i" } } : {})
            },
            "username email avatarUrl currentCountry bio profession"
        );

        const finalSuggestions = suggestions.map((u) => ({
            ...u.toObject(),
            isThisUserFriend: allFriendIds.includes(u._id.toString()),
            isreqPending: pendingUserIds.has(u._id.toString()),
            mutualFriendsCount: fofCountMap[u._id.toString()] || 0
        }));

        return {
            suggestions: finalSuggestions,
            pagination: {
                total,
                totalPages,
                currentPage: page,
                limit
            }
        };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, "serverError", "error");
    }
};



exports.unfriendReqService = async (loginUserId, unfriendUserId) => {
    try {
        if (!loginUserId) {
            throw createError(404, "userNotFound", "notFound");
        }

        if (!unfriendUserId) {
            throw createError(404, "userOrFriendIdNotFound", "notFound");
        }

        const user = await isUserExist(loginUserId);
        if (!user) {
            throw createError(404, "userNotFound", "notFound");
        }

        const result = await Friend.deleteOne({
            status: enums.friend_Request_status.ACCEPTED,
            $or: [
                { requester: loginUserId, recipient: unfriendUserId },
                { requester: unfriendUserId, recipient: loginUserId }
            ]
        });

        console.log(result)
        if (result.deletedCount === 0) {
            throw createError(404, "noFriends", "customError");
        }

        return result;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, "serverError", "error");
    }
};



exports.cancelFriendReqService = async (userId, friendId, lang = 'en') => {
    try {
        if (!userId || !friendId) {
            throw createError(404, "userOrFriendIdNotFound", "notFound");
        }

        if (userId.toString() === friendId.toString()) {
            throw createError(400, "notSendReqYourself", "customError");
        }

        const request = await Friend.findOne({
            requester: userId,
            recipient: friendId,
            status: enums.friend_Request_status.PENDING
        });

        if (!request) {
            throw createError(404, "friendReqNotFound", "notFound");
        }

        await Promise.all([
            request.deleteOne(),
            Notification.deleteOne({
                user: friendId,
                sender: userId,
                type: enums.notification_Types.FRIEND_REQUEST
            })
        ]);

        // Notify friend user and update their unread count.
        emitToUser(friendId.toString(), "notification_deleted", {
            type: enums.notification_Types.FRIEND_REQUEST,
            sender: userId
        });
        await emitNotificationUnread(friendId);

        return {
            success: true,
            message: "Friend request cancelled successfully"
        };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, "serverError", "error");
    }
};