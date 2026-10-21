'use strict';
// Movimiento de objetos entre bloques. d = dirección en la que se mueve el objeto.
// accept(..., sim=true) solo comprueba, sin modificar nada.
let FLY = []; // objetos en vuelo (lanzador)
const isBelt = b => b.type === 'belt' || b.type === 'brassBelt';

function machineAccepts(b, id) {
  const d = BD[b.type];
  if (d.fuel && d.fuel.includes(id)) return (b.inv[id] || 0) < 16;
  if (d.fuel2 && d.fuel2.includes(id)) return (b.inv[id] || 0) < 8;
  if (b.type === 'furnace' && id === 'coal') return (b.inv.coal || 0) < 16;
  if (d.machine) return MACHINE_INPUTS[d.machine].has(id) && (b.inv[id] || 0) < 16;
  if (b.type === 'assembler') { const r = BENCH[b.recipe]; if (!r) return false; const q = benchReq(r); return q[id] > 0 && (b.inv[id] || 0) < Math.max(8, q[id] * 4); }
  return false;
}
function beltAccept(b, id, d, sim) {
  if (d === OPP(b.dir) || b.items.length >= 4) return false;
  const p = d === b.dir ? 0 : 0.5;
  for (const it of b.items) if (Math.abs(it.p - p) < 0.3) return false;
  if (!sim) b.items.push({ id, p });
  return true;
}
function coreAccept(id, sim) {
  const tier = TIERS[S.tier];
  if (tier && (tier.goal[id] || 0) - (S.del[id] || 0) > 0) {
    if (!sim) { S.del[id] = (S.del[id] || 0) + 1; ui.goalDirty = true; checkTier(); }
    return true;
  }
  if (slotsAdd(S.inv, id, 1, true) > 0) return false;
  if (!sim) invAdd(id, 1);
  return true;
}
function accept(t, id, d, sim) {
  if (!t) return false;
  switch (t.type) {
    case 'belt': case 'brassBelt': return beltAccept(t, id, d, sim);
    case 'chest': case 'vault': if (slotsAdd(t.slots, id, 1, true) > 0) return false; if (!sim) slotsAdd(t.slots, id, 1); return true;
    case 'depot': if (t.item && (t.item.id !== id || t.item.n >= STACK)) return false; if (!sim) { if (t.item) t.item.n++; else t.item = { id, n: 1 }; } return true;
    case 'trash': return true;
    case 'core': return coreAccept(id, sim);
    case 'splitter': case 'sorter': if (t.buf || d !== t.dir) return false; if (!sim) t.buf = id; return true;
    case 'ejector': if (t.buf || d === OPP(t.dir)) return false; if (!sim) t.buf = id; return true;
    case 'entangler': { // entra por detrás y sale por delante de otro enlace del mismo canal
      if (d !== t.dir || t.E < 1) return false;
      for (const o of L.entangler) if (o !== t && o.freq === t.freq && o.E >= 1 && accept(frontOf(o), id, o.dir, true)) { if (!sim) { accept(frontOf(o), id, o.dir, false); t.E -= 1; } return true; }
      return false;
    }
  }
  const def = BD[t.type];
  if (!def.inv) return false;
  if (def.dir && d === OPP(t.dir)) return false;
  if (!machineAccepts(t, id)) return false;
  if (!sim) dictAdd(t.inv, id, 1);
  return true;
}
function extractPeek(t, filter) {
  if (!t) return null;
  switch (t.type) {
    case 'chest': case 'vault': return slotsFirst(t.slots, filter);
    case 'depot': return t.item && (!filter || t.item.id === filter) ? t.item.id : null;
    case 'bench': { const o = t.slots[8]; return o && (!filter || o.id === filter) ? o.id : null; }
  }
  return t.out ? firstKey(t.out, filter) : null;
}
function extractTake(t, id) {
  switch (t.type) {
    case 'chest': case 'vault': slotsTake(t.slots, id, 1); return;
    case 'depot': if (--t.item.n <= 0) t.item = null; return;
    case 'bench': { const o = t.slots[8]; if (--o.n <= 0) t.slots[8] = null; return; }
  }
  dictAdd(t.out, id, -1);
}
function pushOut(b, dt) {
  b.ocd = (b.ocd || 0) - dt; if (b.ocd > 0) return;
  const k = firstKey(b.out); if (!k) return;
  if (accept(frontOf(b), k, b.dir, false)) { dictAdd(b.out, k, -1); b.ocd = 0.12; }
}
function beltTick(b, dt) {
  const its = b.items; if (!its.length) return;
  const v = runnable(b) ? Math.min(b.rpm / 16 * (b.type === 'brassBelt' ? 2 : 1), 10) : 0;
  if (v <= 0) return;
  if (its.length > 1) its.sort((a, c) => c.p - a.p);
  for (let i = 0; i < its.length; i++) {
    const it = its[i], lim = i === 0 ? 1 : its[i - 1].p - 0.3;
    it.p = Math.min(it.p + v * dt, Math.max(it.p, lim));
  }
  const f = its[0];
  if (f.p >= 1) { if (accept(frontOf(b), f.id, b.dir, false)) its.shift(); else f.p = 1; }
}
function extractorTick(b, dt) {
  b.cd -= dt; if (b.cd > 0 || b.powered || b.off) return;
  const src = backOf(b), dst = frontOf(b); if (!src || !dst) return;
  const id = extractPeek(src, b.filter);
  if (id && accept(dst, id, b.dir, false)) { extractTake(src, id); b.cd = 0.25; }
}
function splitterTick(b, dt) {
  b.cd -= dt; if (!b.buf || b.cd > 0) return;
  if (b.type === 'sorter') {
    const d = b.buf === b.filter ? (b.dir + 3) & 3 : b.dir;
    if (accept(at(b.x + DX[d], b.y + DY[d]), b.buf, d, false)) { b.buf = null; b.cd = 0.1; }
    return;
  }
  const dirs = [b.dir, (b.dir + 1) & 3, (b.dir + 3) & 3];
  for (let i = 0; i < 3; i++) {
    const d = dirs[(b.rr + i) % 3];
    if (accept(at(b.x + DX[d], b.y + DY[d]), b.buf, d, false)) { b.buf = null; b.rr = (b.rr + i + 1) % 3; b.cd = 0.1; return; }
  }
}
function armTick(b, dt) {
  if (b.swing > 0) b.swing = Math.max(0, b.swing - dt * 3);
  if (b.rpm <= 0 || !runnable(b)) return;
  b.cd -= dt * b.rpm / 32; if (b.cd > 0) return;
  const src = backOf(b), dst = frontOf(b); if (!src || !dst) return;
  let id = null;
  if (isBelt(src)) {
    let best = null; for (const it of src.items) if ((!b.filter || it.id === b.filter) && (!best || it.p > best.p)) best = it;
    if (best && accept(dst, best.id, b.dir, false)) { src.items.splice(src.items.indexOf(best), 1); id = best.id; }
  } else {
    const k = extractPeek(src, b.filter);
    if (k && accept(dst, k, b.dir, false)) { extractTake(src, k); id = k; }
  }
  if (id) { b.cd = 0.5; b.swing = 1; b.hold = id; }
}
function ejectorTick(b, dt) {
  if (!b.buf || b.rpm <= 0 || !runnable(b)) return;
  b.cd -= dt * b.rpm / 32; if (b.cd > 0) return;
  const tx = b.x + DX[b.dir] * b.dist, ty = b.y + DY[b.dir] * b.dist, t = at(tx, ty);
  if (t && accept(t, b.buf, b.dir, true)) {
    FLY.push({ id: b.buf, x0: b.x, y0: b.y, x1: tx, y1: ty, t: 0, dur: 0.25 + b.dist * 0.08, d: b.dir });
    b.buf = null; b.cd = 1; b.kick = 1;
  }
}
function flyTick(dt) {
  for (let i = FLY.length - 1; i >= 0; i--) {
    const f = FLY[i]; f.t += dt;
    if (f.t >= f.dur) { if (!f.sink && !accept(at(f.x1, f.y1), f.id, f.d, false)) invAdd(f.id, 1); FLY.splice(i, 1); }
  }
}
function logisticsTick(dt) {
  for (const b of L.belt) beltTick(b, dt);
  for (const b of L.brassBelt) beltTick(b, dt);
  for (const b of L.extractor) extractorTick(b, dt);
  for (const b of L.splitter) splitterTick(b, dt);
  for (const b of L.sorter) splitterTick(b, dt);
  for (const b of L.arm) armTick(b, dt);
  for (const b of L.ejector) { ejectorTick(b, dt); if (b.kick > 0) b.kick = Math.max(0, b.kick - dt * 4); }
  if (FLY.length) flyTick(dt);
}
