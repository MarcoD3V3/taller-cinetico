'use strict';
// =====================================================================================
//  Motor: colisores como los 2D de Unity. Varios por sprite, cada uno con forma (caja, círculo, cápsula, elipse,
//  polígono), desplazamiento, tamaño/radio, dirección (cápsula), rotación, activo, Is Trigger (no bloquea y puede
//  ejecutar un comando al entrar) y con qué choca (jugador, criaturas, proyectiles). Todo se edita con el ratón:
//  arrastrar el cuerpo mueve, las asas cambian el tamaño y la rotación, en el polígono se mueven los puntos
//  (doble clic en un borde añade uno; Alt+clic o clic derecho en un punto lo quita).
// =====================================================================================
st.colSel = 0;
const FORMAS = { caja: 'Caja', circulo: 'Círculo', capsula: 'Cápsula', elipse: 'Elipse', poligono: 'Polígono' };
const NUEVO_COL = { caja: () => ({ forma: 'caja', x: 0, y: -1, w: 16, h: 6 }), circulo: () => ({ forma: 'circulo', x: 0, y: -1, r: 6 }), capsula: () => ({ forma: 'capsula', x: 0, y: -4, w: 8, h: 14, dir: 'v' }),
  elipse: () => ({ forma: 'elipse', x: 0, y: -1, w: 14, h: 6 }), poligono: () => ({ forma: 'poligono', x: 0, y: 0, pts: [[-8, -3], [8, -3], [9, 2], [-9, 2]] }) };
const rr = v => Math.round(v * 10) / 10;
// colisores de una imagen (sin escalar ni espejo, desde la base); auto = los automáticos de un árbol
function colsAuto(k) { if (!isTree(k)) return []; const a = ajGet(k), s = W().csTreeMake(treeImg(k), 0, 1, { ...a, cols: undefined, col: undefined }); return s.col ? [{ forma: 'elipse', x: rr(s.col.cx), y: rr(s.col.cy), w: rr(s.col.rx * 2), h: rr(s.col.ry * 2) }] : []; }
function colsDe(k) { const a = ajGet(k); if (Array.isArray(a.cols)) return a.cols; if (a.col === false) return []; if (a.col) return [{ forma: 'elipse', x: a.col.cx, y: a.col.cy, w: a.col.rx * 2, h: a.col.ry * 2 }]; return colsAuto(k); }
const colsModo = k => { const a = ajGet(k); return Array.isArray(a.cols) ? (a.cols.length ? 'propios' : 'ninguno') : a.col === false ? 'ninguno' : a.col ? 'propios' : isTree(k) ? 'auto' : 'ninguno'; };
// editar: se pasan a «propios» (lista) la primera vez
function colsEditar(k, f) { ajSet(k, a => { const L = JSON.parse(JSON.stringify(colsDe(k))); delete a.col; f(L, a); a.cols = L; }); }

// ---------- la geometría del editor deja de dibujar el choque viejo (lo dibuja esta capa) ----------
{ const g0 = geom; geom = k => { const g = g0(k); g.col = null; g.cols = colsDe(k); return g; }; }

