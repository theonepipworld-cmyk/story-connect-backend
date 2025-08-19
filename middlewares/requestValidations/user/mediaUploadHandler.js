const multer = require("multer");
const storage = multer.memoryStorage();
const { errorResponse } = require("../../../utils/responseHandler.util");
const resMessages = require("../../../constants/resMessages.constants");

// Allow up to 5 files in `media` field
const upload = multer({
  storage,
  limits: { files: 5 }, 
}).array("mediaUrls", 5);

function mediaUploadHandler(req, res, next) {
  upload(req, res, function (err) {
    if (err) {
      console.error("Multer error during upload:", err);

      if (err.code === "LIMIT_FILE_COUNT") {
        return res
          .status(400) 
          .json(errorResponse(resMessages.serverError.limitExccessedError));
      }

      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json(errorResponse(resMessages.serverError.fileSizeError));
      }

      return res
        .status(500)
        .json(errorResponse(resMessages.serverError.processingError));
    }
    next();
  });
}

module.exports = { mediaUploadHandler };
