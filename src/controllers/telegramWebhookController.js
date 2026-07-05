const config = require('../config');
const bot = require('../bot/bot');

/**
 * Handles POST requests from Telegram's webhook. Always responds 200 quickly —
 * Telegram retries (and eventually disables the webhook) if it doesn't get a
 * timely response, so we ack first and let processUpdate() run the handlers.
 */
function handleWebhook(req, res) {
  if (config.telegramWebhookSecret) {
    const receivedSecret = req.headers['x-telegram-bot-api-secret-token'];
    if (receivedSecret !== config.telegramWebhookSecret) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }
  }

  if (!bot) {
    return res.status(503).json({ error: 'Telegram bot is not configured on this server' });
  }

  res.sendStatus(200);
  bot.processUpdate(req.body);
}

module.exports = { handleWebhook };
