const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    type: {
        type: String,
        enum: [
            "like",
            "friend_request",
            "friend_request_accepted",
            "friend_request_rejected",
            "comment",
            "commentLike"
        ],
        required: true,
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        default: null
    },

   
    commentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        default: null
    },

    parentCommentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        default: null
    },

    message: {
        type: String,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);