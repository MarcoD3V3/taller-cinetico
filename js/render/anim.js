'use strict';
// =====================================================================================
//  Animaciones de trabajo y batallas con más vida.
//  · Trabajar: picar, talar, cavar y segar van a golpes con ritmo (la herramienta se balancea
//    hacia la casilla), y cada golpe suelta lo que toca: esquirlas y chispas en la roca,
//    destellos en las menas, astillas y hojas en los árboles, terrones en la tierra.
//  · Romper: el árbol cae hacia el lado contrario a ti y suelta hojas y troncos; la roca se
//    desmorona en cascotes que rebotan; las plantas se deshacen en hojas.
//  · Combate: tajos en arco al atacar (con el color del elemento del arma), chispa de impacto,
//    efectos por elemento (fuego, hielo, rayo, vacío, veneno, sagrado, vida), combos, golpes
//    fuertes con temblor, muertes con onda expansiva, jefes que estallan, estelas en los
//    proyectiles, imágenes residuales al esquivar y destello rojo al recibir daño.
// =====================================================================================
const AN = { slash: [], spark: [], fall: [], after: [], txt: [], hurt: 0, combo: 0, comboT: 0, work: 0, flash: 0 };
const EL_FX = { fire: ['#ffb040', '#ff5a1a'], frost: ['#d8f4ff', '#7ac8ff'], storm: ['#fff6a0', '#f0f05a'], void: ['#c890ff', '#6a2aaa'], poison: ['#c8f060', '#5aa02a'], holy: ['#fff4c0', '#ffd34a'], life: ['#a8f08a', '#3a9a3a'], time: ['#e8d8ff', '#ffffff'] };
const elCol = el => EL_FX[el] || ['#ffffff', '#e8e0d0'];
const rgbStr = c => Array.isArray(c) ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : c;

