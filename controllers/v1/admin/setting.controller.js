const postService = require("../../../service/user/post.service.js")
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");

const { getMessage } = require("../../../constants/locales/index.js")
const settingService = require("../../../service/admin/settingService.js")



const getLang = (req) => req.lang || 'en';

exports.allSuspendedUsers = async (req, res) => {
    try {
        const lang = getLang(req);
        const pageNo = parseInt(req.query.pageNo) || 1
        const pageSize = parseInt(req.query.pageSize) || 10
        const result = await settingService.allSuspendedUsersService(pageNo, pageSize);
        return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), result)); F
    }
    catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
};


exports.addFaq = async (req, res) => {
    try {
        const lang = getLang(req);
        const { title, content } = req.body
        const { data } = await settingService.addFaqService(title, content, req.user.id);
        return res.status(200).json(successResponse(getMessage(lang, 'success', 'addSuccessfully'), data));
    }
    catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
};


exports.updateFaq = async (req, res) => {
    try {
        const lang = getLang(req);
        const { status, faqId } = req.body
        const { updatedFaq } = await settingService.updateFaqStatus(status, faqId, req.user.id);
        return res.status(200).json(successResponse(getMessage(lang, 'success', 'updateSuccessful'), updatedFaq,))
    }
    catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
};


exports.deleteFaq = async (req, res) => {
    try {
        const lang = getLang(req);
        const { faqId } = req.params;
        const deletedFaq = await settingService.deleteFaqService(faqId, req.user.id);
        return res.status(200).json(
            successResponse(getMessage(lang, 'success', 'deleteSuccessful'), deletedFaq)
        );
    }
    catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
};


exports.userSuspensionAction = async (req, res) => {
    try {
        const lang = getLang(req);
        const userId = req.params.userId;
        const result = await settingService.removeSuspensionUserService(userId, req.user.id);
        return res.status(200).json(
            successResponse(getMessage(lang, 'success', 'userUnsuspend'), result)
        );
    }
    catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
}



exports.changePassword = async (req, res) => {
    try {
        const id = req.user.id;
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json(errorResponse("Old password and new password are required"));
        }
        
        const result = await settingService.changePassword(id, oldPassword, newPassword);
        if (!result.success) { return res.status(400).json(errorResponse("Something went wrong", result.message)); }
        return res.status(200).json(successResponse(result.message));
        
    } catch (error) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
};