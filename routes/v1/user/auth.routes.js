const express = require('express')
const router = express.Router()
const authController = require('../../../controllers/v1/auth/auth.controller.js')

const {
    loginValidator, signupValidator,forgotPasswordValidator,resetPasswordValidator
} = require("../../../middlewares/requestValidations/auth/commonAuth.middleware.js")

//Authentication
router.post('/login', loginValidator, authController.login);
router.post('/signup', signupValidator, authController.signup);
router.post('/forgot-password', forgotPasswordValidator,authController.forgotPassword);
router.post('/reset-password', resetPasswordValidator, authController.resetPassword);
router.get('/reset-password/:token', authController.renderPasswordSubmitPage);
// router.post('/google', authController.googleAuth);

module.exports = router;