const { Router }       = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const {
  createReservation,
  getReservationById,
  modifyReservation,
  cancelReservation,
} = require('../controllers/reservationController');

const router = Router();

// All reservation endpoints require a valid JWT
router.use(authenticate);

router.post('/',    createReservation);   // POST   /api/reservations
router.get('/:id',  getReservationById); // GET    /api/reservations/:id
router.patch('/:id', modifyReservation); // PATCH  /api/reservations/:id
router.delete('/:id', cancelReservation);// DELETE /api/reservations/:id

module.exports = router;
