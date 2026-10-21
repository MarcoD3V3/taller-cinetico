'use strict';
// Redes de energía (m=0) y de fluidos (m=1). Los cables/tuberías forman redes; los aparatos
// se enganchan por sus caras. Cada tick se reparte el flujo por prioridades:
//  consumidores ← generadores, salidas de baterías, baterías mixtas
//  baterías de entrada ← generadores, salidas · baterías mixtas ← generadores, salidas
let NETS = [];
const PIPE_CAP = 2000;
const isCondType = (b, m) => m === 0 ? !!BD[b.type].cable : !!BD[b.type].pipe;
function isCond(b, m) {
  if (!isCondType(b, m)) return false;
  return m === 0 ? !(b.type === 'pswitch' && b.powered) : !(b.type === 'valve' && b.powered);
}
function condLink(a, n, m) {
  if (m === 1) return true;
  const ka = BD[a.type].cable.kind, kn = BD[n.type].cable.kind;
  return ka === kn || ka === '*' || kn === '*';
}
function hasPort(b, m, side) {
  const d = BD[b.type];
  if (m === 0) {
    const p = d.pw; if (!p) return false;
    if (p.role === 'store') return b.sides[side] !== 3;
    if (p.role === 'diode') return side === b.dir || side === OPP(b.dir);
    return true;
  }
  const f = d.fl; if (!f) return false;
  if (f.store) return b.sides[side] !== 3;
  return true;
}
const isDev = (b, m) => m === 0 ? !!BD[b.type].pw : !!BD[b.type].fl;
function rebuildNets() {
  NETS = [];
  for (let m = 0; m < 2; m++) {
    const conds = m === 0 ? [...L.cableCu, ...L.cableRub, ...L.cableBr, ...L.pswitch] : [...L.pipe, ...L.valve];
    for (const c of conds) c.net = null;
    for (const c of conds) {
      if (c.net || !isCond(c, m)) continue;
      const net = { m, conds: [], atts: [], cap: Infinity, flow: 0, ft: null };
      const seen = new Set(), st = [c]; c.net = net;
      while (st.length) {
        const cur = st.pop(); net.conds.push(cur);
        net.cap = Math.min(net.cap, m === 0 ? BD[cur.type].cable.cap : PIPE_CAP);
        for (let d = 0; d < 4; d++) {
          const n = at(cur.x + DX[d], cur.y + DY[d]); if (!n) continue;
          if (isCondType(n, m)) { if (!n.net && isCond(n, m) && condLink(cur, n, m)) { n.net = net; st.push(n); } }
          else if (hasPort(n, m, OPP(d)) && !seen.has(n)) { seen.add(n); net.atts.push({ b: n, side: OPP(d) }); }
        }
      }
      NETS.push(net);
    }
    // Aparatos pegados directamente
    for (const b of blocks) {
      if (!isDev(b, m)) continue;
      for (let d = 0; d < 2; d++) {
        const n = at(b.x + DX[d], b.y + DY[d]);
        if (n && isDev(n, m) && hasPort(b, m, d) && hasPort(n, m, OPP(d)))
          NETS.push({ m, conds: [], atts: [{ b, side: d }, { b: n, side: OPP(d) }], cap: Infinity, flow: 0, ft: null });
      }
    }
  }
  dirty.net = false;
}
// ---- Reparto genérico ----
const _src = [[], [], []], _snk = [[], [], []], _sT = [0, 0, 0], _kT = [0, 0, 0], _tk = [0, 0, 0], _gv = [0, 0, 0];
const PLAN = [[0, [0, 1, 2]], [1, [0, 1]], [2, [0, 1]]];
function allocate(atts, limit, apply, type) {
  for (let i = 0; i < 3; i++) { _src[i].length = 0; _snk[i].length = 0; _sT[i] = _kT[i] = _tk[i] = _gv[i] = 0; }
  for (const a of atts) {
    if (a.src > 0) { _src[a.sc].push(a); _sT[a.sc] += a.src; }
    if (a.sink > 0) { _snk[a.kc].push(a); _kT[a.kc] += a.sink; }
  }
  let lim = limit, moved = 0;
  for (const [k, ss] of PLAN) {
    let need = _kT[k]; if (need <= 0) continue;
    for (const s of ss) {
      if (need <= 0 || lim <= 0) break;
      const m = Math.min(need, _sT[s] - _tk[s], lim);
      if (m > 0) { _tk[s] += m; _gv[k] += m; need -= m; lim -= m; moved += m; }
    }
  }
  if (moved <= 0) return 0;
  for (let s = 0; s < 3; s++) if (_tk[s] > 0) { const f = _tk[s] / _sT[s]; for (const a of _src[s]) apply(a, -a.src * f, type); }
  for (let k = 0; k < 3; k++) if (_gv[k] > 0) { const f = _gv[k] / _kT[k]; for (const a of _snk[k]) apply(a, a.sink * f, type); }
  return moved;
}
// ---- Energía ----
function eIO(a) {
  const b = a.b, p = BD[b.type].pw, r = p.rate * DT;
  a.src = 0; a.sink = 0;
  switch (p.role) {
    case 'gen': a.src = b.E; a.sc = 0; break;
    case 'use': a.sink = Math.max(0, p.cap - b.E); a.kc = 0; break;
    case 'store': {
      const md = b.sides[a.side], av = Math.min(b.E, r), rm = Math.min(p.cap - b.E, r);
      if (md === 0) { a.src = av; a.sc = 2; a.sink = rm; a.kc = 2; }
      else if (md === 1) { a.sink = rm; a.kc = 1; }
      else if (md === 2) { a.src = av; a.sc = 1; }
      break;
    }
    case 'diode':
      if (a.side === OPP(b.dir)) { a.sink = Math.min(p.cap - b.E, r); a.kc = 1; }
      else if (a.side === b.dir) { a.src = Math.min(b.E, r); a.sc = 1; }
      break;
  }
}
function eApply(a, x) { a.b.E = Math.max(0, a.b.E + x); }
function powerTick() {
  for (const net of NETS) {
    if (net.m !== 0) continue;
    if (net.atts.length < 2) { net.flow = 0; continue; }
    for (const a of net.atts) eIO(a);
    net.flow = allocate(net.atts, net.cap * DT, eApply) / DT;
  }
}
// ---- Fluidos ----
function fIO(a, type) {
  const b = a.b, f = BD[b.type].fl;
  a.src = 0; a.sink = 0; a.st = null; a.kt = null;
  if (f.drain) { a.sink = 1e9; a.kc = 2; return; }
  if (f.store) {
    if (!f.store.includes(type)) return;
    const t = b.tanks.m; if (t.t && t.t !== type) return;
    const r = f.rate * DT, md = b.sides[a.side], av = t.t === type ? Math.min(t.a, r) : 0, rm = Math.min(t.c - t.a, r);
    if (md === 0) { a.src = av; a.sc = 2; a.sink = rm; a.kc = 2; }
    else if (md === 1) { a.sink = rm; a.kc = 1; }
    else if (md === 2) { a.src = av; a.sc = 1; }
    a.st = a.kt = t; return;
  }
  if (f.out) for (const k of f.out) { const t = b.tanks[k]; if (t.t === type && t.a > 0) { a.src = t.a; a.sc = 0; a.st = t; break; } }
  if (f.in) for (const k in f.in) {
    if (!f.in[k].includes(type)) continue;
    const t = b.tanks[k]; if (t.t && t.t !== type) continue;
    if (t.c - t.a > 0) { a.sink = t.c - t.a; a.kc = 0; a.kt = t; break; }
  }
}
function fApply(a, x, type) {
  if (x < 0) { const t = a.st; t.a += x; if (t.a <= 1e-6) { t.a = 0; t.t = null; } }
  else if (a.kt) { a.kt.a += x; a.kt.t = type; }
}
const _types = [];
function fluidTick() {
  for (const net of NETS) {
    if (net.m !== 1) continue;
    if (net.atts.length < 2) { net.flow = 0; continue; }
    _types.length = 0;
    for (const a of net.atts) {
      const b = a.b, f = BD[b.type].fl; if (!b.tanks) continue;
      const names = f.store ? ['m'] : f.out || [];
      for (const k of names) { const t = b.tanks[k]; if (t && t.t && t.a > 0 && !_types.includes(t.t)) _types.push(t.t); }
    }
    let moved = 0;
    for (const type of _types) {
      for (const a of net.atts) fIO(a, type);
      const mv = allocate(net.atts, PIPE_CAP * DT, fApply, type);
      if (mv > 0) { moved += mv; net.ft = type; }
    }
    net.flow = moved / DT;
  }
}
// Utilidades de tanques para máquinas
function fluidAmt(b, type) { let s = 0; for (const k in b.tanks) { const t = b.tanks[k]; if (t.t === type) s += t.a; } return s; }
function tankFor(b, type, out) {
  const f = BD[b.type].fl; if (!f) return null;
  const names = out ? (f.out || []) : Object.keys(f.in || {});
  for (const k of names) { const t = b.tanks[k]; if ((!t.t || t.t === type) && (out || f.in[k].includes(type))) return t; }
  return null;
}
function tankPut(b, type, n) { const t = tankFor(b, type, true); if (!t) return 0; const m = Math.min(n, t.c - t.a); t.a += m; if (m > 0) t.t = type; return m; }
function tankRoom(b, type) { const t = tankFor(b, type, true); return t ? t.c - t.a : 0; }
function tankTake(b, type, n) {
  for (const k in b.tanks) { const t = b.tanks[k]; if (t.t !== type) continue; const m = Math.min(n, t.a); t.a -= m; n -= m; if (t.a <= 1e-6) { t.a = 0; t.t = null; } if (n <= 0) break; }
}
