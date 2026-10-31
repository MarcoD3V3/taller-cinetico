'use strict';
// =====================================================================================
//  Volar con alas (datos en data/wings.js):
//   · Salta (Espacio) y mantenlo pulsado: despegas y subes mientras te quede vuelo; al soltarlo
//     planeas hasta el suelo. El vuelo se recarga cuando pisas tierra.
//   · Volando pasas por encima del agua, las terrazas y la roca; los poderes de cada par
//     (curar, congelar, quemar, rayos, luz, defensa, sigilo…) solo funcionan en el aire.
//   · Impulsadores (F): empujón hacia donde miras y sus efectos.
//   · El dibujo va sincronizado: el aleteo marca el balanceo del cuerpo; plegadas en el suelo,
//     extendidas al planear y batiendo más rápido al subir o con un impulsador. También se ven en
//     los demás jugadores y en las fichas del personaje (van en el equipo).
// =====================================================================================
const WF = { on: false, fuel: 0, z: 0, ph: 0, rate: 0, open: 0, boost: null, powT: 0, lift: false };
const wingId = eq => { const id = eq && eq.back; const b = id && String(id).split('~')[0]; return WINGS[b] ? b : null; };
const wingOf = () => S && S.equip ? WINGS[wingId(S.equip)] || null : null;
// ---------- Vuelo ----------
{ const u0 = updatePlayer; updatePlayer = fdt => {
  const W = wingOf();
  if (!W) { if (WF.on) { WF.on = false; _flagVer = -1; } WF.boost = null; return u0(fdt); }
  const max = W.fly, inf = max === Infinity, space = keys.has(' ') && !ui.open && !keys.has('shift');
  if (!WF.on) {
    if ((P.z || 0) < 0.5) WF.fuel = Math.min(inf ? 1 : max, WF.fuel + fdt * (inf ? 1 : max) / 1.4 * (W.power === 'recharge' ? 2 : 1));
    if (space && (P.z || 0) > 4 && (inf || WF.fuel > 0.05) && P.swim !== 2) { WF.on = true; WF.z = P.z; tone(420, 0.08, 'sine', 0.03, 1.6); }
  }
  if (WF.on) {
    const B = WF.boost, floaty = B && B.glide > 0, night = W.power === 'night' && daylight() < 0.3;
    WF.lift = space && (inf || WF.fuel > 0 || floaty);
    // Con un cohete subes mucho más (hasta su altura); con las alas, hasta 34 px (11 m) y por encima te mantienes bajando despacio
    if (B && B.climb && B.t > 0) WF.z = Math.min(34 + B.climb, WF.z + B.lift * fdt);
    else if (WF.lift) { if (WF.z < 34) WF.z = Math.min(34, WF.z + 70 * fdt); else WF.z -= W.glide * 0.35 * fdt; if (!inf && !floaty) WF.fuel = Math.max(0, WF.fuel - fdt * (night ? 0.7 : 1)); }
    else WF.z -= W.glide * fdt * (floaty ? 0.15 : 1) * (WF.z > 34 ? 1.6 : 1);
    if (WF.z <= 0.5 && !(B && B.spd)) { WF.on = false; WF.z = 0; _flagVer = -1; dust(S.player.x, S.player.y + 8, 6); }
  }
  if (WF.on) { hasFlag('phoenixWings'); _flags.phoenixWings = true; }
  u0(fdt);
  // Aleteo: rápido al subir o con impulsador, quieto (alas abiertas) al planear, plegadas en el suelo
  // al planear también aletean despacio (y más si te mueves), para que nunca queden rígidas en el aire
  WF.rate = WF.on ? (WF.boost && WF.boost.spd ? 20 : WF.lift ? 13 : pmove.moving ? 6 : 3) : 0; WF.ph += WF.rate * fdt;
  WF.open += ((WF.on ? 1 : 0) - WF.open) * Math.min(1, fdt * 8);
  if (WF.on) { const vz = WF.z <= 34 ? WF.z : 34 + (WF.z - 34) * 0.4; P.z = Math.max(0.6, vz + (WF.rate ? Math.sin(WF.ph) * 1.4 : 0)); P.vz = 0; } // por encima de 11 m el dibujo sube menos (la altura real está en la barra)
  // Impulsador: empuja hacia donde miras
  const B = WF.boost; if (B) { B.t -= fdt; if (B.spd && WF.on) { const a = P.faceA || 0, v = (2.2 + B.spd) * T * fdt; movePlayer(Math.cos(a) * v, Math.sin(a) * v); if (Math.random() < 0.8) fxAdd({ x: S.player.x - Math.cos(a) * 10, y: S.player.y - WF.z, vx: -Math.cos(a) * 40 + (Math.random() - 0.5) * 30, vy: -Math.sin(a) * 40 + (Math.random() - 0.5) * 30, life: 0.45, t: 0, size: 2.4, col: B.c, glow: 1, drag: 2 }); }
    if (B.t <= 0) WF.boost = null; }
  // Poderes en el aire
  if (WF.on) { WF.powT -= fdt; if (WF.powT <= 0) { WF.powT = 0.5; wingPower(W, B); } }
}; }
function wingPower(W, B) {
  const p = S.player, near = (r, f) => FOES.filter(o => !o.boss || f).filter(o => dist(o.x, o.y, p.x, p.y) < r * T), pc = S.pc, b = S.buffs || (S.buffs = {});
  const pw = W.power;
  if (pw === 'night' && daylight() < 0.3 || pw === 'phase' || pw === 'infinite') b.stealth = Math.max(b.stealth || 0, 0.7);
  if ((pw === 'heal' || pw === 'phoenix' || pw === 'infinite') && pc && survOn()) pc.hp = Math.min(maxHp(), pc.hp + (pw === 'heal' ? 0.8 : pw === 'phoenix' ? 2 : 1.5));
  if (pw === 'regrow' && typeof cropAt === 'function') { const c = cropAt(Math.floor(p.x / T), Math.floor((p.y + 5) / T)); if (c && c.planted !== undefined) { c.planted -= 15; fxAdd({ x: p.x, y: p.y + 6, vx: 0, vy: -20, life: 0.6, t: 0, size: 2, col: '#7ae05a', glow: 1, drag: 1 }); } }
  if (pw === 'frost') for (const f of near(3, false)) { f.frz = Math.max(f.frz || 0, 1.2); fxAdd({ x: f.x, y: f.y, vx: 0, vy: -10, life: 0.5, t: 0, size: 2, col: '#bfe8ff', glow: 1, drag: 1 }); }
  if (pw === 'fire' || pw === 'phoenix') for (const f of near(2.5, true)) damageFoe(f, pw === 'phoenix' ? 14 : 7, 'fire');
  if (pw === 'storm' || pw === 'infinite') { WF.stormT = (WF.stormT || 0) - 0.5; if (WF.stormT <= 0) { WF.stormT = pw === 'storm' ? 1.2 : 2; const f = nearestFoe(p.x, p.y, 7 * T); if (f) { FX.push({ x: f.x, y: f.y - 200, x2: f.x, y2: f.y, bolt: 1, t: 0.2, c: '#f0f05a' }); damageFoe(f, pw === 'storm' ? 22 : 30, 'storm'); } } }
  if (B && B.aura) for (const f of near(2.2, true)) damageFoe(f, B.auraD || 8, B.aura);
  if (B && B.magnet && typeof magnetTick === 'function') { _flags.magnetGlove = true; magnetTick(); _flagVer = -1; }
}
// Velocidad, paso por encima de todo y defensa/luz de algunas alas
{ const s0 = speedMul; speedMul = () => { const v = s0(); if (!WF.on) return v; const W = wingOf(); return v * (W ? W.spd : 1) * (WF.boost && WF.boost.spd ? 1 + (WF.boost.spd - 1) * 0.5 : 1); }; }
{ const p0 = passable; passable = (x, y, who) => who === 'player' && WF.on && WF.z > 10 ? p0(x, y, { fly: 1 }) : p0(x, y, who); }
let _wcB = null, _wcO = null, _wcK = '';
{ const c0 = charMods; charMods = eqOver => { const m = c0(eqOver); if (eqOver || !WF.on) return m; const W = wingOf(); if (!W || !(W.power === 'armor' || W.power === 'infinite')) return m; if (m !== _wcB) { _wcB = m; _wcO = { ...m, def: (m.def || 0) + (W.power === 'armor' ? 6 : 8) }; } return _wcO; }; }
// Luz de algunas alas: un resplandor alrededor de ti por encima de la oscuridad de la noche
{ const w0 = drawWeatherScreen; drawWeatherScreen = (ctx, dt) => { w0(ctx, dt); const W = WF.on && wingOf(); if (!W || !(W.power === 'light' || W.power === 'infinite' || W.style === 'flame')) return;
  const dark = 1 - daylight(); if (dark < 0.15) return; const p = S.player, sx = (cw / 2 + (p.x - view.x) * view.z) * dpr, sy = (ch / 2 + (p.y - WF.z - view.y) * view.z) * dpr, r = (W.power === 'light' ? 10 : 7) * T * view.z * dpr;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r); g.addColorStop(0, `rgba(255,240,200,${0.35 * dark})`); g.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, r * 2, r * 2); ctx.restore(); }; }
