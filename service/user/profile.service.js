const User = require('../../models/user.model');
const { uploadFileToS3 } = require('../../utils/s3.util');
const { DEFAULT_AVATAR_URL } = require('../../constants/variables.constants');
const resMessages = require('../../constants/resMessages.constants');
const { checkFieldExists, getAllFriends, createError, isUserExist } = require("../../helpers/dbHelpers.js")
const CountryList = require("../../models/countryList.model.js")
const professionalSymbol = require("../../models/professionalSymbolModel.js")
const Friend = require("../../models/friends.model.js")
const Block = require("../../models/block.model.js")
const enums = require("../../constants/enum.constants.js")

exports.getProfile = async (userId) => {

    // let isBlocked = null;
    // if (loginUserId) {
    //     isBlocked = await Block.findOne({
    //         $or: [
    //             { blocker: userId, blocked: loginUserId },
    //             { blocker: loginUserId, blocked: userId }
    //         ]
    //     });
    // }

    // if (isBlocked) {
    //     throw new Error(resMessages.validation.userBlocked);
    // }


    const user = await User.findById(userId)
        .select("-passwordHash -resetPasswordExpires -resetPasswordToken")
        .lean();


    if (!user) {
        throw createError(400, 'userNotFound', 'notFound');
    }


    // let mutualFriendsCount = 0;
    // if (loginUserId && loginUserId.toString() !== user._id.toString()) {
    //     const loginUserFriend = await getAllFriends(loginUserId);
    //     const profileUserFriend = await getAllFriends(user._id);

    //     const loginFriendIds = new Set(loginUserFriend.map(f => f._id.toString()));
    //     const mutualFriendIds = profileUserFriend
    //         .map(f => f._id.toString())
    //         .filter(id => loginFriendIds.has(id));

    //     mutualFriendsCount = mutualFriendIds.length;
    // }


    const totalFriends = await Friend.countDocuments({
        status: "accepted",
        $or: [{ requester: userId }, { recipient: userId }]
    });

    return {
        user,
        totalFriends,
    };
};




exports.updateProfile = async (userId, payload, files) => {
    const patch = {};
    if (payload.username) patch.username = payload.username;
    if (payload.bio) patch.bio = payload.bio;
    if (payload.profession) patch.profession = payload.profession;


    if (payload.profession && payload.profession.toLowerCase() === 'other') {
        if (!payload.manualProfession) {
                throw createError(404,'professionName','validation');
        }
        patch.manualProfession = (payload.manualProfession).trim();
    } else {
        patch.manualProfession = undefined;
    }

    if (payload.education) patch.education = payload.education;
    if (payload.relationship) patch.relationship = payload.relationship;

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
        const currentCounrty = await CountryList.findById(payload.currentCountry).lean();
        if (currentCounrty) {
            patch.currentCountry = {
                _id: currentCounrty._id,
                code: currentCounrty.code,
                name: currentCounrty.name
            };
        }
    }

    if (payload.entryYear) patch.entryYear = payload.entryYear;
    if (payload.phone) patch.phone = payload.phone;
    if (payload.dateOfBirth) patch.dateOfBirth = payload.dateOfBirth;
    if (payload.status) patch.status = payload.status;
    if (payload.relationshipDescription) patch.relationshipDescription = payload.relationshipDescription;
    if (payload.email) patch.email = payload.email;

    if (payload.professionSymbol) {
        const professionalSymbols = await professionalSymbol.findById(payload.professionSymbol);
        if (professionalSymbols) {
            patch.professionSymbol = {
                _id: professionalSymbols._id,
                name: professionalSymbols.name,
                iconUrl: professionalSymbols.iconUrl
            };
        }
    }

    const [emailExist, usernameExist] = await Promise.all([
        checkFieldExists('email', payload.email),
        checkFieldExists('username', payload.username),
    ]);

    if (emailExist) {
         throw createError(404,'emailAlreadyExist','validation');
    }

    if (usernameExist) {
           throw createError(404,'usernameAlreadyExist','validation');
    }

    if (payload.dateOfBirth) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(payload.dateOfBirth)) {
             throw createError(404,'invalidDateOfBirthFormat','validation');
           
        }
        patch.dateOfBirth = payload.dateOfBirth;
    }

    if (files && files.avatar?.[0]) {
        try {
            const avatarFile = files.avatar[0];
            const s3Res = await uploadFileToS3(avatarFile, "profile");
            patch.avatarUrl = s3Res?.Location || DEFAULT_AVATAR_URL;
        } catch (uploadErr) {
            patch.avatarUrl = DEFAULT_AVATAR_URL;
        }
    }

    if (files && files.profileCoverImage?.[0]) {
        try {
            const profileCoverImage = files.profileCoverImage[0];
            const s3Res = await uploadFileToS3(profileCoverImage, "profileCoverImage");
            patch.profileCoverImage = s3Res?.Location || DEFAULT_AVATAR_URL;
        } catch (uploadErr) {
            patch.profileCoverImage = DEFAULT_AVATAR_URL;
        }
    }

    const updated = await User.findByIdAndUpdate(
        userId,
        { $set: patch },
        { new: true, runValidators: true, select: 'name email profile profession manualProfession' }
    ).lean();

    if (!updated) {
        throw createError(404,'userNotFound','notFound');

        
    }

    return { message: resMessages.success.updateSuccessful };
};

