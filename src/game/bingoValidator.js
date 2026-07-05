const { findWinningPattern } = require('./patternValidator');

/**
 * Server-authoritative validation of a BINGO claim.
 * - The player's marked numbers must all have actually been called by the server.
 * - The marked numbers must form a valid winning pattern on their (server-stored) card.
 *
 * @param {object} card - hydrated Card model instance ({ grid, marked, ... })
 * @param {number[]} calledNumbers - authoritative list of numbers called so far in the room
 * @returns {{ won: boolean, pattern: string|null, reason?: string }}
 */
function validateClaim(card, calledNumbers) {
  if (!card) return { won: false, pattern: null, reason: 'no_card' };

  const calledSet = new Set(calledNumbers);
  const claimedNumbers = card.marked.filter((v) => v !== 'FREE');

  // Reject if the player marked any number the server never called (anti-cheat).
  const hasPhantomMark = claimedNumbers.some((n) => !calledSet.has(n));
  if (hasPhantomMark) {
    return { won: false, pattern: null, reason: 'invalid_mark_not_called' };
  }

  const pattern = findWinningPattern(card.grid, card.marked);
  if (!pattern) {
    return { won: false, pattern: null, reason: 'no_winning_pattern' };
  }

  return { won: true, pattern };
}

module.exports = { validateClaim };
