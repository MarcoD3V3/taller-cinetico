'use strict';
// =====================================================================================
//  Mazmorras generadas.
//  · Por el mundo hay entradas (unas pocas por región, siempre en el mismo sitio). F al lado: bajas.
//  · Cada vez que entras se genera una mazmorra nueva: 5×5 celdas unidas como un laberinto, con
//    salas de enemigos (se cierran hasta que los vences), salas trampa (pinchos y ballestas),
//    cofres (alguno es un mimo…), un puzle de palancas y, al fondo, el jefe.
//  · El puzle: la tablilla de la entrada dice el orden de los símbolos. Cada palanca tiene uno.
//    Si te equivocas se reinician todas y te llevas una descarga. Bien hecho: se abre la sala del jefe.
//  · Vencido el jefe, un portal te devuelve a la entrada y esa mazmorra queda sellada hasta mañana.
//    Si mueres dentro, pierdes la mazmorra (no lo que lleves).
//  · La mazmorra está muy lejos (como la arena de la Gran Oleada) y se borra al salir: no ocupa
//    nada en la partida guardada.
// =====================================================================================
const DG_Y = -500000, DG_X0 = 400000, DG_CELL = 15, DG_GN = 5, DG_W = DG_CELL * DG_GN, DG_REG = 90;
const DG_SYMS = [['☀', '#ffd34a'], ['☾', '#9ad8ff'], ['★', '#ff9ae0'], ['♦', '#7fd07a']];
const DGX = { run: null, ents: new Map(), extra: [], entT: 0, hud: '' };
const dgZone = (tx, ty) => ty >= DG_Y - 64 && ty <= DG_Y + DG_W + 64 && tx >= DG_X0 - 64;
const inDungeon = () => !!(S && S.player && dgZone(Math.floor(S.player.x / T), Math.floor(S.player.y / T)));
const dgRng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const dgDay = () => Math.floor(S.time / (S.gen.dayLen || DAY_LEN));

// ---------- Generar el plano ----------
function dgBuild(seed, lvl, theme) {
  const R = dgRng(seed), ri = n => (R() * n) | 0, N = DG_GN, W = DG_W;
  const map = new Uint8Array(W * W), rm = new Int8Array(W * W).fill(-1);
  // Laberinto entre celdas (árbol al azar) y un par de atajos
  const start = [2, N - 1], seen = new Set([start.join()]), edges = [], stack = [start];
  while (stack.length) { const [cx, cy] = stack[stack.length - 1], nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cx + dx, cy + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < N && y < N && !seen.has(x + ',' + y));
    if (!nb.length) { stack.pop(); continue; } const n = nb[ri(nb.length)]; seen.add(n.join()); edges.push([[cx, cy], n]); stack.push(n); }
  for (let i = 0; i < 2; i++) { const x = ri(N - 1), y = ri(N); if (!edges.some(([a, b]) => (a[0] === x && a[1] === y && b[0] === x + 1 && b[1] === y) || (b[0] === x && b[1] === y && a[0] === x + 1 && a[1] === y))) edges.push([[x, y], [x + 1, y]]); }
  // La sala del jefe: la más lejana de la entrada
  const dist = { [start.join()]: 0 }, q = [start]; while (q.length) { const c = q.shift(); for (const [a, b] of edges) { const o = a.join() === c.join() ? b : b.join() === c.join() ? a : null; if (o && dist[o.join()] === undefined) { dist[o.join()] = dist[c.join()] + 1; q.push(o); } } }
  let boss = start; for (const k in dist) if (dist[k] > dist[boss.join()]) boss = k.split(',').map(Number);
  // Salas
  const rooms = []; for (let cy = 0; cy < N; cy++) for (let cx = 0; cx < N; cx++) {
    const isB = cx === boss[0] && cy === boss[1], isS = cx === start[0] && cy === start[1];
    const w = isB ? 13 : isS ? 9 : 7 + ri(3) * 2, h = isB ? 13 : isS ? 9 : 7 + ri(3) * 2, mx = cx * DG_CELL + 7, my = cy * DG_CELL + 7;
    const r = { i: rooms.length, cx, cy, mx, my, x0: mx - (w >> 1), y0: my - (h >> 1), x1: mx + (w >> 1), y1: my + (h >> 1), type: isB ? 'boss' : isS ? 'start' : 'mob', st: isS ? 'clear' : 'idle', gates: [], seen: isS, d: dist[cx + ',' + cy] || 0 };
    rooms.push(r); for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { map[y * W + x] = 1; rm[y * W + x] = r.i; }
  }
  const roomAt = (cx, cy) => rooms[cy * N + cx];
  for (const [a, b] of edges) { const A = roomAt(...a), B = roomAt(...b);
    if (A.cy === B.cy) for (let x = Math.min(A.mx, B.mx); x <= Math.max(A.mx, B.mx); x++) for (let d = -1; d <= 1; d++) { const i = (A.my + d) * W + x; if (!map[i]) map[i] = 2; }
    else for (let y = Math.min(A.my, B.my); y <= Math.max(A.my, B.my); y++) for (let d = -1; d <= 1; d++) { const i = y * W + A.mx + d; if (!map[i]) map[i] = 2; } }
  // Puertas de cada sala: el pasillo justo al lado
  for (let y = 1; y < W - 1; y++) for (let x = 1; x < W - 1; x++) { if (map[y * W + x] !== 2) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const r = rm[(y + dy) * W + x + dx]; if (r >= 0 && !rooms[r].gates.some(g => g[0] === x && g[1] === y)) rooms[r].gates.push([x, y]); } }
  // Tipos: palancas, cofres y trampas repartidas entre las salas normales
  const mids = rooms.filter(r => r.type === 'mob').sort(() => R() - 0.5), nLev = lvl >= 3 ? 4 : 3;
  const levRooms = mids.splice(0, nLev), chestRooms = mids.splice(0, 2), trapRooms = mids.splice(0, 2 + (lvl >= 4 ? 1 : 0));
  const syms = DG_SYMS.slice(0, nLev).map((s, i) => i).sort(() => R() - 0.5), seq = syms.slice(0, 3); // con 4 palancas, una es de engaño
  const levers = levRooms.map((r, i) => { r.type = 'lever'; return { x: r.x0 + 1 + ri(r.x1 - r.x0 - 1), y: r.y0 + 1, sym: syms[i], on: false, room: r.i }; });
  const chests = [];
  for (const r of chestRooms) { r.type = 'chest'; chests.push({ x: r.mx, y: r.my, open: false, mimic: R() < 0.18, room: r.i }); }
  const turrets = [];
  for (const r of trapRooms) { r.type = 'trap'; const pat = ri(3);
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { const k = pat === 0 ? (x + y) % 3 === 0 : pat === 1 ? y % 2 === 0 && x !== r.mx : x % 2 === 0 && y !== r.my; if (k && !(x === r.mx && y === r.my)) map[y * W + x] = 3; }
    for (let j = 0; j < 1 + (lvl >> 1); j++) { const side = ri(4), t = side < 2 ? { x: side ? r.x1 + 1 : r.x0 - 1, y: r.y0 + 1 + ri(r.y1 - r.y0 - 1) } : { x: r.x0 + 1 + ri(r.x1 - r.x0 - 1), y: side === 2 ? r.y0 - 1 : r.y1 + 1 }; if (!map[t.y * W + t.x]) turrets.push({ ...t, room: r.i, cd: 1 + R() * 2 }); }
    if (R() < 0.6) chests.push({ x: r.mx, y: r.my, open: false, mimic: false, room: r.i, small: true }); }
  if (lvl >= 2) for (let i = 0; i < W * W; i++) if (map[i] === 2 && R() < 0.06) map[i] = 3;
  // Braseros en las esquinas de cada sala
  const torches = new Set(); for (const r of rooms) for (const [x, y] of [[r.x0, r.y0], [r.x1, r.y0], [r.x0, r.y1], [r.x1, r.y1]]) torches.add(y * W + x);
  const sR = roomAt(...start);
  return { map, rm, rooms, levers, chests, turrets, torches, seq, seqI: 0, boss: rooms.find(r => r.type === 'boss'), start: sR, tablet: { x: sR.mx - 2, y: sR.y0 + 1 }, exit: { x: sR.mx + 2, y: sR.y0 + 1 } };
}

