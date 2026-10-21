'use strict';
// =====================================================================================
//  Ficha del personaje (C), interactiva y en pestañas (sin desplazarse por la ventana):
//  · Retrato vivo: tu personaje con su equipo, se gira arrastrando o con las flechas y
//    puede andar o quedarse quieto. Nombre editable, identidad y nivel.
//  · Estado: barras con explicación y remedio, acciones rápidas (comer, beber, curar) y
//    lo que te está pasando ahora mismo.
//  · Salud: cuerpo por partes (clic para elegir), vida de cada parte y heridas con su cura.
//  · Habilidades: nivel, experiencia exacta, qué da y cómo subirla.
//  · Atributos: todos los modificadores agrupados (frente al 100 % de base) y de dónde salen.
//  · Equipo: lo que llevas puesto con su desgaste. · Magia y mascotas. · Registro.
//  Reutiliza los mismos data-* que ya entienden vitals.js y combat-ui.js (curar, hechizos…).
// =====================================================================================
const CS2 = { tab: 'state', ang: Math.PI / 2, walk: false, t: 0, drag: null, raf: 0, info: null };
const CS_TABS = [['state', 'Estado'], ['health', 'Salud'], ['skills', 'Habilidades'], ['attrs', 'Atributos'], ['gear', 'Equipo'], ['magic', 'Magia y mascotas'], ['log', 'Registro']];
const SKILL_HOW = { mining: 'Pica roca, menas y suelo.', wood: 'Tala árboles.', gather: 'Cosecha plantas y hierbas.', hunt: 'Caza animales.', build: 'Coloca bloques y trabaja.', craft: 'Fabrica en el bolsillo o en el banco.', magic: 'Lanza hechizos y usa armas mágicas.', surv: 'Come, cúrate y sobrevive al clima.', combat: 'Lucha contra enemigos.', fit: 'Corre y nada.', fish: 'Pesca con caña.' };
const VITAL_TIP = {
  hp: ['Vida', 'Se recupera si no tienes hambre, sed, heridas abiertas ni frío.'],
  food: ['Hambre', 'Come algo: lo cocinado alimenta más y no sienta mal.'],
  water: ['Sed', 'Bebe con F junto al agua o usa una botella de agua.'],
  energy: ['Energía', 'Duerme en una cama. Correr y trabajar cansan.'],
  stam: ['Aguante', 'Se gasta al correr, nadar en agua profunda y saltar. Descansa un momento.'],
  mana: ['Maná', 'Se recarga solo con el tiempo. Lo gastan hechizos y báculos.'],
  temp: ['Temperatura', 'Hoguera, abrigo y ropa de abrigo evitan la hipotermia.'],
};
const ATTR_G = [
  ['Combate', [['melee', 'Daño cuerpo a cuerpo', '%'], ['ranged', 'Daño a distancia', '%'], ['def', 'Defensa', '+'], ['block', 'Bloqueo', 'p'], ['reach', 'Alcance', '%'], ['dash', 'Coste del impulso', '%i']]],
  ['Trabajo', [['work', 'Fuerza al trabajar', '%'], ['mine', 'Minería', '%'], ['wood', 'Tala', '%'], ['hunt', 'Caza', '%'], ['tame', 'Domar', '%'], ['xp', 'Experiencia', '%'], ['craftKeep', 'Ahorro al fabricar', 'p']]],
  ['Cuerpo', [['hp', 'Vida máxima', '+'], ['stam', 'Aguante máximo', '+'], ['speed', 'Velocidad', '%'], ['hunger', 'Hambre', '%i'], ['thirst', 'Sed', '%i'], ['energy', 'Cansancio', '%i'], ['heal', 'Curación', '%'], ['wound', 'Daño de heridas', '%i'], ['warm', 'Abrigo', '°']]],
  ['Magia y suerte', [['mana', 'Maná máximo', '+'], ['manaRegen', 'Recarga de maná', '%'], ['luck', 'Suerte', 'p'], ['night', 'Visión nocturna', 'b'], ['detect', 'Te detectan a', '%i'], ['price', 'Precios', '%i']]],
];
// ---------- Abrir ----------
openChar = function () {
  if (!S) return;
  if (!survOn()) { toast('La supervivencia está desactivada en este mundo'); return; }
  openModal('char'); pcInit(); _charSig = ''; CS2.info = null;
  $('charBody').innerHTML = `<div class="cs">
    <aside class="csl"><div class="cspor"><canvas id="csAv" width="220" height="250" title="Arrastra para girar"></canvas>
      <div class="csctl"><button data-cs="rotL" title="Girar">↺</button><button data-cs="walk" id="csWalk" title="Andar / quieto">▶</button><button data-cs="rotR" title="Girar">↻</button></div></div>
      <div id="csId"></div></aside>
    <section class="csr"><nav class="cstabs">${CS_TABS.map(([k, n]) => `<button data-cst="${k}" class="${CS2.tab === k ? 'on' : ''}">${n}</button>`).join('')}</nav><div class="cspane" id="csPane"></div></section></div>`;
  refreshChar(); csAnim();
};
// ---------- Retrato ----------
function csAnim() {
  cancelAnimationFrame(CS2.raf);
  const cv = $('csAv'); if (!cv || ui.open !== 'char') return;
  const c = cv.getContext('2d'), now = performance.now();
  CS2.t += CS2.walk ? 0.12 : 0;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
  // suelo con sombra y halo
  const g = c.createRadialGradient(110, 210, 4, 110, 210, 90); g.addColorStop(0, 'rgba(224,181,76,.16)'); g.addColorStop(1, 'rgba(224,181,76,0)'); c.fillStyle = g; c.fillRect(0, 0, 220, 250);
  c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(110, 232, 40, 10, 0, 0, 7); c.fill();
  const ch = charData(); c.imageSmoothingEnabled = false;
  drawAvatar(c, ch.look, S.equip, 110, 232 - (CS2.walk ? Math.abs(Math.sin(CS2.t * 1.6)) * 2 : Math.sin(now / 700) * 1.2), CS2.ang, CS2.t, CS2.walk, 8.2, !ui.hand ? heldId() : null, 0);
  CS2.raf = requestAnimationFrame(csAnim);
}
const csRot = d => { CS2.ang += d * Math.PI / 4; };
function csIdHTML() {
  const ch = charData(), l = ch.look || {}, pf = PROFS[ch.prof] || PROFS.vagabond, pc = S.pc, lv = charLevel();
  const totXp = Object.keys(SKILLS).reduce((s, k) => s + (pc.xp[k] || 0) / xpNeed(pc.lv[k] || 0), 0), frac = totXp - Math.floor(totXp);
  const idc = [[raceOf(l), 'Raza'], [moodOf(l), 'Personalidad'], [pf, 'Profesión'], [typeof bgOf === 'function' ? bgOf(l) : null, 'Pasado'], [typeof ageOf === 'function' ? ageOf(l) : null, 'Edad']].filter(x => x[0]);
  return `<div class="csname"><input id="csName" maxlength="24" value="${esc(ch.name)}" aria-label="Nombre" title="Clic para cambiar el nombre"><span class="cslv" title="Nivel: suma de tus habilidades">${lv}</span></div>
    <div class="csxp" title="Progreso hacia la próxima subida"><i style="width:${(frac * 100).toFixed(0)}%"></i></div>
    <div class="csidc">${idc.map(([o, k]) => `<span class="csch" title="${esc(k)}: ${esc(o.d || '')}">${o.i || ''} ${esc(o.n)}</span>`).join('')}</div>
    <div class="cstr">${ch.traits.map(t => TRAITS[t] ? `<span class="csch ${TRAITS[t].c > 0 ? 'good' : 'bad'}" title="${esc(TRAITS[t].d)}">${TRAITS[t].i} ${esc(TRAITS[t].n)}</span>` : '').join('') || '<span class="mut small">Sin rasgos</span>'}</div>
    <div class="csbtns"><button data-look="1">Apariencia</button><button data-cs="inv">Inventario</button></div>`;
}
// ---------- Pestañas ----------
const vbar = (k, ic, v, max, col, txt) => { const f = clamp(v / max, 0, 1); return `<button class="csv ${CS2.info === k ? 'on' : ''} ${f < 0.2 ? 'low' : ''}" data-csi="${k}"><span class="ci">${ic}</span><span class="cn">${VITAL_TIP[k][0]}</span><span class="cb"><i style="width:${(f * 100).toFixed(1)}%;background:${col}"></i></span><span class="cv">${txt ?? Math.round(v) + '<small>/' + Math.round(max) + '</small>'}</span></button>`; };
function bestOf(pred, score) { let best = null, bs = -1; for (const s of S.inv) if (s && ITEMS[s.id] && pred(ITEMS[s.id])) { const v = score(ITEMS[s.id]); if (v > bs) { bs = v; best = s; } } return best; }
function csState() {
  const pc = S.pc;
  let h = '<div class="csvit">' + vbar('hp', '❤', pc.hp, maxHp(), '#e05050') + vbar('food', '🍖', pc.food, 100, '#e0a040') + vbar('water', '💧', pc.water, 100, '#4aa8ec') + vbar('energy', '🌙', pc.energy, 100, '#a47ae8')
    + vbar('stam', '💨', pc.stam, maxStam(), '#7fd07a') + vbar('mana', '✦', pc.mana, maxMana(), '#40d0d0') + vbar('temp', '🌡', pc.temp - 30, 7.5, pc.temp < 35.5 ? '#6ab0ff' : '#e0b54c', pc.temp.toFixed(1) + '°') + '</div>';
  if (CS2.info) h += `<div class="csinfo">${esc(VITAL_TIP[CS2.info][1])}</div>`;
  const food = bestOf(it => it.food && (it.food.f || 0) > 0 && !(it.food.raw > 0.5), it => it.food.f - (it.food.raw || 0) * 30), drink = bestOf(it => it.food && (it.food.w || 0) > 0, it => it.food.w), med = bestOf(it => it.med, () => 1);
  h += `<div class="csact"><button data-csq="eat" ${food && pc.food < 97 ? '' : 'disabled'}>🍖 Comer${food ? ` <small>${esc(ITEMS[food.id].n)}</small>` : ''}</button><button data-csq="drink" ${drink && pc.water < 97 ? '' : 'disabled'}>💧 Beber${drink ? ` <small>${esc(ITEMS[drink.id].n)}</small>` : ''}</button><button data-csq="heal" ${woundsN() ? '' : 'disabled'}>🩹 Curar heridas (${woundsN()})</button></div>`;
  const m = moodles();
  h += `<div class="cssub">Ahora mismo</div><div class="csmoo">${m.length ? m.map(x => `<span class="csch ${x.good ? 'good' : x.lv >= 3 ? 'bad' : x.lv === 2 ? 'warn' : ''}">${x.i} ${esc(x.n)}</span>`).join('') : '<span class="mut small">Todo en orden ✓</span>'}</div>`;
  const cm = CM();
  h += `<div class="cssub">Resumen</div><div class="csgrid4">${[['🏃', 'Velocidad', Math.round(speedMul() * cm.speed * 100) + ' %'], ['✋', 'Fuerza', Math.round(workMul() * 100) + ' %'], ['🤕', 'Dolor', Math.round(painOf())], ['☁', 'Ambiente', Math.round(ambient()) + '°'], ['🛡', 'Defensa', cm.def], ['⚔', 'Daño', Math.round(cm.melee * 100) + ' %'], ['🧥', 'Abrigo', (cm.warm >= 0 ? '+' : '') + cm.warm + '°'], ['✝', 'Muertes', pc.deaths]].map(([i, n, v]) => `<div class="csst"><span>${i}</span><small>${n}</small><b>${v}</b></div>`).join('')}</div>`;
  return h;
}
const woundsN = () => PARTS.reduce((s, p) => s + S.pc.parts[p].length, 0);
function csHealth() {
  const pc = S.pc;
  let parts = PARTS.map(p => { const hp = partHp(p), n = pc.parts[p].length; return `<button class="csp ${_charPart === p ? 'on' : ''}" data-part="${p}"><span>${PART_N[p]}</span><span class="cb"><i style="width:${hp.toFixed(0)}%;background:${partColor(hp)}"></i></span><b>${Math.round(hp)}%</b>${n ? `<em>${n}</em>` : ''}</button>`; }).join('');
  // Heridas: sus pasos de cura (hechos ✓ y el siguiente) y lo que puedes hacer con las manos
  let wh = '';
  for (const p of PARTS) { if (_charPart && p !== _charPart) continue; pc.parts[p].forEach((w, i) => {
    const t = WT[w.t], st = wSteps(w), d = w.done || {}, nx = nextStep(w), obj = w.obj ?? t.obj;
    const tags = [w.inf && '<span class="bad">infectada</span>', w.ven && '<span class="bad">veneno</span>', obj && '<span class="warn">algo clavado</span>', w.dirt && !w.clean && '<span class="mut">sucia</span>', t.bleed && !(w.b || w.st || w.tq || w.pr > 0) && wFrac(w) > 0.75 && '<span class="bad">sangra</span>'].filter(Boolean).join(' ');
    const steps = st.map((opts, k) => `<span class="wstep ${d[k] ? 'ok' : k === nx ? 'now' : ''}">${d[k] ? '✓' : k + 1} ${esc(PROCS[opts[0]] ? PROCS[opts[0]].n : opts[0])}${opts.length > 1 ? ' <small>o ' + (opts.length - 1) + ' más</small>' : ''}</span>`).join('<span class="warr">›</span>');
    const acts = procsFor(w, p).sort((a, b) => b.next - a.next).slice(0, 5).map(x => { const pr = PROCS[x.id], nd = procNeeds(x.id), it = nd.miss[0], can = it && chainPossible(it, 1);
      return nd.ok ? `<button class="wact ${x.next ? 'pri' : ''}" data-med="${x.id}|${p}|${i}" title="${esc(pr.how)}">${pr.i} ${esc(pr.n)}${nd.use ? ` <small>${esc(ITEMS[nd.use].n)}</small>` : ''}</button>`
        : `<button class="wact need" ${can ? `data-mkmed="${it}"` : `data-mgo="${it}"`} title="${esc(pr.how)}">${pr.i} ${esc(pr.n)} <small>falta ${esc(ITEMS[it].n)}${can ? ' · 🔨 fabricar' : ''}</small></button>`; }).join('');
    wh += `<div class="wnd2"><div class="wh"><span class="wi">${t.i}</span><b>${t.n}</b><span class="mut"> · ${PART_N[p]}</span> ${tags}<span class="wb"><i style="width:${(100 - wFrac(w) * 100).toFixed(0)}%"></i></span></div><div class="wsteps">${steps || '<span class="mut small">Se cura sola</span>'}</div><div class="wacts">${acts}</div></div>`;
  }); }
  if (!wh) wh = `<div class="mut small">${_charPart ? 'Sin heridas aquí' : 'Sin heridas'} ✓</div>`;
  const bf = S.buffs || {}, pv = ['sunscreen', 'repellent'].map(id => { const pr = PROCS[id], nd = procNeeds(id), k = id === 'sunscreen' ? 'sunproof' : 'bugproof', left = bf[k] > 0 ? Math.ceil(bf[k] / 60) + ' min' : '';
    return `<button class="wact ${left ? 'on' : ''}" ${nd.ok ? `data-med="${id}|${_charPart || 'armL'}|-1"` : chainPossible(nd.miss[0], 1) ? `data-mkmed="${nd.miss[0]}"` : `data-mgo="${nd.miss[0]}"`}>${pr.i} ${esc(pr.n)}${left ? ` <small>activo ${left}</small>` : nd.ok ? '' : ` <small>falta ${esc(ITEMS[nd.miss[0]].n)}</small>`}</button>`; }).join('');
  wh = `<div class="wprev"><span class="cssub">Prevención</span>${pv}</div>` + wh;
  return `<div class="cshl"><div class="csbody">${bodySVG('bbig', 1)}</div><div class="cshr"><div class="csparts">${parts}</div><div class="cssub">${_charPart ? 'Heridas · ' + PART_N[_charPart] + ' <button class="lnk" data-part="' + _charPart + '">ver todas</button>' : 'Heridas'}</div><div class="cswnd">${wh}</div></div></div>`;
}
function csSkills() {
  const pc = S.pc;
  return `<div class="csskl">${Object.keys(SKILLS).map(k => { const lv = pc.lv[k] || 0, xp = Math.floor(pc.xp[k] || 0), need = xpNeed(lv), max = lv >= MAX_LV;
    return `<div class="cssk ${CS2.info === 'sk:' + k ? 'on' : ''}" data-csi="sk:${k}"><div class="row"><span class="l"><span class="si">${SKILLS[k][1]}</span><b>${SKILLS[k][0]}</b></span><span class="lvn">${lv}<small>/${MAX_LV}</small></span></div>
      <div class="sp">${Array.from({ length: MAX_LV }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div>
      <div class="sx"><i style="width:${max ? 100 : xp / need * 100}%"></i></div><div class="sxt">${max ? 'Nivel máximo' : `${xp} / ${need} xp`}</div></div>`; }).join('')}</div>
    ${(() => { const k = (CS2.info || '').startsWith('sk:') ? CS2.info.slice(3) : null; return k && SKILLS[k] ? `<div class="csskd"><b>${SKILLS[k][1]} ${esc(SKILLS[k][0])}</b> · ${esc(SKILLS[k][2])}<br><span class="mut">Cómo subir: ${esc(SKILL_HOW[k] || '')}</span></div>` : '<div class="mut small">Toca una habilidad para ver qué da y cómo subirla.</div>'; })()}`;
}
function csAttrs() {
  const cm = CM(), ch = charData();
  const fmtA = (k, t) => { const v = cm[k] ?? (t.startsWith('%') ? 1 : 0); let txt, good;
    if (t === '%' || t === '%i') { const d = Math.round((v - 1) * 100); txt = (d > 0 ? '+' : '') + d + ' %'; good = t === '%' ? d > 0 : d < 0; if (!d) good = null; }
    else if (t === 'p') { txt = Math.round(v * 100) + ' %'; good = v > 0 ? true : null; }
    else if (t === 'b') { txt = v ? 'Sí' : 'No'; good = v ? true : null; }
    else { txt = (v > 0 ? '+' : '') + v + (t === '°' ? '°' : ''); good = v > 0 ? true : v < 0 ? false : null; }
    return `<span class="${good === true ? 'good' : good === false ? 'bad' : 'mut'}">${txt}</span>`; };
  let h = `<div class="csatt">${ATTR_G.map(([g, list]) => `<div class="csag"><div class="cssub">${g}</div>${list.map(([k, n, t]) => `<div class="csa"><span>${n}</span>${fmtA(k, t)}</div>`).join('')}</div>`).join('')}</div>`;
  const src = lookMods(ch.look).filter(Boolean), pf = PROFS[ch.prof];
  h += `<div class="cssub">De dónde sale</div><div class="csmoo">${src.map(o => `<span class="csch" title="${esc(o.d || '')}">${o.i || '•'} ${esc(o.n)}</span>`).join('')}${pf ? `<span class="csch" title="${esc(pf.d || '')}">${pf.i} ${esc(pf.n)}</span>` : ''}${ch.traits.map(t => TRAITS[t] ? `<span class="csch ${TRAITS[t].c > 0 ? 'good' : 'bad'}" title="${esc(TRAITS[t].d)}">${TRAITS[t].i} ${esc(TRAITS[t].n)}</span>` : '').join('')}</div><div class="mut small">Pasa el ratón por encima para ver qué da cada cosa. El equipo también suma.</div>`;
  return h;
}
function csGear() {
  const E = S.equip; let n = 0;
  const cells = EQ_SLOTS.map(sl => { const id = E[sl]; if (id) n++; const mx = id ? maxDur(id) : 0, f = mx ? durLeft(id) / mx : 1;
    return `<div class="csg ${id ? '' : 'empty'}" ${id ? `data-id="${id}"` : ''} title="${esc(EQ_N[slotType(sl)] || sl)}${id ? ': ' + esc(ITEMS[id].n) : ' (vacío)'}">${id ? itemImg(id, 26) : `<span class="mut">${esc((EQ_N[slotType(sl)] || sl).slice(0, 3))}</span>`}${id && mx ? `<span class="dur"><i style="width:${(f * 100).toFixed(0)}%;background:${f > 0.5 ? '#7fd07a' : f > 0.2 ? '#e0b54c' : '#ff6b5b'}"></i></span>` : ''}</div>`; }).join('');
  const cm = CM();
  return `<div class="csgg">${cells}</div><div class="csgrid4">${[['🛡', 'Defensa', cm.def], ['🧱', 'Bloqueo', Math.round((cm.block || 0) * 100) + ' %'], ['🧥', 'Abrigo', (cm.warm >= 0 ? '+' : '') + cm.warm + '°'], ['⚖', 'Piezas pesadas', cm.heavy || 0]].map(([i, nn, v]) => `<div class="csst"><span>${i}</span><small>${nn}</small><b>${v}</b></div>`).join('')}</div>
    <div class="row"><span class="mut small">${n} piezas puestas · pasa el ratón para ver su ficha</span><button data-cs="inv">Cambiar equipo (E)</button></div>`;
}
function csMagic() {
  const st = spellState();
  let h = '<div class="cssub">Hechizos · elige su tecla</div>';
  if (!st.known.length) h += '<div class="mut small">Lee pergaminos de hechizo (F) para aprenderlos.</div>';
  h += st.known.map(k => { const s = SPELLS[k]; return `<div class="spr"><span style="color:${s.c}">${s.i}</span><span>${esc(s.n)} <span class="mut">· ${s.m} ✦ · ${s.cd}s</span></span><span>${SPELL_KEYS.map((key, i) => `<button class="${st.slots[i] === k ? 'on' : ''}" data-slot="${k}|${i}">${key.toUpperCase()}</button>`).join('')}</span></div>`; }).join('');
  h += '<div class="cssub">Mascotas</div>';
  if (!(S.pets || []).length) h += '<div class="mut small">Pulsa F sobre un animal con su comida favorita en la mano.</div>';
  h += (S.pets || []).map((pt, i) => { const tm = TAME[pt.sp], d = Math.round(Math.hypot(pt.x - S.player.x, pt.y - S.player.y) / T);
    return `<div class="spr"><span>${tm.role === 'mount' ? '🐎' : tm.role === 'farm' ? '🌾' : '⚔'}</span><span>${esc(SPECIES[pt.sp].n)} <span class="mut">· ${Math.round(pt.hp)}/${pt.mhp} · a ${d} casillas · ${pt.ride ? 'montado' : pt.mode === 'stay' ? 'quieto' : 'te sigue'}</span><span class="cb sm"><i style="width:${(pt.hp / pt.mhp * 100).toFixed(0)}%;background:#7fd07a"></i></span></span><span><button data-pet="${i}">${pt.ride ? 'Bajar' : pt.mode === 'stay' ? 'Seguir' : 'Quieto'}</button><button data-free="${i}" title="Liberar">✕</button></span></div>`; }).join('');
  return h;
}
function csLog() {
  const pc = S.pc, dl = S.gen.dayLen || DAY_LEN, bd = S.bossesDown || {}, del = Object.values(S.del || {}).reduce((s, v) => s + v, 0);
  const rows = [['⏱', 'Tiempo vivo', `${Math.floor(pc.alive / 3600)} h ${Math.floor(pc.alive / 60) % 60} min`], ['☀', 'Días en el mundo', Math.floor((S.time || 0) / dl) + 1], ['✝', 'Muertes', pc.deaths], ['🏭', 'Nivel del Núcleo', `${S.tier + 1} / 8`],
    ['📦', 'Entregado al Núcleo', del], ['☠', 'Jefes derrotados', Object.values(bd).reduce((s, v) => s + v, 0)], ['🐾', 'Mascotas', (S.pets || []).length], ['✦', 'Hechizos', spellState().known.length],
    ['📜', 'Crónicas', S.lore ? (S.lore.length ?? Object.keys(S.lore).length) : 0], ['🌱', 'Semilla', S.gen.seed], ['⚔', 'Dificultad', ['', 'Normal', 'Difícil', 'Extremo'][Math.round((S.gen.diff || 1) * 2) - 1] || 'Normal'], ['🧭', 'Posición', `X ${Math.floor(S.player.x / T)} · Y ${(typeof surfY === 'function' ? surfY(Math.floor(S.player.y / T)) : Math.floor(S.player.y / T))}${typeof layerHere === 'function' && layerHere() ? ' · capa ' + layerHere() : ''}`]];
  let h = `<div class="csgrid4 log">${rows.map(([i, n, v]) => `<div class="csst"><span>${i}</span><small>${n}</small><b>${esc(String(v))}</b></div>`).join('')}</div>`;
  const bl = Object.keys(bd).filter(k => BOSSES[k]); if (bl.length) h += `<div class="cssub">Jefes vencidos</div><div class="csmoo">${bl.map(k => `<span class="csch good">☠ ${esc(BOSSES[k].n)}${bd[k] > 1 ? ' ×' + bd[k] : ''}</span>`).join('')}</div>`;
  return h;
}
const CS_PANE = { state: csState, health: csHealth, skills: csSkills, attrs: csAttrs, gear: csGear, magic: csMagic, log: csLog };
// ---------- Refresco (lo llama refreshVitals cada 0,15 s) ----------
refreshChar = function () {
  const pane = $('csPane'); if (!pane) return;
  const id = csIdHTML(), body = CS_PANE[CS2.tab](), sig = CS2.tab + id + body;
  if (sig === _charSig) return; _charSig = sig;
  const idEl = $('csId'), focus = document.activeElement && document.activeElement.id === 'csName';
  if (!focus) idEl.innerHTML = id;
  pane.innerHTML = body;
  const big = pane.querySelector('.bbig'); if (big) { paintBody(big); big.querySelectorAll('[data-part]').forEach(g => g.classList.toggle('sel', g.dataset.part === _charPart)); }
};
// ---------- Interacción ----------
$('mChar').addEventListener('click', e => {
  const t = e.target.closest('[data-cst]'); if (t) { CS2.tab = t.dataset.cst; CS2.info = null; document.querySelectorAll('[data-cst]').forEach(b => b.classList.toggle('on', b === t)); _charSig = ''; refreshChar(); return; }
  const i = e.target.closest('[data-csi]'); if (i) { CS2.info = CS2.info === i.dataset.csi ? null : i.dataset.csi; _charSig = ''; refreshChar(); return; }
  const q = e.target.closest('[data-csq]');
  if (q && !q.disabled) {
    const k = q.dataset.csq;
    if (k === 'eat' || k === 'drink') { const s = k === 'eat' ? bestOf(it => it.food && (it.food.f || 0) > 0 && !(it.food.raw > 0.5), it => it.food.f - (it.food.raw || 0) * 30) : bestOf(it => it.food && (it.food.w || 0) > 0, it => it.food.w); if (s) survUse(s); }
    else if (k === 'heal') { CS2.tab = 'health'; document.querySelectorAll('[data-cst]').forEach(b => b.classList.toggle('on', b.dataset.cst === 'health')); }
    vitalsDirty = true; _charSig = ''; refreshChar(); return;
  }
  const md = e.target.closest('[data-med]'); if (md) { const [id, p, i] = md.dataset.med.split('|'); openMedGame(id, p, +i); return; }
  const mk = e.target.closest('[data-mkmed]'); if (mk) { const id = mk.dataset.mkmed; if (ensureItem(id, 1)) toast('🔨 Fabricado: ' + ITEMS[id].n); else toastErr('No tienes los materiales'); _charSig = ''; refreshChar(); return; }
  const mg = e.target.closest('[data-mgo]'); if (mg) { closeModal(); openBook(); goBook('i:' + mg.dataset.mgo); return; }
  const c = e.target.closest('[data-cs]'); if (!c) return;
  if (c.dataset.cs === 'rotL') csRot(-1); else if (c.dataset.cs === 'rotR') csRot(1);
  else if (c.dataset.cs === 'walk') { CS2.walk = !CS2.walk; c.textContent = CS2.walk ? '❚❚' : '▶'; }
  else if (c.dataset.cs === 'inv') { closeModal(); openInventory(null); }
});
// Girar arrastrando el retrato
$('mChar').addEventListener('mousedown', e => { if (e.target.id === 'csAv') CS2.drag = { x: e.clientX, a: CS2.ang }; });
addEventListener('mousemove', e => { if (CS2.drag) CS2.ang = CS2.drag.a + (e.clientX - CS2.drag.x) / 40; });
addEventListener('mouseup', () => { CS2.drag = null; });
// Nombre editable
$('mChar').addEventListener('change', e => { if (e.target.id === 'csName') { const v = e.target.value.trim(); if (v) { charData().name = v.slice(0, 24); toast('Nombre cambiado: ' + v); } _charSig = ''; refreshChar(); } });
$('mChar').addEventListener('keydown', e => { if (e.target.id === 'csName') { e.stopPropagation(); if (e.key === 'Enter') e.target.blur(); } });
