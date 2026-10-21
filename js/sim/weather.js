'use strict';
// =====================================================================================
//  Clima y ambiente. El tiempo cambia cada pocos minutos según el bioma donde estás y
//  los ajustes del mundo (temperatura y humedad del creador) y AFECTA de verdad:
//   · Lluvia / tormenta / nieve / ventisca: te mojas (más frío, el aguante se recupera
//     peor); cerca de una fuente de calor te secas. La ventisca frena y congela.
//   · Ola de calor: más sed y quemaduras solares. Tormenta de arena: frena y te mete
//     arena en los ojos. Niebla: te ven menos (sigilo) pero ves menos.
//   · Tormenta eléctrica: rayos cerca; con una herramienta de metal en la mano, cuidado.
//   · Animales: con mal tiempo se refugian y descansan más. Enemigos: más rápidos en
//     tormenta y ventisca. Ceniza volcánica y esporas: irritan los ojos y la piel.
//   · Dentro de los túneles de la montaña está oscuro aunque sea de día: lleva luz.
// =====================================================================================
const WX_T = {
  clear: { n: 'Despejado', i: '☀' }, cloudy: { n: 'Nublado', i: '☁', dark: 0.08 },
  rain: { n: 'Lluvia', i: '🌧', wet: 1, dark: 0.15, amb: -3 }, storm: { n: 'Tormenta', i: '⛈', wet: 1.6, dark: 0.32, amb: -4, bolts: 1, foe: 1.12, beast: 0.5 },
  snow: { n: 'Nevada', i: '🌨', wet: 0.6, dark: 0.1, amb: -6 }, blizzard: { n: 'Ventisca', i: '❄', wet: 1, dark: 0.25, amb: -14, slow: 0.85, foe: 1.1, beast: 0.5 },
  heat: { n: 'Ola de calor', i: '🔥', amb: 10, thirst: 1.6 }, sandstorm: { n: 'Tormenta de arena', i: '🌪', dark: 0.18, amb: 4, slow: 0.85, eyes: 1, beast: 0.4 },
  fog: { n: 'Niebla', i: '🌫', dark: 0.1, stealth: 1 }, ashfall: { n: 'Lluvia de ceniza', i: '🌋', dark: 0.22, amb: 3, eyes: 1 }, spores: { n: 'Esporas', i: '🍄', dark: 0.06, skin: 1 },
};
const WX = { type: 'clear', t: 60, int: 0, wet: 0, bolt: 0, flash: 0, cave: 0, key: '' };
function wxWeights(key) {
  const P = S.gen, hu = 1 + (P.humid || 0) * 5, cold = (P.temp || 0) < -0.05, hot = (P.temp || 0) > 0.05;
  if (/desert|dune|badland|mesa|canyon/i.test(key)) return { clear: 55, heat: 25 * (hot ? 1.5 : 1), sandstorm: 15, cloudy: 5 };
  if (/snow|tundra|ice|frozen|glacier|taiga|alpine|frost/i.test(key)) return { clear: 35, cloudy: 20, snow: 30 * hu, blizzard: 10 * hu, fog: 5 };
  if (/swamp|bog|marsh|mangrove/i.test(key)) return { clear: 20, cloudy: 20, rain: 30 * hu, storm: 10 * hu, fog: 25 };
  if (/jungle|rainforest|bamboo/i.test(key)) return { clear: 25, cloudy: 15, rain: 40 * hu, storm: 15 * hu, fog: 5 };
  if (/volcan|ash|basalt|magma|infern/i.test(key)) return { clear: 40, ashfall: 55, heat: 5 };
  if (/mushroom|fung|myc/i.test(key)) return { clear: 45, spores: 45, fog: 10 };
  if (/ocean|sea|beach|coast/i.test(key)) return { clear: 40, cloudy: 15, rain: 25 * hu, storm: 15 * hu, fog: 5 };
  return { clear: 50, cloudy: 20, rain: 18 * hu, storm: 5 * hu, fog: 7, snow: cold ? 15 : 0, heat: hot ? 10 : 0 };
}
function wxPick(key) { const w = wxWeights(key); let tot = 0; for (const k in w) tot += w[k]; let r = Math.random() * tot; for (const k in w) if ((r -= w[k]) <= 0) return k; return 'clear'; }
const wxDef = () => WX_T[WX.type] || WX_T.clear;
function weatherTick(dt) {
  if (!S) return; const p = S.player, tx = Math.floor(p.x / T), ty = Math.floor(p.y / T), B = BIOMES[biomeOf(tx, ty)] || {}, key = B.key || '';
  // Cambio de tiempo (y al cambiar mucho de bioma)
  WX.t -= dt; const famChange = WX.key && wxWeights(key)[WX.type] === undefined;
  if (WX.t <= 0 || famChange) { const nt = !famChange && WX.next && wxWeights(key)[WX.next] !== undefined ? WX.next : wxPick(key); WX.next = wxPick(key); if (nt !== WX.type) { WX.prev = WX.type; WX.type = nt; WX.int = 0; if (nt !== 'clear') toast(`${WX_T[nt].i} ${WX_T[nt].n}`); } WX.t = 90 + Math.random() * 180; }
  WX.key = key; WX.int = Math.min(1, WX.int + dt / 12);
  const D = wxDef(), I = WX.int;
  // Túnel dentro de la montaña: oscuro aunque sea de día
  // (hace falta estar rodeado de roca: un túnel o una cámara picada, no la ladera al aire libre)
  if (WX._ck !== tx + ',' + ty) { WX._ck = tx + ',' + ty; let n = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const g = GI[gnd(tx + dx, ty + dy)]; if (g.solid && !g.tree) n++; } WX._cv = n >= 11 && rawLv(tx, ty) > LV_FOOT && !GI[gnd(tx, ty)].solid; }
  const inCave = WX._cv;
  WX.cave += ((inCave ? 1 : 0) - WX.cave) * Math.min(1, dt * 2);
  // Mojado: sube bajo la lluvia o nadando, baja al sol o junto al fuego
  const wetIn = (D.wet || 0) * I * (inCave ? 0 : 1) * (1 - protOf('rain')) + (P.swim ? 3 : 0);
  WX.wet = clamp(WX.wet + (wetIn ? wetIn * 6 : -(_warm ? 8 : 1.5) - (WX.type === 'heat' ? 3 : 0)) * dt, 0, 100);
  if (survOn()) {
    const pc = S.pc;
    if (D.thirst) pc.water = Math.max(0, pc.water - 0.083 * (D.thirst - 1) * dt * I);
    if (WX.wet > 50 && !pc.rest) pc.stam = Math.max(0, pc.stam - 0.6 * dt);
    if (D.eyes && !inCave && Math.random() < dt * 0.01 * I * (1 - protOf('eyes'))) medEvent('eyeDust', ['head'], D.n);
    if (D.skin && Math.random() < dt * 0.006 * I) medEvent('rash', EXT_P, D.n);
    if (WX.type === 'heat' && !buff('sunproof') && Math.random() < dt * 0.006 * I * (1 - protOf('sun'))) medEvent('sunburn', ['head', 'armL', 'armR', 'torso'], 'Ola de calor');
  }
  // Rayos
  if (D.bolts && !inCave) { WX.bolt -= dt; if (WX.bolt <= 0) { WX.bolt = 5 + Math.random() * 12; lightning(); } }
  if (WX.flash > 0) WX.flash -= dt;
}
function lightning() {
  const p = S.player, a = Math.random() * 6.28, r = (2 + Math.random() * 12) * T, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
  WX.flash = 0.35; WX.boltAt = { x, y, t: 0.4 }; shake = Math.max(shake, 0.25);
  setTimeout(() => { noise(0.9, 0.16, 140); tone(55, 0.8, 'sawtooth', 0.06, 0.5); }, 200 + r / T * 40);
  if (typeof fxBurst === 'function') fxBurst(x, y, 18, { col: '#e8f4ff', sp: 160, life: 0.5, glow: 1 });
  const id = heldId(), metal = id && TOOLS[id] && /iron|steel|copper|titanium|mithril|gold|silver|tungsten/i.test(id);
  if (Math.hypot(x - p.x, y - p.y) < (metal ? 5 : 2) * T && survOn()) { hurt('burn', 'armR', metal ? 1.4 : 0.8, 'Rayo'); toastErr('⚡ ¡Te ha alcanzado un rayo!'); }
}
// Lo que el resto del juego consulta
const envDark = () => (wxDef().dark || 0) * WX.int + WX.cave * 0.62;
{ const a0 = ambient; ambient = () => a0() + (wxDef().amb || 0) * WX.int - WX.wet * 0.08; }
{ const b0 = buff; buff = k => b0(k) || (k === 'stealth' && wxDef().stealth && WX.int > 0.5); }
{ const s0 = speedMul; speedMul = () => s0() * (wxDef().slow ? 1 - (1 - wxDef().slow) * WX.int : 1) * (WX.wet > 70 ? 0.96 : 1); }
const wxFoeMul = () => 1 + ((wxDef().foe || 1) - 1) * WX.int;
const wxBeastRest = () => (wxDef().beast || 0) * WX.int;
// Indicador junto al minimapa: tiempo, temperatura y si estás mojado
let _wxEl = null, _wxSig = '';
function weatherHud() {
  if (!_wxEl) { _wxEl = document.createElement('div'); _wxEl.id = 'wxHud'; const r = $('right'); if (!r) return; r.appendChild(_wxEl); }
  const D = wxDef(), amb = Math.round(ambient()), sig = WX.type + amb + Math.round(WX.wet / 10) + (WX.cave > 0.5);
  if (sig === _wxSig) return; _wxSig = sig;
  _wxEl.innerHTML = `<span title="${esc(D.n)}">${D.i} ${esc(D.n)}</span><span title="Temperatura que notas">${amb}°</span>${WX.wet > 15 ? `<span title="Estás mojado: tienes más frío">💧 ${Math.round(WX.wet)} %</span>` : ''}${WX.cave > 0.5 ? '<span title="Dentro de la montaña: oscuro">🕯 túnel</span>' : ''}`;
}
