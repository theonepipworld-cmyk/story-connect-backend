
const mongoose = require("mongoose");

const reportCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },  
  description: { type: String },             
});

module.exports = mongoose.model("ReportCategory", reportCategorySchema);
