'use strict';
// =====================================================================================
//  Conexiones entre máquinas:
//   · Compatibilidad entre familias: los vecinos (las 8 casillas de alrededor) se ayudan o
//     se estorban (precalentado, refrigeración, taller especializado, ruido en casa…).
//   · Cadenas de producción: qué alimenta a qué, cuello de botella y bonificación por línea.
//   · Señales: cualquier máquina puede emitir redstone según su estado y obedecer señales
//     (turbo, ahorro, pausa, una pieza por pulso, elegir receta con la fuerza de la señal).
//   · Salida y entrada: repartir por los lados, al cofre, retener, filtrar.
// =====================================================================================
const N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
const isHot = n => { const d = BD[n.type]; return (n.heat || 0) > 30 || ((d.burn || n.type === 'furnace' || /blast|kiln|smelt|forge|geotherm|boiler|crucible/i.test(n.type)) && ((n.fuel || 0) > 0 || n.lit || n.cur >= 0)); };
const isWet = n => (n.tanks && ['water', 'coolant'].some(k => n.tanks[k] && n.tanks[k].a > 0)) || /ice|snow|cooler|coolant/i.test(n.type);
const lkWorking = n => n.cur >= 0 || (n.rpm || 0) > 0 || (famOf(n.type) === 'gen' && n.st && n._run !== n.st.run) || !!(n.items && n.items.length);
// Reglas de compatibilidad: to = familias que reciben el efecto; test(vecino, familia, b) decide.
const SYN = {
  preheat: { n: 'Precalentado', i: '🔥', to: ['proc'], test: n => isHot(n), fx: { spd: 1.12, heat: 1.15 }, max: 1, d: 'Una fuente de calor al lado (horno, caldera…) acelera un 12 %, aunque se calienta algo más.' },
  cooling: { n: 'Refrigeración', i: '❄', to: ['proc', 'gen', 'kin', 'energy', 'defense'], test: n => isWet(n), fx: { heat: 0.55 }, max: 1, water: 1, d: 'Agua al lado (un tanque con agua, hielo o un charco) quita casi la mitad del calor.' },
  stack: { n: 'Taller especializado', i: '⚒', to: ['proc', 'gen'], test: (n, f, b) => n.type === b.type, fx: { spd: 1.04, gen: 1.04 }, max: 3, d: 'Cada máquina igual pegada suma un 4 % (máximo 3): comparten herramientas y piezas.' },
  heatpile: { n: 'Calor acumulado', i: '♨', to: ['proc', 'gen'], bad: 1, test: (n, f) => (f === 'proc' || f === 'gen') && (n.heat || 0) > 50, fx: { heat: 1.25 }, max: 2, d: 'Pegada a otra máquina muy caliente se calienta un 25 % más. Sepáralas o refrigéralas.' },
  lit: { n: 'Bien iluminada', i: '💡', to: ['proc', 'logistic', 'defense'], test: (n, f) => f === 'light' && litOf(n), fx: { save: 0.03, wear: 0.95 }, max: 1, d: 'Con una luz al lado se trabaja mejor: ahorra material un 3 % de veces y se gasta menos.' },
  direct: { n: 'Toma directa', i: '🔌', to: ['proc'], test: (n, f) => (f === 'energy' || f === 'gen') && (n.E || 0) > 1, fx: { spd: 1.05 }, max: 1, d: 'Una batería o generador pegado da energía sin pérdidas de cable: +5 % de velocidad.' },
  shaft: { n: 'Eje bien alineado', i: '⟳', to: ['proc'], test: (n, f, b) => f === 'kin' && (n.rpm || 0) > 0 && BD[b.type].kin, fx: { wear: 0.9 }, max: 1, d: 'Recibe el giro de un eje pegado: se gasta un 10 % menos.' },
  guard: { n: 'Protegida', i: '🛡', to: ['proc', 'gen', 'kin', 'logistic', 'energy', 'fluid', 'storage'], test: (n, f) => f === 'defense', fx: { wear: 0.9 }, max: 1, d: 'Una defensa al lado la libra de golpes y bichos: se gasta un 10 % menos.' },
  shelter: { n: 'A cubierto', i: '🧱', to: ['proc', 'gen', 'kin', 'logistic', 'energy'], test: (n, f) => f === 'build', fx: { wear: 0.92 }, need: 3, max: 1, d: 'Con 3 o más paredes/obra alrededor queda resguardada del tiempo: se gasta un 8 % menos.' },
  sync: { n: 'Red sincronizada', i: '⚡', to: ['gen'], test: (n, f) => f === 'gen' || f === 'energy', fx: { gen: 1.05 }, max: 2, d: 'Generadores y baterías juntos se reparten los picos: +5 % por vecino (máximo 2).' },
  spotter: { n: 'Avistador', i: '👁', to: ['defense'], test: (n, f) => f === 'logic' && /sensor|proximity|observer/i.test(n.type), fx: { range: 1 }, max: 1, d: 'Un sensor al lado le avisa antes: +1 casilla de alcance.' },
  armory: { n: 'Munición a mano', i: '▣', to: ['defense'], test: (n, f) => f === 'storage', fx: { dmg: 1.1 }, max: 1, d: 'Un cofre pegado hace de armería: +10 % de daño.' },
  glow: { n: 'Luz combinada', i: '✨', to: ['light'], test: (n, f) => f === 'light' && litOf(n), fx: { light: 1 }, need: 2, max: 1, d: 'Dos o más luces encendidas juntas alumbran una casilla más.' },
  cozy: { n: 'Rincón acogedor', i: '🕯', to: ['home'], test: (n, f) => (f === 'light' && litOf(n)) || f === 'home', fx: { decor: 1.06 }, max: 3, d: 'Muebles y luces juntos decoran más: +6 % por vecino (máximo 3).' },
  noise: { n: 'Ruido de taller', i: '🔊', to: ['home'], bad: 1, test: (n, f) => (f === 'proc' || f === 'gen' || f === 'kin') && lkWorking(n), fx: { decor: 0.8 }, max: 1, d: 'Una máquina en marcha al lado molesta: el mueble decora un 20 % menos.' },
  warmhome: { n: 'Hogar templado', i: '🔥', to: ['home'], test: n => isHot(n) || /fireplace|stove|hearth|brazier/i.test(n.type), fx: { warmB: 1, decor: 1.05 }, max: 1, d: 'Junto a una fuente de calor el mueble abriga (+1 de calor) y luce más.' },
  vib: { n: 'Vibraciones', i: '〰', to: ['light'], bad: 1, test: (n, f) => f === 'kin' && (n.rpm || 0) > 96, fx: { light: -1 }, max: 1, d: 'Un eje muy rápido al lado hace temblar las luces (−1 casilla).' },
  fuelfeed: { n: 'Toma de combustible', i: '⛽', to: ['proc', 'gen'], test: (n, f, b) => !!n.slots && (BD[b.type].fuel || b.type === 'furnace'), fx: {}, max: 1, d: 'Si un cofre pegado tiene combustible, la máquina lo coge sola cuando le falta.' },
};
// Qué reglas puede tener cada familia (para la parte didáctica: "qué podrías poner al lado")
const _synFor = new Map(), synFor = f => { let r = _synFor.get(f); if (!r) { r = Object.keys(SYN).filter(k => SYN[k].to.includes(f)); _synFor.set(f, r); } return r; };
const SYN_FAMS = new Set(Object.values(SYN).flatMap(r => r.to));
function synCalc(b) {
  const f = famOf(b.type); if (!SYN_FAMS.has(f)) { b.syn = null; b.synM = null; return; }
  const cnt = {}, ns = [];
  for (const [dx, dy] of N8) { const n = at(b.x + dx, b.y + dy); if (!n || n === b || ns.includes(n)) continue; ns.push(n); const nf = famOf(n.type);
    for (const k of synFor(f)) { const r = SYN[k]; try { if (r.test(n, nf, b)) cnt[k] = (cnt[k] || 0) + 1; } catch (e) { } } }
  if (synFor(f).includes('cooling') && !cnt.cooling) { const l = nearLiquid(b.x, b.y); if (l === 'water') cnt.cooling = 1; }
  const act = [], M = {};
  for (const k in cnt) { const r = SYN[k]; if (cnt[k] < (r.need || 1)) continue; const n = r.need ? 1 : Math.min(cnt[k], r.max || 1); act.push([k, n]);
    for (const e in r.fx) M[e] = TR_ADD.has(e) ? (M[e] || 0) + r.fx[e] * n : (M[e] ?? 1) * Math.pow(r.fx[e], n); }
  if (b._chainN > 1 && f === 'proc') { const c = 1 + 0.03 * Math.min(5, b._chainN - 1); M.spd = (M.spd ?? 1) * c; act.push(['chain', b._chainN]); }
  b.syn = act; b.synM = act.length ? M : null;
}
// ---------- Estado de cada máquina (para el cuello de botella y para las señales) ----------
const WST = {
  work: ['●', 'Trabajando', 'good', 'Todo bien.'],
  off: ['○', 'Apagada', 'mut', 'Enciéndela, o revisa el lote o la señal que la controla.'],
  broken: ['💥', 'Averiada', 'bad', 'Repárala en Mantenimiento (kit de mantenimiento).'],
  jam: ['⚠', 'Atascada', 'bad', 'Desatáscala en Mantenimiento.'],
  hot: ['🔥', 'Enfriándose', 'bad', 'Usa el modo normal, pon agua al lado o un disipador.'],
  outfull: ['⛔', 'Salida llena', 'bad', 'Lo fabricado no tiene a dónde ir: pon una cinta o cofre delante, o cambia la salida.'],
  nofuel: ['⛽', 'Sin combustible', 'bad', 'Mete carbón o troncos, o pon un cofre con combustible al lado.'],
  nopower: ['🔌', 'Sin energía', 'bad', 'Conecta un cable a un generador o batería con carga.'],
  norpm: ['⟳', 'Sin giro', 'bad', 'Necesita rotación: conecta un eje desde un generador cinético.'],
  noinput: ['…', 'Esperando material', 'warn', 'No tiene lo que pide ninguna receta: aliméntala con una cinta, un brazo o a mano.'],
  idle: ['○', 'En espera', 'mut', 'Lista para trabajar.'],
};
function wstOf(b) {
  const d = BD[b.type], f = famOf(b.type);
  if (b.off) return 'off'; if (hasCond(f) && (b.cond ?? 100) <= 0) return 'broken'; if (b.jam) return 'jam'; if ((b.over || 0) > 0) return 'hot';
  if (b.out) { const k = firstKey(b.out); if (k && (total(b.out) >= 32 || (d.dir && !b.oMode && !accept(frontOf(b), k, b.dir, true)))) return 'outfull'; }
  if (d.machine) {
    if (b.cur >= 0) { if (b.type === 'furnace' && !(b.fuel > 0) && !(b.inv.coal > 0)) return 'nofuel'; if (d.burn && !(b.fuel > 0) && !firstFuel(b)) return 'nofuel'; if (d.pw && d.pw.role === 'use' && (b.E || 0) < 0.5) return 'nopower'; if (d.kin && (d.minRpm ? b.rpm < d.minRpm : !b.rpm)) return 'norpm'; return 'work'; }
    return total(b.inv || {}) ? 'noinput' : 'noinput';
  }
  if (b.items && b.items.length && !runnable(b)) return 'off';
  if (b.items && b.items.length && !(b.rpm > 0)) return 'norpm';
  return lkWorking(b) ? 'work' : 'idle';
}
// ---------- Cadenas de producción ----------
const PULLS_BACK = new Set(['extractor', 'arm']);
const nodeOK = n => n && (BD[n.type].dir !== undefined || n.out || n.slots || n.items || n.type === 'core');
function feedsOf(n) { // a quién entrega n
  const d = BD[n.type]; if (!d.dir || n.type === 'core') return [];
  if (n.oMode === 'spread') return [n.dir, (n.dir + 1) & 3, (n.dir + 3) & 3].map(k => at(n.x + DX[k], n.y + DY[k])).filter(Boolean);
  if (n.oMode === 'chest') { const c = [0, 1, 2, 3].map(k => at(n.x + DX[k], n.y + DY[k])).filter(t => t && t.slots); if (c.length) return c; }
  const t = frontOf(n); return t ? [t] : [];
}
function chainOf(b, lim = 40) {
  const seen = new Set([b]), down = [], up = [];
  let q = [b];
  while (q.length && seen.size < lim) { const nx = []; for (const c of q) for (const t of feedsOf(c)) if (!seen.has(t) && nodeOK(t)) { seen.add(t); down.push(t); if (!t.slots && t.type !== 'core' && t.type !== 'trash') nx.push(t); } q = nx; }
  q = [b];
  while (q.length && seen.size < lim * 2) { const nx = []; for (const c of q) {
    const cand = []; for (let k = 0; k < 4; k++) { const n = at(c.x + DX[k], c.y + DY[k]); if (n && n !== c && feedsOf(n).includes(c)) cand.push(n); }
    if (PULLS_BACK.has(c.type)) { const s = backOf(c); if (s) cand.push(s); }
    for (const n of cand) if (!seen.has(n) && nodeOK(n)) { seen.add(n); up.push(n); if (!n.slots) nx.push(n); } } q = nx; }
  return { up: up.reverse(), down };
}
const isMach = n => { const f = famOf(n.type); return f === 'proc' || f === 'gen' || n.type === 'drill' || n.type === 'treetap'; };
function chainScan() { // marca cada máquina con cuántas máquinas tiene su línea (para la bonificación)
  for (const b of blocks) b._chainN = 0;
  for (const b of blocks) { if (b._chainN || famOf(b.type) !== 'proc') continue; const c = chainOf(b, 30), ms = [b, ...c.up, ...c.down].filter(isMach); for (const m of ms) m._chainN = Math.max(m._chainN || 0, ms.length); }
}
// ---------- Señales que emiten las máquinas ----------
const SOUT = { '': 'No emite', work: 'Mientras trabaja', done: 'Pulso al terminar una pieza', need: 'Cuando le falta algo', full: 'Cuando está llena', empty: 'Cuando está vacía', hot: 'Si se calienta (70 °+)', fault: 'Si se avería o se atasca', prog: 'Progreso (0–15)', fill: 'Cuánto tiene dentro (0–15)', cond: 'Estado (0–15)' };
const SOUT_FOR = { proc: ['', 'work', 'done', 'need', 'full', 'empty', 'hot', 'fault', 'prog', 'fill', 'cond'], gen: ['', 'work', 'full', 'empty', 'hot', 'fault', 'fill', 'cond'], storage: ['', 'full', 'empty', 'fill'], energy: ['', 'full', 'empty', 'fill'], fluid: ['', 'work', 'full', 'empty', 'fill', 'fault'], logistic: ['', 'work', 'full', 'empty', 'fault'], kin: ['', 'work', 'fault', 'cond'], defense: ['', 'work', 'fault', 'cond'] };
const SIN = { '': 'Nada (ignora la señal)', run: 'Solo funciona con señal', pause: 'Se para con señal', turbo: 'Con señal: Turbo/Máximo', eco: 'Con señal: Eco/Ahorro', pulse: 'Cada pulso: fabrica una pieza', recipe: 'La fuerza elige la receta (1 = primera)' };
const SIN_FOR = { proc: ['', 'run', 'pause', 'turbo', 'eco', 'pulse', 'recipe'], gen: ['', 'run', 'pause', 'turbo', 'eco'] };
function fillOf(b) {
  if (b.slots) return slotsFill(b.slots); if (b.tanks) return tankFrac(b);
  const d = BD[b.type]; if (d.pw && d.pw.cap && d.pw.role !== 'use' && famOf(b.type) !== 'proc') return clamp((b.E || 0) / d.pw.cap, 0, 1);
  if (b.items) return b.items.length / 4; if (b.inv) return clamp((total(b.inv) + total(b.out || {})) / 32, 0, 1); return 0;
}
function sigOut(b) {
  const w = b.wst || 'idle', fl = fillOf(b);
  switch (b.sOut) {
    case 'work': return w === 'work' ? 15 : 0;
    case 'done': return (b._pulse || 0) > S.time ? 15 : 0;
    case 'need': return ['noinput', 'nofuel', 'nopower', 'norpm'].includes(w) ? 15 : 0;
    case 'full': return w === 'outfull' || fl >= 0.95 ? 15 : 0;
    case 'empty': return fl <= 0.001 ? 15 : 0;
    case 'hot': return (b.heat || 0) >= 70 || w === 'hot' ? 15 : 0;
    case 'fault': return w === 'broken' || w === 'jam' || (b.cond ?? 100) < 30 ? 15 : 0;
    case 'prog': return Math.ceil(clamp(progressOf(b), 0, 1) * 15);
    case 'fill': return Math.ceil(fl * 15);
    case 'cond': return Math.ceil(clamp((b.cond ?? 100) / 100, 0, 1) * 15);
  }
  return 0;
}
{ const e0 = emits; emits = (n, d) => n && n.sOut && !BD[n.type].emit ? (n.mo || 0) : e0(n, d); }
// Las máquinas con "Al recibir señal…" necesitan estar en la lista de receptores
{ const r0 = rebuildLists; rebuildLists = () => { r0(); L.sigOut = []; for (const b of blocks) { if (b.sIn && !L.rsc.includes(b)) L.rsc.push(b); if (b.sOut) L.sigOut.push(b); } }; }
// ---------- Bucle: antes de la lógica (para que las señales salgan este mismo paso) ----------
let _lkT = 0, _lkC = 0, _lkI = 0;
{ const l0 = logicTick; logicTick = dt => {
  _lkT += dt; _lkC += dt;
  if (_lkC >= 2) { _lkC = 0; chainScan(); }
  // Cada bloque se repasa una vez por segundo, pero repartido entre los 20 pasos (antes, todos de golpe: un tirón cada segundo)
  { const n = blocks.length, per = Math.ceil(n / 20); if (_lkI >= n) _lkI = 0; const end = Math.min(n, _lkI + per); for (; _lkI < end; _lkI++) { const b = blocks[_lkI]; const f = famOf(b.type); if (SYN_FAMS.has(f)) synCalc(b); if (hasCond(f) || f === 'storage') b.wst = wstOf(b); if (b.st) b._run = b.st.run; if (b.syn && b.syn.some(s => s[0] === 'fuelfeed')) fuelFeed(b); } }
  for (const b of L.sigOut || []) { if (b.st && b.st.made !== b._made) { if (b._made !== undefined) b._pulse = S.time + 0.3; b._made = b.st.made; } if (b.sOut === 'work' || b.sOut === 'need' || b.sOut === 'full') b.wst = wstOf(b); const v = sigOut(b); if (v !== b.mo) { b.mo = v; dirty.logic = true; } }
  l0(dt);
}; }
function fuelFeed(b) {
  const fu = BD[b.type].fuel || ['coal']; if (fu.reduce((s, k) => s + (b.inv[k] || 0), 0) >= 4) return;
  for (const [dx, dy] of N8) { const n = at(b.x + dx, b.y + dy); if (!n || !n.slots) continue; for (const k of fu) if (slotsCount(n.slots, k) > 0) { slotsTake(n.slots, k, 1); dictAdd(b.inv, k, 1); return; } }
}
// ---------- Obedecer señales ----------
{ const p1 = procTick; procTick = (b, dt) => {
  const s = b.sIn; if (!s) return p1(b, dt);
  const on = !!b.powered;
  if ((s === 'run' && !on) || (s === 'pause' && on)) return;
  if (s === 'turbo' || s === 'eco') { const m = b.mode; if (on) b.mode = s; p1(b, dt); b.mode = m; return; }
  if (s === 'recipe') { const n = b.pv | 0, L2 = RECIPES[BD[b.type].machine] || []; const want = n > 0 ? Math.min(n - 1, L2.length - 1) : -1; if (want !== b.lockR) { b.lockR = want; b.cur = -1; b.prog = 0; } }
  if (s === 'pulse') { if (on && !b._lastP) { b.batch = (b.batch || 0) + 1; b.off = false; } b._lastP = on; }
  p1(b, dt);
}; }
{ const g1 = genTick; genTick = dt => {
  const gs = (L.gens || []).filter(b => b.sIn), save = gs.map(b => [b.E, b.mode]);
  for (const b of gs) { const on = !!b.powered; if (b.sIn === 'turbo' && on) b.mode = 'turbo'; if (b.sIn === 'eco' && on) b.mode = 'eco'; }
  g1(dt);
  gs.forEach((b, i) => { const on = !!b.powered; if ((b.sIn === 'run' && !on) || (b.sIn === 'pause' && on)) b.E = save[i][0]; b.mode = save[i][1]; });
}; }
// ---------- Salida y entrada ----------
{ const po = pushOut; pushOut = (b, dt) => {
  const m = b.oMode; if (!m && !b.oFilter) return po(b, dt);
  if (m === 'hold') return;
  b.ocd = (b.ocd || 0) - dt; if (b.ocd > 0) return;
  const k = firstKey(b.out, b.oFilter || undefined); if (!k) return;
  let dirs = [b.dir];
  if (m === 'spread') { const r = b._rr = ((b._rr || 0) + 1) % 3; dirs = [b.dir, (b.dir + 1) & 3, (b.dir + 3) & 3]; dirs = dirs.slice(r).concat(dirs.slice(0, r)); }
  if (m === 'chest') dirs = [0, 1, 2, 3].sort((a, c) => !!at(b.x + DX[c], b.y + DY[c])?.slots - !!at(b.x + DX[a], b.y + DY[a])?.slots);
  for (const d of dirs) { const t = at(b.x + DX[d], b.y + DY[d]); if (t && t !== b && accept(t, k, d, false)) { dictAdd(b.out, k, -1); b.ocd = 0.12; return; } }
}; }
{ const ma = machineAccepts; machineAccepts = (b, id) => {
  if (b.iLock && b.lockR >= 0 && BD[b.type].machine) { const r = RECIPES[BD[b.type].machine][b.lockR]; const fu = BD[b.type].fuel || (b.type === 'furnace' ? ['coal'] : []); if (r && !(r.in && r.in[id]) && !fu.includes(id)) return false; }
  return ma(b, id);
}; }
// ---------- Resaltar la cadena en el mapa ----------
function linkHi(b) { const c = chainOf(b); ui.lkHi = { b, nodes: [...c.up, ...c.down], until: performance.now() + 9000 }; }
{ const d0 = drawBreak; drawBreak = ctx => { d0(ctx); const h = ui.lkHi; if (!h) return; const now = performance.now(); if (now > h.until) { ui.lkHi = null; return; }
  const a = Math.min(1, (h.until - now) / 1500), pulse = 0.5 + Math.sin(now / 160) * 0.5;
  ctx.save(); ctx.globalAlpha = a; ctx.lineWidth = 2;
  const all = [h.b, ...h.nodes];
  for (const n of all) { const ws = n.wst || wstOf(n), bad = WST[ws] && WST[ws][2] === 'bad'; ctx.strokeStyle = n === h.b ? '#ffe08a' : bad ? '#ff6b5b' : isMach(n) ? '#7fd07a' : 'rgba(124,196,255,.8)'; ctx.strokeRect(n.x * T + 2, n.y * T + 2, T - 4, T - 4);
    if (bad) { ctx.fillStyle = `rgba(255,90,70,${0.15 + pulse * 0.2})`; ctx.fillRect(n.x * T + 2, n.y * T + 2, T - 4, T - 4); } }
  ctx.strokeStyle = '#ffe08a'; ctx.setLineDash([4, 4]); ctx.lineDashOffset = -now / 40; ctx.beginPath();
  for (const n of all) for (const t of feedsOf(n)) if (all.includes(t)) { ctx.moveTo(n.x * T + 16, n.y * T + 16); ctx.lineTo(t.x * T + 16, t.y * T + 16); }
  ctx.stroke(); ctx.setLineDash([]);
  ctx.restore(); }; }
