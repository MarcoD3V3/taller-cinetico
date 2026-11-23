'use strict';
// =====================================================================================
//  Ambiente vivo (todo en píxeles):
//   · hojas que caen de los árboles con el viento y se posan un momento en el suelo;
//   · luciérnagas de noche cerca del agua y de la hierba (brillan por encima de la oscuridad);
//   · huellas del personaje en arena, nieve, barro y ceniza, que se van borrando.
//  Es solo dibujo: no cambia la partida ni se guarda.
// =====================================================================================
const AMB = { hojas: [], luces: [], huellas: [], vuelan: [], chispas: [], ult: null, tH: 0, tL: 0, paso: 0, rompe: null };
const AMB_MAX_HOJAS = 46, AMB_MAX_LUCES = 26, AMB_MAX_HUELLAS = 140;
const ambRGB = h => { if (Array.isArray(h)) return h; const m = String(h || '').match(/\w\w/g); return m && m.length >= 3 ? m.slice(0, 3).map(v => parseInt(v, 16)) : [90, 140, 60]; };
const ambCol = (c, f, a) => `rgba(${Math.min(255, c[0] * f) | 0},${Math.min(255, c[1] * f) | 0},${Math.min(255, c[2] * f) | 0},${a.toFixed(3)})`;
const ambNoche = () => { if (typeof daylight !== 'function' || !S) return 0; const d = daylight(); return Math.max(0, Math.min(1, (0.42 - d) / 0.25)); };
const ambSueloHuella = t => { const k = (GI[t] && GI[t].key) || ''; return /SNOW/.test(k) ? 'nieve' : /SAND/.test(k) ? 'arena' : /MUD|PEAT|SWAMP/.test(k) ? 'barro' : /ASH/.test(k) ? 'ceniza' : null; };

// Pasos: tipo de suelo y su sonido (ruido filtrado + un golpe grave en piedra y madera); volumen bajo
function ambTipoPaso(t, tx, ty) { const b = typeof at === 'function' ? at(tx, ty) : null; if (b && BD[b.type] && BD[b.type].walk) return /plank|wood|madera/i.test(b.type) ? 'madera' : 'piedra';
  const k = (GI[t] && GI[t].key) || ''; return /SNOW/.test(k) ? 'nieve' : /SAND|ASH/.test(k) ? 'arena' : /MUD|PEAT|SWAMP|CLAY/.test(k) ? 'barro' : /STONE|ROCK|GRAVEL|FLOOR|COBBLE/.test(k) ? 'piedra' : 'hierba'; }
function ambPaso(tipo) { if (typeof noise !== 'function') return; const v = 0.016 + Math.random() * 0.006;
  if (tipo === 'hierba') noise(0.06, v, 2200); else if (tipo === 'arena') noise(0.09, v * 1.1, 1200); else if (tipo === 'nieve') { noise(0.1, v * 1.2, 2800); }
  else if (tipo === 'barro') { noise(0.08, v, 500); tone(90, 0.06, 'sine', v * 0.8, 0.7); } else if (tipo === 'agua') { noise(0.12, v * 1.3, 1500); tone(380 + Math.random() * 80, 0.05, 'sine', v * 0.5, 1.6); }
  else if (tipo === 'madera') { tone(160 + Math.random() * 20, 0.05, 'triangle', v * 1.6, 0.8); noise(0.03, v * 0.6, 3000); }
  else { tone(120 + Math.random() * 25, 0.04, 'triangle', v * 1.4, 0.7); noise(0.04, v * 0.9, 3500); } }
