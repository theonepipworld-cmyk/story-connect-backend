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


        const existingUser = await User.findById(userId).lean();
        if (!existingUser) throw createError(404, 'userNotFound', 'notFound');

        if (payload.username && payload.username !== existingUser.username) {
            const usernameExist = await User.findOne({
                username: payload.username,
                _id: { $ne: userId }
            });
            if (usernameExist) throw createError(400, 'usernameAlreadyExist', 'validation');

            patch.username = payload.username;
        }

        if (payload.email && payload.email !== existingUser.email) {
            const emailExist = await User.findOne({
                email: payload.email,
                _id: { $ne: userId }
            });
            if (emailExist) throw createError(400, 'emailAlreadyExist', 'validation');

            patch.email = payload.email;
        }


        // publicId update
        if (payload.publicId && payload.publicId !== existingUser.publicId) {

            // sanitize (IMPORTANT)
            let cleanPublicId = payload.publicId
                .toLowerCase()
                .trim()
                .replace(/\s+/g, "")
                .replace(/[^a-z0-9]/g, "");

            if (!cleanPublicId) {
                throw createError(400, 'invalidPublicId', 'validation');
            }

            // check uniqueness
            const publicIdExist = await User.findOne({
                publicId: cleanPublicId,
                _id: { $ne: userId }
            });

            if (publicIdExist) {
                throw createError(400, ' Please try different username.', 'This username already taken');
            }

            patch.publicId = cleanPublicId;
        }


        if (payload.bio) patch.bio = payload.bio;
        if (payload.profession) patch.profession = payload.profession;
        if (payload.education) patch.education = payload.education;
        if (payload.relationship) patch.relationship = payload.relationship;
        if (payload.entryYear) patch.entryYear = payload.entryYear;
        if (payload.phone) patch.phone = payload.phone;
        if (payload.status) patch.status = payload.status;
        if (payload.relationshipDescription) patch.relationshipDescription = payload.relationshipDescription;

        if (payload.profession && payload.profession.toLowerCase() === 'other') {
            if (!payload.manualProfession) throw createError(400, 'professionName', 'validation');
            patch.manualProfession = payload.manualProfession.trim();
        } else if (payload.profession) {
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
            patch.dateOfBirth = payload.dateOfBirth;
        }

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
        let updated
        try {
            updated = await User.findByIdAndUpdate(
                userId,
                { $set: patch },
                { new: true, runValidators: true }
            ).lean();

        } catch (error) {
            if (error.code === 11000 && error.keyPattern?.publicId) {
                throw createError(400, 'publicIdAlreadyExist', 'validation');
            }
            throw error;
        }

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

        const [totalFriends, friendship, conversation, blockByMe, blockedByHim] = await Promise.all([
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
            }),
            Block.findOne({ blocker: loginUserId, blocked: otherUserId }),
            Block.findOne({ blocker: otherUserId, blocked: loginUserId })
        ]);

        const isAccepted = friendship?.status === enums.friend_Request_status.ACCEPTED;
        const isPending = friendship?.status === enums.friend_Request_status.PENDING;
        const isRejected = friendship?.status === enums.friend_Request_status.REJECTED;

        const isRequesterMe = friendship?.requester?.toString() === loginUserId.toString();

        return {
            user,
            totalFriends,
            mutualFriendsCount,

            isThisUserFriend: isAccepted,
            isreqPending: isPending,
            isRejected: isRejected,

            conversationId: conversation ? conversation._id : null,
            lastMessageId: conversation ? conversation.lastMessage : null,

            isBlockedByMe: !!blockByMe,
            isBlockedByOther: !!blockedByHim,

            //  ONLY true when pending AND sent by me
            iSentRequest: isPending && isRequesterMe,

            requestSentBy: friendship ? {
                _id: friendship.requester,
                isMe: isRequesterMe
            } : null,

            //  OPTIONAL (very useful)
            canSendRequest: !friendship || isRejected
        };
    } catch (error) {
        if (error.statusCode) throw error;
        console.log(" error ----", error);
        throw createError(500, 'serverError', 'error');
    }
};



