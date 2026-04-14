const express = require('express')
const router = express.Router()
const authController = require('../../../controllers/v1/user/auth.controller.js')
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');

const {
    loginValidator, signupValidator, forgotPasswordValidator, resetPasswordValidator
} = require("../../../middlewares/requestValidations/user/commonAuth.middleware.js")

//Authentication
router.post('/signup', signupValidator, authController.signup);
router.post('/login', loginValidator, authController.login);
router.post('/save-device-token', authController.savedDeviceToken);
router.post('/forgot-password', forgotPasswordValidator, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidator, authController.resetPassword);
router.get('/reset-password/:token', authController.renderPasswordSubmitPage);
router.patch('/verify-email', authController.verifyEmail);
router.patch('/resend-verification-otp', authController.resendVerificationOtp);

// router.post('/google', authController.googleAuth);

module.exports = router;