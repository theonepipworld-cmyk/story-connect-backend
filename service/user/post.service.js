const Post = require("../../models/post.model");

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
  return await Post.findByIdAndDelete(id);
};
