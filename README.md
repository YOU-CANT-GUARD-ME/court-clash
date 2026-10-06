# BLOODSWORN — Mercenaries of the Ashen Realm.

A dark medieval top-down shooter: survive **The Hunt** solo, fight
**The Duel** (online 1v1, best of 3), or band up for **Skirmish** (online
2v2, best of 3) against strangers or your warband.

## What's here
- `public/index.html` — loading screen + lobby (accounts, warbands, gold,
  Hall of Legends)
- `public/game.html` — The Hunt (single-player waves)
- `public/showdown.html` — The Duel (online 1v1)
- `public/skirmish.html` — Skirmish (online 2v2)
- `public/config.js` — shared by all pages: server address + login token
- `public/mercenary.js` — draws a mercenary in a given look (lobby + games)
- `public/maps.js` — every map layout, per mode; `public/terrain.js` paints them
- `public/i18n.js` — English and Korean text for every page (see Languages)
- `server/` — Node server: HTTP API + WebSockets on one port
  - `server.js` — Duel matchmaking and authoritative round/score state
  - `skirmish.js` — Skirmish matchmaking (warband + public fill) and 2v2 matches
  - `lobby.js` — sign up / log in, warbands (parties)
  - `api.js` — leaderboard, profile, Hunt results
  - `db.js` — Postgres access; creates its tables on startup
  - `auth.js` — scrypt password hashing, session tokens
  - `armory.js` — the Armory's upgrades, prices and effects
  - `wardrobe.js` — looks (colours, helm styles, bolt trails), prices, titles
  - `events.js` — limited-time events (the Prism)
  - `maps.js` — which Duel/Skirmish arenas exist and their spawn points

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
  run). A Duel pays 100 for a win and 25 for a loss; a Skirmish pays 150 and
  40. Leaving mid-match forfeits it and pays nothing.
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
- **Your mercenary** (MERCENARY in the lobby) is a dressing room with a
  live preview. Four slots: cloak colour, helm style, trim & metal, and bolt
  trail. A few of each are free; the rest are bought once with gold (300 to
  1500) and can be worn any time after. Looks are cosmetic only and show
  everywhere: your party slot portrait, the Hunt, and to opponents in the
  Duel and Skirmish (where a ring in your side's colour keeps friend and foe
  clear). **Titles** are earned, not bought: e.g. *the Butcher* for 100
  Hunt kills, *the Duelist* for 10 Duel wins, *Warmaster* for 50 Skirmish
  wins. The worn title shows in party slots and the Hall of Legends.
  Colours and prices live in `server/wardrobe.js`; the server resolves a
  player's chosen ids into colours and sends those to other players.
- **The Prism (event, 4–18 October 2026):** in roughly 1 Hunt in 15, one
  shot fires as a rainbow bolt. Strike a foe with it to win the limited
  **Prismatic** bolt trail, which can't be bought and can't be won after the
  event. The server rolls the chance when a run starts
  (`POST /api/hunt/start`) and only grants the trail for that run
  (`POST /api/hunt/prism`), refusing claims sooner than that many shots could
  take; a Hunt can start at most every 20s. Dates and odds are in
  `server/events.js`. This keeps out casual cheating but a determined
  scripter could still claim it without hitting anything.
- **Hall of Legends** (LEGENDS in the lobby) shows your record and the top
  10 Hunt bounties and Duel records.

### API
| Method | Path | Notes |
|---|---|---|
| GET | `/` | Health check |
| GET | `/api/leaderboard` | Top 10 Hunt bounties, Duel and Skirmish records |
| GET | `/api/me` | Your profile, upgrade levels and Hunt loadout (`Authorization: Bearer <token>`) |
| POST | `/api/hunt` | `{ score, wave, kills }` for a finished Hunt (bearer token; one per 10s) |
| POST | `/api/hunt/start` | Begin a Hunt run; returns `{ runId, prismShot, event }` (bearer token; one per 20s) |
| POST | `/api/hunt/prism` | `{ runId }`: claim the rainbow-bolt hit for that run (bearer token) |

