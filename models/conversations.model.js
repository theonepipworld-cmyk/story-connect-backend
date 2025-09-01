const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
    participants: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    ],
    lastSeen: {
        type: mongoose.Schema.Types.ObjectId, ref: "Message"
    },
    unseenCount: [{    
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        count: { type: Number, default: 0 }
    
    }]
}, { timestamps: true });

conversationSchema.index({ participants: 1 }, { unique: true });
module.exports = mongoose.model("Conversation", conversationSchema);