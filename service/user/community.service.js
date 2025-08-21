const Post = require("../../models/post.model")
const UserStats = require("../../models/userActivityStats.model")
const mongoose = require("mongoose");
const Comment = require("../../models/Comments.model")
const { uploadFileToS3 } = require('../../utils/s3.util');
const { isPostExist, createError, postAggregationPipeline, isUserExist } = require("../../helpers/dbHelpers.js")
const resMessages = require("../../constants/resMessages.constants.js")
const Hashtag = require("../../models/hashTag.models.js")
const { deleteFileFromS3 } = require("../../utils/s3.util.js")
const Community = require("../../models/community.model.js")




exports.createCommunityService = async (communityDetails, userId, files) => {
  try {
    if (!userId) {
      throw createError(400, resMessages.notFound.userNotFound);
    }

    const user = await isUserExist(userId);
    if (!user) {
      throw createError(400, resMessages.notFound.userNotFound);
    }

    let communityImageUrl = "";
    if (files && files.communityImage && files.communityImage[0]) {
      const uploaded = await uploadFileToS3(
        files.communityImage[0],
        "communityImage"
      );
      communityImageUrl = uploaded?.Location; 
    }

    let manualCategoryName = undefined;
    if (communityDetails.category === "others") {
      if (!communityDetails.categoryName) {
        throw createError(400, resMessages.validation.categoryName);
      }
      manualCategoryName = communityDetails.categoryName;
    }

    console.log(communityDetails)

    const newCommunity = new Community({
      name: communityDetails.name,
      description: communityDetails.description,
      userId: userId,
      coverImage: communityImageUrl,
      category: communityDetails.category,
      manualCategoryName,
      membersIds: [userId],
    });

    const savedCommunity = await newCommunity.save();

    return savedCommunity;
        
  } catch (error) {
    throw createError(500, error.message);
  }
};
