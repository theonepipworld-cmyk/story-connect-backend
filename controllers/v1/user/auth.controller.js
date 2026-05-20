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
    console.log("ERROR::", err);
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
      return res.status(200).json(successResponse(result.message));
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


  exports.verifyEmail = async (req, res) => {
    try {
      const { email, otp } = req.body;

      if(!email || !otp){
        return res.status(400).json(errorResponse("Email and OTP are required"));
      }

      const userVeification = await authService.verifyEmail(email, otp);

      if (!userVeification.success) {
        return res.status(400).json(errorResponse(userVeification.message));
      }

      return res.status(200).json(successResponse("Email verified successfully"));

    } catch (err) { 
       console.log("ERROR::",err)
       return res.status(500).json(errorResponse(getMessage(lang, `${err.message}`, 'somethingWentWrong')));
    } 
  };


exports.resendVerificationOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json(errorResponse("Email is required"));
    }

    const response = await authService.resendVerificationOtp(email);

    if (!response.success) {
      return res.status(400).json(errorResponse(response.message));
    }

    return res.status(200).json(successResponse(response.message));

  } catch (err) {
    console.log("ERROR::", err);
    return res.status(500).json(errorResponse('Something went wrong while resending OTP',err.message));
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
      return res.status(500).json(errorResponse(resMessages.generalError.somethingWentWrong, error.message));
    }
  }



 exports.changePassword = async (req, res) => {
     try {
         const id = req.user.id;
         const { oldPassword, newPassword } = req.body;
         if (!oldPassword || !newPassword) {
             return res.status(400).json(errorResponse("Old password and new password are required"));
         }
         
         const result = await authService.changePassword(id, oldPassword, newPassword);
         if (!result.success) { return res.status(400).json(errorResponse(result.message)); }
         return res.status(200).json(successResponse(result.message));
         
     } catch (error) {
         const lang = getLang(req);
         const statusCode = err.statusCode || err.status || 500;
         const category = err.category || 'error';
         const finalMessage = getMessage(lang, category, err.message) || err.message;
         return res.status(statusCode).json(errorResponse(finalMessage));
     }
 };