require('dotenv').config();
const path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',

  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  webappUrl: process.env.WEBAPP_URL || 'http://localhost:3000',
  telegramWebhookPath: process.env.TELEGRAM_WEBHOOK_PATH || '/telegram/webhook',
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '',

  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  adminJwtExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '12h',

  dbPath: process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(__dirname, '..', 'database', 'bingo.db'),

  defaultGameSpeedMs: parseInt(process.env.DEFAULT_GAME_SPEED_MS || '5000', 10),
  houseCommissionPercent: parseFloat(process.env.HOUSE_COMMISSION_PERCENT || '10'),

  bingoColumns: {
    B: [1, 15],
    I: [16, 30],
    N: [31, 45],
    G: [46, 60],
    O: [61, 75],
  },
};
