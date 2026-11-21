'use strict';
// =====================================================================================
//  Motor: secciones «Jugador» (propiedades base del personaje) y «Comandos» (comandos /nombre con su función).
//  Se enganchan a lista(), panel() y dibujar() del editor según st.modo.
// =====================================================================================
st.modo = 'sprites'; st.cmdSel = 0;
// Propiedades del jugador: [clave, nombre, valor de serie, paso, mín, máx, unidad, explicación, grupo]
const JUG_P = [
  ['andar', 'Velocidad al andar', 3.3, 0.1, 0.5, 20, 'casillas/s', '', 'Movimiento'], ['correr', 'Velocidad al correr', 5.6, 0.1, 0.5, 30, 'casillas/s', 'Con Mayús.', 'Movimiento'],
  ['agarre', 'Agarre (arrancar y frenar)', 1, 0.1, 0.1, 5, '×', 'Menos = resbala más, como en hielo.', 'Movimiento'], ['nado', 'Velocidad nadando', 1, 0.1, 0.1, 5, '×', '', 'Movimiento'],
  ['salto', 'Fuerza del salto', 175, 5, 0, 1000, '', '', 'Salto y caída'], ['gravedad', 'Gravedad', 900, 10, 100, 5000, '', 'Más = cae antes.', 'Salto y caída'],
  ['costeSalto', 'Aguante por salto', 5, 1, 0, 100, '', '', 'Salto y caída'], ['caidaDano', 'Caída que hace daño desde', 300, 10, 50, 2000, 'velocidad', 'Más = aguanta caídas más altas.', 'Salto y caída'],
  ['vida', 'Vida base', 100, 5, 1, 5000, '', '+2 por nivel de forma física y lo que dé el equipo.', 'Vida y energía'], ['regenVida', 'Regeneración de vida', 1, 0.1, 0, 20, '×', '', 'Vida y energía'],
  ['aguante', 'Aguante base', 100, 5, 1, 5000, '', '+5 por nivel de forma física.', 'Vida y energía'], ['gastoCorrer', 'Gasto de aguante al correr', 1, 0.1, 0, 10, '×', '', 'Vida y energía'],
  ['recupAguante', 'Recuperación de aguante', 14, 1, 0, 200, 'por s', '', 'Vida y energía'], ['mana', 'Maná base', 50, 5, 0, 5000, '', '+10 por nivel de magia.', 'Vida y energía'],
  ['regenMana', 'Regeneración de maná', 0.8, 0.1, 0, 50, 'por s', '', 'Vida y energía'],
  ['hambre', 'Hambre', 1, 0.1, 0, 10, '×', '0 = nunca tiene hambre.', 'Hambre y sed'], ['sed', 'Sed', 1, 0.1, 0, 10, '×', '', 'Hambre y sed'], ['cansancio', 'Cansancio (sueño)', 1, 0.1, 0, 10, '×', '', 'Hambre y sed'],
  ['alcance', 'Alcance', 5.5, 0.5, 1, 30, 'casillas', 'Hasta dónde picas, colocas y recoges.', 'Interacción'],
  ['choqueAncho', 'Medio ancho', 5, 0.5, 0.5, 30, 'unidades', 'Puntos de los pies a cada lado.', 'Choque'], ['choquePie', 'Pies (abajo)', 5, 0.5, -20, 30, 'unidades', '', 'Choque'],
  ['choqueCentro', 'Punto central', 1, 0.5, -20, 30, 'unidades', '', 'Choque'], ['orden', 'Línea de orden (pies)', 8, 0.5, -20, 40, 'unidades', 'Con esta línea se decide si un árbol o una mata te tapa.', 'Choque'],
  ['escala', 'Tamaño del dibujo', 1.6, 0.1, 0.5, 6, '', 'Solo se ve más grande o pequeño; el choque va aparte.', 'Dibujo'],
  ['sombraAncho', 'Sombra: ancho', 10, 0.5, 0, 60, 'unidades', '', 'Dibujo'], ['sombraAlto', 'Sombra: alto', 4, 0.5, 0, 30, 'unidades', '', 'Dibujo'], ['sombraOpac', 'Sombra: opacidad', 0.3, 0.05, 0, 1, '', '', 'Dibujo']];
