'use strict';
// =====================================================================================
//  Clanes y comercio (bloques en data/clans.js).
//  CLANES (Aventura › Clan, o /clan):
//   · Se crean con nombre, etiqueta de 2-4 letras y color. Rangos: líder, oficial y miembro.
//     El líder y los oficiales invitan y expulsan; el líder asciende, degrada y puede disolverlo.
//   · La etiqueta [TAG] sale delante de tu nombre en multijugador. /c mensaje: chat del clan.
//   · Estandarte del clan: protege 12 casillas. Ahí solo los del clan construyen, rompen y cavan
//     (si alguien lo intenta con trampas, el anfitrión lo deshace). Cofre del clan: solo para el clan.
//   · Los clanes son del mundo: los guarda el anfitrión y se reparten a todos.
//  COMERCIO:
//   · F sobre otro jugador cerca (o /comerciar nombre): le pides comerciar. Si acepta, cada uno pone
//     lo que ofrece. Primero los dos marcan «Listo» (si alguien cambia algo, se quita) y luego los
//     dos «Confirmar». Solo entonces se intercambian. Nadie puede quitar lo suyo en el último segundo.
//   · Puesto de venta: dejas objetos con precio; compran aunque no estés y recoges las monedas.
// =====================================================================================
const CLS = { inv: [], hud: '' }, TRD = { on: null, req: null };
const CL_COLS = ['#e05050', '#e0a040', '#e0d050', '#60c060', '#40b0d0', '#6070e0', '#b060e0', '#e070b0', '#d8d8d8', '#404048'];
const clKey = () => (typeof NET !== 'undefined' && NET.me && NET.me.id) || 'yo';
const clAll = () => (S && S.clans) || {};
const clOf = key => { for (const id in clAll()) if (clAll()[id].mem[key]) return clAll()[id]; return null; };
const clMine = () => clOf(clKey());
const clRank = (c, key) => c && c.mem[key] ? c.mem[key].r : null;
const clEmit = d => { if (typeof netEmit !== 'function' || !inGame()) return; if (NET.kind === 'claude') netEmit('mob', { t: 'clx', ...d }); else netEmit('clx', d); };
const clPeers = () => (typeof NET !== 'undefined' && NET.peers ? [...NET.peers.values()].filter(o => o.pr) : []);
const clNameOf = key => { const o = clPeers().find(p => p.by === key); return o ? o.nick : null; };
// ---------- Operaciones (las aplica el anfitrión, o tú si juegas solo) ----------
function clApply(op, by, nick, a) {
  const C = S.clans || (S.clans = {}), mine = clOf(by), r = clRank(mine, by), say = (t, ok) => ({ ok, t });
  if (op === 'create') { if (mine) return say('Ya estás en un clan'); const n = String(a.n || '').trim().slice(0, 24), tag = String(a.tag || '').replace(/[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ]/g, '').slice(0, 4).toUpperCase();
    if (n.length < 3 || tag.length < 2) return say('El nombre necesita 3 letras y la etiqueta 2-4'); if (Object.values(C).some(c => c.tag === tag)) return say('Esa etiqueta ya la usa otro clan');
    const id = 'cl' + Date.now().toString(36); C[id] = { id, n, tag, c: CL_COLS.includes(a.c) ? a.c : CL_COLS[(Math.random() * CL_COLS.length) | 0], mem: { [by]: { n: nick, r: 'lead' } }, inv: {}, made: Date.now() }; return say(`Has fundado el clan [${tag}] ${n}`, 1); }
  if (op === 'accept') { const c = C[a.id]; if (!c || !c.inv[by]) return say('Esa invitación ya no vale'); if (mine) return say('Sal antes de tu clan'); delete c.inv[by]; c.mem[by] = { n: nick, r: 'mem' }; return say(`Te unes a [${c.tag}] ${c.n}`, 1); }
  if (op === 'decline') { const c = C[a.id]; if (c) delete c.inv[by]; return say('Invitación rechazada', 1); }
  if (!mine) return say('No estás en ningún clan');
  if (op === 'leave') { delete mine.mem[by]; if (r === 'lead') { const next = Object.entries(mine.mem).sort((x, y) => (y[1].r === 'off') - (x[1].r === 'off'))[0]; if (next) next[1].r = 'lead'; else delete C[mine.id]; } return say('Has salido del clan', 1); }
  if (op === 'invite') { if (r === 'mem') return say('Solo el líder y los oficiales invitan'); if (!a.key || clOf(a.key)) return say('Ese jugador ya está en un clan'); mine.inv[a.key] = { n: String(a.n || 'Jugador').slice(0, 20), t: Date.now() }; return say(`Invitación enviada a ${a.n}`, 1); }
  if (op === 'kick') { const tr = clRank(mine, a.key); if (!tr || a.key === by || r === 'mem' || (r === 'off' && tr !== 'mem')) return say('No puedes expulsar a ese miembro'); delete mine.mem[a.key]; return say('Miembro expulsado', 1); }
  if (op === 'rank') { if (r !== 'lead' || !mine.mem[a.key] || a.key === by) return say('Solo el líder cambia los rangos'); if (a.r === 'lead') { mine.mem[by].r = 'off'; mine.mem[a.key].r = 'lead'; } else mine.mem[a.key].r = a.r === 'off' ? 'off' : 'mem'; return say('Rango cambiado', 1); }
  if (op === 'color') { if (r !== 'lead') return say('Solo el líder cambia el color'); if (CL_COLS.includes(a.c)) mine.c = a.c; return say('Color cambiado', 1); }
  if (op === 'disband') { if (r !== 'lead') return say('Solo el líder puede disolver el clan'); delete C[mine.id]; return say('Clan disuelto', 1); }
  return say('No entiendo esa orden');
}
function clDo(op, a = {}) {
  if (!S) return; if (isGuest()) { clEmit({ a: 'req', op, args: a, nick: myNick() }); return; }
  const r = clApply(op, clKey(), myNick(), a); (r.ok ? toast : toastErr)(r.t); if (r.ok) clBroadcast(); advRender();
}
function clBroadcast() { clEmit({ a: 'all', clans: S.clans || {} }); }
// ---------- Red ----------
{ const w0 = wireGame; wireGame = r => {
  // Antes que nada: el anfitrión rechaza lo que se hace en zona protegida de otro clan
  const pre = m => { const g = NET.game; if (!g || !g.host || m.sameTab || !m.data || !S) return false; return true; };
  // Cada receptor recibe su propia copia del mensaje, pero el contenido (data) es el mismo objeto:
  // se deja inservible para que el resto del juego no lo aplique, y se manda la versión buena
  const deny = (m, x, y) => { if (typeof hostFix === 'function') hostFix(x, y); const d = m.data; if (d.o) d.o.type = '__denegado'; d.x = d.y = -1e9; };
  r.on('badd', m => { if (!pre(m) || !m.data.o) return; const o = m.data.o; if (!clCan(m.by, o.x, o.y) || (o.type === 'clanBanner' && !clOf(m.by))) deny(m, o.x, o.y); });
  r.on('bdel', m => { if (!pre(m)) return; const x = m.data.x | 0, y = m.data.y | 0, b = at(x, y); if (!clCan(m.by, x, y) || (b && b.type === 'marketStall' && b.own && b.own !== m.by)) deny(m, x, y); });
  r.on('tile', m => { if (!pre(m) || !Array.isArray(m.data.a)) return; if (m.data.a.some(t => !clCan(m.by, t[0], t[1]))) { for (const t of m.data.a) NET.tq.add(t[0] + ',' + t[1]); m.data.a.length = 0; } });
  r.on('bset', m => { if (!pre(m) || !m.data.o) return; const o = m.data.o, b = at(o.x | 0, o.y | 0); if (b && b.type === 'clanChest' && !clChestOK(b, m.by)) { const s = serB(b); if (s) netEmit('bsb', { a: [s] }); m.data.o = null; } });
  w0(r);
  const on = m => { if (m.sameTab || !m.data || !S) return; const d = m.data, g = NET.game, me = myPeer(r);
    if (d.a === 'req' && g.host) { const res = clApply(d.op, m.by, String((m.verified && m.name) || d.nick || 'Jugador').slice(0, 20), d.args || {}); clEmit({ a: 'res', to: m.peer, ok: res.ok, t: res.t }); if (res.ok) clBroadcast(); return; }
    if (d.a === 'all' && !g.host && (!g.hostPeer || m.peer === g.hostPeer)) { S.clans = d.clans || {}; advRender(); clInviteCheck(); return; }
    if (d.a === 'res' && d.to === me) { (d.ok ? toast : toastErr)(String(d.t || '').slice(0, 120)); return; }
    if (d.a === 'chat') { const c = clMine(); if (c && c.id === d.id) chatPush('say', String(d.m || '').slice(0, 240), { nick: `🛡 [${c.tag}] ${String(d.nick || '').slice(0, 20)}`, c: c.c }); return; }
    if (d.a === 'tr') trRecv(d, m.peer, me); };
  r.on('clx', on); r.on('mob', m => { if (m.data && m.data.t === 'clx') on(m); });
}; }
// Al entrar alguien, el anfitrión le manda los clanes
{ const s0 = sendSnap; sendSnap = (peer, by) => { const r = s0(peer, by); setTimeout(() => { if (NET.game && NET.game.host) clBroadcast(); }, 1500); return r; }; }
function clInviteCheck() { for (const id in clAll()) { const c = clAll()[id]; if (c.inv[clKey()] && !CLS.inv.includes(id)) { CLS.inv.push(id); toast(`🛡 Te invitan al clan [${c.tag}] ${c.n}. Acepta en Aventura (Y) › Clan o con /clan aceptar`, true); } } }
// ---------- Zonas protegidas ----------
const CL_R = 12;
function clBannerAt(tx, ty) { for (const b of L.clanBanner || []) if (b.clan && clAll()[b.clan] && Math.hypot(b.x - tx, b.y - ty) <= CL_R) return b; return null; }
function clCan(key, tx, ty) { const b = clBannerAt(tx, ty); if (!b) return true; const c = clAll()[b.clan]; return !!(c && c.mem[key]); }
const clChestOK = (b, key) => !b.clan || !clAll()[b.clan] || !!clAll()[b.clan].mem[key];
let _clMsgT = 0; const clNo = (x = mouse.tx, y = mouse.ty) => { const n = performance.now(); if (n - _clMsgT > 1500) { _clMsgT = n; const b = clBannerAt(x, y), c = b && clAll()[b.clan]; toastErr(`🛡 Zona protegida del clan [${c ? c.tag : '?'}]: aquí solo construyen ellos`); } };
{ const c0 = canPlace; canPlace = (type, x, y) => { if (S && !clCan(clKey(), x, y)) return 'Zona protegida de otro clan'; if (type === 'clanBanner' && !clMine()) return 'Necesitas estar en un clan'; if (type === 'clanBanner' && clMine() && (L.clanBanner || []).filter(b => b.clan === clMine().id).length >= 3) return 'Tu clan ya tiene 3 estandartes'; return c0(type, x, y); }; }
{ const r0 = removeAt; removeAt = (x, y) => { if (S && !clCan(clKey(), x, y)) { clNo(x, y); return; } const b = at(x, y); if (b && b.type === 'marketStall' && b.own && b.own !== clKey()) { toastErr('Este puesto es de ' + (b.ownN || 'otro jugador')); return; } return r0(x, y); }; }
{ const m0 = updateMining; updateMining = fdt => { if (S && mouse.down && !clCan(clKey(), mouse.tx, mouse.ty)) { const mw = mouseWorld(); if (!nearestFoe(mw.x, mw.y, 30) && !animalAt(mw.x, mw.y, 0)) { ui.mine.t = 0; clNo(); return; } } return m0(fdt); }; }
// Al poner un estandarte o un cofre del clan, queda a nombre de tu clan; el puesto, a tu nombre
{ const a0 = addBlock; addBlock = b => { if (S && b && !b.clan && (b.type === 'clanBanner' || b.type === 'clanChest') && !NET.netIn) { const c = clMine(); if (c) b.clan = c.id; }
  if (S && b && b.type === 'marketStall' && !b.own && !NET.netIn) { b.own = clKey(); b.ownN = myNick(); b.sale = []; b.cash = 0; } return a0(b); }; }
