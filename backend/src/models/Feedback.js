const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: Number, // Reference to MySQL UserID (optional if anonymous)
    required: false
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comments: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  }
}, { timestamps: true });

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
