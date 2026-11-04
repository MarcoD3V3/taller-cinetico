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
// Portada con el estilo del árbol de talentos: tu héroe a la izquierda, el menú en el centro y tu
// mundo, los primeros pasos y las novedades a la derecha. Fondo de brasas que suben.
const HOME_NEWS = [
  ['🏴‍☠️', 'Piratas y batallas navales', 'Galeón con cañones, flotas, abordajes, mapas cifrados y el Capitán Fantasma.'],
  ['🎣', 'Pesca profunda', 'Peces legendarios, cebos, récords, acuario y torneos.'],
  ['🏘', 'Tu pueblo de colonos', 'Recluta aldeanos, dales oficio y haz crecer tu ciudad.'],
  ['🔥', 'El Hogar del núcleo', 'Tu núcleo nace sobre una tarima, en una plaza que se adapta al bioma.'],
  ['🌿', 'Mundo más natural', 'Lindes de bioma onduladas y transiciones pixeladas.'],
];
const HOME_GUIDE = [
  ['🧑', 'Tu personaje', 'Crea a tu héroe: raza, profesión y aspecto. Lleva su propio inventario a cualquier mundo y sube de nivel jugando.'],
  ['⛏', 'Recoge', 'Mantén el clic derecho para picar, talar o cavar. Pulsa F para comer, beber o usar lo que llevas. E abre el inventario.'],
  ['⚙', 'Construye máquinas', 'Una rueda hidráulica o una manivela dan rotación; ejes y engranajes la llevan a taladros, hornos y bancos. B abre el recetario.'],
  ['📦', 'Alimenta el Núcleo', 'Entrega al Núcleo lo que pide cada nivel para desbloquear máquinas nuevas: de la andesita a la electricidad y más allá.'],
  ['⚔', 'Sobrevive y explora', 'Hambre, sed, frío y heridas. Pueblos, mazmorras, islas del tesoro, piratas y jefes enormes te esperan.'],
  ['🏘', 'Haz crecer tu pueblo', 'Recluta aldeanos (✦), dales cama, comida y oficio. Con la Vara de capataz les marcas dónde trabajar.'],
];
let _hgStep = 0;
function homeSteps(c, lw) { const idx = worldIndex(); return [
  ['Crea tu personaje', !!c],
  ['Crea tu primer mundo', idx.length > 0],
  ['Juega una hora', !!c && (c.playMs || 0) > 3600e3],
  ['Sube el Núcleo al nivel 2', idx.some(w => (w.tier || 0) >= 1)],
  ['Construye 100 bloques', idx.some(w => (w.blocks || 0) >= 100)],
]; }
showMain = function () {
  const c = activeChar(), lw = lastWorld(), worlds = worldIndex().length, games = (NET.lobby || []).length;
  const mpSub = !NET.kind ? 'Sin servidor' : needLogin() ? '🔒 Inicia sesión para jugar en línea' : games ? `${games} partida${games > 1 ? 's' : ''} abierta${games > 1 ? 's' : ''} ahora` : NET.kind === 'claude' ? 'Salas de claude.ai' : 'Servidor conectado';
  const steps = homeSteps(c, lw), done = steps.filter(s => s[1]).length;
  const hero = c ? `<section class="hpn hhero"><h3>Tu héroe</h3>
      <div class="hhav" data-pf="info:${c.id}" role="button" tabindex="0" title="Ver la ficha"><canvas class="chav chbig" data-av="${c.id}" width="180" height="200"></canvas><span class="hhring"></span></div>
      <b class="hhname">${esc(c.char.name)}</b><span class="hhsub">${esc(RACE_OF(c).n)} · ${esc(PROF_OF(c).n)}</span>
      <div class="hhstats"><div><small>Nivel</small><b>${lvSum(c)}</b></div><div><small>Jugado</small><b>${fmtHours(c.playMs)}</b></div><div><small>Mundos</small><b>${Object.keys(c.worlds || {}).length}</b></div></div>
      <div class="hhbtns"><button class="hmbtn" data-pf="info:${c.id}">Ficha</button><button class="hmbtn" data-hm="chars">Cambiar</button></div></section>`
    : `<section class="hpn hhero empty"><h3>Tu héroe</h3><button class="hhnew" data-pf="new"><span>+</span></button><b class="hhname">Crea tu personaje</b><span class="hhsub">Nombre, raza, profesión… y su propio inventario, que viaja contigo a cualquier mundo.</span><button class="hmbtn pri" data-pf="new">Crear personaje</button></section>`;
  const world = lw ? `<section class="hpn hworld"><h3>Tu mundo</h3><div class="hwname">${esc(lw.name)}</div>
      <div class="hwrows"><span>🌱 Semilla</span><b>${esc(String(lw.seed ?? '—'))}</b><span>⚙ Núcleo</span><b>${esc(typeof TIERS !== 'undefined' && TIERS[lw.tier || 0] ? TIERS[lw.tier || 0].n.replace(/^Nivel \d+ · /, '') : 'Nivel ' + ((lw.tier || 0) + 1))}</b><span>🧱 Bloques</span><b>${lw.blocks || 0}</b><span>🕓 Última vez</span><b>${esc(fmtDate(lw.played))}</b></div>
      <button class="hmbtn pri" data-hm="cont:${esc(lw.id)}">▶ Continuar aquí</button></section>` : '';
  $('tBody').innerHTML = `<canvas id="homeBg"></canvas><div class="home2">
    <aside class="hcol hleft">${hero}
      <section class="hpn hsteps"><h3>Primeros pasos <small>${done}/${steps.length}</small></h3><i class="hprog"><b style="width:${done / steps.length * 100}%"></b></i><ul>${steps.map(([t, ok]) => `<li class="${ok ? 'ok' : ''}"><span>${ok ? '✔' : '○'}</span>${esc(t)}</li>`).join('')}</ul></section></aside>
    <main class="hcenter">
      <div class="hbrand"><svg class="hgear" viewBox="0 0 100 100"><path d="${homeGearPath()}"/></svg><h1>Taller Cinético</h1><p>Automatización mecánica en un mundo infinito</p><i class="hrule"></i></div>
      <nav class="hmenu">
        ${lw ? `<button class="hplq main" data-hm="cont:${esc(lw.id)}"><span class="hpi">▶</span><span class="hpt">Continuar<small>${esc(lw.name)} · ${esc(fmtDate(lw.played))}</small></span><span class="hpk">Enter</span></button>` : ''}
        <button class="hplq ${lw ? '' : 'main'}" data-mm="single" ${c ? '' : 'data-need="char"'}><span class="hpi">🏠</span><span class="hpt">Un jugador<small>${worlds} mundo${worlds !== 1 ? 's' : ''}${WNS ? ' en tu cuenta' : ''} · crea, carga o borra</small></span></button>
        <button class="hplq ${needLogin() ? 'lock' : ''}" data-mm="multi" ${c ? '' : 'data-need="char"'}><span class="hpi">👥</span><span class="hpt">Multijugador<small>${esc(mpSub)}</small></span></button>
        <div class="hrow2"><button class="hplq sm" data-hm="guide"><span class="hpi">📖</span><span class="hpt">Cómo se juega</span></button><button class="hplq sm" data-mm="opts"><span class="hpi">⚙</span><span class="hpt">Opciones</span></button><button class="hplq sm" data-mm="acc"><span class="hpi">🛡</span><span class="hpt">${NET.me.verified && NET.kind === 'ws' ? esc(NET.me.name) : 'Cuenta'}</span></button></div>
      </nav>
      <div class="htip2"><button data-hm="tip:-1" aria-label="Anterior">‹</button><p id="homeTip">💡 ${esc(LD_TIPS[_homeTip])}</p><button data-hm="tip:1" aria-label="Siguiente">›</button></div>
    </main>
    <aside class="hcol hright">${world}
      <section class="hpn hnews"><h3>Novedades</h3><ul>${HOME_NEWS.map(([i, t, d]) => `<li><span>${i}</span><div><b>${esc(t)}</b><small>${esc(d)}</small></div></li>`).join('')}</ul></section></aside>
    <footer class="hfoot"><span><b>${PF.list.length}</b>/${MAX_CHARS} personajes</span><span><b>${worlds}</b> mundos</span><span><i class="dot ${NET.room ? 'on' : ''}"></i>${esc(NET.kind === 'claude' ? 'claude.ai' : NET.kind === 'ws' ? (NET.me.verified ? 'Discord' : 'invitado') : 'sin conexión')}</span><span class="mut">Enter: continuar · H: cómo se juega</span></footer></div>`;
  chAnimate(); homeBg();
};
function homeGearPath() { let d = ''; for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2, r = i % 4 < 2 ? 46 : 38; d += (i ? 'L' : 'M') + (50 + Math.cos(a) * r).toFixed(1) + ' ' + (50 + Math.sin(a) * r).toFixed(1); } return d + 'Z M50 30 A20 20 0 1 0 50 70 A20 20 0 1 0 50 30Z'; }
// Guía «Cómo se juega» (pasos con flechas)
function homeGuide() { const [i, t, d] = HOME_GUIDE[_hgStep];
  let g = $('homeGuide'); if (!g) { g = document.createElement('div'); g.id = 'homeGuide'; $('mTitle').appendChild(g); g.addEventListener('mousedown', e => { if (e.target === g || e.target.closest('[data-hg="x"]')) g.remove(); }); }
  g.innerHTML = `<div class="hgbox"><button class="hgx" data-hg="x" aria-label="Cerrar">✕</button><small>Cómo se juega · ${_hgStep + 1}/${HOME_GUIDE.length}</small><div class="hgi">${i}</div><h2>${esc(t)}</h2><p>${esc(d)}</p>
    <div class="hgdots">${HOME_GUIDE.map((_, k) => `<i class="${k === _hgStep ? 'on' : ''}" data-hg="${k}"></i>`).join('')}</div>
    <div class="hgnav"><button class="hmbtn" data-hg="prev" ${_hgStep ? '' : 'disabled'}>‹ Anterior</button>${_hgStep < HOME_GUIDE.length - 1 ? '<button class="hmbtn pri" data-hg="next">Siguiente ›</button>' : '<button class="hmbtn pri" data-hg="x">¡A jugar!</button>'}</div></div>`; }
