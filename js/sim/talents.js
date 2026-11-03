'use strict';
// =====================================================================================
//  Árbol de talentos (tecla K): una constelación de nodos conectados por cada rama.
//  · 1 punto por cada nivel de personaje (el nivel es la suma de tus 10 habilidades: hasta 100 puntos).
//  · 6 ramas (Guerrero, Explorador, Arcano, Artesano, Superviviente y Piromante), 53 nodos cada una:
//    la Maestría de abajo (empieza por ella), bonos pequeños y medianos (atributos, críticos,
//    resistencias, efectos de estado…), 8 talentos grandes con rangos y el talento final arriba.
//  · Solo se aprende un nodo conectado a otro que ya tengas. El final pide además 20 puntos en su rama.
//  · Hay muchos más rangos que puntos: no se puede tenerlo todo, hay que elegir camino.
//  · Reiniciar: la primera vez es gratis; después cuesta monedas.
//  · Los talentos van con el personaje y, como los niveles, con la mochila de cada tipo de mundo
//    (con o sin trucos). Los atributos, críticos y resistencias están en sim/attributes.js.
// =====================================================================================
// Bonos que dan los nodos: [nombre, icono, formato] (n: número, p: porcentaje, m: multiplicador)
const TSTAT = { str: ['Fuerza', '💪', 'n'], dex: ['Destreza', '✋', 'n'], pow: ['Poder', '⚡', 'n'], spi: ['Espíritu', '✺', 'n'], end: ['Aguante', '🦶', 'n'], kno: ['Conocimiento', '📘', 'n'], con: ['Constitución', '❤', 'n'], dfn: ['Defensa', '🛡', 'n'], vig: ['Vigor', '💗', 'n'],
  critP: ['crítico físico', '🎯', 'p'], critM: ['crítico mágico', '🔮', 'p'], critD: ['daño crítico', '💥', 'p'], spell: ['poder de hechizos', '✨', 'p'], poise: ['aplomo', '⚓', 'n'], stagger: ['aturdimiento', '💫', 'n'], carry: ['carga máxima', '🎒', 'n'], mana: ['maná máximo', '💧', 'n'], luck: ['suerte', '🍀', 'p'], speed: ['velocidad', '👟', 'm'], work: ['velocidad de trabajo', '🔧', 'm'],
  resF: ['resistencia al fuego', '🔥', 'p'], resB: ['resistencia al sangrado', '🩸', 'p'], resP: ['resistencia al veneno', '☠', 'p'], resC: ['resistencia a la escarcha', '❄', 'p'], resV: ['resistencia al vacío', '🌀', 'p'], resPh: ['resistencia física', '🪨', 'p'], resW: ['resistencia salvaje', '🌿', 'p'],
  chBleed: ['probabilidad de sangrado', '🩸', 'p'], chBurn: ['probabilidad de quemar', '🔥', 'p'], chLight: ['probabilidad de marca de luz', '🌟', 'p'], chPoison: ['probabilidad de envenenar', '🧪', 'p'], chRoot: ['probabilidad de enraizar', '🌱', 'p'], chWeak: ['probabilidad de debilitar', '🥀', 'p'] };
