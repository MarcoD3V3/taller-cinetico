'use strict';
// =====================================================================================
//  Romper lo construido lleva tiempo (clic derecho mantenido), según de qué está hecho
//  y con qué lo golpeas:
//   · Ligero (cintas, cables, tuberías, cables de señal): casi al instante.
//   · Blando (tela, papel, decoración): rápido incluso con la mano.
//   · Madera: mejor con hacha. · Piedra, ladrillo, vidrio y metal: mejor con pico o martillo.
//   · Máquinas: un poco más; la llave inglesa las desmonta enseguida.
//  Cuanto más avanzado (nivel) es el bloque, más aguanta. Construcción y tu fuerza ayudan.
//  Los suelos construidos se quitan de una vez (tablones con hacha, empedrado y ladrillo
//  con pico), te devuelven su material y dejan tierra (no un hoyo).
// =====================================================================================
const BR_LIGHT = /belt|conveyor|cable|pipe|wire|rail|chute|shaft|cog|tube/i;
const BR_STONE = new Set(['stone', 'brick', 'cement', 'concrete', 'obsidian', 'basalt', 'glass', 'porcelain', 'clay', 'mortar', 'gravel', 'sand', 'quartz', 'tintedGlass', 'mirror']);
const BR_WOOD = new Set(['planks', 'log', 'stick', 'bamboo', 'reeds', 'cardboard']);
const _brMat = {};
// Material de un bloque, deducido de su receta
function blockMat(type) {
  if (type in _brMat) return _brMat[type];
  const d = BD[type], r = RECIPE_FOR[type]; let m = 'soft';
  const nm = type + ' ' + d.n;
  if (d.cable || d.pipe || BR_LIGHT.test(type)) m = 'light';
  else if (/wood|plank|madera|tabl/i.test(nm)) m = 'wood';
  else if (/stone|brick|piedra|ladrillo|cristal|glass|obsid/i.test(nm)) m = 'stone';
  else if (r) {
    const ids = [r.core, ...r.teeth], metal = ids.some(id => ITEMS[id] && (ITEMS[id].cat === 1 || ITEMS[id].cat === 5 || /Ingot|Plate|Rod|Gear|Ring|Nugget|Wire/.test(id)));
    m = metal ? 'metal' : ids.some(id => BR_STONE.has(id)) ? 'stone' : ids.some(id => BR_WOOD.has(id)) ? 'wood' : 'soft';
  } else if (d.solid) m = 'stone';
  return (_brMat[type] = m);
}
const BR_BASE = { light: 0.18, soft: 0.4, wood: 0.9, stone: 1.3, metal: 1.5 };
const BR_N = { light: 'ligero', soft: 'blando', wood: 'madera', stone: 'piedra', metal: 'metal' };
// Segundos para romper el bloque b con lo que llevas en la mano
function breakTime(b) {
  if (S.sandbox) return 0.05;
  const d = BD[b.type], m = blockMat(b.type), id = !ui.hand ? heldId() : null, tool = id && TOOLS[id], k = tool && tool.kind;
  let t = BR_BASE[m] + (m === 'light' ? 0 : (d.tier || 0) * 0.22) + (d.machine || d.kin || d.pw || d.inv ? 0.4 : 0);
  if (id === 'wrench' && m !== 'soft') t *= 0.25;
  else if (m === 'wood') t *= tool && KIND_AS.axe.includes(k) ? 1 / (tool.mult * TK_EFF[k]) : tool && KIND_AS.pick.includes(k) ? 1 : 2;
  else if (m === 'stone' || m === 'metal') t *= tool && KIND_AS.pick.includes(k) ? 1 / (tool.mult * TK_EFF[k]) : tool ? 1.8 : 2.8;
  t *= diff() / workMul() / (1 + 0.04 * lvOf('build'));
  return Math.min(6, Math.max(0.08, t));
}
// Progreso: ui.bb = { x, y, t, need }
function breakTick(dt) {
  if (!mouse.rdown || !mouse.rblock || ui.open) { ui.bb = null; return; }
  const tx = mouse.tx, ty = mouse.ty, b = at(tx, ty);
  if (!b) { ui.bb = null; return; }
  if (b.type === 'core') { if (!ui.bb || ui.bb.x !== tx) toastErr('El Núcleo no se puede quitar'); ui.bb = { x: tx, y: ty, t: 0, need: 1e9 }; return; }
  if (!inReach(tx, ty)) { ui.bb = null; return; }
  if (!ui.bb || ui.bb.x !== tx || ui.bb.y !== ty) ui.bb = { x: tx, y: ty, t: 0, need: breakTime(b), hit: 0 };
  const bb = ui.bb; bb.t += dt; bb.hit -= dt;
  if (bb.hit <= 0) { bb.hit = 0.28; P.swing = 0.2; P.swingA = Math.atan2((ty + 0.5) * T - S.player.y, (tx + 0.5) * T - S.player.x); noise(0.04, 0.025, blockMat(b.type) === 'metal' ? 3500 : blockMat(b.type) === 'stone' ? 1800 : 900); }
  if (bb.t >= bb.need) {
    const col = (BD[b.type].look && BD[b.type].look.c) || '#a0a0a0';
    removeAt(tx, ty); burst(tx, ty, col); gainXP('build', 1);
    const id = heldId(); if (!ui.hand && TOOLS[id] && blockMat(b.type) !== 'light') wearHeld(1);
    if (survOn()) S.pc.stam = Math.max(0, S.pc.stam - (blockMat(b.type) === 'light' ? 0 : 0.6));
    ui.bb = null;
  }
}
// Grietas y barra sobre el bloque que estás rompiendo
function drawBreak(ctx) {
  const bb = ui.bb; if (!bb || bb.need > 1e6 || bb.need < 0.25) return;
  const p = Math.min(1, bb.t / bb.need), tx = bb.x, ty = bb.y, n = 1 + Math.floor(p * 7);
  ctx.strokeStyle = 'rgba(15,12,10,.85)'; ctx.lineWidth = 1.4; ctx.beginPath();
  for (let i = 0; i < n; i++) { const a = i * 2.4 + 0.6, r1 = 3 + hash2(tx, ty, i) * 3, r2 = 6 + p * 10 + hash2(tx, ty, i + 9) * 4; ctx.moveTo(tx * T + 16 + Math.cos(a) * r1, ty * T + 16 + Math.sin(a) * r1); ctx.lineTo(tx * T + 16 + Math.cos(a + 0.3) * r2, ty * T + 16 + Math.sin(a + 0.3) * r2); }
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(tx * T + 4, ty * T + 27, 24, 3); ctx.fillStyle = '#ff9a5a'; ctx.fillRect(tx * T + 4, ty * T + 27, 24 * p, 3);
}
// ---------- Suelos construidos ----------
for (const k of ['PLANKFLOOR', 'COBBLE', 'BRICKFLOOR']) { const g = GI[G[k]]; if (!g) continue; g.hp = 1; g.u = G.DIRT; g.built = 1; g.floorK = k === 'PLANKFLOOR' ? 'tree' : 'rock'; g.mt = k === 'PLANKFLOOR' ? 1.1 : 1.5; }
