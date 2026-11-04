'use strict';
// =====================================================================================
//  Tu pueblo de colonos (fases 1 y 2). En los pueblos del mundo hay aldeanos dispuestos a mudarse
//  (llevan ✦ en el nombre): habla con ellos (F) e invítalos. Necesitan una cama libre en tu
//  base. Comen de tus cofres (cualquier cofre con comida es la despensa), duermen de noche en
//  su cama y de día trabajan solos en las zonas que pintes con la Vara de capataz:
//   🌾 Granjero: ara, siembra, riega y cosecha · 🪓 Leñador: tala y replanta · ⛏ Minero: pica.
//  Lo que sacan lo guardan en el cofre más cercano. Tecla , (coma) o el botón 🏘: ventana «Mi pueblo».
// =====================================================================================
const COL_JOBS = {
  none: { n: 'Sin oficio', i: '💤', c: 8, tool: null },
  farm: { n: 'Granjero', i: '🌾', c: 4, tool: ['ironHoe', 'woodHoe', 'hoe'], z: 'f', sk: 'farm' },
  wood: { n: 'Leñador', i: '🪓', c: 2, tool: ['ironAxe', 'stoneAxe', 'woodAxe'], z: 'w', sk: 'wood' },
  mine: { n: 'Minero', i: '⛏', c: 6, tool: ['ironPickaxe', 'stonePickaxe', 'woodPickaxe', 'woodPick'], z: 'm', sk: 'mine' },
  haul: { n: 'Transportista', i: '📦', c: 3, tool: null, sk: 'haul' },
  cook: { n: 'Cocinero', i: '🍳', c: 1, tool: null, sk: 'cook' },
  smith: { n: 'Herrero', i: '⚒', c: 10, tool: ['hammer'], sk: 'smith' },
  build: { n: 'Constructor', i: '🔨', c: 5, tool: ['hammer'], sk: 'build' },
};
const COL_WORKJOBS = ['farm', 'wood', 'mine', 'haul', 'cook', 'smith', 'build'];
const COL_FUEL = { coal: 8, charcoal: 8, log: 2, planks: 1 };
const COL_ZONES = { f: { n: 'Cultivo', i: '🌾', c: 'rgba(150,220,90,' }, w: { n: 'Tala', i: '🪓', c: 'rgba(90,170,60,' }, m: { n: 'Mina', i: '⛏', c: 'rgba(200,160,110,' } };
const COL_TRAITS = {
  hard: { n: 'Trabajador', d: 'Trabaja un 25 % más rápido', spd: 1.25 },
  lazy: { n: 'Perezoso', d: 'Trabaja un 20 % más lento', spd: 0.8 },
  glut: { n: 'Glotón', d: 'Le entra hambre antes', hun: 1.4 },
  frugal: { n: 'Frugal', d: 'Come menos', hun: 0.7 },
  strong: { n: 'Fuerte', d: 'Carga el doble antes de ir al cofre', carry: 2 },
  early: { n: 'Madrugador', d: 'Empieza a trabajar al alba', early: 1 },
  owl: { n: 'Noctámbulo', d: 'Aguanta más sin dormir', slp: 0.7 },
  social: { n: 'Sociable', d: 'Le gusta la compañía' },
  loner: { n: 'Solitario', d: 'Prefiere trabajar solo' },
  handy: { n: 'Manitas', d: 'Aprende sus oficios más rápido', xp: 1.6 },
};
const COL_SK = { farm: '🌾 Cultivo', wood: '🪓 Tala', mine: '⛏ Minería', haul: '📦 Transporte', cook: '🍳 Cocina', smith: '⚒ Herrería', build: '🔨 Construcción' };
const colHash = (s, k) => { let h = 2166136261 ^ k; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return ((h >>> 0) % 100000) / 100000; };
function colS() { const c = S.colony || (S.colony = { list: [], zones: {}, gone: {}, mode: 'f', n: 0 }); c.list = c.list || []; c.zones = c.zones || {}; c.gone = c.gone || {}; c.routes = c.routes || []; c.plans = c.plans || {}; return c; }
const colDay = () => S.gen.dayLen || DAY_LEN;
const colHour = () => typeof folkHour === 'function' ? folkHour() : 12;
// ---------- Aldeanos que se quieren mudar ----------
const colFolkKey = n => n.sid + ':' + (n.fi ?? 0);
function colWilling(n) { return !!(n && n.folk && !['elder', 'guard', 'child', 'merchant'].includes(n.role) && colHash(String(n.sid), (n.fi ?? 0) * 31 + 7) < 0.4); }
{ const f0 = folkSpawn; folkSpawn = s => { const list = f0(s); list.forEach((n, i) => { n.fi = i; if (colWilling(n) && !/✦/.test(n.label)) n.label = '✦ ' + n.label; });
  const g = S && S.colony && S.colony.gone; if (g) { const keep = list.filter(n => !g[colFolkKey(n)]); list.length = 0; list.push(...keep); } return list; }; }
