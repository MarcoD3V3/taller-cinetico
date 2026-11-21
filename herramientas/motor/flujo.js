'use strict';
// =====================================================================================
//  Motor: borrador automático, «Publicar» y «Probar» directo.
//  · Todo lo que cambias se guarda solo como borrador (en el motor), a cada rato. El juego de prueba lo ve al momento.
//  · El juego de verdad no cambia hasta «Publicar»: entonces se escribe sprites/ajustes.js y se sube todo lo de
//    sprites/ (ajustes e imágenes nuevas o editadas) a GitHub, para que llegue a la web y a la app.
//  · «Probar» entra directamente al mundo de prueba con el sprite elegido; ⚙ abre las opciones.
//  · En el juego de prueba: doble clic / clic derecho sobre un sprite manda cambios al motor (y «Abrir en el motor»).
// =====================================================================================
const PRUEBA_DEF = { mundo: 'prueba', suelo: '', solo: true, tam: 7, copias: 1, hora: 'dia', clima: '', choques: true, vuelo: true };
const prOpc = () => { try { return { ...PRUEBA_DEF, ...JSON.parse(localStorage.getItem('motor-prueba-opc') || '{}') }; } catch (e) { return { ...PRUEBA_DEF }; } };
const prGuardarOpc = o => { try { localStorage.setItem('motor-prueba-opc', JSON.stringify(o)); } catch (e) { } };

// ---------- Borrador automático ----------
st.publicado = null; // texto de lo último publicado (para saber si hay algo pendiente)
function estado() {
  const pend = st.publicado !== null && canon(AJ()) !== st.publicado;
  $('#bGuardar').disabled = !pend && !st.dirty; $('#bGuardar').classList.toggle('aviso', pend);
  $('#estado').textContent = st.guardando ? 'Guardando borrador…' : pend ? 'Borrador guardado · sin publicar' : 'Todo publicado';
}
function guardarBorrador(inmediato) {
  clearTimeout(guardarBorrador.t);
  const go = async () => { st.guardando = true; estado();
    try { await fetch('/api/borrador', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ajustes: AJ() }) }); st.dirty = false; } catch (e) { $('#estado').textContent = 'No se pudo guardar el borrador'; }
    st.guardando = false; estado(); };
  if (inmediato) return go(); guardarBorrador.t = setTimeout(go, 800);
}
{ const s0 = sucio; sucio = (v = true) => { s0(v); if (v) guardarBorrador(); estado(); }; }
setInterval(() => { if (st.dirty) guardarBorrador(true); }, 20000); // y, por si acaso, cada 20 s
addEventListener('beforeunload', () => { if (st.dirty) navigator.sendBeacon && navigator.sendBeacon('/api/borrador', new Blob([JSON.stringify({ ajustes: AJ() })], { type: 'application/json' })); });

// ---------- Publicar ----------
guardar = async function publicar() {
  const errs = revisarSilencio(); if (errs && !confirm(`Hay ${errs} error(es) (botón «Revisar»). ¿Publicar igualmente?`)) return;
  if (!confirm('¿Publicar en el juego?\nSe escriben los ajustes y se sube TODO lo de sprites/ (ajustes e imágenes) a GitHub: la web y la app lo tendrán en unos minutos.')) return;
  $('#estado').textContent = 'Publicando…'; $('#bGuardar').disabled = true;
  const r = await fetch('/api/publicar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(AJ()) }); const j = await r.json().catch(() => ({}));
  if (!r.ok) { toast('No se pudo publicar: ' + (j.error || r.status), true); estado(); return; }
  st.publicado = canon(AJ()); st.dirty = false; estado();
  $('#pubTexto').innerHTML = (j.git || []).map(t => `<p>${esc(t)}</p>`).join('') || '<p>Publicado.</p>'; $('#mPub').hidden = false;
};
// Ctrl+S: guarda el borrador ya mismo (publicar es el botón)
addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); e.stopImmediatePropagation(); guardarBorrador(true); toast('Borrador guardado'); } }, true);

