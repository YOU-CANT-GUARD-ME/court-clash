// BLOODSWORN — paints a map's floor, walls and water in one of its looks.
// Shared by the Hunt, the Duel and Skirmish. paintMap(g, size, map, look)
// draws `map` (rows of '#', '.', '~'; see maps.js) at `size` px per tile.

// Stable per-tile noise, so every stone keeps its own shade, crack or stain.
function tileHash(c, r) {
    let h = (c * 374761393 + r * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
// ── Ashen Keep: flagstones and heavy stone walls ─────────────────────────────
function paintKeep(g, size, map) {
    const W = map[0].length, H = map.length;
    g.fillStyle = '#070605';
    g.fillRect(0, 0, W * size, H * size);
    for (let row = 0; row < H; row++)
        for (let col = 0; col < W; col++) {
            const x = col * size, y = row * size, h = tileHash(col, row);
            if (map[row][col] === '#') {
                // Heavy stone wall: two courses of offset blocks with a worn top edge.
                const s = 48 + Math.floor(h * 12);
                g.fillStyle = `rgb(${s},${s - 6},${s - 12})`;
                g.fillRect(x, y, size, size);
                g.strokeStyle = 'rgba(0,0,0,0.6)';
                g.lineWidth = 2;
                g.beginPath();
                g.moveTo(x, y + size / 2);
                g.lineTo(x + size, y + size / 2);
                g.moveTo(x + size / 2, y);
                g.lineTo(x + size / 2, y + size / 2);
                g.moveTo(x, y + size / 2);
                g.lineTo(x, y + size);
                g.moveTo(x, y);
                g.lineTo(x + size, y);
                g.stroke();
                g.fillStyle = 'rgba(255,235,200,0.06)';
                g.fillRect(x, y + 1, size, 3);
                g.fillStyle = 'rgba(0,0,0,0.4)';
                g.fillRect(x, y + size - 4, size, 4);
            }
            else {
                // Flagstone floor.
                const s = 33 + Math.floor(h * 9);
                g.fillStyle = `rgb(${s},${s - 4},${s - 9})`;
                g.fillRect(x, y, size, size);
                g.strokeStyle = 'rgba(0,0,0,0.65)';
                g.lineWidth = 2;
                g.beginPath();
                g.moveTo(x, y);
                g.lineTo(x + size, y);
                g.moveTo(x, y);
                g.lineTo(x, y + size);
                g.stroke();
                if (row > 0 && map[row - 1][col] === '#') {
                    const sh = g.createLinearGradient(0, y, 0, y + size * 0.45);
                    sh.addColorStop(0, 'rgba(0,0,0,0.55)');
                    sh.addColorStop(1, 'rgba(0,0,0,0)');
                    g.fillStyle = sh;
                    g.fillRect(x, y, size, size * 0.45);
                }
                if (h > 0.94) {
                    g.strokeStyle = 'rgba(10,8,6,0.8)';
                    g.lineWidth = 1;
                    g.beginPath();
                    g.moveTo(x + size * 0.15, y + size * (0.3 + h * 0.3));
                    g.lineTo(x + size * 0.45, y + size * 0.5);
                    g.lineTo(x + size * 0.6, y + size * 0.35);
                    g.lineTo(x + size * 0.85, y + size * 0.6);
                    g.stroke();
                }
                else if (h < 0.06) {
                    g.fillStyle = 'rgba(100,12,12,0.4)';
                    g.beginPath();
                    g.ellipse(x + size * 0.5, y + size * 0.55, size * 0.3, size * 0.18, h * 40, 0, Math.PI * 2);
                    g.fill();
                }
                else if (h > 0.45 && h < 0.5) {
                    g.fillStyle = 'rgba(160,150,130,0.18)';
                    for (let i = 0; i < 4; i++)
                        g.fillRect(x + size * (0.2 + i * 0.17), y + size * (0.3 + ((i * 7) % 5) * 0.1), 2, 2);
                }
            }
        }
}

const isWallAt = (map, c, r) => r < 0 || r >= map.length || c < 0 || c >= map[0].length || map[r][c] === '#';

// ── Blighted Wood: dark earth, murky ponds, trees for cover ──────────────────
function paintWood(g, size, map) {
    const W = map[0].length, H = map.length;
    g.fillStyle = '#0c0f08';
    g.fillRect(0, 0, W * size, H * size);
    for (let row = 0; row < H; row++)
        for (let col = 0; col < W; col++) {
            const x = col * size, y = row * size, h = tileHash(col, row), ch = map[row][col];
            if (ch === '~') {
                const s = 18 + Math.floor(h * 6);
                g.fillStyle = `rgb(${s},${s + 14},${s + 12})`;
                g.fillRect(x, y, size, size);
                g.strokeStyle = 'rgba(150,180,150,0.12)';
                g.lineWidth = 1;
                g.beginPath();
                g.moveTo(x + size * 0.2, y + size * (0.3 + h * 0.4));
                g.quadraticCurveTo(x + size * 0.5, y + size * (0.2 + h * 0.4), x + size * 0.8, y + size * (0.3 + h * 0.4));
                g.stroke();
                continue;
            }
            // Earth and moss under everything (trees are painted over it below).
            const s = 34 + Math.floor(h * 10);
            g.fillStyle = `rgb(${s + 4},${s + 10},${s - 6})`;
            g.fillRect(x, y, size, size);
            if (h > 0.55) {
                // Grass tufts.
                g.strokeStyle = 'rgba(90,110,50,0.45)';
                g.beginPath();
                for (let k = 0; k < 3; k++) {
                    const gx = x + size * (0.2 + ((h * 97 + k * 31) % 1) * 0.6), gy = y + size * (0.4 + k * 0.17);
                    g.moveTo(gx, gy);
                    g.lineTo(gx - 2, gy - 6);
                    g.moveTo(gx, gy);
                    g.lineTo(gx + 2, gy - 5);
                }
                g.stroke();
            }
            else if (h < 0.08) {
                g.fillStyle = 'rgba(110,60,20,0.35)'; // fallen leaves
                for (let k = 0; k < 4; k++)
                    g.fillRect(x + size * ((h * 50 + k * 0.23) % 1), y + size * ((h * 80 + k * 0.31) % 1), 3, 2);
            }
            if (ch === '.' && !isWallAt(map, col, row) && [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dc, dr]) => map[row + dr]?.[col + dc] === '~')) {
                g.fillStyle = 'rgba(20,30,20,0.35)'; // muddy shore
                g.fillRect(x, y, size, size);
            }
        }
    // Trees: a shadow, then layered canopies that spill over their tile so
    // neighbouring trees grow into one thicket.
    for (let row = 0; row < H; row++)
        for (let col = 0; col < W; col++) {
            if (map[row][col] !== '#')
                continue;
            const h = tileHash(col, row), cx = (col + 0.5) * size, cy = (row + 0.5) * size;
            g.fillStyle = 'rgba(0,0,0,0.45)';
            g.beginPath();
            g.ellipse(cx + 4, cy + 6, size * 0.62, size * 0.5, 0, 0, Math.PI * 2);
            g.fill();
        }
    for (let row = 0; row < H; row++)
        for (let col = 0; col < W; col++) {
            if (map[row][col] !== '#')
                continue;
            const h = tileHash(col, row), cx = (col + 0.5) * size + (h - 0.5) * 6, cy = (row + 0.5) * size + (tileHash(row, col) - 0.5) * 6;
            const r = size * (0.62 + h * 0.14);
            const leaf = g.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
            const dark = 14 + Math.floor(h * 8);
            leaf.addColorStop(0, `rgb(${dark + 30},${dark + 52},${dark + 14})`);
            leaf.addColorStop(1, `rgb(${dark},${dark + 16},${Math.max(0, dark - 6)})`);
            g.fillStyle = leaf;
            g.beginPath();
            for (let k = 0; k < 7; k++) {
                const a = (k / 7) * Math.PI * 2 + h * 3, rr = r * (0.82 + ((h * 13 + k * 0.37) % 1) * 0.25);
                const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
                k ? g.lineTo(px, py) : g.moveTo(px, py);
            }
            g.closePath();
            g.fill();
            g.fillStyle = 'rgba(160,190,90,0.10)';
            g.beginPath();
            g.arc(cx - r * 0.3, cy - r * 0.3, r * 0.35, 0, Math.PI * 2);
            g.fill();
        }
}

