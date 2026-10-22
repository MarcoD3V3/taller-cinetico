'use strict';
// Dibujo del mundo: el suelo se pre-renderiza en bloques de 16×16 casillas (chunks) que solo se
// regeneran si cambia el terreno. Los bloques usan sprites cacheados + una capa animada ligera.
const CH = 16;
const cv = document.getElementById('c'), ctx = cv.getContext('2d', { alpha: false });
const view = { x: 0, y: 0, z: 1.25 };
let dpr = 1, cw = 0, ch = 0;
function resize() { dpr = Math.min(2, window.devicePixelRatio || 1); cw = innerWidth; ch = innerHeight; cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); darkC.width = Math.ceil(cw / 4); darkC.height = Math.ceil(ch / 4); }
const darkC = mkCanvas(1, 1), darkX = darkC.getContext('2d');
addEventListener('resize', resize);

// Dos cachés de suelo: resolución completa (cerca) y media (lejos), con límite de memoria.
const chunks = new Map(), chunksH = new Map(), chunksQ = new Map(), tileLights = new Map(); // luces del terreno (lava, setas…) por chunk
const chunkKey = ckey;
let _buildBudget = 99; // chunks de suelo que se pueden dibujar por fotograma (evita tirones al moverse)
// Una casilla cambia su borde y el de sus 8 vecinas: si alguna cae en otro trozo, ese también se redibuja.
// A tamaño completo el trozo viejo se sigue dibujando hasta tener el nuevo (así no parpadea al picar)
const _staleCh = new Set();
function invalidateTile(x, y) { const done = new Set(); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const k = chunkKey(Math.floor((x + dx) / CH), Math.floor((y + dy) / CH)); if (done.has(k)) continue; done.add(k); if (chunks.has(k)) _staleCh.add(k); else tileTrees.delete(k); chunksH.delete(k); chunksQ.delete(k); } }
// Capa de bloques por chunk para el zoom lejano (se redibuja al cambiar o cada segundo)
const bchunks = new Map(), chunkVer = new Map();
function bumpChunk(x, y) { for (let d = -1; d < 4; d++) { const xx = d < 0 ? x : x + DX[d], yy = d < 0 ? y : y + DY[d]; const k = chunkKey(Math.floor(xx / CH), Math.floor(yy / CH)); chunkVer.set(k, (chunkVer.get(k) || 0) + 1); } }
let _bcBudget = 0;
function blockChunk(cx, cy, now) {
  const k = chunkKey(cx, cy), v = chunkVer.get(k) || 0; let e = bchunks.get(k);
  if (!e) { if (bchunks.size > 120) { const f = bchunks.keys().next().value; bchunks.delete(f); } e = { c: mkCanvas(CH * T / 2, CH * T / 2), v: -1, t: 0 }; bchunks.set(k, e); }
  if (e.v !== v || (now - e.t > 1000 && _bcBudget-- > 0)) {
    const c = e.c.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, e.c.width, e.c.height); c.setTransform(0.5, 0, 0, 0.5, 0, 0);
    const x0 = cx * CH, y0 = cy * CH;
    for (let y = y0; y < y0 + CH; y++) for (let x = x0; x < x0 + CH; x++) { const b = at(x, y); if (b) c.drawImage(blockSprite(b), (x - x0) * T - 4, (y - y0) * T - 4, 40, 40); }
    e.v = v; e.t = now;
  }
  return e.c;
}
function buildChunk(cx, cy, s = 1) {
  const c0 = mkCanvas(CH * T * s, CH * T * s), c = c0.getContext('2d');
  const x0 = cx * CH, y0 = cy * CH, wc = getChunk(x0 >> CSH, y0 >> CSH); // 16×16 cabe dentro de un chunk de 32
  // A tamaño completo, el suelo se compone copiando píxeles de las texturas (mucho más rápido que 256 drawImage)
  if (s === 1) { const W = CH * T, img = c.createImageData(W, W), u = new Uint32Array(img.data.buffer);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) { const t0 = wc.g[(((y0 + y) & CMASK) << CSH) | ((x0 + x) & CMASK)], g0 = GI[t0]; if (g0.ruin || g0.abyss) continue;
      const src = tileTexPx(g0.flora ? (g0.u >= 0 ? g0.u : G.GRASS) : t0, (hash2(x0 + x, y0 + y, 51) * TEX_VARS) | 0); for (let r = 0; r < T; r++) u.set(src.subarray(r * T, r * T + T), (y * T + r) * W + x * T); }
    blendEdges(u, W, x0, y0); paintCliffs(u, W, x0, y0);
    c.putImageData(img, 0, 0); _baseDone = true; }
  c.scale(s, s); _treeLayer = s === 1; _treeList = [];
  const lights = [];
  for (let y = y0; y < y0 + CH; y++) for (let x = x0; x < x0 + CH; x++) {
    const wi = ((y & CMASK) << CSH) | (x & CMASK), t = wc.g[wi];
    drawTerrainTile(c, x, y, t, (x - x0) * T, (y - y0) * T, wc.t[wi]);
    if (GI[t].light && ((x + y) & 1) === 0) lights.push(x, y, GI[t].light); // la mitad basta para iluminar
  }
  if (s !== 1) paintCliffsLo(c, x0, y0);
  _baseDone = false; tileLights.set(chunkKey(cx, cy), lights); if (_treeLayer) tileTrees.set(chunkKey(cx, cy), _treeList); _treeLayer = false;
  if (s === 1) _staleCh.delete(chunkKey(cx, cy));
  const m = s === 1 ? chunks : s === 0.5 ? chunksH : chunksQ, lim = s === 1 ? 40 : s === 0.5 ? 160 : 700;
  if (m.size > lim) m.delete(m.keys().next().value);
  m.set(chunkKey(cx, cy), c0); return c0;
}
// Perspectiva: las casillas de roca y mena que están por debajo de los pies del jugador se vuelven
// a pintar encima de él (copiándolas del trozo ya dibujado), así queda detrás de ellas
function drawFrontTiles(ctx) {
  const p = S.player, fy = p.y + 5 - (P.z || 0) * 0, px = Math.floor(p.x / T), fr = Math.floor(fy / T);
  for (let ty = fr + 1; ty <= fr + 2; ty++) for (let tx = px - 1; tx <= px + 1; tx++) {
    const g = GI[gnd(tx, ty)]; if (!g.solid || g.tree || g.flora || g.liquid) continue;
    if (typeof fogHidden === 'function' && fogHidden(tx, ty)) continue;
    const cx = Math.floor(tx / CH), cy = Math.floor(ty / CH), c = chunks.get(chunkKey(cx, cy)); if (!c) continue;
    ctx.drawImage(c, (tx - cx * CH) * T, (ty - cy * CH) * T, T, T, tx * T, ty * T, T, T);
  }
}
function mouseWorld() { return { x: (mouse.x - cw / 2) / view.z + view.x, y: (mouse.y - ch / 2) / view.z + view.y }; }
let _vis = [], frameNo = 0, _staleBudget = 2;
function render(fdt) {
  if (dirty.lists) rebuildLists();
  if (shake > 0) shake -= fdt;
  const sj = shake > 0 ? (Math.random() - 0.5) * 10 * dpr : 0, z = view.z, k = z * dpr, ox = cw / 2 * dpr - view.x * k + sj, oy = ch / 2 * dpr - view.y * k + sj;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0b0c0d'; ctx.fillRect(0, 0, cv.width, cv.height);
  const x0 = Math.floor((view.x - cw / 2 / z) / T) - 1, x1 = Math.ceil((view.x + cw / 2 / z) / T) + 1;
  const y0 = Math.floor((view.y - ch / 2 / z) / T) - 1, y1 = Math.ceil((view.y + ch / 2 / z) / T) + 1;
  // Suelo
  ctx.setTransform(k, 0, 0, k, ox, oy); ctx.imageSmoothingEnabled = true;
  const far = k <= 0.75, detail = z > 0.68, now = performance.now(); _bcBudget = 2;
  const sc = k <= 0.35 ? 0.25 : far ? 0.5 : 1, cm = sc === 1 ? chunks : sc === 0.5 ? chunksH : chunksQ;
  _staleBudget = 2; _buildBudget = cm.size < 6 ? 99 : sc === 0.25 ? 6 : sc === 1 ? 1 : 2; // a tamaño completo, 1 por fotograma (sin tirones)
  for (let cy = Math.floor(y0 / CH); cy <= Math.floor(y1 / CH); cy++) for (let cx = Math.floor(x0 / CH); cx <= Math.floor(x1 / CH); cx++) {
    const key = chunkKey(cx, cy);
    let c = cm.get(key);
    if (!c && _buildBudget > 0) { _buildBudget--; c = buildChunk(cx, cy, sc); }
    else if (c && sc === 1 && _staleCh.has(key) && _staleBudget-- > 0) { _staleCh.delete(key); c = buildChunk(cx, cy, 1); }
    if (c) ctx.drawImage(c, cx * CH * T, cy * CH * T, CH * T + 0.5, CH * T + 0.5);
    else { ctx.fillStyle = '#3d5e37'; ctx.fillRect(cx * CH * T, cy * CH * T, CH * T + 0.5, CH * T + 0.5); } // se dibuja en el siguiente fotograma
    const wcn = peekChunk((cx * CH) >> CSH, (cy * CH) >> CSH);
    if (!detail && wcn && wcn.nb) ctx.drawImage(blockChunk(cx, cy, now), cx * CH * T, cy * CH * T, CH * T, CH * T);
  }
  drawFog(ctx, x0, y0, x1, y1); // roca sin descubrir (render/fog.js)
  if (selectedBlock()) {
    ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = x0; x <= x1 + 1; x++) { ctx.moveTo(x * T, y0 * T); ctx.lineTo(x * T, (y1 + 1) * T); }
    for (let y = y0; y <= y1 + 1; y++) { ctx.moveTo(x0 * T, y * T); ctx.lineTo((x1 + 1) * T, y * T); }
    ctx.stroke();
  }
  // Bloques
  _vis.length = 0;
  // Recorre por chunks: si un chunk no tiene bloques se salta entero
  for (let cy = y0 >> CSH; cy <= y1 >> CSH; cy++) for (let cx = x0 >> CSH; cx <= x1 >> CSH; cx++) {
    const wc = peekChunk(cx, cy); if (!wc || !wc.nb) continue;
    const ya = Math.max(y0, cy * CS), yb = Math.min(y1, cy * CS + CMASK), xa = Math.max(x0, cx * CS), xb = Math.min(x1, cx * CS + CMASK);
    for (let y = ya; y <= yb; y++) { const row = (y & CMASK) << CSH; for (let x = xa; x <= xb; x++) { const b = wc.b[row | (x & CMASK)]; if (b) _vis.push(b); } }
  }
  const spin = fdt * Math.PI / 60;
  frameNo++;
  for (const b of _vis) {
    if (b.rpm > 0) b.angle += b.rpm * spin * ((b.x + b.y) & 1 ? 1 : -1);
    if (b.items) b.phase = (b.phase || 0) + Math.min(b.rpm / 16 * (b.type === 'brassBelt' ? 2 : 1), 10) * fdt * (runnable(b) ? 1 : 0);
    if (!detail) continue; // de lejos los bloques vienen de la capa por chunks
    const dr = DRAW[b.type]; if (dr.tall) continue;
    // El sprite se recalcula como mucho cada 8 fotogramas (o al cambiar la topología)
    if (b._tv !== topoVer || ((frameNo + b.x + b.y) & 7) === 0 || !b._spr) { b._spr = blockSprite(b); b._tv = topoVer; }
    ctx.setTransform(k, 0, 0, k, ox + (b.x * T + 16) * k, oy + (b.y * T + 16) * k);
    ctx.drawImage(b._spr, -20, -20, 40, 40);
    if (dr.a) dr.a(ctx, b, 0);
  }
  // Objetos en cintas (de lejos, solo un punto de color)
  ctx.setTransform(k, 0, 0, k, ox, oy);
  if (detail) { for (const b of _vis) if (b.items && b.items.length) for (const it of b.items) { const off = (it.p - 0.5) * 32; drawItem(ctx, it.id, b.x * T + 16 + DX[b.dir] * off, b.y * T + 16 + DY[b.dir] * off, 13); } }
  else {
    // Agrupa por color: un solo fill() por tipo de objeto
    const groups = new Map();
    for (const b of _vis) if (b.items && b.items.length) for (const it of b.items) { let g = groups.get(it.id); if (!g) { g = []; groups.set(it.id, g); } const off = (it.p - 0.5) * 32; g.push(b.x * T + 11 + DX[b.dir] * off, b.y * T + 11 + DY[b.dir] * off); }
    for (const [id, g] of groups) { ctx.beginPath(); for (let i = 0; i < g.length; i += 2) ctx.rect(g[i], g[i + 1], 10, 10); ctx.fillStyle = ITEMS[id].c; ctx.fill(); }
  }
  // Bloques altos (aspas) por encima
  for (const b of _vis) { const dr = DRAW[b.type]; if (!dr.tall || !detail) continue; const cx = b.x * T + 16, cy = b.y * T + 16; ctx.setTransform(k, 0, 0, k, ox + cx * k, oy + cy * k); ctx.drawImage(blockSprite(b), -20, -20, 40, 40); dr.a(ctx, b, 0); }
  ctx.setTransform(k, 0, 0, k, ox, oy);
  endDraw(ctx, x0, y0, x1, y1); // Puerta del Ocaso, sellos y Corazón (animados)
  // Objetos lanzados
  for (const f of FLY) { const p = f.t / f.dur, x = (f.x0 + (f.x1 - f.x0) * p) * T + 16, y = (f.y0 + (f.y1 - f.y0) * p) * T + 16 - Math.sin(p * Math.PI) * 24; drawItem(ctx, f.id, x, y, 12); }
  // Avisos
  ctx.font = 'bold 12px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff6b5b';
  for (const b of _vis) { const c = b.comp; if (c && c.gens > 0 && c.stop && (BD[b.type].gen || BD[b.type].impact)) ctx.fillText('!', b.x * T + 27, b.y * T + 11); if (b.off) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(b.x * T + 2, b.y * T + 2, 28, 28); ctx.fillStyle = '#ff6b5b'; } }
  // Animales
  drawAnimals(ctx, k, ox, oy, x0, y0, x1, y1);
  ctx.setTransform(k, 0, 0, k, ox, oy);
  // Combate, mascotas, NPC y jugador (con cuerpo)
  drawCombat(ctx, k, ox, oy, x0, y0, x1, y1);
  const p = S.player, mw = mouseWorld();
  if (sc === 1) drawTrees(ctx, k, ox, oy, x0, y0, x1, y1, false); // árboles de detrás (render/trees.js)
  drawPlayer(ctx);
  if (sc === 1) drawFrontTiles(ctx); // la roca que queda delante tapa al personaje
  if (sc === 1) { drawTrees(ctx, k, ox, oy, x0, y0, x1, y1, true); ctx.setTransform(k, 0, 0, k, ox, oy); }
  // Partículas (render/fx.js)
  if (fdt) { fxTick(fdt); fxAmbient(fdt, x0, y0, x1, y1); } drawFxWorld(ctx); _fxOn = true;
  // Cursor y fantasma
  const tx = mouse.tx, ty = mouse.ty, sel = selectedBlock();
  if (!ui.open) {
    if (sel && !at(tx, ty)) {
      const err = canPlace(sel, tx, ty), gb = makeB(sel, tx, ty, ui.dir); gb.icon = 0;
      ctx.setTransform(k, 0, 0, k, ox + (tx * T + 16) * k, oy + (ty * T + 16) * k); ctx.globalAlpha = 0.55;
      ctx.drawImage(blockSprite(gb), -20, -20, 40, 40); ctx.globalAlpha = 1;
      if (BD[sel].dir) { ctx.rotate(ui.dir * R90); arrow(ctx, 22); }
      ctx.setTransform(k, 0, 0, k, ox, oy); ctx.strokeStyle = err ? '#ff6b5b' : '#7fd07a'; ctx.lineWidth = 2; ctx.strokeRect(tx * T + 1, ty * T + 1, T - 2, T - 2);
    } else drawHoverMark(ctx); // marco animado y anillo bajo criaturas (ui/hovercard.js)
    drawBreak(ctx); // grietas al romper un bloque (sim/breaking.js)
    // Fuera de alcance o sin la herramienta adecuada: cursor rojo
    if (!sel && !at(tx, ty) && (!inReach(tx, ty) || (GI[gnd(tx, ty)].drop && !toolOK(GI[gnd(tx, ty)], TOOLS[heldId()])))) { ctx.strokeStyle = 'rgba(255,107,91,.85)'; ctx.lineWidth = 2; ctx.strokeRect(tx * T + 1, ty * T + 1, T - 2, T - 2); }
    // Grietas que crecen mientras picas
    if (ui.mine.t > 0 && ui.mine.x === tx && ui.mine.y === ty) {
      const p = Math.min(1, ui.mine.t / (ui.mine.need || mineTime(gnd(tx, ty)))), n = 1 + Math.floor(p * 6);
      ctx.strokeStyle = 'rgba(15,12,10,.8)'; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let i = 0; i < n; i++) { const a = i * 2.4 + 0.6, r1 = 3 + hash2(tx, ty, i) * 3, r2 = 6 + p * 9 + hash2(tx, ty, i + 9) * 4; ctx.moveTo(tx * T + 16 + Math.cos(a) * r1, ty * T + 16 + Math.sin(a) * r1); ctx.lineTo(tx * T + 16 + Math.cos(a + 0.3) * r2, ty * T + 16 + Math.sin(a + 0.3) * r2); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(tx * T + 4, ty * T + 27, 24, 3); ctx.fillStyle = '#e0b54c'; ctx.fillRect(tx * T + 4, ty * T + 27, 24 * p, 3);
    }
    drawBursts(ctx);
    // Prospector: marca las menas cercanas
    const pr = heldId() === 'veinStaff' ? 28 : buff('reveal') ? 20 : heldId() === 'prospector' ? 16 : 0; if (pr) { const px = Math.floor(S.player.x / T), py = Math.floor(S.player.y / T); ctx.lineWidth = 2; for (let yy = py - pr; yy <= py + pr; yy++) for (let xx = px - pr; xx <= px + pr; xx++) { const g = GI[gnd(xx, yy)]; if (g.dot && !g.liquid) { ctx.strokeStyle = g.dot; ctx.strokeRect(xx * T + 3, yy * T + 3, T - 6, T - 6); } } }
    // Brújula: flecha hacia el Núcleo
    if (heldId() === 'compass' && L.core && L.core[0]) { const c0 = L.core[0], up = typeof layerOf === 'function' && layerOf(Math.floor(S.player.y / T)) !== layerOf(c0.y), dx = c0.x * T + 16 - S.player.x, dy = (up ? surfY(c0.y) - surfY(Math.floor(S.player.y / T)) : c0.y) * T + (up ? 0 : 16 - S.player.y), a = Math.atan2(dy, dx), dist = Math.round(Math.hypot(dx, dy) / T); ctx.save(); ctx.translate(S.player.x, S.player.y); ctx.rotate(a); ctx.translate(24, 0); arrow(ctx, 0, '#e0b54c', 2.4); ctx.restore(); ctx.font = 'bold 11px system-ui'; ctx.fillStyle = '#fff4cc'; ctx.textAlign = 'center'; ctx.fillText(dist + ' casillas' + (up ? ' · arriba' : ''), S.player.x, S.player.y - 18); }
  }
  // Noche: capa oscura de baja resolución con huecos de luz
  // Noche, túneles dentro de la montaña y tormentas oscurecen (sim/weather.js); las luces abren huecos
  const dark = Math.max((1 - daylight()) * (buff('night') ? 0.22 : CM().night ? 0.32 : 0.62), envDark() * (buff('night') ? 0.4 : 1));
  if (dark > 0.02) {
    const dw = darkC.width, dh = darkC.height, s = 0.25 * dpr;
    darkX.globalCompositeOperation = 'source-over'; darkX.clearRect(0, 0, dw, dh);
    darkX.fillStyle = `rgba(8,12,30,${dark})`; darkX.fillRect(0, 0, dw, dh);
    darkX.globalCompositeOperation = 'destination-out';
    const lk = k / 4 / dpr;
    const light = (wx, wy, r) => { const sx = (ox / dpr + wx * z) / 4, sy = (oy / dpr + wy * z) / 4, rs = r * T * z / 4; if (sx + rs < 0 || sy + rs < 0 || sx - rs > dw || sy - rs > dh) return; darkX.drawImage(glowSprite, sx - rs, sy - rs, rs * 2, rs * 2); };
    { const h = heldId(); light(p.x, p.y, Math.max(h === 'lightWand' ? 12 : h === 'lantern' ? 8 : buff('night') ? 9 : 3, typeof kitLight === 'function' ? kitLight() : 0)); }
    for (const b of L.light) if (litOf(b)) light(b.x * T + 16, b.y * T + 16, typeof lightOf === 'function' ? lightOf(b) : BD[b.type].light);
    for (let cy = Math.floor(y0 / CH); cy <= Math.floor(y1 / CH); cy++) for (let cx = Math.floor(x0 / CH); cx <= Math.floor(x1 / CH); cx++) { const ls = tileLights.get(chunkKey(cx, cy)); if (ls) for (let i = 0; i < ls.length; i += 3) light(ls[i] * T + 16, ls[i + 1] * T + 16, ls[i + 2]); }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(darkC, 0, 0, cv.width, cv.height);
    ctx.setTransform(k, 0, 0, k, ox, oy); ctx.globalCompositeOperation = 'lighter';
    for (const b of L.light) if (litOf(b)) { const r = (typeof lightOf === 'function' ? lightOf(b) : BD[b.type].light) * T * 0.8; const x = b.x * T + 16, y = b.y * T + 16; if (x > (x0 - 8) * T && x < (x1 + 8) * T && y > (y0 - 8) * T && y < (y1 + 8) * T) ctx.drawImage(warmGlow, x - r, y - r, r * 2, r * 2); }
    ctx.globalCompositeOperation = 'source-over';
  }
  drawWeatherScreen(ctx, fdt || 0); // lluvia, nieve, niebla, tinte de escena (render/fx.js)
}
