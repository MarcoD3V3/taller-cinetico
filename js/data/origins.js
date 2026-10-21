'use strict';
// =====================================================================================
//  Más personalización: trasfondo (accesorio visible, efecto y objetos iniciales), físico
//  (edad y estatura, que cambian el sprite) y marcas (tatuajes, cicatrices, joyas… hasta 3).
//  Todo se combina con raza, profesión, personalidad y rasgos.
// =====================================================================================
const BACKGROUNDS = {
  none: { n: 'Sin pasado', i: '❔', d: 'Nadie sabe de dónde vienes. Sin accesorio ni ventaja.', m: {}, acc: null, kit: [] },
  noble: { n: 'Noble caído', i: '👑', d: 'Collar de oro. Los comerciantes te respetan (−10 %).', m: { price: 0.9 }, acc: 'collar', kit: [] },
  sailor: { n: 'Marinero', i: '⚓', d: 'Pañuelo y aro. −15 % de sed.', m: { thirst: 0.85 }, acc: 'bandana', kit: [] },
  hermit: { n: 'Ermitaño', i: '🍄', d: 'Capucha de saco. Las heridas se curan un 15 % antes.', m: { heal: 1.15 }, acc: 'rag', kit: [] },
  gladiator: { n: 'Gladiador', i: '🏛', d: 'Hombrera de bronce. +10 de vida y +5 % cuerpo a cuerpo.', m: { hp: 10, melee: 1.05 }, acc: 'pauldron', kit: [] },
  scholar: { n: 'Erudito', i: '📚', d: 'Monóculo y libro al cinto. +10 % de experiencia.', m: { xp: 1.1 }, acc: 'monocle', kit: [] },
  smith: { n: 'Herrero', i: '🔨', d: 'Delantal de cuero. Fabricar da un 15 % más de experiencia.', m: { xpCraft: 1.15 }, acc: 'apron', kit: [] },
  nomad: { n: 'Nómada', i: '🏜', d: 'Bufanda al viento. +5 % de velocidad y +2 de calor.', m: { speed: 1.05, warm: 2 }, acc: 'scarf', kit: [] },
  exile: { n: 'Exiliado', i: '🥀', d: 'Capa raída. Los enemigos te detectan un 10 % peor.', m: { detect: 0.9 }, acc: 'tatter', kit: [] },
  bandit: { n: 'Bandido', i: '🗡', d: 'Pañuelo sobre la boca. +8 % de suerte.', m: { luck: 0.08 }, acc: 'mask', kit: [] },
  priest: { n: 'Sacerdote', i: '🕯', d: 'Estola blanca. +20 de maná y enfermas un 15 % menos.', m: { mana: 20, sick: 0.85 }, acc: 'stole', kit: [] },
  farmer: { n: 'Granjero', i: '🌾', d: 'Sombrero de paja. −10 % de hambre y talas y recolectas un 8 % más rápido.', m: { hunger: 0.9, wood: 1.08 }, acc: 'straw', kit: [] },
  hunter: { n: 'Cazador', i: '🏹', d: 'Carcaj a la espalda. +12 % al cazar y +8 % a distancia.', m: { hunt: 1.12, ranged: 1.08 }, acc: 'quiver', kit: [] },
  bard: { n: 'Bardo', i: '🎻', d: 'Laúd a la espalda. Tus mascotas tienen +15 % de vida y regateas un 5 %.', m: { petHp: 1.15, price: 0.95 }, acc: 'lute', kit: [] },
  delver: { n: 'Espeleólogo', i: '🔦', d: 'Casco con lámpara. +10 % al picar y ves mejor de noche.', m: { mine: 1.1, night: 1 }, acc: 'headlamp', kit: [] },
};
const AGES = {
  young: { n: 'Joven', i: '🧒', d: '+10 de aguante y aprende un 5 % más rápido; −5 de vida.', m: { stam: 10, xp: 1.05, hp: -5 }, grey: 0 },
  adult: { n: 'Adulto', i: '🧑', d: 'En plena forma: sin cambios.', m: {}, grey: 0 },
  mature: { n: 'Maduro', i: '🧔', d: 'Sienes canosas. +5 % de experiencia al fabricar y regateas un 5 %.', m: { xpCraft: 1.05, price: 0.95 }, grey: 0.3, temples: 1 },
  veteran: { n: 'Veterano', i: '🎖', d: 'Canas y arrugas. Las heridas son un 10 % más leves; −5 de aguante.', m: { wound: 0.9, stam: -5 }, grey: 0.55, wrinkles: 1 },
  elder: { n: 'Anciano', i: '👴', d: 'Pelo blanco y espalda curvada. +20 % de experiencia y +20 de maná; −8 % de velocidad y −10 de aguante.', m: { xp: 1.2, mana: 20, speed: 0.92, stam: -10 }, grey: 0.9, wrinkles: 2, stoop: 1 },
};
const HEIGHTS = {
  short: { n: 'Bajo', i: '⬇', d: 'Más bajo: los enemigos te detectan un 8 % peor.', m: { detect: 0.92 }, dy: 1 },
  medium: { n: 'Mediano', i: '↕', d: 'Altura normal.', m: {}, dy: 0 },
  tall: { n: 'Alto', i: '⬆', d: '+6 % de alcance y +3 % de velocidad.', m: { reach: 1.06, speed: 1.03 }, dy: -1 },
  giant: { n: 'Muy alto', i: '🗼', d: '+10 % de alcance y +10 de vida, pero comes un 10 % más.', m: { reach: 1.1, hp: 10, hunger: 1.1 }, dy: -2 },
};
const MARKS = {
  tribal: { n: 'Tatuaje tribal', i: '🌀', d: '+5 % de daño cuerpo a cuerpo.', m: { melee: 1.05 } },
  runes: { n: 'Runas grabadas', i: '✦', d: 'Runas que brillan en la frente: +15 de maná.', m: { mana: 15 } },
  scar: { n: 'Cicatriz de guerra', i: '⚔', d: 'Una cicatriz que cruza la cara: +5 de vida.', m: { hp: 5 } },
  starmark: { n: 'Marca estelar', i: '✶', d: 'Lunar dorado de nacimiento: +5 % de suerte.', m: { luck: 0.05 } },
  hetero: { n: 'Heterocromía', i: '👁', d: 'Un ojo de cada color: +6 % de alcance al apuntar.', m: { reach: 1.06 } },
  earrings: { n: 'Pendientes de oro', i: '💛', d: 'Los comerciantes te hacen un 4 % de descuento.', m: { price: 0.96 } },
  fangs: { n: 'Collar de colmillos', i: '🦷', d: '+6 % al cazar.', m: { hunt: 1.06 } },
  nosering: { n: 'Aro en la nariz', i: '💍', d: 'Puro estilo: +3 % de experiencia.', m: { xp: 1.03 } },
  warpaint: { n: 'Pintura de batalla', i: '🎨', d: 'Franjas en la cara: +4 % a distancia.', m: { ranged: 1.04 } },
  soot: { n: 'Hollín de fragua', i: '⚫', d: 'Manchas de carbón: +2 de calor.', m: { warm: 2 } },
  veins: { n: 'Venas luminosas', i: '✨', d: 'Brillan en los brazos: el maná se recupera un 8 % más rápido.', m: { manaRegen: 1.08 } },
  armTattoo: { n: 'Brazos tatuados', i: '🐉', d: '+5 % de velocidad de trabajo.', m: { work: 1.05 } },
  bandage: { n: 'Ojo vendado', i: '🩹', d: 'Duro como una roca: el dolor afecta un 8 % menos.', m: { pain: 0.92 } },
  blush: { n: 'Mejillas rosadas', i: '🌸', d: 'Caes bien: −3 % de precios.', m: { price: 0.97 } },
  goldTooth: { n: 'Diente de oro', i: '😁', d: 'Una sonrisa cara: +3 % de suerte.', m: { luck: 0.03 } },
  frostbite: { n: 'Marcas de escarcha', i: '❄', d: 'Superviviente del norte: +3 de calor.', m: { warm: 3 } },
};
const MARKS_MAX = 3;
Object.assign(DEFAULT_LOOK, { bg: 'none', age: 'adult', height: 'medium', marks: [] });
const bgOf = l => BACKGROUNDS[(l && l.bg) || 'none'] || BACKGROUNDS.none;
const ageOf = l => AGES[(l && l.age) || 'adult'] || AGES.adult;
const heightOf = l => HEIGHTS[(l && l.height) || 'medium'] || HEIGHTS.medium;
// Todo lo que el aspecto aporta a los números del juego
function lookMods(l) { const out = [raceOf(l), moodOf(l), bgOf(l), ageOf(l), heightOf(l)]; for (const k of (l && l.marks) || []) if (MARKS[k]) out.push(MARKS[k]); return out; }
const lookSig = l => l ? [l.race, l.mood, l.bg, l.age, l.height, (l.marks || []).join('+')].join('|') : '';
