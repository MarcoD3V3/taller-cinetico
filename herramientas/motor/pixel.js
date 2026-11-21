'use strict';
// =====================================================================================
//  Editor de píxeles del motor: pintar sobre un sprite o crear uno nuevo.
//  Herramientas: lápiz, borrador, cubo, cuentagotas, línea, rectángulo (vacío y relleno), mover.
//  Pincel de 1 a 4, simetría, espejo, cambiar tamaño del lienzo (anclado abajo al centro, donde va la base),
//  recortar a lo dibujado, paleta del propio sprite + colores del juego, deshacer/rehacer.
//  Guardar: reemplaza el archivo (el anterior va a la papelera del motor) o lo guarda como sprite nuevo.
// =====================================================================================
const PX = { on: false, w: 32, h: 32, d: null, tool: 'lapiz', size: 1, sym: false, col: [70, 140, 50, 255], undo: [], redo: [], zoom: 12, grid: true,
  key: null, nuevo: null, drag: null, hover: null, prev: null, recent: [] };
// colores del juego (hojas, troncos, tierra, piedra, agua, flores) para empezar
const PX_PAL = ['#0d1405', '#10430e', '#1a740a', '#379211', '#5fbc19', '#8dea27', '#d8e86a', '#3e7620', '#626642', '#8d915f', '#a8ac72',
  '#15110c', '#33261f', '#443723', '#6a4426', '#8a5e36', '#b8892e', '#e0b54c', '#e8d48e', '#c0a850', '#2a2b2e', '#55585c', '#8a8d90', '#c8ccd0',
  '#f4f4f4', '#1f3c6a', '#2a62a4', '#6ab8ff', '#7a2a2a', '#c8463a', '#f4a6cc', '#e86ad0', '#7a6ae8', '#f4e04a', '#f49a3a', '#000000'];
const pxHex = c => '#' + c.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('');
const pxRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };

function pxAbrir(key, nuevo) {
  PX.key = key; PX.nuevo = nuevo || null; PX.undo = []; PX.redo = []; PX.drag = null;
  if (key) { const im = imgDe(key); PX.w = im.width; PX.h = im.height; const c = document.createElement('canvas'); c.width = PX.w; c.height = PX.h; const x = c.getContext('2d'); x.drawImage(im, 0, 0); PX.d = x.getImageData(0, 0, PX.w, PX.h).data; }
  else { PX.w = nuevo.w; PX.h = nuevo.h; PX.d = new Uint8ClampedArray(PX.w * PX.h * 4); }
  PX.zoom = Math.max(2, Math.min(24, Math.floor(Math.min(560 / PX.w, 520 / PX.h))));
  $('#pxTitulo').textContent = key ? 'Editar ' + key : `Nuevo sprite · ${nuevo.carpeta}/${nuevo.nombre}`;
  $('#pxW').value = PX.w; $('#pxH').value = PX.h; $('#pxGuardar').hidden = !key; $('#pxComo').textContent = key ? 'Guardar como nuevo…' : 'Guardar sprite';
  $('#mPintar').hidden = false; PX.on = true; pxPaleta(); pxHerr(PX.tool); pxDibujar();
}
function pxCerrar(forzar) { if (!forzar && PX.undo.length && !confirm('¿Cerrar sin guardar lo pintado?')) return; $('#mPintar').hidden = true; PX.on = false; }
function pxSnap() { PX.undo.push({ w: PX.w, h: PX.h, d: new Uint8ClampedArray(PX.d) }); if (PX.undo.length > 100) PX.undo.shift(); PX.redo = []; }
function pxUndo() { const s = PX.undo.pop(); if (!s) return; PX.redo.push({ w: PX.w, h: PX.h, d: new Uint8ClampedArray(PX.d) }); PX.w = s.w; PX.h = s.h; PX.d = s.d; $('#pxW').value = PX.w; $('#pxH').value = PX.h; pxDibujar(); }
function pxRedo() { const s = PX.redo.pop(); if (!s) return; PX.undo.push({ w: PX.w, h: PX.h, d: new Uint8ClampedArray(PX.d) }); PX.w = s.w; PX.h = s.h; PX.d = s.d; $('#pxW').value = PX.w; $('#pxH').value = PX.h; pxDibujar(); }
const pxIn = (x, y) => x >= 0 && y >= 0 && x < PX.w && y < PX.h;
const pxGet = (x, y) => { const i = (y * PX.w + x) * 4; return [PX.d[i], PX.d[i + 1], PX.d[i + 2], PX.d[i + 3]]; };
function pxSet(x, y, c, d = PX.d) { const pts = [[x, y]]; if (PX.sym) pts.push([PX.w - 1 - x, y]);
  for (const [px, py] of pts) for (let dy = 0; dy < PX.size; dy++) for (let dx = 0; dx < PX.size; dx++) { const X = px + dx - (PX.size >> 1), Y = py + dy - (PX.size >> 1); if (!pxIn(X, Y)) continue; const i = (Y * PX.w + X) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = c[3]; } }
