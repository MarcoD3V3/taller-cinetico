'use strict';
// =====================================================================================
//  10 hechizos de onda expansiva: lanzan lejos a los enemigos que te rodean, cada uno a su
//  manera. Lógica en sim/shockwaves.js. r: alcance · pw: fuerza del empujón · dmg: daño
// =====================================================================================
const SHOCK_SPELLS = {
  shockBlast: { n: 'Onda de Choque Mayor', i: '◎', el: 'earth', m: 30, cd: 8, kind: 'kbBlast', r: 190, pw: 620, dmg: 20, c: '#e8d8b0', d: 'Una onda enorme que lanza lejos a todos los que te rodean.' },
  galeBurst: { n: 'Estallido de Viento', i: '🌬', el: 'storm', m: 22, cd: 5, kind: 'kbGale', r: 260, pw: 760, dmg: 8, c: '#c8f0ff', d: 'Un vendaval en cono hacia donde miras que barre a los enemigos muy lejos.' },
  repulsorNova: { n: 'Nova Repulsora', i: '❂', el: 'mind', m: 34, cd: 10, kind: 'kbPulses', r: 170, pw: 380, dmg: 12, n2: 3, c: '#c8a8ff', d: 'Tres pulsos seguidos que empujan cada vez más lejos.' },
  seismicRoar: { n: 'Rugido Sísmico', i: '⛰', el: 'earth', m: 32, cd: 10, kind: 'kbSeismic', r: 170, pw: 520, dmg: 24, stun: 1.4, c: '#c8843a', d: 'Golpeas el suelo: la tierra se agrieta, los lanza y los deja aturdidos.' },
  solarFlare: { n: 'Llamarada Solar', i: '☀', el: 'fire', m: 34, cd: 10, kind: 'kbSolar', r: 180, pw: 560, dmg: 26, c: '#ffd060', d: 'Estallas como un sol: los empujas, los quemas y los deslumbras.' },
  frostPulse: { n: 'Pulso Gélido', i: '❄', el: 'frost', m: 28, cd: 8, kind: 'kbFrost', r: 170, pw: 520, dmg: 16, c: '#bff0ff', d: 'Los lanza lejos y, al aterrizar, quedan congelados.' },
  voidRepel: { n: 'Repulsión del Vacío', i: '◉', el: 'void', m: 30, cd: 9, kind: 'kbVoid', r: 180, pw: 600, dmg: 18, c: '#a060ff', d: 'El vacío los escupe lejos de ti y se quedan desorientados.' },
  godHammer: { n: 'Martillo de los Dioses', i: '🔨', el: 'holy', m: 55, cd: 18, kind: 'kbHammer', r: 230, pw: 900, dmg: 60, c: '#fff4c0', d: 'Un martillo de luz cae sobre ti: el golpe más brutal, los manda volando.' },
  bounceAura: { n: 'Aura de Rebote', i: '⭕', el: 'mind', m: 36, cd: 18, kind: 'kbAura', r: 70, pw: 480, dmg: 6, t: 7, c: '#9affd8', d: 'Durante 7 s, todo enemigo que se te acerque sale rebotado.' },
  cyclone: { n: 'Ciclón', i: '🌀', el: 'storm', m: 32, cd: 10, kind: 'kbCyclone', r: 170, pw: 480, dmg: 10, c: '#a8e0ff', d: 'Un remolino que los hace girar a tu alrededor y los escupe en espiral.' },
};
const SHOCK_RECIPE = { shockBlast: 'gargoyleStone,stone,stone,feather', galeBurst: 'feather,feather,griffinFeather', repulsorNova: 'manaCrystal,manaDust', seismicRoar: 'gargoyleStone,obsidian', solarFlare: 'fireblossom,holyWater', frostPulse: 'frostleaf,frozenHeart', voidRepel: 'shadowEssence,ectoplasm', godHammer: 'holyWater,goldIngot,spiritOrb', bounceAura: 'manaCrystal,slimeGel', cyclone: 'feather,essenceStorm' };
for (const k in SHOCK_SPELLS) {
  const s = SHOCK_SPELLS[k], id = 'spell_' + k; SPELLS[k] = s;
  IT(id, 'Hechizo: ' + s.n, s.c, 'scroll', C_CAT, `${s.d} Léelo con F para aprenderlo. Gasta ${s.m} de maná · recarga ${s.cd} s.`);
  ITEMS[id].learn = k;
  RB(id, 1, ITEMS.runeEarth ? 'runeEarth' : 'manaCrystal', 'parchment,arcaneInk,' + SHOCK_RECIPE[k].split(',').map(x => ITEMS[x] ? x : 'manaDust').join(','), 0, 4);
}
