
const mongoose = require("mongoose");

const reportCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  iconUrl: {
    type: String,
    default: null,
  },
});

module.exports = mongoose.model("ReportCategory", reportCategorySchema);