// ---------- El terreno de la mazmorra ----------
const dgCode = (tx, ty) => { const r = DGX.run; if (!r) return 0; const x = tx - r.ox, y = ty - r.oy; return x < 0 || y < 0 || x >= DG_W || y >= DG_W ? 0 : r.map[y * DG_W + x]; };
function dgFill(c) {
  c.h = new Uint8Array(CS * CS); const r = DGX.run, th = r ? r.theme : 'crypt', Wl = G['DGW_' + th], F = G['DGF_' + th], A = G['DGA_' + th], Tc = G['DGT_' + th], bio = BI_['dg_' + th];
  for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) { const tx = c.cx * CS + x, ty = c.cy * CS + y, i = (y << CSH) | x, code = dgCode(tx, ty);
    let t = Wl; if (code) { const lx = tx - r.ox, ly = ty - r.oy, li = ly * DG_W + lx; t = r.torches.has(li) ? Tc : code === 2 ? A : ((lx + ly) & 1) && r.rm[li] >= 0 && (lx % 4 === 0 || ly % 4 === 0) ? A : F; }
    c.g[i] = t; c.bio[i] = bio; c.t[i] = 0; }
  c.mod = false;
}
const dgChunk = c => dgZone(c.cx * CS + 16, c.cy * CS + 16);
{ const l0 = chunkLv; chunkLv = c => dgChunk(c) ? (c.h = new Uint8Array(CS * CS)) : l0(c); }
{ const g0 = genChunkTiles; genChunkTiles = c => { if (dgChunk(c)) dgFill(c); else g0(c); }; }
{ const b0 = computeChunkBiomes; computeChunkBiomes = c => { if (dgChunk(c)) dgFill(c); else b0(c); }; }
// Borrar de memoria (y del archivo de la partida) todo lo de la zona de mazmorras
function dgPurge() {
  for (const [k, c] of [...WORLD]) if (dgChunk(c)) { WORLD.delete(k); if (typeof CHARCH !== 'undefined') CHARCH.delete(k); }
  if (typeof CHARCH !== 'undefined') for (const k of [...CHARCH.keys()]) { const [cx, cy] = ckeyXY(k); if (dgZone(cx * CS + 16, cy * CS + 16)) CHARCH.delete(k); }
  _lk = -1; _lc = null; for (const m of [chunks, chunksH, chunksQ]) for (const k of [...m.keys()]) { const [cx, cy] = ckeyXY(k); if (dgZone(cx * CH, cy * CH)) m.delete(k); }
}
// En la mazmorra: nada aparece solo, el clima no afecta y hay penumbra
{ const s0 = spawnTick; spawnTick = dt => { if (!inDungeon()) s0(dt); }; }
{ const e0 = envCheck; envCheck = () => { if (!inDungeon()) e0(); }; }
{ const d0 = daylight; daylight = () => inDungeon() ? 0.42 : d0(); }
// Muros, puertas cerradas y nada de construir
const dgGateShut = (tx, ty) => { const r = DGX.run; if (!r) return false; const lx = tx - r.ox, ly = ty - r.oy;
  for (const R of r.rooms) { if (R.st !== 'fight' && !(R.type === 'boss' && !r.solved)) continue; for (const g of R.gates) if (g[0] === lx && g[1] === ly) return true; } return false; };
{ const p0 = passable; passable = (x, y, who) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); if (dgZone(tx, ty)) { if (!dgCode(tx, ty) || dgGateShut(tx, ty)) return false; } return p0(x, y, who); }; }
{ const c0 = canPlace; canPlace = (type, x, y) => dgZone(x, y) ? 'En la mazmorra no se puede construir' : c0(type, x, y); }

