const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const { getMessage } = require("../../../constants/locales/index.js");
const profileService = require("../../../service/user/profile.service.js");


const getLang = (req) => req.lang || 'en';

// Get own profile
exports.getProfile = async (req, res) => {
  try {
    const lang = getLang(req);
    console.log(lang)
    const { user, totalFriends } = await profileService.getProfile(req.user.id);
    const responseData = { ...user, totalFriends };
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'getSuccessful'), responseData));
  } catch (err) {
    const lang = getLang(req);
    const statusCode = err.statusCode || err.status || 500;
    const category = err.category || "error";
    let message = err.message;
    const translated = getMessage(lang, category, message);
    const finalMessage = translated && translated !== message
      ? translated
      : message || "Something went wrong";
    return res
      .status(statusCode)
      .json(errorResponse(finalMessage));
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
    const statusCode = err.statusCode || err.status || 500;
    const category = err.category || "error";
    let message = err.message;
    const translated = getMessage(lang, category, message);
    const finalMessage = translated && translated !== message
      ? translated
      : message || "Something went wrong";

    return res
      .status(statusCode)
      .json(errorResponse(finalMessage));
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
    const statusCode = err.statusCode || err.status || 500;
    const category = err.category || "error";
    let message = err.message;
    const translated = getMessage(lang, category, message);
    const finalMessage = translated && translated !== message
      ? translated
      : message || "Something went wrong";

    return res
      .status(statusCode)
      .json(errorResponse(finalMessage));
  }
};

// Get another user's profile
exports.getOtherProfile = async (req, res) => {
  try {
    const lang = getLang(req);
    const otherUserId = req.params.userId;
    const { user, totalFriends, mutualFriendsCount, isThisUserFriend, isRejected, isreqPending, conversationId,
      lastMessageId, isBlockedByMe, isBlockedByOther, iSentRequest, isThisUserRequestedMe, requestSentBy, canSendRequest } =
      await profileService.getOtherProfileService(otherUserId, req.user.id);
    const data = { ...user, totalFriends, mutualFriendsCount, isThisUserFriend, isRejected, isreqPending, conversationId, lastMessageId, isBlockedByMe, isBlockedByOther, iSentRequest, isThisUserRequestedMe, requestSentBy, canSendRequest };
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'getSuccessful'), data));
  } catch (err) {

    const lang = getLang(req);
    const statusCode = err.statusCode || err.status || 500;
    const category = err.category || "error";

    let message = err.message;

    const translated = getMessage(lang, category, message);

    const finalMessage = translated && translated !== message
      ? translated
      : message || "Something went wrong";

    return res
      .status(statusCode)
      .json(errorResponse(finalMessage));
  }
};

// Change language
exports.changeLanguage = async (req, res) => {
  const lang = getLang(req);

  try {
    const { lang: newLang } = req.body;
    if (!newLang) {
      return res
        .status(400)
        .json(errorResponse(getMessage(lang, "validation", "languageRequired")));
    }

    const result = await profileService.changeLanguageService(
      req.user.id,
      newLang
    );

    return res
      .status(200)
      .json(successResponse(getMessage(lang, "success", "updateSuccessful"), result));

  } catch (err) {

    const statusCode = err.statusCode || err.status || 500;
    const category = err.category || "error";

    let message = err.message;

    const translated = getMessage(lang, category, message);

    const finalMessage =
      translated && translated !== message
        ? translated
        : message || "Something went wrong";

    return res.status(statusCode).json(errorResponse(finalMessage));
  }
};

exports.getSearchUser = async (req, res) => {
  try {
    const lang = getLang(req);

    const result = await profileService.searchUser(req.user?.id, req.query.search);
    return res
      .status(200)
      .json(successResponse(getMessage(lang, 'success', 'getSuccessful'), result));

  } catch (err) {

    const lang = getLang(req);
    const statusCode = err.statusCode || err.status || 500;
    const category = err.category || "error";

    let message = err.message;

    const translated = getMessage(lang, category, message);

    const finalMessage =
      translated && translated !== message
        ? translated
        : message || "Something went wrong";

    return res.status(statusCode).json(errorResponse(finalMessage));
  }
};





exports.updateOthersProfile = async (req, res) => {
  try {
    const lang = getLang(req);
    const userId = req.query.userId;

    if(!userId) {
      return res.status(400).json(errorResponse(getMessage(lang, 'validation', 'userIdRequired')));
    }

    const result = await profileService.updateOthersProfile(userId, req.body, req.files);
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'updateSuccessful'), result));
  } catch (err) {
    const lang = getLang(req);
    const statusCode = err.statusCode || err.status || 500;
    const category = err.category || "error";
    let message = err.message;
    const translated = getMessage(lang, category, message);
    const finalMessage = translated && translated !== message
      ? translated
      : message || "Something went wrong";

    return res
      .status(statusCode)
      .json(errorResponse(finalMessage));
  }
};