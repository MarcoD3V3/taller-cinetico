'use strict';
// =====================================================================================
//  Profundidades: casillas, objetos, criaturas y recetas de las capas bajo el suelo
//  (la lógica está en world/layers.js). Cinco capas hasta la roca madre:
//   1 Cavernas húmedas (−2 a −5) · 2 Grutas de cristal (−6 a −9) · 3 Ciénaga de esporas (−10 a −13)
//   4 Entrañas ígneas (−14 a −17) · 5 Abismo primigenio (−18 a −21, debajo la roca madre)
//  Cada capa tiene su suelo, su roca (más dura cuanto más abajo), sus menas, sus líquidos y sus monstruos.
// =====================================================================================
// ---------- Casillas (al final de la tabla para no romper partidas guardadas) ----------
// Suelos de cada capa: se pisan y se cavan (al cavar 3 veces se abre un pozo hacia la capa de abajo)
TL('CAVEFLOOR', { n: 'Suelo de caverna', c: [84, 80, 74], speck: '#5e5a54', drop: 'gravel', hp: 3, under: 'PIT', mt: 0.45 });
TL('DEEPFLOOR', { n: 'Suelo de pizarra', c: [62, 64, 76], speck: '#8a8ca8', drop: 'deepslate', hp: 3, under: 'PIT', mt: 0.6 });
TL('SPOREFLOOR', { n: 'Suelo de esporas', c: [84, 78, 64], speck: '#c8e050', drop: 'dirt', hp: 3, under: 'PIT', mt: 0.4 });
TL('CINDERFLOOR', { n: 'Escoria', c: [74, 52, 44], speck: '#ff7a3a', drop: 'ash', hp: 3, under: 'PIT', mt: 0.55 });
TL('VOIDFLOOR', { n: 'Suelo abisal', c: [36, 32, 50], speck: '#8a6aff', drop: 'voidstone', hp: 3, under: 'PIT', mt: 0.9 });
TL('LIGHTSHAFT', { n: 'Bajo el pozo', c: [104, 98, 86], speck: '#d8ccb0', drop: 'gravel', hp: 3, under: 'PIT', mt: 0.45, light: 2 });
// Roca de cada capa (muro): se pica y deja el suelo de la capa
TL('CAVESTONE', { n: 'Roca de caverna', c: [96, 92, 86], drop: 'stone', rock: 1, hp: 2, under: 'CAVEFLOOR', mt: 0.6 });
TL('DEEPSLATE', { n: 'Pizarra profunda', c: [72, 74, 90], drop: 'deepslate', rock: 1, hp: 2, under: 'DEEPFLOOR', mt: 0.8, band: 1 });
TL('ROTSTONE', { n: 'Roca podrida', c: [82, 88, 62], drop: 'stone', rock: 1, hp: 2, under: 'SPOREFLOOR', mt: 0.85, extra: ['venom', 0.08] });
TL('HELLSTONE', { n: 'Roca ígnea', c: [92, 44, 34], drop: 'basalt', rock: 1, hp: 2, under: 'CINDERFLOOR', mt: 1, speck: '#ff8a3a', extra: ['sulfur', 0.15], light: 1 });
TL('VOIDSTONE', { n: 'Piedra del vacío', c: [44, 36, 62], drop: 'voidstone', rock: 1, hp: 3, under: 'VOIDFLOOR', mt: 1.25, extra: ['voidShard', 0.04] });
// El pozo: un agujero hacia la capa de abajo (se salta dentro para bajar) y el fondo de todo
TL('SHAFT', { n: 'Pozo', c: [16, 14, 14], hole: 1, shaft: 1 });
TL('BEDROCK', { n: 'Roca madre', c: [34, 34, 38], speck: '#55555c', bedrock: 1 });
// Plantas y detalles de las cuevas
TL('GLOWLICHEN', { n: 'Liquen luminoso', under: 'CAVEFLOOR', hp: 1, drop: 'glowLichen', plant: { s: 'bush', c: '#7af0c8' }, light: 1 });
TL('STALAGMITE', { n: 'Estalagmita', under: 'CAVEFLOOR', hp: 2, drop: 'stone', plant: { s: 'spike' } });
TL('TOXICVENT', { n: 'Grieta tóxica', under: 'SPOREFLOOR', drop: 'venom', vent2: 1, light: 1, toxic: 1 });
// Banderas que biomes.js calcula para las casillas anteriores
for (const k of ['CAVEFLOOR', 'DEEPFLOOR', 'SPOREFLOOR', 'CINDERFLOOR', 'VOIDFLOOR', 'LIGHTSHAFT', 'CAVESTONE', 'DEEPSLATE', 'ROTSTONE', 'HELLSTONE', 'VOIDSTONE', 'SHAFT', 'BEDROCK', 'GLOWLICHEN', 'STALAGMITE', 'TOXICVENT']) {
  const t = GI[G[k]]; t.u = t.under ? G[t.under] : -1; if (!t.c) t.c = GI[t.u].c; t.flora = !!(t.tree || t.plant);
  t.solid = !!(t.rock && !t.liquid) || k === 'STALAGMITE';
}
// El hoyo ya no es el final: al picar su fondo se abre un pozo hacia la capa de abajo
Object.assign(GI[G.PIT], { drop: 'stone', hp: 1, under: 'SHAFT', u: G.SHAFT, mt: 0.8 });
// Herramienta necesaria: cuanto más abajo, más dura la roca
const DEPTH_NEED = { CAVEFLOOR: 1, LIGHTSHAFT: 1, CAVESTONE: 1, PIT: 1, STALAGMITE: 1, DEEPFLOOR: 2, DEEPSLATE: 2, ROTSTONE: 3, CINDERFLOOR: 3, HELLSTONE: 4, VOIDFLOOR: 5, VOIDSTONE: 6 };
for (const k in DEPTH_NEED) GI[G[k]].need = { k: 'pick', lv: DEPTH_NEED[k] };
GI[G.SPOREFLOOR].need = { k: 'shovel', lv: 1 };

