'use strict';
// =====================================================================================
//  Barra rápida viva:
//   · Rueda: cambia de ranura · Ctrl + rueda (o pellizcar en el panel táctil): zoom
//   · Shift + rueda: gira las filas (la barra se cambia por la siguiente fila de la mochila)
//   · Clic con la rueda en el mundo: coge a la mano lo que señalas (si lo llevas encima)
//   · Al cambiar de ranura: el marco se desliza, la ranura salta un poco y encima aparece
//     el nombre, la calidad, cuántos llevas en total, los usos que le quedan y qué hace.
// =====================================================================================
const HB_ROWS = INV_N / 9;
function hbSel(i) { const n = ((i % 9) + 9) % 9; if (n === S.sel && !ui.hand) return; S.sel = n; ui.hand = false; tone(520 + n * 22, 0.025, 'sine', 0.018, 1.1); }
function hbZoom(e) {
  const inv = OPT.wheelInvert ? -1 : 1, zs = OPT.zoomSens || 1;
  view.z = clamp(view.z * Math.pow(e.deltaY * inv > 0 ? 0.9 : 1.1, zs), heldId() === 'spyglass' ? 0.15 : CM().zoomOut ? 0.28 : 0.4, 3); updateHover();
}
// Girar las filas: la barra pasa a ser la fila 1 de la mochila, la fila 1 la 2… y la barra al final
function hbRotate(dir) {
  const rows = []; for (let r = 0; r < HB_ROWS; r++) rows.push(S.inv.slice(r * 9, r * 9 + 9));
  const order = dir > 0 ? [...rows.slice(1), rows[0]] : [rows[rows.length - 1], ...rows.slice(0, -1)];
  order.forEach((row, r) => row.forEach((s, i) => { S.inv[r * 9 + i] = s; }));
  S.hbRow = (((S.hbRow || 0) + dir) % HB_ROWS + HB_ROWS) % HB_ROWS; invVersion++;
  const hb = $('hotbar'); if (hb) { hb.classList.remove('rot', 'rotU'); void hb.offsetWidth; hb.classList.add(dir > 0 ? 'rot' : 'rotU'); }
  _hbForce = true; tone(330, 0.06, 'triangle', 0.03, 1.4);
}
let _hbAcc = 0, _hbT = 0;
cv.addEventListener('wheel', e => {
  if (!S || ui.open) return; e.preventDefault(); e.stopImmediatePropagation();
  const zoom = OPT.wheelOld ? !e.ctrlKey : e.ctrlKey;
  if (zoom) return hbZoom(e);
  const d = (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * (OPT.wheelInvert ? -1 : 1);
  // Paneles táctiles: acumula hasta un «paso» para no saltar varias ranuras de golpe
  _hbAcc += d; const now = performance.now(); if (Math.abs(_hbAcc) < 40 && now - _hbT < 250) return;
  const dir = _hbAcc > 0 ? 1 : -1; _hbAcc = 0; _hbT = now;
  if (e.shiftKey) hbRotate(dir); else hbSel(S.sel + dir);
}, { capture: true, passive: false });
// Clic con la rueda: coger a la mano lo que señalas
cv.addEventListener('mousedown', e => {
  if (e.button !== 1 || !S || ui.open) return; e.preventDefault();
  const b = at(mouse.tx, mouse.ty), g = GI[gnd(mouse.tx, mouse.ty)], want = b ? b.type : g && g.drop;
  if (!want || !ITEMS[want]) return;
  const i = S.inv.findIndex(s => s && s.id === want); if (i < 0) { toastErr(`No llevas ${ITEMS[want].n}`); return; }
  if (i < 9) hbSel(i); else { const t = S.inv[S.sel]; S.inv[S.sel] = S.inv[i]; S.inv[i] = t; invVersion++; ui.hand = false; }
  _hbForce = true;
}, true);
// ---------- Marco que se desliza y cartel con la información ----------
const hbPopEl = document.createElement('div'); hbPopEl.id = 'hbPop'; document.body.appendChild(hbPopEl);
function hbWhat(id) {
  const it = ITEMS[id]; if (!it) return '';
  if (BD[id] && BD[id].cat >= 0) return 'Clic: colocar · R: girar';
  if (it.weapon) return 'Clic: atacar';
  if (TOOLS[id] && TOOLS[id].kind !== 'util') return 'Mantén el clic: ' + ({ pick: 'picar', axe: 'talar', shovel: 'cavar', hammer: 'romper', sickle: 'segar', paxel: 'picar y talar', excav: 'cavar en área' }[TOOLS[id].kind] || 'usar');
  if (it.seed) return 'Clic en tierra arada: sembrar';
  if (typeof FTOOLS !== 'undefined' && FTOOLS[id]) return 'Clic: usar en el huerto';
  if (it.food || it.med || (it.use && it.use.buff)) return 'F: tomar';
  if (FUEL[id]) return 'Combustible · F en una hoguera';
  return ICATS[it.cat] || '';
}
let _hbLast = null, _hbHide = 0, _hbForce = false, _hbMk = '';
function hbPop() {
  const s = S.inv[S.sel], id = ui.hand ? null : s && s.id, key = (id || '-') + '|' + S.sel + '|' + ui.hand + '|' + (S.hbRow || 0);
  if (key === _hbLast && !_hbForce) return; const silent = _hbLast === null; _hbLast = key; _hbForce = false; if (silent) return; // al cargar el mundo, sin cartel
  const hb = $('hotbar'); if (!hb) return; const sl = ui.hand ? $('handBtn') : hb.querySelectorAll('.hs')[S.sel]; if (!sl) return;
  let h;
  if (ui.hand) h = '<b>✋ Mano</b><small>Extraer recursos aunque lleves un bloque</small>';
  else if (!id) h = `<b class="mut">Ranura ${S.sel + 1} vacía</b><small>Shift + rueda: cambiar de fila (${(S.hbRow || 0) + 1}/${HB_ROWS})</small>`;
  else {
    const it = ITEMS[id], q = typeof qParse === 'function' && qParse(id), tot = invCount(id), mx = typeof maxDur === 'function' ? maxDur(id) : 0, left = mx ? mx - wearOf(id) : 0;
    h = `<b style="${q ? 'color:' + Q_TIERS[q.tier].c : ''}">${esc(it.n)}</b><small>${esc(hbWhat(id))}</small><span class="hbchips">${tot > s.n ? `<i>${fmt(tot)} en total</i>` : ''}${mx ? `<i class="${left / mx < 0.25 ? 'bad' : ''}">${left}/${mx} usos</i>` : ''}${q ? `<i style="color:${Q_TIERS[q.tier].c}">${qStars(q.tier)}</i>` : ''}</span>`;
  }
  hbPopEl.innerHTML = h; const r = sl.getBoundingClientRect(), z = parseFloat(getComputedStyle(hb).zoom) || 1;
  hbPopEl.style.left = (r.left + r.width / 2) * z + 'px'; hbPopEl.style.bottom = (innerHeight - r.top * z + 10) + 'px';
  hbPopEl.classList.remove('on'); void hbPopEl.offsetWidth; hbPopEl.classList.add('on');
  clearTimeout(_hbHide); _hbHide = setTimeout(() => hbPopEl.classList.remove('on'), 1800);
}
function hbMark() {
  const hb = $('hotbar'); if (!hb) return; let m = hb.querySelector('.hbmark'); if (!m) { m = document.createElement('div'); m.className = 'hbmark'; hb.prepend(m); }
  const sl = ui.hand ? $('handBtn') : hb.querySelectorAll('.hs')[S.sel]; if (!sl) return;
  m.style.transform = `translateX(${sl.offsetLeft}px)`; m.style.width = sl.offsetWidth + 'px'; m.style.height = sl.offsetHeight + 'px'; m.style.top = sl.offsetTop + 'px';
}
{ const r0 = refreshHotbar; refreshHotbar = () => { r0(); const k = S.sel + '|' + ui.hand + '|' + invVersion; if (k === _hbMk && !_hbForce) return; _hbMk = k; hbMark(); hbPop(); }; }
{ const b0 = buildHotbar; buildHotbar = () => { b0(); _hbLast = null; _hbMk = ''; }; }
