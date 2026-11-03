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
const ROOF_LIFT = 1.35; // altura de la fachada, en casillas (la puerta es tan alta como el personaje)
let _houses = null, _housesV = -1, _housesT = 0;
const FIRE_RE = /furnace|forge|campfire|fireplace|stove|oven|kiln|hearth|smelter/i;
function roofHouses() {
  const now = performance.now(); if (_housesV === _roofVer && _houses && now - _housesT < 2000) return _houses; _housesV = _roofVer; _housesT = now; const old = _houses || []; _houses = []; // cada 2 s se revisa lo de debajo (puertas, luces)
  const seen = new Set();
  for (const k in S.roof) { if (seen.has(k)) continue; const q = [k], tiles = []; seen.add(k);
    while (q.length) { const kk = q.pop(); tiles.push(kk); const [x, y] = kk.split(',').map(Number); for (let d = 0; d < 4; d++) { const nk = roofKey(x + DX[d], y + DY[d]); if (!seen.has(nk) && S.roof[nk]) { seen.add(nk); q.push(nk); } } }
    const cm = new Map(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, id = S.roof[k], cnt = {};
    for (const kk of tiles) { const [x, y] = kk.split(',').map(Number); const c = cm.get(x) || [y, y]; c[0] = Math.min(c[0], y); c[1] = Math.max(c[1], y); cm.set(x, c); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); cnt[S.roof[kk]] = (cnt[S.roof[kk]] || 0) + 1; }
    id = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    const cols = [...cm.entries()].sort((a, b) => a[0] - b[0]).map(([x, [a, b]]) => [x, a, b]);
    // Lo que hay de verdad: la pared de delante casilla a casilla (su material, ventanas de cristal y puertas),
    // si dentro hay luz y dónde está el fuego (de ahí sale la chimenea)
    let light = false, fire = null; for (const kk of tiles) { const [x, y] = kk.split(',').map(Number), b = at(x, y); if (!b) continue; if (BD[b.type].light) light = true; if (!fire && FIRE_RE.test(b.type)) fire = [x, y]; }
    const front = new Map(); for (const [x, , b] of cols) { const blk = at(x, b); front.set(x, blk ? blk.type : null); }
    // Casa de costado: si la puerta está en una pared lateral (y no en la de delante), el tejado gira (cumbrera de arriba abajo)
    const rm = new Map(); for (const kk of tiles) { const [x, y] = kk.split(',').map(Number), r = rm.get(y) || [x, x]; r[0] = Math.min(r[0], x); r[1] = Math.max(r[1], x); rm.set(y, r); }
    const rows = [...rm.entries()].sort((a, b) => a[0] - b[0]).map(([y, [a, b]]) => [y, a, b]);
    let side = null, sideY = null; for (const kk of tiles) { const [x, y] = kk.split(',').map(Number), d = at(x, y); if (!d || !BD[d.type].door) continue; const c = cm.get(x), r = rm.get(y);
      if (y === c[1]) { side = 'S'; break; } if (x === r[0] && !side) { side = 'W'; sideY = y; } else if (x === r[1] && !side) { side = 'E'; sideY = y; } }
    const o = old.find(h => h.x0 === x0 && h.y0 === y0); _houses.push({ id, cols, rows, x0, x1, y0, y1, light, fire, front, side: side || 'S', sideY, smokeT: o ? o.smokeT : 0 });
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
  _roofCv.set(k, cv0); p = ctx.createPattern(cv0, 'repeat'); _roofPat.set(k, p); return p; }
const _roofCv = new Map();
// Vertientes izquierda y derecha (tejado de costado): las mismas tejas giradas
function roofPatternR(ctx, id, side) { const k = id + side; let p = _roofPat.get(k); if (p) return p; const src = side === 'left' ? 'back' : 'front'; roofPattern(ctx, id, src); const s0 = _roofCv.get(id + src), cv0 = mkCanvas(64, 64), c = cv0.getContext('2d');
  c.translate(32, 32); c.rotate(side === 'left' ? -Math.PI / 2 : Math.PI / 2); c.drawImage(s0, -32, -32); p = ctx.createPattern(cv0, 'repeat'); _roofPat.set(k, p); return p; }
function wallPattern(ctx, type) { const k = 'w' + type; let p = _roofPat.get(k); if (p) return p; const S2 = 64, cv0 = mkCanvas(S2, S2), c = cv0.getContext('2d'), lk = (BD[type] && BD[type].look) || {}, col = lk.c || '#8a6a42', tex = lk.tex || (/wood|plank/i.test(type) ? 'plank' : 'stone'), r = rRnd(type.length * 131 + 7);
  c.fillStyle = shade(col, -0.25); c.fillRect(0, 0, S2, S2);
  if (tex === 'plank' || tex === 'fence') { for (let x = 0; x < S2; x += 8) { c.fillStyle = shade(col, (r() - 0.5) * 0.2); c.fillRect(x, 0, 8, S2); c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(x + 7, 0, 1, S2); c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(x, 0, 1, S2); for (let i = 0; i < 3; i++) { c.fillStyle = 'rgba(40,24,10,.45)'; c.fillRect(x + 2 + r() * 4, r() * S2, 1, 2 + r() * 3); } } }
  else if (tex === 'log') { for (let y = 0; y < S2; y += 8) { c.fillStyle = shade(col, (r() - 0.5) * 0.18); c.fillRect(0, y, S2, 8); c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(0, y + 1, S2, 1); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, y + 7, S2, 1); } }
  else if (tex === 'bricks') { for (let row = 0; row < 8; row++) { const off = (row % 2) * 8; for (let x = -off; x < S2; x += 16) { c.fillStyle = shade(col, (r() - 0.5) * 0.22); c.fillRect(x + 1, row * 8 + 1, 15, 6); c.fillStyle = 'rgba(255,255,255,.13)'; c.fillRect(x + 1, row * 8 + 1, 15, 1); } } }
  else if (tex === 'metal') { c.fillStyle = col; c.fillRect(0, 0, S2, S2); for (let y = 0; y < S2; y += 16) { c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(0, y + 15, S2, 1); c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(0, y, S2, 1); for (let x = 3; x < S2; x += 16) { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x, y + 3, 2, 2); c.fillRect(x, y + 11, 2, 2); } } }
  else { for (let row = 0; row < 8; row++) { const off = (row % 2) * 7; for (let x = -off; x < S2; x += 14) { const w = 11 + (r() * 4 | 0); c.fillStyle = shade(col, (r() - 0.5) * 0.25); c.fillRect(x + 1, row * 8 + 1, w, 6); c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(x + 1, row * 8 + 1, w, 1); } } }
  if (/moss/i.test(type)) for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(90,130,60,.55)'; c.fillRect(r() * S2, r() * S2, 2, 1); }
  p = ctx.createPattern(cv0, 'repeat'); _roofPat.set(k, p); return p; }