exports.deleteProfile = async (userId) => {
    const deleted = await User.findByIdAndUpdate(userId, {
        $set: { status: 'deleted' }
    }, { new: true, select: 'status' });
    if (!deleted) {
          throw createError(404,'userNotFound','notFound');
    }
    return { message: resMessages.success.deleteSuccessful };
};

exports.getOtherProfileService = async (otherUserId, loginUserId) => {
    try {

        if (!otherUserId || !loginUserId) {
            throw createError(400, 'userNotFound', 'notFound');
        }
        let isBlocked = null;
        if (loginUserId) {
            isBlocked = await Block.findOne({
                $or: [
                    { blocker: otherUserId, blocked: loginUserId },
                    { blocker: loginUserId, blocked: otherUserId }
                ]
            });
        }

        if (isBlocked) {
               throw createError(404,'userBlocked','validation');
           
        }


        const user = await User.findById(otherUserId)
            .select("-passwordHash -resetPasswordExpires -resetPasswordToken")
            .lean();

        if (!user) {
           throw createError(400, 'userNotFound', 'notFound');
        }
        let mutualFriendsCount = 0;
        if (loginUserId && loginUserId.toString() !== user._id.toString()) {
            const loginUserFriend = await getAllFriends(loginUserId);
            const profileUserFriend = await getAllFriends(user._id);

            const loginFriendIds = new Set(loginUserFriend.map(f => f._id.toString()));
            const mutualFriendIds = profileUserFriend
                .map(f => f._id.toString())
                .filter(id => loginFriendIds.has(id));
            mutualFriendsCount = mutualFriendIds.length;
        }


        const totalFriends = await Friend.countDocuments({
            status: enums.friend_Request_status.ACCEPTED,
            $or: [{ requester: otherUserId }, { recipient: otherUserId }]
        });

        const friendship = await Friend.findOne({
            $or: [
                { requester: loginUserId, recipient: otherUserId },
                { requester: otherUserId, recipient: loginUserId }
            ]
        });

        const isThisUserFriend = friendship?.status === enums.friend_Request_status.ACCEPTED;
        const isreqPending = friendship?.status === enums.friend_Request_status.PENDING;

        return {
            user,
            totalFriends,
            mutualFriendsCount,
            isThisUserFriend,
            isreqPending
        };


    }
    catch (error) {
        if (error.statusCode) throw error;
             throw createError(500, 'serverError','error');
    }
};


