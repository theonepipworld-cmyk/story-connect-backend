const { check } = require('express-validator');
const resMessages = require("../../../constants/resMessages.constants.js")
const { validate } = require("../../../helpers/dbHelpers.js")

// Login Validator
const loginValidator = [
  check("email")
    .not().isEmpty().withMessage(resMessages.validation.missingFields)
    .isEmail().withMessage(resMessages.validation.invalidEmail),

  check("password")
    .not().isEmpty().withMessage(resMessages.validation.missingFields),
  validate
];

// Signup Validator
const signupValidator = [
  check("email")
    .not().isEmpty().withMessage(resMessages.validation.missingFields)
    .isEmail().withMessage(resMessages.validation.emailValidate),

  check("password")
    .not().isEmpty().withMessage(resMessages.validation.missingFields)
    .isLength({ min: 6 }).withMessage(resMessages.validation.passwordMinLength),

  check("confirmPassword")
    .not().isEmpty().withMessage(resMessages.validation.missingFields)
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error(resMessages.validation.passwordsDoNotMatch);
      }
      return true;
    }),
  validate
];

module.exports = {
  loginValidator,
  signupValidator
};
