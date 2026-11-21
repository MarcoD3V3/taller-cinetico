'use strict';
// =====================================================================================
//  Hierba que sale del suelo: matas de briznas por todas partes, con los colores de cada bioma
//  (verde en la pradera, amarilla en la sabana, oscura en el bosque, escarcha en la nieve…).
//  Se pinta UNA vez dentro del suelo ya cacheado (no cuesta FPS), a 1 píxel = 1 unidad como los tiles,
//  y nunca se sale de su casilla (no pisa las transiciones). Opciones › Efectos › Hierba.
// =====================================================================================
// [matas por casilla (media), altura (1 = pradera), colores: sombra, base, medio, claro, punta]
const GRASS_BY = {
  GRASS: [5.5, 1, ['#1f4019', '#2e5a26', '#467f33', '#68a646', '#94c866']], DARKGRASS: [5, 0.9, ['#142a13', '#1e3a1c', '#2c5428', '#3e6e36', '#5a8a4a']],
  JUNGLEGRASS: [6.5, 1.25, ['#123d10', '#1e5a1a', '#2c8026', '#48a83a', '#78d064']], SWAMPGRASS: [5, 1.15, ['#2a3319', '#3a4626', '#525f36', '#6e7c46', '#909c60']],
  MOSS: [3.5, 0.6, ['#2c4224', '#3e5a32', '#557644', '#749a5c', '#98b87c']], DRYGRASS: [5, 1.15, ['#4e4823', '#6a6232', '#8c8344', '#b4a962', '#d8cc8a']],
  SAND: [0.6, 0.75, ['#5e5e2c', '#7a7a3a', '#949448', '#b8b464', '#d4ce84']], REDSAND: [0.4, 0.7, ['#4e361b', '#6a4a26', '#866438', '#a88654', '#c4a470']],
  SNOW: [0.8, 0.5, ['#6e828c', '#8aa0aa', '#a8bec8', '#cddde4', '#f2f8fb']], MUD: [2, 0.9, ['#2a2a17', '#3a3a22', '#525230', '#6e6e42', '#8a8a58']],
  PEAT: [2.2, 0.9, ['#2a2717', '#3a3622', '#504a2c', '#6c663a', '#8a8450']], DIRT: [1.4, 0.7, ['#2a3c1b', '#3a5226', '#4c6a30', '#648a40', '#82a85a']],
  MYCELIUM: [2, 0.7, ['#43374a', '#5a4a5e', '#76627c', '#9a86a2', '#c2b0c8']], TOXIC: [2.2, 0.85, ['#363c1b', '#4a5226', '#66762c', '#90a83a', '#c0d85c']],
  CLAY: [0.7, 0.6, ['#36422a', '#4a5a36', '#5c7042', '#768c56', '#94a872']], SPOREFLOOR: [1.6, 0.7, ['#36361f', '#4a4a2a', '#646434', '#8a9044', '#b0b862']],
};
const _grassCol = new Map();
function grassFor(t) {
  if (_grassCol.has(t)) return _grassCol.get(t);
  let r = null; for (const k in GRASS_BY) if (G[k] === t) { const [n, h, cs] = GRASS_BY[k]; r = { n, h, cs }; }
  _grassCol.set(t, r); return r;
}
// Una mata de hierba alta: 5 a 9 briznas de hasta 12 píxeles (un tercio del personaje: no lo tapa),
// curvadas hacia un lado, más gruesas abajo, oscuras en la raíz y claras en la punta, con sombrita en el suelo.
function grassTuft(c, x, y, seed, cs, tall) {
  const n = 5 + ((hash2(x, y, seed) * 5) | 0), wind = hash2(x, y, seed + 9) < 0.5 ? -1 : 1;
  c.fillStyle = cs[0]; c.fillRect(x - (n >> 1) - 1, y + 1, n + 1, 1); // sombra en el suelo
  for (let i = 0; i < n; i++) {
    const mid = Math.abs(i - (n - 1) / 2) / ((n - 1) / 2 || 1); // las del centro, más altas
    const h = Math.max(3, Math.round((5 + hash2(x + i, y, seed + 1) * 6) * tall * (1 - mid * 0.45)));
    const bend = (hash2(x + i, y, seed + 2) * 1.6 + 0.4) * (i < n / 2 ? -1 : 1) * 0.6 + wind * 0.5, bx = x + i - (n >> 1);
    for (let j = 0; j < h; j++) {
      const k = j / h, dx = Math.round(bend * k * k * (h / 6)), col = k < 0.2 ? cs[1] : k < 0.55 ? cs[2] : k < 0.85 ? cs[3] : cs[4];
      c.fillStyle = col; c.fillRect(bx + dx, y - j, j < 2 && (i & 1) ? 2 : 1, 1);
    }
  }
}
// ---------- Flores del mundo: las de serie se cambian por las de sprites/suelo/florm_N.png ----------
// Mismo sitio, mismo tamaño (1 píxel = 1 unidad, unos 10×13) y se siguen recogiendo igual (sim/pickdecor.js)
function worldFlowers() { if (typeof CSPR === 'undefined' || !CSPR.ready) return null; const L = []; for (const [k, s] of CSPR.sets) if (/^suelo\/florm_\d+$/.test(k)) L.push(s.raw); return L.length ? L : null; }
{ const d0 = drawDecor; drawDecor = (c, x, y, t, px, py) => {
  const g = GI[t], list = DECOR_BY[g.key], fl = list && !g.solid && !g.liquid && hash2(x, y, 333) <= DECOR_DENS && worldFlowers();
  if (fl && /^flower/.test(list[(hash2(x, y, 334) * list.length) | 0])) {
    if (S && S.picked && S.picked[x + ',' + y]) return; // ya recogida
    const im = fl[(hash2(x, y, 337) * fl.length) | 0], ox = (hash2(x, y, 335) - 0.5) * 14, oy = (hash2(x, y, 336) - 0.5) * 12;
    const sm = c.imageSmoothingEnabled; c.imageSmoothingEnabled = false;
    c.drawImage(im, Math.round(px + 16 + ox - im.width / 2), Math.round(py + 25 + oy - im.height)); c.imageSmoothingEnabled = sm;
    return;
  }
  return d0(c, x, y, t, px, py);
}; }
// La hierba va por debajo de todo lo demás de la casilla (flores, piedrecitas…)
{ const d0 = drawDecor; drawDecor = (c, x, y, t, px, py) => {
  if (OPT.grass !== false) {
    const g = GI[t], gr = !g.solid && !g.liquid && grassFor(t);
    if (gr) {
      const m = Math.floor(gr.n) + (hash2(x, y, 501) < gr.n % 1 ? 1 : 0), tufts = [];
      for (let i = 0; i < m; i++) tufts.push([5 + hash2(x, y, 510 + i) * 22, 14 + hash2(x, y, 520 + i) * 16, i]); // dentro de la casilla
      tufts.sort((a, b2) => a[1] - b2[1]); // las de atrás primero: las de delante las tapan (profundidad)
      for (const [ox, oy, i] of tufts) grassTuft(c, Math.round(px + ox), Math.round(py + oy), 530 + i * 7 + x * 3 + y, gr.cs, gr.h * (0.75 + hash2(x, y, 540 + i) * 0.5));
    }
  }
  return d0(c, x, y, t, px, py);
}; }
