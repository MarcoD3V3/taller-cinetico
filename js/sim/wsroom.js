'use strict';
// =====================================================================================
//  Conexión con el servidor propio (servidor.js) por WebSocket. Imita la forma de las salas
//  de claude.ai (emit/on/presence/onPeers/join/leave) para que net.js use lo mismo en los dos
//  sitios, y añade lo que solo tiene el servidor propio: lista de partidas, contraseña,
//  máximo, expulsar/vetar y Discord verificado.
//  Conexión que no se cae: latido cada 10 s (si en 25 s no llega nada, la conexión está muerta
//  aunque el navegador no lo sepa) y reconexión automática. Al volver se recupera el mismo
//  jugador en las mismas salas («resume»): lo que mandaste mientras tanto sale al reconectar y
//  el servidor te entrega lo que te perdiste. Si el servidor se reinició, net.js vuelve a entrar.
// =====================================================================================
const guestId = () => { try { let g = localStorage.getItem('tc-gid'); if (!g) { g = Math.random().toString(36).slice(2, 12); localStorage.setItem('tc-gid', g); } return g; } catch (e) { return 'x' + Math.random().toString(36).slice(2, 10); } };
const WS_ERR = { too_big: 'El mundo es demasiado grande para la nube (máx. 8 MB comprimido).', quota: 'Ya tienes 20 mundos en la nube: borra alguno.', db: 'La base de datos no responde.', bad_pass: 'Contraseña incorrecta.', full: 'La partida está llena.', banned: 'Te han vetado en esta partida.', need_discord: 'Esta partida pide iniciar sesión con Discord.', not_found: 'Esa partida ya no existe.', taken: 'Ese código ya está en uso.', closed: 'La partida se ha cerrado.', kicked: 'El anfitrión te ha expulsado.', timeout: 'El servidor no responde.', same_account: 'Ya estás en esta partida con esta cuenta (en otra pestaña o en otro dispositivo). Una cuenta solo puede entrar una vez.', offline: 'Sin conexión con el servidor: reconectando…' };
// Al recargar la página en una partida (sim/mpstay.js lo apunta al salir): se recupera el mismo
// jugador del servidor, que aún te guarda el sitio unos segundos. Se usa una vez y se borra.
const WS_STAY = (() => { try { const o = JSON.parse(sessionStorage.getItem('tc-mp-stay')); sessionStorage.removeItem('tc-mp-stay'); return o && Date.now() - o.t < 10 * 60000 ? o : null; } catch (e) { return null; } })();
let _wsStayUsed = false;
function wsConnect(url, hello) {
  return new Promise((resolve, reject) => {
    const rooms = new Map(), wait = new Map(), conn = new Set(), reFns = new Set(), hostFns = new Set(), hoFns = new Set();
    let pendingHo = null, ws = null, me = null, rid = 0, open = false, closed = false, lastRx = Date.now(), tries = 0, reT = 0, api0 = null, out = [];
    const R = n => rooms.get(n) || (rooms.set(n, { h: {}, pf: new Set(), peers: Object.freeze([]), outFn: null }), rooms.get(n));
    // Sin conexión, lo que mandes espera (salvo la presencia, que solo vale la última)
    const send = o => { if (ws && ws.readyState === 1 && open) { ws.send(JSON.stringify(o)); return; } if (o.op === 'pres' || o.op === 'ping') return; if (out.length < 2000) out.push(o); };
    const ask = o => new Promise((ok, ko) => { const i = ++rid; wait.set(i, { ok, ko }); send({ ...o, rid: i }); setTimeout(() => { if (wait.has(i)) { wait.delete(i); ko({ code: open ? 'timeout' : 'offline', message: WS_ERR[open ? 'timeout' : 'offline'] }); } }, o.op && o.op.startsWith('save') ? 60000 : 10000); });
    const sender = m => ({ peer: m.peer, by: m.by, name: m.name, verified: !!m.verified, isMe: !!me && m.by === me.by, sameTab: !!me && m.peer === me.peer, kind: 'viewer', guest: !m.verified, away: !!m.away });
    const api = n => { const r = R(n); return {
      name: n,
      emit: async (topic, data) => send({ op: 'emit', room: n, topic, data }),
      on: (topic, fn) => { (r.h[topic] || (r.h[topic] = new Set())).add(fn); return () => r.h[topic].delete(fn); },
      presence: async p => { r.mine = { ...(r.mine || {}), ...p }; for (const k in r.mine) if (r.mine[k] === null) delete r.mine[k]; send({ op: 'pres', room: n, p: r.mine }); },
      peers: () => r.peers,
      onPeers: fn => { r.pf.add(fn); setTimeout(() => fn({ peers: r.peers, joined: r.peers, left: [], updated: [] }), 0); return () => r.pf.delete(fn); },
      connected: () => open, onConnection: fn => { conn.add(fn); setTimeout(() => fn(open), 0); return () => conn.delete(fn); },
      onOut: fn => { r.outFn = fn; },
      leave: async () => { send({ op: 'leave', room: n }); rooms.delete(n); },
    }; };
    const setOpen = v => { if (open === v) return; open = v; for (const f of conn) try { f(v); } catch (e) { console.warn(e); } };
    function onMsg(e) {
      lastRx = Date.now();
      let m; try { m = JSON.parse(e.data); } catch (er) { return; }
      if (m.op === 'pong') return;
      if (m.rid && wait.has(m.rid)) { const w = wait.get(m.rid); wait.delete(m.rid); if (m.op === 'err') w.ko({ code: m.code, message: WS_ERR[m.code] || m.code }); else w.ok(m); }
      if (m.op === 'welcome') {
        const first = !me, resumed = !!m.resumed; me = Object.assign(me || {}, m); tries = 0;
        if (first) { api0 = Object.assign(api('lobby'), {
          me, server: url,
          join: async (name, pass) => { const a = await ask({ op: 'join', room: name, pass }); const r = R(name); r.pass = pass; r.info = a; return api(name); },
          create: async (name, meta) => { const a = await ask({ op: 'create', room: name, meta }); const r = R(name); r.meta = meta; r.info = a; return api(name); },
          // Tras recargar la página con la conexión recuperada: ya estás en la sala, solo falta el asa
          attach: name => { R(name); return api(name); },
          info: name => (rooms.get(name) || {}).info || null,
          hoPut: (name, data, z) => send({ op: 'ho.put', room: name, data, z: !!z }),
          hoAck: wid => send({ op: 'ho.ack', wid }),
          onHandoff: fn => { hoFns.add(fn); if (pendingHo) { const l = pendingHo; pendingHo = null; setTimeout(() => fn(l), 0); } return () => hoFns.delete(fn); },
          list: async () => (await ask({ op: 'list' })).games || [],
          kick: (name, peer, ban) => send({ op: 'kick', room: name, peer, ban: !!ban }),
          meta: (name, meta) => { const r = rooms.get(name); if (r) r.meta = { ...(r.meta || {}), ...meta }; send({ op: 'meta', room: name, meta }); },
          _drop: () => { try { ws && ws.close(); } catch (er) { } }, // pruebas: simula un corte
          close: () => { closed = true; clearTimeout(reT); try { ws && ws.close(); } catch (er) { } setOpen(false); },
          logout: () => send({ op: 'logout' }),
          onReconnect: fn => { reFns.add(fn); return () => reFns.delete(fn); },
          onHost: fn => { hostFns.add(fn); return () => hostFns.delete(fn); },
          saves: async () => (await ask({ op: 'saves' })).list || [],
          saveGet: async id => ask({ op: 'save.get', id }),
          savePut: async (id, name, data, meta) => ask({ op: 'save.put', id, name, data, meta }),
          saveDel: async id => ask({ op: 'save.del', id }),
          chars: async () => (await ask({ op: 'chars' })).list || [],
          charPut: async (id, data) => ask({ op: 'char.put', id, data }),
          charDel: async id => ask({ op: 'char.del', id }),
        }); setOpen(true); resolve(api0); return; }
        // Reconexión: primero sale lo que esperaba, luego se avisa a net.js
        setOpen(true);
        if (resumed) { const q = out; out = []; for (const o of q) send(o); for (const [n, r] of rooms) if (r.mine && n !== 'lobby') send({ op: 'pres', room: n, p: r.mine }); }
        else out = out.filter(o => o.op === 'save.put' || o.op === 'char.put');
        for (const f of reFns) try { f({ resumed, lost: !!m.lost }); } catch (er) { console.warn(er); }
        return;
      }
      if (m.op === 'msg') { const r = rooms.get(m.room); if (!r) return; for (const f of r.h[m.topic] || []) try { f({ ...sender(m), topic: m.topic, data: m.data }); } catch (er) { console.warn(er); } return; }
      if (m.op === 'peers') { const r = rooms.get(m.room); if (!r) return; const old = new Map(r.peers.map(p => [p.peer, p]));
        r.peers = Object.freeze(m.peers.map(p => Object.freeze({ ...sender(p), presence: p.presence || {}, updatedAt: Date.now(), avatar: p.avatar })));
        const joined = r.peers.filter(p => !old.has(p.peer)), left = [...old.values()].filter(p => !r.peers.some(q => q.peer === p.peer));
        for (const f of r.pf) f({ peers: r.peers, joined, left, updated: r.peers }); return; }
      if (m.op === 'handoff') { for (const f of hoFns) try { f(m.list || []); } catch (er) { console.warn(er); } if (!hoFns.size) pendingHo = m.list; return; }
      if (m.op === 'host') { const r = rooms.get(m.room); if (r && m.meta) r.info = { ...(r.info || {}), owner: m.meta.owner, wid: m.meta.wid }; for (const f of hostFns) try { f(m); } catch (er) { console.warn(er); } return; }
      if (m.op === 'out') { const r = rooms.get(m.room); rooms.delete(m.room); if (r && r.outFn) r.outFn(m.why); }
    }
    function dial() {
      if (closed) return;
      let w; try { w = new WebSocket(url); } catch (e) { if (!me) reject(e); else later(); return; }
      ws = w; lastRx = Date.now();
      w.onopen = () => { if (ws !== w) return; const h = { op: 'hello', ...hello }; if (me && me.rt) h.resume = { peer: me.peer, rt: me.rt }; else if (WS_STAY && WS_STAY.peer && !_wsStayUsed) { _wsStayUsed = true; h.resume = { peer: WS_STAY.peer, rt: WS_STAY.rt }; } w.send(JSON.stringify(h)); };
      w.onmessage = e => { if (ws === w) onMsg(e); };
      w.onerror = () => { };
      w.onclose = () => { if (ws !== w) return; ws = null; setOpen(false); if (!me) { reject({ code: 'no_server', message: 'No hay servidor en ' + url }); return; } later(); };
    }
    // Reintentos cada vez más espaciados (0,5 s … 10 s), sin rendirse mientras haya partida
    function later() { if (closed) return; clearTimeout(reT); const d = Math.min(10000, 500 * Math.pow(2, tries++)); reT = setTimeout(dial, d); }
    // Latido: si en 25 s no llega nada (ni el «pong»), se fuerza el cierre y se reconecta
    const beat = setInterval(() => {
      if (closed) { clearInterval(beat); return; }
      if (ws && ws.readyState === 1 && open) { if (Date.now() - lastRx > 25000) { try { ws.close(); } catch (e) { } ws = null; setOpen(false); later(); return; } ws.send(JSON.stringify({ op: 'ping', t: Date.now() })); }
    }, 10000);
    // Al volver a la pestaña o recuperar la red: comprobar ya, sin esperar al siguiente latido
    const poke = () => { if (closed || !me) return; if (!ws || ws.readyState > 1) { clearTimeout(reT); tries = 0; dial(); } else if (ws.readyState === 1) { try { ws.send(JSON.stringify({ op: 'ping', t: Date.now() })); } catch (e) { } } };
    addEventListener('online', poke); document.addEventListener('visibilitychange', () => { if (!document.hidden) poke(); });
    dial();
  });
}
