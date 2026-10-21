'use strict';
// Redstone analógica (0-15). Las puertas leen el estado del tick anterior (1 tick de retardo),
// y los cables solo se recalculan cuando cambia alguna salida o la topología.
const FRONT_ONLY = new Set(['inverter', 'andgate', 'orgate', 'xorgate', 'repeater', 'flipflop', 'counter', 'comparator', 'adder', 'latch']);
let channels = new Float32Array(17), chanNext = new Float32Array(17);

function emits(n, dirOut) {
  if (!n) return 0;
  const t = n.type;
  if (t === 'wire') return n.sig;
  if (t === 'wirebridge') return (dirOut & 1) ? n.sv : n.sh;
  if (t === 'computer') return n.so ? n.so[dirOut] : 0;
  if (!BD[t].emit) return 0;
  if (FRONT_ONLY.has(t)) return dirOut === n.dir ? n.o : 0;
  if (t === 'sequencer') return dirOut === (n.seq || 0) ? n.o : 0;
  return n.o;
}
function inputFrom(b, d) { return emits(at(b.x + DX[d], b.y + DY[d]), OPP(d)); }
function maxInput(b) { let m = 0; for (let d = 0; d < 4; d++) { const v = inputFrom(b, d); if (v > m) m = v; } return m; }
function sideInput(b) { return Math.max(inputFrom(b, (b.dir + 1) & 3), inputFrom(b, (b.dir + 3) & 3)); }
function daylight() { if (S.alwaysDay) return 1; const dl = S.gen.dayLen || DAY_LEN, ph = (S.time % dl) / dl; return clamp(0.5 - 0.75 * Math.cos(ph * Math.PI * 2), 0, 1); }
function runnable(b) { if (b.off) return false; const m = b.rs; if (!m) return true; return m === 1 ? !b.powered : !!b.powered; }

function containerFrac(t) {
  if (!t) return 0;
  if (t.slots && t.type !== 'bench') return slotsFill(t.slots);
  if (t.type === 'depot') return t.item ? t.item.n / STACK : 0;
  if (t.items) return t.items.length / 4;
  if (t.inv) return clamp((total(t.inv) + total(t.out)) / 32, 0, 1);
  return 0;
}
function hasContent(t, filter) {
  if (!t) return false;
  if (t.items) return t.items.some(i => !filter || i.id === filter);
  if (t.slots) return t.slots.some(s => s && (!filter || s.id === filter));
  if (t.type === 'depot') return !!t.item && (!filter || t.item.id === filter);
  if (t.inv) return filter ? (t.inv[filter] || 0) + (t.out[filter] || 0) > 0 : total(t.inv) + total(t.out) > 0;
  return false;
}
function tankFrac(t) { let m = 0; if (t.tanks) for (const k in t.tanks) { const k2 = t.tanks[k]; if (k2.c) m = Math.max(m, k2.a / k2.c); } return m; }

