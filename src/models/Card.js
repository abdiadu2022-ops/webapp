const db = require('../database/db');

const Card = {
  create({ roomId, playerId, cartelaId, grid }) {
    const stmt = db.prepare(`
      INSERT INTO cards (room_id, player_id, cartela_id, json_card, marked)
      VALUES (?, ?, ?, ?, '["FREE"]')
    `);
    const info = stmt.run(roomId, playerId, cartelaId ?? null, JSON.stringify(grid));
    return Card.findById(info.lastInsertRowid);
  },

  findById(id) {
    const row = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
    return Card.hydrate(row);
  },

  findByRoomAndPlayer(roomId, playerId) {
    const row = db
      .prepare('SELECT * FROM cards WHERE room_id = ? AND player_id = ?')
      .get(roomId, playerId);
    return Card.hydrate(row);
  },

  findAllByRoom(roomId) {
    const rows = db.prepare('SELECT * FROM cards WHERE room_id = ?').all(roomId);
    return rows.map(Card.hydrate);
  },

  hydrate(row) {
    if (!row) return null;
    return {
      ...row,
      grid: JSON.parse(row.json_card),
      marked: JSON.parse(row.marked),
    };
  },

  mark(id, markedArray) {
    db.prepare('UPDATE cards SET marked = ? WHERE id = ?').run(JSON.stringify(markedArray), id);
  },

  setClaimed(id, claimed = 1) {
    db.prepare('UPDATE cards SET claimed = ? WHERE id = ?').run(claimed, id);
  },
};

module.exports = Card;
