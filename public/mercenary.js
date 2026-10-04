// BLOODSWORN — draws a mercenary seen from above, in their chosen look.
// Shared by the lobby (dressing room, party portraits) and every game page.
//
// A look comes from the server already resolved to colours (see
// server/wardrobe.js): { cloak, cloakDark, trim, metal, helm, trail }, where
// `helm` is a style id drawn below and `trail` is a bolt-glow colour or null.

const DEFAULT_LOOK = { cloak: '#3a2a1e', cloakDark: '#0e0a07', trim: '#c9a24a', metal: '#9aa0a8', helm: 'sallet', trail: null };

// What a bolt's glow should be for this look: its trail, else its trim.
// The limited 'prism' trail cycles through the rainbow; pass the bolt (or any
// number) as `seed` so bolts in flight shimmer out of step with each other.
function trailOf(look, seed = 0) {
    const t = (look && look.trail) || (look && look.trim) || DEFAULT_LOOK.trim;
    if (t !== 'prism')
        return t;
    const offset = typeof seed === 'object' && seed ? (seed.x + seed.y) * 0.6 : Number(seed) || 0;
    return `hsl(${Math.floor((performance.now() / 4 + offset) % 360)}, 100%, 62%)`;
}

// A rainbow running from (x0, y0) to (x1, y1), drifting over time.
function prismGradient(g, x0, y0, x1, y1) {
    const grad = g.createLinearGradient(x0, y0, x1, y1), shift = performance.now() / 4;
    for (let k = 0; k <= 6; k++)
        grad.addColorStop(k / 6, `hsl(${Math.floor((k * 60 + shift) % 360)}, 100%, 64%)`);
    return grad;
}

// Crossbow aimed along `angle`. `g` defaults to the page's own canvas context.
function drawMercenary(sx, sy, r, angle, look, g = ctx) {
    const L = { ...DEFAULT_LOOK, ...(look || {}) };
    const ca = Math.cos(angle), sa = Math.sin(angle);
    g.save();
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.beginPath();
    g.ellipse(sx, sy + r, r * 1.2, r * 0.42, 0, 0, Math.PI * 2);
    g.fill();
    // Crossbow: stock, steel limbs, string.
    g.lineCap = 'round';
    g.strokeStyle = '#2a1a0e';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(sx, sy);
    g.lineTo(sx + ca * (r + 13), sy + sa * (r + 13));
    g.stroke();
    g.strokeStyle = '#6a4a2a';
    g.lineWidth = 3;
    g.stroke();
    const lx = sx + ca * (r + 5), ly = sy + sa * (r + 5), span = 1.05, lr = 10;
    g.strokeStyle = '#b8bec6';
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(lx, ly, lr, angle - span, angle + span);
    g.stroke();
    g.strokeStyle = 'rgba(230,216,184,0.8)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(lx + Math.cos(angle - span) * lr, ly + Math.sin(angle - span) * lr);
    g.lineTo(sx + ca * (r + 1), sy + sa * (r + 1));
    g.lineTo(lx + Math.cos(angle + span) * lr, ly + Math.sin(angle + span) * lr);
    g.stroke();
    // Cloak with a trimmed hem.
    g.fillStyle = L.cloakDark;
    g.beginPath();
    g.arc(sx, sy, r + 2, 0, Math.PI * 2);
    g.fill();
    const cg = g.createRadialGradient(sx - ca * 3, sy - sa * 3, 2, sx, sy, r);
    cg.addColorStop(0, L.cloak);
    cg.addColorStop(1, L.cloakDark);
    g.fillStyle = cg;
    g.beginPath();
    g.arc(sx, sy, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = L.trim;
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(sx, sy, r - 1, 0, Math.PI * 2);
    g.stroke();
    // Pauldrons either side.
    g.fillStyle = L.metal;
    for (const side of [-1, 1]) {
        g.beginPath();
        g.arc(sx - sa * side * (r - 3), sy + ca * side * (r - 3), 3.5, 0, Math.PI * 2);
        g.fill();
    }
    drawHelm(g, sx + ca * 2, sy + sa * 2, r * 0.5, angle, L);
    g.restore();
}

function metalGradient(g, x, y, r, metal) {
    const mg = g.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r);
    mg.addColorStop(0, '#f2f4f8');
    mg.addColorStop(1, metal);
    return mg;
}

