const User = require('../../models/user.model');
const { uploadFileToS3 } = require('../../utils/s3.util');
const { DEFAULT_AVATAR_URL } = require('../../constants/variables.constants');
const resMessages = require('../../constants/resMessages.constants');
const { checkFieldExists, getAllFriends, createError, isUserExist } = require("../../helpers/dbHelpers.js");
const CountryList = require("../../models/countryList.model.js");
const professionalSymbol = require("../../models/professionalSymbolModel.js");
const Friend = require("../../models/friends.model.js");
const Block = require("../../models/block.model.js");
const enums = require("../../constants/enum.constants.js");
const Conversation = require("../../models/conversations.model.js");

exports.getProfile = async (userId) => {
    try {
        const user = await User.findById(userId)
            .select("-passwordHash -resetPasswordExpires -resetPasswordToken")
            .lean();

        if (!user) throw createError(404, 'userNotFound', 'notFound');

        const totalFriends = await Friend.countDocuments({
            status: "accepted",
            $or: [{ requester: userId }, { recipient: userId }]
        });

        return { user, totalFriends };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};

exports.updateProfile = async (userId, payload, files) => {
    try {
        const patch = {};

        if (payload.username) patch.username = payload.username;
        if (payload.bio) patch.bio = payload.bio;
        if (payload.profession) patch.profession = payload.profession;
        if (payload.education) patch.education = payload.education;
        if (payload.relationship) patch.relationship = payload.relationship;
        if (payload.entryYear) patch.entryYear = payload.entryYear;
        if (payload.phone) patch.phone = payload.phone;
        if (payload.status) patch.status = payload.status;
        if (payload.relationshipDescription) patch.relationshipDescription = payload.relationshipDescription;
        if (payload.email) patch.email = payload.email;

        if (payload.profession && payload.profession.toLowerCase() === 'other') {
            if (!payload.manualProfession) throw createError(400, 'professionName', 'validation');
            patch.manualProfession = payload.manualProfession.trim();
        } else {
            patch.manualProfession = null;
        }

        if (payload.countryOfOrigin) {
            const countryOrigin = await CountryList.findById(payload.countryOfOrigin).lean();
            if (countryOrigin) {
                patch.countryOfOrigin = {
                    _id: countryOrigin._id,
                    code: countryOrigin.code,
                    name: countryOrigin.name
                };
            }
        }

        if (payload.currentCountry) {
            const currentCountry = await CountryList.findById(payload.currentCountry).lean();
            if (currentCountry) {
                patch.currentCountry = {
                    _id: currentCountry._id,
                    code: currentCountry.code,
                    name: currentCountry.name
                };
            }
        }

        if (payload.professionSymbol) {
            const symbol = await professionalSymbol.findById(payload.professionSymbol);
            if (symbol) {
                patch.professionSymbol = {
                    _id: symbol._id,
                    name: symbol.name,
                    iconUrl: symbol.iconUrl
                };
            }
        }

        if (payload.dateOfBirth) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(payload.dateOfBirth)) {
                throw createError(400, 'invalidDateOfBirthFormat', 'validation');
            }
            patch.dateOfBirth = payload.dateOfBirth;
        }

        const [emailExist, usernameExist] = await Promise.all([
            payload.email ? checkFieldExists('email', payload.email, userId) : Promise.resolve(false),
            payload.username ? checkFieldExists('username', payload.username, userId) : Promise.resolve(false)
        ]);

        if (emailExist) throw createError(400, 'emailAlreadyExist', 'validation');
        if (usernameExist) throw createError(400, 'usernameAlreadyExist', 'validation');

        if (files?.avatar?.[0]) {
            try {
                const s3Res = await uploadFileToS3(files.avatar[0], "profile");
                patch.avatarUrl = s3Res?.Location || DEFAULT_AVATAR_URL;
            } catch {
                patch.avatarUrl = DEFAULT_AVATAR_URL;
            }
        }

        if (files?.profileCoverImage?.[0]) {
            try {
                const s3Res = await uploadFileToS3(files.profileCoverImage[0], "profileCoverImage");
                patch.profileCoverImage = s3Res?.Location || DEFAULT_AVATAR_URL;
            } catch {
                patch.profileCoverImage = DEFAULT_AVATAR_URL;
            }
        }

        const updated = await User.findByIdAndUpdate(
            userId,
            { $set: patch },
            { new: true, runValidators: true }
        ).lean();

        if (!updated) throw createError(404, 'userNotFound', 'notFound');

        return { message: resMessages.success.updateSuccessful };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};

