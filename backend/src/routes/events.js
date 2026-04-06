const express = require('express');
const router = express.Router();
const { getEvents, getEventById, createEvent, getMyEvents, cancelEvent } = require('../controllers/eventController');
const { authenticate, requireOrganizer } = require('../middleware/authMiddleware');

router.get('/', getEvents);
router.get('/organizer/my', authenticate, requireOrganizer, getMyEvents);
router.get('/:id', getEventById);
router.post('/', authenticate, requireOrganizer, createEvent);
router.patch('/:eventId/cancel', authenticate, requireOrganizer, cancelEvent);

module.exports = router;
