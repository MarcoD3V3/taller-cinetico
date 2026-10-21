'use strict';
// =====================================================================================
//  Herramientas específicas: cada casilla dura pide un tipo de herramienta y un nivel.
//  Nivel de una herramienta = dureza de su material + 1 (madera 1, piedra 2, cobre 2,
//  hierro 3, acero 4, titanio 5, wolframio/mithril 6, adamantita 7…).
// =====================================================================================
const TOOL_KIND_N = { pick: 'Pico', axe: 'Hacha', shovel: 'Pala', hammer: 'Martillo', sickle: 'Hoz', paxel: 'Multiherramienta', excav: 'Excavadora' };
// Herramientas básicas para empezar
const BASIC_TOOLS = [
  ['woodPick', 'Pico de madera', '#a07848', 'pick', { kind: 'pick', mult: 1.3, lv: 1 }, ['stick', 'planks,planks,planks']],
  ['stonePick', 'Pico de piedra', '#8a8884', 'pick', { kind: 'pick', mult: 1.6, lv: 2 }, ['stick', 'stone,stone,stone']],
  ['woodAxe', 'Hacha de madera', '#a07848', 'axe', { kind: 'axe', mult: 1.3, lv: 1 }, ['stick', 'planks,planks']],
  ['stoneAxe', 'Hacha de piedra', '#8a8884', 'axe', { kind: 'axe', mult: 1.6, lv: 2 }, ['stick', 'stone,stone']],
  ['woodShovel', 'Pala de madera', '#a07848', 'shovel', { kind: 'shovel', mult: 1.5, lv: 1 }, ['stick', 'planks']],
  ['stoneShovel', 'Pala de piedra', '#8a8884', 'shovel', { kind: 'shovel', mult: 2, lv: 2 }, ['stick', 'stone']],
];
for (const [id, n, c, s, st, [core, teeth]] of BASIC_TOOLS) { TOOLS[id] = st; ITEMS[id] = { n, c, s, cat: 9, tool: st, d: '' }; R2(id, 1, core, teeth, 0, 0); }
// Palas de metal
for (const mid of ['copper', 'iron', 'steel', 'titanium', 'mithril', 'adamantite']) {
  const m = MAT_BY[mid], id = mid + 'Shovel', mult = 2 + m.h * 0.8, st = { kind: 'shovel', mult };
  TOOLS[id] = st; ITEMS[id] = { n: 'Pala de ' + m.n, c: m.c, s: 'shovel', cat: 9, tool: st, d: '' };
  R2(id, 1, 'stick', MF[mid].plate, 0, MAT_T[mid] ?? 2);
}
// Nivel de extracción de cada herramienta (si no lo trae, sale de su potencia)
for (const id in TOOLS) {
  const t = TOOLS[id]; if (t.kind === 'util') continue;
  if (!t.lv) t.lv = clamp(Math.round((t.mult - 1.5) / 0.7) + 1, 1, 9);
  const it = ITEMS[id], k = TOOL_KIND_N[t.kind] || '';
  if (!it.d) it.d = `${k}: ${t.kind === 'shovel' ? 'cava tierra, arena, arcilla y raíces' : t.kind === 'axe' ? 'tala árboles' : 'pica roca y menas'} ×${t.mult.toFixed(1)} más rápido.`;
  it.d += ` Nivel de extracción ${t.lv}.`;
}
// Qué necesita cada casilla: [tipo, nivel] (sin entrada = se puede con la mano)
const NEED = {
  pick: {
    1: ['STONEFLOOR', 'BASALTFLOOR', 'PERMAFLOOR', 'ROCKFLOOR', 'STONE', 'BASALT', 'PERMAFROST', 'COAL', 'RED', 'SULFUR', 'SALTPETER', 'COPPER', 'ZINC', 'TIN', 'LEAD', 'ICE', 'TERRACOTTA', 'COBBLE', 'BRICKFLOOR', 'REEF'],
    2: ['IRON', 'QUARTZ', 'NICKEL', 'ALUMINUM', 'LITHIUM', 'CRYSTALCLUSTER'],
    3: ['GOLD', 'SILVER', 'COBALT', 'CHROMIUM', 'CRYSTAL', 'URANIUM', 'CRYSTALTREE'],
    4: ['PLATINUM', 'TITANIUM', 'OBSIDIAN'],
    5: ['TUNGSTEN', 'MITHRIL', 'STARSILVER', 'ARCANITE'],
    6: ['ADAMANTITE'],
  },
  axe: { 1: ['DARKOAK', 'BAOBAB', 'JUNGLETREE', 'MANGROVE', 'PLANKFLOOR', 'BLOODTHORN'] },
  shovel: { 1: ['CLAY', 'SALT', 'PEAT', 'MANDRAKE', 'DREAMROOT'] },
};
for (const k in NEED) for (const lv in NEED[k]) for (const key of NEED[k][lv]) if (G[key] !== undefined) GI[G[key]].need = { k, lv: +lv };
for (const [id, , , , , , lv] of MINERALS) GI[G['M_' + id.toUpperCase()]].need = { k: 'pick', lv };
const NEED_N = { pick: 'un pico', axe: 'un hacha', shovel: 'una pala' };
const LV_MAT = ['', 'madera', 'piedra o cobre', 'hierro o bronce', 'acero', 'titanio', 'wolframio o mithril', 'adamantita', 'aleación arcana', 'leyenda'];
// ¿Qué tipos de herramienta cuentan como pico, hacha o pala?
const KIND_AS = { pick: ['pick', 'hammer', 'paxel', 'excav'], axe: ['axe', 'sickle', 'paxel'], shovel: ['shovel'] };
function toolOK(gi, tool) {
  const n = gi.need; if (!n) return true;
  return !!tool && KIND_AS[n.k].includes(tool.kind) && (tool.lv || 1) >= n.lv;
}
