'use strict';
// =====================================================================================
//  Exploración: barcos, islas del tesoro y 4 biomas extremos (con sus criaturas, materiales y
//  el talismán que te protege de cada uno). Aquí los datos; la lógica en sim/boats.js,
//  sim/mounts.js y sim/extreme.js.
// =====================================================================================
const EXP_CAT = 9;

// ---------- Barcos ----------
// spd: velocidad en el agua · deep: aguanta el mar abierto (los demás se mueven a la mitad en aguas profundas)
const BOATS = {
  boatRaft: { n: 'Balsa', c: '#a07a48', spd: 1.5, deep: 0, hull: '#8a6238', d: 'Troncos atados. Lenta, pero flota. F con ella en la mano junto al agua para subir; F junto a la orilla para bajar.' },
  boatRow: { n: 'Bote de remos', c: '#b08050', spd: 2.3, deep: 1, hull: '#9a6a3a', d: 'Un bote de madera de verdad: rápido en lagos y ríos y capaz de salir al mar. F junto al agua para subir.' },
  boatSail: { n: 'Velero', c: '#e8e0c8', spd: 3.3, deep: 1, hull: '#7a5230', sail: '#f4f0e0', d: 'Casco reforzado y una vela: el más rápido. Pesca de altura con mejores capturas y llega a las islas del tesoro.' },
};
for (const id in BOATS) { const B = BOATS[id]; IT(id, B.n, B.c, 'tool', EXP_CAT, B.d); ITEMS[id].boat = 1; }
RB('boatRaft', 1, 'log', 'log,log,log,stick,stick', 0, 0);
RB('boatRow', 1, 'planks', 'planks*6,stick*2,ironIngot', 0, 1);
RB('boatSail', 1, 'boatRow', 'planks*6,wool*4,ironIngot*2,rope', 0, 2);
IT('isleMap', 'Carta de la isla del tesoro', '#d8b878', 'scroll', EXP_CAT, 'Úsalo (F) para saber hacia dónde queda la isla del tesoro más cercana. Sale pescando en alta mar.');

// ---------- Materiales y talismanes de los biomas extremos ----------
// Basta con llevar el talismán encima (en cualquier hueco del inventario) para que proteja
const XMATS = [
  ['stormShard', 'Fragmento de tormenta', '#9ae8ff', 'Cristal cargado de relámpagos. Sale de las rocas de las Cumbres de la Tormenta.'],
  ['sporeSilk', 'Seda de esporas', '#c8a0e8', 'Hilo de las vainas del Bosque de Hongos Gigantes. Filtra cualquier aire.'],
  ['magmaCore', 'Núcleo de magma', '#ff7a2a', 'Roca fundida que nunca se enfría. Sale de las vetas de la Caldera Infernal.'],
  ['eternalIce', 'Hielo eterno', '#c8f0ff', 'No se derrite ni al fuego. Sale de las vetas del Glaciar Eterno.'],
];
for (const [id, n, c, d] of XMATS) IT(id, n, c, 'gem', EXP_CAT, d);
const TALISMANS = {
  stormTalisman: { n: 'Talismán pararrayos', c: '#9ae8ff', bio: 'stormPeaks', d: 'Llévalo encima: los rayos de las Cumbres de la Tormenta no te hacen daño y te recargan maná.' },
  sporeMask: { n: 'Máscara de esporas', c: '#c8a0e8', bio: 'fungalForest', d: 'Llévala encima: las nubes de esporas del Bosque de Hongos Gigantes no te envenenan ni te marean.' },
  magmaAmulet: { n: 'Amuleto de magma', c: '#ff7a2a', bio: 'infernalCaldera', d: 'Llévalo encima: el calor de la Caldera Infernal y sus géiseres no te queman.' },
  glacierTalisman: { n: 'Talismán del glaciar', c: '#c8f0ff', bio: 'eternalGlacier', d: 'Llévalo encima: el frío del Glaciar Eterno no te congela y la ventisca no te ciega.' },
};
for (const id in TALISMANS) IT(id, TALISMANS[id].n, TALISMANS[id].c, 'gem', EXP_CAT, TALISMANS[id].d);
RB('stormTalisman', 1, 'stormShard', 'stormShard*2,copperIngot*3', 0, 1);
RB('sporeMask', 1, 'sporeSilk', 'sporeSilk*3,leather*2', 0, 1);
RB('magmaAmulet', 1, 'magmaCore', 'magmaCore,goldIngot*2,obsidian', 0, 1);
RB('glacierTalisman', 1, 'eternalIce', 'eternalIce*2,fur*4', 0, 1);

