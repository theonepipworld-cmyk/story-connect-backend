const bcrypt = require('bcrypt')
const { jwt_secret } = require('../config/secretVariables.js')
const jwt = require('jsonwebtoken')
let otpGenerator = require('otp-generator');
const User = require("../models/user.model.js");



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



exports.generatePublicId = async (username) => {
  try {
    let base = username
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");

    if (!base) base = "user";

    let publicId;
    let isUnique = false;

    while (!isUnique) {
      const random = Math.floor(100 + Math.random() * 900); // 3 digit
      publicId = `${base}${random}`;

      const exists = await User.exists({ publicId });
      if (!exists) isUnique = true;
    }

    return publicId;

  } catch (error) {
    console.error("Error generating publicId:", error);
    throw new Error("Unable to generate publicId");
  }
};