'use strict';
// =====================================================================================
//  Jugar en línea más fácil:
//   · En «Multijugador» se puede abrir uno de tus mundos en línea sin entrar antes y buscar
//     Esc › Abrir en red: eliges el mundo, nombre, contraseña y plazas, y listo.
//   · Si el servidor está dormido (plan gratis de Render), se avisa de que tarda en despertar.
//   · Textos que hablaban de jugar.bat cuando juegas desde la web o desde la app.
// =====================================================================================
const IS_DESKTOP = !!(window.TC_DESKTOP);
let _olOpen = false, _olSince = Date.now();
function olWorldsHTML() {
  const ws = worldIndex(); if (!ws.length) return `<p class="mut small">Aún no tienes mundos. Crea uno en «Un jugador» y vuelve aquí.</p>`;
  return `<div class="mprow ol"><select id="olWorld">${ws.map(w => `<option value="${esc(w.id)}">${esc(w.name)}</option>`).join('')}</select></div>
    <div class="mprow ol"><input id="olName" maxlength="40" placeholder="Nombre de la partida (opcional)"><input id="olPass" type="password" maxlength="40" placeholder="Contraseña (opcional)" autocomplete="off"></div>
    <div class="mprow ol"><label class="mut small">Plazas <select id="olMax">${[2, 4, 6, 8, 12, 16].map(n => `<option ${n === 8 ? 'selected' : ''}>${n}</option>`).join('')}</select></label><button class="pri" data-ol="go">🌐 Abrir en línea</button></div>`;
}
{ const r0 = mpRender; mpRender = () => {
  r0(); const el = $('mpScreen'); if (!el || !el.querySelector('.mpl') || needLogin() || !activeChar()) return;
  const ok = !!NET.room;
  // Servidor dormido: el plan gratis tarda hasta un minuto en despertar
  if (!ok && IS_DESKTOP && location.protocol === 'app:') { const s = el.querySelector('.mpempty'); if (s && !s.querySelector('[data-olnet]')) { s.querySelector('.mut').textContent = 'Estás jugando sin conexión. Conéctate para ver las partidas.'; s.insertAdjacentHTML('beforeend', '<button class="pri" data-olnet>🌐 Conectarme</button>'); } return; }
  if (!ok) { const s = el.querySelector('.mpempty .mut'); if (s) s.textContent =Date.now() - _olSince < 90000 ? 'Despertando el servidor… la primera vez puede tardar hasta un minuto.' : 'No hay conexión con el servidor. Revisa tu internet o prueba más tarde.'; }
  if (ok) { const s = el.querySelector('.mpempty .mut'); if (s) s.textContent = 'Cuando alguien abra su mundo aparecerá aquí. Para abrir el tuyo, usa «Abrir uno de mis mundos en línea».'; }
  if (ok && !inGame() && !el.querySelector('#olBox')) {
    const d = document.createElement('details'); d.className = 'mpdir'; d.id = 'olBox'; d.open = _olOpen;
    d.innerHTML = `<summary>🌐 Abrir uno de mis mundos en línea</summary>${olWorldsHTML()}`;
    d.addEventListener('toggle', () => { _olOpen = d.open; });
    const sec = el.querySelector('.mpsec'); sec ? sec.before(d) : el.querySelector('.mpw').append(d);
  }
  // Escritorio y web: el campo «Servidor» no hace falta tocarlo
  if (!/^ws:\/\/(localhost|127\.|192\.168\.|10\.)/.test(NET.server || '')) { const sv = [...el.querySelectorAll('.mpdir summary')].find(s => s.textContent === 'Servidor'); if (sv) sv.textContent = 'Servidor (avanzado)'; }
}; }
document.addEventListener('click', e => {
  if (e.target.closest('[data-olnet]')) { if (S && currentWorld) saveGame(true); window.TC_DESKTOP.online(); return; }
  const b = e.target.closest('[data-ol]'); if (!b) return; e.preventDefault();
  const id = ($('olWorld') || {}).value; if (!id) return;
  const opt = { name: ($('olName') || {}).value.trim(), pass: ($('olPass') || {}).value || '', max: +($('olMax') || {}).value || 8 };
  const w = worldIndex().find(x => x.id === id); if (!opt.name) opt.name = w ? w.name : 'Mi mundo';
  clearInterval(_mpTimer); worldAction('play:' + id);
  // Cuando el mundo ya está en pantalla, se abre en línea
  let tries = 0; const t = setInterval(() => {
    if (++tries > 400) { clearInterval(t); toastErr('No se pudo abrir el mundo en línea: inténtalo desde Esc › Abrir en red'); return; }
    if (S && currentWorld === id && ui.open !== 'title') { clearInterval(t); netHost(opt); }
  }, 150);
});
document.addEventListener('keydown', e => { if (e.target && e.target.closest && e.target.closest('#olBox')) e.stopPropagation(); }, true);
// Mensajes de «sin servidor»: en la web o la app no existe jugar.bat
{ const n0 = menuNetChanged; menuNetChanged = () => { if (NET.status && /jugar\.bat/.test(NET.status)) NET.status = IS_DESKTOP ? 'Sin conexión: juegas sin internet (Un jugador funciona igual)' : 'Sin servidor de partidas'; n0(); }; }
