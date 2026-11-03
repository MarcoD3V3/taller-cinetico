'use strict';
// =====================================================================================
//  El Hogar: el núcleo ya no está en medio de un cuadrado de hierba, sino sobre una tarima
//  elevada en una plaza de forma natural, con caminos de piedra que salen hacia el mundo,
//  farolas, estandartes, una estatua y objetos del lugar. Todo se adapta al bioma donde naces:
//  el suelo de la plaza es el del bioma, y la decoración cambia (frío, seco, selva o templado).
//  Solo en mundos nuevos (gen.hearth); las partidas de antes se quedan como estaban.
// =====================================================================================
const HEARTH_GROUP = {
  cold: ['tundra', 'snowyTaiga', 'iceSpikes', 'taiga', 'crystalFields', 'frozenOcean', 'coldOcean', 'stonyShore'],
  dry: ['beach', 'desert', 'redDesert', 'badlands', 'savanna', 'shrubland', 'saltFlats', 'ashWastes', 'volcano'],
  wild: ['warmOcean', 'jungle', 'bambooJungle', 'mangrove', 'swamp', 'bog', 'toxicMarsh'],
};
const HEARTH_DECOR = {
  cold: ['woodpile', 'woodpile', 'tent', 'barrel', 'dryingRack', 'boulder', 'crate', 'campfire'],
  dry: ['pot', 'pot', 'tent', 'cart', 'boulder', 'awning', 'dryingRack', 'campfire'],
  wild: ['totemPole', 'pot', 'dryingRack', 'bush', 'bush', 'tent', 'campfire'],
  mild: ['barrel', 'crate', 'woodpile', 'haystack', 'cart', 'bush', 'flowerCart', 'parkBench', 'trough', 'campfire'],
};
// Tarima: centro de tablones en el frío y la selva, de ladrillo en lo seco, de piedra lisa en lo templado
const HEARTH_MAT = { cold: 'PLANKFLOOR', dry: 'BRICKFLOOR', wild: 'PLANKFLOOR', mild: 'STONEFLOOR' };
function hearthGroup(bio) { const k = BIOMES[bio] && BIOMES[bio].key; for (const g in HEARTH_GROUP) if (HEARTH_GROUP[g].includes(k)) return g; return 'mild'; }
const hTile = k => G[k] !== undefined ? G[k] : G.GRASS;
// Contorno de la plaza: un radio que cambia con el ángulo (sin saltos al dar la vuelta)
function hearthEdge(H, a) { const s = H.seed, cx = Math.cos(a), cy = Math.sin(a);
  return 9.5 + (vnoise(cx * 1.6 + 5, cy * 1.6 + 5, s + 11) - 0.5) * 6 + (vnoise(cx * 4 + 9, cy * 4 + 9, s + 13) - 0.5) * 2.4; }
const hOnPlat = (H, x, y) => { const dx = Math.abs(x - H.x), dy = Math.abs(y - H.y); return dx <= 3 && dy <= 3 && !(dx === 3 && dy === 3); };
const hRim = (H, x, y) => { const dx = Math.abs(x - H.x), dy = Math.abs(y - H.y); return Math.max(dx, dy) === 3 || dx + dy === 5; };
// Caminos: cuatro, que serpentean desde la tarima hasta el borde de la plaza
function hOnPath(H, x, y) {
  const dx = x - H.x, dy = y - H.y, r = Math.hypot(dx, dy); if (r < 3.5) return 0; const e = hearthEdge(H, Math.atan2(dy, dx)); if (r > e + 1.5) return 0;
  for (let k = 0; k < 4; k++) { const th = k * Math.PI / 2 + Math.PI / 2 + (H.rot || 0) * (k ? 1 : 0), ux = Math.cos(th), uy = Math.sin(th), along = dx * ux + dy * uy; if (along < 3) continue;
    const lat = -dx * uy + dy * ux - Math.sin(along * 0.42 + k * 2.1 + H.seed % 7) * 1.1 * Math.min(1, (along - 3) / 3);
    if (Math.abs(lat) < 0.8) return along > e - 2 ? 2 : 1; }
  return 0;
}
// ---------- Suelo ----------
{ const g0 = genChunkTiles; genChunkTiles = c => { g0(c); const H = S && S.hearth; if (!H) return; const x0 = c.cx * CS, y0 = c.cy * CS;
  if (x0 > H.x + 16 || x0 + CS < H.x - 16 || y0 > H.y + 16 || y0 + CS < H.y - 16) return;
  const B = BIOMES[H.bio] || BIOMES[0], gr = GI[B.gI], grp = hearthGroup(H.bio), ground = gr && !gr.liquid && !gr.solid && buildable(B.gI) ? B.gI : hTile(grp === 'cold' ? 'SNOW' : grp === 'mild' ? 'GRASS' : 'SAND'); /* en el mar o la roca: nieve, arena o hierba según el clima */
  const rim = hTile('COBBLE'), mid = hTile(HEARTH_MAT[grp]), cob = rim;
  for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) {
    const tx = x0 + x, ty = y0 + y, i = (y << CSH) | x, dx = tx - H.x, dy = ty - H.y, d = Math.hypot(dx, dy); if (d > 16) continue;
    const e = hearthEdge(H, Math.atan2(dy, dx)), g = GI[c.g[i]], h = hash2(tx, ty, H.seed + 77); let t = -1;
    if (hOnPlat(H, tx, ty)) t = hRim(H, tx, ty) ? rim : mid;
    else if (d <= e) {
      const p = hOnPath(H, tx, ty);
      if (p && h > (p === 2 ? 0.45 : 0.1)) t = cob;
      else if (g.liquid || g.hole || g.tree && d < e - 2 || (g.solid && !g.tree && (d < 7 || !g.dot)) || p) t = ground;
      else if (g.flora && d < 5) t = ground;
      else if (ground === G.GRASS && c.g[i] === G.GRASS && d > e - 3.5 && h < 0.1 && G.FLOWERS !== undefined) t = G.FLOWERS; // flores en el borde
    } else if (d <= e + 2.2 && (g.liquid || g.hole || g.solid && !g.tree && !g.dot) && h < (e + 2.2 - d) / 2.2) t = ground; // borde que se deshace
    if (t >= 0) { c.g[i] = t; c.t[i] = GI[t].hp || 0; }
  }
}; }
// ---------- Alturas: plaza llana y la tarima un escalón más alta (se ven sus paredes) ----------
let _hLv0 = chunkLv;
{ const l0 = chunkLv; _hLv0 = l0; chunkLv = c => { const h = l0(c), H = S && S.hearth; if (!H) return h; const x0 = c.cx * CS, y0 = c.cy * CS;
  if (x0 > H.x + 14 || x0 + CS < H.x - 14 || y0 > H.y + 14 || y0 + CS < H.y - 14) return h;
  for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) { const tx = x0 + x, ty = y0 + y, dx = tx - H.x, dy = ty - H.y, d = Math.hypot(dx, dy);
    if (hOnPlat(H, tx, ty)) h[(y << CSH) | x] = (H.lv || 0) + 1; else if (d <= hearthEdge(H, Math.atan2(dy, dx)) + 1) h[(y << CSH) | x] = H.lv || 0; }
  return h; }; }
