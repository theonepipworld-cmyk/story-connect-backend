const crypto = require('crypto');
const User = require('../../models/user.model.js');
const { hashPassword, comparePassword, getJWT } = require("../../utils/commonFunctions.util.js");
const { checkFieldExists, createError } = require("../../helpers/dbHelpers.js");
const resMessages = require('../../constants/resMessages.constants.js');
const { sendEmail } = require('../../utils/email.util.js');
const { ADMIN_RESET_PASS_LINK } = require("../../constants/variables.constants.js");


exports.login = async ({ email, password }) => {
    try {
        const user = await checkFieldExists('email', email);
        if (!user) throw createError(404, 'emailNotFound', 'notFound');
        if (user.role !== 'admin') {
            throw createError(403, 'accessDenied', 'validation');
        }

        if (user.passwordHash == null) throw createError(400, 'registrationIncomplete', 'validation');

        const correctPassword = await comparePassword(user.passwordHash, password);
        if (!correctPassword) throw createError(400, 'incorrectPassword', 'validation');

        const token = await getJWT(email, user._id, user.role, user.username);
        if (!token) throw createError(500, 'somethingWentWrong', 'error');
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

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 1000 * 60 * 15;
        await user.save();

        const resetLink = `${ADMIN_RESET_PASS_LINK}/api/v1/auth/reset-password?token=${resetToken}`;

        await sendEmail({
            to: email,
            subject: 'Password Reset Request',
            template: 'reset-password',
            context: { resetLink }
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

        user.passwordHash = await hashPassword(newPassword);
        user.resetPasswordToken = "";
        user.resetPasswordExpires = "";
        await user.save();

        return { message: 'Password reset successful.' };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};
