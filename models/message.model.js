const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation"
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    type: {
        type: String,
        enum: ["text", "image", "video", "file"],
        default: "text"
    },
    text: {
        type: String
    },
    media: {
        type: String,
        default: null
    },
    attachments: [
        {
            url: { type: String },
            fileName: { type: String },
            fileSize: { type: String },
            fileType: { type: String }
        }
    ],
    status: {
        type: String,
        enum: ["sent", "delivered", "seen"],
        default: "sent"
    },
    seenBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
}, { timestamps: true })
messageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);