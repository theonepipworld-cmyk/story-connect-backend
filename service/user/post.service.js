const Post = require("../../models/post.model")
const UserStats = require("../../models/userActivityStats.model")
const mongoose = require("mongoose");
const Comment = require("../../models/Comments.model")
const { postAggregationPipeline } = require("../../helpers/dbHelpers")
// Create Post
exports.createPost = async (data) => {
  console.log(data)
  const post = new Post(data);
  return await post.save();
};

// Get All Posts
exports.getAllPosts = async () => {
  return await Post.aggregate(postAggregationPipeline());
};

//get Single Post
exports.getPostById = async (id) => {
  return await Post.aggregate(
    postAggregationPipeline({ _id: new mongoose.Types.ObjectId(id) })
  );
};

// Update Post
exports.updatePost = async (id, updateData) => {
  return await Post.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });
};

// Delete Post
exports.deletePost = async (id) => {
  const post = await Post.findById(id);
  if (!post) return null;

  // Delete each media file from S3
  if (post.mediaUrls && post.mediaUrls.length > 0) {
    await Promise.all(post.mediaUrls.map(url => deleteFileFromS3(url)));
  }

  // Delete post from DB
  await Post.findByIdAndDelete(id);
  return post;
};