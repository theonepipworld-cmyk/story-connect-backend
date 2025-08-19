const mongoose = require("mongoose");
const hashTagSchema = new mongoose.Schema({
    tag: {
        type: String,
        lowercase: true,
        trim:true,
        unique:true
    },
    posts: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post"
        }
    ],
    usageCount: {
        type: Number,
        default: 0
    },
});

hashTagSchema.index({tag :1})

module.exports = mongoose.model("HashTag", hashTagSchema);