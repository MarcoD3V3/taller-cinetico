'use strict';
// =====================================================================================
//  Capas subterráneas. Cada capa es una franja lejana del mismo mundo (y + capa × LAY_OFF):
//  así se guarda, se simula y se comparte en línea igual que la superficie, sin nada aparte.
//  La casilla (x, y) de una capa está justo debajo de la (x, y) de la capa de arriba, y lo que
//  hay arriba se nota abajo: bajo un lago hay agua, bajo la lava de una capa hay lava en la otra.
//  · Bajar: cava un hoyo hasta el fondo; al picar el fondo se abre un pozo. Salta dentro (Espacio).
//    Con una Escalera de mano sobre el pozo bajas sin caerte (y queda una escalera abajo).
//  · Subir: pon una Escalera de mano bajo tierra y úsala: abres un hueco en el techo. Si encima
//    hay agua, ácido o lava, te cae encima (primero se nota y te avisa).
//  · Cada capa: su suelo, su roca, sus menas, sus líquidos, su clima, su luz y sus monstruos.
//    Cuanto más abajo, más oscuro, más dura la roca, más raras las menas y peores los monstruos.
// =====================================================================================
const LAY_OFF = 90000;
const LAYERS = [
  { n: 'Superficie', i: '🌍' },
  { n: 'Cavernas húmedas', i: '💧', top: -2, d: 'Agua que gotea, carbón, hierro y cobre. Murciélagos y reptadores del barro.',
    floor: 'CAVEFLOOR', wall: 'CAVESTONE', liq: 'COLDWATER', dark: 0.8, temp: 12, tint: [40, 80, 110, 0.06], fx: 'drip', open: 0.57, sc: 16, lqTh: 0.66, oreTh: 0.66, surfOres: 0.5, rar: ['común'],
    alt: [['GRAVEL', 0.68], ['MUD', 0.74]], plants: [['GLOWLICHEN', 0.012], ['STALAGMITE', 0.02], ['MUSHROOM', 0.006], ['GLOWCAP', 0.003]],
    ores: [['COAL', 30], ['IRON', 26], ['COPPER', 22], ['TIN', 14], ['ZINC', 12], ['LEAD', 10], ['RED', 8], ['GOLD', 2]],
    foes: [['cavebat', 3], ['mudcrawler', 2], ['spiderE', 1.2], ['slimeE', 1.2], ['zombie', 1], ['kobold', 1]], hpMul: 1, cap: 3, every: 9,
    fauna: [['spider', 1], ['salamander', 1], ['beetle', 1], ['moth', 0.5]], fd: 1, mc: '#4a4846' },
  { n: 'Grutas de cristal', i: '💎', top: -6, d: 'Frío y cristales que brillan. Oro, plata, cobalto y geodas. Arañas de cristal y gólems.',
    floor: 'DEEPFLOOR', wall: 'DEEPSLATE', liq: 'COLDWATER', dark: 0.86, temp: 6, tint: [110, 80, 200, 0.07], fx: 'sparkle', open: 0.58, sc: 20, lqTh: 0.67, oreTh: 0.645, surfOres: 0.3, rar: ['común', 'poco_común'],
    alt: [['AMETHYST', 0.68], ['CLAY', 0.75]], plants: [['CRYSTALCLUSTER', 0.02], ['GLOWLICHEN', 0.008], ['STALAGMITE', 0.015], ['CRYSTALTREE', 0.002]],
    ores: [['IRON', 15], ['GOLD', 14], ['SILVER', 14], ['QUARTZ', 12], ['CRYSTAL', 14], ['NICKEL', 10], ['COBALT', 8], ['CHROMIUM', 8], ['LITHIUM', 8]],
    foes: [['crystalSpider', 2.5], ['gemGolem', 0.8], ['koboldCrystal', 2], ['slimeECrystal', 1.4], ['skeletonFrost', 1], ['trollCrystal', 0.4], ['gargoyleCrystal', 0.6]], hpMul: 1.3, cap: 4, every: 8,
    fauna: [['crystalbeetle', 2], ['spider', 1]], fd: 1, mc: '#4a4a62' },
  { n: 'Ciénaga de esporas', i: '☣', top: -10, d: 'Esporas tóxicas en el aire (lleva una Máscara de filtro), lagos de ácido, uranio y platino.',
    floor: 'SPOREFLOOR', wall: 'ROTSTONE', liq: 'ACID', dark: 0.9, temp: 26, tint: [110, 170, 40, 0.09], fx: 'spores', spores: 1, open: 0.56, sc: 22, lqTh: 0.63, oreTh: 0.644, rar: ['poco_común', 'raro'],
    alt: [['MYCELIUM', 0.6], ['TOXIC', 0.7]], plants: [['GLOWCAP', 0.02], ['GHOSTCAP', 0.006], ['TOXICWEED', 0.02], ['TOXICVENT', 0.006], ['BIGMUSHROOM', 0.01]],
    ores: [['URANIUM', 16], ['LEAD', 12], ['TITANIUM', 10], ['PLATINUM', 8], ['ARCANITE', 6], ['SULFUR', 10], ['COBALT', 6]],
    foes: [['sporeling', 3], ['acidWorm', 2], ['shroomSwamp', 2], ['slimeESwamp', 1.5], ['ghoulSwamp', 1.2], ['wraith', 0.6]], hpMul: 1.7, cap: 5, every: 7,
    fauna: [['beetle', 1], ['moth', 1]], fd: 1, mc: '#4a5236' },
  { n: 'Entrañas ígneas', i: '🔥', top: -14, d: 'Calor insoportable y lagos de lava. Wolframio, obsidiana, mithril y adamantita. Demonios de ceniza.',
    floor: 'CINDERFLOOR', wall: 'HELLSTONE', liq: 'LAVA', dark: 0.76, temp: 47, tint: [220, 80, 20, 0.09], fx: 'embers', heat: 1, open: 0.56, sc: 24, lqTh: 0.63, oreTh: 0.64, rar: ['raro'],
    alt: [['ASH', 0.62], ['BASALTFLOOR', 0.7]], plants: [['SULFURVENT', 0.012], ['FIREBLOSSOM', 0.004], ['STALAGMITE', 0.01]],
    ores: [['TUNGSTEN', 14], ['PLATINUM', 10], ['OBSIDIAN', 14], ['SULFUR', 14], ['ADAMANTITE', 6], ['MITHRIL', 6], ['GOLD', 8]],
    foes: [['magmaSlug', 3], ['cinderFiend', 1.5], ['impFire', 2], ['elementalFire', 1], ['bomberFire', 1], ['stoneGolemFire', 0.8], ['demon', 0.4]], hpMul: 2.2, cap: 5, every: 7,
    fauna: [['salamander', 2]], fd: 1, mc: '#5a3026' },
  { n: 'Abismo primigenio', i: '🕳', top: -18, d: 'Oscuridad casi total: te roba las fuerzas. Las menas más raras del mundo. Debajo, la roca madre.',
    floor: 'VOIDFLOOR', wall: 'VOIDSTONE', liq: 'LAVA', dark: 0.95, temp: 16, tint: [100, 40, 190, 0.11], fx: 'void', void: 1, open: 0.57, sc: 26, lqTh: 0.67, oreTh: 0.64, rar: ['raro', 'legendario'],
    alt: [['OBSIDIAN', 2]], plants: [['GHOSTCAP', 0.008], ['CRYSTALCLUSTER', 0.006], ['STALAGMITE', 0.01]],
    ores: [['ADAMANTITE', 12], ['STARSILVER', 10], ['MITHRIL', 10], ['ARCANITE', 8], ['TUNGSTEN', 8]],
    foes: [['voidStalker', 2.5], ['abyssHorror', 0.8], ['shade', 2], ['demonShadow', 1], ['gargoyleShadow', 1], ['wraith', 1]], hpMul: 3, cap: 6, every: 6,
    fauna: [], fd: 0, mc: '#2a2238' },
];
const LAY_LAST = LAYERS.length - 1;
const layerOf = ty => ty >= LAY_OFF / 2 ? Math.min(LAY_LAST, Math.round(ty / LAY_OFF)) : 0;
const layerHere = () => S && S.player ? layerOf(Math.floor(S.player.y / T)) : 0;
const surfY = ty => ty - layerOf(ty) * LAY_OFF; // la misma casilla vista desde la superficie
// Tablas de cada capa y su «bioma» (nombre en el mapa, animales de cueva, color)
for (let k = 1; k <= LAY_LAST; k++) {
  const L = LAYERS[k];
  L.floorI = G[L.floor]; L.wallI = G[L.wall]; L.liqI = G[L.liq];
  L.altI = L.alt.map(([t, th]) => [G[t], th]); L.plantI = L.plants.map(([t, d]) => [G[t], d]);
  L.oreT = L.ores.filter(([t]) => G[t] !== undefined).map(([t, w]) => [G[t], w]);
  for (const m of MINERALS) if (L.rar.includes(m[5])) L.oreT.push([G['M_' + m[0].toUpperCase()], RARITY[m[5]].w * 1.5]);
  L.oreSum = L.oreT.reduce((s, o) => s + o[1], 0);
  BI('cave' + k, { n: L.n, g: L.floor, fauna: L.fauna, fd: L.fd, mc: L.mc, cave: k });
  const b = BIOMES[BI_['cave' + k]]; L.bio = BI_['cave' + k];
  Object.assign(b, { gI: L.floorI, altI: [], treeI: [], plantI: [], wetI: [], rockI: L.wallI, oreT: L.oreT, oreSum: L.oreSum, lakeI: L.liqI, riverI: L.liqI, bankI: -1, faunaSum: L.fauna.reduce((s, f) => s + f[1], 0) });
}

