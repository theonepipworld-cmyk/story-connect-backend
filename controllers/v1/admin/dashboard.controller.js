const postService = require("../../../service/user/post.service.js")
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");
const { uploadFileToS3 } = require('../../../utils/s3.util.js');
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
            pageNo = 1,
            pageSize = 10,
            search,
            status,    
        } = req.query;

        const result = await dashboardService.getAllUserService(
            pageNo,
            pageSize,
            search,
            accountState,
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

