const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const { getMessage } = require("../../../constants/locales/index.js");
const { getUserNotificationService, makeAllUserNotificationReadService } = require("../../../service/user/notification.service.js");


const getLang = (req) => req.lang || 'en';

exports.getUserNotifications = async (req, res) => {
    try {
        const lang = getLang(req);
        const result = await getUserNotificationService(req.user?.id);
        return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), result));
    }
    catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
}

exports.makeAllUserNotificationRead = async (req, res) => {
    try {
        const lang = getLang(req);
        const result = await makeAllUserNotificationReadService(req.user?.id);
        return res.status(200).json(successResponse(getMessage(lang, 'success', 'seenSuccessfully')));
    }
    catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
}

exports.changeStatusPushNotification = async (req, res) => {
    try {
         const lang = getLang(req);
         const isPushNotification = req.body.isPushNotification
         
    }
    catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
}
