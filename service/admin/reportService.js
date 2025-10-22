const Report = require("../../models/reportCollection.js")
const mongoose = require("mongoose");
const Comment = require("../../models/Comments.model")
const { isPostExist, createError, postAggregationPipeline, isUserExist, isCommunityExist } = require("../../helpers/dbHelpers.js")
const resMessages = require("../../constants/resMessages.constants.js")
const { uploadFileToS3, deleteFileFromS3 } = require("../../utils/s3.util.js")
const ReportCategory = require("../../models/reportCategories.js")
const enums = require("../../constants/enum.constants.js")



exports.allReportUser = async (pageNo = 1, pageSize = 10, status, severity, search) => {
    try {
        const matchStage = {};

        if (status) matchStage.status = status;
        if (severity) matchStage.severity = severity;
        if (search) {
            matchStage.description = { $regex: search, $options: "i" };
        }


        const totalReportsAgg = await Report.aggregate([
            { $match: matchStage }
        ]);
        const totalReports = totalReportsAgg.length;

        const skip = pageNo - 1 * pageSize;

        const reports = await Report.aggregate([
            { $match: matchStage },
            {
                $lookup: {
                    from: "reportcategories",
                    localField: "category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            { $unwind: "$categoryDetails" },

            { $sort: { createdAt: -1 } },

            { $skip: skip },
            { $limit: (pageSize) },

            {
                $project: {
                    _id: 1,
                    description: 1,
                    severity: 1,
                    status: 1,
                    createdAt: 1,
                    category: "$categoryDetails"
                }
            }
        ]);

        return {
            pagination: {
                totalReports,
                totalPages: Math.ceil(totalReports / pageSize),
                currentPage: parseInt(pageNo),
                limit: parseInt(pageSize)
            },
            data: reports
        };

    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
}


exports.getReportDetailsService = async (reportId) => {
    try {
        if (!reportId) {
            throw createError(400, 'reportIdRequired', 'validation');
        }

        const reportDetails = await Report.aggregate([
            { $match: { _id: mongoose.Types.ObjectId(reportId) } },

            {
                $lookup: {
                    from: "users",
                    localField: "reportedBy",
                    foreignField: "_id",
                    as: "reportedByDetails"
                }
            },
            { $unwind: "$reportedByDetails" },


            {
                $lookup: {
                    from: "users",
                    localField: "reportedUser",
                    foreignField: "_id",
                    as: "reportedUserDetails"
                }
            },
            { $unwind: "$reportedUserDetails" },


            {
                $lookup: {
                    from: "reportcategories",
                    localField: "category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            { $unwind: "$categoryDetails" },

            {
                $project: {
                    _id: 1,
                    description: 1,
                    severity: 1,
                    status: 1,
                    additionalEvidence: 1,
                    createdAt: 1,
                    reportedBy: "$reportedByDetails",
                    reportedUser: "$reportedUserDetails",
                    category: "$categoryDetails"
                }
            }
        ]);

        if (!reportDetails || reportDetails.length === 0) {
            throw createError(404, 'reportNotFound', 'notFound');
        }

        return reportDetails[0];

    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};


exports.updateReportStatusService = async (reportStatus, reportId) => {
    try {
        if (!reportId) {
            throw createError(400, 'reportIdRequired', 'validation');
        }

        const report = await Report.findById(
            reportId
        );
        if (!report) {
            throw createError(404, 'reportNotFound', 'notFound');
        }

        const validStatuses = [, "under-review", "resolved", "on-hold", "dismissed"];
        if (!validStatuses.includes(reportStatus)) {
            throw createError(400, 'invalidStatus', 'validation');
        }

    
        report.status = reportStatus;
        await report.save();

        return report; 


    }
    catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
}
