const mongoose = require("mongoose");
require("dotenv").config();

const seedProfessionalSymbol = require("./seed/seedProfessionalSymbol.js");
const seedCountriesProfile = require("./seed/seedCountries.js");
const seedProfessional = require("./seed/seedProfessions.js");
const seedCommunityCategory = require("./seed/seedCommunityCategory.js");
const seedReportReasons = require("./seed/seedReportCategories.js");
const seedFaqs = require("./seed/seedFaqs.js");
const seedAdminSignUp = require("./seed/seedAdminSignUp.js");

// ✅ check flag
const isFresh = process.argv.includes("--fresh");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    // 🔥 clear only if --fresh passed
    if (isFresh) {
      await mongoose.connection.db.dropDatabase();
      console.log("Database cleared (--fresh)");
    }

    // 🌱 run seeders
    await seedCommunityCategory();
    await seedCountriesProfile();
    await seedProfessional();
    await seedProfessionalSymbol();
    await seedReportReasons();
    await seedFaqs();
    await seedAdminSignUp();

    console.log("All seeding done!");

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();