// ---------- Abrir el cofre del clan y el puesto ----------
{ const i0 = interact; interact = (shift, ctrl) => { if (!S) return i0(shift, ctrl); const b = at(mouse.tx, mouse.ty);
  if (b && b.type === 'clanChest' && !clChestOK(b, clKey())) { const c = clAll()[b.clan]; toastErr(`🔒 Cofre del clan [${c ? c.tag : '?'}]: solo lo abren ellos`); return; }
  if (b && b.type === 'marketStall') { stOpen(b); return; }
  // F sobre otro jugador: pedirle comerciar
  if (!b && inGame()) { const mw = mouseWorld(), o = clPeers().find(p => Math.hypot((p.rx ?? p.pr.x) - mw.x, (p.ry ?? p.pr.y) - 14 - mw.y) < 18); if (o && Math.hypot((o.rx ?? o.pr.x) - S.player.x, (o.ry ?? o.pr.y) - S.player.y) < 5 * T) { trAsk(o); return; } }
  return i0(shift, ctrl); }; }
{ const o0 = openInventory; openInventory = b => { if (b && b.type === 'clanChest' && !clChestOK(b, clKey())) { toastErr('🔒 Solo para el clan'); return; } return o0(b); }; }
// ---------- Etiqueta en el nombre y estandartes ----------
{ const d0 = drawCombat; drawCombat = (ctx, k, ox, oy, x0, y0, x1, y1) => { const r = d0(ctx, k, ox, oy, x0, y0, x1, y1); if (S && L.clanBanner && L.clanBanner.length) { const t = performance.now() / 1000; ctx.save();
  for (const b of L.clanBanner) { const c = clAll()[b.clan]; if (!c || Math.abs(b.x * T - view.x) > 40 * T || Math.abs(b.y * T - view.y) > 30 * T) continue; const X = b.x * T + 16, Y = b.y * T + 4;
    ctx.strokeStyle = '#5a4030'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X - 6, Y + 26); ctx.lineTo(X - 6, Y - 18); ctx.stroke();
    ctx.fillStyle = c.c; ctx.beginPath(); ctx.moveTo(X - 5, Y - 17); for (let i = 0; i <= 6; i++) ctx.lineTo(X - 5 + i * 3, Y - 17 + Math.sin(t * 3 + i * 0.8) * 1.5); ctx.lineTo(X + 13, Y - 1 + Math.sin(t * 3 + 4.8) * 1.5); ctx.lineTo(X - 5, Y - 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 6px system-ui'; ctx.textAlign = 'center'; ctx.fillText(c.tag, X + 4, Y - 6);
    const d = Math.hypot(b.x * T - S.player.x, b.y * T - S.player.y) / T; if (d < CL_R + 6) { ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 2); ctx.strokeStyle = c.c; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(X, Y + 12, CL_R * T, CL_R * T, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; } }
  ctx.restore(); } return r; }; }
