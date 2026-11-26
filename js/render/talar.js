'use strict';
// =====================================================================================
//  Talar árboles, con sensación (todo en píxeles):
//   · Cada golpe sacude el árbol un poco (sin exagerar) y suelta astillas de corteza y alguna hoja.
//   · Al romperse, el tronco se parte por la mitad: la copa cae girando hacia el lado contrario a ti, al tocar el
//     suelo suelta hojas y polvo y se desvanece; el tocón se queda un rato y luego desaparece.
//  Solo es imagen: la madera y los golpes funcionan igual que antes.
// =====================================================================================
const TALA = { sacude: new Map(), caidas: [], tocones: [], part: [] };
const TALA_TOCON = 28, TALA_FUNDE = 2.5;
function talaArbolEn(tx, ty) { // sprite y datos del árbol de esa casilla (antes de que desaparezca)
  const list = typeof tileTrees !== 'undefined' ? tileTrees.get(chunkKey(Math.floor(tx / CH), Math.floor(ty / CH))) : null; if (!list) return null;
  for (let i = 0; i < list.length; i += 4) if (list[i] === tx && list[i + 1] === ty) { const s = treeSprite(list[i + 2], list[i + 3] & 63, 3); return s && s.cv ? s : null; } // a tamaño completo, como se veía
  return null;
}
function talaSacude(tx, ty) { const e = TALA.sacude.get(tx + ',' + ty); if (!e) return 0; const k = e.t / 0.38; if (k >= 1) return 0; return Math.round(Math.sin(e.t * 46) * 1.6 * (1 - k) * e.dir); }
const talaRGB = h => { const m = String(h || '#4a7a3a').match(/\w\w/g) || ['4a', '7a', '3a']; return m.slice(0, 3).map(v => parseInt(v, 16)); };
function talaParticulas(x, y, n, col, tipo) {
  for (let i = 0; i < n; i++) TALA.part.push({ x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * (tipo === 'hoja' ? 30 : 90), vy: tipo === 'hoja' ? 6 + Math.random() * 10 : -30 - Math.random() * 50,
    t: 0, d: tipo === 'hoja' ? 1.2 + Math.random() * 0.8 : 0.5 + Math.random() * 0.3, c: col, tipo, ph: Math.random() * 6 });
  if (TALA.part.length > 220) TALA.part.splice(0, TALA.part.length - 220);
}
// Golpe a un árbol: si aguanta, se sacude; si se rompe, cae la copa
{ const d0 = damageTile; damageTile = (x, y) => {
  const g0 = GI[gnd(x, y)], esArbol = !!(g0 && g0.tree), s = esArbol ? talaArbolEn(x, y) : null;
  const r = d0(x, y);
  if (esArbol && OPT.ambiente !== false) { try {
    const p = S.player, dir = p.x < (x + 0.5) * T ? 1 : -1, hoja = talaRGB(g0.tree.a), corteza = [110, 80, 52], baseY = y * T + 26;
    const sigue = GI[gnd(x, y)] && GI[gnd(x, y)].tree;
    talaParticulas((x + 0.5) * T, baseY - 8, 6, corteza, 'astilla');
    if (sigue) { TALA.sacude.set(x + ',' + y, { t: 0, dir }); talaParticulas((x + 0.5) * T, baseY - 60, 2, hoja, 'hoja'); tone(180 + Math.random() * 40, 0.06, 'triangle', 0.03, 0.7); }
    else if (s) { const dw = s.dw || TREE_W, dh = s.dh || TREE_H, ax = s.ax ?? TREE_AX, ay = s.ay ?? TREE_AY;
      // corte a media altura del tronco (no en la raíz): unas 16 unidades por encima de la base
      const corte = Math.min(ay * 0.25, 18), cutSrc = (ay - corte) / dh * s.cv.height;
      TALA.caidas.push({ s, x, y, X: x * T + 16 - ax, Y: baseY - ay, dw, dh, ax, ay, corte, cutSrc, t: 0, dir, hoja, suelo: false });
      TALA.tocones.push({ s, X: x * T + 16 - ax, Y: baseY - ay, dw, dh, cutSrc, ax, ay, corte, t: 0, x, y });
      noise(0.25, 0.05, 900); tone(120, 0.25, 'sawtooth', 0.03, 0.5); }
    TALA.sacude.delete(sigue ? '' : x + ',' + y);
  } catch (e) { console.warn(e); } }
  return r; }; }
