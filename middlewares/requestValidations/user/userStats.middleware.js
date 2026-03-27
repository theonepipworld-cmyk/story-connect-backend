const { body } = require("express-validator");
const { validate } = require("../../../middlewares/requestValidations/user/validate")
const resMessages = require("../../../constants/resMessages.constants.js")

exports.userStatsValidator = [
  // postId: required
  body("postId")
    .notEmpty()
    .withMessage(`${resMessages.validation.missingFields}: postId`)
    .isMongoId()
    .withMessage(`${resMessages.validation.invalidId}: postId`),

  // commentId: optional
  body("commentId")
    .optional()
    .isMongoId()
    .withMessage(`${resMessages.validation.invalidId}: commentId`),

  // parentCommentId: optional
  body("parentCommentId")
    .optional()
    .isMongoId()
    .withMessage(`${resMessages.validation.invalidId}: parentCommentId`),

  // type: required, must be in given list
  body("type")
    .notEmpty()
    .withMessage(`${resMessages.validation.missingFields}: type`)
    .isIn(["likes", "commentLikes", "commentReplyLike","views"])
    .withMessage(`${resMessages.validation.typeUserStatsError}`),

  validate
];