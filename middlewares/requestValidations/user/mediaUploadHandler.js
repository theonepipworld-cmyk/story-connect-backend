const multer = require("multer");
const storage = multer.memoryStorage();
const { errorResponse } = require('../../../utils/responseHandler.util');
const resMessages = require("../../../constants/resMessages.constants");

const upload = multer({
  storage,
  limits: { files: 5 }, 
}).array("media", 5); 

function mediaUploadHandler(req, res, next) {
  upload(req, res, function (err) {
    if (err) {
        console.log(err,"errerr")
      if (err.code === "LIMIT_FILE_COUNT") {
        return res
          .status(500)
          .json(errorResponse(resMessages.serverError.limitExccessedError));
      }
      // other multer errors
      return res
        .status(500)
        .json(errorResponse(resMessages.serverError.processingError));
    }
    next();
  });
}

module.exports = { mediaUploadHandler };
