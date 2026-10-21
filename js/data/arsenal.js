'use strict';
// =====================================================================================
//  Arsenal y rarezas.
//   · 40 armas nuevas: 8 tipos (katana, estoque, alabarda, mangual, martillo de guerra,
//     tridente, garras y guja) × 5 metales (bronce, hierro, acero, mithril, adamantita).
//     Cada tipo tiene su carácter: alcance, golpe en área, botín, cadena…
//   · 30 objetos raros hechos con los materiales raros de las plantas raras (farming.js)
//     y la semilla antigua: amuletos, anillos y accesorios con efectos, pociones raras y
//     reliquias. Los 10 materiales raros (9 de plantas + semilla antigua) completan los 40.
// =====================================================================================
const WK2 = {
  katana: { n: 'Katana', s: 'sword', dmg: 1.75, loot: 0.1, f: F => [F.rod, [F.plate, F.plate, 'cloth']], d: 'Hoja curva, corte limpio.' },
  rapier: { n: 'Estoque', s: 'sword', dmg: 1.35, reach: 24, loot: 0.15, f: F => [F.rod, [F.plate, F.ring]], d: 'Ligero y largo: estocadas a distancia.' },
  halberd: { n: 'Alabarda', s: 'baxe', dmg: 1.8, reach: 44, sweep: 36, f: F => [F.longRod, [F.plate, F.plate]], d: 'Hacha en un asta: alcance y barrido.' },
  flail: { n: 'Mangual', s: 'mace', dmg: 2.0, sweep: 30, f: F => [F.rod, [F.block, F.ring, F.ring]], d: 'Bola con cadena: gira y golpea a varios.' },
  warhammer: { n: 'Martillo de guerra', s: 'hammer', dmg: 2.4, f: F => [F.longRod, [F.block, F.block]], d: 'Lento y demoledor.' },
  trident: { n: 'Tridente', s: 'spear', dmg: 1.55, reach: 48, chain: 1, f: F => [F.longRod, [F.rod, F.rod, F.rod]], d: 'Tres puntas: alcanza a una presa más.' },
  claws: { n: 'Garras', s: 'fang', dmg: 1.3, loot: 0.35, f: F => [F.ring, [F.plate, 'leather']], d: 'Para cazar: mucho botín.' },
  glaive: { n: 'Guja', s: 'scythe', dmg: 1.7, reach: 36, sweep: 44, f: F => [F.longRod, [F.plate, F.plate, F.ring]], d: 'Cuchilla larga en un asta.' },
};
const WMAT2 = { bronze: {}, iron: {}, steel: {}, mithril: { reach: 12, mul: 1.15 }, adamantite: { mul: 1.25 } };
for (const mid in WMAT2) {
  const m = MAT_BY[mid], F = MF[mid], x = WMAT2[mid]; if (!m || !F) continue;
  for (const k in WK2) {
    const w = WK2[k], id = mid + cap(k); if (ITEMS[id]) continue;
    const st = { dmg: w.dmg * (1 + m.h * 0.3) * (x.mul || 1), reach: (w.reach || 0) + (x.reach || 0), loot: (w.loot || 0) + (x.loot || 0), sweep: w.sweep || 0, chain: w.chain || 0, el: null };
    const [core, teeth] = w.f(F); weapon(id, `${w.n} de ${m.n}`, m.c, w.s, st, w.d); RX(id, core, teeth, 0, MAT_T[mid] ?? 3);
  }
}
// ---------- Objetos raros (30) ----------
const R_CAT = ICATS.length; ICATS.push('Rarezas');
// Accesorios y joyas: [id, nombre, color, forma, ranura, efectos, núcleo, dientes, descripción]
const RARE_GEAR = [
  ['cloverCharm', 'Amuleto del trébol', '#4ac85a', 'amulet', 'acc', { mods: { luck: 0.15 } }, 'luckyClover', ['@gold.wire', 'luckyClover'], 'Suerte: más botín y más golpes de fortuna.'],
  ['moonAmulet', 'Amuleto de la luna', '#c8d8ff', 'amulet', 'acc', { mods: { mana: 40, night: 1 } }, 'moonPetal', ['@silver.wire', 'moonPetal', 'moonPetal'], 'Ves de noche y tienes más maná.'],
  ['mandrakeTalisman', 'Talismán de mandrágora', '#8a6a4a', 'rune', 'acc', { mods: { heal: 1.35, sick: 0.7 } }, 'mandrakeRoot', ['mandrakeRoot', 'thread'], 'Te curas antes y enfermas menos.'],
  ['starRing', 'Anillo estelar', '#a8f0ff', 'ring', 'ring', { mods: { xp: 1.15, manaRegen: 1.2 } }, 'starMoss', ['@silver.ring', 'starMoss'], 'Aprendes más rápido y recuperas maná.'],
  ['frostHeart', 'Corazón de escarcha', '#bfefff', 'gem', 'acc', { mods: { warm: -4, thirst: 0.75 }, prot: { heat: 0.7 } }, 'frostLotus', ['frostLotus', 'glass'], 'Fresco por dentro: el calor apenas te afecta.'],
  ['emberRing', 'Anillo de brasa', '#ff7a2a', 'ring', 'ring', { mods: { warm: 6 }, prot: { cold: 0.6 } }, 'emberBloom', ['@gold.ring', 'emberBloom'], 'Calor propio: el frío casi no te toca.'],
  ['dragonfruitBrooch', 'Broche del dragón', '#e83a8a', 'gem', 'acc', { mods: { hp: 25, melee: 1.08 } }, 'dragonFruit', ['@gold.wire', 'dragonFruit', 'dragonFruit'], 'Más vida y golpes más fuertes.'],
  ['spiritCharm', 'Amuleto espiritual', '#7af0c8', 'amulet', 'acc', { mods: { detect: 0.75, speed: 1.05 } }, 'spiritFern', ['spiritFern', 'thread'], 'Pasas desapercibido y vas más ligero.'],
  ['harvestMoonCharm', 'Amuleto de la luna de cosecha', '#ffd23a', 'amulet', 'acc', { farm: { yield: 1.35 } }, 'goldenWheat', ['moonPetal', 'goldenWheat', '@gold.wire'], 'Cosechas a menudo una pieza de más.'],
  ['greenThumbRing', 'Anillo del jardinero', '#5aa83a', 'ring', 'ring', { farm: { grow: 1.3 } }, 'ancientSeed', ['@silver.ring', 'luckyClover'], 'Lo que plantas crece un 30 % más rápido.'],
  ['earthboundBoots', 'Botas de raíz', '#6a5a3a', 'bootsA', 'acc', { mods: { stam: 30 }, farm: { grow: 1.1 } }, 'mandrakeRoot', ['leather', 'leather', 'spiritFern'], 'Aguantas más y tu huerto lo nota.'],
  ['starlitCape', 'Capa estrellada', '#3a4a8a', 'sheet', 'back', { mods: { speed: 1.08, mana: 20 } }, 'starMoss', ['silk', 'silk', 'starMoss', 'moonPetal'], 'Ligera como la noche.'],
  ['lotusCrown', 'Corona de lotos', '#e8f4ff', 'helm', 'acc', { mods: { manaRegen: 1.35, pain: 0.85 } }, 'frostLotus', ['frostLotus', 'moonPetal', '@silver.wire'], 'Calma el dolor y aclara la mente.'],
  ['phoenixFeatherPin', 'Alfiler de fénix', '#ff9a3a', 'feather', 'acc', { mods: { heal: 1.2, warm: 3, fire: 1 } }, 'emberBloom', ['emberBloom', 'emberBloom', '@gold.wire'], 'El fuego no te quema y sanas antes.'],
  ['ancientSeal', 'Sello antiguo', '#c8a86a', 'coin', 'acc', { mods: { xp: 1.1, luck: 0.05, price: 0.92 } }, 'ancientSeed', ['ancientSeed', '@gold.plate'], 'Los comerciantes te respetan; aprendes y encuentras más.'],
  ['wildheartTotem', 'Tótem del corazón salvaje', '#8a5a2a', 'rune', 'totem', { mods: { hunt: 1.25, tame: 1.3 } }, 'spiritFern', ['bone', 'spiritFern', 'leather'], 'Los animales te temen menos y cazas mejor.'],
];
const mfx2 = s => s.replace(/@(\w+)\.(\w+)/g, (_, m, f) => (MF[m] && MF[m][f]) || MF.iron[f]);
for (const [id, n, c, s, slot, x, core, teeth, d] of RARE_GEAR) {
  if (ITEMS[id]) continue; const farm = x.farm; delete x.farm;
  gear(id, n, c, s, slot, x, mfx2(core), teeth.map(mfx2), 0, d); ITEMS[id].rare = 1; if (farm) ITEMS[id].farm = farm;
}
// Pociones y comidas raras (se usan con F o se comen)
const RARE_USE = [
  ['luckPotion', 'Poción de la suerte', '#4ac85a', 'potion', 'Fortuna durante 8 min.', { buff: 'luck', t: 480 }, 'b:vial|luckyClover,berries|1'],
  ['moonlightElixir', 'Elixir de luz de luna', '#c8d8ff', 'potion', 'Visión nocturna 10 min.', { buff: 'night', t: 600 }, 'b:vial|moonPetal,moonPetal|1'],
  ['mandrakeTonic', 'Tónico de mandrágora', '#8a6a4a', 'potion', 'Regenera durante 5 min.', { buff: 'regen', t: 300 }, 'b:vial|mandrakeRoot,herbs|1'],
  ['stellarInfusion', 'Infusión estelar', '#a8f0ff', 'potion', 'Revela lo oculto 6 min.', { buff: 'reveal', t: 360 }, 'b:vial|starMoss,teaLeaves|1'],
  ['dragonfruitJuice', 'Zumo del dragón', '#e83a8a', 'potion', 'Cazas mucho mejor 6 min.', { buff: 'hunter', t: 360 }, 'b:vial|dragonFruit,dragonFruit|1'],
  ['spiritIncense', 'Incienso espiritual', '#7af0c8', 'scroll', 'Sigilo 4 min: los enemigos casi no te ven.', { buff: 'stealth', t: 240 }, 'b:spiritFern|resin,ash|2'],
  ['emberDraught', 'Brebaje de brasa', '#ff7a2a', 'potion', 'Calor interior 10 min.', { buff: 'warmth', t: 600 }, 'b:vial|emberBloom,chili|1'],
  ['frostDraught', 'Brebaje de escarcha', '#bfefff', 'potion', 'Vigor 10 min: no te cansas.', { buff: 'vigor', t: 600 }, 'b:vial|frostLotus,waterBottle|1'],
];
for (const [id, n, c, s, d, u, r] of RARE_USE) { if (ITEMS[id]) continue; NI(id, n, c, s, R_CAT, d + ' Úsalo con F.'); ITEMS[id].use = u; ITEMS[id].rare = 1; xrec(id, r); }
// Reliquias: piezas de colección y de ingeniería avanzada
const RARE_RELICS = [
  ['ancientCompass', 'Brújula antigua', '#c8a86a', 'eye', 'Señala siempre hacia el Núcleo (úsala con F para volver).', { tp: 1 }, 'b:ancientSeed|compass,moonPetal|1'],
  ['seedOfLife', 'Semilla de la vida', '#7aff9a', 'orb', 'Consúmela con F: regeneración durante 15 minutos.', { buff: 'regen', t: 900 }, 'b:ancientSeed|mandrakeRoot,goldenWheat,luckyClover|1'],
  ['starlightLens', 'Lente de luz estelar', '#a8f0ff', 'gem', 'Módulo de mejora para máquinas: +15 % de velocidad y a veces una pieza de más (instálalo en su ficha › Mantenimiento).', null, 'b:starMoss|glass,glass|1'],
  ['emberCore', 'Núcleo de brasa', '#ff5a1a', 'orb', 'Calor que no se apaga: combustible que dura muchísimo en calderas, generadores y máquinas de fuego.', null, 'b:emberBloom|emberBloom,coal,coal|1'],
  ['frostCore', 'Núcleo de escarcha', '#9ad8ff', 'orb', 'Módulo de mejora para máquinas: casi no se calientan (instálalo en su ficha › Mantenimiento).', null, 'b:frostLotus|frostLotus,ice,ice|1'],
  ['goldenSeedPouch', 'Bolsa de semillas doradas', '#ffd23a', 'coin', 'Al abrirla (F) da semillas de 6 cultivos al azar.', null, 'b:goldenWheat|leather,ancientSeed|1'],
];
for (const [id, n, c, s, d, u, r] of RARE_RELICS) { if (ITEMS[id]) continue; NI(id, n, c, s, R_CAT, d); if (u) ITEMS[id].use = u; ITEMS[id].rare = 1; xrec(id, r); }
// Lo que hacen las reliquias
ITEMS.starlightLens.upgrade = { spd: 1.15, extra: 0.04 }; ITEMS.frostCore.upgrade = { heat: 0.25, wear: 0.9 };
if (typeof FUEL !== 'undefined') FUEL.emberCore = 600;
for (const k in BD) { const d = BD[k]; if (Array.isArray(d.fuel) && !d.fuel.includes('emberCore')) d.fuel.push('emberCore'); }
