'use strict';
// =====================================================================================
//  Huerto fácil (como en Minecraft), sin quitar el proceso:
//   · Rompiendo hierba alta, flores o hierbas del campo a veces salen semillas: casi siempre
//     de trigo y a veces de un cultivo de ese bioma. Las plantas silvestres de cultivo, más fáciles de ver.
//   · La tierra de cultivo a 4 casillas o menos de agua se riega sola.
//   · La primera vez que coges semillas, te explica los pasos.
// =====================================================================================
const SEED_CHANCE = 0.2, NEAR_WATER = 4;
// Plantas silvestres de cultivo: el triple de abundantes
for (const b of BIOMES) { if (!b.plants) continue; for (const p of b.plants) if (/^WILD/.test(p[0])) p[1] *= 3; b.plantI = b.plants.map(([k, d]) => [G[k], d]).filter(([g]) => g !== undefined); }
const RARE_TILES = new Set(RARE_PLANTS.map(r => r[0]));
const biomeSeeds = (x, y) => { const bio = BIOMES[biomeOf(x, y)]; return Object.keys(CROP).filter(k => (bio.plants || []).some(([p]) => p === 'WILD' + k.toUpperCase())).map(k => CROP[k].seed); };
function grassSeed(x, y) {
  if (Math.random() >= SEED_CHANCE * (1 + 0.04 * lvOf('gather'))) return null;
  const local = biomeSeeds(x, y), all = Object.keys(CROP).map(k => CROP[k].seed);
  if (Math.random() < 0.6) return CROP.wheat.seed;
  const pool = local.length && Math.random() < 0.75 ? local : all; return pool[(Math.random() * pool.length) | 0];
}
// Romper una planta del campo (no un cultivo silvestre ni una rara)
{ const d0 = damageTile; damageTile = (x, y) => {
  const g0 = gnd(x, y), gi = GI[g0]; d0(x, y);
  if (!S || !gi.plant || gi.solid || gi.tree || /^WILD/.test(gi.key) || RARE_TILES.has(gi.key) || gnd(x, y) === g0) return;
  if (Math.hypot(x * T + 16 - S.player.x, y * T + 16 - S.player.y) > 6 * T) return; // solo lo que rompes tú
  const sd = grassSeed(x, y); if (!sd) return; invAdd(sd, 1); fxText(x * T + 16, y * T, '+1 ' + ITEMS[sd].n, '#c8e08a'); seedTutorial();
}; }
// Agua cerca: la tierra de cultivo se riega sola
const _nw = new Map();
function nearWater(x, y) {
  const k = x + ',' + y, c = _nw.get(k); if (c && c.t > S.time) return c.v;
  let v = false; for (let dy = -NEAR_WATER; dy <= NEAR_WATER && !v; dy++) for (let dx = -NEAR_WATER; dx <= NEAR_WATER && !v; dx++) { const g = GI[gnd(x + dx, y + dy)]; if (g && g.liquid === 'water') v = true; }
  _nw.set(k, { v, t: S.time + 20 }); if (_nw.size > 4000) _nw.clear(); return v;
}
{ const f0 = farmTick; farmTick = dt => { if (S) for (const b of L.crop || []) if (gnd(b.x, b.y) === G.FARMLAND && nearWater(b.x, b.y)) waterTile(b.x, b.y, 60); f0(dt); }; }
{ const t0 = tillTile; tillTile = (x, y, wet) => { const ok = t0(x, y, wet); if (ok && !wet && nearWater(x, y)) waterTile(x, y, 60); return ok; }; }
// Primera semilla: los pasos, una sola vez por partida
function seedTutorial() {
  if (!S || S.seedTut) return; S.seedTut = 1;
  toast('🌱 ¡Semillas! 1) Haz una Azada de madera (palos y tablones). 2) Ara cerca del agua: se riega sola. 3) Siembra con las semillas en la mano. 4) Madura: F para cosechar. Más en Ayuda › 🌾 Huerto.', true);
}
{ const a0 = invAdd; invAdd = (id, n) => { const r = a0(id, n); if (S && !S.seedTut && ITEMS[id] && ITEMS[id].seed && r < n) seedTutorial(); return r; }; }
// Las semillas dicen cómo conseguirlas
for (const k in CROP) { const it = ITEMS[CROP[k].seed]; if (it && !/hierba alta/.test(it.d)) it.d = `Salen de ${CROP[k].n.toLowerCase()} silvestre y, a veces, al romper hierba alta o flores${k === 'wheat' ? ' (las más comunes)' : ' en su bioma'}. ` + it.d; }
// La lupa y la tarjeta del cultivo avisan del riego automático
{ const c0 = cropInfo; cropInfo = b => c0(b) + (nearWater(b.x, b.y) ? ' · 💧 agua cerca: se riega sola' : ''); }