// ---------- Impulsadores (F) ----------
{ const u0 = useItem; useItem = () => {
  const s = S.inv[S.sel]; if (!s) return u0(); const id = String(s.id).split('~')[0], B = BOOSTS[id]; if (!B) return u0();
  const W = wingOf(); if (!W) { toastErr('Necesitas alas o élitros en la espalda para usar impulsadores'); return true; }
  const p = S.player;
  if (B.blink) { const a = P.faceA || 0; let ok = 0; for (let d = B.blink; d >= 2 && !ok; d--) { const nx = p.x + Math.cos(a) * d * T, ny = p.y + Math.sin(a) * d * T; if (passable(nx, ny, { fly: 1 })) { fxBurst(p.x, p.y, 14, { col: B.c, sp: 80, life: 0.5, glow: 1 }); p.x = nx; p.y = ny; view.x = p.x; view.y = p.y; ok = 1; fxBurst(p.x, p.y, 14, { col: B.c, sp: 80, life: 0.5, glow: 1 }); } } if (!ok) { toastErr('No hay sitio hacia donde miras'); return true; } }
  if (!WF.on && !B.blink) { WF.on = true; WF.z = Math.max(P.z || 0, 12); _flagVer = -1; }
  if (B.fuel) WF.fuel = W.fly === Infinity ? 1 : Math.min(W.fly, WF.fuel + W.fly * B.fuel);
  if (B.spd || B.glide || B.aura || B.magnet) WF.boost = { ...B, t: B.t || 2 };
  if (B.heal && S.pc && survOn()) S.pc.hp = Math.min(maxHp(), S.pc.hp + B.heal);
  if (B.mana && S.pc && survOn()) S.pc.mana = Math.min(maxMana(), S.pc.mana + B.mana);
  if (B.ghost) P.iframe = Math.max(P.iframe || 0, B.t || 2);
  if (B.stealth) { const bf = S.buffs || (S.buffs = {}); bf.stealth = Math.max(bf.stealth || 0, B.stealth); }
  if (B.burst === 'frost') for (const f of FOES) if (dist(f.x, f.y, p.x, p.y) < 5 * T) f.frz = f.boss ? 1 : 3;
  if (B.burst === 'storm') { let n = 0; for (const f of FOES.slice()) if (n < 4 && dist(f.x, f.y, p.x, p.y) < 7 * T) { n++; FX.push({ x: p.x, y: p.y, x2: f.x, y2: f.y, bolt: 1, t: 0.25, c: '#f0f05a' }); damageFoe(f, 25, 'storm'); } }
  fxBurst(p.x, p.y - WF.z, B.spark ? 26 : 12, { col: B.c, sp: B.spark ? 140 : 80, life: 0.7, glow: 1, shape: B.spark ? 'star' : undefined });
  tone(180, 0.25, 'sawtooth', 0.04, 2.5); if (--s.n <= 0) S.inv[S.sel] = null; invVersion++;
  return true;
}; }
// ---------- Dibujo de las alas ----------
function wingPath(c, st, span, k, t, W) {
  // Dibuja una sola ala hacia +x desde el hombro (0,0). k: apertura 0..1
  const L = span * (0.55 + 0.45 * k), H = span * 0.9, c1 = W.c, c2 = W.c2;
  c.lineJoin = 'round'; c.lineCap = 'round';
  if (st === 'feather') { for (let i = 0; i < 6; i++) { const a = -1.0 + i * 0.32, len = L * (1 - i * 0.09); c.save(); c.rotate(a * (0.4 + 0.6 * k)); c.beginPath(); c.ellipse(len * 0.5, 0, len * 0.5, H * 0.09, 0, 0, 7); c.fillStyle = i % 2 ? c1 : shade2(c1, -0.08); c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 0.8; c.stroke(); c.fillStyle = c2; c.beginPath(); c.ellipse(len * 0.88, 0, len * 0.12, H * 0.07, 0, 0, 7); c.fill(); c.restore(); } return; }
  if (st === 'membrane') { const tips = [[L, -H * 0.55], [L * 0.85, -H * 0.05], [L * 0.6, H * 0.35]]; c.beginPath(); c.moveTo(0, 0); c.lineTo(L * 0.35, -H * 0.6); c.lineTo(tips[0][0], tips[0][1]); for (let i = 1; i < 3; i++) { const [x, y] = tips[i], [px, py] = tips[i - 1]; c.quadraticCurveTo((x + px) / 2 - 3, (y + py) / 2 + H * 0.12, x, y); } c.quadraticCurveTo(L * 0.25, H * 0.35, 0, H * 0.1); c.closePath(); c.fillStyle = c1; c.globalAlpha *= 0.92; c.fill(); c.globalAlpha /= 0.92; c.strokeStyle = shade2(c1, -0.4); c.lineWidth = 1.2; c.stroke();
    c.strokeStyle = c2; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 0); c.lineTo(L * 0.35, -H * 0.6); for (const [x, y] of tips) { c.moveTo(L * 0.35, -H * 0.6); c.lineTo(x, y); } c.stroke(); return; }
  if (st === 'elytra') { if (k > 0.2) { c.save(); c.globalAlpha *= 0.45; c.beginPath(); c.ellipse(L * 0.55, H * 0.15, L * 0.55, H * 0.28, 0.35, 0, 7); c.fillStyle = '#d8f0ff'; c.fill(); c.restore(); }
    c.save(); c.rotate(-0.15 + (1 - k) * 0.9); c.beginPath(); c.moveTo(0, -H * 0.15); c.quadraticCurveTo(L * 0.7, -H * 0.4, L * 0.75 * (0.5 + 0.5 * k) + 4, H * 0.15); c.quadraticCurveTo(L * 0.3, H * 0.35, 0, H * 0.2); c.closePath();
    const g = c.createLinearGradient(0, -H * 0.3, L * 0.6, H * 0.3); g.addColorStop(0, shade2(c1, 0.25)); g.addColorStop(1, shade2(c1, -0.3)); c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 1; c.stroke(); c.strokeStyle = c2; c.lineWidth = 1; c.beginPath(); c.moveTo(2, -H * 0.1); c.quadraticCurveTo(L * 0.5, -H * 0.25, L * 0.6 * (0.5 + 0.5 * k), H * 0.1); c.stroke(); c.restore(); return; }
  if (st === 'insect') { c.save(); c.globalAlpha *= 0.82; for (const [sx, sy, rx, ry, rot] of [[L * 0.5, -H * 0.3, L * 0.55, H * 0.38, -0.5], [L * 0.38, H * 0.25, L * 0.38, H * 0.25, 0.4]]) { c.beginPath(); c.ellipse(sx, sy, rx, ry, rot, 0, 7); const g = c.createRadialGradient(sx, sy, 1, sx, sy, rx); g.addColorStop(0, c2); g.addColorStop(1, c1); c.fillStyle = g; c.fill(); c.strokeStyle = shade2(c1, -0.45); c.lineWidth = 1; c.stroke(); }
    c.fillStyle = '#ffffff'; c.globalAlpha *= 0.8; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(L * (0.4 + i * 0.15), -H * (0.35 - i * 0.05), 1.4, 0, 7); c.fill(); } c.restore(); return; }
  if (st === 'mech') { c.strokeStyle = '#5a4a3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(L, -H * 0.4); c.stroke(); for (let i = 0; i < 3; i++) { c.save(); c.translate(L * (0.3 + i * 0.3), -H * 0.4 * (0.3 + i * 0.3)); c.rotate(i * 0.3 - 0.2); c.fillStyle = i % 2 ? shade2(c1, -0.1) : c1; c.fillRect(-2, 0, 5, H * (0.7 - i * 0.12)); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 0.8; c.strokeRect(-2, 0, 5, H * (0.7 - i * 0.12)); c.restore(); }
    c.save(); c.translate(L * 0.15, -H * 0.06); c.rotate(t * 4); c.fillStyle = c2; c.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = i % 2 ? 3.4 : 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.fillStyle = '#2a2a2a'; c.beginPath(); c.arc(0, 0, 1.5, 0, 7); c.fill(); c.restore(); return; }
  if (st === 'leaf') { for (let i = 0; i < 4; i++) { c.save(); c.rotate(-0.8 + i * 0.4 * (0.5 + 0.5 * k)); const len = L * (1 - i * 0.1); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -H * 0.18, len, 0); c.quadraticCurveTo(len * 0.5, H * 0.18, 0, 0); c.fillStyle = i % 2 ? c1 : shade2(c1, 0.12); c.fill(); c.strokeStyle = c2; c.lineWidth = 0.8; c.beginPath(); c.moveTo(1, 0); c.lineTo(len * 0.95, 0); c.stroke(); c.restore(); } return; }
  if (st === 'crystal') { c.save(); c.shadowColor = c1; c.shadowBlur = 6; for (let i = 0; i < 5; i++) { c.save(); c.rotate(-0.9 + i * 0.38 * (0.5 + 0.5 * k)); const len = L * (1.05 - i * 0.12); c.beginPath(); c.moveTo(0, 0); c.lineTo(len * 0.6, -H * 0.1); c.lineTo(len, 0); c.lineTo(len * 0.6, H * 0.1); c.closePath(); c.fillStyle = i % 2 ? c1 : c2; c.globalAlpha *= 0.88; c.fill(); c.globalAlpha /= 0.88; c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 0.7; c.stroke(); c.restore(); } c.restore(); return; }
  if (st === 'flame') { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { c.save(); const fl = Math.sin(t * 12 + i * 1.7) * 0.12; c.rotate(-1 + i * 0.3 * (0.5 + 0.5 * k) + fl); const len = L * (1 - i * 0.08) * (0.9 + Math.sin(t * 15 + i) * 0.1); c.beginPath(); c.moveTo(0, -2); c.quadraticCurveTo(len * 0.6, -H * 0.16, len, 0); c.quadraticCurveTo(len * 0.6, H * 0.16, 0, 2); const g = c.createLinearGradient(0, 0, len, 0); g.addColorStop(0, c2); g.addColorStop(1, 'rgba(255,60,0,0)'); c.fillStyle = g; c.fill(); c.restore(); } c.restore(); return; }
  if (st === 'energy') { c.save(); c.globalCompositeOperation = 'lighter'; c.shadowColor = c2; c.shadowBlur = 8; for (let i = 0; i < 4; i++) { c.strokeStyle = i % 2 ? c2 : c1; c.lineWidth = 2.2 - i * 0.3; c.beginPath(); const len = L * (1 - i * 0.12); c.moveTo(0, 0); for (let s = 1; s <= 6; s++) { const f = s / 6; c.lineTo(len * f, -H * 0.5 * Math.sin(f * Math.PI) * (0.6 + i * 0.15) + Math.sin(t * 20 + s + i) * 1.6); } c.stroke(); } c.restore(); return; }
  if (st === 'cosmic') { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(L * 0.4, -H * 0.9, L, -H * 0.5); c.quadraticCurveTo(L * 0.8, 0, L * 0.95, H * 0.2); c.quadraticCurveTo(L * 0.4, H * 0.4, 0, H * 0.1); c.closePath(); const g = c.createLinearGradient(0, -H, L, H); g.addColorStop(0, '#2a1a5a'); g.addColorStop(0.5, '#0a0a1a'); g.addColorStop(1, '#3a1a4a'); c.fillStyle = g; c.fill(); c.save(); c.shadowColor = c2; c.shadowBlur = 8; c.strokeStyle = c2; c.lineWidth = 1.4; c.stroke(); c.restore();
    c.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { const sx = L * ((i * 0.37) % 0.85 + 0.08), sy = -H * 0.45 + ((i * 0.53) % 0.8) * H * 0.6, tw = 0.5 + 0.5 * Math.sin(t * 4 + i * 2); c.globalAlpha = tw; c.fillRect(sx, sy, 1.4, 1.4); } c.globalAlpha = 1; return; }
}
const shade2 = (h, f) => (typeof shade === 'function' && typeof toHex === 'function' ? toHex(shade(h, f)) : h);
// De perfil (mirando a un lado) se ven las dos alas hacia atrás, una delante de la otra, batiendo arriba y abajo
function drawWingsSide(c, W, x, y, sc, ph, open, dir) {
  const span = (14 + W.r * 2.8) * sc, k = open, t = performance.now() / 1000, flap = Math.sin(ph);
  c.save(); c.translate(x - dir * 2 * sc, y);
  for (const far of [1, 0]) { c.save(); c.scale(-dir, 1); c.translate(far * 2 * sc, -far * 2 * sc); const lift = k ? -0.55 - flap * 0.6 * k : 0.9; c.rotate(lift - far * 0.18); c.scale(1, k ? 0.55 + 0.45 * Math.abs(Math.cos(ph)) : 0.5); if (far) c.globalAlpha *= 0.7; wingPath(c, W.style, span * (k ? 1 : 0.7), k, t, W); c.restore(); }
  c.restore();
}
function drawWingsAt(c, W, x, y, sc, ph, open, behind) {
  const span = (14 + W.r * 2.8) * sc, k = open, t = performance.now() / 1000;
  const flap = Math.sin(ph) * 0.55 * k, base = k ? -0.25 - flap : 0.6;
  c.save(); c.translate(x, y); if (!behind) c.globalAlpha = 0.97;
  for (const s of [-1, 1]) { c.save(); c.scale(s, 1); c.translate(2 * sc, 0); c.rotate(base + (1 - k) * 0.4); c.scale(1, 1 - (1 - k) * 0.35); wingPath(c, W.style, span, k, t, W); c.restore(); }
  c.restore();
}
// Se dibujan con el personaje (también los demás jugadores y las fichas): detrás si te ves de frente, delante si de espaldas
{ const d0 = drawAvatar; drawAvatar = (...a) => {
  const [ctx, , equip, x, y, fa, walk, moving, sc0] = a, W = WINGS[wingId(equip)]; if (!W || !ctx) return d0(...a);
  const sc = sc0 || 1.6, me = S && equip === S.equip, open = me ? WF.open : moving && walk === 1.2 ? 1 : 0, ph = me ? WF.ph : performance.now() / 1000 * (open ? 10 : 0);
  const back = Math.sin(fa || 0) < -0.45, sy = y - 14 * sc, cs = Math.cos(fa || 0), side = Math.abs(cs) > 0.75;
  if (side) { drawWingsSide(ctx, W, x, sy, sc, ph, open, cs > 0 ? 1 : -1); return d0(...a); }
  if (!back) drawWingsAt(ctx, W, x, sy, sc, ph, open, true);
  const r = d0(...a);
  if (back) drawWingsAt(ctx, W, x, sy, sc, ph, open, false);
  return r;
}; }
// Barra de vuelo bajo el personaje
{ const p0 = drawPlayer; drawPlayer = ctx => { p0(ctx); const W = wingOf(); if (!W || W.fly === Infinity) return; const f = WF.fuel / W.fly; if (f >= 0.999 && !WF.on) return; const p = S.player;
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(p.x - 13, p.y + 14, 26, 4); ctx.fillStyle = f > 0.3 ? W.c2 : '#ff6b5b'; ctx.fillRect(p.x - 12, p.y + 15, 24 * f, 2); }; }
// ---------- Iconos ----------
function drawWingIcon(c, id, s) { const W = WINGS[id]; c.save(); drawWingsAt(c, W, 0, -s * 0.02, s / 30, 0.6, 1, false); c.restore(); }
function drawBoostIcon(c, id, s) {
  const B = BOOSTS[id], r = s / 2; c.save(); c.rotate(-Math.PI / 4);
  c.fillStyle = B.c; c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -r * 0.95); c.quadraticCurveTo(r * 0.3, -r * 0.6, r * 0.25, r * 0.3); c.lineTo(-r * 0.25, r * 0.3); c.quadraticCurveTo(-r * 0.3, -r * 0.6, 0, -r * 0.95); c.fill(); c.stroke();
  c.fillStyle = '#e8e0d0'; c.fillRect(-r * 0.25, -r * 0.1, r * 0.5, r * 0.12);
  c.fillStyle = shade2(B.c, -0.3); for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * r * 0.25, r * 0.05); c.lineTo(sd * r * 0.5, r * 0.45); c.lineTo(sd * r * 0.25, r * 0.3); c.fill(); }
  c.fillStyle = '#ffd060'; c.beginPath(); c.moveTo(-r * 0.15, r * 0.32); c.lineTo(0, r * 0.85); c.lineTo(r * 0.15, r * 0.32); c.fill(); c.fillStyle = '#ff6a1a'; c.beginPath(); c.moveTo(-r * 0.08, r * 0.32); c.lineTo(0, r * 0.62); c.lineTo(r * 0.08, r * 0.32); c.fill();
  c.restore();
}
{ const d0 = drawItemPath; drawItemPath = (c, id, s) => { const b = String(id).split('~')[0]; return WINGS[b] ? drawWingIcon(c, b, s) : BOOSTS[b] ? drawBoostIcon(c, b, s) : d0(c, id, s); }; }
if (typeof EQ_N !== 'undefined') EQ_N.back = 'Capa o alas';
// ---------- Barra de altura (a la izquierda): cielo por capas, metros, tu posición, vuelo y cohete ----------
const ALT_MAX = 65, ALT_Z = 3; // metros que caben en la barra · píxeles de altura por metro
const ALT_ZONES = [[0, 3, 'Suelo', '#6a5a3a'], [3, 11, 'Copas de los árboles', '#3a7a3a'], [11, 22, 'Nubes bajas', '#5a9ad0'], [22, 40, 'Cielo abierto', '#3a6ac8'], [40, 65, 'Cielo alto', '#2a2a7a']];
const altEl = document.createElement('div'); altEl.id = 'altHud'; altEl.hidden = true;
altEl.innerHTML = `<div class="alttube">${ALT_ZONES.map(([a, b, n, c]) => `<div class="altz" style="bottom:${a / ALT_MAX * 100}%;height:${(b - a) / ALT_MAX * 100}%;--zc:${c}"><span>${n}</span></div>`).join('')}${[0, 10, 20, 30, 40, 50, 60].map(m => `<i class="altt" style="bottom:${m / ALT_MAX * 100}%"><b>${m} m</b></i>`).join('')}<div class="altmax"></div><div class="altme"><span class="alticon">🪽</span><b></b></div></div>
  <div class="altfuel"><i></i></div><div class="altinfo"><b class="altzone"></b><small class="altstate"></small><div class="altboost"><i></i><span></span></div></div>`;
