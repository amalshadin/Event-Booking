const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

// POST /api/auth/register
const register = async (req, res) => {
  const { firstName, lastName, email, password, role, phone, organizationName } = req.body;

  if (!firstName || !lastName || !email || !password || !role) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  if (!['Customer', 'Organizer'].includes(role)) {
    return res.status(400).json({ message: 'Role must be Customer or Organizer' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check email uniqueness
    const [existing] = await conn.query('SELECT UserID FROM user WHERE Email = ?', [email]);
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Insert into user
    const [userResult] = await conn.query(
      'INSERT INTO user (FirstName, LastName, Email) VALUES (?, ?, ?)',
      [firstName, lastName, email]
    );
    const userId = userResult.insertId;

    // Hash password (bcrypt generates its own salt, but we also store it separately per schema)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await conn.query(
      'INSERT INTO user_credentials (UserID, PasswordHash, Salt) VALUES (?, ?, ?)',
      [userId, passwordHash, salt]
    );

    // Optional phone
    if (phone) {
      await conn.query('INSERT INTO user_phone (UserID, PhoneNumber) VALUES (?, ?)', [userId, phone]);
    }

    // Role-specific table
    if (role === 'Customer') {
      await conn.query('INSERT INTO customer (UserID, DateJoined) VALUES (?, CURDATE())', [userId]);
    } else {
      const orgName = organizationName || 'My Organization';
      await conn.query(
        'INSERT INTO organizer (UserID, OrganizationName, VerifiedStatus) VALUES (?, ?, 0)',
        [userId, orgName]
      );
    }

    await conn.commit();

    const token = jwt.sign(
      { userId, role, firstName },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({ token, user: { userId, firstName, lastName, email, role } });
  } catch (err) {
    await conn.rollback();
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  } finally {
    conn.release();
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Get user with credentials
    const [rows] = await pool.query(
      `SELECT u.UserID, u.FirstName, u.LastName, u.Email,
              uc.PasswordHash,
              CASE WHEN c.UserID IS NOT NULL THEN 'Customer'
                   WHEN o.UserID IS NOT NULL THEN 'Organizer'
                   ELSE 'Unknown' END AS Role
       FROM user u
       JOIN user_credentials uc ON u.UserID = uc.UserID
       LEFT JOIN customer c ON u.UserID = c.UserID
       LEFT JOIN organizer o ON u.UserID = o.UserID
       WHERE u.Email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.PasswordHash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.UserID, role: user.Role, firstName: user.FirstName },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        userId: user.UserID,
        firstName: user.FirstName,
        lastName: user.LastName,
        email: user.Email,
        role: user.Role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// GET /api/auth/me  — returns logged-in user profile
const getMe = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.UserID, u.FirstName, u.LastName, u.Email,
              CASE WHEN c.UserID IS NOT NULL THEN 'Customer'
                   WHEN o.UserID IS NOT NULL THEN 'Organizer'
                   ELSE 'Unknown' END AS Role,
              o.OrganizationName,
              GROUP_CONCAT(up.PhoneNumber) AS Phone
       FROM user u
       LEFT JOIN customer c ON u.UserID = c.UserID
       LEFT JOIN organizer o ON u.UserID = o.UserID
       LEFT JOIN user_phone up ON u.UserID = up.UserID
       WHERE u.UserID = ?
       GROUP BY u.UserID`,
      [req.user.userId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, getMe };
