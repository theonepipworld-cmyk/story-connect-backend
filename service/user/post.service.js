const Post = require("../../models/post.model")
const UserStats = require("../../models/userActivityStats.model")
const mongoose = require("mongoose");
const Comment = require("../../models/Comments.model")
const { isPostExist, createError, postAggregationPipeline ,isUserExist } = require("../../helpers/dbHelpers.js")
const resMessages = require("../../constants/resMessages.constants.js")
const Hashtag = require("../../models/hashTag.models.js")


// Create Post
exports.createPost = async (data,cleanHashTags) => {
  const post = new Post(data);
  //update hashTagColection
  console.log(cleanHashTags)
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
exports.getAllPosts = async (page, limit, search) => {
  const result = await Post.aggregate(postAggregationPipeline({}, page, limit, search));

  const data = result[0].data;
  const total = result[0].totalCount[0]?.count || 0;
  return {
    data,
    pagination: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      limit: parseInt(limit)
    }
  };
};

//get Single Post
exports.getPostById = async (id) => {
  return await Post.aggregate(
    postAggregationPipeline({ _id: new mongoose.Types.ObjectId(id) }, 1, 1 ,"")
  );
};

// Update Post
exports.updatePost = async (id, updateData, userId) => {
  if (!userId) {
    throw createError(400, resMessages.notFound.userNotFound);
  }
  console.log(userId)
  const isPostIdExist = await isPostExist(id);
  console.log("post--------", isPostIdExist)
  if (!isPostIdExist) {
    throw createError(400, resMessages.notFound.postNotFound);
  }
  if (isPostIdExist.userId.toString() != userId.toString()) {
    throw new Error(resMessages.customError.NotAuthorized);
  }
  return await Post.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });
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
  // Delete post ref from hashtags
  await Hashtag.updateMany(
    { posts: id },
    { $pull: { posts: id } }
  );

  return isPostIdExist;
};

exports.getProfilePost = async (id) => {
  try {
    const user = await isUserExist(id);
    console.log(user);
    if (!user) {
      throw createError(400, resMessages.notFound.userNotFound);
    }
    const posts = await Post.find({ userId: id });
    return posts; 
  } catch (error) {
    throw new Error(error.message);
  }
};
