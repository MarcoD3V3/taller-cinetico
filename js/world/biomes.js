'use strict';
// =====================================================================================
//  Casillas, biomas y generación del terreno.
//  El mundo se decide en dos escalas:
//   1) CLIMA (cientos de casillas): continentalidad, temperatura, humedad, rareza e islas.
//      Al ser ruido muy suave, cada bioma ocupa regiones de 300-800 casillas y sus vecinos
//      siempre tienen un clima parecido (no hay volcanes junto a playas, salvo islas volcánicas).
//   2) DETALLE (pocas casillas): colinas, menas, lagos, ríos, árboles y plantas del bioma.
// =====================================================================================

// ---------- Casillas ----------
// c: color base · liquid: fluido (no se puede pisar ni construir) · walk: se puede pisar aunque sea líquido
// drop: lo que da al picarla · hp: usos antes de agotarse (0 = infinito) · under: en qué se convierte al agotarse
// tree/plant: forma de la vegetación · dot: motas (menas) · light: radio de luz · mt: tiempo de picado
const G = {}, GI = [];
function TL(key, o) { G[key] = GI.length; o.key = key; GI.push(o); }
// Las 12 primeras mantienen su número (compatibilidad con partidas guardadas)
TL('GRASS', { n: 'Hierba', c: [64, 104, 56], tuft: '#a0c86e' });
TL('WATER', { n: 'Agua', c: [38, 78, 132], liquid: 'water', wave: '#b4d7ff' });
TL('STONE', { n: 'Piedra', c: [118, 116, 112], drop: 'stone', rock: 1 });
TL('IRON', { n: 'Mena de hierro', c: [118, 116, 112], drop: 'ironOre', dot: '#d9a382' });
TL('COPPER', { n: 'Mena de cobre', c: [118, 116, 112], drop: 'copperOre', dot: '#e5813f' });
TL('ZINC', { n: 'Mena de zinc', c: [118, 116, 112], drop: 'zincOre', dot: '#a9e3d2' });
TL('COAL', { n: 'Carbón', c: [118, 116, 112], drop: 'coal', dot: '#1b1b1b' });
TL('RED', { n: 'Redstone', c: [118, 116, 112], drop: 'redstone', dot: '#ff3a2e' });
TL('SAND', { n: 'Arena', c: [210, 192, 132], drop: 'sand', mt: 0.35 });
TL('TREE', { n: 'Roble', under: 'GRASS', hp: 6, drop: 'log', tree: { s: 'round', a: '#24502a', b: '#2f6a34' } });
TL('OIL', { n: 'Pozo de petróleo', c: [58, 70, 46], pit: 1 });
TL('GAS', { n: 'Géiser de gas', c: [116, 110, 70], vent: 1 });
// Suelos
TL('DEEP', { n: 'Agua profunda', c: [22, 52, 98], liquid: 'water', wave: '#7fa8e0' });
TL('WARMWATER', { n: 'Agua cálida', c: [36, 128, 148], liquid: 'water', wave: '#c8fff4' });
TL('COLDWATER', { n: 'Agua fría', c: [40, 72, 110], liquid: 'water', wave: '#d8ecff' });
TL('SWAMPWATER', { n: 'Agua de pantano', c: [60, 78, 52], liquid: 'water', wave: '#a8b878' });
TL('LAVA', { n: 'Lava', c: [214, 82, 24], liquid: 'lava', light: 3, glow: '#ffd060' });
TL('ACID', { n: 'Ácido', c: [128, 196, 40], liquid: 'acid', light: 1, bubble: '#e8ff90' });
TL('OILRIVER', { n: 'Río de petróleo', c: [30, 24, 20], liquid: 'oil', wave: '#5a4a3a' });
TL('HONEY', { n: 'Miel', c: [228, 160, 40], liquid: 'honey', wave: '#ffe08a' });
TL('ICE', { n: 'Hielo', c: [178, 214, 232], drop: 'ice', walk: 1, crack: 1, mt: 0.6 });
TL('SNOW', { n: 'Nieve', c: [232, 238, 242], drop: 'snow', mt: 0.3 });
TL('DRYGRASS', { n: 'Hierba seca', c: [150, 142, 72], tuft: '#c8bc78' });
TL('JUNGLEGRASS', { n: 'Hierba de selva', c: [44, 112, 40], tuft: '#5ec850' });
TL('DARKGRASS', { n: 'Suelo de bosque', c: [44, 72, 40], tuft: '#4a7a3a' });
TL('SWAMPGRASS', { n: 'Hierba de pantano', c: [70, 84, 46], tuft: '#7a8a4a' });
TL('MOSS', { n: 'Musgo', c: [86, 120, 70], tuft: '#e6a8c8' });
TL('REDSAND', { n: 'Arena roja', c: [196, 110, 56], drop: 'sand', mt: 0.35 });
TL('BLACKSAND', { n: 'Arena negra', c: [58, 54, 56], drop: 'sand', mt: 0.35 });
TL('GRAVEL', { n: 'Grava', c: [124, 120, 118], drop: 'gravel', mt: 0.4, speck: '#5a5654' });
TL('TERRACOTTA', { n: 'Terracota', c: [168, 92, 58], drop: 'clay', band: 1 });
TL('MUD', { n: 'Barro', c: [92, 70, 48], drop: 'mud', mt: 0.4 });
TL('PEAT', { n: 'Turba', c: [74, 56, 40], drop: 'peat', mt: 0.5 });
TL('CLAY', { n: 'Arcilla', c: [150, 152, 164], drop: 'clay', mt: 0.4 });
TL('SALT', { n: 'Salar', c: [236, 232, 220], drop: 'salt', crack: 1, mt: 0.45 });
TL('BASALT', { n: 'Basalto', c: [62, 58, 60], drop: 'basalt', rock: 1 });
TL('ASH', { n: 'Ceniza', c: [104, 98, 92], drop: 'ash', mt: 0.3 });
TL('MYCELIUM', { n: 'Micelio', c: [112, 92, 112], speck: '#c8a8d0' });
TL('AMETHYST', { n: 'Suelo cristalino', c: [92, 80, 120], speck: '#c8b0ff' });
TL('TOXIC', { n: 'Tierra tóxica', c: [96, 104, 50], speck: '#c8e050' });
TL('PERMAFROST', { n: 'Permafrost', c: [150, 168, 172], drop: 'stone', rock: 1 });
// Menas nuevas
TL('GOLD', { n: 'Mena de oro', c: [118, 116, 112], drop: 'goldOre', dot: '#ffd34a' });
TL('SULFUR', { n: 'Azufre', c: [62, 58, 60], drop: 'sulfur', dot: '#e8e04a' });
TL('QUARTZ', { n: 'Cuarzo', c: [168, 92, 58], drop: 'quartz', dot: '#f4eee4' });
TL('CRYSTAL', { n: 'Veta de cristal', c: [92, 80, 120], drop: 'crystal', dot: '#b48cff' });
TL('OBSIDIAN', { n: 'Obsidiana', c: [36, 26, 44], drop: 'obsidian', dot: '#6a4a8a', mt: 1.1 });
TL('SALTPETER', { n: 'Salitre', c: [210, 192, 132], drop: 'saltpeter', dot: '#ffffff' });
// Agua con algo (se pica desde la orilla)
TL('REEF', { n: 'Arrecife de coral', c: [36, 128, 148], liquid: 'water', drop: 'coral', coral: 1 });
TL('KELP', { n: 'Bosque de algas', c: [26, 66, 96], liquid: 'water', drop: 'kelp', kelp: 1 });
TL('LILYPAD', { n: 'Nenúfar', c: [60, 78, 52], liquid: 'water', drop: 'herbs', hp: 1, under: 'SWAMPWATER', plant: { s: 'lily' } });
// Árboles
TL('BIRCH', { n: 'Abedul', under: 'GRASS', hp: 5, drop: 'log', tree: { s: 'round', a: '#5a8a3a', b: '#7aa84a', trunk: '#e8e4dc' } });
TL('SPRUCE', { n: 'Abeto', under: 'DARKGRASS', hp: 6, drop: 'log', extra: ['resin', 0.25], tree: { s: 'cone', a: '#1e4a32', b: '#2a5e40' } });
TL('SNOWSPRUCE', { n: 'Abeto nevado', under: 'SNOW', hp: 6, drop: 'log', extra: ['resin', 0.2], tree: { s: 'cone', a: '#1e4a32', b: '#e8f0f2' } });
TL('PALM', { n: 'Palmera', under: 'SAND', hp: 4, drop: 'log', extra: ['coconut', 0.5], tree: { s: 'palm', a: '#3a8a3a', b: '#5aaa4a' } });
TL('JUNGLETREE', { n: 'Árbol de selva', under: 'JUNGLEGRASS', hp: 8, drop: 'log', extra: ['latex', 0.25], tree: { s: 'jungle', a: '#1a5a1a', b: '#2e7e2a' } });
TL('ACACIA', { n: 'Acacia', under: 'DRYGRASS', hp: 5, drop: 'log', tree: { s: 'flat', a: '#5a7a2a', b: '#7a9a3a' } });
TL('DARKOAK', { n: 'Roble oscuro', under: 'DARKGRASS', hp: 8, drop: 'log', extra: ['mushroom', 0.1], tree: { s: 'round', a: '#163a1c', b: '#22502a', big: 1 } });
TL('CHERRY', { n: 'Cerezo', under: 'MOSS', hp: 5, drop: 'log', extra: ['petals', 0.6], tree: { s: 'round', a: '#d880a8', b: '#f4b0cc' } });
TL('MANGROVE', { n: 'Mangle', under: 'MUD', hp: 5, drop: 'log', extra: ['clay', 0.2], tree: { s: 'mangrove', a: '#2a5a2a', b: '#3e7a34' } });
TL('DEADTREE', { n: 'Árbol muerto', under: 'ASH', hp: 3, drop: 'log', tree: { s: 'dead', a: '#4a3e34' } });
TL('BAOBAB', { n: 'Baobab', under: 'DRYGRASS', hp: 10, drop: 'log', extra: ['berries', 0.3], tree: { s: 'baobab', a: '#6a8a3a', b: '#8aa84a' } });
TL('BIGMUSHROOM', { n: 'Seta gigante', under: 'MYCELIUM', hp: 4, drop: 'mushroom', tree: { s: 'mush', a: '#c83a32', b: '#f4e8e0' } });
TL('SWAMPOAK', { n: 'Roble de pantano', under: 'SWAMPGRASS', hp: 6, drop: 'log', extra: ['herbs', 0.3], tree: { s: 'round', a: '#2e4a24', b: '#46602e', vine: 1 } });
TL('CRYSTALTREE', { n: 'Árbol de cristal', under: 'AMETHYST', hp: 6, drop: 'crystal', tree: { s: 'crystal', a: '#8a6ad0', b: '#d4c0ff' }, light: 2 });
// Plantas
TL('BAMBOO', { n: 'Bambú', under: 'JUNGLEGRASS', hp: 4, drop: 'bamboo', plant: { s: 'bamboo' } });
TL('CACTUS', { n: 'Cactus', under: 'SAND', hp: 3, drop: 'cactus', plant: { s: 'cactus' } });
TL('REDCACTUS', { n: 'Cactus del desierto rojo', under: 'REDSAND', hp: 3, drop: 'cactus', plant: { s: 'cactus' } });
TL('BERRYBUSH', { n: 'Arbusto de bayas', under: 'GRASS', hp: 3, drop: 'berries', plant: { s: 'bush', c: '#c8324a' } });
TL('SNOWBERRY', { n: 'Bayas de nieve', under: 'SNOW', hp: 3, drop: 'berries', plant: { s: 'bush', c: '#6a8cff' } });
TL('FLOWERS', { n: 'Flores', under: 'GRASS', hp: 1, drop: 'petals', plant: { s: 'flowers' } });
TL('TALLGRASS', { n: 'Hierba alta', under: 'GRASS', hp: 1, drop: 'herbs', plant: { s: 'tall', c: '#7ab850' } });
TL('SAVANNAGRASS', { n: 'Pasto alto', under: 'DRYGRASS', hp: 1, drop: 'herbs', plant: { s: 'tall', c: '#d0c070' } });
TL('DEADBUSH', { n: 'Arbusto seco', under: 'SAND', hp: 1, drop: 'stick', plant: { s: 'dead' } });
TL('MUSHROOM', { n: 'Seta', under: 'DARKGRASS', hp: 1, drop: 'mushroom', plant: { s: 'mush', c: '#b85a3a' } });
TL('GLOWCAP', { n: 'Seta luminosa', under: 'MYCELIUM', hp: 1, drop: 'glowcap', plant: { s: 'mush', c: '#5af0ff' }, light: 2 });
TL('COTTON', { n: 'Algodonero', under: 'DRYGRASS', hp: 2, drop: 'cotton', plant: { s: 'puff' } });
TL('REEDS', { n: 'Juncos', under: 'MUD', hp: 2, drop: 'reeds', plant: { s: 'reeds' } });
TL('CRYSTALCLUSTER', { n: 'Cúmulo de cristal', under: 'AMETHYST', hp: 4, drop: 'crystal', plant: { s: 'shard' }, light: 1 });
TL('SULFURVENT', { n: 'Fumarola', under: 'BASALT', drop: 'sulfur', vent2: 1, light: 1 });
TL('ICESPIKE', { n: 'Pico de hielo', under: 'SNOW', hp: 3, drop: 'ice', plant: { s: 'spike' } });
TL('TOXICWEED', { n: 'Hierba tóxica', under: 'TOXIC', hp: 1, drop: 'venom', plant: { s: 'tall', c: '#b8e030' } });
TL('HERBS', { n: 'Plantas medicinales', under: 'GRASS', hp: 2, drop: 'herbs', plant: { s: 'bush', c: '#e8f0a0' } });
// Menas de la expansión (al final para no cambiar los números de las casillas antiguas)
for (const m of MATS) if (m.k === 'metal' && m.oreN) TL(m.id.toUpperCase(), { n: m.oreN, c: [118, 116, 112], drop: m.oreId, dot: m.dot });
// Fantasía: las menas raras sueltan gemas y hay hierbas mágicas (siempre al final de la tabla)
GI[G.MITHRIL].extra = ['sapphire', 0.08]; GI[G.ADAMANTITE].extra = ['ruby', 0.08]; GI[G.ARCANITE].extra = ['amethystGem', 0.1]; GI[G.STARSILVER].extra = ['emerald', 0.07];
TL('MANDRAKE', { n: 'Mandrágora', under: 'DARKGRASS', hp: 2, drop: 'mandrake', plant: { s: 'bush', c: '#e0c090' } });
TL('NIGHTSHADE', { n: 'Belladona', under: 'DARKGRASS', hp: 1, drop: 'nightshade', plant: { s: 'bush', c: '#8a4ae0' } });
TL('MOONFLOWER', { n: 'Flor lunar', under: 'GRASS', hp: 1, drop: 'moonflower', plant: { s: 'bush', c: '#e8f0ff' }, light: 1 });
TL('FIREBLOSSOM', { n: 'Flor de fuego', under: 'ASH', hp: 1, drop: 'fireblossom', plant: { s: 'bush', c: '#ff6a2a' }, light: 1 });
TL('FROSTLEAF', { n: 'Hoja de escarcha', under: 'SNOW', hp: 1, drop: 'frostleaf', plant: { s: 'tall', c: '#5ab8ff' } });
TL('GHOSTCAP', { n: 'Seta espectral', under: 'MYCELIUM', hp: 1, drop: 'ghostcap', plant: { s: 'mush', c: '#e8f4ff' }, light: 1 });
TL('DREAMROOT', { n: 'Raíz onírica', under: 'JUNGLEGRASS', hp: 2, drop: 'dreamroot', plant: { s: 'tall', c: '#d080ff' } });
TL('STARLILY', { n: 'Lirio estelar', under: 'GRASS', hp: 1, drop: 'starlily', plant: { s: 'bush', c: '#fff4a0' }, light: 1 });
TL('BLOODTHORN', { n: 'Espino sangriento', under: 'TERRACOTTA', hp: 2, drop: 'bloodthorn', plant: { s: 'tall', c: '#e0203a' } });
TL('SUNPETAL', { n: 'Pétalo solar', under: 'SAND', hp: 1, drop: 'sunpetal', plant: { s: 'bush', c: '#ffd040' } });
// Menas de los 30 minerales inventados (al final de la tabla para no romper partidas guardadas)
for (const [id, ore, , , dot] of MINERALS) TL('M_' + id.toUpperCase(), { n: ore, c: [118, 116, 112], drop: id + 'Ore', dot });
// Suelos que aparecen al cavar o al construir (siempre al final de la tabla)
TL('DIRT', { n: 'Tierra', c: [112, 84, 56], drop: 'dirt', hp: 2, under: 'PIT', mt: 0.4, speck: '#8a6a48' });
TL('PIT', { n: 'Hoyo', c: [64, 50, 38], hole: 1 });
TL('ROCKFLOOR', { n: 'Suelo de roca', c: [88, 86, 84], speck: '#6a6866' });
TL('COBBLE', { n: 'Empedrado', c: [128, 126, 122], drop: 'stone', hp: 3, under: 'PIT', mt: 0.55, cobble: 1 });
TL('PLANKFLOOR', { n: 'Suelo de tablones', c: [150, 110, 66], drop: 'planks', hp: 2, under: 'PIT', mt: 0.45, planks: 1 });
TL('BRICKFLOOR', { n: 'Suelo de ladrillo', c: [150, 74, 54], drop: 'brick', hp: 3, under: 'PIT', mt: 0.6, bricks: 1 });
// Piedra a ras de suelo (se pisa): el borde de las montañas y las manchas de roca del terreno.
// La roca alta del interior de las montañas sigue siendo un muro que hay que picar.
TL('STONEFLOOR', { n: 'Roca lisa', c: [126, 124, 119], drop: 'stone', speck: '#9a9890' });
TL('BASALTFLOOR', { n: 'Basalto liso', c: [72, 68, 70], drop: 'basalt', speck: '#5a5658' });
TL('PERMAFLOOR', { n: 'Permafrost liso', c: [160, 176, 180], drop: 'stone', speck: '#c8d8dc' });
// Todo el suelo se puede cavar: [objeto que suelta (null = el suyo), golpes, en qué se convierte]
const DIG = {
  GRASS: ['dirt', 1, 'DIRT'], DRYGRASS: ['dirt', 1, 'DIRT'], JUNGLEGRASS: ['dirt', 1, 'DIRT'], DARKGRASS: ['dirt', 1, 'DIRT'], SWAMPGRASS: ['dirt', 1, 'DIRT'],
  MOSS: ['dirt', 1, 'DIRT'], MYCELIUM: ['dirt', 1, 'DIRT'], AMETHYST: ['dirt', 1, 'DIRT'], TOXIC: ['dirt', 1, 'DIRT'],
  SAND: [null, 3, 'PIT'], REDSAND: [null, 3, 'PIT'], BLACKSAND: [null, 3, 'PIT'], GRAVEL: [null, 3, 'PIT'], ASH: [null, 3, 'PIT'], SNOW: [null, 2, 'DIRT'],
  MUD: [null, 3, 'PIT'], PEAT: [null, 3, 'PIT'], CLAY: [null, 3, 'PIT'], SALT: [null, 3, 'PIT'], TERRACOTTA: [null, 4, 'PIT'],
  ROCKFLOOR: ['gravel', 2, 'PIT'], STONEFLOOR: [null, 3, 'ROCKFLOOR'], BASALTFLOOR: [null, 3, 'ROCKFLOOR'], PERMAFLOOR: [null, 3, 'ROCKFLOOR'], STONE: [null, 4, 'ROCKFLOOR'], BASALT: [null, 5, 'ROCKFLOOR'], PERMAFROST: [null, 4, 'ROCKFLOOR'], ICE: [null, 2, 'COLDWATER'],
};
for (const k in DIG) { const t = GI[G[k]], [d, hp, to] = DIG[k]; if (d) t.drop = d; t.hp = hp; t.under = to; if (!t.mt) t.mt = d === 'dirt' ? 0.35 : t.rock ? 0.6 : 0.4; }
// Las menas se agotan al picarlas a mano (los taladros las explotan sin gastarlas)
for (const t of GI) if (t.dot && !t.liquid && !t.under) { t.hp = 6; t.under = 'ROCKFLOOR'; }
// Lo que se puede colocar como suelo y dónde
const GROUND_PLACE = { dirt: 'DIRT', sand: 'SAND', gravel: 'GRAVEL', clay: 'CLAY', snow: 'SNOW', mud: 'MUD', ash: 'ASH', stone: 'COBBLE', planks: 'PLANKFLOOR', brick: 'BRICKFLOOR', basalt: 'BASALT' };
const FLOOR_ITEMS = new Set(['stone', 'planks', 'brick']);
const FLAT_ROCK = { [G.STONE]: G.STONEFLOOR, [G.BASALT]: G.BASALTFLOOR, [G.PERMAFROST]: G.PERMAFLOOR };
// Resolver referencias y colores heredados
for (const t of GI) t.solid = !!(t.tree || ((t.rock || t.dot) && !t.liquid) || ['CACTUS', 'REDCACTUS', 'CRYSTALCLUSTER', 'ICESPIKE'].includes(t.key));
for (const t of GI) {
  t.u = t.under ? G[t.under] : -1;
  if (!t.c) t.c = GI[t.u].c;
  t.flora = !!(t.tree || t.plant);
}
const isLiquid = t => !!GI[t].liquid && !GI[t].walk;
const walkable = t => !GI[t].liquid || !!GI[t].walk;
const buildable = t => !GI[t].liquid && !GI[t].flora && !GI[t].vent2;
function groundRGB(x, y, t) {
  const g = GI[t], c = g.c, v = (hash2(x, y, 77) - 0.5) * 14;
  return [c[0] + v, c[1] + v, c[2] + v];
}
// Color de una casilla en el mapa (la vegetación se ve con el color de su copa)
function mapRGB(x, y, t) {
  const g = GI[t];
  if (g.tree) return hexRGB(g.tree.a);
  if (g.plant && g.plant.c) return hexRGB(g.plant.c);
  if (g.dot && !g.liquid) return hexRGB(g.dot);
  return groundRGB(x, y, t);
}
function hexRGB(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }

