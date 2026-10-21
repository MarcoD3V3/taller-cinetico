'use strict';
// ---------- Recetas de máquinas ----------
// in/out: objetos · fin/fout: fluidos (mB) · t: segundos a velocidad base (32 RPM o energía completa)
const ORES = [['ironOre', 'crushedIron', 'ironIngot'], ['copperOre', 'crushedCopper', 'copperIngot'], ['zincOre', 'crushedZinc', 'zincIngot']];
const RECIPES = {
  furnace: [
    ...ORES.flatMap(([o, c, i]) => [{ in: { [o]: 1 }, out: { [i]: 1 }, t: 2 }, { in: { [c]: 1 }, out: { [i]: 1 }, t: 2 }]),
    { in: { sand: 1 }, out: { glass: 1 }, t: 2 }, { in: { log: 1 }, out: { coal: 1 }, t: 3 },
    { in: { goldOre: 1 }, out: { goldIngot: 1 }, t: 2 }, { in: { crushedGold: 1 }, out: { goldIngot: 1 }, t: 2 }, { in: { clay: 1 }, out: { brick: 1 }, t: 2 }, { in: { mud: 2 }, out: { brick: 1 }, t: 3 },
    { in: { quartz: 1 }, out: { glass: 2 }, t: 2 }, { in: { snow: 4 }, out: { ice: 1 }, t: 1 }, { in: { kelp: 2 }, out: { coal: 1 }, t: 3 }, { in: { cactus: 2 }, out: { latex: 1 }, t: 2 }],
  millstone: [...ORES.map(([o, c]) => ({ in: { [o]: 1 }, out: { [c]: 2 }, t: 3 })), { in: { goldOre: 1 }, out: { crushedGold: 2 }, t: 3 }, { in: { stone: 1 }, out: { sand: 1 }, t: 2 }, { in: { gravel: 1 }, out: { sand: 1 }, t: 1 }, { in: { basalt: 1 }, out: { gravel: 2 }, t: 2 }, { in: { bone: 1 }, out: { saltpeter: 2 }, t: 2 }, { in: { shell: 1 }, out: { sand: 2 }, t: 1.5 }, { in: { obsidian: 1 }, out: { sand: 1, glass: 1 }, t: 4 }],
  crusher: [...ORES.map(([o, c]) => ({ in: { [o]: 1 }, out: { [c]: 2 }, t: 1 })), { in: { goldOre: 1 }, out: { crushedGold: 2 }, t: 1 }, { in: { crystal: 1 }, out: { quartz: 2 }, t: 1 }, { in: { stone: 1 }, out: { sand: 1 }, t: 0.7 }],
  saw: [{ in: { log: 1 }, out: { planks: 6 }, t: 1.5 }, { in: { bamboo: 2 }, out: { planks: 3 }, t: 1 }, { in: { coconut: 1 }, out: { planks: 1, stick: 2 }, t: 1 }],
  press: [{ in: { ironIngot: 1 }, out: { ironSheet: 1 }, t: 1.5 }, { in: { copperIngot: 1 }, out: { copperSheet: 1 }, t: 1.5 }, { in: { brass: 1 }, out: { brassSheet: 1 }, t: 1.5 }],
  lathe: [{ in: { ironIngot: 1 }, out: { ironRod: 2 }, t: 1.5 }, { in: { andesite: 1 }, out: { cog: 2 }, t: 1.5 }],
  wiremill: [{ in: { copperIngot: 1 }, out: { coil: 2 }, t: 1.5 }, { in: { cotton: 2 }, out: { silk: 1 }, t: 2 }],
  mixer: [{ in: { copperIngot: 1, zincIngot: 1 }, out: { brass: 2 }, t: 3 }, { in: { stone: 1, ironIngot: 1 }, out: { andesite: 3 }, t: 2.5 }],
  blast: [{ in: { ironIngot: 1, coal: 1 }, out: { steel: 1 }, t: 3 }, { in: { sand: 2 }, out: { silicon: 1 }, t: 3 }],
  vulcan: [{ in: { latex: 2, sulfur: 1 }, out: { rubber: 4 }, t: 3 }, { in: { latex: 2, coal: 1 }, out: { rubber: 2 }, t: 3 }, { in: { resin: 2, sulfur: 1 }, out: { rubber: 2 }, t: 3 }],
  refinery: [{ in: {}, fin: { oil: 60 }, out: { plastic: 1 }, fout: { gas: 40 }, t: 2 }],
  electro: [{ in: {}, fin: { water: 40 }, fout: { hydrogen: 40 }, t: 1 }],
  digest: ['berries', 'mushroom', 'kelp', 'cactus', 'herbs', 'petals', 'coconut', 'meat', 'fish', 'peat', 'reeds', 'glowcap', 'honeycomb'].map(id => ({ in: { [id]: 1 }, fout: { gas: id === 'peat' || id === 'meat' ? 60 : 30 }, t: 2 })),
};
const MACHINE_NAME = { furnace: 'Horno', millstone: 'Muela', crusher: 'Ruedas trituradoras', saw: 'Sierra', press: 'Prensa', lathe: 'Torno', wiremill: 'Trefiladora', mixer: 'Mezcladora', blast: 'Alto horno', vulcan: 'Vulcanizadora', refinery: 'Refinería', electro: 'Electrolizador', digest: 'Biodigestor' };
// Objetos que cada máquina acepta (precalculado)
const MACHINE_INPUTS = {};
for (const k in RECIPES) { const s = new Set(); for (const r of RECIPES[k]) for (const i in r.in) s.add(i); MACHINE_INPUTS[k] = s; }

