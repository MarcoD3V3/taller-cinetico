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
  GRASS: [0.5, { pasto_verde: 4, arbi_verde: 1.2,  matojo: 4, planta: 3, arbusto_p: 2.5, arbusto_m: 0.8, arbusto_g: 0.25, flor: 5, hierba: 3, rama: 1.5, hoja: 1.5, piedra: 1.5, roca: 0.6, pina: 0.4, pluma: 0.3, seta: 0.3, tierra: 0.3 }],
  DARKGRASS: [0.42, { pasto_verde: 2, arbi_oscuro: 1.6, arbi_verde: 0.5,  planta: 3, arbusto_p: 2.5, arbusto_m: 1, arbusto_g: 0.35, matojo: 1, rama: 3, hoja: 2, hojaseca: 2, pina: 2, seta: 2, raiz: 1, tocon: 0.5, piedra: 1, roca: 1, flor: 0.4 }],
  JUNGLEGRASS: [0.52, { pasto_selva: 4.5, arbi_selva: 1.8,  planta: 4, matojo: 3, arbusto_p: 3, arbusto_m: 1.2, arbusto_g: 0.4, hoja: 3, flor: 3, hierba: 2, seta: 1.5, raiz: 1, rama: 1 }],
  DRYGRASS: [0.18, { pasto_seco: 4, arbi_seco: 1.5,  planta: 1.5, arbusto_p: 1, arbusto_m: 0.3, rama: 1.5, piedra: 2, hueso: 1, cactus: 0.6, hojaseca: 1, hierba: 1, tierra: 0.6 }],
  SWAMPGRASS: [0.28, { pasto_pantano: 4, arbi_oscuro: 0.8, arbi_seco: 0.4,  planta: 3, arbusto_p: 2, arbusto_m: 0.6, seta: 3, rama: 2, hoja: 2, raiz: 1, hierba: 1, roca: 0.5 }],
  MUD: [0.1, { pasto_pantano: 2,  planta: 1.5, rama: 2, piedra: 2, tierra: 2, seta: 1, raiz: 1 }], PEAT: [0.1, { pasto_pantano: 2,  planta: 1.5, rama: 2, seta: 2, raiz: 1.5, tierra: 1, piedra: 1 }],
  MOSS: [0.45, { pasto_verde: 2, arbi_verde: 0.8,  matojo: 5, planta: 2, arbusto_p: 2, arbusto_m: 0.6, flor: 4, piedra: 1.5, seta: 1, roca: 1, hierba: 1 }],
  SAND: [0.05, { concha: 4, playa: 2.5, piedra: 1.5, pluma: 0.4 }], BLACKSAND: [0.04, { concha: 2, piedra: 2, cascajo: 2, playa: 1 }],
  REDSAND: [0.06, { pasto_seco: 1, arbi_seco: 0.6,  cactus: 2, desierto: 2, hueso: 2, piedra: 1 }], TERRACOTTA: [0.04, { desierto: 2, piedra: 2, mena: 0.5, hueso: 0.6 }],
  SALT: [0.025, { piedra: 2, cristal: 0.6, hueso: 1 }], GRAVEL: [0.05, { piedra: 3, cascajo: 3, roca: 1.5 }], CLAY: [0.03, { piedra: 2, tierra: 2 }],
  SNOW: [0.05, { arbusto_nieve: 0.8, nieve: 3, hielo: 2, piedra: 0.6, rama: 0.4 }], ICE: [0.025, { hielo: 3 }],
  ASH: [0.05, { volcan: 2, brasa: 2, hueso: 1.5, cascajo: 1, carbon: 1 }], MYCELIUM: [0.1, { seta: 4, setacueva: 3, piedra: 0.6 }],
  AMETHYST: [0.07, { cristal: 4, hielo: 1, piedra: 1 }], TOXIC: [0.05, { hueso: 2, chatarra: 2, seta: 1, setacueva: 1 }],
  DIRT: [0.14, { pasto_verde: 1, arbi_seco: 0.4,  planta: 1.5, tierra: 3, piedra: 2, raiz: 1.5, rama: 1, pina: 0.5 }],
  ROCKFLOOR: [0.06, { cascajo: 3, piedra: 2, roca: 1, mena: 0.4 }], STONEFLOOR: [0.05, { cascajo: 3, piedra: 2, roca: 1 }],
  BASALTFLOOR: [0.05, { cascajo: 3, carbon: 1, volcan: 1, brasa: 0.5 }], PERMAFLOOR: [0.05, { hielo: 3, cascajo: 2, nieve: 1 }],
  CAVEFLOOR: [0.08, { cascajo: 3, setacueva: 2, mena: 1, carbon: 1, cristal: 0.6, hueso: 0.6, raiz: 0.5 }],
  DEEPFLOOR: [0.07, { cascajo: 3, cristal: 1.5, mena: 1.5, setacueva: 1, carbon: 1 }],
  SPOREFLOOR: [0.09, { setacueva: 3, seta: 2, vacio: 0.5, raiz: 1, hueso: 0.6 }],
  CINDERFLOOR: [0.08, { brasa: 4, volcan: 2, carbon: 1.5, hueso: 0.5 }],
  VOIDFLOOR: [0.08, { vacio: 5, cristal: 1, cascajo: 1 }], LIGHTSHAFT: [0.05, { cascajo: 2, piedra: 2, raiz: 1 }],
};
let _gd = null; // { cat: [img…] }, cuando los sprites ya cargaron
const _gdPick = new Map(); // tipo de suelo → lista ponderada de categorías
function gdSets() {
  if (_gd || typeof CSPR === 'undefined' || !CSPR.ready) return _gd;
  const out = {};
  for (const [key, set] of CSPR.sets) { if (!key.startsWith('suelo/')) continue; const cat = key.slice(6).replace(/_?\d+$/, ''); (out[cat] = out[cat] || []).push(set.raw); }
  // Las piedras y rocas usan las rocas nuevas (rocam_*), a 1 píxel = 1 unidad como las del mundo
  const R = g => out['rocam_' + g] || [];
  if (R('gris').length) {
    out.piedra = [...R('gris'), ...R('musgo')]; out.roca = [...R('gris'), ...R('musgo'), ...R('arenisca')];
    out.desierto = R('arenisca'); if (R('volcan').length) out.volcan = R('volcan');
    for (const c of ['piedra', 'roca', 'desierto', 'volcan']) GD_PX1.add(c);
  }
  return (_gd = out);
}
const GD_PX1 = new Set(); // categorías que van a 1 píxel = 1 unidad (las rocas nuevas)
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
// Nunca se reescala un sprite (cada tamaño es un dibujo propio, al píxel del juego); varía con tonos distintos (flores, conchas, hojas, setas), girado 90° si es algo plano y en espejo.
const GD_HUE = { matojo: [0, 30, -30, 60, -60, 150], flor: [0, 25, -25, 50, -50, 90, 180], concha: [0, 15, -15, 330], hoja: [0, 20, -15], hojaseca: [0, 15, -20], seta: [0, 20, -20], setacueva: [0, 40, -40, 120], cristal: [0, 60, -60, 150, 210], vacio: [0, 25, -25] };
const GD_FLAT = new Set(['rama', 'hueso', 'concha', 'hoja', 'hojaseca', 'pluma', 'playa', 'pina', 'raiz', 'cascajo']);
const GD_TALL = new Set(['arbusto_m', 'arbusto_g', 'arbi_verde', 'arbi_oscuro', 'arbi_selva', 'arbi_seco']);
// Lo que se mece con el viento: [cuánto se mueve la punta, qué parte de ellos]
const GD_SWAY = { pasto_verde: [1.6, 1], pasto_seco: [1.8, 1], pasto_selva: [1.4, 1], pasto_pantano: [1.6, 1], arbi_verde: [1.4, 1], arbi_oscuro: [1.3, 1], arbi_selva: [1.3, 1], arbi_seco: [1.1, 1], arbusto_g: [1.8, 1], arbusto_m: [1.5, 1], arbusto_p: [1.1, 0.8], flor: [1.2, 0.6], matojo: [1.3, 0.7], planta: [1, 0.6], hierba: [1, 0.7], arbusto_nieve: [0.6, 1] };
const GD_SIZES = [1, 1, 1], _gdVar = new Map();
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
// Memoria por casilla: se calcula una vez (no en cada fotograma). Se vacía si cambian los bloques o se recoge algo.
const _gdCache = new Map(); let _gdVer = -1;
function gdAt(tx, ty) {
  if (OPT.decor === false || !gdSets()) return null; // sin sprites aún: no se guarda nada
  if (typeof topoVer !== 'undefined' && topoVer !== _gdVer) { _gdCache.clear(); _gdVer = topoVer; }
  const key = tx * 65536 + ty; let o = _gdCache.get(key);
  if (o === undefined) { o = gdAt0(tx, ty); if (_gdCache.size > 30000) _gdCache.clear(); _gdCache.set(key, o); }
  return o;
}
// ---------- Macizos: varios pastos y arbustos juntos que forman una mancha grande de flora ----------
// En zonas (ruido suave) de cada bioma, cada casilla lleva 2 o 3 piezas que se solapan con las de las casillas
// vecinas: así no se ve un pasto suelto sino una mata continua. En el centro del macizo, arbustos; en el borde, solo pasto.
const GD_PATCH = { // [pastos, matas/arbustos]
  GRASS: [['pasto_verde'], ['arbi_verde', 'arbusto_p', 'planta', 'matojo']], DARKGRASS: [['pasto_verde'], ['arbi_oscuro', 'arbusto_p', 'planta']],
  JUNGLEGRASS: [['pasto_selva'], ['arbi_selva', 'planta', 'arbusto_p']], DRYGRASS: [['pasto_seco'], ['arbi_seco', 'arbusto_p']],
  SWAMPGRASS: [['pasto_pantano'], ['arbi_oscuro', 'planta']], MOSS: [['pasto_verde'], ['arbi_verde', 'matojo', 'arbusto_p']] };
