'use strict';
// =====================================================================================
//  Supervivencia: comida, bebida, curas, cama y abrigo. Los efectos están en sim/survival.js.
//  food: { f: hambre, w: sed, hp: vida, raw: probabilidad de intoxicarse }
//  med: tipo de cura (bandage, splint, disinfect, pain, antidote, kit, mana)
// =====================================================================================
const S_CAT = ICATS.length; ICATS.push('Supervivencia');
IT('dirt', 'Tierra', '#7a5a3a', 'dust', 0, 'Sale al cavar la hierba. Ponla en un hoyo o en el agua para hacer suelo.');
// Comida que ya existía
const FOODS = {
  berries: { f: 8, w: 3 }, meat: { f: 12, raw: 0.25 }, cookedMeat: { f: 32 }, fish: { f: 10, raw: 0.25 }, mushroom: { f: 6, raw: 0.12 },
  coconut: { f: 8, w: 18 }, honeycomb: { f: 16, w: 2 }, cactus: { f: 3, w: 14 }, herbs: { f: 2, hp: 3 }, kelp: { f: 5, w: 2 },
  snow: { w: 6 }, ice: { w: 10 }, petals: { f: 1 },
};
IT('cookedFish', 'Pescado asado', '#d8a070', 'drop', S_CAT, 'Pescado cocinado en el horno.');
IT('stew', 'Guiso', '#a0603a', 'potion', S_CAT, 'Comida completa: quita mucha hambre y algo de sed.');
IT('ration', 'Ración de viaje', '#c8a060', 'block', S_CAT, 'Comida compacta para explorar.');
IT('waterBottle', 'Botella de agua', '#8ac8ff', 'potion', S_CAT, 'Agua limpia. Llena un frasco pulsando F sobre el agua.');
Object.assign(FOODS, { cookedFish: { f: 28 }, stew: { f: 60, w: 12, hp: 5 }, ration: { f: 45, w: 5 }, waterBottle: { w: 45, back: 'vial' } });
for (const id in FOODS) if (ITEMS[id]) ITEMS[id].food = FOODS[id];
RM('furnace', { fish: 1 }, { cookedFish: 1 }, 1.5);
RB('stew', 1, 'cookedMeat', 'mushroom,herbs,cookedFish');
RB('ration', 2, 'cookedMeat', 'berries,herbs');
// Curas
const MEDS = [
  ['bandage', 'Venda', '#f0ece0', 'sheet', 'bandage', 'Para el sangrado y cura el doble de rápido una herida.'],
  ['splint', 'Férula', '#b08a5a', 'lrod', 'splint', 'Inmoviliza una fractura: vuelves a andar casi normal.'],
  ['poultice', 'Cataplasma', '#8ab060', 'drop', 'disinfect', 'Desinfecta una herida infectada o una mordedura.'],
  ['painkiller', 'Infusión calmante', '#c8a0e0', 'potion', 'pain', 'Calma el dolor durante 3 minutos.'],
  ['antidote', 'Antídoto', '#7ae0a0', 'potion', 'antidote', 'Quita el veneno.'],
  ['medkit', 'Botiquín', '#e04848', 'block', 'kit', 'Venda, desinfecta y calma todas las heridas a la vez.'],
  ['potionMana', 'Poción de maná', '#40d0d0', 'potion', 'mana', 'Recupera 60 de maná.'],
];
for (const [id, n, c, s, med, d] of MEDS) { IT(id, n, c, s, S_CAT, d + ' Úsala con F.'); ITEMS[id].med = med; }
RB('bandage', 3, 'cloth', 'thread');
RB('bandage', 1, 'cotton', 'cotton,cotton');
RB('splint', 1, 'planks', 'stick,stick');
RB('poultice', 2, 'herbs', 'herbs,herbs');
RB('painkiller', 1, 'herbs', 'mushroom');
RB('antidote', 1, 'herbs', 'venom');
RB('medkit', 1, 'cloth', 'bandage,poultice,painkiller');
RM('alchemy', { vial: 1, manaDust: 2 }, { potionMana: 1 }, 3, { water: 50 });
// Ropa de abrigo (basta con llevarla en el inventario)
IT('furCoat', 'Abrigo de pelaje', '#c8b090', 'sheet', S_CAT, 'Póntelo (ranura del pecho, en el inventario): aguantas el frío como si hiciera 25 °C más.');
RB('furCoat', 1, 'leather', 'fur,fur,fur');
// Cama: duerme hasta el amanecer y marca dónde reapareces
XB('bed', { n: 'Cama', cat: 3, dir: 1, d: 'F: dormir (recupera la energía y pasa la noche). Reapareces aquí si mueres.', look: { c: '#8a3a3a', g: '▬', a: '' } });
RB('bed', 1, 'planks', 'wool,wool,wool');
ITEMS.holyWater.med = 'holy';
// Hoguera: luz y calor
XB('campfire', { n: 'Hoguera', cat: 3, light: 3, d: 'Da luz y calor: cerca de ella no pasas frío.', look: { c: '#6a3a1a', g: '🔥', a: 'glow' } });
RB('campfire', 1, 'log', 'stick,stone,coal');
// Palos: de tablones (los pide toda herramienta)
if (!RECIPE_FOR.stick) RB('stick', 4, 'planks', '');
if (!RECIPE_FOR.stick) RB('stick', 4, 'planks', 'planks');
if (!RECIPE_FOR.planks) RB('planks', 4, 'log', '');
