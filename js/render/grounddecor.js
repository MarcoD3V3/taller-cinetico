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
// ---------- Variedad sin más sprites ----------
// Cada sprite sale en 3 tamaños (reducido píxel a píxel, sin mezclar colores: el píxel sigue igual de grande),
// con tonos distintos (flores, conchas, hojas, setas), girado 90° si es algo plano y en espejo.
const GD_HUE = { flor: [0, 25, -25, 50, -50, 90, 180], concha: [0, 15, -15, 330], hoja: [0, 20, -15], hojaseca: [0, 15, -20], seta: [0, 20, -20] };
const GD_FLAT = new Set(['rama', 'hueso', 'concha', 'hoja', 'hojaseca', 'pluma', 'playa', 'pina']);
const GD_SIZES = [1, 0.8, 0.65], _gdVar = new Map();
function gdVariant(im, cat, si, hi, rot) {
  const key = im.__id || (im.__id = Math.random().toString(36).slice(2)); const k2 = key + '|' + si + '|' + hi + '|' + rot;
  let c = _gdVar.get(k2); if (c) return c;
  const f = GD_SIZES[si], w = Math.max(3, Math.round(im.width * f)), h = Math.max(3, Math.round(im.height * f));
  const a = mkCanvas(w, h), g = a.getContext('2d'); g.imageSmoothingEnabled = false;
  const hues = GD_HUE[cat]; if (hues && hues[hi % hues.length]) g.filter = `hue-rotate(${hues[hi % hues.length]}deg)`;
  g.drawImage(im, 0, 0, w, h); // vecino más cercano: no se emborrona
  if (rot) { c = mkCanvas(h, w); const g2 = c.getContext('2d'); g2.translate(h, 0); g2.rotate(Math.PI / 2); g2.drawImage(a, 0, 0); } else c = a;
  _gdVar.set(k2, c); return c;
}
// Qué hay en una casilla: { cat, im, px, py, w, h, flip } o null. Nunca en el borde entre dos suelos
// (así no tapa las transiciones), ni donde hay un bloque, ni lo ya recogido.
function gdAt(tx, ty) {
  if (OPT.decor === false || !gdSets() || !Object.keys(_gd).length) return null;
  const t = gnd(tx, ty), d = gdFor(t); if (!d || hash2(tx, ty, 71) >= d.dens) return null;
  if (gnd(tx + 1, ty) !== t || gnd(tx - 1, ty) !== t || gnd(tx, ty + 1) !== t || gnd(tx, ty - 1) !== t) return null;
  if (at(tx, ty) || (S && S.picked && S.picked['g' + tx + ',' + ty])) return null;
  const r = hash2(tx, ty, 72) * d.tot; let cat = d.L[d.L.length - 1][1]; for (const [lim, c] of d.L) if (r < lim) { cat = c; break; }
  const L = _gd[cat], base = L[(hash2(tx, ty, 73) * L.length) | 0];
  const si = (hash2(tx, ty, 77) * 3) | 0, hi = (hash2(tx, ty, 78) * 8) | 0, rot = GD_FLAT.has(cat) && hash2(tx, ty, 79) < 0.4;
  const im = gdVariant(base, cat, si, hi, rot), w = im.width * GD_PX, h = im.height * GD_PX;
  const px = tx * T + 3 + hash2(tx, ty, 74) * Math.max(0, T - 6 - w), py = ty * T + 4 + h + hash2(tx, ty, 75) * Math.max(0, T - 8 - h);
  return { cat, im, px, py, w, h, flip: hash2(tx, ty, 76) < 0.5 && cat !== 'chatarra' };
}
function drawGroundDecor(ctx, k, ox, oy, x0, y0, x1, y1) {
  if (OPT.decor === false || !gdSets()) return;
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.setTransform(k, 0, 0, k, ox, oy);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const o = gdAt(tx, ty); if (!o || (typeof fogHidden === 'function' && fogHidden(tx, ty))) continue;
    const x = Math.round(o.px), y = Math.round(o.py - o.h);
    // perspectiva: sombra pequeña en el suelo, bajo el objeto (vista 3/4 como el resto del juego)
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x + o.w / 2 + 1, o.py - 0.5, o.w * 0.42, Math.max(1.2, o.h * 0.14), 0, 0, 7); ctx.fill();
    if (o.flip) { ctx.save(); ctx.translate(x + o.w / 2, 0); ctx.scale(-1, 1); ctx.drawImage(o.im, -o.w / 2, y, o.w, o.h); ctx.restore(); }
    else ctx.drawImage(o.im, x, y, o.w, o.h);
  }
  ctx.imageSmoothingEnabled = sm;
}
// ---------- Recoger: clic mantenido un momento (como las flores de serie) y da su objeto ----------
const GD_GIVE = { flor: ['petals', 'Flor'], hierba: ['herbs', 'Hierbas'], piedra: ['stone', 'Piedrecitas'], roca: ['stone', 'Roca', 2], desierto: ['stone', 'Piedra de arenisca'],
  nieve: ['snow', 'Nieve'], hielo: ['ice', 'Hielo'], volcan: ['basalt', 'Roca volcánica'], rama: ['stick', 'Rama'], hoja: ['herbs', 'Hojas'], hojaseca: ['herbs', 'Hojas secas'],
  pina: ['stick', 'Piñas y bellotas'], seta: ['mushroom', 'Setas'], tocon: ['log', 'Tocón'], hueso: ['bone', 'Huesos'], pluma: ['feather', 'Pluma'], concha: ['shell', 'Concha'],
  playa: ['kelp', 'Algas y madera'], cactus: ['cactus', 'Cactus'], chatarra: ['gear', 'Chatarra'] };