// ---------- Biomas ----------
// g: suelo · alt: [[suelo, umbral]] manchas · trees/plants: [[casilla, densidad]] · wet: plantas sobre agua
// stone: altura a partir de la que hay roca · rock: casilla de roca · ores: [[mena, peso]]
// lake/lakeAt: líquido y altura de los lagos · river: líquido de los ríos · bank: orilla
// fauna: [[especie, peso]] · fd: animales por chunk · mc: color en el mapa · oil: hay pozos de petróleo
const BIOMES = [], BI_ = {};
function BI(key, o) { BI_[key] = BIOMES.length; o.key = key; BIOMES.push(o); }
const STD_ORES = [['IRON', 30], ['COPPER', 18], ['COAL', 16], ['ZINC', 16], ['RED', 12], ['TIN', 10], ['LEAD', 6]];
// Océanos
BI('frozenOcean', { n: 'Océano helado', ocean: 1, g: 'COLDWATER', alt: [['ICE', 0.56]], fauna: [['fish', 2], ['penguin', 1], ['polarbear', 0.3], ['seal', 1]], fd: 2, mc: '#a8cce4', river: 'ICE' });
BI('coldOcean', { n: 'Océano frío', ocean: 1, g: 'COLDWATER', wet: [['KELP', 0.03]], fauna: [['fish', 3], ['seal', 0.5]], fd: 2, mc: '#2f5a88' });
BI('ocean', { n: 'Océano', ocean: 1, g: 'WATER', wet: [['KELP', 0.02]], fauna: [['fish', 3], ['dolphin', 0.4]], fd: 2, mc: '#2a62a4' });
BI('warmOcean', { n: 'Océano cálido', ocean: 1, g: 'WARMWATER', wet: [['REEF', 0.07]], fauna: [['fish', 3], ['turtle', 0.6], ['jellyfish', 1]], fd: 3, mc: '#2aa0b4' });
BI('deepOcean', { n: 'Océano profundo', ocean: 1, g: 'DEEP', wet: [['KELP', 0.05]], fauna: [['fish', 2], ['squid', 1], ['jellyfish', 0.5]], fd: 2, mc: '#173a6a' });
// Costas
BI('beach', { n: 'Playa', g: 'SAND', trees: [['PALM', 0.014]], plants: [['DEADBUSH', 0.002]], fauna: [['crab', 2], ['turtle', 0.5], ['seagull', 1]], fd: 3, mc: '#e6d498' });
BI('stonyShore', { n: 'Costa rocosa', g: 'GRAVEL', alt: [['STONE', 0.55], ['TITANIUM', 0.78]], stone: 0.55, fauna: [['crab', 1], ['seal', 1], ['seagull', 1]], fd: 2, mc: '#8a8f94' });
BI('mangrove', { n: 'Manglar', g: 'MUD', alt: [['SWAMPWATER', 0.57]], trees: [['MANGROVE', 0.14]], plants: [['REEDS', 0.05]], fauna: [['crab', 2], ['snake', 1], ['flamingo', 1], ['frog', 1]], fd: 3, mc: '#4f6a3a', river: 'SWAMPWATER', lake: 'SWAMPWATER', lakeAt: 0.4 });
// Frío
BI('tundra', { n: 'Tundra', g: 'SNOW', alt: [['PERMAFROST', 0.6]], trees: [['SNOWSPRUCE', 0.004]], plants: [['SNOWBERRY', 0.004]], stone: 0.64, rock: 'PERMAFROST', ores: [['IRON', 20], ['COAL', 20], ['ZINC', 10], ['NICKEL', 10], ['COBALT', 8], ['CHROMIUM', 6]], lake: 'ICE', river: 'ICE', oil: 1, fauna: [['rabbit', 2], ['polarbear', 0.6], ['wolf', 1], ['reindeer', 1.5]], fd: 2, mc: '#e4ecf0' });
BI('snowyTaiga', { n: 'Taiga nevada', g: 'SNOW', trees: [['SNOWSPRUCE', 0.26]], plants: [['SNOWBERRY', 0.01]], lake: 'ICE', river: 'ICE', fauna: [['wolf', 1.5], ['fox', 1.5], ['reindeer', 1]], fd: 2, mc: '#c4d4d4' });
BI('taiga', { n: 'Taiga', g: 'DARKGRASS', trees: [['SPRUCE', 0.3]], plants: [['BERRYBUSH', 0.02], ['MUSHROOM', 0.01]], river: 'COLDWATER', fauna: [['wolf', 1], ['fox', 1.5], ['deer', 1.5], ['rabbit', 1]], fd: 3, mc: '#3a5c44' });
BI('iceSpikes', { n: 'Picos de hielo', g: 'SNOW', alt: [['ICE', 0.55]], plants: [['ICESPIKE', 0.05]], river: 'ICE', lake: 'ICE', fauna: [['polarbear', 1], ['penguin', 1.5]], fd: 1, mc: '#b8e4f4', rare: 1 });
BI('crystalFields', { n: 'Campos de cristal', g: 'AMETHYST', alt: [['CRYSTAL', 0.7]], trees: [['CRYSTALTREE', 0.03]], plants: [['CRYSTALCLUSTER', 0.04]], stone: 0.6, ores: [['CRYSTAL', 30], ['QUARTZ', 10], ['IRON', 10], ['LITHIUM', 12], ['PLATINUM', 4]], river: 'COLDWATER', fauna: [['crystalbeetle', 2], ['moth', 1]], fd: 2, mc: '#8c6cb4', rare: 1 });
// Templado
BI('plains', { n: 'Llanura', g: 'GRASS', trees: [['TREE', 0.004]], plants: [['TALLGRASS', 0.06], ['FLOWERS', 0.006], ['HERBS', 0.003]], fauna: [['sheep', 2], ['rabbit', 1.5], ['deer', 1], ['horse', 1]], fd: 3, mc: '#6a9a4a' });
BI('forest', { n: 'Bosque', g: 'GRASS', trees: [['TREE', 0.28], ['BIRCH', 0.05]], plants: [['BERRYBUSH', 0.008], ['MUSHROOM', 0.006], ['HERBS', 0.004]], fauna: [['deer', 2], ['boar', 1.5], ['rabbit', 1], ['fox', 0.5]], fd: 3, mc: '#3c7838' });
BI('birchForest', { n: 'Bosque de abedules', g: 'GRASS', trees: [['BIRCH', 0.27]], plants: [['FLOWERS', 0.012], ['TALLGRASS', 0.02]], fauna: [['deer', 2], ['rabbit', 1.5]], fd: 3, mc: '#70a056' });
BI('darkForest', { n: 'Bosque oscuro', g: 'DARKGRASS', ores: [['LEAD', 15], ['IRON', 20], ['COAL', 15], ['SILVER', 5]], trees: [['DARKOAK', 0.5], ['BIGMUSHROOM', 0.015]], plants: [['MUSHROOM', 0.03]], fauna: [['boar', 1.5], ['wolf', 1], ['beetle', 1], ['moth', 1]], fd: 3, mc: '#22482a' });
BI('flowerField', { n: 'Campo de flores', g: 'GRASS', plants: [['FLOWERS', 0.26], ['TALLGRASS', 0.05], ['HERBS', 0.01]], trees: [['TREE', 0.003]], river: 'HONEY', fauna: [['bee', 3], ['rabbit', 1], ['sheep', 1], ['butterfly', 2]], fd: 4, mc: '#c48ad4', rare: 1 });
BI('cherryGrove', { n: 'Bosque de cerezos', g: 'MOSS', trees: [['CHERRY', 0.24]], plants: [['FLOWERS', 0.04]], fauna: [['bee', 2], ['deer', 1], ['butterfly', 2]], fd: 3, mc: '#e8a4c4', rare: 1 });
BI('swamp', { n: 'Pantano', g: 'SWAMPGRASS', alt: [['SWAMPWATER', 0.58]], trees: [['SWAMPOAK', 0.06]], plants: [['REEDS', 0.04], ['MUSHROOM', 0.02]], wet: [['LILYPAD', 0.08]], lake: 'SWAMPWATER', lakeAt: 0.4, river: 'SWAMPWATER', bank: 'MUD', fauna: [['frog', 3], ['snake', 1], ['heron', 1]], fd: 3, mc: '#4a5a32' });
BI('bog', { n: 'Turbera', g: 'PEAT', alt: [['SWAMPWATER', 0.62]], plants: [['REEDS', 0.05], ['TALLGRASS', 0.03]], wet: [['LILYPAD', 0.04]], river: 'SWAMPWATER', bank: 'MUD', fauna: [['frog', 2], ['heron', 1]], fd: 2, mc: '#5a4a32' });
BI('hills', { n: 'Colinas', g: 'GRASS', stone: 0.5, ores: [['IRON', 30], ['COPPER', 22], ['COAL', 20], ['ZINC', 14], ['RED', 10], ['GOLD', 4], ['TIN', 12], ['LEAD', 10], ['SILVER', 6], ['NICKEL', 5]], trees: [['TREE', 0.012]], plants: [['TALLGRASS', 0.02]], fauna: [['goat', 2], ['sheep', 1]], fd: 2, mc: '#7c8c6a' });
// Cálido
BI('savanna', { n: 'Sabana', g: 'DRYGRASS', trees: [['ACACIA', 0.02], ['BAOBAB', 0.003]], plants: [['SAVANNAGRASS', 0.06], ['COTTON', 0.015]], oil: 1, fauna: [['buffalo', 1.5], ['antelope', 2], ['lizard', 0.5], ['elephant', 0.4]], fd: 3, mc: '#aaa050' });
BI('jungle', { n: 'Selva', g: 'JUNGLEGRASS', ores: [['ALUMINUM', 25], ['IRON', 15], ['COPPER', 10], ['GOLD', 3]], trees: [['JUNGLETREE', 0.55]], plants: [['BAMBOO', 0.02], ['BERRYBUSH', 0.01], ['HERBS', 0.01]], river: 'WARMWATER', fauna: [['parrot', 2], ['snake', 1], ['monkey', 1.5], ['spider', 1]], fd: 4, mc: '#287628' });
BI('bambooJungle', { n: 'Bosque de bambú', g: 'JUNGLEGRASS', plants: [['BAMBOO', 0.36]], trees: [['JUNGLETREE', 0.04]], fauna: [['panda', 1.5], ['parrot', 1]], fd: 2, mc: '#5aa040' });
BI('desert', { n: 'Desierto', g: 'SAND', plants: [['CACTUS', 0.015], ['DEADBUSH', 0.01]], alt: [['SALTPETER', 0.78]], stone: 0.72, lakeAt: 0.2, oil: 1, trees: [['PALM', 0.0008]], fauna: [['camel', 1.5], ['scorpion', 1.5], ['lizard', 1]], fd: 2, mc: '#e8d48e' });
BI('redDesert', { n: 'Dunas rojas', g: 'REDSAND', plants: [['REDCACTUS', 0.01], ['DEADBUSH', 0.015]], stone: 0.7, rock: 'TERRACOTTA', ores: [['GOLD', 8], ['IRON', 20], ['COPPER', 20], ['TITANIUM', 8], ['ALUMINUM', 10]], oil: 1, fauna: [['scorpion', 2], ['lizard', 1.5]], fd: 2, mc: '#c8743a' });
BI('badlands', { n: 'Tierras baldías', g: 'TERRACOTTA', alt: [['REDSAND', 0.55]], stone: 0.56, rock: 'TERRACOTTA', ores: [['GOLD', 20], ['QUARTZ', 20], ['COPPER', 15], ['IRON', 10], ['ALUMINUM', 20], ['SILVER', 6]], plants: [['DEADBUSH', 0.01], ['REDCACTUS', 0.004]], river: 'OILRIVER', oil: 2, fauna: [['lizard', 1.5], ['beetle', 1], ['vulture', 1]], fd: 2, mc: '#b05e3a' });
BI('saltFlats', { n: 'Salar', g: 'SALT', alt: [['SAND', 0.64], ['LITHIUM', 0.8]], lake: 'WATER', lakeAt: 0.3, plants: [['DEADBUSH', 0.003]], fauna: [['flamingo', 2], ['lizard', 0.5]], fd: 2, mc: '#ecE8dc' });
BI('shrubland', { n: 'Matorral', g: 'DRYGRASS', alt: [['SAND', 0.6]], plants: [['DEADBUSH', 0.02], ['SAVANNAGRASS', 0.03], ['BERRYBUSH', 0.004]], trees: [['ACACIA', 0.003]], oil: 1, fauna: [['lizard', 1], ['rabbit', 1], ['antelope', 1]], fd: 2, mc: '#9c9250' });
// Volcánico y raros
BI('volcano', { n: 'Volcán', g: 'BASALT', alt: [['ASH', 0.5], ['OBSIDIAN', 0.74]], stone: 0.5, rock: 'BASALT', ores: [['SULFUR', 25], ['OBSIDIAN', 20], ['GOLD', 6], ['IRON', 10], ['TUNGSTEN', 12], ['PLATINUM', 5]], plants: [['SULFURVENT', 0.012]], trees: [['DEADTREE', 0.004]], lake: 'LAVA', lakeAt: 0.42, river: 'LAVA', bank: 'OBSIDIAN', fauna: [['salamander', 2]], fd: 1, mc: '#3a2826', rare: 1 });
BI('ashWastes', { n: 'Llanuras de ceniza', g: 'ASH', alt: [['BASALT', 0.6]], stone: 0.64, rock: 'BASALT', ores: [['SULFUR', 20], ['IRON', 15], ['COAL', 15], ['URANIUM', 6], ['TUNGSTEN', 6]], trees: [['DEADTREE', 0.008]], plants: [['SULFURVENT', 0.002]], river: 'LAVA', bank: 'BASALT', fauna: [['salamander', 1], ['beetle', 1], ['vulture', 1]], fd: 1, mc: '#6a625a', rare: 1 });
BI('volcanicIsland', { n: 'Isla volcánica', g: 'BASALT', alt: [['BLACKSAND', 0.6]], stone: 0.55, rock: 'BASALT', ores: [['SULFUR', 25], ['OBSIDIAN', 20], ['GOLD', 8], ['PLATINUM', 8]], plants: [['SULFURVENT', 0.01]], trees: [['PALM', 0.004]], lake: 'LAVA', lakeAt: 0.45, river: 'LAVA', fauna: [['salamander', 1], ['seagull', 1], ['crab', 1]], fd: 2, mc: '#5a2a20', rare: 1 });
BI('mushroomIsland', { n: 'Isla de setas', g: 'MYCELIUM', trees: [['BIGMUSHROOM', 0.06]], plants: [['MUSHROOM', 0.04], ['GLOWCAP', 0.02]], fauna: [['beetle', 1], ['mooshroom', 2]], fd: 2, mc: '#9a7aa2', rare: 1 });
BI('toxicMarsh', { n: 'Pantano tóxico', g: 'TOXIC', alt: [['ACID', 0.6]], stone: 0.6, ores: [['URANIUM', 15], ['LEAD', 15], ['COAL', 10]], trees: [['DEADTREE', 0.02]], plants: [['GLOWCAP', 0.02], ['TOXICWEED', 0.05]], lake: 'ACID', lakeAt: 0.4, river: 'ACID', bank: 'TOXIC', fauna: [['frog', 2], ['snake', 1], ['spider', 1]], fd: 2, mc: '#7a9a2a', rare: 1 });
BI('meadow', { n: 'Pradera alpina', g: 'GRASS', stone: 0.6, ores: [['SILVER', 12], ['IRON', 20], ['TIN', 12], ['COPPER', 10]], plants: [['FLOWERS', 0.05], ['TALLGRASS', 0.08], ['HERBS', 0.02]], trees: [['SPRUCE', 0.006]], fauna: [['goat', 1.5], ['sheep', 1.5], ['butterfly', 1], ['bee', 0.5]], fd: 3, mc: '#86b05e' });
// Fantasía por bioma: menas raras, hierbas mágicas y criaturas (todo escaso para que haya que explorar)
const FANTASY = {
  tundra: { ores: [['MITHRIL', 4]], plants: [['FROSTLEAF', 0.003]], fauna: [['frostwolf', 0.5]] },
  iceSpikes: { ores: [['MITHRIL', 8]], plants: [['FROSTLEAF', 0.006]], fauna: [['frostwolf', 0.8]] },
  snowyTaiga: { ores: [['MITHRIL', 2]], plants: [['FROSTLEAF', 0.002]], fauna: [['frostwolf', 0.3]] },
  meadow: { ores: [['MITHRIL', 3]], plants: [['MOONFLOWER', 0.004]], fauna: [['griffin', 0.25]] },
  hills: { ores: [['MITHRIL', 1]], fauna: [['griffin', 0.2]] },
  volcano: { ores: [['ADAMANTITE', 6]], plants: [['FIREBLOSSOM', 0.006]], fauna: [['drake', 0.6], ['phoenix', 0.12]] },
  ashWastes: { ores: [['ADAMANTITE', 4]], plants: [['FIREBLOSSOM', 0.004]], fauna: [['drake', 0.3]] },
  volcanicIsland: { ores: [['ADAMANTITE', 3]], plants: [['FIREBLOSSOM', 0.003]], fauna: [['phoenix', 0.1]] },
  badlands: { ores: [['ADAMANTITE', 1]], plants: [['BLOODTHORN', 0.003]] },
  crystalFields: { ores: [['ARCANITE', 10]], fauna: [['golem', 0.6], ['wisp', 0.4]] },
  mushroomIsland: { ores: [['ARCANITE', 6]], plants: [['GHOSTCAP', 0.008]], fauna: [['slime', 1], ['wisp', 0.5]] },
  toxicMarsh: { ores: [['ARCANITE', 2]], plants: [['NIGHTSHADE', 0.004], ['BLOODTHORN', 0.002]], fauna: [['basilisk', 0.6], ['slime', 0.8]] },
  darkForest: { ores: [['STARSILVER', 4]], plants: [['MANDRAKE', 0.003], ['NIGHTSHADE', 0.004], ['GHOSTCAP', 0.002]], fauna: [['shadowcat', 0.4], ['wisp', 0.5]] },
  cherryGrove: { ores: [['STARSILVER', 5]], plants: [['MOONFLOWER', 0.005], ['STARLILY', 0.002]], fauna: [['unicorn', 0.4]] },
  flowerField: { ores: [['STARSILVER', 3]], plants: [['STARLILY', 0.006]], fauna: [['unicorn', 0.25]] },
  saltFlats: { ores: [['STARSILVER', 2]] },
  swamp: { plants: [['MANDRAKE', 0.002]], fauna: [['wisp', 0.6], ['slime', 0.6]] },
  bog: { fauna: [['wisp', 0.4]] },
  jungle: { plants: [['DREAMROOT', 0.002]], fauna: [['basilisk', 0.2]] },
  bambooJungle: { plants: [['DREAMROOT', 0.003]] },
  desert: { plants: [['SUNPETAL', 0.002]], fauna: [['basilisk', 0.2]] },
  savanna: { plants: [['SUNPETAL', 0.003]] },
};
for (const [id, , , , , rar, , bios] of MINERALS) for (const k of bios) { const b = BIOMES[BI_[k]]; if (b) b.ores = (b.ores || STD_ORES).concat([['M_' + id.toUpperCase(), RARITY[rar].w]]); }
for (const k in FANTASY) {
  const b = BIOMES[BI_[k]], f = FANTASY[k];
  if (f.ores) b.ores = (b.ores || STD_ORES).concat(f.ores);
  if (f.plants) b.plants = (b.plants || []).concat(f.plants);
  if (f.fauna) b.fauna = (b.fauna || []).concat(f.fauna);
}
for (const b of BIOMES) {
  b.gI = G[b.g]; b.altI = (b.alt || []).map(([k, t]) => [G[k], t]);
  b.treeI = (b.trees || []).map(([k, d]) => [G[k], d]); b.plantI = (b.plants || []).map(([k, d]) => [G[k], d]); b.wetI = (b.wet || []).map(([k, d]) => [G[k], d]);
  b.rockI = G[b.rock || 'STONE']; b.oreT = (b.ores || STD_ORES).map(([k, w]) => [G[k], w]); b.oreSum = b.oreT.reduce((s, o) => s + o[1], 0);
  b.lakeI = G[b.lake || 'WATER']; b.riverI = G[b.river || 'WATER']; b.bankI = b.bank ? G[b.bank] : -1;
  b.faunaSum = (b.fauna || []).reduce((s, f) => s + f[1], 0);
}

