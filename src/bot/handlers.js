const config = require('../config');
const Player = require('../models/Player');
const { walletService } = require('../services/walletService');

const contactRequestKeyboard = {
  reply_markup: {
    keyboard: [[{ text: '📱 Share my phone number', request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  },
};

function mainMenuKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '▶️ Play Bingo', web_app: { url: config.webappUrl } }],
        [{ text: '💰 Check balance', callback_data: 'check_balance' }],
      ],
    },
  };
}

/**
 * Registers every conversation handler on a TelegramBot instance. Works the
 * same whether that instance receives updates via polling or via a webhook —
 * node-telegram-bot-api emits these same events either way, so this file
 * doesn't need to know which transport is in use.
 */
function registerHandlers(bot) {
  async function sendMainMenu(chatId, player) {
    const name = player.firstname || player.username || 'there';
    await bot.sendMessage(chatId, `Welcome back, ${name}! What would you like to do?`, mainMenuKeyboard());
  }

  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      const player = Player.findOrCreate({
        telegramId: msg.from.id,
        username: msg.from.username,
        firstname: msg.from.first_name,
      });

      if (!player.phone_number) {
        await bot.sendMessage(
          chatId,
          "Welcome to Bingo! 🎱\n\nBefore we start, please share your phone number — it's used to verify deposits and withdrawals.",
          contactRequestKeyboard
        );
        return;
      }

      await sendMainMenu(chatId, player);
    } catch (err) {
      console.error('Error handling /start:', err);
      await bot.sendMessage(chatId, 'Something went wrong starting up — please try /start again.');
    }
  });

  // Fires when the player taps the "Share my phone number" button.
  bot.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    try {
      // Only accept the sender's own contact card — never a contact forwarded from someone else.
      if (msg.contact.user_id !== msg.from.id) {
        await bot.sendMessage(chatId, 'Please share your own phone number using the button below.', contactRequestKeyboard);
        return;
      }

      const player = Player.findOrCreate({
        telegramId: msg.from.id,
        username: msg.from.username,
        firstname: msg.from.first_name,
      });
      const updated = Player.setPhoneNumber(player.id, msg.contact.phone_number);

      await bot.sendMessage(chatId, '✅ Phone number saved. Thanks!', { reply_markup: { remove_keyboard: true } });
      await sendMainMenu(chatId, updated);
    } catch (err) {
      console.error('Error handling contact share:', err);
      await bot.sendMessage(chatId, 'Something went wrong saving your number — please try /start again.');
    }
  });

  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    try {
      if (query.data === 'check_balance') {
        const player = Player.findOrCreate({
          telegramId: query.from.id,
          username: query.from.username,
          firstname: query.from.first_name,
        });
        const balance = walletService.getBalance(player.id);
        await bot.answerCallbackQuery(query.id);
        await bot.sendMessage(chatId, `💰 Your balance: ${balance} ETB`);
      }
    } catch (err) {
      console.error('Error handling callback query:', err);
      await bot.answerCallbackQuery(query.id, { text: 'Something went wrong.' });
    }
  });
}

module.exports = { registerHandlers };