document.body.appendChild(altEl);
const altQ = s => altEl.querySelector(s), A = { me: altQ('.altme'), meb: altQ('.altme b'), max: altQ('.altmax'), fuel: altQ('.altfuel i'), zone: altQ('.altzone'), st: altQ('.altstate'), bo: altQ('.altboost'), boi: altQ('.altboost i'), bos: altQ('.altboost span'), last: '' };
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); altHud(); }; }
function altHud() {
  const W = wingOf(), show = !!W && !ui.open && (WF.on || (P.z || 0) > 1); if (altEl.hidden === show) altEl.hidden = !show; if (!show) return;
  const m = Math.max(0, WF.on ? WF.z : P.z || 0) / ALT_Z, pct = Math.min(100, m / ALT_MAX * 100);
  A.me.style.bottom = pct + '%'; const mt = m.toFixed(1) + ' m'; if (A.meb.textContent !== mt) A.meb.textContent = mt;
  const B = WF.boost, ceil = (34 + (B && B.climb && B.t > 0 ? B.climb : 0)) / ALT_Z; A.max.style.bottom = Math.min(100, ceil / ALT_MAX * 100) + '%';
  const f = W.fly === Infinity ? 1 : WF.fuel / W.fly; A.fuel.style.transform = `scaleY(${f.toFixed(3)})`; A.fuel.style.background = W.fly === Infinity ? 'linear-gradient(0deg,#f0c75e,#ff7ad8)' : f > 0.3 ? W.c2 : '#ff6b5b';
  const z = ALT_ZONES.find(([a, b]) => m >= a && m < b) || ALT_ZONES[ALT_ZONES.length - 1];
  const st = !WF.on ? 'Saltando' : B && B.t > 0 && B.spd ? '🚀 Impulsado' : WF.lift ? (WF.z < 34 ? '⬆ Subiendo' : '〰 Manteniendo altura') : '⬇ Planeando', key = z[2] + st;
  const zt = mt + ' · ' + z[2]; if (A.zone.textContent !== zt) A.zone.textContent = zt; if (A.last !== key) { A.last = key; A.zone.style.setProperty('--zc', z[3]); A.st.textContent = st + (W.fly === Infinity ? ' · vuelo infinito' : ''); }
  const bt = B && B.t > 0 ? B.t : 0; A.bo.hidden = !bt; if (bt) { const tot = B.t0 || (B.t0 = B.t); A.boi.style.transform = `scaleX(${(bt / tot).toFixed(3)})`; A.boi.style.background = B.c; A.bos.textContent = `Cohete ${bt.toFixed(1)} s`; }
}
// F con un impulsador en la mano: siempre lo usa (antes, si el cursor apuntaba al agua, F intentaba beber;
// y sobre un bloque, lo abría). Volando tampoco se bebe del suelo.
{ const i0 = interact; interact = (...a) => { const s = S && S.inv[S.sel]; if (s && BOOSTS[String(s.id).split('~')[0]]) { useItem(); return; } return i0(...a); }; }
{ const d0 = drinkAt; drinkAt = (...a) => WF.on ? false : d0(...a); }
// ---------- Que volar se sienta bien ----------
//  · Despegue con remolino de polvo y sonido; aterrizaje con golpe suave, polvo y un pequeño temblor.
//  · La cámara se aleja un poco cuanto más alto vas (y vuelve al aterrizar).
//  · Más rápido cuanto más alto (hasta +25 %) y, si avanzas mientras planeas, caes más despacio.
//  · Estelas de viento al ir deprisa y un «fush» suave en cada aletazo.
const WFX = { was: false, z0: null, flapS: 0, trail: 0 };
{ const u0 = updatePlayer; updatePlayer = fdt => {
  const glide0 = WF.on && !WF.lift && pmove.moving ? WF.z : null;
  u0(fdt); if (!S) return; const p = S.player;
  if (glide0 !== null && WF.on && !WF.lift && WF.z < glide0) WF.z = glide0 - (glide0 - WF.z) * 0.65; // el avance sostiene
  if (WF.on && !WFX.was) { WFX.z0 = view.z; fxBurst(p.x, p.y + 8, 16, { col: 'rgba(220,210,190,.9)', sp: 90, life: 0.5, size: 2.4, drag: 2 }); tone(520, 0.12, 'sine', 0.035, 1.8); }
  if (!WF.on && WFX.was) { dust(p.x, p.y + 8, 12); shake = Math.max(shake || 0, 0.06); tone(110, 0.12, 'triangle', 0.05, 0.6); }
  WFX.was = WF.on;
  // cámara
  if (WFX.z0) { const alt = WF.on ? Math.min(1, WF.z / 194) : 0, want = WFX.z0 * (1 - alt * 0.22); view.z += (want - view.z) * Math.min(1, fdt * 3); if (!WF.on && Math.abs(view.z - WFX.z0) < 0.005) { view.z = WFX.z0; WFX.z0 = null; } }
  if (!WF.on) return;
  // aletazos con sonido
  const sp = Math.sin(WF.ph); if (WFX.flapS < 0 && sp >= 0 && WF.rate >= 6) tone(170 + Math.random() * 40, 0.07, 'sine', 0.018, 0.5); WFX.flapS = sp;
  // estelas de viento
  if (pmove.moving || (WF.boost && WF.boost.spd)) { WFX.trail -= fdt; if (WFX.trail <= 0) { WFX.trail = 0.04; const a = (P.faceA || 0) + Math.PI, off = (Math.random() - 0.5) * 20; fxAdd({ x: p.x + Math.cos(a) * 8 - Math.sin(a) * off, y: p.y - P.z - 10 + Math.cos(a) * off * 0.5, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0.35, t: 0, size: 1.4, col: 'rgba(255,255,255,.55)', drag: 1 }); } }
}; }
{ const s0 = speedMul; speedMul = () => s0() * (WF.on ? 1 + Math.min(1, WF.z / 194) * 0.25 : 1); }
