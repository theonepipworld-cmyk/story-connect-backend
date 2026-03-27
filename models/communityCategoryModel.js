// models/ProfessionSymbol.js
const mongoose = require('mongoose');

const communityCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  }
}, { timestamps: true });

module.exports = mongoose.model('CommunityCategory', communityCategorySchema);
