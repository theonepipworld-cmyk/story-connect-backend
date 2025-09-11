const { body } = require("express-validator");
const { param } = require("express-validator");
const { validate } = require("../../../middlewares/requestValidations/user/validate")
const resMessages = require("../../../constants/resMessages.constants.js")
const { isUserExist, isConversationExist } = require("../../../helpers/dbHelpers.js")


exports.sendMessageValidator = [
    body("receiverId")
        .notEmpty()
        .withMessage(`${resMessages.validation.missingFields}: receiverId`)
        .isMongoId()
        .withMessage(`${resMessages.validation.invalidId}: receiverId`)
        .bail()
        .custom(async (receiverId) => {
            const user = await isUserExist(receiverId);
            if (!user) {
                throw new Error(resMessages.notFound.userNotFound);
            }
            return true;
        }),

    body("message")
        .optional()
        .isString()
        .withMessage(`${resMessages.validation.invalidType}: message`),

    body("type")
        .optional()
        .isIn(["text", "image", "video", "file"])
        .withMessage(`${resMessages.validation.invalidType}: type`),

    body().custom((value, { req }) => {
        const hasMessage = req.body.message && req.body.message.trim() !== "";
        const hasFiles = req.files && req.files.length > 0;

        if (!hasMessage && !hasFiles) {
            throw new Error(resMessages.validation.mediaorTextMissing);
        }
        return true;
    }),

    validate,
];

exports.MessageValidator = [
    param("conversationId")
        .notEmpty()
        .withMessage(`${resMessages.validation.missingFields}: conversationId`)
        .isMongoId()
        .withMessage(`${resMessages.validation.invalidId}: conversationId`)
        .bail()
        .custom(async (conversationId) => {
            const conversation = await isConversationExist(conversationId);
            if (!conversation) {
                throw new Error(`${resMessages.notFound.conversationNotFound}`);
            }
            return true;
        }),
    validate
];

exports.updateMessageValidator = [
    body("conversationId")
        .notEmpty()
        .withMessage(`${resMessages.validation.missingFields}: conversationId`)
        .isMongoId()
        .withMessage(`${resMessages.validation.invalidId}: conversationId`)
        .bail()
        .custom(async (conversationId) => {
            const conversation = await isConversationExist(conversationId);
            if (!conversation) {
                throw new Error(`${resMessages.notFound.conversationNotFound}`);
            }
            return true;
        }),

    body("messageId")
        .notEmpty()
        .withMessage(`${resMessages.validation.missingFields}: messageId`)
        .isMongoId()
        .withMessage(`${resMessages.validation.invalidId}: messageId`),

    body("text")
        .notEmpty()
        .withMessage(`${resMessages.validation.missingFields}: text`)
        .isString()
        .withMessage(`${resMessages.validation.invalidType}: text`)
        .trim(),

    validate
]
exports.deleteMessageValidator = [
    param("conversationId")
        .notEmpty()
        .withMessage(`${resMessages.validation.missingFields}: conversationId`)
        .isMongoId()
        .withMessage(`${resMessages.validation.invalidId}: conversationId`)
        .bail()
        .custom(async (conversationId) => {
            const conversation = await isConversationExist(conversationId);
            if (!conversation) {
                throw new Error(`${resMessages.notFound.conversationNotFound}`);
            }
            return true;
        }),

    param("messageId")
        .notEmpty()
        .withMessage(`${resMessages.validation.missingFields}: messageId`)
        .isMongoId()
        .withMessage(`${resMessages.validation.invalidId}: messageId`),
    validate
]
