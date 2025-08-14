const User = require('../models/user.model.js');
const Post = require('../models/post.model.js')

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


exports.isPostExist = async (id) => {
    try {
        const result = await Post.findById(id);
        return result;
    }
    catch (error) {
        throw new Error(error.message || 'Failed to check existing email.');
    }
};

exports.toggleCommentStats = (stats, userId, commentId, parentCommentId = null) => {
    if (!commentId) throw new Error("commentId required");
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

exports.togglePostLike = (stats, userId, username) => {
    const existingIndex = stats.likes.findIndex(l => l.userId.toString() === userId.toString());
    if (existingIndex === -1) {
        stats.likes.push({ userId, userName: username });
    } else {
        stats.likes.splice(existingIndex, 1);
    }
    stats.totallikes = stats.likes.length;
};


