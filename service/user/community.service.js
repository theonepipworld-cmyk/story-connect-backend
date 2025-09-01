const Post = require("../../models/post.model")
const UserStats = require("../../models/userActivityStats.model")
const mongoose = require("mongoose");
const Comment = require("../../models/Comments.model")
const { uploadFileToS3, deleteFileFromS3 } = require('../../utils/s3.util');
const { isPostExist, createError, postAggregationPipeline, isUserExist, isCommunityExist } = require("../../helpers/dbHelpers.js")
const resMessages = require("../../constants/resMessages.constants.js")
const Hashtag = require("../../models/hashTag.models.js")
const Community = require("../../models/community.model.js")
const CommunityMember = require("../../models/communityMember.model.js")
const CommunityCategory = require("../../models/communityCategoryModel.js")
const Block = require("../../models/block.model.js")





exports.createCommunityService = async (communityDetails, userId, file) => {
    console.log(file)
    try {
        if (!userId) {
            throw createError(400, resMessages.notFound.userNotFound);
        }

        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, resMessages.notFound.userNotFound);
        }

        let communityImageUrl = "";
        if (file) {
            const uploaded = await uploadFileToS3(file, "coverImage");
            communityImageUrl = uploaded?.Location;
        }
        let manualCategoryName = undefined;
        const communityCategory = await CommunityCategory.findById(communityDetails.category)
        if (communityCategory.name === "Others") {
            if (!communityDetails.categoryName) {
                throw createError(400, resMessages.validation.categoryName);
            }
            manualCategoryName = communityDetails.categoryName;
        }

        const newCommunity = new Community({
            name: communityDetails.name,
            description: communityDetails.description,
            userId: userId,
            coverImage: communityImageUrl,
            category: communityDetails.category,
            manualCategoryName,
            memberCount: 1
        });

        const savedCommunity = await newCommunity.save();
        await CommunityMember.create({
            userId: user._id,
            communityId: newCommunity._id,
            role: "admin"
        })
        return savedCommunity;

    } catch (error) {
        throw createError(500, error.message);
    }
};

exports.joinCommunityService = async (userId, data) => {
    try {
        const { communityId } = data
        if (!userId) {
            throw createError(400, resMessages.notFound.userNotFound);
        }
        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, resMessages.notFound.userNotFound);
        }
        const isAlreadyMember = await CommunityMember.findOne({
            userId: user._id,
            communityId: communityId,
        })
        if (isAlreadyMember) {
            throw createError(400, resMessages.validation.alreadyCommunityMember);
        }

        const community = await isCommunityExist(communityId);
        const blocked = await Block.findOne({
            $or: [
                { blocker: community.userId, blocked: userId },
                { blocker: userId, blocked: community.userId }
            ]
        });
        if (blocked) throw createError(403, resMessages.validation.userBlocked);
        const joined = await CommunityMember.create({
            userId: user._id,
            communityId: communityId,
            role: "member"
        });

        await Community.findByIdAndUpdate(
            { _id: communityId },
            { $inc: { memberCount: 1 } },
        );
        return joined;
    }
    catch (error) {
        throw createError(500, error.message);
    }
};

exports.userCommunityService = async (userId, search = "", page = 1, limit = 10) => {
    console.log("userId", userId)
    if (!userId) {
        throw createError(400, resMessages.notFound.userNotFound);
    }
    try {
        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, resMessages.notFound.userNotFound);
        }
        const offset = (page - 1) * limit;

        const result = await Community.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            {
                $lookup: {
                    from: "communitycategories",
                    localField: "category",
                    foreignField: "_id",
                    as: "categoryInfo"
                }
            },
            {
                $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true }
            },
            ...(search
                ? [
                    {
                        $match: {
                            $or: [
                                { name: { $regex: search, $options: "i" } },
                                { "categoryInfo.name": { $regex: search, $options: "i" } },
                            ]
                        }
                    }
                ]
                : []),
            {
                $project: {
                    name: 1,
                    description: 1,
                    isActive: 1,
                    coverImage: 1,
                    manualCategoryName: 1,
                    memberCount: 1,
                    "categoryInfo.name": 1,
                    createdAt: 1

                }
            },
            {
                $facet: {
                    paginatedResults: [
                        { $sort: { createdAt: -1 } },
                        { $skip: offset },
                        { $limit: limit }
                    ],
                    totalCount: [
                        { $count: "count" }
                    ]
                }
            }
        ]);

        const communities = result[0].paginatedResults;
        const total = result[0].totalCount[0]?.count || 0;

        return {
            communities,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                limit,
            }
        };

    } catch (error) {
        throw new Error(error.message || "Failed to fetch user communities");
    }
};


