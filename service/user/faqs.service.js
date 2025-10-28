const User = require('../../models/user.model');
const mongoose = require('mongoose');

const { createError, isUserExist } = require("../../helpers/dbHelpers.js");
const enums = require("../../constants/enum.constants.js");
const resMessages = require("../../constants/resMessages.constants.js");
const FAQ = require("../../models/faq.model.js")

exports.getallFaqService = async (page = 1, limit = 10, userId) => {
    try {
        if (!userId) {
            throw createError(400, "userNotFound", "notFound");
        }

        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, "userNotFound", "notFound");
        }

        const offset = (page - 1) * limit;
        const faqs = await FAQ.find({ isActive: true })
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .lean();

        const totalCount = await FAQ.countDocuments({ isActive: true });

        return {
            data: faqs,
            pagination: {
                total: totalCount,
                page: (page),
                limit: (limit),
                totalPages: Math.ceil(totalCount / limit),
            },
        };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, "serverError", "error");
    }
};


exports.addFaqService = async (title, content, userId) => {
    try {
        if (!userId) {
            throw createError(400, "userNotFound", "notFound");
        }

        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, "userNotFound", "notFound");
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



exports.updateFaqStatus = async (status,faqId, userId) => {
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

