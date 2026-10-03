// BLOODSWORN — game server
// One port serves both the HTTP API (api.js) and WebSockets: the lobby
// (lobby.js) plus Duel matchmaking and authoritative round/score state.
// Movement/position is relayed (not simulated) between clients — see README for the
// tradeoffs of that approach.

const http = require('http');
const { WebSocketServer } = require('ws');
const db = require('./db');
const api = require('./api');
const lobby = require('./lobby');
const skirmish = require('./skirmish');

const PORT = process.env.PORT || 8080;
const WINS_NEEDED = 2; // best of 3
const DUEL_GOLD = { win: 100, loss: 25 };
// Time to read the result before a warband's next duel starts.
const NEXT_DUEL_DELAY_MS = 5000;

// Two spawn points, kept far apart on opposite corners. Both clients use the
// SAME arena layout (see RAW_MAP in showdown.html) so these must stay in sync
// with that map if it changes.
const SPAWN_POINTS = [
  { x: 2.5, y: 2.5 },   // top-left, in map tile units
  { x: 31.5, y: 17.5 }, // bottom-right, in map tile units
];

const server = http.createServer(api.handle);
const wss = new WebSocketServer({ server });

let waitingPlayer = null; // a socket waiting for a public opponent
// Warband Duels are "winner stays on". Each warband has one line of sockets
// waiting to fight; the front of the line is matched first. After a duel the
// winner rejoins at the front and the loser at the back.
const lines = new Map(); // party code -> [socket, ...] in line order
lobby.setPartyChangeListener(skirmish.partyChanged);
const rooms = new Map();  // roomId -> room state
let nextRoomId = 1;

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function makeRoom(playerA, playerB) {
  const roomId = 'room-' + nextRoomId++;
  const room = {
    id: roomId,
    players: [playerA, playerB],
    scores: [0, 0],
    round: 1,
    health: [100, 100],
    state: 'starting', // starting | playing | roundover | matchover
  };
  playerA.roomId = roomId;
  playerB.roomId = roomId;
  playerA.playerNum = 0;
  playerB.playerNum = 1;
  rooms.set(roomId, room);
  return room;
}

function startMatch(playerA, playerB, partyCode = null) {
  const room = makeRoom(playerA, playerB);
  room.partyCode = partyCode;
  playerA.lastFoe = playerB;
  playerB.lastFoe = playerA;
  room.players.forEach((sock, i) => {
    send(sock, {
      type: 'matchFound', playerNum: i, roomId: room.id,
      yourName: lobby.usernameOf(sock),
      opponentName: lobby.usernameOf(room.players[1 - i]),
    });
  });
  startRound(room);
  if (partyCode) broadcastLine(partyCode);
}

function dequeue(ws) {
  if (waitingPlayer === ws) waitingPlayer = null;
  ws.requeue = null; // cancels a pending return to the line after a duel
  const code = ws.partyQueue;
  ws.partyQueue = null;
  const line = code && lines.get(code);
  if (!line || !line.includes(ws)) return;
  line.splice(line.indexOf(ws), 1);
  if (!line.length) lines.delete(code);
  broadcastLine(code);
}

// ---- warband line (winner stays on) ----

function joinLine(ws, code, where) {
  if (!lines.has(code)) lines.set(code, []);
  const line = lines.get(code);
  if (where === 'front') line.unshift(ws);
  else line.push(ws);
  ws.partyQueue = code;
  send(ws, { type: 'queued', party: true });
}

function partyIsFighting(code) {
  for (const room of rooms.values()) if (room.partyCode === code) return true;
  return false;
}

