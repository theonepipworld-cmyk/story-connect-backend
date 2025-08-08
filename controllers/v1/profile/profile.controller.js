const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");
const User = require('../../../models/User.model.js');
const { queueImageProcessing } = require('../../../jobs/imageProcessor.job.js'); // bull job
const { uploadFileToS3, removeS3Object } = require('../../../utils/s3.util.js');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');

    if (!user) {
      return res.status(404).json(errorResponse('User not found'));
    }

    return res.status(200).json(successResponse('Profile fetched successfully', user));
  } catch (error) {
    return res.status(500).json(errorResponse('Something went wrong', error.message));
  }
};

exports.updateProfile = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const userId = req.user.id;
    const payload = req.body || {};
    const files = req.files || {};

    // Build patch (allow partial updates)
    const patch = {};
    if (payload.name) patch.name = payload.name;
    if (payload.bio) patch['profile.bio'] = payload.bio;
    if (payload.profession) patch['profile.profession'] = payload.profession;
    if (payload.education) patch['profile.education'] = payload.education;
    if (payload.relationship) patch['profile.relationship'] = payload.relationship;
    if (payload.countryOfOrigin) patch['profile.countryOfOrigin'] = payload.countryOfOrigin;
    if (payload.currentCountry) patch['profile.currentCountry'] = payload.currentCountry;
    if (payload.entryYear) patch['profile.entryYear'] = payload.entryYear;

    // Start transaction for consistency (if using Mongo replica set)
    await session.withTransaction(async () => {
      // Upload files to S3 asynchronously: upload, then queue resize
      if (files.avatar && files.avatar[0]) {
        const avatarFile = files.avatar[0];
        const avatarKey = `users/${userId}/avatar-${Date.now()}-${avatarFile.originalname}`;
        const s3Res = await uploadFileToS3(avatarFile.buffer || avatarFile.path, avatarKey, avatarFile.mimetype);
        patch['profile.avatar'] = s3Res.Location;
        // queue expensive image resize / thumbnails
        await queueImageProcessing({ userId, key: avatarKey, type: 'avatar' });
      }

      if (files.cover && files.cover[0]) {
        const coverFile = files.cover[0];
        const coverKey = `users/${userId}/cover-${Date.now()}-${coverFile.originalname}`;
        const s3Res = await uploadFileToS3(coverFile.buffer || coverFile.path, coverKey, coverFile.mimetype);
        patch['profile.cover'] = s3Res.Location;
        await queueImageProcessing({ userId, key: coverKey, type: 'cover' });
      }

      // Update lastModified metadata and patch
      patch['profile.lastModifiedAt'] = new Date();

      // Run atomic update with returnDocument set to 'after'
      const updated = await User.findByIdAndUpdate(userId, { $set: patch }, { new: true, session, select: 'name email profile' }).lean();
      if (!updated) throw new Error('USER_NOT_FOUND');
      // Optionally evict cache here (Redis)
    });

    return res.status(200).json(successResponse(resMessages.success.updateSuccessful, { message: 'Profile updated' }));
  } catch (err) {
    console.error('Update profile error', err);
    return res.status(500).json(errorResponse(resMessages.generalError.somethingWentWrong, err.message));
  } finally {
    session.endSession();
  }
};

exports.deleteProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    // Soft delete pattern: mark status = deactivated and keep data for audit/restore
    const updated = await User.findByIdAndUpdate(userId, {
      $set: { status: 'deactivated', 'profile.deletedAt': new Date() }
    }, { new: true, select: 'status' });

    if (!updated) return res.status(404).json(errorResponse(resMessages.notFound.userNotFound));
    // Optionally: enqueue background tasks to scrub PII, remove media from S3 after retention
    return res.status(200).json(successResponse(resMessages.success.deletionSuccessful, { status: updated.status }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse(resMessages.generalError.somethingWentWrong, err.message));
  }
};

exports.adminHardDelete = async (req, res) => {
  try {
    const adminUser = req.user;
    if (!adminUser.isAdmin) return res.status(403).json(errorResponse('Unauthorized'));

    const { userId } = req.params;
    // Hard delete: remove DB doc & delete S3 objects (be careful)
    const user = await User.findById(userId);
    if (!user) return res.status(404).json(errorResponse(resMessages.notFound.userNotFound));

    // Collect S3 keys from profile to remove (if you store keys separately)
    // await removeS3Object(user.profile.avatarKey); // example

    await user.remove(); // physical delete
    // Audit log here
    return res.status(200).json(successResponse('User hard-deleted'));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse(resMessages.generalError.somethingWentWrong, err.message));
  }
};
