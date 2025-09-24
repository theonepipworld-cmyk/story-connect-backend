const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");
const { createCommunityService,
  joinCommunityService,
  userCommunityService,
  categoryService,
  allCommunitiesService,
  getCommunityDetailService,
  getCommunityMemberService,
  getCommunityPostsService,
  removeCommunityMemberService,
  removeCommunityService,
  updateCommunityService, listAllCommunityService,
  getCommunitiesByCategoriesService ,leaveCommunityService } = require("../../../service/user/community.service.js")



exports.createCommunity = async (req, res) => {
  try {
    const createdCommunity = await createCommunityService(req.body, req.user.id, req.file)
    return res.status(200).json(successResponse(resMessages.success.createSuccessful, createdCommunity));
  }
  catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
};

exports.joinCommunity = async (req, res) => {
  try {
    const joinComunity = await joinCommunityService(req.user.id, req.body)
    return res.status(200).json(successResponse(resMessages.success.joinSuccessfully));
  }
  catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
};

//users community
exports.userCommunity = async (req, res) => {
  try {
    const search = req.query.search || ""
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    console.log(req.user.id)
    const { communities, pagination } = await userCommunityService(req.user.id, search, page, limit)
    return res.status(200).json(successResponse(resMessages.success.fetchSuccessfully, communities, pagination));
  }
  catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
}

exports.categoryList = async (req, res) => {
  try {
    const communityCategory = await categoryService()
    return res.status(200).json(successResponse(resMessages.success.fetchSuccessfully, communityCategory));
  }
  catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
}

exports.allCommunitiesList = async (req, res) => {
  try {
    const search = req.query.search || ""
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { communities, pagination } = await allCommunitiesService(req.user.id, search, page, limit)
    return res.status(200).json(successResponse(resMessages.success.fetchSuccessfully, communities, pagination));
  }
  catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
};


exports.getCommunitydetails = async (req, res) => {
  try {
    const communityDetails = await getCommunityDetailService(req.params.id, req.user.id)
    return res.status(200).json(successResponse(resMessages.success.fetchSuccessfully, communityDetails));
  }
  catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
};

exports.getCommunityMembers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { data, pagination } = await getCommunityMemberService(req.params.id, req.user.id, page, limit);
    return res.status(200).json(successResponse(resMessages.success.fetchSuccessfully, data, pagination));
  }
  catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
};

exports.getCommunitiesPost = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { communityPost, pagination } = await getCommunityPostsService(req.params.id, page, limit, req.user.id);
    return res.status(200).json(successResponse(resMessages.success.fetchSuccessfully, communityPost, pagination));
  }
  catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
};

// exports.getuserCommunitiesFeed  =async(req,res)=>{
//   try{
//    const page  =req.query.page || 1
//     const limit = req.query.limit || 10
//     const{data,pagination} = await getuserCommunitiesFeedService(req.user.id,page,limit)
//       return res.status(200).json(successResponse(resMessages.success.fetchSuccessfully,data,pagination));
// }
//   catch (err) {
//     return res.status(400).json(errorResponse(err.message));
//   }
// };


exports.removeCommunityMember = async (req, res) => {
  try {
    const removeMembers = await removeCommunityMemberService(req.body, req.user.id);
    return res.status(200).json(successResponse(resMessages.success.deleteSuccessful, removeMembers));
  }
  catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
};

exports.leaveCommunity = async (req, res) => {
  try {
    const leaveMember = await leaveCommunityService(req.params.communityId, req.user.id);
    return res.status(200).json(successResponse(resMessages.success.leaveMember, leaveMember));
  }
  catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
};


exports.removeCommunity = async (req, res) => {
  try {
    const remove = await removeCommunityService(req.params.id, req.user.id)
    return res.status(200).json(successResponse(resMessages.success.deleteSuccessful, remove));
  }
  catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
};

exports.updateCommunityDetails = async (req, res) => {
  try {
    const update = await updateCommunityService(req.params.id, req.user.id, req.body, req.file)
    return res.status(200).json(successResponse(resMessages.success.updateSuccessful, update));
  }
  catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
}

exports.getCommunitiesIdList = async (req, res) => {
  try {

    const allCommunities = await listAllCommunityService(req.user.id);
    return res.status(200).json(successResponse(resMessages.success.fetchSuccessfully, allCommunities));
  }
  catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
};

exports.getCommunitiesByCategories = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { communities, pagination } = await getCommunitiesByCategoriesService(req.user.id, req.params.categoryId, page, limit)
    return res.status(200).json(successResponse(resMessages.success.fetchSuccessfully, communities, pagination));
  }
  catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
}
