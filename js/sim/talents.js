'use strict';
// =====================================================================================
//  Árbol de talentos (tecla K): una gran constelación por rama.
//  · 3 puntos por cada nivel de personaje (el nivel es la suma de tus 10 habilidades: hasta 300 puntos).
//  · 7 ramas (Guerrero, Espadachín, Arquero, Mago, Artesano, Superviviente y Piromante), unos 175 nodos
//    cada una: la Maestría de abajo (empieza por ella), 15 constelaciones (un talento grande con rangos
//    rodeado de un anillo de bonos), caminos de bonos pequeños entre ellas y 4 talentos finales arriba.
//    Ampliado: 24 constelaciones, 10 Maestrías con su propio anillo y muchas más conexiones (~400 nodos por rama).
//  · Coste: bono pequeño 1 punto, bono mayor 2, talento grande 3 el primer rango, 4 el segundo, 5 el
//    tercero…, Maestría 6 y talento final 10. Un talento final pide además 60 puntos gastados en su rama.
//  · Solo se aprende un nodo conectado a otro que ya tengas, y para salir de una constelación o Maestría hay que
//    completarla entera. Cuanto más arriba (zona 1 a 5), más cuesta cada nodo y más da.
//    No se puede tenerlo todo: hay que elegir.
//  · Reiniciar: la primera vez es gratis; después cuesta monedas.
//  · Los talentos van con el personaje y, como los niveles, con la mochila de cada tipo de mundo.
//    Los atributos, críticos, resistencias y demás efectos están en sim/attributes.js.
//  · Se dibuja en un único lienzo (sin SVG ni filtros) para que moverse y hacer zoom vaya fluido.
// =====================================================================================
// Bonos que dan los nodos: [nombre, icono, formato] (n: número, p: porcentaje, m: multiplicador, r: por segundo)
const TSTAT = { str: ['Fuerza', '💪', 'n'], dex: ['Destreza', '✋', 'n'], pow: ['Poder', '⚡', 'n'], spi: ['Espíritu', '✺', 'n'], end: ['Aguante', '🦶', 'n'], kno: ['Conocimiento', '📘', 'n'], con: ['Constitución', '❤', 'n'], dfn: ['Defensa', '🛡', 'n'], vig: ['Vigor', '💗', 'n'],
  critP: ['crítico físico', '🎯', 'p'], critM: ['crítico mágico', '🔮', 'p'], critD: ['daño crítico', '💥', 'p'], spell: ['poder de hechizos', '✨', 'p'], poise: ['aplomo', '⚓', 'n'], stagger: ['aturdimiento', '💫', 'n'], carry: ['carga máxima', '🎒', 'n'], mana: ['maná máximo', '💧', 'n'], luck: ['suerte', '🍀', 'p'], speed: ['velocidad', '👟', 'm'], work: ['velocidad de trabajo', '🔧', 'm'],
  resF: ['resistencia al fuego', '🔥', 'p'], resB: ['resistencia al sangrado', '🩸', 'p'], resP: ['resistencia al veneno', '☠', 'p'], resC: ['resistencia a la escarcha', '❄', 'p'], resV: ['resistencia al vacío', '🌀', 'p'], resPh: ['resistencia física', '🪨', 'p'], resW: ['resistencia salvaje', '🌿', 'p'],
  chBleed: ['probabilidad de sangrado', '🩸', 'p'], chBurn: ['probabilidad de quemar', '🔥', 'p'], chLight: ['probabilidad de marca de luz', '🌟', 'p'], chPoison: ['probabilidad de envenenar', '🧪', 'p'], chRoot: ['probabilidad de enraizar', '🌱', 'p'], chWeak: ['probabilidad de debilitar', '🥀', 'p'],
  atkSpd: ['velocidad de ataque', '⚡', 'p'], lifesteal: ['robo de vida', '🧛', 'p'], execute: ['daño a enemigos malheridos', '🪦', 'p'], bossDmg: ['daño a jefes', '👹', 'p'], undeadDmg: ['daño a no-muertos', '💀', 'p'], thorns: ['daño devuelto (espinas)', '🌵', 'p'], dodge: ['esquiva', '🌀', 'p'], regen: ['regeneración de vida', '💚', 'r'], killHeal: ['vida al matar', '🍷', 'n'],
  firstStrike: ['daño al primer golpe', '🗡', 'p'], comboMax: ['golpes de combo', '🔗', 'n'], comboDmg: ['daño por golpe de combo', '🔗', 'p'], furyDur: ['segundos de furia', '⏱', 'n'], adrGain: ['adrenalina ganada', '💉', 'p'], dotDmg: ['daño de sangrado, quemadura y veneno', '☣', 'p'], chFreeze: ['probabilidad de congelar', '🧊', 'p'], chChain: ['probabilidad de rayo en cadena', '⛓', 'p'], chBoom: ['probabilidad de explosión', '💥', 'p'],
  lowHpDmg: ['daño con poca vida', '😡', 'p'], critHeal: ['vida por crítico', '💖', 'n'], manaHit: ['maná por golpe', '💧', 'n'], hp: ['vida máxima', '❤', 'n'], def: ['armadura', '🛡', 'n'], block: ['bloqueo', '🔰', 'p'], melee: ['daño cuerpo a cuerpo', '⚔', 'm'], ranged: ['daño a distancia', '🏹', 'm'], stam: ['aguante máximo', '🫁', 'n'], warm: ['abrigo', '🧥', 'n'], heal: ['curación', '✚', 'm'], mine: ['velocidad al picar', '⛏', 'm'], wood: ['velocidad al talar', '🪓', 'm'],
  swordDmg: ['daño con espadas, dagas y lanzas', '🗡', 'p'], axeDmg: ['daño con hachas, mazas y guadañas', '🪓', 'p'], bowDmg: ['daño con arcos y ballestas', '🏹', 'p'], staffDmg: ['daño con bastones y varitas', '🪄', 'p'] };
