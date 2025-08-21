const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");
const {createCommunityService ,joinCommunityService,userCommunityService} = require("../../../service/user/community.service.js")



exports.createCommunity = async(req,res)=>{
    try{
      const createdCommunity = await createCommunityService(req.body,req.user.id,req.files)
       return res.status(200).json(successResponse(resMessages.success.createSuccessful, createdCommunity));
    }
   catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
};

exports.joinCommunity = async(req,res)=>{
    try{
      const joinComunity  = await joinCommunityService(req.user.id,req.body)
       return res.status(200).json(successResponse(resMessages.success.joinSuccessfully));
    }
     catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
};

exports.userCommunity  = async(req,res)=>{
    try{
       const allUserCommunity = await userCommunityService(req.user.id)
         return res.status(200).json(successResponse(resMessages.success.joinSuccessfully,allUserCommunity));
    }
    catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
}