// ---------- Entradas por el mundo ----------
function dgEntAt(rx, ry) {
  const key = rx + ',' + ry; if (DGX.ents.has(key)) return DGX.ents.get(key);
  const sd = (S.gen.seed || 1) % 100000, h = hash2(rx, ry, 777 + sd);
  if (h > 0.42 || Math.abs(ry * DG_REG) > 150000 || Math.abs(rx * DG_REG) > 150000) { DGX.ents.set(key, null); return null; }
  const bx = rx * DG_REG + 12 + Math.floor(hash2(rx, ry, 778 + sd) * (DG_REG - 24)), by = ry * DG_REG + 12 + Math.floor(hash2(rx, ry, 779 + sd) * (DG_REG - 24));
  if (!peekChunk(bx >> CSH, by >> CSH)) return undefined; // aún no está cargado: se mira luego
  const ok = (x, y) => { const c = peekChunk(x >> CSH, y >> CSH); if (!c) return false; const g = GI[c.g[((y & CMASK) << CSH) | (x & CMASK)]]; return !g.solid && !g.liquid && !g.tree && !at(x, y); };
  let p = null; for (let r = 0; r <= 6 && !p; r++) for (let dy = -r; dy <= r && !p; dy++) for (let dx = -r; dx <= r && !p; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && ok(bx + dx, by + dy) && ok(bx + dx + 1, by + dy) && ok(bx + dx, by + dy + 1)) p = [bx + dx, by + dy];
  if (!p) { DGX.ents.set(key, null); return null; }
  const thK = Object.keys(DG_THEMES), th = thK[Math.floor(hash2(rx, ry, 780 + sd) * thK.length)], TH = DG_THEMES[th];
  const lvl = Math.max(1, Math.min(5, 1 + Math.floor(Math.hypot(p[0], p[1]) / 380) + (hash2(rx, ry, 781 + sd) < 0.3 ? 1 : 0)));
  const e = { key, x: p[0], y: p[1], th, lvl, name: TH.n + ' ' + TH.names[Math.floor(hash2(rx, ry, 782 + sd) * TH.names.length)] };
  DGX.ents.set(key, e); return e;
}
function dgEntsNear(px, py, rad) {
  const out = [], tx = px / T, ty = py / T, r0x = Math.floor((tx - rad) / DG_REG), r1x = Math.floor((tx + rad) / DG_REG), r0y = Math.floor((ty - rad) / DG_REG), r1y = Math.floor((ty + rad) / DG_REG);
  for (let ry = r0y; ry <= r1y; ry++) for (let rx = r0x; rx <= r1x; rx++) { const e = dgEntAt(rx, ry); if (e && Math.abs(e.x - tx) <= rad && Math.abs(e.y - ty) <= rad) out.push(e); }
  for (const e of DGX.extra) if (Math.abs(e.x - tx) <= rad && Math.abs(e.y - ty) <= rad) out.push(e); // las abiertas con /mazmorra
  return out;
}
const dgSealed = e => S.dgClr && S.dgClr[e.key] !== undefined && S.dgClr[e.key] >= dgDay();
// Al acercarte por primera vez: «Has descubierto…»
function dgDiscover() {
  if ((DGX.entT -= 1) > 0) return; DGX.entT = 30; if (inDungeon() || inArena()) return;
  for (const e of dgEntsNear(S.player.x, S.player.y, 14)) { const seen = S.dgSeen || (S.dgSeen = {}); if (seen[e.key]) continue; seen[e.key] = 1;
    toast(`🕳 Has descubierto una mazmorra: ${e.name} (nivel ${e.lvl}). Pulsa F a su lado para bajar.`, true); tone(330, 0.3, 'sine', 0.05, 0.6); if (typeof achSetAdd === 'function') achSetAdd('dgFound', e.key); }
}
// Encargo «despeja la mazmorra de…»: la más cercana que conozcas (o una sin descubrir a cierta distancia)
function dgPickTarget() {
  const L = dgEntsNear(S.player.x, S.player.y, 260).filter(e => !dgSealed(e)).sort((a, b) => Math.hypot(a.x * T - S.player.x, a.y * T - S.player.y) - Math.hypot(b.x * T - S.player.x, b.y * T - S.player.y));
  return L[Math.floor(Math.random() * Math.min(3, L.length))] || null;
}

// ---------- Entrar y salir ----------
function dgEnter(e) {
  if (DGX.run) return; if (isGuest()) { toastErr('En multijugador solo el anfitrión puede bajar a las mazmorras'); return; }
  if (typeof WV !== 'undefined' && WV.on) { toastErr('Termina antes la Gran Oleada'); return; }
  if (dgSealed(e)) { toastErr('Esta mazmorra está sellada: vuelve mañana (o busca otra)'); return; }
  S.dgN = (S.dgN || 0) + 1; const slot = S.dgN % 3000, seed = (Math.random() * 2 ** 31) | 0, b = dgBuild(seed, e.lvl, e.th);
  DGX.run = { ...b, id: Math.random(), seed, ent: e, lvl: e.lvl, theme: e.th, ox: DG_X0 + slot * 160, oy: DG_Y, home: { x: S.player.x, y: S.player.y }, solved: false, bossSt: 'locked', bossF: null, hurt: false, t: 0, hp0: S.pc ? S.pc.hp : 0, zapT: 0, portal: null };
  S.dgHome = DGX.run.home; dgPurge();
  const r = DGX.run, s = r.start, TH = DG_THEMES[r.theme];
  wvTeleport((r.ox + s.mx + 0.5) * T, (r.oy + s.my + 1.5) * T, () => { wvBanner(`🕳 ${e.name}`, `Nivel ${e.lvl} · Lee la tablilla: dice el orden de las palancas que abren la sala del jefe`, TH.c, 4.5); tone(110, 1.2, 'sine', 0.06, 0.5); });
  if (typeof questEvent === 'function') questEvent('enter', e);
}
function dgEnd(win, why) {
  const r = DGX.run; if (!r) return; const h = r.home; DGX.run = null; S.dgHome = null;
  for (const f of FOES.slice()) if (f.dg === r.id) FOES.splice(FOES.indexOf(f), 1);
  if (BOSS && r.bossF === BOSS) bossEnd(); for (const pj of PROJ.slice()) if (pj.team === 'e') PROJ.splice(PROJ.indexOf(pj), 1); HAZ.length = 0;
  const back = () => { S.player.x = h.x; S.player.y = h.y; view.x = h.x; view.y = h.y; dgPurge(); };
  if (why === 'dead') back(); else wvTeleport(h.x, h.y, () => { back(); if (win) wvBanner('🏆 ¡Mazmorra completada!', `${r.ent.name} · ${fmtT(r.t)}${r.hurt ? '' : ' · ¡sin un rasguño!'}`, '#ffd34a', 4); else if (why === 'quit') toast('Sales de la mazmorra. La próxima vez será distinta.'); });
}
// Morir dentro: se pierde la mazmorra, vuelves a casa (y luego lo de siempre al morir)
{ const d0 = die; die = () => { if (DGX.run && inDungeon()) { const n = DGX.run.ent.name; dgEnd(false, 'dead'); setTimeout(() => toast(`💀 ${n} te ha vencido. Puedes volver a intentarlo: será otra mazmorra.`, true), 600); } return d0(); }; }

