'use strict';
// =====================================================================================
//  Discord.
//   · Dentro de claude.ai: escribes tu usuario y se muestra a los demás (sin verificar: nadie
//     comprueba que sea tuyo).
//   · En un sitio propio (https, fuera de claude.ai): inicio de sesión real con OAuth2
//     («implicit grant», solo el Client ID, que es público). En la aplicación de Discord hay que
//     registrar como Redirect URI la dirección exacta de la página del juego.
//   · Con el servidor propio y DISCORD_CLIENT_SECRET configurado (Railway): el servidor hace el
//     inicio de sesión y nos da una sesión («#tcs=…») que se guarda en este navegador.
//  Nunca va aquí el Client Secret: esta página la puede leer cualquiera.
// =====================================================================================
const DISCORD_CLIENT_ID = '1562327426837516288';
const DC_KEY = 'tc-discord';
const DC = { data: null, err: '' };
try { DC.data = JSON.parse(localStorage.getItem(DC_KEY)) || null; } catch (e) { }
const dcSave = () => { try { if (DC.data) localStorage.setItem(DC_KEY, JSON.stringify(DC.data)); else localStorage.removeItem(DC_KEY); } catch (e) { } };
// ¿Estamos en un sitio propio? (página principal, https o localhost, y no en claude.ai)
const dcHosted = () => { try { return window.top === window && (location.protocol === 'https:' || location.hostname === 'localhost') && !/claude|anthropic/i.test(location.hostname); } catch (e) { return false; } };
// El token se guarda solo en este navegador y solo para que el servidor propio compruebe quién eres
const dcTokSet = (t, sec) => { try { if (t) localStorage.setItem('tc-dc-tok', JSON.stringify({ t, exp: Date.now() + sec * 1000 })); else localStorage.removeItem('tc-dc-tok'); } catch (e) { } };
const dcToken = () => { try { const o = JSON.parse(localStorage.getItem('tc-dc-tok')); return o && o.exp > Date.now() + 60000 ? o.t : null; } catch (e) { return null; } };
const SESS_KEY = 'tc-sess';
const dcSess = () => { try { return localStorage.getItem(SESS_KEY) || null; } catch (e) { return null; } };
const dcSessSet = t => { try { if (t) localStorage.setItem(SESS_KEY, t); else localStorage.removeItem(SESS_KEY); } catch (e) { } };
// ¿El servidor al que estamos conectados hace él el inicio de sesión?
const dcServerAuth = () => typeof NET !== 'undefined' && NET.kind === 'ws' && NET.room && NET.room.me && NET.room.me.oauth;
let dcLogout = () => { try { if (NET.kind === 'ws' && NET.room && NET.room.logout) NET.room.logout(); } catch (e) { } DC.data = null; DC.err = ''; dcSave(); dcTokSet(null); dcSessSet(null); if (typeof netReconnect === 'function') setTimeout(netReconnect, 150); };
// Vuelta del inicio de sesión del servidor: #tcs=<sesión> o #tcerr=<motivo>
{ const h = new URLSearchParams(location.hash.slice(1)); if (h.get('tcs') || h.get('tcerr')) { if (h.get('tcs')) { dcSessSet(h.get('tcs')); DC.ok = 1; } else DC.err = h.get('tcerr'); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { } } }
const dcRedirect = () => location.origin + location.pathname;
const dcTag = () => DC.data ? DC.data.name || DC.data.user : '';
function dcLogin() {
  if (dcServerAuth()) { location.href = '/auth/discord'; return; }
  const st = Math.random().toString(36).slice(2) + Date.now().toString(36);
  try { sessionStorage.setItem('tc-dc-state', st); } catch (e) { }
  location.href = 'https://discord.com/oauth2/authorize?' + new URLSearchParams({ client_id: DISCORD_CLIENT_ID, response_type: 'token', redirect_uri: dcRedirect(), scope: 'identify', state: st });
}
// Al volver de Discord: el token llega en el «#» de la dirección; se usa una vez y no se guarda
(async () => {
  if (!dcHosted() || !location.hash.includes('access_token')) return;
  const h = new URLSearchParams(location.hash.slice(1)), tok = h.get('access_token'), st = h.get('state');
  history.replaceState(null, '', location.pathname + location.search);
  let ok = false; try { ok = st && st === sessionStorage.getItem('tc-dc-state'); sessionStorage.removeItem('tc-dc-state'); } catch (e) { }
  if (!ok || !tok) { DC.err = 'El inicio de sesión no se pudo comprobar. Vuelve a intentarlo.'; return; }
  try {
    const r = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + tok } });
    if (!r.ok) throw new Error('Discord respondió ' + r.status);
    const u = await r.json();
    DC.data = { id: u.id, user: u.username, name: u.global_name || u.username, avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64` : '', verified: true };
    dcSave(); dcTokSet(tok, +h.get('expires_in') || 604800); if (typeof okMsg === 'function') okMsg('Conectado con Discord como ' + DC.data.name + '.'); if (typeof netReconnect === 'function') netReconnect();
  } catch (e) { DC.err = 'No se pudo leer tu perfil de Discord: ' + e.message; }
})();
function dcPanelHTML() {
  const d = DC.data, hosted = dcHosted() || dcServerAuth();
  let h = `<section class="ndisc"><h3>Discord</h3>`;
  const me = typeof NET !== 'undefined' ? NET.me : {};
  if (typeof NET !== 'undefined' && NET.kind === 'ws' && me.verified) h += `<div class="dcme">${me.avatar ? `<img alt="" src="${esc(me.avatar)}">` : ''}<span><b>${esc(me.name)}</b> <span class="good">✓ sesión iniciada</span><br><span class="mut small">${NET.room && NET.room.me && NET.room.me.cloud ? 'Tus mundos pueden guardarse en la nube' : 'Verificado por el servidor'}</span></span><button data-dc="out">Cerrar sesión</button></div>`;
  else if (d && d.verified) h += `<div class="dcme">${d.avatar ? `<img alt="" src="${esc(d.avatar)}">` : ''}<span><b>${esc(d.name)}</b> <span class="good">✓ verificado</span><br><span class="mut small">@${esc(d.user)}</span></span><button data-dc="out">Desvincular</button></div>`;
  else {
    h += `<label class="dcin">Tu usuario de Discord <span class="row gap"><input id="dcName" maxlength="32" placeholder="p. ej. ana_lopez" value="${esc(d ? d.user : '')}">${d ? '<button data-dc="out">Quitar</button>' : ''}</span></label>`;
    h += `<p class="mut small">${d ? `Los demás ven «Discord: ${esc(d.user)}» junto a tu nombre. ` : ''}Sin verificar: nadie comprueba que la cuenta sea tuya.</p>`;
    if (hosted) h += `<div class="row gap"><button class="pri dcbtn" data-dc="login">Iniciar sesión con Discord</button></div>`;
    else if (window.top !== window) h += `<p class="mut small">Dentro de claude.ai no se puede iniciar sesión con Discord: tu identidad verificada es la de tu cuenta de Claude. Abre el juego con <b>jugar.bat</b> (o en tu propia web) para entrar con Discord.</p>`;
    else h += `<p class="mut small">Discord solo permite iniciar sesión desde <b>localhost</b> o desde una web con <b>https</b>. Desde la dirección de red de otro ordenador (http://192.168…) entra como invitado, o abre el juego en tu propio ordenador con jugar.bat.</p>`;
  }
  if (DC.err) h += `<p class="bad small">${esc(DC.err)}</p>`;
  return h + '</section>';
}
function dcSetName(v) {
  v = String(v || '').trim().replace(/^@/, '').toLowerCase();
  if (!v) { DC.data = null; dcSave(); return 'Usuario de Discord quitado.'; }
  if (!/^[a-z0-9_.]{2,32}$/.test(v)) { DC.err = 'Un usuario de Discord tiene de 2 a 32 letras, números, «_» o «.».'; return null; }
  DC.err = ''; DC.data = { user: v, name: v, verified: false }; dcSave(); return 'Discord: ' + v + ' (sin verificar).';
}
document.addEventListener('click', e => { const b = e.target.closest('[data-dc]'); if (!b) return; if (b.dataset.dc === 'login') dcLogin(); if (b.dataset.dc === 'out') { dcLogout(); if (typeof netRefreshUI === 'function') netRefreshUI(); } });
document.addEventListener('change', e => { if (e.target.id !== 'dcName') return; const r = dcSetName(e.target.value); if (r && typeof okMsg === 'function') okMsg(r); if (typeof netRefreshUI === 'function') netRefreshUI(); });
cmd('discord', { u: '/discord <usuario>|quitar', d: 'Muestra tu usuario de Discord a los demás jugadores.', run(a) { const v = normTxt(a[0] || ''); if (!v) return dcTag() ? 'Discord: ' + dcTag() + (DC.data.verified ? ' ✓' : ' (sin verificar)') : 'No has puesto tu Discord. /discord tu_usuario'; const r = dcSetName(v === 'quitar' ? '' : a.join(' ')); return r || errMsg(DC.err); } });
