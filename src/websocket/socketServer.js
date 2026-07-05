const { Server } = require('socket.io');
const { socketAuthMiddleware } = require('./connectionManager');
const { registerEvents } = require('./eventDispatcher');
const GameEngine = require('../game/gameEngine');
const engineRegistry = require('../game/engineRegistry');

function initSocketServer(httpServer, corsOrigin) {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin || '*' },
  });

  const gameEngine = new GameEngine(io);
  engineRegistry.setEngine(gameEngine);

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    registerEvents(io, socket, gameEngine);
  });

  return { io, gameEngine };
}

module.exports = { initSocketServer };
