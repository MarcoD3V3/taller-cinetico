'use strict';
// =====================================================================================
//  Eventos del mundo: cosas que pasan solas y se ven de lejos (además de los de cada estación y la luna de sangre).
//   · Lluvia de meteoritos (de noche): estelas cruzando el cielo y, de vez en cuando, una roca cae cerca con aviso;
//     deja un cráter humeante con minerales raros.
//   · Migraciones (de día): una manada de animales cruza la zona de lado a lado.
//   · Incendios forestales: un rayo (o una ola de calor) prende un árbol; el fuego salta a los árboles de al lado
//     y deja ceniza y árboles muertos. La lluvia lo apaga poco a poco.
//   · Mareas: en el mar el agua sube más por la playa dos veces al día (render/water.js).
//  Todo en píxeles. Ninguno pasa en cuevas, mazmorras ni arenas, ni en modo «siempre de día».
// =====================================================================================
const EV = { chk: 20, enfr: { met: 0, mig: 0, fue: 0 }, met: null, crateres: [], estelas: [], fuegos: new Map(), humo: [] };
const EV_MINERALES = ['starShard', 'goldOre', 'silverOre', 'ironOre', 'copperOre', 'cobaltOre', 'titaniumOre', 'meteorIron'];
const evLibre = () => S && S.player && !S.alwaysDay && !(WX && WX.cave > 0.5) && !(typeof inDungeon === 'function' && inDungeon()) && !(typeof inArena === 'function' && inArena()) && !(typeof layerOf === 'function' && layerOf(Math.floor(S.player.y / T)) > 0);
const evAviso = (t, sub, c) => { if (typeof wvBanner === 'function') wvBanner(t, sub, c, 4); else toast(t); };

// ---------- Programador: cada ~20 s mira si empieza algo ----------
function evTick(dt) {
  if (!evLibre()) return; const p = S.player;
  for (const k in EV.enfr) EV.enfr[k] = Math.max(0, EV.enfr[k] - dt);
  EV.chk -= dt;
  if (EV.chk <= 0) { EV.chk = 20 + Math.random() * 10; const dia = daylight();
    if (!EV.met && dia < 0.2 && !EV.enfr.met && Math.random() < 0.1) evMeteoros();
    else if (dia > 0.6 && !EV.enfr.mig && Math.random() < 0.08) evMigracion();
    else if (WX.type === 'heat' && WX.int > 0.5 && !EV.enfr.fue && Math.random() < 0.15) evPrender(p.x + (Math.random() - 0.5) * 24 * T, p.y + (Math.random() - 0.5) * 18 * T, true); }
  // lluvia de meteoritos en marcha
  if (EV.met) { EV.met.t -= dt; EV.met.cae -= dt;
    if (Math.random() < dt * 3.5) EV.estelas.push({ x: Math.random(), y: Math.random() * 0.35, vx: 0.5 + Math.random() * 0.4, vy: 0.22 + Math.random() * 0.2, t: 0, d: 0.6 + Math.random() * 0.6 });
    if (EV.met.cae <= 0) { EV.met.cae = 7 + Math.random() * 9; evCaeMeteoro(); }
    if (EV.met.t <= 0) { EV.met = null; EV.enfr.met = 600; } }
  for (let i = EV.estelas.length - 1; i >= 0; i--) if ((EV.estelas[i].t += dt) > EV.estelas[i].d) EV.estelas.splice(i, 1);
  for (let i = EV.crateres.length - 1; i >= 0; i--) { const c = EV.crateres[i]; c.t += dt; if (c.t > 240) { EV.crateres.splice(i, 1); continue; }
    if (c.t < 90 && Math.random() < dt * 3) EV.humo.push({ x: c.x + (Math.random() - 0.5) * 16, y: c.y, t: 0, d: 2 + Math.random() * 1.5, g: 0 }); }
  // incendios
  if (EV.fuegos.size) { const lluvia = (WX.type === 'rain' || WX.type === 'storm') ? WX.int : 0;
    for (const [k, f] of EV.fuegos) { f.t += dt;
      if (Math.random() < dt * 4) EV.humo.push({ x: f.x * T + 8 + Math.random() * 16, y: f.y * T - 14, t: 0, d: 2.5 + Math.random() * 2, g: 1 });
      if (f.t > 1 && Math.random() < dt * 0.35 * (1 - lluvia) && EV.fuegos.size < 40) { const d = (Math.random() * 8) | 0, nx = f.x + BL_DX[d], ny = f.y + BL_DY[d], g = GI[gnd(nx, ny)]; if (g && g.tree && g.key !== 'DEADTREE' && !EV.fuegos.has(nx + ',' + ny)) EV.fuegos.set(nx + ',' + ny, { x: nx, y: ny, t: 0, d: 14 + Math.random() * 10 }); }
      if (f.t > f.d || Math.random() < dt * lluvia * 0.12) { EV.fuegos.delete(k); const g = GI[gnd(f.x, f.y)]; if (g && g.tree) setGround(f.x, f.y, Math.random() < 0.6 ? G.DEADTREE : G.ASH); }
      if (Math.hypot(p.x - (f.x * T + 16), p.y - (f.y * T + 20)) < 20 && survOn() && Math.random() < dt * 1.5) hurt('burn', 'legL', 0.5, 'Incendio'); }
    if (!EV.fuegos.size) EV.enfr.fue = 300; }
  for (let i = EV.humo.length - 1; i >= 0; i--) { const h = EV.humo[i]; h.t += dt; h.y -= dt * 14; h.x += dt * (typeof WIND !== 'undefined' ? WIND.dir * WIND.str * 8 : 4); if (h.t > h.d) EV.humo.splice(i, 1); }
  if (EV.humo.length > 260) EV.humo.splice(0, EV.humo.length - 260);
}

