// middlewares/auth/isAuthenticated.js
const jwt = require('jsonwebtoken');
const { jwt_secret } = require('../../../config/secretVariables');
const { errorResponse } = require('../../../utils/responseHandler.util');
const resMessages = require("../../../constants/resMessages.constants");
const User = require("../../../models/user.model")

exports.isAuthenticated = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(errorResponse(resMessages.auth.unauthorizedAccess));
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, jwt_secret);
    req.user = decoded;
    const userFromDB =  User.findById(decoded.id).select('language');
    req.lang = userFromDB?.language || 'en';
    next();
  } catch (err) {
    return res.status(401).json(errorResponse(resMessages.auth.invalidToken));
  }
};
