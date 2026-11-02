'use strict';
// =====================================================================================
//  La Armería: 200 piezas de armadura (50 cascos, 50 pecheras, 50 pantalones y 50 botas).
//  · 10 niveles × 5 estilos. Cada combinación nivel-estilo es un conjunto con nombre propio.
//      Guerrero  → defensa, vida y daño cuerpo a cuerpo (pesadas hasta el nivel 7)
//      Explorador → daño a distancia, velocidad e impulso
//      Arcano    → maná y su recarga, experiencia
//      Sombra    → sigilo, visión nocturna, suerte e impulso
//      Sagrado   → vida, curación y resistencia a heridas y enfermedades
//  · El nivel 1 se fabrica con lo que encuentras el primer día y protege poco. Cada nivel pide
//    materiales más difíciles; el 9 y el 10 piden gemas talladas y almas de jefe: casi imposibles.
//  · Bonos al combinar (sim/armory.js): 2 y 4 piezas del mismo estilo, 4 del mismo nivel, y el
//    conjunto completo (mismo estilo y nivel) despierta su aura.
//  · Cada pieza tiene colores propios (c: base, c2: adorno, c3: brillo) que usa el dibujo.
// =====================================================================================
const AX_STYLES = {
  w: { n: 'Guerrero', i: '⚔', mat: 'metal', piece: { head: 'Yelmo', chest: 'Coraza', legs: 'Grebas', feet: 'Escarpes' } },
  h: { n: 'Explorador', i: '🏹', mat: 'leather', piece: { head: 'Capucha', chest: 'Jubón', legs: 'Calzas', feet: 'Botas' } },
  m: { n: 'Arcano', i: '✦', mat: 'cloth', piece: { head: 'Sombrero', chest: 'Túnica', legs: 'Faldón', feet: 'Sandalias' } },
  s: { n: 'Sombra', i: '☾', mat: 'leather', piece: { head: 'Máscara', chest: 'Chaleco', legs: 'Pantalones', feet: 'Pisadas' } },
  g: { n: 'Sagrado', i: '✚', mat: 'metal', piece: { head: 'Yelmo', chest: 'Peto', legs: 'Grebas', feet: 'Botas' } },
};
const AX_KEYS = ['w', 'h', 'm', 's', 'g'];
// Nombre de cada conjunto [nivel][estilo]
const AX_SET_N = [
  ['del Recluta', 'del Rastreador', 'del Aprendiz', 'del Ratero', 'del Acólito'],
  ['del Legionario de Bronce', 'del Cazador de Cobre', 'del Iniciado Rúnico', 'del Bandido', 'del Novicio Sagrado'],
  ['del Caballero de Hierro', 'del Montaraz', 'del Hechicero', 'del Asesino', 'del Cruzado'],
  ['del Guardia de Acero', 'del Explorador de Plata', 'del Mago de Cristal', 'de la Sombra Plateada', 'del Templario'],
  ['del Gladiador Dorado', 'del Arquero de Obsidiana', 'del Archimago', 'del Espectro', 'del Paladín'],
  ['del Campeón de Mithril', 'del Grifo', 'del Sabio Arcano', 'del Fantasma Nocturno', 'del Ángel Guardián'],
  ['del Señor de la Guerra', 'del Cazadragones', 'del Brujo Rúnico', 'de la Viuda Negra', 'del Serafín'],
  ['del Dragón', 'de la Tormenta', 'del Fénix', 'del Vacío', 'del Arcángel'],
  ['del Titán Estelar', 'del Viento Astral', 'del Oráculo Estelar', 'del Eclipse', 'de la Aurora'],
  ['del Dios de la Guerra', 'del Cazador Eterno', 'del Archimago Primordial', 'del Abismo Eterno', 'del Sol Divino'],
];
const AX_TIER_N = ['Iniciado', 'Bronce', 'Hierro', 'Acero', 'Oro', 'Mithril', 'Adamantita', 'Dracónico', 'Estelar', 'Divino'];
// Colores [nivel][estilo] = [base, adorno, brillo]
const AX_COL = [
  [['#8a6a4a', '#c8b090', '#e0d8c0'], ['#7a5a3a', '#4a6a2a', '#c8e08a'], ['#5a4a8a', '#c8a050', '#b0a0ff'], ['#3a3a40', '#6a6a70', '#a0a0a8'], ['#e8e0d0', '#c8a060', '#fff4c0']],
  [['#c8843a', '#7a4a22', '#ffd090'], ['#8a6a3a', '#3a5a2a', '#a8d070'], ['#4a3a7a', '#d0b060', '#a080ff'], ['#2a2a30', '#7a4a3a', '#c87a5a'], ['#d8c0a0', '#c8843a', '#ffe0a0']],
  [['#9aa0a8', '#5a5e66', '#d8dce0'], ['#5a6a3a', '#2a3a1a', '#d0e0a0'], ['#2a3a7a', '#e0c070', '#80b0ff'], ['#24242c', '#4a3a5a', '#a080d0'], ['#d0d4dc', '#c8a040', '#fff6b0']],
  [['#7f8a96', '#3a4048', '#c8e0ff'], ['#6a8a5a', '#c0c8d0', '#e8fff0'], ['#6a4aa8', '#e8e0ff', '#c8a8ff'], ['#2a2a3a', '#9aa0b0', '#d0d8ff'], ['#e8ecf4', '#d8b040', '#ffffff']],
  [['#b8a070', '#5a3a1a', '#ffd34a'], ['#3a3a40', '#7a5a3a', '#9af07a'], ['#3a2a6a', '#ffd34a', '#b070ff'], ['#1a1a24', '#5a2a6a', '#b060ff'], ['#f4f0e0', '#e0b030', '#fff8c0']],
  [['#bfe8ff', '#5a8ab8', '#ffffff'], ['#c8a060', '#f4f0e0', '#ffe0a0'], ['#2a4a8a', '#e0f0ff', '#80e0ff'], ['#14141e', '#3a6a6a', '#7af0f0'], ['#f0f8ff', '#9ad8ff', '#ffffff']],
  [['#c0405e', '#4a1a2a', '#ff8aa0'], ['#5a3a2a', '#a83a2a', '#f0a040'], ['#5a1a5a', '#ffb0e0', '#ff60c0'], ['#1a1014', '#8a1a2a', '#ff3a5a'], ['#fff4e0', '#ff9a4a', '#ffe090']],
  [['#b83a2a', '#2a1a1a', '#ffb040'], ['#3a5a7a', '#9ae8ff', '#f0f05a'], ['#8a2a1a', '#ffd060', '#ff8a2a'], ['#120a1e', '#4a2a8a', '#a060ff'], ['#ffffff', '#ffd34a', '#fff8d0']],
  [['#4a5a8a', '#c8d0ff', '#9af0ff'], ['#2a3a5a', '#a8c8ff', '#e0f8ff'], ['#1a1a4a', '#fff4a0', '#a0c0ff'], ['#0a0a14', '#e0d8ff', '#ff9ae0'], ['#f8f4ff', '#ffb0f0', '#fff0ff']],
  [['#f0c040', '#8a1a1a', '#ff4a2a'], ['#1a4a3a', '#7af0b0', '#d0ffe8'], ['#f0f0ff', '#7a4aff', '#c080ff'], ['#050508', '#6a00ff', '#d0a0ff'], ['#fffef0', '#ffcc20', '#ffffff']],
];
// Defensa total del conjunto por nivel (se reparte entre las 4 piezas)
const AX_DEF = [4, 9, 14, 20, 27, 35, 44, 54, 66, 80];
const AX_SPLIT = { head: 0.2, chest: 0.38, legs: 0.27, feet: 0.15 };
const AX_STYLE_DEF = { w: 1.15, h: 0.85, m: 0.7, s: 0.8, g: 1 };
// Lo que da cada pieza según su estilo (t: nivel 0-9, k: t+1)
const AX_MODS = {
  w: { head: k => ({ block: +(0.005 * k).toFixed(3) }), chest: k => ({ hp: 4 * k }), legs: k => ({ melee: +(1 + 0.012 * k).toFixed(3) }), feet: k => ({ stam: 3 * k }) },
  h: { head: k => ({ ranged: +(1 + 0.015 * k).toFixed(3) }), chest: k => ({ dash: +(1 - 0.02 * k).toFixed(3), warm: 2 + k }), legs: k => ({ speed: +(1 + 0.008 * k).toFixed(3) }), feet: k => ({ sprintCost: +(1 - 0.03 * k).toFixed(3) }) },
  m: { head: k => ({ mana: 6 + 6 * k }), chest: k => ({ manaRegen: +(1 + 0.05 * k).toFixed(3) }), legs: k => ({ mana: 4 + 4 * k }), feet: k => ({ xp: +(1 + 0.02 * k).toFixed(3) }) },
  s: { head: k => ({ night: +(0.04 * k).toFixed(3) }), chest: k => ({ detect: +(1 - 0.03 * k).toFixed(3) }), legs: k => ({ dash: +(1 - 0.02 * k).toFixed(3) }), feet: k => ({ luck: +(0.004 * k).toFixed(3) }) },
  g: { head: k => ({ heal: +(1 + 0.04 * k).toFixed(3) }), chest: k => ({ hp: 5 * k, warm: 2 + k }), legs: k => ({ sick: +(1 - 0.03 * k).toFixed(3) }), feet: k => ({ wound: +(1 - 0.02 * k).toFixed(3) }) },
};
// ---------- Materiales de cada nivel y estilo ----------
const axOk = (...ids) => ids.find(id => id && ITEMS[id]) || 'leather';
const axMF = (m, f = 'plate') => MF[m] && MF[m][f];
const BOSS_SOULS = Object.keys(BOSSES).map(k => k + 'Soul').filter(id => ITEMS[id]);
// [núcleo, material del estilo, extra]
const AX_MAT = t => ({
  w: [[axOk('hide'), axOk('bone'), axOk('twine')], [axOk(axMF('bronze')), axOk('leather'), axOk('thread')], [axOk(axMF('iron')), axOk('leather'), axOk(axMF('iron', 'rod'))], [axOk(axMF('steel')), axOk('leather'), axOk(axMF('steel', 'bolt'))], [axOk(axMF('titanium')), axOk('obsidian'), axOk(axMF('gold'))],
    [axOk(axMF('mithril')), axOk('obsidian'), axOk('golemCore', 'crystal')], [axOk(axMF('adamantite')), axOk('drakeScale'), axOk('demonHorn', 'orcTusk')], [axOk(axMF('dragonsteel')), axOk('magmaCore', 'drakeScale'), axOk('essenceFire')], [axOk(axMF('dwarvensteel', 'doublePlate'), axMF('dwarvensteel')), axOk('golemCore'), axOk('rubyCut')], [axOk(axMF('dragonsteel', 'doublePlate')), axOk('dragonEyeCut'), axOk(axMF('chronium'))]][t],
  h: [[axOk('hide'), axOk('feather'), axOk('twine')], [axOk('leather'), axOk('feather'), axOk('thread')], [axOk('leather'), axOk('silk'), axOk('scales')], [axOk('scales'), axOk('silk'), axOk(axMF('silver', 'foil'), axMF('silver'))], [axOk('chitin'), axOk('griffinFeather', 'feather'), axOk('obsidian')],
    [axOk(axMF('elvensilver')), axOk('griffinFeather'), axOk('emeraldCut', 'emerald')], [axOk('drakeScale'), axOk(axMF('adamantite', 'foil'), axMF('adamantite')), axOk('frostFang', 'fur')], [axOk(axMF('aetherium'), axMF('starsilver')), axOk('stormShard', 'essenceStorm'), axOk('griffinFeather')], [axOk(axMF('elvensilver', 'doublePlate'), axMF('elvensilver')), axOk('stormShard'), axOk('emeraldCut')], [axOk(axMF('aetherium', 'doublePlate'), axMF('aetherium')), axOk('emeraldCut'), axOk('phoenixFeather')]][t],
  m: [[axOk('cloth'), axOk('petals', 'herbs'), axOk('thread')], [axOk('cloth'), axOk('manaDust'), axOk('thread')], [axOk('cloth'), axOk('manaDust'), axOk('crystal')], [axOk('enchantedCloth', 'cloth'), axOk('crystal'), axOk('manaDust')], [axOk('enchantedCloth'), axOk('manaCrystal'), axOk('amethystGemCut', 'crystal')],
    [axOk('enchantedCloth'), axOk(axMF('arcanite')), axOk('spiritOrb')], [axOk(axMF('runesteel', 'foil'), axMF('runesteel')), axOk('enchantedCloth'), axOk('spiritOrb')], [axOk(axMF('arcanite', 'doublePlate'), axMF('arcanite')), axOk('phoenixFeather'), axOk('essenceFire')], [axOk(axMF('etherium')), axOk('starShard', 'manaCrystal'), axOk('sapphireCut')], [axOk(axMF('etherium', 'doublePlate'), axMF('etherium')), axOk('moonstoneCut'), axOk('starShard')]][t],
  s: [[axOk('cloth'), axOk('coal'), axOk('twine')], [axOk('leather'), axOk('coal'), axOk('thread')], [axOk('leather'), axOk('darkCloth', 'silk'), axOk('venom')], [axOk('darkCloth'), axOk('venom'), axOk(axMF('silver', 'wire'), axMF('silver'))], [axOk('shadowPelt', 'darkCloth'), axOk('darkCloth'), axOk('onyx', 'obsidian')],
    [axOk('shadowPelt'), axOk('ectoplasm'), axOk(axMF('mithril', 'foil'), axMF('mithril'))], [axOk(axMF('voidsteel', 'foil'), axMF('voidsteel')), axOk('shadowPelt'), axOk('venom')], [axOk(axMF('voidsteel')), axOk('ectoplasm'), axOk('sporeSilk', 'darkCloth')], [axOk(axMF('voidsteel', 'doublePlate'), axMF('voidsteel')), axOk('onyxCut'), axOk('ectoplasm')], [axOk(axMF('voidsteel', 'block'), axMF('voidsteel', 'doublePlate')), axOk('onyxCut'), axOk('eternalIce', 'frozenHeart')]][t],
  g: [[axOk('wool'), axOk('herbs', 'petals'), axOk('twine')], [axOk(axMF('copper')), axOk('wool'), axOk('thread')], [axOk(axMF('silver')), axOk('leather'), axOk('holyWater', 'herbs')], [axOk(axMF('silver', 'doublePlate'), axMF('silver')), axOk('holyWater'), axOk(axMF('gold'))], [axOk(axMF('gold')), axOk('holyWater'), axOk('wardstone', 'crystal')],
    [axOk(axMF('mithril')), axOk('unicornHorn', 'holyWater'), axOk('wardstone')], [axOk(axMF('orichalcum'), axMF('gold')), axOk('wardstone'), axOk('topazCut', 'topaz')], [axOk(axMF('starsilver')), axOk('phoenixFeather'), axOk('holyWater')], [axOk(axMF('starsilver', 'doublePlate'), axMF('starsilver')), axOk('sunstoneCut'), axOk('starShard')], [axOk(axMF('luminite', 'doublePlate'), axMF('luminite')), axOk('sunstoneCut'), axOk('phoenixFeather')]][t],
});
// Nivel de la fábrica que pide cada nivel de armadura
const AX_FT = [0, 0, 1, 2, 3, 4, 5, 6, 7, 7].map(v => Math.min(v, (typeof TIERS !== 'undefined' ? TIERS.length : 8) - 1));
const AX_N_CORE = { head: 2, chest: 4, legs: 3, feet: 2 };
const AX_ICON = { head: 'helm', chest: 'chestA', legs: 'legsA', feet: 'bootsA' };
const AX_ID_SLOT = { head: 'Helm', chest: 'Chest', legs: 'Legs', feet: 'Boots' };
const AX_LIST = [];
for (let t = 0; t < 10; t++) { const M = AX_MAT(t);
  AX_KEYS.forEach((st, si) => { const S0 = AX_STYLES[st], [c, c2, c3] = AX_COL[t][si], fam = 'ax' + st + t, [core, sm, ex] = M[st];
    for (const sl of ['head', 'chest', 'legs', 'feet']) {
      const id = fam + AX_ID_SLOT[sl], piece = st === 'm' && sl === 'head' && t >= 3 ? 'Diadema' : st === 'g' && sl === 'head' && t >= 7 ? 'Corona' : S0.piece[sl];
      const def = Math.max(1, Math.round(AX_DEF[t] * AX_SPLIT[sl] * AX_STYLE_DEF[st])), mods = AX_MODS[st][sl](t + 1), heavy = st === 'w' && t >= 1 && t <= 6 ? 1 : 0;
      const warm = mods.warm || 0; delete mods.warm;
      IT(id, `${piece} ${AX_SET_N[t][si]}`, c, AX_ICON[sl], C_CAT, `${S0.i} ${S0.n} · nivel ${t + 1} de 10 (${AX_TIER_N[t]}). ${def} de defensa${heavy ? ', pesada' : ''}. Combínala: más piezas ${S0.n.toLowerCase()} o del mismo nivel dan bonos, y el conjunto completo despierta su aura. Equípala con Shift+clic.`);
      ITEMS[id].armor = { slot: sl, def, heavy, warm, fire: t >= 7 ? 1 : 0, set: fam, c, mat: S0.mat, mods, xl: { st, t, c2, c3 } };
      if (t >= 5) ITEMS[id].rare = 1;
      // Receta: núcleo + material del estilo; las de nivel 9 y 10 piden además almas de jefe distintas
      const n = AX_N_CORE[sl], si4 = si * 4 + ['head', 'chest', 'legs', 'feet'].indexOf(sl);
      let teeth = Array.from({ length: Math.min(4, n - 1 + (t >= 4 ? 1 : 0)) }, () => core).concat([sm]).concat(t >= 2 ? [ex] : []);
      if (t >= 8 && BOSS_SOULS.length) { const ns = t === 9 ? (sl === 'chest' ? 3 : 2) : 1, souls = Array.from({ length: ns }, (_, j) => BOSS_SOULS[(si4 * (t - 6) + j * 7) % BOSS_SOULS.length]); teeth = [core, ...souls, sm, ex]; }
      RX(id, core, teeth.slice(0, 6), 0, AX_FT[t]);
      AX_LIST.push(id);
    } });
}
