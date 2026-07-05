const express = require('express');
const { requireAdmin } = require('../middleware/adminMiddleware');
const admin = require('../controllers/adminController');

const router = express.Router();

// Public: admin login
router.post('/login', admin.login);

// Everything below requires a valid admin token
router.use(requireAdmin);

router.get('/rooms', admin.listRooms);
router.post('/rooms', admin.createRoom);
router.patch('/rooms/:id', admin.updateRoom);
router.post('/rooms/:id/start', admin.forceStartRoom);
router.post('/rooms/:id/cancel', admin.cancelRoom);

router.get('/players', admin.listPlayers);
router.get('/players/:id', admin.getPlayer);
router.post('/players/:id/adjust', admin.adjustBalance);
router.post('/players/:id/ban', admin.banPlayer);
router.post('/players/:id/unban', admin.unbanPlayer);

router.get('/withdrawals', admin.listWithdrawals);
router.post('/withdrawals/:id/approve', admin.approveWithdrawal);
router.post('/withdrawals/:id/reject', admin.rejectWithdrawal);

router.get('/financials', admin.financialSummary);

module.exports = router;
