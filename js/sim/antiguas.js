'use strict';
// =====================================================================================
//  Máquinas antiguas: restos de la civilización del Primer Engranaje repartidos por el mundo.
//   · Un pedestal de piedra con un gran engranaje roto, cubierto de musgo. Hay como mucho una por zona de
//     200×200 casillas (determinista por semilla), en suelo llano de la superficie.
//   · Acércate y pulsa F: si llevas 3 lingotes de cobre (las piezas para repararla), la reactivas. El
//     engranaje vuelve a girar, brilla, suelta una recompensa y te cuenta un fragmento de la historia.
//   · Cada fragmento es una pieza de la «Crónica perdida». Al reunir los 8, la crónica se completa y te
//     marca la Ciudadela del Primer Engranaje en el mapa (si no la tenías) con un premio.
//  Se guarda qué máquinas reactivaste (S.antig). No cambia el terreno: se dibuja encima.
// =====================================================================================
const ANT_CELL = 200, ANT_COSTE = [['copperIngot', 3]], _antCache = new Map();
const ANT_FRAG = [
  ['El primer giro', '«Al principio todo estaba quieto. Los Artífices forjaron el Primer Engranaje y lo hicieron girar con sus propias manos. Del giro nació el viento.»'],
  ['Los Artífices', '«No eran dioses. Eran herreros pacientes que entendieron que el mundo es una máquina, y que toda máquina necesita que alguien la cuide.»'],
  ['Las torres de bronce', '«Levantamos torres que llevaban el giro de valle en valle. Donde llegaba el giro, crecían los bosques y corrían los ríos.»'],
  ['La Chispa', '«Dentro del Primer Engranaje dormía una chispa: la voluntad del mundo de seguir moviéndose. La guardamos en el Núcleo.»'],
  ['El olvido', '«Con el tiempo dejamos de engrasar las ruedas. Creímos que el mundo giraría solo para siempre. Nos equivocamos.»'],
  ['La Herrumbre', '«La herrumbre no es solo óxido. Es el cansancio del mundo. Empezó en las torres más lejanas y avanzó hacia el centro.»'],
  ['Los ocho guardianes', '«Antes de marcharnos, dejamos ocho guardianes con ocho sellos. Solo quien los venza será digno de abrir la Puerta.»'],
  ['Para quien venga', '«Si estás leyendo esto, la Chispa ha vuelto a despertar. Repara lo que puedas. El mundo te estaba esperando.»'],
];
const antData = () => S.antig || (S.antig = { on: {}, frag: [] });
// Dónde está la máquina de una zona (o null)
function antEn(ix, iy) {
  const k = ix + ',' + iy; if (_antCache.has(k)) return _antCache.get(k);
  let r = null; const sd = (S.gen.seed | 0) ^ 0x5eed;
  if (hash2(ix, iy, sd + 11) < 0.45) for (let i = 0; i < 12 && !r; i++) {
    const tx = ix * ANT_CELL + 20 + Math.floor(hash2(ix * 7 + i, iy, sd + 12) * (ANT_CELL - 40)), ty = iy * ANT_CELL + 20 + Math.floor(hash2(ix, iy * 7 + i, sd + 13) * (ANT_CELL - 40));
    if (Math.abs(ty) > 40000 || Math.abs(tx) > 290000) continue;
    const peek = (x, y) => { const c = typeof peekChunk === 'function' ? peekChunk(x >> CSH, y >> CSH) : null; return c ? c.g[((y & CMASK) << CSH) | (x & CMASK)] : -1; };
    if (peek(tx, ty) < 0 || peek(tx + 1, ty + 1) < 0) { _antCache.delete(k); return null; } // aún no generado: se mira más tarde
    let ok = true; const l0 = lvAt(tx, ty); for (let dy = 0; dy < 2 && ok; dy++) for (let dx = 0; dx < 2 && ok; dx++) { const g = GI[gnd(tx + dx, ty + dy)]; if (!g || g.liquid || g.solid || g.tree || at(tx + dx, ty + dy) || lvAt(tx + dx, ty + dy) !== l0) ok = false; }
    if (ok) r = { x: tx, y: ty, k: tx + ',' + ty, n: i };
  }
  _antCache.set(k, r); return r;
}
function antCerca(px, py, R = 40) { const out = [], tx = Math.floor(px / T), ty = Math.floor(py / T);
  for (let iy = Math.floor((ty - R) / ANT_CELL); iy <= Math.floor((ty + R) / ANT_CELL); iy++) for (let ix = Math.floor((tx - R) / ANT_CELL); ix <= Math.floor((tx + R) / ANT_CELL); ix++) { const m = antEn(ix, iy); if (m && Math.abs(m.x - tx) < R && Math.abs(m.y - ty) < R) out.push(m); }
  return out; }