// ---------- Objetos ----------
NI('deepslate', 'Pizarra profunda', '#5a5c70', 'rock', 0, 'Roca oscura y densa de las Grutas de cristal. Sirve de suelo resistente.');
NI('voidstone', 'Piedra del vacío', '#3a2e52', 'rock', 0, 'Roca del Abismo primigenio: casi no refleja la luz. Sirve de suelo.');
NI('glowLichen', 'Liquen luminoso', '#7af0c8', 'herb', 3, 'Brilla en la oscuridad de las cavernas. Con él se hacen faroles que no gastan nada.');
NI('magmaCore', 'Núcleo de magma', '#ff6a1a', 'drop', 8, 'El corazón de una babosa de magma. Arde muchísimo tiempo como combustible y protege del fuego.');
NI('voidShard', 'Esquirla del vacío', '#8a6aff', 'gem', 8, 'Un pedazo del Abismo. Late débilmente: permite ver en la oscuridad más profunda.');
GROUND_PLACE.deepslate = 'DEEPFLOOR'; GROUND_PLACE.voidstone = 'VOIDFLOOR';
if (typeof FUEL !== 'undefined') FUEL.magmaCore = 480;
for (const k in BD) { const d = BD[k]; if (Array.isArray(d.fuel) && !d.fuel.includes('magmaCore')) d.fuel.push('magmaCore'); }
// Pócima ignífuga: aguantar el calor de las Entrañas ígneas
NI('fireproofPotion', 'Pócima ignífuga', '#ff9a3a', 'potion', 12, 'Durante 5 min la lava cercana y el calor de las profundidades no te queman. Bébela con F.');
ITEMS.fireproofPotion.use = { buff: 'fireproof', t: 300 };
RR('fireproofPotion', 1, 'waterBottle', 'fireblossom,sulfur');
// Equipo para sobrevivir abajo
gear('filterMask', 'Máscara de filtro', '#6a7a6a', 'sheet', 'acc', { prot: { spores: 1 }, look: {} }, 'cloth', ['cloth', 'coal', 'herbs'], 1, 'Filtra las esporas tóxicas de la Ciénaga de esporas (capa 3).');
gear('cloakEmber', 'Capa ignífuga', '#c8642a', 'sheet', 'back', { prot: { heat: 1 }, mods: { fire: 1 }, look: { cape: '#c8642a' } }, 'magmaCore', ['leather', 'obsidian'], 4, 'El calor de las Entrañas ígneas (capa 4) no te agota y la lava cercana no te quema.');
gear('abyssCharm', 'Amuleto abisal', '#8a6aff', 'gem', 'acc', { prot: { abyss: 1 }, mods: { night: 1 } }, 'voidShard', ['voidShard', 'goldIngot'], 5, 'El Abismo primigenio (capa 5) no te roba las fuerzas y ves mejor a oscuras.');
// Bloques: escalera para subir y bajar entre capas y farol que no gasta
XB('ladder', { n: 'Escalera de mano', cat: HOUSE_CAT, walk: 1, look: { c: '#9a7448', g: '☰' }, d: 'Bajo tierra: ponla en el suelo y úsala (clic derecho) para abrir un hueco en el techo y subir a la capa de arriba. Sobre un pozo: úsala para bajar sin caerte.' });
RR('ladder', 2, 'planks', 'stick,stick,stick,rope');
XB('lichenLamp', { n: 'Farol de liquen', cat: HOUSE_CAT, light: 5, look: { c: '#7af0c8', g: '✺', a: 'glow' }, d: 'Ilumina sin combustible. Bajo tierra, los monstruos no aparecen cerca de la luz.' });
RR('lichenLamp', 1, 'glass', 'glowLichen,glowLichen,stick');

