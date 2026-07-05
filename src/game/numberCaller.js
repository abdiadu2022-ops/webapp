const { generateSequence } = require('./numberGenerator');
const RoomTimer = require('./timer');

/**
 * Encapsulates one room's number-calling session.
 * The full sequence is generated up front (server-side) so it can't be
 * predicted or influenced by clients; numbers are revealed one at a time.
 */
class NumberCaller {
  constructor({ speedMs, onNumber, onComplete }) {
    this.sequence = generateSequence();
    this.index = -1;
    this.speedMs = speedMs;
    this.onNumber = onNumber;
    this.onComplete = onComplete;
    this.timer = new RoomTimer();
    this.calledSoFar = [];
  }

  start() {
    this.timer.startInterval(() => this._tick(), this.speedMs);
  }

  _tick() {
    this.index += 1;
    if (this.index >= this.sequence.length) {
      this.timer.clear();
      this.onComplete?.(this.calledSoFar);
      return;
    }
    const number = this.sequence[this.index];
    this.calledSoFar.push(number);
    this.onNumber?.(number, this.calledSoFar);
  }

  stop() {
    this.timer.clear();
  }
}

module.exports = NumberCaller;
