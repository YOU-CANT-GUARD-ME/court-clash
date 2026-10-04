// BLOODSWORN — the wardrobe: how a mercenary looks, and titles.
// Looks are cosmetic only. The first item in each slot is the default; items
// with cost 0 are free for everyone, the rest are bought once with gold,
// except limited items (cost null), which are only granted by events.
// The server resolves a player's chosen ids into colours (resolveLook), so
// colours and prices live only here; public/mercenary.js draws the result
// and knows the helm styles by id.

const SLOTS = {
  cloak: [
    { id: 'umber', cost: 0, cloak: '#3a2a1e', cloakDark: '#0e0a07' },
    { id: 'moss', cost: 0, cloak: '#2a3420', cloakDark: '#0a0d07' },
    { id: 'slate', cost: 0, cloak: '#2a2e36', cloakDark: '#08090b' },
    { id: 'wine', cost: 300, cloak: '#4a1420', cloakDark: '#120508' },
    { id: 'midnight', cost: 400, cloak: '#1c2244', cloakDark: '#06070f' },
    { id: 'ash', cost: 600, cloak: '#8a8478', cloakDark: '#2a2722' },
    { id: 'blood', cost: 800, cloak: '#7a0e0e', cloakDark: '#1a0303' },
    { id: 'raven', cost: 1000, cloak: '#1a1a1e', cloakDark: '#000000' },
  ],
  trim: [
    { id: 'brass', cost: 0, trim: '#c9a24a', metal: '#9aa0a8' },
    { id: 'iron', cost: 0, trim: '#8a8478', metal: '#7a7e84' },
    { id: 'bronze', cost: 300, trim: '#c07a3a', metal: '#a87a50' },
    { id: 'silver', cost: 500, trim: '#dce0e8', metal: '#c8ccd4' },
    { id: 'blackiron', cost: 700, trim: '#4a4440', metal: '#3a3836' },
    { id: 'gilded', cost: 1200, trim: '#f0cc5a', metal: '#e0c070' },
  ],
  helm: [
    { id: 'sallet', cost: 0 },
    { id: 'hood', cost: 0 },
    { id: 'great', cost: 500 },
    { id: 'horned', cost: 900 },
    { id: 'crowned', cost: 1500 },
  ],
  trail: [
    { id: 'none', cost: 0, trail: null },
    { id: 'ember', cost: 400, trail: '#ff7a2a' },
    { id: 'frost', cost: 400, trail: '#8ad8ff' },
    { id: 'venom', cost: 600, trail: '#7aff5a' },
    { id: 'blood', cost: 800, trail: '#ff2a2a' },
    { id: 'shadow', cost: 1000, trail: '#a05aff' },
    // Limited: only won during the Prism event (see events.js), never sold.
    // 'prism' is drawn as a shifting rainbow by public/mercenary.js.
    { id: 'prismatic', cost: null, limited: 'prism', trail: 'prism' },
  ],
};

// Titles are earned: `stat` is a profile field (see db.profileOf) that must
// reach `n`. 'none' means no title.
const TITLES = [
  { id: 'none', stat: null, n: 0 },
  { id: 'sellsword', stat: null, n: 0 },
  { id: 'relentless', stat: 'huntRuns', n: 25 },
  { id: 'butcher', stat: 'totalKills', n: 100 },
  { id: 'slayer', stat: 'totalKills', n: 1000 },
  { id: 'survivor', stat: 'bestWave', n: 10 },
  { id: 'warlordbane', stat: 'bestWave', n: 16 },
  { id: 'duelist', stat: 'duelWins', n: 10 },
  { id: 'champion', stat: 'duelWins', n: 50 },
  { id: 'brother', stat: 'skirmishWins', n: 10 },
  { id: 'warmaster', stat: 'skirmishWins', n: 50 },
];
const TITLE_BY_ID = new Map(TITLES.map((t) => [t.id, t]));

function itemOf(slot, id) {
  return (SLOTS[slot] || []).find((it) => it.id === id) || null;
}

// The player's chosen item in a slot, falling back to the default.
function chosen(look, slot) {
  return itemOf(slot, look && look[slot]) || SLOTS[slot][0];
}

// Ids -> colours and styles, as public/mercenary.js expects.
function resolveLook(look) {
  const cloak = chosen(look, 'cloak'), trim = chosen(look, 'trim');
  return {
    cloak: cloak.cloak, cloakDark: cloak.cloakDark, trim: trim.trim, metal: trim.metal,
    helm: chosen(look, 'helm').id, trail: chosen(look, 'trail').trail,
  };
}

function titleOf(look) {
  const t = TITLE_BY_ID.get(look && look.title);
  return t && t.id !== 'none' ? t.id : null;
}

function key(slot, id) { return `${slot}:${id}`; }

function owns(owned, slot, id) {
  const item = itemOf(slot, id);
  return !!item && (item.cost === 0 || (owned || []).includes(key(slot, id)));
}

function titleUnlocked(profile, id) {
  const t = TITLE_BY_ID.get(id);
  return !!t && (!t.stat || (profile[t.stat] || 0) >= t.n);
}

// What the lobby needs to draw the dressing room.
const CATALOG = {
  slots: Object.fromEntries(Object.entries(SLOTS).map(([slot, items]) => [slot, items.map((it) => ({
    id: it.id, cost: it.cost, limited: it.limited || null, look: resolveLook({ [slot]: it.id }),
  }))])),
  titles: TITLES.map((t) => ({ id: t.id, stat: t.stat, n: t.n })),
};

module.exports = { CATALOG, itemOf, resolveLook, titleOf, owns, titleUnlocked, key };
