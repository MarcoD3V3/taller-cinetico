'use strict';
// =====================================================================================
//  Razas y personalidades. Se combinan libremente con la profesión y los rasgos:
//  «elfo minero triste», «centauro arquitecto vengativo», «forjado herrero alegre»…
//  Cada raza cambia el cuerpo del sprite (orejas, cuernos, colas, alas, patas de caballo…),
//  su paleta de piel y algunos números del juego (m, igual que los rasgos).
//  La personalidad cambia la cara (cejas y boca) y da un pequeño efecto.
// =====================================================================================
// f: rasgos del cuerpo · short: más bajo · skin: paleta propia
const RACES = {
  human: { n: 'Humano', i: '🧑', d: 'Versátiles: +8 % de experiencia en todo.', m: { xp: 1.08 }, skin: ['#f6d7b8', '#e8b98f', '#d79a6b', '#b8784a', '#8a5532', '#5e3a22'], f: {} },
  elf: { n: 'Elfo', i: '🧝', d: '+12 % de alcance, +25 de maná y ven mejor de noche. −10 de vida.', m: { reach: 1.12, mana: 25, night: 1, hp: -10 }, skin: ['#f8e4d0', '#e8c8a0', '#c8a080', '#d8e0f0', '#a8a0c8', '#8a6a58'], f: { ears: 'elf' } },
  dwarf: { n: 'Enano', i: '🧔', d: 'Bajos y duros: +20 % al picar, +15 de vida. −6 % de velocidad.', m: { mine: 1.2, hp: 15, speed: 0.94 }, skin: ['#f0c8a8', '#e0a888', '#c88a68', '#a86a4a', '#7a4a32', '#e8b098'], f: { short: 2 } },
  orc: { n: 'Orco', i: '👹', d: '+18 % de daño cuerpo a cuerpo y +15 de vida. Los comerciantes te cobran un 15 % más.', m: { melee: 1.18, hp: 15, price: 1.15 }, skin: ['#7a9a4a', '#5a7a3a', '#8aa86a', '#6a7a6a', '#4a5a3a', '#9a8a5a'], f: { tusks: 1, ears: 'orc' } },
  centaur: { n: 'Centauro', i: '🐎', d: 'Medio caballo: +18 % de velocidad y +25 de aguante. Trabaja un 5 % más lento.', m: { speed: 1.18, stam: 25, work: 0.95 }, skin: ['#f6d7b8', '#e8b98f', '#d79a6b', '#b8784a', '#8a5532', '#5e3a22'], f: { horse: 1 } },
  felid: { n: 'Felino', i: '🐱', d: 'Ágiles y nocturnos: +6 % de velocidad, impulso un 20 % más barato y visión nocturna. Comen un 10 % más.', m: { speed: 1.06, dash: 0.8, night: 1, hunger: 1.1 }, skin: ['#e8a050', '#c8c0b0', '#3a3230', '#f0ece4', '#b07040', '#8a8a90'], f: { catEars: 1, tail: 'cat', whisk: 1 } },
  lizard: { n: 'Saurio', i: '🦎', d: 'Escamas: la sed baja un 30 % más despacio y te curas un 20 % antes, pero pasas más frío.', m: { thirst: 0.7, heal: 1.2, warm: -3 }, skin: ['#5a9a4a', '#3a8a7a', '#a84a3a', '#c8b070', '#4a6a8a', '#6a5a3a'], f: { snout: 1, tail: 'lizard', scales: 1 } },
  goblin: { n: 'Goblin', i: '👺', d: 'Pequeños y astutos: +10 % de suerte, compras un 15 % más barato y a veces no gastas el núcleo. −10 de vida.', m: { luck: 0.1, price: 0.85, craftKeep: 0.05, hp: -10 }, skin: ['#8ab84a', '#a8c060', '#6a8a3a', '#b8a04a', '#7aa07a', '#9a7a4a'], f: { ears: 'goblin', short: 2 } },
  undead: { n: 'Renacido', i: '💀', d: 'Volvió de la muerte: hambre −40 % y enferma la mitad. Se cura un 30 % más lento.', m: { hunger: 0.6, sick: 0.5, heal: 0.7 }, skin: ['#a8b0a0', '#8a9aa8', '#b8c0a8', '#d8d4c8', '#7a8a7a', '#9a8aa0'], f: { stitches: 1, glow: '#7af0c8' } },
  demon: { n: 'Tiflin', i: '😈', d: 'Sangre infernal: resistes el fuego, +25 de maná y +4 de calor.', m: { fire: 1, mana: 25, warm: 4 }, skin: ['#c84a3a', '#a83a4a', '#8a3a6a', '#5a3a4a', '#d87a5a', '#6a4a8a'], f: { horns: 1, tail: 'demon' } },
  sylph: { n: 'Sílfide', i: '🧚', d: 'Alas de viento: +10 % de velocidad, impulso un 30 % más barato y +30 de maná. −15 de vida.', m: { speed: 1.1, dash: 0.7, mana: 30, hp: -15 }, skin: ['#f0e0f8', '#d8f0e8', '#d0e8ff', '#f8e8d0', '#e8c8e0', '#c8d8b0'], f: { wings: 1, ears: 'elf' } },
  forged: { n: 'Forjado', i: '🤖', d: 'Autómata de los Forjadores: +2 de defensa y hambre a la mitad, pero se cura un 40 % más lento.', m: { def: 2, hunger: 0.5, heal: 0.6, speed: 0.96 }, skin: ['#c89a5a', '#9aa4b0', '#c8784a', '#6a9a8a', '#5a5a64', '#e0c070'], f: { rivets: 1, glow: '#5af0ff' } },
};
// Personalidades: cara (cejas y boca) y un efecto pequeño
const MOODS = {
  calm: { n: 'Sereno', i: '😌', d: 'El maná se recupera un 12 % más rápido.', m: { manaRegen: 1.12 }, face: 'calm' },
  cheerful: { n: 'Alegre', i: '😄', d: '+6 % de experiencia y los comerciantes te hacen un 5 % de descuento.', m: { xp: 1.06, price: 0.95 }, face: 'happy' },
  sad: { n: 'Triste', i: '😢', d: 'La pena se vuelca en el oficio: +20 % de experiencia al fabricar, −4 % de velocidad.', m: { xpCraft: 1.2, speed: 0.96 }, face: 'sad' },
  vengeful: { n: 'Vengativo', i: '😠', d: '+12 % de daño cuerpo a cuerpo y a distancia; los comerciantes desconfían (+10 %).', m: { melee: 1.12, ranged: 1.12, price: 1.1 }, face: 'angry' },
  brave: { n: 'Valiente', i: '🦁', d: 'Las heridas son un 10 % más leves, pero atraes un 10 % más de enemigos.', m: { wound: 0.9, foes: 1.1 }, face: 'brave' },
  shy: { n: 'Tímido', i: '🙈', d: 'Los enemigos te detectan un 20 % peor; −5 % de daño.', m: { detect: 0.8, melee: 0.95 }, face: 'shy' },
  curious: { n: 'Curioso', i: '🧐', d: '+5 % de suerte y +5 % de experiencia.', m: { luck: 0.05, xp: 1.05 }, face: 'curious' },
  grumpy: { n: 'Gruñón', i: '😤', d: 'Trabaja un 6 % más rápido refunfuñando; precios +10 %.', m: { work: 1.06, price: 1.1 }, face: 'grumpy' },
  greedy: { n: 'Codicioso', i: '🤑', d: 'Regatea un 10 % y encuentra un 5 % más de botín.', m: { price: 0.9, luck: 0.05 }, face: 'sly' },
  lazy: { n: 'Perezoso', i: '😴', d: 'Se cansa un 15 % menos, pero trabaja un 5 % más lento.', m: { energy: 0.85, work: 0.95 }, face: 'sleepy' },
  wild: { n: 'Excéntrico', i: '🤪', d: 'Impulso un 15 % más barato; enferma un 10 % más.', m: { dash: 0.85, sick: 1.1 }, face: 'wild' },
  stoic: { n: 'Estoico', i: '🗿', d: 'El dolor afecta un 20 % menos.', m: { pain: 0.8 }, face: 'flat' },
};
// Detalles de la cara y pelaje del centauro
LOOK.face = ['Nada', 'Pecas', 'Cicatriz', 'Parche', 'Gafas', 'Pintura de guerra', 'Lunar', 'Ojeras'];
LOOK.coat = ['#7a4a2a', '#3a2a20', '#e8e0d0', '#8a8a8a', '#c8a050', '#a85a2a', '#1a1614', '#b07850'];
LOOK.hairStyle.push('Trenzas', 'Melena', 'Afro', 'Coleta alta', 'Rapado lateral');
Object.assign(DEFAULT_LOOK, { race: 'human', mood: 'calm', face: 0, coat: 0 });
const raceOf = look => RACES[(look && look.race) || 'human'] || RACES.human;
const moodOf = look => MOODS[(look && look.mood) || 'calm'] || MOODS.calm;
