const Post = require("../../models/post.model");
const { deleteFileFromS3 } = require("../../utils/s3.util")

// Create Post
exports.createPost = async (data) => {
  const post = new Post(data);
  return await post.save();
};

// Get All Posts
exports.getAllPosts = async () => {
  return await Post.find()
    .populate("userId", "name email")
    .populate("communityId", "name");
};

// Get Single Post
exports.getPostById = async (id) => {
  return await Post.findById(id)
    .populate("userId", "name email")
    .populate("communityId", "name");
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