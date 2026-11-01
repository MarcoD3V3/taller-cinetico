'use strict';
// =====================================================================================
//  Clones de combate (hechizos en data/clones.js).
//  · Al lanzarlos aparecen alrededor de ti y se REPARTEN: cada enemigo cercano se asigna al
//    clon que tenga cerca y menos trabajo, así cada uno pelea contra su propio grupo.
//  · Los enemigos asignados atacan a su clon (te ignoran) hasta matarlo; entonces pasan a otro
//    clon libre o vuelven a por ti. Los proyectiles enemigos también les dan.
//  · Cada variante: cuerpo a cuerpo, arqueros o magos, con su efecto (quemar, frenar, robar
//    vida, furia, provocar, curar…). Se dibujan como tú, con un aura de su color y su vida.
// =====================================================================================
const CLONES = [];
const clAlive = c => c && c.hp > 0 && CLONES.includes(c);
const clHeld = { melee: () => ITEMS.ironSword ? 'ironSword' : Object.keys(ITEMS).find(k => ITEMS[k].s === 'sword'), ranged: () => Object.keys(ITEMS).find(k => ITEMS[k].s === 'bow'), caster: () => Object.keys(ITEMS).find(k => ITEMS[k].s === 'staff') };
SK.clones = s => {
  const p = S.player, held = (clHeld[s.v] || clHeld.melee)();
  for (let i = 0; i < s.k; i++) { const a = i / s.k * 6.283; let x = p.x + Math.cos(a) * 34, y = p.y + Math.sin(a) * 24; if (!passable(x, y, { fly: 1 })) { x = p.x; y = p.y; }
    CLONES.push({ s, x, y, hp: s.hp * pwr(), mhp: s.hp * pwr(), t: s.t, cd: rnd(0, 0.4), fa: a, walk: 0, mv: false, sw: 0, flash: 0, held, i, tg: null, born: 0 });
    sparkRing(x, y - 10, 18, s.c, 120, { life: 0.5 }); FX.push({ x, y, ring: 22, t: 0.4, c: s.c }); }
  SFX.sig.push({ x: p.x, y: p.y, c: s.c, t: 0, life: 1.1, r: 48, rot: 0 }); screenFlash(s.c, 0.18); shake = Math.max(shake || 0, 0.2);
  tone(440, 0.25, 'triangle', 0.05, 1.5); tone(660, 0.25, 'triangle', 0.04, 1.5, 0.08); clAssign(true);
};
// Reparto: cada enemigo al clon con menos carga (y cerca); los «provocadores» atraen más
function clAssign(all) {
  const live = CLONES.filter(c => c.hp > 0); if (!live.length) return; const load = new Map(live.map(c => [c, 0]));
  for (const f of FOES) if (clAlive(f.clT)) load.set(f.clT, (load.get(f.clT) || 0) + 1);
  const p = S.player, cand = FOES.filter(f => f.hp > 0 && !f.boss && dist(f.x, f.y, p.x, p.y) < 16 * T && (all || !clAlive(f.clT))).sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y));
  for (const f of cand) { let best = null, bs = 1e9; for (const c of live) { const sc = dist(f.x, f.y, c.x, c.y) / T + load.get(c) * (c.s.taunt ? 1.5 : 4); if (sc < bs) { bs = sc; best = c; } } if (best) { f.clT = best; load.set(best, load.get(best) + 1); } }
  // Cada clon persigue a «su» grupo: su objetivo es el enemigo asignado más cercano
  for (const c of live) c.tg = null;
}
// Los enemigos con clon asignado van a por él (te dejan en paz)
{ const t0 = foeTarget; foeTarget = f => { if (f.clT && clAlive(f.clT)) { const c = f.clT; return { tx: c.x, ty: c.y, td: dist(f.x, f.y, c.x, c.y), tgt: c }; } if (f.clT) f.clT = null; return t0(f); }; }
function clDie(c) {
  const s = c.s; sparkRing(c.x, c.y - 10, 24, s.c, 140, { life: 0.6 }); for (let i = 0; i < 4; i++) fxSmoke(c.x, c.y, 'rgba(160,160,180,', 5);
  if (s.boom) { for (const f of foesIn(c.x, c.y, s.boom)) mHit(f, s.dmg * 2.5 * pwr(), 'fire'); FX.push({ x: c.x, y: c.y, ring: s.boom, t: 0.45, c: s.c }); shake = Math.max(shake || 0, 0.2); sfx('boom'); }
  if (s.nova) { for (const f of foesIn(c.x, c.y, 80)) mHit(f, s.dmg * 2 * pwr(), 'holy'); if (S.pc && dist(c.x, c.y, S.player.x, S.player.y) < 120) S.pc.hp = Math.min(maxHp(), S.pc.hp + 12); FX.push({ x: c.x, y: c.y, ring: 80, t: 0.5, c: '#fff' }); }
  CLONES.splice(CLONES.indexOf(c), 1); for (const f of FOES) if (f.clT === c) f.clT = null; clAssign(false);
}
function clTick(dt) {
  if (!CLONES.length) return; if (every(clTick, 'ra', dt, 0.6)) clAssign(false);
  for (const c of CLONES.slice()) { const s = c.s; c.t -= dt; c.born += dt; c.cd -= dt; c.sw = Math.max(0, c.sw - dt * 4); c.flash = Math.max(0, c.flash - dt);
    if (c.hp <= 0 || c.t <= 0) { clDie(c); continue; }
    // Objetivo: primero los enemigos que le tocan; si no, el más cercano sin dueño
    if (!c.tg || c.tg.hp <= 0 || !FOES.includes(c.tg)) { let best = null, bd = 1e9; for (const f of FOES) { if (f.hp <= 0) continue; const own = f.clT === c, free = !clAlive(f.clT); if (!own && !free) continue; const d = dist(c.x, c.y, f.x, f.y) * (own ? 1 : 1.8); if (d < bd && d < 16 * T) { bd = d; best = f; } } c.tg = best; }
    const f = c.tg, p = S.player; let tx, ty, want = 0;
    if (f) { const d = dist(c.x, c.y, f.x, f.y), reach = s.v === 'melee' ? f.D.s + 16 : s.v === 'ranged' ? 5 * T : 6 * T; tx = f.x; ty = f.y; c.fa = Math.atan2(f.y - c.y, f.x - c.x);
      if (s.v === 'melee') want = d > reach ? 1 : 0; else want = d > reach ? 1 : d < 3 * T ? -1 : 0;
      if (d <= reach + 4 && c.cd <= 0) { const rage = s.rage ? 1 + (1 - c.hp / c.mhp) * 1.5 : 1; c.cd = s.acd; c.sw = 1;
        if (s.v === 'melee') { mHit(f, s.dmg * rage * pwr(), s.el); efx({ life: 0.18, x: c.x, y: c.y - 10, a: c.fa, col: s.c, draw(ctx) { ctx.globalAlpha = 1 - this.t / 0.18; ctx.strokeStyle = this.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(this.x, this.y, 18, this.a - 1, this.a + 1); ctx.stroke(); } });
          if (s.burn) f.burn = 3; if (s.chill) { f.slow = 2; if (Math.random() < 0.15 && !bigFoe(f)) f.frz = 1.2; } if (s.stun && !bigFoe(f)) f.stun = Math.max(f.stun, s.stun); if (s.steal && S.pc) S.pc.hp = Math.min(maxHp(), S.pc.hp + s.dmg * s.steal); if (s.heal && S.pc) S.pc.hp = Math.min(maxHp(), S.pc.hp + s.heal);
          if (Math.random() < 0.5) sparkRing(f.x, f.y, 6, s.c, 80, { life: 0.25 }); }
        else if (s.v === 'ranged') { const a = Math.atan2(f.y - c.y, f.x - c.x); mProj({ x: c.x, y: c.y - 10, vx: Math.cos(a) * 22 * T, vy: Math.sin(a) * 22 * T, r: 3, dmg: s.dmg * pwr(), c: s.c, el: s.el, life: 1, pierce: 1 }, s); }
        else { const a = Math.atan2(f.y - c.y, f.x - c.x); mProj({ x: c.x, y: c.y - 10, vx: Math.cos(a) * 13 * T, vy: Math.sin(a) * 13 * T, r: 6, dmg: s.dmg * pwr(), c: s.c, el: 'fire', life: 1.4, boom: 50 }, s); sparkRing(c.x, c.y - 14, 10, s.c, 70, { life: 0.3 }); } } }
    else { const a = c.i / s.k * 6.283 + performance.now() / 2000; tx = p.x + Math.cos(a) * 40; ty = p.y + Math.sin(a) * 28; want = dist(c.x, c.y, tx, ty) > 10 ? 1 : 0; }
    // Moverse, sin amontonarse con los otros clones
    let mx = 0, my = 0; if (want) { const a = Math.atan2(ty - c.y, tx - c.x); mx = Math.cos(a) * want; my = Math.sin(a) * want; }
    for (const o of CLONES) if (o !== c) { const d = dist(c.x, c.y, o.x, o.y); if (d < 22 && d > 0) { mx += (c.x - o.x) / d * 0.8; my += (c.y - o.y) / d * 0.8; } }
    const L = Math.hypot(mx, my); c.mv = L > 0.1; if (c.mv) { const v = 2.9 * T * (s.spd || 1) * dt / Math.max(1, L), nx = c.x + mx * v, ny = c.y + my * v; const W2 = { fly: 1 }; if (passable(nx, ny, W2)) { c.x = nx; c.y = ny; } else if (passable(nx, c.y, W2)) c.x = nx; else if (passable(c.x, ny, W2)) c.y = ny; /* flotan sobre rocas y agua (si no, se atascaban si volabas) */ c.walk += dt * 8; }
    if (Math.random() < 0.25) fxAdd({ x: c.x + rnd(-8, 8), y: c.y - rnd(0, 22), vx: 0, vy: rnd(-25, -10), life: 0.5, t: 0, size: 1.8, col: s.c, glow: 1, drag: 0.5 });
  }
  // Los proyectiles enemigos también les dan
  for (const pj of PROJ) { if (pj.team !== 'e' || pj.life <= 0) continue; for (const c of CLONES) if (dist(pj.x, pj.y, c.x, c.y - 8) < 12) { c.hp -= pj.dmg || 8; c.flash = 0.15; pj.life = 0; break; } }
}
// Los golpes cuerpo a cuerpo de los enemigos ya los descuentan (contactHit resta tgt.hp); aquí solo el destello
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); if (S) clTick(fdt); }; }
{ const d0 = drawFxWorld; drawFxWorld = ctx => { d0(ctx); if (!CLONES.length || !S) return; let look; try { look = charData().look; } catch (e) { return; } const eq = { ...S.equip };
  for (const c of [...CLONES].sort((a, b) => a.y - b.y)) { const s = c.s, sc = 1.6 / (s.sc ? 1.45 : 1), app = Math.min(1, c.born * 4), fade = Math.min(1, c.t * 2);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; disk(ctx, c.x, c.y - 12, 20 + Math.sin(c.born * 6 + c.i) * 2, s.c, 0.18 * fade); ctx.globalAlpha = 0.5 * fade; ctx.strokeStyle = s.c; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(c.x, c.y + 2, 12, 5, 0, 0, 7); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.82 * app * fade; try { drawAvatar(ctx, look, eq, c.x, c.y, c.fa, c.walk, c.mv, sc, c.held, c.sw); } catch (e) { } ctx.restore();
    if (c.flash > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; disk(ctx, c.x, c.y - 12, 14, '#ff4040', c.flash * 3); ctx.restore(); }
    const w = 22, k = Math.max(0, c.hp / c.mhp); ctx.save(); ctx.globalAlpha = fade; ctx.fillStyle = '#000a'; ctx.fillRect(c.x - w / 2, c.y - 36, w, 3); ctx.fillStyle = s.c; ctx.fillRect(c.x - w / 2, c.y - 36, w * k, 3); ctx.restore(); } }; }
// Al morir el jugador o terminar una oleada no quedan clones sueltos
{ const r0 = respawn; respawn = () => { CLONES.length = 0; r0(); }; }
