'use strict';
// =====================================================================================
//  Motor: editar varios sprites a la vez.
//  Selección: Ctrl+clic suma o quita · Mayús+clic elige un rango · botones «todo el tipo» y «todos los visibles».
//  Con 2 o más elegidos, el panel de la derecha cambia a «Grupo»: escala, mover, línea de orden, viento, ocultar,
//  colisores, pegar ajustes y valores de serie, a todos de golpe. Cada cambio se deshace entero con Ctrl+Z.
// =====================================================================================
st.multi = new Set(); st.ancla = null;
const Qs = s => [...document.querySelectorAll(s)];
const visibles = () => Qs('#lista .cel').map(c => c.dataset.k);
function grupoActivo() { return st.modo === 'sprites' && st.multi.size >= 2; }
function marcarSel() { Qs('#lista .cel').forEach(c => c.classList.toggle('msel', st.multi.has(c.dataset.k))); const n = st.multi.size; const b = document.getElementById('gBarra'); if (b) { b.hidden = n < 2; b.querySelector('b').textContent = n; } }
// clics en la lista: Ctrl y Mayús seleccionan varios; un clic normal vuelve a uno solo
document.getElementById('lista').addEventListener('click', e => {
  const c = e.target.closest('.cel'); if (!c || st.modo !== 'sprites') return; const k = c.dataset.k;
  if (e.ctrlKey || e.metaKey) { e.stopPropagation(); if (!st.multi.size && st.sel) st.multi.add(st.sel); st.multi.has(k) ? st.multi.delete(k) : st.multi.add(k); st.ancla = k; if (st.multi.size === 1) elegirSolo([...st.multi][0]); else { st.sel = st.multi.has(st.sel) ? st.sel : k; marcarSel(); panel(); dibujar(); } return; }
  if (e.shiftKey) { e.stopPropagation(); const V = visibles(), a = V.indexOf(st.ancla || st.sel), b = V.indexOf(k); if (a < 0) { st.multi = new Set([k]); } else { const [i, j] = a < b ? [a, b] : [b, a]; st.multi = new Set(V.slice(i, j + 1)); } st.sel = k; marcarSel(); panel(); dibujar(); return; }
  st.multi.clear(); st.ancla = k; // clic normal: lo hace elegir()
}, true);
function elegirSolo(k) { st.multi.clear(); elegir(k); marcarSel(); }
// la lista se redibuja a menudo: se vuelve a marcar lo elegido
{ const l0 = lista; lista = () => { l0(); if (st.modo === 'sprites') marcarSel(); }; }
{ const e0 = elegir; elegir = k => { e0(k); if (!st.multi.has(k)) { st.multi.clear(); } marcarSel(); }; }
// barra con la cuenta y atajos de selección (encima de la lista)
(function () {
  const bar = document.createElement('div'); bar.className = 'gsel';
  bar.innerHTML = `<button id="gTipo" title="Elegir todas las imágenes del tipo del sprite elegido">Todo el tipo</button><button id="gVis" title="Elegir todo lo que se ve en la lista (usa el buscador para filtrar)">Todos los visibles</button><span id="gBarra" hidden><b>0</b> elegidos · <a href="#" id="gNada">quitar</a></span>`;
  const L = document.getElementById('lista'); L.parentNode.insertBefore(bar, L);
  document.getElementById('gTipo').onclick = () => { if (!st.sel) return toast('Elige primero un sprite'); const pre = st.sel.slice(0, st.sel.indexOf('/') + 1), t = tipoDe(st.sel); st.multi = new Set(claves().filter(k => k.startsWith(pre) && tipoDe(k) === t)); marcarSel(); panel(); dibujar(); };
  document.getElementById('gVis').onclick = () => { st.multi = new Set(visibles()); if (st.multi.size && !st.multi.has(st.sel)) st.sel = [...st.multi][0]; marcarSel(); panel(); dibujar(); };
  document.getElementById('gNada').onclick = e => { e.preventDefault(); st.multi.clear(); marcarSel(); panel(); dibujar(); };
  // la barra solo en la sección Sprites
  const m0 = modo; modo = m => { m0(m); bar.hidden = m !== 'sprites'; };
})();

