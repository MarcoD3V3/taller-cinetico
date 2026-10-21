'use strict';
// =====================================================================================
//  Módulos de mejora para máquinas y generadores (se instalan en la ficha de cada bloque,
//  pestaña Mantenimiento; dos huecos por bloque) y material de mantenimiento.
// =====================================================================================
const UP_CAT = ICATS.length; ICATS.push('Mejoras');
const UPGRADES = {
  upSpeed: { n: 'Módulo de velocidad', c: '#5ab0ff', d: 'Trabaja un 25 % más rápido, pero se desgasta un 30 % más.', fx: { spd: 1.25, wear: 1.3 }, r: ['circuit', MF.copper.wire + ',' + MF.iron.gear] },
  upEff: { n: 'Módulo de eficiencia', c: '#7ae07a', d: 'Un 12 % de veces no gasta material. Los generadores dan un 10 % más.', fx: { save: 0.12, gen: 1.1 }, r: ['circuit', MF.iron.plate + ',resistor'] },
  upQual: { n: 'Módulo de calidad', c: '#ffd34a', d: 'Un 8 % de veces sale una pieza de más.', fx: { extra: 0.08 }, r: ['circuit', MF.gold.foil + ',lens'] },
  upCool: { n: 'Disipador de calor', c: '#bff0ff', d: 'Se calienta la mitad y se desgasta un 20 % menos.', fx: { heat: 0.5, wear: 0.8 }, r: ['heatsink', MF.copper.plate] },
  upAuto: { n: 'Autoexpulsor', c: '#c8a0e0', d: 'Lo que fabrica pasa solo a un cofre de al lado.', fx: { auto: 1 }, r: ['servo', 'chest'] },
};
for (const id in UPGRADES) { const u = UPGRADES[id]; NI(id, u.n, u.c, 'chip', UP_CAT, u.d + ' Se instala en la ficha de la máquina (F).'); ITEMS[id].upgrade = u.fx; RR(id, 1, u.r[0], u.r[1]); }
NI('maintKit', 'Kit de mantenimiento', '#c8843a', 'block', UP_CAT, 'Repara del todo una máquina o generador gastado (ficha › Mantenimiento).');
RR('maintKit', 1, MF.iron.plate, MF.iron.screw + ',' + MF.iron.spring + ',lubricant');
RR('maintKit', 1, MF.iron.plate, MF.iron.bolt + ',' + MF.iron.screw);
