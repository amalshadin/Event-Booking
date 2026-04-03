const express = require('express');
const router = express.Router();
const { createBooking, getMyBookings, getBookingById } = require('../controllers/bookingController');
const { authenticate, requireCustomer } = require('../middleware/authMiddleware');

router.post('/', authenticate, requireCustomer, createBooking);
router.get('/my', authenticate, requireCustomer, getMyBookings);
router.get('/:id', authenticate, requireCustomer, getBookingById);

module.exports = router;
