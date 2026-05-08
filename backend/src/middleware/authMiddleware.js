const jwt = require('jsonwebtoken');
const JWT_CONFIG = require('../config/jwt');

/**
 * Verifies the Bearer JWT in the Authorization header.
 * On success, attaches `req.user = { id, email }` and calls next().
 * On failure, responds with 401 without calling next().
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or malformed' });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const decoded = jwt.verify(token, JWT_CONFIG.secret);
    req.user = { id: decoded.sub, email: decoded.email };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = { authenticate };
