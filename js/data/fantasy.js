'use strict';
// =====================================================================================
//  Fantasía, arcano y magia: gemas, hierbas mágicas, restos de criaturas, alquimia,
//  runas, pergaminos, 3 máquinas arcanas, más de 70 armas y más de 50 herramientas.
//  Todo se encadena con lo anterior: las menas de fantasía salen solo en biomas raros,
//  las pociones usan hierbas de biomas concretos y las armas usan aleaciones arcanas.
// =====================================================================================
const F_CAT = 10, W_CAT = 11;

// ---------- Gemas (en bruto → talladas en el grabador láser) ----------
const GEMS = [
  ['ruby', 'Rubí', 'Rubí tallado', '#e0203a'], ['sapphire', 'Zafiro', 'Zafiro tallado', '#2a5aff'], ['emerald', 'Esmeralda', 'Esmeralda tallada', '#20c860'],
  ['amethystGem', 'Amatista', 'Amatista tallada', '#a050e0'], ['topaz', 'Topacio', 'Topacio tallado', '#ffb020'], ['onyx', 'Ónice', 'Ónice tallado', '#2a2a34'],
  ['opal', 'Ópalo', 'Ópalo tallado', '#e0f0ff'], ['moonstone', 'Piedra lunar', 'Piedra lunar tallada', '#c8d8ff'], ['sunstone', 'Piedra solar', 'Piedra solar tallada', '#ffa040'],
  ['dragonEye', 'Ojo de dragón', 'Ojo de dragón tallado', '#ff4a10'],
];
for (const [id, n, cut, c] of GEMS) {
  IT(id, n + ' en bruto', c, 'gem', F_CAT, 'Gema sin tallar. Tállala en el grabador láser.');
  IT(id + 'Cut', cut, c, 'gem', F_CAT, 'Gema tallada: núcleo de armas legendarias, encantamientos y joyas mágicas.');
  RM('laserEngraver', { [id]: 1 }, { [id + 'Cut']: 1 }, 3);
}

// ---------- Hierbas mágicas (cada una crece en su bioma) ----------
const HERBS = [
  ['mandrake', 'Raíz de mandrágora', '#c8a070', 'Bosques oscuros y pantanos.'], ['nightshade', 'Belladona', '#6a3aa8', 'Bosques oscuros y pantanos tóxicos.'],
  ['moonflower', 'Flor lunar', '#e0e8ff', 'Praderas alpinas y cerezos. Brilla de noche.'], ['fireblossom', 'Flor de fuego', '#ff6a2a', 'Volcanes y llanuras de ceniza.'],
  ['frostleaf', 'Hoja de escarcha', '#9ae8ff', 'Tundras y picos de hielo.'], ['ghostcap', 'Seta espectral', '#e8f4ff', 'Islas de setas y bosques oscuros.'],
  ['dreamroot', 'Raíz onírica', '#d080ff', 'Selvas y bosques de bambú.'], ['starlily', 'Lirio estelar', '#fff4a0', 'Campos de flores y cerezos.'],
  ['bloodthorn', 'Espino sangriento', '#c8203a', 'Tierras baldías y pantanos tóxicos.'], ['sunpetal', 'Pétalo solar', '#ffd040', 'Desiertos y sabanas.'],
];
for (const [id, n, c, d] of HERBS) { IT(id, n, c, 'herb', F_CAT, 'Hierba mágica. ' + d + ' Se multiplica en el invernadero.'); RM('grower', { [id]: 1, fertilizer: 1 }, { [id]: 3 }, 8, { water: 40 }); }

// ---------- Restos de criaturas fantásticas ----------
IT('wispEssence', 'Esencia de fuego fatuo', '#9af0ff', 'drop', F_CAT, 'De los fuegos fatuos de pantanos y bosques oscuros.');
IT('frostFang', 'Colmillo de escarcha', '#cfe8ff', 'fang', F_CAT, 'Del lobo de escarcha.');
IT('basiliskEye', 'Ojo de basilisco', '#e0d040', 'eye', F_CAT, 'Del basilisco. Todavía mira.');
IT('griffinFeather', 'Pluma de grifo', '#c8a060', 'feather', F_CAT, 'Del grifo de las praderas altas.');
IT('drakeScale', 'Escama de draco', '#a83a2a', 'scale', F_CAT, 'Del draco volcánico. Resiste el fuego.');
IT('unicornHorn', 'Cuerno de unicornio', '#f8f4ff', 'fang', F_CAT, 'Del unicornio de los cerezos.');
IT('shadowPelt', 'Piel sombría', '#2a2238', 'sheet', F_CAT, 'Del gato sombrío.');
IT('golemCore', 'Núcleo de gólem', '#9a8ab8', 'orb', F_CAT, 'Corazón de piedra viva del gólem de cristal.');
IT('phoenixFeather', 'Pluma de fénix', '#ff7a2a', 'feather', F_CAT, 'Del fénix. Rarísima.');
IT('slimeGel', 'Gel arcano', '#7af0a0', 'drop', F_CAT, 'Del limo arcano.');
IT('cookedMeat', 'Carne asada', '#a0603a', 'drop', 3, 'Carne cocinada en el horno (o cazada con un arma de fuego).');
RM('furnace', { meat: 1 }, { cookedMeat: 1 }, 1.5);