const tsTxt = (k, v) => { const S0 = TSTAT[k]; if (!S0) return ''; const f = S0[2] === 'p' ? +(v * 100).toFixed(1) + ' %' : S0[2] === 'm' ? +((v - 1) * 100).toFixed(1) + ' %' : +v.toFixed(1); return `+${f} de ${S0[0]}`; };
// Ramas: Maestría (raíz), 8 talentos grandes [id, nombre, icono, rangos, efecto por rango, texto], talento final y bonos de sus nodos pequeños
const TAL_TREE = {
  war: { n: 'Guerrero', i: '⚔', c: '#ff7a5a', d: 'Golpes, aguante y armadura pesada.',
    root: ['tWarRoot', 'Maestría marcial', '⚔', 'Empieza la rama del Guerrero: +2 de Fuerza y +2 de Constitución.', { str: 2, con: 2 }],
    big: [['tBlood', 'Sed de sangre', '🩸', 3, k => ({ chBleed: 0.05 * k }), '+5 % de hacer sangrar al golpear'], ['tCrush', 'Aplastar', '🔨', 3, k => ({ stagger: 25 * k, critD: 0.08 * k }), '+25 de aturdimiento y +8 % de daño crítico'],
      ['tBrute', 'Fuerza bruta', '💪', 5, k => ({ melee: 1 + 0.03 * k }), '+3 % de daño cuerpo a cuerpo'], ['tHide', 'Piel dura', '🛡', 5, k => ({ def: k }), '+1 de defensa'],
      ['tVigor', 'Vigor', '❤', 5, k => ({ hp: 6 * k }), '+6 de vida máxima'], ['tShield', 'Escudero', '🔰', 3, k => ({ block: 0.02 * k }), '+2 % de bloquear un golpe'],
      ['tPain', 'Sin dolor', '😤', 3, k => ({ pain: 1 - 0.06 * k }), 'El dolor te afecta un 6 % menos'], ['tHeavy', 'Coloso de hierro', '⛓', 1, () => ({ heavyOk: 1 }), 'La armadura pesada y la carga ya no te frenan']],
    key: ['tWarlord', 'Señor de la batalla', '👑', () => ({ melee: 1.12, def: 5, hp: 20 }), 'Talento final: +12 % de daño, +5 de defensa y +20 de vida'],
    pool: [['str', 2], ['con', 2], ['resPh', 0.02], ['stagger', 8], ['chBleed', 0.02], ['dfn', 2], ['critD', 0.04], ['poise', 6]] },
  hunt: { n: 'Explorador', i: '🏹', c: '#7fd07a', d: 'Distancia, velocidad y caza.',
    root: ['tHuntRoot', 'Maestría del rastro', '🏹', 'Empieza la rama del Explorador: +2 de Destreza y +2 de Aguante.', { dex: 2, end: 2 }],
    big: [['tKeen', 'Puntería letal', '🎯', 5, k => ({ critP: 0.02 * k }), '+2 % de crítico físico'], ['tVenom', 'Puntas envenenadas', '🧪', 3, k => ({ chPoison: 0.05 * k, chRoot: 0.02 * k }), '+5 % de envenenar y +2 % de enraizar'],
      ['tHawk', 'Ojo de halcón', '🦅', 5, k => ({ ranged: 1 + 0.03 * k }), '+3 % de daño a distancia'], ['tFeet', 'Pies ligeros', '👟', 5, k => ({ speed: 1 + 0.02 * k }), '+2 % de velocidad'],
      ['tDash', 'Impulso', '💨', 3, k => ({ dash: 1 - 0.06 * k }), 'El impulso se recarga un 6 % antes'], ['tRun', 'Carrera de fondo', '🏃', 3, k => ({ sprintCost: 1 - 0.07 * k }), 'Correr cansa un 7 % menos'],
      ['tTrack', 'Rastreador', '🐾', 3, k => ({ hunt: 1 + 0.06 * k, tame: 1 + 0.04 * k }), '+6 % de caza y +4 % de domar'], ['tStealth', 'Sigilo', '🌫', 3, k => ({ detect: 1 - 0.06 * k }), 'Los enemigos te ven un 6 % menos']],
    key: ['tNorth', 'Viento del norte', '🌪', () => ({ ranged: 1.15, speed: 1.06, reach: 1.1 }), 'Talento final: +15 % a distancia, +6 % de velocidad y más alcance'],
    pool: [['dex', 2], ['end', 2], ['critP', 0.01], ['chPoison', 0.02], ['resW', 0.03], ['chRoot', 0.015], ['speed', 1.01], ['critD', 0.03]] },
  arc: { n: 'Arcano', i: '✦', c: '#b48cff', d: 'Maná, magia y conocimiento.',
    root: ['tArcRoot', 'Maestría arcana', '✦', 'Empieza la rama Arcana: +2 de Poder y +2 de Espíritu.', { pow: 2, spi: 2 }],
    big: [['tFocus', 'Concentración', '🧿', 5, k => ({ critM: 0.02 * k, spell: 0.02 * k }), '+2 % de crítico mágico y +2 % de poder de hechizos'], ['tLight', 'Marca de luz', '🌟', 3, k => ({ chLight: 0.06 * k, resV: 0.04 * k }), '+6 % de marcar con luz y +4 % de resistencia al vacío'],
      ['tWell', 'Pozo de maná', '💧', 5, k => ({ mana: 10 * k }), '+10 de maná máximo'], ['tFlow', 'Flujo arcano', '🌀', 5, k => ({ manaRegen: 1 + 0.06 * k }), '+6 % de recarga de maná'],
      ['tScholar', 'Erudito', '📚', 3, k => ({ xp: 1 + 0.04 * k }), '+4 % de experiencia'], ['tSight', 'Visión mística', '👁', 3, k => ({ night: 0.08 * k }), 'Ves mejor de noche'],
      ['tFlame', 'Llama interior', '🕯', 3, k => ({ warm: 3 * k }), '+3 de abrigo (te protege del frío)'], ['tWard', 'Piel rúnica', '🔮', 3, k => ({ gdef: k, def: k }), '+1 de defensa mágica']],
    key: ['tArch', 'Archimago', '🌌', () => ({ mana: 60, manaRegen: 1.25, xp: 1.05, spell: 0.1 }), 'Talento final: +60 de maná, +25 % de recarga, +10 % a hechizos y +5 % de experiencia'],
    pool: [['pow', 2], ['spi', 2], ['kno', 2], ['critM', 0.01], ['resV', 0.03], ['chLight', 0.02], ['resC', 0.02], ['mana', 5]] },
  craft: { n: 'Artesano', i: '⚙', c: '#ffd34a', d: 'Picar, talar, fabricar y comerciar.',
    root: ['tCraftRoot', 'Maestría del taller', '⚙', 'Empieza la rama del Artesano: +2 de Conocimiento y +2 de Fuerza.', { kno: 2, str: 2 }],
    big: [['tPack', 'Mula de carga', '🎒', 3, k => ({ carry: 8 * k, poise: 10 * k }), '+8 de carga máxima y +10 de aplomo'], ['tForge', 'Forjado a fuego', '🔥', 3, k => ({ def: 2 * k, resPh: 0.03 * k, resF: 0.03 * k }), '+2 de defensa y +3 % de resistencia física y al fuego'],
      ['tMiner', 'Minero', '⛏', 5, k => ({ mine: 1 + 0.06 * k }), 'Picas un 6 % más rápido'], ['tLogger', 'Leñador', '🪓', 5, k => ({ wood: 1 + 0.06 * k }), 'Talas un 6 % más rápido'],
      ['tHands', 'Manos hábiles', '🔧', 5, k => ({ work: 1 + 0.04 * k }), 'Trabajas un 4 % más rápido'], ['tThrift', 'Ahorro', '♻', 3, k => ({ craftKeep: 0.03 * k }), '+3 % de recuperar el núcleo al fabricar'],
      ['tLearn', 'Aprendiz aplicado', '📐', 3, k => ({ xpCraft: 1 + 0.08 * k }), '+8 % de experiencia al fabricar y construir'], ['tHaggle', 'Regateo', '🪙', 3, k => ({ price: 1 - 0.04 * k }), 'Los comerciantes te cobran un 4 % menos']],
    key: ['tMaster', 'Maestro del Taller', '🏭', () => ({ work: 1.15, mine: 1.15, wood: 1.15, craftKeep: 0.1 }), 'Talento final: trabajas, picas y talas un 15 % más rápido y +10 % de ahorro'],
    pool: [['kno', 2], ['str', 2], ['end', 2], ['dfn', 2], ['carry', 4], ['resPh', 0.015], ['luck', 0.01], ['work', 1.01]] },
  surv: { n: 'Superviviente', i: '🌿', c: '#5ad8ff', d: 'Hambre, heridas, curación y mascotas.',
    root: ['tSurvRoot', 'Maestría de la supervivencia', '🌿', 'Empieza la rama del Superviviente: +2 de Vigor y +2 de Constitución.', { vig: 2, con: 2 }],
    big: [['tThick', 'Sangre espesa', '🫀', 3, k => ({ resB: 0.06 * k, resP: 0.06 * k }), '+6 % de resistencia al sangrado y al veneno'], ['tWither', 'Toque marchito', '🥀', 3, k => ({ chWeak: 0.05 * k, resW: 0.04 * k }), '+5 % de debilitar al golpear y +4 % de resistencia salvaje'],
      ['tStomach', 'Estómago de hierro', '🍖', 5, k => ({ hunger: 1 - 0.06 * k }), 'El hambre llega un 6 % más despacio'], ['tCamel', 'Sediento no', '💦', 5, k => ({ thirst: 1 - 0.06 * k }), 'La sed llega un 6 % más despacio'],
      ['tHealer', 'Sanador', '✚', 5, k => ({ heal: 1 + 0.06 * k }), 'Te curas un 6 % más rápido'], ['tClot', 'Coagulación', '🩹', 3, k => ({ bleed: 1 - 0.1 * k }), 'Sangras un 10 % menos'],
      ['tImmune', 'Inmune', '🦠', 3, k => ({ sick: 1 - 0.1 * k }), 'Enfermas un 10 % menos'], ['tBeast', 'Amigo de las bestias', '🐺', 3, k => ({ tame: 1 + 0.08 * k, petHp: 1 + 0.08 * k }), '+8 % de domar y de vida de tus mascotas']],
    key: ['tIndom', 'Indomable', '🗿', () => ({ hp: 30, heal: 1.2, wound: 0.85, luck: 0.03 }), 'Talento final: +30 de vida, +20 % de curación, heridas más leves y +3 % de suerte'],
    pool: [['vig', 2], ['con', 2], ['resP', 0.03], ['resB', 0.03], ['resC', 0.03], ['chWeak', 0.02], ['end', 2], ['resW', 0.02]] },
  pyro: { n: 'Piromante', i: '🔥', c: '#ff9a2a', d: 'Fuego, quemaduras y daño mágico.',
    root: ['tPyroRoot', 'Maestría del fuego', '🔥', 'Empieza la rama del Piromante: +2 de Poder y +5 % de resistencia al fuego.', { pow: 2, resF: 0.05 }],
    big: [['tEmber', 'Ascuas', '🌋', 5, k => ({ chBurn: 0.04 * k }), '+4 % de quemar al golpear'], ['tInferno', 'Infierno', '☄', 3, k => ({ spell: 0.05 * k, critM: 0.01 * k }), '+5 % de poder de hechizos y +1 % de crítico mágico'],
      ['tKindle', 'Prender', '🕯', 3, k => ({ chBurn: 0.03 * k, critM: 0.01 * k }), '+3 % de quemar y +1 % de crítico mágico'], ['tAsh', 'Piel de ceniza', '🌫', 5, k => ({ resF: 0.06 * k }), '+6 % de resistencia al fuego'],
      ['tBlaze', 'Llamarada', '💥', 3, k => ({ critD: 0.08 * k }), '+8 % de daño crítico'], ['tHearth', 'Hogar', '🏮', 3, k => ({ warm: 3 * k, resC: 0.05 * k }), '+3 de abrigo y +5 % de resistencia a la escarcha'],
      ['tCinder', 'Ceniza viva', '✴', 3, k => ({ spi: 3 * k, mana: 10 * k }), '+3 de Espíritu y +10 de maná'], ['tSmolder', 'Brasa lenta', '♨', 3, k => ({ vig: 3 * k, heal: 1 + 0.05 * k }), '+3 de Vigor y +5 % de curación']],
    key: ['tPhoenix', 'Fénix', '🐦‍🔥', () => ({ resF: 0.25, chBurn: 0.1, spell: 0.15, hp: 40 }), 'Talento final: +25 % de resistencia al fuego, +10 % de quemar, +15 % a hechizos y +40 de vida'],
    pool: [['pow', 2], ['chBurn', 0.02], ['resF', 0.03], ['critM', 0.01], ['spi', 2], ['vig', 2], ['critD', 0.03], ['resC', 0.02]] },
};
const TAL_KEY_NEED = 20;
// Plantilla de la constelación (centro y lado izquierdo; el derecho es su espejo): [hueco, x, y, tipo, vecinos]
const TAL_TPL = [
  ['root', 500, 840, 'root', []], ['c1', 500, 742, 'min', ['root']], ['c2', 500, 645, 'big', ['c1', 'r4']], ['r4', 500, 548, 'min', []], ['c3', 500, 440, 'big', ['r4']], ['c4', 500, 335, 'min', ['c3']], ['key', 500, 222, 'key', ['c4']],
  ['q1L', 431, 714, 'min', ['c1']], ['q2L', 403, 645, 'min', ['q1L']], ['q3L', 431, 576, 'min', ['q2L', 'r4']],
  ['a1L', 412, 840, 'min', ['root']], ['a2L', 328, 840, 'min', ['a1L']], ['a3L', 240, 818, 'med', ['a2L']], ['a4L', 140, 792, 'min', ['a3L']], ['a6L', 285, 728, 'min', ['a3L']], ['a7L', 300, 620, 'big', ['a6L', 'q2L']],
  ['a8L', 318, 512, 'min', ['a7L']], ['a9L', 330, 405, 'big', ['a8L', 'a13L']], ['a13L', 415, 445, 'min', ['q3L', 'c3']], ['a10L', 320, 315, 'min', ['a9L']], ['a11L', 335, 228, 'min', ['a10L', 'a20L']], ['a12L', 372, 135, 'med', ['a11L', 'a21L']], ['a21L', 436, 185, 'min', ['key']],
  ['a14L', 160, 690, 'min', ['a3L', 'a4L']], ['a15L', 172, 578, 'big', ['a14L']], ['a16L', 100, 495, 'min', ['a15L']], ['a17L', 82, 392, 'med', ['a16L']], ['a18L', 205, 468, 'min', ['a15L']], ['a19L', 215, 358, 'min', ['a18L']], ['a20L', 228, 252, 'med', ['a19L']],
];
const TAL_BIG_SLOTS = ['c2', 'c3', 'a7L', 'a7R', 'a9L', 'a9R', 'a15L', 'a15R'];
const TAL = {}, TALN = {}, TALE = {};
{ const tpl = TAL_TPL.map(([s, x, y, k, nb]) => ({ s, x, y, k, nb })), mir = s => s.endsWith('L') ? s.slice(0, -1) + 'R' : s;
  for (const n of TAL_TPL) if (n[0].endsWith('L')) tpl.push({ s: mir(n[0]), x: 1000 - n[1], y: n[2], k: n[3], nb: n[4].map(mir) });
  for (const br in TAL_TREE) { const B = TAL_TREE[br], slot = {}; let mi = 0, me = 0; TALN[br] = [];
    for (const n of tpl) { let t;
      if (n.k === 'root') { const [id, nm, i, d, fx] = B.root; t = { id, n: nm, i, max: 1, fx: () => fx, d }; }
      else if (n.k === 'key') { const [id, nm, i, fx, d] = B.key; t = { id, n: nm, i, max: 1, fx, d }; }
      else if (n.k === 'big') { const [id, nm, i, max, fx, d] = B.big[TAL_BIG_SLOTS.indexOf(n.s)]; t = { id, n: nm, i, max, fx, d }; }
      else { const med = n.k === 'med', [st, v0] = B.pool[med ? (me++ * 3 + 1) % B.pool.length : mi++ % B.pool.length], v = !med ? v0 : TSTAT[st][2] === 'm' ? 1 + (v0 - 1) * 2.5 : TSTAT[st][2] === 'p' ? v0 * 2.5 : Math.round(v0 * 2.5);
        t = { id: br + ':' + n.s, n: med ? `${TSTAT[st][0][0].toUpperCase() + TSTAT[st][0].slice(1)} mayor` : TSTAT[st][0][0].toUpperCase() + TSTAT[st][0].slice(1), i: TSTAT[st][1], max: 1, fx: () => ({ [st]: v }), d: tsTxt(st, v) }; }
      Object.assign(t, { br, kind: n.k, x: n.x, y: n.y, slot: n.s, nb: [] }); TAL[t.id] = t; slot[n.s] = t; TALN[br].push(t); }
    const E = TALE[br] = [];
    for (const n of tpl) for (const o of n.nb) { const a = slot[n.s], b = slot[o]; a.nb.push(b.id); b.nb.push(a.id); E.push([a.id, b.id]); }
    // Anillo central: cada nodo con el siguiente
    const ring = ['c1', 'q1L', 'q2L', 'q3L', 'r4', 'q3R', 'q2R', 'q1R'];
    ring.forEach((s, i) => { const a = slot[s], b = slot[ring[(i + 1) % ring.length]]; if (!a.nb.includes(b.id)) { a.nb.push(b.id); b.nb.push(a.id); E.push([a.id, b.id]); } });
  } }
