# Telegram Bingo — Full-Stack Multiplayer Game

Server-authoritative real-time multiplayer Bingo, built as a Telegram Mini App.

Stack: **Express.js** (REST API) + **Socket.IO** (real-time) + **better-sqlite3** (persistence) + vanilla JS Mini App frontend.

## ⚠️ Before running with real money

This project implements the *technical* architecture only (wallet ledger, betting, payouts).
It does **not** implement KYC, age verification, gambling licensing, AML checks, or payment-provider
integration. Real-money gambling is regulated in almost every jurisdiction — get legal/compliance
sign-off before connecting real payment rails or launching publicly. The `deposit` endpoint in
this repo is a stub for local testing and must be replaced with a verified payment-provider webhook
(Telegram Payments, a licensed processor, etc.) before going live.

## Quick start

```bash
cd bingo
npm install
cp .env.example .env
npm run init-db
npm run dev        # nodemon, or `npm start` for plain node
```

Server runs on `http://localhost:3000`. Open that URL in a normal browser to test the Mini App
outside Telegram (it falls back to a dev login when `TELEGRAM_BOT_TOKEN` is unset in development).

### Wire it up to a real Telegram bot (webhook mode)

1. Create a bot with [@BotFather](https://t.me/BotFather), grab the token.
2. Set `TELEGRAM_BOT_TOKEN` in `.env`.
3. Set `WEBAPP_URL` to your **public HTTPS domain** — Telegram refuses to deliver webhooks to
   `http://` or `localhost`. For local development, run a tunnel (e.g. `ngrok http 3000`) and put
   that tunnel's HTTPS URL in `WEBAPP_URL`.
4. Generate a webhook secret and put it in `TELEGRAM_WEBHOOK_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
5. Start the server as usual (`npm run dev` / `npm start`) — the bot lives in the same process,
   listening at `POST {WEBAPP_URL}{TELEGRAM_WEBHOOK_PATH}` (default path `/telegram/webhook`).
6. Register that URL with Telegram (one-time, re-run whenever `WEBAPP_URL` changes):
   ```bash
   npm run bot:set-webhook
   ```
7. In BotFather, set the Mini App URL to `WEBAPP_URL` as well.

**Why webhook instead of polling:** Telegram pushes each update straight to your server the moment
it happens, instead of the bot repeatedly asking "anything new?" — and it means the bot doesn't
need its own long-running process; it's just another route on the existing Express app
(`src/controllers/telegramWebhookController.js`, mounted in `app.js`). The trade-off is the public
HTTPS requirement above, which polling doesn't need.

Every webhook request is checked against `TELEGRAM_WEBHOOK_SECRET` (sent by Telegram in an
`X-Telegram-Bot-Api-Secret-Token` header) before anything is processed — without it, anyone who
guessed your webhook URL could POST fake Telegram updates to it.

### Bot conversation (`src/bot/handlers.js`)

- **`/start`** — finds or creates the player (same `Player.findOrCreate` the Mini App uses, keyed
  on Telegram ID, so it's one account either way). If they haven't shared a phone number yet, the
  bot asks for it using Telegram's native contact-share button (`request_contact: true`) rather
  than typing it — this avoids typos and gives a verified number tied to their Telegram account.
- **Sharing the contact** — the bot only accepts a contact card whose `user_id` matches the sender
  (never a contact forwarded from someone else), saves it via `Player.setPhoneNumber`, then shows
  the main menu.
- **Main menu** — a "▶️ Play Bingo" button that opens the Mini App as a Telegram WebApp, and a
  "💰 Check balance" button wired to the real `walletService.getBalance`.
- Returning players who already have a phone number on file skip straight to the menu on `/start`.

Not yet built into the bot: the `/deposit` and `/withdraw` conversational flows (receipt link
prompting, the 30-minute timer, receipt download/verification) — the backend services those would
call (`walletService.addAmount`, `withdrawalService.requestWithdrawal`) already exist, but the bot
commands themselves don't yet.

**Dependency note:** `node-telegram-bot-api` is pinned to `^0.66.0` deliberately. The same package
name now also publishes an unrelated `1.x`/`2.x` rewrite with a completely different API (ESM,
different method signatures) — installing without this exact range, or later bumping it carelessly,
will silently break every handler in `bot.js`. Don't loosen this version pin without rewriting the
bot code to match whatever API the new major version exposes.

## Creating a room

Rooms aren't auto-created — use the admin dashboard (`http://localhost:3000/admin.html`), or hit
the admin API directly:

```bash
# 1. Get an admin token
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "<your ADMIN_PASSWORD>"}'

# 2. Create a room with it
curl -X POST http://localhost:3000/api/admin/rooms \
  -H "Authorization: Bearer <admin token>" \
  -H "Content-Type: application/json" \
  -d '{"entryFee": 100, "maxPlayers": 20, "gameSpeedMs": 5000}'
```

## Dev auth bypass

When `NODE_ENV=development` and `TELEGRAM_BOT_TOKEN` is empty, `POST /api/auth/telegram` accepts a
plain JSON string as `initData`, e.g. `{"initData": "{\"id\":123,\"username\":\"tester\"}"}`, instead
of a real Telegram HMAC payload. This only works in development — remove/disable it before deploying.

## Project structure

```
src/
├── app.js, server.js        Express + HTTP + Socket.IO bootstrap
├── config/                  Env-driven config (incl. admin credentials)
├── database/                schema.sql, db.js (better-sqlite3), init.js
├── models/                  Player, Room, Card, Transaction, Winner, WithdrawalRequest
├── services/                authService (player + admin JWT), telegramService (initData HMAC),
│                             walletService (ledger), withdrawalService (request/approve/reject)
├── game/                    gameEngine, roomManager, cartelaPool (fixed numbered cards),
│                             cardGenerator, numberGenerator, numberCaller, patternValidator,
│                             bingoValidator, prizeDistributor, timer, engineRegistry
│                             (lets REST admin routes reach the same GameEngine as the sockets)
├── websocket/                socketServer, connectionManager (JWT handshake), eventDispatcher
├── middleware/                authMiddleware (player JWT), adminMiddleware (admin JWT), errorHandler
├── controllers/ + routes/    REST: /api/auth, /api/wallet, /api/rooms, /api/admin
├── bot/                      bot.js (webhook-mode instance), handlers.js (/start, phone number,
│                             menu), setWebhook.js (one-time registration script)
└── public/                   index.html (player Mini App), admin.html (admin dashboard)
```

## Game flow

1. Client authenticates via `POST /api/auth/telegram` (Telegram `initData` → JWT).
2. Client lists rooms (`GET /api/rooms`) and picks one to join.
3. **Cartela selection (numbered, like a physical bingo hall):**
   - Server generates a fixed pool of 100 numbered cartelas once at boot — cartela #42 is always the
     same grid for the life of the process, so regulars can recognize/prefer a number.
   - Client emits `list_cartelas` → gets all 100 numbers plus which are already taken in that room.
   - Tapping a number emits `preview_cartela` → shows that grid with no charge and no reservation.
   - `select_cartela` confirms it — **this is the point the entry fee is actually charged**, the
     card is persisted, the prize pool/player count update, and the socket joins the room channel.
   - If the player's balance can't cover the entry fee, the server rejects with
     `code: 'insufficient_balance'` and the client offers **Watch only** instead of blocking them.
4. **Watch-only / spectator mode:** `watch_room` joins the socket to the room channel with no card
   and no charge — they receive every broadcast (numbers called, winner, etc.) live but can't mark
   numbers or claim bingo. This is offered automatically when a player can't afford the entry fee,
   and is also available as a plain "watch instead of play" option.
5. With ≥2 paying players, a countdown starts automatically; the server then calls numbers on an
   interval (`number_called` events) from a pre-shuffled, server-only sequence.
6. Clients mark numbers locally (`mark_number` — for UX only); the server independently re-validates
   every `claim_bingo` against the numbers it actually called and the stored card, so a client can't
   fabricate a win.
7. First valid claim wins: house commission is deducted, the rest is paid to the winner's balance,
   and the round is logged (`winners` table) before the room resets — cartela numbers become free
   again — for the next game.

## Admin dashboard

Open `http://localhost:3000/admin.html` after starting the server. Sign in with
`ADMIN_USERNAME` / `ADMIN_PASSWORD` from your `.env` (there's no default password — you must set
one, or login is disabled).

The dashboard is a separate, JWT-protected surface from the player Mini App (`role: 'admin'`
tokens, checked by `requireAdmin` middleware — a player's Telegram-issued token cannot access it).

**Overview** — total players, rounds completed, commission earned, deposits/withdrawals/bets/payouts
totals, and a feed of recent winners.

**Rooms** — create rooms (entry fee, max players, call speed, auto-start), force-start a room
immediately (bypassing the 2-player minimum), or cancel a room in progress — cancelling refunds
every paid player's entry fee automatically via the wallet ledger.

**Players** — search by username/first name/Telegram ID, view balance and win/loss record,
manually adjust a balance (positive to credit, negative to debit — always logged to the
transactions ledger with a reason and which admin did it), ban/unban.

Note: "ban" only flags the player's `status` column — it doesn't itself block logins. Your
Telegram bot/gateway layer should check this status (e.g. in `loginWithTelegram`) and refuse
service to banned players; that hook isn't wired up in this scaffold yet.

### Admin API summary

| Method | Path                          | Description |
|--------|-------------------------------|--------------|
| POST   | /api/admin/login              | `{ username, password }` → `{ token }` |
| GET    | /api/admin/rooms              | List all rooms, any status |
| POST   | /api/admin/rooms              | Create a room |
| PATCH  | /api/admin/rooms/:id          | Edit a room (only while WAITING) |
| POST   | /api/admin/rooms/:id/start    | Force-start (bypasses min-player wait) |
| POST   | /api/admin/rooms/:id/cancel   | Cancel + refund all paid players |
| GET    | /api/admin/players            | `?search=` list/search players |
| GET    | /api/admin/players/:id        | Player detail + transaction history |
| POST   | /api/admin/players/:id/adjust | `{ amount, reason }` manual balance correction |
| POST   | /api/admin/players/:id/ban    | Set status to `banned` |
| POST   | /api/admin/players/:id/unban  | Set status to `active` |
| GET    | /api/admin/withdrawals        | `?status=PENDING\|APPROVED\|REJECTED\|ALL` (default PENDING) |
| POST   | /api/admin/withdrawals/:id/approve | Finalize a pending withdrawal (funds already held) |
| POST   | /api/admin/withdrawals/:id/reject  | `{ reason }` — releases held funds back to the player |
| GET    | /api/admin/financials         | Totals by transaction type, commission, recent winners |

## Withdrawal workflow

Withdrawals require admin approval — they're never instant, unlike the dev-stub deposit.

1. **Player requests a withdrawal** — `POST /api/wallet/withdrawals { amount }`. The server checks
   the balance and, if sufficient, **holds the funds immediately** (deducts from the spendable
   balance in the same DB transaction that creates the request) and returns a `PENDING` request.
   Holding the funds up front — rather than just checking balance and leaving it untouched — is
   what stops the same balance from being wagered in a room while a withdrawal is pending.
2. **Admin reviews it** — `GET /api/admin/withdrawals` (defaults to `PENDING`) or the Withdrawals
   tab in `admin.html`, which shows a red badge with the pending count next to the nav item.
3. **Approve** (`POST /api/admin/withdrawals/:id/approve`) just finalizes the status — the money was
   already moved out of the spendable balance at request time. Approving is an acknowledgement that
   the operator sent the payout through whatever real payment rail you're using (bank transfer,
   mobile money, etc.) — this project does not integrate a payout provider, same caveat as deposits.
4. **Reject** (`POST /api/admin/withdrawals/:id/reject { reason }`) reverses the hold — credits the
   amount back to the player's balance (ledger type `withdraw_reversal`) and stores the reason,
   which is shown to the player alongside the rejected status.

Every step is ledgered: the hold is a `withdraw` transaction, a rejection's refund is a
`withdraw_reversal` transaction, both tied to `player_id` and visible in `/api/wallet/history` and
the player's row in the admin Players tab.

## REST API summary

| Method | Path                  | Auth | Description |
|--------|-----------------------|------|--------------|
| POST   | /api/auth/telegram    | –    | Login/register via Telegram `initData` → `{ token, player }` |
| GET    | /api/wallet/balance   | JWT  | Current balance |
| POST   | /api/wallet/deposit   | JWT  | Dev-only stub deposit (replace with payment webhook) |
| POST   | /api/wallet/withdrawals | JWT | Request a withdrawal (holds funds, status PENDING) |
| GET    | /api/wallet/withdrawals | JWT | Your own withdrawal request history |
| GET    | /api/wallet/history   | JWT  | Transaction ledger |
| GET    | /api/rooms            | JWT  | List open rooms |
| GET    | /api/rooms/:id        | JWT  | Room state |
| GET    | /api/rooms/:id/card   | JWT  | Your card for that room |
| POST   | {WEBAPP_URL}{TELEGRAM_WEBHOOK_PATH} | Telegram secret header | Telegram webhook (not under `/api`, not player-facing) |

## Socket.IO events

Handshake: `io({ auth: { token: '<JWT>' } })`

**Client → server:** `list_cartelas`, `preview_cartela`, `select_cartela`, `watch_room`,
`leave_room`, `mark_number`, `claim_bingo`
**Server → client:** `room_update`, `countdown_started`, `game_started`, `number_called`,
`winner`, `game_voided`, `claim_rejected`, `error`

`list_cartelas`, `preview_cartela`, `select_cartela`, and `watch_room` all return their result
directly via the socket.io acknowledgement callback rather than a broadcast event. A failed
`select_cartela` due to low balance comes back as `{ ok: false, code: 'insufficient_balance' }` —
the client is expected to offer `watch_room` as a fallback at that point.

## Security notes already implemented

- All card generation and number sequences happen server-side; clients only render state.
- Every `claim_bingo` is re-validated server-side against the room's actual called-numbers list
  and the player's stored card — a forged "marked" array pointing at un-called numbers is rejected.
- JWT auth on both REST and Socket.IO (handshake `auth.token`).
- Telegram `initData` is verified via HMAC-SHA256 per Telegram's documented scheme.
- Wallet balance changes are atomic (SQLite transaction) and always paired with a ledger row.
- Basic rate limiting on the REST API (`express-rate-limit`) and `helmet` HTTP headers.

## Not yet implemented (see architecture doc's "Future Enhancements")

Tournament mode, multiple cards per player, spectator mode, Redis pub/sub for horizontal scaling
across multiple server instances, PostgreSQL migration path, replay system.
