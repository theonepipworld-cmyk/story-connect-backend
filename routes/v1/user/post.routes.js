const express = require('express');
const router = express.Router();
const postController = require('../../../controllers/v1/user/post.controller.js');
const { createPostValidator, updatePostValidator } = require('../../../middlewares/requestValidations/user/post.middleware.js');
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');
const { mediaUploadHandler } = require("../../../middlewares/requestValidations/user/mediaUploadHandler.js");


router.get("/user-feed", isAuthenticated, authorizeRoles('user', 'admin'), postController.getUserFeedPosts);
router.get("/trending-hashtags", isAuthenticated, authorizeRoles('user', 'admin'), postController.getTrendingTags);
router.get("/highlightedPost", isAuthenticated, authorizeRoles('user', 'admin'), postController.getHighlightedPosts);
router.get("/profile/:id", isAuthenticated, authorizeRoles('user', 'admin'), postController.getPostsOfProfile);
router.get("/", isAuthenticated, authorizeRoles('user', 'admin'), postController.getAllPost);


router.post("/", isAuthenticated, authorizeRoles('user', 'admin'), mediaUploadHandler, createPostValidator, postController.createPost);
router.put("/:id", isAuthenticated, authorizeRoles('user', 'admin'), updatePostValidator, postController.updatePost);
router.delete("/:id", isAuthenticated, authorizeRoles('user', 'admin'), postController.deletePost);
router.get("/:id", isAuthenticated, authorizeRoles('user', 'admin'), postController.getPostById);


module.exports = router;