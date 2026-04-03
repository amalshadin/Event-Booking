const express = require('express');
const router = express.Router();
const { getVenues, createVenue } = require('../controllers/venueController');
const { authenticate, requireOrganizer } = require('../middleware/authMiddleware');

router.get('/', getVenues);
router.post('/', authenticate, requireOrganizer, createVenue);

module.exports = router;