// ---------- dibujo ----------
function colAsas(c, m) { // asas en coordenadas relativas (con espejo m)
  const X = (c.x || 0) * m, Y = c.y || 0, rot = (c.rot || 0) * m * Math.PI / 180, R = (lx, ly) => [X + lx * Math.cos(rot) - ly * Math.sin(rot), Y + lx * Math.sin(rot) + ly * Math.cos(rot)];
  if (c.forma === 'poligono') return (c.pts || []).map(([x, y], i) => ({ t: 'p' + i, p: [X + x * m, Y + y] }));
  const A = [{ t: 'centro', p: [X, Y] }];
  if (c.forma === 'circulo') A.push({ t: 'r', p: [X + c.r, Y] });
  else { A.push({ t: 'w', p: R(c.w / 2, 0) }, { t: 'h', p: R(0, c.h / 2) }, { t: 'rot', p: R(0, -c.h / 2 - 5) }); }
  return A;
}
{ const d0 = dibujar; dibujar = () => { d0(); if (st.modo !== 'sprites' || !st.sel || !W()) return; colCapa(); }; }
function colCapa() {
  const k = st.sel, L = colsDe(k), m = st.espejo ? -1 : 1, c = vx, dpr = devicePixelRatio || 1, modoA = colsModo(k) === 'auto', w = W();
  L.forEach((col, i) => {
    const cm = m < 0 ? w.colEspejo(col) : col; c.save(); c.lineWidth = (i === st.colSel ? 2.5 : 1.5) * dpr;
    const color = col.activo === false ? '#8a8d90' : col.trigger ? '#3bffd0' : '#ff3b3b';
    c.strokeStyle = color; c.fillStyle = col.activo === false ? '#8a8d9018' : col.trigger ? '#3bffd022' : '#ff3b3b28'; if (col.trigger || modoA) c.setLineDash([6 * dpr, 4 * dpr]);
    w.colTrazar(c, cm, sx(16), sy(26), Z); c.fill(); c.stroke(); c.restore();
    if (i === st.colSel) for (const a of colAsas(col, m)) { const [x, y] = a.p; c.fillStyle = '#000'; c.fillRect(sx(16 + x) - 5, sy(26 + y) - 5, 10, 10); c.fillStyle = a.t === 'rot' ? '#e0b54c' : color; c.fillRect(sx(16 + x) - 3.5, sy(26 + y) - 3.5, 7, 7);
      if (a.t === 'rot') { c.strokeStyle = '#e0b54c88'; c.lineWidth = 1; c.beginPath(); c.moveTo(sx(16 + (col.x || 0) * m), sy(26 + (col.y || 0))); c.lineTo(sx(16 + x), sy(26 + y)); c.stroke(); } }
  });
  // choque del personaje con estos colisores (verde = libre, rojo = choca)
  const p = st.player, py = p.y - 8, pts = [[p.x - 5, py + 5], [p.x + 5, py + 5], [p.x, py + 1]];
  const dentro = (x, y) => L.some(col => J('colBloquea')(m < 0 ? w.colEspejo(col) : col, 'player') && w.colDentro(m < 0 ? w.colEspejo(col) : col, x - 16, y - 26));
  for (const [x, y] of pts) { c.fillStyle = dentro(x, y) ? '#ff3b3b' : '#5fe07a'; c.fillRect(sx(x) - 3 * dpr, sy(y) - 3 * dpr, 6 * dpr, 6 * dpr); }
  if (modoA && L.length) { c.fillStyle = '#ff9b9b'; c.font = `${12 * dpr}px "Taller Pixel"`; const b = L[0]; c.fillText('automático (arrástralo para personalizar)', sx(16 + (b.x || 0) * m + b.w / 2 + 4), sy(26 + (b.y || 0)) - 8 * dpr); }
}

