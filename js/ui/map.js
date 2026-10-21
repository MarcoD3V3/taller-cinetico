'use strict';
// Minimapa y mapa completo (M) para un mundo infinito: cada chunk explorado tiene su propia
// "tesela" de 32×32 píxeles (1 píxel = 1 casilla) que se actualiza píxel a píxel.
// Las teselas se conservan aunque el chunk se descargue, así el mapa recuerda lo explorado.
const MAPT = new Map();
const CAT_COL = ['#e0b54c', '#ffd27a', '#c98a4a', '#9aa0a8', '#ffcc33', '#5aa8ff', '#ff4a3a'];
function tileMapColor(x, y) {
  const b = at(x, y);
  if (b) return b.type === 'core' ? '#fff4cc' : CAT_COL[BD[b.type].cat] || '#ccc';
  const t = gnd(x, y);
  const [r, g, bb] = mapRGB(x, y, t); return `rgb(${r | 0},${g | 0},${bb | 0})`;
}
function buildMapTile(c) {
  const cv2 = mkCanvas(CS, CS), x2 = cv2.getContext('2d'), img = x2.createImageData(CS, CS), d = img.data;
  const x0 = c.cx * CS, y0 = c.cy * CS;
  for (let i = 0; i < CS * CS; i++) {
    const t = c.g[i], x = x0 + (i & CMASK), y = y0 + (i >> CSH);
    const col = mapRGB(x, y, t);
    d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
  }
  x2.putImageData(img, 0, 0);
  if (c.b) for (let i = 0; i < CS * CS; i++) if (c.b[i]) { x2.fillStyle = tileMapColor(x0 + (i & CMASK), y0 + (i >> CSH)); x2.fillRect(i & CMASK, i >> CSH, 1, 1); }
  MAPT.set(ckey(c.cx, c.cy), cv2);
}
onChunkGen = c => { if (!MAPT.has(ckey(c.cx, c.cy)) || c.mod) buildMapTile(c); };
function mapPixel(x, y) {
  const m = MAPT.get(ckey(x >> CSH, y >> CSH)); if (!m) return;
  const c = m.getContext('2d'); c.fillStyle = tileMapColor(x, y); c.fillRect(x & CMASK, y & CMASK, 1, 1);
}
onTileChange = (x, y, isBlock) => { if (!isBlock) invalidateTile(x, y); bumpChunk(x, y); mapPixel(x, y); };
// Al cargar una partida, las zonas exploradas se vuelven a dibujar poco a poco (sin tirones)
let _mapQueue = [];
function queueMapTiles(keys) { _mapQueue = keys.filter(k => !MAPT.has(k)); }
function mapQueueTick() {
  for (let n = 0; n < 3 && _mapQueue.length; n++) { const [cx, cy] = ckeyXY(_mapQueue.pop()); const c = peekChunk(cx, cy); if (c) buildMapTile(c); else getChunk(cx, cy); }
}
worldReset = () => { chunks.clear(); _staleCh.clear(); chunksH.clear(); chunksQ.clear(); bchunks.clear(); chunkVer.clear(); MAPT.clear(); _mapQueue = []; FLY = []; ANIMALS = []; ui.goalDirty = true; invVersion++; };

// Dibuja las teselas visibles de una región en un contexto (se usa en minimapa y mapa grande)
function drawMapRegion(c, cxT, cyT, s, w, h) {
  const tx0 = cxT - w / 2 / s, ty0 = cyT - h / 2 / s;
  const c0 = Math.floor(tx0 / CS), c1 = Math.floor((tx0 + w / s) / CS), r0 = Math.floor(ty0 / CS), r1 = Math.floor((ty0 + h / s) / CS);
  for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
    const m = MAPT.get(ckey(cx, cy)); if (!m) continue;
    c.drawImage(m, Math.floor((cx * CS - tx0) * s), Math.floor((cy * CS - ty0) * s), Math.ceil(CS * s), Math.ceil(CS * s));
  }
}
const mini = $('mini'), miniX = mini.getContext('2d');
let miniZoom = 2;
function drawMini() {
  const w = mini.width, h = mini.height, s = miniZoom, px = S.player.x / T, py = S.player.y / T;
  miniX.imageSmoothingEnabled = false; miniX.fillStyle = '#0b0c0d'; miniX.fillRect(0, 0, w, h);
  drawMapRegion(miniX, px, py, s, w, h);
  const vw = cw / view.z / T * s, vh = ch / view.z / T * s;
  miniX.strokeStyle = 'rgba(255,255,255,.5)'; miniX.lineWidth = 1; miniX.strokeRect(w / 2 - vw / 2, h / 2 - vh / 2, vw, vh);
  for (const m of S.marks) { const mx = w / 2 + (m.x - px) * s, my = h / 2 + (m.y - py) * s; miniX.fillStyle = '#ff6b5b'; miniX.fillRect(mx - 2, my - 2, 4, 4); }
  miniX.fillStyle = '#e0b54c'; miniX.beginPath(); miniX.arc(w / 2, h / 2, 3, 0, 7); miniX.fill(); miniX.strokeStyle = '#000'; miniX.stroke();
  miniX.fillStyle = 'rgba(0,0,0,.55)'; miniX.fillRect(0, h - 16, w, 16); miniX.fillStyle = '#ece6d8'; miniX.font = '11px system-ui,sans-serif'; miniX.textAlign = 'center'; miniX.textBaseline = 'middle';
  miniX.fillText(`X ${Math.floor(px)} · Y ${Math.floor(py)}`, w / 2, h - 8);
}
mini.addEventListener('click', () => openMap());
mini.addEventListener('wheel', e => { e.preventDefault(); miniZoom = clamp(miniZoom * (e.deltaY > 0 ? 0.8 : 1.25), 0.5, 6); drawMini(); }, { passive: false });

