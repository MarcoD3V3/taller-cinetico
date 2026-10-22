'use strict';
// =====================================================================================
//  Kit del personaje: ranuras nuevas en la zona de equipo, con el mismo estilo y que hacen
//  algo de verdad (todo se guarda con el personaje y viaja con él entre mundos).
//   · 🧪 Ampollas (4): pociones y bebidas a mano. Alt+1…4 o clic en la barrita junto a la
//     barra rápida para tomarlas sin sacarlas al inventario.
//   · 💊 Suplementos (2): comida o medicina que se toma sola, una dosis cada 4 minutos.
//   · ✦ Foco mágico (1): un bastón, una varita, una gema o un cristal: más maná y se
//     recupera antes (cuanto mejor el foco, más).
//   · 🔦 Luz de mano (1): antorcha, farol, liquen… alumbra a tu alrededor sin tenerla en la
//     mano. Las antorchas y las velas se gastan poco a poco.
//   · 🗑 Papelera (1): lo que sueltes aquí se destruye cuando sueltes otra cosa encima;
//     mientras tanto puedes recuperarlo.
// =====================================================================================
const KIT = {
  amp: { n: 'Ampolla', i: '🧪', d: 'Pociones y bebidas. Tómala con Alt+número o haciendo clic en la barrita de ampollas junto a la barra rápida.' },
  supp: { n: 'Suplemento', i: '💊', d: 'Comida o medicina que se toma sola: una dosis cada 4 min mientras quede.' },
  focus: { n: 'Foco mágico', i: '✦', d: 'Bastón, varita, gema o cristal: más maná máximo y se recupera antes.' },
  light: { n: 'Luz de mano', i: '🔦', d: 'Antorcha, farol o liquen: alumbra a tu alrededor sin tenerla en la mano.' },
  trash: { n: 'Papelera', i: '🗑', d: 'Lo que sueltes aquí se destruye al soltar otra cosa encima. Hasta entonces, puedes recuperarlo.' },
};
const KIT_SLOTS = ['amp1', 'amp2', 'amp3', 'amp4', 'supp1', 'supp2', 'focus', 'light', 'trash'];
const kitType = k => k.replace(/\d$/, '');
const kitBelt = () => (S.belt || (S.belt = {}));
// Qué acepta cada ranura
const LIGHT_R = { torch: 5, candle: 4, glowcap: 3, glowLichen: 4, lichenLamp: 6, paperLantern: 5, lantern: 8, solarLamp: 7, lightWand: 12 };
const BURNS = { torch: 300, candle: 420 }; // segundos por unidad
function focusBonus(id) {
  const it = ITEMS[id]; if (!it) return null;
  if (it.weapon && /staff|wand/.test(it.s || '')) return { mana: 25, manaRegen: 1.25, n: 'bastón o varita' };
  if (it.learn) return { mana: 15, manaRegen: 1.12, n: 'libro de hechizo' };
  if (/void|star|arcan|ether|abyss/i.test(id)) return { mana: 30, manaRegen: 1.2, n: 'esencia rara' };
  if (((it.s === 'gem' || it.s === 'orb') && ['Fantasía', 'Exótico', 'Minerales', 'Reliquias', 'Rarezas'].includes(ICATS[it.cat])) || /crystal|mana|essence/i.test(id)) return { mana: 12, manaRegen: 1.1, n: 'gema o cristal' };
  return null;
}
const isDrink = it => !!it && (it.s === 'potion' || (it.use && it.use.buff) || it.med || (it.food && it.food.w > 0 && !it.food.f));
function kitAccepts(k, id) {
  const it = ITEMS[id], t = kitType(k); if (!it) return false;
  if (t === 'trash') return true;
  if (t === 'amp') return isDrink(it);
  if (t === 'supp') return !!((it.food && (it.food.buff || it.food.hp)) || it.med);
  if (t === 'focus') return !!focusBonus(id);
  if (t === 'light') return LIGHT_R[id] !== undefined;
  return false;
}
// Las ranuras del kit son una ranura más del inventario (clic, arrastre, Shift+clic)
{ const r0 = slotRef; slotRef = key => {
  if (!key.startsWith('bt:')) return r0(key);
  const k = key.slice(3), B = kitBelt(), single = k === 'focus';
  return { kit: k, get: () => B[k] || null, set: v => { B[k] = v && v.n > 0 ? (single ? { id: v.id, n: 1 } : v) : null; }, canPut: id => kitAccepts(k, id) };
}; }
{ const c0 = slotClick; slotClick = (key, btn) => {
  if (!key.startsWith('bt:')) return c0(key, btn);
  const k = key.slice(3), B = kitBelt(), h = ui.held;
  if (h && !kitAccepts(k, h.id)) { toastErr(`${KIT[kitType(k)].n}: ${KIT[kitType(k)].d}`); return; }
  if (k === 'trash') { // soltar destruye lo anterior; con la mano vacía, se recupera
    if (h) { if (B.trash && B.trash.id !== h.id) toast(`🗑 Destruido: ${B.trash.n} × ${ITEMS[B.trash.id].n}`); B.trash = B.trash && B.trash.id === h.id ? { id: h.id, n: B.trash.n + h.n } : { id: h.id, n: h.n }; ui.held = null; }
    else if (B.trash) { ui.held = B.trash; B.trash = null; }
    return done();
  }
  if (k === 'focus') { // una pieza
    const old = B.focus; if (h) { B.focus = { id: h.id, n: 1 }; if (--h.n <= 0) ui.held = old ? { ...old } : null; else if (old) invAdd(old.id, 1); toast(`✦ Foco: ${ITEMS[h.id].n} (${focusBonus(h.id).n})`); }
    else if (old) { ui.held = { ...old }; B.focus = null; }
    return done();
  }
  return c0(key, btn);
}; }
// Shift+clic desde la mochila: a la ranura del kit que le toque (si no es equipo)
{ const q0 = quickMove; quickMove = key => {
  if (key.startsWith('inv:') && !ui.panel) { const i = +key.slice(4), s = S.inv[i];
    if (s && !ITEMS[s.id].armor && !ITEMS[s.id].gear) { const B = kitBelt();
      const k = KIT_SLOTS.filter(x => x !== 'trash').find(x => kitAccepts(x, s.id) && (!B[x] || (B[x].id === s.id && x !== 'focus')));
      if (k) { if (k === 'focus') { if (B.focus) invAdd(B.focus.id, 1); B.focus = { id: s.id, n: 1 }; if (--s.n <= 0) S.inv[i] = null; }
        else { const cur = B[k], room = STACK - (cur ? cur.n : 0), m = Math.min(room, s.n); B[k] = { id: s.id, n: (cur ? cur.n : 0) + m }; s.n -= m; if (s.n <= 0) S.inv[i] = null; }
        toast(`${KIT[kitType(k)].i} ${ITEMS[B[k].id].n} → ${KIT[kitType(k)].n}`); return done(); } } }
  return q0(key);
}; }
// ---------- La zona del kit en el panel de equipo ----------
function kitSlot(k, cls = '') { const T2 = KIT[kitType(k)]; return `<div class="s eq bt ${cls}" data-k="bt:${k}" data-ph="${T2.i}" title="${esc(T2.n + ': ' + T2.d)}"><i class="ic"></i><span class="n"></span></div>`; }
function kitHTML() {
  return `<div class="kit">
    <div class="kitg"><small title="${esc(KIT.amp.d)}">🧪 Ampollas <kbd>Alt+1…4</kbd></small><div class="kitrow">${[1, 2, 3, 4].map(i => kitSlot('amp' + i, 'amp')).join('')}</div></div>
    <div class="kitg"><small title="${esc(KIT.supp.d)}">💊 Suplementos</small><div class="kitrow">${[1, 2].map(i => kitSlot('supp' + i, 'supp')).join('')}</div></div>
    <div class="kitg"><small title="${esc(KIT.focus.d)}">✦ Foco</small><div class="kitrow">${kitSlot('focus', 'focus')}</div></div>
    <div class="kitg"><small title="${esc(KIT.light.d)}">🔦 Luz</small><div class="kitrow">${kitSlot('light', 'light')}</div></div>
    <div class="kitg"><small title="${esc(KIT.trash.d)}">🗑 Papelera</small><div class="kitrow">${kitSlot('trash', 'trash')}</div></div>
    <div class="kitinfo" id="kitInfo"></div></div>`;
}
{ const e0 = equipPanelHTML; equipPanelHTML = () => e0().replace('<div class="eqstats" id="eqStats"></div>', '<div class="eqstats" id="eqStats"></div>' + kitHTML()); }
// Explicación viva: qué hace ahora mismo cada ranura llena
function kitInfoHTML() {
  const B = kitBelt(), out = [];
  const f = B.focus && focusBonus(B.focus.id); if (f) out.push(`✦ <b>+${f.mana}</b> maná · regeneración <b>×${f.manaRegen}</b>`);
  if (B.light) out.push(`🔦 Alumbra <b>${LIGHT_R[B.light.id]}</b> casillas${BURNS[B.light.id] ? ` · se gasta (${Math.ceil(((B.lightT ?? BURNS[B.light.id])) / 60)} min la actual)` : ''}`);
  for (const k of ['supp1', 'supp2']) if (B[k]) { const t = (B.suppT || {})[k] ?? 240; out.push(`💊 ${esc(ITEMS[B[k].id].n)}: próxima dosis en <b>${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}</b>`); }
  if (B.trash) out.push(`🗑 ${B.trash.n} × ${esc(ITEMS[B.trash.id].n)} <span class="mut">(se destruye al tirar otra cosa)</span>`);
  return out.length ? out.join('<br>') : '<span class="mut">Arrastra pociones, comida, una gema o una antorcha a estas ranuras (o Shift+clic en la mochila).</span>';
}
{ const r0 = refreshInvUI; refreshInvUI = force => { r0(force); if (ui.open !== 'inv') return;
  document.querySelectorAll('#mInv .s.bt').forEach(el => { const k = el.dataset.k.slice(3), s = kitBelt()[k]; el.classList.toggle('has', !!s); el.classList.toggle('pulse', !!ui.held && kitAccepts(k, ui.held.id)); });
  const ki = $('kitInfo'); if (ki) { const h = kitInfoHTML(); if (ki._h !== h) { ki._h = h; ki.innerHTML = h; } } }; }
