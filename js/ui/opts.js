'use strict';
// =====================================================================================
//  Opciones del juego (de este navegador, valen para todos los mundos) y teclas a tu gusto.
//  Se cargan antes del chat para que el cambio de teclas llegue a todo el juego.
// =====================================================================================
const OPT_DEF = {
  master: 1, sfx: 1, music: 0.8, mute: false,
  bright: 1, contrast: 1, particles: 1, shake: true, wxScreen: true, illFx: true, uiScale: 1, fps: false, minimap: true, names: true, hover: true,
  camFollow: 8, zoomSens: 1, wheelInvert: false, wheelHotbar: false, wheelOld: false,
  autosave: 30, chatSize: 13, chatOpacity: 0.72, chatFade: 12, confirmQuit: true,
  keys: {},
};
const OPT = { ...OPT_DEF };
try { const o = JSON.parse(localStorage.getItem('tc-opts')); if (o) Object.assign(OPT, o, { keys: { ...(o.keys || {}) } }); } catch (e) { }
function optSave() { try { localStorage.setItem('tc-opts', JSON.stringify(OPT)); } catch (e) { } }
// ---------- Teclas ----------
// [tecla original, nombre]. Lo que pulses se traduce a la tecla original antes de que el juego lo vea.
const KEY_ACTIONS = [
  ['Movimiento', [['w', 'Arriba'], ['a', 'Izquierda'], ['s', 'Abajo'], ['d', 'Derecha'], [' ', 'Saltar (Shift+: esquivar)']]],
  ['Acciones', [['f', 'Usar / abrir / interactuar'], ['r', 'Girar bloque'], ['t', 'Ajustar bloque'], ['x', 'Encender / apagar bloque'], ['g', 'Modo redstone del bloque'], ['q', 'Mano vacía']]],
  ['Ventanas', [['e', 'Inventario'], ['b', 'Recetario'], ['m', 'Mapa'], ['c', 'Personaje'], ['j', 'Crónicas'], ['h', 'Ayuda'], ['u', 'Multijugador'], ['enter', 'Chat'], ['n', 'Minimapa']]],
];
const KEY_NAME = k => ({ ' ': 'Espacio', enter: 'Intro', escape: 'Esc', arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→', backspace: 'Retroceso', tab: 'Tab', control: 'Ctrl', alt: 'Alt' }[k] || k.toUpperCase());
const KEY_EVT = k => ({ ' ': ' ', enter: 'Enter' }[k] || k);
// Cada acción tiene un id propio (su tecla original, o «spell1»… para los hechizos), así dos acciones que
// compartían tecla se pueden separar. KMAP: tecla física → ids que dispara (vacío = tecla bloqueada).
const actDef = id => /^spell[1-8]$/.test(id) ? SPELL_KEYS[+id[5] - 1] : id;
const actKey = id => (OPT.keys || {})[id] || actDef(id);
let KMAP = new Map();
function keymapBuild() {
  KMAP = new Map(); const ids = new Set(KEY_ACTIONS.flatMap(g => g[1].map(a => a[0]))); if (typeof SPELL_KEYS !== 'undefined') for (let i = 1; i <= SPELL_KEYS.length; i++) ids.add('spell' + i);
  for (const id of ids) { const p = actKey(id); if (!KMAP.has(p)) KMAP.set(p, []); KMAP.get(p).push(id); }
  for (const id of ids) { const d = actDef(id); if (!KMAP.has(d)) KMAP.set(d, []); } // tecla original que ya no usa nadie: bloqueada
  // Las teclas que solo hacen lo de siempre pasan tal cual
  for (const [p, l] of [...KMAP]) if (l.length === 1 && l[0] === p) KMAP.delete(p);
}
keymapBuild();
const _typing = e => { const t = e.target, tg = t && t.tagName; return tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' || (t && t.isContentEditable); };
for (const type of ['keydown', 'keyup']) addEventListener(type, e => {
  if (e.__tc || _typing(e) || e.ctrlKey || e.metaKey) return;
  const k = e.key.toLowerCase(); if (!KMAP.has(k)) return;
  e.stopImmediatePropagation(); e.preventDefault();
  for (const to of KMAP.get(k)) { const ev = new KeyboardEvent(type, { key: KEY_EVT(to), shiftKey: e.shiftKey, altKey: e.altKey, repeat: e.repeat, bubbles: true, cancelable: true }); ev.__tc = 1; dispatchEvent(ev); }
}, true);
// ---------- Aplicar ----------
// Filtro del canvas del mundo: solo si hace algo. Un filtro CSS (aunque sea «brightness(1)») obliga a la
// tarjeta gráfica a reprocesar la pantalla entera en cada fotograma.
function cvFilter() { const c = document.getElementById('c'); if (!c) return; const f = []; if (c._ill) f.push(c._ill); if (+OPT.bright !== 1) f.push('brightness(' + OPT.bright + ')'); if (+OPT.contrast !== 1) f.push('contrast(' + OPT.contrast + ')'); const s = f.join(' ') || 'none'; if (c.style.filter !== s) c.style.filter = s; }
function optApply() {
  const r = document.documentElement.style; cvFilter();
  r.setProperty('--br', OPT.bright); r.setProperty('--ct', OPT.contrast); r.setProperty('--ui', OPT.uiScale);
  r.setProperty('--chatSize', OPT.chatSize + 'px'); r.setProperty('--chatBg', OPT.chatOpacity);
  if (typeof ui !== 'undefined') ui.fps = OPT.fps; const f = document.getElementById('fps'); if (f) f.hidden = !OPT.fps;
  const mi = document.getElementById('mini'); if (mi) mi.hidden = !OPT.minimap;
  if (typeof MG !== 'undefined' && MG) MG.gain.value = OPT.mute ? 0 : 0.5 * OPT.master;
}
