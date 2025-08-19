const postService = require("../../../service/user/post.service.js")
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");





exports.getHashTagsPost = async(req,res)=>{
    try{
    const {search}=req.query.search
    }
    catch(error){
            console.log(error, "error")
            return res.status(500).json(errorResponse(resMessages.serverError.processingError));
    }
}