// ---------- Pestaña Conexiones ----------
BT_TABS.splice(BT_TABS.findIndex(t => t[0] === 'learn'), 0, ['links', 'Conexiones']);
const chipN = n => `<span class="lkn ${WST[n.wst || wstOf(n)]?.[2] || ''}" title="${esc(BD[n.type].n)} · ${esc(WST[n.wst || wstOf(n)]?.[1] || '')}">${itemImg(n.type, 18)}</span>`;
function chainHTML(b) {
  const c = chainOf(b), seq = [...c.up, b, ...c.down], ms = seq.filter(isMach);
  // Colapsa tramos de cintas en un "→ 3 →"
  const parts = []; let belts = 0;
  for (const n of seq) { if (isBelt(n) || n.type === 'pipe') { belts++; continue; } if (belts) { parts.push(`<span class="lkb">${belts} ${belts > 1 ? 'cintas' : 'cinta'}</span>`); belts = 0; } parts.push(n === b ? `<span class="lkn me">${itemImg(n.type, 22)}</span>` : chipN(n)); }
  if (belts) parts.push(`<span class="lkb">${belts} → ?</span>`);
  if (seq.length === 1) return `<p class="mut small">No está enlazada con nada. Pon una cinta, un brazo o un extractor que lleve sus piezas a otra máquina o a un cofre, y aparecerá aquí la cadena.</p>`;
  // Si alguien tiene la salida llena, la causa está más adelante: se busca el último problema de la línea
  const ws = n => n.wst = wstOf(n), bads = seq.filter(n => WST[ws(n)]?.[2] === 'bad' || n.wst === 'noinput');
  let bad = bads[0]; if (bad && bad.wst === 'outfull') bad = bads.filter(n => seq.indexOf(n) > seq.indexOf(bad)).pop() || bad;
  const bonus = b._chainN > 1 && famOf(b.type) === 'proc' ? ` · <b class="good">+${Math.round(3 * Math.min(5, b._chainN - 1))} % por línea</b>` : '';
  let h = `<div class="lkflow">${parts.join('<i class="lka">➜</i>')}</div><div class="small mut">${ms.length} máquina${ms.length !== 1 ? 's' : ''} en la línea · ${c.up.length} antes · ${c.down.length} después${bonus}</div>`;
  if (bad) { const w = WST[bad.wst || wstOf(bad)]; h += `<div class="lkbad">Cuello de botella: <b>${esc(bad.name || BD[bad.type].n)}</b> — ${w[0]} ${esc(w[1])}. <span class="mut">${esc(w[3])}</span></div>`; }
  else h += `<div class="lkok">✓ La línea fluye sin atascos.</div>`;
  return h;
}
function synHTML(b) {
  const f = famOf(b.type), rules = synFor(f); if (!rules.length && famOf(b.type) !== 'proc') return '<p class="mut small">Este bloque no se ve afectado por sus vecinos.</p>';
  const act = new Map((b.syn || []).map(s => [s[0], s[1]]));
  const grid = N8.slice(0, 4).concat([[0, 0]], N8.slice(4)).map(([dx, dy]) => { const n = dx || dy ? at(b.x + dx, b.y + dy) : b; return `<span class="${dx || dy ? '' : 'me'}">${n && n !== b || !(dx || dy) ? itemImg((n || b).type, 18) : ''}</span>`; }).join('');
  const rows = rules.slice().sort((a, c) => act.has(c) - act.has(a)).map(k => { const r = SYN[k], on = act.has(k); return `<div class="lks ${on ? (r.bad ? 'neg' : 'on') : ''}"><b>${r.i} ${esc(r.n)}${on && act.get(k) > 1 ? ' ×' + act.get(k) : ''}</b><span>${esc(r.d)}</span></div>`; });
  if (act.has('chain')) rows.unshift(`<div class="lks on"><b>⛓ Línea de producción ×${act.get('chain')}</b><span>Enlazada con otras máquinas: +3 % por cada una (máximo +15 %).</span></div>`);
  return `<div class="lkwrap"><div class="lkgrid">${grid}</div><div class="lklist">${rows.join('')}</div></div><p class="mut small">Brillan las que están activas ahora; las demás son ideas de qué poner al lado.</p>`;
}
function lkLiveHTML(b) {
  const w = WST[b.wst = wstOf(b)] || WST.idle, f = famOf(b.type);
  let h = `<div class="lkstate ${w[2]}"><b>${w[0]} ${esc(w[1])}</b><span>${esc(w[3])}</span></div>`;
  if (SOUT_FOR[f] || SIN_FOR[f]) h += `<div class="lksig"><span>Señal que recibe</span><span class="cb"><i style="width:${((b.pv || 0) / 15 * 100).toFixed(0)}%;background:#ff6a5a"></i></span><b>${b.pv || 0}</b><span>Señal que emite</span><span class="cb"><i style="width:${((b.mo || 0) / 15 * 100).toFixed(0)}%;background:#ff9a4a"></i></span><b>${b.mo || 0}</b></div>`;
  return h + `<div class="cssub">Cadena de producción</div>` + chainHTML(b) + `<div class="cssub">Vecinos y compatibilidad</div>` + synHTML(b);
}
BT_PANE.links = b => {
  const f = famOf(b.type), d = BD[b.type];
  let h = `<div id="lkLive">${lkLiveHTML(b)}</div><div class="btrow"><button data-lk="hi">🔎 Resaltar la cadena en el mapa</button></div>`;
  const so = SOUT_FOR[f], si = SIN_FOR[f];
  if (so || si) {
    h += `<div class="cssub">Señales de redstone</div>`;
    if (so) h += `<div class="btrow"><label>Emite señal <select data-lks="sOut">${so.map(k => `<option value="${k}" ${(b.sOut || '') === k ? 'selected' : ''}>${SOUT[k]}</option>`).join('')}</select></label></div>`;
    if (si) h += `<div class="btrow"><label>Al recibir señal <select data-lks="sIn">${si.map(k => `<option value="${k}" ${(b.sIn || '') === k ? 'selected' : ''}>${SIN[k]}</option>`).join('')}</select></label></div>`;
    h += `<p class="mut small">La señal sale por los cuatro lados: pon un cable o una puerta lógica pegada. Ejemplos: «Cuando le falta algo» → una alarma; un cofre «Cuando está lleno» → «Se para con señal» en la máquina que lo llena.</p>`;
  }
  if (d.dir && (b.out || d.machine)) {
    const outs = new Set(); if (d.machine && RECIPES[d.machine]) for (const r of RECIPES[d.machine]) for (const k in r.out || {}) outs.add(k);
    h += `<div class="cssub">Salida y entrada</div><div class="btrow"><label>Saca <select data-lks="oMode">${[['', 'Solo por delante'], ['spread', 'Repartido: delante y lados'], ['chest', 'Al cofre de al lado (si no, delante)'], ['hold', 'Nada: lo guarda dentro']].map(([k, n]) => `<option value="${k}" ${(b.oMode || '') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>`;
    if (outs.size > 1) h += `<div class="btrow"><label>Solo deja salir <select data-lks="oFilter"><option value="">Todo</option>${[...outs].filter(k => ITEMS[k]).map(k => `<option value="${k}" ${b.oFilter === k ? 'selected' : ''}>${esc(ITEMS[k].n)}</option>`).join('')}</select></label></div>`;
    if (d.machine) h += `<div class="btrow"><label><input type="checkbox" data-lks="iLock" ${b.iLock ? 'checked' : ''}> Con receta fija, aceptar solo sus ingredientes</label></div>`;
  }
  return h;
};
{ const bl = btLive; btLive = () => { bl(); const b = ui.panel, el = $('lkLive'); if (!b || !el || el.closest('[hidden]')) return; const h = lkLiveHTML(b); if (el._h !== h) { el._h = h; el.innerHTML = h; } }; }
$('mInv').addEventListener('change', e => {
  const b = ui.panel, k = e.target.dataset && e.target.dataset.lks; if (!b || !k) return;
  if (k === 'iLock') b.iLock = e.target.checked || null;
  else { b[k] = e.target.value || null; }
  if (k === 'sIn') { if (b.sIn === 'pulse') { b.off = true; b.batch = 0; } else if (b.off && !b.batch) b.off = false; if (b.sIn && BD[b.type].rsable) b.rs = 0; }
  if (k === 'sOut' && !b.sOut) { b.mo = 0; dirty.logic = true; }
  dirty.lists = true; blogEv(b, { sOut: 'Emite: ', sIn: 'Obedece: ', oMode: 'Salida: ', oFilter: 'Filtro: ', iLock: 'Entrada: ' }[k] + (k === 'iLock' ? (b.iLock ? 'solo receta' : 'todo') : ({ ...SOUT, ...SIN }[b[k] || ''] || (ITEMS[b[k]] || {}).n || b[k] || 'por defecto')));
});
$('mInv').addEventListener('click', e => { const t = e.target.closest('[data-lk]'); if (!t || !ui.panel) return; if (t.dataset.lk === 'hi') { linkHi(ui.panel); closeModal(); toast('Cadena resaltada en el mapa (amarillo: esta máquina · rojo: problema)'); } });
// En la tarjeta del cursor: estado y si forma parte de una línea
{ const b1 = blockCard; blockCard = b => { let h = b1(b); const ws = b.wst, x = []; if (ws && ws !== 'work' && ws !== 'idle' && WST[ws]) x.push(`<span class="${WST[ws][2] === 'bad' ? 'bad' : ''}">${WST[ws][0]} ${WST[ws][1]}</span>`); if (b._chainN > 1) x.push(`⛓ línea de ${b._chainN}`); if (b.sOut) x.push('⌁ emite'); if (b.syn && b.syn.length) x.push(b.syn.map(s => s[0] === 'chain' ? '' : SYN[s[0]].i).join('')); return x.length ? h + `<div class="hcm">${x.filter(Boolean).join(' · ')}</div>` : h; }; }
