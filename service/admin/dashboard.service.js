const Post = require("../../models/post.model")
const UserStats = require("../../models/userActivityStats.model")
const User = require("../../models/user.model.js")
const mongoose = require("mongoose");
const Comment = require("../../models/Comments.model")
const { isPostExist, createError, postAggregationPipeline, isUserExist, isCommunityExist, getAllFriends } = require("../../helpers/dbHelpers.js")
const resMessages = require("../../constants/resMessages.constants.js")
const HashTag = require("../../models/hashTag.models.js")
const { deleteFileFromS3 } = require("../../utils/s3.util.js")
const Community = require("../../models/community.model.js")
const DailyUserStats = require("../../models/dailyUserStats.model.js")
const Report = require("../../models/reportCollection.js")


exports.dashboardDataService = async (userId) => {
    try {
        if (!userId) {
            throw createError(400, "userNotFound", "notFound");
        }
        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, "userNotFound", "notFound");
        }
        if (user.role !== 'admin') {
            throw createError(403, "notAuthorized", "validation");
        }

        const [overview, communityDistribution, monthlyGrowth, dailyTraffic] = await Promise.all([
            platFormOverview(),
            CommunityDistribution(),
            monthlyUserGrowth(),
            dailyUserPattern(),

        ]);
        return {
            overview,
            communityDistribution,
            monthlyGrowth,
            dailyTraffic
        };

    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};


const platFormOverview = async () => {
    const totalUser = await User.countDocuments({
        status: { $ne: "deleted" }
    });
    const totalActiveUser = await User.countDocuments({ status: active });
    const totalCommunities = await Community.countDocuments();
    const totalPosts = await Post.countDocuments();
    const totalReportUserToday = await Report.countDocuments({
        createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
    });
    return { totalUser, totalActiveUser, totalCommunities, totalPosts, totalReportUserToday };
};

const CommunityDistribution = async () => {
    try {
        const totalCommunities = await Community.countDocuments();
        const distribution = await Community.aggregate([
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "communitycategories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "categoryInfo"
                }
            },
            {
                $unwind: "$categoryInfo"
            },
            {
                $project: {
                    _id: 0,
                    categoryId: "$_id",
                    categoryName: "$categoryInfo.name",
                    count: 1,
                    percentage: { $multiply: [{ $divide: ["$count", totalCommunities] }, 100] }
                }
            }
        ]);
        return distribution;
    } catch (error) {
        console.error("Error fetching community distribution:", error);
        throw error;
    }
};



const monthlyUserGrowth = async () => {
    try {
        const currentYear = new Date().getFullYear();
        const growth = await User.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lt: new Date(`${currentYear + 1}-01-01`)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id": 1 }
            },
            {
                $project: {
                    _id: 0,
                    month: "$_id",
                    count: 1
                }
            }
        ]);


        const result = Array.from({ length: 12 }, (_, i) => {
            const monthData = growth.find(g => g.month === i + 1);
            return {
                month: i + 1,
                count: monthData ? monthData.count : 0
            };
        });

        return result;
    } catch (error) {
        console.error("Error fetching monthly user growth:", error);
        throw error;
    }
};


const dailyUserPattern = async () => {
    try {
        const records = await DailyUserStats.find();
        const formatted = records.map((record) => {
            const hourlyData = record.hourlyCounts.map((count, index) => {
                const hour = index.toString().padStart(2, "0") + ":00";
                return { hour, count };
            });

            return {
                _id: record._id,
                date: record.date,
                hourlyData,
            };
        });

        return formatted;
    } catch (error) {
        console.error("Error fetching dailyTrafficPattern:", error);
        throw error;
    }
};


exports.getAllUserService = async (
    pageNo = 1,
    pageSize = 10,
    search,
    status
) => {
    try {
        const query = { status: { $ne: 'deleted' } };
        if (status) {
            query.status = status;
        }

        if (search) {
            search = search.trim();
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (pageNo - 1) * pageSize;

        const [users, totalUsers] = await Promise.all([
            User.find(query, {
                passwordHash: 0,
                resetPasswordToken: 0,
                resetPasswordExpires: 0
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize),

            User.countDocuments(query)
        ]);

        return {
            pagination: {
                totalUsers,
                totalPages: Math.ceil(totalUsers / pageSize),
                currentPage: Number(pageNo),
                limit: Number(pageSize)
            },
            data: users
        };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};