const gdGive = cat => { const g = GD_GIVE[cat]; return g && ITEMS[g[0]] ? g : ['stone', 'Piedra']; };
function gdPick(x, y) {
  const o = gdAt(x, y); if (!o) return false; const [id, name, n = 1] = gdGive(o.cat);
  (S.picked || (S.picked = {}))['g' + x + ',' + y] = 1;
  invGive(id, n, (x + 0.5) * T, (y + 0.5) * T);
  fxText(x * T + 16, y * T, '+' + n + ' ' + ITEMS[id].n, '#c8e08a'); burst(x, y, GI[gnd(x, y)].c); tone(640, 0.04, 'sine', 0.025, 1.3);
  if (typeof gainXP === 'function') gainXP('gather', 1); return true;
}
{ const m0 = updateMining; updateMining = fdt => {
  if (S && mouse.down && !ui.hand && !selectedBlock()) {
    const id = heldId(), it = id && ITEMS[id], busy = it && (it.seed || (typeof FTOOLS !== 'undefined' && FTOOLS[id]));
    const x = mouse.tx, y = mouse.ty;
    if (!busy && inReach(x, y) && !(typeof decorAt === 'function' && decorAt(x, y)) && gdAt(x, y)) {
      if (!ui.mine || ui.mine.x !== x || ui.mine.y !== y || !ui.mine.gd) ui.mine = { t: 0, x, y, pick: 1, gd: 1 };
      ui.mine.need = o_need(gdAt(x, y).cat); ui.mine.t += fdt;
      if (ui.mine.t >= ui.mine.need) { gdPick(x, y); ui.mine = { t: 0, x: -1e9, y: 0 }; }
      return;
    }
  }
  if (ui.mine && ui.mine.gd) ui.mine = { t: 0, x: -1e9, y: 0 };
  m0(fdt);
}; }
const o_need = cat => cat === 'roca' || cat === 'tocon' || cat === 'chatarra' ? 0.6 : 0.25; // lo grande tarda un poco más
{ const t0 = tileCard; tileCard = (tx, ty) => { const h = t0(tx, ty), o = !(typeof decorAt === 'function' && decorAt(tx, ty)) && gdAt(tx, ty); if (!o) return h; const [id, name] = gdGive(o.cat); return h + `<div class="small good">🌼 ${esc(name)}: mantén clic para recoger (${esc(ITEMS[id].n)})</div>`; }; }
