const Report = require("../../models/reportCollection.js")
const mongoose = require("mongoose");
const Comment = require("../../models/Comments.model")
const { isPostExist, createError, postAggregationPipeline, isUserExist, isCommunityExist } = require("../../helpers/dbHelpers.js")
const resMessages = require("../../constants/resMessages.constants.js")
const { uploadFileToS3, deleteFileFromS3 } = require("../../utils/s3.util.js")
const ReportCategory = require("../../models/reportCategories.js")



exports.reportUserService = async (reportUserId, description, category, severity, file, userId) => {
    try {
        if (!userId) {
            throw createError(400, resMessages.notFound.userNotFound);
        }
        const reporter = await isUserExist(userId);
        if (!reporter) {
            throw createError(400, resMessages.notFound.userNotFound);
        }

        let additionalEvidence = "";
        if (file) {
            const uploadedDocument = await uploadFileToS3(file, "user/report/evidence");
            additionalEvidence = uploadedDocument?.Location || "";
        }

        const reportData = {
            reportedUser: reportUserId,
            reporter: userId,
            description,
            category,
            severity,
            evidence: additionalEvidence,
        };

        const newReport = await Report.create(reportData);

        return newReport;

    } catch (error) {
        throw new Error(error.message);
    }
};



exports.getReportCategoryService = async () => {
    try {
        const result = await ReportCategory.find({}).lean();

        if (!result || result.length === 0) {
            return {data: [] };
        }

      return result;
    } catch (error) {
        throw new Error(error.message);
    }
};