const tsTxt = (k, v) => { const S0 = TSTAT[k]; if (!S0) return ''; const f = S0[2] === 'p' ? +(v * 100).toFixed(1) + ' %' : S0[2] === 'm' ? +((v - 1) * 100).toFixed(1) + ' %' : S0[2] === 'r' ? +v.toFixed(2) + '/s' : +v.toFixed(1); return `+${f} de ${S0[0]}`; };
// Ramas: Maestría (raíz), 15 talentos grandes [id, nombre, icono, rangos, efecto por rango, texto] (de abajo arriba),
// 4 talentos finales [id, nombre, icono, efecto, texto] (de izquierda a derecha) y los bonos de sus nodos pequeños
const TAL_TREE = {
  war: { n: 'Guerrero', i: '⚔', c: '#ff7a5a', d: 'Peleador: golpes, aguante y armadura pesada.',
    root: ['tWarRoot', 'Maestría marcial', '⚔', 'Empieza la rama del Guerrero: +2 de Fuerza y +2 de Constitución.', { str: 2, con: 2 }],
    big: [['tBrute', 'Fuerza bruta', '💪', 5, k => ({ melee: 1 + 0.03 * k }), '+3 % de daño cuerpo a cuerpo'], ['tVigor', 'Vigor', '❤', 5, k => ({ hp: 6 * k }), '+6 de vida máxima'], ['tHide', 'Piel dura', '🛡', 5, k => ({ def: k }), '+1 de defensa'],
      ['tBlood', 'Sed de sangre', '🩸', 3, k => ({ chBleed: 0.05 * k }), '+5 % de hacer sangrar al golpear'], ['tShield', 'Escudero', '🔰', 3, k => ({ block: 0.02 * k }), '+2 % de bloquear un golpe'], ['tRage', 'Furia de batalla', '🔥', 3, k => ({ adrGain: 0.2 * k, furyDur: k }), '+20 % de adrenalina y +1 s de furia'],
      ['tCrush', 'Aplastar', '🔨', 3, k => ({ stagger: 25 * k, critD: 0.08 * k }), '+25 de aturdimiento y +8 % de daño crítico'], ['tPain', 'Sin dolor', '😤', 3, k => ({ pain: 1 - 0.06 * k }), 'El dolor te afecta un 6 % menos'], ['tBerserk', 'Berserker', '😡', 3, k => ({ lowHpDmg: 0.12 * k }), '+12 % de daño con poca vida'],
      ['tIronWall', 'Muro de hierro', '🧱', 5, k => ({ def: 2 * k, resPh: 0.02 * k }), '+2 de defensa y +2 % de resistencia física'], ['tCleave', 'Tajo amplio', '🪓', 3, k => ({ chBoom: 0.04 * k }), '+4 % de que el golpe estalle y dañe alrededor'], ['tExecute', 'Verdugo', '🪦', 3, k => ({ execute: 0.12 * k }), '+12 % de daño a enemigos con poca vida'],
      ['tThorns', 'Espinas', '🌵', 3, k => ({ thorns: 0.15 * k, poise: 10 * k }), 'Devuelves un 15 % del daño y +10 de aplomo'], ['tTitan', 'Sangre de titán', '💢', 5, k => ({ hp: 10 * k, con: 2 * k }), '+10 de vida y +2 de Constitución'], ['tHeavy', 'Coloso de hierro', '⛓', 1, () => ({ heavyOk: 1, poise: 30 }), 'La armadura pesada y la carga ya no te frenan; +30 de aplomo']],
    keys: [['tWarGod', 'Dios de la guerra', '⚡', () => ({ melee: 1.2, critD: 0.3, stagger: 60 }), 'Talento final: +20 % de daño cuerpo a cuerpo, +30 % de daño crítico y +60 de aturdimiento'],
      ['tWarlord', 'Señor de la batalla', '👑', () => ({ melee: 1.12, def: 5, hp: 20 }), 'Talento final: +12 % de daño, +5 de defensa y +20 de vida'],
      ['tUnbreak', 'Inquebrantable', '🗿', () => ({ def: 15, resPh: 0.15, ccRed: 0.3, hp: 50 }), 'Talento final: +15 de defensa, +15 % de resistencia física, −30 % de control y +50 de vida'],
      ['tBloodLord', 'Señor de la sangre', '🩸', () => ({ lifesteal: 0.06, chBleed: 0.15, dotDmg: 0.5 }), 'Talento final: 6 % de robo de vida, +15 % de sangrado y +50 % de daño de sangrado']],
    pool: [['str', 2], ['con', 2], ['dfn', 2], ['resPh', 0.02], ['stagger', 8], ['chBleed', 0.02], ['critD', 0.04], ['poise', 6], ['hp', 6], ['def', 1], ['lowHpDmg', 0.03], ['thorns', 0.03], ['axeDmg', 0.03]] },
  blade: { n: 'Espadachín', i: '🗡', c: '#c8d8ff', d: 'Velocidad, críticos, paradas y combos.',
    root: ['tBladeRoot', 'Maestría de la espada', '🗡', 'Empieza la rama del Espadachín: +2 de Destreza y +2 de Fuerza.', { dex: 2, str: 2 }],
    big: [['tEdge', 'Filo afilado', '🔪', 5, k => ({ melee: 1 + 0.03 * k, critP: 0.01 * k }), '+3 % de daño cuerpo a cuerpo y +1 % de crítico'], ['tFlurry', 'Ráfaga', '💨', 5, k => ({ atkSpd: 0.05 * k }), '+5 % de velocidad de ataque'], ['tParry', 'Parada', '🤺', 5, k => ({ block: 0.03 * k }), '+3 % de bloquear un golpe'],
      ['tLunge', 'Estocada', '🎯', 3, k => ({ firstStrike: 0.2 * k }), '+20 % de daño al primer golpe a un enemigo'], ['tGrace', 'Gracia', '🪶', 5, k => ({ dodge: 0.02 * k, speed: 1 + 0.01 * k }), '+2 % de esquiva y +1 % de velocidad'], ['tVein', 'Corte de vena', '🩸', 3, k => ({ chBleed: 0.05 * k, dotDmg: 0.08 * k }), '+5 % de sangrado y +8 % de daño de sangrado'],
      ['tRiposte', 'Contraataque', '↩', 3, k => ({ thorns: 0.15 * k, block: 0.02 * k }), 'Devuelves un 15 % del daño y +2 % de bloqueo'], ['tDanceSteel', 'Danza de acero', '💃', 3, k => ({ comboMax: k, comboDmg: 0.01 * k }), '+1 golpe de combo y +1 % de daño por golpe'], ['tDuel', 'Duelista', '⚔', 3, k => ({ bossDmg: 0.08 * k }), '+8 % de daño a jefes'],
      ['tFocusB', 'Filo concentrado', '🧘', 3, k => ({ critD: 0.1 * k }), '+10 % de daño crítico'], ['tFeint', 'Finta', '🎭', 3, k => ({ chWeak: 0.05 * k, dodge: 0.01 * k }), '+5 % de debilitar y +1 % de esquiva'], ['tSheath', 'Desenvainar', '⚡', 3, k => ({ firstStrike: 0.1 * k, critP: 0.02 * k }), '+10 % al primer golpe y +2 % de crítico'],
      ['tBladeWard', 'Guardia de hoja', '🛡', 3, k => ({ def: 2 * k, resPh: 0.03 * k }), '+2 de defensa y +3 % de resistencia física'], ['tWindBlade', 'Hoja del viento', '🌬', 3, k => ({ dash: 1 - 0.06 * k, stam: 8 * k }), 'Impulso un 6 % antes y +8 de aguante'], ['tMirror', 'Acero sediento', '🪞', 3, k => ({ lifesteal: 0.012 * k }), '+1,2 % de robo de vida']],
    keys: [['tSaint', 'Santo de la espada', '✝', () => ({ critP: 0.1, critD: 0.5, melee: 1.1 }), 'Talento final: +10 % de crítico, +50 % de daño crítico y +10 % de daño'],
      ['tThousand', 'Mil cortes', '⚡', () => ({ atkSpd: 0.3, comboMax: 3, comboDmg: 0.03 }), 'Talento final: +30 % de velocidad de ataque y combos de hasta 8 golpes más fuertes'],
      ['tShadowStep', 'Paso sombrío', '🌑', () => ({ dodge: 0.15, firstStrike: 0.4, speed: 1.08 }), 'Talento final: +15 % de esquiva, +40 % al primer golpe y +8 % de velocidad'],
      ['tLastStand', 'Último duelo', '💢', () => ({ lowHpDmg: 0.5, lifesteal: 0.05, execute: 0.3 }), 'Talento final: +50 % de daño con poca vida, 5 % de robo de vida y +30 % para rematar']],
    pool: [['dex', 2], ['str', 2], ['critP', 0.01], ['critD', 0.04], ['atkSpd', 0.02], ['block', 0.01], ['dodge', 0.01], ['chBleed', 0.02], ['comboDmg', 0.005], ['firstStrike', 0.04], ['melee', 1.02], ['poise', 5], ['swordDmg', 0.03]] },
  hunt: { n: 'Arquero', i: '🏹', c: '#7fd07a', d: 'Distancia, velocidad, caza y trampas.',
    root: ['tHuntRoot', 'Maestría del rastro', '🏹', 'Empieza la rama del Arquero: +2 de Destreza y +2 de Aguante.', { dex: 2, end: 2 }],
    big: [['tHawk', 'Ojo de halcón', '🦅', 5, k => ({ ranged: 1 + 0.03 * k }), '+3 % de daño a distancia'], ['tFeet', 'Pies ligeros', '👟', 5, k => ({ speed: 1 + 0.02 * k }), '+2 % de velocidad'], ['tKeen', 'Puntería letal', '🎯', 5, k => ({ critP: 0.02 * k }), '+2 % de crítico físico'],
      ['tDash', 'Impulso', '💨', 3, k => ({ dash: 1 - 0.06 * k }), 'El impulso se recarga un 6 % antes'], ['tRun', 'Carrera de fondo', '🏃', 3, k => ({ sprintCost: 1 - 0.07 * k }), 'Correr cansa un 7 % menos'], ['tQuick', 'Manos rápidas', '⚡', 5, k => ({ atkSpd: 0.04 * k }), '+4 % de velocidad de ataque'],
      ['tVenom', 'Puntas envenenadas', '🧪', 3, k => ({ chPoison: 0.05 * k, chRoot: 0.02 * k }), '+5 % de envenenar y +2 % de enraizar'], ['tTrack', 'Rastreador', '🐾', 3, k => ({ hunt: 1 + 0.06 * k, tame: 1 + 0.04 * k }), '+6 % de caza y +4 % de domar'], ['tReflex', 'Reflejos', '🌀', 5, k => ({ dodge: 0.02 * k }), '+2 % de esquiva'],
      ['tStealth', 'Sigilo', '🌫', 3, k => ({ detect: 1 - 0.06 * k }), 'Los enemigos te ven un 6 % menos'], ['tSnipe', 'Francotirador', '🔭', 3, k => ({ firstStrike: 0.15 * k, critD: 0.05 * k }), '+15 % al primer golpe y +5 % de daño crítico'], ['tBeastHunt', 'Cazador de bestias', '🐗', 3, k => ({ resW: 0.06 * k, bossDmg: 0.05 * k }), '+6 % de resistencia salvaje y +5 % de daño a jefes'],
      ['tForest', 'Hijo del bosque', '🌳', 3, k => ({ regen: 0.3 * k, resP: 0.04 * k }), '+0,3 de vida por segundo y +4 % de resistencia al veneno'], ['tTrapper', 'Trampero', '🪤', 3, k => ({ chRoot: 0.04 * k, chFreeze: 0.02 * k }), '+4 % de enraizar y +2 % de congelar'], ['tWindrun', 'Corredor del viento', '🌬', 3, k => ({ speed: 1 + 0.03 * k, stam: 10 * k }), '+3 % de velocidad y +10 de aguante']],
    keys: [['tDeadeye', 'Ojo de la muerte', '👁', () => ({ critP: 0.12, critD: 0.4, ranged: 1.1 }), 'Talento final: +12 % de crítico, +40 % de daño crítico y +10 % a distancia'],
      ['tNorth', 'Viento del norte', '🌪', () => ({ ranged: 1.15, speed: 1.06, reach: 1.1 }), 'Talento final: +15 % a distancia, +6 % de velocidad y más alcance'],
      ['tGhost', 'Fantasma del bosque', '👻', () => ({ dodge: 0.12, detect: 0.6, speed: 1.08 }), 'Talento final: +12 % de esquiva, casi no te ven y +8 % de velocidad'],
      ['tAlpha', 'Alfa de la manada', '🐺', () => ({ petHp: 1.5, tame: 1.3, lifesteal: 0.03, killHeal: 5 }), 'Talento final: mascotas con +50 % de vida, +30 % de domar, robo de vida y +5 de vida al matar']],
    pool: [['dex', 2], ['end', 2], ['critP', 0.01], ['chPoison', 0.02], ['resW', 0.03], ['chRoot', 0.015], ['speed', 1.01], ['critD', 0.03], ['dodge', 0.01], ['atkSpd', 0.015], ['firstStrike', 0.04], ['ranged', 1.02], ['bowDmg', 0.03]] },
  arc: { n: 'Mago', i: '✦', c: '#b48cff', d: 'Maná, hechizos, rayos y escarcha.',
    root: ['tArcRoot', 'Maestría arcana', '✦', 'Empieza la rama del Mago: +2 de Poder y +2 de Espíritu.', { pow: 2, spi: 2 }],
    big: [['tWell', 'Pozo de maná', '💧', 5, k => ({ mana: 10 * k }), '+10 de maná máximo'], ['tFlow', 'Flujo arcano', '🌀', 5, k => ({ manaRegen: 1 + 0.06 * k }), '+6 % de recarga de maná'], ['tFocus', 'Concentración', '🧿', 5, k => ({ critM: 0.02 * k, spell: 0.02 * k }), '+2 % de crítico mágico y +2 % de poder de hechizos'],
      ['tScholar', 'Erudito', '📚', 3, k => ({ xp: 1 + 0.04 * k }), '+4 % de experiencia'], ['tSurge', 'Oleada arcana', '🌊', 5, k => ({ spell: 0.04 * k }), '+4 % de poder de hechizos'], ['tLight', 'Marca de luz', '🌟', 3, k => ({ chLight: 0.06 * k, resV: 0.04 * k }), '+6 % de marcar con luz y +4 % de resistencia al vacío'],
      ['tSight', 'Visión mística', '👁', 3, k => ({ night: 0.08 * k }), 'Ves mejor de noche'], ['tChain', 'Arco voltaico', '⛓', 3, k => ({ chChain: 0.06 * k }), '+6 % de que salte un rayo a otro enemigo'], ['tFrost', 'Escarcha eterna', '❄', 3, k => ({ chFreeze: 0.04 * k, resC: 0.04 * k }), '+4 % de congelar y +4 % de resistencia a la escarcha'],
      ['tFlame', 'Llama interior', '🕯', 3, k => ({ warm: 3 * k }), '+3 de abrigo (te protege del frío)'], ['tSiphon', 'Sifón', '🌙', 3, k => ({ manaHit: k }), '+1 de maná por golpe'], ['tWard', 'Piel rúnica', '🔮', 3, k => ({ gdef: k, def: k }), '+1 de defensa mágica'],
      ['tMind', 'Mente brillante', '🧠', 3, k => ({ kno: 3 * k, xp: 1 + 0.03 * k }), '+3 de Conocimiento y +3 % de experiencia'], ['tVoidT', 'Toque del vacío', '🕳', 3, k => ({ resV: 0.08 * k, undeadDmg: 0.1 * k }), '+8 % de resistencia al vacío y +10 % contra no-muertos'], ['tAegis', 'Égida', '🛡', 3, k => ({ block: 0.03 * k, gdef: 2 * k }), '+3 % de bloqueo y +2 de defensa mágica']],
    keys: [['tStormLord', 'Señor de la tormenta', '🌩', () => ({ chChain: 0.2, spell: 0.2, critM: 0.05 }), 'Talento final: +20 % de rayo en cadena, +20 % a hechizos y +5 % de crítico mágico'],
      ['tArch', 'Archimago', '🌌', () => ({ mana: 60, manaRegen: 1.25, xp: 1.05, spell: 0.1 }), 'Talento final: +60 de maná, +25 % de recarga, +10 % a hechizos y +5 % de experiencia'],
      ['tTimeW', 'Tejedor del tiempo', '⏳', () => ({ atkSpd: 0.15, manaRegen: 1.5, dash: 0.7 }), 'Talento final: +15 % de velocidad de ataque, +50 % de recarga de maná e impulso más rápido'],
      ['tLich', 'Liche', '💀', () => ({ manaHit: 4, lifesteal: 0.04, resV: 0.3, undeadDmg: 0.4 }), 'Talento final: +4 de maná por golpe, robo de vida, +30 % de resistencia al vacío y +40 % contra no-muertos']],
    pool: [['pow', 2], ['spi', 2], ['kno', 2], ['critM', 0.01], ['resV', 0.03], ['chLight', 0.02], ['resC', 0.02], ['mana', 6], ['spell', 0.02], ['manaHit', 0.3], ['chFreeze', 0.01], ['chChain', 0.01], ['staffDmg', 0.03]] },
  craft: { n: 'Artesano', i: '⚙', c: '#ffd34a', d: 'Picar, talar, fabricar, cargar y comerciar.',
    root: ['tCraftRoot', 'Maestría del taller', '⚙', 'Empieza la rama del Artesano: +2 de Conocimiento y +2 de Fuerza.', { kno: 2, str: 2 }],
    big: [['tMiner', 'Minero', '⛏', 5, k => ({ mine: 1 + 0.06 * k }), 'Picas un 6 % más rápido'], ['tLogger', 'Leñador', '🪓', 5, k => ({ wood: 1 + 0.06 * k }), 'Talas un 6 % más rápido'], ['tHands', 'Manos hábiles', '🔧', 5, k => ({ work: 1 + 0.04 * k }), 'Trabajas un 4 % más rápido'],
      ['tPack', 'Mula de carga', '🎒', 3, k => ({ carry: 8 * k, poise: 10 * k }), '+8 de carga máxima y +10 de aplomo'], ['tThrift', 'Ahorro', '♻', 3, k => ({ craftKeep: 0.03 * k }), '+3 % de recuperar el núcleo al fabricar'], ['tSmith', 'Herrero', '⚒', 5, k => ({ def: k, work: 1 + 0.02 * k }), '+1 de defensa y +2 % de velocidad de trabajo'],
      ['tLearn', 'Aprendiz aplicado', '📐', 3, k => ({ xpCraft: 1 + 0.08 * k }), '+8 % de experiencia al fabricar y construir'], ['tHaggle', 'Regateo', '🪙', 3, k => ({ price: 1 - 0.04 * k }), 'Los comerciantes te cobran un 4 % menos'], ['tGem', 'Joyero', '💎', 3, k => ({ luck: 0.02 * k, price: 1 - 0.03 * k }), '+2 % de suerte y precios un 3 % más bajos'],
      ['tForge', 'Forjado a fuego', '🔥', 3, k => ({ def: 2 * k, resPh: 0.03 * k, resF: 0.03 * k }), '+2 de defensa y +3 % de resistencia física y al fuego'], ['tTinker', 'Chapucero genial', '🔩', 3, k => ({ craftKeep: 0.04 * k, xpCraft: 1 + 0.05 * k }), '+4 % de ahorro y +5 % de experiencia al fabricar'], ['tQuarry', 'Cantero', '🪨', 5, k => ({ mine: 1 + 0.05 * k, str: k }), 'Picas un 5 % más rápido y +1 de Fuerza'],
      ['tLumber', 'Aserradero', '🌲', 3, k => ({ wood: 1 + 0.08 * k }), 'Talas un 8 % más rápido'], ['tOx', 'Espalda de buey', '🐂', 3, k => ({ carry: 10 * k, stam: 10 * k }), '+10 de carga y +10 de aguante'], ['tEngineer', 'Ingeniero de batalla', '💣', 3, k => ({ chBoom: 0.04 * k, bossDmg: 0.04 * k }), '+4 % de explosión y +4 % de daño a jefes']],
    keys: [['tGolem', 'Corazón de gólem', '🗿', () => ({ def: 20, carry: 40, heavyOk: 1, poise: 60 }), 'Talento final: +20 de defensa, +40 de carga, sin frenarte con armadura pesada y +60 de aplomo'],
      ['tMaster', 'Maestro del Taller', '🏭', () => ({ work: 1.15, mine: 1.15, wood: 1.15, craftKeep: 0.1 }), 'Talento final: trabajas, picas y talas un 15 % más rápido y +10 % de ahorro'],
      ['tMidas', 'Toque de Midas', '👑', () => ({ luck: 0.1, price: 0.8, xp: 1.1 }), 'Talento final: +10 % de suerte, precios un 20 % más bajos y +10 % de experiencia'],
      ['tArtificer', 'Artífice', '🛠', () => ({ work: 1.3, craftKeep: 0.15, mine: 1.2, wood: 1.2 }), 'Talento final: +30 % de trabajo, +15 % de ahorro y picas y talas un 20 % más rápido']],
    pool: [['kno', 2], ['str', 2], ['end', 2], ['dfn', 2], ['carry', 4], ['resPh', 0.015], ['luck', 0.01], ['work', 1.01], ['mine', 1.02], ['wood', 1.02], ['def', 1], ['stam', 5], ['axeDmg', 0.02]] },
  surv: { n: 'Superviviente', i: '🌿', c: '#5ad8ff', d: 'Hambre, heridas, curación, regeneración y mascotas.',
    root: ['tSurvRoot', 'Maestría de la supervivencia', '🌿', 'Empieza la rama del Superviviente: +2 de Vigor y +2 de Constitución.', { vig: 2, con: 2 }],
    big: [['tStomach', 'Estómago de hierro', '🍖', 5, k => ({ hunger: 1 - 0.06 * k }), 'El hambre llega un 6 % más despacio'], ['tCamel', 'Sediento no', '💦', 5, k => ({ thirst: 1 - 0.06 * k }), 'La sed llega un 6 % más despacio'], ['tHealer', 'Sanador', '✚', 5, k => ({ heal: 1 + 0.06 * k }), 'Te curas un 6 % más rápido'],
      ['tRegen', 'Regeneración', '💚', 5, k => ({ regen: 0.25 * k }), '+0,25 de vida por segundo'], ['tClot', 'Coagulación', '🩹', 3, k => ({ bleed: 1 - 0.1 * k }), 'Sangras un 10 % menos'], ['tThick', 'Sangre espesa', '🫀', 3, k => ({ resB: 0.06 * k, resP: 0.06 * k }), '+6 % de resistencia al sangrado y al veneno'],
      ['tImmune', 'Inmune', '🦠', 3, k => ({ sick: 1 - 0.1 * k }), 'Enfermas un 10 % menos'], ['tCamp', 'Fogata', '🏕', 3, k => ({ warm: 3 * k, resC: 0.04 * k }), '+3 de abrigo y +4 % de resistencia a la escarcha'], ['tBeast', 'Amigo de las bestias', '🐺', 3, k => ({ tame: 1 + 0.08 * k, petHp: 1 + 0.08 * k }), '+8 % de domar y de vida de tus mascotas'],
      ['tWither', 'Toque marchito', '🥀', 3, k => ({ chWeak: 0.05 * k, resW: 0.04 * k }), '+5 % de debilitar al golpear y +4 % de resistencia salvaje'], ['tForage', 'Recolector', '🍄', 3, k => ({ hunger: 1 - 0.04 * k, luck: 0.01 * k }), 'Hambre un 4 % más lenta y +1 % de suerte'], ['tScar', 'Cicatrices', '🩻', 3, k => ({ wound: 1 - 0.05 * k, pain: 1 - 0.05 * k }), 'Heridas y dolor un 5 % más leves'],
      ['tAntidote', 'Antídoto', '🧴', 3, k => ({ resP: 0.08 * k, sick: 1 - 0.06 * k }), '+8 % de resistencia al veneno y enfermas un 6 % menos'], ['tSecond', 'Segundo aliento', '🫁', 3, k => ({ killHeal: 2 * k, stam: 8 * k }), '+2 de vida al matar y +8 de aguante'], ['tHerd', 'Manada', '🐾', 3, k => ({ petHp: 1 + 0.1 * k, tame: 1 + 0.05 * k }), '+10 % de vida de mascotas y +5 % de domar']],
    keys: [['tImmortal', 'Inmortal', '♾', () => ({ regen: 2, killHeal: 6, heal: 1.3 }), 'Talento final: +2 de vida por segundo, +6 al matar y +30 % de curación'],
      ['tIndom', 'Indomable', '🗿', () => ({ hp: 30, heal: 1.2, wound: 0.85, luck: 0.03 }), 'Talento final: +30 de vida, +20 % de curación, heridas más leves y +3 % de suerte'],
      ['tWildHeart', 'Corazón salvaje', '🌿', () => ({ resW: 0.3, resP: 0.25, resB: 0.25, chWeak: 0.1 }), 'Talento final: +30 % de resistencia salvaje, +25 % al veneno y al sangrado y +10 % de debilitar'],
      ['tNomad', 'Nómada', '🧭', () => ({ hunger: 0.7, thirst: 0.7, speed: 1.05, stam: 40 }), 'Talento final: hambre y sed un 30 % más lentas, +5 % de velocidad y +40 de aguante']],
    pool: [['vig', 2], ['con', 2], ['resP', 0.03], ['resB', 0.03], ['resC', 0.03], ['chWeak', 0.02], ['end', 2], ['resW', 0.02], ['regen', 0.08], ['hp', 5], ['heal', 1.02], ['killHeal', 1]] },
  pyro: { n: 'Piromante', i: '🔥', c: '#ff9a2a', d: 'Fuego, quemaduras, explosiones y daño mágico.',
    root: ['tPyroRoot', 'Maestría del fuego', '🔥', 'Empieza la rama del Piromante: +2 de Poder y +5 % de resistencia al fuego.', { pow: 2, resF: 0.05 }],
    big: [['tEmber', 'Ascuas', '🌋', 5, k => ({ chBurn: 0.04 * k }), '+4 % de quemar al golpear'], ['tAsh', 'Piel de ceniza', '🌫', 5, k => ({ resF: 0.06 * k }), '+6 % de resistencia al fuego'], ['tKindle', 'Prender', '🕯', 3, k => ({ chBurn: 0.03 * k, critM: 0.01 * k }), '+3 % de quemar y +1 % de crítico mágico'],
      ['tInferno', 'Infierno', '☄', 3, k => ({ spell: 0.05 * k, critM: 0.01 * k }), '+5 % de poder de hechizos y +1 % de crítico mágico'], ['tScorch', 'Abrasar', '♨', 5, k => ({ dotDmg: 0.1 * k }), '+10 % de daño de quemaduras, sangrado y veneno'], ['tBlaze', 'Llamarada', '💥', 3, k => ({ critD: 0.08 * k }), '+8 % de daño crítico'],
      ['tHearth', 'Hogar', '🏮', 3, k => ({ warm: 3 * k, resC: 0.05 * k }), '+3 de abrigo y +5 % de resistencia a la escarcha'], ['tFirestorm', 'Tormenta de fuego', '🌪', 3, k => ({ chBoom: 0.05 * k }), '+5 % de que el golpe estalle'], ['tCinder', 'Ceniza viva', '✴', 3, k => ({ spi: 3 * k, mana: 10 * k }), '+3 de Espíritu y +10 de maná'],
      ['tMagma', 'Piel de magma', '🪨', 3, k => ({ resPh: 0.03 * k, def: k, thorns: 0.05 * k }), '+3 % de resistencia física, +1 de defensa y 5 % de espinas'], ['tFlare', 'Destello', '✨', 3, k => ({ critM: 0.02 * k, critHeal: 3 * k }), '+2 % de crítico mágico y +3 de vida por crítico'], ['tSmolder', 'Brasa lenta', '🔥', 3, k => ({ vig: 3 * k, heal: 1 + 0.05 * k }), '+3 de Vigor y +5 % de curación'],
      ['tPyre', 'Pira', '⚱', 3, k => ({ execute: 0.08 * k }), '+8 % de daño a enemigos con poca vida'], ['tHeat', 'Ola de calor', '🌡', 3, k => ({ adrGain: 0.15 * k, spell: 0.03 * k }), '+15 % de adrenalina y +3 % a hechizos'], ['tSoot', 'Hollín', '🌑', 3, k => ({ dodge: 0.02 * k, resF: 0.04 * k }), '+2 % de esquiva y +4 % de resistencia al fuego']],
    keys: [['tSun', 'Sol naciente', '☀', () => ({ spell: 0.3, chBurn: 0.15, dotDmg: 0.5 }), 'Talento final: +30 % a hechizos, +15 % de quemar y +50 % de daño de quemaduras'],
      ['tPhoenix', 'Fénix', '🐦‍🔥', () => ({ resF: 0.25, chBurn: 0.1, spell: 0.15, hp: 40 }), 'Talento final: +25 % de resistencia al fuego, +10 % de quemar, +15 % a hechizos y +40 de vida'],
      ['tAshLord', 'Señor de las cenizas', '🌋', () => ({ resF: 0.5, thorns: 0.4, killHeal: 4 }), 'Talento final: +50 % de resistencia al fuego, 40 % de espinas y +4 de vida al matar'],
      ['tNova', 'Supernova', '💫', () => ({ chBoom: 0.18, critM: 0.08 }), 'Talento final: +18 % de explosión al golpear y +8 % de crítico mágico']],
    pool: [['pow', 2], ['chBurn', 0.02], ['resF', 0.03], ['critM', 0.01], ['spi', 2], ['vig', 2], ['critD', 0.03], ['resC', 0.02], ['dotDmg', 0.04], ['spell', 0.02], ['chBoom', 0.01], ['mana', 5], ['staffDmg', 0.025]] },
};
// Constelaciones del anillo exterior (9 talentos grandes más) y Maestrías (10 por rama): sus efectos salen de los bonos de la rama, más fuertes
const TAL_GEN = {
  war: [['Carnicero', 'Puño de hierro', 'Grito de guerra', 'Hueso duro', 'Ariete', 'Veterano', 'Sangre caliente', 'Rompeescudos', 'Guardián'], ['del Coloso', 'de la Matanza', 'del Acero', 'de la Muralla', 'del Berserker', 'de la Sangre', 'del Martillo', 'del Escudo', 'del Campeón', 'de la Guerra Eterna']],
  blade: [['Corte limpio', 'Pies de bailarín', 'Doble filo', 'Ojo del duelo', 'Hoja fantasma', 'Ritmo letal', 'Tajo cruzado', 'Guardia alta', 'Acero vivo'], ['del Florete', 'del Sable', 'de la Katana', 'de la Danza', 'del Duelo', 'de la Parada', 'del Corte', 'de la Estocada', 'del Viento Cortante', 'del Maestro de Armas']],
  hunt: [['Halcón peregrino', 'Huella fresca', 'Flecha certera', 'Lluvia de flechas', 'Paso felino', 'Cazador nocturno', 'Disparo rápido', 'Trampa doble', 'Ojo agudo'], ['del Arco Largo', 'de la Ballesta', 'del Bosque', 'de la Caza Mayor', 'del Rastro', 'de la Emboscada', 'del Viento', 'de la Presa', 'del Halcón', 'del Explorador']],
  arc: [['Runa antigua', 'Chispa', 'Mente clara', 'Torrente', 'Cristal arcano', 'Eco mágico', 'Glifo', 'Velo astral', 'Estrella fugaz'], ['del Éter', 'de las Runas', 'del Rayo', 'de la Escarcha', 'del Vacío', 'de la Luz', 'del Cristal', 'de las Estrellas', 'del Tiempo', 'del Archimago']],
  craft: [['Martillo firme', 'Ojo de tasador', 'Fuelle', 'Yunque', 'Veta rica', 'Sierra rápida', 'Engranaje', 'Inventor', 'Mercader'], ['de la Forja', 'de la Mina', 'del Aserradero', 'del Yunque', 'del Comercio', 'de la Ingeniería', 'del Engranaje', 'de la Carga', 'del Inventor', 'del Gran Taller']],
  surv: [['Piel curtida', 'Raíces', 'Hierba sanadora', 'Corazón fuerte', 'Instinto', 'Refugio', 'Agua limpia', 'Carne seca', 'Huesos de lobo'], ['de la Naturaleza', 'del Refugio', 'de la Manada', 'de la Medicina', 'del Instinto', 'del Invierno', 'del Desierto', 'de la Selva', 'de la Vida', 'del Último Superviviente']],
  pyro: [['Chispa viva', 'Carbón', 'Llama azul', 'Humo negro', 'Lava', 'Horno', 'Antorcha', 'Ceniza ardiente', 'Brasa eterna'], ['de la Llama', 'de la Brasa', 'del Volcán', 'de la Ceniza', 'del Sol', 'del Magma', 'de la Hoguera', 'del Incendio', 'del Fénix', 'del Infierno']],
};
// Recompensas: al completar un talento grande (todos sus rangos) aprendes un hechizo o recibes objetos;
// cada Maestría te da una habilidad nueva (un efecto propio que se suma al personaje). Los objetos, solo la primera vez.
const TAL_RW = {
  war: [['sp', 'quake'], ['it', 'adrenaPill3', 3], ['sp', 'shield'], ['sp', 'spiritWolf'], ['it', 'adrenaShot5', 2], ['ab', 'Grito de guerra', '+20 % de adrenalina y +2 s de furia', { adrGain: 0.2, furyDur: 2 }], ['ab', 'Piel de piedra', '+4 de armadura y +5 % de resistencia física', { def: 4, resPh: 0.05 }], ['ab', 'Torbellino', '+6 % de que tus golpes estallen', { chBoom: 0.06 }], ['ab', 'Golpe de gigante', '+10 % de daño con hachas y mazas y +20 de aturdimiento', { axeDmg: 0.1, stagger: 20 }]],
  blade: [['sp', 'blink'], ['sp', 'haste'], ['it', 'adrenaPill3', 3], ['sp', 'timeStop'], ['it', 'adrenaShot5', 2], ['ab', 'Paso de duelista', '+5 % de esquiva', { dodge: 0.05 }], ['ab', 'Contraataque veloz', '+10 % de velocidad de ataque', { atkSpd: 0.1 }], ['ab', 'Hoja sedienta', '+2 % de robo de vida', { lifesteal: 0.02 }], ['ab', 'Maestro de la espada', '+12 % de daño con espadas y +5 % de crítico', { swordDmg: 0.12, critP: 0.05 }]],
  hunt: [['sp', 'roots'], ['it', 'arrow', 60], ['sp', 'poisonCloud'], ['sp', 'spiritWolf'], ['sp', 'haste'], ['ab', 'Paso ligero', '+5 % de velocidad', { speed: 1.05 }], ['ab', 'Ojo de águila', '+5 % de crítico físico', { critP: 0.05 }], ['ab', 'Flechas pesadas', '+12 % de daño con arcos y ballestas', { bowDmg: 0.12 }], ['ab', 'Instinto de caza', '+8 % de daño a jefes y +4 % de esquiva', { bossDmg: 0.08, dodge: 0.04 }]],
  arc: [['sp', 'iceLance'], ['sp', 'chainBolt'], ['sp', 'frostNova'], ['sp', 'arcaneMissiles'], ['sp', 'blackHole'], ['sp', 'storm'], ['ab', 'Mente infinita', '+40 de maná', { mana: 40 }], ['ab', 'Canalizador', '+10 % de poder de hechizos', { spell: 0.1 }], ['ab', 'Bastón vivo', '+12 % de daño con bastones y varitas', { staffDmg: 0.12 }], ['ab', 'Cadena eterna', '+6 % de rayo en cadena', { chChain: 0.06 }]],
  craft: [['it', 'coin', 100], ['sp', 'shield'], ['it', 'adrenaPill3', 3], ['sp', 'quake'], ['it', 'coin', 250], ['ab', 'Brazos de acero', '+20 de carga y +10 % de trabajo', { carry: 20, work: 1.1 }], ['ab', 'Ojo de minero', 'Picas un 15 % más rápido', { mine: 1.15 }], ['ab', 'Suerte del artesano', '+5 % de suerte', { luck: 0.05 }], ['ab', 'Hacha de leñador', 'Talas un 15 % más rápido y +8 % de daño con hachas', { wood: 1.15, axeDmg: 0.08 }]],
  surv: [['sp', 'heal'], ['it', 'adrenaPill3', 3], ['sp', 'roots'], ['sp', 'holyLight'], ['sp', 'drain'], ['it', 'adrenaShot5', 2], ['ab', 'Sangre fría', '+10 % de resistencia a la escarcha y al veneno', { resC: 0.1, resP: 0.1 }], ['ab', 'Recuperación', '+0,5 de vida por segundo', { regen: 0.5 }], ['ab', 'Piel de oso', '+25 de vida y +8 % de resistencia salvaje', { hp: 25, resW: 0.08 }]],
  pyro: [['sp', 'fireball'], ['sp', 'meteor'], ['it', 'adrenaPill3', 3], ['sp', 'inferno'], ['it', 'adrenaShot5', 2], ['ab', 'Ignición', '+6 % de quemar', { chBurn: 0.06 }], ['ab', 'Corazón de lava', '+15 % de resistencia al fuego', { resF: 0.15 }], ['ab', 'Combustión', '+15 % de daño de quemaduras', { dotDmg: 0.15 }], ['ab', 'Vara ardiente', '+12 % de daño con bastones y varitas', { staffDmg: 0.12 }]],
};
const rwTxt = r => !r ? '' : r[0] === 'sp' ? `✦ Aprendes el hechizo «${(typeof SPELLS !== 'undefined' && SPELLS[r[1]] || { n: r[1] }).n}»` : r[0] === 'it' ? `🎒 Recibes ${r[2]}× ${(ITEMS[r[1]] || ITEMS.coin || { n: r[1] }).n}` : `⭐ Habilidad «${r[1]}»: ${r[2]}`;
const tsScale = (s, v, f) => TSTAT[s][2] === 'm' ? 1 + (v - 1) * f : TSTAT[s][2] === 'n' ? Math.round(v * f) : v * f;
const TAL_PER_LV = 3, TAL_KEY_NEED = 80;
// Coste de cada rango (sube con la zona z = 1…5): bono pequeño 1-3, bono mayor 1+z, talento grande 2+rango+(z-1)
// (3, 4, 5… abajo; 6, 7, 8… arriba), Maestría 4+2z y talento final 15
const talCostAt = (t, r) => { const z = t.tier || 1; return t.kind === 'key' ? 15 : t.kind === 'mas' ? 4 + 2 * z : t.kind === 'big' ? 2 + r + (z - 1) : t.kind === 'med' ? 1 + z : t.kind === 'root' ? 1 : z <= 2 ? 1 : z <= 4 ? 2 : 3; };
const talCostTo = (t, k) => { let s = 0; for (let r = 1; r <= Math.min(k, t.max); r++) s += talCostAt(t, r); return s; };
// ---------- Constelación (igual para todas las ramas; y hacia arriba es negativo) ----------
const TL_R = { root: 54, key: 46, mas: 44, big: 36, med: 24, min: 15 };
function talLayout() {
  const P = [], G = [], add = (x, y, k) => { const n = { s: 'v' + P.length, x: Math.round(x), y: Math.round(y), k, nb: [], g: null }; P.push(n); return n; };
  const group = (c, ring) => { const g = G.length; G.push([c, ...ring]); for (const n of [c, ...ring]) if (n.g == null) n.g = g; };
  const link = (a, b) => { if (a !== b && !a.nb.includes(b)) { a.nb.push(b); b.nb.push(a); } };
  const pos = (r, a) => [r * Math.cos(a * Math.PI / 180), -r * Math.sin(a * Math.PI / 180)];
  // Camino de bonos pequeños entre dos nodos; si pasa por encima de otro nodo, se une a él (los caminos se cruzan)
  const hit = (x, y, r, skip) => P.find(o => o !== skip && Math.hypot(o.x - x, o.y - y) < TL_R[o.k] + r + 10);
  const path = (a, b) => { const d = Math.hypot(b.x - a.x, b.y - a.y) - TL_R[a.k] - TL_R[b.k], n = Math.max(0, Math.round(d / 85) - 1); let prev = a;
    for (let i = 1; i <= n; i++) { const u = i / (n + 1), x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u, o = hit(x, y, TL_R.min, null);
      if (o) { if (o !== prev && o !== b) { link(prev, o); prev = o; } continue; } const m = add(x, y, 'min'); link(prev, m); prev = m; }
    link(prev, b); };
  const cluster = (r, a) => { const [cx, cy] = pos(r, a), c = add(cx, cy, 'big'), ring = [];
    for (let i = 0; i < 6; i++) { const t = (a + 180 + i * 60) * Math.PI / 180; ring.push(add(cx + 82 * Math.cos(t), cy - 82 * Math.sin(t), i === 3 ? 'med' : 'min')); }
    ring.forEach((q, i) => link(q, ring[(i + 1) % 6])); link(c, ring[0]); link(c, ring[3]); group(c, ring); return { c, ring, a, r }; };
  const near = (cl, x, y) => cl.ring.reduce((b, q) => Math.hypot(q.x - x, q.y - y) < Math.hypot(b.x - x, b.y - y) ? q : b);
  const join = (A, B) => path(near(A, B.c.x, B.c.y), near(B, A.c.x, A.c.y));
  const closest = (list, a) => list.reduce((b, o) => Math.abs(o.a - a) < Math.abs(b.a - a) ? o : b);
  const second = (list, a) => [...list].sort((x, y) => Math.abs(x.a - a) - Math.abs(y.a - a))[1];
  // Primero todos los nodos grandes (para que los caminos los esquiven), luego los caminos
  const root = add(0, 0, 'root');
  const T1 = [135, 90, 45].map(a => cluster(330, a)), T2 = [160, 125, 90, 55, 20].map(a => cluster(690, a)), T3 = [170, 143, 117, 90, 63, 37, 10].map(a => cluster(1060, a));
  const T4 = [173, 152, 131, 110.5, 90, 69.5, 49, 28, 7].map(a => cluster(1450, a));
  // Maestrías: grandes nodos entre las constelaciones, con su propio anillo
  const mas = [];
  for (const [r, list] of [[510, [112.5, 67.5]], [875, [142.5, 107.5, 72.5, 37.5]], [1255, [156.5, 123.5, 56.5, 23.5]]]) for (const a of list) {
    const [cx, cy] = pos(r, a), c = add(cx, cy, 'mas'), ring = []; for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI * 2 + 0.2; const x = cx + 96 * Math.cos(t), y = cy + 96 * Math.sin(t), k = i % 4 === 1 ? 'med' : 'min'; ring.push(hit(x, y, TL_R[k], null) || add(x, y, k)); } // si choca con otro anillo, comparten el nodo
    ring.forEach((q, i) => link(q, ring[(i + 1) % 8])); ring.forEach((q, i) => { if (i % 2 === 0) link(c, q); }); group(c, ring); mas.push({ c, ring, a, r }); }
  const wings = [-1, 1].map(sx => add(sx * 300, 40, 'med'));
  const keys = [148, 113, 67, 32].map(a => { const [x, y] = pos(1840, a); return add(x, y, 'key'); });
  for (const c of T1) path(root, near(c, 0, 0));
  for (const c of T2) join(c, closest(T1, c.a));
  for (const c of T3) join(c, closest(T2, c.a));
  for (const c of T4) join(c, closest(T3, c.a));
  // Más conexiones: cada constelación también con la segunda más cercana del anillo de abajo (en las puntas no, que cruzarían)
  for (const [T, U] of [[T3, T2], [T4, T3]]) for (const c of T.slice(1, -1)) { const o = second(U, c.a); if (o && Math.abs(o.a - c.a) < 30) join(c, o); }
  for (const T of [T1, T2, T3, T4]) for (let i = 0; i + 1 < T.length; i++) join(T[i], T[i + 1]);
  wings.forEach((w, i) => { path(root, w); path(w, near(T1[i ? 2 : 0], w.x, w.y)); });
  // Cada Maestría, unida a las 3 constelaciones más cercanas
  const all = [...T1, ...T2, ...T3, ...T4];
  for (const M of mas) for (const o of [...all].sort((x, y) => Math.hypot(x.c.x - M.c.x, x.c.y - M.c.y) - Math.hypot(y.c.x - M.c.x, y.c.y - M.c.y)).slice(0, 3)) join(M, o);
  // Talentos finales, al final de dos caminos desde las constelaciones de arriba (y unidos entre sí)
  keys.forEach((k, i) => { const a = [148, 113, 67, 32][i]; path(near(closest(T4, a), k.x, k.y), k); path(near(second(T4, a), k.x, k.y), k); });
  for (let i = 0; i + 1 < keys.length; i++) path(keys[i], keys[i + 1]);
  const bigs = [...T1, ...T2, ...T3, ...T4].map(c => c.c); // de abajo arriba
  return { P, G, bigs, keys, mas: mas.map(m => m.c) };
}
// Zona de cada nodo según lo lejos que está de la Maestría: 1 (abajo) a 5 (los talentos finales)
const tlTier = (x, y) => { const d = Math.hypot(x, y); return d < 450 ? 1 : d < 820 ? 2 : d < 1180 ? 3 : d < 1600 ? 4 : 5; };
const TAL = {}, TALN = {}, TALE = {}, TALB = {}, TALG = {};
{ const L = talLayout();
  for (const br in TAL_TREE) { const B = TAL_TREE[br]; let mi = 0, me = 0; TALN[br] = []; const byS = {};
    for (const n of L.P) { let t; const tier = tlTier(n.x, n.y), zf = 1 + 0.4 * (tier - 1);
      if (n.k === 'root') { const [id, nm, i, d, fx] = B.root; t = { id, n: nm, i, max: 1, fx: () => fx, d }; }
      else if (n.k === 'key') { const [id, nm, i, fx, d] = B.keys[L.keys.indexOf(n)]; t = { id, n: nm, i, max: 1, fx, d }; }
      else if (n.k === 'big' && L.bigs.indexOf(n) < B.big.length) { const [id, nm, i, max, fx, d] = B.big[L.bigs.indexOf(n)]; t = { id, n: nm, i, max, fx, d }; }
      else if (n.k === 'big') { const j = L.bigs.indexOf(n) - B.big.length, p = B.pool, [s1, v1] = p[(j * 5 + 2) % p.length], [s2, v2] = p[(j * 5 + 7) % p.length], a = tsScale(s1, v1, 1.2 + 0.25 * tier), b = tsScale(s2, v2, 1.2 + 0.25 * tier), m1 = TSTAT[s1][2] === 'm', m2 = TSTAT[s2][2] === 'm';
        t = { id: br + ':g' + j, n: TAL_GEN[br][0][j], i: TSTAT[s1][1], max: 3, fx: k => s1 === s2 ? { [s1]: m1 ? 1 + (a - 1 + b - 1) * k : (a + b) * k } : { [s1]: m1 ? 1 + (a - 1) * k : a * k, [s2]: m2 ? 1 + (b - 1) * k : b * k }, d: `${tsTxt(s1, a)} y ${tsTxt(s2, b)}` }; }
      else if (n.k === 'mas') { const j = L.mas.indexOf(n), p = B.pool, ss = [p[(j * 4) % p.length], p[(j * 4 + 5) % p.length], p[(j * 4 + 9) % p.length]], fx = {};
        for (const [s, v] of ss) { const w = tsScale(s, v, 2.5 + tier); fx[s] = fx[s] == null ? w : TSTAT[s][2] === 'm' ? fx[s] * w : fx[s] + w; }
        t = { id: br + ':m' + j, n: 'Maestría ' + TAL_GEN[br][1][j], i: TSTAT[ss[0][0]][1], max: 1, fx: () => fx, d: Object.entries(fx).map(([s, v]) => tsTxt(s, v)).join(', ') }; }
      else if (n.k === 'med') { const p = B.pool, [s1, v1] = p[(me * 5 + 1) % p.length], [s2, v2] = p[(me * 5 + 4) % p.length]; me++; const sc = (s, v) => tsScale(s, v, 1.6 * zf); const a = sc(s1, v1), b = sc(s2, v2), cap = s => TSTAT[s][0][0].toUpperCase() + TSTAT[s][0].slice(1);
        t = { id: br + ':' + n.s, n: `${cap(s1)} y ${TSTAT[s2][0]}`, i: TSTAT[s1][1], max: 1, fx: () => s1 === s2 ? { [s1]: a + b } : { [s1]: a, [s2]: b }, d: `${tsTxt(s1, a)} y ${tsTxt(s2, b)}` }; }
      else { const [st, v0] = B.pool[mi++ % B.pool.length], v = tsScale(st, v0, zf); t = { id: br + ':' + n.s, n: TSTAT[st][0][0].toUpperCase() + TSTAT[st][0].slice(1), i: TSTAT[st][1], max: 1, fx: () => ({ [st]: v }), d: tsTxt(st, v) }; }
      Object.assign(t, { br, kind: n.k, x: n.x, y: n.y, nb: [], g: n.g, tier }); TAL[t.id] = t; byS[n.s] = t; TALN[br].push(t); }
    { const RW = TAL_RW[br] || [], gifts = RW.filter(r => r[0] !== 'ab' && (r[0] !== 'sp' || typeof SPELLS === 'undefined' || SPELLS[r[1]])), abil = RW.filter(r => r[0] === 'ab'); let gi = 0, ai = 0;
      for (const t of TALN[br]) { if (t.kind === 'big' && gifts.length && (gi++ % 2 === 0 || t.max > 3)) t.rw = gifts[(gi >> 1) % gifts.length]; else if (t.kind === 'mas' && abil.length) t.rw = abil[ai++ % abil.length]; } }
    TALG[br] = L.G.map(m => ({ c: byS[m[0].s].id, ids: m.map(n => byS[n.s].id) }));
    const E = TALE[br] = [];
    for (const n of L.P) for (const o of n.nb) if (+n.s.slice(1) < +o.s.slice(1)) { const a = byS[n.s], b = byS[o.s]; a.nb.push(b.id); b.nb.push(a.id); E.push([a, b]); }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const t of TALN[br]) { x0 = Math.min(x0, t.x); y0 = Math.min(y0, t.y); x1 = Math.max(x1, t.x); y1 = Math.max(y1, t.y); }
    TALB[br] = { x0: x0 - 140, y0: y0 - 140, x1: x1 + 140, y1: y1 + 160 };
  } }
