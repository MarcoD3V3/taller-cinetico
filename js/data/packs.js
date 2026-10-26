'use strict';
// =====================================================================================
//  Mochilas: 30, de un saco de arpillera a la Mochila del Origen (mítica). Se llevan en la
//  espalda (ranura propia) y cada una tiene su emblema: una pieza única que solo sirve para
//  fabricarla y que le da su icono. Cada mochila pide la anterior, así que la mítica obliga
//  a recorrer todo el camino. Cuanto más alta:
//   · más huecos, menos pesa llena y más cosas hace (módulos: cantimplora, fiambrera, maná,
//     brújula, botiquín, termómetro, recuento de minerales, reloj, tasador…);
//   · más difícil de fabricar: materiales más raros, más giro (RPM) y más nivel de taller;
//   · más grande y decorada, en el icono, en tu espalda y en su ventana.
//  La lógica y la ventana están en sim/packs.js.
// =====================================================================================
const PACK_RAR = [['Común', '#cfcac0'], ['Poco común', '#7fd07a'], ['Rara', '#6ab8ff'], ['Épica', '#c08aff'], ['Legendaria', '#f0c75e'], ['Mítica', '#ff7ad8']];
const PACK_SLOTS = [6, 8, 9, 10, 12, 12, 14, 15, 16, 18, 18, 20, 21, 24, 24, 27, 27, 30, 30, 32, 33, 36, 36, 40, 42, 45, 48, 50, 54, 64];
// [id, nombre, color, acento, glifo del emblema, emblema, núcleo del emblema, dientes del emblema, dientes de la mochila, efectos, defensa, módulos, descripción]
const PACK_DEF = [
  ['packSack', 'Saco de arpillera', '#b89a6a', '#7a5a3a', '🪢', 'Nudo de cordelero', 'rope', 'rope,stick', 'cloth*2,rope', {}, 0, [], 'Un saco con correa: lo justo para no ir cargado de piedras en las manos.'],
  ['packBundle', 'Hatillo del caminante', '#a8763e', '#e8c890', '🧣', 'Pañuelo anudado', 'cloth', 'thread*2,herbs', 'cloth*3,stick,thread', { speed: 1.01 }, 0, [], 'Atado a un palo: ligero y cómodo para andar.'],
  ['packSatchel', 'Zurrón de cuero', '#8a5a2a', '#e8dcc0', '🦴', 'Hebilla de hueso', 'bone', 'bone*2,leather,thread', 'leather*3,thread*2', {}, 0, [], 'Cuero curtido y una buena hebilla.'],
  ['packShepherd', 'Morral de pastor', '#9a8a5a', '#d8c070', '🫗', 'Cantimplora de calabaza', 'leather', 'wool,thread,@copper.ingot', 'wool*3,leather*2', { thirst: 0.97 }, 0, ['water'], 'Lleva cantimplora: se llena junto al agua o con la lluvia.'],
  ['packCanvas', 'Mochila de lona', '#6a7a4a', '#c88a4a', '🔩', 'Remache de cobre', '@copper.ingot', '@copper.nugget*2', 'cloth*4,leather*2,rope', {}, 0, ['loot'], 'Con el inventario lleno, lo que recoges va a la mochila.'],
  ['packBasket', 'Cesta de recolector', '#c8a050', '#6a9a3a', '🧺', 'Asa de mimbre', 'stick', 'stick*3,herbs', 'planks*2,rope*2,herbs*2', { sick: 0.97 }, 0, ['herbs'], 'Para hierbas, flores, semillas y frutos.'],
  ['packExplorer', 'Mochila del explorador', '#4a6a8a', '#e0b54c', '🧭', 'Rosa de los vientos bordada', 'cloth', 'thread*2,@iron.nugget,dye', 'leather*4,@iron.plate,rope*2', { speed: 1.02 }, 0, ['compass'], 'Brújula cosida: te dice dónde están tu cama, el núcleo y tus marcas.'],
  ['packLunch', 'Fiambrera de campaña', '#7a8a9a', '#e8e0c8', '🥫', 'Fiambrera de estaño', '@tin.plate', '@tin.plate,@tin.nugget*2', 'leather*3,cloth*3,@iron.plate', { hunger: 0.97 }, 0, ['lunch'], 'Come sola cuando tienes hambre, de lo que lleves dentro.'],
  ['packMiner', 'Mochila de minero', '#6a5a4a', '#ffd34a', '🪔', 'Lámpara de carburo', 'lantern', '@iron.plate,coal*4', 'leather*4,@iron.plate*2,rope*2', { mine: 1.05 }, 0, ['ore'], 'Cuenta y ordena tus menas.'],
  ['packHunter', 'Mochila de cazador', '#5a6a3a', '#a8c070', '🏹', 'Carcaj de abedul', 'planks', 'leather*2,feather*4', 'hide*3,leather*3,feather*2', { ranged: 1.04 }, 0, ['loot', 'filter'], 'Elige qué se guarda directamente al recogerlo.'],
  ['packHerbal', 'Mochila de herbolaria', '#5a8a5a', '#f08a9a', '🌿', 'Mortero de piedra', 'stone', 'stone*3,herbs*3', 'cloth*4,herbs*4,salve*2', { sick: 0.92, heal: 1.05 }, 0, ['medic', 'herbs'], 'Botiquín: te cura con lo que lleves cuando estás mal.'],
  ['packBear', 'Mochila de piel de oso', '#6a4a2a', '#d8c8a8', '🐻', 'Garra de oso', 'fur', 'bone*3,fur*2', 'fur*5,leather*3,@iron.plate*2', { warm: 6, hp: 5 }, 0, ['thermo'], 'Abriga mucho. Termómetro para el frío.'],
  ['packSmith', 'Mochila de herrero', '#5a5e66', '#e8843a', '⚒', 'Yunque en miniatura', '@steel.ingot', '@steel.plate*2,@iron.gear', 'leather*4,@steel.plate*3,chain*2', { work: 1.04 }, 1, ['ore', 'gauge'], 'Placas de acero cosidas: protege y trabajas mejor.'],
  ['packAlchemist', 'Mochila de alquimista', '#6a4a8a', '#7af0d0', '⚗', 'Matraz sellado', 'vial', 'vial*2,manaDust*2', 'enchantedCloth*2,leather*4,manaDust*4', { mana: 10 }, 0, ['mana'], 'Una batería de maná que se carga sola.'],
  ['packSailor', 'Mochila del marinero', '#3a6a8a', '#e8c070', '⚓', 'Ancla de latón', '@brass.ingot', '@brass.plate*2,rope*2', 'sail*2,rope*4,kelp*4,@brass.plate*2', { thirst: 0.92 }, 0, ['water', 'gauge'], 'Cantimplora grande y bebe sola si quieres.'],
  ['packCartographer', 'Mochila del cartógrafo', '#8a6a3a', '#5ab0c8', '🗺', 'Astrolabio', '@bronze.plate', 'compass,lens,@gold.ingot', 'leather*4,paper*6,@bronze.plate*2', { luck: 0.02, speed: 1.02 }, 0, ['compass', 'clock'], 'Brújula y reloj del día.'],
  ['packMerchant', 'Mochila de mercader', '#a07a2a', '#ffd34a', '⚖', 'Balanza dorada', '@gold.plate', '@gold.ingot*2,chain', 'silk*4,leather*4,@gold.plate*2', { price: 0.94 }, 0, ['value', 'filter'], 'Tasa lo que llevas y regateas mejor.'],
  ['packClockwork', 'Mochila engranada', '#8a7a5a', '#c8a050', '⚙', 'Engranaje de reloj', '@brass.gear', 'gearTrain,bearing*2,@steel.gear*2', 'leather*4,@steel.plate*3,gearTrain*2,bearing*2', { work: 1.06, mine: 1.03 }, 1, ['clock', 'gauge', 'lunch'], 'Engranajes que reparten el peso.'],
  ['packElven', 'Mochila élfica', '#4a9a7a', '#d8f0e0', '🍃', 'Hoja de plata élfica', '@elvensilver.plate', 'manaDust*2,herbs*3', 'enchantedCloth*4,@elvensilver.plate*2,silk*4', { speed: 1.04, mana: 10 }, 0, ['herbs', 'compass', 'water'], 'Ligera como una hoja.'],
  ['packDwarven', 'Mochila enana', '#7a4a2a', '#ffd34a', 'ᛞ', 'Runa de piedra enana', 'runeBlank', '@dwarvensteel.ingot*2,arcaneInk', '@dwarvensteel.plate*4,leather*4,fur*3', { mine: 1.1, warm: 3 }, 2, ['ore', 'thermo', 'gauge'], 'Hecha para la mina: aguanta todo.'],
  ['packArcane', 'Mochila arcana', '#5a3aaa', '#c8a0ff', '🔮', 'Orbe arcano', 'manaCrystal', 'arcaneCore,manaDust*4', 'enchantedCloth*6,@arcanite.plate*3,manaCrystal*2', { mana: 25, manaRegen: 1.15 }, 1, ['mana', 'clock', 'medic'], 'Late con energía arcana.'],
  ['packScale', 'Mochila de escamas', '#a03a2a', '#ffb04a', '🐉', 'Escama pulida', 'drakeScale', 'drakeScale*2,essenceFire*2', 'drakeScale*6,@dragonsteel.plate*2,leather*4', { fire: 1, warm: 4 }, 3, ['thermo', 'medic', 'loot'], 'Escamas de dragón: no arde y protege.'],
  ['packGriffin', 'Mochila del grifo', '#c8a060', '#ffffff', '🪶', 'Pluma de grifo trenzada', 'griffinFeather', 'griffinFeather*2,silk*2,essenceStorm', 'griffinFeather*4,@mithril.plate*3,silk*4', { dash: 0.85, speed: 1.05 }, 1, ['compass', 'water', 'gauge'], 'Casi no pesa: el impulso cuesta menos.'],
  ['packShadow', 'Mochila sombría', '#2a2238', '#a060ff', '👁', 'Ojo de sombra', 'basiliskEye', 'shadowPelt*2,essenceVoid*2', 'shadowPelt*4,darkCloth*4,@voidsteel.plate*2', { detect: 0.82 }, 2, ['loot', 'value', 'filter'], 'Los enemigos te ven peor.'],
  ['packPhoenix', 'Mochila del fénix', '#ff6a1a', '#ffe060', '🔥', 'Llama eterna', 'phoenixFeather', 'essenceFire*3,essenceLife*2', 'phoenixFeather*3,enchantedCloth*4,@orichalcum.plate*2', { heal: 1.2, warm: 8, fire: 1 }, 2, ['medic', 'thermo', 'lunch', 'water'], 'Te recupera antes y nunca pasas frío.'],
  ['packGolem', 'Mochila del gólem', '#7a7a6a', '#7af0ff', '🗿', 'Corazón de gólem tallado', 'golemCore', 'resonantCrystal*2,@adamantite.ingot*2', '@adamantite.plate*4,golemCore,chain*4', { hp: 20, speed: 0.97 }, 5, ['ore', 'gauge', 'thermo', 'value'], 'Una fortaleza a la espalda: mucha vida y defensa, algo lenta.'],
  ['packQuantum', 'Mochila cuántica', '#3ac8d8', '#ffffff', '✳', 'Punto cuántico encapsulado', 'quantumDot', 'quantumCircuit,superconductor*2,graphene*2', 'carbonFiber*6,quantumCircuit*2,superconductor*2,@titanium.plate*3', { work: 1.08 }, 2, ['clock', 'value', 'gauge', 'ore', 'loot'], 'Dentro cabe más de lo que parece.'],
  ['packVoid', 'Mochila del vacío', '#4a1a6a', '#ff7ad8', '🌀', 'Fragmento del vacío', 'voidCore', 'voidShard*4,singularity', 'essenceVoid*6,@voidsteel.plate*4,voidCore,gravitonCoil', { luck: 0.06, detect: 0.9 }, 3, ['loot', 'compass', 'value', 'filter', 'mana'], 'Un bolsillo al vacío: más suerte con el botín.'],
  ['packChrono', 'Mochila del tiempo', '#c8b05a', '#5af0ff', '⌛', 'Reloj de arena cronal', 'timeCrystal', 'chronoCore,timeCrystal*2,@orichalcum.ingot*2', 'timeCrystal*4,chronoCore,@orichalcum.plate*4,enchantedCloth*4', { energy: 0.85, dash: 0.9 }, 3, ['clock', 'mana', 'medic', 'lunch', 'water'], 'Te cansas menos: el tiempo pasa más despacio para ti.'],
  ['packOrigin', 'Mochila del Origen', '#fff2c0', '#ff7ad8', '🌌', 'Semilla del Origen', 'philosopherStone', 'dragonHeart,singularity,antimatter,timeCrystal*3,unicornHorn', 'heartShard*8,soulGem*2,quantumCircuit*4,chronoCore,voidCore', { speed: 1.06, mana: 30, hp: 20, luck: 0.05, work: 1.08, heal: 1.15, warm: 6 }, 5, ['loot', 'filter', 'water', 'lunch', 'mana', 'medic', 'compass', 'thermo', 'ore', 'clock', 'value', 'gauge'], 'Mítica. Dicen que la tejió el mundo mismo al nacer: lo hace todo.'],
];
const PACKS = {};
PACK_DEF.forEach(([id, n, c, a, glyph, en, eCore, eTeeth, bTeeth, mods, def, modules, d], i) => {
  const rar = i >= 29 ? 5 : i >= 24 ? 4 : i >= 18 ? 3 : i >= 12 ? 2 : i >= 6 ? 1 : 0, tier = Math.min(7, Math.floor(i / 4)), rpm = i < 6 ? 0 : i < 12 ? 16 : i < 18 ? 32 : i < 24 ? 64 : i < 29 ? 128 : 256;
  const size = Math.min(4, Math.floor(i / 6)), deco = Math.min(5, Math.floor(i / 5)), heavy = Math.max(0, 0.14 - i * 0.005);
  const P2 = PACKS[id] = { id, i, n, c, a, glyph, rar, tier, rpm, size, deco, heavy, slots: PACK_SLOTS[i], modules: ['grid', ...modules], emblem: id + 'Emblem' };
  // Emblema: pieza única de esta mochila
  IT(P2.emblem, en, a, 'gem', C_CAT, `Emblema de la ${n.toLowerCase()}: solo sirve para fabricarla.`); ITEMS[P2.emblem].emblem = id;
  RB(P2.emblem, 1, eCore, eTeeth, i < 6 ? 0 : rpm / 2, tier);
  // La mochila: pide su emblema y la mochila anterior
  IT(id, n, c, 'sheet', C_CAT, `${d} ${P2.slots} huecos · ${PACK_RAR[rar][0]}. Va en la ranura de mochila (inventario, E); ábrela con V.`);
  ITEMS[id].pack = P2; ITEMS[id].gear = { slot: 'pack', mods, def: def || 0, look: {} };
  const prev = i ? PACK_DEF[i - 1][0] : null;
  RB(id, 1, P2.emblem, (prev ? prev + ',' : '') + bTeeth, rpm, tier);
});
