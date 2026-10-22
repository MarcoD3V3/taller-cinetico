'use strict';
// Estado del mundo, bloques, listas por tipo y marcas de "sucio" para recalcular solo lo necesario.
const T = 32, DT = 0.05, STACK = 64, INV_N = 72, DAY_LEN = 600;
// Los tipos de casilla (G, GI) y los biomas están en world/biomes.js

let S = null, blocks = [];
const L = {};            // listas por tipo
const dirty = { kin: true, net: true, logic: true, lists: true };
let topoVer = 0; // sube con cada cambio de bloques: fuerza a refrescar sprites con conexiones
function markAll() { dirty.kin = dirty.net = dirty.logic = dirty.lists = true; topoVer++; }

// at(), gnd() y la carga de chunks están en world/chunks.js
function nearWater(x, y) { for (let d = 0; d < 4; d++) if (GI[gnd(x + DX[d], y + DY[d])].liquid === 'water') return true; return false; }
// Primer líquido junto a la casilla (agua, lava, ácido, petróleo, miel…) o null
function nearLiquid(x, y) { for (let d = 0; d < 4; d++) { const l = GI[gnd(x + DX[d], y + DY[d])].liquid; if (l && l !== 'ice' && l !== 'void') return l; } return null; }
function frontOf(b) { return at(b.x + DX[b.dir], b.y + DY[b.dir]); }
function backOf(b) { return at(b.x - DX[b.dir], b.y - DY[b.dir]); }

function makeB(type, x, y, dir) {
  const d = BD[type];
  const b = { type, x, y, dir: dir || 0, rpm: 0, angle: 0, f: 1, comp: null, o: 0 };
  if (d.inv || d.machine) { b.inv = {}; b.out = {}; b.cur = -1; b.prog = 0; }
  if (d.pw) b.E = 0;
  if (d.fl) { b.tanks = {}; for (const k in d.fl.tanks) b.tanks[k] = { t: null, a: 0, c: d.fl.tanks[k] }; }
  if (d.sides) b.sides = [0, 0, 0, 0];
  if (d.rsable) b.rs = 0;
  if (d.filter) b.filter = null;
  if (d.slots) b.slots = new Array(d.slots).fill(null);
  if (d.cfg) for (const p of d.cfg) b[p] = PARAMS[p].vals[p === 'mult' ? 2 : p === 'period' || p === 'th' ? 2 : 0];
  switch (type) {
    case 'belt': case 'brassBelt': b.items = []; break;
    case 'lever': b.on = false; break;
    case 'button': b.t = 0; break;
    case 'crank': b.timer = 0; break;
    case 'clock': b.t = 0; break;
    case 'extractor': b.cd = 0; break;
    case 'splitter': case 'sorter': b.buf = null; b.rr = 0; b.cd = 0; break;
    case 'wire': b.sig = 0; break;
    case 'wirebridge': b.sh = 0; b.sv = 0; break;
    case 'repeater': b.hist = []; break;
    case 'flipflop': b.st = 0; b.last = 0; break;
    case 'counter': b.cnt = 0; b.last = 0; b.pt = 0; break;
    case 'depot': b.item = null; break;
    case 'arm': b.cd = 0; b.hold = null; b.swing = 0; break;
    case 'ejector': b.buf = null; b.cd = 0; break;
    case 'bench': b.slots = new Array(9).fill(null); b.prog = 0; b.cat = 0; break;
    case 'assembler': b.recipe = 0; break;
  }
  return b;
}
function addBlock(b) { setBlockAt(b.x, b.y, b); blocks.push(b); markAll(); onTileChange(b.x, b.y, true); }
function delBlock(b) {
  setBlockAt(b.x, b.y, null); const i = blocks.indexOf(b);
  if (i >= 0) { blocks[i] = blocks[blocks.length - 1]; blocks.pop(); }
  markAll(); onTileChange(b.x, b.y, true);
}
// Agrupa los bloques por tipo para que cada sistema recorra solo lo suyo.
function rebuildLists() {
  for (const k in L) L[k].length = 0;
  for (const k in BD) if (!L[k]) L[k] = [];
  L.gens = L.gens || []; L.emit = L.emit || []; L.rsc = L.rsc || []; L.kinB = L.kinB || []; L.light = L.light || [];
  L.gens.length = L.emit.length = L.rsc.length = L.kinB.length = L.light.length = 0;
  for (const b of blocks) {
    const d = BD[b.type]; L[b.type].push(b);
    if (d.gen) L.gens.push(b);
    if (d.emit) L.emit.push(b);
    if (d.rsin || (d.rsable && b.rs)) L.rsc.push(b);
    if (d.kin) L.kinB.push(b);
    if (d.light) L.light.push(b);
  }
  dirty.lists = false;
}
// Ganchos (los rellenan render/mapa)
let onTileChange = () => { };