// Starts every duel the line allows. The front of the line fights the next
// person who isn't the foe they just faced, so a winner meets someone fresh;
// a straight rematch only happens when nobody else is coming (e.g. a warband
// of two).
function pumpLine(code) {
  const line = lines.get(code);
  if (!line) return;
  // Anyone who closed the page or left the warband while waiting goes back
  // through normal matchmaking instead.
  for (const ws of [...line]) {
    if (ws.readyState === ws.OPEN && lobby.matchPartyOf(ws) === code) continue;
    dequeue(ws);
    if (ws.readyState === ws.OPEN) findMatch(ws);
  }
  while (line.length >= 2) {
    const first = line[0];
    let j = line.findIndex((ws, i) => i > 0 && ws !== first.lastFoe);
    if (j < 0) {
      if (partyIsFighting(code)) break; // wait for someone fresh
      j = 1;
    }
    const second = line[j];
    line.splice(j, 1);
    line.shift();
    first.partyQueue = second.partyQueue = null;
    startMatch(first, second, code);
  }
  if (!line.length) lines.delete(code);
  broadcastLine(code);
}

// Tells everyone waiting in a warband's line who is fighting and where they stand.
function broadcastLine(code) {
  const line = lines.get(code) || [];
  const fights = [...rooms.values()].filter((r) => r.partyCode === code).map((r) => ({
    names: r.players.map(lobby.usernameOf), scores: r.scores, round: r.round,
  }));
  line.forEach((ws, i) => send(ws, { type: 'warbandLine', fights, position: i, waiting: line.length }));
}

// After a warband duel: the winner stays on (front of the line), the loser
// goes to the back. Waits a moment so both can read the result, and skips
// anyone who withdrew, left, or changed warband in the meantime.
function requeueAfterDuel(code, winner, loser) {
  const players = [[winner, 'front'], [loser, 'back']].filter(([ws]) => ws);
  for (const [ws, where] of players) ws.requeue = where;
  setTimeout(() => {
    for (const [ws, where] of players) {
      if (ws.requeue !== where) continue; // withdrew or already searching again
      ws.requeue = null;
      if (ws.readyState !== ws.OPEN) continue;
      if (lobby.matchPartyOf(ws) === code) joinLine(ws, code, where);
      else send(ws, { type: 'lineClosed' }); // warband changed: back to the menu
    }
    pumpLine(code);
  }, NEXT_DUEL_DELAY_MS);
}

// Players in a party (2+ members) are only matched with each other;
// everyone else goes into the public queue.
function findMatch(ws) {
  if (rooms.has(ws.roomId)) return; // already in a match
  dequeue(ws);
  const partyCode = lobby.matchPartyOf(ws);
  if (partyCode) {
    joinLine(ws, partyCode, 'back');
    pumpLine(partyCode);
    return;
  }
  if (waitingPlayer && waitingPlayer !== ws && waitingPlayer.readyState === ws.OPEN) {
    const other = waitingPlayer;
    dequeue(other);
    startMatch(other, ws);
  } else {
    waitingPlayer = ws;
    send(ws, { type: 'queued', party: false });
  }
}

function opponentOf(room, ws) {
  return room.players[0] === ws ? room.players[1] : room.players[0];
}

function startRound(room) {
  room.health = [100, 100];
  room.state = 'playing';
  room.players.forEach((ws, i) => {
    send(ws, {
      type: 'roundStart',
      round: room.round,
      yourSpawn: SPAWN_POINTS[i],
      oppSpawn: SPAWN_POINTS[1 - i],
      scores: room.scores,
    });
  });
}

// Pays out and records a finished Duel for every signed-in player in it.
// `gold` maps each socket to what they earned, so it can be shown right away.
function recordDuel(room, winnerIdx, forfeit) {
  const gold = new Map();
  room.players.forEach((ws, i) => {
    if (!ws.playerId) return;
    const won = i === winnerIdx;
    const earned = won ? DUEL_GOLD.win : forfeit ? 0 : DUEL_GOLD.loss;
    gold.set(ws, earned);
    const playerId = ws.playerId;
    db.recordDuel(playerId, won, earned)
      .then((row) => lobby.pushProfile(playerId, row))
      .catch((err) => console.error('Could not record duel:', err.message));
  });
  return gold;
}

