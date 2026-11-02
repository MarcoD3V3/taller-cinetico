'use strict';
// =====================================================================================
//  Asedios a la base (datos en data/siege.js).
//  · Desde que el Núcleo llega al nivel 5, cada 6 noches un ejército asedia tu base: la zona alrededor del Núcleo.
//    Al atardecer hay aviso. Si esa noche estás lejos de tu base, el asedio espera a que vuelvas.
//  · 3 oleadas desde varias direcciones (cada asedio, más fuerte): saqueadores, arqueros que
//    disparan a tus bloques, arietes que derriban muros, zapadores que explotan contra ellos,
//    chamanes que invocan y, en la última, el Señor de la Guerra.
//  · Van a por tu base: golpean el muro o la máquina que tengan más cerca (o a ti, si te pones
//    delante). Cada bloque aguanta según su material; el que se rompe cae al suelo como objeto
//    (con lo que llevase dentro), no se pierde. Si el Núcleo llega a 0, el asedio te vence.
//  · Defensas: muros (el Muro reforzado aguanta muchísimo), pinchos, torretas y la Balista
//    (barata y sin energía). Rechazar el asedio da un buen premio y el Estandarte de la victoria.
//  · En multijugador lo dirige el anfitrión. /asedio (truco) lo empieza ya.
// =====================================================================================
const SG = { on: false, id: 0, wave: 0, st: 'off', quota: [], pend: [], hits: [], t: 0, rest: 0, burst: 0, bhp: new Map(), cands: [], candT: 0, base: null, pts: [], lvl: 1, broken: 0, hud: '' };
const sgCore = () => blocks.find(b => b.type === 'core');
function sgBase() { const c = sgCore(); if (!c) return null; let r = 8; for (const b of blocks) { const d = Math.hypot(b.x - c.x, b.y - c.y); if (d < 45 && d > r) r = d; } return { x: c.x, y: c.y, r: Math.min(45, r) }; }
const sgMax = b => { if (!b || !BD[b.type]) return 0; if (SG_HP[b.type] !== undefined) return SG_HP[b.type]; const d = BD[b.type]; if (d.walk) return 0; return /wall|brick|block|pillar|stone/i.test(b.type) ? 160 : 100; };
const sgKey = b => b.x + ',' + b.y;
const sgHpOf = b => SG.bhp.has(sgKey(b)) ? SG.bhp.get(sgKey(b)) : sgMax(b);
const sgNear = () => { const B = SG.base || sgBase(); return B && Math.hypot(S.player.x / T - B.x, S.player.y / T - B.y) < B.r + 40; };
// ---------- Golpear y romper bloques ----------
function sgHitBlock(b, dmg) {
  if (!b || !blocks.includes(b)) return; const mx = sgMax(b); if (!mx) return; const v = sgHpOf(b) - dmg, cx = (b.x + 0.5) * T, cy = (b.y + 0.5) * T;
  fxAdd({ x: cx + (Math.random() - 0.5) * 20, y: cy - 6, vx: (Math.random() - 0.5) * 60, vy: -40, life: 0.4, t: 0, size: 2, col: 'rgba(200,190,170,.8)', grav: 200, drag: 1 }); if (Math.random() < 0.3) tone(140 + Math.random() * 60, 0.05, 'square', 0.03, 0.6);
  if (b.type === 'core') { SG.bhp.set(sgKey(b), Math.max(0, v)); if (v <= 0) sgEnd(false); return; }
  if (v > 0) { SG.bhp.set(sgKey(b), v); return; }
  SG.bhp.delete(sgKey(b)); sgBreak(b);
}
function sgBreak(b) {
  const back = [[b.type, 1]]; for (const o of [b.inv, b.out]) if (o) for (const k in o) back.push([k, o[k]]);
  if (b.slots) for (const s of b.slots) if (s) back.push([s.id, s.n]); if (b.items) for (const it of b.items) back.push([it.id, 1]); if (b.buf) back.push([b.buf, 1]); if (b.item) back.push([b.item.id, b.item.n]);
  const cx = (b.x + 0.5) * T, cy = (b.y + 0.5) * T; if (ui.panel === b) closeModal(); delBlock(b);
  for (const [id, n] of back) if (ITEMS[id] && n > 0) { const a = Math.random() * 6.28; giSpawn(id, n, cx, cy, Math.cos(a) * 50, Math.sin(a) * 50, false); }
  burst(b.x, b.y, BD[b.type] && BD[b.type].look ? BD[b.type].look.c : '#9a9a9a'); noise(0.25, 0.06, 500); SG.broken++;
}
function sgCands() { if ((SG.candT -= 1) > 0 && SG.cands.length) return SG.cands; SG.candT = 90; const B = SG.base; SG.cands = B ? blocks.filter(b => sgMax(b) > 0 && Math.hypot(b.x - B.x, b.y - B.y) < B.r + 4) : []; return SG.cands; }
function sgPick(f) {
  if (f._sgB && blocks.includes(f._sgB) && (f._sgT = (f._sgT || 0) - 1) > 0) return f._sgB;
  f._sgT = 50; let best = null, bd = 1e9; const fx = f.x / T, fy = f.y / T;
  for (const b of sgCands()) { if (!blocks.includes(b)) continue; const d = Math.hypot(b.x + 0.5 - fx, b.y + 0.5 - fy) - (b.type === 'core' ? 4 : 0); if (d < bd) { bd = d; best = b; } }
  return f._sgB = best;
}
// Los del asedio van a por la base (los arietes y zapadores, siempre; los demás, a ti si te pones delante)
{ const t0 = foeTarget; foeTarget = f => { const r = t0(f); if (!f.siege || !SG.on || f.siege !== SG.id) return r; if ((f.D.sg || 1) < 5 && r.tgt === 'player' && r.td < 6 * T) { f._sgB = null; return r; }
  const b = sgPick(f); if (!b) return r; const x = (b.x + 0.5) * T, y = (b.y + 0.5) * T; return { tx: x, ty: y, td: dist(f.x, f.y, x, y), tgt: { sgB: b, hp: 1, x, y } }; }; }
{ const c0 = contactHit; contactHit = (f, tgt, mult) => { if (tgt && tgt.sgB) { sgHitBlock(tgt.sgB, f.D.dmg * mult * (f.D.sg || 1) * scaleDmg()); return; } return c0(f, tgt, mult); }; }
// Los arqueros y chamanes disparan a tus bloques
{ const s0 = shootAt; shootAt = (f, tx, ty, pr, el) => { s0(f, tx, ty, pr, el); if (f.siege && f._sgB && SG.on) { const d = dist(f.x, f.y, tx, ty); SG.hits.push({ b: f._sgB, dmg: (pr.dmg || 8) * (f.D.sg || 1), t: d / (pr.spd * T) }); } }; }
// Las explosiones (zapadores) rompen lo que pillan
{ const e0 = explode; explode = (x, y, r, dmg, team, el) => { e0(x, y, r, dmg, team, el); if (SG.on && team === 'e') for (const b of sgCands().slice()) if (Math.hypot((b.x + 0.5) * T - x, (b.y + 0.5) * T - y) < r + 16) sgHitBlock(b, dmg * 3); }; }
// Mientras dura, no aparece nada más por su cuenta cerca de la base
{ const s0 = spawnTick; spawnTick = dt => { if (SG.on && sgNear()) return; s0(dt); }; }