function colFromFolk(n) {
  const R = stlR((colHash(colFolkKey(n), 3) * 2147483647) | 0), keys = Object.keys(COL_TRAITS), tr = [];
  while (tr.length < 2) { const k = pickR(R, keys); if (!tr.includes(k) && !(tr.includes('hard') && k === 'lazy') && !(tr.includes('lazy') && k === 'hard') && !(tr.includes('glut') && k === 'frugal') && !(tr.includes('frugal') && k === 'glut') && !(tr.includes('social') && k === 'loner') && !(tr.includes('loner') && k === 'social')) tr.push(k); }
  const sk = {}; for (const k in COL_SK) sk[k] = R() * 3; if (n.role === 'farmer') sk.farm += 3; if (n.role === 'miner') sk.mine += 3; if (n.role === 'smith') { sk.smith += 3; sk.mine += 1; } if (n.role === 'walker') sk.haul += 2;
  for (const k in sk) sk[k] = Math.round(sk[k] * 10) / 10;
  const name = (n.label || 'Aldeano').replace(/^✦ /, '').split(' · ')[0], s = typeof _stlCand !== 'undefined' && _stlCand.get(n.sid);
  return { id: ++colS().n, name, look: { ...n.look }, equip: { ...(n.equip || {}) }, from: s ? s.name : '', cult: s ? s.cult : null, age: 18 + ((R() * 40) | 0), traits: tr, sk,
    job: n.role === 'farmer' ? 'farm' : n.role === 'miner' ? 'mine' : n.role === 'smith' ? 'smith' : 'none', bed: null, x: 0, y: 0, hun: 85, slp: 90, st: 'Llegando', carry: {}, starve: 0 };
}
function colTrait(c, k) { return c.traits.reduce((m, t) => m * ((COL_TRAITS[t] || {})[k] || 1), 1); }
const colFoods = () => Object.keys(ITEMS).filter(id => ITEMS[id].food && ITEMS[id].food.f > 0);
function colRecruitCost(n) { const free = colHash(colFolkKey(n), 11) < 0.3; return free ? null : 3 + ((colHash(colFolkKey(n), 13) * 4) | 0); } // cuánta comida piden (o nada)
// ---------- Camas, cofres y núcleo ----------
const colBeds = () => blocks.filter(b => b.type === 'bed');
function colFreeBed() { const used = new Set(colS().list.filter(c => c.bed).map(c => c.bed.x + ',' + c.bed.y)); return colBeds().find(b => !used.has(b.x + ',' + b.y)) || null; }
let _colChC = null, _colChT = 0, _colChN = -1;
const colChests = () => { const now = performance.now(); if (!_colChC || now - _colChT > 800 || blocks.length !== _colChN) { _colChC = blocks.filter(b => (b.type === 'chest' || b.type === 'vault') && b.slots); _colChT = now; _colChN = blocks.length; } return _colChC; };
function colNearChest(x, y, pred) { let best = null, bd = 1e9; for (const b of colChests()) { const d = Math.hypot(b.x - x, b.y - y); if (d < bd && d < 90 && (!pred || pred(b))) { bd = d; best = b; } } return best; }
function colHome() { const core = L.core && L.core[0]; if (S.hearth) return [S.hearth.x, S.hearth.y + 4]; if (core) return [core.x, core.y + 2]; return [Math.floor(S.player.x / T), Math.floor(S.player.y / T)]; }
// ---------- Invitar ----------
function colRecruit(n) {
  const C = colS(), bed = colFreeBed();
  if (!bed) { toastErr('Necesitas una cama libre en tu base para que pueda mudarse'); return false; }
  const cost = colRecruitCost(n);
  if (cost) { const foods = colFoods().filter(id => invCount(id) > 0).sort((a, b) => invCount(b) - invCount(a)); let have = 0; for (const id of foods) have += invCount(id);
    if (have < cost) { toastErr(`Te pide ${cost} de comida para el viaje (tienes ${have})`); return false; }
    let left = cost; for (const id of foods) { if (left <= 0) break; left -= invTake(id, Math.min(left, invCount(id))); } }
  const c = colFromFolk(n), [hx, hy] = colHome(); c.bed = { x: bed.x, y: bed.y }; c.x = (hx + 0.5) * T; c.y = (hy + 0.5) * T;
  C.list.push(c); C.gone[colFolkKey(n)] = 1;
  for (const list of FOLK.values()) { const i = list.indexOf(n); if (i >= 0) list.splice(i, 1); }
  if (!C.gotRod && ITEMS.foremanRod) { C.gotRod = 1; invGive('foremanRod', 1, S.player.x, S.player.y); }
  toast(`🏘 ${c.name} se muda a tu pueblo. Ya te espera junto al núcleo. Pulsa , (coma) o el botón 🏘 para darle un oficio${C.list.length === 1 ? ' · te dio una Vara de capataz para marcar dónde trabajar' : ''}.`, true);
  if (typeof tone === 'function') tone(520, 0.12, 'sine', 0.04, 1.5); return true;
}
// ---------- Zonas ----------
let _colZv = 0, _colZc = null, _colZcv = -1;
function colZoneList(z) { if (_colZcv !== _colZv || !_colZc) { _colZc = { f: [], w: [], m: [] }; for (const k in colS().zones) { const t = colS().zones[k], [x, y] = k.split(',').map(Number); if (_colZc[t]) _colZc[t].push([x, y]); } _colZcv = _colZv; } return _colZc[z] || []; }
function colPaint(x, y, mode) { const Z = colS().zones, k = x + ',' + y; if (mode === 'x') { if (Z[k]) { delete Z[k]; _colZv++; } } else if (Z[k] !== mode) { Z[k] = mode; _colZv++; } }
// ---------- Qué hay que hacer en una casilla ----------
const colSeeds = () => Object.keys(ITEMS).filter(id => ITEMS[id].seed);
function colTask(job, x, y) {
  const g = GI[gnd(x, y)], b = at(x, y);
  if (job === 'wood') return g.tree && !b ? 'chop' : null;
  if (job === 'mine') return g.solid && !g.tree && g.hp && !b && !g.ruin && !g.sealed ? 'dig' : null;
  if (job === 'farm') { if (b && b.type === 'crop') { if (cropStage(b) >= 3) return 'harvest'; if (gnd(x, y) !== G.FARMWET) return 'water'; return null; }
    if (b) return null; if (isFarm(gnd(x, y))) return 'plant'; if (isSoil(gnd(x, y))) return 'till'; }
  return null;
}
const _colBusy = new Set();
let _colBdC = false, _colBdT = 0;
const colHasBoard = () => { const now = performance.now(); if (now - _colBdT > 1000) { _colBdT = now; _colBdC = blocks.some(b => b.type === 'jobBoard'); } return _colBdC; };
// Oficios de un colono por orden: con Tablón de trabajos, sus prioridades (1 primero); sin él, su único oficio
function colJobs(c) { if (colHasBoard() && c.pri) return Object.keys(c.pri).filter(k => c.pri[k] > 0 && COL_JOBS[k]).sort((a, b) => c.pri[a] - c.pri[b]); return c.job && c.job !== 'none' ? [c.job] : []; }
function colZoneWork(c, j) { const J = COL_JOBS[j]; const tx = c.x / T, ty = c.y / T; let best = null, bd = 1e9;
  for (const [x, y] of colZoneList(J.z)) { const k = x + ',' + y; if (_colBusy.has(k) || c.bad && c.bad[k] > S.time) continue; const d = Math.hypot(x - tx, y - ty); if (d >= bd) continue;
    const t = colTask(j, x, y); if (!t) continue; if (t === 'plant' && !colSeedAvail(c)) continue; bd = d; best = { x, y, t, j, key: k }; }
  return best; }
// Transporte: rutas de un bloque a otro (cofres, máquinas, depósitos, cintas…)
function colMovable(src, dst) {
  const ids = src.slots ? [...new Set(src.slots.filter(Boolean).map(s => s.id))] : src.item ? [src.item.id] : src.out ? Object.keys(src.out) : [];
  for (const id of ids) if (extractPeek(src, id) === id && accept(dst, id, dst.dir || 0, true)) return id; return null; }
function colHaulWork(c) { const R = colS().routes; for (let i = 0; i < R.length; i++) { const r = R[i], key = 'r' + i; if (_colBusy.has(key)) continue; const a = at(r.a[0], r.a[1]), b = at(r.b[0], r.b[1]); if (!a || !b) continue;
  const id = colMovable(a, b); if (id) return { t: 'haul', j: 'haul', x: a.x, y: a.y, ri: i, id, ph: 0, multi: 1, key }; } return null; }
// Cocina y herrería: en un horno (o una hoguera para cocinar) con lo que haya en los cofres
let _colRecC = null;
function colRecipes(j) { if (!_colRecC) { const F = (RECIPES.furnace || []).filter(r => r.in && r.out && !r.fin && !r.fout); _colRecC = {
    cook: F.filter(r => Object.keys(r.out).every(id => ITEMS[id] && ITEMS[id].food && ITEMS[id].food.f > 0)),
    smith: F.filter(r => Object.keys(r.out).every(id => /Ingot$/.test(id) || id === 'glass' || id === 'brick')) }; } return _colRecC[j] || []; }
const colStations = j => blocks.filter(b => b.type === 'furnace' || j === 'cook' && b.type === 'campfire');
const colFuelIn = b => Object.keys(COL_FUEL).find(id => slotsCount(b.slots, id) > 0);
const colFoodStock = () => colChests().reduce((a, b) => a + colFoods().reduce((s, id) => s + slotsCount(b.slots, id), 0), 0);
function colCraftWork(c, j) {
  const [hx, hy] = colHome();
  for (const st of colStations(j)) { const key = 's' + st.x + ',' + st.y; if (_colBusy.has(key) || Math.hypot(st.x - hx, st.y - hy) > 90) continue;
    if (st.type === 'furnace' && !((c.fuel || 0) > 0) && !colNearChest(st.x, st.y, colFuelIn)) continue;
    if (j === 'cook' && colFoodStock() > 120) break;
    for (const rec of colRecipes(j)) { const ch = colNearChest(st.x, st.y, b => Object.entries(rec.in).every(([id, n]) => slotsCount(b.slots, id) >= n)); if (ch) return { t: 'craft', j, x: st.x, y: st.y, rec, ch: [ch.x, ch.y], ph: 0, multi: 1, key, fuel: st.type === 'furnace' }; }
    if (j === 'smith') { const need = colS().list.find(o => !o.gear), ch = need && colNearChest(st.x, st.y, b => slotsCount(b.slots, 'ironIngot') >= 2); if (ch) return { t: 'forge', j, x: st.x, y: st.y, ch: [ch.x, ch.y], ph: 0, multi: 1, key, fuel: st.type === 'furnace', who: need.id }; } }
  return null; }
