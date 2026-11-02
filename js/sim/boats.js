'use strict';
// =====================================================================================
//  Barcos e islas del tesoro (datos en data/explore.js).
//  · Con un barco en la mano, F junto al agua: subes. Por el agua vas rápido y sin nadar (ni
//    cansarte ni ahogarte); a tierra no se puede ir en barco. F junto a la orilla: bajas y el
//    barco vuelve a tu inventario. La balsa no aguanta bien el mar abierto (va a la mitad).
//  · Pesca de altura: pescando desde un barco en el mar salen capturas mejores, cofres hundidos
//    y, a veces, un mapa del tesoro.
//  · Islas del tesoro: en mar abierto, lejos del inicio, islitas de arena y palmeras con un cofre
//    enterrado (✕) y piratas que lo guardan. Cada una se saquea una vez.
// =====================================================================================
const BT = { wakeT: 0, ang: 0, isl: new Map() };
if (typeof PERSONAL !== 'undefined') PERSONAL.add('boat'); // en multijugador, el barco es de cada uno
const boatDef = () => S && S.boat ? BOATS[S.boat.id] : null;
const tileG = (tx, ty) => { const c = peekChunk(tx >> CSH, ty >> CSH); return c ? GI[c.g[((ty & CMASK) << CSH) | (tx & CMASK)]] : null; };
const waterT = (tx, ty) => { const g = tileG(tx, ty); return !!g && g.liquid === 'water' && !g.walk; };
const deepSea = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T), g = tileG(tx, ty), b = BIOMES[biomeOf(tx, ty)]; return !!(g && (g.key === 'DEEP' || (b && b.ocean))); };
// ---------- Subir y bajar ----------
function boatBoard(id) {
  if (S.boat) return; if (mountPet()) { toastErr('Bájate antes de la montura'); return; }
  const p = S.player, px = Math.floor(p.x / T), py = Math.floor((p.y + 4) / T); let best = null, bd = 9;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (waterT(px + dx, py + dy)) { const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = [px + dx, py + dy]; } }
  if (!best) { toastErr('Acércate al agua para echar el barco'); return; }
  invTake(id, 1); invVersion++; S.boat = { id }; p.x = (best[0] + 0.5) * T; p.y = (best[1] + 0.5) * T - 4; P.mvx = P.mvy = 0;
  if (typeof ripple === 'function') ripple(p.x, p.y + 4, 20, 1); tone(220, 0.2, 'sine', 0.05, 1.4); toast(`⛵ Subes a ${BOATS[id].n.toLowerCase()}. F junto a la orilla para bajar.`);
}
function boatLeave(force) {
  const p = S.player, px = Math.floor(p.x / T), py = Math.floor((p.y + 4) / T), mw = mouseWorld(); let best = null, bd = 1e9;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const tx = px + dx, ty = py + dy, g = tileG(tx, ty); if (!g || waterT(tx, ty) || g.liquid || g.solid || g.tree || at(tx, ty)) continue;
    const d = Math.hypot((tx + 0.5) * T - mw.x, (ty + 0.5) * T - mw.y) + Math.hypot(dx, dy) * 20; if (d < bd) { bd = d; best = [tx, ty]; } }
  if (!best && !force) return false;
  const id = S.boat.id; S.boat = null; if (best) { p.x = (best[0] + 0.5) * T; p.y = (best[1] + 0.5) * T - 4; }
  invGive(id, 1); invVersion++; if (!force) toast('Bajas a tierra. El barco vuelve a tu inventario.');
  return true;
}
{ const i0 = interact; interact = (shift, ctrl) => {
  if (S && S.boat) { if (boatLeave()) return; if (typeof isleInteract === 'function' && isleInteract()) return; toast('Acércate a la orilla para bajar'); return; }
  const s = S && S.inv[S.sel]; if (s && ITEMS[s.id] && ITEMS[s.id].boat && !ui.hand && !at(mouse.tx, mouse.ty)) { boatBoard(s.id); return; }
  if (s && s.id === 'isleMap' && !ui.hand) { isleRead(); return; }
  return i0(shift, ctrl); }; }
