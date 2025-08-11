const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");
const { DEFAULT_AVATAR_URL } = require("../../../constants/variables.constants.js");
const User = require('../../../models/user.model.js');
const { uploadFileToS3, removeS3Object } = require('../../../utils/s3.util.js');
const uploadQueue = require("../../../job/uploadAvatar.js")
const profileService = require("../../../service/user/profile.service.js")

exports.getProfile = async (req, res) => {
  try {
    const user = await profileService.getProfile(req.user.userId);
    return res.status(200).json(successResponse(resMessages.success.fetchSuccessful, user));
  } catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
};

exports.updateProfiles = async (req, res) => {
  try {
    const userId = req.user.userId;
    const payload = req.body || {};
    const files = req.files || {};

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
        return res.status(400).json(
          errorResponse(resMessages.validation.invalidDateOfBirthFormat)
        );
      }
      patch.dateOfBirth = payload.dateOfBirth;
    }
    if (files.avatar?.[0]) {
      try {
        const avatarFile = files.avatar[0];
        const s3Res = await uploadFileToS3(avatarFile);
        patch.avatarUrl = s3Res?.Location || DEFAULT_AVATAR_URL;
      } catch (uploadErr) {
        console.error('Avatar upload failed:', uploadErr);
        patch.avatarUrl = DEFAULT_AVATAR_URL;
      }
    }

    // await uploadQueue.add('uploadAvatar', {
    //   userId,
    //   files
    // });
    // console.log("Profile update initiated. Avatar will be processed shortly")

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: patch },
      { new: true, runValidators: true, select: 'name email profile profession' }
    ).lean();

    if (!updated) {
      return res.status(404).json(errorResponse(resMessages.generalError.userNotFound));
    }

    return res.status(200).json(
      successResponse(resMessages.success.updateSuccessful, { message: 'Profile updated' })
    );
  } catch (err) {
    console.error('Update profile error', err);
    return res.status(500).json(
      errorResponse(resMessages.generalError.somethingWentWrong, err.message)
    );
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const result = await profileService.updateProfile(req.user.userId, req.body, req.files);
    return res.status(200).json(successResponse(resMessages.success.updateSuccessful, result));
  } catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
};


exports.deleteProfile = async (req, res) => {
  try {
    const result = await profileService.deleteProfile(req.user.userId);
    return res.status(200).json(successResponse(resMessages.success.deleteSuccessful, result));
  } catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
};
// exports.updateProfile = async (req, res) => {
//   try {
//     const userId = req.user.userId;
//     const payload = req.body || {};
//     const files = req.files || {};
//     // Build patch (allow partial updates)
//     const patch = {};
//     if (payload.name) patch.username = payload.name;
//     if (payload.bio) patch.bio = payload.bio;
//     if (payload.profession) patch.profession = payload.profession;
//     if (payload.education) patch.education = payload.education;
//     if (payload.relationship) patch.relationship = payload.relationship;
//     if (payload.countryOfOrigin) patch.countryOfOrigin = payload.countryOfOrigin;
//     if (payload.currentCountry) patch.currentCountry = payload.currentCountry;
//     if (payload.entryYear) patch.entryYear = payload.entryYear;
//     if (payload.dateOfBirth) patch.dateOfBirth = payload.dateOfBirth;

//     const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
//     if (!dateRegex.test(payload.dateOfBirth)) {
//       return res.status(400).json(
//         errorResponse(resMessages.validation.invalidDateOfBirthFormat)
//       );
//     }

//       if (files.avatar && files.avatar[0]) {
//         const avatarFile = files.avatar[0];
//         const avatarKey = `users/${userId}/avatar-${Date.now()}-${avatarFile.originalname}`;
//         console.log(avatarFile,"file");

//         // const s3Res = await uploadFileToS3(avatarFile.buffer || avatarFile.path, avatarKey, avatarFile.mimetype);
//         // patch.avatar= s3Res.Location;
//       }

//     const updated = await User.findByIdAndUpdate(
//       userId,
//       { $set: patch },
//       {
//         new: true,
//         runValidators: true,
//         select: 'name email profile profession'
//       }
//     ).lean();

//     if (!updated) {
//       return res.status(404).json(errorResponse(resMessages.generalError.userNotFound));
//     }

//     return res
//       .status(200)
//       .json(successResponse(resMessages.success.updateSuccessful, { message: 'Profile updated' }));
//   } catch (err) {
//     console.error('Update profile error', err);
//     return res
//       .status(500)
//       .json(errorResponse(resMessages.generalError.somethingWentWrong, err.message));
//   }
// };


// exports.deleteProfile = async (req, res) => {
//   try {
//     const userId = req.user.userId;
//     // Soft delete pattern: mark status = deactivated and keep data for audit/restore
//     const updated = await User.findByIdAndUpdate(userId, {
//       $set: { status: 'deactivated' }
//     }, { new: true, select: 'status' });

//     if (!updated) return res.status(404).json(errorResponse(resMessages.notFound.userNotFound));
//     // Optionally: enqueue background tasks to scrub PII, remove media from S3 after retention
//     return res.status(200).json(successResponse(resMessages.success.deletionSuccessful, { status: updated.status }));
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json(errorResponse(resMessages.generalError.somethingWentWrong, err.message));
//   }
// };