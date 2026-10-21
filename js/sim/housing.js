'use strict';
// =====================================================================================
//  Casas y NPC. Una casa válida es una habitación cerrada por paredes con una puerta,
//  suelo construido (tablones, empedrado o ladrillo), luz, mesa, silla y cama.
//  El bloque de trabajo que haya dentro decide qué NPC viene a vivir (ver NPCS).
// =====================================================================================
const BUILT_FLOOR = () => new Set([G.PLANKFLOOR, G.COBBLE, G.BRICKFLOOR]);
const isWall = b => b && (BD[b.type].solid || BD[b.type].door);
// Rellena la habitación desde una casilla. Devuelve null si se escapa (no está cerrada).
function floodRoom(sx, sy, max = 160) {
  const seen = new Set([sx + ',' + sy]), q = [[sx, sy]], tiles = [];
  while (q.length) {
    const [x, y] = q.pop(); tiles.push([x, y]); if (tiles.length > max) return null;
    for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d], k = nx + ',' + ny; if (seen.has(k)) continue; seen.add(k); if (isWall(at(nx, ny)) || GI[gnd(nx, ny)].solid) continue; if (!walkable(gnd(nx, ny))) return null; q.push([nx, ny]); }
  }
  return tiles;
}
function checkHouse(door, quiet) {
  let room = null;
  for (let d = 0; d < 4 && !room; d++) { const x = door.x + DX[d], y = door.y + DY[d]; if (!isWall(at(x, y)) && walkable(gnd(x, y))) room = floodRoom(x, y); }
  const res = { ok: false, miss: [], room, npc: null, decor: 0 };
  if (!room) { res.miss.push('Habitación cerrada con paredes (máx. 160 casillas)'); return res; }
  if (room.length < 12) res.miss.push('Más espacio (mínimo 12 casillas)');
  const fl = BUILT_FLOOR(), types = new Set();
  let bare = 0; for (const [x, y] of room) { if (!fl.has(gnd(x, y))) bare++; const b = at(x, y); if (b) { types.add(b.type); if (b.type === 'rug' || b.type === 'painting' || b.type === 'flowerPot' || BD[b.type].decor) res.decor += typeof trFx === 'function' ? trFx(b, 'decor', 1) : 1; } }
  if (bare) res.miss.push(`Suelo construido en todas las casillas (faltan ${bare}): tablones, empedrado o ladrillo`);
  if (!types.has('table')) res.miss.push('Una mesa');
  if (!types.has('chair')) res.miss.push('Una silla');
  if (!types.has('bed')) res.miss.push('Una cama');
  if (![...types].some(t => BD[t].light)) res.miss.push('Una luz (antorcha, farol, hoguera…)');
  const taken = new Set((S.npcs || []).filter(n => !(n.door.x === door.x && n.door.y === door.y)).map(n => n.type));
  for (const k in NPCS) if (types.has(NPCS[k].need) && !taken.has(k)) { res.npc = k; break; }
  if (!res.npc) res.miss.push('Un bloque de trabajo que atraiga a alguien: ' + Object.values(NPCS).filter(n => !taken.has(n)).map(n => BD[n.need].n.toLowerCase()).filter((v, i, a) => a.indexOf(v) === i).join(', '));
  res.ok = !res.miss.length; return res;
}
function doorCheck(door) {
  const r = checkHouse(door), cur = (S.npcs || []).find(n => n.door.x === door.x && n.door.y === door.y);
  if (cur) { toast(r.room && !r.miss.filter(m => !m.startsWith('Un bloque')).length ? `Aquí vive ${NPCS[cur.type].n}. La casa está bien.` : 'A esta casa le falta: ' + r.miss.join(' · ')); return; }
  if (!r.ok) { toast('Casa no válida. Falta: ' + r.miss.join(' · ')); return; }
  const N = NPCS[r.npc], [x, y] = r.room[(Math.random() * r.room.length) | 0];
  (S.npcs || (S.npcs = [])).push({ type: r.npc, door: { x: door.x, y: door.y }, x: (x + 0.5) * T, y: (y + 0.5) * T, decor: r.decor });
  _rooms.delete(door.x + ',' + door.y);
  toast(`🏠 ¡${N.n} se ha mudado a tu casa! Pulsa F sobre ${N.n.endsWith('a') ? 'ella' : 'él'} para comerciar.`, true);
}
// Habitaciones en memoria (se recalculan de vez en cuando)
const _rooms = new Map();
function roomOf(n) { const k = n.door.x + ',' + n.door.y; let r = _rooms.get(k); if (!r) { const c = checkHouse(n.door); r = { tiles: c.room || [], ok: c.ok || (c.room && c.miss.every(m => m.startsWith('Un bloque'))), set: new Set((c.room || []).map(([x, y]) => x + ',' + y)), decor: c.decor }; _rooms.set(k, r); } return r; }
function houseAt(tx, ty) { for (const n of S.npcs || []) { const r = _rooms.get(n.door.x + ',' + n.door.y); if (r && r.set.has(tx + ',' + ty)) return n; } return null; }
let _houseT = 0;
function npcTick(dt) {
  if (!S.npcs || !S.npcs.length) return;
  _houseT -= dt; if (_houseT <= 0) { _houseT = 15; _rooms.clear(); }
  for (let i = S.npcs.length - 1; i >= 0; i--) {
    const n = S.npcs[i]; if (Math.abs(n.door.x * T - S.player.x) > 80 * T || Math.abs(n.door.y * T - S.player.y) > 80 * T) continue;
    const r = roomOf(n);
    if (!r.ok) { toast(`${NPCS[n.type].n} se ha ido: su casa ya no es válida`, true); S.npcs.splice(i, 1); continue; }
    n.decor = r.decor;
    n.t = (n.t || 0) - dt;
    if (n.t <= 0) { n.t = 2 + Math.random() * 4; const [x, y] = r.tiles[(Math.random() * r.tiles.length) | 0]; if (!at(x, y)) { n.tx = (x + 0.5) * T; n.ty = (y + 0.5) * T; } }
    if (n.tx !== undefined) { const d = dist(n.x, n.y, n.tx, n.ty); if (d > 2) { n.x += (n.tx - n.x) / d * 1.6 * T * dt; n.y += (n.ty - n.y) / d * 1.6 * T * dt; n.face = n.tx > n.x ? 1 : -1; n.ph = (n.ph || 0) + dt * 8; } }
    // La guardia defiende su casa
    if (NPCS[n.type].guard) { n.cd = (n.cd || 0) - dt; const f = nearestFoe(n.x, n.y, 9 * T); if (f && n.cd <= 0) { n.cd = 1; const a = Math.atan2(f.y - n.y, f.x - n.x); PROJ.push({ x: n.x, y: n.y, vx: Math.cos(a) * 22 * T, vy: Math.sin(a) * 22 * T, r: 4, dmg: 10, c: '#e8e0c8', team: 'p', life: 1.2, arrow: 0, hit: new Set() }); } }
  }
}
function npcAt(wx, wy) { for (const n of S.npcs || []) if (dist(n.x, n.y, wx, wy) < 14) return n; return null; }
// ---------- Comercio ----------
let _tradeNpc = null;
const priceOf = (n, give) => { const f = Math.max(0.6, (1 - 0.05 * Math.min(6, n.decor || 0)) * CM().price); const o = {}; for (const k in give) o[k] = k === 'coin' ? Math.max(1, Math.ceil(give[k] * f)) : give[k]; return o; };
function openTrade(n) {
  _tradeNpc = n; openModal('trade'); renderTrade();
}
function renderTrade() {
  const n = _tradeNpc, N = NPCS[n.type];
  let h = `<header><h2>${esc(N.n)}</h2><div class="row gap"><span class="chip">${itemImg('coin', 14)} ${invCount('coin')}</span><button data-close>Cerrar <kbd>Esc</kbd></button></div></header>`;
  if (n.decor) h += `<p class="mut small">Tu casa está decorada: precios un ${Math.round(Math.min(30, n.decor * 5))} % más baratos.</p>`;
  h += `<div class="trades">`;
  N.offers.forEach(([give, get], i) => {
    const g = priceOf(n, give), ok = Object.keys(g).every(k => invCount(k) >= g[k]);
    h += `<button class="trade ${ok ? '' : 'no'}" data-trade="${i}"><span class="side">${Object.keys(g).map(k => `<span class="ib" data-id="${k}">${itemImg(k, 24)}<span class="q">${g[k]}</span></span>`).join('')}</span><span class="mut">→</span><span class="side">${Object.keys(get).map(k => `<span class="ib" data-id="${k}">${itemImg(k, 24)}<span class="q">${get[k]}</span></span>`).join('')}</span></button>`;
  });
  if (N.heal) h += `<button class="trade" data-trade="heal"><span class="side"><span class="ib">${itemImg('coin', 24)}<span class="q">10</span></span></span><span class="mut">→</span><span>✚ Curar todas tus heridas</span></button>`;
  $('tradeBody').innerHTML = h + `</div>`;
}
$('mTrade').addEventListener('click', e => {
  const b = e.target.closest('[data-trade]'); if (!b || !_tradeNpc) return;
  const N = NPCS[_tradeNpc.type];
  if (b.dataset.trade === 'heal') { if (invCount('coin') < 10) { toastErr('Te faltan monedas'); return; } invTake('coin', 10); const pc = pcInit(); for (const p of PARTS) pc.parts[p] = []; pc.hp = maxHp(); pc.poison = 0; toast('La médica te ha curado'); renderTrade(); return; }
  const [give, get] = N.offers[+b.dataset.trade], g = priceOf(_tradeNpc, give);
  if (!Object.keys(g).every(k => invCount(k) >= g[k])) { toastErr('No tienes lo que pide'); return; }
  for (const k in g) invTake(k, g[k]); for (const k in get) invAdd(k, get[k]);
  sfx('beep'); renderTrade();
});
