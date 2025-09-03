const mongoose = require("mongoose");
const ReportReason = require("../models/reportCategories.js"); 
const connectDB = require("../config/db.js");
const reportReasons = require("../data/reportCategories.json");

const seedReportReasons = async () => {
  try {
    console.log(" Importing Report Reasons...");
    await connectDB();

    await ReportReason.deleteMany();
    await ReportReason.insertMany(reportReasons);

    console.log(" Report reasons seeded successfully!");
    return true; 
  } catch (err) {
    console.error(" Seeding failed:", err.message);
    throw err;
  }
};

module.exports = seedReportReasons;
