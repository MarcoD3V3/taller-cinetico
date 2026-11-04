'use strict';
// =====================================================================================
//  Mares (datos): pesca profunda y piratas. La lógica está en sim/fishing2.js y sim/pirates.js.
// =====================================================================================
const SEA_CAT = typeof S_CAT !== 'undefined' ? S_CAT : 9;
const okIt = (...ids) => ids.find(id => id && ITEMS[id]) || 'planks';
// ---------- Pesca: cebos por especie ----------
// x: multiplica las especies de esas aguas · para: lo que muestra el diario
const FBAITS = {
  wormBait: { n: 'Lombrices', c: '#c87a6a', w: ['fresh', 'swamp'], d: 'Cebo para agua dulce y pantano: esos peces pican mucho más. Se gasta uno por captura.' },
  shrimpBait: { n: 'Cebo de gamba', c: '#f0a090', w: ['sea', 'warm', 'cold'], d: 'Cebo para el mar: los peces de mar pican mucho más. Se gasta uno por captura.' },
  glowBait: { n: 'Cebo luminoso', c: '#7af0ff', w: ['deep'], d: 'Cebo del abismo: los peces de agua profunda pican más, y hace falta para el leviatán. Se gasta uno por captura.' },
};
for (const id in FBAITS) IT(id, FBAITS[id].n, FBAITS[id].c, 'nugget', SEA_CAT, FBAITS[id].d);
RB('wormBait', 6, okIt('dirt', 'herbs'), okIt('herbs', 'berries'));
RB('shrimpBait', 4, okIt('shrimp', 'fish'), okIt('herbs', 'berries'));
RB('glowBait', 3, okIt('glowfish', 'glowcap', 'fish'), okIt('glowcap', 'mushroom'));
// ---------- Peces legendarios: solo salen en su momento ----------
// cond: cuándo salen (lo comprueba sim/fishing2.js) · kg: peso típico
const FLEGEND = {
  moonKoi: { n: 'Koi lunar', c: '#f0e8ff', kg: 22, water: ['fresh'], tier: 2, hint: 'Agua dulce, de noche, con luna llena. Caña maestra.', d: 0.93 },
  stormMarlin: { n: 'Marlín de la tormenta', c: '#5a8ae8', kg: 160, water: ['sea', 'deep'], tier: 1, hint: 'En el mar mientras llueve o hay tormenta.', d: 0.92 },
  frostPike: { n: 'Lucio de escarcha', c: '#c8f0ff', kg: 35, water: ['cold'], tier: 1, hint: 'Agua fría mientras nieva.', d: 0.9 },
  sunscaleCarp: { n: 'Carpa de escamas de sol', c: '#ffc83a', kg: 28, water: ['warm', 'fresh'], tier: 1, hint: 'Agua cálida o dulce al mediodía (11-14 h) con el cielo despejado.', d: 0.9 },
  abyssLeviathan: { n: 'Cría de leviatán', c: '#2a3a6a', kg: 420, water: ['deep'], tier: 2, hint: 'Agua profunda, de noche, con cebo luminoso. Caña maestra.', d: 0.97 },
};
for (const id in FLEGEND) { const L = FLEGEND[id]; IT(id, L.n, L.c, 'drop', SEA_CAT, `Pez legendario (${L.hint}) Un trofeo: ponlo en tu acuario o cocínalo para un banquete.`); ITEMS[id].food = { f: 40, raw: 0.1 }; ITEMS[id].legend = 1; }
// ---------- Acuario ----------
if (!BD.aquarium) { XB('aquarium', { n: 'Acuario', cat: 3, light: 1, d: 'F: tu colección de peces, el diario de pesca y los torneos. Echa dentro un pez de cada especie para completar la colección.', look: { c: '#3a8ac8', g: '🐠', a: '' } });
  RB('aquarium', 1, okIt('glass'), okIt('glass') + '*6,planks*2'); }
// ---------- Piratas ----------
// Barcos que no son objetos (los de los piratas y el del Capitán Fantasma) y el galeón
BOATS.boatGalleon = { n: 'Galeón', c: '#6a3a1a', spd: 3.7, deep: 1, hull: '#5a3418', sail: '#efe4c8', big: 1.55, cannons: 1, d: 'Barco de guerra con cañones: con el galeón, clic izquierdo dispara balas de cañón hacia el ratón (más balas cuanto más tripulación). F junto a un barco pirata muy dañado: abordaje.' };
BOATS.pirateSloop = { n: 'Balandro pirata', hull: '#3a2418', sail: '#1c1c22', big: 1.35, skull: 1 };
BOATS.ghostShip = { n: 'El Holandés Hundido', hull: '#2e4250', sail: '#9ac8d8', big: 1.9, skull: 1, ghost: 1 };
IT('boatGalleon', BOATS.boatGalleon.n, BOATS.boatGalleon.c, 'tool', typeof EXP_CAT !== 'undefined' ? EXP_CAT : SEA_CAT, BOATS.boatGalleon.d); ITEMS.boatGalleon.boat = 1;
RB('boatGalleon', 1, okIt('boatSail'), 'planks*12,' + okIt('ironIngot') + '*6,' + okIt('rope', 'stick') + '*3', 0, 2);
IT('cannonball', 'Bala de cañón', '#3a3a40', 'nugget', SEA_CAT, 'Munición del galeón. Cada disparo gasta una.');
RB('cannonball', 8, okIt('ironIngot'), 'stone*2');
IT('pirateMap', 'Mapa pirata cifrado', '#c8a868', 'scroll', SEA_CAT, 'Úsalo (F): un trozo de costa dibujado, una ✕ y una pista. Acércate y desentierra el tesoro (F en la ✕).');
IT('cursedFragment', 'Fragmento de brújula maldita', '#7ad8c8', 'gem', SEA_CAT, 'Lo llevaban los piratas. Con tres se arma la Brújula maldita.');
IT('cursedCompass', 'Brújula maldita', '#5af0d0', 'gem', SEA_CAT, 'Úsala (F): señala dónde se hundió el barco del Capitán Fantasma. Ve de noche, en barco…');
RB('cursedCompass', 1, 'cursedFragment', 'cursedFragment*2', 0, 0);
IT('ghostSail', 'Vela fantasma', '#9ac8d8', 'sheet', SEA_CAT, 'Botín del Capitán Fantasma. Llévala encima: cualquier barco va un 35 % más rápido.');
IT('captainHat', 'Sombrero del Capitán Fantasma', '#2a2a34', 'gem', SEA_CAT, 'El trofeo de los mares. Llévalo encima: +15 % de suerte y los piratas te temen (atacan menos).');
// El Capitán Fantasma (jefe): flota sobre el agua (fantasma)
if (typeof ENEMIES !== 'undefined' && !ENEMIES.ghostCaptain) ENEMIES.ghostCaptain = { n: 'Capitán Fantasma', shape: 'ghost', c: '#9ac8d8', c2: '#2a3a4a', s: 15, hp: 1100, dmg: 22, v: 2.1, wound: 'cut', ai: 'caster', el: 'frost', elite: true, bio: [], tier: 4, night: false, undead: true, phase: true, glow: 1,
  proj: { c: '#9af0ff', spd: 13, dmg: 16 }, drops: [['coin', 120, 1]] };
