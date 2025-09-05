const fs = require("fs");
const path = require("path");
const ProfessionSymbol = require("../models/professionalSymbolModel");
const { uploadFileToS3 } = require("../utils/s3.util");
const professionData = require("../data/professionalSymbol.json");
const connectDB = require("../config/db");

async function seedProfessionSymbols() {
  try {
    await connectDB();

    for (const item of professionData) {
      let uploadResult = null;

      if (item.icon) {
        const filePath = path.join(__dirname, "../asset/icons", item.icon);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          const fileObj = {
            originalname: item.icon,
            buffer: fileBuffer,
            mimetype: "image/png",
          };
          uploadResult = await uploadFileToS3(fileObj, "profession-icons");
        } else {
          console.warn(`Icon file not found: ${filePath}`);
        }
      }

      await ProfessionSymbol.updateOne(
        { name: item.name },
        {
          $set: {
            name: item.name,
            iconUrl: uploadResult ? uploadResult.Location : undefined,
            fileKey: uploadResult ? uploadResult.key : undefined,
          },
        },
        { upsert: true }
      );

      console.log(`Synced: ${item.name}`);
    }

    console.log(" Profession Symbols seeding completed!");
  } catch (error) {
    console.error(" Error seeding symbols:", error);
    throw error;
  }
}

module.exports = seedProfessionSymbols;
