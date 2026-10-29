'use strict';
// =====================================================================================
//  Maravillas y collares buscabiomas.
//   · 4 biomas legendarios nuevos; en cada mundo existen solo 2 de ellos, uno en cada lugar
//     único y muy lejos del inicio (entre 4.500 y 7.500 casillas). Son pequeños y ricos.
//   · 3 collares (ranura de accesorio): enseñan en el mapa biomas que aún no has descubierto.
//       Simple     → biomas comunes, hasta 700 casillas.
//       Medio      → biomas raros, hasta 1.800 casillas.
//       Legendario → las 2 Maravillas de tu mundo, estén donde estén.
//    Sin collar, el mapa solo enseña lo que tú has visto (lógica en sim/wonders.js).
// =====================================================================================
BI('auroraGrove', { n: 'Bosque de la Aurora', g: 'MOSS', trees: [['CHERRY', 0.07], ['CRYSTALTREE', 0.04]], plants: [['STARLILY', 0.02], ['MOONFLOWER', 0.02], ['GLOWCAP', 0.012], ['FLOWERS', 0.06]], ores: [['STARSILVER', 22], ['ARCANITE', 12], ['MITHRIL', 12], ['CRYSTAL', 10]], fauna: [['unicorn', 1.2], ['wisp', 1], ['butterfly', 2]], fd: 3, mc: '#8af0d0', rare: 1, legend: 1 });
BI('starCrater', { n: 'Cráter estelar', g: 'BASALT', alt: [['CRYSTAL', 0.6], ['OBSIDIAN', 0.74]], stone: 0.5, rock: 'BASALT', plants: [['CRYSTALCLUSTER', 0.035]], ores: [['ADAMANTITE', 18], ['ARCANITE', 16], ['PLATINUM', 12], ['STARSILVER', 10]], fauna: [['golem', 1], ['phoenix', 0.3]], fd: 1, mc: '#7a6ae0', rare: 1, legend: 1 });
BI('goldenSanctum', { n: 'Santuario dorado', g: 'GRASS', alt: [['SAND', 0.72]], trees: [['TREE', 0.01]], plants: [['SUNPETAL', 0.02], ['FLOWERS', 0.1], ['HERBS', 0.01]], ores: [['GOLD', 30], ['MITHRIL', 14], ['PLATINUM', 8]], fauna: [['griffin', 1.2], ['phoenix', 0.2]], fd: 2, mc: '#f0d060', rare: 1, legend: 1 });
BI('dragonSpine', { n: 'Espinazo del dragón', g: 'ASH', alt: [['BASALT', 0.5], ['OBSIDIAN', 0.7]], stone: 0.55, rock: 'BASALT', plants: [['FIREBLOSSOM', 0.02]], ores: [['ADAMANTITE', 25], ['SULFUR', 10], ['GOLD', 8]], lake: 'LAVA', fauna: [['drake', 1.5], ['phoenix', 0.3]], fd: 1, mc: '#e0502a', rare: 1, legend: 1 });
const WONDER_KEYS = ['auroraGrove', 'starCrater', 'goldenSanctum', 'dragonSpine'];
// Lo mismo que hace biomes.js al cargar con cada bioma (sin las entradas que no existan)
for (const k of WONDER_KEYS) { const b = BIOMES[BI_[k]];
  for (const f of ['trees', 'plants', 'ores', 'alt']) if (b[f]) b[f] = b[f].filter(([t]) => G[t] !== undefined);
  b.gI = G[b.g]; b.altI = (b.alt || []).map(([t, v]) => [G[t], v]); b.treeI = (b.trees || []).map(([t, d]) => [G[t], d]); b.plantI = (b.plants || []).map(([t, d]) => [G[t], d]); b.wetI = [];
  b.rockI = G[b.rock || 'STONE']; b.oreT = (b.ores || STD_ORES).map(([t, w]) => [G[t], w]); b.oreSum = b.oreT.reduce((s, o) => s + o[1], 0);
  b.lakeI = G[b.lake || 'WATER']; b.riverI = G[b.river || 'WATER']; b.bankI = -1; b.faunaSum = (b.fauna || []).reduce((s, f) => s + f[1], 0); }
