const User = require('../../models/user.model');
const mongoose = require('mongoose');

const { createError, isUserExist } = require("../../helpers/dbHelpers.js");
const enums = require("../../constants/enum.constants.js");
const resMessages = require("../../constants/resMessages.constants.js");
const FAQ = require("../../models/faq.model.js")

exports.getallFaqService = async (page = 1, limit = 10, userId) => {
    try {
        if (!userId) {
            throw createError(404, "userNotFound", "notFound");
        }

        const user = await isUserExist(userId);
        if (!user) {
            throw createError(404, "userNotFound", "notFound");
        }

        const offset = (page - 1) * limit;

        const filter = user.role === enums.userRole.ADMIN ? {} : { isActive: true };

        const faqs = await FAQ.find(filter)
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .lean();

        const totalCount = await FAQ.countDocuments(filter);

        return {
            data: faqs,
            pagination: {
                total: totalCount,
                page: page,
                limit: limit,
                totalPages: Math.ceil(totalCount / limit),
            },
        };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, "serverError", "error");
    }
};