// ---------- Chat del clan ----------
cmd('c', { a: ['clanchat'], u: '/c <mensaje>', d: 'Habla solo con los de tu clan.', run(a, raw) { const c = clMine(); if (!c) return errMsg('No estás en ningún clan'); const m = (raw || a.join(' ')).replace(/^\/?\w+\s*/, '').trim() || a.join(' '); if (!m) return; chatPush('say', m, { nick: `🛡 [${c.tag}] ${myNick()}`, c: c.c }); clEmit({ a: 'chat', id: c.id, m, nick: myNick() }); } });
cmd('clan', { a: ['gremio'], u: '/clan [crear Nombre ETQ | aceptar | salir | invitar jugador]', d: 'Clanes: abre la ventana del clan o haz una orden rápida.', run(a) {
  const op = normTxt(a[0] || ''); if (!op) return advOpen('clan');
  if (op === 'crear') return clDo('create', { n: a.slice(1, -1).join(' ') || a[1], tag: a[a.length - 1] });
  if (op === 'aceptar') { const id = Object.keys(clAll()).find(id => clAll()[id].inv[clKey()]); return id ? clDo('accept', { id }) : errMsg('No tienes invitaciones'); }
  if (op === 'salir') return clDo('leave'); if (op === 'disolver') return clDo('disband');
  if (op === 'invitar') { const n = normTxt(a.slice(1).join(' ')), o = clPeers().find(p => normTxt(p.nick) === n || normTxt(p.nick).startsWith(n)); return o ? clDo('invite', { key: o.by, n: o.nick }) : errMsg('No veo a ese jugador conectado'); }
  errMsg('Órdenes: crear Nombre ETQ, aceptar, salir, invitar jugador, disolver');
} });
// ---------- Pestaña Clan en la ventana de Aventura ----------
const CLV = { c: CL_COLS[4] };
ADV.tabs.clan = { n: '🛡 Clan', render() {
  const c = clMine(), me = clKey(), invs = Object.values(clAll()).filter(x => x.inv[me]);
  const others = Object.values(clAll()).filter(x => x !== c).map(x => `<span class="clt" style="--cc:${x.c}">[${esc(x.tag)}] ${esc(x.n)} · ${Object.keys(x.mem).length}</span>`).join(' ');
  if (!c) return `${!inGame() ? '<p class="advwarn">Los clanes son para jugar con otros: sirven en tu mundo cuando invites a gente (puedes crearlo ya y tener tu estandarte).</p>' : ''}
    ${invs.length ? `<h4 class="cxh">Invitaciones</h4>${invs.map(x => `<div class="clinv" style="--cc:${x.c}"><b>[${esc(x.tag)}] ${esc(x.n)}</b><span>${Object.keys(x.mem).length} miembros</span><button class="pri" data-clop="accept" data-clid="${x.id}">Unirme</button><button data-clop="decline" data-clid="${x.id}">No, gracias</button></div>`).join('')}` : ''}
    <h4 class="cxh">Fundar un clan</h4><div class="clform"><input id="clN" maxlength="24" placeholder="Nombre del clan (p. ej. Los Forjadores)"><input id="clT" maxlength="4" placeholder="ETQ" style="width:70px;text-transform:uppercase">
    <div class="clcols">${CL_COLS.map(k => `<button class="${CLV.c === k ? 'on' : ''}" data-clcol="${k}" style="background:${k}"></button>`).join('')}</div><button class="pri" data-clop="create">Fundar</button></div>
    ${others ? `<h4 class="cxh">Clanes de este mundo</h4><div class="clothers">${others}</div>` : ''}`;
  const r = clRank(c, me), RN = { lead: '👑 Líder', off: '⭐ Oficial', mem: 'Miembro' }, online = new Set([me, ...clPeers().map(p => p.by)]);
  const mem = Object.entries(c.mem).sort((a, b) => ({ lead: 0, off: 1, mem: 2 }[a[1].r] - { lead: 0, off: 1, mem: 2 }[b[1].r])).map(([k, m]) => `<div class="clm"><span class="dot ${online.has(k) ? 'on' : ''}"></span><b>${esc(m.n)}${k === me ? ' (tú)' : ''}</b><span>${RN[m.r]}</span>
    ${k !== me && r === 'lead' ? `<button data-clop="rank" data-clk="${k}" data-clr="${m.r === 'off' ? 'mem' : 'off'}">${m.r === 'off' ? 'Degradar' : 'Ascender'}</button><button data-clop="rank" data-clk="${k}" data-clr="lead">Hacer líder</button>` : ''}${k !== me && (r === 'lead' || (r === 'off' && m.r === 'mem')) ? `<button data-clop="kick" data-clk="${k}">Expulsar</button>` : ''}</div>`).join('');
  const cand = clPeers().filter(p => p.by && !clOf(p.by) && !c.inv[p.by]);
  return `<div class="clhead" style="--cc:${c.c}"><span class="cltag">[${esc(c.tag)}]</span><div><b>${esc(c.n)}</b><small>${Object.keys(c.mem).length} miembros · eres ${RN[r]} · estandartes: ${(L.clanBanner || []).filter(b => b.clan === c.id).length}/3</small></div></div>
    <p class="mut small">Pon un <b>Estandarte del clan</b> (tela, palos y hierro): protege 12 casillas a su alrededor. El <b>Cofre del clan</b> solo lo abren los vuestros. <b>/c mensaje</b> habla solo con el clan.</p>
    <h4 class="cxh">Miembros</h4><div class="clmems">${mem}</div>
    ${r !== 'mem' ? `<h4 class="cxh">Invitar <small>jugadores conectados sin clan</small></h4>${cand.length ? `<div class="clothers">${cand.map(p => `<button data-clop="invite" data-clk="${p.by}" data-cln="${esc(p.nick)}">+ ${esc(p.nick)}</button>`).join('')}</div>` : '<p class="mut small">Nadie conectado sin clan ahora mismo.</p>'}${Object.keys(c.inv).length ? `<p class="mut small">Invitados pendientes: ${Object.values(c.inv).map(i => esc(i.n)).join(', ')}</p>` : ''}` : ''}
    ${r === 'lead' ? `<h4 class="cxh">Color del clan</h4><div class="clcols">${CL_COLS.map(k => `<button class="${c.c === k ? 'on' : ''}" data-clop="color" data-clcolset="${k}" style="background:${k}"></button>`).join('')}</div>` : ''}
    <div class="row gap" style="margin-top:10px"><button data-clop="leave">Salir del clan</button>${r === 'lead' ? '<button data-clop="disband">Disolver el clan</button>' : ''}</div>`;
} };
document.addEventListener('click', e => { const b = e.target.closest('[data-clop],[data-clcol]'); if (!b || !S) return;
  if (b.dataset.clcol) { CLV.c = b.dataset.clcol; advRender(); return; } const op = b.dataset.clop;
  if (op === 'create') { const n = $('clN') && $('clN').value, t = $('clT') && $('clT').value; clDo('create', { n, tag: t, c: CLV.c }); }
  else if (op === 'accept' || op === 'decline') clDo(op, { id: b.dataset.clid });
  else if (op === 'invite') clDo('invite', { key: b.dataset.clk, n: b.dataset.cln });
  else if (op === 'kick') clDo('kick', { key: b.dataset.clk }); else if (op === 'rank') clDo('rank', { key: b.dataset.clk, r: b.dataset.clr });
  else if (op === 'color') clDo('color', { c: b.dataset.clcolset });
  else if (op === 'leave' || op === 'disband') { const now = performance.now(); if (CLV.sure === op && now - CLV.sureT < 4000) { CLV.sure = null; clDo(op); } else { CLV.sure = op; CLV.sureT = now; b.textContent = op === 'leave' ? '¿Seguro? Pulsa otra vez' : '¿Disolverlo para todos? Pulsa otra vez'; } } // doble clic en vez de confirm(): dentro de claude.ai los diálogos pueden estar bloqueados
});

