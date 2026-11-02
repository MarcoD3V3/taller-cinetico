'use strict';
// =====================================================================================
//  Clanes y comercio: bloques (la lógica está en sim/clans.js).
// =====================================================================================
XB('clanBanner', { n: 'Estandarte del clan', cat: 6, tier: 0, d: 'Colócalo siendo de un clan: protege 12 casillas a su alrededor. Ahí solo los de tu clan pueden construir, romper y cavar. Cada clan puede tener 3.', look: { c: '#c8a040', g: '⚑', a: '' } });
RB('clanBanner', 1, 'planks', 'cloth*3,stick*2,' + MF.iron.ingot, 0, 0);
XB('clanChest', { n: 'Cofre del clan', cat: 3, slots: 27, d: 'Como un cofre, pero solo lo abren los del clan de quien lo puso. 27 ranuras.', look: { c: '#7a4a8a', g: '▣', a: '' } });
RB('clanChest', 1, 'chest', MF.iron.plate + ',' + MF.iron.plate + ',cloth', 0, 0);
XB('marketStall', { n: 'Puesto de venta', cat: 3, d: 'Deja objetos a la venta con su precio: los demás jugadores compran aunque no estés y las monedas se guardan aquí hasta que las recojas. F para abrirlo.', look: { c: '#b07a3a', g: '⚖', a: '' } });
RB('marketStall', 1, 'planks', 'planks*3,cloth*2,stick', 0, 0);
