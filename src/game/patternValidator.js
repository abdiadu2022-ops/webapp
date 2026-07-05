const { COLUMN_ORDER } = require('./cardGenerator');

/**
 * Builds a 5x5 boolean matrix (row-major) indicating which cells are marked.
 * card: { B:[..], I:[..], N:[..,'FREE',..], G:[..], O:[..] } (column-major)
 * marked: array of numbers (+ 'FREE') the player has marked
 */
function buildMarkedMatrix(card, marked) {
  const markedSet = new Set(marked);
  const matrix = [];
  for (let row = 0; row < 5; row++) {
    const rowVals = [];
    for (let col = 0; col < 5; col++) {
      const letter = COLUMN_ORDER[col];
      const value = card[letter][row];
      rowVals.push(value === 'FREE' ? true : markedSet.has(value));
    }
    matrix.push(rowVals);
  }
  return matrix;
}

const PATTERNS = {
  line(matrix) {
    // any full row
    for (let r = 0; r < 5; r++) {
      if (matrix[r].every(Boolean)) return true;
    }
    // any full column
    for (let c = 0; c < 5; c++) {
      if (matrix.every((row) => row[c])) return true;
    }
    return false;
  },
  diagonal(matrix) {
    const d1 = [0, 1, 2, 3, 4].every((i) => matrix[i][i]);
    const d2 = [0, 1, 2, 3, 4].every((i) => matrix[i][4 - i]);
    return d1 || d2;
  },
  four_corners(matrix) {
    return matrix[0][0] && matrix[0][4] && matrix[4][0] && matrix[4][4];
  },
  full_house(matrix) {
    return matrix.every((row) => row.every(Boolean));
  },
};

/**
 * Checks the card against all supported patterns.
 * Returns the first matching pattern name, or null.
 */
function findWinningPattern(card, marked) {
  const matrix = buildMarkedMatrix(card, marked);
  for (const [name, check] of Object.entries(PATTERNS)) {
    if (check(matrix)) return name;
  }
  return null;
}

module.exports = { findWinningPattern, buildMarkedMatrix, PATTERNS };
