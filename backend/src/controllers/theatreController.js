const { pool } = require('../config/db');

// GET /api/theatres?name=&location=
async function getTheatres(req, res, next) {
  const { name, location } = req.query;

  let sql = `
    SELECT theatre_id, name, location, description
    FROM   theatres
    WHERE  1=1
  `;
  const params = [];

  if (name) {
    sql += ' AND name LIKE ?';
    params.push(`%${name}%`);
  }
  if (location) {
    sql += ' AND location LIKE ?';
    params.push(`%${location}%`);
  }

  sql += ' ORDER BY name';

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(sql, params);
    return res.json(rows);
  } catch (err) {
    next(err);
  } finally {
    if (conn) conn.release();
  }
}

// GET /api/theatres/:id
async function getTheatreById(req, res, next) {
  const { id } = req.params;

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      'SELECT theatre_id, name, location, description FROM theatres WHERE theatre_id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Theatre not found' });
    }

    return res.json(rows[0]);
  } catch (err) {
    next(err);
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { getTheatres, getTheatreById };