exports.categoryService = async () => {
    try {
        const result = await CommunityCategory.find();
        return result;
    } catch (error) {
        throw new Error(error.message);
    }
};

exports.allCommunitiesService = async (userId, search, page = 1, limit = 10) => {
    if (!userId) {
        throw createError(400, resMessages.notFound.userNotFound);
    }
    console.log(userId)
    try {
        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, resMessages.notFound.userNotFound);
        }
        const offset = (page - 1) * limit;
        const Blocked = await Block.find({
            $or: [
                { blocker: userId },
                { blocked: userId }
            ]
        })
        console.log("Blocked----------------------------", Blocked);
        const blockedUserIds = await Blocked?.map(b =>
            b.blocker.toString() === userId.toString() ? b.blocked : b.blocker
        );
        const result = await Community.aggregate([
            {
                $match: {
                    userId: { $nin: blockedUserIds }
                }
            },
            {
                $lookup: {
                    from: "communitycategories",
                    localField: "category",
                    foreignField: "_id",
                    as: "categoryInfo"
                }
            },
            { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } },

            // Search filter
            ...(search
                ? [
                    {
                        $match: {
                            $or: [
                                { "categoryInfo.name": { $regex: search, $options: "i" } },
                                { name: { $regex: search, $options: "i" } },
                            ]
                        }
                    }
                ]
                : []),

            {
                $lookup: {
                    from: "communitymembers",
                    let: { communityIdObj: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$communityId", "$$communityIdObj"] },
                                        { $eq: ["$userId", new mongoose.Types.ObjectId(userId)] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "joinedInfo"
                }
            },
            {
                $addFields: {
                    isJoinedByMe: {
                        $gt: [
                            { $size: { $ifNull: ["$joinedInfo", []] } },
                            0
                        ]
                    }
                }
            },

            {
                $facet: {
                    paginatedResults: [
                        { $sort: { createdAt: -1 } },
                        { $skip: offset },
                        { $limit: limit },
                        {
                            $project: {
                                name: 1,
                                description: 1,
                                coverImage: 1,
                                isActive: 1,
                                manualCategoryName: 1,
                                memberCount: 1,
                                "categoryInfo.name": 1,
                                isJoinedByMe: 1,
                                createdAt: 1
                            }
                        }
                    ],
                    totalCount: [{ $count: "count" }]
                }
            }
        ]);
        const communities = result[0].paginatedResults;
        const total = result[0].totalCount[0]?.count || 0;

        return {
            communities,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                limit,
            }
        };
    } catch (error) {
        throw new Error(error.message);
    }
};


exports.getCommunityDetailService = async (communityId, userId) => {
    if (!userId) {
        throw createError(400, resMessages.notFound.userNotFound);
    }
    try {
        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, resMessages.notFound.userNotFound);
        }
        const community = await isCommunityExist(communityId)
        const communityUserId = community.userId
        const blocked = await Block.findOne({
            $or: [
                { blocker: communityUserId, blocked: userId },
                { blocker: userId, blocked: communityUserId }
            ]
        })
        if (blocked) {
            throw new Error(resMessages.validation.userBlocked);
        }
        const result = await Community.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(communityId) } },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "userInfo"
                }
            },
            { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "communitycategories",
                    localField: "category",
                    foreignField: "_id",
                    as: "categoryInfo"
                }
            },
            { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "communitymembers",
                    let: { communityIdObj: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$communityId", "$$communityIdObj"] },
                                        { $eq: ["$userId", new mongoose.Types.ObjectId(userId)] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "joinedInfo"
                }
            },
            {
                $addFields: {
                    isJoinedByMe: {
                        $gt: [
                            { $size: { $ifNull: ["$joinedInfo", []] } },
                            0
                        ]
                    }
                }
            },
            {
                $project: {
                    name: 1,
                    description: 1,
                    coverImage: 1,
                    isActive: 1,
                    manualCategoryName: 1,
                    memberCount: 1,
                    "userInfo.username": 1,
                    "userInfo.email": 1,
                    "userInfo.avatarUrl": 1,
                    "categoryInfo.name": 1,
                    "userInfo.currentCountry": 1,
                    isJoinedByMe: 1,
                    createdAt: 1
                }
            }
        ]);

        return result[0] || null;
    } catch (error) {
        throw new Error(error.message);
    }
};

