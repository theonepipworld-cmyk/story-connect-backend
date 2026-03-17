const Post = require("../../models/post.model")
const UserStats = require("../../models/userActivityStats.model")
const mongoose = require("mongoose");
const Comment = require("../../models/Comments.model")
const { uploadFileToS3, deleteFileFromS3 } = require('../../utils/s3.util');
const { isPostExist, createError, postAggregationPipeline, isUserExist, isCommunityExist, getAllFriends } = require("../../helpers/dbHelpers.js")
const resMessages = require("../../constants/resMessages.constants.js")
const Hashtag = require("../../models/hashTag.models.js")
const Community = require("../../models/community.model.js")
const CommunityMember = require("../../models/communityMember.model.js")
const CommunityCategory = require("../../models/communityCategoryModel.js")
const Block = require("../../models/block.model.js")
const Friend = require("../../models/friends.model.js")
const enums = require("../../constants/enum.constants.js")





exports.createCommunityService = async (communityDetails, userId, file) => {
    try {
        // Validate userId
        if (!userId) {
            throw createError(404, 'userNotFound', 'notFound');
        }

        const user = await isUserExist(userId);
        if (!user) {
            throw createError(404, 'userNotFound', 'notFound');
        }

        // Check for duplicate community name
        const existingCommunity = await Community.findOne({ name: communityDetails.name });
        if (existingCommunity) {
            throw createError(400, 'AlreadyExist', 'validation', {
                communityId: existingCommunity._id,
                communityName: existingCommunity.name
            });
        }

        // Upload community image if provided
        let communityImageUrl = "";
        if (file) {
            const uploaded = await uploadFileToS3(file, "community/coverImage");
            communityImageUrl = uploaded?.Location;
        }

        // Handle manual category name if category is "Others"
        let manualCategoryName = undefined;
        const communityCategory = await CommunityCategory.findById(communityDetails.category);
        if (!communityCategory) {
            throw createError(404, 'communityCategoryNotFound', 'notFound');
        }
        if (communityCategory.name === "Others") {
            if (!communityDetails.categoryName) {
                throw createError(400, 'CategoryRequired', 'validation');
            }
            manualCategoryName = communityDetails.categoryName;
        }

        // Create new community
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

        // Add creator as admin member
        await CommunityMember.create({
            userId: user._id,
            communityId: newCommunity._id,
            role: "admin"
        });

        return savedCommunity;

    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};


exports.joinCommunityService = async (userId, data) => {
    try {
        const { communityId } = data
        if (!userId) {
            throw createError(404, 'userNotFound', 'notFound');
        }
        const user = await isUserExist(userId);
        if (!user) {
            throw createError(404, 'userNotFound', 'notFound');
        }
        const isAlreadyMember = await CommunityMember.findOne({
            userId: user._id,
            communityId: communityId,
        })
        if (isAlreadyMember) {
            throw createError(400, 'alreadyCommunityMember', 'validation');
        }

        const community = await isCommunityExist(communityId);
        const blocked = await Block.findOne({
            $or: [
                { blocker: community.userId, blocked: userId },
                { blocker: userId, blocked: community.userId }
            ]
        });

        if (blocked) throw createError(403, 'userBlocked', 'validation');
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
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};

exports.userCommunityService = async (userId, search = "", page = 1, limit = 10) => {
    if (!userId) {
        throw createError(404, 'userNotFound', 'notFound');
    }
    try {
        const user = await isUserExist(userId);
        if (!user) {
            throw createError(404, 'userNotFound', 'notFound');
        }

        const allUserCommunities = await CommunityMember.find({
            userId: user._id
        });
        const allUserCommunitiesIds = new Set(allUserCommunities.map((c) => c.communityId));

        const offset = (page - 1) * limit;

        const result = await Community.aggregate([
            {
                $match: { _id: { $in: Array.from(allUserCommunitiesIds).map(id => new mongoose.Types.ObjectId(id)) } }
            },
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
                $lookup: {
                    from: "communitymembers",
                    let: { communityIdObj: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$communityId", "$$communityIdObj"] } } },
                        { $sort: { createdAt: -1 } },
                        { $limit: 3 },
                        {
                            $lookup: {
                                from: "users",
                                localField: "userId",
                                foreignField: "_id",
                                as: "userInfo"
                            }
                        },
                        { $unwind: "$userInfo" },
                        {
                            $project: {
                                _id: 0,
                                "userInfo._id": 1,
                                "userInfo.avatarUrl": 1
                            }
                        }
                    ],
                    as: "membersPreview"
                }
            },
            {
                $project: {
                    name: 1,
                    description: 1,
                    isActive: 1,
                    coverImage: 1,
                    manualCategoryName: 1,
                    memberCount: 1,
                    "categoryInfo.name": 1,
                    "categoryInfo._id": 1,
                    membersPreview: 1,
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
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};


exports.categoryService = async () => {
    try {
        const result = await CommunityCategory.find();
        return result;
    } catch (error) {
        throw createError(500, 'serverError', 'error');
    }
};

exports.allCommunitiesService = async (userId, search, page = 1, limit = 10) => {
    if (!userId) {
        throw createError(404, 'userNotFound', 'notFound');
    }

    try {
        const user = await isUserExist(userId);
        if (!user) {
            throw createError(404, 'userNotFound', 'notFound');
        }
        const offset = (page - 1) * limit;

        const Blocked = await Block.find({
            $or: [{ blocker: userId }, { blocked: userId }]
        });

        const blockedUserIds = (Blocked || []).map(b =>
            b.blocker.toString() === userId.toString() ? b.blocked : b.blocker
        ).filter(Boolean);

        const result = await Community.aggregate([
            { $match: { userId: { $nin: blockedUserIds } } },
            {
                $lookup: {
                    from: "communitycategories",
                    localField: "category",
                    foreignField: "_id",
                    as: "categoryInfo"
                }
            },
            { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } },
            ...(search
                ? [{
                    $match: {
                        $or: [
                            { "categoryInfo.name": { $regex: search, $options: "i" } },
                            { name: { $regex: search, $options: "i" } }
                        ]
                    }
                }]
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
                $lookup: {
                    from: "communitymembers",
                    let: { communityIdObj: "$_id", blockedIds: blockedUserIds.map(id => new mongoose.Types.ObjectId(id)) },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$communityId", "$$communityIdObj"] },
                                        { $not: { $in: ["$userId", "$$blockedIds"] } }
                                    ]
                                }
                            }
                        },
                        { $sort: { createdAt: -1 } },
                        { $limit: 3 },
                        {
                            $lookup: {
                                from: "users",
                                localField: "userId",
                                foreignField: "_id",
                                as: "userInfo"
                            }
                        },
                        { $unwind: "$userInfo" },
                        {
                            $project: {
                                _id: 0,
                                "userInfo._id": 1,
                                "userInfo.avatarUrl": 1
                            }
                        }
                    ],
                    as: "membersPreview"
                }
            },
            {
                $addFields: {
                    isJoinedByMe: { $gt: [{ $size: { $ifNull: ["$joinedInfo", []] } }, 0] }
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
                                "categoryInfo._id": 1,
                                isJoinedByMe: 1,
                                membersPreview: 1,
                                createdAt: 1
                            }
                        }
                    ],
                    totalCount: [{ $count: "count" }]
                }
            }
        ]);

        const communities = result[0]?.paginatedResults || [];
        const total = result[0]?.totalCount?.[0]?.count || 0;

        return {
            communities,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                limit
            }
        };
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};