// ---------- Enemigos de cada estilo ----------
function dgPool(th, lvl) {
  const ok = (k, D) => !k.startsWith('wv') && !D.mini && (D.tier || 0) <= lvl + 1 && !/mimic|fish|shark|eel|crab|piranha/i.test(k) && D.ai !== 'swim';
  const want = { crypt: (k, D) => D.undead || /shade|necro|ghost|skel/i.test(k), cave: k => !/[A-Z]/.test(k), ice: k => /Frost$/.test(k), lava: k => /Fire$/.test(k), temple: k => /Desert$/.test(k), void: k => /Shadow$|shade/i.test(k) }[th];
  let L = Object.keys(ENEMIES).filter(k => ok(k, ENEMIES[k]) && want(k, ENEMIES[k])); if (L.length < 3) L = L.concat(Object.keys(ENEMIES).filter(k => ok(k, ENEMIES[k]) && !/[A-Z]/.test(k)));
  return L;
}
function dgSpawnRoom(R) {
  const r = DGX.run, pool = dgPool(r.theme, r.lvl), n = 3 + r.lvl + ((Math.random() * 3) | 0) + (R.type === 'trap' ? -2 : 0), mul = 0.8 + r.lvl * 0.25;
  for (let i = 0; i < n; i++) { const k = pool[(Math.random() * pool.length) | 0], x = (r.ox + R.x0 + 1 + Math.random() * (R.x1 - R.x0 - 1)) * T, y = (r.oy + R.y0 + 1 + Math.random() * (R.y1 - R.y0 - 1)) * T;
    const f = spawnFoe(k, x, y, { dg: r.id, dgRoom: R.i, ag: 1 }); f.mhp = f.hp = Math.round(f.hp * mul); sparkRing(x, y, 14, DG_THEMES[r.theme].c, 90, { life: 0.5 }); }
  R.st = 'fight'; tone(150, 0.4, 'sawtooth', 0.05, 0.6); noise(0.3, 0.05, 400); fxText(S.player.x, S.player.y - 40, '¡Las puertas se cierran!', '#ff6b5b', true);
}
const dgRoomAt = (wx, wy) => { const r = DGX.run; if (!r) return null; const lx = Math.floor(wx / T) - r.ox, ly = Math.floor(wy / T) - r.oy; if (lx < 0 || ly < 0 || lx >= DG_W || ly >= DG_W) return null; const i = r.rm[ly * DG_W + lx]; return i >= 0 ? r.rooms[i] : null; };
const dgClampIn = (o, R, m = 1) => { const r = DGX.run, x0 = (r.ox + R.x0 + m) * T, x1 = (r.ox + R.x1 + 1 - m) * T, y0 = (r.oy + R.y0 + m) * T, y1 = (r.oy + R.y1 + 1 - m) * T; o.x = clamp(o.x, x0, x1); o.y = clamp(o.y, y0, y1); };