if (typeof CH_KEYS !== 'undefined' && !CH_KEYS.includes('talents')) CH_KEYS.push('talents'); // van con el personaje (y con la mochila de cada tipo de mundo)
if (typeof PERSONAL !== 'undefined') PERSONAL.add('talents');
const talData = () => S.talents || (S.talents = {});
const talSpent = br => { const T0 = talData(); let s = 0; for (const id in T0) { const t = TAL[id]; if (t && (!br || t.br === br)) s += talCostTo(t, T0[id] | 0); } return s; };
const talPts = () => Math.max(0, (S && S.pc ? (charLevel() - 1) * TAL_PER_LV : 0) - talSpent());
const talHas = id => (talData()[id] | 0) > 0;
// Un grupo (constelación o Maestría) está completo cuando tienes todos sus nodos
const talGroupDone = (br, g) => g == null || TALG[br][g].ids.every(talHas);
// Puedes pasar de X a T si X es tuyo y, si X está en un grupo distinto, ese grupo está completo
const talPass = (x, t, has = talHas) => has(x.id) && (x.g == null || x.g === t.g || TALG[x.br][x.g].ids.every(has));
const talReach = t => t.kind === 'root' || talHas(t.id) || t.nb.some(id => talPass(TAL[id], t));
// Grupo que te corta el paso (para avisar)
const talBlock = t => { for (const id of t.nb) { const x = TAL[id]; if (talHas(id) && x.g != null && x.g !== t.g && !talGroupDone(x.br, x.g)) return TALG[x.br][x.g]; } return null; };
const talNext = t => talCostAt(t, (talData()[t.id] | 0) + 1);
const talWhy = t => { const k = talData()[t.id] | 0; if (k >= t.max) return 'Ya tiene todos sus rangos'; if (!talReach(t)) { const g = talBlock(t); if (g) return `Completa antes la constelación «${TAL[g.c].n}» (${g.ids.filter(talHas).length}/${g.ids.length})`; return 'Aprende antes un nodo conectado'; } if (t.kind === 'key' && talSpent(t.br) < TAL_KEY_NEED) return `Gasta antes ${TAL_KEY_NEED} puntos en ${TAL_TREE[t.br].n} (llevas ${talSpent(t.br)})`; const c = talNext(t), p = talPts(); if (p < c) return `Cuesta ${c} punto${c === 1 ? '' : 's'} y tienes ${p}: sube de nivel tus habilidades`; return ''; };
// Para charMods (sim/character.js): pares [mod, valor]
function talMods() { const r = []; if (!S || !S.talents) return r; for (const id in S.talents) { const t = TAL[id], k = S.talents[id] | 0; if (!t || !k) continue; const m = t.fx(Math.min(k, t.max)); for (const key in m) r.push([key, m[key]]); if (t.rw && t.rw[0] === 'ab' && k >= t.max) for (const key in t.rw[3]) r.push([key, t.rw[3][key]]); } return r; }
const talDirty = () => { _cm = null; _cmKey = ''; vitalsDirty = true; }; // que el personaje vuelva a calcular sus estadísticas
function talBuy(id) {
  const t = TAL[id], T0 = talData(), k = T0[id] | 0; if (!t) return false;
  const why = talWhy(t); if (why) { toastErr(why); tone(160, 0.12, 'square', 0.03, 0.8); return false; }
  T0[id] = k + 1; talDirty(); tone(520 + k * 80, 0.12, 'triangle', 0.05, 1.3); tone(780 + k * 60, 0.1, 'sine', 0.03, 1.2, 0.08);
  if (t.kind === 'key') { tone(880, 0.3, 'triangle', 0.05, 1.2, 0.12); wvBanner(`${t.i} ${t.n}`, 'Talento final desbloqueado', TAL_TREE[t.br].c, 3); sparkRing(S.player.x, S.player.y, 40, TAL_TREE[t.br].c, 140, { up: 50, life: 1 }); }
  if (k + 1 >= t.max && t.rw) talReward(t);
  advRender(); tlwBurst(t); tlwDom(); return true;
}
function talReward(t) { const r = t.rw, B = TAL_TREE[t.br], got = S.talRw || (S.talRw = {});
  if (r[0] === 'sp') { const st = typeof spellState === 'function' && spellState(); if (st && SPELLS[r[1]] && !st.known.includes(r[1])) { learnSpell(r[1]); wvBanner(`${SPELLS[r[1]].i} ${SPELLS[r[1]].n}`, `Nuevo hechizo por «${t.n}»`, B.c, 3); return; } if (got[t.id]) return; got[t.id] = 1; invGive(ITEMS.adrenaPill3 ? 'adrenaPill3' : 'coin', ITEMS.adrenaPill3 ? 2 : 80); toast(`🎁 Ya conocías ese hechizo: recibes un premio por «${t.n}»`, true); return; }
  if (r[0] === 'it') { if (got[t.id]) return; got[t.id] = 1; const id = ITEMS[r[1]] ? r[1] : 'coin'; invGive(id, r[2]); toast(`🎁 «${t.n}» completo: ${r[2]}× ${ITEMS[id].n}`, true); return; }
  wvBanner(`⭐ ${r[1]}`, `Nueva habilidad: ${r[2]}`, B.c, 3); }
{ const k = 'talRw'; if (typeof CH_KEYS !== 'undefined' && !CH_KEYS.includes(k)) CH_KEYS.push(k); if (typeof PERSONAL !== 'undefined') PERSONAL.add(k); }
const talResetCost = () => (S.talReset ? 8 * talSpent() : 0);
function talReset() { const cost = talResetCost(), n = talSpent(); if (!n) return; if (invCount('coin') < cost) { toastErr(`Reiniciar cuesta ${cost} monedas`); return; } if (cost) invTake('coin', cost); S.talents = {}; S.talReset = (S.talReset || 0) + 1; talDirty(); toast(`🌳 Talentos reiniciados: recuperas ${n} puntos${cost ? ` (−${cost} monedas)` : ' (la primera vez es gratis)'}`); advRender(); tlwDom(); }
// Aviso al subir de nivel (y los atributos vuelven a calcularse)
{ const g0 = gainXP; gainXP = (k, n) => { const before = S && S.pc ? charLevel() : 0; const r = g0(k, n); if (S && S.pc && charLevel() > before) { talDirty(); setTimeout(() => toast(`🌳 ¡+${TAL_PER_LV} puntos de talento! Tienes ${talPts()} para gastar (tecla K)`, true), 900); } return r; }; }

