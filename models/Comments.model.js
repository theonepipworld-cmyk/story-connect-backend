// models/Comment.js
const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    replyCount: {
    type: Number,
    default: 0
}
  },
  {
    timestamps: true 
  }
);


commentSchema.index({ postId: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);