const _gdPatchT = new Map();
function gdPatchCats(t) { if (_gdPatchT.has(t)) return _gdPatchT.get(t); let r = null; for (const k in GD_PATCH) if (G[k] === t) r = GD_PATCH[k]; _gdPatchT.set(t, r); return r; }
function gdPiece(tx, ty, cat, k, sx, by) {
  const L = _gd[cat]; if (!L || !L.length) return null;
  const im = gdVariant(L[(hash2(tx, ty, 300 + k) * L.length) | 0], cat, 0, 0, false), px1 = GD_PX1.has(cat) ? 1 : GD_PX, w = im.width * px1, h = im.height * px1;
  const sw = GD_SWAY[cat] ? GD_SWAY[cat][0] : 0;
  return { cat, im, px: tx * T + sx - w / 2, py: ty * T + by, w, h, tall: true, up: true, sw, nosh: cat.startsWith('pasto'), seed: hash2(tx, ty, 310 + k), flip: hash2(tx, ty, 320 + k) < 0.5 };
}
function gdPatch(tx, ty, t) {
  const cats = gdPatchCats(t); if (!cats) return null;
  const pv = fbm(tx / 6, ty / 6, 555); if (pv < 0.65) return null;
  const core = pv > 0.71, n = core ? 3 : 2, out = [], pick = (L, k) => L[(hash2(tx, ty, 360 + k) * L.length) | 0];
  for (let k = 0; k < n; k++) {
    const cat = core && k === 0 && hash2(tx, ty, 330) < 0.45 ? pick(cats[1], k) : pick(cats[0], k);
    const sx = 5 + ((k * 11 + hash2(tx, ty, 340 + k) * 10) % 22), by = 9 + k * 8 + hash2(tx, ty, 350 + k) * 6;
    const o = gdPiece(tx, ty, cat, k, sx, by); if (o) out.push(o);
  }
  if (!out.length) return null;
  out.sort((a, b) => a.py - b.py); out[0].group = out; return out[0];
}
function gdAt0(tx, ty) {
  if (OPT.decor === false || !gdSets() || !Object.keys(_gd).length) return null;
  const t = gnd(tx, ty);
  if (gdPatchCats(t) && !at(tx, ty) && !(S && S.picked && S.picked['g' + tx + ',' + ty])) { const pg = gdPatch(tx, ty, t); if (pg) return pg; }
  const d = gdFor(t), hv = hash2(tx, ty, 71); if (!d || hv >= d.dens) return null;
  // repartido, sin montones: si una vecina (arriba, abajo, a los lados) también lleva algo y le toca antes, esta se queda vacía
  for (let k = 0; k < 4; k++) { const nx = tx + DX[k], ny = ty + DY[k], hn = hash2(nx, ny, 71); if (hn < hv && hn < d.dens && gnd(nx, ny) === t) return null; }
  if (gnd(tx + 1, ty) !== t || gnd(tx - 1, ty) !== t || gnd(tx, ty + 1) !== t || gnd(tx, ty - 1) !== t) return null;
  if (at(tx, ty) || (S && S.picked && S.picked['g' + tx + ',' + ty])) return null;
  const r = hash2(tx, ty, 72) * d.tot; let cat = d.L[d.L.length - 1][1]; for (const [lim, c] of d.L) if (r < lim) { cat = c; break; }
  const L = _gd[cat], base = L[(hash2(tx, ty, 73) * L.length) | 0];
  const si = (hash2(tx, ty, 77) * 3) | 0, hi = (hash2(tx, ty, 78) * 8) | 0, rot = GD_FLAT.has(cat) && hash2(tx, ty, 79) < 0.4;
  const im = gdVariant(base, cat, si, hi, rot), px1 = GD_PX1.has(cat) ? 1 : GD_PX, w = im.width * px1, h = im.height * px1;
  const tall = GD_TALL.has(cat);
  const px = tall ? tx * T + 16 - w / 2 + (hash2(tx, ty, 74) - 0.5) * 6 : tx * T + 3 + hash2(tx, ty, 74) * Math.max(0, T - 6 - w);
  const py = tall ? ty * T + 27 : ty * T + 4 + h + hash2(tx, ty, 75) * Math.max(0, T - 8 - h);
  const swayAmp = GD_SWAY[cat] && hash2(tx, ty, 92) < GD_SWAY[cat][1] ? GD_SWAY[cat][0] : 0;
  // todo lo que se levanta del suelo (no lo plano) se ordena con el personaje por su base: delante o detrás según dónde estés
  const up = tall || (!GD_FLAT.has(cat) && h >= 8);
  return { cat, im, px, py, w, h, tall, up, sw: swayAmp, seed: hash2(tx, ty, 93), flip: hash2(tx, ty, 76) < 0.5 && cat !== 'chatarra' };
}
function drawGroundDecor(ctx, k, ox, oy, x0, y0, x1, y1) {
  if (OPT.decor === false || !gdSets()) return;
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.setTransform(k, 0, 0, k, ox, oy); if (typeof windTick === 'function') windTick();
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const o = gdAt(tx, ty); if (!o || o.up || (typeof fogHidden === 'function' && fogHidden(tx, ty))) continue;
    gdPut(ctx, o);
  }
  ctx.imageSmoothingEnabled = sm;
}
function gdPut(ctx, o) {
  {
    const x = Math.round(o.px), y = Math.round(o.py - o.h);
    // perspectiva: sombra pequeña en el suelo, bajo el objeto (vista 3/4 como el resto del juego)
    if (!o.nosh) ctx.fillStyle = 'rgba(0,0,0,.22)'; else ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.beginPath(); ctx.ellipse(x + o.w / 2 + 1, o.py - 0.5, o.w * 0.42, Math.max(1.2, o.h * 0.14), 0, 0, 7); ctx.fill();
    const sw = o.sw && typeof windSway === 'function' ? windSway(o.seed, o.sw) : 0;
    if (o.flip || Math.abs(sw) > 0.05) { ctx.save(); ctx.translate(x + o.w / 2, y + o.h); if (sw) ctx.transform(1, 0, -sw / o.h, 1, 0, 0); if (o.flip) ctx.scale(-1, 1); ctx.drawImage(o.im, -o.w / 2, -o.h, o.w, o.h); ctx.restore(); }
    else ctx.drawImage(o.im, x, y, o.w, o.h);
  }
}
// ---------- Recoger: clic mantenido un momento (como las flores de serie) y da su objeto ----------
const GD_GIVE = { pasto_verde: ['herbs', 'Pasto alto'], pasto_seco: ['herbs', 'Pasto seco'], pasto_selva: ['herbs', 'Hierba de selva'], pasto_pantano: ['herbs', 'Juncos'], arbi_verde: ['stick', 'Arbusto', 2], arbi_oscuro: ['stick', 'Matorral', 2], arbi_selva: ['herbs', 'Arbusto de selva', 2], arbi_seco: ['stick', 'Matorral seco', 2], matojo: ['petals', 'Flores'], planta: ['herbs', 'Plantas'], arbusto_p: ['herbs', 'Arbusto pequeño'], arbusto_m: ['stick', 'Arbusto', 2], arbusto_g: ['stick', 'Arbusto grande', 3], arbusto_nieve: ['snow', 'Arbusto nevado'], flor: ['petals', 'Flor'], hierba: ['herbs', 'Hierbas'], piedra: ['stone', 'Piedrecitas'], roca: ['stone', 'Roca', 2], desierto: ['stone', 'Piedra de arenisca'],
  nieve: ['snow', 'Nieve'], hielo: ['ice', 'Hielo'], volcan: ['basalt', 'Roca volcánica'], rama: ['stick', 'Rama'], hoja: ['herbs', 'Hojas'], hojaseca: ['herbs', 'Hojas secas'],
  pina: ['stick', 'Piñas y bellotas'], seta: ['mushroom', 'Setas'], tocon: ['log', 'Tocón'], hueso: ['bone', 'Huesos'], pluma: ['feather', 'Pluma'], concha: ['shell', 'Concha'],
  playa: ['kelp', 'Algas y madera'], cactus: ['cactus', 'Cactus'], chatarra: ['ironNugget', 'Chatarra'],
  setacueva: ['glowcap', 'Seta de cueva'], cristal: ['crystal', 'Cristalito'], mena: ['ironNugget', 'Trocito de mena'], carbon: ['coal', 'Carbón'], cascajo: ['gravel', 'Cascajo'],
  brasa: ['coal', 'Ascua'], vacio: ['voidstone', 'Esquirla abisal'], raiz: ['stick', 'Raíces'], tierra: ['dirt', 'Terrón'] };