// =====================================================================================
//  Ventana del árbol (K). Todo el árbol se pinta en un lienzo: cámara con zoom y arrastre suaves,
//  dibujos precalculados (discos, iconos, brillos y fondo) y solo lo que se ve en pantalla.
// =====================================================================================
const TLW = { br: 'war', sel: null, hov: null, view: 'tree', cam: { x: 0, y: -500, z: 0.6 }, tgt: { x: 0, y: -500, z: 0.6 }, vel: { x: 0, y: 0 }, drag: null, sure: 0, fx: [], raf: 0, t: 0, panT: 0, W: 0, H: 0, dpr: 1, spr: {}, pop: {}, hz: {}, sig: '', tipId: null, tipW: 0, tipH: 0, ctx: null, mini: null };
{ const m = document.createElement('div'); m.id = 'mTal'; m.className = 'modal tlwm'; m.hidden = true;
  m.innerHTML = `<div class="tlw">
    <nav class="tlnav"><kbd data-tlnav="prev">‹</kbd><button data-tlnav="char">Personaje</button><button data-tlnav="inv">Inventario</button><button data-tlnav="tree" class="on">Árbol de talentos</button><button data-tlnav="skills">Habilidades</button><button data-tlnav="adv">Aventura</button><button data-tlnav="quest">Encargos</button><button data-tlnav="map">Mapa</button><kbd data-tlnav="next">›</kbd></nav>
    <aside class="tlL" id="tlL"></aside>
    <main class="tlC" id="tlC"><div class="tlbr" id="tlBr"></div><canvas id="tlCv"></canvas><div class="tlsk" id="tlSk" hidden></div><div class="tltip" id="tlTip" hidden></div><button class="tlfit" data-tlfit title="Ver todo el árbol / volver">⤢</button></main>
    <aside class="tlR" id="tlR"></aside>
    <footer class="tlfoot"><span><kbd>🖱</kbd> Seleccionar · <kbd>Rueda</kbd> Zoom · <kbd>Arrastrar</kbd> Mover</span><span><kbd>Clic ×2</kbd><kbd>Enter</kbd> Aprender</span><span><kbd>Q</kbd><kbd>E</kbd> Rama</span><button data-tlreset id="tlReset"></button><span data-close class="tlclose"><kbd>K</kbd> Cerrar</span></footer>
  </div>`;
  document.body.appendChild(m); MODALS.tal = 'mTal';
  m.addEventListener('mousedown', e => { if (e.target === m || e.target.closest('[data-close]')) closeModal(); }); }
