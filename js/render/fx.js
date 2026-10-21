'use strict';
// =====================================================================================
//  Partículas y escenas.
//  · Ambiente según lugar y hora: luciérnagas de noche, hojas que caen de los árboles,
//    polvo y arena en zonas secas, polen en praderas, brasas junto a la lava, burbujas en
//    el pantano, destellos en la nieve y en los cristales.
//  · Bloques vivos: chispas y humo de antorchas, hogueras, chimeneas y máquinas en marcha.
//  · Eventos: subir de nivel, fabricar, colocar y romper, golpear y matar enemigos,
//    recibir daño, comer y beber, curarte, pisadas en arena, nieve, barro o tierra.
//  · Clima en pantalla: lluvia, nieve, ventisca, arena, ceniza, esporas, niebla, calor,
//    relámpagos; y un tinte de escena por bioma, amanecer y atardecer.
// =====================================================================================
const FXP = []; const FX_MAX = 700;
function fxAdd(o) { if (FXP.length >= FX_MAX) FXP.shift(); FXP.push(o); return o; }
// Ráfaga: n partículas en todas direcciones
function fxBurst(x, y, n, o = {}) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = (o.sp || 60) * (0.4 + Math.random() * 0.8);
    fxAdd({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (o.up || 0), life: (o.life || 0.6) * (0.6 + Math.random() * 0.6), t: 0, size: o.size || 2, col: o.col || '#fff', grav: o.grav ?? 0, drag: o.drag ?? 2, glow: o.glow, shape: o.shape }); }
}
const fxRingFx = (x, y, col, r = 26) => fxAdd({ x, y, vx: 0, vy: 0, life: 0.55, t: 0, ring: r, col, size: 2 });
const fxSmoke = (x, y, col = 'rgba(150,150,150,', s = 4) => fxAdd({ x: x + (Math.random() - 0.5) * 4, y, vx: (Math.random() - 0.5) * 8 + 5, vy: -14 - Math.random() * 10, life: 2 + Math.random(), t: 0, size: s, grow: 5, col, smoke: 1, drag: 0.3 });
function fxTick(dt) {
  for (let i = FXP.length - 1; i >= 0; i--) { const p = FXP[i]; p.t += dt; if (p.t >= p.life) { FXP.splice(i, 1); continue; }
    if (p.wander) { p.vx += (Math.random() - 0.5) * 60 * dt; p.vy += (Math.random() - 0.5) * 60 * dt; }
    if (p.sway) p.vx = Math.sin(p.t * 2.5 + p.sway) * 14;
    p.vy += (p.grav || 0) * dt; const dr = Math.exp(-(p.drag || 0) * dt); p.vx *= dr; p.vy *= dr; p.x += p.vx * dt; p.y += p.vy * dt; }
}
function drawFxWorld(ctx) {
  for (const p of FXP) { const k = p.t / p.life, a = p.smoke ? (1 - k) * 0.35 : p.ring ? 1 - k : Math.min(1, (1 - k) * 2);
    if (p.ring) { ctx.strokeStyle = p.col; ctx.globalAlpha = a; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.ring * (0.3 + k), 0, 7); ctx.stroke(); continue; }
    if (p.smoke) { ctx.fillStyle = p.col + a.toFixed(3) + ')'; ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.size + (p.grow || 0) * k, 0, 7); ctx.fill(); continue; }
    ctx.globalAlpha = a * (p.fly ? 0.5 + 0.5 * Math.sin(p.t * 6 + p.x) : 1);
    if (p.glow) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.2, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    ctx.fillStyle = p.col;
    if (p.shape === 'leaf') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 3 + p.sway); ctx.beginPath(); ctx.ellipse(0, 0, 3, 1.5, 0, 0, 7); ctx.fill(); ctx.restore(); }
    else if (p.shape === 'star') { ctx.fillRect(p.x - p.size, p.y - 0.5, p.size * 2, 1); ctx.fillRect(p.x - 0.5, p.y - p.size, 1, p.size * 2); }
    else ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  // Rayo
  const bo = WX.boltAt; if (bo && bo.t > 0) { bo.t -= 1 / 60; ctx.strokeStyle = `rgba(230,240,255,${bo.t * 2.4})`; ctx.lineWidth = 2.5; ctx.beginPath(); let x = bo.x + (Math.random() - 0.5) * 30, y = bo.y - 400; ctx.moveTo(x, y); while (y < bo.y) { y += 30; x += (Math.random() - 0.5) * 26; ctx.lineTo(y >= bo.y ? bo.x : x, Math.min(y, bo.y)); } ctx.stroke(); ctx.lineWidth = 1; }
}
// ---------- Emisores de ambiente y de bloques (cada fotograma, con presupuesto) ----------
let _fxAcc = 0, _stepT = 0;
function fxAmbient(dt, x0, y0, x1, y1) {
  _fxAcc += dt; if (_fxAcc < 1 / 30) return; const st = _fxAcc; _fxAcc = 0;
  const p = S.player, night = daylight() < 0.35, rnd = (a, b) => a + Math.random() * (b - a);
  for (let n = 0; n < 3; n++) {
    const tx = Math.floor(rnd(x0, x1)), ty = Math.floor(rnd(y0, y1)), g = GI[gnd(tx, ty)], B = BIOMES[biomeOf(tx, ty)] || {}, key = B.key || '', wx = (tx + Math.random()) * T, wy = (ty + Math.random()) * T;
    if (typeof fogHidden === 'function' && fogHidden(tx, ty)) continue;
    if (g.tree && !night && Math.random() < 0.25) fxAdd({ x: wx, y: wy - 40, vx: 0, vy: 9 + Math.random() * 6, life: 4, t: 0, size: 2, col: /autumn|maple/i.test(key) ? '#d8803a' : g.tree.a || '#5a9a3a', shape: 'leaf', sway: Math.random() * 6 });
    else if (night && !g.liquid && /forest|plains|meadow|swamp|jungle|grove|savanna|bamboo/i.test(key) && Math.random() < 0.18) fxAdd({ x: wx, y: wy, vx: 0, vy: 0, life: 5, t: 0, size: 1.4, col: '#e8ff7a', glow: 1, wander: 1, drag: 1.5, fly: 1 });
    else if (g.liquid === 'lava' && Math.random() < 0.7) fxAdd({ x: wx, y: wy, vx: rnd(-8, 8), vy: -30 - Math.random() * 30, life: 1.4, t: 0, size: 1.6, col: '#ffa040', glow: 1, grav: 10, drag: 0.5 });
    else if ((g.key === 'SWAMPWATER' || g.key === 'LILYPAD') && Math.random() < 0.4) fxAdd({ x: wx, y: wy, vx: 0, vy: -3, life: 1.2, t: 0, ring: 3, col: 'rgba(200,230,170,.8)' });
    else if (/desert|dune|savanna|badland|mesa/i.test(key) && !night && Math.random() < 0.3) fxAdd({ x: wx, y: wy, vx: 22 + Math.random() * 20, vy: -2, life: 2.5, t: 0, size: 1.2, col: 'rgba(230,200,140,.8)', drag: 0.2 });
    else if (/snow|tundra|ice|frozen|glacier/i.test(key) && Math.random() < 0.3) fxAdd({ x: wx, y: wy, vx: 0, vy: 0, life: 1, t: 0, size: 1.5, col: '#ffffff', shape: 'star' });
    else if (/crystal|amethyst|prism/i.test(key) && Math.random() < 0.5) fxAdd({ x: wx, y: wy, vx: 0, vy: -4, life: 1.4, t: 0, size: 2, col: '#d8b8ff', glow: 1, shape: 'star' });
    else if (/flower|meadow|plains/i.test(key) && !night && g.plant && Math.random() < 0.4) fxAdd({ x: wx, y: wy, vx: rnd(-4, 4), vy: -4, life: 3, t: 0, size: 1.2, col: 'rgba(255,240,150,.9)', wander: 1, drag: 1 });
    else if (/mushroom|fung|myc/i.test(key) && Math.random() < 0.35) fxAdd({ x: wx, y: wy, vx: 0, vy: -5, life: 4, t: 0, size: 1.6, col: '#c8a0ff', glow: 1, wander: 1, drag: 1 });
  }
  // Bloques: chispas y humo
  if (typeof L !== 'undefined' && L.light) for (const b of L.light) {
    if (b.x < x0 || b.x > x1 || b.y < y0 || b.y > y1 || !litOf(b)) continue; const cx = b.x * T + 16, cy = b.y * T + 16, t = b.type;
    if ((t === 'torch' || t === 'candelabra' || t === 'candle') && Math.random() < 0.12) fxAdd({ x: cx + (Math.random() - 0.5) * 3, y: cy - 10, vx: (Math.random() - 0.5) * 8, vy: -18 - Math.random() * 14, life: 0.9, t: 0, size: 1.2, col: '#ffb050', glow: 1, drag: 1 });
    if ((t === 'campfire' || t === 'fireplace' || t === 'woodStove' || t === 'furnace' || t === 'blastFurnace' || t === 'alloySmelter') && Math.random() < 0.18) { fxSmoke(cx + (t === 'woodStove' ? 11 : 0), cy - (t === 'campfire' ? 4 : 16)); if (t === 'campfire' && Math.random() < 0.6) fxAdd({ x: cx, y: cy, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 20, life: 1.1, t: 0, size: 1.4, col: '#ffa040', glow: 1, drag: 1 }); }
  }
  // Pisadas
  if (pmove.moving && !P.swim && !(P.z > 0.5)) { _stepT -= st; if (_stepT <= 0) { _stepT = pmove.sprint ? 0.18 : 0.3; const g = GI[gnd(Math.floor(p.x / T), Math.floor((p.y + 8) / T))], k = g.key || '';
    const col = /SNOW/.test(k) ? '#f4f8ff' : /SAND/.test(k) ? '#e0c890' : /MUD|SWAMP|PEAT/.test(k) ? '#5a4030' : /DIRT|PIT|GRAVEL|ASH/.test(k) ? '#8a7a6a' : null;
    if (col) fxBurst(p.x, p.y + 8, pmove.sprint ? 4 : 2, { col, sp: 25, life: 0.4, size: 1.6, up: 10, grav: 60 }); } }
}
// ---------- Clima en pantalla ----------
const WXP = [];
function drawWeatherScreen(ctx, dt) {
  const W = cv.width, H = cv.height, D = wxDef(), I = WX.int, type = WX.type, cave = WX.cave > 0.5;
  // Tinte de escena por bioma, amanecer/atardecer y tiempo
  const p = S.player, B = BIOMES[biomeOf(Math.floor(p.x / T), Math.floor(p.y / T))] || {}, key = B.key || '', day = daylight();
  let tint = null;
  if (/swamp|bog|marsh/i.test(key)) tint = 'rgba(80,110,50,.10)'; else if (/desert|dune|mesa|badland/i.test(key)) tint = 'rgba(255,190,90,.08)'; else if (/snow|tundra|ice|frozen/i.test(key)) tint = 'rgba(160,200,255,.09)'; else if (/volcan|ash|magma/i.test(key)) tint = 'rgba(255,70,30,.09)'; else if (/mushroom|fung|crystal/i.test(key)) tint = 'rgba(170,110,255,.08)';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (tint && !cave) { ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); }
  if (day > 0.15 && day < 0.55 && !cave) { ctx.fillStyle = `rgba(255,140,70,${(0.55 - Math.abs(day - 0.35) * 2.7) * 0.14})`; ctx.fillRect(0, 0, W, H); }
  if (cave) return;
  // Partículas de clima
  const want = { rain: 140, storm: 240, snow: 90, blizzard: 220, sandstorm: 160, ashfall: 80, spores: 50 }[type] || 0, n = Math.floor(want * I * (W / 1400));
  while (WXP.length < n) WXP.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() });
  if (WXP.length > n) WXP.length = n;
  const wind = type === 'blizzard' || type === 'sandstorm' ? 9 : type === 'storm' ? 4 : 1.2, d = dpr;
  ctx.lineCap = 'round';
  for (const q of WXP) {
    if (type === 'rain' || type === 'storm') { q.y += (14 + q.s * 8) * d * 60 * dt; q.x += wind * d * 60 * dt; ctx.strokeStyle = `rgba(180,210,255,${0.25 + q.s * 0.3})`; ctx.lineWidth = d; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - wind * 2 * d, q.y - (10 + q.s * 8) * d); ctx.stroke(); }
    else if (type === 'snow' || type === 'blizzard') { q.y += (1.2 + q.s * 1.5) * d * 60 * dt; q.x += (wind * 0.6 + Math.sin(q.y / 40 + q.s * 9)) * d * 60 * dt; ctx.fillStyle = `rgba(255,255,255,${0.5 + q.s * 0.4})`; ctx.beginPath(); ctx.arc(q.x, q.y, (1 + q.s * 1.8) * d, 0, 7); ctx.fill(); }
    else if (type === 'sandstorm') { q.x += (8 + q.s * 8) * d * 60 * dt; q.y += Math.sin(q.x / 60) * d; ctx.fillStyle = `rgba(220,180,110,${0.3 + q.s * 0.3})`; ctx.fillRect(q.x, q.y, 3 * d, 1.2 * d); }
    else if (type === 'ashfall') { q.y += (0.8 + q.s) * d * 60 * dt; q.x += Math.sin(q.y / 50) * 0.5 * d; ctx.fillStyle = q.s > 0.85 ? 'rgba(255,140,60,.8)' : `rgba(90,85,80,${0.5 + q.s * 0.3})`; ctx.fillRect(q.x, q.y, 2 * d, 2 * d); }
    else if (type === 'spores') { q.y -= (0.3 + q.s * 0.5) * d * 60 * dt; q.x += Math.sin(q.y / 30 + q.s * 7) * 0.6 * d; ctx.fillStyle = `rgba(200,160,255,${0.35 + q.s * 0.3})`; ctx.beginPath(); ctx.arc(q.x, q.y, (1.5 + q.s * 2) * d, 0, 7); ctx.fill(); }
    if (q.y > H + 20) { q.y = -20; q.x = Math.random() * W; } if (q.y < -30) { q.y = H + 10; q.x = Math.random() * W; } if (q.x > W + 30) { q.x = -20; q.y = Math.random() * H; }
  }
  // Velos: niebla, ventisca, arena, calor
  const veil = { fog: 'rgba(210,220,230,', blizzard: 'rgba(235,240,250,', sandstorm: 'rgba(210,170,110,', heat: 'rgba(255,200,120,', ashfall: 'rgba(80,70,65,' }[type];
  if (veil) { const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.12, W / 2, H / 2, Math.max(W, H) * 0.65), a = (type === 'heat' ? 0.12 : type === 'fog' ? 0.55 : 0.42) * I; g.addColorStop(0, veil + (a * 0.15).toFixed(3) + ')'); g.addColorStop(1, veil + a.toFixed(3) + ')'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  if (WX.flash > 0) { ctx.fillStyle = `rgba(235,242,255,${WX.flash * 1.6})`; ctx.fillRect(0, 0, W, H); }
}
// ---------- Eventos ----------
let _fxOn = false;
{ const g0 = gainXP; gainXP = (k, n) => { const lv0 = S && S.pc && S.pc.lv[k]; g0(k, n); if (S && S.pc && S.pc.lv[k] > (lv0 || 0)) { const p = S.player; fxRingFx(p.x, p.y, '#ffd34a', 34); fxBurst(p.x, p.y - 10, 26, { col: '#ffd34a', sp: 90, life: 1, glow: 1, shape: 'star', up: 30 }); tone(880, 0.1, 'triangle', 0.05, 1.6); tone(1320, 0.18, 'triangle', 0.05, 1, 0.12); } }; }
{ const c0 = craftDirect; craftDirect = (r, k) => { const before = invCount(r.out); c0(r, k); if (invCount(r.out) > before && !ui.open) fxBurst(S.player.x, S.player.y - 8, 12, { col: '#ffe8a0', sp: 50, life: 0.6, glow: 1, shape: 'star' }); }; }
{ const s0 = setBlockAt; setBlockAt = (x, y, b) => { s0(x, y, b); if (_fxOn && b && S) { fxBurst((x + 0.5) * T, (y + 0.8) * T, 8, { col: 'rgba(200,190,170,.9)', sp: 40, life: 0.45, size: 2 }); fxRingFx((x + 0.5) * T, (y + 0.5) * T, 'rgba(255,255,255,.5)', 18); } }; }
{ const d0 = damageFoe; damageFoe = (f, dmg, el, src) => { const r = d0(f, dmg, el, src); if (f) fxBurst(f.x, f.y - 4, 6, { col: el === 'fire' ? '#ff8a3a' : el === 'frost' ? '#9ae0ff' : el === 'storm' ? '#f0f05a' : '#ffe0b0', sp: 90, life: 0.35, size: 1.8, glow: 1 }); return r; }; }
{ const k0 = killFoe; killFoe = f => { if (f) { for (let i = 0; i < 6; i++) fxSmoke(f.x, f.y, 'rgba(120,110,120,', 5); fxAdd({ x: f.x, y: f.y - 6, vx: 0, vy: -24, life: 1.4, t: 0, size: 2.5, col: f.D && f.D.undead ? '#9af0ff' : '#e8e0ff', glow: 1, drag: 0.5 }); } return k0(f); }; }
{ const h0 = hurt; hurt = (t, part, mult, cause) => { h0(t, part, mult, cause); if (S && survOn()) { const p = S.player; fxBurst(p.x, p.y - 10, t === 'burn' ? 8 : 6, { col: t === 'burn' ? '#ff9a4a' : t === 'bruise' || t === 'cramp' ? '#c8a8ff' : '#c8241e', sp: 70, life: 0.5, size: 2, grav: 160, up: 30 }); } }; }
{ const u0 = survUse; survUse = s => { const id = s && s.id, f = id && ITEMS[id].food, r = u0(s); if (r && f && S) { const p = S.player; fxBurst(p.x, p.y - 14, 6, { col: f.w > (f.f || 0) ? '#8ac8ff' : ITEMS[id].c || '#d8a060', sp: 30, life: 0.5, size: 1.6, grav: 120 }); if (f.hp || f.buff) fxBurst(p.x, p.y - 10, 10, { col: '#7ae07a', sp: 40, life: 0.8, glow: 1, shape: 'star', up: 25 }); } return r; }; }
{ const a0 = applyProc; applyProc = (id, part, wi, q) => { const r = a0(id, part, wi, q); if (r && S) { const p = S.player; fxBurst(p.x, p.y - 10, 14, { col: '#7ae07a', sp: 45, life: 0.9, glow: 1, shape: 'star', up: 25 }); } return r; }; }
