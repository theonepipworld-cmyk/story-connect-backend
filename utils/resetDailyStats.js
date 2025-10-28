const cron = require('node-cron');
const DailyUserStats = require("../models/dailyUserStats.model")

const resetDailyStats = async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const newDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

    await DailyUserStats.updateOne(
        { date: newDay },
        { $set: { hourlyCounts: Array(24).fill(0) } },
        { upsert: true }
    );
};

cron.schedule('0 0 * * *', async () => {
    console.log("Cron job for reschedule reminder initialized.");
    await resetDailyStats();
});
module.exports = resetDailyStats;