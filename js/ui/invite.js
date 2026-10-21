'use strict';
// =====================================================================================
//  Enlace de invitación: https://<tu-web>/server/<código> abre el juego y entra directo en
//  esa partida. Si hace falta, primero pide iniciar sesión con Discord y elegir personaje
//  (el enlace se recuerda durante el inicio de sesión) y, si la partida tiene contraseña,
//  la pide. Si el anfitrión ya cerró la partida, lo dice.
// =====================================================================================
const JOIN_KEY = 'tc-join';
{ const m = location.pathname.match(/^\/server\/([a-z0-9]{3,24})\/?$/i); if (m) try { localStorage.setItem(JOIN_KEY, JSON.stringify({ c: m[1].toLowerCase(), t: Date.now() })); } catch (e) { } }
const pendingJoin = () => { try { const o = JSON.parse(localStorage.getItem(JOIN_KEY)); return o && Date.now() - o.t < 15 * 60000 ? o.c : null; } catch (e) { return null; } };
const clearJoin = () => { try { localStorage.removeItem(JOIN_KEY); } catch (e) { } };
// Ventana para la contraseña
const mPass = document.createElement('div'); mPass.id = 'mJoinPass'; mPass.hidden = true; document.body.appendChild(mPass);
function askJoinPass(info, bad) {
  return new Promise(ok => {
    mPass.innerHTML = `<div class="jpin"><b>🔒 ${esc(info.name || 'Partida')}</b><small>de ${esc(info.host || 'el anfitrión')} · ${info.n}/${info.max} jugadores</small>
      <label>Contraseña<input id="jpPass" type="password" maxlength="40" autocomplete="off"></label>${bad ? '<p class="bad small">Contraseña incorrecta: prueba otra vez.</p>' : ''}
      <div class="row gap"><button class="ghost" id="jpNo">Cancelar</button><button class="pri" id="jpGo">Entrar</button></div></div>`;
    mPass.hidden = false; const inp = $('jpPass'); setTimeout(() => inp.focus(), 30);
    const done = v => { mPass.hidden = true; ok(v); };
    $('jpGo').onclick = () => done(inp.value); $('jpNo').onclick = () => done(null);
    inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') done(inp.value); if (e.key === 'Escape') done(null); };
  });
}
let _jBusy = false, _jStep = '';
async function tryPendingJoin() {
  const code = pendingJoin(); if (!code || _jBusy || CL) return;
  if (NET.kind !== 'ws' || !NET.room || !NET.room.connected() || inGame()) return;
  // Hace falta sesión: se enseña el multijugador con el aviso (el enlace se recuerda tras volver de Discord)
  if (typeof needLogin === 'function' && needLogin()) { if (_jStep !== 'login') { _jStep = 'login'; if (ui.open !== 'title') openTitle(); if (typeof showMP === 'function') showMP(); toast(`🔗 Para entrar en la partida ${code.toUpperCase()}, inicia sesión con Discord`, true); } return; }
  if (!PF.active || !PF.list.some(c => c.id === PF.active)) { if (_jStep !== 'char') { _jStep = 'char'; if (ui.open !== 'title') openTitle(); if (typeof showChars === 'function') showChars(); toast('🔗 Elige o crea un personaje para entrar en la partida', true); } return; }
  if (S && currentWorld && ui.open !== 'title' && _jStep !== 'ask') { _jStep = 'ask'; }
  _jBusy = true;
  try {
    let info = null; try { info = await (await fetch('/api/game?c=' + encodeURIComponent(code), { cache: 'no-store' })).json(); } catch (e) { }
    if (!info || !info.ok) { clearJoin(); errMsg(`La partida ${code.toUpperCase()} ya no existe: el anfitrión la cerró o todos se fueron.`); return; }
    let pass = '', bad = false;
    for (let i = 0; i < 4; i++) {
      if (info.lock) { pass = await askJoinPass(info, bad); if (pass === null) { clearJoin(); return; } }
      clearJoin(); NET.lastErr = null; await netJoin(code, pass);
      if (NET.lastErr !== 'bad_pass') return;
      bad = true; try { localStorage.setItem(JOIN_KEY, JSON.stringify({ c: code, t: Date.now() })); } catch (e) { }
    }
  } finally { _jBusy = false; _jStep = ''; }
}
setInterval(tryPendingJoin, 1000);
