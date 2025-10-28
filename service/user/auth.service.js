const crypto = require('crypto');
const User = require('../../models/user.model.js');
const { hashPassword, comparePassword, getJWT } = require("../../utils/commonFunctions.util.js");
const { checkFieldExists, createError } = require("../../helpers/dbHelpers.js");
const resMessages = require('../../constants/resMessages.constants.js');
const { sendEmail } = require('../../utils/email.util.js');
const { RESET_PASS_LINK } = require("../../constants/variables.constants.js");

exports.signup = async (data) => {
  try {
    const { email, password, username, phone, dateOfBirth, device_token } = data;
    const [emailExist, usernameExist] = await Promise.all([
      checkFieldExists('email', email),
      checkFieldExists('username', username),
    ]);

    if (emailExist) throw createError(400, 'emailAlreadyExist', 'validation');
    if (usernameExist) throw createError(400, 'usernameAlreadyExist', 'validation');

    const hashedPassword = await hashPassword(password);
    const newUserData = {
      email,
      username,
      phone,
      dateOfBirth,
      passwordHash: hashedPassword,
      lastSeen: new Date(),
    };

    if (device_token) newUserData.device_token = device_token;

    const newUser = new User(newUserData);
    await newUser.save();

    const token = await getJWT(email, newUser._id, newUser.role, newUser.username);

    return { token };
  } catch (error) {
    if (error.statusCode) throw error;
    throw createError(500, 'serverError','error');
  }
};

exports.login = async ({ email, password, device_token }) => {
  try {
    const user = await checkFieldExists('email', email);
    if (!user) throw createError(404, 'emailNotFound', 'notFound');

    if (user.passwordHash == null) throw createError(400, 'registrationIncomplete', 'validation');

    const correctPassword = await comparePassword(user.passwordHash, password);
    if (!correctPassword) throw createError(400, 'incorrectPassword', 'validation');

    const token = await getJWT(email, user._id, user.role, user.username);
    if (!token) throw createError(500, 'somethingWentWrong', 'error');
    if (device_token) await User.updateOne({ _id: user._id }, { device_token });
    return { token };
  } catch (error) {
    if (error.statusCode) throw error;
     throw createError(500, 'serverError','error');
  }
};

exports.forgotPassword = async ({ email }) => {
  try {
    const user = await checkFieldExists('email', email, true);
    if (!user) throw createError(404, 'emailNotFound', 'notFound');

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 15; // 15 min
    await user.save();

    const resetLink = `${RESET_PASS_LINK}/${resetToken}`;

    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      template: 'reset-password',
      context: { resetLink }
    });

    return { message: 'Reset link sent to email.' };
  } catch (error) {
    if (error.statusCode) throw error;
     throw createError(500, 'serverError','error');
  }
};

exports.resetPassword = async ({ token, newPassword }) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) throw createError(400, 'invalidOrExpiredToken', 'validation');

    user.passwordHash = await hashPassword(newPassword);
    user.resetPasswordToken = "";
    user.resetPasswordExpires = "";
    await user.save();

    return { message: 'Password reset successful.' };
  } catch (error) {
    if (error.statusCode) throw error;
     throw createError(500, 'serverError','error');
  }
};
