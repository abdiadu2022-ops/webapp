const { loginAdmin } = require('../services/authService');
const Room = require('../models/Room');
const Player = require('../models/Player');
const Card = require('../models/Card');
const Transaction = require('../models/Transaction');
const Winner = require('../models/Winner');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const { walletService } = require('../services/walletService');
const withdrawalService = require('../services/withdrawalService');
const engineRegistry = require('../game/engineRegistry');

/* ---------------------------- Auth ---------------------------- */

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const { token } = loginAdmin(username, password);
    res.json({ token });
  } catch (err) {
    next(err);
  }
}

/* ---------------------------- Rooms ---------------------------- */

async function listRooms(req, res, next) {
  try {
    res.json({ rooms: Room.listAll() });
  } catch (err) {
    next(err);
  }
}

async function createRoom(req, res, next) {
  try {
    const { entryFee, maxPlayers, gameSpeedMs, autoStart } = req.body;
    if (!entryFee || entryFee <= 0) {
      return res.status(400).json({ error: 'entryFee must be a positive integer' });
    }
    const room = Room.create({ entryFee, maxPlayers, gameSpeedMs, autoStart });
    res.status(201).json({ room });
  } catch (err) {
    next(err);
  }
}

async function updateRoom(req, res, next) {
  try {
    const room = Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.status !== 'WAITING') {
      return res.status(400).json({ error: 'Can only edit a room while it is WAITING' });
    }
    const { entryFee, maxPlayers, gameSpeedMs, autoStart } = req.body;
    const updated = Room.update(req.params.id, { entryFee, maxPlayers, gameSpeedMs, autoStart });
    res.json({ room: updated });
  } catch (err) {
    next(err);
  }
}

async function forceStartRoom(req, res, next) {
  try {
    const room = engineRegistry.getEngine().forceStart(Number(req.params.id));
    res.json({ room });
  } catch (err) {
    next(err);
  }
}

async function cancelRoom(req, res, next) {
  try {
    const result = engineRegistry.getEngine().cancelRoom(Number(req.params.id));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/* ---------------------------- Players ---------------------------- */

async function listPlayers(req, res, next) {
  try {
    const { search, limit, offset } = req.query;
    const players = Player.search({
      query: search,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    res.json({ players, total: Player.count() });
  } catch (err) {
    next(err);
  }
}

async function getPlayer(req, res, next) {
  try {
    const player = Player.findById(req.params.id);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json({
      player,
      transactions: Transaction.listForPlayer(player.id, 100),
    });
  } catch (err) {
    next(err);
  }
}

async function adjustBalance(req, res, next) {
  try {
    const { amount, reason } = req.body;
    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({ error: 'amount must be a non-zero number (positive credit or negative debit)' });
    }
    const tx = walletService.adminAdjust(req.params.id, amount, {
      reason: reason || 'manual_adjustment',
      admin: req.admin.username,
    });
    res.json({ transaction: tx, balance: tx.balance_after });
  } catch (err) {
    next(err);
  }
}

async function banPlayer(req, res, next) {
  try {
    const player = Player.setStatus(req.params.id, 'banned');
    res.json({ player });
  } catch (err) {
    next(err);
  }
}

async function unbanPlayer(req, res, next) {
  try {
    const player = Player.setStatus(req.params.id, 'active');
    res.json({ player });
  } catch (err) {
    next(err);
  }
}

/* ---------------------------- Withdrawals ---------------------------- */

async function listWithdrawals(req, res, next) {
  try {
    const status = req.query.status || 'PENDING';
    res.json({ requests: WithdrawalRequest.list({ status }) });
  } catch (err) {
    next(err);
  }
}

async function approveWithdrawal(req, res, next) {
  try {
    const request = withdrawalService.approve(Number(req.params.id), req.admin.username);
    res.json({ request });
  } catch (err) {
    next(err);
  }
}

async function rejectWithdrawal(req, res, next) {
  try {
    const { reason } = req.body;
    const request = withdrawalService.reject(Number(req.params.id), req.admin.username, reason);
    res.json({ request });
  } catch (err) {
    next(err);
  }
}

/* ---------------------------- Financials ---------------------------- */

async function financialSummary(req, res, next) {
  try {
    const totals = Transaction.totalsByType();
    const winnerSummary = Winner.summary();
    res.json({
      totals: {
        deposits: totals.deposit || 0,
        withdrawals: Math.abs(totals.withdraw || 0),
        withdrawalReversals: totals.withdraw_reversal || 0,
        bets: Math.abs(totals.bet || 0),
        payouts: totals.payout || 0,
        bonuses: totals.bonus || 0,
        refunds: totals.refund || 0,
        adminAdjustments: totals.admin_adjustment || 0,
      },
      commissionEarned: winnerSummary.totalCommission,
      roundsCompleted: winnerSummary.roundsCompleted,
      totalPlayers: Player.count(),
      pendingWithdrawals: WithdrawalRequest.list({ status: 'PENDING' }).length,
      recentWinners: Winner.recent(20),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  listRooms,
  createRoom,
  updateRoom,
  forceStartRoom,
  cancelRoom,
  listPlayers,
  getPlayer,
  adjustBalance,
  banPlayer,
  unbanPlayer,
  listWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  financialSummary,
};
