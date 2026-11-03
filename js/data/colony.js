'use strict';
// =====================================================================================
//  Tu pueblo de colonos (datos). La Vara de capataz marca en el suelo dónde trabaja cada
//  oficio (cultivo, tala, mina). La lógica está en sim/colony.js.
// =====================================================================================
if (!ITEMS.foremanRod) {
  IT('foremanRod', 'Vara de capataz', '#d0a050', 'lrod', 9, 'En la mano: pinta en el suelo las zonas de trabajo de tus colonos (cultivo, tala o mina). Clic izquierdo pinta, clic derecho borra. Tecla , (coma): tu pueblo.');
  RB('foremanRod', 1, 'stick', 'planks,stick');
}
