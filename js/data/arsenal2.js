'use strict';
// =====================================================================================
//  Arsenal nuevo:
//   · 20 armas básicas para empezar (palos, piedra, hueso, cuero, madera): cazar y defenderse.
//   · Protección de principiante: escudo, casco, peto, grebas, botas y brazales sencillos.
//   · 32 armas nuevas, cada una con su estilo (aturdir, sangrar, empujar, críticos, robar vida…).
//   · 10 espadas nuevas.
//   · 12 mesas de trabajo industriales (con animación) que fabrican piezas y armas en cadena.
//  Rasgos extra de las armas (sim/weaponfx.js): spd (×tiempo entre golpes), crit (prob. de
//  doble daño), stun (prob. de aturdir), bleed (prob. de sangrado), kb (empuje), drain (robo de vida).
// =====================================================================================
const AX_N = { spd: v => v < 1 ? `golpea un ${Math.round((1 - v) * 100)} % más rápido` : `golpe lento y pesado (+${Math.round((v - 1) * 100)} %)`, crit: v => `${Math.round(v * 100)} % de golpe crítico (doble daño)`, stun: v => `${Math.round(v * 100)} % de aturdir`, bleed: v => `${Math.round(v * 100)} % de hacer sangrar`, kb: () => 'empuja a los enemigos', drain: v => `te cura un ${Math.round(v * 100)} % del daño` };
function weaponX(id, n, c, s, st, core, teeth, tier, d, rpm) {
  const extra = Object.keys(AX_N).filter(k => st[k]).map(k => AX_N[k](st[k]));
  weapon(id, n, c, s, st, [d, extra.join(' · ')].filter(Boolean).join(' ') + (extra.length ? '.' : ''));
  if (st.ranged) ITEMS[id].weapon.ranged = st.ranged;
  if (core) RX(id, core, teeth, rpm || 0, tier);
}
const A2I = MF.iron, A2S = MF.steel, A2B = MF.bronze, A2C = MF.copper;
// ---------- 20 armas básicas (nivel 1, materiales del principio) ----------
const BASIC_W = [
  ['clubWood', 'Garrote', '#8a6238', 'mace', { dmg: 1.3, kb: 1, spd: 1.1 }, 'log', ['stick'], 'Un tronco con mango: empuja al golpear.'],
  ['spearWood', 'Lanza de madera', '#a07a48', 'spear', { dmg: 1.2, reach: 34 }, 'stick', ['stick', 'stone'], 'Mantiene a los lobos a distancia.'],
  ['axeStoneW', 'Hacha de piedra', '#8a8682', 'baxe', { dmg: 1.5, sweep: 28, spd: 1.1 }, 'stick', ['stone', 'stone', 'twine'], 'Corta en abanico.'],
  ['knifeStone', 'Cuchillo de piedra', '#9a9690', 'dagger', { dmg: 1.1, loot: 0.2, spd: 0.8 }, 'stick', ['stone'], 'Rápido, ideal para cazar.'],
  ['swordWood', 'Espada de madera', '#b08a58', 'sword', { dmg: 1.3, spd: 0.95 }, 'stick', ['planks', 'planks'], 'Tu primera espada.'],
  ['swordStone', 'Espada de piedra', '#8a8884', 'sword', { dmg: 1.6 }, 'stick', ['stone', 'stone', 'twine'], 'Pesa, pero corta.'],
  ['maceBone', 'Maza de hueso', '#e8e0c8', 'mace', { dmg: 1.6, stun: 0.15 }, 'stick', ['bone', 'bone'], 'Puede dejar aturdido.'],
  ['spearBone', 'Lanza de hueso', '#ddd4b8', 'spear', { dmg: 1.5, reach: 40, bleed: 0.15 }, 'stick', ['bone', 'twine'], 'Punta afilada que hace sangrar.'],
  ['daggerBone', 'Daga de hueso', '#efe6cc', 'dagger', { dmg: 1.2, crit: 0.15, spd: 0.8 }, 'bone', ['leather'], 'Busca los puntos débiles.'],
  ['staffFight', 'Bastón de combate', '#7a5a34', 'spear', { dmg: 1.2, reach: 26, kb: 1, stun: 0.08 }, 'stick', ['stick', 'stick'], 'Largo y contundente.'],
  ['tridentBone', 'Tridente de pesca', '#c8c0a8', 'spear', { dmg: 1.4, reach: 36, chain: 1 }, 'stick', ['bone', 'bone', 'bone'], 'Ensarta a dos a la vez.'],
  ['sickleStone', 'Hoz de piedra', '#8e8a84', 'scythe', { dmg: 1.3, sweep: 46, loot: 0.1 }, 'stick', ['stone', 'twine'], 'Barre a lo ancho.'],
  ['hammerStone', 'Mazo de piedra', '#7a7672', 'hammer', { dmg: 1.9, stun: 0.2, spd: 1.3 }, 'stick', ['stone', 'stone', 'stone'], 'Lento, pero tumba a cualquiera.'],
  ['fangKnife', 'Cuchillo de colmillo', '#f0e8d0', 'fang', { dmg: 1.3, bleed: 0.25, spd: 0.85 }, 'bone', ['bone', 'leather'], 'Desgarra.'],
  ['bambooSpear', 'Lanza de bambú', '#9ac850', 'spear', { dmg: 1.3, reach: 46 }, 'bamboo', ['bamboo', 'stone'], 'La de más alcance para empezar.'],
  ['cactusClub', 'Porra de cactus', '#4a8a3a', 'mace', { dmg: 1.4, bleed: 0.2 }, 'stick', ['cactus', 'cactus'], 'Con pinchos.'],
  ['shortBow', 'Arco corto', '#8a6a3a', 'bow', { dmg: 1.1, reach: 60 }, 'stick', ['stick', 'twine'], 'Dispara flechas.'],
  ['boomerWood', 'Bumerán tosco', '#a07848', 'boomer', { dmg: 1.2, ranged: { cd: 1, spd: 12, ret: 1, pierce: 1 } }, 'planks', ['stick'], 'Vuelve a tu mano.'],
  ['stoneThrower', 'Tirachinas', '#7a5a3a', 'sling', { dmg: 1.0, ranged: { ammo: 'stone', cd: 0.45, spd: 13 } }, 'stick', ['twine'], 'Dispara piedras del suelo.'],
  ['obsidianShard', 'Daga de obsidiana', '#3a2a40', 'dagger', { dmg: 1.7, crit: 0.25, spd: 0.75 }, 'obsidian', ['stick', 'twine'], 'Afiladísima, pero frágil.'],
];
for (const [id, n, c, s, st, core, teeth, d] of BASIC_W) weaponX(id, n, c, s, st, core, teeth, 0, d);
// ---------- Protección de principiante ----------
const ARM_CAT = ITEMS.leatherChest ? ITEMS.leatherChest.cat : W_CAT;
function armorX(id, n, c, slot, def, warm, core, teeth, d) { IT(id, n, c, 'sheet', ARM_CAT, d); ITEMS[id].armor = { slot, def, warm: warm || 0, heavy: 0, c, set: 'starter' }; RX(id, core, teeth, 0, 0); }
armorX('helmWood', 'Casco de corteza', '#8a6238', 'head', 1, 2, 'planks', ['twine'], 'Protección básica para la cabeza.');
armorX('chestHide', 'Peto de piel', '#9a6a3a', 'chest', 2, 6, 'hide', ['hide', 'twine'], 'Piel sin curtir: abriga y protege un poco.');
armorX('chestBone', 'Coraza de hueso', '#e0d8c0', 'chest', 3, 0, 'bone', ['bone', 'bone', 'bone', 'twine'], 'Huesos atados: aguanta bien los mordiscos.');
armorX('legsHide', 'Grebas de piel', '#8a5a2a', 'legs', 1, 4, 'hide', ['twine'], 'Para las piernas.');
armorX('bootsHide', 'Botas de piel', '#7a4a22', 'feet', 1, 4, 'hide', ['twine'], 'Andar sin cortarte.');
armorX('helmBone', 'Yelmo de cráneo', '#ece4cc', 'head', 2, 0, 'bone', ['bone', 'twine'], 'Da miedo y protege.');
gear('shieldPlank', 'Escudo de tablas', '#a07848', 'shield', 'shield', { def: 1, block: 0.06, mods: {}, look: { shield: '#a07848' } }, 'planks', ['planks', 'twine'], 0, 'El escudo más fácil: 6 % de bloquear un golpe.');
gear('bracersLeather', 'Brazales de cuero', '#8a5a2a', 'sheet', 'hands', { def: 1, mods: { melee: 1.03 }, look: { gloves: '#8a5a2a' } }, 'leather', ['twine'], 0, 'Protegen los antebrazos al pelear.');
// ---------- 32 armas nuevas (cada una distinta) ----------
const NEW_W = [
  ['flail', 'Mangual', '#9aa0a8', 'mace', { dmg: 2.3, sweep: 34, stun: 0.2 }, A2I.rod, ['chainLink', A2I.ingot], 1, 'La bola gira y golpea a todos alrededor.'],
  ['rapier', 'Estoque', '#c8ccd4', 'sword', { dmg: 1.8, reach: 10, crit: 0.3, spd: 0.8 }, A2S.rod, ['bladeHoned', 'gripWrap'], 2, 'Precisión: busca el hueco.'],
  ['halberd', 'Alabarda', '#8a9098', 'spear', { dmg: 2.2, reach: 52, sweep: 30 }, A2I.longRod, ['bladeHoned', A2I.plate], 2, 'Lanza y hacha en una.'],
  ['kukri', 'Kukri', '#a8acb4', 'dagger', { dmg: 1.6, bleed: 0.35, spd: 0.8 }, A2I.rod, ['bladeHoned', 'leather'], 1, 'Hoja curva que hace sangrar.'],
  ['warhammer', 'Martillo de guerra', '#6a6e76', 'hammer', { dmg: 2.8, stun: 0.35, spd: 1.3 }, A2I.longRod, ['hammerHead', 'leather'], 1, 'Aturde de un golpe.'],
  ['greataxe', 'Gran hacha', '#7a8088', 'baxe', { dmg: 2.9, sweep: 52, spd: 1.35 }, A2S.longRod, ['bladeHoned', 'bladeHoned'], 2, 'Abanico enorme, golpe lento.'],
  ['huntSpear', 'Lanza de caza', '#c8843a', 'spear', { dmg: 1.8, reach: 48, loot: 0.3 }, A2B.rod, [A2B.plate, 'feather'], 1, 'Más botín al cazar.'],
  ['trident', 'Tridente', '#c87a4a', 'spear', { dmg: 1.9, reach: 42, chain: 2 }, A2C.rod, [A2C.plate, A2C.plate, A2C.plate], 1, 'Ensarta a tres.'],
  ['scimitar', 'Cimitarra', '#d8a860', 'sword', { dmg: 1.9, sweep: 26, bleed: 0.2 }, A2B.rod, ['bladeHoned', 'gripWrap'], 1, 'Corte curvo y ancho.'],
  ['doubleSickle', 'Hoz doble', '#9aa0a8', 'scythe', { dmg: 1.8, sweep: 60, spd: 0.9 }, A2I.longRod, [A2I.plate, A2I.plate], 1, 'Dos hojas que barren.'],
  ['throwKnife', 'Cuchillos arrojadizos', '#b8bcc4', 'shuriken', { dmg: 1.3, ranged: { ammo: 'throwKnife', cd: 0.3, spd: 17 } }, 'bladeHoned', ['bladeHoned'], 1, 'Se lanzan y se gastan.'],
  ['chakram', 'Chakram', '#d8dce0', 'boomer', { dmg: 2.2, ranged: { cd: 0.8, spd: 15, ret: 1, pierce: 4 } }, A2S.ring, [A2S.plate], 2, 'Aro afilado que vuelve.'],
  ['longbow', 'Arco largo', '#7a5a2a', 'bow', { dmg: 2.0, reach: 110 }, 'planks', ['planks', 'thread', 'thread'], 1, 'Mucho alcance.'],
  ['boneBow', 'Arco de hueso', '#e8e0c8', 'bow', { dmg: 1.7, reach: 84, crit: 0.2 }, 'bone', ['bone', 'thread'], 0, 'Flechas certeras.'],
  ['heavyXbow', 'Ballesta pesada', '#6a6e76', 'xbow', { dmg: 2.8, reach: 92 }, A2S.longRod, [A2S.spring, 'planks', 'thread'], 2, 'Virotes que atraviesan.'],
  ['ironClaw', 'Garra de hierro', '#9aa0a8', 'fang', { dmg: 1.7, bleed: 0.25, spd: 0.7 }, A2I.plate, ['leather', A2I.rod], 1, 'Zarpazos rápidos.'],
  ['spikedMace', 'Maza de púas', '#7a7e86', 'mace', { dmg: 2.4, bleed: 0.25 }, A2I.rod, [A2I.block, 'bone'], 1, 'Golpe y desgarro.'],
  ['smithHammer', 'Martillo de herrero', '#8a8e96', 'hammer', { dmg: 2.2, kb: 1 }, 'planks', ['hammerHead'], 1, 'Manda a volar a quien golpea.'],
  ['warPick', 'Pico de guerra', '#7f8a96', 'hammer', { dmg: 2.3, crit: 0.2 }, A2S.rod, [A2S.plate, 'leather'], 2, 'Atraviesa armaduras.'],
  ['chainWhip', 'Látigo de cadenas', '#8a8e96', 'scythe', { dmg: 1.5, reach: 40, sweep: 44, spd: 0.85 }, 'chainLink', ['chainLink', 'chainLink', 'leather'], 1, 'Alcance largo y en arco.'],
  ['ironStaff', 'Bastón de hierro', '#9aa0a8', 'spear', { dmg: 1.6, reach: 34, kb: 1, stun: 0.1 }, A2I.longRod, [A2I.ring, A2I.ring], 1, 'Empuja y aturde.'],
  ['fireLance', 'Lanza ígnea', '#ff6a2a', 'spear', { dmg: 2.0, reach: 40, el: 'fire' }, A2I.longRod, [A2I.plate, 'coal', 'coal'], 1, 'La punta arde.'],
  ['frostAxe', 'Hacha de escarcha', '#9ad8ff', 'baxe', { dmg: 2.2, sweep: 34, el: 'frost' }, A2I.longRod, ['bladeHoned', 'ice', 'ice'], 1, 'Congela lo que corta.'],
  ['stormMace', 'Maza de tormenta', '#f0e05a', 'mace', { dmg: 2.0, chain: 2, el: 'storm' }, A2C.rod, [A2C.block || A2C.plate, 'magnet'], 2, 'El rayo salta a otros.'],
  ['venomDagger', 'Daga venenosa', '#8ad84a', 'dagger', { dmg: 1.5, el: 'poison', bleed: 0.2 }, 'bladeHoned', ['venom', 'leather'], 1, 'Envenena.'],
  ['chainsaw', 'Sierra de cadena', '#c8843a', 'baxe', { dmg: 2.6, sweep: 30, bleed: 0.3, spd: 0.6 }, 'chainLink', [A2I.gear, A2I.gear, 'bladeHoned'], 2, 'Engranajes y dientes: no para.'],
  ['pneumaticHammer', 'Martillo neumático', '#7a8088', 'hammer', { dmg: 3.0, stun: 0.4, spd: 1.2 }, 'hammerHead', ['piston', A2I.gear], 2, 'Golpe a presión.'],
  ['boltLauncher', 'Lanzapernos de muelle', '#8a9098', 'xbow', { dmg: 2.2, reach: 80, chain: 1 }, A2I.longRod, [A2I.spring, A2I.spring, A2I.gear], 2, 'Dispara dos virotes.'],
  ['steamScythe', 'Guadaña de vapor', '#9aa0a8', 'scythe', { dmg: 2.4, sweep: 70, loot: 0.15 }, A2S.longRod, ['bladeTempered', A2I.gear], 3, 'Siega una media luna.'],
  ['ironKnuckles', 'Nudillos de hierro', '#9aa0a8', 'fang', { dmg: 1.5, spd: 0.6, stun: 0.1 }, A2I.ring, [A2I.ring, A2I.ring], 1, 'Puñetazos rapidísimos.'],
  ['sawSword', 'Espada sierra', '#b8bcc4', 'sword', { dmg: 2.3, bleed: 0.3 }, 'bladeTempered', [A2I.gear, 'gripWrap'], 3, 'Dientes que desgarran.'],
  ['bonecrusher', 'Rompehuesos', '#5a5e66', 'mace', { dmg: 3.2, stun: 0.3, kb: 1, spd: 1.45 }, A2S.longRod, [A2S.block || A2S.plate, 'hammerHead'], 3, 'Lo más pesado que puedes levantar.'],
];
// ---------- 10 espadas nuevas ----------
const NEW_SW = [
  ['machete', 'Machete de selva', '#9aa4b0', 'sword', { dmg: 1.7, sweep: 30, spd: 0.9 }, A2I.rod, ['bladeRough', 'leather'], 1, 'Abre camino y corta en abanico.'],
  ['sabre', 'Sable de caballería', '#c8ccd4', 'sword', { dmg: 2.0, reach: 8, spd: 0.8 }, A2S.rod, ['bladeHoned', 'gripWrap'], 2, 'Rápido y con alcance.'],
  ['katana', 'Katana', '#e0e4ea', 'sword', { dmg: 2.3, crit: 0.25, spd: 0.85 }, 'bladeTempered', ['gripWrap', 'silk'], 3, 'Templada: cortes limpios y críticos.'],
  ['bastardSword', 'Espada bastarda', '#a8acb4', 'sword', { dmg: 2.6, sweep: 30, spd: 1.15 }, 'bladeTempered', ['gripWrap', A2I.plate], 3, 'A una o dos manos.'],
  ['claymore', 'Mandoble', '#9098a0', 'sword', { dmg: 3.1, sweep: 46, kb: 1, spd: 1.4 }, 'bladeTempered', ['bladeTempered', 'gripWrap'], 3, 'Un abanico enorme que empuja.'],
  ['flameSword', 'Espada flamígera', '#ff7a3a', 'sword', { dmg: 2.4, el: 'fire' }, 'bladeTempered', ['coal', 'coal', 'gripWrap'], 3, 'Hoja ondulada que arde.'],
  ['frostSword', 'Espada de escarcha', '#9ad8ff', 'sword', { dmg: 2.4, el: 'frost', stun: 0.1 }, 'bladeTempered', ['ice', 'ice', 'gripWrap'], 3, 'Ralentiza al enemigo.'],
  ['vampSword', 'Espada vampírica', '#8a1a2a', 'sword', { dmg: 2.2, drain: 0.25 }, 'bladeTempered', ['venom', 'bone', 'gripWrap'], 3, 'Se bebe la vida que corta.'],
  ['stormSword', 'Espada de la tormenta', '#f0e05a', 'sword', { dmg: 2.3, chain: 2, el: 'storm' }, 'bladeTempered', ['magnet', A2C.rod, 'gripWrap'], 3, 'El rayo salta de enemigo en enemigo.'],
  ['gladius', 'Gladius', '#c8b090', 'sword', { dmg: 1.9, crit: 0.15, spd: 0.75 }, A2B.rod, ['bladeHoned', 'gripWrap'], 1, 'Corta y rápida.'],
];
// ---------- Piezas que salen de las mesas de trabajo ----------
const PART_CAT = ITEMS[A2I.plate] ? ITEMS[A2I.plate].cat : W_CAT;
const PARTS2 = [
  ['bladeRough', 'Hoja en bruto', '#8a8e96', 'sheet', 'Metal batido con forma de hoja. Se afila en la afiladora.'],
  ['bladeHoned', 'Hoja afilada', '#c8ccd4', 'sheet', 'Lista para montar en un arma.'],
  ['bladeTempered', 'Hoja templada', '#e0e8f0', 'sheet', 'Templada en aceite: más dura y flexible. La mejor hoja.'],
  ['gripWrap', 'Empuñadura forrada', '#6a4a2a', 'rod', 'Mango de madera con cuero: no resbala.'],
  ['chainLink', 'Eslabones', '#9aa0a8', 'ring', 'Para cadenas, manguales y sierras.'],
  ['hammerHead', 'Cabeza de martillo', '#6a6e76', 'block', 'Hierro macizo forjado a golpe de martinete.'],
  ['arrowheads', 'Puntas de flecha', '#9aa0a8', 'nugget', 'Para flechas de hierro.'],
  ['piston', 'Pistón', '#8a9098', 'rod', 'Pieza neumática.'],
];
for (const [id, n, c, s, d] of PARTS2) if (!ITEMS[id]) IT(id, n, c, s, PART_CAT, d);
if (!ITEMS.magnet) IT('magnet', 'Imán', '#c84a4a', 'nugget', PART_CAT, 'Atrae el hierro.');
if (!ITEMS.throwKnife) IT('throwKnife', 'Cuchillo arrojadizo', '#b8bcc4', 'dagger', W_CAT, 'Munición del set de cuchillos arrojadizos.');
// ---------- 12 mesas de trabajo industriales ----------
// [id, nombre, color, símbolo, animación, máquina, receta de la mesa (núcleo, dientes), nivel, impacto, descripción]
const BENCHES = [
  ['bladeForge', 'Forja de hojas', '#8a5a3a', '⚒', 'press', ['@iron.block', '@iron.plate,@iron.plate,stone'], 1, 6, 'Lingotes → hojas en bruto. El martillo baja una y otra vez.'],
  ['benchGrinder', 'Afiladora industrial', '#6a6e76', '◎', 'spin', ['stone', '@iron.gear,@iron.rod'], 1, 4, 'Hoja en bruto → hoja afilada, con chispas.'],
  ['quenchBath', 'Baño de temple', '#3a5a7a', '≈', 'pulse', ['@iron.plate', '@iron.plate,@iron.plate,@iron.ring'], 2, 2, 'Hoja afilada + aceite → hoja templada.'],
  ['gripLathe', 'Torno de empuñaduras', '#7a5a3a', '║', 'spin', ['planks', '@iron.gear,planks'], 1, 3, 'Madera y cuero → empuñaduras forradas.'],
  ['chainMaker', 'Eslabonadora', '#5a5e66', '∞', 'press', ['@iron.plate', '@iron.ring,@iron.gear'], 1, 5, 'Varillas → eslabones de cadena.'],
  ['dropHammer', 'Martinete', '#4a4e56', '▼', 'press', ['@iron.block', '@iron.longRod,@iron.gear,@iron.gear'], 2, 10, 'Bloque de hierro → cabeza de martillo.'],
  ['arrowFactory', 'Fábrica de flechas', '#8a6a3a', '➶', 'spin', ['planks', '@iron.gear,feather'], 1, 3, 'Palos, plumas y puntas → flechas y virotes en cantidad.'],
  ['bowPress', 'Tensadora de arcos', '#6a4a2a', ')', 'press', ['planks', 'planks,@iron.spring'], 1, 4, 'Madera curvada y cuerda → arcos.'],
  ['armorPress', 'Prensa de armaduras', '#6a6e76', '⛨', 'press', ['@iron.block', '@iron.plate,@iron.gear,@iron.gear'], 2, 8, 'Láminas → piezas de armadura de hierro.'],
  ['pneumaticBench', 'Banco neumático', '#5a6a72', '⇵', 'pulse', ['@iron.plate', '@iron.rod,@iron.spring,@iron.gear'], 2, 6, 'Fabrica pistones.'],
  ['weaponAssembler', 'Ensambladora de armas', '#7a6a4a', '⚔', 'spin', ['@steel.plate', '@iron.gear,@iron.gear,@iron.plate'], 2, 6, 'Hojas y empuñaduras → espadas listas.'],
  ['magnetizer', 'Imantadora', '#7a3a3a', 'N', 'glow', ['@copper.plate', '@copper.wire,@iron.rod'], 1, 4, 'Varilla de hierro → imán.'],
];
for (const [id, n, c, g, a, [core, teeth], tier, impact, d] of BENCHES) {
  XB(id, { n, cat: 2, machine: id, kin: 'all', dir: 1, impact, inv: 1, rsable: 1, tier, d: d + ' Necesita giro (ejes o rueda).', look: { c, g, a }, light: a === 'glow' ? 1 : 0 });
  RB(id, 1, core, teeth, 0, tier);
  MACHINE_NAME[id] = n;
}
// Recetas de las mesas
RM('bladeForge', { '@iron.ingot': 2 }, { bladeRough: 1 }, 4);
RM('bladeForge', { '@steel.ingot': 2 }, { bladeRough: 2 }, 4);
RM('bladeForge', { '@bronze.ingot': 2 }, { bladeRough: 1 }, 3);
RM('benchGrinder', { bladeRough: 1 }, { bladeHoned: 1 }, 3);
RM('benchGrinder', { stone: 4 }, { arrowheads: 2 }, 3);
RM('quenchBath', { bladeHoned: 1, vegOil: 1 }, { bladeTempered: 1 }, 5);
RM('quenchBath', { bladeHoned: 2, coal: 1 }, { bladeTempered: 1 }, 6);
RM('gripLathe', { planks: 1, leather: 1 }, { gripWrap: 2 }, 3);
RM('gripLathe', { stick: 2, twine: 1 }, { gripWrap: 1 }, 3);
RM('chainMaker', { '@iron.rod': 1 }, { chainLink: 3 }, 3);
RM('dropHammer', { '@iron.block': 1 }, { hammerHead: 2 }, 6);
RM('arrowFactory', { stick: 2, feather: 1 }, { arrow: 8 }, 3);
RM('arrowFactory', { stick: 2, arrowheads: 1 }, { arrow: 10 }, 3);
RM('arrowFactory', { '@iron.rod': 1, feather: 1 }, { bolt: 8 }, 4);
RM('arrowFactory', { bladeHoned: 1 }, { throwKnife: 6 }, 4);
RM('bowPress', { planks: 2, thread: 2 }, { longbow: 1 }, 6);
RM('bowPress', { bone: 2, thread: 1 }, { boneBow: 1 }, 5);
RM('armorPress', { '@iron.plate': 5 }, { [ITEMS.ironChest ? 'ironChest' : 'shieldIron']: 1 }, 8);
RM('armorPress', { '@iron.plate': 3 }, { [ITEMS.ironHelmet ? 'ironHelmet' : 'shieldIron']: 1 }, 6);
RM('armorPress', { '@iron.plate': 2, leather: 1 }, { shieldIron: 1 }, 6);
RM('pneumaticBench', { '@iron.rod': 1, '@iron.spring': 1 }, { piston: 1 }, 5);
RM('weaponAssembler', { bladeHoned: 1, gripWrap: 1 }, { gladius: 1 }, 6);
RM('weaponAssembler', { bladeTempered: 1, gripWrap: 1 }, { katana: 1 }, 8);
RM('weaponAssembler', { bladeTempered: 2, gripWrap: 1 }, { claymore: 1 }, 10);
RM('weaponAssembler', { bladeRough: 1, leather: 1 }, { machete: 1 }, 5);
RM('magnetizer', { '@iron.rod': 1 }, { magnet: 1 }, 4);
for (const [id, n, c, s, st, core, teeth, tier, d] of [...NEW_W, ...NEW_SW]) weaponX(id, n, c, s, st, core, teeth, tier, d);
// ---------- Más árboles ----------
for (const b of BIOMES) { if (!b || !b.trees || !b.trees.length) continue; for (const t of b.trees) t[1] = Math.min(0.48, t[1] * 1.6 + 0.004); b.treeI = b.trees.map(([k, d]) => [G[k], d]).filter(([g]) => g !== undefined); }