// ---------- Inventario estilo cuadrícula ----------
// 36 ranuras: 0-8 barra rápida, 9-35 mochila. Cada ranura: null o {id, n}.
const range = (a, b) => { const r = []; for (let i = a; i < b; i++) r.push(i); return r; };
const FILL_ORDER = [...range(9, INV_N), ...range(0, 9)];
let invVersion = 0;
function invChanged() { invVersion++; if (S.autoSort) S._sortPending = true; }
const emptySlots = () => { let n = 0; for (let i = 9; i < INV_N; i++) if (!S.inv[i]) n++; return n; };
function slotsAdd(arr, id, n, sim, order) {
  for (let i = 0; i < arr.length && n > 0; i++) { const s = arr[i]; if (s && s.id === id && s.n < STACK) { const m = Math.min(n, STACK - s.n); if (!sim) s.n += m; n -= m; } }
  const ord = order || null;
  for (let j = 0; j < arr.length && n > 0; j++) { const i = ord ? ord[j] : j; if (!arr[i]) { const m = Math.min(n, STACK); if (!sim) arr[i] = { id, n: m }; n -= m; } }
  return n;
}
function slotsCount(arr, id) { let c = 0; for (const s of arr) if (s && s.id === id) c += s.n; return c; }
function slotsTake(arr, id, n) {
  let got = 0;
  for (let i = arr.length - 1; i >= 0 && got < n; i--) { const s = arr[i]; if (s && s.id === id) { const m = Math.min(n - got, s.n); s.n -= m; got += m; if (!s.n) arr[i] = null; } }
  return got;
}
function slotsFirst(arr, filter) { for (const s of arr) if (s && (!filter || s.id === filter)) return s.id; return null; }
function slotsFill(arr) { let u = 0; for (const s of arr) if (s) u += s.n; return u / (arr.length * STACK); }
// Recoger objetos solo reordena si aparece una pila nueva en la mochila (y nunca con el inventario
// abierto: se hace al cerrarlo). Mover objetos a mano jamás reordena.
function invAdd(id, n) {
  const e0 = emptySlots(), left = slotsAdd(S.inv, id, n, false, FILL_ORDER);
  if (left !== n) { invVersion++; if (S.autoSort && emptySlots() < e0) S._sortPending = true; }
  return left;
}
function invCount(id) { return slotsCount(S.inv, id); }
function invTake(id, n) { const g = slotsTake(S.inv, id, n); if (g) invVersion++; return g; }
function invHasAll(req) { for (const k in req) if (invCount(k) < req[k]) return false; return true; }
function sortInv() {
  const tot = {};
  for (let i = 9; i < INV_N; i++) { const s = S.inv[i]; if (s) { tot[s.id] = (tot[s.id] || 0) + s.n; S.inv[i] = null; } }
  const ids = Object.keys(tot).sort((a, b) => (ITEMS[a].cat - ITEMS[b].cat) || (ORDER_IDX[a] - ORDER_IDX[b]));
  let i = 9;
  for (const id of ids) { let n = tot[id]; while (n > 0 && i < INV_N) { const m = Math.min(n, STACK); S.inv[i++] = { id, n: m }; n -= m; } if (n > 0) slotsAdd(S.inv, id, n); }
  S._sortPending = false; invVersion++;
}
function isPlaceable(id) { return !!(id && BD[id] && BD[id].cat >= 0); }
