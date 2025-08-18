// models/Profession.js
const mongoose = require('mongoose');

const professionSchema = new mongoose.Schema({
    name: {
        type: String,
        enum: ['nurse', 'doctor', 'scientist', 'professor', 'artist',
            'chef', 'manager', 'pilot', 'firefighter', 'developer', 'other'],
        unique: true
    },
    code: String,
});

module.exports = mongoose.model('ProfessionList', professionSchema);