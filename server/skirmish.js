// BLOODSWORN — Skirmish: 2v2, best of three rounds.
//
// Matchmaking works in "units" that must end up two-a-side:
//   - a warband (2+ members) whose members have all arrived on the Skirmish
//     page, split into the sides its captain picked in the lobby;
//   - a lone sellsword.
// The oldest unit is topped up from the others (pairs first, then singles)
// until both sides have two, so a party of four plays itself, a pair faces
// another pair or two strangers, and loners fill any gap.
//
// In a match, players 0–1 are team 0 and 2–3 are team 1. Like the Duel, each
// client moves itself and the server relays positions; the server owns
// health, knock-downs, rounds and the score. Downed players sit out until the
// next round; a round ends when a whole team is down.

const db = require('./db');
const lobby = require('./lobby');
const maps = require('./maps');

const TEAM_SIZE = 2;
const WINS_NEEDED = 2; // best of 3
const GOLD = { win: 150, loss: 40 };

const searching = new Map(); // socket -> time it started searching
const rooms = new Map();     // room id -> room
let nextRoomId = 1;

function send(ws, msg) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

// ---- matchmaking ----

// Everyone searching, grouped into units (see top of file), oldest first.
function buildUnits() {
  const units = [], waitingParties = [], seen = new Set();
  for (const [ws, since] of searching) {
    if (ws.readyState !== ws.OPEN) { searching.delete(ws); continue; }
    if (seen.has(ws)) continue;
    const party = lobby.skirmishPartyOf(ws);
    if (!party) {
      seen.add(ws);
      units.push({ sides: [[ws], []], since, party: null });
      continue;
    }
    for (const m of party.members) if (m.ws) seen.add(m.ws);
    const arrived = party.members.filter((m) => m.ws && m.ws.readyState === m.ws.OPEN && searching.has(m.ws));
    if (arrived.length < party.members.length) {
      waitingParties.push({ arrived, total: party.members.length });
      continue;
    }
    const sides = [[], []];
    for (const m of party.members) sides[m.side].push(m.ws);
    if (!sides[0].length) sides.reverse(); // a one-sided unit always uses side 0
    units.push({ sides, since: Math.min(...arrived.map((m) => searching.get(m.ws))), party: party.code });
  }
  units.sort((a, b) => a.since - b.since);
  return { units, waitingParties };
}

// Tops up `base` from `pool` to two-a-side. Returns the units used (base
// first) and how many players the group reached.
function fill(base, pool) {
  const sides = base.sides.map((s) => s.slice());
  const used = [base];
  const oneSided = pool.filter((u) => u !== base && !u.sides[1].length);
  const bySize = [...oneSided.filter((u) => u.sides[0].length === 2), ...oneSided.filter((u) => u.sides[0].length === 1)];
  for (const u of bySize) {
    const k = u.sides[0].length;
    const room = sides.map((s) => TEAM_SIZE - s.length);
    // Prefer an exact fit, so a pair isn't blocked by a single sitting in its spot.
    let side = room.findIndex((r) => r === k);
    if (side < 0) side = room[0] >= room[1] ? 0 : 1;
    if (room[side] < k) continue;
    sides[side].push(...u.sides[0]);
    used.push(u);
    if (sides[0].length === TEAM_SIZE && sides[1].length === TEAM_SIZE) break;
  }
  return { sides, used, count: sides[0].length + sides[1].length };
}

function pump() {
  let { units, waitingParties } = buildUnits();
  const progress = new Map(); // socket -> players found so far for its group
  for (let i = 0; i < units.length; i++) {
    const base = units[i];
    const group = fill(base, units);
    if (group.count === TEAM_SIZE * 2) {
      startMatch(group.sides);
      units = units.filter((u) => !group.used.includes(u));
      i = -1; // start over with what's left
      continue;
    }
    for (const side of base.sides) for (const ws of side) progress.set(ws, group.count);
  }
  for (const [ws, found] of progress) send(ws, { type: 'skStatus', phase: 'seeking', found, needed: TEAM_SIZE * 2 });
  for (const p of waitingParties)
    for (const m of p.arrived) send(m.ws, { type: 'skStatus', phase: 'gathering', arrived: p.arrived.length, total: p.total });
}

function stopSearching(ws) {
  if (searching.delete(ws)) pump();
}

// ---- matches ----

function teamOf(i) { return i < TEAM_SIZE ? 0 : 1; }

function startMatch(sides) {
  for (const ws of [...sides[0], ...sides[1]]) searching.delete(ws);
  const room = {
    id: nextRoomId++,
    players: [...sides[0], ...sides[1]],
    health: [100, 100, 100, 100],
    left: [false, false, false, false],
    scores: [0, 0],
    round: 1,
    state: 'starting', // playing | roundover | matchover
    map: maps.randomMap(maps.SKIRMISH), // spawns per arena are in maps.js
  };
  rooms.set(room.id, room);
  const roster = room.players.map((ws, i) => ({ name: lobby.usernameOf(ws), team: teamOf(i), look: lobby.lookOf(ws) }));
  room.players.forEach((ws, i) => {
    ws.skRoom = room.id;
    ws.skIndex = i;
    send(ws, { type: 'skMatchFound', you: i, players: roster, map: room.map });
  });
  startRound(room);
}

