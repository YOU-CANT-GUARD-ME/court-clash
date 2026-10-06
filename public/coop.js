// BLOODSWORN — co-op Hunt (loaded by game.html, which calls into this file).
//
// One player, the host, runs the foes exactly as a solo Hunt does and sends
// world snapshots and events through the server (see server/coop.js). Every
// player moves and shoots for themselves: other players' hits on foes go to
// the host, and each player takes damage from foe shots, explosions and
// firepots on their own screen. Fallen hunters are downed and can be raised
// by an ally standing beside them; the run ends when everyone is down.

const COOP_REVIVE_STEPS = 180;     // 3 seconds beside a downed ally
const COOP_BLEED_STEPS = 30 * 60;  // downed this long without help -> fallen until the wave is cleared
const COOP_REVIVE_RANGE = 46;
const COOP_PICK_STEPS = 20 * 60;   // the host waits this long for everyone to choose a boon
const FOE_KINDS = ['grunt', 'brute', 'bomber', 'boss'];

let coop = null;      // null for a solo Hunt; otherwise the state below
let nextFoeId = 1;

function startCoop() {
    coop = { state: 'connecting', host: false, me: null, hostId: null, peers: new Map(), gather: null,
        out: [], tick: 0, kills: {}, picks: new Set(), pickUntil: 0, breakOpen: false, revive: new Map(),
        result: null, ending: false, feed: [] };
}
function coopRunning() { return !!coop && coop.state === 'running'; }
// The host (or a solo hunter) runs the foes and applies all damage to them.
function isAuthority() { return !coop || coop.host; }
function partySize() { return coopRunning() ? coop.peers.size + 1 : 1; }
function coopSend(msg) { huntSend({ type: 'cp', ...msg }); }
// Events from the host, sent in one batch at the end of each step.
function coopEmit(ev) {
    if (coopRunning() && coop.host)
        coop.out.push(ev);
}
function coopFeed(text) {
    coop.feed.push({ text, at: performance.now() });
    if (coop.feed.length > 4)
        coop.feed.shift();
}

function makePeer(p) {
    return { id: p.id, name: p.name, look: p.look || DEFAULT_LOOK, x: 2.5 * TILE, y: 2.5 * TILE, tx: 2.5 * TILE, ty: 2.5 * TILE,
        angle: 0, ta: 0, health: 100, maxHealth: 100, displayHealth: 100, down: false, fallen: false, downLeft: 0,
        bullets: [], shootTimer: 0, moving: false };
}

// The nearest standing hunter for a foe to chase (the host's own hunter or an ally).
function targetFor(e) {
    let best = null, bestD = Infinity;
    const consider = (t) => {
        const d = Math.hypot(t.x - e.x, t.y - e.y);
        if (d < bestD) {
            bestD = d;
            best = t;
        }
    };
    if (!player.down)
        consider(player);
    if (coopRunning())
        for (const p of coop.peers.values())
            if (!p.down)
                consider(p);
    return best || player;
}

// ── messages from the server ─────────────────────────────────────────────────
function coopOnMessage(msg) {
    switch (msg.type) {
        case 'coopSolo':
            // No warband after all: hunt alone.
            coop = null;
            newGame();
            return;
        case 'coopGather':
            if (coop.state !== 'running')
                coop.state = 'gathering';
            coop.gather = msg;
            return;
        case 'coopStart':
            return coopBegin(msg);
        case 'coopPeer':
            if (msg.add) {
                coop.peers.set(msg.add.id, makePeer(msg.add));
                coopFeed(tr('coop.joined', { name: msg.add.name.toUpperCase() }));
            }
            if (msg.remove) {
                const p = coop.peers.get(msg.remove);
                if (p)
                    coopFeed(tr('coop.left', { name: p.name.toUpperCase() }));
                coop.peers.delete(msg.remove);
                coop.picks.delete(msg.remove);
            }
            return;
        case 'coopOver':
            coop.state = 'over';
            coop.result = msg;
            player.score = msg.score;
            player.wave = msg.wave;
            player.kills = msg.kills;
            huntReward = getToken() ? { state: 'saved', gold: msg.gold } : { state: 'guest' };
            gameOver = true;
            showingPowerup = false;
            return;
        case 'cp':
            if (coopRunning())
                coopOnRelay(msg);
    }
}