// ---------- Fuentes de gemas ----------
RM('centrifuge', { '@adamantite.dust': 4 }, { ruby: 1 }, 5);
RM('centrifuge', { '@mithril.dust': 4 }, { sapphire: 1 }, 5);
RM('centrifuge', { '@starsilver.dust': 4 }, { emerald: 1 }, 5);
RM('centrifuge', { '@arcanite.dust': 4 }, { amethystGem: 1 }, 5);
RM('centrifuge', { sand: 16 }, { topaz: 1, quartz: 2 }, 6);
RM('pulverizer', { basalt: 6 }, { onyx: 1, gravel: 3 }, 3);
RM('centrifuge', { salt: 8 }, { opal: 1 }, 6, { water: 200 });
RM('arcaneForge', { crystal: 2, essenceFrost: 1, moonflower: 1 }, { moonstone: 1 }, 4);
RM('arcaneForge', { crystal: 2, essenceFire: 1, sunpetal: 1 }, { sunstone: 1 }, 4);
RM('arcaneForge', { ruby: 2, drakeScale: 2, essenceFire: 1 }, { dragonEye: 1 }, 6);

// ---------- Componentes arcanos ----------
IT('vial', 'Frasco', '#e0f0ff', 'potion', F_CAT, 'Frasco de vidrio para pociones.');
IT('manaDust', 'Polvo de maná', '#6a8aff', 'dust', F_CAT, 'Energía mágica molida.');
IT('manaCrystal', 'Cristal de maná', '#4a6aff', 'gem', F_CAT, '9 polvos de maná compactados.');
IT('fairyDust', 'Polvo de hada', '#ffc8f0', 'dust', F_CAT, 'Lirios estelares molidos.');
IT('ectoplasm', 'Ectoplasma', '#c8ffe0', 'drop', F_CAT, 'Esencia de fuego fatuo centrifugada.');
IT('soulGemEmpty', 'Gema de alma vacía', '#c8c8e0', 'gem', F_CAT, 'Espera un alma que guardar.');
IT('soulGem', 'Gema de alma', '#a050ff', 'gem', F_CAT, 'Gema con un espíritu dentro.');
IT('enchantedCloth', 'Tela encantada', '#8a6aff', 'sheet', F_CAT, 'Tela impregnada de maná.');
IT('mithrilThread', 'Hilo de mithril', '#bfe8ff', 'coil', F_CAT, 'Ligero e irrompible.');
IT('runicCircuit', 'Circuito rúnico', '#5a7ab8', 'chip', F_CAT, 'Electrónica y runas en una sola placa.');
IT('philosopherStone', 'Piedra filosofal', '#ff2a4a', 'gem', F_CAT, 'La meta de todo alquimista.');
IT('dragonHeart', 'Corazón de dragón', '#ff4a10', 'orb', F_CAT, 'Todavía late.');
IT('arcaneCore', 'Núcleo arcano', '#6a4aff', 'block', F_CAT, 'El corazón de las armas y herramientas mágicas.');
IT('wardstone', 'Piedra de guarda', '#8a8aa0', 'block', F_CAT, 'Runa de protección grabada en ónice.');
IT('holyWater', 'Agua bendita', '#f0f8ff', 'potion', F_CAT, 'Agua tocada por un cuerno de unicornio.');
RM('cutter', { glass: 1 }, { vial: 2 }, 1);
RM('millstone', { moonflower: 1 }, { manaDust: 2 }, 2);
RM('pulverizer', { amethystGem: 1 }, { manaDust: 4 }, 1.5);
RM('distiller', { ghostcap: 2 }, { manaDust: 3 }, 3);
RM('compactor', { manaDust: 9 }, { manaCrystal: 1 }, 2);
RM('millstone', { starlily: 1 }, { fairyDust: 2 }, 2);
RM('centrifuge', { wispEssence: 2 }, { ectoplasm: 3 }, 3);
RM('arcaneForge', { amethystGem: 1, '@starsilver.ingot': 1 }, { soulGemEmpty: 1 }, 4);
RM('loom', { '@mithril.wire': 2 }, { mithrilThread: 2 }, 2);
RM('circuitFab', { goodCircuit: 1, runeMind: 1, '@runesteel.foil': 2 }, { runicCircuit: 1 }, 5);
RM('arcaneForge', { soulGem: 1, [MF.gold.block]: 1, ruby: 2, essenceLife: 2 }, { philosopherStone: 1 }, 10);
RM('arcaneForge', { dragonEye: 1, drakeScale: 4, phoenixFeather: 1 }, { dragonHeart: 1 }, 10);
// La piedra filosofal transmuta: plomo → oro (sin gastarse en el transmutador)
RM('transmuter', { philosopherStone: 1, [MF.lead.ingot]: 8 }, { philosopherStone: 1, goldIngot: 8 }, 6);

