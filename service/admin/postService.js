const Post = require("../../models/post.model")
const UserStats = require("../../models/userActivityStats.model")
const mongoose = require("mongoose");
const Comment = require("../../models/Comments.model")
const { isPostExist, createError, postAggregationPipeline, isUserExist, isCommunityExist, getAllFriends } = require("../../helpers/dbHelpers.js")
const resMessages = require("../../constants/resMessages.constants.js")
const HashTag = require("../../models/hashTag.models.js")
const { deleteFileFromS3 } = require("../../utils/s3.util.js")
const Block = require("../../models/block.model.js")
const Community = require("../../models/community.model.js")
const CommunityMember = require("../../models/communityMember.model.js")
const enums = require("../../constants/enum.constants.js")
const Friend = require("../../models/friends.model.js")




exports.addStoryAndVideoOfMonthService = async (postId, type) => {
    try {
        const post = await isPostExist(postId);
        if (!post) {
            throw createError(404, 'postNotFound', 'notFound');
        }
        let updateFields = {};
        if (type === enums.typePost.IMAGE) {
            updateFields.storyOfTheMonth = true;
        } else if (type === enums.typePost.VIDEO) {
            updateFields.videoOfTheMonth = true;
        } else {
            throw createError(400, 'invalidType', 'validation');
        }

        const result = await Post.findByIdAndUpdate(post._id, updateFields, { new: true });

        return result;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
}

exports.removeStoryAndVideoOfMonthService = async (postId, type) => {
    try {
        const post = await isPostExist(postId);
        if (!post) {
            throw createError(404, 'postNotFound', 'notFound');
        }

        let updateFields = {};

        if (type === enums.typePost.IMAGE) {
            updateFields.storyOfTheMonth = false;
        } else if (type === enums.typePost.VIDEO) {
            updateFields.videoOfTheMonth = false;
        } else {
            throw createError(400, 'invalidType', 'validation');
        }

        const result = await Post.findByIdAndUpdate(post._id, updateFields, { new: true });

        return result;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
};

exports.getHighlightedPostsService = async () => {
    try {


        let matchStage = {
            $or: [
                { $and: [{ $or: [{ type: enums.typePost.IMAGE }, { type: null }] }, { storyOfTheMonth: true }] },
                { $and: [{ type: enums.typePost.VIDEO }, { videoOfTheMonth: true }] }
            ]
        };



        const pipeline = [
            { $match: matchStage },
            {
                $facet: {
                    paginatedPosts: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "userId",
                                foreignField: "_id",
                                as: "userInfo"
                            }
                        },
                        { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },

                        // Join stats
                        {
                            $lookup: {
                                from: "userstats",
                                localField: "_id",
                                foreignField: "postId",
                                as: "stats",
                            },
                        },
                        {
                            $addFields: {
                                totalLikes: { $size: { $ifNull: [{ $arrayElemAt: ["$stats.likes", 0] }, []] } },
                                totalViews: { $size: { $ifNull: [{ $arrayElemAt: ["$stats.views", 0] }, []] } },
                                isPostLikedByMe: {
                                    $let: {
                                        vars: { statsDoc: { $arrayElemAt: ["$stats", 0] } },
                                        in: {
                                            $anyElementTrue: {
                                                $map: {
                                                    input: { $ifNull: ["$$statsDoc.likes", []] },
                                                    as: "like",
                                                    in: { $eq: ["$$like.userId", { $toString: user._id }] }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        // Join comments
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
                                totalComments: { $size: { $ifNull: ["$comments", []] } }
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
                                totalLikes: 1,
                                totalViews: 1,
                                totalComments: 1,
                                isPostLikedByMe: 1,
                                user: {
                                    _id: "$userInfo._id",
                                    username: "$userInfo.username",
                                    avatarUrl: "$userInfo.avatarUrl",
                                    currentCountry: "$userInfo.currentCountry",
                                    email: "$userInfo.email"
                                }
                            },
                        },
                        { $sort: { createdAt: -1 } },
                    ],
                    totalCount: [
                        { $count: "count" }
                    ]
                }
            }
        ];

        const result = await Post.aggregate(pipeline);
        const posts = result[0]?.paginatedPosts || [];

        const storyOfTheMonthPosts = posts.filter(post => post.storyOfTheMonth);
        const videoOfTheMonthPosts = posts.filter(post => post.videoOfTheMonth);
        return {
            storyOfTheMonthPosts,
            videoOfTheMonthPosts
        }

    }
    catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
}

