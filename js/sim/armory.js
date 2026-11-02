'use strict';
// =====================================================================================
//  La Armería (datos en data/armory.js): bonos al combinar, dibujo y auras.
//  · Bonos: 2 piezas del mismo estilo → bono pequeño; 4 → bono grande (según el nivel más bajo
//    de las cuatro). 4 piezas del mismo nivel (estilos mezclados) → «Armonía»: defensa y vida.
//    Conjunto completo (mismo estilo y nivel) → los dos bonos, su aura y, en nivel 10, la Forma divina.
//  · Dibujo: cada estilo tiene su casco (yelmo con visera, capucha, sombrero o diadema, máscara,
//    yelmo alado o corona) y su textura en alta resolución (placas, correas, runas, cruces…),
//    con gemas y brillos que crecen con el nivel. Todo se ajusta a la raza y complexión elegidas.
//  · Auras (se ven también en los demás jugadores): brillo en el suelo y chispas desde el nivel 4;
//    con el conjunto completo, llamas (Guerrero), viento (Explorador), runas que orbitan (Arcano),
//    humo y ojos (Sombra) o halo con rayos y alas de luz (Sagrado).
// =====================================================================================
const AX_SLOTS = ['head', 'chest', 'legs', 'feet'];
// Lo que llevas puesto de la Armería
function axProfile(eq) {
  const P = [], by = {}; if (!eq) return { P, by, full: null, tier: null, top: -1 };
  for (const sl of AX_SLOTS) { const id = eq[sl], a = id && ITEMS[id] && ITEMS[id].armor; if (!a || !a.xl) continue; P.push({ sl, st: a.xl.st, t: a.xl.t, c: a.c, c2: a.xl.c2, c3: a.xl.c3 }); (by[a.xl.st] || (by[a.xl.st] = [])).push(a.xl.t); }
  const tier = P.length === 4 && P.every(p => p.t === P[0].t) ? P[0].t : null, st = P.length === 4 && P.every(p => p.st === P[0].st) ? P[0].st : null;
  return { P, by, tier, st, full: st && tier !== null ? { st, t: tier } : null, minT: P.length ? Math.min(...P.map(p => p.t)) : -1, top: P.length ? Math.max(...P.map(p => p.t)) : -1 };
}
// Bonos por estilo: [2 piezas, 4 piezas] según k = nivel más bajo + 1
const AX_BON = {
  w: [k => ({ def: 1 + (k >> 1) }), k => ({ def: 2 + k, melee: 1.05 + 0.01 * k, hp: 3 * k })],
  h: [k => ({ ranged: 1.02 + 0.005 * k }), k => ({ ranged: 1.05 + 0.01 * k, speed: 1.03 + 0.004 * k })],
  m: [k => ({ mana: 5 + 4 * k }), k => ({ mana: 15 + 8 * k, manaRegen: 1.1 + 0.03 * k })],
  s: [k => ({ luck: 0.01 + 0.002 * k }), k => ({ luck: 0.02 + 0.005 * k, detect: Math.max(0.5, 0.9 - 0.02 * k), night: 0.1 })],
  g: [k => ({ hp: 3 + 2 * k }), k => ({ hp: 8 + 5 * k, heal: 1.1 + 0.03 * k, wound: Math.max(0.6, 0.95 - 0.01 * k) })],
};
const AX_DIVINE = { w: { melee: 1.15, def: 10 }, h: { speed: 1.1, ranged: 1.15 }, m: { manaRegen: 1.5, mana: 60 }, s: { detect: 0.6, luck: 0.08 }, g: { heal: 1.4, hp: 40 } };
function axBonusList(eq) {
  const pr = axProfile(eq), out = [];
  for (const st in pr.by) { const L = pr.by[st], k = Math.min(...L) + 1; if (L.length >= 4) out.push([`${AX_STYLES[st].i} ${AX_STYLES[st].n}: 4 piezas`, AX_BON[st][1](k)]); else if (L.length >= 2) out.push([`${AX_STYLES[st].i} ${AX_STYLES[st].n}: ${L.length} piezas (bono de 2; con 4, el grande)`, AX_BON[st][0](k)]); }
  if (pr.tier !== null) out.push([pr.tier >= 10 ? '◆ Armonía mítica' : `◆ Armonía de nivel ${pr.tier + 1}`, { def: 1 + pr.tier, hp: 2 * (pr.tier + 1) }]);
  if (pr.full && pr.full.t === 9) out.push([`✸ Forma divina ${AX_STYLES[pr.full.st].n.toLowerCase()}`, AX_DIVINE[pr.full.st]]);
  return out;
}
// Para charMods (sim/character.js): pares [mod, valor]
function axSetMods(eq) { const r = []; for (const [, m] of axBonusList(eq)) for (const k in m) r.push([k, m[k]]); return r; }

