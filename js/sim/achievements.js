'use strict';
// =====================================================================================
//  Logros y títulos.
//  · 63 retos (datos en data/adventure.js). Cada uno da un título que se ve sobre tu nombre en el
//    multijugador; eliges cuál llevar en la ventana de Aventura (tecla Y).
//  · Son del personaje, no del mundo: viajan con él. Pero solo avanzan en mundos SIN trucos
//    (ni en modo creativo): lo que se consigue con comandos no cuenta.
//  · También aquí la ventana de Aventura (Logros · Encargos · Mazmorras), que usan sim/quests.js
//    y sim/dungeons.js para sus pestañas.
// =====================================================================================
const ACHS = { mem: null, combo: [], lastX: null, lastY: null, pollT: 0, saveT: 0 };
const achChar = () => (typeof PF !== 'undefined' && S && PF.list.find(c => c.id === S._cid)) || (typeof activeChar === 'function' && activeChar()) || null;
function achData() {
  const c = achChar();
  if (c) { if (!c.ach) c.ach = { st: {}, got: {}, title: null }; return c.ach; }
  if (!ACHS.mem) { try { ACHS.mem = JSON.parse(localStorage.getItem('tc-ach')) || null; } catch (e) { } ACHS.mem = ACHS.mem || { st: {}, got: {}, title: null }; }
  return ACHS.mem;
}
const achOn = () => !!(S && !S._fake && S.cheats === false && !S.creative);
const achTitle = () => { const d = achData(), a = d.title && ACH[d.title]; return a && d.got[a.id] ? a.t : null; };
function achSave() {
  const c = achChar(); if (c && typeof pfPush === 'function') { clearTimeout(ACHS.saveT); ACHS.saveT = setTimeout(() => pfPush(c), 800); return; }
  try { localStorage.setItem('tc-ach', JSON.stringify(ACHS.mem)); } catch (e) { }
}
// Sumar a una estadística (o subirla a un valor) y comprobar los logros que dependen de ella
function achAdd(k, n = 1) { if (!achOn() || !n) return; const st = achData().st; st[k] = (st[k] || 0) + n; achCheck(k); }
function achMax(k, v) { if (!achOn()) return; const st = achData().st; if (v > (st[k] || 0)) { st[k] = v; achCheck(k); } }
function achSetAdd(k, id) { if (!achOn()) return; const st = achData().st, s = st[k + 'L'] || (st[k + 'L'] = []); if (s.includes(id)) return; s.push(id); st[k] = s.length; achCheck(k); }
function achCheck(k) {
  const d = achData(); let any = false;
  for (const a of ACH_LIST) if (a.st === k && !d.got[a.id] && (d.st[k] || 0) >= a.goal) { d.got[a.id] = Date.now(); any = true; achPop(a); }
  if (any) { d.st.achs = Object.keys(d.got).length; if (k !== 'achs') achCheck('achs'); achSave(); }
}
// ---------- Aviso al conseguir uno ----------
const ACH_Q = [];
function achPop(a) {
  ACH_Q.push(a); if (ACH_Q.length > 1) return; achShowNext();
}
function achShowNext() {
  const a = ACH_Q[0]; if (!a) return;
  let e = $('achPop'); if (!e) { e = document.createElement('div'); e.id = 'achPop'; document.body.appendChild(e); }
  e.innerHTML = `<span class="ai">${a.i}</span><div><small>Logro conseguido · ${ACH_CATS[a.cat][1]}</small><b>${esc(a.n)}</b><em>Título: «${esc(a.t)}»</em></div>`;
  e.classList.remove('on'); void e.offsetWidth; e.classList.add('on');
  tone(660, 0.12, 'triangle', 0.05, 1.3); tone(880, 0.14, 'triangle', 0.05, 1.2, 0.12); tone(1320, 0.3, 'triangle', 0.05, 1, 0.26);
  if (S && S.player) sparkRing(S.player.x, S.player.y - 10, 26, '#ffd34a', 110, { up: 40, life: 0.8 });
  setTimeout(() => { e.classList.remove('on'); setTimeout(() => { ACH_Q.shift(); achShowNext(); }, 450); }, 3600);
}
// ---------- Qué cuenta ----------
// Enemigos: muertos de verdad (no clones, ni invocaciones tuyas)
{ const k0 = killFoe; killFoe = f => {
  const was = FOES.includes(f); k0(f);
  if (!was || FOES.includes(f) || f.clone || f.summoned || f.ally || !achOn()) return;
  achAdd('kills'); if (/slime/i.test(f.k)) achAdd('slimes'); if (f.D && f.D.undead) achAdd('undead');
  if (f.boss) { achAdd('bosses'); achSetAdd('bossKinds', f.k); }
  if (typeof WF !== 'undefined' && WF.on) achAdd('skyKills');
  const now = performance.now(); ACHS.combo.push(now); while (ACHS.combo.length && now - ACHS.combo[0] > 3000) ACHS.combo.shift(); achMax('combo', ACHS.combo.length);
}; }
{ const d0 = die; die = () => { const was = ui.open === 'dead'; d0(); if (!was && ui.open === 'dead') achAdd('deaths'); }; }
// Hechizos: cuenta si de verdad salió (empezó su recarga)
{ const c0 = castSpell; castSpell = slot => {
  const mid = typeof megaHeld === 'function' ? megaHeld() : null, st = spellState(), k = mid ? megaKey(mid) : st.slots[slot], before = k && (P.scd[k] || 0) > 0;
  c0(slot);
  if (!k || before || !(P.scd[k] > 0) || !achOn()) return;
  achAdd('spells');
  if (mid) { achAdd('megas'); return; }
  const s = SPELLS[k]; achSetAdd('spellKinds', k);
  if (s && s.mortal) achAdd('mortals');
  if (typeof CLONE_SPELLS !== 'undefined' && CLONE_SPELLS[k]) achAdd('clones');
  if (typeof SHOCK_SPELLS !== 'undefined' && SHOCK_SPELLS[k]) achAdd('shocks');
}; }
// Oficios: picar, pescar y fabricar ya dan experiencia de su habilidad; se cuenta ahí
{ const g0 = gainXP; gainXP = (k, n) => { if (n && achOn()) { if (k === 'mining') achAdd('mined'); else if (k === 'fish') achAdd('fish'); else if (k === 'craft') achAdd('crafted'); } return g0(k, n); }; }
{ const h0 = harvestCrop; harvestCrop = (b, o) => { const ripe = b && CROP[b.crop] && cropStage(b) >= 3; const r = h0(b, o); if (ripe) achAdd('crops'); return r; }; }
{ const s0 = sleepIn; sleepIn = b => { const r = s0(b); if (ui.open === 'sleep') achAdd('sleeps'); return r; }; }
// Gran Oleada
{ const r0 = wvReward; wvReward = () => { r0(); achAdd('wvWins'); if (!WV.deaths) achAdd('wvFlawless'); achSetAdd('wvArenas', WV.a); }; }
// Lo que se mira cada poco: distancias, días, fábrica, mascotas, aldeanos y monedas
function achTick(dt) {
  if (!S || !S.player) return; const p = S.player;
  if (ACHS.lastX !== null && achOn()) {
    const d = Math.hypot(p.x - ACHS.lastX, p.y - ACHS.lastY) / T;
    if (d > 0 && d < 3) { const fly = typeof WF !== 'undefined' && WF.on; const k = fly ? 'fly' : (typeof mountPet === 'function' && mountPet()) ? null : 'walk';
      if (k) { const st = achData().st; st[k + 'F'] = (st[k + 'F'] || 0) + d; if (st[k + 'F'] >= 1) { const w = Math.floor(st[k + 'F']); st[k + 'F'] -= w; achAdd(k, w); } } }
  }
  ACHS.lastX = p.x; ACHS.lastY = p.y;
  if ((ACHS.pollT -= dt) > 0 || !achOn()) return; ACHS.pollT = 1;
  achMax('days', Math.floor(S.time / (S.gen.dayLen || DAY_LEN)) + 1);
  achMax('tier', S.tier || 0);
  achMax('pets', (S.pets || []).length);
  achMax('npcs', (S.npcs || []).length);
  achMax('coins', invCount('coin'));
  if (typeof repLevel === 'function') achMax('repLv', repLevel());
}
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); if (S) achTick(fdt); }; }
// Al cambiar de mundo, no contar el salto como distancia recorrida
{ const e0 = enterWorld; enterWorld = () => { ACHS.lastX = null; return e0(); }; }

