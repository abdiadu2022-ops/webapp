/**
 * In-memory registry of "live" room sessions (NumberCaller instances, countdown
 * timers, connected socket ids). SQLite remains the source of truth for
 * balances/cards/results; this just tracks ephemeral runtime state.
 */
class RoomManager {
  constructor() {
    /** @type {Map<number, { caller: import('./numberCaller'), sockets: Set<string>, countdown: NodeJS.Timeout|null }>} */
    this.sessions = new Map();
  }

  getSession(roomId) {
    return this.sessions.get(roomId);
  }

  ensureSession(roomId) {
    if (!this.sessions.has(roomId)) {
      this.sessions.set(roomId, {
        caller: null,
        sockets: new Set(),
        watcherSockets: new Set(),
        takenCartelas: new Set(),
        countdown: null,
      });
    }
    return this.sessions.get(roomId);
  }

  addWatcher(roomId, socketId) {
    this.ensureSession(roomId).watcherSockets.add(socketId);
  }

  removeWatcher(roomId, socketId) {
    const session = this.getSession(roomId);
    if (session) session.watcherSockets.delete(socketId);
  }

  takeCartela(roomId, cartelaId) {
    this.ensureSession(roomId).takenCartelas.add(cartelaId);
  }

  isCartelaTaken(roomId, cartelaId) {
    return this.getSession(roomId)?.takenCartelas.has(cartelaId) ?? false;
  }

  takenCartelas(roomId) {
    return [...(this.getSession(roomId)?.takenCartelas ?? [])];
  }

  addSocket(roomId, socketId) {
    this.ensureSession(roomId).sockets.add(socketId);
  }

  removeSocket(roomId, socketId) {
    const session = this.getSession(roomId);
    if (session) {
      session.sockets.delete(socketId);
      session.watcherSockets.delete(socketId);
    }
  }

  playerCount(roomId) {
    return this.getSession(roomId)?.sockets.size ?? 0;
  }

  setCaller(roomId, caller) {
    this.ensureSession(roomId).caller = caller;
  }

  clearRoom(roomId) {
    const session = this.getSession(roomId);
    if (session) {
      session.caller?.stop();
      if (session.countdown) clearTimeout(session.countdown);
    }
    this.sessions.delete(roomId);
  }
}

module.exports = new RoomManager();
