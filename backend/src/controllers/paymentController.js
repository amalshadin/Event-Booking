const pool = require('../config/db');

// POST /api/payments  (Customer only)
// Body: { bookingId, paymentMethod, amountPaid }
const createPayment = async (req, res) => {
  const { bookingId, paymentMethod, amountPaid } = req.body;
  const customerId = req.user.userId;

  if (!bookingId || !paymentMethod || amountPaid == null) {
    return res.status(400).json({ message: 'bookingId, paymentMethod, and amountPaid are required' });
  }

  try {
    // Verify booking belongs to this customer
    const [bookings] = await pool.query(
      'SELECT BookingID, Status FROM booking WHERE BookingID = ? AND CustomerID = ?',
      [bookingId, customerId]
    );
    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check not already paid
    const [existing] = await pool.query(
      "SELECT PaymentID FROM payment WHERE BookingID = ? AND PaymentStatus = 'Completed'",
      [bookingId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Booking already paid' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        "INSERT INTO payment (BookingID, PaymentMethod, AmountPaid, PaymentStatus, Timestamp) VALUES (?, ?, ?, 'Completed', NOW())",
        [bookingId, paymentMethod, amountPaid]
      );

      // Update booking status to Confirmed
      await conn.query("UPDATE booking SET Status = 'Confirmed' WHERE BookingID = ?", [bookingId]);

      await conn.commit();

      const [payment] = await conn.query('SELECT * FROM payment WHERE PaymentID = ?', [result.insertId]);
      res.status(201).json(payment[0]);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/payments/:bookingId
const getPaymentByBooking = async (req, res) => {
  const { bookingId } = req.params;
  const customerId = req.user.userId;

  try {
    // Make sure booking belongs to this user
    const [booking] = await pool.query(
      'SELECT BookingID FROM booking WHERE BookingID = ? AND CustomerID = ?',
      [bookingId, customerId]
    );
    if (booking.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const [payment] = await pool.query('SELECT * FROM payment WHERE BookingID = ?', [bookingId]);
    if (payment.length === 0) return res.status(404).json({ message: 'No payment found' });
    res.json(payment[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createPayment, getPaymentByBooking };