// ---------- Generación ----------
// Líquidos encadenados entre capas 2…5 (misma coordenada de superficie): un lago en una capa suele tener
// otro debajo. La capa 1 mira la superficie: bajo lagos, ríos y océanos hay agua; bajo la lava, lava.
function caveLiquid(k, X, Ys, s) { let w = 0; for (let j = 2; j <= k; j++) { const n = vnoise(X / (18 + 4 * j), Ys / (18 + 4 * j), s + j * 31); w = j === 2 ? n : w * 0.55 + n * 0.45; } return w; }
function genCaveChunk(c, k) {
  const L = LAYERS[k], P = S.gen, s = P.seed + k * 7919, x0 = c.cx * CS, y0 = c.cy * CS, ys0 = y0 - k * LAY_OFF;
  let surf = null;
  if (k === 1) {
    surf = new Uint8Array(CS * CS); const cl = [0, 0, 0, 0, 0]; computeClimateGrid(x0, ys0, P);
    for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) { climateLerp(x, y, cl); surf[(y << CSH) | x] = genTileB(x0 + x, ys0 + y, P, cl, pickBiome(cl[0], cl[1], cl[2], cl[3], cl[4], P)); }
  }
  // Las primeras capas comparten parte de las menas del bioma de encima
  let oreT = L.oreT, oreSum = L.oreSum;
  if (L.surfOres) { const B = BIOMES[biomeAt(x0 + 16, ys0 + 16, P)]; if (B && !B.ocean && B.oreT) { oreT = L.oreT.concat(B.oreT.map(([t, w]) => [t, w * L.surfOres])); oreSum = oreT.reduce((a, o) => a + o[1], 0); } }
  for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) {
    const i = (y << CSH) | x, X = x0 + x, Ys = ys0 + y;
    const t = caveTile(L, k, s, P, X, Ys, surf && surf[i], oreT, oreSum);
    c.g[i] = t; c.bio[i] = L.bio; c.t[i] = GI[t].hp || 0;
  }
}
function caveTile(L, k, s, P, X, Ys, st, oreT, oreSum) {
  const open = fbmN(X / L.sc, Ys / L.sc, s + 11, 3) > L.open || Math.abs(fbmN(X / 52, Ys / 52, s + 21, 2) - 0.5) < 0.02;
  let lq, lt = L.liqI;
  if (k === 1) {
    const sg = GI[st], sl = sg.liquid && sg.liquid !== 'ice' && sg.liquid !== 'void';
    const n = vnoise(X / 20, Ys / 20, P.seed + 61); lq = sl ? 0.45 + n * 0.45 : n * 0.9;
    if (sl) lt = sg.liquid === 'lava' ? G.LAVA : sg.liquid === 'acid' ? G.ACID : sg.liquid === 'oil' ? G.OILRIVER : G.COLDWATER;
  } else lq = caveLiquid(k, X, Ys, P.seed);
  if (lq > L.lqTh + 0.1 || (open && lq > L.lqTh)) return lt;
  if (!open) {
    if (fbmN(X / 5, Ys / 5, s + 300, 3) > L.oreTh) { let q = vnoise(X / 11, Ys / 11, s + 400) * oreSum; for (const [t, w] of oreT) { q -= w; if (q <= 0) return t; } }
    return L.wallI;
  }
  let g = L.floorI;
  for (const [t, th] of L.altI) if (vnoise(X / 11, Ys / 11, s + 500 + t) > th) { g = t; break; }
  const h = hash2(X, Ys, s + 6); let acc = 0;
  for (const [t, d] of L.plantI) { acc += d; if (h < acc) return t; }
  return g;
}
{ const g0 = genChunkTiles; genChunkTiles = c => { const k = layerOf(c.cy * CS + 16); if (k) genCaveChunk(c, k); else g0(c); }; }
{ const b0 = computeChunkBiomes; computeChunkBiomes = c => { const k = layerOf(c.cy * CS + 16); if (k) c.bio.fill(LAYERS[k].bio); else b0(c); }; }

