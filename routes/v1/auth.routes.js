const express = require('express')
const router = express.Router()
const authController = require('../../controllers/auth/auth.controller.js')

const {
    loginValidator, signupValidator
} = require("../../middlewares/requestValidations/auth/commonAuth.middleware.js")

//Authentication
router.post('/login', loginValidator, authController.login);
router.post('/signup', signupValidator, authController.signup);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/reset-password/:token', authController.renderPasswordSubmitPage);
router.post('/google', authController.googleAuth);

module.exports = router;