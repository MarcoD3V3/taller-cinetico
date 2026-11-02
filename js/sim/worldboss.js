'use strict';
// =====================================================================================
//  Jefes de mundo: los Colosos.
//  · Cada 6 días (desde el día 6) aparece un Coloso, un jefe gigante, a 70-110 casillas del
//    anfitrión. Se avisa a todos los jugadores, sale en el mapa (M) y una flecha arriba indica
//    hacia dónde está. Si nadie lo vence en 2 días, se marcha.
//  · Duerme hasta que el anfitrión se acerca (es quien mueve a los enemigos). Despierto es
//    enorme: el triple de vida (y la mitad más por cada jugador conectado) y pega más fuerte.
//    Si te alejas, vuelve a dormirse con la vida que le quedaba.
//  · Al caer, la recompensa es para TODOS los jugadores conectados, estén donde estén.
//  · /coloso (truco) llama a uno ya.
// =====================================================================================
const WB = { hudSig: '', guest: null };
const wbEmit = d => { if (typeof netEmit !== 'function' || !inGame()) return; if (NET.kind === 'claude') netEmit('mob', { t: 'wb', ...d }); else netEmit('wb', d); };
const wbCur = () => (S && S.wb) || WB.guest;
const wbDay = () => Math.floor(S.time / (S.gen.dayLen || DAY_LEN)) + 1;
function wbStart(force) {
  if (!S || isGuest() || S.wb) return false; const p = S.player;
  const ks = Object.keys(BOSSES).filter(k => (BOSSES[k].tier || 0) <= (S.tier || 0) + 1 && !BOSSES[k].water && !BOSSES[k].sea && !(typeof ASC !== 'undefined' && ASC[k] && ASC[k].env === 'mar')); if (!ks.length) return false;
  const k = ks[(Math.random() * ks.length) | 0]; let spot = null;
  for (let i = 0; i < 40 && !spot; i++) { const a = Math.random() * 6.28, d = 70 + Math.random() * 40, tx = Math.floor(p.x / T + Math.cos(a) * d), ty = Math.floor(p.y / T + Math.sin(a) * d); getChunk(tx >> CSH, ty >> CSH); const x = (tx + 0.5) * T, y = (ty + 0.5) * T; if (passable(x, y) && !BIOMES[biomeOf(tx, ty)].ocean) spot = [tx, ty]; }
  if (!spot) return false;
  S.wb = { id: Math.random().toString(36).slice(2, 8), k, x: spot[0], y: spot[1], n: 'Coloso: ' + BOSSES[k].n, st: 'wait', hpF: 1, until: S.time + 2 * (S.gen.dayLen || DAY_LEN) };
  if (S.marks) { S.marks = S.marks.filter(m => !m.wb); S.marks.push({ x: spot[0], y: spot[1], n: '☠ ' + S.wb.n, wb: 1 }); }
  wbAnnounce(S.wb); wbEmit({ a: 'spawn', wb: S.wb }); return true;
}
function wbAnnounce(w) {
  const p = S.player, dx = w.x - p.x / T, dy = w.y - p.y / T, dir = typeof xtrDir === 'function' ? xtrDir(dx, dy) : '';
  wvBanner(`☠ ¡Ha aparecido un jefe de mundo!`, `${w.n}, a unas ${Math.round(Math.hypot(dx, dy))} casillas al ${dir}. Está en el mapa (M). La recompensa es para todos.`, '#ff6b5b', 6);
  bossRoar(); if (typeof sysMsg === 'function') sysMsg(`☠ Jefe de mundo: ${w.n}, al ${dir} (sale en el mapa). Si cae, todos los jugadores reciben premio.`);
}
function wbTick(dt) {
  const w = S.wb;
  if (!isGuest() && !w && wbDay() >= 6 && wbDay() % 6 === 0 && S.wbDay !== wbDay()) { S.wbDay = wbDay(); wbStart(); }
  wbHud(); if (!w || isGuest()) return;
  const cx = (w.x + 0.5) * T, cy = (w.y + 0.5) * T, p = S.player, d = Math.hypot(cx - p.x, cy - p.y) / T;
  if (w.st === 'wait' && S.time > w.until) { wbEnd(false); return; }
  if (w.st === 'wait' && d < 35 && !BOSS) { w.st = 'coming'; w.t = 0; summonBoss(w.k, true, { x: cx, y: cy }); return; }
  if (w.st === 'coming') { w.t += dt;
    if (BOSS && FOES.includes(BOSS) && !BOSS.wb && Math.hypot(BOSS.x - cx, BOSS.y - cy) < 12 * T) { const f = BOSS, n = typeof NET !== 'undefined' && NET.peers ? NET.peers.size : 0;
      f.wb = w.id; f.sz = 1.55; f.D = { ...f.D, n: w.n, dmg: f.D.dmg * 1.3, s: Math.round(f.D.s * 1.3) }; f.mhp = Math.round(f.mhp * (3 + 1.5 * n)); f.hp = Math.max(1, Math.round(f.mhp * w.hpF)); w.st = 'awake';
      if (typeof buildBossBar === 'function') buildBossBar(); shake = Math.max(shake || 0, 0.8); screenFlash('#ff3a2a', 0.25); wvBanner(`☠ ${w.n}`, 'JEFE DE MUNDO', '#ff6b5b', 3); }
    else if (w.t > 6) w.st = 'wait'; return; }
  if (w.st === 'awake') { const f = FOES.find(o => o.wb === w.id); if (f) { w.hpF = Math.max(0.05, f.hp / f.mhp); return; } if (!w.dead) { w.st = 'wait'; toast(`${w.n} vuelve a dormirse. Sigue en el mapa.`); } }
}
// Al caer: premio para todos
{ const b0 = bossDefeated; bossDefeated = (f, loot) => { b0(f, loot); const w = S && S.wb; if (w && f.wb === w.id) { w.dead = 1; const rw = wbReward(); wbEmit({ a: 'dead', id: w.id, n: w.n, rw }); wbGive(w.n, rw); wbEnd(true); } }; }
function wbReward() {
  const t = S.tier || 0, rw = [['coin', 250 + t * 120]], gear = Object.keys(ITEMS).filter(id => ITEMS[id].weapon && typeof TR !== 'undefined' && TR[id] && (TR[id].r || 0) >= 3 && (TR[id].r || 0) <= 5);
  for (let i = 0; i < 2 && gear.length; i++) rw.push([gear[(Math.random() * gear.length) | 0], 1]);
  for (const [id, n] of [['colossusHeart', 1], ['tPotHeal4', 3], ['manaCrystal', 3], ['goldIngot', 4], ['starShard', 2]]) if (ITEMS[id]) rw.push([id, n]);
  return rw;
}
function wbGive(n, rw) { for (const [id, k] of rw) if (ITEMS[id]) invGive(id, k); invVersion++; wvBanner(`🏆 ¡${n} ha caído!`, 'Premio para todos: ' + rw.map(([id, k]) => k + ' ' + ITEMS[id].n).join(', '), '#ffd34a', 6); sparkRing(S.player.x, S.player.y, 60, '#ffd34a', 200, { up: 60, life: 1 }); }
function wbEnd(win) { const w = S.wb; if (!w) return; S.wb = null; if (S.marks) S.marks = S.marks.filter(m => !m.wb); if (!win) { toast(`☠ ${w.n} se ha marchado sin que nadie lo venciera.`, true); wbEmit({ a: 'gone' }); } }
// En línea: los invitados se enteran de todo y reciben su premio
{ const w0 = wireGame; wireGame = r => { w0(r); const on = m => { if (m.sameTab || !m.data || !S) return; const d = m.data;
  if (d.a === 'spawn' && d.wb) { WB.guest = d.wb; if (S.marks) { S.marks = S.marks.filter(x => !x.wb); S.marks.push({ x: d.wb.x, y: d.wb.y, n: '☠ ' + d.wb.n, wb: 1 }); } wbAnnounce(d.wb); }
  else if (d.a === 'dead') { WB.guest = null; if (S.marks) S.marks = S.marks.filter(x => !x.wb); if (Array.isArray(d.rw)) wbGive(String(d.n || 'El Coloso').slice(0, 60), d.rw.filter(x => Array.isArray(x) && ITEMS[x[0]] && x[1] > 0 && x[1] <= 2000)); }
  else if (d.a === 'gone') { WB.guest = null; if (S.marks) S.marks = S.marks.filter(x => !x.wb); } };
  r.on('wb', on); r.on('mob', m => { if (m.data && m.data.t === 'wb') on(m); }); }; }
