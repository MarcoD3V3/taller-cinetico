'use strict';
// =====================================================================================
//  Automatización por recurso (la lógica está en sim/autofarm.js). Cuanto más valioso es lo
//  que quieres, más cuesta montarlo:
//   · Madera: plantones que crecen en árboles + plantador automático + talador automático.
//   · Cultivos: cosechadora automática (recoge lo maduro de 3×3 y vuelve a sembrar).
//   · Piedra, arena, carbón, cobre…: taladro mecánico (poco giro).
//   · Hierro y menas medias: taladro reforzado (≥32 RPM).
//   · Oro, plata y menas valiosas: perforadora industrial (≥64 RPM + lubricante).
//   · Lo más raro (mithril, adamantita, gemas…): perforadora de núcleo (≥128 RPM + lubricante
//     + brocas que se gastan).
//   · Las vetas se agotan (las valiosas antes) y lo que sale es mena en bruto: hay que
//     triturarla, lavarla y fundirla en las máquinas de siempre.
//   · Todo puede acabar en un almacén central por cintas y embudos.
// =====================================================================================
const AUTO_CAT = ITEMS.planks ? ITEMS.planks.cat : 0;
XB('sapling', { n: 'Plantón', cat: 3, walk: 1, d: 'Plántalo en hierba o tierra (clic derecho): en unos 7 minutos es un árbol (antes con agua cerca). Sale al talar árboles.', look: { c: '#5a9a3a', g: '🌱', a: '' } });
RB('sapling', 1, 'stick', 'herbs,herbs');
IT('drillBit', 'Broca de núcleo', '#c8d0d8', 'cog', AUTO_CAT, 'La gasta la perforadora de núcleo: una cada 12 extracciones.');
RB('drillBit', 2, '@tungsten.rod', '@steel.plate,@steel.gear', 0, 4);
const AUTO_B = [
  ['treeFeller', 'Talador automático', '#7a5a3a', '🪓', 'spin', { minRpm: 16, impact: 6, tier: 1 }, '@iron.plate', '@iron.gear,saw', 'Mira a un árbol: lo tala solo cuando ha crecido y saca los troncos por detrás (≥16 RPM). Junto a un plantador, madera sin fin pero lenta.'],
  ['autoPlanter', 'Plantador automático', '#4a7a3a', '🌱', 'pulse', { impact: 2, tier: 1, fuel: ['sapling'] }, 'planks', '@iron.gear,dirt', 'Planta en la casilla de delante los plantones que le metas (por detrás, con una cinta o a mano).'],
  ['autoHarvester', 'Cosechadora automática', '#8a7a3a', '🌾', 'spin', { minRpm: 16, impact: 4, tier: 1 }, '@iron.plate', '@iron.gear,@iron.gear,@iron.rod', 'Recoge lo maduro en 3×3 delante de ella, vuelve a sembrar y saca la cosecha por detrás (≥16 RPM).'],
  ['drillReinforced', 'Taladro reforzado', '#6a6e76', '⛏', 'spin', { minRpm: 32, impact: 8, tier: 2, place: 'res' }, '@steel.plate', '@steel.gear,@iron.block,drill', 'Sobre la veta. Llega al hierro y menas medias (≥32 RPM). Las vetas se agotan.'],
  ['drillIndustrial', 'Perforadora industrial', '#5a6a72', '⛏', 'spin', { minRpm: 64, impact: 14, tier: 3, place: 'res', fuel: ['lubricant'] }, '@steel.block', '@steel.gear,@steel.gear,piston,drillReinforced', 'Oro, plata y menas valiosas (≥64 RPM). Gasta 1 lubricante cada 8 extracciones.'],
  ['drillCore', 'Perforadora de núcleo', '#3a4a5a', '⛏', 'glow', { minRpm: 128, impact: 24, tier: 5, place: 'res', fuel: ['lubricant', 'drillBit'] }, '@titanium.plate', '@steel.block,gearTrain,circuit,drillIndustrial', 'Cualquier veta, también las más raras (≥128 RPM). Gasta lubricante y brocas de núcleo.'],
];
for (const [id, n, c, g, a, x, core, teeth, d] of AUTO_B) { XB(id, Object.assign({ n, cat: 2, kin: 'all', dir: 1, inv: 1, rsable: 1, d, look: { c, g, a } }, x)); RB(id, 1, core, teeth, 0, x.tier); }
XB('storageHub', { n: 'Almacén central', cat: 3, slots: 108, tier: 1, d: '108 ranuras. Acepta todo lo que le llegue por cintas o embudos: el final de tus cadenas.', look: { c: '#6a5a3a', g: '▦', a: '' } });
RB('storageHub', 1, '@iron.plate', 'chest,chest,@iron.gear', 0, 1);
