'use strict';
// =====================================================================================
//  Agricultura (datos). Ciclo completo y con lógica:
//   1. Encuentras cultivos silvestres en su bioma (trigo en la llanura, arroz en el manglar…):
//      al cogerlos dan semillas y a veces el fruto.
//   2. Con una azada conviertes hierba o tierra en tierra de cultivo.
//   3. Siembras (clic con la semilla); riegas con la regadera o deja que llueva.
//   4. Crece por etapas (regada crece mucho más rápido; el abono acelera); cosechas con F,
//      rompiéndolo o con la hoz de cosecha. Algunos rebrotan.
//   5. Con lo cosechado cocinas, haces harina, aceite, tela, compost…
//  Además: plantas raras (materiales para objetos raros, ver arsenal.js).
// =====================================================================================
const FARM_CAT = ICATS.length; ICATS.push('Agricultura');
// ---------- Suelo de cultivo ----------
TL('FARMLAND', { n: 'Tierra de cultivo', c: [112, 80, 50], drop: 'dirt', mt: 0.35, farm: 1 });
TL('FARMWET', { n: 'Tierra de cultivo regada', c: [74, 52, 34], drop: 'dirt', mt: 0.35, farm: 2 });
for (const k of ['FARMLAND', 'FARMWET']) { const t = GI[G[k]]; t.u = -1; t.solid = false; t.flora = false; }
// ---------- Cultivos ----------
// [clave, nombre, color del fruto, segundos hasta madurar, [mín, máx] de cosecha, rebrota a la etapa (0 = no),
//  comida cruda {f,w} o null, silvestre: [[bioma, densidad]], suelo silvestre, estilo de planta, ¿necesita agua siempre?]
const CROPS = [
  ['wheat', 'Trigo', '#e8c060', 260, [2, 3], 0, null, [['plains', 0.004], ['meadow', 0.003]], 'GRASS', 'tall'],
  ['corn', 'Maíz', '#f4d03a', 320, [1, 3], 0, { f: 6 }, [['plains', 0.002], ['savanna', 0.003]], 'GRASS', 'tall'],
  ['carrot', 'Zanahoria', '#f08a2a', 220, [2, 4], 0, { f: 7 }, [['forest', 0.002], ['meadow', 0.002]], 'GRASS', 'bush'],
  ['potato', 'Patata', '#c8a060', 240, [2, 5], 0, { f: 5 }, [['plains', 0.002], ['taiga', 0.002]], 'GRASS', 'bush'],
  ['tomato', 'Tomate', '#e8402a', 280, [2, 4], 2, { f: 5, w: 4 }, [['jungle', 0.002], ['shrubland', 0.002]], 'GRASS', 'bush'],
  ['pumpkin', 'Calabaza', '#e8822a', 420, [1, 2], 0, { f: 8 }, [['forest', 0.0015]], 'GRASS', 'bush'],
  ['melon', 'Sandía', '#3a9a3a', 400, [1, 2], 0, { f: 4, w: 14 }, [['jungle', 0.002], ['savanna', 0.0015]], 'GRASS', 'bush'],
  ['rice', 'Arroz', '#f0ead8', 300, [2, 4], 0, null, [['mangrove', 0.01], ['swamp', 0.006]], 'MUD', 'reeds', 1],
  ['cabbage', 'Repollo', '#8ac85a', 260, [1, 2], 0, { f: 6, w: 3 }, [['meadow', 0.002]], 'GRASS', 'bush'],
  ['onion', 'Cebolla', '#d8b0d0', 200, [2, 4], 0, { f: 3 }, [['plains', 0.0015], ['shrubland', 0.002]], 'GRASS', 'tall'],
  ['garlic', 'Ajo', '#f4f0e8', 200, [2, 4], 0, { f: 2 }, [['shrubland', 0.002]], 'DRYGRASS', 'tall'],
  ['pepper', 'Pimiento', '#e84a2a', 300, [2, 3], 2, { f: 4, w: 2 }, [['savanna', 0.002]], 'DRYGRASS', 'bush'],
  ['strawberry', 'Fresa', '#e8304a', 240, [2, 4], 2, { f: 4, w: 2 }, [['forest', 0.003], ['flowerField', 0.004]], 'GRASS', 'bush'],
  ['beans', 'Judías', '#7aa83a', 260, [3, 5], 2, null, [['jungle', 0.002], ['plains', 0.0015]], 'GRASS', 'tall'],
  ['sugarcane', 'Caña de azúcar', '#9ac86a', 300, [2, 4], 0, null, [['jungle', 0.003], ['mangrove', 0.004]], 'MUD', 'reeds'],
  ['grape', 'Uva', '#7a3a8a', 360, [3, 5], 2, { f: 3, w: 4 }, [['cherryGrove', 0.004], ['meadow', 0.0015]], 'GRASS', 'bush'],
  ['coffee', 'Café', '#7a4a2a', 380, [2, 4], 2, null, [['jungle', 0.003]], 'JUNGLEGRASS', 'bush'],
  ['tea', 'Té', '#5a8a3a', 340, [2, 4], 2, null, [['cherryGrove', 0.003], ['jungle', 0.0015]], 'GRASS', 'bush'],
  ['sunflower', 'Girasol', '#f4c82a', 300, [1, 2], 0, null, [['plains', 0.002], ['flowerField', 0.006]], 'GRASS', 'flowers'],
  ['flax', 'Lino', '#8aa8e8', 260, [2, 4], 0, null, [['meadow', 0.003], ['plains', 0.0015]], 'GRASS', 'tall'],
  ['chili', 'Guindilla', '#d81a1a', 300, [2, 4], 2, { f: 2 }, [['savanna', 0.002], ['shrubland', 0.0015]], 'DRYGRASS', 'bush'],
  ['lettuce', 'Lechuga', '#9ad86a', 180, [1, 2], 0, { f: 4, w: 4 }, [['forest', 0.0015], ['meadow', 0.002]], 'GRASS', 'bush'],
];
const CROP = {}; // clave → { n, item, seed, t, y, re, water }
const cap1 = s => s[0].toUpperCase() + s.slice(1);
for (const [k, n, c, t, y, re, food, wild, under, style, water] of CROPS) {
  const item = ITEMS[k] ? k : k, seed = 'seed' + cap1(k);
  if (!ITEMS[item]) { NI(item, n, c, k === 'wheat' || k === 'rice' || k === 'flax' ? 'herb' : 'nugget', FARM_CAT, `Cosecha de ${n.toLowerCase()}.`); if (food) ITEMS[item].food = food; }
  NI(seed, 'Semillas de ' + n.toLowerCase(), c, 'dust', FARM_CAT, `Siémbralas en tierra de cultivo (haz clic con ellas). Maduran en unos ${Math.round(t / 60)} min si las riegas${water ? '; necesitan estar siempre regadas' : ''}.${re ? ' Rebrotan tras cosechar.' : ''}`);
  ITEMS[seed].seed = k;
  CROP[k] = { n, item, seed, t, y, re, water: !!water, c };
  // Planta silvestre: da semillas y a veces el fruto
  const wk = 'WILD' + k.toUpperCase();
  TL(wk, { n: n + ' silvestre', under, hp: 1, drop: seed, extra: [item, 0.45], plant: { s: style, c } });
  const g = GI[G[wk]]; g.u = G[under]; g.c = GI[g.u].c; g.flora = true; g.solid = false;
  for (const [bk, d] of wild) { const b = BIOMES[BI_[bk]]; if (b) (b.plants || (b.plants = [])).push([wk, d]); }
}
// ---------- Plantas raras (materiales de objetos raros) ----------
const RARE_PLANTS = [
  ['MOONFLOWER', 'Flor de luna', 'moonPetal', 'Pétalo de luna', '#c8d8ff', 'flowers', 'GRASS', [['meadow', 0.0006], ['flowerField', 0.0008]], 'Solo se abre de noche; brilla con luz fría.'],
  ['CLOVER4', 'Trébol de cuatro hojas', 'luckyClover', 'Trébol de la suerte', '#4ac85a', 'tall', 'GRASS', [['plains', 0.0004], ['forest', 0.0003]], 'Uno entre diez mil. Trae suerte.'],
  ['MANDRAKE', 'Mandrágora', 'mandrakeRoot', 'Raíz de mandrágora', '#8a6a4a', 'bush', 'MUD', [['mangrove', 0.0008], ['swamp', 0.0008]], 'Raíz con forma humana: poderosa en medicina.'],
  ['GOLDENWHEAT', 'Trigo dorado', 'goldenWheat', 'Espiga dorada', '#ffd23a', 'tall', 'GRASS', [['plains', 0.0004], ['meadow', 0.0004]], 'Una espiga de oro puro… comestible.'],
  ['STARMOSS', 'Musgo estelar', 'starMoss', 'Musgo estelar', '#a8f0ff', 'mush', 'GRASS', [['meadow', 0.0005], ['taiga', 0.0005]], 'Destella como el cielo nocturno.'],
  ['FROSTLOTUS', 'Loto de escarcha', 'frostLotus', 'Loto de escarcha', '#bfefff', 'flowers', 'SNOW', [['tundra', 0.0008], ['snowyTaiga', 0.0006]], 'Siempre helado, nunca se derrite.'],
  ['EMBERBLOOM', 'Flor de brasa', 'emberBloom', 'Flor de brasa', '#ff7a2a', 'flowers', 'DRYGRASS', [['savanna', 0.0006], ['shrubland', 0.0006]], 'Tibia al tacto: guarda el calor del sol.'],
  ['DRAGONCACTUS', 'Cactus del dragón', 'dragonFruit', 'Fruta del dragón', '#e83a8a', 'cactus', 'SAND', [['desert', 0.0008]], 'Fruta rara del desierto, dulce y fuerte.'],
  ['SPIRITFERN', 'Helecho espiritual', 'spiritFern', 'Fronda espiritual', '#7af0c8', 'tall', 'GRASS', [['jungle', 0.0005], ['forest', 0.0003]], 'Susurra cuando hay viento.'],
];
for (const [tk, tn, item, iname, c, style, under, where, d] of RARE_PLANTS) {
  NI(item, iname, c, style === 'flowers' ? 'herb' : style === 'cactus' ? 'nugget' : 'herb', FARM_CAT, d + ' Material raro.');
  ITEMS[item].rare = 1;
  TL(tk, { n: tn, under, hp: 1, drop: item, extra: ['ancientSeed', 0.08], plant: { s: style, c }, light: tk === 'MOONFLOWER' || tk === 'STARMOSS' ? 1 : 0 });
  const g = GI[G[tk]]; g.u = G[under]; g.c = GI[g.u].c; g.flora = true; g.solid = tk === 'DRAGONCACTUS';
  for (const [bk, dd] of where) { const b = BIOMES[BI_[bk]]; if (b) (b.plants || (b.plants = [])).push([tk, dd]); }
}
NI('ancientSeed', 'Semilla antigua', '#c8a86a', 'orb', FARM_CAT, 'Raramente aparece al recoger plantas raras. Base de los objetos más raros.'); ITEMS.ancientSeed.rare = 1;
// Recalcular las plantas de los biomas con las nuevas
for (const b of BIOMES) b.plantI = (b.plants || []).map(([k, d]) => [G[k], d]).filter(([g]) => g !== undefined);
// ---------- Materiales del campo ----------
const F_MATS = [
  ['straw', 'Paja', '#e8d070', 'herb', 'Tallos secos de trigo y arroz: tejados, camas y fardos.', 'b:wheat|wheat|2'],
  ['compost', 'Compost', '#5a4a2a', 'dust', 'Restos de plantas podridos: abono natural (×1,5 de crecimiento).', 'b:herbs|herbs,petals|2;b:straw|straw,herbs|2'],
  ['boneMeal', 'Harina de hueso', '#f0ece0', 'dust', 'Abono rápido: sube una etapa al momento.', 'b:bone|bone|3'],
  ['superFertilizer', 'Superabono', '#7aa83a', 'dust', 'Compost, harina de hueso y ceniza: ×2 de crecimiento durante toda la cosecha.', 'b:compost|boneMeal,ash|2'],
  ['flaxFiber', 'Fibra de lino', '#c8d0e8', 'coil', 'Se hila para tela fina e hilo.', 'b:flax|flax|2'],
  ['sunflowerSeeds', 'Pipas de girasol', '#5a4a3a', 'nugget', 'Para comer o prensar en aceite.', 'b:sunflower|sunflower|4'],
  ['coffeeRoast', 'Café tostado', '#4a2a1a', 'nugget', 'Granos tostados listos para la cafetera.', 'm:furnace:coffee*2|1|2'],
  ['teaLeaves', 'Hojas de té secas', '#5a7a3a', 'herb', 'Secas al fuego: infusión.', 'm:furnace:tea*2|1|1.5'],
  ['cornmeal', 'Harina de maíz', '#f0d070', 'dust', 'Maíz molido: tortitas y pan de maíz.', 'm:millstone:corn*2|1|2;b:corn|corn,stone|1'],
  ['wheatFlour', 'Harina de trigo', '#f4ecd8', 'dust', 'La mejor harina: pan y pasteles.', 'm:millstone:wheat*2|1|2;b:wheat|wheat,stone|1'],
  ['riceFlour', 'Harina de arroz', '#f8f4ec', 'dust', 'Para fideos y dulces.', 'm:millstone:rice*2|1|2'],
  ['caneSugar', 'Azúcar de caña', '#fbf8f0', 'dust', 'La caña molida endulza más que el bambú.', 'm:millstone:sugarcane*2|2|2;b:sugarcane|sugarcane|1'],
];
for (const [id, n, c, s, d, r] of F_MATS) { if (ITEMS[id]) continue; NI(id, n, c, s, FARM_CAT, d); xrec(id, r); }
// Recetas extra que conectan con lo que ya existe
xrec('flour', 'b:wheatFlour|wheatFlour|2'); xrec('sugar', 'b:caneSugar|caneSugar|2'); xrec('vegOil', 'm:press:sunflowerSeeds*3|1|2'); xrec('linen', 'm:loom:flaxFiber*3|2|2'); xrec('thread', 'b:flaxFiber|flaxFiber|3'); xrec('fertilizer', 'b:compost|compost|2');
// ---------- Comidas del campo (32) ----------
const F_FOODS = [
  ['popcorn', 'Palomitas', '#fff8e0', 'dust', 'Crujientes.', { f: 8 }, 'm:furnace:corn|2|1'],
  ['cornBread', 'Pan de maíz', '#e8b84a', 'block', '', { f: 24 }, 'm:furnace:cornmeal*2|1|2'],
  ['tortilla', 'Tortilla de maíz', '#f0d078', 'sheet', '', { f: 12 }, 'm:furnace:cornmeal|2|1.5'],
  ['bakedPotato', 'Patata asada', '#b88a4a', 'nugget', '', { f: 16 }, 'm:furnace:potato|1|1.5'],
  ['fries', 'Patatas fritas', '#f0c858', 'dust', 'Doradas y saladas.', { f: 18 }, 'b:potato|vegOil,salt|2'],
  ['mashedPotato', 'Puré de patata', '#f4e4b0', 'potion', '', { f: 22, back: 'vial' }, 'b:vial|potato,butter|1'],
  ['carrotSoup', 'Crema de zanahoria', '#f08a2a', 'potion', '', { f: 22, w: 10, back: 'vial' }, 'b:vial|carrot,onion|1'],
  ['tomatoSoup', 'Sopa de tomate', '#d83a2a', 'potion', 'Caliente: quita el frío.', { f: 20, w: 12, back: 'vial', buff: ['warmth', 180] }, 'b:vial|tomato,tomato,garlic|1'],
  ['gardenSalad', 'Ensalada de la huerta', '#8ad85a', 'herb', 'Fresca y ligera.', { f: 18, w: 8, hp: 2 }, 'b:lettuce|tomato,onion|1'],
  ['coleslaw', 'Ensalada de col', '#c8e8a0', 'herb', '', { f: 16, w: 4 }, 'b:cabbage|carrot,vinegar|2'],
  ['pumpkinPie', 'Tarta de calabaza', '#e8822a', 'block', 'Te pone de buen humor.', { f: 40, buff: ['calm', 240] }, 'm:furnace:pumpkin+wheatFlour+caneSugar|1|4'],
  ['pumpkinSoup', 'Crema de calabaza', '#f0a040', 'potion', '', { f: 28, w: 10, back: 'vial' }, 'b:vial|pumpkin,milk|2'],
  ['melonSlice', 'Rodaja de sandía', '#e85a5a', 'sheet', 'Refresca muchísimo.', { f: 4, w: 16 }, 'b:melon||4'],
  ['melonJuice', 'Zumo de sandía', '#ff7a7a', 'potion', '', { w: 30, back: 'vial' }, 'b:vial|melonSlice,melonSlice|1'],
  ['cookedRice', 'Arroz hervido', '#f8f4ec', 'dust', '', { f: 16 }, 'm:furnace:rice*2|1|2'],
  ['friedRice', 'Arroz frito', '#e8c870', 'dust', '', { f: 26 }, 'b:cookedRice|onion,vegOil,egg|1'],
  ['sushiRoll', 'Rollo de sushi', '#f0f0f0', 'nugget', 'Pescado crudo con arroz: sin riesgo de enfermar.', { f: 28, hp: 3 }, 'b:cookedRice|fish,vinegar|2'],
  ['riceBall', 'Bola de arroz', '#ffffff', 'orb', 'Fácil de llevar.', { f: 14 }, 'b:cookedRice|salt|2'],
  ['garlicBread', 'Pan de ajo', '#e8c070', 'block', '', { f: 30 }, 'b:bread|garlic,butter|1'],
  ['stuffedPepper', 'Pimiento relleno', '#e84a2a', 'nugget', '', { f: 34, hp: 2 }, 'm:furnace:pepper+cookedRice+cookedMeat|1|3'],
  ['strawberryJam', 'Mermelada de fresa', '#d8304a', 'potion', 'Dulce y energética.', { f: 14, back: 'vial', buff: ['swift', 90] }, 'b:vial|strawberry,strawberry,caneSugar|1'],
  ['strawberryCake', 'Pastel de fresa', '#f8a0b0', 'block', 'Una fiesta: +experiencia un rato.', { f: 48, buff: ['calm', 300] }, 'm:furnace:strawberry*2+wheatFlour+milk+caneSugar|1|4'],
  ['beanStew', 'Guiso de judías', '#8a5a2a', 'potion', 'Llena mucho.', { f: 42, w: 6, back: 'vial' }, 'b:vial|beans,beans,onion,tomato|1'],
  ['grapeJuice', 'Zumo de uva', '#7a3a8a', 'potion', '', { w: 26, f: 4, back: 'vial' }, 'b:vial|grape,grape|1'],
  ['raisins', 'Pasas', '#5a2a3a', 'dust', 'Uvas secas: duran mucho.', { f: 8 }, 'm:furnace:grape*2|1|2'],
  ['coffeeCup', 'Taza de café', '#4a2a1a', 'potion', 'Despierta: menos cansancio un buen rato.', { w: 12, back: 'vial', buff: ['swift', 180] }, 'b:vial|coffeeRoast,waterBottle|1'],
  ['greenTea', 'Té verde', '#7aa84a', 'potion', 'Calma y aclara la mente.', { w: 18, hp: 2, back: 'vial', buff: ['calm', 240] }, 'b:vial|teaLeaves,waterBottle|1'],
  ['chiliStew', 'Chile con carne', '#b82a1a', 'potion', 'Pica: abriga contra el frío.', { f: 46, back: 'vial', buff: ['warmth', 300] }, 'b:vial|chili,beans,cookedMeat|1'],
  ['roastedSeeds', 'Pipas tostadas', '#7a5a3a', 'nugget', '', { f: 6 }, 'm:furnace:sunflowerSeeds*2|2|1'],
  ['cornSoup', 'Crema de maíz', '#f4d058', 'potion', '', { f: 24, w: 8, back: 'vial' }, 'b:vial|corn,milk|1'],
  ['veggieSkewer', 'Brocheta de verduras', '#d86a3a', 'rod', '', { f: 22 }, 'm:furnace:pepper+onion+tomato|1|2'],
  ['carrotCake', 'Bizcocho de zanahoria', '#e89a4a', 'block', '', { f: 38 }, 'm:furnace:carrot*2+wheatFlour+egg+caneSugar|1|4'],
  ['goldenBread', 'Pan dorado', '#ffd23a', 'block', 'De trigo dorado: cura y llena del todo.', { f: 100, hp: 40, buff: ['regen', 300] }, 'm:furnace:goldenWheat*3|1|5'],
];
for (const [id, n, c, s, d, food, r] of F_FOODS) { if (ITEMS[id]) continue; NI(id, n, c, s, S_CAT, d || (food.w > (food.f || 0) ? 'Bebida.' : 'Comida.')); ITEMS[id].food = food; xrec(id, r); }
// ---------- Bloques de la granja ----------
const F_BLOCKS = [
  ['sprinkler', 'Aspersor', '#8ab8d8', '✲', { farmWater: 2 }, MF.copper.plate, [MF.copper.rod, 'pipe'], 'Riega solo la tierra de cultivo de alrededor (2 casillas) cada poco.'],
  ['sprinklerGold', 'Aspersor de oro', '#f0c850', '✲', { farmWater: 4 }, MF.gold.plate, [MF.gold.rod, 'pipe', 'sprinkler'], 'Riega en 4 casillas a la redonda.'],
  ['compostBin', 'Compostador', '#6a5a3a', '♻', {}, 'planks', ['planks', 'planks', 'stick'], 'Echa plantas, paja o restos (F con ellos en la mano): cada 4 dan 1 compost.'],
  ['hayBale', 'Fardo de paja', '#e8d070', '▦', { decor: 1 }, 'straw', ['straw', 'straw', 'twine'], 'Decoración rústica. Los animales se acercan a comer.'],
  ['growLamp', 'Lámpara de cultivo', '#f0a0ff', '☀', { light: 3, farmGrow: 3 }, 'glass', [MF.copper.wire, 'glowcap'], 'Luz que hace crecer un 50 % más rápido lo plantado alrededor (3 casillas), también de noche.'],
];
for (const [id, n, c, g, x, core, teeth, d] of F_BLOCKS) { XB(id, Object.assign({ n, cat: HOUSE_CAT, d, look: { c, g, a: x.light ? 'glow' : '' } }, x)); RR(id, 1, core, teeth.join(',')); }
// El cultivo plantado: bloque sin objeto (lo dibuja sim/farming.js)
XB('crop', { n: 'Cultivo', cat: -1, walk: 1, look: { c: '#5a8a3a', g: '' }, d: 'Lo que plantaste.' });
// ---------- Herramientas del campo (31) ----------
const F_TOOL_KIND_N = { hoe: 'Azada', can: 'Regadera', harvest: 'Hoz de cosecha', seedbag: 'Sembradora', rake: 'Rastrillo', shears: 'Tijeras de podar', machete: 'Machete', lens: 'Lupa', spreader: 'Abonadora', trowel: 'Desplantador', pan: 'Batea', dowse: 'Varilla de zahorí' };
// [id, nombre, color, forma, {kind, area, ...}, núcleo, dientes, descripción]
const F_TOOLS = [
  ['woodHoe', 'Azada de madera', '#a07848', 'hoe', { kind: 'hoe', area: 0 }, 'stick', 'planks,planks', 'Clic en hierba o tierra: la convierte en tierra de cultivo.'],
  ['stoneHoe', 'Azada de piedra', '#8a8884', 'hoe', { kind: 'hoe', area: 0, fast: 1 }, 'stick', 'stone,stone', 'Ara más rápido.'],
  ['ironHoe', 'Azada de hierro', '#c8c8c8', 'hoe', { kind: 'hoe', area: 1, line: 1 }, 'stick', `${MF.iron.plate},${MF.iron.plate}`, 'Ara tres casillas en línea.'],
  ['steelHoe', 'Azada de acero', '#9aa4b0', 'hoe', { kind: 'hoe', area: 1 }, MF.steel.rod, `${MF.steel.plate},${MF.steel.plate}`, 'Ara un cuadrado de 3×3.'],
  ['goldHoe', 'Azada de oro', '#f0c850', 'hoe', { kind: 'hoe', area: 1, wet: 1 }, MF.gold.rod, `${MF.gold.plate},${MF.gold.plate}`, 'Ara 3×3 y deja la tierra ya regada.'],
  ['mithrilHoe', 'Azada de mithril', '#a0e0ff', 'hoe', { kind: 'hoe', area: 2, wet: 1 }, MF.mithril.rod, `${MF.mithril.plate},${MF.mithril.plate}`, 'Ara 5×5 regado.'],
  ['wateringCan', 'Regadera', '#d8843a', 'potion', { kind: 'can', area: 0 }, MF.copper.plate, `${MF.copper.plate},waterBottle`, 'Clic en tierra de cultivo: la riega. La lluvia también riega.'],
  ['ironCan', 'Regadera de hierro', '#c8c8c8', 'potion', { kind: 'can', area: 1, line: 1 }, MF.iron.plate, `${MF.iron.plate},wateringCan`, 'Riega tres casillas en línea.'],
  ['goldCan', 'Regadera de oro', '#f0c850', 'potion', { kind: 'can', area: 1 }, MF.gold.plate, `${MF.gold.plate},ironCan`, 'Riega 3×3.'],
  ['mithrilCan', 'Regadera de mithril', '#a0e0ff', 'potion', { kind: 'can', area: 2 }, MF.mithril.plate, `${MF.mithril.plate},goldCan`, 'Riega 5×5.'],
  ['ironHarvester', 'Hoz de cosecha de hierro', '#c8c8c8', 'sickle', { kind: 'harvest', area: 1 }, MF.iron.rod, `${MF.iron.plate},leather`, 'Clic: cosecha lo maduro en 3×3.'],
  ['goldHarvester', 'Hoz de cosecha de oro', '#f0c850', 'sickle', { kind: 'harvest', area: 1, bonus: 0.25 }, MF.gold.rod, `${MF.gold.plate},leather`, 'Cosecha 3×3 y un 25 % de veces da una pieza de más.'],
  ['mithrilHarvester', 'Hoz de cosecha de mithril', '#a0e0ff', 'sickle', { kind: 'harvest', area: 2, bonus: 0.25 }, MF.mithril.rod, `${MF.mithril.plate},leather`, 'Cosecha 5×5 con bonificación.'],
  ['adamantiteHarvester', 'Hoz de cosecha de adamantita', '#e05a8a', 'sickle', { kind: 'harvest', area: 2, bonus: 0.5, replant: 1 }, MF.adamantite.rod, `${MF.adamantite.plate},leather`, 'Cosecha 5×5, +50 % y vuelve a sembrar sola.'],
  ['seedBag', 'Sembradora de mano', '#c8a070', 'coin', { kind: 'seedbag', area: 1 }, 'leather', 'thread,thread', 'Llévala en la mano con semillas en el inventario: siembra 3×3 de un clic.'],
  ['bigSeedBag', 'Sembradora grande', '#a8804a', 'coin', { kind: 'seedbag', area: 2 }, 'leather', 'seedBag,leather,thread', 'Siembra 5×5.'],
  ['seedDrill', 'Sembradora mecánica', '#7a8a9a', 'cog', { kind: 'seedbag', area: 3 }, MF.iron.plate, `bigSeedBag,${MF.iron.gear},${MF.iron.gear}`, 'Siembra 7×7.'],
  ['woodRake', 'Rastrillo de madera', '#a07848', 'hoe', { kind: 'rake', area: 1 }, 'stick', 'stick,stick,stick', 'Recoge la hierba y flores de 3×3 (y alguna semilla silvestre).'],
  ['ironRake', 'Rastrillo de hierro', '#c8c8c8', 'hoe', { kind: 'rake', area: 2 }, MF.iron.rod, `${MF.iron.rod},${MF.iron.rod},${MF.iron.rod}`, 'Recoge en 5×5 y encuentra más semillas.'],
  ['shears', 'Tijeras de podar', '#c8c8c8', 'shears', { kind: 'shears' }, MF.iron.plate, MF.iron.plate, 'Cortan plantas silvestres sin dañarlas: siempre dan semilla y fruto.'],
  ['goldShears', 'Tijeras de oro', '#f0c850', 'shears', { kind: 'shears', double: 1 }, MF.gold.plate, MF.gold.plate, 'Como las de podar, pero el doble.'],
  ['machete', 'Machete', '#9aa4b0', 'dagger', { kind: 'machete', area: 1 }, 'stick', `${MF.iron.plate},${MF.iron.plate}`, 'Desbroza 3×3 de un tajo (hierba, arbustos, plantas).'],
  ['steelMachete', 'Machete de acero', '#7f8a96', 'dagger', { kind: 'machete', area: 2 }, MF.steel.rod, `${MF.steel.plate},${MF.steel.plate}`, 'Desbroza 5×5.'],
  ['farmLens', 'Lupa de campo', '#c8e8ff', 'eye', { kind: 'lens' }, 'glass', 'stick', 'Clic en un cultivo, suelo o animal: te dice todo (etapa, tiempo que falta, si tiene agua o abono, qué crece bien aquí).'],
  ['spreader', 'Abonadora', '#6a5a3a', 'potion', { kind: 'spreader', area: 1 }, 'planks', `planks,stick,${MF.iron.plate}`, 'Con compost o abono en el inventario: abona 3×3 de un clic.'],
  ['bigSpreader', 'Abonadora grande', '#5a4a2a', 'potion', { kind: 'spreader', area: 2 }, MF.iron.plate, `spreader,${MF.iron.gear}`, 'Abona 5×5.'],
  ['trowel', 'Desplantador', '#a8a8a8', 'shovel', { kind: 'trowel' }, 'stick', MF.iron.plate, 'Clic en un cultivo: lo arranca con su tierra (semillas de vuelta, y el fruto si estaba maduro).'],
  ['goldPan', 'Batea', '#c8a050', 'coin', { kind: 'pan' }, MF.iron.plate, 'planks', 'Clic en agua: lavas arena y a veces sale una pepita, una gema o arcilla.'],
  ['dowsingRod', 'Varilla de zahorí', '#a07848', 'rod', { kind: 'dowse' }, 'stick', 'stick,copperOre', 'Clic: señala el agua más cercana (para tu huerto).'],
  ['ironShears', 'Tijeras de esquilar', '#c8c8c8', 'shears', { kind: 'shears', wool: 1 }, MF.iron.plate, `${MF.iron.plate},${MF.iron.ring}`, 'Además de podar: clic en una oveja para esquilarla (lana) sin hacerle daño.'],
  ['scarecrowWand', 'Vara de espantapájaros', '#e8d070', 'staff', { kind: 'shoo', area: 6 }, 'stick', 'straw,straw,cloth', 'Clic: espanta a los animales de alrededor de tu huerto.'],
];
const FTOOLS = {};
for (const [id, n, c, s, st, core, teeth, d] of F_TOOLS) {
  if (ITEMS[id]) continue; FTOOLS[id] = st;
  TOOLS[id] = { kind: 'util', mult: 1, lv: 1, ftool: st };
  ITEMS[id] = { n, c, s: s === 'hoe' ? 'pick' : s === 'shears' ? 'sickle' : s, cat: FARM_CAT, tool: TOOLS[id], d: `${F_TOOL_KIND_N[st.kind]}. ${d}` };
  RR(id, 1, core, teeth);
}
