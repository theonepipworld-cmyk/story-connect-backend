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
// router.post('/login',isAuthenticated, authorizeRoles('user'), loginValidator, authController.login);
router.post('/login', loginValidator, authController.login);
// router.post('/forgot-password', isAuthenticated, authorizeRoles('user'),forgotPasswordValidator, authController.forgotPassword);
router.post('/forgot-password',forgotPasswordValidator, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidator, authController.resetPassword);
router.get('/reset-password/:token', authController.renderPasswordSubmitPage);
// router.post('/google', authController.googleAuth);

module.exports = router;