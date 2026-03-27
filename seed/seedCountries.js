const mongoose = require('mongoose');
const Country = require('../models/countryList.model.js');
const countries = require('../data/countries.json'); 
const connectDB = require("../config/db.js");

async function seedCountries() {
  try {
    await connectDB();

    for (const country of countries) {
      await Country.updateOne(
        { name: country.name },  
        { $set: country },     
        { upsert: true }      
      );
    }

    console.log("Countries seeded successfully with upsert!");
    return true;
  } catch (err) {
    console.error("Seeding failed:", err);
    throw err; 
  }
}

module.exports = seedCountries;
