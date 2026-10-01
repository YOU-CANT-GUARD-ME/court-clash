// BLOODSWORN — database access (Postgres; Neon in production)
// The schema is created on startup if it doesn't exist yet, so a fresh Neon
// database needs no manual setup beyond setting DATABASE_URL.

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Set it to your Neon Postgres connection string (see README).');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
pool.on('error', (err) => console.error('Postgres pool error:', err.message));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS players (
  id             uuid PRIMARY KEY,
  username       text NOT NULL,
  username_lower text NOT NULL UNIQUE,
  password_hash  text NOT NULL,
  gold           integer NOT NULL DEFAULT 0,
  hunt_runs      integer NOT NULL DEFAULT 0,
  best_bounty    integer NOT NULL DEFAULT 0,
  best_wave      integer NOT NULL DEFAULT 0,
  total_kills    integer NOT NULL DEFAULT 0,
  duel_wins      integer NOT NULL DEFAULT 0,
  duel_losses    integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  player_id  uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_player_idx ON sessions (player_id);
CREATE INDEX IF NOT EXISTS players_bounty_idx ON players (best_bounty DESC);
CREATE INDEX IF NOT EXISTS players_duel_idx ON players (duel_wins DESC);
`;

async function init() {
  await pool.query(SCHEMA);
}

// What a player is allowed to see about themselves.
function profileOf(row) {
  return {
    username: row.username,
    gold: row.gold,
    huntRuns: row.hunt_runs,
    bestBounty: row.best_bounty,
    bestWave: row.best_wave,
    totalKills: row.total_kills,
    duelWins: row.duel_wins,
    duelLosses: row.duel_losses,
  };
}

async function one(sql, params) {
  const { rows } = await pool.query(sql, params);
  return rows[0] || null;
}

// Returns null if the username is already taken (case-insensitive).
async function createPlayer(id, username, passwordHash) {
  try {
    return await one(
      `INSERT INTO players (id, username, username_lower, password_hash)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, username, username.toLowerCase(), passwordHash],
    );
  } catch (err) {
    if (err.code === '23505') return null; // unique violation
    throw err;
  }
}

function playerByUsername(username) {
  return one('SELECT * FROM players WHERE username_lower = $1', [username.toLowerCase()]);
}

function createSession(tokenHash, playerId) {
  return pool.query('INSERT INTO sessions (token_hash, player_id) VALUES ($1, $2)', [tokenHash, playerId]);
}

function playerBySession(tokenHash) {
  return one(
    `UPDATE sessions SET last_seen = now() WHERE token_hash = $1
     RETURNING (SELECT row_to_json(p) FROM players p WHERE p.id = sessions.player_id) AS player`,
    [tokenHash],
  ).then((r) => r && r.player);
}

function deleteSession(tokenHash) {
  return pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
}

function recordHunt(playerId, { score, wave, kills, gold }) {
  return one(
    `UPDATE players SET
       gold = gold + $2, hunt_runs = hunt_runs + 1,
       best_bounty = GREATEST(best_bounty, $3), best_wave = GREATEST(best_wave, $4),
       total_kills = total_kills + $5
     WHERE id = $1 RETURNING *`,
    [playerId, gold, score, wave, kills],
  );
}

function recordDuel(playerId, won, gold) {
  return one(
    `UPDATE players SET
       gold = gold + $3,
       duel_wins = duel_wins + CASE WHEN $2 THEN 1 ELSE 0 END,
       duel_losses = duel_losses + CASE WHEN $2 THEN 0 ELSE 1 END
     WHERE id = $1 RETURNING *`,
    [playerId, won, gold],
  );
}

async function leaderboard() {
  const [hunt, duel] = await Promise.all([
    pool.query(
      `SELECT username, best_bounty AS "bestBounty", best_wave AS "bestWave"
       FROM players WHERE best_bounty > 0
       ORDER BY best_bounty DESC, best_wave DESC, created_at LIMIT 10`,
    ),
    pool.query(
      `SELECT username, duel_wins AS wins, duel_losses AS losses
       FROM players WHERE duel_wins + duel_losses > 0
       ORDER BY duel_wins DESC, duel_losses ASC, created_at LIMIT 10`,
    ),
  ]);
  return { hunt: hunt.rows, duel: duel.rows };
}

module.exports = {
  init, profileOf, createPlayer, playerByUsername, createSession, playerBySession,
  deleteSession, recordHunt, recordDuel, leaderboard,
};