exports.getCommunityMemberService = async (communityId, page = 1, limit = 10) => {
    try {
        const offSet = (page - 1) * limit;
        const result = await CommunityMember.aggregate([
            {
                $match: { communityId: new mongoose.Types.ObjectId(communityId) }
            },
            {
                $facet: {
                    data: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "userId",
                                foreignField: "_id",
                                as: "userInfo"
                            }
                        },
                        { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
                        {
                            $project: {
                                role: 1,
                                communityId: 1,
                                "userInfo.username": 1,
                                "userInfo.email": 1,
                                "userInfo.avatarUrl": 1,
                                "userInfo.currentCountry": 1,
                                "userInfo.profession": 1,
                                "userInfo.bio": 1
                            }
                        },
                        { $sort: { createdAt: -1 } },
                        { $skip: offSet },
                        { $limit: limit }
                    ],
                    totalCount: [
                        { $count: "count" }
                    ]
                }
            }
        ]);

        const data = result[0]?.data || [];
        const totalCount = result[0]?.totalCount[0]?.count || 0;

        return {
            data,
            pagination: {
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                currentPage: page,
                limit,
            }
        }
    }
    catch (error) {
        throw new Error(error.message);
    }
};

exports.getCommunityPostsService = async (communityId, page, limit, userId) => {
    if (!userId) {
        throw createError(400, resMessages.notFound.userNotFound);
    }
    try {

        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, resMessages.notFound.userNotFound);
        }
        const community = await isCommunityExist(communityId);
        const blocked = await Block.findOne({
            $or: [
                { blocker: community.userId, blocked: userId },
                { blocker: userId, blocked: community.userId }
            ]
        });
        if (blocked) throw createError(403, resMessages.validation.userBlocked);
        const offSet = (page - 1) * limit
        const result = await Post.aggregate([
            {
                $match: { communityId: new mongoose.Types.ObjectId(communityId) }
            },
            {
                $facet: {
                    paginatedResults: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "userId",
                                foreignField: "_id",
                                as: "userInfo"
                            }
                        },
                        {
                            $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true }
                        },
                        {
                            $lookup: {
                                from: "userstats",
                                localField: "_id",
                                foreignField: "postId",
                                as: "stats",
                            },
                        },
                        {
                            $unwind: { path: "$stats", preserveNullAndEmptyArrays: true }
                        },
                        {
                            $addFields: {
                                totalLikes: { $ifNull: ["$stats.totalLikes", 0] },
                                totalViews: { $ifNull: ["$stats.totalViews", 0] },
                                isPostLikedByMe: {
                                    $anyElementTrue: {
                                        $map: {
                                            input: { $ifNull: ["$stats.likes", []] },
                                            as: "like",
                                            in: { $eq: ["$$like.userId", { $toString: user._id }] }
                                        }
                                    }
                                }

                            }
                        },
                        {
                            $lookup: {
                                from: "comments",
                                localField: "_id",
                                foreignField: "postId",
                                as: "comments",
                            },
                        },
                        {
                            $addFields: {
                                totalComments: { $size: "$comments" },
                            },
                        },
                        {
                            $project: {
                                _id: 1,
                                postHeading: 1,
                                postDescription: 1,
                                mediaUrls: 1,
                                hashtags: 1,
                                communityId: 1,
                                type: 1,
                                storyOfTheMonth: 1,
                                videoOfTheMonth: 1,
                                createdAt: 1,
                                updatedAt: 1,
                                "userInfo._id": 1,
                                "userInfo.username": 1,
                                "userInfo.email": 1,
                                "userInfo.avatarUrl": 1,
                                "userInfo.currentCountry": 1,
                                totalLikes: 1,
                                totalViews: 1,
                                totalComments: 1,
                                isPostLikedByMe: 1,
                            },
                        },
                        {
                            $sort: { createdAt: -1 },
                        },
                        {
                            $skip: offSet
                        },
                        {
                            $limit: limit
                        }
                    ],
                    totalCount: [
                        { $count: "count" }
                    ]
                }
            }
        ])

        const communityPost = result[0]?.paginatedResults || []
        const total = result[0]?.totalCount[0]?.count || 0;

        return {
            communityPost,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                limit,
            }
        };
    }
    catch (error) {
        throw new Error(error.message);
    }
};


