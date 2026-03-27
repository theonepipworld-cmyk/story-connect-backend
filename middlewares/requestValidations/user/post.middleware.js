const { check } = require('express-validator');
const { validate } = require("../../../middlewares/requestValidations/user/validate");
const resMessages = require("../../../constants/resMessages.constants.js");
const { errorResponse } = require('../../../utils/responseHandler.util.js');


const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"]);
const VIDEO_MIMES = new Set(["video/mp4", "video/mpeg", "video/webm", "video/quicktime"]);


const resolveMediaType = (req, res, next) => {
  const uploadedFiles = req.files || [];


  if (!uploadedFiles.length) {
    req.body.type = null;
    return next();
  }

  let hasImage = false;
  let hasVideo = false;

  for (const file of uploadedFiles) {
    if (IMAGE_MIMES.has(file.mimetype)) hasImage = true;
    else if (VIDEO_MIMES.has(file.mimetype)) hasVideo = true;
    else return res.status(400).json(
      errorResponse(
        `Invalid file type for "${file.originalname}". ` +
        `Allowed image types: ${[...IMAGE_MIMES].join(", ")} | ` +
        `Allowed video types: ${[...VIDEO_MIMES].join(", ")}`
      )
    );
  }

  req.body.type = hasImage && hasVideo ? "both" : hasImage ? "image" : "video";
  next();
};


const ALLOWED_CREATE_FIELDS = [
  "postType",
  "postHeading",
  "postDescription",
  "communityId",
  "hashTags",
  "hashTags[]",       
  "storyOfTheMonth",   
  "videoOfTheMonth",    
  "type",               
  "userId",             
];

const ALLOWED_UPDATE_FIELDS = ["postHeading", "postDescription", "hashtags"];


exports.createPostValidator = [
  check("postType")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: postType`)
    .isIn(["profile", "community"]).withMessage(`${resMessages.validation.postForError}`),

  check("postHeading")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: postHeading`),

  check("postDescription")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: postDescription`),

  check("communityId").custom((value, { req }) => {
    if (req.body.postType === "community") {
      if (!value) throw new Error(`${resMessages.validation.missingFields}: communityId`);
    } else if (req.body.postType === "profile" && value) {
      throw new Error(`communityId is not allowed when postType is profile`);
    }
    return true;
  }),


  check("storyOfTheMonth")
    .optional()
    .isIn(["true", "false", true, false]).withMessage("storyOfTheMonth must be a boolean"),

 
  check("videoOfTheMonth")
    .optional()
    .isIn(["true", "false", true, false]).withMessage("videoOfTheMonth must be a boolean"),

  // Reject unknown fields
  check().custom((_, { req }) => {
    const invalid = Object.keys(req.body).filter(k => !ALLOWED_CREATE_FIELDS.includes(k));
    if (invalid.length) throw new Error(`Invalid fields in request: ${invalid.join(", ")}`);
    return true;
  }),

  resolveMediaType, 
  validate,
];


exports.updatePostValidator = [
  check("postHeading")
    .optional({ checkFalsy: true })
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: postHeading`),

  check("postDescription")
    .optional({ checkFalsy: true })
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: postDescription`),

  check("hashtags")
    .optional({ checkFalsy: true })
    .isArray().withMessage("hashtags must be an array")
    .custom((tags) => {
      tags.forEach(tag => {
        if (typeof tag !== "string") throw new Error("each hashtag must be a string");
      });
      return true;
    }),

  check().custom((_, { req }) => {
    const invalid = Object.keys(req.body).filter(k => !ALLOWED_UPDATE_FIELDS.includes(k));
    if (invalid.length) throw new Error(`Invalid fields in request: ${invalid.join(", ")}`);
    return true;
  }),

  validate,
];