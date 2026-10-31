'use strict';
// =====================================================================================
//  Ajustes, versión nueva: categorías con icono a la izquierda, buscador, cada ajuste con una
//  línea que explica qué hace, interruptores, selectores por botones, «↺» para volver al valor
//  de fábrica, perfiles de rendimiento y un teclado visual para cambiar las teclas.
//  Reutiliza lo de opts.js / menu.js (OPT, optSet, data-opt, data-key, PZ.bind) y solo cambia
//  cómo se ve y añade ajustes nuevos.
// =====================================================================================
Object.assign(OPT_DEF, { sat: 1, shakeAmt: 1, flyZoom: true, flyClouds: true, altHud: true, accent: 'brass', reduceMotion: false, cb: 'none', hiContrast: false, muteBlur: false });
for (const k in OPT_DEF) if (!(k in OPT)) OPT[k] = OPT_DEF[k];

// ---------- Ajustes nuevos: efectos ----------
const ACCENTS = { brass: ['Latón', '#e0b54c'], sky: ['Cielo', '#7cc4ff'], jade: ['Jade', '#6fd49a'], rose: ['Rosa', '#ff7aa8'], violet: ['Violeta', '#b48cff'], ember: ['Brasa', '#ff8a4c'] };
const CB_MODES = { none: 'Normal', prot: 'Protanopía', deut: 'Deuteranopía', trit: 'Tritanopía' };
// Matrices de corrección de color para daltonismo (filtros SVG que usa el canvas del mundo)
{ const M = { prot: '0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0', deut: '0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0', trit: '0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0' };
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('width', 0); svg.setAttribute('height', 0); svg.style.position = 'absolute';
  svg.innerHTML = Object.entries(M).map(([k, m]) => `<filter id="cb-${k}"><feColorMatrix type="matrix" values="${m}"/></filter>`).join(''); document.body.appendChild(svg); }
cvFilter = () => { const c = document.getElementById('c'); if (!c) return; const f = []; if (c._ill) f.push(c._ill); if (+OPT.bright !== 1) f.push('brightness(' + OPT.bright + ')'); if (+OPT.contrast !== 1) f.push('contrast(' + OPT.contrast + ')'); if (+OPT.sat !== 1) f.push('saturate(' + OPT.sat + ')'); if (OPT.cb && OPT.cb !== 'none') f.push(`url(#cb-${OPT.cb})`); const s = f.join(' ') || 'none'; if (c.style.filter !== s) c.style.filter = s; };
{ const a0 = optApply; optApply = () => { a0(); const h = document.documentElement;
  h.style.setProperty('--brass', (ACCENTS[OPT.accent] || ACCENTS.brass)[1]);
  h.classList.toggle('rm', !!OPT.reduceMotion); h.classList.toggle('hc', !!OPT.hiContrast);
  const pv = document.getElementById('stPrev'); if (pv) pv.style.filter = (document.getElementById('c') || {}).style?.filter || ''; }; }
// Temblor: se escala solo lo que sube (si no, se iría encogiendo en cada fotograma)
{ let last = 0; const r0 = render; render = fdt => { if (shake > last + 1e-4) shake = last + (shake - last) * OPT.shakeAmt; r0(fdt); last = shake; }; }
document.addEventListener('visibilitychange', () => { if (typeof MG === 'undefined' || !MG) return; if (document.hidden && OPT.muteBlur) MG.gain.value = 0; else optApply(); });

