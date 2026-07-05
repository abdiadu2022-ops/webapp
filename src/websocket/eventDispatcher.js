const roomManager = require('../game/roomManager');

/** Wraps handlers so socket errors are sent back as `error` events instead of crashing. */
function safe(handler) {
  return async (socket, payload, callback) => {
    try {
      const result = await handler(socket, payload);
      if (typeof callback === 'function') callback({ ok: true, ...result });
    } catch (err) {
      const message = err.message || 'Unexpected error';
      socket.emit('error', { message });
      if (typeof callback === 'function') {
        callback({ ok: false, error: message, code: err.code || null });
      }
    }
  };
}

function registerEvents(io, socket, gameEngine) {
  // Returns all cartela numbers plus which are already taken in this room.
  socket.on(
    'list_cartelas',
    safe(async (s, { roomId }) => {
      return gameEngine.listCartelas({ roomId });
    })
  );

  // Preview a specific cartela's grid before committing (no charge yet).
  socket.on(
    'preview_cartela',
    safe(async (s, { roomId, cartelaId }) => {
      return gameEngine.previewCartela({ roomId, cartelaId });
    })
  );

  // Confirm a cartela — charges the entry fee and joins the room. If the
  // player's balance is too low the callback comes back with
  // { ok: false, code: 'insufficient_balance' } so the client can offer
  // watch-only instead.
  socket.on(
    'select_cartela',
    safe(async (s, { roomId, cartelaId }) => {
      const { room, card } = gameEngine.selectCartela({
        socket: s,
        roomId,
        playerId: s.playerId,
        cartelaId,
      });
      return { room, card };
    })
  );

  // Join as a spectator: no card, no charge, receives all room broadcasts.
  socket.on(
    'watch_room',
    safe(async (s, { roomId }) => {
      return gameEngine.watchRoom({ socket: s, roomId });
    })
  );

  socket.on(
    'leave_room',
    safe(async (s, { roomId }) => {
      gameEngine.leaveRoom({ socket: s, roomId });
      return {};
    })
  );

  socket.on(
    'mark_number',
    safe(async (s, { roomId, number }) => {
      const card = gameEngine.markNumber({ roomId, playerId: s.playerId, number });
      return { card };
    })
  );

  socket.on(
    'claim_bingo',
    safe(async (s, { roomId }) => {
      const result = gameEngine.claimBingo({ roomId, playerId: s.playerId });
      return result;
    })
  );

  socket.on('disconnect', () => {
    for (const [roomId, session] of roomManager.sessions.entries()) {
      if (session.sockets.has(socket.id)) {
        roomManager.removeSocket(roomId, socket.id);
      }
    }
  });
}

module.exports = { registerEvents };