function drawHouse(ctx, H) {
  const L = ROOF_LIFT * T, base = (ITEMS[H.id] && ITEMS[H.id].roof.c) || '#8a5a32';
  // Sombra suave en el suelo (dos capas) y oscurecido al pie de la pared
  for (const [o, al] of [[10, 0.1], [5, 0.14]]) { ctx.fillStyle = `rgba(0,0,0,${al})`; for (const [x, a, b] of H.cols) ctx.fillRect(x * T + o, a * T - L * 0.4, T, (b - a + 1) * T + L * 0.4 + o * 0.6); }
  for (const [x, , b] of H.cols) { const g = ctx.createLinearGradient(0, (b + 1) * T, 0, (b + 1) * T + 10); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x * T - 2, (b + 1) * T, T + 4, 10); }
  // Fachada delantera (debajo del alero), casilla a casilla según lo que construiste en la pared de delante
  const isDoor = t => t && BD[t] && BD[t].door, isGlass = t => t && /glass|window/i.test(t);
  const wallOf = x => { const t = H.front.get(x); if (t && !isDoor(t) && !isGlass(t) && BD[t] && !BD[t].walk) return t; const n = H.front.get(x - 1) || H.front.get(x + 1); return n && !isDoor(n) && !isGlass(n) && BD[n] && !BD[n].walk ? n : 'woodWall'; };
  for (const [x, , b] of H.cols) { const fy = (b + 1) * T - L, t = H.front.get(x), X = x * T;
    if (!t || (BD[t] && BD[t].walk && !isDoor(t))) { ctx.fillStyle = 'rgba(10,8,6,.55)'; ctx.fillRect(X, fy, T, L); continue; } // hueco sin pared: porche en sombra
    ctx.fillStyle = wallPattern(ctx, wallOf(x)); ctx.fillRect(X, fy, T, L);
    if (isDoor(t)) { const dw = 24, dh = L - 3, dx = X + (T - dw) / 2, dy = fy + L - dh; // puerta del tamaño del personaje
      ctx.fillStyle = '#2a1a0e'; ctx.fillRect(dx - 3, dy - 3, dw + 6, dh + 3); ctx.fillStyle = '#5a3a20'; ctx.fillRect(dx - 2, dy - 2, dw + 4, 2);
      ctx.fillStyle = '#7a4e2a'; ctx.fillRect(dx, dy, dw, dh); for (let q = 0; q < 4; q++) { ctx.fillStyle = q % 2 ? '#6a4224' : '#845632'; ctx.fillRect(dx + q * 6, dy, 6, dh); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(dx + q * 6 + 5, dy, 1, dh); }
      ctx.fillStyle = '#4a2e18'; ctx.fillRect(dx, dy + 6, dw, 2); ctx.fillRect(dx, dy + dh - 9, dw, 2); ctx.fillStyle = '#e8c860'; ctx.fillRect(dx + dw - 6, dy + dh * 0.52, 3, 3); ctx.fillStyle = '#8a8682'; ctx.fillRect(dx - 4, fy + L - 2, dw + 8, 2); }
    else if (isGlass(t)) { const wx = X + 5, wy = fy + 8, ww = T - 10, wh = Math.min(20, L - 18);
      ctx.fillStyle = '#3a2414'; ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4); ctx.fillStyle = H.light ? '#ffd88a' : '#5a7a9a'; ctx.fillRect(wx, wy, ww, wh); if (H.light) { ctx.fillStyle = 'rgba(255,200,110,.22)'; ctx.fillRect(wx - 6, wy - 6, ww + 12, wh + 12); }
      ctx.fillStyle = '#3a2414'; ctx.fillRect(wx + ww / 2 - 1, wy, 2, wh); ctx.fillRect(wx, wy + wh / 2 - 1, ww, 2); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(wx + 1, wy + 1, 3, 3); ctx.fillStyle = '#6a5a4a'; ctx.fillRect(wx - 3, wy + wh + 2, ww + 6, 3); } }
  // Pared más oscura arriba (alero) y abajo, y algo de hierba al pie
  for (const [x, , b] of H.cols) { const fy = (b + 1) * T - L, g = ctx.createLinearGradient(0, fy, 0, fy + L); g.addColorStop(0, 'rgba(0,0,0,.25)'); g.addColorStop(0.3, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.2)'); ctx.fillStyle = g; ctx.fillRect(x * T, fy, T, L);
    if (isDoor(H.front.get(x))) continue; const rr = rRnd(x * 73856093 ^ b * 19349663);
    for (let t = 0; t < 4; t++) { const gx = x * T + rr() * T, gh = 2 + rr() * 4; ctx.fillStyle = rr() < 0.5 ? '#4e8a32' : '#3a6e28'; ctx.fillRect(gx, (b + 1) * T - gh, 1, gh); ctx.fillRect(gx + 1, (b + 1) * T - gh + 1, 1, gh - 1); } }
  // Esquinas de la fachada
  ctx.fillStyle = 'rgba(0,0,0,.35)'; for (const [x, , b] of H.cols) { if (x === H.x0) ctx.fillRect(x * T, (b + 1) * T - L, 3, L); if (x === H.x1) ctx.fillRect(x * T + T - 3, (b + 1) * T - L, 3, L); }
  if (H.side === 'E' || H.side === 'W') { drawSideRoof(ctx, H, L, base, wallOf(H.side === 'E' ? H.x1 : H.x0)); return; }
  // Tejado: vertiente de atrás, cumbrera y vertiente de delante
  for (const [x, a, b] of H.cols) { const top = a * T - L, bot = (b + 1) * T - L, ridge = (top + bot) / 2 - T * 0.15;
    for (let y = a; y <= b; y++) { const id = S.roof[roofKey(x, y)] || H.id, y0 = y * T - L, y1 = y0 + T; // cada casilla con su propio tejado (se pueden mezclar)
      if (y0 < ridge) { ctx.fillStyle = roofPattern(ctx, id, 'back'); ctx.fillRect(x * T, y0, T, Math.min(y1, ridge) - y0); } if (y1 > ridge) { ctx.fillStyle = roofPattern(ctx, id, 'front'); ctx.fillRect(x * T, Math.max(y0, ridge), T, y1 - Math.max(y0, ridge)); } }
    const g = ctx.createLinearGradient(0, top, 0, bot); g.addColorStop(0, 'rgba(255,255,255,.06)'); g.addColorStop(Math.max(0, (ridge - top) / (bot - top) - 0.01), 'rgba(255,255,255,.16)'); g.addColorStop(Math.min(1, (ridge - top) / (bot - top) + 0.01), 'rgba(0,0,0,.05)'); g.addColorStop(1, 'rgba(0,0,0,.28)'); ctx.fillStyle = g; ctx.fillRect(x * T, top, T, bot - top);
    ctx.fillStyle = shade(base, -0.45); ctx.fillRect(x * T, ridge - 1, T, 5); ctx.fillStyle = shade(base, 0.35); ctx.fillRect(x * T, ridge - 2, T, 2); // cumbrera
    ctx.fillStyle = shade(base, -0.5); ctx.fillRect(x * T - 2, bot - 3, T + 4, 3); ctx.fillStyle = shade(base, -0.3); for (let q = 0; q < 4; q++) ctx.fillRect(x * T + q * 8 + 1, bot - 1, 6, 2); { const g = ctx.createLinearGradient(0, bot, 0, bot + 9); g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x * T, bot, T, 9); } // alero (con el borde de las tejas) y su sombra en la pared
    ctx.fillStyle = shade(base, 0.3); ctx.fillRect(x * T, top, T, 2); }
  // Remates laterales (hastiales)
  for (const [x, a, b] of H.cols) { const top = a * T - L, bot = (b + 1) * T - L, prev = H.cols.find(c => c[0] === x - 1), next = H.cols.find(c => c[0] === x + 1);
    ctx.fillStyle = shade(base, -0.55); if (!prev || prev[1] > a || prev[2] < b) ctx.fillRect(x * T - 2, top, 4, bot - top); if (!next || next[1] > a || next[2] < b) ctx.fillRect(x * T + T - 2, top, 4, bot - top); }
  // Chimenea: solo si dentro hay un horno, una hoguera o una forja, justo encima de él (y echa humo)
  if (H.fire) { const col = H.cols.find(c => c[0] === H.fire[0]) || H.cols[0], cx = col[0] * T + 8, top = col[1] * T - L, bot = (col[2] + 1) * T - L, cy = top + (bot - top) * 0.22;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(cx + 4, cy + 4, 14, 18); ctx.fillStyle = '#7a6a62'; ctx.fillRect(cx, cy - 6, 14, 22); ctx.fillStyle = '#5a4c46'; ctx.fillRect(cx, cy - 6, 14, 3); ctx.fillRect(cx + 6, cy, 1, 16); ctx.fillStyle = '#a89890'; ctx.fillRect(cx, cy - 8, 14, 2); ctx.fillStyle = '#1a1412'; ctx.fillRect(cx + 3, cy - 7, 8, 2);
    if (typeof fxSmoke === 'function') { const now = performance.now() / 1000; if (now > H.smokeT) { H.smokeT = now + 0.35 + Math.random() * 0.4; fxSmoke(cx + 7, cy - 10, 'rgba(190,190,195,', 4); } } }
}
// Casa de costado: la cumbrera va de arriba abajo, las vertientes caen a izquierda y derecha y en el lado
// de la puerta se ve la pared con la puerta (de perfil)
function drawSideRoof(ctx, H, L, base, wallT) {
  const W0 = 9; // grosor de la pared lateral que asoma
  for (const [y, a, b] of H.rows) { const top = y * T - L; // paredes laterales a la vista (más oscura la de la sombra)
    for (const [sx, dark] of [[a * T - W0, 0.35], [(b + 1) * T, 0.5]]) { ctx.fillStyle = wallPattern(ctx, wallT); ctx.fillRect(sx, top + L * 0.35, W0, T); ctx.fillStyle = `rgba(0,0,0,${dark})`; ctx.fillRect(sx, top + L * 0.35, W0, T); } }
  // Puerta de perfil en el lado de la puerta, con su escalón
  { const r = H.rows.find(q => q[0] === H.sideY) || H.rows[H.rows.length - 1], y = r[0], top = y * T - L, east = H.side === 'E', sx = east ? (r[2] + 1) * T : r[1] * T - W0, dh = L - 3, dy = top + L * 0.35 + T - dh;
    ctx.fillStyle = '#2a1a0e'; ctx.fillRect(sx - 1, dy - 3, W0 + 2, dh + 3); ctx.fillStyle = '#7a4e2a'; ctx.fillRect(sx + 1, dy, W0 - 2, dh); ctx.fillStyle = '#4a2e18'; ctx.fillRect(sx + 1, dy + 6, W0 - 2, 2); ctx.fillRect(sx + 1, dy + dh - 9, W0 - 2, 2); ctx.fillStyle = '#e8c860'; ctx.fillRect(east ? sx + W0 - 4 : sx + 2, dy + dh * 0.52, 2, 3);
    ctx.fillStyle = '#8a8682'; ctx.fillRect(east ? sx + W0 : sx - 8, top + L * 0.35 + T - 4, 8, 4); }
  for (const [y, a, b] of H.rows) { const top = y * T - L, left = a * T, right = (b + 1) * T, ridge = (left + right) / 2 + T * 0.1;
    for (let x = a; x <= b; x++) { const id = S.roof[roofKey(x, y)] || H.id, x0 = x * T, x1 = x0 + T;
      if (x0 < ridge) { ctx.fillStyle = roofPatternR(ctx, id, 'left'); ctx.fillRect(x0, top, Math.min(x1, ridge) - x0, T); } if (x1 > ridge) { ctx.fillStyle = roofPatternR(ctx, id, 'right'); ctx.fillRect(Math.max(x0, ridge), top, x1 - Math.max(x0, ridge), T); } }
    const g = ctx.createLinearGradient(left, 0, right, 0), rk = (ridge - left) / (right - left); g.addColorStop(0, 'rgba(0,0,0,.12)'); g.addColorStop(Math.max(0, rk - 0.01), 'rgba(255,255,255,.16)'); g.addColorStop(Math.min(1, rk + 0.01), 'rgba(0,0,0,.08)'); g.addColorStop(1, 'rgba(0,0,0,.32)'); ctx.fillStyle = g; ctx.fillRect(left, top, right - left, T);
    ctx.fillStyle = shade(base, -0.45); ctx.fillRect(ridge - 2, top, 5, T); ctx.fillStyle = shade(base, 0.35); ctx.fillRect(ridge - 3, top, 2, T); // cumbrera
    ctx.fillStyle = shade(base, -0.5); ctx.fillRect(left - 3, top, 3, T); ctx.fillRect(right, top, 3, T); } // aleros laterales
  // Remate delantero (hastial) sobre la fachada y el de atrás
  for (const [x, a, b] of H.cols) { ctx.fillStyle = shade(base, -0.55); ctx.fillRect(x * T, (b + 1) * T - L - 3, T, 4); ctx.fillStyle = shade(base, 0.3); ctx.fillRect(x * T, a * T - L, T, 2); }
  if (H.fire) { const r = H.rows.find(q => q[0] === H.fire[1]) || H.rows[0], cx = (r[1] + r[2] + 1) / 2 * T - 7, cy = r[0] * T - L + 6;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(cx + 4, cy + 4, 14, 18); ctx.fillStyle = '#7a6a62'; ctx.fillRect(cx, cy - 6, 14, 22); ctx.fillStyle = '#5a4c46'; ctx.fillRect(cx, cy - 6, 14, 3); ctx.fillStyle = '#a89890'; ctx.fillRect(cx, cy - 8, 14, 2); ctx.fillStyle = '#1a1412'; ctx.fillRect(cx + 3, cy - 7, 8, 2);
    if (typeof fxSmoke === 'function') { const now = performance.now() / 1000; if (now > H.smokeT) { H.smokeT = now + 0.35 + Math.random() * 0.4; fxSmoke(cx + 7, cy - 10, 'rgba(190,190,195,', 4); } } }
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
