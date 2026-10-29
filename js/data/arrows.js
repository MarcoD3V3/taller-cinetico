'use strict';
// =====================================================================================
//  52 tipos de flecha (las 2 de siempre + 50 nuevas), de Común a Legendaria. Cualquier arco
//  dispara la primera flecha que lleves en el inventario (de izquierda a derecha y de arriba
//  abajo): ordénalas para elegir. Cada una cambia el disparo:
//    mul/add daño · spd velocidad · pierce atraviesa · homing persigue · boom explota ·
//    burn quemadura (daño por segundo) · poison veneno · frz congela · slow frena · stun aturde ·
//    bleed sangrado · drain te cura · mana te da maná · chain rayo a otros · split se parte al
//    impactar · kb empuja · tag marca (más daño para todos) · crit golpe crítico
//  Cuanto más rara, más complicada de fabricar y menos salen por receta.
//  La lógica y los dibujos están en sim/arrows.js.
// =====================================================================================
const ARROWS = {};
// [id, nombre, astil, punta, plumas, forma de la punta, rareza, efectos, núcleo, dientes, descripción]
const ARROW_DEF = [
  ['arrow', 'Flecha', '#c8a070', '#9a9690', '#e8e0d0', 'tri', 0, {}, null, null, 'La de siempre.'],
  ['fireArrow', 'Flecha de fuego', '#c8a070', '#ff6a2a', '#e8e0d0', 'flame', 0, { el: 'fire', burn: [4, 3] }, null, null, 'Quema al impactar.'],
  ['arrowStone', 'Flecha de piedra', '#a07848', '#8a8682', '#e8e0d0', 'tri', 0, { add: 2, mul: 1.05 }, 'stone', 'stick,feather', 'Punta de piedra tallada: algo más de daño.'],
  ['arrowBone', 'Flecha de hueso', '#a07848', '#efe6cc', '#c8c0a8', 'barb', 0, { bleed: 0.3 }, 'bone', 'stick,feather', 'Punta de hueso con muescas: hace sangrar.'],
  ['arrowCopper', 'Flecha de cobre', '#a07848', '#d8854a', '#e8e0d0', 'tri', 0, { mul: 1.15 }, '@copper.nugget', 'stick,feather', 'Punta de cobre.'],
  ['arrowIron', 'Flecha de hierro', '#8a6238', '#b8bcc4', '#e8e0d0', 'broad', 0, { mul: 1.2, pierce: 1 }, '@iron.nugget', 'stick,feather', 'Atraviesa a un enemigo.'],
  ['arrowFeather', 'Flecha emplumada', '#c8a070', '#9a9690', '#ffffff', 'needle', 0, { spd: 1.35 }, 'feather', 'stick,feather*2', 'Plumas largas: vuela mucho más rápido.'],
  ['arrowBlunt', 'Flecha roma', '#8a6238', '#7a6a5a', '#e8e0d0', 'blunt', 0, { mul: 0.9, kb: 1, stun: 0.2 }, 'log', 'stick,feather', 'No corta: empuja y puede aturdir.'],
  ['arrowThorn', 'Flecha de espino', '#6a8a3a', '#4a7a2a', '#9ac850', 'barb', 0, { el: 'poison', poison: [3, 4] }, 'cactus', 'stick,feather', 'Espinas que envenenan.'],
  ['arrowWhistle', 'Flecha silbadora', '#c8a070', '#c8c8b0', '#ff6b5b', 'needle', 0, { tag: 3, spd: 1.1 }, 'bone', 'stick,feather,thread', 'Silba al volar y marca al enemigo: todos le hacéis más daño.'],
  ['arrowHunter', 'Flecha de cazador', '#7a5a34', '#9aa0a8', '#7a5a34', 'broad', 0, { mul: 1.1, crit: 0.15 }, 'flint', 'stick,leather', 'Punta ancha para cazar: más críticos.'],
  ['arrowSteel', 'Flecha de acero', '#7a6a5a', '#dfe3ea', '#e8e0d0', 'broad', 1, { mul: 1.35, pierce: 1 }, '@steel.nugget', 'stick,feather,@steel.nugget', 'Acero templado.'],
  ['arrowSilver', 'Flecha de plata', '#8a7a6a', '#eef2f8', '#c8d8ff', 'tri', 1, { mul: 1.25, el: 'holy' }, '@silver.nugget', 'stick,feather,@silver.nugget', 'La plata hiere el doble a los no muertos.'],
  ['arrowIce', 'Flecha de hielo', '#a8c8d8', '#a8e0ff', '#ffffff', 'crystal', 1, { el: 'frost', frz: 1.2 }, 'ice', 'arrow,frostleaf', 'Congela un instante.'],
  ['arrowVenom', 'Flecha venenosa', '#5a6a3a', '#8ad84a', '#5a8a3a', 'barb', 1, { el: 'poison', poison: [6, 6] }, 'nightshade', 'arrow,glowcap', 'Veneno fuerte y duradero.'],
  ['arrowBomb', 'Flecha explosiva', '#7a5a3a', '#3a3a3a', '#ff6b5b', 'bomb', 1, { boom: 40 }, 'gunpowder', 'arrow,thread', 'Estalla al chocar.'],
  ['arrowSerrated', 'Flecha dentada', '#7a5a34', '#c8ccd4', '#a82a2a', 'barb', 1, { mul: 1.15, bleed: 0.55 }, '@iron.nugget', 'arrow,bladeHoned', 'Dientes de sierra: sangrado casi seguro.'],
  ['arrowGlow', 'Flecha luminosa', '#c8a070', '#fff2a0', '#fff2a0', 'orb', 1, { mul: 1.2, el: 'holy', light: 1 }, 'glowcap', 'arrow,quartz', 'Brilla en la oscuridad y deja estela.'],
  ['arrowCrystal', 'Flecha de cristal', '#a8c8e8', '#b8e8ff', '#ffffff', 'crystal', 1, { mul: 1.15, pierce: 3 }, 'crystal', 'arrow,glass', 'Atraviesa hasta tres enemigos.'],
  ['arrowStorm', 'Flecha de tormenta', '#6a6a8a', '#f0f05a', '#c8f0ff', 'needle', 1, { el: 'storm', chain: 2 }, '@copper.wire', 'arrow,magnet', 'Un rayo salta a dos enemigos cercanos.'],
  ['arrowVampire', 'Flecha vampírica', '#3a1a2a', '#c8203a', '#2a0a0a', 'barb', 1, { drain: 0.08 }, 'bloodthorn', 'arrow,bone', 'Te devuelve parte del daño como vida.'],
  ['arrowGold', 'Flecha de oro', '#8a6a3a', '#f0c75e', '#ffffff', 'tri', 1, { mul: 1.3, crit: 0.2 }, '@gold.nugget', 'arrow,@gold.nugget', 'Pesada y certera.'],
  ['arrowMithril', 'Flecha de mithril', '#a8c8c8', '#bfe8f0', '#ffffff', 'needle', 2, { mul: 1.6, spd: 1.2, pierce: 2 }, '@mithril.nugget', 'arrow,@mithril.nugget,feather', 'Ligera y afiladísima.'],
  ['arrowArcane', 'Flecha arcana', '#4a2a6a', '#c8a0ff', '#e0a0ff', 'orb', 2, { mul: 1.35, el: 'mind', homing: 1 }, 'manaDust', 'arrow,manaDust*2,feather', 'Busca sola al enemigo más cercano.'],
  ['arrowMana', 'Flecha de maná', '#3a4a8a', '#5a8aff', '#8ab8ff', 'orb', 2, { mul: 1.4, mana: 3 }, 'manaCrystal', 'arrow,manaDust*2', 'Cada impacto te devuelve maná.'],
  ['arrowSplinter', 'Flecha de fragmentación', '#6a6a72', '#c8c0b0', '#e8e0d0', 'broad', 2, { mul: 1.2, split: 3 }, '@titanium.nugget', 'arrow,gunpowder,@iron.nugget', 'Al chocar se parte en tres esquirlas.'],
  ['arrowMagma', 'Flecha de magma', '#3a1a0a', '#ff6a1a', '#ffb04a', 'flame', 2, { el: 'fire', boom: 50, burn: [8, 4] }, 'obsidian', 'arrow,essenceFire,sulfur', 'Explota y deja quemaduras.'],
  ['arrowFrostDeep', 'Flecha de escarcha profunda', '#5a7a9a', '#8ad8ff', '#ffffff', 'crystal', 2, { el: 'frost', frz: 2, slow: 3, pierce: 2 }, 'frostFang', 'arrow,essenceFrost,ice', 'Congela y frena a todo lo que atraviesa.'],
  ['arrowStarsilver', 'Flecha de plata estelar', '#6a6a9a', '#d8d0ff', '#fff6b0', 'star', 2, { mul: 1.5, el: 'holy', homing: 1 }, '@starsilver.nugget', 'arrow,@starsilver.nugget,feather', 'Persigue al enemigo con luz de estrellas.'],
  ['arrowElven', 'Flecha élfica', '#5a8a5a', '#9ae0a0', '#e8f0e0', 'needle', 2, { mul: 1.45, spd: 1.5, crit: 0.3 }, '@elvensilver.nugget', 'arrow,silk,feather*2', 'Rapidísima y precisa.'],
  ['arrowLightning', 'Flecha del rayo', '#4a4a7a', '#f0f05a', '#5af0ff', 'needle', 2, { el: 'storm', chain: 4, mul: 1.3 }, 'essenceStorm', 'arrow,@copper.wire*2', 'El rayo salta a cuatro enemigos.'],
  ['arrowAcid', 'Flecha de ácido', '#5a6a2a', '#c8f04a', '#8ad84a', 'orb', 2, { el: 'poison', poison: [10, 6], mul: 1.3 }, 'toxicWeed', 'arrow,vial,glowcap', 'El ácido corroe sin parar.'],
  ['arrowAdamant', 'Flecha de adamantita', '#5a2a2a', '#e86a6a', '#e8e0d0', 'broad', 3, { mul: 2, pierce: 3 }, '@adamantite.nugget', 'arrow,@adamantite.nugget,feather*2', 'Atraviesa armaduras y enemigos.'],
  ['arrowDragon', 'Flecha del dragón', '#3a0a0a', '#ff6a1a', '#c83a2a', 'flame', 3, { el: 'fire', boom: 60, burn: [12, 5], mul: 1.6 }, 'drakeScale', 'arrow,essenceFire,dragonHeart', 'Fuego de dragón: explota y abrasa.'],
  ['arrowVoid', 'Flecha del vacío', '#1a0a2a', '#a060ff', '#3a1a6a', 'orb', 3, { el: 'void', homing: 1, pierce: 4, mul: 1.7 }, 'essenceVoid', 'arrow,voidCore', 'Cruza enemigos persiguiendo al siguiente.'],
  ['arrowRune', 'Flecha rúnica', '#2a2a5a', '#8ab8ff', '#c8a0ff', 'star', 3, { split: 4, homing: 1, mul: 1.5 }, 'runeBlank', 'arrow,arcaneInk,manaCrystal', 'Se divide en cuatro runas que buscan enemigos.'],
  ['arrowBlood', 'Flecha sangrienta', '#2a0a0a', '#c8203a', '#5a0a1a', 'barb', 3, { bleed: 0.7, drain: 0.1, mul: 1.6 }, 'bloodthorn', 'arrow,dragonHeart', 'Desangra y te cura.'],
  ['arrowMeteor', 'Flecha de meteorito', '#3a3a3a', '#ff8a2a', '#ffd060', 'bomb', 3, { boom: 80, stun: 0.6, mul: 1.8 }, '@tungsten.nugget', 'arrow,obsidian,essenceFire', 'Cae como una roca ardiente: explosión que aturde.'],
  ['arrowNightmare', 'Flecha de pesadilla', '#1a1a2a', '#7a4ac8', '#ff7ad8', 'barb', 3, { tag: 15, slow: 2, mul: 1.6 }, 'shadowPelt', 'arrow,essenceVoid', 'Marca al enemigo con miedo: todos le hacéis mucho más daño.'],
  ['arrowBlizzard', 'Flecha de la ventisca', '#5a7a9a', '#c8f0ff', '#ffffff', 'crystal', 3, { el: 'frost', frz: 2.5, split: 3, mul: 1.5 }, 'frostFang', 'arrow,essenceFrost*2', 'Estalla en esquirlas de hielo que congelan.'],
  ['arrowPhoenix', 'Flecha del fénix', '#5a1a0a', '#ffb04a', '#ff6a1a', 'flame', 3, { el: 'fire', burn: [10, 5], chain: 3, mul: 1.7 }, 'phoenixFeather', 'arrow,essenceFire', 'Llamas que saltan de enemigo en enemigo.'],
  ['arrowChrono', 'Flecha de cristal de tiempo', '#4a3a5a', '#ffe0ff', '#e0b54c', 'crystal', 3, { el: 'time', slow: 4, pierce: 3, mul: 1.7 }, 'timeCrystal', 'arrow,@chronium.nugget', 'Atrasa el tiempo de lo que toca.'],
  ['arrowStar', 'Flecha estelar', '#2a1a4a', '#fff6b0', '#d8d0ff', 'star', 4, { el: 'holy', homing: 1, split: 5, mul: 2.2 }, 'starDustX', 'arrow,@orichalcum.nugget,phoenixFeather,singularity', 'Una estrella fugaz que se parte en cinco.'],
  ['arrowOrigin', 'Flecha del Origen', '#e8d8a8', '#ffffff', '#f0c75e', 'needle', 4, { pierce: 8, mul: 2.6, spd: 1.3 }, '@orichalcum.nugget', 'arrow,@aetherium.nugget,timeCrystal,singularity', 'Nada la detiene: atraviesa ocho enemigos.'],
  ['arrowAurora', 'Flecha de la Aurora', '#3a5a5a', '#8af0d0', '#ff7ad8', 'orb', 4, { el: 'life', drain: 0.12, homing: 1, chain: 3, mul: 2.3 }, '@aetherium.nugget', 'arrow,phoenixFeather,timeCrystal,manaCrystal', 'Luz viva que cura y salta entre enemigos.'],
  ['arrowPrime', 'Flecha del Primer Motor', '#5a3a1a', '#e0b54c', '#c8a060', 'bomb', 4, { el: 'time', boom: 90, mul: 2.5 }, '@chronium.nugget', 'arrow,gearTrain,timeCrystal,voidCore', 'Un engranaje que estalla con la fuerza de una fábrica.'],
  ['arrowEnd', 'Flecha del Fin', '#0a0a0a', '#ff3a2a', '#7a4ac8', 'bomb', 4, { el: 'void', boom: 120, split: 4, mul: 2.4 }, 'singularity', 'arrow,voidCore*2,@etherium.nugget', 'Abre un pequeño fin del mundo donde cae.'],
  ['arrowSun', 'Flecha solar', '#5a3a0a', '#ffd060', '#ff8a2a', 'flame', 4, { el: 'fire', burn: [16, 6], boom: 70, chain: 4, mul: 2.4 }, 'essenceFire', 'arrow,phoenixFeather,@ignitite.nugget,singularity', 'Un trozo de sol: explota, quema y salta.'],
  ['arrowGalaxy', 'Flecha de las galaxias', '#1a1a3a', '#b8a8ff', '#ff7ad8', 'star', 4, { el: 'holy', homing: 1, pierce: 6, mul: 2.5 }, '@luminite.nugget', 'arrow,singularity,manaCrystal*2', 'Gira como una galaxia buscando enemigos.'],
  ['arrowJudgement', 'Flecha del juicio', '#e8d8a8', '#fff2a0', '#ffffff', 'broad', 4, { el: 'holy', tag: 30, stun: 0.8, mul: 2.4 }, '@orichalcum.nugget', 'arrow,soulGem,enchantedBook', 'Señala al culpable: todos le hacéis muchísimo más daño.'],
  ['arrowEternity', 'Flecha de la eternidad', '#3a3a6a', '#ffe0ff', '#5a8aff', 'orb', 4, { mana: 6, drain: 0.1, homing: 1, mul: 2.3 }, 'timeCrystal', 'arrow,manaCrystal*2,@chronium.nugget', 'Te devuelve vida y maná con cada impacto.'],
  ['arrowSkyDragon', 'Flecha del Dragón Celestial', '#3a0a1a', '#ff7ad8', '#f0c75e', 'flame', 4, { el: 'storm', split: 6, boom: 50, mul: 2.6 }, 'dragonHeart', 'arrow,phoenixFeather,singularity,@dragonsteel.nugget', 'Se abre en seis dragoncillos que estallan.'],
];
const ARROW_N = [25, 20, 15, 10, 6], ARROW_TIER = [1, 3, 4, 6, 7], ARROW_RPM = [0, 16, 48, 96, 160];
const arwRes = s => { if (!s) return null; if (s.startsWith('@')) { const [m, f] = s.slice(1).split('.'); return (MF[m] && MF[m][f]) || null; } return ITEMS[s] ? s : null; };
// Daño propio de cada flecha (se suma al del arco): crece por la lista, de 3 a ~65, y su «mul»
// lo hace algo mayor o menor. Así un arco flojo con una flecha buena pega fuerte, y al revés.
const ARROW_DMG = (i, fx) => Math.round((3 * Math.pow(40 / 3, i / (ARROW_DEF.length - 1)) + (fx.add || 0)) * (1 + ((fx.mul || 1) - 1) * 0.4));
ARROW_DEF.forEach((a, i) => { a.push(ARROW_DMG(i, a[7])); });
for (const [id, n, sh, hd, fl, form, r, fx, core, teeth, d, dmg] of ARROW_DEF) {
  ARROWS[id] = { r, sh, hd, fl, form, ...fx, dmg };
  if (!ITEMS[id]) IT(id, n, hd, 'arrowI', C_CAT, '');
  const bits = [];
  bits.push(`+${dmg} de daño sobre el del arco`);
  if (fx.spd) bits.push(`vuela un ${Math.round((fx.spd - 1) * 100)} % más rápido`); if (fx.pierce) bits.push(`atraviesa ${fx.pierce} enemigo${fx.pierce > 1 ? 's' : ''}`); if (fx.homing) bits.push('persigue al enemigo');
  if (fx.boom) bits.push(`explota (radio ${Math.round(fx.boom / 32 * 10) / 10} casillas)`); if (fx.burn) bits.push(`quema ${fx.burn[0]}/s durante ${fx.burn[1]} s`); if (fx.poison) bits.push(`envenena ${fx.poison[0]}/s durante ${fx.poison[1]} s`);
  if (fx.frz) bits.push(`congela ${fx.frz} s`); if (fx.slow) bits.push(`frena ${fx.slow} s`); if (fx.stun) bits.push(`aturde ${fx.stun} s`); if (fx.bleed) bits.push(`${Math.round(fx.bleed * 100)} % de sangrado`);
  if (fx.drain) bits.push(`te cura un ${Math.round(fx.drain * 100)} % del daño`); if (fx.mana) bits.push(`+${fx.mana} de maná por impacto`); if (fx.chain) bits.push(`un rayo salta a ${fx.chain} enemigos`);
  if (fx.split) bits.push(`se parte en ${fx.split}`); if (fx.kb) bits.push('empuja'); if (fx.tag) bits.push(`marca: +${fx.tag} de daño de todos durante 5 s`); if (fx.crit) bits.push(`${Math.round(fx.crit * 100)} % de crítico`);
  if (fx.el && typeof TR_ELN !== 'undefined') bits.push('elemento ' + TR_ELN[fx.el]);
  ITEMS[id].d = `【${['Común', 'Poco común', 'Rara', 'Épica', 'Legendaria'][r]}】 ${d} ${bits.join(' · ')}${bits.length ? '.' : ''} Munición de arcos: se usa la primera que lleves en el inventario.`;
  ITEMS[id].rar = r; ITEMS[id].arrowFx = 1; ITEMS[id].ammoDmg = dmg;
  if (!core) continue;
  // Receta: punta (núcleo) + astil, plumas y lo especial; las raras piden giro y nivel de taller
  const c0 = arwRes(core) || arwRes('@' + ['iron', 'steel', 'mithril', 'adamantite', 'orichalcum'][r] + '.nugget') || 'stone';
  const tt = teeth.split(',').map(p => { const [x, k] = p.split('*'); const ok = arwRes(x) || (r >= 3 ? arwRes(['manaDust', 'manaDust', 'manaCrystal', 'soulGem', 'timeCrystal'][r]) : 'feather'); return ok + (k ? '*' + k : ''); });
  const rec = R2(id, ARROW_N[r], c0, tt.join(','), ARROW_RPM[r], ARROW_TIER[r]) || R2(id, ARROW_N[r], c0, tt.concat(['thread']).join(','), ARROW_RPM[r], ARROW_TIER[r]) || R2(id, ARROW_N[r], c0, tt.concat(['leather']).join(','), ARROW_RPM[r], ARROW_TIER[r]);
  if (!rec) console.warn('Sin receta para', id);
}
