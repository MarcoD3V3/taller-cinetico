'use strict';
// =====================================================================================
//  Techos. Una capa por encima de todo: se pone sobre la casa (encima de paredes, muebles
//  y suelo) con el tejado en la mano.
//   · Clic derecho: pone una casilla de tejado (mantén y arrastra para cubrir más).
//   · Shift + clic derecho dentro de una habitación cerrada: la cubre entera con sus paredes.
//   · Clic izquierdo con el tejado en la mano: lo quita (lo recuperas).
//  Desde fuera solo se ve el tejado. Al entrar bajo él, el tejado desaparece y todo lo de
//  fuera se apaga en gris: solo se ve el interior de la casa hasta que sales.
//  Los enemigos voladores pasan por encima de las paredes, pero no entran bajo un techo,
//  y bajo techo no aparecen enemigos.
// =====================================================================================
const ROOFS = [
  ['roofThatch', 'Tejado de paja', '#c8a24e', 'straw', 'straw,straw,stick'],
  ['roofWood', 'Tejado de madera', '#8a5a32', 'planks', 'planks,planks,stick'],
  ['roofTile', 'Tejado de tejas', '#b04a30', 'brick', 'brick,brick,clay'],
  ['roofSlate', 'Tejado de pizarra', '#4e5666', 'stone', 'stone,stone,stone'],
  ['roofMetal', 'Tejado de chapa', '#8e969e', MF.iron.plate, `${MF.iron.plate},${MF.iron.rod}`],
];
for (const [id, n, c, core, teeth] of ROOFS) {
  if (ITEMS[id]) continue; NI(id, n, c, 'sheet', ITEMS.planks.cat, 'Techo para tu casa: desde fuera tapa el interior y, al entrar, solo ves la casa. Clic derecho: poner (arrastra para cubrir más) · Shift + clic derecho dentro de una habitación: la cubre entera · Clic izquierdo con él en la mano: quitarlo. Los voladores no entran bajo techo.');
  ITEMS[id].roof = { c }; RR(id, 4, core, teeth);
}
const roofKey = (x, y) => x + ',' + y;
const roofAt = (x, y) => S && S.roof ? S.roof[roofKey(x, y)] : undefined;
let _roofVer = 0;
function roofSet(x, y, id, remote) {
  const R = S.roof || (S.roof = {}), k = roofKey(x, y); if ((R[k] || null) === (id || null)) return false;
  if (id) R[k] = id; else delete R[k]; _roofVer++; _roofReg = null;
  if (!remote && typeof netEmit === 'function' && typeof inGame === 'function' && inGame()) { const d = { x, y, id: id || null }; if (NET.kind === 'claude') netEmit('mob', { t: 'roof', ...d }); else netEmit('roof', d); }
  return true;
}
// La casa en la que estás: todas las casillas de tejado unidas a la tuya
let _roofReg = null, _roofRegK = '';
function roofRegion(tx, ty) {
  if (!roofAt(tx, ty)) return null; const k = _roofVer + '|' + tx + ',' + ty; if (_roofReg && _roofRegK === k) return _roofReg;
  if (_roofReg && _roofReg.has(roofKey(tx, ty)) && _roofReg.ver === _roofVer) return _roofReg;
  const seen = new Set([roofKey(tx, ty)]), q = [[tx, ty]];
  while (q.length && seen.size < 2500) { const [x, y] = q.pop(); for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d], kk = roofKey(nx, ny); if (seen.has(kk) || !roofAt(nx, ny)) continue; seen.add(kk); q.push([nx, ny]); } }
  // Lo que se ve dentro: el techo y las paredes de alrededor
  const vis = new Set(seen); for (const kk of seen) { const [x, y] = kk.split(',').map(Number); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nk = roofKey(x + dx, y + dy); if (vis.has(nk)) continue; const b = at(x + dx, y + dy); if ((b && !BD[b.type].walk) || (b && BD[b.type].door) || GI[gnd(x + dx, y + dy)].solid) vis.add(nk); } }
  seen.vis = vis; seen.ver = _roofVer; _roofReg = seen; _roofRegK = k; return seen;
}
const playerTile = () => [Math.floor(S.player.x / T), Math.floor((S.player.y + 4) / T)];
const indoorRegion = () => { if (!S || !S.roof) return null; const [x, y] = playerTile(); return roofRegion(x, y); };
// ---------- Dibujo ----------
const _roofSpr = new Map();
function roofSprite(id, m) {
  const key = id + m; let cv0 = _roofSpr.get(key); if (cv0) return cv0;
  cv0 = mkCanvas(32, 32); const c = cv0.getContext('2d'), base = (ITEMS[id] && ITEMS[id].roof.c) || '#8a5a32';
  c.fillStyle = base; c.fillRect(0, 0, 32, 32);
  // Hileras de tejas al tresbolillo
  for (let r = 0; r < 4; r++) { c.fillStyle = shade(base, -0.22); c.fillRect(0, r * 8 + 7, 32, 1); c.fillStyle = shade(base, 0.12); c.fillRect(0, r * 8, 32, 1);
    for (let i = 0; i < 5; i++) { c.fillStyle = shade(base, -0.15); c.fillRect(((i * 8 + (r % 2) * 4) % 36) - 1, r * 8 + 1, 1, 6); } }
  // Bordes: cumbrera arriba, alero con sombra abajo, laterales más oscuros
  if (!(m & 1)) { c.fillStyle = shade(base, 0.3); c.fillRect(0, 0, 32, 2); }
  if (!(m & 4)) { c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(0, 28, 32, 4); c.fillStyle = shade(base, -0.35); c.fillRect(0, 27, 32, 1); }
  if (!(m & 8)) { c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(0, 0, 2, 32); }
  if (!(m & 2)) { c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(30, 0, 2, 32); }
  _roofSpr.set(key, cv0); return cv0;
}
// ---------- Casas: tejado a dos aguas con cumbrera, fachada con ventanas y puerta, alero, sombra y chimenea ----------
// Cada grupo de tejado unido es una casa. Por columnas: arriba la vertiente de atrás (más clara), en medio la
// cumbrera y abajo la de delante (más oscura); todo el tejado va algo levantado y debajo se ve la pared delantera.
const ROOF_LIFT = 0.85; // altura de la fachada, en casillas
let _houses = null, _housesV = -1, _housesT = 0;
function roofHouses() {
  const now = performance.now(); if (_housesV === _roofVer && _houses && now - _housesT < 2000) return _houses; _housesV = _roofVer; _housesT = now; const old = _houses || []; _houses = []; // cada 2 s se revisa lo de debajo (puertas, luces)
  const seen = new Set();
  for (const k in S.roof) { if (seen.has(k)) continue; const q = [k], tiles = []; seen.add(k);
    while (q.length) { const kk = q.pop(); tiles.push(kk); const [x, y] = kk.split(',').map(Number); for (let d = 0; d < 4; d++) { const nk = roofKey(x + DX[d], y + DY[d]); if (!seen.has(nk) && S.roof[nk]) { seen.add(nk); q.push(nk); } } }
    const cm = new Map(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, id = S.roof[k], cnt = {};
    for (const kk of tiles) { const [x, y] = kk.split(',').map(Number); const c = cm.get(x) || [y, y]; c[0] = Math.min(c[0], y); c[1] = Math.max(c[1], y); cm.set(x, c); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); cnt[S.roof[kk]] = (cnt[S.roof[kk]] || 0) + 1; }
    id = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    const cols = [...cm.entries()].sort((a, b) => a[0] - b[0]).map(([x, [a, b]]) => [x, a, b]);
    // Lo que hay debajo: puerta en la fila de delante, pared de madera o de piedra y si dentro hay luz
    let light = false, stone = 0, wood = 0; for (const kk of tiles) { const [x, y] = kk.split(',').map(Number), b = at(x, y); if (!b) continue; if (BD[b.type].light) light = true; if (/stone|brick|reinforced/i.test(b.type)) stone++; else if (/wood|plank|log/i.test(b.type)) wood++; }
    const doors = new Set(cols.filter(([x, , b]) => { const d = at(x, b); return d && BD[d.type].door; }).map(c => c[0]));
    const o = old.find(h => h.x0 === x0 && h.y0 === y0); _houses.push({ id, cols, x0, x1, y0, y1, light, wall: stone > wood ? 'stone' : 'wood', doors, smokeT: o ? o.smokeT : 0 });
  }
  return _houses;
}
const _roofPat = new Map();
// Generador repetible (la misma casa siempre igual)
const rRnd = seed => { let h = seed >>> 0 || 1; return () => ((h = (h * 1103515245 + 12345) >>> 0) >>> 8) / 16777216; };
function roofPattern(ctx, id, side) { const k = id + side; let p = _roofPat.get(k); if (p) return p; const base = (ITEMS[id] && ITEMS[id].roof.c) || '#8a5a32', S2 = 64, cv0 = mkCanvas(S2, S2), c = cv0.getContext('2d'), lit = side === 'back' ? 0.1 : -0.1, r = rRnd(id.length * 977 + (side === 'back' ? 1 : 7));
  c.fillStyle = shade(base, lit); c.fillRect(0, 0, S2, S2);
  if (id === 'roofThatch') { // paja: briznas sueltas en capas, nada de tejas
    for (let row = 0; row < 8; row++) { const y = row * 8; c.fillStyle = shade(base, lit - 0.28); c.fillRect(0, y + 7, S2, 1);
      for (let i = 0; i < 40; i++) { const x = r() * S2, l = 4 + r() * 5; c.fillStyle = shade(base, lit + (r() - 0.5) * 0.5); c.fillRect(x, y + r() * 2, 1, l); } }
  } else { // tejas, tablas o placas al tresbolillo, cada una con su tono
    for (let row = 0; row < 8; row++) { const y = row * 8, off = (row % 2) * 5;
      for (let x = -off; x < S2; x += 10) { c.fillStyle = shade(base, lit + (r() - 0.5) * 0.22); c.fillRect(x + 1, y + 1, 9, 6); c.fillStyle = shade(base, lit + 0.18); c.fillRect(x + 1, y + 1, 9, 1); }
      c.fillStyle = shade(base, lit - 0.35); c.fillRect(0, y + 7, S2, 1); }
  }
  // Musgo y manchas de tiempo
  for (let i = 0; i < 10; i++) { const x = r() * S2, y = r() * S2, n = 2 + (r() * 4 | 0); c.fillStyle = r() < 0.6 ? 'rgba(80,110,50,.35)' : 'rgba(0,0,0,.12)'; for (let j = 0; j < n; j++) c.fillRect(x + (r() - 0.5) * 4, y + (r() - 0.5) * 3, 2, 1); }
  p = ctx.createPattern(cv0, 'repeat'); _roofPat.set(k, p); return p; }
