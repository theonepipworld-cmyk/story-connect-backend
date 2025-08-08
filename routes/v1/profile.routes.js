const express = require('express');
const router = express.Router();
const profileController = require('../../controllers/v1/profile/profile.controller.js');
const { authenticate } = require('../../middlewares/requestValidations/profile/profile.middleware.js');
const { updateProfileValidator } = require('../../middlewares/requestValidations/profile.middleware.js');
const upload = require('../../middlewares/upload.middleware.js');

// Get own profile
router.get('/profile', authenticate, profileController.getProfile);

// Update profile (multipart for avatar/background)
router.put(
  '/profile',
  authenticate,
  upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),
  updateProfileValidator,
  profileController.updateProfile
);

// Soft delete user profile (deactivate)
router.delete('/profile', authenticate, profileController.deleteProfile);

// Optional admin/hard delete route (protected + audited)
router.delete('/admin/profile/:userId', authenticate, profileController.adminHardDelete);

module.exports = router;
