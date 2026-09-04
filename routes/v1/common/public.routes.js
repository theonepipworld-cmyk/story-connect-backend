const express = require('express');
const router = express.Router();
const adminpostController = require("../../../controllers/v1/admin/post.controller.js")
const postController = require("../../../controllers/v1/user/post.controller.js")


router.get("/highlightedPost", adminpostController.getHighlightedPosts)
router.post('/create-shareable-link', adminpostController.createShareableLink)
router.get("/get-public-post-details", postController.getPublicPost);



module.exports = router;