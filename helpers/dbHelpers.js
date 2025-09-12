const User = require("../models/user.model.js")
const Post = require('../models/post.model.js')
const { validationResult } = require('express-validator');
const resMessages = require("../constants/resMessages.constants.js")
const Comment = require("../models/Comments.model.js")
const UserStats = require("../models/userActivityStats.model.js")
const Community = require("../models/community.model.js")
const mongoose = require("mongoose")
const Friend = require("../models/friends.model.js")
const enums = require("../constants/enum.constants.js")
const Conversation = require("../models/conversations.model.js")


exports.checkFieldExists = async (fieldName, value, forUpdate = false) => {
  try {
    console.log(fieldName, value)
    let query = User.findOne({ [fieldName]: value });
    if (!forUpdate) query = query.lean();
    const user = await query.exec();
    console.log(user)
    return user;
  } catch (error) {
    throw error;
  }
};

//check email exist for user
exports.checkEmailExist = async (email, forUpdate = false) => {
  try {
    let query = User.findOne({ [fieldName]: value });
    if (!forUpdate) query = query.lean();
    const user = await query.exec();
    return user;
  } catch (error) {
    throw error;
  }
};


//check post exist for postId
exports.isPostExist = async (id) => {
  try {
    const result = await Post.findById(id);
    return result;
  }
  catch (error) {
    throw error;
  }
};

exports.isUserExist = async (id) => {
  try {
    const result = await User.findById(id);
    return result;
  } catch (error) {
    throw error;
  }
};

exports.isCommunityExist = async (id) => {
  try {
    const result = await Community.findById(id)
    return result;
  }
  catch (error) {
    throw error;
  }
}

//handle like and dislike comments section
exports.toggleCommentStats = (stats, userId, commentId, parentCommentId = null) => {
  let commentEntry = stats.commentLikes.find(
    cl => cl.commentId.toString() === commentId.toString()
  );
  if (!commentEntry) {
    commentEntry = {
      commentId,
      parentCommentId: parentCommentId || null,
      userIds: [userId],
      totalLikes: 1
    };
    stats.commentLikes.push(commentEntry);
  } else {
    const userIndex = commentEntry.userIds.findIndex(id => id.toString() === userId.toString());
    if (userIndex === -1) {
      commentEntry.userIds.push(userId);
    } else {
      commentEntry.userIds.splice(userIndex, 1);
    }
    commentEntry.totalLikes = commentEntry.userIds.length;
    if (commentEntry.userIds.length === 0) {
      const index = stats.commentLikes.findIndex(
        cl => cl.commentId.toString() === commentId.toString()
      );
      stats.commentLikes.splice(index, 1);
    }
  }
};


//handle like and dislike of post
exports.togglePostLike = (stats, user) => {
  const existingIndex = stats.likes.findIndex(l => l.userId.toString() === user._id.toString());
  if (existingIndex === -1) {
    stats.likes.push({ userId: user._id, userName: user.username, avatarUrl: user.avatarUrl, currentCountryCode: user.currentCountry.code });
    stats.totalLikes = stats.likes.length;
    return true
  } else {
    stats.likes.splice(existingIndex, 1);
    stats.totalLikes = stats.likes.length;
    return false
  }
};

exports.validateComment = async (postId, commentId, parentCommentId, isReply = false) => {
  if (parentCommentId) {
    const parentComment = await Comment.findOne({ _id: parentCommentId, postId });
    if (!parentComment) throw new Error(resMessages.customError.parentCommentIdInvalid);

    const childComment = await Comment.findOne({ _id: commentId, parentCommentId, postId });
    if (!childComment) throw new Error(resMessages.customError.commentIdNotMatch);
  } else {
    const comment = await Comment.findOne({
      _id: new mongoose.Types.ObjectId(commentId),
      postId: new mongoose.Types.ObjectId(postId)
    });
    if (!comment) throw new Error(resMessages.notFound.commentNotFound);
  }
}