// ---------- Suelos nuevos: vetas de cada material y la vaina de esporas ----------
TLx('STORMCRYSTAL', { n: 'Veta de tormenta', c: [92, 104, 120], dot: '#9ae8ff', drop: 'stormShard', rock: 1, solid: 1, hp: 4, under: 'ROCKFLOOR', need: { k: 'pick', lv: 2 }, light: 1 });
TLx('MAGMAVEIN', { n: 'Veta de magma', c: [70, 40, 34], dot: '#ff7a2a', drop: 'magmaCore', rock: 1, solid: 1, hp: 4, under: 'ROCKFLOOR', need: { k: 'pick', lv: 2 }, light: 2 });
TLx('ETERNALVEIN', { n: 'Veta de hielo eterno', c: [150, 176, 190], dot: '#e8faff', drop: 'eternalIce', rock: 1, solid: 1, hp: 4, under: 'ROCKFLOOR', need: { k: 'pick', lv: 2 } });
TL('SPOREPOD', { n: 'Vaina de esporas', c: [96, 80, 104], drop: 'sporeSilk', hp: 1, under: 'MYCELIUM', light: 1, plant: { c: '#c8a0e8', s: 'mush' } });
{ const t = GI[G.SPOREPOD]; t.u = G.MYCELIUM; t.flora = true; t.solid = false; }

// ---------- Los 4 biomas extremos ----------
BI('stormPeaks', { n: 'Cumbres de la Tormenta', g: 'GRAVEL', alt: [['STONE', 0.62]], stone: 0.6, rock: 'STONE', plants: [['STALAGMITE', 0.01]], ores: [['STORMCRYSTAL', 40], ['IRON', 14], ['COPPER', 14]], fauna: [['wyvern', 0.8], ['goat', 1]], fd: 1, mc: '#7aa8d8', rare: 1, xtr: 1 });
BI('fungalForest', { n: 'Bosque de Hongos Gigantes', g: 'MYCELIUM', trees: [['BIGMUSHROOM', 0.16]], plants: [['SPOREPOD', 0.03], ['GLOWCAP', 0.03], ['GHOSTCAP', 0.01]], ores: [['IRON', 10]], fauna: [['beetle', 1], ['frog', 0.6]], fd: 1, mc: '#a070c8', rare: 1, xtr: 1 });
BI('infernalCaldera', { n: 'Caldera Infernal', g: 'ASH', alt: [['BASALT', 0.58]], stone: 0.62, rock: 'BASALT', lake: 'LAVA', plants: [['FIREBLOSSOM', 0.015], ['SULFURVENT', 0.012]], ores: [['MAGMAVEIN', 40], ['SULFUR', 12], ['GOLD', 8]], fauna: [['salamander', 1]], fd: 1, mc: '#e0402a', rare: 1, xtr: 1 });
BI('eternalGlacier', { n: 'Glaciar Eterno', g: 'SNOW', alt: [['ICE', 0.56]], stone: 0.6, rock: 'PERMAFROST', plants: [['FROSTLEAF', 0.01]], ores: [['ETERNALVEIN', 40], ['SILVER', 10]], fauna: [['mammoth', 0.9], ['penguin', 0.8], ['polarbear', 0.4]], fd: 1, mc: '#c8f0ff', rare: 1, xtr: 1 });
const XTR_KEYS = ['stormPeaks', 'fungalForest', 'infernalCaldera', 'eternalGlacier'];
// Lo mismo que hace biomes.js al cargar con cada bioma (como las Maravillas)
for (const k of XTR_KEYS) { const b = BIOMES[BI_[k]];
  for (const f of ['trees', 'plants', 'ores', 'alt']) if (b[f]) b[f] = b[f].filter(([t]) => G[t] !== undefined);
  b.gI = G[b.g]; b.altI = (b.alt || []).map(([t, v]) => [G[t], v]); b.treeI = (b.trees || []).map(([t, d]) => [G[t], d]); b.plantI = (b.plants || []).map(([t, d]) => [G[t], d]); b.wetI = [];
  b.rockI = G[b.rock || 'STONE']; b.oreT = (b.ores || STD_ORES).map(([t, w]) => [G[t], w]); b.oreSum = b.oreT.reduce((s, o) => s + o[1], 0);
  b.lakeI = G[b.lake || 'WATER']; b.riverI = G[b.river || 'WATER']; b.bankI = -1; b.faunaSum = (b.fauna || []).reduce((s, f) => s + f[1], 0); }
