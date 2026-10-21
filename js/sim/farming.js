'use strict';
// =====================================================================================
//  Agricultura (lógica). Arar, sembrar, regar, abonar, crecer y cosechar, y el uso de cada
//  herramienta del campo. Todo con clic izquierdo (la herramienta o semilla en la mano) o F.
//   Crecimiento por segundo = 1 / tiempo del cultivo × agua (regada 1, seca 0,25; el arroz
//   seca 0) × abono (compost 1,5 · superabono 2) × lámpara de cultivo 1,5 × su bioma 1,2 ×
//   de noche 0,6 (salvo con lámpara) × amuletos de cosecha.
// =====================================================================================
const FARM = { cd: 0, tick: 0, dry: 0, lastSeed: null };
const isSoil = g => { const k = GI[g].key; return ['GRASS', 'DIRT', 'DRYGRASS', 'JUNGLEGRASS', 'DARKGRASS', 'MOSS', 'MUD', 'PEAT', 'SWAMPGRASS', 'CLAY'].includes(k); };
const isFarm = g => g === G.FARMLAND || g === G.FARMWET;
const cropAt = (x, y) => { const b = at(x, y); return b && b.type === 'crop' ? b : null; };
const farmBonus = k => { let m = 1; for (const id of Object.values(S.equip || {})) { const it = id && ITEMS[id]; if (it && it.farm && it.farm[k]) m *= it.farm[k]; } return m; };
const cropStage = b => b.g >= 1 ? 3 : b.g >= 0.6 ? 2 : b.g >= 0.25 ? 1 : 0;
const STAGE_N = ['semilla', 'brote', 'creciendo', 'madura'];
// Riego: la casilla queda regada un rato (se seca sola, la lluvia la mantiene)
function waterTile(x, y, secs = 240) { const g = gnd(x, y); if (!isFarm(g)) return false; if (g !== G.FARMWET) setGround(x, y, G.FARMWET); (S.farmWet || (S.farmWet = {}))[x + ',' + y] = S.time + secs; return true; }
function tillTile(x, y, wet) {
  const g = gnd(x, y); if (at(x, y) || !(isSoil(g) || isFarm(g))) return false;
  if (!isFarm(g)) { setGround(x, y, G.FARMLAND); burst(x, y, '#7a5a3a'); }
  if (wet) waterTile(x, y); return true;
}
function plantAt(x, y, seedId) {
  const k = ITEMS[seedId] && ITEMS[seedId].seed; if (!k || at(x, y) || !isFarm(gnd(x, y)) || invCount(seedId) <= 0) return false;
  invTake(seedId, 1); const b = makeB('crop', x, y, 0); b.crop = k; b.g = 0; b.planted = S.time; addBlock(b); FARM.lastSeed = seedId; gainXP('gather', 1); return true;
}
function harvestCrop(b, opts = {}) {
  const d = CROP[b.crop]; if (!d) { delBlock(b); return; }
  const ripe = cropStage(b) >= 3, got = {};
  if (ripe) {
    const [a, z] = d.y; let n = a + Math.floor(Math.random() * (z - a + 1)); if (b.fert >= 2) n++; if (opts.bonus && Math.random() < opts.bonus) n++; if (Math.random() < (farmBonus('yield') - 1)) n++;
    got[d.item] = n; got[d.seed] = (got[d.seed] || 0) + (Math.random() < 0.6 ? 2 : 1); if ((b.crop === 'wheat' || b.crop === 'rice') && ITEMS.straw) got.straw = 1;
    gainXP('gather', 4);
  } else got[d.seed] = 1; // sin madurar: recuperas la semilla
  let lost = 0; for (const id in got) lost += invAdd(id, got[id]);
  fxText(b.x * T + 16, b.y * T, Object.keys(got).map(id => '+' + got[id] + ' ' + ITEMS[id].n).join(' · ').slice(0, 44), ripe ? '#9fe09a' : '#c8c0a8');
  if (lost) toastErr('Inventario lleno');
  if (ripe && d.re && !opts.uproot) { b.g = [0, 0.25, 0.6][d.re] || 0.6; b.fert = 0; b._tv = -1; dirty.lists = true; return got; }
  delBlock(b); if (ripe && opts.replant && invCount(d.seed) > 0) plantAt(b.x, b.y, d.seed);
  return got;
}
// Info de la lupa (y de la tarjeta del cursor)
function cropInfo(b) {
  const d = CROP[b.crop], st = cropStage(b), wet = gnd(b.x, b.y) === G.FARMWET, rate = cropRate(b), left = rate > 0 ? Math.max(0, (1 - b.g) * d.t / rate) : Infinity;
  return `${d.n}: ${STAGE_N[st]} (${Math.round(Math.min(1, b.g) * 100)} %) · ${wet ? '💧 regada' : '🏜 seca' + (d.water ? ' — ¡no crece sin agua!' : ' — crece a ¼')}${b.fert ? ' · abonada ×' + (b.fert >= 2 ? 2 : 1.5) : ''} · ${st >= 3 ? '¡lista para cosechar!' : left < Infinity ? 'madura en ~' + Math.ceil(left / 60) + ' min' : 'parada'}`;
}
// ---------- Crecimiento ----------
let _lamps = new Set(), _lampsT = 0;
function cropRate(b) {
  const d = CROP[b.crop]; if (!d) return 0; const wet = gnd(b.x, b.y) === G.FARMWET;
  let r = wet ? 1 : d.water ? 0 : 0.25;
  if (b.fert) r *= b.fert >= 2 ? 2 : 1.5;
  let lamp = false; for (const k of _lamps) { const [lx, ly] = k; if (Math.abs(lx - b.x) <= 3 && Math.abs(ly - b.y) <= 3) { lamp = true; break; } }
  if (lamp) r *= 1.5; else if (daylight() < 0.25) r *= 0.6;
  const bio = BIOMES[biomeOf(b.x, b.y)]; if (bio && (bio.plants || []).some(([k]) => k === 'WILD' + b.crop.toUpperCase())) r *= 1.2;
  return r * farmBonus('grow');
}
function farmTick(dt) {
  if (!S) return;
  if ((_lampsT -= dt) <= 0) { _lampsT = 2; _lamps = new Set(); for (const b of L.growLamp || []) _lamps.add([b.x, b.y]); }
  const raining = typeof WX !== 'undefined' && /rain|storm/.test(WX.type) && WX.int > 0.3 && !(WX.cave > 0.5);
  for (const b of L.crop || []) {
    const d = CROP[b.crop]; if (!d) continue;
    if (raining && gnd(b.x, b.y) === G.FARMLAND) waterTile(b.x, b.y, 300);
    const st0 = cropStage(b); b.g = Math.min(1, (b.g || 0) + dt * cropRate(b) / d.t);
    if (cropStage(b) !== st0) { b._tv = -1; if (cropStage(b) === 3) fxBurst && fxBurst(b.x * T + 16, b.y * T + 10, 6, { col: '#ffe08a', sp: 30, life: 0.6, up: 20 }); }
  }
  // Aspersores: riegan su zona cada 20 s
  if ((FARM.dry -= dt) <= 0) { FARM.dry = 20;
    for (const t of ['sprinkler', 'sprinklerGold']) for (const b of L[t] || []) { const r = BD[t].farmWater; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) waterTile(b.x + dx, b.y + dy, 60); }
    // La tierra regada se seca con el tiempo (más rápido con calor)
    const W = S.farmWet || {}; for (const k in W) if (W[k] < S.time) { const [x, y] = k.split(',').map(Number); delete W[k]; if (peekChunk(x >> CSH, y >> CSH) && gnd(x, y) === G.FARMWET) setGround(x, y, G.FARMLAND); }
  }
}
{ const t0 = tick; tick = dt => { t0(dt); if ((FARM.tick += dt) >= 1) { farmTick(FARM.tick); FARM.tick = 0; } }; }
// ---------- Herramientas y semillas con clic izquierdo ----------
function areaTiles(cx, cy, st) {
  const out = [], a = st.area || 0;
  if (st.line && a) { const p = S.player, dx = Math.abs(cx * T + 16 - p.x) > Math.abs(cy * T + 16 - p.y) ? 1 : 0; for (let i = -a; i <= a; i++) out.push(dx ? [cx + i, cy] : [cx, cy + i]); return out; }
  for (let dy = -a; dy <= a; dy++) for (let dx = -a; dx <= a; dx++) out.push([cx + dx, cy + dy]);
  return out;
}
const firstOwned = ids => ids.find(id => invCount(id) > 0);
const SEED_IDS = () => Object.keys(ITEMS).filter(id => ITEMS[id].seed);
function farmAction(id, tx, ty) {
  const it = ITEMS[id]; if (!it) return false;
  // Semillas
  if (it.seed) { if (plantAt(tx, ty, id)) { sfx && sfx('beep'); return true; } const g = gnd(tx, ty); if (!isFarm(g)) { toastFarm('Siembra en tierra de cultivo: ara primero con una azada.'); return true; } return false; }
  // Abonos en la mano
  if (['compost', 'fertilizer', 'superFertilizer', 'boneMeal'].includes(id)) { const b = cropAt(tx, ty); if (!b) return false; fertilize(b, id); invTake(id, 1); return true; }
  const st = FTOOLS[id]; if (!st) return false;
  const tiles = areaTiles(tx, ty, st); let n = 0;
  switch (st.kind) {
    case 'hoe': for (const [x, y] of tiles) if (tillTile(x, y, st.wet)) n++; if (!n) toastFarm('La azada ara hierba o tierra (sin nada encima).'); else wearHeld(1); return true;
    case 'can': for (const [x, y] of tiles) if (waterTile(x, y)) { n++; fxBurst && fxBurst(x * T + 16, y * T + 16, 4, { col: '#8ac8ff', sp: 24, life: 0.4 }); } if (!n) toastFarm('Riega tierra de cultivo.'); return true;
    case 'harvest': for (const [x, y] of tiles) { const b = cropAt(x, y); if (b && cropStage(b) >= 3) { harvestCrop(b, { bonus: st.bonus, replant: st.replant }); n++; } } if (!n) toastFarm('No hay nada maduro aquí.'); else wearHeld(1); return true;
    case 'seedbag': { const sid = FARM.lastSeed && invCount(FARM.lastSeed) > 0 ? FARM.lastSeed : firstOwned(SEED_IDS()); if (!sid) { toastFarm('No llevas semillas.'); return true; } for (const [x, y] of tiles) if (invCount(sid) > 0 && plantAt(x, y, sid)) n++; if (!n) toastFarm('Siembra en tierra de cultivo libre.'); return true; }
    case 'rake': case 'machete': for (const [x, y] of tiles) { const g = GI[gnd(x, y)]; if (!g.plant || at(x, y) || g.solid) continue; if (g.drop) invAdd(g.drop, 1); if (g.extra && Math.random() < g.extra[1]) invAdd(g.extra[0], 1); if (st.kind === 'rake' && Math.random() < (st.area > 1 ? 0.12 : 0.06)) { const s = SEED_IDS(); invAdd(s[(Math.random() * s.length) | 0], 1); } setGround(x, y, g.u >= 0 ? g.u : G.GRASS); n++; } if (n) { wearHeld(1); gainXP('gather', n); } else toastFarm('Aquí no hay plantas que recoger.'); return true;
    case 'shears': { if (st.wool) { const mw = mouseWorld(), an = animalAt(mw.x, mw.y, 8); if (an && an.sp === 'sheep') { if ((an.shorn || 0) > S.time) { toastFarm('Esta oveja ya está esquilada.'); return true; } an.shorn = S.time + 240; invAdd(ITEMS.wool ? 'wool' : 'thread', 2 + ((Math.random() * 2) | 0)); toast('🐑 Esquilada'); return true; } }
      const g = GI[gnd(tx, ty)]; if (!g.plant || g.solid) { toastFarm('Las tijeras cortan plantas silvestres.'); return true; } const k = st.double ? 2 : 1; if (g.drop) invAdd(g.drop, k); if (g.extra) invAdd(g.extra[0], k); setGround(tx, ty, g.u >= 0 ? g.u : G.GRASS); wearHeld(1); return true; }
    case 'lens': { const b = at(tx, ty); if (b && b.type === 'crop') { toast('🔎 ' + cropInfo(b)); return true; } const mw = mouseWorld(), an = animalAt(mw.x, mw.y, 8); if (an) { const sp = SPECIES[an.sp]; toast(`🔎 ${sp.n}: ${sp.drops.map(([i, q]) => q + ' ' + ITEMS[i].n).join(', ')} al cazarlo`); return true; }
      const g = gnd(tx, ty), bio = BIOMES[biomeOf(tx, ty)], good = Object.keys(CROP).filter(k => (bio.plants || []).some(([p]) => p === 'WILD' + k.toUpperCase())).map(k => CROP[k].n.toLowerCase());
      toast(`🔎 ${GI[g].n} · bioma ${bio.n}${isFarm(g) ? (g === G.FARMWET ? ' · regada' : ' · seca') : isSoil(g) ? ' · se puede arar' : ''}${good.length ? ' · aquí crece mejor: ' + good.join(', ') : ''}`); return true; }
    case 'spreader': { const fid = firstOwned(['superFertilizer', 'compost', 'fertilizer', 'boneMeal']); if (!fid) { toastFarm('Lleva compost o abono en el inventario.'); return true; } for (const [x, y] of tiles) { const b = cropAt(x, y); if (b && !b.fert && invCount(fid) > 0) { fertilize(b, fid); invTake(fid, 1); n++; } } if (!n) toastFarm('No hay cultivos sin abonar aquí.'); return true; }
    case 'trowel': { const b = cropAt(tx, ty); if (!b) { toastFarm('Clic en un cultivo para arrancarlo.'); return true; } harvestCrop(b, { uproot: 1 }); return true; }
    case 'pan': { const l = GI[gnd(tx, ty)].liquid; if (l !== 'water') { toastFarm('Lava arena en el agua (clic en agua).'); return true; } if ((FARM.pan = (FARM.pan || 0) + 1) % 3) { fxBurst && fxBurst(tx * T + 16, ty * T + 16, 5, { col: '#c8e8ff', sp: 20, life: 0.4 }); return true; }
      const loot = [['sand', 0.5], ['clay', 0.2], [ITEMS.goldNugget ? 'goldNugget' : 'goldOre', 0.15], [ITEMS.quartz ? 'quartz' : 'stone', 0.1], ['ancientSeed', 0.01]].filter(([i]) => ITEMS[i]); let r = Math.random() * loot.reduce((s, [, p]) => s + p, 0), got = loot[0][0]; for (const [i, p] of loot) { r -= p; if (r <= 0) { got = i; break; } } invAdd(got, 1); fxText(tx * T + 16, ty * T, '+1 ' + ITEMS[got].n, '#ffe08a'); wearHeld(1); return true; }
    case 'dowse': { let best = null; const px = Math.floor(S.player.x / T), py = Math.floor(S.player.y / T); for (let r = 1; r < 48 && !best; r++) for (let a = 0; a < r * 8 && !best; a++) { const ang = a / (r * 8) * Math.PI * 2, x = px + Math.round(Math.cos(ang) * r), y = py + Math.round(Math.sin(ang) * r); if (peekChunk(x >> CSH, y >> CSH) && GI[gnd(x, y)].liquid === 'water') best = [x, y, r]; }
      if (!best) toastFarm('La varilla no tiembla: no hay agua cerca.'); else { const dirs = ['este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste', 'norte', 'noreste'], a = Math.atan2(best[1] - py, best[0] - px); toast(`🪄 Agua a ${best[2]} casillas hacia el ${dirs[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8]}`); } return true; }
    case 'shoo': { let k = 0; for (const an of ANIMALS) { const d2 = Math.hypot(an.x - S.player.x, an.y - S.player.y); if (d2 < st.area * T) { const a = Math.atan2(an.y - S.player.y, an.x - S.player.x); an.x += Math.cos(a) * 3 * T; an.y += Math.sin(a) * 3 * T; k++; } } toast(k ? `Espantaste ${k} animales` : 'No hay animales cerca'); return true; }
  }
  return false;
}
function fertilize(b, id) { if (id === 'boneMeal') { b.g = Math.min(1, (b.g || 0) + 0.34); b._tv = -1; fxText(b.x * T + 16, b.y * T, '¡crece!', '#9fe09a'); return; } b.fert = id === 'superFertilizer' ? 2 : 1; fxBurst && fxBurst(b.x * T + 16, b.y * T + 16, 6, { col: '#7a5a3a', sp: 20, life: 0.5 }); }
let _tfT = 0; const toastFarm = t => { const n = performance.now(); if (n - _tfT > 1500) { _tfT = n; toastErr(t); } };
{ const m0 = updateMining; updateMining = fdt => {
  FARM.cd -= fdt;
  if (mouse.down && !selectedBlock() && !ui.hand) { const id = heldId(), it = id && ITEMS[id];
    if (it && (it.seed || FTOOLS[id] || ['compost', 'fertilizer', 'superFertilizer', 'boneMeal'].includes(id))) {
      if (FARM.cd <= 0 && inReach(mouse.tx, mouse.ty)) { if (farmAction(id, mouse.tx, mouse.ty)) FARM.cd = it.seed ? 0.12 : 0.3; }
      return; } }
  m0(fdt);
}; }
// F sobre un cultivo: cosecha si está maduro; si no, te dice cómo va
{ const u0 = useBlock; useBlock = b => {
  if (b.type === 'crop') { if (cropStage(b) >= 3) harvestCrop(b); else toast('🌱 ' + cropInfo(b)); return true; }
  if (b.type === 'compostBin') { const s = S.inv[S.sel], ok = s && ['herbs', 'petals', 'straw', 'berries', 'mushroom', 'reeds', 'bamboo', 'cactus', ...Object.keys(CROP).map(k => CROP[k].item)].includes(s.id);
    if (!ok) { toast('Compostador: lleva en la mano plantas, paja o restos y pulsa F.' + (b.comp ? ` (${b.comp}/4)` : '')); return true; }
    const n = Math.min(s.n, 16); invTake(s.id, n); b.comp = (b.comp || 0) + n; const made = Math.floor(b.comp / 4); b.comp %= 4; if (made) invAdd('compost', made); toast(`♻ +${made} compost${b.comp ? ` (${b.comp}/4 para el siguiente)` : ''}`); return true; }
  return u0(b);
}; }
// Romper un cultivo: lo cosechas (o recuperas la semilla), nunca un «bloque de cultivo»
{ const r0 = removeAt; removeAt = (x, y) => { const b = cropAt(x, y); if (b) { harvestCrop(b, { uproot: 1 }); return; } return r0(x, y); }; }
// La tarjeta del cursor muestra cómo va el cultivo
{ const b0 = blockCard; blockCard = b => b.type === 'crop' ? `<div class="hcb"><b>🌱 ${esc(CROP[b.crop] ? CROP[b.crop].n : 'Cultivo')}</b><div class="small">${esc(cropInfo(b))}</div></div>` : b0(b); }
// ---------- Dibujo del cultivo según su etapa ----------
DRAW.crop = {
  k: b => (b.crop || '') + cropStage(b) + (b.fert ? 'f' : ''),
  b: (c, b) => {
    const d = CROP[b.crop] || { c: '#5a8a3a' }, st = cropStage(b), green = st >= 3 ? '#4a8a2a' : '#5aa83a';
    c.scale(1.35, 1.35);
    c.fillStyle = 'rgba(40,26,14,.35)'; c.fillRect(-12, 6, 24, 4); // surco
    const n = st === 0 ? 0 : 3 + st;
    if (st === 0) { for (let i = 0; i < 3; i++) { c.fillStyle = '#c8a870'; c.fillRect(-7 + i * 6, 4, 2, 2); } return; }
    for (let i = 0; i < n; i++) { const x = -10 + i * (20 / Math.max(1, n - 1)), h = 4 + st * 4 + (i % 2) * 2; c.strokeStyle = green; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, 8); c.quadraticCurveTo(x + 2, 8 - h / 2, x + (i % 2 ? 2 : -2), 8 - h); c.stroke(); }
    if (st >= 2) { c.fillStyle = green; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(-6 + i * 6, 2 - st * 2, 4, 2, i * 0.6 - 0.6, 0, 7); c.fill(); } }
    if (st >= 3) { for (let i = 0; i < 4; i++) { c.fillStyle = d.c; c.beginPath(); c.arc(-8 + i * 5.5, -4 - (i % 2) * 4, 2.6, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(-9 + i * 5.5, -6 - (i % 2) * 4, 1, 1); } }
    if (b.fert) { c.fillStyle = 'rgba(90,70,40,.6)'; for (let i = 0; i < 4; i++) c.fillRect(-11 + i * 7, 9, 2, 1); }
  },
  a: null,
};
// La tierra regada brilla un poco más oscura: ya lo hace el color del suelo. Nada más que hacer aquí.
// Bolsa de semillas doradas: al abrirla, semillas de 6 cultivos al azar
{ const u0 = useItem; useItem = () => { const s = S.inv[S.sel]; if (s && s.id === 'goldenSeedPouch') { const ks = Object.keys(CROP).sort(() => Math.random() - 0.5).slice(0, 6); for (const k of ks) invAdd(CROP[k].seed, 2 + ((Math.random() * 3) | 0)); if (--s.n <= 0) S.inv[S.sel] = null; invVersion++; toast('🌾 Semillas: ' + ks.map(k => CROP[k].n).join(', ')); return true; } return u0(); }; }
