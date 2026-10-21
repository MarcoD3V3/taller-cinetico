'use strict';
// =====================================================================================
//  Equipo: capas, guantes, escudos, anillos, accesorios, tótems, disfraces y runas.
//  gear: { slot, mods (como los rasgos), def, block (probabilidad de bloquear), look (aspecto) }
//  Ranuras: back, hands, shield, ring (×2), acc (×4), totem, costume, rune (×6)
// =====================================================================================
const GEAR_SLOT_N = { back: 'Capa', hands: 'Guantes', shield: 'Escudo', ring: 'Anillo', acc: 'Accesorio', totem: 'Tótem', costume: 'Disfraz', rune: 'Runa' };
function gear(id, n, c, s, slot, x, core, teeth, tier, d) {
  if (!ITEMS[id]) IT(id, n, c, s, C_CAT, '');
  ITEMS[id].gear = { slot, ...x };
  ITEMS[id].d = (d ? d + ' ' : '') + `Equípalo en la ranura de ${GEAR_SLOT_N[slot].toLowerCase()} (inventario, E).`;
  if (core) RX(id, core, teeth, 0, tier || 0);
}
// ---------- Capas (se ven a la espalda) ----------
gear('capeCloth', 'Capa de viaje', '#8a5a3a', 'sheet', 'back', { mods: { warm: 4 }, look: { cape: '#8a5a3a' } }, 'cloth', ['cloth', 'thread'], 0, 'Abriga un poco.');
gear('capeWool', 'Capa de lana', '#d8d0c0', 'sheet', 'back', { mods: { warm: 9 }, look: { cape: '#d8d0c0' } }, 'wool', ['wool', 'wool', 'thread'], 0, 'Muy abrigada.');
gear('capeShadow', 'Capa de sombras', '#2a2238', 'sheet', 'back', { mods: { detect: 0.8 }, look: { cape: '#2a2238' } }, 'shadowPelt', ['darkCloth', 'thread'], 2, 'Te vuelve difícil de ver.');
gear('capeArcane', 'Capa encantada', '#6a4aff', 'sheet', 'back', { mods: { mana: 20, manaRegen: 1.1 }, look: { cape: '#6a4aff' } }, 'enchantedCloth', ['enchantedCloth', 'manaDust'], 4);
gear('capeGriffin', 'Capa de plumas de grifo', '#c8a060', 'feather', 'back', { mods: { speed: 1.05, dash: 0.85 }, look: { cape: '#c8a060' } }, 'griffinFeather', ['griffinFeather', 'cloth'], 4);
gear('capePhoenix', 'Capa del fénix', '#ff6a1a', 'feather', 'back', { mods: { fire: 1, warm: 10, heal: 1.1 }, look: { cape: '#ff6a1a' } }, 'phoenixFeather', ['enchantedCloth', 'essenceFire'], 6);
gear('capeRoyal', 'Manto real', '#a01a3a', 'sheet', 'back', { mods: { price: 0.9, luck: 0.03 }, look: { cape: '#a01a3a' } }, 'cloth', ['cloth', 'goldIngot', 'fur'], 2, 'Los comerciantes te respetan.');
// ---------- Guantes ----------
gear('glovesLeather', 'Guantes de cuero', '#8a5a2a', 'sheet', 'hands', { mods: { mine: 1.05, wood: 1.05 }, look: { gloves: '#8a5a2a' } }, 'leather', ['leather', 'thread'], 0, 'Trabajas mejor y sin astillas.');
gear('glovesArcher', 'Guantes de arquero', '#6a4a2a', 'sheet', 'hands', { mods: { ranged: 1.08 }, look: { gloves: '#6a4a2a' } }, 'leather', ['leather', 'feather'], 1);
gear('glovesHerbal', 'Guantes de herbolario', '#6a8a3a', 'sheet', 'hands', { mods: { sick: 0.85, luck: 0.02 }, look: { gloves: '#6a8a3a' } }, 'cloth', ['herbs', 'thread'], 0);
gear('gauntletsIron', 'Guanteletes de hierro', '#b8bcc4', 'sheet', 'hands', { def: 1, mods: { melee: 1.04 }, look: { gloves: '#b8bcc4' } }, MF.iron.plate, [MF.iron.plate, 'leather'], 1);
gear('gauntletsMithril', 'Guanteletes de mithril', '#bfe8ff', 'sheet', 'hands', { def: 2, mods: { melee: 1.06, work: 1.05 }, look: { gloves: '#bfe8ff' } }, MF.mithril.plate, [MF.mithril.plate, 'leather'], 4);
gear('magnetGlove', '', '', '', 'hands', { look: { gloves: '#c84a4a' } }, null, null, 0, 'Recoge lo que llevan las cintas al pasar.');
// ---------- Escudos (se llevan en la otra mano) ----------
const SHIELDS = [
  ['shieldWood', 'Escudo de madera', '#9a7448', 2, 0.08, {}, 'planks', ['planks', 'planks', MF.iron.nugget], 0],
  ['shieldIron', 'Escudo de hierro', '#b8bcc4', 4, 0.12, {}, MF.iron.plate, [MF.iron.plate, MF.iron.plate, 'leather'], 1],
  ['shieldSteel', 'Escudo de acero', '#7f8a96', 5, 0.15, {}, MF.steel.plate, [MF.steel.plate, MF.steel.plate, 'leather'], 2],
  ['shieldMithril', 'Escudo de mithril', '#bfe8ff', 6, 0.18, { speed: 1.02 }, MF.mithril.plate, [MF.mithril.plate, MF.mithril.plate, 'leather'], 4],
  ['shieldHoly', 'Escudo sagrado', '#fff6b0', 7, 0.18, { sick: 0.7 }, MF.silver.plate, [MF.silver.plate, 'holyWater', 'wardstone'], 4],
  ['shieldDragon', 'Escudo dracónico', '#b83a2a', 8, 0.2, { fire: 1 }, MF.dragonsteel.plate, [MF.dragonsteel.plate, 'drakeScale', 'drakeScale'], 6],
  ['shieldTower', 'Escudo torre', '#5a5e66', 10, 0.25, { speed: 0.95 }, MF.steel.doublePlate, [MF.steel.doublePlate, MF.steel.doublePlate, 'leather'], 3],
];
for (const [id, n, c, def, block, mods, core, teeth, tier] of SHIELDS) gear(id, n, c, 'shield', 'shield', { def, block, mods, look: { shield: c } }, core, teeth, tier, `${def} de defensa y ${Math.round(block * 100)} % de bloquear un golpe entero.`);
// ---------- Anillos: cada metal da algo distinto ----------
const RING_MODS = {
  iron: { def: 1 }, copper: { manaRegen: 1.05 }, zinc: { thirst: 0.95 }, gold: { luck: 0.03 }, tin: { hunger: 0.95 }, lead: { sick: 0.9 }, silver: { sick: 0.85, heal: 1.05 }, nickel: { warm: 3 },
  aluminum: { speed: 1.02 }, titanium: { def: 2 }, tungsten: { def: 3, speed: 0.98 }, platinum: { price: 0.95 }, uranium: { melee: 1.05, sick: 1.2 }, lithium: { stam: 10 }, cobalt: { mana: 10 }, chromium: { wound: 0.95 },
  brass: { work: 1.03 }, bronze: { def: 1, melee: 1.02 }, steel: { def: 2 }, stainless: { def: 2, sick: 0.95 }, invar: { warm: 5 }, electrum: { mana: 8, manaRegen: 1.05 }, solder: { craftKeep: 0.03 }, constantan: { energy: 0.95 }, duralumin: { speed: 1.03 },
  orichalcum: { xp: 1.05 }, etherium: { mana: 15 }, voidsteel: { detect: 0.85 }, kinetite: { dash: 0.85 }, luminite: { night: 1 }, aetherium: { speed: 1.04, mana: 10 }, cryonite: { warm: 8 }, ignitite: { fire: 1, melee: 1.03 }, chronium: { energy: 0.9, dash: 0.9 },
  mithril: { speed: 1.03 }, adamantite: { def: 3 }, arcanite: { mana: 12, manaRegen: 1.08 }, starsilver: { luck: 0.04 }, runesteel: { melee: 1.05 }, dragonsteel: { fire: 1, def: 2 }, elvensilver: { ranged: 1.06, sick: 0.9 }, dwarvensteel: { mine: 1.08, def: 1 },
};
for (const m of MATS) { const id = MF[m.id].ring, mods = RING_MODS[m.id] || { def: 1 }; ITEMS[id].gear = { slot: 'ring', mods, look: {} }; ITEMS[id].d = `Anillo: equípalo en una ranura de anillo. ${FORM_HOW.ring}`; }
// ---------- Accesorios: talismanes de minerales, amuletos y botas/bastones de antes ----------
for (const id in ITEMS) if (ITEMS[id].charm) { ITEMS[id].gear = { slot: 'acc', mods: ITEMS[id].charm }; ITEMS[id].d = ITEMS[id].d.replace('Llévalo en el inventario:', 'Equípalo en una ranura de accesorio:'); }
for (const id of ['fortuneAmulet', 'hunterCharm', 'speedBoots', 'dashBoots', 'phoenixWings', 'hasteStaff']) if (ITEMS[id]) { ITEMS[id].gear = { slot: 'acc' }; ITEMS[id].d += ' También funciona equipado como accesorio.'; }
// ---------- Tótems: un efecto grande con un pequeño precio ----------
const TOTEMS = [
  ['totemWolf', 'Tótem del lobo', '#7a7a80', { petHp: 1.4, tame: 1.3 }, 'frostFang', ['log', 'bone', 'fur'], 'Tus mascotas son más fuertes.'],
  ['totemBear', 'Tótem del oso', '#5a3a1a', { hp: 25, speed: 0.97 }, 'fur', ['log', 'fur', 'meat'], 'Mucha más vida, algo más lento.'],
  ['totemOwl', 'Tótem del búho', '#c8a060', { night: 1, xp: 1.06 }, 'feather', ['log', 'feather', 'glowcap'], 'Ves de noche y aprendes más.'],
  ['totemFox', 'Tótem del zorro', '#d8742a', { luck: 0.06, detect: 0.85 }, 'fur', ['log', 'berries', 'fur'], 'Astuto: más botín y más sigilo.'],
  ['totemDragon', 'Tótem del dragón', '#b83a2a', { fire: 1, melee: 1.1, warm: 6 }, 'drakeScale', ['log', 'drakeScale', 'essenceFire'], 'Fuerza y fuego.'],
  ['totemTurtle', 'Tótem de la tortuga', '#4a7a4a', { def: 5, wound: 0.85, speed: 0.95 }, 'shell', ['log', 'shell', 'kelp'], 'Muy resistente, pero lento.'],
  ['totemMoon', 'Tótem de la luna', '#c8d8ff', { mana: 30, manaRegen: 1.2, hunger: 1.1 }, 'moonstone', ['log', 'moonflower', 'manaDust'], 'Mucho maná a cambio de más hambre.'],
];
for (const [id, n, c, mods, core, teeth, d] of TOTEMS) gear(id, n, c, 'totem', 'totem', { mods }, core, teeth, 1, d);
// ---------- Disfraces: cambian tu aspecto (y dan un pequeño toque) ----------
const COSTUMES = [
  ['costumeSkeleton', 'Disfraz de esqueleto', '#e8e0c8', { shirt: '#e8e0c8', pants: '#3a3a3a', shoes: '#e8e0c8', hat: 'skull' }, { detect: 0.95 }, 'bone', ['bone', 'bone', 'cloth']],
  ['costumeKnight', 'Disfraz de caballero', '#b8bcc4', { shirt: '#b8bcc4', pants: '#7f8a96', shoes: '#5a5e66', hat: 'knight' }, { def: 1 }, MF.iron.plate, ['cloth', 'cloth', 'redstone']],
  ['costumeWizard', 'Disfraz de mago', '#4a2a8a', { shirt: '#4a2a8a', pants: '#2a1a5a', shoes: '#2a1a5a', hat: 'wizard' }, { mana: 5 }, 'cloth', ['cloth', 'manaDust', 'ink']],
  ['costumePirate', 'Disfraz de pirata', '#a83a3a', { shirt: '#e8e4dc', pants: '#3a2a1a', shoes: '#2a1a10', hat: 'pirate' }, { luck: 0.01 }, 'cloth', ['cloth', 'coin', 'feather']],
  ['costumeNinja', 'Disfraz de ninja', '#1a1a20', { shirt: '#1a1a20', pants: '#1a1a20', shoes: '#1a1a20', hat: 'hood' }, { detect: 0.92 }, 'cloth', ['cloth', 'ink', 'ink']],
  ['costumeKing', 'Disfraz de rey', '#c83a3a', { shirt: '#c83a3a', pants: '#f0e8d0', shoes: '#2a1a10', hat: 'crown' }, { price: 0.97 }, 'goldIngot', ['cloth', 'cloth', 'goldIngot']],
  ['costumeGhost', 'Disfraz de fantasma', '#e8f0ff', { shirt: '#e8f0ff', pants: '#e8f0ff', shoes: '#e8f0ff', hat: 'sheet' }, { detect: 0.95 }, 'cloth', ['cloth', 'cloth', 'ectoplasm']],
  ['costumePumpkin', 'Disfraz de calabaza', '#e8842a', { shirt: '#3a6a2a', pants: '#2a2a2a', shoes: '#2a2a2a', hat: 'pumpkin' }, { hunger: 0.97 }, 'cactus', ['cloth', 'glowcap', 'petals']],
];
for (const [id, n, c, look, mods, core, teeth] of COSTUMES) gear(id, n, c, 'chestA', 'costume', { mods, look }, core, teeth, 0, 'Cambia tu aspecto por completo (la armadura sigue protegiendo).');
// ---------- Runas engarzadas (6 huecos) ----------
const RUNE_MODS = { runeFire: { melee: 1.05, warm: 4 }, runeFrost: { ranged: 1.05 }, runeStorm: { speed: 1.04 }, runeLife: { heal: 1.12, hp: 5 }, runeVoid: { detect: 0.9 }, runeMind: { mana: 15, xp: 1.04 }, runeEarth: { def: 2 }, runeTime: { energy: 0.92, dash: 0.9 }, wardstone: { def: 3, sick: 0.85 } };
for (const id in RUNE_MODS) { ITEMS[id].gear = { slot: 'rune', mods: RUNE_MODS[id] }; ITEMS[id].d += ' Engárzala en una ranura de runa (se acumulan).'; }
// Los anillos se ven en el inventario como "Anillo de …" aunque también son material: no cambian sus recetas.
