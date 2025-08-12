const express = require('express');
const router = express.Router();
const postController = require('../../../controllers/v1/user/post.controller.js');
const { createPostValidator } = require('../../../middlewares/requestValidations/user/post.middleware.js');
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');


router.post("/", isAuthenticated, authorizeRoles('user'), createPostValidator, postController.createPost);
router.get("/", isAuthenticated, authorizeRoles('user,admin'), createPostValidator, postController.getPosts);


module.exports = router;