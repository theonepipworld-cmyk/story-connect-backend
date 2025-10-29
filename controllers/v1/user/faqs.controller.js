const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");
const { DEFAULT_AVATAR_URL } = require("../../../constants/variables.constants.js");
const User = require('../../../models/user.model.js');
const { getMessage } = require("../../../constants/locales/index.js");
const faqService = require("../../../service/user/faqs.service.js")

const getLang = (req) => req.lang || 'en';

exports.getAllFaqs = async (req, res) => {
    try {
        const lang = getLang(req);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { data, pagination } = await faqService.getallFaqService(page, limit, req.user.id);
        return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), data, pagination));
    }
    catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
};