function endMatch(room, winnerIdx) {
  if (!rooms.has(room.id)) return; // someone left after the last round: already settled as a forfeit
  room.state = 'matchover';
  const gold = recordDuel(room, winnerIdx, false);
  room.players.forEach((ws, i) => {
    send(ws, {
      type: 'matchOver',
      youWon: i === winnerIdx,
      scores: room.scores,
      gold: gold.get(ws) || 0,
      // In a warband: where you rejoin the line ('front' = you stay on).
      line: room.partyCode ? (i === winnerIdx ? 'front' : 'back') : null,
    });
  });
  rooms.delete(room.id);
  if (room.partyCode) {
    requeueAfterDuel(room.partyCode, room.players[winnerIdx], room.players[1 - winnerIdx]);
    broadcastLine(room.partyCode);
  }
}

function endRound(room, winnerIdx) {
  room.state = 'roundover';
  room.scores[winnerIdx]++;
  room.players.forEach((ws, i) => {
    send(ws, {
      type: 'roundOver',
      youWon: i === winnerIdx,
      scores: room.scores,
      round: room.round,
    });
  });
  if (room.partyCode) broadcastLine(room.partyCode);

  if (room.scores[winnerIdx] >= WINS_NEEDED) {
    setTimeout(() => endMatch(room, winnerIdx), 2500);
  } else {
    room.round++;
    setTimeout(() => {
      if (rooms.has(room.id)) startRound(room);
    }, 3000);
  }
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.roomId = null;
  ws.playerNum = null;

  ws.on('pong', () => { ws.isAlive = true; });

  // Messages are handled one at a time per socket. Lobby messages can wait on
  // the database, and e.g. 'hello' must finish before 'findMatch' is handled.
  ws.chain = Promise.resolve();
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    ws.chain = ws.chain.then(() => onMessage(ws, msg)).catch((err) => {
      console.error('Message error:', err);
      send(ws, { type: 'lobbyError', message: 'The server stumbled. Try again' });
    });
  });

  ws.on('close', () => {
    skirmish.handleClose(ws); // before the lobby update, which can trigger matchmaking
    lobby.handleClose(ws);
    dequeue(ws);
    const room = rooms.get(ws.roomId);
    if (room && room.state !== 'matchover') {
      const opp = opponentOf(room, ws);
      // Leaving mid-match forfeits it.
      const gold = recordDuel(room, room.players.indexOf(opp), true);
      send(opp, { type: 'opponentDisconnected', gold: gold.get(opp) || 0, line: room.partyCode ? 'front' : null });
      rooms.delete(room.id);
      if (room.partyCode) {
        requeueAfterDuel(room.partyCode, opp, null);
        broadcastLine(room.partyCode);
      }
    }
  });
});

async function onMessage(ws, msg) {
  if (await lobby.handleMessage(ws, msg)) return;
  if (skirmish.handleMessage(ws, msg)) return;

  if (msg.type === 'findMatch') return findMatch(ws);
  if (msg.type === 'cancelMatch') return dequeue(ws);

  const room = rooms.get(ws.roomId);
  if (!room || room.state !== 'playing') return;
  const opp = opponentOf(room, ws);

  switch (msg.type) {
    case 'state':
      // Coordinates are map tile units, so displays with different viewport
      // sizes render the arena and players at matching locations.
      send(opp, {
        type: 'opponentState',
        x: msg.x, y: msg.y, angle: msg.angle, moving: msg.moving,
      });
      break;

    case 'shoot':
      // Visual-only relay so the opponent sees your shot; damage is
      // decided by the shooter's own hit report below.
      send(opp, { type: 'opponentShoot', x: msg.x, y: msg.y, angle: msg.angle });
      break;

    case 'iHit': {
      // Sender claims a hit on the opponent. Authoritative health lives here.
      const meIdx = ws.playerNum;
      const oppIdx = 1 - meIdx;
      const dmg = Math.max(1, Math.min(50, msg.damage || 20)); // clamp to sane bounds
      room.health[oppIdx] = Math.max(0, room.health[oppIdx] - dmg);
      room.players.forEach((sock) => {
        send(sock, { type: 'healthUpdate', health: room.health });
      });
      if (room.health[oppIdx] <= 0) {
        endRound(room, meIdx);
      }
      break;
    }
  }
}

// Drop dead connections
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 15000);

db.init()
  .then(() => server.listen(PORT, () => console.log(`Bloodsworn server listening on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('Could not set up the database:', err.message);
    process.exit(1);
  });