// =====================================================================================
//  Comercio entre jugadores
// =====================================================================================
const trSig = () => { const T0 = TRD.on; if (!T0) return ''; const f = o => JSON.stringify(Object.keys(o.items).sort().map(k => [k, o.items[k]])) + '|' + (o.coin | 0); return f(T0.mine) + '#' + f(T0.theirs); };
const trSigFor = (a, b) => { const f = o => JSON.stringify(Object.keys(o.items || {}).sort().map(k => [k, o.items[k]])) + '|' + (o.coin | 0); return f(a) + '#' + f(b); };
const trSend = d => { const o = TRD.on || TRD.req; if (!o) return; clEmit({ a: 'tr', to: o.peer, id: o.id, ...d }); };
function trAsk(o) { if (TRD.on) { toastErr('Ya estás comerciando'); return; } TRD.req = { peer: o.peer, nick: o.nick, id: 'tr' + Date.now().toString(36), mine: 1 }; clEmit({ a: 'tr', k: 'ask', to: o.peer, id: TRD.req.id, nick: myNick() }); toast(`🤝 Has pedido comerciar a ${o.nick}…`); }
cmd('comerciar', { a: ['trade', 'intercambiar'], u: '/comerciar <jugador>', d: 'Pide a un jugador cercano comerciar contigo.', run(a) { const n = normTxt(a.join(' ')), o = clPeers().find(p => normTxt(p.nick) === n || normTxt(p.nick).startsWith(n)); if (!o) return errMsg('No veo a ese jugador conectado'); if (Math.hypot((o.rx ?? o.pr.x) - S.player.x, (o.ry ?? o.pr.y) - S.player.y) > 8 * T) return errMsg('Acércate a él (8 casillas como mucho)'); trAsk(o); } });
function trRecv(d, from, me) {
  if (d.to !== me) return;
  if (d.k === 'ask') { if (TRD.on) { clEmit({ a: 'tr', k: 'busy', to: from, id: d.id }); return; } TRD.req = { peer: from, nick: String(d.nick || 'Jugador').slice(0, 20), id: d.id }; trAskUI(); return; }
  const T0 = TRD.on, R = TRD.req;
  if (d.k === 'busy' && R && R.id === d.id) { toastErr('Está ocupado comerciando con otro'); TRD.req = null; return; }
  if (d.k === 'no' && R && R.id === d.id) { toastErr(`${R.nick} no quiere comerciar ahora`); TRD.req = null; return; }
  if (d.k === 'yes' && R && R.id === d.id && R.mine) { trOpen(R); return; }
  if (!T0 || T0.id !== d.id) return;
  if (d.k === 'offer') { T0.theirs = { items: trClean(d.items), coin: Math.max(0, d.coin | 0) }; T0.myReady = T0.theirReady = T0.myConf = T0.theirConf = false; trRender(); }
  else if (d.k === 'ready') { T0.theirReady = !!d.v; if (!d.v) T0.myConf = T0.theirConf = false; trRender(); }
  else if (d.k === 'conf') { if (d.sig !== trSigFor(T0.theirs, T0.mine)) { trSend({ k: 'offer', items: T0.mine.items, coin: T0.mine.coin }); return; } T0.theirConf = true; trTry(); trRender(); }
  else if (d.k === 'cancel') { toastErr(`${T0.nick} ha cancelado el intercambio`); trClose(true); }
}
const trClean = it => { const o = {}; if (it && typeof it === 'object') for (const k in it) if (ITEMS[k] && it[k] > 0 && Object.keys(o).length < 8) o[k] = Math.min(9999, it[k] | 0); return o; };
function trAskUI() { const R = TRD.req; let e = $('trAsk'); if (!e) { e = document.createElement('div'); e.id = 'trAsk'; document.body.appendChild(e); }
  e.hidden = false; e.innerHTML = `<b>🤝 ${esc(R.nick)} quiere comerciar contigo</b><div class="row gap"><button class="pri" data-trk="yes">Aceptar</button><button data-trk="no">No</button></div>`; tone(660, 0.12, 'triangle', 0.05, 1.3);
  clearTimeout(e._t); e._t = setTimeout(() => { if (TRD.req === R && !TRD.on) { e.hidden = true; clEmit({ a: 'tr', k: 'no', to: R.peer, id: R.id }); TRD.req = null; } }, 20000); }
