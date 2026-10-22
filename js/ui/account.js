'use strict';
// =====================================================================================
//  Cuentas del juego: crear una cuenta o entrar con usuario y contraseña, sin Discord.
//  Las guarda el servidor (base de datos) y dan lo mismo que Discord: jugar en línea,
//  hasta 5 personajes y los mundos en la nube. Al entrar en otro ordenador se bajan solos
//  los personajes y los mundos de la cuenta; y lo que juegas se va guardando en la nube.
// =====================================================================================
const accAvailable = () => NET.kind === 'ws' && NET.room && NET.room.me && NET.room.me.accounts;
// Dirección http(s) del servidor al que estamos conectados (para crear la cuenta o entrar)
const accBase = () => { const s = NET.server || ''; return s ? s.replace(/^ws/, 'http').replace(/\/ws$/, '') : location.origin; };
let _accTab = 'login', _accErr = '', _accBusy = false;
function accFormHTML() {
  const reg = _accTab === 'reg';
  return `<div class="accf"><div class="acctabs"><button data-acct="login" class="${reg ? '' : 'on'}">Entrar</button><button data-acct="reg" class="${reg ? 'on' : ''}">Crear cuenta</button></div>
    <form id="accForm" autocomplete="on">
      <label>Usuario<input id="accUser" name="username" maxlength="20" autocomplete="username" placeholder="p. ej. marco_22" required></label>
      ${reg ? '<label>Nombre que verán los demás <span class="mut">(opcional)</span><input id="accName" maxlength="20" placeholder="Como quieras que te llamen"></label>' : ''}
      <label>Contraseña<input id="accPass" type="password" maxlength="100" autocomplete="${reg ? 'new-password' : 'current-password'}" placeholder="${reg ? 'Mínimo 6 caracteres' : ''}" required></label>
      ${reg ? '<label>Repite la contraseña<input id="accPass2" type="password" maxlength="100" autocomplete="new-password" required></label>' : ''}
      ${_accErr ? `<p class="bad small">${esc(_accErr)}</p>` : ''}
      <button class="pri" type="submit" ${_accBusy ? 'disabled' : ''}>${_accBusy ? 'Un momento…' : reg ? 'Crear cuenta y entrar' : 'Entrar'}</button>
      <p class="mut small">${reg ? 'Tu contraseña se guarda cifrada: ni el dueño del servidor puede verla. Apúntala: no se puede recuperar.' : 'Entra con tu cuenta del juego y tendrás tus personajes y mundos en cualquier ordenador.'}</p>
    </form></div>`;
}
async function accSubmit() {
  const reg = _accTab === 'reg', user = ($('accUser') || {}).value || '', pass = ($('accPass') || {}).value || '';
  if (reg && pass !== (($('accPass2') || {}).value || '')) { _accErr = 'Las dos contraseñas no coinciden.'; accRefresh(); return; }
  _accBusy = true; _accErr = ''; accRefresh(true);
  try {
    const r = await fetch(accBase() + (reg ? '/auth/register' : '/auth/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user, pass, name: reg ? ($('accName') || {}).value || '' : undefined }) });
    const d = await r.json().catch(() => ({}));
    if (!d.ok) { _accErr = d.err || 'No se pudo.'; return; }
    dcSessSet(d.sess); DC.err = ''; okMsg(reg ? '✓ Cuenta creada. ¡Bienvenido, ' + (d.name || user) + '!' : '✓ Sesión iniciada'); _accRestore = {};
    netReconnect();
  } catch (e) { _accErr = 'No hay conexión con el servidor.'; }
  finally { _accBusy = false; accRefresh(); }
}
function accRefresh(keep) {
  const f = document.querySelector('.accf'); if (!f) return;
  const vals = keep ? { u: ($('accUser') || {}).value, n: ($('accName') || {}).value, p: ($('accPass') || {}).value } : null;
  f.outerHTML = accFormHTML();
  if (vals) { if ($('accUser')) $('accUser').value = vals.u || ''; if ($('accName')) $('accName').value = vals.n || ''; if ($('accPass')) $('accPass').value = vals.p || ''; }
}
document.addEventListener('click', e => { const t = e.target.closest('[data-acct]'); if (!t) return; e.preventDefault(); const u = ($('accUser') || {}).value; _accTab = t.dataset.acct; _accErr = ''; accRefresh(); if (u && $('accUser')) $('accUser').value = u; });
document.addEventListener('submit', e => { if (e.target.id !== 'accForm') return; e.preventDefault(); accSubmit(); });
document.addEventListener('keydown', e => { if (e.target && e.target.closest && e.target.closest('#accForm')) e.stopPropagation(); }, true);
// La tarjeta de cuenta: Discord o cuenta del juego (y, con sesión, de qué tipo es)
{ const a0 = accHTML; accHTML = inPause => {
  let h = a0(inPause);
  if (NET.kind === 'ws' && NET.me.verified && NET.room && NET.room.me && NET.room.me.acct === 'local') h = h.replace('✓ Sesión iniciada con Discord', '✓ Sesión iniciada con tu cuenta del juego');
  if (accAvailable() && !NET.me.verified) h = h.replace(/<div class="dclogo">[\s\S]*?<\/svg><\/div>/, `<div class="acclogo">${svgI('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c0-4 4-6 8-6s8 2 8 6', 30)}</div>`).replace('<b>Inicia sesión con Discord</b>', '<b>Inicia sesión o crea tu cuenta</b>').replace(/(<\/ul>)([\s\S]*?)(<\/div>\s*)$/, (m, ul, rest, end) => `${ul}${accFormHTML()}<div class="accor"><span>o</span></div>${rest}${end}`);
  return h;
}; }
// Textos que antes solo hablaban de Discord
{ const n0 = netJoin; netJoin = async (code, pass) => { if (needLogin()) { toastErr('Inicia sesión (con tu cuenta o con Discord) para jugar en línea'); if (ui.open === 'title') showAcc(); return; } return n0(code, pass); }; }
function showAcc() { if ($('tBody')) $('tBody').innerHTML = `<div class="mpw">${accHTML(false)}</div>`; }
// ---------- Al entrar: personajes y mundos de la cuenta, también en otro ordenador ----------
let _accRestore = {};
async function accSyncWorlds() {
  if (!(NET.kind === 'ws' && NET.me.verified && typeof cloudOn === 'function' && cloudOn())) return;
  const ns = typeof nsOf === 'function' ? nsOf(NET.me.id) : ''; if (!ns || WNS !== ns || _accRestore[ns]) return; _accRestore[ns] = 1;
  let list = []; try { list = await NET.room.saves(); } catch (e) { return; }
  const loc = new Map(worldIndex().map(w => [w.id, w])); let down = 0, up = 0;
  // Lo que solo está en la nube se baja; lo que es más nuevo aquí se sube
  const sl = showList; showList = () => { }; // sin saltar de pantalla mientras se bajan
  try { for (const s of list) { if (!loc.has(s.id)) { await cloudDownload(s.id); down++; } } } finally { showList = sl; }
  for (const w of worldIndex()) { const c = list.find(s => s.id === w.id); if (!c || (w.played || 0) > new Date(c.updated).getTime() + 5000) { if (await cloudUpload(w.id, true)) up++; } }
  if (down || up) toast(`☁ Cuenta al día: ${down ? down + ' mundo' + (down > 1 ? 's' : '') + ' bajado' + (down > 1 ? 's' : '') : ''}${down && up ? ' · ' : ''}${up ? up + ' guardado' + (up > 1 ? 's' : '') + ' en la nube' : ''}`, true);
  if (ui.open === 'title' && typeof showMain === 'function' && document.querySelector('.home')) showMain();
}
setInterval(accSyncWorlds, 2500);
