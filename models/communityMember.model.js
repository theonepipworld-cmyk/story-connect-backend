const mongoose = require("mongoose")


const communityMemberSchema = new mongoose.Schema({
    communityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Community",
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    role: {
        type: String,
        enum: ["member", "admin"],
        default: "member"
    }
}, { timestamps: true });

communityMemberSchema.index({communityId:1})
communityMemberSchema.index({userId:1});

module.exports  = mongoose.model("CommunityMember",communityMemberSchema)