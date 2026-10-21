'use strict';
// =====================================================================================
//  HUD minimalista: iconos de línea en vez de emojis y botones con texto, barra de accesos
//  compacta bajo el minimapa (con su tecla al pasar el ratón), objetivo plegable y anillos
//  de vida sin caja. No quita nada: los mismos botones y datos, con otra presentación.
// =====================================================================================
const HUD_IC = {
  bInv: ['M5 8h14l-1 12H6L5 8z M9 8V6a3 3 0 0 1 6 0v2', 'Inventario', 'E'],
  bBook: ['M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z M5 17a3 3 0 0 1 3-3h11', 'Recetario', 'B'],
  bMap: ['M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2V6z M9 4v14 M15 6v14', 'Mapa', 'M'],
  bLore: ['M7 4h10v16l-5-3-5 3V4z', 'Crónicas', 'J'],
  bHelp: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6 M12 17h.01', 'Ayuda', 'H'],
  bSave: ['M5 4h11l3 3v13H5V4z M8 4v5h7V4 M8 20v-6h8v6', 'Guardar', 'Ctrl+S'],
  bWorlds: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18', 'Mundos', ''],
  bMute: ['M4 9h4l5-4v14l-5-4H4V9z M16 9a4 4 0 0 1 0 6 M18.5 6.5a8 8 0 0 1 0 11', 'Sonido', ''],
};
const MUTE_OFF = 'M4 9h4l5-4v14l-5-4H4V9z M17 9l4 6 M21 9l-4 6';
const svgI = (d, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
function hudIconize(b) {
  const m = HUD_IC[b.id]; if (!m || b.dataset.ic) return;
  b.dataset.ic = 1; b.classList.add('hbtn'); b.setAttribute('aria-label', m[1]); b.dataset.tip = m[1] + (m[2] ? ' · ' + m[2] : '');
  b.innerHTML = svgI(b.id === 'bMute' && S && S.mute ? MUTE_OFF : m[0]);
}
function hudInit() {
  const bar = $('topbar'); if (!bar) return;
  // Orden: lo que más se usa primero
  for (const id of ['bInv', 'bBook', 'bMap', 'bLore', 'bHelp', 'bSave', 'bWorlds', 'bMute']) { const b = $(id); if (b) { bar.appendChild(b); hudIconize(b); } }
  new MutationObserver(() => bar.querySelectorAll('button').forEach(hudIconize)).observe(bar, { childList: true });
  const mb = $('bMute'); if (mb) mb.onclick = () => { if (!S) return; S.mute = !S.mute; mb.innerHTML = svgI(S.mute ? MUTE_OFF : HUD_IC.bMute[0]); mb.dataset.tip = S.mute ? 'Sonido apagado' : 'Sonido'; if (S.mute) bossMusic(false); else if (BOSS) bossMusic(true, BOSS.k); };
  document.body.classList.add('hudmin');
}
hudInit();
// Anillos de supervivencia con iconos de línea
const RING_IC = { hp: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z', food: 'M8 3v8a3 3 0 0 0 6 0V3 M11 3v18 M17 3c-2 2-2 7 0 9v9', water: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z', energy: 'M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z', mana: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z' };
{ const b0 = buildVitals; buildVitals = () => { b0(); for (const k in RING_IC) { const el = $('r-' + k); const sp = el && el.querySelector('span'); if (sp) sp.innerHTML = svgI(RING_IC[k], 13); } }; }
// Objetivo: plegable (clic en el título) y la lista de desbloqueos solo al pasar el ratón
{ const g0 = renderGoal; renderGoal = () => { g0(); const el = $('goal'); el.classList.toggle('fold', !!(S && S.goalFold)); const h = el.querySelector('h3'); if (h) h.title = 'Clic: plegar / desplegar'; const mb = $('bMute'); if (mb && S) mb.innerHTML = svgI(S.mute ? MUTE_OFF : HUD_IC.bMute[0]); }; }
$('goal').addEventListener('click', e => { if (!e.target.closest('h3') || !S) return; S.goalFold = !S.goalFold; $('goal').classList.toggle('fold', S.goalFold); });
