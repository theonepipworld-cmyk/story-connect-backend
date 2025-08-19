const Post = require("../../models/post.model")
const UserStats = require("../../models/userActivityStats.model")
const mongoose = require("mongoose");
const Comment = require("../../models/Comments.model")
const { isPostExist, createError, postAggregationPipeline } = require("../../helpers/dbHelpers.js")
const resMessages = require("../../constants/resMessages.constants.js")
// Create Post
exports.createPost = async (data) => {
  console.log(data)
  const post = new Post(data);
  return await post.save();
};

// Get All Posts
exports.getAllPosts = async (page, limit) => {
  return await Post.aggregate(postAggregationPipeline({}, page, limit));
};

//get Single Post
exports.getPostById = async (id) => {
  return await Post.aggregate(
    postAggregationPipeline({ _id: new mongoose.Types.ObjectId(id) }, 1, 1)
  );
};

// Update Post
exports.updatePost = async (id, updateData, userId) => {
  if (!userId) {
    throw createError(400, resMessages.notFound.userNotFound);
  }
  console.log(userId)
  const isPostIdExist = await isPostExist(id);
  console.log("post--------",isPostIdExist)
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
exports.deletePost = async (id,userId) => {
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
  return isPostIdExist;
};