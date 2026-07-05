-- Players
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT UNIQUE NOT NULL,
  username TEXT,
  firstname TEXT,
  avatar TEXT,
  phone_number TEXT,
  balance INTEGER NOT NULL DEFAULT 0,       -- stored in cents/smallest unit
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',    -- active | banned
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_fee INTEGER NOT NULL,
  max_players INTEGER NOT NULL DEFAULT 20,
  current_players INTEGER NOT NULL DEFAULT 0,
  game_speed_ms INTEGER NOT NULL DEFAULT 5000,
  status TEXT NOT NULL DEFAULT 'WAITING',   -- WAITING|STARTING|PLAYING|VERIFYING|FINISHED
  prize_pool INTEGER NOT NULL DEFAULT 0,
  called_numbers TEXT NOT NULL DEFAULT '[]', -- JSON array
  current_number INTEGER,
  winner_player_id INTEGER,
  auto_start INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (winner_player_id) REFERENCES players(id)
);

-- Cards
CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  cartela_id INTEGER,        -- which numbered cartela (1..N) this card corresponds to
  json_card TEXT NOT NULL,   -- 5x5 grid JSON, FREE center
  marked TEXT NOT NULL DEFAULT '[]', -- JSON array of marked numbers
  claimed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

-- Bets
CREATE TABLE IF NOT EXISTS bets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

-- Winners
CREATE TABLE IF NOT EXISTS winners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  commission INTEGER NOT NULL DEFAULT 0,
  pattern TEXT NOT NULL,
  numbers_called TEXT NOT NULL, -- JSON array snapshot
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

-- Transactions (wallet ledger)
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  type TEXT NOT NULL,          -- deposit|withdraw|bet|payout|bonus|commission
  amount INTEGER NOT NULL,     -- positive or negative
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  meta TEXT,                   -- JSON, e.g. { roomId }
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

-- Withdrawal requests (player-initiated, admin-approved)
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | APPROVED | REJECTED
  reason TEXT,                            -- set on rejection
  resolved_by TEXT,                       -- admin username who resolved it
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE INDEX IF NOT EXISTS idx_cards_room ON cards(room_id);
CREATE INDEX IF NOT EXISTS idx_bets_room ON bets(room_id);
CREATE INDEX IF NOT EXISTS idx_tx_player ON transactions(player_id);
CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_player ON withdrawal_requests(player_id);
