const express = require('express');
const authRoutes = require('./authRoutes');
const walletRoutes = require('./walletRoutes');
const roomRoutes = require('./roomRoutes');
const adminRoutes = require('./adminRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/wallet', walletRoutes);
router.use('/rooms', roomRoutes);
router.use('/admin', adminRoutes);

router.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

module.exports = router;
