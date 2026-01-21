const Report = require("../../models/reportCollection.js")
const mongoose = require("mongoose");
const Comment = require("../../models/Comments.model")
const { isPostExist, createError, postAggregationPipeline, isUserExist, isCommunityExist } = require("../../helpers/dbHelpers.js")
const resMessages = require("../../constants/resMessages.constants.js")
const { uploadFileToS3, deleteFileFromS3 } = require("../../utils/s3.util.js")
const ReportCategory = require("../../models/reportCategories.js")
const User = require("../../models/user.model.js")
const enums = require("../../constants/enum.constants.js")




exports.allReportUser = async (pageNo = 1, pageSize = 10, status, severity, search) => {
    try {
        const matchStage = {};
        if (status) matchStage.status = status;
        if (severity) matchStage.severity = severity;

        const totalReportsAgg = await Report.aggregate([
            { $match: matchStage }
        ]);
        const totalReports = totalReportsAgg.length;
        const skip = (pageNo - 1) * pageSize;

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

            {
                $lookup: {
                    from: "users",
                    localField: "reportedBy",
                    foreignField: "_id",
                    as: "reportedByDetails"
                }
            },
            { $unwind: { path: "$reportedByDetails", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "users",
                    localField: "reportedUser",
                    foreignField: "_id",
                    as: "reportedToDetails"
                }
            },
            { $unwind: { path: "$reportedToDetails", preserveNullAndEmptyArrays: true } },

         
            ...(search
                ? [{
                    $match: {
                        $or: [
                            { description: { $regex: search, $options: "i" } },
                            { "categoryDetails.name": { $regex: search, $options: "i" } },
                            { "reportedByDetails.username": { $regex: search, $options: "i" } },
                            { "reportedToDetails.username": { $regex: search, $options: "i" } }
                        ]
                    }
                }]
                : []),

            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: pageSize },

            {
                $project: {
                    _id: 1,
                    description: 1,
                    severity: 1,
                    status: 1,
                    createdAt: 1,
                    category: "$categoryDetails",
                    reportedBy: {
                        _id: "$reportedByDetails._id",
                        name: "$reportedByDetails.username",
                        email: "$reportedByDetails.email",
                        profilePicture: "$reportedByDetails.avatarUrl"
                    },
                    reportedTo: {
                        _id: "$reportedToDetails._id",
                        name: "$reportedToDetails.username",
                        email: "$reportedToDetails.email",
                        profilePicture: "$reportedToDetails.avatarUrl"
                    }
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
            throw createError(400, "reportIdRequired", "validation");
        }

        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            throw createError(400, "invalidReportId", "validation");
        }

        const reportDetails = await Report.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(reportId) } },
            {
                $lookup: {
                    from: "users",
                    localField: "reportedBy",
                    foreignField: "_id",
                    as: "reportedByDetails",
                },
            },
            { $unwind: { path: "$reportedByDetails", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "users",
                    localField: "reportedUser",
                    foreignField: "_id",
                    as: "reportedUserDetails",
                },
            },
            { $unwind: { path: "$reportedUserDetails", preserveNullAndEmptyArrays: true } },


            {
                $lookup: {
                    from: "reportcategories",
                    localField: "category",
                    foreignField: "_id",
                    as: "categoryDetails",
                },
            },
            { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "posts",
                    let: { userId: { $toString: "$reportedUserDetails._id" } },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: [{ $toString: "$userId" }, "$$userId"]
                                }
                            }
                        },
                        { $count: "totalPosts" }
                    ],
                    as: "reportedUserPosts"
                }
            },
            {
                $lookup: {
                    from: "communities",
                    let: { userId: { $toString: "$reportedUserDetails._id" } },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: [{ $toString: "$userId" }, "$$userId"]
                                }
                            }
                        },
                        { $count: "totalCommunities" }
                    ],
                    as: "reportedUserCommunities"
                }
            },
            {
                $lookup: {
                    from: "posts",
                    let: { userId: { $toString: "$reportedByDetails._id" } },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: [{ $toString: "$userId" }, "$$userId"]
                                }
                            }
                        },
                        { $count: "totalPosts" }
                    ],
                    as: "reportedByPosts"
                }
            },
            {
                $lookup: {
                    from: "communities",
                    let: { userId: { $toString: "$reportedByDetails._id" } },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: [{ $toString: "$userId" }, "$$userId"]
                                }
                            }
                        },
                        { $count: "totalCommunities" }
                    ],
                    as: "reportedByCommunities"
                }
            },
            {
                $addFields: {
                    "reportedUserDetails.totalPosts": {
                        $ifNull: [{ $arrayElemAt: ["$reportedUserPosts.totalPosts", 0] }, 0],
                    },
                    "reportedUserDetails.totalCommunities": {
                        $ifNull: [
                            { $arrayElemAt: ["$reportedUserCommunities.totalCommunities", 0] },
                            0,
                        ],
                    },

                    "reportedByDetails.totalPosts": {
                        $ifNull: [{ $arrayElemAt: ["$reportedByPosts.totalPosts", 0] }, 0],
                    },
                    "reportedByDetails.totalCommunities": {
                        $ifNull: [
                            { $arrayElemAt: ["$reportedByCommunities.totalCommunities", 0] },
                            0,
                        ],
                    },
                },
            },


            {
                $project: {
                    _id: 1,
                    description: 1,
                    severity: 1,
                    status: 1,
                    additionalEvidence: 1,
                    createdAt: 1,

                    reportedBy: {
                        _id: "$reportedByDetails._id",
                        username: "$reportedByDetails.username",
                        email: "$reportedByDetails.email",
                        avatarUrl: "$reportedByDetails.avatarUrl",
                        totalPosts: "$reportedByDetails.totalPosts",
                        totalCommunities: "$reportedByDetails.totalCommunities",
                    },

                    reportedUser: {
                        _id: "$reportedUserDetails._id",
                        username: "$reportedUserDetails.username",
                        email: "$reportedUserDetails.email",
                        avatarUrl: "$reportedUserDetails.avatarUrl",
                        totalPosts: "$reportedUserDetails.totalPosts",
                        totalCommunities: "$reportedUserDetails.totalCommunities",
                    },

                    category: {
                        _id: "$categoryDetails._id",
                        name: "$categoryDetails.name",
                        description: "$categoryDetails.description",
                    },
                },
            },
        ]);

        if (!reportDetails || reportDetails.length === 0) {
            throw createError(404, "reportNotFound", "notFound");
        }

        return reportDetails[0];
    } catch (error) {
        console.error("getReportDetailsService error:", error);
        if (error.statusCode) throw error;
        throw createError(500, "serverError", "error");
    }
};




