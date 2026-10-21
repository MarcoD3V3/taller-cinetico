'use strict';
// =====================================================================================
//  Criaturas compartidas en línea: todos ven los mismos enemigos y animales.
//   · El anfitrión las simula (también alrededor de cada invitado: genera sus chunks, hace
//     aparecer fauna y enemigos cerca de ellos y los enemigos persiguen al jugador más cercano).
//   · 10 veces por segundo manda dónde está cada una («mobs»); los invitados las dibujan
//     suavizadas y no simulan las suyas.
//   · Los golpes de un invitado van al anfitrión, que decide; si el invitado remata, el botín
//     es suyo. Los ataques de los enemigos a un invitado le llegan como golpes («mob»/hit).
// =====================================================================================
const MS = { seq: 0, snap: 0, map: new Map(), amap: new Map(), proxies: new Map(), kills: [] };
const msNid = o => o._nid || (o._nid = ++MS.seq);
const msOn = () => inGame() && !NET.game.waiting;
const msHost = () => msOn() && NET.game.host && NET.peers.size > 0;
const msGuest = () => msOn() && !NET.game.host;
const msPeers = () => [...NET.peers.values()].map(o => ({ o, x: o.rx ?? (o.pr && o.pr.x), y: o.ry ?? (o.pr && o.pr.y) })).filter(p => p.x !== undefined);
// ---------- Anfitrión ----------
// Los enemigos van a por el jugador más cercano, sea quien sea
{ const t0 = foeTarget; foeTarget = f => { const r = t0(f); if (!msHost()) return r; let best = r;
  for (const p of msPeers()) { const d = dist(f.x, f.y, p.x, p.y); if (d < best.td) { let px = MS.proxies.get(p.o.peer); if (!px) MS.proxies.set(p.o.peer, px = { _peer: p.o.peer }); px.x = p.x; px.y = p.y; best = { tx: p.x, ty: p.y, td: d, tgt: px }; } }
  return best; }; }
{ const c0 = contactHit; contactHit = (f, tgt, mult) => { if (tgt && tgt._peer) { const D = f.D; netEmit('mob', { t: 'hit', to: tgt._peer, dmg: D.dmg * mult, wound: D.wound, cause: 'Atacado por: ' + D.n, el: D.venom ? 'poison' : D.el }); return; } c0(f, tgt, mult); }; }
// Los chunks cerca de cada invitado no se descargan
{ const p0 = chunkPinned; chunkPinned = (cx, cy) => { if (p0(cx, cy)) return true; if (!msHost()) return false; for (const p of msPeers()) if (Math.abs(Math.floor(p.x / T / CS) - cx) <= 2 && Math.abs(Math.floor(p.y / T / CS) - cy) <= 2) return true; return false; }; }
// Quién remató: si fue un invitado, el botín es suyo (el anfitrión no lo recibe)
let _msNetHit = 0;
{ const d0 = damageFoe; damageFoe = (f, dmg, el, src) => {
  if (msGuest() && f._nid && !_msNetHit) { netEmit('mob', { t: 'dmg', id: f._nid, dmg, el }); f.flash = 0.12; fxText(f.x + (Math.random() - 0.5) * 10, f.y - f.D.s - 4, Math.round(dmg), '#fff'); return; }
  if (!_msNetHit) f._lastHit = null; d0(f, dmg, el, src); }; }
const killFoeLocal = killFoe; // la muerte normal (botín, experiencia y efectos) para cuando remata un invitado
{ const k0 = killFoe; killFoe = f => {
  if (msHost() && f._lastHit && !(f.boss && f.D.revive && !f.revived)) { const i = FOES.indexOf(f); if (i >= 0) FOES.splice(i, 1); netEmit('mob', { t: 'kill', id: f._nid, to: f._lastHit }); return; }
  k0(f); }; }
