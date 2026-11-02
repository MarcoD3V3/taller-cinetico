'use strict';
// =====================================================================================
//  Armaduras míticas (nivel 11, por encima de todo): 2 conjuntos colosales.
//   🔥 Señor del Abismo Infernal: obsidiana negra con grietas de lava, cuernos, hombreras
//      erizadas de picos y espinas en la espalda. Daño, defensa y resistencia al fuego.
//   💠 Titán Celestial: cristal blanco y oro, agujas de cristal en los hombros, corona de
//      fragmentos que flotan y alas de cristal. Vida, defensa, curación y maná.
//  · Cada pieza que llevas te hace más grande (con las 4, un 24 % más).
//  · Cada pieza pide un Corazón de Coloso (lo suelta cada jefe de mundo), almas de jefe y gemas.
//  · Dibujo y auras en sim/mythic.js; bonos y combinaciones como el resto de la Armería.
// =====================================================================================
IT('colossusHeart', 'Corazón de Coloso', '#ff5a6a', 'gem', 9, 'Late todavía. Lo suelta cada Coloso (jefe de mundo) al caer. Sirve para forjar las armaduras míticas.');
Object.assign(AX_STYLES, {
  x: { n: 'Abismo', i: '🔥', mat: 'metal', myth: 1, piece: { head: 'Yelmo Astado', chest: 'Coraza Colosal', legs: 'Grebas Espinadas', feet: 'Botas de Magma' } },
  y: { n: 'Titán Celestial', i: '💠', mat: 'metal', myth: 1, piece: { head: 'Corona de Cristal', chest: 'Égida Colosal', legs: 'Quijotes de Cristal', feet: 'Botas Estelares' } },
});
const MY_SETS = {
  x: { set: 'del Señor del Abismo Infernal', c: '#1c1214', c2: '#7a0a0a', c3: '#ff5a10', mods: { head: { melee: 1.08, fire: 1 }, chest: { hp: 60, melee: 1.06 }, legs: { melee: 1.08, stam: 30 }, feet: { speed: 1.04, fire: 1 } },
    bon: [{ melee: 1.08 }, { melee: 1.25, def: 15, hp: 40 }], core: ['ignitite', 'dragonsteel'], teeth: ['dragonEyeCut', 'magmaCore', 'essenceFire', 'demonHorn'] },
  y: { set: 'del Titán Celestial', c: '#e8f4ff', c2: '#ffd34a', c3: '#7af0ff', mods: { head: { mana: 60, heal: 1.15 }, chest: { hp: 90 }, legs: { manaRegen: 1.3, sick: 0.7 }, feet: { speed: 1.05, wound: 0.8 } },
    bon: [{ hp: 20 }, { hp: 80, def: 20, heal: 1.3, mana: 40 }], core: ['aetherium', 'luminite', 'starsilver'], teeth: ['sunstoneCut', 'moonstoneCut', 'starShard', 'eternalIce'] },
};
const MY_DEF = { head: 22, chest: 42, legs: 30, feet: 16 };
for (const st in MY_SETS) { const D = MY_SETS[st], S0 = AX_STYLES[st];
  const core = axOk(...D.core.flatMap(m => [axMF(m, 'doublePlate'), axMF(m)]));
  ['head', 'chest', 'legs', 'feet'].forEach((sl, i) => {
    const id = 'my' + st + AX_ID_SLOT[sl], m = { ...D.mods[sl] }, fire = m.fire ? 1 : 0; delete m.fire;
    IT(id, `${S0.piece[sl]} ${D.set}`, D.c, AX_ICON[sl], C_CAT, `${S0.i} MÍTICA · por encima del nivel 10. ${MY_DEF[sl]} de defensa. Colosal: cada pieza puesta te hace más grande y el conjunto completo despierta un aura imponente. Equípala con Shift+clic.`);
    ITEMS[id].armor = { slot: sl, def: MY_DEF[sl], heavy: 0, warm: st === 'x' ? 8 : 4, fire: fire || (st === 'x' ? 1 : 0), set: 'my' + st, c: D.c, mat: 'metal', mods: m, xl: { st, t: 10, c2: D.c2, c3: D.c3, myth: 1 } };
    ITEMS[id].rare = 1;
    const souls = [0, 1].map(j => BOSS_SOULS.length ? BOSS_SOULS[(i * 11 + j * 5 + (st === 'y' ? 40 : 0)) % BOSS_SOULS.length] : 'spiritOrb');
    RX(id, core, ['colossusHeart', ...souls, axOk(D.teeth[i]), axOk(D.teeth[(i + 1) % 4]), core].slice(0, 6), 0, AX_FT[9]);
    AX_LIST.push(id);
  });
}
