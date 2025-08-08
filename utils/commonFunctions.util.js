const bcrypt = require('bcrypt')
const envVariables = require('../config/secretVariables.js')
const jwt = require('jsonwebtoken')


exports.hashPassword = async (password) => {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
};


exports.comparePassword = async (hashedPassword,password) => {
    try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch; 
    } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}


exports.getJWT = async (email, role, id) => {
  try {
    const payload = { email, role, userId:id };
    const token = jwt.sign(payload, envVariables.jwt_secret)
    return token;
  } catch (error) {
    console.error('Error generating JWT:', error);
    throw new Error('Token generation failed');
  }
};