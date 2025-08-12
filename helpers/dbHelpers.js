const User = require('../models/user.model.js');

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