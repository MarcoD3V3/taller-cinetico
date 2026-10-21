'use strict';
// =====================================================================================
//  Conexión con el servidor propio (servidor.js) por WebSocket. Imita la forma de las salas
//  de claude.ai (emit/on/presence/onPeers/join/leave) para que net.js use lo mismo en los dos
//  sitios, y añade lo que solo tiene el servidor propio: lista de partidas, contraseña,
//  máximo, expulsar/vetar y Discord verificado.
// =====================================================================================
const guestId = () => { try { let g = localStorage.getItem('tc-gid'); if (!g) { g = Math.random().toString(36).slice(2, 12); localStorage.setItem('tc-gid', g); } return g; } catch (e) { return 'x' + Math.random().toString(36).slice(2, 10); } };
const WS_ERR = { too_big: 'El mundo es demasiado grande para la nube (máx. 8 MB comprimido).', quota: 'Ya tienes 20 mundos en la nube: borra alguno.', db: 'La base de datos no responde.', bad_pass: 'Contraseña incorrecta.', full: 'La partida está llena.', banned: 'Te han vetado en esta partida.', need_discord: 'Esta partida pide iniciar sesión con Discord.', not_found: 'Esa partida ya no existe.', taken: 'Ese código ya está en uso.', closed: 'El anfitrión ha cerrado la partida.', kicked: 'El anfitrión te ha expulsado.', timeout: 'El servidor no responde.' };
function wsConnect(url, hello) {
  return new Promise((resolve, reject) => {
    let ws; try { ws = new WebSocket(url); } catch (e) { return reject(e); }
    const rooms = new Map(), wait = new Map(), conn = new Set(); let me = null, rid = 0, open = false;
    const R = n => rooms.get(n) || (rooms.set(n, { h: {}, pf: new Set(), peers: Object.freeze([]), outFn: null }), rooms.get(n));
    const send = o => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
    const ask = o => new Promise((ok, ko) => { const i = ++rid; wait.set(i, { ok, ko }); send({ ...o, rid: i }); setTimeout(() => { if (wait.has(i)) { wait.delete(i); ko({ code: 'timeout', message: WS_ERR.timeout }); } }, o.op && o.op.startsWith('save') ? 60000 : 8000); });
    const sender = m => ({ peer: m.peer, by: m.by, name: m.name, verified: !!m.verified, isMe: !!me && m.by === me.by, sameTab: !!me && m.peer === me.peer, kind: 'viewer', guest: !m.verified });
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
    ws.onmessage = e => {
      let m; try { m = JSON.parse(e.data); } catch (er) { return; }
      if (m.rid && wait.has(m.rid)) { const w = wait.get(m.rid); wait.delete(m.rid); if (m.op === 'err') w.ko({ code: m.code, message: WS_ERR[m.code] || m.code }); else w.ok(m); }
      if (m.op === 'welcome') { me = m; open = true; const lobby = api('lobby'); resolve(Object.assign(lobby, {
        me, server: url,
        join: async (name, pass) => { await ask({ op: 'join', room: name, pass }); return api(name); },
        create: async (name, meta) => { await ask({ op: 'create', room: name, meta }); return api(name); },
        list: async () => (await ask({ op: 'list' })).games || [],
        kick: (name, peer, ban) => send({ op: 'kick', room: name, peer, ban: !!ban }),
        meta: (name, meta) => send({ op: 'meta', room: name, meta }),
        close: () => { try { ws.close(); } catch (er) { } },
        logout: () => send({ op: 'logout' }),
        // Mundos en la nube (requieren sesión de Discord en el servidor)
        saves: async () => (await ask({ op: 'saves' })).list || [],
        saveGet: async id => ask({ op: 'save.get', id }),
        savePut: async (id, name, data, meta) => ask({ op: 'save.put', id, name, data, meta }),
        saveDel: async id => ask({ op: 'save.del', id }),
      })); return; }
      if (m.op === 'msg') { const r = rooms.get(m.room); if (!r) return; for (const f of r.h[m.topic] || []) try { f({ ...sender(m), topic: m.topic, data: m.data }); } catch (er) { console.warn(er); } return; }
      if (m.op === 'peers') { const r = rooms.get(m.room); if (!r) return; const old = new Map(r.peers.map(p => [p.peer, p]));
        r.peers = Object.freeze(m.peers.map(p => Object.freeze({ ...sender(p), presence: p.presence || {}, updatedAt: Date.now(), avatar: p.avatar })));
        const joined = r.peers.filter(p => !old.has(p.peer)), left = [...old.values()].filter(p => !r.peers.some(q => q.peer === p.peer));
        for (const f of r.pf) f({ peers: r.peers, joined, left, updated: r.peers }); return; }
      if (m.op === 'out') { const r = rooms.get(m.room); rooms.delete(m.room); if (r && r.outFn) r.outFn(m.why); }
    };
    ws.onopen = () => send({ op: 'hello', ...hello });
    ws.onerror = () => { if (!me) reject({ code: 'no_server', message: 'No hay servidor en ' + url }); };
    ws.onclose = () => { open = false; for (const f of conn) f(false); if (!me) reject({ code: 'no_server', message: 'No hay servidor en ' + url }); };
  });
}
