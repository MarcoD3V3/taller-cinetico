'use strict';
// =====================================================================================
//  Flechas (datos en data/arrows.js): qué flecha dispara el arco, sus efectos al impactar,
//  su estela y su icono. El arco usa la primera flecha del inventario (en orden de ranuras).
// =====================================================================================
function pickArrow() { if (!S || !S.inv) return null; for (const s of S.inv) { if (!s || !s.n) continue; const b = String(s.id).split('~')[0]; if (ARROWS[b] && ITEMS[b] && ITEMS[b].arrowFx) return s.id; } return null; }
let _arwPick = null, _arwLast = null; const ARW_LIVE = [];
{ const w0 = weaponProfile; weaponProfile = id => { const p = w0(id); if (p && p.ammo === 'arrow') { const a = pickArrow(); if (a) { _arwPick = a; return { ...p, ammo: a }; } } return p; }; }
{ const a0 = playerAttack; playerAttack = (id, mw) => {
  _arwPick = null; const n0 = PROJ.length, r = a0(id, mw), aid = _arwPick; _arwPick = null; if (!aid) return r;
  const A = ARROWS[String(aid).split('~')[0]]; if (!A) return r;
  if (aid !== _arwLast && PROJ.length > n0) { _arwLast = aid; toast('🏹 Disparas: ' + ITEMS[aid].n); }
  for (let i = n0; i < PROJ.length; i++) { const pj = PROJ[i]; if (pj.team !== 'p') continue;
    pj.dmg = (pj.dmg + (A.add || 0)) * (A.mul || 1); if (A.spd) { pj.vx *= A.spd; pj.vy *= A.spd; }
    pj.pierce = (pj.pierce || 0) + (A.pierce || 0); if (A.homing) pj.homing = 1; if (A.boom) pj.boom = A.boom; if (A.el) pj.el = A.el; if (A.slow) pj.slow = A.slow;
    pj.c = A.hd; pj.arw = aid; pj.arrow = true; ARW_LIVE.push({ pj, A, seen: new Set(pj.hit) }); }
  return r;
}; }
// Daño continuo (quemadura, veneno, sangrado) con su propia fuerza
function arwDot(f, dps, t, c) { const d = f.adot || (f.adot = []); d.push({ dps, t, c }); if (d.length > 6) d.shift(); }
function arwHit(f, pj, A) {
  if (!f || f.hp <= 0 && !FOES.includes(f)) return; const boss = f.boss, x = f.x, y = f.y;
  if (A.crit && Math.random() < A.crit) { damageFoe(f, pj.dmg, pj.el); fxText(x, y - f.D.s - 10, '¡crítico!', '#ffd34a'); }
  if (A.burn) { arwDot(f, A.burn[0], A.burn[1], '#ff8a2a'); f.burn = Math.max(f.burn || 0, A.burn[1]); }
  if (A.poison) { arwDot(f, A.poison[0], A.poison[1], '#8ad84a'); f.poison = Math.max(f.poison || 0, A.poison[1]); }
  if (A.bleed && Math.random() < A.bleed) { arwDot(f, 3 + pj.dmg * 0.08, 4, '#ff6b5b'); fxText(x, y - f.D.s - 6, '🩸', '#ff6b5b'); }
  if (A.frz) f.frz = Math.max(f.frz || 0, boss ? A.frz / 3 : A.frz); if (A.slow) f.slow = Math.max(f.slow || 0, A.slow);
  if (A.stun) f.stun = Math.max(f.stun || 0, boss ? A.stun / 3 : A.stun);
  if (A.kb && !boss) { const a = Math.atan2(y - S.player.y, x - S.player.x); f.x += Math.cos(a) * 22; f.y += Math.sin(a) * 22; }
  if (A.tag) { f.tag = Math.max(f.tagT > S.time ? f.tag || 0 : 0, A.tag); f.tagT = S.time + 5; }
  if (A.drain && survOn()) { S.pc.hp = Math.min(maxHp(), S.pc.hp + pj.dmg * A.drain); }
  if (A.mana && survOn()) S.pc.mana = Math.min(maxMana(), S.pc.mana + A.mana);
  if (A.chain) { let from = f; const done = new Set([f]); for (let i = 0; i < A.chain; i++) { const o = nearestFoe(from.x, from.y, 5 * T, q => !done.has(q)); if (!o) break; done.add(o); FX.push({ x: from.x, y: from.y, x2: o.x, y2: o.y, bolt: 1, t: 0.22, c: A.hd }); damageFoe(o, pj.dmg * 0.5, A.el === 'fire' ? 'fire' : 'storm'); from = o; } }
  if (A.split) for (let i = 0; i < A.split; i++) { const a = Math.atan2(pj.vy, pj.vx) + (i - (A.split - 1) / 2) * 0.55 + Math.PI * (A.split > 4 ? i / A.split * 2 : 0); const sp = 14 * T;
    PROJ.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 3, dmg: pj.dmg * 0.4, c: A.hd, team: 'p', life: 0.45, pierce: 0, boom: A.boom ? Math.round(A.boom * 0.4) : 0, el: A.el, homing: A.homing ? 1 : 0, glow: 1, hit: new Set([f]) }); }
}
{ const c0 = combatTick; combatTick = dt => {
  c0(dt); if (!S) return;
  for (let i = ARW_LIVE.length - 1; i >= 0; i--) { const L2 = ARW_LIVE[i]; for (const f of L2.pj.hit) if (!L2.seen.has(f)) { L2.seen.add(f); arwHit(f, L2.pj, L2.A); } if (!PROJ.includes(L2.pj)) ARW_LIVE.splice(i, 1); }
  if (ARW_LIVE.length > 200) ARW_LIVE.splice(0, ARW_LIVE.length - 200);
  for (const f of FOES.slice()) { if (!f.adot || !f.adot.length) continue; let d = 0; for (const o of f.adot) { o.t -= dt; d += o.dps * dt; } f.adot = f.adot.filter(o => o.t > 0); if (f.hp > 0 && d > 0) { f.hp -= d; if (f.hp <= 0) killFoe(f); } }
}; }
// ---------- Estela y punta de las flechas en vuelo ----------
{ const d0 = drawCombat; drawCombat = (ctx, k, ox, oy, x0, y0, x1, y1) => {
  d0(ctx, k, ox, oy, x0, y0, x1, y1); if (!S) return;
  for (const pj of PROJ) { if (!pj.arw) continue; const A = ARROWS[String(pj.arw).split('~')[0]]; if (!A) continue; const a = Math.atan2(pj.vy, pj.vx), c = Math.cos(a), s = Math.sin(a);
    if (A.r >= 1 || A.light) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(pj.x, pj.y, pj.x - c * (18 + A.r * 6), pj.y - s * (18 + A.r * 6)); g.addColorStop(0, A.hd); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.strokeStyle = g; ctx.lineWidth = 2 + A.r * 0.8; ctx.beginPath(); ctx.moveTo(pj.x, pj.y); ctx.lineTo(pj.x - c * (18 + A.r * 6), pj.y - s * (18 + A.r * 6)); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = A.hd; ctx.beginPath(); ctx.moveTo(pj.x + c * 4, pj.y + s * 4); ctx.lineTo(pj.x - c * 2 - s * 3, pj.y - s * 2 + c * 3); ctx.lineTo(pj.x - c * 2 + s * 3, pj.y - s * 2 - c * 3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = A.fl; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pj.x - c * 9 - s * 2.5, pj.y - s * 9 + c * 2.5); ctx.lineTo(pj.x - c * 7, pj.y - s * 7); ctx.lineTo(pj.x - c * 9 + s * 2.5, pj.y - s * 9 - c * 2.5); ctx.stroke(); }
  // Quemaduras y venenos fuertes: chispitas sobre el enemigo
  const t = performance.now() / 1000; for (const f of FOES) if (f.adot && f.adot.length) { const o = f.adot[f.adot.length - 1]; ctx.fillStyle = o.c; ctx.globalAlpha = 0.8; for (let i = 0; i < 3; i++) { const yy = f.y - f.D.s * 0.5 - ((t * 30 + i * 9) % 18); ctx.fillRect(f.x - 6 + i * 6, yy, 2, 2); } ctx.globalAlpha = 1; }
}; }
// ---------- Icono: astil en diagonal, punta según el tipo y plumas ----------
function drawArrowIcon(c, id, s) {
  const A = ARROWS[id], r = s / 2, R = A.r; c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.rotate(Math.PI / 4);
  c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = r * 0.17; c.beginPath(); c.moveTo(0, r * 0.95); c.lineTo(0, -r * 0.45); c.stroke(); c.strokeStyle = A.sh; c.lineWidth = r * 0.1; c.stroke();
  // plumas
  c.fillStyle = A.fl; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(0, r * 0.55); c.lineTo(sd * r * (0.22 + R * 0.02), r * 0.72); c.lineTo(sd * r * (0.22 + R * 0.02), r * 1.02); c.lineTo(0, r * 0.88); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 0.7; c.stroke(); }
  // punta
  if (R >= 2) { c.shadowColor = A.hd; c.shadowBlur = r * (0.25 + R * 0.08); }
  const y = -r * 0.45, f = A.form; c.fillStyle = A.hd; c.beginPath();
  if (f === 'broad') { c.moveTo(0, y - r * 0.55); c.lineTo(r * 0.3, y + r * 0.02); c.lineTo(0, y - r * 0.08); c.lineTo(-r * 0.3, y + r * 0.02); }
  else if (f === 'barb') { c.moveTo(0, y - r * 0.55); c.lineTo(r * 0.24, y); c.lineTo(r * 0.08, y - r * 0.04); c.lineTo(r * 0.22, y + r * 0.14); c.lineTo(0, y + r * 0.02); c.lineTo(-r * 0.22, y + r * 0.14); c.lineTo(-r * 0.08, y - r * 0.04); c.lineTo(-r * 0.24, y); }
  else if (f === 'needle') { c.moveTo(0, y - r * 0.62); c.lineTo(r * 0.1, y + r * 0.02); c.lineTo(-r * 0.1, y + r * 0.02); }
  else if (f === 'blunt') { c.rect(-r * 0.16, y - r * 0.26, r * 0.32, r * 0.3); }
  else if (f === 'crystal') { c.moveTo(0, y - r * 0.6); c.lineTo(r * 0.18, y - r * 0.2); c.lineTo(r * 0.1, y + r * 0.06); c.lineTo(-r * 0.1, y + r * 0.06); c.lineTo(-r * 0.18, y - r * 0.2); }
  else if (f === 'orb') { c.arc(0, y - r * 0.18, r * 0.2, 0, 7); }
  else if (f === 'bomb') { c.arc(0, y - r * 0.18, r * 0.22, 0, 7); }
  else if (f === 'star') { for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, q = i % 2 ? r * 0.11 : r * 0.28; c.lineTo(Math.cos(a) * q, y - r * 0.2 + Math.sin(a) * q); } }
  else if (f === 'flame') { c.moveTo(0, y - r * 0.62); c.quadraticCurveTo(r * 0.3, y - r * 0.2, r * 0.14, y + r * 0.06); c.lineTo(-r * 0.14, y + r * 0.06); c.quadraticCurveTo(-r * 0.3, y - r * 0.2, 0, y - r * 0.62); }
  else { c.moveTo(0, y - r * 0.5); c.lineTo(r * 0.2, y + r * 0.02); c.lineTo(-r * 0.2, y + r * 0.02); }
  c.closePath(); c.fill(); c.shadowBlur = 0; c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 0.9; c.stroke();
  if (f === 'bomb') { c.fillStyle = '#ffd060'; c.beginPath(); c.arc(r * 0.12, y - r * 0.42, r * 0.07, 0, 7); c.fill(); }
  if (f === 'orb' || f === 'crystal') { c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(-r * 0.06, y - r * 0.26, r * 0.05, 0, 7); c.fill(); }
  c.restore();
  if (R >= 3) { c.fillStyle = R >= 4 ? '#f0c75e' : '#fff'; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, q = i % 2 ? r * 0.04 : r * 0.15; c.lineTo(-r * 0.5 + Math.cos(a) * q, -r * 0.55 + Math.sin(a) * q); } c.closePath(); c.fill(); }
}
{ const d0 = drawItemPath; drawItemPath = (c, id, s) => { const b = String(id).split('~')[0]; return ARROWS[b] ? drawArrowIcon(c, b, s) : d0(c, id, s); }; }