function wallPattern(ctx, kind) { const k = 'w' + kind; let p = _roofPat.get(k); if (p) return p; const S2 = 64, cv0 = mkCanvas(S2, S2), c = cv0.getContext('2d'), r = rRnd(kind === 'stone' ? 31 : 57);
  if (kind === 'stone') { c.fillStyle = '#6e6c68'; c.fillRect(0, 0, S2, S2); for (let row = 0; row < 8; row++) { const off = (row % 2) * 7; for (let x = -off; x < S2; x += 14) { const w = 12 + (r() * 3 | 0); c.fillStyle = shade('#8e8a84', (r() - 0.5) * 0.25); c.fillRect(x + 1, row * 8 + 1, w, 6); c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(x + 1, row * 8 + 1, w, 1); } } }
  else { for (let x = 0; x < S2; x += 8) { c.fillStyle = shade('#946436', (r() - 0.5) * 0.2); c.fillRect(x, 0, 8, S2); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x + 7, 0, 1, S2); c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(x, 0, 1, S2); for (let i = 0; i < 3; i++) { c.fillStyle = 'rgba(60,36,18,.5)'; c.fillRect(x + 2 + r() * 4, r() * S2, 1, 2 + r() * 3); } } }
  p = ctx.createPattern(cv0, 'repeat'); _roofPat.set(k, p); return p; }
