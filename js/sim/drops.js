'use strict';
// =====================================================================================
//  Objetos en el suelo: soltar, lanzar y recoger.
//   · L: suelta 1 del objeto de la barra rápida (o de la ranura bajo el ratón en el inventario);
//     Shift+L: la pila entera. Se lanza hacia el ratón (unas casillas) y rebota en las paredes.
//   · En el inventario (como en Minecraft): con una pila en la mano, haz clic fuera del panel.
//     Clic izquierdo suelta la pila; clic derecho, solo 1.
//   · Se recoge al pasar por encima (lo que lanzas tú, tras un momento). Los objetos cercanos
//     se acercan solos cuando ya se pueden coger. Duran 10 minutos en el suelo.
//   · En línea lo ve todo el mundo; el anfitrión decide quién lo coge (nadie lo duplica).
// =====================================================================================
const GI_LIFE = 600, GI_PICK = 18, GI_PULL = 60;
const giList = () => (S.gitems || (S.gitems = []));
// En claude.ai las salas admiten 16 temas como mucho: los objetos del suelo viajan dentro de «mob»
const giEmit = d => { if (typeof netEmit !== 'function') return; if (NET.kind === 'claude') netEmit('mob', { t: 'gi', ...d }); else netEmit('gi', d); };
const giId = () => Math.random().toString(36).slice(2, 9);
// Crear un objeto en el suelo (local) y avisar a los demás
function giSpawn(id, n, x, y, vx = 0, vy = 0, own = true) {
  const o = { k: giId(), id, n, x, y, vx, vy, z: 6, vz: 70, t: 0, by: own && typeof NET !== 'undefined' && NET.room && NET.room.me ? NET.room.me.peer || 'me' : 'me', mine: own ? 1 : 0 };
  giList().push(o); if (own && typeof netEmit === 'function') giEmit({ a: 'add', o: giWire(o) });
  return o;
}
const giWire = o => ({ k: o.k, id: o.id, n: o.n, x: Math.round(o.x), y: Math.round(o.y), vx: Math.round(o.vx), vy: Math.round(o.vy) });
// Lanzar hacia el ratón (o hacia donde miras)
function throwItem(id, n, toward) {
  if (!S || !ITEMS[id] || n <= 0) return;
  const p = S.player, mw = mouseWorld(), a = toward !== undefined ? toward : Math.atan2(mw.y - p.y, mw.x - p.x);
  // Cae más o menos donde apunta el ratón (entre media casilla y 4 casillas); desde una ventana, un poco por delante
  const want = toward !== undefined ? T * 1.2 : clamp(Math.hypot(mw.x - p.x, mw.y - p.y), T * 0.5, T * 4), sp = clamp(want / 0.47, 40, 280);
  giSpawn(id, n, p.x + Math.cos(a) * 10, p.y + Math.sin(a) * 10, Math.cos(a) * sp, Math.sin(a) * sp);
  tone(420, 0.06, 'triangle', 0.03, 0.7);
}
// Soltar desde la barra rápida o desde una ranura del inventario
function dropFrom(arr, i, all) {
  const s = arr[i]; if (!s) return false; const n = all ? s.n : 1, id = s.id;
  throwItem(id, n); s.n -= n; if (s.n <= 0) arr[i] = null; invVersion++; dropFx(id, n); return true;
}
// Soltar desde cualquier ranura que se vea (mochila, barra, cofre, máquina, equipo, kit…)
function dropSlot(key, all) {
  if (key && key.startsWith('inv:')) return dropFrom(S.inv, +key.slice(4), all);
  const r = typeof slotRef === 'function' && slotRef(key); if (!r || r.filter) return false;
  if (r.eq) { charData(); const id = S.equip[r.eq]; if (!id) return false; S.equip[r.eq] = null; throwItem(id, 1); dropFx(id, 1); if (typeof done === 'function') done(); return true; }
  let s = null; try { s = r.get && r.get(); } catch (e) { } if (!s || !ITEMS[s.id]) return false;
  const n = all ? s.n : 1, id = s.id; throwItem(id, n); const left = s.n - n; r.set(left > 0 ? { id, n: left } : null); dropFx(id, n); if (typeof done === 'function') done(); return true;
}
// Lo que llevas cogido con el ratón (en una ventana)
function dropHeld(all) { const h = ui.held; if (!h) return false; const n = all ? h.n : 1, id = h.id; throwItem(id, n, P.faceA ?? Math.PI / 2); h.n -= n; if (h.n <= 0) ui.held = null; dropFx(id, n); return true; }
// Aviso discreto: un texto sobre tu cabeza (y un toast solo si una ventana tapa el mundo); se agrupa al soltar seguido
let _dfx = { id: null, n: 0, t: 0 };
function dropFx(id, n) {
  const now = performance.now(), p = S.player, same = _dfx.id === id && now - _dfx.t < 900;
  if (same) _dfx.n += n; else _dfx = { id, n, t: now, row: now - _dfx.t < 900 ? ((_dfx.row || 0) + 1) % 4 : 0 }; _dfx.t = now;
  // Al soltar seguido lo mismo, se actualiza el mismo texto; cosas distintas se apilan en filas
  if (typeof FX !== 'undefined' && same && _dfx.fx && FX.includes(_dfx.fx)) { _dfx.fx.txt = `−${_dfx.n} ${ITEMS[id].n}`; _dfx.fx.t = 0.9; }
  else if (typeof fxText === 'function') { fxText(p.x, p.y - 22 - _dfx.row * 10, `−${_dfx.n} ${ITEMS[id].n}`, '#f0d9a8'); _dfx.fx = typeof FX !== 'undefined' ? FX[FX.length - 1] : null; }
  if (ui.open) toast(`⬇ Soltado: ${_dfx.n} × ${ITEMS[id].n}`);
}
// L (o Q dentro de una ventana): suelta 1 · Shift: la pila · mantener pulsado: va soltando cada vez más rápido
const _dh = { next: 0, c: 0 };
function hudHoverKey() { const el = document.querySelector('#hotbar .s:hover'); return el ? el.dataset.k : null; }
addEventListener('keydown', e => {
  if (!S || e.ctrlKey || e.metaKey || e.altKey) return; const k = e.key.toLowerCase();
  // L también es el hechizo 6 (solo con varita): con una varita y ese hueco lleno, L lanza el hechizo; si no, suelta
  const spellL = k === 'spell6' && !ui.open && typeof wandHeld === 'function' && wandHeld() && typeof spellState === 'function' && spellState().slots[5];
  if (!(k === 'l' || (k === 'spell6' && !spellL) || (k === 'q' && ui.open))) return;
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const hk0 = typeof _hoverKey !== 'undefined' ? _hoverKey : null;
  if (ui.open && !ui.held && !hk0) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const now = performance.now();
  if (e.repeat) { if (e.shiftKey || now < _dh.next) return; _dh.next = now + Math.max(40, 150 - _dh.c++ * 14); } else { _dh.c = 0; _dh.next = now + 380; }
  let ok;
  if (ui.open) { ok = hk0 ? dropSlot(hk0, e.shiftKey) : dropHeld(e.shiftKey); if (typeof refreshInvUI === 'function') refreshInvUI(true); }
  else { const hk = hudHoverKey(); ok = hk ? dropSlot(hk, e.shiftKey) : dropFrom(S.inv, S.sel, e.shiftKey); }
  if (!ok && !e.repeat) toastErr(ui.open ? 'Pasa el ratón por una ranura con algo' : 'No llevas nada en esa ranura');
}, true);
// En una ventana, la ranura bajo el ratón se olvida al salir de ella
document.addEventListener('mouseover', e => { if (typeof _hoverKey !== 'undefined' && _hoverKey && ui.open && !(e.target.closest && e.target.closest('.s[data-k]'))) _hoverKey = null; });
// ---------- Recoger a mano: F sobre un objeto del suelo (Shift+F, todo lo cercano) ----------
function giAt(x, y) { if (!S || !S.gitems) return null; let best = null, bd = 11; for (const o of S.gitems) { const d = Math.hypot(o.x - x, o.y - o.z - 4 - y); if (d < bd) { bd = d; best = o; } } return best; }
addEventListener('keydown', e => {
  if (!S || ui.open || e.key.toLowerCase() !== 'f' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const t = typeof HC !== 'undefined' && HC.target; if (!t || t.k !== 'gi') return;
  const p = S.player, near = o => Math.hypot(o.x - p.x, o.y - p.y) < T * 3.2;
  const list = e.shiftKey ? S.gitems.filter(near) : near(t.o) ? [t.o] : [];
  e.preventDefault(); e.stopImmediatePropagation();
  if (!list.length) { toastErr('Está lejos: acércate'); return; }
  for (const o of [...list]) { o.t = Math.max(o.t, 2); giTake(o); }
}, true);
// Recoger: el anfitrión (o tú, jugando solo) decide; un invitado lo pide
const _want = new Set();
function giTake(o) {
  const L2 = giList(), i = L2.indexOf(o); if (i < 0) return;
  if (typeof isGuest === 'function' && isGuest()) { if (_want.has(o.k)) return; _want.add(o.k); setTimeout(() => _want.delete(o.k), 2000); giEmit({ a: 'want', k: o.k }); return; }
  const left = invAdd(o.id, o.n);
  if (left > 0) { if (left === o.n) { if (!o._full) { o._full = 1; toastErr('Inventario lleno'); } return; } o.n = left; if (typeof netEmit === 'function') giEmit({ a: 'set', k: o.k, n: left }); }
  else { L2.splice(i, 1); if (typeof netEmit === 'function') giEmit({ a: 'del', k: o.k }); }
  tone(880, 0.05, 'sine', 0.03, 1.4); if (typeof fxBurst === 'function') fxBurst(o.x, o.y, 4, { col: ITEMS[o.id].c || '#fff', sp: 30, life: 0.3, size: 1.5, glow: 1 });
}
let _giT = 0;
function giTick(dt) {
  if (!S || !S.gitems || !S.gitems.length) return; const L2 = S.gitems, p = S.player, host = !(typeof isGuest === 'function' && isGuest());
  for (let i = L2.length - 1; i >= 0; i--) { const o = L2[i]; o.t += dt;
    if (o.t > GI_LIFE && host) { L2.splice(i, 1); if (typeof netEmit === 'function') giEmit({ a: 'del', k: o.k }); continue; }
    // Vuelo: arco, rozamiento y rebote en lo que no se atraviesa
    if (o.z > 0 || o.vz > 0) { o.vz -= 420 * dt; o.z = Math.max(0, o.z + o.vz * dt); if (o.z === 0) o.vz = 0; }
    if (o.vx || o.vy) { const nx = o.x + o.vx * dt, ny = o.y + o.vy * dt;
      if (passable(nx, o.y)) o.x = nx; else o.vx *= -0.4; if (passable(o.x, ny)) o.y = ny; else o.vy *= -0.4;
      const f = Math.exp(-(o.z > 0 ? 1.5 : 7) * dt); o.vx *= f; o.vy *= f; if (Math.abs(o.vx) + Math.abs(o.vy) < 3) o.vx = o.vy = 0; }
    // Recoger (lo tuyo, tras 1,5 s; lo de otros, enseguida)
    // Lo que sueltas tú no vuelve solo a la mochila mientras sigas al lado: hay que alejarse y volver (o F)
    const d = Math.hypot(o.x - p.x, o.y - (p.y + 4)); if (o.mine && !o.away && d > GI_PULL + 6) o.away = 1;
    const ready = o.t > (o.mine ? 1.5 : 0.4) && (!o.mine || o.away);
    if (ready && d < GI_PULL && d > GI_PICK && !ui.open) { const a = Math.atan2(p.y + 4 - o.y, p.x - o.x); o.x += Math.cos(a) * 90 * dt; o.y += Math.sin(a) * 90 * dt; }
    if (ready && d <= GI_PICK && !(o.z > 2)) giTake(o);
  }
  // Juntar en una sola pila lo mismo que está pegado (no se llena el suelo de iconos)
  if ((_giT += dt) > 1 && host) { _giT = 0; for (let i = 0; i < L2.length; i++) for (let j = L2.length - 1; j > i; j--) { const a = L2[i], b = L2[j]; if (a.id === b.id && a.n + b.n <= STACK && !a.vx && !b.vx && Math.hypot(a.x - b.x, a.y - b.y) < 12) { a.n += b.n; L2.splice(j, 1); if (typeof netEmit === 'function') { giEmit({ a: 'set', k: a.k, n: a.n }); giEmit({ a: 'del', k: b.k }); } } } }
}
{ const s0 = survTick; survTick = (dt, mv, sp) => { s0(dt, mv, sp); giTick(dt); }; }
// Dibujo: con sombra, flotando un poco y con su número
function drawGroundItems(c) {
  if (!S || !S.gitems || !S.gitems.length) return; const now = performance.now() / 1000;
  for (const o of S.gitems) {
    const bob = o.z > 0 ? 0 : Math.sin(now * 3 + o.x * 0.1) * 1.5, y = o.y - o.z - 4 + bob, fade = o.t > GI_LIFE - 30 ? 0.4 + 0.6 * Math.abs(Math.sin(now * 6)) : 1;
    c.globalAlpha = 0.35 * fade; c.fillStyle = '#000'; c.beginPath(); c.ellipse(o.x, o.y + 4, 6, 2.4, 0, 0, 7); c.fill();
    const hv = typeof HC !== 'undefined' && HC.target && HC.target.k === 'gi' && HC.target.o === o && !ui.open;
    if (hv) { const pu = 0.5 + 0.5 * Math.sin(now * 6); c.globalAlpha = 0.22 + pu * 0.18; c.fillStyle = '#ffd88a'; c.beginPath(); c.arc(o.x, y, 10 + pu, 0, 7); c.fill();
      c.globalAlpha = 0.9; c.strokeStyle = '#ffd88a'; c.lineWidth = 1; c.beginPath(); c.ellipse(o.x, o.y + 4, 8 + pu, 3.2, 0, 0, 7); c.stroke(); }
    c.globalAlpha = fade; try { drawItem(c, o.id, o.x, y + (hv ? -1.5 : 0), hv ? 16 : 14); } catch (e) { }
    if (o.n > 1) { c.font = 'bold 8px system-ui'; c.textAlign = 'right'; c.lineWidth = 2; c.strokeStyle = 'rgba(0,0,0,.8)'; c.strokeText(o.n, o.x + 9, y + 9); c.fillStyle = '#fff'; c.fillText(o.n, o.x + 9, y + 9); }
  }
  c.globalAlpha = 1;
}
{ const a0 = drawAnimals; drawAnimals = (c, k, ox, oy, x0, y0, x1, y1) => { a0(c, k, ox, oy, x0, y0, x1, y1); c.setTransform(k, 0, 0, k, ox, oy); drawGroundItems(c); }; }
// En línea: todos ven lo mismo; el anfitrión reparte
{ const w0 = wireGame; wireGame = r => { w0(r); const onGi = m => {
  if (m.sameTab || !m.data || !S) return; const d = m.data, L2 = giList(), host = NET.game && NET.game.host;
  if (d.a === 'add' && d.o && ITEMS[d.o.id] && !L2.some(o => o.k === d.o.k)) L2.push({ ...d.o, z: 6, vz: 70, t: 0, by: m.peer, mine: 0 });
  else if (d.a === 'del') { const i = L2.findIndex(o => o.k === d.k); if (i >= 0) L2.splice(i, 1); }
  else if (d.a === 'set') { const o = L2.find(o => o.k === d.k); if (o) o.n = d.n; }
  else if (d.a === 'want' && host) { const i = L2.findIndex(o => o.k === d.k); if (i < 0) return; const o = L2[i]; L2.splice(i, 1); giEmit({ a: 'del', k: o.k }); giEmit({ a: 'give', to: m.peer, id: o.id, n: o.n }); }
  else if (d.a === 'give' && d.to === myPeer(r) && ITEMS[d.id]) { const left = invAdd(d.id, d.n); if (left > 0) throwItem(d.id, left); tone(880, 0.05, 'sine', 0.03, 1.4); }
}; r.on('gi', onGi); r.on('mob', m => { if (m.data && m.data.t === 'gi') onGi(m); }); }; }
// Lo recogido, minado o fabricado va primero a un hueco libre de la barra rápida; si no hay, a la mochila
FILL_ORDER.length = 0; for (let i = 0; i < INV_N; i++) FILL_ORDER.push(i);
// ---------- Inventario: columna lateral (ficha del objeto y ayuda de soltar) ----------
{ const b0 = buildInvPanel; buildInvPanel = (...a) => {
  b0(...a); const left = $('invLeft'), g = left && left.querySelectorAll(':scope > .invgrid'); if (!g || g.length < 2) return;
  const wrap = document.createElement('div'); wrap.className = 'invwrap'; const col = document.createElement('div'); col.className = 'invcol';
  g[0].before(wrap); col.append(g[0], g[1]); wrap.append(col);
  wrap.insertAdjacentHTML('beforeend', `<aside class="invside">
    <div class="invdrop" data-drop><span class="idi">⬇</span><b>Soltar al suelo</b><small>Con una pila cogida: clic suelta toda · clic der., 1</small></div>
    <div class="invtip"><kbd>L</kbd> o <kbd>Q</kbd> sobre una ranura: suelta 1 · con <kbd>Shift</kbd>, la pila · mantén pulsado para soltar seguido</div></aside>`);
}; }
// Clic fuera del panel con algo en la mano: se suelta (izquierdo, la pila; derecho, 1)
document.addEventListener('mousedown', e => {
  if (!S || ui.open !== 'inv' || !ui.held || (e.button !== 0 && e.button !== 2)) return;
  if (e.target.closest && e.target.closest('#mInv .modal-in') && !e.target.closest('[data-drop]')) return;
  e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
  dropHeld(e.button !== 2); refreshInvUI(true);
}, true);
// Fuera del panel el cursor avisa de que se puede soltar
setInterval(() => { const m = document.getElementById('mInv'); if (m) m.classList.toggle('candrop', !!(ui && ui.held && ui.open === 'inv')); }, 150);
// ---------- Dar sin perder nada ----------
// Premios, botín, cosechas…: lo que no quepa en el inventario cae al suelo (donde se diga, o a tus pies)
// en vez de desaparecer. Devuelve cuántos han caído al suelo.
let _giFullT = 0;
function invGive(id, n, x, y) {
  if (!S || !ITEMS[id] || n <= 0) return 0; const left = invAdd(id, n); if (left <= 0) return 0;
  const p = S.player, a = Math.random() * 6.28, sp = 30 + Math.random() * 50;
  giSpawn(id, left, (x ?? p.x) + Math.cos(a) * 6, (y ?? p.y) + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp).away = 1; // botín: se recoge solo en cuanto quepa
  const now = performance.now(); if (now - _giFullT > (typeof OPT !== 'undefined' && OPT.quietToasts ? 300000 : 2500)) { _giFullT = now; toast('🎒 Inventario lleno: lo que no cabe queda en el suelo'); }
  return left;
}
