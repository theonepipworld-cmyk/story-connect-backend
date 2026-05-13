// middlewares/auth/authorizeRoles.js

const { errorResponse } = require("../../../utils/responseHandler.util");
const resMessages = require("../../../constants/resMessages.constants");

exports.authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {

    // Check if user exists
    if (!req.user) {
      return res
        .status(401)
        .json(errorResponse(resMessages.auth.unauthorizedAccess));
    }
    

    // Check if user is active
    console.log("User status in authorizeRoles middleware:", req.user);
    if (req.user.status !== 'active') {
      return res
        .status(403)
        .json(errorResponse("Your account is inactive. Please contact admin."));
    }

    // Check role authorization
    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json(errorResponse(resMessages.auth.unauthorizedAccess));
    }

    next();
  };
};