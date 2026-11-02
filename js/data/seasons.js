'use strict';
// =====================================================================================
//  Estaciones: datos (la lógica está en sim/seasons.js).
//  Cada estación dura 7 días y tiene su evento el día 4.
// =====================================================================================
const SEASONS = [
  { k: 'spring', n: 'Primavera', i: '🌸', c: '#ffb0d8', crop: 1.25, ev: 'Festival de las Flores', evd: 'Hoy los cultivos crecen el doble de rápido y tus mascotas se curan solas.' },
  { k: 'summer', n: 'Verano', i: '☀', c: '#ffd060', crop: 1.1, ev: 'Lluvia de estrellas', evd: 'Esta noche caen estrellas del cielo: corre a recoger sus fragmentos.' },
  { k: 'autumn', n: 'Otoño', i: '🍂', c: '#e08a3a', crop: 1, ev: 'Cosecha dorada', evd: 'Hoy cada cultivo maduro que recojas da el doble.' },
  { k: 'winter', n: 'Invierno', i: '❄', c: '#bfe8ff', crop: 0.35, ev: 'Noche de los regalos', evd: 'Hoy aparecen regalos por el mundo, cerca de ti. ¡Ábrelos con F!' },
];
const SEASON_DAYS = 7, SEASON_EV_DAY = 4;
// Aguantan el frío: en invierno crecen casi normal
const WINTER_CROPS = ['potato', 'carrot', 'cabbage', 'beet', 'turnip', 'onion', 'garlic', 'kale', 'leek'];
IT('starShard', 'Fragmento de estrella', '#fff4a0', 'gem', 9, 'Cae del cielo en la Lluvia de estrellas del verano. Brilla aunque sea de día.');
IT('starCharm', 'Amuleto estelar', '#fff4a0', 'gem', 9, 'Equipado (accesorio): +5 % de suerte. Hecho con fragmentos de estrella.');
ITEMS.starCharm.gear = { slot: 'acc', mods: { luck: 0.05 } };
RB('starCharm', 1, 'starShard', 'starShard*4,goldIngot*2', 0, 1);
IT('giftBox', 'Regalo de invierno', '#e04a5a', 'coin', 9, 'Apareció en la Noche de los regalos. Llévalo en la mano y pulsa F para abrirlo.');
