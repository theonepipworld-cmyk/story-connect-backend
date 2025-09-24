const express = require('express')
const router = express.Router();
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');
const friendsController = require("../../../controllers/v1/user/friend.controller.js")
const friendMiddleware = require("../../../middlewares/requestValidations/user/friend.middleware.js")



router.post("/send/:id", isAuthenticated, authorizeRoles('user'),friendMiddleware.sendFriendReq,friendsController.sendFriendReq)
router.post("/action/:id", isAuthenticated, authorizeRoles('user'),friendMiddleware.acceptRejectReq,friendsController.respondFriendReq)
router.get("/pending", isAuthenticated, authorizeRoles('user'),friendsController.getAllPendingReq)
router.get("/:id/total-friends", isAuthenticated, authorizeRoles('user'),friendMiddleware.sendFriendReq,friendsController.getAllUserFriends)
router.get("/:id/Mutual-friends", isAuthenticated, authorizeRoles('user'),friendMiddleware.sendFriendReq,friendsController.getAllMutualFriends)
router.get("/suggestion-friends", isAuthenticated, authorizeRoles('user'),friendsController.getSuggestionFriends)
router.delete("/un-friend/:id", isAuthenticated, authorizeRoles('user'),friendMiddleware.sendFriendReq,friendsController.unfriendReq)
module.exports = router;
