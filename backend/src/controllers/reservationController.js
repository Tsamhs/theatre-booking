const { pool } = require('../config/db');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Releases seats back to a category and its parent showtime. */
async function _releaseSeats(conn, categoryId, showtimeId, numTickets) {
  await conn.query(
    'UPDATE ticket_categories SET available_seats = available_seats + ? WHERE category_id = ?',
    [numTickets, categoryId]
  );
  await conn.query(
    'UPDATE showtimes SET available_seats = available_seats + ? WHERE showtime_id = ?',
    [numTickets, showtimeId]
  );
  // If the showtime was sold_out and now has seats again, reactivate it
  await conn.query(
    `UPDATE showtimes
     SET    status = 'active'
     WHERE  showtime_id = ? AND status = 'sold_out' AND available_seats > 0`,
    [showtimeId]
  );
}

/** Marks a showtime as sold_out when available_seats reaches zero. */
async function _syncSoldOut(conn, showtimeId) {
  await conn.query(
    `UPDATE showtimes
     SET    status = 'sold_out'
     WHERE  showtime_id = ? AND available_seats = 0 AND status = 'active'`,
    [showtimeId]
  );
}

// ── POST /api/reservations ────────────────────────────────────────────────────
// Creates a new reservation inside a transaction.
// Uses SELECT … FOR UPDATE on ticket_categories to prevent double-booking
// under concurrent requests.
async function createReservation(req, res, next) {
  const { showtime_id, category_id, num_tickets } = req.body;
  const user_id = req.user.id;

  if (!showtime_id || !category_id || !num_tickets) {
    return res.status(400).json({ message: 'showtime_id, category_id and num_tickets are required' });
  }
  const tickets = parseInt(num_tickets, 10);
  if (isNaN(tickets) || tickets < 1) {
    return res.status(400).json({ message: 'num_tickets must be a positive integer' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 1. Verify the showtime exists, is active, and hasn't started yet
    const [showtime] = await conn.query(
      `SELECT showtime_id, status, start_datetime
       FROM   showtimes
       WHERE  showtime_id = ?`,
      [showtime_id]
    );
    if (!showtime) {
      await conn.rollback();
      return res.status(404).json({ message: 'Showtime not found' });
    }
    if (showtime.status !== 'active') {
      await conn.rollback();
      return res.status(409).json({ message: `Showtime is ${showtime.status}` });
    }
    if (new Date(showtime.start_datetime) <= new Date()) {
      await conn.rollback();
      return res.status(409).json({ message: 'Cannot book a showtime that has already started' });
    }

    // 2. Lock the ticket category row — prevents concurrent over-booking
    const [category] = await conn.query(
      `SELECT category_id, name, price, available_seats
       FROM   ticket_categories
       WHERE  category_id = ? AND showtime_id = ?
       FOR UPDATE`,
      [category_id, showtime_id]
    );
    if (!category) {
      await conn.rollback();
      return res.status(404).json({ message: 'Ticket category not found for this showtime' });
    }
    if (category.available_seats < tickets) {
      await conn.rollback();
      return res.status(409).json({
        message:   'Not enough seats available',
        available: category.available_seats,
      });
    }

    const total_price = parseFloat(category.price) * tickets;

    // 3. Decrement available seats in category and showtime
    await conn.query(
      'UPDATE ticket_categories SET available_seats = available_seats - ? WHERE category_id = ?',
      [tickets, category_id]
    );
    await conn.query(
      'UPDATE showtimes SET available_seats = available_seats - ? WHERE showtime_id = ?',
      [tickets, showtime_id]
    );
    await _syncSoldOut(conn, showtime_id);

    // 4. Insert the reservation record
    const result = await conn.query(
      `INSERT INTO reservations
         (user_id, showtime_id, category_id, num_tickets, total_price, status)
       VALUES (?, ?, ?, ?, ?, 'confirmed')`,
      [user_id, showtime_id, category_id, tickets, total_price]
    );

    await conn.commit();

    return res.status(201).json({
      message:       'Reservation created successfully',
      reservationId: Number(result.insertId),
      totalPrice:    total_price,
    });
  } catch (err) {
    if (conn) await conn.rollback();
    next(err);
  } finally {
    if (conn) conn.release();
  }
}

// ── GET /api/user/reservations ────────────────────────────────────────────────
// Returns the full booking history for the authenticated user (newest first).
async function getUserReservations(req, res, next) {
  const user_id = req.user.id;

  let conn;
  try {
    conn = await pool.getConnection();

    const rows = await conn.query(
      `SELECT
         r.reservation_id,
         r.num_tickets,
         r.total_price,
         r.status,
         tc.name          AS category_name,
         tc.price         AS price_per_ticket,
         st.showtime_id,
         st.start_datetime,
         st.end_datetime,
         st.hall,
         s.show_id,
         s.title          AS show_title,
         s.duration,
         s.age_rating,
         t.theatre_id,
         t.name           AS theatre_name,
         t.location
       FROM   reservations r
       JOIN   showtimes        st ON st.showtime_id   = r.showtime_id
       JOIN   shows            s  ON s.show_id        = st.show_id
       JOIN   theatres         t  ON t.theatre_id     = s.theatre_id
       LEFT   JOIN ticket_categories tc ON tc.category_id = r.category_id
       WHERE  r.user_id = ?
       ORDER  BY r.reservation_id DESC`,
      [user_id]
    );

    return res.json(rows);
  } catch (err) {
    next(err);
  } finally {
    if (conn) conn.release();
  }
}

// ── GET /api/reservations/:id ────────────────────────────────────────────────
// Returns a single reservation — only if it belongs to the authenticated user.
async function getReservationById(req, res, next) {
  const { id }   = req.params;
  const user_id  = req.user.id;

  let conn;
  try {
    conn = await pool.getConnection();

    const [row] = await conn.query(
      `SELECT
         r.reservation_id, r.num_tickets, r.total_price, r.status,
         r.created_at, r.updated_at,
         tc.name AS category_name, tc.price AS price_per_ticket,
         st.showtime_id, st.start_datetime, st.end_datetime, st.hall,
         s.title AS show_title, s.duration,
         t.name  AS theatre_name, t.location
       FROM  reservations r
       JOIN  showtimes        st ON st.showtime_id = r.showtime_id
       JOIN  shows            s  ON s.show_id      = st.show_id
       JOIN  theatres         t  ON t.theatre_id   = s.theatre_id
       LEFT  JOIN ticket_categories tc ON tc.category_id = r.category_id
       WHERE r.reservation_id = ? AND r.user_id = ?`,
      [id, user_id]
    );

    if (!row) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    return res.json(row);
  } catch (err) {
    next(err);
  } finally {
    if (conn) conn.release();
  }
}

// ── PATCH /api/reservations/:id ───────────────────────────────────────────────
// Modifies num_tickets on a future confirmed reservation.
// Uses SELECT … FOR UPDATE to safely adjust the seat counts.
async function modifyReservation(req, res, next) {
  const { id }        = req.params;
  const user_id       = req.user.id;
  const { num_tickets } = req.body;

  const newTickets = parseInt(num_tickets, 10);
  if (isNaN(newTickets) || newTickets < 1) {
    return res.status(400).json({ message: 'num_tickets must be a positive integer' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Lock the reservation row together with showtime info
    const [reservation] = await conn.query(
      `SELECT
         r.reservation_id, r.num_tickets, r.category_id,
         r.showtime_id, r.status, r.total_price,
         st.start_datetime, st.status AS showtime_status
       FROM  reservations r
       JOIN  showtimes st ON st.showtime_id = r.showtime_id
       WHERE r.reservation_id = ? AND r.user_id = ?
       FOR UPDATE`,
      [id, user_id]
    );

    if (!reservation) {
      await conn.rollback();
      return res.status(404).json({ message: 'Reservation not found' });
    }
    if (reservation.status === 'cancelled') {
      await conn.rollback();
      return res.status(409).json({ message: 'Cannot modify a cancelled reservation' });
    }
    if (new Date(reservation.start_datetime) <= new Date()) {
      await conn.rollback();
      return res.status(409).json({ message: 'Cannot modify a reservation for a past showtime' });
    }
    if (newTickets === reservation.num_tickets) {
      await conn.rollback();
      return res.json({ message: 'No change — num_tickets is already that value' });
    }

    const diff = newTickets - reservation.num_tickets; // positive = need more seats

    // Lock ticket category to safely check/adjust availability
    const [category] = await conn.query(
      'SELECT price, available_seats FROM ticket_categories WHERE category_id = ? FOR UPDATE',
      [reservation.category_id]
    );

    if (diff > 0 && category.available_seats < diff) {
      await conn.rollback();
      return res.status(409).json({
        message:   'Not enough seats available for the requested increase',
        available: category.available_seats,
      });
    }

    const new_total_price = parseFloat(category.price) * newTickets;

    // Adjust seat counts (diff may be negative when reducing tickets)
    await conn.query(
      'UPDATE ticket_categories SET available_seats = available_seats - ? WHERE category_id = ?',
      [diff, reservation.category_id]
    );
    await conn.query(
      'UPDATE showtimes SET available_seats = available_seats - ? WHERE showtime_id = ?',
      [diff, reservation.showtime_id]
    );

    // Sync sold_out / active status
    if (diff > 0) {
      await _syncSoldOut(conn, reservation.showtime_id);
    } else {
      await _releaseSeats(conn, reservation.category_id, reservation.showtime_id, 0);
      // _releaseSeats with 0 only reactivates if sold_out; seats already adjusted above
    }

    await conn.query(
      'UPDATE reservations SET num_tickets = ?, total_price = ? WHERE reservation_id = ?',
      [newTickets, new_total_price, id]
    );

    await conn.commit();

    return res.json({
      message:       'Reservation updated successfully',
      reservationId: Number(id),
      numTickets:    newTickets,
      totalPrice:    new_total_price,
    });
  } catch (err) {
    if (conn) await conn.rollback();
    next(err);
  } finally {
    if (conn) conn.release();
  }
}

// ── DELETE /api/reservations/:id ─────────────────────────────────────────────
// Cancels a reservation and releases the seats back to the pool.
async function cancelReservation(req, res, next) {
  const { id }  = req.params;
  const user_id = req.user.id;

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Lock the row to avoid a concurrent modification race
    const [reservation] = await conn.query(
      `SELECT
         r.reservation_id, r.num_tickets, r.category_id,
         r.showtime_id, r.status,
         st.start_datetime
       FROM  reservations r
       JOIN  showtimes st ON st.showtime_id = r.showtime_id
       WHERE r.reservation_id = ? AND r.user_id = ?
       FOR UPDATE`,
      [id, user_id]
    );

    if (!reservation) {
      await conn.rollback();
      return res.status(404).json({ message: 'Reservation not found' });
    }
    if (reservation.status === 'cancelled') {
      await conn.rollback();
      return res.status(409).json({ message: 'Reservation is already cancelled' });
    }
    if (new Date(reservation.start_datetime) <= new Date()) {
      await conn.rollback();
      return res.status(409).json({ message: 'Cannot cancel a reservation for a past showtime' });
    }

    // Mark as cancelled and restore the seats
    await conn.query(
      "UPDATE reservations SET status = 'cancelled' WHERE reservation_id = ?",
      [id]
    );
    await _releaseSeats(
      conn,
      reservation.category_id,
      reservation.showtime_id,
      reservation.num_tickets
    );

    await conn.commit();

    return res.json({ message: 'Reservation cancelled successfully' });
  } catch (err) {
    if (conn) await conn.rollback();
    next(err);
  } finally {
    if (conn) conn.release();
  }
}

module.exports = {
  createReservation,
  getUserReservations,
  getReservationById,
  modifyReservation,
  cancelReservation,
};
