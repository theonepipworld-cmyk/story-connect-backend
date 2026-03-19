const postService = require("../../../service/user/post.service.js")
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");

const { getMessage } = require("../../../constants/locales/index.js")
const dashboardService = require("../../../service/admin/dashboard.service.js")

const getLang = (req) => req.lang || 'en';
exports.getDashBoardData = async (req, res) => {
    try {
        const lang = getLang(req);
        const result = await dashboardService.dashboardDataService(req.user.id);
        return res.status(200).json(successResponse(
            getMessage(lang, 'success', 'fetchSuccessfully'),
            result
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

exports.getAllUser = async (req, res) => {
    try {
        const lang = getLang(req);
        const {
            page = 1,
            limit = 10,
            search,
            status,
        } = req.query;

        const result = await dashboardService.getAllUserService(
            page,
            limit,
            search,
            status
        );

        return res.status(200).json(
            successResponse(
                getMessage(lang, 'success', 'fetchSuccessfully'),
                result
            )
        );
    } catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage =
            getMessage(lang, category, err.message) || err.message;

        return res.status(statusCode).json(errorResponse(finalMessage));
    }
};


exports.updateStatusOfUser = async (req, res) => {
    try {
        const lang = getLang(req);
        const { action, userId } = req.params;
        const loginUserId = req.user.id;

        const result = await dashboardService.updateStatusOfUser(loginUserId, action, userId);
        return res.status(200).json(
            successResponse(
                getMessage(lang, 'success', 'updatedSuccessfully'),
                result
            )
        );
    } catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage =
            getMessage(lang, category, err.message) || err.message;

        return res.status(statusCode).json(errorResponse(finalMessage));
    }
};

