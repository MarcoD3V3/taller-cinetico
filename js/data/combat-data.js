'use strict';
// =====================================================================================
//  Combate y vida en el mundo: enemigos (más de 100), jefes (24), munición, armas a distancia,
//  hechizos y combinaciones, muebles y casas para NPC, comercio, domesticación y computadoras.
//  La lógica está en sim/combat.js, sim/housing.js y sim/computer.js.
// =====================================================================================
const C_CAT = ICATS.length; ICATS.push('Combate');
CATS.push('Casa'); const HOUSE_CAT = CATS.length - 1;

// ---------- Objetos que faltaban por conseguir ----------
for (const m of MATS) { const F = MF[m.id]; addRec('cutter', { in: { [F.ingot]: 1 }, out: { [F.nugget]: 9 }, t: 1 }); }
RB('parchment', 3, 'leather', 'leather');
RM('alchemy', { vial: 1 }, { waterBottle: 1 }, 1, { water: 100 });
RM('centrifuge', { depletedRod: 1 }, { [MF.lead.dust]: 2, [MF.uranium.nugget]: 3 }, 6);

// ---------- Botín de enemigos y moneda ----------
IT('coin', 'Moneda de oro', '#ffd34a', 'coin', C_CAT, 'Sueltan los enemigos y la aceptan los comerciantes.');
const LOOT = [
  ['rottenFlesh', 'Carne podrida', '#7a8a4a', 'drop', 'De zombis y guls. Comida de emergencia o cebo.'], ['orcTusk', 'Colmillo de orco', '#e8e0c8', 'fang', 'Duro como el hierro.'],
  ['trollHide', 'Piel de trol', '#6a7a5a', 'sheet', 'Se regenera sola: armaduras y vendas.'], ['darkCloth', 'Tela oscura', '#4a2a4a', 'sheet', 'Túnicas de sectario.'],
  ['demonHorn', 'Cuerno de demonio', '#8a1a1a', 'fang', 'Arde al tocarlo.'], ['gargoyleStone', 'Piedra de gárgola', '#6a6a70', 'block', 'Piedra viva.'],
  ['mummyWrap', 'Venda de momia', '#d8c8a0', 'sheet', 'Vendas antiguas: sirven de venda.'], ['yetiFur', 'Pelaje de yeti', '#f0f0f0', 'sheet', 'El mejor abrigo.'],
  ['werewolfClaw', 'Garra de hombre lobo', '#5a4a3a', 'fang', 'Corta como una espada.'], ['batWing', 'Ala de murciélago', '#3a2030', 'feather', 'Para pociones de vuelo.'],
  ['scrapMetal', 'Chatarra', '#8a8a8a', 'nugget', 'Piezas de autómatas: se funde en hierro.'], ['spiritOrb', 'Orbe espiritual', '#c8d8f0', 'orb', 'Alma atrapada de un fantasma.'],
  ['goblinGear', 'Engranaje goblin', '#8a7a3a', 'cog', 'Mecánica goblin, rara pero útil.'], ['lizardScale', 'Escama de lagarto', '#4a8a4a', 'scale', 'Escamas grandes y duras.'],
  ['shadowEssence', 'Esencia de sombra', '#1a1a2a', 'drop', 'Oscuridad líquida.'], ['frozenHeart', 'Corazón helado', '#9ad8ff', 'orb', 'Nunca se derrite.'],
];
for (const [id, n, c, s, d] of LOOT) IT(id, n, c, s, C_CAT, d);
ITEMS.rottenFlesh.food = { f: 6, raw: 0.6 }; ITEMS.mummyWrap.med = 'bandage';
RM('furnace', { scrapMetal: 2 }, { ironIngot: 1 }, 2);
RM('tanner', { trollHide: 1 }, { leather: 3 }, 3);
RB('furCoat', 1, 'leather', 'yetiFur');

// ---------- Munición ----------
IT('arrow', 'Flecha', '#c8a070', 'arrowI', C_CAT, 'Munición de arcos.');
IT('fireArrow', 'Flecha de fuego', '#ff6a2a', 'arrowI', C_CAT, 'Quema al impactar.');
IT('bolt', 'Virote', '#9aa0a8', 'arrowI', C_CAT, 'Munición de ballestas.');
IT('gunpowder', 'Pólvora', '#3a3a3a', 'dust', C_CAT, 'Salitre, carbón y azufre.');
IT('bullet', 'Bala', '#a0a0b0', 'nugget', C_CAT, 'Munición de armas de fuego.');
IT('shell', 'Cartucho', '#c84a3a', 'cell', C_CAT, 'Munición de escopeta (5 perdigones).');
IT('grenade', 'Granada', '#4a5a3a', 'orb', C_CAT, 'Munición del lanzagranadas: explota en área.');
IT('fuelCan', 'Bidón de combustible', '#c8843a', 'cell', C_CAT, 'Munición del lanzallamas.');
RB('arrow', 8, 'stick', 'feather,stone');
RB('fireArrow', 8, 'arrow', 'arrow,sulfur');
RB('bolt', 8, MF.iron.rod, 'feather,feather');
RM('mixer', { saltpeter: 2, coal: 1, sulfur: 1 }, { gunpowder: 4 }, 2);
RB('bullet', 12, MF.lead.ingot, 'gunpowder,' + MF.copper.foil);
RB('shell', 6, 'gunpowder', MF.lead.nugget + ',' + MF.lead.nugget + ',paper2');
RB('grenade', 2, 'gunpowder', MF.iron.plate + ',gunpowder');
RB('fuelCan', 2, MF.iron.plate, 'coal,coal,sulfur');
IT('paper2', 'Papel', '#f0ece0', 'sheet', 0, 'Juncos prensados.');
RM('press', { reeds: 2 }, { paper2: 3 }, 1);

