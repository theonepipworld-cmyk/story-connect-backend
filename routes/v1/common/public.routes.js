const express = require('express');
const router = express.Router();
const adminpostController = require("../../../controllers/v1/admin/post.controller.js")


router.get("/highlightedPost", adminpostController.getHighlightedPosts)
router.post('/create-shareable-link', adminpostController.createShareableLink)


module.exports = router;