// Construcción: planos que pintas con la Vara (el bloque lo cogen de un cofre)
/* como canPlace, pero sin mirar tu inventario (el constructor usa los bloques del cofre) */
const colCantBuild = (t, x, y) => { const e = canPlace(t, x, y); return e && !/quedan|No tienes/i.test(e) ? e : null; };
function colBuildWork(c) { const P = colS().plans, tx = c.x / T, ty = c.y / T; let best = null, bd = 1e9;
  for (const k in P) { if (_colBusy.has(k)) continue; const [x, y] = k.split(',').map(Number), p = P[k], b = at(x, y); if (b) { if (b.type === p.t) delete P[k]; continue; }
    const d = Math.hypot(x - tx, y - ty); if (d >= bd || c.bad && c.bad[k] > S.time) continue; if (!BD[p.t] || colCantBuild(p.t, x, y)) continue;
    const own = (c.carry[p.t] || 0) > 0, ch = own ? null : colNearChest(x, y, b2 => slotsCount(b2.slots, p.t) > 0); if (!own && !ch) continue;
    bd = d; best = { t: 'build', j: 'build', x, y, type: p.t, d: p.d || 0, ch: ch ? [ch.x, ch.y] : null, ph: ch ? 0 : 1, multi: 1, key: k }; }
  return best; }
function colFindWork(c) { for (const j of colJobs(c)) { const J = COL_JOBS[j]; let w = null;
    if (J.z) w = colZoneWork(c, j); else if (j === 'haul') w = colHaulWork(c); else if (j === 'cook' || j === 'smith') w = colCraftWork(c, j); else if (j === 'build') w = colBuildWork(c);
    if (w) return w; } return null; }
const colCarryN = c => Object.values(c.carry).reduce((a, b) => a + b, 0);
const colSeedIn = o => colSeeds().find(id => (o[id] || 0) > 0);
function colSeedAvail(c) { if (colSeedIn(c.carry)) return true; return !!colNearChest(c.x / T, c.y / T, b => colSeeds().some(id => slotsCount(b.slots, id) > 0)); }
// ---------- Simulación ----------
function colGo(c, x, y, near) { const n = near || 0.35; if (c.gx === (x + 0.5) * T && c.gy === (y + 0.5) * T && c.near === n) return; c.gx = (x + 0.5) * T; c.gy = (y + 0.5) * T; c.near = n; c.path = null; c.pi = 0; }
/* Camino casilla a casilla (búsqueda en anchura, 8 direcciones sin cortar esquinas): rodea árboles, rocas y bloques.
   near ≥ 1: basta con llegar al lado (para talar, picar o abrir un cofre) */
const colFree = (x, y, c) => passable((x + 0.5) * T, (y + 0.5) * T + 4, c);
function colPath(c) {
  const sx = Math.floor(c.x / T), sy = Math.floor(c.y / T), gx = Math.floor(c.gx / T), gy = Math.floor(c.gy / T), adj = c.near >= 1;
  const goal = (x, y) => adj ? Math.max(Math.abs(x - gx), Math.abs(y - gy)) <= 1 && !(x === gx && y === gy) : x === gx && y === gy;
  if (goal(sx, sy)) return [];
  const prev = new Map(), k0 = sx + ',' + sy, q = [[sx, sy]]; prev.set(k0, null); let end = null, n = 0;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (q.length && n++ < 5000) { const [x, y] = q.shift(); if (goal(x, y)) { end = [x, y]; break; }
    for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (prev.has(k) || Math.abs(nx - sx) > 70 || Math.abs(ny - sy) > 70) continue;
      if (!colFree(nx, ny, c) || dx && dy && (!colFree(x + dx, y, c) || !colFree(x, y + dy, c))) continue; prev.set(k, x + ',' + y); q.push([nx, ny]); } }
  if (!end) return null; const path = []; let k = end[0] + ',' + end[1]; while (k && k !== k0) { const [x, y] = k.split(',').map(Number); path.push([x, y]); k = prev.get(k); } return path.reverse();
}
function colMove(c, dt) {
  if (c.gx === undefined) return true;
  if (!c.path) { const gk = Math.floor(c.gx / T) + ',' + Math.floor(c.gy / T) + ',' + (c.near >= 1 ? 1 : 0), now = performance.now();
    if (c._pf && c._pf.k === gk && now < c._pf.t) { c.gx = undefined; return 'stuck'; }
    if (!colFree(Math.floor(c.x / T), Math.floor(c.y / T), c)) colOffBed(c);
    c.path = colPath(c); c.pi = 0; if (!c.path) { c._pf = { k: gk, t: now + 2500 }; c.gx = undefined; return 'stuck'; } }
  if (c.pi >= c.path.length) { c.moving = false; return true; }
  const [wx, wy] = c.path[c.pi], tx = (wx + 0.5) * T, ty = (wy + 0.5) * T, dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
  const sp = 2.4 * T * dt * (c.hun <= 0 ? 0.6 : 1); c.moving = true; c.face = dx > 0 ? 1 : dx < 0 ? -1 : c.face; c.ph = (c.ph || 0) + dt * 8;
  if (d <= sp) { c.x = tx; c.y = ty; c.pi++; if (c.pi < c.path.length) { const [nx, ny] = c.path[c.pi]; if (!colFree(nx, ny, c)) c.path = null; } return c.pi >= c.path?.length ? (c.moving = false, true) : false; }
  c.x += dx / d * sp; c.y += dy / d * sp; return false;
}
/* Al despertar (o si se queda encima de un bloque que no se pisa): a la casilla libre más cercana */
function colOffBed(c) { const tx = Math.floor(c.x / T), ty = Math.floor(c.y / T); if (colFree(tx, ty, c)) return;
  for (let r = 1; r <= 3; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !colFree(tx + dx, ty + dy, c)) continue; c.x = (tx + dx + 0.5) * T; c.y = (ty + dy + 0.5) * T; c.gx = undefined; c.path = null; return; } }
