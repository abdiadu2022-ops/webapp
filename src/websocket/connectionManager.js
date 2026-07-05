const { verifyToken } = require('../services/authService');

/** Socket.IO middleware: requires a valid JWT in the handshake auth payload. */
function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Authentication required'));

  const payload = verifyToken(token);
  if (!payload) return next(new Error('Invalid or expired token'));

  socket.playerId = payload.playerId;
  socket.telegramId = payload.telegramId;
  next();
}

module.exports = { socketAuthMiddleware };