// ---------- Alturas bajo tierra ----------
// Suelo a nivel 0, la roca es un muro de un nivel (se ven sus paredes) y los hoyos bajan como arriba
{ const l0 = lvAt; lvAt = (x, y) => {
  if (y < LAY_OFF / 2) return l0(x, y);
  const c = getChunk(x >> CSH, y >> CSH), i = ((y & CMASK) << CSH) | (x & CMASK), g = GI[c.g[i]];
  let l = g.solid && !g.flora ? 1 : 0;
  if (g.hole) l -= Math.max(1, depthAt(x, y)); else if (g.hp && S.depth && S.depth[x + ',' + y]) l -= 1;
  return l;
}; }
// Casilla bajo un pozo abierto (la tuya o una de al lado): por ahí se puede escalar, también desde el agua
function shaftNear(tx, ty) {
  if (!layerOf(ty)) return null;
  for (const [dx, dy] of [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x = tx + dx, y = ty + dy, c = peekChunk(x >> CSH, (y - LAY_OFF) >> CSH); if (c && GI[c.g[(((y - LAY_OFF) & CMASK) << CSH) | (x & CMASK)]].shaft) return [x, y]; }
  return null;
}
// Profundidad que se muestra (−2 … −21): la de la capa menos lo cavado
function depthLabel(tx, ty) { const k = layerOf(ty); if (!k) return -Math.min(3, depthAt(tx, ty)); return LAYERS[k].top - Math.min(3, depthAt(tx, ty)); }

// ---------- Pozos: no se pisan; se salta dentro ----------
const isShaft = (x, y) => !!GI[gnd(x, y)].shaft && !at(x, y);
{ const p0 = passable; passable = (x, y, who) => {
  const tx = Math.floor(x / T), ty = Math.floor(y / T), c = peekChunk(tx >> CSH, ty >> CSH);
  if (c) { const i = ((ty & CMASK) << CSH) | (tx & CMASK); if (GI[c.g[i]].shaft && !(c.b && c.b[i])) {
    const o = who && typeof who === 'object' ? who : null;
    if (o && (o.phase || o.proj || (o.fly && !o.proj))) return true;
    return who === 'player' && ((P.z || 0) > 0.5 || _flyMove());
  } }
  return p0(x, y, who);
}; }
{ const c0 = canStand; canStand = (sp, x, y) => !GI[gnd(x, y)].shaft && c0(sp, x, y); }
{ const c0 = canPlace; canPlace = (type, x, y) => {
  const g = GI[gnd(x, y)];
  if (type === 'ladder') { if (at(x, y)) return 'Casilla ocupada'; if (g.shaft) return ''; if (!layerOf(y)) return 'La escalera va sobre un pozo, o bajo tierra para subir'; }
  else if (g.shaft) return 'No se puede construir sobre un pozo';
  return c0(type, x, y);
}; }
// Al picar el fondo de un hoyo se abre el pozo (en la última capa, la roca madre lo impide)
{ const d0 = damageTile; damageTile = (x, y) => {
  const was = gnd(x, y); d0(x, y); const now = gnd(x, y);
  if (now !== G.SHAFT || was === G.SHAFT) return;
  const k = layerOf(y);
  if (k >= LAY_LAST) { setGround(x, y, G.BEDROCK); toastErr('🪨 Roca madre: es el fondo del mundo, nada la rompe'); return; }
  burst(x, y, '#2a2420'); tone(70, 0.4, 'triangle', 0.05, 0.4);
  toast(`🕳 Se abre un pozo hacia ${LAYERS[k + 1].n} (capa ${k + 1}). Salta dentro con Espacio para bajar`, true);
}; }
// El pozo se puede rellenar con tierra o grava, como un hoyo
{ const g0 = groundTarget; groundTarget = (id, g, x, y) => g === G.SHAFT && GROUND_PLACE[id] ? { kind: 'pit', to: G[GROUND_PLACE[id]] } : g0(id, g, x, y); }

// ---------- Viajar entre capas ----------
function prepArea(tx, ty) { const cx = tx >> CSH, cy = ty >> CSH; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) getChunk(cx + dx, cy + dy); }
const freeTile = (x, y) => { const g = GI[gnd(x, y)], b = at(x, y); return !g.solid && !g.liquid && !g.shaft && (!b || BD[b.type].walk); };
// Mueve al jugador (y a sus mascotas y aliados cercanos) a la casilla indicada
function moveTo(tx, ty) {
  const p = S.player, ox = p.x, oy = p.y; p.x = (tx + 0.5) * T; p.y = (ty + 0.5) * T - 4;
  const dx = p.x - ox, dy = p.y - oy;
  for (const pt of S.pets || []) if (pt.ride || dist(pt.x, pt.y, ox, oy) < 30 * T) { pt.x += dx; pt.y += dy; }
  for (const s of SUMMONS) if (dist(s.x, s.y, ox, oy) < 30 * T) { s.x += dx; s.y += dy; }
  FOES = FOES.filter(f => f.boss || dist(f.x, f.y, p.x, p.y) < 40 * T); PROJ = []; HAZ = [];
  view.x = p.x; view.y = p.y; P.mvx = P.mvy = 0; P.z = 0; P.vz = 0;
}
// Bajar: por el pozo (cayendo) o por una escalera puesta encima
function goDown(tx, ty, ladder) {
  const k = layerOf(ty); if (k >= LAY_LAST) return;
  if (BOSS) { toastErr('No puedes bajar en mitad de un combate contra un jefe'); return; }
  const ny = ty + LAY_OFF; prepArea(tx, ny);
  let lx = tx, ly = ny; const g = GI[gnd(tx, ny)], pc = survOn() ? S.pc : null;
  if (g.liquid === 'lava') {
    // Caes junto a un lago de lava: al borde, con quemaduras
    let best = null; for (let r = 1; r <= 6 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && freeTile(tx + dx, ny + dy)) { best = [tx + dx, ny + dy]; break; }
    if (best) [lx, ly] = best; else setGround(tx, ny, G.BASALTFLOOR);
    if (pc) hurt('burn', ['legL', 'legR', 'footL', 'footR'][(Math.random() * 4) | 0], 1.4, 'Lava al caer');
    toastErr('🔥 ¡Caes al borde de la lava y te quemas!');
  } else if (!g.liquid) {
    // Abres una pequeña cámara al caer (los escombros se hunden) y la luz entra por el pozo
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = GI[gnd(tx + dx, ny + dy)]; if (t.solid || t.shaft) setGround(tx + dx, ny + dy, LAYERS[k + 1].floorI, GI[LAYERS[k + 1].floorI].hp); }
    setGround(tx, ny, G.LIGHTSHAFT, GI[G.LIGHTSHAFT].hp);
  } else if (g.liquid === 'acid' && pc) { pc.poison = Math.max(pc.poison || 0, 8); hurt('burn', 'torso', 0.8, 'Ácido'); toastErr('☣ ¡Caes en un lago de ácido!'); }
  moveTo(lx, ly);
  if (ladder) { if (!at(lx, ly) && freeTile(lx, ly)) addBlock(makeB('ladder', lx, ly, 0)); toast('🪜 Bajas por la escalera; llega hasta el fondo'); }
  else if (pc && !g.liquid) {
    if (invCount('rope') > 0) toast('🪢 Te descuelgas con la cuerda: llegas abajo sin hacerte daño');
    else { hurt('bruise', ['legL', 'legR', 'footL', 'footR'][(Math.random() * 4) | 0], 1.1, 'Caída por el pozo'); toastErr('Caes por el pozo y te das un golpe (con una cuerda en el inventario bajarías sin daño)'); }
  }
  if (!g.liquid) dust(S.player.x, S.player.y + 8, 12); else splash(S.player.x, S.player.y + 6, 12);
  layerArrive(k + 1);
}
// Subir: con una escalera bajo tierra se abre el techo. Lo que haya encima cuenta.
function goUp(b) {
  const k = layerOf(b.y); if (!k) return;
  if (BOSS) { toastErr('No puedes subir en mitad de un combate contra un jefe'); return; }
  const ux = b.x, uy = b.y - LAY_OFF; prepArea(ux, uy);
  const ut = gnd(ux, uy), ug = GI[ut], ub = at(ux, uy);
  if (ug.liquid && ug.liquid !== 'ice') {
    const what = ug.liquid === 'lava' ? 'calor y un resplandor rojo' : ug.liquid === 'acid' ? 'un olor ácido que pica' : 'agua goteando del techo';
    if (!b._warn || performance.now() - b._warn > 8000) { b._warn = performance.now(); toastErr(`⚠ Notas ${what}: arriba hay ${ug.n.toLowerCase()}. Si abres el techo te caerá encima. Usa otra vez la escalera para hacerlo igualmente`); return; }
    floodFrom(b, ut); return;
  }
  if (ub && !BD[ub.type].walk) { toastErr('Algo construido justo encima bloquea la salida'); return; }
  // Abrir el hueco: arriba queda un pozo (a nivel de la capa) y abajo entra la luz
  const kU = k - 1, floorU = kU ? LAYERS[kU].floorI : G.ROCKFLOOR;
  if (!ug.shaft) { setGround(ux, uy, G.SHAFT); setDepth(ux, uy, 4); }
  let ax = null, ay = null;
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) if (freeTile(ux + dx, uy + dy)) { ax = ux + dx; ay = uy + dy; break; }
  if (ax === null) { ax = ux; ay = uy + 1; const t = GI[gnd(ax, ay)]; if (t.solid || t.liquid) setGround(ax, ay, floorU, GI[floorU].hp); }
  if (GI[gnd(b.x, b.y)].key !== 'LIGHTSHAFT' && !GI[gnd(b.x, b.y)].liquid) setGround(b.x, b.y, G.LIGHTSHAFT, GI[G.LIGHTSHAFT].hp);
  moveTo(ax, ay); dust(S.player.x, S.player.y + 8, 10); tone(300, 0.15, 'sine', 0.03, 1.5);
  toast(kU ? `🪜 Subes a ${LAYERS[kU].n} (capa ${kU})` : '🪜 Sales a la superficie');
  layerArrive(kU);
}
// Abrir el techo bajo un líquido: cae sobre ti y llena la zona (la escalera se pierde)
function floodFrom(b, lt) {
  const g = GI[lt], pc = survOn() ? S.pc : null, x0 = b.x, y0 = b.y;
  delBlock(b); invAdd('ladder', 1);
  setGround(x0, y0 - LAY_OFF, G.SHAFT); setDepth(x0, y0 - LAY_OFF, 4);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { if (Math.abs(dx) + Math.abs(dy) > 2) continue; const x = x0 + dx, y = y0 + dy, t = GI[gnd(x, y)]; if (t.solid || at(x, y)) continue; setGround(x, y, lt); }
  if (g.liquid === 'lava') { if (pc) { hurt('burn', 'torso', 1.8, 'Lava desde el techo'); hurt('burn', 'head', 1, 'Lava desde el techo'); } toastErr('🔥 ¡La lava cae por el hueco y te abrasa! Aléjate'); shake = 0.5; }
  else if (g.liquid === 'acid') { if (pc) { pc.poison = Math.max(pc.poison || 0, 10); hurt('burn', 'torso', 1, 'Ácido desde el techo'); } toastErr('☣ ¡El ácido cae por el hueco!'); }
  else { WX.wet = 100; toastErr('💧 ¡El agua entra a chorro por el hueco y lo inunda todo!'); }
  splash(S.player.x, S.player.y, 14);
}
// La escalera: sobre un pozo baja; bajo tierra sube
{ const u0 = useBlock; useBlock = b => {
  if (b.type !== 'ladder') return u0(b);
  if (GI[gnd(b.x, b.y)].shaft) { delBlock(b); goDown(b.x, b.y, true); }
  else if (layerOf(b.y)) goUp(b);
  else toast('Pon la escalera sobre un pozo para bajar, o bajo tierra para subir');
  return true;
}; }