function colDeposit(c) {
  const ch = colNearChest(c.x / T, c.y / T, b => Object.keys(c.carry).some(id => slotsAdd(b.slots, id, 1, true) === 0));
  if (!ch) { c.st = 'No encuentra cofre con sitio'; return false; }
  if (Math.hypot(ch.x * T + T / 2 - c.x, ch.y * T + T / 2 - c.y) > 1.6 * T) { colGo(c, ch.x, ch.y, 1.2); c.st = 'Guardando en el cofre'; return true; }
  for (const id of Object.keys(c.carry)) { const left = slotsAdd(ch.slots, id, c.carry[id]); if (left) c.carry[id] = left; else delete c.carry[id]; }
  if (typeof dirty !== 'undefined') dirty.lists = true; c.st = 'Guardó lo recogido'; return true;
}
function colEat(c) {
  const fid = ch => colFoods().find(id => slotsCount(ch.slots, id) > 0), ch = colNearChest(c.x / T, c.y / T, b => !!fid(b));
  if (!ch) { c.st = '¡Sin comida en los cofres!'; c.nofood = true; return false; } c.nofood = false;
  if (Math.hypot(ch.x * T + T / 2 - c.x, ch.y * T + T / 2 - c.y) > 1.6 * T) { colGo(c, ch.x, ch.y, 1.2); c.st = 'Va a comer'; return true; }
  const id = fid(ch); slotsTake(ch.slots, id, 1); (c.ate || (c.ate = [])).push(id); if (c.ate.length > 6) c.ate.shift(); c.hun = Math.min(100, c.hun + Math.max(15, ITEMS[id].food.f * 1.6)); c.st = 'Comió ' + ITEMS[id].n.toLowerCase(); c.eatT = 1.5; return true;
}
function colDoTask(c, w) {
  const { x, y, t } = w, g = GI[gnd(x, y)], sk = COL_JOBS[w.j || c.job].sk, gain = () => { c.sk[sk] = Math.min(10, Math.round((c.sk[sk] + 0.04 * colTrait(c, 'xp')) * 100) / 100); };
  if (t === 'chop') { if (g.drop) dictAdd(c.carry, g.drop, 2 + (Math.random() < 0.4 ? 1 : 0)); if (g.extra && Math.random() < g.extra[1]) dictAdd(c.carry, g.extra[0], 1);
    setGround(x, y, g.u >= 0 ? g.u : G.GRASS); if (typeof burst === 'function') burst(x, y, '#6a8a3a');
    if (BD.sapling && Math.random() < 0.75 && typeof sapOk === 'function' && sapOk(x, y)) { const s = makeB('sapling', x, y, 0); s.g = 0; addBlock(s); } gain(); return; }
  if (t === 'dig') { const lv = lvAt(x, y); if (g.drop) dictAdd(c.carry, g.drop, 1); setGround(x, y, g.u >= 0 ? g.u : G.GRASS); if (lv > LV_FOOT) setLvMod(x, y, Math.max(LV_FOOT, lv - 1)); if (typeof burst === 'function') burst(x, y, '#9a9488'); gain(); return; }
  if (t === 'till') { tillTile(x, y, true); gain(); return; }
  if (t === 'water') { waterTile(x, y); return; }
  if (t === 'plant') { let sid = colSeedIn(c.carry); if (!sid) return; dictAdd(c.carry, sid, -1); const k = ITEMS[sid].seed, b = makeB('crop', x, y, 0); b.crop = k; b.g = 0; b.planted = S.time; addBlock(b); gain(); return; }
  if (t === 'harvest') { const b = at(x, y), d = b && CROP[b.crop]; if (!d) return; const [a, z] = d.y; dictAdd(c.carry, d.item, a + Math.floor(Math.random() * (z - a + 1)) + (c.sk.farm >= 6 && Math.random() < 0.3 ? 1 : 0)); dictAdd(c.carry, d.seed, Math.random() < 0.6 ? 2 : 1);
    if (d.re) { b.g = [0, 0.25, 0.6][d.re] || 0.6; b.fert = 0; b._tv = -1; } else { delBlock(b); const sid = d.seed; if ((c.carry[sid] || 0) > 0 && isFarm(gnd(x, y))) { dictAdd(c.carry, sid, -1); const nb = makeB('crop', x, y, 0); nb.crop = b.crop; nb.g = 0; nb.planted = S.time; addBlock(nb); } }
    if (typeof dirty !== 'undefined') dirty.lists = true; gain(); }
}
const COL_WORK_T = { chop: 7, dig: 5, till: 2, water: 1, plant: 1.5, harvest: 2 };
function colTick(c, dt) {
  const dl = colDay(), h = colHour(), night = h < (colTrait(c, 'early') > 1 ? 5 : 6.5) || h >= 21;
  // necesidades
  c.hun = Math.max(0, c.hun - 100 / (dl * 1.3) * dt * colTrait(c, 'hun'));
  if (c.sleeping) c.slp = Math.min(100, c.slp + 100 / (dl * 0.25) * dt); else c.slp = Math.max(0, c.slp - 100 / (dl * 0.8) * dt * colTrait(c, 'slp'));
  if (c.hun <= 0) { c.starve += dt; if (c.starve > dl) return 'leave'; } else c.starve = 0;
  if (c.eatT > 0) { c.eatT -= dt; return; }
  if (c.sleeping) { if ((!night && c.slp > 60) || c.slp >= 100 && !night) { c.sleeping = false; c.nodep = 0; c.st = 'Se despierta'; colOffBed(c); } else { c.st = 'Durmiendo'; return; } }
  // con hambre: a comer
  if (c.hun < 35 && !c.nofoodT) { if (colEat(c)) { const r = colMove(c, dt); if (r === 'stuck') c.nofoodT = 20; return; } else c.nofoodT = 30; }
  if (c.nofoodT) c.nofoodT = Math.max(0, c.nofoodT - dt);
  // de noche (o agotado): a la cama
  if (night || c.slp < 8) { if (colCarryN(c) && !c.nodep) { if (colDeposit(c)) { if (colCarryN(c)) { if (colMove(c, dt) === 'stuck') c.nodep = 1; return; } } else c.nodep = 1; }
    const bed = c.bed && at(c.bed.x, c.bed.y); if (bed && bed.type === 'bed') { colGo(c, bed.x, bed.y, 1.05); const r = colMove(c, dt); if (r === true) { c.x = (bed.x + 0.5) * T; c.y = (bed.y + 0.5) * T; c.gx = undefined; c.sleeping = true; c.st = 'Durmiendo'; } else if (r === 'stuck') { c.sleeping = true; c.st = 'No llega a su cama: duerme aquí'; } else c.st = 'Va a su cama'; }
    else { c.bed = null; const nb = colFreeBed(); if (nb) c.bed = { x: nb.x, y: nb.y }; else { c.sleeping = true; c.st = 'Duerme en el suelo (no tiene cama)'; } }
    return; }
  // de día: trabajar
  if (c.w) { const w = c.w, k = w.key || w.x + ',' + w.y; _colBusy.add(k);
    if (w.multi) { const r = colMulti(c, w, dt); if (r) { _colBusy.delete(k); c.w = null; c.wt = 0; c.work = 0; if (r === 'stuck') (c.bad || (c.bad = {}))[k] = S.time + 60; } return; }
    if (!colTask(w.j, w.x, w.y)) { _colBusy.delete(k); c.w = null; c.wt = 0; return; }
    const r = colMove(c, dt); if (r === 'stuck') { (c.bad || (c.bad = {}))[k] = S.time + 60; _colBusy.delete(k); c.w = null; return; }
    if (r !== true) { c.st = 'Va a trabajar'; return; }
    if (w.t === 'plant' && !colSeedIn(c.carry)) { const ch = colNearChest(c.x / T, c.y / T, b => colSeeds().some(id => slotsCount(b.slots, id) > 0)); _colBusy.delete(k); c.w = null;
      if (ch) { c.fetch = { x: ch.x, y: ch.y }; colGo(c, ch.x, ch.y, 1.2); } return; }
    c.work = (c.work || 0) + dt; c.st = { chop: 'Talando', dig: 'Picando', till: 'Arando', water: 'Regando', plant: 'Sembrando', harvest: 'Cosechando' }[w.t];
    let need = COL_WORK_T[w.t]; if (w.t === 'dig' && typeof veinLv === 'function') need *= 1 + veinLv(GI[gnd(w.x, w.y)]) * 0.5;
    c.wt = (c.wt || 0) + dt * colSpd(c, w.j); if (c.wt >= need) { colDoTask(c, w); c.wt = 0; _colBusy.delete(k); c.w = null; c.work = 0; }
    return; }
  c.work = 0;
  // ir a por semillas
  if (c.fetch) { const r = colMove(c, dt); if (r === true) { const ch = at(c.fetch.x, c.fetch.y); c.fetch = null; if (ch && ch.slots) { const sid = colSeeds().find(id => slotsCount(ch.slots, id) > 0); if (sid) dictAdd(c.carry, sid, slotsTake(ch.slots, sid, 8)); } } else if (r === 'stuck') c.fetch = null; else c.st = 'Busca semillas'; return; }
  // cargado (o sin nada más que hacer): al cofre
  const jobs = colJobs(c);
  if (colCarryN(c) >= 12 * colTrait(c, 'carry') || !jobs.length && colCarryN(c)) c.dep = true;
  if (c.dep) { if (!colCarryN(c)) c.dep = false; else if (colDeposit(c)) { if (colCarryN(c)) colMove(c, dt); return; } else c.dep = false; }
  if (!jobs.length) { c.st = colHasBoard() && c.pri ? 'Sin oficios activos en el Tablón' : 'Sin oficio: dale uno (tecla ,)'; colIdle(c, dt); return; }
  if ((c.findT = (c.findT || 0) - dt) > 0) { colIdle(c, dt); return; }
  const w = colFindWork(c); if (w) { c.w = w; if (!w.multi) colGo(c, w.x, w.y, w.t === 'chop' || w.t === 'dig' ? 1.15 : 0.45); return; }
  c.findT = 3; if (colCarryN(c)) { c.dep = true; return; }
  c.st = colIdleWhy(jobs[0]); colIdle(c, dt);
}
function colIdleWhy(j) { const J = COL_JOBS[j];
  if (J.z) return colZoneList(J.z).length ? 'No queda trabajo en su zona' : `Sin zona de ${COL_ZONES[J.z].n.toLowerCase()}: píntala con la Vara`;
  if (j === 'haul') return colS().routes.length ? 'Nada que llevar por sus rutas' : 'Sin rutas: márcalas con la Vara (modo Ruta)';
  if (j === 'cook') return colStations('cook').length ? (colFoodStock() > 120 ? 'La despensa está llena' : 'Sin ingredientes crudos o sin combustible') : 'Necesita un horno o una hoguera';
  if (j === 'smith') return colStations('smith').length ? 'Sin menas o sin combustible en los cofres' : 'Necesita un horno';
  if (j === 'build') return Object.keys(colS().plans).length ? 'Faltan bloques en los cofres para los planos' : 'Sin planos: dibújalos con la Vara (modo Plano)';
  return 'Sin trabajo'; }