// ---------- Categorías ----------
// Fila: [clave, nombre, tipo, mín, máx, paso, formato, explicación]. Tipo 'seg': mín = [[valor, texto]…]
const PCT = 'pct';
const ST_CATS = {
  snd: ['Sonido', 'M4 9h4l5-4v14l-5-4H4V9z M16 9a4 4 0 0 1 0 6 M18.5 6.5a8 8 0 0 1 0 11', 'Cuánto suena cada cosa. Mueve una barra y oirás el cambio al momento.', [
    ['master', 'Volumen general', 'range', 0, 1, 0.05, PCT, 'Sube o baja todo el sonido del juego a la vez.'],
    ['sfx', 'Efectos', 'range', 0, 1, 0.05, PCT, 'Golpes, pasos, máquinas, aletazos y explosiones.'],
    ['music', 'Música de batalla', 'range', 0, 1, 0.05, PCT, 'La música que suena al pelear contra un jefe.'],
    ['mute', 'Silenciar todo', 'check', 0, 0, 0, 0, 'Corta el sonido por completo sin perder tus volúmenes.'],
    ['muteBlur', 'Silenciar al cambiar de pestaña', 'check', 0, 0, 0, 0, 'Si te vas a otra ventana, el juego se calla hasta que vuelvas.']]],
  img: ['Imagen', 'M3 5h18v14H3z M3 15l5-5 4 4 3-3 6 6 M15 9h.01', 'Cómo se ve el mundo. La vista previa de arriba cambia a la vez que tú.', [
    ['bright', 'Brillo', 'range', 0.6, 1.4, 0.02, PCT, 'Aclara u oscurece el mundo. Útil en cuevas o pantallas oscuras.'],
    ['contrast', 'Contraste', 'range', 0.7, 1.3, 0.02, PCT, 'Diferencia entre zonas claras y oscuras.'],
    ['sat', 'Saturación', 'range', 0, 1.6, 0.05, PCT, 'Intensidad de los colores: 0 % es blanco y negro.']]],
  fx: ['Efectos', 'M12 3l2.5 5.5L20 10l-4.5 3.5L17 20l-5-3-5 3 1.5-6.5L4 10l5.5-1.5z', 'Lo que da vida a la pantalla. Si te mareas o va lento, baja esto.', [
    ['particles', 'Partículas', 'range', 0, 1, 0.05, PCT, 'Chispas, polvo, estelas, fuego… 0 % las quita casi todas.'],
    ['shake', 'Sacudidas de pantalla', 'check', 0, 0, 0, 0, 'La cámara tiembla con golpes fuertes, explosiones y cohetes.'],
    ['shakeAmt', 'Fuerza de las sacudidas', 'range', 0.2, 1.5, 0.05, PCT, 'Cuánto tiembla. Por debajo de 100 % es más suave.'],
    ['wxScreen', 'Clima en pantalla', 'check', 0, 0, 0, 0, 'Lluvia, nieve, niebla y la oscuridad de las cuevas sobre la imagen.'],
    ['illFx', 'Visión borrosa al enfermar', 'check', 0, 0, 0, 0, 'La pantalla se emborrona cuando tu personaje está enfermo.'],
    ['flyClouds', 'Nubes al volar alto', 'check', 0, 0, 0, 0, 'Al subir con alas o cohetes pasan nubes por delante.']]],
  perf: ['Rendimiento', 'M13 2L4 14h7l-1 8 9-12h-7z', 'Elige un perfil y el juego ajusta varios efectos de golpe. Luego puedes retocar cada uno.', [
    ['fps', 'Mostrar FPS', 'check', 0, 0, 0, 0, 'Muestra en una esquina las imágenes por segundo (también con P o F3).']]],
  cam: ['Cámara y ratón', 'M4 8h3l2-3h6l2 3h3v11H4z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'Cómo te sigue la cámara y qué hace la rueda del ratón.', [
    ['camFollow', 'Velocidad de la cámara', 'range', 2, 20, 1, v => v < 5 ? 'Muy suave' : v < 9 ? 'Suave' : v < 14 ? 'Rápida' : 'Instantánea', 'Lo rápido que la cámara alcanza a tu personaje.'],
    ['zoomSens', 'Sensibilidad del zoom', 'range', 0.3, 3, 0.1, v => '×' + (+v).toFixed(1), 'Cuánto se acerca o aleja con cada paso de la rueda.'],
    ['flyZoom', 'Alejar la cámara al volar', 'check', 0, 0, 0, 0, 'Al subir se ve un poco más de mundo. En cuanto usas tú el zoom, manda el tuyo.'],
    ['wheelInvert', 'Invertir la rueda', 'check', 0, 0, 0, 0, 'Cambia el sentido de la rueda del ratón.'],
    ['wheelOld', 'Rueda sola = zoom', 'check', 0, 0, 0, 0, 'Como antes: la rueda hace zoom y Ctrl + rueda cambia de objeto.']]],
  ui: ['Interfaz', 'M4 4h16v16H4z M4 9h16 M9 9v11', 'Tamaño, color y qué se muestra en pantalla.', [
    ['uiScale', 'Tamaño de la interfaz', 'range', 0.8, 1.3, 0.05, PCT, 'Agranda o encoge menús, barras y textos.'],
    ['accent', 'Color de acento', 'seg', Object.entries(ACCENTS).map(([k, [n, c]]) => [k, `<i class="sw" style="--c:${c}"></i>${n}`]), 0, 0, 0, 'El color de botones, barras y resaltados de todos los menús.'],
    ['minimap', 'Minimapa', 'check', 0, 0, 0, 0, 'El mapa pequeño de la esquina (también con N).'],
    ['altHud', 'Barra de altura al volar', 'check', 0, 0, 0, 0, 'La barra vertical que dice a qué altura vas y el combustible.'],
    ['names', 'Nombres de los jugadores', 'check', 0, 0, 0, 0, 'Nombres flotando sobre los demás en multijugador.'],
    ['hover', 'Tarjeta al pasar el cursor', 'check', 0, 0, 0, 0, 'Información de bloques, criaturas y objetos bajo el ratón.']]],
  chat: ['Chat', 'M4 5h16v11H9l-5 4V5z', 'Cómo se ve el chat y cuánto tarda en esconderse.', [
    ['chatSize', 'Tamaño del texto', 'range', 11, 18, 1, v => v + ' px', 'Letra de los mensajes del chat.'],
    ['chatOpacity', 'Fondo del chat', 'range', 0.2, 1, 0.05, PCT, 'Lo opaco que es el fondo detrás de los mensajes.'],
    ['chatFade', 'Se oculta tras', 'range', 4, 60, 1, v => v + ' s', 'Segundos que siguen visibles los mensajes nuevos.']]],
  acc: ['Accesibilidad', 'M12 4a2 2 0 1 0 0 .01 M5 8l7 1 7-1 M12 9v5l-3 6 M12 14l3 6', 'Para que el juego se vea y se juegue cómodo para todos.', [
    ['cb', 'Modo daltónico', 'seg', Object.entries(CB_MODES), 0, 0, 0, 'Ajusta los colores del mundo para distinguir mejor rojos, verdes o azules.'],
    ['hiContrast', 'Interfaz de alto contraste', 'check', 0, 0, 0, 0, 'Paneles más opacos, bordes y textos secundarios más claros.'],
    ['reduceMotion', 'Reducir animaciones de menús', 'check', 0, 0, 0, 0, 'Las ventanas aparecen al instante, sin deslizarse ni brillar.']]],
  game: ['Juego', 'M6 12h4 M8 10v4 M15 11h.01 M18 13h.01 M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v6a5 5 0 0 1-9 3 5 5 0 0 1-9-3z', 'Guardado y avisos. También puedes llevarte tus ajustes a otro navegador.', [
    ['autosave', 'Autoguardado cada', 'range', 10, 300, 10, v => v < 60 ? v + ' s' : (v / 60).toFixed(1).replace('.0', '') + ' min', 'Cada cuánto se guarda solo tu mundo.'],
    ['confirmQuit', 'Preguntar antes de salir', 'check', 0, 0, 0, 0, 'Si tienes un mundo en red abierto, pregunta antes de cerrarlo.']]],
  keys: ['Teclas', 'M3 7h18v10H3z M7 11h.01 M11 11h.01 M15 11h.01 M8 14h8', 'Haz clic en una acción y pulsa la tecla nueva, o haz clic en el teclado.', []],
};
// optSet busca las filas en OPT_UI para escribir el valor: se rellena con las nuevas
for (const k in OPT_UI) delete OPT_UI[k];
for (const k in ST_CATS) OPT_UI[k] = [ST_CATS[k][0], ST_CATS[k][3]];
if (!ST_CATS[PZ.otab]) PZ.otab = 'snd';

