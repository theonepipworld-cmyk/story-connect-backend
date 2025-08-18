const postService = require("../../../service/user/post.service.js")
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");
const { uploadFileToS3 } = require('../../../utils/s3.util.js');

// Create Post
exports.createPost = async (req, res) => {
  try {    
    req.body.userId = req.user.id;
    let mediaUrls = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => uploadFileToS3(file, "posts"));
      const uploadResults = await Promise.all(uploadPromises);
      mediaUrls = uploadResults.map(result => result.Location);
    }
    const postData = {
      ...req.body,
      mediaUrls
    };
 
    const post = await postService.createPost(postData);
    return res.status(200).json(successResponse(resMessages.success.fetchSuccessful, post));
  } catch (error) {
    console.log(error,"error")
    return res.status(500).json(errorResponse(resMessages.serverError.processingError));
  }
};

// Get All Posts
exports.getPosts = async (req, res) => {
  try {
    const posts = await postService.getAllPosts();
    return res.status(200).json(successResponse(resMessages.success.fetchSuccessful, posts));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Single Post
exports.getPostById = async (req, res) => {
  try {
    const post = await postService.getPostById(req.params.id);
    if (!post)
      return res.status(400).json(errorResponse(resMessages.notFound.postNotFound));
    return res.status(200).json(successResponse(resMessages.success.fetchSuccessful, post));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Post
exports.updatePost = async (req, res) => {
  try {
    const post = await postService.updatePost(req.params.id, req.body);
    if (!post)
      return res.status(400).json(errorResponse(resMessages.notFound.postNotFound));
    return res.status(200).json(successResponse(resMessages.success.fetchSuccessful, post));
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete Post
exports.deletePost = async (req, res) => {
  try {
    const post = await postService.deletePost(req.params.id);
    if (!post)
      return res.status(400).json(errorResponse(resMessages.notFound.postNotFound));
    return res.status(200).json(successResponse(resMessages.success.deleteSuccessful, post));
  } catch (error) {
    console.log(error,"error")
    return res.status(400).json(errorResponse(resMessages.serverError.processingError));
  }
};
