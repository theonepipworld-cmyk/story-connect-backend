const { check } = require('express-validator');
const { validate } = require("./validate.js");
const resMessages = require("../../../constants/resMessages.constants.js");
const { errorResponse } = require('../../../utils/responseHandler.util.js');
const { isCommunityExist, isUserExist } = require("../../../helpers/dbHelpers.js")
const { param } = require("express-validator");
const { query } = require("express-validator");
const communityCategory = require("../../../models/communityCategoryModel.js")
const mongoose = require("mongoose")
const multer = require("multer");
const storage = multer.memoryStorage();

const coverImage = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file) return cb(null, true);
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, JPG and WEBP images are allowed"), false);
    }
    cb(null, true);
  },
});


const handleCoverImageUpload = (req, res, next) => {
  coverImage.single("coverImage")(req, res, function (err) {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json(errorResponse("File too large. Maximum size is 20MB"));
      }
      if (err.message) {
        return res.status(400).json(errorResponse(err.message));
      }
      return res.status(500).json(errorResponse(resMessages.serverError.processingError));
    }
    next();
  });
};

exports.createCommunityValidator = [
  handleCoverImageUpload,
  check("name")
    .notEmpty()
    .withMessage(`${resMessages.validation.missingFields}: name`),

  check("description")
    .notEmpty()
    .withMessage(`${resMessages.validation.missingFields}: description`),

  check("category")
    .notEmpty()
    .withMessage(`${resMessages.validation.missingFields}: category`),
  (async (req, res, next) => {
    try {
      const category = await communityCategory.findById(req.body.category);
      if (!category) {
        return res
          .status(400)
          .json(errorResponse(resMessages.validation.invalidCategory));
      }
      if (category.name === "Others" && !req.body.categoryName) {
        return res
          .status(400)
          .json(errorResponse(resMessages.validation.categoryName));
      }

      next();
    } catch (err) {
      next(err);
    }
  }),

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
  validate
];

exports.communityDetails = [
  param("id")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: communityId`)
    .isMongoId().withMessage(`${resMessages.validation.invalidId}: communityId`)
    .custom(async (value) => {
      const community = await isCommunityExist(value);
      if (!community) {
        throw new Error(`${resMessages.validation.notFound}: communityId`);
      }
      return true;
    }),
  validate
];

exports.getCommunityMembersValidation = [
  param("id")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: communityId`)
    .isMongoId().withMessage(`${resMessages.validation.invalidId}: communityId`)
    .custom(async (value) => {
      const community = await isCommunityExist(value);
      if (!community) {
        throw new Error(`${resMessages.validation.notFound}: communityId`);
      }
      return true;
    }),

  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer"),
  query("limit").optional().isInt({ min: 1 }).withMessage("limit must be a positive integer"),
  validate
];

exports.commmunityMemberRemove = [
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
  check("userId")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: userId`)
    .isMongoId().withMessage(`${resMessages.validation.invalidId}: userId`)
    .custom(async (value) => {
      const user = await isUserExist(value);
      if (!user) {
        throw new Error(`${resMessages.validation.notFound}: userId`);
      }
      return true;
    }),
  validate
]

exports.commmunityMemberLeave = [
  param("communityId")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: communityId`)
    .isMongoId().withMessage(`${resMessages.validation.invalidId}: communityId`)
    .custom(async (value) => {
      const community = await isCommunityExist(value)
      if (!community) {
        throw new Error(`${resMessages.validation.notFound}: communityId`);
      }
      return true;
    }),
]

exports.updateCommunityValidator = [
  handleCoverImageUpload, 
  param("id")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: communityId`)
    .isMongoId().withMessage(`${resMessages.validation.invalidId}: communityId`)
    .custom(async (value) => {
      const community = await isCommunityExist(value)
      if (!community) {
        throw new Error(`${resMessages.validation.notFound}: communityId`);
      }
      return true;
    }),
  check("name")
    .optional()
    .notEmpty()
    .withMessage(`${resMessages.validation.missingFields}: name`),

  check("description")
    .optional()
    .notEmpty()
    .withMessage(`${resMessages.validation.missingFields}: description`),

  check("category")
    .optional()
    .notEmpty()
    .withMessage(`${resMessages.validation.missingFields}: category`)
    .isMongoId()
    .withMessage(`${resMessages.validation.invalidId}: category`),

  async (req, res, next) => {
    try {
      if (req.body.category) {
        const category = await communityCategory.findById(req.body.category);
        if (!category) {
          return res
            .status(400)
            .json(errorResponse(resMessages.validation.invalidCategory));
        }
        if (category.name === "Others" && !req.body.categoryName) {
          return res
            .status(400)
            .json(errorResponse(resMessages.validation.categoryName));
        }
      }
      next();
    } catch (err) {
      next(err);
    }
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