'use strict';
// =====================================================================================
//  10 hechizos de clones: copias de ti que se reparten por grupos de enemigos y pelean.
//  Los enemigos les atacan a ellos (y te dejan en paz) hasta acabar con ellos.
//  Cada variante cambia cuántos son, cómo pelean y qué hacen especial. Lógica en sim/clones.js.
//  v: estilo (melee · ranged · caster) · n: cuántos · hp, dmg, cd: vida, daño y ritmo · t: duración
// =====================================================================================
const CLONE_SPELLS = {
  mirrorArmy: { n: 'Ejército de Espejos', i: '🪞', el: 'mind', m: 50, cd: 30, c: '#9ad8ff', v: 'melee', k: 6, hp: 140, dmg: 18, acd: 0.55, t: 16, d: '6 copias tuyas con espada se reparten por los grupos de enemigos y pelean por ti.' },
  shadowLegion: { n: 'Legión de Sombras', i: '👥', el: 'void', m: 50, cd: 30, c: '#8a5aff', v: 'melee', k: 6, hp: 100, dmg: 15, acd: 0.4, spd: 1.5, t: 14, steal: 0.25, d: '6 sombras muy rápidas: cada golpe que dan te cura un poco.' },
  flameGuard: { n: 'Guardia de Llamas', i: '🔥', el: 'fire', m: 55, cd: 32, c: '#ff7a2a', v: 'melee', k: 6, hp: 120, dmg: 16, acd: 0.55, t: 15, burn: 1, boom: 60, d: '6 clones de fuego: sus golpes queman y al caer estallan.' },
  frostKin: { n: 'Hermandad de Escarcha', i: '❄', el: 'frost', m: 50, cd: 30, c: '#bff0ff', v: 'melee', k: 6, hp: 130, dmg: 14, acd: 0.6, t: 16, chill: 1, d: '6 clones de hielo: frenan a todo lo que golpean y a veces lo congelan.' },
  phantomArchers: { n: 'Arqueros Fantasma', i: '🏹', el: 'holy', m: 50, cd: 30, c: '#fff0a0', v: 'ranged', k: 6, hp: 90, dmg: 14, acd: 0.8, t: 16, d: '6 arqueros que se mantienen a distancia y acribillan a su grupo de enemigos.' },
  twinMages: { n: 'Magos Gemelos', i: '🧙', el: 'fire', m: 60, cd: 34, c: '#ff9a5a', v: 'caster', k: 4, hp: 90, dmg: 30, acd: 1.5, t: 16, d: '4 magos que lanzan bolas de fuego explosivas a los grupos más grandes.' },
  berserkers: { n: 'Berserkers', i: '🪓', el: 'earth', m: 55, cd: 32, c: '#ff5a5a', v: 'melee', k: 6, hp: 160, dmg: 22, acd: 0.5, t: 11, rage: 1, d: '6 clones furiosos: cuanto más heridos, más fuerte pegan. Duran poco.' },
  stoneSentinels: { n: 'Centinelas de Piedra', i: '🗿', el: 'earth', m: 50, cd: 30, c: '#c8a070', v: 'melee', k: 6, hp: 340, dmg: 9, acd: 0.9, spd: 0.7, t: 18, taunt: 1, stun: 0.6, d: '6 guardianes muy duros y lentos: atraen a todos los enemigos y los aturden.' },
  lightClones: { n: 'Clones de Luz', i: '✨', el: 'holy', m: 55, cd: 32, c: '#fffbe0', v: 'melee', k: 6, hp: 110, dmg: 14, acd: 0.55, t: 15, heal: 3, nova: 1, d: '6 clones de luz: cada golpe te cura y al desaparecer sueltan una onda sagrada.' },
  doubleSwarm: { n: 'Enjambre de Dobles', i: '👯', el: 'mind', m: 50, cd: 30, c: '#ff9aff', v: 'melee', k: 12, hp: 45, dmg: 7, acd: 0.4, spd: 1.4, sc: 1.1, t: 13, d: '12 dobles pequeños y veloces que se lanzan en tropel contra todos a la vez.' },
};
const CLONE_RECIPE = { mirrorArmy: 'manaCrystal,glass,glass', shadowLegion: 'shadowEssence,ectoplasm', flameGuard: 'essenceFire,fireblossom', frostKin: 'frozenHeart,frostleaf', phantomArchers: 'spiritOrb,feather,feather', twinMages: 'manaCrystal,fireblossom,spiritOrb', berserkers: 'demonHorn,orcTusk', stoneSentinels: 'gargoyleStone,stone,stone', lightClones: 'holyWater,spiritOrb', doubleSwarm: 'manaDust,manaDust,glass' };
for (const k in CLONE_SPELLS) {
  const s = CLONE_SPELLS[k], id = 'spell_' + k; s.kind = 'clones'; SPELLS[k] = s;
  IT(id, 'Hechizo: ' + s.n, s.c, 'scroll', C_CAT, `${s.d} Duran ${s.t} s. Léelo con F para aprenderlo. Gasta ${s.m} de maná · recarga ${s.cd} s.`);
  ITEMS[id].learn = k;
  RB(id, 1, ITEMS.runeMind ? 'runeMind' : 'manaCrystal', 'parchment,arcaneInk,' + CLONE_RECIPE[k].split(',').map(x => ITEMS[x] ? x : 'manaDust').join(','), 0, 5);
}
