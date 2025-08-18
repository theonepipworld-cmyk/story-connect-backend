const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true }, 
});

module.exports = mongoose.model('CountryList', countrySchema);