const express = require('express');
const router = express.Router();
const profileController = require('../../../controllers/v1/user/profile.controller.js');
const { authenticate, avatarUpload } = require('../../../middlewares/requestValidations/user/profile.middleware.js');
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');


router.get('/getProfile', isAuthenticated, authorizeRoles('user'), profileController.getProfile);
router.put(
  '/updateProfile',
  avatarUpload,
  isAuthenticated, authorizeRoles('user'),
  profileController.updateProfile
);

// Soft delete user profile (deactivate)
router.delete('/deleteProfile', isAuthenticated, authorizeRoles('user'), profileController.deleteProfile);


module.exports = router;