exports.deleteProfile = async (userId) => {
    try {
        const deleted = await User.findByIdAndUpdate(
            userId,
            { $set: { status: 'deleted' } },
            { new: true, select: 'status' }
        );
        if (!deleted) throw createError(404, 'userNotFound', 'notFound');
        return { message: resMessages.success.deleteSuccessful };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};

exports.getOtherProfileService = async (otherUserId, loginUserId) => {
    try {
        if (!otherUserId || !loginUserId) {
            throw createError(400, 'userNotFound', 'notFound');
        }

        const user = await User.findById(otherUserId)
            .select("-passwordHash -resetPasswordExpires -resetPasswordToken")
            .lean();
        if (!user) throw createError(404, 'userNotFound', 'notFound');

        let mutualFriendsCount = 0;
        if (loginUserId.toString() !== user._id.toString()) {
            const [loginUserFriend, profileUserFriend] = await Promise.all([
                getAllFriends(loginUserId),
                getAllFriends(user._id)
            ]);
            const loginFriendIds = new Set(loginUserFriend.map(f => f._id.toString()));
            mutualFriendsCount = profileUserFriend.filter(f =>
                loginFriendIds.has(f._id.toString())
            ).length;
        }

        const [totalFriends, friendship, conversation] = await Promise.all([
            Friend.countDocuments({
                status: enums.friend_Request_status.ACCEPTED,
                $or: [{ requester: otherUserId }, { recipient: otherUserId }]
            }),
            Friend.findOne({
                $or: [
                    { requester: loginUserId, recipient: otherUserId },
                    { requester: otherUserId, recipient: loginUserId }
                ]
            }),
            Conversation.findOne({
                participants: { $all: [otherUserId, loginUserId] }
            })
        ]);

        return {
            user,
            totalFriends,
            mutualFriendsCount,
            isThisUserFriend: friendship?.status === enums.friend_Request_status.ACCEPTED,
            isreqPending: friendship?.status === enums.friend_Request_status.PENDING,
            conversationId: conversation ? conversation._id : null,
            lastMessageId: conversation ? conversation.lastMessage : null
        };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};
exports.searchUser = async (loginUserId, search) => {
    try {
        if (!search) return [];

        const users = await User.find({
            _id: { $ne: loginUserId },
            status: "active",
            $or: [
                { username: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ]
        })
            .select("username email avatarUrl bio profession currentCountry")
            .lean();

        if (users.length === 0) return [];

        const userIds = users.map(u => u._id);

        const [loginUserFriends, blockedList, friendships] = await Promise.all([
            getAllFriends(loginUserId),
            Block.find({
                $or: [
                    { blocker: loginUserId, blocked: { $in: userIds } },
                    { blocker: { $in: userIds }, blocked: loginUserId }
                ]
            }),
            Friend.find({
                $or: [
                    { requester: loginUserId, recipient: { $in: userIds } },
                    { requester: { $in: userIds }, recipient: loginUserId }
                ]
            })
        ]);

        const loginFriendIds = new Set(loginUserFriends.map(f => f._id.toString()));

        const blockedSet = new Set(
            blockedList.map(b =>
                b.blocker.toString() === loginUserId.toString()
                    ? b.blocked.toString()
                    : b.blocker.toString()
            )
        );

        const friendshipMap = {};
        for (const f of friendships) {
            const otherId = f.requester.toString() === loginUserId.toString()
                ? f.recipient.toString()
                : f.requester.toString();
            friendshipMap[otherId] = f.status;
        }

        const profileFriendsMap = {};
        await Promise.all(
            userIds.map(async (id) => {
                const friends = await getAllFriends(id);
                profileFriendsMap[id.toString()] = friends;
            })
        );

        const result = [];
        for (const user of users) {
            const uid = user._id.toString();
            if (blockedSet.has(uid)) continue;

            const mutualFriendsCount = (profileFriendsMap[uid] || []).filter(f =>
                loginFriendIds.has(f._id.toString())
            ).length;

            result.push({
                ...user,
                isThisUserFriend: friendshipMap[uid] === "accepted",
                isreqPending: friendshipMap[uid] === "pending",
                mutualFriendsCount
            });
        }

        return result;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};

exports.changeLanguageService = async (userId, newLang) => {
    try {
        if (!userId) throw createError(400, 'userNotFound', 'notFound');

        const allowedLanguages = ["en", "fr", "es", "cr"];
        if (!allowedLanguages.includes(newLang)) {
            throw createError(400, 'invalidLanguage', 'validation');
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { language: newLang },
            { new: true }
        ).select("language");

        if (!user) throw createError(404, 'userNotFound', 'notFound');

        return { language: user.language };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};