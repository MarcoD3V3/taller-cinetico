'use strict';
// =====================================================================================
//  Armaduras míticas: dibujo y auras (datos en data/mythic.js).
//  · Te hacen más grande: +6 % de tamaño por pieza (también lo ven los demás jugadores).
//  · En el sprite: casco con cuernos y cresta (Abismo) o corona de agujas de cristal (Titán),
//    hombreras enormes que sobresalen del cuerpo con picos, espinas en la espalda y texturas de
//    grietas de lava o facetas de cristal.
//  · Encima, en tiempo real: picos y agujas más grandes que el propio cuerpo, alas de cristal o
//    espinas de dragón detrás, y el aura: suelo agrietado con brasas o pilar de luz con fragmentos
//    de cristal orbitando.
// =====================================================================================
AX_BON.x = [() => MY_SETS.x.bon[0], () => MY_SETS.x.bon[1]];
AX_BON.y = [() => MY_SETS.y.bon[0], () => MY_SETS.y.bon[1]];
AX_DIVINE.x = MY_SETS.x.bon[1]; AX_DIVINE.y = MY_SETS.y.bon[1];
const myCount = eq => { if (!eq || eq.costume) return { x: 0, y: 0, n: 0 }; const r = { x: 0, y: 0, n: 0 }; for (const sl of AX_SLOTS) { const a = eq[sl] && ITEMS[eq[sl]] && ITEMS[eq[sl]].armor; if (a && a.xl && a.xl.myth) { r[a.xl.st]++; r.n++; } } return r; };
const myScale = eq => 1 + 0.06 * myCount(eq).n;
// Más grande: el sprite se dibuja a mayor escala
{ const d0 = drawAvatar; drawAvatar = (ctx, look, equip, x, y, ang, walk, moving, sc = 2, held, swing) => d0(ctx, look, equip, x, y, ang, walk, moving, sc * myScale(equip), held, swing); }

