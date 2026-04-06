const pool = require('../config/db');

// POST /api/bookings  (Customer only)
// Body: { ticketIds: [1, 2, 3] }
const createBooking = async (req, res) => {
  const { ticketIds } = req.body;
  const customerId = req.user.userId;

  if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
    return res.status(400).json({ message: 'ticketIds must be a non-empty array' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock the rows so concurrent requests cannot race on the same tickets
    const placeholders = ticketIds.map(() => '?').join(',');
    const [tickets] = await conn.query(
      `SELECT t.TicketID, t.BasePrice, t.SeatNumber, t.EventID,
              bi.TicketID AS AlreadyBooked
       FROM ticket t
       LEFT JOIN booking_item bi ON t.TicketID = bi.TicketID
       WHERE t.TicketID IN (${placeholders})
       FOR UPDATE`,          // ← row-level lock prevents race condition
      ticketIds
    );

    if (tickets.length !== ticketIds.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'One or more tickets not found' });
    }

    const alreadyBooked = tickets.filter((t) => t.AlreadyBooked !== null);
    if (alreadyBooked.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        message: `Seat(s) already booked: ${alreadyBooked.map((t) => t.SeatNumber).join(', ')}`,
      });
    }

    // Create booking
    const [bookingResult] = await conn.query(
      "INSERT INTO booking (CustomerID, BookingDate, Status) VALUES (?, NOW(), 'Pending')",
      [customerId]
    );
    const bookingId = bookingResult.insertId;

    // Insert booking items — DB UNIQUE(TicketID) is the final safety net
    for (const ticket of tickets) {
      await conn.query(
        'INSERT INTO booking_item (BookingID, TicketID, SoldPrice) VALUES (?, ?, ?)',
        [bookingId, ticket.TicketID, ticket.BasePrice]
      );
    }

    await conn.commit();

    // Return full booking details
    const [booking] = await conn.query(
      `SELECT b.BookingID, b.BookingDate, b.Status,
              SUM(bi.SoldPrice) AS TotalAmount
       FROM booking b
       JOIN booking_item bi ON b.BookingID = bi.BookingID
       WHERE b.BookingID = ?`,
      [bookingId]
    );

    res.status(201).json({ ...booking[0], items: tickets.map((t) => ({ ticketId: t.TicketID, soldPrice: t.BasePrice, seatNumber: t.SeatNumber })) });
  } catch (err) {
    await conn.rollback();
    // Handle DB-level unique constraint violation (race condition fallback)
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'One or more seats were just booked by another user.' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
};

// GET /api/bookings/my  (Customer)
const getMyBookings = async (req, res) => {
  const customerId = req.user.userId;
  try {
    const [bookings] = await pool.query(
      `SELECT b.BookingID, b.BookingDate, b.Status,
              SUM(bi.SoldPrice) AS TotalAmount,
              GROUP_CONCAT(CONCAT(t.SeatNumber, ' (', t.Category, ')') SEPARATOR ', ') AS Seats,
              e.Title AS EventTitle, e.EventDateTime,
              v.Name AS VenueName, v.City,
              p.PaymentStatus
       FROM booking b
       JOIN booking_item bi ON b.BookingID = bi.BookingID
       JOIN ticket t ON bi.TicketID = t.TicketID
       JOIN event e ON t.EventID = e.EventID
       JOIN venue v ON e.VenueID = v.VenueID
       LEFT JOIN payment p ON b.BookingID = p.BookingID
       WHERE b.CustomerID = ?
       GROUP BY b.BookingID
       ORDER BY b.BookingDate DESC`,
      [customerId]
    );
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/bookings/:id  (Customer — own booking)
const getBookingById = async (req, res) => {
  const { id } = req.params;
  const customerId = req.user.userId;
  try {
    const [rows] = await pool.query(
      `SELECT b.BookingID, b.BookingDate, b.Status,
              bi.TicketID, bi.SoldPrice,
              t.SeatNumber, t.Category,
              e.Title AS EventTitle, e.EventDateTime,
              v.Name AS VenueName, v.City, v.State
       FROM booking b
       JOIN booking_item bi ON b.BookingID = bi.BookingID
       JOIN ticket t ON bi.TicketID = t.TicketID
       JOIN event e ON t.EventID = e.EventID
       JOIN venue v ON e.VenueID = v.VenueID
       WHERE b.BookingID = ? AND b.CustomerID = ?`,
      [id, customerId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Booking not found' });

    const booking = {
      bookingId: rows[0].BookingID,
      bookingDate: rows[0].BookingDate,
      status: rows[0].Status,
      event: { title: rows[0].EventTitle, eventDateTime: rows[0].EventDateTime, venue: { name: rows[0].VenueName, city: rows[0].City, state: rows[0].State } },
      items: rows.map((r) => ({ ticketId: r.TicketID, seatNumber: r.SeatNumber, category: r.Category, soldPrice: r.SoldPrice })),
      totalAmount: rows.reduce((sum, r) => sum + parseFloat(r.SoldPrice), 0),
    };
    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createBooking, getMyBookings, getBookingById };
