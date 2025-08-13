const express = require('express');
const router = express.Router();
const postController = require('../../../controllers/v1/user/post.controller.js');
const { createPostValidator } = require('../../../middlewares/requestValidations/user/post.middleware.js');
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });


router.get("/", isAuthenticated, authorizeRoles('user', 'admin'), postController.getPosts);
router.post(
  "/",
  isAuthenticated,
  authorizeRoles('user'),
  upload.array('media', 5),
  createPostValidator,
  postController.createPost
);
router.put("/:id", isAuthenticated, authorizeRoles('user'), postController.updatePost);
router.delete("/:id", isAuthenticated, authorizeRoles('user'), postController.deletePost);
router.get("/:id", isAuthenticated, authorizeRoles('user', 'admin'), postController.getPostById);

module.exports = router;