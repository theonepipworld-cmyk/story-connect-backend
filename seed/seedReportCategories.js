const mongoose = require("mongoose");
const ReportReason = require("../models/reportCategories.js"); 
const connectDB = require("../config/db.js");
const reportReasons = require("../data/reportCategories.json");

const seedReportReasons = async () => {
  try {
    console.log(" Importing Report Reasons...");
    await connectDB();

    const bulkOps = reportReasons.map((item) => ({
      updateOne: {
        filter: { name: item.name },
        update: { $set: item },
        upsert: true,
      },
    }));

    await ReportReason.bulkWrite(bulkOps);

    console.log(" Report reasons seeded successfully (with upsert)!");
    return true; 
  } catch (err) {
    console.error(" Seeding failed:", err.message);
    throw err;
  }
};

module.exports = seedReportReasons;
