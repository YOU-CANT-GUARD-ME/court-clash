// BLOODSWORN — the Armory: permanent Hunt upgrades bought with gold.
// The server is the only source of truth for prices and effects: the lobby
// shows this catalog, and the Hunt plays with the loadout computed here.

// Gold for each level, 1 to 5.
const COSTS = [150, 400, 800, 1500, 2500];

// `values[n]` is the stat at level n (values[0] = no upgrade). `labels` say
// the same thing for people.
const UPGRADES = [
  { id: 'mail', name: 'HARDENED MAIL', desc: 'Start every Hunt with more health.',
    stat: 'maxHealth', values: [100, 120, 140, 160, 180, 200], label: (v) => `${v} HP` },
  { id: 'quiver', name: 'DEEP QUIVER', desc: 'Carry more bolts before you must reload.',
    stat: 'magSize', values: [30, 36, 42, 48, 54, 60], label: (v) => `${v} BOLTS` },
  { id: 'bolts', name: 'BARBED BOLTS', desc: 'Every bolt bites deeper.',
    stat: 'damageMult', values: [1, 1.2, 1.4, 1.6, 1.8, 2], label: (v) => `+${Math.round((v - 1) * 100)}% DAMAGE` },
  { id: 'boots', name: 'FLEET BOOTS', desc: 'Move faster from the first step.',
    stat: 'speed', values: [3.8, 3.95, 4.1, 4.25, 4.4, 4.55], label: (v) => `SPEED ${v.toFixed(2)}` },
  { id: 'satchel', name: 'FIREPOT SATCHEL', desc: 'Start every Hunt with more firepots.',
    stat: 'firepots', values: [3, 4, 5, 6, 7, 8], label: (v) => `${v} FIREPOTS` },
  { id: 'medic', name: 'FIELD MEDIC', desc: 'Heal after every wave you repel.',
    stat: 'waveHeal', values: [0, 0.05, 0.1, 0.15, 0.2, 0.25], label: (v) => `HEAL ${Math.round(v * 100)}% / WAVE` },
];
const MAX_LEVEL = COSTS.length;
const BY_ID = new Map(UPGRADES.map((u) => [u.id, u]));

function levelOf(upgrades, id) {
  const n = Number(upgrades && upgrades[id]) || 0;
  return Math.max(0, Math.min(MAX_LEVEL, Math.floor(n)));
}

// The stats a Hunt starts with, given a player's upgrade levels.
function loadoutOf(upgrades) {
  const loadout = {};
  for (const u of UPGRADES) loadout[u.stat] = u.values[levelOf(upgrades, u.id)];
  return loadout;
}

// The price of the next level, or null if the upgrade is unknown or maxed.
function nextCost(upgrades, id) {
  if (!BY_ID.has(id)) return null;
  const level = levelOf(upgrades, id);
  return level < MAX_LEVEL ? { level: level + 1, cost: COSTS[level] } : null;
}

// What the lobby needs to draw the shop.
const CATALOG = UPGRADES.map((u) => ({
  id: u.id, name: u.name, desc: u.desc, costs: COSTS, labels: u.values.map(u.label),
}));

module.exports = { CATALOG, MAX_LEVEL, levelOf, loadoutOf, nextCost };
