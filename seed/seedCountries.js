const mongoose = require('mongoose');
const Country = require('../models/countryList.model.js');
const countries = require('../data/countries.json'); 
const connectDB = require("../config/db.js")

async function seedCountries() {
  try {
    await connectDB();
    await Country.deleteMany();
    await Country.insertMany(countries);
    console.log('Countries seeded successfully!');
  } catch (err) {
    console.error('Seeding failed:', err);
    throw err; 
  }
}

module.exports = seedCountries;
