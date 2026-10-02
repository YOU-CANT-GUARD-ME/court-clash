# BLOODSWORN — Mercenaries of the Ashen Realm

A dark medieval top-down shooter: survive **The Hunt** solo, or fight
**The Duel** (online 1v1, best of 3) against strangers or your warband.

## What's here
- `public/index.html` — loading screen + lobby (accounts, warbands, gold,
  Hall of Legends)
- `public/game.html` — The Hunt (single-player waves)
- `public/showdown.html` — The Duel (online 1v1)
- `public/config.js` — shared by all pages: server address + login token
- `public/i18n.js` — English and Korean text for every page (see Languages)
- `server/` — Node server: HTTP API + WebSockets on one port
  - `server.js` — Duel matchmaking and authoritative round/score state
  - `lobby.js` — sign up / log in, warbands (parties)
  - `api.js` — leaderboard, profile, Hunt results
  - `db.js` — Postgres access; creates its tables on startup
  - `auth.js` — scrypt password hashing, session tokens
  - `armory.js` — the Armory's upgrades, prices and effects

## Database (Neon Postgres)
All accounts, gold and stats live in Postgres. The server creates its tables
the first time it starts, so a new database needs no manual setup.

1. Create a free project at [neon.tech](https://neon.tech).
2. Copy its connection string (Dashboard → Connect), which looks like
   `postgresql://user:password@ep-something.neon.tech/neondb?sslmode=require`.
3. Give it to the server as `DATABASE_URL` (Render: your web service →
   Environment → add `DATABASE_URL`). Keep it secret: it's the database
   password.

The server refuses to start without `DATABASE_URL`.

## Running it locally
```
cd server
npm install
DATABASE_URL="postgresql://…your Neon string…" npm start   # http + ws on :8080
```
Then serve `public/` with any static file server (e.g.
`python3 -m http.server 5500 -d public`) and open
`http://localhost:5500`. Pages opened from `localhost` talk to the server on
`localhost:8080` automatically.

To test several players, use separate browsers or private windows: tabs in
the same browser share one login, and the newest tab takes over.

## Accounts, gold and legends
- **Sign up** with a name (3–16 letters, numbers or `_`, unique ignoring
  case) and a password (6+ characters). **Returning** logs in from any
  device. Passwords are hashed with scrypt; the browser keeps a random
  session token, and the server stores only its SHA-256 hash. LEAVE (top
  right) logs out and deletes the session. 5 wrong passwords lock that name
  for a minute.
- **Gold:** the Hunt pays bounty ÷ 10 when you die (retreating forfeits the
  run). A Duel pays 100 for a win and 25 for a loss; leaving mid-Duel
  forfeits it and pays nothing.
- **The Armory** (ARMORY in the lobby) sells permanent Hunt upgrades, each
  with 5 levels costing 150 / 400 / 800 / 1500 / 2500 gold:

  | Upgrade | Effect per level | Max |
  |---|---|---|
  | Hardened Mail | +20 max health | 200 HP |
  | Deep Quiver | +6 bolts per quiver | 60 |
  | Barbed Bolts | +20% bolt damage | +100% |
  | Fleet Boots | +0.15 move speed | 4.55 |
  | Firepot Satchel | +1 starting firepot | 8 |
  | Field Medic | heal 5% of max health after each wave | 25% |

  Prices and effects live only in `server/armory.js`. The lobby shows the
  catalog the server sends, and the Hunt loads its starting stats from
  `/api/me`. A purchase is one SQL update that re-checks the gold and the
  current level, so double clicks or two devices can't overspend.
- **Hall of Legends** (LEGENDS in the lobby) shows your record and the top
  10 Hunt bounties and Duel records.

### API
| Method | Path | Notes |
|---|---|---|
| GET | `/` | Health check |
| GET | `/api/leaderboard` | Top 10 Hunt bounties and Duel records |
| GET | `/api/me` | Your profile, upgrade levels and Hunt loadout (`Authorization: Bearer <token>`) |
| POST | `/api/hunt` | `{ score, wave, kills }` for a finished Hunt (bearer token; one per 10s) |

Lobby and Duel traffic goes over the WebSocket: `hello {token}`,
`signup`/`login {username, password}`, `logout`, `buyUpgrade {id}`, warband messages, then
`findMatch` and the match messages below.

## Languages
The game is in English and Korean. The ⚙ button in the lobby header opens
Settings, where players pick a language; it's saved in the browser and used
by all three pages. A first visit follows the browser's language.

All text lives in `public/i18n.js`: `STRINGS.en` and `STRINGS.ko` hold the
same keys, and `tr('key', { n: 3 })` fills in `{placeholders}`. The server
still sends English, so its error messages and Armory upgrade names are
translated in that file too (`SERVER_MESSAGES`, `ARMORY_TEXT`). If you add a
server message, add its Korean there or players will see it in English.

Movement and hotkeys in both games use physical keys (`event.code`), so they
work with a Korean keyboard input method switched on.

## Warbands (parties)
- Everyone starts in their own warband. Enter a friend's 6-letter seal and
  press JOIN to take a slot (max 4).
- The **captain** is whoever has been in longest; only they choose the
  contract (mode). If they leave, the next-longest member takes over. A
  refresh keeps your slot for 15 seconds.
- **Warband Duels:** if your warband has 2+ players, Find Match only pairs
  you with them (first two to search fight). Solo players use the public
  queue. When the captain presses TO BATTLE in Duel mode, everyone is sent
  to `showdown.html#party`, which starts searching automatically.

## How a Duel works
1. Both clients search → the server pairs them into a room.
2. Server sends `roundStart` with spawn points and resets health to 100.
3. Each client simulates its own player; positions are relayed ~20×/sec.
4. When your bolt overlaps the opponent's last known position, your client
   reports `iHit`. The server owns health and broadcasts it.
5. First to 0 health loses the round; first to 2 rounds wins. The server
   records the result and pays gold.

## Known limitations
- **Hunt results are client-reported.** The Hunt runs in the browser, so a
  modified client could submit a fake run. The server rejects impossible
  numbers (kills per wave, points per kill, one result per 10s) but can't
  catch a careful cheat. Duel results are decided by the server.
- **Duel hits are client-reported**, so a modified client could claim hits.
  Fixing this means simulating bolts on the server.
- **No lag compensation**, and no rejoin if a socket drops mid-Duel (the
  other player wins by forfeit).
- **Armory upgrades only affect the Hunt.** The Duel stays even on purpose.

## Deploying
Two services: the Node server on Render, and the static `public/` site on
Vercel (or a Render static site).

1. **Server (Render Web Service):** root directory `server`, build
   `npm install`, start `npm start`, and set `DATABASE_URL` (see above).
2. **Point the pages at it:** set `DEPLOYED_SERVER_HOST` in
   `public/config.js` to the Render hostname (no `https://`, no trailing
   slash).
3. **Site:** deploy `public/`.

Render's free tier sleeps when idle, so the first visit after a while can
take 10–30 seconds; the loading screen says the gatekeeper is slow to wake.
