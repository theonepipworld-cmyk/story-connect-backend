const express = require('express')
const router = express.Router();
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const commentController = require("../../../controllers/v1/user/comment.controller.js");
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');
const commentMiddleware =require("../../../middlewares/requestValidations/user/comment.middleware.js")


 router.post("/add-comments",isAuthenticated,authorizeRoles('user','admin'),commentMiddleware.createCommentValidator,commentController.addComment);
 router.put("/edit-comments",isAuthenticated,authorizeRoles('user'),commentMiddleware.updateCommentValidator,commentController.updateComment);
 router.delete("/delete-comments" ,isAuthenticated,authorizeRoles('user'),commentMiddleware.deleteCommentValidator,commentController.deleteComment);
 router.get("/get-comments",isAuthenticated,commentMiddleware.getCommentValidator,commentController.getTopLevelComment)
 router.get("/get-reply-comments",isAuthenticated,commentMiddleware.getCommentValidator,commentController.getReplyComments)

 

module.exports = router;