// ---------- Cascos: la forma de cada estilo ----------
{ const h0 = paintHelm; paintHelm = (P2, a, d, hx, hw) => {
  if (!a || !a.xl) return h0(P2, a, d, hx, hw);
  const { st, t, c2, c3 } = a.xl, c = a.c, hi = shade(c, 0.35), lo = shade(c, -0.3), back = d >= 3, side = d === 2, mid = hx + (hw >> 1);
  if (st === 'w') { // yelmo cerrado con visera en T; cresta, cuernos y corona según el nivel
    P2(hx - 1, 0, hw + 2, 5, c); P2(hx - 1, 0, hw + 2, 1, hi); P2(hx, 1, 1, 3, hi); P2(hx + hw, 1, 1, 4, lo);
    if (back) P2(hx - 1, 4, hw + 2, 4, c);
    else { P2(side ? hx + 2 : hx, 4, side ? hw - 2 : hw, 3, c); P2(side ? hx + 3 : hx + 1, 5, side ? hw - 4 : hw - 2, 1, t >= 8 ? c3 : '#14101a'); if (!side) P2(mid, 4, 1, 3, lo); }
    if (t >= 2) { P2(hx, 2, 1, 1, c2); P2(hx + hw - 1, 2, 1, 1, c2); }
    if (t >= 4) { P2(mid - 1, -2, 2, 2, c2); P2(mid, -3, 1, 1, c3); }
    if (t >= 6) { P2(hx - 2, 0, 1, 2, c2); P2(hx - 3, -2, 1, 2, c2); P2(hx + hw + 1, 0, 1, 2, c2); P2(hx + hw + 2, -2, 1, 2, c2); }
    if (t === 9) for (let i = 0; i < hw; i += 2) P2(hx + i, -1, 1, 1, c3);
  } else if (st === 'h') { // capucha que enmarca la cara; pluma y pañuelo
    P2(hx - 1, -1, hw + 2, 4, c); P2(mid - 1, -2, 2, 1, c); P2(hx - 1, 2, hw + 2, 1, c2);
    if (back) P2(hx - 1, 2, hw + 2, 7, c); else { P2(hx - 1, 3, 1, 5, c); P2(hx + hw, 3, 1, 5, lo); if (side) P2(hx - 1, 3, 3, 5, c); }
    if (t >= 3) { P2(hx + hw, -3, 1, 3, c3); P2(hx + hw + 1, -4, 1, 2, c3); }
    if (t >= 7 && !back) P2(side ? hx + 3 : hx, 6, side ? hw - 3 : hw, 2, c2);
  } else if (st === 'm') {
    if (t < 3) { // sombrero de mago puntiagudo con estrella
      P2(hx - 2, 3, hw + 4, 1, c); P2(hx, 1, hw, 2, c); P2(hx + 1, -1, hw - 2, 2, c); P2(hx + 2, -3, Math.max(1, hw - 4), 2, c); P2(mid + 1, -4, 2, 1, c);
      P2(hx, 2, hw, 1, c2); if (!back) P2(mid, 0, 1, 1, c3);
    } else { // capucha arcana con diadema y gema
      P2(hx - 1, 0, hw + 2, 3, c); if (back) P2(hx - 1, 3, hw + 2, 6, c); else { P2(hx - 1, 3, 1, 5, c); P2(hx + hw, 3, 1, 5, lo); }
      P2(hx - 1, 2, hw + 2, 1, c2); if (!back) { P2(mid, 1, 1, 2, c3); P2(mid - 1, 2, 3, 1, c2); }
      if (t >= 6) for (let i = 0; i < hw; i += 2) P2(hx + i, -1, 1, 1, c2);
      if (t >= 8) P2(mid, -3, 1, 1, c3);
    }
  } else if (st === 's') { // capucha ceñida y máscara: solo se ven los ojos (que brillan)
    P2(hx - 1, 0, hw + 2, 4, c); P2(hx - 1, 0, hw + 2, 1, hi);
    if (back) P2(hx - 1, 4, hw + 2, 4, c);
    else { P2(side ? hx + 2 : hx - 1, 5, side ? hw - 1 : hw + 2, 3, c2); P2(hx - 1, 4, 1, 4, c); P2(hx + hw, 4, 1, 4, lo);
      if (t >= 2) { const e = t >= 7 ? c3 : shade(c3, -0.2); if (side) P2(hx + hw - 2, 4, 1, 1, e); else { P2(hx + 2, 4, 1, 1, e); P2(hx + hw - 3, 4, 1, 1, e); } } }
    if (t >= 5) { P2(hx - 1, -1, 1, 1, c2); P2(hx + hw, -1, 1, 1, c2); }
  } else { // Sagrado: cofia → yelmo alado → corona con velo
    if (t < 4) { P2(hx - 1, 0, hw + 2, 4, c); P2(hx - 1, 1, hw + 2, 1, c2); if (back) P2(hx - 1, 4, hw + 2, 4, c); else { P2(hx - 1, 4, 1, 3, c); P2(hx + hw, 4, 1, 3, lo); } }
    else if (t < 7) { P2(hx - 1, 0, hw + 2, 4, c); P2(hx - 1, 0, hw + 2, 1, hi); P2(hx - 1, 3, hw + 2, 1, c2); if (back) P2(hx - 1, 4, hw + 2, 3, c); else if (!side) P2(mid, 0, 1, 3, c2);
      const wing = (x, dir) => { P2(x, 0, 2, 1, c2); P2(x + dir, -1, 2, 1, c2); P2(x + dir * 2, -2, 2, 1, hi); P2(x, 1, 2, 1, c2); };
      if (!side) { wing(hx - 3, -1); wing(hx + hw + 1, 1); } else wing(hx - 2, -1); }
    else { P2(hx - 1, 0, hw + 2, 4, c); if (back) P2(hx - 1, 4, hw + 2, 5, c); else { P2(hx - 1, 4, 1, 4, c); P2(hx + hw, 4, 1, 4, lo); }
      P2(hx - 1, 1, hw + 2, 2, c2); for (let i = 0; i < hw + 2; i += 2) P2(hx - 1 + i, -1, 1, 2, c2); if (!back) P2(mid, 1, 1, 1, c3); }
  }
}; }

