const Feedback = require('../models/Feedback');

// POST /api/feedback
const submitFeedback = async (req, res) => {
  const { rating, comments } = req.body;

  if (!rating || !comments) {
    return res.status(400).json({ message: 'Rating and comments are required' });
  }

  try {
    const feedback = new Feedback({
      // Grab user ID from JWT if they are logged in. If not, it will be undefined (anonymous)
      userId: req.user ? req.user.userId : undefined, 
      rating,
      comments
    });

    await feedback.save();
    res.status(201).json({ message: 'Feedback submitted successfully', feedback });
  } catch (err) {
    console.error('Error saving feedback:', err);
    res.status(500).json({ message: 'Failed to process feedback. Please try again.' });
  }
};

module.exports = { submitFeedback };
