'use strict';
// =====================================================================================
//  Medicina: lesiones nuevas, material de curas y procedimientos.
//  Cada lesión tiene sus PASOS (en orden recomendado); cada paso se cumple con uno de
//  varios PROCEDIMIENTOS, y cada procedimiento es una actividad con las manos (vendar
//  dando vueltas, coser punto a punto, sacar una astilla despacio, recolocar un hueso…),
//  en ui/medgame.js. La lógica (efectos, causas en el mundo) está en sim/medical.js.
// =====================================================================================
// Fabricar sin chocar con recetas existentes: si la combinación ya existe, prueba con otro diente
function RR(out, n, core, teeth, tier = 0) {
  const t = teeth ? teeth.split(',').filter(Boolean) : [];
  for (const extra of ['', 'stick', 'thread', 'herbs', 'cloth', 'paper', 'stone', 'planks', 'salt']) {
    const tt = extra ? t.concat([extra]) : t; if (tt.length > 6) break;
    if (RB(out, n, core, tt.join(','), 0, tier)) return true;
  }
  console.warn('Sin receta para', out); return false;
}
function NI(id, n, c, s, cat, d) { if (ITEMS[id]) console.warn('Objeto repetido', id); IT(id, n, c, s, cat, d); return ITEMS[id]; }
const MED_CAT = ICATS.length; ICATS.push('Medicina');
// ---------- Material de curas ----------
// [id, nombre, color, forma, descripción, núcleo, dientes, cantidad, herramienta (no se gasta)]
const MED_ITEMS = [
  ['tweezers', 'Pinzas', '#c8ccd0', 'hook', 'Para sacar astillas, espinas y aguijones. No se gastan.', MF.iron.nugget, MF.iron.nugget, 1, 1],
  ['sutureKit', 'Hilo y aguja', '#e8e0d0', 'coil', 'Para coser cortes profundos. Se gasta uno por herida.', 'thread', MF.iron.nugget, 2],
  ['gauze', 'Gasa', '#f4f4ee', 'sheet', 'Tela fina y limpia: presionar, cubrir y vendar.', 'cotton', 'cotton,thread', 3],
  ['alcohol', 'Alcohol medicinal', '#e8f0ff', 'potion', 'Desinfecta heridas (escuece).', 'vial', 'berries,berries,salt', 2],
  ['iodine', 'Yodo', '#a0522d', 'potion', 'Desinfectante potente de algas y sal.', 'vial', 'kelp,salt', 2],
  ['saline', 'Suero salino', '#d8eeff', 'potion', 'Agua con sal para lavar heridas y ojos.', 'vial', 'salt,salt', 2],
  ['plaster', 'Tirita', '#e8c8a0', 'sheet', 'Para rasguños, ampollas y cortes pequeños.', 'cloth', 'resin', 4],
  ['elasticBandage', 'Venda elástica', '#e0b890', 'coil', 'Sujeta esguinces y luxaciones.', 'cloth', 'rubber', 2],
  ['sling', 'Cabestrillo', '#c8c0b0', 'sheet', 'Inmoviliza un brazo o una mano.', 'cloth', 'cloth,rope', 1],
  ['coldPack', 'Compresa fría', '#bfe8ff', 'block', 'Baja la hinchazón de golpes, esguinces y picaduras.', 'cloth', 'snow,snow', 2],
  ['warmPack', 'Compresa caliente', '#ffb07a', 'block', 'Calienta poco a poco las zonas congeladas.', 'cloth', 'salt,coal', 2],
  ['burnGel', 'Gel para quemaduras', '#9ae0a0', 'potion', 'Calma quemaduras y piel quemada por el sol.', 'vial', 'cactus,herbs', 2],
  ['sunscreen', 'Protector solar', '#fff0c0', 'potion', 'Úntalo por el cuerpo: 6 minutos sin quemarte al sol.', 'vial', 'clay,coconut', 2],
  ['repellent', 'Repelente de insectos', '#c8e070', 'potion', 'Rocíalo: 6 minutos sin picaduras de mosquito ni garrapatas.', 'vial', 'herbs,resin', 2],
  ['itchCream', 'Crema antipicor', '#f0d8f0', 'potion', 'Para picaduras, sarpullidos y escozor.', 'salve', 'herbs', 2],
  ['arnica', 'Pomada de árnica', '#f0c040', 'potion', 'Para golpes y contusiones.', 'salve', 'petals', 2],
  ['syringe', 'Jeringa', '#e0f0f8', 'rod', 'Para inyectar suero antiveneno. No se gasta.', 'glass', MF.iron.nugget + ',' + MF.iron.nugget, 1, 1],
  ['antivenom', 'Suero antiveneno', '#9af0c0', 'potion', 'Se inyecta con la jeringa: neutraliza el veneno de una mordedura.', 'vial', 'venom,herbs,milk', 1],
  ['massageOil', 'Aceite de masaje', '#f0d890', 'potion', 'Masajes más eficaces para calambres y contracturas.', 'vial', 'coconut,petals', 2],
  ['eyeDrops', 'Colirio', '#c8f0ff', 'potion', 'Limpia el polvo y la ceniza de los ojos.', 'vial', 'herbs,salt', 2],
  ['tourniquet', 'Torniquete', '#8a3a2a', 'coil', 'Corta una hemorragia fuerte en brazo o pierna. Se reutiliza.', 'rope', 'stick', 1, 1],
  ['scalpel', 'Bisturí', '#dfe6ec', 'dagger', 'Para extraer flechas y balas y pinchar ampollas. No se gasta.', MF.iron.plate, 'stick,leather', 1, 1],
  ['cottonSwab', 'Bastoncillos', '#ffffff', 'rod', 'Aplican desinfectante con precisión.', 'stick', 'cotton', 6],
  ['honeyDressing', 'Apósito de miel', '#e8b040', 'sheet', 'Desinfecta y cubre a la vez (la miel es antiséptica).', 'gauze', 'honeycomb', 2],
  ['smellingSalts', 'Sales aromáticas', '#e0e0f0', 'nugget', 'Despejan tras un golpe en la cabeza.', 'salt', 'herbs,petals', 2],
  ['cauterIron', 'Hierro de cauterizar', '#5a5e66', 'rod', 'Cierra una herida al instante quemándola. Duele mucho. No se gasta.', MF.iron.rod, 'leather,coal', 1, 1],
  ['tickRemover', 'Quitagarrapatas', '#9aa0a8', 'hook', 'Gancho para girar y sacar garrapatas enteras. No se gasta.', MF.iron.nugget, 'bone', 1, 1],
];
const MED_TOOL = new Set();
for (const [id, n, c, s, d, core, teeth, k, tool] of MED_ITEMS) { NI(id, n, c, s, MED_CAT, d); ITEMS[id].medItem = 1; if (tool) MED_TOOL.add(id); RR(id, k, core, teeth); }
RR('coldPack', 2, 'cloth', 'ice');
RR('gauze', 2, 'cloth', 'thread,thread');
// Los de siempre también son material médico
for (const id of ['bandage', 'splint', 'poultice', 'painkiller', 'antidote', 'medkit', 'waterBottle']) if (ITEMS[id]) ITEMS[id].medItem = 1;

