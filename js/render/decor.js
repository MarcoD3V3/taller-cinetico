'use strict';
// =====================================================================================
//  Ambiente: objetos pequeños repartidos por el suelo según el bioma (flores, piedrecitas,
//  setas, helechos, hojas caídas, ramitas, conchas, huesos, terrones de nieve…). Son solo
//  decoración: se pintan dentro del suelo ya cacheado (no cuestan FPS ni se pueden coger).
// =====================================================================================
const DECOR_BY = {
  GRASS: ['flowerY', 'flowerR', 'flowerW', 'pebble', 'clump', 'clump', 'flowerB'], MOSS: ['flowerP', 'mushR', 'pebble', 'clump'],
  DARKGRASS: ['leaves', 'mushB', 'twig', 'mushR', 'fern'], JUNGLEGRASS: ['fern', 'fern', 'flowerR', 'leaves'], SWAMPGRASS: ['reedS', 'mushB', 'twig'],
  DRYGRASS: ['dryTuft', 'pebble', 'twig', 'bone'], SAND: ['shell', 'pebble', 'twig', 'shell'], REDSAND: ['pebble', 'bone', 'dryTuft'], BLACKSAND: ['pebble', 'shell'],
  SNOW: ['snowLump', 'icePeb', 'twig'], STONEFLOOR: ['pebble', 'pebble', 'mossy'], ROCKFLOOR: ['pebble', 'mossy'], BASALTFLOOR: ['pebble'], MYCELIUM: ['mushP', 'mushB'],
  AMETHYST: ['crystalS', 'pebble'], TOXIC: ['mushG', 'bone'], ASH: ['pebble', 'bone', 'ember'], MUD: ['twig', 'pebble'], PEAT: ['reedS', 'twig'], GRAVEL: ['pebble', 'pebble'],
};
const DECOR_DENS = 0.2, _decor = new Map();
function decorSprite(kind) {
  let s = _decor.get(kind); if (s) return s;
  const N = 24, cv = mkCanvas(N, N), c = cv.getContext('2d', { willReadFrequently: true }), P = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const flower = (col) => { P(11, 12, 2, 9, '#3e7a34'); P(8, 15, 3, 2, '#4e8a3a'); for (const [dx, dy] of [[0, -3], [3, 0], [0, 3], [-3, 0]]) P(10 + dx, 9 + dy, 4, 4, col); P(11, 10, 2, 2, '#ffe060'); P(10, 6, 2, 1, '#ffffff'); };
  const mush = (cap, dot) => { P(10, 13, 4, 7, '#efe6d4'); P(10, 13, 1, 7, '#ffffff'); P(6, 9, 12, 5, cap); P(8, 7, 8, 2, cap); P(8, 7, 4, 1, shade(cap, 0.4)); if (dot) { P(9, 9, 2, 2, dot); P(14, 10, 2, 2, dot); } };
  switch (kind) {
    case 'flowerY': flower('#f4d040'); break; case 'flowerR': flower('#e84a5a'); break; case 'flowerW': flower('#f4f4f4'); break; case 'flowerB': flower('#6a8af0'); break; case 'flowerP': flower('#e880c8'); break;
    case 'pebble': P(6, 13, 8, 6, '#8a8680'); P(7, 12, 6, 1, '#a8a49e'); P(7, 13, 3, 2, '#c0bcb4'); P(14, 16, 4, 3, '#7a7670'); P(14, 16, 2, 1, '#a09c96'); break;
    case 'icePeb': P(7, 13, 8, 5, '#b8d8ec'); P(8, 13, 4, 1, '#ffffff'); P(14, 15, 4, 3, '#a0c8e0'); break;
    case 'clump': for (let i = 0; i < 7; i++) P(6 + i * 2, 10 + (i % 3), 1, 10 - (i % 3), i & 1 ? '#5a9a40' : '#3e7a30'); break;
    case 'dryTuft': for (let i = 0; i < 7; i++) P(6 + i * 2, 11 + (i % 3), 1, 9 - (i % 3), i & 1 ? '#c8b870' : '#a8984a'); break;
    case 'fern': for (let i = 0; i < 5; i++) { const a = -2.2 + i * 0.6; for (let s2 = 0; s2 < 9; s2++) P(12 + Math.cos(a) * s2, 19 + Math.sin(a) * s2, 2, 1, s2 & 1 ? '#3e8a3a' : '#5aaa4a'); } break;
    case 'leaves': for (let i = 0; i < 5; i++) { const x = 4 + (i * 7) % 14, y = 8 + (i * 5) % 10; P(x, y, 4, 2, ['#a86a2a', '#c8902a', '#8a4a1a'][i % 3]); P(x + 1, y + 2, 2, 1, '#6a3a12'); } break;
    case 'twig': P(5, 15, 13, 2, '#6a4a2a'); P(5, 15, 13, 1, '#8a6a3a'); P(12, 12, 2, 3, '#6a4a2a'); P(13, 11, 2, 1, '#4e8a3a'); break;
    case 'bone': P(5, 14, 13, 3, '#ece4d0'); P(4, 13, 3, 5, '#ece4d0'); P(17, 13, 3, 5, '#ece4d0'); P(6, 14, 11, 1, '#ffffff'); break;
    case 'shell': P(8, 12, 9, 7, '#f0c8b0'); for (let i = 0; i < 4; i++) P(9 + i * 2, 12, 1, 7, '#d0a088'); P(8, 12, 9, 1, '#fff0e4'); P(11, 19, 3, 1, '#c09078'); break;
    case 'snowLump': P(5, 12, 13, 7, '#f4f8fc'); P(7, 10, 8, 2, '#ffffff'); P(5, 17, 13, 2, '#c8dcec'); break;
    case 'mossy': P(5, 13, 10, 6, '#8a8680'); P(5, 12, 10, 3, '#5a8a3a'); P(7, 11, 5, 1, '#7aaa4a'); break;
    case 'reedS': for (let i = 0; i < 4; i++) { P(7 + i * 3, 6 + (i % 2) * 2, 1, 14, '#7a8a3a'); P(6 + i * 3, 6 + (i % 2) * 2, 3, 3, '#6a4a2a'); } break;
    case 'crystalS': P(10, 8, 3, 11, '#c8b0ff'); P(10, 8, 1, 11, '#ffffff'); P(14, 12, 3, 7, '#9a7ae0'); P(7, 13, 2, 6, '#b090f0'); break;
    case 'mushR': mush('#c83a32', '#ffffff'); break; case 'mushB': mush('#8a6a4a'); break; case 'mushP': mush('#a070c8', '#e8d0ff'); break; case 'mushG': mush('#8ac83a', '#e8ff90'); break;
    case 'ember': P(8, 14, 8, 4, '#3a2a22'); P(10, 15, 3, 2, '#ff8a2a'); P(11, 15, 1, 1, '#ffe060'); break;
  }
  animOutline(c, N, N);
  _decor.set(kind, cv); return cv;
}
// Una casilla de suelo puede llevar un objeto de ambiente (posición y tipo fijos por coordenada)
function drawDecor(c, x, y, t, px, py) {
  const g = GI[t], list = DECOR_BY[g.key]; if (!list || g.solid || g.liquid) return;
  if (hash2(x, y, 333) > DECOR_DENS) return;
  const kind = list[(hash2(x, y, 334) * list.length) | 0], ox = (hash2(x, y, 335) - 0.5) * 14, oy = (hash2(x, y, 336) - 0.5) * 12;
  c.drawImage(decorSprite(kind), px + 4 + ox, py + 4 + oy, 24, 24);
}
