const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");
const { blockUserService, unblockUserService, getBlockedUserService } = require("../../../service/user/blocked.service.js")
const { getMessage } = require("../../../constants/locales/index.js");

const getLang = (req) => req.lang || 'en';
exports.blockedUser = async (req, res) => {
    try {
        const lang = getLang(req);
        const blocked = await blockUserService(req.user.id, req.params.id);
        return res.status(200).json(
            successResponse(getMessage(lang, 'success', 'blockedSuccessfully'), blocked)
        );
    } catch (err) {
         const lang = getLang(req);
            const statusCode = err.statusCode || err.status || 500;
            const category = err.category || 'error';
            const finalMessage = getMessage(lang, category, err.message) || err.message;
            return res.status(statusCode).json(errorResponse(finalMessage));
          }
};


exports.UnblockUser = async (req, res) => {
    try {
        const lang = getLang(req);
        const unblocked = await unblockUserService(req.user.id, req.params.id);
        return res.status(200).json(
            successResponse(getMessage(lang, 'success', 'unBlockSuccessfully'), unblocked)
        );
    } catch (err) {
           const lang = getLang(req);
              const statusCode = err.statusCode || err.status || 500;
              const category = err.category || 'error';
              const finalMessage = getMessage(lang, category, err.message) || err.message;
              return res.status(statusCode).json(errorResponse(finalMessage));
           }
};

exports.getBlockUsers = async (req, res) => {
    try {
        const lang = getLang(req);
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { data, pagination } = await getBlockedUserService(page, limit, req.user.id);
        return res.status(200).json(
            successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), data, pagination)
        );
    } catch (err) {
        const lang = getLang(req);
           const statusCode = err.statusCode || err.status || 500;
           const category = err.category || 'error';
           const finalMessage = getMessage(lang, category, err.message) || err.message;
           return res.status(statusCode).json(errorResponse(finalMessage));
          }
    };