if (typeof CH_KEYS !== 'undefined' && !CH_KEYS.includes('talents')) CH_KEYS.push('talents'); // van con el personaje (y con la mochila de cada tipo de mundo)
if (typeof PERSONAL !== 'undefined') PERSONAL.add('talents');
const talData = () => S.talents || (S.talents = {});
const talSpent = br => { const T0 = talData(); let s = 0; for (const id in T0) if (TAL[id] && (!br || TAL[id].br === br)) s += T0[id]; return s; };
const talPts = () => Math.max(0, (S && S.pc ? charLevel() - 1 : 0) - talSpent());
const talHas = id => (talData()[id] | 0) > 0;
const talReach = t => t.kind === 'root' || talHas(t.id) || t.nb.some(talHas);
const talWhy = t => { const k = talData()[t.id] | 0; if (k >= t.max) return 'Ya tiene todos sus rangos'; if (!talReach(t)) return 'Aprende antes un talento conectado'; if (t.kind === 'key' && talSpent(t.br) < TAL_KEY_NEED) return `Gasta antes ${TAL_KEY_NEED} puntos en ${TAL_TREE[t.br].n} (llevas ${talSpent(t.br)})`; if (talPts() < 1) return 'No te quedan puntos: sube de nivel tus habilidades'; return ''; };
// Para charMods (sim/character.js): pares [mod, valor]
function talMods() { const r = []; if (!S || !S.talents) return r; for (const id in S.talents) { const t = TAL[id], k = S.talents[id] | 0; if (!t || !k) continue; const m = t.fx(Math.min(k, t.max)); for (const key in m) r.push([key, m[key]]); } return r; }
const talDirty = () => { _cm = null; _cmKey = ''; vitalsDirty = true; }; // que el personaje vuelva a calcular sus estadísticas
function talBuy(id) {
  const t = TAL[id], T0 = talData(), k = T0[id] | 0; if (!t) return false;
  const why = talWhy(t); if (why) { toastErr(why); tone(160, 0.12, 'square', 0.03, 0.8); return false; }
  T0[id] = k + 1; talDirty(); tone(520 + k * 80, 0.12, 'triangle', 0.05, 1.3); tone(780 + k * 60, 0.1, 'sine', 0.03, 1.2, 0.08);
  if (t.kind === 'key') { tone(880, 0.3, 'triangle', 0.05, 1.2, 0.12); wvBanner(`${t.i} ${t.n}`, 'Talento final desbloqueado', TAL_TREE[t.br].c, 3); sparkRing(S.player.x, S.player.y, 40, TAL_TREE[t.br].c, 140, { up: 50, life: 1 }); }
  advRender(); tlwRender(); tlwBurst(t); return true;
}
const talResetCost = () => (S.talReset ? 25 * talSpent() : 0);
function talReset() { const cost = talResetCost(), n = talSpent(); if (!n) return; if (invCount('coin') < cost) { toastErr(`Reiniciar cuesta ${cost} monedas`); return; } if (cost) invTake('coin', cost); S.talents = {}; S.talReset = (S.talReset || 0) + 1; talDirty(); toast(`🌳 Talentos reiniciados: recuperas ${n} puntos${cost ? ` (−${cost} monedas)` : ' (la primera vez es gratis)'}`); advRender(); tlwRender(); }
// Aviso al subir de nivel (y los atributos vuelven a calcularse)
{ const g0 = gainXP; gainXP = (k, n) => { const before = S && S.pc ? charLevel() : 0; const r = g0(k, n); if (S && S.pc && charLevel() > before) { talDirty(); setTimeout(() => toast(`🌳 ¡Punto de talento! Tienes ${talPts()} para gastar (tecla K)`, true), 900); } return r; }; }

