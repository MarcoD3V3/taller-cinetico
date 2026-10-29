'use strict';
// =====================================================================================
//  Mecánica del Arsenal del Gran Taller (datos en data/terra.js):
//   · Yoyó: con el clic pulsado va hacia el ratón (hasta su alcance) y golpea a todo lo que toca.
//   · Gancho: se lanza, se clava en la roca o un muro y te arrastra hasta allí.
//   · Látigo: golpe largo y estrecho; marca al enemigo (tus invocaciones y tú le hacéis más daño).
//   · Espadas con rayo: al golpear sale una onda que corta a distancia.
//   · Explosivos: se lanzan; algunos dejan fuego, hielo, veneno, metralla o un pozo del vacío.
//   · Varas de invocación: criaturas que pelean a tu lado (gastan maná).
//   · Pociones y objetos de maná: efectos con F; el maná máximo permanente se guarda en la partida.
// =====================================================================================
const trBase = id => (id || '').split('~')[0];
const trOf = id => TR[trBase(id)];
const trW = id => (typeof WEAPONS !== 'undefined' && WEAPONS[id]) || (ITEMS[id] && ITEMS[id].weapon) || null;
let YO = null, HK = null;
// ---------- Efectos temporales y maná permanente (en los modificadores del personaje) ----------
const tbuf = () => (S && (S.tbuf || (S.tbuf = {}))) || {};
let _tbSig = '', _tbBase = null, _tbOut = null;
{ const c0 = charMods; charMods = eqOver => {
  const m = c0(eqOver); if (eqOver || !S) return m;
  const B = S.tbuf, perm = S.pc && S.pc.manaPerm; let sig = '';
  if (B) for (const k in B) sig += k + ',';
  if (perm) for (const k in perm) sig += k + perm[k] + ';';
  if (!sig) return m;
  if (m === _tbBase && sig === _tbSig && _tbOut) return _tbOut;
  const o = { ...m };
  if (B) for (const k in B) { const md = B[k].mods; if (md) for (const x in md) { if (typeof o[x] === 'number' && (x === 'def' || x === 'hp' || x === 'mana' || x === 'stam' || x === 'warm' || x === 'luck' || x === 'night' || x === 'fire')) o[x] += md[x]; else if (typeof o[x] === 'number') o[x] *= md[x]; else o[x] = md[x]; } }
  if (perm) for (const k in perm) { const e = ITEMS[k] && ITEMS[k].tmana; if (e && e.perm) o.mana += e.perm * perm[k]; }
  _tbBase = m; _tbSig = sig; _tbOut = o; return o;
}; }
function tbufAdd(key, id, mods, t, regen) { const B = tbuf(); const cur = B[key]; if (cur && cur.g > (ITEMS[id].rar || 0) && cur.t > 5) { toastErr('Ya tienes un efecto más fuerte de ese tipo'); return false; } B[key] = { id, t, mods, regen, g: ITEMS[id].rar || 0 }; return true; }
// Regeneración de vida y fin de los efectos
setInterval(() => { if (!S || !S.tbuf || (ui.open && !(typeof inGame === 'function' && inGame()) && ui.open !== 'inv')) return; const B = S.tbuf, dt = 0.25;
  for (const k in B) { const b = B[k]; b.t -= dt; if (b.regen && S.pc && survOn()) S.pc.hp = Math.min(maxHp(), S.pc.hp + b.regen * dt); if (b.t <= 0) { delete B[k]; toast('Se acabó el efecto: ' + ITEMS[b.id].n); } } }, 250);
{ const b0 = buffHTML; buffHTML = () => { const h = b0(); const B = S && S.tbuf; if (!B) return h; const ks = Object.keys(B); if (!ks.length) return h;
  return h + `<div class="small inf">${ks.map(k => { const b = B[k]; return `<span style="color:${ITEMS[b.id].c}">✦</span> ${esc(ITEMS[b.id].n)} ${Math.floor(b.t / 60)}:${String(Math.floor(b.t % 60)).padStart(2, '0')}`; }).join(' · ')}</div>`; }; }
