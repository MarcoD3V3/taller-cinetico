'use strict';
// =====================================================================================
//  Pantalla de carga, la misma para todo: arrancar el juego, abrir o crear un mundo, conectar
//  con el servidor, abrir tu mundo en red, entrar en una partida y salir de ella.
//  Pasos con su estado, barra de progreso, consejos que puedes pasar y engranajes que giran
//  más rápido si los tocas.
// =====================================================================================
const LD_TIPS = [
  'Pulsa Esc en cualquier momento para abrir el menú; en multijugador el mundo sigue en marcha.',
  'Mantén el clic derecho para picar: solo se pica la capa en la que empezaste.',
  'Pon una cinta delante de una máquina y llevará lo que fabrica a donde quieras.',
  'Dos máquinas iguales juntas trabajan un 4 % más rápido. Mira la pestaña Conexiones de su ficha.',
  'Un cofre con carbón al lado del horno lo alimenta solo.',
  'Escribe / en el chat para ver los comandos. Tab completa lo que escribes.',
  'Con «Abrir en red» tu mundo no cambia: solo dejas entrar a otros.',
  'Las antorchas y lámparas descubren la roca oscura de la montaña.',
  'Si te hieres, cúrate pronto: las heridas sin tratar empeoran con el tiempo.',
  'Puedes cambiar cualquier tecla en Opciones › Controles.',
  'El clima cambia el mundo: la lluvia deja charcos y la nieve cubre el suelo.',
  'Una máquina en Turbo produce más, pero se calienta. El agua al lado la refresca.',
];
const LD = { el: null, steps: [], cur: -1, tip: (Math.random() * LD_TIPS.length) | 0, tipT: 0, spin: 1, cancel: null, poll: 0, shownAt: 0 };
function ldEl() {
  if (LD.el) return LD.el;
  const el = document.getElementById('loader') || document.createElement('div'); el.id = 'loader';
  el.innerHTML = `<div class="ldin"><div class="ldgears" title="Tócalos">${ldGear(46, 10, 'g1')}${ldGear(30, 8, 'g2')}</div><h2 id="ldTitle">Cargando…</h2><div id="ldSub" class="mut small"></div>
    <div class="ldbar"><i id="ldBar"></i></div><ol id="ldSteps"></ol>
    <div class="ldtip"><button data-ld="prev" aria-label="Consejo anterior">‹</button><p id="ldTip"></p><button data-ld="next" aria-label="Consejo siguiente">›</button></div>
    <div id="ldAct"></div></div>`;
  if (!el.parentNode) document.body.appendChild(el);
  LD.el = el; ldTip(0); return el;
}
function ldGear(r, teeth, cls) {
  const pts = []; for (let i = 0; i < teeth * 2; i++) { const a = i / (teeth * 2) * Math.PI * 2, rr = i % 2 ? r * 0.78 : r; pts.push([Math.cos(a - 0.12) * rr, Math.sin(a - 0.12) * rr], [Math.cos(a + 0.12) * rr, Math.sin(a + 0.12) * rr]); }
  return `<svg class="${cls}" viewBox="${-r - 2} ${-r - 2} ${2 * r + 4} ${2 * r + 4}" width="${2 * r + 4}" height="${2 * r + 4}"><path d="M${pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join('L')}Z" /><circle r="${r * 0.32}" /></svg>`;
}
function ldTip(d) { LD.tip = (LD.tip + d + LD_TIPS.length) % LD_TIPS.length; const t = document.getElementById('ldTip'); if (t) { t.style.opacity = 0; setTimeout(() => { t.textContent = '💡 ' + LD_TIPS[LD.tip]; t.style.opacity = 1; }, d ? 120 : 0); } LD.tipT = 0; }
// Abre la pantalla. steps: nombres de los pasos. cancel: función si se puede cancelar.
function loadShow(title, steps, opt = {}) {
  const el = ldEl(); clearInterval(LD.poll); LD.cancel = opt.cancel || null; LD.steps = steps || []; LD.cur = -1; LD.shownAt = performance.now();
  el.classList.remove('fail', 'done'); el.hidden = false; requestAnimationFrame(() => el.classList.add('on'));
  document.getElementById('ldTitle').textContent = title; document.getElementById('ldSub').textContent = opt.sub || '';
  document.getElementById('ldAct').innerHTML = LD.cancel ? '<button data-ld="cancel">Cancelar</button>' : '';
  ldRenderSteps(); loadProgress(0); if (LD.steps.length) loadStep(0);
}
function ldRenderSteps() { const ol = document.getElementById('ldSteps'); if (!ol) return; ol.innerHTML = LD.steps.map((s, i) => `<li class="${i < LD.cur ? 'ok' : i === LD.cur ? 'now' : ''}"><span class="ldic"></span>${esc(s)}<b class="ldpct" id="ldPct${i}"></b></li>`).join(''); }
function loadStep(i, label) { if (!LD.el || LD.el.hidden) return; if (label) LD.steps[i] = label; LD.cur = i; ldRenderSteps(); if (LD.steps.length) loadProgress(i / LD.steps.length); }
function loadProgress(p, txt) {
  const b = document.getElementById('ldBar'); if (!b) return; const n = Math.max(1, LD.steps.length), tot = LD.steps.length && LD.cur >= 0 ? (LD.cur + clamp(p, 0, 1)) / n : clamp(p, 0, 1);
  b.style.width = (Math.max(tot, 0.03) * 100).toFixed(1) + '%'; const pc = document.getElementById('ldPct' + LD.cur); if (pc) pc.textContent = txt || (p > 0 && p < 1 ? Math.round(p * 100) + ' %' : '');
}
// Termina bien: se ve el último paso hecho un momento y se va (sin parpadeos en cargas cortas)
function loadDone(msg) {
  if (!LD.el || LD.el.hidden) return; clearInterval(LD.poll); LD.cur = LD.steps.length; ldRenderSteps(); document.getElementById('ldBar').style.width = '100%';
  if (msg) document.getElementById('ldSub').textContent = msg; LD.el.classList.add('done');
  const wait = Math.max(250, 500 - (performance.now() - LD.shownAt)); setTimeout(() => { LD.el.classList.remove('on'); setTimeout(() => { if (!LD.el.classList.contains('on')) LD.el.hidden = true; }, 260); }, wait);
}
function loadFail(msg) {
  if (!LD.el || LD.el.hidden) return; clearInterval(LD.poll); LD.el.classList.add('fail');
  document.getElementById('ldSub').textContent = msg || 'Algo ha fallado.'; document.getElementById('ldAct').innerHTML = '<button class="pri" data-ld="close">Volver</button>';
  const li = document.querySelectorAll('#ldSteps li')[LD.cur]; if (li) li.className = 'bad';
}
// Espera a que se cumpla algo, avisando de progreso: check() → true (listo) · false (sigue) · string (error)
function loadWatch(check, timeout = 30000) {
  const t0 = performance.now(); clearInterval(LD.poll);
  LD.poll = setInterval(() => { let r; try { r = check(); } catch (e) { r = e.message; } if (r === true) loadDone(); else if (typeof r === 'string') loadFail(r); else if (performance.now() - t0 > timeout) loadFail('Está tardando demasiado. Revisa la conexión y vuelve a intentarlo.'); }, 80);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ld]'); if (b) { const a = b.dataset.ld;
    if (a === 'next') ldTip(1); if (a === 'prev') ldTip(-1);
    if (a === 'cancel') { const c = LD.cancel; LD.cancel = null; loadFail('Cancelado.'); if (c) c(); setTimeout(() => { LD.el.classList.remove('on'); LD.el.hidden = true; }, 400); }
    if (a === 'close') { LD.el.classList.remove('on'); setTimeout(() => LD.el.hidden = true, 250); }
    return; }
  if (e.target.closest('.ldgears')) { LD.spin = Math.min(9, LD.spin + 2.5); }
});
// Engranajes: giran engranados, aceleran con los clics y vuelven poco a poco a su ritmo
{ let a = 0, last = performance.now(); const loop = now => { const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (LD.el && !LD.el.hidden) { a += dt * 60 * LD.spin; LD.spin += (1 - LD.spin) * Math.min(1, dt * 1.5); const g1 = LD.el.querySelector('.g1'), g2 = LD.el.querySelector('.g2'); if (g1) g1.style.transform = `rotate(${a}deg)`; if (g2) g2.style.transform = `rotate(${-a * 1.25 + 9}deg)`;
    LD.tipT += dt; if (LD.tipT > 6) ldTip(1); }
  requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
// ---------- Dónde aparece ----------
// Arranque del juego: la pantalla ya está en el HTML; se va cuando hay menú y conexión (o a los 5 s)
{ loadShow('Taller Cinético', ['Cargando el juego', 'Preparando el menú', 'Buscando partidas en línea']);
  loadStep(1); setTimeout(() => loadStep(2), 150); const t0 = performance.now(); loadWatch(() => !!NET.kind || NET.status.startsWith('Sin') || NET.status.startsWith('No ') || performance.now() - t0 > 5000, 8000); }
// Abrir o crear un mundo
{ const w0 = worldAction; worldAction = (act, btn) => { const k = act.split(':')[0];
  if (k === 'play' || k === 'create') {
    const name = k === 'play' ? ((worldIndex().find(w => w.id === act.split(':')[1]) || {}).name || 'Mundo') : (($('cwName') || {}).value || 'Mundo nuevo');
    loadShow(k === 'play' ? 'Abriendo ' + name : 'Creando ' + name, k === 'play' ? ['Leyendo la partida guardada', 'Generando el terreno', 'Colocando tus máquinas'] : ['Generando el terreno', 'Buscando un buen sitio para empezar', 'Preparando tu equipo']);
    setTimeout(() => { loadStep(1); setTimeout(() => { try { w0(act, btn); } catch (e) { loadFail('No se pudo abrir: ' + e.message); return; } loadStep(2); setTimeout(() => ui.open === 'title' && !S ? loadFail('No se pudo abrir el mundo.') : loadDone(), 120); }, 40); }, 60);
    return;
  }
  return w0(act, btn); }; }
// Conectar con un servidor (desde Multijugador)
{ const c0 = netConnectWs; netConnectWs = async url => { const boot = LD.el && !LD.el.hidden && LD.steps[0] === 'Cargando el juego';
  if (!boot) loadShow('Conectando', ['Buscando el servidor', typeof dcToken === 'function' && dcToken() ? 'Comprobando tu cuenta de Discord' : 'Entrando como invitado'], { sub: url });
  setTimeout(() => loadStep(1), 200); await c0(url); if (!boot) { if (NET.kind === 'ws') loadDone(NET.status); else loadFail(NET.status); } }; }
// Abrir tu mundo en red
{ const h0 = netHost; netHost = async opt => { loadShow('Abriendo tu mundo', ['Creando la partida', 'Avisando a los demás jugadores'], { sub: NET.kind === 'claude' ? 'Salas de claude.ai' : NET.server || '' }); await h0(opt); if (inGame() && NET.game.host) { loadStep(1); setTimeout(() => loadDone('Código ' + NET.game.code.toUpperCase()), 200); } else loadFail(lastErr() || 'No se pudo abrir la partida.'); }; }
// Entrar en una partida: conectar → pedir el mundo → descargarlo → construirlo
const lastErr = () => { const m = [...CHAT.log].reverse().find(x => x.kind === 'err'); return m && performance.now() - m.t < 3000 ? m.text : ''; };
{ const j0 = netJoin; netJoin = async (code, pass) => {
  const c = normTxt(code).replace(/[^a-z0-9]/g, '').toUpperCase(); if (!c) return j0(code, pass);
  loadShow('Entrando en ' + c, ['Conectando con la partida', 'Pidiendo el mundo al anfitrión', 'Descargando el mundo', 'Construyendo el mundo'], { cancel: () => netLeave(true), sub: NET.kind === 'claude' ? 'Salas de claude.ai' : NET.server || '' });
  await j0(code, pass);
  if (!NET.game) { loadFail(lastErr() || 'No se pudo entrar.'); return; }
  loadStep(1);
  loadWatch(() => { const g = NET.game; if (!g) return lastErr() || 'Has salido de la partida.'; if (g.snap) { if (LD.cur < 2) loadStep(2); loadProgress(g.snap.got / g.snap.n); if (g.snap.got >= g.snap.n && LD.cur < 3) loadStep(3); } if (!g.waiting) return true; return false; }, 40000);
}; }
// Salir de una partida
{ const l0 = netLeave; netLeave = async (quiet, gone) => { const g = NET.game; if (!g || g.waiting || gone) return l0(quiet, gone); loadShow(g.host ? 'Cerrando tu mundo a los demás' : 'Saliendo de la partida', g.host ? ['Avisando a los jugadores'] : ['Guardando tu progreso en el anfitrión', 'Volviendo']); await l0(quiet, gone); loadDone(); }; }
