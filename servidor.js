// =====================================================================================
//  Servidor de Taller Cinético (Node 18+, sin dependencias).
//   · Sirve el juego (solo los archivos de esta carpeta).
//   · Salas de partidas por WebSocket en /ws: lista de partidas, contraseña, máximo de
//     jugadores, expulsar/vetar y «solo cuentas de Discord». Lo hace cumplir el servidor.
//   · Discord: con DISCORD_CLIENT_SECRET (variable de entorno, nunca en la página) el propio
//     servidor hace el inicio de sesión (/auth/discord) y da una sesión de 30 días. Sin secreto,
//     acepta el token del navegador y le pregunta a Discord quién es.
//   · Datos (almacen.js): cuentas, sesiones, mundos en la nube y vetos. PostgreSQL si hay
//     DATABASE_URL (Railway); si no, un archivo en .datos/.
//  Variables: PORT · DATABASE_URL · DISCORD_CLIENT_ID · DISCORD_CLIENT_SECRET · PUBLIC_URL
//  Uso:  node servidor.js            (puerto 8080, abierto a tu red local)
//        node servidor.js --solo-yo  (solo este ordenador)
//        PORT=9000 node servidor.js
// =====================================================================================
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os');
const ROOT = __dirname, PORT = +process.env.PORT || 8080, LOCAL_ONLY = process.argv.includes('--solo-yo');
const DC_ID = process.env.DISCORD_CLIENT_ID || '1562327426837516288', DC_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
// Dirección pública: la que pongas en PUBLIC_URL o la que da el alojamiento (Railway o Render)
const PUBLIC = (process.env.PUBLIC_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? 'https://' + process.env.RAILWAY_PUBLIC_DOMAIN : '') || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '');
let DB = null; const MAX_SAVE = 8e6;
// Dirección pública con la que vuelve Discord (la fija PUBLIC_URL; si no, la de la petición)
const baseOf = req => PUBLIC || ((req.headers['x-forwarded-proto'] || 'http').split(',')[0] + '://' + req.headers.host);
const oauthStates = new Map();
const redirect = (res, to) => { res.writeHead(302, { Location: to, 'Cache-Control': 'no-store' }); res.end(); };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
const lanIPs = () => Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
// ---------- Archivos ----------
const server = http.createServer(async (req, res) => {
  let p, U; try { U = new URL(req.url, 'http://x'); p = decodeURIComponent(U.pathname); } catch (e) { res.writeHead(400); return res.end(); }
  // ---- Inicio de sesión con Discord hecho por el servidor ----
  if (p === '/api/info') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return res.end(JSON.stringify({ oauth: !!DC_SECRET, clientId: DC_ID, public: PUBLIC || null, db: DB ? DB.kind : null })); }
  if (p === '/auth/discord') {
    if (!DC_SECRET) return redirect(res, '/#tcerr=' + encodeURIComponent('El servidor no tiene configurado DISCORD_CLIENT_SECRET'));
    const st = crypto.randomBytes(16).toString('hex'); oauthStates.set(st, Date.now() + 600000); for (const [k, t] of oauthStates) if (t < Date.now()) oauthStates.delete(k);
    return redirect(res, 'https://discord.com/oauth2/authorize?' + new URLSearchParams({ client_id: DC_ID, response_type: 'code', redirect_uri: baseOf(req) + '/auth/discord/callback', scope: 'identify', state: st }));
  }
  if (p === '/auth/discord/callback') {
    const code = U.searchParams.get('code'), st = U.searchParams.get('state'), ok = st && oauthStates.get(st) > Date.now(); oauthStates.delete(st);
    if (!ok || !code) return redirect(res, '/#tcerr=' + encodeURIComponent(U.searchParams.get('error_description') || 'Inicio de sesión cancelado o caducado'));
    try {
      const tr = await fetch('https://discord.com/api/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: DC_ID, client_secret: DC_SECRET, grant_type: 'authorization_code', code, redirect_uri: baseOf(req) + '/auth/discord/callback' }) });
      if (!tr.ok) throw new Error('Discord respondió ' + tr.status); const tk = await tr.json(), who = await discordWho(tk.access_token); if (!who) throw new Error('no se pudo leer tu perfil');
      await DB.upsertUser({ id: 'dc:' + who.id, name: who.name, username: who.user, avatar: who.avatar });
      return redirect(res, '/#tcs=' + await DB.newSession('dc:' + who.id));
    } catch (e) { return redirect(res, '/#tcerr=' + encodeURIComponent('Discord: ' + e.message)); }
  }
  // Enlace de invitación: /server/<código> abre el juego y entra directo en esa partida
  if (/^\/server\/[a-z0-9]{3,24}\/?$/i.test(p)) p = '/index.html'; else if (p.startsWith('/server/')) p = p.slice(7);
  if (p === '/api/game') { const g = gameList().find(x => x.room === 'tc-' + String(U.searchParams.get('c') || '').toLowerCase()); res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return res.end(JSON.stringify(g ? { ok: true, name: g.name, host: g.host, n: g.n, max: g.max, lock: g.lock, dc: g.dc, mode: g.mode } : { ok: false })); }
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, path.normalize(p).replace(/^([\\/]*\.\.)+/, ''));
  const ext = path.extname(f).toLowerCase();
  // Nada fuera de la carpeta, nada oculto, solo tipos de la web (no se sirve este archivo ni los .bat)
  const rel = path.relative(ROOT, f);
  // Nada fuera de la carpeta, nada oculto, solo tipos de la web y, en la raíz, solo index.html (ni el servidor ni sus datos)
  if (!f.startsWith(ROOT + path.sep) || /(^|[\\/])\./.test(rel) || !MIME[ext] || (!/[\\/]/.test(rel) && rel !== 'index.html') || /^node_modules/.test(rel)) { res.writeHead(404); return res.end('No encontrado'); }
  fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); return res.end('No encontrado'); } res.writeHead(200, { 'Content-Type': MIME[ext], 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' }); res.end(data); });
});
// ---------- WebSocket mínimo (RFC 6455) ----------
// Mientras un jugador se reconecta (c.gone), sus mensajes esperan en una cola y se le entregan al volver
const GRACE = 45000, Q_MAX = 4000;
function wsSend(c, obj) { if (c.gone) { if (c.q.length < Q_MAX) c.q.push(obj); else c.qLost = true; return; } if (c.dead || !c.sock) return; const buf = Buffer.from(JSON.stringify(obj)), n = buf.length; let h;
  if (n < 126) h = Buffer.from([0x81, n]); else if (n < 65536) { h = Buffer.alloc(4); h[0] = 0x81; h[1] = 126; h.writeUInt16BE(n, 2); } else { h = Buffer.alloc(10); h[0] = 0x81; h[1] = 127; h.writeBigUInt64BE(BigInt(n), 2); }
  try { c.sock.write(Buffer.concat([h, buf])); } catch (e) { } }
