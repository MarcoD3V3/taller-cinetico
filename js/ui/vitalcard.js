'use strict';
// =====================================================================================
//  Tarjeta al pasar el ratón por la silueta, los anillos (vida, hambre, sed, energía, maná)
//  o la barra de aguante. Pequeña y visual:
//   · Medidor grande con el valor y cómo estás (bien, bajo, crítico).
//   · Gráfico de los últimos 2 minutos y a qué ritmo va: «se acaba en ~8 min».
//   · Zonas: dónde empieza cada aviso y dónde estás tú.
//   · Qué lo sube y qué lo baja, y lo que llevas encima que sirve (un clic y lo usas).
//  En la silueta: cada parte del cuerpo con su estado, dolor, sangrado y temperatura.
// =====================================================================================
const VC = { hp: [], food: [], water: [], energy: [], mana: [], stam: [] }, VC_N = 120;
const VC_D = {
  hp: { n: 'Vida', i: '❤', c: '#e05050', zones: [[0.25, 'Grave'], [0.5, 'Herido'], [0.75, 'Magullado'], [1, 'Bien']],
    up: [['🍲', 'Comer bien'], ['🛏', 'Descansar'], ['🩹', 'Curar heridas']], down: [['⚔', 'Golpes'], ['🩸', 'Sangrar'], ['🍖', 'Hambre o sed a cero']] },
  food: { n: 'Hambre', i: '🍖', c: '#e0a040', zones: [[0.08, 'Muriendo'], [0.2, 'Hambriento'], [0.4, 'Con hambre'], [0.92, 'Bien'], [1, 'Lleno']],
    up: [['🍖', 'Comer'], ['🔥', 'Cocinado llena más']], down: [['⏳', 'El tiempo'], ['🏃', 'Correr'], ['⛏', 'Trabajar']] },
  water: { n: 'Sed', i: '💧', c: '#4aa8ec', zones: [[0.08, 'Deshidratado'], [0.2, 'Sediento'], [0.4, 'Con sed'], [1, 'Bien']],
    up: [['💧', 'Beber'], ['🍉', 'Fruta y sopa']], down: [['☀', 'Calor'], ['🏃', 'Correr'], ['🍖', 'Comida salada']] },
  energy: { n: 'Energía', i: '🌙', c: '#a47ae8', zones: [[0.05, 'Agotado'], [0.15, 'Muy cansado'], [0.35, 'Cansado'], [1, 'Bien']],
    up: [['🛏', 'Dormir en cama'], ['💤', 'Z: en el suelo'], ['☕', 'Café']], down: [['⏳', 'Estar despierto'], ['⛏', 'Trabajar'], ['🏃', 'Correr']] },
  mana: { n: 'Maná', i: '✦', c: '#40d0d0', zones: [[0.15, 'Vacío'], [0.5, 'Bajo'], [1, 'Bien']],
    up: [['⏳', 'Se recupera solo'], ['🧪', 'Pociones']], down: [['✨', 'Lanzar hechizos']] },
  stam: { n: 'Aguante', i: '💨', c: '#7fd07a', zones: [[0.25, 'Sin aliento'], [1, 'Bien']],
    up: [['🚶', 'Andar o parar'], ['🍖', 'Ir comido']], down: [['🏃', 'Correr'], ['⚔', 'Atacar'], ['⛏', 'Picar']] },
};
const vcCur = k => { const pc = S.pc; return k === 'hp' ? [pc.hp, maxHp()] : k === 'mana' ? [pc.mana, maxMana()] : k === 'stam' ? [pc.stam, maxStam()] : [pc[k], 100]; };
// Muestra cada segundo (para el gráfico y el ritmo)
setInterval(() => { if (!S || !S.pc || ui.open === 'title') return; for (const k in VC) { const [v, m] = vcCur(k), a = VC[k]; a.push(clamp(v / Math.max(1, m), 0, 1)); if (a.length > VC_N) a.shift(); } }, 1000);
const vcRate = k => { const a = VC[k]; if (a.length < 8) return 0; const n = Math.min(30, a.length - 1); return (a[a.length - 1] - a[a.length - 1 - n]) / n; }; // fracción por segundo
const vcTime = s => s >= 3600 ? '>1 h' : s >= 60 ? '~' + Math.round(s / 60) + ' min' : '~' + Math.max(1, Math.round(s)) + ' s';
function vcGauge(f, c, icon) {
  const R = 26, L = 2 * Math.PI * R;
  return `<svg class="vcg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${R}" class="bg"/><circle cx="32" cy="32" r="${R}" class="fg" style="stroke:${c};stroke-dasharray:${(f * L).toFixed(1)} ${L.toFixed(1)}"/><text x="32" y="38">${icon}</text></svg>`;
}
function vcSpark(a, c, zones) {
  const W = 220, H = 46; if (a.length < 2) return `<div class="vcsp mut small">Juntando datos…</div>`;
  const step = W / (VC_N - 1), off = W - (a.length - 1) * step, y = v => (H - 3 - v * (H - 6)).toFixed(1);
  const pts = a.map((v, i) => `${(off + i * step).toFixed(1)},${y(v)}`).join(' ');
  const lines = zones.slice(0, -1).map(([z]) => `<line x1="0" x2="${W}" y1="${y(z)}" y2="${y(z)}"/>`).join('');
  return `<svg class="vcsp" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${lines}<polygon points="${off.toFixed(1)},${H} ${pts} ${W},${H}" style="fill:${c}22"/><polyline points="${pts}" style="stroke:${c}"/><circle cx="${W}" cy="${y(a[a.length - 1])}" r="3" style="fill:${c}"/></svg>`;
}
function vcZones(f, zones, c) {
  let prev = 0, h = '';
  zones.forEach(([z, n], i) => { const ok = n === 'Bien' || n === 'Lleno', on = f >= prev && (f < z || z === 1);
    h += `<span class="vcz ${on ? 'on' : ''}" style="flex:${Math.max(0.05, z - prev)};--zc:${ok ? c : `hsl(${4 + i * 18},68%,${50 + i * 4}%)`}"><small>${n}</small></span>`; prev = z; });
  return `<div class="vczb">${h}<i class="vcmk" style="left:${(f * 100).toFixed(1)}%"></i></div>`;
}
// Lo que llevas que sube este valor
function vcHave(k) {
  if (!S.inv) return '';
  const seen = new Map();
  for (const s of S.inv) { if (!s || seen.has(s.id)) continue; const it = ITEMS[s.id]; if (!it || !it.food) continue; const f = it.food, g = k === 'food' ? f.f : k === 'water' ? f.w : k === 'hp' ? f.hp : 0; if (g > 0) seen.set(s.id, g); }
  const best = [...seen].sort((a, b) => b[1] - a[1]).slice(0, 3); if (!best.length) return '';
  return `<div class="vcsec">Llevas</div><div class="vchave">${best.map(([id, g]) => `<button data-vcuse="${id}" title="Usar">${itemImg(id, 20)}<small>${esc(ITEMS[id].n)}</small><b>+${Math.round(g)}</b></button>`).join('')}</div>`;
}
function vcStatHTML(k) {
  const D = VC_D[k], [v, m] = vcCur(k), f = clamp(v / Math.max(1, m), 0, 1);
  const zi = D.zones.findIndex(([z]) => f < z || z === 1), zn = D.zones[Math.max(0, zi)][1], crit = zi === 0 && D.zones.length > 1, low = zi < D.zones.length - 1 && D.zones[zi][1] !== 'Bien';
  const r = vcRate(k); let pace = '<span class="mut">Estable</span>';
  if (r < -0.0004) pace = `<span class="bad">▼ ${(r * 6000).toFixed(1)} %/min</span> · a cero en <b>${vcTime(f / -r)}</b>`;
  else if (r > 0.0004) pace = `<span class="good">▲ +${(r * 6000).toFixed(1)} %/min</span>${f < 0.999 ? ` · lleno en <b>${vcTime((1 - f) / r)}</b>` : ''}`;
  const li = a => a.map(([i, t]) => `<li><span>${i}</span>${t}</li>`).join('');
  let extra = '';
  if (k === 'hp') { const bl = bleedOf(), pn = painOf(); if (bl > 0 || pn > 10) extra = `<div class="vcwarn">${bl > 0 ? `🩸 Sangras: ponte una venda` : ''}${bl > 0 && pn > 10 ? ' · ' : ''}${pn > 10 ? `🤕 Dolor ${Math.round(pn)}` : ''}</div>`; }
  if (k === 'stam' && S.pc.lock) extra = `<div class="vcwarn">💨 Sin aliento: no puedes correr hasta recuperarte un poco</div>`;
  return `<div class="vc" style="--vcc:${D.c}">
    <header>${vcGauge(f, D.c, D.i)}<div><b>${D.n}</b><div class="vcnum">${Math.round(v)}<small> / ${Math.round(m)}</small></div><span class="vcst ${crit ? 'bad' : low ? 'warn' : 'good'}">${zn}</span></div></header>
    <div class="vcsec">Últimos 2 minutos</div>${vcSpark(VC[k], D.c, D.zones)}<div class="vcpace small">${pace}</div>
    ${vcZones(f, D.zones, D.c)}${extra}
    <div class="vcud"><div><div class="vcsec good">Lo sube</div><ul>${li(D.up)}</ul></div><div><div class="vcsec bad">Lo baja</div><ul>${li(D.down)}</ul></div></div>
    ${vcHave(k)}
  </div>`;
}
function vcBodyHTML() {
  const pc = S.pc, parts = PARTS.map(p => [p, partHp(p), pc.parts[p].length]).sort((a, b) => a[1] - b[1]);
  const hurt = parts.filter(p => p[1] < 99.5 || p[2]), bl = bleedOf(), pn = painOf(), t = pc.temp;
  const svg = bodySVG('vcbody'); const rows = (hurt.length ? hurt : parts.slice(0, 3)).slice(0, 5).map(([p, h, n]) => `<div class="vcpart"><span>${PART_N[p]}</span><i><b style="width:${h.toFixed(0)}%;background:${partColor(h)}"></b></i><em>${Math.round(h)} %${n ? ` · ${n}🩹` : ''}</em></div>`).join('');
  const tc = t < 35.5 ? '#6ab0ff' : t > 37.6 ? '#e07050' : '#7fd07a', tf = clamp((t - 33) / 7, 0, 1);
  return `<div class="vc" style="--vcc:#e0b54c">
    <header><div class="vcbw">${svg}</div><div><b>Tu cuerpo</b><span class="vcst ${hurt.length ? 'warn' : 'good'}">${hurt.length ? hurt.length + (hurt.length > 1 ? ' partes heridas' : ' parte herida') : 'Sin heridas'}</span>
      <div class="vcchips"><span title="Dolor" class="${pn > 30 ? 'bad' : ''}">🤕 ${Math.round(pn)}</span><span title="Sangrado" class="${bl > 0 ? 'bad' : ''}">🩸 ${bl > 0 ? 'sí' : 'no'}</span><span title="Velocidad">🏃 ${Math.round(speedMul() * 100)} %</span></div></div></header>
    <div class="vcsec">${hurt.length ? 'Lo que más duele' : 'Todo bien'}</div>${rows}
    <div class="vcsec">Temperatura · ${t.toFixed(1)}°</div><div class="vctemp"><i style="left:${(tf * 100).toFixed(1)}%;background:${tc}"></i><small>Frío</small><small>Normal</small><small>Fiebre</small></div>
    <div class="vctip small mut">Clic o <kbd>C</kbd>: ficha completa con heridas y curas</div>
  </div>`;
}
// ---------- Mostrar ----------
const vcEl = document.createElement('div'); vcEl.id = 'vcCard'; vcEl.hidden = true; document.body.appendChild(vcEl);
let _vcSrc = null, _vcK = null, _vcHide = 0, _vcSig = '';
const vcKey = el => el.id === 'vBody' ? 'body' : el.id === 'vStam' ? 'stam' : el.id && el.id.startsWith('r-') ? el.id.slice(2) : null;
function vcShow(el) {
  const k = vcKey(el); if (!k || !S || !S.pc) return; clearTimeout(_vcHide); _vcSrc = el; _vcK = k;
  const h = k === 'body' ? vcBodyHTML() : vcStatHTML(k); if (h !== _vcSig) { vcEl.innerHTML = h; _vcSig = h; if (k === 'body') paintBody(vcEl.querySelector('.vcbody')); }
  vcEl.hidden = false; const r = el.getBoundingClientRect(), w = vcEl.offsetWidth, hh = vcEl.offsetHeight;
  const x = clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8), y = r.top - hh - 12;
  vcEl.style.left = Math.round(x) + 'px'; vcEl.style.top = Math.round(Math.max(8, y)) + 'px'; vcEl.classList.add('on');
}
function vcHideSoon() { clearTimeout(_vcHide); _vcHide = setTimeout(() => { vcEl.classList.remove('on'); setTimeout(() => { if (!vcEl.classList.contains('on')) vcEl.hidden = true; }, 160); _vcSrc = null; }, 200); }
const VC_SEL = '#vBody, #vitals .ring, #vStam';
document.addEventListener('mouseover', e => {
  const t = e.target; if (!t.closest) return;
  if (t.closest('#vcCard')) { clearTimeout(_vcHide); return; }
  const el = t.closest(VC_SEL); if (!el) return; el.removeAttribute('title'); if (_vcSrc === el && !vcEl.hidden) { clearTimeout(_vcHide); return; } vcShow(el);
});
document.addEventListener('mouseout', e => {
  const from = e.target.closest && (e.target.closest('#vcCard') || e.target.closest(VC_SEL)); if (!from) return;
  const to = e.relatedTarget; if (to && to.closest && (to.closest('#vcCard') || (_vcSrc && _vcSrc.contains(to)))) return; vcHideSoon();
});
vcEl.addEventListener('click', e => {
  const b = e.target.closest('[data-vcuse]'); if (!b || !S) return; const s = S.inv.find(x => x && x.id === b.dataset.vcuse); if (!s) return;
  survUse(s); invVersion++; vitalsDirty = true; if (typeof tone === 'function') tone(700, 0.06, 'sine', 0.03, 1.4); _vcSig = ''; if (_vcSrc) setTimeout(() => _vcSrc && vcShow(_vcSrc), 60);
});
// Los títulos del navegador taparían la tarjeta; mientras está abierta, se actualiza sola
{ const r0 = refreshVitals; refreshVitals = () => { r0(); if (document.getElementById('vBody')) document.querySelectorAll('#vitals .ring[title], #vBody[title], #vStam[title]').forEach(x => x.removeAttribute('title')); }; }
setInterval(() => { if (vcEl.hidden || !_vcSrc || !S || !S.pc || vcEl.matches(':hover')) return; if (!document.body.contains(_vcSrc) || $('vitals').hidden) { vcHideSoon(); return; } vcShow(_vcSrc); }, 1000);
// ---------- Morir una sola vez ----------
// En línea (o con el mundo en segundo plano) la simulación sigue con la pantalla de muerte puesta:
// antes se «moría» en cada fotograma y la pantalla se redibujaba sin parar (los gráficos no
// llegaban a verse). Ahora se muere una vez, y se cierran el inventario y las ventanas de encima.
{ const d0 = die; die = () => {
  if (ui.open === 'dead' || !$('death').hidden) return;
  vcEl.hidden = true; vcEl.classList.remove('on'); _vcSrc = null;
  if (typeof CG !== 'undefined' && CG) try { cgSkip(); } catch (e) { }
  if (ui.open && ui.open !== 'title') try { closeModal(); } catch (e) { }
  if (typeof hideTip === 'function') hideTip();
  d0(); }; }
