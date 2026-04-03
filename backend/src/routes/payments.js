const express = require('express');
const router = express.Router();
const { createPayment, getPaymentByBooking } = require('../controllers/paymentController');
const { authenticate, requireCustomer } = require('../middleware/authMiddleware');

router.post('/', authenticate, requireCustomer, createPayment);
router.get('/:bookingId', authenticate, requireCustomer, getPaymentByBooking);

module.exports = router;
