const pool = require('../config/db');

// GET /api/events/:eventId/tickets
const getTicketsByEvent = async (req, res) => {
  const { eventId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT t.TicketID, t.SeatNumber, t.BasePrice, t.Category,
              CASE WHEN bi.TicketID IS NOT NULL THEN 'Booked' ELSE 'Available' END AS Status
       FROM ticket t
       LEFT JOIN booking_item bi ON t.TicketID = bi.TicketID
       WHERE t.EventID = ?
       ORDER BY t.Category, t.SeatNumber`,
      [eventId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/events/:eventId/tickets  (Organizer only)
const createTickets = async (req, res) => {
  const { eventId } = req.params;
  // Accept single ticket or array
  const tickets = Array.isArray(req.body) ? req.body : [req.body];

  if (tickets.length === 0) {
    return res.status(400).json({ message: 'At least one ticket is required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Verify event exists and belongs to this organizer
    const [event] = await conn.query(
      'SELECT EventID, OrganizerID FROM event WHERE EventID = ?',
      [eventId]
    );
    if (event.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Event not found' });
    }
    if (event[0].OrganizerID !== req.user.userId) {
      await conn.rollback();
      return res.status(403).json({ message: 'You can only add tickets to your own events' });
    }

    const insertedTickets = [];
    for (const ticket of tickets) {
      const { seatNumber, basePrice, category } = ticket;
      if (!seatNumber || basePrice == null) {
        await conn.rollback();
        return res.status(400).json({ message: 'seatNumber and basePrice are required for each ticket' });
      }

      // Check seat uniqueness per event
      const [dup] = await conn.query(
        'SELECT TicketID FROM ticket WHERE EventID = ? AND SeatNumber = ?',
        [eventId, seatNumber]
      );
      if (dup.length > 0) {
        await conn.rollback();
        return res.status(409).json({ message: `Seat ${seatNumber} already exists for this event` });
      }

      const [result] = await conn.query(
        'INSERT INTO ticket (EventID, SeatNumber, BasePrice, Category) VALUES (?, ?, ?, ?)',
        [eventId, seatNumber, basePrice, category || 'General']
      );
      insertedTickets.push({ ticketId: result.insertId, eventId, seatNumber, basePrice, category: category || 'General' });
    }

    await conn.commit();
    res.status(201).json(insertedTickets);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
};

// Prefix map for auto seat numbering
const CATEGORY_PREFIX = {
  General: 'GEN',
  Premium: 'PREM',
  VIP: 'VIP',
  Economy: 'ECO',
};

// POST /api/events/:eventId/tickets/bulk  (Organizer only)
// Body: { category, count, basePrice }
// Auto-generates seat numbers like VIP-1, VIP-2 … continuing after existing ones
const createTicketsBulk = async (req, res) => {
  const { eventId } = req.params;
  const { category, count, basePrice } = req.body;

  if (!category || !count || basePrice == null) {
    return res.status(400).json({ message: 'category, count, and basePrice are required' });
  }
  const numSeats = parseInt(count);
  if (isNaN(numSeats) || numSeats < 1 || numSeats > 500) {
    return res.status(400).json({ message: 'count must be between 1 and 500' });
  }

  const prefix = CATEGORY_PREFIX[category] || category.toUpperCase().slice(0, 4);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Verify event and ownership
    const [event] = await conn.query(
      'SELECT EventID, OrganizerID FROM event WHERE EventID = ?',
      [eventId]
    );
    if (event.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Event not found' });
    }
    if (event[0].OrganizerID !== req.user.userId) {
      await conn.rollback();
      return res.status(403).json({ message: 'You can only add tickets to your own events' });
    }

    // Find the highest existing sequence number for this prefix in this event
    const [existing] = await conn.query(
      `SELECT SeatNumber FROM ticket
       WHERE EventID = ? AND SeatNumber LIKE ?`,
      [eventId, `${prefix}-%`]
    );

    let maxSeq = 0;
    for (const row of existing) {
      const parts = row.SeatNumber.split('-');
      const n = parseInt(parts[parts.length - 1]);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    }

    // Insert all seats in one transaction
    const insertedTickets = [];
    for (let i = 1; i <= numSeats; i++) {
      const seatNumber = `${prefix}-${maxSeq + i}`;
      const [result] = await conn.query(
        'INSERT INTO ticket (EventID, SeatNumber, BasePrice, Category) VALUES (?, ?, ?, ?)',
        [eventId, seatNumber, basePrice, category]
      );
      insertedTickets.push({
        ticketId: result.insertId,
        eventId: parseInt(eventId),
        seatNumber,
        basePrice,
        category,
      });
    }

    await conn.commit();
    res.status(201).json({
      added: insertedTickets.length,
      from: insertedTickets[0].seatNumber,
      to: insertedTickets[insertedTickets.length - 1].seatNumber,
      tickets: insertedTickets,
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
};

module.exports = { getTicketsByEvent, createTickets, createTicketsBulk };
