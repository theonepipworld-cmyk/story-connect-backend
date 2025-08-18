const { body } = require("express-validator");
const { validate } = require("../../../middlewares/requestValidations/user/validate")
const resMessages = require("../../../constants/resMessages.constants.js")



exports.createCommentValidator = [
  // postId: required
  body("postId")
    .notEmpty()
    .withMessage(`${resMessages.validation.missingFields}: postId`)
    .isMongoId()
    .withMessage(`${resMessages.validation.invalidId}: postId`),

  // comment: required
  body("comment")
    .notEmpty()
    .withMessage(`${resMessages.validation.missingFields}: comment`)
    .isString()
    .withMessage(`${resMessages.validation.invalidType}: comment`),

  // parentCommentId: optional but if provided must be a valid MongoId
  body("parentCommentId")
    .optional()
    .isMongoId()
    .withMessage(`${resMessages.validation.invalidId}: parentCommentId`),

  validate
];

exports.updateCommentValidator = [
  // commentId: required
  body("commentId")
    .notEmpty()
    .withMessage(`${resMessages.validation.missingFields}: commentId`)
    .isMongoId()
    .withMessage(`${resMessages.validation.invalidId}: commentId`),

  // postId: required
  body("postId")
    .notEmpty()
    .withMessage(`${resMessages.validation.missingFields}: postId`)
    .isMongoId()
    .withMessage(`${resMessages.validation.invalidId}: postId`),

  // parentCommentId: optional
  body("parentCommentId")
    .optional()
    .isMongoId()
    .withMessage(`${resMessages.validation.invalidId}: parentCommentId`),

  // comment: optional but must be string if present
  body("content")
    .optional()
    .isString()
    .withMessage(`${resMessages.validation.invalidType}: content`),

  validate
];

exports.deleteCommentValidator =[
    // commentId: required
  body("commentId")
    .notEmpty()
    .withMessage(`${resMessages.validation.missingFields}: commentId`)
    .isMongoId()
    .withMessage(`${resMessages.validation.invalidId}: commentId`),
// postId: required
  body("postId")
    .notEmpty()
    .withMessage(`${resMessages.validation.missingFields}: postId`)
    .isMongoId()
    .withMessage(`${resMessages.validation.invalidId}: postId`),

  // parentCommentId: optional
  body("parentCommentId")
    .optional()
    .isMongoId()
    .withMessage(`${resMessages.validation.invalidId}: parentCommentId`),
]

exports.getCommentValidator =[
    // postId: required
  body("postId")
    .notEmpty()
    .withMessage(`${resMessages.validation.missingFields}: postId`)
    .isMongoId()
    .withMessage(`${resMessages.validation.invalidId}: postId`),
//parentComment:required
    body("parentCommentId")
    .notEmpty()
    .withMessage(`${resMessages.validation.missingFields}: parentCommentId`)
    .isMongoId()
    .withMessage(`${resMessages.validation.invalidId}: parentCommentId`),
]
