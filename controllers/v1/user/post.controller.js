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
      console.log(req.files)
      const uploadPromises = req.files.map(file => uploadFileToS3(file, "posts"));
      const uploadResults = await Promise.all(uploadPromises);
      mediaUrls = uploadResults.map(result => result.Location);
    }

    let cleanHashtags = [];
    if (req.body.hashTags && Array.isArray(req.body.hashTags)) {
      cleanHashtags = req.body.hashTags
        .map(tag => tag.trim().toLowerCase().replace(/^#/, "")) 
        .filter((tag, index, self) => tag && self.indexOf(tag) === index);
    }

    const postData = {
      ...req.body,
      mediaUrls,
       hashtags: cleanHashtags,
    };

    const post = await postService.createPost(postData,cleanHashtags);
    return res.status(200).json(successResponse(resMessages.success.fetchSuccessfully, post));
  } catch (error) {
    console.log(error, "error")
      res.status(500).json({ success: false, message: error.message });
  }
};

// Get All Posts
exports.getPosts = async (req, res) => {
  try {
    const {search} = req.query || ""
    console.log(search)
    const userId = req.user.id
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
      const { posts, pagination } = await postService.getAllPosts(page, limit, search ,userId);
      console.log(pagination)
    return res.status(200).json(successResponse(resMessages.success.createSuccessful,posts,pagination));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Single Post
exports.getPostById = async (req, res) => {
  try {
     const userId = req.user.id
    const {post} = await postService.getPostById(req.params.id,userId);
    if (!post)
      return res.status(400).json(errorResponse(resMessages.notFound.postNotFound));
    return res.status(200).json(successResponse(resMessages.success.fetchSuccessfully, post));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Post
exports.updatePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const post = await postService.updatePost(req.params.id, req.body, userId);
    if (!post) {
      return res.status(400).json(errorResponse(resMessages.notFound.postNotFound))
    }
    return res.status(200).json(successResponse(resMessages.success.updateSuccessful, post))
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

// Delete Post
exports.deletePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const post = await postService.deletePost(req.params.id, userId);
    if (!post) {
      return res.status(400).json(errorResponse(resMessages.notFound.postNotFound));
    }
    return res.status(200).json(successResponse(resMessages.success.deleteSuccessful, post));
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
};

exports.getPostsOfProfile = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
      const userId = req.user.id
    const { posts, pagination }  = await postService.getProfilePost(req.params.id,page,limit,userId)
    if (!posts) {
      return res.status(400).json(errorResponse(resMessages.notFound.postNotFound));
    }
    return res.status(200).json(successResponse(resMessages.success.fetchSuccessfully, posts,pagination));
  }
  catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}
