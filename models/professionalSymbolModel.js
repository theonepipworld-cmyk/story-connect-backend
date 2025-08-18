// models/ProfessionSymbol.js
const mongoose = require('mongoose');

const professionSymbolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  iconUrl: {
    type: String, 
    default: null,
  },
  fileKey: {
    type: String,
    default: null,
  },
});

module.exports = mongoose.model('ProfessionSymbol', professionSymbolSchema);
