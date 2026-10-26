'use strict';
// =====================================================================================
//  Cubetas (datos en data/buckets.js), como en Minecraft:
//   · Vacía + clic en agua → se llena. En un lago o un río (agua alrededor) el agua no se acaba;
//     un charco suelto (agua por menos de dos lados) sí se vacía. La de hierro coge lava (y ahí queda basalto).
//   · Llena + clic en el suelo → viertes el agua (o la lava). En tierra de cultivo riega 3×3.
//   · F (usar) con la de agua: bebes y te quedas la cubeta.
// =====================================================================================
let _bkCd = 0;
const isWater = (x, y) => GI[gnd(x, y)].liquid === 'water';
function bucketAct(id, tx, ty) {
  const g = gnd(tx, ty), gi = GI[g], empty = BUCKETS[id], full = BUCKET_FULL[id];
  if (empty) {
    if (!gi.liquid) { toastErr('Haz clic en agua para llenar la cubeta'); return; }
    const to = empty[gi.liquid]; if (!to) { toastErr(gi.liquid === 'lava' ? 'La madera arde: hace falta una cubeta de hierro' : 'Esto no se puede coger con la cubeta'); return; }
    if (gi.liquid === 'lava') setGround(tx, ty, G.BASALT);
    else { let n = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (isWater(tx + dx, ty + dy)) n++; if (n < 2) setGround(tx, ty, gi.u >= 0 ? gi.u : G.SAND); }
    invTake(id, 1); if (invAdd(to, 1) > 0) toastErr('Inventario lleno'); typeof fxBurst === 'function' && fxBurst(tx * T + 16, ty * T + 16, 6, { col: gi.liquid === 'lava' ? '#ff8a3a' : '#8ac8ff', sp: 30, life: 0.45 }); tone(gi.liquid === 'lava' ? 180 : 420, 0.12, 'sine', 0.04, 0.6); return;
  }
  if (!full) return; const [back, liq] = full;
  if (liq === 'water' && typeof isFarm === 'function' && isFarm(g)) { let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (typeof waterTile === 'function' && waterTile(tx + dx, ty + dy)) n++; if (!n) { toastErr('Esa tierra ya está regada'); return; } }
  else {
    if (at(tx, ty)) { toastErr('Ahí hay un bloque'); return; } if (gi.liquid) { toastErr('Ahí ya hay líquido'); return; }
    if (gi.solid || (gi.hp && gi.tree)) { toastErr('Viértela en el suelo libre'); return; }
    const pl = S.player; if (Math.floor(pl.x / T) === tx && Math.floor((pl.y + 6) / T) === ty) { toastErr('No la viertas a tus pies'); return; }
    setGround(tx, ty, liq === 'lava' ? G.LAVA : G.WATER);
  }
  invTake(id, 1); if (invAdd(back, 1) > 0) toastErr('Inventario lleno'); typeof fxBurst === 'function' && fxBurst(tx * T + 16, ty * T + 16, 8, { col: liq === 'lava' ? '#ff8a3a' : '#8ac8ff', sp: 40, life: 0.5 }); tone(liq === 'lava' ? 140 : 300, 0.15, 'sine', 0.04, 0.5);
}
// Clic con la cubeta en la mano: coger o verter (no pica)
{ const m0 = updateMining; updateMining = fdt => {
  _bkCd -= fdt; const id = heldId();
  if (mouse.down && !ui.hand && !selectedBlock() && (BUCKETS[id] || BUCKET_FULL[id])) { if (_bkCd <= 0 && inReach(mouse.tx, mouse.ty)) { _bkCd = 0.35; bucketAct(id, mouse.tx, mouse.ty); } ui.mine.t = 0; return; }
  m0(fdt);
}; }
// Icono: un cubo con asa; lleno, con su líquido
function drawBucketIcon(c, id, s) {
  const r = s / 2, metal = id.startsWith('bucket'), body = metal ? '#b8bcc4' : '#9a7448', dk = metal ? '#6a6e76' : '#5a4228', fill = BUCKET_FULL[id] ? (BUCKET_FULL[id][1] === 'lava' ? '#ff6a1a' : '#4aa8ec') : null;
  c.save(); c.lineJoin = 'round'; c.strokeStyle = dk; c.lineWidth = r * 0.13; c.beginPath(); c.arc(0, -r * 0.25, r * 0.62, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  c.fillStyle = body; c.strokeStyle = 'rgba(0,0,0,.65)'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(-r * 0.7, -r * 0.3); c.lineTo(r * 0.7, -r * 0.3); c.lineTo(r * 0.52, r * 0.8); c.lineTo(-r * 0.52, r * 0.8); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = dk; if (metal) { c.fillRect(-r * 0.66, -r * 0.02, r * 1.32, r * 0.1); c.fillRect(-r * 0.58, r * 0.45, r * 1.16, r * 0.1); } else for (const x of [-0.3, 0.05, 0.38]) c.fillRect(x * r, -r * 0.25, r * 0.06, r * 1.0);
  c.fillStyle = fill || '#2a2622'; c.beginPath(); c.ellipse(0, -r * 0.3, r * 0.66, r * 0.17, 0, 0, 7); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 0.8; c.stroke();
  if (fill) { c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-r * 0.2, -r * 0.33, r * 0.2, r * 0.05, 0, 0, 7); c.fill(); if (fill === '#ff6a1a') { c.shadowColor = '#ffb04a'; c.shadowBlur = r * 0.6; c.fillStyle = '#ffd060'; c.beginPath(); c.arc(r * 0.2, -r * 0.3, r * 0.1, 0, 7); c.fill(); } }
  c.restore();
}
{ const d0 = drawItemPath; drawItemPath = (c, id, s) => (BUCKETS[id] || BUCKET_FULL[id]) ? drawBucketIcon(c, id, s) : d0(c, id, s); }