// ---------- Máquinas arcanas ----------
XB('alchemyTable', { n: 'Mesa de alquimia', cat: 2, machine: 'alchemy', dir: 1, inv: 1, rsable: 1, fl: { tanks: { w: 2000 }, in: { w: ['water', 'honey', 'ethanol'] } }, light: 1, tier: 4, d: 'Pociones, tinta arcana y agua bendita. Necesita agua.', look: { c: '#5a3a6a', g: '⚗', a: 'pulse' } });
XB('runeCarver', { n: 'Tallador de runas', cat: 2, machine: 'runecarve', kin: 'all', dir: 1, impact: 6, inv: 1, rsable: 1, tier: 4, d: 'Talla runas elementales sobre piedra (necesita rotación).', look: { c: '#6a6e76', g: 'ᚱ', a: 'spin' } });
XB('enchanter', { n: 'Altar de encantamiento', cat: 2, machine: 'enchant', dir: 1, inv: 1, rsable: 1, pw: { role: 'use', rate: 150, cap: 1500 }, light: 2, tier: 5, d: 'Grimorios, gemas de alma y telas encantadas (gasta energía).', look: { c: '#4a2a7a', g: '✧', a: 'glow' } });
RB('alchemyTable', 1, '@arcanite.plate', 'glass*2,planks*2', 0, 4);
RB('runeCarver', 1, '@steel.gear', 'stone*3,@arcanite.rod*2', 0, 4);
RB('enchanter', 1, 'manaCrystal', '@starsilver.plate*2,obsidian*2,amethystGemCut', 16, 5);

// ---------- Pociones (se beben con F; efectos temporales) ----------
const POTIONS = [
  ['potionSwift', 'Poción de presteza', '#5af0ff', 'swift', 120, 'Corres un 40 % más rápido durante 2 min.', { vial: 1, griffinFeather: 1, berries: 2 }],
  ['potionMiner', 'Poción de minero', '#ffb020', 'miner', 120, 'Picas y talas el doble de rápido durante 2 min.', { vial: 1, topaz: 1, mandrake: 1 }],
  ['potionNight', 'Poción de visión nocturna', '#c8d8ff', 'night', 240, 'Ves en la oscuridad durante 4 min.', { vial: 1, moonflower: 2, glowcap: 1 }],
  ['potionLuck', 'Poción de fortuna', '#20c860', 'luck', 180, '+50 % de probabilidad de doble botín al picar durante 3 min.', { vial: 1, emerald: 1, starlily: 1 }],
  ['potionHunter', 'Poción del cazador', '#c8203a', 'hunter', 180, 'Cazas un 60 % más rápido durante 3 min.', { vial: 1, bloodthorn: 2, frostFang: 1 }],
  ['potionChrono', 'Poción crónica', '#e0c8ff', 'chrono', 60, 'Presteza, minero y cazador a la vez durante 1 min.', { vial: 1, timeCrystal: 1, dreamroot: 1 }],
];
for (const [id, n, c, buff, t, d, ins] of POTIONS) { IT(id, n, c, 'potion', F_CAT, d + ' Bébela con F.'); ITEMS[id].use = { buff, t }; RM('alchemy', ins, { [id]: 1 }, 4, { water: 100 }); }
IT('arcaneInk', 'Tinta arcana', '#3a2a8a', 'drop', F_CAT, 'Para escribir pergaminos mágicos.');
RM('alchemy', { ink: 1, manaDust: 1 }, { arcaneInk: 2 }, 2, { water: 50 });
RM('alchemy', { vial: 4, unicornHorn: 1 }, { holyWater: 4 }, 5, { water: 200 });
RM('alchemy', { slimeGel: 2, fairyDust: 1 }, { manaDust: 3 }, 3, { water: 50 });
RM('alchemy', { nightshade: 2, venom: 1 }, { essenceVoid: 1 }, 4, { water: 50 });
RM('alchemy', { basiliskEye: 1, vial: 1 }, { essenceMind: 2 }, 4, { water: 50 });

