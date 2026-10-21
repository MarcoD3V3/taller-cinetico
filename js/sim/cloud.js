'use strict';
// =====================================================================================
//  Mundos en la nube: con sesión de Discord en el servidor propio (Railway), tus mundos se
//  guardan también en su base de datos. Así puedes seguir en otro ordenador o navegador.
//   · Copia automática del mundo abierto cada 2 minutos (y al salir al menú).
//   · En «Un jugador»: subir cualquier mundo, bajar los de la nube y borrarlos.
// =====================================================================================
const cloudOn = () => NET.kind === 'ws' && NET.room && NET.room.me && NET.room.me.cloud && NET.room.connected();
let _cloudLast = 0, _cloudBusy = 0;
async function cloudUpload(id, quiet) {
  const raw = lsGet(WKEY(id)), w = worldIndex().find(x => x.id === id); if (!raw || !w || !cloudOn()) return false;
  _cloudBusy++; try {
    const data = await gz(raw);
    await NET.room.savePut(id, w.name, data, { seed: w.seed, tier: w.tier, blocks: w.blocks, kb: w.kb, played: w.played, sandbox: !!w.sandbox });
    if (!quiet) toast('☁ En la nube: ' + w.name); return true;
  } catch (e) { if (!quiet) toastErr('No se pudo subir: ' + (e.message || e.code)); return false; } finally { _cloudBusy--; cloudRender(); }
}
async function cloudDownload(id) {
  _cloudBusy++; cloudRender();
  try {
    const s = await NET.room.saveGet(id), raw = await ungz(s.data), d = JSON.parse(raw);
    if (!d || d.v !== 3) throw new Error('no es un mundo de esta versión');
    const local = worldIndex().find(x => x.id === id);
    if (local && local.played > new Date(s.updated).getTime() + 5000 && !confirm(`Tu copia de «${local.name}» en este navegador es más reciente que la de la nube. ¿Reemplazarla igualmente?`)) return;
    // Si es el que estaba abierto (ya guardado al salir al menú), se cierra para poner la versión de la nube
    if (id === currentWorld && S) { if (ui.open !== 'title') { toastErr('Ese mundo está abierto: sal al menú primero.'); return; } S = null; currentWorld = null; }
    if (!lsSet(WKEY(id), raw)) throw new Error('no hay espacio en el navegador');
    const list = worldIndex().filter(x => x.id !== id), m = s.meta || {};
    list.unshift({ id, name: s.name || d.name || 'Mundo', seed: m.seed ?? (d.gen && d.gen.seed), created: Date.now(), played: Date.now(), tier: m.tier ?? d.tier ?? 0, sandbox: !!(m.sandbox ?? d.sandbox), blocks: m.blocks ?? (d.bs || []).length, kb: Math.round(raw.length / 1024) });
    saveIndex(list); toast('☁ Descargado: ' + (s.name || 'mundo')); if (ui.open === 'title') showList();
  } catch (e) { toastErr('No se pudo descargar: ' + (e.message || e.code)); } finally { _cloudBusy--; cloudRender(); }
}
// Copia automática del mundo abierto (solo los tuyos, no los de una partida en línea)
{ const s0 = saveGame; saveGame = quiet => { const ok = s0(quiet); if (ok && S && currentWorld && !String(currentWorld).startsWith('mp-') && cloudOn() && Date.now() - _cloudLast > 120000) { _cloudLast = Date.now(); cloudUpload(currentWorld, true); } return ok; }; }
// ---------- En la lista de mundos ----------
let _cloudList = null;
async function cloudRender(refetch) {
  const box = $('cloudBox'); if (!box) return;
  if (!cloudOn()) {
    const can = NET.kind === 'ws' && NET.room && NET.room.me && NET.room.me.oauth;
    box.innerHTML = can ? `<div class="cldoff">☁ <span><b>Guarda tus mundos en la nube</b><span class="mut small">Inicia sesión con Discord y podrás seguir en cualquier ordenador.</span></span><button class="dcbtn pri" data-dc="login">Iniciar sesión con Discord</button></div>` : '';
    return;
  }
  if (refetch || !_cloudList) { try { _cloudList = await NET.room.saves(); } catch (e) { _cloudList = []; } }
  const loc = new Map(worldIndex().map(w => [w.id, w]));
  box.innerHTML = `<div class="cssub">☁ En la nube (${_cloudList.length}/20)${_cloudBusy ? ' <span class="mpspin"></span>' : ''}</div><div class="cldl">${_cloudList.length ? _cloudList.map(s => { const l = loc.get(s.id), t = new Date(s.updated).getTime(), state = !l ? 'Solo en la nube' : Math.abs((l.played || 0) - t) < 60000 ? 'Al día' : (l.played || 0) > t ? 'Tienes cambios sin subir' : 'Hay una versión más nueva en la nube';
    return `<div class="cldc"><span><b>${esc(s.name || 'Mundo')}</b><span class="mut small">${esc(state)} · ${Math.round((s.size || 0) / 1024)} KB · ${fmtDate(t)}</span></span><span class="row gap">${l && (l.played || 0) > t ? `<button data-cl="up:${esc(s.id)}">Subir</button>` : ''}<button data-cl="down:${esc(s.id)}">${l ? 'Bajar' : 'Descargar'}</button><button class="danger" data-cl="del:${esc(s.id)}" aria-label="Borrar de la nube">✕</button></span></div>`; }).join('') : '<p class="mut small">Todavía no hay nada. Usa «☁ Subir» en un mundo, o se subirá solo mientras juegas.</p>'}</div>`;
}
{ const s0 = showList; showList = () => { s0(); const ex = $('tExtra'); if (ex && !$('cloudBox')) ex.insertAdjacentHTML('beforebegin', '<div id="cloudBox"></div>');
  if (cloudOn()) document.querySelectorAll('#tBody .wcard').forEach(c => { const id = c.dataset.idW, b = c.querySelector('.wbtns'); if (id && b && !b.querySelector('[data-cl]')) b.insertAdjacentHTML('afterbegin', `<button data-cl="up:${esc(id)}" title="Guardar una copia en la nube">☁ Subir</button>`); });
  cloudRender(true); }; }
document.addEventListener('click', async e => { const b = e.target.closest('[data-cl]'); if (!b) return; const [a, id] = b.dataset.cl.split(':');
  if (a === 'up') { b.disabled = true; if (await cloudUpload(id)) { _cloudList = null; cloudRender(true); } b.disabled = false; }
  if (a === 'down') cloudDownload(id);
  if (a === 'del' && confirm('¿Borrar este mundo de la nube? La copia de este navegador no se toca.')) { try { await NET.room.saveDel(id); toast('Borrado de la nube'); } catch (er) { toastErr(er.message || er.code); } cloudRender(true); } });
// Al salir al menú, copia en la nube sin esperar a los 2 minutos
{ const q0 = quitToMenu; quitToMenu = async () => { _cloudLast = 0; return q0(); }; }
