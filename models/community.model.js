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
    isActive: {
        type: Boolean,
        default: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CommunityCategory",
        required: true
    },
    manualCategoryName: {
        type: String
    },
    memberCount: {
        type: Number
    }
}, { timestamps: true })

communitySchema.index({ userId: -1 });

communitySchema.pre('findOneAndDelete', async function (next) {
    try {
        const communityId = this.getQuery()._id;
        const CommunityMember = mongoose.model('CommunityMember');
        const Post = mongoose.model('Post');

        await Promise.all([
            CommunityMember.deleteMany({ communityId }),
            Post.deleteMany({ communityId })
        ]);
        next();
    } catch (error) {
        next(error);
    }
});



module.exports = mongoose.model('Community', communitySchema);