// Morir o cambiar de mundo dentro del barco: lo recuperas
{ const d0 = die; die = () => { if (S && S.boat) boatLeave(true); return d0(); }; }
// ---------- Moverse por el agua ----------
{ const p0 = passable; passable = (x, y, who) => { if (who === 'player' && S && S.boat) { const g = tileG(Math.floor(x / T), Math.floor(y / T)); return !!g && g.liquid === 'water' && !g.walk && !g.solid; } return p0(x, y, who); }; }
{ const s0 = swimState; swimState = () => S && S.boat ? 0 : s0(); }
{ const m0 = moveFactors; moveFactors = () => { const B = boatDef(); if (!B) return m0(); const slow = !B.deep && deepSea(S.player.x, S.player.y + 4) ? 0.5 : 1; return { mul: B.spd * slow * 0.7, grip: 2.4, slip: 1 }; }; }
function boatTick(dt) {
  const B = boatDef(); if (!B) return; const p = S.player, v = Math.hypot(P.mvx || 0, P.mvy || 0);
  if (v > 8) { const a = Math.atan2(P.mvy, P.mvx); BT.ang += Math.atan2(Math.sin(a - BT.ang), Math.cos(a - BT.ang)) * Math.min(1, dt * 6); }
  if (v > 20 && (BT.wakeT -= dt) <= 0) { BT.wakeT = 0.12; if (typeof ripple === 'function') ripple(p.x - Math.cos(BT.ang) * 16, p.y + 6 - Math.sin(BT.ang) * 6, 10, 0.9); }
  // Si por lo que sea acaba en tierra (un bloque, una partida antigua…), se baja solo
  if (!waterT(Math.floor(p.x / T), Math.floor((p.y + 4) / T)) && !waterT(Math.floor(p.x / T), Math.floor(p.y / T))) boatLeave(true);
}
// ---------- Dibujo ----------
function drawBoatAt(ctx, id, x, y, ang, now) {
  const B = BOATS[id]; if (!B) return; const bob = Math.sin(now / 420 + x * 0.01) * 1.2;
  ctx.save(); ctx.translate(x, y + 5 + bob); ctx.scale(1.35, 0.84); ctx.rotate(ang);
  const L = id === 'boatRaft' ? 20 : id === 'boatSail' ? 26 : 22, W = id === 'boatRaft' ? 13 : 11;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(2, 3, L + 2, W + 2, 0, 0, 7); ctx.fill();
  if (id === 'boatRaft') { ctx.fillStyle = B.hull; for (let i = -2; i <= 2; i++) { ctx.fillRect(-L, i * 5 - 2.2, L * 2, 4.4); } ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-L * 0.6, -W); ctx.lineTo(-L * 0.6, W); ctx.moveTo(L * 0.6, -W); ctx.lineTo(L * 0.6, W); ctx.stroke(); }
  else { ctx.fillStyle = B.hull; ctx.beginPath(); ctx.moveTo(L + 6, 0); ctx.quadraticCurveTo(L * 0.4, -W - 3, -L, -W * 0.8); ctx.lineTo(-L, W * 0.8); ctx.quadraticCurveTo(L * 0.4, W + 3, L + 6, 0); ctx.fill();
    ctx.fillStyle = '#c8a070'; ctx.beginPath(); ctx.moveTo(L + 1, 0); ctx.quadraticCurveTo(L * 0.4, -W + 1, -L + 3, -W * 0.6); ctx.lineTo(-L + 3, W * 0.6); ctx.quadraticCurveTo(L * 0.4, W - 1, L + 1, 0); ctx.fill();
    ctx.strokeStyle = '#6a4220'; ctx.lineWidth = 1; for (const k of [-0.35, 0.15]) { ctx.beginPath(); ctx.moveTo(L * k, -W + 1); ctx.lineTo(L * k, W - 1); ctx.stroke(); } }
  ctx.restore();
  if (B.sail) { ctx.save(); ctx.translate(x, y - 2 + bob); ctx.scale(1.3, 1.3); const sx = Math.cos(ang) * 4; ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, 4); ctx.lineTo(sx, -40); ctx.stroke();
    ctx.fillStyle = B.sail; ctx.globalAlpha = 0.92; ctx.beginPath(); ctx.moveTo(sx + 1, -38); ctx.quadraticCurveTo(sx + 20 + Math.sin(now / 500) * 2, -22, sx + 1, -6); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; ctx.restore(); }
}
{ const d0 = drawPlayer; drawPlayer = ctx => { if (S && S.boat) drawBoatAt(ctx, S.boat.id, S.player.x, S.player.y, BT.ang, performance.now()); return d0(ctx); }; }

// ---------- Pesca de altura ----------
{ const r0 = rollCatch; rollCatch = (kind, rod) => {
  if (!S.boat || !['sea', 'deep', 'cold', 'warm'].includes(kind)) return r0(kind, rod);
  const a = r0(kind, rod), b = r0(kind, rod), d = id => (FISH_TABLE[id] && !FISH_TABLE[id].junk ? FISH_TABLE[id].d : -1); let id = d(b) > d(a) ? b : a; // la mejor de dos
  const r = Math.random(); if (r < 0.05 && ITEMS.isleMap) id = 'isleMap'; else if (r < 0.11 && FISH_TABLE.sunkenChest && ITEMS.sunkenChest) id = 'sunkenChest';
  return id; }; }
// El mapa del tesoro no está en la tabla de peces: se le da una entrada para que fishLand no falle
FISH_TABLE.isleMap = FISH_TABLE.isleMap || { d: 0.8, w: {} };

