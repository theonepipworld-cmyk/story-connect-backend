const postService = require("../../../service/user/post.service.js")
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");
const { uploadFileToS3 } = require('../../../utils/s3.util.js');
const { getMessage } = require("../../../constants/locales/index.js")
const adminPostService = require("../../../service/admin/postService.js")

const getLang = (req) => req.lang || 'en';
exports.addStoryAndVideoOfMonth = async (req, res) => {
    try {
        const lang = getLang(req);
        const { postId, type } = req.body
        const result = await adminPostService.addStoryAndVideoOfMonthService(postId, type);
        return res.status(200).json(successResponse(
            getMessage(lang, 'success', 'addSuccessfully'),
            result.token
        ));
    }
    catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
}

exports.removeStoryAndVideoOfMonth = async (req, res) => {
    try {
        const lang = getLang(req);
        const { postId, type } = req.body
        const result = await adminPostService.removeStoryAndVideoOfMonthService(postId, type);
        return res.status(200).json(successResponse(
            getMessage(lang, 'success', 'removeSuccessfully'),
            result.token
        ));
    }
    catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
}

exports.getHighlightedPosts = async (req, res) => {
    try {
        const { storyOfTheMonthPosts, videoOfTheMonthPosts } = await adminPostService.getHighlightedPostsService();
        const data = { storyOfTheMonthPosts, videoOfTheMonthPosts };
        return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), data));
    } catch (err) {
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
};
