'use strict';
// =====================================================================================
//  Texturas del terreno: cada tipo de casilla se pinta UNA vez en 4 variantes de 32×32
//  con mucho detalle (grano por píxel, briznas, piedras con volumen, cristales de mena,
//  ondas de arena, brillos de nieve, olas…). Al construir el mapa solo se copian (un
//  drawImage por casilla), así que se ve mejor y además es más rápido que dibujarlo todo.
//  Encima se añaden los bordes: sombra junto a la roca, orilla mojada y espuma en el agua.
// =====================================================================================
const TEX_VARS = 4, _tex = new Map();
const th = (t, v, k) => hash2(t * 131 + v * 17, v * 7 + 3, k); // azar fijo por tipo y variante
function tileTex(t, v) {
  const key = t * TEX_VARS + v; let cv = _tex.get(key); if (cv) return cv;
  cv = mkCanvas(T, T); const c = cv.getContext('2d'), g = GI[t];
  paintTexBase(c, g, t, v); paintTexDetail(c, g, t, v);
  _tex.set(key, cv); return cv;
}
// Píxeles de una textura (para componer los chunks sin drawImage)
let _baseDone = false; const _texPx = new Map();
function tileTexPx(t, v) { const k = t * TEX_VARS + v; let p = _texPx.get(k); if (!p) { p = new Uint32Array(tileTex(t, v).getContext('2d').getImageData(0, 0, T, T).data.buffer.slice(0)); _texPx.set(k, p); } return p; }
/* Algas: se pintan sobre el agua que las rodea (mar, mar profundo, frío…), sin su propio tono: así no salen cuadrados */
const _kelpPx = new Map();
function kelpUnder(x, y) { const n = {}; let best = G.WATER, bn = 0; for (let d = 0; d < 8; d++) { const t = gnd(x + BL_DX[d], y + BL_DY[d]), g = GI[t]; if (!g.liquid || g.kelp || g.glow) continue; n[t] = (n[t] || 0) + 1; if (n[t] > bn) { bn = n[t]; best = t; } } return best; }
function kelpTexPx(under, v) { const k = under * TEX_VARS + v; let p = _kelpPx.get(k); if (p) return p;
  const cv = mkCanvas(T, T), c = cv.getContext('2d'), g = GI[under]; paintTexBase(c, g, under, v); paintTexDetail(c, { ...g, kelp: 1, coral: 0 }, under, v);
  p = new Uint32Array(c.getImageData(0, 0, T, T).data.buffer.slice(0)); _kelpPx.set(k, p); return p; }
