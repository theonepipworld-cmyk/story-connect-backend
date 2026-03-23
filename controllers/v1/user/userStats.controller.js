const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const { getMessage } = require("../../../constants/locales/index.js");
const { addStatsService, getAllLikedUserService, getBadgeCountsService } = require("../../../service/user/userStats.service.js");
const userActivityStats = require("../../../constants/variables.constants.js");

const getLang = (req) => req.lang || 'en';


exports.addUserStats = async (req, res) => {
  try {
    const lang = getLang(req);
    const { postId, type, commentId, parentCommentId } = req.body;
    const { id, username } = req.user;

    const addStats = await addStatsService(postId, type, commentId, id, username, parentCommentId);

    let message = '';
    if (type === userActivityStats.userStats.Likes) {
      message = getMessage(lang, 'success', 'likeSuccessful');
    } else if (type === userActivityStats.userStats.Views) {
      message = getMessage(lang, 'success', 'viewSuccessfully');
    }

    return res.status(200).json(successResponse(message, addStats));
  } catch (err) {
    const lang = getLang(req);
    const statusCode = err.statusCode || err.status || 500;
    const category = err.category || 'error';
    const finalMessage = getMessage(lang, category, err.message) || err.message;
    return res.status(statusCode).json(errorResponse(finalMessage));
  }
};

exports.getAllLikeOrViewUser = async (req, res) => {
  try {
    const lang = getLang(req);
    const { postId, type, commentId } = req.query; 
    const getAllLikedUser = await getAllLikedUserService(postId, type, req.user._id, commentId);
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'getSuccessful'), getAllLikedUser));
  } catch (err) {
    const lang = getLang(req);
    const statusCode = err.statusCode || err.status || 500;
    const category = err.category || 'error';
    const finalMessage = getMessage(lang, category, err.message) || err.message;
    return res.status(statusCode).json(errorResponse(finalMessage));
  }
};

exports.getBadgeCounts = async (req, res) => {
  try {
    const lang = getLang(req);
    const userId = req.user.id;
    const result = await getBadgeCountsService(userId);

    return res.status(200).json(successResponse(
      getMessage(lang, 'success', 'fetchSuccessfully'),
      result
    ));
  } catch (err) {
    const lang = getLang(req);
    const statusCode = err.statusCode || err.status || 500;
    const finalMessage = getMessage(lang, err.category || 'error', err.message) || err.message;
    return res.status(statusCode).json(errorResponse(finalMessage));
  }
};
