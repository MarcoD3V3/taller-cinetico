'use strict';
// =====================================================================================
//  Jugar solo con el teclado (sin ratón):
//   · Flechas: mirar / apuntar. Un toque gira hacia ese lado; si la mantienes, caminas (como antes).
//     Se pueden combinar (↑+→ = diagonal). WASD sigue moviendo sin cambiar a dónde apuntas.
//   · Intro: picar / talar / atacar / quitar bloques (mantener).
//   · Shift derecho: poner el bloque o el suelo que tienes en la mano. Si llevas otra cosa, la usa (como F).
//  Apunta solo de forma inteligente:
//   · Para picar elige lo más cercano que se pueda romper hacia donde miras (bloque, roca, mena, árbol,
//     planta) y, si hay un enemigo o un animal delante, va a por él. No cava el suelo si hay algo mejor.
//   · Para poner busca la casilla libre más cercana delante de ti (o a los lados si delante no se puede);
//     las cintas y ejes se orientan solos hacia donde miras.
//  Teclado numérico: 7 8 9 / 4 6 / 1 2 3 apuntan (8 direcciones), 5 o su Intro pican, 0 pone.
//  Al mover el ratón vuelve el control normal. El chat pasa a la tecla Y (o / para comandos).
// =====================================================================================
const TEC = { on: false, dx: 1, dy: 0, t0: {}, enter: false, place: false, placeT: 0, tgt: null, wx: 0, wy: 0, rmx: -1, rmy: -1, lastTile: '' };
const TEC_FLECHAS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'], TEC_TOQUE = 220; // ms: menos que esto = solo girar
const tecAng = () => Math.atan2(TEC.dy, TEC.dx);
function tecDirDeFlechas() {
  let x = 0, y = 0; if (keys.has('arrowleft')) x--; if (keys.has('arrowright')) x++; if (keys.has('arrowup')) y--; if (keys.has('arrowdown')) y++;
  if (x || y) { const l = Math.hypot(x, y); TEC.dx = x / l; TEC.dy = y / l; }
}
// ---------- ¿Qué se puede picar en esta casilla? (0 = nada, 1 = suelo, 2 = algo de verdad) ----------
function tecPicable(x, y) {
  const b = at(x, y); if (b) return b.type === 'core' ? 0 : 2;
  const gi = GI[gnd(x, y)]; if (!gi || !gi.drop || isLiquid(gnd(x, y))) return 0;
  if (gi.floorK) return 1; // suelos puestos (ladrillo, tablones…): solo si no hay nada mejor
  if (gi.tree || gi.plant || gi.flora || gi.solid || tileClass(gi) === 'rock') return 2;
  return 1;
}
const tecAlcance = () => (typeof JUG === 'function' ? JUG('alcance', REACH) : REACH);
const tecJugTile = () => ({ x: Math.floor(S.player.x / T), y: Math.floor(S.player.y / T) });
// Ángulo entre lo que miras y una casilla (0 = justo delante)
function tecDesvio(x, y) { const p = S.player, vx = (x + 0.5) * T - p.x, vy = (y + 0.5) * T - p.y, l = Math.hypot(vx, vy) || 1; return Math.acos(clamp((vx * TEC.dx + vy * TEC.dy) / l, -1, 1)); }
// Objetivo para picar: { wx, wy, tx, ty }
function tecObjetivoPicar() {
  const p = S.player, R = tecAlcance();
  // Enemigo o animal delante
  try {
    const fx = p.x + TEC.dx * T, fy = p.y + TEC.dy * T;
    const f = typeof nearestFoe === 'function' ? nearestFoe(fx, fy, T * 1.6) : null;
    if (f) return { wx: f.x, wy: f.y, tx: Math.floor(f.x / T), ty: Math.floor(f.y / T) };
    const an = typeof animalAt === 'function' ? animalAt(fx, fy, 6) : null;
    if (an) return { wx: an.x, wy: an.y, tx: Math.floor(an.x / T), ty: Math.floor(an.y / T) };
  } catch (e) { }
  const c = tecJugTile(), r = Math.ceil(R); let best = null, bs = 1e9;
  for (let y = c.y - r; y <= c.y + r; y++) for (let x = c.x - r; x <= c.x + r; x++) {
    if (!inReach(x, y)) continue; const k = tecPicable(x, y); if (k < 2) continue;
    const dv = tecDesvio(x, y); if (dv > 1.05 && !(x === c.x && y === c.y)) continue; // ~60º a cada lado
    const d = Math.hypot((x + 0.5) * T - p.x, (y + 0.5) * T - p.y) / T, s = d + dv * 2.2 - (x === TEC_ult.x && y === TEC_ult.y ? 0.6 : 0); // sigue con lo que ya picabas
    if (s < bs) { bs = s; best = { x, y }; }
  }
  if (!best) best = { x: Math.floor((p.x + TEC.dx * T * 0.9) / T), y: Math.floor((p.y + TEC.dy * T * 0.9) / T) }; // nada: la casilla de delante
  return { wx: (best.x + 0.5) * T, wy: (best.y + 0.5) * T, tx: best.x, ty: best.y };
}
const TEC_ult = { x: -1e9, y: -1e9 };
// Casillas para poner, en orden de preferencia: delante, delante-lejos, y luego alrededor según lo que miras
function tecCandidatasPoner() {
  const p = S.player, c = tecJugTile(), R = Math.min(3, Math.ceil(tecAlcance())), out = [];
  for (let y = c.y - R; y <= c.y + R; y++) for (let x = c.x - R; x <= c.x + R; x++) {
    if (x === c.x && y === c.y) continue; if (!inReach(x, y)) continue;
    const dv = tecDesvio(x, y), d = Math.hypot((x + 0.5) * T - p.x, (y + 0.5) * T - p.y) / T;
    if (dv > 1.75) continue; // nunca a la espalda
    out.push({ x, y, s: d * 0.8 + dv * 2.4 });
  }
  return out.sort((a, b) => a.s - b.s);
}
const tecDir4 = () => Math.abs(TEC.dx) >= Math.abs(TEC.dy) ? (TEC.dx > 0 ? 0 : 2) : (TEC.dy > 0 ? 1 : 3);
function tecPoner(silencio) {
  const sel = selectedBlock(), id = heldId();
  if (sel) {
    const d0 = ui.dir; if (BD[sel].kin === 'belt' || BD[sel].kin === 'axis') ui.dir = tecDir4();
    for (const c of tecCandidatasPoner()) if (!canPlace(sel, c.x, c.y)) { const b = tryPlace(sel, c.x, c.y, ui.dir, true); if (b) { tecMarca(c.x, c.y); return true; } }
    if (!silencio) { const f = tecCandidatasPoner()[0]; const err = f ? canPlace(sel, f.x, f.y) : 'No hay sitio'; toastErr(err || 'No hay sitio'); }
    ui.dir = BD[sel].kin === 'belt' || BD[sel].kin === 'axis' ? ui.dir : d0; return false;
  }
  if (id && (GROUND_PLACE[id] || typeof groundTarget === 'function')) {
    for (const c of tecCandidatasPoner()) { const g = gnd(c.x, c.y); if (!at(c.x, c.y) && groundTarget(id, g, c.x, c.y)) { placeGround(id, c.x, c.y, g); tecMarca(c.x, c.y); return true; } }
    if (GROUND_PLACE[id]) { if (!silencio) toastErr('Aquí no se puede poner'); return false; }
  }
  // Otra cosa en la mano: úsala sobre lo que tienes delante (como F)
  if (!silencio) { const t = tecObjetivoPicar(); tecApuntar(t.wx, t.wy); interact(false, false); }
  return false;
}
// ---------- Ratón virtual: todo lo que ya funciona con el ratón apunta al objetivo ----------
function tecApuntar(wx, wy) {
  TEC.wx = wx; TEC.wy = wy;
  mouse.x = (wx - view.x) * view.z + cw / 2; mouse.y = (wy - view.y) * view.z + ch / 2;
  TEC.rmx = mouse.x; TEC.rmy = mouse.y; mouse.tx = Math.floor(wx / T); mouse.ty = Math.floor(wy / T);
}
let _tecMarcaT = 0, _tecMarcaXY = null; const tecMarca = (x, y) => { _tecMarcaXY = { x, y }; _tecMarcaT = 0.25; };
function tecTick(fdt) {
  if (!S || !TEC.on) return;
  if (ui.open || (typeof CHAT !== 'undefined' && CHAT.open)) { if (TEC.enter) { TEC.enter = false; mouse.down = false; } TEC.place = false; return; }
  tecDirDeFlechas();
  const t = tecObjetivoPicar(); TEC.tgt = t; tecApuntar(t.wx, t.wy);
  const k = t.tx + ',' + t.ty; if (k !== TEC.lastTile) { TEC.lastTile = k; if (TEC.enter) ui.mlock = null; } // otra casilla: vuelve a fijar la capa
  if (TEC.enter) { TEC_ult.x = t.tx; TEC_ult.y = t.ty; }
  if (TEC.place) { TEC.placeT -= fdt; if (TEC.placeT <= 0) { TEC.placeT = 0.2; tecPoner(true); } }
  if (_tecMarcaT > 0) _tecMarcaT -= fdt;
}
// ---------- Teclas ----------
function tecEmpiezaPicar() { TEC.on = true; TEC.enter = true; ui.mlock = null; TEC_ult.x = TEC_ult.y = -1e9; const t = tecObjetivoPicar(); tecApuntar(t.wx, t.wy); mouse.down = true; mouse.last = null; mouse.dragged = []; }
function tecParaPicar() { if (!TEC.enter) return; TEC.enter = false; mouse.down = false; mouse.grapDone = false; ui.mlock = null; }
// Teclado numérico (con o sin Bloq Num): 7 8 9 / 4 6 / 1 2 3 apuntan en 8 direcciones (sin caminar),
// 5 o el Intro del numérico pican (mantener) y 0 pone. Se captura antes para que los números no cambien de hueco.
const TEC_NUM = { Numpad8: [0, -1], Numpad2: [0, 1], Numpad4: [-1, 0], Numpad6: [1, 0], Numpad7: [-1, -1], Numpad9: [1, -1], Numpad1: [-1, 1], Numpad3: [1, 1] };
const TEC_NUM_PICA = ['Numpad5', 'NumpadEnter'], TEC_NUM_PON = 'Numpad0';
const tecEsNum = c => !!TEC_NUM[c] || TEC_NUM_PICA.includes(c) || c === TEC_NUM_PON;
addEventListener('keydown', e => {
  if (!tecEsNum(e.code) || !S || ui.open || e.ctrlKey || e.metaKey || e.altKey) return;
  if (typeof CHAT !== 'undefined' && CHAT.open) return;
  const tg = e.target && e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
  e.preventDefault(); e.stopImmediatePropagation(); TEC.on = true;
  const d = TEC_NUM[e.code];
  if (d) { const l = Math.hypot(d[0], d[1]); TEC.dx = d[0] / l; TEC.dy = d[1] / l; TEC_ult.x = TEC_ult.y = -1e9; return; }
  if (e.repeat) return;
  if (TEC_NUM_PICA.includes(e.code)) tecEmpiezaPicar();
  else { TEC.place = true; TEC.placeT = 0.35; tecPoner(false); }
}, true);
addEventListener('keyup', e => {
  if (!tecEsNum(e.code)) return; e.stopImmediatePropagation();
  if (TEC_NUM_PICA.includes(e.code)) tecParaPicar(); else if (e.code === TEC_NUM_PON) TEC.place = false;
}, true);
addEventListener('keydown', e => {
  if (!S || ui.open || e.ctrlKey || e.metaKey || e.altKey) return;
  if (typeof CHAT !== 'undefined' && CHAT.open) return;
  const tg = e.target && e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
  const k = e.key.toLowerCase();
  if (TEC_FLECHAS.includes(k)) { if (!e.repeat) TEC.t0[k] = performance.now(); if (!TEC.on) TEC.on = true; return; }
  if (e.key === 'Enter' && e.code !== 'NumpadEnter') {
    e.preventDefault(); if (e.repeat) return; tecEmpiezaPicar(); return;
  }
  if (e.code === 'ShiftRight') {
    if (e.repeat) return; TEC.on = true; TEC.place = true; TEC.placeT = 0.35; tecDirDeFlechas(); tecPoner(false);
  }
});
addEventListener('keyup', e => {
  const k = e.key.toLowerCase(); if (TEC_FLECHAS.includes(k)) delete TEC.t0[k];
  if (e.key === 'Enter') tecParaPicar();
  if (e.code === 'ShiftRight' || e.key === 'Shift') TEC.place = false;
});
addEventListener('blur', () => { TEC.enter = TEC.place = false; TEC.t0 = {}; });
// Mover o pulsar el ratón de verdad: vuelve el control con ratón
cv.addEventListener('mousemove', e => { if (TEC.on && Math.abs(e.clientX - TEC.rmx) + Math.abs(e.clientY - TEC.rmy) > 6) { TEC.on = false; TEC.enter = false; } });
cv.addEventListener('mousedown', () => { if (TEC.on) { TEC.on = false; TEC.enter = false; } }, true);
// Mientras se pica con Intro, el bloque o el suelo de la mano no se pone: se pica (Intro es solo para romper)
{ const m0 = updateMining; updateMining = fdt => {
  if (!(TEC.on && TEC.enter)) return m0(fdt);
  const id = heldId(), cambia = !ui.hand && !!id && !TOOLS[id] && !WEAPONS[id] && !(typeof heldRod === 'function' && heldRod()); // lo que no es herramienta ni arma: con la mano
  if (cambia) ui.hand = true; try { return m0(fdt); } finally { if (cambia) ui.hand = false; }
}; }
// Un toque de flecha solo gira; mantenerla camina como siempre
{ const u0 = updatePlayer; updatePlayer = fdt => {
  const now = performance.now(), quitadas = [];
  for (const k of TEC_FLECHAS) if (keys.has(k) && TEC.t0[k] && now - TEC.t0[k] < TEC_TOQUE) { keys.delete(k); quitadas.push(k); }
  try { u0(fdt); } finally { for (const k of quitadas) keys.add(k); }
  try { tecTick(fdt); } catch (e) { console.warn(e); }
}; }
// Mirar hacia donde apuntas (si no estás caminando) y marcar el objetivo en píxeles
{ const d0 = drawPlayer; drawPlayer = ctx => {
  if (TEC.on && S) { if (TEC.tgt) tecApuntar(TEC.wx, TEC.wy); if (!pmove.moving) { P.faceA = tecAng(); P.faceMx = mouse.x; P.faceMy = mouse.y; } }
  d0(ctx);
  if (!TEC.on || !S || !TEC.tgt || ui.open) return;
  try {
    const t = TEC.tgt, x = t.tx * T, y = t.ty * T, pul = (Math.sin(performance.now() / 160) + 1) / 2, a = 0.55 + pul * 0.4, L = 5;
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.fillStyle = TEC.enter ? `rgba(255,214,120,${a})` : `rgba(255,255,255,${a})`;
    for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + T, y, -1, 1], [x, y + T, 1, -1], [x + T, y + T, -1, -1]]) {
      ctx.fillRect(sx > 0 ? cx : cx - L, sy > 0 ? cy : cy - 1, L, 1); ctx.fillRect(sx > 0 ? cx : cx - 1, sy > 0 ? cy : cy - L, 1, L); // esquinas
    }
    if (_tecMarcaT > 0 && _tecMarcaXY) { ctx.fillStyle = `rgba(150,255,170,${(_tecMarcaT * 3).toFixed(2)})`; const mx = _tecMarcaXY.x * T, my = _tecMarcaXY.y * T; ctx.fillRect(mx, my, T, 1); ctx.fillRect(mx, my + T - 1, T, 1); ctx.fillRect(mx, my, 1, T); ctx.fillRect(mx + T - 1, my, 1, T); }
    ctx.restore();
  } catch (e) { console.warn(e); }
}; }
