'use strict';
// =====================================================================================
//  Objetos de ambiente: barriles, cajas, fardos de heno, carretas, bancos, farolas, puestos con
//  toldo, tendederos, tiendas, tótems, lápidas, estatuas, molinos… Decoran los asentamientos
//  (sim/settlements.js) y también se pueden fabricar para decorar tu base. Su dibujo está en
//  sim/props.js. [id, nombre, color, se pisa, luz, núcleo, dientes, descripción]
// =====================================================================================
const PROP_CAT = BD.stoneBricks ? BD.stoneBricks.cat : 3;
const ppk = (...ids) => ids.find(id => id && ITEMS[id]) || 'planks';
const PROPS = [
  ['barrel', 'Barril', '#8a5a32', 0, 0, 'planks', 'planks*2,' + ppk('ironRod', 'stick'), 'Barril de roble con aros de hierro.'],
  ['crate', 'Caja de madera', '#a07848', 0, 0, 'planks', 'planks*2', 'Caja de tablas para guardar mercancía (decorativa).'],
  ['haystack', 'Fardo de heno', '#e0c060', 0, 0, ppk('straw', 'herbs'), ppk('straw', 'herbs') + '*2', 'Paja prensada y atada.'],
  ['woodpile', 'Pila de leña', '#7a5232', 0, 0, ppk('log', 'planks'), ppk('log', 'planks') + '*2', 'Troncos cortados y apilados para el invierno.'],
  ['cart', 'Carreta', '#8a6a42', 0, 0, 'planks', 'planks*3,stick*2', 'Carreta de madera con dos ruedas.'],
  ['bench', 'Banco', '#9a7048', 1, 0, 'planks', 'planks,stick*2', 'Banco para sentarse en la plaza.'],
  ['signpost', 'Poste indicador', '#8a6a42', 0, 0, 'stick', 'planks,stick', 'Cartel con flechas en un cruce de caminos.'],
  ['lampPost', 'Farola', '#3a3a40', 0, 5, ppk('ironRod', 'stick'), ppk('ironRod', 'stick') + ',coal,' + ppk('glass', 'stick'), 'Farola de hierro: alumbra la calle.'],
  ['awning', 'Puesto con toldo', '#c84a4a', 0, 0, 'planks', 'planks*2,' + ppk('cloth', 'herbs') + '*2', 'Puesto de mercado con toldo de rayas.'],
  ['clothesline', 'Tendedero', '#e8e0d0', 1, 0, 'stick', 'stick*2,' + ppk('cloth', 'herbs'), 'Ropa tendida al sol.'],
  ['tent', 'Tienda de pieles', '#b08a5a', 0, 0, ppk('leather', 'cloth', 'herbs'), ppk('leather', 'cloth', 'herbs') + '*2,stick*2', 'Tienda de pieles y palos de las tribus.'],
  ['totemPole', 'Tótem tallado', '#9a5a2a', 0, 0, ppk('log', 'planks'), ppk('log', 'planks') + ',' + ppk('dye', 'petals', 'herbs'), 'Tótem pintado con los espíritus de la tribu.'],
  ['dryingRack', 'Secadero', '#8a6a42', 0, 0, 'stick', 'stick*3,' + ppk('leather', 'herbs'), 'Pieles y hierbas secándose al aire.'],
  ['boulder', 'Roca grande', '#8a8884', 0, 0, 'stone', 'stone*3', 'Una roca enorme.'],
  ['bush', 'Arbusto', '#3a7a2e', 0, 0, 'herbs', 'herbs*2', 'Arbusto frondoso.'],
  ['minecart', 'Vagoneta', '#5a5a60', 0, 0, ppk(MF && MF.iron && MF.iron.plate, 'stone'), 'stone*2', 'Vagoneta de la mina, llena de mena.'],
  ['orePile', 'Montón de mena', '#7a6a60', 0, 0, 'stone', 'stone,' + ppk('coal', 'stone'), 'Mena recién sacada de la mina.'],
  ['banner', 'Estandarte', '#c84a3a', 0, 0, ppk('cloth', 'herbs'), ppk('cloth', 'herbs') + ',stick*2', 'Estandarte con los colores del pueblo.'],
  ['tombstone', 'Lápida', '#9a9890', 0, 0, 'stone', 'stone*2', 'Aquí descansa alguien del pueblo.'],
  ['statue', 'Estatua', '#c8c4bc', 0, 0, ppk('stoneBlock', 'stone'), ppk('stoneBlock', 'stone') + '*3', 'Estatua del fundador.'],
  ['windmill', 'Aspas de molino', '#e8e0d0', 0, 0, 'planks', 'planks*4,' + ppk('cloth', 'herbs') + '*4', 'Aspas que giran con el viento: ponlas sobre una torre.'],
  ['trough', 'Abrevadero', '#7a5a3a', 0, 0, 'planks', 'planks*3', 'Abrevadero con agua para los animales.'],
  ['pot', 'Vasija de barro', '#b0643e', 0, 0, ppk('clay', 'dirt'), ppk('clay', 'dirt') + '*2', 'Vasija decorada a mano.'],
  ['flowerCart', 'Carro de flores', '#c87aa0', 0, 0, 'planks', 'planks*2,' + ppk('petals', 'herbs') + '*3', 'Carrito lleno de flores.'],
];
for (const [id, n, c, walk, light, core, teeth, d] of PROPS) { if (BD[id]) continue;
  XB(id, { n, cat: PROP_CAT, walk, ...(light ? { light } : {}), d: d + ' Decoración: clic izquierdo para quitarla.', look: { c, g: '', a: '' } });
  RB(id, 1, core, teeth, 0, 0); }
