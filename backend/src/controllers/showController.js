const { pool } = require('../config/db');

// GET /api/shows?theatreId=&title=&date=YYYY-MM-DD
async function getShows(req, res, next) {
  const { theatreId, title, date } = req.query;

  let sql = `
    SELECT
      s.show_id,
      s.theatre_id,
      t.name       AS theatre_name,
      t.location,
      s.title,
      s.description,
      s.duration,
      s.age_rating,
      s.poster_url
    FROM   shows s
    JOIN   theatres t ON t.theatre_id = s.theatre_id
    WHERE  1=1
  `;
  const params = [];

  if (theatreId) {
    sql += ' AND s.theatre_id = ?';
    params.push(theatreId);
  }
  if (title) {
    sql += ' AND s.title LIKE ?';
    params.push(`%${title}%`);
  }
  // Filter shows that have at least one active showtime on the requested date
  if (date) {
    sql += ` AND EXISTS (
      SELECT 1 FROM showtimes st
      WHERE  st.show_id = s.show_id
        AND  DATE(st.start_datetime) = ?
        AND  st.status = 'active'
    )`;
    params.push(date);
  }

  sql += ' ORDER BY s.title';

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

// GET /api/shows/:id  — includes upcoming showtimes with their ticket categories
async function getShowById(req, res, next) {
  const { id } = req.params;

  let conn;
  try {
    conn = await pool.getConnection();

    const showRows = await conn.query(
      `SELECT
         s.show_id, s.theatre_id, t.name AS theatre_name,
         t.location, s.title, s.description, s.duration, s.age_rating,
         s.poster_url
       FROM shows s
       JOIN theatres t ON t.theatre_id = s.theatre_id
       WHERE s.show_id = ?`,
      [id]
    );

    if (showRows.length === 0) {
      return res.status(404).json({ message: 'Show not found' });
    }

    // Fetch upcoming active showtimes
    const showtimes = await conn.query(
      `SELECT
         st.showtime_id, st.start_datetime, st.end_datetime,
         st.hall, st.total_seats, st.available_seats, st.status
       FROM showtimes st
       WHERE st.show_id = ?
         AND st.start_datetime >= NOW()
         AND st.status = 'active'
       ORDER BY st.start_datetime`,
      [id]
    );

    // Attach ticket categories to each showtime
    for (const showtime of showtimes) {
      const categories = await conn.query(
        `SELECT category_id, name, price, total_seats, available_seats
         FROM ticket_categories
         WHERE showtime_id = ?`,
        [showtime.showtime_id]
      );
      showtime.ticketCategories = categories;
    }

    return res.json({ ...showRows[0], showtimes });
  } catch (err) {
    next(err);
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { getShows, getShowById };