// ---------- cambios a todos ----------
function aTodos(f, msg) {
  const ks = [...st.multi]; if (!ks.length) return; hist();
  for (const k of ks) { const a = AJ().sprites[k] || (AJ().sprites[k] = {}); f(a, k); for (const q in a) if (a[q] === undefined || a[q] === null || a[q] === '') delete a[q]; if (!Object.keys(a).length) delete AJ().sprites[k]; }
  sucio(); lista(); panel(); dibujar(); toast(`${msg} · ${ks.length} sprites`);
}
const r2 = v => Math.round(v * 100) / 100;
function panelGrupo() {
  const ks = [...st.multi], D = document.getElementById('der'), arb = ks.filter(isTree).length, sue = ks.length - arb;
  const val = q => { const vs = new Set(ks.map(k => (AJ().sprites[k] || {})[q])); return vs.size === 1 ? [...vs][0] : '—'; };
  const ocultos = ks.filter(k => (AJ().sprites[k] || {}).oculto).length;
  D.innerHTML = `<div class="sec"><h3>Grupo <small>${ks.length} sprites${arb && sue ? ` · ${arb} árboles, ${sue} de suelo` : ''}</small></h3>
    <div class="gchips">${ks.slice(0, 40).map(k => `<span title="${esc(k)}" data-k="${esc(k)}"><canvas></canvas></span>`).join('')}${ks.length > 40 ? `<i>+${ks.length - 40}</i>` : ''}</div>
    <p class="nota">La vista muestra el primero. Lo que cambies aquí se aplica a todos; Ctrl+Z lo deshace entero.</p></div>
  <div class="sec"><h3>Escala <small>ahora: ${val('esc') === undefined ? '1' : val('esc')}</small></h3>
    <div class="fila"><input type="number" id="gEsc" value="1" step="0.05" min="0.1" max="6"><button id="gEscSet">Poner</button><button id="gEscMul" title="Multiplica la escala de cada uno">× Multiplicar</button></div></div>
  <div class="sec"><h3>Mover el dibujo</h3>
    <div class="par"><label>X ${'<input type="number" id="gDx" value="0" step="0.5">'}</label><label>Y ${'<input type="number" id="gDy" value="0" step="0.5">'}</label></div>
    <div class="fila"><button id="gMovSum" title="Suma a lo que ya tenga cada uno">＋ Sumar</button><button id="gMovSet">Poner</button><button id="gMov0">A cero</button></div></div>
  <div class="sec"><h3>Línea de orden <small>ahora: ${val('orden') === undefined ? '0' : val('orden')}</small></h3>
    <div class="fila"><input type="number" id="gOrd" value="0" step="0.5"><button id="gOrdSum">＋ Sumar</button><button id="gOrdSet">Poner</button></div></div>
  <div class="sec"><h3>Viento <small>ahora: ${val('viento') === undefined ? '1' : val('viento')}</small></h3>
    <div class="fila"><input type="range" id="gVienR" min="0" max="3" step="0.1" value="1" style="flex:1"><input type="number" id="gVien" value="1" step="0.1" min="0" max="5"><button id="gVienSet">Poner</button></div></div>
  <div class="sec"><h3>Colisores</h3>
    <div class="fila"><button id="gColAuto" title="Árboles: la base del tronco. Suelo: sin colisores">Automático</button><button id="gColNo">Sin colisores</button><button id="gColCopia" title="Copia los colisores del primero (el que se ve) a todos">Copiar los del primero</button></div>
    <div class="fila"><button id="gColTrig">Todos trigger</button><button id="gColBlq">Todos bloquean</button></div></div>
  <div class="sec"><h3>Visible en el juego <small>${ocultos ? ocultos + ' oculto(s)' : 'todos visibles'}</small></h3>
    <div class="fila"><button id="gOcul">Ocultar todos</button><button id="gMost">Mostrar todos</button></div></div>
  <div class="sec"><h3>Ajustes completos</h3>
    <div class="fila"><button id="gCopiarPri" title="Copia todos los ajustes del primero">Copiar los del primero</button><button id="gPegar" ${st.clip ? '' : 'disabled'} title="Pega los ajustes copiados (Ctrl+C en un sprite) en todos">Pegar en todos</button></div>
    <div class="fila"><button id="gSerie" class="mal">Todos a valores de serie</button><button id="gProbar" class="ok">▶ Probar el primero</button></div></div>`;
  // miniaturas
  Qs('.gchips span').forEach(sp => { const im = imgDe(sp.dataset.k), cv = sp.querySelector('canvas'); if (!im) return; const s = Math.max(1, Math.floor(26 / Math.max(im.width, im.height))); cv.width = im.width * s; cv.height = im.height * s; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0, cv.width, cv.height); sp.onclick = () => { st.sel = sp.dataset.k; dibujar(); }; });
  const n = id => +document.getElementById(id).value, on = (id, f) => { const b = document.getElementById(id); if (b) b.onclick = f; };
  on('gEscSet', () => { const v = Math.max(0.1, n('gEsc')); aTodos(a => { const old = a.esc || 1; a.esc = v === 1 ? undefined : v; if (Array.isArray(a.cols)) a.cols = a.cols.map(c => escCol(c, v / old)); }, `Escala ${v}`); });
  on('gEscMul', () => { const f = Math.max(0.05, n('gEsc')); aTodos(a => { const v = r2(Math.max(0.1, (a.esc || 1) * f)); a.esc = v === 1 ? undefined : v; if (Array.isArray(a.cols)) a.cols = a.cols.map(c => escCol(c, f)); }, `Escala ×${f}`); });
  on('gMovSum', () => { const dx = n('gDx'), dy = n('gDy'); aTodos(a => { a.dx = r2((a.dx || 0) + dx) || undefined; a.dy = r2((a.dy || 0) + dy) || undefined; if (Array.isArray(a.cols)) a.cols = a.cols.map(c => ({ ...c, x: r2((c.x || 0) + dx), y: r2((c.y || 0) + dy) })); }, 'Movidos'); });
  on('gMovSet', () => { const dx = n('gDx'), dy = n('gDy'); aTodos(a => { a.dx = dx || undefined; a.dy = dy || undefined; }, 'Posición puesta'); });
  on('gMov0', () => aTodos(a => { a.dx = undefined; a.dy = undefined; }, 'Posición a cero'));
  on('gOrdSum', () => { const d = n('gOrd'); aTodos(a => { a.orden = r2((a.orden || 0) + d) || undefined; }, 'Línea de orden'); });
  on('gOrdSet', () => { const v = n('gOrd'); aTodos(a => { a.orden = v || undefined; }, 'Línea de orden'); });
  const vr = document.getElementById('gVienR'), vn = document.getElementById('gVien'); vr.oninput = () => vn.value = vr.value; vn.oninput = () => vr.value = vn.value;
  on('gVienSet', () => { const v = Math.max(0, n('gVien')); aTodos(a => { a.viento = v === 1 ? undefined : v; }, `Viento ${v}`); });
  on('gColAuto', () => aTodos(a => { a.cols = undefined; a.col = undefined; }, 'Colisores automáticos'));
  on('gColNo', () => aTodos(a => { a.col = undefined; a.cols = []; }, 'Sin colisores'));
  on('gColCopia', () => { const src = typeof colsDe === 'function' ? JSON.parse(JSON.stringify(colsDe(st.sel))) : []; aTodos(a => { a.col = undefined; a.cols = JSON.parse(JSON.stringify(src)); }, 'Colisores copiados'); });
  on('gColTrig', () => aTodos((a, k) => { const L = JSON.parse(JSON.stringify(typeof colsDe === 'function' ? colsDe(k) : [])); a.col = undefined; a.cols = L.map(c => ({ ...c, trigger: true })); }, 'Todos trigger'));
  on('gColBlq', () => aTodos((a, k) => { const L = JSON.parse(JSON.stringify(typeof colsDe === 'function' ? colsDe(k) : [])); a.col = undefined; a.cols = L.map(c => { const d = { ...c }; delete d.trigger; delete d.cmd; return d; }); }, 'Todos bloquean'));
  on('gOcul', () => aTodos(a => { a.oculto = true; }, 'Ocultos'));
  on('gMost', () => aTodos(a => { a.oculto = undefined; }, 'Visibles'));
  on('gCopiarPri', () => { copiar(); panel(); });
  on('gPegar', () => { if (!st.clip) return; const c = JSON.parse(JSON.stringify(st.clip)); aTodos(a => { for (const q of ['esc', 'dx', 'dy', 'col', 'cols', 'orden', 'viento']) a[q] = c[q] === undefined ? undefined : JSON.parse(JSON.stringify(c[q])); }, 'Ajustes pegados'); });
  on('gSerie', () => { if (!confirm(`¿Quitar todos los ajustes de estos ${st.multi.size} sprites?`)) return; aTodos(a => { for (const q in a) delete a[q]; }, 'Valores de serie'); });
  on('gProbar', () => probarYa());
}
function escCol(c, f) { const d = { ...c, x: r2((c.x || 0) * f), y: r2((c.y || 0) * f) }; if (d.w) d.w = r2(d.w * f); if (d.h) d.h = r2(d.h * f); if (d.r) d.r = r2(d.r * f); if (d.pts) d.pts = d.pts.map(([x, y]) => [r2(x * f), r2(y * f)]); return d; }
{ const p0 = panel; panel = () => { if (grupoActivo()) return panelGrupo(); return p0(); }; }
// teclas: Esc quita la selección múltiple; Ctrl+A (con el ratón en la lista) elige los visibles
addEventListener('keydown', e => {
  const enCampo = /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '');
  if (e.key === 'Escape' && st.multi.size && !enCampo && Qs('.modal').every(m => m.hidden)) { st.multi.clear(); marcarSel(); panel(); dibujar(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && !enCampo && document.querySelector('#lista:hover')) { e.preventDefault(); st.multi = new Set(visibles()); marcarSel(); panel(); dibujar(); }
});