// ---------- Armas a distancia nuevas ----------
// ranged: { ammo, cd (s), spd (casillas/s), n (proyectiles), spread, pierce, boom (radio de explosión), ret (vuelve) }
function rangedW(id, n, c, s, st, core, teeth, tier, d) { weapon(id, n, c, s, st, d); ITEMS[id].weapon.ranged = st.ranged; RX(id, core, teeth, st.rpm || 0, tier); }
rangedW('slingshot', 'Honda', '#8a6a3a', 'sling', { dmg: 1.2, ranged: { ammo: 'stone', cd: 0.55, spd: 14 } }, 'stick', ['leather', 'thread'], 0, 'Dispara piedras.');
rangedW('boomerang', 'Bumerán', '#c8843a', 'boomer', { dmg: 1.8, ranged: { cd: 0.9, spd: 13, ret: 1, pierce: 3 } }, 'planks', ['planks', 'resin'], 0, 'Vuelve a tu mano: no gasta munición.');
rangedW('shuriken', 'Shuriken', '#9aa0a8', 'shuriken', { dmg: 1.4, ranged: { ammo: 'shuriken', cd: 0.25, spd: 18 } }, MF.steel.plate, [MF.steel.plate], 2, 'Se lanzan en ráfaga (se gastan).');
rangedW('javelin', 'Jabalina', '#7f8a96', 'spear', { dmg: 2.6, ranged: { ammo: 'javelin', cd: 0.8, spd: 16, pierce: 2 } }, MF.iron.longRod, [MF.iron.plate, 'feather'], 1, 'Atraviesa a dos enemigos (se gasta).');
rangedW('hunterBow', 'Arco de cazador', '#6a4a2a', 'bow', { dmg: 2.4, reach: 80, ranged: { ammo: 'arrow', cd: 0.6, spd: 20 } }, 'bone', ['thread', 'thread', 'leather'], 1);
rangedW('boneBow', 'Arco de hueso', '#e8e0c8', 'bow', { dmg: 3, reach: 90, ranged: { ammo: 'arrow', cd: 0.5, spd: 22 } }, 'orcTusk', ['bone', 'bone', 'silk'], 2);
rangedW('heavyXbow', 'Ballesta pesada', '#5a5e66', 'xbow', { dmg: 5, reach: 100, ranged: { ammo: 'bolt', cd: 1.2, spd: 26, pierce: 3 } }, MF.steel.longRod, [MF.steel.spring, MF.steel.spring, 'gearTrain'], 3);
rangedW('musket', 'Mosquete', '#6a4a2a', 'gun', { dmg: 7, reach: 120, ranged: { ammo: 'bullet', cd: 1.6, spd: 32 } }, MF.iron.longRod, ['planks', 'gunpowder', MF.iron.spring], 2);
rangedW('pistol', 'Pistola de cobre', '#c8843a', 'gun', { dmg: 3.2, reach: 90, ranged: { ammo: 'bullet', cd: 0.35, spd: 30 } }, MF.copper.rod, [MF.copper.plate, MF.brass.spring, 'gunpowder'], 3);
rangedW('shotgun', 'Escopeta', '#4a4a4a', 'gun', { dmg: 2.2, reach: 60, ranged: { ammo: 'shell', cd: 0.9, spd: 24, n: 5, spread: 0.35 } }, MF.steel.longRod, [MF.steel.plate, 'planks', MF.steel.spring], 3);
rangedW('rifle', 'Rifle de acero', '#7f8a96', 'gun', { dmg: 6, reach: 160, ranged: { ammo: 'bullet', cd: 0.7, spd: 40, pierce: 2 } }, MF.steel.longRod, [MF.steel.longRod, 'lens', MF.steel.spring, 'precision'], 4);
rangedW('gatling', 'Ametralladora rotativa', '#5a5e66', 'gun', { dmg: 2.4, reach: 110, rpm: 32, ranged: { ammo: 'bullet', cd: 0.09, spd: 34, spread: 0.12 } }, 'lvMotor', [MF.steel.longRod, MF.steel.longRod, MF.steel.gear, 'bearing'], 5);
rangedW('flamethrower', 'Lanzallamas', '#c8843a', 'gun', { dmg: 0.8, el: 'fire', ranged: { ammo: 'fuelCan', per: 20, cd: 0.05, spd: 9, spread: 0.3, life: 0.45, pierce: 9 } }, MF.stainless.doublePlate, ['hydraulicCylinder', MF.copper.wire, 'gasket'], 5);
rangedW('grenadeLauncher', 'Lanzagranadas', '#4a5a3a', 'gun', { dmg: 6, ranged: { ammo: 'grenade', cd: 1.2, spd: 12, boom: 70 } }, MF.steel.longRod, [MF.steel.doublePlate, MF.steel.spring, 'gunpowder'], 4);
rangedW('railgun', 'Cañón de riel', '#5af0ff', 'gun', { dmg: 14, reach: 240, rpm: 64, ranged: { ammo: 'batteryCell', cd: 1.4, spd: 70, pierce: 12 } }, 'superconductor', ['hvMotor', MF.titanium.longRod, MF.titanium.longRod, 'capacitorItem'], 6);
rangedW('plasmaGun', 'Lanzaplasma', '#ff5af0', 'gun', { dmg: 9, el: 'fire', reach: 150, rpm: 64, ranged: { ammo: 'plasmaCell', per: 6, cd: 0.25, spd: 28, boom: 40 } }, 'plasmaCell', ['processor', MF.titanium.doublePlate, 'magnet', 'heatsink'], 7);
if (RECIPE_FOR.shuriken) RECIPE_FOR.shuriken.n = 8; // el shuriken es su propia munición
if (RECIPE_FOR.javelin) RECIPE_FOR.javelin.n = 4;
ITEMS.javelin.d += ' Fabrica varias y lánzalas.';
// La honda dispara piedra; el resto, su munición

// ---------- Movilidad ----------
IT('grapple', 'Gancho de escalada', '#9aa0a8', 'hook', C_CAT, 'En la mano: clic izquierdo te lanza hacia donde apuntas (hasta 12 casillas), incluso sobre el agua.');
IT('dashBoots', 'Botas de impulso', '#c8a04a', 'sheet', C_CAT, 'En el inventario: el impulso (Shift+Espacio) llega más lejos y cansa la mitad.');
IT('phoenixWings', 'Alas de fénix', '#ff7a2a', 'feather', C_CAT, 'En el inventario: caminas sobre el agua y la lava y corres un 15 % más.');
IT('tameTreat', 'Golosina de domador', '#e8a0c8', 'drop', C_CAT, 'Pulsa F sobre un animal domesticable: lo domesticas seguro.');
RB('grapple', 1, 'rope', MF.iron.ring + ',' + MF.iron.rod + ',' + MF.iron.spring);
RB('dashBoots', 1, 'speedBoots', 'griffinFeather,' + MF.kinetite.spring, 16, 5);
RB('phoenixWings', 1, 'phoenixFeather', 'phoenixFeather,enchantedCloth,dragonHeart', 64, 7);
RB('tameTreat', 2, 'honeycomb', 'cookedMeat,berries');

// ---------- Hechizos ----------
// el: elemento (para combinaciones) · m: maná · cd: recarga · kind: tipo de efecto
const SPELLS = {
  fireball: { n: 'Bola de fuego', i: '🔥', el: 'fire', m: 12, cd: 0.8, kind: 'proj', dmg: 22, spd: 14, boom: 48, c: '#ff6a2a' },
  iceLance: { n: 'Lanza de hielo', i: '❄', el: 'frost', m: 10, cd: 0.6, kind: 'proj', dmg: 16, spd: 22, pierce: 3, slow: 2, c: '#8ad8ff' },
  chainBolt: { n: 'Rayo encadenado', i: '⚡', el: 'storm', m: 16, cd: 1, kind: 'chain', dmg: 18, n2: 4, c: '#f0f05a' },
  frostNova: { n: 'Nova de escarcha', i: '✳', el: 'frost', m: 20, cd: 4, kind: 'nova', dmg: 14, r: 120, freeze: 2.5, c: '#bfe8ff' },
  heal: { n: 'Curación', i: '✚', el: 'life', m: 25, cd: 6, kind: 'heal', amt: 30, c: '#7ae05a' },
  shield: { n: 'Escudo arcano', i: '◈', el: 'mind', m: 20, cd: 10, kind: 'shield', amt: 40, t: 12, c: '#c8a8ff' },
  blink: { n: 'Parpadeo', i: '↯', el: 'void', m: 10, cd: 2, kind: 'blink', r: 7, c: '#a060ff' },
  meteor: { n: 'Meteorito', i: '☄', el: 'fire', m: 35, cd: 8, kind: 'meteor', dmg: 70, boom: 90, c: '#ff8a2a' },
  quake: { n: 'Terremoto', i: '≋', el: 'earth', m: 30, cd: 7, kind: 'nova', dmg: 26, r: 150, stun: 1.5, c: '#c8843a' },
  poisonCloud: { n: 'Nube venenosa', i: '☁', el: 'poison', m: 18, cd: 5, kind: 'cloud', dmg: 6, r: 80, t: 6, c: '#8ad84a' },
  spiritWolf: { n: 'Lobo espiritual', i: '🐺', el: 'life', m: 30, cd: 20, kind: 'summon', t: 30, c: '#9af0ff' },
  blackHole: { n: 'Agujero negro', i: '●', el: 'void', m: 45, cd: 12, kind: 'hole', dmg: 8, r: 140, t: 4, c: '#3a1a6a' },
  drain: { n: 'Drenar vida', i: '♥', el: 'life', m: 14, cd: 1.2, kind: 'drain', dmg: 14, c: '#e04848' },
  storm: { n: 'Tormenta', i: '⛈', el: 'storm', m: 40, cd: 10, kind: 'storm', dmg: 20, r: 220, t: 5, c: '#f0f05a' },
  holyLight: { n: 'Luz sagrada', i: '☀', el: 'holy', m: 24, cd: 5, kind: 'nova', dmg: 18, r: 130, undead: 3, c: '#fff6b0' },
  roots: { n: 'Raíces', i: '♣', el: 'earth', m: 16, cd: 6, kind: 'nova', dmg: 4, r: 110, root: 3, c: '#6aa83a' },
  arcaneMissiles: { n: 'Proyectiles arcanos', i: '✧', el: 'mind', m: 18, cd: 1.5, kind: 'missiles', dmg: 9, n2: 5, c: '#e0a0ff' },
  haste: { n: 'Celeridad', i: '»', el: 'storm', m: 15, cd: 15, kind: 'buff', buff: 'swift', t: 30, c: '#5af0ff' },
  timeStop: { n: 'Detener el tiempo', i: '⧗', el: 'time', m: 60, cd: 30, kind: 'nova', dmg: 0, r: 400, freeze: 4, c: '#ffe0ff' },
  inferno: { n: 'Infierno', i: '♨', el: 'fire', m: 50, cd: 14, kind: 'cloud', dmg: 16, r: 120, t: 5, c: '#ff4a10' },
};
// Combinaciones: lanza un elemento y luego otro en menos de 2,5 s
const COMBOS = {
  'fire+frost': { n: '¡Vapor explosivo!', dmg: 60, r: 120, stun: 1.5, c: '#e8f0ff' }, 'frost+fire': { n: '¡Vapor explosivo!', dmg: 60, r: 120, stun: 1.5, c: '#e8f0ff' },
  'storm+frost': { n: '¡Ventisca eléctrica!', dmg: 40, r: 160, freeze: 2, c: '#c8f0ff' }, 'frost+storm': { n: '¡Ventisca eléctrica!', dmg: 40, r: 160, freeze: 2, c: '#c8f0ff' },
  'fire+storm': { n: '¡Plasma!', dmg: 80, r: 90, c: '#ff5af0' }, 'storm+fire': { n: '¡Plasma!', dmg: 80, r: 90, c: '#ff5af0' },
  'void+fire': { n: '¡Fuego negro!', dmg: 70, r: 110, c: '#5a1a8a' }, 'fire+void': { n: '¡Fuego negro!', dmg: 70, r: 110, c: '#5a1a8a' },
  'earth+fire': { n: '¡Erupción!', dmg: 55, r: 130, stun: 1, c: '#ff8a2a' }, 'fire+earth': { n: '¡Erupción!', dmg: 55, r: 130, stun: 1, c: '#ff8a2a' },
  'life+holy': { n: '¡Bendición!', heal: 60, c: '#fff6b0' }, 'holy+life': { n: '¡Bendición!', heal: 60, c: '#fff6b0' },
  'void+mind': { n: '¡Locura!', dmg: 50, r: 140, confuse: 3, c: '#c060ff' }, 'mind+void': { n: '¡Locura!', dmg: 50, r: 140, confuse: 3, c: '#c060ff' },
  'poison+fire': { n: '¡Gas inflamable!', dmg: 75, r: 120, c: '#c8e030' }, 'fire+poison': { n: '¡Gas inflamable!', dmg: 75, r: 120, c: '#c8e030' },
  'time+storm': { n: '¡Rayo eterno!', dmg: 90, r: 100, stun: 2, c: '#ffe0ff' }, 'storm+time': { n: '¡Rayo eterno!', dmg: 90, r: 100, stun: 2, c: '#ffe0ff' },
};
// Pergaminos de hechizo: se leen con F para aprenderlos
const SPELL_RECIPE = {
  fireball: ['runeFire', 'arcaneInk,fireblossom'], iceLance: ['runeFrost', 'arcaneInk,frostleaf'], chainBolt: ['runeStorm', 'arcaneInk,' + MF.copper.wire], frostNova: ['runeFrost', 'arcaneInk,frozenHeart'],
  heal: ['runeLife', 'arcaneInk,herbs,herbs'], shield: ['runeMind', 'arcaneInk,manaCrystal'], blink: ['runeVoid', 'arcaneInk,ectoplasm'], meteor: ['runeFire', 'arcaneInk,demonHorn,obsidian'],
  quake: ['runeEarth', 'arcaneInk,gargoyleStone'], poisonCloud: ['runeLife', 'arcaneInk,venom,nightshade'], spiritWolf: ['runeLife', 'arcaneInk,frostFang,spiritOrb'], blackHole: ['runeVoid', 'arcaneInk,shadowEssence,singularity'],
  drain: ['runeVoid', 'arcaneInk,batWing'], storm: ['runeStorm', 'arcaneInk,griffinFeather,essenceStorm'], holyLight: ['runeLife', 'arcaneInk,holyWater'], roots: ['runeEarth', 'arcaneInk,mandrake'],
  arcaneMissiles: ['runeMind', 'arcaneInk,manaDust,manaDust'], haste: ['runeStorm', 'arcaneInk,batWing,feather'], timeStop: ['runeTime', 'arcaneInk,timeCrystal,chronoCore'], inferno: ['runeFire', 'arcaneInk,demonHorn,essenceFire'],
};
for (const k in SPELLS) {
  const s = SPELLS[k], id = 'spell_' + k;
  IT(id, 'Hechizo: ' + s.n, s.c, 'scroll', C_CAT, `Léelo con F para aprenderlo. Gasta ${s.m} de maná · recarga ${s.cd} s · elemento ${s.el}. Asígnalo a Z, V, Y o U en la ficha del personaje (C).`);
  ITEMS[id].learn = k;
  const [core, teeth] = SPELL_RECIPE[k]; RB(id, 1, core, 'parchment,' + teeth, 0, 4);
}