// ---------- Trabajar a golpes ----------
const WORK_RATE = { rock: 0.42, tree: 0.5, ground: 0.46, plant: 0.32 };
function workStrike(tx, ty) {
  const g = GI[gnd(tx, ty)], cls = tileClass(g), p = S.player, cx = (tx + 0.5) * T, cy = (ty + 0.5) * T;
  P.swing = 0.2; P.swingA = Math.atan2(cy - p.y, cx - p.x);
  const away = P.swingA, ox = cx - Math.cos(away) * 8, oy = cy - Math.sin(away) * 8, col = rgbStr(g.c || [140, 130, 120]);
  if (cls === 'rock') {
    for (let i = 0; i < 6; i++) { const a = away + Math.PI + (Math.random() - 0.5) * 1.8, s = 60 + Math.random() * 70; fxAdd({ x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0.5 + Math.random() * 0.3, t: 0, size: 2 + Math.random() * 1.5, col, grav: 320, drag: 1 }); }
    const tool = TOOLS[heldId()]; if (tool && (tool.lv || 1) >= 2) for (let i = 0; i < 4; i++) { const a = away + Math.PI + (Math.random() - 0.5) * 2.4, s = 120 + Math.random() * 90; fxAdd({ x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.22, t: 0, size: 1.2, col: '#fff2b0', glow: 1, drag: 4 }); }
    if (g.dot) fxBurst(cx, cy, 5, { col: g.dot, sp: 40, life: 0.6, size: 1.8, glow: 1, shape: 'star' });
    tone(1400 + Math.random() * 300, 0.04, 'square', 0.025, 0.5); AN.spark.push({ x: ox, y: oy, t: 0, life: 0.14, r: 9, col: '#fff' });
  } else if (cls === 'tree') {
    for (let i = 0; i < 5; i++) { const a = away + Math.PI + (Math.random() - 0.5) * 1.6, s = 50 + Math.random() * 60; fxAdd({ x: ox, y: oy + 6, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 50, life: 0.6, t: 0, size: 2.2, col: Math.random() < 0.5 ? '#c8945a' : '#8a5a2a', grav: 300, drag: 1 }); }
    const leaf = g.tree && g.tree.a; if (leaf) for (let i = 0; i < 3; i++) fxAdd({ x: cx + (Math.random() - 0.5) * 30, y: cy - 34 - Math.random() * 14, vx: 0, vy: 12 + Math.random() * 10, life: 2.2, t: 0, size: 2, col: leaf, shape: 'leaf', sway: Math.random() * 6 });
    tone(160 + Math.random() * 30, 0.08, 'triangle', 0.05, 0.6); AN.spark.push({ x: ox, y: oy + 4, t: 0, life: 0.12, r: 7, col: '#ffe8c0' });
  } else if (cls === 'plant') {
    fxBurst(cx, cy - 4, 6, { col: (g.plant && g.plant.c) || '#7ab850', sp: 50, life: 0.5, size: 1.8, grav: 120, up: 30 }); tone(600, 0.03, 'sine', 0.02, 1.3);
  } else {
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6, s = 60 + Math.random() * 50; fxAdd({ x: cx, y: cy, vx: Math.cos(a) * s * 0.7, vy: Math.sin(a) * s, life: 0.55, t: 0, size: 2.4, col, grav: 340, drag: 0.8 }); }
    tone(90 + Math.random() * 20, 0.06, 'sine', 0.04, 0.7);
  }
}
{ const m0 = updateMining; updateMining = dt => {
  m0(dt);
  const m = ui.mine; if (!S || !m || m.a || m.blk || m.lock || m.block || m.far || !(m.t > 0) || m.x === undefined || m.x < -1e8) { AN.work = 0; return; }
  const g = GI[gnd(m.x, m.y)]; if (!g.drop) { AN.work = 0; return; }
  const rate = WORK_RATE[tileClass(g)] || 0.45; AN.work += dt;
  if (AN.work >= rate || AN.work === dt) { if (AN.work >= rate) AN.work = 0; workStrike(m.x, m.y); }
}; }
// ---------- Romper: árbol que cae, roca que se desmorona, planta que se deshace ----------
{ const d0 = damageTile; damageTile = (x, y) => {
  const before = gnd(x, y); d0(x, y); const after = gnd(x, y); if (before === after || !S) return;
  const g = GI[before], cx = (x + 0.5) * T, cy = (y + 0.5) * T;
  if (g.tree) {
    const dir = cx >= S.player.x ? 1 : -1;
    AN.fall.push({ x: cx, y: cy + 10, dir, t: 0, life: 1, leaf: g.tree.a || '#3a7a3a', leaf2: g.tree.b || g.tree.a || '#4a8a4a', trunk: g.tree.trunk || '#6a4a2a', big: g.tree.big ? 1.3 : 1 });
    tone(110, 0.25, 'sawtooth', 0.04, 0.5);
  } else if (g.rock || g.dot) {
    for (let i = 0; i < 14; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, s = 40 + Math.random() * 90; fxAdd({ x: cx + (Math.random() - 0.5) * 16, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: 0.8 + Math.random() * 0.4, t: 0, size: 2.5 + Math.random() * 2.5, col: rgbStr(g.c || [120, 116, 112]), grav: 420, drag: 0.6 }); }
    for (let i = 0; i < 4; i++) fxSmoke(cx, cy, 'rgba(170,160,150,', 5);
    if (g.dot) fxBurst(cx, cy, 12, { col: g.dot, sp: 70, life: 0.9, size: 2, glow: 1, shape: 'star', up: 20 });
    tone(70, 0.18, 'square', 0.04, 0.5); AN.spark.push({ x: cx, y: cy, t: 0, life: 0.25, r: 18, col: 'rgba(230,220,200,.9)', ring: 1 });
  } else if (g.plant) fxBurst(cx, cy - 6, 10, { col: (g.plant && g.plant.c) || '#7ab850', sp: 60, life: 0.7, size: 2, grav: 90, up: 40 });
}; }

