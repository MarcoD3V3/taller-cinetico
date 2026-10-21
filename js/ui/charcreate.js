'use strict';
// Creador de personaje (al crear un mundo, o la primera vez que abres uno antiguo)
// y editor de apariencia (desde la ficha del personaje). Vista previa animada en 8 direcciones.
let CC = null, _ccRaf = 0;
function openCharCreator(mode, done) {
  const ch = S.char && S.char.made ? S.char : null;
  CC = { mode, done, name: ch ? ch.name : 'Superviviente', look: { ...(ch ? ch.look : DEFAULT_LOOK) }, prof: ch ? ch.prof : 'vagabond', traits: ch ? ch.traits.slice() : [], ang: 1.57, t: 0, lt: 'body', mt: 'race' };
  CC.look = { ...DEFAULT_LOOK, ...CC.look };
  ui.open = 'title'; $('mTitle').hidden = false; $('mTitle').classList.add('ccmode'); renderCC(); ccLoop();
}
const swatch = (k, arr) => `<div class="sw">${arr.map((c, i) => `<button class="${CC.look[k] === i ? 'on' : ''}" data-cl="${k}|${i}" style="background:${c}" aria-label="${k} ${i + 1}"></button>`).join('')}</div>`;
const pick = (k, arr) => `<div class="pk">${arr.map((n, i) => `<button class="${CC.look[k] === i ? 'on' : ''}" data-cl="${k}|${i}">${esc(n)}</button>`).join('')}</div>`;
function renderCC() {
  const lookOnly = CC.mode === 'look', pts = traitPoints(CC.prof, CC.traits);
  const keep = [...document.querySelectorAll('.ccgrid > div, .profs')].map(e => e.scrollTop);
  let h = `<div class="ccwrap"><div class="trow"><h2>${lookOnly ? 'Apariencia' : 'Crea tu personaje'}</h2>${!lookOnly ? `<span class="pts ${pts < 0 ? 'bad' : 'good'}">Puntos: ${pts}</span>` : ''}${lookOnly ? '<button data-cc="cancel">← Volver al juego</button>' : ''}</div><div class="ccgrid">`;
  const LT = [['body', 'Cuerpo'], ['face', 'Cara'], ['hair', 'Pelo'], ['cloth', 'Ropa']], R = raceOf(CC.look);
  const lt = { body: `<div class="cat">Piel</div>${swatch('skin', R.skin)}<div class="cat">Complexión</div>${pick('body', LOOK.body)}${R.f.horse ? `<div class="cat">Pelaje del caballo</div>${swatch('coat', LOOK.coat)}` : ''}`,
    face: `<div class="cat">Ojos</div>${R.f.glow ? '<p class="mut small">Los ojos de tu raza brillan con luz propia.</p>' : swatch('eyes', LOOK.eyes)}<div class="cat">Detalle</div>${pick('face', LOOK.face)}`,
    hair: `<div class="cat">Color</div>${swatch('hair', LOOK.hair)}<div class="cat">Peinado</div>${pick('hairStyle', LOOK.hairStyle)}<div class="cat">Barba</div>${pick('beard', LOOK.beard)}`,
    cloth: `<div class="cat">Camiseta</div>${swatch('shirt', LOOK.cloth)}<div class="cat">Pantalón</div>${swatch('pants', LOOK.cloth)}<div class="cat">Calzado</div>${swatch('shoes', LOOK.cloth)}` };
  h += `<div class="ccl"><canvas id="ccPrev" width="208" height="250"></canvas><div class="row center"><button data-cc="rot:-1">⟲</button><button data-cc="rand">🎲 Al azar</button><button data-cc="rot:1">⟳</button></div>
    <label class="fl"><span>Nombre</span><input id="ccName" type="text" maxlength="24" value="${esc(CC.name)}"></label>
    <div class="mtabs">${LT.map(([k, n]) => `<button data-ctab="lt:${k}" class="${CC.lt === k ? 'on' : ''}">${n}</button>`).join('')}</div><div class="ltab">${lt[CC.lt]}</div></div>`;
  if (!lookOnly) {
    const MT = [['race', '🧬 Raza'], ['prof', '⚒ Profesión'], ['mood', '🎭 Personalidad'], ['bg', '📜 Trasfondo'], ['phys', '🧍 Físico'], ['marks', `✒ Marcas ${(CC.look.marks || []).length}/${MARKS_MAX}`]];
    const card = (attr, k, o, on, extra = '') => `<button class="prof ${on ? 'on' : ''}" data-${attr}="${k}"><span class="pi">${o.i}</span><span><b>${esc(o.n)}</b>${extra}<br><span class="small mut">${esc(o.d)}</span></span></button>`;
    const mt = { race: Object.entries(RACES).map(([k, r]) => card('cr', k, r, CC.look.race === k)).join(''),
      prof: Object.entries(PROFS).map(([k, p]) => card('cp', k, p, CC.prof === k, ` <span class="mut small">${p.pts > 0 ? '+' + p.pts : p.pts} pts</span>`)).join(''),
      mood: Object.entries(MOODS).map(([k, m]) => card('cm', k, m, CC.look.mood === k)).join(''),
      bg: Object.entries(BACKGROUNDS).map(([k, b]) => card('cb', k, b, (CC.look.bg || 'none') === k)).join(''),
      phys: `<div class="cat span2">Edad</div>${Object.entries(AGES).map(([k, a]) => card('cag', k, a, (CC.look.age || 'adult') === k)).join('')}<div class="cat span2">Estatura</div>${Object.entries(HEIGHTS).map(([k, h]) => card('cht', k, h, (CC.look.height || 'medium') === k)).join('')}`,
      marks: Object.entries(MARKS).map(([k, m]) => card('cmk', k, m, (CC.look.marks || []).includes(k))).join('') };
    h += `<div class="ccm"><div class="mtabs">${MT.map(([k, n]) => `<button data-ctab="mt:${k}" class="${CC.mt === k ? 'on' : ''}">${n}</button>`).join('')}</div><div class="profs">${mt[CC.mt]}</div></div>`;
    h += `<div class="ccr"><div class="cat row">Rasgos <span class="pts ${pts < 0 ? 'bad' : 'good'}">Puntos: ${pts}</span></div><p class="mut small">Los rasgos positivos cuestan puntos y los negativos los dan. No puedes acabar en negativo.</p>`;
    for (const [lab, pos] of [['Positivos', 1], ['Negativos', 0]]) {
      h += `<div class="cat">${lab}</div><div class="traits">`;
      for (const k in TRAITS) { const t = TRAITS[k]; if ((t.c > 0) !== !!pos) continue; const on = CC.traits.includes(k), blocked = !on && CC.traits.some(o => (TRAITS[o].x || []).includes(k) || (t.x || []).includes(o)); h += `<button class="tr ${on ? 'on' : ''} ${blocked ? 'blk' : ''}" data-ct="${k}" title="${esc(t.d)}"><span>${t.i}</span><span>${esc(t.n)}</span><span class="tc ${t.c > 0 ? 'neg' : 'posi'}">${t.c > 0 ? '-' + t.c : '+' + -t.c}</span></button>`; }
      h += `</div>`;
    }
    h += `<div id="ccTip" class="mut small"></div></div>`;
  }
  h += `</div><div class="ccfoot"><span class="ccsum" id="ccTip2">${esc(ageOf(CC.look).n)} · ${esc(raceOf(CC.look).n)} · ${CC.look.bg && CC.look.bg !== 'none' ? esc(bgOf(CC.look).n.toLowerCase()) + ' · ' : ''}${lookOnly ? '' : esc((PROFS[CC.prof] || {}).n || '') + ' · '}${esc(moodOf(CC.look).n.toLowerCase())}${lookOnly ? '' : ' · ' + CC.traits.length + ' rasgos'}</span><button class="pri big" data-cc="ok" ${!lookOnly && pts < 0 ? 'disabled' : ''}>${lookOnly ? 'Guardar apariencia' : 'Empezar a jugar'}</button></div></div>`;
  $('tBody').innerHTML = h;
  [...document.querySelectorAll('.ccgrid > div, .profs')].forEach((e, i) => { if (keep[i]) e.scrollTop = keep[i]; });
}
function ccLoop() {
  cancelAnimationFrame(_ccRaf);
  const step = () => {
    const cv = $('ccPrev'); if (!cv || !CC) return;
    CC.t += 0.016; const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height);
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(104, 222, 44, 12, 0, 0, 7); c.fill();
    const eq = CC.mode === 'look' ? S.equip : (PROFS[CC.prof].kit.reduce((o, [id]) => { const a = ITEMS[id] && ITEMS[id].armor; if (a) o[a.slot] = id; return o; }, {}));
    drawAvatar(c, CC.look, eq, 104, 226, CC.ang, CC.t * 7, true, 7);
    _ccRaf = requestAnimationFrame(step);
  };
  step();
}
$('mTitle').addEventListener('click', e => {
  if (!CC) return;
  const cl = e.target.closest('[data-cl]'); if (cl) { const [k, i] = cl.dataset.cl.split('|'); CC.look[k] = +i; renderCC(); ccLoop(); return; }
  const cp = e.target.closest('[data-cp]'); if (cp) { CC.prof = cp.dataset.cp; renderCC(); ccLoop(); return; }
  const tb = e.target.closest('[data-ctab]'); if (tb) { const [w, k] = tb.dataset.ctab.split(':'); CC[w] = k; renderCC(); ccLoop(); return; }
  const cr = e.target.closest('[data-cr]'); if (cr) { CC.look.race = cr.dataset.cr; if (CC.look.race === 'dwarf' && !CC.look.beard) CC.look.beard = 3; renderCC(); ccLoop(); return; }
  const cm = e.target.closest('[data-cm]'); if (cm) { CC.look.mood = cm.dataset.cm; renderCC(); ccLoop(); return; }
  const cb = e.target.closest('[data-cb]'); if (cb) { CC.look.bg = cb.dataset.cb; renderCC(); ccLoop(); return; }
  const cag = e.target.closest('[data-cag]'); if (cag) { CC.look.age = cag.dataset.cag; renderCC(); ccLoop(); return; }
  const cht = e.target.closest('[data-cht]'); if (cht) { CC.look.height = cht.dataset.cht; renderCC(); ccLoop(); return; }
  const cmk = e.target.closest('[data-cmk]'); if (cmk) { const k = cmk.dataset.cmk, ms = (CC.look.marks || []).slice(), i = ms.indexOf(k); if (i >= 0) ms.splice(i, 1); else { if (ms.length >= MARKS_MAX) { toastErr(`Como mucho ${MARKS_MAX} marcas: quita una antes`); return; } ms.push(k); } CC.look.marks = ms; renderCC(); ccLoop(); return; }
  const ct = e.target.closest('[data-ct]'); if (ct) {
    const k = ct.dataset.ct; if (CC.traits.includes(k)) CC.traits = CC.traits.filter(x => x !== k);
    else { if (CC.traits.some(o => (TRAITS[o].x || []).includes(k) || (TRAITS[k].x || []).includes(o))) { toastErr('Ese rasgo es incompatible con otro que ya tienes'); return; } CC.traits.push(k); }
    renderCC(); ccLoop(); return;
  }
  const b = e.target.closest('[data-cc]'); if (!b) return;
  const a = b.dataset.cc;
  if (a.startsWith('rot:')) CC.ang += +a.slice(4) * Math.PI / 4;
  else if (a === 'rand') { const r = n => (Math.random() * n) | 0; const rk = Object.keys(RACES), mk = Object.keys(MOODS); CC.look = { race: rk[r(rk.length)], mood: mk[r(mk.length)], skin: r(6), hair: r(LOOK.hair.length), eyes: r(LOOK.eyes.length), hairStyle: r(LOOK.hairStyle.length), beard: r(3) ? 0 : r(5), body: r(3), shirt: r(12), pants: r(12), shoes: r(12), face: r(3) ? 0 : r(LOOK.face.length), coat: r(LOOK.coat.length), bg: Object.keys(BACKGROUNDS)[r(Object.keys(BACKGROUNDS).length)], age: Object.keys(AGES)[r(5)], height: Object.keys(HEIGHTS)[r(4)], marks: Object.keys(MARKS).filter(() => Math.random() < 0.12).slice(0, MARKS_MAX) }; renderCC(); ccLoop(); }
  else if (a === 'cancel') { closeCC(); }
  else if (a === 'ok') {
    CC.name = ($('ccName').value || '').trim() || 'Superviviente';
    if (CC.mode === 'look') { S.char.look = { ...CC.look }; S.char.name = CC.name; closeCC(); toast('Apariencia guardada'); return; }
    if (traitPoints(CC.prof, CC.traits) < 0) { toastErr('Te faltan puntos: quita rasgos positivos o añade negativos'); return; }
    const done = CC.done; applyCharacter({ name: CC.name, look: { ...CC.look }, prof: CC.prof, traits: CC.traits.slice() }); closeCC(true); if (done) done();
  }
});
$('mTitle').addEventListener('mouseover', e => { if (!CC || !$('ccTip')) return; const t = e.target.closest('[data-ct]'); if (t) $('ccTip').textContent = TRAITS[t.dataset.ct].n + ': ' + TRAITS[t.dataset.ct].d; });
$('mTitle').addEventListener('input', e => { if (CC && e.target.id === 'ccName') CC.name = e.target.value; });
function closeCC(keepTitle) { cancelAnimationFrame(_ccRaf); CC = null; $('mTitle').classList.remove('ccmode'); if (!keepTitle) closeTitle(); }