function colSpd(c, j) { return colTrait(c, 'spd') * (1 + (c.sk[COL_JOBS[j] && COL_JOBS[j].sk] || 0) * 0.08) * (c.gear ? 1.3 : 1) * (c.hun <= 0 ? 0.5 : 1) * (c.slp < 15 ? 0.7 : 1); }
function colGain(c, j) { const k = COL_JOBS[j] && COL_JOBS[j].sk; if (k) c.sk[k] = Math.min(10, Math.round(((c.sk[k] || 0) + 0.05 * colTrait(c, 'xp')) * 100) / 100); }
// Tareas de varios pasos: ir a por algo, llevarlo y hacer el trabajo
function colMulti(c, w, dt) {
  const goTo = (x, y) => { colGo(c, x, y, 1.05); return colMove(c, dt); }, work = (need, st) => { c.st = st; c.work = (c.work || 0) + dt; c.wt = (c.wt || 0) + dt * colSpd(c, w.j); return c.wt >= need; };
  if (w.t === 'haul') { const R = colS().routes[w.ri], a = R && at(R.a[0], R.a[1]), b = R && at(R.b[0], R.b[1]); if (!a || !b) return 'done';
    if (w.ph === 0) { const r = goTo(a.x, a.y); if (r === 'stuck') return 'stuck'; if (r !== true) { c.st = 'Va a recoger (' + (ITEMS[w.id] ? ITEMS[w.id].n : w.id) + ')'; return; }
      let n = 0; const cap = 16 * colTrait(c, 'carry'); while (n < cap && extractPeek(a, w.id) === w.id) { extractTake(a, w.id); n++; } if (!n) return 'done'; dictAdd(c.carry, w.id, n); w.ph = 1; if (typeof dirty !== 'undefined') dirty.lists = true; return; }
    const r = goTo(b.x, b.y); if (r === 'stuck') { c.dep = true; return 'stuck'; } if (r !== true) { c.st = 'Lleva ' + (ITEMS[w.id] ? ITEMS[w.id].n.toLowerCase() : w.id); return; }
    while ((c.carry[w.id] || 0) > 0 && accept(b, w.id, b.dir || 0, false)) dictAdd(c.carry, w.id, -1);
    if (colCarryN(c)) c.dep = true; colGain(c, 'haul'); if (typeof dirty !== 'undefined') dirty.lists = true; return 'done'; }
  if (w.t === 'craft' || w.t === 'forge') { const st = at(w.x, w.y); if (!st) return 'done';
    if (w.ph === 0) { const ch = at(w.ch[0], w.ch[1]); if (!ch || !ch.slots) return 'done'; const r = goTo(ch.x, ch.y); if (r === 'stuck') return 'stuck'; if (r !== true) { c.st = w.t === 'forge' ? 'Va a por hierro' : 'Va a por ingredientes'; return; }
      if (w.t === 'forge') { if (slotsTake(ch.slots, 'ironIngot', 2) < 2) return 'done'; w.k = 1; }
      else { let k = 4; for (const id in w.rec.in) k = Math.min(k, Math.floor(slotsCount(ch.slots, id) / w.rec.in[id])); if (k < 1) return 'done'; for (const id in w.rec.in) slotsTake(ch.slots, id, w.rec.in[id] * k); w.k = k; }
      if (w.fuel) { let need = w.k - (c.fuel || 0); while (need > 0) { const f = colFuelIn(ch); if (!f) break; slotsTake(ch.slots, f, 1); c.fuel = (c.fuel || 0) + COL_FUEL[f]; need = w.k - c.fuel; } }
      w.ph = w.fuel && (c.fuel || 0) < w.k ? 0.5 : 1; if (typeof dirty !== 'undefined') dirty.lists = true; return; }
    if (w.ph === 0.5) { const fc = colNearChest(c.x / T, c.y / T, colFuelIn); if (!fc) { w.ph = 1; return; } const r = goTo(fc.x, fc.y); if (r === 'stuck') { w.ph = 1; return; } if (r !== true) { c.st = 'Va a por combustible'; return; }
      while ((c.fuel || 0) < w.k) { const f = colFuelIn(fc); if (!f) break; slotsTake(fc.slots, f, 1); c.fuel = (c.fuel || 0) + COL_FUEL[f]; } w.ph = 1; return; }
    const r = goTo(st.x, st.y); if (r === 'stuck') return 'stuck'; if (r !== true) { c.st = w.t === 'forge' ? 'Va a la forja' : w.j === 'cook' ? 'Va a cocinar' : 'Va al horno'; return; }
    const units = w.fuel ? Math.min(w.k, Math.floor(c.fuel || 0)) : w.k;
    if (!work((w.t === 'forge' ? 12 : (w.rec.t || 2) * 1.6) * Math.max(1, units), w.t === 'forge' ? 'Forjando herramientas' : w.j === 'cook' ? 'Cocinando' : 'Fundiendo')) return;
    if (w.t === 'forge') { const o = colS().list.find(x => x.id === w.who) || colS().list.find(x => !x.gear); if (o) { o.gear = 1; toast(`⚒ ${c.name} forjó herramientas de hierro para ${o.id === c.id ? 'sí' : o.name}: trabajará un 30 % más rápido`); } if (w.fuel) c.fuel = Math.max(0, (c.fuel || 0) - 1); }
    else { for (const id in w.rec.out) dictAdd(c.carry, id, w.rec.out[id] * units); if (units < w.k) for (const id in w.rec.in) dictAdd(c.carry, id, w.rec.in[id] * (w.k - units)); if (w.fuel) c.fuel -= units; }
    if (typeof burst === 'function') burst(st.x, st.y, w.j === 'cook' ? '#e0a060' : '#ffc860'); colGain(c, w.j); c.dep = true; return 'done'; }
  if (w.t === 'build') { const P = colS().plans, p = P[w.key]; if (!p) return 'done'; if (at(w.x, w.y)) { if (at(w.x, w.y).type === p.t) delete P[w.key]; return 'done'; }
    if (w.ph === 0) { const ch = at(w.ch[0], w.ch[1]); if (!ch || !ch.slots) return 'done'; const r = goTo(ch.x, ch.y); if (r === 'stuck') return 'stuck'; if (r !== true) { c.st = 'Va a por ' + (BD[w.type] ? BD[w.type].n.toLowerCase() : 'material'); return; }
      const left = Object.keys(P).filter(k => P[k].t === w.type).length; const n = slotsTake(ch.slots, w.type, Math.min(8, Math.max(1, left))); if (!n) return 'done'; dictAdd(c.carry, w.type, n); w.ph = 1; return; }
    if ((c.carry[w.type] || 0) <= 0) return 'done';
    const r = goTo(w.x, w.y); if (r === 'stuck') return 'stuck'; if (r !== true) { c.st = 'Va a construir'; return; }
    if (Math.floor(c.x / T) === w.x && Math.floor(c.y / T) === w.y) { colGo(c, w.x + 1, w.y, 0.4); return; }
    if (!work(3, 'Construyendo ' + (BD[w.type] ? BD[w.type].n.toLowerCase() : ''))) return;
    if (colCantBuild(w.type, w.x, w.y)) return 'done'; dictAdd(c.carry, w.type, -1); addBlock(makeB(w.type, w.x, w.y, w.d || 0)); delete P[w.key];
    if (typeof burst === 'function') burst(w.x, w.y, '#c8a060'); colGain(c, 'build'); return 'done'; }
  return 'done';
}
function colIdle(c, dt) { if (c.gx === undefined || colMove(c, dt) === true) { if ((c.idleT = (c.idleT || 0) - dt) <= 0) { c.idleT = 4 + Math.random() * 6; const [hx, hy] = colHome(); colGo(c, hx + ((Math.random() - 0.5) * 10) | 0, hy + ((Math.random() - 0.5) * 6) | 0, 0.4); } } }
function colonyTick(dt) {
  const C = S && S.colony; if (!C || !C.list.length) return; colS(); _colBusy.clear(); for (const c of C.list) { if (c.w) _colBusy.add(c.w.key || c.w.x + ',' + c.w.y); for (const k in COL_SK) if (c.sk[k] == null) c.sk[k] = Math.round(Math.random() * 20) / 10; }
  for (let i = C.list.length - 1; i >= 0; i--) { const c = C.list[i];
    if (Math.abs(c.x - S.player.x) > 110 * T || Math.abs(c.y - S.player.y) > 110 * T) continue; // lejos: el pueblo «descansa»
    if (!c.x && !c.y) { const [hx, hy] = colHome(); c.x = (hx + 0.5) * T; c.y = (hy + 0.5) * T; }
    if (colTick(c, dt) === 'leave') { C.list.splice(i, 1); toast(`😢 ${c.name} se ha ido de tu pueblo: llevaba un día entero sin comer`, true); } }
}
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); try { if (S && S.colony) colonyTick(Math.min(fdt, 0.1)); } catch (e) { console.warn('colonos', e); } }; }
// ---------- Dibujo ----------
const _colGhost = new Map();
{ const d0 = drawCombat; drawCombat = (ctx, ...a) => { const r = d0(ctx, ...a); if (!S) return r; const C = S.colony, vx0 = view.x - cw / 2 / view.z - 40, vx1 = view.x + cw / 2 / view.z + 40, vy0 = view.y - ch / 2 / view.z - 60, vy1 = view.y + ch / 2 / view.z + 60;
  // zonas (solo con la Vara en la mano)
  if (C && heldId() === 'foremanRod') { ctx.save(); ctx.font = '10px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const k in C.zones) { const [x, y] = k.split(',').map(Number); if (x * T < vx0 || x * T > vx1 || y * T < vy0 || y * T > vy1) continue; const Z = COL_ZONES[C.zones[k]]; if (!Z) continue;
      ctx.fillStyle = Z.c + '.22)'; ctx.fillRect(x * T + 1, y * T + 1, T - 2, T - 2); ctx.strokeStyle = Z.c + '.6)'; ctx.lineWidth = 1; ctx.strokeRect(x * T + 1.5, y * T + 1.5, T - 3, T - 3); if (view.z > 0.8) ctx.fillText(Z.i, x * T + T / 2, y * T + T / 2); }
    ctx.restore(); }
  // planos (siempre, tenues; más visibles con la Vara) y rutas (con la Vara)
  if (C && C.plans) { const rod = heldId() === 'foremanRod'; ctx.save(); ctx.globalAlpha = rod ? 0.55 : 0.32;
    for (const k in C.plans) { const [x, y] = k.split(',').map(Number); if (x * T < vx0 || x * T > vx1 || y * T < vy0 || y * T > vy1 || at(x, y)) continue; const p = C.plans[k]; if (!BD[p.t]) continue;
      let gb = _colGhost.get(p.t + ':' + (p.d || 0)); if (!gb) { gb = makeB(p.t, 0, 0, p.d || 0); _colGhost.set(p.t + ':' + (p.d || 0), gb); }
      try { ctx.drawImage(blockSprite(gb), x * T - 4, y * T - 4, 40, 40); } catch (e) { } ctx.strokeStyle = '#7ac8ff'; ctx.setLineDash([3, 3]); ctx.strokeRect(x * T + 1.5, y * T + 1.5, T - 3, T - 3); ctx.setLineDash([]); }
    ctx.restore();
    if (rod && C.routes.length) { ctx.save(); ctx.strokeStyle = '#ffd34a'; ctx.fillStyle = '#ffd34a'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -performance.now() / 60;
      for (const R of C.routes) { const ax = (R.a[0] + 0.5) * T, ay = (R.a[1] + 0.5) * T, bx = (R.b[0] + 0.5) * T, by = (R.b[1] + 0.5) * T; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        const an = Math.atan2(by - ay, bx - ax); ctx.save(); ctx.setLineDash([]); ctx.translate(bx - Math.cos(an) * 12, by - Math.sin(an) * 12); ctx.rotate(an); ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.fill(); ctx.restore(); }
      if (C.routeA) { ctx.setLineDash([]); ctx.strokeRect(C.routeA[0] * T, C.routeA[1] * T, T, T); } ctx.restore(); } }
  if (!C || !C.list.length) return r;
  const vis = C.list.filter(c => c.x > vx0 && c.x < vx1 && c.y > vy0 && c.y < vy1).sort((p, q) => p.y - q.y);
  for (const c of vis) { const J = COL_JOBS[(c.w && c.w.j) || colJobs(c)[0] || 'none'] || COL_JOBS.none, tool = c.sleeping ? null : (J.tool || []).find(id => ITEMS[id]) || null, ang = c.moving ? Math.atan2(c.gy - c.y, c.gx - c.x) : c.face > 0 ? 0 : Math.PI;
    const look = { ...c.look, shirt: J.c };
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(c.x, c.y + 8, 9, 3.5, 0, 0, 7); ctx.fill();
    if (c.sleeping) { ctx.save(); ctx.translate(c.x, c.y + 4); ctx.rotate(-Math.PI / 2); drawAvatar(ctx, look, c.equip, 0, 0, 0, 0, false, c.kid ? 1.15 : 1.6, null, 0); ctx.restore(); }
    else drawAvatar(ctx, look, c.equip, c.x, c.y + 8, ang, c.ph || 0, !!c.moving, c.kid ? 1.15 : 1.6, c.kid ? null : tool, c.work ? (Math.sin(c.work * 7) + 1) / 2 : 0);
    const near = Math.hypot(S.player.x - c.x, S.player.y - c.y) < 5 * T;
    if (near || view.z > 1.2) { ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; const yl = c.y - 34, lab = `${J.i} ${c.name}`; ctx.fillStyle = '#000'; ctx.fillText(lab, c.x + 1, yl + 1); ctx.fillStyle = '#bfe8a8'; ctx.fillText(lab, c.x, yl); }
    const ic = c.sleeping ? '💤' : c.hun < 20 ? '🍖' : c.slp < 15 ? '🥱' : ''; if (ic) { ctx.font = '12px system-ui'; ctx.textAlign = 'center'; ctx.fillText(ic, c.x + 12, c.y - 26 - Math.sin(performance.now() / 300) * 2); } }
  return r; }; }
