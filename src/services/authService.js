const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const Player = require('../models/Player');
const { validateInitData } = require('./telegramService');

function issueToken(player) {
  return jwt.sign(
    { playerId: player.id, telegramId: player.telegram_id },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}

function timingSafeStringEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Admin login via env-configured username/password (not tied to a player record). */
function loginAdmin(username, password) {
  if (!config.adminPassword) {
    const err = new Error('Admin login is not configured (set ADMIN_PASSWORD)');
    err.status = 503;
    throw err;
  }

  const validUsername = timingSafeStringEqual(username || '', config.adminUsername);
  const validPassword = timingSafeStringEqual(password || '', config.adminPassword);

  if (!validUsername || !validPassword) {
    const err = new Error('Invalid admin credentials');
    err.status = 401;
    throw err;
  }

  const token = jwt.sign({ role: 'admin', username: config.adminUsername }, config.jwtSecret, {
    expiresIn: config.adminJwtExpiresIn,
  });
  return { token };
}

/**
 * Logs a player in (creating them if new) using Telegram Mini App initData.
 * Throws on invalid initData.
 */
function loginWithTelegram(initData) {
  // In development without a real bot token, allow a dev bypass via a plain JSON payload.
  if (config.env === 'development' && !config.telegramBotToken) {
    const devUser = safeParse(initData);
    if (devUser && devUser.id) {
      const player = Player.findOrCreate({
        telegramId: devUser.id,
        username: devUser.username,
        firstname: devUser.first_name,
        avatar: devUser.photo_url,
      });
      return { player, token: issueToken(player) };
    }
  }

  const { valid, user } = validateInitData(initData);
  if (!valid || !user) {
    const err = new Error('Invalid Telegram authentication data');
    err.status = 401;
    throw err;
  }

  const player = Player.findOrCreate({
    telegramId: user.id,
    username: user.username,
    firstname: user.first_name,
    avatar: user.photo_url,
  });

  return { player, token: issueToken(player) };
}

function safeParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

module.exports = { issueToken, verifyToken, loginWithTelegram, loginAdmin };
