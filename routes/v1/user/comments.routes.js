const express = require('express')
const router = express.Router();
const { isAuthenticated } = require('../../../middlewares/requestValidations/user/isAuthenticated.js');
const commentController = require("../../../controllers/v1/user/comment.controller.js");
const { authorizeRoles } = require('../../../middlewares/requestValidations/user/authorizeRoles.js');


 router.post("/add-comments",isAuthenticated,authorizeRoles('user'),commentController.addComment);
 router.put("/edit-comments",isAuthenticated,authorizeRoles('user'),commentController.updateComment);
 router.delete("/delete-comments" ,isAuthenticated,authorizeRoles('user'),commentController.deleteComment);
 router.get("/get-comments",isAuthenticated,commentController.getComment)

 
module.exports = router;