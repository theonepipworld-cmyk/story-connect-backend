const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const { getMessage } = require("../../../constants/locales/index.js");
const { getReportCategoryService, reportUserService } = require("../../../service/user/report.service.js");
const adminReportServices = require("../../../service/admin/reportService.js")


const getLang = (req) => req.lang || 'en';


exports.getAllReportUser = async (req, res) => {
    try {
        const lang = getLang(req);
        const pageNo = parseInt(req.query.pageNo) || 1
        const pageSize = parseInt(req.query.pageSize) || 10
        const status = req.query.status || ""
        const severity = req.query.severity || ""
        const search = req.query.search || ""
        const reportUser = await adminReportServices.allReportUser(pageNo, pageSize, status, severity, search);
        return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), reportUser));
    }
    catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
};


exports.getReportDetails = async (req, res) => {
    try {
        const lang = getLang(req);
        const reportUserDetails = await adminReportServices.getReportDetailsService(req.params.reportId);
        return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), reportUserDetails));
    }
    catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
};


exports.reportAction = async (req, res) => {
   
    try {
        const lang = getLang(req);
        const { reportId, action, reason } = req.body
        const updateReportStatus = await adminReportServices.reportActionService(reportId, action, reason);
        
        return res.status(200).json(successReponse("Report action taken successfully", updateReportStatus))
    }catch(err) {
            const lang = getLang(req);
            const statusCode = err.statusCode || err.status || 500;
            const category = err.category || 'error';
            const finalMessage = getMessage(lang, category, err.message) || err.message;
            return res.status(statusCode).json(errorResponse(finalMessage));
        }
    }


exports.updateReportStatus = async (req, res) => {
        try {
            const lang = getLang(req);
            const { reportId, status } = req.body
            const updateReportStatus = await adminReportServices.updateReportStatusService(reportId, status);
            return res.status(200).json(successResponse("Report status updated successfully", { reportId, status }));
            // return res.status(200).json(successResponse(getMessage(lang, 'success', 'updateSuccessfull'), updateReportStatus));
        }
        catch (err) {
            const lang = getLang(req);
            const statusCode = err.statusCode || err.status || 500;
            const category = err.category || 'error';
            const finalMessage = getMessage(lang, category, err.message) || err.message;
            return res.status(statusCode).json(errorResponse(finalMessage));
        }
    }
