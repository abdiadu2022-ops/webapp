const db = require('../database/db');
const Player = require('../models/Player');
const Transaction = require('../models/Transaction');

class InsufficientFundsError extends Error {
  constructor() {
    super('Insufficient balance');
    this.status = 400;
  }
}

const walletService = {
  getBalance(playerId) {
    const player = Player.findById(playerId);
    return player ? player.balance : 0;
  },

  /**
   * Generic ledger-safe balance mutation. Wrapped in a DB transaction so
   * balance + ledger row are always consistent.
   */
  applyTransaction({ playerId, type, amount, meta }) {
    const run = db.transaction(() => {
      const player = Player.findById(playerId);
      if (!player) throw Object.assign(new Error('Player not found'), { status: 404 });

      const balanceBefore = player.balance;
      const balanceAfter = balanceBefore + amount;

      if (balanceAfter < 0) throw new InsufficientFundsError();

      Player.updateBalance(playerId, balanceAfter);
      return Transaction.record({ playerId, type, amount, balanceBefore, balanceAfter, meta });
    });

    return run();
  },

  deposit(playerId, amount, meta) {
    if (amount <= 0) throw Object.assign(new Error('Deposit amount must be positive'), { status: 400 });
    return walletService.applyTransaction({ playerId, type: 'deposit', amount, meta });
  },

  withdraw(playerId, amount, meta) {
    if (amount <= 0) throw Object.assign(new Error('Withdraw amount must be positive'), { status: 400 });
    return walletService.applyTransaction({ playerId, type: 'withdraw', amount: -amount, meta });
  },

  /** Credits back a held withdrawal amount when an admin rejects the request. */
  withdrawalReversal(playerId, amount, meta) {
    if (amount <= 0) throw Object.assign(new Error('Reversal amount must be positive'), { status: 400 });
    return walletService.applyTransaction({ playerId, type: 'withdraw_reversal', amount, meta });
  },

  placeBet(playerId, amount, meta) {
    return walletService.applyTransaction({ playerId, type: 'bet', amount: -amount, meta });
  },

  payout(playerId, amount, meta) {
    return walletService.applyTransaction({ playerId, type: 'payout', amount, meta });
  },

  bonus(playerId, amount, meta) {
    return walletService.applyTransaction({ playerId, type: 'bonus', amount, meta });
  },

  refund(playerId, amount, meta) {
    return walletService.applyTransaction({ playerId, type: 'refund', amount, meta });
  },

  /** Admin-only manual balance correction; amount may be positive or negative. */
  adminAdjust(playerId, amount, meta) {
    if (amount === 0) throw Object.assign(new Error('Adjustment amount cannot be zero'), { status: 400 });
    return walletService.applyTransaction({ playerId, type: 'admin_adjustment', amount, meta });
  },

  /**
   * Credits a verified amount to a player's wallet — meant for the receipt-verified
   * Telegram deposit flow (called once all four verification checks pass).
   */
  addAmount(playerId, amount, meta) {
    if (amount <= 0) throw Object.assign(new Error('Amount must be positive'), { status: 400 });
    return walletService.applyTransaction({ playerId, type: 'deposit', amount, meta });
  },
};

module.exports = { walletService, InsufficientFundsError };