// ---------- Efectos ----------
// Foco: más maná (sin romper la caché de las estadísticas)
{ const c0 = charMods; let _base = null, _k = null, _out = null; charMods = eq => {
  const m = c0(eq), f = S && S.belt && S.belt.focus && S.belt.focus.id; if (!f) return m;
  if (!eq && m === _base && f === _k) return _out;
  const b = focusBonus(f), o = b ? { ...m, mana: (m.mana || 0) + b.mana, manaRegen: (m.manaRegen || 1) * b.manaRegen } : m;
  if (!eq) { _base = m; _k = f; _out = o; } return o;
}; }
// Luz: alumbra a tu alrededor
const kitLight = () => { const B = S && S.belt; return B && B.light ? LIGHT_R[B.light.id] || 0 : 0; };
// Tomar una ampolla o un suplemento: se usa como si lo llevaras en la mano
function kitUse(k, quiet) {
  const B = kitBelt(), s = B[k]; if (!s || !S) return false;
  const sel = S.sel, old = S.inv[sel]; S.inv[sel] = { id: s.id, n: s.n }; let ok = false;
  try { ok = useItem(); } finally { const left = S.inv[sel]; B[k] = left && left.id === s.id && left.n > 0 ? left : null; S.inv[sel] = old; invVersion++; }
  if (ok && !quiet) { toast(`${KIT[kitType(k)].i} ${ITEMS[s.id].n}`); if (typeof fxBurst === 'function') fxBurst(S.player.x, S.player.y - 12, 8, { col: ITEMS[s.id].c || '#8ad8ff', sp: 40, life: 0.6, glow: 1, up: 20 }); }
  else if (!ok && !quiet) toastErr('Ahora no se puede tomar');
  return ok;
}
let _kitT = 0;
function kitTick(dt) {
  if (!S || !S.belt) return; _kitT += dt; if (_kitT < 1) return; const st = _kitT; _kitT = 0; const B = S.belt;
  // Suplementos: una dosis cada 4 min
  B.suppT = B.suppT || {};
  for (const k of ['supp1', 'supp2']) { if (!B[k]) { delete B.suppT[k]; continue; } B.suppT[k] = (B.suppT[k] ?? 240) - st; if (B.suppT[k] <= 0) { B.suppT[k] = 240; kitUse(k, true); toast(`💊 Dosis de ${ITEMS[(B[k] || { id: 'herbs' }).id] ? ITEMS[(B[k] || { id: 'herbs' }).id].n : 'suplemento'} tomada`); } }
  // Antorchas y velas se consumen
  if (B.light && BURNS[B.light.id]) { B.lightT = (B.lightT ?? BURNS[B.light.id]) - st; if (B.lightT <= 0) { B.lightT = BURNS[B.light.id]; if (--B.light.n <= 0) { toast(`🔦 Se ha consumido la última ${ITEMS[B.light.id].n.toLowerCase()}`); B.light = null; } invVersion++; } }
}
{ const s0 = survTick; survTick = (dt, mv, sp) => { s0(dt, mv, sp); kitTick(dt); }; }
// Alt+1…4: tomar ampolla
addEventListener('keydown', e => { if (!S || !e.altKey || ui.open === 'title') return; const n = +e.key; if (n >= 1 && n <= 4) { e.preventDefault(); e.stopImmediatePropagation(); kitUse('amp' + n); } }, true);
// Barrita de ampollas junto a la barra rápida (clic para tomar)
const _ab = document.createElement('div'); _ab.id = 'ampBar'; _ab.hidden = true; document.body.appendChild(_ab);
_ab.addEventListener('mousedown', e => { const s = e.target.closest('[data-amp]'); if (s) { e.preventDefault(); e.stopPropagation(); kitUse(s.dataset.amp); } });
let _abS = '';
setInterval(() => {
  if (!S || ui.open === 'title') { _ab.hidden = true; return; } const B = S.belt || {};
  const ks = ['amp1', 'amp2', 'amp3', 'amp4'].filter(k => B[k]), sig = ks.map(k => k + B[k].id + B[k].n).join();
  if (sig === _abS) return; _abS = sig; _ab.hidden = !ks.length;
  _ab.innerHTML = ks.map(k => `<div class="abs" data-amp="${k}" title="${esc(ITEMS[B[k].id].n)} · Alt+${k.slice(3)}">${itemImg(B[k].id, 22)}<span class="n">${B[k].n > 1 ? B[k].n : ''}</span><kbd>${k.slice(3)}</kbd></div>`).join('');
}, 250);
// El kit es del personaje: viaja con él, en línea y entre mundos
if (typeof CH_KEYS !== 'undefined' && !CH_KEYS.includes('belt')) CH_KEYS.push('belt');
if (typeof PERSONAL !== 'undefined') PERSONAL.add('belt');
if (typeof PDAT_KEYS !== 'undefined' && !PDAT_KEYS.includes('belt')) PDAT_KEYS.push('belt');
