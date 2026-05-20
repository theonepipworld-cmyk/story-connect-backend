const crypto = require('crypto');
const User = require('../../models/user.model.js');
const { hashPassword, comparePassword, getJWT, generateOtp, generatePublicId } = require("../../utils/commonFunctions.util.js");
const { checkFieldExists, createError } = require("../../helpers/dbHelpers.js");
const { sendEmail } = require('../../utils/email.util.js');
const secretVariables = require("../../config/secretVariables.js");


exports.signup = async (data) => {
  try {
    const { email, password, username, phone, dateOfBirth, device_token } = data;
    const [emailExist, usernameExist] = await Promise.all([
      checkFieldExists('email', email),
      checkFieldExists('username', username),
    ]);

    if (emailExist) throw createError(400, 'emailAlreadyExist', 'validation');
    // if (usernameExist) throw createError(400, 'usernameAlreadyExist', 'validation');

    const hashedPassword = await hashPassword(password);
    const publicId = await generatePublicId(username);
    let generatedOtp = await generateOtp();
    const newUserData = {
      email,
      username,
      phone,
      dateOfBirth,
      passwordHash: hashedPassword,
      lastSeen: new Date(),
      emailVerificationOtp: generatedOtp,
      emailVerificationOtpExpires: Date.now() + 1000 * 60 * 10, // OTP valid for 10 minutes
      publicId
    };

    if (device_token) newUserData.device_token = device_token;

    const newUser = new User(newUserData);

    await sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      template: 'verify-email',
      context: {
        username: username,
        email: email,
        otp: generatedOtp,
        otpscreen: `secretVariables.frontend_base_url/verify-email?email=${encodeURIComponent(email)}`,
        year: new Date().getFullYear(),
        privacyPolicyUrl: `${secretVariables.website_url}privacy-policy`,
      }
    });

    await newUser.save();

    const token = await getJWT(email, newUser._id, newUser.role, newUser.username);

    return { token };
  } catch (error) {
    console.error('Signup failed:>>>> ', error);
    if (error.statusCode) throw error;
    throw createError(500, 'serverError', 'error');
  }
};


exports.login = async ({ email, password, device_token, loginViaWeb }) => {
  try {
    const user = await checkFieldExists('email', email);
    if (!user) throw createError(404, 'emailNotFound', 'notFound');

    if (user.passwordHash == null) throw createError(400, 'registrationIncomplete', 'validation');

    if (loginViaWeb) {
      if (user.isEmailVerified === false || user.isEmailVerified === undefined) throw createError(403, ' Please verify it to continue.', 'Your email is not verified');
    }

    const correctPassword = await comparePassword(user.passwordHash, password);
    if (!correctPassword) throw createError(400, 'incorrectPassword', 'validation');

    if (user.status === 'banned') throw createError(403, 'accountBanned', 'forbidden');
    if (user.accountState === 'suspended') throw createError(403, 'accountSuspended', 'forbidden');

    const token = await getJWT(email, user._id, user.role, user.username, user.status);
    if (!token) throw createError(500, 'somethingWentWrong', 'error');

    if (device_token) await User.updateOne({ _id: user._id }, { device_token });

    return { token };
  } catch (error) {
    if (error.statusCode) throw error;
    throw createError(500, 'serverError', 'error');
  }
};

exports.forgotPassword = async ({ email }) => {
  try {
    const user = await checkFieldExists('email', email, true);
    if (!user) throw createError(404, 'emailNotFound', 'notFound');

    if (user.status === 'banned') throw createError(403, 'accountBanned', 'forbidden');
    if (user.status === 'suspended') throw createError(403, 'accountSuspended', 'forbidden');

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 15;
    await user.save();

    const resetLink = `${secretVariables.frontend_base_url}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      template: 'reset-password',
      context: {
        resetLink,
        name: user.username,
        privacyPolicyUrl: `${secretVariables.website_url}privacy-policy`,
        year: new Date().getFullYear()
      }
    });

    return { message: 'ResetLink' };
  } catch (error) {
    if (error.statusCode) throw error;
    throw createError(500, 'serverError', 'error');
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
    if (user.status === 'banned') throw createError(403, 'accountBanned', 'forbidden');
    user.passwordHash = await hashPassword(newPassword);
    user.resetPasswordToken = "";
    user.resetPasswordExpires = "";
    await user.save();
    return { message: 'Password set successfully.' };
  } catch (error) {
    if (error.statusCode) throw error;
    throw createError(500, 'serverError', 'error');
  }
};



exports.verifyEmail = async (email, otp) => {
  try {
    const user = await User.findOne({ email })
    if (!user) {
      return { success: false, message: "User not found " }
    }

    if (user.emailVerificationOtpExpires < Date.now()) {
      return { success: false, message: "OTP has expired. Please request a new one." }
    }

    if (user.emailVerificationOtp !== otp) {
      return { success: false, message: "Incorrect OTP" }
    }

    user.isEmailVerified = true;
    user.emailVerificationOtp = null;
    user.status = 'active';
    await user.save();

    return { success: true, message: "Email verified successfully" };

  } catch (error) {
    console.log("ERROR::", error)
    return { success: false, message: error.message }
  }
}



exports.resendVerificationOtp = async (email) => {
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return { success: false, message: "User not found" };
    }

    if (user.isEmailVerified) {
      return { success: false, message: "Email is already verified" };
    }

    // generate new OTP
    const generatedOtp = await generateOtp();

    user.emailVerificationOtp = generatedOtp;
    user.emailVerificationOtpExpires = Date.now() + 1000 * 60 * 10; // OTP valid for 10 minutes
    await user.save();

    // send email
    await sendEmail({
      to: email,
      subject: "Verify Your Email Address",
      template: "verify-email",
      context: {
        username: user.username,
        email: email,
        otp: generatedOtp,
        otpscreen: `${secretVariables.frontend_base_url}/verify-email?email=${encodeURIComponent(email)}`,
        year: new Date().getFullYear(),
        privacyPolicyUrl: `${secretVariables.website_url}privacy-policy`,
      },
    });

    return { success: true, message: "Verification OTP sent successfully" };

  } catch (error) {
    console.log("ERROR::", error);
    return { success: false, message: error.message };
  }
};