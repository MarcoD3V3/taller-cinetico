'use strict';
// =====================================================================================
//  Enfermedades leves y no tan leves (sim/illness.js hace la lógica).
//  sev: 1 leve · 2 moderada · 3 grave. dur: segundos que dura si no haces nada.
//  fx: efectos mientras dura (spd velocidad, wrk fuerza, stam recuperación de aguante,
//      hun/thi/ene hambre, sed y cansancio, hp daño por segundo, pain dolor, temp fiebre)
//  vis: cómo se nota (estornudos, tos, sudor, escalofríos, mareo, picor, vista borrosa…)
//  cure: [objeto, cuánto cura (1 = del todo)] · next: en qué se convierte si la dejas.
// =====================================================================================
const ILL_CAT = MED_CAT;
const ILL_ITEMS = [
  ['coughSyrup', 'Jarabe para la tos', '#a0603a', 'potion', 'Miel y hierbas: alivia tos, garganta y bronquios.', 'vial', 'honeycomb,herbs,sugar', 2],
  ['throatLozenge', 'Caramelo para la garganta', '#e8a040', 'coin', 'Suaviza el dolor de garganta y la tos.', 'sugar', 'honeycomb,herbs', 4],
  ['antihistamine', 'Antialérgico', '#c8e0f0', 'nugget', 'Para alergias, urticaria y fiebre del heno.', 'vial', 'herbs,petals,salt', 2],
  ['antifungal', 'Polvos antifúngicos', '#e8e8d8', 'dust', 'Contra los hongos de los pies.', 'ash', 'herbs,lime', 2],
  ['antibiotic', 'Antibiótico', '#f0f0f4', 'nugget', 'Para infecciones serias: neumonía, otitis, bronquitis.', 'vial', 'mushroom,glowcap,salt', 2],
  ['lotionLice', 'Champú antipiojos', '#9ad0a0', 'potion', 'Acaba con piojos y sarna.', 'soap', 'vinegar,herbs', 2],
  ['nailFile', 'Lima de uñas', '#c8ccd0', 'rod', 'Para cuidar uñas encarnadas. No se gasta.', MF.iron.plate, 'sand', 1],
];
for (const [id, n, c, s, d, core, teeth, k] of ILL_ITEMS) { NI(id, n, c, s, ILL_CAT, d); ITEMS[id].medItem = 1; RR(id, k, mfx(core), mfx(teeth)); }
const ILLS = {
  cold: { n: 'Resfriado', i: '🤧', sev: 1, dur: 300, sym: 'Estornudos y mocos', fx: { stam: 0.85 }, vis: 'sneeze', next: ['flu', 140, 'Sigues mojado y con frío'], cure: [['herbalTea', 0.5], ['honeyWater', 0.35], ['hotMilk', 0.4], ['honeyMilk', 0.4], ['coughSyrup', 0.5]] },
  flu: { n: 'Gripe', i: '🤒', sev: 2, dur: 600, sym: 'Fiebre, dolor de cuerpo y cansancio', fx: { spd: 0.9, wrk: 0.85, ene: 1.6, temp: 1.2, pain: 8 }, vis: 'shiver', next: ['pneumonia', 420, 'No te has cuidado'], cure: [['painkiller', 0.35], ['herbalTea', 0.3], ['boneBroth', 0.3], ['antibiotic', 0.4], ['mushroomSoup', 0.25]] },
  pneumonia: { n: 'Neumonía', i: '🫁', sev: 3, dur: 900, sym: 'Fiebre alta, ahogo y tos fuerte', fx: { spd: 0.75, wrk: 0.7, stam: 0.5, ene: 1.8, temp: 2, hp: 0.08, pain: 15 }, vis: 'cough', cure: [['antibiotic', 0.6], ['coughSyrup', 0.2], ['boneBroth', 0.15]] },
  cough: { n: 'Tos', i: '😷', sev: 1, dur: 280, sym: 'Tos seca: se te oye más', fx: { stam: 0.85 }, vis: 'cough', next: ['bronchitis', 300, 'Sigues respirando polvo o humo'], cure: [['coughSyrup', 0.7], ['throatLozenge', 0.4], ['honeyWater', 0.3], ['honeyMilk', 0.35]] },
  bronchitis: { n: 'Bronquitis', i: '🫁', sev: 2, dur: 600, sym: 'Tos con flemas y pecho cargado', fx: { stam: 0.6, spd: 0.92, pain: 6 }, vis: 'cough', next: ['pneumonia', 500, 'Bronquitis sin tratar'], cure: [['coughSyrup', 0.5], ['antibiotic', 0.5], ['herbalTea', 0.2]] },
  soreThroat: { n: 'Dolor de garganta', i: '🗣', sev: 1, dur: 240, sym: 'Escuece al tragar', fx: { thi: 1.2, pain: 4 }, vis: 'red', cure: [['throatLozenge', 0.6], ['honeyWater', 0.4], ['honeyMilk', 0.4], ['coughSyrup', 0.4]] },
  sinusitis: { n: 'Sinusitis', i: '👃', sev: 1, dur: 360, sym: 'Nariz tapada y presión en la cara', fx: { wrk: 0.92, pain: 6 }, vis: 'sneeze', cure: [['saline', 0.5], ['herbalTea', 0.3], ['painkiller', 0.3]] },
  fever: { n: 'Fiebre', i: '🌡', sev: 2, dur: 300, sym: 'Calor, sudor y escalofríos', fx: { spd: 0.92, thi: 1.5, ene: 1.4, temp: 1.5, pain: 6 }, vis: 'sweat', cure: [['painkiller', 0.5], ['herbalTea', 0.3], ['coldPack', 0.3], ['iceTea', 0.25]] },
  headache: { n: 'Dolor de cabeza', i: '🤕', sev: 1, dur: 180, sym: 'Te cuesta concentrarte', fx: { wrk: 0.9, pain: 6 }, vis: 'dizzy', next: ['migraine', 220, 'Sigues al sol o con sed'], cure: [['painkiller', 0.7], ['herbalTea', 0.3], ['waterBottle', 0.25]] },
  migraine: { n: 'Migraña', i: '💥', sev: 2, dur: 360, sym: 'La luz molesta y todo da vueltas', fx: { wrk: 0.8, spd: 0.9, pain: 14 }, vis: 'blur', cure: [['painkiller', 0.5], ['sleepyTea', 0.4], ['calmIncense', 0.3]] },
  dehydration: { n: 'Deshidratación', i: '🏜', sev: 2, dur: 240, sym: 'Boca seca, mareo y debilidad', fx: { spd: 0.88, wrk: 0.85, stam: 0.7, hp: 0.04 }, vis: 'dizzy', cure: [['isotonic', 0.8], ['coconutWater', 0.6], ['waterBottle', 0.35], ['berryJuice', 0.3]] },
  indigestion: { n: 'Indigestión', i: '🤢', sev: 1, dur: 180, sym: 'Pesadez de estómago', fx: { spd: 0.95, hun: 0.6 }, vis: 'green', cure: [['herbalTea', 0.6], ['mintTea', 0.5]] },
  diarrhea: { n: 'Diarrea', i: '💩', sev: 2, dur: 300, sym: 'Pierdes agua sin parar', fx: { thi: 2.2, stam: 0.8, wrk: 0.9 }, vis: 'green', cure: [['isotonic', 0.6], ['coconutWater', 0.4], ['herbalTea', 0.3], ['antibiotic', 0.4]] },
  foodPoisoning: { n: 'Intoxicación alimentaria', i: '🤮', sev: 2, dur: 360, sym: 'Náuseas, vómitos y fiebre', fx: { spd: 0.85, wrk: 0.8, thi: 1.8, hun: 0.4, hp: 0.05, temp: 0.8 }, vis: 'green', cure: [['antidote', 0.7], ['isotonic', 0.4], ['herbalTea', 0.3]] },
  nausea: { n: 'Mareo', i: '🌀', sev: 1, dur: 120, sym: 'Todo se mueve', fx: { spd: 0.9 }, vis: 'dizzy', cure: [['herbalTea', 0.5], ['mintTea', 0.5], ['spicyShot', 0.4]] },
  gastritis: { n: 'Gastritis', i: '🔥', sev: 1, dur: 300, sym: 'Ardor de estómago', fx: { hun: 0.7, pain: 6 }, vis: 'green', cure: [['milk', 0.4], ['yogurt', 0.4], ['herbalTea', 0.3]] },
  hangover: { n: 'Resaca', i: '🥴', sev: 1, dur: 240, sym: 'Cabeza pesada y sed', fx: { thi: 1.6, wrk: 0.85, pain: 6 }, vis: 'dizzy', cure: [['isotonic', 0.6], ['waterBottle', 0.3], ['painkiller', 0.4], ['boneBroth', 0.4]] },
  toothache: { n: 'Dolor de muelas', i: '🦷', sev: 1, dur: 400, sym: 'Muela picada por tanto dulce', fx: { pain: 10, hun: 0.8 }, vis: 'red', cure: [['painkiller', 0.4], ['herbs', 0.15], ['spicyShot', 0.2]] },
  hayFever: { n: 'Alergia al polen', i: '🌼', sev: 1, dur: 240, sym: 'Estornudos y ojos llorosos', fx: { stam: 0.9 }, vis: 'sneeze', cure: [['antihistamine', 0.9], ['herbalTea', 0.2], ['eyeDrops', 0.3]] },
  hives: { n: 'Urticaria', i: '🔴', sev: 1, dur: 200, sym: 'Ronchas que pican', fx: { pain: 4 }, vis: 'itch', cure: [['antihistamine', 0.8], ['itchCream', 0.5]] },
  conjunctivitis: { n: 'Conjuntivitis', i: '👁', sev: 1, dur: 300, sym: 'Ojos rojos y vista borrosa', fx: { wrk: 0.95 }, vis: 'blur', cure: [['eyeDrops', 0.7], ['saline', 0.4]] },
  stye: { n: 'Orzuelo', i: '👁', sev: 1, dur: 260, sym: 'Bulto en el párpado', fx: { pain: 3 }, vis: 'red', cure: [['warmPack', 0.6], ['eyeDrops', 0.3]] },
  otitis: { n: 'Otitis', i: '👂', sev: 2, dur: 400, sym: 'Dolor de oído y mareo', fx: { pain: 12, spd: 0.94 }, vis: 'dizzy', cure: [['antibiotic', 0.6], ['painkiller', 0.3], ['warmPack', 0.3]] },
  ingrownNail: { n: 'Uñero', i: '🦶', sev: 1, dur: 500, sym: 'Uña clavada: duele al andar', fx: { spd: 0.93, pain: 7 }, vis: 'limp', cure: [['nailFile', 0.6], ['saline', 0.3], ['woolSocks', 0], ['antifungal', 0.2]] },
  athleteFoot: { n: 'Pie de atleta', i: '🍄', sev: 1, dur: 500, sym: 'Hongos y picor entre los dedos', fx: { pain: 3 }, vis: 'itch', cure: [['antifungal', 0.8], ['soap', 0.3]] },
  chilblains: { n: 'Sabañones', i: '🧤', sev: 1, dur: 300, sym: 'Dedos hinchados por el frío', fx: { wrk: 0.92, pain: 5 }, vis: 'red', cure: [['warmPack', 0.6], ['arnica', 0.4], ['hotMilk', 0.2]] },
  lumbago: { n: 'Lumbago', i: '🦴', sev: 2, dur: 420, sym: 'Dolor de espalda al cargar', fx: { wrk: 0.8, spd: 0.94, pain: 10 }, vis: 'limp', cure: [['massageOil', 0.5], ['arnica', 0.4], ['warmPack', 0.4], ['painkiller', 0.3]] },
  stiffNeck: { n: 'Tortícolis', i: '🙇', sev: 1, dur: 200, sym: 'No puedes girar el cuello', fx: { wrk: 0.92, pain: 6 }, vis: 'limp', cure: [['warmPack', 0.6], ['massageOil', 0.5], ['arnica', 0.3]] },
  insomnia: { n: 'Insomnio', i: '🦉', sev: 1, dur: 400, sym: 'No descansas al dormir', fx: { ene: 1.4 }, vis: 'yawn', cure: [['sleepyTea', 0.8], ['herbalTea', 0.3], ['honeyMilk', 0.4], ['calmIncense', 0.4]] },
  exhaustion: { n: 'Agotamiento', i: '😩', sev: 2, dur: 300, sym: 'Sin fuerzas para nada', fx: { spd: 0.85, wrk: 0.75, stam: 0.6 }, vis: 'yawn', cure: [['energyBar', 0.3], ['vigorTonic', 0.5], ['ramen', 0.3], ['isotonic', 0.3]] },
  stress: { n: 'Estrés', i: '😰', sev: 1, dur: 300, sym: 'Nervios: aprendes peor', fx: { xp: 0.85, pain: 4 }, vis: 'sweat', cure: [['calmIncense', 0.7], ['herbalTea', 0.4], ['sleepyTea', 0.4], ['honeyCake', 0.3]] },
  lice: { n: 'Piojos', i: '🪳', sev: 1, dur: 700, sym: 'Te pica la cabeza todo el rato', fx: { wrk: 0.95 }, vis: 'itch', cure: [['lotionLice', 1], ['soap', 0.3]] },
  scabies: { n: 'Sarna', i: '🐛', sev: 2, dur: 800, sym: 'Picor intenso por todo el cuerpo', fx: { wrk: 0.9, pain: 6, ene: 1.2 }, vis: 'itch', cure: [['lotionLice', 0.8], ['itchCream', 0.3], ['soap', 0.2]] },
  altitude: { n: 'Mal de altura', i: '⛰', sev: 1, dur: 200, sym: 'Falta el aire en lo alto', fx: { stam: 0.7, pain: 5 }, vis: 'dizzy', cure: [['coconutWater', 0.3], ['herbalTea', 0.3]] },
};