function emitTick(b, dt) {
  switch (b.type) {
    case 'lever': return b.on ? 15 : 0;
    case 'button': if (b.t > 0) { b.t -= dt; return 15; } return 0;
    case 'plate': return (Math.floor(S.player.x / T) === b.x && Math.floor(S.player.y / T) === b.y) ? 15 : 0;
    case 'clock': b.t += dt; if (b.t >= b.period) b.t -= b.period; return b.t < 0.25 ? 15 : 0;
    case 'observer': return hasContent(frontOf(b), b.filter) ? 15 : 0;
    case 'stockpile': { const t = frontOf(b); return t && containerFrac(t) >= b.th ? 15 : 0; }
    case 'speedometer': return Math.ceil(clamp(b.rpm / 256, 0, 1) * 15);
    case 'stressometer': { const c = b.comp; return c && c.cap > 0 ? Math.ceil(clamp(c.used / c.cap, 0, 1) * 15) : 0; }
    case 'daysensor': { const l = Math.round(daylight() * 15); return b.invert ? 15 - l : l; }
    case 'receiver': return channels[b.freq];
    case 'levelSensor': { const t = frontOf(b); return t && t.tanks ? Math.ceil(tankFrac(t) * 15) : 0; }
    case 'pmeter': { const t = frontOf(b); return t && BD[t.type].pw ? Math.ceil(t.E / BD[t.type].pw.cap * 15) : 0; }
    case 'inverter': return inputFrom(b, OPP(b.dir)) > 0 ? 0 : 15;
    case 'andgate': return inputFrom(b, (b.dir + 1) & 3) > 0 && inputFrom(b, (b.dir + 3) & 3) > 0 ? 15 : 0;
    case 'orgate': return sideInput(b) > 0 || inputFrom(b, OPP(b.dir)) > 0 ? 15 : 0;
    case 'xorgate': return (inputFrom(b, (b.dir + 1) & 3) > 0) !== (inputFrom(b, (b.dir + 3) & 3) > 0) ? 15 : 0;
    case 'repeater': {
      const n = Math.max(1, Math.round(b.delay / DT));
      b.hist.push(inputFrom(b, OPP(b.dir)) > 0 ? 15 : 0);
      while (b.hist.length > n + 1) b.hist.shift();
      return b.hist.length > n ? b.hist.shift() : 0;
    }
    case 'flipflop': {
      const i = inputFrom(b, OPP(b.dir)) > 0 ? 1 : 0;
      if (i && !b.last) b.st ^= 1; b.last = i;
      if (sideInput(b) > 0) b.st = 0;
      return b.st ? 15 : 0;
    }
    case 'counter': {
      const i = inputFrom(b, OPP(b.dir)) > 0 ? 1 : 0;
      if (i && !b.last) { b.cnt++; if (b.cnt >= b.target) { b.cnt = 0; b.pt = 4; } }
      b.last = i; if (sideInput(b) > 0) b.cnt = 0;
      if (b.pt > 0) { b.pt--; return 15; } return 0;
    }
    case 'adder': return Math.min(15, inputFrom(b, OPP(b.dir)) + inputFrom(b, (b.dir + 1) & 3) + inputFrom(b, (b.dir + 3) & 3));
    case 'latch': { const i = inputFrom(b, OPP(b.dir)); if (sideInput(b) > 0) b.mem = 0; else if (i > (b.mem || 0)) b.mem = i; return b.mem || 0; }
    case 'proximity': return Math.hypot(S.player.x / T - b.x - 0.5, S.player.y / T - b.y - 0.5) < b.dist ? 15 : 0;
    case 'faunaSensor': { let n = 0; for (const a of ANIMALS) if (Math.abs(a.x / T - b.x) < 6 && Math.abs(a.y / T - b.y) < 6) n++; return Math.min(15, n); }
    case 'beltCounter': { const t = frontOf(b); return t && t.items ? Math.min(15, t.items.length * 4) : 0; }
    case 'randomizer': return Math.random() < dt ? 15 : (b.o > 0 && Math.random() < 0.5 ? 15 : 0);
    case 'sequencer': { let i = 0; for (let d = 0; d < 4; d++) if (d !== (b.seq || 0)) i = Math.max(i, inputFrom(b, d)); const on = i > 0 ? 1 : 0; if (on && !b.last) b.seq = ((b.seq || 0) + 1) & 3; b.last = on; return 15; }
    case 'thermometer': { const c = climate(b.x, b.y, S.gen, _cl); return Math.round(c[1] * 15); }
    case 'computer': return compStep(b, dt);
    case 'enemySensor': { let n = 0; for (const f of FOES) if (Math.abs(f.x / T - b.x) < 8 && Math.abs(f.y / T - b.y) < 8) { if (f.boss) return 15; n++; } return Math.min(15, n); }
    case 'comparator': {
      const a = inputFrom(b, OPP(b.dir)), s = sideInput(b);
      return b.mode ? Math.max(0, a - s) : (a >= s ? a : 0);
    }
  }
  return 0;
}
function floodWires() {
  const ws = L.wire, br = L.wirebridge, q = [];
  for (const w of ws) w.sig = 0;
  for (const b of br) { b.sh = 0; b.sv = 0; }
  const isW = t => t === 'wire' || t === 'wirebridge';
  for (const w of ws) {
    let m = 0;
    for (let d = 0; d < 4; d++) { const n = at(w.x + DX[d], w.y + DY[d]); if (n && !isW(n.type)) { const v = emits(n, OPP(d)); if (v > m) m = v; } }
    if (m > 0) { w.sig = m; q.push(w, -1); }
  }
  for (const b of br) for (let d = 0; d < 4; d++) {
    const n = at(b.x + DX[d], b.y + DY[d]); if (!n || isW(n.type)) continue;
    const v = emits(n, OPP(d)); if (v <= 0) continue;
    if (d & 1) { if (v > b.sv) { b.sv = v; q.push(b, 1); } } else if (v > b.sh) { b.sh = v; q.push(b, 0); }
  }
  for (let i = 0; i < q.length; i += 2) {
    const c = q[i], ch = q[i + 1], s = ch < 0 ? c.sig : (ch ? c.sv : c.sh);
    if (s <= 1) continue;
    for (let d = 0; d < 4; d++) {
      if (ch >= 0 && (d & 1) !== ch) continue;
      const n = at(c.x + DX[d], c.y + DY[d]); if (!n) continue;
      if (n.type === 'wire') { if (n.sig < s - 1) { n.sig = s - 1; q.push(n, -1); } }
      else if (n.type === 'wirebridge') {
        if (d & 1) { if (n.sv < s - 1) { n.sv = s - 1; q.push(n, 1); } } else if (n.sh < s - 1) { n.sh = s - 1; q.push(n, 0); }
      }
    }
  }
}
function logicTick(dt) {
  let ch = dirty.logic; dirty.logic = false;
  const em = L.emit;
  for (const b of em) b.no = emitTick(b, dt);
  for (const b of em) if (b.no !== b.o) { b.o = b.no; ch = true; }
  if (ch) floodWires();
  chanNext.fill(0);
  for (const b of L.rsc) {
    const p = maxInput(b), pw = p > 0;
    if (pw !== !!b.powered) {
      if (b.type === 'clutch' || b.type === 'brake') dirty.kin = true;
      if (b.type === 'pswitch' || b.type === 'valve') dirty.net = true;
    }
    b.powered = pw; b.pv = p;
    if (b.type === 'transmitter' && p > chanNext[b.freq]) chanNext[b.freq] = p;
  }
  if (L.computer) for (const b of L.computer) if (b.run && b.chan) for (const f in b.chan) if (b.chan[f] > chanNext[f]) chanNext[f] = b.chan[f];
  if (L.alarm) for (const b of L.alarm) { if (b.powered && !b.lastP) { toast(`🚨 ¡Alarma en (${b.x}, ${b.y})!`, true); sfx('alarm'); } b.lastP = b.powered; }
  const t = channels; channels = chanNext; chanNext = t;
}