// ---------- Cada fotograma ----------
function dgTick(dt) {
  dgDiscover();
  // Partida guardada dentro de una mazmorra (o mazmorra perdida): de vuelta a la entrada
  if (!DGX.run && inDungeon()) { const h = S.dgHome || { x: 0, y: 0 }; S.player.x = h.x; S.player.y = h.y; view.x = h.x; view.y = h.y; S.dgHome = null; dgPurge(); return; }
  const r = DGX.run; if (!r) { const hd = $('dgHud'); if (hd && !hd.hidden) hd.hidden = true; /* fuera de la mazmorra, sin marcador */ if ((DGX.purgeT = (DGX.purgeT || 0) - dt) <= 0) { DGX.purgeT = 5; dgPurge(); } return; } r.t += dt; /* sin mazmorra: lo que quede de ella en memoria se borra */
  if (S.pc && S.pc.hp < r.hp0 - 0.01) r.hurt = true; if (S.pc) r.hp0 = S.pc.hp;
  for (let i = ANIMALS.length - 1; i >= 0; i--) if (dgZone(Math.floor(ANIMALS[i].x / T), Math.floor(ANIMALS[i].y / T))) ANIMALS.splice(i, 1);
  const p = S.player, R = dgRoomAt(p.x, p.y);
  if (R && !R.seen) R.seen = true;
  // Entrar en una sala: si tiene enemigos, se cierra hasta vencerlos
  if (R && R.st === 'idle' && R.type !== 'boss') { const lx = p.x / T - r.ox, ly = p.y / T - r.oy; if (lx > R.x0 + 0.8 && lx < R.x1 + 0.2 && ly > R.y0 + 0.8 && ly < R.y1 + 0.2) { if (R.type === 'lever' && Math.random() < 0.3) R.st = 'clear'; else dgSpawnRoom(R); } }
  for (const Q of r.rooms) if (Q.st === 'fight' && Q.type !== 'boss' && !FOES.some(f => f.dg === r.id && f.dgRoom === Q.i)) { Q.st = 'clear'; tone(520, 0.2, 'triangle', 0.05, 1.4); fxText(p.x, p.y - 40, 'Sala despejada', '#7fd07a', true); }
  // Que nadie se salga de su sala (ni el jefe teletransportándose)
  for (const f of FOES) if (f.dg === r.id) { const Q = r.rooms[f.dgRoom]; if (Q) dgClampIn(f, Q); }
  // Jefe
  const B = r.boss;
  if (r.solved && r.bossSt === 'open' && R === B) { const lx = p.x / T - r.ox, ly = p.y / T - r.oy; if (lx > B.x0 + 1.5 && lx < B.x1 - 0.5 && ly > B.y0 + 1.5 && ly < B.y1 - 0.5) dgBossWake(); }
  if (r.bossSt === 'fight') { B.st = 'fight';
    if (!r.bossF && BOSS && FOES.includes(BOSS) && dgRoomAt(BOSS.x, BOSS.y) === B) { r.bossF = BOSS; BOSS.dg = r.id; BOSS.dgRoom = B.i; BOSS.mhp = BOSS.hp = Math.round(BOSS.hp * (0.7 + r.lvl * 0.2)); }
    if (r.bossF && !FOES.includes(r.bossF) && r.bossSt === 'fight') dgBossDown(); // se fue sin morir: cuenta como vencido si ya no está
    if (!r.bossF && !BOSS && (r.bossWT -= dt) <= 0) { r.bossWT = 3; dgSummon(); } }
  // Trampas: pinchos que salen por oleadas y ballestas en la pared
  const tx = Math.floor(p.x / T), ty = Math.floor((p.y + 4) / T);
  if (dgCode(tx, ty) === 3 && dgSpikeUp(tx - r.ox, ty - r.oy) && !(typeof WF !== 'undefined' && WF.on)) hitPlayer(6 + r.lvl * 3, 'cut', 'Pinchos');
  for (const tu of r.turrets) { if (R !== r.rooms[tu.room]) continue; if ((tu.cd -= dt) > 0) continue; tu.cd = Math.max(0.9, 2.2 - r.lvl * 0.2);
    const sx = (r.ox + tu.x + 0.5) * T, sy = (r.oy + tu.y + 0.5) * T, a = Math.atan2(p.y - sy, p.x - sx);
    PROJ.push({ x: sx + Math.cos(a) * 18, y: sy + Math.sin(a) * 18, vx: Math.cos(a) * 15 * T, vy: Math.sin(a) * 15 * T, r: 4, dmg: 5 + r.lvl * 3, c: '#e8e0c8', team: 'e', life: 2, arrow: 1, wound: 'cut', src: 'Ballesta' }); tone(300, 0.06, 'square', 0.03, 0.5); }
  if (r.zapT > 0) r.zapT -= dt;
  dgHud();
}
const dgSpikeUp = (lx, ly) => { const ph = ((DGX.run.t * 0.42 + (lx + ly) * 0.07) % 1); return ph < 0.38; };
function dgBossWake() {
  const r = DGX.run; r.bossSt = 'fight'; r.bossWT = 0; r.boss.st = 'fight';
  wvBanner('☠ ¡El guardián despierta!', r.ent.name, DG_THEMES[r.theme].c, 3); shake = Math.max(shake || 0, 0.6);
}
function dgSummon() {
  const r = DGX.run, B = r.boss, ks = Object.keys(BOSSES).filter(k => (BOSSES[k].tier || 0) <= Math.max(S.tier || 0, r.lvl - 1) && !BOSSES[k].water && !BOSSES[k].sea && !(typeof ASC !== 'undefined' && ASC[k] && ASC[k].env === 'mar')), k = ks.length ? ks[(Math.random() * ks.length) | 0] : Object.keys(BOSSES)[0];
  summonBoss(k, true, { x: (r.ox + B.mx + 0.5) * T, y: (r.oy + B.my - 2) * T }); // «natural»: sin levantar el escenario del Ascenso encima de la sala
}
function dgBossDown() {
  const r = DGX.run; if (!r || r.bossSt === 'dead') return; r.bossSt = 'dead'; r.boss.st = 'clear';
  const B = r.boss; r.portal = { x: B.mx, y: B.my + 3 }; r.chests.push({ x: B.mx, y: B.my, open: false, big: true, room: B.i });
  (S.dgClr || (S.dgClr = {}))[r.ent.key] = dgDay();
  wvBanner('🏆 ¡Guardián vencido!', 'Abre el gran cofre y cruza el portal para salir', '#ffd34a', 4); sparkRing((r.ox + B.mx) * T, (r.oy + B.my) * T, 80, '#ffd34a', 260, { life: 1.2, size: 3 });
  if (typeof achAdd === 'function') { achAdd('dungeons'); if (!r.hurt) achAdd('dgFlawless'); if (r.lvl >= 5) achAdd('dgDeep'); }
  if (typeof questEvent === 'function') questEvent('dungeon', r.ent);
}
{ const b0 = bossDefeated; bossDefeated = (f, loot) => { b0(f, loot); if (DGX.run && f === DGX.run.bossF) dgBossDown(); }; }

