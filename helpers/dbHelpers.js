const User = require('../models/User.model.js');
const { validationResult } = require('express-validator');

exports.checkEmailExist = async (email, forUpdate = false) => {
  try {
    let query = User.findOne({ email });
    if (!forUpdate) query = query.lean(); // only lean for read
    const user = await query.exec();
    return user;
  } catch (error) {
    console.error('Error in checkEmailExist:', error.message);
    throw new Error(error.message || 'Failed to check existing email.');
  }
};



exports.validate = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg,
      type: 'error'
    });
  }
  next();
}