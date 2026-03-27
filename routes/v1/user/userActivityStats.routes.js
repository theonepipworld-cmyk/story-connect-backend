const express = require('express')
const router = express.Router();
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');
const userStatsController = require("../../../controllers/v1/user/userStats.controller.js")
const userStatsMiddleware = require("../../../middlewares/requestValidations/user/userStats.middleware.js")


router.post("/user-stats", isAuthenticated, authorizeRoles('user'), userStatsMiddleware.userStatsValidator, userStatsController.addUserStats)
router.get("/users-like-views-stats", isAuthenticated, authorizeRoles('user'), userStatsController.getAllLikeOrViewUser);
router.get("/badge-counts", isAuthenticated, authorizeRoles('user'), userStatsController.getBadgeCounts);
module.exports = router;