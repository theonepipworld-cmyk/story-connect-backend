const resMessages = require("../../../constants/resMessages.constants.js")
const multer = require('multer');
const { check } = require('express-validator');
const { validate } = require("../../../middlewares/requestValidations/user/validate")

const storage = multer.memoryStorage();
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const phoneRegex = /^\+?[0-9]{4,15}$/;
const avatarUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, JPG and WEBP images are allowed'), false);
    }
    cb(null, true);
  }
});

exports.avatarUpload = avatarUpload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'profileCoverImage', maxCount: 1 }]);


exports.updateProfileValidator = [
  check("relationship")
    .optional()
    .if((value) => value !== undefined && value !== null && value !== '')
    .custom(value => {
      const allowedValues = ['single', 'married', 'divorced', 'widowed', 'separated', 'other'];
      return allowedValues.includes(value.toLowerCase());
    })
    .withMessage(`${resMessages.validation.invalidEnum} : In relationship`),

  check("status")
    .optional()
    .if((value) => value !== undefined && value !== null && value !== '')
    .custom(value => {
      const allowedValues = ['active', 'inactive', 'banned', 'deleted'];
      return allowedValues.includes(value.toLowerCase());
    })
    .withMessage(`${resMessages.validation.invalidEnum} : In status`),

  check("profession")
    .optional()
    .if((value) => value !== undefined && value !== null && value !== '')
    .custom(value => {
      const allowedValues = ['nurse', 'doctor', 'scientist', 'professor', 'artist', 'chef', 'manager', 'pilot', 'firefighter', 'developer', 'other'];
      return allowedValues.includes(value.toLowerCase());
    })
    .withMessage(`${resMessages.validation.invalidEnum} : In profession`),

  // Conditional field for manualProfession if profession === "other"
  check("manualProfession")
    .if((value, { req }) => req.body.profession && req.body.profession.toLowerCase() === 'other')
    .notEmpty()
    .withMessage(`${resMessages.validation.professionName}`),

  check("entryYear")
    .optional()
    .if((value) => value !== undefined && value !== null && value !== '')
    .custom(value => {
      if (!/^\d{4}$/.test(value)) {
        throw new Error(resMessages.validation.invalidYearFormat);
      }
      const year = parseInt(value);
      const currentYear = new Date().getFullYear();
      if (year > currentYear) {
        throw new Error(resMessages.validation.invalidYearFormat);
      }
      return true;
    }),

  check("dateOfBirth")
    .optional()
    .if((value) => value !== undefined && value !== null && value !== '')
    .custom(value => {
      if (!dateRegex.test(value)) {
        throw new Error(resMessages.validation.invalidDateOfBirthFormat);
      }
      const dob = new Date(value);
      if (isNaN(dob.getTime())) {
        throw new Error(resMessages.validation.invalidDateOfBirth);
      }
      const today = new Date();
      if (dob >= today) {
        throw new Error(resMessages.validation.invalidDateOfBirth);
      }
      return true;
    }),

  check("phone")
    .optional()
    .if((value) => value !== undefined && value !== null && value !== '')
    .matches(phoneRegex)
    .withMessage(resMessages.validation.invalidPhoneNumber),

  validate
];