function coopBegin(msg) {
    coop.state = 'running';
    coop.me = msg.you;
    coop.hostId = msg.host;
    coop.host = msg.host === msg.you;
    coop.peers = new Map(msg.players.filter(p => p.id !== msg.you).map(p => [p.id, makePeer(p)]));
    // A fresh run on the map the server chose for the whole warband.
    grenades.length = 0;
    particles.length = 0;
    popups.length = 0;
    shownScore = 0;
    hudTime = 0;
    huntReward = null;
    loadMap(msg.map);
    player = makePlayer();
    notice = null;
    startHuntRun();
    enemies = coop.host ? spawnEnemies(1) : [];
    gameOver = false;
    paused = false;
    waveClearTimer = 0;
    showingPowerup = false;
    spawnCountdown = 0;
}

function foeById(id) {
    return enemies.find(e => e.id === id);
}

function coopOnRelay(msg) {
    const from = msg.from, peer = coop.peers.get(from);
    switch (msg.k) {
        case 'st':
            if (!peer)
                return;
            peer.tx = msg.x;
            peer.ty = msg.y;
            peer.ta = msg.a;
            peer.moving = msg.mv;
            peer.health = msg.h;
            peer.maxHealth = msg.mh;
            peer.down = msg.dn;
            peer.fallen = msg.fl;
            peer.downLeft = msg.dl || 0;
            return;
        case 'sh':
            if (peer) {
                peer.bullets.push(makeBullet(msg.x, msg.y, msg.a));
                peer.shootTimer = 8;
            }
            return;
        case 'gr':
            grenades.push({ x: msg.x, y: msg.y, vx: msg.vx, vy: msg.vy, fuse: 90, alive: true, owner: from });
            return;
        case 'hit': {
            // An ally's bolt struck a foe (only the host gets these).
            const e = foeById(msg.i);
            if (!coop.host || !e || !e.alive)
                return;
            e.health -= Math.max(0, Math.min(50, Number(msg.d) || 0));
            if (e.health <= 0)
                killEnemy(e, from);
            return;
        }
        case 'pick':
            if (coop.host)
                coop.picks.add(from);
            return;
        case 'rv':
            // An ally raised us.
            if (player.down && !player.fallen)
                coopRevive();
            return;
        case 'w':
            if (!coop.host)
                coopApplyWorld(msg.world);
            return;
        case 'ev':
            if (!coop.host)
                for (const ev of msg.list)
                    coopApplyEvent(ev);
    }
}

// ── the host's world, on everyone else's screen ──────────────────────────────
function coopApplyWorld(w) {
    player.wave = w.wave;
    player.score = w.score;
    spawnCountdown = w.cd;
    waveClearTimer = w.wc;
    const seen = new Set();
    for (const [id, k, x, y, a, h, m, tier, phase] of w.e) {
        seen.add(id);
        let e = foeById(id);
        if (!e) {
            const kind = FOE_KINDS[k];
            e = kind === 'brute' ? makeBrute(0, 0) : kind === 'bomber' ? makeBomber(0, 0) : kind === 'boss' ? makeBoss(0, 0, w.wave) : makeGrunt(0, 0);
            e.id = id;
            e.x = x;
            e.y = y;
            enemies.push(e);
        }
        e.tx = x;
        e.ty = y;
        e.ta = a;
        e.health = h;
        e.maxHealth = m;
        if (e.kind === 'boss') {
            e.tier = tier;
            if (phase === 2 && e.phase === 1)
                e.angerTimer = 60;
            e.phase = phase;
        }
    }
    // Foes the host no longer has are gone (their kill event usually came first).
    enemies = enemies.filter(e => seen.has(e.id) && e.alive);
}

function coopApplyEvent(ev) {
    switch (ev.k) {
        case 'eb': {
            // A foe fired: the same bolt flies on our screen and may hit us.
            const b = makeBullet(ev.x, ev.y, ev.a, ev.s);
            b.dmg = ev.d;
            const e = foeById(ev.i);
            if (e)
                e.bullets.push(b);
            return;
        }
        case 'boom':
            foeExplosion(ev.x, ev.y, ev.r);
            return;
        case 'kill': {
            const e = foeById(ev.i);
            if (e)
                e.alive = false;
            addPopup(ev.x, ev.y, '+' + ev.p);
            spawnParticles(ev.x, ev.y, '#8c0a0a', ev.big ? 25 : 15, 1.5, 5, 35, 3);
            if (ev.by === coop.me)
                player.kills++;
            return;
        }
        case 'spawn':
            player.spawnImmunity = 180;
            return;
        case 'boons':
            coopWaveBreak();
            return;
    }
}

