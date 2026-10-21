'use strict';
// Lista de los 30 minerales inventados (se carga antes del terreno; objetos y recetas en minerals.js)
const BIOMES_N = { frozenOcean: 'Océano helado', coldOcean: 'Océano frío', ocean: 'Océano', warmOcean: 'Océano cálido', deepOcean: 'Océano profundo', beach: 'Playa', stonyShore: 'Costa rocosa', mangrove: 'Manglar', tundra: 'Tundra', snowyTaiga: 'Taiga nevada', taiga: 'Taiga', iceSpikes: 'Picos de hielo', crystalFields: 'Campos de cristal', plains: 'Llanura', forest: 'Bosque', birchForest: 'Bosque de abedules', darkForest: 'Bosque oscuro', flowerField: 'Campo de flores', cherryGrove: 'Bosque de cerezos', swamp: 'Pantano', bog: 'Turbera', hills: 'Colinas', savanna: 'Sabana', jungle: 'Selva', bambooJungle: 'Bosque de bambú', desert: 'Desierto', redDesert: 'Dunas rojas', badlands: 'Tierras baldías', saltFlats: 'Salar', shrubland: 'Matorral', volcano: 'Volcán', ashWastes: 'Llanuras de ceniza', volcanicIsland: 'Isla volcánica', mushroomIsland: 'Isla de setas', toxicMarsh: 'Pantano tóxico', meadow: 'Pradera alpina' };
const RARITY = { común: { w: 6, c: '#c8c8c8' }, poco_común: { w: 3, c: '#7fd07a' }, raro: { w: 1.5, c: '#5ab0ff' }, legendario: { w: 0.6, c: '#ffb030' } };
const RARITY_N = { común: 'Común', poco_común: 'Poco común', raro: 'Raro', legendario: 'Legendario' };
// [id, mena, refinado, color, motas, rareza, nivel de pico, biomas, talismán, efecto, texto del efecto]
const MINERALS = [
  ['ferrolite', 'Ferrolita', 'Lingote de ferrolita', '#9a7a6a', '#c8a090', 'común', 1, ['hills', 'plains', 'stonyShore'], 'Amuleto de ferrolita', { def: 2 }, '+2 de defensa'],
  ['cuprisa', 'Cuprisa', 'Cristal de cuprisa', '#d88a5a', '#ffb07a', 'común', 1, ['desert', 'badlands', 'redDesert'], 'Brazalete de cuprisa', { hunger: 0.92 }, 'El hambre baja un 8 % más despacio'],
  ['solaris', 'Solaris', 'Gema solar', '#ffd040', '#fff090', 'poco_común', 3, ['desert', 'savanna', 'saltFlats'], 'Ojo solar', { night: 1 }, 'Ves bien de noche'],
  ['glaciria', 'Glaciria', 'Escarcha cristalizada', '#9ad8ff', '#e0f6ff', 'poco_común', 3, ['tundra', 'iceSpikes', 'snowyTaiga'], 'Colgante glacial', { warm: 10 }, 'Aguantas el frío como si hiciera 10 °C más'],
  ['verdinite', 'Verdinita', 'Polvo de verdinita', '#4ab04a', '#8af07a', 'común', 1, ['forest', 'jungle', 'birchForest'], 'Broche de la savia', { heal: 1.15 }, 'Heridas un 15 % más rápidas'],
  ['umbrite', 'Umbrita', 'Esquirla umbría', '#3a2a4a', '#7a5aaa', 'raro', 4, ['darkForest', 'bog'], 'Capa umbría', { detect: 0.8 }, 'Los enemigos te detectan un 20 % más cerca'],
  ['pyrolite', 'Pirolita', 'Núcleo pirolítico', '#e0502a', '#ffa040', 'poco_común', 3, ['volcano', 'ashWastes', 'volcanicIsland'], 'Brasa eterna', { fire: 1, warm: 6 }, 'Resistes el fuego y abriga 6 °C'],
  ['aquarine', 'Aquarina', 'Perla de aquarina', '#3ac8d8', '#b0f8ff', 'poco_común', 2, ['beach', 'mangrove', 'stonyShore'], 'Anillo de las mareas', { thirst: 0.8 }, 'La sed baja un 20 % más despacio'],
  ['tempestite', 'Tempestita', 'Cristal de tormenta', '#c8c84a', '#ffff8a', 'raro', 4, ['hills', 'meadow'], 'Pulsera de tempestad', { speed: 1.06 }, '+6 % de velocidad'],
  ['luminaria', 'Luminaria', 'Polvo luminoso', '#c8fff0', '#ffffff', 'poco_común', 2, ['mushroomIsland', 'crystalFields'], 'Farolillo de luminaria', { night: 1, xp: 1.03 }, 'Ves de noche y +3 % de experiencia'],
  ['sanguinite', 'Sanguinita', 'Gema sanguínea', '#a01a2a', '#ff4a5a', 'raro', 4, ['toxicMarsh', 'badlands'], 'Corazón de sanguinita', { hp: 15 }, '+15 de vida máxima'],
  ['ventite', 'Vientita', 'Fragmento de viento', '#c8e8e8', '#ffffff', 'común', 2, ['plains', 'savanna', 'meadow'], 'Tobillera de viento', { sprintCost: 0.85 }, 'Correr cansa un 15 % menos'],
  ['terranite', 'Terranita', 'Terranita pulida', '#8a6a3a', '#c8a060', 'común', 1, ['hills', 'stonyShore', 'shrubland'], 'Guantes de terranita', { mine: 1.15 }, 'Picas un 15 % más rápido'],
  ['silvanite', 'Silvanita', 'Silvanita tallada', '#3a7a3a', '#6ac86a', 'común', 1, ['forest', 'taiga', 'birchForest'], 'Anillo silvano', { wood: 1.2 }, 'Talas un 20 % más rápido'],
  ['venatite', 'Venatita', 'Colmillo de venatita', '#c8a070', '#f0d0a0', 'poco_común', 2, ['savanna', 'shrubland', 'jungle'], 'Talismán del rastreador', { hunt: 1.15 }, 'Cazas un 15 % más rápido'],
  ['mentalite', 'Mentalita', 'Prisma mental', '#c080ff', '#f0c8ff', 'raro', 4, ['crystalFields', 'mushroomIsland'], 'Diadema mental', { mana: 25, manaRegen: 1.15 }, '+25 de maná y se recupera un 15 % más rápido'],
  ['horaria', 'Horaria', 'Arena horaria', '#e8d8a0', '#fff4c8', 'raro', 4, ['saltFlats', 'desert'], 'Reloj de horaria', { energy: 0.85 }, 'La energía baja un 15 % más despacio'],
  ['fortunite', 'Fortunita', 'Trébol de fortunita', '#3ad86a', '#a0ffb0', 'legendario', 5, ['cherryGrove', 'flowerField'], 'Amuleto de la fortuna verde', { luck: 0.08 }, '+8 % de botín doble'],
  ['bestialite', 'Bestialita', 'Hueso de bestialita', '#a87a4a', '#e8c090', 'poco_común', 2, ['jungle', 'bambooJungle', 'savanna'], 'Silbato de bestialita', { tame: 1.4, petHp: 1.25 }, 'Domesticas un 40 % más fácil y tus mascotas tienen +25 % de vida'],
  ['albite', 'Albita', 'Cristal de albita', '#f0f4ff', '#ffffff', 'poco_común', 3, ['snowyTaiga', 'meadow', 'tundra'], 'Amuleto de albita', { sick: 0.6 }, 'El veneno y las infecciones hacen un 40 % menos de daño'],
  ['coagulite', 'Coagulita', 'Resina de coagulita', '#7a3a2a', '#c86a4a', 'poco_común', 2, ['swamp', 'bog', 'mangrove'], 'Broche coagulante', { bleed: 0.7 }, 'Sangras un 30 % menos'],
  ['petrine', 'Petrina', 'Losa de petrina', '#a8a090', '#d8d0c0', 'común', 1, ['desert', 'redDesert', 'badlands'], 'Escudo de petrina', { wound: 0.88 }, 'Heridas un 12 % menos graves'],
  ['iracite', 'Iracita', 'Gema de la ira', '#d82a1a', '#ff7a4a', 'raro', 4, ['volcanicIsland', 'ashWastes', 'volcano'], 'Brazal de iracita', { melee: 1.12 }, '+12 % de daño cuerpo a cuerpo'],
  ['aerolite', 'Aerolita', 'Núcleo de aerolito', '#6a6a8a', '#c8c8ff', 'raro', 4, ['plains', 'hills', 'desert', 'tundra', 'savanna'], 'Mira de aerolita', { ranged: 1.12, reach: 1.1 }, '+12 % de daño a distancia y +10 % de alcance'],
  ['sabidurite', 'Sabidurita', 'Lente de sabidurita', '#4a6ac8', '#a0c0ff', 'raro', 4, ['darkForest', 'crystalFields'], 'Monóculo del sabio', { xp: 1.1 }, '+10 % de experiencia'],
  ['commercite', 'Comercita', 'Moneda de comercita', '#e0b54c', '#fff0a0', 'poco_común', 2, ['beach', 'plains', 'savanna'], 'Insignia del mercader', { price: 0.93 }, 'Los comerciantes te cobran un 7 % menos'],
  ['nutrite', 'Nutrita', 'Piedra nutritiva', '#8a9a4a', '#c8d880', 'común', 1, ['plains', 'forest', 'meadow'], 'Piedra del ayuno', { hunger: 0.85 }, 'El hambre baja un 15 % más despacio'],
  ['impulsite', 'Impulsita', 'Muelle de impulsita', '#4ac8a8', '#a0ffe0', 'poco_común', 3, ['hills', 'badlands', 'meadow'], 'Muelle del saltador', { dash: 0.75 }, 'El impulso cuesta un 25 % menos'],
  ['vitalite', 'Vitalita', 'Gota de vitalita', '#5ae05a', '#c0ffc0', 'raro', 4, ['jungle', 'cherryGrove', 'bambooJungle'], 'Gota de vida eterna', { stam: 20 }, '+20 de aguante'],
  ['abyssite', 'Abisalita', 'Corazón abisal', '#1a2a5a', '#5a7aff', 'legendario', 5, ['volcano', 'crystalFields', 'toxicMarsh'], 'Corazón del abismo', { def: 4, hp: 10 }, '+4 de defensa y +10 de vida máxima'],
];
