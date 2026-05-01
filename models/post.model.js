const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      trim: true,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      default: null,
    },
    mediaType: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
  },
  { _id: false } 
);

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      index: true,
    },
    postDescription: {
      type: String,
      trim: true,
    },
    postHeading: {
      type: String,
      trim: true,
    },
    postType: {
      type: String,
    },
    mediaUrls: [mediaSchema],
    hashtags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    storyOfTheMonth: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: ["video", "image", "both"],
    },
    videoOfTheMonth: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for hashtag-based search
postSchema.index({ hashtags: 1 });

module.exports = mongoose.model("Post", postSchema);