// ---------- Runas ----------
IT('runeBlank', 'Runa en blanco', '#9aa0a8', 'rune', F_CAT, 'Piedra lisa lista para tallar.');
RM('runecarve', { stone: 4 }, { runeBlank: 1 }, 2);
RM('runecarve', { onyx: 1 }, { runeBlank: 4 }, 2);
const RUNES = [
  ['runeFire', 'Runa de fuego', '#ff6a1a', { essenceFire: 1, fireblossom: 1 }], ['runeFrost', 'Runa de escarcha', '#8ad8ff', { essenceFrost: 1, frostleaf: 1 }],
  ['runeStorm', 'Runa de tormenta', '#f0f05a', { essenceStorm: 1, griffinFeather: 1 }], ['runeLife', 'Runa de vida', '#7ae05a', { essenceLife: 1, mandrake: 1 }],
  ['runeVoid', 'Runa del vacío', '#7a4aff', { essenceVoid: 1, shadowPelt: 1 }], ['runeMind', 'Runa mental', '#e0a0ff', { essenceMind: 1, dreamroot: 1 }],
  ['runeEarth', 'Runa de tierra', '#c8843a', { '@adamantite.dust': 1, golemCore: 1 }], ['runeTime', 'Runa del tiempo', '#ffe0ff', { timeCrystal: 1, manaCrystal: 1 }],
];
for (const [id, n, c, ins] of RUNES) { IT(id, n, c, 'rune', F_CAT, 'Runa tallada. Da su elemento a armas y herramientas.'); RM('runecarve', { runeBlank: 1, ...ins }, { [id]: 1 }, 4); }
RM('runecarve', { runeBlank: 1, onyxCut: 1, holyWater: 1 }, { wardstone: 1 }, 6);

// ---------- Pergaminos y libros ----------
IT('parchment', 'Pergamino', '#e8dcb8', 'scroll', F_CAT, 'Cuero curtido muy fino.');
RM('tanner', { hide: 1 }, { parchment: 2 }, 2);
IT('scrollReturn', 'Pergamino de retorno', '#e0b54c', 'scroll', F_CAT, 'Léelo con F: te lleva al Núcleo. Se gasta.'); ITEMS.scrollReturn.use = { tp: 1 };
IT('scrollReveal', 'Pergamino revelador', '#5af0ff', 'scroll', F_CAT, 'Léelo con F: marca las menas a 20 casillas durante 90 s.'); ITEMS.scrollReveal.use = { buff: 'reveal', t: 90 };
IT('scrollWind', 'Pergamino del viento', '#c8f0ff', 'scroll', F_CAT, 'Léelo con F: presteza durante 5 min.'); ITEMS.scrollWind.use = { buff: 'swift', t: 300 };
IT('spellTome', 'Grimorio', '#5a2a6a', 'book', F_CAT, 'Libro de hechizos en blanco.');
IT('enchantedBook', 'Libro encantado', '#8a5aff', 'book', F_CAT, 'Saber arcano: ingrediente de las armas legendarias.');
RB('scrollReturn', 2, 'parchment', 'arcaneInk,wispEssence', 0, 4);
RB('scrollReveal', 2, 'parchment', 'arcaneInk,sapphire', 0, 4);
RB('scrollWind', 2, 'parchment', 'arcaneInk,griffinFeather', 0, 4);
RM('enchant', { parchment: 4, arcaneInk: 2, leather: 1 }, { spellTome: 1 }, 4);
RM('enchant', { spellTome: 1, manaCrystal: 1, runeMind: 1 }, { enchantedBook: 1 }, 6);
RM('enchant', { soulGemEmpty: 1, wispEssence: 2 }, { soulGem: 1 }, 5);
RM('enchant', { cloth: 1, manaDust: 2 }, { enchantedCloth: 1 }, 3);
RM('enchant', { '@arcanite.ingot': 1, manaDust: 4 }, { manaCrystal: 1 }, 4);
RB('arcaneCore', 1, 'manaCrystal', 'runicCircuit,@arcanite.plate*2,soulGem', 32, 5);

