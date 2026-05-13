// middlewares/auth/authorizeRoles.js

const { errorResponse } = require("../../../utils/responseHandler.util");
const resMessages = require("../../../constants/resMessages.constants");
const User = require("../../../models/user.model");


const checkUserDetails = async (userId) => {
  const user = await User.findById(userId);
  return user;
};

exports.authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => { 
    try {
     
      if (!req.user) {
        return res.status(401).json(errorResponse(resMessages.auth.unauthorizedAccess));
      }

  
      const userDetails = await checkUserDetails(req.user.id);


      if (!userDetails) {
        return res.status(401).json(errorResponse(resMessages.auth.unauthorizedAccess));
      }

      if (userDetails.status !== "active") {
        return res.status(403).json(errorResponse("Your account is inactive. Please contact admin."));
      }

  
      if (!allowedRoles.includes(userDetails.role)) {
        return res.status(403).json(errorResponse(resMessages.auth.unauthorizedAccess));
      }

      next();
    } catch (error) {
      console.error("Error in authorizeRoles middleware:", error);
      return res.status(500) .json(errorResponse("Something went wrong. Please try again later.", error.message));
    }
  };
};