// ── Frozen Pass: snow, open ice, snow-capped rock ────────────────────────────
function paintFrost(g, size, map) {
    const W = map[0].length, H = map.length;
    g.fillStyle = '#10141a';
    g.fillRect(0, 0, W * size, H * size);
    for (let row = 0; row < H; row++)
        for (let col = 0; col < W; col++) {
            const x = col * size, y = row * size, h = tileHash(col, row), ch = map[row][col];
            if (ch === '~') {
                const s = 58 + Math.floor(h * 10);
                g.fillStyle = `rgb(${s - 10},${s + 12},${s + 34})`;
                g.fillRect(x, y, size, size);
                g.strokeStyle = 'rgba(220,240,255,0.18)';
                g.lineWidth = 1;
                g.beginPath();
                g.moveTo(x + size * 0.1, y + size * (0.2 + h * 0.5));
                g.lineTo(x + size * 0.9, y + size * (0.1 + h * 0.5));
                g.stroke();
                if (h > 0.8) {
                    g.strokeStyle = 'rgba(10,20,30,0.45)'; // a crack
                    g.beginPath();
                    g.moveTo(x + size * 0.2, y + size * 0.7);
                    g.lineTo(x + size * 0.5, y + size * 0.45);
                    g.lineTo(x + size * 0.85, y + size * 0.6);
                    g.stroke();
                }
                continue;
            }
            const s = 92 + Math.floor(h * 14);
            g.fillStyle = `rgb(${s},${s + 6},${s + 16})`;
            g.fillRect(x, y, size, size);
            g.fillStyle = 'rgba(255,255,255,0.35)'; // sparkle
            for (let k = 0; k < 3; k++)
                g.fillRect(x + size * ((h * 41 + k * 0.29) % 1), y + size * ((h * 73 + k * 0.43) % 1), 1.5, 1.5);
            if (h < 0.1) {
                g.fillStyle = 'rgba(60,70,90,0.25)'; // a drift's shadow
                g.beginPath();
                g.ellipse(x + size * 0.5, y + size * 0.6, size * 0.4, size * 0.15, 0, 0, Math.PI * 2);
                g.fill();
            }
        }
    for (let row = 0; row < H; row++)
        for (let col = 0; col < W; col++) {
            if (map[row][col] !== '#')
                continue;
            const h = tileHash(col, row), cx = (col + 0.5) * size, cy = (row + 0.5) * size, r = size * 0.6;
            g.fillStyle = 'rgba(10,15,25,0.45)';
            g.beginPath();
            g.ellipse(cx + 4, cy + 6, r, r * 0.8, 0, 0, Math.PI * 2);
            g.fill();
            // Rock: an angular grey-blue lump with a snow cap on its top half.
            const pts = [];
            for (let k = 0; k < 6; k++) {
                const a = (k / 6) * Math.PI * 2 + h * 2, rr = r * (0.85 + ((h * 17 + k * 0.41) % 1) * 0.25);
                pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
            }
            const rock = 52 + Math.floor(h * 14);
            g.fillStyle = `rgb(${rock},${rock + 6},${rock + 16})`;
            g.beginPath();
            pts.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py)));
            g.closePath();
            g.fill();
            g.strokeStyle = 'rgba(10,15,25,0.6)';
            g.lineWidth = 1.5;
            g.stroke();
            g.save();
            g.clip();
            g.fillStyle = 'rgba(225,235,245,0.9)';
            g.beginPath();
            g.ellipse(cx - r * 0.1, cy - r * 0.45, r * 0.95, r * 0.55, -0.15, 0, Math.PI * 2);
            g.fill();
            g.restore();
        }
}

function paintMap(g, size, map, look) {
    if (look === 'wood')
        return paintWood(g, size, map);
    if (look === 'frost')
        return paintFrost(g, size, map);
    return paintKeep(g, size, map);
}
