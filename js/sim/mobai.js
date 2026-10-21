'use strict';
// =====================================================================================
//  Inteligencia de animales y enemigos.
//  · Dirección suave (aceleran y frenan), se apartan unos de otros (no se amontonan) y
//    esquivan obstáculos tanteando con «antenas»; si se atascan, buscan otro camino.
//  · Cada criatura tiene su carácter (un poco más rápida o lenta, asustadiza, curiosa,
//    perezosa, sociable, valiente…): las diferencias son pequeñas, no rompen el equilibrio.
//  · Animales: pastan, descansan, andan en manada, se alertan (miran) antes de huir, el
//    pánico se contagia a la manada, los curiosos se acercan si estás quieto, de noche los
//    diurnos duermen y los nocturnos salen. Corren más si tú corres (haces ruido).
//  · Enemigos: rodean al objetivo (cada uno por su lado), los de distancia se mueven en
//    círculo, los heridos se retiran un momento, y patrullan cuando no te han visto.
// =====================================================================================
const NOCTURNAL = new Set(['owl', 'raccoon', 'shadowcat', 'wolf', 'frostwolf', 'bat', 'fox', 'hedgehog', 'wisp', 'basilisk']);
const HERD = new Set(['deer', 'sheep', 'goat', 'cow', 'zebra', 'horse', 'giraffe', 'moose', 'elephant', 'bison', 'camel', 'llama', 'penguin', 'chicken', 'duck', 'pig', 'kangaroo', 'boar', 'reindeer', 'yak', 'antelope', 'wolf', 'frostwolf', 'lion', 'dolphin', 'fish', 'seal', 'hippo']);
// Carácter estable por criatura (sale de su posición de nacimiento: no hace falta guardarlo)
function mobPers(o, seed) {
  const h = i => hash2(Math.floor(o.x), Math.floor(o.y), seed + i);
  return { spd: 0.88 + h(1) * 0.24, skit: h(2), cur: h(3), lazy: h(4), soc: h(5), bold: h(6), flank: (h(7) - 0.5) * 1.6, turn: 3 + h(8) * 3 };
}
// ---------- Rejilla para buscar vecinos rápido ----------
const _grid = new Map(); let _gridOf = null;
function buildGrid(list) {
  _grid.clear(); _gridOf = list;
  for (const o of list) { const k = Math.floor(o.x / 96) * 65536 + Math.floor(o.y / 96); let c = _grid.get(k); if (!c) _grid.set(k, c = []); c.push(o); }
}
function neighbors(o, r, fn) {
  const gx = Math.floor(o.x / 96), gy = Math.floor(o.y / 96), n = Math.ceil(r / 96);
  for (let dy = -n; dy <= n; dy++) for (let dx = -n; dx <= n; dx++) { const c = _grid.get((gx + dx) * 65536 + gy + dy); if (c) for (const q of c) if (q !== o) fn(q); }
}
// ---------- Dirección con esquiva ----------
// Gira poco a poco hacia la dirección deseada (+ separación). Si delante hay obstáculo prueba
// ángulos alternos; si lleva un rato sin avanzar, elige un desvío durante un segundo.
const FEELERS = [0, 0.45, -0.45, 0.9, -0.9, 1.35, -1.35, 1.9, -1.9, 2.6, -2.6];
function steerMove(o, dirA, speed, dt, ok, sepR, sepW) {
  // Separación de los vecinos (más fuerte cuanto más cerca)
  let sx = 0, sy = 0;
  if (sepR) neighbors(o, sepR, q => { const dx = o.x - q.x, dy = o.y - q.y, d = Math.hypot(dx, dy) || 0.01, rr = sepR + (q.rad || 0); if (d < rr) { const f = (rr - d) / rr; sx += dx / d * f; sy += dy / d * f; } });
  let wx = Math.cos(dirA) + sx * sepW, wy = Math.sin(dirA) + sy * sepW;
  if (o.detT > 0) { o.detT -= dt; wx = Math.cos(o.detA); wy = Math.sin(o.detA); }
  const want = Math.atan2(wy, wx);
  // Giro suave (no da tumbos de un lado a otro)
  const cur = o.va ?? want; let da = want - cur; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
  o.va = cur + da * Math.min(1, dt * (o.pers ? o.pers.turn * 2 : 8));
  // Aceleración
  o.vs = (o.vs || 0) + (speed - (o.vs || 0)) * Math.min(1, dt * 5);
  const step = o.vs * dt; if (step < 0.01) return 0;
  for (const off of FEELERS) {
    const a = o.va + off, nx = o.x + Math.cos(a) * step, ny = o.y + Math.sin(a) * step, ax = o.x + Math.cos(a) * (step + 10), ay = o.y + Math.sin(a) * (step + 10);
    if (ok(nx, ny) && ok(ax, ay)) {
      o.x = nx; o.y = ny; if (off) o.va = a;
      const c = Math.cos(a); if (Math.abs(c) > 0.25) o.face = c > 0 ? 1 : -1;
      // ¿Atascado? (avanza mucho menos de lo que debería)
      o.prog = (o.prog || 0) * 0.9 + Math.hypot(Math.cos(a) * step, Math.sin(a) * step) * (Math.abs(off) > 1.3 ? 0.3 : 1);
      return step;
    }
  }
  // Todo bloqueado: desvío al azar un momento
  o.vs *= 0.3; o.stuck = (o.stuck || 0) + dt;
  if (o.stuck > 0.6) { o.stuck = 0; o.detT = 0.8 + Math.random() * 0.8; o.detA = o.va + Math.PI * (0.5 + Math.random()); }
  return 0;
}
// ---------- Animales ----------
function faunaTick(dt) {
  const p = S.player, px = p.x, py = p.y, R = 3 * CS * T, night = daylight() < 0.3;
  const noise = pmove.sprint ? 1.6 : pmove.moving ? 1 : 0.55; // correr te delata; quieto casi no te ven
  buildGrid(ANIMALS);
  for (let i = ANIMALS.length - 1; i >= 0; i--) {
    const a = ANIMALS[i], sp = SPECIES[a.sp]; if (!sp) continue;
    const dx = a.x - px, dy = a.y - py, d2 = dx * dx + dy * dy;
    if (d2 > R * R * 4) continue; // lejos: congelado
    if (!a.pers) { a.pers = mobPers(a, 4401); a.rad = sp.s * 0.8; }
    const P2 = a.pers, d = Math.sqrt(d2);
    if (sp.fly || sp.wings) a.ph += dt * (sp.wings ? 18 : 8);
    if (a.frz > 0) { a.frz -= dt; continue; } // congelado por un arma de escarcha
    // Depredadores: persiguen y atacan (survival.js)
    const hs = HOSTILE[a.sp] ? hostileStep(a, sp, d2, dt) : false;
    if (hs === 'hold') { a.vs = 0; a.face = px > a.x ? 1 : -1; continue; }
    const ok = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); return !!peekChunk(tx >> CSH, ty >> CSH) && canStand(sp, tx, ty); };
    const sleepy = !hs && (NOCTURNAL.has(a.sp) ? !night && daylight() > 0.7 : night) && !sp.aq;
    // Detección: depende del tamaño, del carácter y del ruido que haces
    const det = (2.5 + P2.skit * 3 + (sp.s < 6 ? 1 : 0)) * T * noise * (sleepy ? 0.5 : 1);
    let mode = a.mode || 'idle', dir = a.va ?? 0, spd = 0;
    if (hs === 'chase') { mode = 'chase'; }
    else if (sp.s < 11 + P2.bold * 3 && d < det && mode !== 'flee') {
      // Primero se alerta (te mira), luego huye; la manada se contagia
      if (mode !== 'alert') { mode = 'alert'; a.al = 0.25 + P2.bold * 0.6 * (pmove.sprint ? 0.3 : 1); }
    }
    if (mode === 'alert') { a.al -= dt; a.face = px > a.x ? 1 : -1; if (a.al <= 0 || d < det * 0.55) { mode = 'flee'; a.ft = 2.5 + P2.skit * 2; panicHerd(a, sp); } else if (d > det * 1.3) mode = 'idle'; }
    if (mode === 'flee') {
      a.ft -= dt; if (a.ft <= 0 && d > det * 1.4) { mode = 'idle'; a.t = 1 + Math.random() * 2; a.rest = true; }
      dir = Math.atan2(dy, dx) + (P2.flank * 0.4); spd = sp.v * T * (1.7 + P2.skit * 0.4) * P2.spd * (d > det * 1.2 ? 0.7 : 1);
    } else if (mode === 'chase') {
      dir = Math.atan2(py - a.y, px - a.x) + P2.flank * Math.min(1, d / (6 * T)) * 0.5; spd = sp.v * T * 1.15 * P2.spd;
      if (!a.ag) mode = 'idle';
    } else if (mode === 'idle') {
      a.t -= dt;
      // Curiosos: si estás quieto cerca, se acercan despacio hasta unos pasos
      if (P2.cur > 0.75 && !pmove.moving && d < 7 * T && d > 2.5 * T && !HOSTILE[a.sp] && !sleepy) { dir = Math.atan2(py - a.y, px - a.x); spd = sp.v * T * 0.35; a.rest = false; }
      else {
        if (a.t <= 0) {
          a.rest = Math.random() < (sleepy ? 0.85 : 0.3 + P2.lazy * 0.35 + wxBeastRest()); // con mal tiempo se refugian
          a.t = a.rest ? (sleepy ? 6 : 2) + Math.random() * (3 + P2.lazy * 6) : 2 + Math.random() * 4;
          let tx = a.x + (Math.random() - 0.5) * 10 * T, ty = a.y + (Math.random() - 0.5) * 10 * T;
          // Manada: el destino tira hacia el centro del grupo
          if (HERD.has(a.sp)) { const h = herdCenter(a); if (h) { const k = 0.4 + P2.soc * 0.4; tx = tx * (1 - k) + h.x * k; ty = ty * (1 - k) + h.y * k; } }
          a.tx = tx; a.ty = ty;
        }
        if (!a.rest) { const mx = a.tx - a.x, my = a.ty - a.y, ml = Math.hypot(mx, my); if (ml < 6) { a.rest = true; a.t = 1 + Math.random() * 3; } else { dir = Math.atan2(my, mx); spd = sp.v * T * (0.45 + (1 - P2.lazy) * 0.25) * P2.spd; } }
      }
    }
    a.mode = mode; a.sleep = sleepy && a.rest && mode === 'idle';
    const ox = a.x, oy = a.y;
    const moved = spd > 0 ? steerMove(a, dir, spd, dt, ok, sp.s + 8, mode === 'flee' ? 0.6 : 1.3) : (a.vs = 0, 0);
    // Paso de las patas según lo que avanza (no patinan)
    if (!(sp.fly || sp.wings)) a.ph += moved / (2.2 + sp.s * 0.35);
    a.rest = moved === 0 && mode === 'idle' ? a.rest || spd === 0 : false;
    if (moved && mode === 'idle' && Math.hypot(a.x - ox, a.y - oy) < 0.01) a.t = 0;
    // ¿Ha pisado una trampa?
    const tx = Math.floor(a.x / T), ty = Math.floor(a.y / T), b = at(tx, ty);
    if (b && b.type === 'trap' && !sp.fly && !sp.aq && total(b.out) < 32) { for (const [id, n] of sp.drops) dictAdd(b.out, id, n); b.caught = (b.caught || 0) + 1; ANIMALS.splice(i, 1); }
  }
  separate(ANIMALS.filter(a => !SPECIES[a.sp].fly && !SPECIES[a.sp].aq), dt);
  // Repoblación lenta en chunks cercanos que se han quedado vacíos
  _faunaRespawn += dt;
  if (_faunaRespawn > 45) {
    _faunaRespawn = 0;
    const pcx = Math.floor(px / T / CS), pcy = Math.floor(py / T / CS);
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const c = peekChunk(pcx + dx, pcy + dy);
      if (c && c.faunaDone && !ANIMALS.some(a => a.ck === ckey(c.cx, c.cy))) { c.faunaDone = false; c._fn = 0; spawnFauna(c); }
    }
  }
}
function herdCenter(a) {
  let n = 0, x = 0, y = 0; neighbors(a, 8 * T, q => { if (q.sp === a.sp) { n++; x += q.x; y += q.y; } });
  return n ? { x: x / n, y: y / n } : null;
}
// El pánico se contagia: los de su especie cercanos huyen también (con un pequeño retraso)
function panicHerd(a, sp) {
  if (!HERD.has(a.sp)) return;
  neighbors(a, 6 * T, q => { if (q.sp === a.sp && q.mode !== 'flee') { q.mode = 'alert'; q.al = 0.1 + Math.random() * 0.35; } });
}
// ---------- Enemigos ----------
const foeWho = D => D.phase ? { phase: 1, fly: 1 } : D.shape === 'fly' ? { fly: 1 } : null;
// Movimiento hacia (o lejos de) el objetivo: cada uno por su flanco, los de distancia en círculo
function foeMove(f, tx, ty, td, want, sp, dt) {
  const D = f.D; if (!f.pers) { f.pers = mobPers(f, 7703); f.rad = D.s; }
  const P2 = f.pers, who = foeWho(D), ok = (x, y) => passable(x, y, who) && !wardAt(x, y, true);
  let a = Math.atan2(ty - f.y, tx - f.x);
  // Heridos: algunos se retiran un momento para volver luego
  if (!f.minion && !D.undead && f.hp < f.mhp * 0.25 && P2.bold < 0.5 && !f.fled) { f.fled = 1; f.retT = 1.5 + P2.lazy * 1.5; }
  if (f.retT > 0) { f.retT -= dt; want = -1; }
  if (want < 0) a += Math.PI;
  else if (D.ai === 'ranged' || D.ai === 'caster' || D.ai === 'summoner') { if (!want) { a += Math.PI / 2 * (P2.flank > 0 ? 1 : -1); want = 0.6; } }
  else if (td > 2.2 * T) a += P2.flank * Math.min(1, (td - 2 * T) / (5 * T)) * 0.7; // se abren para rodearte
  else { // cerca: cada uno ocupa su hueco alrededor del objetivo (te rodean en vez de hacer cola)
    const sa = P2.flank * Math.PI * 1.2 + (P2.cur - 0.5) * 0.8, gx = tx + Math.cos(sa) * (D.s + 12), gy = ty + Math.sin(sa) * (D.s + 12);
    a = Math.atan2(gy - f.y, gx - f.x); if (Math.hypot(gx - f.x, gy - f.y) < 4) return;
  }
  steerMove(f, a, sp * P2.spd * Math.abs(want) * wxFoeMul(), dt, ok, D.s + 10, 1.1);
}
// Patrulla tranquila mientras no te han visto
function foeWander(f, dt) {
  const D = f.D; if (!f.pers) { f.pers = mobPers(f, 7703); f.rad = D.s; }
  const who = foeWho(D), ok = (x, y) => passable(x, y, who) && !wardAt(x, y, true);
  f.wt = (f.wt || 0) - dt; if (f.wt <= 0) { f.wt = 2 + Math.random() * 3 + f.pers.lazy * 3; f.wa = Math.random() * 7; f.idle = Math.random() < 0.3 + f.pers.lazy * 0.3; }
  if (f.idle) { f.vs = 0; return; }
  steerMove(f, f.wa, D.v * T * 0.35 * f.pers.spd, dt, ok, D.s + 10, 1);
}
// Rejilla de enemigos (y aliados) una vez por fotograma
const _combatTick0 = combatTick;
combatTick = dt => { buildGrid(FOES); _combatTick0(dt); separate(FOES, dt, f => foeWho(f.D)); };
// Empujón suave entre los que se solapan aunque estén quietos (atacando, descansando…)
function separate(list, dt, whoOf) {
  buildGrid(list);
  for (const o of list) {
    const r0 = o.rad || (o.D ? o.D.s : 6); let px = 0, py = 0;
    neighbors(o, r0 + 24, q => { const dx = o.x - q.x, dy = o.y - q.y, d = Math.hypot(dx, dy) || 0.01, min = (r0 + (q.rad || 6)) * 0.95; if (d < min) { const f = (min - d) / min; px += dx / d * f; py += dy / d * f; } });
    if (!px && !py) continue;
    const k = 40 * dt, nx = o.x + px * k, ny = o.y + py * k, who = whoOf ? whoOf(o) : null;
    if (passable(nx, ny, who)) { o.x = nx; o.y = ny; }
  }
}
