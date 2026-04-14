const bcrypt = require('bcrypt')
const { jwt_secret } = require('../config/secretVariables.js')
const jwt = require('jsonwebtoken')
let otpGenerator = require('otp-generator');



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


exports.comparePassword = async (hashedPassword, password) => {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}


exports.getJWT = async (email, id, role,username) => {
  try {
    const payload = { email, id: id.toString(), role , username };
    const token = jwt.sign(payload, jwt_secret)
    return token;
  } catch (error) {
    console.error('Error generating JWT:', error);
    throw new Error('Token generation failed');
  }
};




exports.generateOtp = () => {
    try {
        const otp = otpGenerator.generate(6, {
            lowerCaseAlphabets: false,
            upperCaseAlphabets: false,
            specialChars: false,
        });

        return otp;
    } catch (error) {
        console.error('Error generating OTP:', error);
        throw new Error('Unable to generate OTP');
    }
};