exports.getCommunityDetailService = async (communityId, userId) => {
    if (!userId) {
        throw createError(404, 'userNotFound', 'notFound');
    }
    try {
        const user = await isUserExist(userId);
        if (!user) {
            throw createError(404, 'userNotFound', 'notFound');
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
            throw new Error(404, 'userBlocked', 'validation');
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
                    "categoryInfo._id": 1,
                    "userInfo.currentCountry": 1,
                    isJoinedByMe: 1,
                    createdAt: 1
                }
            }
        ]);

        return result[0] || null;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};

exports.getCommunityMemberService = async (communityId, userId, page = 1, limit = 10) => {
    try {
        if (!userId) throw createError(404, 'userNotFound', 'notFound');

        userId = new mongoose.Types.ObjectId(userId);
        communityId = new mongoose.Types.ObjectId(communityId);
        const loginUserFriends = await getAllFriends(userId);
        const loginUserSendedRequest = await Friend.find({
            requester: userId,
            status: enums.friend_Request_status.PENDING
        });

        const loginUserFriendIds = new Set(
            loginUserFriends
                .map(f => f?._id ? f._id.toString() : null)
                .filter(Boolean)
        );

        const allPendingFriendIds = new Set(
            loginUserSendedRequest
                .map(f => f?.recipient ? f.recipient.toString() : null)
                .filter(Boolean)
        );

        const blocked = await Block.find({
            $or: [{ blocker: userId }, { blocked: userId }]
        }) || [];
        const blockedUserIds = (blocked || []).map(b =>
            b.blocker.toString() === userId.toString() ? b.blocked.toString() : b.blocker.toString()
        ).filter(Boolean)

        const offset = (page - 1) * limit;

        const result = await CommunityMember.aggregate([
            {
                $match: {
                    communityId: communityId,
                    userId: { $nin: blockedUserIds }
                }
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
                                username: "$userInfo.username",
                                email: "$userInfo.email",
                                avatarUrl: "$userInfo.avatarUrl",
                                currentCountry: "$userInfo.currentCountry",
                                profession: "$userInfo.profession",
                                manualProfession: "$userInfo.manualProfession",
                                bio: "$userInfo.bio",
                                userId: "$userInfo._id",
                            }
                        },
                        { $sort: { createdAt: -1 } },
                        { $skip: offset },
                        { $limit: limit }
                    ],
                    totalCount: [{ $count: "count" }]
                }
            }
        ]);

        const safeData = Array.isArray(result[0]?.data)
            ? result[0].data
            : [];

        const data = safeData.map(f => {
            const uid = f?.userId ? f.userId.toString() : null;

            return {
                ...f,
                isThisUserFriend: uid ? loginUserFriendIds.has(uid) : false,
                isReqPending: uid ? allPendingFriendIds.has(uid) : false
            };
        });


        const totalCount = result[0]?.totalCount[0]?.count || 0;

        return {
            data,
            pagination: {
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                currentPage: page,
                limit
            }
        };

    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};



