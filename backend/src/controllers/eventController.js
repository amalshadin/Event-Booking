const pool = require('../config/db');

// GET /api/events
const getEvents = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.EventID, e.Title, e.EventDateTime, e.EventStatus,
              v.Name AS VenueName, v.City, v.State, v.Capacity,
              u.FirstName, u.LastName,
              o.OrganizationName,
              COUNT(DISTINCT t.TicketID) AS TotalTickets,
              COUNT(DISTINCT bi.TicketID) AS BookedTickets,
              MIN(t.BasePrice) AS MinPrice
       FROM event e
       JOIN venue v ON e.VenueID = v.VenueID
       JOIN organizer o ON e.OrganizerID = o.UserID
       JOIN user u ON o.UserID = u.UserID
       LEFT JOIN ticket t ON e.EventID = t.EventID
       LEFT JOIN booking_item bi ON t.TicketID = bi.TicketID
       WHERE e.EventStatus = 'Active'
       GROUP BY e.EventID
       ORDER BY e.EventDateTime ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/events/:id
const getEventById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT e.EventID, e.Title, e.EventDateTime, e.EventStatus,
              v.VenueID, v.Name AS VenueName, v.Street, v.City, v.State, v.ZipCode, v.Capacity,
              u.FirstName, u.LastName,
              o.OrganizationName,
              o.UserID AS OrganizerID
       FROM event e
       JOIN venue v ON e.VenueID = v.VenueID
       JOIN organizer o ON e.OrganizerID = o.UserID
       JOIN user u ON o.UserID = u.UserID
       WHERE e.EventID = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Event not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/events  (Organizer only)
const createEvent = async (req, res) => {
  const { venueId, title, eventDateTime } = req.body;
  const organizerId = req.user.userId;

  if (!venueId || !title || !eventDateTime) {
    return res.status(400).json({ message: 'venueId, title, and eventDateTime are required' });
  }

  try {
    // Check double-booking constraint (same venue + same datetime)
    const [conflict] = await pool.query(
      'SELECT EventID FROM event WHERE VenueID = ? AND EventDateTime = ?',
      [venueId, eventDateTime]
    );
    if (conflict.length > 0) {
      return res.status(409).json({ message: 'This venue is already booked at that date/time' });
    }

    const [result] = await pool.query(
      'INSERT INTO event (OrganizerID, VenueID, Title, EventDateTime, EventStatus) VALUES (?, ?, ?, ?, ?)',
      [organizerId, venueId, title, eventDateTime, 'Active']
    );

    const [event] = await pool.query(
      `SELECT e.*, v.Name AS VenueName, v.City FROM event e
       JOIN venue v ON e.VenueID = v.VenueID
       WHERE e.EventID = ?`,
      [result.insertId]
    );

    res.status(201).json(event[0]);
  } catch (err) {
    // DB-level safety net: UNIQUE(VenueID, EventDateTime) fires on race conditions
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'This venue is already booked at that date/time' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/events/organizer/my  — events by logged-in organizer
const getMyEvents = async (req, res) => {
  const organizerId = req.user.userId;
  try {
    const [rows] = await pool.query(
      `SELECT e.EventID, e.Title, e.EventDateTime, e.EventStatus,
              v.Name AS VenueName, v.City,
              COUNT(DISTINCT t.TicketID) AS TotalTickets,
              COUNT(DISTINCT bi.TicketID) AS BookedTickets
       FROM event e
       JOIN venue v ON e.VenueID = v.VenueID
       LEFT JOIN ticket t ON e.EventID = t.EventID
       LEFT JOIN booking_item bi ON t.TicketID = bi.TicketID
       WHERE e.OrganizerID = ?
       GROUP BY e.EventID
       ORDER BY e.EventDateTime DESC`,
      [organizerId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/events/:eventId/cancel  (Organizer only)
const cancelEvent = async (req, res) => {
  const { eventId } = req.params;
  const organizerId = req.user.userId;

  try {
    const [event] = await pool.query(
      'SELECT OrganizerID, EventStatus FROM event WHERE EventID = ?',
      [eventId]
    );

    if (event.length === 0) return res.status(404).json({ message: 'Event not found' });
    if (event[0].OrganizerID !== organizerId) return res.status(403).json({ message: 'Not authorized' });
    if (event[0].EventStatus === 'Cancelled') return res.status(400).json({ message: 'Event is already cancelled' });

    await pool.query("UPDATE event SET EventStatus = 'Cancelled' WHERE EventID = ?", [eventId]);
    res.json({ message: 'Event has been cancelled successfully', eventId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getEvents, getEventById, createEvent, getMyEvents, cancelEvent };
