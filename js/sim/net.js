'use strict';
// =====================================================================================
//  Multijugador. Dos formas de conectarse, con el mismo juego encima:
//   · Dentro de claude.ai: salas de claude.ai (capacidades `room` y `user`).
//   · Fuera (jugar.bat, tu red local o tu propia web): servidor.js por WebSocket (wsroom.js),
//     con Discord verificado, contraseña, máximo de jugadores y vetos que hace cumplir el servidor.
//  Como en Minecraft: el anfitrión «abre su mundo» desde el menú de pausa sin cambiarlo; los
//  demás entran desde Multijugador en el menú principal. Cada invitado tiene en ese mundo su
//  propio inventario, salud y posición, que el anfitrión guarda para la próxima vez.
// =====================================================================================
const NET = { kind: null, room: null, user: null, me: { id: null, name: '', avatar: '', color: '#ffe08a', verified: false }, game: null, peers: new Map(), lobby: [], netIn: 0, tq: new Set(), sent: new WeakMap(), status: 'Sin conectar', lan: [], port: 0 };
// Lo que es de cada jugador (no viaja con el mundo del anfitrión)
const PERSONAL = new Set(['inv', 'sel', 'player', 'autoSort', 'marks', 'char', 'equip', 'pc', 'nick', 'spdCheat', 'creative', 'sandbox', 'mute', 'goalFold', 'fog', 'buffs', 'lore', 'pet', 'pets', 'mount', 'seenRec', 'tips', 'cds', 'quick', 'hk']);
const PDAT_KEYS = ['inv', 'sel', 'player', 'equip', 'pc', 'buffs', 'creative', 'sandbox'];
const WORLD_SKIP = new Set(['mpPlayers', 'mpOpt']);
const NET_SKIP = new Set([...SKIP, 'syn', 'synM', 'wst', 'mo', 'st']);
const GAME_MODES = { survival: 'Supervivencia', creative: 'Creativo', adventure: 'Aventura (solo mirar y luchar)' };
function serB(b) { const o = {}; for (const k in b) if (!NET_SKIP.has(k) && k[0] !== '_') o[k] = b[k]; let s = JSON.stringify(o); if (s.length > 3300) { delete o.slots; delete o.log2; delete o.note; s = JSON.stringify(o); } return s.length > 3300 ? null : o; }
const netGuard = f => { NET.netIn++; try { f(); } finally { NET.netIn--; } };
const inGame = () => !!(NET.game && NET.game.r);
const isGuest = () => inGame() && !NET.game.host;
const perm = k => !isGuest() || !!(NET.game.perm || {})[k];
async function netEmit(topic, data) { const r = NET.game && NET.game.r; if (!r || NET.netIn) return; try { await r.emit(topic, data); } catch (e) { } }
const netRefreshUI = () => { if (typeof menuNetChanged === 'function') menuNetChanged(); };
const safeCol = c => /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#cfd8e0';
const colorOf = id => { let h = 0; for (const ch of String(id || 'x')) h = (h * 31 + ch.charCodeAt(0)) | 0; return `hsl(${Math.abs(h) % 360} 70% 66%)`; };
const myColor = () => NET.me.color || '#ffe08a';
// ---------- Conexión ----------
const inClaude = () => { if (!(window.claude && claude.use)) return false; try { return window.top !== window || !!window.__claudeTest; } catch (e) { return true; } };
const savedServer = () => { try { return localStorage.getItem('tc-server') || ''; } catch (e) { return ''; } };
const defaultServer = () => savedServer() || (/^https?:$/.test(location.protocol) ? (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws' : '');
async function netInit() {
  if (inClaude()) {
    const [room, user] = await Promise.all([claude.use('room'), claude.use('user')]);
    if (room) { NET.kind = 'claude'; NET.room = room; NET.user = user; NET.server = 'claude.ai';
      if (user) { const m = await user.me(); NET.me = { id: m.id, name: m.name, avatar: m.avatarUrl, color: m.color, verified: !!m.id }; if (S && !S.nick && m.name) S.nick = m.name.split(' ')[0]; }
      room.onConnection(c => { NET.status = c ? 'Conectado a las salas de claude.ai' : 'Reconectando…'; netRefreshUI(); }, e => { NET.status = 'Sin conexión: ' + e.code; netRefreshUI(); });
      room.onPeers(ch => { NET.lobby = ch.peers.filter(p => !p.sameTab && p.presence && p.presence.g).map(p => ({ code: p.presence.g, name: p.presence.w, host: p.presence.nick, n: p.presence.n, max: p.presence.max, lock: !!p.presence.lock, mode: p.presence.mode, cheats: !!p.presence.tr })); netRefreshUI(); });
      wireLobby(room); lobbyPresence(); return; }
  }
  const url = defaultServer(); if (url) await netConnectWs(url); else { NET.status = 'Sin servidor: abre el juego con jugar.bat para jugar en red'; netRefreshUI(); }
}
async function netConnectWs(url) {
  if (inGame()) return errMsg('Sal de la partida antes de cambiar de servidor.');
  if (NET.kind === 'ws' && NET.room) NET.room.close();
  NET.kind = null; NET.room = null; NET.status = 'Conectando con ' + url + '…'; netRefreshUI();
  try {
    const r = await wsConnect(url, { nick: myNick(), gid: guestId(), sess: typeof dcSess === 'function' ? dcSess() : null, token: typeof dcToken === 'function' && !(typeof dcSess === 'function' && dcSess()) ? dcToken() : null });
    NET.kind = 'ws'; NET.room = r; NET.server = url; NET.lan = r.me.lan || []; NET.port = r.me.port;
    NET.me = { id: r.me.by, name: r.me.name, avatar: r.me.avatar, color: colorOf(r.me.by), verified: r.me.verified };
    if (r.me.tokenBad && typeof dcTokSet === 'function') { dcTokSet(null); DC.err = 'Tu sesión de Discord caducó: vuelve a iniciarla.'; }
    if (r.me.sessBad && typeof dcSessSet === 'function') { dcSessSet(null); DC.err = 'Tu sesión caducó: vuelve a iniciar sesión con Discord.'; }
    NET.public = r.me.public || null; if (DC.ok && r.me.verified) { DC.ok = 0; okMsg('Sesión iniciada con Discord: ' + r.me.name); }
    NET.status = r.me.verified ? 'Conectado con Discord (' + r.me.name + ')' : 'Conectado como invitado'; wireLobby(r);
    r.onConnection(c => { if (!c) { NET.status = 'Se perdió la conexión con el servidor'; if (inGame()) { errMsg('Se perdió la conexión con el servidor.'); netLeave(true); } NET.room = null; NET.kind = null; netRefreshUI(); } });
  } catch (e) { NET.status = e.message || 'No hay servidor'; }
  netRefreshUI();
}
const netReconnect = () => { if (!inClaude() && !inGame()) netConnectWs(NET.server && NET.server !== 'claude.ai' ? NET.server : defaultServer()); };
function wireLobby(r) { r.on('chat', m => { if (m.sameTab || inGame()) return; const d = m.data || {}; chatPush(d.me ? 'me' : 'say', String(d.m || '').slice(0, 240), { nick: '[Sala] ' + String((m.verified && m.name) || d.nick || 'Alguien').slice(0, 20), c: safeCol(d.c) }); }); }
function lobbyPresence() {
  if (NET.kind !== 'claude' || !NET.room) return; const g = NET.game, o = g && g.host ? g.opt : null;
  NET.room.presence({ nick: myNick(), g: o ? g.code : null, w: o ? o.name : null, n: g ? NET.peers.size + 1 : 0, max: o ? o.max : null, lock: o ? !!o.pass : null, mode: o ? o.mode : null, tr: o ? !!o.cheats : null }).catch(() => { });
}
async function netGames() { if (NET.kind === 'ws' && NET.room) { try { NET.lobby = (await NET.room.list()).map(x => ({ ...x, code: x.room.replace(/^tc-/, '') })); } catch (e) { } } return NET.lobby; }
// ---------- Abrir tu mundo (anfitrión) ----------
const newCode = () => Array.from({ length: 5 }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.random() * 31 | 0]).join('');
const defaultOpt = () => ({ name: (S && S.name) || 'Mi mundo', pass: '', max: 8, mode: 'survival', build: true, containers: true, cheats: false, requireDc: false, ...(S && S.mpOpt || {}) });
async function netHost(opt) {
  if (!S || !currentWorld) return errMsg('Abre primero un mundo.');
  if (!NET.room) return errMsg(NET.status);
  if (inGame()) return errMsg('Tu mundo ya está abierto (código ' + NET.game.code.toUpperCase() + ').');
  opt = { ...defaultOpt(), ...(opt || {}) }; if (opt.mode === 'adventure') opt.build = opt.containers = false;
  S.mpOpt = { ...opt, pass: '' }; S.mpPlayers = S.mpPlayers || {};
  const code = newCode(), name = 'tc-' + code; NET.game = { code, host: true, opt, perm: opt };
  try { NET.game.r = NET.kind === 'ws' ? await NET.room.create(name, { hostName: myNick(), name: opt.name, pass: opt.pass, max: opt.max, mode: opt.mode, requireDc: opt.requireDc, cheats: opt.cheats }) : await NET.room.join(name); }
  catch (e) { NET.game = null; netRefreshUI(); return errMsg('No se pudo abrir: ' + (e.message || e.code)); }
  wireGame(NET.game.r); lobbyPresence();
  okMsg(`Mundo abierto. Código ${code.toUpperCase()}${opt.pass ? ' · con contraseña' : ''}. Los demás entran desde Multijugador en el menú principal.`); netRefreshUI();
}
function netSetOpt(p) {
  const g = NET.game; if (!g || !g.host) return; Object.assign(g.opt, p); if (g.opt.mode === 'adventure') g.opt.build = g.opt.containers = false;
  S.mpOpt = { ...g.opt, pass: '' }; g.perm = g.opt;
  if (NET.kind === 'ws') NET.room.meta(g.r.name, { name: g.opt.name, pass: g.opt.pass, max: g.opt.max, mode: g.opt.mode, requireDc: g.opt.requireDc, cheats: g.opt.cheats });
  sendWd(); lobbyPresence(); netRefreshUI();
}
// ---------- Entrar en el mundo de otro ----------
const PROFILE_KEY = 'tc-profile';
const saveProfile = () => { try { if (S && S.char && S.char.made) localStorage.setItem(PROFILE_KEY, JSON.stringify({ char: S.char, nick: S.nick || null })); } catch (e) { } };
async function netJoin(code, pass) {
  code = normTxt(code).replace(/[^a-z0-9]/g, ''); if (!code) return errMsg('Falta el código.');
  if (!NET.room) return errMsg(NET.status);
  if (inGame()) await netLeave(true);
  if (S && currentWorld && !String(currentWorld).startsWith('mp-')) { saveGame(true); saveProfile(); }
  NET.game = { code, host: false, waiting: true, prev: S && currentWorld && !String(currentWorld).startsWith('mp-') ? currentWorld : null, perm: {} };
  try { NET.game.r = NET.kind === 'ws' ? await NET.room.join('tc-' + code, pass || '') : await NET.room.join('tc-' + code); }
  catch (e) { NET.game = null; netRefreshUI(); return errMsg('No se pudo entrar: ' + (e.message || e.code)); }
  const r = NET.game.r; if (r.onOut) r.onOut(why => { errMsg(WS_ERR[why] || 'Has salido de la partida.'); netLeave(true, true); });
  wireGame(r); NET.status = 'Pidiendo el mundo al anfitrión…'; netRefreshUI();
  r.emit('hi', { nick: myNick(), pass: NET.kind === 'claude' ? (pass || '') : undefined }).catch(() => { });
  setTimeout(() => { const g = NET.game; if (g && g.code === code && g.waiting && !g.snap) { errMsg('Nadie responde con ese código.'); netLeave(true); } }, 12000);
}
async function netLeave(quiet, gone) {
  const g = NET.game; if (!g) return;
  if (!g.host && !g.waiting) await sendPdat(true);
  NET.game = null; NET.peers.clear();
  if (!gone) { try { await g.r.emit('bye', {}); } catch (e) { } try { await g.r.leave(); } catch (e) { } }
  lobbyPresence();
  if (!g.host && !g.waiting) { FOES = []; ANIMALS = []; if (g.prev && loadWorld(g.prev)) enterWorld(); else { S = null; currentWorld = null; openTitle(); } }
  if (!quiet) sysMsg(g.host ? 'Tu mundo ya no está abierto a otros.' : 'Has salido de la partida.'); netRefreshUI();
}
// ---------- Mensajes de la partida ----------
function wireGame(r) {
  const g = NET.game, fromHost = m => !g.host && (!g.hostPeer || m.peer === g.hostPeer);
  const ready = () => !g.waiting && !!S;
  const guestOK = (m, k) => g.host ? !!g.opt[k] : (m.peer === g.hostPeer || !!(g.perm || {})[k]);
  r.onPeers(ch => {
    for (const p of ch.left) { const o = NET.peers.get(p.peer); NET.peers.delete(p.peer); if (o && o.nick) sysMsg(`${o.nick} se ha ido.`); if (!g.host && p.peer === g.hostPeer && NET.game === g) { errMsg('El anfitrión ha cerrado la partida.'); netLeave(true, true); return; } }
    for (const p of ch.peers) { if (p.sameTab) continue; const pr = p.presence || {}; let o = NET.peers.get(p.peer); if (!o) { o = { peer: p.peer }; NET.peers.set(p.peer, o); }
      Object.assign(o, { pr, by: p.by, verified: !!p.verified, acct: p.name || '', nick: String((p.verified && p.name) || pr.nick || 'Jugador').slice(0, 20), c: safeCol(pr.c), host: !!pr.host }); peerSample(o, pr); }
    if (g.host && g.opt.max && NET.kind === 'claude') for (const o of [...NET.peers.values()].slice(g.opt.max - 1)) netEmit('deny', { to: o.peer, why: 'full' });
    lobbyPresence(); netRefreshUI();
  });
  r.on('hi', m => { if (m.sameTab || !g.host) return; const d = m.data || {};
    if (NET.kind === 'claude' && g.opt.pass && d.pass !== g.opt.pass) return netEmit('deny', { to: m.peer, why: 'bad_pass' });
    if (g.bans && g.bans.has(m.by)) return netEmit('deny', { to: m.peer, why: 'banned' });
    sysMsg(`${String((m.verified && m.name) || d.nick || 'Alguien').slice(0, 20)} entra en tu mundo.`); sendSnap(m.peer, m.by); });
  r.on('deny', m => { if (!fromHost(m) && g.hostPeer) return; if (!m.data || m.data.to !== myPeer(r)) return; errMsg(WS_ERR[m.data.why] || 'El anfitrión no te deja entrar.'); netLeave(true); });
  r.on('snap', m => { if (g.host || m.sameTab || !m.data || m.data.to !== myPeer(r)) return; takeSnapPart(m); });
  r.on('chat', m => { if (m.sameTab) return; const d = m.data || {}, nick = String((m.verified && m.name) || d.nick || 'Alguien').slice(0, 20);
    if (d.w) { if (d.to !== myPeer(r)) return; chatPush('w', String(d.m).slice(0, 240), { nick, c: '#c8a0ff', toMe: true }); return; }
    if (d.log) { chatPush('sys', `${nick} ${String(d.m).slice(0, 200)}`); return; }
    chatPush(d.me ? 'me' : 'say', String(d.m || '').slice(0, 240), { nick: (m.verified ? '✓ ' : '') + nick, c: safeCol(d.c) }); const o = NET.peers.get(m.peer); if (o) { o.say = String(d.m).slice(0, 60); o.sayT = performance.now(); } });
  // Cambios en el mundo: el anfitrión decide; si alguien no tenía permiso, se deshace
  r.on('badd', m => { if (!ready() || m.sameTab || !m.data || !m.data.o) return; const o = m.data.o; if (!BD[o.type]) return;
    if (!guestOK(m, 'build')) { if (g.host) hostFix(o.x, o.y); return; }
    netGuard(() => { const old = at(o.x, o.y); if (old) delBlock(old); const b = makeB(o.type, o.x, o.y, o.dir); Object.assign(b, o); addBlock(b); }); });
  r.on('bdel', m => { if (!ready() || m.sameTab || !m.data) return; const x = m.data.x | 0, y = m.data.y | 0;
    if (!guestOK(m, 'build')) { if (g.host) hostFix(x, y); return; }
    const b = at(x, y); if (b && b.type !== 'core') netGuard(() => delBlock(b)); });
  r.on('bfix', m => { if (!ready() || m.sameTab || !fromHost(m) || !m.data) return; const { x, y, o } = m.data; netGuard(() => { const b = at(x, y); if (b) delBlock(b); if (o && BD[o.type]) { const nb = makeB(o.type, o.x, o.y, o.dir); Object.assign(nb, o); addBlock(nb); } }); });
  r.on('bset', m => { if (!ready() || m.sameTab || !m.data || !m.data.o) return; if (!guestOK(m, 'containers')) { if (g.host) { const b = at(m.data.o.x | 0, m.data.o.y | 0); const o = b && serB(b); if (o) netEmit('bsb', { a: [o] }); } return; } applyBState(m.data.o); });
  r.on('bsb', m => { if (!ready() || m.sameTab || !fromHost(m) || !m.data || !Array.isArray(m.data.a)) return; for (const o of m.data.a) applyBState(o); });
  r.on('tile', m => { if (!ready() || m.sameTab || !m.data || !Array.isArray(m.data.a)) return;
    if (!guestOK(m, 'build')) { if (g.host) { for (const t of m.data.a) NET.tq.add(t[0] + ',' + t[1]); } return; }
    netGuard(() => { for (const [x, y, gv, tv, lv, dp] of m.data.a) { const c = getChunk(x >> CSH, y >> CSH), i = ((y & CMASK) << CSH) | (x & CMASK); c.g[i] = gv; c.t[i] = tv; c.mod = true; const k = x + ',' + y; if (lv === null) { if (S.lvmod) delete S.lvmod[k]; } else (S.lvmod || (S.lvmod = {}))[k] = lv; if (dp) (S.depth || (S.depth = {}))[dkey(x, y)] = dp; else if (S.depth) delete S.depth[dkey(x, y)]; onTileChange(x, y, false); } }); });
  r.on('wd', m => { if (!ready() || m.sameTab || !fromHost(m) || !m.data) return; const d = m.data; if (Math.abs((d.time || 0) - S.time) > 4) S.time = d.time; if (d.wx && WX_T[d.wx] && WX.type !== d.wx) { WX.prev = WX.type; WX.type = d.wx; WX.int = 0; } WX.t = Math.max(WX.t, 30);
    const old = g.perm || {}, p = d.perm || {}; g.perm = p;
    if (old.cheats !== undefined && old.cheats !== p.cheats) sysMsg(p.cheats ? 'El anfitrión permite los trucos.' : 'El anfitrión ha quitado los trucos.');
    if (old.mode !== undefined && old.mode !== p.mode) { sysMsg('Modo de juego: ' + (GAME_MODES[p.mode] || p.mode)); applyGuestMode(); }
    if (old.build !== undefined && old.build !== p.build) sysMsg(p.build ? 'Ya puedes construir y picar.' : 'El anfitrión no deja construir ni picar.'); netRefreshUI(); });
  r.on('pdat', m => { if (!g.host || m.sameTab || !m.by || !m.data) return; const d = m.data, k = m.by + ':' + d.id; g.pd = g.pd || {}; const a = g.pd[k] || (g.pd[k] = { n: d.n, parts: [], got: 0 }); if (a.parts[d.i] === undefined) { a.parts[d.i] = String(d.d); a.got++; }
    if (a.got >= a.n) { delete g.pd[k]; ungz(a.parts.join('')).then(t => { const o = JSON.parse(t); if (o && typeof o === 'object') (S.mpPlayers || (S.mpPlayers = {}))[m.by] = o; }).catch(() => { }); } });
  r.on('kick', m => { if (m.sameTab || !fromHost(m) || !m.data || m.data.to !== myPeer(r)) return; errMsg(m.data.ban ? WS_ERR.banned : WS_ERR.kicked); netLeave(true); });
  r.on('bye', () => { });
}
function hostFix(x, y) { const b = at(x, y); netEmit('bfix', { x, y, o: b ? serB(b) : null }); }
// Tu propio identificador en la sala (con el servidor propio se sabe desde el saludo, sin esperar a la lista)
const myPeer = r => { if (NET.kind === 'ws' && NET.room && NET.room.me) return NET.room.me.peer; const me = r.peers().find(p => p.sameTab); return me ? me.peer : null; };
function applyBState(o) { if (!o || !BD[o.type]) return; const b = at(o.x | 0, o.y | 0); if (!b || b.type !== o.type || b === ui.panel) return; netGuard(() => { const keep = { x: b.x, y: b.y }; Object.assign(b, o, keep); NET.sent.set(b, JSON.stringify(serB(b))); }); dirty.lists = true; }
function netKick(peer, ban) {
  const g = NET.game, o = NET.peers.get(peer); if (!g || !g.host || !o) return;
  if (ban) { g.bans = g.bans || new Set(); if (o.by) g.bans.add(o.by); }
  if (NET.kind === 'ws') NET.room.kick(g.r.name, peer, ban); else netEmit('kick', { to: peer, ban: !!ban });
  sysMsg(`${o.nick} ${ban ? 'vetado' : 'expulsado'}.`);
}
// ---------- El mundo del anfitrión, comprimido y en trozos ----------
async function gz(str) { const cs = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip')); const buf = new Uint8Array(await new Response(cs).arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return btoa(s); }
async function ungz(b64) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); const ds = new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip')); return await new Response(ds).text(); }
function worldSnap(by) {
  for (const c of WORLD.values()) if (typeof fogSync === 'function') fogSync(c);
  const ws = {}; for (const k in S) if (!PERSONAL.has(k) && !WORLD_SKIP.has(k)) ws[k] = S[k];
  const ch = []; for (const c of WORLD.values()) if (c.mod) ch.push([c.cx, c.cy, rle(c.g), rle(c.t)]);
  const bs = blocks.map(b => { const o = {}; for (const k in b) if (!SKIP.has(k)) o[k] = b[k]; return o; });
  return JSON.stringify({ ws, ch, bs, host: { x: S.player.x, y: S.player.y }, perm: NET.game.opt, you: by && S.mpPlayers ? S.mpPlayers[by] || null : null });
}
const CHUNK = 3200;
async function sendParts(topic, to, str, extra) {
  const g = NET.game, data = await gz(str), n = Math.ceil(data.length / CHUNK), id = Math.random().toString(36).slice(2, 8);
  for (let i = 0; i < n; i++) { if (NET.game !== g) return 0; await g.r.emit(topic, { to, id, i, n, d: data.slice(i * CHUNK, (i + 1) * CHUNK), ...(extra || {}) }).catch(() => { }); if (n > 1) await new Promise(r => setTimeout(r, NET.kind === 'ws' ? 15 : 110)); }
  return data.length;
}
async function sendSnap(to, by) { const g = NET.game; if (!g || !g.host) return; const len = await sendParts('snap', to, worldSnap(by)); if (len) sysMsg(`Mundo enviado (${Math.round(len / 1024)} KB).`); sendWd(); }
async function sendPdat(now) { const g = NET.game; if (!g || g.host || g.waiting || !S) return; const o = {}; for (const k of PDAT_KEYS) if (S[k] !== undefined) o[k] = S[k]; await sendParts('pdat', null, JSON.stringify(o)); }
async function takeSnapPart(m) {
  const g = NET.game, d = m.data; if (!g || !g.waiting) return;
  if (!g.snap || g.snap.id !== d.id) g.snap = { id: d.id, n: d.n, parts: new Array(d.n), got: 0 };
  const s = g.snap; if (s.parts[d.i] === undefined) { s.parts[d.i] = String(d.d); s.got++; }
  g.hostPeer = m.peer; NET.status = `Descargando el mundo ${Math.round(s.got / s.n * 100)} %`; netRefreshUI();
  if (s.got < s.n) return;
  try {
    const w = JSON.parse(await ungz(s.parts.join('')));
    // Tu personaje (aspecto y nombre) viene contigo; inventario, salud y sitio son de este mundo
    let prof = null; try { prof = JSON.parse(localStorage.getItem(PROFILE_KEY)); } catch (e) { }
    const mine = { char: (S && S.char && S.char.made ? S.char : prof && prof.char) || undefined, nick: (S && S.nick) || (prof && prof.nick) || undefined, autoSort: S ? S.autoSort : true, mute: S ? S.mute : false, marks: [] };
    let personal = w.you;
    if (!personal) { const inv = new Array(INV_N).fill(null); if (w.perm.mode !== 'creative') START_ITEMS.forEach(([id, n], i) => { if (i < 9) inv[i] = { id, n }; else slotsAdd(inv, id, n, false, FILL_ORDER); }); personal = { inv, sel: 0, equip: {}, player: { x: w.host.x + T, y: w.host.y } }; }
    netGuard(() => deserialize(JSON.stringify({ ...w.ws, ...mine, ...personal, v: 3, ch: w.ch, bs: w.bs, seen: [] })));
    if (!personal.pc) pcInit();
    currentWorld = 'mp-' + g.code; S.name = (w.ws.name || 'Mundo') + ' (en línea)';
    FOES = []; ANIMALS = []; g.waiting = false; g.snap = null; g.perm = w.perm || {}; applyGuestMode();
    enterWorld(); NET.status = 'En la partida ' + g.code.toUpperCase(); okMsg(w.you ? '¡Has vuelto! Sigues donde lo dejaste en este mundo.' : '¡Dentro! Empiezas con lo básico en este mundo.'); netRefreshUI();
  } catch (e) { errMsg('El mundo llegó dañado: ' + e.message); netLeave(true); }
}
function applyGuestMode() { if (!isGuest() || !S) return; const c = NET.game.perm.mode === 'creative'; S.creative = S.sandbox = c; vitalsDirty = true; }
// En línea, el invitado no guarda una copia del mundo: manda su inventario y salud al anfitrión
{ const s0 = saveGame; saveGame = quiet => { if (S && currentWorld && String(currentWorld).startsWith('mp-')) { sendPdat(); if (!quiet) toast('Tu progreso se guarda en el mundo del anfitrión'); return true; } return s0(quiet); }; }
{ const e0 = enterWorld; enterWorld = () => { e0(); saveProfile(); }; }
// ---------- Lo que cambias tú se manda a los demás ----------
{ const a0 = addBlock; addBlock = b => { a0(b); if (inGame() && !NET.netIn && !NET.game.waiting) { const o = serB(b); if (o) netEmit('badd', { o }); NET.sent.set(b, JSON.stringify(o)); } }; }
{ const d0 = delBlock; delBlock = b => { d0(b); if (inGame() && !NET.netIn && !NET.game.waiting) netEmit('bdel', { x: b.x, y: b.y }); }; }
{ const t0 = onTileChange; onTileChange = (x, y, isB) => { t0(x, y, isB); if (!isB && inGame() && !NET.netIn && !NET.game.waiting) NET.tq.add(x + ',' + y); }; }
// Permisos del invitado (el anfitrión también lo comprueba y deshace lo que no toca)
let _permT = 0; const noPerm = t => { const n = performance.now(); if (n - _permT > 2500) { _permT = n; toastErr(t); } };
{ const p0 = tryPlace; tryPlace = (...a) => { if (!perm('build')) { noPerm('En esta partida no puedes construir.'); return null; } return p0(...a); }; }
{ const r0 = removeAt; removeAt = (...a) => { if (!perm('build')) { noPerm('En esta partida no puedes quitar bloques.'); return; } return r0(...a); }; }
{ const m0 = updateMining; updateMining = dt => { if (!perm('build')) { if (mouse.rdown) noPerm('En esta partida no puedes picar.'); return; } m0(dt); }; }
{ const b0 = breakTick; breakTick = dt => { if (!perm('build')) return; b0(dt); }; }
{ const o0 = openInventory; openInventory = b => { if (b && !perm('containers')) { noPerm('En esta partida no puedes abrir cofres ni máquinas.'); return; } o0(b); }; }
function flushTiles() {
  if (!NET.tq.size) return; const a = [];
  for (const k of NET.tq) { const [x, y] = k.split(',').map(Number), c = getChunk(x >> CSH, y >> CSH), i = ((y & CMASK) << CSH) | (x & CMASK); const lv = S.lvmod && S.lvmod[k]; a.push([x, y, c.g[i], c.t[i], lv === undefined ? null : lv, depthAt(x, y)]); if (a.length >= 80) break; }
  for (const t of a) NET.tq.delete(t[0] + ',' + t[1]); netEmit('tile', { a });
}
let _bsT = 0, _bsbT = 0, _wdT = 0, _bsbI = 0, _pdT = 0;
function syncBlocks(dt) {
  const g = NET.game; if (!inGame() || g.waiting) return;
  if ((_bsT += dt) > 0.6) { _bsT = 0; if (perm('containers')) for (const b of new Set([ui.panel, at(mouse.tx, mouse.ty)])) { if (!b || !b.type) continue; const o = serB(b); if (!o) continue; const s = JSON.stringify(o); if (NET.sent.get(b) !== s) { NET.sent.set(b, s); netEmit('bset', { o }); } } }
  if (g.host && (_bsbT += dt) > 2) { _bsbT = 0; let a = [], len = 0, msgs = 0; const n = blocks.length;
    for (let k = 0; k < n && msgs < 3; k++) { const b = blocks[(_bsbI + k) % n]; if (!b.inv && !b.slots && !b.items && !b.tanks && b.E === undefined) continue; const o = serB(b); if (!o) continue; const s = JSON.stringify(o); if (NET.sent.get(b) === s) continue; NET.sent.set(b, s);
      if (len + s.length > 3300) { netEmit('bsb', { a }); msgs++; a = []; len = 0; } a.push(o); len += s.length + 1; _bsbI = (_bsbI + k + 1) % Math.max(1, n); }
    if (a.length && msgs < 3) netEmit('bsb', { a }); }
  if (g.host && (_wdT += dt) > 5) { _wdT = 0; sendWd(); }
  if (!g.host && (_pdT += dt) > 20) { _pdT = 0; sendPdat(); }
}
function sendWd() { const g = NET.game; if (g && g.host) { const o = g.opt; netEmit('wd', { time: S.time, wx: WX.type, perm: { mode: o.mode, build: !!o.build, containers: !!o.containers, cheats: !!o.cheats } }); } }
// ---------- Tu presencia: dónde estás, cómo te mueves y qué haces ----------
let _prT = 0, _prS = '', _prSeq = 0;
function myPresence(dt) {
  const g = NET.game; if (!inGame() || g.waiting || (_prT += dt) < 0.05) return; _prT = 0;
  const p = S.player, pc = S.pc || {}, ch = charData(), m = typeof mountPet === 'function' ? mountPet() : null;
  const mining = (ui.mine && ui.mine.t > 0) || (ui.bb && ui.bb.t > 0);
  const pr = { nick: myNick(), c: myColor(), host: !!g.host, x: Math.round(p.x), y: Math.round(p.y), vx: Math.round(P.mvx || 0), vy: Math.round(P.mvy || 0),
    fa: +(P.faceA || 0).toFixed(2), mv: pmove.moving ? 1 : 0, run: pmove.sprint ? 1 : 0, z: Math.round(P.z || 0), sw: P.swim || 0, h: ui.hand ? null : heldId(),
    sg: P.swing > 0 ? +P.swing.toFixed(2) : 0, mn: mining ? 1 : 0, ht: P.hurtT > 0 ? 1 : 0, mt: m ? m.sp : null, fs: typeof FSH !== 'undefined' && FSH.st ? [Math.round(FSH.bx), Math.round(FSH.by)] : null,
    hp: Math.round(pc.hp ?? 100), mhp: Math.round(maxHp()), ty: CHAT.open ? 1 : 0, ps: ui.open === 'pause' ? 1 : 0, look: ch.look, eq: S.equip, dc: typeof dcTag === 'function' ? dcTag() || null : null };
  const s = JSON.stringify(pr); if (s === _prS) return; _prS = s; pr.q = ++_prSeq; g.r.presence(pr).catch(() => { });
}
// ---------- Los demás: posición suavizada (se dibujan ~100 ms en el pasado, entre dos muestras reales) ----------
const PEER_DELAY = 110;
function peerSample(o, pr) {
  if (!pr || pr.x === undefined || pr.q === o.lastQ) return; o.lastQ = pr.q;
  const now = performance.now(), b = o.buf || (o.buf = []);
  b.push({ t: now, x: pr.x, y: pr.y, vx: pr.vx || 0, vy: pr.vy || 0 }); while (b.length > 12) b.shift();
  if (o.rx === undefined || Math.hypot(pr.x - o.rx, pr.y - o.ry) > 8 * T) { o.rx = pr.x; o.ry = pr.y; o.buf = [b[b.length - 1]]; } // teletransporte: sin deslizarse
}
function peerPos(o, now) {
  const b = o.buf; if (!b || !b.length) return null; const t = now - PEER_DELAY;
  if (t <= b[0].t) return b[0];
  for (let i = b.length - 1; i > 0; i--) { const a = b[i - 1], c = b[i]; if (t >= a.t && t <= c.t) { const k = (t - a.t) / Math.max(1, c.t - a.t); return { x: a.x + (c.x - a.x) * k, y: a.y + (c.y - a.y) * k }; } }
  const l = b[b.length - 1], ex = Math.min(0.15, (t - l.t) / 1000); return { x: l.x + l.vx * ex, y: l.y + l.vy * ex }; // un poco por delante si faltan datos
}
{ const d0 = drawPlayer; drawPlayer = ctx => { d0(ctx); if (inGame()) drawPeers(ctx); }; }
function drawPeers(ctx) {
  const now = performance.now(), showNames = typeof OPT === 'undefined' || OPT.names !== false, dt = Math.min(0.1, (now - (drawPeers.t || now)) / 1000); drawPeers.t = now;
  // Orden por profundidad: el de más abajo se dibuja encima
  const list = [...NET.peers.values()].filter(o => o.pr && o.pr.x !== undefined);
  for (const o of list) { const q = peerPos(o, now) || o.pr; const ox = o.rx ?? q.x, oy = o.ry ?? q.y; o.rx = q.x; o.ry = q.y; const moved = Math.hypot(o.rx - ox, o.ry - oy); o.wk = (o.wk || 0) + (o.pr.mv ? moved / (o.pr.sw === 2 ? 15 : o.pr.run ? 13 : 10.5) : 0); o.moved = moved; }
  list.sort((a, b) => a.ry - b.ry);
  for (const o of list) {
    const pr = o.pr, x = o.rx, y0 = o.ry; if (Math.abs(x - S.player.x) > 30 * T || Math.abs(y0 - S.player.y) > 20 * T) continue;
    const z = pr.z || 0, swm = pr.mt ? 0 : pr.sw || 0, bob = swm === 2 ? Math.sin(now / 320 + x) * 1.3 : 0, by = pr.mt ? -8 : 0, y = y0 + by;
    // Montura
    if (pr.mt && typeof animalSprite === 'function' && SPECIES[pr.mt]) { try { const spr = animalSprite(pr.mt), s = spr.size, fr = spr.f[(o.wk | 0) % spr.f.length] || spr.f[0]; ctx.save(); ctx.translate(x, y0 + 6); if (Math.cos(pr.fa || 0) < 0) ctx.scale(-1, 1); ctx.drawImage(fr, -s / 2, s / 2 - spr.h, s, spr.h); ctx.restore(); } catch (e) { } }
    // Sombra (no en el agua), ondas al nadar y polvo al correr
    if (!swm) { const k = 1 / (1 + z / 22); ctx.fillStyle = `rgba(0,0,0,${0.3 * k})`; ctx.beginPath(); ctx.ellipse(x, y0 + 8, 10 * k, 4 * k, 0, 0, 7); ctx.fill(); }
    if (swm && o.moved > 0.3 && Math.random() < 0.25 && typeof ripple === 'function') ripple(x, y + 4, 9, 0.8);
    if (!swm && pr.run && o.moved > 1 && Math.random() < 0.3 && typeof fxAdd === 'function') fxAdd({ x: x + (Math.random() - 0.5) * 6, y: y0 + 8, vx: (Math.random() - 0.5) * 20, vy: -10, life: 0.4, t: 0, size: 2, col: 'rgba(200,190,160,.6)', grav: 0, drag: 3 });
    // Golpe: el balanceo que manda él, o uno continuo mientras pica
    const sgv = pr.sg > 0 ? pr.sg : pr.mn ? 0.2 * (0.5 + 0.5 * Math.sin(now / 90)) : 0, sw2 = sgv > 0 ? (1 - sgv / 0.2) * 2.2 - 1.1 : 0;
    if (pr.ht && ((now / 33) | 0) % 2) ctx.globalAlpha = 0.55;
    const wl = swm === 2 ? y + 1 + bob : y + 6;
    if (swm) { ctx.save(); ctx.beginPath(); ctx.rect(x - 60, y - 90, 120, wl - (y - 90)); ctx.clip(); }
    try { drawAvatar(ctx, pr.look || DEFAULT_LOOK, pr.eq || {}, x, y + 8 - z + (swm === 2 ? 9 + bob : swm ? 2 : 0), +pr.fa || 0, z > 0.5 ? 1.2 : o.wk || 0, (!!pr.mv || z > 0.5) && !pr.mt, 1.6, swm === 2 ? null : pr.h && ITEMS[pr.h] ? pr.h : null, sw2); } catch (e) { circ(ctx, x, y, 9, o.c); }
    if (swm) { ctx.restore(); ctx.fillStyle = 'rgba(120,180,230,.35)'; ctx.beginPath(); ctx.ellipse(x, wl, 11, 3.6, 0, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(230,246,255,.75)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, wl, 11 + Math.sin(now / 400) * 0.8, 3.6, 0, 0, 7); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // Sedal de pesca
    if (pr.fs) { ctx.strokeStyle = 'rgba(240,240,240,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + Math.cos(pr.fa) * 14, y - 18); ctx.quadraticCurveTo((x + pr.fs[0]) / 2, Math.max(y, pr.fs[1]) + 10, pr.fs[0], pr.fs[1]); ctx.stroke(); circ(ctx, pr.fs[0], pr.fs[1] + Math.sin(now / 300) * 1.2, 2.2, '#e8473a'); }
    // Nombre: pequeño, se desvanece con la distancia; vida solo si está herido
    const dist = Math.hypot(x - S.player.x, y0 - S.player.y) / T, na = clamp(1.4 - dist / 16, 0.25, 1), ty = y - 46 - z - (pr.mt ? 6 : 0);
    if (showNames) { ctx.globalAlpha = na; ctx.font = '600 9px system-ui'; ctx.textAlign = 'center'; const tag = (o.host ? '♛ ' : '') + (o.verified ? '✓ ' : '') + o.nick + (pr.ty ? ' ✎' : '') + (pr.ps ? ' ⏸' : ''), tw = ctx.measureText(tag).width + 10;
      ctx.fillStyle = 'rgba(12,13,16,.62)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - tw / 2, ty - 9, tw, 12, 6) : ctx.rect(x - tw / 2, ty - 9, tw, 12); ctx.fill(); ctx.fillStyle = o.c; ctx.fillText(tag, x, ty); ctx.globalAlpha = 1; }
    if (pr.hp < pr.mhp) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x - 10, ty + 5, 20, 2.5); ctx.fillStyle = pr.hp / pr.mhp > 0.5 ? '#7fd07a' : pr.hp / pr.mhp > 0.25 ? '#e0b54c' : '#e05050'; ctx.fillRect(x - 10, ty + 5, 20 * clamp(pr.hp / pr.mhp, 0, 1), 2.5); }
    if (o.say && now - o.sayT < 6000) { ctx.font = '11px system-ui'; ctx.textAlign = 'center'; const t = o.say.length > 30 ? o.say.slice(0, 29) + '…' : o.say, w2 = Math.min(190, ctx.measureText(t).width + 14); ctx.globalAlpha = Math.min(1, (6000 - (now - o.sayT)) / 800); ctx.fillStyle = 'rgba(250,248,240,.95)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w2 / 2, ty - 30, w2, 17, 8) : ctx.rect(x - w2 / 2, ty - 30, w2, 17); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - 4, ty - 13); ctx.lineTo(x + 4, ty - 13); ctx.lineTo(x, ty - 9); ctx.fill(); ctx.fillStyle = '#1a1a1a'; ctx.fillText(t, x, ty - 18); ctx.globalAlpha = 1; }
  }
}
// ---------- Bucle ----------
let _netLast = performance.now();
setInterval(() => { const now = performance.now(), dt = Math.min(0.5, (now - _netLast) / 1000); _netLast = now; if (!S || !inGame()) return; myPresence(dt); syncBlocks(dt); flushTiles(); }, 50);
// ---------- Chat y trucos en red ----------
const lobbySend = d => { if (NET.room && NET.room.connected()) NET.room.emit('chat', d).catch(() => { }); };
chatSend = text => { const d = { m: text, nick: myNick(), c: myColor() }; chatPush('say', text, { nick: myNick(), c: myColor() }); if (inGame()) netEmit('chat', d); else lobbySend(d); };
chatSendMe = text => { const d = { m: text, me: 1, nick: myNick(), c: myColor() }; chatPush('me', text, { nick: myNick(), c: myColor() }); if (inGame()) netEmit('chat', d); else lobbySend(d); };
cheatsOK = () => !inGame() || NET.game.host || !!(NET.game.perm || {}).cheats;
cheatUsed = (n, raw) => { if (!inGame()) return; netEmit('chat', { log: 1, nick: myNick(), m: 'usó /' + raw.slice(0, 120) }); if (NET.game.host && /^(hora|time|dia|day|noche|night|clima|weather|tiempo)$/.test(n)) sendWd(); };
// El modo creativo de un invitado lo decide el anfitrión
{ const m0 = CMDS.modo.run; const run = (a, raw) => isGuest() && !(NET.game.perm || {}).cheats ? errMsg('El anfitrión decide tu modo de juego.') : m0(a, raw); for (const k in CMDS) if (CMDS[k].run === m0) CMDS[k] = { ...CMDS[k], run }; }
const findPeer = q => { const n = normTxt(q); return [...NET.peers.values()].find(o => normTxt(o.nick) === n) || [...NET.peers.values()].find(o => normTxt(o.nick).startsWith(n)); };
cmd('partida', { a: ['multi', 'mp', 'lan'], u: '/partida abrir [contraseña] | unirse <código> [contraseña] | salir', d: 'Abre tu mundo a otros, entra en el de alguien o sal.', run(a) {
  const m = normTxt(a[0] || '');
  if (m === 'abrir' || m === 'crear' || m === 'host') return void netHost({ pass: a[1] || '' });
  if (m === 'unirse' || m === 'join' || m === 'entrar') return void netJoin(a[1] || '', a[2] || '');
  if (m === 'salir' || m === 'cerrar' || m === 'leave') return void netLeave();
  if (inGame()) return `Partida ${NET.game.code.toUpperCase()} (${NET.game.host ? 'anfitrión' : 'invitado'}) con ${NET.peers.size} jugador(es) más.`;
  if (typeof openPause === 'function') openPause('lan');
} });
cmd('jugadores', { a: ['players', 'list', 'quien'], u: '/jugadores', d: 'Quién está en la partida.', run() { if (!inGame()) return 'No estás en ninguna partida.'; return 'Jugadores: ' + [myNick() + ' (tú)', ...[...NET.peers.values()].map(o => (o.host ? '♛ ' : '') + (o.verified ? '✓ ' : '') + o.nick)].join(', '); } });
cmd('susurrar', { a: ['w', 'msg', 'tell', 'privado'], u: '/susurrar <jugador> <mensaje>', d: 'Mensaje solo para un jugador (no mandes contraseñas: no está cifrado).', run(a) {
  if (!inGame()) return errMsg('Solo en una partida.'); const o = findPeer(a[0] || ''); if (!o) return errMsg('No hay nadie llamado así.');
  const t = a.slice(1).join(' '); if (!t) return errMsg('¿Qué le dices?'); netEmit('chat', { w: 1, to: o.peer, m: t, nick: myNick() }); chatPush('w', t, { nick: myNick(), to: o.nick, c: '#c8a0ff' });
} });
cmd('trucos', { a: ['cheats'], u: '/trucos si|no', d: 'El anfitrión permite o no los trucos a los invitados.', run(a) {
  if (!inGame()) return 'En solitario los trucos siempre están permitidos.'; if (!NET.game.host) return errMsg('Solo el anfitrión.');
  netSetOpt({ cheats: /^(si|sí|on|1|yes)$/.test(normTxt(a[0] || '')) || (!a[0] && !NET.game.opt.cheats) }); return NET.game.opt.cheats ? 'Trucos permitidos para todos.' : 'Trucos solo para ti.';
} });
cmd('expulsar', { a: ['kick'], u: '/expulsar <jugador>', d: 'El anfitrión saca a alguien de la partida.', run(a) { if (!inGame() || !NET.game.host) return errMsg('Solo el anfitrión.'); const o = findPeer(a.join(' ')); if (!o) return errMsg('No hay nadie llamado así.'); netKick(o.peer, false); } });
cmd('vetar', { a: ['ban'], u: '/vetar <jugador>', d: 'El anfitrión saca a alguien y no le deja volver.', run(a) { if (!inGame() || !NET.game.host) return errMsg('Solo el anfitrión.'); const o = findPeer(a.join(' ')); if (!o) return errMsg('No hay nadie llamado así.'); netKick(o.peer, true); } });
{ const tp0 = CMDS.tp.run; const run = (a, raw) => { if (a.length === 1 && inGame()) { const o = findPeer(a[0]); if (!o || !o.pr) return errMsg('No hay nadie llamado así.'); S.player.x = o.pr.x + T; S.player.y = o.pr.y; view.x = S.player.x; view.y = S.player.y; return 'Junto a ' + o.nick + '.'; } return tp0(a, raw); }; for (const k in CMDS) if (CMDS[k].run === tp0) CMDS[k] = { ...CMDS[k], run, u: '/tp <x> <y> | /tp <jugador>' }; }
function tpTo(peer) { const o = NET.peers.get(peer); if (o && o.pr && cheatsOK()) { S.player.x = o.pr.x + T; S.player.y = o.pr.y; view.x = S.player.x; view.y = S.player.y; } }
addEventListener('beforeunload', () => { if (inGame()) { if (!NET.game.host) sendPdat(true); NET.game.r.emit('bye', {}).catch(() => { }); } });
netInit();
