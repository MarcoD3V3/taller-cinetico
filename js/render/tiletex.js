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
// Color base con grano por píxel (manchas grandes + ruido fino)
function paintTexBase(c, g, t, v) {
  const img = c.createImageData(T, T), d = img.data, base = g.c, jit = (th(t, v, 1) - 0.5) * 12;
  const amp = g.liquid ? (g.glow ? 18 : 5) : g.key && /SNOW|ICE|SALT/.test(g.key) ? 5 : g.tuft ? 11 : g.rock || g.dot ? 13 : /SAND/.test(g.key || '') ? 7 : 9;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const big = hash2((x >> 3) + v * 5, (y >> 3) + t, 9) - 0.5, fine = hash2(x + v * 37, y + t * 11, 4) - 0.5;
    let n = jit + big * amp * 1.2 + fine * amp * 0.8;
    if (g.liquid && !g.glow) n += (y / T - 0.5) * -8; // el agua, algo más clara arriba
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
    else { // olas y destellos
      c.strokeStyle = (g.wave || '#ffffff') + '40'; c.lineWidth = 1.2; for (let k = 0; k < 2; k++) { const wx = 3 + h(k + 30) * 18, wy = 6 + k * 13 + h(k + 31) * 6; c.beginPath(); c.moveTo(wx, wy); c.quadraticCurveTo(wx + 5, wy - 3, wx + 10, wy); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,.35)'; for (let k = 0; k < 3; k++) c.fillRect(h(k + 40) * 30, h(k + 41) * 30, 2, 1);
    }
    if (g.coral) for (let k = 0; k < 5; k++) { const cc = ['#ff7a7a', '#ffb05a', '#e86ad0', '#7ae0d0'][(h(k + 40) * 4) | 0]; circ(c, 5 + h(k + 20) * 22, 5 + h(k + 30) * 22, 1.6 + h(k) * 2.5, cc); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(4 + h(k + 20) * 22, 4 + h(k + 30) * 22, 1, 1); }
    if (g.kelp) { c.strokeStyle = '#2e6a3a'; c.lineWidth = 2; for (let k = 0; k < 3; k++) { const kx = 6 + h(k) * 20; c.beginPath(); c.moveTo(kx, 30); c.quadraticCurveTo(kx + 5, 18, kx - 2, 5); c.stroke(); } }
    return;
  }
  if (g.dot) { // mena: roca con cristales que brillan
    stonesTex(c, h, 2, 'rgba(0,0,0,.12)');
    for (let k = 0; k < 4; k++) {
      const cx = 6 + h(k) * 20, cy = 6 + h(k + 9) * 20, r = 2.4 + h(k + 3) * 2.2;
      c.beginPath(); c.moveTo(cx, cy - r); c.lineTo(cx + r, cy); c.lineTo(cx, cy + r); c.lineTo(cx - r, cy); c.closePath(); c.fillStyle = g.dot; c.fill(); c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 0.8; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(cx - r * 0.4, cy - r * 0.55, r * 0.5, r * 0.35);
    }
  } else if (g.rock) stonesTex(c, h, 3, 'rgba(0,0,0,.16)');
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
  if (g.solid && !g.tree && !g.plant) { // relieve de la roca alta
    const gr = c.createLinearGradient(0, 0, 0, T); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.28)'); c.fillStyle = gr; c.fillRect(0, 0, T, T);
    c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(0, 0, T, 2); c.fillRect(0, 0, 2, T); c.fillStyle = 'rgba(0,0,0,.32)'; c.fillRect(0, T - 4, T, 4); c.fillRect(T - 2, 0, 2, T);
  }
  if (g.hole) { c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(2, 2, T - 4, T - 4); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(2, 2, T - 4, 5); }
  if (g.cobble) { for (let k = 0; k < 4; k++) { const ex = 8 + (k & 1) * 16 + (h(k) - 0.5) * 3, ey = 8 + (k >> 1) * 16; c.fillStyle = `rgba(255,255,255,${0.05 + h(k + 8) * 0.08})`; c.beginPath(); c.ellipse(ex, ey, 6.5, 5.5, 0, 0, 7); c.fill(); c.strokeStyle = 'rgba(40,38,36,.6)'; c.lineWidth = 1.2; c.stroke(); c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(ex - 3, ey - 4, 4, 1); } }
  if (g.planks) { c.fillStyle = 'rgba(60,36,16,.45)'; for (let k = 1; k < 4; k++) c.fillRect(0, k * 8, T, 1); c.fillRect(4 + v * 5, 0, 1, T); for (let k = 0; k < 4; k++) { c.fillStyle = 'rgba(60,36,16,.25)'; c.fillRect(h(k) * 28, k * 8 + 3, 4, 1); c.fillStyle = 'rgba(30,20,10,.6)'; c.fillRect(2 + (k & 1) * 26, k * 8 + 3, 1, 1); } }
  if (g.bricks) { c.fillStyle = 'rgba(230,210,190,.35)'; for (let k = 0; k < 4; k++) { c.fillRect(0, k * 8, T, 1); c.fillRect((k & 1 ? 8 : 0) + 4, k * 8, 1, 8); c.fillRect((k & 1 ? 8 : 0) + 20, k * 8, 1, 8); } c.fillStyle = 'rgba(0,0,0,.12)'; for (let k = 0; k < 4; k++) c.fillRect(0, k * 8 + 6, T, 1); }
  if (g.pit) for (let k = 0; k < 2; k++) { c.fillStyle = 'rgba(15,10,8,.75)'; c.beginPath(); c.ellipse(8 + h(k) * 16, 8 + h(k + 4) * 16, 6, 4, h(k + 7) * 3, 0, 7); c.fill(); c.fillStyle = 'rgba(120,140,90,.35)'; c.fillRect(6 + h(k) * 16, 6 + h(k + 4) * 16, 3, 1); }
  if (g.vent) { circ(c, 16, 16, 9, '#5b5638', '#2a2818'); circ(c, 16, 16, 4, '#1a1a12'); }
  if (g.vent2) { circ(c, 16, 16, 11, 'rgba(232,224,74,.18)'); circ(c, 16, 16, 8, '#2a2622', '#1a1612'); circ(c, 16, 16, 4, '#e8e04a'); }
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
const BLEND_E = 9, baseTile = t => { const g = GI[t]; return g.flora ? (g.u >= 0 ? g.u : G.GRASS) : t; };
const blendable = t => { const g = GI[t]; return !g.solid && !g.ruin && !g.abyss && !g.hole; };
// Agua y otros líquidos: borde más estrecho (la orilla se ve nítida). 8 vecinos (también las esquinas, para que la transición no salga con muescas). Mira los chunks
// vecinos aunque aún no estén cargados (se generan: el terreno es determinista), así nunca se corta en un borde.
const BL_DX = [1, 0, -1, 0, 1, -1, -1, 1], BL_DY = [0, 1, 0, -1, 1, 1, -1, -1];
const _bk = new Float32Array(T * T), _bb = new Float32Array(T * T), _bp = new Int8Array(T * T);
function blendEdges(u, W, x0, y0) {
  const srcs = new Array(8);
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
    const gx = x0 + tx, gy = y0 + ty, t = baseTile(gnd(gx, gy)); if (!blendable(t)) continue;
    let any = false, liqN = 0; const liq = !!GI[t].liquid;
    for (let d = 0; d < 8; d++) { const b = baseTile(gnd(gx + BL_DX[d], gy + BL_DY[d])); srcs[d] = b !== t && blendable(b) ? tileTexPx(b, (hash2(gx + BL_DX[d], gy + BL_DY[d], 51) * TEX_VARS) | 0) : null; if (srcs[d]) { any = true; if (GI[b].liquid) liqN |= 1 << d; } }
    if (!any) continue;
    _bk.fill(1); _bb.fill(0); _bp.fill(-1);
    // Solo se recorre la franja de cada borde (y el cuadrado de cada esquina), no la casilla entera
    for (let d = 0; d < 8; d++) { const sr = srcs[d]; if (!sr) continue;
      const E = liq || liqN & (1 << d) ? 5 : BLEND_E, dx = BL_DX[d], dy = BL_DY[d];
      const xa = dx > 0 ? T - E : 0, xb = dx < 0 ? E : T, ya = dy > 0 ? T - E : 0, yb = dy < 0 ? E : T;
      for (let py = ya; py < yb; py++) for (let px = xa; px < xb; px++) {
        const ex = dx > 0 ? T - 1 - px : dx < 0 ? px : -1, ey = dy > 0 ? T - 1 - py : dy < 0 ? py : -1;
        const dist = d < 4 ? (ex >= 0 ? ex : ey) : Math.sqrt(ex * ex + ey * ey); if (dist >= E) continue;
        // borde ondulado: la distancia varía a lo largo del borde (con coordenadas del mundo: continúa entre casillas)
        const wob = (ihash((dx ? gy * T + py : gx * T + px) >> 2, (d & 3) * 7919 + 77) - 0.5) * 4, f = Math.max(0, 1 - (dist + wob) / E), p = f * f * 0.9; if (p <= 0) continue;
        const i = py * T + px; _bk[i] *= 1 - p; if (p > _bb[i]) { _bb[i] = p; _bp[i] = d; } }
    }
    for (let i = 0; i < T * T; i++) { const pk = _bp[i]; if (pk < 0) continue; const px = i % T, py = (i / T) | 0; if (ihash(gx * T + px, gy * T + py) > _bk[i]) u[(ty * T + py) * W + tx * T + px] = srcs[pk][i]; }
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
    if (!g.solid && gn.solid && !gn.flora) { band(4, 'rgba(0,0,0,.12)'); band(2, 'rgba(0,0,0,.12)'); }      // sombra junto a la roca alta

  }
}
