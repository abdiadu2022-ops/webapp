const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { listRooms, getRoom, getMyCard } = require('../controllers/roomController');

const router = express.Router();

router.use(requireAuth);
router.get('/', listRooms);
router.get('/:id', getRoom);
router.get('/:id/card', getMyCard);

module.exports = router;
