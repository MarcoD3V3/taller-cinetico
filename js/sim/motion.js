'use strict';
// =====================================================================================
//  Movimiento del jugador: inercia (acelera y frena, resbala en el hielo), terreno que
//  frena o acelera, salto, alturas del terreno (terrazas con acantilados) y nado.
//  updatePlayer (main.js) usa todo esto; drawPlayer (combat-ui.js) lo dibuja.
// =====================================================================================
// ---------- Alturas ----------
// · Llanuras: nivel 0. Alrededor de las montañas, terrazas 1 y 2 (estribaciones).
// · Montañas: la roca sube por escalones (3, 4, 5…) con paredes entre capas. En las «canteras»
//   (zonas de la semilla) la montaña es plana: solo roca y menas para picar en línea recta.
// · Lo excavado baja: un túnel abierto en la montaña queda al nivel del pie (2) con paredes a los
//   lados, y cada nivel de hoyo cavado en el suelo baja una capa (se ven las paredes del hoyo).
// Se calcula con el ruido del terreno (estable, no se guarda). Subir pide saltar; bajar es libre.
const LV_H = 15, LV_FOOT = 2, LV_MAX = 7; // píxeles de pared por nivel · nivel del pie de la montaña · tope
const faceH = d => Math.min(T - 4, LV_H * d);
const isQuarry = (x, y) => vnoise(x / 150, y / 150, S.gen.seed + 1234) > 0.62;
function chunkLv(c) {
  const P = S.gen, r = P.relief ?? 1, h = c.h = new Uint8Array(CS * CS); if (!r) return h;
  const s = P.seed, x0 = c.cx * CS, y0 = c.cy * CS, step = 0.06 * r, step2 = 0.032 / r;
  for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) {
    const i = (y << CSH) | x, B = BIOMES[c.bio[i]]; if (!B || B.ocean || GI[c.g[i]].ruin || GI[c.g[i]].abyss) continue;
    const e = fbm((x0 + x) / P.terrain, (y0 + y) / P.terrain, s), top = (B.stone ?? 0.66) + (P.mountain - 0.63);
    if (e > top + 0.05) h[i] = isQuarry(x0 + x, y0 + y) ? 3 : Math.min(LV_MAX, 3 + Math.floor((e - top - 0.05) / step2));
    else h[i] = e > top - step ? 2 : e > top - step * 2 ? 1 : 0;
  }
  return h;
}
// Nivel real: la roca abierta baja al pie de la montaña y los hoyos bajan una capa por nivel cavado
function lvAt(x, y) {
  const c = getChunk(x >> CSH, y >> CSH), i = ((y & CMASK) << CSH) | (x & CMASK); let l = (c.h || chunkLv(c))[i];
  const g = GI[c.g[i]];
  const lm = S.lvmod && S.lvmod[x + ',' + y];
  if (lm !== undefined) l = lm; else if (l > LV_FOOT && !g.solid) l = LV_FOOT;
  if (g.hole) l -= Math.max(1, depthAt(x, y)); else if (g.hp && S.depth && S.depth[x + ',' + y]) l -= 1; // cavado en parte: una capa
  return l;
}
// Roca rebajada o suelo de túnel a la altura a la que se picó (se guarda con la partida)
function setLvMod(x, y, v) { (S.lvmod || (S.lvmod = {}))[x + ',' + y] = v; onTileChange(x, y, false); }
// ---------- Paredes de altura: UNA sola forma para dibujar y para chocar ----------
// Las paredes (la de delante bajo una terraza, las laterales y las de las esquinas) son caras verticales: la
// perspectiva que da la altura. NO se pisan. paredEn() calcula, píxel a píxel, exactamente la misma forma que pinta
// paintCliffs (mismo azar, mismos anchos y altos), para cualquier altura y cualquier combinación de capas.
// Devuelve la pared más alta en ese punto: up (nivel de arriba), fuera (punto al pie, fuera de la pared) y
// arriba (dónde quedas si trepas saltando).
// Ancho de la pared de una esquina a la altura y (0 arriba): se estrecha en curva hasta el pie, en píxeles enteros
function anchoEsq(w, y, h) { const t = Math.min(1, Math.max(0, y / Math.max(1, h))); return Math.round(w * Math.sqrt(Math.max(0, 1 - t * t * t))); }
function paredEn(px, py) {
  const tx = Math.floor(px / T), ty = Math.floor(py / T), x = px - tx * T, y = py - ty * T, wx = Math.floor(px), wy = Math.floor(py), l = lvAt(tx, ty);
  const nivel = (ax, ay) => esRocaM(ax, ay) ? -99 : lvAt(ax, ay); // la roca lleva su pared dentro (y no se pisa)
  let best = null; const pon = (up, fuera, arriba) => { if (up > l && (!best || up > best.up)) best = { up, l, fuera, arriba }; };
  const up = nivel(tx, ty - 1), jit = (((ihash(wx >> 2, ty * 5 + 1) * 5) | 0) - 2);
  if (up > l) { const hx = faceH(up - l) + jit; if (y < hx) pon(up, [px, ty * T + hx + 0.6], [px, ty * T - 0.6]); } // pared de delante
  for (const side of [-1, 1]) {
    const k = side < 0 ? x : T - 1 - x, edge = side < 0 ? tx * T : (tx + 1) * T, hi = nivel(tx + side, ty);
    if (hi > l) { const w = Math.min(7, 3 + (hi - l) * 2) - ((ihash(wy >> 2, tx * 17 + side) * 3) | 0); if (k < w) pon(hi, [edge - side * (w + 0.6), py], [edge + side * 1.5, py]); } // lateral
    else if (up <= l) { const dg = nivel(tx + side, ty - 1); if (dg > l) { // esquina: la pared lateral de la diagonal baja por aquí
      const fh = Math.min(T, faceH(dg - l)), w = Math.min(7, 3 + (dg - l) * 2) - ((ihash(wy >> 2, tx * 17 + side) * 3) | 0);
      const hxc = Math.min(fh, fh + jit);
      if (y < hxc && k < anchoEsq(w, y, hxc)) pon(dg, [px, ty * T + hxc + 0.6], [edge + side * 1.5, ty * T - 0.6]); } }
  }
  return best;
}
// Nivel en un punto (la pared cuenta como el suelo de abajo: desde arriba, pisarla es caerse)
function lvPoint(px, py) { return lvAt(Math.floor(px / T), Math.floor(py / T)); }
const playerFreeAt = (x, y) => passable(x - JUG('choqueAncho', 5), y + JUG('choquePie', 5), 'player') && passable(x + JUG('choqueAncho', 5), y + JUG('choquePie', 5), 'player') && passable(x, y + JUG('choqueCentro', 1), 'player');
const _flyMove = () => hasFlag('phoenixWings') || mountFly();
// ---------- Pies libres: colisión + alturas ----------
function playerFree(x, y) {
  if (!(passable(x - JUG('choqueAncho', 5), y + JUG('choquePie', 5), 'player') && passable(x + JUG('choqueAncho', 5), y + JUG('choquePie', 5), 'player') && passable(x, y + JUG('choqueCentro', 1), 'player'))) return false;
  const p = S.player; if (x === p.x && y === p.y) return true;
  const to = lvPoint(x, y + 5), cur = lvPoint(p.x, p.y + 5);
  if (!_flyMove()) { const an = JUG('choqueAncho', 5) * 0.8; let w = null;
    for (const o of [0, -an, an]) { const q = paredEn(x + o, y + 5); if (!q || q.up <= cur) continue;
      const q0 = paredEn(p.x + o, p.y + 5); if (q0 && q0.up >= q.up) continue; // ese pie ya estaba ahí: puedes alejarte (nunca te quedas atrapado)
      if (!w || q.up > w.up) w = q; }
    if (w) { // contra una pared desde abajo: andando no se sube; saltando, trepas ARRIBA (nunca te quedas en la pared)
      const hole = GI[gnd(Math.floor(p.x / T), Math.floor((p.y + 5) / T))].hole;
      if (w.up - cur <= (hole ? 2 : 1) && ((P.z || 0) >= 5 || P.swim > 0)) P._trepa = w.arriba;
      return false; } }
  if (to <= cur || _flyMove()) return true;
  // Saltando se sube un nivel (dos si sales de un hoyo); nadando se trepa a la orilla
  const inHole = GI[gnd(Math.floor(p.x / T), Math.floor((p.y + 5) / T))].hole;
  return to - cur <= (inHole ? 2 : 1) && ((P.z || 0) >= 5 || P.swim > 0);
}
// ---------- Terreno: velocidad y agarre ----------
const TERRAIN_MOVE = { SAND: 0.9, REDSAND: 0.9, BLACKSAND: 0.9, SNOW: 0.8, MUD: 0.72, PEAT: 0.85, SWAMPGRASS: 0.88, ASH: 0.9, GRAVEL: 0.95, ICE: 1.08, CLAY: 0.92 };
const SLIPPERY = new Set(['ICE']);
function groundInfo() {
  const p = S.player, tx = Math.floor(p.x / T), ty = Math.floor((p.y + 5) / T), g = GI[gnd(tx, ty)], b = at(tx, ty);
  let mul = TERRAIN_MOVE[g.key] || 1;
  if (b && BD[b.type] && BD[b.type].walk && /floor|road|path|plank|tile|brick/i.test(b.type)) mul = 1.15; // suelos construidos y caminos
  return { mul, slip: SLIPPERY.has(g.key), g };
}
// ---------- Nado ----------
// 0 en tierra, 1 vadeando (agua junto a la orilla), 2 nadando (agua profunda o lejos de la orilla)
const _shoreC = new Map();
function nearShore(tx, ty) {
  const k = tx * 100003 + ty; let v = _shoreC.get(k); if (v !== undefined) return v; v = false;
  for (let dy = -1; dy <= 1 && !v; dy++) for (let dx = -1; dx <= 1; dx++) { const g = GI[gnd(tx + dx, ty + dy)]; if (!g.liquid || g.walk) { v = true; break; } }
  if (_shoreC.size > 4000) _shoreC.clear(); _shoreC.set(k, v); return v;
}
function swimState() {
  if ((P.z || 0) > 0.5 || _flyMove()) return 0;
  const p = S.player, tx = Math.floor(p.x / T), ty = Math.floor((p.y + 5) / T), g = GI[gnd(tx, ty)];
  if (g.liquid !== 'water' || g.walk) return 0;
  if (typeof aguaVisible === 'function') { let n = 0, k = 0; for (const [ox, oy] of [[0, 5], [-3, 4], [3, 4]]) { const v = aguaVisible(p.x + ox, p.y + oy); if (v !== null) { k++; if (v) n++; } } if (k && n < 2) return 0; } // en la orilla: solo nadas si de verdad se ve agua bajo los pies
  return g.key === 'DEEP' || !nearShore(tx, ty) ? 2 : 1;
}
// Ondas en el agua (al nadar, al caer, el corcho de la caña…)
const RIPPLES = [];
function ripple(x, y, r = 10, t = 0.9) { RIPPLES.push({ x, y, r, t, t0: t }); if (RIPPLES.length > 60) RIPPLES.shift(); }
function splash(x, y, n = 8) { for (let i = 0; i < n; i++) BURSTS.push({ x, y, vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 70, t: 0.4 + Math.random() * 0.2, c: Math.random() < 0.5 ? '#d8f0ff' : '#8ac8ff' }); ripple(x, y, 14, 1); ripple(x, y, 8, 0.7); }
function dust(x, y, n = 6) { for (let i = 0; i < n; i++) BURSTS.push({ x: x + (Math.random() - 0.5) * 12, y, vx: (Math.random() - 0.5) * 70, vy: -10 - Math.random() * 30, t: 0.35, c: 'rgba(200,180,150,.8)' }); }
// ---------- Salto ----------
const JUMP_V = 175, GRAV = 900;
function tryJump() {
  if (ui.open || (P.z || 0) > 0.5 || P.swim === 2) { if (P.swim === 2) toastErr('En agua profunda no puedes saltar'); return; }
  if (survOn()) { const pc = S.pc; if (pc.stam < JUG('costeSalto', 5)) { toastErr('Sin aguante'); return; } pc.stam -= JUG('costeSalto', 5); pc.rest = 0; }
  P.vz = JUG('salto', JUMP_V) * (P.swim === 1 ? 0.8 : 1); P.z = 0.01; P.air = 0;
  if (P.swim === 1) splash(S.player.x, S.player.y + 6, 5);
  tone(260, 0.1, 'sine', 0.03, 1.8);
}
let _swimRip = 0, _drownMsg = 0;
// Antes de mover: gravedad, aterrizaje y estado de nado
function motionPre(dt) {
  const p = S.player;
  if (P.z > 0 || P.vz > 0) {
    P.vz -= JUG('gravedad', GRAV) * dt; P.z += P.vz * dt; P.air = (P.air || 0) + dt;
    if (P.z <= 0) { const v = -P.vz; P.z = 0; P.vz = 0; land(v); }
  }
  const was = P.swim || 0; P.swim = swimState();
  if (P.swim && !was && !(P.z > 0)) { splash(p.x, p.y + 6, P.swim === 2 ? 10 : 5); tone(180, 0.18, 'sine', 0.03, 0.5); }
  // Ondas al nadar (más seguidas si te mueves)
  if (P.swim) { _swimRip -= dt; if (_swimRip <= 0) { _swimRip = pmove.moving ? 0.28 : 0.9; ripple(p.x, p.y + (P.swim === 2 ? 2 : 7), P.swim === 2 ? 13 : 9, 1); } }
  // Agua profunda: cansa; sin aguante te hundes y te ahogas
  if (P.swim === 2 && survOn()) {
    const pc = S.pc; pc.stam = Math.max(0, pc.stam - (pmove.sprint ? 7 : 2.2) * dt * (CM().heavy && !CM().heavyOk ? 1.6 : 1)); pc.rest = 0;
    if (pc.stam <= 0) { pc.hp -= 2.2 * dt; pc.cause = 'Ahogado'; _drownMsg -= dt; if (_drownMsg <= 0) { _drownMsg = 4; toastErr('¡Te ahogas! Sal del agua profunda'); } }
  }
  for (let i = RIPPLES.length - 1; i >= 0; i--) if ((RIPPLES[i].t -= dt) <= 0) RIPPLES.splice(i, 1);
}
function land(v) {
  const p = S.player, s = swimState();
  if (s) splash(p.x, p.y + 6, 10); else if (v > 120) { dust(p.x, p.y + 8, v > 260 ? 10 : 5); tone(110, 0.08, 'triangle', 0.04, 0.6); }
  // Caída de dos niveles o más: contusión (con supervivencia)
  if (!s && v > JUG('caidaDano', 300) && survOn()) hurt('bruise', ['legL', 'legR', 'footL', 'footR'][(Math.random() * 4) | 0], 0.8, 'Caída');
}
// Después de mover: si has bajado de nivel, caes desde la altura de la pared
function motionPost(fromLv) {
  const p = S.player;
  // trepar: el salto contra una pared te deja encima (en la casilla de arriba, no sobre la pared)
  if (P._trepa && !P._sube) { const [ax, ay] = P._trepa; P._trepa = null; if (playerFreeAt(ax, ay - 5) && !paredEn(ax, ay)) P._sube = { x0: p.x, y0: p.y, x1: ax, y1: ay - 5, t: 0, d: 0.16 + Math.min(0.1, Math.hypot(ax - p.x, ay - 5 - p.y) / 300) }; }
  P._trepa = null;
  if (P._sube) { const s = P._sube; s.t += (typeof _dtMov === 'number' ? _dtMov : 1 / 60); const k = Math.min(1, s.t / s.d), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // subir el borde: se agarra y se impulsa (suave, sin saltos raros)
    p.x = s.x0 + (s.x1 - s.x0) * e; p.y = s.y0 + (s.y1 - s.y0) * e; P.mvx = 0; P.mvy = 0; if (P.vz > 0) P.vz *= 0.6;
    if (k >= 1) { P._sube = null; dust(p.x, p.y + 8, 3); } return; }
  // bajar por un borde: caes hasta el pie de la pared (nunca te quedas de pie sobre ella). Varias veces por si hay
  // paredes seguidas (escalones de varias capas o esquinas raras)
  if (!_flyMove()) for (let n = 0; n < 4; n++) { const w = paredEn(p.x, p.y + 5); if (!w || fromLv < w.up) break; const [ax, ay] = w.fuera; if (!playerFreeAt(ax, ay - 5)) break; p.x = ax; p.y = ay - 5; }
  const now = lvPoint(p.x, p.y + 5);
  if (now < fromLv && !_flyMove()) { P.z = (P.z || 0) + LV_H * (fromLv - now); if (!(P.vz > 0)) P.vz = 0; }
}
// Velocidad objetivo según el terreno y el agua; agarre (cuánto tarda en acelerar o frenar)
function moveFactors() {
  const gi = groundInfo(), sw = P.swim || 0, air = (P.z || 0) > 0.5;
  const mul = sw === 2 ? 0.5 * JUG('nado', 1) : sw === 1 ? 0.72 * JUG('nado', 1) : gi.mul, grip = air ? 2.5 : sw ? 4 : gi.slip ? 1.6 : 13;
  return { mul, grip, slip: gi.slip };
}
// ---------- Dibujo: ondas ----------
function drawRipples(ctx) { // ondas de píxeles: anillo a trozos que se abre y se rompe al apagarse (como el resto del pixel art)
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  for (const r of RIPPLES) { const k = 1 - r.t / r.t0, rx = r.r * (0.4 + k), ry = Math.max(1.5, rx * 0.38), cx = Math.round(r.x), cy = Math.round(r.y), n = Math.max(10, Math.round(rx * 2.2)), seed = (r.x * 7 + r.y * 13) | 0;
    for (let q = 0; q < n; q++) { if (ihash(q + seed, (k * 6) | 0) < k * 0.55) continue; // se va rompiendo
      const a = q / n * Math.PI * 2, x = cx + Math.round(Math.cos(a) * rx), y = cy + Math.round(Math.sin(a) * ry), front = Math.sin(a) > 0;
      ctx.fillStyle = front ? `rgba(235,248,255,${((1 - k) * 0.8).toFixed(2)})` : `rgba(190,225,255,${((1 - k) * 0.5).toFixed(2)})`; ctx.fillRect(x, y, front ? 2 : 1, 1); // delante más clara y gruesa
      if (front && k < 0.5) { ctx.fillStyle = `rgba(10,40,80,${((1 - k) * 0.25).toFixed(2)})`; ctx.fillRect(x, y + 1, 2, 1); } } }
  ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = sm;
}
// ---------- Dibujo: acantilados en el suelo de cada trozo ----------
// Sobre los píxeles ya compuestos (ImageData): pared de roca con estratos bajo cada terraza,
// borde con hierba que cuelga, sombra en el suelo de abajo y cascadas si el agua cae.
// Color de la pared: la propia roca si es roca; si es tierra o hierba, tierra parda
function rawLv(x, y) { const c = getChunk(x >> CSH, y >> CSH); return (c.h || chunkLv(c))[((y & CMASK) << CSH) | (x & CMASK)]; }
function rockOf(t, mtn) { const g = GI[t], c0 = mtn && !g.rock && !g.dot ? [118, 116, 112] : g.c || [110, 100, 80]; return mtn || g.rock || g.dot || g.solid && !g.tree ? [c0[0] * 0.8, c0[1] * 0.8, c0[2] * 0.8] : [c0[0] * 0.25 + 112 * 0.75, c0[1] * 0.2 + 94 * 0.8, c0[2] * 0.2 + 74 * 0.8]; }
// La roca maciza es UN bloque: entre dos casillas de roca no se dibujan escalones (no se puede pisar encima, así
// que esos saltos no tenían sentido y salían como rayas). La pared sale solo donde la roca da al suelo pisable.
function esRocaM(x, y) { const g = GI[gnd(x, y)]; return !!(g.solid && !g.flora && !g.liquid && !g.tree && !g.hole); }
function lvV(x, y) { const l = lvAt(x, y), g = GI[gnd(x, y)]; return g.solid && !g.flora && !g.liquid && !g.tree && !g.hole && l <= LV_FOOT ? l + 1 : l; }
// Textura de una pared: devuelve el factor de luz de un píxel. wx: x del mundo; wy: alto dentro de la pared (0 arriba);
// k: 0 arriba → 1 abajo. Roca: piedras de tamaños distintos con canto de luz arriba, junta oscura y tono propio.
// Tierra: capas onduladas, grumos, piedritas y raíces que cuelgan del canto.
// Pared de roca hecha con la MISMA textura que su cara de arriba (la misma piedra, vista de lado): se toma el píxel
// de la textura del bloque, más oscuro hacia abajo y con cornisas de luz cada pocas filas
function paredRocaPx(t, gx, gy, x, yy, k, alto) {
  const tv = (hash2(gx, gy, 51) * TEX_VARS) | 0, src = tileTexPx(t, tv), q = src[(((yy * 1 + 9) % T + T) % T) * T + x];
  const row = (yy + ((ihash(x >> 3, gy * 7) * 2) | 0)) % 7, f = (0.8 - k * 0.28) * (alto ? 0.88 : 1) * (row === 0 ? 1.14 : row === 6 ? 0.8 : 1);
  return (0xff000000 | Math.min(255, ((q >>> 16) & 255) * f) << 16 | Math.min(255, ((q >>> 8) & 255) * f) << 8 | Math.min(255, (q & 255) * f)) >>> 0;
}
function texPared(wx, wy, k, stony, gy, alto) {
  // alto: pared de 2 capas o más (no se sube de un salto): más oscura y con grietas verticales, para que se lea
  let f = (1.16 - k * 0.42) * (alto ? 0.86 : 1) * (0.95 + ihash(wx >> 1, gy * 97) * 0.1); // vetas verticales: se lee como pared, no como suelo
  if (stony) {
    const rowH = 4 + ((ihash(Math.floor(wy / 5), gy * 23) * 3) | 0), r = Math.floor((wy + ((ihash(wx >> 4, gy * 3) * 2) | 0)) / rowH), yin = wy + ((ihash(wx >> 4, gy * 3) * 2) | 0) - r * rowH;
    const L = 5 + ((ihash(r, gy * 19) * 5) | 0), sx = wx + ((ihash(r, gy * 17) * 31) | 0), id = Math.floor(sx / L), inS = sx - id * L, Ls = L + ((ihash(id, r + gy * 7) * 3) | 0) - 1;
    f *= 0.86 + ihash(id, r * 7 + gy) * 0.26;
    if (inS === 0 || inS >= Ls) f *= 0.56; else if (yin === rowH - 1) f *= 0.64; else if (yin === 0) f *= 1.2; else if (inS === 1) f *= 1.08; else if (inS === Ls - 1) f *= 0.86;
    if (ihash(wx, gy * T + wy) > 0.975) f *= 0.7; // poros
    if (alto && ihash(wx >> 1, gy * 53) > 0.9 && ihash(wx, (wy >> 2) + gy * 7) > 0.3) f *= 0.6; // grietas
  } else {
    const capa = Math.floor((wy + ((ihash(wx >> 3, gy * 13) * 3) | 0) + Math.sin(wx * 0.21 + gy) * 1.5) / 6);
    f *= (capa & 1 ? 1.06 : 0.94) * (0.94 + ihash(wx >> 1, (wy >> 1) + gy * 61) * 0.12);
    const raiz = ihash(wx, gy * 41) > 0.86 ? (ihash(wx, gy * 43) * 10) | 0 : 0; if (wy < raiz) f *= 0.55; // raíces
    if (ihash(wx >> 1, gy * T + (wy >> 1) * 3) > 0.965) f *= 1.32; // piedritas
  }
  return f;
}
function paintCliffs(u, W, x0, y0) {
  // La roca y las menas sueltas son un bloque: una capa por encima del suelo en el que están. Así tienen las
  // mismas paredes, cantos y sombras que las terrazas (misma forma, otra textura). La roca de la montaña ya
  // tiene su altura propia y no se toca.
  const px32 = (r, g, b) => (255 << 24 | Math.max(0, Math.min(255, b)) << 16 | Math.max(0, Math.min(255, g)) << 8 | Math.max(0, Math.min(255, r))) >>> 0;
  const scale = (v, f) => { const r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255; return px32(r * f, g * f, b * f); };
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
    const gx = x0 + tx, gy = y0 + ty, l = lvV(gx, gy), bx = tx * T, by = ty * T;
    const rk0 = esRocaM(gx, gy), up = rk0 && esRocaM(gx, gy - 1) ? l : lvV(gx, gy - 1), lf = rk0 && esRocaM(gx - 1, gy) ? l : lvV(gx - 1, gy), rt = rk0 && esRocaM(gx + 1, gy) ? l : lvV(gx + 1, gy), dn = 0;
    // Terrazas altas un poco más claras (se lee la altura de un vistazo)
    // Cuanto más alta la capa, más luz (también en la montaña): la altura se lee de un vistazo
    // (el agua es plana: no se aclara por terraza; si no, en lagos y costas salían recuadros de otro tono)
    if (false && l && !rk0 && !GI[gnd(gx, gy)].liquid) { /* (sin aclarar por capas: dejaba cuadros rectos; la altura la dan las paredes y sombras) */ const f = Math.max(0.6, Math.min(1.24, 1 + l * 0.034)); for (let y = 0; y < T; y++) { let i = (by + y) * W + bx; for (let x = 0; x < T; x++, i++) { const v = u[i]; u[i] = (0xff000000 | Math.min(255, ((v >> 16) & 255) * f) << 16 | Math.min(255, ((v >> 8) & 255) * f) << 8 | Math.min(255, (v & 255) * f)) >>> 0; } } }
    // Paredes laterales: franja de roca irregular en el lado bajo (la de la izquierda en sombra,
    // la de la derecha iluminada) y canto claro en la terraza alta
    const meLiq = GI[gnd(gx, gy)].liquid;
    for (const [side, hi] of [[-1, lf], [1, rt]]) {
      if (hi <= l || (meLiq && GI[gnd(gx + side, gy)].liquid)) continue; // agua junto a agua: misma superficie
      const rkS = esRocaM(gx + side, gy), wmax = rkS ? 0 : Math.min(7, 3 + (hi - l) * 2), rk = rockOf(gnd(gx + side, gy), rawLv(gx + side, gy) > LV_FOOT), sh = side < 0 ? 0.72 : 0.95;
      const ug2 = GI[gnd(gx + side, gy)], topS = ug2.flora ? GI[ug2.u >= 0 ? ug2.u : G.GRASS].c : (ug2.c || [110, 140, 80]), stonyS = rawLv(gx + side, gy) > LV_FOOT || !!ug2.rock || !!ug2.dot || !!(ug2.solid && !ug2.tree), altoS = hi - l >= 2;
      for (let y = 0; y < T; y++) {
        const wy = gy * T + y, w = rkS ? 0 : wmax - ((ihash(wy >> 2, gx * 17 + side) * 3) | 0);
        const lipW = 1 + ((ihash(wy >> 1, gx * 29 + side) * 2) | 0); // canto de la terraza visto de lado (hierba, tierra…)
        for (let k = 0; k < w; k++) { const x = side < 0 ? k : T - 1 - k, i = (by + y) * W + bx + x;
          if (k < lipW) { const f = k === lipW - 1 ? 0.66 : 1.02; u[i] = px32(topS[0] * f, topS[1] * f, topS[2] * f); continue; }
          const f = texPared(gx * T + x, wy, 0.3 + 0.35 * (k / w), stonyS, 0, altoS) * sh * (k === w - 1 ? 0.62 : 1); // misma textura que la pared de delante, continua entre casillas
          u[i] = px32(rk[0] * f, rk[1] * f, rk[2] * f); }
        // sombra suave junto a la pared
        const sw = 3 + Math.min(4, (hi - l) * 2); for (let k = w; k < w + sw && k < T; k++) { const x = side < 0 ? k : T - 1 - k, i = (by + y) * W + bx + x, t = (k - w) / sw; u[i] = scale(u[i], 0.66 + 0.34 * t * t); } // sombra más ancha cuanto más alta la pared
      }
    }
    if (rk0) { const dnL = esRocaM(gx, gy + 1) ? l : lvV(gx, gy + 1);
      if (dnL < l) { const fhR = faceH(l - dnL), rock = rockOf(gnd(gx, gy), true), top = GI[gnd(gx, gy)].c || [120, 118, 114];
        const finL = !esRocaM(gx - 1, gy) || esRocaM(gx - 1, gy + 1), finR = !esRocaM(gx + 1, gy) || esRocaM(gx + 1, gy + 1);
        const gb = GI[gnd(gx, gy + 1)], musgo = gb.flora || /GRASS|MOSS|JUNGLE/.test(gb.key || ''), mc = GI[gb.flora && gb.u >= 0 ? gb.u : G.GRASS].c || [80, 130, 60];
        for (let x = 0; x < T; x++) { const wx = gx * T + x, y0f = Math.max(3, T - fhR + (((ihash(wx >> 2, gy * 5 + 9) * 3) | 0) - 1));
          const esq = finL && x < 3 ? 1.2 - x * 0.06 : finR && x > T - 4 ? 0.64 + (T - 1 - x) * 0.1 : 1;
          const cuelga = musgo && ihash(wx >> 1, gy * 11 + 5) > 0.62 ? 1 + ((ihash(wx, gy * 3) * 4) | 0) : 0;
          for (let y = y0f; y < T; y++) { const i = (by + y) * W + bx + x, yy = y - y0f;
            if (cuelga && yy >= 1 && yy < 1 + cuelga) { const f = 0.8 - (yy - 1) * 0.1; u[i] = px32(mc[0] * f, mc[1] * f, mc[2] * f); continue; } // musgo que cuelga
            if (yy < 2) { const f = yy === 0 ? 1.16 : 0.66; u[i] = px32(top[0] * f, top[1] * f, top[2] * f); continue; } // canto de arriba
            const k = (y - y0f) / Math.max(1, T - y0f), q = paredRocaPx(gnd(gx, gy), gx, gy, x, y - y0f, k, l - dnL >= 2);
            u[i] = scale(q, (y > T - 4 ? 0.78 + (T - 1 - y) * 0.06 : 1) * esq); } }
        const gd = GI[gnd(gx, gy)]; if (gd.dot) { // la mena asoma también por la pared: pepitas gruesas con contorno
          const m = gd.dot.match(/\w\w/g).map(hh => parseInt(hh, 16)), y0w = Math.max(4, T - fhR + 3), nP = 1 + ((ihash(gx, gy * 3 + 1) * 2) | 0);
          for (let k = 0; k < nP; k++) { const cx = 4 + ((ihash(gx * 5 + k, gy) * (T - 9)) | 0), cy = y0w + 1 + ((ihash(gx, gy * 5 + k) * Math.max(1, T - 3 - y0w - 3)) | 0);
            const cel = [[0, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2]].filter((_, q) => q < 4 || ihash(gx + q, gy + k) > 0.3);
            const has = (dx, dy) => cel.some(c => c[0] === dx && c[1] === dy);
            for (const [dx, dy] of cel) for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) if (!has(dx + ox, dy + oy)) { const xx = cx + dx + ox, yy = cy + dy + oy; if (xx >= 0 && xx < T && yy >= y0w && yy < T) { const i = (by + yy) * W + bx + xx; u[i] = scale(u[i], 0.45); } }
            for (const [dx, dy] of cel) { const xx = cx + dx, yy = cy + dy; if (xx < 0 || xx >= T || yy >= T) continue; const lit = !has(dx - 1, dy) || !has(dx, dy - 1), f = lit ? 1.25 : (!has(dx + 1, dy) || !has(dx, dy + 1)) ? 0.7 : 0.95; u[(by + yy) * W + bx + xx] = px32(m[0] * f, m[1] * f, m[2] * f); }
            if (cx >= 0 && cy < T) u[(by + cy) * W + bx + cx] = px32(Math.min(255, m[0] * 1.6 + 30), Math.min(255, m[1] * 1.6 + 30), Math.min(255, m[2] * 1.6 + 30)); } } } }
    if (l > up) { const iL = l > lf ? 4 : 0, iR = l > rt ? 4 : 0; for (let x = iL; x < T - iR; x++) { u[by * W + bx + x] = scale(u[by * W + bx + x], 1.22); u[(by + 1) * W + bx + x] = scale(u[(by + 1) * W + bx + x], 1.1); } } // canto de atrás con luz (sin llegar a las esquinas: no hace cruces)
    if (rk0) for (const side of [-1, 1]) { const nl = esRocaM(gx + side, gy) ? l : lvV(gx + side, gy); if (nl >= l) continue;
      const rock = rockOf(gnd(gx, gy), true), sh = side < 0 ? 0.92 : 0.66, wm = Math.min(6, 3 + (l - nl));
      for (let y = 0; y < T; y++) { const wy = gy * T + y, w = wm - ((ihash(wy >> 2, gx * 17 + side) * 2) | 0);
        for (let k = 0; k < w; k++) { const x = side < 0 ? k : T - 1 - k, i = (by + y) * W + bx + x;
          if (k === w - 1) { u[i] = scale(u[i], 1.16); continue; } // canto de luz junto a la cara de arriba
          u[i] = scale(paredRocaPx(gnd(gx, gy), gx, gy, x, y, 0.3, l - nl >= 2), sh * (k === 0 ? 0.8 : 1)); } } }
    /* (los cantos laterales los pone la franja de la pared de al lado, con su hierba: aquí no van líneas rectas que hacían cruces) */
    // Esquinas redondeadas: en las esquinas de delante de una terraza (abajo a la izquierda o a la derecha, donde se
    // juntan su pared de delante y la lateral) la cara de arriba se curva y deja ver la pared por la esquina
    if (!rk0 && !meLiq) { const dnV = esRocaM(gx, gy + 1) ? 99 : lvV(gx, gy + 1);
      if (dnV < l) for (const side of [-1, 1]) { const sv = side < 0 ? lf : rt; if (sv >= l || esRocaM(gx + side, gy)) continue;
        const R = 6, g0 = GI[gnd(gx, gy)], topc = g0.flora ? GI[g0.u >= 0 ? g0.u : G.GRASS].c : (g0.c || [110, 140, 80]), rkc = rockOf(gnd(gx, gy), rawLv(gx, gy) > LV_FOOT), stony = rawLv(gx, gy) > LV_FOOT || !!g0.rock || !!g0.dot;
        for (let yy = 0; yy < R; yy++) for (let xx = 0; xx < R; xx++) { const dx = R - 0.5 - xx, dy = R - 0.5 - yy, dd = Math.hypot(dx, dy); // xx,yy: desde la esquina hacia dentro; dd: distancia al centro de la curva
          if (dd < R - 1.6) continue; const x = side < 0 ? xx : T - 1 - xx, y = T - 1 - yy, i = (by + y) * W + bx + x;
          if (dd < R - 0.4) { const f = dd < R - 1 ? 0.95 : 0.66; u[i] = px32(topc[0] * f, topc[1] * f, topc[2] * f); continue; } // canto curvo
          const f = texPared(gx * T + x, gy * T + y, 0.25, stony, 0, false) * (side < 0 ? 0.85 : 0.72); u[i] = px32(rkc[0] * f, rkc[1] * f, rkc[2] * f); void dx; void dy; } } }
    /* Esquina exterior: la pared lateral de la terraza de la diagonal de arriba baja también por esta casilla
       (tanto como su pared frontal); si no, en la esquina quedaba un hueco sin textura */
    if (up <= l) for (const side of [-1, 1]) {
      const dg = rk0 && esRocaM(gx + side, gy - 1) ? l : lvV(gx + side, gy - 1); if (dg <= l || (rk0 && esRocaM(gx + side, gy) ? l : lvV(gx + side, gy)) > l) continue;
      if (meLiq && GI[gnd(gx + side, gy - 1)].liquid) continue;
      if (esRocaM(gx + side, gy - 1)) { // la roca lleva su pared dentro; aquí solo su sombra de esquina
        if (!esRocaM(gx, gy - 1)) { const SLc = 6 + Math.min(3, dg - l) * 3;
          for (let y = 0; y < SLc; y++) { const wv = side < 0 ? Math.round((SLc - y) * 0.85) : Math.max(0, 4 - y); // a la derecha de la roca la sombra se alarga en diagonal
            for (let k = 0; k < wv; k++) { const x = side < 0 ? k : T - 1 - k, i = (by + y) * W + bx + x, t = Math.max(k / Math.max(1, wv), y / SLc); u[i] = scale(u[i], 0.56 + 0.44 * t * t); } } }
        continue; }
      const fh = Math.min(T, faceH(dg - l)), wmax = Math.min(7, 3 + (dg - l) * 2), rk = rockOf(gnd(gx + side, gy - 1), rawLv(gx + side, gy - 1) > LV_FOOT), sh = side < 0 ? 0.72 : 0.95;
      const ugd = GI[gnd(gx + side, gy - 1)], stonyC = rawLv(gx + side, gy - 1) > LV_FOOT || !!ugd.rock || !!ugd.dot || !!(ugd.solid && !ugd.tree), topc = ugd.flora ? GI[ugd.u >= 0 ? ugd.u : G.GRASS].c : (ugd.c || [110, 140, 80]), SLc = 6 + Math.min(3, dg - l) * 3;
      for (let y = 0; y < fh + SLc + 2 && y < T; y++) {
        const wy = gy * T + y, w = wmax - ((ihash(wy >> 2, gx * 17 + side) * 3) | 0);
        for (let k = 0; k < T; k++) {
          const x = side < 0 ? k : T - 1 - k, wx = gx * T + x, i = (by + y) * W + bx + x;
          const hxc = Math.min(fh, fh + (((ihash(wx >> 2, gy * 5 + 1) * 5) | 0) - 2)), wE = anchoEsq(w, y, hxc); // la pared de la esquina se curva hacia abajo (redondeada, sin canto recto)
          if (y < hxc && k < wE) { // pared lateral, con el canto de hierba arriba como la pared de delante
            const lip = 2 + ((ihash(wx >> 1, gy * 7 + 3) * 3) | 0);
            /* sin canto de hierba aquí: en la esquina quedaba como una raya verde flotando (la curva de arriba ya lo resuelve) */
            /* bajo la esquina solo hay pared: sin canto de hierba vertical (hacía una cruz con el canto de la pared de delante) */
            const f = texPared(wx, Math.max(0, y - 3), 0.3 + 0.5 * (y / Math.max(1, hxc)), stonyC, gy, dg - l >= 2) * sh * (k === w - 1 ? 0.6 : 1) * (y > hxc - 3 ? 0.85 : 1); u[i] = px32(rk[0] * f, rk[1] * f, rk[2] * f); continue; }
          // sombra junto a la pared y en cuña bajo la esquina (la luz viene de arriba a la izquierda: a la derecha se alarga)
          const dy = y - Math.max(0, hxc), reach = dy < 0 ? wE + 3 : side < 0 ? wE + Math.round((SLc - dy) * 0.85) : wE + Math.max(0, 3 - dy);
          if (k >= reach) break; if (dy >= SLc) continue;
          const t = Math.min(1, Math.max(0, dy < 0 ? (k - wE) / 3 : Math.max((k - wE) / Math.max(1, reach - wE), dy / SLc)));
          u[i] = scale(u[i], 0.56 + 0.44 * t * t);
        }
      }
    }
    if (up <= l) continue;
    // Pared bajo la terraza de arriba: canto con hierba que cuelga, roca con estratos y grietas
    // (luz desde arriba), borde inferior irregular, sombra y cascada si arriba hay agua
    const rkUp = esRocaM(gx, gy - 1), fh = rkUp ? 0 : faceH(up - l), ut = gnd(gx, gy - 1), ug = GI[ut], wet = ug.liquid === 'water';
    if (ug.liquid && meLiq) continue; // agua sobre agua: el agua se iguala, no hay salto
    const top = ug.flora ? GI[ug.u >= 0 ? ug.u : G.GRASS].c : (ug.c || [110, 140, 80]), c0 = ug.c || [110, 100, 80];
    const rock = rockOf(ut, rawLv(gx, gy - 1) > LV_FOOT), stonyUp = rawLv(gx, gy - 1) > LV_FOOT || !!ug.rock || !!ug.dot || !!(ug.solid && !ug.tree);
    const dH = up - l, SL = 6 + Math.min(3, dH) * 3; // largo de la sombra al pie: cuanto más alta la pared, más larga
    const finL = lvV(gx - 1, gy - 1) <= lvV(gx - 1, gy) || esRocaM(gx - 1, gy), finR = lvV(gx + 1, gy - 1) <= lvV(gx + 1, gy) || esRocaM(gx + 1, gy); // ¿acaba aquí la pared? (esquina)
    for (let x = 0; x < T; x++) {
      const wx = gx * T + x; let hx = rkUp ? 0 : fh + (((ihash(wx >> 2, gy * 5 + 1) * 5) | 0) - 2), lipH = 2 + ((ihash(wx >> 1, gy * 7 + 3) * 4) | 0);
      const esq = finL && x < 3 ? 1.22 - x * 0.06 : finR && x > T - 4 ? 0.62 + (T - 1 - x) * 0.1 : 1; // canto de la esquina: luz a la izquierda, sombra a la derecha
      for (let y = 0; y < Math.min(T, hx + SL + 3); y++) {
        const i = (by + y) * W + bx + x;
        if (wet && y >= hx) { const fz = 1 - (y - hx) / 7, b = ihash(wx >> 2, gy * 3 + ((y - hx) >> 1)) > 0.45; if (b) u[i] = px32(225 + 25 * fz, 238 + 14 * fz, 255); continue; } // espuma al pie
        if (rkUp && y >= hx && y - hx < 5 && ihash(wx * 3 + 1, gy * 7 + y) > 0.93) { const f = 0.75 + ihash(wx, y) * 0.4; u[i] = px32(rock[0] * f, rock[1] * f, rock[2] * f); continue; } // piedritas caídas
        if (y >= hx) { const SLx = SL + ((ihash(wx >> 1, gy * 19 + 4) * 5) | 0) - 2, t = Math.min(1, (y - hx) / SLx), d = (ihash(wx, gy * T + y) - 0.5) * 0.08; u[i] = scale(u[i], y === hx ? (rkUp ? 0.55 : 0.45) : Math.min(1, 0.6 + 0.4 * Math.pow(t, 1.4) + (t > 0.45 ? d : 0))); continue; } // sombra al pie: suave, con el final irregular (sin corte recto) // sombra al pie (suave y más larga si la pared es alta)
        if (wet) { const col = ihash(wx >> 1, gy * 7 + 2), t = y / Math.max(1, hx), hi = col > 0.78, f = 0.88 + col * 0.18 + t * 0.12; u[i] = hi ? px32(205 + 40 * t, 228 + 22 * t, 255) : px32((96 + 70 * t) * f, (150 + 60 * t) * f, (205 + 30 * t) * f); continue; }
        const enCurva = (finR && x > T - 7) || (finL && x < 6); // bajo la esquina redondeada de arriba el canto sigue la curva (no llega recto a la punta)
        const lipX = enCurva ? Math.max(0, lipH - Math.round((finR ? x - (T - 7) : 6 - x) * 0.7)) : lipH;
        if (y < lipX) { const f = y === 0 ? 1.18 : y === lipX - 1 ? 0.62 : 0.92; u[i] = px32(top[0] * f, top[1] * f, top[2] * f); continue; }
        const k = Math.max(0, y - lipH) / Math.max(1, hx - lipH), f = texPared(wx, Math.max(0, y - lipH), k, stonyUp, gy, dH >= 2) * (y === lipX ? 0.8 : 1);
        const ao = y > hx - 4 ? 0.82 + (hx - y) * 0.045 : 1; // oclusión: la base de la pared, más oscura
        u[i] = px32(rock[0] * f * esq * ao, rock[1] * f * esq * ao, rock[2] * f * esq * ao);
      }
    }
    void dn;
  }
}
// Versión simple para el zoom lejano (trozos a media o cuarta resolución)
function paintCliffsLo(c, x0, y0) {
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
    const gx = x0 + tx, gy = y0 + ty, l = lvV(gx, gy), up = lvV(gx, gy - 1);
    if (false && l && !GI[gnd(gx, gy)].liquid) { c.fillStyle = l > 0 ? `rgba(255,255,255,${l * 0.04})` : `rgba(0,0,0,${Math.min(0.45, -l * 0.12)})`; c.fillRect(tx * T, ty * T, T, T); }
    if (up > l && !(GI[gnd(gx, gy - 1)].liquid && GI[gnd(gx, gy)].liquid)) { const fh = faceH(up - l); c.fillStyle = GI[gnd(gx, gy - 1)].liquid === 'water' ? '#a8d0f0' : '#5a4a3a'; c.fillRect(tx * T, ty * T, T, fh); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(tx * T, ty * T + fh, T, 5); }
  }
}
