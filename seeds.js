const seedProfessionalSymbol = require("./seed/seedProfessionalSymbol.js");
const seedCountriesProfile = require("./seed/seedCountries.js");
const seedProfessional = require("./seed/seedProfessions.js");

(async () => {
  await seedCountriesProfile();
  await seedProfessional();
    await seedProfessionalSymbol();
  console.log("All seeding done!");
  process.exit(0);
})();