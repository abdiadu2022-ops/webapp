const config = require('../config');
const Room = require('../models/Room');
const Card = require('../models/Card');
const Player = require('../models/Player');
const roomManager = require('./roomManager');
const NumberCaller = require('./numberCaller');
const cartelaPool = require('./cartelaPool');
const { validateClaim } = require('./bingoValidator');
const { distribute } = require('./prizeDistributor');
const { walletService, InsufficientFundsError } = require('../services/walletService');

const COUNTDOWN_MS = 8000;

class GameEngine {
  constructor(io) {
    this.io = io;
  }

  roomChannel(roomId) {
    return `room:${roomId}`;
  }

  broadcast(roomId, event, payload) {
    this.io.to(this.roomChannel(roomId)).emit(event, payload);
  }

  /** Returns every cartela number plus which ones are already taken in this room. */
  listCartelas({ roomId }) {
    const room = Room.findById(roomId);
    if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });

    return {
      roomId,
      entryFee: room.entry_fee,
      ids: cartelaPool.listIds(),
      taken: roomManager.takenCartelas(roomId),
    };
  }

  /** Preview a specific cartela's grid before committing to it (no charge, no reservation). */
  previewCartela({ roomId, cartelaId }) {
    const grid = cartelaPool.getCartela(cartelaId);
    if (!grid) throw Object.assign(new Error('Invalid cartela number'), { status: 400 });
    return { cartelaId, grid, taken: roomManager.isCartelaTaken(roomId, cartelaId) };
  }

  /**
   * Confirms a numbered cartela: charges the entry fee, persists the card,
   * and joins the room channel. If the player's balance is too low, throws a
   * tagged error so the client can fall back to watchRoom() instead.
   */
  selectCartela({ socket, roomId, playerId, cartelaId }) {
    const room = Room.findById(roomId);
    if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });
    if (room.status !== 'WAITING' && room.status !== 'STARTING') {
      throw Object.assign(new Error('Room is not accepting players'), { status: 400 });
    }

    let card = Card.findByRoomAndPlayer(roomId, playerId);
    if (!card) {
      if (roomManager.isCartelaTaken(roomId, cartelaId)) {
        throw Object.assign(new Error('That cartela is already taken'), { status: 409 });
      }
      const grid = cartelaPool.getCartela(cartelaId);
      if (!grid) throw Object.assign(new Error('Invalid cartela number'), { status: 400 });

      try {
        walletService.placeBet(playerId, room.entry_fee, { roomId });
      } catch (err) {
        if (err instanceof InsufficientFundsError) {
          throw Object.assign(new Error('Insufficient balance'), {
            status: 402,
            code: 'insufficient_balance',
          });
        }
        throw err;
      }

      Room.addToPrizePool(roomId, room.entry_fee);
      Room.incrementPlayers(roomId, 1);

      card = Card.create({ roomId, playerId, cartelaId, grid });
      roomManager.takeCartela(roomId, cartelaId);
    }

    socket.join(this.roomChannel(roomId));
    roomManager.addSocket(roomId, socket.id);

    const updatedRoom = Room.findById(roomId);
    this.broadcast(roomId, 'room_update', this._publicRoom(updatedRoom));

    this._maybeAutoStart(updatedRoom);

    return { room: updatedRoom, card };
  }

  /**
   * Spectator mode: no card, no charge, no stake in the prize pool. Used when
   * a player's balance can't cover the entry fee (or they just want to watch).
   * They still receive every room broadcast (numbers called, winner, etc.)
   * but cannot mark numbers or claim bingo.
   */
  watchRoom({ socket, roomId }) {
    const room = Room.findById(roomId);
    if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });

    socket.join(this.roomChannel(roomId));
    roomManager.addSocket(roomId, socket.id);
    roomManager.addWatcher(roomId, socket.id);

    return { room: this._publicRoom(room) };
  }

  leaveRoom({ socket, roomId }) {
    socket.leave(this.roomChannel(roomId));
    roomManager.removeSocket(roomId, socket.id);
  }

  _maybeAutoStart(room) {
    if (!room.auto_start) return;
    if (room.status !== 'WAITING') return;
    if (room.current_players < 2) return; // need at least 2 players

    Room.updateStatus(room.id, 'STARTING');
    this.broadcast(room.id, 'countdown_started', { ms: COUNTDOWN_MS });

    const session = roomManager.ensureSession(room.id);
    session.countdown = setTimeout(() => this.startGame(room.id), COUNTDOWN_MS);
  }

  startGame(roomId) {
    const room = Room.findById(roomId);
    if (!room || room.status === 'PLAYING' || room.status === 'FINISHED') return;

    Room.updateStatus(roomId, 'PLAYING');
    this.broadcast(roomId, 'game_started', { roomId });

    const caller = new NumberCaller({
      speedMs: room.game_speed_ms || config.defaultGameSpeedMs,
      onNumber: (number, calledSoFar) => this._onNumberCalled(roomId, number, calledSoFar),
      onComplete: (calledSoFar) => this._onSequenceExhausted(roomId, calledSoFar),
    });
    roomManager.setCaller(roomId, caller);
    caller.start();
  }

  /** Admin: force a room to start immediately, bypassing the min-2-players wait. */
  forceStart(roomId) {
    const room = Room.findById(roomId);
    if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });
    if (room.status === 'PLAYING' || room.status === 'FINISHED') {
      throw Object.assign(new Error('Room is already playing or finished'), { status: 400 });
    }
    if (room.current_players < 1) {
      throw Object.assign(new Error('Room has no players'), { status: 400 });
    }

    const session = roomManager.getSession(roomId);
    if (session?.countdown) clearTimeout(session.countdown);

    this.startGame(roomId);
    return this._publicRoom(Room.findById(roomId));
  }

  /** Admin: cancel a round in progress (or waiting), refunding every paid player's entry fee. */
  cancelRoom(roomId) {
    const room = Room.findById(roomId);
    if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });
    if (room.status === 'FINISHED') {
      throw Object.assign(new Error('Room already finished'), { status: 400 });
    }

    const session = roomManager.getSession(roomId);
    session?.caller?.stop();
    if (session?.countdown) clearTimeout(session.countdown);

    const cards = Card.findAllByRoom(roomId);
    for (const card of cards) {
      walletService.refund(card.player_id, room.entry_fee, { roomId, reason: 'admin_cancel' });
    }

    Room.updateStatus(roomId, 'FINISHED');
    this.broadcast(roomId, 'game_voided', { reason: 'admin_cancelled', calledNumbers: JSON.parse(room.called_numbers || '[]') });

    roomManager.clearRoom(roomId);
    Room.reset(roomId);
    this.broadcast(roomId, 'room_update', this._publicRoom(Room.findById(roomId)));

    return { refundedPlayers: cards.length };
  }

  _onNumberCalled(roomId, number, calledSoFar) {
    Room.setCalledNumbers(roomId, calledSoFar);
    this.broadcast(roomId, 'number_called', { number, calledNumbers: calledSoFar });
  }

  _onSequenceExhausted(roomId, calledSoFar) {
    // No one claimed a valid bingo across all 75 numbers — void the round.
    Room.updateStatus(roomId, 'FINISHED');
    this.broadcast(roomId, 'game_voided', {
      reason: 'sequence_exhausted',
      calledNumbers: calledSoFar,
    });
    this._scheduleReset(roomId);
  }

  /** A player marks a number on their own card (client-side convenience; server re-validates on claim). */
  markNumber({ roomId, playerId, number }) {
    const card = Card.findByRoomAndPlayer(roomId, playerId);
    if (!card) throw Object.assign(new Error('No card for this room'), { status: 404 });

    const marked = new Set(card.marked);
    marked.add(number);
    Card.mark(card.id, [...marked]);
    return Card.findByRoomAndPlayer(roomId, playerId);
  }

  /** Server-authoritative BINGO claim. */
  claimBingo({ roomId, playerId }) {
    const room = Room.findById(roomId);
    if (!room || room.status !== 'PLAYING') {
      return { won: false, reason: 'room_not_playing' };
    }

    const card = Card.findByRoomAndPlayer(roomId, playerId);
    const calledNumbers = JSON.parse(room.called_numbers);
    const result = validateClaim(card, calledNumbers);

    if (!result.won) {
      this.broadcast(roomId, 'claim_rejected', { playerId, reason: result.reason });
      return result;
    }

    // Stop calling immediately — first valid claim wins.
    const session = roomManager.getSession(roomId);
    session?.caller?.stop();

    Card.setClaimed(card.id, 1);
    const player = Player.findById(playerId);
    const { payoutAmount, commission } = distribute({
      room,
      winnerPlayerId: playerId,
      pattern: result.pattern,
      calledNumbers,
    });

    this.broadcast(roomId, 'winner', {
      playerId,
      username: player.username || player.firstname,
      pattern: result.pattern,
      prize: payoutAmount,
      commission,
      cartelaId: card.cartela_id,
      grid: card.grid,
    });

    this._scheduleReset(roomId);
    return { won: true, pattern: result.pattern, prize: payoutAmount };
  }

  _scheduleReset(roomId) {
    setTimeout(() => {
      roomManager.clearRoom(roomId);
      Room.reset(roomId);
      this.broadcast(roomId, 'room_update', this._publicRoom(Room.findById(roomId)));
    }, 6000);
  }

  _publicRoom(room) {
    if (!room) return null;
    return {
      id: room.id,
      entryFee: room.entry_fee,
      maxPlayers: room.max_players,
      currentPlayers: room.current_players,
      status: room.status,
      prizePool: room.prize_pool,
      gameSpeedMs: room.game_speed_ms,
      currentNumber: room.current_number,
      calledNumbers: JSON.parse(room.called_numbers || '[]'),
    };
  }
}

module.exports = GameEngine;
