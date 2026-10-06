// BLOODSWORN — co-op Hunt: a warband hunts the waves together.
//
// The host (the warband's captain, if present) runs the foes in their own
// browser — the same code as a solo Hunt — and the server relays between the
// host and everyone else:
//   - every player sends their position, shots and firepots ('cp' messages),
//     relayed to the rest of the room;
//   - other players report their hits on foes to the host only;
//   - the host sends world snapshots (foes, wave, score) and events (foe
//     shots, explosions, kills, wave changes) to everyone.
// When everyone is down the host reports the result; the server pays every
// player the team bounty (score / 10 gold) and records the co-op run. If the
// host leaves, the run ends and is paid from their last snapshot.

const crypto = require('crypto');
const db = require('./db');
const lobby = require('./lobby');

const GATHER_MS = 12000;          // wait this long for the whole warband, then start
const LOOKS = ['keep', 'wood', 'frost'];
const rooms = new Map();          // party code -> room
let nextId = 1;

function send(ws, msg) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function roster(room) {
  return [...room.players.values()].map((p) => ({ id: p.id, name: p.name, look: p.look }));
}

function broadcast(room, msg, except) {
  for (const ws of room.players.keys()) if (ws !== except) send(ws, msg);
}

function gatherStatus(room) {
  // Everyone in the warband, including those still on their way from the
  // lobby (briefly disconnected while their page changes).
  const party = lobby.skirmishPartyOf([...room.players.keys()][0]);
  const total = party ? party.members.length : room.players.size;
  broadcast(room, { type: 'coopGather', arrived: room.players.size, total, startsAt: room.gatherUntil });
  return total;
}

function start(room) {
  if (room.state !== 'gathering') return;
  clearTimeout(room.gatherTimer);
  room.state = 'running';
  room.startedAt = Date.now();
  // The captain hosts if they came; otherwise whoever arrived first.
  const party = lobby.skirmishPartyOf([...room.players.keys()][0]);
  const captainWs = party && party.members[0].ws;
  room.host = room.players.has(captainWs) ? captainWs : [...room.players.keys()][0];
  room.map = LOOKS[crypto.randomInt(LOOKS.length)];
  for (const [ws, p] of room.players)
    send(ws, { type: 'coopStart', you: p.id, host: room.players.get(room.host).id, players: roster(room), map: room.map });
}

function join(ws) {
  const party = lobby.skirmishPartyOf(ws);
  if (!party) return send(ws, { type: 'coopSolo' }); // no warband: play a normal Hunt
  let room = rooms.get(party.code);
  if (!room || room.state === 'over') {
    room = { code: party.code, players: new Map(), state: 'gathering', last: null, gatherUntil: Date.now() + GATHER_MS };
    room.gatherTimer = setTimeout(() => start(room), GATHER_MS);
    rooms.set(party.code, room);
  }
  for (const r of rooms.values()) if (r !== room) leave(r, ws); // only one room at a time
  if (room.players.has(ws)) return;
  const p = { id: nextId++, name: lobby.usernameOf(ws) || 'Sellsword', look: lobby.lookOf(ws) };
  room.players.set(ws, p);
  ws.coopRoom = room.code;
  if (room.state === 'gathering') {
    const total = gatherStatus(room);
    if (room.players.size >= total) start(room);
    return;
  }
  // Joining a run already under way: the host's next snapshot fills them in.
  send(ws, { type: 'coopStart', you: p.id, host: room.players.get(room.host).id, players: roster(room), map: room.map, late: true });
  broadcast(room, { type: 'coopPeer', add: { id: p.id, name: p.name, look: p.look } }, ws);
}

// Valid results only: the same bounds as a solo Hunt, scaled for the party.
function validResult(room, score, wave, kills) {
  const n = Math.max(1, room.players.size);
  const total = Object.values(kills).reduce((a, k) => a + k, 0);
  if (!Number.isInteger(score) || !Number.isInteger(wave) || score < 0 || wave < 1 || wave > 500) return false;
  if (total > wave * 40 * (1 + 0.5 * (n - 1))) return false;
  return score <= (wave - 1) * 500 + total * 1000;
}

function finish(room, reason) {
  if (room.state !== 'running') return;
  room.state = 'over';
  const last = room.last || { score: 0, wave: 1, kills: {} };
  const ok = validResult(room, last.score, last.wave, last.kills);
  const gold = ok ? Math.floor(last.score / 10) : 0;
  for (const [ws, p] of room.players) {
    const kills = Math.max(0, Math.floor(Number(last.kills[p.id]) || 0));
    if (ok && ws.playerId) {
      const playerId = ws.playerId;
      db.recordCoop(playerId, { score: last.score, wave: last.wave, kills, gold })
        .then((row) => lobby.pushProfile(playerId, row))
        .catch((err) => console.error('Could not record co-op hunt:', err.message));
    }
    send(ws, { type: 'coopOver', reason, score: last.score, wave: last.wave, kills, gold: ok && ws.playerId ? gold : 0 });
    ws.coopRoom = null;
  }
  rooms.delete(room.code);
}

function leave(room, ws) {
  const p = room.players.get(ws);
  if (!p) return;
  if (room.state === 'running' && ws === room.host) return finish(room, 'host'); // nobody can run the foes
  room.players.delete(ws);
  ws.coopRoom = null;
  if (!room.players.size) {
    clearTimeout(room.gatherTimer);
    rooms.delete(room.code);
    return;
  }
  if (room.state === 'gathering') gatherStatus(room);
  else broadcast(room, { type: 'coopPeer', remove: p.id });
}

// Returns true if the message was a co-op message.
function handleMessage(ws, msg) {
  if (msg.type === 'coopJoin') return join(ws), true;
  if (msg.type === 'coopLeave') {
    const room = rooms.get(ws.coopRoom);
    if (room) leave(room, ws);
    return true;
  }
  if (msg.type !== 'cp' && msg.type !== 'coopEnd') return false;
  const room = rooms.get(ws.coopRoom);
  const p = room && room.players.get(ws);
  if (!p || room.state !== 'running') return true;
  if (msg.type === 'coopEnd') {
    // Only the host decides the run is over (everyone is down).
    if (ws === room.host) {
      room.last = { score: msg.score, wave: msg.wave, kills: msg.kills || {} };
      finish(room, 'down');
    }
    return true;
  }
  const out = { ...msg, from: p.id };
  if (ws === room.host && msg.world)
    room.last = { score: msg.world.score, wave: msg.world.wave, kills: msg.world.kills || {} };
  if (msg.to === 'host') send(room.host, out);
  else if (msg.to) {
    for (const [peer, q] of room.players) if (q.id === msg.to) send(peer, out);
  }
  else broadcast(room, out, ws);
  return true;
}

function handleClose(ws) {
  const room = rooms.get(ws.coopRoom);
  if (room) leave(room, ws);
}

module.exports = { handleMessage, handleClose };