Lobby and Duel traffic goes over the WebSocket: `hello {token}`,
`signup`/`login {username, password}`, `logout`, `buyUpgrade {id}`, `buyItem {slot, id}`,
`wear {slot, id}` (slot `title` for titles), warband messages, then
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

## Maps
Every mode has three maps, one per look: **Ashen Keep** (stone dungeon),
**Blighted Wood** (trees for cover, murky ponds) and **Frozen Pass** (snow,
snow-capped rock, a frozen lake). The map is random every match: the server
picks it for the Duel and Skirmish and tells the players (so everyone fights
in the same arena), and the Hunt picks one each run. Its name shows on the
first round's banner, or the Hunt's wave-1 countdown.
- Layouts are rows of `#` (wall), `.` (floor) and `~` (water/ice: walkable)
  in `public/maps.js`; all maps of a mode share its size.
- Duel and Skirmish spawn points per map are in `server/maps.js` and must be
  open floor. Duel arenas are rotationally symmetric and Skirmish arenas are
  mirrored both ways, so no spawn is favoured.
- Hunt foes spawn on a spread-out grid of open tiles worked out for each map,
  at most 27 per wave as before.

## Warbands (parties)
- Everyone starts in their own warband. Enter a friend's 6-letter seal and
  press JOIN to take a slot (max 4).
- The **captain** is whoever has been in longest; only they choose the
  contract (mode). If they leave, the next-longest member takes over. A
  refresh keeps your slot for 15 seconds.
- **The Hunt is solo**, but you keep your warband slot (and captaincy) while
  you play: the Hunt page stays connected to the server just to hold it.
- **Warband Duels (winner stays on):** if your warband has 2+ players, Find
  Match only pairs you with them. Each warband has one line: the front two
  fight, and after a duel (and a 5-second pause to read the result) the
  winner rejoins at the front and the loser at the back. A winner meets
  someone fresh rather than the foe they just beat, unless nobody else is
  waiting (a warband of two simply rematches). A warband of four runs two
  duels at once, then winners meet winners. Waiting players see the duels in
  progress, the live score and their place in line, and anyone can WITHDRAW
  to leave the line. Solo players use the public queue. When the captain
  presses TO BATTLE in Duel mode, everyone is sent to `showdown.html#party`,
  which joins the line automatically.

## Skirmish (2v2)
- **Matchmaking:** players search in units that must fill two sides of two.
  A warband (2+ members) counts once everyone in it has arrived on the
  Skirmish page, split into the sides its captain chose; a solo player is a
  unit of one. The oldest unit is topped up from the rest, pairs first, so a
  warband of four plays itself, a pair faces another pair or two strangers,
  and solo players fill any open place.
- **Sides:** with Skirmish selected, the lobby shows a GOLD and a CRIMSON
  banner. The captain taps a name, then a name or open place on the other
  banner, to swap or move it, or presses SHUFFLE. Newcomers fill gold first.
- **Matches:** players 0–1 are one team and 2–3 the other. Like the Duel,
  each client moves itself and the server relays positions; the server owns
  health, rounds and score, and ignores hits on allies or by the downed.
  Downed players watch a standing ally until the round ends, and a round
  ends when a whole team is down. First team to two rounds wins. Anyone who
  leaves is out for the rest of the match (recorded as a loss with no gold);
  if a whole team leaves, the other wins by forfeit.
- The spawn points (`SKIRMISH` in `server/maps.js`) must sit on open floor
  in each arena (`MAPS.skirmish` in `public/maps.js`).

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
- **Duel and Skirmish hits are client-reported**, so a modified client could
  claim hits. Fixing this means simulating bolts on the server.
- **Skirmish waits for a full four.** With few players online, a pair or a
  loner can wait a long time; there are no bots to fill in.
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
