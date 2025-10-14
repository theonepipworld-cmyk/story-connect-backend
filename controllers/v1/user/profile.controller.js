const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const { getMessage } = require("../../../constants/locales/index.js");
const profileService = require("../../../service/user/profile.service.js");


const getLang = (req) => req.lang || 'en';

// Get own profile
exports.getProfile = async (req, res) => {
  try {
    const lang = getLang(req);
    const { user, totalFriends } = await profileService.getProfile(req.user.id);
    const responseData = { ...user, totalFriends };
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'getSuccessful'), responseData));
  } catch (err) {
    const lang = getLang(req);
    return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const lang = getLang(req);
    const result = await profileService.updateProfile(req.user.id, req.body, req.files);
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'updateSuccessful'), result));
  } catch (err) {
    const lang = getLang(req);
    return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
  }
};

// Delete profile
exports.deleteProfile = async (req, res) => {
  try {
    const lang = getLang(req);
    const result = await profileService.deleteProfile(req.user.id);
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'deleteSuccessful'), result));
  } catch (err) {
    const lang = getLang(req);
    return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
  }
};

// Get another user's profile
exports.getOtherProfile = async (req, res) => {
  try {
    const lang = getLang(req);
    const otherUserId = req.params.userId;
    const { user, totalFriends, mutualFriendsCount, isThisUserFriend, isreqPending } =
      await profileService.getOtherProfileService(otherUserId, req.user.id);

    const data = { ...user, totalFriends, mutualFriendsCount, isThisUserFriend, isreqPending };
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'getSuccessful'), data));
  } catch (err) {
    const lang = getLang(req);
    return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
  }
};

// Change language
exports.changeLanguage = async (req, res) => {
  try {
    const lang = getLang(req);
    const { lang: newLang } = req.body;
    const result = await profileService.changeLanguageService(req.user.id, newLang);
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'updateSuccessful'), result));
  } catch (err) {
    const lang = getLang(req);
    return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
  }
};
