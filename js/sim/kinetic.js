'use strict';
// Red cinética: componentes conectados comparten RPM base; cada pieza tiene un factor
// (multiplicadores). Solo se reconstruye cuando cambia la topología o un generador.
const KCOMPS = [];
function kinPorts(b) {
  const k = BD[b.type].kin;
  if (k === 'axis' || k === 'ratio') { if (b.type === 'clutch' && b.powered) return 0; return (b.dir & 1) ? 0b1010 : 0b0101; }
  return 15;
}
function kinConnect(a, n, d) {
  if (!((kinPorts(a) >> d) & 1) || !((kinPorts(n) >> OPP(d)) & 1)) return false;
  if (BD[a.type].kin === 'belt' && BD[n.type].kin === 'belt') return (a.dir & 1) === (d & 1) && (n.dir & 1) === (d & 1);
  return true;
}
const ratioOf = b => b.type === 'doubler' ? 2 : b.mult;
function edgeMul(a, n, d) {
  let m = 1;
  if (BD[a.type].kin === 'ratio' && d === a.dir) m *= ratioOf(a);
  if (BD[n.type].kin === 'ratio' && d === OPP(n.dir)) m /= ratioOf(n);
  return m;
}
function genActive(b) {
  switch (b.type) {
    case 'crank': return b.timer > 0;
    case 'waterwheel': return nearWater(b.x, b.y);
    case 'windmill': for (const m of L.windmill) if (m !== b && Math.abs(m.x - b.x) <= 3 && Math.abs(m.y - b.y) <= 3) return false; return true;
    case 'steam': return (b.fuel || 0) > 0;
    case 'emotor': return !!b.ep;
    case 'kineticGen': return (b.fuel || 0) > 0;
  }
  return false;
}
function rebuildKin() {
  const list = L.kinB; KCOMPS.length = 0;
  for (const b of list) { b.comp = null; b.rpm = 0; }
  const st = [], mem = [];
  for (const b of list) {
    if (b.comp) continue;
    const comp = { n: 0, broken: false, cap: 0, used: 0, base: 0, stop: true, gens: 0, braked: false };
    KCOMPS.push(comp);
    b.comp = comp; b.f = 1; st.length = 0; mem.length = 0; st.push(b);
    while (st.length) {
      const a = st.pop(); mem.push(a);
      for (let d = 0; d < 4; d++) {
        const n = at(a.x + DX[d], a.y + DY[d]);
        if (!n || !BD[n.type].kin || !kinConnect(a, n, d)) continue;
        const nf = a.f * edgeMul(a, n, d);
        if (n.comp === comp) { if (Math.abs(n.f - nf) > 1e-6) comp.broken = true; }
        else { n.comp = comp; n.f = nf; st.push(n); }
      }
    }
    let base = 0;
    for (const m of mem) {
      const g = BD[m.type].gen;
      if (g && m.genOn) { comp.cap += g.cap; comp.gens++; base = Math.max(base, g.rpm / m.f); }
      if (m.type === 'brake' && m.powered) comp.braked = true;
    }
    comp.base = base;
    for (const m of mem) comp.used += (BD[m.type].impact || 0) * Math.min(256, base * m.f);
    comp.n = mem.length;
    comp.stop = comp.broken || comp.braked || base === 0 || comp.used > comp.cap;
    if (!comp.stop) for (const m of mem) m.rpm = Math.min(256, base * m.f);
  }
  dirty.kin = false;
}
function kineticTick() {
  for (const g of L.gens) { const a = genActive(g); if (a !== !!g.genOn) { g.genOn = a; dirty.kin = true; } }
  if (dirty.kin) rebuildKin();
}