// Damage to us from a sapper blowing up near (x, y).
function foeExplosion(x, y, r) {
    spawnParticles(x, y, '#ffb420', 40, 2, 12, 40, 3);
    spawnParticles(x, y, '#ff5010', 20, 1, 6, 30, 4);
    spawnParticles(x, y, '#505038', 15, 1, 5, 50, 4);
    if (player.spawnImmunity > 0 || player.down)
        return;
    const d = Math.hypot(player.x - x, player.y - y);
    if (d < r) {
        const red = player.damageReduction || 0;
        player.health -= Math.max(1, Math.floor(55 * (1 - (d / r) * 0.5) * (1 - red)));
        player.hurtTimer = 45;
    }
}

// The wave is cleared: heal, raise the downed and fallen, choose a boon.
function coopWaveBreak() {
    if (player.down)
        coopRevive();
    player.health = Math.min(player.maxHealth, player.health + Math.round(player.maxHealth * player.waveHeal));
    showingPowerup = true;
    powerupOptions = [...POWERUPS].sort(() => Math.random() - 0.5).slice(0, 3);
    powerupHovered = -1;
    coop.waitingForBand = false;
}

function coopRevive() {
    player.down = false;
    player.fallen = false;
    player.health = Math.max(player.health, Math.round(player.maxHealth * 0.5));
    player.spawnImmunity = 120;
}

// We chose our boon. The host starts the next wave once everyone has.
function coopPicked() {
    coop.waitingForBand = true;
    if (coop.host)
        coop.picks.add(coop.me);
    else
        coopSend({ k: 'pick', to: 'host' });
}

// ── every step, while a co-op run is on ──────────────────────────────────────
function coopStep() {
    coop.tick++;
    // Going down, bleeding out.
    if (player.health <= 0 && !player.down) {
        player.down = true;
        player.health = 0;
        player.downLeft = COOP_BLEED_STEPS;
        player.bullets.length = 0;
        mouseDown = false;
    }
    if (player.down && !player.fallen && --player.downLeft <= 0)
        player.fallen = true;
    if (player.down && player.hurtTimer > 0)
        player.hurtTimer--;
    // Allies glide toward their last reported spot; their bolts fly on.
    for (const p of coop.peers.values()) {
        p.x += (p.tx - p.x) * 0.3;
        p.y += (p.ty - p.y) * 0.3;
        p.angle = lerpAngle(p.angle, p.ta, 0.3);
        if (p.shootTimer > 0)
            p.shootTimer--;
        for (let i = p.bullets.length - 1; i >= 0; i--) {
            updateBullet(p.bullets[i]);
            if (!p.bullets[i].alive)
                p.bullets.splice(i, 1);
        }
    }
    // Raise a downed ally by standing beside them.
    for (const p of coop.peers.values()) {
        const near = !player.down && p.down && !p.fallen && Math.hypot(p.x - player.x, p.y - player.y) < COOP_REVIVE_RANGE;
        const prog = near ? (coop.revive.get(p.id) || 0) + 1 : Math.max(0, (coop.revive.get(p.id) || 0) - 2);
        if (prog >= COOP_REVIVE_STEPS) {
            coopSend({ k: 'rv', to: p.id });
            p.down = false; // until their next report confirms it
            coop.revive.set(p.id, 0);
        }
        else
            coop.revive.set(p.id, prog);
    }
    if (coop.tick % 3 === 0)
        coopSend({ k: 'st', x: Math.round(player.x), y: Math.round(player.y), a: +player.angle.toFixed(2), mv: player.moving,
            h: Math.max(0, Math.ceil(player.health)), mh: player.maxHealth, dn: !!player.down, fl: !!player.fallen,
            dl: player.downLeft || 0 });
    if (!coop.host) {
        coopPeerFoes();
        return;
    }
    // Host: share the world, start the next wave when everyone has chosen,
    // and end the run when the whole warband is down.
    if (coop.breakOpen) {
        const all = [coop.me, ...coop.peers.keys()].every(id => coop.picks.has(id));
        if (all || coop.tick > coop.pickUntil) {
            coop.breakOpen = false;
            coop.waitingForBand = false;
            showingPowerup = false;
            spawnCountdown = 180;
        }
    }
    if (coop.tick % 6 === 0)
        coopSend({ k: 'w', world: {
            wave: player.wave, score: player.score, cd: spawnCountdown, wc: waveClearTimer, kills: coop.kills,
            e: enemies.filter(e => e.alive).map(e => [e.id, FOE_KINDS.indexOf(e.kind), Math.round(e.x), Math.round(e.y),
                +e.angle.toFixed(2), Math.ceil(e.health), e.maxHealth, e.tier || 0, e.phase || 1]),
        } });
    if (coop.out.length) {
        coopSend({ k: 'ev', list: coop.out });
        coop.out = [];
    }
    const everyoneDown = player.down && [...coop.peers.values()].every(p => p.down);
    if (everyoneDown && !coop.ending) {
        coop.ending = true;
        huntSend({ type: 'coopEnd', score: player.score, wave: player.wave, kills: coop.kills });
    }
}