// ---------- Empezar, oleadas y final ----------
const SG_DIR = ['el este', 'el sureste', 'el sur', 'el suroeste', 'el oeste', 'el noroeste', 'el norte', 'el noreste'];
function sgStart(force) {
  if (SG.on || !S || isGuest()) return false; const B = sgBase(); if (!B) { if (force) toastErr('Necesitas un Núcleo: el asedio va contra la base que lo rodea'); return false; }
  if (!force && !sgNear()) return false;
  S.sgN = (S.sgN || 0) + 1; Object.assign(SG, { on: true, id: Math.random(), wave: 0, st: 'intro', rest: 6, quota: [], pend: [], hits: [], t: 0, base: B, lvl: S.sgN + Math.max(0, (S.tier || 0) - 4), broken: 0, cands: [], candT: 0 });
  SG.bhp.clear(); wvBanner('⚔ ¡ASEDIO A TU BASE!', `Asedio n.º ${S.sgN}: 3 oleadas van a por tu Núcleo. Defiende tus muros y máquinas.`, '#ff6b5b', 5); bossRoar(); if (typeof sysMsg === 'function') sysMsg('⚔ ¡Asedio! Un ejército ataca la base del Núcleo.');
  return true;
}
function sgWave(i) {
  const L = SG.lvl, q = [], add = (k, n) => { for (let j = 0; j < n; j++) q.push(k); };
  add('sgRaider', 5 + 2 * L + i * 2); add('sgArcher', 1 + L + i); if (L >= 2 || i >= 1) add('sgRam', 1 + (i >> 1) + (L >> 2)); if (i >= 1) add('sgSapper', 1 + (L >> 1)); if (i >= 1) add('sgShaman', 1 + (i >> 1));
  const merc = Object.keys(ENEMIES).filter(k => !/[A-Z]/.test(k) && (ENEMIES[k].tier || 0) <= (S.tier || 0) + 1 && ENEMIES[k].ai === 'melee' && !ENEMIES[k].night); for (let j = 0; j < 2 + L + i; j++) if (merc.length) q.push(merc[(Math.random() * merc.length) | 0]);
  if (i === 2) add('sgWarlord', 1 + Math.floor(L / 4));
  for (let j = q.length - 1; j > 0; j--) { const r = (Math.random() * (j + 1)) | 0; [q[j], q[r]] = [q[r], q[j]]; }
  if (i === 2) { const w = q.filter(k => k === 'sgWarlord'); const rest = q.filter(k => k !== 'sgWarlord'); q.length = 0; q.push(...rest, ...w); } // el Señor de la Guerra, al final
  // Por dónde vienen: 2 o 3 direcciones
  const B = SG.base, n = i === 0 ? 2 : 3, a0 = Math.random() * 6.28; SG.pts = [];
  for (let k = 0; k < n; k++) { const a = a0 + k * (6.28 / n) + (Math.random() - 0.5) * 0.5; for (let tries = 0; tries < 12; tries++) { const d = B.r + 14 + tries, tx = Math.floor(B.x + Math.cos(a) * d), ty = Math.floor(B.y + Math.sin(a) * d); getChunk(tx >> CSH, ty >> CSH); const x = (tx + 0.5) * T, y = (ty + 0.5) * T; if (passable(x, y)) { SG.pts.push({ x, y, a }); break; } } }
  if (!SG.pts.length) SG.pts.push({ x: (B.x + B.r + 10) * T, y: B.y * T, a: 0 });
  SG.quota = q; SG.wave = i; SG.st = 'fight'; SG.burst = 0; SG.total = q.length;
  const dirs = [...new Set(SG.pts.map(p => SG_DIR[((Math.round(p.a / (Math.PI / 4)) % 8) + 8) % 8]))];
  wvBanner(`⚔ Oleada ${i + 1} de 3`, `Vienen por ${dirs.join(' y por ')}${i === 2 ? '. ¡Con el Señor de la Guerra!' : ''}`, '#ff8a5a', 3.5); tone(110, 0.8, 'sawtooth', 0.07, 0.6);
}
function sgSpawnBurst() {
  const mul = 1 + 0.22 * (SG.lvl - 1), n = Math.min(SG.quota.length, 3 + (SG.lvl >> 1));
  for (let j = 0; j < n; j++) { const k = SG.quota.shift(), p = SG.pts[(Math.random() * SG.pts.length) | 0], x = p.x + (Math.random() - 0.5) * 3 * T, y = p.y + (Math.random() - 0.5) * 3 * T;
    if (!ENEMIES[k]) continue; const f = spawnFoe(k, passable(x, y) ? x : p.x, passable(x, y) ? y : p.y, { siege: SG.id, ag: 1, minion: 1 }); f.mhp = f.hp = Math.round(f.hp * mul); sparkRing(f.x, f.y, 10, '#ff8a5a', 70, { life: 0.4 });
    if (k === 'sgWarlord') { wvBanner('☠ ¡El Señor de la Guerra!', 'Si cae, el asedio termina', '#ffd34a', 3); bossRoar(); shake = Math.max(shake || 0, 0.6); } }
}
const sgAlive = () => FOES.filter(f => f.siege === SG.id);
function sgEnd(win) {
  if (!SG.on) return; const n = SG.lvl; SG.on = false; SG.st = 'off';
  for (const f of FOES.slice()) if (f.siege) { sparkRing(f.x, f.y, 8, '#aaa', 60, { life: 0.4 }); FOES.splice(FOES.indexOf(f), 1); }
  SG.bhp.clear(); // lo que aguantó se repara
  if (win) { const got = [['coin', 80 + 50 * n], ['siegeBanner', 1], [MF.iron.ingot || 'ironIngot', 4 + n], ['tPotHeal2', 2]];
    const gear = Object.keys(ITEMS).filter(id => ITEMS[id].weapon && typeof TR !== 'undefined' && TR[id] && (TR[id].r || 0) >= 2 && (TR[id].r || 0) <= 2 + (n >> 1)); if (gear.length && Math.random() < 0.5) got.push([gear[(Math.random() * gear.length) | 0], 1]);
    for (const [id, k] of got) if (ITEMS[id]) invGive(id, k); invVersion++; S.sgWon = (S.sgWon || 0) + 1;
    wvBanner('🏆 ¡Asedio rechazado!', `Tu base resiste. Premio: ${got.filter(([id]) => ITEMS[id]).map(([id, k]) => k + ' ' + ITEMS[id].n).join(', ')}${SG.broken ? ` · ${SG.broken} bloques rotos (están en el suelo)` : ''}`, '#ffd34a', 6); }
  else wvBanner('💀 El asedio ha llegado a tu Núcleo', `Los atacantes se retiran con el botín… ${SG.broken ? SG.broken + ' bloques rotos (están en el suelo). ' : ''}Refuerza tus defensas para la próxima.`, '#ff6b5b', 6);
}
function sgTick(dt) {
  if (isGuest() || !survOn() || (typeof enemiesOn === 'function' && !enemiesOn())) return;
  // Calendario: cada 6 noches desde la 4.ª, con aviso al atardecer
  const ni = nightIndex(), night = daylight() < 0.3, SG_TIER = 4; // nivel 5 del Núcleo (en pantalla: nivel = tier + 1)
  if ((S.tier || 0) >= SG_TIER && S.sgNext === undefined && sgCore()) { S.sgNext = ni + 2; wvBanner('⚔ Tu base ya llama la atención', 'Con el Núcleo en nivel 5 empiezan los asedios: dentro de 2 noches llega el primero (y luego, cada 6). Prepara muros, pinchos y balistas.', '#ff8a5a', 6); }
  const up = night ? ni : ni + 1; if (S.sgNext !== undefined && !night && daylight() < 0.5 && up === S.sgNext && S.sgWarn !== up && sgCore()) { S.sgWarn = up; wvBanner('⚠ Esta noche asedian tu base', 'Refuerza los muros, pon pinchos y balistas, y quédate cerca del Núcleo.', '#ff8a5a', 5); }
  if (!SG.on && S.sgNext !== undefined && night && ni >= S.sgNext && !(typeof inDungeon === 'function' && inDungeon()) && !(typeof inArena === 'function' && inArena())) { if (sgStart(false)) S.sgNext = ni + 6; }
  // Balistas
  for (const b of L.siegeBallista || []) { if (!runnable(b)) continue; b.tcd = (b.tcd || 0) - dt; if (b.tcd > 0) continue; const cx = b.x * T + 16, cy = b.y * T + 16, f = nearestFoe(cx, cy, 8 * T); if (!f) continue;
    b.tcd = 1.1; b.aim = Math.atan2(f.y - cy, f.x - cx); PROJ.push({ x: cx, y: cy, vx: Math.cos(b.aim) * 24 * T, vy: Math.sin(b.aim) * 24 * T, r: 4, dmg: 12 + (S.tier || 0) * 3, c: '#e8d8b0', team: 'p', life: 0.7, arrow: 1, hit: new Set() }); tone(380, 0.05, 'square', 0.025, 0.6); }
  if (!SG.on) return; SG.t += dt;
  for (let i = SG.hits.length - 1; i >= 0; i--) { const h = SG.hits[i]; if ((h.t -= dt) > 0) continue; SG.hits.splice(i, 1); sgHitBlock(h.b, h.dmg); }
  if (SG.st === 'intro' || SG.st === 'rest') { if ((SG.rest -= dt) <= 0) sgWave(SG.st === 'intro' ? 0 : SG.wave + 1); return; }
  if (SG.st !== 'fight') return;
  if (SG.quota.length && (SG.burst -= dt) <= 0 && sgAlive().length < 26 + SG.lvl * 2) { SG.burst = 2.6; sgSpawnBurst(); }
  if (!SG.quota.length && !sgAlive().length) { if (SG.wave >= 2) sgEnd(true); else { SG.st = 'rest'; SG.rest = 18; wvBanner(`✔ Oleada ${SG.wave + 1} rechazada`, 'Siguiente en 18 s: repara o refuerza lo que puedas', '#7fd07a', 3); } }
}
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); if (S) { sgTick(fdt); sgHud(); } }; }
{ const e0 = enterWorld; enterWorld = () => { SG.on = false; SG.st = 'off'; SG.bhp.clear(); return e0(); }; }
// ---------- Dibujo: grietas en lo dañado ----------
{ const d0 = drawCombat; drawCombat = (ctx, k, ox, oy, x0, y0, x1, y1) => { if (S && SG.bhp.size) { ctx.save(); ctx.strokeStyle = 'rgba(20,14,12,.85)'; ctx.lineWidth = 1.4;
  for (const [key, hp] of SG.bhp) { const [bx, by] = key.split(',').map(Number), b = at(bx, by); if (!b) continue; const mx = sgMax(b), f = 1 - hp / mx; if (f <= 0.02 || Math.abs(bx * T - view.x) > 30 * T || Math.abs(by * T - view.y) > 20 * T) continue;
    const X = bx * T, Y = by * T, n = 1 + Math.floor(f * 6); ctx.beginPath(); for (let i = 0; i < n; i++) { const a = i * 2.3 + bx, r1 = 3, r2 = 6 + f * 10; ctx.moveTo(X + 16 + Math.cos(a) * r1, Y + 16 + Math.sin(a) * r1); ctx.lineTo(X + 16 + Math.cos(a + 0.4) * r2, Y + 16 + Math.sin(a + 0.4) * r2); } ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(X + 4, Y - 4, 24, 3); ctx.fillStyle = b.type === 'core' ? '#ff6b5b' : f > 0.6 ? '#e05050' : '#e0b54c'; ctx.fillRect(X + 4, Y - 4, 24 * (1 - f), 3); }
  ctx.restore(); } return d0(ctx, k, ox, oy, x0, y0, x1, y1); }; }
