const { check, validationResult } = require('express-validator');
const resMessages = require("../../../constants/resMessages.constants.js")
const { validate } = require("../../../middlewares/requestValidations/user/validate")

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
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const phoneRegex = /^[0-9]{4,15}$/;

const signupValidator = [
  // Email
  check("email")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: email`)
    .isEmail().withMessage(resMessages.validation.emailValidate),

  // Password
  check("password")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: password`)
    .isLength({ min: 6 }).withMessage(resMessages.validation.passwordMinLength),

  // Confirm Password
  check("confirmPassword")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: confirmPassword`)
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error(resMessages.validation.passwordsDoNotMatch);
      }
      return true;
    }),

  // Username
  check("username")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: username`),

  // Phone number
  check("phone")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: phone`)
    .matches(phoneRegex).withMessage(resMessages.validation.invalidPhoneNumber),

  // Date of birth
  check("dateOfBirth")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: dateOfBirth`)
    .custom(value => {
      if (!dateRegex.test(value)) {
        throw new Error(resMessages.validation.invalidDateOfBirthFormat);
      }
      const dob = new Date(value);
      if (isNaN(dob.getTime())) {
        throw new Error(resMessages.validation.invalidDateOfBirth);
      }
      return true;
    }),

  validate
];


const forgotPasswordValidator = [
  check("email")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: email`)
    .isEmail().withMessage(resMessages.validation.invalidEmail),
  validate
];


const resetPasswordValidator = [
  check("token")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: token`),

  check("newPassword")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: newPassword`)
    .isLength({ min: 6 })
    .withMessage(resMessages.validation.passwordTooShort),

  check("confirmPassword")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: confirmPassword`)
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error(resMessages.validation.passwordsDoNotMatch);
      }
      return true;
    }),
  validate
];

module.exports = {
  loginValidator,
  signupValidator,
  forgotPasswordValidator,
  resetPasswordValidator
};
