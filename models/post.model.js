const mongoose = require("mongoose");

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
    postFor: {
      type: String,
      trim: true,
    },
    mediaUrls: [
      {
        type: String,
        trim: true,
      },
    ],
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
      enum: ["video", "image","both"],
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