// ---------- Beber y consumir con F ----------
{ const u0 = useItem; useItem = () => {
  const s = S.inv[S.sel]; if (!s) return u0(); const id = trBase(s.id), it = ITEMS[id]; if (!it || !(it.tpot || (it.tmana && !it.tmana.acc))) return u0();
  const pc = S.pc, used = (() => {
    if (it.tpot) { const e = it.tpot; let ok = false;
      if (e.heal) { if (!survOn() || pc.hp < maxHp()) { if (survOn()) pc.hp = Math.min(maxHp(), pc.hp + e.heal); fxText(S.player.x, S.player.y - 22, '+' + e.heal, '#ff5a6a', true); ok = true; } else toastErr('Ya tienes la vida llena'); }
      if (e.mana) { if (!survOn() || pc.mana < maxMana()) { if (survOn()) pc.mana = Math.min(maxMana(), pc.mana + e.mana); fxText(S.player.x, S.player.y - 22, '+' + e.mana + ' ✦', '#6a8aff', true); ok = true; } else toastErr('Ya tienes el maná lleno'); }
      if (e.t) { if (tbufAdd('p:' + e.k, id, e.mods, e.t, e.regen)) { toast(`✦ ${it.n} durante ${e.t / 60} min`); ok = true; } }
      return ok; }
    const e = it.tmana;
    if (e.perm) { const P2 = pc.manaPerm || (pc.manaPerm = {}); if ((P2[id] || 0) >= e.cap) { toastErr(`Ya has usado ${e.cap} ${it.n}: no hace más efecto`); return false; } P2[id] = (P2[id] || 0) + 1; toast(`✦ Maná máximo +${e.perm} (${P2[id]}/${e.cap})`, true); if (survOn()) pc.mana = Math.min(maxMana(), pc.mana + e.perm); return true; }
    let ok = false;
    if (e.inst) { if (survOn()) pc.mana = Math.min(maxMana(), pc.mana + e.inst); fxText(S.player.x, S.player.y - 22, e.inst > 5000 ? '✦ lleno' : '+' + e.inst + ' ✦', '#6a8aff', true); ok = true; }
    if (e.buff && tbufAdd('m:' + id, id, e.buff, e.t)) { toast(`✦ ${it.n} durante ${e.t / 60} min`); ok = true; }
    return ok;
  })();
  if (used) { tone(520, 0.12, 'sine', 0.04, 1.4); if (--s.n <= 0) S.inv[S.sel] = null; invVersion++; vitalsDirty = true; }
  return true;
}; }
// ---------- El marcado del látigo: más daño de todo lo que le pegue ----------
{ const d0 = damageFoe; damageFoe = (f, dmg, el, src) => { if (f && f.tagT > (S ? S.time : 0) && dmg > 0) dmg += f.tag || 0; return d0(f, dmg, el, src); }; }
// ---------- Ataques nuevos ----------
const trCol = (id, el) => (el && TR_EL[el]) || (trOf(id) || {}).c || '#fff';
{ const a0 = playerAttack; playerAttack = (id, mw) => {
  const w = trW(id), T0 = trOf(id); if (!w || !T0) return a0(id, mw);
  const p = S.player, a = Math.atan2(mw.y - p.y, mw.x - p.x);
  if (w.yoyo) { if (!YO || YO.id !== id) YO = { id, x: p.x, y: p.y, back: false, hit: new Map(), spin: 0 }; else YO.back = false; P.swingA = a; return true; }
  if (w.hook) { if (!mouse.hookDone && (!HK || HK.state === 'back')) { mouse.hookDone = true; HK = { id, x: p.x, y: p.y, vx: Math.cos(a) * w.hook.fly * T, vy: Math.sin(a) * w.hook.fly * T, d: 0, state: 'fly', hit: new Set() }; sfx('shoot'); wearHeld(1); } return true; }
  if (P.cd > 0) return true;
  if (w.whip) {
    const pr = weaponProfile(id), reach = w.whip.reach * T, sp = w.spd || 1; P.cd = 0.62 * sp; P.swing = 0.22; P.swingA = a; sfx('swing');
    FX.push({ whip: 1, x: p.x, y: p.y, a, len: reach, t: 0.22, t0: 0.22, c: trCol(id, w.el), c2: T0.c2 });
    let hit = 0; for (const f of FOES.slice()) { const dx = f.x - p.x, dy = f.y - p.y, along = dx * Math.cos(a) + dy * Math.sin(a), perp = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)); if (along < -8 || along > reach + f.D.s || perp > f.D.s + 12) continue;
      damageFoe(f, pr.dmg * CM().melee * 0.85, w.el); f.tag = w.whip.tag; f.tagT = S.time + 5; hit++; }
    if (hit) wearHeld(1); return true;
  }
  if (w.summon) {
    const sm = w.summon; if (survOn() && S.pc.mana < sm.mana) { toastErr('Sin maná'); P.cd = 0.4; return true; }
    if (survOn()) S.pc.mana -= sm.mana; P.cd = 0.7; P.swing = 0.15; P.swingA = a; sfx('spell');
    const mine = SUMMONS.filter(s => s.tstaff); while (mine.length >= sm.max) { const o = mine.shift(); SUMMONS.splice(SUMMONS.indexOf(o), 1); }
    const pw = 1 + 0.05 * lvOf('magic'); SUMMONS.push({ x: mw.x, y: mw.y, hp: sm.hp, mhp: sm.hp, t: sm.t, dmg: sm.dmg * pw, cd: 0, c: T0.c, sp: sm.sp, tstaff: id });
    FX.push({ x: mw.x, y: mw.y, ring: 40, t: 0.5, c: T0.c }); wearHeld(1); return true;
  }
  // Rango normal: lo dispara el juego; aquí se le añaden los rasgos nuevos a lo que sale
  const n0 = PROJ.length, cd0 = P.cd, r = a0(id, mw);
  if (w.ranged) for (let i = n0; i < PROJ.length; i++) { const pj = PROJ[i]; if (w.ranged.homing) pj.homing = 1; if (w.ranged.slow) pj.slow = w.ranged.slow; if (w.ranged.glow || T0.fam === 'wand') { pj.glow = 1; pj.r = Math.max(pj.r, 5); }
    pj.c = trCol(id, w.el); if (T0.fam === 'boomer' || T0.fam === 'bomb') { pj.art = trBase(id); pj.arrow = false; pj.r = T0.fam === 'bomb' ? 6 : 7; }
    if (T0.fam === 'bomb') { pj.post = w.post; pj.fuse = 1; } }
  // Espadas con rayo: una onda que sale con el golpe
  if (w.beam && P.cd > cd0) { const pr = weaponProfile(id), sp = 17 + (T0.p || 0) * 6;
    PROJ.push({ x: p.x + Math.cos(a) * 16, y: p.y + Math.sin(a) * 16, vx: Math.cos(a) * sp * T, vy: Math.sin(a) * sp * T, r: 7, dmg: pr.dmg * w.beam * CM().melee, c: trCol(id, w.el), team: 'p', life: 0.55 + (w.ancient ? 0.25 : 0), pierce: w.ancient ? 4 : 2, boom: 0, el: w.el, glow: 1, beam: a, hit: new Set() }); }
  return r;
}; }
addEventListener('mouseup', () => { mouse.hookDone = false; });
// ---------- Explosivos: lo que queda después ----------
function trPost(pj) {
  const k = pj.post, R = pj.boom || 60;
  if (k === 'big') { explode(pj.x, pj.y, R * 0.6, pj.dmg * 0.5, 'p', pj.el); shake = Math.max(shake || 0, 0.35); }
  if (k === 'frag' || k === 'cluster') { const n = k === 'cluster' ? 6 : 10; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, s = (k === 'cluster' ? 6 : 14) * T; PROJ.push({ x: pj.x, y: pj.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 3, dmg: pj.dmg * (k === 'cluster' ? 0.4 : 0.18), c: pj.c, team: 'p', life: k === 'cluster' ? 0.35 : 0.3, pierce: 0, boom: k === 'cluster' ? Math.round(R * 0.4) : 0, el: pj.el, hit: new Set() }); } }
  if (k === 'fire' || k === 'poison') HAZ.push({ kind: 'pool', team: 'p', x: pj.x, y: pj.y, r: R * 0.7, t: 5, dps: pj.dmg * 0.25, el: k === 'fire' ? 'fire' : 'poison', c: k === 'fire' ? '#ff6a1a' : '#8ad84a' });
  if (k === 'frost') for (const f of FOES) if (dist(pj.x, pj.y, f.x, f.y) < R + f.D.s) f.frz = f.boss ? 0.8 : 3;
  if (k === 'void') HAZ.push({ kind: 'hole', team: 'p', x: pj.x, y: pj.y, r: R * 0.9, t: 3, dps: pj.dmg * 0.2, el: 'void', c: '#3a1a6a' });
}
// ---------- Cada fotograma: yoyó y gancho ----------
{ const c0 = combatTick; combatTick = dt => {
  c0(dt); if (!S) return; const p = S.player;
  if (YO) {
    const id = YO.id, w = trW(id), held = trBase(heldId()) === trBase(id) && mouse.down && !ui.open;
    if (!w || !w.yoyo) YO = null;
    else {
      const mw = mouseWorld(), R = w.yoyo.range * T, sp = w.yoyo.spd * T;
      if (!held) YO.back = true;
      let tx, ty; if (YO.back) { tx = p.x; ty = p.y; } else { const a = Math.atan2(mw.y - p.y, mw.x - p.x), d = Math.min(R, dist(p.x, p.y, mw.x, mw.y)); tx = p.x + Math.cos(a) * d; ty = p.y + Math.sin(a) * d; }
      const d = dist(YO.x, YO.y, tx, ty), st = (YO.back ? sp * 1.6 : sp) * dt; if (d > st) { YO.x += (tx - YO.x) / d * st; YO.y += (ty - YO.y) / d * st; } else { YO.x = tx; YO.y = ty; }
      YO.spin += dt * 24; if (YO.back && dist(YO.x, YO.y, p.x, p.y) < 12) YO = null;
      else { const pr = weaponProfile(id), now = S.time; for (const f of FOES.slice()) { if (dist(YO.x, YO.y, f.x, f.y) > f.D.s + 12) continue; const lt = YO.hit.get(f) || 0; if (now - lt < w.yoyo.rate) continue; YO.hit.set(f, now); damageFoe(f, pr.dmg * CM().melee * 0.55, w.el); if (Math.random() < 0.3) wearHeld(1); } }
    }
  }
  if (HK) {
    const w = trW(HK.id), hk = w && w.hook; if (!hk) { HK = null; return; }
    if (HK.state === 'fly') {
      const sx = HK.vx * dt, sy = HK.vy * dt, steps = Math.ceil(Math.hypot(sx, sy) / 8);
      for (let i = 0; i < steps; i++) { const nx = HK.x + sx / steps, ny = HK.y + sy / steps;
        if (!passable(nx, ny, { fly: 1, proj: 1 })) { HK.state = 'pull'; HK.tx = HK.x; HK.ty = HK.y; HK.ax = nx; HK.ay = ny; HK.last = dist(p.x, p.y, HK.x, HK.y); tone(240, 0.06, 'square', 0.04, 0.6); break; }
        HK.x = nx; HK.y = ny; }
      for (const f of FOES) if (!HK.hit.has(f) && dist(HK.x, HK.y, f.x, f.y) < f.D.s + 6) { HK.hit.add(f); damageFoe(f, w.dmg * 5, w.el); }
      if (HK.state === 'fly' && dist(p.x, p.y, HK.x, HK.y) > hk.range * T) HK.state = 'back';
    } else if (HK.state === 'pull') {
      const d = dist(p.x, p.y, HK.tx, HK.ty), st = hk.spd * T * dt;
      if (d < 14 || keys.has(' ')) { HK = null; P.vz = 0; }
      else { const ox = p.x, oy = p.y, mx = (HK.tx - p.x) / d * Math.min(st, d), my = (HK.ty - p.y) / d * Math.min(st, d);
        // la cuerda te sube por las terrazas: solo frenan los muros y la roca (como al volar)
        const free = (x, y) => passable(x - 5, y + 5, 'player') && passable(x + 5, y + 5, 'player') && passable(x, y + 1, 'player');
        if (free(p.x + mx, p.y)) p.x += mx; if (free(p.x, p.y + my)) p.y += my; P.mvx = P.mvy = 0; P.z = Math.max(P.z || 0, 0.6); P.vz = 0; if (Math.hypot(p.x - ox, p.y - oy) < st * 0.2) { HK.stuck = (HK.stuck || 0) + dt; if (HK.stuck > 0.25) HK = null; } }
    } else { const d = dist(p.x, p.y, HK.x, HK.y), st = hk.fly * T * 1.4 * dt; if (d <= st + 8) HK = null; else { HK.x += (p.x - HK.x) / d * st; HK.y += (p.y - HK.y) / d * st; } }
  }
}; }
// ---------- Dibujo: yoyó, gancho, látigo, rayos y objetos lanzados ----------
{ const d0 = drawCombat; drawCombat = (ctx, k, ox, oy, x0, y0, x1, y1) => {
  d0(ctx, k, ox, oy, x0, y0, x1, y1); if (!S) return; const p = S.player, now = performance.now() / 1000;
  ctx.save();
  for (const pj of PROJ) { if (pj.team !== 'p') continue;
    if (pj.art) { ctx.save(); ctx.translate(pj.x, pj.y); ctx.rotate(now * (TR[pj.art].fam === 'bomb' ? 8 : 18)); drawItem(ctx, pj.art, 0, 0, TR[pj.art].fam === 'bomb' ? 14 : 18); ctx.restore(); }
    else if (pj.beam !== undefined) { ctx.save(); ctx.translate(pj.x, pj.y); ctx.rotate(pj.beam); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, pj.life * 2.5); ctx.fillStyle = pj.c; ctx.beginPath(); ctx.moveTo(10, 0); ctx.quadraticCurveTo(-2, -14, -12, -16); ctx.quadraticCurveTo(-4, 0, -12, 16); ctx.quadraticCurveTo(-2, 14, 10, 0); ctx.fill(); ctx.globalAlpha *= 0.5; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.quadraticCurveTo(0, -8, -6, -9); ctx.quadraticCurveTo(-1, 0, -6, 9); ctx.closePath(); ctx.fill(); ctx.restore(); }
  }
  if (YO) { const T0 = trOf(YO.id); ctx.strokeStyle = 'rgba(240,240,240,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y - 6); ctx.lineTo(YO.x, YO.y); ctx.stroke(); ctx.save(); ctx.translate(YO.x, YO.y); ctx.rotate(YO.spin); drawItem(ctx, YO.id, 0, 0, 16); ctx.restore();
    if (T0 && T0.r >= 2) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35; circ(ctx, YO.x, YO.y, 12, trCol(YO.id, T0.el)); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; } }
  if (HK) { const T0 = trOf(HK.id) || {}; ctx.strokeStyle = T0.c2 || '#c8c0b0'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(p.x, p.y - 6); ctx.lineTo(HK.state === 'pull' ? HK.tx : HK.x, HK.state === 'pull' ? HK.ty : HK.y); ctx.stroke(); ctx.setLineDash([]);
    const hx = HK.state === 'pull' ? HK.ax : HK.x, hy = HK.state === 'pull' ? HK.ay : HK.y; ctx.save(); ctx.translate(hx, hy); ctx.rotate(Math.atan2(hy - p.y, hx - p.x) + Math.PI / 4); drawItem(ctx, HK.id, 0, 0, 14); ctx.restore(); }
  for (const f of FX) { if (!f.whip) continue; const k2 = 1 - f.t / f.t0, a = f.a, L = f.len * Math.min(1, k2 * 2.2), wv = Math.sin(k2 * Math.PI) * 18;
    ctx.strokeStyle = f.c2; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(f.x, f.y);
    const mx = f.x + Math.cos(a) * L * 0.5 - Math.sin(a) * wv, my = f.y + Math.sin(a) * L * 0.5 + Math.cos(a) * wv, ex = f.x + Math.cos(a) * L, ey = f.y + Math.sin(a) * L; ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
    ctx.strokeStyle = f.c; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalCompositeOperation = 'lighter'; circ(ctx, ex, ey, 4 + 4 * (1 - k2), f.c); ctx.globalCompositeOperation = 'source-over'; }
  // Marca del látigo sobre el enemigo
  for (const f of FOES) if (f.tagT > S.time) { ctx.globalAlpha = 0.7; ctx.strokeStyle = '#ff7ad8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(f.x, f.y, f.D.s + 4 + Math.sin(now * 6) * 1.5, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.restore();
}; }
// ---------- Al soltar o cambiar de objeto, el yoyó vuelve ----------
setInterval(() => { if (YO && S && trBase(heldId()) !== trBase(YO.id)) YO.back = true; if (HK && S && !trW(HK.id)) HK = null; }, 200);
// ---------- Postura en la mano ----------
{ const g0 = avGrip; avGrip = id => { const T0 = trOf(id); if (!T0) return g0(id); return ({ sword: 'blade', ancient: 'heavy', gun: 'gun', boomer: 'item', hook: 'item', yoyo: 'item', whip: 'blade', xbow: 'xbow', bow: 'bow', wand: 'staff', bomb: 'item', summon: 'staff' })[T0.fam] || g0(id); }; }
// Los explosivos no se desgastan (se gastan al lanzarlos)
{ const w0 = wearHeld; wearHeld = n => { const s = S && S.inv[S.sel]; if (s) { const w = trW(s.id); if (w && w.noWear) return; } return w0(n); }; }