// ---------- Mapa grande ----------
const big = $('bigmap'), bigX = big.getContext('2d');
const mv = { x: 0, y: 0, z: 3, drag: null };
function openMap() { closeModal(); ui.open = 'map'; $('mMap').hidden = false; mv.x = S.player.x / T; mv.y = S.player.y / T; sizeBig(); drawBig(); }
function sizeBig() { const r = big.getBoundingClientRect(); big.width = Math.round(r.width * dpr); big.height = Math.round(r.height * dpr); }
function drawBig() {
  if (ui.open !== 'map') return;
  const w = big.width, h = big.height, s = mv.z * dpr;
  bigX.setTransform(1, 0, 0, 1, 0, 0); bigX.imageSmoothingEnabled = false; bigX.fillStyle = '#0b0c0d'; bigX.fillRect(0, 0, w, h);
  drawMapRegion(bigX, mv.x, mv.y, s, w, h);
  const toS = (x, y) => [w / 2 + (x - mv.x) * s, h / 2 + (y - mv.y) * s];
  bigX.font = `${12 * dpr}px system-ui,sans-serif`; bigX.textAlign = 'left'; bigX.textBaseline = 'middle';
  for (const m of S.marks) { const [x, y] = toS(m.x + .5, m.y + .5); bigX.fillStyle = '#ff6b5b'; bigX.beginPath(); bigX.moveTo(x, y); bigX.lineTo(x - 5 * dpr, y - 12 * dpr); bigX.lineTo(x + 5 * dpr, y - 12 * dpr); bigX.fill(); bigX.fillStyle = '#fff'; bigX.fillText(m.n, x + 8 * dpr, y - 8 * dpr); }
  const core = L.core && L.core[0]; if (core) { const [x, y] = toS(core.x + .5, core.y + .5); bigX.fillStyle = '#fff4cc'; bigX.fillText('Núcleo', x + 8 * dpr, y); }
  const [px, py] = toS(S.player.x / T, S.player.y / T); bigX.fillStyle = '#e0b54c'; bigX.beginPath(); bigX.arc(px, py, 5 * dpr, 0, 7); bigX.fill(); bigX.strokeStyle = '#000'; bigX.lineWidth = 2; bigX.stroke();
  $('mapCoords').textContent = `Centro X ${Math.floor(mv.x)} · Y ${Math.floor(mv.y)} · zoom ×${mv.z.toFixed(1)} · ${MAPT.size} chunks explorados · ${S.marks.length} marcadores`;
}
big.addEventListener('mousedown', e => { mv.drag = { x: e.clientX, y: e.clientY, mx: mv.x, my: mv.y, moved: false, btn: e.button }; });
addEventListener('mousemove', e => { if (!mv.drag || ui.open !== 'map') return; const dx = e.clientX - mv.drag.x, dy = e.clientY - mv.drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) mv.drag.moved = true; mv.x = mv.drag.mx - dx / mv.z; mv.y = mv.drag.my - dy / mv.z; drawBig(); });
addEventListener('mouseup', e => {
  if (!mv.drag || ui.open !== 'map') { mv.drag = null; return; }
  const d = mv.drag; mv.drag = null; if (d.moved) return;
  const r = big.getBoundingClientRect(), tx = Math.floor(mv.x + (e.clientX - r.left - r.width / 2) / mv.z), ty = Math.floor(mv.y + (e.clientY - r.top - r.height / 2) / mv.z);
  if (d.btn === 2) { const i = S.marks.findIndex(m => Math.abs(m.x - tx) <= 3 && Math.abs(m.y - ty) <= 3); if (i >= 0) { S.marks.splice(i, 1); toast('Marcador quitado'); } }
  else if (d.btn === 0) { S.marks.push({ x: tx, y: ty, n: 'Marcador ' + (S.marks.length + 1) }); toast('Marcador añadido'); }
  drawBig();
});
big.addEventListener('contextmenu', e => e.preventDefault());
big.addEventListener('wheel', e => { e.preventDefault(); mv.z = clamp(mv.z * (e.deltaY > 0 ? 0.85 : 1.18), 0.3, 16); drawBig(); }, { passive: false });
addEventListener('resize', () => { if (ui.open === 'map') { sizeBig(); drawBig(); } });
