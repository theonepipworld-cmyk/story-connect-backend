const { body } = require("express-validator");
const { validate } = require("../../../middlewares/requestValidations/user/validate")


exports.createPostValidator = [
  body("type")
    .notEmpty()
    .withMessage("Post type is required")
    .isIn(["video", "image"])
    .withMessage("Type must be either 'video' or 'image'"),

  body("postHeading")
    .notEmpty()
    .withMessage("Post heading is required")
    .isLength({ min: 3 })
    .withMessage("Post heading must be at least 3 characters long"),

  body("postDescription")
    .notEmpty()
    .withMessage("Post description is required")
    .isLength({ min: 10 })
    .withMessage("Post description must be at least 10 characters long"),

    validate
];