// =====================================================================================
//  Ventana del árbol (K)
// =====================================================================================
const TLW = { br: 'war', sel: null, hov: null, view: 'tree', vb: null, drag: null, sure: 0, fx: [], raf: 0, t: 0, panT: 0 };
const TLW_VB = { x: 0, y: 0, w: 1000, h: 910 };
{ const m = document.createElement('div'); m.id = 'mTal'; m.className = 'modal tlwm'; m.hidden = true;
  m.innerHTML = `<div class="tlw">
    <nav class="tlnav"><kbd data-tlnav="prev">‹</kbd><button data-tlnav="char">Personaje</button><button data-tlnav="inv">Inventario</button><button data-tlnav="tree" class="on">Árbol de talentos</button><button data-tlnav="skills">Habilidades</button><button data-tlnav="adv">Aventura</button><button data-tlnav="quest">Encargos</button><button data-tlnav="map">Mapa</button><kbd data-tlnav="next">›</kbd></nav>
    <aside class="tlL" id="tlL"></aside>
    <main class="tlC" id="tlC"><div class="tlbr" id="tlBr"></div><canvas id="tlFx"></canvas><svg id="tlSvg" preserveAspectRatio="xMidYMid meet"></svg><div class="tlsk" id="tlSk" hidden></div><div class="tltip" id="tlTip" hidden></div></main>
    <aside class="tlR" id="tlR"></aside>
    <footer class="tlfoot"><span><kbd>🖱</kbd> Seleccionar · <kbd>Rueda</kbd> Zoom · <kbd>Arrastrar</kbd> Mover</span><span><kbd>Clic ×2</kbd><kbd>Enter</kbd> Aprender</span><span><kbd>Q</kbd><kbd>E</kbd> Rama</span><button data-tlreset id="tlReset"></button><span data-close class="tlclose"><kbd>K</kbd> Cerrar</span></footer>
  </div>`;
  document.body.appendChild(m); MODALS.tal = 'mTal';
  m.addEventListener('mousedown', e => { if (e.target === m || e.target.closest('[data-close]')) closeModal(); }); }
