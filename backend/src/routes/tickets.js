const express = require('express');
const router = express.Router({ mergeParams: true }); // inherit :eventId
const { getTicketsByEvent, createTickets, createTicketsBulk } = require('../controllers/ticketController');
const { authenticate, requireOrganizer } = require('../middleware/authMiddleware');

router.get('/', getTicketsByEvent);
router.post('/bulk', authenticate, requireOrganizer, createTicketsBulk);
router.post('/', authenticate, requireOrganizer, createTickets);

module.exports = router;
