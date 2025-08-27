const crypto = require('crypto');
const User = require('../../models/user.model.js');
const { hashPassword, comparePassword, getJWT } = require("../../utils/commonFunctions.util.js")
const { checkFieldExists } = require("../../helpers/dbHelpers.js")
const resMessages = require('../../constants/resMessages.constants.js');
const { sendEmail } = require('../../utils/email.util.js');
const { RESET_PASS_LINK } = require("../../constants/variables.constants.js")

exports.signup = async (data) => {
  const { email, password, username, phone, dateOfBirth } = data;

  const [emailExist, usernameExist] = await Promise.all([
    checkFieldExists('email', email),
    checkFieldExists('username', username),
  ]);

  if (emailExist) {
    const err = new Error(resMessages.validation.emailAlreadyExist);
    err.statusCode = 400;
    throw err;
  }

  if (usernameExist) {
    const err = new Error(resMessages.validation.usernameAlreadyExist);
    err.statusCode = 400;
    throw err;
  }

  const hashedPassword = await hashPassword(password);
  const newUser = new User({
    email,
    username,
    phone,
    dateOfBirth,
    passwordHash: hashedPassword,
    lastSeen: new Date()
  });

  await newUser.save();
  const token = await getJWT(email, newUser._id, newUser.role, newUser.username);

  return { token };
};


exports.login = async ({ email, password }) => {
  const user = await checkFieldExists('email', email);
  if (!user) {
    const err = new Error(resMessages.notFound.emailNotFound);
    err.statusCode = 400;
    throw err;
  }

  if (user.passwordHash == null) {
    const err = new Error(resMessages.validation.registrationIncomplete);
    err.statusCode = 400;
    throw err;
  }

  const correctPassword = await comparePassword(user.passwordHash, password);
  if (!correctPassword) {
    const err = new Error(resMessages.validation.incorrectPassword);
    err.statusCode = 400;
    throw err;
  }
  const token = await getJWT(email, user._id, user.role, user.username);
  if (!token) {
    const err = new Error(resMessages.generalError.somethingWentWrong);
    err.statusCode = 400;
    throw err;
  }

  return { token };
};

exports.forgotPassword = async ({ email }) => {
  const user = await checkFieldExists('email', email, true);
  if (!user) {
    const err = new Error(resMessages.notFound.emailNotFound);
    err.statusCode = 404;
    throw err;
  }

  // Generate token & hash it
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Save with expiry
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 1000 * 60 * 15; // 15 min
  await user.save();

  // Create link
  const resetLink = `${RESET_PASS_LINK}/${resetToken}`;

  // Send email
  await sendEmail({
    to: email,
    subject: 'Password Reset Request',
    template: 'reset-password',
    context: { resetLink }
  });

  return { message: 'Reset link sent to email.' };
};


exports.resetPassword = async ({ token, newPassword }) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    const err = new Error(resMessages.validation.invalidOrExpiredToken);
    err.statusCode = 400;
    throw err;
  }

  user.passwordHash = await hashPassword(newPassword);
  user.resetPasswordToken = "";
  user.resetPasswordExpires = "";
  await user.save();

  return { message: 'Password reset successful.' };
};

