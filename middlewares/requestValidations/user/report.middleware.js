const { body } = require("express-validator");
const { param } = require("express-validator");
const { validate } = require("../../../middlewares/requestValidations/user/validate")
const resMessages = require("../../../constants/resMessages.constants.js")
const { isUserExist } = require("../../../helpers/dbHelpers.js")
const ReportCategory = require("../../../models/reportCategories.js")


exports.reportUserValidator = [
    body("reportUserId")
        .notEmpty()
        .withMessage(`${resMessages.validation.missingFields}: reportUserId`)
        .isMongoId()
        .withMessage(`${resMessages.validation.invalidId}: reportUserId`)
        .bail()
        .custom(async (value, { req }) => {
            const user = await isUserExist(value);
            if (!user) {
                throw new Error(resMessages.notFound.userNotFound);
            }
            if (req.user && req.user.id && req.user.id.toString() === value.toString()) {
                throw new Error(resMessages.validation.cannotReportSelf);
            }
            return true;
        }),

    body("description")
        .optional()
        .isString()
        .withMessage(`${resMessages.validation.invalidType}: description`),

    body("category")
        .notEmpty()
        .withMessage(`${resMessages.validation.missingFields}: category`)
        .isMongoId()
        .withMessage(`${resMessages.validation.invalidId}: category`)
        .bail()
        .custom(async (value) => {
            const category = await ReportCategory.findById(value);
            if (!category) {
                throw new Error(resMessages.notFound.categoryNotFound);
            }
            return true;
        }),

    body("severity")
        .notEmpty()
        .withMessage(`${resMessages.validation.missingFields}: severity`)
        .isIn(["low", "medium", "high"])
        .withMessage(`${resMessages.validation.invalidEnum}: severity`),
];