document.addEventListener('click', e => { const b = e.target.closest('[data-hg]'); if (!b) return; const v = b.dataset.hg; if (v === 'x') { const g = $('homeGuide'); if (g) g.remove(); return; }
  _hgStep = v === 'next' ? Math.min(HOME_GUIDE.length - 1, _hgStep + 1) : v === 'prev' ? Math.max(0, _hgStep - 1) : +v; homeGuide(); });
addEventListener('keydown', e => { if (ui.open !== 'title' || !document.querySelector('.home2') || e.target.tagName === 'INPUT') return; const g = $('homeGuide');
  if (g) { if (e.key === 'ArrowRight') { _hgStep = Math.min(HOME_GUIDE.length - 1, _hgStep + 1); homeGuide(); } else if (e.key === 'ArrowLeft') { _hgStep = Math.max(0, _hgStep - 1); homeGuide(); } else if (e.key === 'Escape') { g.remove(); e.stopImmediatePropagation(); } return; }
  if (e.key === 'Enter') { const c = document.querySelector('.home2 .hplq.main'); if (c) { c.click(); e.preventDefault(); } }
  else if (e.key.toLowerCase() === 'h') { _hgStep = 0; homeGuide(); } }, true);
// Fondo: brasas que suben (como en el árbol de talentos), resplandor abajo y engranajes tenues que giran
let _hbRaf = 0, _hbM = { x: -999, y: -999 };
function homeBg() {
  cancelAnimationFrame(_hbRaf); const cv = $('homeBg'); if (!cv) return; const g = cv.getContext('2d');
  const P = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 2.2, v: 0.01 + Math.random() * 0.03, a: Math.random() * 6, w: (Math.random() - 0.5) * 0.4 }));
  const step = t => { if (!cv.isConnected) return; if (ui.open !== 'title') { _hbRaf = 0; return; }
    if (cv.width !== cv.clientWidth || cv.height !== cv.clientHeight) { cv.width = cv.clientWidth; cv.height = cv.clientHeight; } const W = cv.width, H = cv.height; g.clearRect(0, 0, W, H);
    const glow = g.createRadialGradient(W / 2, H * 1.05, 10, W / 2, H * 1.05, H * 0.9); glow.addColorStop(0, 'rgba(255,120,40,.22)'); glow.addColorStop(0.5, 'rgba(160,60,20,.08)'); glow.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#e8c890'; g.lineWidth = 2; for (const [cx, cy, r, s, al] of [[0.08, 0.82, 110, 1, 0.05], [0.94, 0.16, 80, -1.3, 0.05], [0.86, 0.9, 50, 1.7, 0.04]]) { g.globalAlpha = al; g.save(); g.translate(cx * W, cy * H); g.rotate(t / 5000 * s); g.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, rr = i % 2 ? r * 0.82 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.stroke(); g.beginPath(); g.arc(0, 0, r * 0.35, 0, 7); g.stroke(); g.restore(); }
    for (const p of P) { p.y -= p.v / 60; p.x += Math.sin(t / 1400 + p.a) * 0.0004 + p.w / 6000; if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); } let x = p.x * W, y = p.y * H; const dx = x - _hbM.x, dy = y - _hbM.y, d = Math.hypot(dx, dy); if (d < 120) { x += dx / d * (120 - d) * 0.35; y += dy / d * (120 - d) * 0.35; }
      const life = Math.min(1, (1 - p.y) * 1.6); g.globalAlpha = (0.25 + 0.35 * Math.sin(t / 500 + p.a) ** 2) * life; g.fillStyle = p.r > 1.8 ? '#ffd27a' : '#ff8a3a'; g.shadowColor = '#ff7a2a'; g.shadowBlur = 6; g.beginPath(); g.arc(x, y, p.r, 0, 7); g.fill(); }
    g.shadowBlur = 0; g.globalAlpha = 1; _hbRaf = requestAnimationFrame(step); };
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
  if (a === 'guide') { _hgStep = 0; homeGuide(); }
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
{ const m0 = menuNetChanged; menuNetChanged = () => { if (inGame() && NET.kind === 'ws' && !NET.me.verified && !(typeof dcSess === 'function' && dcSess())) { netLeave(true); toastErr('Has cerrado sesión: sales de la partida en línea'); } m0(); if (ui.open === 'title' && document.querySelector('.home')) showMain(); }; }
if (ui.open === 'title') setTimeout(showMain, 0);