// ---------- Lluvia de meteoritos ----------
function evMeteoros() { EV.met = { t: 70 + Math.random() * 40, cae: 4 }; evAviso('☄ Lluvia de meteoritos', 'Caen rocas del cielo: sus cráteres tienen minerales raros. ¡Cuidado donde caen!', '#ffb060'); }
function evCaeMeteoro() {
  const p = S.player, a = Math.random() * 6.28, d = (6 + Math.random() * 9) * T, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d, g = GI[gnd(Math.floor(x / T), Math.floor(y / T))];
  if (!g || g.liquid || g.solid) return;
  if (typeof HAZ !== 'undefined') HAZ.push({ x, y, r: 30, t: 1.6, dl: 1.6, kind: 'warn', c: '#ffb060' }); tone(900, 1.4, 'sine', 0.03, 0.25);
  setTimeout(() => { if (!S) return; if (typeof addBolt === 'function') addBolt(x - 300, y - 460, x, y, '#ffb060', 0.4);
    if (typeof fxBurst === 'function') fxBurst(x, y, 50, { col: '#ffb060', sp: 190, life: 1, glow: 1, size: 2.6 });
    if (typeof screenFlash === 'function') screenFlash('#ffe0b0', 0.14); noise(0.6, 0.12, 120); tone(60, 0.7, 'sawtooth', 0.06, 0.4); shake = Math.max(shake, 0.35);
    if (Math.hypot(S.player.x - x, S.player.y - y) < 1.4 * T && survOn()) hurt('burn', 'armL', 1.2, 'Meteorito');
    EV.crateres.push({ x, y, t: 0, r: 15 + Math.random() * 6, sd: (Math.random() * 1e5) | 0 });
    const ok = EV_MINERALES.filter(id => ITEMS[id]); for (let i = 0; i < 2 + ((Math.random() * 2) | 0); i++) giSpawn(ok[(Math.random() * ok.length) | 0] || 'stone', 1, x + (Math.random() - 0.5) * 18, y + (Math.random() - 0.5) * 12, 0, 0, false); }, 1600);
}

// ---------- Migraciones ----------
const EV_MANADA = ['deer', 'reindeer', 'horse', 'boar', 'goat', 'sheep', 'bison', 'camel', 'cow'];
function evMigracion() {
  const p = S.player, sps = EV_MANADA.filter(s => SPECIES[s] && !(typeof HOSTILE !== 'undefined' && HOSTILE[s])); if (!sps.length) return;
  const sp = sps[(Math.random() * sps.length) | 0], lado = Math.random() < 0.5 ? -1 : 1, n = 6 + ((Math.random() * 5) | 0), y0 = p.y + (Math.random() - 0.5) * 6 * T;
  let hechos = 0;
  for (let i = 0; i < n; i++) { const x = p.x + lado * (16 + Math.random() * 4) * T, y = y0 + (Math.random() - 0.5) * 5 * T, tx = Math.floor(x / T), ty = Math.floor(y / T);
    if (typeof canStand === 'function' && !canStand(SPECIES[sp], tx, ty)) continue; const c = getChunk(tx >> CSH, ty >> CSH);
    ANIMALS.push({ sp, x, y, tx: p.x - lado * 34 * T, ty: y + (Math.random() - 0.5) * 3 * T, t: 60, face: -lado, ph: Math.random() * 6, ck: ckey(c.cx, c.cy), cx: c.cx, cy: c.cy, migra: 1 }); hechos++; }
  if (hechos) { EV.enfr.mig = 480; toast(`🐾 Una manada de ${ (SPECIES[sp].n || sp).toLowerCase() } cruza la zona`); }
}

