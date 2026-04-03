const pool = require('../config/db');

// GET /api/venues
const getVenues = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM venue ORDER BY Name');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/venues  (Organizer only)
const createVenue = async (req, res) => {
  const { name, street, city, state, zipCode, capacity } = req.body;
  if (!name) return res.status(400).json({ message: 'Venue name is required' });
  try {
    const [result] = await pool.query(
      'INSERT INTO venue (Name, Street, City, State, ZipCode, Capacity) VALUES (?, ?, ?, ?, ?, ?)',
      [name, street || null, city || null, state || null, zipCode || null, capacity || null]
    );
    const [venue] = await pool.query('SELECT * FROM venue WHERE VenueID = ?', [result.insertId]);
    res.status(201).json(venue[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getVenues, createVenue };
