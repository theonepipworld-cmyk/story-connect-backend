const mongoose = require("mongoose");


const userActivityStatsSchema = new mongoose.Schema({
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        index: true,
        required: true,
    },
    likes: [
        {
            _id: false,
            userId: String,
            userName: String,
            avatarUrl:String,
            currentCountryCode: String
        }
    ],
    views: [
        {
            _id: false,
            userId: String,
            userName: String
        }
    ],
  commentLikes: [
    {
        commentId: String,
        parentCommentId: { type: String, default: null },
        userIds: [String],
        totalLikes: { type: Number, default: 0 } 
    }
],
    totalLikes: {
        type: Number,
        required: true
    },
    totalViews: {
        type: Number,
        required: true
    }

}, {
    timestamps: true
});


userActivityStatsSchema.index({ postId: 1, createdAt: -1 })
userActivityStatsSchema.index({ userId: 1, createdAt: -1 })
module.exports = mongoose.model("userStats", userActivityStatsSchema);