// ---------- F sobre un aldeano o un colono ----------
{ const a0 = npcAt; npcAt = (wx, wy) => { const r = a0(wx, wy); if (r) return r; for (const c of (S && S.colony && S.colony.list) || []) if (Math.hypot(c.x - wx, c.y - wy) < 14) return c; return null; }; }
{ const o0 = openTrade; openTrade = n => { if (n && n.traits && n.sk) { colOpen(n.id); return; } if (colWilling(n) && !(S.colony && S.colony.gone[colFolkKey(n)])) { colRecruitOpen(n, () => o0(n)); return; } o0(n); }; }
// ---------- Ventanas ----------
{ const m = document.createElement('div'); m.id = 'mColony'; m.className = 'modal'; m.hidden = true; m.innerHTML = '<div class="modal-in colm" id="colBody"></div>'; document.body.appendChild(m); MODALS.colony = 'mColony';
  m.addEventListener('mousedown', e => { if (e.target === m || e.target.closest('[data-close]')) closeModal(); }); }
let _colRecN = null, _colRecTrade = null, _colSel = null;
const colBar = (v, c) => `<i class="colbar"><b style="width:${Math.round(v)}%;background:${c}"></b></i>`;
function colCardHTML(c, full) {
  const J = COL_JOBS[(c.w && c.w.j) || colJobs(c)[0] || 'none'] || COL_JOBS.none;
  return `<div class="colc${_colSel === c.id ? ' sel' : ''}" data-colid="${c.id}"><header><b>${esc(c.name)}</b><small>${c.age} años${c.from ? ' · de ' + esc(c.from) : ''}</small></header>
    <div class="coltr">${c.traits.map(t => `<span title="${esc(COL_TRAITS[t].d)}">${esc(COL_TRAITS[t].n)}</span>`).join('')}</div>
    <div class="colsk">${Object.keys(COL_SK).map(k => `<div><small>${COL_SK[k]}</small>${colBar(c.sk[k] * 10, '#e0b54c')}<em>${c.sk[k].toFixed(1)}</em></div>`).join('')}</div>
    ${full ? `<div class="colnd"><div><small>🍖 Hambre</small>${colBar(c.hun, c.hun < 25 ? '#e05050' : '#e0a040')}</div><div><small>💤 Sueño</small>${colBar(c.slp, c.slp < 20 ? '#e05050' : '#a47ae8')}</div></div>
    <div class="colst">${J.i} ${esc(c.st || '')}${colCarryN(c) ? ` · lleva ${colCarryN(c)} objetos` : ''}${c.bed ? '' : ' · <b class="bad">sin cama</b>'}${c.gear ? ' · 🔧 herramientas de hierro' : ''}</div>
    ${colHasBoard() ? `<div class="colpri">${COL_WORKJOBS.map(j => { const v = (c.pri || {})[j] || 0; return `<button data-colpri="${c.id}:${j}" class="p${v}" title="${COL_JOBS[j].n}: ${v ? 'prioridad ' + v : 'no lo hace'} (clic para cambiar)">${COL_JOBS[j].i}<b>${v || '·'}</b></button>`; }).join('')}</div>` : ''}
    <div class="colac">${colHasBoard() ? '' : `<select data-coljob="${c.id}">${Object.keys(COL_JOBS).map(k => `<option value="${k}"${k === c.job ? ' selected' : ''}>${COL_JOBS[k].i} ${COL_JOBS[k].n}</option>`).join('')}</select>`}<button data-colfire="${c.id}" class="ghost">Despedir</button></div>` : ''}</div>`;
}
function colRender() {
  const C = colS(), beds = colBeds().length, used = C.list.filter(c => c.bed).length, food = colChests().reduce((a, b) => a + colFoods().reduce((s, id) => s + slotsCount(b.slots, id), 0), 0);
  const zc = { f: 0, w: 0, m: 0 }; for (const k in C.zones) zc[C.zones[k]] = (zc[C.zones[k]] || 0) + 1;
  $('colBody').innerHTML = `<header><h2>🏘 Mi pueblo</h2><span class="chip">${C.list.length} colono${C.list.length === 1 ? '' : 's'} · 🛏 ${beds - used} cama${beds - used === 1 ? '' : 's'} libre${beds - used === 1 ? '' : 's'} · 🍖 ${food} de comida en cofres</span><button data-close>Cerrar <kbd>Esc</kbd></button></header>
    ${C.list.length ? `<div class="colgrid">${C.list.map(c => colCardHTML(c, true)).join('')}</div>` : `<p class="mut">Aún no tienes colonos. En los pueblos del mundo, los aldeanos con <b>✦</b> en el nombre están dispuestos a mudarse: acércate y pulsa <kbd>F</kbd>. Antes, pon una <b>cama</b> libre en tu base.</p>`}
    <div class="colhelp"><b>Cómo funciona</b><ul>
      <li>🛏 Cada colono necesita una <b>cama</b>. De noche duerme en ella.</li>
      <li>🍖 Comen de tus <b>cofres</b>: cualquier cofre con comida cerca es la despensa.</li>
      <li>🪄 Con la <b>Vara de capataz</b> en la mano pintas sus zonas: 🌾 cultivo ${zc.f} · 🪓 tala ${zc.w} · ⛏ mina ${zc.m} casillas.</li>
      <li>📦 Lo que sacan lo guardan en el cofre más cercano. Los granjeros cogen las semillas de los cofres.</li>
      <li>🔁 <b>Transportista</b>: con la Vara en modo <b>Ruta</b>, clic en un bloque de origen (cofre, máquina…) y luego en el destino. Lleva lo que quepa. Rutas: ${C.routes.length}${C.routes.length ? ' <button data-colnoroutes class="ghost">Quitar todas</button>' : ''}</li>
      <li>🍳 <b>Cocinero</b> y ⚒ <b>Herrero</b>: usan un <b>horno</b> (el cocinero también una hoguera) con lo que haya en los cofres y combustible (carbón, troncos, tablones). El herrero también forja herramientas de hierro para el pueblo (2 lingotes de hierro): +30 % de velocidad.</li>
      <li>📐 <b>Constructor</b>: con la Vara en modo <b>Plano</b> eliges un bloque y lo dibujas; él lo coge de un cofre y lo construye. Planos: ${Object.keys(C.plans).length}</li>
      <li>📋 Pon un <b>Tablón de trabajos</b> para darle a cada colono varios oficios con prioridad (1 primero, · no lo hace).</li></ul>
      ${ITEMS.foremanRod && !invCount('foremanRod') ? `<button data-colrod>🪄 Fabricar Vara de capataz (palo + tablones)</button>` : ''}</div>`;
}
function colOpen(id) { _colSel = id || null; openModal('colony'); colRender(); }
function colRecruitOpen(n, trade) {
  _colRecN = n; _colRecTrade = trade; const c = colFromFolk(n); colS().n--; const cost = colRecruitCost(n), bed = colFreeBed();
  $('colBody').innerHTML = `<header><h2>✦ ${esc(c.name)}</h2><span class="chip">Quiere mudarse</span><button data-close>Cerrar <kbd>Esc</kbd></button></header>
    <p class="towng">«${esc(['Siempre quise ver mundo. Si tienes sitio para mí, me voy contigo.', 'Aquí ya no hay trabajo para mí. ¿Tu pueblo necesita manos?', 'Dicen que tu taller nunca para. Me gustaría ayudar.', 'Busco un sitio nuevo donde empezar. ¿Me aceptas?'][(colHash(colFolkKey(n), 5) * 4) | 0])}»</p>
    ${colCardHTML(c, false)}
    <p class="small">${cost ? `Pide <b>${cost} de comida</b> para el viaje.` : 'No pide nada: ¡viene encantado!'} ${bed ? '🛏 Tienes una cama libre.' : '<b class="bad">Necesitas una cama libre en tu base.</b>'}</p>
    <div class="colac"><button data-colhire ${bed ? '' : 'disabled'}>🏘 Invitar a mi pueblo</button><button data-coltrade class="ghost">Comerciar</button></div>`;
  openModal('colony');
}
document.addEventListener('click', e => {
  if (!S) return; const t = e.target;
  if (t.closest('[data-colhire]')) { if (_colRecN && colRecruit(_colRecN)) colOpen(colS().list[colS().list.length - 1].id); return; }
  if (t.closest('[data-coltrade]')) { closeModal(); if (_colRecTrade) _colRecTrade(); return; }
  const pb = t.closest('[data-colpri]'); if (pb) { const [id, j] = pb.dataset.colpri.split(':'), c = colS().list.find(x => x.id === +id); if (c) { if (!c.pri) { c.pri = {}; if (c.job && c.job !== 'none') c.pri[c.job] = 1; } c.pri[j] = ((c.pri[j] || 0) + 1) % 5; c.w = null; c.findT = 0; colRender(); } return; }
  if (t.closest('[data-colnoroutes]')) { colS().routes = []; colS().routeA = null; toast('Rutas quitadas'); colRender(); return; }
  const f = t.closest('[data-colfire]'); if (f) { const C = colS(), i = C.list.findIndex(c => c.id === +f.dataset.colfire); if (i >= 0 && confirm(`¿Despedir a ${C.list[i].name}? Volverá a su pueblo.`)) { toast(`${C.list[i].name} se despide y vuelve a su pueblo`); C.list.splice(i, 1); colRender(); } return; }
  if (t.closest('[data-colrod]')) { if (invCount('stick') >= 2 && invCount('planks') >= 1) { invTake('stick', 2); invTake('planks', 1); invGive('foremanRod', 1, S.player.x, S.player.y); colS().gotRod = 1; colRender(); } else toastErr('Necesitas 2 palos y 1 tablón'); return; }
});
document.addEventListener('change', e => { const s = e.target.closest && e.target.closest('[data-coljob]'); if (!s || !S) return; const c = colS().list.find(c => c.id === +s.dataset.coljob); if (c) { c.job = s.value; c.w = null; c.findT = 0; c.st = 'Nuevo oficio: ' + COL_JOBS[c.job].n; } });
setInterval(() => { if (ui.open !== 'colony' || !S || $('colBody').querySelector('[data-colhire]')) return; if (document.activeElement && document.activeElement.matches('[data-coljob]')) return; colRender(); }, 1000);
addEventListener('keydown', e => { if (!S || e.ctrlKey || e.metaKey || e.altKey) return; const tg = e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return; if (e.key !== ',') return;
  if (ui.open === 'colony') { closeModal(); e.preventDefault(); e.stopImmediatePropagation(); } else if (!ui.open) { _colRecN = null; colOpen(); e.preventDefault(); e.stopImmediatePropagation(); } }, true);
