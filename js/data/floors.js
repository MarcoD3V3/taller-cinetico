'use strict';
// =====================================================================================
//  Casas de varios pisos: datos (la lógica está en sim/floors.js).
//  · Escalera en L: dentro de una casa con tejado, súbela andando y llegas al piso de arriba
//    (si no existe, se construye: mismo suelo, mismas paredes y mismo tejado). Hasta 5 pisos.
//  · Escalera de bajada: aparece sola arriba, donde llegas. Andando por ella bajas.
//  · Cada piso es una franja lejana del mismo mundo (como las capas subterráneas), así que se
//    guarda y se comparte en línea igual que todo: cada jugador puede estar en un piso distinto.
// =====================================================================================
TLx('FLOOR_AIR', { n: 'Vacío (fuera del piso)', c: [22, 24, 28], solid: 1, flat: 1 }); // mismo color que el oscurecido de fuera de casa: no parece roca
BI('houseFloor', { n: 'Piso de una casa', g: 'PLANKFLOOR', fauna: [], fd: 0, mc: '#3a2a1a' });
const FL_BCAT = BD.stoneBricks ? BD.stoneBricks.cat : 3;
XB('stairsL', { n: 'Escalera en L', cat: FL_BCAT, walk: 1, d: 'Dentro de una casa con tejado: pasa por encima y subes al piso de arriba (si no existe, se construye con las mismas paredes y el mismo tejado). Hasta 5 pisos. R para girarla.', look: { c: '#9a6a3c', g: '', a: '' } });
RB('stairsL', 1, 'planks', 'planks*4,stick*2', 0, 0);
XB('stairsDown', { n: 'Escalera de bajada', cat: FL_BCAT, walk: 1, d: 'Baja al piso de abajo: pasa por encima. Aparece sola al subir por una Escalera en L.', look: { c: '#7a5232', g: '', a: '' } });