function trOpen(R) { TRD.on = { ...R, mine: { items: {}, coin: 0 }, theirs: { items: {}, coin: 0 }, myReady: false, theirReady: false, myConf: false, theirConf: false }; TRD.req = null; openModal('ptrade'); trRender(); }
function trClose(quiet) { if (TRD.on && !quiet) trSend({ k: 'cancel' }); TRD.on = null; if (ui.open === 'ptrade') closeModal(); }
function trChanged() { const T0 = TRD.on; T0.myReady = T0.theirReady = T0.myConf = T0.theirConf = false; trSend({ k: 'offer', items: T0.mine.items, coin: T0.mine.coin }); trRender(); }
// Solo se intercambia cuando los dos han confirmado lo mismo; cada uno comprueba que aún tiene lo suyo
function trTry() { const T0 = TRD.on; if (!T0 || !T0.myConf || !T0.theirConf) return;
  for (const k in T0.mine.items) if (invCount(k) < T0.mine.items[k]) { toastErr('Ya no tienes lo que ofrecías: intercambio cancelado'); trClose(); return; } if (invCount('coin') < T0.mine.coin) { toastErr('Te faltan monedas: intercambio cancelado'); trClose(); return; }
  for (const k in T0.mine.items) invTake(k, T0.mine.items[k]); if (T0.mine.coin) invTake('coin', T0.mine.coin);
  for (const k in T0.theirs.items) invGive(k, T0.theirs.items[k]); if (T0.theirs.coin) invGive('coin', T0.theirs.coin); invVersion++;
  toast(`🤝 Intercambio hecho con ${T0.nick}`, true); tone(880, 0.12, 'triangle', 0.05, 1.3); tone(1320, 0.2, 'triangle', 0.05, 1, 0.12); TRD.on = null; if (ui.open === 'ptrade') closeModal(); }
{ const m = document.createElement('div'); m.id = 'mPTrade'; m.className = 'modal'; m.hidden = true; m.innerHTML = '<div class="modal-in ptradem" id="ptBody"></div>'; document.body.appendChild(m); MODALS.ptrade = 'mPTrade'; }
{ const c0 = closeModal; closeModal = () => { const was = ui.open; c0(); if (was === 'ptrade' && TRD.on && ui.open !== 'ptrade') { trSend({ k: 'cancel' }); TRD.on = null; } if (was === 'stall') { if (ui.panel === STL.b) ui.panel = null; STL.b = null; } }; }
function trRender() {
  const T0 = TRD.on; if (!T0 || ui.open !== 'ptrade') return; const side = (o, mine) => `<div class="ptside ${mine ? 'me' : ''}"><div class="ptitems">${Object.keys(o.items).map(k => `<span class="ib" data-id="${k}" ${mine ? `data-trrm="${k}"` : ''}>${itemImg(k, 26)}<span class="q">${o.items[k]}</span></span>`).join('') || '<span class="mut small">Nada</span>'}</div><div class="ptcoin">${itemImg('coin', 16)} ${o.coin | 0}${mine ? ' <button data-trc="-10">−10</button><button data-trc="10">+10</button><button data-trc="100">+100</button>' : ''}</div></div>`;
  const inv = S.inv.map((s, i) => s && !T0.mine.items[s.id] ? `<span class="ib" data-id="${s.id}" data-tradd="${i}" title="Clic: ofrecer la pila · Shift+clic: solo 1">${itemImg(s.id, 24)}<span class="q">${s.n}</span></span>` : '').join('');
  const both = T0.myReady && T0.theirReady;
  $('ptBody').innerHTML = `<header><h2>🤝 Comercio con ${esc(T0.nick)}</h2><button data-trk="cancel">Cancelar</button></header>
    <div class="ptgrid"><div><h4 class="cxh">Tú das ${T0.myReady ? '<span class="ok">✓ Listo</span>' : ''}${T0.myConf ? ' <span class="ok">✓✓ Confirmado</span>' : ''}</h4>${side(T0.mine, 1)}</div><div><h4 class="cxh">${esc(T0.nick)} da ${T0.theirReady ? '<span class="ok">✓ Listo</span>' : ''}${T0.theirConf ? ' <span class="ok">✓✓ Confirmado</span>' : ''}</h4>${side(T0.theirs, 0)}</div></div>
    <p class="mut small">1) Pon lo que das (clic en tu inventario; clic en lo ofrecido para quitarlo). 2) Los dos pulsáis «Listo». 3) Los dos pulsáis «Confirmar». Si alguien cambia algo, se vuelve a empezar.</p>
    <div class="row gap"><button class="${T0.myReady ? 'on' : ''}" data-trk="ready">${T0.myReady ? 'Quitar «Listo»' : '✓ Listo'}</button><button class="pri" data-trk="conf" ${both && !T0.myConf ? '' : 'disabled'}>✓✓ Confirmar intercambio</button></div>
    <h4 class="cxh">Tu inventario</h4><div class="ptinv">${inv}</div>`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-trk],[data-tradd],[data-trrm],[data-trc]'); if (!b) return; const T0 = TRD.on, k = b.dataset.trk;
  if (k === 'yes' || k === 'no') { $('trAsk').hidden = true; const R = TRD.req; if (!R) return; clEmit({ a: 'tr', k, to: R.peer, id: R.id }); if (k === 'yes') trOpen(R); else TRD.req = null; return; }
  if (!T0) return;
  if (k === 'cancel') { trClose(); return; }
  if (k === 'ready') { if (!T0.myReady) { for (const id in T0.mine.items) if (invCount(id) < T0.mine.items[id]) { toastErr('Ya no tienes todo lo que ofreces'); return; } } T0.myReady = !T0.myReady; if (!T0.myReady) T0.myConf = T0.theirConf = false; trSend({ k: 'ready', v: T0.myReady }); trRender(); return; }
  if (k === 'conf') { if (!(T0.myReady && T0.theirReady)) return; T0.myConf = true; trSend({ k: 'conf', sig: trSig() }); trTry(); trRender(); return; }
  if (b.dataset.tradd !== undefined) { const s = S.inv[+b.dataset.tradd]; if (!s || Object.keys(T0.mine.items).length >= 8) return; T0.mine.items[s.id] = e.shiftKey ? 1 : invCount(s.id); trChanged(); return; }
  if (b.dataset.trrm) { delete T0.mine.items[b.dataset.trrm]; trChanged(); return; }
  if (b.dataset.trc) { T0.mine.coin = clamp((T0.mine.coin | 0) + +b.dataset.trc, 0, invCount('coin')); trChanged(); }
});
// Si se aleja demasiado o se va, se cancela
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); const T0 = TRD.on; if (!S || !T0) return; const o = NET.peers && NET.peers.get(T0.peer); if (!o || Math.hypot((o.rx ?? o.pr.x) - S.player.x, (o.ry ?? o.pr.y) - S.player.y) > 12 * T) { toastErr('El intercambio se cancela: estáis demasiado lejos'); trClose(); } }; }

