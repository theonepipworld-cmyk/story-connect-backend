const { check } = require('express-validator');
const { validate } = require("./validate.js");
const resMessages = require("../../../constants/resMessages.constants.js");
const { errorResponse } = require('../../../utils/responseHandler.util.js');
const { isCommunityExist, isUserExist } = require("../../../helpers/dbHelpers.js")
const { param } = require("express-validator");
const { query } = require("express-validator");
const mongoose = require("mongoose")

exports.validateUser =[
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
]