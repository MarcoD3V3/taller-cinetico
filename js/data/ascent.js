'use strict';
// =====================================================================================
//  El Ascenso: 56 jefes nuevos, del 1 al 56, cada uno más difícil de invocar y de vencer.
//  El último, El Primer Motor, es el jefe final.
//   · Del 1 al 15: su ofrenda se fabrica (cada vez con materiales más raros, más giro y más
//     nivel de taller) y se usa en cualquier sitio.
//   · Del 16 al 56: su sello se fabrica con el alma y el trofeo del jefe anterior, y solo
//     funciona en su escenario: sobre el mar, junto a la lava, en una caverna, de noche…
//   · Todos levantan su escenario al aparecer (isla, foso de lava, círculo de piedra…) en
//     el mismo mundo, y desaparece al acabar. La lógica está en sim/ascent.js.
//  Los jefes de siempre (BOSSES de combat-data.js) viven ahora en guaridas por el mundo.
// =====================================================================================
const ASC_ENV = {
  tierra: { n: 'Tierra', i: '⛰', where: 'en cualquier sitio', w: 'mace' },
  mar: { n: 'Mar', i: '🌊', where: 'a la orilla del mar o de un lago grande', w: 'spear' },
  aire: { n: 'Aire', i: '🌪', where: 'en lo alto: colinas, pradera alpina o picos', w: 'bow' },
  lava: { n: 'Lava', i: '🌋', where: 'junto a la lava', w: 'sword' },
  caverna: { n: 'Cavernas', i: '🕳', where: 'bajo tierra, en una caverna', w: 'baxe' },
  hielo: { n: 'Hielo', i: '❄', where: 'en un bioma helado', w: 'spear' },
  desierto: { n: 'Desierto', i: '🏜', where: 'en el desierto, las dunas o el salar', w: 'scythe' },
  pantano: { n: 'Pantano', i: '🐸', where: 'en un pantano o manglar', w: 'dagger' },
  selva: { n: 'Selva', i: '🌴', where: 'en la selva o el bosque', w: 'bow' },
  cristal: { n: 'Cristal', i: '💎', where: 'en los campos de cristal o las grutas', w: 'wand' },
  noche: { n: 'Noche', i: '🌙', where: 'de noche', w: 'scythe' },
  tormenta: { n: 'Tormenta', i: '⛈', where: 'con lluvia, tormenta o ventisca', w: 'mace' },
  vacio: { n: 'Vacío', i: '🌀', where: 'en las capas profundas', w: 'sword' },
  taller: { n: 'Taller', i: '⚙', where: 'en tu taller (rodeado de tus máquinas)', w: 'gun' },
  final: { n: 'Final', i: '☀', where: 'en la Gran Ruina', w: 'sword' },
};
// [clave, nombre, entorno, forma, color, color 2, extras, habilidades]
const ASC_DEF = [
  ['granaryRat', 'Rata Reina del Granero', 'tierra', 'quad', '#8a7a6a', '#e8c070', {}, [['charge'], ['summon', 'kobold', 3]]],
  ['mossGolem', 'Gólem de Musgo', 'selva', 'golem', '#4a6a3a', '#8ad05a', {}, [['slam'], ['summon', 'shroom', 3]]],
  ['crabTyrant', 'Cangrejo Tirano', 'mar', 'bug', '#c84a2a', '#ffd0a0', {}, [['charge'], ['ring', 8]]],
  ['duneWorm', 'Gusano de las Dunas', 'desierto', 'blob', '#c8a060', '#7a4a2a', {}, [['slam'], ['hazard'], ['charge']]],
  ['frostWolfMother', 'Loba Madre de la Escarcha', 'hielo', 'quad', '#d8e8ff', '#5ab8ff', { el: 'frost' }, [['charge'], ['ring', 10], ['summon', 'werewolf', 2]]],
  ['bogWitch', 'Bruja del Lodazal', 'pantano', 'hum', '#4a5a3a', '#a0e040', { venom: 1 }, [['hazard'], ['teleport'], ['summon', 'ghoul', 3]]],
  ['thunderHawk', 'Halcón del Trueno', 'aire', 'fly', '#6a7a9a', '#f0f05a', { el: 'storm' }, [['charge'], ['meteor', 4], ['spiral']]],
  ['caveBroodmother', 'Madre de la Colmena Oscura', 'caverna', 'bug', '#3a2a2a', '#c83a2a', { venom: 1 }, [['summon', 'spiderE', 5], ['ring', 10]]],
  ['scorchBeetle', 'Escarabajo Abrasador', 'lava', 'bug', '#3a1a0a', '#ff6a1a', { el: 'fire' }, [['hazard'], ['charge'], ['ring', 10]]],
  ['graveKnight', 'Caballero de la Tumba', 'noche', 'hum', '#6a6a7a', '#5af0ff', {}, [['charge'], ['summon', 'skeleton', 3], ['slam']]],
  ['crystalSerpent', 'Serpiente de Cristal', 'cristal', 'quad', '#b090ff', '#ffffff', {}, [['beam'], ['ring', 12], ['teleport']]],
  ['rustBehemoth', 'Behemot Oxidado', 'taller', 'golem', '#8a5a3a', '#ff8a3a', {}, [['slam'], ['beam'], ['summon', 'drone', 3]]],
  ['stormEel', 'Anguila de la Tormenta', 'mar', 'blob', '#3a6a8a', '#f0f05a', { el: 'storm' }, [['pull'], ['ring', 12], ['spiral']]],
  ['sandSphinx', 'Esfinge de Arena', 'desierto', 'quad', '#d8c890', '#5ab8ff', { crown: 1 }, [['beam'], ['teleport'], ['meteor', 5]]],
  ['ashDrakeling', 'Dragoncillo de Ceniza', 'lava', 'fly', '#5a3a3a', '#ff8a3a', { el: 'fire' }, [['spiral'], ['meteor', 5], ['charge']]],
  ['abyssKraken', 'Kraken Abisal', 'mar', 'blob', '#2a3a6a', '#5af0ff', { heads: 4 }, [['pull'], ['ring', 16], ['hazard'], ['summon', 'slimeE', 4]]],
  ['glacierTitan', 'Titán del Glaciar', 'hielo', 'golem', '#c8e8ff', '#5ab8ff', { el: 'frost' }, [['slam'], ['meteor', 6], ['ring', 14]]],
  ['jungleJaguar', 'Jaguar Ancestral', 'selva', 'quad', '#c8a03a', '#2a1a0a', {}, [['charge'], ['teleport'], ['charge'], ['summon', 'lizardman', 3]]],
  ['skyLeviathan', 'Leviatán del Cielo', 'aire', 'fly', '#8ac8ff', '#ffffff', {}, [['spiral'], ['beam'], ['meteor', 6]]],
  ['magmaGolem', 'Gólem de Magma', 'lava', 'golem', '#6a1a0a', '#ffb030', { el: 'fire' }, [['hazard'], ['slam'], ['meteor', 6]]],
  ['deepWarden', 'Guardián de las Profundidades', 'caverna', 'golem', '#3a3a4a', '#5af0ff', {}, [['beam'], ['slam'], ['shield'], ['summon', 'stoneGolem', 3]]],
  ['plagueLord', 'Señor de la Plaga', 'pantano', 'hum', '#5a6a2a', '#c8e030', { venom: 1 }, [['hazard'], ['summon', 'scarab', 6], ['heal']]],
  ['mirageDjinn', 'Djinn del Espejismo', 'desierto', 'hum', '#5a8ad8', '#ffd34a', {}, [['clone'], ['teleport'], ['spiral']]],
  ['bansheeQueen', 'Reina Banshee', 'noche', 'fly', '#c8c8e0', '#a060ff', { crown: 1 }, [['ring', 18], ['teleport'], ['summon', 'ghost', 4]]],
  ['quartzColossus', 'Coloso de Cuarzo', 'cristal', 'golem', '#e8d8ff', '#ff7ad8', {}, [['beam'], ['shield'], ['ring', 16], ['summon', 'gargoyle', 2]]],
  ['clockworkDragon', 'Dragón de Relojería', 'taller', 'quad', '#c8a04a', '#5af0ff', {}, [['beam'], ['spiral'], ['summon', 'automaton', 3], ['charge']]],
  ['tempestRoc', 'Roc de la Tempestad', 'tormenta', 'fly', '#5a6a8a', '#f0f05a', { el: 'storm' }, [['meteor', 8], ['charge'], ['pull']]],
  ['tidalSerpent', 'Serpiente de las Mareas', 'mar', 'quad', '#2a8a9a', '#c8fff4', {}, [['charge'], ['ring', 18], ['hazard'], ['pull']]],
  ['frostLich', 'Liche Glacial', 'hielo', 'skel', '#c8e8ff', '#5af0ff', { el: 'frost', crown: 1 }, [['summon', 'wraith', 3], ['spiral'], ['teleport'], ['shield']]],
  ['volcanoHeart', 'Corazón del Volcán', 'lava', 'blob', '#8a1a0a', '#ffe060', { el: 'fire' }, [['meteor', 9], ['hazard'], ['ring', 18], ['pull']]],
  ['myceliumKing', 'Rey Micelio', 'selva', 'blob', '#a04a6a', '#f0c8e0', { crown: 1 }, [['summon', 'shroom', 6], ['hazard'], ['heal'], ['ring', 16]]],
  ['boneDragon', 'Dragón de Hueso', 'noche', 'quad', '#e8e0c8', '#7a4aff', {}, [['spiral'], ['summon', 'skeleton', 4], ['charge'], ['beam']]],
  ['crystalHydra', 'Hidra Cristalina', 'cristal', 'quad', '#b090ff', '#ffffff', { heads: 5 }, [['ring', 14], ['beam'], ['heal'], ['spiral']]],
  ['redSandWyrm', 'Sierpe de las Arenas Rojas', 'desierto', 'blob', '#c84a2a', '#ffd0a0', {}, [['charge'], ['slam'], ['meteor', 7], ['hazard']]],
  ['caveBehemoth', 'Behemot de las Cavernas', 'caverna', 'quad', '#4a3a2a', '#c8843a', {}, [['slam'], ['charge'], ['meteor', 7], ['summon', 'troll', 2]]],
  ['stormGiant', 'Gigante de la Tormenta', 'tormenta', 'hum', '#4a5a7a', '#9ad8ff', { el: 'storm' }, [['meteor', 10], ['slam'], ['pull'], ['summon', 'elemental', 3]]],
  ['dreadCorsair', 'Corsario Espectral', 'mar', 'hum', '#3a4a5a', '#5af0ff', { crown: 1 }, [['summon', 'ghost', 4], ['teleport'], ['beam'], ['clone']]],
  ['phoenixMatriarch', 'Matriarca Fénix', 'aire', 'fly', '#ff6a1a', '#ffe040', { el: 'fire', revive: 1 }, [['ring', 20], ['meteor', 8], ['spiral'], ['charge']]],
  ['iceDragon', 'Dragón de Hielo', 'hielo', 'quad', '#9ad8ff', '#ffffff', { el: 'frost' }, [['spiral'], ['ring', 20], ['charge'], ['meteor', 8]]],
  ['obsidianTitan', 'Titán de Obsidiana', 'lava', 'golem', '#1a1a2a', '#ff4a10', { el: 'fire' }, [['slam'], ['beam'], ['shield'], ['meteor', 9], ['summon', 'imp', 4]]],
  ['swampLeviathan', 'Leviatán del Pantano', 'pantano', 'blob', '#3a5a3a', '#a0e040', { venom: 1, heads: 3 }, [['pull'], ['hazard'], ['summon', 'slimeE', 5], ['ring', 18]]],
  ['shadowStalker', 'Acechador de Sombras', 'noche', 'quad', '#1a1a2a', '#a060ff', {}, [['teleport'], ['clone'], ['charge'], ['charge'], ['summon', 'shade', 3]]],
  ['jungleTreantKing', 'Rey Ent de la Selva', 'selva', 'hum', '#3a2a12', '#8ad05a', { crown: 1 }, [['pull'], ['summon', 'treant', 3], ['heal'], ['slam'], ['meteor', 6]]],
  ['forgeTyrant', 'Tirano de la Forja', 'taller', 'hum', '#5a5e66', '#ff8a3a', { el: 'fire' }, [['beam'], ['hazard'], ['summon', 'automaton', 4], ['slam']]],
  ['voidSpider', 'Araña del Vacío', 'vacio', 'bug', '#1a0a2a', '#a060ff', { el: 'void' }, [['teleport'], ['ring', 20], ['summon', 'shade', 4], ['hazard']]],
  ['skyFortress', 'Fortaleza Celeste', 'aire', 'golem', '#e8e8f8', '#ffd34a', {}, [['beam'], ['meteor', 10], ['summon', 'drone', 4], ['shield']]],
  ['abyssLeviathan', 'Leviatán Abisal', 'mar', 'blob', '#0a1a3a', '#5af0ff', { heads: 5 }, [['pull'], ['ring', 24], ['spiral'], ['hazard']]],
  ['eclipseWitch', 'Bruja del Eclipse', 'noche', 'hum', '#2a1030', '#ff7ad8', { crown: 1 }, [['clone'], ['spiral'], ['teleport'], ['beam'], ['summon', 'cultist', 4]]],
  ['earthshaker', 'Sacudetierra Primigenio', 'tierra', 'golem', '#6a5a3a', '#ffd34a', {}, [['slam'], ['meteor', 12], ['charge'], ['ring', 20]]],
  ['stormDragon', 'Dragón de la Tormenta', 'tormenta', 'quad', '#5a6a9a', '#f0f05a', { el: 'storm' }, [['spiral'], ['meteor', 12], ['charge'], ['pull'], ['beam']]],
  ['magmaWyrmKing', 'Rey Sierpe de Magma', 'lava', 'quad', '#8a1a0a', '#ffb030', { el: 'fire', heads: 3, crown: 1 }, [['spiral'], ['meteor', 12], ['hazard'], ['ring', 24], ['charge']]],
  ['voidTitan', 'Titán del Vacío', 'vacio', 'golem', '#1a0a2a', '#c08aff', { el: 'void' }, [['pull'], ['beam'], ['shield'], ['ring', 24], ['summon', 'shade', 5]]],
  ['chronoWyrm', 'Sierpe del Tiempo', 'vacio', 'fly', '#e0c8ff', '#ffffff', {}, [['teleport'], ['clone'], ['spiral'], ['ring', 24], ['beam']]],
  ['worldSerpent', 'Serpiente del Mundo', 'mar', 'quad', '#2a5a4a', '#c8fff4', { heads: 7 }, [['ring', 28], ['pull'], ['spiral'], ['meteor', 12], ['hazard']]],
  ['duskSeraph', 'Serafín del Ocaso', 'aire', 'fly', '#fff2c0', '#ffd34a', { crown: 1 }, [['beam'], ['spiral'], ['meteor', 14], ['teleport'], ['heal']]],
  ['primeMotor', 'El Primer Motor', 'final', 'golem', '#c8a04a', '#ff3a2a', { crown: 1, heads: 3, final: 1 }, [['beam'], ['spiral'], ['summon', 'automaton', 5], ['meteor', 16], ['ring', 30], ['pull'], ['shield'], ['clone'], ['slam'], ['hazard']]],
];
// Ofrendas de los 15 primeros: [núcleo, dientes] (cada una más difícil)
const ASC_OFFER = [
  ['planks', 'stone*4,bone'], ['herbs', 'planks*2,bone*2,rope'], ['bone', 'shell*2,rope*2,stone*4'], ['leather', 'sand*8,bone*3'], ['fur', 'bone*4,ice*4,leather*2'],
  ['herbs', 'slimeGel*3,bone*4,venom'], ['feather', 'feather*4,@copper.ingot*2,rope*2'], ['silk', 'silk*4,venom*2,bone*4'], ['coal', 'coal*8,@iron.plate*2,obsidian'], ['bone', 'bone*8,@silver.ingot*2,cloth*2'],
  ['crystal', 'crystal*4,@gold.ingot*2,manaDust'], ['@steel.plate', '@steel.gear*3,circuit,@iron.plate*4'], ['@copper.wire', 'essenceStorm,kelp*6,@silver.plate*2'], ['@gold.plate', 'sand*16,manaDust*4,@gold.ingot*3'], ['drakeScale', 'essenceFire*2,obsidian*4,@steel.plate*3'],
];
// Materiales extra para los sellos (16 a 56), cada vez más raros
const ASC_SEAL_EXTRA = ['manaDust*4', 'enchantedCloth*2', 'essenceFire*2', 'resonantCrystal', 'manaCrystal*2', 'soulGem', 'arcaneCore', 'timeCrystal', 'voidCore', 'singularity'];
const ASC = {}, ASC_ORDER = [];
ASC_DEF.forEach(([k, n, env, shape, c, c2, x, ab], i) => {
  const r = i + 1, fin = !!x.final;
  const B = Object.assign({ n, shape, c, c2, s: fin ? 82 : Math.round(30 + r * 0.62), hp: fin ? 120000 : Math.round(500 + r * r * 26), dmg: fin ? 95 : Math.round(10 + r * 1.45), v: +(1.1 + ((r * 37) % 20) / 10).toFixed(1),
    ab, tier: Math.min(7, Math.floor(r / 8)), asc: r, env }, x);
  if (shape === 'fly') B.v = Math.min(3.4, B.v + 0.6);
  BOSSES[k] = B; ASC[k] = B; ASC_ORDER.push(k);
  const E = ASC_ENV[env], sid = k + 'Call', prev = i ? ASC_DEF[i - 1][0] : null, sealed = r > 15;
  IT(sid, sealed ? `Sello: ${n}` : `Ofrenda: ${n}`, c2, sealed ? 'coin' : 'skull', C_CAT, sealed ? `Jefe ${r} del Ascenso (${E.i} ${E.n}). Solo funciona ${E.where}. Úsalo (F) allí para invocarlo.` : `Jefe ${r} del Ascenso (${E.i} ${E.n}). Úsalo (F) para invocarlo; aparece con su escenario.`);
  ITEMS[sid].summon = k; B.summonItem = sid;
  IT(k + 'Trophy', 'Trofeo: ' + n, c2, 'trophy', C_CAT, `Prueba de que venciste al jefe ${r} del Ascenso.`);
  IT(k + 'Soul', 'Alma de ' + n, c, 'orb', C_CAT, 'Ingrediente de su arma y del sello del siguiente jefe.');
  const tier = Math.min(7, Math.floor(r / 8)), rpm = r <= 4 ? 0 : r <= 15 ? 16 * Math.ceil(r / 5) : Math.min(256, 32 * Math.ceil((r - 15) / 6));
  if (!sealed) { const [core, teeth] = ASC_OFFER[i]; RB(sid, 1, core, (prev ? prev + 'Trophy,' : '') + teeth, rpm, tier); }
  else RB(sid, 1, prev + 'Soul', `${prev}Trophy,${prev}Soul,${ASC_SEAL_EXTRA[Math.min(9, Math.floor((r - 16) / 4))]}`, rpm, tier);
  // Su arma
  const wid = k + 'Weapon', ws = E.w, wd = +(4 + r * 0.36).toFixed(1), extra = ws === 'gun' ? { ranged: { ammo: 'bullet', cd: 0.45, spd: 32, pierce: Math.ceil(r / 12) } } : ws === 'mace' || ws === 'baxe' || ws === 'scythe' ? { sweep: 40 + r } : ws === 'spear' ? { reach: 40 + r } : {};
  weapon(wid, `${['Hoja', 'Garra', 'Furia', 'Ira', 'Eco'][r % 5]} de ${n.replace(/^(El |La )/, '')}`, c2, ws, { dmg: wd, reach: 0, el: x.el, ...extra }, `Arma del jefe ${r} del Ascenso.`);
  if (extra.ranged) ITEMS[wid].weapon.ranged = extra.ranged;
  RX(wid, k + 'Soul', [k + 'Soul', k + 'Trophy', 'enchantedBook'], 0, 0);
  B.drops = [['coin', Math.round(30 + B.hp / 25), 1], [k + 'Trophy', 1, 1], [k + 'Soul', 2, 1]];
});