function tlwOpen(br) { if (!S) return; if (!S.pc) { toast('Los talentos se ganan subiendo de nivel en un mundo con supervivencia'); return; } if (br) TLW.br = br; TLW.view = 'tree'; TLW.vb = { ...TLW_VB }; openModal('tal'); tlwRender(); tlwLoop(); }
const tlwOn = () => ui.open === 'tal';
// Estado de cada nodo: full, got (aprendido), can (se puede aprender), near (conectado pero sin puntos o bloqueado), lock
const tlSt = t => { const k = talData()[t.id] | 0; return k >= t.max ? 'full' : k ? 'got' : !talWhy(t) ? 'can' : talReach(t) ? 'near' : 'lock'; };
const TL_R = { root: 50, key: 44, big: 34, med: 23, min: 15 };
// Línea con algo de quiebro (como una grieta de lava), siempre igual para el mismo par
function tlPath(a, b) { let h = 0; for (const c of a.id + b.id) h = (h * 31 + c.charCodeAt(0)) >>> 0; const r = () => ((h = (h * 1103515245 + 12345) >>> 0) >>> 8) / 16777216 - 0.5;
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, j = Math.min(9, L * 0.08);
  const p1 = [a.x + dx / 3 + nx * r() * j, a.y + dy / 3 + ny * r() * j], p2 = [a.x + dx * 2 / 3 + nx * r() * j, a.y + dy * 2 / 3 + ny * r() * j];
  return `M${a.x} ${a.y}L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}L${p2[0].toFixed(1)} ${p2[1].toFixed(1)}L${b.x} ${b.y}`; }