// ---------- Incendios ----------
function evPrender(x, y, buscar) {
  let tx = Math.floor(x / T), ty = Math.floor(y / T);
  if (buscar) { let hallado = false; for (let r = 0; r < 6 && !hallado; r++) for (let q = 0; q < 12 && !hallado; q++) { const ax = tx + Math.round(Math.cos(q / 12 * 6.28) * r), ay = ty + Math.round(Math.sin(q / 12 * 6.28) * r), g = GI[gnd(ax, ay)]; if (g && g.tree && g.key !== 'DEADTREE') { tx = ax; ty = ay; hallado = true; } } if (!hallado) return false; }
  const g = GI[gnd(tx, ty)]; if (!g || !g.tree || g.key === 'DEADTREE' || EV.fuegos.has(tx + ',' + ty)) return false;
  if (!EV.fuegos.size) evAviso('🔥 ¡Incendio forestal!', 'El fuego salta de árbol en árbol. La lluvia lo apaga; si no, déjalo arder lejos de tu base.', '#ff7a3a');
  EV.fuegos.set(tx + ',' + ty, { x: tx, y: ty, t: 0, d: 14 + Math.random() * 10 }); return true;
}
// los rayos de las tormentas pueden prender un árbol
{ const l0 = lightning; lightning = (...a) => { const r = l0(...a); try { if (WX.boltAt && Math.random() < 0.35 && evLibre()) evPrender(WX.boltAt.x, WX.boltAt.y, true); } catch (e) { } return r; }; }