// ---------- Combate ----------
// Tajo en arco al atacar cuerpo a cuerpo (y un arco pequeño con el puño)
{ const a0 = playerAttack; playerAttack = (id, mw) => {
  const before = P.cd, r = a0(id, mw);
  if (P.cd > before && P.swing > 0.11 && S) {
    const pr = typeof weaponProfile === 'function' ? weaponProfile(id) : null, w = WEAPONS[id] || {};
    if (!pr || pr.kind === 'melee') { const [c1, c2] = elCol(w.el); AN.slash.push({ x: S.player.x, y: S.player.y - 6, a: P.swingA, r: pr ? Math.min(46, 18 + (pr.reach || 20) * 0.5) : 16, arc: pr ? Math.min(2.6, pr.arc || 1.6) : 1, c1, c2, t: 0, life: 0.2, el: w.el }); }
    else { const [c1] = elCol(w.el); fxBurst(S.player.x + Math.cos(P.swingA) * 14, S.player.y - 6 + Math.sin(P.swingA) * 14, 5, { col: c1, sp: 80, life: 0.25, size: 1.6, glow: 1 }); }
  }
  return r;
}; }
// Impacto: chispa, efecto del elemento, combo y golpes fuertes
function elementFx(x, y, el, big) {
  const [c1, c2] = elCol(el), n = big ? 2 : 1;
  if (el === 'fire') { fxBurst(x, y, 8 * n, { col: c1, sp: 70, life: 0.6, size: 2, glow: 1, up: 40, grav: -30 }); fxSmoke(x, y - 4, 'rgba(90,70,60,', 4); }
  else if (el === 'frost') fxBurst(x, y, 8 * n, { col: c1, sp: 90, life: 0.7, size: 2, shape: 'star', grav: 120 });
  else if (el === 'storm') { AN.spark.push({ x, y, t: 0, life: 0.18, bolt: 1, col: c1, sx: S.player.x, sy: S.player.y - 10 }); fxBurst(x, y, 6 * n, { col: c1, sp: 140, life: 0.25, size: 1.4, glow: 1 }); }
  else if (el === 'void') { for (let i = 0; i < 10 * n; i++) { const a = Math.random() * 6.28, r = 26; fxAdd({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: -Math.cos(a) * 60, vy: -Math.sin(a) * 60, life: 0.45, t: 0, size: 2, col: c1, glow: 1, drag: 0 }); } }
  else if (el === 'poison') fxBurst(x, y, 8 * n, { col: c1, sp: 30, life: 1, size: 2.4, up: 20, grav: -20, drag: 1.5 });
  else if (el === 'holy') { for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; fxAdd({ x, y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, life: 0.35, t: 0, size: 2, col: c2, glow: 1, shape: 'star', drag: 3 }); } }
  else if (el === 'life') fxBurst(x, y, 8, { col: c1, sp: 40, life: 0.9, size: 2, shape: 'leaf', up: 20 });
}
{ const d0 = damageFoe; damageFoe = (f, dmg, el, src) => {
  const hp0 = f && f.hp, r = d0(f, dmg, el, src);
  if (!f || !S || hp0 === undefined || f.hp === hp0) return r;
  const lost = hp0 - Math.max(0, f.hp), big = lost >= f.mhp * 0.22 || lost >= 25, y = f.y - (f.D ? f.D.s * 0.5 : 6);
  AN.spark.push({ x: f.x, y, t: 0, life: big ? 0.22 : 0.15, r: big ? 18 : 11, col: el ? elCol(el)[0] : '#ffffff' });
  if (el) elementFx(f.x, y, el, big);
  if (big && performance.now() - (AN.bigT || 0) > 180 && AN.txt.length < 40) { AN.bigT = performance.now(); shake = Math.max(shake, 0.12); AN.txt.push({ x: f.x, y: y - 18, t: 0, life: 0.9, s: '¡Golpe fuerte!', col: '#ffd34a', big: 1 }); tone(90, 0.12, 'square', 0.05, 0.4); }
  const now = performance.now() / 1000; AN.combo = now - AN.comboT < 1.6 ? AN.combo + 1 : 1; AN.comboT = now;
  if (AN.combo >= 3) { AN.txt = AN.txt.filter(t => !t.combo); AN.txt.push({ x: S.player.x, y: S.player.y - 44, t: 0, life: 1.4, s: `×${AN.combo} combo`, col: AN.combo >= 10 ? '#ff7a3a' : AN.combo >= 6 ? '#ffd34a' : '#fff4c0', combo: 1, big: AN.combo >= 6 }); if (AN.combo % 5 === 0) { fxRingFx(S.player.x, S.player.y, '#ffd34a', 40); tone(660 + AN.combo * 20, 0.1, 'triangle', 0.05, 1.5); } }
  return r;
}; }
// Muerte: onda expansiva y estallido del color de la criatura (los jefes, mucho más)
{ const k0 = killFoe; killFoe = f => {
  if (f && S) { const c = (f.D && f.D.c) || '#c8c0b0', boss = !!f.boss, s = f.D ? f.D.s : 10;
    AN.spark.push({ x: f.x, y: f.y, t: 0, life: boss ? 0.9 : 0.4, r: boss ? 120 : 26 + s, col: boss ? '#ffd34a' : 'rgba(255,255,255,.85)', ring: 1 });
    fxBurst(f.x, f.y - 4, boss ? 60 : 16 + s, { col: c, sp: boss ? 220 : 110, life: boss ? 1.4 : 0.7, size: boss ? 3 : 2.2, grav: 220, up: 60, drag: 1 });
    if (f.D && f.D.el) elementFx(f.x, f.y, f.D.el, true);
    if (boss) { for (let i = 0; i < 3; i++) setTimeout(() => AN.spark.push({ x: f.x, y: f.y, t: 0, life: 0.8, r: 90 + i * 40, col: i === 1 ? '#fff' : '#ffb040', ring: 1 }), i * 180); AN.flash = 0.6; shake = Math.max(shake, 0.6); fxBurst(f.x, f.y, 40, { col: '#ffd34a', sp: 160, life: 1.6, glow: 1, shape: 'star', up: 40 }); tone(60, 0.8, 'sawtooth', 0.06, 0.3); }
    else { shake = Math.max(shake, 0.06); tone(220, 0.12, 'triangle', 0.04, 0.5); } }
  return k0(f);
}; }
// Recibir daño: destello rojo y un pequeño temblor
{ const h0 = hurt; hurt = (t, part, mult, cause) => { h0(t, part, mult, cause); if (S && survOn()) { AN.hurt = Math.min(1, AN.hurt + 0.35 + (mult || 1) * 0.15); shake = Math.max(shake, 0.1); } }; }
// Esquivar: imágenes residuales
{ const d0 = dash; dash = (...a) => { const p = S && S.player, x0 = p && p.x, y0 = p && p.y, r = d0(...a); if (p && (p.x !== x0 || P.dash > 0)) { AN.dashT = 0.3; } return r; }; }

