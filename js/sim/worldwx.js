'use strict';
// =====================================================================================
//  El clima cambia el mundo (alrededor del jugador, poco a poco, y vuelve a su estado):
//   · Lluvia / tormenta: los hoyos se llenan de agua (charcos donde beber, nadar y pescar),
//     la tierra pelada reverdece y los árboles y plantas dañados se recuperan.
//   · Nieve / ventisca: el suelo se cubre de nieve (frena al andar) y el agua de la orilla se
//     hiela (puedes cruzarla andando). Con buen tiempo se derrite.
//   · Ola de calor: los charcos se evaporan y la hierba se agosta; vuelve a verdear después.
//   · Tormenta: los rayos queman árboles (quedan árboles muertos y ceniza, a veces carbón).
//   · Tormenta de arena: la arena invade el suelo cercano al desierto. Ceniza volcánica: se acumula.
//  Y además: pronóstico del tiempo, eventos del día y un reloj interactivo (abajo).
// =====================================================================================
// Cambios reversibles: S.wxMods[clave] = [casilla original, tipo de cambio]
const WXW_RULES = {
  rain: [['PIT', 'WATER', 'puddle', 0.35], ['DIRT', 'GRASS', 'regrow', 0.08], ['DRYGRASS', 'GRASS', 'regrow', 0.25]],
  storm: [['PIT', 'WATER', 'puddle', 0.5], ['DIRT', 'GRASS', 'regrow', 0.1]],
  snow: [['GRASS', 'SNOW', 'snow', 0.12], ['DIRT', 'SNOW', 'snow', 0.12], ['DRYGRASS', 'SNOW', 'snow', 0.12], ['WATER', 'ICE', 'ice', 0.05]],
  blizzard: [['GRASS', 'SNOW', 'snow', 0.3], ['DIRT', 'SNOW', 'snow', 0.3], ['DRYGRASS', 'SNOW', 'snow', 0.3], ['SAND', 'SNOW', 'snow', 0.15], ['WATER', 'ICE', 'ice', 0.15], ['COLDWATER', 'ICE', 'ice', 0.2]],
  heat: [['WATER', 'PIT', 'dry', 0.25, 'puddle'], ['GRASS', 'DRYGRASS', 'parch', 0.06]],
  sandstorm: [['GRASS', 'SAND', 'sand', 0.05], ['DRYGRASS', 'SAND', 'sand', 0.1], ['DIRT', 'SAND', 'sand', 0.08]],
  ashfall: [['GRASS', 'ASH', 'ash', 0.05], ['DRYGRASS', 'ASH', 'ash', 0.08], ['DIRT', 'ASH', 'ash', 0.06]],
};
// Qué deshace cada tiempo (los cambios que no encajan con él vuelven poco a poco a como estaban)
const WXW_KEEP = { rain: ['puddle', 'regrow'], storm: ['puddle', 'regrow'], snow: ['snow', 'ice'], blizzard: ['snow', 'ice'], heat: ['parch'], sandstorm: ['sand'], ashfall: ['ash'], cloudy: ['puddle', 'regrow'], fog: ['puddle', 'regrow'] };
let _wxwT = 0;
function wxWorldTick(dt) {
  _wxwT -= dt; if (_wxwT > 0 || !S) return; _wxwT = 1.2;
  const p = S.player, px = Math.floor(p.x / T), py = Math.floor(p.y / T), I = WX.int, type = WX.type, rules = WXW_RULES[type] || [], M = S.wxMods || (S.wxMods = {});
  if (WX.cave > 0.5) return;
  // Aplicar cambios del tiempo actual (casillas al azar alrededor, a la vista)
  for (let n = 0; n < 40 && rules.length && I > 0.4; n++) {
    const x = px + ((Math.random() * 32) | 0) - 16, y = py + ((Math.random() * 22) | 0) - 11; if (at(x, y)) continue;
    const g = gnd(x, y), key = GI[g].key, k = x + ',' + y;
    for (const [from, to, kind, pr, only] of rules) {
      if (key !== from || Math.random() > pr * I) continue;
      if (only && !(M[k] && M[k][1] === only)) continue;                  // el calor solo seca charcos de lluvia
      if (kind === 'ice' && nearShore(x, y) === false) continue;           // se hiela la orilla, no el lago entero
      if (kind === 'puddle' && depthAt(x, y) > 3) continue;
      if (kind === 'dry') { const o = M[k]; delete M[k]; setGround(x, y, G.PIT, 0); burstSoft(x, y, '#c8b890'); break; }
      if (!M[k]) M[k] = [g, kind]; else M[k][1] = kind;
      setGround(x, y, G[to], GI[G[to]].hp || 0);
      if (kind === 'regrow' || kind === 'puddle') burstSoft(x, y, kind === 'puddle' ? '#8ac8ff' : '#7ad07a');
      break;
    }
  }
  // Recuperación de plantas y árboles con la lluvia
  if ((type === 'rain' || type === 'storm') && I > 0.5) for (let n = 0; n < 6; n++) {
    const x = px + ((Math.random() * 40) | 0) - 20, y = py + ((Math.random() * 28) | 0) - 14, gi = GI[gnd(x, y)];
    if (gi.hp && (gi.tree || gi.plant) && treeHp(x, y) < gi.hp) { const c = getChunk(x >> CSH, y >> CSH); c.t[((y & CMASK) << CSH) | (x & CMASK)]++; c.mod = true; onTileChange(x, y, false); }
  }
  // Deshacer poco a poco lo que no encaja con el tiempo actual
  const keep = WXW_KEEP[type] || [], keys = Object.keys(M);
  for (let n = 0; n < Math.min(10, keys.length); n++) {
    const k = keys[(Math.random() * keys.length) | 0], m = M[k]; if (!m || keep.includes(m[1])) continue;
    const [x, y] = k.split(',').map(Number); if (Math.abs(x - px) > 40 || Math.abs(y - py) > 30) continue;
    if (m[1] === 'puddle' && type !== 'heat' && Math.random() < 0.7) continue; // los charcos duran más
    if (at(x, y)) { delete M[k]; continue; }
    setGround(x, y, m[0], GI[m[0]].hp || 0); delete M[k];
    if (m[1] === 'snow' || m[1] === 'ice') burstSoft(x, y, '#e8f4ff');
  }
}
function burstSoft(x, y, col) { if (typeof fxBurst === 'function') fxBurst((x + 0.5) * T, (y + 0.5) * T, 5, { col, sp: 25, life: 0.6, size: 1.6, up: 8 }); }
// Rayos: queman el árbol más cercano al impacto
{ const l0 = lightning; lightning = () => { l0(); const b = WX.boltAt; if (!b) return; const tx = Math.floor(b.x / T), ty = Math.floor(b.y / T);
  for (let r = 0; r <= 2; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = tx + dx, y = ty + dy, gi = GI[gnd(x, y)];
    if (gi.tree && gi.key !== 'DEADTREE') { setGround(x, y, G.DEADTREE, 3); if (typeof fxBurst === 'function') { fxBurst((x + 0.5) * T, (y + 0.3) * T, 20, { col: '#ff8a3a', sp: 80, life: 0.9, glow: 1, up: 30 }); for (let i = 0; i < 8; i++) fxSmoke((x + 0.5) * T, (y + 0.2) * T, 'rgba(60,55,50,', 5); } if (Math.random() < 0.5) { const c = getChunk(x >> CSH, y >> CSH); c.mod = true; } return; } } }; }
