const User = require('../models/user.model.js');
const Post = require('../models/post.model.js')
const { validationResult } = require('express-validator');

exports.checkEmailExist = async (email, forUpdate = false) => {
  try {
    let query = User.findOne({ email });
    if (!forUpdate) query = query.lean();
    const user = await query.exec();
    return user;
  } catch (error) {
    console.error('Error in checkEmailExist:', error.message);
    throw new Error(error.message || 'Failed to check existing email.');
  }
};

exports.isPostExist = async(id) =>{
  try{
  const result= await Post.findById(id);
  return result;
  }
  catch(error){
    console.error('Error in checkPostExist:', error.message);
    throw new Error(error.message || 'Failed to check existing email.');
  }

}
