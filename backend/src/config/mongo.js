const mongoose = require('mongoose');

// We utilize the URI provided, or fallback to the exact local URI the user specified
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/Event_Booking_Feedback';

const connectMongoDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`\n🍃 MongoDB Feedback DB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`Error connecting to MongoDB: ${err.message}`);
    // We do not exit process here so the rest of the MySQL app can still run 
    // even if MongoDB fails (graceful degradation).
  }
};

module.exports = connectMongoDB;