function tlwSvg() {
  const br = TLW.br, B = TAL_TREE[br], N = TALN[br], T0 = talData();
  let h = 0; for (const c of br) h = (h * 31 + c.charCodeAt(0)) >>> 0; const rnd = () => ((h = (h * 1103515245 + 12345) >>> 0) >>> 8) / 16777216;
  // Fondo: grietas de lava que salen de la Maestría
  let cracks = ''; for (let i = 0; i < 26; i++) { let x = 500 + (rnd() - 0.5) * 120, y = 900, a = -Math.PI / 2 + (rnd() - 0.5) * 2.6, d = 'M' + x.toFixed(0) + ' ' + y; const n = 4 + (rnd() * 6 | 0); for (let j = 0; j < n; j++) { a += (rnd() - 0.5) * 0.9; const l = 30 + rnd() * 70; x += Math.cos(a) * l; y += Math.sin(a) * l; d += 'L' + x.toFixed(0) + ' ' + y.toFixed(0); } cracks += `<path d="${d}" class="tlcrack" style="stroke-width:${(0.6 + rnd() * 2.4).toFixed(1)}"/>`; }
  const own = id => (T0[id] | 0) > 0;
  const edges = TALE[br].map(([a, b]) => { const A = TAL[a], Bn = TAL[b], la = own(a), lb = own(b), cls = la && lb ? 'lit' : la || lb ? 'half' : 'dim', d = tlPath(A, Bn);
    return cls === 'lit' ? `<path d="${d}" class="tle glow"/><path d="${d}" class="tle lit"/><path d="${d}" class="tle flow"/>` : `<path d="${d}" class="tle ${cls}"/>`; }).join('');
  const nodes = N.map(t => { const s = tlSt(t), R = TL_R[t.kind], k = T0[t.id] | 0, big = t.kind !== 'min';
    const pips = t.max > 1 ? Array.from({ length: t.max }, (_, j) => { const a = Math.PI / 2 + (j - (t.max - 1) / 2) * 0.32; return `<circle class="tlpp ${j < k ? 'on' : ''}" cx="${(Math.cos(a) * (R + 9)).toFixed(1)}" cy="${(Math.sin(a) * (R + 9)).toFixed(1)}" r="3.2"/>`; }).join('') : '';
    return `<g class="tn k-${t.kind} st-${s} ${TLW.sel === t.id ? 'sel' : ''}" data-tn="${t.id}" transform="translate(${t.x} ${t.y})">
      <circle class="halo" r="${R + 12}"/>${t.kind === 'root' || t.kind === 'key' ? `<circle class="orb" r="${R + 7}"/>` : ''}
      <circle class="rim" r="${R}"/><circle class="core" r="${R - (big ? 4 : 2.5)}"/>
      <text class="ic" y="${(R * 0.34).toFixed(1)}" style="font-size:${(R * (t.kind === 'min' ? 1.05 : 0.95)).toFixed(0)}px">${t.i}</text>${pips}</g>`; }).join('');
  return `<defs>
      <radialGradient id="tlBg" cx="50%" cy="78%" r="75%"><stop offset="0" stop-color="${B.c}" stop-opacity=".22"/><stop offset=".35" stop-color="#2a140a" stop-opacity=".5"/><stop offset="1" stop-color="#080605" stop-opacity="0"/></radialGradient>
      <radialGradient id="tlCoreG" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#4a2c18"/><stop offset=".7" stop-color="#1c120c"/><stop offset="1" stop-color="#0c0806"/></radialGradient>
      <radialGradient id="tlCoreL" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="${B.c}" stop-opacity=".95"/><stop offset=".55" stop-color="#5a2a10"/><stop offset="1" stop-color="#1a0c06"/></radialGradient>
      <linearGradient id="tlRim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe6a8"/><stop offset=".5" stop-color="#e09a3a"/><stop offset="1" stop-color="#8a4a12"/></linearGradient>
      <filter id="tlGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
    </defs>
    <rect x="-600" y="-400" width="2200" height="1800" fill="url(#tlBg)"/>
    <text x="500" y="640" class="tlemb">${B.i}</text>
    <g class="tlcracks" style="--tc:${B.c}">${cracks}</g>
    <g class="tledges" style="--tc:${B.c}">${edges}</g>
    <g class="tlnodes" style="--tc:${B.c}">${nodes}</g>`;
}
function tlwApplyVB() { const v = TLW.vb || TLW_VB, s = $('tlSvg'); if (s) s.setAttribute('viewBox', `${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${v.h.toFixed(1)}`); }
function tlwRender() {
  if (!tlwOn()) return; const B = TAL_TREE[TLW.br];
  $('mTal').style.setProperty('--tc', B.c);
  document.querySelectorAll('[data-tlnav]').forEach(b => b.classList.toggle('on', b.dataset.tlnav === TLW.view || (TLW.view === 'tree' && b.dataset.tlnav === 'tree')));
  $('tlBr').innerHTML = `<kbd>Q</kbd>${Object.entries(TAL_TREE).map(([k, b]) => `<button class="${k === TLW.br ? 'on' : ''}" data-tlbr="${k}" style="--bc:${b.c}" title="${esc(b.n)}: ${esc(b.d)}"><span>${b.i}</span><small>${talSpent(k) || ''}</small></button>`).join('')}<kbd>E</kbd><div class="tlbrn"><b>${esc(B.n)}</b><small>${esc(B.d)}</small></div>`;
  const tree = TLW.view === 'tree'; $('tlSvg').style.display = tree ? '' : 'none'; $('tlFx').style.display = tree ? '' : 'none'; $('tlBr').style.display = tree ? '' : 'none'; $('tlSk').hidden = tree;
  if (tree) { $('tlSvg').innerHTML = tlwSvg(); tlwApplyVB(); } else $('tlSk').innerHTML = tlwSkills();
  const cost = talResetCost(); $('tlReset').disabled = !talSpent(); $('tlReset').textContent = TLW.sure ? '¿Seguro? Pulsa otra vez' : `↺ Reiniciar${cost ? ` (${cost} 🪙)` : ' (gratis la 1.ª vez)'}`;
  tlwPanels(); tlwTip();
}
// ---------- Paneles de estadísticas ----------
const tlPct = (v, d = 1) => (v * 100).toFixed(d).replace(/\.0$/, '') + '%';
const tlRow = (a, b, c) => `<div class="tlst"${c ? ` style="--ic:${c}"` : ''}><span>${a}</span><b>${b}</b></div>`;
function tlwPanels() {
  if (!tlwOn() || typeof statSheet !== 'function') return; const X = statSheet(), m = X.m, pc = S.pc;
  $('tlL').innerHTML = `<div class="tlpn tlname"><h2>${esc(S.char && S.char.name || (typeof NET !== 'undefined' && NET.me && NET.me.name) || 'Aventurero')}</h2><small>${esc(TAL_TREE[TLW.br].n)}</small></div>
    <div class="tlpn"><h3>Recursos</h3>${tlRow('Vida', `${Math.round(pc.hp)} / ${Math.round(maxHp())}`)}${tlRow('Maná', `${Math.round(pc.mana || 0)} / ${Math.round(maxMana())}`)}${tlRow('Aguante', `${Math.round(pc.stam)} / ${Math.round(maxStam())}`)}${tlRow('Recarga de aguante', `${X.stamRegen.toFixed(1)}/s`)}${tlRow('Puntos de combo', `${X.combo} / 5`)}${tlRow('Adrenalina', `${Math.round(X.adr)} / 100${X.fury ? ' 🔥' : ''}`)}${tlRow('Carga de equipo', `${m.load.toFixed(1)} / ${m.loadMax.toFixed(1)} (${Math.round(m.load / m.loadMax * 100)}%)`, m.load > m.loadMax ? '#ff7a5a' : '')}</div>
    <div class="tlpn"><h3>Atributos</h3>${Object.entries(ATTR).map(([k, [n, i, c]]) => `<div class="tlst tlat" title="${esc(ATTR_TIP[k])}"><span><i style="color:${c}">${i}</i>${n}</span><b>${X.B[k] + Math.round(m[k] || 0)}${m[k] ? `<em>+${Math.round(m[k])}</em>` : ''}</b></div>`).join('')}</div>
    <div class="tlpn"><h3>Efectos al golpear</h3>${[['chBleed', 'Sangrado'], ['chBurn', 'Quemadura'], ['chLight', 'Marca de luz'], ['chPoison', 'Veneno'], ['chRoot', 'Enraizar'], ['chWeak', 'Debilidad']].map(([k, n]) => tlRow(n, tlPct(m[k]))).join('')}</div>`;
  $('tlR').innerHTML = `<div class="tlpn tllv"><h2>Nivel ${charLevel()}</h2><div class="tlpt ${talPts() ? 'have' : ''}"><span>Puntos de talento:</span><b>${talPts()}</b></div>${tlRow('Esencia', X.ess.toLocaleString('es-ES'))}${tlRow('Para el siguiente nivel', X.need ? X.need.toLocaleString('es-ES') : '—')}</div>
    <div class="tlpn"><h3>Ofensiva</h3>${tlRow('Daño de arma', Math.round(X.wd))}${tlRow('Poder de hechizos', Math.round(100 * (1 + m.spell) * (1 + 0.05 * lvOf('combat'))))}${tlRow('Fuerza espiritual', Math.round(X.spirit))}${tlRow('Aplomo', Math.round(m.poise))}${tlRow('Aturdimiento', Math.round(m.stagger))}${tlRow('Crítico físico', tlPct(m.critP))}${tlRow('Crítico mágico', tlPct(m.critM))}${tlRow('Daño crítico', tlPct(m.critD, 0))}</div>
    <div class="tlpn"><h3>Protección</h3>${tlRow('Armadura', Math.round(m.def))}${tlRow('Bloqueo', tlPct(m.block))}${tlRow('Reducción de control', tlPct(m.ccRed))}</div>
    <div class="tlpn"><h3>Resistencias</h3>${RES_LIST.map(([k, n, i, c]) => `<div class="tlst"><span><i style="color:${c}">${i}</i>${n}</span><b>${tlPct(m[k])}</b></div>`).join('')}</div>`;
}
// Vista de habilidades: de dónde salen los niveles (y los puntos)
function tlwSkills() {
  const pc = S.pc; return `<h3>Habilidades</h3><p class="mut">Cada nivel de habilidad sube 1 el nivel de personaje y te da 1 punto de talento. Tus habilidades también fijan tus atributos de base.</p><div class="tlskg">${Object.entries(SKILLS).map(([k, [n, i, d]]) => { const lv = pc.lv[k] || 0, xp = pc.xp[k] || 0, need = lv >= MAX_LV ? 0 : xpNeed(lv);
    return `<div class="tlskc"><span class="i">${i}</span><div><b>${n} <em>${lv} / ${MAX_LV}</em></b><small>${esc(d)}</small><div class="tlxb"><i style="transform:scaleX(${need ? Math.min(1, xp / need).toFixed(3) : 1})"></i></div><small>${need ? `${Math.floor(xp)} / ${need} de experiencia` : 'Nivel máximo'}</small></div></div>`; }).join('')}</div>`;
}
// ---------- Tooltip ----------
function tlwTip() {
  const tip = $('tlTip'), id = TLW.hov || TLW.sel, t = id && TAL[id]; if (!tip) return;
  if (!t || TLW.view !== 'tree' || TLW.drag && TLW.drag.moved) { tip.hidden = true; return; }
  const k = talData()[t.id] | 0, why = talWhy(t), fx = t.fx(Math.max(1, k)), tot = Object.keys(fx).length && t.max > 1 && k ? Object.entries(fx).map(([s, v]) => TSTAT[s] ? tsTxt(s, v) : '').filter(Boolean).join(' · ') : '';
  tip.innerHTML = `<h4>${t.i} ${esc(t.n)}</h4><div class="ttc">${t.max > 1 ? `Rango ${k} / ${t.max} · 1 punto por rango` : k ? 'Aprendido' : '1 punto de talento'}${t.kind === 'key' ? ' · Talento final' : t.kind === 'root' ? ' · Inicio de la rama' : ''}</div>
    <p class="ttg">${esc(t.d)}${t.max > 1 ? ' (por rango)' : ''}</p>${tot ? `<p class="ttt">Ahora: ${esc(tot)}</p>` : ''}${why && k < t.max ? `<p class="ttr">${esc(why)}</p>` : k < t.max ? `<p class="tta">${TLW.sel === t.id ? 'Pulsa otra vez o Enter para aprender' : 'Clic para seleccionar · doble clic para aprender'}</p>` : ''}`;
  tip.hidden = false;
  const p = tlwToScreen(t.x, t.y), C = $('tlC').getBoundingClientRect(), w = tip.offsetWidth, hh = tip.offsetHeight, R = TL_R[t.kind] * p.s;
  let x = p.x + R + 14, y = p.y - hh / 2; if (x + w > C.width - 8) x = p.x - R - 14 - w; x = Math.max(8, Math.min(C.width - w - 8, x)); y = Math.max(8, Math.min(C.height - hh - 8, y));
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
// Coordenadas del árbol → píxeles dentro del panel central
function tlwToScreen(x, y) { const s = $('tlSvg'), r = s.getBoundingClientRect(), C = $('tlC').getBoundingClientRect(), v = TLW.vb || TLW_VB, sc = Math.min(r.width / v.w, r.height / v.h), ox = (r.width - v.w * sc) / 2, oy = (r.height - v.h * sc) / 2;
  return { x: r.left - C.left + ox + (x - v.x) * sc, y: r.top - C.top + oy + (y - v.y) * sc, s: sc }; }
function tlwFromScreen(px, py) { const s = $('tlSvg'), r = s.getBoundingClientRect(), v = TLW.vb || TLW_VB, sc = Math.min(r.width / v.w, r.height / v.h), ox = (r.width - v.w * sc) / 2, oy = (r.height - v.h * sc) / 2;
  return { x: v.x + (px - r.left - ox) / sc, y: v.y + (py - r.top - oy) / sc, s: sc }; }
// ---------- Efectos: brasas que suben y chispas por los caminos encendidos ----------
function tlwBurst(t) { if (!tlwOn() || !t || t.br !== TLW.br) return; const c = TAL_TREE[t.br].c; for (let i = 0; i < 28; i++) { const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 160; TLW.fx.push({ x: t.x, y: t.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.6 + Math.random() * 0.7, t: 0, s: 1.5 + Math.random() * 3, c: Math.random() < 0.5 ? c : '#ffe0a0' }); }
  TLW.fx.push({ ring: 1, x: t.x, y: t.y, r: TL_R[t.kind], life: 0.6, t: 0, c });
  const g = document.querySelector(`[data-tn="${CSS.escape(t.id)}"]`); if (g) { g.classList.add('pop'); setTimeout(() => g.classList.remove('pop'), 600); } }
function tlwLoop() {
  if (TLW.raf) return; let last = performance.now();
  const step = now => { if (!tlwOn()) { TLW.raf = 0; TLW.fx.length = 0; return; } TLW.raf = requestAnimationFrame(step); const dt = Math.min(0.05, (now - last) / 1000); last = now; TLW.t += dt;
    if ((TLW.panT -= dt) <= 0) { TLW.panT = 0.5; tlwPanels(); }
    const cv = $('tlFx'); if (TLW.view !== 'tree' || !cv) return; const W = cv.clientWidth, H = cv.clientHeight; if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const c = cv.getContext('2d'); c.clearRect(0, 0, W, H); const B = TAL_TREE[TLW.br];
    // Brasas desde abajo y desde la Maestría
    if (TLW.fx.length < 160) for (let i = 0; i < 2; i++) { const fromRoot = Math.random() < 0.45; TLW.fx.push({ x: fromRoot ? 500 + (Math.random() - 0.5) * 90 : Math.random() * 1000, y: fromRoot ? 860 : 910, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 60, life: 2 + Math.random() * 3, t: 0, s: 0.8 + Math.random() * 2.2, c: Math.random() < 0.3 ? B.c : Math.random() < 0.5 ? '#ff8a2a' : '#ffcf6a', fl: Math.random() * 6 }); }
    // Chispas que recorren los caminos aprendidos
    const lit = TALE[TLW.br].filter(([a, b]) => talHas(a) && talHas(b)); if (lit.length && Math.random() < 0.5) { const [a, b] = lit[(Math.random() * lit.length) | 0], A = TAL[a], Bn = TAL[b], u = Math.random(); TLW.fx.push({ x: A.x + (Bn.x - A.x) * u, y: A.y + (Bn.y - A.y) * u, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 30, life: 0.5 + Math.random() * 0.6, t: 0, s: 1 + Math.random() * 1.5, c: '#ffe0a0' }); }
    c.globalCompositeOperation = 'lighter';
    for (let i = TLW.fx.length - 1; i >= 0; i--) { const p = TLW.fx[i]; p.t += dt; if (p.t >= p.life) { TLW.fx.splice(i, 1); continue; } const k = 1 - p.t / p.life, P0 = tlwToScreen(p.x, p.y);
      if (p.ring) { c.strokeStyle = p.c; c.globalAlpha = k; c.lineWidth = 3; c.beginPath(); c.arc(P0.x, P0.y, (p.r + (1 - k) * 60) * P0.s, 0, Math.PI * 2); c.stroke(); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; if (p.fl != null) p.vx += Math.sin(TLW.t * 3 + p.fl) * 12 * dt; else p.vy += 60 * dt;
      c.globalAlpha = Math.min(1, k * 1.5) * (p.fl != null ? 0.6 + 0.4 * Math.sin(TLW.t * 9 + p.fl) : 1); c.fillStyle = p.c; const r = p.s * Math.max(0.6, P0.s * 1.4);
      c.beginPath(); c.arc(P0.x, P0.y, r, 0, Math.PI * 2); c.fill(); c.globalAlpha *= 0.18; c.beginPath(); c.arc(P0.x, P0.y, r * 2.4, 0, Math.PI * 2); c.fill(); }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; };
  TLW.raf = requestAnimationFrame(step);
}
// ---------- Ratón: seleccionar, aprender, zoom y mover ----------
{ const svgEv = (type, fn) => document.addEventListener(type, e => { if (tlwOn() && e.target.closest && e.target.closest('#tlC')) fn(e); }, { passive: type !== 'wheel' });
  svgEv('mouseover', e => { const g = e.target.closest('[data-tn]'); const id = g ? g.dataset.tn : null; if (id !== TLW.hov) { TLW.hov = id; tlwTip(); if (id) tone(900, 0.03, 'sine', 0.012, 1); } });
  svgEv('wheel', e => { if (TLW.view !== 'tree') return; e.preventDefault(); const v = TLW.vb, p = tlwFromScreen(e.clientX, e.clientY), f = e.deltaY > 0 ? 1.12 : 1 / 1.12, w = Math.max(320, Math.min(1400, v.w * f)), k = w / v.w;
    TLW.vb = { x: p.x - (p.x - v.x) * k, y: p.y - (p.y - v.y) * k, w, h: v.h * k }; tlwApplyVB(); tlwTip(); });
  svgEv('mousedown', e => { if (e.button !== 0 || TLW.view !== 'tree' || !e.target.closest('#tlSvg')) return; TLW.drag = { x: e.clientX, y: e.clientY, vb: { ...TLW.vb }, moved: false, id: (e.target.closest('[data-tn]') || {}).dataset?.tn }; });
  addEventListener('mousemove', e => { const d = TLW.drag; if (!d || !tlwOn()) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (!d.moved && Math.hypot(dx, dy) < 5) return; d.moved = true; $('tlC').classList.add('pan');
    const s = tlwFromScreen(0, 0).s; TLW.vb = { ...d.vb, x: d.vb.x - dx / s, y: d.vb.y - dy / s }; tlwApplyVB(); tlwTip(); });
  addEventListener('mouseup', () => { const d = TLW.drag; TLW.drag = null; if (!d || !tlwOn()) return; $('tlC').classList.remove('pan'); if (d.moved || !d.id) return;
    if (TLW.sel === d.id) talBuy(d.id); else { TLW.sel = d.id; tone(700, 0.05, 'triangle', 0.02, 1); tlwRender(); } });
  svgEv('dblclick', e => { const g = e.target.closest('[data-tn]'); if (!g) { TLW.vb = { ...TLW_VB }; tlwApplyVB(); tlwTip(); } }); }
// Botones: ramas, pestañas de arriba y reiniciar
document.addEventListener('click', e => { if (!tlwOn()) return; const b = e.target.closest('[data-tlbr],[data-tlnav],[data-tlreset]'); if (!b) return;
  if (b.dataset.tlbr) tlwBranch(b.dataset.tlbr);
  else if (b.dataset.tlnav) tlwNav(b.dataset.tlnav);
  else if (TLW.sure && performance.now() - TLW.sure < 4000) { TLW.sure = 0; talReset(); } else { TLW.sure = performance.now(); tlwRender(); setTimeout(() => { if (TLW.sure) { TLW.sure = 0; tlwRender(); } }, 4000); } });
function tlwBranch(br) { if (!TAL_TREE[br]) return; TLW.br = br; TLW.sel = TLW.hov = null; TLW.vb = { ...TLW_VB }; TLW.fx.length = 0; tone(420, 0.08, 'triangle', 0.03, 1.4); tlwRender(); }
const TLW_NAV = ['char', 'inv', 'tree', 'skills', 'adv', 'quest', 'map'];
function tlwNav(k) {
  if (k === 'prev' || k === 'next') { const i = TLW_NAV.indexOf(TLW.view); k = TLW_NAV[(i + (k === 'next' ? 1 : TLW_NAV.length - 1)) % TLW_NAV.length]; }
  if (k === 'tree' || k === 'skills') { TLW.view = k; tlwRender(); return; }
  closeModal(); if (k === 'char') openChar(); else if (k === 'inv') openInventory(null); else if (k === 'map') openMap(); else if (k === 'adv') advOpen('ach'); else if (k === 'quest') advOpen('quest');
}
// Teclado dentro de la ventana: flechas para moverse por los nodos, Enter para aprender, Q/E para cambiar de rama
addEventListener('keydown', e => {
  if (!S || ui.open === 'title' || e.ctrlKey || e.metaKey || _typing(e)) return; const k = e.key.toLowerCase();
  if (k === 'k') { if (tlwOn()) closeModal(); else if (!ui.open) tlwOpen(); return; }
  if (!tlwOn()) return;
  const order = Object.keys(TAL_TREE), i = order.indexOf(TLW.br);
  if (k === 'q' || k === 'e') { tlwBranch(order[(i + (k === 'e' ? 1 : order.length - 1)) % order.length]); e.preventDefault(); return; }
  if (k === 'tab') { tlwNav(e.shiftKey ? 'prev' : 'next'); e.preventDefault(); return; }
  if (TLW.view !== 'tree') return;
  if (k === 'enter' || k === ' ') { if (TLW.sel) talBuy(TLW.sel); e.preventDefault(); return; }
  const dir = { arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }[k]; if (!dir) return; e.preventDefault();
  const cur = TAL[TLW.sel] || TALN[TLW.br][0]; if (!TAL[TLW.sel]) { TLW.sel = cur.id; tlwRender(); return; }
  let best = null, bs = 1e9; for (const t of TALN[TLW.br]) { if (t === cur) continue; const dx = t.x - cur.x, dy = t.y - cur.y, L = Math.hypot(dx, dy), cos = (dx * dir[0] + dy * dir[1]) / L; if (cos < 0.5) continue; const sc = L * (2 - cos) + (cur.nb.includes(t.id) ? -60 : 0); if (sc < bs) { bs = sc; best = t; } }
  if (best) { TLW.sel = best.id; tone(760, 0.03, 'sine', 0.015, 1); tlwRender(); }
});
KEY_ACTIONS.find(g => g[0] === 'Ventanas')[1].push(['k', 'Árbol de talentos']); keymapBuild();
// En la ventana de Aventura queda una pestaña que abre el árbol
ADV.tabs.tal = { n: '🌳 Talentos', render() { if (!S.pc) return '<p class="mut">Los talentos se ganan subiendo de nivel en un mundo con supervivencia.</p>'; return `<div class="tlopen"><b>${talPts()}</b> punto${talPts() === 1 ? '' : 's'} para gastar · ${talSpent()} gastados<br><button data-tlopen>🌳 Abrir el árbol de talentos <kbd>K</kbd></button></div>`; } };
document.addEventListener('click', e => { const b = e.target.closest('[data-tlopen],[data-advtab="tal"]'); if (b && S) { ADV.tab = 'ach'; closeModal(); tlwOpen(); } });
cmd('talentos', { a: ['talento', 'arbol'], u: '/talentos', d: 'Abre el árbol de talentos.', run() { tlwOpen(); } });