exports.createError = (status, message) => {
  const err = new Error(message);
  err.statusCode = status;
  return err;
};

exports.postAggregationPipeline = (
  match = {},
  page = 1,
  limit = 10,
  search = "",
  user,
  blockedUserIds = [],
  allFriendIds = [],
  allCommunityIds = [],
  hashtagSearch = ""
) => {
  const skip = (page - 1) * limit;

  const searchMatch = search
    ? {
      $or: [
        { hashtags: { $regex: search, $options: "i" } },
        { postHeading: { $regex: search, $options: "i" } },
        { postDescription: { $regex: search, $options: "i" } },
      ],
    }
    : {};

  
  const hashtagMatch = hashtagSearch
    ? { hashtags: { $regex: hashtagSearch, $options: "i" } }
    : {};


  const baseMatch = {
    ...match,
    ...searchMatch,
    ...hashtagMatch,
    userId: { $nin: blockedUserIds },
  };

  const orConditions = [];
  if (allFriendIds.length > 0) {
    orConditions.push({ userId: { $in: allFriendIds } });
  }
  if (allCommunityIds.length > 0) {
    orConditions.push({
      $and: [
        { communityId: { $in: allCommunityIds } },
        { userId: { $ne: user._id } },
      ],
    });
  }

  const finalMatch =
    orConditions.length > 0 ? { ...baseMatch, $or: orConditions } : baseMatch;

  return [
    { $match: finalMatch },
    {
      $facet: {
        data: [
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "user",
            },
          },
          { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

          {
            $lookup: {
              from: "userstats",
              localField: "_id",
              foreignField: "postId",
              as: "stats",
            },
          },
          {
            $addFields: {
              totalLikes: {
                $size: { $ifNull: [{ $arrayElemAt: ["$stats.likes", 0] }, []] },
              },
              totalViews: {
                $size: { $ifNull: [{ $arrayElemAt: ["$stats.views", 0] }, []] },
              },
              isPostLikedByMe: {
                $let: {
                  vars: { statsDoc: { $arrayElemAt: ["$stats", 0] } },
                  in: {
                    $anyElementTrue: {
                      $map: {
                        input: { $ifNull: ["$$statsDoc.likes", []] },
                        as: "like",
                        in: { $eq: ["$$like.userId", { $toString: user._id }] },
                      },
                    },
                  },
                },
              },
            },
          },

          {
            $lookup: {
              from: "comments",
              localField: "_id",
              foreignField: "postId",
              as: "comments",
            },
          },
          {
            $addFields: {
              totalComments: { $size: "$comments" },
            },
          },

          {
            $project: {
              _id: 1,
              postHeading: 1,
              postDescription: 1,
              mediaUrls: 1,
              hashtags: 1,
              communityId: 1,
              type: 1,
              storyOfTheMonth: 1,
              videoOfTheMonth: 1,
              createdAt: 1,
              updatedAt: 1,
              "user._id": 1,
              "user.username": 1,
              "user.email": 1,
              "user.avatarUrl": 1,
              "user.currentCountry": 1,
              totalLikes: 1,
              totalViews: 1,
              totalComments: 1,
              isPostLikedByMe: 1,
            },
          },

          {
            $sort: { createdAt: -1 }
          },
          { $skip: skip },
          { $limit: limit },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
  ];
};

exports.getAllFriends = async (id) => {
  try {
    const result = await Friend.find({
      status: enums.friend_Request_status.ACCEPTED,
      $or: [
        { requester: id },
        { recipient: id }
      ]
    }).populate("requester", "username avatarUrl currentCountry bio")
      .populate("recipient", "username avatarUrl currentCountry bio");

    const friendsList = result.map(f =>
      f.requester._id.toString() === id.toString() ? f.recipient : f.requester
    );
    return friendsList;
  }
  catch (error) {
    throw error;
  }
}

exports.isConversationExist = async (id) => {
  try {
    const result = await Conversation.findById(id);
    return result;

  }
  catch (error) {
    throw error;
  }
}




