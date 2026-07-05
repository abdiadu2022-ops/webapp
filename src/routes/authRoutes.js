const express = require('express');
const { telegramLogin } = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/telegram  { initData }
router.post('/telegram', telegramLogin);

module.exports = router;
