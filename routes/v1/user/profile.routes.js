const express = require('express');
const router = express.Router();
const profileController = require('../../../controllers/v1/user/profile.controller.js');
const { authenticate ,avatarUpload} = require('../../../middlewares/requestValidations/user/profile.middleware.js');


router.get('/getProfile', authenticate, profileController.getProfile);
router.put(
  '/updateProfile',
  authenticate,
  avatarUpload,
  profileController.updateProfile
);

// Soft delete user profile (deactivate)
router.delete('/deleteProfile', authenticate, profileController.deleteProfile);


module.exports = router;