// ---------- Recetas de banco sin choques ----------
// Si la combinación ya existe, prueba con un diente extra (así ningún objeto queda sin receta)
function RX(out, core, teeth, rpm, tier) {
  for (const extra of ['', 'stick', 'leather', 'thread', 'manaDust']) {
    const t = teeth.concat(extra ? [extra] : []).filter(Boolean);
    if (t.length > 6) break;
    if (R2(out, 1, core, t.join(','), rpm, tier)) return true;
  }
  console.warn('Sin receta para', out); return false;
}
const MAT_T = { iron: 0, bronze: 1, copper: 0, tin: 0, steel: 2, silver: 2, gold: 1, tungsten: 4, titanium: 4, stainless: 4, mithril: 4, arcanite: 4, starsilver: 4, elvensilver: 4, adamantite: 5, runesteel: 5, dwarvensteel: 5, dragonsteel: 6, voidsteel: 6, orichalcum: 6 };
const ELEM_N = { fire: 'fuego: la carne sale asada', frost: 'escarcha: congela a los animales cercanos', storm: 'tormenta: alcanza a varios animales a la vez', life: 'vida: a veces da esencia de vida', void: 'vacío: atrae presas lejanas', time: 'tiempo: caza al instante', mind: 'mente: mucho más botín', earth: 'tierra: golpe demoledor', holy: 'bendita: más botín' };

// ---------- Armas ----------
// dmg: divide el tiempo de caza · reach: radio extra para apuntar (px) · loot: probabilidad de botín doble
// sweep: radio en el que caza a todos los animales · chain: animales extra alcanzados · el: elemento
const WEAPONS = {};
function weapon(id, n, c, s, st, d) {
  WEAPONS[id] = st;
  const bits = [`Caza ×${st.dmg.toFixed(1)} más rápido`];
  if (st.reach) bits.push(`apunta desde ${Math.round(st.reach / 32 * 10) / 10} casillas`);
  if (st.loot) bits.push(`+${Math.round(st.loot * 100)} % de botín doble`);
  if (st.sweep) bits.push('golpe en área');
  if (st.chain) bits.push(`alcanza ${st.chain} presas más`);
  if (st.el) bits.push('elemento ' + ELEM_N[st.el]);
  ITEMS[id] = { n, c, s, cat: W_CAT, d: (d ? d + ' ' : '') + bits.join(' · ') + '.', weapon: st };
}
const WK = {
  sword: { n: 'Espada', s: 'sword', dmg: 1.6, f: F => [F.rod, [F.plate, F.plate, 'leather']] },
  dagger: { n: 'Daga', s: 'dagger', dmg: 1.2, loot: 0.3, f: F => [F.rod, [F.plate, 'leather']] },
  spear: { n: 'Lanza', s: 'spear', dmg: 1.4, reach: 40, f: F => [F.longRod, [F.plate]] },
  baxe: { n: 'Hacha de guerra', s: 'baxe', dmg: 1.9, sweep: 40, f: F => [F.longRod, [F.plate, F.plate, F.plate]] },
  mace: { n: 'Maza', s: 'mace', dmg: 2.1, f: F => [F.rod, [F.block]] },
  scythe: { n: 'Guadaña', s: 'scythe', dmg: 1.5, sweep: 56, loot: 0.15, f: F => [F.longRod, [F.plate, F.plate, F.ring]] },
};
const WMAT = { bronze: {}, iron: {}, steel: {}, silver: { loot: 0.2, el: 'holy' }, mithril: { reach: 12, mul: 1.15 }, adamantite: { mul: 1.25 }, runesteel: { el: 'storm', chain: 2 }, dragonsteel: { el: 'fire', mul: 1.2 }, elvensilver: { loot: 0.3, reach: 16, el: 'holy' } };
for (const mid in WMAT) {
  const m = MAT_BY[mid], F = MF[mid], x = WMAT[mid];
  for (const k in WK) {
    const w = WK[k], st = { dmg: w.dmg * (1 + m.h * 0.3) * (x.mul || 1), reach: (w.reach || 0) + (x.reach || 0), loot: (w.loot || 0) + (x.loot || 0), sweep: w.sweep || 0, chain: x.chain || 0, el: x.el || null };
    const id = mid + cap(k), [core, teeth] = w.f(F);
    weapon(id, `${w.n} de ${m.n}`, m.c, w.s, st);
    RX(id, core, teeth, 0, MAT_T[mid] ?? 3);
  }
}
// Arcos y ballestas: apuntan desde lejos
weapon('woodBow', 'Arco de madera', '#9a6a3a', 'bow', { dmg: 1.3, reach: 70 }); RX('woodBow', 'stick', ['stick', 'thread', 'thread'], 0, 0);
weapon('compoundBow', 'Arco compuesto', '#7f8a96', 'bow', { dmg: 2.2, reach: 96 }); RX('compoundBow', MF.steel.longRod, [MF.steel.spring, 'thread', 'thread', 'bearing'], 0, 2);
weapon('elvenBow', 'Arco élfico', '#d8ffe8', 'bow', { dmg: 3.2, reach: 128, loot: 0.3 }); RX('elvenBow', MF.elvensilver.longRod, ['mithrilThread', 'mithrilThread', 'griffinFeather', 'moonstoneCut'], 0, 4);
weapon('crossbow', 'Ballesta', '#9a7a5a', 'xbow', { dmg: 2.0, reach: 80 }); RX('crossbow', MF.iron.longRod, ['planks', MF.iron.spring, 'thread', 'thread'], 0, 1);
weapon('repeaterXbow', 'Ballesta de repetición', '#5a7ab8', 'xbow', { dmg: 2.6, reach: 90, chain: 2 }); RX('repeaterXbow', MF.runesteel.longRod, ['gearTrain', MF.runesteel.spring, 'thread', 'thread'], 16, 5);
// Báculos elementales (una runa en el centro)
const STAVES = [['fire', 'runeFire', 'Báculo de fuego', '#ff6a1a', { sweep: 48 }], ['frost', 'runeFrost', 'Báculo de escarcha', '#8ad8ff', {}], ['storm', 'runeStorm', 'Báculo de tormenta', '#f0f05a', { chain: 3 }], ['life', 'runeLife', 'Báculo de vida', '#7ae05a', {}],
  ['void', 'runeVoid', 'Báculo del vacío', '#7a4aff', { reach: 160 }], ['mind', 'runeMind', 'Báculo mental', '#e0a0ff', { loot: 0.6 }], ['earth', 'runeEarth', 'Báculo de tierra', '#c8843a', { mul: 1.6 }], ['time', 'runeTime', 'Báculo del tiempo', '#ffe0ff', {}]];
