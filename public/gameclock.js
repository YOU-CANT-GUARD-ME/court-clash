// BLOODSWORN — a fixed game speed on every screen.
// The games move everything a set amount per step. Stepping once per screen
// refresh made 120Hz/144Hz screens play at double speed or more, so each
// frame asks how many 60-per-second steps have come due and runs that many.

const STEP_MS = 1000 / 60;
let stepClock = null, stepCarry = 0;
function stepsDue(now, maxSteps = 5) {
    if (stepClock === null)
        stepClock = now;
    // After a stall (a background tab, a slow frame) catch up at most a few steps.
    stepCarry = Math.min(stepCarry + now - stepClock, STEP_MS * maxSteps);
    stepClock = now;
    const n = Math.floor(stepCarry / STEP_MS);
    stepCarry -= n * STEP_MS;
    return n;
}
