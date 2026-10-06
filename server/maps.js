// BLOODSWORN — which arenas the Duel and Skirmish can use, and where players
// spawn on each (map tile units). The layouts are in public/maps.js; every
// spawn here must be open floor there. The server picks a random map per
// match and tells the players, so everyone fights in the same arena.

const crypto = require('crypto');

const DUEL = {
  keep: [{ x: 2.5, y: 2.5 }, { x: 31.5, y: 17.5 }],
  wood: [{ x: 2.5, y: 2.5 }, { x: 31.5, y: 17.5 }],
  frost: [{ x: 2.5, y: 2.5 }, { x: 31.5, y: 17.5 }],
};

// Players 0–1 (team 0) on the left, 2–3 (team 1) on the right.
const SKIRMISH_SPAWNS = [{ x: 3.5, y: 5.5 }, { x: 3.5, y: 18.5 }, { x: 36.5, y: 5.5 }, { x: 36.5, y: 18.5 }];
const SKIRMISH = { keep: SKIRMISH_SPAWNS, wood: SKIRMISH_SPAWNS, frost: SKIRMISH_SPAWNS };

function randomMap(maps) {
  const ids = Object.keys(maps);
  return ids[crypto.randomInt(ids.length)];
}

module.exports = { DUEL, SKIRMISH, randomMap };