const PERF = { low: ['Ligero', 'Para equipos modestos', { particles: 0.3, shake: false, wxScreen: false, illFx: false, flyClouds: false }], mid: ['Equilibrado', 'Bonito y fluido', { particles: 0.65, shake: true, wxScreen: true, illFx: true, flyClouds: true }], high: ['Completo', 'Todos los efectos', { particles: 1, shake: true, wxScreen: true, illFx: true, flyClouds: true }] };
const perfNow = () => Object.keys(PERF).find(p => Object.entries(PERF[p][2]).every(([k, v]) => OPT[k] === v));

// ---------- Teclas ----------
KEY_ACTIONS.push(['Hechizos', SPELL_KEYS.map((k, i) => [k, `Hechizo ${i + 1}`])], ['Otros', [['o', 'Ordenar inventario (con él abierto)'], ['p', 'Mostrar FPS']]]);
KEY_ACTIONS[1][1].push(...'123456789'.split('').map(n => [n, `Hueco ${n} de la barra`]));
const KGROUP_C = { Movimiento: '#7cc4ff', Acciones: '#e0b54c', Ventanas: '#7fd07a', Hechizos: '#b48cff', Otros: '#a39d8f' };
const KB_ROWS = [['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'], ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', 'enter'], [' ', 'arrowleft', 'arrowup', 'arrowdown', 'arrowright']];
const KEY_PRESETS = { def: ['WASD', 'Por defecto', {}], arrows: ['Flechas', 'Moverse con ←↑↓→', { w: 'arrowup', a: 'arrowleft', s: 'arrowdown', d: 'arrowright' }], azerty: ['AZERTY', 'Teclados franceses (ZQSD)', { w: 'z', a: 'q', q: 'a', z: 'w' }] };
const keyOf = o => OPT.keys[o] || o;
function keysPane() {
  const byKey = {}; for (const [g, list] of KEY_ACTIONS) for (const [o, n] of list) (byKey[keyOf(o)] = byKey[keyOf(o)] || []).push([o, n, g]);
  const act = PZ.bind && KEY_ACTIONS.flatMap(x => x[1]).find(a => a[0] === PZ.bind);
  const cur = JSON.stringify(OPT.keys || {}), pre = Object.keys(KEY_PRESETS).find(p => JSON.stringify(KEY_PRESETS[p][2]) === cur);
  let h = `<div class="kbpre">${Object.entries(KEY_PRESETS).map(([k, [n, d]]) => `<button data-kpre="${k}" class="${pre === k ? 'on' : ''}"><b>${n}</b><small>${d}</small></button>`).join('')}</div>`;
  h += `<div class="kbbanner ${act ? 'on' : ''}">${act ? `${svgI('M3 7h18v10H3z M7 11h.01 M11 11h.01 M15 11h.01 M8 14h8', 18)} Pulsa la tecla nueva para <b>${esc(act[1])}</b> · o haz clic en el teclado · <kbd>Esc</kbd> cancela` : 'Pasa el ratón por una acción para ver su tecla. Los colores dicen de qué grupo es cada tecla.'}</div>`;
  h += `<div class="kb ${act ? 'bind' : ''}">${KB_ROWS.map(r => `<div class="kbr">${r.map(k => { const a = byKey[k] || [], c = a.length ? KGROUP_C[a[0][2]] : '', dup = a.length > 1; return `<button class="kk ${k === ' ' ? 'sp' : ''} ${a.length ? 'used' : ''} ${dup ? 'dup' : ''}" data-kb="${esc(k)}" style="${c ? '--kc:' + c : ''}" title="${esc(a.map(x => x[1]).join(' · ') || 'Libre')}"><span>${esc(KEY_NAME(k))}</span>${a.length ? `<small>${esc(a.map(x => x[1].split(' (')[0]).join(' / '))}</small>` : ''}</button>`; }).join('')}</div>`).join('')}</div>`;
  h += `<div class="kleg">${Object.entries(KGROUP_C).map(([g, c]) => `<span><i style="--c:${c}"></i>${g}</span>`).join('')}<span><i class="dupi"></i>Tecla repetida</span></div>`;
  h += KEY_ACTIONS.map(([g, list]) => `<div class="kgrp" style="--kc:${KGROUP_C[g]}"><div class="kgh">${g}</div>${list.map(([o, n]) => { const p = keyOf(o), dup = byKey[p].length > 1, ch = OPT.keys[o] && OPT.keys[o] !== o;
    return `<div class="krow2 srow ${PZ.bind === o ? 'wait' : ''} ${dup ? 'dup' : ''}" data-ka="${esc(p)}" data-s="${esc((n + ' ' + g + ' ' + KEY_NAME(p)).toLowerCase())}"><span>${esc(n)}${dup ? `<small class="bad">También la usa: ${esc(byKey[p].filter(x => x[0] !== o).map(x => x[1]).join(', '))}</small>` : ''}</span><button data-key="${esc(o)}" class="kcap">${PZ.bind === o ? '…' : esc(KEY_NAME(p))}</button><button class="srst ${ch ? '' : 'off'}" data-kreset="${esc(o)}" title="Volver a ${esc(KEY_NAME(o))}">↺</button></div>`; }).join('')}</div>`).join('');
  return h + `<p class="mut small sthint">Esc siempre abre el menú. Ratón: clic izquierdo rompe, pica y ataca · derecho coloca y usa · rueda: objeto · Ctrl + rueda: zoom.</p>`;
}

// ---------- Filas ----------
const isMod = k => JSON.stringify(OPT[k]) !== JSON.stringify(OPT_DEF[k]);
optRow = ([k, n, type, mn, mx, st, f, hint]) => {
  let c;
  if (type === 'check') c = `<label class="tg"><input type="checkbox" data-opt="${k}" ${OPT[k] ? 'checked' : ''}><i></i></label>`;
  else if (type === 'seg') c = `<div class="seg">${mn.map(([v, t]) => `<button data-oset="${k}:${v}" class="${OPT[k] === v ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  else c = `<div class="rng"><input type="range" data-opt="${k}" min="${mn}" max="${mx}" step="${st}" value="${OPT[k]}"><b data-optv="${k}">${optLabel(f, OPT[k])}</b></div>`;
  return `<div class="srow ${type === 'seg' ? 'wide' : ''} ${isMod(k) ? 'mod' : ''}" data-k="${k}" data-s="${esc((n + ' ' + (hint || '')).toLowerCase())}"><div class="sl"><b>${n}</b>${hint ? `<small>${hint}</small>` : ''}</div><div class="sc">${c}</div><button class="srst" data-oreset="${k}" title="Valor de fábrica">↺</button></div>`;
};
function catExtra(k) {
  if (k === 'snd') return `<div class="srow"><div class="sl"><b>Probar sonido</b><small>Suena una nota con tus volúmenes actuales.</small></div><div class="sc"><button data-oact2="tone">${svgI('M8 5l11 7-11 7V5z', 14)} Reproducir</button></div></div>`;
  if (k === 'img') return `<div class="srow"><div class="sl"><b>Pantalla completa</b><small>Ocupa todo el monitor (F11 también sirve).</small></div><div class="sc"><button data-oact="full">${document.fullscreenElement ? 'Salir' : 'Activar'}</button></div></div>`;
  if (k === 'game') return `<div class="srow"><div class="sl"><b>Copiar mis ajustes</b><small>Se copian al portapapeles para pegarlos en otro navegador.</small></div><div class="sc"><button data-oact2="export">Copiar</button><button data-oact2="import">Pegar</button></div></div>` +
    `<div class="srow"><div class="sl"><b>Todo de fábrica</b><small>Vuelve a dejar todos los ajustes como al principio (tus teclas no se tocan).</small></div><div class="sc"><button data-oact="reset" class="danger">Restablecer</button></div></div>`;
  return '';
}
function catTop(k) {
  if (k === 'img') return `<div class="stprev"><canvas id="stPrev" width="320" height="120"></canvas><span>Vista previa</span></div>`;
  if (k === 'perf') { const now = perfNow(); return `<div class="perf">${Object.entries(PERF).map(([p, [n, d, o]], i) => `<button data-perf="${p}" class="${now === p ? 'on' : ''}"><span class="bars">${[0, 1, 2].map(j => `<i class="${j <= i ? 'f' : ''}"></i>`).join('')}</span><b>${n}</b><small>${d}</small><em>Partículas ${Math.round(o.particles * 100)} %${o.wxScreen ? '' : ' · sin clima'}${o.shake ? '' : ' · sin sacudidas'}</em></button>`).join('')}</div>${now ? '' : '<p class="mut small sthint">Ahora mismo tienes una mezcla personalizada.</p>'}`; }
  return '';
}
optsHTML = inPause => {
  const nMod = c => ST_CATS[c][3].filter(r => isMod(r[0])).length + (c === 'keys' ? Object.keys(OPT.keys || {}).length : 0);
  const nav = Object.entries(ST_CATS).map(([k, [n, ic]]) => { const m = nMod(k); return `<button data-otab="${k}" class="${PZ.otab === k ? 'on' : ''}">${svgI(ic, 16)}<span>${n}</span>${m ? `<em title="${m} cambiado${m > 1 ? 's' : ''}">${m}</em>` : ''}</button>`; }).join('');
  const secs = Object.entries(ST_CATS).map(([k, [n, ic, d, rows]]) => `<section class="stsec ${PZ.otab === k ? 'on' : ''}" data-sec="${k}"><header class="sth"><span class="sti">${svgI(ic, 22)}</span><div><h3>${n}</h3><p>${d}</p></div>${rows.length && rows.some(r => isMod(r[0])) ? `<button data-oreset="@${k}" class="ghost">↺ Esta sección</button>` : ''}</header>${catTop(k)}${k === 'keys' ? keysPane() : rows.map(optRow).join('') + catExtra(k)}</section>`).join('');
  const head = inPause ? pzHead('Ajustes', 'Se guardan en este navegador y valen para todos tus mundos') : `<div class="trow"><h2>Ajustes</h2><button data-mm="main">← Menú principal</button></div>`;
  return head + `<div class="st"><aside class="stnav"><label class="stq">${svgI('M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M21 21l-5-5', 15)}<input id="stQ" type="search" placeholder="Buscar ajuste…" autocomplete="off"></label>${nav}</aside><div class="stmain" id="stMain">${secs}<div class="stnone">Ningún ajuste coincide. Prueba con otra palabra (por ejemplo «zoom», «color», «chat»).</div></div></div>`;
};
// Mientras esperas una tecla, el traductor de teclas se apaga para leer la tecla física de verdad
{ const r0 = rerenderOpts; rerenderOpts = () => { if (PZ.bind) KMAP = new Map(); else keymapBuild(); const m = $('stMain'), top = m ? m.scrollTop : 0, q = ($('stQ') || {}).value; r0(); stAfter(top, q); }; }
{ const p0 = pzRender; pzRender = () => { p0(); if (ui.open === 'pause' && PZ.pane === 'opts') stAfter(); }; }
function stAfter(top, q) {
  const m = $('stMain'); if (!m) return; if (top) m.scrollTop = top;
  if (q) { $('stQ').value = q; stSearch(q); }
  const pv = $('stPrev'), c = $('c'); if (pv && c && c.width) { try { pv.getContext('2d').drawImage(c, (c.width - c.width * 0.5) / 2, (c.height - c.height * 0.375) / 2, c.width * 0.5, c.height * 0.375, 0, 0, 320, 120); } catch (e) { } pv.style.filter = c.style.filter; }
}
function stSearch(q) {
  const m = $('stMain'); if (!m) return; q = q.trim().toLowerCase(); m.classList.toggle('q', !!q); let any = 0;
  m.querySelectorAll('.stsec').forEach(s => { let n = 0; s.querySelectorAll('.srow').forEach(r => { const ok = !q || (r.dataset.s || r.textContent.toLowerCase()).includes(q); r.hidden = !ok; n += ok; }); s.classList.toggle('none', !n); any += n; });
  m.classList.toggle('empty', !!q && !any);
}
document.addEventListener('input', e => { if (e.target.id === 'stQ') stSearch(e.target.value); });
// Tras cada cambio: punto de «modificado», contador de la categoría y vista previa
const stMark = k => { const r = document.querySelector(`.srow[data-k="${k}"]`); if (r) r.classList.toggle('mod', isMod(k)); const pv = $('stPrev'); if (pv) pv.style.filter = $('c').style.filter; };
{ const s0 = optSet; let tick = 0; optSet = (k, v) => { s0(k, v); stMark(k); if ((k === 'sfx' || k === 'master') && performance.now() - tick > 120) { tick = performance.now(); try { tone(660, 0.06, 'sine', 0.05); } catch (e) { } } }; }
// ---------- Clics nuevos ----------
const stAssign = k => { if (k === PZ.bind) delete OPT.keys[PZ.bind]; else OPT.keys[PZ.bind] = k; optSave(); toast(`Tecla asignada: ${KEY_NAME(k)}`); PZ.bind = null; rerenderOpts(); };
document.addEventListener('click', e => {
  const t = e.target.closest('[data-oset],[data-oreset],[data-kreset],[data-kb],[data-kpre],[data-perf],[data-oact2]'); if (!t) return; const d = t.dataset;
  if (d.oset) { const [k, v] = d.oset.split(':'); optSet(k, v); rerenderOpts(); return; }
  if (d.oreset) { const ks = d.oreset[0] === '@' ? ST_CATS[d.oreset.slice(1)][3].map(r => r[0]) : [d.oreset]; for (const k of ks) OPT[k] = OPT_DEF[k]; optSave(); optApply(); rerenderOpts(); toast(ks.length > 1 ? 'Sección restablecida' : 'Valor de fábrica'); return; }
  if (d.kreset) { delete OPT.keys[d.kreset]; optSave(); rerenderOpts(); return; }
  if (d.kb) { if (PZ.bind) return stAssign(d.kb);
    const r = document.querySelector(`.krow2[data-ka="${CSS.escape(d.kb)}"]`); if (r) { r.scrollIntoView({ block: 'center', behavior: 'smooth' }); r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash'); } else toast(`${KEY_NAME(d.kb)}: libre`); return; }
  if (d.kpre) { OPT.keys = { ...KEY_PRESETS[d.kpre][2] }; optSave(); rerenderOpts(); toast('Teclas: ' + KEY_PRESETS[d.kpre][0]); return; }
  if (d.perf) { Object.assign(OPT, PERF[d.perf][2]); optSave(); optApply(); rerenderOpts(); toast('Perfil ' + PERF[d.perf][0]); return; }
  if (d.oact2 === 'tone') { tone(523, 0.14, 'sine', 0.07); tone(659, 0.14, 'sine', 0.07, 0, 0.12); tone(784, 0.2, 'sine', 0.07, 0, 0.24); }
  if (d.oact2 === 'export') { const s = JSON.stringify(OPT); (navigator.clipboard ? navigator.clipboard.writeText(s) : Promise.reject()).then(() => toast('Ajustes copiados'), () => prompt('Copia este texto:', s)); }
  if (d.oact2 === 'import') { const s = prompt('Pega aquí tus ajustes copiados:'); if (s) { try { const o = JSON.parse(s); Object.assign(OPT, o, { keys: { ...(o.keys || {}) } }); optSave(); optApply(); rerenderOpts(); toast('Ajustes cargados'); } catch (er) { toastErr('Ese texto no son ajustes válidos'); } } }
});
// Al pasar por una acción, se ilumina su tecla en el teclado
document.addEventListener('mouseover', e => { const r = e.target.closest && e.target.closest('.krow2'); document.querySelectorAll('.kk.hl').forEach(k => k.classList.remove('hl')); if (r) { const k = document.querySelector(`.kk[data-kb="${CSS.escape(r.dataset.ka)}"]`); if (k) k.classList.add('hl'); } });
optApply();
