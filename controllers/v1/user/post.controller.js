const postService = require("../../../service/user/post.service.js");
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const { getMessage } = require("../../../constants/locales/index.js");
const { uploadFileToS3 } = require('../../../utils/s3.util.js');


const getLang = (req) => req.lang || 'en';


exports.createPost = async (req, res) => {
  const lang = getLang(req);
  try {
    req.body.userId = req.user.id;


    let mediaUrls = [];
    if (req.files?.length) {
      const uploadResults = await Promise.all(
        req.files.map(file => uploadFileToS3(file, "posts"))
      );
      mediaUrls = uploadResults.map(r => r.Location);
    }

    const cleanHashtags = Array.isArray(req.body.hashTags)
      ? [...new Set(
        req.body.hashTags
          .map(tag => tag.trim().toLowerCase().replace(/^#/, ""))
          .filter(Boolean)
      )]
      : [];

    const { hashTags: _, ...restBody } = req.body;
    const postData = { ...restBody, mediaUrls, hashtags: cleanHashtags };
    const post = await postService.createPost(postData, cleanHashtags);

    return res.status(200).json(
      successResponse(getMessage(lang, "success", "createSuccessful"), post)
    );
  } catch (err) {
    const statusCode = err.statusCode || err.status || 500;
    const finalMessage =
      getMessage(lang, err.category || "error", err.message) || err.message;
    return res.status(statusCode).json(errorResponse(finalMessage));
  }
};

exports.getUserFeedPosts = async (req, res) => {
  try {
    const lang = getLang(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { posts, pagination } = await postService.getUserFeedPostsService(page, limit, req.user?.id);
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), posts, pagination));
  } catch (err) {
    const lang = getLang(req);
    const statusCode = err.statusCode || err.status || 500;
    const category = err.category || 'error';
    const finalMessage = getMessage(lang, category, err.message) || err.message;
    return res.status(statusCode).json(errorResponse(finalMessage));
  }
};


exports.getPostById = async (req, res) => {
  try {
    const lang = getLang(req);
    console.log(req.user.id, "req.user")
    const userId = req.user.id;
    const { post } = await postService.getPostById(req.params.id, userId);
    if (!post)
      return res.status(400).json(errorResponse(getMessage(lang, 'notFound', 'postNotFound')));
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), post));
  } catch (err) {
    const lang = getLang(req);
    const statusCode = err.statusCode || err.status || 500;
    const category = err.category || 'error';
    const finalMessage = getMessage(lang, category, err.message) || err.message;
    return res.status(statusCode).json(errorResponse(finalMessage));
  }
};


exports.updatePost = async (req, res) => {
  try {
    const lang = getLang(req);
    const userId = req.user.id;
    console.log(req.body)
    console.log(req.params.id)
    const post = await postService.updatePost(req.params.id, req.body, userId);

    if (!post) {
      return res.status(400).json(errorResponse(getMessage(lang, 'notFound', 'postNotFound')));
    }

    return res.status(200).json(successResponse(getMessage(lang, 'success', 'updateSuccessful'), post));
  } catch (err) {
    const lang = getLang(req);
    const statusCode = err.statusCode || err.status || 500;
    const category = err.category || 'error';
    const finalMessage = getMessage(lang, category, err.message) || err.message;
    return res.status(statusCode).json(errorResponse(finalMessage));
  }
};


exports.deletePost = async (req, res) => {
  try {
    const lang = getLang(req);
    const userId = req.user.id;
    const post = await postService.deletePost(req.params.id, userId);

    if (!post) {
      return res.status(400).json(errorResponse(getMessage(lang, 'notFound', 'postNotFound')));
    }

    return res.status(200).json(successResponse(getMessage(lang, 'success', 'deleteSuccessful'), post));
  } catch (err) {
    const lang = getLang(req);
    const statusCode = err.statusCode || err.status || 500;
    const category = err.category || 'error';
    const finalMessage = getMessage(lang, category, err.message) || err.message;
    return res.status(statusCode).json(errorResponse(finalMessage));
  }
};


exports.getPostsOfProfile = async (req, res) => {
  try {
    const lang = getLang(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const type = req.query.type;
    const userId = req.user.id;
    const { posts, pagination } = await postService.getProfilePost(req.params.id, page, limit, userId, type);

    if (!posts) {
      return res.status(400).json(errorResponse(getMessage(lang, 'notFound', 'postNotFound')));
    }

    return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), posts, pagination));
  } catch (err) {
    const lang = getLang(req);
    const statusCode = err.statusCode || err.status || 500;
    const category = err.category || 'error';
    const finalMessage = getMessage(lang, category, err.message) || err.message;
    return res.status(statusCode).json(errorResponse(finalMessage));
  }
};


exports.getTrendingTags = async (req, res) => {
  try {
    const lang = getLang(req);
    const trendingTags = await postService.getTrendingTagsService();
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), trendingTags));
  } catch (err) {
    const lang = getLang(req);
    const statusCode = err.statusCode || err.status || 500;
    const category = err.category || 'error';
    const finalMessage = getMessage(lang, category, err.message) || err.message;
    return res.status(statusCode).json(errorResponse(finalMessage));
  }
};


exports.getAllPost = async (req, res) => {
  try {
    const lang = getLang(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    let textSearch = search;
    let hashtagSearch = null;

    if (search && search.startsWith("#")) {
      hashtagSearch = search.replace("#", "").trim();
      textSearch = null;
    }
    const { data, pagination } = await postService.getAllPostService(textSearch, page, limit, req.user?.id, hashtagSearch);
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), data, pagination));
  } catch (error) {
    const lang = getLang(req);
    const statusCode = error.statusCode || error.status || 500;
    const category = error.category || 'error';
    const finalMessage = getMessage(lang, category, error.message) || error.message;
    return res.status(statusCode).json(errorResponse(finalMessage));
  }
};

// Get Highlighted Posts
exports.getHighlightedPosts = async (req, res) => {
  try {
    const lang = getLang(req);
    const { storyOfTheMonthPosts, videoOfTheMonthPosts } = await postService.getHighlightedPostsService(req.user?.id);
    const data = { storyOfTheMonthPosts, videoOfTheMonthPosts };
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), data));
  } catch (err) {
    const lang = getLang(req);
    const statusCode = err.statusCode || err.status || 500;
    const category = err.category || 'error';
    const finalMessage = getMessage(lang, category, err.message) || err.message;
    return res.status(statusCode).json(errorResponse(finalMessage));
  }
};
