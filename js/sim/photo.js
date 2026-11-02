'use strict';
// =====================================================================================
//  Modo foto (tecla Z).
//  · Oculta toda la interfaz y deja solo el mundo. Abajo, una barra con filtros (se ven en
//    directo), marco, pie de foto y el botón de capturar (o Espacio).
//  · La foto se guarda como imagen PNG; las últimas 6 quedan en la barra para volver a guardarlas.
//    Si el navegador no deja descargar, sale la foto en grande: clic derecho › Guardar imagen.
//  · Z o Esc para salir. H oculta también la barra (para ver la escena limpia).
// =====================================================================================
const PHO = { on: false, f: 0, frame: 1, cap: 1, bar: true, shots: [] };
const PHO_F = [['Normal', ''], ['Cálido', 'sepia(.25) saturate(1.3) brightness(1.05)'], ['Frío', 'hue-rotate(-12deg) saturate(.85) brightness(1.06) contrast(1.05)'], ['Blanco y negro', 'grayscale(1) contrast(1.18)'], ['Sepia', 'sepia(.85) contrast(1.05)'], ['Vintage', 'sepia(.35) contrast(.9) brightness(1.08) saturate(.8)'], ['Vívido', 'saturate(1.7) contrast(1.12)'], ['Nocturno', 'hue-rotate(190deg) saturate(.55) brightness(.85) contrast(1.1)'], ['Ensueño', 'saturate(1.35) brightness(1.12) blur(.6px)']];
function phEl() {
  let e = $('photoBar'); if (e) return e; e = document.createElement('div'); e.id = 'photoBar'; e.hidden = true; document.body.appendChild(e);
  const fl = document.createElement('div'); fl.id = 'photoFlash'; document.body.appendChild(fl); return e;
}
function phRender() {
  const e = phEl(); e.hidden = !PHO.on || !PHO.bar; if (!PHO.on) return;
  e.innerHTML = `<div class="phrow">${PHO_F.map(([n], i) => `<button class="${PHO.f === i ? 'on' : ''}" data-phf="${i}">${n}</button>`).join('')}</div>
    <div class="phrow"><label><input type="checkbox" data-pho="frame" ${PHO.frame ? 'checked' : ''}> Viñeta</label><label><input type="checkbox" data-pho="cap" ${PHO.cap ? 'checked' : ''}> Pie de foto</label>
    <button class="phshot" data-phshot>📸 Capturar <kbd>Espacio</kbd></button><button data-phx>Salir <kbd>Z</kbd></button><span class="mut small">H: ocultar esta barra · rueda: zoom</span></div>
    ${PHO.shots.length ? `<div class="phrow phgal">${PHO.shots.map((s, i) => `<img src="${s.url}" data-phg="${i}" title="Guardar otra vez">`).join('')}</div>` : ''}`;
}
function phToggle(on) {
  PHO.on = on ?? !PHO.on; if (PHO.on && ui.open) closeModal(); document.documentElement.classList.toggle('photo', PHO.on); cv.style.filter = PHO.on ? PHO_F[PHO.f][1] : ''; PHO.bar = true; phRender();
  if (PHO.on) toast('📷 Modo foto: elige un filtro y pulsa Espacio para capturar'); const pv = $('photoView'); if (pv && !PHO.on) pv.remove();
}
async function phShot() {
  const W = cv.width, H = cv.height, c = mkCanvas(W, H), g = c.getContext('2d');
  g.filter = PHO_F[PHO.f][1] || 'none'; g.drawImage(cv, 0, 0); g.filter = 'none';
  if (PHO.frame) { const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.38, W / 2, H / 2, Math.max(W, H) * 0.72); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = v; g.fillRect(0, 0, W, H); }
  if (PHO.cap && S) { const s = typeof seasonInfo === 'function' ? seasonInfo() : null, b = BIOMES[biomeOf(Math.floor(S.player.x / T), Math.floor(S.player.y / T))], k = W / 900;
    const txt = `${S.name || 'Mi mundo'} · ${b ? b.n : ''} · día ${Math.floor(S.time / (S.gen.dayLen || DAY_LEN)) + 1}${s ? ' · ' + s.S.n : ''}`;
    g.font = `700 ${Math.round(18 * k)}px system-ui`; g.textAlign = 'left'; g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 6 * k; g.fillStyle = '#ffffff'; g.fillText('Taller Cinético', 22 * k, H - 44 * k);
    g.font = `${Math.round(13 * k)}px system-ui`; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(txt, 22 * k, H - 22 * k); g.shadowBlur = 0; }
  const fl = $('photoFlash'); fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on'); noise(0.08, 0.06, 3000); tone(1800, 0.05, 'square', 0.03, 0.5);
  const blob = await new Promise(r => c.toBlob(r, 'image/png')); if (!blob) { toastErr('No se pudo hacer la foto'); return; }
  const shot = { url: URL.createObjectURL(blob), blob, name: `taller-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.png` };
  PHO.shots.unshift(shot); while (PHO.shots.length > 6) URL.revokeObjectURL(PHO.shots.pop().url); phRender(); phSave(shot);
}
// Guardar: con el permiso de descargas de la página si lo hay; si no, enlace de descarga; y siempre se puede ver en grande
async function phSave(shot) {
  try { const dl = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads') : null; if (dl) { await dl.save({ filename: shot.name, data: shot.blob }); toast('📸 Foto guardada'); return; } } catch (e) { }
  try { const a = document.createElement('a'); a.href = shot.url; a.download = shot.name; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { }
  if (window.top !== window) phView(shot); else toast('📸 Foto guardada en tus descargas'); // dentro de otra página la descarga puede estar bloqueada: se enseña para guardarla a mano
}
function phView(shot) {
  let v = $('photoView'); if (!v) { v = document.createElement('div'); v.id = 'photoView'; document.body.appendChild(v); }
  v.innerHTML = `<img src="${shot.url}" alt="Tu foto"><div class="phvt">📸 ¡Foto hecha! Si no se ha descargado sola: <b>clic derecho en la foto › Guardar imagen como…</b> <button data-phvx>Cerrar</button></div>`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-phf],[data-phshot],[data-phx],[data-phg],[data-phvx]'); if (!b) return;
  if (b.dataset.phf) { PHO.f = +b.dataset.phf; cv.style.filter = PHO_F[PHO.f][1]; phRender(); }
  else if (b.dataset.phshot !== undefined) phShot(); else if (b.dataset.phx !== undefined) phToggle(false);
  else if (b.dataset.phg) phSave(PHO.shots[+b.dataset.phg]); else if (b.dataset.phvx !== undefined) { const v = $('photoView'); if (v) v.remove(); } });
document.addEventListener('change', e => { const t = e.target.closest('[data-pho]'); if (t) PHO[t.dataset.pho] = t.checked ? 1 : 0; });
KEY_ACTIONS.find(g => g[0] === 'Ventanas')[1].push(['z', 'Modo foto']); keymapBuild();
addEventListener('keydown', e => {
  if (!S || ui.open === 'title' || e.ctrlKey || e.metaKey || _typing(e)) return; const k = e.key.toLowerCase();
  if (k === 'z' && (!ui.open || PHO.on)) { phToggle(); e.preventDefault(); return; }
  if (!PHO.on) return;
  if (k === 'escape') { phToggle(false); e.stopImmediatePropagation(); }
  else if (k === ' ') { phShot(); e.preventDefault(); e.stopImmediatePropagation(); }
  else if (k === 'h') { PHO.bar = !PHO.bar; phRender(); e.stopImmediatePropagation(); }
}, true);
cmd('foto', { a: ['photo', 'captura'], u: '/foto', d: 'Abre el modo foto (también con la tecla Z).', run() { phToggle(true); } });