// ---------- Enemigos ----------
// shape: hum · skel · blob · quad · fly · bug · ghost · golem · ai: melee · ranged · caster · charger · exploder · summoner
// Los arquetipos se combinan con variantes de bioma: más de 100 enemigos distintos.
const BIO_SETS = {
  land: null, cold: ['tundra', 'snowyTaiga', 'iceSpikes', 'taiga', 'frozenOcean'], desert: ['desert', 'redDesert', 'badlands', 'saltFlats', 'savanna', 'shrubland'],
  swamp: ['swamp', 'bog', 'mangrove', 'toxicMarsh'], fire: ['volcano', 'ashWastes', 'volcanicIsland', 'badlands'], crystal: ['crystalFields', 'mushroomIsland'],
  shadow: ['darkForest', 'toxicMarsh', 'bog'], forest: ['forest', 'birchForest', 'darkForest', 'taiga', 'cherryGrove', 'jungle', 'bambooJungle'], hills: ['hills', 'meadow', 'stonyShore', 'plains'],
  jungle: ['jungle', 'bambooJungle', 'mangrove'],
};
const VARIANTS = {
  base: { m: '', f: '' },
  frost: { m: ' helado', f: ' helada', tint: '#9ad8ff', el: 'frost', bio: 'cold', hp: 1.2 },
  desert: { m: ' del desierto', f: ' del desierto', tint: '#d8b878', bio: 'desert', v: 1.1 },
  swamp: { m: ' del pantano', f: ' del pantano', tint: '#6a8a3a', el: 'poison', bio: 'swamp' },
  fire: { m: ' ígneo', f: ' ígnea', tint: '#ff6a2a', el: 'fire', bio: 'fire', dmg: 1.3 },
  crystal: { m: ' de cristal', f: ' de cristal', tint: '#b090ff', bio: 'crystal', hp: 1.4 },
  jungle: { m: ' de la selva', f: ' de la selva', tint: '#3a8a3a', el: 'poison', bio: 'jungle', v: 1.1 },
  shadow: { m: ' sombrío', f: ' sombría', tint: '#3a2a5a', el: 'void', bio: 'shadow', v: 1.15 },
  elite: { m: ' élite', f: ' élite', hp: 2.6, dmg: 1.7, s: 1.25, elite: 1 },
};
const ARCH = [
  ['zombie', 'Zombi', 0, 'hum', '#5a7a4a', 9, 30, 8, 1.6, 'bite', 'melee', { night: 1, undead: 1, drops: [['rottenFlesh', 1, 0.6], ['coin', 1, 0.5]] }, ['base', 'frost', 'desert', 'swamp', 'fire', 'elite']],
  ['skeleton', 'Esqueleto', 0, 'skel', '#d8d4c8', 9, 26, 6, 2, 'cut', 'ranged', { night: 1, undead: 1, proj: { c: '#e8e0c8', spd: 11, dmg: 7 }, drops: [['bone', 2, 0.8], ['arrow', 3, 0.5]] }, ['base', 'frost', 'desert', 'shadow', 'elite']],
  ['goblin', 'Goblin', 0, 'hum', '#5a8a3a', 7, 22, 6, 2.8, 'cut', 'melee', { drops: [['coin', 2, 0.8], ['goblinGear', 1, 0.15]] }, ['base', 'desert', 'swamp', 'elite']],
  ['orc', 'Orco', 0, 'hum', '#4a6a3a', 10, 60, 12, 1.9, 'cut', 'melee', { drops: [['orcTusk', 1, 0.5], ['coin', 3, 0.7]], tier: 1 }, ['base', 'fire', 'frost', 'elite']],
  ['troll', 'Trol', 0, 'hum', '#6a7a5a', 14, 140, 20, 1.4, 'fracture', 'melee', { regen: 2, drops: [['trollHide', 1, 0.7]], tier: 2 }, ['base', 'frost', 'swamp', 'crystal', 'elite']],
  ['bandit', 'Bandido', 0, 'hum', '#7a5a3a', 9, 40, 10, 2.4, 'cut', 'melee', { drops: [['coin', 5, 0.9], ['bullet', 4, 0.2]] }, ['base', 'desert', 'elite']],
  ['cultist', 'Sectario', 0, 'hum', '#5a2a4a', 9, 34, 8, 2, 'burn', 'caster', { night: 1, proj: { c: '#ff6a2a', spd: 9, dmg: 10 }, drops: [['darkCloth', 1, 0.6], ['coin', 2, 0.6]], tier: 1 }, ['base', 'shadow', 'fire', 'elite']],
  ['slimeE', 'Limo', 0, 'blob', '#5ac85a', 8, 20, 5, 1.4, 'bruise', 'melee', { split: 1, drops: [['slimeGel', 1, 0.7]] }, ['base', 'frost', 'fire', 'crystal', 'shadow', 'elite']],
  ['ghost', 'Fantasma', 0, 'ghost', '#c8d8f0', 9, 24, 7, 2.2, 'scratch', 'melee', { night: 1, undead: 1, phase: 1, drops: [['ectoplasm', 1, 0.6], ['spiritOrb', 1, 0.1]] }, ['base', 'frost', 'shadow', 'elite']],
  ['wraith', 'Espectro', 0, 'ghost', '#3a3a5a', 11, 50, 12, 2.6, 'cut', 'caster', { night: 1, undead: 1, phase: 1, proj: { c: '#7a4aff', spd: 10, dmg: 12 }, drops: [['shadowEssence', 1, 0.5]], tier: 2 }, ['base', 'frost', 'elite']],
  ['spiderE', 'Araña cazadora', 1, 'bug', '#2a2422', 8, 26, 7, 3, 'sting', 'melee', { night: 1, venom: 1, drops: [['silk', 2, 0.7], ['venom', 1, 0.4]] }, ['base', 'desert', 'jungle', 'shadow', 'elite']],
  ['imp', 'Diablillo', 0, 'fly', '#c83a2a', 6, 18, 5, 3.2, 'burn', 'caster', { proj: { c: '#ff8a2a', spd: 10, dmg: 6 }, drops: [['sulfur', 2, 0.6]] }, ['base', 'fire', 'elite']],
  ['demon', 'Demonio', 0, 'hum', '#8a1a1a', 13, 120, 18, 2.2, 'burn', 'caster', { proj: { c: '#ff4a10', spd: 11, dmg: 16 }, drops: [['demonHorn', 1, 0.5], ['coin', 6, 0.8]], tier: 4 }, ['base', 'fire', 'shadow', 'elite']],
  ['stoneGolem', 'Gólem de piedra', 0, 'golem', '#7a7a78', 15, 180, 22, 1, 'fracture', 'melee', { drops: [['stone', 6, 1], ['golemCore', 1, 0.15]], tier: 2 }, ['base', 'crystal', 'fire', 'frost']],
  ['elemental', 'Elemental', 0, 'blob', '#ffd84a', 11, 70, 12, 2, 'burn', 'caster', { glow: 1, proj: { c: '#ffd84a', spd: 12, dmg: 11 }, drops: [['essenceStorm', 1, 0.3]], tier: 3 }, ['base', 'fire', 'frost', 'crystal', 'shadow']],
  ['harpy', 'Arpía', 1, 'fly', '#a08060', 9, 30, 8, 3.4, 'scratch', 'charger', { drops: [['feather', 3, 0.8]] }, ['base', 'desert', 'frost', 'elite']],
  ['gargoyle', 'Gárgola', 1, 'fly', '#6a6a70', 11, 70, 12, 2.4, 'cut', 'charger', { night: 1, drops: [['gargoyleStone', 1, 0.6]], tier: 2 }, ['base', 'crystal', 'shadow']],
  ['ghoul', 'Gul', 0, 'hum', '#7a8a6a', 9, 40, 10, 2.6, 'bite', 'melee', { night: 1, undead: 1, drops: [['rottenFlesh', 2, 0.6], ['bone', 1, 0.4]] }, ['base', 'swamp', 'desert', 'elite']],
  ['mummy', 'Momia', 1, 'hum', '#d8c8a0', 10, 50, 9, 1.4, 'bruise', 'melee', { undead: 1, bio: 'desert', drops: [['mummyWrap', 2, 0.8], ['coin', 3, 0.5]] }, ['base', 'fire', 'elite']],
  ['yeti', 'Yeti', 0, 'hum', '#f0f0f0', 15, 160, 20, 1.8, 'fracture', 'melee', { bio: 'cold', drops: [['yetiFur', 1, 0.8], ['frozenHeart', 1, 0.1]], tier: 2 }, ['base', 'crystal', 'elite']],
  ['werewolf', 'Hombre lobo', 0, 'quad', '#5a4a3a', 12, 90, 16, 3.2, 'bite', 'charger', { night: 1, drops: [['werewolfClaw', 1, 0.5], ['fur', 2, 0.8]], tier: 2 }, ['base', 'frost', 'shadow', 'elite']],
  ['vampbat', 'Murciélago vampiro', 0, 'fly', '#3a2030', 5, 14, 4, 4, 'bite', 'melee', { night: 1, drain: 1, drops: [['batWing', 1, 0.6]] }, ['base', 'fire', 'frost', 'shadow']],
  ['shroom', 'Hongo andante', 0, 'blob', '#c83a32', 8, 30, 6, 1.5, 'sting', 'melee', { venom: 1, bio: 'shadow', drops: [['mushroom', 3, 0.9], ['glowcap', 1, 0.3]] }, ['base', 'crystal', 'swamp']],
  ['treant', 'Ent corrupto', 0, 'hum', '#4a3a22', 16, 200, 18, 0.9, 'fracture', 'summoner', { bio: 'forest', summon: 'shroom', drops: [['log', 6, 1], ['resin', 2, 0.7]], tier: 3 }, ['base', 'swamp', 'frost']],
  ['lizardman', 'Hombre lagarto', 0, 'hum', '#4a8a4a', 10, 45, 10, 2.4, 'cut', 'ranged', { bio: 'swamp', proj: { c: '#9aa0a8', spd: 13, dmg: 9 }, drops: [['lizardScale', 2, 0.7]], tier: 1 }, ['base', 'jungle', 'desert', 'elite']],
  ['kobold', 'Kóbold', 0, 'hum', '#a06a3a', 7, 18, 5, 2.8, 'cut', 'melee', { bio: 'hills', drops: [['ironOre', 2, 0.6], ['coal', 2, 0.6]] }, ['base', 'fire', 'crystal']],
  ['ogre', 'Ogro', 0, 'hum', '#8a7a5a', 16, 220, 26, 1.3, 'fracture', 'melee', { drops: [['coin', 10, 1], ['meat', 4, 1]], tier: 3 }, ['base', 'swamp', 'frost', 'elite']],
  ['necro', 'Nigromante', 0, 'hum', '#2a2a3a', 10, 60, 8, 1.8, 'cut', 'summoner', { night: 1, summon: 'skeleton', proj: { c: '#7a4aff', spd: 9, dmg: 10 }, drops: [['darkCloth', 2, 0.8], ['spiritOrb', 1, 0.3]], tier: 3 }, ['base', 'frost', 'desert']],
  ['automaton', 'Autómata renegado', 0, 'golem', '#b08a4a', 11, 80, 12, 2, 'cut', 'ranged', { proj: { c: '#5af0ff', spd: 15, dmg: 10 }, drops: [['scrapMetal', 3, 1], ['cog', 2, 0.5], ['circuit', 1, 0.15]], tier: 2 }, ['base', 'fire', 'frost', 'elite']],
  ['drone', 'Dron de vigilancia', 0, 'fly', '#8a9aa8', 8, 30, 6, 3.2, 'burn', 'ranged', { proj: { c: '#ff3a3a', spd: 18, dmg: 7 }, drops: [['scrapMetal', 2, 0.9], ['coil', 1, 0.4]], tier: 2 }, ['base', 'elite']],
  ['bomber', 'Bomba viviente', 1, 'blob', '#c86a2a', 8, 20, 30, 2.6, 'burn', 'exploder', { drops: [['gunpowder', 2, 0.8], ['sulfur', 1, 0.5]] }, ['base', 'fire', 'frost']],
  ['mimic', 'Cofre mimo', 0, 'quad', '#8a5a2a', 11, 70, 14, 2.6, 'bite', 'charger', { drops: [['coin', 15, 1], ['goblinGear', 1, 0.4]], tier: 1 }, ['base', 'crystal', 'shadow']],
  ['scarab', 'Escarabajo de la plaga', 0, 'bug', '#3a5a4a', 6, 16, 4, 2.4, 'sting', 'melee', { drops: [['chitin', 1, 0.6]] }, ['base', 'desert', 'fire']],
  ['shade', 'Sombra', 1, 'ghost', '#14141a', 10, 40, 11, 2.4, 'cut', 'melee', { night: 1, phase: 1, blink: 1, drops: [['shadowEssence', 1, 0.6]], tier: 2 }, ['base', 'frost', 'elite']],
];
const ENEMIES = {};
const tintMix = (a, b, t) => { const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
for (const [id, n, fem, shape, c, s, hp, dmg, v, wound, ai, x, vars] of ARCH) for (const vk of vars) {
  const V = VARIANTS[vk], key = vk === 'base' ? id : id + cap(vk);
  ENEMIES[key] = {
    n: n + (fem ? V.f : V.m), shape, c: V.tint ? tintMix(c, V.tint, 0.55) : c, c2: V.tint || '#1a1a1a', s: Math.round(s * (V.s || 1)), hp: Math.round(hp * (V.hp || 1)), dmg: dmg * (V.dmg || 1), v: v * (V.v || 1),
    wound, ai, el: V.el || null, elite: !!V.elite, bio: V.bio ? BIO_SETS[V.bio] : x.bio ? BIO_SETS[x.bio] : null, tier: (x.tier || 0) + (V.elite ? 2 : 0) + (vk !== 'base' ? 1 : 0),
    night: !!x.night && vk !== 'shadow', undead: !!x.undead, phase: !!x.phase, venom: !!x.venom || vk === 'swamp', drain: !!x.drain, split: !!x.split && !V.elite, regen: x.regen || 0, blink: !!x.blink,
    glow: !!x.glow || vk === 'fire', proj: x.proj ? { ...x.proj, c: V.tint && vk !== 'base' ? tintMix(x.proj.c, V.tint, 0.5) : x.proj.c } : null, summon: x.summon || null,
    drops: (x.drops || []).concat(V.elite ? [['coin', 8, 1]] : []), xp: Math.round(4 + hp / 8),
  };
}

// ---------- Jefes ----------
// abilities: summon (tipo, n) · ring (n) · spiral · charge · slam · meteor (n) · teleport · heal · beam · pull · hazard · shield · clone
const BOSSES = {
  zombieKing: { n: 'Rey Zombi', shape: 'hum', c: '#4a6a3a', c2: '#ffd34a', s: 34, hp: 700, dmg: 18, v: 1.5, crown: 1, ab: [['summon', 'zombie', 4], ['charge'], ['slam']], bio: null, night: 1, item: ['cursedSkull', 'Calavera maldita', 'bone', 'rottenFlesh,rottenFlesh,bone'], tier: 0 },
  boneLord: { n: 'Señor Esqueleto', shape: 'skel', c: '#e8e0c8', c2: '#7a4aff', s: 32, hp: 800, dmg: 14, v: 1.8, ab: [['ring', 12], ['summon', 'skeleton', 3], ['spiral']], item: ['boneHorn', 'Cuerno de hueso', 'bone', 'bone,bone,orcTusk'], tier: 1 },
  slimeKing: { n: 'Rey Limo', shape: 'blob', c: '#4ac84a', c2: '#ffd34a', s: 44, hp: 900, dmg: 16, v: 1.2, crown: 1, ab: [['summon', 'slimeE', 6], ['slam'], ['ring', 10]], split: 1, item: ['royalGel', 'Gelatina real', 'slimeGel', 'slimeGel,slimeGel,goldIngot'], tier: 0 },
  spiderQueen: { n: 'Reina Araña', shape: 'bug', c: '#2a1a1a', c2: '#c83a2a', s: 40, hp: 1000, dmg: 16, v: 2.4, venom: 1, ab: [['summon', 'spiderE', 5], ['ring', 14], ['charge']], item: ['silkCocoon', 'Capullo de seda', 'silk', 'silk,silk,venom'], tier: 1 },
  mountainTroll: { n: 'Trol de la Montaña', shape: 'hum', c: '#5a6a4a', c2: '#c8c0b0', s: 48, hp: 1600, dmg: 28, v: 1.2, ab: [['slam'], ['meteor', 5], ['charge'], ['summon', 'troll', 1]], item: ['trollTotem', 'Tótem del trol', 'trollHide', 'trollHide,stone,stone'], tier: 2 },
  goblinWarlord: { n: 'Caudillo Goblin', shape: 'hum', c: '#4a7a2a', c2: '#c8843a', s: 30, hp: 800, dmg: 14, v: 2.4, crown: 1, ab: [['summon', 'goblin', 5], ['meteor', 4], ['charge']], item: ['warHorn', 'Cuerno de guerra', 'goblinGear', 'goblinGear,coin,coin'], tier: 1 },
  orcLord: { n: 'Señor de los Orcos', shape: 'hum', c: '#3a5a2a', c2: '#8a1a1a', s: 38, hp: 1200, dmg: 22, v: 2, ab: [['charge'], ['summon', 'orc', 3], ['heal'], ['slam']], item: ['orcBanner', 'Estandarte orco', 'orcTusk', 'orcTusk,orcTusk,cloth'], tier: 2 },
  ancientYeti: { n: 'Yeti Ancestral', shape: 'hum', c: '#f0f4ff', c2: '#5ab8ff', s: 46, hp: 1500, dmg: 24, v: 1.7, el: 'frost', ab: [['ring', 16], ['slam'], ['summon', 'yeti', 2], ['meteor', 4]], bio: BIO_SETS.cold, item: ['frostIdol', 'Ídolo helado', 'frozenHeart', 'yetiFur,ice,ice'], tier: 2 },
  pharaoh: { n: 'Faraón Momia', shape: 'hum', c: '#d8c8a0', c2: '#ffd34a', s: 38, hp: 1300, dmg: 18, v: 1.6, crown: 1, ab: [['summon', 'mummy', 4], ['beam'], ['teleport'], ['ring', 12]], bio: BIO_SETS.desert, item: ['goldenAnkh', 'Anj de oro', 'goldIngot', 'mummyWrap,mummyWrap,goldIngot'], tier: 2 },
  elderDrake: { n: 'Draco Anciano', shape: 'quad', c: '#8a2a1a', c2: '#ffb030', s: 52, hp: 2600, dmg: 30, v: 2.2, el: 'fire', ab: [['spiral'], ['meteor', 7], ['charge'], ['summon', 'imp', 4]], item: ['dragonEgg', 'Huevo de dragón', 'dragonEye', 'drakeScale,drakeScale,obsidian'], tier: 4 },
  eternalPhoenix: { n: 'Fénix Eterno', shape: 'fly', c: '#ff6a1a', c2: '#ffe040', s: 44, hp: 2200, dmg: 24, v: 3, el: 'fire', revive: 1, ab: [['ring', 20], ['charge'], ['meteor', 6], ['spiral']], item: ['emberSeed', 'Semilla de ascuas', 'phoenixFeather', 'fireblossom,sunstone'], tier: 5 },
  swampHydra: { n: 'Hidra del Pantano', shape: 'quad', c: '#3a6a3a', c2: '#c8e030', s: 50, hp: 2000, dmg: 22, v: 1.4, venom: 1, heads: 3, ab: [['ring', 9], ['summon', 'slimeESwamp', 4], ['heal'], ['hazard']], bio: BIO_SETS.swamp, item: ['hydraScale', 'Escama de hidra', 'lizardScale', 'lizardScale,venom,nightshade'], tier: 3 },
  ironColossus: { n: 'Coloso de Hierro', shape: 'golem', c: '#7f8a96', c2: '#ff3a3a', s: 54, hp: 3200, dmg: 32, v: 1, ab: [['beam'], ['slam'], ['summon', 'drone', 4], ['shield']], item: ['coreKey', 'Llave del núcleo', 'circuit', 'scrapMetal,scrapMetal,' + MF.steel.gear], tier: 4 },
  hiveMind: { n: 'Mente Colmena', shape: 'blob', c: '#5a4a2a', c2: '#e0d040', s: 42, hp: 1800, dmg: 16, v: 1.6, ab: [['summon', 'scarab', 8], ['hazard'], ['ring', 12]], item: ['royalJelly', 'Jalea real', 'honeycomb', 'honeycomb,chitin,chitin'], tier: 3 },
  lich: { n: 'Liche', shape: 'skel', c: '#c8c8e0', c2: '#5af0ff', s: 36, hp: 2400, dmg: 22, v: 1.8, crown: 1, ab: [['summon', 'wraith', 3], ['spiral'], ['teleport'], ['shield']], item: ['phylactery', 'Filacteria', 'soulGemEmpty', 'spiritOrb,spiritOrb,darkCloth'], tier: 4 },
  demonLord: { n: 'Señor Demonio', shape: 'hum', c: '#6a0a0a', c2: '#ff4a10', s: 50, hp: 3800, dmg: 34, v: 2, el: 'fire', horns: 1, ab: [['meteor', 8], ['summon', 'demon', 2], ['ring', 18], ['charge'], ['hazard']], item: ['infernalSigil', 'Sello infernal', 'demonHorn', 'demonHorn,demonHorn,essenceFire'], tier: 5 },
  prismGolem: { n: 'Gólem Prismático', shape: 'golem', c: '#b090ff', c2: '#ffffff', s: 48, hp: 2800, dmg: 26, v: 1.1, ab: [['beam'], ['ring', 16], ['shield'], ['summon', 'stoneGolemCrystal', 2]], bio: BIO_SETS.crystal, item: ['prismHeart', 'Corazón prismático', 'prism', 'crystal,crystal,resonantCrystal'], tier: 4 },
  primalTreant: { n: 'Ent Primigenio', shape: 'hum', c: '#3a2a12', c2: '#6aa83a', s: 56, hp: 3000, dmg: 28, v: 0.9, ab: [['pull'], ['summon', 'shroom', 5], ['heal'], ['slam']], bio: BIO_SETS.forest, item: ['ancientAcorn', 'Bellota ancestral', 'resin', 'resin,log,mandrake'], tier: 3 },
  vampireQueen: { n: 'Reina Vampira', shape: 'hum', c: '#2a1020', c2: '#e02040', s: 34, hp: 2200, dmg: 20, v: 2.6, crown: 1, drain: 1, ab: [['summon', 'vampbat', 6], ['teleport'], ['beam'], ['clone']], night: 1, item: ['bloodChalice', 'Cáliz de sangre', 'goldIngot', 'batWing,batWing,rubyCut'], tier: 4 },
  stormTitan: { n: 'Titán de Tormenta', shape: 'hum', c: '#5a6a8a', c2: '#f0f05a', s: 58, hp: 4200, dmg: 32, v: 1.6, el: 'storm', ab: [['meteor', 9], ['spiral'], ['pull'], ['summon', 'elemental', 3]], item: ['stormCore', 'Núcleo de tormenta', 'essenceStorm', 'essenceStorm,griffinFeather,' + MF.copper.wire], tier: 5 },
  voidDevourer: { n: 'Devorador del Vacío', shape: 'blob', c: '#1a0a2a', c2: '#a060ff', s: 62, hp: 5200, dmg: 36, v: 1.3, el: 'void', ab: [['pull'], ['ring', 24], ['summon', 'shade', 4], ['hazard'], ['spiral']], item: ['voidKey', 'Llave del vacío', 'voidCore', 'shadowEssence,shadowEssence,singularity'], tier: 6 },
  timeLord: { n: 'Señor del Tiempo', shape: 'hum', c: '#e0c8ff', c2: '#ffffff', s: 40, hp: 4000, dmg: 28, v: 2.2, ab: [['teleport'], ['clone'], ['spiral'], ['ring', 20]], item: ['brokenHourglass', 'Reloj de arena roto', 'timeCrystal', 'timeCrystal,glass,' + MF.chronium.ingot], tier: 6 },
  supremeAutomaton: { n: 'Autómata Supremo', shape: 'golem', c: '#c8a04a', c2: '#5af0ff', s: 52, hp: 3600, dmg: 30, v: 1.5, ab: [['beam'], ['summon', 'automaton', 3], ['hazard'], ['spiral']], item: ['masterCircuit', 'Circuito maestro', 'processor', 'scrapMetal,goblinGear,eliteCircuit'], tier: 5 },
  alphaWerewolf: { n: 'Hombre Lobo Alfa', shape: 'quad', c: '#4a3a2a', c2: '#ffd34a', s: 40, hp: 2000, dmg: 26, v: 3.4, ab: [['charge'], ['summon', 'werewolf', 3], ['charge'], ['slam']], night: 1, item: ['moonPendant', 'Colgante lunar', 'moonstoneCut', 'werewolfClaw,werewolfClaw,silver2'], tier: 3 },
};
// Invocadores, trofeos, almas y armas de jefe
const BOSS_W = {
  zombieKing: ['Hacha del Rey Zombi', 'baxe', 6, { sweep: 50 }], boneLord: ['Arco de Hueso Real', 'bow', 5, { reach: 120, ranged: { ammo: 'arrow', cd: 0.35, spd: 24, n: 2, spread: 0.1 } }], slimeKing: ['Maza Gelatinosa', 'mace', 6, { sweep: 50 }],
  spiderQueen: ['Daga de la Reina', 'dagger', 6, { loot: 0.5, el: 'storm', chain: 2 }], mountainTroll: ['Garrote del Trol', 'mace', 9, { sweep: 64 }], goblinWarlord: ['Trabuco Goblin', 'gun', 4, { ranged: { ammo: 'bullet', cd: 0.6, spd: 26, n: 4, spread: 0.3 } }],
  orcLord: ['Gran Hacha Orca', 'baxe', 9, { sweep: 60 }], ancientYeti: ['Lanza Glacial', 'spear', 8, { reach: 60, el: 'frost' }], pharaoh: ['Cetro del Faraón', 'staff', 7, { el: 'void', ranged: { cd: 0.4, spd: 16, mana: 6 } }],
  elderDrake: ['Espada Dracónica', 'sword', 12, { el: 'fire', sweep: 48 }], eternalPhoenix: ['Arco del Fénix', 'bow', 10, { el: 'fire', ranged: { ammo: 'arrow', cd: 0.3, spd: 28 } }], swampHydra: ['Látigo de la Hidra', 'scythe', 9, { el: 'life', chain: 3 }],
  ironColossus: ['Puño del Coloso', 'mace', 13, { sweep: 70 }], hiveMind: ['Báculo de la Colmena', 'staff', 8, { ranged: { cd: 0.2, spd: 14, mana: 3, n: 2, spread: 0.25 } }], lich: ['Báculo del Liche', 'staff', 11, { el: 'void', ranged: { cd: 0.35, spd: 18, mana: 8, pierce: 4 } }],
  demonLord: ['Espada Infernal', 'sword', 15, { el: 'fire', sweep: 64 }], prismGolem: ['Varita Prismática', 'wand', 10, { el: 'storm', ranged: { cd: 0.2, spd: 30, mana: 4, n: 3, spread: 0.2 } }], primalTreant: ['Arco Ancestral', 'bow', 11, { reach: 140, ranged: { ammo: 'arrow', cd: 0.4, spd: 26, pierce: 3 } }],
  vampireQueen: ['Guadaña Carmesí', 'scythe', 12, { el: 'life', sweep: 60 }], stormTitan: ['Martillo Titánico', 'mace', 16, { el: 'storm', chain: 5, sweep: 70 }], voidDevourer: ['Hoja del Vacío Eterno', 'sword', 18, { el: 'void', sweep: 80, reach: 60 }],
  timeLord: ['Báculo del Tiempo Roto', 'staff', 14, { el: 'time', ranged: { cd: 0.25, spd: 24, mana: 10, pierce: 6 } }], supremeAutomaton: ['Cañón Supremo', 'gun', 14, { ranged: { ammo: 'batteryCell', cd: 0.5, spd: 40, pierce: 8, boom: 50 } }], alphaWerewolf: ['Garras del Alfa', 'dagger', 10, { loot: 0.6, chain: 2 }],
};
IT('silver2', 'Lingote de plata pura', '#f4f8ff', 'ingot', 1, 'Plata refinada dos veces.'); RM('alloy', { [MF.silver.ingot]: 2 }, { silver2: 1 }, 3);
for (const k in BOSSES) {
  const B = BOSSES[k], [iid, iname, core, teeth] = B.item;
  IT(iid, iname, B.c2, 'skull', C_CAT, `Úsalo con F para invocar a ${B.n}. ¡Prepárate antes!`); ITEMS[iid].summon = k; B.summonItem = iid;
  RB(iid, 1, core, teeth, 0, 0);
  IT(k + 'Trophy', 'Trofeo: ' + B.n, B.c2, 'trophy', C_CAT, 'Prueba de que lo venciste.');
  IT(k + 'Soul', 'Alma de ' + B.n, B.c, 'orb', C_CAT, 'Ingrediente de su arma legendaria y de mejoras.');
  const [wn, ws, wd, extra] = BOSS_W[k], wid = k + 'Weapon';
  weapon(wid, wn, B.c2, ws, { dmg: wd, reach: 0, ...extra }, `Arma legendaria de ${B.n}.`);
  if (extra.ranged) ITEMS[wid].weapon.ranged = extra.ranged;
  RX(wid, k + 'Soul', [k + 'Soul', k + 'Trophy', 'enchantedBook'], 0, 0);
  B.drops = [['coin', 40 + B.hp / 20, 1], [k + 'Trophy', 1, 1], [k + 'Soul', 2, 1]];
}

// ---------- Casa y muebles (para atraer NPC) ----------
const HB = (id, o, core, teeth) => { XB(id, { cat: HOUSE_CAT, ...o }); RB(id, o.out || 1, core, teeth); };
HB('woodWall', { n: 'Pared de madera', solid: 1, out: 4, d: 'Bloquea el paso. Las casas para NPC se cierran con paredes y una puerta.', look: { c: '#8a6a42', g: '▦', a: '' } }, 'planks', 'planks');
HB('stoneWall', { n: 'Pared de piedra', solid: 1, out: 4, d: 'Bloquea el paso y resiste mejor.', look: { c: '#7a7a78', g: '▦', a: '' } }, 'stone', 'stone,stone');
HB('door', { n: 'Puerta', door: 1, d: 'Tú pasas; los enemigos no. F sobre ella: comprobar si la casa es válida.', look: { c: '#a07848', g: '▯', a: '' } }, 'planks', 'planks,planks,' + MF.iron.nugget);
HB('table', { n: 'Mesa', d: 'Mueble: toda casa necesita una mesa.', look: { c: '#9a7448', g: '┳', a: '' } }, 'planks', 'stick,stick,stick');
HB('chair', { n: 'Silla', d: 'Mueble: toda casa necesita una silla.', look: { c: '#9a7448', g: '╓', a: '' } }, 'planks', 'stick,stick');
HB('torch', { n: 'Antorcha', light: 3, out: 4, d: 'Luz. Toda casa necesita luz.', look: { c: '#3a2a1a', g: '¡', a: 'glow' } }, 'stick', 'coal');
HB('bookshelf', { n: 'Estantería', d: 'Atrae al Mago o a la Sabia.', look: { c: '#6a4a2a', g: '≣', a: '' } }, 'planks', 'paper2,paper2,leather');
HB('anvil', { n: 'Yunque', d: 'Atrae al Herrero.', look: { c: '#4a4a52', g: '⊥', a: '' } }, MF.iron.block, MF.iron.ingot + ',' + MF.iron.ingot);
HB('weaponRack', { n: 'Armero', d: 'Atrae a la Guardia.', look: { c: '#7a5a3a', g: '⚔', a: '' } }, 'planks', MF.iron.rod + ',' + MF.iron.rod + ',planks');
HB('herbRack', { n: 'Secadero de hierbas', d: 'Atrae a la Médica.', look: { c: '#6a8a3a', g: '♣', a: '' } }, 'planks', 'herbs,herbs,thread');
HB('kennel', { n: 'Caseta', d: 'Atrae a la Domadora.', look: { c: '#8a5a3a', g: '⌂', a: '' } }, 'planks', 'planks,planks,wool');
HB('rug', { n: 'Alfombra', d: 'Decoración: casas más bonitas atraen NPC con mejores ofertas.', look: { c: '#a03a3a', g: '▬', a: '' } }, 'wool', 'wool,wool');
HB('flowerPot', { n: 'Maceta', d: 'Decoración.', look: { c: '#a85a3a', g: '❀', a: '' } }, 'clay', 'petals');
HB('painting', { n: 'Cuadro', d: 'Decoración.', look: { c: '#c8a040', g: '▣', a: '' } }, 'planks', 'paper2,ink');

// ---------- NPC ----------
// need: bloque de trabajo que debe haber en la casa · offers: [da, recibe]
const NPCS = {
  merchant: { n: 'Mercader', c: '#3a6aa8', need: 'chest', offers: [[{ coin: 2 }, { arrow: 16 }], [{ coin: 3 }, { bandage: 3 }], [{ coin: 5 }, { cookedMeat: 6 }], [{ log: 32 }, { coin: 3 }], [{ stone: 64 }, { coin: 2 }], [{ ironIngot: 10 }, { coin: 6 }], [{ coin: 8 }, { tameTreat: 1 }], [{ coin: 20 }, { grapple: 1 }]] },
  smith: { n: 'Herrero', c: '#5a4a3a', need: 'anvil', offers: [[{ coin: 10 }, { ironPickaxe: 1 }], [{ coin: 25 }, { steelPickaxe: 1 }], [{ coin: 30 }, { steelSword: 1 }], [{ coin: 12 }, { steel: 8 }], [{ scrapMetal: 6 }, { coin: 3 }], [{ coin: 60 }, { titaniumPickaxe: 1 }], [{ orcTusk: 3 }, { coin: 5 }]] },
  alchemist: { n: 'Alquimista', c: '#6a3a8a', need: 'alchemyTable', offers: [[{ coin: 6 }, { potionSwift: 1 }], [{ coin: 6 }, { potionMiner: 1 }], [{ coin: 8 }, { potionMana: 2 }], [{ coin: 10 }, { antidote: 2 }], [{ venom: 4 }, { coin: 3 }], [{ coin: 15 }, { potionLuck: 1 }], [{ slimeGel: 6 }, { coin: 4 }]] },
  mage: { n: 'Mago', c: '#4a2a8a', need: 'bookshelf', offers: [[{ coin: 25 }, { spell_fireball: 1 }], [{ coin: 25 }, { spell_iceLance: 1 }], [{ coin: 30 }, { spell_heal: 1 }], [{ coin: 35 }, { spell_blink: 1 }], [{ coin: 40 }, { spell_chainBolt: 1 }], [{ spiritOrb: 2 }, { coin: 12 }], [{ coin: 12 }, { manaCrystal: 1 }]] },
  farmer: { n: 'Granjera', c: '#6a8a3a', need: 'grower', offers: [[{ coin: 2 }, { berries: 12 }], [{ coin: 3 }, { fertilizer: 8 }], [{ coin: 4 }, { cotton: 12 }], [{ wool: 10 }, { coin: 3 }], [{ coin: 5 }, { stew: 2 }], [{ coin: 10 }, { mandrake: 2 }]] },
  engineer: { n: 'Ingeniera', c: '#c8843a', need: 'computer', offers: [[{ coin: 8 }, { circuit: 2 }], [{ coin: 15 }, { processor: 1 }], [{ coin: 12 }, { computer: 1 }], [{ goblinGear: 2 }, { coin: 8 }], [{ coin: 20 }, { lvMotor: 2 }], [{ coin: 10 }, { display: 2 }]] },
  hunter: { n: 'Cazador', c: '#5a4a2a', need: 'trap', offers: [[{ coin: 4 }, { arrow: 32 }], [{ coin: 8 }, { fireArrow: 16 }], [{ coin: 15 }, { hunterBow: 1 }], [{ fur: 6 }, { coin: 4 }], [{ hide: 6 }, { coin: 3 }], [{ coin: 20 }, { bullet: 40 }]] },
  medic: { n: 'Médica', c: '#e8e8e8', need: 'herbRack', offers: [[{ coin: 4 }, { bandage: 5 }], [{ coin: 6 }, { splint: 2 }], [{ coin: 8 }, { medkit: 1 }], [{ coin: 5 }, { painkiller: 3 }], [{ herbs: 10 }, { coin: 2 }]], heal: 1 },
  tamer: { n: 'Domadora', c: '#a85a8a', need: 'kennel', offers: [[{ coin: 6 }, { tameTreat: 1 }], [{ coin: 4 }, { meat: 10 }], [{ coin: 30 }, { dashBoots: 1 }], [{ feather: 10 }, { coin: 2 }]] },
  guard: { n: 'Guardia', c: '#7f8a96', need: 'weaponRack', offers: [[{ coin: 12 }, { heavyXbow: 1 }], [{ coin: 6 }, { bolt: 24 }], [{ coin: 25 }, { musket: 1 }], [{ coin: 8 }, { grenade: 4 }], [{ coin: 40 }, { cursedSkull: 1 }]], guard: 1 },
  tailor: { n: 'Sastre', c: '#c84a6a', need: 'loom', offers: [[{ coin: 5 }, { cloth: 8 }], [{ coin: 12 }, { furCoat: 1 }], [{ coin: 15 }, { enchantedCloth: 2 }], [{ silk: 8 }, { coin: 4 }], [{ darkCloth: 3 }, { coin: 5 }]] },
};

// ---------- Domesticación ----------
// role: combat (pelea contigo) · mount (se monta con F) · farm (produce cada cierto tiempo)
const TAME = {
  wolf: { food: ['meat', 'cookedMeat', 'bone'], role: 'combat', ch: 0.35 }, frostwolf: { food: ['meat', 'cookedMeat'], role: 'combat', ch: 0.25 }, fox: { food: ['berries', 'fish'], role: 'combat', ch: 0.4 },
  polarbear: { food: ['fish', 'cookedFish'], role: 'combat', ch: 0.15 }, shadowcat: { food: ['fish', 'cookedFish'], role: 'combat', ch: 0.25 }, drake: { food: ['cookedMeat'], role: 'combat', ch: 0.12 },
  horse: { food: ['berries', 'herbs'], role: 'mount', spd: 1.9, ch: 0.35 }, camel: { food: ['cactus'], role: 'mount', spd: 1.6, ch: 0.4 }, reindeer: { food: ['berries', 'snow'], role: 'mount', spd: 1.75, ch: 0.35 },
  unicorn: { food: ['starlily', 'moonflower'], role: 'mount', spd: 2.3, ch: 0.2 }, griffin: { food: ['meat', 'cookedMeat'], role: 'mount', spd: 2.4, fly: 1, ch: 0.15 }, elephant: { food: ['berries', 'coconut'], role: 'mount', spd: 1.4, ch: 0.3 },
  sheep: { food: ['herbs'], role: 'farm', prod: ['wool', 90], ch: 0.5 }, goat: { food: ['herbs'], role: 'farm', prod: ['wool', 120], ch: 0.45 }, mooshroom: { food: ['mushroom'], role: 'farm', prod: ['mushroom', 60], ch: 0.5 },
  bee: { food: ['petals'], role: 'farm', prod: ['honeycomb', 100], ch: 0.4 }, parrot: { food: ['berries'], role: 'farm', prod: ['feather', 80], ch: 0.45 }, turtle: { food: ['kelp'], role: 'farm', prod: ['shell', 150], ch: 0.4 },
  panda: { food: ['bamboo'], role: 'combat', ch: 0.3 }, deer: { food: ['berries'], role: 'mount', spd: 1.6, ch: 0.3 },
};

// ---------- Lógica: computadoras y más ----------
XB('computer', { n: 'Computadora', cat: 6, emit: 1, rsin: 1, logic: 1, tier: 2, d: 'Programable: F para abrir la terminal. Lee y escribe redstone en sus 4 lados, controla máquinas vecinas, cuenta objetos, mide tanques y energía, y muestra mensajes.', look: { c: '#2a3a4a', g: '⌨', a: 'pulse' } });
RB('computer', 1, 'processor', 'circuit,' + MF.iron.plate + ',glass,redstone', 0, 2);
XB('display', { n: 'Pantalla numérica', cat: 6, rsin: 1, logic: 1, tier: 1, d: 'Muestra en grande la señal que recibe (0-15) o el número que le manda una computadora.', look: { c: '#1a2a1a', g: '#', a: '' } });
RB('display', 1, 'glass', 'redstone,' + MF.copper.wire, 0, 1);
XB('alarm', { n: 'Sirena', cat: 6, rsin: 1, logic: 1, tier: 1, d: 'Con señal suena una alarma y te avisa en pantalla.', look: { c: '#8a2a2a', g: '!', a: 'pulse' } });
RB('alarm', 1, MF.iron.plate, 'redstone,' + MF.copper.foil, 0, 1);
XB('enemySensor', { n: 'Detector de enemigos', cat: 6, emit: 1, logic: 1, tier: 2, d: 'Emite tanta señal como enemigos haya a 8 casillas (y 15 si hay un jefe).', look: { c: '#5a2a2a', g: '☠', a: 'pulse' } });
RB('enemySensor', 1, 'sensorItem', 'bone,redstone', 0, 2);
XB('turret', { n: 'Torreta', cat: 6, rsable: 1, tier: 3, pw: { role: 'use', rate: 30, cap: 600 }, d: 'Dispara a los enemigos a 9 casillas (gasta energía). Con redstone puedes apagarla.', look: { c: '#4a5a6a', g: '⊕', a: 'spin' } });
RB('turret', 1, 'lvMotor', MF.steel.longRod + ',' + MF.steel.plate + ',sensorItem,circuit', 0, 3);
XB('spikeTrap', { n: 'Pinchos', cat: 6, rsable: 1, tier: 1, d: 'Daña a los enemigos que la pisan. Con redstone se retraen.', look: { c: '#6a6a70', g: '⋀', a: '' } });
RB('spikeTrap', 2, MF.iron.plate, MF.iron.rod + ',' + MF.iron.rod, 0, 1);
XB('altar', { n: 'Altar de invocación', cat: HOUSE_CAT, tier: 1, light: 2, d: 'F con un objeto de invocación en la mano: el jefe aparece aquí. Te avisa de qué falta para cada jefe.', look: { c: '#3a2a4a', g: '☥', a: 'glow' } });
RB('altar', 1, 'obsidian', 'stone,stone,goldIngot', 0, 1);

// ---------- Protecciones contra enemigos ----------
XB('scarecrow', { n: 'Espantapájaros', cat: HOUSE_CAT, d: 'No aparecen enemigos a 10 casillas. Barato, para empezar.', look: { c: '#c8a060', g: '✝', a: '' } });
RB('scarecrow', 1, 'planks', 'stick,stick,wool');
XB('wardTotem', { n: 'Tótem de guarda', cat: HOUSE_CAT, light: 1, tier: 3, d: 'Nada aparece a 18 casillas y los enemigos que entran se desvanecen (los jefes no). Sin energía.', look: { c: '#6a5a8a', g: '♅', a: 'glow' } });
RB('wardTotem', 1, 'wardstone', 'log,log,holyWater', 0, 3);
RB('wardTotem', 1, 'gargoyleStone', 'log,log,spiritOrb', 0, 2);
XB('spawnSuppressor', { n: 'Inhibidor de aparición', cat: 6, rsable: 1, tier: 3, pw: { role: 'use', rate: 20, cap: 400 }, d: 'Mecanismo: con 20 FE/s nada aparece a 32 casillas y los enemigos que entran se desvanecen. Con redstone puedes apagarlo (por ejemplo, para cazar).', look: { c: '#3a4a6a', g: '⊘', a: 'pulse' } });
RB('spawnSuppressor', 1, 'circuit', 'sensorItem,' + MF.iron.plate + ',' + MF.iron.plate + ',redstone', 0, 3);
XB('holyBeacon', { n: 'Faro sagrado', cat: 6, rsable: 1, light: 3, tier: 5, pw: { role: 'use', rate: 60, cap: 1200 }, d: 'Con 60 FE/s protege 48 casillas: nada aparece y los no muertos que entran arden al instante.', look: { c: '#e8d890', g: '☀', a: 'glow' } });
RB('holyBeacon', 1, 'holyWater', MF.gold.block + ',glass,glass,manaCrystal', 16, 5);
IT('scrollWard', 'Pergamino de protección', '#fff6b0', 'scroll', C_CAT, 'Léelo con F: nada aparece a 24 casillas de donde estás durante 10 minutos.');
ITEMS.scrollWard.use = { ward: [24, 600] };
RB('scrollWard', 2, 'parchment', 'arcaneInk,holyWater', 0, 3);
RB('scrollWard', 1, 'parchment', 'ink,bone,herbs', 0, 1);
IT('potionStealth', 'Poción de sigilo', '#5a6a7a', 'potion', C_CAT, 'Durante 4 min aparecen muchos menos enemigos y te detectan desde mucho más cerca. Bébela con F.');
ITEMS.potionStealth.use = { buff: 'stealth', t: 240 };
RM('alchemy', { vial: 1, shadowEssence: 1, nightshade: 1 }, { potionStealth: 1 }, 4, { water: 100 });
RM('alchemy', { vial: 1, batWing: 2, herbs: 2 }, { potionStealth: 1 }, 4, { water: 100 });
SPELLS.sanctuary = { n: 'Santuario', i: '⛨', el: 'holy', m: 40, cd: 120, kind: 'ward', r: 20, t: 300, c: '#fff6b0' };
IT('spell_sanctuary', 'Hechizo: Santuario', '#fff6b0', 'scroll', C_CAT, 'Léelo con F para aprenderlo. Crea una zona de 20 casillas donde no aparece nada durante 5 minutos (40 de maná).');
ITEMS.spell_sanctuary.learn = 'sanctuary';
RB('spell_sanctuary', 1, 'runeLife', 'parchment,holyWater,wardstone', 0, 4);
NPCS.mage.offers.push([{ coin: 30 }, { spell_sanctuary: 1 }]);
NPCS.merchant.offers.push([{ coin: 6 }, { scrollWard: 1 }]);
NPCS.alchemist.offers.push([{ coin: 9 }, { potionStealth: 1 }]);
