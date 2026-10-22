'use strict';
// =====================================================================================
//  Hogueras, chimeneas y cocinas de leña: calor gradual y combustible que dura.
//   · Más intensidad = más calor y más alcance. El calor baja poco a poco al alejarte.
//   · Queman lo que les eches (leña, tablones, palos, carbón, turba…): cada pieza dura
//     mucho (un tronco, 4 min; el carbón, 12 min). A más intensidad, gastan más deprisa.
//   · Las máquinas que queman combustible (generadores, calderas, hornos) también lo
//     hacen durar más.
// =====================================================================================
const FIRE_T = Object.keys(BD).filter(t => /^(campfire|fireplace|woodStove|brazier)$/.test(t) || (BD[t].heat && !BD[t].machine && !BD[t].pw && !BD[t].gen));
const FIRE_SEC = 60, FUEL_LONG = 6;
for (const t of FIRE_T) { BD[t].fuel = Object.keys(FUEL); BD[t].inv = 1; }
const isFire = b => !!b && FIRE_T.includes(b.type);
const fireBase = b => BD[b.type].light || 2;
const fireRate = b => Math.max(0.4, lightOf(b) / fireBase(b));          // gasto relativo a la intensidad normal
const fireMax = b => 8 + 4 * lightOf(b);                                  // °C junto al fuego
const fireReach = b => 1 + lightOf(b);                                    // casillas hasta donde se nota
const fireStock = b => Object.keys(FUEL).reduce((s, k) => s + ((b.inv && b.inv[k]) || 0) * FUEL[k] * FIRE_SEC, 0);
function fireTick(dt) {
  for (const t of FIRE_T) for (const b of L[t] || []) {
    if (!b.inv) { b.inv = {}; b.out = {}; }
    if (b._fi === undefined) { b._fi = 1; if (!((b.fuel || 0) > 0)) b.fuel = 600; } // al ponerla (o en partidas viejas) arde 10 min
    if (b.off) { b.lit = false; continue; }
    if ((b.fuel || 0) <= 0) { const k = Object.keys(FUEL).find(k => (b.inv[k] || 0) > 0); if (k) { dictAdd(b.inv, k, -1); b.fuel = FUEL[k] * FIRE_SEC; } }
    const was = !!b.lit; b.lit = (b.fuel || 0) > 0; if (b.lit) b.fuel = Math.max(0, b.fuel - dt * fireRate(b));
    if (was !== b.lit) { b._tv = -1; _fogDirty = true; if (!b.lit && dist((b.x + 0.5) * T, (b.y + 0.5) * T, S.player.x, S.player.y) < 12 * T) toast(`🔥 ${BD[b.type].n}: se ha apagado. Échale leña o carbón`); }
  }
}
{ const t0 = tick; tick = dt => { t0(dt); if (S) fireTick(dt); }; }
{ const l0 = litOf; litOf = b => isFire(b) ? !!b.lit && !b.off : l0(b); }
// Echar combustible: F con leña, carbón… en la mano (toda la pila)
{ const u0 = useBlock; useBlock = b => {
  if (isFire(b)) { const s = S.inv[S.sel]; if (s && FUEL[s.id]) { if (!b.inv) { b.inv = {}; b.out = {}; } const n = Math.min(s.n, 64 - (b.inv[s.id] || 0)); if (n > 0) { dictAdd(b.inv, s.id, n); s.n -= n; if (s.n <= 0) S.inv[S.sel] = null; invVersion++; toast(`🔥 +${n} ${ITEMS[s.id].n}: arderá ~${fireLeft(b)} más`); return true; } } }
  return u0(b);
}; }
function fireLeft(b) { const s = ((b.fuel || 0) + fireStock(b)) / fireRate(b); return s >= 3600 ? (s / 3600).toFixed(1).replace('.', ',') + ' h' : Math.max(1, Math.round(s / 60)) + ' min'; }
// ---------- Calor alrededor del jugador ----------
let _heatV = 0;
function heatAround() {
  const p = S.player, px = p.x / T - 0.5, py = p.y / T - 0.5; let h = 0;
  for (const t of FIRE_T) for (const b of L[t] || []) { if (!b.lit || b.off) continue; const d = Math.hypot(b.x - px, b.y - py), R = fireReach(b); if (d < R) h += fireMax(b) * Math.pow(1 - d / R, 1.3); }
  for (const t of ['furnace', 'alloySmelter', 'blastFurnace', 'boiler', 'efurnace']) for (const b of L[t] || []) { if (!litOf(b)) continue; const d = Math.hypot(b.x - px, b.y - py); if (d < 4) h += 20 * (1 - d / 4); }
  const tx = Math.floor(px + 0.5), ty = Math.floor(py + 0.5);
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (GI[gnd(tx + dx, ty + dy)].liquid === 'lava') { const d = Math.hypot(dx, dy); if (d < 4) h = Math.max(h, 25 * (1 - d / 4)); }
  return Math.min(45, h);
}
{ const e0 = envCheck; envCheck = () => { e0(); _heatV = heatAround(); _warm = _heatV > 3; }; }
ambient = () => _amb + CM().warm + _heatV;
// ---------- Las máquinas de combustible lo hacen durar más ----------
{ const l0 = loadFuel; loadFuel = b => { const was = (b.fuel || 0) > 0, ok = l0(b); if (ok && !was) b.fuel *= b.type === 'furnace' ? 2 : FUEL_LONG; return ok; }; }
// ---------- Ficha: cifras de verdad ----------
{ const f0 = famStats; famStats = (b, f, P, d, st) => {
  if (f !== 'fire' || !isFire(b)) return f0(b, f, P, d, st);
  const lit = litOf(b), stock = fireStock(b);
  return [['Estado', b.off ? 'Apagada a mano' : lit ? 'Encendida' : 'Sin combustible'], ['Calor junto al fuego', lit ? '+' + fireMax(b) + ' °C' : '—'], ['Alcance del calor', fireReach(b) + ' casillas'], ['Luz', lightOf(b) + ' casillas'],
    ['Combustible', lit || stock ? 'Para ~' + fireLeft(b) : 'Vacía: échale leña'], ['Gasto', '×' + fireRate(b).toFixed(1).replace('.', ',') + (fireRate(b) > 1 ? ' (más intensidad)' : '')]];
}; }
// Lo que dice el objeto: cuánto arde en una hoguera
{ const c0 = itemCardHTML; itemCardHTML = (id, have) => c0(id, have).replace(/(<small>Combustible<\/small><b>)[^<]*(<\/b>)/, `$1${FUEL[id] ? FUEL[id] + ' min de hoguera' : ''}$2`); }
// Tiempo de combustible legible (min:s), y en las hogueras, lo que queda con lo que tiene dentro
function fmtFuelT(b) { if (isFire(b)) return 'para ~' + fireLeft(b); const t = Math.ceil(b.fuel); return t >= 60 ? Math.floor(t / 60) + ' min ' + String(t % 60).padStart(2, '0') + ' s' : t + ' s'; }
// Con el panel de un bloque abierto, las ranuras vuelven a su tamaño para dejarle sitio
{ const b0 = buildInvPanel; buildInvPanel = (...a) => { b0(...a); const m = document.getElementById('mInv'); if (m) m.classList.toggle('blk', !!ui.panel); }; }
