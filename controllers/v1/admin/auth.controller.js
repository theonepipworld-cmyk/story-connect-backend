const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');
const { errorResponse, successResponse } = require('../../../utils/responseHandler.util.js')
const resMessages = require("../../../constants/resMessages.constants.js")
const { getJWT } = require("../../../utils/commonFunctions.util.js")
const User = require('../../../models/user.model.js');
const { google_client_id } = require("../../../config/secretVariables.js");
const authService = require("../../../service/admin/authService.js")
const { getMessage } = require("../../../constants/locales/index.js")


const getLang = (req) => req.lang || 'en';
exports.adminlogin = async (req, res) => {
    try {
        const lang = getLang(req);
        const result = await authService.login(req.body);
        return res.status(200).json(successResponse(
            getMessage(lang, 'success', 'loginSuccessful'),
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

exports.forgotPassword = async (req, res) => {
    try {
        const lang = getLang(req);
        const result = await authService.forgotPassword(req.body);
        return res.status(200).json(successResponse(getMessage(lang, 'success', result.message)));
    } catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
};


exports.resetPassword = async (req, res) => {
    try {
        const lang = getLang(req);
        const token = req.query.token
        const newPassword = req.body.newPassword
        const result = await authService.resetPassword(token,newPassword);
        return res.status(200).json(successResponse(getMessage(lang, 'success', result.message)));
    } catch (err) {
        const lang = getLang(req);
        const statusCode = err.statusCode || err.status || 500;
        const category = err.category || 'error';
        const finalMessage = getMessage(lang, category, err.message) || err.message;
        return res.status(statusCode).json(errorResponse(finalMessage));
    }
};


exports.renderPasswordSubmitPage = (req, res) => {
    try {
        const { token } = req.params;
        const templatePath = path.join(process.cwd(), 'templates', 'password-submit-page.html');
        const source = fs.readFileSync(templatePath, 'utf8');
        const compiledTemplate = handlebars.compile(source);
        const html = compiledTemplate({ token });
        res.send(html);
    } catch (error) {
        res.status(500).send('Something went wrong loading the reset page.');
    }
};