// ---------- Interactuar (F): entrada, palancas, cofres, tablilla y portales ----------
function dgInteract() {
  const p = S.player, mw = mouseWorld(), near = (tx, ty, d = 2.2) => Math.hypot((tx + 0.5) * T - p.x, (ty + 0.5) * T - p.y) < d * T || (Math.hypot((tx + 0.5) * T - mw.x, (ty + 0.5) * T - mw.y) < T && Math.hypot((tx + 0.5) * T - p.x, (ty + 0.5) * T - p.y) < 3.5 * T);
  const r = DGX.run;
  if (!r) { for (const e of dgEntsNear(p.x, p.y, 4)) if (near(e.x + 0.5, e.y + 0.5, 2.4)) { dgEnter(e); return true; } return false; }
  if (!inDungeon()) return false;
  if (near(r.ox + r.exit.x, r.oy + r.exit.y)) { dgEnd(false, 'quit'); return true; }
  if (r.portal && near(r.ox + r.portal.x, r.oy + r.portal.y)) { dgEnd(true); return true; }
  if (near(r.ox + r.tablet.x, r.oy + r.tablet.y)) { toast(`📜 La tablilla dice: «Despierta al guardián en este orden: ${r.seq.map(i => DG_SYMS[i][0]).join('  →  ')}». ${r.levers.length > 3 ? 'Una de las palancas es una trampa.' : ''}`, true); return true; }
  for (const c of r.chests) if (!c.open && near(r.ox + c.x, r.oy + c.y)) { dgOpenChest(c); return true; }
  for (const l of r.levers) if (near(r.ox + l.x, r.oy + l.y)) { dgPull(l); return true; }
  return false;
}
{ const i0 = interact; interact = (shift, ctrl) => { if (S && dgInteract()) return; return i0(shift, ctrl); }; }
function dgPull(l) {
  const r = DGX.run; if (l.on || r.solved) { toast(r.solved ? 'La sala del jefe ya está abierta' : 'Esta palanca ya está bajada'); return; }
  const R = r.rooms[l.room]; if (R.st === 'fight') { toastErr('Vence antes a los enemigos de la sala'); return; }
  tone(200, 0.15, 'square', 0.05, 0.6);
  if (r.seq[r.seqI] === l.sym) { l.on = true; r.seqI++; sparkRing((r.ox + l.x + 0.5) * T, (r.oy + l.y + 0.5) * T, 16, DG_SYMS[l.sym][1], 90);
    if (r.seqI >= r.seq.length) { r.solved = true; r.bossSt = 'open'; wvBanner('🔓 Se oye un portón lejano…', 'La sala del guardián está abierta', DG_THEMES[r.theme].c, 3.5); tone(260, 0.8, 'sine', 0.06, 1.8); if (typeof achAdd === 'function') achAdd('dgPuzzles'); }
    else toast(`${DG_SYMS[l.sym][0]} correcto (${r.seqI} de ${r.seq.length})`); return; }
  for (const o of r.levers) o.on = false; r.seqI = 0;
  hitPlayer(8 + r.lvl * 2, 'burn', 'Descarga de la palanca', 'storm'); addBolt(S.player.x, S.player.y - 140, S.player.x, S.player.y, '#f0f05a', 0.3); screenFlash('#f0f05a', 0.25);
  toastErr('¡Orden incorrecto! Las palancas vuelven a subir. Lee otra vez la tablilla.');
}
function dgOpenChest(c) {
  const r = DGX.run; c.open = true; const wx = (r.ox + c.x + 0.5) * T, wy = (r.oy + c.y + 0.5) * T;
  if (c.mimic && ENEMIES.mimic) { const f = spawnFoe('mimic', wx, wy, { dg: r.id, dgRoom: c.room, ag: 1 }); f.mhp = f.hp = Math.round(f.hp * (1 + r.lvl * 0.4)); r.rooms[c.room].st = 'fight'; fxText(wx, wy - 30, '¡Es un mimo!', '#ff6b5b', true); bossRoar(); c.mimic = false; c.open = false; return; }
  const L = r.lvl, got = [['coin', (c.big ? 60 : c.small ? 8 : 20) * L + ((Math.random() * 20) | 0)]];
  const pots = ['tPotHeal' + Math.min(4, L), 'potionMana', 'bandage'].filter(id => ITEMS[id]); if (pots.length) got.push([pots[(Math.random() * pots.length) | 0], c.big ? 4 : 2]);
  const gear = Object.keys(ITEMS).filter(id => ITEMS[id].weapon && typeof TR !== 'undefined' && TR[id] && (TR[id].r || 0) >= Math.min(4, L - 1) && (TR[id].r || 0) <= L + 1);
  if (gear.length && (c.big || Math.random() < 0.35)) got.push([gear[(Math.random() * gear.length) | 0], 1]);
  const scr = Object.keys(ITEMS).filter(id => id.startsWith('spell_') && SPELLS[ITEMS[id].learn] && !SPELLS[ITEMS[id].learn].mortal);
  if (scr.length && (c.big || Math.random() < 0.25)) got.push([scr[(Math.random() * scr.length) | 0], 1]);
  const mats = ['ironIngot', 'goldIngot', 'manaCrystal', 'gem', 'diamond', 'spiritOrb', 'obsidian'].filter(id => ITEMS[id]); for (let i = 0; i < (c.big ? 3 : 1); i++) if (mats.length) got.push([mats[(Math.random() * mats.length) | 0], 1 + ((Math.random() * L) | 0)]);
  let lost = 0; for (const [id, n] of got) lost += invGive(id, n, wx, wy + 20); invVersion++;
  sparkRing(wx, wy, c.big ? 50 : 22, '#ffd34a', 140, { up: 50, life: 0.8 }); tone(780, 0.1, 'triangle', 0.05, 1.2); tone(1170, 0.2, 'triangle', 0.05, 1, 0.1);
  toast('🧰 ' + got.map(([id, n]) => n + ' ' + ITEMS[id].n).join(', '), true);
  if (typeof achAdd === 'function') achAdd('dgChests');
}

