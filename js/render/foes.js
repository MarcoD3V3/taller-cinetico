'use strict';
// =====================================================================================
//  Enemigos y jefes en pixel art a doble resolución (sustituye a los dibujos vectoriales).
//  Plantillas: humanoide, esqueleto, limo, bestia (cuadrúpedo), volador, insecto, espectro
//  y gólem. Cada una usa los colores del enemigo y sus rasgos: corona, cuernos, varias
//  cabezas, elemento (ojos, aura y detalles de fuego, hielo, tormenta, vacío…), arma en mano.
//  Devuelve un lienzo de (R·2.8+8)·SPR_S píxeles centrado en el enemigo, como antes, así
//  que el resto del juego lo dibuja igual. Se calcula una vez por tipo y queda en caché.
// =====================================================================================
const _foeSprPx = new Map();
const FOE_EL = { fire: ['#ffd040', '#ff6a1a'], frost: ['#bff0ff', '#8ad8ff'], storm: ['#f0f05a', '#ffffff'], void: ['#c080ff', '#5a1a8a'], poison: ['#a8f040', '#4a8a1a'], holy: ['#fff4b0', '#ffd34a'], life: ['#8af07a', '#3a8a2a'], time: ['#e0c8ff', '#ffffff'] };
function foeSprite(D) {
  const key = D.n + D.c + D.s; let s = _foeSprPx.get(key); if (s) return s;
  const vs = D.s < 8 ? 1.3 : D.s < 12 ? 1.12 : 1, q = SPR_S, R = Math.round(D.s * q * vs), W = Math.round((D.s * 2.8 + 8) * q * vs);
  const cv2 = mkCanvas(W, W), c = cv2.getContext('2d', { willReadFrequently: true });
  const P = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
  const el = FOE_EL[D.el], eye = el ? el[0] : D.undead ? '#7af0ff' : '#ff3a2a', cx = W >> 1, cy = W >> 1, gy = cy + Math.round(R * 0.8);
  (FOE_PAINT[D.shape] || FOE_PAINT.hum)(P, D, R, cx, cy, gy, q, eye, el, c);
  shadeVolume(cv2); animOutline(c, W, W);
  // Aura del elemento (por fuera del contorno, sin tapar el cuerpo)
  if (el) { c.globalCompositeOperation = 'destination-over'; c.globalAlpha = 0.22; c.fillStyle = el[1]; c.beginPath(); c.ellipse(cx, cy, R * 1.05, R * 1.05, 0, 0, 7); c.fill(); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
  _foeSprPx.set(key, cv2); return cv2;
}
// Arma en la mano según cómo ataca
function foeWeapon(P, D, x, y, q, R) {
  const ai = D.ai || '', L = Math.max(4 * q, Math.round(R * 0.7));
  if (ai === 'ranged' && !(D.proj && D.proj.c && D.proj.c !== '#e8e0c8')) { for (let i = 0; i < L; i++) P(x + Math.round(Math.sin(i / L * Math.PI) * 2 * q), y - (L >> 1) + i, q, 1, '#8a5a2a'); P(x, y - (L >> 1), 1, L, '#e8e0c8'); return; }
  if (D.proj || ai === 'caster') { P(x, y - L, q, L + 3 * q, '#6a4a2a'); P(x - q, y - L - 2 * q, 3 * q, 3 * q, (D.proj && D.proj.c) || '#5af0ff'); P(x, y - L - q, q, q, '#ffffff'); return; }
  P(x, y - L, q, L, '#c8ccd4'); P(x + q, y - L, 1, L, '#ffffff'); P(x - q, y, 3 * q, q, '#6a4a2a'); P(x, y + q, q, 2 * q, '#4a3020');
}
const FOE_PAINT = {
  hum(P, D, R, cx, cy, gy, q, eye, el) {
    const c1 = D.c, c2 = D.c2 || shade(D.c, -0.3), sk = shade(c1, 0.25), lw = Math.max(q, Math.round(R * 0.2)), legH = Math.round(R * 0.5);
    const bw = Math.round(R * 0.95), bh = Math.round(R * 0.8), bx = cx - (bw >> 1), by = gy - legH - bh + q;
    // piernas y botas
    for (const lx of [cx - Math.round(R * 0.32), cx + Math.round(R * 0.32) - lw]) { P(lx, gy - legH, lw, legH, shade(c1, -0.3)); P(lx, gy - legH, 1, legH, shade(c1, -0.15)); P(lx - (lx < cx ? q : 0), gy - 2 * q, lw + q, 2 * q, shade(c2, -0.4)); }
    // brazos traseros
    P(bx - Math.round(R * 0.22), by + q, Math.round(R * 0.22), Math.round(bh * 0.8), shade(sk, -0.15));
    // torso con cinturón y peto
    blob(P, bx, by, bw, bh, c1, 0.25, -0.3, 0.4);
    P(bx + q, by + bh - 3 * q, bw - 2 * q, 2 * q, shade(c2, -0.2)); P(cx - q, by + bh - 3 * q, 2 * q, 2 * q, '#e0b54c');
    P(cx - Math.round(bw * 0.25), by + 2 * q, Math.round(bw * 0.5), Math.round(bh * 0.4), shade(c1, -0.12));
    if (el && D.el === 'frost') for (const sx of [bx, bx + bw - 2 * q]) { P(sx, by - 2 * q, 2 * q, 3 * q, '#e8f8ff'); P(sx + (sx > cx ? q : 0), by - 4 * q, q, 2 * q, '#bff0ff'); }
    // brazo delantero con arma
    const ax = bx + bw, ay = by + q; P(ax, ay, Math.round(R * 0.22), Math.round(bh * 0.8), sk); P(ax, ay, Math.round(R * 0.22), q, shade(sk, 0.2));
    foeWeapon(P, D, ax + Math.round(R * 0.11), ay + Math.round(bh * 0.8), q, R);
    // cabeza
    const hs = Math.round(R * 0.66), hx = cx - (hs >> 1), hy = by - hs + q;
    blob(P, hx, hy, hs, hs, sk, 0.25, -0.2, 0.3);
    if (D.undead) { P(hx + q, hy + Math.round(hs * 0.6), hs - 2 * q, q, '#3a2a2a'); P(hx + 2 * q, hy + 2 * q, q, 2 * q, '#5a4a4a'); }
    const ey = hy + Math.round(hs * 0.4), e1 = hx + Math.round(hs * 0.25), e2 = hx + Math.round(hs * 0.65), es = Math.max(q, Math.round(R * 0.08));
    P(e1, ey, es, es, eye); P(e2, ey, es, es, eye); P(e1, ey, 1, 1, '#ffffff'); P(e2, ey, 1, 1, '#ffffff');
    P(e1 - q, ey - q, es + q, q, shade(sk, -0.4)); P(e2, ey - q, es + q, q, shade(sk, -0.4));
    P(hx + Math.round(hs * 0.35), hy + Math.round(hs * 0.72), Math.round(hs * 0.3), q, shade(sk, -0.45));
    if (el && D.el === 'fire') for (let i = 0; i < hs; i += q) P(hx + i, hy - q - ((i / q) % 3) * q, q, q + ((i / q) % 3) * q, i % (2 * q) ? '#ffd040' : '#ff6a1a');
    else P(hx, hy, hs, 2 * q, shade(c2, -0.1));
    if (D.crown) { P(hx, hy - 2 * q, hs, 2 * q, '#ffd34a'); for (let i = 0; i < hs; i += 2 * q) P(hx + i, hy - 4 * q, q, 2 * q, '#ffd34a'); P(cx - q, hy - q, 2 * q, q, '#e02040'); }
    if (D.horns) for (const s2 of [-1, 1]) { const bx2 = s2 < 0 ? hx : hx + hs - 2 * q; P(bx2, hy - 2 * q, 2 * q, 2 * q, '#2a1a1a'); P(bx2 + s2 * q, hy - 4 * q, 2 * q, 2 * q, '#2a1a1a'); P(bx2 + s2 * 2 * q, hy - 6 * q, q, 2 * q, '#4a3030'); }
  },
  skel(P, D, R, cx, cy, gy, q, eye) {
    const b = D.c, bd = shade(b, -0.3), legH = Math.round(R * 0.5), lw = Math.max(q, Math.round(R * 0.12));
    for (const lx of [cx - Math.round(R * 0.3), cx + Math.round(R * 0.3) - lw]) { P(lx, gy - legH, lw, legH, b); P(lx - q, gy - legH + Math.round(legH / 2), lw + 2 * q, q, bd); P(lx - q, gy - q, lw + 2 * q, q, b); }
    const ty = gy - legH - Math.round(R * 0.8) + q, tw = Math.round(R * 0.8), tx = cx - (tw >> 1);
    P(cx - q, ty, 2 * q, Math.round(R * 0.8), b); // columna
    for (let i = 0; i < 4; i++) { const ry = ty + 2 * q + i * Math.round(R * 0.14); P(tx + i * q, ry, tw - 2 * i * q, q, b); P(tx + i * q, ry + q, tw - 2 * i * q, 1, bd); }
    P(tx - q, gy - legH - 2 * q, tw + 2 * q, 2 * q, b); // pelvis
    P(tx - Math.round(R * 0.15), ty + q, q, Math.round(R * 0.6), b); P(tx + tw + Math.round(R * 0.1), ty + q, q, Math.round(R * 0.6), b);
    foeWeapon(P, D, tx + tw + Math.round(R * 0.1), ty + Math.round(R * 0.6), q, R);
    const hs = Math.round(R * 0.62), hx = cx - (hs >> 1), hy = ty - hs + q;
    blob(P, hx, hy, hs, hs, '#f0ece0', 0.2, -0.25, 0); P(hx + q, hy + hs - 2 * q, hs - 2 * q, 2 * q, '#d8d0c0');
    const es = Math.max(2 * q, Math.round(hs * 0.25)); P(hx + Math.round(hs * 0.15), hy + Math.round(hs * 0.35), es, es, '#1a1418'); P(hx + Math.round(hs * 0.6), hy + Math.round(hs * 0.35), es, es, '#1a1418');
    P(hx + Math.round(hs * 0.15) + (es >> 1), hy + Math.round(hs * 0.35) + (es >> 1), q, q, eye); P(hx + Math.round(hs * 0.6) + (es >> 1), hy + Math.round(hs * 0.35) + (es >> 1), q, q, eye);
    for (let i = 0; i < hs - 2 * q; i += 2 * q) P(hx + q + i, hy + hs - 2 * q, q, q, '#1a1418');
    if (D.crown) { P(hx, hy - 2 * q, hs, 2 * q, D.c2 || '#ffd34a'); for (let i = 0; i < hs; i += 2 * q) P(hx + i, hy - 4 * q, q, 2 * q, D.c2 || '#ffd34a'); }
  },
  blob(P, D, R, cx, cy, gy, q, eye) {
    const c1 = D.c, bw = Math.round(R * 2), bh = Math.round(R * 1.5), x0 = cx - (bw >> 1), y0 = gy - bh;
    blob(P, x0, y0, bw, bh, c1, 0.4, -0.2, 0); P(x0 + q, y0 + bh - 2 * q, bw - 2 * q, 2 * q, shade(c1, -0.3));
    blob(P, x0 + Math.round(bw * 0.15), y0 + Math.round(bh * 0.12), Math.round(bw * 0.2), Math.round(bh * 0.18), shade(c1, 0.55), 0, 0, 0);
    blob(P, cx - Math.round(R * 0.3), y0 + Math.round(bh * 0.55), Math.round(R * 0.6), Math.round(R * 0.4), shade(c1, -0.25), 0, 0, 0); // núcleo
    const es = Math.max(2 * q, Math.round(R * 0.22)); for (const s2 of [-1, 1]) { const ex = cx + s2 * Math.round(R * 0.32) - (es >> 1); blob(P, ex, y0 + Math.round(bh * 0.3), es, es + q, '#140e10', 0, 0, 0); P(ex + q, y0 + Math.round(bh * 0.3) + q, q, q, '#ffffff'); }
    if (D.crown) { const cw = Math.round(R * 0.8); P(cx - (cw >> 1), y0 - 2 * q, cw, 3 * q, '#ffd34a'); for (let i = 0; i < cw; i += 2 * q) P(cx - (cw >> 1) + i, y0 - 4 * q, q, 2 * q, '#ffd34a'); P(cx - q, y0 - q, 2 * q, q, '#e02040'); }
  },
  quad(P, D, R, cx, cy, gy, q, eye, el, c) {
    // bestia de perfil con la plantilla de los animales y ojos del enemigo
    const fake = { c: D.c, c2: D.c2 || shade(D.c, -0.3), s: R / q };
    const big = D.s > 30;
    if (el && D.el === 'fire' || big) { // alas de dragón por detrás
      const wc = shade(fake.c2, -0.2), ww = Math.round(R * 1.3); for (let i = 0; i < ww; i++) P(cx - Math.round(R * 0.6) + i, cy - Math.round(R * 0.9) + Math.round(i * 0.45), 1, Math.round(R * 0.6) - Math.round(i * 0.3), i % (4 * q) < q ? shade(wc, -0.3) : wc);
    }
    ANIM_PAINT.quad(P, fake, { legs: 0.85, neck: D.heads ? 0.8 : 0.4, snout: 3, ears: 'point', tail: big || el ? 'lizard' : 'bushy', pat: 'belly', horns: big ? 'curved' : null }, R, cx + Math.round(R * 0.1), gy, 0, q);
    const hx = cx + Math.round(R * 0.6), hy = gy - Math.round(R * 0.7 * 0.85) - Math.round(R * 0.72) - Math.round(R * 0.55 * (D.heads ? 0.8 : 0.4));
    P(hx + Math.round(R * 0.15), hy, Math.max(q, Math.round(R * 0.08)), Math.max(q, Math.round(R * 0.08)), eye);
    if (D.heads) for (let i = 1; i < D.heads; i++) { const ox = -i * Math.round(R * 0.35), oy = -i * Math.round(R * 0.3), hs = Math.round(R * 0.5); P(hx + ox + q, hy + oy + hs, 3 * q, Math.round(R * 0.5), D.c); blob(P, hx + ox, hy + oy, hs, hs, shade(D.c, 0.15), 0.25, -0.2, 0.3); P(hx + ox + hs, hy + oy + Math.round(hs * 0.4), 3 * q, 2 * q, D.c); P(hx + ox + Math.round(hs * 0.6), hy + oy + Math.round(hs * 0.3), q, q, eye); }
  },
  fly(P, D, R, cx, cy, gy, q, eye) {
    const c1 = D.c, wc = D.c2 && D.c2 !== '#1a1a1a' ? D.c2 : shade(c1, -0.3), y0 = cy - Math.round(R * 0.3);
    for (const s2 of [-1, 1]) { const ww = Math.round(R * 1.25); for (let i = 0; i < ww; i++) { const h = Math.round(R * 0.9 * Math.sin((i / ww) * Math.PI * 0.9 + 0.2)); P(cx + s2 * i - (s2 < 0 ? 1 : 0), y0 - Math.round(h * 0.6), 1, h, i % (3 * q) < q ? shade(wc, -0.3) : wc); } }
    blob(P, cx - Math.round(R * 0.4), y0 - Math.round(R * 0.35), Math.round(R * 0.8), Math.round(R * 1.0), c1, 0.3, -0.25, 0.5);
    const hs = Math.round(R * 0.55); blob(P, cx - (hs >> 1), y0 - Math.round(R * 0.35) - hs + 2 * q, hs, hs, shade(c1, 0.15), 0.25, -0.2, 0.3);
    P(cx - (hs >> 1), y0 - Math.round(R * 0.35) - hs, 2 * q, 3 * q, shade(c1, 0.1)); P(cx + (hs >> 1) - 2 * q, y0 - Math.round(R * 0.35) - hs, 2 * q, 3 * q, shade(c1, 0.1));
    const es = Math.max(q, Math.round(R * 0.09)), ey = y0 - Math.round(R * 0.35) - hs + Math.round(hs * 0.5); P(cx - Math.round(hs * 0.25), ey, es, es, eye); P(cx + Math.round(hs * 0.15), ey, es, es, eye);
    P(cx - q, ey + 2 * es, q, q, '#f4f0e0'); P(cx + q, ey + 2 * es, q, q, '#f4f0e0');
  },
  bug(P, D, R, cx, cy, gy, q, eye) {
    const c1 = D.c, bw = Math.round(R * 1.1), bh = Math.round(R * 1.2), x0 = cx - (bw >> 1), y0 = cy - Math.round(R * 0.2);
    for (let i = 0; i < 4; i++) for (const s2 of [-1, 1]) { const ly = y0 + q + i * Math.round(bh / 4), lx = s2 < 0 ? x0 : x0 + bw; P(lx + (s2 < 0 ? -Math.round(R * 0.5) : 0), ly, Math.round(R * 0.5), q, shade(c1, -0.35)); P(lx + s2 * Math.round(R * 0.5) - (s2 < 0 ? 0 : q), ly, q, 3 * q, shade(c1, -0.35)); }
    blob(P, x0, y0, bw, bh, c1, 0.45, -0.25, 0); P(cx - (q >> 1), y0, q, bh - q, shade(c1, -0.35)); blob(P, x0 + 2 * q, y0 + 2 * q, Math.round(bw * 0.25), Math.round(bh * 0.2), shade(c1, 0.5), 0, 0, 0);
    if (D.crown) blob(P, cx - Math.round(R * 0.2), y0 + Math.round(bh * 0.4), Math.round(R * 0.4), Math.round(R * 0.4), D.c2, 0.3, -0.2, 0);
    const hs = Math.round(R * 0.6), hy = y0 - hs + q; blob(P, cx - (hs >> 1), hy, hs, hs, shade(c1, 0.15), 0.3, -0.2, 0);
    for (let i = 0; i < 4; i++) P(cx - Math.round(hs * 0.3) + (i % 2) * Math.round(hs * 0.45), hy + Math.round(hs * 0.3) + (i >> 1) * 2 * q, q, q, eye);
    P(cx - Math.round(hs * 0.3), hy - 3 * q, q, 3 * q, shade(c1, -0.3)); P(cx + Math.round(hs * 0.25), hy - 3 * q, q, 3 * q, shade(c1, -0.3));
  },
  ghost(P, D, R, cx, cy, gy, q, eye) {
    const c1 = D.c, bw = Math.round(R * 1.25), x0 = cx - (bw >> 1), top = cy - Math.round(R * 0.85), bot = cy + Math.round(R * 0.6);
    for (let y = top; y < bot; y++) { const t = (y - top) / (bot - top), rr = t < 0.45 ? Math.round(Math.sqrt(Math.max(0, 1 - Math.pow(1 - t / 0.45, 2))) * bw / 2) : bw >> 1; P(cx - rr, y, rr * 2, 1, t < 0.15 ? shade(c1, 0.3) : shade(c1, -t * 0.25)); }
    for (let i = 0; i < bw; i += 2 * q) P(x0 + i, bot, 2 * q, ((i / (2 * q)) % 2) * 2 * q + q, c1);
    const ex = D.c === '#14141a' ? '#a060ff' : '#1a1a2a', es = Math.max(2 * q, Math.round(R * 0.18));
    blob(P, cx - Math.round(R * 0.32), cy - Math.round(R * 0.35), es, es + q, ex, 0, 0, 0); blob(P, cx + Math.round(R * 0.32) - es, cy - Math.round(R * 0.35), es, es + q, ex, 0, 0, 0);
    blob(P, cx - Math.round(R * 0.12), cy, Math.round(R * 0.24), Math.round(R * 0.2), '#1a1a2a', 0, 0, 0);
  },
  golem(P, D, R, cx, cy, gy, q, eye) {
    const c1 = D.c, c2 = D.c2 || eye, lw = Math.round(R * 0.32), legH = Math.round(R * 0.5);
    for (const lx of [cx - Math.round(R * 0.48), cx + Math.round(R * 0.16)]) { blob(P, lx, gy - legH, lw, legH, shade(c1, -0.25), 0.2, -0.2, 0); P(lx, gy - 2 * q, lw, 2 * q, shade(c1, -0.4)); }
    const bw = Math.round(R * 1.3), bh = Math.round(R * 0.8), bx = cx - (bw >> 1), by = gy - legH - bh + q;
    blob(P, bx, by, bw, bh, c1, 0.3, -0.3, 0);
    for (let i = 0; i < 3; i++) { const sx = bx + Math.round(bw * (0.2 + i * 0.3)); P(sx, by + 2 * q, q, Math.round(bh * 0.5), c2); P(sx + q, by + Math.round(bh * 0.4), 2 * q, q, c2); } // grietas que brillan
    blob(P, cx - Math.round(R * 0.15), by + Math.round(bh * 0.35), Math.round(R * 0.3), Math.round(R * 0.3), c2, 0.4, 0, 0);
    for (const s2 of [-1, 1]) { const ax = s2 < 0 ? bx - Math.round(R * 0.35) : bx + bw + q; blob(P, ax, by + q, Math.round(R * 0.33), Math.round(bh * 1.05), shade(c1, s2 < 0 ? -0.1 : 0.08), 0.3, -0.25, 0); P(ax, by + Math.round(bh * 0.9), Math.round(R * 0.33), 2 * q, shade(c1, -0.35)); }
    const hs = Math.round(R * 0.6), hx = cx - (hs >> 1), hy = by - Math.round(hs * 0.75);
    blob(P, hx, hy, hs, Math.round(hs * 0.8), c1, 0.35, -0.25, 0);
    P(hx + Math.round(hs * 0.2), hy + Math.round(hs * 0.3), Math.round(hs * 0.2), 2 * q, c2); P(hx + Math.round(hs * 0.6), hy + Math.round(hs * 0.3), Math.round(hs * 0.2), 2 * q, c2);
    if (D.crown) { P(hx, hy - 2 * q, hs, 2 * q, '#ffd34a'); for (let i = 0; i < hs; i += 2 * q) P(hx + i, hy - 4 * q, q, 2 * q, '#ffd34a'); }
  },
};
