const db = require('../database/db');

const Room = {
  create({ entryFee, maxPlayers = 20, gameSpeedMs = 5000, autoStart = 1 }) {
    const stmt = db.prepare(`
      INSERT INTO rooms (entry_fee, max_players, game_speed_ms, auto_start)
      VALUES (?, ?, ?, ?)
    `);
    const info = stmt.run(entryFee, maxPlayers, gameSpeedMs, autoStart ? 1 : 0);
    return Room.findById(info.lastInsertRowid);
  },

  findById(id) {
    return db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
  },

  listOpen() {
    return db
      .prepare("SELECT * FROM rooms WHERE status IN ('WAITING','STARTING') ORDER BY created_at DESC")
      .all();
  },

  listAll(limit = 100) {
    return db.prepare('SELECT * FROM rooms ORDER BY created_at DESC LIMIT ?').all(limit);
  },

  /** Admin-only: update editable settings. Caller must ensure the room is safe to edit (e.g. WAITING). */
  update(id, { entryFee, maxPlayers, gameSpeedMs, autoStart }) {
    const current = Room.findById(id);
    if (!current) return null;
    db.prepare(
      `UPDATE rooms SET entry_fee = ?, max_players = ?, game_speed_ms = ?, auto_start = ? WHERE id = ?`
    ).run(
      entryFee ?? current.entry_fee,
      maxPlayers ?? current.max_players,
      gameSpeedMs ?? current.game_speed_ms,
      autoStart === undefined ? current.auto_start : autoStart ? 1 : 0,
      id
    );
    return Room.findById(id);
  },

  updateStatus(id, status) {
    db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run(status, id);
  },

  incrementPlayers(id, delta) {
    db.prepare('UPDATE rooms SET current_players = current_players + ? WHERE id = ?').run(delta, id);
  },

  addToPrizePool(id, amount) {
    db.prepare('UPDATE rooms SET prize_pool = prize_pool + ? WHERE id = ?').run(amount, id);
  },

  setCalledNumbers(id, numbersArray) {
    db.prepare('UPDATE rooms SET called_numbers = ?, current_number = ? WHERE id = ?').run(
      JSON.stringify(numbersArray),
      numbersArray[numbersArray.length - 1] ?? null,
      id
    );
  },

  setWinner(id, playerId) {
    db.prepare('UPDATE rooms SET winner_player_id = ? WHERE id = ?').run(playerId, id);
  },

  reset(id) {
    db.prepare(`
      UPDATE rooms
      SET status = 'WAITING', current_players = 0, prize_pool = 0,
          called_numbers = '[]', current_number = NULL, winner_player_id = NULL
      WHERE id = ?
    `).run(id);
  },
};

module.exports = Room;
