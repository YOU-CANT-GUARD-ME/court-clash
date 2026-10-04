// BLOODSWORN — lobby: accounts + warbands (parties)
// Accounts live in Postgres (see db.js). A browser proves who it is with a
// session token from signup/login, sent in 'hello' on every connect.
// Warbands are in-memory. A warband's members array is kept in join order, so
// members[0] is always the captain (the person who has been in longest).

const crypto = require('crypto');
const db = require('./db');
const auth = require('./auth');
const armory = require('./armory');
const wardrobe = require('./wardrobe');
const events = require('./events');

const PARTY_SIZE = 4;
const MODES = ['hunt', 'showdown', 'skirmish'];
const SIDE_SIZE = 2; // Skirmish is two-a-side
const NAME_RE = /^[A-Za-z0-9_]{3,16}$/;
const PASSWORD_MIN = 6, PASSWORD_MAX = 72;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I
// A disconnected player keeps their slot this long, so a page refresh
// doesn't kick them out of the warband (or cost them captaincy).
const RECONNECT_GRACE_MS = 15000;
// Failed logins allowed per username before a short lockout.
const LOGIN_MAX_FAILS = 5, LOGIN_LOCK_MS = 60000;

const sessions = new Map(); // playerId -> { ws, username, partyCode, leaveTimer, appearance, title }
const parties = new Map();  // code -> { code, mode, members: [playerId, ...], sides: { playerId: 0 | 1 } }
let onPartyChange = () => {}; // set by the server so Skirmish can re-match
const loginFails = new Map(); // username_lower -> { count, until }

function send(ws, msg) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function error(ws, message) {
  send(ws, { type: 'lobbyError', message });
}