// ---------- Clima ----------
const GEN_DEFAULT = { seed: 0, terrain: 30, water: 0.35, sand: 0.03, mountain: 0.63, ores: 0.6, forest: 0.6, oil: 0.7, gas: 0.0012, biomeSize: 1, rivers: 1, spawnKit: true,
  temp: 0, humid: 0, contSize: 1, islands: 1, chaos: 1, lakes: 0, veins: 1, flora: 1, fauna: 1, dayLen: 600, diff: 1, foes: 1, safeSpawn: true, quirks: [] };
// Rasgos de la semilla: cada semilla recibe 2 o 3 rasgos que no se pueden elegir (así ningún mundo es igual).
// g: grupo (no se repiten dos rasgos del mismo grupo) · f: cómo cambian los parámetros
const QUIRKS = [
  { n: 'Edad de hielo', d: 'Todo el mundo es más frío.', g: 't', f: P => { P.temp -= 0.06; } },
  { n: 'Mundo cálido', d: 'Todo el mundo es más cálido.', g: 't', f: P => { P.temp += 0.06; } },
  { n: 'Monzones', d: 'Más humedad: selvas y pantanos.', g: 'h', f: P => { P.humid += 0.07; } },
  { n: 'Gran sequía', d: 'Menos humedad: desiertos y sabanas.', g: 'h', f: P => { P.humid -= 0.07; } },
  { n: 'Vetas profundas', d: 'Las vetas de mena son más grandes y más escasas.', g: 'v', f: P => { P.veins *= 1.35; P.ores += 0.015; } },
  { n: 'Vetas finas', d: 'Muchas vetas pequeñas.', g: 'v', f: P => { P.veins *= 0.75; P.ores -= 0.01; } },
  { n: 'Placas rotas', d: 'Los biomas se mezclan con bordes caóticos.', g: 'c', f: P => { P.chaos *= 1.5; } },
  { n: 'Ríos serpenteantes', d: 'Más ríos y más anchos.', g: 'r', f: P => { P.rivers *= 1.3; } },
  { n: 'Tierra fértil', d: 'Más plantas y bosques.', g: 'f', f: P => { P.flora *= 1.4; P.forest -= 0.02; } },
  { n: 'Grandes migraciones', d: 'Muchos más animales.', g: 'a', f: P => { P.fauna *= 1.5; } },
  { n: 'Tierras yermas', d: 'Pocos animales.', g: 'a', f: P => { P.fauna *= 0.6; } },
  { n: 'Mar de islas', d: 'Muchas más islas en el océano.', g: 'i', f: P => { P.islands += 0.7; } },
  { n: 'Cordilleras jóvenes', d: 'Más montañas.', g: 'm', f: P => { P.mountain -= 0.03; } },
  { n: 'Llanuras antiguas', d: 'Montañas gastadas y bajas.', g: 'm', f: P => { P.mountain += 0.03; } },
  { n: 'Continentes vastos', d: 'Masas de tierra y océanos enormes.', g: 's', f: P => { P.contSize *= 1.35; } },
  { n: 'Tierras fragmentadas', d: 'Continentes pequeños y muchos mares.', g: 's', f: P => { P.contSize *= 0.75; } },
  { n: 'Noches largas', d: 'Los días duran más y las noches son largas.', g: 'd', f: P => { P.dayLen = Math.round(P.dayLen * 1.4); } },
  { n: 'Mares altos', d: 'El océano ha subido.', g: 'w', f: P => { P.water += 0.025; } },
  { n: 'Mares bajos', d: 'El océano ha bajado.', g: 'w', f: P => { P.water -= 0.025; } },
  { n: 'Lagos profundos', d: 'Más lagos tierra adentro.', g: 'l', f: P => { P.lakes += 0.04; } },
];
function applyQuirks(gen) {
  const P = { ...GEN_DEFAULT, ...gen }, used = new Set(), out = [];
  const n = 2 + (hash2(P.seed, 7, 991) < 0.4 ? 1 : 0);
  for (let i = 0; out.length < n && i < 40; i++) {
    const q = QUIRKS[Math.floor(hash2(P.seed, i, 993) * QUIRKS.length)];
    if (used.has(q.g)) continue; used.add(q.g); q.f(P); out.push(q.n);
  }
  P.quirks = out; return P;
}
function fbmN(x, y, s, o) { let t = 0, a = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { t += vnoise(x * f, y * f, s + i * 17) * a; n += a; a *= .5; f *= 2; } return t / n; }
const contrast = v => clamp(0.5 + (v - 0.5) * 1.9, 0, 1);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// Devuelve [continentalidad, temperatura, humedad, rareza, isla]
function climate(x, y, P, out) {
  const s = P.seed, k = 1 / (P.biomeSize || 1), wa = 260 * (P.chaos ?? 1), kc = k / (P.contSize || 1);
  const wx = x + (fbmN(x / 300, y / 300, s + 31, 2) - 0.5) * wa, wy = y + (fbmN(x / 300, y / 300, s + 37, 2) - 0.5) * wa;
  let C = contrast(fbmN(wx * kc / 1200, wy * kc / 1200, s + 41, 3));
  let Tm = contrast(fbmN(wx * k / 850, wy * k / 850, s + 51, 3));
  let Hu = contrast(fbmN(wx * k / 700, wy * k / 700, s + 61, 3));
  let Wd = contrast(fbmN(wx * k / 560, wy * k / 560, s + 71, 3));
  let Is = contrast(fbmN(wx * k / 240, wy * k / 240, s + 81, 2));
  if (P.temp) Tm = clamp(Tm + P.temp, 0, 1); if (P.humid) Hu = clamp(Hu + P.humid, 0, 1); if (P.islands !== undefined && P.islands !== 1) Is = clamp(Is + (P.islands - 1) * 0.06, 0, 1);
  // Alrededor del inicio el clima se vuelve templado y con tierra firme
  const m = smooth(220, 600, Math.hypot(x, y));
  if (m < 1 && P.safeSpawn !== false) { Tm = 0.5 + (Tm - 0.5) * m; Hu = 0.45 + (Hu - 0.45) * m; Wd = 0.4 + (Wd - 0.4) * m; C = C * m + 0.72 * (1 - m); Is *= m; }
  out[0] = C; out[1] = Tm; out[2] = Hu; out[3] = Wd; out[4] = Is; return out;
}
const oceanLevel = P => 0.37 + (P.water - 0.35) * 1.2;
function pickBiome(C, Tm, Hu, Wd, Is, P) {
  const oc = oceanLevel(P), bw = 0.022 + P.sand * 0.2;
  if (C < oc) {
    // Islas: solo en mar abierto. Las volcánicas y las de setas son muy raras.
    if (Is > 0.86 && C > oc - 0.16) {
      if (Is < 0.885) return Tm > 0.55 && Wd > 0.62 ? BI_.volcanicIsland : BI_.beach;
      if (Tm > 0.55 && Wd > 0.62) return BI_.volcanicIsland;
      if (Wd < 0.3) return BI_.mushroomIsland;
      return pickLand(Tm, Hu, Wd, 0.5);
    }
    if (C < oc - 0.11) return Tm < 0.22 ? BI_.frozenOcean : BI_.deepOcean;
    return Tm < 0.22 ? BI_.frozenOcean : Tm < 0.4 ? BI_.coldOcean : Tm > 0.66 ? BI_.warmOcean : BI_.ocean;
  }
  if (C < oc + bw) {
    if (Tm < 0.3 || Wd > 0.8) return BI_.stonyShore;
    if (Tm > 0.62 && Hu > 0.6) return BI_.mangrove;
    return BI_.beach;
  }
  return pickLand(Tm, Hu, Wd, C - oc);
}
function pickLand(Tm, Hu, Wd, inland) {
  if (Tm < 0.22) { if (Wd > 0.87) return BI_.iceSpikes; return Hu > 0.5 ? BI_.snowyTaiga : BI_.tundra; }
  if (Tm < 0.38) {
    if (Wd < 0.14 && Hu > 0.3) return BI_.crystalFields;
    if (Hu < 0.3) return Wd > 0.55 ? BI_.meadow : BI_.hills;
    return BI_.taiga;
  }
  if (Tm < 0.62) {
    if (Hu < 0.3) return Wd > 0.6 ? BI_.hills : BI_.plains;
    if (Hu < 0.45) return Wd > 0.8 ? BI_.flowerField : Wd < 0.22 ? BI_.meadow : BI_.plains;
    if (Hu < 0.6) return Wd > 0.82 ? BI_.cherryGrove : Wd < 0.25 ? BI_.birchForest : BI_.forest;
    if (Hu < 0.75) return Wd > 0.55 ? BI_.darkForest : BI_.birchForest;
    return Wd > 0.65 ? BI_.bog : BI_.swamp;
  }
  if (Hu < 0.2) {
    // El volcán solo aparece muy tierra adentro, rodeado de ceniza
    if (inland > 0.3 && Wd > 0.8) return BI_.volcano;
    if (inland > 0.26 && Wd > 0.68) return BI_.ashWastes;
    if (Wd < 0.22) return BI_.saltFlats;
    return Wd > 0.52 ? BI_.redDesert : BI_.desert;
  }
  if (Hu < 0.35) return Wd > 0.62 ? BI_.badlands : BI_.shrubland;
  if (Hu < 0.55) return BI_.savanna;
  if (Hu < 0.75) return Wd > 0.64 ? BI_.bambooJungle : BI_.jungle;
  return Wd > 0.8 ? BI_.toxicMarsh : BI_.jungle;
}
function biomeAt(x, y, P = S.gen) { const c = climate(x, y, P, _cl); return pickBiome(c[0], c[1], c[2], c[3], c[4], P); }
const _cl = [0, 0, 0, 0, 0];

