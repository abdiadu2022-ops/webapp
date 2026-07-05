const { verifyToken } = require('../services/authService');

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }

  req.admin = { username: payload.username };
  next();
}

module.exports = { requireAdmin };