// ---------- Cada fotograma: caer en el pozo, avisos y aviso de capa ----------
let _layerNow = -1, _hzT = 0;
function layerTick(dt) {
  const p = S.player, tx = Math.floor(p.x / T), ty = Math.floor((p.y + 5) / T);
  if ((P.z || 0) < 1 && !_flyMove() && isShaft(tx, ty) && !ui.open) goDown(tx, ty, false);
  const k = layerOf(Math.floor(p.y / T));
  if (k !== _layerNow) { const first = _layerNow < 0; _layerNow = k; layerHud(true); if (!first && k) layerBanner(k); }
  _hzT -= dt; if (_hzT <= 0) { _hzT = 1; layerHazards(k); layerHud(false); }
}
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); if (S) layerTick(fdt); }; }
function layerArrive(k) { _layerNow = k; layerHud(true); layerBanner(k); markAll(); }

// ---------- Peligros de cada capa (cada segundo) ----------
const _warned = {};
function warnOnce(k, msg) { const now = performance.now(); if (_warned[k] && now - _warned[k] < 45000) return; _warned[k] = now; toastErr(msg); }
function layerHazards(k) {
  if (!k || !survOn()) return; const L = LAYERS[k], pc = S.pc, px = Math.floor(S.player.x / T), py = Math.floor((S.player.y + 5) / T);
  let lava = false, vent = false;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const g = GI[gnd(px + dx, py + dy)]; if (g.liquid === 'lava' && Math.abs(dx) <= 1 && Math.abs(dy) <= 1) lava = true; if (g.toxic) vent = true; }
  const fireOK = buff('fireproof') || protOf('heat') || CM().fire;
  if (lava && !fireOK && Math.random() < 0.35) { hurt('burn', ['legL', 'legR', 'footL', 'footR', 'handL', 'handR'][(Math.random() * 6) | 0], 0.5, 'Calor de la lava'); warnOnce('lava', '🔥 Estás pegado a la lava: te quemas. Apártate o bebe una Pócima ignífuga'); }
  if (L.spores && !protOf('spores') && Math.random() < (vent ? 0.6 : 0.18)) { pc.poison = Math.max(pc.poison || 0, vent ? 8 : 4); pc.cause = 'Esporas tóxicas'; warnOnce('spores', '☣ Respiras esporas tóxicas: te envenenan. Equipa una Máscara de filtro'); }
  if (L.heat && !fireOK) { pc.water = Math.max(0, pc.water - 0.12); warnOnce('heat', '🔥 Calor asfixiante: tienes sed muy rápido. La Capa ignífuga o la Pócima ignífuga te protegen'); }
  if (L.void && !protOf('abyss')) { pc.energy = Math.max(0, pc.energy - 0.12); pc.stam = Math.max(0, pc.stam - 0.5); warnOnce('void', '🕳 El Abismo te roba las fuerzas. El Amuleto abisal te protege'); }
}
// Temperatura, oscuridad y tiempo bajo tierra (no llueve; el frío o el calor dependen de la capa)
{ const a0 = ambient; ambient = () => { const k = layerHere(); return k ? a0() - _amb + LAYERS[k].temp : a0(); }; }
{ const w0 = weatherTick; weatherTick = dt => {
  const k = layerHere(); if (!k || !S) return w0(dt);
  const L = LAYERS[k]; WX.type = 'clear'; WX.int = 0; WX.t = 30; WX.cave += (L.dark / 0.62 - WX.cave) * Math.min(1, dt * 2);
  WX.wet = clamp(WX.wet + (P.swim ? 20 : k === 1 ? 0.3 : -1.5) * dt, 0, 100);
}; }
// La roca de abajo es más dura: picar cuesta más cuanto más profundo
{ const w0 = workMul; workMul = () => { const v = w0(); if (!S || typeof mouse === 'undefined') return v; const k = layerOf(mouse.ty | 0); if (!k) return v; const g = GI[gnd(mouse.tx, mouse.ty)]; return g.rock || g.dot ? v / (1 + 0.15 * k) : v; }; }

