'use strict';
// =====================================================================================
//  Agua viva: todo con píxeles dibujados por código (sin imágenes ni sprites nuevos).
//  · Profundidad: al construir cada trozo de suelo, el agua junto a la orilla se aclara (fondo
//    de arena, turquesa) y la de lejos se oscurece, en bandas con tramado de píxeles.
//  · Superficie: el mar tiene oleaje que se desplaza y destellos; los lagos, ríos y pantanos
//    (agua quieta) apenas se mueven: algún reflejo suave y ondas cuando algo toca el agua.
//  · Orillas del mar: las olas llegan, rompen en espuma, mojan la arena y se retiran.
//  · Vida: bancos de peces bajo el agua, algas y praderas marinas que ondulan, corales,
//    medusas, burbujas y espuma en mar abierto; en los lagos nenúfares, lentejas de agua,
//    juncos con espadañas, hojas flotando y algún pez.
//  Barato: las máscaras y listas se calculan una vez por trozo; cada fotograma solo se copian
//  patrones ya hechos y unos pocos rectángulos. Opciones › Efectos › Agua animada.
// =====================================================================================
const AGUA = { d: new Map(), init: false, pat: [[], []], F: 24 };
const WFX_NB = CH * T / 4, WFX_NC = CH * T / 2, WFX_M = 6;   // bloques de 4 px, celdas de 2 px, márgenes

// ---------- utilidades ----------
const wfxIsWater = g => g.liquid === 'water';
function wfxSpr(rows, pal, flip) {
  const h = rows.length, w = rows[0].length, cv = mkCanvas(w, h), c = cv.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = pal[rows[y][flip ? w - 1 - x : x]]; if (p) { c.fillStyle = p; c.fillRect(x, y, 1, 1); } }
  return cv;
}
// Distancia (chaflán 1 / 1.41) a las celdas con src=1, en una rejilla n×n
function wfxChamfer(src, n, out) {
  const BIG = 1e4, D2 = 1.4142;
  for (let i = 0; i < n * n; i++) out[i] = src[i] ? 0 : BIG;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = y * n + x; let v = out[i]; if (v === 0) continue; let q;
    if (x > 0 && (q = out[i - 1] + 1) < v) v = q;
    if (y > 0) { if ((q = out[i - n] + 1) < v) v = q; if (x > 0 && (q = out[i - n - 1] + D2) < v) v = q; if (x < n - 1 && (q = out[i - n + 1] + D2) < v) v = q; }
    out[i] = v; }
  for (let y = n - 1; y >= 0; y--) for (let x = n - 1; x >= 0; x--) { const i = y * n + x; let v = out[i]; if (v === 0) continue; let q;
    if (x < n - 1 && (q = out[i + 1] + 1) < v) v = q;
    if (y < n - 1) { if ((q = out[i + n] + 1) < v) v = q; if (x < n - 1 && (q = out[i + n + 1] + D2) < v) v = q; if (x > 0 && (q = out[i + n - 1] + D2) < v) v = q; }
    out[i] = v; }
  return out;
}