if (typeof cmd === 'function') cmd('mipueblo', { a: ['colonia', 'colonos'], u: '/mipueblo', d: 'Abre la ventana de tu pueblo de colonos (también con la tecla , o el botón 🏘).', run() { _colRecN = null; colOpen(); return ''; } });
// ---------- Vara de capataz: barra de modos y pintar ----------
const colRodBar = document.createElement('div'); colRodBar.id = 'colRod'; colRodBar.hidden = true; document.body.appendChild(colRodBar);
const COL_RODM = { f: '🌾 Cultivo', w: '🪓 Tala', m: '⛏ Mina', r: '🔁 Ruta', p: '📐 Plano', x: '✖ Borrar' };
function colPlanTypes() { const set = new Set(); for (const sl of S.inv) if (sl && isPlaceable(sl.id)) set.add(sl.id); for (const b of colChests()) for (const sl of b.slots) if (sl && isPlaceable(sl.id)) set.add(sl.id); return [...set].filter(id => BD[id] && !BD[id].tree); }
function colRodRender() { const C = colS(), m = C.mode, types = colPlanTypes(); if (m === 'p' && (!C.planT || !BD[C.planT])) C.planT = types[0] || null;
  const tip = m === 'r' ? (C.routeA ? 'Ahora clic en el destino' : 'Clic en el bloque de origen · clic derecho en un bloque: quitar sus rutas') : m === 'p' ? 'Clic/arrastrar: dibujar · R: girar · clic derecho: borrar plano' : 'Clic: pintar · clic derecho: borrar';
  colRodBar.innerHTML = `<b>🪄 Vara de capataz</b>${Object.keys(COL_RODM).map(k => `<button data-colmode="${k}" class="${m === k ? 'on' : ''}">${COL_RODM[k]}</button>`).join('')}
    ${m === 'p' ? (types.length ? `<select data-colplant>${types.map(id => `<option value="${id}"${id === C.planT ? ' selected' : ''}>${esc(BD[id].n)}</option>`).join('')}</select>` : '<small class="bad">Lleva o guarda en un cofre los bloques que quieras construir</small>') : ''}<small>${tip} · tecla , : tu pueblo</small>`; }
