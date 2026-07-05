const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');
const { registerHandlers } = require('./handlers');

if (!config.telegramBotToken) {
  console.warn('TELEGRAM_BOT_TOKEN is not set — Telegram bot features are disabled.');
}

// No `polling` and no built-in `webHook` listener here — Telegram pushes updates to our own
// Express route (see routes/telegramRoutes.js), which hands each one to bot.processUpdate().
// This keeps the bot in the same process/port as the rest of the server instead of a second
// long-running process.
const bot = config.telegramBotToken ? new TelegramBot(config.telegramBotToken, { polling: false }) : null;

if (bot) {
  registerHandlers(bot);
}

module.exports = bot;