// ---------- Texturas en alta resolución ----------
{ const p0 = paintHD; paintHD = (cv, sp, anchors, FW, FH, PAD) => {
  p0(cv, sp, anchors, FW, FH, PAD);
  if (!(sp.chest && sp.chest.xl) && !(sp.legs && sp.legs.xl) && !(sp.feet && sp.feet.xl)) return;
  try { axPaintHD(cv, sp, anchors, FW, FH, PAD); } catch (e) { } // un fallo aquí nunca debe romper el personaje
}; }
function axPaintHD(cv, sp, anchors, FW, FH, PAD) {
  const W = cv.width, H = cv.height, c = cv.getContext('2d', { willReadFrequently: true }), img = c.getImageData(0, 0, W, H), u = new Uint32Array(img.data.buffer), px = col => hexPx(toHex(col)) >>> 0;
  const horse = sp.race && sp.race.horse;
  for (const A of anchors) {
    if (!A || A.cs) continue; // con disfraz no se ve la armadura
    const ox = (A.f * FW + PAD + AV_M) * 2, oy = (A.d * FH + PAD + AV_M) * 2, op = (X, Y) => X >= 0 && Y >= 0 && X < W && Y < H && (u[Y * W + X] >>> 24) > 150;
    const set = (X, Y, col) => { if (op(X, Y)) u[Y * W + X] = col; };
    const h = (X, Y, k) => ((X * 73856093) ^ (Y * 19349663) ^ k) >>> 0;
    // ---- Pechera ----
    const ch = sp.chest; if (ch && ch.xl) { const { st, t } = ch.xl, C2 = px(ch.xl.c2), C3 = px(ch.xl.c3), LO = px(shade(ch.c, -0.4)), HI = px(shade(ch.c, 0.45)), WH = px('#ffffff');
      const x0 = ox + A.bx * 2, x1 = ox + (A.bx + A.bw) * 2 - 1, y0 = oy + (9 + A.yo) * 2, y1 = oy + (15 + A.yo) * 2 - 1, cx = (x0 + x1) >> 1, front = A.front;
      for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) { if (!op(X, Y)) continue; const ry = Y - y0, rx = X - x0;
        if (st === 'w') { if (ry % 4 === 3) set(X, Y, LO); else if (ry % 4 === 0 && (rx === 1 || X === x1 - 1)) set(X, Y, HI); if (ry < 2 && (rx < 3 || X > x1 - 3)) set(X, Y, C2); }
        else if (st === 'h') { if (Math.abs(rx - ry) <= 1 && front) set(X, Y, C2); else if ((rx + ry * 2) % 5 === 0) set(X, Y, LO); if ((rx === 1 || X === x1 - 1) && ry % 2 === 0) set(X, Y, HI); }
        else if (st === 'm') { if (Math.abs(X - cx) <= 1) set(X, Y, C2); if (ry === y1 - y0 - 1 && rx % 3 === 1) set(X, Y, C3); if (ry === 0) set(X, Y, C2); }
        else if (st === 's') { if (front && (Math.abs(rx - ry) === 0 || Math.abs((x1 - X) - ry) === 0)) set(X, Y, C2); if (ry === y1 - y0 - 2) set(X, Y, t >= 4 ? C3 : C2); }
        else if (st === 'g') { if (front && ((Math.abs(X - cx) <= 0 && ry >= 2 && ry <= 9) || (ry === 5 && Math.abs(X - cx) <= 3))) set(X, Y, C2); if (rx === 0 || X === x1 || ry === 0) set(X, Y, C2); }
        if (t >= 7 && h(X, Y, t) % 67 === 0) set(X, Y, C3); // destellos
        if (t >= 9 && (rx === 0 || X === x1) && (ry + (A.f << 1)) % 3 === 0) set(X, Y, C3); }
      if (front && t >= 5) { const gy = y0 + 4; for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [2, 1], [0, -1], [1, 2]]) set(cx + dx, gy + dy, dx === 0 && dy === 0 ? WH : C3); }
    }
    // ---- Pantalones / grebas ----
    const lg = sp.legs; if (lg && lg.xl && !horse) { const { st, t } = lg.xl, C2 = px(lg.xl.c2), C3 = px(lg.xl.c3), HI = px(shade(lg.c, 0.45)), LO = px(shade(lg.c, -0.4));
      const top = 16 + A.yo, y0 = oy + top * 2, y1 = oy + 21 * 2 - 1, x0 = ox + (A.tx - 1) * 2, x1 = ox + (A.tx + A.tw + 1) * 2;
      if (y1 > y0) for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) { if (!op(X, Y)) continue; const ry = Y - y0, edgeL = !op(X - 1, Y), edgeR = !op(X + 1, Y);
        if ((st === 'w' || st === 'g') && (ry === 3 || ry === 4)) set(X, Y, ry === 3 ? HI : C2);
        else if ((st === 'h' || st === 'm') && (edgeL || edgeR)) set(X, Y, C2);
        else if (st === 's' && (X + ry) % 6 === 0) set(X, Y, C2);
        else if (ry === 0) set(X, Y, LO);
        if (t >= 6 && (edgeL || edgeR) && ry % 3 === 1) set(X, Y, C3);
        if (t >= 8 && h(X, Y, 7) % 89 === 0) set(X, Y, C3); } }
    // ---- Botas ----
    const ft = sp.feet; if (ft && ft.xl && !horse) { const { st, t } = ft.xl, C2 = px(ft.xl.c2), C3 = px(ft.xl.c3), LO = px(shade(ft.c, -0.5));
      const y0 = oy + 21 * 2, y1 = oy + 23 * 2 - 1, x0 = ox + (A.tx - 2) * 2, x1 = ox + (A.tx + A.tw + 2) * 2;
      for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) { if (!op(X, Y)) continue; const ry = Y - y0, edgeL = !op(X - 1, Y), edgeR = !op(X + 1, Y);
        if (ry === y1 - y0) set(X, Y, LO); else if (ry === 0) set(X, Y, C2); else if (st === 'w' && (edgeL || edgeR)) set(X, Y, C2);
        if (t >= 5 && ry === 1 && (edgeL || edgeR)) set(X, Y, C3);
        if (t >= 8 && (st === 'g' || st === 'h') && ry === 0 && (edgeL || edgeR)) { set(X + (edgeL ? -1 : 1), Y, C3); set(X + (edgeL ? -2 : 2), Y - 1, C3); } } } // alitas en los tobillos
  }
  c.putImageData(img, 0, 0);
}