// ---------- Flecha arriba: hacia dónde está ----------
function wbHud() {
  let e = $('wbHud'); if (!e) { e = document.createElement('div'); e.id = 'wbHud'; document.body.appendChild(e); }
  const w = wbCur(), show = !!w && !ui.open && !(typeof inDungeon === 'function' && inDungeon()); if (e.hidden === show) e.hidden = !show; if (!show) return;
  const p = S.player, dx = w.x - p.x / T, dy = w.y - p.y / T, d = Math.round(Math.hypot(dx, dy)), a = Math.atan2(dy, dx) * 180 / Math.PI, st = w.st === 'awake' ? '¡despierto!' : d < 35 ? 'despertando…' : `${d} casillas`;
  const sig = [w.id, Math.round(a / 5), st].join('|'); if (WB.hudSig === sig) return; WB.hudSig = sig;
  e.innerHTML = `<span class="wbar" style="transform:rotate(${a.toFixed(0)}deg)">➜</span><div><b>☠ ${esc(w.n)}</b><small>Jefe de mundo · ${st}</small></div>`;
}
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); if (S) wbTick(fdt); }; }
cmd('coloso', { a: ['jefemundo', 'worldboss'], u: '/coloso', d: 'Hace aparecer un jefe de mundo (Coloso).', cheat: 1, run() { if (isGuest()) return errMsg('Solo el anfitrión'); if (S.wb) return errMsg('Ya hay un Coloso: ' + S.wb.n); if (!wbStart(true)) errMsg('No encontré sitio para él: muévete un poco y vuelve a probar.'); } });