for (const [el, rune, n, c, x] of STAVES) {
  const id = 'staff' + cap(el);
  weapon(id, n, c, 'staff', { dmg: 2.4 * (x.mul || 1), reach: x.reach || 48, loot: x.loot || 0, sweep: x.sweep || 0, chain: x.chain || 0, el });
  RX(id, rune, [MF.arcanite.longRod, 'manaCrystal'], 0, 5);
}
weapon('wandSpark', 'Varita de chispas', '#f0e080', 'wand', { dmg: 1.8, reach: 64, chain: 1, el: 'storm' }); RX('wandSpark', MF.electrum.rod, ['manaDust', 'redstone'], 0, 3);
weapon('wandEmber', 'Varita de ascuas', '#ff8a4a', 'wand', { dmg: 1.8, reach: 64, el: 'fire' }); RX('wandEmber', MF.copper.rod, ['manaDust', 'fireblossom'], 0, 3);
// Legendarias
weapon('dawnblade', 'Espada del alba', '#fff6b0', 'sword', { dmg: 7, reach: 24, loot: 0.6, sweep: 40, el: 'holy' }, 'Forjada con luz de estrellas.'); RX('dawnblade', MF.starsilver.longRod, ['sunstoneCut', 'enchantedBook', 'holyWater', MF.starsilver.doublePlate, MF.starsilver.doublePlate], 64, 6);
weapon('thunderHammer', 'Martillo del trueno', '#f0f05a', 'mace', { dmg: 6, sweep: 64, chain: 5, el: 'storm' }, 'Cada golpe es un relámpago.'); RX('thunderHammer', 'runeStorm', [MF.dwarvensteel.block, MF.dwarvensteel.longRod, 'sapphireCut', 'enchantedBook'], 64, 6);
weapon('voidReaper', 'Guadaña del vacío', '#3a2a5a', 'scythe', { dmg: 6, reach: 200, sweep: 80, el: 'void' }, 'Siega lo que hay al otro lado.'); RX('voidReaper', 'voidCore', [MF.voidsteel.longRod, MF.voidsteel.doublePlate, 'soulGem', 'enchantedBook'], 64, 7);
weapon('phoenixLance', 'Lanza del fénix', '#ff7a2a', 'spear', { dmg: 6.5, reach: 110, sweep: 40, el: 'fire' }, 'Arde sin consumirse.'); RX('phoenixLance', 'phoenixFeather', [MF.dragonsteel.longRod, 'rubyCut', 'dragonHeart', 'enchantedBook'], 64, 7);
weapon('moonBow', 'Arco lunar', '#c8d8ff', 'bow', { dmg: 5, reach: 220, loot: 0.8, el: 'frost' }, 'Sus flechas son rayos de luna.'); RX('moonBow', 'moonstoneCut', [MF.elvensilver.longRod, 'mithrilThread', 'mithrilThread', 'enchantedBook'], 64, 6);
weapon('chronoBlade', 'Hoja crónica', '#e0c8ff', 'sword', { dmg: 8, loot: 0.5, el: 'time' }, 'Corta antes de que empieces el golpe.'); RX('chronoBlade', 'chronoCore', [MF.chronium.longRod, 'runeTime', 'timeCrystal', 'enchantedBook'], 64, 7);
weapon('dragonSlayer', 'Matadragones', '#b83a2a', 'sword', { dmg: 7.5, sweep: 56, loot: 0.4, el: 'fire' }, 'Pesa tanto como un dragón pequeño.'); RX('dragonSlayer', 'dragonHeart', [MF.dragonsteel.longRod, MF.dragonsteel.doublePlate, MF.dragonsteel.doublePlate, 'dragonEyeCut'], 64, 7);

