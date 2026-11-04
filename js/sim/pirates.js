'use strict';
// =====================================================================================
//  Piratas y batallas navales (amplía sim/boats.js):
//   · Galeón: barco grande con cañones. Clic izquierdo dispara balas hacia el ratón; tus colonos
//     con el oficio «Marinero» son la tripulación (más balas por andanada y recarga más rápida).
//   · Flotas piratas en alta mar (más fuertes cuanto más lejos): te rodean y disparan andanadas.
//     Hundidos dejan barriles flotando; si están muy dañados, F a su lado: ¡abordaje!
//   · Mapas piratas cifrados: un trozo de costa con una ✕ y una pista que se aclara al acercarte.
//   · Tres fragmentos de brújula maldita → la Brújula maldita, que señala dónde se hundió el
//     Holandés Hundido. De noche, en barco, allí emerge el Capitán Fantasma.
// =====================================================================================
const PSHIPS = [], PFLOAT = [];
const PS = { spawnT: 20, fireT: 0, ammoT: 0 };
const inSea = () => S && S.boat && deepSea(S.player.x, S.player.y + 4);
const crewN = () => typeof colS === 'function' && S.colony ? colS().list.filter(c => !c.kid && (c.job === 'sailor' || (c.pri && c.pri.sailor))).length : 0;
const hasCannons = () => S && S.boat && BOATS[S.boat.id] && BOATS[S.boat.id].cannons;
// ---------- Marinero (oficio de colono) ----------
if (typeof COL_JOBS !== 'undefined' && !COL_JOBS.sailor) { COL_JOBS.sailor = { n: 'Marinero', i: '⚓', c: 6, tool: null, sk: 'sail' }; if (typeof COL_WORKJOBS !== 'undefined') COL_WORKJOBS.push('sailor'); if (typeof COL_SK !== 'undefined') COL_SK.sail = '⚓ Navegación'; }
if (typeof colTick === 'function') { const t0 = colTick; colTick = (c, dt) => { if (!c.kid && !c.sleeping && c.job === 'sailor' && !c.w && colHour() > 6.5 && colHour() < 19 && c.hun > 30) { c.st = S.boat && hasCannons() ? '⚓ Navega contigo en el galeón' : '⚓ Espera en el puerto (tripulación del galeón)'; colIdle(c, dt); return; } return t0(c, dt); }; }
// ---------- Barcos grandes: se dibujan a escala y con bandera pirata ----------
{ const d0 = drawBoatAt; drawBoatAt = (ctx, id, x, y, ang, now) => { const B = BOATS[id]; if (!B || !B.big) return d0(ctx, id, x, y, ang, now);
  ctx.save(); ctx.translate(x, y); ctx.scale(B.big, B.big); if (B.ghost) { ctx.globalAlpha = 0.72 + Math.sin(now / 300) * 0.1; ctx.shadowColor = '#9af0ff'; ctx.shadowBlur = 14; }
  d0(ctx, id, 0, 0, ang, now); if (B.skull) { ctx.font = '9px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = B.ghost ? '#e8faff' : '#f0f0f0'; ctx.fillText('☠', Math.cos(ang) * 4 + 9, -22); } ctx.restore(); }; }
// La vela fantasma acelera cualquier barco
{ const m0 = moveFactors; moveFactors = () => { const r = m0(); if (S && S.boat && invCount('ghostSail') > 0) r.mul *= 1.35; return r; }; }
// ---------- Cañones ----------
function cannonFire() {
  if (!hasCannons()) return false; if (PS.fireT > 0) return true; if (invCount('cannonball') <= 0) { toastErr('Sin balas de cañón (8 por cada lingote de hierro + 2 de piedra)'); PS.fireT = 0.8; return true; }
  const crew = crewN(), n = 1 + Math.min(4, Math.floor(crew / 2)), mw = mouseWorld(), p = S.player, a0 = Math.atan2(mw.y - p.y, mw.x - p.x);
  for (let i = 0; i < n; i++) { if (invCount('cannonball') <= 0) break; invTake('cannonball', 1); const a = a0 + (i - (n - 1) / 2) * 0.12;
    PROJ.push({ x: p.x + Math.cos(a) * 26, y: p.y + Math.sin(a) * 26, vx: Math.cos(a) * 17 * T, vy: Math.sin(a) * 17 * T, r: 6, dmg: 34 + crew * 2, c: '#2a2a30', team: 'p', life: 0.9, arrow: 0, hit: new Set(), cball: 1 }); }
  PS.fireT = 1.8 / (1 + crew * 0.15); invVersion++; if (typeof tone === 'function') { tone(70, 0.25, 'sawtooth', 0.08, 0.5); tone(110, 0.15, 'square', 0.05, 0.6); }
  if (typeof fxBurst === 'function') fxBurst(p.x + Math.cos(a0) * 30, p.y + Math.sin(a0) * 30, 14, { col: '#c8c0b0', sp: 60, life: 0.6, size: 3 }); return true; }
{ const cvs = document.getElementById('c'); cvs.addEventListener('mousedown', e => { if (e.button !== 0 || !S || ui.open || !hasCannons()) return; const h = heldId(); if (h && ITEMS[h] && ITEMS[h].rod) return; e.stopImmediatePropagation(); e.preventDefault(); cannonFire(); }, true); }
// ---------- Barcos piratas ----------
function shipSpawn(kind, x, y, lvl) { const ghost = kind === 'ghost', hp = ghost ? 2200 : 140 * lvl; const s = { kind, x, y, ang: Math.random() * 6.28, hp, mhp: hp, lvl, cd: 2 + Math.random() * 2, orb: Math.random() < 0.5 ? 1 : -1, sumT: 8, tpT: 12 }; PSHIPS.push(s); return s; }
function seaSpot(rMin, rMax) { const p = S.player; for (let k = 0; k < 40; k++) { const a = Math.random() * 6.28, r = rMin + Math.random() * (rMax - rMin), tx = Math.floor(p.x / T + Math.cos(a) * r), ty = Math.floor(p.y / T + Math.sin(a) * r); if (waterT(tx, ty) && waterT(tx + 1, ty) && waterT(tx, ty + 1)) return [(tx + 0.5) * T, (ty + 0.5) * T]; } return null; }
function shipTick(s, dt) {
  const p = S.player, dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy), ghost = s.kind === 'ghost', fear = invCount('captainHat') > 0 && !ghost;
  // rumbo: rodear al jugador a ~7 casillas (los piratas lejos se acercan; si no vas en barco, se quedan a distancia)
  const want = S.boat ? 7 * T : 11 * T, base = Math.atan2(dy, dx), tang = base + s.orb * Math.PI / 2, k = clamp((d - want) / (4 * T), -1, 1), aim = Math.atan2(Math.sin(base) * k + Math.sin(tang) * (1 - Math.abs(k)), Math.cos(base) * k + Math.cos(tang) * (1 - Math.abs(k)));
  s.ang += Math.atan2(Math.sin(aim - s.ang), Math.cos(aim - s.ang)) * Math.min(1, dt * 1.6);
  const sp = (ghost ? 2.6 : 2.2 + s.lvl * 0.15) * T * dt, nx = s.x + Math.cos(s.ang) * sp, ny = s.y + Math.sin(s.ang) * sp;
  if (ghost || waterT(Math.floor(nx / T), Math.floor(ny / T))) { s.x = nx; s.y = ny; } else { s.orb *= -1; s.ang += Math.PI * 0.6; }
  if ((s.wake = (s.wake || 0) - dt) <= 0) { s.wake = 0.15; if (typeof ripple === 'function') ripple(s.x - Math.cos(s.ang) * 24, s.y + 6 - Math.sin(s.ang) * 8, 12, 0.9); }
  // andanadas
  s.cd -= dt; const range = (ghost ? 16 : 11) * T;
  if (s.cd <= 0 && d < range && !s.board) { const ph = ghost ? (s.hp > s.mhp * 0.66 ? 1 : s.hp > s.mhp * 0.33 ? 2 : 3) : 0, n = ghost ? 3 + ph : 2 + Math.floor(s.lvl / 2);
    s.cd = (ghost ? 2.6 - ph * 0.4 : 3.2 - s.lvl * 0.15) * (fear ? 1.6 : 1);
    for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * (ph === 3 ? 0.35 : 0.14) + (Math.random() - 0.5) * 0.1;
      PROJ.push({ x: s.x + Math.cos(a) * 30, y: s.y + Math.sin(a) * 30, vx: Math.cos(a) * 13 * T, vy: Math.sin(a) * 13 * T, r: 6, dmg: ghost ? 18 : 7 + s.lvl * 3, c: ghost ? '#9af0ff' : '#2a2a30', team: 'e', life: 1.6, el: ghost ? 'frost' : undefined, wound: 'fracture', src: ghost ? 'El Holandés Hundido' : 'Barco pirata' }); }
    if (typeof tone === 'function' && d < 20 * T) tone(60, 0.25, 'sawtooth', 0.06, 0.5); }
  // el Holandés: invoca fantasmas y se teletransporta
  if (ghost) { s.sumT -= dt; s.tpT -= dt;
    if (s.sumT <= 0 && s.hp < s.mhp * 0.66 && ENEMIES.ghost) { s.sumT = 14; for (let i = 0; i < 3; i++) spawnFoe('ghost', s.x + (Math.random() - 0.5) * 60, s.y + (Math.random() - 0.5) * 60, { ag: 1, ghostSea: 1 }); toast('👻 ¡Fantasmas de la tripulación!'); }
    if (s.tpT <= 0 && s.hp < s.mhp * 0.5) { s.tpT = 10; const q = seaSpot(6, 9); if (q) { if (typeof fxBurst === 'function') fxBurst(s.x, s.y, 30, { col: '#9af0ff', sp: 120, life: 0.7, glow: 1 }); s.x = q[0]; s.y = q[1]; } } }
}
function shipHit(s, dmg) { s.hp -= dmg; s.flash = 0.12; if (typeof fxText === 'function') fxText(s.x, s.y - 30, '-' + Math.round(dmg), '#ffd34a'); if (s.hp > 0) return;
  const i = PSHIPS.indexOf(s); if (i >= 0) PSHIPS.splice(i, 1); if (typeof fxBurst === 'function') fxBurst(s.x, s.y, 50, { col: s.kind === 'ghost' ? '#9af0ff' : '#8a5a2a', sp: 160, life: 1, size: 3 });
  if (s.kind === 'ghost') { ghostDefeated(s); return; }
  toast('💥 ¡Barco pirata hundido! Recoge los barriles que flotan.'); const n = 2 + Math.floor(s.lvl / 2); for (let k = 0; k < n; k++) PFLOAT.push({ x: s.x + (Math.random() - 0.5) * 70, y: s.y + (Math.random() - 0.5) * 70, loot: pirateLoot(s.lvl, 0.5), t: 120 });
  S.pirSunk = (S.pirSunk || 0) + 1; }
function pirateLoot(lvl, mul) { const L = [['coin', Math.round((20 + lvl * 25) * mul + Math.random() * 20)]]; if (Math.random() < 0.8) L.push(['cannonball', 4 + lvl * 2]);
  if (Math.random() < 0.45 * mul && ITEMS.pirateMap) L.push(['pirateMap', 1]); if (Math.random() < 0.12 * mul + lvl * 0.02 && ITEMS.cursedFragment) L.push(['cursedFragment', 1]);
  const gems = ['ruby', 'sapphire', 'emerald', 'pearl'].filter(id => ITEMS[id]); if (gems.length && Math.random() < 0.4) L.push([gems[(Math.random() * gems.length) | 0], 1]); return L; }
// ---------- Abordaje ----------
function boardShip(s) {
  const crew = crewN(), mine = 16 + crew * 9 + (invCount('captainHat') ? 20 : 0) + Math.random() * 16, theirs = 4 + s.lvl * 7 + Math.random() * 10 + (s.hp / s.mhp) * 16;
  if (mine >= theirs) { const loot = pirateLoot(s.lvl, 1.2); for (const [id, n] of loot) invGive(id, n, S.player.x, S.player.y); const i = PSHIPS.indexOf(s); if (i >= 0) PSHIPS.splice(i, 1); S.pirBoard = (S.pirBoard || 0) + 1;
    if (typeof wvBanner === 'function') wvBanner('⚔ ¡Abordaje victorioso!', `Tu tripulación (${crew} marinero${crew === 1 ? '' : 's'}) tomó el barco`, '#ffd34a', 3.5);
    toast('🏴‍☠️ Botín del abordaje: ' + loot.map(([id, n]) => n + ' ' + ITEMS[id].n).join(', '), true); if (typeof colLog === 'function' && crew) colLog(`Tus marineros tomaron un barco pirata al abordaje`, '⚔'); }
  else { if (typeof hitPlayer === 'function') hitPlayer(18 + s.lvl * 4, 'cut', 'Abordaje fallido'); s.hp = Math.min(s.mhp, s.hp + s.mhp * 0.15); s.orb *= -1;
    toast(`⚔ El abordaje falló: los piratas eran demasiados${crew ? '' : ' (pon colonos de Marinero para tener tripulación)'}. ¡Dispárales más!`, true); }
}
{ const i0 = interact; interact = (shift, ctrl) => { if (S && S.boat) { const s = PSHIPS.find(q => q.kind !== 'ghost' && Math.hypot(q.x - S.player.x, q.y - S.player.y) < 3 * T); if (s) { if (s.hp > s.mhp * 0.3) { toastErr('Aún está muy entero: dispárale hasta dejarlo por debajo del 30 %'); return; } boardShip(s); return; } }
  return i0(shift, ctrl); }; }
// ---------- Mapas piratas cifrados ----------
const PMAP_RID = ['Donde la arena besa el agua, bajo la palma más sola.', 'Tres pasos al norte de la roca, donde las gaviotas callan.', 'Lo enterró el tuerto donde la costa dobla como un anzuelo.', 'Entre el mar y el bosque, donde nadie mira.', 'Busca la orilla que mira al sol de la tarde.'];
function pmapTarget() { const p = S.player, ptx = p.x / T, pty = p.y / T, P = S.gen;
  for (let k = 0; k < 400; k++) { const a = Math.random() * 6.28, r = 140 + Math.random() * 420, x = Math.round(ptx + Math.cos(a) * r), y = Math.round(pty + Math.sin(a) * r); const t = genTile(x, y, P), g = GI[t]; if (g.liquid || g.solid || g.tree) continue;
    let coast = false; for (let d = 1; d <= 3 && !coast; d++) for (const [ox, oy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) { const gg = GI[genTile(x + ox, y + oy, P)]; if (gg.liquid === 'water' && !gg.walk) { coast = true; break; } } if (coast) return [x, y]; }
  return null; }
function pmapUse() { const L = S.pmaps || (S.pmaps = []); let m = L.find(q => !q.done); if (!m) { const tg = pmapTarget(); if (!tg) { toastErr('El mapa está tan borroso que no se entiende. Prueba en otro sitio.'); return; } invTake('pirateMap', 1); invVersion++; m = { x: tg[0], y: tg[1], rid: (Math.random() * PMAP_RID.length) | 0, done: 0 }; L.push(m); }
  pmapShow(m); }
function pmapShow(m) { const p = S.player, dx = m.x - p.x / T, dy = m.y - p.y / T, d = Math.hypot(dx, dy), fuzz = d > 120 ? 0.25 : d > 40 ? 0.1 : 0, shown = Math.round(d * (1 + (fuzz ? ((m.x * 13 + m.y * 7) % 100 / 100 - 0.5) * fuzz * 2 : 0)) / (d > 40 ? 10 : 1)) * (d > 40 ? 10 : 1);
  const cv = document.createElement('canvas'), N = 41, sc = 5; cv.width = cv.height = N * sc; const c = cv.getContext('2d');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const tx = m.x - 20 + x, ty = m.y - 20 + y, t = genTile(tx, ty, S.gen), col = mapRGB(tx, ty, t); const g = 0.82 + ((x * 7 + y * 13) % 5) * 0.02; c.fillStyle = `rgb(${col[0] * g * 0.9 + 30 | 0},${col[1] * g * 0.85 + 25 | 0},${col[2] * g * 0.7 + 15 | 0})`; c.fillRect(x * sc, y * sc, sc, sc); }
  c.strokeStyle = '#a0201a'; c.lineWidth = 3; c.beginPath(); c.moveTo(20 * sc - 6, 20 * sc - 6); c.lineTo(21 * sc + 6, 21 * sc + 6); c.moveTo(21 * sc + 6, 20 * sc - 6); c.lineTo(20 * sc - 6, 21 * sc + 6); c.stroke();
  $('pmapBody').innerHTML = `<header><h2>🗺 Mapa pirata</h2><button data-close>Cerrar <kbd>Esc</kbd></button></header><div class="pmapimg"></div><p class="towng">«${esc(PMAP_RID[m.rid])}»</p>
    <p>${d < 3 ? '<b>¡Estás encima! Pulsa F para desenterrar.</b>' : `La ✕ queda a unas <b>${shown} casillas al ${xtrDir(dx, dy)}</b>${fuzz ? ' (la pista se aclara cuanto más te acercas)' : ''}.`}</p>`;
  $('pmapBody').querySelector('.pmapimg').appendChild(cv); openModal('pmap'); }
{ const m = document.createElement('div'); m.id = 'mPmap'; m.className = 'modal'; m.hidden = true; m.innerHTML = '<div class="modal-in pmapm" id="pmapBody"></div>'; document.body.appendChild(m); MODALS.pmap = 'mPmap';
  m.addEventListener('mousedown', e => { if (e.target === m || e.target.closest('[data-close]')) closeModal(); }); }
function pmapDig() { const p = S.player, m = (S.pmaps || []).find(q => !q.done && Math.hypot(q.x + 0.5 - p.x / T, q.y + 0.5 - p.y / T) < 2.2); if (!m) return false;
  m.done = 1; const loot = [['coin', 90 + ((Math.random() * 120) | 0)], ...pirateLoot(3, 1).filter(([id]) => id !== 'pirateMap' && id !== 'coin')]; if (Math.random() < 0.35 && ITEMS.cursedFragment) loot.push(['cursedFragment', 1]);
  for (const [id, n] of loot) invGive(id, n, (m.x + 0.5) * T, (m.y + 0.5) * T); invVersion++; if (typeof fxBurst === 'function') fxBurst((m.x + 0.5) * T, (m.y + 0.5) * T, 40, { col: '#ffd34a', sp: 150, life: 0.9, glow: 1, size: 2.5 });
  toast('🏴‍☠️ ¡Cofre pirata! ' + loot.map(([id, n]) => n + ' ' + ITEMS[id].n).join(', '), true); return true; }
{ const i0 = interact; interact = (shift, ctrl) => { if (S && !S.boat && pmapDig()) return; return i0(shift, ctrl); }; }
// usar los objetos (F con ellos en la mano)
{ const f0 = fishUse; fishUse = s => { if (s && s.id === 'pirateMap') { pmapUse(); return true; } if (s && s.id === 'cursedCompass') { compassUse(); return true; } return f0(s); }; }
// abrir el mapa ya empezado sin gastar otro
cmd('mapapirata', { a: ['tesoro'], u: '/mapapirata', d: 'Vuelve a mirar tu mapa pirata empezado.', run() { const m = (S.pmaps || []).find(q => !q.done); if (!m) return 'No tienes ningún mapa pirata empezado.'; pmapShow(m); return ''; } });
// ---------- El Capitán Fantasma ----------
function compassUse() { if (S.ghostDone) { toast('La aguja gira sin rumbo: el Capitán Fantasma ya descansa en el fondo.'); return; }
  if (!S.wreck) { const p = S.player; for (let k = 0; k < 600 && !S.wreck; k++) { const a = Math.random() * 6.28, r = 600 + Math.random() * 700, x = Math.round(p.x / T + Math.cos(a) * r), y = Math.round(p.y / T + Math.sin(a) * r), g = GI[genTile(x, y, S.gen)], b = BIOMES[biomeAt(x, y)];
    if (b && b.ocean && g.liquid === 'water' && (g.key === 'DEEP' || b.key === 'deepOcean')) S.wreck = { x, y }; } if (!S.wreck) { toastErr('La aguja tiembla… prueba en otra zona del mundo, cerca del mar.'); return; } }
  const dx = S.wreck.x - S.player.x / T, dy = S.wreck.y - S.player.y / T; toast(`🧭 La aguja apunta al ${xtrDir(dx, dy)}: el Holandés Hundido yace a unas ${Math.round(Math.hypot(dx, dy) / 10) * 10} casillas. Ve en barco y de noche.`, true);
  if (S.marks && !S.marks.some(m => m.n === 'Holandés Hundido')) S.marks.push({ x: S.wreck.x, y: S.wreck.y, n: 'Holandés Hundido' }); }
function ghostDefeated(s) { // el barco se hunde: sale el capitán
  if (ENEMIES.ghostCaptain) { const f = spawnFoe('ghostCaptain', s.x, s.y, { ag: 1, ghostBoss: 1, boss: false }); f.mhp = f.hp = 1100; }
  if (typeof wvBanner === 'function') wvBanner('☠ ¡El Capitán Fantasma!', 'Su barco se hunde… y él sale a por ti', '#9af0ff', 4); }
{ const k0 = killFoe; killFoe = f => { const r = k0(f); if (f && f.k === 'ghostCaptain' && !S.ghostDone) { S.ghostDone = 1;
    for (const [id, n] of [['ghostSail', 1], ['captainHat', 1], ['coin', 600], ['cannonball', 40]]) if (ITEMS[id]) invGive(id, n, f.x, f.y); invVersion++;
    if (typeof wvBanner === 'function') wvBanner('👑 ¡Has vencido al Capitán Fantasma!', 'Los mares son tuyos: vela fantasma y su sombrero', '#ffd34a', 5); toast('👑 Botín legendario: Vela fantasma, Sombrero del Capitán Fantasma y 600 monedas', true);
    for (const g of FOES) if (g.ghostSea) g.hp = 0; } return r; }; }
// ---------- Cada fotograma ----------
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); if (!S) return; const dt = Math.min(fdt, 0.1); PS.fireT = Math.max(0, PS.fireT - dt);
  // aparecen piratas en alta mar
  const p = S.player, far = Math.hypot(p.x / T, p.y / T);
  if (inSea() && far > 250 && (PS.spawnT -= dt) <= 0) { PS.spawnT = 35 + Math.random() * 30; const lvl = Math.max(1, Math.min(5, 1 + Math.floor(far / 700))), cap = 1 + Math.floor(lvl / 2);
    if (PSHIPS.filter(s => s.kind !== 'ghost').length < cap && Math.random() < 0.45) { const n = Math.random() < 0.25 + lvl * 0.05 ? 2 : 1; let made = 0; for (let k = 0; k < n; k++) { const q = seaSpot(16, 22); if (q) { shipSpawn('pirate', q[0], q[1], lvl); made++; } }
      if (made && typeof wvBanner === 'function') wvBanner('🏴‍☠️ ¡Velas piratas!', made > 1 ? 'Una flota pirata viene a por ti' : 'Un balandro pirata se acerca', '#e05050', 2.5); } }
  // el Holandés Hundido emerge de noche
  if (S.wreck && !S.ghostDone && S.boat && !PSHIPS.some(s => s.kind === 'ghost') && !FOES.some(f => f.k === 'ghostCaptain')) { const h = fHour(); if ((h >= 20 || h < 5) && Math.hypot(S.wreck.x - p.x / T, S.wreck.y - p.y / T) < 26) { const q = seaSpot(10, 14);
    if (q) { shipSpawn('ghost', q[0], q[1], 6); if (typeof wvBanner === 'function') wvBanner('👻 ¡El Holandés Hundido emerge!', 'El barco del Capitán Fantasma surge de las aguas', '#9af0ff', 4); } } }
  for (let i = PSHIPS.length - 1; i >= 0; i--) { const s = PSHIPS[i]; if (Math.hypot(s.x - p.x, s.y - p.y) > 70 * T) { PSHIPS.splice(i, 1); continue; } shipTick(s, dt); if (s.flash > 0) s.flash -= dt; }
  // balas de cañón contra barcos
  if (PSHIPS.length) for (const pr of PROJ) { if (!pr.cball || pr.team !== 'p' || pr.life <= 0) continue; for (const s of PSHIPS) if (Math.hypot(pr.x - s.x, pr.y - s.y) < (s.kind === 'ghost' ? 34 : 26)) { shipHit(s, pr.dmg); pr.life = 0; break; } }
  // barriles flotando
  for (let i = PFLOAT.length - 1; i >= 0; i--) { const b = PFLOAT[i]; b.t -= dt; if (b.t <= 0) { PFLOAT.splice(i, 1); continue; } if (Math.hypot(b.x - p.x, b.y - p.y) < 1.6 * T) { for (const [id, n] of b.loot) invGive(id, n, p.x, p.y); invVersion++; toast('🛢 Barril: ' + b.loot.map(([id, n]) => n + ' ' + ITEMS[id].n).join(', ')); PFLOAT.splice(i, 1); } }
  // HUD del galeón
  const el = $('galHud'); if (el) { const on = !!hasCannons() && !ui.open; el.hidden = !on; if (on) el.textContent = `💣 ${invCount('cannonball')} balas · ⚓ tripulación ${crewN()} · clic: disparar${PS.fireT > 0 ? ' (recargando)' : ''}`; }
}; }
{ const e = document.createElement('div'); e.id = 'galHud'; e.hidden = true; document.body.appendChild(e); }
// ---------- Dibujo: barcos, barras de vida y barriles ----------
{ const d0 = drawCombat; drawCombat = (ctx, ...a) => { const r = d0(ctx, ...a); if (!S || (!PSHIPS.length && !PFLOAT.length)) return r; const now = performance.now();
  for (const b of PFLOAT) { const bob = Math.sin(now / 400 + b.x) * 2; ctx.fillStyle = '#7a4a22'; ctx.fillRect(b.x - 6, b.y - 7 + bob, 12, 14); ctx.fillStyle = '#4a2a12'; ctx.fillRect(b.x - 6, b.y - 3 + bob, 12, 2); ctx.fillRect(b.x - 6, b.y + 3 + bob, 12, 2); }
  for (const s of PSHIPS) { drawBoatAt(ctx, s.kind === 'ghost' ? 'ghostShip' : 'pirateSloop', s.x, s.y, s.ang, now);
    const w = s.kind === 'ghost' ? 90 : 50, f = Math.max(0, s.hp / s.mhp), y = s.y - (s.kind === 'ghost' ? 92 : 70); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(s.x - w / 2 - 1, y - 1, w + 2, 7); ctx.fillStyle = f < 0.3 ? '#ffd34a' : s.kind === 'ghost' ? '#9af0ff' : '#e05050'; ctx.fillRect(s.x - w / 2, y, w * f, 5);
    ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(s.kind === 'ghost' ? 'El Holandés Hundido' : `Balandro pirata · nv ${s.lvl}`, s.x + 1, y - 3); ctx.fillStyle = '#f0e8d8'; ctx.fillText(s.kind === 'ghost' ? 'El Holandés Hundido' : `Balandro pirata · nv ${s.lvl}`, s.x, y - 4);
    if (s.kind !== 'ghost' && f < 0.3 && S.boat && Math.hypot(s.x - S.player.x, s.y - S.player.y) < 4 * T) { ctx.fillStyle = '#ffd34a'; ctx.fillText('F: ¡abordaje!', s.x, y - 15); } }
  return r; }; }
cmd('piratas', { a: [], u: '/piratas', d: 'Truco: aparece un barco pirata cerca (tienes que ir en barco por el mar).', cheat: 1, run() { if (!S.boat) return 'Sube a un barco en el mar.'; const q = seaSpot(10, 16); if (!q) return 'No hay mar abierto aquí.'; shipSpawn('pirate', q[0], q[1], 2); return '🏴‍☠️'; } });
