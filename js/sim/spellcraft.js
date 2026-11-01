'use strict';
// =====================================================================================
//  Grimorio de combate y hechizos épicos.
//  · 8 huecos de hechizo: los 4 de siempre y otros 4 que solo funcionan con una varita o un
//    báculo en la mano (teclas por defecto K L I O; se cambian en Ajustes › Teclas).
//  · Con varita en la mano aparece el grimorio: rueda del ratón = elegir hechizo, clic derecho =
//    lanzarlo (mantenlo pulsado para lanzar en cuanto se recargue). Clic en un hueco vacío para
//    ponerle un hechizo; clic derecho en un hueco para vaciarlo. Avisa de los combos posibles.
//  · Cada hechizo tiene su espectáculo: sello mágico al lanzar, estelas, impactos, ondas,
//    meteoritos que caen del cielo, rayos ramificados, burbuja de escudo, espirales, destellos…
// =====================================================================================
SPELL_KEYS.push('k', 'l', 'i', 'o');
// Quién lanza: tú (SCX = null) u otro jugador cuyo hechizo se repite aquí. SGH: modo fantasma = solo se ve,
// no hace daño (ya lo hace su dueño), ni te cura, ni te mueve, ni te gasta nada.
let SCX = null, SGH = false;
const cp = () => SCX ? SCX.p : S.player, cm = () => SCX ? SCX.m : mouseWorld();
const isWand = id => { const it = id && ITEMS[id]; return !!(it && it.weapon && (it.s === 'wand' || it.s === 'staff' || (typeof TR !== 'undefined' && TR[id] && TR[id].fam === 'wand'))); };
const wandHeld = () => !!S && !ui.hand && isWand(heldId());
{ const s0 = spellState; spellState = () => { const st = s0(); while (st.slots.length < 8) st.slots.push(null); return st; }; }
{ const c0 = castSpell; castSpell = slot => {
  if (slot >= 4 && !wandHeld()) { toastErr('Los huecos 5 a 8 solo funcionan con una varita o un báculo en la mano'); return; }
  const st = spellState(), k = st.slots[slot], s = k && SPELLS[k], ready = s && !((P.scd[k] || 0) > 0), p = S.player, ox = p.x, oy = p.y, np = PROJ.length, nh = HAZ.length;
  c0(slot);
  if (ready && P.scd[k] > 0) castFx(s, ox, oy, np, nh);
}; }
const elOf = s => SPELLS[s] ? SPELLS[s].el : null;