server.on('upgrade', (req, sock) => {
  if (new URL(req.url, 'http://x').pathname !== '/ws' || !req.headers['sec-websocket-key']) { sock.destroy(); return; }
  const acc = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${acc}\r\n\r\n`);
  sock.setNoDelay(true); sock.setKeepAlive(true, 20000);
  // «c» cambia si este socket recupera una conexión anterior (reconexión con «resume»)
  let c = { sock, id: crypto.randomBytes(6).toString('hex'), rt: crypto.randomBytes(12).toString('hex'), rooms: new Set(), buf: Buffer.alloc(0), rate: 0, rateT: Date.now(), hello: false, frag: [], q: [], seen: Date.now() };
  c.rebind = o => { o.rebind = c.rebind; o.buf = c.buf; o.frag = c.frag; c = o; };
  socks.add(sock); sock._tc = () => c;
  sock.on('data', d => { c.seen = Date.now(); c.buf = Buffer.concat([c.buf, d]); if (c.buf.length > 12e6) return sock.destroy(); try { readFrames(c); } catch (e) { console.error('ws', e.message); sock.destroy(); } });
  sock.on('close', () => { socks.delete(sock); sockGone(c, sock); }); sock.on('error', () => { socks.delete(sock); sockGone(c, sock); });
});
// Latido: el servidor hace ping cada 15 s; si un socket lleva 45 s sin dar señales, está muerto (aunque no se cerrara)
const socks = new Set();
setInterval(() => { const now = Date.now(); for (const s of socks) { const c = s._tc(); if (now - c.seen > 45000) { s.destroy(); continue; } try { s.write(Buffer.from([0x89, 0])); } catch (e) { } } }, 15000);
function readFrames(c0) { let c = c0;
  for (;;) {
    const b = c.buf; if (b.length < 2) return;
    const op = b[0] & 15, fin = b[0] & 128, masked = b[1] & 128; let n = b[1] & 127, o = 2;
    if (n === 126) { if (b.length < 4) return; n = b.readUInt16BE(2); o = 4; } else if (n === 127) { if (b.length < 10) return; n = Number(b.readBigUInt64BE(2)); o = 10; }
    if (n > 10e6) return c.sock.destroy();
    const need = o + (masked ? 4 : 0) + n; if (b.length < need) return;
    let data = b.subarray(o + (masked ? 4 : 0), need);
    if (masked) { const m = b.subarray(o, o + 4); data = Buffer.from(data); for (let i = 0; i < n; i++) data[i] ^= m[i & 3]; }
    c.buf = b.subarray(need);
    if (op === 8) { c.sock.end(); return; }
    if (op === 9) { try { c.sock.write(Buffer.concat([Buffer.from([0x8a, data.length]), data])); } catch (e) { } continue; }
    if (op === 10) continue;
    if (op === 1 || op === 0) { c.frag.push(Buffer.from(data)); if (fin) { const txt = Buffer.concat(c.frag).toString('utf8'); c.frag = []; let m; try { m = JSON.parse(txt); } catch (e) { continue; } onMsg(c, m).catch(e => console.error('mensaje', e && e.message)); if (c.rebound) { const o = c.rebound; c.rebound = null; c = o; } } }
  }
}
// ---------- Salas ----------
const clients = new Map(), rooms = new Map(), SESS_CACHE = new Map();
const room = n => rooms.get(n) || (rooms.set(n, { name: n, peers: new Map(), meta: null, pt: 0 }), rooms.get(n));
const pub = c => ({ peer: c.id, by: c.by, name: c.name, verified: !!c.verified, avatar: c.avatar || '', away: !!c.gone });
function peersOf(r) { return [...r.peers].map(([id, pr]) => { const c = clients.get(id); return c ? { ...pub(c), presence: pr } : null; }).filter(Boolean); }
function sendPeers(r) { if (r.pt) return; r.pt = setTimeout(() => { r.pt = 0; const ps = peersOf(r); for (const id of r.peers.keys()) { const c = clients.get(id); if (c) wsSend(c, { op: 'peers', room: r.name, peers: ps }); } }, 33); }
function leaveRoom(c, name, why) {
  const r = rooms.get(name); if (!r || !r.peers.has(c.id)) return; r.peers.delete(c.id); c.rooms.delete(name);
  if (why) wsSend(c, { op: 'out', room: name, why });
  if (r.meta && r.meta.host === c.id) {
    // El anfitrión se va: si dejó la partida abierta (por defecto), sigue con otro jugador como anfitrión
    // hasta que no quede nadie; si no, se cierra para todos
    const rest = [...r.peers.keys()].map(id => clients.get(id)).filter(Boolean).sort((a, b) => (a.gone ? 1 : 0) - (b.gone ? 1 : 0));
    if (r.meta.keep && rest.length) {
      const nh = rest[0], mt = r.meta; mt.host = nh.id; mt.hostName = nh.name;
      for (const o of rest) wsSend(o, { op: 'host', room: name, peer: nh.id, name: nh.name, meta: { name: mt.name, max: mt.max, mode: mt.mode, requireDc: mt.requireDc, cheats: mt.cheats, keep: true, pass: o === nh ? mt.pass : undefined } });
      sendPeers(r); return;
    }
    for (const o of rest) { o.rooms.delete(name); wsSend(o, { op: 'out', room: name, why: 'closed' }); } rooms.delete(name); return;
  }
  if (!r.peers.size && name !== 'lobby') rooms.delete(name); else sendPeers(r);
}
function bye(c) { if (c.dead && !c.gone) return; c.dead = true; c.gone = 0; clearTimeout(c.gt); for (const n of [...c.rooms]) leaveRoom(c, n); clients.delete(c.id); }
// Se cortó el socket: si el jugador ya estaba dentro, se le guarda el sitio 45 s por si vuelve
function sockGone(c, sock) {
  if (c.sock !== sock || c.dead) return;
  if (!c.hello) return bye(c);
  c.sock = null; c.gone = Date.now(); clearTimeout(c.gt); c.gt = setTimeout(() => bye(c), GRACE);
  for (const n of c.rooms) { const r = rooms.get(n); if (r) sendPeers(r); }
}
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, '').slice(0, n);
async function discordWho(token) {
  try { const r = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + token } }); if (!r.ok) return null; const u = await r.json(); return { id: u.id, name: u.global_name || u.username, user: u.username, avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64` : '' }; } catch (e) { return null; }
}
const gameList = () => [...rooms.values()].filter(r => r.meta && r.peers.size).map(r => ({ room: r.name, name: r.meta.name, host: r.meta.hostName, n: r.peers.size, max: r.meta.max, lock: !!r.meta.pass, mode: r.meta.mode, dc: !!r.meta.requireDc, cheats: !!r.meta.cheats }));
async function onMsg(c, m) {
  const now = Date.now(); if (now - c.rateT > 1000) { c.rateT = now; c.rate = 0; } if (++c.rate > 120) return;
  const rep = (x) => wsSend(c, { ...x, rid: m.rid });
  if (m.op === 'ping') return wsSend(c, { op: 'pong', t: m.t });
  if (m.op === 'hello') {
    if (c.hello) return;
    // Reconexión: recupera el mismo jugador (mismo id, mismas salas) y le entrega lo que se perdió
    const rs = m.resume && clients.get(clean(m.resume.peer, 24));
    if (rs && rs.rt === String(m.resume.rt || '') && rs !== c) {
      const old = rs.sock; clearTimeout(rs.gt); rs.gone = 0; rs.dead = false; rs.sock = c.sock; rs.seen = Date.now(); rs.hello = true;
      c.dead = true; c.rebind(rs); c.rebound = rs; if (old && old !== c.sock) try { old._tc = () => ({ seen: 0 }); old.destroy(); } catch (e) { }
      const q = rs.q, lost = !!rs.qLost; rs.q = []; rs.qLost = false;
      wsSend(rs, { op: 'welcome', rid: m.rid, resumed: true, lost, peer: rs.id, rt: rs.rt, by: rs.by, name: rs.name, verified: !!rs.verified, avatar: rs.avatar || '', dcUser: rs.dcUser || '', lan: LOCAL_ONLY || PUBLIC ? [] : lanIPs(), port: PORT, public: PUBLIC || null, cloud: !!(DB && rs.verified), oauth: !!DC_SECRET });
      for (const o of q) wsSend(rs, o);
      for (const n of rs.rooms) { const r = rooms.get(n); if (r) sendPeers(r); }
      return;
    }
    c.hello = true;
    // Sesión del servidor (inicio de sesión hecho aquí) o, si no, token de Discord del navegador.
    // Si la base de datos falla un momento, se usa la caché: un fallo de la base no cierra la sesión de nadie.
    let su = null, sessRetry = false;
    if (m.sess && DB) { const t = String(m.sess); try { su = await DB.sessionUser(t); if (su) SESS_CACHE.set(t, su); else SESS_CACHE.delete(t); } catch (e) { su = SESS_CACHE.get(t) || null; if (!su) sessRetry = true; console.error('sesión', e.message); } }
    const dc = su ? { id: su.id.replace(/^dc:/, ''), name: su.name, user: su.username, avatar: su.avatar } : m.token ? await discordWho(String(m.token)) : null;
    if (dc && !su && DB) await DB.upsertUser({ id: 'dc:' + dc.id, name: dc.name, username: dc.user, avatar: dc.avatar }).catch(e => console.error('cuenta', e.message));
    if (dc) Object.assign(c, { by: 'dc:' + dc.id, name: dc.name, verified: true, avatar: dc.avatar, dcUser: dc.user, sess: su ? String(m.sess) : null });
    else Object.assign(c, { by: 'g:' + clean(m.gid, 24).replace(/[^a-z0-9]/gi, ''), name: clean(m.nick, 20) || 'Jugador', verified: false });
    clients.set(c.id, c); c.rooms.add('lobby'); room('lobby').peers.set(c.id, {});
    rep({ op: 'welcome', peer: c.id, by: c.by, name: c.name, verified: !!c.verified, avatar: c.avatar || '', dcUser: c.dcUser || '', rt: c.rt, tokenBad: !!(m.token && !dc), sessBad: !!(m.sess && !su && !sessRetry), sessRetry, lan: LOCAL_ONLY || PUBLIC ? [] : lanIPs(), port: PORT, public: PUBLIC || null, cloud: !!(DB && c.verified), oauth: !!DC_SECRET });
    sendPeers(room('lobby')); return;
  }
  if (!c.hello) return;
  const rn = clean(m.room, 48);
  switch (m.op) {
    case 'list': return rep({ op: 'list', games: gameList() });
    case 'create': {
      if (!/^[a-z0-9][a-z0-9_.-]{0,47}$/.test(rn) || rooms.has(rn)) return rep({ op: 'err', code: 'taken' });
      const mt = m.meta || {}, r = room(rn);
      r.meta = { host: c.id, hostName: c.verified ? c.name : (clean(mt.hostName, 20) || c.name), name: clean(mt.name, 40) || 'Partida', pass: clean(mt.pass, 40), max: Math.max(2, Math.min(32, +mt.max || 8)), mode: clean(mt.mode, 12), requireDc: !!mt.requireDc, cheats: !!mt.cheats, keep: mt.keep !== false, bans: new Set() };
      if (c.verified && DB) try { r.meta.bans = await DB.bans(c.by); } catch (e) { }
      r.peers.set(c.id, {}); c.rooms.add(rn); sendPeers(r); return rep({ op: 'joined', room: rn });
    }
    case 'join': {
      const r = rooms.get(rn);
      if (rn !== 'lobby' && (!r || !r.meta)) return rep({ op: 'err', code: 'not_found' });
      if (r.meta) { if (r.meta.bans.has(c.by)) return rep({ op: 'err', code: 'banned' }); if (r.meta.pass && clean(m.pass, 40) !== r.meta.pass) return rep({ op: 'err', code: 'bad_pass' }); if (r.peers.size >= r.meta.max) return rep({ op: 'err', code: 'full' }); if (r.meta.requireDc && !c.verified) return rep({ op: 'err', code: 'need_discord' }); }
      r.peers.set(c.id, {}); c.rooms.add(rn); sendPeers(r); return rep({ op: 'joined', room: rn });
    }
    case 'leave': leaveRoom(c, rn); return rep({ op: 'left', room: rn });
    case 'emit': { const r = rooms.get(rn); if (!r || !r.peers.has(c.id)) return; const t = clean(m.topic, 48), msg = { op: 'msg', room: rn, topic: t, data: m.data, peer: c.id, by: c.by, name: c.name, verified: !!c.verified };
      for (const id of r.peers.keys()) { const o = clients.get(id); if (o) wsSend(o, msg); } return; }
    case 'pres': { const r = rooms.get(rn); if (!r || !r.peers.has(c.id)) return; const p = m.p && typeof m.p === 'object' ? m.p : {}; if (JSON.stringify(p).length > 8192) return; r.peers.set(c.id, p); sendPeers(r); return; }
    case 'kick': { const r = rooms.get(rn); if (!r || !r.meta || r.meta.host !== c.id) return; const o = clients.get(clean(m.peer, 24)); if (!o || o === c) return; if (m.ban) { r.meta.bans.add(o.by); if (c.verified && DB) DB.addBan(c.by, o.by).catch(() => { }); } leaveRoom(o, rn, m.ban ? 'banned' : 'kicked'); return; }
    // ---- Mundos en la nube (solo con sesión de Discord) ----
    case 'saves': case 'save.get': case 'save.put': case 'save.del': {
      if (!c.verified || !DB) return rep({ op: 'err', code: 'need_discord' });
      const id = clean(m.id, 40).replace(/[^a-z0-9_-]/gi, '');
      try {
        if (m.op === 'saves') return rep({ op: 'saves', list: await DB.listSaves(c.by) });
        if (!id) return rep({ op: 'err', code: 'bad_id' });
        if (m.op === 'save.get') { const s = await DB.getSave(c.by, id); return s ? rep({ op: 'save', ...s }) : rep({ op: 'err', code: 'not_found' }); }
        if (m.op === 'save.del') { await DB.delSave(c.by, id); return rep({ op: 'ok' }); }
        const data = String(m.data || ''); if (!data || data.length > MAX_SAVE) return rep({ op: 'err', code: 'too_big' });
        if ((await DB.listSaves(c.by)).filter(x => x.id !== id).length >= 20) return rep({ op: 'err', code: 'quota' });
        await DB.putSave(c.by, id, clean(m.name, 40) || 'Mundo', data, m.meta && typeof m.meta === 'object' ? m.meta : {}); return rep({ op: 'ok' });
      } catch (e) { console.error('nube', e.message); return rep({ op: 'err', code: 'db' }); }
    }
    // ---- Personajes de la cuenta (hasta 5, con su inventario) ----
    case 'chars': case 'char.put': case 'char.del': {
      if (!c.verified || !DB) return rep({ op: 'err', code: 'need_discord' });
      const id = clean(m.id, 40).replace(/[^a-z0-9_-]/gi, '');
      try {
        if (m.op === 'chars') return rep({ op: 'chars', list: await DB.listChars(c.by) });
        if (!id) return rep({ op: 'err', code: 'bad_id' });
        if (m.op === 'char.del') { await DB.delChar(c.by, id); return rep({ op: 'ok' }); }
        const data = m.data && typeof m.data === 'object' ? m.data : null, txt = data && JSON.stringify(data);
        if (!txt || txt.length > 400000) return rep({ op: 'err', code: 'too_big' });
        if ((await DB.listChars(c.by)).filter(x => x.id !== id).length >= 5) return rep({ op: 'err', code: 'quota' });
        await DB.putChar(c.by, id, txt); return rep({ op: 'ok' });
      } catch (e) { console.error('personajes', e.message); return rep({ op: 'err', code: 'db' }); }
    }
    case 'logout': if (c.sess && DB) await DB.endSession(c.sess).catch(() => { }); return rep({ op: 'ok' });
    case 'meta': { const r = rooms.get(rn); if (!r || !r.meta || r.meta.host !== c.id) return; const mt = m.meta || {}; if ('pass' in mt) r.meta.pass = clean(mt.pass, 40); if (mt.max) r.meta.max = Math.max(2, Math.min(32, +mt.max)); if ('requireDc' in mt) r.meta.requireDc = !!mt.requireDc; if (mt.mode) r.meta.mode = clean(mt.mode, 12); if ('cheats' in mt) r.meta.cheats = !!mt.cheats; if ('keep' in mt) r.meta.keep = !!mt.keep; if (mt.name) r.meta.name = clean(mt.name, 40); return; }
  }
}
require('./almacen.js').openStore(ROOT).then(st => { DB = st; server.listen(PORT, LOCAL_ONLY ? '127.0.0.1' : '0.0.0.0', () => {
  console.log('\n  Taller Cinético — servidor en marcha (datos: ' + DB.kind + (DC_SECRET ? ', Discord por el servidor' : '') + ')\n');
  if (PUBLIC) console.log(`  En internet:         ${PUBLIC}/`);
  console.log(`  En este ordenador:   http://localhost:${PORT}/`);
  if (!LOCAL_ONLY) for (const ip of lanIPs()) console.log(`  En tu red (amigos):  http://${ip}:${PORT}/`);
  console.log('\n  Cierra esta ventana o pulsa Ctrl+C para apagarlo.\n');
}); });
process.on('unhandledRejection', e => console.error('Error sin capturar:', e && e.message || e));
process.on('uncaughtException', e => console.error('Excepción sin capturar:', e && e.stack || e));
server.on('error', e => { console.error(e.code === 'EADDRINUSE' ? `\n  El puerto ${PORT} ya está en uso. ¿Tienes el juego abierto en otra ventana?\n` : e); process.exit(1); });
