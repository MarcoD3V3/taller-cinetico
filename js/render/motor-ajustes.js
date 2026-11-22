'use strict';
// =====================================================================================
//  Ajustes del Motor de sprites (herramienta aparte: «motor.bat» → herramientas/motor).
//  Lo que se cambia allí se guarda en sprites/ajustes.js (window.AJUSTES) y aquí se aplica:
//   · por imagen (customsprites.js / grounddecor.js): escala, mover dibujo, choque, línea de orden, viento, oculta
//   · por categoría del suelo: tamaño del píxel, si se levanta (se ordena con el personaje), viento, qué da al recogerla
//   · por suelo: densidad y qué categorías salen (y cuánto)
//   · por bioma: qué árboles salen y con qué densidad (solo en el terreno nuevo que se genere)
//  Modo prueba (index.html?prueba=1…): usa los cambios aún sin guardar del motor, no guarda nada y monta
//  un mundo pequeño con el sprite elegido, o abre un mundo que ya exista. Tecla C: ver choques y líneas de orden.
// =====================================================================================
const MOTOR_Q = new URLSearchParams(location.search), MOTOR_PRUEBA = MOTOR_Q.get('prueba') === '1';
if (MOTOR_PRUEBA) { try { const t = localStorage.getItem('motor-ajustes'); if (t) window.AJUSTES = JSON.parse(t); } catch (e) { } }
if (!window.AJUSTES) window.AJUSTES = { v: 1, sprites: {}, suelo: { cats: {}, grounds: {} }, biomas: {} };

// ---------- Valores de serie (antes de aplicar nada): el motor los lee para mostrar «por defecto» ----------
const MOTOR_DEF = { suelo: JSON.parse(JSON.stringify(GD_BIOME)), biomas: {}, cats: null };
for (const b of BIOMES) { if (!b || !b.key) continue; const m = {}; for (const [t, d] of b.treeI || []) if (GI[t]) m[GI[t].key] = d; MOTOR_DEF.biomas[b.key] = m; }

