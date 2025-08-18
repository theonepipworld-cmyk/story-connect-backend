const mongoose = require('mongoose');
const Profession = require('../models/professionList.model.js');
const professions = require('../data/professions.json'); 
const connectDB = require('../config/db'); 

async function seedProfessions() {
    try {
     
        await connectDB();

        await Profession.deleteMany();
        await Profession.insertMany(professions);
        console.log('Professions seeded successfully!');
    } catch (err) {
        console.error('Seeding failed:', err);
        throw err; 
    }
}

module.exports = seedProfessions;
