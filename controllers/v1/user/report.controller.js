const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const { getMessage } = require("../../../constants/locales/index.js");
const { getReportCategoryService, reportUserService } = require("../../../service/user/report.service.js");


const getLang = (req) => req.lang || 'en';


exports.reportUser = async (req, res) => {
  try {
    const lang = getLang(req);
    const { reportUserId, description, category, severity } = req.body;
    const reportUser = await reportUserService(reportUserId, description, category, severity, req.files, req.user.id);
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'reportSuccessfully'), reportUser));
  } catch (err) {
    const lang = getLang(req);
    return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
  }
};


exports.getReportCategories = async (req, res) => {
  try {
    const lang = getLang(req);
    const categories = await getReportCategoryService();
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), categories));
  } catch (err) {
    const lang = getLang(req);
    return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
  }
};
