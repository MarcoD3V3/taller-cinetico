'use strict';
// =====================================================================================
//  15 limos nuevos, cada uno con su bioma, su color y su truco. Todos se dividen al morir,
//  pero como mucho 3 generaciones (el limo grande → medianos → pequeños → diminutos, y estos
//  ya no se parten). La lógica de la división está en sim/combat.js (killFoe).
//  split: cuántos hijos suelta · splitInto: en qué se parte (por defecto, en sí mismo)
// =====================================================================================
const SLIME_DEF = [
  // id, nombre, color, brillo, tamaño, vida, daño, velocidad, biomas, nivel, extras, botín
  ['slimeHoney', 'Limo de miel', '#e8b830', '#fff0a0', 8, 26, 4, 1.1, ['flowerField', 'meadow', 'cherryGrove', 'plains'], 0, { split: 2 }, [['honeycomb', 1, 0.5], ['slimeGel', 1, 0.6]]],
  ['slimeSand', 'Limo de arena', '#d8b878', '#8a6a3a', 8, 28, 5, 1.3, ['desert', 'redDesert', 'badlands', 'saltFlats'], 0, { split: 2 }, [['sand', 3, 0.7], ['slimeGel', 1, 0.6]]],
  ['slimeMoss', 'Limo de musgo', '#4a8a3a', '#9ae070', 9, 34, 5, 1.2, ['forest', 'jungle', 'bambooJungle', 'birchForest'], 0, { split: 2, regen: 2 }, [['herbs', 1, 0.5], ['slimeGel', 1, 0.6]]],
  ['slimeTide', 'Limo de las mareas', '#3a8ad8', '#bfe8ff', 9, 36, 6, 1.3, ['beach', 'mangrove', 'stonyShore'], 1, { split: 2, el: 'frost' }, [['kelp', 2, 0.5], ['pearl', 1, 0.08], ['slimeGel', 1, 0.6]]],
  ['slimeFrost', 'Limo de escarcha', '#9ad8ff', '#ffffff', 9, 40, 6, 1.1, ['tundra', 'snowyTaiga', 'iceSpikes', 'taiga'], 1, { split: 2, el: 'frost' }, [['ice', 2, 0.6], ['slimeGel', 1, 0.6]]],
  ['slimeToxic', 'Limo tóxico', '#8ad84a', '#e0ff60', 9, 40, 7, 1.2, ['toxicMarsh', 'swamp', 'bog'], 1, { split: 2, el: 'poison', venom: 1 }, [['glowcap', 1, 0.4], ['slimeGel', 1, 0.6]]],
  ['slimeSpit', 'Limo escupidor', '#7ab84a', '#c8f060', 8, 34, 6, 1, null, 1, { split: 2, ai: 'ranged', proj: { c: '#8ad84a', spd: 9, dmg: 6 } }, [['slimeGel', 2, 0.6]]],
  ['slimeMagma', 'Limo de magma', '#ff6a1a', '#ffd060', 10, 55, 9, 1.1, ['volcano', 'ashWastes', 'volcanicIsland'], 2, { split: 2, el: 'fire', glow: 1 }, [['sulfur', 2, 0.6], ['essenceFire', 1, 0.15], ['slimeGel', 1, 0.6]]],
  ['slimeVolt', 'Limo eléctrico', '#f0f05a', '#5af0ff', 8, 45, 8, 1.6, ['hills', 'meadow', 'stonyShore'], 2, { split: 2, el: 'storm', blink: 1, glow: 1 }, [['essenceStorm', 1, 0.15], ['slimeGel', 1, 0.6]]],
  ['slimeCrystal', 'Limo de cristal', '#b090ff', '#e8d8ff', 10, 70, 8, 1, ['crystalFields', 'mushroomIsland'], 2, { split: 3, glow: 1 }, [['crystal', 2, 0.6], ['manaDust', 1, 0.3], ['slimeGel', 1, 0.6]]],
  ['slimeShade', 'Limo sombrío', '#3a2a5a', '#a060ff', 9, 50, 9, 1.4, ['darkForest', 'bog'], 2, { split: 2, el: 'void', phase: 1, night: 1 }, [['shadowPelt', 1, 0.15], ['slimeGel', 1, 0.6]]],
  ['slimeBlood', 'Limo vampírico', '#a8203a', '#ff6b5b', 9, 50, 9, 1.3, null, 3, { split: 2, drain: 1, night: 1 }, [['bloodthorn', 1, 0.3], ['slimeGel', 2, 0.6]]],
  ['slimeArcane', 'Limo arcano', '#7a4ac8', '#e0a0ff', 9, 60, 10, 1.2, ['crystalFields', 'mushroomIsland', 'darkForest'], 3, { split: 3, el: 'mind', blink: 1, glow: 1 }, [['manaDust', 3, 0.6], ['manaCrystal', 1, 0.08], ['slimeGel', 1, 0.6]]],
  ['slimeGold', 'Limo dorado', '#f0c75e', '#fff6c0', 7, 40, 4, 2, null, 2, { split: 2, glow: 1 }, [['coin', 12, 1], ['@gold.nugget', 3, 0.8], ['slimeGel', 1, 0.6]]],
  ['slimeMother', 'Limo madre', '#4ac84a', '#e8ffd0', 16, 180, 14, 0.9, null, 3, { split: 4, splitInto: 'slimeE' }, [['slimeGel', 6, 1], ['royalGel', 1, 0.05]]],
];
for (const [k, n, c, c2, s, hp, dmg, v, bio, tier, x, drops] of SLIME_DEF) {
  ENEMIES[k] = { n, shape: 'blob', c, c2, s, hp, dmg, v, wound: 'bruise', ai: x.ai || 'melee', el: x.el || null, elite: false, bio, tier, night: !!x.night, undead: false, phase: !!x.phase,
    venom: !!x.venom, drain: !!x.drain, split: true, splits: x.split || 2, splitInto: x.splitInto || k, regen: x.regen || 0, blink: !!x.blink, glow: !!x.glow, proj: x.proj || null, summon: null,
    drops: drops.map(([id, q, p]) => [id.startsWith('@') ? (MF[id.slice(1).split('.')[0]] || {})[id.split('.')[1]] || 'coin' : id, q, p]).filter(([id]) => ITEMS[id]), xp: Math.round(4 + hp / 8), slime: 1 };
}
// La Hidra del Pantano invoca «limos del pantano», que no existían: son los tóxicos
if (!ENEMIES.slimeESwamp) ENEMIES.slimeESwamp = ENEMIES.slimeToxic;