function msHostTick(dt) {
  // Mundo vivo alrededor de cada invitado: chunks, fauna y enemigos
  if ((MS.gen = (MS.gen || 0) - dt) <= 0) { MS.gen = 1; for (const p of msPeers()) { const pcx = Math.floor(p.x / T / CS), pcy = Math.floor(p.y / T / CS); for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const c = getChunk(pcx + dx, pcy + dy); if (c && !c.faunaDone) spawnFauna(c); } } }
  if (typeof enemiesOn === 'function' && enemiesOn()) for (const p of msPeers()) { const real = S.player; S.player = { x: p.x, y: p.y }; try { spawnTick(dt); } catch (e) { } finally { S.player = real; } }
  // Proyectiles enemigos que alcanzan a un invitado
  for (let i = PROJ.length - 1; i >= 0; i--) { const pj = PROJ[i]; if (pj.team !== 'e') continue; for (const p of msPeers()) if (dist(pj.x, pj.y, p.x, p.y) < (pj.r || 6) + 8) { netEmit('mob', { t: 'hit', to: p.o.peer, dmg: pj.dmg, wound: pj.wound, cause: 'Atacado por: ' + (pj.src || 'un proyectil'), el: pj.el }); PROJ.splice(i, 1); break; } }
  // Instantánea de las criaturas cerca de alguien (10 por segundo)
  if ((MS.snap -= dt) > 0) return; MS.snap = 0.1;
  const ps = msPeers(), near = (x, y, r) => ps.some(p => Math.abs(p.x - x) < r && Math.abs(p.y - y) < r) || (Math.abs(S.player.x - x) < r && Math.abs(S.player.y - y) < r);
  const f = [], a = [];
  for (const o of FOES) if (near(o.x, o.y, 34 * T)) f.push([msNid(o), o.k, Math.round(o.x), Math.round(o.y), Math.max(0, Math.round(o.hp)), Math.round(o.mhp), o.face || 1, (o.boss ? 1 : 0) | (o.ag ? 2 : 0) | (o.flash > 0 ? 4 : 0) | (o.frz > 0 ? 8 : 0)]);
  for (const o of ANIMALS) if (near(o.x, o.y, 30 * T)) a.push([msNid(o), o.sp, Math.round(o.x), Math.round(o.y), o.face || 1, o.sleep ? 1 : 0]);
  const t = ++MS.seq;
  for (let i = 0; i < Math.max(f.length, 1); i += 45) netEmit('mobs', { t, f: f.slice(i, i + 45) });
  for (let i = 0; i < a.length; i += 60) netEmit('mobs', { t, a: a.slice(i, i + 60) });
}
// ---------- Invitado ----------
// No aparecen criaturas propias: se ven las del anfitrión
{ const s0 = spawnTick; spawnTick = dt => { if (msGuest()) return; s0(dt); }; }
{ const s0 = spawnFauna; spawnFauna = c => { if (msGuest()) { c.faunaDone = true; return; } s0(c); }; }
{ const s0 = spawnFoe; spawnFoe = (k, x, y, extra) => { if (msGuest() && !(extra && extra._net)) { netEmit('mob', { t: 'spawn', k, x: Math.round(x), y: Math.round(y) }); return makeFoe(k, x, y, extra); } return s0(k, x, y, extra); }; }
// Movimiento suavizado hacia lo último que mandó el anfitrión (sin su inteligencia)
{ const s0 = stepFoe; stepFoe = (f, dt) => { if (!msGuest() || !f._nid) return s0(f, dt); f.ph += dt * 6; if (f.flash > 0) f.flash -= dt; const k = Math.min(1, dt * 12); f.x += (f._tx - f.x) * k; f.y += (f._ty - f.y) * k; }; }
{ const a0 = faunaTick; faunaTick = dt => { if (!msGuest()) return a0(dt); const k = Math.min(1, dt * 10), now = performance.now();
  for (let i = ANIMALS.length - 1; i >= 0; i--) { const o = ANIMALS[i]; if (!o._nid) continue; if (now - o._seen > 900) { ANIMALS.splice(i, 1); MS.amap.delete(o._nid); continue; } const dx = o._tx - o.x, dy = o._ty - o.y; o.x += dx * k; o.y += dy * k; o.t = (o.t || 0) + (Math.abs(dx) + Math.abs(dy) > 0.5 ? dt * 8 : 0); o.moving = Math.abs(dx) + Math.abs(dy) > 0.5; }
  for (let i = FOES.length - 1; i >= 0; i--) { const o = FOES[i]; if (o._nid && now - o._seen > 900) { FOES.splice(i, 1); MS.map.delete(o._nid); } } }; }