// ---------- Efectos en el mundo ----------
const SFX = { sig: [], met: [], bolts: [], flash: 0, flashC: '#fff', proj: new Map(), haz: new Set(), bubble: 0, auraT: 0 };
function sparkRing(x, y, n, col, sp, o = {}) { for (let i = 0; i < n; i++) { const a = i / n * 6.283 + Math.random() * 0.2, v = sp * rnd(0.7, 1.15); fxAdd({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.up || 0), life: o.life || 0.6, t: 0, size: o.size || 2.2, col, glow: 1, drag: o.drag ?? 2.5, shape: o.shape }); } }
function screenFlash(c, a) { SFX.flash = Math.max(SFX.flash, a); SFX.flashC = c; }
function boltPath(x1, y1, x2, y2, rough) { const n = Math.max(4, Math.round(Math.hypot(x2 - x1, y2 - y1) / 14)), pts = [[x1, y1]]; for (let i = 1; i < n; i++) { const k = i / n; pts.push([x1 + (x2 - x1) * k + rnd(-rough, rough), y1 + (y2 - y1) * k + rnd(-rough, rough)]); } pts.push([x2, y2]); return pts; }
function addBolt(x1, y1, x2, y2, c, life = 0.28) { const pts = boltPath(x1, y1, x2, y2, 9), br = []; for (let i = 0; i < 2; i++) { const j = 1 + ((Math.random() * (pts.length - 2)) | 0), [bx, by] = pts[j], a = Math.random() * 6.28, L = rnd(14, 34); br.push(boltPath(bx, by, bx + Math.cos(a) * L, by + Math.sin(a) * L, 5)); } SFX.bolts.push({ pts, br, c, t: 0, life }); }
function castFx(s, ox, oy, np, nh) {
  const p = cp(), mw = cm(), big = s.m >= 35, c = s.c;
  SFX.sig.push({ x: ox, y: oy, c, t: 0, life: big ? 1.1 : 0.7, r: big ? 34 : 22, rot: Math.random() * 6 });
  sparkRing(ox, oy - 6, big ? 26 : 12, c, big ? 120 : 70, { life: 0.5 });
  screenFlash(c, big ? 0.22 : 0.08); if (big) shake = Math.max(shake || 0, 0.25);
  for (let i = np; i < PROJ.length; i++) { const pj = PROJ[i]; if (pj.team !== 'e') SFX.proj.set(pj, { s, x: pj.x, y: pj.y }); }
  for (let i = nh; i < HAZ.length; i++) if (HAZ[i].team !== 'e') { HAZ[i]._fx = s; SFX.haz.add(HAZ[i]); }
  switch (s.kind) {
    case 'proj': case 'missiles': { const a = Math.atan2(mw.y - oy, mw.x - ox); for (let i = 0; i < 14; i++) { const aa = a + rnd(-0.45, 0.45), v = rnd(80, 190); fxAdd({ x: ox + Math.cos(a) * 10, y: oy + Math.sin(a) * 10, vx: Math.cos(aa) * v, vy: Math.sin(aa) * v, life: 0.35, t: 0, size: 2.4, col: c, glow: 1, drag: 4 }); } break; }
    case 'nova': for (let i = 0; i < 3; i++) setTimeout(() => FX.push({ x: p.x, y: p.y, ring: s.r * (0.55 + i * 0.25), t: 0.5, c }), i * 90);
      sparkRing(p.x, p.y, 48, c, s.r * 1.6, { life: 0.7, size: 2.6, drag: 3 }); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; SFX.bolts.push({ pts: [[p.x, p.y], [p.x + Math.cos(a) * s.r * 0.9, p.y + Math.sin(a) * s.r * 0.9]], br: [], c, t: 0, life: 0.25, w: 1 }); }
      shake = Math.max(shake || 0, 0.18 + s.r / 900); break;
    case 'heal': for (let i = 0; i < 30; i++) fxAdd({ x: p.x + rnd(-14, 14), y: p.y + rnd(-4, 10), vx: rnd(-8, 8), vy: rnd(-70, -30), life: rnd(0.7, 1.2), t: 0, size: 2.6, col: i % 3 ? c : '#ffffff', glow: 1, shape: 'star', drag: 0.6 }); FX.push({ x: p.x, y: p.y, ring: 34, t: 0.6, c }); break;
    case 'shield': SFX.bubble = 1; sparkRing(p.x, p.y - 8, 30, c, 60, { life: 0.8, drag: 1.5 }); break;
    case 'blink': sparkRing(ox, oy - 8, 30, c, 90, { life: 0.6 }); sparkRing(p.x, p.y - 8, 30, c, 90, { life: 0.6, shape: 'star' }); SFX.bolts.push({ pts: [[ox, oy - 8], [p.x, p.y - 8]], br: [], c, t: 0, life: 0.3, w: 4 }); break;
    case 'meteor': SFX.met.push({ x: mw.x, y: mw.y, c, t: 0, life: 0.9, r: s.boom }); break;
    case 'summon': SFX.sig.push({ x: p.x + 20, y: p.y, c, t: 0, life: 1.2, r: 26, rot: 0 }); sparkRing(p.x + 20, p.y, 24, c, 70, { up: 40, life: 0.8 }); break;
    case 'storm': screenFlash('#f0f05a', 0.3); shake = Math.max(shake || 0, 0.3); break;
    case 'buff': case 'ward': if (!SGH) { SFX.auraT = 2.5; SFX.auraC = c; } sparkRing(p.x, p.y, 36, c, 80, { up: 30, life: 0.9 }); break;
    case 'drain': case 'chain': break;
  }
}
// Combos: ¡explosión de verdad!
{ const c0 = comboFx; comboFx = (c, at2) => { c0(c, at2);
  screenFlash(c.c, 0.4); shake = Math.max(shake || 0, 0.55); SFX.sig.push({ x: at2.x, y: at2.y, c: c.c, t: 0, life: 1.4, r: 60, rot: 0 });
  sparkRing(at2.x, at2.y, 70, c.c, 260, { life: 0.9, size: 3 }); sparkRing(at2.x, at2.y, 30, '#ffffff', 140, { life: 0.6, shape: 'star' });
  for (let i = 0; i < 4; i++) setTimeout(() => FX.push({ x: at2.x, y: at2.y, ring: (c.r || 80) * (0.5 + i * 0.35), t: 0.55, c: i % 2 ? '#fff' : c.c }), i * 80);
  for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28; addBolt(at2.x, at2.y, at2.x + Math.cos(a) * (c.r || 80), at2.y + Math.sin(a) * (c.r || 80), c.c, 0.35); }
  tone(70, 0.6, 'sawtooth', 0.08, 0.4); }; }
