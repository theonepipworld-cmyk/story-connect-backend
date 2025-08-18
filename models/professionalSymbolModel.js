// models/ProfessionSymbol.js
const mongoose = require('mongoose');

const professionSymbolSchema = new mongoose.Schema({
  professionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProfessionList',
    required: true,
  },
  iconUrl: {
    type: String,
    required: true,
  },
  fileKey: String,
});

module.exports = mongoose.model('ProfessionSymbol', professionSymbolSchema);
