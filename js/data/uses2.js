'use strict';
// =====================================================================================
//  Que nada quede sin uso:
//  · Las piezas de metal sobrantes (láminas, tornillos, muelles, engranajes, cables…)
//    se refunden en el horno y devuelven su metal.
//  · Componentes sueltos (cadena, álabe, relé, célula solar, PVC, epoxi, lubricante…)
//    sirven para muebles, luces, equipo o reparaciones.
// =====================================================================================
// [forma, cuántas piezas, cuántos lingotes]
const REMELT = [['nugget', 9, 1], ['plate', 1, 1], ['doublePlate', 1, 2], ['foil', 4, 1], ['rod', 2, 1], ['longRod', 1, 1], ['bolt', 4, 1], ['screw', 8, 1], ['ring', 2, 1], ['spring', 2, 1], ['gear', 1, 2], ['smallGear', 1, 1], ['wire', 4, 1]];
{
  const has = new Set(); for (const r of RECIPES.furnace || []) if (r.in) { const k = Object.keys(r.in); if (k.length === 1) has.add(k[0]); }
  for (const m in MF) { const F = MF[m]; if (!F || !F.ingot || !ITEMS[F.ingot]) continue;
    for (const [f, q, n] of REMELT) { const id = F[f]; if (!id || !ITEMS[id] || has.has(id)) continue; RM('furnace', { [id]: q }, { [F.ingot]: n }, 1 + n); has.add(id); ITEMS[id].d = (ITEMS[id].d || '') + ' Se refunde en el horno.'; } }
}
// Muebles y luces que aprovechan componentes
const X_DECOR2 = [
  ['chainLamp', 'Farol de cadena', '#c8a040', '¶', 'chain', 'glass,candle', { light: 3 }],
  ['windVane', 'Veleta', '#9aa0a8', '⚑', 'turbineBlade', '@iron.rod'],
  ['radioDeco', 'Radio antigua', '#6a4a2a', '▣', 'casing', 'relayItem,inductor'],
  ['solarLamp', 'Lámpara solar', '#ffe08a', '¡', 'solarCell', 'glass,@iron.rod', { light: 3 }],
  ['photonLamp', 'Lámpara de fotones', '#bff0ff', '✺', 'photonCell', 'tintedGlass,@steel.rod', { light: 5 }],
  ['toyTrain', 'Tren de juguete', '#c03a3a', '▭', 'conveyorModule', 'planks'],
  ['concreteBench', 'Banco de hormigón', '#a8a8a4', '╤', 'concrete', 'concrete'],
  ['panRack', 'Colgador de sartenes', '#5a5e66', '⊤', 'ptfe', '@iron.rod'],
];
for (const [id, n, c, g, core, teeth, x] of X_DECOR2) { XB(id, Object.assign({ n, cat: HOUSE_CAT, decor: 1, d: (x && x.light ? 'Da luz. ' : '') + 'Decoración: en una casa de NPC abarata sus precios.', look: { c, g, a: x && x.light ? 'glow' : '' } }, x || {})); RR(id, 1, mfx(core), mfx(teeth)); }
// Equipo
gear('raincoat', 'Chubasquero', '#e8c040', 'sheet', 'back', { prot: { rain: 0.8 }, look: { cape: '#e8c040' } }, 'pvc', ['pvc', 'thread'], 0, 'Apenas te mojas con la lluvia o la nieve.');
gear('glovesCarbon', 'Guantes de fibra de carbono', '#2a2a2e', 'sheet', 'hands', { mods: { mine: 1.1, work: 1.04 }, prot: { blister: 1 }, look: { gloves: '#2a2a2e' } }, 'carbonFiber', ['carbonFiber', 'thread'], 0);
gear('hornAmulet', 'Amuleto de cuerno', '#e8e0d0', 'amulet', 'acc', { mods: { melee: 1.06 } }, 'rhinoHorn', ['twine'], 0);
gear('opalRing', 'Anillo de ópalo', '#e8f0ff', 'ring', 'ring', { mods: { luck: 0.03 } }, 'opalCut', [MF.gold.ring], 0);
// Reparaciones
ITEMS.epoxy.repair = { amt: 0.15 }; ITEMS.epoxy.d = (ITEMS.epoxy.d || '') + ' Úsalo con F: repara un 15 % lo más gastado.';
ITEMS.lubricant.repair = { amt: 0.1, only: 'tool' }; ITEMS.lubricant.d = (ITEMS.lubricant.d || '') + ' Úsalo con F: repara un 10 % herramientas y armas.';
