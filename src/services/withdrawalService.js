const db = require('../database/db');
const Player = require('../models/Player');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const { walletService, InsufficientFundsError } = require('./walletService');

const withdrawalService = {
  /**
   * Player requests a withdrawal. Funds are held immediately (deducted from the
   * spendable balance) so the same money can't be wagered while the request is
   * pending — this mirrors the "Check balance -> create PENDING request" step
   * in the architecture diagram; the hold is what "Restore Status" reverses on
   * rejection.
   */
  requestWithdrawal(playerId, amount) {
    if (!amount || amount <= 0) {
      throw Object.assign(new Error('Withdrawal amount must be a positive integer'), { status: 400 });
    }

    const run = db.transaction(() => {
      // withdraw() throws InsufficientFundsError if balance < amount — that
      // check and the hold happen atomically in the same DB transaction.
      walletService.withdraw(playerId, amount, { reason: 'withdrawal_request_hold' });
      return WithdrawalRequest.create({ playerId, amount });
    });

    try {
      return run();
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        throw Object.assign(new Error('Insufficient balance for this withdrawal'), { status: 400 });
      }
      throw err;
    }
  },

  /** Admin approves: funds were already held at request time, so this just finalizes the status. */
  approve(requestId, adminUsername) {
    const request = WithdrawalRequest.findById(requestId);
    if (!request) throw Object.assign(new Error('Withdrawal request not found'), { status: 404 });
    if (request.status !== 'PENDING') {
      throw Object.assign(new Error('Request has already been resolved'), { status: 400 });
    }
    return WithdrawalRequest.resolve(requestId, { status: 'APPROVED', resolvedBy: adminUsername });
  },

  /** Admin rejects: releases the held funds back to the player's spendable balance. */
  reject(requestId, adminUsername, reason) {
    const request = WithdrawalRequest.findById(requestId);
    if (!request) throw Object.assign(new Error('Withdrawal request not found'), { status: 404 });
    if (request.status !== 'PENDING') {
      throw Object.assign(new Error('Request has already been resolved'), { status: 400 });
    }

    const run = db.transaction(() => {
      walletService.withdrawalReversal(request.player_id, request.amount, {
        withdrawalRequestId: requestId,
        reason: reason || 'withdrawal_rejected',
      });
      return WithdrawalRequest.resolve(requestId, {
        status: 'REJECTED',
        reason: reason || 'Rejected by admin',
        resolvedBy: adminUsername,
      });
    });

    return run();
  },
};

module.exports = withdrawalService;
