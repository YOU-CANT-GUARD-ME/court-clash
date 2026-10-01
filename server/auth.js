// BLOODSWORN — passwords and session tokens
// Passwords are hashed with scrypt (built into Node). Session tokens are random
// and only their SHA-256 hash is stored, so a database leak can't be replayed.

const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const KEY_LEN = 64;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, KEY_LEN);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const [scheme, saltHex, keyHex] = String(stored).split('$');
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return false;
  const key = await scrypt(password, Buffer.from(saltHex, 'hex'), KEY_LEN);
  return crypto.timingSafeEqual(key, Buffer.from(keyHex, 'hex'));
}

// Run when a username doesn't exist, so failed logins take the same time
// either way and don't reveal which usernames are registered.
const DUMMY_HASH = hashPassword('not-a-real-password');
async function burnTime(password) {
  await verifyPassword(password, await DUMMY_HASH);
}

function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

module.exports = { hashPassword, verifyPassword, burnTime, newToken, hashToken };
