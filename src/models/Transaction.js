const db = require('../database/db');

const Transaction = {
  record({ playerId, type, amount, balanceBefore, balanceAfter, meta }) {
    const stmt = db.prepare(`
      INSERT INTO transactions (player_id, type, amount, balance_before, balance_after, meta)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      playerId,
      type,
      amount,
      balanceBefore,
      balanceAfter,
      meta ? JSON.stringify(meta) : null
    );
    return db.prepare('SELECT * FROM transactions WHERE id = ?').get(info.lastInsertRowid);
  },

  listForPlayer(playerId, limit = 50) {
    return db
      .prepare('SELECT * FROM transactions WHERE player_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(playerId, limit);
  },

  /** Admin: totals by transaction type, e.g. { deposit: 50000, withdraw: -12000, bet: -8000, payout: 7200, bonus: 500 }. */
  totalsByType() {
    const rows = db.prepare('SELECT type, SUM(amount) as total FROM transactions GROUP BY type').all();
    const totals = {};
    for (const row of rows) totals[row.type] = row.total;
    return totals;
  },
};

module.exports = Transaction;