// ---------- Banco de ensamblaje ----------
// Un núcleo central + hasta 6 dientes alrededor. El orden de los dientes no importa:
// cuenta qué hay y cuántos. Las recetas avanzadas exigen RPM mínimas en el banco.
// Catalizador opcional: redstone acelera ×2 (1 cada 4 fabricaciones). Algunas lo exigen.
const BENCH = [];
function R(out, n, core, teeth, rpm = 0, tier, cat) {
  const list = [];
  if (teeth) for (const p of teeth.split(',')) { const [id, c] = p.split('*'); for (let i = 0; i < (+c || 1); i++) list.push(id); }
  list.sort();
  BENCH.push({ out, n, core, teeth: list, rpm, tier: tier ?? (BD[out] ? BD[out].tier || 0 : 0), cat: cat || null, key: core + '|' + list.join(',') });
}
// Materiales
R('planks', 4, 'log', '');
R('andesite', 2, 'ironIngot', 'stone*2');
R('cog', 2, 'andesite', 'planks');
R('largeCog', 1, 'cog', 'planks*2');
R('circuit', 2, 'copperSheet', 'redstone,coil,rubber', 16, 3);
R('precision', 1, 'brassSheet', 'cog*2,ironRod,circuit', 64, 4, 'redstone');
R('batteryCell', 2, 'zincIngot', 'copperSheet,redstone,plastic', 32, 4);
// Cinética
R('shaft', 4, 'andesite', '');
R('gearbox', 1, 'cog', 'andesite*2');
R('clutch', 1, 'shaft', 'andesite,redstone');
R('brake', 1, 'shaft', 'planks,ironIngot');
R('speedometer', 1, 'cog', 'redstone,glass');
R('stressometer', 1, 'cog', 'redstone,glass,ironIngot');
R('doubler', 1, 'gearbox', 'largeCog,cog', 16);
R('speedctl', 1, 'gearbox', 'cog,largeCog,redstone', 16);
// Generadores
R('crank', 1, 'cog', 'planks');
R('waterwheel', 1, 'largeCog', 'planks*3');
R('windmill', 1, 'largeCog', 'planks*5,andesite', 16);
R('steam', 1, 'largeCog', 'ironSheet*3,copperSheet*2,stone', 32);
R('emotor', 1, 'coil', 'coil,ironSheet,cog,ironRod', 32);
// Procesado
R('bench', 1, 'cog', 'planks*2,stone');
R('drill', 1, 'andesite', 'ironIngot*2,cog');
R('furnace', 1, 'stone', 'stone*2,coal');
R('millstone', 1, 'cog', 'stone*3');
R('saw', 1, 'cog', 'ironIngot*2');
R('press', 1, 'andesite', 'ironIngot*4,cog', 16);
R('lathe', 1, 'cog', 'ironIngot*2,andesite', 16);
R('wiremill', 1, 'cog', 'copperIngot*2,andesite', 16);
R('mixer', 1, 'cog', 'ironSheet*2,copperIngot', 16);
R('crusher', 1, 'largeCog', 'ironSheet*2,stone*2', 32);
R('efurnace', 1, 'furnace', 'coil*2,ironSheet', 16);
R('blastFurnace', 1, 'efurnace', 'ironSheet*3,stone*2', 32);
R('vulcanizer', 1, 'furnace', 'coil,ironSheet*2', 16);
R('treetap', 1, 'ironRod', 'planks,pipe');
R('assembler', 1, 'bench', 'circuit*2,ironRod*2,brassSheet', 32);
// Logística
R('belt', 4, 'planks', 'andesite');
R('brassBelt', 4, 'rubber', 'brass', 16);
R('chest', 1, 'planks', 'planks*3');
R('vault', 1, 'chest', 'ironSheet*4', 16);
R('depot', 1, 'ironSheet', 'andesite');
R('extractor', 2, 'andesite', 'planks*2');
R('splitter', 1, 'andesite', 'planks*2,ironIngot');
R('sorter', 1, 'splitter', 'redstone,ironSheet');
R('trash', 1, 'ironIngot', 'coal');
R('arm', 1, 'cog', 'ironRod*2,ironSheet,redstone', 16);
R('ejector', 1, 'cog', 'ironSheet*2,planks', 16);
// Energía
R('cableCu', 8, 'coil', '');
R('cableRub', 8, 'coil', 'rubber');
R('cableBr', 8, 'brassSheet', 'rubber*2', 16);
R('pswitch', 1, 'lever', 'coil');
R('dynamo', 1, 'cog', 'coil*2,ironSheet', 16);
R('solar', 1, 'silicon', 'glass*2,coil,ironSheet', 32);
R('combGen', 1, 'furnace', 'coil,ironSheet,copperSheet', 16);
R('turbine', 1, 'largeCog', 'steel*2,coil*2', 32);
R('gasGen', 1, 'combGen', 'steel*2,circuit', 32);
R('battery', 1, 'copperSheet', 'zincIngot*2,redstone*2', 16);
R('bigBattery', 1, 'battery', 'batteryCell*4', 32);
R('capacitor', 1, 'copperSheet', 'glass,redstone');
R('diode', 1, 'redstone', 'copperSheet,coil');
R('pmeter', 1, 'coil', 'redstone,glass');
R('elamp', 2, 'glass', 'coil,glass');
// Fluidos
R('pipe', 8, 'copperSheet', '');
R('valve', 1, 'pipe', 'redstone,ironSheet');
R('mpump', 1, 'cog', 'pipe*2,ironSheet', 16);
R('epump', 1, 'mpump', 'coil,circuit', 16);
R('derrick', 1, 'drill', 'steel*2,pipe*2', 32);
R('gasx', 1, 'epump', 'steel,pipe', 32);
R('tank', 1, 'ironSheet', 'ironSheet*4,glass', 16);
R('gastank', 1, 'tank', 'steel*4', 32);
R('boiler', 1, 'furnace', 'pipe*2,copperSheet*2', 16);
R('refinery', 1, 'tank', 'steel*2,circuit,pipe*2', 32);
R('electrolyzer', 1, 'tank', 'coil*2,copperSheet,circuit', 32);
R('drain', 1, 'pipe', 'stone*2');
R('levelSensor', 1, 'pipe', 'redstone,glass');
// Lógica
R('lever', 1, 'stone', 'redstone');
R('button', 2, 'stone', '');
R('plate', 1, 'planks', 'planks');
R('wire', 8, 'redstone', '');
R('wirebridge', 2, 'redstone', 'stone*3');
R('lamp', 1, 'glass', 'redstone');
R('display', 1, 'glass', 'redstone*2,copperSheet');
R('inverter', 1, 'redstone', 'stone,redstone');
R('andgate', 1, 'redstone', 'stone*2,redstone');
R('orgate', 1, 'redstone', 'stone*2');
R('xorgate', 1, 'redstone', 'stone*3,redstone');
R('repeater', 1, 'redstone', 'stone,redstone*2');
R('flipflop', 1, 'redstone', 'redstone*2,ironIngot');
R('counter', 1, 'redstone', 'redstone,ironIngot,cog');
R('comparator', 1, 'redstone', 'redstone*3,stone');
R('clock', 1, 'redstone', 'andesite,redstone*2');
R('observer', 1, 'redstone', 'ironSheet,stone');
R('stockpile', 1, 'redstone', 'ironSheet,copperIngot');
R('transmitter', 1, 'redstone', 'ironRod,copperSheet');
R('receiver', 1, 'redstone', 'ironRod,ironSheet');
R('daysensor', 1, 'glass', 'redstone,planks');
// Biomas: bloques y recetas alternativas con los recursos nuevos
R('trap', 1, 'planks', 'andesite,cog');
R('beehive', 1, 'planks', 'planks*2,petals');
R('digester', 1, 'ironSheet', 'pipe*2,clay', 16);
R('geotherm', 1, 'obsidian', 'coil*2,ironSheet,pipe', 16);
R('planks', 2, 'bamboo', '');
R('belt', 6, 'hide', 'andesite');
R('cableRub', 8, 'coil', 'wool');
R('circuit', 3, 'copperSheet', 'goldIngot,redstone', 16, 2);
R('solar', 1, 'crystal', 'glass*2,coil,ironSheet', 32);
R('lamp', 2, 'glowcap', 'glass');
R('furnace', 1, 'brick', 'brick*2,coal');
R('chest', 1, 'bamboo', 'bamboo*3');
R('battery', 1, 'copperSheet', 'zincIngot,venom,redstone*2', 16);
R('precision', 1, 'brassSheet', 'cog*2,ironRod,circuit,crystal', 64, 4);

