// services/profile/profile.service.js
const User = require('../../models/user.model');
const { uploadFileToS3 } = require('../../utils/s3.util');
const { DEFAULT_AVATAR_URL } = require('../../constants/variables.constants');
const { errorResponse, successResponse } = require('../../utils/responseHandler.util');
const resMessages = require('../../utils/responseHandler.util');

exports.getProfile = async (userId) => {
    const user = await User.findById(userId)
        .select('name email bio profession education relationship countryOfOrigin currentCountry entryYear dateOfBirth avatarUrl')
        .lean();

    if (!user) {
        throw new Error(resMessages.generalError.userNotFound);
    }

    return user;
};

exports.updateProfile = async (userId, payload, files) => {
    const patch = {};

    if (payload.name) patch.username = payload.name;
    if (payload.bio) patch.bio = payload.bio;
    if (payload.profession) patch.profession = payload.profession;
    if (payload.education) patch.education = payload.education;
    if (payload.relationship) patch.relationship = payload.relationship;
    if (payload.countryOfOrigin) patch.countryOfOrigin = payload.countryOfOrigin;
    if (payload.currentCountry) patch.currentCountry = payload.currentCountry;
    if (payload.entryYear) patch.entryYear = payload.entryYear;

    if (payload.dateOfBirth) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(payload.dateOfBirth)) {
            throw new Error(resMessages.validation.invalidDateOfBirthFormat);
        }
        patch.dateOfBirth = payload.dateOfBirth;
    }

    if (files.avatar?.[0]) {
        try {
            const avatarFile = files.avatar[0];
            const s3Res = await uploadFileToS3(avatarFile);
            patch.avatarUrl = s3Res?.Location || DEFAULT_AVATAR_URL;
        } catch (uploadErr) {
            patch.avatarUrl = DEFAULT_AVATAR_URL;
        }
    }

    const updated = await User.findByIdAndUpdate(
        userId,
        { $set: patch },
        { new: true, runValidators: true, select: 'name email profile profession' }
    ).lean();

    if (!updated) {
        throw new Error(resMessages.generalError.userNotFound);
    }

    return { message: 'Profile updated' };
};

exports.deleteProfile = async (userId) => {

    const deleted = await User.findByIdAndUpdate(userId, {
        $set: { status: 'deactivated' }
    }, { new: true, select: 'status' });


    if (!deleted) {
        throw new Error(resMessages.generalError.userNotFound);
    }

    return { message: 'Profile deleted' };
};
