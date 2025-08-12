const express = require('express')
const router = express.Router();
const { authenticate ,avatarUpload} = require('../../../middlewares/requestValidations/user/profile.middleware.js');
const commentController = require("../../../controllers/v1/user/comment.controller.js");


 router.post("/add-comments",authenticate,commentController.addComment);
 router.put("/edit-comments",authenticate,commentController.updateComment);
 router.delete("/delete-comments" ,authenticate,commentController.deleteComment);
 router.get("/get-comments",authenticate,commentController.getComment)

 
module.exports = router;