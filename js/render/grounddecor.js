'use strict';
// =====================================================================================
//  Decoración del suelo: flores, ramas, hojas, piedras, rocas, setas, huesos, conchas… (sprites/suelo/).
//  Solo se ve (no se choca ni se recoge). Cada casilla de suelo natural puede tener una, elegida con un azar
//  fijo por casilla según el bioma: flores y ramas en la hierba, conchas en la playa, hielo en la nieve…
//  Escala: 1 píxel de la imagen = 1,6 unidades del mundo, el mismo píxel grande del personaje y los árboles
//  (una casilla = 20 píxeles), sin suavizado. Nombre del archivo = <categoría>_<n>.png (flor_3.png, roca_12.png…).
// =====================================================================================
const GD_PX = 1.6;
// Qué categorías salen en cada suelo (peso relativo) y cuántas casillas llevan algo
const GD_BIOME = {
  GRASS: [0.08, { flor: 5, hierba: 3, rama: 1.5, hoja: 1.5, piedra: 1.5, roca: 0.6, pluma: 0.3, seta: 0.3 }],
  DARKGRASS: [0.1, { rama: 3, hoja: 2, hojaseca: 2, pina: 2, seta: 2, tocon: 0.5, piedra: 1, roca: 1, flor: 0.4 }],
  JUNGLEGRASS: [0.09, { hoja: 3, flor: 3, hierba: 2, seta: 1.5, rama: 1 }],
  DRYGRASS: [0.06, { rama: 1.5, piedra: 2, hueso: 1, cactus: 0.6, hojaseca: 1, hierba: 1 }],
  SWAMPGRASS: [0.08, { seta: 3, rama: 2, hoja: 2, hierba: 1, roca: 0.5 }],
  MUD: [0.04, { rama: 2, piedra: 2, seta: 1 }], PEAT: [0.04, { rama: 2, seta: 2, piedra: 1 }],
  MOSS: [0.09, { flor: 4, piedra: 1.5, seta: 1, roca: 1, hierba: 1 }],
  SAND: [0.05, { concha: 4, playa: 2.5, piedra: 1.5, pluma: 0.4 }], BLACKSAND: [0.04, { concha: 2, piedra: 3, playa: 1 }],
  REDSAND: [0.05, { cactus: 2, desierto: 2, hueso: 2, piedra: 1 }], TERRACOTTA: [0.04, { desierto: 2, piedra: 2, hueso: 0.6 }],
  SALT: [0.025, { piedra: 2, hueso: 1 }], GRAVEL: [0.05, { piedra: 4, roca: 2 }], CLAY: [0.03, { piedra: 3 }],
  SNOW: [0.04, { nieve: 3, hielo: 2, piedra: 0.6, rama: 0.4 }], ICE: [0.025, { hielo: 3 }],
  ASH: [0.05, { volcan: 3, hueso: 2, piedra: 1 }], MYCELIUM: [0.1, { seta: 6, piedra: 0.6 }],
  AMETHYST: [0.06, { hielo: 2, piedra: 1 }], TOXIC: [0.05, { hueso: 2, chatarra: 2, seta: 1 }],
};
let _gd = null; // { cat: [img…] }, cuando los sprites ya cargaron
const _gdPick = new Map(); // tipo de suelo → lista ponderada de categorías
function gdSets() {
  if (_gd || typeof CSPR === 'undefined' || !CSPR.ready) return _gd;
  const out = {};
  for (const [key, set] of CSPR.sets) { if (!key.startsWith('suelo/')) continue; const cat = key.slice(6).replace(/_?\d+$/, ''); (out[cat] = out[cat] || []).push(set.raw); }
  return (_gd = out);
}
function gdFor(t) {
  if (_gdPick.has(t)) return _gdPick.get(t);
  let r = null; const D = _gd;
  for (const name in GD_BIOME) if (G[name] === t) {
    const [dens, w] = GD_BIOME[name], L = []; let tot = 0;
    for (const c in w) if (D[c] && D[c].length) { tot += w[c]; L.push([tot, c]); }
    if (L.length) r = { dens, tot, L };
  }
  _gdPick.set(t, r); return r;
}
function drawGroundDecor(ctx, k, ox, oy, x0, y0, x1, y1) {
  if (OPT.decor === false || !gdSets() || !Object.keys(_gd).length) return;
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.setTransform(k, 0, 0, k, ox, oy);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const t = gnd(tx, ty), d = gdFor(t); if (!d) continue;
    if (hash2(tx, ty, 71) >= d.dens) continue;
    if (at(tx, ty) || (typeof fogHidden === 'function' && fogHidden(tx, ty))) continue;
    const r = hash2(tx, ty, 72) * d.tot; let cat = d.L[d.L.length - 1][1]; for (const [lim, c] of d.L) if (r < lim) { cat = c; break; }
    const L = _gd[cat], im = L[(hash2(tx, ty, 73) * L.length) | 0], w = im.width * GD_PX, h = im.height * GD_PX;
    // posición dentro de la casilla (sin salirse) y a veces en espejo para que no se repita
    const fx = hash2(tx, ty, 74), fy = hash2(tx, ty, 75), px = tx * T + 2 + fx * Math.max(0, T - 4 - w), py = ty * T + 2 + h + fy * Math.max(0, T - 4 - h);
    if (hash2(tx, ty, 76) < 0.5 && cat !== 'chatarra') { ctx.save(); ctx.translate(Math.round(px + w / 2), 0); ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, py - h, w, h); ctx.restore(); }
    else ctx.drawImage(im, Math.round(px), Math.round(py - h), w, h);
  }
  ctx.imageSmoothingEnabled = sm;
}
