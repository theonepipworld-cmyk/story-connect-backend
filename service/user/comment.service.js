const User = require('../../models/user.model');
const { uploadFileToS3 } = require('../../utils/s3.util');
const { DEFAULT_AVATAR_URL } = require('../../constants/variables.constants');
const { errorResponse, successResponse } = require('../../utils/responseHandler.util');
const resMessages = require('../../utils/responseHandler.util');
const Comment = require('../../models/Comments.model')


exports.addCommentService = async (postId, userId, commentString, parentCommentId = null) => {
    try {
        const comment = await Comment.create({
            userId: userId,
            postId: postId,
            parentCommentId: parentCommentId || null,
            content: commentString
        });

        if (!comment) {
            throw new Error("Failed to add comment");
        }

        return comment;
    } catch (error) {
        console.error('Error in addComment:', error);
        throw new Error(error.message || 'Failed to add Comment.');
    }
};


exports.updateCommentService = async (postId, commentId, parentCommentId, content, userId) => {
    try {
        const comment = await Comment.findById(commentId);
        if (!comment) {
            throw new Error("No comment found with this ID.");
        }
        if (comment.userId.toString() !== userId.toString()) {
            throw new Error("You don't have permission to update this comment.");
        }

        const filter = {
            _id: commentId,
            postId: postId,
            userId: userId
        };

        if (parentCommentId) {
            filter.parentCommentId = parentCommentId;
        }
        console.log(filter);

        const updatedComment = await Comment.findOneAndUpdate(
            filter,
            { content ,isEdited: true},
            { new: true }
        );

        if (!updatedComment) {
            throw new Error("Comment not found or conditions not met.");
        }

        return updatedComment;
    } catch (error) {
        console.error("Error in updateComment:", error);
        throw new Error(error.message || "Failed to update comment.");
    }
};

exports.deleteCommentService = async (postId, commentId, parentCommentId, userId) => {
    try {

        const comment = await Comment.findById(commentId)
            .populate("userId", "_id")
            .populate("postId", "userId");

        if (!comment) {
            throw new Error("Comment not found");
        }

        const isCommentOwner = comment.userId._id.toString() === userId.toString();
        const isPostOwner = comment.postId.userId.toString() === userId.toString();

        if (!isCommentOwner && !isPostOwner) {
            throw new Error("You don't have permission to delete this comment");
        }

        const filter = { _id: commentId, postId: postId };
        if (parentCommentId) {
            filter.parentCommentId = parentCommentId;
        }

        const deleteResult = await Comment.deleteOne(filter);

        if (deleteResult.deletedCount === 0) {
            throw new Error("Comment not deleted");
        }

        return { success: true, message: "Comment deleted successfully" };

    } catch (error) {
        console.error("Error in deleteComment:", error);
        throw new Error(error.message || "Failed to delete comment");
    }
};

exports.getCommentService = async (postId) => {
    try {
        const comments = await Comment.find({ postId })
            .populate("userId", "username") 
            .populate("parentCommentId") 
            .sort({ createdAt: -1 }); 

        if (!comments || comments.length === 0) {
            throw new Error("No comments found for this post");
        }

        return comments;
    } catch (error) {
        console.error("Error in getComments:", error);
        throw new Error(error.message || "Failed to get comments");
    }
};