// ---------- Cada fotograma: estelas, residuos de la esquiva y dibujo ----------
let _anT = 0;
function animTick(dt) {
  _anT += dt;
  if (AN.dashT > 0 && S) { AN.dashT -= dt; if (_anT > 0.035) { _anT = 0; AN.after.push({ x: S.player.x, y: S.player.y, fa: P.faceA || 0, t: 0, life: 0.3 }); } }
  // Estela de los proyectiles (de los tuyos y de los enemigos)
  if (typeof PROJ !== 'undefined') for (const pj of PROJ) if (Math.random() < 0.7) fxAdd({ x: pj.x + (Math.random() - 0.5) * 3, y: pj.y + (Math.random() - 0.5) * 3, vx: 0, vy: 0, life: 0.28, t: 0, size: pj.big ? 2.6 : 1.8, col: pj.c || (pj.team === 'e' ? '#ff8a6a' : '#fff0c0'), glow: 1, drag: 0 });
  for (const k of ['slash', 'spark', 'fall', 'after', 'txt']) { const a = AN[k]; for (let i = a.length - 1; i >= 0; i--) { a[i].t += dt; if (a[i].t >= a[i].life) { const e = a[i]; a.splice(i, 1); if (k === 'fall') treeLanded(e); } } }
  AN.hurt = Math.max(0, AN.hurt - dt * 1.6); AN.flash = Math.max(0, AN.flash - dt * 1.4);
}
function treeLanded(e) {
  const gx = e.x + e.dir * 40 * e.big, gy = e.y - 2;
  fxBurst(gx, gy - 10, 22, { col: e.leaf, sp: 80, life: 1.2, size: 2.2, shape: 'leaf', grav: 60, up: 30 });
  for (let i = 0; i < 6; i++) fxSmoke(gx + (Math.random() - 0.5) * 30, gy, 'rgba(160,140,110,', 4);
  shake = Math.max(shake, 0.08); tone(65, 0.3, 'triangle', 0.06, 0.6);
}
function drawAnim(ctx) {
  // Residuos de la esquiva
  if (AN.after.length && S) { const ch = charData(); for (const a of AN.after) { ctx.globalAlpha = 0.28 * (1 - a.t / a.life); try { drawAvatar(ctx, ch.look, S.equip, a.x, a.y + 8, a.fa, 0, false, 1.6); } catch (e) { } } ctx.globalAlpha = 1; }
  // Árboles que caen
  for (const e of AN.fall) {
    const k = e.t / e.life, ang = e.dir * Math.min(1.45, k * k * 1.6), fade = k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1;
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(ang); ctx.globalAlpha = fade;
    ctx.fillStyle = e.trunk; ctx.fillRect(-4 * e.big, -46 * e.big, 8 * e.big, 46 * e.big);
    ctx.fillStyle = e.leaf; ctx.beginPath(); ctx.arc(0, -52 * e.big, 18 * e.big, 0, 7); ctx.fill();
    ctx.fillStyle = e.leaf2; ctx.beginPath(); ctx.arc(-6 * e.big, -58 * e.big, 10 * e.big, 0, 7); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  }
  // Tajos
  ctx.globalCompositeOperation = 'lighter';
  for (const s of AN.slash) {
    const k = s.t / s.life, a0 = s.a - s.arc / 2, a1 = a0 + s.arc * Math.min(1, k * 1.6), al = 1 - k;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = i ? s.c2 : s.c1; ctx.globalAlpha = al * (i ? 0.35 : 0.9); ctx.lineWidth = (i ? 7 : 3) - i; ctx.beginPath(); ctx.arc(s.x, s.y, s.r - i * 4, Math.max(a0, a1 - 1.2), a1); ctx.stroke(); }
    const ex = s.x + Math.cos(a1) * s.r, ey = s.y + Math.sin(a1) * s.r; ctx.globalAlpha = al; ctx.fillStyle = s.c1; ctx.beginPath(); ctx.arc(ex, ey, 3, 0, 7); ctx.fill();
  }
  // Chispas de impacto, ondas y rayos
  for (const p of AN.spark) {
    const k = p.t / p.life, al = 1 - k; ctx.globalAlpha = al;
    if (p.bolt) { ctx.strokeStyle = p.col; ctx.lineWidth = 2; ctx.beginPath(); let x = p.sx, y = p.sy; ctx.moveTo(x, y); for (let i = 1; i <= 6; i++) { const f = i / 6; x = p.sx + (p.x - p.sx) * f + (i < 6 ? (Math.random() - 0.5) * 14 : 0); y = p.sy + (p.y - p.sy) * f + (i < 6 ? (Math.random() - 0.5) * 14 : 0); ctx.lineTo(x, y); } ctx.stroke(); continue; }
    if (p.ring) { ctx.strokeStyle = p.col; ctx.lineWidth = 3 * (1 - k) + 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.2 + k), 0, 7); ctx.stroke(); continue; }
    const r = p.r * (0.4 + k * 0.9); ctx.strokeStyle = p.col; ctx.lineWidth = 2;
    ctx.beginPath(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4 + 0.4; ctx.moveTo(p.x + Math.cos(a) * r * 0.3, p.y + Math.sin(a) * r * 0.3); ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r); ctx.moveTo(p.x - Math.cos(a) * r * 0.3, p.y - Math.sin(a) * r * 0.3); ctx.lineTo(p.x - Math.cos(a) * r, p.y - Math.sin(a) * r); } ctx.stroke();
    ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, 3 * (1 - k) + 1, 0, 7); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  // Textos (combo, golpe fuerte)
  for (const t of AN.txt) { const k = t.t / t.life, sc = t.big ? 1 + Math.max(0, 0.4 - k) * 1.2 : 1; ctx.save(); ctx.translate(t.x, t.y - k * 14); ctx.scale(sc, sc); ctx.globalAlpha = Math.min(1, (1 - k) * 2); ctx.font = `bold ${t.big ? 13 : 11}px system-ui`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(t.s, 0, 0); ctx.fillStyle = t.col; ctx.fillText(t.s, 0, 0); ctx.restore(); }
  ctx.globalAlpha = 1;
}
{ const d0 = drawFxWorld; drawFxWorld = ctx => { d0(ctx); try { drawAnim(ctx); } catch (e) { } }; }
{ const t0 = fxTick; fxTick = dt => { t0(dt); animTick(dt); }; }
// En pantalla: destello rojo al recibir daño y blanco al vencer a un jefe
{ const w0 = drawWeatherScreen; drawWeatherScreen = (ctx, dt) => { w0(ctx, dt);
  if (AN.hurt > 0.02) { const W = cv.width, H = cv.height, g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7); g.addColorStop(0, 'rgba(200,20,20,0)'); g.addColorStop(1, `rgba(200,20,20,${AN.hurt * 0.45})`); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  if (AN.flash > 0.02) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(255,248,220,${AN.flash * 0.5})`; ctx.fillRect(0, 0, cv.width, cv.height); }
}; }
