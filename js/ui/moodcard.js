'use strict';
// =====================================================================================
//  Tarjeta de cada estado o enfermedad (al pasar el ratón por él, en el HUD o en la ficha):
//   · Gráfico de causa → estado → cura, con lo que te lo provocó y lo que lo arregla.
//   · Medidor de cómo estás, barras de lo que te quita (velocidad, fuerza, aguante…)
//     y la evolución: cuándo se pasa solo y cuándo empeora si no lo tratas.
//   · Los remedios que llevas son botones: un clic y lo usas, sin abrir el inventario.
//  Se queda abierta mientras tienes el ratón encima.
// =====================================================================================
const ILL_CAUSE = {
  cold: [['🌧', 'Mojarte'], ['🥶', 'con frío']], flu: [['🤧', 'Resfriado'], ['⏳', 'sin cuidar']], pneumonia: [['🤒', 'Gripe o bronquitis'], ['⏳', 'sin cuidar']],
  cough: [['💨', 'Polvo, humo'], ['🌋', 'o ceniza']], bronchitis: [['😷', 'Tos'], ['💨', 'seguir respirando polvo']], soreThroat: [['🥶', 'Frío'], ['🗣', 'garganta seca']],
  sinusitis: [['🤧', 'Resfriado'], ['🌧', 'humedad']], fever: [['🦠', 'Infección'], ['🤒', 'o enfermedad']], headache: [['☀', 'Sol o calor'], ['💧', 'sed']],
  migraine: [['🤕', 'Dolor de cabeza'], ['⏳', 'sin cuidar']], dehydration: [['💧', 'Mucho rato'], ['⏳', 'sin beber']], indigestion: [['🍖', 'Comer demasiado'], ['⚡', 'de golpe']],
  diarrhea: [['🥩', 'Comida cruda'], ['🏞', 'o agua sucia']], foodPoisoning: [['🥩', 'Crudo'], ['🦠', 'o en mal estado']], nausea: [['🌊', 'Mucho rato'], ['🏊', 'en el agua']],
  gastritis: [['🌶', 'Picante'], ['⏳', 'o ayuno']], hangover: [['🍷', 'Alcohol'], ['💧', 'sin agua']], toothache: [['🍬', 'Mucho dulce'], ['🦷', 'muela picada']],
  hayFever: [['🌼', 'Polen'], ['🌾', 'praderas de día']], hives: [['🌿', 'Plantas'], ['🐝', 'o picaduras']], conjunctivitis: [['💨', 'Polvo'], ['👁', 'en los ojos']],
  stye: [['✋', 'Manos sucias'], ['👁', 'en los ojos']], otitis: [['🏊', 'Mucho rato'], ['👂', 'en el agua']], ingrownNail: [['🚶', 'Andar'], ['⏳', 'muchas horas']],
  athleteFoot: [['🌧', 'Pies mojados'], ['🚶', 'andando']], chilblains: [['🥶', 'Frío'], ['🌧', 'húmedo']], lumbago: [['⛏', 'Trabajar'], ['⏳', 'sin parar']],
  stiffNeck: [['😴', 'Dormir mal'], ['❄', 'o corriente']], insomnia: [['😰', 'Nervios'], ['☕', 'o café']], exhaustion: [['🌙', 'Sin dormir'], ['⏳', 'mucho tiempo']],
  stress: [['💥', 'Muchos golpes'], ['⚔', 'seguidos']], lice: [['🐑', 'Animales'], ['🧑', 'o gente']], scabies: [['🛏', 'Suciedad'], ['🐀', 'o animales']], altitude: [['⛰', 'Lo alto'], ['🏔', 'de la montaña']],
};
const FX_N = { spd: ['🏃', 'Velocidad'], wrk: ['✋', 'Fuerza'], stam: ['💨', 'Aguante'], hun: ['🍖', 'Hambre'], thi: ['💧', 'Sed'], ene: ['🌙', 'Cansancio'], xp: ['📘', 'Aprender'], hp: ['❤', 'Vida'], pain: ['🤕', 'Dolor'], temp: ['🌡', 'Fiebre'] };
const mcMin = s => s >= 60 ? Math.round(s / 60) + ' min' : Math.max(1, Math.round(s)) + ' s';
// Un objeto que llevas y sirve: botón para usarlo (o ir a Salud si es para curar una herida)
function mcHaveBtn(id, sub) {
  const n = invCount(id); if (!n) return `<span class="mcnode off" title="No lo llevas">${itemImg(id, 18)}<small>${esc(ITEMS[id].n)}</small>${sub ? `<em>${sub}</em>` : ''}</span>`;
  const it = ITEMS[id], act = it.food || it.med || it.medItem ? 'use' : 'heal';
  return `<button class="mcnode have" data-mcuse="${id}" data-mcact="${act}">${itemImg(id, 18)}<small>${esc(it.n)} ×${n}</small>${sub ? `<em>${sub}</em>` : ''}<b>${act === 'use' ? 'Usar' : 'Curar'}</b></button>`;
}
const mcTip = (i, t) => `<span class="mcnode tip"><span class="mci">${i}</span><small>${t}</small></span>`;
// ---------- Modelo de cada estado ----------
function mcModel(m) {
  const pc = S.pc;
  // Enfermedades
  const ill = Object.keys(ILLS).find(k => m.n.startsWith(ILLS[k].n + ':'));
  if (ill) {
    const D = ILLS[ill], I = (pc.ills || {})[ill] || { left: D.dur, t: 0 };
    const cures = (D.cure || []).filter(([id]) => ITEMS[id]).sort((a, b) => (invCount(b[0]) > 0) - (invCount(a[0]) > 0) || b[1] - a[1]);
    return { i: D.i, t: D.n, sev: D.sev, sym: D.sym, why: I.why,
      cause: (ILL_CAUSE[ill] || [['❔', 'Varias causas']]).map(([i, t]) => mcTip(i, esc(t))),
      cure: [...cures.slice(0, 4).map(([id, k]) => mcHaveBtn(id, k ? '−' + Math.round(k * 100) + ' %' : '')), mcTip('🛌', 'Descansar quieto ×2')],
      fx: Object.entries(D.fx || {}), heal: { p: clamp(1 - I.left / D.dur, 0, 1), txt: `Se pasa solo en ~${mcMin(Math.max(0, I.left))}` },
      worse: D.next && !I.treated && ILLS[D.next[0]] ? { p: clamp(I.t / D.next[1], 0, 1), txt: `Empeora a ${ILLS[D.next[0]].i} ${ILLS[D.next[0]].n} en ${mcMin(Math.max(0, D.next[1] - I.t))} si no lo tratas` } : null,
      tips: ['Comido y bebido (más del 50 %) se cura antes.', 'Un remedio lo «trata»: ya no empeora.'] };
  }
  const H = MH[m.i] ? MH[m.i](m) : null; if (!H) return null;
  const sev = m.lv || 1, base = { i: m.i, t: H.t, short: H.t.split(' · ')[0].split(':')[0], sev, sym: H.why, tips: [...(H.alt || [])] };
  const foods = (k, n = 4) => mhHave(it => it.food && it.food[k] > 0, 8).sort((a, b) => ITEMS[b[0]].food[k] - ITEMS[a[0]].food[k]).slice(0, n).map(([id]) => mcHaveBtn(id, '+' + ITEMS[id].food[k]));
  const items = (re, n = 3) => mhHave((it, id) => re.test(id), 6).slice(0, n).map(([id]) => mcHaveBtn(id));
  const meter = (v, max, txt, col) => ({ p: clamp(v / max, 0, 1), txt, col });
  switch (m.i) {
    case '❤': { const fails = [[pc.food > 40, '🍖', 'Hambre'], [pc.water > 40, '💧', 'Sed'], [!bleedOf(), '🩸', 'Sangrado'], [!(pc.poison > 0), '🤢', 'Veneno'], [pc.temp >= 35.5, '🥶', 'Frío'], [!(typeof infected === 'function' && infected()), '🦠', 'Infección'], [pc.energy > 20, '🌙', 'Cansancio']].filter(x => !x[0]);
      return { ...base, t: 'Vida baja', short: 'Vida baja', sym: 'Tu vida total, no la de cada parte del cuerpo.', meter: meter(pc.hp, maxHp(), `${Math.round(pc.hp)} / ${Math.round(maxHp())}`, '#e05050'),
        cause: fails.length ? fails.map(([, i, t]) => mcTip(i, t + ' (frena la curación)')) : [mcTip('⚔', 'Golpes y caídas')],
        cure: [...foods('hp', 3), mcTip('🛏', 'Dormir en cama'), mcTip('🔥', 'Hoguera y techo')], fx: [], tips: ['Se cura sola si no tienes hambre, sed, frío, veneno, sangrado ni infección.', ...base.tips] }; }
    case '🍖': return { ...base, meter: meter(pc.food, 100, Math.round(pc.food) + ' %', '#e0a040'), cause: [mcTip('⏳', 'El tiempo'), mcTip('⛏', 'Correr y trabajar'), mcTip('🥶', 'El frío')], cure: foods('f').length ? foods('f') : [mcTip('🥩', 'Caza y cocina'), mcTip('🌾', 'Huerto')], fx: [['regen', 0], ['spd', pc.food < 20 ? 0.9 : 1]] };
    case '💧': return { ...base, meter: meter(pc.water, 100, Math.round(pc.water) + ' %', '#4aa8ec'), cause: [mcTip('☀', 'Calor'), mcTip('🏃', 'Correr'), mcTip('🤒', 'Fiebre')], cure: foods('w').length ? foods('w') : [mcTip('🏞', 'Río + hervir'), mcTip('🍉', 'Fruta')], fx: [['regen', 0]] };
    case '😴': return { ...base, meter: meter(pc.energy, 100, Math.round(pc.energy) + ' %', '#a080e0'), cause: [mcTip('⏳', 'Horas despierto'), mcTip('⛏', 'Trabajo')], cure: [mcTip('🛏', 'Dormir en cama'), ...items(/coffee|tea/i, 2)], fx: [['wrk', pc.energy < 15 ? 0.8 : 0.92]] };
    case '💨': return { ...base, meter: meter(pc.stam, maxStam(), Math.round(pc.stam) + '', '#7fd07a'), cause: [mcTip('🏃', 'Correr'), mcTip('💨', 'Esquivar')], cure: [mcTip('✋', 'Parar unos segundos')], fx: [] };
    case '🥶': return { ...base, meter: meter(pc.temp - 30, 7.5, pc.temp.toFixed(1).replace('.', ',') + ' °C', '#6ab0ff'), cause: [mcTip('🌙', 'Noche'), mcTip(WX.wet > 30 ? '🌧' : '❄', WX.wet > 30 ? 'Estás mojado' : 'Nieve y viento')], cure: [mcTip('🔥', 'Hoguera cerca'), mcTip('🧥', 'Ropa de abrigo'), mcTip('🏠', 'Bajo techo'), ...items(/soup|tea|chili|stew|milk/i, 2)], fx: [['spd', 0.9], ['hp', pc.temp < 35 ? 0.12 : 0]] };
    case '🥵': return { ...base, cause: [mcTip('☀', 'Sol fuerte'), mcTip('🏜', 'Bioma caluroso')], cure: [mcTip('🏠', 'Sombra o techo'), ...foods('w', 2)], fx: [['thi', 1.3]] };
    case '🩸': return { ...base, cause: [mcTip('🗡', 'Cortes'), mcTip('🐺', 'Mordiscos')], cure: [...items(/bandage|gauze|tourniquet|medkit|plaster/i), mcTip('🩹', 'Ficha › Salud')], fx: [['hp', bleedOf()]] };
    case '🤕': return { ...base, cause: [mcTip('🩹', 'Heridas'), mcTip('🦴', 'Fracturas')], cure: [...items(/painkiller|morphine|willow/i), mcTip('🩹', 'Curar heridas')], fx: [['spd', 0.92], ['wrk', 0.9]] };
    case '🦴': return { ...base, cause: [mcTip('⬇', 'Caídas'), mcTip('💥', 'Golpes fuertes')], cure: [...items(/splint/i), mcTip('🪵', 'Entablillar en Salud')], fx: [['spd', 0.85]] };
    case '🌡': return { ...base, cause: [mcTip('🩹', 'Herida sucia'), mcTip('⏳', 'sin limpiar')], cure: [...items(/poultice|antibiotic|iodine|alcohol/i), mcTip('🧴', 'Desinfectar')], fx: [['regen', 0]] };
    case '🤢': return { ...base, cause: [mcTip('🐍', 'Mordisco venenoso'), mcTip('🥩', 'Comida cruda')], cure: [...items(/antidote|charcoal|milk/i), mcTip('⏳', 'Esperar tranquilo')], fx: [['hp', 0.3]] };
  }
  return { ...base, cause: [], cure: [], fx: [] };
}
// ---------- Dibujo ----------
function mcFxBar([k, v]) {
  if (k === 'regen') return `<div class="mcfx"><span>❤ Curarse solo</span><i><b style="width:0%"></b></i><em class="bad">parado</em></div>`;
  const N = FX_N[k]; if (!N || v === 1 || v === 0) return '';
  if (k === 'hp') return `<div class="mcfx"><span>${N[0]} Vida</span><i><b class="neg" style="width:${Math.min(100, v * 400)}%"></b></i><em class="bad">−${(v * 60).toFixed(1).replace('.', ',')}/min</em></div>`;
  if (k === 'pain') return `<div class="mcfx"><span>${N[0]} Dolor</span><i><b class="neg" style="width:${Math.min(100, v * 5)}%"></b></i><em class="bad">+${v}</em></div>`;
  if (k === 'temp') return `<div class="mcfx"><span>${N[0]} Fiebre</span><i><b class="neg" style="width:${Math.min(100, v * 40)}%"></b></i><em class="bad">+${(v * 0.9).toFixed(1).replace('.', ',')} °C</em></div>`;
  const more = ['hun', 'thi', 'ene'].includes(k), pct = Math.round((v - 1) * 100);
  return more ? `<div class="mcfx"><span>${N[0]} ${N[1]}</span><i><b class="neg" style="width:${Math.min(100, pct)}%"></b></i><em class="bad">gastas +${pct} %</em></div>`
    : `<div class="mcfx"><span>${N[0]} ${N[1]}</span><i><b style="width:${Math.round(v * 100)}%"></b><u style="left:${Math.round(v * 100)}%;width:${100 - Math.round(v * 100)}%"></u></i><em class="bad">${pct} %</em></div>`;
}
function mcHTML(m) {
  const M = mcModel(m); if (!M) return '';
  const sevN = ['', 'Leve', 'Moderado', 'Grave'][M.sev] || '', col = ['', '#f0c75e', '#ff9a4a', '#ff5b5b'][M.sev] || '#f0c75e';
  const fx = (M.fx || []).map(mcFxBar).join('');
  return `<div class="mc" style="--mcc:${col}">
    <header><span class="mcbig">${M.i}</span><div><b>${esc(M.t)}</b><small>${esc(M.sym || '')}</small></div><span class="mcsev">${sevN}</span></header>
    ${M.meter ? `<div class="mcmeter"><i><b style="width:${(M.meter.p * 100).toFixed(0)}%;background:${M.meter.col}"></b></i><span>${M.meter.txt}</span></div>` : ''}
    <div class="mcflow">
      <div class="mccol"><small>Causa</small>${M.cause.join('') || mcTip('❔', 'Varias')}${M.why ? `<em class="mcwhy">Esta vez: ${esc(M.why)}</em>` : ''}</div>
      <svg class="mcarr" viewBox="0 0 24 12"><path d="M0 6h20M15 1l6 5-6 5" /></svg>
      <div class="mcmid"><span class="mcring"><span>${M.i}</span></span><small>${esc(M.short || M.t)}</small></div>
      <svg class="mcarr" viewBox="0 0 24 12"><path d="M0 6h20M15 1l6 5-6 5" /></svg>
      <div class="mccol"><small>Cura</small>${M.cure.join('') || mcTip('⏳', 'Con el tiempo')}</div>
    </div>
    ${fx ? `<div class="mcsec">Te quita</div>${fx}` : ''}
    ${M.heal || M.worse ? `<div class="mcsec">Evolución</div>${M.heal ? `<div class="mctime good"><i><b style="width:${(M.heal.p * 100).toFixed(0)}%"></b></i><span>✓ ${M.heal.txt}</span></div>` : ''}${M.worse ? `<div class="mctime bad"><i><b style="width:${(M.worse.p * 100).toFixed(0)}%"></b></i><span>⚠ ${esc(M.worse.txt)}</span></div>` : ''}` : ''}
    ${M.tips && M.tips.length ? `<details class="mctips"><summary>Más formas de arreglarlo</summary><ul>${M.tips.map(t => `<li>${t}</li>`).join('')}</ul></details>` : ''}
  </div>`;
}
// ---------- Mostrar al pasar el ratón; se queda mientras estás encima ----------
const mcEl = document.createElement('div'); mcEl.id = 'mcCard'; mcEl.hidden = true; document.body.appendChild(mcEl);
let _mcSrc = null, _mcHide = 0, _mcMood = null, _mcSig = '';
function mcShow(el, m) {
  clearTimeout(_mcHide); const h = mcHTML(m); if (!h) return; _mcSrc = el; _mcMood = m;
  const open = mcEl.querySelector('details[open]') ? 1 : 0; mcEl.innerHTML = h; if (open) { const d = mcEl.querySelector('details'); if (d) d.open = true; } _mcSig = h;
  mcEl.hidden = false; const r = el.getBoundingClientRect(), w = mcEl.offsetWidth, hh = mcEl.offsetHeight;
  let x = r.left - w - 12, y = r.top + r.height / 2 - hh / 2; if (x < 8) x = Math.min(innerWidth - w - 8, r.right + 12);
  if (r.top < 300 && r.left < innerWidth - w - 20 && x > r.left) { /* a la derecha ya */ }
  if (el.closest('.csmoo')) { x = Math.min(innerWidth - w - 8, Math.max(8, r.left)); y = r.bottom + 8; if (y + hh > innerHeight - 8) y = r.top - hh - 8; }
  mcEl.style.left = Math.round(x) + 'px'; mcEl.style.top = Math.round(clamp(y, 8, innerHeight - hh - 8)) + 'px'; mcEl.classList.add('on');
}
function mcHideSoon() { clearTimeout(_mcHide); _mcHide = setTimeout(() => { mcEl.classList.remove('on'); setTimeout(() => { if (!mcEl.classList.contains('on')) mcEl.hidden = true; }, 160); _mcSrc = null; }, 220); }
document.addEventListener('mouseover', e => {
  if (e.target.closest && e.target.closest('#mcCard')) { clearTimeout(_mcHide); return; }
  const el = e.target.closest && e.target.closest('.csmoo .csch, #moodles .moo'); if (!el || !S || !S.pc) return;
  const i = [...el.parentNode.children].indexOf(el), m = moodles()[i]; if (!m || m.good) return;
  el.removeAttribute('title'); if (_mcSrc === el && !mcEl.hidden) { clearTimeout(_mcHide); return; } mcShow(el, m);
});
document.addEventListener('mouseout', e => {
  const from = e.target.closest && (e.target.closest('#mcCard') || e.target.closest('.csmoo .csch, #moodles .moo')); if (!from) return;
  const to = e.relatedTarget; if (to && to.closest && (to.closest('#mcCard') || (_mcSrc && _mcSrc.contains(to)))) return; mcHideSoon();
});
// Botones de remedio
mcEl.addEventListener('click', e => {
  const b = e.target.closest('[data-mcuse]'); if (!b || !S) return; const id = b.dataset.mcuse;
  if (b.dataset.mcact === 'heal') { openChar(); CS2.tab = 'health'; document.querySelectorAll('[data-cst]').forEach(x => x.classList.toggle('on', x.dataset.cst === 'health')); mcEl.hidden = true; return; }
  const s = S.inv.find(x => x && x.id === id); if (!s) return; survUse(s); invVersion++; vitalsDirty = true; tone(700, 0.06, 'sine', 0.03, 1.4);
  setTimeout(() => { if (!_mcSrc || mcEl.hidden) return; const i = [...(_mcSrc.parentNode ? _mcSrc.parentNode.children : [])].indexOf(_mcSrc), m = moodles()[i]; if (m && !m.good && m.n === _mcMood.n) mcShow(_mcSrc, m); else mcHideSoon(); }, 120);
});
// Mientras está abierta, los números se actualizan (tiempo que falta, medidor…)
setInterval(() => { if (mcEl.hidden || !_mcSrc || !_mcMood || !S || !S.pc) return; const h = mcHTML(_mcMood); if (h && h !== _mcSig && !mcEl.matches(':hover')) mcShow(_mcSrc, _mcMood); }, 1000);
