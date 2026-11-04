'use strict';
// =====================================================================================
//  Pesca profunda (amplía sim/fishing.js):
//   · Cebos por especie (lombrices, gamba, luminoso): las especies de esas aguas pican mucho más.
//   · 5 peces legendarios que solo salen en su momento (luna llena, tormenta, nevada, mediodía,
//     abismo de noche con cebo luminoso).
//   · Cada pez pesa algo distinto: récord por especie en el Diario de pesca.
//   · Acuario: echa un pez de cada especie para completar la colección (con premios); se ven
//     nadando dentro.
//   · Torneo de pesca cada 6 días (de 7 a 18 h): gana el pez más pesado. Rivales de los pueblos.
// =====================================================================================
const fHour = () => typeof folkHour === 'function' ? folkHour() : 12;
const fDay = () => Math.floor(S.time / (S.gen.dayLen || DAY_LEN));
const moonPhase = () => ((fDay() % 8) + 8) % 8; // 0 nueva … 4 llena
const isFullMoon = () => moonPhase() === 4;
const MOON_N = ['luna nueva', 'creciente', 'cuarto creciente', 'gibosa creciente', 'luna llena', 'gibosa menguante', 'cuarto menguante', 'menguante'];
const fNight = () => { const h = fHour(); return h < 6 || h >= 20.5; };
const wxIs = (...k) => typeof WX !== 'undefined' && k.includes(WX.type) && !(WX.cave > 0.5);
const FLEG_OK = {
  moonKoi: () => fNight() && isFullMoon(),
  stormMarlin: () => wxIs('rain', 'storm'),
  frostPike: () => wxIs('snow', 'blizzard'),
  sunscaleCarp: () => { const h = fHour(); return h >= 11 && h < 14 && wxIs('clear', 'heat'); },
  abyssLeviathan: () => fNight() && invCount('glowBait') > 0,
};
for (const id in FLEGEND) FISH_TABLE[id] = { d: FLEGEND[id].d, w: {}, tier: FLEGEND[id].tier };
FISH_TABLE.pirateMap = FISH_TABLE.pirateMap || { d: 0.7, w: {} };
const fBaitOn = () => Object.keys(FBAITS).find(id => invCount(id) > 0) || null;
// ---------- Elegir la captura: legendarios en su momento y cebos por especie ----------
{ const r0 = rollCatch; rollCatch = (kind, rod) => {
  const saved = [], bait = fBaitOn(), B = bait && FBAITS[bait];
  for (const id in FLEGEND) { const L = FLEGEND[id]; FISH_TABLE[id].w = L.water.includes(kind) && FLEG_OK[id]() ? { [kind]: 1.6 } : {}; }
  if (B && B.w.includes(kind)) for (const id in FISH_TABLE) { const f = FISH_TABLE[id]; if (f.junk || !f.w[kind] || id === 'fish') continue; saved.push([f, f.w]); f.w = { ...f.w, [kind]: f.w[kind] * 3 }; /* el pez común no: así suben las especies */ }
  let id; try { id = r0(kind, rod); } finally { for (const [f, w] of saved) f.w = w; }
  if (S.boat && (kind === 'deep' || kind === 'sea') && Math.random() < 0.03 && ITEMS.pirateMap) id = 'pirateMap';
  return id; }; }