// ---------- Monstruos de cada capa ----------
let _caveT = 0;
function caveSpawn(dt, k) {
  const L = LAYERS[k], m = foeMult(); if (m <= 0) return;
  _caveT -= dt; if (_caveT > 0) return; _caveT = L.every / m * (0.7 + Math.random() * 0.6);
  const p = S.player, near = FOES.filter(f => !f.boss && !f.minion && dist(f.x, f.y, p.x, p.y) < 40 * T).length;
  if (near >= Math.round(L.cap * Math.min(2, m))) return;
  const cand = L.foes.filter(([key]) => ENEMIES[key]); if (!cand.length) return;
  const tot = cand.reduce((s, c) => s + c[1], 0);
  for (let tries = 0; tries < 6; tries++) {
    const a = Math.random() * Math.PI * 2, r = (9 + Math.random() * 8) * T, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r, tx = Math.floor(x / T), ty = Math.floor(y / T);
    if (!peekChunk(tx >> CSH, ty >> CSH) || !passable(x, y) || GI[gnd(tx, ty)].liquid || layerOf(ty) !== k || wardAt(x, y)) continue;
    let q = Math.random() * tot; for (const [key, w] of cand) { q -= w; if (q <= 0) { const f = spawnFoe(key, x, y); if (f && f.hp) { f.hp = f.mhp = Math.round(f.hp * L.hpMul); } return; } }
    return;
  }
}
{ const s0 = spawnTick; spawnTick = dt => { const k = layerHere(); if (!k) return s0(dt); if (typeof msGuest === 'function' && msGuest()) return; caveSpawn(dt, k); }; }
// El Núcleo, la Puerta del Ocaso y sus ruinas están en la superficie
{ const e0 = endDraw; endDraw = (ctx, x0, y0, x1, y1) => { if (y0 > LAY_OFF / 2) return; e0(ctx, x0, y0, x1, y1); }; }

