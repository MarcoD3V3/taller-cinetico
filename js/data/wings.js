'use strict';
// =====================================================================================
//  Alas y élitros (ranura de la espalda) e impulsadores (se gastan al usarlos con F).
//   · Alas: mantén Espacio en el aire para volar; al soltar planeas hasta el suelo. Cada par
//     tiene su tiempo de vuelo (se recarga en el suelo), su velocidad, su planeo y un poder.
//   · Impulsadores: un empujón mientras vuelas (o te lanzan a volar si llevas alas).
//  La lógica, los dibujos y la animación están en sim/wings.js.
// =====================================================================================
const WING_RAR = ['Común', 'Poco común', 'Raro', 'Épico', 'Legendario', 'Imposible'];
// [id, nombre, estilo, color, acento, rareza, vuelo (s), velocidad, planeo (descenso px/s), poder, receta: núcleo, dientes, tier, rpm, descripción]
const WING_DEF = [
  ['wingFeather', 'Alas de plumas', 'feather', '#e8e0d0', '#c8b890', 0, 1.4, 1.08, 14, null, 'leather', 'feather*4,stick', 1, 0, 'Plumas de gallina cosidas con paciencia. Vuelas un poco y planeas.'],
  ['wingBat', 'Alas de murciélago', 'membrane', '#4a3a4a', '#8a6a8a', 0, 1.6, 1.12, 16, 'night', 'leather', 'leather*3,bone*2,thread', 1, 0, 'De noche vuelan más y te ven peor.'],
  ['elytraBeetle', 'Élitros de escarabajo', 'elytra', '#3a5a3a', '#8ad84a', 1, 0.7, 1.45, 5, 'glide', '@iron.plate', 'leather*2,silk*2,feather*2', 2, 16, 'Casi no aletean, pero planean muchísimo y rapidísimo.'],
  ['wingButterfly', 'Alas de mariposa', 'insect', '#c48ad4', '#ffe080', 1, 2.0, 1.02, 10, 'heal', 'silk', 'silk*3,herbs*2,glowcap', 2, 0, 'Lentas y preciosas: te curan poco a poco mientras vuelas.'],
  ['wingGear', 'Alas mecánicas', 'mech', '#c8a060', '#8a6a3a', 1, 2.2, 1.18, 12, 'recharge', '@brass.gear', '@iron.plate*2,@brass.plate*2,spring', 3, 32, 'Engranajes y lona: se recargan el doble de rápido.'],
  ['wingLeaf', 'Alas de hoja viva', 'leaf', '#5aa83a', '#c8f080', 2, 2.4, 1.15, 10, 'regrow', 'herbs', 'herbs*4,silk*2,manaDust', 3, 16, 'Brotan del bosque. Al volar haces crecer los cultivos que sobrevuelas.'],
  ['wingFrost', 'Alas de escarcha', 'crystal', '#a8e0ff', '#ffffff', 2, 2.6, 1.2, 11, 'frost', 'ice', '@silver.plate*2,ice*3,essenceFrost', 4, 48, 'Cristales de hielo: congelan a quien pase por debajo.'],
  ['wingFlame', 'Alas de fuego', 'flame', '#ff8a2a', '#ffd060', 2, 2.8, 1.25, 12, 'fire', 'essenceFire', 'drakeScale*2,sulfur*3,@gold.plate', 4, 48, 'Arden sin quemarte: dejan una estela que abrasa enemigos.'],
  ['wingFairy', 'Alas de hada', 'insect', '#9af0ff', '#ff9af0', 3, 3.2, 1.2, 9, 'light', 'manaCrystal', 'silk*3,starlily*2,glowcap*2', 4, 32, 'Iluminan la noche a tu alrededor.'],
  ['wingCrystal', 'Alas de cristal', 'crystal', '#c8a0ff', '#e8d8ff', 3, 3.2, 1.25, 10, 'armor', 'crystal', 'crystal*4,@arcanite.plate*2', 5, 64, 'Duras como gemas: +6 de defensa mientras vuelas.'],
  ['wingDragon', 'Alas de dragón', 'membrane', '#a8302a', '#ffb04a', 3, 3.6, 1.38, 13, 'warm', 'dragonHeart', 'drakeScale*4,@dragonsteel.plate*2', 6, 96, 'Rápidas y enormes; dan calor (+10).'],
  ['wingStorm', 'Alas de tormenta', 'energy', '#f0f05a', '#5af0ff', 4, 3.8, 1.42, 11, 'storm', 'essenceStorm', 'griffinFeather*3,@copper.wire*4,manaCrystal', 6, 96, 'Caen rayos sobre los enemigos cercanos mientras vuelas.'],
  ['wingVoid', 'Alas del vacío', 'energy', '#3a1a6a', '#a060ff', 4, 4.2, 1.45, 10, 'phase', 'essenceVoid', 'voidCore,shadowPelt*2,@voidsteel.plate*2', 6, 128, 'Atraviesas lo construido y los enemigos casi no te ven.'],
  ['wingPhoenix', 'Alas del fénix eterno', 'flame', '#ff6a1a', '#fff060', 4, 5.0, 1.5, 9, 'phoenix', 'phoenixFeather', 'phoenixFeather*2,essenceFire*2,timeCrystal,dragonHeart', 7, 160, 'Fuego vivo: te curan rápido y queman a tu paso.'],
  ['wingInfinity', 'Alas del Infinito', 'cosmic', '#1a1a3a', '#f0c75e', 5, Infinity, 1.65, 6, 'infinite', 'singularity', 'timeCrystal*2,voidCore,phoenixFeather,@orichalcum.plate', 7, 200, 'Imposibles: vuelo sin fin, más rápidas que nada, iluminan y protegen.'],
];
const WINGS = {};
const wRes = s => { if (!s) return null; if (s.startsWith('@')) { const [m, f] = s.slice(1).split('.'); return (MF[m] && MF[m][f]) || null; } return ITEMS[s] ? s : null; };
for (const [id, n, style, c, c2, r, fly, spd, glide, power, core, teeth, tier, rpm, d] of WING_DEF) {
  WINGS[id] = { id, style, c, c2, r, fly, spd, glide, power };
  IT(id, n, c, 'gem', 9, `【${WING_RAR[r]}】 ${d} Vuelo: ${fly === Infinity ? 'infinito' : fly + ' s'} · velocidad ×${spd} · planeo ${glide <= 6 ? 'larguísimo' : glide <= 10 ? 'largo' : 'normal'}. Equípalas en la espalda (ranura de la capa) y mantén Espacio en el aire para volar.`);
  ITEMS[id].gear = { slot: 'back', mods: power === 'warm' ? { warm: 10 } : {} }; ITEMS[id].wings = 1; ITEMS[id].rar = Math.min(4, r);
  const c0 = wRes(core) || 'leather', tt = teeth.split(',').map(p => { const [x, k] = p.split('*'); return (wRes(x) || 'feather') + (k ? '*' + k : ''); });
  RX(id, c0, tt.slice(0, 5), rpm, tier);
}
// ---------- Impulsadores ----------
// [id, nombre, color, efecto, receta: núcleo, dientes, cuántos salen, tier, descripción]
// efecto: spd (multiplica la velocidad), t (segundos), fuel (recarga de vuelo, 0-1), y extras
const BOOST_DEF = [
  ['boostPaper', 'Cohete de papel', '#e8e0c8', { spd: 1.6, t: 1.5 }, 'paper', 'gunpowder', 6, 0, 'El cohete de siempre: un buen empujón.'],
  ['boostFirework', 'Cohete de fuegos artificiales', '#ff6b5b', { spd: 1.8, t: 2, spark: 1 }, 'paper', 'gunpowder,dye', 6, 1, 'Con chispas de colores.'],
  ['boostDouble', 'Cohete de doble carga', '#c83a2a', { spd: 2.2, t: 2 }, 'paper', 'gunpowder*2', 6, 1, 'Doble pólvora, doble susto.'],
  ['boostSteam', 'Vapor comprimido', '#c8d0d8', { fuel: 0.5, spd: 1.3, t: 1 }, '@iron.plate', 'water,coal', 4, 1, 'Recarga la mitad del vuelo.'],
  ['boostSpring', 'Muelle propulsor', '#a8acb4', { spd: 1.5, t: 3.5 }, 'spring', '@iron.nugget', 4, 1, 'Un empujón largo y suave.'],
  ['boostSpark', 'Cohete de chispas', '#ffd060', { spd: 1.8, t: 2, aura: 'fire', auraD: 8 }, 'paper', 'gunpowder,sulfur', 5, 2, 'Chispea y quema a los enemigos que rozas.'],
  ['boostWind', 'Frasco de viento', '#bfe8ff', { fuel: 1, spd: 1.2, t: 1 }, 'vial', 'feather*2', 4, 2, 'Recarga todo el vuelo de golpe.'],
  ['boostGriffin', 'Pluma encantada', '#c8a060', { spd: 1.6, t: 4.5, fuel: 0.3 }, 'griffinFeather', 'manaDust', 4, 3, 'Viento a favor durante un buen rato.'],
  ['boostFrost', 'Cohete de escarcha', '#8ad8ff', { spd: 1.8, t: 2, burst: 'frost' }, 'paper', 'gunpowder,ice', 5, 2, 'Al encenderlo congela a los enemigos cercanos.'],
  ['boostFire', 'Cohete ígneo', '#ff6a1a', { spd: 1.9, t: 2.2, aura: 'fire', auraD: 14 }, 'paper', 'gunpowder,essenceFire', 5, 3, 'Deja una estela de fuego que abrasa.'],
  ['boostBolt', 'Cohete de rayo', '#f0f05a', { spd: 2.4, t: 1.5, burst: 'storm' }, 'paper', 'gunpowder,@copper.wire', 5, 3, 'Rapidísimo; suelta rayos a los enemigos cercanos.'],
  ['boostCloud', 'Esencia de nube', '#ffffff', { glide: 10, t: 10 }, 'vial', 'feather,glowcap', 4, 2, 'Durante 10 s no gastas vuelo: flotas como una nube.'],
  ['boostTurbine', 'Turbina de bolsillo', '#c8a060', { spd: 2, t: 3 }, '@brass.gear', '@iron.plate,spring', 3, 3, 'Una hélice que gira sola.'],
  ['boostHeal', 'Cohete curativo', '#ff7a9a', { spd: 1.6, t: 2, heal: 30 }, 'paper', 'gunpowder,herbs*2', 5, 2, 'Empuja y te cura 30.'],
  ['boostMana', 'Cohete de maná', '#6a8aff', { spd: 1.8, t: 2, mana: 50 }, 'paper', 'gunpowder,manaDust*2', 5, 3, 'Empuja y te da 50 de maná.'],
  ['boostGhost', 'Cohete fantasma', '#d8e0ff', { spd: 1.8, t: 2.5, ghost: 1 }, 'paper', 'gunpowder,ectoplasm', 4, 3, 'Mientras dura, nada te hace daño.'],
  ['boostSmoke', 'Cohete de humo', '#7a7a80', { spd: 1.5, t: 2, stealth: 12 }, 'paper', 'gunpowder,coal*2', 5, 2, 'Te envuelve en humo: sigilo 12 s.'],
  ['boostMagnet', 'Cohete imán', '#c83a3a', { spd: 1.6, t: 3, magnet: 1 }, 'magnet', 'gunpowder', 4, 3, 'Atrae lo que hay en el suelo mientras vuelas.'],
  ['boostBlink', 'Cohete del vacío', '#a060ff', { blink: 8 }, 'essenceVoid', 'gunpowder,manaDust', 3, 4, 'Te teletransporta 8 casillas hacia donde miras.'],
  ['boostStar', 'Cohete estelar', '#fff6b0', { spd: 3, t: 2.5, fuel: 1, ghost: 1, spark: 1 }, 'manaCrystal', 'gunpowder*2,glowcap', 4, 5, 'El mejor: velocidad ×3, vuelo lleno e invulnerable un momento.'],
];
const BOOSTS = {};
for (const [id, n, c, fx, core, teeth, yieldN, tier, d] of BOOST_DEF) {
  BOOSTS[id] = { ...fx, c };
  const bits = []; if (fx.spd) bits.push(`velocidad ×${fx.spd} durante ${fx.t} s`); if (fx.fuel) bits.push(fx.fuel >= 1 ? 'recarga todo el vuelo' : `recarga ${Math.round(fx.fuel * 100)} % del vuelo`); if (fx.glide) bits.push('no gastas vuelo');
  IT(id, n, c, 'potion', 13, `${d} ${bits.join(' · ')}. Úsalo con F mientras vuelas (con alas, también te lanza a volar).`); ITEMS[id].boost = 1;
  const c0 = wRes(core) || 'paper', tt = teeth.split(',').map(p => { const [x, k] = p.split('*'); return (wRes(x) || 'gunpowder') + (k ? '*' + k : ''); });
  if (RX(id, c0, tt, 0, tier) && RECIPE_FOR[id]) RECIPE_FOR[id].n = yieldN;
}
// ---------- Fuerza de cada impulsador según lo complicado que es ----------
// Más nivel de taller = más rápido, más tiempo y más altura (el estelar es una bala que dura mucho)
const BOOST_TIER = {}, BOOST_TXT = {}; for (const d of BOOST_DEF) { BOOST_TIER[d[0]] = d[7]; BOOST_TXT[d[0]] = d[8]; }
for (const id in BOOSTS) {
  const B = BOOSTS[id], t = BOOST_TIER[id], star = id === 'boostStar';
  if (B.spd) { B.spd = +(B.spd * (1 + t * 0.18) + (star ? 1.5 : 0)).toFixed(2); B.t = +((B.t || 2) * (1.6 + t * 0.45)).toFixed(1); }
  if (B.glide) B.t = 10 + t * 3;
  B.climb = Math.min(160, 30 + t * 24 + (star ? 40 : 0)); B.lift = 45 + t * 22; // hasta cuánto te sube (px) y a qué ritmo
  const bits = []; if (B.spd) bits.push(`velocidad ×${B.spd} durante ${B.t} s`); if (B.fuel) bits.push(B.fuel >= 1 ? 'recarga todo el vuelo' : `recarga ${Math.round(B.fuel * 100)} % del vuelo`); if (B.glide) bits.push(`${B.t} s sin gastar vuelo`); bits.push(`te sube hasta ${Math.round(B.climb / 3)} m`);
  ITEMS[id].d = `${BOOST_TXT[id]} ${bits.join(' · ')}. Úsalo con F mientras vuelas (con alas, también te lanza a volar).`;
}