// ---------- Herramientas ----------
// kind: pick (roca) · axe (madera) · hammer (roca 3×3) · sickle (plantas y árboles 3×3) · paxel (roca y madera)
// excav (roca 5×5) · area: 1 = 3×3, 2 = 5×5 · fort: botín doble · smelt: funde lo que picas
function tool(id, n, c, s, st, d) { TOOLS[id] = st; ITEMS[id] = { n, c, s, cat: 9, d, tool: st }; }
const TK = {
  pick: { n: 'Pico', s: 'pick', f: F => ['stick', [F.ingot, F.ingot, F.ingot]], d: m => `Pica roca y menas ×${m.toFixed(1)} más rápido.` },
  axe: { n: 'Hacha', s: 'axe', f: F => ['stick', [F.ingot, F.ingot]], d: m => `Tala y corta plantas ×${m.toFixed(1)} más rápido.` },
  hammer: { n: 'Martillo', s: 'hammer', area: 1, f: F => ['stick', [F.ingot, F.ingot, F.ingot, F.ingot]], d: m => `Pica 3×3 casillas de roca a la vez (×${(m * 0.6).toFixed(1)}).` },
  sickle: { n: 'Hoz', s: 'sickle', area: 1, f: F => ['stick', [F.plate, F.plate]], d: m => `Cosecha plantas y árboles en 3×3 (×${(m * 0.8).toFixed(1)}).` },
  paxel: { n: 'Multiherramienta', s: 'paxel', f: F => ['stick', [F.ingot, F.ingot, F.plate, F.plate]], d: m => `Pico y hacha en uno: roca y madera ×${(m * 0.9).toFixed(1)}.` },
  excav: { n: 'Excavadora', s: 'excav', area: 2, f: F => [F.longRod, [F.block, F.ingot, F.ingot]], d: m => `Pica 5×5 casillas de roca a la vez (×${(m * 0.45).toFixed(1)}).` },
};
const TSETS = { pick: ['mithril', 'adamantite', 'arcanite', 'starsilver', 'runesteel', 'dragonsteel', 'elvensilver', 'dwarvensteel'], sickle: ['bronze', 'iron', 'steel', 'mithril', 'elvensilver', 'runesteel'], paxel: ['steel', 'mithril', 'adamantite', 'runesteel', 'dragonsteel', 'dwarvensteel'], excav: ['steel', 'tungsten', 'adamantite', 'dwarvensteel', 'dragonsteel'] };
TSETS.axe = TSETS.hammer = TSETS.pick;
for (const k in TK) for (const mid of TSETS[k]) {
  const m = MAT_BY[mid], F = MF[mid], mult = 1.5 + m.h * 0.7, id = mid + cap(k === 'pick' ? 'pickaxe' : k), t = TK[k], [core, teeth] = t.f(F);
  if (ITEMS[id]) continue;
  const st = { kind: k, mult, area: t.area || 0, fort: mid === 'starsilver' || mid === 'elvensilver' ? 0.2 : 0, smelt: mid === 'dragonsteel' };
  tool(id, `${t.n} de ${m.n}`, m.c, t.s, st, t.d(mult) + (st.fort ? ' +20 % de botín doble.' : '') + (st.smelt ? ' Funde lo que pica.' : ''));
  RX(id, core, teeth, 0, MAT_T[mid] ?? 3);
}
// Herramientas mágicas
tool('magmaPick', 'Pico ígneo', '#ff5a2a', 'pick', { kind: 'pick', mult: 6, smelt: true }, 'Pica ×6 y funde al momento lo que sacas (las menas salen en lingote).'); RX('magmaPick', 'runeFire', [MF.ignitite.ingot, MF.ignitite.ingot, MF.ignitite.ingot, 'stick'], 0, 5);
tool('runicDrill', 'Taladro rúnico', '#5a7ab8', 'excav', { kind: 'excav', mult: 8, area: 2, fort: 0.4 }, 'Pica 5×5 y da +40 % de botín doble.'); RX('runicDrill', 'arcaneCore', [MF.runesteel.block, MF.runesteel.gear, 'mvMotor', 'runeEarth'], 32, 6);
tool('elvenAxe', 'Hacha del bosque élfico', '#d8ffe8', 'axe', { kind: 'sickle', mult: 7, area: 2 }, 'Tala y cosecha 5×5 de golpe, ×5,6 más rápido.'); RX('elvenAxe', 'runeLife', [MF.elvensilver.ingot, MF.elvensilver.ingot, MF.elvensilver.longRod, 'emeraldCut'], 0, 5);
tool('goldenSickle', 'Hoz de la cosecha dorada', '#ffd34a', 'sickle', { kind: 'sickle', mult: 5, area: 2, fort: 0.6 }, 'Cosecha 5×5 con +60 % de botín doble.'); RX('goldenSickle', 'runeLife', [MF.gold.doublePlate, MF.gold.doublePlate, 'stick', 'topazCut'], 0, 4);
tool('voidPick', 'Pico del vacío', '#3a2a5a', 'paxel', { kind: 'paxel', mult: 14 }, 'Pica y tala casi al instante (×12,6).'); RX('voidPick', 'voidCore', [MF.voidsteel.ingot, MF.voidsteel.ingot, MF.voidsteel.ingot, 'stick'], 64, 7);
tool('chronoPick', 'Pico crónico', '#e0c8ff', 'pick', { kind: 'pick', mult: 25, fort: 0.3 }, 'Pica ×25: la roca se rompe antes de tocarla. +30 % de botín doble.'); RX('chronoPick', 'chronoCore', [MF.chronium.ingot, MF.chronium.ingot, MF.chronium.ingot, 'stick'], 64, 7);
const UTIL = [
  ['lightWand', 'Varita de luz', '#fff6b0', 'wand', 'En la mano: ilumina muchísimo (más que el farol).', 'luminiteRod', [MF.luminite.rod, ['manaDust', 'glowcap']], 3],
  ['hasteStaff', 'Bastón de presteza', '#c8f0ff', 'staff', 'En el inventario: corres un 25 % más rápido (se suma a las botas).', null, ['runeStorm', [MF.mithril.longRod, 'griffinFeather']], 4],
  ['fortuneAmulet', 'Amuleto de fortuna', '#20c860', 'amulet', 'En el inventario: +25 % de botín doble al picar y cazar.', null, ['emeraldCut', [MF.gold.ring, MF.gold.wire]], 4],
  ['veinStaff', 'Vara de vetas', '#c8a8ff', 'staff', 'En la mano: marca las menas a 28 casillas (el prospector llega a 16).', null, ['amethystGemCut', [MF.arcanite.longRod, 'prospector']], 4],
  ['hunterCharm', 'Talismán del cazador', '#c8203a', 'amulet', 'En el inventario: cazas un 30 % más rápido.', null, ['rubyCut', [MF.silver.ring, 'frostFang']], 4],
  ['magnetGlove', 'Guante imantado', '#c84a4a', 'sheet', 'En el inventario: recoges los objetos de las cintas al pasar (F sobre la cinta ya no hace falta).', null, ['magnet', ['leather', 'leather', 'electromagnet']], 3],
];
for (const [id, n, c, s, d, , [core, teeth], tier] of UTIL) { tool(id, n, c, s, { kind: 'util' }, d); RX(id, core, teeth, 0, tier); }
