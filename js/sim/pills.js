'use strict';
// =====================================================================================
//  Píldoras e inyecciones de adrenalina (datos en data/pills.js). F con una en la mano.
//  Qué quita según el nivel L (1-10):
//   · Siempre: el dolor (calmante largo) y algo de vida.
//   · Heridas: las que duelen hasta 6 + 5·L (nivel 1: moratones y rasguños; 3: cortes; 5: mordeduras
//     y quemaduras; 8: fracturas; 10: todas, también lo que lleves clavado).
//   · Desde el 2: deja de sangrar lo que quede y quita el veneno. Desde el 4: las infecciones.
//     Desde el 5: alivia enfermedades (desde el 9, las cura todas). Desde el 8: energía y temperatura.
//   · Nivel 10: como nuevo (vida, aguante, energía, hambre y sed a tope).
//  La inyección actúa al instante como dos niveles más y da adrenalina: corres un 40 % más y pegas
//  más durante unos segundos. Entre dosis hay que esperar 8 s.
// =====================================================================================
const PIL = { heal: 0, healT: 0, cd: 0, adr: 0, adrL: 0, beat: 0 };
function pillUse(id) {
  const it = ITEMS[id], shot = !!it.shot, L = it.pill || it.shot; if (!S.pc || !survOn()) { toastErr('Solo sirve con la supervivencia activada'); return; }
  if (PIL.cd > 0) { toastErr(`Tu cuerpo aún nota la última dosis: espera ${Math.ceil(PIL.cd)} s`); return; }
  if (shot && invCount('syringe') < 1) { toastErr('Necesitas una jeringa para inyectarla (no se gasta)'); return; }
  invTake(id, 1); invVersion++; PIL.cd = 8;
  const E = Math.min(10, shot ? L + 2 : L), pc = S.pc, mx = maxHp();
  pc.pk = Math.max(pc.pk || 0, 30 + 25 * E); // sin dolor
  let gone = 0;
  for (const p of PARTS) { const list = pc.parts[p]; for (let i = list.length - 1; i >= 0; i--) { const w = list[i], T0 = WT[w.t] || {};
    if (E >= 10 || ((T0.pain || 0) <= 6 + 5 * E && (!w.obj || E >= 8))) { list.splice(i, 1); gone++; continue; }
    if (E >= 2) w.b = 1; if (E >= 4) w.inf = 0; w.left *= Math.max(0.2, 1 - 0.08 * E); } }
  if (E >= 2) pc.poison = 0;
  let ill = 0; if (E >= 5 && pc.ills) for (const k in { ...pc.ills }) { if (E >= 9) { delete pc.ills[k]; ill++; } else if (typeof cureIll === 'function' && cureIll(k, E * 10, 'Adrenalina')) ill++; }
  if (E >= 8) { pc.energy = 100; pc.temp = 37; }
  if (E >= 10) { pc.hp = mx; pc.stam = maxStam(); pc.food = Math.max(pc.food, 80); pc.water = Math.max(pc.water, 80); for (const p of PARTS) pc.parts[p] = []; }
  const amt = mx * Math.min(1, 0.12 * E);
  if (shot) pc.hp = Math.min(mx, pc.hp + amt); else { PIL.heal = amt; PIL.healT = 4; } // la píldora cura en 4 s
  if (shot) { PIL.adr = 4 + 2 * L; PIL.adrL = L; const b = S.buffs || (S.buffs = {}); b.swift = Math.max(b.swift || 0, PIL.adr); P.iframe = Math.max(P.iframe || 0, 0.5); }
  vitalsDirty = true; _cmKey = '';
  const c = it.c || '#ff5a6a', p = S.player; sparkRing(p.x, p.y - 10, 18 + E * 3, c, 90 + E * 10, { up: 40, life: 0.8 }); if (shot) { screenFlash('#ff3a3a', 0.15); shake = Math.max(shake || 0, 0.15); }
  tone(shot ? 140 : 520, 0.12, shot ? 'sawtooth' : 'triangle', 0.05, shot ? 2 : 1.3); tone(shot ? 160 : 780, 0.12, 'triangle', 0.04, 1, 0.14);
  toast(`${shot ? '💉' : '💊'} ${it.n}: ${E >= 10 ? '¡como nuevo!' : [gone ? `${gone} herida${gone === 1 ? '' : 's'} curada${gone === 1 ? '' : 's'}` : '', 'sin dolor', E >= 2 ? 'sin sangrado ni veneno' : '', E >= 4 ? 'sin infecciones' : '', ill ? `${ill} enfermedad${ill === 1 ? '' : 'es'} aliviada${ill === 1 ? '' : 's'}` : '', shot ? `adrenalina ${Math.round(PIL.adr)} s` : ''].filter(Boolean).join(' · ')}`, true);
}
{ const i0 = interact; interact = (shift, ctrl) => { const s = S && S.inv[S.sel], it = s && ITEMS[s.id]; if (it && (it.pill || it.shot) && !ui.hand) { pillUse(s.id); return; } return i0(shift, ctrl); }; }
// Adrenalina: pegas más
{ const d0 = damageFoe; damageFoe = (f, dmg, el, src) => d0(f, PIL.adr > 0 ? dmg * (1 + 0.03 * PIL.adrL) : dmg, el, src); }
function pillTick(dt) {
  if (PIL.cd > 0) PIL.cd -= dt;
  if (PIL.healT > 0 && S.pc) { const k = Math.min(dt, PIL.healT); S.pc.hp = Math.min(maxHp(), S.pc.hp + PIL.heal * k / 4); PIL.healT -= dt; vitalsDirty = true; }
  if (PIL.adr > 0) { PIL.adr -= dt; if ((PIL.beat -= dt) <= 0) { PIL.beat = 0.55; tone(70, 0.08, 'sine', 0.05, 0.6); const p = S.player; fxAdd({ x: p.x + (Math.random() - 0.5) * 14, y: p.y - 8, vx: 0, vy: -30, life: 0.5, t: 0, size: 1.8, col: '#ff5a5a', glow: 1, drag: 1 }); } }
}
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); if (S) pillTick(fdt); }; }
