const Post = require("../../models/post.model")
const UserStats = require("../../models/userActivityStats.model")
const mongoose = require("mongoose");
const Comment = require("../../models/Comments.model")
const { isPostExist, createError, postAggregationPipeline, isUserExist, isCommunityExist } = require("../../helpers/dbHelpers.js")
const resMessages = require("../../constants/resMessages.constants.js")
const Hashtag = require("../../models/hashTag.models.js")
const { deleteFileFromS3 } = require("../../utils/s3.util.js")
const Block = require("../../models/block.model.js")


// Create Post
exports.createPost = async (data, cleanHashTags) => {
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
        await Hashtag.findOneAndUpdate(
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
};

// Get All Posts
exports.getAllPosts = async (page, limit, search, userId) => {
  if (!userId) {
    throw createError(400, resMessages.notFound.userNotFound);
  }
  const user = await isUserExist(userId)
  if (!user) {
    throw createError(400, resMessages.notFound.userNotFound);
  }

  const Blocked = await Block.find({
    $or: [
      { blocked: userId },
      { blocker: userId }
    ]
  });

  const blockedUserIds = Blocked.map(b =>
    b.blocker.toString() === userId.toString() ? b.blocked : b.blocker
  );
  const result = await Post.aggregate(postAggregationPipeline({}, page, limit, search, user, blockedUserIds));
  const data = result[0].data;
  const total = result[0].totalCount[0]?.count || 0;
  return {
    posts: data,
    pagination: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      limit: parseInt(limit),
    },
  };
};


//get Single Post
exports.getPostById = async (id, userId) => {
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
};

// Update Post
exports.updatePost = async (id, updateData, userId) => {
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
      Hashtag.findOneAndUpdate(
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
};

// Delete Post
exports.deletePost = async (id, userId) => {
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
  await Hashtag.updateMany(
    { posts: id },
    { $pull: { posts: id } }
  );

  return isPostIdExist;
};

exports.getProfilePost = async (id, page = 1, limit = 10, userId, type = "profile") => {
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
                    "categoryInfo._id": 1,
                    "categoryInfo.name": 1,
                    "communityInfo.manualName": 1
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
    throw new Error(error.message);
  }
};

exports.getTrendingTagsService = async () => {
  try {
    const result = await Hashtag.find({
      usageCount: { $gt: 100 }
    })
      .sort({ usageCount: -1 })
      .limit(4);

    if (!result || result.length === 0) {
      throw createError(400, resMessages.notFound.noTrendingTags);
    }

    return result;
  } catch (error) {
    throw new Error(error.message);
  }
};



