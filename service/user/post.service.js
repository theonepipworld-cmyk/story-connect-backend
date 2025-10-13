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


// Create Post
exports.createPost = async (data, cleanHashTags) => {
  try {
    if (data.postType === "community") {
      if (!data.communityId) {
        throw createError(400, resMessages.notFound.communityNotFound);
      }
      const communityExists = await isCommunityExist(data.communityId);
      if (!communityExists) {
        throw createError(400, resMessages.notFound.communityNotFound);
      }
    }
    const post = new Post(data);
    //update hashTagColection
    if (cleanHashTags?.length > 0) {
      await Promise.all(
        cleanHashTags.map(async (tag) => {
          await HashTag.findOneAndUpdate(
            { tag: tag },
            {
              $inc: { usageCount: 1 },
              $addToSet: { posts: post._id }
            },
            { upsert: true, new: true }
          );
        })
      );
    }

    return await post.save();
  } catch (error) {
    throw error;
  }
};

// Get user feed Posts
exports.getUserFeedPostsService = async (page, limit, userId) => {
  try {
    if (!userId) throw createError(400, resMessages.notFound.userNotFound);

    const user = await isUserExist(userId);
    if (!user) throw createError(400, resMessages.notFound.userNotFound);

    const allFriends = await getAllFriends(user._id);
    const allFriendIds = allFriends.map(f => f._id.toString());

    const pendingRequests = await Friend.find({
      status: enums.friend_Request_status.PENDING,
      $or: [
        { requester: user._id },
        { recipient: user._id }
      ]
    });



    const pendingUserIds = pendingRequests.map(req =>
      req.requester._id.toString() === user._id.toString() ? req.recipient : req.requester
    );


    const joinedCommunities = await CommunityMember.find({ userId: user._id }).select("communityId");
    const allCommunityIds = joinedCommunities.map(c => c.communityId.toString());

    const blocked = await Block.find({ $or: [{ blocked: userId }, { blocker: userId }] });
    const blockedUserIds = blocked.map(b =>
      new mongoose.Types.ObjectId(
        b.blocker.toString() === userId.toString() ? b.blocked : b.blocker
      )
    );

    // const baseMatch = {
    //   userId: { $nin: [...blockedUserIds, new mongoose.Types.ObjectId(userId)] }
    // };

    const friendObjectIds = allFriendIds.map(id => new mongoose.Types.ObjectId(id));
    const orConditions = [];
    const baseMatch = {
      userId: {
        $nin: [
          ...blockedUserIds,
          new mongoose.Types.ObjectId(userId)
        ]
      }
    };

    console.log(allFriendIds, allCommunityIds)


    let finalMatch;
    if (allFriendIds.length > 0 || allCommunityIds.length > 0) {
      const orConditions = [];

      if (allCommunityIds.length > 0) {
        orConditions.push({
          $and: [
            { communityId: { $in: allCommunityIds.map(id => new mongoose.Types.ObjectId(id)) } },
            { userId: { $ne: new mongoose.Types.ObjectId(userId) } }
          ]
        });
      }

      if (allFriendIds.length > 0) {
        orConditions.push({
          $and: [
            { userId: { $in: allFriendIds.map(id => new mongoose.Types.ObjectId(id)) } },
            { $or: [{ communityId: { $exists: false } }, { communityId: null }] }
          ]
        });
      }

      finalMatch = { $and: [baseMatch, { $or: orConditions }] };
    } else {
      finalMatch = baseMatch;
    }



    const skip = (page - 1) * limit;

    const result = await Post.aggregate([
      { $match: finalMatch },

      {
        $facet: {
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },


            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user",
              },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

            {
              $lookup: {
                from: "communities",
                localField: "communityId",
                foreignField: "_id",
                as: "community",
              },
            },
            { $unwind: { path: "$community", preserveNullAndEmptyArrays: true } },

            {
              $lookup: {
                from: "communitycategories",
                localField: "community.category",
                foreignField: "_id",
                as: "communityCategory",
              },
            },
            { $unwind: { path: "$communityCategory", preserveNullAndEmptyArrays: true } },


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
                totalLikes: {
                  $size: { $ifNull: [{ $arrayElemAt: ["$stats.likes", 0] }, []] },
                },
                totalViews: {
                  $size: { $ifNull: [{ $arrayElemAt: ["$stats.views", 0] }, []] },
                },
                isPostLikedByMe: {
                  $let: {
                    vars: { statsDoc: { $arrayElemAt: ["$stats", 0] } },
                    in: {
                      $anyElementTrue: {
                        $map: {
                          input: { $ifNull: ["$$statsDoc.likes", []] },
                          as: "like",
                          in: { $eq: ["$$like.userId", { $toString: user._id }] },
                        },
                      },
                    },
                  },
                },
              },
            },


            {
              $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "postId",
                as: "comments",
              },
            },
            { $addFields: { totalComments: { $size: "$comments" } } },


            {
              $addFields: {
                community: {
                  $cond: [
                    { $ifNull: ["$communityId", false] },
                    {
                      _id: "$community._id",
                      name: "$community.name",
                      categoryName: {
                        $cond: {
                          if: { $eq: ["$communityCategory.name", "Others"] },
                          then: "$community.manualCategoryName",
                          else: "$communityCategory.name",
                        },
                      },
                      isJoinedByMe: { $in: ["$communityId", allCommunityIds.map(id => new mongoose.Types.ObjectId(id))] },
                    },
                    "$$REMOVE",
                  ],
                },
              },
            },
            {
              $addFields: {
                isFriend: { $in: ["$userId", allFriendIds.map(id => new mongoose.Types.ObjectId(id))] },
                isPendingRequest: {
                  $in: ["$userId", pendingUserIds.map(id => new mongoose.Types.ObjectId(id))],
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
                createdAt: 1,
                updatedAt: 1,
                "user._id": 1,
                "user.username": 1,
                "user.email": 1,
                "user.avatarUrl": 1,
                "user.currentCountry": 1,
                community: 1,
                totalLikes: 1,
                totalViews: 1,
                totalComments: 1,
                isPostLikedByMe: 1,
                isFriend: 1,
                isPendingRequest: 1,
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const posts = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    return {
      posts,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    };
  } catch (error) {
    throw error;
  }
};



//get Single Post
exports.getPostById = async (id, userId) => {
  try {
    if (!userId) {
      throw createError(400, resMessages.notFound.userNotFound);
    }
    const user = await isUserExist(userId)
    if (!user) {
      throw createError(400, resMessages.notFound.userNotFound);
    }
    const post = await isPostExist(id);
    const isBlocked = await Block.findOne({
      $or: [
        { blocker: post.userId, blocked: userId },
        { blocker: userId, blocked: post.userId }
      ]
    });
    if (isBlocked) throw createError(403, resMessages.validation.userBlocked);

    const result = await Post.aggregate(
      postAggregationPipeline({ _id: new mongoose.Types.ObjectId(id) }, 1, 1, "", user, [])
    );
    const data = result[0].data;
    return {
      post: data
    }
  } catch (error) {
    throw error;
  }
};

// Update Post
exports.updatePost = async (id, updateData, userId) => {
  try {
    if (!userId) {
      throw createError(400, resMessages.notFound.userNotFound);
    }
    const isPostIdExist = await isPostExist(id);
    if (!isPostIdExist) {
      throw createError(400, resMessages.notFound.postNotFound);
    }
    if (isPostIdExist.userId.toString() != userId.toString()) {
      throw new Error(resMessages.customError.NotAuthorized);
    }

    let cleanHashtags = []
    cleanHashtags = updateData.hashtags
      .map(tag => tag.trim().toLowerCase().replace(/^#/, ""))
      .filter((tag, index, self) => tag && self.indexOf(tag) === index);
    updateData.hashtags = cleanHashtags;
    const oldTags = isPostIdExist.hashtags
    const addTags = cleanHashtags.filter(tag => !oldTags.includes(tag))
    const removeTags = oldTags.filter(tag => !cleanHashtags.includes(tag))
    const post = await Post.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    await Promise.all([
      ...addTags.map(tag =>
        HashTag.findOneAndUpdate(
          { tag },
          { $inc: { usageCount: 1 }, $addToSet: { posts: post._id } },
          { upsert: true }
        )
      ),
      ...removeTags.map(async tag => {
        const updated = await Hashtag.findOneAndUpdate(
          { tag },
          { $inc: { usageCount: -1 }, $pull: { posts: post._id } },
          { new: true }
        );
        if (updated?.usageCount <= 0) await Hashtag.deleteOne({ tag });
      })
    ]);

    return post;
  }
  catch (error) {
    throw error;
  }
};

// Delete Post
exports.deletePost = async (id, userId) => {
  try {
    if (!userId) {
      throw createError(400, resMessages.notFound.userNotFound);
    }
    const isPostIdExist = await isPostExist(id);
    if (!isPostIdExist) {
      throw createError(400, resMessages.notFound.postNotFound);
    }
    if (isPostIdExist.userId.toString() != userId.toString()) {
      throw new Error(resMessages.customError.NotAuthorized);
    }
    const post = await Post.findById(id);
    if (!post) return null;

    // Delete each media file from S3
    if (isPostIdExist.mediaUrls && isPostIdExist.mediaUrls.length > 0) {
      await Promise.all(isPostIdExist.mediaUrls.map(url => deleteFileFromS3(url)));
    }

    // Delete post from DB
    await Post.findByIdAndDelete(id);
    // delete this post from userstats collection
    await UserStats.findOneAndDelete({ postId: id });
    // Delete post ref from hashtags
    await HashTag.updateMany(
      { posts: id },
      { $pull: { posts: id } }
    );

    return isPostIdExist;
  }

  catch (error) {
    throw error;
  }

};

exports.getProfilePost = async (id, page = 1, limit = 10, userId, type) => {
  try {
    if (!userId) {
      throw createError(400, resMessages.notFound.userNotFound);
    }
    const user = await isUserExist(userId);
    if (!user) {
      throw createError(400, resMessages.notFound.userNotFound);
    }
    const isBlocked = await Block.findOne({
      $or: [
        { blocker: id, blocked: userId },
        { blocker: userId, blocked: id }
      ]
    });
    if (isBlocked) throw createError(403, resMessages.validation.userBlocked);

    const joinedCommunities = await CommunityMember.find({ userId: user._id }).select("communityId");

    const allCommunityIds = joinedCommunities.map(c => c.communityId);

    const skip = (page - 1) * limit;
    let matchStage = {};
    if (type == "profile") {
      matchStage = { userId: new mongoose.Types.ObjectId(id), postType: type };
    } else if (type == "community") {
      matchStage = { userId: new mongoose.Types.ObjectId(id), postType: type };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $facet: {
          paginatedPosts: [

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
            ...(type == "community"
              ? [
                {
                  $lookup: {
                    from: "communities",
                    localField: "communityId",
                    foreignField: "_id",
                    as: "communityInfo",
                  },
                },
                { $unwind: { path: "$communityInfo", preserveNullAndEmptyArrays: true } },
                {
                  $lookup: {
                    from: "communitycategories",
                    localField: "communityInfo.category",
                    foreignField: "_id",
                    as: "categoryInfo"
                  }
                },
                { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } },
              ]
              : []
            ),
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
                ...(type === "community"
                  ? {
                    community: {
                      _id: "$communityInfo._id",
                      name: "$communityInfo.name",
                      categoryName: {
                        $cond: {
                          if: { $eq: ["$categoryInfo.name", "Others"] },
                          then: "$communityInfo.manualCategoryName",
                          else: "$categoryInfo.name"
                        }
                      },
                      isJoinedByMe: { $in: ["$communityId", allCommunityIds] }
                    }
                  }
                  : {})
              },
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
          ],
          totalCount: [
            { $count: "count" }
          ]
        }
      }
    ];

    const result = await Post.aggregate(pipeline);

    const posts = result[0].paginatedPosts;
    const totalPosts = result[0].totalCount[0]?.count || 0;

    return {
      posts,
      pagination: {
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit),
      }
    };

  } catch (error) {
    throw error;
  }
};

