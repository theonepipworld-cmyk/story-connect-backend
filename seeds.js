const seedProfessionalSymbol = require("./seed/seedProfessionalSymbol.js");
const seedCountriesProfile = require("./seed/seedCountries.js");
const seedProfessional = require("./seed/seedProfessions.js");
const seedCommunityCategory = require("./seed/seedCommunityCategory.js");
const seedReportReasons = require("./seed/seedReportCategories.js");
const seedFaqs = require("./seed/seedFaqs.js");
const seedAdminSignUp = require("./seed/seedAdminSignUp.js");


  (async () => {
    await seedCommunityCategory()
    await seedCountriesProfile();
    await seedProfessional();
    await seedProfessionalSymbol();
    await seedReportReasons();
    await seedFaqs();
    await seedAdminSignUp();
    console.log("All seeding done!");
    process.exit(0);
  })();