// ---------- Marcador ----------
function sgHud() {
  let e = $('sgHud'); if (!e) { e = document.createElement('div'); e.id = 'sgHud'; document.body.appendChild(e); }
  const show = SG.on && !ui.open; if (e.hidden === show) e.hidden = !show; if (!show) return;
  const core = sgCore(), ch = core ? sgHpOf(core) / sgMax(core) : 1, alive = sgAlive().length, left = SG.quota.length + alive, prog = SG.total ? 1 - left / SG.total : 0;
  const st = SG.st === 'rest' ? `Siguiente oleada en ${Math.ceil(SG.rest)} s` : SG.st === 'intro' ? 'Se acercan…' : `Quedan ${left}`;
  const sig = [SG.wave, st, Math.round(prog * 100), Math.round(ch * 100), SG.broken].join('|'); if (SG.hud === sig) return; SG.hud = sig;
  e.innerHTML = `<div class="sgt"><b>⚔ Asedio a tu base</b><span>Oleada ${SG.wave + 1}/3 · ${st}</span></div><div class="sgbar"><i style="transform:scaleX(${prog.toFixed(3)})"></i></div>
    <div class="sgs"><span>❤ Núcleo</span><div class="sgcore"><i style="transform:scaleX(${ch.toFixed(3)})"></i></div><span>${Math.round(ch * 100)} %</span>${SG.broken ? `<span class="mut">· ${SG.broken} rotos</span>` : ''}</div>`;
}
cmd('asedio', { a: ['siege'], u: '/asedio [fin]', d: 'Empieza ya un asedio a la base del Núcleo (o lo termina).', cheat: 1, run(a) {
  if (normTxt(a[0] || '') === 'fin') { if (SG.on) sgEnd(false); return; } if (SG.on) return errMsg('Ya hay un asedio en marcha'); if (!sgStart(true)) return; okMsg('⚔ Asedio en marcha.');
} });