colRodBar.addEventListener('change', e => { const sel = e.target.closest('[data-colplant]'); if (sel) colS().planT = sel.value; });
colRodBar.addEventListener('mousedown', e => { if (e.target.closest('select')) { e.stopPropagation(); return; } const b = e.target.closest('[data-colmode]'); if (!b) return; e.stopPropagation(); colS().mode = b.dataset.colmode; colS().routeA = null; colRodRender(); });
let _colRodOn = false, _colPaint = null;
setInterval(() => { const on = !!(S && !ui.open && heldId() === 'foremanRod'); if (on !== _colRodOn) { _colRodOn = on; colRodBar.hidden = !on; if (on) colRodRender(); } }, 150);
{ const cvs = document.getElementById('c');
  const paintAt = () => { if (!_colPaint) return; const C = colS(), k = mouse.tx + ',' + mouse.ty;
    if (_colPaint === 'p') { if (C.planT && BD[C.planT] && !at(mouse.tx, mouse.ty)) C.plans[k] = { t: C.planT, d: ui.dir || 0 }; return; }
    if (_colPaint === 'xp') { delete C.plans[k]; return; }
    if (_colPaint === 'x') { delete C.plans[k]; }
    colPaint(mouse.tx, mouse.ty, _colPaint); };
  const routeClick = right => { const C = colS(), b = at(mouse.tx, mouse.ty), here = [mouse.tx, mouse.ty], same = (p, q) => p && q && p[0] === q[0] && p[1] === q[1];
    if (right) { if (!b) return; const n0 = C.routes.length; C.routes = C.routes.filter(R => !same(R.a, here) && !same(R.b, here)); C.routeA = null; toast(n0 - C.routes.length ? `Quitadas ${n0 - C.routes.length} rutas de ${BD[b.type].n}` : 'Ese bloque no tiene rutas'); colRodRender(); return; }
    if (!b) { toastErr('Haz clic sobre un bloque (cofre, máquina, depósito…)'); return; }
    if (!C.routeA) { if (!(b.slots || b.out || b.item !== undefined || BD[b.type].inv)) { toastErr(BD[b.type].n + ' no guarda objetos'); return; } C.routeA = here; toast(`🔁 Origen: ${BD[b.type].n}. Ahora clic en el destino.`); colRodRender(); return; }
    if (same(C.routeA, here)) { C.routeA = null; colRodRender(); return; }
    const a = at(C.routeA[0], C.routeA[1]); C.routes.push({ a: C.routeA, b: here }); C.routeA = null; toast(`🔁 Ruta: ${a ? BD[a.type].n : '?'} → ${BD[b.type].n}. Un transportista la recorrerá.`); colRodRender(); };
  cvs.addEventListener('mousedown', e => { if (!S || ui.open || heldId() !== 'foremanRod' || (e.button !== 0 && e.button !== 2)) return; e.stopImmediatePropagation(); e.preventDefault();
    mouse.x = e.clientX; mouse.y = e.clientY; updateHover(); const m = colS().mode;
    if (m === 'r') { routeClick(e.button === 2); return; }
    _colPaint = m === 'p' ? (e.button === 2 ? 'xp' : 'p') : e.button === 2 ? 'x' : m; paintAt(); }, true);
  cvs.addEventListener('contextmenu', e => { if (S && heldId() === 'foremanRod') e.preventDefault(); }, true);
  cvs.addEventListener('mousemove', e => { if (!_colPaint) return; mouse.x = e.clientX; mouse.y = e.clientY; updateHover(); paintAt(); }, true);
  addEventListener('mouseup', () => { _colPaint = null; }); }
// Botón 🏘 (aparece en cuanto tienes un colono)
const colBtn = document.createElement('button'); colBtn.id = 'colBtn'; colBtn.title = 'Mi pueblo (tecla ,)'; colBtn.textContent = '🏘'; colBtn.hidden = true; document.body.appendChild(colBtn);
colBtn.addEventListener('click', () => { if (!S) return; if (ui.open === 'colony') closeModal(); else if (!ui.open) { _colRecN = null; colOpen(); } });
setInterval(() => { const on = !!(S && S.colony && S.colony.list.length && (!ui.open || ui.open === 'colony')); if (colBtn.hidden === on) colBtn.hidden = !on; }, 500);
// F sobre el Tablón de trabajos: la ventana del pueblo (con las prioridades)
{ const i0 = interact; interact = (shift, ctrl) => { const b = S && at(mouse.tx, mouse.ty); if (b && b.type === 'jobBoard') { _colRecN = null; colOpen(); return; } return i0(shift, ctrl); }; }