const gdGive = cat => { const g = GD_GIVE[cat]; return g && ITEMS[g[0]] ? g : ['stone', 'Piedra']; };
function gdPick(x, y) {
  const o = gdAt(x, y); if (!o) return false; const [id, name, n = 1] = gdGive(o.cat);
  (S.picked || (S.picked = {}))['g' + x + ',' + y] = 1; _gdCache.delete(x * 65536 + y);
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
const o_need = cat => cat === 'roca' || cat === 'tocon' || cat === 'chatarra' || cat === 'mena' || cat === 'arbusto_m' ? 0.6 : cat === 'arbusto_g' ? 0.9 : 0.25; // lo grande tarda un poco más
{ const t0 = tileCard; tileCard = (tx, ty) => { const h = t0(tx, ty), o = !(typeof decorAt === 'function' && decorAt(tx, ty)) && gdAt(tx, ty); if (!o) return h; const [id, name] = gdGive(o.cat); return h + `<div class="small good">🌼 ${esc(name)}: mantén clic para recoger (${esc(ITEMS[id].n)})</div>`; }; }
// Arbustos con altura: entran en la lista de los árboles (render/trees.js) y se ordenan con ellos por la base,
// así un arbusto detrás de un árbol queda tapado por el árbol, y al revés. Se pasa por detrás como con los árboles.
function treeExtras(items, dc, x0, y0, x1, y1, front, pty) {
  if (OPT.decor === false || !gdSets()) return;
  for (let ty = y0 - 1; ty <= y1 + 3; ty++) for (let tx = x0 - 2; tx <= x1 + 2; tx++) {
    const o0 = gdAt(tx, ty); if (!o0 || !o0.up || (typeof fogHidden === 'function' && fogHidden(tx, ty))) continue;
    for (const o of o0.group || [o0]) if ((o.py > pty) === front) items.push([o.py, () => gdPut(dc, o)]);
  }
}
