// MERCENARY — 1v1 Showdown server
// Handles matchmaking and authoritative round/score state.
// Movement/position is relayed (not simulated) between clients — see README for the
// tradeoffs of that approach.

const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const WINS_NEEDED = 2; // best of 3

// Two spawn points, kept far apart on opposite corners. Both clients use the
// SAME arena layout (see RAW_MAP in showdown.html) so these must stay in sync
// with that map if it changes.
const SPAWN_POINTS = [
  { x: 2.5, y: 2.5 },   // top-left, in map tile units
  { x: 31.5, y: 17.5 }, // bottom-right, in map tile units
];

const wss = new WebSocketServer({ port: PORT });

let waitingPlayer = null; // a socket waiting for an opponent
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

function endMatch(room, winnerIdx) {
  room.state = 'matchover';
  room.players.forEach((ws, i) => {
    send(ws, {
      type: 'matchOver',
      youWon: i === winnerIdx,
      scores: room.scores,
    });
  });
  rooms.delete(room.id);
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

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'findMatch') {
      if (waitingPlayer && waitingPlayer !== ws && waitingPlayer.readyState === ws.OPEN) {
        const room = makeRoom(waitingPlayer, ws);
        waitingPlayer = null;
        room.players.forEach((sock, i) => {
          send(sock, { type: 'matchFound', playerNum: i, roomId: room.id });
        });
        startRound(room);
      } else {
        waitingPlayer = ws;
        send(ws, { type: 'queued' });
      }
      return;
    }

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
  });

  ws.on('close', () => {
    if (waitingPlayer === ws) waitingPlayer = null;
    const room = rooms.get(ws.roomId);
    if (room && room.state !== 'matchover') {
      const opp = opponentOf(room, ws);
      send(opp, { type: 'opponentDisconnected' });
      rooms.delete(room.id);
    }
  });
});

// Drop dead connections
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 15000);

console.log(`MERCENARY Showdown server listening on ws://localhost:${PORT}`);
