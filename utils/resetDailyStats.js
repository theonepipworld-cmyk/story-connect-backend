const cron = require("node-cron");
const DailyUserStats = require("../models/dailyUserStats.model");

const resetDailyStats = async () => {
  try {
    const today = new Date();
    const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    await DailyUserStats.deleteMany({
      date: { $lt: currentDay }
    });

    const result = await DailyUserStats.updateOne(
      { date: currentDay },
      { $set: { hourlyCounts: Array(24).fill(0) } }
    );

    if (result.matchedCount === 0) {
      console.log("No record for today — creating new...");
      await DailyUserStats.create({
        date: currentDay,
        hourlyCounts: Array(24).fill(0),
      });
    }

    console.log(" Daily stats reset for:", currentDay.toDateString());
  } catch (err) {
    console.error(" Error resetting daily stats:", err);
  }
};

cron.schedule("0 0 * * *", async () => {
  console.log("Running daily stats reset cron...");
  await resetDailyStats();
});

module.exports = resetDailyStats;
