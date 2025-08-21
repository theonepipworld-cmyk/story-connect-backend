const { check } = require('express-validator');
const { validate } = require("./validate.js");
const resMessages = require("../../../constants/resMessages.constants.js");
const { errorResponse } = require('../../../utils/responseHandler.util.js');
const {isCommunityExist } =require("../../../helpers/dbHelpers.js")


exports.createCommunityValidator = [
  check("name")
    .notEmpty()
    .withMessage(`${resMessages.validation.missingFields}: name`),

  check("description")
    .notEmpty()
    .withMessage(`${resMessages.validation.missingFields}: description`),

  check("category")
    .notEmpty()
    .withMessage(`${resMessages.validation.missingFields}: category`),
  (req, res, next) => {
    if (req.body.category === "others" && !req.body.categoryName) {
      return res
        .status(400)
        .json(errorResponse(resMessages.validation.categoryName));
    }
    next();
  },

  (req, res, next) => {
    const files = req.files || {};
    if (!files.communityImage || !files.communityImage.length) {
      return next(); 
    }
    const file = files.communityImage[0];
    const imageMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!imageMimes.includes(file.mimetype)) {
      return res
        .status(400)
        .json(errorResponse(`${resMessages.validation.invalidFileType}: ${file.originalname}`));
    }
    next();
  },

  validate
];

exports.joinedCommunity = [
 check("communityId")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: communityId`)
    .isMongoId().withMessage(`${resMessages.validation.invalidId}: communityId`)
    .custom(async (value) => {
      const community = await isCommunityExist(value)
      if (!community) {
        throw new Error(`${resMessages.validation.notFound}: communityId`);
      }
      return true;
    }),
  check("role")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: role`)
    .isIn(["admin", "user"])
    .withMessage(`${resMessages.validation.inValidRole}`),
];