// ---------- Al sacar el pez: peso, récords, cebo especial y torneo ----------
const fKg = id => { const L = FLEGEND[id]; if (L) return Math.round(L.kg * (0.75 + Math.random() * 0.6) * 10) / 10; const f = ITEMS[id] && ITEMS[id].food ? ITEMS[id].food.f : 8; return Math.round(f * 0.22 * (0.55 + Math.random() * 1.1) * (1 + lvOf('fish') * 0.02) * 10) / 10; };
const isFishId = id => !!(FLEGEND[id] || (typeof FISH_LIST !== 'undefined' && FISH_LIST.some(f => f[0] === id)) || ['fish', 'goldfish', 'glowfish'].includes(id));
{ const l0 = fishLand; fishLand = () => {
  const id = FSH.catch, kind = FSH.kind; l0(); if (!id || !isFishId(id)) return;
  const kg = fKg(id), L = S.fishLog || (S.fishLog = {}), e = L[id] || (L[id] = { n: 0, best: 0 }); e.n++; const rec = kg > e.best; if (rec) e.best = kg;
  const bait = fBaitOn(); if (bait && FBAITS[bait].w.includes(kind)) invTake(bait, 1);
  if (FLEGEND[id]) { if (typeof wvBanner === 'function') wvBanner(`🐉 ¡${ITEMS[id].n}!`, `Un pez legendario de ${kg} kg · ¡a tu acuario!`, '#ffd34a', 4); toast(`🏆 ¡Pez legendario! ${ITEMS[id].n} (${kg} kg)`, true); }
  else toast(`⚖ ${ITEMS[id].n}: ${kg} kg${rec && e.n > 1 ? ' · ¡nuevo récord!' : ''}`);
  const TT = S.ftour; if (TT && TT.on && kg > (TT.best ? TT.best.kg : 0)) { TT.best = { id, kg }; toast(`🎣 Torneo: tu mejor pieza ahora es ${ITEMS[id].n} de ${kg} kg`); }
}; }
// ---------- Acuario ----------
function aqHas(id) { return !!(S.aqua && S.aqua[id]); }
const aqSpecies = () => Object.keys(S.aqua || {}).length;
const aqAll = () => [...(typeof FISH_LIST !== 'undefined' ? FISH_LIST.map(f => f[0]) : []), 'fish', 'goldfish', 'glowfish', ...Object.keys(FLEGEND)].filter(id => ITEMS[id]);
const AQ_MILES = [[5, 'coin', 80, '5 especies'], [10, 'coin', 200, '10 especies'], [15, 'masterFishingRod', 1, '15 especies'], [aqAll().length, 'coin', 800, 'la colección completa']];
function aqDeposit() { const A = S.aqua || (S.aqua = {}); let n = 0; for (const id of aqAll()) if (!A[id] && invCount(id) > 0) { invTake(id, 1); A[id] = { t: S.time }; n++; }
  if (!n) { toastErr('No llevas ningún pez nuevo para el acuario'); return; } toast(`🐠 ${n} especie${n > 1 ? 's' : ''} nueva${n > 1 ? 's' : ''} en el acuario (${aqSpecies()}/${aqAll().length})`);
  const got = S.aquaMiles || (S.aquaMiles = {}); for (const [k, id, q, txt] of AQ_MILES) if (aqSpecies() >= k && !got[k] && ITEMS[id]) { got[k] = 1; invGive(id, q, S.player.x, S.player.y); toast(`🏅 Acuario: ¡${txt}! Premio: ${q} ${ITEMS[id].n}`, true); }
  if (Object.keys(FLEGEND).every(aqHas) && !got.leg && ITEMS.captainHat) { got.leg = 1; toast('👑 ¡Tienes los 5 peces legendarios! Eres Maestro Pescador.', true); } invVersion++; }
// Peces nadando dentro de cada acuario
let _aqC = null, _aqCT = 0;
{ const d0 = drawCombat; drawCombat = (ctx, ...a) => { const r = d0(ctx, ...a); if (!S || !S.aqua) return r; const ids = Object.keys(S.aqua); if (!ids.length) return r; const now = performance.now() / 1000;
  if (!_aqC || now - _aqCT > 1) { _aqC = blocks.filter(b => b.type === 'aquarium'); _aqCT = now; }
  for (const b of _aqC) { if (Math.abs(b.x * T - view.x) > cw / view.z || Math.abs(b.y * T - view.y) > ch / view.z) continue;
    for (let k = 0; k < Math.min(4, ids.length); k++) { const id = ids[(k * 7 + b.x * 3 + b.y) % ids.length], ph = now * (0.6 + k * 0.17) + k * 2, x = b.x * T + T / 2 + Math.sin(ph) * 9, y = b.y * T + 9 + k * 5, dir = Math.cos(ph) > 0 ? 1 : -1;
      ctx.fillStyle = ITEMS[id].c || '#7ab0d0'; ctx.beginPath(); ctx.ellipse(x, y, FLEGEND[id] ? 4.5 : 3, 1.8, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - dir * 3, y); ctx.lineTo(x - dir * 6, y - 2); ctx.lineTo(x - dir * 6, y + 2); ctx.fill(); } }
  return r; }; }
