const mongoose = require('mongoose');
const Profession = require('../models/professionList.model.js');
const professions = require('../data/professions.json');


require("../config/db")

async function seedProfessions() {
    try {
        await Profession.deleteMany();
        await Profession.insertMany(professions);
        console.log('✅ Professtions seeded successfully!');
    } catch (err) {
        console.error('❌ Seeding failed:', err);
    } finally {
        mongoose.disconnect();
    }
}

seedProfessions();