// ---------- Suelos y biomas (se pueden volver a aplicar: el motor manda cambios en vivo al juego de prueba) ----------
function motorApply() {
  const A = window.AJUSTES || {}, gs = (A.suelo && A.suelo.grounds) || {};
  for (const k in GD_BIOME) delete GD_BIOME[k];
  Object.assign(GD_BIOME, JSON.parse(JSON.stringify(MOTOR_DEF.suelo)));
  for (const k in gs) { const v = gs[k]; if (!v || G[k] === undefined) continue; GD_BIOME[k] = [Math.max(0, Math.min(1, +v.dens || 0)), { ...(v.w || {}) }]; }
  const bs = A.biomas || {};
  for (const b of BIOMES) { if (!b || !b.key) continue; const src = bs[b.key] && bs[b.key].arboles ? bs[b.key].arboles : MOTOR_DEF.biomas[b.key];
    if (src) b.treeI = Object.entries(src).filter(([k, d]) => G[k] !== undefined && +d > 0).map(([k, d]) => [G[k], +d]); }
}
motorApply();
// Categorías del suelo: al tener los sprites (gdSets), se guardan los valores de serie y se aplican los del motor
const GD_UPF = new Set(); // categorías que el motor obliga a «levantarse» aunque sean bajitas
function motorCats() {
  const D = MOTOR_DEF.cats; if (!D) return;
  GD_PX1.clear(); D.px1.forEach(c => GD_PX1.add(c)); GD_FLAT.clear(); D.flat.forEach(c => GD_FLAT.add(c)); GD_TALL.clear(); D.tall.forEach(c => GD_TALL.add(c)); GD_UPF.clear();
  for (const k in GD_SWAY) delete GD_SWAY[k]; Object.assign(GD_SWAY, JSON.parse(JSON.stringify(D.sway)));
  for (const k in GD_GIVE) delete GD_GIVE[k]; Object.assign(GD_GIVE, JSON.parse(JSON.stringify(D.give)));
  const cs = (window.AJUSTES.suelo && window.AJUSTES.suelo.cats) || {};
  for (const c in cs) { const v = cs[c]; if (!v) continue;
    if (v.px === 1) GD_PX1.add(c); else if (v.px === 1.6) GD_PX1.delete(c);
    if (v.up === true) { GD_FLAT.delete(c); GD_UPF.add(c); } else if (v.up === false) GD_FLAT.add(c);
    if (v.centro === true) GD_TALL.add(c); else if (v.centro === false) GD_TALL.delete(c);
    if (v.viento != null) GD_SWAY[c] = [Math.max(0, +v.viento || 0), 1];
    if (Array.isArray(v.dar) && v.dar[0] && ITEMS[v.dar[0]]) GD_GIVE[c] = [v.dar[0], v.dar[1] || v.dar[0], Math.max(1, +v.dar[2] || 1)]; }
}
let _motorGd = null;
{ const g0 = gdSets; gdSets = () => {
  const r = g0(); if (!r || r === _motorGd) return r; _motorGd = r;
  if (!MOTOR_DEF.cats) MOTOR_DEF.cats = { px1: [...GD_PX1], flat: [...GD_FLAT], sway: JSON.parse(JSON.stringify(GD_SWAY)), give: JSON.parse(JSON.stringify(GD_GIVE)), tall: [...GD_TALL] };
  motorCats(); return r;
}; }
{ const a0 = gdAdj; gdAdj = o => { if (o) for (const q of o.group || [o]) if (GD_UPF.has(q.cat)) q.up = true; return a0(o); }; }
// ---------- Comandos creados en el motor (/nombre en el chat) ----------
// Cada uno: nombre, alias, uso, descripción, si es truco, pasos (otros comandos, con $1 $2… $todo $x $y $cx $cy)
// y, si se quiere, una función en JavaScript que recibe (args, raw, api). No pisa los comandos del juego.
const MOTOR_API = {
  get S() { return S; }, get jugador() { return S && S.player; }, T,
  cmd: l => runCmd(String(l).replace(/^\//, '')), msg: t => okMsg(String(t)), error: t => errMsg(String(t)), aviso: t => toast(String(t)),
  dar: (id, n = 1) => { const it = findItem(String(id)); if (!it) return errMsg('No existe el objeto ' + id); runCmd(`dar ${it} ${Math.max(1, n | 0)}`); },
  tp: (x, y) => runCmd(`tp ${x | 0} ${y | 0}`), casilla: () => ({ x: Math.floor(S.player.x / T), y: Math.floor(S.player.y / T) }), cursor: () => ({ x: mouse.tx, y: mouse.ty }),
  suelo: (x, y) => GI[gnd(x, y)].key, poner: (x, y, key) => { if (G[key] === undefined) return errMsg('No existe el suelo ' + key); setGround(x, y, G[key], GI[G[key]].hp || 0); },
  objeto: q => findItem(String(q)), azar: (a, b) => a + Math.floor(Math.random() * (b - a + 1))
};
let _motorCmdDepth = 0;
function motorCmds() {
  if (typeof CMDS === 'undefined') return;
  for (const k in CMDS) if (CMDS[k] && CMDS[k].motor) delete CMDS[k];
  for (const c of (window.AJUSTES && window.AJUSTES.comandos) || []) {
    const n = normTxt(c.nombre || ''); if (!/^[a-z0-9_]{1,24}$/.test(n) || CMDS[n]) continue; // nombre raro o ya es del juego: no se registra
    let fn = null; if (c.js && String(c.js).trim()) { try { fn = new Function('args', 'raw', 'api', String(c.js)); } catch (e) { console.warn('Comando /' + n + ': la función tiene un error', e); } }
    const pasos = (c.pasos || []).map(x => String(x).trim()).filter(Boolean);
    const run = (args, raw) => {
      if (_motorCmdDepth > 6) return errMsg('Demasiados comandos encadenados');
      const p = S && S.player, sub = t => t.replace(/\$todo/g, args.join(' ')).replace(/\$(\d+)/g, (m, i) => args[i - 1] ?? '').replace(/\$cx/g, mouse.tx).replace(/\$cy/g, mouse.ty)
        .replace(/\$x/g, p ? Math.floor(p.x / T) : 0).replace(/\$y/g, p ? Math.floor(p.y / T) : 0);
      _motorCmdDepth++;
      try { for (const l of pasos) runCmd(sub(l).replace(/^\//, '')); if (fn) { const r = fn(args, raw, MOTOR_API); if (typeof r === 'string') return r; } }
      catch (e) { return errMsg('Error en /' + n + ': ' + e.message); } finally { _motorCmdDepth--; }
      return c.msg ? sub(String(c.msg)) : undefined;
    };
    cmd(n, { motor: 1, a: (c.alias || []).map(a => normTxt(a)).filter(a => /^[a-z0-9_]{1,24}$/.test(a) && !CMDS[a]), u: c.uso || '/' + n, d: c.desc || 'Comando creado en el motor.', cheat: c.truco ? 1 : 0, run });
  }
}
motorCmds();
// Vuelve a aplicar todo (cambios en vivo): se vacían las memorias de árboles y objetos del suelo
function motorRefresh() {
  try {
    motorApply(); _csTreeSpr.clear(); _csTreeImgs.clear(); _gd = null; _motorGd = null; _gdPick.clear(); _gdCache.clear();
    if (typeof _gdPatchT !== 'undefined') _gdPatchT.clear();
    motorCmds();
  } catch (e) { console.warn('motor: no se pudieron aplicar los cambios', e); }
}
// Cambios en vivo SIN tirones: solo se rehace lo que cambió (no todos los árboles y matas del mundo)
let _motorUlt = JSON.stringify(window.AJUSTES || {});
function motorAplicar(nuevo) {
  const txt = JSON.stringify(nuevo); if (txt === _motorUlt) return; // el eco del mismo cambio: nada que hacer
  const viejo = JSON.parse(_motorUlt); _motorUlt = txt; window.AJUSTES = nuevo;
  try {
    const S0 = viejo.sprites || {}, S1 = nuevo.sprites || {}, cambio = new Set();
    for (const k of new Set([...Object.keys(S0), ...Object.keys(S1)])) if (JSON.stringify(S0[k]) !== JSON.stringify(S1[k])) cambio.add(k);
    const ocultos = [...cambio].some(k => !!(S0[k] || {}).oculto !== !!(S1[k] || {}).oculto);
    if (ocultos) { _csTreeImgs.clear(); _csTreeSpr.clear(); _gd = null; _motorGd = null; _gdPick.clear(); _gdCache.clear(); } // mostrar/ocultar cambia las listas
    else if (cambio.size) {
      for (const [id, s] of _csTreeSpr) if (cambio.has(s.key)) _csTreeSpr.delete(id); // solo los árboles de esa imagen
      if ([...cambio].some(k => k.startsWith('suelo/'))) for (const [id, o] of _gdCache) if (o && (o.group || [o]).some(q => q.im && cambio.has(q.im.__key))) _gdCache.delete(id); // solo las matas de esa imagen
    }
    const j = o => JSON.stringify(o || {});
    if (j(viejo.suelo) !== j(nuevo.suelo)) { motorApply(); motorCats(); _gdPick.clear(); _gdCache.clear(); }
    if (j(viejo.biomas) !== j(nuevo.biomas)) motorApply();
    if (j(viejo.comandos) !== j(nuevo.comandos)) motorCmds();
  } catch (e) { console.warn('motor: cambio en vivo', e); motorRefresh(); }
}

// ---------- Ver choques y líneas de orden (modo prueba, tecla C) ----------
let MOTOR_DBG = false;
function motorDebugDraw() {
  if (!MOTOR_DBG || !S) return;
  const z = view.z, k = z * dpr, ox = Math.round(cw / 2 * dpr - view.x * k), oy = Math.round(ch / 2 * dpr - view.y * k);
  const x0 = Math.floor((view.x - cw / 2 / z) / T) - 1, x1 = Math.ceil((view.x + cw / 2 / z) / T) + 1, y0 = Math.floor((view.y - ch / 2 / z) / T) - 1, y1 = Math.ceil((view.y + ch / 2 / z) / T) + 1;
  ctx.save(); ctx.setTransform(k, 0, 0, k, ox, oy); ctx.lineWidth = 1 / z;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const t = gnd(tx, ty), g = GI[t];
    if (g.tree && csTreeImgs(t)) { const sz = g.hp ? clamp(Math.round((treeHp(tx, ty) || g.hp) / g.hp * 3), 0, 3) : 3, s = treeSprite(t, (hash2(tx, ty, 61) * 64) | 0, sz), bx = tx * T + 16, by = ty * T + 26;
      if (!s.noCol) for (const c of colsArbol(s)) { ctx.strokeStyle = c.activo === false ? '#888' : c.trigger ? '#3bffd0' : '#ff3b3b'; colTrazar(ctx, c, bx, by); ctx.stroke(); }
      ctx.strokeStyle = '#3bc8ff'; ctx.beginPath(); ctx.moveTo(bx - 14, by + (s.sortDy || 0)); ctx.lineTo(bx + 14, by + (s.sortDy || 0)); ctx.stroke(); }
    const o0 = typeof gdAt === 'function' && gdAt(tx, ty);
    if (o0) for (const o of o0.group || [o0]) { if (!o.up) continue; const cx = o.px + o.w / 2;
      ctx.strokeStyle = '#3bc8ff'; ctx.beginPath(); ctx.moveTo(cx - o.w / 2, o.py + (o.sortDy || 0)); ctx.lineTo(cx + o.w / 2, o.py + (o.sortDy || 0)); ctx.stroke();
      for (const c of colsSuelo(o)) { ctx.strokeStyle = c.activo === false ? '#888' : c.trigger ? '#3bffd0' : '#ff3b3b'; colTrazar(ctx, c, cx, o.py); ctx.stroke(); } }
  }
  // el jugador: su línea de orden (amarilla) y sus puntos de choque (verdes), con los valores del motor
  const p = S.player, fy = p.y + JUG('orden', 8); ctx.strokeStyle = '#ffe14a'; ctx.beginPath(); ctx.moveTo(p.x - 10, fy); ctx.lineTo(p.x + 10, fy); ctx.stroke();
  const A = JUG('choqueAncho', 5), pie = JUG('choquePie', 5), cen = JUG('choqueCentro', 1), pts = [[p.x - A, p.y + pie], [p.x + A, p.y + pie], [p.x, p.y + cen]];
  ctx.strokeStyle = '#5fe07a'; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[2][0], pts[2][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.stroke();
  ctx.fillStyle = '#5fe07a'; const d = 1.6 / z * 2; for (const [x, y] of pts) ctx.fillRect(x - d / 2, y - d / 2, d, d);
  ctx.restore();
}

// ---------- Triggers (colisores «Is Trigger»): al entrar el jugador se ejecuta su comando ----------
const _motorDentro = new Set(); let _motorTrigT = 0;
function motorTriggers() {
  if (!S || !S.player) return; const now = performance.now(); if (now - _motorTrigT < 150) return; _motorTrigT = now;
  const p = S.player, x = p.x, y = p.y + 5, tx0 = Math.floor(x / T), ty0 = Math.floor(y / T), dentro = new Set();
  for (let ty = ty0 - 2; ty <= ty0 + 2; ty++) for (let tx = tx0 - 2; tx <= tx0 + 2; tx++) {
    const t = gnd(tx, ty), g = GI[t]; let L = [], bx = tx * T + 16, by = ty * T + 26;
    if (g.tree && csTreeImgs(t)) { const sz = g.hp ? clamp(Math.round((treeHp(tx, ty) || g.hp) / g.hp * 3), 0, 3) : 3, s = treeSprite(t, (hash2(tx, ty, 61) * 64) | 0, sz); if (s.cols) L = s.cols.map((c, i) => [c, `a${tx},${ty},${i}`, bx, by]); }
    const o0 = typeof gdAt === 'function' && gdAt(tx, ty); if (o0) (o0.group || [o0]).forEach((o, j) => { if (o.cols) colsSuelo(o).forEach((c, i) => L.push([c, `s${tx},${ty},${j},${i}`, o.px + o.w / 2, o.py])); });
    for (const [c, id, ax, ay] of L) if (c.trigger && c.activo !== false && c.cmd && colDentro(c, x - ax, y - ay)) { dentro.add(id); if (!_motorDentro.has(id)) { try { runCmd(String(c.cmd).replace(/^\//, '')); } catch (e) { console.warn(e); } } }
  }
  _motorDentro.clear(); for (const id of dentro) _motorDentro.add(id);
}
{ const r1 = render; render = fdt => { r1(fdt); motorTriggers(); }; }

// ---------- Modo prueba (mundo para testear, aparte del juego normal) ----------
// · ▶ Probar entra directamente: sin menús ni personajes. El mundo de prueba («motor-mundo») se genera como el del
//   juego, solo existe en el motor y se guarda al salir. En él se monta un cuadrado pequeño con el sprite elegido.
// · Doble espacio: vuelo libre (rápido, sin choques ni capas, sin animación de andar).
// · Doble clic: selecciona un sprite (o el jugador). Clic derecho: menú flotante con sus ajustes → se guardan en el motor.
const MOTOR_SEL = { o: null };
const MOTOR_VUELO = { on: false, keys: new Set(), lastSpace: 0, t: 0 };
function motorRects(px, py) { // qué hay dibujado bajo un punto del mundo (lo de delante primero)
  const out = [], tx0 = Math.floor(px / T), ty0 = Math.floor(py / T);
  for (let ty = ty0 - 1; ty <= ty0 + 5; ty++) for (let tx = tx0 - 3; tx <= tx0 + 3; tx++) {
    const t = gnd(tx, ty), g = GI[t];
    if (g.tree && csTreeImgs(t)) { const sz = g.hp ? clamp(Math.round((treeHp(tx, ty) || g.hp) / g.hp * 3), 0, 3) : 3, v = (hash2(tx, ty, 61) * 64) | 0, s = treeSprite(t, v, sz);
      const X = tx * T + 16 - s.ax, Y = ty * T + 26 - s.ay; if (px >= X && px <= X + s.dw && py >= Y && py <= Y + s.dh) out.push({ tipo: 'sprite', key: s.key, tx, ty, t, flip: v & 1, k: s.k, bx: tx * T + 16, by: ty * T + 26, x: X, y: Y, w: s.dw, h: s.dh, z: ty * T + 26 + (s.sortDy || 0) }); }
    const o0 = typeof gdAt === 'function' && gdAt(tx, ty);
    if (o0) for (const o of o0.group || [o0]) { const X = o.px, Y = o.py - o.h + (o.oy || 0); if (px >= X && px <= X + o.w && py >= Y && py <= Y + o.h && o.im && o.im.__key) out.push({ tipo: 'sprite', key: o.im.__key, cat: o.cat, tx, ty, flip: o.flip ? 1 : 0, k: 1, bx: o.px + o.w / 2, by: o.py, x: X, y: Y, w: o.w, h: o.h, z: o.py + (o.sortDy || 0) }); }
  }
  const p = S.player, sc = JUG('escala', 1.6) / 1.6; if (Math.abs(px - p.x) < 10 * sc && py > p.y + 8 - 40 * sc && py < p.y + 10) out.push({ tipo: 'jugador', x: p.x - 10 * sc, y: p.y + 8 - 40 * sc, w: 20 * sc, h: 42 * sc, z: p.y + 8 + 0.5 });
  return out.sort((a, b) => b.z - a.z);
}
// los colisores (sin escala ni espejo) de lo seleccionado: los del motor, o el automático del árbol
function motorColsSel(s) { const a = ((window.AJUSTES.sprites || {})[s.key]) || {}; if (Array.isArray(a.cols)) return a.cols; if (a.col === false) return []; if (a.col) return [{ forma: 'elipse', x: a.col.cx, y: a.col.cy, w: a.col.rx * 2, h: a.col.ry * 2 }]; const au = s.cat ? null : motorAutoCol(s.key); return au ? [{ forma: 'elipse', x: au.cx, y: au.cy, w: au.rx * 2, h: au.ry * 2 }] : []; }
function motorDibujarSel() {
  const s = MOTOR_SEL.o; if (!s || !S) return;
  if (s.tipo === 'jugador') { const p = S.player, sc = JUG('escala', 1.6) / 1.6; s.x = p.x - 10 * sc; s.y = p.y + 8 - 40 * sc; s.w = 20 * sc; s.h = 42 * sc; }
  const z = view.z, k = z * dpr, ox = Math.round(cw / 2 * dpr - view.x * k), oy = Math.round(ch / 2 * dpr - view.y * k);
  ctx.save(); ctx.setTransform(k, 0, 0, k, ox, oy); ctx.lineWidth = 1.5 / z; ctx.strokeStyle = '#e0b54c'; ctx.setLineDash([4 / z, 3 / z]); ctx.strokeRect(s.x, s.y, s.w, s.h); ctx.setLineDash([]);
  if (s.tipo === 'sprite' && document.getElementById('motorMenu')) { // con el menú abierto se ven sus colisores (el elegido, más grueso)
    motorColsSel(s).forEach((c0, i) => { let c = colEscala(c0, s.k || 1, 1); if (s.flip) c = colEspejo(c); ctx.lineWidth = (i === (MOTOR_SEL.ci || 0) ? 2.5 : 1) / z; ctx.strokeStyle = c.activo === false ? '#888' : c.trigger ? '#3bffd0' : '#ff3b3b'; colTrazar(ctx, c, s.bx, s.by); ctx.stroke(); });
  }
  ctx.restore();
}
{ const r0 = render; render = fdt => { if (MOTOR_VUELO.on) motorVolar(); r0(fdt); motorDebugDraw(); motorDibujarSel(); }; }
function motorVolar() {
  const now = performance.now(), dt = Math.min(0.05, (now - (MOTOR_VUELO.t || now)) / 1000); MOTOR_VUELO.t = now; if (!S) return;
  const K = MOTOR_VUELO.keys; let mx = 0, my = 0; if (K.has('w') || K.has('arrowup')) my--; if (K.has('s') || K.has('arrowdown')) my++; if (K.has('a') || K.has('arrowleft')) mx--; if (K.has('d') || K.has('arrowright')) mx++;
  const p = S.player; P.mvx = P.mvy = 0; P.z = 0; P.vz = 0;
  if (mx || my) { const l = Math.hypot(mx, my), v = (K.has('shift') ? 34 : 14) * T * dt; p.x += mx / l * v; p.y += my / l * v; }
}
function motorVueloSet(on) {
  MOTOR_VUELO.on = on; MOTOR_VUELO.t = 0; MOTOR_VUELO.keys.clear();
  if (typeof keys !== 'undefined') for (const k of ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift']) keys.delete(k);
  toast(on ? '✈ Vuelo libre: rápido, sin choques ni capas (Mayús = más rápido · doble espacio para aterrizar)' : 'Andando normal');
}
// ---------- Menú flotante (clic derecho) ----------
function motorMandar(tipo, key, patch) { // al motor (lo guarda en su borrador) y aquí al momento
  const A = JSON.parse(JSON.stringify(window.AJUSTES || {}));
  if (tipo === 'sprite') { A.sprites = A.sprites || {}; const a = A.sprites[key] = A.sprites[key] || {}; for (const q in patch) { if (patch[q] === null) delete a[q]; else a[q] = patch[q]; } if (!Object.keys(a).length) delete A.sprites[key]; }
  if (tipo === 'cat') { A.suelo = A.suelo || { cats: {}, grounds: {} }; A.suelo.cats = A.suelo.cats || {}; const o = A.suelo.cats[key] = A.suelo.cats[key] || {}; for (const q in patch) { if (patch[q] === null) delete o[q]; else o[q] = patch[q]; } }
  if (tipo === 'jugador') { A.jugador = A.jugador || {}; for (const q in patch) { if (patch[q] === null) delete A.jugador[q]; else A.jugador[q] = patch[q]; } }
  motorAplicar(A);
  try { localStorage.setItem('motor-cambio', JSON.stringify({ tipo, key, cat: key, patch, n: Date.now() })); } catch (e) { }
}
const MOTOR_ARR = { on: false, drag: null }; let MOTOR_CLIP = null;
const MM_FORMAS = { caja: 'Caja', circulo: 'Círculo', capsula: 'Cápsula', elipse: 'Elipse', poligono: 'Polígono' };
const MM_NUEVO = { caja: { forma: 'caja', x: 0, y: -1, w: 16, h: 6 }, circulo: { forma: 'circulo', x: 0, y: -1, r: 6 }, capsula: { forma: 'capsula', x: 0, y: -4, w: 8, h: 14, dir: 'v' }, elipse: { forma: 'elipse', x: 0, y: -1, w: 14, h: 6 } };
function motorColsMandar(s, f) { const L = JSON.parse(JSON.stringify(motorColsSel(s))); f(L); motorMandar('sprite', s.key, { cols: L, col: null }); }
function motorMenu(s, cx, cy) {
  const abiertas = new Set([...(document.querySelectorAll('#motorMenu details[open]'))].map(d => d.dataset.s));
  motorMenuCerrar(); MOTOR_SEL.o = s; const m = document.createElement('div'); m.id = 'motorMenu';
  m.style.cssText = `position:fixed;left:${Math.max(4, Math.min(cx, innerWidth - 290))}px;top:${Math.max(4, Math.min(cy, innerHeight - 120))}px;z-index:9999;width:280px;max-height:${innerHeight - 16}px;overflow:auto;background:#1c1d1f;border:1px solid #b8892e;box-shadow:0 8px 30px #000;font:14px "Taller Pixel",sans-serif;color:#ece6d8;padding:8px`;
  const A = window.AJUSTES, r1 = v => Math.round(v * 100) / 100;
  const fila = (txt, val, botones) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin:3px 0"><span style="color:#a39d8f">${txt}</span><span style="display:flex;gap:3px;align-items:center"><b style="font-weight:normal;min-width:30px;text-align:right">${val}</b>${botones}</span></div>`;
  const bt = (act, t, tit = '', on) => `<button data-a="${act}" title="${tit}" style="background:${on ? '#3b2f12' : '#232427'};border:1px solid ${on ? '#b8892e' : '#3a3a37'};color:${on ? '#e0b54c' : '#ece6d8'};font:inherit;padding:1px 7px;cursor:pointer">${t}</button>`;
  const sec = (id, tit, html, abierto) => `<details data-s="${id}" ${abiertas.has(id) || (abierto && !abiertas.size) ? 'open' : ''} style="border-top:1px solid #2c2d30;margin-top:4px;padding-top:3px"><summary style="cursor:pointer;color:#e0b54c">${tit}</summary>${html}</details>`;
  let h = '';
  if (s.tipo === 'jugador') {
    const j = A.jugador || {}, v = (k, d) => j[k] ?? d;
    h = `<div style="color:#e0b54c;margin-bottom:4px">Jugador</div>`
      + sec('mov', 'Movimiento', fila('Andar', v('andar', 3.3), bt('j:andar:-0.2', '−') + bt('j:andar:0.2', '+')) + fila('Correr', v('correr', 5.6), bt('j:correr:-0.2', '−') + bt('j:correr:0.2', '+')) + fila('Agarre', v('agarre', 1), bt('j:agarre:-0.1', '−') + bt('j:agarre:0.1', '+')) + fila('Nado', v('nado', 1), bt('j:nado:-0.1', '−') + bt('j:nado:0.1', '+')), true)
      + sec('sal', 'Salto y caída', fila('Salto', v('salto', 175), bt('j:salto:-15', '−') + bt('j:salto:15', '+')) + fila('Gravedad', v('gravedad', 900), bt('j:gravedad:-50', '−') + bt('j:gravedad:50', '+')))
      + sec('cho', 'Choque y orden', fila('Medio ancho', v('choqueAncho', 5), bt('j:choqueAncho:-0.5', '−') + bt('j:choqueAncho:0.5', '+')) + fila('Pies', v('choquePie', 5), bt('j:choquePie:-0.5', '↑') + bt('j:choquePie:0.5', '↓')) + fila('Centro', v('choqueCentro', 1), bt('j:choqueCentro:-0.5', '↑') + bt('j:choqueCentro:0.5', '↓')) + fila('Línea de orden', v('orden', 8), bt('j:orden:-0.5', '↑') + bt('j:orden:0.5', '↓')))
      + sec('dib', 'Dibujo y alcance', fila('Tamaño', v('escala', 1.6), bt('j:escala:-0.1', '−') + bt('j:escala:0.1', '+')) + fila('Alcance', v('alcance', 5.5), bt('j:alcance:-0.5', '−') + bt('j:alcance:0.5', '+')))
      + `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">${bt('jreset', 'Todo de serie')}${bt('dbg', MOTOR_DBG ? 'Ocultar choques' : 'Ver choques', '', MOTOR_DBG)}${bt('irj', 'Abrir en el motor ↗')}</div>`;
  } else {
    const a = (A.sprites || {})[s.key] || {}, cat = s.cat, cv = cat ? ((A.suelo || {}).cats || {})[cat] || {} : null, L = motorColsSel(s), modo = Array.isArray(a.cols) || a.col ? 'propios' : a.col === false ? 'ninguno' : cat ? 'ninguno' : 'auto';
    const ci = MOTOR_SEL.ci = Math.min(MOTOR_SEL.ci || 0, Math.max(0, L.length - 1)), c = L[ci];
    h = `<div style="color:#e0b54c">${s.key}</div><div style="color:#a39d8f;font-size:12px;margin-bottom:4px">${cat ? 'Suelo · ' + cat : 'Árbol'} · casilla ${s.tx}, ${s.ty}</div>`
      + sec('dib', 'Dibujo', fila('Escala', r1(a.esc || 1), bt('s:esc:-0.05', '−') + bt('s:esc:0.05', '+')) + fila('Mover X', r1(a.dx || 0), bt('s:dx:-0.5', '←') + bt('s:dx:0.5', '→')) + fila('Mover Y', r1(a.dy || 0), bt('s:dy:-0.5', '↑') + bt('s:dy:0.5', '↓'))
        + fila('Línea de orden', r1(a.orden || 0), bt('s:orden:-1', '↑') + bt('s:orden:1', '↓')) + fila('Viento', r1(a.viento ?? 1), bt('s:viento:-0.1', '−') + bt('s:viento:0.1', '+')), true)
      + sec('col', `Colisores <span style="color:#a39d8f;font-size:12px">(${modo === 'auto' ? 'automático' : modo === 'ninguno' ? 'ninguno' : L.length})</span>`,
        `<div style="display:flex;gap:3px;flex-wrap:wrap;margin:4px 0">${Object.keys(MM_NUEVO).map(f => bt('add:' + f, '+ ' + MM_FORMAS[f])).join('')}</div>`
        + (L.length ? `<div style="display:flex;gap:3px;flex-wrap:wrap;margin:4px 0">${L.map((x, i) => bt('ci:' + i, `${i + 1}. ${MM_FORMAS[x.forma] || x.forma}${x.trigger ? ' ⚡' : ''}`, '', i === ci)).join('')}</div>` : '')
        + (c ? fila('Mover', `${r1(c.x || 0)}, ${r1(c.y || 0)}`, bt('c:x:-0.5', '←') + bt('c:x:0.5', '→') + bt('c:y:-0.5', '↑') + bt('c:y:0.5', '↓'))
          + (c.forma === 'circulo' ? fila('Radio', r1(c.r), bt('c:r:-0.5', '−') + bt('c:r:0.5', '+')) : c.forma === 'poligono' ? '' : fila('Ancho', r1(c.w), bt('c:w:-1', '−') + bt('c:w:1', '+')) + fila('Alto', r1(c.h), bt('c:h:-0.5', '−') + bt('c:h:0.5', '+')))
          + (c.forma === 'circulo' || c.forma === 'poligono' ? '' : fila('Rotación', (c.rot || 0) + '°', bt('c:rot:-15', '⟲') + bt('c:rot:15', '⟳')))
          + `<div style="display:flex;gap:3px;flex-wrap:wrap;margin:4px 0">${bt('arr', '✥ Arrastrar con el ratón', 'Arrastra en el mundo para moverlo; con Mayús cambia el tamaño', MOTOR_ARR.on)}${bt('trig', c.trigger ? 'Trigger: sí' : 'Trigger: no', '', !!c.trigger)}${bt('act', c.activo === false ? 'Desactivado' : 'Activo', '', c.activo !== false)}${bt('cdel', 'Quitar')}</div>` : '')
        + `<div style="display:flex;gap:3px;flex-wrap:wrap;margin:4px 0">${cat ? '' : bt('cauto', 'Automático', '', modo === 'auto')}${bt('cnone', 'Sin colisores', '', modo === 'ninguno' && !cat)}</div>`, MOTOR_ARR.on)
      + (cat ? sec('cat', `Categoría «${cat}»`, fila('Se levanta', cv.up === false ? 'no' : cv.up === true ? 'sí' : 'de serie', bt('up', 'cambiar')) + fila('Píxel', cv.px || 'de serie', bt('px', '1 / 1,6')) + fila('Peso en este suelo', '', bt('peso:-0.5', '−') + bt('peso:0.5', '+'))) : sec('bio', 'Dónde sale', fila('Densidad en este bioma', '', bt('dens:-0.01', '−') + bt('dens:0.01', '+'))))
      + sec('mas', 'Más', `<div style="display:flex;gap:3px;flex-wrap:wrap;margin:4px 0">${bt('copiar', 'Copiar ajustes')}${bt('pegar', 'Pegar ajustes', MOTOR_CLIP ? '' : 'Primero copia los de otro')}${bt('todas', 'Aplicar a todo el tipo')}${bt('pintar', '✎ Editar píxeles ↗')}${cat ? '' : bt('otro', 'Poner otro al lado')}${bt('quitar', 'Quitar del mundo')}${bt('oculto', a.oculto ? 'Mostrar en el juego' : 'Ocultar en el juego')}${bt('reset', 'Todo de serie')}</div>`)
      + `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">${bt('dbg', MOTOR_DBG ? 'Ocultar choques' : 'Ver choques', '', MOTOR_DBG)}${bt('ir', 'Abrir en el motor ↗', 'Todo lo demás: colisores con asas, biomas, píxeles…')}</div>`;
  }
  h += `<div style="color:#6e6a62;font-size:11px;margin-top:6px">Se guarda solo en el borrador del motor · se publica desde el motor.</div>`;
  m.innerHTML = h; document.body.appendChild(m);
  m.addEventListener('mousedown', e => e.stopPropagation()); m.addEventListener('contextmenu', e => e.preventDefault());
  // se desplaza con la rueda (sin barra visible) y la rueda no hace zoom en el juego mientras estás encima
  if (!document.getElementById('motorMenuCss')) { const st2 = document.createElement('style'); st2.id = 'motorMenuCss'; st2.textContent = '#motorMenu{scrollbar-width:none;-ms-overflow-style:none;overscroll-behavior:contain}#motorMenu::-webkit-scrollbar{display:none;width:0;height:0}'; document.head.appendChild(st2); }
  m.addEventListener('wheel', e => { e.stopPropagation(); m.scrollTop += e.deltaY; e.preventDefault(); }, { passive: false });
  m.scrollTop = window._motorMenuScroll || 0; m.addEventListener('scroll', () => { window._motorMenuScroll = m.scrollTop; });
  m.querySelectorAll('details').forEach(d => d.addEventListener('toggle', () => {}));
  m.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const act = b.dataset.a, a = ((window.AJUSTES.sprites || {})[s.key]) || {}, num = v => Math.round(v * 100) / 100;
    if (act.startsWith('s:')) { const [, q, d] = act.split(':'), def = q === 'esc' || q === 'viento' ? 1 : 0, nv = num((a[q] ?? def) + +d); motorMandar('sprite', s.key, { [q]: q === 'esc' ? Math.max(0.1, nv) : q === 'viento' ? Math.max(0, nv) : nv }); }
    else if (act.startsWith('add:')) motorColsMandar(s, L => { L.push(JSON.parse(JSON.stringify(MM_NUEVO[act.slice(4)]))); MOTOR_SEL.ci = L.length - 1; });
    else if (act.startsWith('ci:')) MOTOR_SEL.ci = +act.slice(3);
    else if (act.startsWith('c:')) { const [, q, d] = act.split(':'); motorColsMandar(s, L => { const c = L[MOTOR_SEL.ci || 0]; if (!c) return; if (q === 'rot') { let r = (c.rot || 0) + +d; r = ((r + 180) % 360 + 360) % 360 - 180; c.rot = r || undefined; } else { c[q] = num((c[q] || 0) + +d); if (q === 'w' || q === 'h' || q === 'r') c[q] = Math.max(1, c[q]); } }); }
    else if (act === 'trig') motorColsMandar(s, L => { const c = L[MOTOR_SEL.ci || 0]; if (c) c.trigger = c.trigger ? undefined : true; });
    else if (act === 'act') motorColsMandar(s, L => { const c = L[MOTOR_SEL.ci || 0]; if (c) c.activo = c.activo === false ? undefined : false; });
    else if (act === 'cdel') motorColsMandar(s, L => { L.splice(MOTOR_SEL.ci || 0, 1); MOTOR_SEL.ci = 0; });
    else if (act === 'cauto') motorMandar('sprite', s.key, { cols: null, col: null });
    else if (act === 'cnone') motorMandar('sprite', s.key, { cols: [], col: null });
    else if (act === 'arr') { MOTOR_ARR.on = !MOTOR_ARR.on; if (MOTOR_ARR.on && !motorColsSel(s).length) motorColsMandar(s, L => L.push(JSON.parse(JSON.stringify(MM_NUEVO.elipse)))); toast(MOTOR_ARR.on ? 'Arrastra en el mundo para mover el colisor (Mayús: tamaño)' : 'Arrastrar: desactivado'); }
    else if (act.startsWith('j:')) { const [, q, d] = act.split(':'), j = window.AJUSTES.jugador || {}, defs = { andar: 3.3, correr: 5.6, agarre: 1, nado: 1, salto: 175, gravedad: 900, choqueAncho: 5, choquePie: 5, choqueCentro: 1, orden: 8, escala: 1.6, alcance: 5.5 }; const nv = num((j[q] ?? defs[q]) + +d); motorMandar('jugador', null, { [q]: ['choquePie', 'choqueCentro', 'orden'].includes(q) ? nv : Math.max(0.1, nv) }); }
    else if (act === 'jreset') { const z = {}; for (const k in (window.AJUSTES.jugador || {})) z[k] = null; motorMandar('jugador', null, z); }
    else if (act === 'oculto') motorMandar('sprite', s.key, { oculto: a.oculto ? null : true });
    else if (act === 'reset') motorMandar('sprite', s.key, { esc: null, dx: null, dy: null, orden: null, viento: null, col: null, cols: null, oculto: null });
    else if (act === 'up') { const c = ((window.AJUSTES.suelo || {}).cats || {})[s.cat] || {}; motorMandar('cat', s.cat, { up: c.up === undefined ? true : c.up === true ? false : null }); }
    else if (act === 'px') { const c = ((window.AJUSTES.suelo || {}).cats || {})[s.cat] || {}; motorMandar('cat', s.cat, { px: c.px === 1 ? 1.6 : c.px === 1.6 ? null : 1 }); }
    else if (act.startsWith('peso:')) { motorAviso('suelo', { suelo: GI[gnd(s.tx, s.ty)].key, cat: s.cat, delta: +act.slice(5) }); toast('Peso cambiado en el motor (se nota en el terreno nuevo y al recargar)'); }
    else if (act.startsWith('dens:')) { const b = BIOMES[biomeOf(s.tx, s.ty)]; motorAviso('bioma', { bioma: b && b.key, arbol: GI[s.t].key, delta: +act.slice(5) }); toast(`Densidad en ${b ? b.n : 'el bioma'} cambiada en el motor (terreno nuevo)`); }
    else if (act === 'copiar') { MOTOR_CLIP = JSON.parse(JSON.stringify(a)); delete MOTOR_CLIP.oculto; toast('Ajustes copiados'); }
    else if (act === 'pegar') { if (!MOTOR_CLIP) return toast('Primero copia los de otro sprite'); const pt = { esc: null, dx: null, dy: null, orden: null, viento: null, col: null, cols: null }; for (const q in MOTOR_CLIP) pt[q] = MOTOR_CLIP[q]; motorMandar('sprite', s.key, pt); }
    else if (act === 'todas') { if (!confirm(`¿Copiar los ajustes de ${s.key} a todas las imágenes de su tipo? (se puede deshacer en el motor)`)) return; motorAviso('todas', { key: s.key }); }
    else if (act === 'pintar') { try { localStorage.setItem('motor-ir', JSON.stringify({ key: s.key, pintar: 1, n: Date.now() })); } catch (e) { } toast('Abierto en el editor de píxeles del motor'); }
    else if (act === 'otro') { for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [-2, 2]]) { const x = s.tx + dx, y = s.ty + dy, g2 = GI[gnd(x, y)]; if (!g2.solid && !g2.liquid && !g2.tree && !at(x, y)) { setGround(x, y, s.t, GI[s.t].hp || 0); toast('Otro igual al lado'); break; } } }
    else if (act === 'quitar') { if (s.cat) { S.picked = S.picked || {}; S.picked['g' + s.tx + ',' + s.ty] = 1; if (typeof _gdCache !== 'undefined') _gdCache.clear(); } else { const g = GI[s.t]; setGround(s.tx, s.ty, g.u >= 0 ? g.u : G.GRASS, 0); } motorMenuCerrar(); MOTOR_SEL.o = null; return; }
    else if (act === 'dbg') MOTOR_DBG = !MOTOR_DBG;
    else if (act === 'ir' || act === 'irj') { try { localStorage.setItem('motor-ir', JSON.stringify(act === 'irj' ? { jugador: 1, n: Date.now() } : { key: s.key, n: Date.now() })); } catch (e) { } toast('Abierto en el motor (en su pestaña)'); }
    const r = m.getBoundingClientRect(); motorMenu(s, r.left, r.top); // se rehace con los valores nuevos
  });
}
function motorAviso(tipo, datos) { try { localStorage.setItem('motor-cambio', JSON.stringify({ tipo, ...datos, n: Date.now() })); } catch (e) { } }
const _motorAuto = new Map();
function motorAutoCol(key) { // choque automático (de serie) de un árbol, para pasar a «propio» y retocarlo (se guarda: no se recalcula en cada fotograma)
  if (_motorAuto.has(key)) return _motorAuto.get(key); const r = motorAutoCol0(key); _motorAuto.set(key, r); return r;
}
function motorAutoCol0(key) {
  const set = CSPR.sets.get(key); if (!set) return null; const im = csShadowFix(set.raw); im.__key = key; const s = csTreeMake(im, 0, 1, {}); return s.col ? { cx: Math.round(s.col.cx * 10) / 10, cy: Math.round(s.col.cy * 10) / 10, rx: Math.round(s.col.rx * 10) / 10, ry: Math.round(s.col.ry * 10) / 10 } : null;
}
function motorMenuCerrar() { const m = document.getElementById('motorMenu'); if (m) m.remove(); }

if (MOTOR_PRUEBA) {
  const Q = k => MOTOR_Q.get(k), sprite = Q('sprite') || '', suelo = Q('suelo') || 'GRASS', mundo = Q('mundo') || 'prueba', solo = Q('solo') === '1';
  const TAM = Math.max(3, Math.min(31, +Q('tam') || 7)), COPIAS = Math.max(1, Math.min(25, +Q('copias') || 1)), HORA = Q('hora') || '', CLIMA = Q('clima') || '';
  MOTOR_DBG = Q('choques') === '1';
  if (solo && sprite) window.MOTOR_SOLO = sprite;
  const propio = mundo === 'prueba' || mundo === 'nuevo';
  // un mundo tuyo que trajiste al motor no se toca; el de prueba sí se guarda (solo existe en el motor)
  if (!propio) { saveGame = () => true; saveIndex = () => true; }
  // el motor manda cada cambio al momento: se aplica sin recargar
  addEventListener('storage', e => { if (e.key !== 'motor-ajustes' || !e.newValue) return; try { motorAplicar(JSON.parse(e.newValue)); } catch (er) { console.warn(er); } });
  const escribiendo = () => { const a = document.activeElement; return (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) || (typeof CHAT !== 'undefined' && CHAT.open); };
  addEventListener('keydown', e => {
    if (!S || escribiendo()) return; const k = e.key.toLowerCase();
    if ((k === 'c') && !e.ctrlKey) { MOTOR_DBG = !MOTOR_DBG; toast(MOTOR_DBG ? 'Choques (rojo) y líneas de orden (azul) visibles' : 'Choques ocultos'); return; }
    if (k === 'escape') motorMenuCerrar();
    if (e.code === 'Space') { const now = performance.now(); if (!e.repeat && now - MOTOR_VUELO.lastSpace < 320) { motorVueloSet(!MOTOR_VUELO.on); MOTOR_VUELO.lastSpace = 0; } else if (!e.repeat) MOTOR_VUELO.lastSpace = now; if (MOTOR_VUELO.on) { e.preventDefault(); e.stopImmediatePropagation(); } return; }
    if (MOTOR_VUELO.on && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) { MOTOR_VUELO.keys.add(k); e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  addEventListener('keyup', e => { const k = e.key.toLowerCase(); if (MOTOR_VUELO.keys.has(k)) { MOTOR_VUELO.keys.delete(k); e.stopImmediatePropagation(); } if (MOTOR_VUELO.on && e.code === 'Space') e.stopImmediatePropagation(); }, true);
  addEventListener('blur', () => MOTOR_VUELO.keys.clear());
  // doble clic: seleccionar · clic derecho: menú de ajustes
  addEventListener('dblclick', e => { if (!S || e.target.id !== 'c') return; const w = mouseWorld(), L = motorRects(w.x, w.y); MOTOR_SEL.o = L[0] || null; if (L[0]) toast(L[0].tipo === 'jugador' ? 'Jugador seleccionado (clic derecho: ajustes)' : `${L[0].key} seleccionado (clic derecho: ajustes)`); }, true);
  addEventListener('mousedown', e => {
    if (!S) return;
    if (MOTOR_ARR.on && e.button === 0 && e.target.id === 'c' && MOTOR_SEL.o && MOTOR_SEL.o.tipo === 'sprite') { const w = mouseWorld(), L = motorColsSel(MOTOR_SEL.o), c = L[MOTOR_SEL.ci || 0]; if (c) { MOTOR_ARR.drag = { x: w.x, y: w.y, base: JSON.parse(JSON.stringify(c)), shift: e.shiftKey }; e.preventDefault(); e.stopImmediatePropagation(); return; } }
    if (!e.target.closest || !e.target.closest('#motorMenu')) { if (e.button !== 2) motorMenuCerrar(); }
    if (e.button !== 2 || e.target.id !== 'c') return; const w = mouseWorld(), L = motorRects(w.x, w.y), s = L[0] || (MOTOR_SEL.o && L.find(x => x.key === MOTOR_SEL.o.key));
    if (!s) return; e.preventDefault(); e.stopImmediatePropagation(); window._motorMenuScroll = 0; motorMenu(s, e.clientX + 6, e.clientY + 6);
  }, true);
  addEventListener('contextmenu', e => { if (e.target.id === 'c' && document.getElementById('motorMenu')) e.preventDefault(); }, true);
  addEventListener('mousemove', e => { const d = MOTOR_ARR.drag, s0 = MOTOR_SEL.o; if (!d || !s0) return; const w = mouseWorld(), m = s0.flip ? -1 : 1, k = s0.k || 1, dx = (w.x - d.x) / k * m, dy = (w.y - d.y) / k, q = v => Math.round(v * 2) / 2;
    const L = JSON.parse(JSON.stringify(motorColsSel(s0))), c = L[MOTOR_SEL.ci || 0]; if (!c) return; const B = d.base;
    if (d.shift) { if (c.forma === 'circulo') c.r = Math.max(1, q(B.r + dx)); else if (c.forma !== 'poligono') { c.w = Math.max(1, q(B.w + dx * 2)); c.h = Math.max(1, q(B.h + dy * 2)); } }
    else { c.x = q((B.x || 0) + dx); c.y = q((B.y || 0) + dy); }
    const A = JSON.parse(JSON.stringify(window.AJUSTES || {})); A.sprites = A.sprites || {}; const a = A.sprites[s0.key] = A.sprites[s0.key] || {}; a.cols = L; delete a.col; motorAplicar(A); }, true);
  addEventListener('mouseup', () => { const d = MOTOR_ARR.drag, s0 = MOTOR_SEL.o; if (!d) return; MOTOR_ARR.drag = null; if (s0) { motorMandar('sprite', s0.key, { cols: motorColsSel(s0), col: null }); const mm = document.getElementById('motorMenu'); if (mm) { const r = mm.getBoundingClientRect(); motorMenu(s0, r.left, r.top); } } }, true);
  // el cuadrado de prueba: suelo elegido y el sprite en el centro (o varias copias repartidas)
  const arena = { cx: 0, cy: 0, r: 0, cat: null, sitios: new Set() };
  function motorArena() {
    const px = Math.floor(S.player.x / T), py = Math.floor(S.player.y / T), gt = G[suelo] !== undefined ? G[suelo] : G.GRASS, h = TAM >> 1, cx = px, cy = py - h - 2;
    arena.cx = cx; arena.cy = cy; arena.r = h;
    for (let y = cy - h; y <= cy + h; y++) for (let x = cx - h; x <= cx + h; x++) { const b = at(x, y); if (b && typeof delBlock === 'function') delBlock(b); setGround(x, y, gt, GI[gt].hp || 0); }
    // sitios para las copias: el centro y, si hay más, en rejilla de 2 en 2 alrededor
    const sitios = [[cx, cy]]; for (let r = 2; sitios.length < COPIAS && r <= h; r += 2) for (let dy = -r; dy <= r && sitios.length < COPIAS; dy += 2) for (let dx = -r; dx <= r && sitios.length < COPIAS; dx += 2) if (Math.max(Math.abs(dx), Math.abs(dy)) === r) sitios.push([cx + dx, cy + dy]);
    arena.sitios = new Set(sitios.map(([x, y]) => x + ',' + y));
    if (sprite.startsWith('arboles/')) { const slug = sprite.slice(8).replace(/_\d+$/, ''), t = GI.findIndex(g => g && g.tree && _cslug(g.n) === slug); if (t >= 0) for (const [x, y] of sitios) setGround(x, y, t, GI[t].hp || 0); }
    else if (sprite.startsWith('suelo/')) arena.cat = sprite.slice(6).replace(/_?\d+$/, '');
    if (typeof _gdCache !== 'undefined') _gdCache.clear();
  }
  { const z0 = gdAt00; gdAt00 = (tx, ty) => {
    if (arena.r && Math.abs(tx - arena.cx) <= arena.r && Math.abs(ty - arena.cy) <= arena.r) { if (arena.cat && arena.sitios.has(tx + ',' + ty)) return gdPiece(tx, ty, arena.cat, 0, 16, 24); return null; } // dentro del cuadrado, solo lo que pruebas
    return z0(tx, ty);
  }; }
  const pf0 = playerFree; playerFree = (x, y) => MOTOR_VUELO.on || pf0(x, y); // volando no choca con nada
  function entrar() {
    try {
      if (typeof activeChar === 'function' && !activeChar() && typeof PF !== 'undefined') { let c = PF.list.find(c => c.id === 'motor-prueba'); if (!c) { c = { id: 'motor-prueba', name: 'Probador', char: { name: 'Probador', look: { ...DEFAULT_LOOK }, prof: 'vagabond', traits: [], made: true }, worlds: {} }; PF.list.push(c); } PF.active = c.id; }
      if (!propio) { if (!loadWorld(mundo)) { toast('Ese mundo ya no está en el motor', true); return; } enterWorld(); }
      else if (mundo === 'prueba' && loadWorld('motor-mundo')) enterWorld();
      else { newGame({ seed: (Math.random() * 1e9) | 0 }, { name: 'Mundo de prueba del motor', kit: 'empty', alwaysDay: false, sandbox: true }); currentWorld = 'motor-mundo'; charData(); S.char.made = true; S.cheats = true; S.created = Date.now(); enterWorld(); }
      S.cheats = true; if (typeof CMDS !== 'undefined' && CMDS.modo && propio) { try { CMDS.modo.run(['creativo'], 'modo creativo'); } catch (e) { } }
      if (sprite) motorArena();
      if (HORA) { const hh = { dia: 12, amanecer: 6.5, atardecer: 18.5, noche: 0 }[HORA]; if (hh !== undefined) setHour(hh); }
      if (CLIMA && typeof CMDS !== 'undefined' && CMDS.clima) { try { CMDS.clima.run([CLIMA], 'clima ' + CLIMA); } catch (e) { } }
      view.z = Math.max(view.z, 1.6); if (Q('vuelo') === '1') motorVueloSet(true);
      if (propio) saveGame(true);
      toast('Mundo de prueba · doble espacio: volar · doble clic: seleccionar · clic derecho: ajustes · C: choques');
    } catch (e) { console.error('motor prueba', e); toast('No se pudo montar la prueba: ' + e.message, true); }
  }
  addEventListener('load', () => setTimeout(entrar, 300));
}
