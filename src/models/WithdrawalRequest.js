const db = require('../database/db');

const WithdrawalRequest = {
  create({ playerId, amount }) {
    const stmt = db.prepare(`
      INSERT INTO withdrawal_requests (player_id, amount, status)
      VALUES (?, ?, 'PENDING')
    `);
    const info = stmt.run(playerId, amount);
    return WithdrawalRequest.findById(info.lastInsertRowid);
  },

  findById(id) {
    return db.prepare('SELECT * FROM withdrawal_requests WHERE id = ?').get(id);
  },

  listForPlayer(playerId, limit = 50) {
    return db
      .prepare('SELECT * FROM withdrawal_requests WHERE player_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(playerId, limit);
  },

  /** Admin: list requests, optionally filtered by status (defaults to PENDING). */
  list({ status = 'PENDING', limit = 100 } = {}) {
    if (status === 'ALL') {
      return db
        .prepare(
          `SELECT w.*, p.username, p.firstname FROM withdrawal_requests w
           JOIN players p ON p.id = w.player_id
           ORDER BY w.created_at DESC LIMIT ?`
        )
        .all(limit);
    }
    return db
      .prepare(
        `SELECT w.*, p.username, p.firstname FROM withdrawal_requests w
         JOIN players p ON p.id = w.player_id
         WHERE w.status = ? ORDER BY w.created_at ASC LIMIT ?`
      )
      .all(status, limit);
  },

  resolve(id, { status, reason = null, resolvedBy }) {
    db.prepare(
      `UPDATE withdrawal_requests
       SET status = ?, reason = ?, resolved_by = ?, resolved_at = datetime('now')
       WHERE id = ?`
    ).run(status, reason, resolvedBy, id);
    return WithdrawalRequest.findById(id);
  },
};

module.exports = WithdrawalRequest;
