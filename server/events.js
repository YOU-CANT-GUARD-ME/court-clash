// BLOODSWORN — limited-time events.
//
// The Prism (2026-10-04 to 2026-10-18): during a Hunt, one shot may fire as a
// rainbow bolt. Strike a foe with it to win the limited Prismatic trail.
//
// The Hunt runs in the browser, so the server makes the roll: when a run
// starts it secretly picks whether this run gets a rainbow shot and which
// shot it is, and it only grants the trail for that run. It also refuses a
// claim that arrives sooner than firing that many shots could take, and lets
// a player start a Hunt at most once every 20 seconds, so fishing for the
// roll is slow. A determined scripter could still claim one without hitting
// anything; this keeps it to that, not one click.

const crypto = require('crypto');

const PRISM = {
  id: 'prism',
  start: Date.parse('2026-10-04T00:00:00Z'),
  end: Date.parse('2026-10-18T00:00:00Z'),
  chance: 1 / 15,           // per Hunt
  firstShot: 15, lastShot: 120, // the rainbow shot falls in this range
  item: { slot: 'trail', id: 'prismatic' },
};
const START_COOLDOWN_MS = 20000;
const SECONDS_PER_SHOT = 4 / 60; // the Hunt's fastest fire rate (reloadCd 4 frames at 60fps)
const RUN_MAX_AGE_MS = 2 * 60 * 60 * 1000;

const runs = new Map(); // playerId -> { runId, prismShot, startedAt, claimed }

function prismActive(now = Date.now()) {
  return now >= PRISM.start && now < PRISM.end;
}

// What pages need to show the event.
function eventInfo(now = Date.now()) {
  return { id: PRISM.id, active: prismActive(now), endsAt: PRISM.end, item: PRISM.item };
}

// Starts a Hunt run. Returns null if it's too soon after the last start.
function startRun(playerId, ownsPrize, now = Date.now()) {
  const last = runs.get(playerId);
  if (last && now - last.startedAt < START_COOLDOWN_MS) return null;
  const lucky = prismActive(now) && !ownsPrize && crypto.randomInt(1_000_000) < PRISM.chance * 1_000_000;
  const run = {
    runId: crypto.randomBytes(12).toString('hex'),
    prismShot: lucky ? PRISM.firstShot + crypto.randomInt(PRISM.lastShot - PRISM.firstShot + 1) : null,
    startedAt: now,
    claimed: false,
  };
  runs.set(playerId, run);
  return run;
}

// Checks a claim of the rainbow hit. Returns the item to grant, or a reason.
function claimPrism(playerId, runId, now = Date.now()) {
  const run = runs.get(playerId);
  if (!prismActive(now)) return { error: 'The Prism event has ended' };
  if (!run || run.runId !== runId || !run.prismShot) return { error: 'No rainbow bolt was fired in this Hunt' };
  if (run.claimed) return { error: 'Already claimed' };
  const elapsed = now - run.startedAt;
  if (elapsed > RUN_MAX_AGE_MS || elapsed < run.prismShot * SECONDS_PER_SHOT * 1000) return { error: 'That claim is not possible' };
  run.claimed = true;
  return { item: PRISM.item };
}

module.exports = { PRISM, prismActive, eventInfo, startRun, claimPrism };
