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
  const p = S.player, a = toward !== undefined ? toward : Math.atan2(mouseWorld().y - p.y, mouseWorld().x - p.x), sp = 150;
  giSpawn(id, n, p.x + Math.cos(a) * 10, p.y + Math.sin(a) * 10, Math.cos(a) * sp, Math.sin(a) * sp);
  tone(420, 0.06, 'triangle', 0.03, 0.7);
}
// Soltar desde la barra rápida o desde una ranura del inventario
function dropFrom(arr, i, all) {
  const s = arr[i]; if (!s) return false; const n = all ? s.n : 1;
  throwItem(s.id, n); s.n -= n; if (s.n <= 0) arr[i] = null; invVersion++; return true;
}
addEventListener('keydown', e => {
  if (!S || e.key.toLowerCase() !== 'l' || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  if (ui.open === 'inv') { const k = typeof _hoverKey !== 'undefined' ? _hoverKey : null; if (k && k.startsWith('inv:')) { e.preventDefault(); e.stopImmediatePropagation(); dropFrom(S.inv, +k.slice(4), e.shiftKey); refreshInvUI(true); } return; }
  if (ui.open) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (!dropFrom(S.inv, S.sel, e.shiftKey)) toastErr('No llevas nada en esa ranura');
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
    const ready = o.t > (o.mine ? 1.5 : 0.4), d = Math.hypot(o.x - p.x, o.y - (p.y + 4));
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
    c.globalAlpha = fade; try { drawItem(c, o.id, o.x, y, 14); } catch (e) { }
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
    <div class="invtip"><b>⬇ Soltar:</b> coge una pila y haz clic fuera del inventario (derecho: solo 1) · <kbd>L</kbd> suelta 1, <kbd>Shift</kbd>+<kbd>L</kbd> la pila</div></aside>`);
}; }
// Clic fuera del panel con algo en la mano: se suelta (izquierdo, la pila; derecho, 1)
document.addEventListener('mousedown', e => {
  if (!S || ui.open !== 'inv' || !ui.held || (e.button !== 0 && e.button !== 2)) return;
  if (e.target.closest && e.target.closest('#mInv .modal-in')) return;
  e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
  const h = ui.held, n = e.button === 2 ? 1 : h.n; throwItem(h.id, n, P.faceA ?? Math.PI / 2); h.n -= n; if (h.n <= 0) ui.held = null;
  toast(`⬇ Soltado: ${n} × ${ITEMS[h.id].n}`); refreshInvUI(true);
}, true);
// Fuera del panel el cursor avisa de que se puede soltar
setInterval(() => { const m = document.getElementById('mInv'); if (m) m.classList.toggle('candrop', !!(ui && ui.held && ui.open === 'inv')); }, 150);
