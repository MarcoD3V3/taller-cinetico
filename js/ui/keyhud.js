'use strict';
// =====================================================================================
//  Panel de teclas (abajo a la derecha): enseña lo que puedes hacer AHORA según lo que
//  llevas en la mano y lo que señalas (colocar, picar, atacar, abrir, girar…), con
//  teclas dibujadas y el ratón con el botón que toca. Las teclas se iluminan al pulsarlas
//  y las acciones de tecla se pueden pulsar con el ratón. Se pliega (solo lo del momento)
//  o se despliega (todas las teclas por grupos). Respeta las teclas cambiadas en Opciones.
// =====================================================================================
const KH = { open: false, sig: '', el: null };
try { KH.open = localStorage.getItem('tc-keyhud') === '1'; KH.hide = localStorage.getItem('tc-keyhud-off') === '1'; } catch (e) { }
const khKey = orig => { const p = (OPT.keys && OPT.keys[orig]) || orig; return KEY_NAME(p); };
const khCap = (k, wide) => `<kbd class="khk${wide ? ' w' : ''}" data-khk="${esc(String(k).toLowerCase())}">${esc(k)}</kbd>`;
// Ratón dibujado: L (izquierdo), R (derecho), W (rueda)
const khMouse = b => `<svg class="khm" viewBox="0 0 16 22"><rect x="1" y="1" width="14" height="20" rx="7" /><path d="M8 1v8M1 9h14" /><rect class="${b === 'L' ? 'on' : ''}" x="1.6" y="1.6" width="5.8" height="7" rx="3" /><rect class="${b === 'R' ? 'on' : ''}" x="8.6" y="1.6" width="5.8" height="7" rx="3" /><rect class="${b === 'W' ? 'on' : ''}" x="7" y="3" width="2" height="4" rx="1" /></svg>`;
// Una fila: [teclas o ratón], texto, tecla original (para pulsar con el ratón)
const khRow = (keys, t, press) => `<div class="khr${press ? ' act' : ''}"${press ? ` data-khp="${press}"` : ''}><span class="khks">${keys}</span><span class="kht">${t}</span></div>`;
const K = o => khCap(khKey(o), o === ' ');
function khContext() {
  const rows = [], id = heldId(), it = id && ITEMS[id], sel = selectedBlock(), b = at(mouse.tx, mouse.ty), roof = typeof roofHeld === 'function' && roofHeld();
  if (roof) { rows.push(khRow(khMouse('R'), 'Poner tejado'), khRow(khCap('Shift', 1) + khMouse('R'), 'Cubrir la habitación'), khRow(khMouse('L'), 'Quitar tejado')); }
  else if (sel) { rows.push(khRow(khMouse('R'), 'Colocar ' + esc(ITEMS[sel].n)), khRow(K('r'), 'Girar', 'r'), khRow(khMouse('L'), b ? 'Romper ' + esc(BD[b.type].n) : 'Picar el suelo')); }
  else if (heldRod()) rows.push(khRow(khMouse('L'), 'Lanzar / recoger'), khRow(khMouse('R'), 'Soltar el sedal'));
  else if (it && it.weapon) rows.push(khRow(khMouse('L'), 'Atacar'), khRow(khCap('Shift', 1) + K(' '), 'Esquivar'));
  else if (TOOLS[id] && TOOLS[id].kind !== 'util') rows.push(khRow(khMouse('L'), 'Mantén: ' + ({ pick: 'picar', axe: 'talar', shovel: 'cavar', hammer: 'romper', sickle: 'segar', paxel: 'picar y talar', excav: 'cavar en área' }[TOOLS[id].kind] || 'usar')));
  else if (it && it.seed) rows.push(khRow(khMouse('R'), 'Sembrar en tierra arada'));
  else if (typeof FTOOLS !== 'undefined' && FTOOLS[id]) rows.push(khRow(khMouse('R'), 'Usar en el huerto'));
  else rows.push(khRow(khMouse('L'), 'Picar, talar, recoger'));
  if (it && (it.food || it.med || (it.use && it.use.buff))) rows.push(khRow(K('f'), 'Tomar ' + esc(it.n), 'f'));
  if (b && BD[b.type]) { rows.push(khRow(K('f') + '<i class="khor">o</i>' + khMouse('R'), (BD[b.type].door ? 'Abrir / cerrar' : 'Usar ' + esc(BD[b.type].n)), 'f')); if (BD[b.type].cfg || BD[b.type].rsable) rows.push(khRow(K('t'), 'Ajustar', 't')); if (BD[b.type].dir && !sel) rows.push(khRow(K('r'), 'Girar el bloque', 'r')); }
  if (typeof downShaftNear === 'function' && S && downShaftNear(Math.floor(S.player.x / T), Math.floor((S.player.y + 5) / T))) rows.push(khRow(K(' '), 'Bajar por el pozo'));
  rows.push(khRow(khMouse('W'), 'Cambiar objeto'), khRow(khCap('Ctrl', 1) + khMouse('W'), 'Zoom'));
  return rows.join('');
}
const KH_ALL = [
  ['Moverse', [[['w', 'a', 's', 'd'], 'Andar'], [[' '], 'Saltar'], [['shift', ' '], 'Esquivar']]],
  ['Acciones', [[['f'], 'Usar / abrir'], [['r'], 'Girar'], [['t'], 'Ajustar bloque'], [['x'], 'Encender / apagar'], [['q'], 'Mano vacía'], [['l'], 'Soltar objeto']]],
  ['Ventanas', [[['e'], 'Inventario'], [['c'], 'Personaje'], [['b'], 'Recetario'], [['m'], 'Mapa'], [['j'], 'Crónicas'], [['h'], 'Ayuda'], [['enter'], 'Chat']]],
];
function khAll() {
  return KH_ALL.map(([g, list]) => `<div class="khg"><small>${g}</small>${list.map(([ks, t]) => khRow(ks.map(k => k === 'shift' ? khCap('Shift', 1) : K(k)).join(''), t, ks.length === 1 && ks[0] !== ' ' ? ks[0] : '')).join('')}</div>`).join('');
}
function khRender() {
  if (!KH.el) { KH.el = document.createElement('div'); KH.el.id = 'keyHud'; document.body.appendChild(KH.el); }
  const show = S && !ui.open && !KH.hide && typeof survOn === 'function'; KH.el.hidden = !show; if (!show) return;
  const body = KH.open ? khAll() : khContext(), sig = KH.open + body; if (sig === KH.sig) return; KH.sig = sig;
  KH.el.innerHTML = `<header><b>${KH.open ? '⌨ Todas las teclas' : '⌨ Ahora puedes'}</b><button data-kh="tog" title="${KH.open ? 'Ver solo lo del momento' : 'Ver todas las teclas'}">${KH.open ? '−' : '+'}</button><button data-kh="off" title="Ocultar (vuelve con F1)">✕</button></header><div class="khb">${body}</div>`;
  KH.el.classList.toggle('big', KH.open);
}
setInterval(khRender, 200);
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('#keyHud [data-kh]'); if (t) { if (t.dataset.kh === 'tog') KH.open = !KH.open; else { KH.hide = true; toast('Panel de teclas oculto: F1 para volver a verlo'); } try { localStorage.setItem('tc-keyhud', KH.open ? '1' : '0'); localStorage.setItem('tc-keyhud-off', KH.hide ? '1' : '0'); } catch (er) { } KH.sig = ''; khRender(); return; }
  const r = e.target.closest && e.target.closest('#keyHud [data-khp]'); if (r) { const k = r.dataset.khp, ev = { key: k, bubbles: true, cancelable: true }; dispatchEvent(new KeyboardEvent('keydown', ev)); setTimeout(() => dispatchEvent(new KeyboardEvent('keyup', ev)), 60); r.classList.add('flash'); setTimeout(() => r.classList.remove('flash'), 300); }
});
// Las teclas se iluminan al pulsarlas (y F1 enseña u oculta el panel)
const khLight = (k, on) => { if (!KH.el) return; KH.el.querySelectorAll(`[data-khk="${CSS.escape(k)}"]`).forEach(x => x.classList.toggle('down', on)); };
addEventListener('keydown', e => { if (e.key === 'F1') { e.preventDefault(); KH.hide = !KH.hide; try { localStorage.setItem('tc-keyhud-off', KH.hide ? '1' : '0'); } catch (er) { } KH.sig = ''; khRender(); return; } khLight(e.key === ' ' ? 'espacio' : e.key.toLowerCase(), true); if (e.key === 'Shift') khLight('shift', true); if (e.key === 'Control') khLight('ctrl', true); }, true);
addEventListener('keyup', e => { khLight(e.key === ' ' ? 'espacio' : e.key.toLowerCase(), false); if (e.key === 'Shift') khLight('shift', false); if (e.key === 'Control') khLight('ctrl', false); }, true);
addEventListener('mousedown', e => { if (!KH.el) return; KH.el.querySelectorAll('.khm rect.on').forEach(r => r.closest('.khr') && r.closest('.khr').classList.toggle('pulse', true)); setTimeout(() => KH.el && KH.el.querySelectorAll('.khr.pulse').forEach(x => x.classList.remove('pulse')), 180); });
