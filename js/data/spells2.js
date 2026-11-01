'use strict';
// =====================================================================================
//  30 hechizos nuevos (cada uno con su propia mecánica) y 15 hechizos MORTALES: carísimos,
//  de recarga larga y con escena propia (bandas de cine, título, temblor y efectos que llenan
//  la pantalla). Se aprenden con pergaminos del banco, como los demás. Lo que hacen está en
//  sim/spells2.js.
// =====================================================================================
const SPELLS2 = {
  prismBeam: { n: 'Rayo prismático', i: '⟿', el: 'holy', m: 22, cd: 3, kind: 'beam', dmg: 34, len: 260, t: 1.1, c: '#fff6b0', d: 'Un rayo continuo hacia el cursor que quema todo lo que atraviesa.' },
  dragonBreath: { n: 'Aliento de dragón', i: '🐉', el: 'fire', m: 24, cd: 4, kind: 'cone', dmg: 30, len: 150, t: 1, c: '#ff7a2a', d: 'Un cono de llamas delante de ti durante un segundo.' },
  lightDisc: { n: 'Disco de luz', i: '◎', el: 'holy', m: 14, cd: 1.6, kind: 'disc', dmg: 26, c: '#ffe890', d: 'Un disco que sale y vuelve a tu mano atravesando a todos.' },
  guardOrbs: { n: 'Orbes guardianes', i: '⦿', el: 'mind', m: 26, cd: 12, kind: 'orbit', dmg: 14, n2: 4, t: 9, c: '#c8a8ff', d: '4 orbes giran a tu alrededor y golpean a quien se acerque.' },
  fireWall: { n: 'Muro de fuego', i: '▥', el: 'fire', m: 28, cd: 9, kind: 'wall', dmg: 14, t: 6, c: '#ff5a1a', d: 'Levanta un muro de llamas en el cursor, de lado a tu mirada.' },
  regrowth: { n: 'Regeneración', i: '❦', el: 'life', m: 22, cd: 14, kind: 'regen', amt: 60, t: 10, c: '#7ae05a', d: 'Te curas poco a poco durante 10 s.' },
  decoy: { n: 'Señuelo ilusorio', i: '👤', el: 'mind', m: 20, cd: 16, kind: 'decoy', t: 8, c: '#a0c8ff', d: 'Una copia tuya que atrae a los enemigos y explota al final.' },
  judgment: { n: 'Juicio del rayo', i: 'ϟ', el: 'storm', m: 20, cd: 3, kind: 'strike', dmg: 70, r: 40, c: '#f0f05a', d: 'Un rayo cae del cielo en el cursor y aturde.' },
  vortex: { n: 'Vórtice', i: '🌀', el: 'void', m: 26, cd: 8, kind: 'vortex', dmg: 30, r: 150, c: '#a060ff', d: 'Arrastra a los enemigos al cursor y estalla.' },
  shockwave: { n: 'Onda de choque', i: '◌', el: 'earth', m: 18, cd: 5, kind: 'push', dmg: 18, r: 130, c: '#c8a070', d: 'Empuja lejos a todos los que te rodean.' },
  emberDash: { n: 'Embestida ígnea', i: '☄', el: 'fire', m: 16, cd: 4, kind: 'dash', dmg: 32, r: 6, c: '#ff6a1a', d: 'Te lanzas hacia el cursor quemando lo que atraviesas.' },
  arcaneRain: { n: 'Lluvia arcana', i: '⁂', el: 'mind', m: 30, cd: 9, kind: 'rain', dmg: 9, r: 90, t: 2.5, c: '#e0a0ff', d: 'Una lluvia de flechas de luz sobre el cursor.' },
  runeMines: { n: 'Runas explosivas', i: '᛭', el: 'fire', m: 24, cd: 10, kind: 'mines', dmg: 55, n2: 5, c: '#ffb040', d: '5 runas en el suelo que estallan cuando algo las pisa.' },
  vampAura: { n: 'Aura vampírica', i: '🩸', el: 'life', m: 30, cd: 16, kind: 'aura', dmg: 10, r: 80, t: 8, c: '#e03050', d: 'Durante 8 s dañas a quien esté cerca y te curas con ello.' },
  thornSkin: { n: 'Piel de espinas', i: '✷', el: 'earth', m: 20, cd: 18, kind: 'thorns', dmg: 25, t: 12, c: '#6aa83a', d: 'Quien te golpee recibe espinas de vuelta.' },
  absoluteZero: { n: 'Cero absoluto', i: '❅', el: 'frost', m: 26, cd: 6, kind: 'beam', dmg: 16, len: 220, t: 1.2, freeze: 1.5, c: '#bff0ff', d: 'Un rayo gélido que congela todo lo que toca.' },
  venomDart: { n: 'Dardo venenoso', i: '➶', el: 'poison', m: 10, cd: 1, kind: 'dart', dmg: 14, c: '#9ae040', d: 'Un dardo rápido con un veneno muy fuerte.' },
  bouncer: { n: 'Esfera saltarina', i: '⚬', el: 'storm', m: 16, cd: 2.5, kind: 'bounce', dmg: 22, n2: 7, c: '#5af0ff', d: 'Rebota de enemigo en enemigo hasta 7 veces.' },
  beeSwarm: { n: 'Enjambre arcano', i: '🐝', el: 'life', m: 24, cd: 8, kind: 'swarm', dmg: 7, t: 3, c: '#ffd34a', d: 'Durante 3 s salen abejas de luz que buscan enemigos.' },
  earthSpikes: { n: 'Picos de tierra', i: '⋀', el: 'earth', m: 22, cd: 5, kind: 'spikes', dmg: 36, len: 240, c: '#a8784a', d: 'Una hilera de picos brota del suelo hasta el cursor.' },
  tornado: { n: 'Tornado', i: '🌪', el: 'storm', m: 32, cd: 10, kind: 'tornado', dmg: 12, r: 46, t: 5, c: '#c8e0f0', d: 'Un tornado avanza hacia el cursor arrastrando enemigos.' },
  gravityWell: { n: 'Gravedad aplastante', i: '⊚', el: 'void', m: 26, cd: 9, kind: 'gravity', dmg: 10, r: 100, t: 5, c: '#6a3aaa', d: 'Una zona donde todo pesa: los enemigos casi no se mueven.' },
  shadowStep: { n: 'Paso sombrío', i: '☾', el: 'void', m: 18, cd: 4, kind: 'shadowstep', dmg: 60, c: '#7a4aff', d: 'Apareces detrás del enemigo más cercano al cursor y le asestas un tajo.' },
  sunPillar: { n: 'Pilar solar', i: '☼', el: 'holy', m: 30, cd: 8, kind: 'pillar', dmg: 22, r: 50, t: 2.5, c: '#fff0a0', d: 'Una columna de luz que quema durante 2,5 s.' },
  mirrorBlades: { n: 'Espadas espectrales', i: '⚔', el: 'mind', m: 34, cd: 20, kind: 'blades', dmg: 16, n2: 3, t: 14, c: '#9ad8ff', d: '3 espadas fantasma pelean a tu lado.' },
  manaShield: { n: 'Escudo de maná', i: '⬡', el: 'mind', m: 30, cd: 20, kind: 'manashield', amt: 1.6, t: 10, c: '#5a8aff', d: 'Un escudo que aguanta tanto como el maná que te queda.' },
  purify: { n: 'Purificación', i: '✧', el: 'holy', m: 18, cd: 15, kind: 'purify', amt: 25, c: '#ffffff', d: 'Te quita veneno y quemaduras, te cura y repele a los cercanos.' },
  timeBubble: { n: 'Burbuja temporal', i: '◷', el: 'time', m: 28, cd: 12, kind: 'slowfield', r: 120, t: 6, c: '#ffe0ff', d: 'Una burbuja donde los enemigos van a cámara lenta.' },
  crystalShards: { n: 'Esquirlas de cristal', i: '✦', el: 'frost', m: 14, cd: 1.4, kind: 'shards', dmg: 11, n2: 9, c: '#b090ff', d: '9 esquirlas en abanico, como una escopeta.' },
  frostBloom: { n: 'Flor de escarcha', i: '❉', el: 'frost', m: 18, cd: 2.5, kind: 'splitter', dmg: 24, n2: 4, c: '#8ad8ff', d: 'Al chocar se abre en 4 lanzas de hielo.' },
  astralTrail: { n: 'Estela Astral', i: '☄', el: 'mind', m: 45, cd: 14, kind: 'cursorOrb', dmg: 34, t: 6, c: '#ff7aff', d: 'Un astro vivo sigue tu cursor durante 6 s: arrasa todo lo que toca, deja una estela que quema y al final estalla.' },
  // ---------- Mortales ----------
  apocalypse: { n: 'Apocalipsis', i: '☄', el: 'fire', m: 90, cd: 70, kind: 'm_apoc', dmg: 90, t: 4, mortal: 1, c: '#ff5a10', q: 'El cielo arde y cae sobre la tierra.', d: '24 meteoritos caen sobre toda la zona durante 4 s.' },
  divineJudgment: { n: 'Juicio Divino', i: '✝', el: 'holy', m: 85, cd: 60, kind: 'm_judgment', dmg: 420, r: 160, mortal: 1, c: '#fffbe0', q: 'Que la luz decida quién vive.', d: 'Una columna de luz colosal desde el cielo sobre el cursor.' },
  supernova: { n: 'Supernova', i: '✺', el: 'fire', m: 100, cd: 80, kind: 'm_nova', dmg: 300, r: 420, mortal: 1, c: '#ffe0a0', q: 'Una estrella muere a tu alrededor.', d: 'Estallas como una estrella: todo lo que ves arde.' },
  singularity: { n: 'Singularidad', i: '⬤', el: 'void', m: 95, cd: 75, kind: 'm_sing', dmg: 380, r: 320, t: 4, mortal: 1, c: '#7a2aff', q: 'Ni la luz escapa.', d: 'Un agujero negro gigante lo traga todo y colapsa.' },
  heavenWrath: { n: 'Ira del Cielo', i: '⚡', el: 'storm', m: 85, cd: 60, kind: 'm_wrath', dmg: 70, t: 4, mortal: 1, c: '#f0f05a', q: 'Mil truenos a la vez.', d: '50 rayos caen sobre todos los enemigos de la pantalla.' },
  eternalIce: { n: 'Glaciación Eterna', i: '❄', el: 'frost', m: 85, cd: 65, kind: 'm_ice', dmg: 160, t: 6, mortal: 1, c: '#bff0ff', q: 'El mundo entero se congela.', d: 'Todo enemigo a la vista queda congelado 6 s entre cristales de hielo.' },
  fireDragon: { n: 'Dragón Ígneo', i: '🐲', el: 'fire', m: 95, cd: 70, kind: 'm_dragon', dmg: 45, t: 5, mortal: 1, c: '#ff6a1a', q: 'Despierta, bestia de fuego.', d: 'Un dragón de llamas serpentea por la pantalla abrasándolo todo.' },
  arcaneTsunami: { n: 'Tsunami Arcano', i: '🌊', el: 'mind', m: 90, cd: 65, kind: 'm_wave', dmg: 200, mortal: 1, c: '#5a9aff', q: 'La marea del maná no perdona.', d: 'Una ola gigante de energía barre la pantalla hacia donde miras.' },
  cataclysm: { n: 'Cataclismo', i: '⛰', el: 'earth', m: 90, cd: 65, kind: 'm_quake', dmg: 120, t: 3, mortal: 1, c: '#c8843a', q: 'La tierra se abre bajo sus pies.', d: 'Grietas en estrella y tres terremotos que aturden a todos.' },
  swordRain: { n: 'Lluvia de Espadas', i: '🗡', el: 'holy', m: 90, cd: 65, kind: 'm_swords', dmg: 140, n2: 30, mortal: 1, c: '#e0f0ff', q: 'Que caigan los aceros de los dioses.', d: '30 espadas gigantes caen del cielo sobre tus enemigos.' },
  deathWord: { n: 'Palabra de Muerte', i: '☠', el: 'void', m: 100, cd: 90, kind: 'm_death', dmg: 250, mortal: 1, c: '#a0ff90', q: 'Una sola palabra.', d: 'Mata en el acto a los enemigos heridos (menos del 35 %) y destroza al resto.' },
  eclipse: { n: 'Eclipse', i: '🌑', el: 'void', m: 85, cd: 70, kind: 'm_eclipse', dmg: 40, t: 7, mortal: 1, c: '#3a1a5a', q: 'Que se apague el sol.', d: 'La oscuridad lo cubre todo: los enemigos se confunden y sangran sombra.' },
  endRay: { n: 'Rayo del Fin', i: '⟴', el: 'storm', m: 95, cd: 70, kind: 'm_ray', dmg: 130, t: 3.2, mortal: 1, c: '#ff40ff', q: 'Todo lo que toque, deja de existir.', d: 'Un láser colosal que sigue al cursor durante 3 s.' },
  soulStorm: { n: 'Tormenta de Almas', i: '👻', el: 'life', m: 85, cd: 65, kind: 'm_souls', dmg: 55, n2: 40, t: 4, mortal: 1, c: '#9af0ff', q: 'Los muertos responden a tu llamada.', d: '40 almas salen en espiral, persiguen enemigos y te curan.' },
  timeEnd: { n: 'Fin de los Tiempos', i: '⌛', el: 'time', m: 100, cd: 90, kind: 'm_time', dmg: 0, t: 5, mortal: 1, c: '#ffe0ff', q: 'El tiempo se detiene… y luego cobra su deuda.', d: 'Todo se detiene 5 s; el daño que hagas se acumula y estalla al final multiplicado.' },
};
const SPELL2_RECIPE = {
  prismBeam: ['runeLife', 'arcaneInk,holyWater,crystal'], dragonBreath: ['runeFire', 'arcaneInk,fireblossom,demonHorn'], lightDisc: ['runeLife', 'arcaneInk,holyWater'], guardOrbs: ['runeMind', 'arcaneInk,manaCrystal,manaDust'],
  fireWall: ['runeFire', 'arcaneInk,fireblossom,obsidian'], regrowth: ['runeLife', 'arcaneInk,herbs,mandrake'], decoy: ['runeMind', 'arcaneInk,ectoplasm,silk'], judgment: ['runeStorm', 'arcaneInk,essenceStorm'],
  vortex: ['runeVoid', 'arcaneInk,shadowEssence'], shockwave: ['runeEarth', 'arcaneInk,gargoyleStone,stone'], emberDash: ['runeFire', 'arcaneInk,fireblossom,feather'], arcaneRain: ['runeMind', 'arcaneInk,manaDust,feather'],
  runeMines: ['runeFire', 'arcaneInk,gunpowder,obsidian'], vampAura: ['runeLife', 'arcaneInk,batWing,batWing'], thornSkin: ['runeEarth', 'arcaneInk,mandrake,bone'], absoluteZero: ['runeFrost', 'arcaneInk,frozenHeart,frostleaf'],
  venomDart: ['runeLife', 'arcaneInk,venom'], bouncer: ['runeStorm', 'arcaneInk,copperWire'], beeSwarm: ['runeLife', 'arcaneInk,honeycomb'], earthSpikes: ['runeEarth', 'arcaneInk,gargoyleStone'],
  tornado: ['runeStorm', 'arcaneInk,griffinFeather,feather'], gravityWell: ['runeVoid', 'arcaneInk,shadowEssence,obsidian'], shadowStep: ['runeVoid', 'arcaneInk,ectoplasm,batWing'], sunPillar: ['runeLife', 'arcaneInk,holyWater,fireblossom'],
  mirrorBlades: ['runeMind', 'arcaneInk,spiritOrb,ironIngot'], manaShield: ['runeMind', 'arcaneInk,manaCrystal,manaCrystal'], purify: ['runeLife', 'arcaneInk,holyWater,herbs'], timeBubble: ['runeTime', 'arcaneInk,timeCrystal'],
  astralTrail: ['runeMind', 'arcaneInk,manaCrystal,spiritOrb,prism'], crystalShards: ['runeFrost', 'arcaneInk,crystal,crystal'], frostBloom: ['runeFrost', 'arcaneInk,frostleaf,frozenHeart'],
  apocalypse: ['runeFire', 'arcaneInk,demonHorn,essenceFire,phoenixFeather,obsidian'], divineJudgment: ['runeLife', 'arcaneInk,holyWater,holyWater,spiritOrb,goldIngot'], supernova: ['runeFire', 'arcaneInk,essenceFire,essenceFire,phoenixFeather,manaCrystal'],
  singularity: ['runeVoid', 'arcaneInk,singularity,singularity,voidCore,shadowEssence'], heavenWrath: ['runeStorm', 'arcaneInk,essenceStorm,essenceStorm,griffinFeather,manaCrystal'], eternalIce: ['runeFrost', 'arcaneInk,frozenHeart,frozenHeart,frostFang,manaCrystal'],
  fireDragon: ['runeFire', 'arcaneInk,dragonEye,drakeScale,essenceFire,phoenixFeather'], arcaneTsunami: ['runeMind', 'arcaneInk,manaCrystal,manaCrystal,spiritOrb,manaDust'], cataclysm: ['runeEarth', 'arcaneInk,gargoyleStone,gargoyleStone,obsidian,mandrake'],
  swordRain: ['runeLife', 'arcaneInk,holyWater,spiritOrb,steelIngot,goldIngot'], deathWord: ['runeVoid', 'arcaneInk,shadowEssence,shadowEssence,voidCore,bone'], eclipse: ['runeVoid', 'arcaneInk,shadowEssence,singularity,darkCloth,manaCrystal'],
  endRay: ['runeStorm', 'arcaneInk,essenceStorm,prism,voidCore,manaCrystal'], soulStorm: ['runeLife', 'arcaneInk,spiritOrb,spiritOrb,ectoplasm,ectoplasm'], timeEnd: ['runeTime', 'arcaneInk,timeCrystal,timeCrystal,chronoCore,chronoCore'],
};
for (const k in SPELLS2) {
  const s = SPELLS2[k], id = 'spell_' + k; SPELLS[k] = s;
  IT(id, (s.mortal ? '☠ Hechizo mortal: ' : 'Hechizo: ') + s.n, s.c, 'scroll', C_CAT, `${s.d} Léelo con F para aprenderlo. Gasta ${s.m} de maná · recarga ${s.cd} s · elemento ${s.el}.${s.mortal ? ' MORTAL: necesitas una varita en la mano.' : ''}`);
  ITEMS[id].learn = k; if (s.mortal) ITEMS[id].rar = 5;
  const [core, teeth] = SPELL2_RECIPE[k], ok = id2 => ITEMS[id2] ? id2 : ITEMS.manaDust ? 'manaDust' : 'arcaneInk';
  RB(id, 1, ITEMS[core] ? core : 'runeMind', 'parchment,' + teeth.split(',').map(ok).join(','), 0, s.mortal ? 6 : 4);
}
