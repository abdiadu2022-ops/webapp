const { loginWithTelegram } = require('../services/authService');

async function telegramLogin(req, res, next) {
  try {
    const { initData } = req.body;
    const { player, token } = loginWithTelegram(initData);
    res.json({
      token,
      player: {
        id: player.id,
        username: player.username,
        firstname: player.firstname,
        avatar: player.avatar,
        balance: player.balance,
        wins: player.wins,
        losses: player.losses,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { telegramLogin };
