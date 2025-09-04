const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../../../utils/responseHandler.util.js');
const resMessages = require("../../../constants/resMessages.constants.js");
const {getReportCategoryService,reportUserService} = require("../../../service/user/report.service.js")



exports.reportUser = async(req,res)=>{
    try{
         const {reportUserId , description,category,severity} = req.body
         console.log(req.files)
         const reportUser = await reportUserService(reportUserId,description,category,severity,req.files,req.user.id)
          return res.status(200).json(successResponse(resMessages.success.reportSuccessfully, reportUser));
    }
    catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
};

exports.getReportCategories = async(req,res) =>{
    try{
       const getReprotCategories = await getReportCategoryService()
          return res.status(200).json(successResponse(resMessages.success.fetchSuccessfully, getReprotCategories));
    }
     catch (err) {
    return res.status(400).json(errorResponse(err.message));
  }
}