// Cazar un animal compartido: el botín es tuyo y el anfitrión lo quita del mundo
{ const h0 = huntAnimal; huntAnimal = (a, w, got) => { if (msGuest() && a._nid) { MS.kills.push(a._nid); queueMicrotask(() => { if (MS.kills.length) { netEmit('mob', { t: 'akill', ids: MS.kills.splice(0) }); } }); } return h0(a, w, got); }; }
function msTakeSnap(d) {
  const now = performance.now();
  for (const [id, k, x, y, hp, mhp, face, fl] of d.f || []) { let o = MS.map.get(id);
    if (!o) { if (!(ENEMIES[k] || BOSSES[k])) continue; o = makeFoe(k, x, y, { _nid: id, _net: 1 }); MS.map.set(id, o); FOES.push(o); }
    o._tx = x; o._ty = y; o.hp = hp; o.mhp = mhp; o.face = face; o.ag = fl & 2 ? 1 : 0; if (fl & 4) o.flash = 0.12; o.frz = fl & 8 ? 1 : 0; o._seen = now; if (!FOES.includes(o)) FOES.push(o); }
  for (const [id, sp, x, y, face, sl] of d.a || []) { let o = MS.amap.get(id);
    if (!o) { if (!SPECIES[sp]) continue; const tx = Math.floor(x / T), ty = Math.floor(y / T), c = getChunk(tx >> CSH, ty >> CSH); o = { sp, x, y, tx: 0, ty: 0, t: 0, face, ph: Math.random() * 6, ck: ckey(c.cx, c.cy), cx: c.cx, cy: c.cy, _nid: id }; MS.amap.set(id, o); ANIMALS.push(o); }
    o._tx = x; o._ty = y; o.face = face; o.sleep = sl ? 1 : 0; o._seen = now; if (!ANIMALS.includes(o)) ANIMALS.push(o); }
}
// ---------- Mensajes ----------
function msWire(r) {
  const g = NET.game;
  r.on('mobs', m => { if (m.sameTab || g.host || !m.data || (g.hostPeer && m.peer !== g.hostPeer) || g.waiting) return; msTakeSnap(m.data); });
  r.on('mob', m => { if (m.sameTab || !m.data || !S) return; const d = m.data, me = myPeer(r);
    if (d.t === 'hit' && d.to === me && !g.host) hitPlayer(+d.dmg || 0, d.wound, String(d.cause || '').slice(0, 60), d.el);
    if (d.t === 'kill' && d.to === me && !g.host) { const f = MS.map.get(d.id); if (f) { MS.map.delete(d.id); _msNetHit++; try { const i = FOES.indexOf(f); if (i < 0) FOES.push(f); f.hp = 0; killFoeLocal(f); } finally { _msNetHit--; } } }
    if (!g.host) return;
    if (d.t === 'dmg') { const f = FOES.find(o => o._nid === d.id); if (f) { _msNetHit++; try { f._lastHit = m.peer; damageFoe(f, Math.min(+d.dmg || 0, 9999), d.el); } finally { _msNetHit--; } } }
    if (d.t === 'akill' && Array.isArray(d.ids)) for (const id of d.ids.slice(0, 30)) { const i = ANIMALS.findIndex(o => o._nid === id); if (i >= 0) ANIMALS.splice(i, 1); }
    if (d.t === 'spawn' && (ENEMIES[d.k] || BOSSES[d.k]) && (NET.game.opt || {}).cheats) spawnFoe(d.k, +d.x || 0, +d.y || 0);
  });
}
{ const w0 = wireGame; wireGame = r => { w0(r); msWire(r); }; }
// Al salir o entrar en una partida, las criaturas reflejadas se olvidan
{ const l0 = netLeave; netLeave = async (q, gone) => { const wasGuest = msGuest(); const r = await l0(q, gone); if (wasGuest) { MS.map.clear(); MS.amap.clear(); } return r; }; }
setInterval(() => { if (S && msHost()) msHostTick(0.05); }, 50);