// ---------- Islas del tesoro ----------
const ISL_REG = 220;
function isleAt(rx, ry) {
  const key = rx + ',' + ry; if (BT.isl.has(key)) return BT.isl.get(key); const P = S.gen, sd = (P.seed || 1) % 100000, h = i => hash2(rx, ry, 5300 + sd + i); let I = null;
  if (h(0) < 0.4) { const x = rx * ISL_REG + 30 + Math.floor(h(1) * (ISL_REG - 60)), y = ry * ISL_REG + 30 + Math.floor(h(2) * (ISL_REG - 60));
    if (Math.hypot(x, y) > 220 && Math.abs(y) < 38000) { const c = climate(x, y, P, [0, 0, 0, 0, 0]), b = BIOMES[pickBiome(c[0], c[1], c[2], c[3], c[4], P)];
      if (b && b.ocean) { let ok = true; for (let a = 0; a < 6.28 && ok; a += 0.785) { const c2 = climate(x + Math.cos(a) * 16, y + Math.sin(a) * 16, P, [0, 0, 0, 0, 0]); if (!BIOMES[pickBiome(c2[0], c2[1], c2[2], c2[3], c2[4], P)].ocean) ok = false; }
        if (ok) I = { key, x, y, r: 5 + Math.floor(h(3) * 4), lvl: Math.max(1, Math.min(5, 1 + Math.floor(Math.hypot(x, y) / 500))) }; } } }
  BT.isl.set(key, I); return I;
}
function islesNear(tx, ty, rad) { const out = []; for (let ry = Math.floor((ty - rad) / ISL_REG); ry <= Math.floor((ty + rad) / ISL_REG); ry++) for (let rx = Math.floor((tx - rad) / ISL_REG); rx <= Math.floor((tx + rad) / ISL_REG); rx++) { const I = isleAt(rx, ry); if (I && Math.abs(I.x - tx) <= rad && Math.abs(I.y - ty) <= rad) out.push(I); } return out; }
// La isla se pinta sobre el mar al generar el trozo (y su bioma pasa a ser playa)
function isleOverlay(c, tiles) {
  const x0 = c.cx * CS, y0 = c.cy * CS, beach = BI_.beach, S0 = S.gen.seed || 0;
  for (const I of islesNear(x0 + 16, y0 + 16, 32)) for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) {
    const tx = x0 + x, ty = y0 + y, d = Math.hypot(tx - I.x, ty - I.y) + (vnoise(tx / 3, ty / 3, S0 + 5401) - 0.5) * 2.4; if (d > I.r) continue; const i = (y << CSH) | x;
    if (tiles) { let t = d < I.r - 2.2 ? G.GRASS : G.SAND; if (d < I.r - 1.5 && Math.hypot(tx - I.x, ty - I.y) > 3.2 && hash2(tx, ty, 5402) < 0.09 && G.PALM !== undefined) t = G.PALM; c.g[i] = t; c.t[i] = GI[t].hp || 0; }
    if (beach !== undefined) c.bio[i] = beach; }
}
{ const g0 = genChunkTiles; genChunkTiles = c => { g0(c); if (!(typeof dgChunk === 'function' && dgChunk(c))) isleOverlay(c, true); }; }
{ const b0 = computeChunkBiomes; computeChunkBiomes = c => { b0(c); if (!(typeof dgChunk === 'function' && dgChunk(c))) isleOverlay(c, false); }; }
const isleDone = I => !!(S.isles && S.isles[I.key]);
function isleTick(dt) {
  if ((BT.chk = (BT.chk || 0) - dt) > 0) return; BT.chk = 1; const p = S.player, tx = p.x / T, ty = p.y / T;
  for (const I of islesNear(tx, ty, 40)) { const d = Math.hypot(I.x - tx, I.y - ty), seen = S.isleSeen || (S.isleSeen = {});
    if (d < 34 && !seen[I.key]) { seen[I.key] = 1; toast(`🏝 ¡Una isla del tesoro a la vista! (nivel ${I.lvl})${isleDone(I) ? ' Ya la saqueaste.' : ' Algo brilla en la arena…'}`, true); }
    if (d < I.r + 6 && !isleDone(I) && !(S.isleGuard && S.isleGuard[I.key])) { (S.isleGuard || (S.isleGuard = {}))[I.key] = 1; const n = 2 + I.lvl, pool = ['bandit', 'banditDesert', I.lvl >= 3 ? 'banditElite' : 'bandit', daylight() < 0.3 ? 'skeleton' : 'bandit'].filter(k => ENEMIES[k]); /* de día, los esqueletos se quemarían al sol */
      for (let i = 0; i < n; i++) { const a = i / n * 6.28, f = spawnFoe(pool[(Math.random() * pool.length) | 0], (I.x + 0.5 + Math.cos(a) * 2.5) * T, (I.y + 0.5 + Math.sin(a) * 2.5) * T, { ag: 1, isle: I.key }); f.mhp = f.hp = Math.round(f.hp * (1 + I.lvl * 0.3)); }
      wvBanner('☠ ¡Piratas!', 'Los guardianes del tesoro te han visto', '#ffd34a', 2.5); } }
}
function isleInteract() {
  const p = S.player, tx = p.x / T, ty = p.y / T;
  for (const I of islesNear(tx, ty, 6)) { if (Math.hypot(I.x + 0.5 - tx, I.y + 0.5 - ty) > 2.2 || isleDone(I)) continue;
    if (FOES.some(f => f.isle === I.key)) { toastErr('Los piratas no te dejan cavar: acaba con ellos'); return true; }
    (S.isles || (S.isles = {}))[I.key] = 1; const L = I.lvl, got = [['coin', 60 * L + ((Math.random() * 60) | 0)]];
    const gems = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethystGem', 'pearl'].filter(id => ITEMS[id]); for (let i = 0; i < 1 + (L >> 1); i++) if (gems.length) got.push([gems[(Math.random() * gems.length) | 0], 1 + ((Math.random() * 2) | 0)]);
    const gear = Object.keys(ITEMS).filter(id => ITEMS[id].weapon && typeof TR !== 'undefined' && TR[id] && (TR[id].r || 0) >= Math.min(4, L) && (TR[id].r || 0) <= L + 1); if (gear.length && Math.random() < 0.6) got.push([gear[(Math.random() * gear.length) | 0], 1]);
    for (const id of ['tPotHeal3', 'goldIngot']) if (ITEMS[id]) got.push([id, 2]);
    let lost = 0; for (const [id, n] of got) lost += invGive(id, n, (I.x + 0.5) * T, (I.y + 0.5) * T); invVersion++;
    fxBurst((I.x + 0.5) * T, (I.y + 0.5) * T, 40, { col: '#ffd34a', sp: 150, life: 0.9, glow: 1, size: 2.5 }); tone(780, 0.1, 'triangle', 0.05, 1.2); tone(1170, 0.25, 'triangle', 0.05, 1, 0.1);
    toast('🏴‍☠️ ¡Tesoro! ' + got.map(([id, n]) => n + ' ' + ITEMS[id].n).join(', ') + (lost ? ' (lo que no cabía está en el suelo)' : ''), true); return true; }
  return false;
}
{ const i0 = interact; interact = (shift, ctrl) => { if (S && !S.boat && isleInteract()) return; return i0(shift, ctrl); }; }
function isleRead() {
  const p = S.player, L = islesNear(p.x / T, p.y / T, 900).filter(I => !isleDone(I)).sort((a, b) => Math.hypot(a.x * T - p.x, a.y * T - p.y) - Math.hypot(b.x * T - p.x, b.y * T - p.y));
  if (!L.length) { toast('El mapa está en blanco: no queda ninguna isla sin saquear por aquí cerca. Prueba más lejos.'); return; }
  const I = L[0], dx = I.x - p.x / T, dy = I.y - p.y / T; invTake('isleMap', 1); invVersion++;
  toast(`🗺 El mapa marca una isla del tesoro (nivel ${I.lvl}) a unas ${Math.round(Math.hypot(dx, dy))} casillas al ${xtrDir(dx, dy)}.`, true);
  if (S.marks && !S.marks.some(m => m.x === I.x && m.y === I.y)) S.marks.push({ x: I.x, y: I.y, n: 'Isla del tesoro' });
}
// La ✕ del tesoro sobre la arena
{ const d0 = drawCombat; drawCombat = (ctx, k, ox, oy, x0, y0, x1, y1) => { if (S) { const t = performance.now() / 1000; for (const I of islesNear(view.x / T, view.y / T, 26)) { if (isleDone(I)) continue; const X = (I.x + 0.5) * T, Y = (I.y + 0.5) * T;
  ctx.save(); ctx.strokeStyle = '#a0201a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X - 8, Y - 6); ctx.lineTo(X + 8, Y + 6); ctx.moveTo(X + 8, Y - 6); ctx.lineTo(X - 8, Y + 6); ctx.stroke();
  ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * 3); ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.arc(X, Y, 14, 0, 7); ctx.fill(); ctx.restore();
  if (Math.hypot(X - S.player.x, Y - S.player.y) < 2.5 * T) { ctx.font = '600 9px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(10,10,14,.7)'; ctx.fillRect(X - 40, Y - 30, 80, 12); ctx.fillStyle = '#ffd34a'; ctx.fillText('F: desenterrar', X, Y - 21); } } }
  return d0(ctx, k, ox, oy, x0, y0, x1, y1); }; }
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); if (S) { boatTick(fdt); isleTick(fdt); } }; }