// ---------- Iconos: adorno, gema y brillo ----------
{ const d0 = drawItemPath; drawItemPath = (c, id, s) => { d0(c, id, s); const a = ITEMS[id] && ITEMS[id].armor; if (!a || !a.xl) return; const { st, t, c2, c3 } = a.xl, r = s / 2, sl = a.slot;
  c.save(); c.lineWidth = Math.max(1, s * 0.07); c.strokeStyle = c2; c.beginPath();
  if (sl === 'head') { c.moveTo(-r * 0.7, r * 0.15); c.lineTo(r * 0.7, r * 0.15); } else if (sl === 'chest') { c.moveTo(0, -r * 0.6); c.lineTo(0, r * 0.7); if (st === 'g') { c.moveTo(-r * 0.35, -r * 0.1); c.lineTo(r * 0.35, -r * 0.1); } }
  else if (sl === 'legs') { c.moveTo(-r * 0.6, -r * 0.65); c.lineTo(r * 0.6, -r * 0.65); } else { c.moveTo(-r * 0.75, -r * 0.4); c.lineTo(-r * 0.25, -r * 0.4); }
  c.stroke();
  if (t >= 3) { const gx = sl === 'feet' ? -r * 0.5 : 0, gy = sl === 'head' ? -r * 0.25 : sl === 'legs' ? -r * 0.65 : sl === 'feet' ? -r * 0.1 : -r * 0.15; if (t >= 6) { c.shadowColor = c3; c.shadowBlur = s * 0.35; }
    c.fillStyle = c3; c.beginPath(); c.arc(gx, gy, s * (0.06 + t * 0.007), 0, 7); c.fill(); c.shadowBlur = 0; c.fillStyle = '#fff'; c.fillRect(gx - s * 0.03, gy - s * 0.04, s * 0.04, s * 0.04); }
  if (t >= 8) { c.fillStyle = c3; for (const [x, y] of [[-0.8, -0.8], [0.8, -0.7], [0.75, 0.75], [-0.7, 0.8]]) { c.beginPath(); c.arc(x * r, y * r, s * 0.035, 0, 7); c.fill(); } }
  if (t === 9) { c.strokeStyle = c3; c.globalAlpha = 0.7; c.lineWidth = Math.max(1, s * 0.05); c.beginPath(); c.arc(0, 0, r * 1.05, 0, 7); c.stroke(); }
  c.restore(); }; }

