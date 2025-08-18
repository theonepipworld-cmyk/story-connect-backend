const postService = require("../../../service/user/post.service.js")

// Create Post
exports.createPost = async (req, res) => {
  try {
    req.body.userId = req.user.id;
    console.log("req----------------",req.body)
    const post = await postService.createPost(req.body);
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get All Posts
exports.getPosts = async (req, res) => {
  try {
    const posts = await postService.getAllPosts();
    res.status(200).json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Single Post
exports.getPostById = async (req, res) => {
  try {
    const post = await postService.getPostById(req.params.id);
    if (!post)
      return res.status(404).json({ success: false, message: "Post not found" });
    res.status(200).json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Post
exports.updatePost = async (req, res) => {
  try {
    const post = await postService.updatePost(req.params.id, req.body);
    if (!post)
      return res.status(404).json({ success: false, message: "Post not found" });
    res.status(200).json({ success: true, data: post });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete Post
exports.deletePost = async (req, res) => {
  try {
    const post = await postService.deletePost(req.params.id);
    if (!post)
      return res.status(404).json({ success: false, message: "Post not found" });
    res.status(200).json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