// ---------- Probar: directo; ⚙ = opciones ----------
function urlPrueba(o) {
  const q = new URLSearchParams({ prueba: '1', mundo: o.mundo, solo: o.solo ? '1' : '0', tam: o.tam, copias: o.copias, hora: o.hora, clima: o.clima || '', choques: o.choques ? '1' : '0', vuelo: o.vuelo ? '1' : '0' });
  if (st.modo === 'sprites' && st.sel) q.set('sprite', st.sel);
  q.set('suelo', o.suelo || sueloDe(st.sel)); return '/index.html?' + q;
}
function sueloDe(k) {
  const gk = Object.keys(J('MOTOR_DEF').suelo); if (!k) return 'GRASS';
  if (!isTree(k)) { const cat = tipoDe(k); return gk.find(g => (groundVal(g).w[cat] || 0) > 0) || 'GRASS'; }
  const t = treeT(tipoDe(k)), key = t >= 0 ? J('GI')[t].key : ''; const b = J('BIOMES').find(b => b && (biomeTrees(b.key)[key] > 0)); return b && b.g ? b.g : 'GRASS';
}
function probarYa() {
  if (!W()) return; try { localStorage.setItem('motor-ajustes', JSON.stringify(AJ())); } catch (e) { }
  const w = window.open(urlPrueba(prOpc()), 'motor-prueba'); if (!w) toast('Permite las ventanas emergentes para esta página', true); else w.focus();
}
function opcionesProbar() {
  const o = prOpc(), w = W(), ws = (() => { try { return w.worldIndex().filter(x => x.id !== 'motor-mundo'); } catch (e) { return []; } })();
  $('#pMundo').innerHTML = `<option value="prueba">Mundo de prueba (se guarda; sigue donde lo dejaste)</option><option value="nuevo">Mundo de prueba nuevo (borra el anterior)</option>` + ws.map(x => `<option value="${esc(x.id)}">Mundo: ${esc(x.name || x.id)} (no se guarda)</option>`).join('');
  $('#pMundo').value = [...$('#pMundo').options].some(op => op.value === o.mundo) ? o.mundo : 'prueba';
  const gk = Object.keys(J('MOTOR_DEF').suelo); $('#pSuelo').innerHTML = `<option value="">Automático (donde sale el sprite)</option>` + gk.map(g => `<option value="${g}">${esc(nomSuelo(g))}</option>`).join(''); $('#pSuelo').value = o.suelo || '';
  $('#pSolo').checked = o.solo; $('#pTam').value = o.tam; $('#pCopias').value = o.copias; $('#pHora').value = o.hora; $('#pChoques').checked = o.choques; $('#pVuelo').checked = o.vuelo;
  let wx = []; try { wx = Object.keys(J('WX_T')); } catch (e) { } $('#pClima').innerHTML = '<option value="">Como venga</option>' + wx.map(k => `<option value="${k}">${esc(k)}</option>`).join(''); $('#pClima').value = o.clima || '';
  $('#mProbar').hidden = false;
}
irProbar = function () {
  const o = { mundo: $('#pMundo').value, suelo: $('#pSuelo').value, solo: $('#pSolo').checked, tam: Math.max(3, Math.min(31, +$('#pTam').value | 0)), copias: Math.max(1, Math.min(25, +$('#pCopias').value | 0)), hora: $('#pHora').value, clima: $('#pClima').value, choques: $('#pChoques').checked, vuelo: $('#pVuelo').checked };
  prGuardarOpc(o.mundo === 'nuevo' ? { ...o, mundo: 'prueba' } : o); $('#mProbar').hidden = true;
  try { localStorage.setItem('motor-ajustes', JSON.stringify(AJ())); } catch (e) { }
  const w = window.open(urlPrueba(o), 'motor-prueba'); if (!w) toast('Permite las ventanas emergentes para esta página', true); else w.focus();
};
probarSimple = probarYa; abrirProbar = probarYa;
pegarMundo = function () {
  const raw = $('#tMundo').value.trim(), w = W(); if (!raw) return;
  try { JSON.parse(raw); } catch (e) { return toast('Eso no parece un mundo exportado', true); }
  const id = J('newWorldId')(); if (!w.lsSet(J('WKEY')(id), raw)) return toast('No hay espacio para el mundo', true);
  try { const L = w.worldIndex(), e = w.indexEntry(id, raw); L.unshift(e); w.saveIndex(L); } catch (e) { }
  $('#mPegar').hidden = true; $('#tMundo').value = ''; opcionesProbar(); $('#pMundo').value = id; toast('Mundo traído al motor');
};
// los botones se enlazaron al cargar con las funciones viejas: se vuelven a enlazar
$('#bProbar').onclick = probarYa; $('#bProbarOpc').onclick = opcionesProbar; $('#pIr').onclick = irProbar; $('#bGuardar').onclick = guardar; $('#bPegarOk').onclick = pegarMundo;
// comparar sin lo vacío (el servidor quita lo vacío al publicar)
function canon(a) { const c = o => { if (Array.isArray(o)) return o.map(c); if (!o || typeof o !== 'object') return o; const r = {}; for (const k of Object.keys(o).sort()) { const v = c(o[k]); if (v === undefined || v === null || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length)) continue; r[k] = v; } return r; }; return JSON.stringify(c(a)); }

