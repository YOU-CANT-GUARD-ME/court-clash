# MERCENARY — 1v1 Showdown (multiplayer add-on)

## What's here
- `public/index.html` — home screen (Single Player / 1v1 Showdown)
- `public/game.html` — your existing single-player game, unchanged
- `public/showdown.html` — new online 1v1 client
- `server/server.js` — matchmaking + best-of-3 round server (Node + `ws`)

## Running it
```
cd server
npm install
npm start          # starts the match server on ws://localhost:8080
```
Then serve `public/` with any static file server (e.g. `npx serve public`,
or Python's `python3 -m http.server 5500 -d public`) and open `index.html`
in two separate browser tabs/windows to test a match against yourself.

If you deploy the server somewhere other than `localhost:8080`, update
`WS_URL` near the top of `showdown.html`'s script.

## Lobby: usernames and parties
- `server/lobby.js` runs on the same WebSocket server as matches.
- On first visit, `index.html` asks for a username (3–16 letters, numbers
  or `_`, unique ignoring case). The server stores it in `server/users.json`
  under a random user ID, which the browser keeps in localStorage, so you
  are only asked once per browser.
- Everyone starts in their own party. Type a friend's 6-letter code into the
  party code box and press JOIN to take a slot in their party (max 4).
- The **party leader** is whoever has been in the party longest. Only the
  leader can change the game mode; if they leave, the next-longest member
  takes over. A refresh keeps your slot for 15 seconds.
- **Party 1v1s:** `showdown.html` says hello with the same user ID, so the
  server knows your party. If your party has 2+ players, Find Match only
  pairs you with party members (first two to search play each other);
  solo players use the public queue. When the leader presses PLAY in 1v1
  mode, everyone in the party is sent to `showdown.html#party`, which starts
  searching automatically.
- To test with several players locally, use separate browsers or private
  windows (tabs in the same browser share one user, and the newest tab wins).
- Render's free tier has no persistent disk, so `users.json` is wiped on
  every redeploy or restart. Attach a Render disk and point `USERS_FILE`
  at it if usernames need to survive.

## How the match flow works
1. Both clients hit "Find Match" → server pairs the first two waiting
   sockets into a room.
2. Server sends `roundStart` with each player's spawn point and resets
   health to 100/100.
3. Each client simulates its own player locally (movement, aiming,
   shooting) — same approach as your single-player code, just without
   AI enemies.
4. Position updates are sent to the server ~20x/sec and relayed straight
   to the opponent (`opponentState`), so each client always has a recent
   snapshot of where the other player is.
5. When your bullet visually overlaps the opponent's last known position,
   your client reports `iHit` to the server. The server is the one source
   of truth for health — it decrements it and broadcasts the new values
   to both clients.
6. First to 0 health loses the round. Server increments score, waits a
   few seconds, and starts the next round. First to 2 round wins takes
   the match.

## Known limitations (intentional, for a fast v1)
- **Hit detection is client-reported, not server-verified.** A modified
  client could claim hits it didn't land. Hardening this means moving
  hit detection fully server-side (server needs to know both players'
  bullets and positions each tick) — a bigger lift, worth doing once the
  core loop feels good.
- **No lag compensation.** Because opponent position is just the last
  packet received, there's inherent latency in what you're aiming at —
  fine on a LAN or same-city connection, rougher over long distances.
- **No reconnect handling.** If either player's socket drops mid-match,
  the match ends (the other player wins by forfeit). No rejoin flow yet.
- **No accounts, no persistence.** Matches are anonymous and in-memory —
  by design, per your call to defer win/loss tracking and auth for now.
- **Reload is currently instant/local** in showdown mode (press R) —
  not networked, since ammo state isn't relayed. Fine for now, but worth
  deciding whether ammo should be shared state before this goes further.

## Deploying to Render
Render needs **two separate services** since one is a static site and the
other is a long-running Node process:

1. **Deploy the server first** — create a new "Web Service" on Render,
   point it at the `server/` folder (or your repo root with a root
   directory of `server`), build command `npm install`, start command
   `npm start`. Once it deploys, Render gives you a URL like
   `https://mercenary-showdown-server.onrender.com`.
2. **Edit `public/showdown.html`** — near the top of the `NETWORKING`
   section, set:
   ```js
   const DEPLOYED_SERVER_HOST = "mercenary-showdown-server.onrender.com";
   ```
   (your actual Render server hostname, no `https://`, no trailing slash).
3. **Deploy the site** — create a new "Static Site" on Render pointing at
   the `public/` folder. This serves `index.html`, `game.html`, and
   `showdown.html`.

While `DEPLOYED_SERVER_HOST` is still the placeholder text, the game
automatically falls back to `localhost:8080` whenever it's opened from
`localhost` — so local testing keeps working with zero edits, and you
only touch that one line right before deploying.

Note: Render's free tier spins services down after inactivity, so the
first "Find Match" after some idle time may take 10–30 seconds while the
server wakes back up. Not a bug — just something to expect on the free tier.

## Natural next steps, whenever you're ready
- Move bullet simulation server-side for real anti-cheat
- Add a round-intermission screen showing hit stats
- Persist match history once you're ready to take on accounts/auth
