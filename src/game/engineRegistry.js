let engine = null;

function setEngine(gameEngine) {
  engine = gameEngine;
}

function getEngine() {
  if (!engine) {
    throw Object.assign(new Error('Game engine not initialized yet'), { status: 503 });
  }
  return engine;
}

module.exports = { setEngine, getEngine };