const JUG_G = ['Movimiento', 'Salto y caída', 'Vida y energía', 'Hambre y sed', 'Interacción', 'Choque', 'Dibujo'];
st.jugCerr = new Set();
const jugV = k => { const j = AJ().jugador || {}, p = JUG_P.find(x => x[0] === k); return typeof j[k] === 'number' ? j[k] : p[2]; };
function jugSet(k, v) { hist(); const p = JUG_P.find(x => x[0] === k); AJ().jugador = AJ().jugador || {}; if (v === null || v === p[2]) delete AJ().jugador[k]; else AJ().jugador[k] = Math.max(p[4], Math.min(p[5], v)); if (!Object.keys(AJ().jugador).length) delete AJ().jugador; sucio(); }

// ---------- cambiar de sección ----------
function modo(m) {
  st.modo = m; $$('.secciones button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  $('#izq .filtros').hidden = $('#buscar').hidden = m !== 'sprites'; lista(); panel(); dibujar();
}
{ const l0 = lista; lista = () => { if (st.modo === 'sprites') return l0(); const L = $('#lista');
  if (st.modo === 'jugador') { L.innerHTML = `<div class="pad"><p>Las propiedades de la derecha son la <b>base</b> del personaje.</p><p class="mut small">Las habilidades, el nivel, el equipo (botas ×1,5…), las pociones, el clima, las heridas y las monturas siguen multiplicando encima, como siempre: si subes la base, todo eso sube en proporción.</p><p class="mut small">En la vista: el personaje a su tamaño, sus puntos de choque (verde), su línea de orden (amarilla) y su alcance (círculo).</p></div>`; return; }
  const cs = AJ().comandos || []; L.innerHTML = `<div class="pad"><button id="cNuevo" class="pri">＋ Nuevo comando</button></div>` + (cs.length ? cs.map((c, i) => `<div class="citem ${i === st.cmdSel ? 'sel' : ''}" data-i="${i}"><b>/${esc(c.nombre || '(sin nombre)')}</b><span class="mut small">${esc(c.desc || '')}</span></div>`).join('') : '<p class="mut pad small">Aún no hay comandos. Crea uno: se escribe en el chat del juego con «/».</p>');
  $('#cNuevo').onclick = cmdNuevo; $$('.citem').forEach(d => d.onclick = () => { st.cmdSel = +d.dataset.i; lista(); panel(); });
}; }
{ const p0 = panel; panel = () => { if (st.modo === 'sprites') return p0(); if (st.modo === 'jugador') return panelJugador(); return panelComando(); }; }
{ const d0 = dibujar; dibujar = () => { if (st.modo === 'sprites') return d0(); if (st.modo === 'jugador') return dibujarJugador(); return dibujarComandos(); }; }

// ---------- Jugador ----------
function panelJugador() {
  const D = $('#der'), cambiados = Object.keys(AJ().jugador || {}).length, Q = s => [...document.querySelectorAll(s)];
  D.innerHTML = `<div class="sec"><h3>Jugador <small>${cambiados ? cambiados + ' cambiada(s)' : 'todo de serie'}</small></h3><input id="jBuscar" type="search" placeholder="Buscar propiedad…" style="width:100%"></div>` + JUG_G.map(g => {
    const L = JUG_P.filter(p => p[8] === g), n = L.filter(p => (AJ().jugador || {})[p[0]] !== undefined).length, cerr = st.jugCerr.has(g);
    return `<div class="sec jgrupo" data-g="${g}"><h3 class="jtit" style="cursor:pointer">${cerr ? '▸' : '▾'} ${g} <small>${n ? n + ' cambiada(s)' : ''}</small></h3><div ${cerr ? 'hidden' : ''}>${L.map(([k, nm, def, stp, mn, mx, u, ex]) => `<div class="campo jcampo ${(AJ().jugador || {})[k] !== undefined ? 'mod' : ''}" data-txt="${esc((nm + ' ' + ex).toLowerCase())}" title="${esc(ex)}"><span>${esc(nm)}${u ? ` <small class="mut">(${u})</small>` : ''}</span><span><input type="number" data-j="${k}" value="${jugV(k)}" step="${stp}" min="${mn}" max="${mx}"> <button class="x" data-r="${k}" title="Valor de serie: ${def}">↺</button></span></div>${ex ? `<p class="nota" style="margin:-2px 0 6px">${esc(ex)}</p>` : ''}`).join('')}</div></div>`;
  }).join('') + `<div class="sec"><div class="fila"><button id="jProbar" class="ok">▶ Probar en el juego</button><button id="jTodo">Todo de serie</button></div>
    <p class="nota">Son la base: habilidades, nivel, equipo, pociones, clima, heridas y monturas siguen multiplicando encima. En la vista arrastra los puntos verdes (choque), la línea amarilla (orden) y el punto dorado (alcance).</p></div>`;
  Q('#der [data-j]').forEach(i => i.onchange = () => { const v = +i.value; if (!isFinite(v)) return; jugSet(i.dataset.j, v); i.value = jugV(i.dataset.j); i.closest('.jcampo').classList.toggle('mod', (AJ().jugador || {})[i.dataset.j] !== undefined); dibujar(); });
  Q('#der [data-r]').forEach(b => b.onclick = () => { jugSet(b.dataset.r, null); panel(); dibujar(); });
  Q('#der .jtit').forEach(h => h.onclick = () => { const g = h.parentNode.dataset.g; st.jugCerr.has(g) ? st.jugCerr.delete(g) : st.jugCerr.add(g); panel(); });
  document.getElementById('jBuscar').oninput = e => { const q = e.target.value.trim().toLowerCase(); Q('#der .jcampo').forEach(c => { const ok = !q || c.dataset.txt.includes(q); c.style.display = ok ? '' : 'none'; const nt = c.nextElementSibling; if (nt && nt.classList.contains('nota')) nt.style.display = ok ? '' : 'none'; }); if (q) Q('#der .jgrupo > div').forEach(d => d.hidden = false); };
  document.getElementById('jTodo').onclick = () => { if (!confirm('¿Volver todas las propiedades del jugador a las de serie?')) return; hist(); delete AJ().jugador; sucio(); panel(); dibujar(); };
  document.getElementById('jProbar').onclick = () => probarSimple();
}
function dibujarJugador() {
  const dpr = devicePixelRatio || 1, W2 = vista.clientWidth * dpr, H2 = vista.clientHeight * dpr; if (vista.width !== W2 || vista.height !== H2) { vista.width = W2; vista.height = H2; }
  Z = st.zoom * dpr; O = { x: Math.round(W2 / 2), y: Math.round(H2 * 0.55) }; const c = vx; c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
  c.fillStyle = '#0b0c0d'; c.fillRect(0, 0, W2, H2);
  const t0x = Math.floor(wxOf(0) / 32) - 1, t1x = Math.ceil(wxOf(W2) / 32) + 1, t0y = Math.floor(wyOf(0) / 32) - 1, t1y = Math.ceil(wyOf(H2) / 32) + 1;
  for (let ty = t0y; ty <= t1y; ty++) for (let tx = t0x; tx <= t1x; tx++) { c.fillStyle = (tx + ty) & 1 ? '#3b6531' : '#3f6b35'; c.fillRect(sx(tx * 32), sy(ty * 32), 32 * Z + 1, 32 * Z + 1); }
  if (!W()) return; const p = { x: 16, y: 26 };
  // alcance
  const R = jugV('alcance') * 32; c.strokeStyle = '#e0b54c66'; c.setLineDash([6, 6]); c.beginPath(); c.arc(sx(p.x), sy(p.y), R * Z, 0, 7); c.stroke(); c.setLineDash([]);
  // personaje (dibujado por el juego, a su escala)
  c.save(); c.setTransform(Z, 0, 0, Z, O.x - 16 * Z, O.y - 26 * Z); try { W().drawAvatar(c, { ...J('DEFAULT_LOOK') }, {}, p.x, p.y + 8, Math.PI / 2, 0, false, jugV('escala'), null, 0); } catch (e) { } c.restore();
  // choque
  const a = jugV('choqueAncho'), pie = jugV('choquePie'), cen = jugV('choqueCentro'), pts = [[p.x - a, p.y + pie], [p.x + a, p.y + pie], [p.x, p.y + cen]];
  c.strokeStyle = '#5fe07a'; c.lineWidth = 2; c.beginPath(); c.moveTo(sx(pts[0][0]), sy(pts[0][1])); c.lineTo(sx(pts[2][0]), sy(pts[2][1])); c.lineTo(sx(pts[1][0]), sy(pts[1][1])); c.stroke();
  for (const [x, y] of pts) { c.fillStyle = '#000'; c.fillRect(sx(x) - 5, sy(y) - 5, 10, 10); c.fillStyle = '#5fe07a'; c.fillRect(sx(x) - 3.5, sy(y) - 3.5, 7, 7); }
  // línea de orden
  const oy = p.y + jugV('orden'); c.strokeStyle = '#ffe14a'; c.beginPath(); c.moveTo(sx(p.x - 14), sy(oy)); c.lineTo(sx(p.x + 14), sy(oy)); c.stroke();
  c.font = `${12 * dpr}px "Taller Pixel"`; c.fillStyle = '#ffe14a'; c.fillText('línea de orden', sx(p.x + 16), sy(oy) + 4 * dpr); c.fillStyle = '#5fe07a'; c.fillText('choque', sx(p.x + a + 3), sy(p.y + pie) + 4 * dpr);
  c.fillStyle = '#e0b54c'; c.fillText(`alcance ${jugV('alcance')} casillas`, sx(p.x + R * 0.71) + 6, sy(p.y - R * 0.71));
}
function probarSimple() { try { localStorage.setItem('motor-ajustes', JSON.stringify(AJ())); } catch (e) { } window.open('/index.html?prueba=1&mundo=nuevo&suelo=GRASS', '_blank'); }

// ---------- Comandos ----------
function cmdNuevo() { hist(); const cs = AJ().comandos || (AJ().comandos = []); let n = 'micomando', i = 1; while (cs.some(c => c.nombre === n)) n = 'micomando' + (++i); cs.push({ nombre: n, desc: '', uso: '/' + n, pasos: [], truco: true }); st.cmdSel = cs.length - 1; sucio(); lista(); panel(); }
function cmdErrores(c, i) {
  const E = [], n = String(c.nombre || '').toLowerCase(), juego = (() => { try { return J('CMDS'); } catch (e) { return {}; } })();
  if (!/^[a-z0-9_]{1,24}$/.test(n)) E.push('El nombre solo puede llevar minúsculas, números y _ (hasta 24).');
  else if (juego[n] && !juego[n].motor) E.push(`/${n} ya es un comando del juego: elige otro nombre.`);
  if ((AJ().comandos || []).some((o, j) => j !== i && String(o.nombre).toLowerCase() === n)) E.push('Hay otro comando del motor con ese nombre.');
  for (const a of c.alias || []) if (juego[a] && !juego[a].motor) E.push(`El alias /${a} ya es del juego (se ignora).`);
  if (c.js && String(c.js).trim()) { try { new Function('args', 'raw', 'api', c.js); } catch (e) { E.push('La función tiene un error: ' + e.message); } }
  if (!(c.pasos || []).length && !(c.js || '').trim() && !c.msg) E.push('No hace nada todavía: añade pasos, un mensaje o una función.');
  return E;
}
function panelComando() {
  const D = $('#der'), cs = AJ().comandos || [], c = cs[st.cmdSel];
  if (!c) { D.innerHTML = '<p class="mut pad">Crea un comando con «＋ Nuevo comando».</p>'; return; }
  const E = cmdErrores(c, st.cmdSel);
  D.innerHTML = `<div class="sec"><h3>/${esc(c.nombre)} <small>comando del motor</small></h3>
    ${E.length ? `<div class="prob error">${E.map(esc).join('<br>')}</div>` : '<p class="ok-txt small">✓ Listo para usar</p>'}
    <label class="lbl">Nombre (lo que se escribe tras «/»)<input id="cNom" value="${esc(c.nombre)}"></label>
    <label class="lbl">Otros nombres (separados por comas)<input id="cAli" value="${esc((c.alias || []).join(', '))}"></label>
    <label class="lbl">Uso (sale en /ayuda)<input id="cUso" value="${esc(c.uso || '')}" placeholder="/${esc(c.nombre)} <cantidad>"></label>
    <label class="lbl">Qué hace<input id="cDesc" value="${esc(c.desc || '')}"></label>
    <label class="chk"><input type="checkbox" id="cTruco" ${c.truco ? 'checked' : ''}> Es un truco (solo en mundos con comandos activados)</label></div>
  <div class="sec"><h3>Función: pasos <small>uno por línea</small></h3>
    <textarea id="cPasos" rows="6" placeholder="dar madera $1&#10;hora dia&#10;tp ~0 ~-5">${esc((c.pasos || []).join('\n'))}</textarea>
    <p class="nota">Cada línea es un comando del juego (sin «/» o con él). Se cambian: <code>$1</code> <code>$2</code>… lo que escribas tras el comando, <code>$todo</code> todo junto, <code>$x</code> <code>$y</code> tu casilla, <code>$cx</code> <code>$cy</code> la del cursor. Haz clic en un comando de la lista del centro para añadirlo.</p>
    <label class="lbl">Mensaje al terminar (opcional)<input id="cMsg" value="${esc(c.msg || '')}" placeholder="¡Hecho, $1!"></label></div>
  <div class="sec"><h3>Función en JavaScript <small>opcional, avanzado</small></h3>
    <textarea id="cJs" rows="8" class="codigo" spellcheck="false" placeholder="// args: lo que escribes tras el comando · api: ayudas&#10;const n = +args[0] || 1;&#10;api.dar('madera', n);&#10;return 'Te doy ' + n + ' de madera';">${esc(c.js || '')}</textarea>
    <p class="nota">Se ejecuta después de los pasos. <code>api</code>: <code>cmd('hora dia')</code>, <code>dar(objeto, n)</code>, <code>tp(x, y)</code>, <code>casilla()</code>, <code>cursor()</code>, <code>suelo(x, y)</code>, <code>poner(x, y, 'GRASS')</code>, <code>objeto('madera')</code>, <code>azar(1, 6)</code>, <code>msg(t)</code>, <code>error(t)</code>, <code>aviso(t)</code>, <code>jugador</code>, <code>S</code>. Si devuelve un texto, sale en el chat.</p>
    <div class="fila"><button id="cProbar" class="ok">▶ Probar en el juego</button><span class="esp"></span><button id="cDup">Duplicar</button><button id="cBorrar" class="mal">Borrar comando</button></div></div>`;
  const set = f => { hist(); f(c); sucio(); };
  const nom = $('#cNom'); nom.onchange = () => { set(c => c.nombre = nom.value.trim().toLowerCase().replace(/^\//, '')); if (!c.uso || /^\/\w+$/.test(c.uso)) c.uso = '/' + c.nombre; lista(); panel(); };
  $('#cAli').onchange = e => { set(c => c.alias = e.target.value.split(',').map(s => s.trim().toLowerCase().replace(/^\//, '')).filter(Boolean)); panel(); };
  $('#cUso').onchange = e => set(c => c.uso = e.target.value.trim()); $('#cDesc').onchange = e => { set(c => c.desc = e.target.value.trim()); lista(); };
  $('#cTruco').onchange = e => set(c => c.truco = e.target.checked); $('#cMsg').onchange = e => { set(c => c.msg = e.target.value || undefined); panel(); };
  $('#cPasos').onchange = e => { set(c => c.pasos = e.target.value.split('\n').map(s => s.trim()).filter(Boolean)); panel(); };
  $('#cJs').onchange = e => { set(c => c.js = e.target.value || undefined); panel(); };
  $('#cJs').onkeydown = e => { if (e.key === 'Tab') { e.preventDefault(); const t = e.target, s = t.selectionStart; t.value = t.value.slice(0, s) + '  ' + t.value.slice(t.selectionEnd); t.selectionStart = t.selectionEnd = s + 2; } };
  $('#cBorrar').onclick = () => { if (!confirm(`¿Borrar /${c.nombre}?`)) return; hist(); cs.splice(st.cmdSel, 1); if (!cs.length) delete AJ().comandos; st.cmdSel = Math.max(0, st.cmdSel - 1); sucio(); lista(); panel(); };
  $('#cDup').onclick = () => { hist(); const d = JSON.parse(JSON.stringify(c)); d.nombre = c.nombre + '2'; d.uso = '/' + d.nombre; cs.push(d); st.cmdSel = cs.length - 1; sucio(); lista(); panel(); };
  $('#cProbar').onclick = () => { probarSimple(); toast(`En el juego, pulsa Intro y escribe /${c.nombre}`); };
}
function dibujarComandos() {
  const dpr = devicePixelRatio || 1, W2 = vista.clientWidth * dpr, H2 = vista.clientHeight * dpr; if (vista.width !== W2 || vista.height !== H2) { vista.width = W2; vista.height = H2; }
  vx.setTransform(1, 0, 0, 1, 0, 0); vx.fillStyle = '#0b0c0d'; vx.fillRect(0, 0, W2, H2);
  // la lista de comandos del juego va en HTML encima (para poder hacer clic)
  let box = $('#cRef'); if (!box) { box = document.createElement('div'); box.id = 'cRef'; $('#centro').appendChild(box); }
  box.hidden = false; if (box.dataset.ok) return; box.dataset.ok = 1;
  let C = {}; try { C = J('CMDS'); } catch (e) { }
  const seen = new Set(), rows = []; for (const k in C) { const o = C[k]; if (o.alias || o.motor || seen.has(k)) continue; seen.add(k); rows.push([k, o]); }
  box.innerHTML = `<h3>Comandos del juego <small class="mut">clic = añadir a los pasos</small></h3>` + rows.map(([k, o]) => `<div class="cref" data-k="${esc(k)}"><b>${esc(o.u || '/' + k)}</b><span>${esc(o.d || '')}</span>${o.cheat ? '<i>truco</i>' : ''}</div>`).join('');
  box.querySelectorAll('.cref').forEach(d => d.onclick = () => { const t = $('#cPasos'); if (!t) return toast('Elige o crea un comando primero', true); t.value = (t.value.trim() ? t.value.trim() + '\n' : '') + d.dataset.k + ' '; t.dispatchEvent(new Event('change')); setTimeout(() => { const t2 = $('#cPasos'); if (t2) { t2.focus(); t2.selectionStart = t2.selectionEnd = t2.value.length; } }, 0); });
}
// el panel de referencia solo en «Comandos»
{ const m0 = modo; modo = m => { m0(m); const b = $('#cRef'); if (b) b.hidden = m !== 'comandos'; $('.ayuda').hidden = m === 'comandos'; }; }
// Revisar también mira comandos y jugador
{ const r0 = revisar; revisar = () => { const P = r0(), L = $('#rLista'), extra = [];
  (AJ().comandos || []).forEach((c, i) => cmdErrores(c, i).filter(e => !e.includes('se ignora')).forEach(e => extra.push(`Comando /${c.nombre}: ${e}`)));
  const j = AJ().jugador || {}; for (const k in j) { const p = JUG_P.find(x => x[0] === k); if (!p) extra.push(`Jugador: propiedad desconocida «${k}»`); else if (!(j[k] >= p[4] && j[k] <= p[5])) extra.push(`Jugador: ${p[1]} fuera de rango`); }
  if (j.correr !== undefined || j.andar !== undefined) { if (jugV('correr') < jugV('andar')) extra.push('Jugador: correr es más lento que andar'); }
  if (extra.length) { const html = extra.map(t => `<div class="prob error"><b>✕ Error</b> ${esc(t)}</div>`).join(''); if (!P.length) L.innerHTML = html; else L.insertAdjacentHTML('beforeend', html); }
  return P.concat(extra.map(txt => ({ nivel: 'error', txt, k: null }))); }; }
// secciones en la barra izquierda
(function () {
  const s = document.createElement('div'); s.className = 'secciones';
  s.innerHTML = '<button data-m="sprites" class="on">Sprites</button><button data-m="jugador">Jugador</button><button data-m="comandos">Comandos</button>';
  $('#izq').insertBefore(s, $('#izq').firstChild); s.querySelectorAll('button').forEach(b => b.onclick = () => modo(b.dataset.m));
  const n0 = norm; norm = a => { a = n0(a); if (a.comandos && !Array.isArray(a.comandos)) delete a.comandos; return a; };
})();

// ---------- Jugador: asas con el ratón (puntos de choque, línea de orden y alcance) ----------
function jugAsas() { const p = { x: 16, y: 26 }, a = jugV('choqueAncho'), pie = jugV('choquePie'), cen = jugV('choqueCentro'), R = jugV('alcance') * 32;
  return [{ t: 'izq', p: [p.x - a, p.y + pie] }, { t: 'der', p: [p.x + a, p.y + pie] }, { t: 'cen', p: [p.x, p.y + cen] }, { t: 'orden', p: [p.x + 14, p.y + jugV('orden')] }, { t: 'alc', p: [p.x + R * 0.71, p.y - R * 0.71] }]; }
vista.addEventListener('mousedown', e => {
  if (st.modo !== 'jugador' || !W()) return; const dpr = devicePixelRatio || 1, px = e.offsetX * dpr, py = e.offsetY * dpr;
  const h = jugAsas().find(a => Math.abs(px - sx(a.p[0])) < 10 && Math.abs(py - sy(a.p[1])) < 10) || (Math.abs(py - sy(26 + jugV('orden'))) < 6 && Math.abs(px - sx(16)) < 16 * Z ? { t: 'orden' } : null);
  if (!h) return; e.preventDefault(); e.stopImmediatePropagation(); hist(); st.jdrag = h.t;
}, true);
addEventListener('mousemove', e => {
  if (st.modo === 'jugador' && !st.jdrag && e.target === vista && W()) { const dpr = devicePixelRatio || 1, px = e.offsetX * dpr, py = e.offsetY * dpr; vista.style.cursor = jugAsas().some(a => Math.abs(px - sx(a.p[0])) < 10 && Math.abs(py - sy(a.p[1])) < 10) ? 'move' : 'default'; }
  if (!st.jdrag) return; const dpr = devicePixelRatio || 1, r = vista.getBoundingClientRect(), px = (e.clientX - r.left) * dpr, py = (e.clientY - r.top) * dpr, wx = wxOf(px) - 16, wy = wyOf(py) - 26;
  const stp = e.shiftKey ? 0.1 : 0.5, q = v => Math.round(v / stp) * stp, t = st.jdrag, st0 = st.drag; st.drag = { h: 'jug' };
  if (t === 'izq' || t === 'der') { jugSet('choqueAncho', Math.max(0.5, q(Math.abs(wx)))); jugSet('choquePie', q(wy)); }
  else if (t === 'cen') jugSet('choqueCentro', q(wy)); else if (t === 'orden') jugSet('orden', q(wy));
  else if (t === 'alc') jugSet('alcance', Math.max(1, Math.round(Math.hypot(wx, wy) / 32 * 2) / 2));
  st.drag = st0; dibujar(); document.querySelectorAll('#der [data-j]').forEach(i => { if (document.activeElement !== i) i.value = jugV(i.dataset.j); });
});
addEventListener('mouseup', () => { if (st.jdrag) { st.jdrag = null; panel(); } });
// asas dibujadas encima de la vista del jugador
{ const dj = dibujarJugador; dibujarJugador = () => { dj(); if (!W()) return; const c = vx; for (const a of jugAsas()) { const x = sx(a.p[0]), y = sy(a.p[1]); c.fillStyle = '#000'; c.fillRect(x - 6, y - 6, 12, 12); c.fillStyle = a.t === 'orden' ? '#ffe14a' : a.t === 'alc' ? '#e0b54c' : '#5fe07a'; c.fillRect(x - 4, y - 4, 8, 8); } }; }
