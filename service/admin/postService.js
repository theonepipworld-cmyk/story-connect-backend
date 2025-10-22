const Post = require("../../models/post.model")
const UserStats = require("../../models/userActivityStats.model")
const mongoose = require("mongoose");
const Comment = require("../../models/Comments.model")
const { isPostExist, createError, postAggregationPipeline, isUserExist, isCommunityExist, getAllFriends } = require("../../helpers/dbHelpers.js")
const resMessages = require("../../constants/resMessages.constants.js")
const HashTag = require("../../models/hashTag.models.js")
const { deleteFileFromS3 } = require("../../utils/s3.util.js")
const Block = require("../../models/block.model.js")
const Community = require("../../models/community.model.js")
const CommunityMember = require("../../models/communityMember.model.js")
const enums = require("../../constants/enum.constants.js")
const Friend = require("../../models/friends.model.js")




exports.addStoryAndVideoOfMonthService = async (postId, type) => {
    try {
        const post = await isPostExist(postId);
        if (!post) {
            throw createError(404, 'postNotFound', 'notFound');
        }

        let updateFields = {};
        if (type === enums.typePost.IMAGE) {
            updateFields.storyOfTheMonth = true;
        } else if (type === enums.typePost.VIDEO) {
            updateFields.videoOfTheMonth = true;
        } else {
            throw createError(400, 'invalidType', 'validation');
        }

        const result = await Post.findByIdAndUpdate(post._id, updateFields, { new: true });

        return result;
    } catch (error) {
        if (error.statusCode) throw error;
        throw createError(500, 'serverError', 'error');
    }
}