function spellFxTick(dt) {
  if (SFX.flash > 0) SFX.flash = Math.max(0, SFX.flash - dt * 1.6);
  for (const L of [SFX.sig, SFX.met, SFX.bolts]) for (let i = L.length - 1; i >= 0; i--) { const o = L[i]; o.t += dt; if (o.t >= o.life) { L.splice(i, 1); if (o === undefined) continue; if (L === SFX.met) { sparkRing(o.x, o.y, 60, o.c, 230, { life: 0.8, size: 3 }); sparkRing(o.x, o.y, 20, '#ffe0a0', 120, { up: 60, life: 1, size: 2 }); for (let k = 0; k < 10; k++) fxSmoke(o.x + rnd(-20, 20), o.y, 'rgba(60,40,30,', 6); shake = Math.max(shake || 0, 0.45); screenFlash(o.c, 0.25); FX.push({ x: o.x, y: o.y, ring: o.r * 1.4, t: 0.5, c: '#fff' }); } } }
  // Estelas de los proyectiles mágicos y estallido al chocar
  for (const [pj, o] of SFX.proj) { if (!PROJ.includes(pj)) { SFX.proj.delete(pj); sparkRing(o.x, o.y, o.s.boom ? 36 : 14, o.s.c, o.s.boom ? 170 : 90, { life: 0.5 }); if (o.s.boom) { FX.push({ x: o.x, y: o.y, ring: o.s.boom, t: 0.45, c: '#fff' }); shake = Math.max(shake || 0, 0.2); for (let k = 0; k < 6; k++) fxSmoke(o.x + rnd(-10, 10), o.y, 'rgba(80,60,50,', 5); } continue; }
    o.x = pj.x; o.y = pj.y; for (let k = 0; k < 2; k++) fxAdd({ x: pj.x + rnd(-3, 3), y: pj.y + rnd(-3, 3), vx: -pj.vx * 0.05 + rnd(-15, 15), vy: -pj.vy * 0.05 + rnd(-15, 15), life: rnd(0.25, 0.5), t: 0, size: rnd(1.6, 3), col: k ? o.s.c : '#ffffff', glow: 1, drag: 3 }); }
  // Charcos, agujeros y meteoritos del jugador: partículas mientras duran
  for (const h of SFX.haz) { if (!HAZ.includes(h)) { SFX.haz.delete(h); continue; } const s = h._fx;
    if (h.kind === 'hole') for (let k = 0; k < 3; k++) { const a = Math.random() * 6.28, r = h.r * rnd(0.6, 1); fxAdd({ x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r, vx: -Math.cos(a) * r * 1.6 - Math.sin(a) * 60, vy: -Math.sin(a) * r * 1.6 + Math.cos(a) * 60, life: 0.55, t: 0, size: 2, col: k ? '#a060ff' : '#fff', glow: 1, drag: 0 }); }
    else if (h.kind === 'pool') for (let k = 0; k < 2; k++) { const a = Math.random() * 6.28, r = h.r * Math.sqrt(Math.random()); fxAdd({ x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r, vx: rnd(-6, 6), vy: rnd(-40, -15), life: rnd(0.5, 1), t: 0, size: rnd(2, 3.5), col: s.c, glow: s.el === 'fire' ? 1 : 0, drag: 0.5 }); } }
  // Rayos: los del juego (cadena, tormenta, drenar) se vuelven ramificados y sueltan chispas
  for (const f of FX) if (f.bolt && !f._sc) { f._sc = 1; addBolt(f.x, f.y, f.x2, f.y2, f.c, 0.3); sparkRing(f.x2, f.y2, 12, f.c, 110, { life: 0.4, shape: 'star' }); if (f.y2 - f.y > 150) { screenFlash('#f0f05a', 0.12); shake = Math.max(shake || 0, 0.12); } }
  if (SFX.bubble && !(P.shield > 0)) { if (SFX.bubble === 1) sparkRing(S.player.x, S.player.y - 8, 24, '#c8a8ff', 90, { life: 0.5 }); SFX.bubble = 0; } else if (P.shield > 0) SFX.bubble = 2;
  if (SFX.auraT > 0) { SFX.auraT -= dt; const p = S.player; fxAdd({ x: p.x + rnd(-10, 10), y: p.y + rnd(-2, 8), vx: 0, vy: rnd(-50, -25), life: 0.6, t: 0, size: 2, col: SFX.auraC, glow: 1, drag: 0.5 }); }
  if (wandHeld()) { const p = S.player, a = P.faceA || 0; if (Math.random() < 0.5) fxAdd({ x: p.x + Math.cos(a) * 12, y: p.y - 10 + Math.sin(a) * 8, vx: rnd(-8, 8), vy: rnd(-20, -5), life: 0.4, t: 0, size: 1.6, col: ITEMS[heldId()].c || '#c8a8ff', glow: 1, drag: 1 }); }
}
{ const d0 = drawFxWorld; drawFxWorld = ctx => { d0(ctx); if (!S) return; ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const o of SFX.sig) { const k = o.t / o.life, a = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8, r = o.r * (0.7 + 0.3 * Math.min(1, k * 4)); ctx.globalAlpha = a; ctx.strokeStyle = o.c; ctx.lineWidth = 2;
    ctx.save(); ctx.translate(o.x, o.y); ctx.scale(1, 0.5); ctx.rotate(o.rot + o.t * 2.4);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, 7); ctx.stroke();
    ctx.beginPath(); for (let i = 0; i <= 6; i++) { const b = i / 6 * 6.283 * 2; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(b) * r * 0.72, Math.sin(b) * r * 0.72); } ctx.stroke();
    for (let i = 0; i < 12; i++) { const b = i / 12 * 6.283; ctx.fillStyle = o.c; ctx.fillRect(Math.cos(b) * r * 0.86 - 1.5, Math.sin(b) * r * 0.86 - 1.5, 3, 3); }
    ctx.restore(); }
  for (const o of SFX.met) { const k = o.t / o.life, sx = o.x + 260 * (1 - k), sy = o.y - 520 * (1 - k);
    ctx.globalAlpha = 0.25 + 0.6 * k; ctx.strokeStyle = o.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(o.x, o.y, o.r * (1.2 - k * 0.3), o.r * 0.5 * (1.2 - k * 0.3), 0, 0, 7); ctx.stroke();
    const g = ctx.createLinearGradient(sx, sy, sx + 120, sy - 240); g.addColorStop(0, o.c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 12 * (0.5 + k); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 110, sy - 220); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, sy, 7 + k * 6, 0, 7); ctx.fill(); ctx.fillStyle = o.c; ctx.beginPath(); ctx.arc(sx, sy, 12 + k * 10, 0, 7); ctx.globalAlpha = 0.5; ctx.fill();
    if (Math.random() < 0.8) fxAdd({ x: sx + rnd(-6, 6), y: sy + rnd(-6, 6), vx: rnd(10, 60), vy: rnd(-90, -30), life: 0.5, t: 0, size: 2.4, col: o.c, glow: 1, drag: 1 }); }
  for (const b of SFX.bolts) { const a = 1 - b.t / b.life; for (const [lw, col, al] of [[(b.w || 2) * 3, b.c, 0.35], [b.w || 2, '#ffffff', 1]]) { ctx.globalAlpha = a * al; ctx.strokeStyle = col; ctx.lineWidth = lw; for (const pts of [b.pts, ...b.br]) { ctx.beginPath(); pts.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y)); ctx.stroke(); } } }
  if (P.shield > 0) { const p = S.player, t = performance.now() / 1000, r = 20 + Math.sin(t * 4) * 1.5; ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 6); ctx.strokeStyle = '#c8a8ff'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 6; i++) { const b = i / 6 * 6.283 + t; ctx[i ? 'lineTo' : 'moveTo'](p.x + Math.cos(b) * r, p.y - 10 - (P.z || 0) + Math.sin(b) * r); } ctx.stroke(); ctx.globalAlpha *= 0.4; ctx.fillStyle = '#c8a8ff'; ctx.fill(); }
  ctx.restore(); }; }
{ const w0 = drawWeatherScreen; drawWeatherScreen = (ctx, dt) => { w0(ctx, dt); if (SFX.flash > 0.005 && ctx) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = SFX.flash; ctx.fillStyle = SFX.flashC; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore(); } }; }