// ---------- Dibujo ----------
function evDibujoSuelo(ctx) { // cráteres: tierra quemada con borde levantado, brasas que se apagan
  if (!EV.crateres.length) return; const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  for (const c of EV.crateres) { const a = Math.min(1, (240 - c.t) / 40), R = Math.round(c.r), X = Math.round(c.x), Y = Math.round(c.y);
    for (let dy = -R; dy <= R; dy++) { const w = Math.round(R * Math.sqrt(1 - (dy / (R + 0.5)) ** 2)) ; if (w <= 0) continue; const yy = Y + Math.round(dy * 0.55);
      ctx.fillStyle = `rgba(28,20,16,${(0.55 * a).toFixed(3)})`; ctx.fillRect(X - w, yy, w * 2, 1);
      ctx.fillStyle = `rgba(150,120,90,${(0.45 * a).toFixed(3)})`; ctx.fillRect(X - w - 1, yy, 1, 1); ctx.fillRect(X + w, yy, 1, 1); }       // borde levantado
    const brasa = Math.max(0, 1 - c.t / 90); if (brasa > 0) for (let q = 0; q < 8; q++) { const on = Math.sin(c.t * 6 + q * 2.1) > 0; if (!on) continue;
      ctx.fillStyle = `rgba(255,${120 + q * 12},40,${(brasa * 0.9).toFixed(2)})`; ctx.fillRect(X + (((ihash(c.sd + q, 1) - 0.5) * R * 1.4) | 0), Y + (((ihash(c.sd, q) - 0.5) * R * 0.7) | 0), 1, 1); } }
  ctx.imageSmoothingEnabled = sm;
}
function evDibujoEncima(ctx, k, ox, oy) { // llamas, humo y (en pantalla) estelas de meteoritos
  ctx.setTransform(k, 0, 0, k, ox, oy); const sm = ctx.imageSmoothingEnabled, tt = performance.now() / 1000; ctx.imageSmoothingEnabled = false;
  for (const f of EV.fuegos.values()) { const X = f.x * T, Y = f.y * T, fuerza = Math.min(1, f.t / 2) * Math.min(1, (f.d - f.t) / 3 + 0.3);
    ctx.globalCompositeOperation = 'lighter'; { const cx = X + 16, cy = Y + 6, R = 22; for (let dy = -R; dy <= R; dy += 2) { const w = Math.round(R * Math.sqrt(Math.max(0, 1 - (dy / R) ** 2))); if (w <= 0) continue; // resplandor redondo de píxeles, más fuerte en el centro
        const a2 = 0.16 * fuerza * (1 - Math.abs(dy) / R); ctx.fillStyle = `rgba(255,120,30,${a2.toFixed(3)})`; ctx.fillRect(cx - w, cy + dy, w * 2, 2); ctx.fillStyle = `rgba(255,150,50,${(a2 * 0.8).toFixed(3)})`; ctx.fillRect(cx - (w >> 1), cy + dy, w, 2); } }
    ctx.globalCompositeOperation = 'source-over';
    for (let q = 0; q < 14; q++) { const px = X + 2 + ((ihash(f.x * 11 + q, f.y) * 26) | 0), h = Math.round((8 + ihash(q, f.y * 3) * 18) * fuerza * (0.7 + 0.3 * Math.sin(tt * 9 + q * 1.7))), base = Y + 8 + ((ihash(q, f.x) * 18) | 0);
      for (let y = 0; y < h; y++) { const t2 = y / Math.max(1, h), w = t2 < 0.5 ? 3 : t2 < 0.8 ? 2 : 1; ctx.fillStyle = t2 < 0.25 ? '#fff4b0' : t2 < 0.6 ? '#ffa030' : '#e0401a'; ctx.fillRect(px + (Math.sin(tt * 7 + y * 0.6 + q) > 0.6 ? 1 : 0) - (w >> 1), base - y, w, 1); } } } // llamas de píxeles (anchas abajo, finas arriba)
  for (const h of EV.humo) { const a = (1 - h.t / h.d) * (h.g ? 0.35 : 0.25), s = 2 + Math.floor(h.t * 1.5); ctx.fillStyle = `rgba(70,66,64,${a.toFixed(3)})`; ctx.fillRect(Math.round(h.x), Math.round(h.y), s, s); }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (EV.estelas.length) { const W = cv.width, H = cv.height, px = Math.max(2, Math.round(dpr * 2));
    for (const e of EV.estelas) { const k2 = e.t / e.d, x = (e.x + e.vx * e.t) * W, y = (e.y + e.vy * e.t) * H, a = Math.sin(k2 * Math.PI);
      for (let q = 0; q < 14; q++) { ctx.fillStyle = q < 2 ? `rgba(255,250,220,${a.toFixed(2)})` : `rgba(255,${190 - q * 6},${120 - q * 6},${(a * (1 - q / 14) * 0.8).toFixed(2)})`; ctx.fillRect(Math.round(x - q * e.vx * 9 * px / 2), Math.round(y - q * e.vy * 9 * px / 2), px, px); } } }
  ctx.imageSmoothingEnabled = sm;
}
// ---------- Enganches ----------
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); try { if (S) evTick(fdt); } catch (e) { console.warn(e); } }; }
if (typeof drawGroundDecor === 'function') { const d0 = drawGroundDecor; drawGroundDecor = (ctx, k, ox, oy, x0, y0, x1, y1) => { try { evDibujoSuelo(ctx); } catch (e) { console.warn(e); } return d0(ctx, k, ox, oy, x0, y0, x1, y1); }; }
{ const r0 = render; render = fdt => { const r = r0(fdt); try { if (S && S.player && (EV.fuegos.size || EV.humo.length || EV.estelas.length)) { const z = view.z, k = z * dpr, ox = Math.round(cw / 2 * dpr - view.x * k), oy = Math.round(ch / 2 * dpr - view.y * k); evDibujoEncima(ctx, k, ox, oy); } } catch (e) { console.warn(e); } return r; }; }
// Comando para probarlos: /evento meteoritos|manada|incendio
if (typeof cmd === 'function') cmd('evento', { u: '/evento meteoritos|manada|incendio', d: 'Lanza un evento del mundo ahora.', cheat: 1, run(a) {
  const k = (a[0] || '').toLowerCase(); if (/meteor/.test(k)) { evMeteoros(); return 'Lluvia de meteoritos.'; } if (/manada|migra/.test(k)) { evMigracion(); return 'Manada en camino.'; }
  if (/incend|fuego/.test(k)) return evPrender(S.player.x, S.player.y, true) ? 'Un árbol cercano arde.' : 'No hay árboles cerca.'; return 'Usa: /evento meteoritos | manada | incendio'; } });
