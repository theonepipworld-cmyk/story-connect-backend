const { check } = require('express-validator');
const { validate } = require("../../../middlewares/requestValidations/user/validate");
const resMessages = require("../../../constants/resMessages.constants.js");
const { errorResponse } = require('../../../utils/responseHandler.util.js');

exports.createPostValidator = [
  check("postFor")
    .notEmpty().withMessage(`${resMessages.validation.missingFields}: postFor`)
    .isIn(["profile", "community"])
    .withMessage(`${resMessages.validation.postForError}`),

  check("postHeading")
    .notEmpty()
    .withMessage(`${resMessages.validation.missingFields}: postHeading`),

  check("postDescription")
    .notEmpty()
    .withMessage(`${resMessages.validation.missingFields}: postDescription`),

  // Detect type based on media files
  (req, res, next) => {
    const files = req.files || [];

    if (!files.length) {
      req.body.type = null; // no media
      return next();
    }

    const imageMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const videoMimes = ["video/mp4", "video/mpeg", "video/webm", "video/quicktime"];

    let hasImage = false;
    let hasVideo = false;

    for (const file of files) {
      if (imageMimes.includes(file.mimetype)) {
        hasImage = true;
      } else if (videoMimes.includes(file.mimetype)) {
        hasVideo = true;
      } else {
        return res.status(400).json(
          errorResponse(`${resMessages.validation.invalidFileType}: ${file.originalname}`)
        );
      }
    }

    if (hasImage && hasVideo) {
      req.body.type = "both";
    } else if (hasImage) {
      req.body.type = "image";
    } else if (hasVideo) {
      req.body.type = "video";
    }

    next();
  },

  validate
];