exports.getCommunityPostsService = async (communityId, page, limit, userId) => {
    if (!userId) {
        throw createError(404, 'userNotFound', 'notFound');
    }
    try {

        const user = await isUserExist(userId);
        if (!user) {
            throw createError(404, 'userNotFound', 'notFound');
        }
        const community = await isCommunityExist(communityId);
        const blocked = await Block.findOne({
            $or: [
                { blocker: community.userId, blocked: userId },
                { blocker: userId, blocked: community.userId }
            ]
        });
        if (blocked) throw createError(403, 'userBlocked', 'validation');


        const allFriends = await getAllFriends(user._id);
        const allFriendIds = allFriends.map(f => f._id.toString());

        const pendingRequests = await Friend.find({
            status: enums.friend_Request_status.PENDING,
            $or: [{ requester: user._id }, { recipient: user._id }],
        });

        const pendingUserIds = pendingRequests.map(req =>
            req.requester._id.toString() === user._id.toString()
                ? req.recipient
                : req.requester
        );
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
                            $addFields: {
                                isFriend: {
                                    $in: [
                                        "$userId",
                                        allFriendIds.map(id => new mongoose.Types.ObjectId(id)),
                                    ],
                                },
                                isPendingRequest: {
                                    $in: [
                                        "$userId",
                                        pendingUserIds.map(id => new mongoose.Types.ObjectId(id)),
                                    ],
                                },
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
                                isFriend: 1,
                                isPendingRequest: 1,
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
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
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
        throw createError(404, 'userNotFound', 'notFound');
    }

    try {
        const user = await isUserExist(userId);
        if (!user) {
            throw createError(404, 'userNotFound', 'notFound');
        }

        const community = await Community.findById(data.communityId)
        if (!community) {
            throw createError(404, 'communityNotFound', 'notFound');
        }

        const isMemberExist = await CommunityMember.findOne({
            communityId: data.communityId,
            userId: data.userId
        })

        if (!isMemberExist) {
            throw createError(404, 'memberNotFound', 'notFound');
        }

        if (community.userId.toString() !== userId.toString()) {
            throw createError(403, 'NotAuthorizedRemove', 'customError');
        }
        if (community.userId.toString() === data.userId.toString()) {
            throw createError(400, 'ownerNotRemove', 'customError');
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
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};


exports.removeCommunityService = async (communityId, userId) => {
    if (!userId) {
        throw createError(404, 'userNotFound', 'notFound');
    }
    try {
        const user = await isUserExist(userId);
        if (!user) {
            throw createError(404, 'userNotFound', 'notFound');
        }

        const community = await Community.findById(communityId)
        if (!community) {
            throw createError(404, 'communityNotFound', 'notFound');
        }

        if (community.userId.toString() !== userId.toString()) {
            throw createError(403, 'NotAuthorized', 'customError');
        }

        const result = await Community.findByIdAndDelete(community._id)

        if (result) {
            await CommunityMember.deleteMany({ communityId: community._id })
            const posts = await Post.find({ communityId: community._id });
            const postIds = posts?.map((p) => p._id.toString());
            if (postIds.length > 0) {
                await UserStats.deleteMany({
                    postId: { $in: postIds }
                });
            }
            await Post.deleteMany({ communityId: community._id });
        }

        return result;

    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};

exports.updateCommunityService = async (communityId, userId, data, file) => {
    try {
        if (!userId) throw createError(404, 'userNotFound', 'notFound');
        const user = await isUserExist(userId);
        if (!user) throw createError(404, 'userNotFound', 'notFound');

        const community = await Community.findById(communityId)
        if (community.userId.toString() !== userId.toString()) {
            throw createError(403, 'NotAuthorized', 'customError');
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
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};

exports.listAllCommunityService = async (userId) => {
    try {

        const allUserCommunities = await CommunityMember.find({
            userId: new mongoose.Types.ObjectId(userId),
        });

        const allUserCommunitiesIds = allUserCommunities.map((c) => c.communityId);

        if (!allUserCommunitiesIds.length) {
            return [];
        }

        const result = await Community.aggregate([
            {
                $match: {
                    _id: { $in: allUserCommunitiesIds.map((id) => new mongoose.Types.ObjectId(id)) },
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                },
            },
            { $sort: { createdAt: -1 } },
        ]);

        return result;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};

exports.getCommunitiesByCategoriesService = async (userId, categoryId, page = 1, limit = 10) => {
    try {
        if (!userId) {
            throw createError(404, 'userNotFound', 'notFound');
        }

        if (!categoryId) {
            throw createError(404, 'communityCategoryNotFound', 'notFound');
        }

        const offset = (page - 1) * limit;

        const result = await Community.aggregate([
            {
                $match: {
                    category: new mongoose.Types.ObjectId(categoryId)
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
                $lookup: {
                    from: "communitymembers",
                    let: { communityIdObj: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$communityId", "$$communityIdObj"] } } },
                        { $sort: { createdAt: -1 } },
                        { $limit: 3 },
                        {
                            $lookup: {
                                from: "users",
                                localField: "userId",
                                foreignField: "_id",
                                as: "userInfo"
                            }
                        },
                        { $unwind: "$userInfo" },
                        {
                            $project: {
                                _id: 0,
                                "userInfo._id": 1,
                                "userInfo.avatarUrl": 1
                            }
                        }
                    ],
                    as: "membersPreview"
                }
            },

            {
                $addFields: {
                    isJoinedByMe: { $gt: [{ $size: { $ifNull: ["$joinedInfo", []] } }, 0] }
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
                                "categoryInfo._id": 1,
                                membersPreview: 1,
                                isJoinedByMe: 1,
                                createdAt: 1
                            }
                        }
                    ],
                    totalCount: [{ $count: "count" }]
                }
            }
        ]);

        const communities = result[0]?.paginatedResults || [];
        const total = result[0]?.totalCount?.[0]?.count || 0;

        const categoryName = communities.length > 0
            ? communities[0].categoryInfo?.name
            : null;

        return {
            communities,
            categoryName,
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                limit
            }
        };

    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};


exports.leaveCommunityService = async (communityId, userId) => {
    if (!userId) {
        throw createError(404, 'userNotFound', 'notFound');
    }

    try {
        const user = await isUserExist(userId);
        console.log(communityId)
        if (!user) {
            throw createError(404, 'userNotFound', 'notFound');
        }

        communityId = new mongoose.Types.ObjectId(communityId);


        const membership = await CommunityMember.findOne({
            communityId: communityId,
            userId: user._id
        });

        if (!membership) {
            throw createError(404, 'communityNotFound', 'notFound');
        }


        if (membership.role === "admin") {
            throw createError(400, 'ownerCantRemove', 'validation');
        }


        const result = await CommunityMember.deleteOne({
            communityId: communityId,
            userId: user._id
        });

        return result;

    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};






