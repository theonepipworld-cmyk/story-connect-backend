const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");
const User = require('../../../models/user.model.js');
const Community = require("../../../models/community.model.js");
const {createCommunityService} = require("../../../service/user/community.service.js")



exports.createCommunity = async(req,res)=>{
    try{
      const createdCommunity = await createCommunityService(req.body,req.user.id,req.files)
       return res.status(200).json(successResponse(resMessages.success.createSuccessful, createdCommunity));
    }
   catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
}
