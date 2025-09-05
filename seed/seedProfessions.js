const mongoose = require('mongoose');
const Profession = require('../models/professionList.model.js');
const professions = require('../data/professions.json'); 
const connectDB = require('../config/db'); 

async function seedProfessions() {
  try {
    await connectDB();
    const bulkOps = professions.map((item) => ({
      updateOne: {
        filter: { name: item.name }, 
        update: { $set: item },
        upsert: true,
      },
    }));

    await Profession.bulkWrite(bulkOps);

    console.log('Professions seeded successfully (with upsert)!');
  } catch (err) {
    console.error('Seeding failed:', err);
    throw err; 
  }
}

module.exports = seedProfessions;
