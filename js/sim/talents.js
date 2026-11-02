'use strict';
// =====================================================================================
//  Árbol de talentos.
//  · 1 punto por cada nivel de personaje (el nivel es la suma de tus 10 habilidades: hasta 100 puntos).
//  · 5 ramas (Guerrero, Explorador, Arcano, Artesano y Superviviente), cada una con 3 filas de
//    talentos con rangos y un talento final. Para abrir una fila hay que haber gastado puntos en
//    esa rama: 5 para la segunda, 10 para la tercera y 20 para el final.
//  · Hay 125 rangos y como mucho 100 puntos: no se puede tenerlo todo, hay que elegir.
//  · Reiniciar: la primera vez es gratis; después cuesta monedas.
//  · Los talentos van con el personaje y, como los niveles, con la mochila de cada tipo de mundo
//    (con o sin trucos). Ventana de Aventura (Y) › Talentos.
// =====================================================================================
// [id, nombre, icono, rangos, efecto por rango (k = rango), texto por rango]
const TAL_TREE = {
  war: { n: 'Guerrero', i: '⚔', c: '#ff7a5a', d: 'Golpes, aguante y armadura pesada.', rows: [
    [['tBrute', 'Fuerza bruta', '💪', 5, k => ({ melee: 1 + 0.03 * k }), '+3 % de daño cuerpo a cuerpo'], ['tHide', 'Piel dura', '🛡', 5, k => ({ def: k }), '+1 de defensa']],
    [['tVigor', 'Vigor', '❤', 5, k => ({ hp: 6 * k }), '+6 de vida máxima'], ['tShield', 'Escudero', '🔰', 3, k => ({ block: 0.02 * k }), '+2 % de bloquear un golpe']],
    [['tPain', 'Sin dolor', '😤', 3, k => ({ pain: 1 - 0.06 * k }), 'El dolor te afecta un 6 % menos'], ['tHeavy', 'Coloso de hierro', '⛓', 1, () => ({ heavyOk: 1 }), 'La armadura pesada ya no te frena']],
    [['tWarlord', 'Señor de la batalla', '👑', 1, () => ({ melee: 1.12, def: 5, hp: 20 }), 'Talento final: +12 % de daño, +5 de defensa y +20 de vida']] ] },
  hunt: { n: 'Explorador', i: '🏹', c: '#7fd07a', d: 'Distancia, velocidad y caza.', rows: [
    [['tHawk', 'Ojo de halcón', '🎯', 5, k => ({ ranged: 1 + 0.03 * k }), '+3 % de daño a distancia'], ['tFeet', 'Pies ligeros', '👟', 5, k => ({ speed: 1 + 0.02 * k }), '+2 % de velocidad']],
    [['tDash', 'Impulso', '💨', 3, k => ({ dash: 1 - 0.06 * k }), 'El impulso se recarga un 6 % antes'], ['tRun', 'Carrera de fondo', '🏃', 3, k => ({ sprintCost: 1 - 0.07 * k }), 'Correr cansa un 7 % menos']],
    [['tTrack', 'Rastreador', '🐾', 3, k => ({ hunt: 1 + 0.06 * k, tame: 1 + 0.04 * k }), '+6 % de caza y +4 % de domar'], ['tStealth', 'Sigilo', '🌫', 3, k => ({ detect: 1 - 0.06 * k }), 'Los enemigos te ven un 6 % menos']],
    [['tNorth', 'Viento del norte', '🌪', 1, () => ({ ranged: 1.15, speed: 1.06, reach: 1.1 }), 'Talento final: +15 % a distancia, +6 % de velocidad y más alcance']] ] },
  arc: { n: 'Arcano', i: '✦', c: '#b48cff', d: 'Maná, magia y conocimiento.', rows: [
    [['tWell', 'Pozo de maná', '💧', 5, k => ({ mana: 10 * k }), '+10 de maná máximo'], ['tFlow', 'Flujo arcano', '🌀', 5, k => ({ manaRegen: 1 + 0.06 * k }), '+6 % de recarga de maná']],
    [['tScholar', 'Erudito', '📚', 3, k => ({ xp: 1 + 0.04 * k }), '+4 % de experiencia'], ['tSight', 'Visión mística', '👁', 3, k => ({ night: 0.08 * k }), 'Ves mejor de noche']],
    [['tFlame', 'Llama interior', '🔥', 3, k => ({ warm: 3 * k }), '+3 de abrigo (te protege del frío)'], ['tWard', 'Piel rúnica', '🔮', 3, k => ({ gdef: k, def: k }), '+1 de defensa mágica']],
    [['tArch', 'Archimago', '🌌', 1, () => ({ mana: 60, manaRegen: 1.25, xp: 1.05 }), 'Talento final: +60 de maná, +25 % de recarga y +5 % de experiencia']] ] },
  craft: { n: 'Artesano', i: '⚙', c: '#ffd34a', d: 'Picar, talar, fabricar y comerciar.', rows: [
    [['tMiner', 'Minero', '⛏', 5, k => ({ mine: 1 + 0.06 * k }), 'Picas un 6 % más rápido'], ['tLogger', 'Leñador', '🪓', 5, k => ({ wood: 1 + 0.06 * k }), 'Talas un 6 % más rápido']],
    [['tHands', 'Manos hábiles', '🔧', 5, k => ({ work: 1 + 0.04 * k }), 'Trabajas un 4 % más rápido'], ['tThrift', 'Ahorro', '♻', 3, k => ({ craftKeep: 0.03 * k }), '+3 % de recuperar el núcleo al fabricar']],
    [['tLearn', 'Aprendiz aplicado', '📐', 3, k => ({ xpCraft: 1 + 0.08 * k }), '+8 % de experiencia al fabricar y construir'], ['tHaggle', 'Regateo', '🪙', 3, k => ({ price: 1 - 0.04 * k }), 'Los comerciantes te cobran un 4 % menos']],
    [['tMaster', 'Maestro del Taller', '🏭', 1, () => ({ work: 1.15, mine: 1.15, wood: 1.15, craftKeep: 0.1 }), 'Talento final: trabajas, picas y talas un 15 % más rápido y +10 % de ahorro']] ] },
  surv: { n: 'Superviviente', i: '🔥', c: '#5ad8ff', d: 'Hambre, heridas, curación y mascotas.', rows: [
    [['tStomach', 'Estómago de hierro', '🍖', 5, k => ({ hunger: 1 - 0.06 * k }), 'El hambre llega un 6 % más despacio'], ['tCamel', 'Sediento no', '💦', 5, k => ({ thirst: 1 - 0.06 * k }), 'La sed llega un 6 % más despacio']],
    [['tHealer', 'Sanador', '✚', 5, k => ({ heal: 1 + 0.06 * k }), 'Te curas un 6 % más rápido'], ['tClot', 'Coagulación', '🩸', 3, k => ({ bleed: 1 - 0.1 * k }), 'Sangras un 10 % menos']],
    [['tImmune', 'Inmune', '🦠', 3, k => ({ sick: 1 - 0.1 * k }), 'Enfermas un 10 % menos'], ['tBeast', 'Amigo de las bestias', '🐺', 3, k => ({ tame: 1 + 0.08 * k, petHp: 1 + 0.08 * k }), '+8 % de domar y de vida de tus mascotas']],
    [['tIndom', 'Indomable', '🗿', 1, () => ({ hp: 30, heal: 1.2, wound: 0.85, luck: 0.03 }), 'Talento final: +30 de vida, +20 % de curación, heridas más leves y +3 % de suerte']] ] },
};
const TAL_ROW_NEED = [0, 5, 10, 20];
const TAL = {}; for (const br in TAL_TREE) TAL_TREE[br].rows.forEach((row, r) => row.forEach(([id, n, i, max, fx, d]) => TAL[id] = { id, n, i, max, fx, d, br, r }));
if (typeof CH_KEYS !== 'undefined' && !CH_KEYS.includes('talents')) CH_KEYS.push('talents'); // van con el personaje (y con la mochila de cada tipo de mundo)
if (typeof PERSONAL !== 'undefined') PERSONAL.add('talents');
const talData = () => S.talents || (S.talents = {});
const talSpent = br => { const T0 = talData(); let s = 0; for (const id in T0) if (TAL[id] && (!br || TAL[id].br === br)) s += T0[id]; return s; };
const talPts = () => Math.max(0, (S && S.pc ? charLevel() - 1 : 0) - talSpent());
const talOpen = t => talSpent(t.br) >= TAL_ROW_NEED[t.r];
// Para charMods (sim/character.js): pares [mod, valor]
function talMods() { const r = []; if (!S || !S.talents) return r; for (const id in S.talents) { const t = TAL[id], k = S.talents[id] | 0; if (!t || !k) continue; const m = t.fx(Math.min(k, t.max)); for (const key in m) r.push([key, m[key]]); } return r; }
const talDirty = () => { _cm = null; _cmKey = ''; vitalsDirty = true; }; // que el personaje vuelva a calcular sus estadísticas
function talBuy(id) {
  const t = TAL[id], T0 = talData(), k = T0[id] | 0; if (!t) return;
  if (k >= t.max) { toastErr('Ya tiene todos sus rangos'); return; } if (!talOpen(t)) { toastErr(`Gasta antes ${TAL_ROW_NEED[t.r]} puntos en ${TAL_TREE[t.br].n}`); return; } if (talPts() < 1) { toastErr('No te quedan puntos: sube de nivel tus habilidades'); return; }
  T0[id] = k + 1; talDirty(); tone(520 + k * 80, 0.12, 'triangle', 0.05, 1.3); if (t.r === 3) { tone(880, 0.3, 'triangle', 0.05, 1.2, 0.12); wvBanner(`${t.i} ${t.n}`, 'Talento final desbloqueado', TAL_TREE[t.br].c, 3); sparkRing(S.player.x, S.player.y, 40, TAL_TREE[t.br].c, 140, { up: 50, life: 1 }); }
  advRender();
}
const talResetCost = () => (S.talReset ? 25 * talSpent() : 0);
function talReset() { const cost = talResetCost(), n = talSpent(); if (!n) return; if (invCount('coin') < cost) { toastErr(`Reiniciar cuesta ${cost} monedas`); return; } if (cost) invTake('coin', cost); S.talents = {}; S.talReset = (S.talReset || 0) + 1; talDirty(); toast(`🌳 Talentos reiniciados: recuperas ${n} puntos${cost ? ` (−${cost} monedas)` : ' (la primera vez es gratis)'}`); advRender(); }
// Aviso al subir de nivel
{ const g0 = gainXP; gainXP = (k, n) => { const before = S && S.pc ? charLevel() : 0; const r = g0(k, n); if (S && S.pc && charLevel() > before) setTimeout(() => toast(`🌳 ¡Punto de talento! Tienes ${talPts()} para gastar (Y › Talentos)`, true), 900); return r; }; }
// ---------- Pestaña ----------
const TLV = { sure: 0 };
ADV.tabs.tal = { n: '🌳 Talentos', render() {
  if (!S.pc) return '<p class="mut">Los talentos se ganan subiendo de nivel en un mundo con supervivencia.</p>';
  const T0 = talData(), pts = talPts(), cost = talResetCost();
  const col = br => { const B = TAL_TREE[br], sp = talSpent(br);
    return `<div class="tlcol" style="--tc:${B.c}"><div class="tlh"><b>${B.i} ${B.n}</b><small>${B.d}</small><span>${sp} puntos</span></div>
      ${B.rows.map((row, r) => { const open = sp >= TAL_ROW_NEED[r]; return `${r ? `<div class="tlgate ${open ? 'on' : ''}">${open ? '▼' : `🔒 ${TAL_ROW_NEED[r]} puntos en ${B.n}`}</div>` : ''}<div class="tlrow ${r === 3 ? 'cap' : ''}">${row.map(([id]) => { const t = TAL[id], k = T0[id] | 0, full = k >= t.max, can = open && !full && pts > 0;
        return `<button class="tln ${k ? 'got' : ''} ${full ? 'full' : ''} ${can ? 'can' : ''} ${open ? '' : 'lock'}" data-tal="${id}" title="${esc(t.n)}: ${esc(t.d)}${t.max > 1 ? ' (por rango)' : ''}${k ? ' · ahora: ' + k + '/' + t.max : ''}">
          <span class="tli">${t.i}</span><span class="tlnm">${esc(t.n)}</span><span class="tlpip">${Array.from({ length: t.max }, (_, j) => `<i class="${j < k ? 'on' : ''}"></i>`).join('')}</span><span class="tld">${esc(t.d)}</span></button>`; }).join('')}</div>`; }).join('')}</div>`; };
  return `<div class="tltop"><div class="tlpts ${pts ? 'have' : ''}"><b>${pts}</b><span>punto${pts === 1 ? '' : 's'} para gastar</span></div><div class="mut small">Nivel de personaje ${charLevel()} · 1 punto por nivel (súbelo con tus habilidades: picar, luchar, fabricar…). Gastados: ${talSpent()}. Hay 125 rangos y 100 puntos como mucho: elige bien.</div>
    <button data-talreset ${talSpent() ? '' : 'disabled'}>${TLV.sure ? '¿Seguro? Pulsa otra vez' : `↺ Reiniciar${cost ? ` (${cost} 🪙)` : ' (gratis la 1.ª vez)'}`}</button></div>
    <div class="tlgrid">${Object.keys(TAL_TREE).map(col).join('')}</div>`;
} };
document.addEventListener('click', e => { const b = e.target.closest('[data-tal],[data-talreset]'); if (!b || !S) return;
  if (b.dataset.tal) { talBuy(b.dataset.tal); return; }
  if (TLV.sure && performance.now() - TLV.sure < 4000) { TLV.sure = 0; talReset(); } else { TLV.sure = performance.now(); advRender(); setTimeout(() => { if (TLV.sure) { TLV.sure = 0; advRender(); } }, 4000); } });
cmd('talentos', { a: ['talento', 'arbol'], u: '/talentos', d: 'Abre el árbol de talentos.', run() { advOpen('tal'); } });
