const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // ISO 2-letter code (e.g., "US")
  name: { type: String, required: true, unique: true }, // Full name (e.g., "United States")
});

module.exports = mongoose.model('CountryList', countrySchema);