const BENCH_MAP = new Map();
for (const r of BENCH) { if (BENCH_MAP.has(r.key)) console.warn('Receta duplicada', r.key); BENCH_MAP.set(r.key, r); }
const RECIPE_FOR = {}; for (const r of BENCH) if (!RECIPE_FOR[r.out]) RECIPE_FOR[r.out] = r; // la receta principal es la primera
function benchMatch(core, teeth) {
  if (!core) return null;
  const k = core + '|' + teeth.slice().sort().join(',');
  return BENCH_MAP.get(k) || null;
}
const pocketOK = r => r.rpm === 0 && r.teeth.length <= 3 && !r.cat;

// ---------- Niveles ----------
const TIERS = [
  { n: 'Nivel 1 · Andesita', goal: { ironIngot: 20, andesite: 16, planks: 40 } },
  { n: 'Nivel 2 · Metalurgia', goal: { ironSheet: 30, copperIngot: 30, zincIngot: 20, coil: 20 } },
  { n: 'Nivel 3 · Electricidad', goal: { brass: 40, ironRod: 30, glass: 20, copperSheet: 30 } },
  { n: 'Nivel 4 · Química', goal: { steel: 30, rubber: 30, circuit: 20 } },
  { n: 'Nivel 5 · Precisión', goal: { plastic: 50, precision: 20, batteryCell: 20 } },
];
const unlocksOf = i => Object.keys(BD).filter(k => (BD[k].tier || 0) === i + 1);
const itemTier = id => BD[id] ? BD[id].tier || 0 : (RECIPE_FOR[id] ? RECIPE_FOR[id].tier : 0);
