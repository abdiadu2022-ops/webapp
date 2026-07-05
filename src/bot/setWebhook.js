// Run with: npm run bot:set-webhook
// Tells Telegram where to send updates. Re-run this any time WEBAPP_URL,
// TELEGRAM_WEBHOOK_PATH, or TELEGRAM_WEBHOOK_SECRET changes.
const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');

async function main() {
  if (!config.telegramBotToken) {
    console.error('TELEGRAM_BOT_TOKEN is not set in .env — nothing to register.');
    process.exit(1);
  }
  if (!config.webappUrl.startsWith('https://')) {
    console.error(
      `WEBAPP_URL must be a public HTTPS URL for Telegram webhooks — got "${config.webappUrl}".\n` +
      'Telegram will not deliver webhooks to http:// or localhost. For local development, use a ' +
      'tunnel (e.g. ngrok) and put that HTTPS URL in WEBAPP_URL, or run the bot with polling instead.'
    );
    process.exit(1);
  }

  const bot = new TelegramBot(config.telegramBotToken, { polling: false });
  const webhookUrl = `${config.webappUrl}${config.telegramWebhookPath}`;

  const options = {};
  if (config.telegramWebhookSecret) {
    options.secret_token = config.telegramWebhookSecret;
  } else {
    console.warn(
      'TELEGRAM_WEBHOOK_SECRET is not set — anyone who finds your webhook URL could POST fake ' +
      'updates to it. Set one before going to production.'
    );
  }

  const result = await bot.setWebHook(webhookUrl, options);
  console.log('setWebHook result:', result);

  const info = await bot.getWebHookInfo();
  console.log('Current webhook info:', info);
}

main().catch((err) => {
  console.error('Failed to set webhook:', err.message);
  process.exit(1);
});
