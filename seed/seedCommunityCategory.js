const mongoose = require('mongoose');
const CommunityCategory = require("../models/communityCategoryModel.js");
const connectDB = require("../config/db.js");
const categories = require("../data/communityCategories.json");

const seedCommunityCategory = async () => {
  try {
    await connectDB();

    for (const category of categories) {
      await CommunityCategory.updateOne(
        { name: category.name },  
        { $set: category },       
        { upsert: true }           
      );
    }

    console.log("Community Categories seeded successfully with upsert!");
    return true;
  } catch (err) {
    console.error("Seeding failed:", err);
    throw err;
  }
};

module.exports = seedCommunityCategory;