function talaTick(dt) {
  for (const [k, e] of TALA.sacude) if ((e.t += dt) > 0.4) TALA.sacude.delete(k);
  for (let i = TALA.caidas.length - 1; i >= 0; i--) { const c = TALA.caidas[i]; c.t += dt;
    if (!c.suelo && c.t > 0.85) { c.suelo = true; const ang = c.dir * Math.PI / 2, px = c.X + c.ax, py = c.Y + c.ay - c.corte, lx = px + Math.sin(ang) * (c.ay - c.corte) * 0.7;
      talaParticulas(lx, py + 4, 16, c.hoja, 'hoja'); talaParticulas(lx, py + 6, 10, [150, 130, 100], 'astilla'); if (typeof dust === 'function') dust(lx, py + 6, 8); shake = Math.max(shake, 0.12); noise(0.3, 0.06, 200); }
    if (c.t > 0.85 + TALA_FUNDE) TALA.caidas.splice(i, 1); }
  for (let i = TALA.tocones.length - 1; i >= 0; i--) if ((TALA.tocones[i].t += dt) > TALA_TOCON) TALA.tocones.splice(i, 1);
  for (let i = TALA.part.length - 1; i >= 0; i--) { const q = TALA.part[i]; q.t += dt; q.ph += dt * 5;
    if (q.tipo === 'hoja') { q.x += (q.vx + Math.sin(q.ph) * 14) * dt; q.y += q.vy * dt; } else { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 220 * dt; }
    if (q.t > q.d) TALA.part.splice(i, 1); }
}
function talaDibujo(ctx) {
  if (!TALA.caidas.length && !TALA.tocones.length && !TALA.part.length) return; const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  for (const tc of TALA.tocones) { const a = Math.min(1, (TALA_TOCON - tc.t) / 2); if (a <= 0) continue; const H = tc.s.cv.height, h = H - tc.cutSrc;
    ctx.globalAlpha = a; ctx.drawImage(tc.s.cv, 0, tc.cutSrc, tc.s.cv.width, h, tc.X, tc.Y + tc.ay - tc.corte, tc.dw, tc.dh * h / H); // el tocón (de la mitad del tronco para abajo)
    ctx.fillStyle = 'rgba(232,200,150,.9)'; ctx.fillRect(Math.round(tc.X + tc.ax - 3), Math.round(tc.Y + tc.ay - tc.corte), 6, 1); } // madera clara del corte
  ctx.globalAlpha = 1;
  for (const c of TALA.caidas) { const k = Math.min(1, c.t / 0.85), ang = c.dir * (Math.PI / 2) * (k * k * (1.2 - 0.2 * k)), a = c.suelo ? Math.max(0, 1 - (c.t - 0.85) / TALA_FUNDE) : 1; if (a <= 0) continue;
    const px = c.X + c.ax, py = c.Y + c.ay - c.corte, bote = c.suelo ? Math.max(0, Math.sin((c.t - 0.85) * 12) * 2 * (1 - (c.t - 0.85) * 3)) : 0;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(Math.round(px), Math.round(py - bote)); ctx.rotate(ang);
    ctx.drawImage(c.s.cv, 0, 0, c.s.cv.width, c.cutSrc, -c.ax, -(c.ay - c.corte), c.dw, c.dh * c.cutSrc / c.s.cv.height); // la copa con la mitad de arriba del tronco
    ctx.restore(); }
  for (const q of TALA.part) { const a = Math.min(1, (q.d - q.t) * 3), c = q.c; ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(2)})`;
    if (q.tipo === 'hoja') { const g = Math.sin(q.ph) > 0; ctx.fillRect(Math.round(q.x), Math.round(q.y), g ? 2 : 1, g ? 1 : 2); }
    else { ctx.fillRect(Math.round(q.x), Math.round(q.y), 2, 2); ctx.fillStyle = `rgba(60,40,24,${(a * 0.6).toFixed(2)})`; ctx.fillRect(Math.round(q.x), Math.round(q.y) + 1, 2, 1); } }
  ctx.imageSmoothingEnabled = sm;
}
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); try { talaTick(fdt); } catch (e) { console.warn(e); } }; }
{ const d0 = drawTrees; drawTrees = (ctx, k, ox, oy, x0, y0, x1, y1, front) => { const r = d0(ctx, k, ox, oy, x0, y0, x1, y1, front); if (front) { try { ctx.setTransform(k, 0, 0, k, ox, oy); talaDibujo(ctx); } catch (e) { console.warn(e); } } return r; }; }