// =====================================================================================
//  Ventana de Aventura (Y): Logros · Encargos · Mazmorras
// =====================================================================================
const ADV = { tab: 'ach', cat: 'all', tabs: {} };
{ const m = document.createElement('div'); m.id = 'mAdv'; m.className = 'modal'; m.hidden = true; m.innerHTML = '<div class="modal-in advm" id="advBody"></div>'; document.body.appendChild(m); MODALS.adv = 'mAdv';
  m.addEventListener('mousedown', e => { if (e.target === m || e.target.closest('[data-close]')) closeModal(); }); }
ADV.tabs.ach = { n: '🏆 Logros', render: achHTML };
function advOpen(tab, at) { if (!S) return; if (tab) ADV.tab = tab; ADV.at = !!at; openModal('adv'); advRender(); } // at: abierta desde el tablón o un aldeano (se puede aceptar y cobrar)
function advRender() {
  if (ui.open !== 'adv') return; const T0 = ADV.tabs[ADV.tab] || ADV.tabs.ach;
  $('advBody').innerHTML = `<header><h2>Aventura</h2><div class="advtabs">${Object.entries(ADV.tabs).map(([k, t]) => `<button class="${k === ADV.tab ? 'on' : ''}" data-advtab="${k}">${t.n}</button>`).join('')}</div><button data-close>Cerrar <kbd>Y</kbd></button></header><div class="advin">${T0.render()}</div>`;
}
function achHTML() {
  const d = achData(), got = Object.keys(d.got).length, cur = achTitle();
  const note = !S || S._fake ? '' : achOn() ? '' : `<p class="advwarn">${S.creative ? 'Estás en modo creativo' : 'Este mundo tiene los trucos activados'}: aquí los logros no avanzan. Juega en un mundo sin trucos para conseguirlos.</p>`;
  const cats = ['all', ...Object.keys(ACH_CATS)], list = ACH_LIST.filter(a => ADV.cat === 'all' || a.cat === ADV.cat);
  const card = a => { const ok = d.got[a.id], v = Math.min(a.goal, Math.floor(d.st[a.st] || 0)), p = v / a.goal;
    return `<div class="achc ${ok ? 'ok' : ''}"><span class="ai">${ok ? a.i : '🔒'}</span><div class="at"><b>${esc(a.n)}</b><small>${esc(a.d)}</small>${ok ? `<em>Título: «${esc(a.t)}»</em>` : `<div class="ab"><i style="transform:scaleX(${p.toFixed(3)})"></i></div><span class="av">${achN(v)} / ${achN(a.goal)}</span>`}</div>${ok ? `<button class="${d.title === a.id ? 'on' : ''}" data-achtitle="${a.id}">${d.title === a.id ? '✓ Llevas este' : 'Usar título'}</button>` : ''}</div>`; };
  return `${note}<div class="achtop"><div><b>${got}</b> / ${ACH_LIST.length} logros</div><div class="achtt">Tu título: ${cur ? `<b>«${esc(cur)}»</b> <button data-achtitle="">Quitar</button>` : '<span class="mut">ninguno (consigue un logro y elígelo)</span>'}</div></div>
    <div class="achcats">${cats.map(c => `<button class="${ADV.cat === c ? 'on' : ''}" data-achcat="${c}">${c === 'all' ? 'Todos' : ACH_CATS[c].join(' ')}</button>`).join('')}</div>
    <div class="achgrid">${list.map(card).join('')}</div>`;
}
const achN = n => n.toLocaleString('es-ES');
document.addEventListener('click', e => {
  const t = e.target.closest('[data-advtab],[data-achcat],[data-achtitle]'); if (!t) return;
  if (t.dataset.advtab) { ADV.tab = t.dataset.advtab; advRender(); }
  else if (t.dataset.achcat) { ADV.cat = t.dataset.achcat; advRender(); }
  else if (t.dataset.achtitle !== undefined) { const d = achData(); d.title = t.dataset.achtitle || null; achSave(); toast(d.title ? `Ahora llevas el título «${ACH[d.title].t}»` : 'Sin título'); advRender(); }
});
// Tecla Y (se puede cambiar en Ajustes › Teclas)
KEY_ACTIONS.find(g => g[0] === 'Ventanas')[1].push(['y', 'Aventura: logros, encargos y mazmorras']); keymapBuild();
addEventListener('keydown', e => {
  if (!S || ui.open === 'title' || e.ctrlKey || e.metaKey || _typing(e) || e.key.toLowerCase() !== 'y') return;
  if (ui.open === 'adv') closeModal(); else if (!ui.open) advOpen();
});
// Comando /logros (no es truco: solo abre la ventana)
cmd('logros', { a: ['logro', 'titulos', 'aventura'], u: '/logros', d: 'Abre la ventana de logros y títulos.', run() { advOpen('ach'); } });