// ---------- Pronóstico: el siguiente tiempo se decide por adelantado ----------
{ const w0 = weatherTick; weatherTick = dt => {
  if (S && !WX.next) WX.next = wxPick(WX.key || '');
  w0(dt); wxWorldTick(dt); dayEvents(dt); }; }
// ---------- Eventos del día ----------
const PHASES = [[0, 'Madrugada', '🌑'], [0.2, 'Amanecer', '🌅'], [0.3, 'Mañana', '🌤'], [0.45, 'Mediodía', '☀'], [0.6, 'Tarde', '🌤'], [0.72, 'Atardecer', '🌇'], [0.8, 'Noche', '🌙']];
const dayLen = () => S.gen.dayLen || DAY_LEN;
const dayPh = () => ((S.time % dayLen()) + dayLen()) % dayLen() / dayLen();
const dayNum = () => Math.floor(S.time / dayLen()) + 1;
const phaseOf = ph => { let r = PHASES[0]; for (const q of PHASES) if (ph >= q[0]) r = q; return r; };
// La noche que viene (o la actual) es la de luna de sangre si su índice (combat.js) % 5 === 4
const nextNight = () => nightIndex() + (daylight() < 0.3 ? 0 : 1); // de día, la noche que viene
const bloodTonight = () => nextNight() % 5 === 4;
let _lastPhase = '';
function dayEvents() {
  if (!S) return; const ph = phaseOf(dayPh());
  if (ph[1] !== _lastPhase) { if (_lastPhase) { const msg = { Amanecer: `🌅 Amanece — día ${dayNum()}`, Atardecer: '🌇 Atardece: pronto saldrán más enemigos', Noche: bloodTonight() ? '🩸 Noche de luna de sangre' : '🌙 Se hace de noche: busca luz o refugio' }[ph[1]]; if (msg) { toast(msg, ph[1] !== 'Amanecer'); tone(ph[1] === 'Noche' ? 330 : 660, 0.25, 'sine', 0.035, ph[1] === 'Noche' ? 0.7 : 1.3); } } _lastPhase = ph[1]; }
}
// ---------- Reloj (junto al minimapa) ----------
let _clkEl = null, _clkOpen = false, _clkSig = '';
const fmtHM = ph => { const m = Math.floor(ph * 24 * 60); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const fmtLeft = s => s >= 60 ? Math.round(s / 60) + ' min' : Math.max(1, Math.round(s)) + ' s';
function untilPh(target) { const ph = dayPh(); let d = target - ph; if (d <= 0) d += 1; return d * dayLen(); }
function clockHTML() {
  const ph = dayPh(), P0 = phaseOf(ph), night = daylight() < 0.3, D = wxDef(), amb = Math.round(ambient());
  const sunA = Math.PI + ph * 2 * Math.PI - Math.PI / 2, cx = 30, cy = 30, R = 24, sx = cx + Math.cos(sunA) * R, sy = cy + Math.sin(sunA) * R;
  const nextEv = night ? ['🌅 Amanecer', untilPh(0.2)] : ph < 0.72 ? ['🌇 Atardecer', untilPh(0.72)] : ['🌙 Noche', untilPh(0.8)];
  const dial = `<svg viewBox="0 0 60 60" class="clkd"><defs><linearGradient id="clkg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffd27a" stop-opacity=".25"/><stop offset=".5" stop-color="#ffd27a" stop-opacity=".05"/><stop offset=".5" stop-color="#4a5aa8" stop-opacity=".12"/><stop offset="1" stop-color="#4a5aa8" stop-opacity=".3"/></linearGradient></defs>
    <circle cx="30" cy="30" r="27" fill="url(#clkg)" stroke="rgba(255,255,255,.1)"/><line x1="4" y1="30" x2="56" y2="30" stroke="rgba(255,255,255,.18)" stroke-dasharray="2 2"/>
    ${[0, 0.25, 0.5, 0.75].map(q => { const a = Math.PI + q * 2 * Math.PI - Math.PI / 2; return `<circle cx="${(30 + Math.cos(a) * 27).toFixed(1)}" cy="${(30 + Math.sin(a) * 27).toFixed(1)}" r="1.2" fill="rgba(255,255,255,.35)"/>`; }).join('')}
    <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="5" fill="${night ? (bloodTonight() ? '#ff4a3a' : '#dfe6ff') : '#ffd34a'}" ${night ? '' : 'filter="drop-shadow(0 0 3px #ffd34a)"'}/></svg>`;
  let h = `<div class="clkm">${dial}<div class="clkt"><b>${fmtHM(ph)}</b><span>${P0[2]} ${P0[1]} · día ${dayNum()}</span><span class="clkw">${D.i} ${esc(D.n)} · ${amb}°${WX.wet > 15 ? ` · 💧${Math.round(WX.wet)}%` : ''}${WX.cave > 0.5 ? ' · 🕯 túnel' : ''}</span></div></div>`;
  h += `<div class="clkn">${nextEv[0]} en ${fmtLeft(nextEv[1])}</div>`;
  if (_clkOpen) {
    const nx = WX_T[WX.next] || WX_T.clear, tips = [];
    if (night) tips.push(bloodTonight() ? '🩸 Luna de sangre: muchos más enemigos esta noche (y quizá un jefe).' : '🌙 De noche salen enemigos; no aparecen cerca de luces, casas, camas ni del Núcleo.');
    else if (ph > 0.6) tips.push('🛏 Duerme en una cama para pasar la noche (y guardar dónde reapareces).');
    if (D.wet) tips.push('💧 Te mojas: acércate al fuego para secarte y no pasar frío.');
    if (WX.type === 'heat') tips.push('🔥 Bebe más y protégete del sol.'); if (WX.type === 'storm') tips.push('⚡ Rayos: no lleves herramientas de metal al descubierto.');
    if (WX.type === 'snow' || WX.type === 'blizzard') tips.push('🧊 La orilla se hiela: puedes cruzar el agua andando.');
    if (WX.type === 'rain' || WX.type === 'storm') tips.push('🌱 La lluvia llena los hoyos de agua y hace crecer las plantas.');
    const bar = `<div class="clkbar">${PHASES.map((q, i) => { const w = ((PHASES[i + 1] ? PHASES[i + 1][0] : 1) - q[0]) * 100; return `<i style="width:${w}%;background:${q[1] === 'Noche' || q[1] === 'Madrugada' ? '#2a3466' : q[1] === 'Amanecer' || q[1] === 'Atardecer' ? '#c8703a' : '#c8a84a'}" title="${q[1]} desde las ${fmtHM(q[0])}"></i>`; }).join('')}<b style="left:${(ph * 100).toFixed(1)}%"></b></div>`;
    h += `<div class="clkx">${bar}<div class="clkr"><span>Ahora</span><b>${D.i} ${esc(D.n)}</b><small>quedan ${fmtLeft(WX.t)}</small></div><div class="clkr"><span>Después</span><b>${nx.i} ${esc(nx.n)}</b><small>previsto</small></div>
      <div class="clkr"><span>Próxima noche</span><b>${bloodTonight() ? '🩸 luna de sangre' : 'luna de sangre en ' + (4 - nextNight() % 5) + ' noche' + (4 - nextNight() % 5 > 1 ? 's' : '')}</b></div>${tips.map(t => `<p>${t}</p>`).join('')}</div>`;
  }
  return h;
}
function clockHud() {
  if (!S) return;
  if (!_clkEl) { _clkEl = document.createElement('div'); _clkEl.id = 'clock'; _clkEl.title = 'Clic: pronóstico y eventos'; const r = $('right'), w = $('wxHud'); if (!r) return; r.insertBefore(_clkEl, w || null); _clkEl.onclick = () => { _clkOpen = !_clkOpen; _clkSig = ''; clockHud(); }; }
  const w = $('wxHud'); if (w) w.hidden = true;
  const h = clockHTML(); if (h === _clkSig) return; _clkSig = h; _clkEl.innerHTML = h; _clkEl.classList.toggle('open', _clkOpen); document.body.classList.toggle('clkopen', _clkOpen);
}
{ const h0 = weatherHud; weatherHud = () => { clockHud(); }; }
