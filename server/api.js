// BLOODSWORN — HTTP API (shares the port with the WebSocket server)
//   GET  /                 health check (Render pings this)
//   GET  /api/leaderboard  top Hunt bounties and Duel records
//   GET  /api/me           your profile          (Authorization: Bearer <token>)
//   POST /api/hunt         record a finished Hunt (Authorization: Bearer <token>)
//   POST /api/hunt/start   begin a Hunt run; rolls the Prism event's rainbow shot
//   POST /api/hunt/prism   claim a rainbow-bolt hit for the current run

const db = require('./db');
const auth = require('./auth');
const lobby = require('./lobby');
const events = require('./events');
const wardrobe = require('./wardrobe');

const HUNT_COOLDOWN_MS = 10000; // one result per player per 10s
const lastHunt = new Map(); // playerId -> time of last accepted result

const CORS = {
  // Tokens travel in a header, not cookies, so any origin may call the API.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS });
  res.end(JSON.stringify(body));
}

function readJson(req, limit = 2048) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > limit) {
        reject(Object.assign(new Error('too large'), { status: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch { reject(Object.assign(new Error('bad json'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

async function playerFromRequest(req) {
  const m = /^Bearer\s+(\S+)$/.exec(req.headers.authorization || '');
  return m ? db.playerBySession(auth.hashToken(m[1])) : null;
}

// The Hunt runs in the browser, so results are client-reported. These bounds
// reject impossible numbers; they can't stop a careful cheat (see README).
function validHunt(body) {
  const n = (v) => (Number.isInteger(v) && v >= 0 ? v : -1);
  const score = n(body.score), wave = n(body.wave), kills = n(body.kills);
  if (score < 0 || kills < 0 || wave < 1 || wave > 500) return null;
  if (kills > wave * 40) return null;
  if (score > (wave - 1) * 500 + kills * 1000) return null;
  return { score, wave, kills, gold: Math.floor(score / 10) };
}

async function handle(req, res) {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS);
      return res.end();
    }
    if (req.method === 'GET' && path === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain', ...CORS });
      return res.end('Bloodsworn server is running.');
    }
    if (req.method === 'GET' && path === '/api/leaderboard')
      return json(res, 200, await db.leaderboard());

    if (req.method === 'GET' && path === '/api/me') {
      const player = await playerFromRequest(req);
      return player ? json(res, 200, db.profileOf(player)) : json(res, 401, { error: 'Not signed in' });
    }

    if (req.method === 'POST' && path === '/api/hunt') {
      const player = await playerFromRequest(req);
      if (!player) return json(res, 401, { error: 'Not signed in' });
      const run = validHunt(await readJson(req));
      if (!run) return json(res, 400, { error: 'That result is not possible' });
      const now = Date.now();
      if (now - (lastHunt.get(player.id) || 0) < HUNT_COOLDOWN_MS) return json(res, 429, { error: 'Too soon' });
      lastHunt.set(player.id, now);
      const row = await db.recordHunt(player.id, run);
      lobby.pushProfile(player.id, row);
      return json(res, 200, { gold: run.gold, profile: db.profileOf(row) });
    }

    if (req.method === 'POST' && path === '/api/hunt/start') {
      const player = await playerFromRequest(req);
      if (!player) return json(res, 401, { error: 'Not signed in' });
      const prize = events.PRISM.item;
      const run = events.startRun(player.id, wardrobe.owns(player.owned, prize.slot, prize.id));
      if (!run) return json(res, 429, { error: 'Too soon', event: events.eventInfo() });
      return json(res, 200, { runId: run.runId, prismShot: run.prismShot, event: events.eventInfo() });
    }

    if (req.method === 'POST' && path === '/api/hunt/prism') {
      const player = await playerFromRequest(req);
      if (!player) return json(res, 401, { error: 'Not signed in' });
      const body = await readJson(req);
      const result = events.claimPrism(player.id, String(body.runId || ''));
      if (result.error) return json(res, 400, { error: result.error });
      const row = await db.grantItem(player.id, wardrobe.key(result.item.slot, result.item.id));
      lobby.pushProfile(player.id, row);
      return json(res, 200, { granted: result.item, profile: db.profileOf(row) });
    }

    json(res, 404, { error: 'Not found' });
  } catch (err) {
    if (!err.status) console.error('API error:', err);
    if (!res.headersSent) json(res, err.status || 500, { error: err.status ? 'Bad request' : 'Server error' });
  }
}

module.exports = { handle };