function broadcast(room, msg, except) {
  room.players.forEach((ws) => { if (ws !== except) send(ws, msg); });
}

function startRound(room) {
  room.health = room.left.map((gone) => (gone ? 0 : 100));
  room.state = 'playing';
  broadcast(room, { type: 'skRoundStart', round: room.round, scores: room.scores, spawns: maps.SKIRMISH[room.map], health: room.health });
}

// The team with nobody standing, or -1.
function wipedTeam(room) {
  for (const team of [0, 1]) {
    const standing = room.health.some((hp, i) => teamOf(i) === team && hp > 0);
    if (!standing) return team;
  }
  return -1;
}

function endRound(room, winner) {
  room.state = 'roundover';
  room.scores[winner]++;
  broadcast(room, { type: 'skRoundOver', winnerTeam: winner, scores: room.scores, round: room.round });
  if (room.scores[winner] >= WINS_NEEDED) {
    setTimeout(() => endMatch(room, winner), 2500);
  } else {
    room.round++;
    setTimeout(() => { if (rooms.has(room.id)) startRound(room); }, 3000);
  }
}

function record(ws, won, gold) {
  if (!ws.playerId) return;
  const playerId = ws.playerId;
  db.recordSkirmish(playerId, won, gold)
    .then((row) => lobby.pushProfile(playerId, row))
    .catch((err) => console.error('Could not record skirmish:', err.message));
}

function endMatch(room, winner, forfeit = false) {
  if (!rooms.has(room.id)) return;
  room.state = 'matchover';
  rooms.delete(room.id);
  room.players.forEach((ws, i) => {
    if (room.left[i]) return; // already recorded when they left
    const won = teamOf(i) === winner;
    const gold = won ? GOLD.win : GOLD.loss;
    if (ws.playerId) record(ws, won, gold);
    send(ws, { type: 'skMatchOver', winnerTeam: winner, scores: room.scores, gold: ws.playerId ? gold : 0, forfeit });
    ws.skRoom = null;
  });
}

function onHit(room, i, msg) {
  const target = Number(msg.target);
  if (!Number.isInteger(target) || target < 0 || target > 3) return;
  if (teamOf(target) === teamOf(i)) return;            // no friendly fire
  if (room.health[i] <= 0 || room.health[target] <= 0) return; // the downed can't shoot or be shot
  const dmg = Math.max(1, Math.min(50, Number(msg.damage) || 20));
  room.health[target] = Math.max(0, room.health[target] - dmg);
  broadcast(room, { type: 'skHealth', health: room.health });
  if (room.health[target] === 0) {
    broadcast(room, { type: 'skDown', i: target, by: i });
    const wiped = wipedTeam(room);
    if (wiped >= 0) endRound(room, 1 - wiped);
  }
}

// Returns true if the message was a Skirmish message.
function handleMessage(ws, msg) {
  switch (msg.type) {
    case 'findSkirmish':
      if (rooms.has(ws.skRoom)) return true; // already fighting
      if (!searching.has(ws)) searching.set(ws, Date.now());
      pump();
      return true;
    case 'cancelSkirmish':
      stopSearching(ws);
      return true;
    case 'skState':
    case 'skShoot':
    case 'skHit': {
      const room = rooms.get(ws.skRoom);
      if (!room || room.state !== 'playing') return true;
      const i = ws.skIndex;
      if (msg.type === 'skHit') onHit(room, i, msg);
      else if (room.health[i] > 0)
        broadcast(room, { type: msg.type, i, x: msg.x, y: msg.y, angle: msg.angle, moving: !!msg.moving }, ws);
      return true;
    }
  }
  return false;
}

function handleClose(ws) {
  stopSearching(ws);
  const room = rooms.get(ws.skRoom);
  if (!room || room.state === 'matchover') return;
  const i = ws.skIndex;
  room.left[i] = true;
  room.health[i] = 0;
  record(ws, false, 0); // leaving forfeits your share
  broadcast(room, { type: 'skLeft', i });
  broadcast(room, { type: 'skHealth', health: room.health });
  const team = teamOf(i);
  const teamGone = room.left.every((gone, j) => teamOf(j) !== team || gone);
  if (teamGone) return endMatch(room, 1 - team, true);
  if (room.state === 'playing' && wipedTeam(room) === team) endRound(room, 1 - team);
}

// When a warband changes (someone joins, leaves or switches side), searching
// members may now form a different unit.
function partyChanged() {
  if (searching.size) pump();
}

module.exports = { handleMessage, handleClose, partyChanged };
