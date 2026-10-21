'use strict';
// =====================================================================================
//  Pesca. Con una caña en la mano: clic en el agua → el corcho vuela en arco y flota.
//  Mordisquitos de aviso… y cuando se hunde del todo («¡Pica!») tienes un instante para
//  hacer clic. Entonces empieza el minijuego: mantén pulsado para subir la zona verde y
//  suéltalo para que baje; si el pez está dentro, la barra de captura se llena.
//  Qué sale depende del agua (dulce, mar, cálida, fría, profunda, pantano), la hora, la
//  caña, el cebo, tu suerte y tu nivel de Pesca. Clic derecho recoge el sedal.
// =====================================================================================
SKILLS.fish = ['Pesca', '🎣', 'Picadas más rápidas, zona verde más grande y más peces raros por nivel.'];
const FSH = { st: 0, md: false };
// Las cañas se gastan con cada captura
const _maxDur0 = maxDur;
maxDur = id => { const r = ITEMS[id] && ITEMS[id].rod; return r ? [80, 160, 320][r.tier] : _maxDur0(id); };
const heldRod = () => { const id = heldId(); return !ui.hand && id && ITEMS[id] && ITEMS[id].rod ? ITEMS[id].rod : null; };
function waterKind(tx, ty) {
  const g = GI[gnd(tx, ty)], B = BIOMES[biomeOf(tx, ty)];
  if (g.key === 'SWAMPWATER' || g.key === 'LILYPAD') return 'swamp';
  if (g.key === 'DEEP') return 'deep';
  if (g.key === 'WARMWATER' || g.key === 'REEF') return 'warm';
  if (g.key === 'COLDWATER') return 'cold';
  return B && B.ocean ? 'sea' : 'fresh';
}
const WATER_N = { fresh: 'agua dulce', sea: 'mar', warm: 'agua cálida', cold: 'agua fría', deep: 'agua profunda', swamp: 'pantano' };
const isWaterAt = (x, y) => { const g = GI[gnd(Math.floor(x / T), Math.floor(y / T))]; return g.liquid === 'water'; };
// Elige la captura
function rollCatch(kind, rod) {
  const night = daylight() < 0.3, bait = invCount('bait') > 0, rare = 1 + CM().luck + (bait ? 0.35 : 0) + rod.tier * 0.25 + lvOf('fish') * 0.06;
  let tot = 0; const opts = [];
  for (const id in FISH_TABLE) {
    const f = FISH_TABLE[id]; let w = f.w[kind] || 0; if (!w || (f.tier || 0) > rod.tier || (f.nightOnly && !night) || !ITEMS[id]) continue;
    if (night && f.night) w *= f.night; if (f.d > 0.5) w *= rare; if (f.junk) w *= Math.max(0.3, 1 - lvOf('fish') * 0.07);
    opts.push([id, w]); tot += w;
  }
  let r = Math.random() * tot; for (const [id, w] of opts) if ((r -= w) <= 0) return id;
  return 'fish';
}
function fishStop(msg) { if (msg) toast(msg); FSH.st = 0; }
function fishCast(rod) {
  const p = S.player, mw = mouseWorld(); let dx = mw.x - p.x, dy = mw.y - p.y; const d = Math.hypot(dx, dy) || 1, mx = rod.cast * T;
  if (d > mx) { dx *= mx / d; dy *= mx / d; }
  const tx = p.x + dx, ty = p.y + dy;
  if (!isWaterAt(tx, ty)) { toastErr('Lanza la caña al agua'); return; }
  if (P.swim === 2) { toastErr('No puedes pescar mientras nadas en agua profunda'); return; }
  Object.assign(FSH, { st: 1, t: 0, dur: 0.35 + Math.hypot(dx, dy) / T * 0.05, sx: p.x, sy: p.y - 20, bx: tx, by: ty, tx, ty, rod, kind: waterKind(Math.floor(tx / T), Math.floor(ty / T)) });
  noise(0.1, 0.04, 2200); P.swing = 0.2; P.swingA = Math.atan2(dy, dx);
}
const fishWait = rod => (2.5 + Math.random() * 7) / rod.speed / (invCount('bait') > 0 ? 1.6 : 1) / (1 + lvOf('fish') * 0.05);
function fishTick(dt) {
  const F = FSH, rod = heldRod(), click = mouse.down && !F.md; F.md = mouse.down;
  if (!rod) { if (F.st) fishStop(); return; }
  if (F.st === 0) { if (click && !ui.open) fishCast(rod); return; }
  const p = S.player;
  if (Math.hypot(p.x - F.bx, p.y - F.by) > (F.rod.cast + 3) * T) { fishStop('El sedal se ha soltado: estás demasiado lejos'); return; }
  if (mouse.rdown && F.st !== 4) { fishStop(); return; }
  F.t += dt;
  if (F.st === 1) { // en el aire
    const k = Math.min(1, F.t / F.dur); F.bx = F.sx + (F.tx - F.sx) * k; F.by = F.sy + (F.ty - F.sy) * k; F.bz = Math.sin(k * Math.PI) * 30;
    if (k >= 1) { F.st = 2; F.bz = 0; F.wait = fishWait(F.rod); F.nib = 0.8 + Math.random(); splash(F.bx, F.by, 5); }
    return;
  }
  if (F.st === 2) { // flotando
    if (click) { fishStop(); return; } // recoger antes de tiempo
    F.wait -= dt; F.nib -= dt;
    if (F.nib <= 0) { F.nib = 0.7 + Math.random() * 1.6; F.dip = 0.25; ripple(F.bx, F.by, 6, 0.6); }
    if (F.wait <= 0) { F.st = 3; F.bite = 0.75 + lvOf('fish') * 0.04; F.catch = rollCatch(F.kind, F.rod); splash(F.bx, F.by, 6); tone(880, 0.08, 'square', 0.05); tone(1100, 0.1, 'square', 0.05, 1, 0.09); }
  } else if (F.st === 3) { // ¡pica!
    F.bite -= dt;
    if (click) {
      const c = FISH_TABLE[F.catch];
      if (!c.d) { fishLand(); return; } // basura: sale sola
      const z = 0.2 + F.rod.zone + lvOf('fish') * 0.012;
      Object.assign(F, { st: 4, zp: 0.5, zv: 0, zw: z, fp: 0.5, fv: 0, ft: 0.5, fT: 0, prog: 0.3, d: c.d });
    } else if (F.bite <= 0) { F.st = 2; F.wait = fishWait(F.rod); toast('Se ha escapado… ¡atento al corcho!'); }
  } else if (F.st === 4) { // minijuego
    // El pez busca puntos al azar: cuanto más difícil, más rápido y más a menudo cambia
    F.fT -= dt; if (F.fT <= 0) { F.fT = (0.25 + Math.random() * 1.1) / (0.6 + F.d); F.ft = Math.random() < 0.15 + F.d * 0.3 ? (Math.random() < 0.5 ? 0.05 : 0.95) : Math.random(); }
    F.fv += (F.ft - F.fp) * (3 + F.d * 9) * dt; F.fv *= Math.pow(0.04, dt); F.fp = clamp(F.fp + F.fv * dt * 3, 0, 1);
    // Tu zona: sube mientras mantienes pulsado, cae al soltar
    F.zv += (mouse.down ? 2.4 : -2.1) * dt; F.zv *= Math.pow(0.35, dt); F.zp += F.zv * dt;
    const h = F.zw / 2; if (F.zp < h) { F.zp = h; F.zv = Math.abs(F.zv) * 0.3; } if (F.zp > 1 - h) { F.zp = 1 - h; F.zv = -Math.abs(F.zv) * 0.3; }
    const inZ = Math.abs(F.fp - F.zp) <= h; F.in = inZ;
    F.prog += (inZ ? 0.34 : -0.22 * (0.7 + F.d * 0.6)) * dt;
    if (inZ && Math.random() < dt * 6) ripple(F.bx + (Math.random() - 0.5) * 8, F.by, 5, 0.5);
    if (F.prog >= 1) fishLand();
    else if (F.prog <= 0) { fishStop('¡Se ha soltado! ' + ITEMS[F.catch].n + ' se escapa'); wearHeld(1); }
  }
  if (F.dip > 0) F.dip -= dt;
}
function fishLand() {
  const F = FSH, id = F.catch, c = FISH_TABLE[id], n = c.n || 1;
  if (invAdd(id, n)) { toastErr('Inventario lleno: lo devuelves al agua'); }
  else {
    FX_CATCH.push({ id, x: F.bx, y: F.by, t: 0 });
    toast(`🎣 ${c.junk ? 'Has sacado' : '¡Capturado!'}: ${ITEMS[id].n}${n > 1 ? ' ×' + n : ''}${c.junk ? '' : ' · ' + WATER_N[F.kind]}`);
    gainXP('fish', c.junk ? 1 : 2 + Math.round(c.d * 10));
    if (!c.junk && invCount('bait') > 0) invTake('bait', 1);
    tone(660, 0.1, 'triangle', 0.05, 1.5); tone(990, 0.14, 'triangle', 0.05, 1, 0.1);
  }
  splash(F.bx, F.by, 10); wearHeld(1); F.st = 0;
}
// Cofre hundido
function fishUse(s) {
  if (s.id !== 'sunkenChest') return false;
  const pool = [['goldCoin', 6], [MF.gold && MF.gold.ingot, 3], [MF.iron && MF.iron.ingot, 5], ['pearl', 2], ['diamond', 1], ['emerald', 1], ['ruby', 1], ['sapphire', 1], ['bait', 6], ['rope', 3], ['goldfish', 1], ['compass', 1]].filter(([id]) => id && ITEMS[id]);
  const got = [];
  for (let i = 0; i < 3; i++) { const [id, m] = pool[(Math.random() * pool.length) | 0], n = 1 + ((Math.random() * m) | 0); invAdd(id, n); got.push(ITEMS[id].n + (n > 1 ? ' ×' + n : '')); }
  if (--s.n <= 0) S.inv[S.inv.indexOf(s)] = null; invVersion++;
  toast('🧰 Dentro del cofre: ' + got.join(', '), true); tone(520, 0.2, 'triangle', 0.05, 1.6);
  return true;
}
// ---------- Dibujo ----------
const FX_CATCH = [];
function drawFishing(ctx, x, y) {
  const F = FSH, now = performance.now() / 1000;
  // Peces que saltan del agua hacia ti
  for (let i = FX_CATCH.length - 1; i >= 0; i--) { const f = FX_CATCH[i]; f.t += 1 / 60; const k = Math.min(1, f.t / 0.55); if (k >= 1) { FX_CATCH.splice(i, 1); continue; }
    const fx = f.x + (x - f.x) * k, fy = f.y + (y - 10 - f.y) * k - Math.sin(k * Math.PI) * 40; drawItem(ctx, f.id, fx, fy, 14); }
  if (!F.st) return;
  // Punta de la caña: delante de la mano, hacia el corcho
  const a = Math.atan2(F.by - S.player.y, F.bx - S.player.x), hx = x + Math.cos(a) * 9, hy = y - 4 + Math.sin(a) * 5, tipx = hx + Math.cos(a) * 16, tipy = hy - 16 + Math.sin(a) * 4;
  ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tipx, tipy); ctx.stroke();
  // Corcho: flota, mordisquea y se hunde al picar
  const bite = F.st === 3, fight = F.st === 4, dip = (F.dip > 0 ? 2 : 0) + (bite ? 3 + Math.sin(now * 40) : 0) + (fight ? 2 + Math.sin(now * 25) * 1.5 : 0);
  const bx = F.bx + (fight ? (F.fp - 0.5) * 10 : 0), byy = F.by - (F.bz || 0) + Math.sin(now * 3) * 0.8 + dip;
  // Sedal con comba (tenso al pelear)
  const sag = fight ? 2 : bite ? 6 : 14; ctx.strokeStyle = 'rgba(240,240,240,.8)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(tipx, tipy); ctx.quadraticCurveTo((tipx + bx) / 2, Math.max(tipy, byy) + sag, bx, byy - 2); ctx.stroke();
  if (F.st >= 2) { ctx.save(); ctx.beginPath(); ctx.rect(bx - 6, byy - 8, 12, 8 + (bite || fight ? 0 : 1)); ctx.clip(); }
  ctx.fillStyle = '#f4f4f0'; ctx.beginPath(); ctx.arc(bx, byy, 3, 0, 7); ctx.fill(); ctx.fillStyle = '#e03a2a'; ctx.beginPath(); ctx.arc(bx, byy, 3, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#2a2a2a'; ctx.fillRect(bx - 0.5, byy - 6, 1, 3);
  if (F.st >= 2) ctx.restore();
  if (bite) { ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd34a'; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 3; const yy = y - 44 - Math.abs(Math.sin(now * 12)) * 3; ctx.strokeText('¡Pica! Clic', x, yy); ctx.fillText('¡Pica! Clic', x, yy); }
  if (fight) drawReel(ctx, x, y);
}
// Minijuego: barra vertical junto al personaje
function drawReel(ctx, x, y) {
  const F = FSH, bx = x + 22, top = y - 58, H = 52, W = 10, now = performance.now() / 1000;
  ctx.fillStyle = 'rgba(14,20,28,.82)'; ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(bx - 2, top - 2, W + 10, H + 4, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(70,110,150,.5)'; ctx.fillRect(bx, top, W, H);
  // Zona verde (abajo = 0)
  const zh = F.zw * H, zy = top + H - F.zp * H - zh / 2;
  ctx.fillStyle = F.in ? 'rgba(110,230,120,.85)' : 'rgba(110,200,120,.55)'; ctx.fillRect(bx, zy, W, zh);
  // Pez
  const fy = top + H - F.fp * H; ctx.fillStyle = ITEMS[F.catch].c; ctx.beginPath(); ctx.ellipse(bx + W / 2, fy, 4, 2.5, Math.sin(now * 10) * 0.3, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(bx + W / 2 + 3, fy); ctx.lineTo(bx + W / 2 + 6, fy - 2.5); ctx.lineTo(bx + W / 2 + 6, fy + 2.5); ctx.fill();
  // Progreso de captura
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(bx + W + 2, top, 4, H);
  ctx.fillStyle = F.prog > 0.66 ? '#6ee07a' : F.prog > 0.33 ? '#f0c040' : '#e05a4a'; ctx.fillRect(bx + W + 2, top + H * (1 - F.prog), 4, H * F.prog);
  ctx.font = '8px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillText('mantén clic', bx + 7, top + H + 10);
}
