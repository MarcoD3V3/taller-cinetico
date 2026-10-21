'use strict';
// =====================================================================================
//  Sistema de materiales. Cada material existe en 16 formas y todas se conectan con
//  máquinas reales: mena → triturado → lavado → lingote, lingote → lámina → engranaje…
//  Las aleaciones salen del horno de aleación; los materiales exóticos, de la forja arcana.
// =====================================================================================
ICATS.push('Piezas', 'Química', 'Electrónica', 'Exótico', 'Herramientas', 'Fantasía', 'Armas'); // categorías 5-11
const FORMS = {
  ingot: { n: 'Lingote de %', s: 'ingot' }, dust: { n: 'Polvo de %', s: 'dust' }, nugget: { n: 'Pepita de %', s: 'nugget' },
  plate: { n: 'Lámina de %', s: 'sheet' }, doublePlate: { n: 'Lámina doble de %', s: 'dsheet' }, foil: { n: 'Papel de %', s: 'foil' },
  rod: { n: 'Varilla de %', s: 'rod' }, longRod: { n: 'Varilla larga de %', s: 'lrod' }, bolt: { n: 'Perno de %', s: 'bolt' },
  screw: { n: 'Tornillo de %', s: 'screw' }, ring: { n: 'Anillo de %', s: 'ring' }, spring: { n: 'Muelle de %', s: 'spring' },
  gear: { n: 'Engranaje de %', s: 'cog' }, smallGear: { n: 'Engranaje pequeño de %', s: 'scog' }, wire: { n: 'Cable fino de %', s: 'coil' },
  block: { n: 'Bloque de %', s: 'block' },
};
const FORM_HOW = {
  ingot: 'Fundiendo su polvo, triturado o mena.', dust: 'Pulverizando lingotes o láminas.', nugget: 'Fundiendo menas lavadas. 9 pepitas = 1 lingote (compactadora).',
  plate: 'Lingote en la prensa.', doublePlate: '2 láminas en la dobladora.', foil: 'Lámina en la laminadora.', rod: 'Lingote en el torno.',
  longRod: '2 varillas en la soldadora.', bolt: 'Varilla en la cortadora.', screw: 'Perno en el torno.', ring: 'Varilla en la dobladora.',
  spring: '2 cables finos en la dobladora.', gear: '4 láminas en la prensa de engranajes.', smallGear: 'Lámina en la cortadora.',
  wire: 'Lingote en la trefiladora.', block: '9 lingotes en la compactadora.',
};
// k: metal (tiene mena) · alloy · exotic · h: dureza (herramientas) · has: formas que ya existían
const MATS = [
  { id: 'iron', n: 'hierro', c: '#d8d8d8', k: 'metal', h: 2, ore: 'ironOre', crushed: 'crushedIron', has: { ingot: 'ironIngot', plate: 'ironSheet', rod: 'ironRod' } },
  { id: 'copper', n: 'cobre', c: '#e8894e', k: 'metal', h: 1, ore: 'copperOre', crushed: 'crushedCopper', has: { ingot: 'copperIngot', plate: 'copperSheet', wire: 'coil' } },
  { id: 'zinc', n: 'zinc', c: '#b9e0d6', k: 'metal', h: 1, ore: 'zincOre', crushed: 'crushedZinc', has: { ingot: 'zincIngot' } },
  { id: 'gold', n: 'oro', c: '#ffd34a', k: 'metal', h: 1, ore: 'goldOre', crushed: 'crushedGold', has: { ingot: 'goldIngot' } },
  { id: 'tin', n: 'estaño', c: '#c8ccd4', k: 'metal', h: 1, oreN: 'Casiterita', dot: '#e0e4ec' },
  { id: 'lead', n: 'plomo', c: '#7a7a96', k: 'metal', h: 1, oreN: 'Galena', dot: '#9a9ab8' },
  { id: 'silver', n: 'plata', c: '#e8eef4', k: 'metal', h: 2, oreN: 'Mena de plata', dot: '#f4f8ff' },
  { id: 'nickel', n: 'níquel', c: '#cfd8b0', k: 'metal', h: 2, oreN: 'Pentlandita', dot: '#d8e0a0' },
  { id: 'aluminum', n: 'aluminio', c: '#dfe6ec', k: 'metal', h: 2, oreN: 'Bauxita', dot: '#d88a5a' },
  { id: 'titanium', n: 'titanio', c: '#9aa6b8', k: 'metal', h: 4, oreN: 'Rutilo', dot: '#8a6aa0' },
  { id: 'tungsten', n: 'wolframio', c: '#5a5e66', k: 'metal', h: 5, oreN: 'Wolframita', dot: '#2a2e36' },
  { id: 'platinum', n: 'platino', c: '#e4e8f0', k: 'metal', h: 3, oreN: 'Mena de platino', dot: '#ffffff' },
  { id: 'uranium', n: 'uranio', c: '#7ae05a', k: 'metal', h: 3, oreN: 'Uraninita', dot: '#7aff4a' },
  { id: 'lithium', n: 'litio', c: '#f0d0e0', k: 'metal', h: 1, oreN: 'Espodumena', dot: '#ffb0d8' },
  { id: 'cobalt', n: 'cobalto', c: '#3a5ad8', k: 'metal', h: 3, oreN: 'Cobaltita', dot: '#4a6aff' },
  { id: 'chromium', n: 'cromo', c: '#c8d8e0', k: 'metal', h: 3, oreN: 'Cromita', dot: '#3a3a3a' },
  { id: 'brass', n: 'latón', c: '#e8c24a', k: 'alloy', h: 2, has: { ingot: 'brass', plate: 'brassSheet' } },
  { id: 'bronze', n: 'bronce', c: '#c8843a', k: 'alloy', h: 2, mix: { copper: 3, tin: 1 }, out: 4 },
  { id: 'steel', n: 'acero', c: '#7f8a96', k: 'alloy', h: 3, has: { ingot: 'steel' }, mix: { iron: 1, coal: 1 }, out: 1 },
  { id: 'stainless', n: 'acero inoxidable', c: '#b8c4cc', k: 'alloy', h: 4, mix: { steel: 2, chromium: 1, nickel: 1 }, out: 4 },
  { id: 'invar', n: 'invar', c: '#a8b0a0', k: 'alloy', h: 3, mix: { iron: 2, nickel: 1 }, out: 3 },
  { id: 'electrum', n: 'electro', c: '#f0e080', k: 'alloy', h: 1, mix: { gold: 1, silver: 1 }, out: 2 },
  { id: 'solder', n: 'estaño de soldar', c: '#a0a4b0', k: 'alloy', h: 1, mix: { tin: 1, lead: 1 }, out: 2 },
  { id: 'constantan', n: 'constantán', c: '#d8a070', k: 'alloy', h: 2, mix: { copper: 1, nickel: 1 }, out: 2 },
  { id: 'duralumin', n: 'duraluminio', c: '#c8d0d8', k: 'alloy', h: 3, mix: { aluminum: 3, copper: 1 }, out: 4 },
  { id: 'orichalcum', n: 'oricalco', c: '#ff9a4a', k: 'exotic', h: 5 },
  { id: 'etherium', n: 'eterio', c: '#9ae8ff', k: 'exotic', h: 4 },
  { id: 'voidsteel', n: 'acero del vacío', c: '#3a2a5a', k: 'exotic', h: 6 },
  { id: 'kinetite', n: 'cinetita', c: '#ffd84a', k: 'exotic', h: 4 },
  { id: 'luminite', n: 'luminita', c: '#c8fff0', k: 'exotic', h: 3 },
  { id: 'aetherium', n: 'aetherio', c: '#f0e8ff', k: 'exotic', h: 5 },
  { id: 'cryonite', n: 'crionita', c: '#8ad8ff', k: 'exotic', h: 4 },
  { id: 'ignitite', n: 'ignitita', c: '#ff5a2a', k: 'exotic', h: 5 },
  { id: 'chronium', n: 'cronio', c: '#e0c8ff', k: 'exotic', h: 6 },
  // Fantasía: metales con mena en biomas raros y aleaciones arcanas (fan: categoría Fantasía)
  { id: 'mithril', n: 'mithril', c: '#bfe8ff', k: 'metal', h: 5, oreN: 'Mena de mithril', dot: '#c8f4ff', fan: 1 },
  { id: 'adamantite', n: 'adamantita', c: '#d0405e', k: 'metal', h: 6, oreN: 'Mena de adamantita', dot: '#ff3a6a', fan: 1 },
  { id: 'arcanite', n: 'arcanita', c: '#9a5aff', k: 'metal', h: 4, oreN: 'Mena de arcanita', dot: '#b880ff', fan: 1 },
  { id: 'starsilver', n: 'plata estelar', c: '#eef2ff', k: 'metal', h: 4, oreN: 'Mena estelar', dot: '#fff6b0', fan: 1 },
  { id: 'runesteel', n: 'acero rúnico', c: '#5a7ab8', k: 'alloy', h: 5, mix: { steel: 2, arcanite: 1 }, out: 2, fan: 1 },
  { id: 'dragonsteel', n: 'acero dracónico', c: '#b83a2a', k: 'alloy', h: 7, mix: { adamantite: 2, ignitite: 1 }, out: 2, fan: 1 },
  { id: 'elvensilver', n: 'plata élfica', c: '#d8ffe8', k: 'alloy', h: 4, mix: { mithril: 1, silver: 1 }, out: 2, fan: 1 },
  { id: 'dwarvensteel', n: 'acero enano', c: '#8a6a4a', k: 'alloy', h: 6, mix: { adamantite: 1, steel: 2, coal: 1 }, out: 3, fan: 1 },
];
const cap = s => s[0].toUpperCase() + s.slice(1);
const MF = {};        // MF[material][forma] = id del objeto
const MAT_BY = {};
for (const m of MATS) {
  MAT_BY[m.id] = m; MF[m.id] = {};
  for (const f in FORMS) {
    const id = (m.has && m.has[f]) || (m.id + cap(f));
    MF[m.id][f] = id;
    if (!ITEMS[id]) ITEMS[id] = { n: FORMS[f].n.replace('%', m.n), c: m.c, s: FORMS[f].s, cat: m.fan ? 10 : m.k === 'exotic' ? 8 : (f === 'ingot' || f === 'dust' || f === 'nugget' || f === 'block' ? 1 : 5), d: FORM_HOW[f], mat: m.id, form: f };
  }
  if (m.k === 'metal') {
    m.oreId = m.ore || m.id + 'Ore'; m.crushedId = m.crushed || 'crushed' + cap(m.id); m.purId = 'purified' + cap(m.id);
    if (!ITEMS[m.oreId]) ITEMS[m.oreId] = { n: m.oreN, c: m.dot, s: 'ore', cat: 0, d: `Mena de ${m.n}. Tritúrala para sacar el doble.` };
    if (!ITEMS[m.crushedId]) ITEMS[m.crushedId] = { n: `${cap(m.n)} triturado`, c: m.c, s: 'dust', cat: 1, d: 'Lávalo en la lavadora de menas o fúndelo.' };
    ITEMS[m.purId] = { n: `${cap(m.n)} lavado`, c: m.c, s: 'gem', cat: 1, d: 'Fúndelo: 1 lingote y 3 pepitas.' };
  }
}
// ---------- Recetas de máquinas generadas ----------
function addRec(machine, r) { const L2 = RECIPES[machine] = RECIPES[machine] || []; const k = JSON.stringify(r.in) + JSON.stringify(r.fin || {}); if (!L2.some(x => JSON.stringify(x.in) + JSON.stringify(x.fin || {}) === k)) L2.push(r); }
for (const m of MATS) {
  const F = MF[m.id];
  addRec('furnace', { in: { [F.dust]: 1 }, out: { [F.ingot]: 1 }, t: 2 });
  if (m.k === 'metal') {
    addRec('millstone', { in: { [m.oreId]: 1 }, out: { [m.crushedId]: 2 }, t: 3 });
    addRec('crusher', { in: { [m.oreId]: 1 }, out: { [m.crushedId]: 2 }, t: 1 });
    addRec('furnace', { in: { [m.crushedId]: 1 }, out: { [F.ingot]: 1 }, t: 2 });
    addRec('furnace', { in: { [m.oreId]: 1 }, out: { [F.ingot]: 1 }, t: 2 });
    addRec('furnace', { in: { [m.purId]: 1 }, out: { [F.ingot]: 1, [F.nugget]: 3 }, t: 2 });
    addRec('orewasher', { in: { [m.crushedId]: 1 }, fin: { water: 40 }, out: { [m.purId]: 1 }, t: 1.5 });
    addRec('pulverizer', { in: { [m.oreId]: 1 }, out: { [m.crushedId]: 2, [F.dust]: 1 }, t: 1.5 });
  }
  addRec('pulverizer', { in: { [F.ingot]: 1 }, out: { [F.dust]: 1 }, t: 1 });
  addRec('pulverizer', { in: { [F.plate]: 1 }, out: { [F.dust]: 1 }, t: 1 });
  addRec('press', { in: { [F.ingot]: 1 }, out: { [F.plate]: 1 }, t: 1.5 });
  addRec('lathe', { in: { [F.ingot]: 1 }, out: { [F.rod]: 2 }, t: 1.5 });
  addRec('lathe', { in: { [F.bolt]: 1 }, out: { [F.screw]: 1 }, t: 0.8 });
  addRec('wiremill', { in: { [F.ingot]: 1 }, out: { [F.wire]: 2 }, t: 1.5 });
  addRec('bender', { in: { [F.plate]: 2 }, out: { [F.doublePlate]: 1 }, t: 1.5 });
  addRec('bender', { in: { [F.rod]: 1 }, out: { [F.ring]: 1 }, t: 1 });
  addRec('bender', { in: { [F.wire]: 2 }, out: { [F.spring]: 1 }, t: 1 });
  addRec('rolling', { in: { [F.plate]: 1 }, out: { [F.foil]: 4 }, t: 1.2 });
  addRec('cutter', { in: { [F.rod]: 1 }, out: { [F.bolt]: 4 }, t: 1 });
  addRec('cutter', { in: { [F.plate]: 1 }, out: { [F.smallGear]: 2 }, t: 1 });
  addRec('cutter', { in: { [F.block]: 1 }, out: { [F.ingot]: 9 }, t: 2 });
  addRec('gearpress', { in: { [F.plate]: 4 }, out: { [F.gear]: 1 }, t: 2 });
  addRec('welder', { in: { [F.rod]: 2 }, out: { [F.longRod]: 1 }, t: 1.5 });
  addRec('compactor', { in: { [F.nugget]: 9 }, out: { [F.ingot]: 1 }, t: 1 });
  addRec('compactor', { in: { [F.ingot]: 9 }, out: { [F.block]: 1 }, t: 2 });
  if (m.mix) {
    const ins = {}, dins = {};
    for (const k in m.mix) { ins[MF[k] ? MF[k].ingot : k] = m.mix[k]; dins[MF[k] ? MF[k].dust : k] = m.mix[k]; }
    addRec('alloy', { in: ins, out: { [F.ingot]: m.out }, t: 3 });
    addRec('alloy', { in: dins, out: { [F.ingot]: m.out + 1 }, t: 2.5 }); // el polvo rinde más
  }
}
// ---------- Banco: recetas generadas (sin choques de clave) ----------
function R2(out, n, core, teeth, rpm = 0, tier, cat) {
  const list = []; if (teeth) for (const p of teeth.split(',')) { const [id, c] = p.split('*'); for (let i = 0; i < (+c || 1); i++) list.push(id); }
  list.sort(); const key = core + '|' + list.join(',');
  if (BENCH_MAP.has(key)) return null;
  const r = { out, n, core, teeth: list, rpm, tier: tier ?? (BD[out] ? BD[out].tier || 0 : 0), cat: cat || null, key };
  BENCH.push(r); BENCH_MAP.set(key, r); if (!RECIPE_FOR[out]) RECIPE_FOR[out] = r; return r;
}
// ---------- Herramientas ----------
// Pico: menas y roca · Hacha: árboles y plantas · Martillo: pica en 3×3
const TOOLS = {};
for (const mid of ['iron', 'copper', 'tin', 'bronze', 'steel', 'gold', 'silver', 'titanium', 'tungsten', 'stainless', 'orichalcum', 'voidsteel']) {
  const m = MAT_BY[mid], F = MF[mid], mult = 1.5 + m.h * 0.7;
  for (const [kind, nm, teeth] of [['pick', 'Pico', 3], ['axe', 'Hacha', 2], ['hammer', 'Martillo', 4]]) {
    const id = mid + cap(kind === 'pick' ? 'pickaxe' : kind);
    ITEMS[id] = { n: `${nm} de ${m.n}`, c: m.c, s: kind, cat: 9, d: kind === 'pick' ? `Pica roca y menas ×${mult.toFixed(1)} más rápido.` : kind === 'axe' ? `Tala y corta plantas ×${mult.toFixed(1)} más rápido.` : `Pica 3×3 casillas de roca a la vez (×${(mult * 0.6).toFixed(1)}).`, tool: { kind, mult } };
    TOOLS[id] = { kind, mult };
    R2(id, 1, 'stick', `${F.ingot}*${teeth}`);
  }
}
