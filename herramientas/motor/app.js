'use strict';
// =====================================================================================
//  Motor de sprites · editor. El juego se carga escondido (iframe) para leer sus datos de serie
//  (biomas, suelos, categorías) y dibujar los sprites exactamente como en la partida.
//  Lo que se cambia va en st.AJ y, al Guardar, a sprites/ajustes.js (lo aplica js/render/motor-ajustes.js).
// =====================================================================================
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const st = { AJ: null, W: null, sel: null, filtro: 'todo', zoom: 5, espejo: false, player: { x: 16, y: 50 }, dirty: false, drag: null, cerrados: new Set(), fix: new Map() };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function toast(t, mal) { const e = $('#toast'); e.textContent = t; e.className = mal ? 'mal' : ''; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => e.hidden = true, 2600); }
function sucio(v = true) { st.dirty = v; $('#bGuardar').disabled = !v; $('#estado').textContent = v ? 'Cambios sin guardar' : 'Todo guardado'; }
const r1 = v => Math.round(v * 10) / 10;

// ---------- Datos ----------
const AJ = () => st.AJ;
function norm(a) { a = a && typeof a === 'object' ? a : {}; a.v = 1; a.sprites = a.sprites || {}; a.suelo = a.suelo || {}; a.suelo.cats = a.suelo.cats || {}; a.suelo.grounds = a.suelo.grounds || {}; a.biomas = a.biomas || {}; return a; }
const ajGet = k => AJ().sprites[k] || {};
const ajSet = (k, f) => { const a = AJ().sprites[k] || (AJ().sprites[k] = {}); f(a); for (const q in a) if (a[q] === undefined || a[q] === null || a[q] === '') delete a[q]; if (!Object.keys(a).length) delete AJ().sprites[k]; sucio(); };
const isTree = k => k.startsWith('arboles/');
const tipoDe = k => k.slice(k.indexOf('/') + 1).replace(/_?\d+$/, '');
const W = () => st.W;
// los datos del juego que son «const» no cuelgan de window: se leen desde su propio ámbito (y se guardan)
const J = n => { if (!st.jc) st.jc = new Map(); if (!st.jc.has(n)) st.jc.set(n, st.W.eval(n)); return st.jc.get(n); };
function treeT(slug) { const w = W(); return J('GI').findIndex(g => g && g.tree && J('_cslug')(g.n) === slug); }
function catDef(cat) { const d = J('MOTOR_DEF').cats || { px1: [], flat: [], sway: {}, give: {}, tall: [] }; return { px: d.px1.includes(cat) ? 1 : 1.6, up: !d.flat.includes(cat), centro: d.tall.includes(cat), viento: d.sway[cat] ? d.sway[cat][0] : 0, dar: d.give[cat] || null }; }
function catVal(cat) { const d = catDef(cat), o = AJ().suelo.cats[cat] || {}; return { px: o.px ?? d.px, up: o.up ?? d.up, centro: o.centro ?? d.centro, viento: o.viento ?? d.viento, dar: o.dar ?? d.dar }; }
function catSet(cat, f) { const o = AJ().suelo.cats[cat] || (AJ().suelo.cats[cat] = {}); f(o); for (const q in o) if (o[q] === undefined) delete o[q]; if (!Object.keys(o).length) delete AJ().suelo.cats[cat]; sucio(); }
function groundVal(g) { const o = AJ().suelo.grounds[g]; if (o) return { dens: o.dens, w: { ...o.w } }; const d = J('MOTOR_DEF').suelo[g]; return d ? { dens: d[0], w: { ...d[1] } } : { dens: 0.1, w: {} }; }
function biomeTrees(bk) { const o = AJ().biomas[bk]; return o && o.arboles ? { ...o.arboles } : { ...(J('MOTOR_DEF').biomas[bk] || {}) }; }
const nomSuelo = g => { const w = W(), t = J('G')[g]; return t !== undefined && J('GI')[t] ? J('GI')[t].n : g; };

// ---------- Cargar el juego escondido ----------
function cargarJuego() {
  return new Promise(ok => {
    const f = $('#juego'); st.W = null; f.src = '/index.html?motor=1&t=' + Date.now();
    const poll = () => { let w = null; try { w = f.contentWindow; } catch (e) { } try { if (w && w.eval && w.eval("typeof CSPR !== 'undefined' && CSPR.ready && typeof MOTOR_DEF !== 'undefined' && typeof gdSets === 'function' && !!gdSets()")) { st.W = w; st.jc = new Map(); st.fix.clear(); return ok(); } } catch (e) { } setTimeout(poll, 150); };
    setTimeout(poll, 300);
  });
}
function imgDe(k) { const s = J('CSPR').sets.get(k); return s && s.raw; }
function treeImg(k) { let c = st.fix.get(k); if (!c) { c = W().csShadowFix(imgDe(k)); c.__key = k; st.fix.set(k, c); } return c; }

