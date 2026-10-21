'use strict';
// =====================================================================================
//  Pesca: cañas, cebo, peces por tipo de agua (dulce, mar, cálida, fría, profunda, pantano),
//  basura y tesoros. La lógica (lanzar, picada y minijuego) está en sim/fishing.js.
// =====================================================================================
// Cañas: tier (qué peces alcanza), cast (casillas de lanzamiento), zone (tamaño de la zona del minijuego), speed (picadas)
IT('fishingRod', 'Caña de pescar', '#a07a4a', 'lrod', S_CAT, 'Clic en el agua para lanzar. Cuando el corcho se hunda, clic otra vez y mantén pulsado para acercar el pez a la zona verde. Clic derecho: recoger.');
IT('ironFishingRod', 'Caña de hierro', '#9aa0a8', 'lrod', S_CAT, 'Lanza más lejos, zona más grande y peces de mar abierto.');
IT('masterFishingRod', 'Caña maestra', '#5af0ff', 'lrod', S_CAT, 'Para los peces legendarios del fondo: picadas rápidas y zona enorme.');
ITEMS.fishingRod.rod = { tier: 0, cast: 6, zone: 0, speed: 1 };
ITEMS.ironFishingRod.rod = { tier: 1, cast: 8, zone: 0.06, speed: 1.3 };
ITEMS.masterFishingRod.rod = { tier: 2, cast: 10, zone: 0.12, speed: 1.7 };
R2('fishingRod', 1, 'stick', 'stick,reeds*2', 0, 0);
RB('ironFishingRod', 1, '@iron.longRod', 'rope,@iron.ring', 0, 1);
RB('masterFishingRod', 1, '@titanium.longRod', 'rope,lens,@brass.spring', 0, 3);
IT('bait', 'Cebo', '#c86a5a', 'nugget', S_CAT, 'En el inventario: los peces pican antes y salen más raros. Se gasta uno por captura.');
RB('bait', 4, 'berries', 'mushroom');
RB('bait', 6, 'meat', 'herbs');

// Peces: [id, nombre, color, descripción, comida, crudo (riesgo), dificultad 0..1, pesos por agua, extra]
// Agua: fresh (ríos y lagos), sea (océano), warm (cálida/arrecife), cold (fría), deep (profunda), swamp (pantano)
const FISH_LIST = [
  ['carp', 'Carpa', '#b0904a', 'Común en lagos y pantanos.', 9, 0.25, 0.2, { fresh: 22, swamp: 16 }],
  ['trout', 'Trucha', '#8ab08a', 'Ríos limpios y fríos.', 11, 0.2, 0.3, { fresh: 16, cold: 8 }],
  ['salmon', 'Salmón', '#e8846a', 'Remonta los ríos fríos. Muy nutritivo.', 14, 0.15, 0.45, { fresh: 7, cold: 14 }],
  ['catfish', 'Siluro', '#6a6a5a', 'Bigotudo; sale más de noche.', 13, 0.3, 0.4, { fresh: 5, swamp: 12 }, { night: 2 }],
  ['eel', 'Anguila', '#4a5a3a', 'Resbaladiza: se escapa con facilidad. De noche.', 12, 0.3, 0.65, { swamp: 9, fresh: 3, deep: 5 }, { night: 2 }],
  ['tuna', 'Atún', '#4a6a9a', 'Pez de mar abierto. Necesita caña de hierro.', 18, 0.1, 0.55, { sea: 12, deep: 10, cold: 4 }, { tier: 1 }],
  ['clownfish', 'Pez payaso', '#f08a2a', 'Vive entre los corales cálidos.', 5, 0.2, 0.3, { warm: 16 }],
  ['pufferfish', 'Pez globo', '#e8d070', 'Venenoso crudo. Cocinado es seguro.', 6, 1, 0.5, { warm: 8, sea: 3 }],
  ['swordfish', 'Pez espada', '#6a8ab0', 'Lucha muchísimo. Caña maestra.', 26, 0.1, 0.85, { sea: 3, deep: 6, warm: 3 }, { tier: 2 }],
  ['anglerfish', 'Rape abisal', '#3a3a5a', 'Del fondo oscuro. Solo de noche y con caña maestra.', 20, 0.2, 0.8, { deep: 6 }, { night: 4, tier: 2, nightOnly: 1 }],
  ['crab', 'Cangrejo', '#d05a3a', 'Pinzas y buena carne.', 10, 0.2, 0.35, { sea: 7, warm: 6, cold: 5 }],
  ['shrimp', 'Gamba', '#f0a090', 'Pequeña pero sabrosa.', 5, 0.25, 0.2, { sea: 9, warm: 9, swamp: 4 }],
];
for (const [id, n, c, d, f, raw] of FISH_LIST) {
  IT(id, n, c, 'drop', S_CAT, d); ITEMS[id].food = { f, raw };
  RM('furnace', { [id]: 1 }, { cookedFish: f >= 14 ? 2 : 1 }, 1.5);
}
ITEMS.pufferfish.food.raw = 1;
// Peces con efecto (se usan en vez de comerse)
IT('goldfish', 'Pez dorado', '#ffc83a', 'drop', S_CAT, 'Rarísimo. Úsalo para ganar Fortuna durante 3 minutos.');
IT('glowfish', 'Pez farol', '#7af0ff', 'drop', S_CAT, 'Brilla en la oscuridad. Úsalo: visión nocturna 4 minutos.');
ITEMS.goldfish.use = { buff: 'luck', t: 180 }; ITEMS.glowfish.use = { buff: 'night', t: 240 };
// Basura y tesoros
IT('oldBoot', 'Bota vieja', '#6a5040', 'sheet', 0, 'Alguien la perdió hace mucho. Da cuero si la desmontas en el banco.');
IT('sunkenChest', 'Cofre hundido', '#8a6a3a', 'block', S_CAT, 'Úsalo para abrirlo: monedas, gemas, lingotes o algo raro.');
R2('hide', 1, 'oldBoot', '', 0, 0);

// Tabla de capturas: id → { d (dificultad), w (pesos por agua), tier, night, nightOnly, junk, n }
const FISH_TABLE = {
  fish: { d: 0.15, w: { fresh: 26, sea: 30, cold: 20, warm: 20, swamp: 10, deep: 12 } },
  goldfish: { d: 0.9, w: { fresh: 0.8, swamp: 0.8 } },
  glowfish: { d: 0.7, w: { deep: 2, swamp: 2 }, night: 4 },
  oldBoot: { d: 0, junk: 1, w: { fresh: 4, sea: 3, swamp: 6, cold: 3, warm: 2, deep: 2 } },
  stick: { d: 0, junk: 1, n: 2, w: { fresh: 5, swamp: 5, sea: 2 } },
  kelp: { d: 0, junk: 1, w: { sea: 6, cold: 5, deep: 4 } },
  sunkenChest: { d: 0.6, w: { sea: 1.2, deep: 2, warm: 1, cold: 1 }, tier: 1 },
};
for (const [id, , , , , , d, w, x] of FISH_LIST) FISH_TABLE[id] = Object.assign({ d, w }, x || {});
