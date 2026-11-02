'use strict';
// =====================================================================================
//  Asedios a la base: datos (la lógica está en sim/siege.js).
//  Defensas nuevas, baratas y sin energía (para quien aún no tiene torretas), y las tropas
//  del asedio, que solo aparecen en los asedios.
// =====================================================================================
const SG_BCAT = BD.stoneBricks ? BD.stoneBricks.cat : 3;
XB('siegeBallista', { n: 'Balista', cat: 6, tier: 0, d: 'Dispara virotes a los enemigos a 8 casillas, sin gastar energía. Ideal para defender la base de los asedios.', look: { c: '#7a5a34', g: '➹', a: '' } });
RB('siegeBallista', 1, 'planks', 'planks*3,stick*2,twine', 0, 0);
XB('reinforcedWall', { n: 'Muro reforzado', cat: SG_BCAT, d: 'Ladrillos de piedra con refuerzos de hierro: aguanta muchísimo los golpes de un asedio. No se puede atravesar.', look: { c: '#6a6e76', tex: 'bricks', g: '', a: '' } });
RB('reinforcedWall', 4, 'stoneBricks', 'stoneBricks*2,' + MF.iron.plate, 0, 1);
IT('siegeBanner', 'Estandarte de la victoria', '#c8a040', 'sheet', 9, 'Trofeo: lo ganas al rechazar un asedio. Demuestra que tu base no cae.');
// Resistencia de cada bloque a los golpes del asedio (lo demás: según lo que sea)
const SG_HP = { core: 1500, reinforcedWall: 700, obsidianBlock: 450, stoneBricks: 260, brickWall: 240, stonePillar: 260, stoneBlock: 180, stoneWall: 220, basaltBlock: 220, mossyBricks: 240, logWall: 140, woodWall: 110, fence: 70, ironFence: 220, glassBlock: 40, iceBlock: 60, snowBlock: 30, dirtBlock: 50, turret: 260, siegeBallista: 160, spikeTrap: 200, door: 120 };
// Tropas del asedio: no salen nunca solas (bio vacío y nivel altísimo)
const SGF = (k, n, shape, c, c2, s, hp, dmg, v, wound, ai, x = {}) => { ENEMIES[k] = { n, shape, c, c2, s, hp, dmg, v, wound, ai, el: x.el || null, elite: false, bio: ['__asedio'], tier: 99, night: false, undead: false, phase: false, venom: false, drain: false, split: false, regen: 0, blink: false, glow: !!x.glow, proj: x.proj || null, summon: x.summon || null, drops: x.drops || [['coin', 2, 0.6]], xp: Math.round(6 + hp / 8), sg: x.sg || 1 }; };
SGF('sgRaider', 'Saqueador', 'hum', '#7a4a3a', '#c8a070', 9, 55, 10, 2.3, 'cut', 'melee', { sg: 1.5 });
SGF('sgRam', 'Ariete de asalto', 'quad', '#5a4030', '#9a9aa0', 15, 260, 14, 1.1, 'fracture', 'melee', { sg: 5, drops: [['planks', 4, 1], [MF.iron.plate, 1, 0.5]] });
SGF('sgSapper', 'Zapador', 'blob', '#4a4a30', '#ff8a2a', 8, 45, 40, 2.6, 'burn', 'exploder', { el: 'fire', sg: 8, drops: [['gunpowder', 2, 0.8]] });
SGF('sgArcher', 'Arquero de asedio', 'hum', '#5a6a3a', '#d8c08a', 9, 45, 8, 2.1, 'cut', 'ranged', { proj: { c: '#ffb040', spd: 13, dmg: 9 }, sg: 2 });
SGF('sgShaman', 'Chamán de guerra', 'hum', '#3a2a4a', '#a060ff', 9, 70, 10, 1.8, 'burn', 'summoner', { summon: 'sgRaider', proj: { c: '#a060ff', spd: 10, dmg: 10 }, glow: 1, sg: 1 });
SGF('sgWarlord', 'Señor de la Guerra', 'hum', '#6a1a1a', '#ffd34a', 18, 900, 26, 1.7, 'fracture', 'charger', { sg: 6, glow: 1, drops: [['coin', 40, 1], ['siegeBanner', 1, 1]] });
