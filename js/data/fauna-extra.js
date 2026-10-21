'use strict';
// =====================================================================================
//  20 animales nuevos: botín propio y en qué biomas viven. Las especies se añaden a
//  SPECIES en render/animals.js (SPECIES se define después, en sim/fauna.js).
// =====================================================================================
IT('milk', 'Leche', '#f4f4f0', 'drop', S_CAT, 'Fresca de la vaca. Quita sed y algo de hambre.');
IT('egg', 'Huevo', '#f0e4c8', 'nugget', S_CAT, 'Huevo de gallina o pato. Crudo puede sentar mal: mejor cocinado.');
IT('cookedEgg', 'Huevo frito', '#f8e8a0', 'nugget', S_CAT, 'Huevo cocinado: buena comida.');
IT('rhinoHorn', 'Cuerno de rinoceronte', '#e8e0d0', 'gem', 0, 'Duro como la piedra. Ingrediente raro.');
IT('quills', 'Púas de erizo', '#c8a878', 'rod', 0, 'Puntiagudas: sirven como agujas o puntas de flecha.');
ITEMS.milk.food = { f: 6, w: 14 }; ITEMS.egg.food = { f: 6, raw: 0.15 }; ITEMS.cookedEgg.food = { f: 14, hp: 2 };
RM('furnace', { egg: 1 }, { cookedEgg: 1 }, 2);
R2('arrow', 6, 'quills', 'stick,feather', 0, 0);
// especie: [nombre, color, detalle, tamaño, velocidad, botín, rasgos]
const NEW_SPECIES = {
  giraffe: { n: 'Jirafa', c: '#e0b050', c2: '#7a4a1a', s: 16, v: 2.4, drops: [['hide', 2], ['meat', 2]] },
  zebra: { n: 'Cebra', c: '#f0f0ec', c2: '#1a1a1a', s: 9, v: 3.2, drops: [['hide', 1], ['meat', 1]] },
  lion: { n: 'León', c: '#d8a050', c2: '#7a4a1a', s: 10, v: 3, drops: [['fur', 1], ['meat', 2]] },
  tiger: { n: 'Tigre', c: '#e8842a', c2: '#1a1410', s: 10, v: 3.2, drops: [['fur', 2], ['meat', 1]] },
  bear: { n: 'Oso pardo', c: '#6a4a2e', c2: '#d8c8a8', s: 12, v: 1.8, drops: [['fur', 2], ['meat', 2]] },
  cow: { n: 'Vaca', c: '#f4f0e8', c2: '#2a2420', s: 10, v: 1.2, drops: [['hide', 1], ['meat', 2], ['milk', 1]] },
  pig: { n: 'Cerdo', c: '#f0a8a0', c2: '#d07a7a', s: 7, v: 1.4, drops: [['meat', 2]] },
  chicken: { n: 'Gallina', c: '#f4f0e4', c2: '#e04a2a', s: 4, v: 1.6, drops: [['feather', 1], ['egg', 1]], bird: 1 },
  duck: { n: 'Pato', c: '#6a8a4a', c2: '#f0c040', s: 4, v: 1.6, drops: [['feather', 1], ['egg', 1]], bird: 1 },
  owl: { n: 'Búho', c: '#8a6a4a', c2: '#f0d070', s: 5, v: 2.4, drops: [['feather', 2]], bird: 1, fly: 1 },
  eagle: { n: 'Águila', c: '#5a3a22', c2: '#f4f0e8', s: 7, v: 4, drops: [['feather', 2]], bird: 1, fly: 1 },
  crocodile: { n: 'Cocodrilo', c: '#4a6a3a', c2: '#c8c070', s: 11, v: 1.4, drops: [['scales', 2], ['meat', 1]], swim: 1 },
  hippo: { n: 'Hipopótamo', c: '#8a7a8a', c2: '#e8a8b0', s: 14, v: 1, drops: [['hide', 2], ['meat', 2]], swim: 1 },
  rhino: { n: 'Rinoceronte', c: '#8a8a88', c2: '#e8e0d0', s: 13, v: 1.6, drops: [['rhinoHorn', 1], ['hide', 2]] },
  kangaroo: { n: 'Canguro', c: '#b07a4a', c2: '#e8d0b0', s: 9, v: 3.4, drops: [['hide', 1], ['meat', 1]], hop: 1 },
  koala: { n: 'Koala', c: '#9a9aa0', c2: '#f0f0f0', s: 5, v: 0.8, drops: [['fur', 1]] },
  hedgehog: { n: 'Erizo', c: '#7a5a3a', c2: '#e8d0b0', s: 4, v: 1, drops: [['quills', 2]] },
  otter: { n: 'Nutria', c: '#6a4a2a', c2: '#d8c0a0', s: 5, v: 2.4, drops: [['fur', 1], ['fish', 1]], swim: 1 },
  raccoon: { n: 'Mapache', c: '#8a8a8a', c2: '#1a1a1a', s: 5, v: 2.4, drops: [['fur', 1]] },
  moose: { n: 'Alce', c: '#4a3220', c2: '#c8a878', s: 13, v: 2, drops: [['hide', 2], ['meat', 2]] },
};
// Dónde vive cada uno
const NEW_FAUNA = {
  savanna: [['giraffe', 1], ['zebra', 1.5], ['lion', 0.5], ['rhino', 0.6], ['hippo', 0.4]],
  jungle: [['tiger', 0.6], ['koala', 0.5]], bambooJungle: [['tiger', 0.3]],
  forest: [['bear', 0.5], ['pig', 0.6], ['hedgehog', 0.8], ['raccoon', 0.8]], birchForest: [['hedgehog', 0.6], ['owl', 0.4]],
  darkForest: [['owl', 1], ['raccoon', 0.8], ['bear', 0.4]], taiga: [['bear', 0.6], ['moose', 1], ['otter', 0.5]], snowyTaiga: [['moose', 0.8]],
  plains: [['cow', 1.5], ['pig', 1], ['chicken', 1.5], ['duck', 0.5]], meadow: [['eagle', 0.8], ['cow', 0.6], ['hedgehog', 0.5]],
  hills: [['eagle', 1]], swamp: [['crocodile', 0.8], ['duck', 1.5], ['otter', 0.6]], mangrove: [['crocodile', 1]],
  shrubland: [['kangaroo', 1.5], ['koala', 0.6]], redDesert: [['kangaroo', 0.6]],
};
for (const B of BIOMES) { const add = NEW_FAUNA[B.key]; if (!add) continue; B.fauna = (B.fauna || []).concat(add); B.faunaSum = B.fauna.reduce((s, f) => s + f[1], 0); if (!B.fd) B.fd = 2; }
