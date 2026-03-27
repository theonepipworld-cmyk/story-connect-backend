const fs = require("fs");
const path = require("path");
const ReportCategory = require("../models/reportCategories");
const { uploadFileToS3 } = require("../utils/s3.util");
const reportReasons = require("../data/reportCategories.json");
const connectDB = require("../config/db");

async function seedReportReasons() {
  try {
    console.log(" Importing Report Reasons...");
    await connectDB();

    for (const item of reportReasons) {
      let uploadResult = null;

      // Upload icon if exists
      if (item.icon) {
        const filePath = path.join(__dirname, "../asset/reportIcons", item.icon);

        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);

          const fileObj = {
            originalname: item.icon,
            buffer: fileBuffer,
            mimetype: "image/png",
          };

          uploadResult = await uploadFileToS3(fileObj, "report-icons");
        } else {
          console.warn(`Icon file not found: ${filePath}`);
        }
      }

      // Upsert into DB
      await ReportCategory.updateOne(
        { name: item.name },
        {
          $set: {
            name: item.name,
            description: item.description,
            iconUrl: uploadResult ? uploadResult.Location : null,
            fileKey: uploadResult ? uploadResult.key : null,
          },
        },
        { upsert: true }
      );

      console.log(` Synced: ${item.name}`);
    }

    console.log(" Report Reasons seeding completed!");
  } catch (error) {
    console.error(" Seeding failed:", error);
    throw error;
  }
}

module.exports = seedReportReasons;