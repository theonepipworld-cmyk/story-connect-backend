const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');
const { errorResponse, successResponse } = require('../../../utils/responseHandler.util.js')
const resMessages = require("../../../constants/resMessages.constants.js")
const { checkEmailExist } = require("../../../helpers/dbHelpers.js")
const { hashPassword, comparePassword, getJWT } = require("../../../utils/commonFunctions.util.js")
const User = require('../../../models/User.model.js');
const { google_client_id, jwt_secret } = require("../../../config/secretVariables.js");
const { sendEmail } = require('../../../utils/email.util.js');
const jwt = require('jsonwebtoken');



exports.login = async (req, res) => {
  try {
    const { email, password } = req.body
    const emailExist = await checkEmailExist(email)
    if (!emailExist) {
      return res.status(400)
        .json(errorResponse(resMessages.notFound.emailNotFound))
    }
    if (emailExist.passwordHash == null) {
      return res.status(400)
        .json(errorResponse(resMessages.validation.registrationIncomplete))
    }
    const correctPassword = await comparePassword(emailExist.passwordHash, password)
    if (!correctPassword) { return res.status(400).json(errorResponse(resMessages.validation.incorrectPassword)) }
    const token = await getJWT(email, emailExist._id)
    if (!token) {
      return res.status(400)
        .json(errorResponse(resMessages.generalError.somethingWentWrong))
    }
    return res.status(200).json(successResponse(resMessages.success.loginSuccessful, token))
  } catch (error) {
    console.log('ERROR::', error)
    return res.status(500).json(errorResponse(resMessages.generalError.somethingWentWrong, error.message))
  }
}

exports.signup = async (req, res) => {
  try {
    const { email, password, confirmPassword, username, phone, dateOfBirth } = req.body;

    // Check required fields
    const requiredFields = { email, password, confirmPassword, username, phone, dateOfBirth };

    const missing = Object.keys(requiredFields).filter(key => !requiredFields[key]);

    if (missing.length > 0) {
      return res.status(400).json(
        errorResponse(
          `${resMessages.validation.missingFields}: ${missing.join(', ')}`
        )
      );
    }

    // Check password match
    if (password !== confirmPassword) {
      return res
        .status(400)
        .json(errorResponse(resMessages.validation.passwordsDoNotMatch));
    }

    // Check if email already exists
    const emailExist = await checkEmailExist(email);
    if (emailExist) {
      return res
        .status(400)
        .json(errorResponse(resMessages.validation.emailAlreadyExist));
    }

    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      return res.status(400).json(errorResponse(resMessages.validation.invalidDateOfBirth));
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!dateRegex.test(dateOfBirth)) {
      return res.status(400).json(
        errorResponse(resMessages.validation.invalidDateOfBirthFormat)
      );
    }


    // Phone validation
    const phoneRegex = /^[0-9]{4,15}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json(errorResponse(resMessages.validation.invalidPhoneNumber));
    }


    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = new User({
      email,
      username,
      phone,
      dateOfBirth,
      passwordHash: hashedPassword,
      status: 'active',
      lastSeen: new Date()
    });

    await newUser.save();

    // Generate JWT
    const token = await getJWT(email, newUser._id);

    return res
      .status(201)
      .json(successResponse(resMessages.success.registrationSuccessful, token));
  } catch (error) {
    console.error('Signup error:', error);
    return res
      .status(500)
      .json(
        errorResponse(
          resMessages.generalError.somethingWentWrong,
          error.message
        )
      );
  }
};


exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json(errorResponse(resMessages.validation.missingFields));
    }

    const user = await checkEmailExist(email, true);
    if (!user) {
      return res.status(404).json(errorResponse(resMessages.notFound.emailNotFound));
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save to DB with expiry
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 15; // 15 min
    await user.save();

    // Create reset link
    const resetLink = `http://localhost:4000/api/v1/reset-password/${resetToken}`;

    // Send email
    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      template: 'reset-password',
      context: { resetLink }
    });
    return res.status(200).json(successResponse('Reset link sent to email.'));
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json(errorResponse(resMessages.generalError.somethingWentWrong, error.message));
  }
};


exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json(errorResponse(resMessages.validation.missingFields));
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json(errorResponse(resMessages.validation.passwordsDoNotMatch));
    }

    // Hash token before search
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json(errorResponse('Invalid or expired reset token'));
    }

    // Update password
    user.passwordHash = await hashPassword(newPassword);
    user.resetPasswordToken = "";
    user.resetPasswordExpires = "";
    await user.save();

    return res.status(200).json(successResponse('Password reset successful.'));
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json(errorResponse(resMessages.generalError.somethingWentWrong, error.message));
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
    console.error('Error rendering password page:', error.message);
    res.status(500).send('Something went wrong loading the reset page.');
  }
};


// GOOGLE SIGNUP / LOGIN
exports.googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json(errorResponse(resMessages.validation.missingFields));
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: google_client_id
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        email,
        name,
        googleId,
      });
      await user.save();
    }

    const jwtToken = await getJWT(email, user._id);

    return res.status(200).json(successResponse(resMessages.success.loginSuccessful, {
      token: jwtToken,
      user: { email, name, picture }
    }));

  } catch (error) {
    console.error('Google Auth Error:', error);
    return res.status(500).json(errorResponse(resMessages.generalError.somethingWentWrong, error.message));
  }
};
