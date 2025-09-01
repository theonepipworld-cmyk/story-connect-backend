const express = require('express')
const router = express.Router();
const communityController = require("../../../controllers/v1/user/community.controller");
const coummnityMiddleware = require("../../../middlewares/requestValidations/user/community.middleware");
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');

router.post("/", isAuthenticated, authorizeRoles('user','admin'),coummnityMiddleware.createCommunityValidator,communityController.createCommunity);
router.post("/join-members",isAuthenticated, authorizeRoles('user','admin'),coummnityMiddleware.joinedCommunity,communityController.joinCommunity);
router.get("/user-communities",isAuthenticated, authorizeRoles('user','admin'),communityController.userCommunity);
router.get("/category",isAuthenticated, authorizeRoles('user','admin'),communityController.categoryList);
router.get("/:id",isAuthenticated, authorizeRoles('user','admin'),coummnityMiddleware.communityDetails,communityController.getCommunitydetails);
router.get("/:id/members",isAuthenticated, authorizeRoles('user','admin'),coummnityMiddleware.getCommunityMembersValidation,communityController.getCommunityMembers);
router.get("/:id/post",isAuthenticated, authorizeRoles('user','admin'),coummnityMiddleware.getCommunityMembersValidation,communityController.getCommunitiesPost);
router.get("/",isAuthenticated, authorizeRoles('user','admin'),communityController.allCommunitiesList);
router.put("/remove-member",isAuthenticated, authorizeRoles('user','admin'),coummnityMiddleware.commmunityMemberRemove,communityController.removeCommunityMember);
router.delete("/:id",isAuthenticated, authorizeRoles('user','admin'),coummnityMiddleware.communityDetails,communityController.removeCommunity);
router.put("/:id",isAuthenticated, authorizeRoles('user','admin'),coummnityMiddleware.updateCommunityValidator,communityController.updateCommunityDetails);
router.get("/communitiesId",isAuthenticated, authorizeRoles('user','admin'),communityController.getCommunitiesIdList);
module.exports = router;