const mongoose = require('mongoose');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI;

async function connectDB() {  
    try {
      await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('Connected to MongoDB database.');
    } catch (err) {
      console.error('MongoDB connection failed:', err.message);
      process.exit(1);
    }

}

module.exports = connectDB;
