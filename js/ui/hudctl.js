'use strict';
// =====================================================================================
//  HUD a tu gusto: cada panel del juego se puede ocultar, todo el HUD se puede encoger y hay
//  un «modo limpio» (F2) que deja solo lo imprescindible (vida, barra de objetos y la oleada).
//  Se cambia en Ajustes › Interfaz o, jugando, con el botón ◧ del borde derecho: un desplegable
//  con los mismos interruptores, que se aplican al momento.
// =====================================================================================
Object.assign(OPT_DEF, { hudClean: false, hudScale: 1, hudGoal: true, hudClock: true, hudKeys: true, wandCompact: false });
for (const k in OPT_DEF) if (!(k in OPT)) OPT[k] = OPT_DEF[k];
const HUD_ROWS = [
  ['hudClean', 'Modo limpio (F2)', 'check', 0, 0, 0, 0, 'Oculta todo lo opcional: solo quedan la vida, la barra de objetos y la oleada.'],
  ['hudScale', 'Tamaño del HUD', 'range', 0.7, 1.2, 0.05, PCT, 'Encoge o agranda los paneles del juego (no los menús).'],
  ['hudGoal', 'Panel de objetivos', 'check', 0, 0, 0, 0, 'La lista de tareas del nivel, arriba a la izquierda.'],
  ['hudClock', 'Reloj, clima y minimapa', 'check', 0, 0, 0, 0, 'El bloque de arriba a la derecha.'],
  ['hudKeys', 'Ayuda de teclas («Ahora puedes»)', 'check', 0, 0, 0, 0, 'Las teclas que puedes usar en cada momento (F1 también la oculta).'],
  ['wandCompact', 'Grimorio compacto', 'check', 0, 0, 0, 0, 'Con varita: solo los huecos de hechizo, sin textos de ayuda.'],
];
ST_CATS.ui[3].splice(1, 0, ...HUD_ROWS); // justo después del tamaño de la interfaz
{ const a0 = optApply; optApply = () => { a0(); const h = document.documentElement, c = !!OPT.hudClean;
  h.style.setProperty('--hudz', OPT.hudScale);
  h.classList.toggle('h-clean', c); h.classList.toggle('h-goal', !OPT.hudGoal || c); h.classList.toggle('h-clock', !OPT.hudClock || c);
  h.classList.toggle('h-keys', !OPT.hudKeys || c); h.classList.toggle('h-wcomp', !!OPT.wandCompact || c); hudBtnSync(); }; }
// ---------- Botón desplegable ----------
const HD = { el: null, open: false };
function hudEl() {
  if (HD.el) return HD.el; const e = document.createElement('div'); e.id = 'hudDrawer';
  e.innerHTML = `<button class="hdbtn" data-hd="t" title="Mostrar u ocultar paneles (F2: modo limpio)">${svgI('M3 4h18v16H3z M14 4v16', 16)}</button><div class="hdpanel" hidden></div>`;
  document.body.appendChild(e); return HD.el = e;
}
function hudRender() {
  const p = hudEl().querySelector('.hdpanel'), row = ([k, n, t, mn, mx, st]) => t === 'check'
    ? `<label class="hdrow"><span>${n}</span><span class="tg"><input type="checkbox" data-opt="${k}" ${OPT[k] ? 'checked' : ''}><i></i></span></label>`
    : `<label class="hdrow col"><span>${n} <b data-optv="${k}">${Math.round(OPT[k] * 100)} %</b></span><input type="range" data-opt="${k}" min="${mn}" max="${mx}" step="${st}" value="${OPT[k]}"></label>`;
  const more = [['minimap', 'Minimapa', 'check'], ['altHud', 'Barra de altura al volar', 'check'], ['hover', 'Tarjeta al pasar el cursor', 'check']];
  p.innerHTML = `<div class="hdh">Paneles del juego</div>${HUD_ROWS.map(row).join('')}${more.map(row).join('')}<button class="hdmore" data-hd="opts">Más en Ajustes › Interfaz</button>`;
  bindRanges(p);
}
function hudBtnSync() { if (!HD.el) return; HD.el.classList.toggle('clean', !!OPT.hudClean); }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-hd]'); if (!b) { if (HD.open && !e.target.closest('#hudDrawer')) { HD.open = false; hudEl().querySelector('.hdpanel').hidden = true; } return; }
  if (b.dataset.hd === 't') { HD.open = !HD.open; const p = hudEl().querySelector('.hdpanel'); if (HD.open) hudRender(); p.hidden = !HD.open; tone(HD.open ? 700 : 560, 0.05, 'sine', 0.04); }
  if (b.dataset.hd === 'opts') { HD.open = false; hudEl().querySelector('.hdpanel').hidden = true; PZ.otab = 'ui'; openPause('opts'); }
});
// Los cambios del desplegable se ven también en su etiqueta de porcentaje
document.addEventListener('input', e => { if (e.target.closest && e.target.closest('#hudDrawer') && e.target.dataset.opt === 'hudScale') { const b = hudEl().querySelector('[data-optv="hudScale"]'); if (b) b.textContent = Math.round(e.target.value * 100) + ' %'; } });
addEventListener('keydown', e => { if (e.key === 'F2' && S && !ui.open && !_typing(e)) { e.preventDefault(); optSet('hudClean', !OPT.hudClean); toast(OPT.hudClean ? 'Modo limpio: F2 para volver' : 'HUD completo'); if (HD.open) hudRender(); } });
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); const e = hudEl(), show = !!S && !ui.open; if (e.hidden === show) e.hidden = !show; }; }
optApply();
