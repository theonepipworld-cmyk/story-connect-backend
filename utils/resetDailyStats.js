const cron = require("node-cron");
const DailyUserStats = require("../models/dailyUserStats.model");

const resetDailyStats = async () => {
  try {
    const now = new Date();

    const todayUtc = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ));

    await DailyUserStats.deleteMany({ date: { $lt: todayUtc } });
    await DailyUserStats.updateOne(
      { date: todayUtc },
      {
        $setOnInsert: {
          date: todayUtc,
          hourlyCounts: Array(24).fill(0)
        }
      },
      { upsert: true }
    );

    console.log("Daily stats reset for:", todayUtc.toISOString());
  } catch (err) {
    console.error("Error resetting daily stats:", err);
  }
};


cron.schedule("0 0 * * *", async () => {
  console.log("Running daily stats reset cron...");
  await resetDailyStats();
}, {
  timezone: "UTC"
});

module.exports = resetDailyStats;