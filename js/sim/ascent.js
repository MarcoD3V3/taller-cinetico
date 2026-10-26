'use strict';
// =====================================================================================
//  El Ascenso (datos en data/ascent.js) y las guaridas de los jefes de siempre:
//   · Invocar: del 16 en adelante, el sello solo funciona en su sitio (mar, lava, caverna…).
//   · Escenario: al aparecer, el suelo alrededor se convierte en su arena (isla con mar
//     alrededor, foso de lava, círculo de piedra, hielo…). No toca lo que hayas construido.
//     Al acabar el combate (o si te vas), todo vuelve a como estaba.
//   · Guaridas: los jefes de siempre duermen repartidos por el mundo, sobre todo bajo tierra
//     (pocas: una de cada varias regiones). Al acercarte, despiertan en su mazmorra; vencido,
//     la guarida queda tranquila unos días. Aparecen en el mapa cuando las descubres.
// =====================================================================================
const AR_R = 11;
// Ocho pilares en círculo
const AR_PIL = new Set(Array.from({ length: 8 }, (_, i) => Math.round(Math.cos(i * Math.PI / 4) * 6.5) + ',' + Math.round(Math.sin(i * Math.PI / 4) * 6.5)));
const gk = k => G[k] !== undefined ? G[k] : G.STONEFLOOR;
// Estilo de cada escenario: suelo, borde, pilares, anillo de líquido, charcos
const ARENA = {
  tierra: { f: 'DIRT', f2: 'COBBLE', rim: 'STONE', pil: 'STONE' },
  mar: { f: 'SAND', ring: 'WATER', ringIn: 7 },
  aire: { f: 'SNOW', f2: 'ICE', pil: 'ICE' },
  lava: { f: 'BASALTFLOOR', f2: 'BASALT', ring: 'LAVA', ringIn: 7.5, rim: 'OBSIDIAN' },
  caverna: { f: 'STONEFLOOR', f2: 'ROCKFLOOR', rim: 'STONE', pil: 'STONE' },
  hielo: { f: 'ICE', f2: 'SNOW', rim: 'PERMAFROST', pil: 'PERMAFROST' },
  desierto: { f: 'SAND', f2: 'REDSAND', pil: 'TERRACOTTA' },
  pantano: { f: 'MUD', pool: 'SWAMPWATER' },
  selva: { f: 'JUNGLEGRASS', pil: 'JUNGLETREE' },
  cristal: { f: 'AMETHYST', pil: 'CRYSTALCLUSTER', rim: 'CRYSTALCLUSTER' },
  noche: { f: 'COBBLE', f2: 'BRICKFLOOR', pil: 'STONE' },
  tormenta: { f: 'STONEFLOOR', pool: 'WATER', pil: 'STONE' },
  vacio: { f: 'VOIDFLOOR', f2: 'DEEPFLOOR', pil: 'VOIDSTONE', rim: 'VOIDSTONE' },
  taller: { f: 'BRICKFLOOR', f2: 'PLANKFLOOR', pil: 'COBBLE' },
  final: { f: 'BRICKFLOOR', f2: 'OBSIDIAN', ring: 'LAVA', ringIn: 9.5, rim: 'OBSIDIAN', pil: 'CRYSTALCLUSTER' },
  guarida: { f: 'BRICKFLOOR', f2: 'COBBLE', rim: 'STONE', pil: 'STONE' },
};
function arenaBuild(env, cx, cy, k) {
  arenaRestore(true); const A = ARENA[env] || ARENA.tierra, tiles = [], px = Math.floor(S.player.x / T), py = Math.floor(S.player.y / T);
  for (let dy = -AR_R; dy <= AR_R; dy++) for (let dx = -AR_R; dx <= AR_R; dx++) {
    const d = Math.hypot(dx, dy); if (d > AR_R + 0.5) continue; const x = cx + dx, y = cy + dy;
    if (at(x, y)) continue; // lo construido no se toca
    const nearMe = Math.abs(x - px) <= 1 && Math.abs(y - py) <= 1, h = hash2(x, y, 31);
    let to = (A.f2 && ((x + y) & 1) && h < 0.5) ? A.f2 : A.f;
    if (A.ring && d > A.ringIn && d < AR_R - 0.6) to = A.ring;
    else if (A.rim && d >= AR_R - 0.6) { const a = Math.atan2(dy, dx); to = Math.abs(Math.sin(a * 2)) < 0.22 ? A.f : A.rim; } // borde con 4 entradas
    else if (A.pil && AR_PIL.has(dx + ',' + dy)) to = A.pil;
    else if (A.pool && d > 3 && h < 0.13) to = A.pool;
    if (nearMe) to = A.f;
    const c = getChunk(x >> CSH, y >> CSH), i = ((y & CMASK) << CSH) | (x & CMASK), g0 = c.g[i], t0 = c.t[i], g = gk(to);
    if (g0 === g) continue; tiles.push([x, y, g0, t0]); setGround(x, y, g, GI[g].hp || 0);
  }
  S.arena = { k, env, cx, cy, tiles }; if (typeof burst === 'function') for (let i = 0; i < 12; i++) burst(cx + Math.round((Math.random() - 0.5) * 16), cy + Math.round((Math.random() - 0.5) * 16), '#ffd34a');
}
function arenaRestore(force) {
  const A = S && S.arena; if (!A) return; if (!force && FOES.some(f => f.k === A.k && f.hp > 0)) return;
  for (let i = A.tiles.length - 1; i >= 0; i--) { const [x, y, g, t] = A.tiles[i]; if (!at(x, y)) setGround(x, y, g, t); }
  S.arena = null;
}
{ const e0 = bossEnd; bossEnd = () => { e0(); if (S && S.arena) setTimeout(() => arenaRestore(false), 2500); }; }
{ const d0 = deserialize; deserialize = str => { const ok = d0(str); if (ok && S && S.arena && !FOES.some(f => f.k === S.arena.k)) arenaRestore(true); return ok; }; }
// ---------- ¿Estás en el sitio? ----------
const bioKey = (x, y) => (BIOMES[biomeOf(x, y)] || {}).key || '';
function ascEnvOk(env, x, y) {
  const b = bioKey(x, y), lay = typeof layerOf === 'function' ? layerOf(y) : 0, near = (r, f) => { let n = 0; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (f(GI[gnd(x + dx, y + dy)])) n++; return n; };
  switch (env) {
    case 'mar': return near(6, g => g.liquid === 'water') >= 25;
    case 'lava': return near(10, g => g.liquid === 'lava') > 0;
    case 'aire': return ['hills', 'meadow', 'iceSpikes', 'stonyShore'].includes(b);
    case 'caverna': return lay > 0;
    case 'hielo': return BIO_SETS.cold.includes(b) || /ice|snow|frost/i.test(b);
    case 'desierto': return BIO_SETS.desert.includes(b);
    case 'pantano': return BIO_SETS.swamp.includes(b);
    case 'selva': return BIO_SETS.forest.includes(b) || BIO_SETS.jungle.includes(b);
    case 'cristal': return BIO_SETS.crystal.includes(b) || /crystal|cristal/i.test(b + ((BIOMES[biomeOf(x, y)] || {}).n || ''));
    case 'noche': return typeof daylight === 'function' && daylight() < 0.35;
    case 'tormenta': return typeof WX !== 'undefined' && ['rain', 'storm', 'blizzard', 'snow'].includes(WX.type);
    case 'vacio': return lay >= 2;
    case 'taller': return blocks.filter(o => Math.abs(o.x - x) <= 14 && Math.abs(o.y - y) <= 14).length >= 25;
    case 'final': { const R = typeof ruinPos === 'function' ? ruinPos() : null; return !!R && Math.hypot(R.x - x, R.y - y) < 45; }
    default: return true;
  }
}
// ---------- Invocar: comprobar el sitio y levantar el escenario ----------
{ const s0 = summonBoss; summonBoss = (k, natural, at2) => {
  const B = ASC[k]; if (!B || natural) return s0(k, natural, at2);
  if (BOSS) { toastErr('Ya hay un jefe despierto'); return false; }
  const cx = at2 ? at2.x : S.player.x, cy = at2 ? at2.y : S.player.y, tx = Math.floor(cx / T), ty = Math.floor(cy / T), E = ASC_ENV[B.env];
  if (B.asc > 15 && !ascEnvOk(B.env, tx, ty)) { toastErr(`${E.i} ${B.n} solo acude ${E.where}.`); return false; }
  arenaBuild(B.env, Math.floor(S.player.x / T), Math.floor(S.player.y / T), k);
  toast(`${E.i} Jefe ${B.asc} de 56 del Ascenso${B.final ? ': EL FINAL' : ''}`, true);
  const a = Math.random() * 7; return s0(k, natural, { x: S.player.x + Math.cos(a) * 6 * T, y: S.player.y + Math.sin(a) * 6 * T });
}; }
// Al vencer: qué viene después
{ const d0 = bossDefeated; bossDefeated = (f, loot) => {
  d0(f, loot); const B = ASC[f.k];
  if (S.lairActive && S.lairActive.k === f.k) { (S.lairDone || (S.lairDone = {}))[S.lairActive.key] = S.time; S.lairActive = null; toast('☠ La guarida queda en calma… por un tiempo', true); }
  if (!B) return; S.ascBest = Math.max(S.ascBest || 0, B.asc);
  if (B.final) { toast('☀ ¡Has vencido al Primer Motor! El Ascenso está completo. Eres leyenda.', true); for (let i = 0; i < 6; i++) setTimeout(() => FX.push({ x: f.x, y: f.y, ring: 120 + i * 60, t: 1.2, c: ['#ffd34a', '#ff7ad8', '#7af0ff'][i % 3] }), i * 250); return; }
  const nk = ASC_ORDER[B.asc], N = ASC[nk]; if (N) toast(`➜ Siguiente: ${N.n} (jefe ${N.asc}). ${N.asc > 15 ? `Su sello se hace con el alma y el trofeo de este jefe, y se usa ${ASC_ENV[N.env].where}.` : 'Su ofrenda ya se puede fabricar.'}`, true);
}; }
// ---------- Guaridas de los jefes de siempre ----------
const LAIR_REG = 12 * CS, LAIR_OLD = () => Object.keys(BOSSES).filter(k => !ASC[k] && BOSSES[k].summonItem);
function lairAt(rx, ry) {
  const h = hash2(rx, ry, 4517), x = rx * LAIR_REG + 48 + Math.floor(hash2(rx, ry, 11) * (LAIR_REG - 96)), y = ry * LAIR_REG + 48 + Math.floor(hash2(rx, ry, 12) * (LAIR_REG - 96));
  const under = typeof layerOf === 'function' && layerOf(y) > 0; if (h > (under ? 0.3 : 0.07)) return null; // pocas: casi todas bajo tierra
  if (rx === 0 && ry === 0) return null; // nunca junto al núcleo
  const b = bioKey(x, y), all = LAIR_OLD(), fit = all.filter(k => !BOSSES[k].bio || BOSSES[k].bio.includes(b)), list = fit.length ? fit : all;
  return { key: rx + ',' + ry, x, y, k: list[Math.floor(hash2(rx, ry, 13) * list.length)], under };
}
let _lairMsg = '';
setInterval(() => {
  if (!S || !S.player || ui.open === 'title' || ui.open === 'dead' || (typeof isGuest === 'function' && isGuest())) return;
  const px = Math.floor(S.player.x / T), py = Math.floor(S.player.y / T), rx = Math.floor(px / LAIR_REG), ry = Math.floor(py / LAIR_REG), dl = S.gen.dayLen || DAY_LEN;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const L2 = lairAt(rx + dx, ry + dy); if (!L2) continue; const d = Math.hypot(L2.x - px, L2.y - py); if (d > 40) continue;
    const seen = S.lairSeen || (S.lairSeen = {}); if (!seen[L2.key]) { seen[L2.key] = { x: L2.x, y: L2.y, k: L2.k, under: L2.under }; toast(`☠ Has descubierto una guarida: ${BOSSES[L2.k].n}`, true); }
    const done = S.lairDone && S.lairDone[L2.key]; if (done !== undefined && S.time - done < dl * 3) continue; // tranquila unos días
    if (d > 15 || BOSS) continue; const B = BOSSES[L2.k];
    if ((B.tier || 0) > (S.tier || 0) + 1) { if (_lairMsg !== L2.key) { _lairMsg = L2.key; toast(`☠ Algo enorme duerme aquí (${B.n}). Vuelve cuando el Núcleo esté en el nivel ${B.tier}.`, true); } continue; }
    arenaBuild(L2.under ? 'caverna' : 'guarida', L2.x, L2.y, L2.k); S.lairActive = { key: L2.key, k: L2.k };
    summonBoss(L2.k, true, { x: (L2.x + 0.5) * T, y: (L2.y + 0.5) * T });
  }
}, 1000);
// ---------- Mapa: guaridas descubiertas ----------
if (typeof drawBig === 'function') { const d0 = drawBig; drawBig = () => { d0(); if (ui.open !== 'map' || !S || !S.lairSeen) return; const w = big.width, h = big.height, s = mv.z * dpr, dl = S.gen.dayLen || DAY_LEN;
  for (const key in S.lairSeen) { const L2 = S.lairSeen[key], [x, y] = mpToS(L2.x + 0.5, L2.y + 0.5, w, h, s); if (x < -30 || y < -30 || x > w + 30 || y > h + 30) continue; const done = S.lairDone && S.lairDone[key] !== undefined && S.time - S.lairDone[key] < dl * 3;
    mpPin(bigX, x, y, done ? '#8a8a8a' : '#ff4a3a', '☠', s / dpr > 1.2 ? (BOSSES[L2.k] ? BOSSES[L2.k].n : 'Guarida') + (done ? ' · en calma' : '') : ''); } }; }