const antActiva = m => !!antData().on[m.k];
// ---------- Reactivar con F ----------
{ const i0 = interact; interact = (shift, ctrl) => {
  try { if (S && S.player && !ui.open) { const p = S.player, m = antCerca(p.x, p.y, 4).find(q => Math.hypot((q.x + 1) * T - p.x, (q.y + 1) * T - p.y) < 1.9 * T);
    if (m) { if (antActiva(m)) { const f = antData().on[m.k]; toast(`⚙ Máquina antigua en marcha. ${typeof f === 'number' && ANT_FRAG[f] ? '«' + ANT_FRAG[f][0] + '»' : ''}`); return; }
      const falta = ANT_COSTE.filter(([id, n]) => invCount(id) < n); if (falta.length) { toastErr(`⚙ Máquina antigua rota. Le faltan piezas: ${ANT_COSTE.map(([id, n]) => n + ' ' + (ITEMS[id] ? ITEMS[id].n : id)).join(', ')}`); return; }
      for (const [id, n] of ANT_COSTE) invTake(id, n); invVersion++; antReactivar(m); return; } } } catch (e) { console.warn(e); }
  return i0(shift, ctrl); }; }
function antReactivar(m) {
  const A = antData(), libres = ANT_FRAG.map((_, i) => i).filter(i => !A.frag.includes(i)), f = libres.length ? libres[(Math.random() * libres.length) | 0] : -1;
  A.on[m.k] = f >= 0 ? f : true; if (f >= 0) A.frag.push(f);
  const X = (m.x + 1) * T, Y = (m.y + 1) * T; m.t0 = performance.now();
  if (typeof fxBurst === 'function') fxBurst(X, Y - 10, 50, { col: '#ffd060', sp: 150, life: 1, glow: 1, size: 2.4 });
  if (typeof screenFlash === 'function') screenFlash('#fff0c0', 0.1); tone(220, 0.3, 'triangle', 0.05, 2); tone(440, 0.5, 'sine', 0.04, 1.5, 0.25); noise(0.4, 0.04, 600);
  const premio = [['coin', 40, 90], ['starShard', 1, 2], ['goldIngot', 1, 2], ['copperIngot', 2, 4]].filter(([id]) => ITEMS[id]);
  for (let i = 0; i < 2; i++) { const [id, a, b] = premio[(Math.random() * premio.length) | 0]; giSpawn(id, a + ((Math.random() * (b - a + 1)) | 0), X + (Math.random() - 0.5) * 20, Y + 10, 0, 0, false); }
  if (f >= 0) { const [t, x] = ANT_FRAG[f]; if (typeof wvBanner === 'function') wvBanner(`⚙ ${t}`, `${x}\nFragmento ${A.frag.length} de ${ANT_FRAG.length} de la Crónica perdida`, '#ffd060', 7); else toast(t + ': ' + x, true);
    if (A.frag.length === ANT_FRAG.length) setTimeout(() => { if (!S) return; if (typeof wvBanner === 'function') wvBanner('📜 La Crónica perdida', 'Has reunido toda la historia de los Artífices. La Ciudadela del Primer Engranaje está marcada en tu mapa.', '#ffd060', 7);
      try { const R = ruinPos(); if (S.marks && !S.marks.some(q => q.ruin)) S.marks.push({ x: R.x, y: R.y, n: 'Ciudadela del Primer Engranaje', ruin: 1 }); } catch (e) { }
      if (ITEMS.starShard) invGive ? invGive('starShard', 5) : invAdd('starShard', 5); }, 7500); }
  // la siguiente máquina sin reactivar más cercana queda marcada en el mapa (el rastro se va uniendo)
  try { let best = null, bd = 1e9; for (let iy = Math.floor(m.y / ANT_CELL) - 3; iy <= Math.floor(m.y / ANT_CELL) + 3; iy++) for (let ix = Math.floor(m.x / ANT_CELL) - 3; ix <= Math.floor(m.x / ANT_CELL) + 3; ix++) {
      const tx = ix * ANT_CELL + ANT_CELL / 2, ty = iy * ANT_CELL + ANT_CELL / 2; if (Math.abs(ix - Math.floor(m.x / ANT_CELL)) + Math.abs(iy - Math.floor(m.y / ANT_CELL)) === 0) continue; if (hash2(ix, iy, ((S.gen.seed | 0) ^ 0x5eed) + 11) >= 0.45) continue;
      const d = Math.hypot(tx - m.x, ty - m.y); if (d < bd) { bd = d; best = [tx, ty]; } }
    if (best && S.marks && !S.marks.some(q => q.ant && q.x === best[0] && q.y === best[1])) { S.marks.push({ x: best[0], y: best[1], n: '⚙ Señal de otra máquina antigua (cerca de aquí)', ant: 1 }); toast('🗺 En el mapa: señal de otra máquina antigua'); } } catch (e) { }
}
// El pedestal no se atraviesa (la base de piedra); por detrás del engranaje sí se puede pasar
{ const p0 = passable; passable = (x, y, who) => { const r = p0(x, y, who); if (!r || !S || who && typeof who === 'object' && (who.fly || who.proj)) return r;
  const tx = Math.floor(x / T), ty = Math.floor(y / T); const m = antEn(Math.floor(tx / ANT_CELL), Math.floor(ty / ANT_CELL)); if (!m) return r;
  const lx = x - m.x * T, ly = y - m.y * T; if (lx > 8 && lx < 56 && ly > 34 && ly < 54) return false; return r; }; }
