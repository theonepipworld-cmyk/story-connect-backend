const express = require('express');
const router = express.Router();
const profileController = require('../../../controllers/v1/user/profile.controller.js');
const { updateProfileValidator, avatarUpload } = require('../../../middlewares/requestValidations/user/profile.middleware.js');
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');


router.get('/', isAuthenticated, authorizeRoles('user','admin'), profileController.getProfile);
router.put(
  '/',
  avatarUpload,
  isAuthenticated, authorizeRoles('user'),
  updateProfileValidator,
  profileController.updateProfile
);
router.get('/otherprofile/:userId', isAuthenticated, authorizeRoles('user','admin'), profileController.getOtherProfile);

// Soft delete user profile (deactivate)
router.delete('/', isAuthenticated, authorizeRoles('user'), profileController.deleteProfile);


module.exports = router;
