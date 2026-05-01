const postService = require("../../../service/user/post.service.js");
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const { getMessage } = require("../../../constants/locales/index.js");



const getLang = (req) => req.lang || 'en';

exports.createPost = async (req, res) => {
  const lang = getLang(req);
  try {
    req.body.userId = req.user.id;
    const mediaUrls = req.files?.length
      ? req.files.map((f) => ({
        url: f.location,
        thumbnailUrl: f.thumbnailUrl || null,
        mediaType: f.mimetype.startsWith("video/") ? "video" : "image",
      }))
      : [];

    const cleanHashtags = Array.isArray(req.body.hashTags)
      ? [
        ...new Set(
          req.body.hashTags
            .map((tag) => tag.trim().toLowerCase().replace(/^#/, ""))
            .filter(Boolean)
        ),
      ]
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
    console.log(req.user.id, "--req.user")
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
    const search = req.query.search || "";
    const userId = req.user.id;
    const { posts, pagination, message } = await postService.getProfilePost(req.params.id, page, limit, userId, type, search);

    if (!posts) {
      return res.status(400).json(errorResponse(getMessage(lang, 'notFound', 'postNotFound')));
    }
    if (message) {
      return res.status(200).json(successResponse(message, posts, pagination));
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
    const search = decodeURIComponent(req.query.search || "");
    let textSearch = search;
    let hashtagSearch = null;

    if (search && search.startsWith("#")) {
      hashtagSearch = search.replace("#", "").trim();
      console.log(hashtagSearch)
      textSearch = "";
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
