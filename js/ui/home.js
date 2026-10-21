'use strict';
// =====================================================================================
//  Pantalla principal, cuenta y acceso al juego en línea.
//   · Portada: tu personaje (animado, clic = su ficha), continuar el último mundo, un jugador,
//     multijugador, opciones y cuenta; consejos que se pasan, cifras y un fondo que sigue al ratón.
//   · En línea solo con sesión (Discord en el servidor propio; cuenta de Claude en claude.ai).
//   · Cuenta: una sola tarjeta clara, sin datos repetidos.
// =====================================================================================
const onlineOK = () => NET.kind === 'claude' || (NET.kind === 'ws' && NET.me.verified);
const needLogin = () => NET.kind === 'ws' && !NET.me.verified;
let _homeTip = (Math.random() * LD_TIPS.length) | 0;
function lastWorld() { const c = activeChar(), idx = worldIndex(); if (!c) return null; const seen = Object.entries(c.worlds || {}).filter(([k]) => idx.some(w => w.id === k)).sort((a, b) => (b[1].at || 0) - (a[1].at || 0))[0]; return seen ? idx.find(w => w.id === seen[0]) : null; }
showMain = function () {
  const c = activeChar(), lw = lastWorld(), worlds = worldIndex().length, games = (NET.lobby || []).length;
  const mpSub = !NET.kind ? 'Sin servidor' : needLogin() ? '🔒 Inicia sesión para jugar en línea' : games ? `${games} partida${games > 1 ? 's' : ''} abierta${games > 1 ? 's' : ''} ahora` : NET.kind === 'claude' ? 'Salas de claude.ai' : 'Servidor conectado';
  $('tBody').innerHTML = `<canvas id="homeBg"></canvas><div class="home">
    ${c ? `<div class="hchar" data-pf="info:${c.id}" role="button" tabindex="0" title="Ver la ficha de ${esc(c.char.name)}"><canvas class="chav" data-av="${c.id}" width="96" height="104"></canvas>
      <div class="hci"><small>Juegas como</small><b>${esc(c.char.name)}</b><span class="mut small">${esc(RACE_OF(c).n)} · ${esc(PROF_OF(c).n)} · Nv. ${lvSum(c)} · ${fmtHours(c.playMs)}</span></div>
      <button class="ghost" data-hm="chars">Cambiar</button></div>`
    : `<button class="hchar new" data-pf="new"><span class="chplus">+</span><div class="hci"><b>Crea tu personaje</b><span class="mut small">Nombre, raza, profesión… y su propio inventario, que viaja contigo a cualquier mundo.</span></div></button>`}
    <div class="hacts">
      ${lw ? `<button class="mm pri" data-hm="cont:${esc(lw.id)}">${svgI('M8 5l11 7-11 7V5z', 20)}<span>Continuar<small>${esc(lw.name)} · ${fmtDate(lw.played)}</small></span></button>` : ''}
      <button class="mm ${lw ? '' : 'pri'}" data-mm="single" ${c ? '' : 'data-need="char"'}>${svgI('M3 12l9-8 9 8 M5 10v10h14V10', 20)}<span>Un jugador<small>${worlds} mundo${worlds !== 1 ? 's' : ''}${WNS ? ' en tu cuenta' : ''}</small></span></button>
      <button class="mm ${needLogin() ? 'lock' : ''}" data-mm="multi" ${c ? '' : 'data-need="char"'}>${svgI(IC.lan, 20)}<span>Multijugador<small>${esc(mpSub)}</small></span></button>
      <div class="mmrow"><button class="mm sm" data-mm="opts">${svgI(IC.opts, 18)}<span>Opciones</span></button><button class="mm sm" data-mm="acc">${svgI(IC.acc, 18)}<span>${NET.me.verified && NET.kind === 'ws' ? esc(NET.me.name) : 'Cuenta'}</span></button></div>
    </div>
    <div class="htip"><button data-hm="tip:-1" aria-label="Anterior">‹</button><p id="homeTip">💡 ${esc(LD_TIPS[_homeTip])}</p><button data-hm="tip:1" aria-label="Siguiente">›</button></div>
    <div class="hfacts"><span title="Personajes guardados"><b>${PF.list.length}</b>/${MAX_CHARS} personajes</span><span title="Mundos guardados"><b>${worlds}</b> mundos</span><span title="Conexión"><i class="dot ${NET.room ? 'on' : ''}"></i>${esc(NET.kind === 'claude' ? 'claude.ai' : NET.kind === 'ws' ? (NET.me.verified ? 'Discord' : 'invitado') : 'sin conexión')}</span></div></div>`;
  chAnimate(); homeBg();
};
// Fondo: engranajes y chispas muy suaves que se apartan del ratón
let _hbRaf = 0, _hbM = { x: -999, y: -999 };
function homeBg() {
  cancelAnimationFrame(_hbRaf); const cv = $('homeBg'); if (!cv) return; const g = cv.getContext('2d');
  const P = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.8, v: 0.004 + Math.random() * 0.01, a: Math.random() * 6 }));
  const step = t => { if (!cv.isConnected) return; const W = cv.width = cv.clientWidth, H = cv.height = cv.clientHeight; g.clearRect(0, 0, W, H);
    for (const p of P) { p.y -= p.v / 60; if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); } let x = p.x * W, y = p.y * H; const dx = x - _hbM.x, dy = y - _hbM.y, d = Math.hypot(dx, dy); if (d < 120) { x += dx / d * (120 - d) * 0.35; y += dy / d * (120 - d) * 0.35; }
      g.globalAlpha = 0.18 + 0.15 * Math.sin(t / 900 + p.a); g.fillStyle = '#e0b54c'; g.beginPath(); g.arc(x, y, p.r, 0, 7); g.fill(); }
    g.globalAlpha = 0.05; g.strokeStyle = '#e0b54c'; g.lineWidth = 2; for (const [cx, cy, r, s] of [[0.1, 0.85, 90, 1], [0.92, 0.2, 70, -1.3]]) { g.save(); g.translate(cx * W, cy * H); g.rotate(t / 4000 * s); g.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, rr = i % 2 ? r * 0.82 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.stroke(); g.beginPath(); g.arc(0, 0, r * 0.3, 0, 7); g.stroke(); g.restore(); }
    g.globalAlpha = 1; _hbRaf = requestAnimationFrame(step); };
  _hbRaf = requestAnimationFrame(step);
}
$('mTitle').addEventListener('mousemove', e => { const cv = $('homeBg'); if (!cv) return; const r = cv.getBoundingClientRect(); _hbM = { x: e.clientX - r.left, y: e.clientY - r.top }; });
setInterval(() => { const p = $('homeTip'); if (p && ui.open === 'title') { _homeTip = (_homeTip + 1) % LD_TIPS.length; p.style.opacity = 0; setTimeout(() => { p.textContent = '💡 ' + LD_TIPS[_homeTip]; p.style.opacity = 1; }, 150); } }, 9000);
document.addEventListener('click', e => {
  const n = e.target.closest('[data-need="char"]'); if (n && !activeChar()) { e.stopImmediatePropagation(); toast('Primero crea o elige un personaje'); showChars(); return; }
  const b = e.target.closest('[data-hm]'); if (!b) return; const [a, v] = b.dataset.hm.split(':');
  if (a === 'chars') showChars();
  if (a === 'tip') { _homeTip = (_homeTip + (+v) + LD_TIPS.length) % LD_TIPS.length; $('homeTip').textContent = '💡 ' + LD_TIPS[_homeTip]; }
  if (a === 'cont') worldAction('play:' + v);
  if (a === 'login') dcLogin();
}, true);
// ---------- Cuenta: una sola tarjeta ----------
accHTML = function (inPause) {
  const me = NET.me, c = activeChar(); let body;
  if (NET.kind === 'ws' && me.verified) body = `<div class="acard"><div class="arow">${me.avatar ? `<img alt="" src="${esc(me.avatar)}">` : `<span class="mpav" style="background:${esc(myColor())}">${esc((me.name || '?')[0])}</span>`}<div><b>${esc(me.name)}</b><span class="good small">✓ Sesión iniciada con Discord</span></div><button data-dc="out">Cerrar sesión</button></div>
      <div class="afacts"><div><small>Personajes</small><b>${PF.list.length}/${MAX_CHARS}</b></div><div><small>Mundos</small><b>${worldIndex().length}</b></div><div><small>Juegas como</small><b>${esc(c ? c.char.name : '—')}</b></div></div>
      <p class="mut small">Tus personajes y mundos de esta cuenta se guardan en el servidor. Al cerrar sesión vuelven los de este navegador.</p></div>`;
  else if (NET.kind === 'claude') body = `<div class="acard"><div class="arow">${me.avatar ? `<img alt="" src="${esc(me.avatar)}">` : ''}<div><b>${esc(me.name || 'Cuenta de Claude')}</b><span class="good small">✓ Cuenta de claude.ai</span></div></div><p class="mut small">Dentro de claude.ai juegas en línea con tu cuenta de Claude. Para entrar con Discord, abre el juego en su web.</p></div>`;
  else body = `<div class="acard login"><div class="dclogo">${svgI('M8 9.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z M16 9.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z M5 6c4-2 10-2 14 0 2 3 3 7 2 11-2 1.5-4 2-5 2l-1-2c-2 .5-4 .5-6 0l-1 2c-1 0-3-.5-5-2-1-4 0-8 2-11z', 34)}</div><b>Inicia sesión con Discord</b>
      <ul class="aben"><li>Juega en línea y abre tu mundo a otros</li><li>Hasta ${MAX_CHARS} personajes en tu cuenta, en cualquier ordenador</li><li>Tus mundos guardados en la nube</li></ul>
      ${NET.kind === 'ws' && NET.room && NET.room.me && NET.room.me.oauth || dcHosted() ? `<button class="pri dcbtn" data-dc="login">Iniciar sesión con Discord</button>` : `<p class="mut small">${esc(NET.status)}</p>`}${DC.err ? `<p class="bad small">${esc(DC.err)}</p>` : ''}</div>`;
  return (inPause ? pzHead('Cuenta', esc(NET.status)) : `<div class="trow" id="accScreen"><h2>Cuenta</h2><button data-mm="main">← Menú principal</button></div>`) + body;
};
// ---------- Multijugador: solo con sesión y con personaje ----------
{ const r0 = mpRender; mpRender = () => {
  const el = $('mpScreen'); if (!el) return;
  if (needLogin() || !activeChar()) { el.innerHTML = `<div class="mpw"><header class="mph"><button class="ico" data-mm="main" aria-label="Volver">${svgI('M15 5l-7 7 7 7', 18)}</button><h2>Multijugador</h2><span></span></header>${!activeChar() ? `<div class="acard login"><b>Primero, tu personaje</b><p class="mut small">Entras en las partidas con tu personaje y su inventario.</p><button class="pri" data-hm="chars">Elegir personaje</button></div>` : accHTML(true).replace(/^<header[\s\S]*?<\/header>/, '')}</div>`; return; }
  r0();
}; }
{ const j0 = netJoin; netJoin = async (code, pass) => { if (!activeChar()) { toastErr('Elige un personaje antes'); showChars(); return; } if (needLogin()) { toastErr('Inicia sesión con Discord para jugar en línea'); return; } return j0(code, pass); }; }
{ const h0 = netHost; netHost = async opt => { if (needLogin()) { toastErr('Inicia sesión con Discord para abrir tu mundo en línea'); if (typeof loadFail === 'function') loadFail('Inicia sesión con Discord para jugar en línea.'); return; } return h0(opt); }; }
// El panel «Abrir en red» del menú de pausa también avisa
{ const l0 = lanHTML; lanHTML = () => needLogin() && !inGame() ? pzHead('Abrir en red', 'Hace falta sesión') + accHTML(true).replace(/^<header[\s\S]*?<\/header>/, '') : l0(); }
// Cerrar sesión en mitad de una partida en línea: fuera de ella
{ const m0 = menuNetChanged; menuNetChanged = () => { if (inGame() && NET.kind === 'ws' && !NET.me.verified) { netLeave(true); toastErr('Has cerrado sesión: sales de la partida en línea'); } m0(); if (ui.open === 'title' && document.querySelector('.home')) showMain(); }; }
if (ui.open === 'title') setTimeout(showMain, 0);
