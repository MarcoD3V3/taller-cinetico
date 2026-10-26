'use strict';
// =====================================================================================
//  Automatización (datos en data/automation.js):
//   · Plantones que crecen en árboles (≈7 min; antes con agua cerca).
//   · Talador y plantador automáticos; cosechadora automática de cultivos.
//   · Taladros por nivel de veta, con vetas que se agotan y consumibles en los grandes.
//   · Almacén central que acepta todo por cintas y embudos.
//  Ritmos pensados para que automatizar compense sin regalar: cuanto más valioso, más lento,
//  más giro hace falta y antes se acaba la veta.
// =====================================================================================
const SAP_GROW = 420;
const DRILL_T = { drill: { max: 1, rpm: 1 }, drillReinforced: { max: 2, rpm: 32 }, drillIndustrial: { max: 3, rpm: 64, lub: 8 }, drillCore: { max: 9, rpm: 128, lub: 6, bit: 12 } };
const VEIN_EVERY = [3, 4, 7, 11, 16, 22, 30], VEIN_RES = [400, 300, 120, 60, 30, 18, 12];
const veinLv = g => Math.min(6, g.need ? g.need.lv || 0 : 0);
const outTot = b => { let n = 0; for (const k in b.out) n += b.out[k] > 0 ? b.out[k] : 0; return n; };
// Sacar por detrás (talador, plantador y cosechadora miran a su trabajo)
function pushBack(b, dt) {
  b.ocd = (b.ocd || 0) - dt; if (b.ocd > 0) return; const k = firstKey(b.out); if (!k) return;
  if (accept(backOf(b), k, OPP(b.dir), false)) { dictAdd(b.out, k, -1); b.ocd = 0.15; }
}
function veinLeft(x, y, lv) { const R = S.res || (S.res = {}), k = x + ',' + y; if (R[k] === undefined) R[k] = Math.round(VEIN_RES[lv] * (0.7 + hash2(x, y, 77) * 0.6)); return R[k]; }
function drillTick(b, dt) {
  const D = DRILL_T[b.type], g = GI[gnd(b.x, b.y)];
  if (!g.drop || g.tree || g.liquid) { b.st = 'Aquí no hay veta'; return pushOut(b, dt); }
  const lv = veinLv(g); if (lv > D.max) { b.st = `Esta veta necesita una máquina mejor (nivel ${lv})`; return pushOut(b, dt); }
  if (!runnable(b) || (b.rpm || 0) < D.rpm) { b.st = `Necesita ≥${D.rpm} RPM`; return pushOut(b, dt); }
  if (outTot(b) >= 16) { b.st = 'Lleno: saca lo extraído'; return pushOut(b, dt); }
  if (D.lub && !(b.lubL > 0)) { if ((b.inv.lubricant || 0) > 0) { dictAdd(b.inv, 'lubricant', -1); b.lubL = D.lub; } else { b.st = 'Sin lubricante'; return pushOut(b, dt); } }
  if (D.bit && !(b.bitL > 0)) { if ((b.inv.drillBit || 0) > 0) { dictAdd(b.inv, 'drillBit', -1); b.bitL = D.bit; } else { b.st = 'Sin brocas'; return pushOut(b, dt); } }
  b.st = ''; b.prog = (b.prog || 0) + dt * Math.min(2, b.rpm / Math.max(8, D.rpm)) * (b.boostT > S.time ? 2 : 1);
  if (b.prog >= VEIN_EVERY[lv]) {
    b.prog = 0; dictAdd(b.out, g.drop, 1); if (D.lub) b.lubL--; if (D.bit) b.bitL--;
    const k = b.x + ',' + b.y, left = veinLeft(b.x, b.y, lv) - 1; S.res[k] = left;
    if (S.res[k] <= 0) { delete S.res[k]; setGround(b.x, b.y, g.u >= 0 ? g.u : (G.STONEFLOOR ?? G.DIRT)); if (dist((b.x + 0.5) * T, (b.y + 0.5) * T, S.player.x, S.player.y) < 20 * T) toast(`⛏ Se ha agotado la veta de ${g.n.toLowerCase()}`); }
  }
  pushOut(b, dt);
}
function fellerTick(b, dt) {
  const x = b.x + DX[b.dir], y = b.y + DY[b.dir], g = GI[gnd(x, y)];
  if (!g.tree || at(x, y)) { b.st = 'Esperando un árbol'; b.prog = 0; return pushBack(b, dt); }
  if (!runnable(b) || (b.rpm || 0) < 16) { b.st = 'Necesita ≥16 RPM'; return pushBack(b, dt); }
  if (outTot(b) >= 24) { b.st = 'Lleno'; return pushBack(b, dt); }
  b.st = ''; b.prog = (b.prog || 0) + dt * Math.min(2, b.rpm / 32);
  if (b.prog >= 9) { b.prog = 0; if (g.drop) dictAdd(b.out, g.drop, 2 + (Math.random() < 0.4 ? 1 : 0)); if (g.extra && Math.random() < g.extra[1]) dictAdd(b.out, g.extra[0], 1); if (Math.random() < 0.55) dictAdd(b.out, 'sapling', 1);
    setGround(x, y, g.u >= 0 ? g.u : G.GRASS); if (typeof burst === 'function') burst(x, y, '#6a8a3a'); }
  pushBack(b, dt);
}
const sapOk = (x, y) => { const g = gnd(x, y); return !at(x, y) && typeof isSoil === 'function' && isSoil(g) && !GI[g].tree; };
function planterTick(b, dt) {
  b.pcd = (b.pcd || 0) - dt; if (b.pcd > 0) return; b.pcd = 2;
  const x = b.x + DX[b.dir], y = b.y + DY[b.dir];
  if (!runnable(b)) return; if (!((b.inv.sapling || 0) > 0)) { b.st = 'Sin plantones'; return; }
  if (!sapOk(x, y)) { b.st = at(x, y) && at(x, y).type === 'sapling' ? 'Creciendo…' : 'Delante no se puede plantar'; return; }
  dictAdd(b.inv, 'sapling', -1); const s = makeB('sapling', x, y, 0); s.g = 0; addBlock(s); b.st = '';
}
function harvesterTick(b, dt) {
  if (!runnable(b) || (b.rpm || 0) < 16) { b.st = 'Necesita ≥16 RPM'; return pushBack(b, dt); }
  b.hcd = (b.hcd || 0) - dt * Math.min(2, b.rpm / 32); if (b.hcd > 0) return pushBack(b, dt); b.hcd = 1.5;
  if (outTot(b) >= 32) { b.st = 'Lleno'; return pushBack(b, dt); }
  const cx = b.x + DX[b.dir] * 2, cy = b.y + DY[b.dir] * 2; b.st = 'Nada maduro';
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const c = cropAt(cx + dx, cy + dy); if (!c || cropStage(c) < 3) continue; const d = CROP[c.crop]; if (!d) continue;
    const [a, z] = d.y; dictAdd(b.out, d.item, a + Math.floor(Math.random() * (z - a + 1))); if (Math.random() < 0.35) dictAdd(b.out, d.seed, 1);
    c.g = d.re ? [0, 0.25, 0.6][d.re] || 0.6 : 0; c.fert = 0; c._tv = -1; b.st = ''; break; }
  pushBack(b, dt);
}
function saplingTick(b, dt) {
  const near = typeof farmNearWater === 'function' && farmNearWater(b.x, b.y); b.g = (b.g || 0) + dt / SAP_GROW * (near ? 1.3 : 1);
  if (b.g >= 1) { const B = BIOMES[biomeOf(b.x, b.y)], t = (B && B.treeI && B.treeI.length && B.treeI[0][0]) || G.TREE; delBlock(b); setGround(b.x, b.y, t, GI[t].hp || 0); }
  else { const st = Math.floor(b.g * 4); if (st !== b._st) { b._st = st; b._tv = -1; } }
}
// El taladro viejo pasa a usar estas reglas (antes sacaba sin fin)
{ const m0 = machinesTick; machinesTick = dt => {
  const sv = L.drill; L.drill = []; try { m0(dt); } finally { L.drill = sv; }
  for (const t in DRILL_T) for (const b of L[t] || []) drillTick(b, dt);
  for (const b of L.treeFeller || []) fellerTick(b, dt);
  for (const b of L.autoPlanter || []) planterTick(b, dt);
  for (const b of L.autoHarvester || []) harvesterTick(b, dt);
}; }
{ const t0 = tick; tick = dt => { t0(dt); if (S && L.sapling) for (let i = L.sapling.length - 1; i >= 0; i--) saplingTick(L.sapling[i], dt); }; }
// Plantar a mano: solo en hierba o tierra
{ const c0 = canPlace; canPlace = (type, x, y) => type === 'sapling' && !sapOk(x, y) ? 'Planta el plantón en hierba o tierra libre' : c0(type, x, y); }
// Talar a mano también da plantones (a veces)
{ const d0 = damageTile; damageTile = (x, y) => { const g = GI[gnd(x, y)]; d0(x, y); if (S && g.tree && !GI[gnd(x, y)].tree && dist((x + 0.5) * T, (y + 0.5) * T, S.player.x, S.player.y) < 6 * T && Math.random() < 0.45) { invAdd('sapling', 1); fxText(x * T + 16, y * T, '+1 Plantón', '#9fe09a'); } }; }
// Almacén central: como un cofre grande para cintas y embudos
{ const a0 = accept; accept = (t, id, d, sim) => { if (t && t.type === 'storageHub') { if (slotsAdd(t.slots, id, 1, true) > 0) return false; if (!sim) slotsAdd(t.slots, id, 1); return true; } return a0(t, id, d, sim); }; }
{ const p0 = extractPeek; extractPeek = (t, f) => t.type === 'storageHub' ? slotsFirst(t.slots, f) : p0(t, f); }
{ const e0 = extractTake; extractTake = (t, id) => t.type === 'storageHub' ? slotsTake(t.slots, id, 1) : e0(t, id); }
// La tarjeta del cursor dice cómo va cada máquina
{ const b0 = blockCard; blockCard = b => {
  let h = b0(b), extra = '';
  if (DRILL_T[b.type]) { const g = GI[gnd(b.x, b.y)]; if (g.drop && !g.tree) { const lv = veinLv(g); extra = `⛏ Veta: ${veinLeft(b.x, b.y, lv)} restantes · 1 cada ${VEIN_EVERY[lv]} s a ${DRILL_T[b.type].rpm} RPM`; } }
  if (b.type === 'sapling') extra = `🌱 Creciendo: ${Math.round((b.g || 0) * 100)} %`;
  if (b.st) extra += (extra ? '<br>' : '') + '⚠ ' + esc(b.st);
  return extra ? h + `<div class="small mut">${extra}</div>` : h;
}; }
// Dibujo del plantón: crece por etapas
if (typeof DRAW !== 'undefined') DRAW.sapling = { k: b => 's' + Math.floor((b.g || 0) * 4), a: null, b: (c, b) => {
  const st = Math.floor((b.g || 0) * 4), h = 6 + st * 4;
  c.fillStyle = 'rgba(60,40,20,.45)'; c.beginPath(); c.ellipse(0, 9, 7, 2.5, 0, 0, 7); c.fill();
  c.strokeStyle = '#6a4a2a'; c.lineWidth = 1.6 + st * 0.4; c.beginPath(); c.moveTo(0, 9); c.lineTo(0, 9 - h); c.stroke();
  c.fillStyle = st >= 3 ? '#3e8a34' : '#5ab048'; for (let i = 0; i <= st + 1; i++) { const a = i * 2.1, r = 3 + st; c.beginPath(); c.ellipse(Math.cos(a) * r * 0.7, 9 - h + Math.sin(a) * r * 0.4, 3 + st * 0.8, 2 + st * 0.5, a, 0, 7); c.fill(); }
} };
