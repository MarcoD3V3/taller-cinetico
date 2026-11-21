'use strict';
// =====================================================================================
//  Hierba que sale del suelo: matas de briznas por todas partes, con los colores de cada bioma
//  (verde en la pradera, amarilla en la sabana, oscura en el bosque, escarcha en la nieve…).
//  Se pinta UNA vez dentro del suelo ya cacheado (no cuesta FPS), a 1 píxel = 1 unidad como los tiles,
//  y nunca se sale de su casilla (no pisa las transiciones). Opciones › Efectos › Hierba.
// =====================================================================================
// [matas por casilla (media), colores: base oscura, medio, punta clara]
const GRASS_BY = {
  GRASS: [3.2, ['#2e5a26', '#4a8a36', '#7ab850']], DARKGRASS: [2.6, ['#1e3a1c', '#2f5a2a', '#4a7a3a']],
  JUNGLEGRASS: [3.6, ['#1e5a1a', '#2e8a28', '#5ec850']], SWAMPGRASS: [2.6, ['#3a4626', '#56663a', '#7a8a4a']],
  MOSS: [2.4, ['#3e5a32', '#5a7e48', '#86a868']], DRYGRASS: [2.8, ['#6a6232', '#968c4a', '#c8bc78']],
  SAND: [0.35, ['#7a7a3a', '#9a9a4a', '#c8c070']], REDSAND: [0.25, ['#6a4a26', '#8a6a3a', '#b0905a']],
  SNOW: [0.5, ['#8aa0aa', '#b8ccd4', '#eef6fa']], MUD: [1.2, ['#3a3a22', '#5a5a32', '#7a7a46']], PEAT: [1.4, ['#3a3622', '#56502e', '#76703e']],
  DIRT: [0.8, ['#3a5226', '#4e6e32', '#6a8e44']], MYCELIUM: [1.2, ['#5a4a5e', '#7a6680', '#a890b0']], TOXIC: [1.4, ['#4a5226', '#6a7a2e', '#a8c040']],
  CLAY: [0.4, ['#4a5a36', '#5e7444', '#7a9058']], SPOREFLOOR: [1.0, ['#4a4a2a', '#6a6a36', '#9aa048']],
};
const _grassCol = new Map();
function grassFor(t) {
  if (_grassCol.has(t)) return _grassCol.get(t);
  let r = null; for (const k in GRASS_BY) if (G[k] === t) { const [n, cs] = GRASS_BY[k]; r = { n, cs }; }
  _grassCol.set(t, r); return r;
}
// Una mata: 3 a 6 briznas de 2 a 7 píxeles, algo inclinadas, oscuras abajo y claras en la punta
function grassTuft(c, x, y, seed, cs, tall) {
  const n = 3 + ((hash2(x, y, seed) * 4) | 0);
  for (let i = 0; i < n; i++) {
    const bx = x + i - (n >> 1), h = Math.max(2, Math.round((2 + hash2(x + i, y, seed + 1) * 4) * tall)), lean = hash2(x + i, y, seed + 2) < 0.3 ? -1 : hash2(x + i, y, seed + 2) > 0.7 ? 1 : 0;
    for (let j = 0; j < h; j++) {
      const k = j / h, col = k < 0.34 ? cs[0] : k < 0.75 ? cs[1] : cs[2];
      c.fillStyle = col; c.fillRect(bx + (j > h * 0.6 ? lean : 0), y - j, 1, 1);
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
{ const d0 = drawDecor; drawDecor = (c, x, y, t, px, py) => {
  if (OPT.grass !== false) {
    const g = GI[t], gr = !g.solid && !g.liquid && grassFor(t);
    if (gr) {
      const m = Math.floor(gr.n) + (hash2(x, y, 501) < gr.n % 1 ? 1 : 0);
      for (let i = 0; i < m; i++) {
        const ox = 4 + hash2(x, y, 510 + i) * 24, oy = 8 + hash2(x, y, 520 + i) * 22; // siempre dentro de la casilla
        grassTuft(c, Math.round(px + ox), Math.round(py + oy), 530 + i * 7 + x * 3 + y, gr.cs, 0.7 + hash2(x, y, 540 + i) * 0.6);
      }
    }
  }
  return d0(c, x, y, t, px, py);
}; }