// ---------- Grimorio (panel con la varita en la mano) ----------
const WP = { sel: 0, hold: false, pick: -1, sig: '', el: null, tip: 0 };
const wpEl = () => { if (!WP.el) { WP.el = document.createElement('div'); WP.el.id = 'wandPanel'; WP.el.hidden = true; document.body.appendChild(WP.el); } return WP.el; };
function comboHint() { const st = spellState(), last = P.lastEl; if (!last || S.time - P.lastElT > 2.5) return ''; const out = []; for (let i = 0; i < 8; i++) { const k = st.slots[i], s = k && SPELLS[k]; if (s && s.el !== last && COMBOS[last + '+' + s.el]) out.push(`<b style="color:${s.c}">${KEY_NAME(actKey('spell' + (i + 1)))}</b> ${esc(COMBOS[last + '+' + s.el].n.replace(/[¡!]/g, ''))}`); } return out.length ? '⚡ Combo listo: ' + out.slice(0, 3).join(' · ') : ''; }
function wpRender() {
  const el = wpEl(), st = spellState(), pc = S.pc;
  if (WP.sel >= 8 || !st.slots[WP.sel]) { const f = st.slots.findIndex(Boolean); if (f >= 0 && !st.slots[WP.sel]) WP.sel = f; }
  el.innerHTML = `<div class="wptop" title="Rueda: elegir · Clic derecho: lanzar (mantén para repetir) · Shift + rueda: cambiar de objeto"><span class="wpmana"><i></i><b></b></span></div><div class="wpslots">${st.slots.map((k, i) => { const s = k && SPELLS[k];
    return `<button class="wps ${i === WP.sel ? 'sel' : ''} ${s ? '' : 'empty'} ${i >= 4 ? 'xtra' : ''}" data-wps="${i}" style="--c:${s ? s.c : '#555'}" title="${s ? esc(s.n) + ' · ' + s.m + ' maná · ' + s.cd + ' s' : 'Vacío: clic para elegir hechizo'}"><span class="ico">${s ? s.i : '+'}</span><kbd>${esc(KEY_NAME(actKey('spell' + (i + 1))))}</kbd>${s ? `<em>${s.m}</em>` : ''}<i class="cdw"></i></button>`; }).join('')}</div>
    <div class="wpinfo"><span class="wpname"></span><span class="wpcombo"></span></div>
    ${WP.pick >= 0 ? `<div class="wppick">${st.known.length ? st.known.map(k => `<button data-wpk="${k}" style="--c:${SPELLS[k].c}"><span>${SPELLS[k].i}</span>${esc(SPELLS[k].n)}<em>${SPELLS[k].m}</em></button>`).join('') : '<span class="mut small">Aún no conoces hechizos: lee pergaminos (F).</span>'}</div>` : ''}`;
  WP.sig = st.slots.join() + WP.sel + '|' + WP.pick + st.known.length + KMAP.size; WP.btns = null;
}
function wpTick() {
  const el = wpEl(), on = wandHeld() && !ui.open && ui.open !== 'title'; document.documentElement.classList.toggle('wandon', on);
  if (el.hidden === on) { el.hidden = !on; if (on) { el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); } }
  if (!on) { WP.hold = false; WP.pick = -1; return; }
  const st = spellState(); if (WP.sig !== st.slots.join() + WP.sel + '|' + WP.pick + st.known.length + KMAP.size) wpRender();
  const pc = S.pc, mm = typeof maxMana === 'function' ? maxMana() : 100, mf = pc ? Math.max(0, Math.min(1, pc.mana / mm)) : 1;
  const mi = el.querySelector('.wpmana i'), mv = mf.toFixed(2); if (mi && mi._v !== mv) { mi._v = mv; mi.style.transform = `scaleY(${mv})`; }
  if (!WP.btns || WP.btns[0] && !WP.btns[0].isConnected) WP.btns = [...el.querySelectorAll('.wps')]; // solo cambia lo que cambia (antes se reescribía todo en cada fotograma)
  WP.btns.forEach((b, i) => { const k = st.slots[i], s = k && SPELLS[k], cd = k ? Math.max(0, P.scd[k] || 0) : 0, v = s ? (cd / s.cd).toFixed(2) : '0', low = !!(s && pc && survOn() && pc.mana < s.m), rd = !!s && cd <= 0; if (b._v !== v) { b._v = v; b.style.setProperty('--cd', v); } if (b._l !== low) { b._l = low; b.classList.toggle('low', low); } if (b._r !== rd) { b._r = rd; b.classList.toggle('ready', rd); } });
  const s = SPELLS[st.slots[WP.sel]], nm = el.querySelector('.wpname'); if (nm) { const t = s ? `${s.i} ${s.n}` : 'Hueco vacío'; if (nm.textContent !== t) { nm.textContent = t; nm.style.color = s ? s.c : ''; } }
  const ch = comboHint(), co = el.querySelector('.wpcombo'); if (co && co._v !== ch) { co._v = ch; co.innerHTML = ch; }
  if (WP.hold && s && !((P.scd[st.slots[WP.sel]] || 0) > 0) && (!survOn() || !S.pc || S.pc.mana >= s.m)) castSpell(WP.sel);
}
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); if (!S) return; spellFxTick(fdt); wpTick(); }; }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-wps],[data-wpk]'); if (!b || !S) return;
  if (b.dataset.wpk) { spellState().slots[WP.pick] = b.dataset.wpk; const st = spellState(); for (let j = 0; j < 8; j++) if (j !== WP.pick && st.slots[j] === b.dataset.wpk) st.slots[j] = null; WP.sel = WP.pick; WP.pick = -1; _spSig = ''; tone(880, 0.08, 'sine', 0.05); return; }
  const i = +b.dataset.wps; if (!spellState().slots[i] || WP.sel === i) WP.pick = WP.pick === i ? -1 : i; else { WP.sel = i; WP.pick = -1; } tone(660, 0.05, 'sine', 0.04);
});
document.addEventListener('contextmenu', e => { const b = e.target.closest && e.target.closest('[data-wps]'); if (!b) return; e.preventDefault(); spellState().slots[+b.dataset.wps] = null; _spSig = ''; });
cv.addEventListener('wheel', e => { if (!wandHeld() || e.ctrlKey || e.shiftKey || ui.open) return; e.preventDefault(); e.stopImmediatePropagation();
  const st = spellState(), dir = e.deltaY > 0 ? 1 : -1; for (let n = 1; n <= 8; n++) { const j = (WP.sel + dir * n + 16) % 8; if (st.slots[j]) { WP.sel = j; break; } } tone(520 + WP.sel * 40, 0.04, 'sine', 0.03); }, { capture: true, passive: false });
cv.addEventListener('mousedown', e => { if (e.button !== 2 || !wandHeld() || ui.open) return; e.stopImmediatePropagation(); WP.hold = true; const st = spellState(); if (st.slots[WP.sel] || (typeof megaHeld === 'function' && megaHeld())) castSpell(WP.sel); else toastErr('Ese hueco está vacío: haz clic en él en el grimorio'); }, true);
addEventListener('mouseup', e => { if (e.button === 2) WP.hold = false; });
addEventListener('blur', () => { WP.hold = false; });
