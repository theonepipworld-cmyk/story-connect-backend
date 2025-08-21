const express = require('express')
const router = express.Router();
const communityController = require("../../../controllers/v1/user/community.controller");
const coummnityMiddleware = require("../../../middlewares/requestValidations/user/community.middleware")
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');

router.post("/", isAuthenticated, authorizeRoles('user','admin'),coummnityMiddleware.createCommunityValidator,communityController.createCommunity);
router.post("/join-members",isAuthenticated, authorizeRoles('user','admin'),coummnityMiddleware.joinedCommunity,communityController.joinCommunity)
module.exports = router;