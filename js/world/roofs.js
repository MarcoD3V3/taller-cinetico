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
let _indoorA = 0;
function drawRoofs(ctx) {
  if (!S || !S.roof) return; const tr = ctx.getTransform(), z = view.z;
  const x0 = Math.floor((view.x - cw / 2 / z) / T) - 1, x1 = Math.ceil((view.x + cw / 2 / z) / T) + 1, y0 = Math.floor((view.y - ch / 2 / z) / T) - 1, y1 = Math.ceil((view.y + ch / 2 / z) / T) + 1;
  const reg = indoorRegion(); _indoorA += ((reg ? 1 : 0) - _indoorA) * 0.18;
  // Fuera: se ve todo menos la casa en la que estás
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const id = roofAt(x, y); if (!id || (reg && reg.has(roofKey(x, y)))) continue;
    const m = (roofAt(x, y - 1) ? 1 : 0) | (roofAt(x + 1, y) ? 2 : 0) | (roofAt(x, y + 1) ? 4 : 0) | (roofAt(x - 1, y) ? 8 : 0); ctx.drawImage(roofSprite(id, m), x * T, y * T - 6, T, T); if (!(m & 4)) ctx.drawImage(roofSprite(id, m), 0, 26, 32, 6, x * T, y * T + 26, T, 6); }
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
{ const d0 = drawFxWorld; drawFxWorld = c => { d0(c); drawRoofs(c); }; }
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
function roofTake(x, y) { const id = roofAt(x, y); if (!id || !roofReach(x, y)) return false; roofSet(x, y, null); if (invAdd(id, 1) > 0) toastErr('Inventario lleno'); burst(x, y, ITEMS[id].roof.c); return true; }
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
