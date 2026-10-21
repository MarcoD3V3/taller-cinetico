'use strict';
// HUD de supervivencia: silueta del cuerpo, anillos de estado, iconos de estado (moodles),
// ficha del personaje (C), muerte, sueño y destello al recibir daño. Visual y con poco texto.
const BODY_SVG = { // viewBox 0 0 100 200 · el personaje nos mira: su izquierda queda a nuestra derecha
  head: '<circle cx="50" cy="20" r="15"/>', torso: '<rect x="33" y="38" width="34" height="62" rx="9"/>',
  armR: '<rect x="18" y="40" width="12" height="50" rx="6"/>', armL: '<rect x="70" y="40" width="12" height="50" rx="6"/>',
  handR: '<rect x="17" y="92" width="13" height="14" rx="5"/>', handL: '<rect x="70" y="92" width="13" height="14" rx="5"/>',
  legR: '<rect x="35" y="102" width="13" height="66" rx="6"/>', legL: '<rect x="52" y="102" width="13" height="66" rx="6"/>',
  footR: '<rect x="31" y="170" width="17" height="11" rx="4"/>', footL: '<rect x="52" y="170" width="17" height="11" rx="4"/>',
};
const PART_C = { head: [50, 20], torso: [50, 68], armR: [24, 64], armL: [76, 64], handR: [23, 99], handL: [77, 99], legR: [41, 135], legL: [58, 135], footR: [39, 176], footL: [61, 176] };
function bodySVG(cls, big) {
  return `<svg class="${cls}" viewBox="0 0 100 200" aria-label="Estado del cuerpo">${PARTS.map(p => `<g data-part="${p}">${BODY_SVG[p]}</g>`).join('')}${big ? '<g class="marks"></g>' : ''}</svg>`;
}
const partColor = h => h >= 95 ? '#4a5a50' : `hsl(${Math.round(h * 1.1)},62%,${38 + (100 - h) * 0.08}%)`;
const RINGS = [['hp', '❤', '#e05050', 'Vida'], ['food', '🍖', '#e0a040', 'Hambre'], ['water', '💧', '#4aa8ec', 'Sed'], ['energy', '🌙', '#a47ae8', 'Energía'], ['mana', '✦', '#40d0d0', 'Maná']];
function buildVitals() {
  $('vitals').innerHTML = `<button class="vbody" id="vBody" title="Personaje (C)">${bodySVG('bmini')}</button><div class="vcol"><div class="rings">${RINGS.map(([k, i, c, n]) => `<div class="ring" id="r-${k}" title="${n}" style="--c:${c}"><svg viewBox="0 0 36 36"><circle class="bg" cx="18" cy="18" r="15.9"/><circle class="fg" cx="18" cy="18" r="15.9" pathLength="100"/></svg><span>${i}</span></div>`).join('')}</div><div class="stam" id="vStam"><i></i></div></div>`;
  $('vBody').onclick = openChar;
}
const ringVal = k => { const pc = S.pc; return k === 'hp' ? pc.hp / maxHp() : k === 'mana' ? pc.mana / maxMana() : pc[k] / 100; };
let _vSig = '';
function refreshVitals() {
  const on = survOn() && ui.open !== 'title';
  $('vitals').hidden = !on; $('moodles').hidden = !on;
  if (!on) return;
  const pc = pcInit();
  if (!$('vBody')) buildVitals();
  for (const [k] of RINGS) {
    const v = clamp(ringVal(k), 0, 1), el = $('r-' + k);
    el.querySelector('.fg').style.strokeDasharray = `${(v * 100).toFixed(1)} 100`;
    el.classList.toggle('low', v < 0.2);
    el.title = `${RINGS.find(r => r[0] === k)[3]}: ${Math.round(k === 'hp' ? pc.hp : k === 'mana' ? pc.mana : pc[k])}`;
  }
  const st = pc.stam / maxStam(), sb = $('vStam'); sb.classList.toggle('full', st >= 0.999); sb.classList.toggle('lock', !!pc.lock); sb.firstChild.style.width = (st * 100).toFixed(1) + '%';
  paintBody(document.querySelector('#vitals .bmini'));
  // Moodles
  const m = moodles(), sig = m.map(x => x.i + x.lv).join();
  if (sig !== _vSig) { _vSig = sig; $('moodles').innerHTML = m.map(x => `<div class="moo l${x.lv} ${x.good ? 'good' : ''}" title="${esc(x.n)}">${x.i}</div>`).join(''); }
  $('hurtFx').classList.toggle('low', pc.hp < maxHp() * 0.25);
  if (ui.open === 'char') refreshChar();
}
function paintBody(svg) {
  if (!svg) return;
  const pc = S.pc;
  for (const g of svg.querySelectorAll('[data-part]')) {
    const p = g.dataset.part, h = partHp(p), L2 = pc.parts[p];
    g.style.fill = partColor(h);
    g.classList.toggle('bl', L2.some(w => !w.b && wFrac(w) > 0.75 && WT[w.t].bleed > 0));
    g.classList.toggle('bd', L2.some(w => w.b));
  }
}
function moodles() {
  const pc = S.pc, out = [], add = (i, n, lv, good) => out.push({ i, n, lv, good });
  if (pc.food < 8) add('🍖', 'Muriendo de hambre', 3); else if (pc.food < 20) add('🍖', 'Hambriento', 2); else if (pc.food < 40) add('🍖', 'Con hambre', 1); else if (pc.food > 92) add('🍖', 'Bien alimentado', 1, 1);
  if (pc.water < 8) add('💧', 'Deshidratado', 3); else if (pc.water < 20) add('💧', 'Sediento', 2); else if (pc.water < 40) add('💧', 'Con sed', 1);
  if (pc.energy < 5) add('😴', 'Agotado: necesitas dormir', 3); else if (pc.energy < 15) add('😴', 'Muy cansado', 2); else if (pc.energy < 35) add('😴', 'Cansado', 1);
  if (pc.lock || pc.stam < 25) add('💨', 'Sin aliento', pc.lock ? 2 : 1);
  const bl = bleedOf(); if (bl > 0) add('🩸', 'Sangrando: usa una venda', bl > 0.3 ? 3 : bl > 0.12 ? 2 : 1);
  const pain = painOf(); if (pain > 60) add('🤕', 'Dolor insoportable', 3); else if (pain > 30) add('🤕', 'Mucho dolor', 2); else if (pain > 10) add('🤕', 'Dolor', 1);
  const h = pc.hp / maxHp(); if (h < 0.25) add('❤', 'Gravemente herido', 3); else if (h < 0.5) add('❤', 'Herido', 2); else if (h < 0.75) add('❤', 'Magullado', 1);
  if (hasWound('fracture')) add('🦴', 'Fractura: usa una férula', 2);
  if (infected()) add('🌡', 'Infección: usa una cataplasma', 2);
  if (pc.poison > 0) add('🤢', 'Envenenado o intoxicado', pc.poison > 15 ? 2 : 1);
  if (pc.temp < 34.5) add('🥶', 'Hipotermia', 3); else if (pc.temp < 35.5) add('🥶', 'Mucho frío', 2); else if (pc.temp < 36.4) add('🥶', 'Frío', 1);
  if (_hot && !_warm) add('🥵', 'Calor: tendrás más sed', 1);
  if (pc.pk > 0) add('💊', 'Calmante', 1, 1);
  if (S.buffs) for (const k in S.buffs) add('✦', BUFF_N[k], 1, 1);
  return out;
}
// Destello rojo al recibir daño
let _hfT = 0;
function hurtFx(a) { const el = $('hurtFx'); el.style.transition = 'none'; el.style.opacity = String(0.35 + a * 0.5); clearTimeout(_hfT); _hfT = setTimeout(() => { el.style.transition = 'opacity .9s'; el.style.opacity = ''; }, 60); vitalsDirty = true; }
// ---------- Ficha del personaje ----------
let _charPart = null, _charSig = '';
function openChar() {
  if (!S) return;
  if (!survOn()) { toast('La supervivencia está desactivada en este mundo'); return; }
  openModal('char'); pcInit(); _charSig = '';
  $('charBody').innerHTML = `<div class="chgrid"><div class="chbody">${bodySVG('bbig', 1)}<div class="mut small" id="chPartN">Toca una parte del cuerpo</div></div><div class="chmid"><div id="chBars"></div><div id="chWounds"></div><div id="chExtra"></div></div><div class="chskills" id="chSkills"></div></div>`;
  refreshChar();
}
function refreshChar() {
  const pc = S.pc, big = document.querySelector('#mChar .bbig'); if (!big) return;
  paintBody(big);
  big.querySelectorAll('[data-part]').forEach(g => g.classList.toggle('sel', g.dataset.part === _charPart));
  // Marcas de heridas sobre el cuerpo
  const marks = []; for (const p of PARTS) pc.parts[p].forEach((w, i) => { const [x, y] = PART_C[p]; marks.push(`<text x="${x + (i % 3 - 1) * 7}" y="${y + 4 + Math.floor(i / 3) * 9}" class="wm ${w.b ? 'b' : ''}">${WT[w.t].i}</text>`); });
  const mk = marks.join(''); const mg = big.querySelector('.marks'); if (mg._h !== mk) { mg._h = mk; mg.innerHTML = mk; }
  $('chPartN').textContent = _charPart ? `${PART_N[_charPart]} · ${Math.round(partHp(_charPart))} %` : 'Toca una parte del cuerpo';
  // Barras
  const bar = (i, n, v, max, c, txt) => `<div class="cbar" title="${n}"><span class="ci">${i}</span><span class="cb"><i style="width:${clamp(v / max, 0, 1) * 100}%;background:${c}"></i></span><span class="cv">${txt ?? Math.round(v)}</span></div>`;
  const bars = bar('❤', 'Vida', pc.hp, maxHp(), '#e05050') + bar('🍖', 'Hambre', pc.food, 100, '#e0a040') + bar('💧', 'Sed', pc.water, 100, '#4aa8ec') + bar('🌙', 'Energía', pc.energy, 100, '#a47ae8')
    + bar('💨', 'Aguante', pc.stam, maxStam(), '#7fd07a') + bar('✦', 'Maná', pc.mana, maxMana(), '#40d0d0') + bar('🌡', 'Temperatura corporal', pc.temp - 30, 7.5, pc.temp < 35.5 ? '#6ab0ff' : '#e0b54c', pc.temp.toFixed(1) + '°')
    + `<div class="cstats"><span title="Velocidad">🏃 ${Math.round(speedMul() * 100)} %</span><span title="Fuerza al trabajar">✋ ${Math.round(workMul() * 100)} %</span><span title="Dolor">🤕 ${Math.round(painOf())}</span><span title="Temperatura del ambiente">☁ ${Math.round(ambient())}°</span><span title="Muertes">✝ ${pc.deaths}</span></div>`;
  // Heridas (de la parte elegida o todas)
  let wh = '';
  for (const p of PARTS) { if (_charPart && p !== _charPart) continue; pc.parts[p].forEach((w, i) => {
    const t = WT[w.t], btn = [];
    if (!w.b && t.bleed > 0) btn.push(['bandage', 'Vendar']);
    if (w.t === 'fracture' && !w.sp) btn.push(['splint', 'Entablillar']);
    if (w.inf || (w.t === 'bite' && !w.dis)) btn.push(['poultice', 'Desinfectar']);
    wh += `<div class="wnd"><span class="wi">${t.i}</span><span class="wn">${t.n}<span class="mut"> · ${PART_N[p]}</span>${w.inf ? ' <span class="bad">infectada</span>' : ''}${w.b ? ' <span class="good">vendada</span>' : ''}${w.sp ? ' <span class="good">férula</span>' : ''}</span><span class="wb"><i style="width:${(100 - wFrac(w) * 100).toFixed(0)}%"></i></span>${btn.map(([id, n]) => `<button data-treat="${id}|${p}|${i}" ${invCount(id) ? '' : 'disabled'} title="${esc(ITEMS[id].n)}: llevas ${invCount(id)}">${n}</button>`).join('')}</div>`;
  }); }
  if (!wh) wh = `<div class="mut small">${_charPart ? 'Sin heridas aquí' : 'Sin heridas'} ✓</div>`;
  // Habilidades
  let sk = `<div class="clv"><b>Nivel ${charLevel()}</b></div>`;
  for (const k in SKILLS) { const lv = pc.lv[k] || 0, xp = pc.xp[k] || 0, need = xpNeed(lv); sk += `<div class="skl" title="${esc(SKILLS[k][2])}"><span class="si">${SKILLS[k][1]}</span><span class="sn">${SKILLS[k][0]}</span><span class="sp">${Array.from({ length: MAX_LV }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span><span class="sx"><i style="width:${lv >= MAX_LV ? 100 : xp / need * 100}%"></i></span></div>`; }
  const ex = charExtraHTML(), sig = bars + wh + sk + ex;
  if (sig === _charSig) return; _charSig = sig;
  $('chBars').innerHTML = bars; $('chWounds').innerHTML = wh; $('chSkills').innerHTML = sk; $('chExtra').innerHTML = ex;
}
$('mChar').addEventListener('click', e => {
  const p = e.target.closest('[data-part]'); if (p) { _charPart = _charPart === p.dataset.part ? null : p.dataset.part; _charSig = ''; refreshChar(); return; }
  const t = e.target.closest('[data-treat]'); if (t) { const [id, part, i] = t.dataset.treat.split('|'); treatWith(id, part, +i); _charSig = ''; refreshChar(); }
});
$('bRespawn').onclick = respawn;
// ---------- Partículas al romper ----------
const BURSTS = [];
function burst(tx, ty, rgb) { const col = Array.isArray(rgb) ? `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})` : rgb; for (let i = 0; i < 7; i++) BURSTS.push({ x: (tx + 0.5) * T, y: (ty + 0.5) * T, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90 - 20, t: 0.45, c: col }); if (BURSTS.length > 120) BURSTS.splice(0, BURSTS.length - 120); }
function tickBursts(dt) { for (let i = BURSTS.length - 1; i >= 0; i--) { const b = BURSTS[i]; b.t -= dt; if (b.t <= 0) { BURSTS.splice(i, 1); continue; } b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 160 * dt; } }
function drawBursts(ctx) { for (const b of BURSTS) { ctx.globalAlpha = Math.min(1, b.t * 3); ctx.fillStyle = b.c; ctx.fillRect(b.x - 2, b.y - 2, 4, 4); } ctx.globalAlpha = 1; }