// ---------- /ascenso: cómo vas ----------
if (typeof cmd === 'function') cmd('ascenso', { a: ['jefes', 'bosses'], u: '/ascenso', d: 'Cómo vas en el Ascenso (56 jefes) y qué toca ahora.', run() {
  const best = S.ascBest || 0, nk = ASC_ORDER[best]; if (!nk) return '☀ Has completado el Ascenso: venciste al Primer Motor.';
  const N = ASC[nk], E = ASC_ENV[N.env], r = RECIPE_FOR[N.summonItem];
  return `Ascenso ${best}/56. Siguiente: ${E.i} ${N.n} (jefe ${N.asc}). ${N.asc > 15 ? `Sello: alma y trofeo del jefe anterior; úsalo ${E.where}.` : `Ofrenda: ${r ? [r.core, ...r.teeth].map(id => ITEMS[id] ? ITEMS[id].n : id).join(', ') : '—'}.`}`;
} });
// En la barra del jefe: su número en el Ascenso
{ const b0 = buildBossBar; buildBossBar = () => { b0(); const B = BOSS && ASC[BOSS.k]; const el = $('bossBar'); if (B && el) { const n = el.querySelector('.bbn'); if (n) n.textContent = `${ASC_ENV[B.env].i} ${B.asc}/56 · ${B.n}${B.final ? ' · JEFE FINAL' : ''}`; } }; }
