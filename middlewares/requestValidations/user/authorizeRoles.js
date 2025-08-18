// middlewares/auth/authorizeRoles.js
const { errorResponse } = require('../../../utils/responseHandler.util');
const resMessages = require("../../../constants/resMessages.constants");

exports.authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    console.log(req.user)
    console.log(allowedRoles)
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json(errorResponse(resMessages.auth.unauthorizedAccess));
    }
    next();
  };
};