// ---------- Lista ----------
function claves() { return [...J('CSPR').sets.keys()].filter(k => k.startsWith('arboles/') || k.startsWith('suelo/')).sort((a, b) => a.localeCompare(b, 'es', { numeric: true })); }
function lista() {
  const q = $('#buscar').value.trim().toLowerCase(), grupos = new Map();
  for (const k of claves()) {
    if (st.filtro !== 'todo' && !k.startsWith(st.filtro + '/')) continue; if (q && !k.includes(q)) continue;
    const g = (isTree(k) ? 'Árbol · ' : 'Suelo · ') + tipoDe(k); if (!grupos.has(g)) grupos.set(g, []); grupos.get(g).push(k);
  }
  const L = $('#lista'); L.innerHTML = '';
  if (!grupos.size) { L.innerHTML = '<p class="mut pad">Nada con ese nombre.</p>'; return; }
  for (const [g, ks] of grupos) {
    const box = document.createElement('div'); box.className = 'grupo';
    box.innerHTML = `<h4>${esc(g)} <small>${ks.length}</small></h4>`; const rj = document.createElement('div'); rj.className = 'rejilla' + (st.cerrados.has(g) ? ' cerrada' : '');
    box.firstChild.onclick = () => { st.cerrados.has(g) ? st.cerrados.delete(g) : st.cerrados.add(g); rj.classList.toggle('cerrada'); };
    for (const k of ks) {
      const c = document.createElement('div'), a = ajGet(k); c.className = 'cel' + (k === st.sel ? ' sel' : '') + (a.oculto ? ' oc' : ''); c.title = k; c.dataset.k = k;
      const im = imgDe(k), cv = document.createElement('canvas'), m = Math.max(im.width, im.height), s = Math.max(1, Math.floor(56 / m)); cv.width = im.width * s; cv.height = im.height * s;
      const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0, cv.width, cv.height); c.appendChild(cv);
      if (Object.keys(a).length) c.insertAdjacentHTML('beforeend', '<span class="m">●</span>');
      c.onclick = () => elegir(k); rj.appendChild(c);
    }
    box.appendChild(rj); L.appendChild(box);
  }
}
function elegir(k) { st.sel = k; $$('.cel').forEach(c => c.classList.toggle('sel', c.dataset.k === k)); st.player = { x: 16, y: 52 }; panel(); dibujar(); }

// ---------- Geometría (igual que en el juego) ----------
function geom(k) {
  const a = ajGet(k), flip = st.espejo ? 1 : 0;
  if (isTree(k)) {
    const s = W().csTreeMake(treeImg(k), flip, 1, a), auto = W().csTreeMake(treeImg(k), flip, 1, { ...a, col: undefined }).col;
    return { tree: true, cv: s.cv, X: 16 - s.ax, Y: 26 - s.ay, w: s.dw, h: s.dh, col: a.col === false ? null : s.col, auto, sortY: 26 + (s.sortDy || 0), flip };
  }
  const cat = tipoDe(k), cv = catVal(cat), im = imgDe(k), e = a.esc || 1, w = im.width * cv.px * e, h = im.height * cv.px * e, m = flip ? -1 : 1;
  const col = a.col ? { cx: a.col.cx * m, cy: a.col.cy, rx: a.col.rx, ry: a.col.ry } : null;
  return { tree: false, cv: im, X: 16 - w / 2 + (a.dx || 0) * m, Y: 26 - h + (a.dy || 0), w, h, col, auto: null, sortY: 26 + (a.orden || 0), flip, up: cv.up };
}

