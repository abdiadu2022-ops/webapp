class RoomTimer {
  constructor() {
    this._interval = null;
    this._timeout = null;
  }

  startInterval(fn, ms) {
    this.clear();
    this._interval = setInterval(fn, ms);
  }

  startTimeout(fn, ms) {
    this.clearTimeout();
    this._timeout = setTimeout(fn, ms);
  }

  clearInterval() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  clearTimeout() {
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
  }

  clear() {
    this.clearInterval();
    this.clearTimeout();
  }
}

module.exports = RoomTimer;
