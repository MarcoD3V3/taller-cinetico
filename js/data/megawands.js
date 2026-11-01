'use strict';
// =====================================================================================
//  5 varitas legendarias. Cada una canaliza un único MEGA hechizo que no existe en pergamino:
//  con ella en la mano no se puede lanzar ningún otro hechizo (todas las teclas y el clic
//  derecho lanzan su mega hechizo). Lo que hacen está en sim/megawands.js.
// =====================================================================================
const MEGA = {
  wandPhoenix: { w: 'Varita del Fénix Eterno', c: '#ff7a2a', el: 'fire', n: 'Renacer del Fénix', i: '🔥', m: 100, cd: 45, kind: 'phoenix', dmg: 70, q: 'De las cenizas, otra vez.', d: 'Un fénix gigante nace de ti: te cura del todo, vuela a tu alrededor quemando y se estrella en el cursor.', mats: 'phoenixFeather,phoenixFeather,essenceFire,sunstone,dragonEye' },
  wandAbyss: { w: 'Báculo del Abismo', c: '#9a4aff', el: 'void', n: 'Puerta del Abismo', i: '🕳', m: 100, cd: 50, kind: 'rift', dmg: 45, q: 'Algo mira desde el otro lado.', d: 'Abre una grieta en el cursor: 8 tentáculos azotan y arrastran a los enemigos, y luego implosiona.', mats: 'voidCore,singularity,shadowEssence,shadowEssence,ectoplasm' },
  wandTempest: { w: 'Cetro de la Tormenta Eterna', c: '#f0f05a', el: 'storm', n: 'Tormenta Divina', i: '⚡', m: 100, cd: 45, kind: 'tempest', dmg: 48, q: 'El cielo obedece.', d: '6 esferas de rayo te rodean y lanzan cadenas eléctricas a todo lo que ves; al final, un trueno arrasa la pantalla.', mats: 'essenceStorm,essenceStorm,griffinFeather,stormCore,manaCrystal' },
  wandWinter: { w: 'Vara del Invierno Primordial', c: '#9ad8ff', el: 'frost', n: 'Avalancha Glacial', i: '☄', m: 100, cd: 45, kind: 'glacier', dmg: 300, q: 'Que caiga el primer invierno.', d: 'Un cometa de hielo se estrella en el cursor, congela todo alrededor y libera tres anillos de picos de hielo.', mats: 'frozenHeart,frozenHeart,frostFang,yetiFur,manaCrystal' },
  wandCosmos: { w: 'Bastón del Cosmos', c: '#e0c8ff', el: 'mind', n: 'Constelación', i: '✨', m: 100, cd: 50, kind: 'cosmos', dmg: 110, q: 'Escrito en las estrellas.', d: 'Une a los enemigos en una constelación, les lanza una estrella a cada uno y hace estallar todas las líneas.', mats: 'timeCrystal,starsilverIngot,prism,spiritOrb,manaCrystal' },
};
for (const id in MEGA) {
  const M = MEGA[id];
  weapon(id, M.w, M.c, 'wand', { dmg: 4, reach: 72, el: M.el }, `LEGENDARIA. Disparo mágico potente. Mega hechizo: «${M.n}» (${M.m} maná, ${M.cd} s): ${M.d} Con ella en la mano no puedes lanzar otros hechizos: cualquier tecla de hechizo o el clic derecho desatan su mega hechizo.`);
  ITEMS[id].weapon.ranged = { cd: 0.3, spd: 20, mana: 6, n: 2, spread: 0.12, pierce: 2 }; ITEMS[id].rar = 6; ITEMS[id].mega = 1;
  const ok = x => ITEMS[x] ? x : 'manaCrystal';
  RB(id, 1, ITEMS.runeMind ? 'runeMind' : 'manaCrystal', M.mats.split(',').map(ok).concat(['arcaneInk']).join(','), 0, 6);
}
