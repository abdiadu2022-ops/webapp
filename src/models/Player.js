const db = require('../database/db');

const Player = {
  findByTelegramId(telegramId) {
    return db.prepare('SELECT * FROM players WHERE telegram_id = ?').get(String(telegramId));
  },

  findById(id) {
    return db.prepare('SELECT * FROM players WHERE id = ?').get(id);
  },

  create({ telegramId, username, firstname, avatar, phoneNumber }) {
    const stmt = db.prepare(`
      INSERT INTO players (telegram_id, username, firstname, avatar, phone_number, balance)
      VALUES (?, ?, ?, ?, ?, 0)
    `);
    const info = stmt.run(
      String(telegramId),
      username || null,
      firstname || null,
      avatar || null,
      phoneNumber || null
    );
    return Player.findById(info.lastInsertRowid);
  },

  findOrCreate({ telegramId, username, firstname, avatar, phoneNumber }) {
    const existing = Player.findByTelegramId(telegramId);
    if (existing) return existing;
    return Player.create({ telegramId, username, firstname, avatar, phoneNumber });
  },

  setPhoneNumber(id, phoneNumber) {
    db.prepare('UPDATE players SET phone_number = ? WHERE id = ?').run(phoneNumber, id);
    return Player.findById(id);
  },

  updateBalance(id, newBalance) {
    db.prepare('UPDATE players SET balance = ? WHERE id = ?').run(newBalance, id);
    return Player.findById(id);
  },

  recordResult(id, won) {
    if (won) {
      db.prepare('UPDATE players SET wins = wins + 1 WHERE id = ?').run(id);
    } else {
      db.prepare('UPDATE players SET losses = losses + 1 WHERE id = ?').run(id);
    }
  },

  /** Admin: list/search players by username, first name, or telegram id. */
  search({ query, limit = 50, offset = 0 } = {}) {
    if (query) {
      const like = `%${query}%`;
      return db
        .prepare(
          `SELECT * FROM players
           WHERE username LIKE ? OR firstname LIKE ? OR telegram_id LIKE ?
           ORDER BY created_at DESC LIMIT ? OFFSET ?`
        )
        .all(like, like, like, limit, offset);
    }
    return db.prepare('SELECT * FROM players ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
  },

  setStatus(id, status) {
    db.prepare('UPDATE players SET status = ? WHERE id = ?').run(status, id);
    return Player.findById(id);
  },

  count() {
    return db.prepare('SELECT COUNT(*) as c FROM players').get().c;
  },
};

module.exports = Player;