// ---------- patrones animados de la superficie (128×128, se repiten sin costuras) ----------
function wfxFrame(calm, f) {
  const S = 128, cv = mkCanvas(S, S), c = cv.getContext('2d'), img = c.createImageData(S, S), d = img.data, p = f / AGUA.F, TAU = Math.PI * 2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    // crestas: rayas horizontales de 1 píxel que ondulan y bajan despacio, cortadas en rayitas
    const u = x / S, v = y / S, fr = q => q - Math.floor(q);
    let a = 0, col = 255;
    if (!calm) {
      const m = fr(8 * v + 2 * u + 0.06 * Math.sin(TAU * (3 * u + p)) - p), cut = Math.sin(TAU * (7 * u - 2 * v + 2 * p) + 1.3 * Math.sin(TAU * (2 * u + 3 * v)));
      const m2 = fr(16 * v - 3 * u + 0.5 + 0.04 * Math.sin(TAU * (5 * u - 2 * p)) - 2 * p), cut2 = Math.sin(TAU * (11 * u + 3 * v - 3 * p));
      if (m < 1 / 16 && cut > -0.25) a = cut > 0.6 ? 0.42 : 0.26;
      else if (m < 2 / 16 && cut > -0.25) { a = 0.1; col = 0; }
      else if (m2 < 1 / 8 && cut2 > 0.55) a = 0.13;
    } else {
      const m = fr(4 * v + u + 0.05 * Math.sin(TAU * (2 * u + p)) - p), cut = Math.sin(TAU * (5 * u - v + p) + 1.1 * Math.sin(TAU * (u + 2 * v)));
      if (m < 1 / 32 && cut > 0.55) a = 0.13;
    }
    if (!a) continue;
    const i = (y * S + x) * 4; d[i] = col ? 255 : 0; d[i + 1] = col ? 255 : 14; d[i + 2] = col ? 255 : 40; d[i + 3] = a * 255;
  }
  c.putImageData(img, 0, 0); return cv;
}
function wfxRing(r) { // onda: anillo de píxeles achatado (perspectiva)
  const w = 2 * r + 3, h = Math.round(r * 1.2) + 3, cv = mkCanvas(w, h), c = cv.getContext('2d'), cx = w / 2, cy = h / 2, ry = r * 0.6;
  c.fillStyle = '#fff';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const e = Math.hypot((x + 0.5 - cx) / r, (y + 0.5 - cy) / Math.max(0.6, ry)); if (Math.abs(e - 1) < 0.5 / Math.max(1, r * 0.6) + 0.12) c.fillRect(x, y, 1, 1); }
  return cv;
}
function wfxInit() {
  if (AGUA.init) return; AGUA.init = true;
  for (let f = 0; f < AGUA.F; f++) { AGUA.pat[0].push(wfxFrame(false, f)); AGUA.pat[1].push(wfxFrame(true, f)); }
  AGUA.sc = mkCanvas(CH * T, CH * T); AGUA.sx = AGUA.sc.getContext('2d'); AGUA.sx.imageSmoothingEnabled = false;
  AGUA.sbc = mkCanvas(WFX_NC, WFX_NC); AGUA.sbx = AGUA.sbc.getContext('2d'); AGUA.sbi = AGUA.sbx.createImageData(WFX_NC, WFX_NC); AGUA.sb = new Uint32Array(AGUA.sbi.data.buffer);

  AGUA.pp = [AGUA.pat[0].map(cv => ctx.createPattern(cv, 'repeat')), AGUA.pat[1].map(cv => ctx.createPattern(cv, 'repeat'))];
  AGUA.rings = []; for (let r = 1; r <= 8; r++) AGUA.rings.push(wfxRing(r));
  // peces vistos desde arriba: sombra oscura (bajo el agua) · 2 posturas de cola · mirando a izquierda y derecha
  const fp = { X: 'rgba(8,22,40,.42)', o: 'rgba(8,22,40,.25)' };
  const fA = ['X..XXX..', 'XXXXXXXo', 'X..XXX..'], fB = ['.X.XXX..', '.XXXXXXo', '.X.XXX..'];
  const sA = ['X.XX.', 'XXXXo', 'X.XX.'], sB = ['.XXX.', 'XXXXo', '.XXX.'];
  AGUA.fish = [[wfxSpr(fA, fp), wfxSpr(fB, fp)], [wfxSpr(fA, fp, 1), wfxSpr(fB, fp, 1)]];
  AGUA.sfish = [[wfxSpr(sA, fp), wfxSpr(sB, fp)], [wfxSpr(sA, fp, 1), wfxSpr(sB, fp, 1)]];
  AGUA.silver = 'rgba(220,240,255,.55)';
  // medusa translúcida que late
  const jp = { m: 'rgba(240,170,240,.5)', l: 'rgba(255,225,255,.65)', t: 'rgba(240,170,240,.3)' };
  AGUA.jelly = [wfxSpr(['.mmm.', 'mllmm', 'mmmmm', 't.t.t', '.t.t.'], jp), wfxSpr(['.....', '.mmm.', 'mllmm', 'mmmmm', 't.t.t'], jp)];
  // nenúfares (varios dibujos) y flor
  const lp = { a: '#4f8f3c', b: '#3c7a31', c: '#2c5a26', h: '#79b257', p: '#f4a6cc', w: '#fff0f6', y: '#f4dc4a' };
  AGUA.lily = [
    wfxSpr(['..bbbb..', '.bhaabb.', 'bhaa.bbb', 'baa..bbc', '.baabbc.', '..cccc..'], lp),
    wfxSpr(['.bbbb.', 'bhab.b', 'baa..c', '.bbbc.', '..cc..'], lp),
    wfxSpr(['..bbb...', '.bhaabb.', 'bhaaabbb', 'baaaa..c', '.bbaa.c.', '..cccc..'], lp),
    wfxSpr(['..pwp...', '.bpypbb.', 'bhpwpbbb', 'baaa..bc', '.baabbc.', '..cccc..'], lp)];
  // corales (ramitas de píxeles) en varios colores
  AGUA.coral = [];
  const cc = [['#ff7f86', '#ffb0b0'], ['#ffad5a', '#ffd79a'], ['#d86ad0', '#f2a8ec'], ['#6ad8c8', '#b0f4ea'], ['#f4e27a', '#fff4b8']];
  for (let i = 0; i < 10; i++) {
    const cv = mkCanvas(9, 9), c = cv.getContext('2d'), [a, b] = cc[i % cc.length];
    c.globalAlpha = 0.85; c.fillStyle = a;
    for (let br = 0; br < 3 + (i % 2); br++) { let x = 4, y = 8; for (let s = 0; s < 6; s++) { c.fillRect(x, y, 1, 1); y--; x += ((hash2(i, br * 7 + s, 77) * 3) | 0) - 1; x = Math.max(0, Math.min(8, x)); } c.fillStyle = b; c.fillRect(x, y + 1, 1, 1); c.fillStyle = a; }
    AGUA.coral.push(cv);
  }
}

