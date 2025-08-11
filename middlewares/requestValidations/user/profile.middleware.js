const { body, validationResult } = require('express-validator');
const { jwt_secret } = require('../../../config/secretVariables.js');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js")
const jwt = require('jsonwebtoken');
const multer = require('multer');

const storage = multer.memoryStorage();

const avatarUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and WEBP images are allowed'), false);
    }
    cb(null, true);
  }
});

exports.avatarUpload = avatarUpload.fields([{ name: 'avatar', maxCount: 1 }]);

exports.authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json(errorResponse(resMessages.validation.authTokenMissing));
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwt_secret);
    req.user = { userId: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json(errorResponse('Invalid or expired token'));
  }
};