// ---------- simulación (cada fotograma, solo con lo que se ve) ----------
function ambTick(dt, x0, y0, x1, y1) {
  if (!S || !S.player || OPT.ambiente === false) return;
  dt = Math.min(0.05, dt || 0.016); const now = performance.now() / 1000, viento = (typeof WIND !== 'undefined' ? WIND.dir * WIND.str : 0.5);
  // hojas: nacen en las copas de los árboles que se ven
  AMB.tH += dt;
  if (AMB.tH > 0.12 && AMB.hojas.length < AMB_MAX_HOJAS) { AMB.tH = 0;
    for (let n = 0; n < 3; n++) { const tx = x0 + ((Math.random() * (x1 - x0 + 1)) | 0), ty = y0 + ((Math.random() * (y1 - y0 + 1)) | 0), g = GI[gnd(tx, ty)];
      if (!g || !g.tree || Math.random() > 0.55) continue; const c = ambRGB(g.tree.a || g.tree.b || g.c);
      AMB.hojas.push({ x: tx * T + 16 + (Math.random() - 0.5) * 26, y: ty * T - 18 - Math.random() * 18, suelo: ty * T + 10 + Math.random() * 18, vy: 9 + Math.random() * 7, ph: Math.random() * 6, c, t: 0, pos: 0 }); } }
  for (let i = AMB.hojas.length - 1; i >= 0; i--) { const h = AMB.hojas[i]; h.t += dt;
    if (h.y < h.suelo) { h.ph += dt * 3.2; h.x += (Math.sin(h.ph) * 14 + viento * 9) * dt; h.y += h.vy * dt; }
    else { h.pos += dt; if (h.pos > 2.6) AMB.hojas.splice(i, 1); } // posada en el suelo, se desvanece
    if (h.t > 14) AMB.hojas.splice(i, 1); }
  // luciérnagas: de noche, junto al agua o la hierba
  const noche = ambNoche(); AMB.tL += dt;
  if (noche > 0.05 && AMB.tL > 0.2 && AMB.luces.length < AMB_MAX_LUCES * noche) { AMB.tL = 0;
    const tx = x0 + ((Math.random() * (x1 - x0 + 1)) | 0), ty = y0 + ((Math.random() * (y1 - y0 + 1)) | 0), g = GI[gnd(tx, ty)];
    let agua = false; for (let d = 0; d < 8 && !agua; d++) { const gg = GI[gnd(tx + BL_DX[d] * 2, ty + BL_DY[d] * 2)]; if (gg && gg.liquid === 'water') agua = true; }
    if (g && !g.liquid && !g.solid && (agua || (g.flora || /GRASS/.test(g.key || '')) && Math.random() < 0.35))
      AMB.luces.push({ x: tx * T + Math.random() * T, y: ty * T + Math.random() * T, ph: Math.random() * 6, vx: 0, vy: 0, t: 0, vida: 8 + Math.random() * 10 }); }
  for (let i = AMB.luces.length - 1; i >= 0; i--) { const l = AMB.luces[i]; l.t += dt; l.ph += dt;
    l.vx += (Math.random() - 0.5) * 30 * dt; l.vy += (Math.random() - 0.5) * 30 * dt; l.vx *= 0.97; l.vy *= 0.97; l.x += l.vx * dt; l.y += l.vy * dt;
    if (l.t > l.vida || noche <= 0.02) AMB.luces.splice(i, 1); }
  // huellas: al andar por arena, nieve, barro o ceniza
  const p = S.player, enAire = (P.z || 0) > 0.5;
  if (!enAire && !(P.swim > 0)) { const tipo = ambSueloHuella(gnd(Math.floor(p.x / T), Math.floor((p.y + 8) / T)));
    if (tipo) { const u = AMB.ult; if (!u || Math.hypot(p.x - u.x, p.y - u.y) > 7) { const ang = u ? Math.atan2(p.y - u.y, p.x - u.x) : 0, lado = u ? -u.lado : 1;
      AMB.huellas.push({ x: p.x - Math.sin(ang) * 2.5 * lado, y: p.y + 9 + Math.cos(ang) * 1.5 * lado, ang, tipo, t: 0, vida: tipo === 'nieve' ? 26 : tipo === 'barro' ? 30 : 16 });
      AMB.ult = { x: p.x, y: p.y, lado }; if (AMB.huellas.length > AMB_MAX_HUELLAS) AMB.huellas.shift(); } }
    else AMB.ult = null; }
  for (let i = AMB.huellas.length - 1; i >= 0; i--) { const h = AMB.huellas[i]; h.t += dt; if (h.t > h.vida) AMB.huellas.splice(i, 1); }
  // pasos: un sonido corto según el suelo que pisas (más seguidos si corres)
  if (typeof pmove !== 'undefined' && pmove.moving && !enAire && OPT.pasos !== false) { AMB.paso = (AMB.paso || 0) - dt;
    if (AMB.paso <= 0) { AMB.paso = pmove.sprint ? 0.24 : 0.34; ambPaso(P.swim > 0 ? 'agua' : ambTipoPaso(gnd(Math.floor(p.x / T), Math.floor((p.y + 8) / T)), Math.floor(p.x / T), Math.floor((p.y + 8) / T))); } }
  else AMB.paso = 0.05;
  // objetos que vuelan hacia ti al recogerlos
  for (let i = AMB.vuelan.length - 1; i >= 0; i--) { const v = AMB.vuelan[i]; v.t += dt; if (v.t >= v.d) { AMB.vuelan.splice(i, 1); AMB.chispas.push({ x: p.x, y: p.y - 6, t: 0 }); } }
  for (let i = AMB.chispas.length - 1; i >= 0; i--) if ((AMB.chispas[i].t += dt) > 0.3) AMB.chispas.splice(i, 1);
  void now;
}