function makeCode() {
  let code;
  do {
    code = Array.from(crypto.randomBytes(6), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
  } while (parties.has(code));
  return code;
}

function broadcast(party) {
  const members = party.members.map((id, i) => ({
    username: sessions.get(id).username,
    leader: i === 0,
    online: !!sessions.get(id).ws,
    side: party.sides[id],
    look: sessions.get(id).appearance,
    title: sessions.get(id).title,
  }));
  party.members.forEach((id, i) => {
    send(sessions.get(id).ws, {
      type: 'party',
      code: party.code,
      mode: party.mode,
      youAreLeader: i === 0,
      members: members.map((m, j) => ({ ...m, you: i === j })),
    });
  });
  onPartyChange();
}

// Skirmish sides: newcomers fill the gold side (0) first, then crimson (1).
function sideCount(party, side) {
  return party.members.filter((id) => party.sides[id] === side).length;
}

function addToParty(party, playerId) {
  party.members.push(playerId);
  party.sides[playerId] = sideCount(party, 0) < SIDE_SIZE ? 0 : 1;
  sessions.get(playerId).partyCode = party.code;
  broadcast(party);
}

function createParty(playerId) {
  const party = { code: makeCode(), mode: 'hunt', members: [], sides: {} };
  parties.set(party.code, party);
  addToParty(party, playerId);
}

function removeFromParty(playerId) {
  const session = sessions.get(playerId);
  const party = session && parties.get(session.partyCode);
  if (!party) return;
  party.members = party.members.filter((id) => id !== playerId);
  delete party.sides[playerId];
  session.partyCode = null;
  if (party.members.length === 0) parties.delete(party.code);
  else broadcast(party); // if the captain left, members[0] is now the new captain
}

// Binds this socket to a player. `token` is only sent back on signup/login,
// when the browser doesn't have it yet.
function attach(ws, player, tokenHash, token) {
  let session = sessions.get(player.id);
  if (session) {
    clearTimeout(session.leaveTimer);
    if (session.ws && session.ws !== ws) {
      // Same account opened in another tab or device: the newest one wins.
      const old = session.ws;
      old.playerId = null;
      send(old, { type: 'replaced' });
      old.close();
    }
    session.ws = ws;
  } else {
    session = { ws, username: player.username, partyCode: null, leaveTimer: null };
    sessions.set(player.id, session);
  }
  session.appearance = wardrobe.resolveLook(player.look);
  session.title = wardrobe.titleOf(player.look);
  ws.playerId = player.id;
  ws.username = player.username;
  ws.tokenHash = tokenHash;
  send(ws, {
    type: 'welcome', username: player.username, profile: db.profileOf(player), armory: armory.CATALOG,
    wardrobe: wardrobe.CATALOG, event: events.eventInfo(),
    ...(token ? { token } : {}),
  });

  const party = parties.get(session.partyCode);
  if (party) broadcast(party);
  else createParty(player.id);
}

function detach(ws) {
  const playerId = ws.playerId;
  if (!playerId) return;
  const session = sessions.get(playerId);
  if (session && session.ws === ws) {
    clearTimeout(session.leaveTimer);
    removeFromParty(playerId);
    sessions.delete(playerId);
  }
  ws.playerId = null;
  ws.username = null;
  ws.tokenHash = null;
}

async function startSession(ws, player) {
  const token = auth.newToken(), tokenHash = auth.hashToken(token);
  await db.createSession(tokenHash, player.id);
  attach(ws, player, tokenHash, token);
}

function checkCredentials(ws, msg) {
  const username = String(msg.username || '').trim();
  const password = String(msg.password || '');
  if (!NAME_RE.test(username)) return error(ws, 'Names are 3–16 letters, numbers or _'), null;
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
    return error(ws, `Passwords are ${PASSWORD_MIN}–${PASSWORD_MAX} characters`), null;
  return { username, password };
}

// Returns true if the message was a lobby message (handled here).
async function handleMessage(ws, msg) {
  const me = ws.playerId;
  const party = me && parties.get(sessions.get(me)?.partyCode);

  switch (msg.type) {
    case 'hello': {
      const token = typeof msg.token === 'string' ? msg.token : '';
      const tokenHash = token && auth.hashToken(token);
      const player = tokenHash && await db.playerBySession(tokenHash);
      if (player) attach(ws, player, tokenHash);
      else send(ws, { type: 'needAuth' });
      return true;
    }

    case 'signup': {
      if (me) return true;
      const creds = checkCredentials(ws, msg);
      if (!creds) return true;
      const hash = await auth.hashPassword(creds.password);
      const player = await db.createPlayer(crypto.randomUUID(), creds.username, hash);
      if (!player) return error(ws, 'That name is already sworn'), true;
      await startSession(ws, player);
      return true;
    }

    case 'login': {
      if (me) return true;
      const creds = checkCredentials(ws, msg);
      if (!creds) return true;
      const key = creds.username.toLowerCase(), now = Date.now();
      let fails = loginFails.get(key);
      if (fails && fails.until > now) return error(ws, 'Too many attempts. Wait a minute and try again'), true;
      const player = await db.playerByUsername(creds.username);
      const ok = player ? await auth.verifyPassword(creds.password, player.password_hash) : await auth.burnTime(creds.password);
      if (!ok) {
        if (!fails || fails.until) fails = { count: 0, until: 0 }; // fresh start after a lockout ends
        fails.count++;
        if (fails.count >= LOGIN_MAX_FAILS) fails.until = now + LOGIN_LOCK_MS;
        loginFails.set(key, fails);
        return error(ws, 'That name and password do not match'), true;
      }
      loginFails.delete(key);
      await startSession(ws, player);
      return true;
    }

    case 'logout':
      if (ws.tokenHash) await db.deleteSession(ws.tokenHash);
      detach(ws);
      send(ws, { type: 'needAuth' });
      return true;

    case 'buyUpgrade': {
      if (!me) return true;
      const player = await db.playerById(me);
      const next = player && armory.nextCost(player.upgrades, msg.id);
      if (!next) return error(ws, 'That cannot be forged any further'), true;
      if (player.gold < next.cost) return error(ws, 'Not enough gold'), true;
      const row = await db.buyUpgrade(me, msg.id, next.level, next.cost);
      if (!row) return error(ws, 'Not enough gold'), true;
      pushProfile(me, row);
      return true;
    }

    case 'buyItem': {
      if (!me) return true;
      const slot = String(msg.slot || ''), id = String(msg.id || '');
      const item = wardrobe.itemOf(slot, id);
      if (!item || !item.cost) return true; // free, or limited (never sold)
      const player = await db.playerById(me);
      if (wardrobe.owns(player.owned, slot, id)) return true;
      if (player.gold < item.cost) return error(ws, 'Not enough gold'), true;
      const row = await db.buyItem(me, wardrobe.key(slot, id), item.cost);
      if (!row) return error(ws, 'Not enough gold'), true;
      pushProfile(me, row);
      return true;
    }

    case 'wear': {
      // Put on an owned item, or a title that has been earned.
      if (!me) return true;
      const slot = String(msg.slot || ''), id = String(msg.id || '');
      const player = await db.playerById(me);
      const profile = db.profileOf(player);
      const ok = slot === 'title' ? wardrobe.titleUnlocked(profile, id) : wardrobe.owns(player.owned, slot, id);
      if (!ok) return error(ws, slot === 'title' ? 'That title is not yet earned' : 'You do not own that'), true;
      const row = await db.setLook(me, slot, id);
      const session = sessions.get(me);
      session.appearance = wardrobe.resolveLook(row.look);
      session.title = wardrobe.titleOf(row.look);
      pushProfile(me, row);
      const p = parties.get(session.partyCode);
      if (p) broadcast(p); // warband mates see the new look
      return true;
    }

    case 'joinParty': {
      if (!me) return true;
      const target = parties.get(String(msg.code || '').trim().toUpperCase());
      if (!target) return error(ws, 'No warband bears that seal'), true;
      if (target === party) return true;
      if (target.members.length >= PARTY_SIZE) return error(ws, 'That warband is full'), true;
      removeFromParty(me);
      addToParty(target, me);
      return true;
    }

    case 'leaveParty':
      if (!me || !party || party.members.length === 1) return true;
      removeFromParty(me);
      createParty(me);
      return true;

    case 'launch':
      // Captain pressed PLAY: bring everyone else in the warband along.
      if (!party || party.members[0] !== me) return true;
      party.members.slice(1).forEach((id) => send(sessions.get(id).ws, { type: 'launch', mode: party.mode }));
      return true;

    case 'setSide': {
      // Captain moves a member to the other Skirmish side (if it has room).
      if (!party) return true;
      if (party.members[0] !== me) return error(ws, 'Only the captain can choose the sides'), true;
      const id = party.members[msg.index];
      const side = msg.side === 1 ? 1 : 0;
      if (!id || party.sides[id] === side) return true;
      if (sideCount(party, side) >= SIDE_SIZE) return error(ws, 'That side is full'), true;
      party.sides[id] = side;
      broadcast(party);
      return true;
    }

    case 'swapSides': {
      // Captain trades two members on opposite Skirmish sides.
      if (!party) return true;
      if (party.members[0] !== me) return error(ws, 'Only the captain can choose the sides'), true;
      const a = party.members[msg.a], b = party.members[msg.b];
      if (!a || !b || party.sides[a] === party.sides[b]) return true;
      [party.sides[a], party.sides[b]] = [party.sides[b], party.sides[a]];
      broadcast(party);
      return true;
    }

    case 'shuffleSides': {
      if (!party) return true;
      if (party.members[0] !== me) return error(ws, 'Only the captain can choose the sides'), true;
      const order = [...party.members];
      for (let i = order.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1);
        [order[i], order[j]] = [order[j], order[i]];
      }
      // Deal alternately, so a warband of 2 or 4 splits evenly.
      order.forEach((id, i) => { party.sides[id] = i % 2; });
      broadcast(party);
      return true;
    }

    case 'setMode':
      if (!party) return true;
      if (party.members[0] !== me) return error(ws, 'Only the captain can choose the contract'), true;
      if (!MODES.includes(msg.mode)) return true;
      party.mode = msg.mode;
      broadcast(party);
      return true;
  }
  return false;
}

