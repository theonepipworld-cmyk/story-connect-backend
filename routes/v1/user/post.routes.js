const express = require('express');
const router = express.Router();
const postController = require('../../../controllers/v1/user/post.controller.js');
const { createPostValidator ,updatePostValidator} = require('../../../middlewares/requestValidations/user/post.middleware.js');
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');
const { mediaUploadHandler } = require("../../../middlewares/requestValidations/user/mediaUploadHandler.js");


router.get("/", isAuthenticated, authorizeRoles('user', 'admin'), postController.getPosts);
router.post(
  "/",
  isAuthenticated,
  authorizeRoles('user'),
  mediaUploadHandler,
  createPostValidator,
  postController.createPost
);
router.put("/:id", isAuthenticated, authorizeRoles('user'),updatePostValidator, postController.updatePost);
router.delete("/:id", isAuthenticated, authorizeRoles('user'), postController.deletePost);
router.get("/:id", isAuthenticated, authorizeRoles('user', 'admin'), postController.getPostById);
router.get("/profile/:id", isAuthenticated, authorizeRoles('user', 'admin'), postController.getPostsOfProfile);


module.exports = router;