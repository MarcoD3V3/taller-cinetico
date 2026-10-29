'use strict';
// =====================================================================================
//  Iconos del Arsenal del Gran Taller (data/terra.js). Cada familia tiene su dibujo y cada
//  objeto su variante (forma de hoja, cañón, cabeza, frasco…); con la rareza crecen el tamaño,
//  los adornos, las gemas y el brillo de su elemento. Mismas orientaciones que los iconos de
//  siempre (espadas en diagonal con la punta arriba a la derecha, pistolas mirando a la derecha).
// =====================================================================================
const TI = {
  ink(c, w = 1.1) { c.lineWidth = w; c.strokeStyle = 'rgba(0,0,0,.62)'; c.stroke(); },
  fill(c, col, w) { c.fillStyle = col; c.fill(); TI.ink(c, w); },
  glow(c, col, b) { c.shadowColor = col; c.shadowBlur = b; },
  gem(c, x, y, r, col) { c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * 0.8, y); c.lineTo(x, y + r); c.lineTo(x - r * 0.8, y); c.closePath(); TI.fill(c, col, 0.8); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(x - r * 0.25, y - r * 0.3, r * 0.25, 0, 7); c.fill(); },
  spark(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.25 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); },
  shade: (h, f) => (typeof shade === 'function' ? toHex(shade(h, f)) : h),
};
// Color del elemento (o del acento) para brillos
const tiEl = T0 => (T0.el && TR_EL[T0.el]) || T0.c2;
function tiSword(c, r, T0, big) {
  const v = T0.i % 8, R = T0.r, L = r * (big ? 1.5 : 1.25 + R * 0.06), W = r * (big ? 0.34 : [0.16, 0.24, 0.2, 0.12, 0.18, 0.2, 0.22, 0.26][v]) * (1 + R * 0.06), g = tiEl(T0);
  c.save(); c.rotate(Math.PI / 4);
  // empuñadura y pomo
  c.fillStyle = T0.c2; c.fillRect(-r * 0.07, r * 0.28, r * 0.14, r * 0.62); TI.ink(c, 0.8); c.beginPath(); c.rect(-r * 0.07, r * 0.28, r * 0.14, r * 0.62); TI.ink(c, 0.8);
  c.beginPath(); c.arc(0, r * 0.95, r * (0.1 + R * 0.015), 0, 7); TI.fill(c, R >= 2 ? g : T0.c2, 0.8);
  // hoja
  if (R >= 3) TI.glow(c, g, r * 0.35);
  c.beginPath(); const y0 = r * 0.22, yt = y0 - L;
  if (v === 2) { c.moveTo(-W * 0.6, y0); c.quadraticCurveTo(-W * 1.6, (y0 + yt) / 2, W * 0.4, yt); c.quadraticCurveTo(W * 0.2, (y0 + yt) / 2, W * 0.6, y0); }
  else if (v === 3) { c.moveTo(-W * 0.5, y0); c.quadraticCurveTo(-W * 0.9, (y0 + yt) / 2, -W * 0.1, yt); c.lineTo(W * 0.5, yt + W); c.quadraticCurveTo(W * 0.3, (y0 + yt) / 2, W * 0.5, y0); }
  else if (v === 4) { c.moveTo(-W / 2, y0); for (let i = 1; i <= 6; i++) c.lineTo(i % 2 ? -W * 0.85 : -W / 2, y0 - (L - W) * i / 6); c.lineTo(0, yt); c.lineTo(W / 2, yt + W); c.lineTo(W / 2, y0); }
  else if (v === 5) { c.moveTo(-W / 2, y0); for (let i = 1; i <= 5; i++) c.quadraticCurveTo(-W * (i % 2 ? 1.1 : 0.2), y0 - (L - W) * (i - 0.5) / 5, -W / 2, y0 - (L - W) * i / 5); c.lineTo(0, yt); for (let i = 5; i >= 1; i--) c.quadraticCurveTo(W * (i % 2 ? 1.1 : 0.2), y0 - (L - W) * (i - 0.5) / 5, W / 2, y0 - (L - W) * (i - 1) / 5); }
  else if (v === 6) { c.moveTo(-W / 2, y0); c.lineTo(-W, y0 - L * 0.45); c.lineTo(0, yt); c.lineTo(W, y0 - L * 0.45); c.lineTo(W / 2, y0); }
  else if (v === 7) { c.moveTo(-W * 0.3, y0); c.quadraticCurveTo(-W * 1.3, y0 - L * 0.55, 0, yt); c.quadraticCurveTo(W * 1.3, y0 - L * 0.55, W * 0.3, y0); }
  else { const bw = v === 1 ? W * 1.2 : W; c.moveTo(-bw / 2, y0); c.lineTo(-bw / 2, yt + bw); c.lineTo(0, yt); c.lineTo(bw / 2, yt + bw); c.lineTo(bw / 2, y0); }
  c.closePath(); const gr = c.createLinearGradient(-W, 0, W, 0); gr.addColorStop(0, TI.shade(T0.c, 0.35)); gr.addColorStop(0.5, T0.c); gr.addColorStop(1, TI.shade(T0.c, -0.3)); c.fillStyle = gr; c.fill(); c.shadowBlur = 0; TI.ink(c);
  // vaceo central y runas
  c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = Math.max(0.6, W * 0.12); c.beginPath(); c.moveTo(0, y0 - r * 0.08); c.lineTo(0, yt + W * 1.4); c.stroke();
  if (R >= 4 || big) { c.fillStyle = g; for (let i = 1; i <= 3 + (big ? 1 : 0); i++) { const y = y0 - (L - W * 2) * i / (4 + (big ? 1 : 0)); c.fillRect(-W * 0.18, y - r * 0.03, W * 0.36, r * 0.06); } }
  // guarda
  const gw = r * (0.32 + R * 0.06) * (big ? 1.4 : 1); c.beginPath();
  if (big || R >= 3) { c.moveTo(-gw, y0 + r * 0.04); c.quadraticCurveTo(-gw * 0.5, y0 - r * 0.22, 0, y0 - r * 0.02); c.quadraticCurveTo(gw * 0.5, y0 - r * 0.22, gw, y0 + r * 0.04); c.quadraticCurveTo(0, y0 + r * 0.14, -gw, y0 + r * 0.04); }
  else c.rect(-gw, y0, gw * 2, r * 0.1);
  TI.fill(c, R >= 2 ? '#f0c75e' : T0.c2, 0.9);
  if (R >= 2 || big) TI.gem(c, 0, y0 + r * 0.04, r * (0.08 + R * 0.012), g);
  c.restore();
  if (R >= 3) { TI.spark(c, r * 0.55, -r * 0.75, r * 0.16, '#fff'); if (R >= 4) TI.spark(c, -r * 0.1, -r * 0.2, r * 0.1, g); }
}
function tiGun(c, r, T0) {
  const v = T0.i % 5, R = T0.r, g = tiEl(T0), bl = r * (0.9 + R * 0.08), bh = r * (v === 4 ? 0.34 : 0.22);
  if (R >= 3) TI.glow(c, g, r * 0.3);
  // cañón
  c.beginPath(); if (v === 3) { c.moveTo(-r * 0.4, -bh * 0.7); c.lineTo(bl, -bh * 0.9); c.lineTo(bl, bh * 0.4); c.lineTo(-r * 0.4, bh * 0.5); } else c.rect(-r * 0.4, -bh / 2 - r * 0.15, bl + r * 0.4, bh);
  TI.fill(c, v === 2 ? TI.shade(T0.c, -0.1) : T0.c); c.shadowBlur = 0;
  if (v === 1) { c.beginPath(); c.arc(-r * 0.05, -r * 0.1, r * 0.24, 0, 7); TI.fill(c, TI.shade(T0.c, -0.25)); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.fillStyle = '#1a1a1a'; c.beginPath(); c.arc(-r * 0.05 + Math.cos(a) * r * 0.13, -r * 0.1 + Math.sin(a) * r * 0.13, r * 0.04, 0, 7); c.fill(); } }
  if (v === 2) { c.fillStyle = g; c.globalAlpha = 0.9; for (let i = 0; i < 3; i++) c.fillRect(r * (0.15 + i * 0.22), -bh / 2 - r * 0.15, r * 0.08, bh); c.globalAlpha = 1; c.beginPath(); c.arc(bl, -r * 0.15, r * 0.1, 0, 7); c.fillStyle = g; c.fill(); }
  if (v === 4) { c.beginPath(); c.arc(bl, -r * 0.15 + bh * 0.05, bh * 0.55, 0, 7); TI.fill(c, TI.shade(T0.c, -0.3)); }
  // empuñadura y gatillo
  c.beginPath(); c.moveTo(-r * 0.4, r * 0.0); c.lineTo(-r * 0.1, r * 0.0); c.lineTo(-r * 0.25, r * 0.75); c.lineTo(-r * 0.7, r * 0.7); c.closePath(); TI.fill(c, T0.c2);
  c.beginPath(); c.arc(-r * 0.05, r * 0.12, r * 0.12, 0, Math.PI); c.strokeStyle = '#2a2a2a'; c.lineWidth = 1.2; c.stroke();
  if (R >= 2) TI.gem(c, -r * 0.45, r * 0.35, r * 0.09, g);
  if (R >= 4) TI.spark(c, bl * 0.8, -r * 0.55, r * 0.15, '#fff');
}
function tiBoomer(c, r, T0) {
  const v = T0.i % 4, R = T0.r, g = tiEl(T0); if (R >= 3) TI.glow(c, g, r * 0.3);
  if (v === 1 || v === 3) { // chakram / anillo de cuchillas
    const n = v === 3 ? 6 : 8; c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n, rr = i % 2 ? r * 0.72 : r * 0.95; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); TI.fill(c, T0.c); c.shadowBlur = 0;
    c.beginPath(); c.arc(0, 0, r * 0.42, 0, 7); c.fillStyle = 'rgba(0,0,0,.55)'; c.fill(); c.beginPath(); c.arc(0, 0, r * 0.42, 0, 7); c.strokeStyle = T0.c2; c.lineWidth = r * 0.1; c.stroke();
  } else if (T0.fam === 'boomer' && T0.i >= 7) { // tríada
    c.beginPath(); for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3 - Math.PI / 2; c.moveTo(0, 0); c.quadraticCurveTo(Math.cos(a - 0.5) * r, Math.sin(a - 0.5) * r, Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95); c.quadraticCurveTo(Math.cos(a + 0.2) * r * 0.5, Math.sin(a + 0.2) * r * 0.5, 0, 0); } TI.fill(c, T0.c); c.shadowBlur = 0; TI.gem(c, 0, 0, r * 0.14, g);
  } else { c.beginPath(); c.moveTo(-r * 0.9, r * 0.35); c.quadraticCurveTo(-r * 0.25, -r * 1.05, r * 0.9, -r * 0.15); c.lineTo(r * 0.72, r * 0.18); c.quadraticCurveTo(-r * 0.15, -r * 0.55, -r * 0.6, r * 0.55); c.closePath(); TI.fill(c, T0.c); c.shadowBlur = 0;
    c.strokeStyle = T0.c2; c.lineWidth = r * 0.08; c.beginPath(); c.moveTo(-r * 0.6, r * 0.3); c.quadraticCurveTo(-r * 0.2, -r * 0.65, r * 0.6, -r * 0.05); c.stroke(); }
  if (R >= 2) TI.spark(c, r * 0.6, -r * 0.6, r * 0.14, '#fff');
}
function tiHook(c, r, T0) {
  const R = T0.r, g = tiEl(T0);
  // cadena en espiral
  c.strokeStyle = T0.c2; c.lineWidth = r * 0.09; for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(-r * 0.55 + i * r * 0.16, r * 0.55 - i * r * 0.16, r * 0.12, r * 0.07, -Math.PI / 4, 0, 7); c.stroke(); }
  if (R >= 3) TI.glow(c, g, r * 0.3);
  // cabeza con garfios
  c.save(); c.translate(r * 0.3, -r * 0.3); c.rotate(-Math.PI / 4); const n = 2 + Math.min(2, Math.floor(R / 2)); c.fillStyle = T0.c;
  c.beginPath(); c.rect(-r * 0.08, -r * 0.1, r * 0.16, r * 0.45); TI.fill(c, T0.c);
  for (let k = 0; k < n; k++) { const a = (k / (n - 1 || 1) - 0.5) * 2.2; c.save(); c.rotate(a); c.beginPath(); c.moveTo(-r * 0.06, -r * 0.05); c.quadraticCurveTo(r * 0.02, -r * 0.55, r * 0.3, -r * 0.42); c.lineTo(r * 0.2, -r * 0.32); c.quadraticCurveTo(r * 0.05, -r * 0.35, r * 0.06, -r * 0.05); c.closePath(); TI.fill(c, T0.c, 0.9); c.restore(); }
  c.restore(); c.shadowBlur = 0; if (R >= 2) TI.gem(c, r * 0.3, -r * 0.3, r * 0.1, g);
}
function tiYoyo(c, r, T0) {
  const v = T0.i % 4, R = T0.r, g = tiEl(T0), rr = r * (0.66 + R * 0.05);
  c.strokeStyle = 'rgba(240,240,240,.8)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-r * 0.6, -r * 0.2, -r * 0.9, -r * 0.95); c.stroke();
  if (R >= 3) TI.glow(c, g, r * 0.35);
  c.beginPath(); c.arc(0, 0, rr, 0, 7); const gr = c.createRadialGradient(-rr * 0.3, -rr * 0.3, rr * 0.1, 0, 0, rr); gr.addColorStop(0, TI.shade(T0.c, 0.4)); gr.addColorStop(1, TI.shade(T0.c, -0.25)); c.fillStyle = gr; c.fill(); c.shadowBlur = 0; TI.ink(c);
  c.strokeStyle = T0.c2; c.lineWidth = rr * 0.16; c.beginPath(); c.arc(0, 0, rr * 0.82, 0, 7); c.stroke();
  c.fillStyle = T0.c2; if (v === 0) for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; c.save(); c.rotate(a); c.fillRect(-rr * 0.06, -rr * 0.7, rr * 0.12, rr * 0.5); c.restore(); }
  else if (v === 1) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, q = i % 2 ? rr * 0.25 : rr * 0.6; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); } c.closePath(); c.fill(); }
  else if (v === 2) { c.lineWidth = rr * 0.1; c.beginPath(); for (let t = 0; t < 12; t += 0.3) c.lineTo(Math.cos(t) * t * rr * 0.05, Math.sin(t) * t * rr * 0.05); c.stroke(); }
  else { c.beginPath(); c.arc(0, 0, rr * 0.45, 0, 7); c.fill(); }
  TI.gem(c, 0, 0, rr * 0.2, g);
}
function tiWhip(c, r, T0) {
  const R = T0.r, g = tiEl(T0); c.lineCap = 'round';
  c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = r * 0.2; c.beginPath(); c.moveTo(-r * 0.7, r * 0.7); c.quadraticCurveTo(-r * 0.1, r * 0.4, r * 0.2, r * 0.1); for (let i = 0; i < 3; i++) c.arc(r * 0.1 - i * r * 0.08, -r * 0.15 - i * r * 0.18, r * (0.45 - i * 0.1), Math.PI * 0.5, Math.PI * 2.4); c.stroke();
  if (R >= 3) TI.glow(c, g, r * 0.3);
  c.strokeStyle = T0.c; c.lineWidth = r * 0.12; c.stroke(); c.shadowBlur = 0;
  if (T0.el === 'poison' || T0.i === 1) { c.fillStyle = T0.c2; for (let i = 0; i < 6; i++) { const a = i; c.beginPath(); c.arc(r * 0.1 + Math.cos(a * 1.3) * r * 0.4, -r * 0.2 + Math.sin(a * 1.3) * r * 0.4, r * 0.05, 0, 7); c.fill(); } }
  c.save(); c.translate(-r * 0.7, r * 0.7); c.rotate(-Math.PI / 4); c.beginPath(); c.rect(-r * 0.09, -r * 0.05, r * 0.18, r * 0.42); TI.fill(c, T0.c2); c.restore();
  if (R >= 2) TI.gem(c, -r * 0.62, r * 0.62, r * 0.09, g);
  if (R >= 3) TI.spark(c, r * 0.5, -r * 0.6, r * 0.14, g);
}
function tiBow(c, r, T0, xbow) {
  const R = T0.r, g = tiEl(T0), v = T0.i % 3;
  if (xbow) { c.save(); c.rotate(Math.PI / 4); c.beginPath(); c.rect(-r * 0.1, -r * 0.5, r * 0.2, r * 1.35); TI.fill(c, T0.c2); c.restore();
    if (R >= 3) TI.glow(c, g, r * 0.3); c.save(); c.translate(r * 0.15, -r * 0.15); c.rotate(Math.PI / 4); c.beginPath(); c.moveTo(-r * 0.85, r * 0.15); c.quadraticCurveTo(0, -r * (0.55 + R * 0.05), r * 0.85, r * 0.15); c.lineWidth = r * 0.16; c.strokeStyle = T0.c; c.stroke(); c.shadowBlur = 0;
    c.strokeStyle = '#e8e0d0'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-r * 0.85, r * 0.15); c.lineTo(0, r * 0.35); c.lineTo(r * 0.85, r * 0.15); c.stroke(); c.restore();
    c.fillStyle = '#e8e0d0'; c.save(); c.rotate(Math.PI / 4); c.fillRect(-r * 0.03, -r * 0.95, r * 0.06, r * 0.6); c.restore(); if (R >= 2) TI.gem(c, -r * 0.1, r * 0.1, r * 0.1, g); return; }
  const k2 = 0.85 + v * 0.15; c.strokeStyle = R >= 2 ? g : '#e8e0d0'; c.lineWidth = R >= 2 ? 1.2 : 0.8; c.beginPath(); c.moveTo(-r * 0.45, -r * 0.92); c.lineTo(-r * 0.45, r * 0.92); c.stroke();
  if (R >= 3) TI.glow(c, g, r * 0.35);
  c.beginPath(); c.moveTo(-r * 0.5, -r * 0.95); if (v === 2) { c.quadraticCurveTo(r * 0.2, -r * 0.9, r * 0.35, -r * 0.4); c.quadraticCurveTo(r * 0.75 * k2, 0, r * 0.35, r * 0.4); c.quadraticCurveTo(r * 0.2, r * 0.9, -r * 0.5, r * 0.95); }
  else c.quadraticCurveTo(r * 1.1 * k2, 0, -r * 0.5, r * 0.95);
  c.lineWidth = r * (0.14 + R * 0.025); c.strokeStyle = T0.c; c.stroke(); c.shadowBlur = 0; c.lineWidth = 0.8; c.strokeStyle = 'rgba(0,0,0,.5)'; c.stroke();
  for (const s of [-1, 1]) { c.beginPath(); c.arc(-r * 0.45, s * r * 0.92, r * (0.07 + R * 0.015), 0, 7); TI.fill(c, R >= 2 ? '#f0c75e' : T0.c2, 0.7); }
  if (R >= 2) TI.gem(c, r * 0.2, 0, r * 0.11, g); if (R >= 4) TI.spark(c, r * 0.55, -r * 0.6, r * 0.14, '#fff');
}
function tiWand(c, r, T0, summon) {
  const v = T0.i % 4, R = T0.r, g = tiEl(T0), tx = r * 0.45, ty = -r * 0.45;
  c.save(); c.rotate(Math.PI / 4); c.beginPath(); c.rect(-r * 0.065, -r * 0.35, r * 0.13, r * (summon ? 1.35 : 1.15)); TI.fill(c, T0.fam === 'wand' && T0.i < 4 ? '#8a6238' : TI.shade(T0.c2, 0.1)); c.restore();
  if (R >= 1) TI.glow(c, g, r * (0.2 + R * 0.1));
  if (summon) { c.beginPath(); c.arc(tx, ty, r * 0.34, 0, 7); TI.fill(c, T0.c); c.shadowBlur = 0; c.fillStyle = '#fff'; c.beginPath(); c.arc(tx - r * 0.1, ty - r * 0.05, r * 0.06, 0, 7); c.arc(tx + r * 0.1, ty - r * 0.05, r * 0.06, 0, 7); c.fill(); c.fillStyle = '#1a1a1a'; c.beginPath(); c.arc(tx - r * 0.1, ty - r * 0.04, r * 0.03, 0, 7); c.arc(tx + r * 0.1, ty - r * 0.04, r * 0.03, 0, 7); c.fill();
    c.strokeStyle = '#f0c75e'; c.lineWidth = r * 0.06; c.beginPath(); c.arc(tx, ty, r * 0.44, -0.3, Math.PI + 0.3, true); c.stroke(); if (R >= 3) TI.spark(c, tx + r * 0.4, ty - r * 0.35, r * 0.14, '#fff'); return; }
  c.beginPath();
  if (v === 0) c.arc(tx, ty, r * (0.24 + R * 0.03), 0, 7);
  else if (v === 1) for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, q = i % 2 ? r * 0.16 : r * (0.38 + R * 0.03); c.lineTo(tx + Math.cos(a) * q, ty + Math.sin(a) * q); }
  else if (v === 2) { c.moveTo(tx, ty - r * 0.45); c.lineTo(tx + r * 0.2, ty); c.lineTo(tx, ty + r * 0.25); c.lineTo(tx - r * 0.2, ty); }
  else { c.arc(tx, ty, r * 0.32, 0.6, Math.PI * 2 - 0.6); c.arc(tx + r * 0.16, ty, r * 0.22, Math.PI * 2 - 0.9, 0.9, true); }
  c.closePath(); TI.fill(c, v === 0 ? g : T0.c2 === '#ffffff' ? g : T0.c2); c.shadowBlur = 0;
  c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.arc(tx - r * 0.07, ty - r * 0.08, r * 0.06, 0, 7); c.fill();
  if (R >= 2) { c.strokeStyle = '#f0c75e'; c.lineWidth = r * 0.05; c.beginPath(); c.arc(tx, ty, r * 0.36, Math.PI * 0.6, Math.PI * 1.1); c.stroke(); }
  if (R >= 3) TI.spark(c, tx + r * 0.35, ty - r * 0.35, r * 0.13, '#fff');
}
function tiBomb(c, r, T0) {
  const v = T0.i % 5, R = T0.r, g = tiEl(T0);
  if (v === 3 || T0.i === 10) { // cartuchos de dinamita
    for (let k = -1; k <= 1; k++) { c.beginPath(); c.rect(k * r * 0.3 - r * 0.13, -r * 0.45, r * 0.26, r * 1.1); TI.fill(c, T0.c, 0.8); } c.fillStyle = '#e8d8a0'; c.fillRect(-r * 0.45, -r * 0.05, r * 0.9, r * 0.14);
    c.strokeStyle = '#3a2a1a'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -r * 0.45); c.quadraticCurveTo(r * 0.2, -r * 0.75, r * 0.4, -r * 0.7); c.stroke(); TI.spark(c, r * 0.45, -r * 0.72, r * 0.16, '#ffd060'); return; }
  if (R >= 3) TI.glow(c, g, r * 0.35);
  c.beginPath(); if (v === 2) { c.ellipse(0, r * 0.1, r * 0.5, r * 0.62, 0, 0, 7); } else c.arc(0, r * 0.12, r * (0.62 + R * 0.03), 0, 7);
  const gr = c.createRadialGradient(-r * 0.2, -r * 0.1, r * 0.05, 0, r * 0.12, r * 0.7); gr.addColorStop(0, TI.shade(T0.c, 0.45)); gr.addColorStop(1, TI.shade(T0.c, -0.3)); c.fillStyle = gr; c.fill(); c.shadowBlur = 0; TI.ink(c);
  if (v === 2) { c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 0.8; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(-r * 0.5, r * 0.1 + i * r * 0.2); c.lineTo(r * 0.5, r * 0.1 + i * r * 0.2); c.stroke(); } }
  if (v === 4 || T0.post === 'cluster') { c.fillStyle = T0.c2; for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; c.beginPath(); c.arc(Math.cos(a) * r * 0.32, r * 0.12 + Math.sin(a) * r * 0.32, r * 0.1, 0, 7); c.fill(); } }
  if (T0.el) { c.fillStyle = g; c.beginPath(); c.arc(0, r * 0.12, r * 0.18, 0, 7); c.fill(); }
  c.beginPath(); c.rect(-r * 0.16, -r * 0.62, r * 0.32, r * 0.18); TI.fill(c, '#5a5a62', 0.8);
  c.strokeStyle = '#c8a060'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(0, -r * 0.62); c.quadraticCurveTo(r * 0.3, -r * 0.95, r * 0.5, -r * 0.8); c.stroke(); TI.spark(c, r * 0.52, -r * 0.82, r * 0.15, '#ffd060');
}
function tiPotion(c, r, T0) {
  const sh = T0.shape || 0, g = T0.r, col = T0.c; c.beginPath();
  if (sh === 1) { c.moveTo(-r * 0.16, -r * 0.9); c.lineTo(r * 0.16, -r * 0.9); c.lineTo(r * 0.16, -r * 0.55); c.lineTo(r * 0.36, -r * 0.3); c.lineTo(r * 0.36, r * 0.85); c.lineTo(-r * 0.36, r * 0.85); c.lineTo(-r * 0.36, -r * 0.3); c.lineTo(-r * 0.16, -r * 0.55); }
  else if (sh === 2) { c.moveTo(-r * 0.14, -r * 0.9); c.lineTo(r * 0.14, -r * 0.9); c.lineTo(r * 0.14, -r * 0.35); c.lineTo(r * 0.7, r * 0.8); c.lineTo(-r * 0.7, r * 0.8); c.lineTo(-r * 0.14, -r * 0.35); }
  else if (sh === 3) { c.moveTo(-r * 0.15, -r * 0.9); c.lineTo(r * 0.15, -r * 0.9); c.lineTo(r * 0.15, -r * 0.5); c.lineTo(r * 0.58, -r * 0.4); c.lineTo(r * 0.58, r * 0.82); c.lineTo(-r * 0.58, r * 0.82); c.lineTo(-r * 0.58, -r * 0.4); c.lineTo(-r * 0.15, -r * 0.5); }
  else if (sh === 4) { c.moveTo(-r * 0.15, -r * 0.9); c.lineTo(r * 0.15, -r * 0.9); c.lineTo(r * 0.15, -r * 0.5); c.bezierCurveTo(r * 0.9, -r * 0.8, r * 0.9, r * 0.2, 0, r * 0.85); c.bezierCurveTo(-r * 0.9, r * 0.2, -r * 0.9, -r * 0.8, -r * 0.15, -r * 0.5); }
  else { c.moveTo(-r * 0.18, -r * 0.9); c.lineTo(r * 0.18, -r * 0.9); c.lineTo(r * 0.18, -r * 0.35); c.arc(0, r * 0.22, r * 0.62, -Math.PI / 2 + 0.3, Math.PI * 1.5 - 0.3); }
  c.closePath(); c.fillStyle = 'rgba(220,235,255,.3)'; c.fill(); TI.ink(c);
  c.save(); c.clip(); const lvl = r * (0.05 - g * 0.06); if (g >= 3) TI.glow(c, col, r * 0.4); c.fillStyle = col; c.fillRect(-r, lvl, r * 2, r * 2); c.shadowBlur = 0;
  c.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 2 + g; i++) { c.beginPath(); c.arc(-r * 0.25 + (i * 0.37 % 0.5) * r, r * 0.55 - i * r * 0.14, r * 0.05, 0, 7); c.fill(); } c.restore();
  c.beginPath(); c.rect(-r * 0.2, -r * 1, r * 0.4, r * 0.2); TI.fill(c, g >= 3 ? '#f0c75e' : '#a87a48', 0.8);
  c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(-r * 0.28, -r * 0.1, r * 0.08, r * 0.45);
  for (let i = 0; i < g; i++) TI.spark(c, r * 0.6 - i * r * 0.0, -r * 0.6 + i * r * 0.3, r * (0.1 + (g === 4 ? 0.04 : 0)), g === 4 ? '#f0c75e' : '#fff');
}
function tiMana(c, r, T0) {
  const sh = T0.shape, col = T0.c, R = T0.r; if (R >= 2) TI.glow(c, col, r * (0.2 + R * 0.1));
  c.beginPath();
  if (sh === 'ring') { c.arc(0, r * 0.1, r * 0.55, 0, 7); c.lineWidth = r * 0.2; c.strokeStyle = '#f0c75e'; c.stroke(); c.shadowBlur = 0; TI.gem(c, 0, -r * 0.45, r * 0.25, col); return; }
  if (sh === 'amulet') { c.arc(0, -r * 0.3, r * 0.6, Math.PI * 0.15, Math.PI * 0.85, true); c.strokeStyle = '#c8c0b0'; c.lineWidth = r * 0.08; c.stroke(); c.shadowBlur = 0; c.beginPath(); c.arc(0, r * 0.38, r * 0.34, 0, 7); TI.fill(c, '#f0c75e'); TI.gem(c, 0, r * 0.38, r * 0.24, col); return; }
  if (sh === 'crown') { c.moveTo(-r * 0.8, r * 0.5); c.lineTo(-r * 0.8, -r * 0.3); c.lineTo(-r * 0.4, r * 0.05); c.lineTo(0, -r * 0.55); c.lineTo(r * 0.4, r * 0.05); c.lineTo(r * 0.8, -r * 0.3); c.lineTo(r * 0.8, r * 0.5); c.closePath(); TI.fill(c, '#f0c75e'); c.shadowBlur = 0; TI.gem(c, 0, r * 0.2, r * 0.18, col); TI.gem(c, -r * 0.5, r * 0.25, r * 0.1, col); TI.gem(c, r * 0.5, r * 0.25, r * 0.1, col); return; }
  if (sh === 'star') { for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, q = i % 2 ? r * 0.38 : r * 0.9; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); } c.closePath(); TI.fill(c, col); }
  else if (sh === 'drop') { c.moveTo(0, -r * 0.9); c.bezierCurveTo(r * 0.75, -r * 0.1, r * 0.7, r * 0.85, 0, r * 0.85); c.bezierCurveTo(-r * 0.7, r * 0.85, -r * 0.75, -r * 0.1, 0, -r * 0.9); TI.fill(c, col); }
  else if (sh === 'shard') { c.moveTo(0, -r * 0.9); c.lineTo(r * 0.45, -r * 0.1); c.lineTo(r * 0.2, r * 0.85); c.lineTo(-r * 0.3, r * 0.7); c.lineTo(-r * 0.45, -r * 0.2); c.closePath(); TI.fill(c, col); }
  else if (sh === 'cup') { c.moveTo(-r * 0.6, -r * 0.35); c.lineTo(r * 0.6, -r * 0.35); c.lineTo(r * 0.45, r * 0.6); c.lineTo(-r * 0.45, r * 0.6); c.closePath(); TI.fill(c, '#e8e0d0'); c.fillStyle = col; c.fillRect(-r * 0.55, -r * 0.33, r * 1.1, r * 0.15); c.strokeStyle = '#e8e0d0'; c.lineWidth = r * 0.1; c.beginPath(); c.arc(r * 0.62, r * 0.1, r * 0.2, -1.2, 1.2); c.stroke(); }
  else if (sh === 'fruit') { c.arc(0, r * 0.1, r * 0.65, 0, 7); TI.fill(c, col); c.fillStyle = '#5a8a3a'; c.beginPath(); c.ellipse(r * 0.2, -r * 0.6, r * 0.25, r * 0.1, -0.5, 0, 7); c.fill(); }
  else if (sh === 'heart') { c.moveTo(0, r * 0.8); c.bezierCurveTo(-r * 1.1, 0, -r * 0.5, -r * 0.9, 0, -r * 0.35); c.bezierCurveTo(r * 0.5, -r * 0.9, r * 1.1, 0, 0, r * 0.8); TI.fill(c, col); }
  else { c.arc(0, 0, r * 0.7, 0, 7); const gr = c.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.05, 0, 0, r * 0.7); gr.addColorStop(0, '#fff'); gr.addColorStop(0.3, col); gr.addColorStop(1, TI.shade(col, -0.5)); c.fillStyle = gr; c.fill(); TI.ink(c); }
  c.shadowBlur = 0; c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(-r * 0.2, -r * 0.25, r * 0.1, 0, 7); c.fill();
  if (R >= 3) TI.spark(c, r * 0.6, -r * 0.6, r * 0.15, '#fff');
}
function drawTerraIcon(c, id, s) {
  const T0 = TR[id], r = s / 2; c.save(); c.lineJoin = 'round';
  switch (T0.fam) {
    case 'sword': tiSword(c, r, T0, false); break; case 'ancient': tiSword(c, r, T0, true); break;
    case 'gun': tiGun(c, r, T0); break; case 'boomer': tiBoomer(c, r, T0); break; case 'hook': tiHook(c, r, T0); break;
    case 'yoyo': tiYoyo(c, r, T0); break; case 'whip': tiWhip(c, r, T0); break; case 'xbow': tiBow(c, r, T0, true); break;
    case 'bow': tiBow(c, r, T0, false); break; case 'wand': tiWand(c, r, T0, false); break; case 'summon': tiWand(c, r, T0, true); break;
    case 'bomb': T0.post = (WEAPONS[id] || {}).post; tiBomb(c, r, T0); break; case 'potion': tiPotion(c, r, T0); break; case 'mana': tiMana(c, r, T0); break;
  }
  c.restore();
}
{ const d0 = drawItemPath; drawItemPath = (c, id, s) => { const b = String(id).split('~')[0]; return TR[b] ? drawTerraIcon(c, b, s) : d0(c, id, s); }; }
