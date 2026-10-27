'use strict';
// =====================================================================================
//  Niebla de las montañas: la roca y las menas que no has visto se ven oscuras (también en
//  el mapa y en la tarjeta del cursor). Se descubre lo que tienes a la vista: desde donde
//  estás, por el aire libre (llanuras, túneles que picas…), hasta unas 8 casillas, y las
//  paredes que tocan ese aire. La roca maciza tapa la vista: al picar vas descubriendo.
//  Lo descubierto se recuerda (se guarda con la partida).
// =====================================================================================
const FOG_R = 8;
const fogRock = g => (g.rock || g.dot) && !g.liquid && !g.tree;
function fogArr(c) {
  if (!c.fog) { c.fog = new Uint8Array(CS * CS); const s = S.fog && S.fog[ckey(c.cx, c.cy)]; if (s) unrle(s, c.fog); }
  return c.fog;
}
function fogHidden(x, y) {
  const c = peekChunk(x >> CSH, y >> CSH); if (!c) return false;
  const i = ((y & CMASK) << CSH) | (x & CMASK); return fogRock(GI[c.g[i]]) && !(c.fog || fogArr(c))[i];
}
function fogMark(x, y) {
  const c = getChunk(x >> CSH, y >> CSH), f = fogArr(c), i = ((y & CMASK) << CSH) | (x & CMASK);
  if (f[i]) return; f[i] = 1; c.fogD = 1; _fogVer++; if (fogRock(GI[c.g[i]])) mapPixel(x, y);
}
// Lo que se ve desde el jugador: recorrido por el aire libre (la roca corta la vista)
let _fogKey = '', _fogDirty = true, _fogVer = 0, _fogTerr = 0, _fogLitV = -1;
function fogTick() {
  const p = S.player, tx = Math.floor(p.x / T), ty = Math.floor((p.y + 5) / T), k = tx + ',' + ty;
  if (k === _fogKey && !_fogDirty) return; _fogKey = k; _fogDirty = false;
  fogFlood(tx, ty, FOG_R);
  // Las luces que has puesto también descubren la roca que alumbran (cada una, una vez por cambio del terreno)
  if (typeof L !== 'undefined' && L.light) for (const b of L.light) if (b._fogV !== _fogTerr && Math.abs(b.x - tx) < 30 && Math.abs(b.y - ty) < 30 && litOf(b) && (b._fogV = _fogTerr, true)) fogFlood(b.x, b.y, Math.min(10, (typeof lightOf === 'function' ? lightOf(b) : BD[b.type].light || 2) + 2));
}
const _ffSeen = new Uint8Array(41 * 41), _ffQ = new Int16Array(41 * 41 * 2);
function fogFlood(tx, ty, R) {
  R = Math.min(R, 20); const W = 2 * R + 1, R2 = R * R; _ffSeen.fill(0, 0, W * W); _ffSeen[R * W + R] = 1; _ffQ[0] = 0; _ffQ[1] = 0; let qh = 0, qt = 2;
  while (qh < qt) {
    const ox = _ffQ[qh++], oy = _ffQ[qh++], x = tx + ox, y = ty + oy;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) fogMark(x + dx, y + dy);
    for (let d = 0; d < 4; d++) {
      const nx = ox + DX[d], ny = oy + DY[d]; if (nx * nx + ny * ny > R2) continue;
      const si = (ny + R) * W + nx + R; if (_ffSeen[si]) continue; _ffSeen[si] = 1;
      if (!fogRock(GI[gnd(tx + nx, ty + ny)])) { _ffQ[qt++] = nx; _ffQ[qt++] = ny; }
    }
  }
}
// Guardar: los chunks con cambios en su niebla pasan a S.fog (también al descargarse)
function fogSync(c) { if (c.fog && c.fogD) { (S.fog || (S.fog = {}))[ckey(c.cx, c.cy)] = rle(c.fog); c.fogD = 0; } }
{ const s0 = serialize; serialize = () => { for (const c of WORLD.values()) fogSync(c); return s0(); }; }
{ const u0 = onChunkUnload; onChunkUnload = c => { fogSync(c); u0(c); }; }
{ const t0 = onTileChange; onTileChange = (x, y, b) => { _fogDirty = true; _fogTerr++; t0(x, y, b); }; }
// Mapa: la roca sin descubrir sale como roca oscura, sin menas
{ const m0 = mapRGB; mapRGB = (x, y, t) => fogHidden(x, y) ? [46, 44, 48] : m0(x, y, t); }
// Capa de niebla: 4 píxeles por casilla. Lo descubierto se ve entero; la primera casilla oscura
// pasa de transparente (en su borde) a negro total en su mitad; de ahí en adelante, negro.
const FOG_Q = 4, _fogCells = new Float32Array(FOG_Q);
for (let i = 0; i < FOG_Q; i++) _fogCells[i] = (i + 0.5) / FOG_Q;
let _fogCv = null, _fogImg = null;
let _fogLast = '', _fogAny = false;
function drawFog(ctx, x0, y0, x1, y1) {
  if (!S) return; fogTick();
  const w = x1 - x0 + 1, h = y1 - y0 + 1, W = w * FOG_Q, H = h * FOG_Q;
  const fk = x0 + ',' + y0 + ',' + w + ',' + h + ',' + _fogVer + ',' + _fogTerr + ',' + WORLD.size;
  if (fk === _fogLast) { if (_fogAny) { const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true; ctx.drawImage(_fogCv, 0, 0, W, H, x0 * T, y0 * T, w * T, h * T); ctx.imageSmoothingEnabled = sm; } return; }
  _fogLast = fk; _fogAny = false;
  // Mapa de casillas ocultas (con un borde de 1 para mirar vecinas)
  const hid = new Uint8Array((w + 2) * (h + 2)); let any = false;
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) if (fogHidden(x0 + x, y0 + y)) { hid[(y + 1) * (w + 2) + x + 1] = 1; any = true; }
  if (!any) return; _fogAny = true;
  if (!_fogCv || _fogCv.width < W || _fogCv.height < H) { _fogCv = mkCanvas(W + 64, H + 64); _fogImg = null; }
  const c = _fogCv.getContext('2d'); if (!_fogImg || _fogImg.width !== W || _fogImg.height !== H) _fogImg = c.createImageData(W, H);
  const u = new Uint32Array(_fogImg.data.buffer); u.fill(0);
  const col = 0x0a0b0e, H2 = 0.5; // degradado de media casilla
  for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
    const hi = (ty + 1) * (w + 2) + tx + 1; if (!hid[hi]) continue;
    // Distancia (en casillas) a la casilla descubierta más cercana, para cada píxel
    const nb = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && !hid[hi + dy * (w + 2) + dx]) nb.push(dx, dy);
    for (let sy = 0; sy < FOG_Q; sy++) for (let sx = 0; sx < FOG_Q; sx++) {
      let a = 1;
      if (nb.length) { const fx = _fogCells[sx], fy = _fogCells[sy]; let dmin = 9;
        for (let k = 0; k < nb.length; k += 2) { const dx = nb[k], dy = nb[k + 1], ex = dx < 0 ? fx : dx > 0 ? 1 - fx : 0, ey = dy < 0 ? fy : dy > 0 ? 1 - fy : 0, d = Math.sqrt(ex * ex + ey * ey); if (d < dmin) dmin = d; }
        const t = Math.min(1, dmin / H2); a = t * t * (3 - 2 * t); }
      u[(ty * FOG_Q + sy) * W + tx * FOG_Q + sx] = ((Math.round(a * 255) << 24) | col) >>> 0;
    }
  }
  c.putImageData(_fogImg, 0, 0);
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = true;
  ctx.drawImage(_fogCv, 0, 0, W, H, x0 * T, y0 * T, w * T, h * T); ctx.imageSmoothingEnabled = sm;
}
