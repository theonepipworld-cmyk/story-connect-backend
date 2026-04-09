const mongoose = require("mongoose");
const User = require("../models/user.model");
const connectDB = require("../config/db.js");
const Variables = require("../constants/variables.constants.js");
const enums = require("../constants/enum.constants.js");
const { hashPassword, getJWT } = require("../utils/commonFunctions.util.js");
const secretVariables = require("../config/secretVariables.js");

const seedAdminSignUp = async() => {
  try {
    await connectDB();
    const defaultEmail = secretVariables.admin_default_email;
    const defaultPassword = secretVariables.admin_default_password;
    let admin = await User.findOne({ email: defaultEmail });

    if (!admin) {
      const hashedPassword = await hashPassword(defaultPassword);

      admin = new User({
        username: "john_doe_admin",
        email: defaultEmail,
        passwordHash: hashedPassword,
        role: enums.userRole.ADMIN,
        status: "active",
      });

      const token = await getJWT(admin.email, admin._id, admin.role, admin.username);
      admin.resetPasswordToken = token;

      await admin.save();

      const savedAdmin = await User.findById(admin._id).lean();
      console.log(" Admin seeded successfully:", savedAdmin);

    } else {
      console.log(" Admin already exists. Skipping seeding.");
    }

    mongoose.connection.close();
  } catch (err) {
    console.error(" Seeder error:", err);
    process.exit(1);
  }
};

module.exports = seedAdminSignUp