function pxLinea(x0, y0, x1, y1, c, d) { let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
  for (;;) { pxSet(x0, y0, c, d); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } }
function pxRect(x0, y0, x1, y1, c, d, lleno) { const a = Math.min(x0, x1), b = Math.max(x0, x1), u = Math.min(y0, y1), v = Math.max(y0, y1);
  for (let y = u; y <= v; y++) for (let x = a; x <= b; x++) if (lleno || x === a || x === b || y === u || y === v) pxSet(x, y, c, d); }
function pxCubo(x, y, c) { const t = pxGet(x, y), same = q => q[0] === t[0] && q[1] === t[1] && q[2] === t[2] && q[3] === t[3]; if (same(c)) return;
  const st2 = [[x, y]], seen = new Uint8Array(PX.w * PX.h), sz = PX.size, sym = PX.sym; PX.size = 1; PX.sym = false;
  while (st2.length) { const [a, b] = st2.pop(); if (!pxIn(a, b) || seen[b * PX.w + a] || !same(pxGet(a, b))) continue; seen[b * PX.w + a] = 1; pxSet(a, b, c); st2.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]); }
  PX.size = sz; PX.sym = sym; }
const BORRA = [0, 0, 0, 0];
// ---------- vista ----------
function pxDibujar() {
  const cv = $('#pxLienzo'), z = PX.zoom, W2 = PX.w * z, H2 = PX.h * z; cv.width = W2; cv.height = H2; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  for (let y = 0; y < PX.h; y++) for (let x = 0; x < PX.w; x++) { c.fillStyle = (x + y) & 1 ? '#2a2b2e' : '#222326'; c.fillRect(x * z, y * z, z, z); }
  const d = PX.prev || PX.d, o = document.createElement('canvas'); o.width = PX.w; o.height = PX.h; o.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(d), PX.w, PX.h), 0, 0); c.drawImage(o, 0, 0, W2, H2);
  if (PX.grid && z >= 6) { c.strokeStyle = '#ffffff12'; c.beginPath(); for (let x = 0; x <= PX.w; x++) { c.moveTo(x * z + .5, 0); c.lineTo(x * z + .5, H2); } for (let y = 0; y <= PX.h; y++) { c.moveTo(0, y * z + .5); c.lineTo(W2, y * z + .5); } c.stroke(); }
  if (PX.sym) { c.strokeStyle = '#3bc8ff88'; c.beginPath(); c.moveTo(W2 / 2, 0); c.lineTo(W2 / 2, H2); c.stroke(); }
  if (PX.hover) { c.strokeStyle = '#e0b54c'; const s = PX.size, x = PX.hover[0] - (s >> 1), y = PX.hover[1] - (s >> 1); c.strokeRect(x * z + .5, y * z + .5, s * z, s * z); }
  // vista previa a tamaño real y a la escala del juego
  const p = $('#pxPrev'), k = Math.max(1, Math.round(1.6 * 2)); p.width = PX.w * k; p.height = PX.h * k; const pc = p.getContext('2d'); pc.imageSmoothingEnabled = false; pc.fillStyle = '#3f6b35'; pc.fillRect(0, 0, p.width, p.height); pc.drawImage(o, 0, 0, p.width, p.height);
  $('#pxInfo').textContent = `${PX.w}×${PX.h} px${PX.hover ? ` · ${PX.hover[0]}, ${PX.hover[1]}` : ''}`;
  $('#pxDeshacer').disabled = !PX.undo.length; $('#pxRehacer').disabled = !PX.redo.length;
}
function pxPaleta() {
  const usados = new Map(); for (let i = 0; i < PX.d.length; i += 4) if (PX.d[i + 3] > 0) { const h = pxHex([PX.d[i], PX.d[i + 1], PX.d[i + 2]]); usados.set(h, (usados.get(h) || 0) + 1); }
  const top = [...usados.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(e => e[0]);
  const fila = (L, id) => { const box = $(id); box.innerHTML = ''; for (const h of L) { const b = document.createElement('button'); b.className = 'pxc'; b.style.background = h; b.title = h; b.onclick = () => pxColor(pxRgb(h).concat(255)); box.appendChild(b); } };
  fila(top, '#pxUsados'); fila(PX_PAL, '#pxJuego'); fila(PX.recent, '#pxRecientes');
}
function pxColor(c) { PX.col = c; $('#pxColor').value = pxHex(c); $('#pxAlfa').value = c[3]; const h = pxHex(c); PX.recent = [h, ...PX.recent.filter(x => x !== h)].slice(0, 12); pxPaleta(); $('#pxActual').style.background = `rgba(${c[0]},${c[1]},${c[2]},${c[3] / 255})`; }
function pxHerr(t) { PX.tool = t; $$('#pxHerr [data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === t)); }
// ---------- ratón ----------
function pxPos(e) { const r = $('#pxLienzo').getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / PX.zoom), Math.floor((e.clientY - r.top) / PX.zoom)]; }
function pxDown(e) {
  if (!PX.on) return; e.preventDefault(); const [x, y] = pxPos(e), t = e.button === 2 ? 'borrador' : PX.tool; if (!pxIn(x, y) && t !== 'mover') return;
  if (t === 'gotas') { const c = pxGet(x, y); if (c[3]) pxColor(c); return; }
  pxSnap();
  if (t === 'cubo') { pxCubo(x, y, PX.col); pxDibujar(); return; }
  PX.drag = { t, x0: x, y0: y, lx: x, ly: y, base: new Uint8ClampedArray(PX.d) };
  if (t === 'lapiz' || t === 'borrador') { pxSet(x, y, t === 'borrador' ? BORRA : PX.col); pxDibujar(); }
}
function pxMove(e) {
  if (!PX.on) return; const [x, y] = pxPos(e); PX.hover = pxIn(x, y) ? [x, y] : null; const d = PX.drag;
  if (!d) { pxDibujar(); return; }
  if (d.t === 'lapiz' || d.t === 'borrador') { pxLinea(d.lx, d.ly, x, y, d.t === 'borrador' ? BORRA : PX.col); d.lx = x; d.ly = y; }
  else if (d.t === 'linea' || d.t === 'rect' || d.t === 'rectl') { const tmp = new Uint8ClampedArray(d.base); if (d.t === 'linea') pxLinea(d.x0, d.y0, x, y, PX.col, tmp); else pxRect(d.x0, d.y0, x, y, PX.col, tmp, d.t === 'rectl'); PX.d = tmp; }
  else if (d.t === 'mover') { const ox = x - d.x0, oy = y - d.y0, out = new Uint8ClampedArray(d.base.length);
    for (let yy = 0; yy < PX.h; yy++) for (let xx = 0; xx < PX.w; xx++) { const sx = xx - ox, sy = yy - oy; if (!pxIn(sx, sy)) continue; const i = (yy * PX.w + xx) * 4, j = (sy * PX.w + sx) * 4; out[i] = d.base[j]; out[i + 1] = d.base[j + 1]; out[i + 2] = d.base[j + 2]; out[i + 3] = d.base[j + 3]; } PX.d = out; }
  pxDibujar();
}
function pxUp() { if (PX.drag) { PX.drag = null; pxPaleta(); pxDibujar(); } }
// ---------- lienzo ----------
function pxEspejo(hor) { pxSnap(); const o = new Uint8ClampedArray(PX.d.length); for (let y = 0; y < PX.h; y++) for (let x = 0; x < PX.w; x++) { const sx = hor ? PX.w - 1 - x : x, sy = hor ? y : PX.h - 1 - y, i = (y * PX.w + x) * 4, j = (sy * PX.w + sx) * 4; for (let k = 0; k < 4; k++) o[i + k] = PX.d[j + k]; } PX.d = o; pxDibujar(); }
function pxTam(w, h) { // cambia el lienzo sin escalar: anclado abajo y al centro (la base del sprite no se mueve)
  w = Math.max(1, Math.min(256, w | 0)); h = Math.max(1, Math.min(256, h | 0)); if (w === PX.w && h === PX.h) return; pxSnap();
  const o = new Uint8ClampedArray(w * h * 4), ox = Math.floor((w - PX.w) / 2), oy = h - PX.h;
  for (let y = 0; y < PX.h; y++) for (let x = 0; x < PX.w; x++) { const X = x + ox, Y = y + oy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const i = (Y * w + X) * 4, j = (y * PX.w + x) * 4; for (let k = 0; k < 4; k++) o[i + k] = PX.d[j + k]; }
  PX.w = w; PX.h = h; PX.d = o; $('#pxW').value = w; $('#pxH').value = h; PX.zoom = Math.max(2, Math.min(24, Math.floor(Math.min(560 / w, 520 / h)))); pxDibujar();
}
function pxRecortar() { let x0 = PX.w, y0 = PX.h, x1 = -1, y1 = -1; for (let y = 0; y < PX.h; y++) for (let x = 0; x < PX.w; x++) if (PX.d[(y * PX.w + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  if (x1 < 0) return toast('No hay nada dibujado', true); pxSnap(); const w = x1 - x0 + 1, h = y1 - y0 + 1, o = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, j = ((y + y0) * PX.w + x + x0) * 4; for (let k = 0; k < 4; k++) o[i + k] = PX.d[j + k]; }
  PX.w = w; PX.h = h; PX.d = o; $('#pxW').value = w; $('#pxH').value = h; pxDibujar(); }
// ---------- guardar ----------
function pxPng() { const c = document.createElement('canvas'); c.width = PX.w; c.height = PX.h; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(PX.d), PX.w, PX.h), 0, 0); return c.toDataURL('image/png'); }
async function pxGuardar() {
  if (!PX.key) return; if (!confirm(`¿Reemplazar ${PX.key} en el juego?\nLa versión anterior se guarda en la papelera del motor.`)) return;
  const r = await fetch('/api/reemplazar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: PX.key, datos: pxPng() }) }); const j = await r.json().catch(() => ({}));
  if (!r.ok) return toast('No se pudo guardar: ' + (j.error || r.status), true);
  const k = PX.key; pxCerrar(true); toast('Sprite guardado. Cargando…'); await cargarJuego(); lista(); elegir(k);
}
async function pxComo() {
  let carpeta, nombre;
  if (PX.nuevo) ({ carpeta, nombre } = PX.nuevo);
  else { carpeta = PX.key.split('/')[0]; nombre = prompt('Nombre del nuevo sprite (minúsculas, números y _). Se guarda como nombre_N.png:', tipoDe(PX.key)); if (!nombre) return; nombre = nombre.trim().toLowerCase(); }
  if (!/^[a-z0-9_]{1,40}$/.test(nombre)) return toast('Nombre: solo minúsculas, números y _', true);
  const r = await fetch('/api/subir', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ carpeta, nombre, datos: pxPng() }) }); const j = await r.json().catch(() => ({}));
  if (!r.ok) return toast('No se pudo guardar: ' + (j.error || r.status), true);
  pxCerrar(true); toast('Sprite nuevo guardado. Cargando…'); await cargarJuego(); lista(); if (J('CSPR').sets.has(j.key)) elegir(j.key);
}
// ---------- nuevo sprite ----------
function pxNuevoDialogo() {
  const w = W(), tipos = [...new Set(J('GI').filter(g => g && g.tree).map(g => J('_cslug')(g.n)))].sort();
  $('#nTipo').innerHTML = tipos.map(t => `<option value="${t}">${t}</option>`).join('');
  const cats = [...new Set(claves().filter(k => !isTree(k)).map(tipoDe))].sort(); $('#dlCats2').innerHTML = cats.map(c => `<option value="${c}">`).join('');
  $('#mNuevo').hidden = false; void w;
}
function pxNuevoOk() {
  const arbol = $$('[name=nDest]')[0].checked, nombre = (arbol ? $('#nTipo').value : $('#nCat').value).trim().toLowerCase(), wv = +$('#nW').value, hv = +$('#nH').value;
  if (!/^[a-z0-9_]{1,40}$/.test(nombre)) return toast('Nombre: solo minúsculas, números y _', true);
  if (!(wv >= 1 && wv <= 256 && hv >= 1 && hv <= 256)) return toast('Tamaño entre 1 y 256 píxeles', true);
  $('#mNuevo').hidden = true; pxAbrir(null, { carpeta: arbol ? 'arboles' : 'suelo', nombre, w: wv, h: hv });
}
// ---------- eventos ----------
(function pxInit() {
  const cv = $('#pxLienzo');
  cv.addEventListener('mousedown', pxDown); addEventListener('mousemove', e => { if (PX.on) pxMove(e); }); addEventListener('mouseup', pxUp);
  cv.addEventListener('contextmenu', e => e.preventDefault()); cv.addEventListener('mouseleave', () => { PX.hover = null; if (PX.on) pxDibujar(); });
  cv.addEventListener('wheel', e => { e.preventDefault(); PX.zoom = Math.max(2, Math.min(32, PX.zoom + (e.deltaY < 0 ? 1 : -1))); pxDibujar(); }, { passive: false });
  $$('#pxHerr [data-t]').forEach(b => b.onclick = () => pxHerr(b.dataset.t));
  $('#pxTam').oninput = e => { PX.size = +e.target.value; $('#pxTamV').textContent = PX.size; };
  $('#pxSim').onchange = e => { PX.sym = e.target.checked; pxDibujar(); }; $('#pxRej').onchange = e => { PX.grid = e.target.checked; pxDibujar(); };
  $('#pxColor').oninput = e => pxColor(pxRgb(e.target.value).concat(+$('#pxAlfa').value)); $('#pxAlfa').oninput = e => pxColor(PX.col.slice(0, 3).concat(+e.target.value));
  $('#pxEspH').onclick = () => pxEspejo(true); $('#pxEspV').onclick = () => pxEspejo(false);
  $('#pxAplicarTam').onclick = () => pxTam(+$('#pxW').value, +$('#pxH').value); $('#pxRecortar').onclick = pxRecortar;
  $('#pxDeshacer').onclick = pxUndo; $('#pxRehacer').onclick = pxRedo; $('#pxGuardar').onclick = pxGuardar; $('#pxComo').onclick = pxComo; $('#pxCerrar').onclick = () => pxCerrar();
  $('#bNuevo').onclick = pxNuevoDialogo; $('#nOk').onclick = pxNuevoOk; $$('[name=nDest]').forEach(r => r.onchange = () => { const a = $$('[name=nDest]')[0].checked; $('#nTipoL').hidden = !a; $('#nCatL').hidden = a; });
  addEventListener('keydown', e => {
    if (!PX.on || /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) return;
    const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (mod && k === 'z') { e.preventDefault(); e.stopImmediatePropagation(); e.shiftKey ? pxRedo() : pxUndo(); return; }
    if (mod && k === 'y') { e.preventDefault(); e.stopImmediatePropagation(); pxRedo(); return; }
    const m = { b: 'lapiz', e: 'borrador', g: 'cubo', i: 'gotas', l: 'linea', r: 'rect', f: 'rectl', m: 'mover' }[k]; if (m && !mod) { pxHerr(m); e.stopImmediatePropagation(); }
    if (k === 'escape') pxCerrar();
  }, true);
  pxColor(PX.col);
})();
