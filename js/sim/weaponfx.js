'use strict';
// =====================================================================================
//  Golpes y rasgos de las armas:
//   · Cuerpo a cuerpo en abanico («porción de pizza») hacia donde apuntas: todo lo que
//     está dentro recibe el golpe. Cada familia tiene su porción: dagas estrecha, espadas
//     media, hachas y guadañas ancha, lanzas larga y fina. Se ve el abanico al golpear.
//   · Rasgos: spd (rapidez), crit (crítico ×2), stun (aturdir), bleed (sangrado),
//     kb (empuje), drain (te cura parte del daño).
//   · El personaje aguanta más: +50 de vida máxima, +30 de aguante y un 20 % menos de daño.
// =====================================================================================
const ARC_BY = { dagger: [1.1, 0], fang: [1.2, 0], sword: [1.75, 6], mace: [1.5, 2], hammer: [1.6, 2], baxe: [2.3, 4], scythe: [2.7, 8], spear: [0.7, 0] };
{ const w0 = weaponProfile; weaponProfile = id => {
  const pr = w0(id); if (!pr) return pr; const it = ITEMS[id], w = it.weapon;
  if (pr.kind === 'melee') { const a = ARC_BY[it.s]; if (a) { pr.arc = a[0] + (w.sweep ? Math.min(0.9, w.sweep / 60) : 0); pr.reach += a[1]; } }
  if (w.spd) pr.cd *= w.spd; return pr;
}; }
// Abanico visible al golpear
const SLICES = [];
let _atkW = null;
{ const a0 = playerAttack; playerAttack = (id, mw) => {
  const cd0 = P.cd, pr = weaponProfile(id); _atkW = WEAPONS[id] || null;
  let r; try { r = a0(id, mw); } finally { _atkW = null; }
  if (pr && pr.kind === 'melee' && P.cd > 0 && cd0 <= 0) { const p = S.player; SLICES.push({ x: p.x, y: p.y, a: Math.atan2(mw.y - p.y, mw.x - p.x), arc: pr.arc, r: pr.reach + 6, t: 0.2, t0: 0.2, c: pr.el === 'fire' ? '255,140,60' : pr.el === 'frost' ? '150,220,255' : pr.el === 'storm' ? '240,230,90' : pr.el === 'poison' ? '140,220,80' : '255,250,235' }); }
  return r;
}; }
function drawSlices(c, dt) {
  for (let i = SLICES.length - 1; i >= 0; i--) {
    const s = SLICES[i]; s.t -= dt; if (s.t <= 0) { SLICES.splice(i, 1); continue; }
    const k = s.t / s.t0, g = c.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r);
    g.addColorStop(0, `rgba(${s.c},0)`); g.addColorStop(0.65, `rgba(${s.c},${0.16 * k})`); g.addColorStop(1, `rgba(${s.c},${0.5 * k})`);
    c.fillStyle = g; c.beginPath(); c.moveTo(s.x, s.y); c.arc(s.x, s.y, s.r, s.a - s.arc / 2, s.a + s.arc / 2); c.closePath(); c.fill();
    c.strokeStyle = `rgba(${s.c},${0.8 * k})`; c.lineWidth = 2; c.beginPath(); c.arc(s.x, s.y, s.r, s.a - s.arc / 2 + (1 - k) * s.arc * 0.6, s.a + s.arc / 2); c.stroke();
  }
}
let _slT = performance.now();
{ const d0 = drawFxWorld; drawFxWorld = c => { d0(c); const n = performance.now(), dt = Math.min(0.05, (n - _slT) / 1000); _slT = n; if (SLICES.length) drawSlices(c, dt); }; }
// Rasgos al acertar con el arma en la mano
{ const d0 = damageFoe; damageFoe = (f, dmg, el) => {
  const w = _atkW; if (!w || !f || f.hp === undefined) return d0(f, dmg, el);
  if (w.crit && Math.random() < w.crit) { dmg *= 2; fxText(f.x, f.y - f.D.s - 14, '¡Crítico!', '#ffd34a', true); }
  const r = d0(f, dmg, el), p = S.player;
  if (w.stun && Math.random() < w.stun && !f.boss) { f.stun = Math.max(f.stun || 0, 0.8); fxText(f.x, f.y - f.D.s - 6, '✦ aturdido', '#e0d0ff'); }
  if (w.bleed && Math.random() < w.bleed) { f.poison = Math.max(f.poison || 0, 3); fxText(f.x, f.y - f.D.s - 6, '🩸', '#ff6b5b'); }
  if (w.kb && !f.boss) { const a = Math.atan2(f.y - p.y, f.x - p.x), k = 22 * w.kb; if (typeof fStep === 'function') fStep(f, f.x + Math.cos(a) * k, f.y + Math.sin(a) * k); }
  if (w.drain && S.pc && survOn()) S.pc.hp = Math.min(maxHp(), S.pc.hp + dmg * w.drain * 0.1);
  return r;
}; }
// ---------- Más resistencia ----------
{ const c0 = charMods; charMods = eq => { const m = c0(eq); if (m && !m._res) { m._res = 1; m.hp += 50; m.stam += 30; } return m; }; }
{ const h0 = hitPlayer; hitPlayer = (dmg, wound, cause, el) => h0(dmg * 0.8, wound, cause, el); }