// ---------- Dibujo: pedestal, engranaje (roto o girando), musgo, brillo ----------
function antDibujo(ctx) {
  if (!S || !S.player) return; const L = antCerca(view.x, view.y, 30); if (!L.length) return; const sm = ctx.imageSmoothingEnabled, tt = performance.now() / 1000; ctx.imageSmoothingEnabled = false;
  for (const m of L) { const X = m.x * T, Y = m.y * T, on = antActiva(m), cx = X + 32, cy = Y + 30;
    sombraPx(ctx, cx, Y + 52, 26, 6, 0.4);
    // pedestal: losas de piedra en escalón
    for (let i = 0; i < 3; i++) { const w = 52 - i * 10, h = 6, y0 = Y + 46 - i * 6; ctx.fillStyle = ['#6e6a62', '#7e796f', '#8e887c'][i]; ctx.fillRect(cx - w / 2, y0, w, h); ctx.fillStyle = '#a6a090'; ctx.fillRect(cx - w / 2, y0, w, 1); ctx.fillStyle = '#4a4640'; ctx.fillRect(cx - w / 2, y0 + h - 1, w, 1);
      for (let q = 0; q < 4; q++) { ctx.fillStyle = '#4e7a3a'; ctx.fillRect(cx - w / 2 + ((ihash(m.x + q, i) * (w - 3)) | 0), y0 + ((ihash(i, m.y + q) * 3) | 0), 2, 1); } } // musgo
    // engranaje de pie: dientes y cubo, girando si está en marcha (si no, ladeado y con un trozo roto)
    const R = 15, rot = on ? tt * 1.2 : 0.35, dientes = 10, col = on ? '#c8a050' : '#7a6448', osc = on ? '#8a6a30' : '#4e4030';
    for (let dy = -R - 3; dy <= R + 3; dy++) for (let dx = -R - 3; dx <= R + 3; dx++) { const d = Math.hypot(dx, dy); if (d > R + 3) continue; let a = Math.atan2(dy, dx) - rot; a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const diente = ((a / (Math.PI * 2)) * dientes) % 1 < 0.5, roto = !on && a > 4.6 && a < 5.5; if (roto && d > R - 5) continue;
      if (d > R && !diente) continue; if (d < 4) { ctx.fillStyle = '#3a3028'; ctx.fillRect(cx + dx, cy - 6 + dy, 1, 1); continue; }
      if (d > 7 && d < 10 && ((a * 3 / Math.PI) % 1) < 0.5) continue; // huecos entre radios
      const luz = dx + dy < -6 ? 1.18 : dx + dy > 8 ? 0.72 : 1; ctx.fillStyle = luz > 1 ? (on ? '#f0d080' : '#9a8460') : luz < 1 ? osc : col; ctx.fillRect(cx + dx, cy - 6 + dy, 1, 1); }
    if (!on) { ctx.fillStyle = '#4e7a3a'; for (let q = 0; q < 6; q++) ctx.fillRect(cx - 10 + ((ihash(m.x, q) * 20) | 0), cy - 18 + ((ihash(q, m.y) * 22) | 0), 2, 1); } // musgo en el engranaje
    else { ctx.globalCompositeOperation = 'lighter'; const a = 0.14 + Math.sin(tt * 3) * 0.04; for (let dy = -20; dy <= 20; dy += 2) { const w = Math.round(22 * Math.sqrt(1 - (dy / 20) ** 2)); ctx.fillStyle = `rgba(255,200,90,${(a * (1 - Math.abs(dy) / 20)).toFixed(3)})`; ctx.fillRect(cx - w, cy - 6 + dy, w * 2, 2); } ctx.globalCompositeOperation = 'source-over';
      if (Math.random() < 0.3) { ctx.fillStyle = '#fff0b0'; ctx.fillRect(cx + Math.round((Math.random() - 0.5) * 30), cy - 6 + Math.round((Math.random() - 0.5) * 30), 1, 1); } } // chispas
    // aviso al acercarse
    const p = S.player; if (Math.hypot(cx - p.x, Y + 40 - p.y) < 2.2 * T) { const txt = on ? 'En marcha' : 'F: reparar (3 lingotes de cobre)'; ctx.font = 'bold 7px "Taller Pixel","Chakra Petch",monospace'; ctx.textAlign = 'center';
      const w = Math.ceil(ctx.measureText(txt).width) + 8, bx = Math.round(cx - w / 2), by = Y - 16; ctx.fillStyle = '#1a1214'; ctx.fillRect(bx, by, w, 11); ctx.fillStyle = '#f6eedc'; ctx.fillRect(bx + 1, by + 1, w - 2, 9); ctx.fillStyle = '#2a1e1a'; ctx.textBaseline = 'middle'; ctx.fillText(txt, cx, by + 6); ctx.textBaseline = 'alphabetic'; } }
  ctx.imageSmoothingEnabled = sm;
}
{ const d0 = drawCombat; drawCombat = (ctx, ...a) => { try { antDibujo(ctx); } catch (e) { console.warn(e); } return d0(ctx, ...a); }; }
if (typeof cmd === 'function') cmd('antigua', { u: '/antigua', d: 'Dice dónde está la máquina antigua más cercana.', cheat: 1, run() { const L = antCerca(S.player.x, S.player.y, 400); if (!L.length) return 'No hay ninguna cerca (o la zona aún no está generada).'; L.sort((a, b) => Math.hypot(a.x * T - S.player.x, a.y * T - S.player.y) - Math.hypot(b.x * T - S.player.x, b.y * T - S.player.y)); const m = L[0]; return `Máquina antigua en X ${m.x} · Y ${m.y}${antActiva(m) ? ' (en marcha)' : ''}.`; } });
