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
// Vuelve a aplicar todo (cambios en vivo): se vacían las memorias de árboles y objetos del suelo
function motorRefresh() {
  try {
    motorApply(); _csTreeSpr.clear(); _csTreeImgs.clear(); _gd = null; _motorGd = null; _gdPick.clear(); _gdCache.clear();
    if (typeof _gdPatchT !== 'undefined') _gdPatchT.clear();
  } catch (e) { console.warn('motor: no se pudieron aplicar los cambios', e); }
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
      if (s.col) { ctx.strokeStyle = '#ff3b3b'; ctx.beginPath(); ctx.ellipse(bx + s.col.cx, by + s.col.cy, s.col.rx, s.col.ry, 0, 0, 7); ctx.stroke(); }
      ctx.strokeStyle = '#3bc8ff'; ctx.beginPath(); ctx.moveTo(bx - 14, by + (s.sortDy || 0)); ctx.lineTo(bx + 14, by + (s.sortDy || 0)); ctx.stroke(); }
    const o0 = typeof gdAt === 'function' && gdAt(tx, ty);
    if (o0) for (const o of o0.group || [o0]) { if (!o.up) continue; const cx = o.px + o.w / 2;
      ctx.strokeStyle = '#3bc8ff'; ctx.beginPath(); ctx.moveTo(cx - o.w / 2, o.py + (o.sortDy || 0)); ctx.lineTo(cx + o.w / 2, o.py + (o.sortDy || 0)); ctx.stroke();
      if (o.col) { ctx.strokeStyle = '#ff3b3b'; ctx.beginPath(); ctx.ellipse(cx + o.col.cx * (o.flip ? -1 : 1), o.py + o.col.cy, o.col.rx, o.col.ry, 0, 0, 7); ctx.stroke(); } }
  }
  const p = S.player; ctx.strokeStyle = '#ffe14a'; ctx.beginPath(); ctx.moveTo(p.x - 10, p.y + 8); ctx.lineTo(p.x + 10, p.y + 8); ctx.stroke(); // tus pies (lo que se compara con las líneas)
  ctx.restore();
}
{ const r0 = render; render = fdt => { r0(fdt); motorDebugDraw(); }; }

// ---------- Modo prueba ----------
if (MOTOR_PRUEBA) {
  const sprite = MOTOR_Q.get('sprite') || '', suelo = MOTOR_Q.get('suelo') || 'GRASS', mundo = MOTOR_Q.get('mundo') || 'nuevo', solo = MOTOR_Q.get('solo') === '1';
  if (solo && sprite) window.MOTOR_SOLO = sprite;
  // nunca se guarda nada: ni el mundo de prueba ni cambios en un mundo existente
  saveGame = () => true; saveIndex = () => true;
  // el motor manda cada cambio al momento: se aplica sin recargar
  addEventListener('storage', e => { if (e.key !== 'motor-ajustes' || !e.newValue) return; try { window.AJUSTES = JSON.parse(e.newValue); motorRefresh(); if (window.MOTOR_SOLO !== undefined) { } toast('Cambios del motor aplicados'); } catch (er) { console.warn(er); } });
  addEventListener('keydown', e => { if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) { MOTOR_DBG = !MOTOR_DBG; toast(MOTOR_DBG ? 'Choques (rojo) y líneas de orden (azul) visibles' : 'Choques ocultos'); } });
  const arena = { cx: 0, cy: 0, r: 0, cat: null };
  function motorArena() {
    const px = Math.floor(S.player.x / T), py = Math.floor(S.player.y / T), gt = G[suelo] !== undefined ? G[suelo] : G.GRASS, R = 9;
    arena.cx = px; arena.cy = py; arena.r = R;
    for (let y = py - R; y <= py + R; y++) for (let x = px - R; x <= px + R; x++) if ((x - px) ** 2 + (y - py) ** 2 <= R * R) { { const b = at(x, y); if (b && typeof delBlock === 'function') delBlock(b); } setGround(x, y, gt, GI[gt].hp || 0); }
    if (sprite.startsWith('arboles/')) {
      const slug = sprite.slice(8).replace(/_\d+$/, ''), t = GI.findIndex(g => g && g.tree && _cslug(g.n) === slug);
      if (t >= 0) for (const [dx, dy] of [[-4, -3], [3, -3], [0, -5], [-5, 2], [4, 2], [0, 5], [-2, 1], [6, -1]]) setGround(px + dx, py + dy, t, GI[t].hp || 0);
    } else if (sprite.startsWith('suelo/')) arena.cat = sprite.slice(6).replace(/_?\d+$/, '');
    if (typeof _gdCache !== 'undefined') _gdCache.clear();
  }
  // en el mundo pequeño, el objeto del suelo elegido sale en casillas salteadas (y nada más, para verlo bien)
  { const z0 = gdAt00; gdAt00 = (tx, ty) => {
    if (arena.cat && (tx - arena.cx) ** 2 + (ty - arena.cy) ** 2 <= arena.r * arena.r) {
      if (((tx + ty) & 1) || (tx === arena.cx && ty === arena.cy)) return null;
      return gdPiece(tx, ty, arena.cat, 0, 16, 24);
    }
    return z0(tx, ty);
  }; }
  addEventListener('load', () => setTimeout(() => {
    try {
      // hace falta un personaje elegido: si no hay, uno de prueba (solo en este navegador del motor)
      if (typeof activeChar === 'function' && !activeChar() && typeof PF !== 'undefined') { let c = PF.list.find(c => c.id === 'motor-prueba'); if (!c) { c = { id: 'motor-prueba', name: 'Probador', char: { name: 'Probador', look: { ...DEFAULT_LOOK }, prof: 'vagabond', traits: [], made: true }, worlds: {} }; PF.list.push(c); } PF.active = c.id; }
      if (mundo !== 'nuevo' && loadWorld(mundo)) { enterWorld(); toast('Modo prueba: este mundo no se guarda. C = ver choques'); return; }
      newGame({ seed: (Math.random() * 1e9) | 0 }, { name: 'Prueba del motor', kit: 'empty', alwaysDay: true, sandbox: true });
      currentWorld = 'motor-prueba'; charData(); S.char.made = true; S.cheats = true;
      enterWorld(); motorArena(); view.z = Math.max(view.z, 1.6);
      toast('Modo prueba del motor: no se guarda nada. C = ver choques y líneas de orden');
    } catch (e) { console.error('motor prueba', e); }
  }, 400));
}