exports.getTrendingTagsService = async () => {
  try {
    const result = await HashTag.find({
      usageCount: { $gt: 10 }
    })
      .sort({ usageCount: -1 })
      .limit(4);

    if (!result || result.length === 0) {
      throw createError(400, resMessages.notFound.noTrendingTags);
    }
    console.log(result)

    return result;
  } catch (error) {
    throw error;
  }
};

exports.getAllPostService = async (search = "", page, limit, userId, hashtagSearch = "") => {
  try {
    if (!userId) {
      throw createError(400, resMessages.notFound.userNotFound);
    }
    console.log(userId)

    const user = await isUserExist(userId);
    if (!user) {
      throw createError(400, resMessages.notFound.userNotFound);
    }

    const allFriends = await getAllFriends(user._id);
    const allFriendIds = allFriends.map(f => f._id.toString());

    const pendingRequests = await Friend.find({
      status: enums.friend_Request_status.PENDING,
      $or: [
        { requester: user._id },
        { recipient: user._id }
      ]
    });



    const pendingUserIds = pendingRequests.map(req =>
      req.requester._id.toString() === user._id.toString() ? req.recipient : req.requester
    );


    const blocked = await Block.find({
      $or: [{ blocked: userId }, { blocker: userId }]
    });


    const blockedUserIds = blocked.map(b =>
      new mongoose.Types.ObjectId(
        b.blocker.toString() === userId.toString() ? b.blocked : b.blocker
      )
    );

    const joinedCommunities = await CommunityMember.find({ userId: user._id }).select("communityId");
    const allIds = joinedCommunities.map(c => c.communityId);


    const baseMatch = {
      $expr: {
        $not: {
          $in: [
            { $toObjectId: "$userId" },
            [...blockedUserIds.map(id => new mongoose.Types.ObjectId(id)), new mongoose.Types.ObjectId(userId)]
          ]
        }
      }
    };

    if (search) {
      baseMatch.$or = [
        { postHeading: { $regex: search, $options: "i" } },
        { postDescription: { $regex: search, $options: "i" } }
      ];
    }

    if (hashtagSearch) {
      baseMatch.hashtags = { $regex: `^${hashtagSearch}$`, $options: "i" };
    }
    const skip = (page - 1) * limit;

    const result = await Post.aggregate([
      { $match: baseMatch },
      {
        $facet: {
          data: [

            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user",
              },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },


            {
              $lookup: {
                from: "communities",
                localField: "communityId",
                foreignField: "_id",
                as: "community",
              },
            },
            { $unwind: { path: "$community", preserveNullAndEmptyArrays: true } },


            {
              $lookup: {
                from: "communitycategories",
                localField: "community.category",
                foreignField: "_id",
                as: "communityCategory",
              },
            },
            { $unwind: { path: "$communityCategory", preserveNullAndEmptyArrays: true } },


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
                totalLikes: {
                  $size: { $ifNull: [{ $arrayElemAt: ["$stats.likes", 0] }, []] },
                },
                totalViews: {
                  $size: { $ifNull: [{ $arrayElemAt: ["$stats.views", 0] }, []] },
                },
                isPostLikedByMe: {
                  $let: {
                    vars: { statsDoc: { $arrayElemAt: ["$stats", 0] } },
                    in: {
                      $anyElementTrue: {
                        $map: {
                          input: { $ifNull: ["$$statsDoc.likes", []] },
                          as: "like",
                          in: { $eq: ["$$like.userId", { $toString: user._id }] },
                        },
                      },
                    },
                  },
                },
              },
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
                community: {
                  $cond: [
                    { $ifNull: ["$communityId", false] },
                    {
                      _id: "$community._id",
                      name: "$community.name",
                      categoryName: {
                        $cond: {
                          if: { $eq: ["$communityCategory.name", "Others"] },
                          then: "$community.manualCategoryName",
                          else: "$communityCategory.name",
                        },
                      },
                      isJoinedByMe: {
                        $cond: [
                          { $in: ["$communityId", allIds] },
                          true,
                          false,
                        ],
                      },
                    },
                    "$$REMOVE",
                  ],
                },
              },
            },
            {
              $addFields: {
                isFriend: { $in: ["$userId", allFriendIds.map(id => new mongoose.Types.ObjectId(id))] },
                isPendingRequest: { $in: ["$userId", pendingUserIds.map(id => new mongoose.Types.ObjectId(id))] }
              }
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
                "user._id": 1,
                "user.username": 1,
                "user.email": 1,
                "user.avatarUrl": 1,
                "user.currentCountry": 1,
                community: 1,
                totalLikes: 1,
                totalViews: 1,
                totalComments: 1,
                isPostLikedByMe: 1,
                isFriend: 1,
                isPendingRequest: 1
              },
            },

            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const data = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    return {
      data,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit),
      },
    };
  } catch (error) {
    throw error;
  }
};


exports.getHighlightedPostsService = async (userId) => {
  try {
    if (!userId) {
      throw createError(400, resMessages.notFound.userNotFound);
    }

    const user = await isUserExist(userId)
    if (!user) {
      throw createError(400, resMessages.notFound.userNotFound);
    }
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
    throw error;
  }
}