// ---------- Cascos ----------
{ const h0 = paintHelm; paintHelm = (P2, a, d, hx, hw) => {
  if (!a || !a.xl || !a.xl.myth) return h0(P2, a, d, hx, hw);
  const { st, c2, c3 } = a.xl, c = a.c, hi = shade(c, 0.35), lo = shade(c, -0.3), back = d >= 3, side = d === 2, mid = hx + (hw >> 1);
  if (st === 'x') { // gran yelmo de obsidiana: ojos de lava, cresta de picos y dos cuernos curvos
    P2(hx - 1, 0, hw + 2, 6, c); P2(hx - 1, 0, hw + 2, 1, hi); P2(hx + hw, 1, 1, 5, lo);
    if (back) P2(hx - 1, 5, hw + 2, 3, c); else if (side) { P2(hx + hw - 3, 4, 2, 1, c3); P2(hx + hw - 1, 5, 1, 2, c2); } else { P2(hx + 1, 4, 2, 1, c3); P2(hx + hw - 3, 4, 2, 1, c3); P2(mid, 5, 1, 2, c2); }
    P2(hx + 1, 2, 1, 2, c3); P2(hx + hw - 2, 1, 1, 2, c3); // grietas de lava
    P2(mid - 1, -1, 1, 1, c); P2(mid, -3, 1, 3, c); P2(mid + 1, -1, 1, 1, c); P2(mid, -4, 1, 1, c2);
    const horn = (x, s) => { P2(x, 1, 1, 2, c2); P2(x + s, -1, 1, 2, c2); P2(x + s * 2, -3, 1, 2, shade(c2, 0.25)); P2(x + s, -4, 1, 1, c3); };
    if (side) horn(hx - 1, -1); else { horn(hx - 2, -1); horn(hx + hw + 1, 1); }
  } else { // corona de cristal: agujas de distinta altura, banda de oro, cara al descubierto
    P2(hx - 1, 0, hw + 2, 4, c); P2(hx - 1, 2, hw + 2, 1, c2); if (back) P2(hx - 1, 4, hw + 2, 4, c); else { P2(hx - 1, 4, 1, 3, c); P2(hx + hw, 4, 1, 3, lo); }
    const sp = [[hx - 1, 2], [hx + 1, 3], [mid, 5], [hx + hw - 2, 3], [hx + hw, 2]];
    for (const [x, h] of sp) { P2(x, -h + 1, 1, h, c3); P2(x, -h + 1, 1, 1, '#ffffff'); }
    if (!back) { P2(mid, 1, 1, 1, '#ffffff'); P2(mid - 1, 1, 1, 1, c3); P2(mid + 1, 1, 1, 1, c3); }
  }
}; }
// ---------- Hombreras que sobresalen y espinas (en el sprite) ----------
{ const f0 = paintFrame; paintFrame = (c, sp0, d, f) => { const A = f0(c, sp0, d, f); try { myFrameExtras(c, sp0, A); } catch (e) { } return A; }; }
function myFrameExtras(c, sp, A) {
  const ch = sp.chest; if (!A || A.cs || !ch || !ch.xl || !ch.xl.myth) return; const { st, c2, c3 } = ch.xl, k = ch.c, hi = shade(k, 0.35), yo = A.yo;
  const P = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y + yo, w, h); };
  const L = A.bx, R = A.bx + A.bw;
  const paul = (x0, dir) => { // x0: borde exterior del hombro; dir: -1 izquierda, 1 derecha
    const x = dir < 0 ? x0 - 3 : x0 - 1; P(x, 9, 4, 3, k); P(x, 8, 4, 1, hi); P(x + (dir < 0 ? 0 : 3), 9, 1, 3, st === 'x' ? c2 : c2); P(x, 11, 4, 1, shade(k, -0.3));
    if (st === 'x') { P(x + (dir < 0 ? 0 : 3), 6, 1, 2, c2); P(x + (dir < 0 ? -1 : 4), 7, 1, 2, c2); P(x + 1 + (dir < 0 ? 0 : 1), 5, 1, 3, c2); P(x + 1 + (dir < 0 ? 0 : 1), 4, 1, 1, c3); P(x + 1, 10, 2, 1, c3); }
    else { P(x + 1, 5, 1, 3, c3); P(x + 1, 5, 1, 1, '#ffffff'); P(x + 2 + (dir < 0 ? 0 : -2) + (dir < 0 ? 0 : 2), 6, 1, 2, c3); P(x, 8, 4, 1, c2); }
  };
  if (A.side) paul(A.bx + 4, 1);
  else { paul(L, -1); paul(R, 1); }
  // Espinas en la espalda (Abismo) o cristales (Titán) al ir de espaldas
  if (A.back) { const m = L + (A.bw >> 1); for (let y = 10; y <= 14; y += 2) { P(m - 1, y, 2, 1, st === 'x' ? c2 : c3); P(m, y - 1, 1, 1, st === 'x' ? c3 : '#ffffff'); } }
}
// ---------- Texturas en alta resolución: lava o cristal ----------
{ const p0 = paintHD; paintHD = (cv, sp, anchors, FW, FH, PAD) => { p0(cv, sp, anchors, FW, FH, PAD); const any = [sp.chest, sp.legs, sp.feet].some(a => a && a.xl && a.xl.myth); if (!any) return; try { myPaintHD(cv, sp, anchors, FW, FH, PAD); } catch (e) { } }; }
function myPaintHD(cv, sp, anchors, FW, FH, PAD) {
  const W = cv.width, H = cv.height, g = cv.getContext('2d', { willReadFrequently: true }), img = g.getImageData(0, 0, W, H), u = new Uint32Array(img.data.buffer), px = col => hexPx(toHex(col)) >>> 0;
  const horse = sp.race && sp.race.horse;
  for (const A of anchors) { if (!A || A.cs) continue; const ox = (A.f * FW + PAD + AV_M) * 2, oy = (A.d * FH + PAD + AV_M) * 2, op = (X, Y) => X >= 0 && Y >= 0 && X < W && Y < H && (u[Y * W + X] >>> 24) > 150, set = (X, Y, col) => { if (op(X, Y)) u[Y * W + X] = col; };
    const region = (a, x0, x1, y0, y1) => { if (!a || !a.xl || !a.xl.myth || y1 < y0) return; const C2 = px(a.xl.c2), C3 = px(a.xl.c3), WH = px('#ffffff'), HI = px(shade(a.c, 0.5));
      for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) { if (!op(X, Y)) continue; const rx = X - x0, ry = Y - y0, h = ((X * 2654435761) ^ (Y * 40503)) >>> 0;
        if (a.xl.st === 'x') { // grietas de lava en zigzag y remaches de hierro negro
          if ((rx + ((ry >> 1) & 1) * 2 + (ry % 7 === 0 ? 1 : 0)) % 9 === 0 && ry % 3 !== 2) set(X, Y, C3); else if (h % 41 === 0) set(X, Y, C2); else if (ry % 6 === 0 && rx % 4 === 1) set(X, Y, HI); }
        else { // facetas de cristal: diagonales de luz y filos de oro
          if ((rx + ry) % 7 === 0) set(X, Y, C3); else if ((rx - ry + 64) % 11 === 0) set(X, Y, WH); if (rx === 0 || X === x1) set(X, Y, C2); if (h % 53 === 0) set(X, Y, WH); } } };
    region(sp.chest, ox + (A.bx - 4) * 2, ox + (A.bx + A.bw + 4) * 2, oy + (8 + A.yo) * 2, oy + (15 + A.yo) * 2 - 1);
    if (!horse) { region(sp.legs, ox + (A.tx - 1) * 2, ox + (A.tx + A.tw + 1) * 2, oy + (16 + A.yo) * 2, oy + 21 * 2 - 1); region(sp.feet, ox + (A.tx - 2) * 2, ox + (A.tx + A.tw + 2) * 2, oy + 21 * 2, oy + 23 * 2 - 1); } }
  g.putImageData(img, 0, 0);
}
// ---------- Encima, en tiempo real: lo que sobresale y el aura ----------
{ const a0 = axDrawAura; axDrawAura = (ctx, eq, x, y, now, layer, wear) => { a0(ctx, eq, x, y, now, layer, wear); const n = myCount(eq); if (!n.n) return; try { myDraw(ctx, eq, n, x, y, now, layer); } catch (e) { } }; }
function myDraw(ctx, eq, n, x, y, now, layer) {
  const T0 = now / 1000, k = 1.6 * myScale(eq), Y = r => y + (r - 21) * k, sh = 4.5 * k, full = n.x === 4 || n.y === 4, st = n.x >= n.y ? 'x' : 'y', D = MY_SETS[st];
  const chestOn = eq.chest && ITEMS[eq.chest] && ITEMS[eq.chest].armor.xl && ITEMS[eq.chest].armor.xl.myth, headOn = eq.head && ITEMS[eq.head] && ITEMS[eq.head].armor.xl && ITEMS[eq.head].armor.xl.myth;
  ctx.save();
  if (layer === 0) {
    if (st === 'x') {
      if (full) { // suelo agrietado de lava
        ctx.globalAlpha = 0.55 + 0.25 * Math.sin(T0 * 3); ctx.strokeStyle = D.c3; ctx.lineWidth = 1.6; ctx.shadowColor = D.c3; ctx.shadowBlur = 8;
        for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28 + 0.3, r1 = 6, r2 = 26 + (i % 3) * 7; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r1, y + 2 + Math.sin(a) * r1 * 0.4); ctx.lineTo(x + Math.cos(a + 0.15) * (r1 + r2) * 0.55, y + 2 + Math.sin(a + 0.15) * (r1 + r2) * 0.22); ctx.lineTo(x + Math.cos(a - 0.05) * r2, y + 2 + Math.sin(a - 0.05) * r2 * 0.4); ctx.stroke(); }
        ctx.shadowBlur = 0; }
      if (chestOn) { // espinas de dragón a la espalda, más altas que la cabeza
        ctx.globalAlpha = 1; for (let i = -2; i <= 2; i++) { const bx = x + i * 5 * k / 1.6, h = (30 - Math.abs(i) * 6) * k / 1.6, by = Y(10); ctx.fillStyle = D.c; ctx.beginPath(); ctx.moveTo(bx - 3, by); ctx.lineTo(bx + i * 2, by - h - 8); ctx.lineTo(bx + 3, by); ctx.fill(); ctx.fillStyle = D.c3; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(T0 * 4 + i); ctx.beginPath(); ctx.moveTo(bx - 1, by - 2); ctx.lineTo(bx + i * 2, by - h - 6); ctx.lineTo(bx + 1, by - 2); ctx.fill(); ctx.globalAlpha = 1; } }
    } else {
      if (full) { // pilar de luz y círculo rúnico girando en el suelo
        const g = ctx.createLinearGradient(x, y - 120, x, y); g.addColorStop(0, D.c3 + '00'); g.addColorStop(1, D.c3 + '55'); ctx.globalAlpha = 0.6 + 0.2 * Math.sin(T0 * 2); ctx.fillStyle = g; ctx.fillRect(x - 12, y - 120, 24, 122);
        ctx.globalAlpha = 0.7; ctx.strokeStyle = D.c2; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, y + 2, 30, 11, 0, 0, 7); ctx.stroke(); ctx.strokeStyle = D.c3; ctx.beginPath(); ctx.ellipse(x, y + 2, 24, 9, 0, 0, 7); ctx.stroke();
        for (let i = 0; i < 8; i++) { const a = T0 * 0.7 + i * 0.785; ctx.fillStyle = D.c2; ctx.fillRect(x + Math.cos(a) * 27 - 1, y + 2 + Math.sin(a) * 10 - 1, 2.4, 2.4); } }
      if (chestOn) { // alas de cristal: hojas facetadas que se abren y cierran
        const flap = Math.sin(T0 * 2) * 0.12; for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const a = -0.35 - i * 0.32 + flap, L2 = (26 - i * 3) * k / 1.6, bx = x + s * sh * 0.6, by = Y(11);
          const tx = bx + s * Math.cos(a) * L2, ty = by + Math.sin(a) * L2; ctx.globalAlpha = 0.55; ctx.fillStyle = i % 2 ? D.c3 : '#d8f8ff'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.lineTo(bx + s * Math.cos(a + 0.2) * L2 * 0.6, by + Math.sin(a + 0.2) * L2 * 0.6 + 4); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 0.9; ctx.strokeStyle = D.c2; ctx.lineWidth = 0.8; ctx.stroke(); } }
    }
  } else {
    if (chestOn) { // hombreras más grandes que el cuerpo: picos (Abismo) o agujas de cristal (Titán)
      const u = k / 1.6;
      for (const s of [-1, 1]) { const bx = x + s * sh, by = Y(8.5);
        // placa angular que sale del hombro
        ctx.fillStyle = st === 'x' ? D.c : D.c2; ctx.strokeStyle = st === 'x' ? D.c2 : '#ffffff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(bx - s * 1.5 * u, by + 3 * u); ctx.lineTo(bx + s * 6.5 * u, by + 3.5 * u); ctx.lineTo(bx + s * 7.5 * u, by - 1 * u); ctx.lineTo(bx + s * 1 * u, by - 3 * u); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (st === 'x') { ctx.strokeStyle = D.c3; ctx.globalAlpha = 0.55 + 0.45 * Math.sin(T0 * 4 + s); ctx.beginPath(); ctx.moveTo(bx + s * 0.5 * u, by + 1 * u); ctx.lineTo(bx + s * 3 * u, by - 0.5 * u); ctx.lineTo(bx + s * 5.5 * u, by + 1.5 * u); ctx.stroke(); ctx.globalAlpha = 1;
          for (let i = 0; i < 3; i++) { const b0 = bx + s * (1 + i * 2.4) * u, tx = b0 + s * (5 + i * 3) * u, ty = by - (11 + i * 4) * u, gr = ctx.createLinearGradient(b0, by, tx, ty); gr.addColorStop(0, D.c); gr.addColorStop(0.6, D.c2); gr.addColorStop(1, D.c3);
            ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(b0 - 1.3 * u, by - 1.5 * u); ctx.lineTo(tx, ty); ctx.lineTo(b0 + 1.3 * u, by - 2 * u); ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 0.6 + 0.4 * Math.sin(T0 * 5 + i + s); ctx.fillStyle = D.c3; ctx.shadowColor = D.c3; ctx.shadowBlur = 5; ctx.beginPath(); ctx.arc(tx, ty, 1.1 * u, 0, 7); ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1; } }
        else for (let i = 0; i < 3; i++) { const b0 = bx + s * (1 + i * 2.2) * u, h = (12 + (i === 1 ? 6 : i * 2)) * u, tx = b0 + s * i * 1.5 * u; ctx.globalAlpha = 0.88; ctx.fillStyle = i === 1 ? '#e8fcff' : D.c3; ctx.beginPath(); ctx.moveTo(b0 - 1.6 * u, by - 2 * u); ctx.lineTo(tx, by - h); ctx.lineTo(b0 + 1.6 * u, by - 2 * u); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.6; ctx.stroke(); } } }
    if (headOn && st === 'y') { // fragmentos de la corona que flotan alrededor de la cabeza
      for (let i = 0; i < 6; i++) { const a = T0 * 1.4 + i * 1.047, fx = x + Math.cos(a) * 11 * k / 1.6, fy = Y(-1) + Math.sin(a) * 3 - 2; if (Math.sin(a) < -0.2) continue; ctx.globalAlpha = 0.9; ctx.fillStyle = i % 2 ? D.c3 : '#ffffff'; ctx.beginPath(); ctx.moveTo(fx, fy - 4); ctx.lineTo(fx + 2, fy); ctx.lineTo(fx, fy + 4); ctx.lineTo(fx - 2, fy); ctx.closePath(); ctx.fill(); } }
    if (headOn && st === 'x') { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T0 * 6); ctx.fillStyle = D.c3; ctx.shadowColor = D.c3; ctx.shadowBlur = 6; ctx.fillRect(x - 3 * k / 1.6, Y(4) - 1, 2, 1.4); ctx.fillRect(x + 1.5 * k / 1.6, Y(4) - 1, 2, 1.4); ctx.shadowBlur = 0; }
    if (full) { // brasas o chispas de cristal a montones
      for (let i = 0; i < 22; i++) { const ph = (T0 * (0.4 + (i % 5) * 0.05) + i * 0.37) % 1, a = i * 2.39, rr = 6 + (i % 6) * 4; ctx.globalAlpha = Math.sin(ph * Math.PI); ctx.fillStyle = st === 'x' ? (i % 3 ? D.c3 : '#ffd060') : (i % 3 ? D.c3 : '#ffffff');
        const s2 = st === 'x' ? 1.8 : 1.4; ctx.fillRect(x + Math.cos(a) * rr, y - ph * (st === 'x' ? 60 : 80) + Math.sin(a) * 3, s2, s2); } }
  }
  ctx.restore();
}
// ---------- En la Armería (Y): las dos míticas al principio ----------
{ const r0 = ADV.tabs.armor.render; ADV.tabs.armor.render = () => { const h = r0(), eq = S.equip || {}, have = id => invCount(id) > 0 || Object.values(eq).includes(id), fmt = m => icMods(m).map(([n, v]) => `${n} ${v}`).join(' · ');
  const cards = ['x', 'y'].map(st => { const D = MY_SETS[st], ids = AX_SLOTS.map(sl => 'my' + st + AX_ID_SLOT[sl]);
    return `<div class="axset mythc" style="--c:${D.c};--c2:${D.c2};--c3:${D.c3}"><div class="axh"><b>${AX_STYLES[st].i} MÍTICA · Conjunto ${esc(D.set)}</b><span>por encima del nivel 10 · 110 de defensa · te hace un 24 % más grande</span></div>
      <div class="axpcs">${ids.map(id => `<span class="axp ${have(id) ? 'ok' : ''}" data-id="${id}" title="${esc(ITEMS[id].n)}">${itemImg(id, 26)}</span>`).join('')}</div><small class="mut">4 piezas: ${fmt(D.bon[1])} · Cada pieza pide un Corazón de Coloso (jefe de mundo) y almas de jefe.</small></div>`; }).join('');
  return h.replace('<div class="axgrid">', `<div class="axgrid">${cards}`); }; }