// ---------- Criaturas de las profundidades (solo aparecen bajo tierra) ----------
function caveFoe(key, n, shape, c, c2, s, hp, dmg, v, wound, ai, x = {}) {
  ENEMIES[key] = { n, shape, c, c2, s, hp, dmg, v, wound, ai, el: x.el || null, elite: false, bio: [], tier: x.tier || 0, night: false, undead: !!x.undead, phase: !!x.phase, venom: !!x.venom, drain: !!x.drain, split: !!x.split, regen: x.regen || 0, blink: !!x.blink,
    glow: !!x.glow, proj: x.proj || null, summon: x.summon || null, drops: x.drops || [], xp: Math.round(4 + hp / 8), cave: 1 };
}
caveFoe('cavebat', 'Murciélago de cueva', 'fly', '#4a3a3a', '#c8a0a0', 5, 12, 3, 4.2, 'bite', 'melee', { drain: 1, drops: [['batWing', 1, 0.5]] });
caveFoe('mudcrawler', 'Reptador del barro', 'bug', '#6a5038', '#3a2a1a', 8, 26, 6, 2, 'bite', 'melee', { drops: [['chitin', 1, 0.6], ['clay', 2, 0.5]] });
caveFoe('crystalSpider', 'Araña de cristal', 'bug', '#a890ff', '#e8e0ff', 9, 40, 8, 3, 'sting', 'melee', { glow: 1, venom: 1, tier: 1, drops: [['silk', 2, 0.7], ['crystal', 1, 0.5]] });
caveFoe('gemGolem', 'Gólem de geoda', 'golem', '#6a5a8a', '#c8a0ff', 15, 200, 20, 1, 'fracture', 'melee', { tier: 2, drops: [['quartz', 3, 1], ['amethystGem', 1, 0.35], ['stone', 4, 1]] });
caveFoe('sporeling', 'Esporoso', 'blob', '#9ab040', '#e8ff90', 8, 34, 24, 2.4, 'sting', 'exploder', { venom: 1, el: 'poison', tier: 2, drops: [['glowcap', 1, 0.6], ['venom', 1, 0.5]] });
caveFoe('acidWorm', 'Gusano ácido', 'bug', '#7ac83a', '#d8ff70', 10, 70, 10, 2, 'burn', 'ranged', { venom: 1, el: 'poison', tier: 2, proj: { c: '#b8f040', spd: 10, dmg: 11 }, drops: [['venom', 2, 0.7], ['slimeGel', 1, 0.5]] });
caveFoe('magmaSlug', 'Babosa de magma', 'blob', '#c84a1a', '#ffd060', 10, 90, 14, 1.4, 'burn', 'melee', { el: 'fire', glow: 1, tier: 3, drops: [['magmaCore', 1, 0.45], ['sulfur', 2, 0.7]] });
caveFoe('cinderFiend', 'Demonio de ceniza', 'hum', '#5a3a30', '#ff7a2a', 13, 150, 18, 2.2, 'burn', 'caster', { el: 'fire', glow: 1, tier: 4, proj: { c: '#ff7a2a', spd: 11, dmg: 16 }, drops: [['magmaCore', 1, 0.6], ['essenceFire', 1, 0.3], ['coin', 5, 0.8]] });
caveFoe('voidStalker', 'Acechador del vacío', 'ghost', '#2a1a4a', '#a080ff', 12, 170, 22, 2.8, 'cut', 'melee', { phase: 1, blink: 1, el: 'void', tier: 5, drops: [['voidShard', 1, 0.6], ['shadowEssence', 1, 0.6]] });
caveFoe('abyssHorror', 'Horror abisal', 'quad', '#1a1028', '#ff3a6a', 18, 420, 34, 2.4, 'fracture', 'charger', { regen: 3, tier: 6, drops: [['voidShard', 2, 1], ['coin', 20, 1]] });