// ---------- Detalle de cada casilla ----------
const SPAWN_PATCHES = [
  [12, -1, G.IRON, 2.8], [-12, 2, G.COPPER, 2.4], [2, -12, G.COAL, 2.4], [13, 11, G.ZINC, 2.3], [-12, -10, G.RED, 2], [-4, 11, G.STONE, 2.2],
  [3, 16, G.WATER, 3.4], [-15, 13, G.TREE, 2.8], [15, -12, G.TREE, 2.5], [9, 19, G.SAND, 2], [-22, -18, G.OIL, 2.2], [24, 22, G.GAS, 0.6],
];
// Ríos: líneas donde un ruido suave pasa por 0,5. Su anchura cambia a lo largo del recorrido
// (ríos grandes, medianos y arroyos). Devuelve 0 (no), 1 (orilla) o 2 (agua).
function riverAt(x, y, P) {
  if (!P.rivers) return 0;
  const s = P.seed;
  const big = Math.abs(fbmN(x / 520, y / 520, s + 700, 3) - 0.5);
  const wv = vnoise(x / 1100, y / 1100, s + 710);
  const w = (0.0035 + wv * wv * 0.016) * P.rivers;
  if (big < w) return 2; if (big < w * 1.7) return 1;
  const creek = Math.abs(fbmN(x / 160, y / 160, s + 720, 2) - 0.5);
  const cw = 0.006 * P.rivers * smooth(0.55, 0.75, vnoise(x / 400, y / 400, s + 730));
  if (creek < cw) return 2; if (creek < cw * 1.6) return 1;
  return 0;
}
const DENSE_WOODS = new Set(['jungle', 'mangrove']);
function tileAt(x, y, P, cl, bio) {
  const s = P.seed, B = BIOMES[bio];
  // Océano
  if (B.ocean) {
    for (const [t, th] of B.altI) if (vnoise(x / 9, y / 9, s + 900 + t) > th) return t;
    const h = hash2(x, y, s + 950); let acc = 0;
    for (const [t, d] of B.wetI) { acc += d; if (h < acc * (0.5 + vnoise(x / 14, y / 14, s + 960))) return t; }
    return B.gI;
  }
  const e = fbm(x / P.terrain, y / P.terrain, s);
  // Ríos (no en la costa)
  const oc = oceanLevel(P);
  if (cl[0] > oc + 0.04) {
    const r = riverAt(x, y, P);
    if (r === 2) return B.riverI;
    if (r === 1) return B.bankI >= 0 ? B.bankI : (B.riverI === G.LAVA ? G.BASALT : B.riverI === G.ICE ? G.SNOW : B.riverI === G.OILRIVER ? G.TERRACOTTA : B.gI === G.SAND || B.gI === G.REDSAND ? B.gI : (hash2(x, y, s + 3) < 0.5 ? G.CLAY : G.SAND));
  }
  // Lagos
  const lakeAt = (B.lakeAt ?? 0.32) + (P.water - 0.35) * 0.5 + (P.lakes || 0);
  if (e < lakeAt) return B.lakeI;
  // Montaña / roca con menas
  const stoneAt = (B.stone ?? 0.66) + (P.mountain - 0.63);
  if (e > stoneAt) {
    const vs = 5 * (P.veins || 1), o = fbm(x / vs, y / vs, s + 300);
    // Canteras (zonas planas de la montaña, ver sim/motion.js): más vetas para picar en línea recta
    if (o > P.ores - (vnoise(x / 150, y / 150, s + 1234) > 0.62 ? 0.07 : 0)) {
      const q = vnoise(x / 11, y / 11, s + 400) * B.oreSum; let acc = 0;
      for (const [t, w] of B.oreT) { acc += w; if (q < acc) return t; }
    }
    // Franja baja de la montaña: roca lisa que se puede pisar
    return e < stoneAt + 0.05 ? (FLAT_ROCK[B.rockI] ?? B.rockI) : B.rockI;
  }
  // Pozos de petróleo y géiseres
  if (B.oil && fbm(x / 7, y / 7, s + 600) > P.oil - (B.oil - 1) * 0.05 && hash2(x, y, s + 8) < 0.7) return G.OIL;
  if (hash2(x, y, s + 9) < P.gas) return G.GAS;
  // Suelo con manchas
  let g = B.gI;
  for (const [t, th] of B.altI) if (vnoise(x / 11, y / 11, s + 500 + t) > th) { g = FLAT_ROCK[t] ?? t; break; }
  if (isLiquid(g)) {
    const h = hash2(x, y, s + 950); let acc = 0;
    for (const [t, d] of B.wetI) { acc += d; if (h < acc) return t; }
    return g;
  }
  // Vegetación: los árboles se agrupan en bosquecillos; las plantas, sueltas
  const fm = (0.8 - P.forest) / 0.2;
  const f = fbm(x / 9, y / 9, s + 200), h = hash2(x, y, s + 5);
  let acc = 0;
  // Separación natural: como mucho un árbol por celda (2×2 en selvas y bosques oscuros, 3×3 en el
  // resto), en un punto al azar de la celda. Las copas grandes no se amontonan y se puede pasar entre ellas.
  const cs2 = DENSE_WOODS.has(B.key) ? 2 : 3, ccx = Math.floor(x / cs2), ccy = Math.floor(y / cs2);
  if (x === ccx * cs2 + ((hash2(ccx, ccy, s + 71) * cs2) | 0) && y === ccy * cs2 + ((hash2(ccx, ccy, s + 72) * cs2) | 0))
    for (const [t, d] of B.treeI) { acc += d * cs2 * cs2 * 0.42 * fm * clamp(0.4 + (f - 0.5) * 3, 0, 2.2); if (h < acc) return t; }
  const h2 = hash2(x, y, s + 6), fl = P.flora ?? 1; acc = 0;
  for (const [t, d] of B.plantI) { acc += d * fl; if (h2 < acc) return t; }
  return g;
}
function genTileB(x, y, P, cl, bio) {
  let t = tileAt(x, y, P, cl, bio);
  if (!P.spawnKit || Math.abs(x) > 40 || Math.abs(y) > 40) return t;
  if (Math.abs(x) <= 8 && Math.abs(y) <= 8) t = G.GRASS;
  for (const [px, py, pt, r] of SPAWN_PATCHES) {
    const d = Math.hypot(x - px, y - py);
    if (d < r + (hash2(x, y, P.seed + pt) - 0.5) * 1.6) t = pt;
    else if (d < r + 3 && pt !== G.WATER && isLiquid(t)) t = G.GRASS;
  }
  return t;
}
// Una casilla suelta (vista previa, consultas puntuales)
// Con lugares únicos (las Maravillas, data/wonders.js) el bioma también depende de la posición
function pickBiomeAt(x, y, c, P) { const w = typeof wonderAt === 'function' ? wonderAt(x, y, P) : -1; return w >= 0 ? w : pickBiome(c[0], c[1], c[2], c[3], c[4], P); }
function genTile(x, y, P = S.gen) { const c = climate(x, y, P, _cl), b = pickBiomeAt(x, y, c, P); return genTileB(x, y, P, c, b); }
// Un chunk entero: el clima se muestrea en una rejilla 5×5 y se interpola (25 cálculos en vez de 1024)
const _cg = new Float32Array(25 * 5);
function computeClimateGrid(x0, y0, P) {
  for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) { climate(x0 + i * 8, y0 + j * 8, P, _cl); for (let k = 0; k < 5; k++) _cg[(j * 5 + i) * 5 + k] = _cl[k]; }
}
function climateLerp(lx, ly, out) {
  const fx = lx / 8, fy = ly / 8, i = Math.min(3, fx | 0), j = Math.min(3, fy | 0), tx = fx - i, ty = fy - j;
  for (let k = 0; k < 5; k++) {
    const a = _cg[(j * 5 + i) * 5 + k], b = _cg[(j * 5 + i + 1) * 5 + k], c = _cg[((j + 1) * 5 + i) * 5 + k], d = _cg[((j + 1) * 5 + i + 1) * 5 + k];
    out[k] = a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  }
  return out;
}
function genChunkTiles(c) {
  const P = S.gen, x0 = c.cx * CS, y0 = c.cy * CS, cl = [0, 0, 0, 0, 0];
  computeClimateGrid(x0, y0, P);
  for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) {
    climateLerp(x, y, cl);
    const bio = pickBiomeAt(x0 + x, y0 + y, cl, P), i = (y << CSH) | x, t = genTileB(x0 + x, y0 + y, P, cl, bio);
    c.g[i] = t; c.bio[i] = bio; c.t[i] = GI[t].hp || 0;
  }
  endOverlay(c); // la Ciudadela, los santuarios y el otro lado de la Puerta (sim/endgame.js)
}
function computeChunkBiomes(c) {
  const P = S.gen, cl = [0, 0, 0, 0, 0]; computeClimateGrid(c.cx * CS, c.cy * CS, P);
  for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) { climateLerp(x, y, cl); c.bio[(y << CSH) | x] = pickBiomeAt(c.cx * CS + x, c.cy * CS + y, cl, P); }
}
