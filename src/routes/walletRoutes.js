const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { getBalance, deposit, requestWithdrawal, listMyWithdrawals, history } = require('../controllers/walletController');

const router = express.Router();

router.use(requireAuth);
router.get('/balance', getBalance);
router.post('/deposit', deposit);
router.post('/withdrawals', requestWithdrawal);
router.get('/withdrawals', listMyWithdrawals);
router.get('/history', history);

module.exports = router;
