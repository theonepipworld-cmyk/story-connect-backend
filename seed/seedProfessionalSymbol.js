const fs = require("fs");
const path = require("path");
const ProfessionSymbol = require("../models/professionalSymbolModel");
const { uploadFileToS3 } = require("../utils/s3.util");
const professionData = require("../data/professionalSymbol.json");
const connectDB = require("../config/db");

async function seedProfessionSymbols() {
  try {
    await connectDB(); 

    await ProfessionSymbol.deleteMany({});
    console.log("Old data cleared!");

    for (const item of professionData) {
      const existing = await ProfessionSymbol.findOne({ name: item.name });
      if (existing) {
        console.log(`Already exists, skipping: ${item.name}`);
        continue;
      }

      let uploadResult = null;
      if (item.icon) {
        const filePath = path.join(__dirname, "../asset/icons", item.icon);
        if (!fs.existsSync(filePath)) {
          console.warn(`Icon file not found: ${filePath}`);
          continue;
        }

        const fileBuffer = fs.readFileSync(filePath);
        const fileObj = {
          originalname: item.icon,
          buffer: fileBuffer,
          mimetype: "image/svg+xml",
        };
        uploadResult = await uploadFileToS3(fileObj, "profession-icons");
      }

      await ProfessionSymbol.create({
        name: item.name,
        iconUrl: uploadResult ? uploadResult.Location : null,
        fileKey: uploadResult ? uploadResult.key : null,
      });

      console.log(`Seeded: ${item.name}`);
    }

    console.log("Profession Symbols seeding completed!");
  } catch (error) {
    console.error("Error seeding symbols:", error);
    throw error;
  }
}

module.exports = seedProfessionSymbols;
