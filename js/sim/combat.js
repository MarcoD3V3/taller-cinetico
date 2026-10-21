'use strict';
// =====================================================================================
//  Combate en tiempo real: enemigos con IA, jefes con habilidades y fases, proyectiles,
//  peligros en el suelo, armas cuerpo a cuerpo y a distancia, hechizos con combinaciones,
//  impulso, gancho, mascotas domesticadas, monturas y música de jefe (WebAudio).
// =====================================================================================
let FOES = [], PROJ = [], HAZ = [], FX = [], SUMMONS = [];
const P = { cd: 0, swing: 0, swingA: 0, iframe: 0, shield: 0, shieldT: 0, chill: 0, dash: 0, dashCd: 0, dvx: 0, dvy: 0, grap: null, pull: null, lastEl: null, lastElT: 0, scd: {}, walk: 0, hurtT: 0, stormT: 0, stormLeft: 0 };
let BOSS = null, _spawnT = 0, _bloodMoon = false, _lastNight = -1;
const enemiesOn = () => foeMult() > 0;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
function fxText(x, y, txt, c = '#fff', big) { FX.push({ x, y, txt: String(txt), c, t: big ? 1.6 : 0.9, big }); if (FX.length > 80) FX.shift(); }
// ¿Se puede pisar? Los fantasmas atraviesan paredes; los voladores, el agua
function passable(x, y, who) {
  const tx = Math.floor(x / T), ty = Math.floor(y / T), c = peekChunk(tx >> CSH, ty >> CSH); if (!c) return false;
  const i = ((ty & CMASK) << CSH) | (tx & CMASK), gi = GI[c.g[i]], o = who && typeof who === 'object' ? who : null;
  const ghost = o && o.phase, flier = o && o.fly && !o.proj;
  // Agua y lava: solo vuelan por encima (o el jugador con alas o montura voladora)
  if (gi.liquid && !gi.walk && !ghost && !flier && !(o && o.proj) && !(who === 'player' && (hasFlag('phoenixWings') || mountFly() || (gi.liquid === 'water' && !mountPet())))) return false; // el jugador nada
  // Árboles, roca y menas no se atraviesan (los voladores pasan por encima)
  // Los árboles solo bloquean con el tronco: se puede pasar entre ellos y por detrás de la copa
  if (gi.tree && !ghost && !flier) { const dx = x - (tx * T + 16), dy = (y - (ty * T + 25)) * 1.6, r = gi.tree.big || gi.tree.s === 'jungle' || gi.tree.s === 'baobab' ? 9 : 6.5; if (dx * dx + dy * dy < r * r) return false; }
  else if (gi.solid && !ghost && !flier) return false;
  const b = c.b && c.b[i]; if (!b) return true;
  const d = BD[b.type];
  if (d.door) return who === 'player' || who === 'pet' || !!ghost || !!(o && o.proj);
  if (d.walk) return true;
  return !!ghost;
}
// El jugador ocupa un poco más que un punto: se comprueban sus pies
function playerFree(x, y) { return passable(x - 5, y + 5, 'player') && passable(x + 5, y + 5, 'player') && passable(x, y + 1, 'player'); }
// ---------- Estadísticas ----------
const scaleHp = () => (1 + S.tier * 0.15) * (0.75 + diff() * 0.25);
const scaleDmg = () => 1 + S.tier * 0.08; // la dificultad ya la aplica hurt()
function makeFoe(k, x, y, extra) {
  const D = ENEMIES[k] || BOSSES[k], boss = !!BOSSES[k], hp = Math.round(D.hp * (boss ? (1 + S.tier * 0.1) * (0.6 + diff() * 0.4) : scaleHp()));
  return Object.assign({ k, D, boss, x, y, hp, mhp: hp, cd: 1 + Math.random(), t: 0, vx: 0, vy: 0, face: 1, frz: 0, stun: 0, root: 0, burn: 0, poison: 0, slow: 0, conf: 0, abT: 2.5, abI: 0, flash: 0, ph: Math.random() * 6 }, extra);
}
function spawnFoe(k, x, y, extra) { const f = makeFoe(k, x, y, extra); FOES.push(f); return f; }
// ---------- Aparición de enemigos ----------
function nightIndex() { const dl = S.gen.dayLen || DAY_LEN; return Math.floor((S.time + dl * 0.25) / dl); }
// ---------- Aparición equilibrada ----------
// El ritmo y el tope dependen de cómo se creó el mundo (opción «Enemigos» y dificultad),
// del nivel de la fábrica, de si es de día o de noche y de la luna de sangre.
// Las dos primeras noches son más tranquilas. Nada aparece cerca de luces, casas,
// el Núcleo, camas ni dentro de las zonas protegidas.
const FOE_LEVELS = [['Ninguno', 0], ['Pocos', 0.5], ['Normales', 1], ['Muchos', 1.6], ['Horda', 2.4]];
function foeMult() { if (!survOn()) return 0; const f = S.gen.foes ?? 1; return f * (diff() >= 2 ? 1.6 : diff() >= 1.5 ? 1.3 : 1); }
function spawnPlan(night) {
  const m = foeMult() * CM().foes * (buff('stealth') ? 0.3 : 1); if (m <= 0) return null;
  const grace = nightIndex() < 2 ? 0.5 : 1, bm = _bloodMoon ? 1.8 : 1;
  if (night) return { every: 7 / (m * bm), cap: Math.max(1, Math.round((3 + Math.min(4, S.tier * 0.7)) * m * grace * bm)) };
  return { every: 22 / m, cap: Math.round(1.2 * m * grace) };
}
function spawnTick(dt) {
  const night = daylight() < 0.3, ni = nightIndex();
  if (night && ni !== _lastNight) { _lastNight = ni; _bloodMoon = ni % 5 === 4 && foeMult() >= 0.5; if (_bloodMoon) { toast('🩸 ¡Luna de sangre! Esta noche salen muchos más enemigos', true); if (!BOSS && Math.random() < 0.2 * Math.min(1.5, foeMult())) { const ks = Object.keys(BOSSES).filter(b => BOSSES[b].tier <= S.tier + 1); summonBoss(ks[(Math.random() * ks.length) | 0], true); } } }
  if (!night) _bloodMoon = false;
  const plan = spawnPlan(night); if (!plan) return;
  _spawnT -= dt; if (_spawnT > 0) return; _spawnT = plan.every * (0.7 + Math.random() * 0.6);
  const normal = FOES.filter(f => !f.boss && !f.minion).length; if (normal >= plan.cap) return;
  for (let tries = 0; tries < 4; tries++) {
    const a = Math.random() * Math.PI * 2, r = (18 + Math.random() * 10) * T, x = S.player.x + Math.cos(a) * r, y = S.player.y + Math.sin(a) * r;
    const tx = Math.floor(x / T), ty = Math.floor(y / T); if (!peekChunk(tx >> CSH, ty >> CSH) || !passable(x, y)) continue;
    if (houseAt(tx, ty) || wardAt(x, y)) continue;
    const B = BIOMES[biomeOf(tx, ty)]; if (B.ocean) continue;
    const far = Math.hypot(x, y) / T, maxTier = S.tier + 1 + Math.floor(far / 900) + (diff() >= 2 ? 1 : 0);
    const cand = []; let tot = 0;
    for (const k in ENEMIES) { const D = ENEMIES[k]; if (D.tier > maxTier) continue; if (D.night && !night && !_bloodMoon) continue; if (D.bio && !D.bio.includes(B.key)) continue; const w = D.elite ? 0.12 * diff() : D.bio ? 1.6 : 1; cand.push([k, w]); tot += w; }
    if (!cand.length) return;
    let p = Math.random() * tot; for (const [k, w] of cand) { p -= w; if (p <= 0) { const D = ENEMIES[k], n = night && D.ai === 'melee' && D.s < 8 && Math.random() < 0.25 * foeMult() ? 2 : 1; for (let i = 0; i < n; i++) spawnFoe(k, x + i * 14, y + i * 10); return; } }
    return;
  }
}
// ---------- Protecciones contra la aparición ----------
// r: radio en casillas · strong: además, los enemigos que entran se desvanecen (salvo jefes)
const WARD_DEF = { scarecrow: { r: 10 }, wardTotem: { r: 18, strong: 1 }, spawnSuppressor: { r: 32, strong: 1, pw: 20 }, holyBeacon: { r: 48, strong: 1, pw: 60, holy: 1 } };
function wardActive(b) { const d = WARD_DEF[b.type]; return !d.pw || (runnable(b) && b.won); }
function wardAt(x, y, strongOnly) {
  for (const z of S.wards || []) if (dist(x, y, z.x, z.y) < z.r * T) return z;
  for (const k in WARD_DEF) { const d = WARD_DEF[k]; if (strongOnly && !d.strong) continue; for (const b of L[k] || []) if (wardActive(b) && Math.abs(b.x * T - x) < d.r * T && Math.abs(b.y * T - y) < d.r * T && dist(x, y, b.x * T + 16, b.y * T + 16) < d.r * T) return b; }
  if (strongOnly) return null;
  for (const b of L.light || []) if (Math.abs(b.x * T - x) < 8 * T && Math.abs(b.y * T - y) < 8 * T && dist(x, y, b.x * T + 16, b.y * T + 16) < (5 + (BD[b.type].light || 1)) * T) return b;
  for (const b of L.core || []) if (dist(x, y, b.x * T, b.y * T) < 20 * T) return b;
  for (const b of L.bed || []) if (dist(x, y, b.x * T, b.y * T) < 10 * T) return b;
  return null;
}
let _wardT = 0;
function wardTick(dt) {
  _wardT -= dt; if (_wardT > 0) return; _wardT = 1;
  if (S.wards) for (let i = S.wards.length - 1; i >= 0; i--) if ((S.wards[i].t -= 1) <= 0) { toast('La zona protegida se ha desvanecido'); S.wards.splice(i, 1); }
  for (const k of ['spawnSuppressor', 'holyBeacon']) for (const b of L[k] || []) { const need = WARD_DEF[k].pw; b.won = runnable(b) && (b.E || 0) >= need; if (b.won) b.E -= need; }
  for (const f of FOES.slice()) { if (f.boss || f.owner) continue; const w = wardAt(f.x, f.y, true); if (!w) continue; f.fade = (f.fade || 0) + 1; if (f.fade >= 2 || (w.type === 'holyBeacon' && f.D.undead)) { FX.push({ x: f.x, y: f.y, ring: f.D.s * 1.5, t: 0.4, c: '#fff6b0' }); FOES.splice(FOES.indexOf(f), 1); } }
}
function addWard(x, y, r, t, n) { (S.wards || (S.wards = [])).push({ x, y, r, t, n }); FX.push({ x, y, ring: r * T, t: 1, c: '#fff6b0' }); toast(`🛡 ${n}: nada aparecerá a ${r} casillas durante ${Math.round(t / 60)} min`, true); }
// ---------- Daño ----------
function damageFoe(f, dmg, el, src) {
  if (f.hp <= 0 || f.inv) return;
  if (f.shieldT > 0) { fxText(f.x, f.y - f.D.s, 'inmune', '#c8a8ff'); return; }
  let d = dmg * (1 + 0.05 * lvOf('combat')) * (f.D.undead && el === 'holy' ? 2 : 1);
  if (f.clone) d = f.hp;
  f.hp -= d; f.flash = 0.12;
  fxText(f.x + (Math.random() - 0.5) * 10, f.y - f.D.s - 4, Math.round(d), el === 'fire' ? '#ff9a4a' : el === 'frost' ? '#9ad8ff' : el === 'storm' ? '#f0f05a' : '#fff');
  if (el === 'fire') f.burn = 3; if (el === 'frost') f.slow = 2; if (el === 'poison') f.poison = 4; if (el === 'time') f.stun = Math.max(f.stun, 0.5);
  if (el === 'void' && !f.boss) { const a = Math.atan2(S.player.y - f.y, S.player.x - f.x); f.x += Math.cos(a) * 10; f.y += Math.sin(a) * 10; }
  if (el === 'life' && survOn()) S.pc.hp = Math.min(maxHp(), S.pc.hp + 2);
  if (f.hp <= 0) killFoe(f);
}
function killFoe(f) {
  const D = f.D;
  if (f.boss && D.revive && !f.revived) { f.revived = 1; f.hp = f.mhp * 0.5; fxText(f.x, f.y - D.s, '¡Renace de sus cenizas!', '#ffb030', true); bossRoar(); return; }
  FOES.splice(FOES.indexOf(f), 1);
  if (f.clone || f.summoned) return;
  if (D.split || (f.boss && D.split)) for (let i = 0; i < (f.boss ? 4 : 2); i++) spawnFoe(f.boss ? 'slimeEElite' : 'slimeE', f.x + (i - 1) * 16, f.y + (i % 2) * 14, { minion: f.boss ? 1 : 0, small: !f.boss });
  if (f.small) return;
  // Botín
  const got = {};
  for (const [id, n, ch] of D.drops || []) if (Math.random() < ch + CM().luck * 0.5) got[id] = (got[id] || 0) + Math.max(1, Math.round(n * (0.6 + Math.random() * 0.8)));
  if (!f.boss && Math.random() < 0.012 && D.tier >= 2) { const ks = Object.keys(BOSSES).filter(b => BOSSES[b].tier <= S.tier); if (ks.length) { const b = BOSSES[ks[(Math.random() * ks.length) | 0]]; got[b.summonItem] = 1; } }
  let lost = 0; for (const id in got) lost += invAdd(id, got[id]);
  const txt = Object.keys(got).map(id => got[id] + ' ' + ITEMS[id].n).join(', ');
  if (txt) fxText(f.x, f.y - D.s - 14, '+' + txt.slice(0, 40), '#ffd34a');
  if (lost) toastErr('Inventario lleno');
  gainXP('combat', f.boss ? 200 : (D.xp || 5)); if (f.boss) gainXP('combat', 100);
  if (f.boss) bossDefeated(f, txt);
}
// Golpe al jugador (con escudo, invulnerabilidad del impulso y heridas por partes)
function hitPlayer(dmg, wound, cause, el) {
  if (!survOn() || ui.open === 'dead' || P.iframe > 0) return;
  dmg *= scaleDmg();
  if (Math.random() < CM().block) { fxText(S.player.x, S.player.y - 22, '¡Bloqueado!', '#9ad8ff'); P.iframe = 0.2; sfx('swing'); wearShield(); return; }
  if (P.shield > 0) { const a = Math.min(P.shield, dmg); P.shield -= a; dmg -= a; fxText(S.player.x, S.player.y - 20, 'escudo', '#c8a8ff'); if (dmg <= 0) return; }
  const w = WT[wound] || WT.bruise;
  hurt(wound in WT ? wound : 'bruise', null, dmg / w.dmg, cause); wearArmor();
  P.hurtT = 0.25; P.iframe = 0.35;
  if (el === 'frost') P.chill = 2.5; if (el === 'fire' && Math.random() < 0.4) hurt('burn', null, 0.4, cause); if (el === 'poison') S.pc.poison = Math.max(S.pc.poison, 8);
  if (el === 'void') { const f = nearestFoe(S.player.x, S.player.y, 1e9); if (f) { const a = Math.atan2(f.y - S.player.y, f.x - S.player.x); movePlayer(Math.cos(a) * 20, Math.sin(a) * 20); } }
  sfx('hurt');
}
function nearestFoe(x, y, r, filt) { let best = null, bd = r; for (const f of FOES) { if (filt && !filt(f)) continue; const d = dist(x, y, f.x, f.y); if (d < bd) { bd = d; best = f; } } return best; }
function movePlayer(dx, dy) { const p = S.player, stuck = !playerFree(p.x, p.y); if (stuck || playerFree(p.x + dx, p.y)) p.x += dx; if (stuck || playerFree(p.x, p.y + dy)) p.y += dy; }
// ---------- IA de enemigos ----------
function foeTarget(f) {
  let tx = S.player.x, ty = S.player.y, td = dist(f.x, f.y, tx, ty), tgt = 'player';
  for (const a of allies()) { const d = dist(f.x, f.y, a.x, a.y); if (d < td && d < 5 * T) { td = d; tx = a.x; ty = a.y; tgt = a; } }
  return { tx, ty, td, tgt };
}
function stepFoe(f, dt) {
  const D = f.D;
  f.ph += dt * 6; if (f.flash > 0) f.flash -= dt;
  if (f.burn > 0) { f.burn -= dt; f.hp -= 3 * dt; } if (f.poison > 0) { f.poison -= dt; f.hp -= 2 * dt; }
  if (D.undead && !f.boss && daylight() > 0.65 && !_bloodMoon) { f.hp -= 4 * dt; if (Math.random() < dt * 3) fxText(f.x, f.y - D.s, '~', '#888'); }
  if (D.regen) f.hp = Math.min(f.mhp, f.hp + D.regen * dt);
  if (f.hp <= 0) { killFoe(f); return; }
  if (f.life !== undefined) { f.life -= dt; if (f.life <= 0) { FOES.splice(FOES.indexOf(f), 1); return; } }
  if (f.frz > 0) { f.frz -= dt; return; } if (f.stun > 0) { f.stun -= dt; return; }
  if (f.slow > 0) f.slow -= dt; if (f.root > 0) f.root -= dt; if (f.conf > 0) f.conf -= dt;
  if (f.boss) { bossAI(f, dt); return; }
  let { tx, ty, td, tgt } = foeTarget(f);
  if (f.conf > 0) { const o = nearestFoe(f.x, f.y, 6 * T, o2 => o2 !== f); if (o) { tx = o.x; ty = o.y; td = dist(f.x, f.y, tx, ty); tgt = o; } }
  if (!f.boss && td > 34 * T) { FOES.splice(FOES.indexOf(f), 1); return; }
  const aggro = (buff('stealth') ? 5 : daylight() < 0.3 ? 13 : 9) * T * CM().detect;
  if (!f.ag && td < aggro && !f.minion) f.ag = 1; else if (f.ag && td > aggro * 1.8 && !f.minion) f.ag = 0;
  if (!f.ag && !f.minion && tgt === 'player') { foeWander(f, dt); return; } // patrulla (sim/mobai.js)
  const sp = D.v * T * (f.slow > 0 ? 0.5 : 1) * (_bloodMoon ? 1.15 : 1);
  let want = 0; // 1 acercarse, -1 alejarse
  f.cd -= dt;
  switch (D.ai) {
    case 'ranged': case 'caster': case 'summoner':
      want = td > 7 * T ? 1 : td < 4 * T ? -1 : 0;
      if (td < 11 * T && f.cd <= 0 && D.proj) { f.cd = D.ai === 'caster' ? 2.2 : 1.7; shootAt(f, tx, ty, D.proj, D.el); }
      if (D.ai === 'summoner' && (f.st = (f.st || 4) - dt) <= 0) { f.st = 7; if (FOES.filter(o => o.owner === f).length < 5) for (let i = 0; i < 2; i++) spawnFoe(D.summon, f.x + (i ? 18 : -18), f.y + 10, { owner: f, minion: 1 }); }
      break;
    case 'charger':
      if (f.charge > 0) { f.charge -= dt; f.x += f.vx * dt; f.y += f.vy * dt; if (td < D.s + 14) contactHit(f, tgt, 1.4); return; }
      if (f.tele > 0) { f.tele -= dt; if (f.tele <= 0) { const a = Math.atan2(ty - f.y, tx - f.x); f.vx = Math.cos(a) * sp * 3.2; f.vy = Math.sin(a) * sp * 3.2; f.charge = 0.55; } return; }
      want = 1; if (td < 6 * T && td > 2 * T && f.cd <= 0) { f.cd = 2.5; f.tele = 0.45; return; }
      break;
    case 'exploder':
      if (f.fuse > 0) { f.fuse -= dt; if (f.fuse <= 0) { explode(f.x, f.y, 70, D.dmg, 'e', D.el || 'fire'); f.hp = 0; FOES.splice(FOES.indexOf(f), 1); } return; }
      want = 1; if (td < 1.6 * T) { f.fuse = 0.8; return; }
      break;
    default: want = 1;
  }
  if (D.blink && (f.bt = (f.bt || 3) - dt) <= 0) { f.bt = 4 + Math.random() * 2; const a = Math.random() * 7; f.x = tx + Math.cos(a) * 2.5 * T; f.y = ty + Math.sin(a) * 2.5 * T; fxText(f.x, f.y, '✦', '#a060ff'); }
  if (D.ai !== 'ranged' && D.ai !== 'caster' && D.ai !== 'summoner' && td < D.s + 14 && f.cd <= 0) { f.cd = 1.3; contactHit(f, tgt, 1); }
  // Movimiento con esquiva, separación y flanqueo (sim/mobai.js)
  if (f.root <= 0 && (want ? td > D.s + 8 : D.ai === 'ranged' || D.ai === 'caster' || D.ai === 'summoner')) foeMove(f, tx, ty, td, want, sp, dt);
  // Pinchos
  const b = at(Math.floor(f.x / T), Math.floor(f.y / T)); if (b && b.type === 'spikeTrap' && runnable(b)) f.hp -= 12 * dt;
}
function contactHit(f, tgt, mult) {
  const D = f.D;
  if (tgt === 'player') { hitPlayer(D.dmg * mult, D.wound, 'Atacado por: ' + D.n, D.venom ? 'poison' : D.el); if (D.drain) f.hp = Math.min(f.mhp, f.hp + D.dmg); }
  else if (tgt && tgt.hp !== undefined) { tgt.hp -= D.dmg * mult * scaleDmg(); tgt.flash = 0.15; }
}
function shootAt(f, tx, ty, pr, el) {
  const a = Math.atan2(ty - f.y, tx - f.x) + (Math.random() - 0.5) * 0.1;
  PROJ.push({ x: f.x, y: f.y, vx: Math.cos(a) * pr.spd * T, vy: Math.sin(a) * pr.spd * T, r: 5, dmg: pr.dmg, c: pr.c, team: 'e', life: 2.5, el, wound: f.D.wound || 'cut', src: f.D.n });
}
function explode(x, y, r, dmg, team, el) {
  FX.push({ x, y, ring: r, t: 0.4, c: el === 'fire' ? '#ff8a2a' : '#fff' });
  if (team === 'e') { if (dist(x, y, S.player.x, S.player.y) < r) hitPlayer(dmg, 'burn', 'Explosión', el); }
  else for (const f of FOES.slice()) if (dist(x, y, f.x, f.y) < r + f.D.s) damageFoe(f, dmg, el);
  sfx('boom');
}
// ---------- Jefes ----------
function summonBoss(k, natural, at2) {
  if (BOSS) { toastErr('Ya hay un jefe despierto'); return false; }
  const B = BOSSES[k], a = Math.random() * 7, x = at2 ? at2.x : S.player.x + Math.cos(a) * 8 * T, y = at2 ? at2.y : S.player.y + Math.sin(a) * 8 * T;
  toast(`☠ ${B.n} ${natural ? 'ronda por aquí' : 'ha despertado'}…`, true);
  HAZ.push({ x, y, r: B.s * 1.6, t: 2, dl: 2, kind: 'warn', c: '#ff3a2a' });
  setTimeout(() => { if (!S || BOSS) return; BOSS = spawnFoe(k, x, y); bossMusic(true, k); bossRoar(); buildBossBar(); }, 2000);
  return true;
}
function bossAI(f, dt) {
  const D = f.D, td = dist(f.x, f.y, S.player.x, S.player.y), hpF = f.hp / f.mhp;
  if (td > 70 * T || ui.open === 'dead') { toast(`${D.n} se ha ido`, true); FOES.splice(FOES.indexOf(f), 1); bossEnd(); return; }
  const phase = hpF < 0.25 ? 3 : hpF < 0.5 ? 2 : 1;
  if (phase !== f.phase) { if (f.phase) { fxText(f.x, f.y - D.s - 10, phase === 3 ? '¡FURIA!' : '¡Se enfurece!', '#ff3a2a', true); bossRoar(); if (D.ab.some(a => a[0] === 'summon')) doAbility(f, D.ab.find(a => a[0] === 'summon')); } f.phase = phase; }
  if (f.shieldT > 0) { f.shieldT -= dt; if (!FOES.some(o => o.owner === f)) f.shieldT = 0; }
  if (f.charge > 0) { f.charge -= dt; f.x += f.vx * dt; f.y += f.vy * dt; if (td < D.s + 14 && f.cd <= 0) { f.cd = 0.6; hitPlayer(D.dmg * 1.5, D.ab.some(a => a[0] === 'charge') ? 'fracture' : 'cut', D.n, D.el); } return; }
  if (f.tele > 0) { f.tele -= dt; if (f.tele <= 0) { const a = f.ta; f.vx = Math.cos(a) * D.v * T * 4.5; f.vy = Math.sin(a) * D.v * T * 4.5; f.charge = 0.7; } return; }
  if (f.spiral > 0) { f.spiral -= dt; f.sa = (f.sa || 0) + dt * 4; if ((f.sT = (f.sT || 0) - dt) <= 0) { f.sT = phase > 1 ? 0.06 : 0.09; for (let i = 0; i < (D.heads || 1) + (phase > 2 ? 1 : 0); i++) { const a = f.sa + i * Math.PI * 2 / ((D.heads || 1) + (phase > 2 ? 1 : 0)); PROJ.push({ x: f.x, y: f.y, vx: Math.cos(a) * 7 * T, vy: Math.sin(a) * 7 * T, r: 6, dmg: D.dmg * 0.45, c: D.c2, team: 'e', life: 3, el: D.el, wound: 'burn', src: D.n }); } } }
  if (f.pullT > 0) { f.pullT -= dt; const a = Math.atan2(f.y - S.player.y, f.x - S.player.x); movePlayer(Math.cos(a) * 3.2 * T * dt, Math.sin(a) * 3.2 * T * dt); }
  // Moverse hacia el jugador
  if (td > D.s + 20 && f.root <= 0) { const a = Math.atan2(S.player.y - f.y, S.player.x - f.x), sp = D.v * T * (phase === 3 ? 1.35 : 1) * (f.slow > 0 ? 0.6 : 1) * dt; f.x += Math.cos(a) * sp; f.y += Math.sin(a) * sp; f.face = Math.cos(a) > 0 ? 1 : -1; }
  f.cd -= dt;
  if (td < D.s + 16 && f.cd <= 0) { f.cd = 1.2; hitPlayer(D.dmg, 'cut', D.n, D.el); if (D.drain) f.hp = Math.min(f.mhp, f.hp + D.dmg); }
  f.abT -= dt * (phase === 3 ? 1.6 : phase === 2 ? 1.25 : 1);
  if (f.abT <= 0) { f.abT = 2.8; const ab = D.ab[f.abI++ % D.ab.length]; doAbility(f, ab); }
}
function doAbility(f, ab) {
  const D = f.D, px = S.player.x, py = S.player.y, ph = f.phase || 1;
  switch (ab[0]) {
    case 'summon': { const n = ab[2] + (ph > 1 ? 1 : 0), alive = FOES.filter(o => o.owner === f).length; for (let i = 0; i < Math.min(n, 12 - alive); i++) { const a = i / n * 7; spawnFoe(ab[1], f.x + Math.cos(a) * (D.s + 20), f.y + Math.sin(a) * (D.s + 20), { owner: f, minion: 1 }); } fxText(f.x, f.y - D.s - 10, '¡Invoca refuerzos!', '#ff9a4a', true); break; }
    case 'ring': { const n = ab[1] + (ph > 2 ? 8 : 0); for (let k = 0; k < (ph > 1 ? 2 : 1); k++) for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + k * Math.PI / n; PROJ.push({ x: f.x, y: f.y, vx: Math.cos(a) * (6 + k * 2) * T, vy: Math.sin(a) * (6 + k * 2) * T, r: 6, dmg: D.dmg * 0.6, c: D.c2, team: 'e', life: 3, el: D.el, wound: D.venom ? 'sting' : 'cut', src: D.n }); } break; }
    case 'spiral': f.spiral = 3; break;
    case 'charge': f.ta = Math.atan2(py - f.y, px - f.x); f.tele = 0.65; HAZ.push({ x: f.x, y: f.y, ang: f.ta, len: D.v * T * 4.5 * 0.7, w: D.s * 1.4, t: 0.65, dl: 0.65, kind: 'line', c: '#ff3a2a' }); break;
    case 'slam': HAZ.push({ x: f.x, y: f.y, r: D.s * 2.8, t: 0.9, dl: 0.9, kind: 'warn', dmg: D.dmg * 1.3, wound: 'fracture', team: 'e', src: D.n, c: '#ff3a2a', shake: 1, follow: f }); break;
    case 'meteor': { const n = ab[1] + (ph > 1 ? 2 : 0); for (let i = 0; i < n; i++) { const ox = i ? (Math.random() - 0.5) * 8 * T : 0, oy = i ? (Math.random() - 0.5) * 8 * T : 0; HAZ.push({ x: px + ox, y: py + oy, r: 46, t: 1.1 + i * 0.12, dl: 1.1 + i * 0.12, kind: 'warn', dmg: D.dmg, wound: 'burn', team: 'e', src: D.n, c: D.el === 'frost' ? '#8ad8ff' : D.el === 'storm' ? '#f0f05a' : '#ff6a2a', el: D.el }); } break; }
    case 'teleport': { const a = Math.random() * 7; FX.push({ x: f.x, y: f.y, ring: D.s, t: 0.4, c: '#a060ff' }); f.x = px + Math.cos(a) * 5 * T; f.y = py + Math.sin(a) * 5 * T; break; }
    case 'heal': f.hp = Math.min(f.mhp, f.hp + f.mhp * 0.08); fxText(f.x, f.y - D.s - 10, '+' + Math.round(f.mhp * 0.08), '#7ae05a', true); break;
    case 'beam': { const a = Math.atan2(py - f.y, px - f.x); HAZ.push({ x: f.x, y: f.y, ang: a, len: 14 * T, w: 26, t: 0.85, dl: 0.85, kind: 'line', dmg: D.dmg * 1.4, wound: 'burn', team: 'e', src: D.n, c: D.c2, beam: 1 }); break; }
    case 'pull': f.pullT = 2.5; fxText(f.x, f.y - D.s - 10, '¡Te arrastra!', '#a060ff', true); break;
    case 'hazard': for (let i = 0; i < 4 + ph; i++) HAZ.push({ x: px + (Math.random() - 0.5) * 7 * T, y: py + (Math.random() - 0.5) * 7 * T, r: 40, t: 8, kind: 'pool', dps: D.dmg * 0.3, team: 'e', wound: D.el === 'fire' ? 'burn' : 'sting', src: D.n, c: D.el === 'fire' ? '#ff4a10' : D.el === 'void' ? '#5a1a8a' : '#8ad84a' }); break;
    case 'shield': f.shieldT = 7; doAbility(f, D.ab.find(a => a[0] === 'summon') || ['summon', 'skeleton', 3]); fxText(f.x, f.y - D.s - 10, '¡Escudo! Mata a sus esbirros', '#c8a8ff', true); break;
    case 'clone': for (let i = 0; i < 2 + (ph > 2 ? 1 : 0); i++) { const a = Math.random() * 7; spawnFoe(f.k, f.x + Math.cos(a) * 3 * T, f.y + Math.sin(a) * 3 * T, { clone: 1, boss: false, hp: 1, mhp: 1, life: 10, D: { ...D, ab: [], dmg: D.dmg * 0.3, ai: 'melee', drops: [] } }); } break;
  }
}
function bossDefeated(f, loot) {
  const D = f.D; S.bossesDown = S.bossesDown || {}; S.bossesDown[f.k] = (S.bossesDown[f.k] || 0) + 1;
  for (const o of FOES.slice()) if (o.owner === f || o.clone) FOES.splice(FOES.indexOf(o), 1);
  toast(`🏆 ¡Has derrotado a ${D.n}!`, true); if (loot) toast(loot);
  FX.push({ x: f.x, y: f.y, ring: D.s * 4, t: 1, c: '#ffd34a' });
  bossEnd(); endOnBoss(f.k);
}
function bossEnd() { BOSS = null; bossMusic(false); const el = $('bossBar'); if (el) el.hidden = true; }
// ---------- Ataques del jugador ----------
const MELEE_CD = { dagger: 0.28, sword: 0.42, spear: 0.5, mace: 0.65, baxe: 0.7, scythe: 0.6 };
function weaponProfile(id) {
  const it = ITEMS[id]; if (!it || !it.weapon) return null; const w = it.weapon;
  if (w.ranged) return { kind: 'ranged', ...w.ranged, dmg: w.dmg * 5, el: w.el };
  if (it.s === 'bow') return { kind: 'ranged', ammo: 'arrow', cd: 0.55, spd: 20, dmg: w.dmg * 5, el: w.el };
  if (it.s === 'xbow') return { kind: 'ranged', ammo: 'bolt', cd: 0.9, spd: 26, dmg: w.dmg * 5, el: w.el, n: w.chain ? 2 : 1, spread: 0.08 };
  if (it.s === 'staff' || it.s === 'wand') return { kind: 'ranged', mana: it.s === 'staff' ? 8 : 4, cd: it.s === 'staff' ? 0.5 : 0.3, spd: 16, dmg: w.dmg * 5, el: w.el, pierce: w.sweep ? 2 : 0, boom: w.sweep || 0 };
  return { kind: 'melee', cd: MELEE_CD[it.s] || 0.45, dmg: w.dmg * 6, el: w.el, reach: 34 + (w.reach || 0) * 0.5 + (it.s === 'spear' ? 22 : 0), arc: it.s === 'spear' ? 0.6 : w.sweep ? 2.4 : 1.9 };
}
function playerAttack(id, mw) {
  if (P.cd > 0) return;
  const pr = weaponProfile(id), p = S.player, a = Math.atan2(mw.y - p.y, mw.x - p.x);
  if (!pr) { // puñetazo si apuntas a un enemigo cercano
    const f = nearestFoe(mw.x, mw.y, 40); if (!f || dist(p.x, p.y, f.x, f.y) > 2 * T) return false;
    P.cd = 0.45; P.swing = 0.2; P.swingA = a; damageFoe(f, 3); return true;
  }
  const w = WEAPONS[id] || {};
  if (pr.kind === 'melee') {
    P.cd = pr.cd * (survOn() ? 1 / Math.max(0.5, workMul()) : 1); P.swing = 0.2; P.swingA = a; sfx('swing');
    let hit = 0;
    for (const f of FOES.slice()) { const d = dist(p.x, p.y, f.x, f.y); if (d > pr.reach + f.D.s) continue; let da = Math.abs(((Math.atan2(f.y - p.y, f.x - p.x) - a) + Math.PI * 3) % (Math.PI * 2) - Math.PI); if (da < pr.arc / 2 || d < f.D.s + 8) { damageFoe(f, pr.dmg * CM().melee, pr.el); hit++; if (!w.sweep && hit >= 1 + (w.chain || 0)) break; } }
    for (const an of ANIMALS.slice()) { const d = dist(p.x, p.y, an.x, an.y); if (d > pr.reach + 8) continue; const da = Math.abs(((Math.atan2(an.y - p.y, an.x - p.x) - a) + Math.PI * 3) % (Math.PI * 2) - Math.PI); if (da < pr.arc / 2) { hitAnimal(an, pr.dmg * CM().melee, w); hit++; } }
    if (hit) wearHeld(1);
    if (survOn()) S.pc.stam = Math.max(0, S.pc.stam - 2);
    return true;
  }
  // A distancia: munición o maná
  const per = pr.per || 1;
  if (pr.ammo) { if (invCount(pr.ammo) < 1) { toastErr('Sin munición: ' + ITEMS[pr.ammo].n); P.cd = 0.4; return true; } if (!pr.per || Math.random() < 1 / per) invTake(pr.ammo, 1); }
  if (pr.mana) { if (survOn() && S.pc.mana < pr.mana) { toastErr('Sin maná'); P.cd = 0.4; return true; } if (survOn()) { S.pc.mana -= pr.mana * (1 - 0.04 * lvOf('magic')); gainXP('magic', pr.mana / 3); } }
  P.cd = pr.cd; P.swing = 0.12; P.swingA = a; wearHeld(1); sfx(pr.ammo === 'bullet' || pr.ammo === 'shell' ? 'gun' : 'shoot');
  const n = pr.n || 1, el = pr.ammo === 'fireArrow' || (pr.ammo === 'arrow' && invCount('fireArrow') && false) ? 'fire' : pr.el;
  for (let i = 0; i < n; i++) {
    const aa = a + (n > 1 ? (i / (n - 1) - 0.5) * (pr.spread || 0.2) * 2 : 0) + (Math.random() - 0.5) * (pr.spread || 0) * 0.5;
    PROJ.push({ x: p.x + Math.cos(aa) * 12, y: p.y + Math.sin(aa) * 12, vx: Math.cos(aa) * pr.spd * T, vy: Math.sin(aa) * pr.spd * T, r: pr.boom ? 6 : 4, dmg: pr.dmg * CM().ranged, c: pr.mana ? (ITEMS[id].c) : pr.ammo === 'bullet' || pr.ammo === 'shell' ? '#ffe08a' : el === 'fire' ? '#ff8a2a' : '#e8e0c8', team: 'p', life: pr.life || (pr.ret ? 1.2 : 1.6), pierce: pr.pierce || 0, boom: pr.boom || 0, el, ret: pr.ret, arrow: !!pr.ammo && !pr.boom && pr.ammo !== 'fuelCan', w, hit: new Set() });
  }
  return true;
}
function hitAnimal(an, dmg, w) {
  if (an.hp === undefined) an.hp = SPECIES[an.sp].s * 4;
  an.hp -= dmg; fxText(an.x, an.y - 10, Math.round(dmg), '#fff');
  if (an.hp <= 0) { huntWith(an, w); gainXP('hunt', 4 + Math.round(SPECIES[an.sp].s / 2)); }
}
// ---------- Hechizos ----------
const SPELL_KEYS = ['z', 'v', 'y', 'u'];
function spellState() { return S.spells || (S.spells = { known: [], slots: [null, null, null, null] }); }
function learnSpell(k) {
  const st = spellState(); if (st.known.includes(k)) { toastErr('Ya conoces ' + SPELLS[k].n); return false; }
  st.known.push(k); const free = st.slots.indexOf(null); if (free >= 0) st.slots[free] = k;
  toast(`✦ Has aprendido ${SPELLS[k].n}${free >= 0 ? ' (tecla ' + SPELL_KEYS[free].toUpperCase() + ')' : ''}`, true); vitalsDirty = true; return true;
}
function castSpell(slot) {
  const st = spellState(), k = st.slots[slot]; if (!k) { toastErr('Ese hueco no tiene hechizo: asígnalo en la ficha (C)'); return; }
  const s = SPELLS[k]; if ((P.scd[k] || 0) > 0) return;
  const pc = pcInit(), cost = s.m * (1 - 0.04 * lvOf('magic'));
  if (survOn() && pc.mana < cost) { toastErr('Sin maná'); return; }
  if (survOn()) pc.mana -= cost; P.scd[k] = s.cd; gainXP('magic', s.m / 2);
  const p = S.player, mw = mouseWorld(), a = Math.atan2(mw.y - p.y, mw.x - p.x), pw = 1 + 0.06 * lvOf('magic');
  sfx('spell');
  switch (s.kind) {
    case 'proj': PROJ.push({ x: p.x, y: p.y, vx: Math.cos(a) * s.spd * T, vy: Math.sin(a) * s.spd * T, r: 7, dmg: s.dmg * pw, c: s.c, team: 'p', life: 1.6, pierce: s.pierce || 0, boom: s.boom || 0, el: s.el, slow: s.slow, glow: 1, hit: new Set() }); break;
    case 'chain': { let f = nearestFoe(mw.x, mw.y, 8 * T), from = { x: p.x, y: p.y }; const done = new Set(); for (let i = 0; i < s.n2 && f; i++) { done.add(f); FX.push({ x: from.x, y: from.y, x2: f.x, y2: f.y, bolt: 1, t: 0.25, c: s.c }); damageFoe(f, s.dmg * pw * (1 - i * 0.12), 'storm'); from = f; f = nearestFoe(f.x, f.y, 4 * T, o => !done.has(o)); } break; }
    case 'nova': FX.push({ x: p.x, y: p.y, ring: s.r, t: 0.45, c: s.c }); for (const f of FOES.slice()) if (dist(p.x, p.y, f.x, f.y) < s.r + f.D.s) { if (s.dmg) damageFoe(f, s.dmg * pw * (s.undead && f.D.undead ? s.undead : 1), s.el); if (s.freeze) f.frz = f.boss ? s.freeze / 3 : s.freeze; if (s.stun) f.stun = f.boss ? s.stun / 3 : s.stun; if (s.root) f.root = s.root; } if (s.freeze && s.r > 300) for (const pj of PROJ) if (pj.team === 'e') pj.life = Math.min(pj.life, 0.05); break;
    case 'heal': pc.hp = Math.min(maxHp(), pc.hp + s.amt * pw); for (const pp of PARTS) for (const w of pc.parts[pp]) w.left -= 60; fxText(p.x, p.y - 22, '+' + Math.round(s.amt * pw), '#7ae05a', true); break;
    case 'shield': P.shield = s.amt * pw; P.shieldT = s.t; break;
    case 'blink': { const d = Math.min(s.r * T, dist(p.x, p.y, mw.x, mw.y)); const nx = p.x + Math.cos(a) * d, ny = p.y + Math.sin(a) * d; if (passable(nx, ny, 'player')) { FX.push({ x: p.x, y: p.y, ring: 18, t: 0.3, c: s.c }); p.x = nx; p.y = ny; P.iframe = 0.3; } else toastErr('No puedes aparecer ahí'); break; }
    case 'meteor': HAZ.push({ x: mw.x, y: mw.y, r: s.boom, t: 0.9, dl: 0.9, kind: 'warn', dmg: s.dmg * pw, team: 'p', c: s.c, el: s.el }); break;
    case 'cloud': HAZ.push({ x: mw.x, y: mw.y, r: s.r, t: s.t, kind: 'pool', dps: s.dmg * pw, team: 'p', c: s.c, el: s.el }); break;
    case 'summon': SUMMONS.push({ x: p.x + 20, y: p.y, hp: 60, mhp: 60, t: s.t, dmg: 12 * pw, cd: 0, c: s.c, sp: 'wolf' }); break;
    case 'hole': HAZ.push({ x: mw.x, y: mw.y, r: s.r, t: s.t, kind: 'hole', dps: s.dmg * pw, team: 'p', c: s.c }); break;
    case 'drain': { const f = nearestFoe(mw.x, mw.y, 7 * T); if (f) { FX.push({ x: p.x, y: p.y, x2: f.x, y2: f.y, bolt: 1, t: 0.3, c: s.c }); damageFoe(f, s.dmg * pw, 'life'); pc.hp = Math.min(maxHp(), pc.hp + s.dmg * pw * 0.5); } break; }
    case 'storm': P.stormT = 0; P.stormLeft = s.t; P.stormDmg = s.dmg * pw; P.stormR = s.r; break;
    case 'missiles': for (let i = 0; i < s.n2; i++) { const aa = a + (i - (s.n2 - 1) / 2) * 0.35; PROJ.push({ x: p.x, y: p.y, vx: Math.cos(aa) * 9 * T, vy: Math.sin(aa) * 9 * T, r: 5, dmg: s.dmg * pw, c: s.c, team: 'p', life: 2.2, homing: 1, el: s.el, glow: 1, hit: new Set() }); } break;
    case 'buff': { const b = S.buffs || (S.buffs = {}); b[s.buff] = Math.max(b[s.buff] || 0, s.t); break; }
    case 'ward': addWard(p.x, p.y, s.r, s.t, s.n); break;
  }
  // Combinaciones de elementos
  const now = S.time, key = P.lastEl + '+' + s.el;
  if (P.lastEl && P.lastEl !== s.el && now - P.lastElT < 2.5 && COMBOS[key]) { comboFx(COMBOS[key], s.kind === 'nova' || s.kind === 'heal' || s.kind === 'shield' ? { x: p.x, y: p.y } : mw); P.lastEl = null; }
  else { P.lastEl = s.el; P.lastElT = now; }
}
function comboFx(c, at2) {
  fxText(at2.x, at2.y - 30, c.n, c.c, true); FX.push({ x: at2.x, y: at2.y, ring: c.r || 80, t: 0.6, c: c.c }); sfx('boom');
  if (c.heal) { S.pc.hp = Math.min(maxHp(), S.pc.hp + c.heal); P.shield = 30; P.shieldT = 10; }
  if (c.dmg) for (const f of FOES.slice()) if (dist(at2.x, at2.y, f.x, f.y) < c.r + f.D.s) { damageFoe(f, c.dmg * (1 + 0.06 * lvOf('magic'))); if (c.stun) f.stun = f.boss ? c.stun / 3 : c.stun; if (c.freeze) f.frz = f.boss ? c.freeze / 3 : c.freeze; if (c.confuse && !f.boss) f.conf = c.confuse; }
  gainXP('magic', 15);
}
// ---------- Movilidad ----------
function dash() {
  if (P.dashCd > 0 || P.dash > 0 || ui.open) return;
  const boots = hasFlag('dashBoots'), cost = (boots ? 12 : 25) * CM().dash;
  if (survOn()) { if (S.pc.stam < cost) { toastErr('Sin aguante'); return; } S.pc.stam -= cost; S.pc.rest = 0; }
  let mx = 0, my = 0; if (keys.has('w')) my--; if (keys.has('s')) my++; if (keys.has('a')) mx--; if (keys.has('d')) mx++;
  if (!mx && !my) { const mw = mouseWorld(); mx = mw.x - S.player.x; my = mw.y - S.player.y; }
  const l = Math.hypot(mx, my) || 1, d = (boots ? 6 : 4) * T, dur = 0.16;
  P.dvx = mx / l * d / dur; P.dvy = my / l * d / dur; P.dash = dur; P.iframe = 0.28; P.dashCd = 0.7; sfx('dash');
}
function grappleTo(mw) {
  const p = S.player, d = dist(p.x, p.y, mw.x, mw.y);
  if (d > 12 * T) { toastErr('Demasiado lejos (máximo 12 casillas)'); return; }
  if (!walkable(gnd(Math.floor(mw.x / T), Math.floor(mw.y / T)))) { toastErr('El gancho necesita suelo firme'); return; }
  P.grap = { x: mw.x, y: mw.y }; sfx('shoot');
}
// ---------- Mascotas y monturas ----------
const allies = () => (S.pets || []).filter(pt => !pt.ride).concat(SUMMONS);
const mountPet = () => S.pets && S.pets.find(pt => pt.ride);
const mountFly = () => { const m = mountPet(); return m && TAME[m.sp] && TAME[m.sp].fly; };
const mountSpeed = () => { const m = mountPet(); return m ? TAME[m.sp].spd || 1.5 : 1; };
function petAt(wx, wy) { for (const pt of S.pets || []) if (!pt.ride && dist(pt.x, pt.y, wx, wy) < SPECIES[pt.sp].s + 8) return pt; return null; }
function tryTame(an) {
  const tm = TAME[an.sp], s = S.inv[S.sel];
  if (!tm) { toastErr(SPECIES[an.sp].n + ' no se puede domesticar'); return true; }
  if (!s || (!tm.food.includes(s.id) && s.id !== 'tameTreat')) { toastErr(`${SPECIES[an.sp].n} come: ${tm.food.map(f => ITEMS[f].n).join(', ')}`); return true; }
  if (--s.n <= 0) S.inv[S.sel] = null; invVersion++;
  if (s.id === 'tameTreat' || Math.random() < tm.ch * (1 + 0.1 * lvOf('hunt')) * CM().tame) {
    ANIMALS.splice(ANIMALS.indexOf(an), 1);
    const sp = SPECIES[an.sp], hp = Math.round((30 + sp.s * 8) * CM().petHp);
    (S.pets || (S.pets = [])).push({ sp: an.sp, x: an.x, y: an.y, hp, mhp: hp, mode: 'follow', prodT: tm.prod ? tm.prod[1] : 0, cd: 0 });
    fxText(an.x, an.y - 16, '❤', '#ff6a8a', true); toast(`¡Has domesticado: ${sp.n}! ${tm.role === 'mount' ? 'F para montarlo' : tm.role === 'farm' ? 'Te dará ' + ITEMS[tm.prod[0]].n : 'Peleará a tu lado'}`, true); gainXP('hunt', 10);
  } else fxText(an.x, an.y - 16, '…', '#aaa');
  return true;
}
function petInteract(pt) {
  const tm = TAME[pt.sp];
  if (tm.role === 'mount' && !keys.has('shift')) { for (const o of S.pets) o.ride = false; pt.ride = true; toast('Montas: ' + SPECIES[pt.sp].n + ' (F en el aire para bajar)'); return; }
  pt.mode = pt.mode === 'stay' ? 'follow' : 'stay'; toast(SPECIES[pt.sp].n + (pt.mode === 'stay' ? ': se queda aquí' : ': te sigue'));
}
function petsTick(dt) {
  const p = S.player;
  for (let i = (S.pets || []).length - 1; i >= 0; i--) {
    const pt = S.pets[i], sp = SPECIES[pt.sp], tm = TAME[pt.sp]; if (pt.flash > 0) pt.flash -= dt;
    if (pt.hp <= 0) { toast(`💔 Tu ${sp.n.toLowerCase()} ha muerto`, true); S.pets.splice(i, 1); continue; }
    if (pt.ride) { pt.x = p.x; pt.y = p.y + 4; continue; }
    pt.hp = Math.min(pt.mhp, pt.hp + dt * 0.5);
    if (tm.prod && (pt.prodT -= dt) <= 0) { pt.prodT = tm.prod[1]; if (dist(pt.x, pt.y, p.x, p.y) < 14 * T) { invAdd(tm.prod[0], 1); fxText(pt.x, pt.y - 14, '+1 ' + ITEMS[tm.prod[0]].n, '#ffd34a'); } }
    let tx = p.x, ty = p.y, near = 2.2 * T;
    if (tm.role === 'combat' && pt.mode === 'follow') { const f = nearestFoe(p.x, p.y, 8 * T); if (f) { tx = f.x; ty = f.y; near = f.D.s + sp.s; pt.cd -= dt; if (dist(pt.x, pt.y, f.x, f.y) < near + 6 && pt.cd <= 0) { pt.cd = 1.1; damageFoe(f, sp.s * 2.4); } } }
    if (pt.mode === 'stay') continue;
    const d = dist(pt.x, pt.y, tx, ty);
    if (d > 26 * T) { pt.x = p.x + 20; pt.y = p.y + 10; continue; }
    if (d > near) { const a = Math.atan2(ty - pt.y, tx - pt.x), v = sp.v * T * (d > 6 * T ? 2 : 1.2) * dt; const nx = pt.x + Math.cos(a) * v, ny = pt.y + Math.sin(a) * v; if (passable(nx, ny, sp.fly ? { fly: 1 } : 'pet')) { pt.x = nx; pt.y = ny; } else { pt.x += Math.cos(a) * v * 0.3; pt.y += Math.sin(a) * v * 0.3; } pt.face = Math.cos(a) > 0 ? 1 : -1; pt.ph = (pt.ph || 0) + dt * 8; }
  }
  for (let i = SUMMONS.length - 1; i >= 0; i--) {
    const s = SUMMONS[i]; s.t -= dt; if (s.t <= 0 || s.hp <= 0) { SUMMONS.splice(i, 1); continue; }
    const f = nearestFoe(s.x, s.y, 9 * T), tx = f ? f.x : p.x + 24, ty = f ? f.y : p.y; const d = dist(s.x, s.y, tx, ty);
    if (d > 20) { const a = Math.atan2(ty - s.y, tx - s.x); s.x += Math.cos(a) * 5 * T * dt; s.y += Math.sin(a) * 5 * T * dt; s.face = Math.cos(a) > 0 ? 1 : -1; }
    s.cd -= dt; if (f && d < f.D.s + 16 && s.cd <= 0) { s.cd = 0.8; damageFoe(f, s.dmg); }
  }
}
// ---------- Bucle principal del combate ----------
function combatTick(dt) {
  if (!S) return;
  if (P.cd > 0) P.cd -= dt; if (P.swing > 0) P.swing -= dt; if (P.iframe > 0) P.iframe -= dt; if (P.dashCd > 0) P.dashCd -= dt; if (P.hurtT > 0) P.hurtT -= dt; if (P.chill > 0) P.chill -= dt;
  if (P.shieldT > 0) { P.shieldT -= dt; if (P.shieldT <= 0) P.shield = 0; }
  for (const k in P.scd) if (P.scd[k] > 0) P.scd[k] -= dt;
  if (P.dash > 0) { P.dash -= dt; movePlayer(P.dvx * dt, P.dvy * dt); FX.push({ x: S.player.x, y: S.player.y, ghost: 1, t: 0.2 }); }
  if (P.grap) { const p = S.player, d = dist(p.x, p.y, P.grap.x, P.grap.y), st = 34 * T * dt; if (d <= st) { p.x = P.grap.x; p.y = P.grap.y; P.grap = null; } else { p.x += (P.grap.x - p.x) / d * st; p.y += (P.grap.y - p.y) / d * st; } }
  if (P.stormLeft > 0) { P.stormLeft -= dt; P.stormT -= dt; if (P.stormT <= 0) { P.stormT = 0.35; const c = FOES.filter(f => dist(f.x, f.y, S.player.x, S.player.y) < P.stormR); const f = c[(Math.random() * c.length) | 0]; if (f) { FX.push({ x: f.x, y: f.y - 200, x2: f.x, y2: f.y, bolt: 1, t: 0.2, c: '#f0f05a' }); damageFoe(f, P.stormDmg, 'storm'); } } }
  if (enemiesOn()) spawnTick(dt);
  wardTick(dt);
  for (let i = FOES.length - 1; i >= 0; i--) { const f = FOES[i]; if (f) stepFoe(f, dt); }
  petsTick(dt);
  // Proyectiles
  for (let i = PROJ.length - 1; i >= 0; i--) {
    const pj = PROJ[i]; pj.life -= dt;
    if (pj.homing) { const f = nearestFoe(pj.x, pj.y, 8 * T, o => !pj.hit.has(o)); if (f) { const a = Math.atan2(f.y - pj.y, f.x - pj.x), sp = Math.hypot(pj.vx, pj.vy), b = Math.atan2(pj.vy, pj.vx) + clamp(((a - Math.atan2(pj.vy, pj.vx)) + Math.PI * 3) % (Math.PI * 2) - Math.PI, -6 * dt, 6 * dt); pj.vx = Math.cos(b) * sp; pj.vy = Math.sin(b) * sp; } }
    if (pj.ret && pj.life < 0.6) { const a = Math.atan2(S.player.y - pj.y, S.player.x - pj.x), sp = Math.hypot(pj.vx, pj.vy); pj.vx = Math.cos(a) * sp; pj.vy = Math.sin(a) * sp; if (dist(pj.x, pj.y, S.player.x, S.player.y) < 14) pj.life = 0; }
    pj.x += pj.vx * dt; pj.y += pj.vy * dt;
    let dead = pj.life <= 0;
    if (!dead && !pj.ret && !passable(pj.x, pj.y, { fly: 1, proj: 1 })) dead = true;
    if (!dead && pj.team === 'e') { if (dist(pj.x, pj.y, S.player.x, S.player.y) < pj.r + 8) { _projHit = !!(pj.arrow !== undefined || pj.ammo || pj.src); hitPlayer(pj.dmg, pj.wound, 'Atacado por: ' + pj.src, pj.el); _projHit = false; dead = true; } else for (const a of allies()) if (dist(pj.x, pj.y, a.x, a.y) < pj.r + 8) { a.hp -= pj.dmg; a.flash = 0.15; dead = true; break; } }
    if (!dead && pj.team === 'p') {
      for (const f of FOES) { if (pj.hit.has(f) || dist(pj.x, pj.y, f.x, f.y) > pj.r + f.D.s) continue; pj.hit.add(f); if (pj.boom) { explode(pj.x, pj.y, pj.boom, pj.dmg, 'p', pj.el); dead = true; break; } damageFoe(f, pj.dmg, pj.el); if (pj.slow) f.slow = pj.slow; if (pj.pierce-- <= 0) { dead = true; break; } }
      if (!dead && pj.arrow) for (const an of ANIMALS) if (dist(pj.x, pj.y, an.x, an.y) < SPECIES[an.sp].s + 4) { hitAnimal(an, pj.dmg, pj.w); dead = true; break; }
    }
    if (dead) { if (pj.boom && pj.team === 'p' && pj.life > 0) explode(pj.x, pj.y, pj.boom, pj.dmg, 'p', pj.el); PROJ.splice(i, 1); }
  }
  if (PROJ.length > 400) PROJ.splice(0, PROJ.length - 400);
  // Peligros en el suelo
  for (let i = HAZ.length - 1; i >= 0; i--) {
    const h = HAZ[i]; h.t -= dt;
    if (h.follow && h.follow.hp > 0) { h.x = h.follow.x; h.y = h.follow.y; }
    if (h.kind === 'pool' || h.kind === 'hole') {
      if (h.team === 'e' && dist(h.x, h.y, S.player.x, S.player.y) < h.r) { if ((h.tick = (h.tick || 0) - dt) <= 0) { h.tick = 0.5; hitPlayer(h.dps * 0.5, h.wound || 'burn', h.src || 'Suelo peligroso', h.el); } }
      if (h.team === 'p') for (const f of FOES.slice()) { const d = dist(h.x, h.y, f.x, f.y); if (d < h.r + f.D.s) { f.hp -= h.dps * dt; if (h.kind === 'hole' && !f.boss && d > 6) { f.x += (h.x - f.x) / d * 90 * dt; f.y += (h.y - f.y) / d * 90 * dt; } if (f.hp <= 0) killFoe(f); } }
    }
    if (h.t <= 0) {
      if (h.dmg) {
        if (h.kind === 'line') { const ex = h.x + Math.cos(h.ang) * h.len, ey = h.y + Math.sin(h.ang) * h.len; if (segDist(S.player.x, S.player.y, h.x, h.y, ex, ey) < h.w / 2 + 6) hitPlayer(h.dmg, h.wound, h.src, h.el); FX.push({ x: h.x, y: h.y, x2: ex, y2: ey, bolt: 1, t: 0.25, c: h.c, wide: h.w }); }
        else if (h.team === 'e') { if (dist(h.x, h.y, S.player.x, S.player.y) < h.r) hitPlayer(h.dmg, h.wound, h.src, h.el); FX.push({ x: h.x, y: h.y, ring: h.r, t: 0.35, c: h.c }); if (h.shake) shake = 0.35; }
        else explode(h.x, h.y, h.r, h.dmg, 'p', h.el);
      }
      HAZ.splice(i, 1);
    }
  }
  for (let i = FX.length - 1; i >= 0; i--) { FX[i].t -= dt; if (FX[i].txt) FX[i].y -= 22 * dt; if (FX[i].t <= 0) FX.splice(i, 1); }
  // Torretas y sensores
  if (L.turret) for (const b of L.turret) { if (!runnable(b) || (b.E || 0) < 15) continue; b.tcd = (b.tcd || 0) - dt; if (b.tcd > 0) continue; const cx = b.x * T + 16, cy = b.y * T + 16, f = nearestFoe(cx, cy, (9 + (typeof trFx === 'function' ? trFx(b, 'range', 0) : 0)) * T); if (!f) continue; b.tcd = 0.6; b.E -= 15; b.aim = Math.atan2(f.y - cy, f.x - cx); PROJ.push({ x: cx, y: cy, vx: Math.cos(b.aim) * 26 * T, vy: Math.sin(b.aim) * 26 * T, r: 4, dmg: 12 * (typeof trFx === 'function' ? trFx(b, 'dmg', 1) : 1), c: '#5af0ff', team: 'p', life: 1, hit: new Set() }); }
  refreshBossBar();
}
var shake = 0;
function segDist(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1) : 0; return Math.hypot(px - ax - dx * t, py - ay - dy * t); }
// ---------- Barra del jefe ----------
function buildBossBar() { const el = $('bossBar'), D = BOSS.D; el.hidden = false; el.innerHTML = `<div class="bbn">☠ ${esc(D.n)}</div><div class="bbb"><i></i><span class="m1"></span><span class="m2"></span></div>`; }
function refreshBossBar() { if (!BOSS) return; const el = $('bossBar'); if (el.hidden) buildBossBar(); const f = BOSS.hp / BOSS.mhp; el.querySelector('i').style.width = (f * 100).toFixed(1) + '%'; el.classList.toggle('rage', f < 0.25); el.classList.toggle('shield', BOSS.shieldT > 0); }
// ---------- Sonido: efectos y música de batalla (sintetizada, sin archivos) ----------
let AC = null, MG = null, _mus = null;
function audio() { if (S && S.mute) return null; if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); MG = AC.createGain(); MG.gain.value = 0.5; MG.connect(AC.destination); } catch (e) { return null; } } if (AC.state === 'suspended') AC.resume(); return AC; }
function tone(f, d, type = 'square', v = 0.08, slide = 0, when = 0, dest) {
  const a = audio(); if (!a) return; const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(dest || MG); o.start(t); o.stop(t + d + 0.02);
}
function noise(d, v = 0.1, hp = 800, when = 0, dest) {
  const a = audio(); if (!a) return; const t = a.currentTime + when, n = Math.max(1, Math.floor(a.sampleRate * d)), buf = a.createBuffer(1, n, a.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  s.connect(f); f.connect(g); g.connect(dest || MG); s.start(t);
}
let _sfxT = {};
function sfx(k) {
  const now = performance.now(); if (now - (_sfxT[k] || 0) < 60) return; _sfxT[k] = now;
  switch (k) { case 'hurt': tone(180, 0.18, 'sawtooth', 0.09, 0.5); break; case 'swing': noise(0.08, 0.05, 2500); break; case 'shoot': tone(700, 0.08, 'triangle', 0.05, 0.6); break; case 'gun': noise(0.12, 0.12, 400); tone(120, 0.1, 'square', 0.05, 0.4); break; case 'spell': tone(520, 0.25, 'sine', 0.06, 2); break; case 'boom': noise(0.4, 0.18, 120); tone(80, 0.35, 'sine', 0.12, 0.4); break; case 'dash': noise(0.12, 0.06, 1500); break; case 'alarm': tone(880, 0.15, 'square', 0.06); tone(660, 0.15, 'square', 0.06, 1, 0.16); break; case 'beep': tone(1200, 0.06, 'square', 0.04); break; }
}
function bossRoar() { tone(90, 0.9, 'sawtooth', 0.12, 0.5); noise(0.8, 0.1, 200); }
// Música épica: bajo ostinato, tambores, arpegio y coro en tonalidad menor (cambia según el jefe)
function bossMusic(on, k) {
  if (_mus) { clearInterval(_mus.iv); const g = _mus.g; if (AC) { g.gain.setTargetAtTime(0, AC.currentTime, 0.6); setTimeout(() => g.disconnect(), 3000); } _mus = null; }
  if (!on) return; const a = audio(); if (!a) return;
  const g = a.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.55, a.currentTime, 1.2); g.connect(MG);
  const dl = a.createDelay(); dl.delayTime.value = 0.3; const fb = a.createGain(); fb.gain.value = 0.3; dl.connect(fb); fb.connect(dl); dl.connect(g);
  const roots = [45, 50, 52, 47, 43, 48], h = [...(k || 'x')].reduce((s, c) => s + c.charCodeAt(0), 0), root = roots[h % roots.length], bpm = 140 + (h % 4) * 8, st = 60 / bpm / 4;
  const prog = [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  let step = 0, next = a.currentTime + 0.1;
  _mus = { g, iv: setInterval(() => {
    if (!AC) return;
    while (next < AC.currentTime + 0.25) {
      const bar = Math.floor(step / 16) % 8, ch = prog[Math.floor(bar / 2)], s = step % 16, when = next - AC.currentTime;
      if (s % 4 === 0 || s === 10) { tone(60, 0.25, 'sine', 0.35, 0.35, when, g); }
      if (s === 4 || s === 12) noise(0.18, 0.22, 900, when, g);
      if (s % 2 === 0) noise(0.04, 0.05, 6000, when, g);
      if (s % 2 === 0) tone(mtof(root - 12 + ch[0] + (s % 8 === 6 ? 12 : 0)), st * 1.8, 'sawtooth', 0.11, 1, when, g);
      tone(mtof(root + 12 + ch[(step >> 1) % 3] + (s >= 8 ? 12 : 0)), st * 0.9, 'square', 0.035, 1, when, dl);
      if (s === 0) for (const n of ch) { tone(mtof(root + n), st * 16, 'triangle', 0.05, 1, when, g); tone(mtof(root + n) * 1.005, st * 16, 'sawtooth', 0.018, 1, when, g); }
      step++; next += st;
    }
  }, 100) };
}