// ---------- Torneo de pesca ----------
const TOUR_RIVALS = ['Brena la Remendona', 'Tomás Anzuelo', 'Dora Escama', 'el viejo Lupo', 'Marina Sal', 'Ciro Red'];
function tourStart(manual) { const d = fDay(), R = stlR ? stlR(d * 7919 + (S.gen.seed | 0)) : Math.random, lv = typeof lvOf === 'function' ? lvOf('fish') : 0;
  const rivals = [0, 1, 2, 3].map(i => ({ n: TOUR_RIVALS[(d + i * 2) % TOUR_RIVALS.length], kg: Math.round((2 + R() * 5 + lv * 0.5 + i * 0.6) * 10) / 10 }));
  S.ftour = { on: 1, day: d, end: 18, rivals, best: null }; if (typeof wvBanner === 'function') wvBanner('🎣 ¡Torneo de pesca!', 'Hasta las 18 h: gana quien saque el pez más pesado', '#5ac8ff', 4);
  toast('🎣 Hoy hay torneo de pesca hasta las 18 h. ¡Saca el pez más pesado que puedas! (pulsa F en un acuario o /pesca para ver la tabla)', true); }
function tourEnd() { const TT = S.ftour; TT.on = 0; const mine = TT.best ? TT.best.kg : 0, all = [...TT.rivals.map(r => ({ n: r.n, kg: r.kg })), { n: 'Tú', kg: mine, me: 1 }].sort((a, b) => b.kg - a.kg), pos = all.findIndex(x => x.me) + 1;
  const prize = [[150, 'masterFishingRod'], [80, 'shrimpBait'], [40, 'wormBait']][pos - 1];
  if (prize && mine > 0) { invGive('coin', prize[0], S.player.x, S.player.y); if (ITEMS[prize[1]]) invGive(prize[1], pos === 1 ? 1 : 6, S.player.x, S.player.y); }
  TT.last = { pos, all }; toast(mine > 0 ? `🏆 Torneo terminado: quedaste ${pos}º de ${all.length}${prize ? ` · premio ${prize[0]} monedas` : ''}` : '🎣 Torneo terminado: no presentaste ninguna pieza', true); }
let _tourT = 0;
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); if (!S || (_tourT -= fdt) > 0) return; _tourT = 2; const d = fDay(), h = fHour(), TT = S.ftour;
  if ((!TT || TT.day !== d) && d % 6 === 3 && h >= 7 && h < 17 && S.inv.some(s => s && ITEMS[s.id] && ITEMS[s.id].rod)) tourStart();
  if (S.ftour && S.ftour.on && (h >= S.ftour.end || fDay() !== S.ftour.day)) tourEnd();
  const el = $('ftourHud'); if (el) { const T2 = S.ftour; el.hidden = !(T2 && T2.on) || !!ui.open; if (!el.hidden) { const lead = Math.max(...T2.rivals.map(r => r.kg)); el.textContent = `🎣 Torneo · tu mejor: ${T2.best ? T2.best.kg + ' kg' : '—'} · líder rival: ${lead} kg · hasta las 18 h`; } } }; }
{ const e = document.createElement('div'); e.id = 'ftourHud'; e.hidden = true; document.body.appendChild(e); }
// ---------- Ventana: diario, acuario y torneo ----------
{ const m = document.createElement('div'); m.id = 'mFish'; m.className = 'modal'; m.hidden = true; m.innerHTML = '<div class="modal-in fishm" id="fishBody"></div>'; document.body.appendChild(m); MODALS.fishlog = 'mFish';
  m.addEventListener('mousedown', e => { if (e.target === m || e.target.closest('[data-close]')) closeModal(); }); }
