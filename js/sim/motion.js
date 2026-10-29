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
// Nivel en un punto: la pared (parte de arriba de la casilla bajo un acantilado) cuenta como la terraza de arriba
function lvPoint(px, py) {
  const tx = Math.floor(px / T), ty = Math.floor(py / T), l = lvAt(tx, ty), up = lvAt(tx, ty - 1);
  return up > l && py - ty * T < faceH(up - l) ? up : l;
}
const _flyMove = () => hasFlag('phoenixWings') || mountFly();
// ---------- Pies libres: colisión + alturas ----------
function playerFree(x, y) {
  if (!(passable(x - 5, y + 5, 'player') && passable(x + 5, y + 5, 'player') && passable(x, y + 1, 'player'))) return false;
  const p = S.player; if (x === p.x && y === p.y) return true;
  const to = lvPoint(x, y + 5), cur = lvPoint(p.x, p.y + 5);
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
  if (survOn()) { const pc = S.pc; if (pc.stam < 5) { toastErr('Sin aguante'); return; } pc.stam -= 5; pc.rest = 0; }
  P.vz = JUMP_V * (P.swim === 1 ? 0.8 : 1); P.z = 0.01; P.air = 0;
  if (P.swim === 1) splash(S.player.x, S.player.y + 6, 5);
  tone(260, 0.1, 'sine', 0.03, 1.8);
}
let _swimRip = 0, _drownMsg = 0;
// Antes de mover: gravedad, aterrizaje y estado de nado
function motionPre(dt) {
  const p = S.player;
  if (P.z > 0 || P.vz > 0) {
    P.vz -= GRAV * dt; P.z += P.vz * dt; P.air = (P.air || 0) + dt;
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
  if (!s && v > 300 && survOn()) hurt('bruise', ['legL', 'legR', 'footL', 'footR'][(Math.random() * 4) | 0], 0.8, 'Caída');
}
// Después de mover: si has bajado de nivel, caes desde la altura de la pared
function motionPost(fromLv) {
  const p = S.player, now = lvPoint(p.x, p.y + 5);
  if (now < fromLv && !_flyMove()) { P.z = (P.z || 0) + LV_H * (fromLv - now); if (!(P.vz > 0)) P.vz = 0; }
}
// Velocidad objetivo según el terreno y el agua; agarre (cuánto tarda en acelerar o frenar)
function moveFactors() {
  const gi = groundInfo(), sw = P.swim || 0, air = (P.z || 0) > 0.5;
  const mul = sw === 2 ? 0.5 : sw === 1 ? 0.72 : gi.mul, grip = air ? 2.5 : sw ? 4 : gi.slip ? 1.6 : 13;
  return { mul, grip, slip: gi.slip };
}
// ---------- Dibujo: ondas ----------
function drawRipples(ctx) {
  for (const r of RIPPLES) { const k = 1 - r.t / r.t0; ctx.globalAlpha = (1 - k) * 0.55; ctx.strokeStyle = '#e0f4ff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r * (0.4 + k), r.r * (0.4 + k) * 0.38, 0, 0, 7); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
// ---------- Dibujo: acantilados en el suelo de cada trozo ----------
// Sobre los píxeles ya compuestos (ImageData): pared de roca con estratos bajo cada terraza,
// borde con hierba que cuelga, sombra en el suelo de abajo y cascadas si el agua cae.
// Color de la pared: la propia roca si es roca; si es tierra o hierba, tierra parda
function rawLv(x, y) { const c = getChunk(x >> CSH, y >> CSH); return (c.h || chunkLv(c))[((y & CMASK) << CSH) | (x & CMASK)]; }
function rockOf(t, mtn) { const g = GI[t], c0 = mtn && !g.rock && !g.dot ? [118, 116, 112] : g.c || [110, 100, 80]; return mtn || g.rock || g.dot || g.solid && !g.tree ? [c0[0] * 0.8, c0[1] * 0.8, c0[2] * 0.8] : [c0[0] * 0.25 + 112 * 0.75, c0[1] * 0.2 + 94 * 0.8, c0[2] * 0.2 + 74 * 0.8]; }
function paintCliffs(u, W, x0, y0) {
  const px32 = (r, g, b) => (255 << 24 | Math.max(0, Math.min(255, b)) << 16 | Math.max(0, Math.min(255, g)) << 8 | Math.max(0, Math.min(255, r))) >>> 0;
  const scale = (v, f) => { const r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255; return px32(r * f, g * f, b * f); };
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
    const gx = x0 + tx, gy = y0 + ty, l = lvAt(gx, gy), bx = tx * T, by = ty * T;
    const up = lvAt(gx, gy - 1), lf = lvAt(gx - 1, gy), rt = lvAt(gx + 1, gy), dn = 0;
    // Terrazas altas un poco más claras (se lee la altura de un vistazo)
    // (en la montaña ya se leen las capas por sus paredes: no hace falta aclarar)
    // (el agua es plana: no se aclara por terraza; si no, en lagos y costas salían recuadros de otro tono)
    if (l && l <= LV_FOOT && !GI[gnd(gx, gy)].liquid) { const f = Math.max(0.55, 1 + l * 0.04); for (let y = 0; y < T; y++) { let i = (by + y) * W + bx; for (let x = 0; x < T; x++, i++) { const v = u[i]; u[i] = (0xff000000 | Math.min(255, ((v >> 16) & 255) * f) << 16 | Math.min(255, ((v >> 8) & 255) * f) << 8 | Math.min(255, (v & 255) * f)) >>> 0; } } }
    // Paredes laterales: franja de roca irregular en el lado bajo (la de la izquierda en sombra,
    // la de la derecha iluminada) y canto claro en la terraza alta
    const meLiq = GI[gnd(gx, gy)].liquid;
    for (const [side, hi] of [[-1, lf], [1, rt]]) {
      if (hi <= l || (meLiq && GI[gnd(gx + side, gy)].liquid)) continue; // agua junto a agua: misma superficie
      const wmax = Math.min(7, 3 + (hi - l) * 2), rk = rockOf(gnd(gx + side, gy), rawLv(gx + side, gy) > LV_FOOT), sh = side < 0 ? 0.72 : 0.95;
      for (let y = 0; y < T; y++) {
        const wy = gy * T + y, w = wmax - ((ihash(wy >> 2, gx * 17 + side) * 3) | 0);
        for (let k = 0; k < w; k++) { const x = side < 0 ? k : T - 1 - k, i = (by + y) * W + bx + x, f = sh * (k === w - 1 ? 0.6 : 1) * (((wy >> 2) & 1) ? 1.05 : 0.95);
          u[i] = px32(rk[0] * f, rk[1] * f, rk[2] * f); }
        // sombra suave junto a la pared
        for (let k = w; k < w + 3; k++) { const x = side < 0 ? k : T - 1 - k, i = (by + y) * W + bx + x; u[i] = scale(u[i], 0.7 + (k - w) * 0.1); }
      }
    }
    if (l > up) for (let x = 0; x < T; x++) { u[by * W + bx + x] = scale(u[by * W + bx + x], 1.25); u[(by + 1) * W + bx + x] = scale(u[(by + 1) * W + bx + x], 1.12); } // canto iluminado
    if (l > lf) for (let y = 0; y < T; y++) u[(by + y) * W + bx] = scale(u[(by + y) * W + bx], 1.2);
    if (l > rt) for (let y = 0; y < T; y++) u[(by + y) * W + bx + T - 1] = scale(u[(by + y) * W + bx + T - 1], 0.8);
    if (up <= l) continue;
    // Pared bajo la terraza de arriba: canto con hierba que cuelga, roca con estratos y grietas
    // (luz desde arriba), borde inferior irregular, sombra y cascada si arriba hay agua
    const fh = faceH(up - l), ut = gnd(gx, gy - 1), ug = GI[ut], wet = ug.liquid === 'water';
    if (ug.liquid && meLiq) continue; // agua sobre agua: el agua se iguala, no hay salto
    const top = ug.flora ? GI[ug.u >= 0 ? ug.u : G.GRASS].c : (ug.c || [110, 140, 80]), c0 = ug.c || [110, 100, 80];
    const rock = rockOf(ut, rawLv(gx, gy - 1) > LV_FOOT);
    for (let x = 0; x < T; x++) {
      const wx = gx * T + x, hx = fh + (((ihash(wx >> 2, gy * 5 + 1) * 5) | 0) - 2), lipH = 2 + ((ihash(wx >> 1, gy * 7 + 3) * 4) | 0);
      for (let y = 0; y < Math.min(T, hx + 7); y++) {
        const i = (by + y) * W + bx + x;
        if (wet && y >= hx) { const fz = 1 - (y - hx) / 7, b = ihash(wx >> 2, gy * 3 + ((y - hx) >> 1)) > 0.45; if (b) u[i] = px32(225 + 25 * fz, 238 + 14 * fz, 255); continue; } // espuma al pie
        if (y >= hx) { u[i] = scale(u[i], y === hx ? 0.45 : 0.6 + (y - hx) * 0.06); continue; } // sombra al pie
        if (wet) { const col = ihash(wx >> 1, gy * 7 + 2), t = y / Math.max(1, hx), hi = col > 0.78, f = 0.88 + col * 0.18 + t * 0.12; u[i] = hi ? px32(205 + 40 * t, 228 + 22 * t, 255) : px32((96 + 70 * t) * f, (150 + 60 * t) * f, (205 + 30 * t) * f); continue; }
        if (y < lipH) { const f = y === 0 ? 1.18 : y === lipH - 1 ? 0.62 : 0.92; u[i] = px32(top[0] * f, top[1] * f, top[2] * f); continue; }
        const k = (y - lipH) / Math.max(1, hx - lipH), band = ((y + ((ihash(wx >> 3, gy * 13) * 3) | 0)) >> 2) & 1;
        const crack = ihash(wx >> 1, gy * 31 + (y >> 2)) > 0.92, peb = ihash(wx, gy * T + y) > 0.95;
        const f = (1.2 - k * 0.5) * (band ? 1.07 : 0.93) * (crack ? 0.62 : 1) * (peb ? 1.25 : 1) * (y === lipH ? 0.8 : 1);
        u[i] = px32(rock[0] * f, rock[1] * f, rock[2] * f);
      }
    }
    void dn;
  }
}
// Versión simple para el zoom lejano (trozos a media o cuarta resolución)
function paintCliffsLo(c, x0, y0) {
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
    const gx = x0 + tx, gy = y0 + ty, l = lvAt(gx, gy), up = lvAt(gx, gy - 1);
    if (l) { c.fillStyle = l > 0 ? `rgba(255,255,255,${l * 0.04})` : `rgba(0,0,0,${Math.min(0.45, -l * 0.12)})`; c.fillRect(tx * T, ty * T, T, T); }
    if (up > l && !(GI[gnd(gx, gy - 1)].liquid && GI[gnd(gx, gy)].liquid)) { const fh = faceH(up - l); c.fillStyle = GI[gnd(gx, gy - 1)].liquid === 'water' ? '#a8d0f0' : '#5a4a3a'; c.fillRect(tx * T, ty * T, T, fh); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(tx * T, ty * T + fh, T, 5); }
  }
}
