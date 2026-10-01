// COURT CLASH — lobby: usernames + parties
// Usernames are persisted to users.json, keyed by a random userId that only the
// owning browser knows (it keeps it in localStorage and sends it on connect).
// Parties are in-memory. A party's members array is kept in join order, so
// members[0] is always the party leader (the person who has been in longest).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USERS_FILE = process.env.USERS_FILE || path.join(__dirname, 'users.json');
const PARTY_SIZE = 4;
const MODES = ['hunt', 'showdown'];
const NAME_RE = /^[A-Za-z0-9_]{3,16}$/;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I
// A disconnected player keeps their slot this long, so a page refresh
// doesn't kick them out of the party (or cost them party leader).
const RECONNECT_GRACE_MS = 15000;

let users = {}; // userId -> { username, createdAt }
try {
  users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
} catch (err) {
  if (err.code !== 'ENOENT') console.error('Could not read users file:', err.message);
}

function saveUsers() {
  // Write to a temp file then rename, so a crash mid-write can't corrupt it.
  const tmp = USERS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(users, null, 2));
  fs.renameSync(tmp, USERS_FILE);
}

const sessions = new Map(); // userId -> { ws, partyCode, leaveTimer }
const parties = new Map();  // code -> { code, mode, members: [userId, ...] }

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
    username: users[id].username,
    leader: i === 0,
    online: !!sessions.get(id)?.ws,
  }));
  party.members.forEach((id, i) => {
    send(sessions.get(id)?.ws, {
      type: 'party',
      code: party.code,
      mode: party.mode,
      youAreLeader: i === 0,
      members: members.map((m, j) => ({ ...m, you: i === j })),
    });
  });
}

function addToParty(party, userId) {
  party.members.push(userId);
  sessions.get(userId).partyCode = party.code;
  broadcast(party);
}

function createParty(userId) {
  const party = { code: makeCode(), mode: 'hunt', members: [] };
  parties.set(party.code, party);
  addToParty(party, userId);
}

function removeFromParty(userId) {
  const session = sessions.get(userId);
  const party = session && parties.get(session.partyCode);
  if (!party) return;
  party.members = party.members.filter((id) => id !== userId);
  session.partyCode = null;
  if (party.members.length === 0) parties.delete(party.code);
  else broadcast(party); // if the leader left, members[0] is now the new leader
}

function attach(ws, userId) {
  let session = sessions.get(userId);
  if (session) {
    clearTimeout(session.leaveTimer);
    if (session.ws && session.ws !== ws) {
      // Same account opened in another tab: the newest tab wins.
      const old = session.ws;
      old.lobbyUserId = null;
      send(old, { type: 'replaced' });
      old.close();
    }
    session.ws = ws;
  } else {
    session = { ws, partyCode: null, leaveTimer: null };
    sessions.set(userId, session);
  }
  ws.lobbyUserId = userId;
  send(ws, { type: 'welcome', userId, username: users[userId].username });

  const party = parties.get(session.partyCode);
  if (party) broadcast(party);
  else createParty(userId);
}

// Returns true if the message was a lobby message (handled here).
function handleMessage(ws, msg) {
  const me = ws.lobbyUserId;
  const party = me && parties.get(sessions.get(me).partyCode);

  switch (msg.type) {
    case 'hello':
      if (typeof msg.userId === 'string' && users[msg.userId]) attach(ws, msg.userId);
      else send(ws, { type: 'needUsername' });
      return true;

    case 'setUsername': {
      if (me) return true; // already registered; no renames yet
      const name = String(msg.username || '').trim();
      if (!NAME_RE.test(name)) {
        error(ws, 'Use 3–16 letters, numbers or _');
        return true;
      }
      const lower = name.toLowerCase();
      if (Object.values(users).some((u) => u.username.toLowerCase() === lower)) {
        error(ws, 'That name is already sworn');
        return true;
      }
      const userId = crypto.randomUUID();
      users[userId] = { username: name, createdAt: new Date().toISOString() };
      saveUsers();
      attach(ws, userId);
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
      // Leader pressed PLAY: bring everyone else in the party along.
      if (!party || party.members[0] !== me) return true;
      party.members.slice(1).forEach((id) => send(sessions.get(id)?.ws, { type: 'launch', mode: party.mode }));
      return true;

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
  const userId = ws.lobbyUserId;
  const session = userId && sessions.get(userId);
  if (!session || session.ws !== ws) return;
  session.ws = null;
  const party = parties.get(session.partyCode);
  if (party) broadcast(party); // shows them as reconnecting
  session.leaveTimer = setTimeout(() => {
    removeFromParty(userId);
    sessions.delete(userId);
  }, RECONNECT_GRACE_MS);
}

function usernameOf(ws) {
  return ws.lobbyUserId ? users[ws.lobbyUserId].username : null;
}

// The party code to matchmake within, or null if this player isn't in a
// party with anyone else (they use public matchmaking instead).
function matchPartyOf(ws) {
  const session = ws.lobbyUserId && sessions.get(ws.lobbyUserId);
  const party = session && parties.get(session.partyCode);
  return party && party.members.length >= 2 ? party.code : null;
}

module.exports = { handleMessage, handleClose, usernameOf, matchPartyOf };
