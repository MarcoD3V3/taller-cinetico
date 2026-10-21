'use strict';
// Creación de partida y color del suelo. La generación del terreno está en chunks.js.
const START_ITEMS = [['woodPick', 1], ['shaft', 16], ['gearbox', 3], ['belt', 24], ['waterwheel', 1], ['drill', 2], ['furnace', 2], ['chest', 2], ['extractor', 2], ['bench', 1],
  ['crank', 1], ['woodAxe', 1], ['woodShovel', 1], ['bandage', 3], ['cookedMeat', 6], ['log', 16], ['planks', 32], ['stone', 32], ['coal', 16], ['ironIngot', 12], ['andesite', 12], ['redstone', 8], ['lever', 1], ['cog', 4]];
const RICH_ITEMS = [['log', 64], ['planks', 64], ['stone', 64], ['coal', 64], ['ironIngot', 64], ['copperIngot', 32], ['zincIngot', 32], ['andesite', 64], ['redstone', 32], ['glass', 16], ['cog', 16], ['largeCog', 4]];
// gen: parámetros del terreno (ver GEN_DEFAULT) · extra: { name, kit: 'normal'|'rich'|'empty', alwaysDay, sandbox }
function newGame(gen = {}, extra = {}) {
  const g = { ...GEN_DEFAULT, ...gen };
  if (!g.seed) g.seed = ((Math.random() * 2e9) | 0) || 1;
  S = {
    v: 3, gen: g, name: extra.name || 'Mi mundo', inv: new Array(INV_N).fill(null), sel: 0,
    tier: 0, del: {}, player: { x: 0.5 * T, y: 3.5 * T }, time: 200, won: false, autoSort: true, marks: [],
    alwaysDay: !!extra.alwaysDay, sandbox: !!extra.sandbox, surv: extra.surv !== false,
  };
  WORLD.clear(); _lk = -1; _lc = null; blocks = [];
  worldReset();
  const kit = extra.kit || 'normal';
  if (kit !== 'empty') {
    START_ITEMS.forEach(([id, n], i) => { if (i < 9) S.inv[i] = { id, n }; else slotsAdd(S.inv, id, n, false, FILL_ORDER); });
    if (kit === 'rich') for (const [id, n] of RICH_ITEMS) slotsAdd(S.inv, id, n, false, FILL_ORDER);
  }
  if (S.sandbox) { S.tier = TIERS.length; S.won = true; }
  const [sx, sy] = findSpawn(g);
  S.player = { x: (sx + 0.5) * T, y: (sy + 3.5) * T };
  addBlock(makeB('core', sx, sy - 1, 0));
}
// Sin inicio templado ni zona de inicio se puede nacer en el mar: busca tierra firme en espiral
function findSpawn(P) {
  const ok = (x, y) => { for (let dy = -1; dy <= 4; dy++) for (let dx = -1; dx <= 1; dx++) { const t = genTile(x + dx, y + dy, P); if (!walkable(t) || GI[t].solid || !buildable(t) && !GI[t].flora) return false; } return true; };
  if (ok(0, 0)) return [0, 0];
  for (let r = 16; r < 4000; r += 16) for (let a = 0; a < 16; a++) { const x = Math.round(Math.cos(a / 16 * Math.PI * 2) * r), y = Math.round(Math.sin(a / 16 * Math.PI * 2) * r); if (ok(x, y)) return [x, y]; }
  return [0, 0];
}
let worldReset = () => { };
