const config = require('../config');
const { shuffle } = require('./numberGenerator');

const COLUMN_ORDER = ['B', 'I', 'N', 'G', 'O'];

/**
 * Generates a random 5x5 Bingo card as a column-major grid:
 * { B: [n,n,n,n,n], I: [...], N: [...,'FREE',...], G: [...], O: [...] }
 */
function generateCard() {
  const card = {};

  for (const letter of COLUMN_ORDER) {
    const [min, max] = config.bingoColumns[letter];
    const range = [];
    for (let n = min; n <= max; n++) range.push(n);
    const picked = shuffle(range).slice(0, 5);
    card[letter] = picked;
  }

  // Center of N column is FREE
  card.N[2] = 'FREE';

  return card;
}

/** Flattens a card grid into a simple array of all playable numbers (excludes FREE). */
function flattenCard(card) {
  return COLUMN_ORDER.flatMap((letter) => card[letter]).filter((v) => v !== 'FREE');
}

module.exports = { generateCard, flattenCard, COLUMN_ORDER };
