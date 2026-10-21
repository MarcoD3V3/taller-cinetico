'use strict';
// =====================================================================================
//  30 minerales inventados. Cada uno: mena (casilla en sus biomas, con su rareza y nivel
//  de pico), versión refinada, un talismán con un efecto real (basta con llevarlo en el
//  inventario) y un bloque de construcción. Las menas se crean en world/biomes.js.
// =====================================================================================
const MIN_CAT = ICATS.length; ICATS.push('Minerales');
for (const [id, ore, ref, c, dot, rar, lv, bios, charm, mods, txt] of MINERALS) {
  const R2n = RARITY_N[rar];
  IT(id + 'Ore', ore, dot, 'ore', 0, `Mineral ${R2n.toLowerCase()}. Se encuentra en las montañas de: ${bios.map(b => BIOMES_N[b] || b).join(', ')}. Necesita pico de nivel ${lv}. Fúndelo en el horno.`);
  ITEMS[id + 'Ore'].rarity = rar;
  IT(id, ref, c, rar === 'común' ? 'ingot' : 'gem', MIN_CAT, `${ore} refinada. Sirve para su talismán, para bloques de construcción y como ingrediente.`);
  ITEMS[id].rarity = rar;
  IT(id + 'Charm', charm, dot, 'amulet', MIN_CAT, `Llévalo en el inventario: ${txt}. No se acumula con otro igual.`);
  ITEMS[id + 'Charm'].charm = mods; ITEMS[id + 'Charm'].rarity = rar;
  // Refinado: las comunes salen 1:1; las raras piden 2 menas
  RM('furnace', { [id + 'Ore']: rar === 'común' || rar === 'poco_común' ? 1 : 2 }, { [id]: 1 }, rar === 'legendario' ? 6 : rar === 'raro' ? 4 : 2);
  RM('pulverizer', { [id + 'Ore']: 1 }, { [id]: 1, gravel: 1 }, 2);
  // Talismán y bloque
  const wire = rar === 'legendario' ? MF.platinum.wire : rar === 'raro' ? MF.gold.wire : MF.copper.wire;
  if (!R2(id + 'Charm', 1, id, `${id},${id},${wire}`, 0, lv >= 4 ? 3 : lv >= 3 ? 2 : 0)) RX(id + 'Charm', id, [id, id, wire, 'thread'], 0, 0);
  XB(id + 'Block', { n: 'Bloque de ' + ore.toLowerCase(), cat: BUILD_CAT, look: { c, tex: rar === 'común' ? 'stone' : 'crystal', g: '', a: '' }, light: rar === 'legendario' ? 2 : rar === 'raro' ? 1 : 0, walk: 0, d: `Bloque de construcción de ${ore.toLowerCase()}. No se atraviesa.` });
  if (!R2(id + 'Block', 2, id, 'stone,stone')) RX(id + 'Block', id, ['stone', 'stone', 'stone'], 0, 0);
}
// Ingredientes avanzados: combinan minerales de distintos biomas (obligan a explorar)
const MIN_COMBOS = [
  ['prismaticMatrix', 'Matriz prismática', '#c8a0ff', ['luminaria', 'mentalite', 'albite'], 'Componente de energía mágica: mejora talismanes y armas legendarias.'],
  ['tectonicCore', 'Núcleo tectónico', '#8a6a3a', ['terranite', 'petrine', 'ferrolite'], 'Base de herramientas y armaduras de minería.'],
  ['tidalHeart', 'Corazón de marea', '#3ac8d8', ['aquarine', 'coagulite', 'commercite'], 'Gema que guarda el agua: pociones y supervivencia.'],
  ['stormEngine', 'Motor de tormenta', '#c8c84a', ['tempestite', 'ventite', 'impulsite'], 'Pieza de movilidad: botas y monturas.'],
  ['bloodForge', 'Forja de sangre', '#a01a2a', ['sanguinite', 'iracite', 'pyrolite'], 'Material de armas de fuego y furia.'],
  ['wildSeed', 'Semilla salvaje', '#5ae05a', ['verdinite', 'silvanite', 'bestialite'], 'Semilla de la naturaleza: cultivos y mascotas.'],
];
for (const [id, n, c, ins, d] of MIN_COMBOS) { IT(id, n, c, 'orb', MIN_CAT, d); RM('arcaneForge', Object.fromEntries(ins.map(m => [m, 2])), { [id]: 1 }, 6); RB(id, 1, ins[0], ins.slice(1).join(',') + ',manaDust', 32, 4); }
// Usos de los combinados en cosas que ya existían
RB('dashBoots', 1, 'speedBoots', 'stormEngine', 0, 4);
RB('tameTreat', 6, 'wildSeed', 'berries', 0, 2);
RB('medkit', 3, 'tidalHeart', 'cloth,bandage', 0, 3);
RB('enchantedBook', 1, 'prismaticMatrix', 'spellTome', 0, 4);
RB('runicDrill', 1, 'tectonicCore', 'arcaneCore,mvMotor', 32, 5);
RB('dragonSlayer', 1, 'bloodForge', MF.dragonsteel.longRod + ',dragonEyeCut', 64, 6);