exports.searchUser = async (loginUserId, search) => {
    try {
        if (!search) return [];

        const user = await isUserExist(loginUserId);
        if (!user) throw createError(404, "userNotFound", "notFound");

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


        const allProfileFriends = await Promise.all(
            userIds.map(id => getAllFriends(id))
        );
        const profileFriendsMap = {};
        userIds.forEach((id, i) => {
            profileFriendsMap[id.toString()] = allProfileFriends[i];
        });

        const result = [];
        for (const u of users) {
            const uid = u._id.toString();
            if (blockedSet.has(uid)) continue;

            const mutualFriendsCount = (profileFriendsMap[uid] || []).filter(f =>
                loginFriendIds.has(f._id.toString())
            ).length;

            result.push({
                ...u,

                isThisUserFriend: friendshipMap[uid] === enums.friend_Request_status.ACCEPTED,
                isreqPending: friendshipMap[uid] === enums.friend_Request_status.PENDING,
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




exports.updateOthersProfile = async (userId, payload, files) => {
    try {
        const patch = {};

        const existingUser = await User.findById(userId).lean();
        if (!existingUser) throw createError(404, 'userNotFound', 'notFound');

        if (payload.username && payload.username !== existingUser.username) {
            const usernameExist = await User.findOne({
                username: payload.username,
                _id: { $ne: userId }
            });
            if (usernameExist) throw createError(400, 'usernameAlreadyExist', 'validation');

            patch.username = payload.username;
        }

        if (payload.email && payload.email !== existingUser.email) {
            const emailExist = await User.findOne({
                email: payload.email,
                _id: { $ne: userId }
            });
            if (emailExist) throw createError(400, 'emailAlreadyExist', 'validation');

            patch.email = payload.email;
        }


        // publicId update
        if (payload.publicId && payload.publicId !== existingUser.publicId) {

            // sanitize (IMPORTANT)
            let cleanPublicId = payload.publicId
                .toLowerCase()
                .trim()
                .replace(/\s+/g, "")
                .replace(/[^a-z0-9]/g, "");

            if (!cleanPublicId) {
                throw createError(400, 'invalidPublicId', 'validation');
            }

            // check uniqueness
            const publicIdExist = await User.findOne({
                publicId: cleanPublicId,
                _id: { $ne: userId }
            });

            if (publicIdExist) {
                throw createError(400, 'Public Id already taken. Please use different Public Id.', 'validation');
            }

            patch.publicId = cleanPublicId;
        }


        if (payload.bio) patch.bio = payload.bio;
        if (payload.profession) patch.profession = payload.profession;
        if (payload.education) patch.education = payload.education;
        if (payload.relationship) patch.relationship = payload.relationship;
        if (payload.entryYear) patch.entryYear = payload.entryYear;
        if (payload.phone) patch.phone = payload.phone;
        if (payload.status) patch.status = payload.status;
        if (payload.relationshipDescription) patch.relationshipDescription = payload.relationshipDescription;

        if (payload.profession && payload.profession.toLowerCase() === 'other') {
            if (!payload.manualProfession) throw createError(400, 'professionName', 'validation');
            patch.manualProfession = payload.manualProfession.trim();
        } else if (payload.profession) {
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
            patch.dateOfBirth = payload.dateOfBirth;
        }

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
        let updated
        try {
            updated = await User.findByIdAndUpdate(
                userId,
                { $set: patch },
                { new: true, runValidators: true }
            ).lean();

        } catch (error) {
            if (error.code === 11000 && error.keyPattern?.publicId) {
                throw createError(400, 'publicIdAlreadyExist', 'validation');
            }
            throw error;
        }

        if (!updated) throw createError(404, 'userNotFound', 'notFound');

        return { message: resMessages.success.updateSuccessful };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};