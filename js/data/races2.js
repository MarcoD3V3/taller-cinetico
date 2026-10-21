'use strict';
// =====================================================================================
//  Ocho razas más (20 en total). Cada una combina rasgos de cuerpo que el dibujo del
//  personaje ya sabe pintar y cambia algunos números del juego, como las demás.
// =====================================================================================
Object.assign(RACES, {
  gnome: { n: 'Gnomo', i: '🍄', d: 'Pequeños inventores: trabajan un 10 % más rápido y a veces no gastan el núcleo al fabricar. −10 de vida.', m: { work: 1.1, craftKeep: 0.06, hp: -10 }, skin: ['#f8dcc0', '#f0c8a0', '#e0a880', '#c88a68', '#a86a4a', '#f4d0c8'], f: { short: 3, ears: 'elf' } },
  minotaur: { n: 'Minotauro', i: '🐂', d: 'Fuerza bruta: +15 % cuerpo a cuerpo y +25 de vida, pero un 5 % más lentos.', m: { melee: 1.15, hp: 25, speed: 0.95 }, skin: ['#7a5a3a', '#5a3a2a', '#9a7a5a', '#3a2a20', '#c8a07a', '#8a6a5a'], f: { horns: 1, snout: 1 } },
  kitsune: { n: 'Kitsune', i: '🦊', d: 'Espíritu zorro: +8 % de suerte, +20 de maná e impulso un 15 % más barato.', m: { luck: 0.08, mana: 20, dash: 0.85 }, skin: ['#f6d7b8', '#f0c8a0', '#e8a060', '#f4ece0', '#d88a4a', '#c8b8a8'], f: { catEars: 1, tail: 'cat' } },
  dragonkin: { n: 'Dracónido', i: '🐉', d: 'Sangre de dragón: resistes el fuego, +1 de defensa y +10 de vida; comen un 15 % más.', m: { fire: 1, def: 1, hp: 10, hunger: 1.15 }, skin: ['#8a3a2a', '#3a6a4a', '#4a4a8a', '#c8a03a', '#5a5a5a', '#a84a6a'], f: { horns: 1, tail: 'lizard', scales: 1, wings: 1 } },
  triton: { n: 'Tritón', i: '🧜', d: 'Del mar: la sed baja un 40 % más despacio, +15 de maná. Pasan algo más de frío.', m: { thirst: 0.6, mana: 15, warm: -2 }, skin: ['#8ad0c8', '#6aa8c8', '#a8e0d8', '#5a8aa8', '#c8e8e0', '#7ab8a0'], f: { scales: 1, ears: 'elf', glow: '#7af0ff' } },
  vampire: { n: 'Vampiro', i: '🧛', d: 'Criatura de la noche: ve en la oscuridad, +10 % cuerpo a cuerpo y +5 % de experiencia; se cura un 20 % más lento.', m: { night: 1, melee: 1.1, xp: 1.05, heal: 0.8 }, skin: ['#e8e4e0', '#d8d0d8', '#c8c0c8', '#b8b0c0', '#f0e8e8', '#a8a0b0'], f: { ears: 'elf', glow: '#ff4a4a' } },
  sylvan: { n: 'Silvano', i: '🌳', d: 'Pueblo del bosque: talan un 20 % más rápido y se curan un 10 % antes; un poco más lentos.', m: { wood: 1.2, heal: 1.1, speed: 0.97 }, skin: ['#7a9a5a', '#5a7a3a', '#9ab87a', '#6a5a3a', '#a8c890', '#4a6a4a'], f: { ears: 'elf', glow: '#aaff7a' } },
  golem: { n: 'Gólem', i: '🗿', d: 'De piedra viva: +3 de defensa, +15 % al picar y hambre −30 %, pero un 10 % más lentos.', m: { def: 3, mine: 1.15, hunger: 0.7, speed: 0.9 }, skin: ['#8a8884', '#6a6864', '#a8a49c', '#5a5a5a', '#9a8a7a', '#7a7a8a'], f: { rivets: 1, glow: '#ffa040' } },
});