// ---------- dibujo ----------
// huellas: en el suelo, bajo todo lo demás
function ambHuellas(ctx) {
  if (!AMB.huellas.length) return; const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  for (const h of AMB.huellas) { const f = 1 - h.t / h.vida, a = (h.tipo === 'nieve' ? 0.34 : h.tipo === 'barro' ? 0.3 : 0.22) * Math.min(1, f * 1.6), X = Math.round(h.x), Y = Math.round(h.y), hor = Math.abs(Math.cos(h.ang)) > 0.6;
    ctx.fillStyle = h.tipo === 'nieve' ? `rgba(90,120,170,${a.toFixed(3)})` : `rgba(40,24,10,${a.toFixed(3)})`;
    if (hor) ctx.fillRect(X - 1, Y, 3, 2); else ctx.fillRect(X, Y - 1, 2, 3);                           // la pisada
    ctx.fillStyle = h.tipo === 'nieve' ? `rgba(255,255,255,${(a * 0.9).toFixed(3)})` : `rgba(255,240,210,${(a * 0.4).toFixed(3)})`;
    if (hor) ctx.fillRect(X - 1, Y - 1, 3, 1); else ctx.fillRect(X - 1, Y - 1, 1, 3); }                // borde levantado con luz
  ctx.imageSmoothingEnabled = sm;
}
// hojas y luciérnagas: por encima del mundo (las luciérnagas, también por encima de la oscuridad)
function ambEncima(ctx, k, ox, oy) {
  if (!AMB.hojas.length && !AMB.luces.length && !AMB.vuelan.length && !AMB.chispas.length) return; ctx.setTransform(k, 0, 0, k, ox, oy); const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  const luz = 0.3 + 0.7 * (1 - ambNoche()); // de noche las hojas se ven más apagadas (van por encima de la capa oscura)
  for (const h of AMB.hojas) { const X = Math.round(h.x), Y = Math.round(h.y), a = (h.pos ? Math.max(0, 1 - h.pos / 2.6) : Math.min(1, h.t * 3)) * luz, giro = Math.sin(h.ph) > 0;
    ctx.fillStyle = ambCol(h.c, giro ? 1.15 : 0.8, a); if (h.pos || giro) ctx.fillRect(X, Y, 2, 1); else ctx.fillRect(X, Y, 1, 2);  // la hoja gira al caer
    ctx.fillStyle = ambCol(h.c, 0.55, a * 0.8); ctx.fillRect(X + (giro ? 1 : 0), Y + 1, 1, 1); }
  if (AMB.vuelan.length && S && S.player) { const p = S.player;
    for (const v of AMB.vuelan) { const k = v.t / v.d, e = 1 - Math.pow(1 - k, 3), X = v.x + (p.x - v.x) * e, Y = v.y + (p.y - 8 - v.y) * e - Math.sin(k * Math.PI) * 14, sz = Math.round(12 - k * 4);
      try { const im = itemSprite(v.id); ctx.globalAlpha = 1; ctx.drawImage(im, Math.round(X - sz / 2), Math.round(Y - sz / 2), sz, sz); } catch (e2) { ctx.fillStyle = '#ffd34a'; ctx.fillRect(Math.round(X) - 1, Math.round(Y) - 1, 3, 3); }
      ctx.fillStyle = 'rgba(255,250,200,.8)'; ctx.fillRect(Math.round(X + Math.cos(v.t * 20) * 6), Math.round(Y + Math.sin(v.t * 20) * 6), 1, 1); } }
  for (const c of AMB.chispas) { const k = c.t / 0.3, r = 3 + k * 7, a = 1 - k; ctx.fillStyle = `rgba(255,246,190,${a.toFixed(2)})`;
    for (let q = 0; q < 6; q++) { const an = q / 6 * Math.PI * 2; ctx.fillRect(Math.round(c.x + Math.cos(an) * r), Math.round(c.y + Math.sin(an) * r), 1, 1); } } // brillo al llegar
  if (AMB.luces.length) { ctx.globalCompositeOperation = 'lighter'; const now = performance.now() / 1000;
    for (const l of AMB.luces) { const b = Math.max(0, Math.sin(l.ph * 2.3 + l.t)) * Math.min(1, l.t, (l.vida - l.t)) * ambNoche(); if (b < 0.05) continue; const X = Math.round(l.x), Y = Math.round(l.y);
      ctx.fillStyle = `rgba(150,220,80,${(b * 0.22).toFixed(3)})`; ctx.fillRect(X - 2, Y - 1, 5, 3); ctx.fillRect(X - 1, Y - 2, 3, 5); // halo de píxeles
      ctx.fillStyle = `rgba(230,255,140,${b.toFixed(3)})`; ctx.fillRect(X, Y, 1, 1); }
    ctx.globalCompositeOperation = 'source-over'; void now; }
  ctx.imageSmoothingEnabled = sm;
}
// Enganches: las huellas van con la decoración del suelo; hojas y luciérnagas, al final del fotograma
if (typeof drawGroundDecor === 'function') { const d0 = drawGroundDecor; drawGroundDecor = (ctx, k, ox, oy, x0, y0, x1, y1) => { ambHuellas(ctx); return d0(ctx, k, ox, oy, x0, y0, x1, y1); }; }
{ const r0 = render; render = fdt => { const r = r0(fdt); try { if (S && S.player && cw > 2 && ch > 2 && OPT.ambiente !== false) {
    const z = view.z, k = z * dpr, ox = Math.round(cw / 2 * dpr - view.x * k), oy = Math.round(ch / 2 * dpr - view.y * k);
    const x0 = Math.floor((view.x - cw / 2 / z) / T) - 1, x1 = Math.ceil((view.x + cw / 2 / z) / T) + 1, y0 = Math.floor((view.y - ch / 2 / z) / T) - 1, y1 = Math.ceil((view.y + ch / 2 / z) / T) + 1;
    if (z > 0.68) { ambTick(fdt, x0, y0, x1, y1); ambEncima(ctx, k, ox, oy); }
    ctx.setTransform(1, 0, 0, 1, 0, 0); } } catch (e) { console.warn(e); } return r; }; }

// Al romper o recoger algo se llama a burst(casilla); lo que entra al inventario justo después sale volando desde ahí
if (typeof burst === 'function') { const b0 = burst; burst = (tx, ty, ...a) => { AMB.rompe = { x: (tx + 0.5) * T, y: (ty + 0.5) * T, t: performance.now() }; return b0(tx, ty, ...a); }; }
if (typeof invAdd === 'function') { const i0 = invAdd; invAdd = (id, n) => { const left = i0(id, n);
  try { const r = AMB.rompe; if (r && n > left && performance.now() - r.t < 300 && AMB.vuelan.length < 12 && OPT.ambiente !== false) AMB.vuelan.push({ id, x: r.x, y: r.y, t: 0, d: 0.32 + Math.random() * 0.08 }); } catch (e) { }
  return left; }; }
