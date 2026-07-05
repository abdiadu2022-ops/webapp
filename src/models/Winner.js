const db = require('../database/db');

const Winner = {
  record({ roomId, playerId, amount, commission = 0, pattern, numbersCalled }) {
    const stmt = db.prepare(`
      INSERT INTO winners (room_id, player_id, amount, commission, pattern, numbers_called)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(roomId, playerId, amount, commission, pattern, JSON.stringify(numbersCalled));
    return db.prepare('SELECT * FROM winners WHERE id = ?').get(info.lastInsertRowid);
  },

  listForRoom(roomId) {
    return db.prepare('SELECT * FROM winners WHERE room_id = ?').all(roomId);
  },

  leaderboard(limit = 20) {
    return db
      .prepare(
        `SELECT p.username, p.firstname, COUNT(w.id) as wins, SUM(w.amount) as total_won
         FROM winners w JOIN players p ON p.id = w.player_id
         GROUP BY w.player_id ORDER BY total_won DESC LIMIT ?`
      )
      .all(limit);
  },

  /** Admin: total commission earned + rounds completed. */
  summary() {
    const row = db
      .prepare('SELECT COALESCE(SUM(commission),0) as totalCommission, COUNT(*) as roundsCompleted FROM winners')
      .get();
    return row;
  },

  recent(limit = 20) {
    return db
      .prepare(
        `SELECT w.*, p.username, p.firstname FROM winners w
         JOIN players p ON p.id = w.player_id
         ORDER BY w.created_at DESC LIMIT ?`
      )
      .all(limit);
  },
};

module.exports = Winner;