// exports.getuserCommunitiesFeedService = async (userId, page, limit) => {
//     if (!userId) {
//         throw createError(400, resMessages.notFound.userNotFound);
//     }
//     try {
//         const user = await isUserExist(userId);
//         if (!user) {
//             throw createError(400, resMessages.notFound.userNotFound);
//         }
//         const result = Post.aggregate([
//             {
//                 $match:{
//                     userId : user._id ,
//                     type:Community
//                  }
//             }
//         ])
//     }
//     catch (error) {
//         throw new Error(error.message);
//     }
// }


exports.removeCommunityMemberService = async (data, userId) => {
    if (!userId) {
        throw createError(400, resMessages.notFound.userNotFound);
    }

    try {
        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, resMessages.notFound.userNotFound);
        }

        const community = await Community.findById(data.communityId)
        if (!community) {
            throw createError(404, resMessages.notFound.communityNotFound);
        }

        const isMemberExist = await CommunityMember.findOne({
            communityId: data.communityId,
            userId: data.userId
        })

        if (!isMemberExist) {
            throw createError(400, resMessages.notFound.memberNotFound);
        }

        if (community.userId.toString() !== userId.toString()) {
            throw createError(403, resMessages.customError.NotAuthorizedRemove);
        }
        if (community.userId.toString() === data.userId.toString()) {
            throw createError(400, resMessages.customError.ownerNotRemove);
        }

        const result = await CommunityMember.findOneAndDelete({
            communityId: community._id,
            userId: data.userId
        })
        if (community.memberCount > 0) {
            await Community.findByIdAndUpdate(
                community._id,
                { $inc: { memberCount: -1 } },
            );
        }
        return result;
    } catch (error) {
        throw new Error(error.message);
    }
};


exports.removeCommunityService = async (communityId, userId) => {
    if (!userId) {
        throw createError(400, resMessages.notFound.userNotFound);
    }
    try {
        const user = await isUserExist(userId);
        if (!user) {
            throw createError(400, resMessages.notFound.userNotFound);
        }

        const community = await Community.findById(communityId)
        if (!community) {
            throw createError(404, resMessages.notFound.communityNotFound);
        }

        if (community.userId.toString() !== userId.toString()) {
            throw createError(403, resMessages.customError.NotAuthorized);
        }

        const result = await Community.findByIdAndDelete(community._id)

        if (result) {
            await CommunityMember.deleteMany({ communityId: community._id })
            const posts = Post.find({ communityId: community._id });
            const postIds = posts.map((p) => p._id.toString());
            if (postIds.length > 0) {
                await UserStats.deleteMany({
                    postId: { $in: postIds }
                });
            }
            await Post.deleteMany({ communityId: community._id });
        }

        return result;

    } catch (error) {
        throw new Error(error.message);
    }
};

exports.updateCommunityService = async (communityId, userId, data, file) => {
    try {
        if (!userId) throw createError(400, resMessages.notFound.userNotFound);
        const user = await isUserExist(userId);
        if (!user) throw createError(400, resMessages.notFound.userNotFound);

        const community = await Community.findById(communityId)
        if (community.userId.toString() !== userId.toString()) {
            throw createError(403, resMessages.customError.NotAuthorized);
        }

        if (file) {
            if (community.coverImage) {
                await deleteFileFromS3(community.coverImage);
            }
            const uploaded = await uploadFileToS3(file, "coverImage");
            data.coverImage = uploaded.Location;
        }
        if (data.category) {
            const category = await CommunityCategory.findById(data.category)
            if (category.name === "Others") data.manualCategoryName = data.categoryName;
            else data.manualCategoryName = undefined;
        }

        const updatedCommunity = await Community.findByIdAndUpdate(
            communityId,
            { $set: data },
            { new: true }
        );
        return updatedCommunity;
    } catch (error) {
        throw new Error(error.message);
    }
};





