const express = require('express');
const router = express.Router();
const { submitFeedback } = require('../controllers/feedbackController');
const { authenticateOptional } = require('../middleware/authMiddleware');

// Allowing both logged-in and anonymous feedback by creating a custom optional auth middleware 
// or adjusting if authMiddleware exports one. Since we don't have optional auth verified yet, 
// we'll just not enforce strict authentication here, and parse headers manually if needed.

const extractUserOptional = (req, res, next) => {
  const jwt = require('jsonwebtoken');
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // { userId, role }
    } catch (err) {
      // ignore invalid tokens for optional endpoints
    }
  }
  next();
};

router.post('/', extractUserOptional, submitFeedback);

module.exports = router;
