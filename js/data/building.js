'use strict';
// =====================================================================================
//  Construcción: bloques de todos los materiales (piedra, troncos, ladrillo, cristal,
//  arena, hielo, metales…) con textura propia. Los muros son sólidos; la hierba y las flores
//  decorativas se pueden atravesar. Además decide qué bloques se pueden pisar (BD.walk).
// =====================================================================================
CATS.push('Construcción'); const BUILD_CAT = CATS.length - 1;
// [id, nombre, color, textura, núcleo, dientes, cuántos salen, extra]
const BUILD = [
  ['stoneBlock', 'Bloque de piedra', '#8a8884', 'stone', 'stone', 'stone', 2],
  ['stoneBricks', 'Ladrillos de piedra', '#9a968e', 'bricks', 'stoneBlock', 'stoneBlock,stoneBlock,stoneBlock', 4],
  ['mossyBricks', 'Ladrillos con musgo', '#7a8a6a', 'bricks', 'stoneBricks', 'herbs', 1],
  ['stonePillar', 'Columna de piedra', '#b0aca4', 'pillar', 'stoneBricks', 'stoneBricks', 1],
  ['logWall', 'Pared de troncos', '#7a5a3a', 'log', 'log', 'log', 2],
  ['brickWall', 'Muro de ladrillo', '#a8523a', 'bricks', 'brick', 'brick,brick,brick', 4],
  ['glassBlock', 'Ventana de cristal', '#bfe4f0', 'glass', 'glass', 'glass', 2],
  ['sandstone', 'Arenisca', '#d8c08a', 'sand', 'sand', 'sand,sand,sand', 2],
  ['dirtBlock', 'Bloque de tierra', '#7a5a3a', 'dirt', 'dirt', 'dirt', 2],
  ['clayBlock', 'Bloque de arcilla', '#a0a4b0', 'dirt', 'clay', 'clay', 2],
  ['terracottaBlock', 'Bloque de terracota', '#b0643e', 'stone', 'clay', 'clay,coal', 2],
  ['snowBlock', 'Bloque de nieve', '#eef2f6', 'dirt', 'snow', 'snow,snow,snow', 1],
  ['iceBlock', 'Bloque de hielo', '#b8e0f0', 'ice', 'ice', 'ice', 2],
  ['obsidianBlock', 'Bloque de obsidiana', '#2a1e30', 'stone', 'obsidian', 'obsidian', 2],
  ['basaltBlock', 'Bloque de basalto', '#3e3a3c', 'stone', 'basalt', 'basalt', 2],
  ['quartzBlock', 'Bloque de cuarzo', '#f0ece4', 'metal', 'quartz', 'quartz,quartz', 2],
  ['crystalBlock', 'Bloque de cristal mágico', '#b48cff', 'crystal', 'crystal', 'crystal,glass', 2, { light: 1 }],
  ['hedge', 'Seto', '#3a6a2a', 'leaf', 'herbs', 'herbs,herbs,stick', 2],
  ['fence', 'Valla de madera', '#8a6a42', 'fence', 'planks', 'stick,stick,stick', 4],
  ['ironFence', 'Verja de hierro', '#6a6e76', 'fence', MF.iron.rod, MF.iron.rod + ',' + MF.iron.rod, 4],
  ['flowerBed', 'Parterre de flores', '#4a8a3a', 'flower', 'dirt', 'petals,petals', 2, { walk: 1 }],
  ['grassTuft', 'Hierba decorativa', '#5aa04a', 'grass', 'herbs', 'dirt', 2, { walk: 1 }],
  ['gravelPath', 'Camino de grava', '#8a8682', 'gravel', 'gravel', 'gravel', 4, { walk: 1 }],
  ['woodPlatform', 'Plataforma de madera', '#a07848', 'plank', 'planks', 'stick', 2, { walk: 1 }],
];
for (const [id, n, c, tex, core, teeth, out, x] of BUILD) {
  XB(id, { n, cat: BUILD_CAT, look: { c, tex, g: '', a: '' }, d: (x && x.walk ? 'Decoración: se puede pisar.' : 'Bloque de construcción: no se puede atravesar.') + ' Clic derecho para quitarlo (lo recuperas).', ...(x || {}) });
  if (!R2(id, out, core, teeth)) RX(id, core, teeth.split(','), 0, 0);
}
// Las paredes y muebles anteriores también tienen textura
BD.woodWall.look.tex = 'plank'; BD.stoneWall.look.tex = 'bricks';
// Los bloques de metal (hierro, oro, mithril…) se pueden colocar como muros
for (const m of MATS) { const id = MF[m.id].block; if (BD[id]) continue; XB(id, { n: ITEMS[id].n, cat: BUILD_CAT, look: { c: m.c, tex: 'metal', g: '', a: '' }, d: 'Bloque de ' + m.n + ': muro decorativo y sólido. ' + (ITEMS[id].d || ''), light: m.id === 'luminite' ? 2 : 0 }); }
// ---------- ¿Se puede pisar? ----------
// Cintas, cables, tuberías, ejes, redstone, placas lógicas, trampas, alfombras, antorchas y
// plantas decorativas se pisan. Máquinas, cofres, muros, generadores y muebles grandes, no.
const WALK_IDS = new Set(['wire', 'wirebridge', 'plate', 'lever', 'button', 'trap', 'spikeTrap', 'rug', 'torch', 'chair', 'door', 'flowerBed', 'grassTuft', 'gravelPath', 'woodPlatform', 'scarecrow']);
const SOLID_LOGIC = new Set(['computer', 'turret', 'display', 'alarm', 'spawnSuppressor', 'holyBeacon', 'enemySensor']);
for (const id in BD) {
  const d = BD[id]; if (d.walk !== undefined) continue;
  d.walk = WALK_IDS.has(id) || d.kin === 'belt' || d.kin === 'axis' || !!d.cable || !!d.pipe || (d.cat === 6 && !d.pw && !d.inv && !d.machine && !SOLID_LOGIC.has(id)) ? 1 : 0;
}