// Los 2 lugares de cada mundo (deterministas: salen de la semilla)
const _wsC = new Map();
function wonderSites(P) {
  const seed = (P && P.seed) || 0; let L2 = _wsC.get(seed); if (L2) return L2;
  const h = i => hash2(seed, i, 913), a0 = h(1) * Math.PI * 2, pool = WONDER_KEYS.slice();
  const first = pool.splice((h(2) * pool.length) | 0, 1)[0], second = pool[(h(3) * pool.length) | 0];
  L2 = [[first, a0, 4500 + h(4) * 3000], [second, a0 + Math.PI * (0.7 + h(5) * 0.6), 4500 + h(6) * 3000]]
    .map(([k, a, d], i) => ({ k, bi: BI_[k], x: Math.round(Math.cos(a) * d), y: Math.round(Math.sin(a) * d), r: 62 + h(7 + i) * 22 }));
  _wsC.set(seed, L2); return L2;
}
function wonderAt(x, y, P) {
  if (Math.abs(y) > 40000) return -1; // solo en la superficie
  for (const w of wonderSites(P)) { const dx = x - w.x, dy = y - w.y; if (Math.abs(dx) > w.r + 16 || Math.abs(dy) > w.r + 16) continue;
    if (Math.hypot(dx, dy) + (vnoise(x / 17, y / 17, (P.seed || 0) + 977) - 0.5) * 26 < w.r) return w.bi; }
  return -1;
}
{ const b0 = biomeAt; biomeAt = (x, y, P = S.gen) => { const w = wonderAt(x, y, P); return w >= 0 ? w : b0(x, y, P); }; }

// ---------- Collares ----------
// Qué biomas enseña cada collar (los demás biomas raros de verdad cuentan como «medio»)
const BIO_TIER = k => { const b = BIOMES[BI_[k]]; if (!b) return 0; if (b.legend) return 3; if (b.rare || ['mangrove', 'saltFlats', 'ashWastes'].includes(k)) return 2; return 1; };
const COLLARS = {
  collarWander: { tier: 1, n: 'Collar del caminante', c: '#c8a070', gem: '#7fd07a', r: 700, d: 'Collar sencillo de cuero y una piedra que tira hacia lo desconocido. Equipado (ranura de accesorio): el mapa marca los biomas comunes que aún no has descubierto a menos de 700 casillas.' },
  collarSeeker: { tier: 2, n: 'Collar del buscador', c: '#b8bcc8', gem: '#6ab8ff', r: 1800, d: 'Plata y un ojo de cristal que vibra cerca de lo raro. Equipado: el mapa marca los biomas comunes y raros sin descubrir a menos de 1.800 casillas.' },
  collarWonder: { tier: 3, n: 'Collar de las Maravillas', c: '#f0c75e', gem: '#ff7ad8', r: 12000, d: 'Una brújula viva engastada en oro estelar. Equipado: el mapa marca además las 2 Maravillas de tu mundo, biomas legendarios únicos y muy lejanos, y los biomas raros a menos de 2.500 casillas.' },
};
for (const id in COLLARS) { const C = COLLARS[id]; IT(id, C.n, C.c, 'gem', 9, C.d); ITEMS[id].gear = { slot: 'acc', mods: C.tier === 3 ? { luck: 0.03 } : C.tier === 2 ? { luck: 0.01 } : {} }; ITEMS[id].collar = C.tier; }
// Piezas: cada collar pide el anterior. El legendario necesita materiales de jefes y biomas raros.
IT('seekerEye', 'Ojo del buscador', '#6ab8ff', 'gem', 9, 'Una lente que tiembla cerca de lo raro. Solo sirve para el Collar del buscador.');
IT('wonderCompass', 'Brújula de las Maravillas', '#ff7ad8', 'gem', 9, 'Gira sola hacia lo que nadie ha visto. Solo sirve para el Collar de las Maravillas.');
RB('collarWander', 1, 'compass', 'leather*3,thread*2,@copper.ingot*2', 0, 1);
RB('seekerEye', 1, 'lens', '@silver.ingot*2,manaDust*3,crystal*2', 48, 3);
RB('collarSeeker', 1, 'collarWander', 'seekerEye,@silver.plate*2,silk*2,feather*3', 64, 4);
RB('wonderCompass', 1, 'manaCrystal', 'seekerEye,griffinFeather*2,@starsilver.ingot*2,@mithril.plate*2', 128, 6);
RB('collarWonder', 1, 'collarSeeker', 'wonderCompass,phoenixFeather,@arcanite.plate*2,@gold.plate*3', 160, 7);
