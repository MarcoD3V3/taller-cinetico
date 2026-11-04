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
// Edificios del pueblo (fase 4): funcionan cuando el pueblo llega a su nivel
for (const [id, n, c, g, core, teeth, d] of [
  ['townHall', 'Mesa del ayuntamiento', '#7a4a2a', '🏛', 'planks', 'planks*4,ironIngot', 'Desde Aldea: permite dictar leyes (raciones, jornada e impuestos) en la ventana del pueblo.'],
  ['tavernBar', 'Barra de taberna', '#8a5a2a', '🍺', 'planks', 'planks*3,barrel', 'Desde Aldea: los colonos pasan la tarde aquí en vez de en la plaza (+ánimo).'],
  ['armory', 'Armero', '#5a5a64', '🛡', 'ironIngot', 'ironIngot*3,planks*2', 'Desde Aldea: tus guardias hacen más daño y vigilan más lejos.'],
  ['marketStall', 'Puesto del mercado', '#c84a4a', '⚖', 'planks', 'planks*3,herbs*2', 'Desde Pueblo: cada día deja monedas en un cofre y atrae más mercaderes.'],
  ['schoolDesk', 'Pupitre', '#9a7048', '📚', 'planks', 'planks*2,paper', 'Desde Pueblo: cada día los niños y los colonos aprenden un poco de sus oficios.'],
  ['hospitalBed', 'Camilla', '#e8e0d0', '✚', 'planks', 'planks*2,bandage*2', 'Desde Pueblo: los enfermos se curan tres veces más rápido.'],
]) { if (BD[id]) continue; XB(id, { n, cat: 3, d, look: { c, g, a: '' } }); RB(id, 1, core, teeth.split(',').map(t => ITEMS[t.split('*')[0]] ? t : 'planks').join(','), 0, 0); }
