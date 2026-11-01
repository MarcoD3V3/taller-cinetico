'use strict';
// =====================================================================================
//  Lo que hacen los demás jugadores, visto desde tu partida.
//  · Cada jugador apunta en su estado (el que ya se manda ~20 veces por segundo) lo que acaba
//    de hacer: hechizos, mega hechizos y disparos. Cada evento se repite en varios envíos
//    durante 1,2 s, así que aunque se pierda un paquete llega igual (y nunca se repite: cada
//    uno tiene su número).
//  · Al recibirlo, tu juego lanza ESE MISMO hechizo desde su posición y hacia su cursor, en
//    «modo fantasma»: se ve todo igual que si fuera tuyo, pero no hace daño (ya lo hace él),
//    ni te cura, ni te mueve, ni te gasta maná. Se lanza con el mismo pequeño retraso con el
//    que ves su muñeco, para que coincida con su movimiento.
// =====================================================================================
const NFX = { q: [], last: 0 };
function netFxPush(...d) { if (typeof inGame !== 'function' || !inGame()) return; const id = NFX.last = Math.max(NFX.last + 1, Date.now()); NFX.q.push({ t: performance.now(), d: [id, ...d] }); }
function netFxList() { const now = performance.now(); while (NFX.q.length && (now - NFX.q[0].t > 1200 || NFX.q.length > 14)) NFX.q.shift(); return NFX.q.map(e => e.d); }
const nfxR = v => Math.round(v);
// ---------- Lo tuyo: qué se apunta ----------
{ const c0 = castSpell; castSpell = slot => {
  const mid = typeof megaHeld === 'function' ? megaHeld() : null, st = spellState(), k = mid ? megaKey(mid) : st.slots[slot], before = (P.scd[k] || 0) > 0;
  c0(slot);
  if (!k || before || !(P.scd[k] > 0)) return; const p = S.player, mw = mouseWorld();
  netFxPush(mid ? 'm' : 'c', mid || k, nfxR(p.x), nfxR(p.y), nfxR(mw.x), nfxR(mw.y));
}; }
{ const a0 = playerAttack; playerAttack = (id, mw) => { const np = PROJ.length, r = a0(id, mw), L = [];
  for (let i = np; i < PROJ.length && L.length < 6; i++) { const pj = PROJ[i]; if (pj.team === 'p') L.push([nfxR(pj.x), nfxR(pj.y), nfxR(pj.vx), nfxR(pj.vy), pj.c || '#e8e0c8', pj.r || 4, +(pj.life || 1).toFixed(2), pj.glow ? 1 : 0]); }
  if (L.length) netFxPush('p', L); return r; }; }
// ---------- Lo de los demás: repetirlo aquí ----------
function peerCx(o) { return o._cx || (o._cx = { nick: o.nick, p: { get x() { return o.rx ?? o.pr.x; }, set x(v) { }, get y() { return o.ry ?? o.pr.y; }, set y(v) { } }, m: { get x() { return o.pr.ax ?? o.rx ?? o.pr.x; }, get y() { return o.pr.ay ?? o.ry ?? o.pr.y; } } }); }
function netFxRecv(o, pr) {
  if (!Array.isArray(pr.ev)) return; const first = o.evLast === undefined; let mx = o.evLast || 0;
  for (const e of pr.ev) { if (!Array.isArray(e) || !(e[0] > (o.evLast || 0))) continue; mx = Math.max(mx, e[0]); if (first) continue; // al entrar no se repite lo de antes
    const delay = typeof peerDelay === 'function' ? peerDelay(o) : 110; setTimeout(() => { try { netReplay(o, e); } catch (x) { } }, delay); }
  o.evLast = mx;
}
function netReplay(o, e) {
  if (!S || !NET.peers || ![...NET.peers.values()].includes(o)) return; const [, k, a0] = e, cx = peerCx(o); cx.nick = o.nick;
  const px = cx.p.x, py = cx.p.y; if (Math.abs(px - S.player.x) > 40 * T || Math.abs(py - S.player.y) > 30 * T) return; // muy lejos: no se ve
  const c0 = SCX, g0 = SGH, np = PROJ.length, nh = HAZ.length; SCX = cx; SGH = true;
  try {
    if (k === 'c') { const s = SPELLS[a0]; if (!s) return; if (s.mortal) mortalIntro(s); if (SK[s.kind]) SK[s.kind](s); else baseGhost(s); castFx(s, px, py, np, nh); }
    else if (k === 'm') { const M = MEGA[a0]; if (!M) return; mortalIntro(M); MK[M.kind](M); }
    else if (k === 'p') { for (const [x, y, vx, vy, c, r, life, glow] of a0 || []) PROJ.push({ x, y, vx, vy, r, c, life, team: 'v', glow, dmg: 0, hit: new Set() }); }
  } finally { ghostify(np, nh); SCX = c0; SGH = g0; }
}
// Los hechizos básicos (los del juego original) en versión solo visual
function baseGhost(s) {
  const p = cp(), m = cm(), a = Math.atan2(m.y - p.y, m.x - p.x);
  switch (s.kind) {
    case 'proj': PROJ.push({ x: p.x, y: p.y, vx: Math.cos(a) * s.spd * T, vy: Math.sin(a) * s.spd * T, r: 7, dmg: 0, c: s.c, team: 'v', life: 1.6, glow: 1, hit: new Set() }); break;
    case 'missiles': for (let i = 0; i < s.n2; i++) { const aa = a + (i - (s.n2 - 1) / 2) * 0.35; PROJ.push({ x: p.x, y: p.y, vx: Math.cos(aa) * 9 * T, vy: Math.sin(aa) * 9 * T, r: 5, dmg: 0, c: s.c, team: 'v', life: 1.2, glow: 1, hit: new Set() }); } break;
    case 'chain': case 'drain': { let f = nearestFoe(m.x, m.y, 8 * T), from = { x: p.x, y: p.y - 8 }; const seen = new Set(); for (let i = 0; i < (s.n2 || 1) && f; i++) { seen.add(f); addBolt(from.x, from.y, f.x, f.y, s.c, 0.25); sparkRing(f.x, f.y, 10, s.c, 100, { life: 0.3 }); from = f; f = nearestFoe(f.x, f.y, 4 * T, o => !seen.has(o)); } break; }
    case 'nova': FX.push({ x: p.x, y: p.y, ring: s.r, t: 0.45, c: s.c }); break;
    case 'cloud': case 'hole': HAZ.push({ x: m.x, y: m.y, r: s.r, t: s.t, kind: s.kind === 'hole' ? 'hole' : 'pool', dps: 0, team: 'v', c: s.c, el: s.el }); break;
    case 'storm': efx({ life: s.t, upd(dt) { if (every(this, 'k', dt, 0.35)) { const pl = cp(), tg = FOES.filter(f => dist(f.x, f.y, pl.x, pl.y) < s.r), f = tg[(Math.random() * tg.length) | 0]; if (f) addBolt(f.x + rnd(-30, 30), f.y - 220, f.x, f.y, '#f0f05a', 0.25); } } }); break;
    case 'summon': sparkRing(p.x + 20, p.y, 24, s.c, 70, { up: 40 }); break;
  }
}
// Red de seguridad: nada que ocurra en modo fantasma hace daño de verdad
{ const d0 = damageFoe; damageFoe = (f, dmg, el, src) => SGH ? undefined : d0(f, dmg, el, src); }
