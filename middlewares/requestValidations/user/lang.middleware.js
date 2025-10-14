
const { errorResponse } = require('../../../utils/responseHandler.util');
const resMessages = require("../../../constants/resMessages.constants");


exports.languageMiddleware = (req, res, next) => {
    req.lang = req.body.lang || req.headers['accept-language'] || 'en';
    next();
};