const { generateCard } = require('./cardGenerator');

const POOL_SIZE = 100;

/**
 * A fixed pool of numbered cartelas (1..POOL_SIZE), generated once when the
 * server starts. Players pick by number (like "Cartela No: 197") rather than
 * being dealt random options — the same number always maps to the same card
 * for the lifetime of the process, which is what lets regulars recognize and
 * prefer specific numbers, matching the reference UI.
 */
const pool = new Map();
for (let id = 1; id <= POOL_SIZE; id++) {
  pool.set(id, generateCard());
}

function getCartela(id) {
  return pool.get(id) || null;
}

function listIds() {
  return [...pool.keys()];
}

module.exports = { getCartela, listIds, POOL_SIZE };