function handleClose(ws) {
  const playerId = ws.playerId;
  const session = playerId && sessions.get(playerId);
  if (!session || session.ws !== ws) return;
  session.ws = null;
  const party = parties.get(session.partyCode);
  if (party) broadcast(party); // shows them as reconnecting
  session.leaveTimer = setTimeout(() => {
    removeFromParty(playerId);
    sessions.delete(playerId);
  }, RECONNECT_GRACE_MS);
}

function usernameOf(ws) {
  return ws.username || null;
}

// The warband code to matchmake within, or null if this player isn't in a
// warband with anyone else (they use public matchmaking instead).
function matchPartyOf(ws) {
  const session = ws.playerId && sessions.get(ws.playerId);
  const party = session && parties.get(session.partyCode);
  return party && party.members.length >= 2 ? party.code : null;
}

// The warband to play Skirmish with: every member's current socket (null if
// they're reconnecting) and side. Null if this player has no warband mates.
function skirmishPartyOf(ws) {
  const session = ws.playerId && sessions.get(ws.playerId);
  const party = session && parties.get(session.partyCode);
  if (!party || party.members.length < 2) return null;
  return {
    code: party.code,
    members: party.members.map((id) => ({ ws: sessions.get(id).ws, side: party.sides[id] })),
  };
}

// How this player looks in a match (resolved colours; the default if unknown).
function lookOf(ws) {
  const session = ws.playerId && sessions.get(ws.playerId);
  return (session && session.appearance) || wardrobe.resolveLook(null);
}

function setPartyChangeListener(fn) {
  onPartyChange = fn;
}

// Push fresh gold/stats to the player's open page, if any.
function pushProfile(playerId, row) {
  const session = sessions.get(playerId);
  if (session && row) send(session.ws, { type: 'profile', profile: db.profileOf(row) });
}

module.exports = {
  handleMessage, handleClose, usernameOf, lookOf, matchPartyOf, skirmishPartyOf, pushProfile, setPartyChangeListener,
};
