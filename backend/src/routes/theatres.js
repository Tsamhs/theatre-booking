const { Router } = require('express');
const { getTheatres, getTheatreById } = require('../controllers/theatreController');

const router = Router();

router.get('/',    getTheatres);
router.get('/:id', getTheatreById);

module.exports = router;