// ---------- datos por trozo de suelo (se calculan al construirlo) ----------
const WFX_PAL = { // bandas de profundidad: [mezclar hacia color, cuánto] o [null, multiplicar]
  sea: [[[206, 214, 176], 0.42], [[120, 202, 206], 0.3], [[104, 184, 204], 0.15], null, [null, 0.9], [null, 0.8]],
  cold: [[[184, 204, 210], 0.4], [[150, 196, 218], 0.26], [[126, 176, 210], 0.13], null, [null, 0.9], [null, 0.8]],
  lake: [[[146, 156, 112], 0.34], [[98, 156, 156], 0.17], null, [null, 0.94], [null, 0.87], [null, 0.82]],
  swamp: [[[104, 100, 60], 0.34], [[84, 98, 62], 0.15], null, [null, 0.92], [null, 0.86], [null, 0.82]]
};
const WFX_TH = { sea: [0.18, 0.5, 1.2, 2.6, 5], lake: [0.15, 0.45, 1.1, 2.4, 4] };
const WFX_BAY = [0.125, 0.625, 0.875, 0.375];
// Masa de agua grande (mar, o lago enorme con playa) o pequeña (lago, charca, río): cuánta agua hay
// alrededor, en una rejilla gruesa de 8 casillas (se guarda: se calcula una sola vez por zona)
const _wfxOpen = new Map(), _wfxOpenM = new Map();
function wfxOpen(cx, cy) {
  const k = cx * 100003 + cy; let v = _wfxOpen.get(k); if (v !== undefined) return v;
  let w = 0, n = 0; for (let dy = -20; dy <= 20; dy += 5) for (let dx = -20; dx <= 20; dx += 5) { n++; if (GI[gnd(cx * 8 + 4 + dx, cy * 8 + 4 + dy)].liquid === 'water') w++; }
  v = w / n; if (_wfxOpen.size > 30000) _wfxOpen.clear(); _wfxOpen.set(k, v); return v;
}
// el valor más alto en 2 celdas a la redonda: la orilla de un mar no se queda como lago
function wfxOpenMax(x, y) {
  const cx = x >> 3, cy = y >> 3, k = cx * 100003 + cy; let m = _wfxOpenM.get(k); if (m !== undefined) return m;
  m = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) m = Math.max(m, wfxOpen(cx + dx, cy + dy));
  if (_wfxOpenM.size > 30000) _wfxOpenM.clear(); _wfxOpenM.set(k, m); return m;
}
const WFX_PALK = ['sea', 'cold', 'lake', 'swamp'];
// Todo se calcula en bloques de 4 px (como las transiciones del suelo); solo la espuma usa celdas de 2 px
function wfxBuild(u, W, x0, y0) {
  const key = chunkKey(x0 / CH, y0 / CH), M = WFX_M, R = CH + 2 * M;
  const kindT = new Uint8Array(R * R), palT = new Uint8Array(R * R); let any = false, warmN = 0;
  for (let ty = 0; ty < R; ty++) for (let tx = 0; tx < R; tx++) {
    const gx = x0 - M + tx, gy = y0 - M + ty, t = baseTile(gnd(gx, gy)), g = GI[t]; if (g.liquid !== 'water') continue;
    const inside = tx >= M && ty >= M && tx < M + CH && ty < M + CH;
    const sw = g.key === 'SWAMPWATER', b = BIOMES[biomeOf(gx, gy)], sea = !sw && ((b && b.ocean) || g.kelp || g.coral || g.key === 'DEEP' || wfxOpenMax(gx, gy) > 0.5), i = ty * R + tx;
    kindT[i] = sea ? 1 : 2; palT[i] = sea ? (g.key === 'COLDWATER' ? 1 : 0) : (sw ? 3 : 2);
    if (inside) { any = true; if (g.coral || g.key === 'WARMWATER') warmN++; }
  }
  if (!any) { AGUA.d.delete(key); return; }
  const tmpT = new Uint8Array(R * R); for (let i = 0; i < R * R; i++) tmpT[i] = kindT[i] ? 0 : 1;
  const dT = wfxChamfer(tmpT, R, new Float32Array(R * R));          // casillas hasta la tierra
  // bloques de 4 px que siguen siendo agua tras las transiciones (la tierra entra en el agua en bloques)
  const NB = WFX_NB, bm = new Uint8Array(NB * NB);
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
    const k = kindT[(ty + M) * R + tx + M]; if (!k) continue;
    const gx = x0 + tx, gy = y0 + ty, t0 = gnd(gx, gy), g0 = GI[t0], tv = (hash2(gx, gy, 51) * TEX_VARS) | 0;
    const src = g0.kelp ? kelpTexPx(kelpUnder(gx, gy), tv) : tileTexPx(baseTile(t0), tv);
    for (let by = 0; by < 8; by++) for (let bx = 0; bx < 8; bx++) { const px = bx * 4 + 1, py = by * 4 + 1; if (u[(ty * T + py) * W + tx * T + px] === src[py * T + px]) bm[(ty * 8 + by) * NB + tx * 8 + bx] = k; }
  }
  // rejilla de bloques con margen (fuera del trozo, por casillas) y distancias a tierra / mar / agua quieta
  const MB = 6, NG = NB + 2 * MB, wat = new Uint8Array(NG * NG);
  for (let gy = 0; gy < NG; gy++) for (let gx = 0; gx < NG; gx++) { const lx = gx - MB, ly = gy - MB;
    wat[gy * NG + gx] = lx >= 0 && ly >= 0 && lx < NB && ly < NB ? bm[ly * NB + lx] : kindT[((ly >> 3) + M) * R + (lx >> 3) + M]; }
  const tmp = new Uint8Array(NG * NG);
  for (let i = 0; i < tmp.length; i++) tmp[i] = wat[i] ? 0 : 1; const cdB = wfxChamfer(tmp, NG, new Float32Array(NG * NG));
  let anyS = false, anyC = false, nearS = false, nearC = false;
  for (let i = 0; i < NB * NB; i++) { if (bm[i] === 1) anyS = true; else if (bm[i] === 2) anyC = true; }
  for (let i = 0; i < wat.length; i++) { if (wat[i] === 1) nearS = true; else if (wat[i] === 2) nearC = true; }
  for (let i = 0; i < tmp.length; i++) tmp[i] = wat[i] === 1 ? 1 : 0; const wsB = nearS ? wfxChamfer(tmp, NG, new Float32Array(NG * NG)) : null;
  for (let i = 0; i < tmp.length; i++) tmp[i] = wat[i] === 2 ? 1 : 0; const wcB = nearC ? wfxChamfer(tmp, NG, new Float32Array(NG * NG)) : null;
  // profundidad por bloque (en casillas): fina junto a la orilla, suave mar adentro
  const cdq = new Uint8Array(NB * NB), depB = new Float32Array(NB * NB);
  for (let ly = 0; ly < NB; ly++) for (let lx = 0; lx < NB; lx++) {
    const i = ly * NB + lx; if (!bm[i]) continue; const c = cdB[(ly + MB) * NG + lx + MB];
    cdq[i] = Math.min(255, Math.round(c * 8));                        // en cuartos de celda (2 celdas por bloque)
    const fx = (lx + 0.5) / 8 - 0.5 + M, fy = (ly + 0.5) / 8 - 0.5 + M, ix = fx | 0, iy = fy | 0, ax = fx - ix, ay = fy - iy;
    const q00 = dT[iy * R + ix], q10 = dT[iy * R + ix + 1], q01 = dT[(iy + 1) * R + ix], q11 = dT[(iy + 1) * R + ix + 1];
    const v = (q00 * (1 - ax) + q10 * ax) * (1 - ay) + (q01 * (1 - ax) + q11 * ax) * ay - 0.5;
    depB[i] = Math.min(c / 8, Math.max(0, v));
  }
  // sombreado de profundidad: tramos por fila de celdas de 2 px, una capa de color por banda (se pinta en wfxPaint)
  const shade = new Map(), N = WFX_NC;
  const bandCol = (pal, b) => { const sp = WFX_PAL[WFX_PALK[pal]][b]; return !sp ? null : sp[0] ? `rgba(${sp[0][0]},${sp[0][1]},${sp[0][2]},${sp[1]})` : `rgba(0,8,26,${(1 - sp[1]).toFixed(3)})`; };
  for (let ly = 0; ly < N; ly++) { let runK = -1, runS = 0;
    for (let lx = 0; lx <= N; lx++) { let kk = -1;
      if (lx < N) { const bi = (ly >> 1) * NB + (lx >> 1), k = bm[bi];
        if (k) { const pal = palT[((ly >> 4) + M) * R + (lx >> 4) + M], th = k === 1 ? WFX_TH.sea : WFX_TH.lake, Dd = depB[bi] * (1 + (WFX_BAY[(ly & 1) * 2 + (lx & 1)] - 0.5) * 0.14);
          let b = 0; while (b < th.length && Dd >= th[b]) b++; kk = pal * 8 + b; } }
      if (kk !== runK) { if (runK >= 0) { let e = shade.get(runK); if (e === undefined) { const col = bandCol(runK >> 3, runK & 7); e = col ? { col, p: new Path2D() } : null; shade.set(runK, e); } if (e) e.p.rect(runS * 2, ly * 2, (lx - runS) * 2, 2); } runK = kk; runS = lx; }
    } }
  // listas de la orilla (celdas de 2 px; distancias interpoladas de los bloques)
  const bil = (F, lx, ly) => { const fx = lx / 2 - 0.25 + MB, fy = ly / 2 - 0.25 + MB, ix = fx | 0, iy = fy | 0, ax = fx - ix, ay = fy - iy, i = iy * NG + ix;
    return ((F[i] * (1 - ax) + F[i + 1] * ax) * (1 - ay) + (F[i + NG] * (1 - ax) + F[i + NG + 1] * ax) * ay) * 2; };
  const shoreS = [], wetS = [], shoreC = [], wetC = [];
  const off = (wx, wy) => 0.18 * Math.sin(wx * 0.011) + 0.18 * Math.sin(wy * 0.013 + 1.7) + 0.1 * Math.sin((wx + wy) * 0.031);
  for (let by = 0; by < NB; by++) for (let bx = 0; bx < NB; bx++) {
    const gi = (by + MB) * NG + bx + MB, k = bm[by * NB + bx];
    if (k === 1 ? cdB[gi] > 5.6 : k === 2 ? cdB[gi] > 2 : !((wsB && wsB[gi] <= 2.3) || (wcB && wcB[gi] <= 1.3))) continue; // lejos de la orilla: nada
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
      const lx = bx * 2 + sx, ly = by * 2 + sy, wx = x0 * T + lx * 2, wy = y0 * T + ly * 2;
      if (k === 1) { const c = Math.max(1, bil(cdB, lx, ly) - 1); if (c <= 10) shoreS.push(lx, ly, Math.round(c * 4), Math.round(off(wx, wy) * 1000)); }
      else if (k === 2) { const c = Math.max(1, bil(cdB, lx, ly) - 1); if (c <= 3) shoreC.push(lx, ly, Math.round(c * 4), Math.round(hash2(lx >> 2, ly >> 2, x0 + y0 * 7) * 6283)); }
      else { const ws = wsB ? Math.max(0.5, bil(wsB, lx, ly) - 1) : 99; if (ws <= 3.6) wetS.push(lx, ly, Math.round(ws * 4), Math.round(off(wx, wy) * 1000));
        else if (wcB) { const wc = Math.max(0.5, bil(wcB, lx, ly) - 1); if (wc <= 1.5) wetC.push(lx, ly, Math.round(wc * 4), 0); } }
    }
  }
  // la forma del agua (un píxel por bloque) para recortar el oleaje
  const mkP = kind => { const P = new Path2D(); for (let by = 0; by < NB; by++) { let bx = 0; while (bx < NB) { if (bm[by * NB + bx] !== kind) { bx++; continue; } const s0 = bx; while (bx < NB && bm[by * NB + bx] === kind) bx++; P.rect(s0 * 4, by * 4, (bx - s0) * 4, 4); } } return P; };
  const seaP = anyS ? mkP(1) : null, calmP = anyC ? mkP(2) : null;
  // vida y plantas fijas, y emisores animados (peces, ondas, burbujas…)
  const life = [], fish = [], emit = [], h = (x, y, s) => hash2(x, y, s);
  const seaTiles = [], calmTiles = [];
  for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
    const bi = (ty * 8 + 4) * NB + tx * 8 + 4, k = bm[bi]; if (!k) continue;
    const D = depB[bi], gx = x0 + tx, gy = y0 + ty, g = GI[gnd(gx, gy)], X = tx * T, Y = ty * T, r = h(gx, gy, 301);
    if (k === 1) {
      seaTiles.push([X + 16, Y + 16, D]);
      if (g.kelp) for (let n = 0; n < 4; n++) life.push({ t: 'kelp', x: X + 4 + h(gx, gy, 310 + n) * 24, y: Y + 10 + h(gx, gy, 320 + n) * 20, n: 9 + h(gx, gy, 330 + n) * 9, s: h(gx, gy, 340 + n) });
      else if (D > 0.3 && D < 2.6 && r < 0.12) for (let n = 0; n < 3 + (r * 30 | 0) % 3; n++) life.push({ t: 'grass', x: X + 6 + h(gx, gy, 350 + n) * 20, y: Y + 10 + h(gx, gy, 360 + n) * 18, n: 4 + h(gx, gy, 370 + n) * 5, s: h(gx, gy, 380 + n) });
      if ((g.coral || g.key === 'WARMWATER') && D > 0.25 && D < 3.2 && h(gx, gy, 302) < (g.coral ? 0.6 : 0.14)) for (let n = 0; n < 1 + (g.coral ? 2 : 0); n++) life.push({ t: 'coral', x: X + 3 + h(gx, gy, 390 + n) * 20, y: Y + 3 + h(gx, gy, 395 + n) * 20, v: (h(gx, gy, 399 + n) * 10) | 0 });
      if (D > 2.2 && h(gx, gy, 303) < 0.05) emit.push({ t: 'cap', x: X + 4 + h(gx, gy, 304) * 22, y: Y + 4 + h(gx, gy, 305) * 22, p: 2.5 + h(gx, gy, 306) * 3, o: h(gx, gy, 307) * 9 });
      if (D > 0.8 && h(gx, gy, 308) < 0.04) emit.push({ t: 'bub', x: X + 4 + h(gx, gy, 309) * 22, y: Y + 8 + h(gx, gy, 311) * 20, p: 2.5 + h(gx, gy, 312) * 4, o: h(gx, gy, 313) * 9 });
    } else {
      calmTiles.push([X + 16, Y + 16, D]);
      const sw = g.key === 'SWAMPWATER';
      if (D > 0.4 && r < (sw ? 0.16 : 0.07)) life.push({ t: 'lily', x: X + 4 + h(gx, gy, 410) * 18, y: Y + 4 + h(gx, gy, 411) * 18, v: (h(gx, gy, 412) * 4) | 0, s: h(gx, gy, 413) });
      else if (D < 0.75 && r > 0.8) life.push({ t: 'reed', x: X + 6 + h(gx, gy, 420) * 20, y: Y + 14 + h(gx, gy, 421) * 14, n: 3 + (h(gx, gy, 422) * 3 | 0), s: h(gx, gy, 423), cat: h(gx, gy, 424) < 0.6 });
      else if (r > 0.7 && r < 0.75 + (sw ? 0.05 : 0)) life.push({ t: 'duck', x: X + 4 + h(gx, gy, 430) * 20, y: Y + 4 + h(gx, gy, 431) * 20, s: h(gx, gy, 432) });
      else if (D > 0.6 && r > 0.6 && r < 0.62) life.push({ t: 'leaf', x: X + 8 + h(gx, gy, 440) * 16, y: Y + 8 + h(gx, gy, 441) * 16, s: h(gx, gy, 442) });
      if (D > 0.5 && h(gx, gy, 450) < 0.06) emit.push({ t: 'ring', x: X + 6 + h(gx, gy, 451) * 20, y: Y + 6 + h(gx, gy, 452) * 20, p: 4 + h(gx, gy, 453) * 6, o: h(gx, gy, 454) * 9 });
    }
  }
  const seed = hash2(x0, y0, 501), pickIn = (arr, minD, s) => { const ok = arr.filter(a => a[2] >= minD && a[0] > 40 && a[1] > 40 && a[0] < CH * T - 40 && a[1] < CH * T - 40); return ok.length ? ok[(hash2(x0, y0, s) * ok.length) | 0] : null; };
  const nS = Math.min(3, Math.floor(seaTiles.length / 50)), nC = Math.min(2, Math.floor(calmTiles.length / 30));
  for (let i = 0; i < nS; i++) { const c = pickIn(seaTiles, 1, 510 + i); if (c) fish.push({ x: c[0], y: c[1], r: 18 + hash2(x0, y0, 520 + i) * 24, w: 0.12 + hash2(x0, y0, 530 + i) * 0.1, s: hash2(x0, y0, 540 + i) * 6.28, n: 4 + ((hash2(x0, y0, 550 + i) * 5) | 0), small: 1 }); }
  if (seaTiles.length > 60 && (warmN > 20 || seed < 0.3)) { const c = pickIn(seaTiles, 1.5, 560); if (c) emit.push({ t: 'jelly', x: c[0], y: c[1], r: 14, s: seed * 6.28 }); }
  for (let i = 0; i < nC; i++) { const c = pickIn(calmTiles, 0.8, 570 + i); if (c) fish.push({ x: c[0], y: c[1], r: 10 + hash2(x0, y0, 580 + i) * 14, w: 0.07 + hash2(x0, y0, 590 + i) * 0.06, s: hash2(x0, y0, 600 + i) * 6.28, n: 1, small: 0 }); }
  if (AGUA.d.size > 90) AGUA.d.delete(AGUA.d.keys().next().value);
  let full = !anyC && !shoreS.length && !wetS.length; if (full) for (let i = 0; i < NB * NB; i++) if (bm[i] !== 1) { full = false; break; }
  AGUA.d.set(key, { seaP, calmP, cdq, shade: [...shade.values()].filter(Boolean), shoreS: Int16Array.from(shoreS), wetS: Int16Array.from(wetS), shoreC: Int16Array.from(shoreC), wetC: Int16Array.from(wetC), life, fish, emit, sea: anyS, calm: anyC, ph: hash2(x0, y0, 777), fullSea: full });
}
// tras volcar los píxeles del trozo: capas de color de la profundidad (una por banda)
function wfxPaint(c, x0, y0) {
  const d = AGUA.d.get(chunkKey(x0 / CH, y0 / CH)); if (!d || !d.shade) return;
  for (const e of d.shade) { c.fillStyle = e.col; c.fill(e.p); }
  d.shade = null;
}
{ const f0 = blendEdges; blendEdges = (u, W, x0, y0) => { f0(u, W, x0, y0); try { wfxBuild(u, W, x0, y0); } catch (e) { console.warn('agua', e); } }; }

