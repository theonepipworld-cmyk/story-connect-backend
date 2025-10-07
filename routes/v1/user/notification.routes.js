const express = require('express')
const router = express.Router();
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');
const notificationController = require("../../../controllers/v1/user/notification.controller.js")
const chatMiddleware = require("../../../middlewares/requestValidations/user/chat.middleware.js");
const { mediaUploadHandler } = require("../../../middlewares/requestValidations/user/mediaUploadHandler.js");


router.get("/all-users-notifications", isAuthenticated, authorizeRoles('user'), notificationController.getUserNotifications)
router.post("/seen-users-notifications", isAuthenticated, authorizeRoles('user'), notificationController.makeAllUserNotificationRead)

module.exports = router;