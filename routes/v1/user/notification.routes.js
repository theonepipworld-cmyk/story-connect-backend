const express = require('express')
const router = express.Router();
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');
const notificationController = require("../../../controllers/v1/user/notification.controller.js")
const chatMiddleware = require("../../../middlewares/requestValidations/user/chat.middleware.js");
const { mediaUploadHandler } = require("../../../middlewares/requestValidations/user/mediaUploadHandler.js");

//notification screen
router.get("/all-users-notifications", isAuthenticated, authorizeRoles('admin','user'), notificationController.getUserNotifications)
router.post("/seen-users-notifications", isAuthenticated, authorizeRoles('admin','user'), notificationController.makeAllUserNotificationRead)


// pushNotifcation enabled and disabled
router.post("/status-push-notification",isAuthenticated,authorizeRoles('admin','user'),notificationController.changeStatusPushNotification)
module.exports = router;