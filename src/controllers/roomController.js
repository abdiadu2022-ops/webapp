const Room = require('../models/Room');
const Card = require('../models/Card');

async function listRooms(req, res, next) {
  try {
    res.json({ rooms: Room.listOpen() });
  } catch (err) {
    next(err);
  }
}

async function getRoom(req, res, next) {
  try {
    const room = Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ room });
  } catch (err) {
    next(err);
  }
}

async function getMyCard(req, res, next) {
  try {
    const card = Card.findByRoomAndPlayer(req.params.id, req.playerId);
    if (!card) return res.status(404).json({ error: 'No card in this room' });
    res.json({ card });
  } catch (err) {
    next(err);
  }
}

module.exports = { listRooms, getRoom, getMyCard };
