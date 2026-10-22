'use strict';
// =====================================================================================
//  Menús.
//   · Menú principal: Un jugador · Multijugador · Opciones · Cuenta.
//   · Menú de pausa (Esc): en solitario para el juego; en multijugador el mundo sigue.
//     Ventanas del juego, opciones (sonido, imagen, controles, juego), jugar con otros
//     («Abrir en red» como el «Abrir en LAN» de Minecraft), cuenta y salir.
//  La barra de botones de arriba desaparece: todo está aquí.
// =====================================================================================
document.body.classList.add('nobar');
{ const b = document.createElement('button'); b.id = 'bMenu'; b.className = 'hbtn'; b.innerHTML = svgI('M4 7h16 M4 12h16 M4 17h16'); b.dataset.tip = 'Menú · Esc'; b.setAttribute('aria-label', 'Menú'); b.onclick = () => ui.open === 'pause' ? closeModal() : openPause(); $('right').appendChild(b); }
const mPause = document.createElement('div'); mPause.id = 'mPause'; mPause.className = 'modal pausem'; mPause.hidden = true;
mPause.innerHTML = '<div class="modal-in pause-in"><aside id="pzNav"></aside><section id="pzBody"></section></div>';
document.body.appendChild(mPause); MODALS.pause = 'mPause';
mPause.addEventListener('mousedown', e => { if (e.target === mPause || e.target.closest('[data-close]')) { e.preventDefault(); closeModal(); } });
const PZ = { pane: 'main', otab: 'snd', bind: null };
// Con el menú abierto, el chat (si no lo estás usando) se esconde para no taparlo
{ const c0 = closeModal; closeModal = () => { c0(); document.body.classList.toggle('inmenu', ui.open === 'pause'); }; }
setInterval(() => document.body.classList.toggle('inmenu', ui.open === 'pause' || ui.open === 'title'), 250);
function openPause(pane) { if (!S || ui.open === 'title') return; if (ui.open && ui.open !== 'pause') closeModal(); if (ui.open !== 'pause') { ui.open = 'pause'; mPause.hidden = false; mouse.down = mouse.rdown = false; keys.clear(); } PZ.pane = pane || 'main'; pzRender(); }
const IC = { play: 'M8 5l11 7-11 7V5z', inv: HUD_IC.bInv[0], book: HUD_IC.bBook[0], map: HUD_IC.bMap[0], char: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c0-4 4-6 8-6s8 2 8 6', lore: HUD_IC.bLore[0], help: HUD_IC.bHelp[0], opts: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z', lan: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 19c0-3 2.5-5 5-5s5 2 5 5 M13 15c1-.7 2-1 3-1 2.5 0 5 2 5 5', acc: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z M9 12l2 2 4-4', save: HUD_IC.bSave[0], quit: 'M10 4H5v16h5 M14 8l4 4-4 4 M18 12H9', chat: 'M4 5h16v11H9l-5 4V5z' };
function pzNav() {
  const it = (k, n, key, cls) => `<button data-pz="${k}" class="${PZ.pane === k ? 'on' : ''} ${cls || ''}">${svgI(IC[k] || IC.play, 16)}<span>${n}</span>${key ? `<kbd>${esc(key)}</kbd>` : ''}</button>`;
  const kn = o => KEY_NAME((OPT.keys || {})[o] || o);
  return `<div class="pzbrand">Taller Cinético</div>` + it('main', 'Volver al juego', 'Esc', 'pri') + '<hr>' +
    it('inv', 'Inventario', kn('e')) + it('book', 'Recetario', kn('b')) + it('map', 'Mapa', kn('m')) + it('char', 'Personaje', kn('c')) + it('lore', 'Crónicas', kn('j')) + it('chat', 'Chat', kn('enter')) + it('help', 'Ayuda', kn('h')) + '<hr>' +
    it('opts', 'Opciones') + it('lan', inGame() ? (NET.game.host ? 'Tu mundo en red' : 'Partida en línea') : 'Abrir en red', kn('u')) + it('acc', 'Cuenta y Discord') + '<hr>' +
    it('save', isGuest() ? 'Guardar (en el anfitrión)' : 'Guardar', 'Ctrl+S') + it('quit', 'Salir al menú principal');
}
function pzHead(title, sub) { return `<header class="pzh"><div><h2>${title}</h2>${sub ? `<div class="mut small">${sub}</div>` : ''}</div><button data-close>Volver <kbd>Esc</kbd></button></header>`; }
function pzRender() {
  if (ui.open !== 'pause') return;
  $('pzNav').innerHTML = pzNav();
  const P2 = PZ.pane, body = $('pzBody');
  body.innerHTML = P2 === 'opts' ? optsHTML(true) : P2 === 'lan' ? lanHTML() : P2 === 'acc' ? accHTML(true) : mainHTML();
  bindRanges(body);
}
// ---------- Resumen ----------
function mainHTML() {
  const dl = S.gen.dayLen || DAY_LEN, day = Math.floor(S.time / dl) + 1, h = (S.time % dl) / dl * 24, hh = String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.floor(h % 1 * 60)).padStart(2, '0');
  const pc = S.pc || {}, mp = inGame(), g = NET.game;
  const state = mp ? `<span class="good">● En línea</span> · ${NET.peers.size + 1} jugador${NET.peers.size ? 'es' : ''} · el mundo sigue en marcha` : '⏸ Juego en pausa';
  const card = (t, v, s) => `<div class="pzcard"><small>${t}</small><b>${v}</b>${s ? `<span class="mut small">${s}</span>` : ''}</div>`;
  return pzHead(mp ? 'Menú' : 'Pausa', state) +
    `<div class="pzgrid">${card('Mundo', esc(S.name || 'Mundo'), (S.sandbox ? 'creativo' : 'supervivencia') + (isGuest() ? ' · invitado' : ''))}${card('Día ' + day, hh, typeof WX_T !== 'undefined' && WX_T[WX.type] ? WX_T[WX.type].i + ' ' + WX_T[WX.type].n : '')}${card('Vida', Math.round(pc.hp ?? 100) + ' / ' + Math.round(maxHp()), `hambre ${Math.round(pc.food ?? 100)} · sed ${Math.round(pc.water ?? 100)}`)}${card('Posición', Math.floor(S.player.x / T) + ', ' + Math.floor(S.player.y / T), blocks.length + ' bloques en el mundo')}</div>` +
    `<div class="pzquick"><label class="pzq">${svgI('M4 9h4l5-4v14l-5-4H4V9z', 16)} Volumen <input type="range" data-opt="master" min="0" max="1" step="0.05" value="${OPT.master}"></label><label class="chk"><input type="checkbox" data-opt="mute" ${OPT.mute ? 'checked' : ''}> Silenciar</label></div>` +
    `<div class="pzbig"><button class="pri" data-pz="main" data-close>${svgI(IC.play, 18)} Volver al juego</button><button data-pz="lan">${svgI(IC.lan, 18)} ${mp ? 'Jugadores y permisos' : 'Abrir mi mundo a otros'}</button><button data-pz="opts">${svgI(IC.opts, 18)} Opciones</button></div>` +
    (mp && g && g.host ? `<p class="mut small">Código de tu partida: <b class="pzcode">${esc(g.code.toUpperCase())}</b></p>` : '');
}
// ---------- Opciones ----------
const OPT_UI = {
  snd: ['Sonido', [['master', 'Volumen general', 'range', 0, 1, 0.05, 'pct'], ['sfx', 'Efectos (golpes, máquinas, pasos…)', 'range', 0, 1, 0.05, 'pct'], ['music', 'Música de batalla', 'range', 0, 1, 0.05, 'pct'], ['mute', 'Silenciar todo', 'check']]],
  img: ['Imagen', [['bright', 'Brillo', 'range', 0.6, 1.4, 0.02, 'pct'], ['contrast', 'Contraste', 'range', 0.7, 1.3, 0.02, 'pct'], ['particles', 'Partículas', 'range', 0, 1, 0.05, 'pct'], ['uiScale', 'Tamaño de la interfaz', 'range', 0.8, 1.3, 0.05, 'pct'], ['shake', 'Sacudidas de pantalla', 'check'], ['wxScreen', 'Lluvia, nieve y clima en pantalla', 'check'], ['illFx', 'Visión borrosa al estar enfermo', 'check'], ['names', 'Nombres sobre los demás jugadores', 'check'], ['hover', 'Tarjeta de información al pasar el cursor', 'check'], ['minimap', 'Minimapa', 'check'], ['fps', 'Mostrar FPS', 'check']]],
  ctl: ['Controles', [['camFollow', 'Velocidad de la cámara', 'range', 2, 20, 1, v => v < 5 ? 'Muy suave' : v < 9 ? 'Suave' : v < 14 ? 'Rápida' : 'Instantánea'], ['zoomSens', 'Sensibilidad del zoom', 'range', 0.3, 3, 0.1, v => '×' + (+v).toFixed(1)], ['wheelInvert', 'Invertir la rueda del ratón', 'check'], ['wheelOld', 'Rueda sola: zoom, como antes (Ctrl + rueda: objeto)', 'check']]],
  game: ['Juego', [['autosave', 'Autoguardado cada', 'range', 10, 300, 10, v => v < 60 ? v + ' s' : (v / 60).toFixed(1).replace('.0', '') + ' min'], ['chatSize', 'Tamaño del texto del chat', 'range', 11, 18, 1, v => v + ' px'], ['chatOpacity', 'Fondo del chat', 'range', 0.2, 1, 0.05, 'pct'], ['chatFade', 'El chat se oculta tras', 'range', 4, 60, 1, v => v + ' s'], ['confirmQuit', 'Preguntar antes de salir al menú', 'check']]],
};
const optLabel = (f, v) => f === 'pct' ? Math.round(v * 100) + ' %' : typeof f === 'function' ? f(+v) : v;
function optRow([k, n, type, mn, mx, st, f]) {
  if (type === 'check') return `<label class="orow chk"><input type="checkbox" data-opt="${k}" ${OPT[k] ? 'checked' : ''}><span>${n}</span></label>`;
  return `<label class="orow"><span>${n}</span><input type="range" data-opt="${k}" min="${mn}" max="${mx}" step="${st}" value="${OPT[k]}"><b data-optv="${k}">${optLabel(f, OPT[k])}</b></label>`;
}
function optsHTML(inPause) {
  const tabs = Object.entries(OPT_UI).map(([k, [n]]) => `<button data-otab="${k}" class="${PZ.otab === k ? 'on' : ''}">${n}</button>`).join('');
  const [, rows] = OPT_UI[PZ.otab];
  let h = (inPause ? pzHead('Opciones', 'Se guardan en este navegador y valen para todos tus mundos') : `<div class="trow"><h2>Opciones</h2><button data-mm="main">← Menú principal</button></div>`) + `<nav class="otabs">${tabs}</nav><div class="opane">` + rows.map(optRow).join('');
  if (PZ.otab === 'img') h += `<div class="orow"><span>Pantalla completa</span><button data-oact="full">${document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa'}</button></div>`;
  if (PZ.otab === 'ctl') h += keysHTML();
  if (PZ.otab === 'game') h += `<div class="orow"><span>Volver a los valores de fábrica</span><button data-oact="reset" class="danger">Restablecer todo</button></div>`;
  return h + '</div>';
}
function keysHTML() {
  const used = {}; for (const [, list] of KEY_ACTIONS) for (const [o] of list) { const p = OPT.keys[o] || o; (used[p] = used[p] || []).push(o); }
  return `<div class="cssub">Teclas · clic en una para cambiarla</div>` + KEY_ACTIONS.map(([g, list]) => `<div class="kgroup"><small>${g}</small>${list.map(([o, n]) => { const p = OPT.keys[o] || o, dup = used[p].length > 1; return `<div class="krow"><span>${n}</span><button data-key="${esc(o)}" class="${PZ.bind === o ? 'wait' : ''} ${dup ? 'dup' : ''}" title="${dup ? 'Esta tecla la usan varias acciones' : ''}">${PZ.bind === o ? 'Pulsa una tecla…' : esc(KEY_NAME(p))}</button></div>`; }).join('')}</div>`).join('') + `<div class="orow"><span class="mut small">Esc siempre abre este menú. Ratón: clic izquierdo rompe, pica y ataca; derecho coloca y usa; rueda: objeto; Ctrl + rueda: zoom.</span><button data-oact="keys">Teclas por defecto</button></div>`;
}
function bindRanges(root) { root.querySelectorAll('input[type=range][data-opt]').forEach(i => i.style.setProperty('--p', ((i.value - i.min) / (i.max - i.min) * 100) + '%')); }
function optSet(k, v) {
  OPT[k] = v; optSave(); optApply();
  if (k === 'mute' && S) { S.mute = v; if (v) bossMusic(false); else if (typeof BOSS !== 'undefined' && BOSS) bossMusic(true, BOSS.k); }
  const row = Object.values(OPT_UI).flatMap(x => x[1]).find(r => r[0] === k), lab = document.querySelector(`[data-optv="${k}"]`); if (row && lab) lab.textContent = optLabel(row[6], v);
}
// ---------- Jugar con otros ----------
const chk = (k, n, v, dis) => `<label class="orow chk"><input type="checkbox" data-lan="${k}" ${v ? 'checked' : ''} ${dis ? 'disabled' : ''}><span>${n}</span></label>`;
function lanHTML() {
  const g = NET.game, srv = NET.kind === 'ws' ? 'Servidor: ' + esc(NET.server || '') : NET.kind === 'claude' ? 'Salas de claude.ai' : esc(NET.status);
  if (!inGame()) {
    const o = defaultOpt(), ok = !!NET.room;
    return pzHead('Abrir en red', 'Como «Abrir en LAN»: tu mundo no cambia, solo dejas entrar a otros') +
      `<div class="pzstat ${ok ? 'good' : 'bad'}">● ${srv}${ok ? '' : ' — ' + esc(NET.status)}</div>` +
      `<div class="opane"><label class="orow"><span>Nombre de la partida</span><input id="lanName" maxlength="40" value="${esc(o.name)}"></label>
      <label class="orow"><span>Contraseña <span class="mut small">(vacía = sin contraseña)</span></span><input id="lanPass" maxlength="40" type="password" autocomplete="new-password" placeholder="Opcional"></label>
      <label class="orow"><span>Jugadores como máximo</span><input type="range" id="lanMax" min="2" max="16" step="1" value="${o.max}"><b id="lanMaxV">${o.max}</b></label>
      <label class="orow"><span>Modo de juego de los invitados</span><select id="lanMode">${Object.entries(GAME_MODES).map(([k, n]) => `<option value="${k}" ${o.mode === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      ${chk('build', 'Pueden construir y picar', o.build)}${chk('containers', 'Pueden abrir cofres y máquinas', o.containers)}${chk('cheats', 'Pueden usar trucos (/dar, /tp, /hora…)', o.cheats)}
      ${NET.kind === 'ws' ? chk('requireDc', 'Solo jugadores con sesión de Discord', o.requireDc) + chk('keep', 'Si salgo, la partida sigue para los demás hasta que se vayan', o.keep !== false) : ''}</div>
      <div class="pzbig"><button class="pri" data-lact="open" ${ok ? '' : 'disabled'}>${svgI(IC.lan, 18)} Abrir mi mundo</button>${!ok && NET.kind !== 'claude' ? `<button data-lact="retry">Reintentar conexión</button>` : ''}</div>
      <p class="mut small">${NET.kind === 'ws' ? 'Los demás entran abriendo en su navegador la dirección de tu ordenador y yendo a Multijugador.' : NET.kind === 'claude' ? 'Los demás entran desde Multijugador. Compárteles el juego desde el menú Compartir de claude.ai.' : 'Para jugar en red abre el juego con jugar.bat (incluye el servidor).'}</p>`;
  }
  const ps = [...NET.peers.values()], o = g.opt || {}, host = g.host;
  let h = pzHead(host ? 'Tu mundo está abierto' : 'Partida en línea', srv);
  if (host) {
    const link = inviteURL(g.code);
    if (link) h += `<div class="pzlink"><small>Enlace para entrar con un clic${o.pass ? ' (pedirá la contraseña)' : ''}</small><div class="row gap"><input readonly value="${esc(link)}" onclick="this.select()"><button data-lact="copy">Copiar</button></div></div>`;
    h += `<div class="pzinvite"><div><small>Código</small><b class="pzcode">${esc(g.code.toUpperCase())}</b></div>${NET.kind === 'ws' && NET.public ? `<div><small>Tus amigos abren</small><b class="sel">${esc(NET.public)}/</b></div>` : NET.kind === 'ws' && NET.lan.length ? `<div><small>Tus amigos abren</small>${NET.lan.map(ip => `<b class="sel">http://${esc(ip)}:${NET.port}/</b>`).join('')}</div>` : ''}${o.pass ? '<div><small>Contraseña</small><b>🔒 puesta</b></div>' : ''}</div>`;
  } else h += `<p class="small">Estás en el mundo de <b>${esc((ps.find(p => p.host) || {}).nick || 'el anfitrión')}</b>. Modo: <b>${esc(GAME_MODES[(g.perm || {}).mode] || 'Supervivencia')}</b> · construir: ${perm('build') ? 'sí' : 'no'} · cofres: ${perm('containers') ? 'sí' : 'no'} · trucos: ${(g.perm || {}).cheats ? 'sí' : 'no'}</p>`;
  h += `<div class="cssub">Jugadores (${ps.length + 1}${o.max ? ' / ' + o.max : ''})</div><div class="nlist"><div class="nrow"><span><b style="color:${esc(myColor())}">${host ? '♛ ' : ''}${NET.me.verified && NET.kind === 'ws' ? '✓ ' : ''}${esc(myNick())}</b> <span class="mut">(tú)</span></span></div>` +
    ps.map(p => `<div class="nrow"><span><b style="color:${esc(p.c)}">${p.host ? '♛ ' : ''}${p.verified ? '✓ ' : ''}${esc(p.nick)}</b>${p.pr && p.pr.dc && !p.verified ? `<span class="dctag">Discord: ${esc(String(p.pr.dc).slice(0, 32))}</span>` : ''} <span class="mut small">${p.pr && p.pr.x !== undefined ? Math.round(Math.hypot(p.pr.x - S.player.x, p.pr.y - S.player.y) / T) + ' casillas' : ''}${p.pr && p.pr.ps ? ' · en el menú' : ''}</span></span><span class="row gap">${cheatsOK() ? `<button data-lact="tp:${esc(p.peer)}">Ir</button>` : ''}${host && !p.host ? `<button data-lact="kick:${esc(p.peer)}">Expulsar</button><button class="danger" data-lact="ban:${esc(p.peer)}">Vetar</button>` : ''}</span></div>`).join('') + '</div>';
  if (host) h += `<div class="cssub">Permisos (se aplican al momento)</div><div class="opane"><label class="orow"><span>Modo de los invitados</span><select id="lanMode2">${Object.entries(GAME_MODES).map(([k, n]) => `<option value="${k}" ${o.mode === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>${chk('build', 'Pueden construir y picar', o.build, o.mode === 'adventure')}${chk('containers', 'Pueden abrir cofres y máquinas', o.containers, o.mode === 'adventure')}${chk('cheats', 'Pueden usar trucos', o.cheats)}${NET.kind === 'ws' ? chk('requireDc', 'Solo con sesión de Discord (para los que entren ahora)', o.requireDc) + chk('keep', 'Si salgo, la partida sigue para los demás', o.keep !== false) : ''}<label class="orow"><span>Cambiar contraseña</span><span class="row gap"><input id="lanPass2" type="password" maxlength="40" placeholder="${o.pass ? 'Nueva (vacía = quitarla)' : 'Ponerle una'}" autocomplete="new-password"><button data-lact="pass">Aplicar</button></span></label></div>`;
  return h + `<div class="pzbig"><button class="danger" data-lact="close">${host ? 'Cerrar mi mundo a los demás' : 'Desconectar'}</button></div>`;
}
function menuNetChanged() {
  if (ui.open === 'pause' && (PZ.pane === 'lan' || PZ.pane === 'acc')) { const a = document.activeElement; if (a && a.tagName === 'INPUT' && a.closest('#pzBody') && a.type !== 'checkbox' && a.type !== 'range') return; pzRender(); }
  if (ui.open === 'title' && $('mpScreen')) mpRender();
  if (ui.open === 'title' && $('accScreen')) $('tBody').innerHTML = `<div class="mpw">${accHTML(false)}</div>`;
}
// ---------- Cuenta ----------
function accHTML(inPause) {
  const me = NET.me, srv = NET.kind === 'claude' ? 'Cuenta de Claude' : NET.kind === 'ws' ? (me.verified ? 'Discord (verificado por el servidor)' : 'Invitado en ' + esc(NET.server || '')) : 'Sin conexión';
  return (inPause ? pzHead('Cuenta y Discord', esc(NET.status)) : `<div class="trow" id="accScreen"><h2>Cuenta</h2><button data-mm="main">← Menú principal</button></div>`) +
    `<section class="nid">${me.avatar ? `<img alt="" src="${esc(me.avatar)}">` : ''}<div><div class="mut small">${srv}</div><b>${esc(me.name || 'Sin identificar')}</b>${me.verified ? ' <span class="good small">✓</span>' : ''}</div><label class="nnick">Nombre en el juego <input id="accNick" maxlength="20" value="${esc(myNick())}"></label></section>` + dcPanelHTML() +
    (NET.kind === 'ws' && typeof dcToken === 'function' && dcToken() && !me.verified ? `<p class="small"><button data-mm="reconnect">Conectar al servidor con Discord</button></p>` : '');
}
// ---------- Menú principal ----------
function showMain() {
  const mp = NET.kind === 'claude' ? 'Salas de claude.ai' : NET.kind === 'ws' ? 'Servidor conectado' : 'Sin servidor';
  $('tBody').innerHTML = `<div class="mmain">${S && currentWorld ? `<button class="mm pri" data-mm="resume">${svgI(IC.play, 20)}<span>Volver a la partida<small>${esc(S.name || '')}</small></span></button>` : ''}
    <button class="mm ${S && currentWorld ? '' : 'pri'}" data-mm="single">${svgI('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c0-4 4-6 8-6s8 2 8 6', 20)}<span>Un jugador<small>${worldIndex().filter(w => !String(w.id).startsWith('mp-')).length} mundos guardados</small></span></button>
    <button class="mm" data-mm="multi">${svgI(IC.lan, 20)}<span>Multijugador<small>${esc(mp)}</small></span></button>
    <div class="mmrow"><button class="mm sm" data-mm="opts">${svgI(IC.opts, 18)}<span>Opciones</span></button><button class="mm sm" data-mm="acc">${svgI(IC.acc, 18)}<span>Cuenta${typeof DC !== 'undefined' && DC.data ? ' · ' + esc(dcTag()) : ''}</span></button></div></div>
    <p class="mmfoot mut small">${esc(myNick())} · ${esc(NET.status)}</p>`;
}
{ const o0 = openTitle; openTitle = () => { o0(); showMain(); }; }
// El juego arranca antes de que exista este menú: si ya está en la portada, se cambia aquí
if (ui.open === 'title') setTimeout(showMain, 0);
{ const s0 = showList; showList = () => { s0(); const t = document.querySelector('#tBody .trow .row'); if (t && !t.querySelector('[data-mm=main]')) t.insertAdjacentHTML('afterbegin', '<button data-mm="main">← Menú principal</button>'); document.querySelectorAll('#tBody [data-id-w^="mp-"]').forEach(e => e.remove()); }; }
// ---------- Multijugador (desde el menú principal) ----------
let _mpTimer = 0, _mpPass = null;
function showMP() { $('tBody').innerHTML = '<div id="mpScreen"></div>'; mpRender(); netGames().then(() => $('mpScreen') && mpRender()); clearInterval(_mpTimer); _mpTimer = setInterval(() => { if (ui.open !== 'title' || !$('mpScreen')) { clearInterval(_mpTimer); return; } netGames().then(() => $('mpScreen') && mpRender()); }, 3000); }
function mpRender() {
  const el = $('mpScreen'); if (!el) return; const a = document.activeElement; if (a && a.tagName === 'INPUT' && el.contains(a)) return;
  const games = NET.lobby || [], g = NET.game, ok = !!NET.room, me = NET.me, nick = myNick();
  const av = me.avatar ? `<img alt="" src="${esc(me.avatar)}">` : `<span class="mpav" style="background:${esc(myColor())}">${esc(nick.slice(0, 1).toUpperCase())}</span>`;
  const dots = (n, max) => { const m = Math.min(max || 8, 12); let s = ''; for (let i = 0; i < m; i++) s += `<i class="${i < n ? 'on' : ''}"></i>`; return `<span class="mpdots">${s}</span>`; };
  const col = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return `hsl(${Math.abs(h) % 360} 45% 38%)`; };
  let h = `<div class="mpw"><header class="mph"><button class="ico" data-mm="main" aria-label="Volver" title="Menú principal">${svgI('M15 5l-7 7 7 7', 18)}</button><h2>Multijugador</h2><button class="ico ${NET._busy ? 'spin' : ''}" data-mm="refresh" aria-label="Actualizar" title="Actualizar">${svgI('M20 11a8 8 0 1 0-2.3 5.7 M20 5v6h-6', 17)}</button></header>`;
  h += `<div class="mpme">${av}<div><b>${me.verified && NET.kind === 'ws' ? '✓ ' : ''}${esc(nick)}</b><span class="mppill ${ok ? 'good' : 'bad'}">${ok ? '●' : '○'} ${esc(NET.kind === 'claude' ? 'Salas de claude.ai' : NET.kind === 'ws' ? (me.verified ? 'Discord · ' : 'Invitado · ') + (NET.server || '').replace(/^wss?:\/\//, '').replace(/\/ws$/, '') : NET.status)}</span></div><button class="ghost" data-mm="acc">${NET.kind === 'ws' && !me.verified ? 'Entrar con Discord' : 'Cuenta'}</button></div>`;
  if (g && g.waiting) h += `<div class="mpwait"><span class="mpspin"></span>Entrando en <b>${esc(g.code.toUpperCase())}</b>…</div>`;
  h += `<div class="mpsec"><span>Partidas abiertas</span><b>${games.length}</b></div><div class="mpl">`;
  h += games.length ? games.map((x, i) => { const open = _mpPass === x.code;
    return `<div class="mpc ${open ? 'open' : ''}" style="--d:${i * 40}ms" data-mm="${x.lock ? 'ask' : 'join'}:${esc(x.code)}" role="button" tabindex="0">
      <span class="mpico" style="background:${col(x.name || x.code)}">${esc(String(x.name || '?').slice(0, 1).toUpperCase())}</span>
      <span class="mpci"><b>${esc(x.name || 'Partida')}</b><span class="mut small">${esc(x.host || 'alguien')} · ${esc((GAME_MODES[x.mode] || 'Supervivencia').split(' ')[0])}${x.cheats ? ' · trucos' : ''}${x.dc ? ' · Discord' : ''}</span></span>
      <span class="mpcr">${dots(x.n || 1, x.max)}<small>${x.n || 1}/${x.max || '∞'}</small></span><span class="mpgo">${x.lock ? svgI('M7 11V8a5 5 0 0 1 10 0v3 M5 11h14v10H5z', 16) : svgI('M9 5l7 7-7 7', 16)}</span>
      ${open ? `<div class="mppass" data-stop><input id="mpPass" type="password" placeholder="Contraseña" autocomplete="off"><button class="pri" data-mm="join:${esc(x.code)}">Entrar</button></div>` : ''}</div>`; }).join('')
    : `<div class="mpempty"><span class="radar"><i></i><i></i></span><b>${ok ? 'Buscando partidas…' : 'Sin conexión'}</b><span class="mut small">${ok ? 'Cuando alguien abra su mundo aparecerá aquí. Para abrir el tuyo: entra en un mundo, pulsa Esc › Abrir en red.' : NET.kind === 'claude' ? esc(NET.status) : 'Abre el juego con jugar.bat o conéctate al servidor de un amigo abajo.'}</span></div>`;
  h += `</div><details class="mpdir" ${_mpDir ? 'open' : ''}><summary>Conexión directa</summary><div class="mprow"><input id="mpCode" maxlength="8" placeholder="Código" autocomplete="off"><input id="mpCodePass" type="password" placeholder="Contraseña" autocomplete="off"><button class="pri" data-mm="direct">Entrar</button></div></details>`;
  if (NET.kind !== 'claude') h += `<details class="mpdir" ${_mpSrv ? 'open' : ''}><summary>Servidor</summary><div class="mprow"><input id="mpSrv" value="${esc(NET.server && NET.server !== 'claude.ai' ? NET.server : defaultServer())}" placeholder="192.168.1.20:8080"><button data-mm="srv">Conectar</button></div></details>`;
  el.innerHTML = h + '</div>';
}
let _mpDir = false, _mpSrv = false;
document.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('mpdir')) { const s = e.target.querySelector('summary').textContent; if (s.startsWith('Conexión')) _mpDir = e.target.open; else _mpSrv = e.target.open; } }, true);
document.addEventListener('keydown', e => { const c = e.target.closest && e.target.closest('.mpc'); if (c && (e.key === 'Enter' || e.key === ' ') && e.target === c) { e.preventDefault(); c.click(); } });
// ---------- Clics ----------
document.addEventListener('click', e => {
  if (e.target.closest('[data-stop]') && !e.target.closest('button')) return;
  const t = e.target.closest('[data-pz],[data-otab],[data-oact],[data-key],[data-lact],[data-mm]'); if (!t) return;
  if (t.dataset.pz) { const k = t.dataset.pz; if (t.hasAttribute('data-close')) return;
    const win = { inv: () => openInventory(null), book: openBook, map: openMap, char: openChar, lore: () => openLore(), help: () => openModal('help'), chat: () => { closeModal(); chatOpen(''); } };
    if (k === 'main') { closeModal(); return; }
    if (win[k]) { closeModal(); win[k](); return; }
    if (k === 'save') { saveGame(); pzRender(); return; }
    if (k === 'quit') { quitToMenu(); return; }
    PZ.pane = k; pzRender(); return; }
  if (t.dataset.otab) { PZ.otab = t.dataset.otab; PZ.bind = null; rerenderOpts(); return; }
  if (t.dataset.oact) { const a = t.dataset.oact;
    if (a === 'full') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => toastErr('Tu navegador no deja usar pantalla completa aquí.')); setTimeout(rerenderOpts, 300); }
    if (a === 'reset') { const keep = OPT.keys; Object.assign(OPT, OPT_DEF, { keys: keep }); optSave(); optApply(); rerenderOpts(); toast('Opciones restablecidas'); }
    if (a === 'keys') { OPT.keys = {}; optSave(); keymapBuild(); rerenderOpts(); toast('Teclas por defecto'); }
    return; }
  if (t.dataset.key) { PZ.bind = PZ.bind === t.dataset.key ? null : t.dataset.key; rerenderOpts(); return; }
  if (t.dataset.lact) { const [a, v] = t.dataset.lact.split(':');
    if (a === 'open') { const o = { name: ($('lanName') || {}).value || S.name, pass: ($('lanPass') || {}).value || '', max: +($('lanMax') || {}).value || 8, mode: ($('lanMode') || {}).value || 'survival' }; document.querySelectorAll('[data-lan]').forEach(i => o[i.dataset.lan] = i.checked); netHost(o).then(pzRender); }
    if (a === 'retry') netReconnect();
    if (a === 'copy') { const l = inviteURL(NET.game.code); (navigator.clipboard ? navigator.clipboard.writeText(l) : Promise.reject()).then(() => toast('🔗 Enlace copiado'), () => toast(l)); }
    if (a === 'close') { const g = NET.game, keep = g.host && g.opt.keep !== false && NET.peers.size; if (!g.host || keep || confirm('¿Cerrar tu mundo? Los demás jugadores saldrán de la partida.')) netLeave().then(pzRender); }
    if (a === 'kick' || a === 'ban') { const o = NET.peers.get(v); if (o && (a === 'kick' || confirm(`¿Vetar a ${o.nick}? No podrá volver a entrar en esta partida.`))) netKick(v, a === 'ban'); }
    if (a === 'tp') { tpTo(v); closeModal(); }
    if (a === 'pass') { netSetOpt({ pass: ($('lanPass2') || {}).value || '' }); toast(NET.game.opt.pass ? 'Contraseña cambiada' : 'Contraseña quitada'); }
    return; }
  if (t.dataset.mm) { const [a, v] = t.dataset.mm.split(':');
    if (a === 'main') { clearInterval(_mpTimer); showMain(); }
    if (a === 'resume') worldAction('resume');
    if (a === 'single') showList();
    if (a === 'multi') showMP();
    if (a === 'opts') { $('tBody').innerHTML = `<div class="mpw wide" id="titleOpts">${optsHTML(false)}</div>`; bindRanges($('tBody')); }
    if (a === 'acc') $('tBody').innerHTML = `<div class="mpw">${accHTML(false)}</div>`;
    if (a === 'refresh') { NET._busy = 1; mpRender(); Promise.all([netGames(), new Promise(r => setTimeout(r, 500))]).then(() => { NET._busy = 0; mpRender(); }); }
    if (a === 'srv') { const u = ($('mpSrv') || {}).value.trim(); if (u) { const url = /^wss?:\/\//.test(u) ? u : 'ws://' + u.replace(/^https?:\/\//, '').replace(/\/.*$/, '') + '/ws'; try { localStorage.setItem('tc-server', url); } catch (er) { } netConnectWs(url).then(() => netGames()).then(mpRender); } }
    if (a === 'ask') { _mpPass = _mpPass === v ? null : v; mpRender(); setTimeout(() => $('mpPass') && $('mpPass').focus(), 0); }
    if (a === 'join') { const pass = ($('mpPass') || {}).value || ''; _mpPass = null; netJoin(v, pass); mpRender(); }
    if (a === 'direct') netJoin(($('mpCode') || {}).value || '', ($('mpCodePass') || {}).value || '');
    if (a === 'reconnect') netReconnect();
  }
});
function rerenderOpts() { if (ui.open === 'pause') pzRender(); else if ($('titleOpts')) { $('titleOpts').innerHTML = optsHTML(false); bindRanges($('titleOpts')); } }
document.addEventListener('input', e => { const k = e.target.dataset && e.target.dataset.opt; if (k && e.target.type === 'range') { optSet(k, +e.target.value); bindRanges(e.target.parentNode); } if (e.target.id === 'lanMax') $('lanMaxV').textContent = e.target.value; });
document.addEventListener('change', e => {
  const t = e.target, k = t.dataset && t.dataset.opt;
  if (k && t.type === 'checkbox') optSet(k, t.checked);
  if (t.dataset && t.dataset.lan && inGame() && NET.game.host) netSetOpt({ [t.dataset.lan]: t.checked });
  if (t.id === 'lanMode2') netSetOpt({ mode: t.value });
  if (t.id === 'accNick') { const n = t.value.trim().slice(0, 20); if (S) S.nick = n || null; try { const p = JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; p.nick = n || null; localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (er) { } lobbyPresence(); }
});
// Las teclas de los formularios del menú no mueven al personaje
document.addEventListener('keydown', e => { if (e.target.closest && e.target.closest('#mPause,#mTitle') && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.key !== 'Escape') { e.stopPropagation(); if (e.key === 'Enter') { if (e.target.id === 'mpPass' || e.target.id === 'mpCodePass' || e.target.id === 'mpCode') { const b = e.target.parentNode.querySelector('button'); if (b) b.click(); } e.target.blur(); } } }, true);
// ---------- Teclado: Esc abre el menú, U el multijugador, asignar teclas ----------
addEventListener('keydown', e => {
  if (PZ.bind && (ui.open === 'pause' || $('titleOpts'))) { e.stopImmediatePropagation(); e.preventDefault(); const k = e.key.toLowerCase();
    if (k !== 'escape' && !['shift', 'control', 'alt', 'meta'].includes(k)) { if (k === PZ.bind) delete OPT.keys[PZ.bind]; else OPT.keys[PZ.bind] = k; optSave(); keymapBuild(); toast(`Tecla asignada: ${KEY_NAME(k)}`); }
    PZ.bind = null; rerenderOpts(); return; }
  if (e.key === 'Escape' && S && !ui.open && !CHAT.open) { e.stopImmediatePropagation(); e.preventDefault(); openPause(); return; }
  if (!S || ui.open || CHAT.open || e.ctrlKey || e.metaKey || _typing(e)) return;
  if (e.key.toLowerCase() === 'u') { e.stopImmediatePropagation(); openPause('lan'); }
}, true);
async function quitToMenu() {
  if (OPT.confirmQuit && inGame() && NET.game.host && !confirm('Si sales, tu mundo se cierra para los demás jugadores. ¿Salir?')) return;
  if (inGame()) { const g = NET.game; if (!g.host) g.prev = null; await netLeave(true); }
  if (S && currentWorld) saveGame(true);
  closeModal(); openTitle();
}
// ---------- Efectos de las opciones ----------
{ const a0 = audio; audio = () => { if (OPT.mute) return null; const a = a0(); if (a && MG && !MG._opt) { MG._opt = 1; MG.gain.value = 0.5 * OPT.master; } return a; }; }
{ const t0 = tone; tone = (f, d, type, v = 0.08, slide, when, dest) => t0(f, d, type, v * (dest ? OPT.music : OPT.sfx), slide, when, dest); }
{ const n0 = noise; noise = (d, v = 0.1, hp, when, dest) => n0(d, v * (dest ? OPT.music : OPT.sfx), hp, when, dest); }
{ const f0 = fxAdd; fxAdd = o => OPT.particles >= 1 || Math.random() < OPT.particles ? f0(o) : o; }
{ const r0 = render; render = fdt => { if (!OPT.shake) shake = 0; r0(fdt); }; }
{ const w0 = drawWeatherScreen; drawWeatherScreen = (ctx, dt) => { if (OPT.wxScreen) w0(ctx, dt); }; }
{ const h0 = hoverFrame; hoverFrame = dt => { h0(dt); if (!OPT.hover && HC.el) HC.el.style.display = 'none'; else if (HC.el && HC.el.style.display === 'none') HC.el.style.display = ''; }; }
optApply();
