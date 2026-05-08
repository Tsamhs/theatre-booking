const { Router }   = require('express');
const { register, login, refresh, logout } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

const router = Router();

router.post('/register', register);
router.post('/login',    login);
router.post('/refresh',  refresh);
router.post('/logout',   authenticate, logout); // protected

module.exports = router;
