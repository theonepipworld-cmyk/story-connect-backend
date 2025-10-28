const Report = require("../../models/reportCollection.js")
const mongoose = require("mongoose");
const Comment = require("../../models/Comments.model")
const { isPostExist, createError, postAggregationPipeline, isUserExist, isCommunityExist } = require("../../helpers/dbHelpers.js")
const resMessages = require("../../constants/resMessages.constants.js")
const { uploadFileToS3, deleteFileFromS3 } = require("../../utils/s3.util.js")
const ReportCategory = require("../../models/reportCategories.js")
const enums = require("../../constants/enum.constants.js")



exports.reportUserService = async (reportUserId, description, category, severity, files, userId) => {
    try {
        if (!userId) {
            throw createError(400, 'userNotFound', 'notFound');
        }

        const reporter = await isUserExist(userId);
        if (!reporter) {
            throw createError(400, 'userNotFound', 'notFound');
        }

        const existingReport = await Report.findOne({
            reportedBy: userId,
            reportedUser: reportUserId,
            category,
            status: { $in: [enums.reportStatus.PENDING, enums.reportStatus.UNDERREVIEW] }, 
        });

        if (existingReport) {
            throw createError(400, "reportAlreadyExists", "validation");
        };

        
        let additionalEvidence = [];


        if (files && files.length > 0) {
            const uploadResults = await Promise.all(
                files.map((file) => uploadFileToS3(file, "user/report/evidence"))
            );
            additionalEvidence = uploadResults.map((r) => r.Location);
        }

        const reportData = {
            reportedUser: reportUserId,
            reportedBy: userId,
            description,
            category,
            severity,
            additionalEvidence,
        };

        const newReport = await Report.create(reportData);
        return newReport;

    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};



exports.getReportCategoryService = async () => {
    try {
        const result = await ReportCategory.find({}).lean();
        console.log(result)
        if (!result || result.length === 0) {
            return { data: [] };
        }

        return result;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};