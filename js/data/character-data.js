'use strict';
// =====================================================================================
//  Personaje: apariencia, profesiones y rasgos (al estilo Project Zomboid) y armaduras.
//  Cada rasgo cambia números reales del juego (ver charMods() en sim/character.js).
//  Coste positivo = gasta puntos · coste negativo = da puntos.
// =====================================================================================
const LOOK = {
  skin: ['#f6d7b8', '#e8b98f', '#d79a6b', '#b8784a', '#8a5532', '#5e3a22', '#c8e0a0', '#a8c8e8'],
  hair: ['#1a1410', '#3a2414', '#6a4422', '#a86a32', '#d8b060', '#f0e0a8', '#c84a2a', '#8a8a90', '#f4f4f4', '#3a5ac8', '#c84a9a', '#4ac87a'],
  eyes: ['#3a2a1a', '#2a5ac8', '#3a8a3a', '#7a7a8a', '#a86a2a', '#8a2ac8'],
  cloth: ['#3a6aa8', '#a83a3a', '#3a8a4a', '#c8a040', '#6a3a8a', '#e8e4dc', '#2a2a30', '#c86a2a', '#4a7a8a', '#8a5a3a', '#d880a8', '#5a6a3a'],
  hairStyle: ['Corto', 'Largo', 'Coleta', 'Puntas', 'Rapado', 'Cresta', 'Moño', 'Rizado', 'Flequillo', 'Calvo'],
  beard: ['Ninguna', 'Bigote', 'Perilla', 'Barba corta', 'Barba larga'],
  body: ['Delgado', 'Normal', 'Corpulento'],
};
const DEFAULT_LOOK = { skin: 1, hair: 1, eyes: 0, hairStyle: 0, beard: 0, body: 1, shirt: 0, pants: 6, shoes: 9 };
// ---------- Rasgos (más de 30) ----------
// m: modificadores que se aplican al juego
const TRAITS = {
  strong: { n: 'Fuerte', i: '💪', c: 4, d: '+20 % de daño cuerpo a cuerpo, +10 % al trabajar y la armadura pesada no te frena.', m: { melee: 1.2, work: 1.1, heavyOk: 1 }, x: ['weak'] },
  athletic: { n: 'Atlético', i: '🏃', c: 4, d: '+25 de aguante y correr cansa un 20 % menos.', m: { stam: 25, sprintCost: 0.8 }, x: ['clumsy'] },
  sturdy: { n: 'Robusto', i: '🛡', c: 4, d: '+20 de vida máxima.', m: { hp: 20 }, x: ['frail'] },
  agile: { n: 'Ágil', i: '🌀', c: 3, d: '+8 % de velocidad y el impulso cuesta un 30 % menos.', m: { speed: 1.08, dash: 0.7 }, x: ['slow'] },
  hawkEye: { n: 'Ojo de halcón', i: '🦅', c: 2, d: '+25 % de alcance para cazar y disparar, y puedes alejar más la cámara.', m: { reach: 1.25, zoomOut: 1 } },
  slowMeta: { n: 'Metabolismo lento', i: '🍃', c: 3, d: 'El hambre baja un 25 % más despacio.', m: { hunger: 0.75 }, x: ['glutton'] },
  camel: { n: 'Poco sediento', i: '🐪', c: 2, d: 'La sed baja un 25 % más despacio.', m: { thirst: 0.75 } },
  thickSkin: { n: 'Piel dura', i: '🦏', c: 4, d: 'Las heridas son un 25 % menos graves.', m: { wound: 0.75 }, x: ['hemo'] },
  fastHealer: { n: 'Curación rápida', i: '✚', c: 3, d: 'Las heridas se curan un 35 % más rápido.', m: { heal: 1.35 } },
  arcane: { n: 'Mente arcana', i: '✦', c: 3, d: '+40 de maná máximo y se recupera un 30 % más rápido.', m: { mana: 40, manaRegen: 1.3 } },
  bornMiner: { n: 'Minero nato', i: '⛏', c: 2, d: 'Picas un 25 % más rápido.', m: { mine: 1.25 } },
  lumberjack: { n: 'Leñador', i: '🪓', c: 2, d: 'Talas un 25 % más rápido.', m: { wood: 1.25 } },
  hunter: { n: 'Cazador', i: '🏹', c: 2, d: 'Cazas un 20 % más rápido y domesticas con más facilidad.', m: { hunt: 1.2, tame: 1.3 } },
  handy: { n: 'Manitas', i: '🔧', c: 2, d: '+10 % de recuperar el núcleo al fabricar y +25 % de experiencia en Ingeniería y Construcción.', m: { craftKeep: 0.1, xpCraft: 1.25 } },
  fastLearner: { n: 'Aprende rápido', i: '📘', c: 4, d: '+30 % de experiencia en todo.', m: { xp: 1.3 }, x: ['slowLearner'] },
  stealthy: { n: 'Sigiloso', i: '👣', c: 3, d: 'Los enemigos te detectan desde un 35 % más cerca.', m: { detect: 0.65 }, x: ['noisy'] },
  coldRes: { n: 'Resistente al frío', i: '❄', c: 2, d: 'Aguantas el frío como si hiciera 12 °C más.', m: { warm: 12 }, x: ['chilly'] },
  ironGut: { n: 'Estómago de hierro', i: '🍖', c: 1, d: 'Nunca te intoxica la comida cruda ni el agua del pantano.', m: { rawSafe: 1 } },
  lucky: { n: 'Afortunado', i: '🍀', c: 3, d: '+10 % de botín doble al picar, cazar y matar enemigos.', m: { luck: 0.1 }, x: ['unlucky'] },
  nightOwl: { n: 'Noctámbulo', i: '🦉', c: 2, d: 'Ves mucho mejor de noche y trabajas igual de bien.', m: { night: 1 }, x: ['nyctophobic'] },
  lightSleeper: { n: 'Sueño reparador', i: '😴', c: 2, d: 'La energía baja un 25 % más despacio.', m: { energy: 0.75 }, x: ['insomniac'] },
  brave: { n: 'Valiente', i: '🦁', c: 2, d: 'El dolor te frena la mitad.', m: { pain: 0.5 } },
  tamer: { n: 'Amigo de los animales', i: '🐾', c: 2, d: 'Domesticas el doble de fácil y tus mascotas tienen +50 % de vida.', m: { tame: 2, petHp: 1.5 } },
  merchantBlood: { n: 'Regateador', i: '🪙', c: 2, d: 'Los comerciantes te cobran un 15 % menos.', m: { price: 0.85 } },
  // Negativos
  weak: { n: 'Débil', i: '🥀', c: -3, d: '-20 % de daño cuerpo a cuerpo y -10 % al trabajar.', m: { melee: 0.8, work: 0.9 } },
  frail: { n: 'Frágil', i: '🩹', c: -4, d: '-20 de vida máxima.', m: { hp: -20 } },
  slow: { n: 'Lento', i: '🐢', c: -3, d: '-8 % de velocidad.', m: { speed: 0.92 } },
  glutton: { n: 'Glotón', i: '🍔', c: -3, d: 'El hambre baja un 35 % más rápido.', m: { hunger: 1.35 } },
  insomniac: { n: 'Insomne', i: '🌙', c: -3, d: 'La energía baja un 30 % más rápido.', m: { energy: 1.3 } },
  hemo: { n: 'Hemofílico', i: '🩸', c: -3, d: 'Sangras un 60 % más.', m: { bleed: 1.6 } },
  clumsy: { n: 'Torpe', i: '🤕', c: -2, d: 'El impulso cuesta un 50 % más y trabajas un 10 % peor.', m: { dash: 1.5, work: 0.9 } },
  nyctophobic: { n: 'Miedo a la oscuridad', i: '👻', c: -2, d: 'De noche trabajas un 15 % peor y te duele más todo.', m: { nightWork: 0.85, pain: 1.3 } },
  slowLearner: { n: 'Aprende despacio', i: '🐌', c: -3, d: '-30 % de experiencia en todo.', m: { xp: 0.7 } },
  sickly: { n: 'Enfermizo', i: '🤒', c: -2, d: 'El veneno y las infecciones te hacen el doble de daño.', m: { sick: 2 } },
  chilly: { n: 'Friolero', i: '🥶', c: -2, d: 'Sientes el frío como si hiciera 10 °C menos.', m: { warm: -10 } },
  noisy: { n: 'Ruidoso', i: '📢', c: -3, d: 'Te detectan desde un 40 % más lejos y aparecen un 20 % más enemigos.', m: { detect: 1.4, foes: 1.2 } },
  unlucky: { n: 'Gafe', i: '🐈‍⬛', c: -2, d: '-10 % de botín doble y los cofres mimo te buscan.', m: { luck: -0.1 } },
  pacifist: { n: 'Pacifista', i: '🕊', c: -3, d: '-25 % de daño con cualquier arma, pero +20 % de experiencia en todo lo demás.', m: { melee: 0.75, ranged: 0.75, xp: 1.2 } },
  thinSkin: { n: 'Piel fina', i: '🫧', c: -3, d: 'Las heridas son un 30 % más graves.', m: { wound: 1.3 }, x: ['thickSkin'] },
};
// ---------- Profesiones ----------
const PROFS = {
  vagabond: { n: 'Vagabundo', i: '🎒', pts: 8, d: 'Sin oficio: empiezas sin ventajas pero con muchos puntos para rasgos.', sk: {}, kit: [] },
  miner: { n: 'Minero', i: '⛏', pts: 0, d: 'Minería 2. Pico de piedra y un farol.', sk: { mining: 2 }, kit: [['stonePick', 1], ['lantern', 1]], free: ['bornMiner'] },
  lumber: { n: 'Leñadora', i: '🪓', pts: 1, d: 'Tala 2, Forma física 1. Hacha de piedra.', sk: { wood: 2, fit: 1 }, kit: [['stoneAxe', 1], ['log', 32]] },
  hunterP: { n: 'Cazador', i: '🏹', pts: 0, d: 'Caza 2, Combate 1. Arco de madera y 32 flechas.', sk: { hunt: 2, combat: 1 }, kit: [['woodBow', 1], ['arrow', 32]] },
  medic: { n: 'Médica', i: '✚', pts: 1, d: 'Supervivencia 3. Botiquín y vendas. Tus curas valen el doble.', sk: { surv: 3 }, kit: [['medkit', 2], ['bandage', 8], ['splint', 2]], med: 1 },
  smith: { n: 'Herrero', i: '⚒', pts: 0, d: 'Ingeniería 2. Lingotes y un yunque.', sk: { craft: 2 }, kit: [['ironIngot', 24], ['anvil', 1]] },
  engineer: { n: 'Ingeniera', i: '⚙', pts: 0, d: 'Ingeniería 1, Construcción 2. Circuitos y engranajes.', sk: { craft: 1, build: 2 }, kit: [['circuit', 4], ['cog', 12], ['redstone', 16]] },
  mage: { n: 'Aprendiz de mago', i: '✦', pts: 1, d: 'Magia 2. Conoces Bola de fuego y llevas pociones de maná.', sk: { magic: 2 }, kit: [['spell_fireball', 1], ['potionMana', 3]] },
  soldier: { n: 'Soldado', i: '⚔', pts: -1, d: 'Combate 3, Forma física 1. Espada de hierro y armadura de cuero.', sk: { combat: 3, fit: 1 }, kit: [['ironSword', 1], ['leatherHelmet', 1], ['leatherChest', 1], ['leatherLegs', 1], ['leatherBoots', 1]] },
  farmer: { n: 'Granjera', i: '🌾', pts: 2, d: 'Recolección 2, Supervivencia 1. Comida y fertilizante.', sk: { gather: 2, surv: 1 }, kit: [['berries', 24], ['fertilizer', 16], ['cookedMeat', 8]] },
  explorer: { n: 'Exploradora', i: '🧭', pts: 1, d: 'Forma física 2, Supervivencia 1. Brújula, catalejo y raciones.', sk: { fit: 2, surv: 1 }, kit: [['compass', 1], ['spyglass', 1], ['ration', 6]] },
  noble: { n: 'Noble', i: '👑', pts: -2, d: 'Sin habilidades, pero empiezas con 150 monedas y los comerciantes te respetan (-10 %).', sk: {}, kit: [['coin', 150]], price: 0.9 },
};
// ---------- Armaduras ----------
// def: defensa total del conjunto · heavy: frena un poco · warm: abrigo · fire: resistencia al fuego
const ARMOR_SLOTS = { head: 'Casco', chest: 'Peto', legs: 'Grebas', feet: 'Botas' };
const ARMOR_SPLIT = { head: 0.2, chest: 0.4, legs: 0.28, feet: 0.12 };
const ARMOR_SETS = [
  ['leather', 'de cuero', '#8a5a2a', 7, 0, 'leather', 0, { warm: 4 }],
  ['bronze', 'de bronce', '#c8843a', 11, 1, MF.bronze.plate, 1],
  ['iron', 'de hierro', '#b8bcc4', 14, 1, MF.iron.plate, 1],
  ['steel', 'de acero', '#7f8a96', 18, 1, MF.steel.plate, 2],
  ['mithril', 'de mithril', '#bfe8ff', 22, 0, MF.mithril.plate, 4, { speed: 0.02 }],
  ['adamantite', 'de adamantita', '#d0405e', 28, 1, MF.adamantite.plate, 5],
  ['dragonsteel', 'dracónica', '#b83a2a', 32, 1, MF.dragonsteel.plate, 6, { fire: 1 }],
  ['voidsteel', 'del vacío', '#3a2a5a', 36, 1, MF.voidsteel.plate, 6],
];
const ARMOR_N = { head: ['Casco', 'Gorro'], chest: ['Peto', 'Chaqueta'], legs: ['Grebas', 'Pantalones'], feet: ['Botas', 'Botas'] };
for (const [mid, adj, c, def, heavy, mat, tier, x] of ARMOR_SETS) {
  for (const sl in ARMOR_SLOTS) {
    const id = mid + { head: 'Helmet', chest: 'Chest', legs: 'Legs', feet: 'Boots' }[sl], soft = mid === 'leather';
    const pd = Math.max(1, Math.round(def * ARMOR_SPLIT[sl]));
    IT(id, `${ARMOR_N[sl][soft ? 1 : 0]} ${adj}`, c, sl === 'head' ? 'helm' : sl === 'chest' ? 'chestA' : sl === 'legs' ? 'legsA' : 'bootsA', C_CAT, `Armadura (${ARMOR_SLOTS[sl].toLowerCase()}): ${pd} de defensa${heavy ? ', pesada' : ''}${x && x.warm ? ', abriga' : ''}${x && x.fire ? ', resiste el fuego' : ''}. Equípala en el inventario (E) o con Shift+clic.`);
    ITEMS[id].armor = { slot: sl, def: pd, heavy, set: mid, c, ...(x || {}) };
    const n = { head: 5, chest: 8, legs: 7, feet: 4 }[sl];
    RX(id, mat, Array.from({ length: Math.min(6, Math.ceil(n / 2)) }, () => mat).concat(sl === 'feet' ? ['leather'] : []).slice(0, 6), 0, tier);
  }
}
// El abrigo de pelaje también se lleva puesto
ITEMS.furCoat.armor = { slot: 'chest', def: 2, warm: 25, c: '#c8b090', set: 'fur' };
// Ropa de tela para cambiar el color de la camiseta en la partida
IT('dye', 'Tinte', '#d880a8', 'potion', C_CAT, 'Úsalo desde la ficha del personaje (C → Apariencia) para cambiar los colores de tu ropa.');
RB('dye', 4, 'petals', 'petals,berries');