// =====================================================================================
//  Puesto de venta
// =====================================================================================
const STL = { b: null };
{ const m = document.createElement('div'); m.id = 'mStall'; m.className = 'modal'; m.hidden = true; m.innerHTML = '<div class="modal-in stallm" id="stBody"></div>'; document.body.appendChild(m); MODALS.stall = 'mStall'; }
function stOpen(b) { if (!b.sale) b.sale = []; openModal('stall'); STL.b = b; ui.panel = b; stRender(); } // ui.panel: así su estado se reparte a los demás
function stRender() { const b = STL.b; if (!b || ui.open !== 'stall') return; const own = !b.own || b.own === clKey(), sale = b.sale || [];
  const rows = sale.map((o, i) => `<div class="stc">${itemImg(o.id, 26)}<div><b>${o.n} × ${esc(ITEMS[o.id] ? ITEMS[o.id].n : o.id)}</b><small>${itemImg('coin', 12)} ${o.p}</small></div>${own ? `<button data-stx="${i}">Retirar</button>` : `<button class="pri" data-stb="${i}" ${invCount('coin') >= o.p ? '' : 'disabled'}>Comprar</button>`}</div>`).join('');
  const held = S.inv[S.sel];
  $('stBody').innerHTML = `<header><h2>⚖ Puesto de ${esc(b.ownN || 'nadie')}</h2><button data-close>Cerrar <kbd>Esc</kbd></button></header>
    ${rows ? `<div class="stlist">${rows}</div>` : '<p class="mut">No hay nada a la venta.</p>'}
    ${own ? `<div class="stown"><p class="mut small">Para vender: lleva el objeto en la mano (barra rápida) y ponle precio. Las monedas de lo que vendas se guardan aquí.</p>
      <div class="row gap">${held ? `<span>${itemImg(held.id, 20)} ${held.n} × ${esc(ITEMS[held.id].n)}</span><input id="stP" type="number" min="1" max="99999" value="10" style="width:90px"><button class="pri" data-sta="1">Poner a la venta</button>` : '<span class="mut">No llevas nada en la mano</span>'}</div>
      <div class="row gap" style="margin-top:8px"><span>Ganado: ${itemImg('coin', 14)} <b>${b.cash | 0}</b></span><button data-stcash="1" ${b.cash > 0 ? '' : 'disabled'}>Recoger</button></div></div>` : `<p class="mut small">Tienes ${invCount('coin')} monedas.</p>`}`;
}
const stSync = b => { if (inGame()) { const o = serB(b); if (o) netEmit('bset', { o }); } };
document.addEventListener('click', e => { const t = e.target.closest('[data-sta],[data-stx],[data-stb],[data-stcash]'); const b = STL.b; if (!t || !b || !blocks.includes(b)) return; const own = !b.own || b.own === clKey(); b.sale = b.sale || [];
  if (t.dataset.sta && own) { const s = S.inv[S.sel], p = clamp(parseInt($('stP').value) || 1, 1, 99999); if (!s) return; if (b.sale.length >= 8) { toastErr('Como mucho 8 cosas a la venta'); return; } b.sale.push({ id: s.id, n: s.n, p }); S.inv[S.sel] = null; invVersion++; toast(`A la venta: ${s.n} × ${ITEMS[s.id].n} por ${p} monedas`); }
  else if (t.dataset.stx !== undefined && own) { const o = b.sale.splice(+t.dataset.stx, 1)[0]; if (o) invGive(o.id, o.n); }
  else if (t.dataset.stcash && own) { invGive('coin', b.cash | 0); b.cash = 0; }
  else if (t.dataset.stb !== undefined && !own) { const i = +t.dataset.stb, o = b.sale[i]; if (!o) return; if (invCount('coin') < o.p) { toastErr('Te faltan monedas'); return; } invTake('coin', o.p); b.cash = (b.cash | 0) + o.p; b.sale.splice(i, 1); invGive(o.id, o.n); toast(`🛍 Has comprado ${o.n} × ${ITEMS[o.id].n}`); sfx('beep'); }
  invVersion++; stSync(b); stRender(); });
// ---------- Etiqueta del clan sobre el nombre (multijugador) ----------
function clTagOf(by) { const c = clOf(by); return c ? { t: c.tag, c: c.c } : null; }
