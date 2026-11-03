'use strict';
// =====================================================================================
//  Tu pueblo de colonos (datos). La Vara de capataz marca en el suelo dónde trabaja cada
//  oficio (cultivo, tala, mina). La lógica está en sim/colony.js.
// =====================================================================================
if (!ITEMS.foremanRod) {
  IT('foremanRod', 'Vara de capataz', '#d0a050', 'lrod', 9, 'En la mano: pinta en el suelo las zonas de trabajo de tus colonos (cultivo, tala o mina). Clic izquierdo pinta, clic derecho borra. Tecla , (coma): tu pueblo.');
  RB('foremanRod', 1, 'stick', 'planks,stick');
}
if (!BD.jobBoard) {
  XB('jobBoard', { n: 'Tablón de trabajos', cat: 3, d: 'F: reparte los oficios de tus colonos con prioridades (cada uno puede tener varios). Sin tablón, cada colono tiene un solo oficio.', look: { c: '#8a6a3a', g: '📋', a: '' } });
  RB('jobBoard', 1, 'planks', 'planks*2,stick*2');
}
