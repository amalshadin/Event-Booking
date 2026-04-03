const express = require('express');
const router = express.Router();
const { getEvents, getEventById, createEvent, getMyEvents } = require('../controllers/eventController');
const { authenticate, requireOrganizer } = require('../middleware/authMiddleware');

router.get('/', getEvents);
router.get('/organizer/my', authenticate, requireOrganizer, getMyEvents);
router.get('/:id', getEventById);
router.post('/', authenticate, requireOrganizer, createEvent);

module.exports = router;
