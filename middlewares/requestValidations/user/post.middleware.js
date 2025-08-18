const { body } = require("express-validator");
const { validate } = require("../../../middlewares/requestValidations/user/validate")
const resMessages = require("../../../constants/resMessages.constants.js")



exports.createPostValidator = [
  body("type")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: type`)
    .isIn(["video", "image"]).withMessage(resMessages.validation.typeError),

  body("postHeading")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: postHeading`),

  body("postDescription")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: postDescription`),

  validate
];