// ---------- Dibujo ----------
{ const d0 = drawCombat; drawCombat = (ctx, k, ox, oy, x0, y0, x1, y1) => { if (S) { try { dgDraw(ctx); } catch (e) { } } return d0(ctx, k, ox, oy, x0, y0, x1, y1); }; }
function dgDraw(ctx) {
  const t = performance.now() / 1000, p = S.player;
  if (!DGX.run) { if (inArena && inArena()) return; for (const e of dgEntsNear(view.x, view.y, 30)) dgDrawEnt(ctx, e, t); return; }
  const r = DGX.run, ox = r.ox, oy = r.oy, TH = DG_THEMES[r.theme], vx = view.x / T - ox, vy = view.y / T - oy, VR = 26;
  // Pinchos
  for (let y = Math.max(0, Math.floor(vy - VR)); y < Math.min(DG_W, vy + VR); y++) for (let x = Math.max(0, Math.floor(vx - VR)); x < Math.min(DG_W, vx + VR); x++) {
    if (r.map[y * DG_W + x] !== 3) continue; const up = dgSpikeUp(x, y), X = (ox + x) * T, Y = (oy + y) * T;
    ctx.fillStyle = 'rgba(20,16,20,.55)'; ctx.fillRect(X + 3, Y + 3, T - 6, T - 6);
    ctx.fillStyle = up ? '#d8d4dc' : '#4a464e'; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const sx = X + 7 + i * 9, sy = Y + 9 + j * 9, h = up ? 7 : 2; ctx.beginPath(); ctx.moveTo(sx - 2.5, sy + 2); ctx.lineTo(sx, sy + 2 - h); ctx.lineTo(sx + 2.5, sy + 2); ctx.fill(); } }
  // Puertas cerradas (rejas)
  for (const R of r.rooms) { const shut = R.st === 'fight' || (R.type === 'boss' && !r.solved); if (!shut) continue;
    for (const [gx, gy] of R.gates) { const X = (ox + gx) * T, Y = (oy + gy) * T; ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(X, Y, T, T); ctx.strokeStyle = R.type === 'boss' ? TH.c : '#8a8890'; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(X + 4 + i * 8, Y); ctx.lineTo(X + 4 + i * 8, Y + T); } ctx.moveTo(X, Y + 10); ctx.lineTo(X + T, Y + 10); ctx.moveTo(X, Y + 22); ctx.lineTo(X + T, Y + 22); ctx.stroke(); } }
  // Ballestas
  for (const tu of r.turrets) { const X = (ox + tu.x) * T, Y = (oy + tu.y) * T; ctx.fillStyle = '#3a3036'; ctx.fillRect(X + 6, Y + 6, T - 12, T - 12); ctx.fillStyle = '#c8a070'; ctx.beginPath(); ctx.arc(X + 16, Y + 16, 4, 0, 7); ctx.fill(); }
  // Tablilla, salida, palancas, cofres y portal
  const lbl = (x, y, s, c) => { ctx.font = '600 9px system-ui'; ctx.textAlign = 'center'; const w = ctx.measureText(s).width + 8; ctx.fillStyle = 'rgba(10,10,14,.65)'; ctx.fillRect(x - w / 2, y - 9, w, 12); ctx.fillStyle = c || '#fff'; ctx.fillText(s, x, y); };
  const nearP = (x, y) => Math.hypot((ox + x + 0.5) * T - p.x, (oy + y + 0.5) * T - p.y) < 3 * T;
  { const X = (ox + r.tablet.x) * T, Y = (oy + r.tablet.y) * T; ctx.fillStyle = '#5a5660'; ctx.fillRect(X + 6, Y + 2, 20, 26); ctx.fillStyle = '#7a7680'; ctx.fillRect(X + 8, Y + 4, 16, 22); ctx.fillStyle = TH.c; ctx.font = '8px system-ui'; ctx.textAlign = 'center'; r.seq.forEach((s, i) => ctx.fillText(DG_SYMS[s][0], X + 16, Y + 11 + i * 7)); if (nearP(r.tablet.x, r.tablet.y)) lbl(X + 16, Y - 4, 'F: leer la tablilla'); }
  dgDrawPortal(ctx, (ox + r.exit.x + 0.5) * T, (oy + r.exit.y + 0.5) * T, '#9a9aa8', t, 0.7); if (nearP(r.exit.x, r.exit.y)) lbl((ox + r.exit.x + 0.5) * T, (oy + r.exit.y) * T - 8, 'F: salir (abandonas la mazmorra)');
  for (const l of r.levers) { const X = (ox + l.x) * T, Y = (oy + l.y) * T, [s, c] = DG_SYMS[l.sym];
    ctx.fillStyle = '#3a3640'; ctx.fillRect(X + 9, Y + 18, 14, 10); ctx.strokeStyle = '#c8c0b0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X + 16, Y + 22); ctx.lineTo(X + 16 + (l.on ? 9 : -9), Y + 8); ctx.stroke(); ctx.fillStyle = l.on ? c : '#e05050'; ctx.beginPath(); ctx.arc(X + 16 + (l.on ? 9 : -9), Y + 8, 3.5, 0, 7); ctx.fill();
    ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = c; ctx.globalAlpha = l.on ? 1 : 0.6 + 0.3 * Math.sin(t * 3); ctx.fillText(s, X + 16, Y - 2); ctx.globalAlpha = 1; if (nearP(l.x, l.y) && !l.on) lbl(X + 16, Y - 16, 'F: bajar la palanca'); }
  for (const c of r.chests) { const X = (ox + c.x) * T, Y = (oy + c.y) * T, s = c.big ? 1.4 : c.small ? 0.85 : 1; ctx.save(); ctx.translate(X + 16, Y + 18); ctx.scale(s, s);
    ctx.fillStyle = c.big ? '#b08a2a' : '#8a5a2a'; ctx.fillRect(-11, -6, 22, 14); ctx.fillStyle = c.open ? '#2a1a10' : c.big ? '#d8b040' : '#a06a34'; ctx.fillRect(-11, c.open ? -12 : -11, 22, c.open ? 4 : 6); ctx.fillStyle = '#ffd34a'; ctx.fillRect(-2, -5, 4, 4);
    if (!c.open) { ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 4); ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.fill(); ctx.globalAlpha = 1; } ctx.restore(); if (!c.open && nearP(c.x, c.y)) lbl(X + 16, Y - 6, 'F: abrir el cofre'); }
  if (r.portal) { dgDrawPortal(ctx, (ox + r.portal.x + 0.5) * T, (oy + r.portal.y + 0.5) * T, '#ffd34a', t, 1); if (nearP(r.portal.x, r.portal.y)) lbl((ox + r.portal.x + 0.5) * T, (oy + r.portal.y) * T - 12, 'F: volver a la superficie', '#ffd34a'); }
  // La puerta del jefe muestra cuántos símbolos van
  const B = r.boss; if (!r.solved && B.gates.length) { const g = B.gates[(B.gates.length / 2) | 0], X = (ox + g[0] + 0.5) * T, Y = (oy + g[1]) * T - 6; r.seq.forEach((s, i) => { ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = i < r.seqI ? DG_SYMS[s][1] : 'rgba(255,255,255,.25)'; ctx.fillText(DG_SYMS[s][0], X + (i - (r.seq.length - 1) / 2) * 12, Y); }); }
}
function dgDrawPortal(ctx, x, y, c, t, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s * 0.6);
  for (let i = 3; i >= 0; i--) { ctx.globalAlpha = 0.18 + i * 0.12; ctx.fillStyle = i % 2 ? c : '#1a1020'; ctx.beginPath(); ctx.arc(0, 0, 8 + i * 4 + Math.sin(t * 3 + i) * 1.5, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 0.9; ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 20, t * 2, t * 2 + 4.5); ctx.stroke(); ctx.restore();
}
function dgDrawEnt(ctx, e, t) {
  const TH = DG_THEMES[e.th], X = (e.x + 1) * T, Y = (e.y + 1) * T, sealed = dgSealed(e), p = S.player;
  ctx.save(); ctx.translate(X, Y);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 6, 34, 16, 0, 0, 7); ctx.fill();
  // Marco de piedra
  ctx.fillStyle = '#5e5a62'; ctx.beginPath(); ctx.ellipse(0, 0, 30, 18, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#76727a'; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; ctx.fillRect(Math.cos(a) * 26 - 3, Math.sin(a) * 15 - 3, 6, 6); }
  // Escalones hacia abajo
  ctx.fillStyle = '#0a0810'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 12, 0, 0, 7); ctx.fill();
  for (let i = 0; i < 4; i++) { ctx.fillStyle = `rgba(90,86,96,${0.7 - i * 0.16})`; ctx.fillRect(-14 + i * 2, -6 + i * 4, 28 - i * 4, 2.5); }
  if (!sealed) { ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 2); const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 30); g.addColorStop(0, TH.c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 30, 18, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = TH.c; for (let i = 0; i < 6; i++) { const a = t * 0.8 + i * 1.05, rr = 32; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + i); ctx.fillRect(Math.cos(a) * rr - 1, Math.sin(a) * rr * 0.55 - 1 - ((t * 10 + i * 7) % 14), 2, 2); } ctx.globalAlpha = 1; }
  else { ctx.strokeStyle = '#8a8890'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-18, -8); ctx.lineTo(18, 8); ctx.moveTo(18, -8); ctx.lineTo(-18, 8); ctx.stroke(); }
  // Nombre al acercarte
  const d = Math.hypot(X - p.x, Y - p.y) / T; if (d < 10) { ctx.globalAlpha = clamp(1.6 - d / 8, 0.3, 1); ctx.font = '700 10px system-ui'; ctx.textAlign = 'center'; const s = `${e.name} · nivel ${e.lvl}`, s2 = sealed ? 'Sellada hasta mañana' : d < 3 ? 'F: bajar' : '', w = Math.max(ctx.measureText(s).width, ctx.measureText(s2).width) + 12;
    ctx.fillStyle = 'rgba(10,10,14,.7)'; ctx.fillRect(-w / 2, -44, w, s2 ? 26 : 14); ctx.fillStyle = TH.c; ctx.fillText(s, 0, -34); if (s2) { ctx.font = '9px system-ui'; ctx.fillStyle = sealed ? '#aaa' : '#fff'; ctx.fillText(s2, 0, -22); } ctx.globalAlpha = 1; }
  ctx.restore();
}
// ---------- Marcador de la mazmorra ----------
function dgHud() {
  let e = $('dgHud'); if (!e) { e = document.createElement('div'); e.id = 'dgHud'; document.body.appendChild(e); }
  const r = DGX.run, show = !!r && inDungeon() && !ui.open; if (e.hidden === show) e.hidden = !show; if (!show) return;
  const TH = DG_THEMES[r.theme], clr = r.rooms.filter(R => R.st === 'clear').length, B = r.boss;
  const mp = r.rooms.map(R => { const c = R === B ? (r.bossSt === 'dead' ? '#ffd34a' : '#ff6b5b') : R.type === 'start' ? '#9a9aa8' : R.st === 'fight' ? '#ff9a4a' : R.st === 'clear' ? TH.c : R.seen ? '#55525c' : '#26242a'; const here = dgRoomAt(S.player.x, S.player.y) === R; return `<i style="background:${c}${here ? ';outline:1.5px solid #fff' : ''}"></i>`; }).join('');
  const boss = r.bossSt === 'dead' ? '🏆 Guardián vencido' : r.bossSt === 'fight' ? '☠ ¡Lucha con el guardián!' : r.solved ? '🔓 Sala del guardián abierta' : '🔒 ' + r.seq.map((s, i) => `<b style="color:${i < r.seqI ? DG_SYMS[s][1] : '#666'}">${DG_SYMS[s][0]}</b>`).join(' ');
  const sig = [r.id, clr, r.seqI, r.bossSt, !!BOSS, mp.length, Math.floor(r.t), mp].join('|'); if (DGX.hud === sig) return; DGX.hud = sig;
  e.style.setProperty('--c', TH.c); e.classList.toggle('low', !!BOSS); // con jefe, debajo de su barra
  e.innerHTML = `<div class="dgt"><b>🕳 ${esc(r.ent.name)}</b><span>Nivel ${r.lvl} · ⏱ ${fmtT(r.t)}</span></div><div class="dgrow"><div class="dgmap">${mp}</div><div class="dgs"><span>Salas despejadas: ${clr}/${r.rooms.length}</span><span>${boss}</span></div></div>`;
}
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); if (S) dgTick(fdt); }; }
{ const e0 = enterWorld; enterWorld = () => { DGX.run = null; DGX.ents.clear(); DGX.extra = []; dgPurge(); return e0(); }; }

