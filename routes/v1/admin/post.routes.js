const express = require('express');
const router = express.Router();
const adminpostController = require("../../../controllers/v1/admin/post.controller.js")
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');



router.put("/add-highlighted-post", isAuthenticated, authorizeRoles('admin'), adminpostController.addStoryAndVideoOfMonth);
router.put("/remove-highlighted-post", isAuthenticated, authorizeRoles('admin'), adminpostController.removeStoryAndVideoOfMonth);
router.patch("/action-on-community/:communityId/:action", isAuthenticated, authorizeRoles('admin'), adminpostController.actionOnCommunityController);
module.exports = router;