'use strict';
// =====================================================================================
//  Píldoras e inyecciones de adrenalina, 10 niveles cada una (la lógica está en sim/pills.js).
//  · Píldora: te cura en unos segundos y quita el dolor. Barata.
//  · Inyección: al instante, cura como una píldora dos niveles más alta y te da un subidón de
//    adrenalina (corres y pegas más). Necesita una jeringa (no se gasta).
//  · Cuanto más alto el nivel, más cosas quita: dolor → sangrado y veneno → infecciones →
//    enfermedades → fracturas → en el nivel X, todo: quedas como nuevo.
// =====================================================================================
const PILL_N = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const PILL_COL = ['#e8e0d0', '#ffd0a0', '#ffb070', '#ff8a5a', '#ff5a6a', '#e05aa0', '#b05ae0', '#6a8aff', '#5ad8ff', '#ffd34a'];
const pok = (...ids) => ids.find(id => id && ITEMS[id]) || 'herbs';
// Ingredientes de cada nivel (sube poco a poco: de hierbas a plumas de fénix y fragmentos de estrella)
const PILL_ING = [
  ['herbs', pok('berries', 'herbs')], [pok('honeycomb', 'herbs'), pok('mushroom', 'herbs')], [pok('painkiller', 'herbs'), pok('glowcap', 'mushroom')], [pok('poultice', 'herbs'), pok('frostleaf', 'herbs'), pok('manaDust', 'herbs')],
  [pok('antidote', 'herbs'), pok('fireblossom', 'herbs'), pok('crystal', 'manaDust')], [pok('mandrake', 'herbs'), pok('moonflower', 'herbs'), pok('manaCrystal', 'manaDust')], [pok('spiritOrb', 'manaCrystal'), pok('nightshade', 'herbs'), pok('goldIngot', 'manaCrystal')],
  [pok('unicornHorn', 'spiritOrb'), pok('phoenixFeather', 'spiritOrb')], [pok('starShard', 'phoenixFeather'), pok('sunstoneCut', 'spiritOrb')], [pok('dragonEyeCut', 'sunstoneCut'), pok('phoenixFeather', 'spiritOrb'), pok('starShard', 'spiritOrb')],
];
for (let i = 0; i < 10; i++) {
  const L = i + 1, pid = 'adrenaPill' + L, sid = 'adrenaShot' + L, ing = PILL_ING[i];
  const what = L >= 10 ? 'Te deja como nuevo: todo curado.' : L >= 7 ? 'Quita casi todo: heridas, fracturas, enfermedades y dolor.' : L >= 5 ? 'Quita heridas, infecciones, sangrado, veneno y dolor.' : L >= 3 ? 'Quita heridas leves, sangrado, veneno y dolor.' : 'Quita el dolor y cura un poco.';
  IT(pid, `Píldora de adrenalina ${PILL_N[i]}`, PILL_COL[i], 'potion', 9, `Nivel ${L} de 10. ${what} Llévala en la mano y pulsa F.`);
  IT(sid, `Inyección de adrenalina ${PILL_N[i]}`, PILL_COL[i], 'rod', 9, `Nivel ${L} de 10. Al instante cura como una píldora dos niveles más alta y te da adrenalina (corres y pegas más). Necesitas una jeringa (no se gasta). Llévala en la mano y pulsa F.`);
  ITEMS[pid].pill = L; ITEMS[sid].shot = L;
  RB(pid, 2, ing[0], ing.slice(1).join(',') + (i ? ',adrenaPill' + i : ''), 0, Math.min(7, Math.floor(i * 0.8)));
  RB(sid, 1, pid, ing[0] + ',' + pok('vial', 'glass') + (i >= 4 ? ',' + pok('manaDust', 'herbs') : ''), 0, Math.min(7, Math.floor(i * 0.8)));
}
