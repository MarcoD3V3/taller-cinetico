'use strict';
// =====================================================================================
//  Chat (Intro para escribir, / para comandos). Funciona en solitario y en multijugador:
//  net.js engancha el envío (chatSend) y añade sus propios comandos a CMDS.
//  Comandos de trucos (modo creativo, dar objetos, hora, clima…): siempre en solitario;
//  en una partida compartida, solo el anfitrión o si el anfitrión los permite.
// =====================================================================================
const CHAT = { open: false, log: [], hist: [], hi: -1, unread: 0 };
const chatEl = document.createElement('div'); chatEl.id = 'chat';
chatEl.innerHTML = `<div id="chatLog" role="log" aria-live="polite"></div><div id="chatBar" hidden><span id="chatNet"></span><input id="chatIn" maxlength="240" autocomplete="off" spellcheck="false" placeholder="Escribe… (/ayuda para ver los comandos)"><div id="chatSug"></div></div>`;
document.body.appendChild(chatEl);
const cIn = $('chatIn'), cLog = $('chatLog');
const normTxt = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
// kind: say · me · w (susurro) · sys · err · ok · cmd
function chatPush(kind, text, from) {
  const m = { kind, text: String(text).slice(0, 500), from: from || null, t: performance.now() };
  CHAT.log.push(m); if (CHAT.log.length > 120) CHAT.log.shift();
  if (!CHAT.open && kind !== 'cmd') CHAT.unread++;
  chatRender(); return m;
}
const sysMsg = t => chatPush('sys', t), errMsg = t => chatPush('err', t), okMsg = t => chatPush('ok', t);
function chatRender() {
  cLog.textContent = '';
  const now = performance.now(), list = CHAT.open ? CHAT.log.slice(-60) : CHAT.log.slice(-8).filter(m => now - m.t < OPT.chatFade * 1000);
  for (const m of list) {
    const d = document.createElement('div'); d.className = 'cm ' + m.kind;
    if (!CHAT.open) d.style.opacity = String(Math.min(1, (OPT.chatFade * 1000 - (now - m.t)) / 2000));
    if (m.from) { const n = document.createElement('b'); n.textContent = m.kind === 'me' ? '* ' + m.from.nick + ' ' : m.kind === 'w' ? (m.from.toMe ? `${m.from.nick} te susurra: ` : `Susurras a ${m.from.to}: `) : m.from.nick + ': '; n.style.color = m.from.c || '#ffe08a'; d.appendChild(n); }
    d.appendChild(document.createTextNode(m.text)); cLog.appendChild(d);
  }
  cLog.scrollTop = cLog.scrollHeight; chatEl.classList.toggle('open', CHAT.open);
}
setInterval(() => { if (!CHAT.open && CHAT.log.length) chatRender(); }, 1000);
function chatOpen(pre) {
  if (!S || ui.open) return; CHAT.open = true; CHAT.unread = 0; keys.clear(); mouse.down = mouse.rdown = false;
  $('chatBar').hidden = false; cIn.value = pre || ''; chatRender(); chatSug(); setTimeout(() => cIn.focus(), 0);
}
function chatClose() { CHAT.open = false; $('chatBar').hidden = true; cIn.blur(); $('chatSug').textContent = ''; chatRender(); }
// Lo que se hace con un mensaje normal (net.js lo cambia para enviarlo a los demás)
let chatSend = text => chatPush('say', text, { nick: myNick(), c: '#ffe08a' });
const myNick = () => { if (typeof pfName === 'function' && pfName()) return pfName(); if (S && S.nick) return S.nick; const acc = typeof NET !== 'undefined' && NET.me && NET.me.name && NET.kind === 'claude' ? NET.me.name.split(' ')[0] : ''; if (acc) return acc; if (S) return (S.char && S.char.name && S.char.name !== 'Superviviente' ? S.char.name : '') || (typeof NET !== 'undefined' && NET.me.name) || 'Jugador'; try { const p = JSON.parse(localStorage.getItem('tc-profile')); return (p && (p.nick || p.char && p.char.name)) || 'Jugador'; } catch (e) { return 'Jugador'; } };
function chatSubmit() {
  const t = cIn.value.trim(); if (!t) { chatClose(); return; }
  CHAT.hist.unshift(t); if (CHAT.hist.length > 40) CHAT.hist.pop(); CHAT.hi = -1;
  if (t[0] === '/') runCmd(t.slice(1)); else chatSend(t);
  chatClose();
}
// ---------- Comandos ----------
// CMDS[nombre] = { a: alias, u: uso, d: qué hace, cheat: es truco, run(args, raw) }
const CMDS = {};
const cmd = (n, o) => { CMDS[n] = o; for (const a of o.a || []) CMDS[a] = { ...o, alias: n }; };
// net.js lo sustituye: ¿puede este jugador usar trucos ahora?
let cheatsOK = () => true, cheatUsed = (n, raw) => { };
function runCmd(raw) {
  chatPush('cmd', '/' + raw);
  const parts = raw.match(/"[^"]*"|\S+/g) || [], name = normTxt(parts.shift() || ''), args = parts.map(p => p.replace(/^"|"$/g, ''));
  const c = CMDS[name]; if (!c) { errMsg(`No existe el comando /${name}. Escribe /ayuda.`); return; }
  if (c.cheat && !cheatsOK()) { errMsg('En esta partida los trucos están desactivados (solo el anfitrión puede activarlos).'); return; }
  try { const r = c.run(args, raw); if (r && r.kind === 'err') return; if (typeof r === 'string') okMsg(r); if (c.cheat) cheatUsed(c.alias || name, raw); } catch (e) { errMsg('Error: ' + e.message); }
}
// Buscar un objeto por id o por nombre (sin tildes; acepta trozos)
function findItem(q) {
  const n = normTxt(q); if (!n) return null; if (ITEMS[q]) return q;
  let best = null, bs = 0;
  for (const id in ITEMS) { const nm = normTxt(ITEMS[id].n), il = id.toLowerCase(); let s = 0;
    if (nm === n || il === n) s = 100; else if (nm.startsWith(n) || il.startsWith(n)) s = 60 - nm.length / 10; else if (nm.includes(n) || il.includes(n)) s = 30 - nm.length / 10;
    if (s > bs) { bs = s; best = id; } }
  return best;
}
const itemMatches = (q, lim = 8) => { const n = normTxt(q); return Object.keys(ITEMS).filter(id => normTxt(ITEMS[id].n).includes(n) || id.toLowerCase().includes(n)).slice(0, lim); };
const cursorTile = () => ({ x: mouse.tx, y: mouse.ty });
const num = (v, def) => { const n = parseFloat(v); return isFinite(n) ? n : def; };
const coord = (v, base) => v === undefined ? base : v[0] === '~' ? base + num(v.slice(1), 0) : Math.floor(num(v, base));
cmd('ayuda', { a: ['help', '?'], u: '/ayuda [comando]', d: 'Lista los comandos o explica uno.', run(a) {
  if (a[0]) { const c = CMDS[normTxt(a[0])]; if (!c) return errMsg('No conozco /' + a[0]); return `${c.u} — ${c.d}${c.a && c.a.length ? ' (también: ' + c.a.map(x => '/' + x).join(', ') + ')' : ''}${c.cheat ? ' · truco' : ''}`; }
  const seen = new Set(), rows = []; for (const k in CMDS) { const c = CMDS[k]; if (c.alias || seen.has(k)) continue; seen.add(k); rows.push((c.cheat ? '✦ ' : '') + c.u); }
  sysMsg('Comandos (✦ = truco): ' + rows.join(' · ')); sysMsg('Consejo: Tab completa, ↑ repite. Coordenadas con ~ son relativas a ti (/tp ~5 ~0).');
} });
cmd('modo', { a: ['gamemode', 'gm'], u: '/modo creativo|supervivencia', d: 'Creativo: no gastas objetos, no recibes daño, rompes al instante y sin hambre ni sed.', cheat: 1, run(a) {
  const m = normTxt(a[0] || ''); if (/^(c|creativo|creative|1)$/.test(m)) { S.sandbox = true; S.creative = true; vitalsDirty = true; return '✦ Modo creativo: sin gasto, sin daño y rotura instantánea.'; }
  if (/^(s|supervivencia|survival|0)$/.test(m)) { S.sandbox = false; S.creative = false; vitalsDirty = true; return 'Modo supervivencia.'; }
  return errMsg('Usa /modo creativo o /modo supervivencia');
} });
cmd('dar', { a: ['give', 'i'], u: '/dar <objeto> [cantidad]', d: 'Te da un objeto (por id o por nombre).', cheat: 1, run(a) {
  if (!a[0]) return errMsg('¿Qué objeto? Ej.: /dar lingote de hierro 64');
  let n = 1; if (a.length > 1 && /^\d+$/.test(a[a.length - 1])) n = Math.min(9999, +a.pop());
  const id = findItem(a.join(' ')); if (!id) return errMsg('No encuentro «' + a.join(' ') + '». Prueba /buscar.');
  const left = invAdd(id, n); invVersion++; return `Recibes ${n - left} × ${ITEMS[id].n}${left ? ` (no cabían ${left})` : ''}.`;
} });
cmd('buscar', { a: ['search', 'find'], u: '/buscar <texto>', d: 'Busca objetos por nombre y te dice su id.', run(a) {
  const r = itemMatches(a.join(' '), 12); if (!r.length) return errMsg('Nada encontrado.'); sysMsg(r.map(id => `${ITEMS[id].n} (${id})`).join(' · '));
} });
cmd('tp', { a: ['ir', 'teleport'], u: '/tp <x> <y>', d: 'Te teletransporta a una casilla (~ = relativo).', cheat: 1, run(a) {
  const p = S.player, tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
  if (a.length < 2) return errMsg('Usa /tp x y  (ahora estás en ' + tx + ' ' + ty + ')');
  const x = coord(a[0], tx), y = coord(a[1], ty); p.x = (x + 0.5) * T; p.y = (y + 0.5) * T; view.x = p.x; view.y = p.y; return `Teletransportado a ${x}, ${y}.`;
} });
cmd('pos', { a: ['donde', 'coords'], u: '/pos', d: 'Tus coordenadas y las del cursor.', run() { const p = S.player; return `Estás en ${Math.floor(p.x / T)}, ${Math.floor(p.y / T)} · cursor en ${mouse.tx}, ${mouse.ty}`; } });
cmd('hora', { a: ['time'], u: '/hora <0-24|dia|noche|amanecer|atardecer>', d: 'Cambia la hora del día.', cheat: 1, run(a) {
  const m = normTxt(a[0] || ''), H = { dia: 12, day: 12, mediodia: 12, noche: 0, night: 0, medianoche: 0, amanecer: 6, atardecer: 18 };
  const h = H[m] ?? num(m, NaN); if (!isFinite(h)) return errMsg('Usa /hora 8, /hora dia, /hora noche…');
  setHour(h); return `Son las ${String(Math.floor(h) % 24).padStart(2, '0')}:00.`;
} });
function setHour(h) { const dl = S.gen.dayLen || DAY_LEN, day = Math.floor(S.time / dl); S.time = day * dl + ((h % 24 + 24) % 24) / 24 * dl; if (S.time < 0) S.time += dl; }
cmd('dia', { a: ['day'], u: '/dia', d: 'Pone el mediodía.', cheat: 1, run() { setHour(12); return 'Mediodía.'; } });
cmd('noche', { a: ['night'], u: '/noche', d: 'Pone la medianoche.', cheat: 1, run() { setHour(0); return 'Medianoche.'; } });
cmd('clima', { a: ['weather', 'tiempo'], u: '/clima <tipo>', d: 'Cambia el tiempo: ' + Object.keys(WX_T).join(', ') + '.', cheat: 1, run(a) {
  const q = normTxt(a[0] || ''), k = Object.keys(WX_T).find(k => k === q || normTxt(WX_T[k].n) === q || normTxt(WX_T[k].n).startsWith(q));
  if (!q || !k) return errMsg('Tipos: ' + Object.keys(WX_T).map(k => `${k} (${WX_T[k].n})`).join(', '));
  WX.prev = WX.type; WX.type = k; WX.int = 0; WX.t = 300; return `${WX_T[k].i} ${WX_T[k].n} durante unos minutos.`;
} });
cmd('curar', { a: ['heal'], u: '/curar', d: 'Vida, heridas y enfermedades fuera.', cheat: 1, run() {
  const pc = pcInit(); pc.hp = maxHp(); pc.poison = 0; pc.temp = 37; for (const k in pc.parts) pc.parts[k] = []; if (pc.ills) pc.ills = {}; vitalsDirty = true; return '❤ Curado del todo.';
} });
cmd('comer', { a: ['feed', 'saciar'], u: '/comer', d: 'Hambre, sed y energía al máximo.', cheat: 1, run() { const pc = pcInit(); pc.food = pc.water = pc.energy = 100; pc.stam = maxStam(); vitalsDirty = true; return 'Saciado y descansado.'; } });
cmd('limpiar', { a: ['clear', 'vaciar'], u: '/limpiar', d: 'Vacía tu inventario (no el equipo).', cheat: 1, run() { for (let i = 0; i < S.inv.length; i++) S.inv[i] = null; invVersion++; return 'Inventario vacío.'; } });
cmd('velocidad', { a: ['speed'], u: '/velocidad <0.5-4>', d: 'Multiplica tu velocidad al andar.', cheat: 1, run(a) { S.spdCheat = clamp(num(a[0], 1), 0.5, 4); return 'Velocidad ×' + S.spdCheat; } });
cmd('invocar', { a: ['summon', 'spawn'], u: '/invocar <enemigo|animal> [n]', d: 'Hace aparecer criaturas en el cursor.', cheat: 1, run(a) {
  let n = 1; if (a.length > 1 && /^\d+$/.test(a[a.length - 1])) n = Math.min(20, +a.pop());
  const q = normTxt(a.join(' ')), pick = o => Object.keys(o).find(k => normTxt(k) === q || normTxt(o[k].n || '') === q) || Object.keys(o).find(k => normTxt(k).startsWith(q) || normTxt(o[k].n || '').startsWith(q));
  const mw = mouseWorld(), e = q && (pick(ENEMIES) || pick(BOSSES)), s = !e && q && pick(SPECIES);
  if (!e && !s) return errMsg('Enemigos: ' + Object.keys(ENEMIES).slice(0, 14).join(', ') + '… · Animales: ' + Object.keys(SPECIES).join(', '));
  for (let i = 0; i < n; i++) { const x = mw.x + (Math.random() - 0.5) * 40, y = mw.y + (Math.random() - 0.5) * 40;
    if (e) spawnFoe(e, x, y); else { const tx = Math.floor(x / T), ty = Math.floor(y / T), c = getChunk(tx >> CSH, ty >> CSH); ANIMALS.push({ sp: s, x, y, tx: 0, ty: 0, t: 0, face: 1, ph: Math.random() * 6, ck: ckey(c.cx, c.cy), cx: c.cx, cy: c.cy }); } }
  return `${n} × ${(e ? (ENEMIES[e] || BOSSES[e]).n : SPECIES[s].n) || e || s}.`;
} });
cmd('matar', { a: ['kill', 'killall'], u: '/matar enemigos|animales|yo', d: 'Elimina enemigos o animales cercanos, o a ti mismo.', cheat: 1, run(a) {
  const m = normTxt(a[0] || 'enemigos'), p = S.player, near = o => Math.hypot(o.x - p.x, o.y - p.y) < 40 * T;
  if (m.startsWith('ani')) { const n = ANIMALS.length; ANIMALS = ANIMALS.filter(o => !near(o)); return `${n - ANIMALS.length} animales fuera.`; }
  if (m === 'yo' || m === 'me') { pcInit().hp = 0; return 'Adiós…'; }
  const n = FOES.length; FOES = FOES.filter(o => !near(o) || o.boss && m !== 'todo'); return `${n - FOES.length} enemigos fuera.`;
} });
// Colocar sin gastar: comprueba que el sitio vale y respeta lo que ya hay
function cmdPlace(type, x, y, dir) { const o = at(x, y); if (o) { if (o.type === 'core') return false; delBlock(o); } if (type === 'aire') return true; const err = canPlace(type, x, y); if (err && err !== 'Casilla ocupada') return false; const b = makeB(type, x, y, dir || 0); addBlock(b); return true; }
const findBlock = q => { const n = normTxt(q); if (n === 'aire' || n === 'air' || n === 'nada') return 'aire'; if (BD[q]) return q; const id = Object.keys(BD).find(k => normTxt(BD[k].n) === n) || Object.keys(BD).find(k => normTxt(BD[k].n).startsWith(n) || k.toLowerCase().startsWith(n)); return id || null; };
cmd('bloque', { a: ['setblock'], u: '/bloque <tipo> [x y]', d: 'Pone un bloque (en el cursor si no das coordenadas). «aire» lo quita.', cheat: 1, run(a) {
  const c = cursorTile(); let x = c.x, y = c.y; if (a.length >= 3 && /^[~\-\d]/.test(a[a.length - 2])) { y = coord(a.pop(), c.y); x = coord(a.pop(), c.x); }
  const t = findBlock(a.join(' ')); if (!t) return errMsg('No conozco ese bloque.');
  return cmdPlace(t, x, y, ui.dir) ? (t === 'aire' ? 'Quitado.' : BD[t].n + ' colocado.') : errMsg('Ahí no se puede.');
} });
cmd('rellenar', { a: ['fill'], u: '/rellenar <x1> <y1> <x2> <y2> <tipo>', d: 'Rellena un rectángulo (máx. 2000 casillas). «aire» lo vacía.', cheat: 1, run(a) {
  if (a.length < 5) return errMsg('Usa /rellenar x1 y1 x2 y2 tipo');
  const p = S.player, tx = Math.floor(p.x / T), ty = Math.floor(p.y / T), [x1, y1, x2, y2] = [coord(a[0], tx), coord(a[1], ty), coord(a[2], tx), coord(a[3], ty)];
  const t = findBlock(a.slice(4).join(' ')); if (!t) return errMsg('No conozco ese bloque.');
  const w = Math.abs(x2 - x1) + 1, h = Math.abs(y2 - y1) + 1; if (w * h > 2000) return errMsg(`Son ${w * h} casillas; el máximo es 2000.`);
  let ok = 0; for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) if (cmdPlace(t, x, y, ui.dir)) ok++;
  return `${ok} casillas cambiadas.`;
} });
cmd('semilla', { a: ['seed'], u: '/semilla', d: 'La semilla de este mundo.', run() { return 'Semilla: ' + S.gen.seed; } });
cmd('guardar', { a: ['save'], u: '/guardar', d: 'Guarda la partida.', run() { return saveGame() ? 'Guardado.' : errMsg('No se pudo guardar.'); } });
cmd('borrar', { a: ['cls'], u: '/borrar', d: 'Limpia el chat.', run() { CHAT.log.length = 0; chatRender(); } });
cmd('nick', { a: ['nombre', 'name'], u: '/nick <nombre>', d: 'Tu nombre en el chat y sobre tu cabeza.', run(a) { const n = a.join(' ').trim().slice(0, 20); if (!n) return 'Te llamas ' + myNick(); S.nick = n; return 'Ahora te llamas ' + n + '.'; } });
cmd('yo', { a: ['me'], u: '/yo <acción>', d: 'Narra lo que haces («* Ana saluda»).', run(a, raw) { chatSendMe(a.join(' ')); } });
let chatSendMe = t => chatPush('me', t, { nick: myNick(), c: '#ffe08a' });
// ---------- Efectos del modo creativo ----------
{ const t0 = invTake; invTake = (id, n) => S && S.creative ? n : t0(id, n); }
{ const h0 = hurt; hurt = (t, part, mult, cause) => { if (S && S.creative) return; h0(t, part, mult, cause); }; }
{ const s0 = speedMul; speedMul = () => s0() * ((S && S.spdCheat) || 1) * (S && S.creative ? 1.3 : 1); }
// ---------- Sugerencias mientras escribes ----------
function chatSug() {
  const v = cIn.value, box = $('chatSug'); box.textContent = ''; if (v[0] !== '/') return;
  const parts = v.slice(1).split(' '), n = normTxt(parts[0]);
  if (parts.length === 1) { const seen = new Set(); for (const k in CMDS) { const c = CMDS[k]; const base = c.alias || k; if (seen.has(base) || !k.startsWith(n)) continue; seen.add(base); const d = document.createElement('div'); d.innerHTML = `<b></b> <span></span>`; d.firstChild.textContent = CMDS[base].u; d.lastChild.textContent = CMDS[base].d; d.dataset.fill = '/' + k + ' '; box.appendChild(d); if (box.children.length >= 6) break; } return; }
  const c = CMDS[n]; if (!c) return;
  const q = parts.slice(1).join(' ');
  if ((c.alias || n) === 'dar' && q.length >= 2) for (const id of itemMatches(q.replace(/\s\d+$/, ''), 6)) { const d = document.createElement('div'); d.textContent = ITEMS[id].n + ' (' + id + ')'; d.dataset.fill = '/' + parts[0] + ' ' + id + ' '; box.appendChild(d); }
  else { const d = document.createElement('div'); d.className = 'mut'; d.textContent = c.u + ' — ' + c.d; box.appendChild(d); }
}
$('chatSug').addEventListener('mousedown', e => { const d = e.target.closest('[data-fill]'); if (!d) return; e.preventDefault(); cIn.value = d.dataset.fill; chatSug(); cIn.focus(); });
cIn.addEventListener('input', chatSug);
// ---------- Teclado (en captura: el juego no ve lo que escribes) ----------
addEventListener('keydown', e => {
  if (CHAT.open) {
    if (e.target !== cIn) return;
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); chatSubmit(); }
    else if (e.key === 'Escape') { e.preventDefault(); chatClose(); }
    else if (e.key === 'Tab') { e.preventDefault(); const f = $('chatSug').querySelector('[data-fill]'); if (f) { cIn.value = f.dataset.fill; chatSug(); } }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); CHAT.hi = clamp(CHAT.hi + (e.key === 'ArrowUp' ? 1 : -1), -1, CHAT.hist.length - 1); cIn.value = CHAT.hi < 0 ? '' : CHAT.hist[CHAT.hi]; chatSug(); }
    return;
  }
  if (!S || ui.open || e.ctrlKey || e.metaKey || e.altKey) return;
  const tg = e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
  if (e.key === 'Enter' || e.key === '/') { e.preventDefault(); e.stopPropagation(); chatOpen(e.key === '/' ? '/' : ''); }
}, true);
// El cursor del juego no atraviesa el chat abierto
chatEl.addEventListener('mousedown', e => { if (CHAT.open) e.stopPropagation(); });
// Botón en la barra
{ HUD_IC.bChat = ['M4 5h16v11H9l-5 4V5z M8 9h8 M8 12h5', 'Chat', 'Intro']; const b = document.createElement('button'); b.id = 'bChat'; b.onclick = () => CHAT.open ? chatClose() : chatOpen(''); $('topbar').insertBefore(b, $('bHelp')); }
sysMsg('Pulsa Intro para hablar o / para usar comandos (/ayuda).');
