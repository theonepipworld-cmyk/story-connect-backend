const User = require("../models/user.model.js")
const Post = require('../models/post.model.js')
const { validationResult } = require('express-validator');
const resMessages = require("../constants/resMessages.constants.js")
const Comment = require("../models/Comments.model.js")
const UserStats = require("../models/userActivityStats.model.js")


exports.checkFieldExists = async (fieldName, value, forUpdate = false) => {
  try {
    let query = User.findOne({ [fieldName]: value });
    if (!forUpdate) query = query.lean();
    const user = await query.exec();
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
exports.togglePostLike = (stats, userId, username) => {
  const existingIndex = stats.likes.findIndex(l => l.userId.toString() === userId.toString());
  console.log(existingIndex);
  if (existingIndex === -1) {
    stats.likes.push({ userId, userName: username });
    stats.totalLikes = stats.likes.length;
  } else {
    stats.likes.splice(existingIndex, 1);
    stats.totalLikes = stats.likes.length;
  }
};

exports.validateComment = async (postId, commentId, parentCommentId, isReply = false) => {
  if (parentCommentId) {
    const parentComment = await Comment.findOne({ _id: parentCommentId, postId });
    if (!parentComment) throw new Error(resMessages.customError.parentCommentIdInvalid);

    const childComment = await Comment.findOne({ _id: commentId, parentCommentId, postId });
    if (!childComment) throw new Error(resMessages.customError.commentIdNotMatch);
  } else {
    const comment = await Comment.findOne({ _id: commentId, postId });
    if (!comment) throw new Error(resMessages.notFound.commentNotFound);
  }
}

exports.createError = (status, message) => {
  const err = new Error(resMessages.generalError.somethingWentWrong + " - " + message);
  err.statusCode = status;
  return err;
}


exports.postAggregationPipeline = (match = {}, page = 1, limit = 10, search = "", user) => {
  const skip = (page - 1) * limit;
  const searchMatch = search

    ? {
      $or: [
        { hashtags: { $in: [search.toLowerCase()] } },
        { postHeading: { $regex: search, $options: "i" } },
        { postDescription: { $regex: search, $options: "i" } },
      ],
    }
    : {};
  return [
    { $match: { ...match, ...searchMatch } },
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
              isPostLikedByMe: {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: {
                          $reduce: {
                            input: "$stats.likes",
                            initialValue: [],
                            in: { $concatArrays: ["$$value", "$$this"] }
                          }
                          
                        },
                        as: "like",
                        cond: { $eq: ["$$like.userId", user?._id.toString()] }
                      }
                    }
                  },
                  0
                ]
              },
              totalLikes: { $ifNull: [{ $sum: "$stats.totalLikes" }, 0] },
              totalViews: { $ifNull: [{ $sum: "$stats.totalViews" }, 0] },
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

          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
  ];
};




