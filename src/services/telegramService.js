// Verifies Telegram Mini App `initData` per Telegram's documented HMAC scheme.
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
const crypto = require('crypto');
const config = require('../config');

/**
 * Validates the initData string sent by the Telegram WebApp client.
 * @param {string} initData - raw query-string style initData from window.Telegram.WebApp.initData
 * @returns {{ valid: boolean, data: Record<string,string>|null, user: object|null }}
 */
function validateInitData(initData) {
  if (!initData || typeof initData !== 'string') {
    return { valid: false, data: null, user: null };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { valid: false, data: null, user: null };

  params.delete('hash');

  const dataCheckArr = [];
  for (const [key, value] of [...params.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    dataCheckArr.push(`${key}=${value}`);
  }
  const dataCheckString = dataCheckArr.join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(config.telegramBotToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const valid = crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));

  if (!valid) return { valid: false, data: null, user: null };

  // Optional: reject stale initData (older than 24h)
  const authDate = parseInt(params.get('auth_date') || '0', 10);
  const isStale = authDate > 0 && Date.now() / 1000 - authDate > 60 * 60 * 24;
  if (isStale) return { valid: false, data: null, user: null };

  let user = null;
  try {
    user = JSON.parse(params.get('user') || 'null');
  } catch {
    user = null;
  }

  return { valid: true, data: Object.fromEntries(params.entries()), user };
}

module.exports = { validateInitData };