exports.reportActionService = async (reportId, action, reason) => {
    try {
        if (!reportId) {
            throw createError(400, 'reportIdRequired', 'validation');
        }
        if (!action) {
            throw createError(400, 'actionRequired', 'validation');
        }
        const report = await Report.findById(
            reportId
        );
        if (!report) {
            throw createError(404, 'reportNotFound', 'notFound');
        }


        if (
            report.status === enums.reportStatus.RESOLVED ||
            report.status === enums.reportStatus.DISMISSED
        ) {
            throw createError(400, 'actionNotAllowedOnClosedReport', 'validation');
        }
        const validActions = [enums.userAccountState.NORMAL, enums.userAccountState.WARNING, enums.userAccountState.SUSPENDED];
        if (action && !validActions.includes(action)) {
            throw createError(400, 'invalidAction', 'validation');
        }
        if (action === enums.userAccountState.SUSPENDED && !reason) {
            throw createError(400, 'reasonRequiredForDismissal', 'validation');
        }
        const reportedUser = await User.findById(report.reportedUser);

        if (!reportedUser) {
            throw createError(404, 'reportedUserNotFound', 'notFound');
        }



        reportedUser.accountState = action;
        reportedUser.dateOfSuspend =
            action === enums.userAccountState.SUSPENDED ? new Date() : null;

        await reportedUser.save();

        if (reason) report.reason = reason;
        report.reportActionTaken = action
        report.status = enums.reportStatus.RESOLVED;
        await report.save();
        return report;


    }
    catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};


exports.updateReportStatusService = async (reportId, reportStatus) => {
    try {
        if (!reportId) {
            throw createError(400, "reportIdRequired", "validation");
        }

        const report = await Report.findById(reportId);
        if (!report) {
            throw createError(404, "reportNotFound", "notFound");
        }

        const validStatuses = [
            enums.reportStatus.PENDING,
            enums.reportStatus.UNDERREVIEW,
            enums.reportStatus.RESOLVED,
            enums.reportStatus.ONHOLD,
            enums.reportStatus.DISMISSED,
        ];

        if (!validStatuses.includes(reportStatus)) {
            throw createError(400, "invalidStatus", "validation");
        }

        if (
            report.status === enums.reportStatus.RESOLVED ||
            report.status === enums.reportStatus.DISMISSED
        ) {
            throw createError(
                400,
                "cannotUpdateClosedReport",
                "validation"
            );
        }

        report.status = reportStatus;
        await report.save();

        return report
    } catch (error) {
        console.error("updateReportStatusService error:", error);
        if (error.statusCode) throw error;
        throw createError(500, "serverError", "error");
    }
};