let _fTab = 'log';
function fishWhere(id) { const L = FLEGEND[id]; if (L) return L.hint; const f = FISH_TABLE[id]; if (!f) return ''; const ws = Object.keys(f.w || {}).filter(k => f.w[k] > 0).map(k => WATER_N[k]); return (ws.join(', ') || '?') + (f.nightOnly ? ' · solo de noche' : f.night ? ' · mejor de noche' : '') + (f.tier ? ` · caña ${['', 'de hierro', 'maestra'][f.tier]}` : ''); }
function fishRender() {
  const Lg = S.fishLog || {}, all = aqAll(), A = S.aqua || {}, TT = S.ftour;
  const tabs = [['log', '📖 Diario'], ['aqua', '🐠 Acuario'], ['tour', '🏆 Torneo']].map(([k, n]) => `<button data-ftab="${k}" class="${_fTab === k ? 'on' : ''}">${n}</button>`).join('');
  let body = '';
  if (_fTab === 'log') body = `<p class="small mut">Hoy: ${MOON_N[moonPhase()]}${isFullMoon() ? ' 🌕' : ''} · ${typeof WX_T !== 'undefined' && WX_T[WX.type] ? WX_T[WX.type].i + ' ' + WX_T[WX.type].n : ''} · cebo puesto: ${fBaitOn() ? ITEMS[fBaitOn()].n : 'ninguno especial'}</p>
    <div class="fishgrid">${all.map(id => { const e = Lg[id], leg = !!FLEGEND[id]; return `<div class="fishc ${e ? '' : 'unk'} ${leg ? 'leg' : ''}">${e ? itemImg(id, 30) : '<span class="q">?</span>'}<div><b>${e ? esc(ITEMS[id].n) : leg ? '??? (legendario)' : '???'}</b><small>${e ? `${e.n} capturado${e.n > 1 ? 's' : ''} · récord ${e.best} kg` : esc(fishWhere(id))}</small></div></div>`; }).join('')}</div>`;
  if (_fTab === 'aqua') body = `<p>${aqSpecies()} de ${all.length} especies. Premios: ${AQ_MILES.map(([k, id, q, txt]) => `<span class="${(S.aquaMiles || {})[k] ? 'good' : 'mut'}">${txt} (${q} ${ITEMS[id] ? ITEMS[id].n : id})</span>`).join(' · ')}</p>
    <button data-fdep>🐟 Echar los peces nuevos que llevo</button><div class="fishgrid">${all.map(id => `<div class="fishc ${A[id] ? '' : 'unk'} ${FLEGEND[id] ? 'leg' : ''}">${A[id] ? itemImg(id, 30) : '<span class="q">·</span>'}<div><b>${A[id] ? esc(ITEMS[id].n) : '—'}</b></div></div>`).join('')}</div>`;
  if (_fTab === 'tour') { const t = TT && (TT.on ? TT : TT.last ? TT : null);
    body = !TT ? '<p class="mut">El torneo de pesca se celebra cada 6 días, de 7 a 18 h (necesitas una caña encima). También puedes empezar uno con /torneo.</p>'
      : `<p>${TT.on ? '🎣 ¡Torneo en marcha hasta las 18 h!' : `Último torneo: quedaste <b>${TT.last ? TT.last.pos + 'º' : '—'}</b>.`} Próximo: el día ${Math.floor(fDay() / 6) * 6 + 3 + (fDay() % 6 >= 3 ? 6 : 0) + 1}.</p>
        <table class="ftab">${[...TT.rivals.map(r => [r.n, r.kg]), ['Tú', TT.best ? TT.best.kg : 0]].sort((a, b) => b[1] - a[1]).map(([n, kg], i) => `<tr class="${n === 'Tú' ? 'me' : ''}"><td>${i + 1}º</td><td>${esc(n)}</td><td>${kg} kg</td></tr>`).join('')}</table>`; }
  $('fishBody').innerHTML = `<header><h2>🎣 Pesca</h2><div class="ftabs">${tabs}</div><button data-close>Cerrar <kbd>Esc</kbd></button></header>${body}`;
}
function fishOpen(tab) { if (tab) _fTab = tab; openModal('fishlog'); fishRender(); }
document.addEventListener('click', e => { if (!S) return; const t = e.target.closest('[data-ftab]'); if (t) { _fTab = t.dataset.ftab; fishRender(); return; } if (e.target.closest('[data-fdep]')) { aqDeposit(); fishRender(); } });
{ const i0 = interact; interact = (shift, ctrl) => { const b = S && at(mouse.tx, mouse.ty); if (b && b.type === 'aquarium') { fishOpen('aqua'); return; } return i0(shift, ctrl); }; }
cmd('pesca', { a: ['diariopesca', 'acuario'], u: '/pesca', d: 'Abre el diario de pesca, el acuario y el torneo.', run() { fishOpen(); return ''; } });
cmd('torneo', { a: [], u: '/torneo', d: 'Empieza un torneo de pesca ahora (hasta las 18 h).', cheat: 1, run() { tourStart(true); return ''; } });
// Los colonos disfrutan del acuario
if (typeof colNewDay === 'function') { const n0 = colNewDay; colNewDay = () => { n0(); if (aqSpecies() >= 5 && typeof colAdd === 'function') for (const c of colS().list) colAdd(c, 'aqua', 4, 'Visitó el acuario', (S.gen.dayLen || DAY_LEN)); }; }
