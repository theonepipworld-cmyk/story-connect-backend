const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const { getMessage } = require("../../../constants/locales/index.js"); 
const {
  createCommunityService,
  joinCommunityService,
  userCommunityService,
  categoryService,
  allCommunitiesService,
  getCommunityDetailService,
  getCommunityMemberService,
  getCommunityPostsService,
  removeCommunityMemberService,
  removeCommunityService,
  updateCommunityService,
  listAllCommunityService,
  getCommunitiesByCategoriesService,
  leaveCommunityService
} = require("../../../service/user/community.service.js");


const getLang = (req) => req.lang || 'en';

exports.createCommunity = async (req, res) => {
  try {
    const lang = getLang(req);
    const createdCommunity = await createCommunityService(req.body, req.user.id, req.file);
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'createSuccessful'), createdCommunity));
  } catch (err) {
    const lang = getLang(req);
    return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
  }
};

exports.joinCommunity = async (req, res) => {
  try {
    const lang = getLang(req);
    await joinCommunityService(req.user.id, req.body);
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'joinSuccessfully')));
  } catch (err) {
    const lang = getLang(req);
    return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
  }
};

exports.userCommunity = async (req, res) => {
  try {
    const lang = getLang(req);
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { communities, pagination } = await userCommunityService(req.user.id, search, page, limit);
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), communities, pagination));
  } catch (err) {
    const lang = getLang(req);
    return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
  }
};

exports.categoryList = async (req, res) => {
  try {
    const lang = getLang(req);
    const communityCategory = await categoryService();
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), communityCategory));
  } catch (err) {
    const lang = getLang(req);
    return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
  }
};

exports.allCommunitiesList = async (req, res) => {
  try {
    const lang = getLang(req);
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { communities, pagination } = await allCommunitiesService(req.user.id, search, page, limit);
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), communities, pagination));
  } catch (err) {
    const lang = getLang(req);
    return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
  }
};

exports.getCommunitydetails = async (req, res) => {
  try {
    const lang = getLang(req);
    const communityDetails = await getCommunityDetailService(req.params.id, req.user.id);
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), communityDetails));
  } catch (err) {
    const lang = getLang(req);
    return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
  }
};

exports.getCommunityMembers = async (req, res) => {
  try {
    const lang = getLang(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { data, pagination } = await getCommunityMemberService(req.params.id, req.user.id, page, limit);
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), data, pagination));
  } catch (err) {
    const lang = getLang(req);
    return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
  }
};

exports.getCommunitiesPost = async (req, res) => {
  try {
    const lang = getLang(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { communityPost, pagination } = await getCommunityPostsService(req.params.id, page, limit, req.user.id);
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), communityPost, pagination));
  } catch (err) {
    const lang = getLang(req);
    return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
  }
};

exports.removeCommunityMember = async (req, res) => {
  try {
    const lang = getLang(req);
    const removeMembers = await removeCommunityMemberService(req.body, req.user.id);
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'deleteSuccessful'), removeMembers));
  } catch (err) {
    const lang = getLang(req);
    return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
  }
};

exports.leaveCommunity = async (req, res) => {
  try {
    const lang = getLang(req);
    const leaveMember = await leaveCommunityService(req.params.communityId, req.user.id);
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'leaveMember'), leaveMember));
  } catch (err) {
    const lang = getLang(req);
    return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
  }
};

exports.removeCommunity = async (req, res) => {
  try {
    const lang = getLang(req);
    const remove = await removeCommunityService(req.params.id, req.user.id);
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'deleteSuccessful'), remove));
  } catch (err) {
    const lang = getLang(req);
    return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
  }
};

exports.updateCommunityDetails = async (req, res) => {
  try {
    const lang = getLang(req);
    const update = await updateCommunityService(req.params.id, req.user.id, req.body, req.file);
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'updateSuccessful'), update));
  } catch (err) {
    const lang = getLang(req);
    return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
  }
};

exports.getCommunitiesIdList = async (req, res) => {
  try {
    const lang = getLang(req);
    const allCommunities = await listAllCommunityService(req.user.id);
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), allCommunities));
  } catch (err) {
    const lang = getLang(req);
    return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
  }
};

exports.getCommunitiesByCategories = async (req, res) => {
  try {
    const lang = getLang(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { communities, pagination } = await getCommunitiesByCategoriesService(req.user.id, req.params.categoryId, page, limit);
    return res.status(200).json(successResponse(getMessage(lang, 'success', 'fetchSuccessfully'), communities, pagination));
  } catch (err) {
    const lang = getLang(req);
    return res.status(400).json(errorResponse(getMessage(lang, 'error', err.message)));
  }
};