// Not the host: foes glide toward the host's positions, and their bolts fly.
function coopPeerFoes() {
    if (spawnCountdown > 0)
        spawnCountdown--;
    for (const e of enemies) {
        if (!e.alive)
            continue;
        e.x += (e.tx - e.x) * 0.3;
        e.y += (e.ty - e.y) * 0.3;
        e.angle = lerpAngle(e.angle, e.ta, 0.3);
        e.bob += 0.1;
        if (e.angerTimer > 0)
            e.angerTimer--;
        handleEnemyBullets(e, player);
    }
}

// The host opens a break between waves: everyone chooses a boon.
function coopOpenBreak() {
    coop.picks = new Set();
    coop.pickUntil = coop.tick + COOP_PICK_STEPS;
    coop.breakOpen = true;
    coopEmit({ k: 'boons' });
    coopWaveBreak();
}

function lerpAngle(a, b, t) {
    const diff = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return a + diff * t;
}

// ── drawing ──────────────────────────────────────────────────────────────────
function drawPeers(camX, camY) {
    for (const p of coop.peers.values()) {
        const sx = p.x - camX, sy = p.y - camY, r = 12;
        for (const b of p.bullets)
            drawBolt(b, camX, camY, '#c8b48a', '#eef0f2', trailOf(p.look, b));
        ctx.save();
        if (p.down)
            ctx.globalAlpha = 0.55;
        drawMercenary(sx, sy, r, p.angle, p.look);
        ctx.restore();
        if (p.down) {
            // A ring that fills while someone raises them.
            const prog = (coop.revive.get(p.id) || 0) / COOP_REVIVE_STEPS;
            ctx.save();
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(10,8,7,0.8)';
            ctx.beginPath();
            ctx.arc(sx, sy, 22, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = p.fallen ? '#6a5e50' : '#e0503a';
            ctx.beginPath();
            ctx.arc(sx, sy, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (p.fallen ? 1 : prog || 0.001));
            ctx.stroke();
            ctx.restore();
        }
        drawText(p.name.toUpperCase(), sx, sy - r - 18, { size: 10, align: 'center', color: p.down ? '#9a8b74' : '#f0d890', spacing: 1,
            shadow: 'rgba(0,0,0,0.85)', shadowOffset: 1 });
        if (!p.down) {
            p.displayHealth += (p.health - p.displayHealth) * 0.15;
            const [hA, hB] = healthColors(p.health / p.maxHealth * 100);
            meter(sx - 17, sy - r - 12, 34, 5, p.displayHealth / p.maxHealth, hA, hB);
        }
    }
}

// Our band, under the war map (the top left is where everyone spawns).
function bandPanelBottom() {
    return 16 + MAP_H * MM_SCALE + 40 + 12 + 30 + coop.peers.size * 30;
}
function drawBandPanel() {
    const peers = [...coop.peers.values()];
    if (!peers.length)
        return;
    const w = 220, rowH = 30, h = 30 + peers.length * rowH, x = W - w - 16, y = 16 + MAP_H * MM_SCALE + 40 + 12;
    panel(x, y, w, h, { accent: UI.orange });
    drawText(tr('sk.yourBand'), x + 14, y + 20, { size: 9, color: UI.muted, spacing: 2 });
    peers.forEach((p, i) => {
        const ry = y + 28 + i * rowH;
        drawText(p.name.toUpperCase(), x + 14, ry + 12, { size: 11, family: 'display', color: p.down ? UI.muted : UI.paper });
        const state = p.fallen ? tr('coop.fallenShort') : p.down ? `${tr('sk.down')} ${Math.ceil(p.downLeft / 60)}s` : String(Math.ceil(p.health));
        const [hA, hB] = healthColors(p.health / p.maxHealth * 100);
        drawText(state, x + w - 14, ry + 12, { size: 11, family: 'num', align: 'right', color: p.down ? UI.red : hA });
        meter(x + 14, ry + 17, w - 28, 6, p.down ? 0 : p.health / p.maxHealth, hA, hB);
    });
}

// Edge arrows toward allies out of view, and the knock-down/join feed.
function drawCoopMarkers(camX, camY) {
    for (const p of coop.peers.values()) {
        const ox = p.x - camX, oy = p.y - camY, m = 40;
        if (ox > -10 && ox < W + 10 && oy > -10 && oy < H + 10)
            continue;
        const ang = Math.atan2(oy - H / 2, ox - W / 2);
        const ex = Math.max(m, Math.min(W - m, ox)), ey = Math.max(130, Math.min(H - 120, oy));
        ctx.save();
        ctx.translate(ex, ey);
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(10,8,7,0.85)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = p.down ? UI.red : UI.gold;
        ctx.stroke();
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(1, -7);
        ctx.lineTo(1, 7);
        ctx.closePath();
        ctx.fillStyle = p.down ? UI.red : UI.gold;
        ctx.fill();
        ctx.restore();
    }
    const now = performance.now();
    let y = bandPanelBottom() + 12;
    for (const item of coop.feed) {
        const age = (now - item.at) / 1000;
        if (age > 6)
            continue;
        const w = textWidth(item.text, 10, 'ui', 1) + 24;
        ctx.save();
        ctx.globalAlpha = age > 5 ? 6 - age : 1;
        panel(W - 16 - w, y, w, 26, { r: 13, shadow: false });
        drawText(item.text, W - 16 - w / 2, y + 17, { size: 10, align: 'center', spacing: 1 });
        ctx.restore();
        y += 32;
    }
}

// Shown over the world while we're down.
function drawDownedBanner() {
    const title = player.fallen ? tr('coop.fallen') : tr('coop.down');
    const sub = player.fallen ? tr('coop.fallenSub') : tr('coop.downSub', { n: Math.ceil(player.downLeft / 60) });
    vignette('120,0,0', 0.35);
    drawText(title, W / 2, H * 0.42, { size: Math.min(44, W / 18), family: 'display', align: 'center', color: '#c4281e', shadow: '#000', shadowOffset: 3, spacing: 2 });
    drawText(sub, W / 2, H * 0.42 + 30, { size: 12, align: 'center', color: UI.paper, spacing: 3, shadow: '#000', shadowOffset: 1 });
}

// Before the run: waiting for the rest of the warband.
function drawGathering() {
    backdrop('#1a0c0a');
    const g = coop.gather;
    const left = g ? Math.max(0, Math.ceil((g.startsAt - Date.now()) / 1000)) : null;
    drawText(tr('coop.gathering'), W / 2, H / 2 - 20, { size: Math.min(44, W / 16), family: 'display', align: 'center', shadow: UI.orangeD, shadowOffset: 3, spacing: 2 });
    const sub = g ? tr('coop.gatherSub', { arrived: g.arrived, total: g.total, n: left }) : tr('status.connecting');
    drawText(sub, W / 2, H / 2 + 14, { size: 12, align: 'center', color: UI.gold, spacing: 3 });
    button(tr('btn.retreat'), 'Q', W / 2 - 100, H / 2 + 50, 200, 50, goToLobby, false);
}

// Over the boon cards once we've chosen and others are still choosing.
function drawWaitingForBand() {
    drawText(tr('coop.waiting'), W / 2, H - 40, { size: 12, align: 'center', color: UI.gold, spacing: 3, alpha: 0.6 + Math.abs(Math.sin(Date.now() * 0.004)) * 0.4 });
}