const tlwOn = () => ui.open === 'tal';
// Precarga (fondo e iconos de cada rama, una por fotograma) para que cambiar de rama no dé tirones
function tlwWarm() { if (TLW.warm) return; TLW.warm = 1; const brs = Object.keys(TAL_TREE); let i = 0;
  const step = () => { if (i >= brs.length) return; const br = brs[i++]; tlBg(br); for (const n of TALN[br]) for (const st of ['lock', 'near', 'got']) tlIcon(n.i, st); for (const st in TL_RIM) tlDisc(st, TAL_TREE[br].c); tlGlow(TAL_TREE[br].c); setTimeout(step, 30); };
  setTimeout(step, 30); }
setTimeout(() => (window.requestIdleCallback || setTimeout)(tlwWarm), 4000);
function tlwOpen(br) { if (!S) return; tlwWarm(); if (!S.pc) { toast('Los talentos se ganan subiendo de nivel en un mundo con supervivencia'); return; } if (br) TLW.br = br; TLW.view = 'tree'; openModal('tal'); tlwSize(); tlwHome(true); tlwDom(); tlwLoop(); }
// Estado de cada nodo: full, got (aprendido), can (se puede aprender), near (conectado pero sin puntos o bloqueado), lock
const tlSt = t => { const k = talData()[t.id] | 0; return k >= t.max ? 'full' : k ? 'got' : !talWhy(t) ? 'can' : talReach(t) ? 'near' : 'lock'; };
// ---------- Cámara ----------
function tlwSize() { const C = $('tlC'), cv = $('tlCv'); if (!C || !cv) return; const r = C.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); TLW.W = r.width; TLW.H = r.height; TLW.dpr = d; cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); TLW.ctx = cv.getContext('2d'); }
const tlwFitZ = () => { const b = TALB[TLW.br]; return Math.min(TLW.W / (b.x1 - b.x0), TLW.H / (b.y1 - b.y0)) || 0.3; };
const tlwZMin = () => tlwFitZ() * 0.85, TLW_ZMAX = 2.4;
function tlwHome(now) { const z = Math.max(tlwFitZ(), Math.min(1, Math.min(TLW.W / 1500, TLW.H / 950))); const T0 = { x: 0, y: -(TLW.H * 0.36) / z, z }; TLW.tgt = { ...T0 }; if (now) TLW.cam = { ...T0 }; TLW.vel = { x: 0, y: 0 }; }
function tlwFitAll() { const b = TALB[TLW.br]; TLW.tgt = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, z: tlwFitZ() }; TLW.vel = { x: 0, y: 0 }; }
const tlwS2W = (sx, sy) => ({ x: TLW.cam.x + (sx - TLW.W / 2) / TLW.cam.z, y: TLW.cam.y + (sy - TLW.H / 2) / TLW.cam.z });
const tlwW2S = (x, y) => ({ x: (x - TLW.cam.x) * TLW.cam.z + TLW.W / 2, y: (y - TLW.cam.y) * TLW.cam.z + TLW.H / 2 });
function tlwClampT() { const b = TALB[TLW.br], g = TLW.tgt; g.z = Math.max(tlwZMin(), Math.min(TLW_ZMAX, g.z)); g.x = Math.max(b.x0, Math.min(b.x1, g.x)); g.y = Math.max(b.y0, Math.min(b.y1, g.y)); }
function tlwPick(sx, sy) { const p = tlwS2W(sx, sy), z = TLW.cam.z; let best = null, bd = 1e9; for (const t of TALN[TLW.br]) { const d = Math.hypot(t.x - p.x, t.y - p.y), R = Math.max(TL_R[t.kind] + 4, 9 / z); if (d < R && d < bd) { bd = d; best = t; } } return best; }
// ---------- Dibujos precalculados ----------
function tlSpr(key, size, draw) { let c = TLW.spr[key]; if (c) return c; c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); return (TLW.spr[key] = c); }
const tlGlow = col => tlSpr('g' + col, 128, (c, s) => { const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, col); g.addColorStop(0.35, col + '88'); g.addColorStop(1, col + '00'); c.fillStyle = g; c.fillRect(0, 0, s, s); });
const TL_RIM = { lock: ['#5e4428', '#3a2a18'], near: ['#c8945a', '#6a4a24'], can: ['#fff2c0', '#ffc860'], got: ['#ffe6a8', '#a85a12'], full: ['#fff4cc', '#e08a2a'] };
const tlDisc = (st, col) => tlSpr('d' + st + col, 128, (c, s) => { const h = s / 2, lit = st === 'got' || st === 'full';
  const g = c.createRadialGradient(h, h * 0.7, 4, h, h, 58); if (lit) { g.addColorStop(0, col); g.addColorStop(0.55, '#5a2a10'); g.addColorStop(1, '#1a0c06'); } else { g.addColorStop(0, '#4a2c18'); g.addColorStop(0.7, '#1c120c'); g.addColorStop(1, '#0c0806'); }
  c.fillStyle = g; c.beginPath(); c.arc(h, h, 58, 0, Math.PI * 2); c.fill();
  const r = c.createLinearGradient(0, 4, 0, s - 4); r.addColorStop(0, TL_RIM[st][0]); r.addColorStop(1, TL_RIM[st][1]); c.strokeStyle = r; c.lineWidth = lit || st === 'can' ? 9 : 6; c.beginPath(); c.arc(h, h, 58, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = '#00000088'; c.lineWidth = 2; c.beginPath(); c.arc(h, h, 52, 0, Math.PI * 2); c.stroke(); });
const TL_ICF = { lock: 'sepia(.6) grayscale(.45) brightness(.7)', near: 'sepia(.3) grayscale(.15) brightness(.92)' };
const tlIcon = (ic, st) => { const f = TL_ICF[st] || 'none'; return tlSpr('i' + ic + f, 96, (c, s) => { c.filter = f; c.font = '68px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ic, s / 2, s / 2 + 4); }); };
// Fondo de cada rama (grietas de lava y el emblema), en baja resolución: se estira con la cámara
function tlBg(br) { const k = 'bg' + br; if (TLW.spr[k]) return TLW.spr[k]; const b0 = TALB[br], b = { x0: b0.x0 - 900, y0: b0.y0 - 700, x1: b0.x1 + 900, y1: b0.y1 + 900 }, B = TAL_TREE[br], sc = 0.25, w = Math.ceil((b.x1 - b.x0) * sc), h = Math.ceil((b.y1 - b.y0) * sc), cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d');
  const tx = x => (x - b.x0) * sc, ty = y => (y - b.y0) * sc;   let s = 0; for (const ch of br) s = (s * 31 + ch.charCodeAt(0)) >>> 0; const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) >>> 8) / 16777216;
  c.strokeStyle = B.c; c.lineCap = c.lineJoin = 'round'; for (let i = 0; i < 60; i++) { let x = (rnd() - 0.5) * 300, y = 60, a = -Math.PI / 2 + (rnd() - 0.5) * 2.9; c.globalAlpha = 0.08 + rnd() * 0.12; c.lineWidth = 0.4 + rnd() * 1.4; c.beginPath(); c.moveTo(tx(x), ty(y)); const n = 5 + (rnd() * 9 | 0); for (let j = 0; j < n; j++) { a += (rnd() - 0.5) * 0.9; const l = 60 + rnd() * 140; x += Math.cos(a) * l; y += Math.sin(a) * l; c.lineTo(tx(x), ty(y)); } c.stroke(); }
  c.globalAlpha = 0.05; c.font = `${Math.round(900 * sc)}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(B.i, tx(0), ty(-700)); c.globalAlpha = 1;
  return (TLW.spr[k] = { cv, x0: b.x0, y0: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0 }); }
// Líneas con algo de quiebro (como grietas), precalculadas
const _tlJ = new Map();
function tlJag(a, b) { const k = a.id + '>' + b.id; let p = _tlJ.get(k); if (p) return p; let h = 0; for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0; const r = () => ((h = (h * 1103515245 + 12345) >>> 0) >>> 8) / 16777216 - 0.5;
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, j = Math.min(10, L * 0.08); p = [a.x, a.y, a.x + dx / 3 + nx * r() * j, a.y + dy / 3 + ny * r() * j, a.x + dx * 2 / 3 + nx * r() * j, a.y + dy * 2 / 3 + ny * r() * j, b.x, b.y]; _tlJ.set(k, p); return p; }
// ---------- Pintar un fotograma ----------
function tlwDraw(dt) {
  { const cv = $('tlCv'); if (cv && (Math.abs(cv.clientWidth - TLW.W) > 0.5 || Math.abs(cv.clientHeight - TLW.H) > 0.5)) tlwSize(); } // lienzo siempre del tamaño de su caja (si no, se ve aplastado)
  const c = TLW.ctx, W = TLW.W, H = TLW.H; if (!c || !W) return; const br = TLW.br, B = TAL_TREE[br], T0 = talData(), cam = TLW.cam, g = TLW.tgt, v = TLW.vel;
  if (!TLW.drag && (v.x || v.y)) { g.x += v.x * dt; g.y += v.y * dt; const f = Math.exp(-dt * 4.5); v.x *= f; v.y *= f; if (Math.hypot(v.x, v.y) * cam.z < 8) v.x = v.y = 0; }
  tlwClampT(); const e = TLW.drag && !TLW.drag.mini ? 1 : 1 - Math.exp(-dt * 13); cam.x += (g.x - cam.x) * e; cam.y += (g.y - cam.y) * e; cam.z += (g.z - cam.z) * (1 - Math.exp(-dt * 13));
  const z = cam.z, ox = W / 2 - cam.x * z, oy = H / 2 - cam.y * z, d = TLW.dpr, t = TLW.t;
  c.setTransform(d, 0, 0, d, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.fillStyle = '#070504'; c.fillRect(0, 0, W, H);
  { const gr = c.createRadialGradient(ox, oy, 0, ox, oy, Math.max(400, 2300 * z)); gr.addColorStop(0, B.c + '50'); gr.addColorStop(0.18, '#3a1c0c90'); gr.addColorStop(0.55, '#1a0d0760'); gr.addColorStop(1, '#07050400'); c.fillStyle = gr; c.fillRect(0, 0, W, H); } // luz desde la Maestría, en pantalla: sin bordes
  const bg = tlBg(br); c.drawImage(bg.cv, bg.x0 * z + ox, bg.y0 * z + oy, bg.w * z, bg.h * z);
  // A partir de aquí, en coordenadas del árbol
  c.setTransform(d * z, 0, 0, d * z, d * ox, d * oy);
  const vx0 = -ox / z, vy0 = -oy / z, vx1 = (W - ox) / z, vy1 = (H - oy) / z, inV = (x, y, m = 0) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;
  const px = 1 / z; c.lineCap = c.lineJoin = 'round';
  // Caminos: tres pasadas (apagados, a medias y encendidos), cada una con un solo trazo
  const own = id => (T0[id] | 0) > 0, groups = { dim: [], half: [], lit: [] };
  for (const [a, b] of TALE[br]) { if (!inV(a.x, a.y, 200) && !inV(b.x, b.y, 200)) continue; const la = own(a.id), lb = own(b.id); groups[la && lb ? 'lit' : la || lb ? 'half' : 'dim'].push(tlJag(a, b)); }
  const stroke = (list, col, w, dash, off) => { if (!list.length) return; c.beginPath(); for (const p of list) { c.moveTo(p[0], p[1]); c.lineTo(p[2], p[3]); c.lineTo(p[4], p[5]); c.lineTo(p[6], p[7]); } c.strokeStyle = col; c.lineWidth = w; c.setLineDash(dash || []); c.lineDashOffset = off || 0; c.stroke(); };
  stroke(groups.dim, '#3c2c1e', Math.max(3, 1.3 * px)); stroke(groups.half, '#9a6a30', Math.max(3.4, 1.3 * px), [3, 7]);
  c.globalAlpha = 0.28; stroke(groups.lit, B.c, Math.max(14, 4 * px)); c.globalAlpha = 1; stroke(groups.lit, '#ffb04a', Math.max(4.5, 1.5 * px)); stroke(groups.lit, '#fff2c0', Math.max(2, px), [10, 22], -t * 45); c.setLineDash([]);
  // Nodos: primero los brillos (sumados), luego discos, iconos y rangos
  c.globalCompositeOperation = 'lighter';
  const P0 = talPts(), spB = talSpent(br), stOf = n => { const k = T0[n.id] | 0; if (k >= n.max) return 'full'; if (k) return 'got'; if (!(n.kind === 'root' || n.nb.some(id => talPass(TAL[id], n, own)))) return n.nb.some(own) ? 'near' : 'lock'; return (n.kind === 'key' && spB < TAL_KEY_NEED) || P0 < talCostAt(n, 1) ? 'near' : 'can'; };
  const vis = []; for (const n of TALN[br]) { const R = TL_R[n.kind]; if (!inV(n.x, n.y, R + 30)) continue; const st = stOf(n); vis.push([n, st]);
    const hz = TLW.hz[n.id] = (TLW.hz[n.id] || 0) + (((TLW.hov === n.id) ? 1 : 0) - (TLW.hz[n.id] || 0)) * Math.min(1, dt * 14);
    let ga = st === 'full' ? 0.75 : st === 'got' ? 0.55 : st === 'can' ? 0.3 + 0.22 * Math.sin(t * 4 + n.x * 0.01) : 0; ga = Math.max(ga, hz * 0.6, TLW.sel === n.id ? 0.8 : 0);
    if (ga > 0.02) { c.globalAlpha = ga; const G = R * (n.kind === 'root' || n.kind === 'key' || n.kind === 'mas' ? 2.6 : 2.2); c.drawImage(tlGlow(B.c), n.x - G, n.y - G, G * 2, G * 2); } }
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  const big = z * TL_R.min > 5;
  for (const [n, st] of vis) { const R0 = TL_R[n.kind], pop = TLW.pop[n.id] > 0 ? 1 + 0.4 * Math.sin((1 - TLW.pop[n.id] / 0.5) * Math.PI) : 1, R = R0 * (1 + 0.12 * (TLW.hz[n.id] || 0)) * pop, D = R * 2 * 64 / 58;
    if (n.kind === 'root' || n.kind === 'key' || n.kind === 'mas') { c.save(); c.translate(n.x, n.y); c.rotate(t * 0.25); c.strokeStyle = '#e8c89066'; c.lineWidth = 2.2; c.setLineDash([3, 8]); c.beginPath(); c.arc(0, 0, R + 9, 0, Math.PI * 2); c.stroke(); c.restore(); c.setLineDash([]); }
    c.drawImage(tlDisc(st, B.c), n.x - D / 2, n.y - D / 2, D, D);
    if (big) { const I = R * (n.kind === 'min' ? 1.25 : 1.1); c.drawImage(tlIcon(n.i, st), n.x - I / 2, n.y - I / 2, I, I); }
    if (n.rw && big) { const I = Math.max(13, R * 0.55), full = (T0[n.id] | 0) >= n.max; c.globalAlpha = full ? 0.55 : 0.6 + 0.4 * Math.sin(t * 3 + n.y); c.drawImage(tlIcon(n.rw[0] === 'ab' ? '⭐' : n.rw[0] === 'sp' ? '✨' : '🎁', 'got'), n.x + R * 0.55, n.y - R * 1.15, I, I); c.globalAlpha = 1; }
    if (TLW.sel === n.id) { c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(3, 1.5 * px); c.beginPath(); c.arc(n.x, n.y, R + 5, 0, Math.PI * 2); c.stroke(); }
    if (n.max > 1 && z * R0 > 9) { const k = T0[n.id] | 0; for (let j = 0; j < n.max; j++) { const a = Math.PI / 2 + (j - (n.max - 1) / 2) * 0.3; c.fillStyle = j < k ? '#ffd060' : '#2a2018'; c.beginPath(); c.arc(n.x + Math.cos(a) * (R + 9), n.y + Math.sin(a) * (R + 9), 3.4, 0, Math.PI * 2); c.fill(); } } }
  // Brasas y chispas (en coordenadas del árbol)
  if (TLW.fx.length < 150) for (let i = 0; i < 2; i++) { const fromRoot = Math.random() < 0.4; TLW.fx.push({ x: fromRoot ? (Math.random() - 0.5) * 160 : vx0 + Math.random() * (vx1 - vx0), y: fromRoot ? 40 : vy1 + 20, vx: (Math.random() - 0.5) * 20, vy: -(40 + Math.random() * 70) / Math.max(0.4, z), life: 2 + Math.random() * 3, t: 0, s: 1 + Math.random() * 2.4, c: Math.random() < 0.3 ? B.c : Math.random() < 0.5 ? '#ff8a2a' : '#ffcf6a', fl: Math.random() * 6 }); }
  if (groups.lit.length && Math.random() < 0.6) { const p = groups.lit[(Math.random() * groups.lit.length) | 0], u = Math.random(); TLW.fx.push({ x: p[0] + (p[6] - p[0]) * u, y: p[1] + (p[7] - p[1]) * u, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 30, life: 0.5 + Math.random() * 0.6, t: 0, s: 1.4 + Math.random() * 1.5, c: '#ffe0a0' }); }
  c.globalCompositeOperation = 'lighter';
  for (let i = TLW.fx.length - 1; i >= 0; i--) { const p = TLW.fx[i]; p.t += dt; if (p.t >= p.life) { TLW.fx.splice(i, 1); continue; } const k = 1 - p.t / p.life;
    if (p.ring) { c.globalAlpha = k; c.strokeStyle = p.c; c.lineWidth = 3 * px + 2; c.beginPath(); c.arc(p.x, p.y, p.r + (1 - k) * 70, 0, Math.PI * 2); c.stroke(); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; if (p.fl != null) p.vx += Math.sin(t * 3 + p.fl) * 14 * dt; else p.vy += 60 * dt;
    const s = p.s * Math.max(1, Math.min(2.2, 1.2 * px)); c.globalAlpha = Math.min(1, k * 1.5) * (p.fl != null ? 0.55 + 0.45 * Math.sin(t * 9 + p.fl) : 1); c.drawImage(tlGlow(p.c), p.x - s * 2.5, p.y - s * 2.5, s * 5, s * 5); }
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  // Minimapa (abajo a la derecha)
  c.setTransform(d, 0, 0, d, 0, 0); const b = TALB[br], mw = Math.min(190, W * 0.24), mh = mw * (b.y1 - b.y0) / (b.x1 - b.x0), mx = W - mw - 12, my = H - mh - 12, ms = mw / (b.x1 - b.x0); TLW.mini = { mx, my, mw, mh, ms };
  c.fillStyle = '#0d0a08d8'; c.strokeStyle = '#5a4630'; c.lineWidth = 1; c.fillRect(mx, my, mw, mh); c.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1);
  for (const n of TALN[br]) { const o = (T0[n.id] | 0) > 0, s = n.kind === 'min' ? 1.6 : n.kind === 'big' || n.kind === 'med' ? 2.6 : 3.6; c.fillStyle = o ? '#ffc860' : n.kind === 'key' || n.kind === 'mas' ? '#8a6a40' : '#4a3a2a'; c.fillRect(mx + (n.x - b.x0) * ms - s / 2, my + (n.y - b.y0) * ms - s / 2, s, s); }
  if (TLW.fade > 0) { TLW.fade = Math.max(0, TLW.fade - dt * 5); c.globalAlpha = TLW.fade * 0.85; c.fillStyle = '#070504'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; } // fundido suave al cambiar de rama
  c.strokeStyle = '#fff2c0'; c.strokeRect(mx + (cam.x - W / 2 / z - b.x0) * ms, my + (cam.y - H / 2 / z - b.y0) * ms, W / z * ms, H / z * ms);
}
// ---------- Bucle (solo mientras la ventana está abierta) ----------
function tlwLoop() {
  if (TLW.raf) return; let last = performance.now();
  const step = now => { if (!tlwOn()) { TLW.raf = 0; TLW.fx.length = 0; return; } TLW.raf = requestAnimationFrame(step); const dt = Math.min(0.05, (now - last) / 1000); last = now; TLW.t += dt;
    for (const k in TLW.pop) if ((TLW.pop[k] -= dt) <= 0) delete TLW.pop[k];
    if ((TLW.panT -= dt) <= 0) { TLW.panT = 0.5; tlwPanels(); }
    if (TLW.view === 'tree') { tlwDraw(dt); tlwTipPos(); } };
  TLW.raf = requestAnimationFrame(step);
}
function tlwBurst(t) { if (!tlwOn() || !t || t.br !== TLW.br) return; const c = TAL_TREE[t.br].c; for (let i = 0; i < 26; i++) { const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 160; TLW.fx.push({ x: t.x, y: t.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.5 + Math.random() * 0.6, t: 0, s: 1.5 + Math.random() * 2.5, c: Math.random() < 0.5 ? c : '#ffe0a0' }); }
  TLW.fx.push({ ring: 1, x: t.x, y: t.y, r: TL_R[t.kind], life: 0.6, t: 0, c }); TLW.pop[t.id] = 0.5; }
// ---------- Partes de HTML (solo se rehacen cuando cambian) ----------
function tlwDom() {
  if (!tlwOn()) return; const B = TAL_TREE[TLW.br];
  $('mTal').style.setProperty('--tc', B.c);
  document.querySelectorAll('[data-tlnav]').forEach(b => b.classList.toggle('on', b.dataset.tlnav === TLW.view));
  $('tlBr').innerHTML = `<kbd>Q</kbd>${Object.entries(TAL_TREE).map(([k, b]) => `<button class="${k === TLW.br ? 'on' : ''}" data-tlbr="${k}" style="--bc:${b.c}" title="${esc(b.n)}: ${esc(b.d)}"><span>${b.i}</span><small>${talSpent(k) || ''}</small></button>`).join('')}<kbd>E</kbd><div class="tlbrn"><b>${esc(B.n)}</b><small>${esc(B.d)}</small></div>`;
  const tree = TLW.view === 'tree'; for (const id of ['tlCv', 'tlBr']) $(id).style.display = tree ? '' : 'none'; document.querySelector('.tlfit').style.display = tree ? '' : 'none'; $('tlSk').hidden = tree;
  if (!tree) $('tlSk').innerHTML = tlwSkills();
  const cost = talResetCost(); $('tlReset').disabled = !talSpent(); $('tlReset').textContent = TLW.sure ? '¿Seguro? Pulsa otra vez' : `↺ Reiniciar${cost ? ` (${cost} 🪙)` : ' (gratis la 1.ª vez)'}`;
  TLW.sig = ''; tlwPanels(); tlwTip();
}
const tlPct = (v, d = 1) => (v * 100).toFixed(d).replace(/\.0$/, '') + '%';
const tlRow = (a, b, c) => `<div class="tlst"${c ? ` style="--ic:${c}"` : ''}><span>${a}</span><b>${b}</b></div>`;
function tlwPanels() {
  if (!tlwOn() || typeof statSheet !== 'function') return; const X = statSheet(), m = X.m, pc = S.pc;
  const L = `<div class="tlpn tlname"><h2>${esc(S.char && S.char.name || 'Aventurero')}</h2><small>${esc(TAL_TREE[TLW.br].n)}</small></div>
    <div class="tlpn"><h3>Recursos</h3>${tlRow('Vida', `${Math.round(pc.hp)} / ${Math.round(maxHp())}`)}${tlRow('Maná', `${Math.round(pc.mana || 0)} / ${Math.round(maxMana())}`)}${tlRow('Aguante', `${Math.round(pc.stam)} / ${Math.round(maxStam())}`)}${tlRow('Recarga de aguante', `${X.stamRegen.toFixed(1)}/s`)}${tlRow('Regeneración', `${m.regen.toFixed(2)}/s`)}${tlRow('Puntos de combo', `${X.combo} / ${5 + Math.round(m.comboMax)}`)}${tlRow('Adrenalina', `${Math.round(X.adr)} / 100${X.fury ? ' 🔥' : ''}`)}${tlRow('Carga de equipo', `${m.load.toFixed(1)} / ${m.loadMax.toFixed(1)} (${Math.round(m.load / m.loadMax * 100)}%)`, m.load > m.loadMax ? '#ff7a5a' : '')}</div>
    <div class="tlpn"><h3>Atributos</h3>${Object.entries(ATTR).map(([k, [n, i, c]]) => `<div class="tlst tlat" title="${esc(ATTR_TIP[k])}"><span><i style="color:${c}">${i}</i>${n}</span><b>${X.B[k] + Math.round(m[k] || 0)}${m[k] ? `<em>+${Math.round(m[k])}</em>` : ''}</b></div>`).join('')}</div>
    <div class="tlpn"><h3>Efectos al golpear</h3>${[['chBleed', 'Sangrado'], ['chBurn', 'Quemadura'], ['chLight', 'Marca de luz'], ['chPoison', 'Veneno'], ['chRoot', 'Enraizar'], ['chWeak', 'Debilidad'], ['chFreeze', 'Congelar'], ['chChain', 'Rayo en cadena'], ['chBoom', 'Explosión']].map(([k, n]) => tlRow(n, tlPct(m[k]))).join('')}</div>`;
  const R = `<div class="tlpn tllv"><h2>Nivel ${charLevel()}</h2><div class="tlpt ${talPts() ? 'have' : ''}"><span>Puntos de talento:</span><b>${talPts()}</b></div>${tlRow('Gastados', `${talSpent()} (${TAL_PER_LV} por nivel)`)}${tlRow('Esencia', X.ess.toLocaleString('es-ES'))}${tlRow('Para el siguiente nivel', X.need ? X.need.toLocaleString('es-ES') : '—')}</div>
    <div class="tlpn"><h3>Ofensiva</h3>${tlRow('Daño de arma', `${Math.round(X.base)} → <span style="color:#9ae09a">${Math.round(X.wd)}</span>`)}${X.wc ? tlRow('Talentos de tu arma', '+' + tlPct(m[X.wc])) : ''}${tlRow('Poder de hechizos', Math.round(100 * (1 + m.spell) * (1 + 0.05 * lvOf('combat'))))}${tlRow('Fuerza espiritual', Math.round(X.spirit))}${tlRow('Velocidad de ataque', '+' + tlPct(m.atkSpd))}${tlRow('Aplomo', Math.round(m.poise))}${tlRow('Aturdimiento', Math.round(m.stagger))}${tlRow('Crítico físico', tlPct(m.critP))}${tlRow('Crítico mágico', tlPct(m.critM))}${tlRow('Daño crítico', tlPct(m.critD, 0))}${tlRow('Robo de vida', tlPct(m.lifesteal))}</div>
    <div class="tlpn"><h3>Protección</h3>${tlRow('Armadura', Math.round(m.def))}${tlRow('Bloqueo', tlPct(m.block))}${tlRow('Esquiva', tlPct(m.dodge))}${tlRow('Espinas', tlPct(m.thorns))}${tlRow('Reducción de control', tlPct(m.ccRed))}</div>
    <div class="tlpn"><h3>Resistencias</h3>${RES_LIST.map(([k, n, i, c]) => `<div class="tlst"><span><i style="color:${c}">${i}</i>${n}</span><b>${tlPct(m[k])}</b></div>`).join('')}</div>`;
  const sig = L + R; if (sig === TLW.sig) return; TLW.sig = sig; $('tlL').innerHTML = L; $('tlR').innerHTML = R;
}
function tlwSkills() {
  const pc = S.pc; return `<h3>Habilidades</h3><p class="mut">Cada nivel de habilidad sube 1 el nivel de personaje y te da ${TAL_PER_LV} puntos de talento. Tus habilidades también fijan tus atributos de base.</p><div class="tlskg">${Object.entries(SKILLS).map(([k, [n, i, d]]) => { const lv = pc.lv[k] || 0, xp = pc.xp[k] || 0, need = lv >= MAX_LV ? 0 : xpNeed(lv);
    return `<div class="tlskc"><span class="i">${i}</span><div><b>${n} <em>${lv} / ${MAX_LV}</em></b><small>${esc(d)}</small><div class="tlxb"><i style="transform:scaleX(${need ? Math.min(1, xp / need).toFixed(3) : 1})"></i></div><small>${need ? `${Math.floor(xp)} / ${need} de experiencia` : 'Nivel máximo'}</small></div></div>`; }).join('')}</div>`;
}
// ---------- Tooltip: el contenido cambia solo al cambiar de nodo; la posición sigue a la cámara ----------
function tlwTip() {
  const tip = $('tlTip'), id = TLW.hov || TLW.sel, t = id && TAL[id]; if (!tip) return;
  if (!t || TLW.view !== 'tree' || TLW.drag && TLW.drag.moved) { tip.hidden = true; TLW.tipId = null; return; }
  const k = talData()[t.id] | 0, why = talWhy(t), full = k >= t.max, fx = t.fx(Math.max(1, k)), tot = t.max > 1 && k ? Object.entries(fx).map(([s, v]) => tsTxt(s, v)).filter(Boolean).join(' · ') : '', nx = talNext(t);
  const costs = t.max > 1 ? Array.from({ length: t.max }, (_, j) => `<i class="${j < k ? 'on' : ''}">${talCostAt(t, j + 1)}</i>`).join('') : '';
  tip.innerHTML = `<h4>${t.i} ${esc(t.n)}</h4><div class="ttc">${full ? (t.max > 1 ? `Rango ${k} / ${t.max} · completo` : 'Aprendido') : `${t.max > 1 ? `Rango ${k} / ${t.max} · ` : ''}Coste: <b>${nx} punto${nx === 1 ? '' : 's'}</b>`}${t.kind === 'key' ? ' · Talento final' : t.kind === 'mas' ? ' · Maestría' : t.kind === 'root' ? ' · Inicio de la rama' : ''} · Zona ${t.tier}</div>${t.g != null && TALG[t.br][t.g].c !== t.id ? `<div class="ttk">Constelación «${esc(TAL[TALG[t.br][t.g].c].n)}»: ${TALG[t.br][t.g].ids.filter(talHas).length}/${TALG[t.br][t.g].ids.length} · complétala para seguir</div>` : t.g != null ? `<div class="ttk">Constelación: ${TALG[t.br][t.g].ids.filter(talHas).length}/${TALG[t.br][t.g].ids.length} nodos · complétala para seguir</div>` : ''}
    ${costs ? `<div class="ttk">Coste por rango: ${costs}</div>` : ''}<p class="ttg">${esc(t.d)}${t.max > 1 ? ' (por rango)' : ''}</p>${t.rw ? `<p class="ttw ${full ? 'on' : ''}">${full ? '✔ ' : `🎁 ${t.max > 1 ? 'Al completarlo' : 'Al aprenderlo'}: `}${esc(rwTxt(t.rw))}</p>` : ''}${tot ? `<p class="ttt">Ahora: ${esc(tot)}</p>` : ''}${why && !full ? `<p class="ttr">${esc(why)}</p>` : !full ? `<p class="tta">${TLW.sel === t.id ? 'Pulsa otra vez o Enter para aprender' : 'Clic para seleccionar · otro clic para aprender'}</p>` : ''}`;
  tip.hidden = false; TLW.tipId = t.id; TLW.tipW = tip.offsetWidth; TLW.tipH = tip.offsetHeight; tlwTipPos();
}
function tlwTipPos() { const tip = $('tlTip'), t = TLW.tipId && TAL[TLW.tipId]; if (!t || tip.hidden) return; const p = tlwW2S(t.x, t.y), R = TL_R[t.kind] * TLW.cam.z, w = TLW.tipW, h = TLW.tipH;
  let x = p.x + R + 16; if (x + w > TLW.W - 8) x = p.x - R - 16 - w; x = Math.max(8, Math.min(TLW.W - w - 8, x)); const y = Math.max(64, Math.min(TLW.H - h - 8, p.y - h / 2));
  tip.style.transform = `translate(${x | 0}px,${y | 0}px)`; }
// ---------- Ratón y pantalla táctil ----------
{ const cv = $('tlCv'); cv.style.touchAction = 'none';
  const loc = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const miniAt = p => { const m = TLW.mini; return m && p.x > m.mx && p.x < m.mx + m.mw && p.y > m.my && p.y < m.my + m.mh; };
  const miniGo = p => { const m = TLW.mini, b = TALB[TLW.br]; TLW.tgt.x = b.x0 + (p.x - m.mx) / m.ms; TLW.tgt.y = b.y0 + (p.y - m.my) / m.ms; TLW.vel = { x: 0, y: 0 }; };
  cv.addEventListener('pointerdown', e => { if (e.button !== 0) return; const p = loc(e); cv.setPointerCapture(e.pointerId);
    if (miniAt(p)) { miniGo(p); TLW.drag = { mini: 1 }; return; }
    const n = tlwPick(p.x, p.y); TLW.drag = { x: p.x, y: p.y, cx: TLW.cam.x, cy: TLW.cam.y, moved: false, id: n && n.id, lt: performance.now(), lx: p.x, ly: p.y, vx: 0, vy: 0 }; TLW.vel = { x: 0, y: 0 }; });
  cv.addEventListener('pointermove', e => { const p = loc(e), d = TLW.drag;
    if (d && d.mini) { miniGo(p); return; }
    if (d) { const dx = p.x - d.x, dy = p.y - d.y; if (!d.moved && Math.hypot(dx, dy) < 5) return; if (!d.moved) { d.moved = true; $('tlC').classList.add('pan'); tlwTip(); }
      const z = TLW.cam.z, now = performance.now(), dtm = Math.max(1, now - d.lt); d.vx = d.vx * 0.6 + (-(p.x - d.lx) / z / dtm * 1000) * 0.4; d.vy = d.vy * 0.6 + (-(p.y - d.ly) / z / dtm * 1000) * 0.4; d.lt = now; d.lx = p.x; d.ly = p.y;
      TLW.cam.x = TLW.tgt.x = d.cx - dx / z; TLW.cam.y = TLW.tgt.y = d.cy - dy / z; return; }
    const n = miniAt(p) ? null : tlwPick(p.x, p.y), id = n ? n.id : null; cv.style.cursor = n ? 'pointer' : ''; if (id !== TLW.hov) { TLW.hov = id; tlwTip(); if (id) tone(900, 0.03, 'sine', 0.01, 1); } });
  const up = () => { const d = TLW.drag; TLW.drag = null; if (!d || d.mini || !tlwOn()) return; $('tlC').classList.remove('pan');
    if (d.moved) { if (performance.now() - d.lt < 80) TLW.vel = { x: d.vx, y: d.vy }; tlwTip(); return; }
    if (!d.id) return; if (TLW.sel === d.id) talBuy(d.id); else { TLW.sel = d.id; tone(700, 0.05, 'triangle', 0.02, 1); tlwTip(); } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', () => { if (!TLW.drag && TLW.hov) { TLW.hov = null; tlwTip(); } });
  cv.addEventListener('wheel', e => { e.preventDefault(); const p = loc(e), g = TLW.tgt, wp = { x: g.x + (p.x - TLW.W / 2) / g.z, y: g.y + (p.y - TLW.H / 2) / g.z }, f = Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0015)), z = Math.max(tlwZMin(), Math.min(TLW_ZMAX, g.z * f));
    g.x = wp.x - (p.x - TLW.W / 2) / z; g.y = wp.y - (p.y - TLW.H / 2) / z; g.z = z; }, { passive: false });
  cv.addEventListener('dblclick', e => { const p = loc(e); if (!tlwPick(p.x, p.y) && !miniAt(p)) { if (TLW.tgt.z > tlwFitZ() * 1.2) tlwFitAll(); else tlwHome(); } });
  new ResizeObserver(() => { if (tlwOn()) tlwSize(); }).observe($('tlC')); }
// Botones: ramas, pestañas de arriba, ver todo y reiniciar
document.addEventListener('click', e => { if (!tlwOn()) return; const b = e.target.closest('[data-tlbr],[data-tlnav],[data-tlreset],[data-tlfit]'); if (!b) return;
  if (b.dataset.tlbr) tlwBranch(b.dataset.tlbr);
  else if (b.dataset.tlnav) tlwNav(b.dataset.tlnav);
  else if (b.dataset.tlfit !== undefined) { if (TLW.tgt.z > tlwFitZ() * 1.2) tlwFitAll(); else tlwHome(); }
  else if (TLW.sure && performance.now() - TLW.sure < 4000) { TLW.sure = 0; talReset(); } else { TLW.sure = performance.now(); tlwDom(); setTimeout(() => { if (TLW.sure) { TLW.sure = 0; tlwDom(); } }, 4000); } });
function tlwBranch(br) { if (!TAL_TREE[br]) return; TLW.fade = 1; TLW.br = br; TLW.sel = TLW.hov = null; TLW.fx.length = 0; tlwHome(true); tone(420, 0.08, 'triangle', 0.03, 1.4); tlwDom(); }
const TLW_NAV = ['char', 'inv', 'tree', 'skills', 'adv', 'quest', 'map'];
function tlwNav(k) {
  if (k === 'prev' || k === 'next') { const i = TLW_NAV.indexOf(TLW.view); k = TLW_NAV[(i + (k === 'next' ? 1 : TLW_NAV.length - 1)) % TLW_NAV.length]; }
  if (k === 'tree' || k === 'skills') { TLW.view = k; tlwDom(); return; }
  closeModal(); if (k === 'char') openChar(); else if (k === 'inv') openInventory(null); else if (k === 'map') openMap(); else if (k === 'adv') advOpen('ach'); else if (k === 'quest') advOpen('quest');
}
// Teclado: flechas para ir de nodo en nodo (la cámara te sigue), Enter para aprender, Q/E para cambiar de rama, +/- zoom
addEventListener('keydown', e => {
  if (!S || ui.open === 'title' || e.ctrlKey || e.metaKey || _typing(e)) return; const k = e.key.toLowerCase();
  if (k === 'k') { if (tlwOn()) closeModal(); else if (!ui.open) tlwOpen(); return; }
  if (!tlwOn()) return;
  const order = Object.keys(TAL_TREE), i = order.indexOf(TLW.br);
  if (k === 'q' || k === 'e') { tlwBranch(order[(i + (k === 'e' ? 1 : order.length - 1)) % order.length]); e.preventDefault(); return; }
  if (k === 'tab') { tlwNav(e.shiftKey ? 'prev' : 'next'); e.preventDefault(); return; }
  if (TLW.view !== 'tree') return;
  if (k === 'enter' || k === ' ') { if (TLW.sel) talBuy(TLW.sel); e.preventDefault(); return; }
  if (k === '+' || k === '=' || k === '-') { TLW.tgt.z = Math.max(tlwZMin(), Math.min(TLW_ZMAX, TLW.tgt.z * (k === '-' ? 0.8 : 1.25))); return; }
  const dir = { arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }[k]; if (!dir) return; e.preventDefault();
  const cur = TAL[TLW.sel]; if (!cur || cur.br !== TLW.br) { TLW.sel = TALN[TLW.br][0].id; } else {
    let best = null, bs = 1e9; for (const t of TALN[TLW.br]) { if (t === cur) continue; const dx = t.x - cur.x, dy = t.y - cur.y, L = Math.hypot(dx, dy), cos = (dx * dir[0] + dy * dir[1]) / L; if (cos < 0.5) continue; const sc = L * (2 - cos) + (cur.nb.includes(t.id) ? -60 : 0); if (sc < bs) { bs = sc; best = t; } }
    if (best) TLW.sel = best.id; }
  const t = TAL[TLW.sel], p = tlwW2S(t.x, t.y); if (p.x < 120 || p.x > TLW.W - 120 || p.y < 120 || p.y > TLW.H - 120) { TLW.tgt.x = t.x; TLW.tgt.y = t.y; }
  tone(760, 0.03, 'sine', 0.015, 1); tlwTip();
});
KEY_ACTIONS.find(g => g[0] === 'Ventanas')[1].push(['k', 'Árbol de talentos']); keymapBuild();
// En la ventana de Aventura queda una pestaña que abre el árbol
ADV.tabs.tal = { n: '🌳 Talentos', render() { if (!S.pc) return '<p class="mut">Los talentos se ganan subiendo de nivel en un mundo con supervivencia.</p>'; return `<div class="tlopen"><b>${talPts()}</b> punto${talPts() === 1 ? '' : 's'} para gastar · ${talSpent()} gastados<br><button data-tlopen>🌳 Abrir el árbol de talentos <kbd>K</kbd></button></div>`; } };
document.addEventListener('click', e => { const b = e.target.closest('[data-tlopen],[data-advtab="tal"]'); if (b && S) { ADV.tab = 'ach'; closeModal(); tlwOpen(); } });
cmd('talentos', { a: ['talento', 'arbol'], u: '/talentos', d: 'Abre el árbol de talentos.', run() { tlwOpen(); } });