// ---------- Lesiones nuevas ----------
// (se añaden a WT de sim/survival.js en sim/medical.js; aquí solo los datos)
const WT_NEW = {
  deepCut: { n: 'Corte profundo', i: '⫽', heal: 520, bleed: 0.22, pain: 30, dmg: 16, dirty: 1 },
  splinter: { n: 'Astilla clavada', i: '⌇', heal: 200, bleed: 0, pain: 10, dmg: 3, obj: 1, dirty: 1 },
  thorn: { n: 'Espina clavada', i: '⌃', heal: 180, bleed: 0.01, pain: 12, dmg: 3, obj: 1, dirty: 1 },
  puncture: { n: 'Herida punzante', i: '◦', heal: 360, bleed: 0.12, pain: 24, dmg: 12, obj: 1, dirty: 1 },
  embedded: { n: 'Proyectil incrustado', i: '➶', heal: 480, bleed: 0.15, pain: 38, dmg: 18, obj: 1, dirty: 1 },
  dislocation: { n: 'Luxación', i: '⤧', heal: 600, bleed: 0, pain: 40, dmg: 14, set: 1 },
  sprain: { n: 'Esguince', i: '⥁', heal: 420, bleed: 0, pain: 20, dmg: 8 },
  blister: { n: 'Ampolla', i: '○', heal: 160, bleed: 0, pain: 8, dmg: 2 },
  sunburn: { n: 'Quemadura solar', i: '☀', heal: 260, bleed: 0, pain: 10, dmg: 3 },
  insectBite: { n: 'Picaduras de mosquito', i: '⁘', heal: 150, bleed: 0, pain: 6, dmg: 1 },
  tick: { n: 'Garrapata', i: '✳', heal: 200, bleed: 0, pain: 3, dmg: 1, obj: 1 },
  frostbite: { n: 'Congelación', i: '❄', heal: 520, bleed: 0, pain: 26, dmg: 12 },
  rash: { n: 'Sarpullido', i: '⁙', heal: 220, bleed: 0, pain: 8, dmg: 2 },
  cramp: { n: 'Calambre', i: '≋', heal: 50, bleed: 0, pain: 30, dmg: 2 },
  knot: { n: 'Contractura', i: '⌘', heal: 400, bleed: 0, pain: 14, dmg: 3 },
  concussion: { n: 'Conmoción', i: '✺', heal: 480, bleed: 0, pain: 28, dmg: 10 },
  eyeDust: { n: 'Polvo en los ojos', i: '◉', heal: 120, bleed: 0, pain: 14, dmg: 1 },
};
// ---------- Procedimientos ----------
// mech: tipo de actividad (ui/medgame.js) · use: objetos que se gastan (uno de la lista) · tool: herramienta
// parts: dónde se puede hacer · fx: efecto al terminar
const ALL_P = ['head', 'torso', 'armL', 'armR', 'handL', 'handR', 'legL', 'legR', 'footL', 'footR'];
const LIMB_P = ['armL', 'armR', 'legL', 'legR'], ARM_P = ['armL', 'armR', 'handL', 'handR'], EXT_P = ['armL', 'armR', 'handL', 'handR', 'legL', 'legR', 'footL', 'footR'];
const NOHEAD = ALL_P.filter(p => p !== 'head');
const PROCS = {
  press: { n: 'Presionar la herida', i: '✋', mech: 'hold', parts: ALL_P, use: [], opt: ['gauze'], fx: 'press', how: 'Mantén pulsado sobre la herida sin moverte del círculo hasta que deje de sangrar.' },
  tourniquet: { n: 'Poner un torniquete', i: '⟲', mech: 'twist', parts: LIMB_P, tool: ['tourniquet'], fx: 'tq', how: 'Pulsa y gira alrededor del palo para apretar la cuerda (2 vueltas).' },
  cauterize: { n: 'Cauterizar', i: '🔥', mech: 'hold', hard: 1, parts: NOHEAD, tool: ['cauterIron'], fx: 'caut', how: 'Apoya el hierro caliente en la herida y aguanta sin soltar.' },
  clean: { n: 'Lavar la herida', i: '💧', mech: 'scrub', parts: ALL_P, use: ['saline', 'waterBottle', 'alcohol'], fx: 'clean', how: 'Frota con el botón pulsado sobre cada grano de suciedad hasta quitarlos todos.' },
  washSkin: { n: 'Lavar la piel', i: '🧼', mech: 'rub', parts: ALL_P, use: ['soap', 'saline', 'waterBottle'], fx: 'wash', how: 'Frota de lado a lado sobre la zona irritada.' },
  disinfect: { n: 'Desinfectar', i: '🧴', mech: 'paint', parts: ALL_P, use: ['alcohol', 'iodine', 'poultice'], opt: ['cottonSwab'], fx: 'dis', how: 'Pinta con el botón pulsado toda la herida y su borde.' },
  honeyDress: { n: 'Apósito de miel', i: '🍯', mech: 'place', parts: ALL_P, use: ['honeyDressing'], fx: 'honey', how: 'Arrastra el apósito y suéltalo justo encima de la herida.' },
  stitch: { n: 'Coser', i: '🪡', mech: 'stitch', parts: ALL_P, use: ['sutureKit'], fx: 'stitch', how: 'Haz clic en los puntos en orden, de un lado al otro de la herida.' },
  bandage: { n: 'Vendar', i: '🩹', mech: 'wrap', parts: ALL_P, use: ['bandage', 'gauze'], fx: 'band', how: 'Con el botón pulsado, da vueltas alrededor de la herida (3 vueltas).' },
  plaster: { n: 'Poner una tirita', i: '▭', mech: 'place', parts: ALL_P, use: ['plaster'], fx: 'plast', how: 'Arrastra la tirita hasta la herida.' },
  elastic: { n: 'Venda elástica', i: '➰', mech: 'wrap', turns: 4, parts: EXT_P, use: ['elasticBandage'], fx: 'elastic', how: 'Da 4 vueltas bien ceñidas alrededor de la articulación.' },
  splint: { n: 'Entablillar', i: '🪵', mech: 'place', pieces: 2, parts: EXT_P, use: ['splint'], fx: 'splint', how: 'Coloca las dos tablillas a los lados del hueso.' },
  sling: { n: 'Cabestrillo', i: '◣', mech: 'place', parts: ARM_P, use: ['sling'], fx: 'sling', how: 'Arrastra el cabestrillo bajo el brazo.' },
  extractSplinter: { n: 'Sacar la astilla', i: '⌇', mech: 'pull', parts: ALL_P, tool: ['tweezers', 'scalpel'], fx: 'extract', how: 'Pincha el extremo y tira DESPACIO en su dirección. Si tiras rápido, se parte.' },
  extractThorn: { n: 'Sacar la espina', i: '⌃', mech: 'pull', parts: ALL_P, tool: ['tweezers', 'scalpel'], fx: 'extract', how: 'Pincha la espina y tira despacio hacia fuera.' },
  extractStinger: { n: 'Sacar el aguijón', i: '•', mech: 'pull', short: 1, parts: ALL_P, tool: ['tweezers'], fx: 'extract', how: 'Pincha el aguijón y sácalo con suavidad.' },
  extractArrow: { n: 'Extraer el proyectil', i: '➶', mech: 'pull', long: 1, parts: ALL_P, tool: ['scalpel'], fx: 'extract', how: 'Agarra el astil y tira muy despacio: se tambalea, mantén la línea.' },
  tickRemove: { n: 'Quitar la garrapata', i: '✳', mech: 'twist', parts: ALL_P, tool: ['tickRemover', 'tweezers'], fx: 'extract', how: 'Engánchala y gira despacio (2 vueltas) para que salga entera.' },
  suckVenom: { n: 'Succionar el veneno', i: '👄', mech: 'rhythm', parts: EXT_P, fx: 'suck', how: 'Haz clic cuando el anillo pase por la marca: aspira y escupe 4 veces.' },
  inject: { n: 'Inyectar antiveneno', i: '💉', mech: 'inject', parts: NOHEAD, use: ['antivenom'], tool: ['syringe'], fx: 'inject', how: 'Lleva la jeringa a la vena marcada y mantén el pulso firme mientras entra el suero.' },
  resetBone: { n: 'Colocar el hueso', i: '🦴', mech: 'align', parts: EXT_P.concat(['torso']), fx: 'reset', how: 'Arrastra el extremo del hueso hasta su sitio y suéltalo cuando encaje.' },
  relocate: { n: 'Recolocar la articulación', i: '⤧', mech: 'timing', parts: EXT_P, fx: 'reset', how: 'Mantén pulsado para tirar y suelta cuando la aguja esté en la zona verde (2 veces).' },
  coldPack: { n: 'Compresa fría', i: '🧊', mech: 'hold', parts: ALL_P, use: ['coldPack', 'ice', 'snow'], fx: 'cold', how: 'Mantén la compresa apoyada sin moverla.' },
  warmPack: { n: 'Calentar poco a poco', i: '♨', mech: 'gauge', parts: ALL_P, use: ['warmPack'], fx: 'warm', how: 'Pulsa para dar calor y suelta para enfriar: mantén la aguja en la zona verde.' },
  massage: { n: 'Masajear', i: '👐', mech: 'rub', parts: ALL_P, opt: ['massageOil'], fx: 'massage', how: 'Frota de lado a lado con el botón pulsado sobre el músculo.' },
  stretch: { n: 'Estirar', i: '↔', mech: 'stretch', parts: EXT_P.concat(['torso']), fx: 'stretch', how: 'Arrastra hasta la marca y aguanta ahí unos segundos.' },
  coolBurn: { n: 'Enfriar con agua', i: '🚿', mech: 'pour', parts: ALL_P, use: ['waterBottle', 'saline'], fx: 'cool', how: 'Mantén el chorro de agua sobre la quemadura.' },
  burnGel: { n: 'Gel para quemaduras', i: '🧴', mech: 'paint', parts: ALL_P, use: ['burnGel'], fx: 'gel', how: 'Extiende el gel por toda la zona quemada.' },
  itchCream: { n: 'Crema antipicor', i: '🧴', mech: 'paint', parts: ALL_P, use: ['itchCream'], fx: 'itch', how: 'Extiende la crema sobre las picaduras.' },
  arnica: { n: 'Pomada de árnica', i: '🌼', mech: 'rub', parts: ALL_P, use: ['arnica'], fx: 'arnica', how: 'Extiende la pomada frotando sobre el golpe.' },
  drain: { n: 'Pinchar la ampolla', i: '📍', mech: 'precise', parts: ALL_P, tool: ['scalpel', 'sutureKit'], fx: 'drain', how: 'Pincha justo en el borde de la ampolla (no en el centro).' },
  eyeDrops: { n: 'Echar colirio', i: '💧', mech: 'drops', parts: ['head'], use: ['eyeDrops', 'saline'], fx: 'eye', how: 'Haz clic cuando el ojo esté abierto y la gota encima de la pupila (3 gotas).' },
  smellingSalts: { n: 'Sales aromáticas', i: '✧', mech: 'timing', parts: ['head'], use: ['smellingSalts'], fx: 'salts', how: 'Respira: suelta cuando la aguja llegue a la zona verde.' },
  sunscreen: { n: 'Protector solar', i: '☀', mech: 'paint', big: 1, parts: ALL_P, use: ['sunscreen'], fx: 'sun', prevent: 1, how: 'Úntalo por toda la parte (que no quede nada sin cubrir).' },
  repellent: { n: 'Repelente', i: '🦟', mech: 'spray', parts: ALL_P, use: ['repellent'], fx: 'bugs', prevent: 1, how: 'Haz clic para rociar hasta cubrir todas las marcas.' },
};
// Pasos de cada lesión: cada paso es una lista de procedimientos que lo cumplen
const W_STEPS = {
  scratch: [['clean', 'washSkin'], ['plaster', 'bandage', 'honeyDress']],
  cut: [['press', 'tourniquet', 'cauterize'], ['clean'], ['disinfect', 'honeyDress'], ['bandage', 'plaster', 'honeyDress']],
  deepCut: [['press', 'tourniquet', 'cauterize'], ['clean'], ['disinfect', 'honeyDress'], ['stitch', 'cauterize'], ['bandage', 'honeyDress']],
  bite: [['press', 'tourniquet'], ['clean'], ['disinfect', 'honeyDress'], ['bandage', 'honeyDress']],
  sting: [['extractStinger'], ['itchCream', 'coldPack']],
  burn: [['coolBurn'], ['burnGel'], ['bandage']],
  fracture: [['resetBone'], ['splint'], ['bandage', 'elastic', 'sling']],
  bruise: [['coldPack', 'arnica', 'massage']],
  splinter: [['extractSplinter'], ['disinfect']],
  thorn: [['extractThorn'], ['disinfect']],
  puncture: [['extractArrow', 'extractSplinter'], ['clean'], ['bandage', 'stitch']],
  embedded: [['extractArrow'], ['press', 'cauterize'], ['stitch', 'cauterize'], ['bandage']],
  dislocation: [['relocate'], ['sling', 'elastic'], ['coldPack']],
  sprain: [['coldPack'], ['elastic']],
  blister: [['drain'], ['plaster', 'bandage']],
  sunburn: [['coolBurn', 'burnGel']],
  insectBite: [['itchCream', 'coldPack']],
  tick: [['tickRemove'], ['disinfect']],
  frostbite: [['warmPack'], ['bandage']],
  rash: [['washSkin'], ['itchCream']],
  cramp: [['stretch'], ['massage']],
  knot: [['massage'], ['stretch']],
  concussion: [['coldPack'], ['smellingSalts']],
  eyeDust: [['eyeDrops']],
};
// Las mordeduras venenosas piden primero quitar el veneno
const VENOM_STEP = ['suckVenom', 'inject'];
