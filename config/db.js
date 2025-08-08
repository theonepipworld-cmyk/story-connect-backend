const mongoose = require('mongoose');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
.then(() => {
  console.log('Connected to MongoDB database.');
})
.catch((err) => {
  console.error('MongoDB connection failed:', err.message);
  process.exit(1);
});

module.exports = mongoose;
