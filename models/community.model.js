const mongoose = require("mongoose");

const communitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true,
    },
    coverImage: {
        type: String,
    },
    isActive:{
        type:Boolean,
        default:true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CommunityCategory",
        required: true
    },
    manualCategoryName: {
        type: String
    },
}, { timestamps: true })

communitySchema.index({ userId: -1 });

module.exports = mongoose.model('Community', communitySchema);
