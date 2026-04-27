const express = require('express');
const router = express.Router();
const profileController = require('../../../controllers/v1/user/profile.controller.js');
const { updateProfileValidator, avatarUpload } = require('../../../middlewares/requestValidations/user/profile.middleware.js');
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');


router.get('/', isAuthenticated, authorizeRoles('user', 'admin'), profileController.getProfile);
router.put(
  '/',
  avatarUpload,
  isAuthenticated, authorizeRoles('user', 'admin'),
  updateProfileValidator,
  profileController.updateProfile
);
router.get('/otherprofile/:userId', isAuthenticated, authorizeRoles('user', 'admin'), profileController.getOtherProfile);
router.get('/search',isAuthenticated,authorizeRoles('user', 'admin'), profileController.getSearchUser);
router.get('/update-others-profile', isAuthenticated, authorizeRoles('admin'), profileController.updateOthersProfile);

// Soft delete user profile (deactivate)
router.delete('/', isAuthenticated, authorizeRoles('user'), profileController.deleteProfile);
router.post("/update-lang", isAuthenticated, authorizeRoles('user'), profileController.changeLanguage)


module.exports = router;
