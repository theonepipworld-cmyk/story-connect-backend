const seedProfessionalSymbol = require("./seed/seedProfessionalSymbol.js");
const seedCountriesProfile = require("./seed/seedCountries.js");
const seedProfessional = require("./seed/seedProfessions.js");
const seedCommunityCategory = require("./seed/seedCommunityCategory.js");

(async () => {
      await seedCommunityCategory()
    await seedCountriesProfile();
    await seedProfessional();
    await seedProfessionalSymbol();
  console.log("All seeding done!");
  process.exit(0);
})();