// ---------- Perspectiva en los hoyos ----------
// Dentro de un hoyo, el borde del suelo de delante (más alto) tapa la parte de abajo del personaje:
// cuanto más hondo estás, más te tapa. Devuelve la línea de corte (o null si no hace falta).
function holeCut(px, py) {
  const fr = Math.floor((py + 5) / T), lp = lvPoint(px, py + 5); let d = 0;
  for (const ox of [-8, 0, 8]) { const tx = Math.floor((px + ox) / T), g = GI[gnd(tx, fr + 1)]; if (g.solid && !g.flora) continue; d = Math.max(d, lvAt(tx, fr + 1) - lp); }
  if (d <= 0) return null;
  return Math.min((fr + 1) * T, py + 10 - Math.min(6, d) * 5);
}

// ---------- Interfaz: indicador de capa, cartel al llegar y ambiente ----------
const _lh = document.createElement('div'); _lh.id = 'layerHud'; _lh.hidden = true; document.body.appendChild(_lh);
const _lb = document.createElement('div'); _lb.id = 'layerBanner'; _lb.hidden = true; document.body.appendChild(_lb);
let _lhS = '';
function layerHud(force) {
  if (!S) { _lh.hidden = true; return; }
  const p = S.player, tx = Math.floor(p.x / T), ty = Math.floor((p.y + 5) / T), k = layerOf(ty), g = GI[gnd(tx, ty)];
  let h = '';
  const stuck = g.hole && typeof stuckInHole === 'function' && stuckInHole(tx, ty);
  if (k) { const L = LAYERS[k]; h = `<b>${L.i} Capa ${k}</b><span>${esc(L.n)}</span><span class="lvd">${depthLabel(tx, ty)}</span>${shaftNear(tx, ty) && !at(tx, ty) ? `<span class="mut">Espacio (quieto): escalar por el pozo${g.liquid ? ' (desde el agua)' : ' · con una escalera, sin riesgo'}</span>` : stuck ? '<span class="mut">Espacio (quieto): escalar para salir del hoyo</span>' : ''}`; }
  else if (g.hole && depthAt(tx, ty) >= 2) h = `<b>⛏ Hoyo</b><span class="lvd">${depthLabel(tx, ty)}</span><span class="mut">${g.key === 'PIT' ? 'Pica el fondo: se abrirá un pozo a las Cavernas' : ''}${stuck ? (g.key === 'PIT' ? ' · ' : '') + 'Espacio (quieto): escalar para salir' : ''}</span>`;
  if (h === _lhS && !force) return; _lhS = h; _lh.innerHTML = h; _lh.hidden = !h;
}
let _lbT = 0;
function layerBanner(k) {
  const L = LAYERS[k]; clearTimeout(_lbT);
  _lb.innerHTML = k ? `<small>Capa ${k} · ${L.top} a ${L.top - 3}</small><h2>${L.i} ${esc(L.n)}</h2><p>${esc(L.d)}</p>` : `<small>Capa 0</small><h2>${L.i} Superficie</h2>`;
  _lb.hidden = false; _lb.classList.remove('out'); void _lb.offsetWidth; _lb.classList.add('in');
  _lbT = setTimeout(() => { _lb.classList.add('out'); _lbT = setTimeout(() => { _lb.hidden = true; }, 700); }, 3200);
  tone(k ? 90 - k * 8 : 220, 0.6, 'sine', 0.04, k ? 0.6 : 1.4);
}
// Tinte, viñeta y partículas de cada capa (goteo, destellos, esporas, brasas, motas del vacío)
const CAVE_P = [];
function caveScreen(ctx, dt, k) {
  const L = LAYERS[k], W = cv.width, H = cv.height, z = view.z * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const [r, g, b, a] = L.tint; ctx.fillStyle = `rgba(${r},${g},${b},${a})`; ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.7);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${0.25 + k * 0.07})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // Partículas en coordenadas del mundo alrededor de la vista
  const rate = { drip: 3, sparkle: 6, spores: 14, embers: 12, void: 8 }[L.fx] || 0, vw = W / z, vh = H / z;
  for (let n = rate * dt * (1 + vw * vh / 4e5); n > 0; n--) if (Math.random() < n) CAVE_P.push({ x: view.x + (Math.random() - 0.5) * vw, y: view.y + (Math.random() - 0.5) * vh, t: 0, life: 2 + Math.random() * 3, s: Math.random() });
  if (CAVE_P.length > 260) CAVE_P.splice(0, CAVE_P.length - 260);
  for (let i = CAVE_P.length - 1; i >= 0; i--) {
    const q = CAVE_P[i]; q.t += dt; if (q.t >= q.life) { CAVE_P.splice(i, 1); continue; }
    const f = q.t / q.life, al = Math.sin(f * Math.PI);
    if (L.fx === 'drip') q.y += dt * 90; else if (L.fx === 'embers') { q.y -= dt * 30; q.x += Math.sin(q.t * 3 + q.s * 9) * dt * 12; } else if (L.fx === 'spores') { q.y -= dt * 6; q.x += Math.sin(q.t + q.s * 6) * dt * 10; } else if (L.fx === 'void') { q.y -= dt * 4; }
    const sx = (q.x - view.x) * z + W / 2, sy = (q.y - view.y) * z + H / 2, sz = Math.max(1, (L.fx === 'drip' ? 1.2 : 1.6 + q.s * 1.6) * dpr);
    ctx.globalAlpha = al * (L.fx === 'drip' ? 0.6 : 0.8);
    ctx.fillStyle = L.fx === 'drip' ? '#a8d0f0' : L.fx === 'sparkle' ? '#e0d0ff' : L.fx === 'spores' ? '#d8f070' : L.fx === 'embers' ? (q.s > 0.5 ? '#ffb040' : '#ff6a1a') : '#a080ff';
    if (L.fx === 'drip') ctx.fillRect(sx, sy, sz, sz * 4); else ctx.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
  }
  ctx.globalAlpha = 1;
}
{ const d0 = drawWeatherScreen; drawWeatherScreen = (ctx, dt) => { d0(ctx, dt); const k = layerHere(); if (k) caveScreen(ctx, dt || 0, k); }; }
BUFF_N.fireproof = 'Ignífugo';