// ---------- Auras ----------
const AX_GLYPH = ['ᚠ', 'ᚱ', 'ᛟ', 'ᚦ', '✦', 'ᛉ', 'ᛞ', '☽', '✧'];
// x, y: los pies del personaje (como se dibuja: y + 8 − altura). layer: 0 detrás, 1 delante
function axDrawAura(ctx, eq, x, y, now, layer, wear) {
  const pr = axProfile(eq); if (!pr.P.length || pr.top < 3) return; const T0 = now / 1000;
  const best = pr.P.reduce((a, b) => b.t > a.t ? b : a), F = pr.full;
  ctx.save();
  if (layer === 0) {
    // Brillo en el suelo
    const r0 = 13 + best.t * 1.6 + Math.sin(T0 * 2) * 1.5, g = ctx.createRadialGradient(x, y + 2, 1, x, y + 2, r0); g.addColorStop(0, best.c3 + 'aa'); g.addColorStop(1, best.c3 + '00');
    ctx.globalAlpha = 0.25 + 0.04 * (best.t - 3); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y + 2, r0, r0 * 0.38, 0, 0, 7); ctx.fill();
    if (F && F.t >= 4) { const I = F.t, P0 = pr.P[0];
      if (F.st === 'g') { // rayos de luz detrás y alas de luz desde el nivel 9
        ctx.globalAlpha = 0.12 + 0.02 * (I - 4); ctx.fillStyle = P0.c3; for (let i = 0; i < 8; i++) { const a = T0 * 0.4 + i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x, y - 22); ctx.lineTo(x + Math.cos(a - 0.08) * (28 + I * 3), y - 22 + Math.sin(a - 0.08) * (28 + I * 3)); ctx.lineTo(x + Math.cos(a + 0.08) * (28 + I * 3), y - 22 + Math.sin(a + 0.08) * (28 + I * 3)); ctx.fill(); }
        if (I >= 8) { ctx.globalAlpha = 0.55; const flap = Math.sin(T0 * 2.4) * 0.12; for (const s of [-1, 1]) for (let k = 0; k < 5; k++) { const a = -0.6 - k * 0.22 + flap; ctx.strokeStyle = k % 2 ? P0.c2 : P0.c3; ctx.lineWidth = 2.2 - k * 0.2; ctx.beginPath(); ctx.moveTo(x + s * 4, y - 22); ctx.quadraticCurveTo(x + s * (14 + k * 3), y - 34 - k * 2, x + s * Math.cos(a) * (22 + k * 4), y - 22 + Math.sin(a) * (10 + k * 3) - 6); ctx.stroke(); } } }
      if (F.st === 'w') { for (let i = 0; i < 6 + I; i++) { const a = i / (6 + I) * 6.28 + T0 * 0.6, fl = (Math.sin(T0 * 9 + i * 1.7) + 1) * 0.5, rr = 12 + I; ctx.globalAlpha = 0.5 + 0.3 * fl; ctx.fillStyle = i % 2 ? P0.c3 : P0.c2; const fx = x + Math.cos(a) * rr, fy = y + 2 + Math.sin(a) * rr * 0.38; ctx.beginPath(); ctx.moveTo(fx - 2.5, fy); ctx.quadraticCurveTo(fx, fy - 8 - fl * (4 + I * 0.6), fx + 2.5, fy); ctx.fill(); } }
      if (F.st === 's') { for (let i = 0; i < 5 + I; i++) { const ph = (T0 * 0.5 + i * 0.37) % 1, a = i * 2.4; ctx.globalAlpha = (1 - ph) * 0.35; ctx.fillStyle = i % 3 ? '#0a0610' : P0.c2; ctx.beginPath(); ctx.arc(x + Math.cos(a) * (6 + ph * 10), y - ph * 26, 3 + ph * 5, 0, 7); ctx.fill(); } }
    }
  } else {
    // Chispas que suben (una por cada nivel por encima del 3, de cada pieza)
    for (const p of pr.P) { const n = Math.max(0, p.t - 3); for (let i = 0; i < n; i++) { const ph = (T0 * (0.35 + i * 0.03) + i * 0.61 + p.t * 0.17) % 1, a = (i * 2.39 + p.t) % 6.28, rr = 8 + (i % 4) * 2;
      ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.85; ctx.fillStyle = i % 3 === 0 ? p.c2 : p.c3; const s = p.t >= 8 ? 1.8 : 1.3; ctx.fillRect(x + Math.cos(a) * rr - s / 2, y - 4 - ph * 34 + Math.sin(a) * 2, s, s); } }
    if (F && F.t >= 4) { const I = F.t, P0 = pr.P[0];
      if (F.st === 'm') { const n = 3 + (I - 4); ctx.font = `bold ${8 + (I >> 1)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let i = 0; i < n; i++) { const a = T0 * 1.2 + i / n * 6.28, fx = x + Math.cos(a) * (15 + I), fy = y - 16 + Math.sin(a) * 6; if (Math.sin(a) < 0) continue; ctx.globalAlpha = 0.85; ctx.shadowColor = P0.c3; ctx.shadowBlur = 6; ctx.fillStyle = P0.c3; ctx.fillText(AX_GLYPH[i % AX_GLYPH.length], fx, fy); } ctx.shadowBlur = 0; }
      if (F.st === 'h') { ctx.strokeStyle = P0.c3; ctx.lineWidth = 1.4; for (let i = 0; i < 3; i++) { const a = T0 * 2.2 + i * 2.09; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(x, y - 10 - i * 7, 14 + I * 0.8, 4, 0, a, a + 2.2); ctx.stroke(); } }
      if (F.st === 'g') { ctx.globalAlpha = 0.9; ctx.strokeStyle = P0.c2; ctx.shadowColor = P0.c3; ctx.shadowBlur = 8; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - 47 + Math.sin(T0 * 2) * 1.2, 8, 2.6, 0, 0, 7); ctx.stroke(); ctx.shadowBlur = 0; }
      if (F.st === 's' && I >= 6) { ctx.globalAlpha = 0.7 + 0.3 * Math.sin(T0 * 4); ctx.fillStyle = P0.c3; ctx.fillRect(x - 3, y - 31, 1.5, 1.5); ctx.fillRect(x + 2, y - 31, 1.5, 1.5); }
      if (I === 9) { const pulse = (T0 * 0.8) % 1; ctx.globalAlpha = (1 - pulse) * 0.6; ctx.strokeStyle = P0.c3; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + 2, 10 + pulse * 30, (10 + pulse * 30) * 0.38, 0, 0, 7); ctx.stroke(); }
    }
    // Armonía de nivel alto (estilos mezclados): anillo de colores
    if (pr.tier !== null && !F && pr.tier >= 5) for (let i = 0; i < 4; i++) { const a = T0 * 1.5 + i * 1.57, p = pr.P[i]; ctx.globalAlpha = 0.8; ctx.fillStyle = p.c3; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 16, y - 14 + Math.sin(a) * 5, 1.8, 0, 7); ctx.fill(); }
  }
  ctx.restore();
}
// Al jugador: detrás y delante del personaje
{ const d0 = drawPlayer; drawPlayer = ctx => { if (!S || !S.equip || S.equip.costume) return d0(ctx); const p = S.player, m = typeof mountPet === 'function' && mountPet(), y = p.y + (m ? -8 : 0) + 8 - (P.z || 0), now = performance.now();
  if (P.swim !== 2) axDrawAura(ctx, S.equip, p.x, y, now, 0); const r = d0(ctx); if (P.swim !== 2) axDrawAura(ctx, S.equip, p.x, y, now, 1); return r; }; }

// ---------- Pestaña de la ventana de Aventura: la Armería ----------
const AXV = { st: 'all' };
ADV.tabs.armor = { n: '🛡 Armería', render() {
  const eq = S.equip || {}, bl = axBonusList(eq), pr = axProfile(eq), fmt = m => icMods(m).map(([n, v]) => `${n} ${v}`).join(' · ');
  const now = `<div class="axnow"><b>Llevas puesto:</b> ${pr.P.length ? pr.P.map(p => `<span style="color:${p.c3}">${AX_STYLES[p.st].i} ${ARMOR_SLOTS[p.sl]} nv ${p.t + 1}</span>`).join(' · ') : '<span class="mut">ninguna pieza de la Armería</span>'}
    ${bl.length ? `<div class="axbon">${bl.map(([n, m]) => `<div><b>${n}</b><span>${fmt(m)}</span></div>`).join('')}</div>` : '<p class="mut small">Ponte 2 o 4 piezas del mismo estilo, o 4 del mismo nivel, para conseguir bonos. El conjunto completo despierta su aura (desde el nivel 5).</p>'}</div>`;
  const sts = ['all', ...AX_KEYS], have = id => invCount(id) > 0 || Object.values(eq).includes(id);
  const rows = []; for (let t = 0; t < 10; t++) for (const st of AX_KEYS) { if (AXV.st !== 'all' && AXV.st !== st) continue; const si = AX_KEYS.indexOf(st), [c, c2, c3] = AX_COL[t][si], ids = AX_SLOTS.map(sl => 'ax' + st + t + AX_ID_SLOT[sl]);
    rows.push(`<div class="axset" style="--c:${c};--c2:${c2};--c3:${c3}"><div class="axh"><b>${AX_STYLES[st].i} Conjunto ${esc(AX_SET_N[t][si])}</b><span>nivel ${t + 1} · ${AX_DEF[t] ? Math.round(AX_DEF[t] * AX_STYLE_DEF[st]) : 0} de defensa en total</span></div>
      <div class="axpcs">${ids.map(id => `<span class="axp ${have(id) ? 'ok' : ''}" data-id="${id}" title="${esc(ITEMS[id].n)}">${itemImg(id, 26)}</span>`).join('')}</div>
      <small class="mut">4 piezas: ${fmt(AX_BON[st][1](t + 1))}${t === 9 ? ' · Forma divina: ' + fmt(AX_DIVINE[st]) : ''}</small></div>`); }
  return `${now}<div class="achcats">${sts.map(s => `<button class="${AXV.st === s ? 'on' : ''}" data-axst="${s}">${s === 'all' ? 'Todos' : AX_STYLES[s].i + ' ' + AX_STYLES[s].n}</button>`).join('')}</div><p class="mut small">Pasa el ratón por una pieza para ver qué pide. Las piezas con ✓ ya las tienes. Del nivel 1 (fácil) al 10 (casi imposible: almas de jefe y gemas talladas).</p><div class="axgrid">${rows.join('')}</div>`;
} };
document.addEventListener('click', e => { const b = e.target.closest('[data-axst]'); if (b) { AXV.st = b.dataset.axst; advRender(); } });