function drawHouse(ctx, H) {
  const L = ROOF_LIFT * T, base = (ITEMS[H.id] && ITEMS[H.id].roof.c) || '#8a5a32';
  // Sombra suave en el suelo (dos capas) y oscurecido al pie de la pared
  for (const [o, al] of [[10, 0.1], [5, 0.14]]) { ctx.fillStyle = `rgba(0,0,0,${al})`; for (const [x, a, b] of H.cols) ctx.fillRect(x * T + o, a * T - L * 0.4, T, (b - a + 1) * T + L * 0.4 + o * 0.6); }
  for (const [x, , b] of H.cols) { const g = ctx.createLinearGradient(0, (b + 1) * T, 0, (b + 1) * T + 10); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x * T - 2, (b + 1) * T, T + 4, 10); }
  // Fachada delantera (debajo del alero)
  ctx.fillStyle = wallPattern(ctx, H.wall);
  for (const [x, , b] of H.cols) ctx.fillRect(x * T, (b + 1) * T - L, T, L);
  for (const [x, , b] of H.cols) { const fy = (b + 1) * T - L, i = x - H.x0;
    if (H.doors.has(x)) { ctx.fillStyle = '#3a2414'; ctx.fillRect(x * T + 8, fy + L - 22, 16, 22); ctx.fillStyle = '#6a4224'; ctx.fillRect(x * T + 10, fy + L - 20, 12, 20); ctx.fillStyle = '#4e301a'; ctx.fillRect(x * T + 15, fy + L - 20, 1, 20); ctx.fillStyle = '#e8c860'; ctx.fillRect(x * T + 19, fy + L - 11, 2, 2); }
    else if (i % 2 === 1 && x !== H.x1) { const wx = x * T + 9, wy = fy + 6; ctx.fillStyle = '#3a2414'; ctx.fillRect(wx - 2, wy - 2, 18, 15); ctx.fillStyle = H.light ? '#ffd88a' : '#4a6a8a'; ctx.fillRect(wx, wy, 14, 11); if (H.light) { ctx.fillStyle = 'rgba(255,200,110,.25)'; ctx.fillRect(wx - 5, wy - 5, 24, 21); } ctx.fillStyle = '#3a2414'; ctx.fillRect(wx + 6, wy, 2, 11); ctx.fillRect(wx, wy + 5, 14, 1); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(wx + 1, wy + 1, 3, 2); } }
  // Pared más oscura abajo, jardineras bajo las ventanas y hierba al pie
  for (const [x, , b] of H.cols) { const fy = (b + 1) * T - L, g = ctx.createLinearGradient(0, fy, 0, fy + L); g.addColorStop(0, 'rgba(0,0,0,.25)'); g.addColorStop(0.3, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.22)'); ctx.fillStyle = g; ctx.fillRect(x * T, fy, T, L);
    const rr = rRnd(x * 73856093 ^ b * 19349663), i = x - H.x0;
    if (!H.doors.has(x) && i % 2 === 1 && x !== H.x1) { const wx = x * T + 7, wy = fy + 20; ctx.fillStyle = '#5a3a1e'; ctx.fillRect(wx, wy, 18, 4); ctx.fillStyle = '#3e7a2e'; ctx.fillRect(wx + 1, wy - 2, 16, 2); for (let f = 0; f < 4; f++) { ctx.fillStyle = ['#ff6a8a', '#ffd04a', '#c88aff', '#ffffff'][(rr() * 4) | 0]; ctx.fillRect(wx + 2 + f * 4, wy - 4 + (rr() * 2 | 0), 2, 2); } }
    for (let t = 0; t < 4; t++) { const gx = x * T + rr() * T, gh = 2 + rr() * 4; ctx.fillStyle = rr() < 0.5 ? '#4e8a32' : '#3a6e28'; ctx.fillRect(gx, (b + 1) * T - gh, 1, gh); ctx.fillRect(gx + 1, (b + 1) * T - gh + 1, 1, gh - 1); } }
  // Esquinas de la fachada
  ctx.fillStyle = 'rgba(0,0,0,.35)'; for (const [x, , b] of H.cols) { if (x === H.x0) ctx.fillRect(x * T, (b + 1) * T - L, 3, L); if (x === H.x1) ctx.fillRect(x * T + T - 3, (b + 1) * T - L, 3, L); }
  // Tejado: vertiente de atrás, cumbrera y vertiente de delante
  const back = roofPattern(ctx, H.id, 'back'), front = roofPattern(ctx, H.id, 'front');
  for (const [x, a, b] of H.cols) { const top = a * T - L, bot = (b + 1) * T - L, ridge = (top + bot) / 2 - T * 0.15;
    ctx.fillStyle = back; ctx.fillRect(x * T, top, T, ridge - top); ctx.fillStyle = front; ctx.fillRect(x * T, ridge, T, bot - ridge);
    const g = ctx.createLinearGradient(0, top, 0, bot); g.addColorStop(0, 'rgba(255,255,255,.06)'); g.addColorStop(Math.max(0, (ridge - top) / (bot - top) - 0.01), 'rgba(255,255,255,.16)'); g.addColorStop(Math.min(1, (ridge - top) / (bot - top) + 0.01), 'rgba(0,0,0,.05)'); g.addColorStop(1, 'rgba(0,0,0,.28)'); ctx.fillStyle = g; ctx.fillRect(x * T, top, T, bot - top);
    ctx.fillStyle = shade(base, -0.45); ctx.fillRect(x * T, ridge - 1, T, 5); ctx.fillStyle = shade(base, 0.35); ctx.fillRect(x * T, ridge - 2, T, 2); // cumbrera
    ctx.fillStyle = shade(base, -0.5); ctx.fillRect(x * T - 2, bot - 3, T + 4, 3); ctx.fillStyle = shade(base, -0.3); for (let q = 0; q < 4; q++) ctx.fillRect(x * T + q * 8 + 1, bot - 1, 6, 2); { const g = ctx.createLinearGradient(0, bot, 0, bot + 9); g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x * T, bot, T, 9); } // alero (con el borde de las tejas) y su sombra en la pared
    ctx.fillStyle = shade(base, 0.3); ctx.fillRect(x * T, top, T, 2); }
  // Remates laterales (hastiales)
  for (const [x, a, b] of H.cols) { const top = a * T - L, bot = (b + 1) * T - L, prev = H.cols.find(c => c[0] === x - 1), next = H.cols.find(c => c[0] === x + 1);
    ctx.fillStyle = shade(base, -0.55); if (!prev || prev[1] > a || prev[2] < b) ctx.fillRect(x * T - 2, top, 4, bot - top); if (!next || next[1] > a || next[2] < b) ctx.fillRect(x * T + T - 2, top, 4, bot - top); }
  // Chimenea (con humo si dentro hay fuego o luz)
  if (H.x1 - H.x0 >= 2 && H.y1 - H.y0 >= 2) { const col = H.cols[H.cols.length - 2], cx = col[0] * T + 8, top = col[1] * T - L, bot = (col[2] + 1) * T - L, cy = top + (bot - top) * 0.22;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(cx + 4, cy + 4, 14, 18); ctx.fillStyle = '#7a6a62'; ctx.fillRect(cx, cy - 6, 14, 22); ctx.fillStyle = '#5a4c46'; ctx.fillRect(cx, cy - 6, 14, 3); ctx.fillRect(cx + 6, cy, 1, 16); ctx.fillStyle = '#a89890'; ctx.fillRect(cx, cy - 8, 14, 2); ctx.fillStyle = '#1a1412'; ctx.fillRect(cx + 3, cy - 7, 8, 2);
    if (H.light && typeof fxSmoke === 'function') { const now = performance.now() / 1000; if (now > H.smokeT) { H.smokeT = now + 0.35 + Math.random() * 0.4; fxSmoke(cx + 7, cy - 10, 'rgba(190,190,195,', 4); } } }
}
let _indoorA = 0, _roofBox = null, _roofBoxV = -1, _roofFrame = 0;
// pass 'back': antes de criaturas y jugador, las casas que quedan detrás de ti; el resto, por encima (pasada normal)
function drawRoofs(ctx, pass) {
  if (!S || !S.roof) return; const tr = ctx.getTransform(), z = view.z;
  const x0 = Math.floor((view.x - cw / 2 / z) / T) - 1, x1 = Math.ceil((view.x + cw / 2 / z) / T) + 1, y0 = Math.floor((view.y - ch / 2 / z) / T) - 1, y1 = Math.ceil((view.y + ch / 2 / z) / T) + 1;
  // Sin tejados a la vista (caja que los envuelve fuera de pantalla): no se recorre nada
  if (_roofBoxV !== _roofVer) { _roofBoxV = _roofVer; let a = Infinity, b2 = Infinity, c2 = -Infinity, d = -Infinity; for (const k in S.roof) { const [x, y] = k.split(',').map(Number); if (x < a) a = x; if (y < b2) b2 = y; if (x > c2) c2 = x; if (y > d) d = y; } _roofBox = a === Infinity ? null : [a, b2, c2, d]; }
  if (!_roofBox || _roofBox[2] < x0 || _roofBox[0] > x1 || _roofBox[3] < y0 || _roofBox[1] > y1) { if (pass !== 'back') _indoorA *= 0.8; return; }
  const reg = indoorRegion(); if (pass === 'back') _roofFrame++; else _indoorA += ((reg ? 1 : 0) - _indoorA) * 0.18;
  const feet = S.player.y + 10;
  // Fuera: cada tejado se dibuja como una casa entera (menos la casa en la que estás)
  for (const H of roofHouses()) { if (H.x1 < x0 || H.x0 > x1 || H.y1 < y0 - 1 || H.y0 > y1 + 1) continue; if (reg && reg.has(roofKey(H.cols[0][0], H.cols[0][1]))) continue;
    if (pass === 'back') { if ((H.y1 + 1) * T <= feet) { drawHouse(ctx, H); H._f = _roofFrame; } } else if (H._f !== _roofFrame) drawHouse(ctx, H); }
  if (pass === 'back') { ctx.setTransform(tr); return; }
  // Dentro: lo de fuera se apaga en gris
  if (_indoorA > 0.02 && (reg || _lastReg)) {
    const R = reg || _lastReg; ctx.beginPath(); ctx.rect(x0 * T, y0 * T, (x1 - x0 + 1) * T, (y1 - y0 + 1) * T);
    for (const kk of R.vis) { const [x, y] = kk.split(',').map(Number); if (x < x0 - 1 || x > x1 + 1 || y < y0 - 1 || y > y1 + 1) continue; ctx.rect(x * T, y * T, T, T); }
    ctx.fillStyle = `rgba(22,24,28,${0.93 * _indoorA})`; ctx.fill('evenodd');
  }
  if (reg) _lastReg = reg; else if (_indoorA < 0.03) _lastReg = null;
  ctx.setTransform(tr);
}
let _lastReg = null;
{ const d0 = drawFxWorld; drawFxWorld = c => { d0(c); drawRoofs(c); roofHookCombat(); }; }
// drawCombat se define después (sim/combat.js): se engancha en el primer fotograma
let _rcHook = false; function roofHookCombat() { if (_rcHook || typeof drawCombat !== 'function') return; _rcHook = true; const c0 = drawCombat; drawCombat = (ctx, ...a) => { try { drawRoofs(ctx, 'back'); } catch (e) { } return c0(ctx, ...a); }; }
// Dentro de casa no llueve encima
{ const w0 = drawWeatherScreen; drawWeatherScreen = (c, dt) => { if (_indoorA > 0.6) return; w0(c, dt); }; }
// ---------- Quién pasa ----------
{ const p0 = passable; passable = (x, y, who) => {
  const o = who && typeof who === 'object' ? who : null, fl = o && (o.fly || o.phase) && !o.proj;
  if (fl && S && S.roof) { const tx = Math.floor(x / T), ty = Math.floor(y / T); if (roofAt(tx, ty)) return false; // los voladores no entran bajo techo
    const b = at(tx, ty); if (b && !BD[b.type].walk && peekChunk(tx >> CSH, ty >> CSH)) return true; } // y pasan por encima de las paredes
  else if (fl) { const tx = Math.floor(x / T), ty = Math.floor(y / T), b = peekChunk(tx >> CSH, ty >> CSH) && at(tx, ty); if (b && !BD[b.type].walk) return true; }
  return p0(x, y, who);
}; }
// Bajo techo no aparecen enemigos
{ const h0 = houseAt; houseAt = (tx, ty) => !!roofAt(tx, ty) || h0(tx, ty); }
// ---------- Poner y quitar ----------
const roofHeld = () => { const id = !ui.hand && heldId(); return id && ITEMS[id] && ITEMS[id].roof ? id : null; };
const roofReach = (x, y) => Math.hypot(x * T + 16 - S.player.x, y * T + 16 - S.player.y) <= 9 * T;
let _roofDrag = 0, _roofLast = '';
function roofPut(x, y) { const id = roofHeld(); if (!id || !roofReach(x, y) || roofAt(x, y)) return false; if (invCount(id) < 1) { toastErr('No te quedan tejados'); return false; } invTake(id, 1); roofSet(x, y, id); tone(300, 0.04, 'triangle', 0.03, 1.2); return true; }
function roofTake(x, y) { const id = roofAt(x, y); if (!id || !roofReach(x, y)) return false; roofSet(x, y, null); invGive(id, 1); burst(x, y, ITEMS[id].roof.c); return true; }
function roofCoverRoom(x, y) {
  const id = roofHeld(); let room = null;
  for (const [dx, dy] of [[0, 0], [0, 1], [1, 0], [-1, 0], [0, -1]]) { const b = at(x + dx, y + dy); if (!(b && isWall(b)) && !GI[gnd(x + dx, y + dy)].solid) { room = floodRoom(x + dx, y + dy, 400); if (room) break; } }
  if (!room) { toastErr('No es una habitación cerrada: rodéala de paredes (con puerta) y vuelve a probar'); return; }
  const want = new Set(room.map(([a, b]) => roofKey(a, b))); for (const [a, b] of room) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const w = at(a + dx, b + dy); if (w && isWall(w)) want.add(roofKey(a + dx, b + dy)); }
  const todo = [...want].filter(k => !S.roof || !S.roof[k]); let n = 0; const have = invCount(id);
  for (const k of todo) { if (n >= have) break; const [a, b] = k.split(',').map(Number); invTake(id, 1); roofSet(a, b, id); n++; }
  if (n < todo.length) toastErr(`Faltan ${todo.length - n} ${ITEMS[id].n.toLowerCase()} para cubrir toda la casa`); else toast(`🏠 Casa cubierta: ${n} casillas de ${ITEMS[id].n.toLowerCase()}`);
  tone(420, 0.1, 'triangle', 0.04, 1.4);
}
cv.addEventListener('mousedown', e => {
  if (!S || ui.open || (e.button !== 0 && e.button !== 2)) return;
  const x = mouse.tx, y = mouse.ty, held = roofHeld();
  if (!held) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.button === 2 && e.shiftKey) { roofCoverRoom(x, y); return; }
  _roofDrag = e.button === 2 ? 1 : -1; _roofLast = roofKey(x, y);
  if (_roofDrag > 0) roofPut(x, y); else roofTake(x, y);
}, true);
cv.addEventListener('mousemove', () => { if (!_roofDrag || !S) return; const k = roofKey(mouse.tx, mouse.ty); if (k === _roofLast) return; _roofLast = k; if (_roofDrag > 0) roofPut(mouse.tx, mouse.ty); else roofTake(mouse.tx, mouse.ty); });
addEventListener('mouseup', () => { _roofDrag = 0; });
// Con el tejado en la mano, el cursor marca dónde cae (o qué quitas)
{ const h0 = drawHoverMark; drawHoverMark = c => { const id = roofHeld(); if (!id) return h0(c); const x = mouse.tx, y = mouse.ty, ok = roofReach(x, y); c.globalAlpha = 0.55; if (!roofAt(x, y) && ok) c.drawImage(roofSprite(id, 0), x * T, y * T - 6, T, T); c.globalAlpha = 1; c.strokeStyle = !ok ? '#ff6b5b' : roofAt(x, y) ? '#ffb05a' : '#7fd07a'; c.lineWidth = 2; c.strokeRect(x * T + 1, y * T + 1, T - 2, T - 2); }; }
// ---------- En línea ----------
{ const w0 = wireGame; wireGame = r => { w0(r); const on = m => { const d = m.data; if (m.sameTab || !d || !S || !Number.isFinite(+d.x) || !Number.isFinite(+d.y)) return; if (d.id && !(ITEMS[d.id] && ITEMS[d.id].roof)) return; roofSet(+d.x, +d.y, d.id || null, true); };
  r.on('roof', on); r.on('mob', m => { if (m.data && m.data.t === 'roof') on(m); }); }; }
