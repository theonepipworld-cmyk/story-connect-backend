const Report = require("../../models/reportCollection.js");
const { createError, isUserExist } = require("../../helpers/dbHelpers.js");
const { uploadFileToS3, deleteFileFromS3 } = require("../../utils/s3.util.js");
const ReportCategory = require("../../models/reportCategories.js");
const enums = require("../../constants/enum.constants.js");

exports.reportUserService = async (reportUserId, description, category, severity, files, userId) => {
    try {
      
        if (!userId) throw createError(400, 'userNotFound', 'notFound');
        if (!reportUserId) throw createError(400, 'reportedUserNotFound', 'notFound');

      
        const [reporter, reportedUser] = await Promise.all([
            isUserExist(userId),
            isUserExist(reportUserId)
        ]);
        if (!reporter) throw createError(404, 'userNotFound', 'notFound');
        if (!reportedUser) throw createError(404, 'reportedUserNotFound', 'notFound');

   
        if (userId.toString() === reportUserId.toString()) {
            throw createError(400, 'cannotReportYourself', 'validation');
        }

        const existingReport = await Report.findOne({
            reportedBy: userId,
            reportedUser: reportUserId,
            category,
            status: { $in: [enums.reportStatus.PENDING, enums.reportStatus.UNDERREVIEW] }
        });
        if (existingReport) throw createError(400, 'reportAlreadyExists', 'validation');

     
        let additionalEvidence = [];
        if (files && files.length > 0) {
            let uploadResults;
            try {
                uploadResults = await Promise.all(
                    files.map((file) => uploadFileToS3(file, "user/report/evidence"))
                );
                additionalEvidence = uploadResults.map((r) => r.Location);
            } catch (uploadErr) {
              
                if (uploadResults) {
                    await Promise.allSettled(
                        uploadResults
                            .filter(Boolean)
                            .map((r) => deleteFileFromS3(r.Location))
                    );
                }
                throw createError(500, 'fileUploadFailed', 'error');
            }
        }

        const newReport = await Report.create({
            reportedUser: reportUserId,
            reportedBy: userId,
            description,
            category,
            severity,
            additionalEvidence
        });

        return newReport;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};

exports.getReportCategoryService = async () => {
    try {
        const result = await ReportCategory.find({}).lean();
      
        return { data: result || [] };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};