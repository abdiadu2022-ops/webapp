const { walletService } = require('../services/walletService');
const withdrawalService = require('../services/withdrawalService');
const Transaction = require('../models/Transaction');
const WithdrawalRequest = require('../models/WithdrawalRequest');

async function getBalance(req, res, next) {
  try {
    res.json({ balance: walletService.getBalance(req.playerId) });
  } catch (err) {
    next(err);
  }
}

async function deposit(req, res, next) {
  try {
    const { amount } = req.body;
    // NOTE: In production, this must be triggered by a verified payment provider
    // webhook (Telegram Payments, card processor, crypto, etc.) — never trust a
    // client-supplied deposit amount directly without payment verification.
    const tx = walletService.deposit(req.playerId, amount, { source: 'manual' });
    res.json({ transaction: tx, balance: tx.balance_after });
  } catch (err) {
    next(err);
  }
}

/**
 * Player requests a withdrawal. Unlike deposit, this never credits/debits
 * instantly for real — funds are held pending admin approval (see
 * withdrawalService). The player gets a PENDING request back, not a
 * completed transaction.
 */
async function requestWithdrawal(req, res, next) {
  try {
    const { amount } = req.body;
    const request = withdrawalService.requestWithdrawal(req.playerId, amount);
    res.status(201).json({
      request,
      balance: walletService.getBalance(req.playerId),
    });
  } catch (err) {
    next(err);
  }
}

async function listMyWithdrawals(req, res, next) {
  try {
    res.json({ requests: WithdrawalRequest.listForPlayer(req.playerId) });
  } catch (err) {
    next(err);
  }
}

async function history(req, res, next) {
  try {
    res.json({ transactions: Transaction.listForPlayer(req.playerId) });
  } catch (err) {
    next(err);
  }
}

module.exports = { getBalance, deposit, requestWithdrawal, listMyWithdrawals, history };
