const mongoose = require("mongoose");

const communitySchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
         index: true,
    },
    postId:{
         type:mongoose.Schema.Types.ObjectId,
        ref:"Post",
         index: true,
    },
    coverImage:{
        type:String,
    },
    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"CommunityCategory",
        required:true
    },
    manualCategoryName:{
        type:String
    },
    membersIds:[
        {
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        index:true
        }
    ] 
},{ timestamps: true })

communitySchema.index({userId:-1});
communitySchema.index({membersIds:-1});

module.exports = mongoose.model('Community', communitySchema);
