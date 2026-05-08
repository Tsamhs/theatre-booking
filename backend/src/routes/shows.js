const { Router } = require('express');
const { getShows, getShowById } = require('../controllers/showController');

const router = Router();

router.get('/',    getShows);
router.get('/:id', getShowById);

module.exports = router;
