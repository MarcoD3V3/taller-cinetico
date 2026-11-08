'use strict';
// =====================================================================================
//  Personajes en pixel art estilo RPG de 16 bits (cabeza grande, cuerpo con forma, contorno
//  negro y sombreado en 3 tonos). Se pintan por regiones (pelo, piel, ropa…), se sombrean solos
//  con luz arriba-izquierda y llevan la firma de fantasía: aura, luz de borde y destellos.
//  Lo usa la página generador.html; más adelante, el juego.
//  CA.render(cfg) → canvas de (W+6)×(H+6) con el personaje a tamaño real.
// =====================================================================================
const CA = (() => {
  const W = 48, H = 64, OFF = 3;
  const OPT = {
    body: [['m', 'Chico'], ['f', 'Chica'], ['big', 'Fornido']],
    race: [['human', 'Humano'], ['elf', 'Elfo'], ['orc', 'Orco'], ['demon', 'Demonio'], ['beast', 'Bestia (orejas)'], ['sylvan', 'Silvano (astas)']],
    hair: [['spiky', 'De punta'], ['long', 'Melena larga'], ['bob', 'Media melena'], ['pony', 'Coleta'], ['wild', 'Salvaje'], ['short', 'Corto']],
    outfit: [['tunic', 'Túnica de aventurero'], ['armor', 'Armadura de placas'], ['dress', 'Vestido'], ['leather', 'Cuero ligero'], ['robe', 'Túnica de mago']],
    head: [['none', 'Nada'], ['band', 'Cinta'], ['circlet', 'Diadema con gema'], ['helm', 'Yelmo alado'], ['hood', 'Capucha']],
    weapon: [['none', 'Nada'], ['sword', 'Espada'], ['staff', 'Bastón con cristal'], ['axe', 'Hacha'], ['orb', 'Orbe flotante'], ['bow', 'Arco']],
  };
  const EXTRAS = [['cape', 'Capa'], ['scarf', 'Bufanda'], ['pads', 'Hombreras'], ['belt', 'Cinturón']];
  const SKINS = ['#f8d4ae', '#eebc94', '#d49a6e', '#a8704a', '#6e4630', '#8fc27a', '#9ab8e8', '#c8a0e0', '#e8e0e8'];
  const PALS = [ // [pelo, ropa principal, ropa secundaria, aura]
    ['#d24c2c', '#3c6acc', '#e8c450', '#78d0ff'], ['#f0c84c', '#468c48', '#c83c32', '#9ae070'], ['#343448', '#aa2c34', '#e0e0e8', '#c060ff'],
    ['#3cbeaa', '#785032', '#ec9638', '#60f0d0'], ['#e8ecf8', '#4658be', '#e8c45a', '#78e6ff'], ['#40286a', '#6e2878', '#d2aa46', '#e05aff'],
    ['#6e4c2e', '#786e3c', '#c8aa6e', '#82e66e'], ['#ec7a2a', '#7a3a2a', '#46784a', '#ffb04a'], ['#b8b0c8', '#30303c', '#9a2a2a', '#ff5a5a'],
    ['#2a2a30', '#5a6a8a', '#c8b47a', '#9ac8ff'], ['#f4a0c0', '#ffffff', '#7ab0e8', '#ffa0e0'], ['#7a4a2a', '#4a7a3a', '#3a3a4a', '#d8f060'],
  ];
  const EYES = ['#3c6edc', '#3ca05a', '#c83c3c', '#a03cc8', '#e0a03c', '#3cb4b4', '#5a4030'];
  // ---------- color ----------
  const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lighten = (c, f) => c.map(v => Math.min(255, Math.round(v + (255 - v) * f)));
  const darken = (c, f) => c.map(v => Math.max(0, Math.round(v * (1 - f))));
  const mix = (a, b, f) => a.map((v, i) => Math.round(v * (1 - f) + b[i] * f));
  const tones = c => ({ hi: lighten(c, 0.3), b: c, sh: darken(c, 0.28), dp: darken(c, 0.52) });
  // ---------- lienzo por regiones ----------
  function Spr() { this.reg = new Array(W * H).fill(null); }
  Spr.prototype.px = function (x, y, r) { if (x >= 0 && x < W && y >= 0 && y < H) this.reg[y * W + x] = r; };
  Spr.prototype.ell = function (cx, cy, rx, ry, r) { for (let y = Math.max(0, Math.floor(cy - ry - 1)); y < Math.min(H, cy + ry + 1); y++) for (let x = Math.max(0, Math.floor(cx - rx - 1)); x < Math.min(W, cx + rx + 1); x++) if (((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1) this.reg[y * W + x] = r; };
  Spr.prototype.rect = function (x0, y0, x1, y1, r) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.px(x, y, r); };
  Spr.prototype.poly = function (pts, r) { const n = pts.length; let y0 = H, y1 = 0; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, Math.ceil(y1) + 1); y++) for (let x = 0; x < W; x++) { const X = x + .5, Y = y + .5; let ins = false;
      for (let i = 0; i < n; i++) { const [x1, yy1] = pts[i], [x2, yy2] = pts[(i + 1) % n]; if ((yy1 > Y) !== (yy2 > Y) && X < (x2 - x1) * (Y - yy1) / (yy2 - yy1) + x1) ins = !ins; }
      if (ins) this.reg[y * W + x] = r; } };
  Spr.prototype.line = function (x0, y0, x1, y1, r, w = 1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); for (let k = 0; k < w; k++) this.px(x + k, y, r); } };
  const M = pts => pts.map(([x, y]) => [48 - x, y]);
  // ---------- medidas del cuerpo ----------
  const BODY = {
    m: { sh: [16, 32], wa: [18.4, 29.6], hip: [17, 31], arm: [[12.4, 31], [16.6, 31], [16.2, 34.5], [15, 39.5], [11.8, 39.5], [11.6, 35]], hand: [13.3, 42.3, 2.2, 2.4], leg: [16.6, 22.6] },
    f: { sh: [17.4, 30.6], wa: [19.8, 28.2], hip: [16, 32], arm: [[13.6, 31], [17.6, 31], [17.2, 34.5], [16.2, 39.5], [13.3, 39.5], [12.9, 35]], hand: [14.7, 42.3, 2, 2.2], leg: [16.4, 22.6] },
    big: { sh: [13.4, 34.6], wa: [17, 31], hip: [16, 32], arm: [[9.4, 31], [14.6, 31], [14.4, 35], [13.2, 40.5], [8.4, 40.5], [8.4, 35]], hand: [10.8, 43.4, 2.7, 2.8], leg: [15.6, 22.8] },
  };
  // ---------- piezas ----------
  function hairBack(s, c) {
    const st = c.hair;
    if (st === 'short') return;
    s.ell(24, 15, st === 'wild' ? 15 : 13.6, st === 'wild' ? 14 : 13, 'hair');
    if (st === 'spiky') { s.poly([[10, 16], [6, 28], [12, 24]], 'hair'); s.poly(M([[10, 16], [6, 28], [12, 24]]), 'hair'); }
    if (st === 'long') s.poly([[10.5, 16], [37.5, 16], [39.5, 48], [8.5, 48]], 'hair');
    if (st === 'bob') s.poly([[10, 16], [38, 16], [38.5, 29], [9.5, 29]], 'hair');
    if (st === 'pony') { s.poly([[29, 7], [35, 5], [41, 20], [40, 36], [36, 33], [35, 18]], 'hair'); }
    if (st === 'wild') for (const [a, b, d] of [[8, 14, 3], [6, 22, 3], [8, 30, 3], [40, 14, 3], [42, 22, 3], [40, 30, 3]]) s.poly([[a + (a < 24 ? 3 : -3), b - d], [a - (a < 24 ? 3 : -3), b], [a + (a < 24 ? 3 : -3), b + d]], 'hair');
  }
  function hairFront(s, c) {
    const st = c.hair;
    s.ell(24, 10, st === 'short' ? 11.6 : 12, st === 'short' ? 5.6 : 6.5, 'hair');
    if (st === 'spiky' || st === 'wild') for (const [x, y, w] of [[14, 2, 3], [20, 0, 3], [27, 0, 3], [33, 3, 3], [9, 8, 3], [39, 9, 3]]) s.poly([[x - w, y + 7], [x, y], [x + w, y + 7]], 'hair');
    if (st === 'short') for (const [x, y] of [[17, 3], [23, 2], [30, 3]]) s.poly([[x - 2.5, y + 5], [x, y], [x + 2.5, y + 5]], 'hair');
    const side = st === 'long' || st === 'pony';
    if (side) s.poly([[12, 11], [16, 19], [19, 13], [23, 18], [26, 12], [30, 16], [33, 12], [36, 15], [36, 10], [12, 10]], 'hair');
    else if (st === 'bob') s.poly([[12, 11], [12, 17], [36, 17], [36, 11]], 'hair');
    else s.poly([[12, 12], [15, 18], [17, 13], [20, 17], [22, 13], [25, 16], [27, 12], [30, 17], [32, 12], [35, 17], [36, 11], [12, 11]], 'hair');
    if (st === 'long') { s.poly([[12, 12], [11, 34], [15, 27]], 'hair'); s.poly([[36, 12], [37, 34], [33, 27]], 'hair'); }
    if (st === 'bob') { s.poly([[12, 12], [10.5, 28], [15, 26]], 'hair'); s.poly([[36, 12], [37.5, 28], [33, 26]], 'hair'); }
    if (st === 'spiky' || st === 'pony') { s.poly([[12, 12], [11, 25], [14, 21]], 'hair'); s.poly([[36, 12], [37, 25], [34, 21]], 'hair'); }
    if (c.race === 'beast') { const E = [[13, 8], [11, -1], [19, 4]]; s.poly(E, 'hair'); s.poly(M(E), 'hair'); s.poly([[13.5, 6], [12.4, 1.5], [16.5, 4.5]], 'ear'); s.poly(M([[13.5, 6], [12.4, 1.5], [16.5, 4.5]]), 'ear'); }
  }
  function head(s, c) {
    s.rect(22, 26, 26, 30, 'skin'); s.ell(24, 18, 10.5, 10, 'skin');
    if (c.race === 'elf') { const E = [[14.5, 17], [7, 12.5], [13.5, 22]]; s.poly(E, 'skin'); s.poly(M(E), 'skin'); }
    else { s.ell(13.5, 19.5, 1.8, 2.4, 'skin'); s.ell(34.5, 19.5, 1.8, 2.4, 'skin'); }
  }
  function build(c) {
    const s = new Spr(), B = BODY[c.body] || BODY.m, ex = new Set(c.extras || []), o = c.outfit;
    const torsoM = o === 'armor' ? 'metal' : o === 'dress' || o === 'robe' ? 'cloth' : o === 'leather' ? 'cloth2' : 'cloth';
    const legM = o === 'armor' ? 'metal' : o === 'leather' ? 'skin' : 'pants', armM = o === 'armor' ? 'metal' : o === 'leather' || o === 'dress' ? 'skin' : 'cloth';
    const bootM = o === 'armor' ? 'metal2' : 'boot';
    hairBack(s, c);
    if (c.head === 'hood') s.poly([[12, 14], [36, 14], [38, 34], [10, 34]], 'cloth2');
    if (ex.has('cape')) s.poly([[B.sh[0], 30], [B.sh[1], 30], [B.hip[1] + 4, 56], [B.hip[0] - 4, 56]], 'cape');
    if (c.weapon === 'staff') s.line(B === BODY.big ? 39 : 38, 4, B === BODY.big ? 39 : 38, 62, 'wood', 2);
    if (c.weapon === 'bow') { for (let t = 0; t <= 20; t++) { const a = -1.2 + t * 0.12; s.px(Math.round(8 + Math.cos(a) * -3), Math.round(42 + Math.sin(a) * 15), 'wood'); s.px(Math.round(8 + Math.cos(a) * -3) + 1, Math.round(42 + Math.sin(a) * 15), 'wood'); } s.line(7, 28, 7, 56, 'string'); }
    // piernas y botas
    const [l0, l1] = B.leg, thick = c.body === 'big' ? 0.4 : 0;
    const L = [[l0, 46], [l1, 46], [l1 - 0.4, 52], [l1 - 0.8 + thick, 57], [l0 + 1.4 - thick, 57], [l0 + 0.8, 52]]; s.poly(L, legM); s.poly(M(L), legM);
    const bt = o === 'leather' ? 51 : 55;
    const Bt = [[l0 + 1, bt], [l1 - 0.6, bt], [l1 - 0.4, 60], [l1, 62.2], [l0 - 1.8, 62.2], [l0 - 1.4, 60.4], [l0 + 0.6, 58.6]]; s.poly(Bt, bootM); s.poly(M(Bt), bootM);
    s.rect(Math.round(l0 + 1.4), bt, Math.round(l1 - 1.6), bt, o === 'armor' ? 'gold' : 'cuff'); s.rect(Math.round(48 - l1 + 1.6), bt, Math.round(48 - l0 - 1.4), bt, o === 'armor' ? 'gold' : 'cuff');
    // cadera / faldón / falda
    const wa = B.wa, hp = B.hip;
    if (o === 'dress' || o === 'robe') s.poly([[wa[0], 41], [wa[1], 41], [hp[1] + 4, 61], [hp[0] - 4, 61]], o === 'robe' ? 'cloth' : 'cloth');
    else s.poly([[wa[0] - 1.4, 42], [wa[1] + 1.4, 42], [hp[1] + 1.2, 47.5], [hp[0] - 1.2, 47.5]], o === 'armor' ? 'cloth2' : o === 'leather' ? 'cloth2' : 'cloth');
    if (o === 'tunic' || o === 'armor') s.rect(24, 44, 24, 47, null);
    // torso
    s.poly([[B.sh[0], 30], [B.sh[1], 30], [B.sh[1] - 0.6, 35.5], [wa[1], 41.5], [wa[0], 41.5], [B.sh[0] + 0.6, 35.5]], torsoM);
    if (o === 'leather') s.poly([[wa[0] + 0.2, 37.5], [wa[1] - 0.2, 37.5], [wa[1], 41.5], [wa[0], 41.5]], 'skin');
    if (ex.has('belt') || o === 'tunic' || o === 'armor') { s.rect(Math.round(wa[0]), 41, Math.round(wa[1]), 42, 'belt'); s.rect(23, 41, 25, 42, 'gold'); }
    if (o === 'dress' || o === 'robe') s.rect(Math.round(wa[0]), 40, Math.round(wa[1]), 41, 'trim');
    if (c.weapon === 'sword') { s.line(B.hand[0] - 2, B.hand[1] + 1, B.hand[0] - 6, B.hand[1] + 17, 'blade', 2); s.rect(Math.round(B.hand[0] - 4), Math.round(B.hand[1]) - 0, Math.round(B.hand[0] + 1), Math.round(B.hand[1]), 'gold'); }
    // brazos
    if (o === 'robe') { const A = [[B.arm[0][0], 31], [B.arm[1][0] + 0.4, 31], [B.arm[2][0], 36], [B.arm[3][0] + 0.5, 44], [B.arm[4][0] - 2.2, 44], [B.arm[5][0] - 0.6, 36]]; s.poly(A, 'cloth'); s.poly(M(A), 'cloth');
      s.ell(B.hand[0] - 0.7, B.hand[1] + 3, B.hand[2], B.hand[3] - 0.2, 'skin'); s.ell(48 - B.hand[0] + 0.7, B.hand[1] + 3, B.hand[2], B.hand[3] - 0.2, 'skin'); }
    else { s.poly(B.arm, armM); s.poly(M(B.arm), armM);
      const cuff = o === 'armor' ? 'metal2' : o === 'leather' || o === 'dress' ? 'cuff' : 'cuff', hy = Math.round(B.arm[3][1]);
      s.rect(Math.round(B.arm[4][0]), hy - 1, Math.round(B.arm[3][0]) - 1, hy, cuff); s.rect(Math.round(48 - B.arm[3][0]) + 1, hy - 1, Math.round(48 - B.arm[4][0]), hy, cuff);
      const hm = o === 'armor' ? 'metal2' : 'skin'; s.ell(B.hand[0], B.hand[1], B.hand[2], B.hand[3], hm); s.ell(48 - B.hand[0], B.hand[1], B.hand[2], B.hand[3], hm); }
    if (c.weapon === 'axe') { const hx2 = 48 - B.hand[0]; s.line(hx2 + 1, B.hand[1] - 12, hx2 + 1, B.hand[1] + 8, 'wood', 2); s.poly([[hx2 + 2, B.hand[1] - 12], [hx2 + 8, B.hand[1] - 15], [hx2 + 9, B.hand[1] - 6], [hx2 + 2, B.hand[1] - 7]], 'blade'); }
    // hombreras, bufanda, cuello
    if (ex.has('pads') || o === 'armor') { const r = c.body === 'big' ? 5 : 4; s.ell(B.sh[0] - 1.6, 31.2, r, r * 0.8, 'metal2'); s.ell(B.sh[1] + 1.6, 31.2, r, r * 0.8, 'metal2'); }
    if (o === 'robe' || o === 'dress') s.poly([[19, 29], [29, 29], [24, 34]], 'trim');
    if (ex.has('scarf')) { s.poly([[18, 28], [30, 28], [29.4, 31.6], [18.6, 31.6]], 'scarf'); s.poly([[26, 31], [29, 31], [29.6, 36.5], [26.6, 35.6]], 'scarf'); }
    // cabeza, pelo y lo que va en ella
    if (c.head === 'helm') { s.rect(22, 26, 26, 30, 'skin'); s.ell(24, 14, 12, 11, 'metal'); const Wg = [[13, 12], [3, 3], [6, 10], [2, 11], [8, 16], [12.5, 17]]; s.poly(Wg, 'wing'); s.poly(M(Wg), 'wing'); s.ell(24, 21.5, 8, 6.4, 'skin'); s.rect(15, 14, 33, 15, 'metal2'); s.rect(23, 4, 25, 15, 'gold'); }
    else if (c.head === 'hood') { head(s, c); s.ell(24, 13, 13, 10, 'cloth2'); s.ell(24, 19.5, 9, 8, 'skin'); s.poly([[15, 13], [19, 17], [23, 14], [27, 17], [31, 13], [33, 16], [15, 16]], 'hair'); }
    else { head(s, c); hairFront(s, c); }
    if (c.head === 'band') s.rect(12, 12, 36, 13, 'cloth2');
    if (c.head === 'circlet') { s.rect(14, 11, 34, 11, 'trim'); s.ell(24, 11.5, 1.3, 1.6, 'gem'); }
    if (c.race === 'demon') { const HN = [[17, 8], [13, 3], [9, 1], [12, 5], [14.5, 10]]; s.poly(HN, 'horn'); s.poly(M(HN), 'horn'); }
    if (c.race === 'sylvan') for (const sd of [1, -1]) { const x = 24 + sd * 8; s.line(x, 8, x + sd * 6, 0, 'antler', 2); s.line(x + sd * 3, 4, x + sd, -1, 'antler'); s.line(x + sd * 5, 2, x + sd * 9, 1, 'antler'); }
    if (c.weapon === 'staff') s.ell(B === BODY.big ? 39.5 : 38.5, 4.5, 2.8, 3.8, 'crystal');
    if (c.weapon === 'orb') s.ell(48 - B.hand[0] + 3, B.hand[1] - 6, 3, 3, 'orb');
    return s;
  }
  // ---------- pintar ----------
  function rng(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function render(cfg) {
    const c = { ...cfg, aura: cfg.useAura === false ? null : cfg.aura };
    const s = build(c), R = s.reg, get = (x, y) => x >= 0 && x < W && y >= 0 && y < H ? R[y * W + x] : null;
    const skin = hx(c.skin), cloth = hx(c.cloth), cloth2 = hx(c.cloth2), hair = hx(c.hairC), aura = hx(c.aura || '#ffffff'), metal = hx(c.metal || '#a8b2c6');
    const COL = { skin, hair, cloth, cloth2, eye: hx(c.eye), pants: mix(darken(cloth2, 0.55), [60, 56, 70], 0.5), boot: [112, 70, 42], cuff: [158, 112, 70], metal, metal2: darken(metal, 0.25), gold: [232, 190, 70], trim: [232, 196, 90], gem: aura, wood: [126, 88, 54], crystal: lighten(aura, 0.25), orb: aura, horn: [232, 222, 202], antler: [230, 216, 180], blade: [212, 230, 246], wing: [240, 244, 252], belt: [104, 66, 36], cape: darken(cloth, 0.35), scarf: cloth2, ear: [240, 160, 170], string: [230, 230, 220] };
    const T = {}; for (const k in COL) T[k] = tones(COL[k]);
    const CW = W + OFF * 2, CH = H + OFF * 2, cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
    const g = cv.getContext('2d'), img = g.createImageData(CW, CH), D = img.data;
    const set = (x, y, col, a = 255) => { if (x < -OFF || y < -OFF || x >= W + OFF || y >= H + OFF) return; const i = ((y + OFF) * CW + x + OFF) * 4; D[i] = col[0]; D[i + 1] = col[1]; D[i + 2] = col[2]; D[i + 3] = a; };
    const getA = (x, y) => (x < -OFF || y < -OFF || x >= W + OFF || y >= H + OFF) ? 0 : D[((y + OFF) * CW + x + OFF) * 4 + 3];
    const SHINY = new Set(['hair', 'metal', 'metal2', 'gold', 'trim', 'gem', 'crystal', 'orb', 'blade', 'wing', 'horn', 'antler', 'boot']);
    // 1) sombreado de cada región
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const r = R[y * W + x]; if (!r) continue; const t = T[r]; let col = t.b;
      if (get(x + 1, y) !== r || get(x, y + 1) !== r) col = t.sh;
      if (get(x + 1, y) !== r && get(x, y + 1) !== r) col = (r === 'skin' || r === 'crystal' || r === 'orb' || r === 'gem') ? t.sh : t.dp;
      if (get(x - 1, y) !== r || get(x, y - 1) !== r) col = (SHINY.has(r) || get(x, y - 1) !== r) ? t.hi : t.b;
      if ((r === 'cloth' || r === 'cloth2' || r === 'cape' || r === 'pants' || r === 'hair' || r === 'metal') && x > 29 && col === t.b) col = t.sh;
      set(x, y, col); }
    // 2) cara
    const sk = T.skin, hr = T.hair, E = T.eye, ink = [24, 14, 18], helm = c.head === 'helm';
    for (let y = 0; y < 18; y++) for (let x = 0; x < W; x++) if (R[y * W + x] === 'skin' && get(x, y - 1) === 'hair') set(x, y, sk.sh);
    for (const ex of [17, 28]) {
      for (let dx = -1; dx < 5; dx++) set(ex + dx, 18, ink);
      for (let dy = 19; dy < 23; dy++) for (let dx = 0; dx < 3; dx++) set(ex + dx, dy, dy < 21 ? E.b : E.hi);
      set(ex + 3, 19, ink); set(ex + 3, 20, ink); set(ex - 1, 19, ink); set(ex, 19, [255, 255, 255]); set(ex + 1, 20, c.glowEyes ? E.hi : E.dp); set(ex + 2, 22, [255, 255, 255]);
      for (let dx = 0; dx < 3; dx++) set(ex + dx, 23, sk.sh);
      if (!helm && c.head !== 'hood') for (let dx = 0; dx < 4; dx++) set(ex + dx, 16, hr.dp);
    }
    set(24, 23, sk.sh); set(24, 24, sk.sh); set(23, 26, [180, 70, 80]); set(24, 26, [180, 70, 80]); set(25, 26, [130, 50, 60]);
    if (c.body === 'f') { set(22, 26, [200, 90, 100]); set(26, 26, [200, 90, 100]); }
    set(16, 24, mix(skin, [240, 120, 130], 0.5)); set(32, 24, mix(skin, [240, 120, 130], 0.5));
    if (c.race === 'orc') { set(21, 26, [250, 248, 230]); set(27, 26, [250, 248, 230]); set(21, 25, [250, 248, 230]); set(27, 25, [250, 248, 230]); }
    // 3) mechones y detalles
    for (const [x0, y0, x1, y1] of [[18, 5, 16, 10], [23, 3, 22, 9], [28, 4, 30, 9], [33, 7, 34, 11], [14, 9, 13, 14]]) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); if (get(x, y) === 'hair') set(x, y, hr.sh); } }
    if (c.outfit === 'armor' && c.aura) for (const [x, y] of [[24, 33], [22, 35], [26, 35], [24, 37], [23, 39], [25, 39], [21, 33], [27, 33]]) set(x, y, aura);
    if (c.outfit === 'tunic') { for (const [x, y] of [[24, 33], [24, 36], [24, 39]]) set(x, y, T.gold.hi); for (let y = 30; y < 41; y++) if (get(24, y) === 'cloth') set(24, y, T.cloth.dp); }
    if (c.outfit === 'robe' || c.outfit === 'dress') for (const [x, y] of [[20, 47], [28, 47], [24, 52], [19, 56], [29, 56]]) if (get(x, y) === 'cloth') set(x, y, T.trim.hi);
    for (const [x, y] of [[13, 30], [35, 30]]) if (get(x, y) === 'metal2') set(x, y, [255, 255, 255]);
    // 4) brillo de los objetos mágicos
    const glow = []; if (c.aura) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const r = R[y * W + x]; if (r === 'crystal' || r === 'orb' || r === 'gem') for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (!get(x + dx, y + dy)) glow.push([x + dx, y + dy]); }
    // 5) luz de borde del color del aura
    if (c.aura) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const r = R[y * W + x]; if (r && r !== 'skin' && !get(x + 1, y)) { const i = ((y + OFF) * CW + x + OFF) * 4; const m = mix([D[i], D[i + 1], D[i + 2]], aura, 0.45); D[i] = m[0]; D[i + 1] = m[1]; D[i + 2] = m[2]; } }
    // 6) contorno negro (fuera) y líneas interiores entre piezas
    const occ = (x, y) => !!get(x, y), OUT = [20, 12, 18];
    for (let y = -OFF; y < H + OFF; y++) for (let x = -OFF; x < W + OFF; x++) if (!occ(x, y) && (occ(x + 1, y) || occ(x - 1, y) || occ(x, y + 1) || occ(x, y - 1))) set(x, y, OUT);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const r = R[y * W + x], b = get(x, y + 1); if (r && b && b !== r && r !== 'skin' && ['skin', 'cloth', 'cloth2', 'pants', 'metal', 'cape'].includes(b)) set(x, y, T[r].dp); }
    // 7) aura: halo, destellos y resplandor
    if (c.aura) {
      for (const [x, y] of glow) if (!getA(x, y)) set(x, y, aura, 90);
      const halo = []; for (let y = -OFF; y < H + OFF; y++) for (let x = -OFF; x < W + OFF; x++) if (!getA(x, y) && (getA(x + 1, y) === 255 || getA(x - 1, y) === 255 || getA(x, y + 1) === 255 || getA(x, y - 1) === 255)) halo.push([x, y]);
      for (const [x, y] of halo) set(x, y, aura, 70);
      const rr = rng(c.seed || 7); for (let k = 0; k < 14; k++) { const x = (rr() * (W + 4) | 0) - 2, y = (rr() * (H - 4) | 0) + 2; if (!getA(x, y)) set(x, y, rr() < 0.5 ? aura : [255, 255, 255], 220); }
    }
    g.putImageData(img, 0, 0); return cv;
  }
  // ---------- al azar ----------
  function random(seed) {
    const r = rng(seed || (Math.random() * 1e9) | 0), pick = a => a[(r() * a.length) | 0], P = pick(PALS);
    const race = pick(OPT.race)[0], body = pick(OPT.body)[0];
    let skin = pick(SKINS.slice(0, 5)); if (race === 'orc') skin = '#8fc27a'; if (race === 'demon' && r() < 0.5) skin = pick(['#c8a0e0', '#e8e0e8', '#9ab8e8']);
    const outfit = body === 'f' ? pick(['dress', 'leather', 'robe', 'tunic', 'armor']) : pick(OPT.outfit)[0];
    const extras = EXTRAS.map(e => e[0]).filter(() => r() < 0.3);
    return { seed: (r() * 1e9) | 0, body, race, hair: pick(body === 'f' ? ['long', 'pony', 'bob', 'long', 'wild'] : ['spiky', 'short', 'wild', 'bob', 'spiky', 'pony']), outfit,
      head: r() < 0.55 ? 'none' : pick(OPT.head.slice(1))[0], weapon: r() < 0.35 ? 'none' : pick(OPT.weapon.slice(1))[0], extras,
      skin, hairC: P[0], cloth: P[1], cloth2: P[2], eye: pick(EYES), metal: '#a8b2c6', aura: P[3], useAura: r() < 0.7, glowEyes: race === 'demon' };
  }
  return { W, H, OFF, OPT, EXTRAS, SKINS, PALS, EYES, render, random, rng };
})();
