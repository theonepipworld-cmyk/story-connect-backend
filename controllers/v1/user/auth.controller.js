const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');
const { errorResponse, successResponse } = require('../../../utils/responseHandler.util.js')
const resMessages = require("../../../constants/resMessages.constants.js")
const { getJWT } = require("../../../utils/commonFunctions.util.js")
const User = require('../../../models/user.model.js');
const { google_client_id } = require("../../../config/secretVariables.js");
const authService = require("../../../service/user/auth.service.js")
const { getMessage } = require("../../../constants/locales/index.js")

const getLang = (req) => req.lang || 'en';

exports.login = async (req, res) => {
  try {
    const lang = getLang(req);
    const result = await authService.login(req.body);
    return res.status(200).json(successResponse(
      getMessage(lang, 'success', 'loginSuccessful'),
      result.token
    ));
  } catch (err) {
   const lang = getLang(req);
    const statusCode = err.statusCode || err.status || 500;
    const category = err.category || 'error';
    const finalMessage = getMessage(lang, category, err.message) || err.message;
    return res.status(statusCode).json(errorResponse(finalMessage));
  }
};

exports.signup = async (req, res) => {
  try {
    const lang = getLang(req);
    const result = await authService.signup(req.body);
    return res.status(200).json(successResponse(
      getMessage(lang, 'success', 'registrationSuccessful'),
      result.token
    ));
  } catch (err) {
    const lang = getLang(req);
    const statusCode = err.statusCode || err.status || 500;
    const category = err.category || 'error';
    const finalMessage = getMessage(lang, category, err.message) || err.message;
    return res.status(statusCode).json(errorResponse(finalMessage));
  }
};


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
      const result = await authService.resetPassword(req.body);
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



  exports.googleAuth = async (req, res) => {
    try {
      const lang = getLang(req);
      const { token } = req.body;
      if (!token) {
        return res.status(400).json(errorResponse(getMessage(lang, 'validation', 'missingFields')));
      }

      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: google_client_id
      });

      const payload = ticket.getPayload();
      const { email, name, picture, sub: googleId } = payload;

      let user = await User.findOne({ email });

      if (!user) {
        user = new User({ email, name, googleId });
        await user.save();
      }

      const jwtToken = await getJWT(email, user._id, user.role);

      return res.status(200).json(successResponse(getMessage(lang, 'success', 'loginSuccessful'), {
        token: jwtToken,
        user: { email, name, picture }
      }));

    } catch (error) {
      const lang = getLang(req);
      return res.status(500).json(errorResponse(getMessage(lang, 'generalError', 'somethingWentWrong'), error.message));
    }
  };


  exports.savedDeviceToken = async (req, res) => {
    try {
      const { userId, token } = req.body;
      if (!userId || !token) {
        return res.status(400).json({ success: false, message: resMessages.validation.missingFields });
      }

      await User.findByIdAndUpdate(
        userId,
        { deviceToken: token },
        { new: true }
      );

      return res.json({ success: true, message: resMessages.success.deviceTokenSaved });
    } catch (error) {
      console.error("Save Device Token Error:", error);
      return res.status(500).json(errorResponse(resMessages.generalError.somethingWentWrong, error.message));
    }
  }
