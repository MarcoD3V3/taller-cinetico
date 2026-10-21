'use strict';
// =====================================================================================
//  Árboles grandes por capas (vista cenital): cada árbol es un sprite de unas 3×4 casillas
//  pintado píxel a píxel a doble resolución: racimos de hojas con 4 tonos de luz, textura
//  de hojas, brillos, contorno, tronco con corteza y raíces, y sombra en el suelo.
//  Se dibujan detrás o delante del jugador según su altura (puedes pasar por detrás) y la
//  copa se vuelve translúcida si te tapa. De lejos se usan los árboles pequeños del suelo.
// =====================================================================================
const TREE_RES = 2, TREE_W = 104, TREE_H = 136, TREE_AX = 52, TREE_AY = 126; // en unidades del mundo
const _treeSpr = new Map(), tileTrees = new Map();
let _treeLayer = false, _treeList = null;
function treeSprite(t, v, size) {
  const key = t * 16 + v * 4 + size; let s = _treeSpr.get(key); if (s) return s;
  const tr = GI[t].tree, q = TREE_RES, W = TREE_W * q, H = TREE_H * q, cv = mkCanvas(W, H), c = cv.getContext('2d', { willReadFrequently: true });
  const k = (tr.big || tr.s === 'jungle' ? 1.18 : 1) * [0.62, 0.78, 0.9, 1][size]; // los árboles talados a medias son más pequeños
  const bx = TREE_AX * q, by = TREE_AY * q, img = c.createImageData(W, H), u = new Uint32Array(img.data.buffer);
  const put = (x, y, p) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H) u[y * W + x] = p; };
  const rect = (x, y, w, h, p) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, p); };
  // Paleta de 5 tonos con sombras azuladas y luces amarillentas (como el pixel art de referencia)
  const mixH = (h1, h2, t2) => { const x1 = hexRGB(toHex(h1)), x2 = hexRGB(h2); return '#' + x1.map((v, i) => Math.round(v + (x2[i] - v) * t2).toString(16).padStart(2, '0')).join(''); };
  const pal = (a, b) => [mixH(shade(a, -0.62), '#0c1a30', 0.35), mixH(shade(a, -0.3), '#16304a', 0.22), toHex(a), toHex(b), mixH(shade(b, 0.38), '#f4f0a0', 0.35)].map(c2 => hexPx(c2) >>> 0);
  // Racimo de hojas: contorno propio, hojas en escamas (cada una con luz arriba y sombra abajo), luz desde arriba-izquierda
  const ball = (cx, cy, rx, ry, P, seed, dim = 0) => {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, d2 = dx * dx + dy * dy; if (d2 > 1) continue;
      if (d2 > 0.86) { put(x, y, P[0]); continue; }
      // hojas sueltas e irregulares: cada celda tiene su desplazamiento y no todas brillan
      const row = Math.floor(y / 5), cxl = Math.floor((x + (row & 1) * 3 + 600) / 6), hv = hash2(cxl, row, seed), lx = (x + (row & 1) * 3 + 600) % 6, ly = (y + 500 + ((hv * 3) | 0)) % 5;
      const leaf = hv < 0.3 ? 0 : ly === 0 && lx >= 1 && lx <= 3 ? 0.38 : ly === 1 && lx >= (hv > 0.7 ? 2 : 1) && lx <= 4 ? 0.12 : ly === 4 && lx > 0 ? -0.32 : 0;
      const l = (-dx * 0.5 - dy * 0.85) + leaf + (hash2(x >> 2, y >> 2, seed) - 0.5) * 0.35 - dim;
      put(x, y, P[l > 0.72 ? 4 : l > 0.28 ? 3 : l > -0.18 ? 2 : l > -0.62 ? 1 : 0]);
    }
  };
  // Tronco: corteza con surcos, nudo, musgo, filo de luz y raíces que se abren
  const trunk = (h, w, col, birch) => {
    const P = [hexPx(shade(col, -0.55)), hexPx(shade(col, -0.28)), hexPx(col), hexPx(shade(col, 0.22)), hexPx(shade(col, 0.4))], moss = [hexPx('#3e6a2a'), hexPx('#5a8a3a')];
    const knot = 10 * q + ((hash2(t, v, 3) * h * 0.5) | 0);
    for (let y = 0; y < h; y++) {
      const ww = Math.round(w * (1 + Math.max(0, (10 - y) / 10) * 0.8)), x0 = bx - (ww >> 1);
      for (let x = 0; x < ww; x++) {
        const fx = x / ww; let p = fx < 0.18 ? 4 : fx < 0.35 ? 3 : fx > 0.8 ? 0 : fx > 0.6 ? 1 : 2;
        const groove = Math.abs(fx - (0.42 + Math.sin(y / 9) * 0.05)) < 0.06 || Math.abs(fx - (0.68 + Math.sin(y / 7 + 1) * 0.04)) < 0.05; if (groove) p = Math.max(0, p - 2);
        if (birch) { p = fx < 0.25 ? 4 : fx > 0.8 ? 1 : 3; if ((y + ((x * 5) % 7)) % 11 < 2 && x > 1 && x < ww - 2) p = 0; }
        put(x0 + x, by - y, P[p]);
        if (!birch && fx > 0.55 && y < h * 0.4 && hash2(x >> 1, y >> 1, seed + 9) < 0.35) put(x0 + x, by - y, moss[(x + y) & 1]);
      }
      if (!birch && Math.abs(y - knot) < 2 * q) { put(bx + 1, by - y, P[0]); put(bx + 2, by - y, P[0]); }
    }
    for (const s2 of [-1, 1]) for (let r = 0; r < 2; r++) for (let i = 0; i < (7 - r * 2) * q; i++) {
      const th = Math.max(q, (3 - r) * q - (i >> 1)); rect(bx + s2 * (w * 0.45 + i + r * 3 * q) - (s2 < 0 ? q : 0), by - th + 1 + r * q, q, th, P[i < 2 ? 2 : i & 1 ? 1 : 0]);
    }
  };
  const A = tr.a, B = tr.b || shade(tr.a, 0.2), P = pal(A, B), R = 30 * q * k, seed = t * 7 + v;
  switch (tr.s) {
    case 'cone': {
      trunk(18 * q * k, 7 * q, '#5a3a22');
      const tiers = 5, top = by - 118 * q * k, snow = B === '#e8f0f2';
      for (let i = 0; i < tiers; i++) {
        const yb = top + (i + 1) * (100 * q * k / tiers) + 6 * q, hw = (10 + i * 8) * q * k, hh = 30 * q * k;
        for (let y = Math.floor(yb - hh); y < yb; y++) { const f = (y - (yb - hh)) / hh, w2 = hw * f; for (let x = -w2; x <= w2; x++) { const jag = (y > yb - 4 * q) && (hash2((bx + x) >> 1, i, seed) < 0.4); if (jag) continue; const l = -x / hw * 0.7 + (1 - f) * 0.5 + (hash2((bx + x) >> 1, y >> 1, seed) - 0.5) * 0.6; put(bx + x, y, snow && f < 0.35 + hash2(x >> 2, i, 3) * 0.2 ? hexPx('#f4f8fa') : P[l > 0.6 ? 3 : l > 0.15 ? 2 : l > -0.35 ? 1 : 0]); } }
      }
      break;
    }
    case 'palm': {
      const col = hexPx('#8a6a3a'), dk = hexPx('#5a4220'); let px = bx, py = by;
      for (let i = 0; i < 70 * q * k; i++) { px = bx + Math.sin(i / (70 * q * k) * 1.4) * 14 * q; py = by - i; rect(px - 3 * q, py, 6 * q, 1, (i % (6 * q)) < q ? dk : col); }
      for (let f = 0; f < 8; f++) { const a = -Math.PI / 2 + (f - 3.5) * 0.48, len = 34 * q * k; for (let s2 = 0; s2 < len; s2++) { const t2 = s2 / len, x = px + Math.cos(a) * s2, y = py + Math.sin(a) * s2 + t2 * t2 * 22 * q, w2 = (1 - t2) * 5 * q + q; for (let o = -w2; o <= w2; o++) put(x + Math.sin(a) * o * 0.3, y + o, P[o < 0 ? 3 : o > w2 * 0.5 ? 0 : 2]); } }
      ball(px, py, 5 * q, 5 * q, pal('#6a4a2a', '#8a6a3a'), seed);
      break;
    }
    case 'dead': {
      const col = hexPx(A), dk = hexPx(shade(A, -0.35));
      trunk(40 * q * k, 8 * q, A);
      const branch = (x, y, a, len, w) => { for (let s2 = 0; s2 < len; s2++) rect(x + Math.cos(a) * s2, y + Math.sin(a) * s2, w, w, s2 & 2 ? dk : col); if (len > 8 * q) { branch(x + Math.cos(a) * len, y + Math.sin(a) * len, a - 0.5, len * 0.6, Math.max(q, w - q)); branch(x + Math.cos(a) * len, y + Math.sin(a) * len, a + 0.45, len * 0.55, Math.max(q, w - q)); } };
      branch(bx, by - 38 * q * k, -Math.PI / 2 - 0.3, 26 * q * k, 4 * q); branch(bx, by - 30 * q * k, -Math.PI / 2 + 0.6, 22 * q * k, 3 * q);
      break;
    }
    case 'mush': {
      const stem = hexPx('#e8dcc8'), sd = hexPx('#c8b8a0');
      for (let y = 0; y < 40 * q * k; y++) rect(bx - 6 * q, by - y, 12 * q, 1, y % 5 ? stem : sd);
      ball(bx, by - 46 * q * k, 34 * q * k, 20 * q * k, pal(A, shade(A, 0.15)), seed);
      for (let i = 0; i < 9; i++) ball(bx + (hash2(i, v, 5) - 0.5) * 50 * q * k, by - 52 * q * k + (hash2(i, v, 6) - 0.5) * 18 * q * k, 4 * q, 3 * q, pal('#d8d0c4', B), seed + i);
      break;
    }
    case 'crystal': {
      for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.3, len = (40 + hash2(i, v, 2) * 40) * q * k, w0 = 7 * q; for (let s2 = 0; s2 < len; s2++) { const w2 = w0 * (1 - s2 / len); for (let o = -w2; o <= w2; o++) put(bx + Math.cos(a) * s2 + o, by - 4 * q + Math.sin(a) * s2, P[o < -w2 * 0.3 ? 4 : o < w2 * 0.3 ? 2 : 0]); } }
      break;
    }
    default: { // round, jungle, flat (acacia), baobab, mangrove: copa de racimos
      const flat = tr.s === 'flat', bao = tr.s === 'baobab', mang = tr.s === 'mangrove';
      if (mang) for (let r2 = 0; r2 < 5; r2++) { const ox = (r2 - 2) * 9 * q; for (let s2 = 0; s2 < 30 * q; s2++) rect(bx + ox * (s2 / (30 * q)), by - s2 * 0.9, 2 * q, q, hexPx('#5a4030')); }
      trunk((bao ? 54 : flat ? 50 : mang ? 30 : 44) * q * k, (bao ? 22 : tr.s === 'jungle' ? 12 : 9) * q * k, tr.trunk || (bao ? '#8a7058' : '#6a4a2a'), !!tr.trunk && tr.trunk === '#e8e4dc');
      const cy = by - (bao ? 66 : flat ? 64 : 72) * q * k, rx = (flat ? 46 : bao ? 30 : 36) * q * k, ry = (flat ? 15 : bao ? 14 : 34) * q * k;
      // racimos de atrás (más oscuros), luego el grande y los de delante
      const n = flat || bao ? 6 : 10;
      for (let i = 0; i < n; i++) { const a = Math.PI * 0.95 + i / (n - 1) * Math.PI * 1.1, d = 0.62 + hash2(i, v, 1) * 0.22; ball(bx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d * 0.85, rx * (0.34 + hash2(i, v, 2) * 0.1), ry * (0.38 + hash2(i, v, 3) * 0.1), P, seed + i, 0.3); }
      ball(bx, cy, rx * 0.72, ry * 0.74, P, seed, 0.1);
      for (let i = 0; i < (flat || bao ? 4 : 7); i++) { const a = -0.3 + i / 6 * Math.PI * 1.25, d = 0.5 + hash2(i, v, 4) * 0.15; ball(bx + Math.cos(a) * rx * d * (i % 2 ? -1 : 1), cy + Math.sin(a) * ry * d * 0.9, rx * (0.3 + hash2(i, v, 5) * 0.08), ry * (0.32 + hash2(i, v, 6) * 0.08), P, seed + 20 + i, -0.05); }
      if (!flat && !bao) ball(bx - rx * 0.12, cy - ry * 0.55, rx * 0.34, ry * 0.32, P, seed + 40, -0.12);
      // brillos, frutos o flores y lianas
      const hl = P[4], fl = A === '#d880a8' ? hexPx('#ffffff') : null;
      for (let i = 0; i < 40; i++) { const x = bx + (hash2(i, v, 8) - 0.5) * rx * 1.6, y = cy + (hash2(i, v, 9) - 0.6) * ry * 1.5; if (u[(y | 0) * W + (x | 0)]) put(x, y, fl && i % 3 === 0 ? fl : hl); }
      if (tr.vine || tr.s === 'jungle') for (let i = 0; i < 6; i++) { const x = bx + (hash2(i, v, 11) - 0.5) * rx * 1.4, y0 = cy + ry * 0.4, l = (12 + hash2(i, v, 12) * 20) * q; for (let s2 = 0; s2 < l; s2++) put(x + Math.sin(s2 / 6) * q, y0 + s2, hexPx(s2 % 4 ? '#3a6a2a' : '#5a8a3a')); }
    }
  }
  c.putImageData(img, 0, 0);
  animOutline(c, W, H);
  // sombra en el suelo (debajo del contorno)
  c.globalCompositeOperation = 'destination-over'; c.fillStyle = 'rgba(0,0,0,.32)'; c.beginPath(); c.ellipse(bx + 6 * q, by - q, 30 * q * k, 9 * q * k, 0, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over';
  s = { cv, k }; _treeSpr.set(key, s); return s;
}
// Árboles visibles: los de detrás del jugador antes de dibujarlo y los de delante después
// Círculo de transparencia: cuando una copa te tapa, aparece (y desaparece) suavemente un círculo
// difuminado alrededor del personaje que deja ver lo que hay debajo de los árboles de delante.
let _xray = 0, _xrayT = 0, _treeLayerCv = null;
const XRAY_R = 46; // radio en unidades del mundo
function drawTrees(ctx, k, ox, oy, x0, y0, x1, y1, front) {
  const p = S.player, pty = p.y + 8, sm = ctx.imageSmoothingEnabled;
  // Árboles de delante: van a una capa aparte para poder recortarles el círculo
  let dc = ctx, covered = false;
  if (front) {
    const now = performance.now(), dt = Math.min(0.1, (now - (_xrayT || now)) / 1000); _xrayT = now;
    if (!_treeLayerCv || _treeLayerCv.width !== ctx.canvas.width || _treeLayerCv.height !== ctx.canvas.height) _treeLayerCv = mkCanvas(ctx.canvas.width, ctx.canvas.height);
    dc = _treeLayerCv.getContext('2d'); dc.setTransform(1, 0, 0, 1, 0, 0); dc.clearRect(0, 0, _treeLayerCv.width, _treeLayerCv.height); dc.setTransform(ctx.getTransform());
    ctx._xrDt = dt;
  }
  dc.imageSmoothingEnabled = false;
  for (let cy = Math.floor(y0 / CH); cy <= Math.floor((y1 + 5) / CH); cy++) for (let cx = Math.floor((x0 - 2) / CH); cx <= Math.floor((x1 + 2) / CH); cx++) {
    const list = tileTrees.get(chunkKey(cx, cy)); if (!list) continue;
    for (let i = 0; i < list.length; i += 4) {
      const tx = list[i], ty = list[i + 1]; if (tx < x0 - 2 || tx > x1 + 2 || ty < y0 - 1 || ty > y1 + 5) continue;
      const baseY = ty * T + 26; if ((baseY > pty) !== front) continue;
      const s = treeSprite(list[i + 2], list[i + 3] & 3, list[i + 3] >> 2);
      if (front && Math.abs(p.x - (tx * T + 16)) < 40 * s.k && pty < baseY && pty > baseY - 112 * s.k) covered = true;
      dc.drawImage(s.cv, tx * T + 16 - TREE_AX, baseY - TREE_AY, TREE_W, TREE_H);
    }
  }
  if (front) {
    // aparece y se desvanece con suavidad (≈0,2 s), con una curva sin tirones
    const target = covered ? 1 : 0; _xray += (target - _xray) * Math.min(1, (ctx._xrDt || 0.016) * 7); if (Math.abs(target - _xray) < 0.003) _xray = target;
    if (_xray > 0.01) {
      const m = ctx.getTransform(), sx = m.a * p.x + m.e, sy = m.d * (p.y - 10) + m.f, e = _xray * _xray * (3 - 2 * _xray), r = XRAY_R * m.a * (0.75 + 0.25 * e);
      dc.setTransform(1, 0, 0, 1, 0, 0); dc.globalCompositeOperation = 'destination-out';
      const g = dc.createRadialGradient(sx, sy, r * 0.15, sx, sy, r);
      g.addColorStop(0, `rgba(0,0,0,${0.82 * e})`); g.addColorStop(0.55, `rgba(0,0,0,${0.7 * e})`); g.addColorStop(0.8, `rgba(0,0,0,${0.3 * e})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      dc.fillStyle = g; dc.beginPath(); dc.arc(sx, sy, r, 0, 7); dc.fill(); dc.globalCompositeOperation = 'source-over';
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(_treeLayerCv, 0, 0); ctx.restore();
  }
  ctx.imageSmoothingEnabled = sm;
}
