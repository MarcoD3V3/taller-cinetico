'use strict';
// =====================================================================================
//  Casas de varios pisos (hasta 5). Datos en data/floors.js.
//  · El piso f de una casa está en la misma (x, y) desplazada en y por flOff(f) (sim/roofs.js):
//    una franja lejana del mundo, vacía salvo donde hay tejado (allí hay suelo de tablones).
//  · Subir: pasa por encima de una Escalera en L dentro de una casa con tejado. Si el piso de
//    arriba no existe, se construye copiando el tejado (que pone el suelo) y las paredes del
//    borde (las puertas de fuera se vuelven pared; las ventanas se quedan). Arriba aparece una
//    Escalera de bajada en el mismo sitio.
//  · Al pasar por la escalera hay una transición: subes los peldaños en L y la pantalla se funde.
//  · Cada jugador está donde está: en línea cada uno puede estar en un piso distinto sin más.
// =====================================================================================
const FL_MAX = 5;
const floorOfY = ty => { for (let f = 1; f < FL_MAX; f++) if (Math.abs(ty - flOff(f)) < 60000) return f; return 0; };
const curFloor = () => (S && S.player ? floorOfY(Math.floor(S.player.y / T)) : 0);
// ---------- Terreno de los pisos: vacío, y suelo donde hay tejado ----------
const flChunk = c => floorOfY(c.cy * CS + 16) > 0;
function flFill(c) {
  c.h = new Uint8Array(CS * CS); const air = G.FLOOR_AIR, fl = G.PLANKFLOOR, bio = BI_.houseFloor;
  for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) { const i = (y << CSH) | x, tx = c.cx * CS + x, ty = c.cy * CS + y; c.g[i] = S && S.roof && S.roof[tx + ',' + ty] ? fl : air; c.bio[i] = bio; c.t[i] = 0; }
  c.mod = false;
}
{ const l0 = chunkLv; chunkLv = c => flChunk(c) ? (c.h = new Uint8Array(CS * CS)) : l0(c); }
{ const g0 = genChunkTiles; genChunkTiles = c => { if (flChunk(c)) flFill(c); else g0(c); }; }
{ const b0 = computeChunkBiomes; computeChunkBiomes = c => { if (flChunk(c)) flFill(c); else b0(c); }; }
// Poner tejado en un piso pone su suelo (así el suelo llega igual a todos los jugadores)
{ const r0 = roofSet; roofSet = (x, y, id, remote) => { const r = r0(x, y, id, remote); if (id && floorOfY(y) > 0 && gnd(x, y) === G.FLOOR_AIR) setGround(x, y, G.PLANKFLOOR); return r; }; }
// ---------- Construir el piso de arriba ----------
function flBuildAbove(sx, sy) {
  const f = floorOfY(sy); if (f + 1 >= FL_MAX) { toastErr(`Como mucho ${FL_MAX} pisos`); return false; }
  const reg = roofRegion(sx, sy); if (!reg) { toastErr('La Escalera en L tiene que estar dentro de una casa con tejado'); return false; }
  const dy = flOff(f + 1) - flOff(f), tiles = [...reg].map(k => k.split(',').map(Number));
  if (gnd(sx, sy + dy) !== G.FLOOR_AIR) { if (!at(sx, sy + dy)) addBlock({ type: 'stairsDown', x: sx, y: sy + dy, dir: 0 }); return true; } // ya existe
  for (const [x, y] of tiles) roofSet(x, y + dy, S.roof[roofKey(x, y)]);
  for (const [x, y] of tiles) { const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !reg.has(roofKey(x + a, y + b))); if (!edge || at(x, y + dy)) continue;
    const wallT = o => o && BD[o.type] && !BD[o.type].walk && !BD[o.type].door ? o.type : null, below = at(x, y), t = wallT(below) || wallT(at(x - 1, y)) || wallT(at(x + 1, y)) || wallT(at(x, y - 1)) || 'woodWall'; // encima de la puerta: la misma pared de al lado
    addBlock({ type: t, x, y: y + dy, dir: 0 }); }
  if (!at(sx, sy + dy)) addBlock({ type: 'stairsDown', x: sx, y: sy + dy, dir: 0 });
  toast(`🏠 Has construido el piso ${f + 2}: mismas paredes y mismo tejado. Amuéblalo a tu gusto.`, true);
  return true;
}
// ---------- Subir y bajar con transición ----------
const STR = { anim: null, lock: null, fade: 0 };
const stFade = (() => { const d = document.createElement('div'); d.id = 'stFade'; d.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:9;transition:none'; document.body.appendChild(d); return d; })();
const stHud = (() => { const d = document.createElement('div'); d.id = 'flHud'; d.hidden = true; document.body.appendChild(d); return d; })();
function stStart(b, up) {
  const f = floorOfY(b.y); if (up && f + 1 >= FL_MAX) { toastErr(`Como mucho ${FL_MAX} pisos`); STR.lock = b.x + ',' + b.y; return; }
  if (!up && f === 0) return;
  if (up && !flBuildAbove(b.x, b.y)) { STR.lock = b.x + ',' + b.y; return; }
  const dy = up ? flOff(f + 1) - flOff(f) : flOff(f - 1) - flOff(f);
  STR.anim = { t: 0, dur: 0.95, b, up, dy, x0: S.player.x, y0: S.player.y, f: f + (up ? 1 : -1), done: false };
}
// Camino en L dentro de la casilla de la escalera (según hacia dónde mira)
function stPath(b, u, up) {
  const cx = (b.x + 0.5) * T, cy = (b.y + 0.5) * T, d = b.dir || 0, rot = (x, y) => [[x, y], [-y, x], [-x, -y], [y, -x]][d & 3];
  const k = up ? u : 1 - u, p = k < 0.5 ? [-10 + 40 * k, 10] : [10, 10 - 40 * (k - 0.5)], [rx, ry] = rot(p[0], p[1]); return [cx + rx, cy + ry];
}
function stTick(dt) {
  const A = STR.anim, p = S.player;
  if (A) { A.t += dt; const u = Math.min(1, A.t / A.dur);
    if (!A.done) { const [x, y] = stPath(A.b, Math.min(1, u * 1.6), A.up); p.x = x; p.y = y; P.iframe = Math.max(P.iframe || 0, 0.2); if (((A.t * 7) | 0) !== ((A.t - dt) * 7 | 0)) tone(A.up ? 300 + u * 200 : 500 - u * 200, 0.04, 'triangle', 0.025, 1);
      stFade.style.opacity = Math.max(0, (u - 0.45) / 0.55).toFixed(3);
      if (u >= 1) { A.done = true; A.t = 0; p.x = (A.b.x + 0.5) * T; p.y = (A.b.y + 0.5 + A.dy) * T; view.x = p.x; view.y = p.y; STR.lock = A.b.x + ',' + (A.b.y + A.dy); flHudUpd(); } }
    else { stFade.style.opacity = Math.max(0, 1 - A.t / 0.4).toFixed(3); if (A.t >= 0.4) { STR.anim = null; stFade.style.opacity = '0'; toast(A.f ? `🏠 Piso ${A.f + 1}` : '🏠 Planta baja'); } }
    return; }
  const tx = Math.floor(p.x / T), ty = Math.floor((p.y + 5) / T), k = tx + ',' + ty, b = at(tx, ty);
  if (STR.lock && STR.lock !== k) STR.lock = null;
  if (!b || STR.lock === k || ui.open) return;
  if (b.type === 'stairsL') stStart(b, true); else if (b.type === 'stairsDown') stStart(b, false);
}
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); if (S && S.player) stTick(fdt); }; }
function flHudUpd() { const f = curFloor(); stHud.hidden = !f; if (f) stHud.textContent = `🏠 Piso ${f + 1}`; }
setInterval(() => { if (S) flHudUpd(); }, 1000);
// ---------- Dibujo de las escaleras: peldaños en L ----------
function drawStairs(ctx, b) {
  const X = b.x * T, Y = b.y * T, d = b.dir || 0, down = b.type === 'stairsDown';
  ctx.save(); ctx.translate(X + 16, Y + 16); ctx.rotate(d * Math.PI / 2); ctx.translate(-16, -16);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(1, 1, 31, 31);
  // Tramo 1 (abajo, de izquierda a derecha), rellano y tramo 2 (a la derecha, hacia arriba)
  for (let i = 0; i < 4; i++) { const l = down ? 0.45 - i * 0.07 : 0.15 + i * 0.08; ctx.fillStyle = shade('#9a6a3c', l - 0.2); ctx.fillRect(i * 5, 18, 5, 13); ctx.fillStyle = shade('#9a6a3c', l); ctx.fillRect(i * 5, 18, 5, 3); }
  ctx.fillStyle = shade('#9a6a3c', down ? 0.15 : 0.45); ctx.fillRect(20, 18, 11, 13); // rellano
  for (let i = 0; i < 4; i++) { const l = down ? 0.1 - i * 0.07 : 0.5 + i * 0.07; ctx.fillStyle = shade('#9a6a3c', l - 0.2); ctx.fillRect(20, 13 - i * 4, 11, 4); ctx.fillStyle = shade('#9a6a3c', l); ctx.fillRect(20, 13 - i * 4, 11, 1); }
  ctx.fillStyle = '#4a2e18'; ctx.fillRect(0, 17, 20, 1); ctx.fillRect(19, 0, 1, 18); // barandilla
  if (down) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(20, 0, 11, 6); }
  ctx.restore();
}
let _stHook = false;
function stHookDraw() { if (_stHook || typeof drawCombat !== 'function') return; _stHook = true; const c0 = drawCombat; drawCombat = (ctx, ...a) => { try { if (typeof _vis !== 'undefined') for (const b of _vis) if (b.type === 'stairsL' || b.type === 'stairsDown') drawStairs(ctx, b); } catch (e) { } return c0(ctx, ...a); }; }
stHookDraw();
cmd('piso', { a: ['floor'], u: '/piso', d: 'Dice en qué piso estás.', run() { const f = curFloor(); return f ? `Estás en el piso ${f + 1}.` : 'Estás en la planta baja.'; } });
