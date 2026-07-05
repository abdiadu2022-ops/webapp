const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const config = require('./config');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { handleWebhook } = require('./controllers/telegramWebhookController');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Telegram webhook — mounted outside /api so it isn't subject to the player-facing
// rate limiter below, and validated separately via the secret token header.
app.post(config.telegramWebhookPath, handleWebhook);

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use('/api', apiLimiter, routes);

// Serve the Telegram Mini App static frontend
app.use(express.static(path.join(__dirname, 'public')));

app.use(errorHandler);

module.exports = app;
