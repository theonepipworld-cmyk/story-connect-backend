const mongoose = require("mongoose");
const FAQ = require("../models/faq.model.js")
const connectDB = require("../config/db.js");
const faqs = require("../data/faqs.json") 

const seedFaqs = async () => {
  try {
    await connectDB();

    const bulkOps = faqs.map((item) => ({
      updateOne: {
        filter: { title: item.title },
        update: { $set: item },
        upsert: true,
      },
    }));

    await FAQ.bulkWrite(bulkOps);

    console.log(" FAQs seeded successfully (with upsert)!");
    return true;
  } catch (err) {
    console.error(" Seeding FAQs failed:", err.message);
    throw err;
  }
};

module.exports = seedFaqs;