// Helm styles, all centred on (hx, hy) with radius hr, facing `angle`.
function drawHelm(g, hx, hy, hr, angle, L) {
    const ca = Math.cos(angle), sa = Math.sin(angle);
    // A point `f` along the facing and `s` to the side, in helm radii.
    const at = (f, s) => [hx + (ca * f - sa * s) * hr, hy + (sa * f + ca * s) * hr];
    const slit = () => {
        g.strokeStyle = '#0a0807';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(...at(0.4, -0.6));
        g.lineTo(...at(0.4, 0.6));
        g.stroke();
    };
    switch (L.helm) {
        case 'hood': {
            // No steel: a deep hood in the cloak's colour, the face in shadow.
            g.fillStyle = L.cloakDark;
            g.beginPath();
            g.arc(hx, hy, hr * 1.15, 0, Math.PI * 2);
            g.fill();
            const hg = g.createRadialGradient(...at(-0.4, 0), 1, hx, hy, hr * 1.1);
            hg.addColorStop(0, L.cloak);
            hg.addColorStop(1, L.cloakDark);
            g.fillStyle = hg;
            g.beginPath();
            g.arc(hx, hy, hr * 1.05, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = '#050403';
            g.beginPath();
            g.ellipse(...at(0.45, 0), hr * 0.38, hr * 0.55, angle, 0, Math.PI * 2);
            g.fill();
            return;
        }
        case 'great': {
            // Flat-topped great helm: a squared shell with a cross-shaped visor.
            g.save();
            g.translate(hx, hy);
            g.rotate(angle);
            g.fillStyle = metalGradient(g, 0, 0, hr * 1.2, L.metal);
            g.beginPath();
            g.roundRect(-hr * 1.05, -hr * 1.0, hr * 2.0, hr * 2.0, hr * 0.35);
            g.fill();
            g.strokeStyle = 'rgba(10,8,7,0.6)';
            g.lineWidth = 1;
            g.stroke();
            g.strokeStyle = '#0a0807';
            g.lineWidth = 1.6;
            g.beginPath();
            g.moveTo(hr * 0.5, -hr * 0.7);
            g.lineTo(hr * 0.5, hr * 0.7);
            g.moveTo(hr * 0.5, 0);
            g.lineTo(hr * 0.95, 0);
            g.stroke();
            g.restore();
            return;
        }
        default: {
            // Sallet (the default), plus horns or a crown on top of it.
            if (L.helm === 'horned') {
                g.strokeStyle = '#e8dcc0';
                g.lineCap = 'round';
                for (const s of [-1, 1]) {
                    g.lineWidth = 3;
                    g.beginPath();
                    g.moveTo(...at(-0.1, s * 0.8));
                    g.quadraticCurveTo(...at(-0.2, s * 1.9), ...at(-1.2, s * 2.0));
                    g.stroke();
                }
            }
            g.fillStyle = metalGradient(g, hx, hy, hr, L.metal);
            g.beginPath();
            g.arc(hx, hy, hr, 0, Math.PI * 2);
            g.fill();
            slit();
            if (L.helm === 'crowned') {
                g.strokeStyle = '#e8c860';
                g.lineWidth = 1.6;
                g.beginPath();
                g.arc(hx, hy, hr * 0.62, 0, Math.PI * 2);
                g.stroke();
                g.fillStyle = '#e8c860';
                for (let k = 0; k < 5; k++) {
                    const a = angle + Math.PI + (k - 2) * 0.55;
                    g.beginPath();
                    g.arc(hx + Math.cos(a) * hr * 0.62, hy + Math.sin(a) * hr * 0.62, 1.6, 0, Math.PI * 2);
                    g.fill();
                }
            }
        }
    }
}
