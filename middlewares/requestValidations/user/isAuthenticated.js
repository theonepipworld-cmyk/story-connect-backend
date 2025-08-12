// middlewares/auth/isAuthenticated.js
const jwt = require('jsonwebtoken');
const { jwt_secret } = require('../../../config/secretVariables');
const { errorResponse } = require('../../../utils/responseHandler.util');
const resMessages = require("../../../constants/resMessages.constants");

exports.isAuthenticated = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(errorResponse(resMessages.auth.unauthorizedAccess));
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, jwt_secret);
    // console.log(decoded,"decode")
    req.user = decoded; // contains { email, userId, role }
    next();
  } catch (err) {
    return res.status(401).json(errorResponse(resMessages.auth.invalidToken));
  }
};
