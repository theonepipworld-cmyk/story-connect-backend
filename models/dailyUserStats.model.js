const mongoose = require("mongoose");

const dailyUserStatsSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true }, 
  hourlyCounts: { type: [Number], default: Array(24).fill(0) } 
}, { timestamps: true });

module.exports = mongoose.model("DailyUserStats", dailyUserStatsSchema);
