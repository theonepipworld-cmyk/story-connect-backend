const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");
const profileService = require("../../../service/user/profile.service.js")

exports.getProfile = async (req, res) => {
  try {
    const user = await profileService.getProfile(req.user.id);
    return res.status(200).json(successResponse(resMessages.success.fetchSuccessful, user));
  } catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const result = await profileService.updateProfile(req.user.id, req.body, req.files);
    return res.status(200).json(successResponse(resMessages.success.updateSuccessful, result));
  } catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
};


exports.deleteProfile = async (req, res) => {
  try {
    const result = await profileService.deleteProfile(req.user.id);
    return res.status(200).json(successResponse(resMessages.success.deleteSuccessful, result));
  } catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
};