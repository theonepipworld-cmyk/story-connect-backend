const express = require('express');
const router = express.Router();
// const postController = require('../../../controllers/v1/user/post.controller.js');
const { authenticate, avatarUpload } = require('../../../middlewares/requestValidations/user/profile.middleware.js');
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');


// router.post("/", postController.createPost);
// router.post("/", postController.createPost);

module.exports = router;