// ---------- Dónde: al buscar el inicio se apunta el hogar (antes de generar los chunks) ----------
{ const f0 = findSpawn; findSpawn = P => {
  let r = f0(P);
  if (P.hearth && S) {
    // con la plaza el suelo se arregla solo: basta con no nacer en el mar
    if (!(r[0] === 0 && r[1] === 0) && !BIOMES[biomeAt(0, 0, P)].ocean) r = [0, 0];
    const hx = r[0], hy = r[1] - 1, bio = biomeAt(hx, hy, P), cx = hx >> CSH, cy = hy >> CSH;
    S.hearth = { x: hx, y: hy, bio, seed: (P.seed | 0) + 9001, rot: ((hash2(hx, hy, P.seed | 0) - 0.5) * 0.5), lv: 0 };
    const H = S.hearth; S.hearth = null;
    try { const c = newChunk(cx, cy); computeChunkBiomes(c); H.lv = Math.min(LV_FOOT, _hLv0(c)[((hy & CMASK) << CSH) | (hx & CMASK)] || 0); } catch (e) { H.lv = 0; } finally { S.hearth = H; }
  }
  return r;
}; }
// ---------- Decoración: farolas, estandartes, estatua, letrero y objetos del bioma ----------
function hearthDecor() {
  const H = S.hearth; if (!H) return; const grp = hearthGroup(H.bio), R = mulberry(H.seed);
  const put = (type, x, y, dir = 0) => { if (!BD[type] || at(x, y)) return false; const g = GI[gnd(x, y)]; if (g.liquid || g.solid || g.hole) return false;
    const b = makeB(type, x, y, dir); setBlockAt(x, y, b); blocks.push(b); return true; };
  for (const [dx, dy] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) put('lampPost', H.x + dx, H.y + dy);
  put('banner', H.x - 2, H.y + 4); put('banner', H.x + 2, H.y + 4);
  put('statue', H.x, H.y - 2);
  put(grp === 'wild' ? 'totemPole' : 'pot', H.x - 2, H.y - 2); put(grp === 'wild' ? 'totemPole' : 'pot', H.x + 2, H.y - 2);
  // letrero al final del camino del sur
  for (let r = 7; r < 14; r++) { const x = H.x + 1, y = H.y + r; if (hOnPath(H, x, y) || hOnPath(H, x - 2, y)) continue; if (hearthEdge(H, Math.PI / 2) - 1.5 < r) { put('signpost', x + 1, y - 1); break; } }
  // objetos del lugar, alrededor de la plaza y fuera de los caminos
  const set = HEARTH_DECOR[grp]; let n = 0, tries = 0;
  while (n < 13 && tries++ < 400) {
    const a = R() * Math.PI * 2, e = hearthEdge(H, a), r = 5.2 + R() * Math.max(0.5, e - 6.5), x = Math.round(H.x + Math.cos(a) * r), y = Math.round(H.y + Math.sin(a) * r);
    if (hOnPlat(H, x, y) || hOnPath(H, x, y) || Math.abs(x - H.x) <= 1 && y > H.y && y < H.y + 7) continue;
    let near = false; for (let yy = y - 1; yy <= y + 1 && !near; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (at(xx, yy)) { near = true; break; } if (near) continue;
    if (put(set[n % set.length], x, y)) n++;
  }
  markAll(); if (typeof dirty !== 'undefined') dirty.lists = true;
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
{ const n0 = newGame; newGame = (gen, extra) => { n0(gen, extra); if (S && S.hearth) try { hearthDecor(); } catch (e) { console.warn('hogar', e); } }; }
