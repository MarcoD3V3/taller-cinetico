'use strict';
// Máquinas de procesado, generadores y extractores.
function powerDraw(b, dt, mult = 1) {
  const p = BD[b.type].pw; if (!p || p.role !== 'use') return 1;
  const need = p.rate * dt * mult; if (need <= 0) return 1;
  if (b.E >= need) { b.E -= need; return 1; }
  const f = b.E / need; b.E = 0; return f;
}
function canStart(b, r) {
  if (!has(b.inv, r.in)) return false;
  if (r.fin) for (const k in r.fin) if (fluidAmt(b, k) < r.fin[k]) return false;
  if (r.fout) for (const k in r.fout) if (tankRoom(b, k) < r.fout[k]) return false;
  return total(b.out) < 32;
}
function procTick(b, dt) {
  const d = BD[b.type], list = RECIPES[d.machine];
  if (!runnable(b)) return;
  if (b.cur < 0) { for (let i = 0; i < list.length; i++) if (canStart(b, list[i])) { b.cur = i; b.prog = 0; break; } if (b.cur < 0) return; }
  const r = list[b.cur];
  if (!r || !canStart(b, r)) { b.cur = -1; return; }
  let sp;
  if (b.type === 'furnace') {
    if ((b.fuel || 0) <= 0 && (b.inv.coal || 0) > 0 && !(r.in.coal)) { dictAdd(b.inv, 'coal', -1); b.fuel = 8; }
    sp = (b.fuel || 0) > 0 ? 1 : 0;
  } else if (d.burn) { sp = loadFuel(b) ? 1 : 0; if (sp) b.fuel -= dt; }
  else if (d.kin) sp = (d.minRpm && b.rpm < d.minRpm) ? 0 : b.rpm / 32;
  else if (d.pw) sp = powerDraw(b, dt) * (b.type === 'efurnace' ? 2 : 1);
  else sp = 1;
  if (sp <= 0) return;
  if (b.boostT > S.time) sp *= 2; // acelerador crónico cerca
  b.prog += dt * sp;
  if (b.prog >= r.t) {
    take(b.inv, r.in);
    if (r.fin) for (const k in r.fin) tankTake(b, k, r.fin[k]);
    if (r.out) { give(b.out, r.out); if (b.qual > 0) { give(b.out, r.out); b.qual--; } }
    stationFx(b);
    if (r.fout) for (const k in r.fout) tankPut(b, k, r.fout[k]);
    if (b.type === 'furnace') b.fuel--;
    b.cur = -1; b.prog = 0;
  }
}
function firstFuel(b) { for (const k of BD[b.type].fuel) if ((b.inv[k] || 0) > 0) return k; return null; }
function loadFuel(b) {
  if ((b.fuel || 0) > 0) return true;
  const k = firstFuel(b); if (!k) return false;
  dictAdd(b.inv, k, -1); b.fuel = FUEL[k]; return true;
}
function produce(b, id, every, speed, dt) {
  if (total(b.out) >= 16 || speed <= 0) return;
  b.prog += dt * speed;
  if (b.prog >= every) { b.prog = 0; dictAdd(b.out, id, 1); }
}
// Todas las máquinas con recetas (las nuevas se añaden solas)
const PROC_TYPES = Object.keys(BD).filter(k => BD[k].machine && k !== 'digester');
function genTick(dt) {
  const light = daylight();
  for (const b of L.crank) if (b.timer > 0) b.timer -= dt;
  for (const b of L.steam) { loadFuel(b); if ((b.fuel || 0) > 0 && b.comp && b.comp.used > 0) b.fuel -= dt; }
  for (const b of L.combGen) { const cap = BD.combGen.pw.cap; if (b.E < cap - 1 && loadFuel(b)) { b.fuel -= dt; b.E = Math.min(cap, b.E + 120 * dt); } b.lit = (b.fuel || 0) > 0; }
  for (const b of L.dynamo) b.E = Math.min(BD.dynamo.pw.cap, b.E + b.rpm * 2 * dt);
  for (const b of L.solar) b.E = Math.min(BD.solar.pw.cap, b.E + 30 * light * dt);
  for (const b of L.turbine) {
    const s = b.tanks.s, cap = BD.turbine.pw.cap;
    const use = Math.min(s.a, 40 * dt, (cap - b.E) / 8);
    if (use > 0) { s.a -= use; if (s.a <= 1e-6) { s.a = 0; s.t = null; } b.E += use * 8; b.spin = use / (40 * dt); } else b.spin = 0;
  }
  for (const b of L.gasGen) {
    const g = b.tanks.g, cap = BD.gasGen.pw.cap;
    const use = Math.min(g.a, 6 * dt, (cap - b.E) / 50);
    if (use > 0) { g.a -= use; if (g.a <= 1e-6) { g.a = 0; g.t = null; } b.E += use * 50; b.lit = true; } else b.lit = false;
  }
  // Reactor de fisión: cada barra dura 120 s y convierte agua en vapor
  for (const b of L.reactor) {
    const w = b.tanks.w, s = b.tanks.s;
    if ((b.fuel || 0) <= 0 && (b.inv.fuelRod || 0) > 0) { dictAdd(b.inv, 'fuelRod', -1); b.fuel = 120; b.spent = true; }
    if ((b.fuel || 0) > 0) {
      b.fuel -= dt; if (b.fuel <= 0 && b.spent) { dictAdd(b.out, 'depletedRod', 1); b.spent = false; }
      const c = Math.min(w.a, 200 * dt, s.c - s.a); if (c > 0) { w.a -= c; if (w.a <= 1e-6) { w.a = 0; w.t = null; } s.a += c; s.t = 'steam'; }
      b.lit = true;
    } else b.lit = false;
  }
  for (const b of L.voidGen) { const cap = BD.voidGen.pw.cap; if (b.E < cap - 1) { if ((b.fuel || 0) <= 0) { const k = BD.voidGen.fuel2.find(f => (b.inv[f] || 0) > 0); if (k) { dictAdd(b.inv, k, -1); b.fuel = k === 'voidCore' ? 600 : 30; } } if ((b.fuel || 0) > 0) { b.fuel -= dt; b.E = Math.min(cap, b.E + 1000 * dt); } } b.lit = (b.fuel || 0) > 0; }
  for (const b of L.kineticGen) { if ((b.fuel || 0) <= 0 && (b.inv.kineticCore || 0) > 0) { dictAdd(b.inv, 'kineticCore', -1); b.fuel = 300; } if ((b.fuel || 0) > 0 && b.comp && b.comp.used > 0) b.fuel -= dt; }
  for (const b of L.airSeparator) if (runnable(b) && tankRoom(b, 'nitrogen') > 0) tankPut(b, 'nitrogen', powerDraw(b, dt) * 20 * dt);
  // Acelerador crónico: marca a sus 8 vecinos para que trabajen el doble
  for (const b of L.chronoAccel) {
    if (!runnable(b) || powerDraw(b, dt) < 0.99) { b.lit = false; continue; }
    b.lit = true;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const n = at(b.x + dx, b.y + dy); if (n && n !== b) n.boostT = S.time + 0.25; }
  }
  for (const b of L.emotor) { const need = 80 * dt; if (b.E >= need) { b.E -= need; b.ep = true; } else b.ep = false; }
  for (const b of L.boiler) {
    const w = b.tanks.w, g = b.tanks.g, s = b.tanks.s;
    const can = Math.min(w.a, 60 * dt, s.c - s.a);
    let burning = false;
    if (can > 0) {
      if (g.a > 0) { const u = Math.min(g.a, 4 * dt); g.a -= u; if (g.a <= 1e-6) { g.a = 0; g.t = null; } burning = true; }
      else if (loadFuel(b)) { b.fuel -= dt; burning = true; }
    }
    if (burning) { w.a -= can; if (w.a <= 1e-6) { w.a = 0; w.t = null; } s.a += can; s.t = 'steam'; }
    b.lit = burning;
  }
}
function benchReq(r) {
  if (r._req) return r._req;
  const q = { [r.core]: 1 }; for (const t of r.teeth) q[t] = (q[t] || 0) + 1; if (r.cat) q[r.cat] = (q[r.cat] || 0) + 1;
  return r._req = q;
}
function benchTick(b, dt) {
  const s = b.slots, core = s[0] ? s[0].id : null;
  if (!core) { b.prog = 0; b.rcp = null; return; }
  const teeth = []; for (let i = 1; i <= 6; i++) if (s[i]) teeth.push(s[i].id);
  const r = benchMatch(core, teeth); b.rcp = r;
  if (!r || r.tier > S.tier) { b.prog = 0; return; }
  const o = s[8]; if (o && (o.id !== r.out || o.n + r.n > STACK)) return;
  if (r.cat && !(s[7] && s[7].id === r.cat)) return;
  let sp = r.rpm > 0 ? (b.rpm >= r.rpm ? b.rpm / 32 : 0) : (b.rpm > 0 ? b.rpm / 32 : 0.6);
  if (s[7] && s[7].id === 'redstone') sp *= 2;
  if (sp <= 0) return;
  b.prog += dt * sp;
  const tt = r.rpm >= 64 ? 3 : r.rpm >= 32 ? 2 : 1;
  if (b.prog >= tt) {
    b.prog = 0;
    for (let i = 0; i <= 6; i++) if (s[i]) { if (--s[i].n <= 0) s[i] = null; }
    if (s[7]) { if (r.cat) { if (--s[7].n <= 0) s[7] = null; } else if (s[7].id === 'redstone') { b.cat = ((b.cat || 0) + 1) % 4; if (b.cat === 0 && --s[7].n <= 0) s[7] = null; } }
    const n2 = r.n * (b.qual > 0 ? 2 : 1); if (b.qual > 0) b.qual--;
    if (s[8]) s[8].n = Math.min(STACK, s[8].n + n2); else s[8] = { id: r.out, n: n2 };
    stationFx(b);
    b.made = (b.made || 0) + 1;
  }
}
function assemblerTick(b, dt) {
  const r = BENCH[b.recipe]; if (!r || !runnable(b) || r.tier > S.tier) return;
  if (b.rpm < Math.max(1, r.rpm)) return;
  const q = benchReq(r); if (!has(b.inv, q) || total(b.out) >= 32) { if (!has(b.inv, q)) b.prog = 0; return; }
  b.prog += dt * b.rpm / 32;
  if (b.prog >= 2) { b.prog = 0; take(b.inv, q); dictAdd(b.out, r.out, r.n); }
}
function machinesTick(dt) {
  for (const type of PROC_TYPES) for (const b of L[type]) { procTick(b, dt); pushOut(b, dt); }
  for (const b of L.drill) {
    const drop = GI[gnd(b.x, b.y)].drop;
    if (drop && runnable(b)) produce(b, drop, 2.5, b.rpm / 32 * (b.boostT > S.time ? 2 : 1), dt);
    pushOut(b, dt);
  }
  for (const b of L.treetap) { if (GI[gnd(b.x, b.y)].tree && runnable(b)) produce(b, 'latex', 5, 1, dt); pushOut(b, dt); }
  for (const b of L.mpump) { const l = runnable(b) && nearLiquid(b.x, b.y); if (l) tankPut(b, l, b.rpm / 32 * 60 * dt); }
  for (const b of L.derrick) if (runnable(b) && gnd(b.x, b.y) === G.OIL) tankPut(b, 'oil', b.rpm / 32 * 50 * dt);
  for (const b of L.epump) {
    if (!runnable(b)) continue;
    const onOil = gnd(b.x, b.y) === G.OIL, type = onOil ? 'oil' : nearLiquid(b.x, b.y);
    if (!type || tankRoom(b, type) <= 0) continue;
    tankPut(b, type, powerDraw(b, dt) * (onOil ? 60 : 120) * dt);
  }
  for (const b of L.gasx) {
    if (!runnable(b) || gnd(b.x, b.y) !== G.GAS || tankRoom(b, 'gas') <= 0) continue;
    tankPut(b, 'gas', powerDraw(b, dt) * 50 * dt);
  }
  for (const b of L.elamp) b.lit = powerDraw(b, dt) > 0.5;
  for (const b of L.digester) procTick(b, dt);
  for (const b of L.geotherm) if (nearLiquid(b.x, b.y) === 'lava') b.E = Math.min(BD.geotherm.pw.cap, b.E + 240 * dt);
  for (const b of L.beehive) {
    if (!b.flw || (b.fcd = (b.fcd || 0) - dt) <= 0) { b.fcd = 10; let n = 0; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const t = gnd(b.x + dx, b.y + dy); if (t === G.FLOWERS || t === G.CHERRY) n++; } b.flw = n; }
    if (b.flw && total(b.out) < 16) produce(b, 'honeycomb', 30 / Math.min(b.flw, 20), 1, dt);
  }
  for (const b of L.bench) benchTick(b, dt);
  for (const b of L.reactor) pushOut(b, dt);
  // Pozo gravitatorio: cada medio segundo se traga un objeto de las cintas cercanas
  for (const b of L.gravityWell) {
    b.cd = (b.cd || 0) - dt; if (b.cd > 0 || !runnable(b) || total(b.out) >= 64 || powerDraw(b, dt) < 0.5) continue; b.cd = 0.5;
    for (const t of [...L.belt, ...L.brassBelt]) { if (Math.abs(t.x - b.x) > 5 || Math.abs(t.y - b.y) > 5 || !t.items.length) continue; const it = t.items.shift(); dictAdd(b.out, it.id, 1); FLY.push({ id: it.id, x0: t.x, y0: t.y, x1: b.x, y1: b.y, t: 0, dur: 0.4, d: 0, sink: 1 }); break; }
  }
  for (const b of L.entangler) powerDraw(b, dt);
  for (const b of L.assembler) { assemblerTick(b, dt); pushOut(b, dt); }
}

// Al terminar una pieza: chispas del color de la máquina (solo si estás cerca, para no gastar)
function stationFx(b) {
  if (!S || Math.abs(b.x * T - S.player.x) > 18 * T || Math.abs(b.y * T - S.player.y) > 18 * T) return;
  const lk = BD[b.type].look; burst(b.x, b.y, lk ? lk.c : b.type === 'furnace' ? '#ff9a3a' : '#e0b54c');
}