// ---------- dibujo por fotograma ----------
function wfxWater(d, x, y, minQ) { const bx = x >> 2, by = y >> 2; return bx >= 0 && by >= 0 && bx < WFX_NB && by < WFX_NB && d.cdq[by * WFX_NB + bx] >= minQ; }
function wfxUnder(c, X, Y, d, t) {
  // algas y praderas marinas que ondulan con la corriente (no con el viento)
  for (const o of d.life) {
    if (o.t === 'kelp' || o.t === 'grass') {
      const n = Math.round(o.n), kelp = o.t === 'kelp', bx = Math.round(X + o.x), by = Math.round(Y + o.y);
      for (let j = 0; j < n; j++) { const q = j / n, sx = Math.round(Math.sin(t * (kelp ? 0.9 : 1.4) + o.s * 6.28 + j * 0.35) * q * (kelp ? 2.6 : 1.6));
        c.fillStyle = kelp ? (j & 1 ? 'rgba(52,104,58,.8)' : 'rgba(36,82,48,.8)') : (j & 1 ? 'rgba(76,138,84,.7)' : 'rgba(58,116,72,.7)'); c.fillRect(bx + sx, by - j, 1, 1);
        if (kelp && j > 2 && j % 3 === 0) { c.fillStyle = 'rgba(78,132,70,.75)'; c.fillRect(bx + sx + ((j & 2) ? 1 : -1), by - j, 1, 1); } }
    } else if (o.t === 'coral') c.drawImage(AGUA.coral[o.v], Math.round(X + o.x), Math.round(Y + o.y));
  }
  // peces
  for (const f of d.fish) {
    const a = t * f.w * 6.28 + f.s, px = f.x + Math.sin(a) * f.r, py = f.y + Math.sin(a * 1.31 + f.s) * f.r * 0.55, dir = Math.cos(a) >= 0 ? 0 : 1, fr = ((t * (f.small ? 6 : 3) + f.s) | 0) & 1;
    for (let i = 0; i < f.n; i++) {
      const ox = f.small ? (hash2(i, 1, f.s * 99) - 0.5) * 18 + Math.sin(t * 2 + i) * 1.2 : 0, oy = f.small ? (hash2(i, 2, f.s * 99) - 0.5) * 10 + Math.cos(t * 1.7 + i) : 0;
      const x = Math.round(px + ox), y = Math.round(py + oy); if (!wfxWater(d, x, y, 8) || !wfxWater(d, x + 6, y, 8)) continue;
      const spr = (f.small ? AGUA.sfish : AGUA.fish)[dir][(fr + i) & 1]; c.drawImage(spr, X + x, Y + y);
      if (f.small && ((t * 3 + i * 1.7) % 7) < 0.25) { c.fillStyle = AGUA.silver; c.fillRect(X + x + 2, Y + y + 1, 1, 1); } // destello al girar
    }
  }
  for (const e of d.emit) if (e.t === 'jelly') {
    const x = Math.round(e.x + Math.sin(t * 0.15 + e.s) * e.r), y = Math.round(e.y + Math.sin(t * 0.11 + e.s * 2) * e.r * 0.7 - Math.max(0, Math.sin(t * 1.6)) * 1.5);
    if (wfxWater(d, x, y, 12)) c.drawImage(AGUA.jelly[((t * 1.6 / Math.PI) | 0) & 1], X + x, Y + y);
  }
}
// Oleaje: el patrón del fotograma recortado con la forma del agua, directo en pantalla (es lo más barato)
function wfxSurface(c, X, Y, d, t) {
  const S = CH * T, fs = Math.floor(t * 7) % AGUA.F, fc = Math.floor(t * 2.2) % AGUA.F;
  c.save(); c.translate(X, Y);
  if (d.fullSea) { c.fillStyle = AGUA.pp[0][fs]; c.fillRect(0, 0, S, S); c.restore(); return; }
  if (d.seaP) { c.save(); c.clip(d.seaP); c.fillStyle = AGUA.pp[0][fs]; c.fillRect(0, 0, S, S); c.restore(); }
  if (d.calmP) { c.save(); c.clip(d.calmP); c.fillStyle = AGUA.pp[1][fc]; c.fillRect(0, 0, S, S); c.restore(); }
  c.restore();
}
function wfxTop(c, X, Y, d, t) {
  // olas en la orilla del mar: llegan, rompen en espuma, mojan la arena y se retiran
  const N = WFX_NC, buf = AGUA.sb; buf.fill(0);
  const P = (lx, ly, v) => { buf[ly * N + lx] = v; };
  const C_WET = (31 << 24) | (20 << 16) | (30 << 8) | 40, C_WET2 = (51 << 24) | (16 << 16) | (24 << 8) | 30, C_LITE = (41 << 24) | (250 << 16) | (240 << 8) | 210, C_SOFT = (107 << 24) | (255 << 16) | (250 << 8) | 240, C_FOAM = (224 << 24) | (255 << 16) | (253 << 8) | 250;
  const phase = o => { const p = t / 6.5 + o / 1000; return p - Math.floor(p); };
  const front = s => s < 0.62 ? 9.5 * Math.pow(1 - s / 0.62, 1.4) + 0.6 : 0.6 + (s - 0.62) / 0.38 * 3.5;
  const tk5 = Math.floor(t * 5), tk2 = Math.floor(t * 2), sd = d.ph * 9973 | 0;
  let a = d.wetS;
  for (let i = 0; i < a.length; i += 4) {
    const lx = a[i], ly = a[i + 1], wd = a[i + 2] / 4, s = phase(a[i + 3]);
    const reach = s < 0.5 ? 0 : s < 0.62 ? (s - 0.5) / 0.12 * 2.6 : 2.6 * (1 - (s - 0.62) / 0.38) + 0.6 * ((s - 0.62) / 0.38);
    if (wd <= reach + 0.2) P(lx, ly, s < 0.66 && Math.abs(wd - reach) < 0.7 && ihash(lx + tk5, ly * 3) > 0.25 ? C_FOAM : wd < 1.2 ? C_WET2 : C_WET);
    else if (wd < 1.1) P(lx, ly, C_WET);
  }
  a = d.wetC; for (let i = 0; i < a.length; i += 4) P(a[i], a[i + 1], C_WET);
  a = d.shoreS;
  for (let i = 0; i < a.length; i += 4) {
    const lx = a[i], ly = a[i + 1], cdv = a[i + 2] / 4, s = phase(a[i + 3]), pos = front(s), str = s < 0.62 ? 1 : 1 - (s - 0.62) / 0.38, dd = cdv - pos;
    if (Math.abs(dd) < 0.8 && ihash(lx * 7 + tk5, ly * 13 + sd) > 0.1 + (1 - str) * 0.65) P(lx, ly, C_FOAM);
    else if (cdv < 1.6 && ihash(lx + tk2 * 31, ly + sd) < 0.45) P(lx, ly, C_SOFT);
    else if (s < 0.62 && dd > 0 && dd < 2.4) P(lx, ly, C_LITE);
  }
  a = d.shoreC;
  for (let i = 0; i < a.length; i += 4) {
    const lx = a[i], ly = a[i + 1], cdv = a[i + 2] / 4, w = Math.sin(t * 0.9 + a[i + 3] / 1000);
    if (cdv < 1.4 && w > 0.2) P(lx, ly, C_SOFT); else if (cdv > 1.6 && cdv < 2.6 && w > 0.85) P(lx, ly, C_LITE);
  }
  if (d.shoreS.length || d.wetS.length || d.shoreC.length || d.wetC.length) { AGUA.sbx.putImageData(AGUA.sbi, 0, 0); c.drawImage(AGUA.sbc, X, Y, N * 2, N * 2); }
  // plantas y cosas que flotan
  for (const o of d.life) {
    if (o.t === 'lily') { const x = Math.round(X + o.x + Math.sin(t * 0.3 + o.s * 6) * 0.6), y = Math.round(Y + o.y); c.fillStyle = 'rgba(0,20,10,.18)'; c.fillRect(x + 1, y + 5, 6, 1); c.drawImage(AGUA.lily[o.v], x, y); }
    else if (o.t === 'duck') { c.fillStyle = 'rgba(120,180,70,.85)'; for (let n = 0; n < 9; n++) { const dx = Math.round((hash2(n, 3, o.s * 50) - 0.5) * 12 + Math.sin(t * 0.2 + n) * 0.5), dy = Math.round((hash2(n, 4, o.s * 50) - 0.5) * 8); c.fillRect(X + o.x + dx | 0, Y + o.y + dy | 0, n % 3 ? 1 : 2, 1); } }
    else if (o.t === 'leaf') { const a2 = t * 0.05 + o.s * 6.28, x = Math.round(X + o.x + Math.cos(a2) * 5), y = Math.round(Y + o.y + Math.sin(a2) * 3); c.fillStyle = o.s < 0.5 ? '#c88a3a' : '#8aa83a'; c.fillRect(x, y, 2, 1); c.fillRect(x + 1, y + 1, 2, 1); c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(x, y + 2, 3, 1); }
    else if (o.t === 'reed') {
      const bx = Math.round(X + o.x), by = Math.round(Y + o.y), sw = typeof windSway === 'function' ? windSway(o.s, 1.6) : 0;
      for (let n = 0; n < o.n; n++) { const hgt = 8 + ((hash2(n, 5, o.s * 70) * 6) | 0), x = bx + n * 2 - o.n;
        c.fillStyle = 'rgba(0,30,20,.2)'; c.fillRect(x, by + 1, 2, 1);                            // reflejo/sombra en el agua
        for (let j = 0; j < hgt; j++) { const sx = Math.round(sw * (j / hgt) * (j / hgt)); c.fillStyle = (n + j) & 3 ? '#6f8f3a' : '#87a84a'; c.fillRect(x + sx, by - j, 1, 1); }
        if (o.cat && n % 2 === 0) { const sx = Math.round(sw); c.fillStyle = '#6a4426'; c.fillRect(x + sx, by - hgt - 2, 2, 3); c.fillStyle = '#8a5e36'; c.fillRect(x + sx, by - hgt - 2, 1, 1); } }
    }
  }
  // ondas, burbujas, espuma en mar abierto y destellos
  for (const e of d.emit) {
    const age = (t + e.o) % (e.p || 1);
    if (e.t === 'ring' && age < 1.8) { const r = Math.min(7, (1 + age * 3.6) | 0), im = AGUA.rings[r]; c.globalAlpha = 0.45 * (1 - age / 1.8); c.drawImage(im, Math.round(X + e.x - im.width / 2), Math.round(Y + e.y - im.height / 2)); c.globalAlpha = 1; }
    else if (e.t === 'bub') { if (age < 1.1) { c.fillStyle = 'rgba(230,248,255,.7)'; c.fillRect(Math.round(X + e.x + Math.sin(age * 9) * 0.6), Math.round(Y + e.y - age * 5), 1, 1); } else if (age < 1.35) { const im = AGUA.rings[0]; c.globalAlpha = 0.5; c.drawImage(im, Math.round(X + e.x - 2), Math.round(Y + e.y - 7)); c.globalAlpha = 1; } }
    else if (e.t === 'cap' && age < 1) { const n = 3 + ((e.o * 7) | 0) % 4, al = age < 0.3 ? age / 0.3 : 1 - (age - 0.3) / 0.7; c.fillStyle = `rgba(245,252,255,${0.7 * al})`; for (let j = 0; j < n; j++) if (ihash(j, (e.o * 100) | 0) > 0.2) c.fillRect(Math.round(X + e.x + j * 2 - n), Math.round(Y + e.y + (j & 1)), 2, 1); }
  }
  const gl = Math.floor(t * 2.5);
  for (let k = 0; k < (d.sea ? 10 : 3); k++) {
    const x = (ihash(k * 17 + gl, sd + 3) * CH * T) | 0, y = (ihash(k * 29 + gl, sd + 7) * CH * T) | 0;
    if (!wfxWater(d, x, y, 10) || !wfxWater(d, x + 2, y + 2, 10)) continue;
    c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(X + x, Y + y, 1, 1);
    if (k < 3 && d.sea) { c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(X + x - 1, Y + y, 1, 1); c.fillRect(X + x + 1, Y + y, 1, 1); c.fillRect(X + x, Y + y - 1, 1, 1); c.fillRect(X + x, Y + y + 1, 1, 1); }
  }
}
// Cada trozo con agua se compone en su propio lienzo a 8 fotogramas por segundo (como una animación de
// píxeles), en momentos distintos por trozo y como mucho 3 por fotograma: cada fotograma del juego solo copia lienzos.
const WFX_PAD = 16;
let _wfxFrame = 0;
function wfxCompose(d, t) {
  const S = CH * T + WFX_PAD * 2;
  if (!d._c) { d._c = mkCanvas(S, S); d._x = d._c.getContext('2d'); d._x.imageSmoothingEnabled = false; }
  const c = d._x; c.clearRect(0, 0, S, S);
  wfxTop(c, WFX_PAD, WFX_PAD, d, t);
}
function drawWater(ctx, k, ox, oy, x0, y0, x1, y1, now) {
  if (OPT.water === false) return;
  wfxInit(); _wfxFrame++;
  const t = now / 1000; let budget = 1; const list = [];
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.setTransform(k, 0, 0, k, ox, oy);
  for (let cy = Math.floor(y0 / CH); cy <= Math.floor(y1 / CH); cy++) for (let cx = Math.floor(x0 / CH); cx <= Math.floor(x1 / CH); cx++) {
    const key = chunkKey(cx, cy), d = AGUA.d.get(key); if (d && chunks.has(key)) list.push([cx * CH * T, cy * CH * T, d]); }
  for (const [X, Y, d] of list) wfxUnder(ctx, X, Y, d, t);          // peces, algas y corales bajo el agua
  for (const [X, Y, d] of list) wfxSurface(ctx, X, Y, d, t);        // oleaje
  for (const [X, Y, d] of list) {                                     // orilla, flotantes, ondas: guardados y rehechos a 8 fps
    const tk = Math.floor(t * 8 + d.ph); d._seen = _wfxFrame;
    if ((!d._c || d._tk !== tk) && budget > 0) { budget--; d._tk = tk; wfxCompose(d, t); }
    if (d._c) ctx.drawImage(d._c, X - WFX_PAD, Y - WFX_PAD);
  }
  ctx.imageSmoothingEnabled = sm;
  if ((_wfxFrame & 63) === 0) for (const d of AGUA.d.values()) if (d && d._c && _wfxFrame - d._seen > 120) { d._c = d._x = null; } // libera la memoria de lo que ya no se ve
}
