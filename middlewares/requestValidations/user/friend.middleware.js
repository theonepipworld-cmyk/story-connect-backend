const { check } = require('express-validator');
const { validate } = require("./validate.js");
const resMessages = require("../../../constants/resMessages.constants.js");
const { errorResponse } = require('../../../utils/responseHandler.util.js');
const { isCommunityExist, isUserExist } = require("../../../helpers/dbHelpers.js")
const { param } = require("express-validator");
const { query } = require("express-validator");
const communityCategory = require("../../../models/communityCategoryModel.js")
const mongoose = require("mongoose")


exports.sendFriendReq = [
    param("id")
        .notEmpty().withMessage(`${resMessages.validation.missingFields}: userId`)
        .isMongoId().withMessage(`${resMessages.validation.invalidId}: userId`)
        .custom(async (value) => {
            const User = await isUserExist(value);
            if (!User) {
                throw new Error(`${resMessages.validation.notFound}: userId`);
            }
            return true;
        }),
    validate
];

exports.acceptRejectReq = [
    param("id")
        .notEmpty().withMessage(`${resMessages.validation.missingFields}: userId`)
        .isMongoId().withMessage(`${resMessages.validation.invalidId}: userId`)
        .custom(async (value, { req }) => { 
            const user = await isUserExist(value);
            if (!user) {
                throw new Error(`${resMessages.notFound.notFound}: userId`);
            }
            return true;
        }),

    check("action")
        .notEmpty().withMessage(`${resMessages.validation.missingFields}: action`)
        .isIn(["accepted", "rejected"]).withMessage(`${resMessages.validation.invalidFriendAction}`),
        
    validate
];
