'use strict';
// =====================================================================================
//  Ciclo de estaciones (datos en data/seasons.js).
//  · Primavera, verano, otoño e invierno: 7 días cada una (un año = 28 días).
//  · Cambian el clima (en invierno nieva casi en todas partes, en verano hay olas de calor),
//    la temperatura y los cultivos (en invierno crecen muy despacio, salvo los que aguantan el frío).
//  · Cada estación tiene su evento el día 4: Festival de las Flores, Lluvia de estrellas,
//    Cosecha dorada y Noche de los regalos.
//  · El reloj enseña la estación y cuánto falta para su evento; en pantalla, pétalos, luciérnagas,
//    hojas o copos según toque.
// =====================================================================================
const SN = { last: '', ev: '', starT: 8, giftT: 5, gifts: 0, amb: [], ambK: '' };
function seasonInfo() {
  const d = Math.max(0, Math.floor(S.time / (S.gen.dayLen || DAY_LEN))), i = Math.floor(d / SEASON_DAYS) % 4, day = (d % SEASON_DAYS) + 1;
  return { S: SEASONS[i], i, day, year: Math.floor(d / (SEASON_DAYS * 4)) + 1, ev: day === SEASON_EV_DAY };
}
const seasonK = () => S ? seasonInfo().S.k : 'spring';
const seasonEv = k => S && !S.alwaysDay && (() => { const s = seasonInfo(); return s.ev && (!k || s.S.k === k); })();
// ---------- Clima, temperatura y cultivos ----------
{ const w0 = wxWeights; wxWeights = key => { const w = { ...w0(key) }, k = seasonK(), dry = /desert|dune|badland|mesa|canyon|volcan|ash|basalt|magma|infern/i.test(key);
  if (k === 'winter' && !dry) { w.snow = (w.snow || 0) + 40; w.blizzard = (w.blizzard || 0) + 6; delete w.heat; if (w.rain) w.rain *= 0.3; if (w.storm) w.storm *= 0.3; }
  else if (k === 'summer') { w.heat = (w.heat || 0) + 14; if (w.rain) w.rain *= 0.6; delete w.snow; }
  else if (k === 'autumn') { if (w.rain) w.rain *= 1.5; w.fog = (w.fog || 0) + 10; }
  else if (k === 'spring') { if (w.rain) w.rain *= 1.3; if (w.snow) w.snow *= 0.4; }
  return w; }; }
{ const a0 = ambient; ambient = () => a0() + ({ winter: -7, summer: 4, autumn: -2, spring: 0 }[seasonK()] || 0); }
{ const r0 = cropRate; cropRate = b => { let r = r0(b); if (!S) return r; const s = seasonInfo().S; let m = s.crop; if (s.k === 'winter' && WINTER_CROPS.includes(b.crop)) m = 0.85; if (seasonEv('spring')) m *= 2; return r * m; }; }
// Cosecha dorada: lo maduro da el doble
{ const h0 = harvestCrop; harvestCrop = (b, o) => { const ripe = b && CROP[b.crop] && cropStage(b) >= 3, got = h0(b, o); if (ripe && got && seasonEv('autumn')) { const d = CROP[b.crop]; if (got[d.item]) { invGive(d.item, got[d.item], (b.x + 0.5) * T, (b.y + 0.5) * T); fxText(b.x * T + 16, b.y * T - 12, '✨ ¡Cosecha dorada! ×2', '#ffd34a'); } } return got; }; }
// ---------- Cada fotograma: cambios de estación y eventos ----------
function seasonTick(dt) {
  if (S.alwaysDay) return; const s = seasonInfo(), key = s.year + ':' + s.i;
  if (SN.last && SN.last !== key) wvBanner(`${s.S.i} Llega ${s.S.k === 'summer' ? 'el' : s.S.k === 'autumn' ? 'el' : s.S.k === 'winter' ? 'el' : 'la'} ${s.S.n.toLowerCase()}`, { spring: 'Los cultivos crecen más rápido y llueve más.', summer: 'Hace calor: bebe a menudo. Hay olas de calor.', autumn: 'Llueve y hay niebla. Recoge tus cultivos antes del invierno.', winter: 'Nieva y hace frío: abrígate. Casi nada crece (salvo patatas, zanahorias y otros del frío).' }[s.S.k], s.S.c, 5);
  SN.last = key;
  const evKey = key + ':' + s.day; if (s.ev && SN.ev !== evKey) { SN.ev = evKey; SN.gifts = 0; setTimeout(() => wvBanner(`${s.S.i} ${s.S.ev}`, s.S.evd, s.S.c, 5), 1200); if (typeof sysMsg === 'function') sysMsg(`${s.S.i} Hoy es ${s.S.ev}: ${s.S.evd}`); }
  if (!s.ev || (typeof inDungeon === 'function' && inDungeon()) || (typeof inArena === 'function' && inArena())) return;
  const p = S.player;
  if (s.S.k === 'spring' && S.pets) for (const pt of S.pets) pt.hp = Math.min(pt.mhp, pt.hp + dt * 2);
  if (s.S.k === 'summer' && daylight() < 0.3 && (SN.starT -= dt) <= 0) { SN.starT = 9 + Math.random() * 9; seasonStar(); }
  if (s.S.k === 'winter' && SN.gifts < 8 && (SN.giftT -= dt) <= 0) { SN.giftT = 25 + Math.random() * 30; SN.gifts++;
    const a = Math.random() * 6.28, d = (4 + Math.random() * 5) * T, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d; if (passable(x, y)) { giSpawn('giftBox', 1, x, y, 0, 0, false); fxBurst(x, y, 30, { col: '#ffffff', sp: 90, life: 0.8, glow: 1, size: 2 }); toast('🎁 ¡Ha aparecido un regalo cerca!'); } }
}
// Estrella fugaz: cruza el cielo y cae cerca; deja un fragmento en el suelo
function seasonStar() {
  const p = S.player, a = Math.random() * 6.28, d = (5 + Math.random() * 7) * T, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
  HAZ.push({ x, y, r: 26, t: 1.4, dl: 1.4, kind: 'warn', c: '#fff4a0' }); tone(1200, 1.2, 'sine', 0.03, 0.3);
  setTimeout(() => { if (!S) return; addBolt(x - 260, y - 420, x, y, '#fff4a0', 0.35); fxBurst(x, y, 40, { col: '#fff4a0', sp: 160, life: 0.9, glow: 1, size: 2.4 }); screenFlash('#fff8d0', 0.12); noise(0.3, 0.05, 2000);
    if (Math.hypot(S.player.x - x, S.player.y - y) < 1.2 * T) hitPlayer(6, 'burn', 'Estrella fugaz', 'fire');
    giSpawn('starShard', 1 + (Math.random() < 0.3 ? 1 : 0), x, y, 0, 0, false); }, 1400);
}
// Abrir un regalo: F con él en la mano
{ const i0 = interact; interact = (shift, ctrl) => { const s = S && S.inv[S.sel]; if (s && s.id === 'giftBox' && !ui.hand) { seasonGift(); return; } return i0(shift, ctrl); }; }
function seasonGift() {
  invTake('giftBox', 1); invVersion++; const pool = [['coin', 30, 80], ['cookies', 3, 6], ['tPotHeal2', 1, 3], ['goldIngot', 1, 3], ['starShard', 1, 2], ['wool', 3, 6], ['manaCrystal', 1, 2], ['caramel', 2, 5]].filter(([id]) => ITEMS[id]);
  const got = []; for (let i = 0; i < 3; i++) { const [id, a, b] = pool[(Math.random() * pool.length) | 0]; got.push([id, a + ((Math.random() * (b - a + 1)) | 0)]); }
  if (Math.random() < 0.15) { const gear = Object.keys(ITEMS).filter(id => ITEMS[id].weapon && typeof TR !== 'undefined' && TR[id] && (TR[id].r || 0) >= 2 && (TR[id].r || 0) <= 4); if (gear.length) got.push([gear[(Math.random() * gear.length) | 0], 1]); }
  for (const [id, n] of got) invGive(id, n); fxBurst(S.player.x, S.player.y - 10, 40, { col: '#e04a5a', sp: 140, life: 0.8, glow: 1, size: 2.4 }); tone(880, 0.1, 'triangle', 0.05, 1.3); tone(1320, 0.2, 'triangle', 0.05, 1, 0.1);
  toast('🎁 Dentro había: ' + got.map(([id, n]) => n + ' ' + ITEMS[id].n).join(', '), true);
}
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); if (S) seasonTick(fdt); }; }
// ---------- En el reloj ----------
{ const c0 = clockHTML; clockHTML = () => { const h = c0(); if (!S || S.alwaysDay) return h; const s = seasonInfo(), left = s.day < SEASON_EV_DAY ? SEASON_EV_DAY - s.day : s.day > SEASON_EV_DAY ? SEASON_DAYS - s.day + SEASON_EV_DAY : 0;
  return h + `<div class="clkn clks" style="color:${s.S.c}">${s.S.i} ${s.S.n} · día ${s.day}/${SEASON_DAYS} · ${s.ev ? `¡hoy: ${s.S.ev}!` : `evento en ${left} día${left === 1 ? '' : 's'}`}</div>`; }; }