// ---------- Pestaña de la ventana de Aventura ----------
ADV.tabs.dun = { n: '🕳 Mazmorras', render() {
  const L = S ? dgEntsNear(S.player.x, S.player.y, 300).filter(e => S.dgSeen && S.dgSeen[e.key]).sort((a, b) => Math.hypot(a.x * T - S.player.x, a.y * T - S.player.y) - Math.hypot(b.x * T - S.player.x, b.y * T - S.player.y)) : [];
  const dir = e => { const dx = e.x * T - S.player.x, dy = e.y * T - S.player.y, a = Math.atan2(dy, dx), n = ['este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste', 'norte', 'noreste'][((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8]; return `${Math.round(Math.hypot(dx, dy) / T)} casillas al ${n}`; };
  return `<p class="mut">Las entradas aparecen por todo el mundo. Cada vez que bajas, la mazmorra es distinta: salas que se cierran hasta que vences a sus enemigos, trampas, cofres (¡ojo con los mimos!) y un puzle de palancas que abre la sala del guardián. Vencido el guardián, la entrada queda sellada hasta el día siguiente.</p>
    <h4 class="cxh">Entradas que conoces</h4>${L.length ? `<div class="dglist">${L.map(e => `<div class="dgc" style="--c:${DG_THEMES[e.th].c}"><b>${esc(e.name)}</b><span>Nivel ${'★'.repeat(e.lvl)}${'☆'.repeat(5 - e.lvl)}</span><small>${dir(e)}${dgSealed(e) ? ' · sellada hasta mañana' : ''}</small></div>`).join('')}</div>` : '<p class="mut">Todavía no has encontrado ninguna. Explora: se ven como un agujero con escalones y un brillo de color.</p>'}`;
} };
// /mazmorra: te pone una entrada al lado (truco)
cmd('mazmorra', { a: ['dungeon', 'dg'], u: '/mazmorra [nivel 1-5]', d: 'Abre una entrada de mazmorra justo a tu lado.', cheat: 1, run(a) {
  if (DGX.run) { dgEnd(false, 'quit'); return; } const tx = Math.floor(S.player.x / T) + 2, ty = Math.floor(S.player.y / T), th = Object.keys(DG_THEMES)[(Math.random() * 6) | 0], TH = DG_THEMES[th];
  const e = { key: 'cmd' + Date.now(), x: tx, y: ty, th, lvl: clamp(parseInt(a[0]) || 1, 1, 5), name: TH.n + ' ' + TH.names[(Math.random() * 5) | 0] }; DGX.extra.push(e);
  toast(`🕳 ${e.name} (nivel ${e.lvl}) se abre a tu lado. Pulsa F junto a ella.`);
} });