// ---------- Lo que manda el juego de prueba (menú flotante) ----------
addEventListener('storage', e => {
  if (!e.newValue) return;
  try {
    if (e.key === 'motor-cambio') { const m = JSON.parse(e.newValue);
      if (m.tipo === 'sprite' && m.key) { ajSet(m.key, a => { for (const q in m.patch) a[q] = m.patch[q] === null ? undefined : m.patch[q]; }); if (st.sel === m.key) { panel(); dibujar(); } lista(); }
      if (m.tipo === 'jugador') { for (const q in m.patch) jugSet(q, m.patch[q]); if (st.modo === 'jugador') { panel(); dibujar(); } }
      if (m.tipo === 'cat' && m.cat) { catSet(m.cat, o => { for (const q in m.patch) o[q] = m.patch[q] === null ? undefined : m.patch[q]; }); if (st.sel) panel(); }
    }
    if (e.key === 'motor-ir') { const m = JSON.parse(e.newValue); window.focus(); if (m.key && J('CSPR').sets.has(m.key)) { if (st.modo !== 'sprites') modo('sprites'); elegir(m.key); const c = document.querySelector(`.cel[data-k="${CSS.escape(m.key)}"]`); if (c) c.scrollIntoView({ block: 'center' }); toast('Abierto desde el juego de prueba: ' + m.key); } if (m.jugador) modo('jugador'); }
  } catch (er) { console.warn(er); }
});

// ---------- Doble clic sobre el personaje de prueba: sus propiedades (arrastrarlo solo lo mueve) ----------
vista.addEventListener('dblclick', e => {
  if (st.modo !== 'sprites' || !st.sel) return; const dpr = devicePixelRatio || 1; if (hit(e.offsetX * dpr, e.offsetY * dpr) === 'player') { modo('jugador'); toast('Propiedades del jugador'); }
});

// ---------- Arranque: si hay un borrador más nuevo que lo publicado, se sigue con él ----------
(async () => {
  const pub = await fetch('/api/ajustes').then(r => r.json()).catch(() => null), bor = await fetch('/api/borrador').then(r => r.json()).catch(() => null);
  const wait = () => new Promise(ok => { const t = () => st.AJ && W() ? ok() : setTimeout(t, 120); t(); }); await wait();
  st.publicado = canon(norm(pub || {}));
  if (bor && bor.ajustes && canon(norm(bor.ajustes)) !== st.publicado) { st.AJ = norm(bor.ajustes); lista(); panel(); dibujar(); toast('Seguimos con tu borrador (sin publicar)'); }
  estado();
})();