// Color base con grano por píxel (manchas grandes + ruido fino)
function paintTexBase(c, g, t, v) {
  // En los líquidos cada casilla debe empalmar con la de al lado: sin cambio de tono por variante ni degradado
  // por casilla (si no, un lago se ve como un tablero de cuadros)
  const img = c.createImageData(T, T), d = img.data, base = g.c, jit = g.liquid ? 0 : (th(t, v, 1) - 0.5) * 12;
  const amp = g.liquid ? (g.glow ? 18 : 5) : g.key && /SNOW|ICE|SALT/.test(g.key) ? 5 : g.tuft ? 11 : g.rock || g.dot ? 13 : /SAND/.test(g.key || '') ? 7 : 9;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const big = hash2((x >> 3) + v * 5, (y >> 3) + t, 9) - 0.5, fine = hash2(x + v * 37, y + t * 11, 4) - 0.5;
    let n = jit + big * amp * 1.2 + fine * amp * 0.8;
    const i = (y * T + x) * 4; d[i] = clamp(base[0] + n, 0, 255); d[i + 1] = clamp(base[1] + n, 0, 255); d[i + 2] = clamp(base[2] + n * 0.9, 0, 255); d[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
}
function paintTexDetail(c, g, t, v) {
  const h = k => th(t, v, k), key = g.key || '';
  if (g.liquid) {
    if (g.glow) { // lava: costra oscura con grietas incandescentes
      for (let k = 0; k < 4; k++) { c.fillStyle = 'rgba(60,10,4,.45)'; c.beginPath(); c.ellipse(4 + h(k) * 24, 4 + h(k + 5) * 24, 4 + h(k + 9) * 5, 3 + h(k + 2) * 3, h(k + 3) * 3, 0, 7); c.fill(); }
      c.strokeStyle = 'rgba(255,220,90,.85)'; c.lineWidth = 1.2; c.beginPath(); for (let k = 0; k < 3; k++) { c.moveTo(h(k + 20) * 32, h(k + 21) * 32); c.lineTo(h(k + 22) * 32, h(k + 23) * 32); } c.stroke();
    } else if (g.bubble) { c.strokeStyle = g.bubble; c.lineWidth = 1; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(5 + h(k) * 22, 5 + h(k + 5) * 22, 1.2 + h(k + 3) * 2, 0, 7); c.stroke(); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(4 + h(k) * 22, 4 + h(k + 5) * 22, 1, 1); } }
    else { // agua: rayitas de luz y sombra de píxeles (el movimiento lo pone render/water.js)
      for (let k = 0; k < 3; k++) { const wx = (h(k + 30) * 27) | 0, wy = (h(k + 31) * 30) | 0, l = 2 + ((h(k + 32) * 4) | 0); c.fillStyle = 'rgba(255,255,255,.10)'; c.fillRect(wx, wy, l, 1); c.fillStyle = 'rgba(0,10,30,.08)'; c.fillRect(wx + 1, wy + 1, l, 1); }
      c.fillStyle = 'rgba(255,255,255,.3)'; for (let k = 0; k < 2; k++) c.fillRect((h(k + 40) * 31) | 0, (h(k + 41) * 31) | 0, 1, 1);
    }
    if (g.coral) for (let k = 0; k < 6; k++) { const cc = ['#ff7a7a', '#ffb05a', '#e86ad0', '#7ae0d0'][(h(k + 40) * 4) | 0], bx = (3 + h(k + 20) * 24) | 0, by = (3 + h(k + 30) * 24) | 0; c.fillStyle = cc; // corales de píxeles
      for (let j = 0; j < 7; j++) c.fillRect(bx + (((h(k * 9 + j + 100) * 5) | 0) - 2), by + (((h(k * 9 + j + 200) * 5) | 0) - 2), 1, 1); c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(bx, by - 1, 1, 1); }
    if (g.kelp) for (let k = 0; k < 5; k++) { c.fillStyle = 'rgba(20,56,40,.32)'; const kx = (3 + h(k) * 24) & ~1, ky = (3 + h(k + 10) * 24) & ~1; c.fillRect(kx, ky, 4, 2); c.fillRect(kx + 2, ky + 2, 4, 2); c.fillRect(kx - 2, ky + 4, 4, 2); } // sombra del bosque de algas (las algas ondulan en render/water.js)
    return;
  }
  if (g.dot || g.rock || (g.solid && !g.tree && !g.plant && !g.flora)) { rocaPx(c, g, t, v); } // roca y menas en pixel art, como el resto del juego
  else if (g.tuft) { // briznas de hierba de dos tonos y matas más oscuras
    for (let k = 0; k < 3; k++) { c.fillStyle = 'rgba(0,30,0,.10)'; c.beginPath(); c.ellipse(h(k + 50) * 32, h(k + 51) * 32, 5 + h(k) * 4, 3 + h(k + 1) * 3, 0, 0, 7); c.fill(); }
    for (let k = 0; k < 16; k++) { const bx = h(k + 60) * 30, by = 4 + h(k + 61) * 26, l = 3 + h(k + 62) * 3; c.fillStyle = k & 1 ? g.tuft + 'aa' : 'rgba(20,50,20,.35)'; c.fillRect(bx, by - l, 1, l); if (k % 3 === 0) c.fillRect(bx + 1, by - l + 1, 1, l - 1); }
  } else if (/SAND/.test(key)) { // ondas de arena
    for (let k = 0; k < 3; k++) { const wy = 6 + k * 9 + h(k) * 3; c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, wy); c.quadraticCurveTo(16, wy - 3 + h(k + 4) * 3, 32, wy); c.stroke(); c.strokeStyle = 'rgba(0,0,0,.10)'; c.beginPath(); c.moveTo(0, wy + 1.5); c.quadraticCurveTo(16, wy - 1.5 + h(k + 4) * 3, 32, wy + 1.5); c.stroke(); }
    for (let k = 0; k < 5; k++) { c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(h(k + 20) * 31, h(k + 21) * 31, 1, 1); }
  } else if (/SNOW/.test(key)) { for (let k = 0; k < 7; k++) { c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(h(k) * 31, h(k + 7) * 31, 1, 1); } c.fillStyle = 'rgba(140,180,220,.12)'; c.beginPath(); c.ellipse(h(30) * 32, h(31) * 32, 8, 4, 0, 0, 7); c.fill(); }
  else if (/DIRT|MUD|PEAT|CLAY|ASH/.test(key)) { for (let k = 0; k < 6; k++) { c.fillStyle = k & 1 ? 'rgba(0,0,0,.16)' : 'rgba(255,255,255,.08)'; c.beginPath(); c.ellipse(h(k) * 30 + 1, h(k + 6) * 30 + 1, 1.5 + h(k + 2) * 2.5, 1 + h(k + 3) * 1.5, h(k + 4) * 3, 0, 7); c.fill(); } }
  if (g.speck) for (let k = 0; k < 5; k++) { c.fillStyle = g.speck + '77'; c.fillRect(h(k) * 29, h(k + 4) * 29, 2, 2); }
  if (g.crack && h(7) < 0.7) { c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1; c.beginPath(); c.moveTo(4 + h(1) * 10, 6); c.lineTo(14, 16); c.lineTo(26, 22 + h(2) * 6); c.moveTo(14, 16); c.lineTo(10 + h(3) * 6, 28); c.stroke(); }
  if (g.band) { c.fillStyle = 'rgba(255,220,180,.14)'; c.fillRect(0, 4 + v * 6, T, 4); c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(0, 9 + v * 6, T, 2); }
  if (g.hole) { c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(2, 2, T - 4, T - 4); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(2, 2, T - 4, 5); }
  if (g.cobble) { for (let k = 0; k < 4; k++) { const ex = 8 + (k & 1) * 16 + (h(k) - 0.5) * 3, ey = 8 + (k >> 1) * 16; c.fillStyle = `rgba(255,255,255,${0.05 + h(k + 8) * 0.08})`; c.beginPath(); c.ellipse(ex, ey, 6.5, 5.5, 0, 0, 7); c.fill(); c.strokeStyle = 'rgba(40,38,36,.6)'; c.lineWidth = 1.2; c.stroke(); c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(ex - 3, ey - 4, 4, 1); } }
  if (g.planks) { c.fillStyle = 'rgba(60,36,16,.45)'; for (let k = 1; k < 4; k++) c.fillRect(0, k * 8, T, 1); c.fillRect(4 + v * 5, 0, 1, T); for (let k = 0; k < 4; k++) { c.fillStyle = 'rgba(60,36,16,.25)'; c.fillRect(h(k) * 28, k * 8 + 3, 4, 1); c.fillStyle = 'rgba(30,20,10,.6)'; c.fillRect(2 + (k & 1) * 26, k * 8 + 3, 1, 1); } }
  if (g.bricks) { c.fillStyle = 'rgba(230,210,190,.35)'; for (let k = 0; k < 4; k++) { c.fillRect(0, k * 8, T, 1); c.fillRect((k & 1 ? 8 : 0) + 4, k * 8, 1, 8); c.fillRect((k & 1 ? 8 : 0) + 20, k * 8, 1, 8); } c.fillStyle = 'rgba(0,0,0,.12)'; for (let k = 0; k < 4; k++) c.fillRect(0, k * 8 + 6, T, 1); }
  if (g.pit) for (let k = 0; k < 2; k++) { c.fillStyle = 'rgba(15,10,8,.75)'; c.beginPath(); c.ellipse(8 + h(k) * 16, 8 + h(k + 4) * 16, 6, 4, h(k + 7) * 3, 0, 7); c.fill(); c.fillStyle = 'rgba(120,140,90,.35)'; c.fillRect(6 + h(k) * 16, 6 + h(k + 4) * 16, 3, 1); }
  if (g.vent) { circ(c, 16, 16, 9, '#5b5638', '#2a2818'); circ(c, 16, 16, 4, '#1a1a12'); }
  if (g.vent2) { circ(c, 16, 16, 11, 'rgba(232,224,74,.18)'); circ(c, 16, 16, 8, '#2a2622', '#1a1612'); circ(c, 16, 16, 4, '#e8e04a'); }
}
// Roca vista desde arriba, en píxeles: piedras irregulares (celdas) con junta oscura, canto de luz arriba a la
// izquierda, sombra abajo a la derecha y tono propio cada una. Las menas llevan pepitas de mineral de píxeles con
// brillo y sombra (sin curvas suavizadas ni marcos de baldosa).
function rocaPx(c, g, t, v) {
  const img = c.getImageData(0, 0, T, T), u = new Uint32Array(img.data.buffer), N = 4 + ((th(t, v, 90) * 3) | 0), P = [];
  for (let k = 0; k < N; k++) P.push(th(t, v, 100 + k) * T, th(t, v, 120 + k) * T, 0.94 + th(t, v, 140 + k) * 0.12);
  const cell = new Int8Array(T * T), d12 = new Float32Array(T * T);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { let a = 1e9, b = 1e9, ia = 0;
    for (let k = 0; k < N; k++) { let dx = Math.abs(x - P[k * 3]), dy = Math.abs(y - P[k * 3 + 1]) * 1.25; dx = Math.min(dx, T - dx); dy = Math.min(dy, T * 1.25 - dy); const d = Math.sqrt(dx * dx + dy * dy); if (d < a) { b = a; a = d; ia = k; } else if (d < b) b = d; }
    cell[y * T + x] = ia; d12[y * T + x] = b - a; }
  const mul = (i, f) => { const q = u[i]; u[i] = (0xff000000 | Math.min(255, ((q >>> 16) & 255) * f) << 16 | Math.min(255, ((q >>> 8) & 255) * f) << 8 | Math.min(255, (q & 255) * f)) >>> 0; };
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const i = y * T + x, e = d12[i];
    if (e < 0.9) { mul(i, ihash(x + v * 5, y + t) > 0.25 ? 0.72 : 0.84); continue; } /* junta a trozos */                                          // junta
    const iu = ((y + T - 1) % T) * T + x, il = y * T + (x + T - 1) % T, id = ((y + 1) % T) * T + x, ir = y * T + (x + 1) % T;
    let f = P[cell[i] * 3 + 2];
    if (d12[iu] < 0.9 || d12[il] < 0.9) f *= 1.1; else if (d12[id] < 0.9 || d12[ir] < 0.9) f *= 0.9; // canto de luz / sombra
    if (ihash(x * 7 + v, y * 13 + t) > 0.965) f *= 0.8;                                // poros
    mul(i, f); }
  if (g.dot) { const m = g.dot.match(/\w\w/g).map(hh => parseInt(hh, 16)), px = (x, y, f) => { x = ((x % T) + T) % T; y = ((y % T) + T) % T; u[y * T + x] = (0xff000000 | Math.min(255, m[2] * f) << 16 | Math.min(255, m[1] * f) << 8 | Math.min(255, m[0] * f)) >>> 0; };
    for (let i = 0; i < T * T; i++) { const q = u[i]; u[i] = (0xff000000 | ((((q >>> 16) & 255) * 0.9 + m[2] * 0.1) << 16) | ((((q >>> 8) & 255) * 0.9 + m[1] * 0.1) << 8) | ((q & 255) * 0.9 + m[0] * 0.1)) >>> 0; } // la roca toma un poco el tono del mineral
    const nP = 3 + ((th(t, v, 160) * 2) | 0);
    for (let k = 0; k < nP; k++) { const cx = (4 + th(t, v, 170 + k) * 22) | 0, cy = (4 + th(t, v, 180 + k) * 22) | 0, R = 2 + th(t, v, 190 + k) * 1.6, cel = [];
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const dd = Math.hypot(dx, dy * 1.15) + (ihash(cx * 9 + dx, cy * 7 + dy + v) - 0.5) * 1.4; if (dd < R) cel.push(dx, dy); } // pepita irregular
      const has = (dx, dy) => { for (let q = 0; q < cel.length; q += 2) if (cel[q] === dx && cel[q + 1] === dy) return true; return false; };
      for (let q = 0; q < cel.length; q += 2) for (const [ox, oy] of [[1, 1], [0, 1], [1, 0], [-1, 0], [0, -1]]) if (!has(cel[q] + ox, cel[q + 1] + oy)) mul((((cy + cel[q + 1] + oy) % T + T) % T) * T + (((cx + cel[q] + ox) % T + T) % T), ox + oy > 0 ? 0.5 : 0.72); // contorno y sombra
      for (let q = 0; q < cel.length; q += 2) { const dx = cel[q], dy = cel[q + 1], lit = !has(dx - 1, dy) || !has(dx, dy - 1), dark = !has(dx + 1, dy) || !has(dx, dy + 1); px(cx + dx, cy + dy, lit ? 1.2 : dark ? 0.72 : 0.95); }
      px(cx - 1, cy - 1, 1.6); }
  }
  c.putImageData(img, 0, 0);
}
// Piedras con volumen (luz arriba a la izquierda) y grietas
function stonesTex(c, h, n, crack) {
  for (let k = 0; k < n; k++) {
    const x = 5 + h(k + 70) * 22, y = 5 + h(k + 71) * 22, rx = 3 + h(k + 72) * 4, ry = 2 + h(k + 73) * 3;
    c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(x + 1, y + 1.5, rx, ry, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(x - rx * 0.5, y - ry * 0.6, rx * 0.6, 1);
  }
  c.strokeStyle = crack; c.lineWidth = 1; c.beginPath(); const sx = h(80) * 32; c.moveTo(sx, 0); c.lineTo(sx + 4, 10 + h(81) * 6); c.lineTo(sx - 2, 18 + h(82) * 8); c.stroke();
}
// Transiciones suaves: cerca de un borde con otro suelo, los píxeles toman (con un tramado que
// se va diluyendo) los del vecino. Así las orillas y las lindes de bioma no son líneas rectas.
// azar rápido con enteros (para el bucle por píxel)
const ihash = (x, y) => { let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const BLEND_E = 15, baseTile = t => { const g = GI[t]; return g.flora ? (g.u >= 0 ? g.u : G.GRASS) : t; };
/* todos los bloques entran en la transición (también la roca y la mena), menos ruinas, abismos y pozos */
const blendable = t => { const g = GI[t]; return !g.ruin && !g.abyss && !g.hole && !g.tree && !(g.solid && !g.flora && !g.liquid); }; // la roca es un bloque alto: borde limpio
// Agua y otros líquidos: borde más estrecho (la orilla se ve nítida). 8 vecinos (también las esquinas, para que la transición no salga con muescas). Mira los chunks
// vecinos aunque aún no estén cargados (se generan: el terreno es determinista), así nunca se corta en un borde.
const BL_DX = [1, 0, -1, 0, 1, -1, -1, 1], BL_DY = [0, 1, 0, -1, 1, 1, -1, -1];
const _bw = new Float32Array(T), _bk = new Float32Array(T * T), _bb = new Float32Array(T * T), _bp = new Int8Array(T * T);
/* Transición de UN solo lado: entre dos suelos, solo el de más prioridad entra en el otro (la tierra en el
   agua, la hierba en la arena…), con una franja dentada de bloques de 4×4 píxeles. Así no salen dos
   transiciones pegadas, una en cada casilla. */
const blPrio = t => { const g = GI[t]; return g.solid ? 3 + t / 1e4 : g.liquid ? 0 : /SAND|GRAVEL/.test(g.key || '') ? 1 + t / 1e4 : 2 + t / 1e4; };
const BL_BLK = 4, BL_NB = T / BL_BLK, _blQ = new Float32Array(BL_NB * BL_NB), _blS = new Int8Array(BL_NB * BL_NB);
function blendEdges(u, W, x0, y0) {
  const srcs = new Array(8);
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
    const gx = x0 + tx, gy = y0 + ty, t = baseTile(gnd(gx, gy)); if (!blendable(t)) continue;
    const pt = blPrio(t); let any = false;
    for (let d = 0; d < 8; d++) { const b = baseTile(gnd(gx + BL_DX[d], gy + BL_DY[d]));
      srcs[d] = b !== t && blendable(b) && blPrio(b) > pt && !(GI[b].liquid && GI[t].liquid) && (typeof lvV !== 'function' || GI[b].liquid || GI[t].liquid || lvV(gx + BL_DX[d], gy + BL_DY[d]) === lvV(gx, gy)) ? b : -1; /* entre capas de distinta altura no se mezcla: la pared las separa */ if (srcs[d] >= 0) any = true; }
    if (!any) continue;
    _blQ.fill(0); _blS.fill(-1);
    for (let d = 0; d < 8; d++) { if (srcs[d] < 0) continue;
      const dx = BL_DX[d], dy = BL_DY[d];
      /* en una esquina solo si los dos lados no son ya de ese mismo suelo (si no, se pintaría doble) */
      if (d >= 4 && (srcs[dx > 0 ? 0 : 2] === srcs[d] || srcs[dy > 0 ? 1 : 3] === srcs[d])) continue;
      const E = d < 4 ? 3.2 : 2.6; /* ancho de la franja, en bloques */
      for (let by = 0; by < BL_NB; by++) for (let bx = 0; bx < BL_NB; bx++) {
        const ex = dx > 0 ? BL_NB - 1 - bx : dx < 0 ? bx : -1, ey = dy > 0 ? BL_NB - 1 - by : dy < 0 ? by : -1;
        const dist = d < 4 ? (ex >= 0 ? ex : ey) : Math.hypot(ex, ey); if (dist >= E) continue;
        const al = dx ? gy * BL_NB + by : gx * BL_NB + bx, a2 = al >> 1, sd = (d & 3) * 7919 + 77, fr = (al & 1) / 2;
        const wob = (ihash(a2, sd) + (ihash(a2 + 1, sd) - ihash(a2, sd)) * fr - 0.5) * 1.6;
        const p = 1 - (dist + 0.5 + wob) / E; if (p <= 0) continue;
        const k = by * BL_NB + bx; if (p > _blQ[k]) { _blQ[k] = p; _blS[k] = d; } }
    }
    for (let k = 0; k < BL_NB * BL_NB; k++) { const d = _blS[k]; if (d < 0) continue; const bx = k % BL_NB, by = (k / BL_NB) | 0;
      /* bloque entero o nada: borde pixelado y nítido */
      if (ihash(gx * BL_NB + bx, gy * BL_NB + by + 99991) > _blQ[k] * 1.35) continue;
      const sb = GI[srcs[d]].dot ? G.STONE : srcs[d], src = tileTexPx(sb, (hash2(gx + BL_DX[d], gy + BL_DY[d], 51) * TEX_VARS) | 0);
      for (let py = by * BL_BLK; py < by * BL_BLK + BL_BLK; py++) { const r = (ty * T + py) * W + tx * T; for (let px = bx * BL_BLK; px < bx * BL_BLK + BL_BLK; px++) u[r + px] = src[py * T + px]; } }
  }
}
// Bordes entre casillas distintas (sin generar chunks nuevos: solo mira los ya cargados)
function gndPeek(x, y) { const c = peekChunk(x >> CSH, y >> CSH); return c ? c.g[((y & CMASK) << CSH) | (x & CMASK)] : -1; }
function tileEdges(c, x, y, t, px, py) {
  const g = GI[t];
  for (let d = 0; d < 4; d++) {
    const n = gnd(x + DX[d], y + DY[d]); if (n === t) continue; const gn = GI[n];
    // d: 0 este, 1 sur, 2 oeste, 3 norte (como DX/DY)
    const band = (w, col) => { c.fillStyle = col; if (d === 0) c.fillRect(px + T - w, py, w, T); else if (d === 1) c.fillRect(px, py + T - w, T, w); else if (d === 2) c.fillRect(px, py, w, T); else c.fillRect(px, py, T, w); };
    /* la sombra junto a la roca la pone paintCliffs (con la forma de la pared): aquí no, que salía una franja recta */

  }
}