// ---------- Vista ----------
const vista = $('#vista'), vx = vista.getContext('2d');
let O = { x: 0, y: 0 }, Z = 5;
const sx = wx => O.x + (wx - 16) * Z, sy = wy => O.y + (wy - 26) * Z, wxOf = px => (px - O.x) / Z + 16, wyOf = py => (py - O.y) / Z + 26;
function dibujar() {
  const dpr = devicePixelRatio || 1, W2 = vista.clientWidth * dpr, H2 = vista.clientHeight * dpr;
  if (vista.width !== W2 || vista.height !== H2) { vista.width = W2; vista.height = H2; }
  Z = st.zoom * dpr; O = { x: Math.round(W2 / 2), y: Math.round(H2 * 0.6) };
  const c = vx; c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; c.fillStyle = '#0b0c0d'; c.fillRect(0, 0, W2, H2);
  // suelo: casillas de 32 unidades
  const t0x = Math.floor(wxOf(0) / 32) - 1, t1x = Math.ceil(wxOf(W2) / 32) + 1, t0y = Math.floor(wyOf(0) / 32) - 1, t1y = Math.ceil(wyOf(H2) / 32) + 1;
  for (let ty = t0y; ty <= t1y; ty++) for (let tx = t0x; tx <= t1x; tx++) { c.fillStyle = (tx + ty) & 1 ? '#3b6531' : '#3f6b35'; c.fillRect(sx(tx * 32), sy(ty * 32), 32 * Z + 1, 32 * Z + 1); }
  c.strokeStyle = '#ffffff14'; c.lineWidth = 1; c.beginPath(); for (let tx = t0x; tx <= t1x; tx++) { c.moveTo(sx(tx * 32) + .5, 0); c.lineTo(sx(tx * 32) + .5, H2); } for (let ty = t0y; ty <= t1y; ty++) { c.moveTo(0, sy(ty * 32) + .5); c.lineTo(W2, sy(ty * 32) + .5); } c.stroke();
  c.setLineDash([4 * dpr, 4 * dpr]); c.strokeStyle = '#e0b54c88'; c.strokeRect(sx(0) + .5, sy(0) + .5, 32 * Z, 32 * Z); c.setLineDash([]);
  if (!st.sel || !W()) return;
  const g = geom(st.sel), p = st.player, behind = p.y < g.sortY || g.up === false && false;
  const pintaSprite = () => { c.save(); if (!g.tree && g.flip) { c.translate(sx(g.X + g.w / 2), 0); c.scale(-1, 1); c.drawImage(g.cv, -g.w / 2 * Z, sy(g.Y), g.w * Z, g.h * Z); } else c.drawImage(g.cv, sx(g.X), sy(g.Y), g.w * Z, g.h * Z); c.restore(); };
  const plano = !g.tree && g.up === false; // lo plano siempre queda debajo
  if (plano) { pintaSprite(); pintaJugador(c, p); }
  else if (behind) { pintaJugador(c, p); pintaSprite(); } else { pintaSprite(); pintaJugador(c, p); }
  // marco del dibujo
  c.strokeStyle = '#ffffff22'; c.strokeRect(sx(g.X) + .5, sy(g.Y) + .5, g.w * Z, g.h * Z);
  // ancla (centro de la casilla, base)
  c.strokeStyle = '#e0b54c'; c.lineWidth = 2; c.beginPath(); c.moveTo(sx(16) - 6, sy(26)); c.lineTo(sx(16) + 6, sy(26)); c.moveTo(sx(16), sy(26) - 6); c.lineTo(sx(16), sy(26) + 6); c.stroke();
  // línea de orden
  if (!plano) { c.strokeStyle = '#3bc8ff'; c.lineWidth = 2; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(sx(g.X - 8), sy(g.sortY)); c.lineTo(sx(g.X + g.w + 8), sy(g.sortY)); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#3bc8ff'; c.font = `${12 * dpr}px "Taller Pixel"`; c.fillText('línea de orden', sx(g.X + g.w + 10), sy(g.sortY) + 4 * dpr); hnd(c, sx(g.X + g.w + 8), sy(g.sortY), '#3bc8ff'); }
  // choque
  if (g.col) { const cx = 16 + g.col.cx, cy = 26 + g.col.cy; c.fillStyle = '#ff3b3b30'; c.strokeStyle = '#ff3b3b'; c.lineWidth = 2; c.beginPath(); c.ellipse(sx(cx), sy(cy), g.col.rx * Z, g.col.ry * Z, 0, 0, 7); c.fill(); c.stroke();
    hnd(c, sx(cx), sy(cy), '#ff3b3b'); hnd(c, sx(cx + g.col.rx), sy(cy), '#ff3b3b'); hnd(c, sx(cx), sy(cy + g.col.ry), '#ff3b3b'); }
  // pies del personaje
  c.strokeStyle = '#ffe14a'; c.lineWidth = 2; c.beginPath(); c.moveTo(sx(p.x - 9), sy(p.y)); c.lineTo(sx(p.x + 9), sy(p.y)); c.stroke();
  c.fillStyle = '#ffe14a'; c.font = `${12 * dpr}px "Taller Pixel"`; c.fillText(plano ? 'plano: siempre debajo' : behind ? 'detrás (el sprite te tapa)' : 'delante (tú lo tapas)', sx(p.x + 11), sy(p.y) + 4 * dpr);
}
function hnd(c, x, y, col) { c.fillStyle = '#000'; c.fillRect(x - 5, y - 5, 10, 10); c.fillStyle = col; c.fillRect(x - 3.5, y - 3.5, 7, 7); }
function pintaJugador(c, p) {
  // el personaje de verdad, dibujado por el juego, a la misma escala
  const w = W(); c.save(); c.setTransform(Z, 0, 0, Z, O.x - 16 * Z, O.y - 26 * Z);
  try { w.drawAvatar(c, { ...J('DEFAULT_LOOK') }, {}, p.x, p.y, Math.PI / 2, 0, false, 1.6, null, 0); }
  catch (e) { c.fillStyle = '#d9c9a0'; c.fillRect(p.x - 7, p.y - 30, 14, 30); }
  c.restore();
}

// ---------- Ratón: arrastrar dibujo, choque, línea de orden y personaje ----------
function hit(px, py) {
  const g = geom(st.sel), near = (x, y) => Math.abs(px - x) < 9 && Math.abs(py - y) < 9;
  if (g.col) { const cx = 16 + g.col.cx, cy = 26 + g.col.cy; if (near(sx(cx + g.col.rx), sy(cy))) return 'rx'; if (near(sx(cx), sy(cy + g.col.ry))) return 'ry'; if (near(sx(cx), sy(cy))) return 'cc'; }
  if (near(sx(g.X + g.w + 8), sy(g.sortY)) || (Math.abs(py - sy(g.sortY)) < 5 && px > sx(g.X - 8) && px < sx(g.X + g.w + 8))) return 'sort';
  const p = st.player; if (px > sx(p.x - 9) && px < sx(p.x + 9) && py > sy(p.y - 34) && py < sy(p.y + 3)) return 'player';
  if (px > sx(g.X) && px < sx(g.X + g.w) && py > sy(g.Y) && py < sy(g.Y + g.h)) return 'sprite';
  return null;
}
vista.addEventListener('mousedown', e => {
  if (!st.sel) return; const dpr = devicePixelRatio || 1, px = e.offsetX * dpr, py = e.offsetY * dpr, h = hit(px, py); if (!h) return;
  const g = geom(st.sel); st.drag = { h, px, py, g, a: JSON.parse(JSON.stringify(ajGet(st.sel))), p: { ...st.player } }; e.preventDefault();
});
addEventListener('mousemove', e => {
  const dpr = devicePixelRatio || 1;
  if (!st.drag) { if (st.sel && W() && e.target === vista) { const h = hit(e.offsetX * dpr, e.offsetY * dpr); vista.style.cursor = h === 'sprite' || h === 'player' || h === 'cc' ? 'move' : h === 'rx' ? 'ew-resize' : h === 'ry' || h === 'sort' ? 'ns-resize' : 'default'; } return; }
  const r = vista.getBoundingClientRect(), px = (e.clientX - r.left) * dpr, py = (e.clientY - r.top) * dpr, d = st.drag, stp = e.shiftKey ? 0.1 : 0.5, q = v => Math.round(v / stp) * stp;
  const dx = (px - d.px) / Z, dy = (py - d.py) / Z, k = st.sel, m = d.g.flip ? -1 : 1;
  if (d.h === 'player') { st.player = { x: q(d.p.x + dx), y: q(d.p.y + dy) }; dibujar(); return; }
  ajSet(k, a => {
    if (d.h === 'sprite') { a.dx = r1(q((d.a.dx || 0) + dx * m)); a.dy = r1(q((d.a.dy || 0) + dy)); if (d.a.col) a.col = { ...d.a.col, cx: r1(d.a.col.cx + dx * m), cy: r1(d.a.col.cy + dy) }; }
    else if (d.h === 'sort') a.orden = r1(q((d.a.orden || 0) + dy));
    else { const base = d.a.col || (d.g.col ? { cx: d.g.col.cx * m, cy: d.g.col.cy, rx: d.g.col.rx, ry: d.g.col.ry } : null); if (!base) return;
      const c = { ...base };
      if (d.h === 'cc') { c.cx = r1(q(base.cx + dx * m)); c.cy = r1(q(base.cy + dy)); }
      if (d.h === 'rx') c.rx = r1(Math.max(1, q(base.rx + dx * Math.sign((px - sx(16 + base.cx * m)) || 1) * (Math.sign(px - d.px) === Math.sign(dx) ? 1 : 1))));
      if (d.h === 'ry') c.ry = r1(Math.max(1, q(base.ry + dy)));
      a.col = c; }
  });
  dibujar(); panelValores();
});
addEventListener('mouseup', () => { if (st.drag) { st.drag = null; lista(); } });
vista.addEventListener('wheel', e => { e.preventDefault(); st.zoom = Math.max(1, Math.min(12, st.zoom + (e.deltaY < 0 ? 1 : -1))); dibujar(); }, { passive: false });
addEventListener('resize', dibujar);

// ---------- Panel de propiedades ----------
function num(id, v, step = 0.5, min = -999, max = 999) { return `<input type="number" id="${id}" value="${v}" step="${step}" min="${min}" max="${max}">`; }
function panel() {
  const k = st.sel, D = $('#der'); if (!k) { D.innerHTML = '<p class="mut pad">Elige un sprite de la lista.</p>'; return; }
  const a = ajGet(k), g = geom(k), im = imgDe(k), tree = isTree(k), tipo = tipoDe(k);
  const colModo = a.col === false ? 'no' : a.col ? 'propio' : tree ? 'auto' : 'no';
  let h = `<div class="sec"><h3>${esc(k)} <small>${im.width}×${im.height} px</small></h3>
    <div class="fila"><button id="bProbar2" class="ok">▶ Probar</button><label class="chk"><input type="checkbox" id="cOculto" ${a.oculto ? 'checked' : ''}> Oculto (no sale en el juego)</label></div>
    <div class="fila"><label class="chk"><input type="checkbox" id="cEspejo" ${st.espejo ? 'checked' : ''}> Ver en espejo</label><span class="esp"></span><button id="bReset" title="Quitar todos los ajustes de esta imagen">Valores de serie</button><button id="bBorrar" class="mal" title="Se mueve a la papelera del motor">Retirar</button></div></div>
  <div class="sec"><h3>Tamaño y posición</h3>
    <div class="campo"><span>Escala</span><input type="range" id="iEscR" min="0.25" max="3" step="0.05" value="${a.esc || 1}">${num('iEsc', a.esc || 1, 0.05, 0.1, 6)}</div>
    <div class="par"><label>Mover X ${num('iDx', a.dx || 0)}</label><label>Mover Y ${num('iDy', a.dy || 0)}</label></div>
    <p class="nota">Unidades del juego (una casilla = 32; un píxel del personaje = 1,6). También puedes arrastrar el dibujo en la vista.</p></div>
  <div class="sec"><h3>Choque <small>${tree ? 'por defecto: la base del tronco' : 'por defecto: no choca'}</small></h3>
    <div class="campo"><span>Modo</span><select id="sCol">${tree ? `<option value="auto" ${colModo === 'auto' ? 'selected' : ''}>Automático (base del dibujo)</option>` : ''}<option value="propio" ${colModo === 'propio' ? 'selected' : ''}>Propio (lo ajusto yo)</option><option value="no" ${colModo === 'no' ? 'selected' : ''}>Sin choque (se atraviesa)</option></select></div>
    <div class="par" id="colNums"><label>Centro X ${num('iCx', 0)}</label><label>Centro Y ${num('iCy', 0)}</label><label>Ancho ½ ${num('iRx', 0, 0.5, 1)}</label><label>Alto ½ ${num('iRy', 0, 0.5, 1)}</label></div>
    <p class="nota">Elipse roja: por dónde no se puede pasar. Arrastra su centro o sus bordes en la vista.</p></div>
  <div class="sec"><h3>Delante o detrás</h3>
    <div class="campo"><span>Línea de orden</span>${num('iOrden', a.orden || 0)}</div>
    <p class="nota">Si los pies del personaje (línea amarilla) quedan por encima de la línea azul, el sprite lo tapa; por debajo, el personaje va delante. Vale también para animales y enemigos que se dibujan con él. Arrastra la línea o el personaje para probar.</p></div>
  <div class="sec"><h3>Viento</h3>
    <div class="campo"><span>Cuánto se mece</span><input type="range" id="iVienR" min="0" max="3" step="0.1" value="${a.viento ?? 1}">${num('iVien', a.viento ?? 1, 0.1, 0, 5)}</div>
    <p class="nota">1 = normal · 0 = quieto · 2 = el doble.</p></div>`;
  h += tree ? panelArbol(tipo) : panelSuelo(tipo);
  D.innerHTML = h; panelValores(); enlazar();
}
function panelArbol(slug) {
  const w = W(), t = treeT(slug), key = t >= 0 ? J('GI')[t].key : null;
  if (!key) return `<div class="sec"><h3>Biomas</h3><p class="nota">«${esc(slug)}» no es un tipo de árbol del juego: renombra el archivo como uno de ellos (roble, abeto, palmera…).</p></div>`;
  const rows = []; for (const b of J('BIOMES')) { if (!b || !b.key) continue; const m = biomeTrees(b.key); if (m[key] > 0) rows.push(`<tr><td>${esc(b.n)}</td><td>${num('bd_' + b.key, r1(m[key] * 1000) / 1000, 0.005, 0, 0.6)}</td><td><button class="x" data-quitab="${b.key}">✕</button></td></tr>`); }
  const opts = J('BIOMES').filter(b => b && b.key && !(biomeTrees(b.key)[key] > 0)).map(b => `<option value="${b.key}">${esc(b.n)}</option>`).join('');
  return `<div class="sec"><h3>Dónde sale · ${esc(J('GI')[t].n)} <small>todas sus imágenes</small></h3>
    <table><tr><th>Bioma</th><th>Densidad</th><th></th></tr>${rows.join('') || '<tr><td colspan="3" class="mut">En ningún bioma</td></tr>'}</table>
    <div class="fila"><select id="sBioma">${opts}</select><button id="bAddBioma">Añadir</button></div>
    <p class="nota">Densidad: parte de las casillas del bioma con este árbol (0,05 = 1 de cada 20). Solo cambia el terreno que aún no se ha generado.</p></div>`;
}
function panelSuelo(cat) {
  const w = W(), v = catVal(cat), grounds = Object.keys({ ...J('MOTOR_DEF').suelo, ...AJ().suelo.grounds });
  const rows = grounds.map(gk => { const gv = groundVal(gk), p = gv.w[cat] || 0; return `<tr class="${p ? '' : 'cero'}"><td>${esc(nomSuelo(gk))}</td><td>${num('gw_' + gk, p, 0.1, 0, 50)}</td><td>${num('gd_' + gk, gv.dens, 0.01, 0, 1)}</td></tr>`; }).join('');
  const items = Object.keys(J('ITEMS') || {}).sort();
  return `<div class="sec"><h3>Categoría «${esc(cat)}» <small>todas sus imágenes</small></h3>
    <div class="campo"><span>Tamaño del píxel</span><select id="sPx"><option value="1.6" ${v.px === 1.6 ? 'selected' : ''}>1,6 (como el personaje y los árboles)</option><option value="1" ${v.px === 1 ? 'selected' : ''}>1 (como las casillas del suelo)</option></select></div>
    <label class="chk"><input type="checkbox" id="cUp" ${v.up ? 'checked' : ''}> Se levanta del suelo (se ordena delante/detrás del personaje)</label>
    <label class="chk"><input type="checkbox" id="cCentro" ${v.centro ? 'checked' : ''}> Centrado en su casilla (para lo grande: arbustos)</label>
    <div class="campo"><span>Viento de la categoría</span>${num('iCatV', v.viento, 0.1, 0, 5)}</div>
    <div class="campo"><span>Al recogerlo da</span><input id="iDar" list="dlItems" value="${esc(v.dar ? v.dar[0] : '')}" style="width:120px">${num('iDarN', v.dar ? v.dar[2] || 1 : 1, 1, 1, 20)}</div>
    <datalist id="dlItems">${items.map(i => `<option value="${esc(i)}">${esc(J('ITEMS')[i].n || i)}</option>`).join('')}</datalist></div>
  <div class="sec"><h3>Dónde sale</h3>
    <table><tr><th>Suelo</th><th>Peso aquí</th><th>Densidad del suelo</th></tr>${rows}</table>
    <p class="nota">Peso: cuánto sale esta categoría frente a las demás de ese suelo (0 = no sale). Densidad del suelo: parte de sus casillas que llevan algo (es de todo el suelo, no solo de esta categoría).</p></div>`;
}
function panelValores() {
  const k = st.sel; if (!k || !$('#iCx')) return; const g = geom(k), a = ajGet(k), m = g.flip ? -1 : 1, c = a.col || (g.col ? { cx: g.col.cx * m, cy: g.col.cy, rx: g.col.rx, ry: g.col.ry } : null);
  const on = !!g.col; $('#colNums').style.opacity = on ? 1 : 0.4; for (const id of ['iCx', 'iCy', 'iRx', 'iRy']) $('#' + id).disabled = !on;
  if (c) { $('#iCx').value = r1(c.cx); $('#iCy').value = r1(c.cy); $('#iRx').value = r1(c.rx); $('#iRy').value = r1(c.ry); }
  if (document.activeElement !== $('#iDx')) $('#iDx').value = a.dx || 0; if (document.activeElement !== $('#iDy')) $('#iDy').value = a.dy || 0;
  if (document.activeElement !== $('#iOrden')) $('#iOrden').value = a.orden || 0;
  $('#sCol').value = a.col === false ? 'no' : a.col ? 'propio' : isTree(k) ? 'auto' : 'no';
}
function enlazar() {
  const k = st.sel, upd = () => { dibujar(); panelValores(); }, n = id => +$('#' + id).value;
  const on = (id, ev, f) => { const e = $('#' + id); if (e) e.addEventListener(ev, f); };
  on('cOculto', 'change', e => { ajSet(k, a => a.oculto = e.target.checked || undefined); lista(); });
  on('cEspejo', 'change', e => { st.espejo = e.target.checked; upd(); });
  on('bReset', 'click', () => { delete AJ().sprites[k]; sucio(); panel(); dibujar(); lista(); });
  on('bBorrar', 'click', borrar); on('bProbar2', 'click', abrirProbar);
  const esc2 = v => { ajSet(k, a => { const old = a.esc || 1; a.esc = v === 1 ? undefined : v; if (a.col) { const f = v / old; a.col = { cx: r1(a.col.cx * f), cy: r1(a.col.cy * f), rx: r1(a.col.rx * f), ry: r1(a.col.ry * f) }; } }); $('#iEsc').value = v; $('#iEscR').value = v; upd(); };
  on('iEscR', 'input', e => esc2(+e.target.value)); on('iEsc', 'change', e => esc2(Math.max(0.1, +e.target.value || 1)));
  on('iDx', 'change', () => { ajSet(k, a => a.dx = n('iDx') || undefined); upd(); }); on('iDy', 'change', () => { ajSet(k, a => a.dy = n('iDy') || undefined); upd(); });
  on('iOrden', 'change', () => { ajSet(k, a => a.orden = n('iOrden') || undefined); upd(); });
  const vien = v => { ajSet(k, a => a.viento = v === 1 ? undefined : v); $('#iVien').value = v; $('#iVienR').value = v; };
  on('iVienR', 'input', e => vien(+e.target.value)); on('iVien', 'change', e => vien(+e.target.value));
  on('sCol', 'change', e => { const v = e.target.value, g = geom(k), m = g.flip ? -1 : 1;
    ajSet(k, a => { if (v === 'auto') delete a.col; else if (v === 'no') a.col = false; else { const b = g.col || g.auto; a.col = b ? { cx: r1(b.cx * m), cy: r1(b.cy), rx: r1(b.rx), ry: r1(b.ry) } : { cx: 0, cy: -1, rx: r1(Math.max(3, g.w * 0.3)), ry: 3 }; } }); upd(); lista(); });
  for (const id of ['iCx', 'iCy', 'iRx', 'iRy']) on(id, 'change', () => { ajSet(k, a => a.col = { cx: n('iCx'), cy: n('iCy'), rx: Math.max(1, n('iRx')), ry: Math.max(1, n('iRy')) }); upd(); });
  // árboles: biomas
  if (isTree(k)) {
    const t = treeT(tipoDe(k)), key = t >= 0 ? J('GI')[t].key : null;
    const setB = (bk, d) => { const m = biomeTrees(bk); if (d > 0) m[key] = d; else delete m[key]; (AJ().biomas[bk] = AJ().biomas[bk] || {}).arboles = m; sucio(); };
    $$('#der input[id^="bd_"]').forEach(i => i.addEventListener('change', () => setB(i.id.slice(3), +i.value)));
    $$('#der [data-quitab]').forEach(b => b.addEventListener('click', () => { setB(b.dataset.quitab, 0); panel(); }));
    on('bAddBioma', 'click', () => { const bk = $('#sBioma').value; if (bk) { setB(bk, 0.05); panel(); } });
  } else {
    const cat = tipoDe(k);
    on('sPx', 'change', e => { const d = catDef(cat), v = +e.target.value; catSet(cat, o => o.px = v === d.px ? undefined : v); dibujar(); });
    on('cUp', 'change', e => { const d = catDef(cat); catSet(cat, o => o.up = e.target.checked === d.up ? undefined : e.target.checked); dibujar(); });
    on('cCentro', 'change', e => { const d = catDef(cat); catSet(cat, o => o.centro = e.target.checked === d.centro ? undefined : e.target.checked); });
    on('iCatV', 'change', e => { const d = catDef(cat), v = +e.target.value; catSet(cat, o => o.viento = v === d.viento ? undefined : v); });
    const dar = () => { const id = $('#iDar').value.trim(), nn = +$('#iDarN').value || 1; if (id && !(J('ITEMS') || {})[id]) { toast('Ese objeto no existe en el juego', true); return; } catSet(cat, o => o.dar = id ? [id, (J('ITEMS')[id] || {}).n || id, nn] : undefined); };
    on('iDar', 'change', dar); on('iDarN', 'change', dar);
    const setG = (gk, f) => { const v = groundVal(gk); f(v); AJ().suelo.grounds[gk] = { dens: +v.dens, w: v.w }; sucio(); };
    $$('#der input[id^="gw_"]').forEach(i => i.addEventListener('change', () => { setG(i.id.slice(3), v => { const p = +i.value; if (p > 0) v.w[cat] = p; else delete v.w[cat]; }); i.closest('tr').classList.toggle('cero', !(+i.value > 0)); }));
    $$('#der input[id^="gd_"]').forEach(i => i.addEventListener('change', () => setG(i.id.slice(3), v => v.dens = Math.max(0, Math.min(1, +i.value)))));
  }
}

// ---------- Guardar, exportar, importar ----------
async function guardar() {
  const r = await fetch('/api/ajustes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(AJ()) }); const j = await r.json().catch(() => ({}));
  if (!r.ok) return toast('No se pudo guardar: ' + (j.error || r.status), true);
  sucio(false); toast('Guardado en el código del juego: sprites/ajustes.js');
}
function texto() { return '// Ajustes de sprites hechos con el Motor de sprites (motor.bat).\nwindow.AJUSTES = ' + JSON.stringify(AJ(), null, 1) + ';\n'; }
function exportar() { const b = new Blob([texto()], { type: 'text/javascript' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'ajustes.js'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
async function importar(f) { try { const t = await f.text(), a = t.indexOf('{'), b = t.lastIndexOf('}'); st.AJ = norm(JSON.parse(t.slice(a, b + 1))); sucio(); lista(); panel(); dibujar(); toast('Ajustes importados (aún sin guardar)'); } catch (e) { toast('Ese archivo no es de ajustes del motor', true); } }

// ---------- Probar ----------
function abrirProbar() {
  if (!st.sel) return toast('Elige primero un sprite', true);
  const w = W(), ws = (() => { try { return w.worldIndex(); } catch (e) { return []; } })();
  $('#pMundo').innerHTML = '<option value="nuevo">Mundo pequeño de prueba (nuevo)</option>' + ws.map(x => `<option value="${esc(x.id)}">${esc(x.name || x.id)}</option>`).join('');
  const gk = Object.keys(J('MOTOR_DEF').suelo); let def = 'GRASS';
  if (!isTree(st.sel)) { const cat = tipoDe(st.sel); def = gk.find(g => (groundVal(g).w[cat] || 0) > 0) || 'GRASS'; }
  else { const t = treeT(tipoDe(st.sel)), key = t >= 0 ? J('GI')[t].key : ''; const b = J('BIOMES').find(b => b && (biomeTrees(b.key)[key] > 0)); if (b && b.g) def = b.g; }
  $('#pSuelo').innerHTML = gk.map(g => `<option value="${g}" ${g === def ? 'selected' : ''}>${esc(nomSuelo(g))}</option>`).join('');
  $('#mProbar').hidden = false;
}
function irProbar() {
  try { localStorage.setItem('motor-ajustes', JSON.stringify(AJ())); } catch (e) { }
  const u = `/index.html?prueba=1&sprite=${encodeURIComponent(st.sel)}&suelo=${encodeURIComponent($('#pSuelo').value)}&mundo=${encodeURIComponent($('#pMundo').value)}&solo=${$('#pSolo').checked ? 1 : 0}`;
  window.open(u, '_blank'); $('#mProbar').hidden = true;
}
function pegarMundo() {
  const raw = $('#tMundo').value.trim(), w = W(); if (!raw) return;
  try { JSON.parse(raw); } catch (e) { return toast('Eso no parece un mundo exportado', true); }
  const id = J('newWorldId')(); if (!w.lsSet(J('WKEY')(id), raw)) return toast('No hay espacio para el mundo', true);
  try { const L = w.worldIndex(), e = w.indexEntry(id, raw); L.unshift(e); w.saveIndex(L); } catch (e) { }
  $('#mPegar').hidden = true; $('#tMundo').value = ''; abrirProbar(); $('#pMundo').value = id; toast('Mundo traído al motor');
}

// ---------- Subir y retirar ----------
function abrirSubir() {
  const w = W(), tipos = [...new Set(J('GI').filter(g => g && g.tree).map(g => J('_cslug')(g.n)))].sort();
  $('#sTipo').innerHTML = tipos.map(t => `<option value="${t}">${t}</option>`).join('');
  const cats = [...new Set(claves().filter(k => !isTree(k)).map(tipoDe))].sort(); $('#dlCats').innerHTML = cats.map(c => `<option value="${c}">`).join('');
  if (st.sel) { if (isTree(st.sel)) { $$('[name=sDest]')[0].checked = true; $('#sTipo').value = tipoDe(st.sel); } else { $$('[name=sDest]')[1].checked = true; $('#sCat').value = tipoDe(st.sel); } }
  destino(); $('#sPrev').innerHTML = ''; $('#sArchivos').value = ''; $('#mSubir').hidden = false;
}
function destino() { const a = $$('[name=sDest]')[0].checked; $('#sTipoL').hidden = !a; $('#sCatL').hidden = a; }
async function subir() {
  const fs = [...$('#sArchivos').files]; if (!fs.length) return toast('Elige alguna imagen', true);
  const carpeta = $$('[name=sDest]')[0].checked ? 'arboles' : 'suelo', nombre = (carpeta === 'arboles' ? $('#sTipo').value : $('#sCat').value).trim().toLowerCase();
  if (!/^[a-z0-9_]{1,40}$/.test(nombre)) return toast('Nombre: solo minúsculas, números y _', true);
  const keys = [];
  for (const f of fs) { const datos = await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(f); });
    const r = await fetch('/api/subir', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ carpeta, nombre, datos }) }); const j = await r.json().catch(() => ({}));
    if (!r.ok) return toast(`No se pudo subir ${f.name}: ${j.error || r.status}`, true); keys.push(j.key); }
  $('#mSubir').hidden = true; toast(`Subidas ${keys.length} imágenes. Cargando…`);
  await cargarJuego(); lista(); if (keys[0] && J('CSPR').sets.has(keys[0])) elegir(keys[0]);
}
async function borrar() {
  const k = st.sel; if (!k || !confirm(`¿Retirar ${k} del juego?\nSe mueve a la papelera del motor (herramientas/motor/papelera), no se borra.`)) return;
  const r = await fetch('/api/borrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) });
  if (!r.ok) return toast('No se pudo retirar', true);
  if (AJ().sprites[k]) { delete AJ().sprites[k]; sucio(); }
  st.sel = null; toast('Retirado. Cargando…'); await cargarJuego(); lista(); panel(); dibujar();
}

// ---------- Inicio ----------
$('#buscar').addEventListener('input', lista);
$$('.filtros button').forEach(b => b.addEventListener('click', () => { st.filtro = b.dataset.f; $$('.filtros button').forEach(x => x.classList.toggle('on', x === b)); lista(); }));
$('#bGuardar').onclick = guardar; $('#bExportar').onclick = exportar; $('#fImportar').onchange = e => e.target.files[0] && importar(e.target.files[0]);
$('#bProbar').onclick = abrirProbar; $('#pIr').onclick = irProbar; $('#pPegar').onclick = () => { $('#mProbar').hidden = true; $('#mPegar').hidden = false; }; $('#bPegarOk').onclick = pegarMundo;
$('#bSubir').onclick = abrirSubir; $('#bSubirOk').onclick = subir; $$('[name=sDest]').forEach(r => r.onchange = destino);
$('#sArchivos').onchange = e => { const P = $('#sPrev'); P.innerHTML = ''; for (const f of e.target.files) { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'), s = Math.max(1, Math.floor(64 / Math.max(im.width, im.height))); c.width = im.width * s; c.height = im.height * s; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0, c.width, c.height); c.title = `${f.name} · ${im.width}×${im.height}`; P.appendChild(c); }; im.src = URL.createObjectURL(f); } };
$$('[data-cerrar]').forEach(b => b.onclick = () => b.closest('.modal').hidden = true);
addEventListener('keydown', e => { if (e.key === 'Escape') $$('.modal').forEach(m => m.hidden = true); if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (st.dirty) guardar(); } });
addEventListener('beforeunload', e => { if (st.dirty) { e.preventDefault(); e.returnValue = ''; } });
(async () => {
  try { st.AJ = norm(await (await fetch('/api/ajustes')).json()); } catch (e) { st.AJ = norm({}); toast('No se pudieron leer los ajustes', true); }
  await cargarJuego(); sucio(false); lista(); dibujar();
  const k = claves().find(k => k.startsWith('arboles/')); if (k) elegir(k);
})();
