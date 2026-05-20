const Report = require("../../models/reportCollection.js")
const mongoose = require("mongoose");
const { createError, isUserExist } = require("../../helpers/dbHelpers.js")
const enums = require("../../constants/enum.constants.js")
const User = require('../../models/user.model');
const FAQ = require("../../models/faq.model.js")
const bcrypt = require('bcrypt');
const { hashPassword } = require("../../utils/commonFunctions.util.js");



exports.allSuspendedUsersService = async (pageNo = 1, pageSize = 10) => {
    try {
        const matchStage = { accountState: enums.userAccountState.SUSPENDED };
        const totalUsersAgg = await User.aggregate([
            { $match: matchStage }
        ]);
        
        const totalUsers = totalUsersAgg.length;
        const skip = (pageNo - 1) * pageSize;
        const users = await User.aggregate([
            { $match: matchStage },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: (pageSize) },
            {
                $project: {
                    _id: 1,
                    username: 1,
                    email: 1,
                    avatarUrl: 1,
                    curentCountry: 1,
                    createdAt: 1,
                    accountStatus: 1,
                    dateOfBirth: 1,
                    updatedAt: 1,
                    dateOfSuspend: 1
                }
            }
        ]);

        return {
            pagination: {
                totalUsers,
                totalPages: Math.ceil(totalUsers / pageSize),
                currentPage: parseInt(pageNo),
                limit: parseInt(pageSize)
            },
            data: users
        };

    }
    catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
}

exports.addFaqService = async (title, content, userId) => {
    try {
        if (!userId) {
            throw createError(400, "userNotFound", "notFound");
        }

        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, "userNotFound", "notFound");
        }

        if (user.role !== enums.userRole.ADMIN) {
            throw createError(403, "notAuthorized", "validation");
        }


        if (!title || !content) {
            throw createError(400, "missingFaqFields", "validation");
        }

        const existingFaq = await FAQ.findOne({ title: title.trim() });
        if (existingFaq) {
            throw createError(400, "faqAlreadyExists", "validation");
        }

        const newFaq = await FAQ.create({
            title: title.trim(),
            content: content.trim(),
            isActive: true,
        });

        return {
            data: newFaq,
        };
    }
    catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, "serverError", "error");
    }
};



exports.updateFaqStatus = async (status, faqId, userId) => {
    try {

        if (!userId) {
            throw createError(400, "userNotFound", "notFound");
        }

        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, "userNotFound", "notFound");
        }

        if (!faqId) {
            throw createError(400, "faqIdNotFound", "notFound");
        }

        if (user.role !== enums.userRole.ADMIN) {
            throw createError(403, "notAuthorized", "validation");
        }

        const existingFaq = await FAQ.findById(faqId);
        if (!existingFaq) {
            throw createError(400, "faqNotFound", "notFound");
        }


        if (typeof status !== 'boolean') {
            throw createError(400, "invalidFaqStatus", "validation");
        }


        existingFaq.isActive = status;
        const updatedFaq = await existingFaq.save();

        return updatedFaq;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, "serverError", "error");
    }
};



exports.deleteFaqService = async (faqId, userId) => {
    try {
        if (!userId) {
            throw createError(400, "userNotFound", "notFound");
        }
        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, "userNotFound", "notFound");
        }
        if (user.role !== enums.userRole.ADMIN) {
            throw createError(403, "notAuthorized", "validation");
        }

        if (!faqId) {
            throw createError(400, "faqIdNotFound", "notFound");
        }
        const existingFaq = await FAQ.findById(faqId);
        if (!existingFaq) {
            throw createError(400, "faqNotFound", "notFound");
        }
        await FAQ.deleteOne({ _id: faqId });

        return { message: "FAQ deleted successfully" };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, "serverError", "error");
    }
};

exports.removeSuspensionUserService = async (userIdToUnsuspend, adminId) => {
    try {
        if (!adminId) {
            throw createError(400, "userNotFound", "notFound");
        }

        if(!userIdToUnsuspend){
                throw createError(400, "userNotFound", "notFound");
        
        }
        const adminUser = await isUserExist(adminId);
        const userToUnsuspend = await isUserExist(userIdToUnsuspend);
       if(!userToUnsuspend){
            throw createError(400, "userNotFound", "notFound");
       }
        if (!adminUser) {
            throw createError(400, "userNotFound", "notFound");
        }
        if (adminUser.role !== enums.userRole.ADMIN) {
            throw createError(403, "notAuthorized", "validation");
        }
        if(userToUnsuspend.accountState !== enums.userAccountState.SUSPENDED){
            throw createError(400, "userNotSuspended", "validation");
        }
        userToUnsuspend.accountState = enums.userAccountState.NORMAL;
        userToUnsuspend.status = 'active'
        userToUnsuspend.dateOfSuspend = null;
        await userToUnsuspend.save();
        return userToUnsuspend;

    }
    catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, "serverError", "error");
    }
}





exports.changePassword = async (id, oldPassword, newPassword) => {
  try {
    const user = await User.findOne({ _id:id, role: 'admin' });
    if (!user) return { success: false, message: 'Admin not exist' };
   

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) return { success: false, message: 'Old password is incorrect' };
    
    const hashedPassword = await hashPassword(newPassword);

    user.passwordHash = hashedPassword;
    await user.save();

    return { success: true, message: 'Password changed successfully' };
  } catch (error) {
    console.log('ERROR::', error);
    return { success: false, message: error.message || 'Error changing password' };
  }
};