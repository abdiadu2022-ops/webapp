const config = require('../config');
const { walletService } = require('../services/walletService');
const Player = require('../models/Player');
const Winner = require('../models/Winner');
const Room = require('../models/Room');

/**
 * Pays out the prize pool to the winner, minus house commission, and records everything.
 */
function distribute({ room, winnerPlayerId, pattern, calledNumbers }) {
  const commission = Math.floor((room.prize_pool * config.houseCommissionPercent) / 100);
  const payoutAmount = room.prize_pool - commission;

  walletService.payout(winnerPlayerId, payoutAmount, { roomId: room.id, pattern });
  Player.recordResult(winnerPlayerId, true);

  Winner.record({
    roomId: room.id,
    playerId: winnerPlayerId,
    amount: payoutAmount,
    commission,
    pattern,
    numbersCalled: calledNumbers,
  });

  Room.setWinner(room.id, winnerPlayerId);
  Room.updateStatus(room.id, 'FINISHED');

  return { payoutAmount, commission };
}

module.exports = { distribute };