// Qué pasa en cada uno (lo usa sim/extreme.js)
const XTR = {
  stormPeaks: { i: '⚡', c: '#9ae8ff', tal: 'stormTalisman', hz: 'Caen rayos sin parar', mat: 'stormShard' },
  fungalForest: { i: '🍄', c: '#c8a0e8', tal: 'sporeMask', hz: 'Nubes de esporas venenosas', mat: 'sporeSilk' },
  infernalCaldera: { i: '🌋', c: '#ff7a2a', tal: 'magmaAmulet', hz: 'Calor abrasador y géiseres de fuego', mat: 'magmaCore' },
  eternalGlacier: { i: '❄', c: '#c8f0ff', tal: 'glacierTalisman', hz: 'Frío mortal y ventiscas que ciegan', mat: 'eternalIce' },
};

// ---------- Criaturas propias de cada bioma ----------
const XFOE = (k, n, shape, c, c2, s, hp, dmg, v, wound, ai, el, bio, tier, x = {}) => { ENEMIES[k] = { n, shape, c, c2, s, hp, dmg, v, wound, ai, el, elite: false, bio: [bio], tier, night: false, undead: false, phase: !!x.phase, venom: !!x.venom, drain: false, split: false, regen: x.regen || 0, blink: !!x.blink, glow: !!x.glow, proj: x.proj || null, summon: null, drops: x.drops || [], xp: Math.round(4 + hp / 8) }; };
XFOE('stormWisp', 'Espíritu del rayo', 'fly', '#9ae8ff', '#ffffff', 8, 60, 10, 2.6, 'burn', 'ranged', 'storm', 'stormPeaks', 2, { glow: 1, blink: 1, proj: { c: '#f0f05a', spd: 16, dmg: 12 }, drops: [['stormShard', 1, 0.6], ['manaDust', 1, 0.4]] });
XFOE('thunderRam', 'Carnero del trueno', 'quad', '#8a96a8', '#f0f05a', 11, 140, 18, 2.4, 'fracture', 'charger', 'storm', 'stormPeaks', 2, { drops: [['stormShard', 2, 0.7], ['wool', 2, 0.8], ['meat', 2, 0.8]] });
XFOE('sporeling', 'Esporín', 'blob', '#a070c8', '#e0c8ff', 7, 40, 14, 2.2, 'burn', 'exploder', 'poison', 'fungalForest', 1, { venom: 1, drops: [['sporeSilk', 1, 0.7], ['mushroom', 1, 0.6]] });
XFOE('mycelBrute', 'Bruto micelial', 'golem', '#7a5a8a', '#c8a0e8', 13, 180, 20, 1.5, 'fracture', 'melee', 'poison', 'fungalForest', 2, { regen: 2, drops: [['sporeSilk', 3, 0.8], ['glowcap', 2, 0.5]] });
XFOE('magmaGolem', 'Gólem de magma', 'golem', '#5a2a1a', '#ff7a2a', 14, 220, 24, 1.3, 'burn', 'melee', 'fire', 'infernalCaldera', 3, { glow: 1, drops: [['magmaCore', 2, 0.8], ['obsidian', 2, 0.5]] });
XFOE('emberImp', 'Diablillo de brasas', 'fly', '#c83a1a', '#ffd040', 7, 50, 10, 3, 'burn', 'ranged', 'fire', 'infernalCaldera', 2, { glow: 1, proj: { c: '#ff7a2a', spd: 14, dmg: 12 }, drops: [['magmaCore', 1, 0.4], ['sulfur', 2, 0.6]] });
XFOE('iceWraith', 'Espectro del hielo', 'ghost', '#c8f0ff', '#5a8ab8', 9, 80, 14, 2.4, 'cut', 'caster', 'frost', 'eternalGlacier', 2, { phase: 1, glow: 1, proj: { c: '#bff0ff', spd: 12, dmg: 12 }, drops: [['eternalIce', 1, 0.6], ['spiritOrb', 1, 0.2]] });
XFOE('frostGiant', 'Gigante de escarcha', 'hum', '#9ac0d8', '#e8faff', 16, 300, 28, 1.3, 'fracture', 'melee', 'frost', 'eternalGlacier', 3, { drops: [['eternalIce', 3, 0.8], ['fur', 3, 0.8], ['coin', 12, 1]] });
