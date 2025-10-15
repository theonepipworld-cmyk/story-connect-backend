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
            throw createError(400, 'userNotFound', 'notFound');
        }
        const reporter = await isUserExist(userId);
        if (!reporter) {
           throw createError(400, 'userNotFound', 'notFound');
        }

        let additionalEvidence = "";
        if (file) {
            const uploadedDocument = await uploadFileToS3(
                {
                    buffer: file.buffer,
                    mimetype: file.mimetype,
                    originalname: file.originalname,
                },
                "user/report/evidence"
            );
            additionalEvidence = uploadedDocument?.Location || "";
        }

        const reportData = {
            reportedUser: reportUserId,
            reportedBy: userId,
            description,
            category,
            severity,
            evidence: additionalEvidence,
        };

        const newReport = await Report.create(reportData);

        return newReport;

    } catch (error) {
        if (error.statusCode) throw error;
              throw createError(500, 'serverError','error');
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
       throw createError(500, 'serverError','error');
    }
};