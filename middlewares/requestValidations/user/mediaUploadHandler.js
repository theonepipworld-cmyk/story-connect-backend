const multer = require("multer");
const path = require("path");
const { Upload } = require("@aws-sdk/lib-storage");
const { s3 } = require("../../../utils/s3.util")
const { errorResponse } = require("../../../utils/responseHandler.util");
const resMessages = require("../../../constants/resMessages.constants");
const envVariables = require("../../../config/secretVariables");



class S3StreamStorage {
  constructor({ folder = "uploads" }) {
    this.folder = folder;
  }

  _handleFile(req, file, cb) {
    try {
      const ext = path.extname(file.originalname);
      const baseName = path
        .basename(file.originalname, ext)
        .replace(/\s+/g, "_");
      const key = `${this.folder}/${baseName}_${Date.now()}${ext}`;

      const upload = new Upload({
        client: s3,
        params: {
          Bucket: envVariables.aws_s3_bucket_name,
          Key: key,
          Body: file.stream,
          ContentType: file.mimetype,
        },
        queueSize: 4,
        partSize: 10 * 1024 * 1024,
        leavePartsOnError: false,
      });

      upload
        .done()
        .then(() => {
          cb(null, {
            key,
            location: `https://${envVariables.aws_s3_bucket_name}.s3.${envVariables.aws_s3_region}.amazonaws.com/${key}`,
          });
        })
        .catch((err) => {
          console.error("S3 stream upload failed:", err);
          cb(err);
        });
    } catch (err) {
      cb(err);
    }
  }

  _removeFile(req, file, cb) {
    cb(null);
  }
}



function createUploadHandler({ folder, fieldName = "mediaUrls", maxFiles = 5 }) {
  const upload = multer({
    storage: new S3StreamStorage({ folder }),
    limits: {
      files: maxFiles,
      fileSize: 150 * 1024 * 1024,
    },
  }).array(fieldName, maxFiles);

  return function (req, res, next) {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        console.error("Multer error:", err);

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
          .status(400)
          .json(errorResponse(resMessages.serverError.processingError));
      }

      if (err) {
        console.error("Upload error:", err);
        return res
          .status(500)
          .json(errorResponse(resMessages.serverError.processingError));
      }

      next();
    });
  };
}



const mediaUploadHandler = createUploadHandler({
  folder: "posts",
  fieldName: "mediaUrls",
  maxFiles: 5,
});

const chatUploadHandler = createUploadHandler({
  folder: "chats",
  fieldName: "mediaUrls",
  maxFiles: 5,
});

const reportUploadHandler = createUploadHandler({
  folder: "reports",
  fieldName: "mediaUrls",
  maxFiles: 5,
});

module.exports = { mediaUploadHandler, chatUploadHandler, createUploadHandler, reportUploadHandler };