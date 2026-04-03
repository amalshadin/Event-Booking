const jwt = require('jsonwebtoken');
require('dotenv').config();

// Verify JWT and attach decoded user to req.user
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, role, firstName }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Only allow Organizer role
const requireOrganizer = (req, res, next) => {
  if (req.user?.role !== 'Organizer') {
    return res.status(403).json({ message: 'Access denied: Organizers only' });
  }
  next();
};

// Only allow Customer role
const requireCustomer = (req, res, next) => {
  if (req.user?.role !== 'Customer') {
    return res.status(403).json({ message: 'Access denied: Customers only' });
  }
  next();
};

module.exports = { authenticate, requireOrganizer, requireCustomer };
