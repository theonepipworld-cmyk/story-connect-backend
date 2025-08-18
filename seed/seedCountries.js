const mongoose = require('mongoose');
const Country = require('../models/countryList.model.js');
const countries = require('../data/countries.json'); 


require("../config/db")

async function seedCountries() {
  try {
    await Country.deleteMany();
    await Country.insertMany(countries);
    console.log('✅ Countries seeded successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    mongoose.disconnect();
  }
}

seedCountries();