// ---------- ratón ----------
function colHit(px, py) {
  const k = st.sel, L = colsDe(k), m = st.espejo ? -1 : 1, w = W(), near = (x, y) => Math.abs(px - sx(16 + x)) < 9 && Math.abs(py - sy(26 + y)) < 9;
  const sel = L[st.colSel]; if (sel) for (const a of colAsas(sel, m)) if (near(a.p[0], a.p[1])) return { i: st.colSel, t: a.t };
  const lx = (wxOf(px) - 16), ly = wyOf(py) - 26;
  for (let i = L.length - 1; i >= 0; i--) { const c = m < 0 ? w.colEspejo(L[i]) : L[i]; if (w.colDentro(c, lx, ly)) return { i, t: 'mover' }; }
  return null;
}
vista.addEventListener('mousedown', e => {
  if (st.modo !== 'sprites' || !st.sel || !W()) return; const dpr = devicePixelRatio || 1, px = e.offsetX * dpr, py = e.offsetY * dpr, h = colHit(px, py); if (!h) return;
  e.preventDefault(); e.stopImmediatePropagation(); const k = st.sel;
  if (h.t[0] === 'p' && (e.altKey || e.button === 2)) { colsEditar(k, L => { const c = L[h.i]; if (c.pts.length > 3) c.pts.splice(+h.t.slice(1), 1); }); panel(); dibujar(); return; }
  if (st.colSel !== h.i) { st.colSel = h.i; panel(); }
  hist(); st.cdrag = { ...h, px, py, base: JSON.parse(JSON.stringify(colsDe(k)[h.i])), m: st.espejo ? -1 : 1 }; dibujar();
}, true);
vista.addEventListener('contextmenu', e => { if (st.modo === 'sprites') e.preventDefault(); });
addEventListener('mousemove', e => {
  const d = st.cdrag; if (!d) { if (st.modo === 'sprites' && st.sel && W() && e.target === vista) { const dpr = devicePixelRatio || 1, h = colHit(e.offsetX * dpr, e.offsetY * dpr); if (h) vista.style.cursor = h.t === 'mover' || h.t === 'centro' || h.t[0] === 'p' ? 'move' : h.t === 'rot' ? 'grab' : 'nwse-resize'; } return; }
  const dpr = devicePixelRatio || 1, r = vista.getBoundingClientRect(), px = (e.clientX - r.left) * dpr, py = (e.clientY - r.top) * dpr, stp = e.shiftKey ? 0.1 : st.snap ? 1.6 : 0.5, q = v => rr(Math.round(v / stp) * stp), m = d.m;
  const dx = (px - d.px) / Z * m, dy = (py - d.py) / Z, B = d.base, lx = (wxOf(px) - 16) * m - (B.x || 0), ly = wyOf(py) - 26 - (B.y || 0);
  const rot = (B.rot || 0) * Math.PI / 180, llx = lx * Math.cos(-rot) - ly * Math.sin(-rot), lly = lx * Math.sin(-rot) + ly * Math.cos(-rot);
  const st0 = st.drag; st.drag = { h: 'col' }; // hist() no apila cada movimiento
  colsEditar(st.sel, L => { const c = L[d.i];
    if (d.t === 'mover' || d.t === 'centro') { c.x = q((B.x || 0) + dx); c.y = q((B.y || 0) + dy); }
    else if (d.t === 'w') c.w = Math.max(1, q(Math.abs(llx) * 2)); else if (d.t === 'h') c.h = Math.max(1, q(Math.abs(lly) * 2));
    else if (d.t === 'r') c.r = Math.max(0.5, q(Math.hypot(lx, ly)));
    else if (d.t === 'rot') { let a = Math.atan2(ly, lx) * 180 / Math.PI + 90; if (!e.shiftKey) a = Math.round(a / 15) * 15; a = ((a + 180) % 360 + 360) % 360 - 180; c.rot = a || undefined; }
    else if (d.t[0] === 'p') { const j = +d.t.slice(1); c.pts[j] = [q((wxOf(px) - 16) * m - (c.x || 0)), q(wyOf(py) - 26 - (c.y || 0))]; }
  });
  st.drag = st0; dibujar(); colPanelValores();
});
addEventListener('mouseup', () => { if (st.cdrag) { st.cdrag = null; panel(); lista(); } });
vista.addEventListener('dblclick', e => { // polígono: doble clic cerca de un borde añade un punto ahí
  if (st.modo !== 'sprites' || !st.sel) return; const c = colsDe(st.sel)[st.colSel]; if (!c || c.forma !== 'poligono') return;
  const dpr = devicePixelRatio || 1, m = st.espejo ? -1 : 1, lx = (wxOf(e.offsetX * dpr) - 16) * m - (c.x || 0), ly = wyOf(e.offsetY * dpr) - 26 - (c.y || 0), P = c.pts; let best = -1, bd = 1e9;
  for (let i = 0; i < P.length; i++) { const [ax, ay] = P[i], [bx, by] = P[(i + 1) % P.length], t = Math.max(0, Math.min(1, ((lx - ax) * (bx - ax) + (ly - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1))), d2 = (ax + t * (bx - ax) - lx) ** 2 + (ay + t * (by - ay) - ly) ** 2; if (d2 < bd) { bd = d2; best = i; } }
  if (best < 0 || bd > (12 / Z) ** 2 * 9) return; e.stopImmediatePropagation(); colsEditar(st.sel, L => L[st.colSel].pts.splice(best + 1, 0, [rr(lx), rr(ly)])); dibujar(); panel();
}, true);

// ---------- panel ----------
function colPanel() {
  const k = st.sel, L = colsDe(k), modoC = colsModo(k), c = L[st.colSel];
  let cmds = []; try { const C = J('CMDS'); cmds = Object.keys(C).filter(n => !C[n].alias); } catch (e) { } cmds = cmds.concat((AJ().comandos || []).map(x => x.nombre));
  const num2 = (id, v, step = 0.5, min = -500) => `<input type="number" id="${id}" value="${v ?? 0}" step="${step}" min="${min}" max="500">`;
  let h = `<div class="sec" id="secCols"><h3>Colisores <small>${modoC === 'auto' ? 'automático: la base del tronco' : modoC === 'ninguno' ? 'sin colisores: se atraviesa' : L.length + ' propio(s)'}</small></h3>
    <div class="fila">${Object.keys(FORMAS).map(f => `<button data-add="${f}" title="Añadir ${FORMAS[f]}">＋ ${FORMAS[f]}</button>`).join('')}</div>
    <div class="fila">${isTree(k) ? `<button id="colAuto" ${modoC === 'auto' ? 'disabled' : ''} title="Volver al automático (base del tronco)">Automático</button>` : ''}<button id="colNinguno" ${modoC === 'ninguno' ? 'disabled' : ''}>Sin colisores</button></div>`;
  if (L.length) h += `<table class="ctab">${L.map((x, i) => `<tr class="${i === st.colSel ? 'sel' : ''}" data-ci="${i}"><td>${i + 1}. ${FORMAS[x.forma] || x.forma}${x.trigger ? ' <small class="trg">trigger</small>' : ''}</td><td><label class="chk small" title="Activo"><input type="checkbox" data-act="${i}" ${x.activo !== false ? 'checked' : ''}> activo</label></td><td>${modoC === 'auto' ? '' : `<button class="x" data-del="${i}" title="Quitar">✕</button>`}</td></tr>`).join('')}</table>`;
  if (c) {
    const v = c.forma === 'capsula', poli = c.forma === 'poligono';
    h += `<div class="colprops">
      <div class="campo"><span>Forma</span><select id="cfForma">${Object.keys(FORMAS).map(f => `<option value="${f}" ${f === c.forma ? 'selected' : ''}>${FORMAS[f]}</option>`).join('')}</select></div>
      <div class="par"><label>Offset X ${num2('cfX', c.x)}</label><label>Offset Y ${num2('cfY', c.y)}</label>
      ${c.forma === 'circulo' ? `<label>Radio ${num2('cfR', c.r, 0.5, 0.5)}</label>` : poli ? '' : `<label>Ancho ${num2('cfW', c.w, 0.5, 1)}</label><label>Alto ${num2('cfH', c.h, 0.5, 1)}</label>`}
      ${c.forma === 'circulo' || poli ? '' : `<label>Rotación ${num2('cfRot', c.rot || 0, 1, -180)}</label>`}
      ${v ? `<label>Dirección <select id="cfDir"><option value="v" ${c.dir !== 'h' ? 'selected' : ''}>Vertical</option><option value="h" ${c.dir === 'h' ? 'selected' : ''}>Horizontal</option></select></label>` : ''}</div>
      ${poli ? `<p class="nota">${c.pts.length} puntos · arrástralos en la vista · doble clic en un borde añade uno · Alt+clic (o clic derecho) en un punto lo quita.</p>` : ''}
      <label class="chk"><input type="checkbox" id="cfTrig" ${c.trigger ? 'checked' : ''}> Is Trigger (no bloquea: detecta cuando entras)</label>
      ${c.trigger ? `<label class="lbl">Al entrar el jugador, ejecutar<input id="cfCmd" list="dlCmds" value="${esc(c.cmd || '')}" placeholder="hora noche · dar madera 5 · micomando"><datalist id="dlCmds">${cmds.map(n => `<option value="${esc(n)}">`).join('')}</datalist></label>` : ''}
      <div class="campo"><span>Choca con</span><span class="capas"><label class="chk small"><input type="checkbox" data-capa="j" ${!c.capas || c.capas.j !== false ? 'checked' : ''}> jugador</label><label class="chk small"><input type="checkbox" data-capa="c" ${!c.capas || c.capas.c !== false ? 'checked' : ''}> criaturas</label><label class="chk small"><input type="checkbox" data-capa="p" ${!c.capas || c.capas.p !== false ? 'checked' : ''}> proyectiles</label></span></div>
      <div class="fila">${isTree(k) ? '<button id="cfBase" title="Ajustarlo a la base del tronco del dibujo">Ajustar a la base</button>' : ''}<button id="cfDup">Duplicar</button><span class="esp"></span>${modoC === 'auto' ? '' : '<button id="cfDel" class="mal">Quitar</button>'}</div></div>`;
  }
  h += `<p class="nota">Rojo: bloquea · verde agua discontinuo: trigger · gris: desactivado. Arrastra el cuerpo para moverlo; asas: tamaño, rotación (la dorada), puntos.</p></div>`;
  return h;
}
function colPanelValores() {
  const c = colsDe(st.sel || '')[st.colSel]; if (!c || !$('#cfX')) return; const set = (id, v) => { const e = $('#' + id); if (e && document.activeElement !== e) e.value = rr(v || 0); };
  set('cfX', c.x); set('cfY', c.y); set('cfW', c.w); set('cfH', c.h); set('cfR', c.r); set('cfRot', c.rot);
}
{ const p0 = panel; panel = () => { p0(); if (st.modo !== 'sprites' || !st.sel || !$('#sCol')) return;
  const old = $('#sCol').closest('.sec'); old.style.display = 'none'; // el choque viejo queda escondido (sus campos los usa otra parte)
  const L = colsDe(st.sel); if (st.colSel >= L.length) st.colSel = Math.max(0, L.length - 1);
  old.insertAdjacentHTML('afterend', colPanel()); colEnlazar(); }; }
function colEnlazar() {
  const k = st.sel, upd = () => { dibujar(); }, re = () => { panel(); dibujar(); lista(); }, n = id => +$('#' + id).value;
  document.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { colsEditar(k, L => { const c = NUEVO_COL[b.dataset.add](); L.push(c); st.colSel = L.length - 1; }); re(); });
  const au = $('#colAuto'); if (au) au.onclick = () => { ajSet(k, a => { delete a.cols; delete a.col; }); st.colSel = 0; re(); };
  $('#colNinguno').onclick = () => { ajSet(k, a => { delete a.col; a.cols = []; }); re(); };
  document.querySelectorAll('[data-ci]').forEach(tr => tr.onclick = e => { if (e.target.closest('input,button')) return; st.colSel = +tr.dataset.ci; re(); });
  document.querySelectorAll('[data-act]').forEach(i => i.onchange = () => { colsEditar(k, L => { L[+i.dataset.act].activo = i.checked ? undefined : false; }); re(); });
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { colsEditar(k, L => L.splice(+b.dataset.del, 1)); st.colSel = 0; re(); });
  const c = colsDe(k)[st.colSel]; if (!c) return;
  const ed = f => { colsEditar(k, L => f(L[st.colSel])); upd(); };
  const on = (id, f) => { const e = $('#' + id); if (e) e.onchange = f; };
  on('cfForma', e => { colsEditar(k, L => { const o = L[st.colSel], nv = NUEVO_COL[e.target.value](); nv.x = o.x; nv.y = o.y; for (const q of ['activo', 'trigger', 'capas', 'cmd']) if (o[q] !== undefined) nv[q] = o[q]; L[st.colSel] = nv; }); re(); });
  on('cfX', () => ed(c => c.x = n('cfX'))); on('cfY', () => ed(c => c.y = n('cfY')));
  on('cfW', () => ed(c => c.w = Math.max(1, n('cfW')))); on('cfH', () => ed(c => c.h = Math.max(1, n('cfH')))); on('cfR', () => ed(c => c.r = Math.max(0.5, n('cfR'))));
  on('cfRot', () => ed(c => c.rot = n('cfRot') || undefined)); on('cfDir', e => ed(c => c.dir = e.target.value));
  on('cfTrig', e => { ed(c => c.trigger = e.target.checked || undefined); re(); }); on('cfCmd', e => ed(c => c.cmd = e.target.value.trim().replace(/^\//, '') || undefined));
  document.querySelectorAll('[data-capa]').forEach(i => i.onchange = () => ed(c => { c.capas = { ...(c.capas || {}) }; c.capas[i.dataset.capa] = i.checked ? undefined : false; for (const q in c.capas) if (c.capas[q] === undefined) delete c.capas[q]; if (!Object.keys(c.capas).length) delete c.capas; }));
  const b = $('#cfBase'); if (b) b.onclick = () => { const A = colsAuto(k)[0]; if (!A) return; colsEditar(k, L => { const o = L[st.colSel]; Object.assign(o, { forma: 'elipse', x: A.x, y: A.y, w: A.w, h: A.h }); delete o.r; delete o.pts; delete o.rot; }); re(); };
  on('cfDup', () => {}); $('#cfDup').onclick = () => { colsEditar(k, L => { const d = JSON.parse(JSON.stringify(L[st.colSel])); d.x = (d.x || 0) + 4; L.push(d); st.colSel = L.length - 1; }); re(); };
  const del = $('#cfDel'); if (del) del.onclick = () => { colsEditar(k, L => L.splice(st.colSel, 1)); st.colSel = Math.max(0, st.colSel - 1); re(); };
}
// Revisar: colisores raros
{ const r0 = revisar; revisar = () => { const P = r0(), extra = [];
  for (const k in AJ().sprites) { const a = AJ().sprites[k]; if (!Array.isArray(a.cols)) continue;
    a.cols.forEach((c, i) => { const n = `${k} · colisor ${i + 1}`;
      if (!FORMAS[c.forma]) extra.push(`${n}: forma desconocida`);
      else if (c.forma === 'poligono' && !(c.pts && c.pts.length >= 3)) extra.push(`${n}: el polígono necesita 3 puntos o más`);
      else if (c.forma === 'circulo' ? !(c.r > 0) : c.forma !== 'poligono' && !(c.w > 0 && c.h > 0)) extra.push(`${n}: tamaño no válido`);
      if (c.trigger && c.cmd) { const nm = String(c.cmd).split(/\s+/)[0].toLowerCase(); let C = {}; try { C = J('CMDS'); } catch (e) { } if (!C[nm] && !(AJ().comandos || []).some(x => x.nombre === nm)) extra.push(`${n}: el comando /${nm} no existe`); } }); }
  if (extra.length) { const L = $('#rLista'), html = extra.map(t => `<div class="prob error"><b>✕ Error</b> ${esc(t)}</div>`).join(''); if (L.querySelector('.ok-txt')) L.innerHTML = html; else L.insertAdjacentHTML('beforeend', html); }
  return P.concat(extra.map(txt => ({ nivel: 'error', txt, k: null }))); }; }
