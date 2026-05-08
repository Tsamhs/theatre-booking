const { Router }       = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { getUserReservations } = require('../controllers/reservationController');

const router = Router();

// GET /api/user/reservations — booking history for the logged-in user
router.get('/reservations', authenticate, getUserReservations);

module.exports = router;
