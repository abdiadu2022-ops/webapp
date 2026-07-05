/** Fisher-Yates shuffle, returns a new array. */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Generates one randomized, non-repeating sequence of numbers 1-75 for a game. */
function generateSequence() {
  const numbers = [...Array(75).keys()].map((n) => n + 1);
  return shuffle(numbers);
}

module.exports = { generateSequence, shuffle };