// ---------- En pantalla: pétalos, luciérnagas, hojas o copos ----------
{ const w0 = drawWeatherScreen; drawWeatherScreen = (ctx, dt) => { w0(ctx, dt); if (!ctx || !S || S.alwaysDay || (typeof XT !== 'undefined' && XT.cur) || (typeof inDungeon === 'function' && inDungeon()) || (typeof inArena === 'function' && inArena()) || (WX.cave || 0) > 0.5) return;
  const k = seasonK(), W = ctx.canvas.width, H = ctx.canvas.height, L = SN.amb, d = dt || 0.016, night = daylight() < 0.3; if (k === 'summer' && !night) return;
  if (SN.ambK !== k) { SN.ambK = k; L.length = 0; for (let i = 0; i < (k === 'winter' ? 80 : 26); i++) L.push({ x: Math.random() * W, y: Math.random() * H, s: 0.6 + Math.random(), p: Math.random() * 6 }); }
  ctx.save();
  if (k === 'winter') { ctx.fillStyle = 'rgba(235,245,255,.17)'; ctx.fillRect(0, 0, W, H); } /* el mundo se ve nevado */
  else if (k === 'autumn') { ctx.fillStyle = 'rgba(255,150,60,.04)'; ctx.fillRect(0, 0, W, H); }
  for (const o of L) { o.p += d;
    if (k === 'spring') { o.y += 22 * o.s * d; o.x += Math.sin(o.p) * 18 * d + 10 * d; ctx.fillStyle = '#ffc0dc'; ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.ellipse(o.x, o.y, 2.6 * o.s, 1.5 * o.s, o.p, 0, 7); ctx.fill(); }
    else if (k === 'summer') { o.x += Math.sin(o.p * 0.7) * 14 * d; o.y += Math.cos(o.p * 0.9) * 10 * d; ctx.globalAlpha = 0.4 + 0.6 * Math.max(0, Math.sin(o.p * 2.5)); ctx.fillStyle = '#e8ff80'; ctx.beginPath(); ctx.arc(o.x, o.y, 1.6 * o.s, 0, 7); ctx.fill(); }
    else if (k === 'autumn') { o.y += 30 * o.s * d; o.x += Math.sin(o.p * 1.3) * 26 * d; ctx.globalAlpha = 0.85; ctx.fillStyle = o.s > 1.1 ? '#d8642a' : '#e8a040'; ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.p * 2); ctx.fillRect(-2.5 * o.s, -1.5 * o.s, 5 * o.s, 3 * o.s); ctx.restore(); }
    else { o.y += 26 * o.s * d; o.x += Math.sin(o.p) * 10 * d; ctx.globalAlpha = 0.85; ctx.fillStyle = '#ffffff'; ctx.fillRect(o.x, o.y, 1.6 * o.s + 0.6, 1.6 * o.s + 0.6); }
    if (o.y > H + 5) { o.y = -5; o.x = Math.random() * W; } if (o.x > W + 5) o.x = -5; if (o.x < -5) o.x = W + 5; if (o.y < -5) o.y = H; }
  ctx.restore(); }; }
cmd('estacion', { a: ['estación', 'season'], u: '/estacion [primavera|verano|otoño|invierno] [evento]', d: 'Salta a esa estación (y, con «evento», al día de su evento).', cheat: 1, run(a) {
  const want = normTxt(a[0] || ''), i = SEASONS.findIndex(s => normTxt(s.n) === want || s.k === want); if (i < 0) { const s = seasonInfo(); okMsg(`${s.S.i} ${s.S.n}, día ${s.day} de ${SEASON_DAYS} (año ${s.year})`); return; }
  const dl = S.gen.dayLen || DAY_LEN, d = Math.floor(S.time / dl), year0 = Math.floor(d / (SEASON_DAYS * 4)) * SEASON_DAYS * 4, frac = S.time / dl - d;
  S.time = (year0 + i * SEASON_DAYS + (a[1] ? SEASON_EV_DAY - 1 : 0) + frac) * dl; okMsg(`${SEASONS[i].i} Ahora es ${SEASONS[i].n.toLowerCase()}${a[1] ? ' y hoy es ' + SEASONS[i].ev : ''}.`);
} });
