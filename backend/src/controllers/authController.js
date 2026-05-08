const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { pool } = require('../config/db');
const JWT_CONFIG = require('../config/jwt');

// POST /api/auth/register
async function register(req, res, next) {
  console.log('--- Request Received ---', {
    body:   req.body,
    origin: req.headers.origin,
  });

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    const existing = await conn.query(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // bcrypt cost factor 12: good balance of security vs. speed
    const password_hash = await bcrypt.hash(password, 12);

    const result = await conn.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, password_hash]
    );

    return res.status(201).json({
      message: 'User registered successfully',
      userId: Number(result.insertId),
    });
  } catch (err) {
    next(err);
  } finally {
    if (conn) conn.release();
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    const rows = await conn.query(
      'SELECT user_id, name, email, password_hash FROM users WHERE email = ?',
      [email]
    );

    // Use the same generic message for both "not found" and "wrong password"
    // to avoid leaking whether an email exists (security best practice)
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user  = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = jwt.sign(
      { sub: user.user_id, email: user.email },
      JWT_CONFIG.secret,
      { expiresIn: JWT_CONFIG.expiresIn }
    );

    const refreshToken = jwt.sign(
      { sub: user.user_id, type: 'refresh' },
      JWT_CONFIG.secret,
      { expiresIn: JWT_CONFIG.refreshExpiresIn }
    );

    // Persist refresh token so we can invalidate it on logout
    await conn.query(
      'UPDATE users SET refresh_token = ? WHERE user_id = ?',
      [refreshToken, user.user_id]
    );

    return res.json({
      accessToken,
      refreshToken,
      user: { id: user.user_id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  } finally {
    if (conn) conn.release();
  }
}

// POST /api/auth/refresh
async function refresh(req, res, next) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'refreshToken is required' });
  }

  let conn;
  try {
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_CONFIG.secret);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    conn = await pool.getConnection();
    const rows = await conn.query(
      'SELECT user_id, email, refresh_token FROM users WHERE user_id = ?',
      [decoded.sub]
    );

    // Validate that the token stored in DB matches (prevents reuse after logout)
    if (rows.length === 0 || rows[0].refresh_token !== refreshToken) {
      return res.status(401).json({ message: 'Refresh token revoked or invalid' });
    }

    const newAccessToken = jwt.sign(
      { sub: rows[0].user_id, email: rows[0].email },
      JWT_CONFIG.secret,
      { expiresIn: JWT_CONFIG.expiresIn }
    );

    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    next(err);
  } finally {
    if (conn) conn.release();
  }
}

// POST /api/auth/logout  (requires authenticate middleware)
async function logout(req, res, next) {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query(
      'UPDATE users SET refresh_token = NULL WHERE user_id = ?',
      [req.user.id]
    );
    return res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { register, login, refresh, logout };
