const mongoose = require('mongoose');
const CommunityCategory = require("../models/communityCategoryModel.js"); 
const connectDB = require("../config/db.js");
const categories = require("../data/communityCategories.json")

console.log(categories)
const seedCommunityCategory = async() =>{
  try {
    await connectDB();
    await CommunityCategory.deleteMany();
    await CommunityCategory.insertMany(categories);
    console.log('Community Categories seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

module.exports = seedCommunityCategory
