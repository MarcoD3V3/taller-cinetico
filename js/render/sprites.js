'use strict';
// Primitivas de dibujo y cachés de sprites. Todo lo estático se dibuja UNA vez en un canvas
// fuera de pantalla y luego solo se copia con drawImage (muy rápido).
const SPR_S = 2; // resolución de los sprites (píxeles por unidad de mundo)
const FONT = 'bold 11px system-ui, sans-serif';
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }

// Modo «render» (solo al crear los sprites de los bloques): rellenos con volumen y brillo
let RICH = false;
const isHex6 = f => typeof f === 'string' && f.length === 7 && f[0] === '#';
function box(c, x, y, w, h, fill, stroke, r = 3) {
  rr(c, x, y, w, h, r);
  if (RICH && isHex6(fill)) { const g = c.createLinearGradient(x, y, x + w * 0.5, y + h); g.addColorStop(0, shade(fill, 0.3)); g.addColorStop(0.5, fill); g.addColorStop(1, shade(fill, -0.32)); c.fillStyle = g; } else c.fillStyle = fill;
  c.fill();
  if (RICH && w > 5 && h > 5) { // brillo interior arriba y filo de luz
    c.save(); c.clip(); const g2 = c.createLinearGradient(0, y, 0, y + h * 0.45); g2.addColorStop(0, 'rgba(255,255,255,.22)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g2; c.fillRect(x, y, w, h * 0.45);
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1; rr(c, x + 1, y + 1, w - 2, h - 2, Math.max(0, r - 1)); c.stroke(); c.restore(); rr(c, x, y, w, h, r);
  }
  c.lineWidth = RICH ? 1.1 : 1.5; c.strokeStyle = stroke || 'rgba(0,0,0,.6)'; c.stroke();
}
function circ(c, x, y, r, fill, stroke) {
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
  if (RICH && isHex6(fill) && r > 1.5) { const g = c.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); g.addColorStop(0, shade(fill, 0.4)); g.addColorStop(0.55, fill); g.addColorStop(1, shade(fill, -0.35)); c.fillStyle = g; } else c.fillStyle = fill;
  c.fill(); if (stroke) { c.lineWidth = 1.2; c.strokeStyle = stroke; c.stroke(); }
}
function arrow(c, x = 12, col = '#e0b54c', s = 1) { c.beginPath(); c.moveTo(x + 3 * s, 0); c.lineTo(x - 3 * s, -4 * s); c.lineTo(x - 3 * s, 4 * s); c.closePath(); c.fillStyle = col; c.fill(); }
function dirArrow(c, dir, x = 11, col) { c.rotate(dir * Math.PI / 2); arrow(c, x, col); c.rotate(-dir * Math.PI / 2); }
function label(c, txt, y = 1, col = '#2a2c2e', size = 11) { c.font = `bold ${size}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(txt, 0, y); }
function led(c, x, y, on, col = '#ff3a2e') { circ(c, x, y, 2.6, on ? col : '#4a1814'); if (on) { c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(x - 1, y - 1.5, 1.2, 1.2); } }
function plate(c, col = '#8d8f8b') { box(c, -12, -12, 24, 24, col, 'rgba(0,0,0,.55)', 3); c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(-11, -11, 22, 2); }
function mbox(c, col) { box(c, -14, -14, 28, 28, col, 'rgba(0,0,0,.6)', 4); c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(-13, -13, 26, 2); }
function cogPath(c, r, teeth, fill) {
  c.beginPath(); const s = Math.PI * 2 / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * s;
    c.lineTo(Math.cos(a - s * .3) * r * .78, Math.sin(a - s * .3) * r * .78);
    c.lineTo(Math.cos(a - s * .16) * r, Math.sin(a - s * .16) * r);
    c.lineTo(Math.cos(a + s * .16) * r, Math.sin(a + s * .16) * r);
    c.lineTo(Math.cos(a + s * .3) * r * .78, Math.sin(a + s * .3) * r * .78);
  }
  c.closePath(); c.fillStyle = fill; c.fill(); c.lineWidth = 1; c.strokeStyle = 'rgba(0,0,0,.55)'; c.stroke();
  circ(c, 0, 0, r * .28, '#3a3a3a');
}
// Engranajes en caché, girados al dibujar
const _cogs = new Map();
function cogSprite(r, teeth, fill) {
  const k = r + '|' + teeth + '|' + fill; let s = _cogs.get(k);
  if (!s) { const sz = (r + 2) * 2; s = mkCanvas(sz * SPR_S, sz * SPR_S); const c = s.getContext('2d'); c.scale(SPR_S, SPR_S); c.translate(sz / 2, sz / 2); cogPath(c, r, teeth, fill); _cogs.set(k, s); }
  return s;
}
function drawCog(c, x, y, r, teeth, fill, ang) {
  const s = cogSprite(r, teeth, fill), h = r + 2;
  c.translate(x, y); c.rotate(ang); c.drawImage(s, -h, -h, h * 2, h * 2); c.rotate(-ang); c.translate(-x, -y);
}
// Sprite genérico de "rotor" (ruedas, aspas) cacheado por nombre
const _rot = new Map();
function rotorSprite(name, size, fn) {
  let s = _rot.get(name);
  if (!s) { s = mkCanvas(size * SPR_S, size * SPR_S); const c = s.getContext('2d'); c.scale(SPR_S, SPR_S); c.translate(size / 2, size / 2); fn(c); _rot.set(name, s); }
  return s;
}
function drawRotor(c, name, size, fn, ang, x = 0, y = 0) {
  const s = rotorSprite(name, size, fn), h = size / 2;
  c.translate(x, y); c.rotate(ang); c.drawImage(s, -h, -h, size, size); c.rotate(-ang); c.translate(-x, -y);
}

// ---------- Iconos de objetos ----------
// Mango de madera de (x0,y0) a (x1,y1) en unidades de r; deja un camino nuevo abierto
function handle(c, r, x0, y0, x1, y1) { c.moveTo(r * x0, r * y0); c.lineTo(r * x1, r * y1); c.strokeStyle = '#6a4a2a'; c.lineWidth = r * .2; c.stroke(); c.beginPath(); }
function ink(c) { c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1.1; }
function drawItemPath(c, id, s) {
  const it = ITEMS[id]; const col = it ? it.c : '#f0f', r = s / 2, sh = it ? it.s : 'rock';
  c.lineWidth = 1.1; c.strokeStyle = 'rgba(0,0,0,.6)'; c.beginPath();
  switch (sh) {
    case 'ingot': c.moveTo(-r, r * .45); c.lineTo(-r * .6, -r * .45); c.lineTo(r * .6, -r * .45); c.lineTo(r, r * .45); c.closePath(); break;
    case 'sheet': c.rect(-r, -r * .35, 2 * r, r * .7); break;
    case 'plank': c.rect(-r, -r * .4, 2 * r, r * .8); break;
    case 'log': c.arc(0, 0, r * .85, 0, 7); break;
    case 'gem': c.moveTo(0, -r); c.lineTo(r * .85, 0); c.lineTo(0, r); c.lineTo(-r * .85, 0); c.closePath(); break;
    case 'dust': c.arc(0, 0, r * .7, 0, 7); break;
    case 'rod': c.rect(-r, -r * .18, 2 * r, r * .36); break;
    case 'coil': c.arc(0, 0, r * .8, 0, 7); break;
    case 'chip': c.rect(-r * .8, -r * .8, r * 1.6, r * 1.6); break;
    case 'cell': c.rect(-r * .45, -r * .85, r * .9, r * 1.7); break;
    case 'drop': c.moveTo(0, -r); c.quadraticCurveTo(r * .9, r * .2, 0, r * .85); c.quadraticCurveTo(-r * .9, r * .2, 0, -r); break;
    case 'cog': case 'bigcog': cogPath(c, r * .95, sh === 'bigcog' ? 12 : 8, col); return;
    case 'scog': cogPath(c, r * .6, 6, col); return;
    case 'nugget': c.arc(-r * .2, r * .1, r * .45, 0, 7); c.moveTo(r * .55, -r * .1); c.arc(r * .3, -r * .1, r * .3, 0, 7); break;
    case 'dsheet': c.rect(-r, -r * .5, 2 * r, r * .45); c.rect(-r * .8, 0, 2 * r * .9, r * .45); break;
    case 'foil': c.moveTo(-r, -r * .2); c.quadraticCurveTo(0, -r * .6, r, -r * .2); c.lineTo(r, r * .2); c.quadraticCurveTo(0, -r * .2, -r, r * .2); c.closePath(); break;
    case 'lrod': c.rect(-r * 1.1, -r * .12, 2.2 * r, r * .24); break;
    case 'bolt': c.rect(-r * .55, -r * .35, r * .5, r * .7); c.rect(-r * .05, -r * .15, r * .95, r * .3); break;
    case 'screw': c.moveTo(-r * .6, -r * .4); c.lineTo(-r * .1, -r * .4); c.lineTo(-r * .1, -r * .15); c.lineTo(r * .9, 0); c.lineTo(-r * .1, r * .15); c.lineTo(-r * .1, r * .4); c.lineTo(-r * .6, r * .4); c.closePath(); break;
    case 'ring': c.arc(0, 0, r * .75, 0, 7); c.moveTo(r * .4, 0); c.arc(0, 0, r * .4, 0, 7, true); break;
    case 'spring': c.fillStyle = 'transparent'; c.strokeStyle = col; c.lineWidth = r * .22; for (let i = -3; i <= 3; i++) { c.moveTo(i * r * .25, -r * .6); c.lineTo(i * r * .25 + r * .12, r * .6); } c.stroke(); return;
    case 'block': c.rect(-r * .8, -r * .8, r * 1.6, r * 1.6); break;
    case 'pick': c.strokeStyle = '#6a4a2a'; c.lineWidth = r * .22; c.moveTo(-r * .6, r * .8); c.lineTo(r * .3, -r * .2); c.stroke(); c.beginPath(); c.moveTo(-r * .3, -r * .9); c.quadraticCurveTo(r * .5, -r * .7, r * .9, r * .1); c.lineTo(r * .6, r * .2); c.quadraticCurveTo(r * .3, -r * .4, -r * .4, -r * .6); c.closePath(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1.1; break;
    case 'axe': c.strokeStyle = '#6a4a2a'; c.lineWidth = r * .22; c.moveTo(-r * .6, r * .8); c.lineTo(r * .4, -r * .6); c.stroke(); c.beginPath(); c.moveTo(r * .1, -r * .9); c.quadraticCurveTo(r * .9, -r * .7, r * .8, 0); c.lineTo(r * .2, -r * .3); c.closePath(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1.1; break;
    case 'hammer': c.strokeStyle = '#6a4a2a'; c.lineWidth = r * .22; c.moveTo(-r * .6, r * .8); c.lineTo(r * .2, -r * .2); c.stroke(); c.beginPath(); c.rect(-r * .1, -r * .9, r * .9, r * .6); c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1.1; break;
    // Armas, herramientas y objetos de fantasía
    case 'sword': case 'dagger': { const L2 = sh === 'sword' ? .9 : .45; handle(c, r, -.8, .8, -.4, .4); c.beginPath(); c.moveTo(-r * .55, r * .25); c.lineTo(-r * .25, r * .55); c.strokeStyle = '#c8a040'; c.lineWidth = r * .16; c.stroke(); c.beginPath(); c.moveTo(-r * .52, r * .26); c.lineTo(r * L2 - r * .22, -r * L2 - r * .04); c.lineTo(r * L2, -r * L2); c.lineTo(r * L2 + r * .04, -r * L2 + r * .22); c.lineTo(-r * .26, r * .52); c.closePath(); ink(c); break; }
    case 'spear': handle(c, r, -.95, .95, .45, -.45); c.beginPath(); c.moveTo(r * .35, -r * .6); c.lineTo(r * .95, -r * .95); c.lineTo(r * .6, -r * .35); c.closePath(); ink(c); break;
    case 'baxe': handle(c, r, -.85, .85, .5, -.5); c.beginPath(); c.moveTo(r * .1, -r * .5); c.quadraticCurveTo(r * .2, -r * 1.05, r * .75, -r * .95); c.quadraticCurveTo(r * .35, -r * .45, r * .95, -r * .2); c.quadraticCurveTo(r * .55, r * .05, r * .5, -r * .1); c.closePath(); ink(c); break;
    case 'mace': handle(c, r, -.85, .85, .2, -.2); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.moveTo(r * .42 + Math.cos(a) * r * .32, -r * .42 + Math.sin(a) * r * .32); c.lineTo(r * .42 + Math.cos(a) * r * .55, -r * .42 + Math.sin(a) * r * .55); } c.strokeStyle = col; c.lineWidth = r * .12; c.stroke(); c.beginPath(); c.arc(r * .42, -r * .42, r * .36, 0, 7); ink(c); break;
    case 'scythe': handle(c, r, -.6, .95, .2, -.9); c.beginPath(); c.moveTo(r * .2, -r * .9); c.quadraticCurveTo(-r * .6, -r * 1.1, -r * .95, -r * .2); c.quadraticCurveTo(-r * .6, -r * .7, r * .15, -r * .65); c.closePath(); ink(c); break;
    case 'sickle': handle(c, r, -.8, .8, -.35, .35); c.beginPath(); c.moveTo(-r * .4, r * .3); c.quadraticCurveTo(r * .9, r * .2, r * .5, -r * .8); c.quadraticCurveTo(r * .55, -r * .1, -r * .25, r * .15); c.closePath(); ink(c); break;
    case 'bow': c.moveTo(-r * .5, -r * .9); c.lineTo(-r * .5, r * .9); c.strokeStyle = '#e8e0d0'; c.lineWidth = 0.8; c.stroke(); c.beginPath(); c.moveTo(-r * .5, -r * .95); c.quadraticCurveTo(r * 1.1, 0, -r * .5, r * .95); c.quadraticCurveTo(r * .75, 0, -r * .5, -r * .95); ink(c); break;
    case 'xbow': handle(c, r, -.8, .8, .5, -.5); c.beginPath(); c.moveTo(-r * .2, -r * .9); c.quadraticCurveTo(r * .55, -r * .55, r * .9, r * .2); c.lineTo(r * .75, r * .3); c.quadraticCurveTo(r * .4, -r * .4, -r * .3, -r * .75); c.closePath(); ink(c); break;
    case 'staff': handle(c, r, -.8, .9, .35, -.45); c.beginPath(); c.arc(r * .45, -r * .55, r * .38, 0, 7); ink(c); break;
    case 'wand': handle(c, r, -.7, .7, .3, -.3); c.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr2 = i % 2 ? r * .18 : r * .45; c.lineTo(r * .45 + Math.cos(a) * rr2, -r * .45 + Math.sin(a) * rr2); } c.closePath(); ink(c); break;
    case 'paxel': handle(c, r, -.6, .8, .3, -.2); c.beginPath(); c.moveTo(-r * .3, -r * .9); c.quadraticCurveTo(r * .5, -r * .7, r * .9, r * .1); c.lineTo(r * .7, r * .2); c.lineTo(r * .4, -r * .1); c.lineTo(r * .2, r * .3); c.lineTo(-r * .1, -r * .25); c.quadraticCurveTo(r * .1, -r * .5, -r * .4, -r * .6); c.closePath(); ink(c); break;
    case 'shovel': handle(c, r, -.85, .85, .25, -.25); c.beginPath(); c.moveTo(r * .1, -r * .45); c.lineTo(r * .55, -r * .95); c.quadraticCurveTo(r * 1.05, -r * .75, r * .95, -r * .55); c.lineTo(r * .45, -r * .1); c.closePath(); ink(c); break;
    case 'coin': c.arc(0, 0, r * .75, 0, 7); c.fillStyle = col; c.fill(); c.stroke(); c.beginPath(); c.arc(0, 0, r * .5, 0, 7); c.strokeStyle = 'rgba(120,80,0,.6)'; c.stroke(); return;
    case 'arrowI': c.moveTo(-r * .8, r * .8); c.lineTo(r * .6, -r * .6); c.strokeStyle = '#8a6a3a'; c.lineWidth = r * .14; c.stroke(); c.beginPath(); c.moveTo(r * .9, -r * .9); c.lineTo(r * .35, -r * .6); c.lineTo(r * .6, -r * .35); c.closePath(); ink(c); break;
    case 'gun': c.rect(-r * .9, -r * .35, r * 1.7, r * .35); c.rect(-r * .9, -r * .1, r * .45, r * .8); c.fillStyle = '#5a3a1a'; c.fill(); c.stroke(); c.beginPath(); c.rect(-r * .3, -r * .45, r * 1.25, r * .28); ink(c); break;
    case 'sling': c.moveTo(0, r * .9); c.lineTo(0, 0); c.lineTo(-r * .55, -r * .8); c.moveTo(0, 0); c.lineTo(r * .55, -r * .8); c.strokeStyle = col; c.lineWidth = r * .2; c.stroke(); return;
    case 'boomer': c.moveTo(-r * .9, r * .3); c.quadraticCurveTo(-r * .2, -r * 1.1, r * .9, -r * .1); c.lineTo(r * .7, r * .2); c.quadraticCurveTo(-r * .2, -r * .6, -r * .6, r * .5); c.closePath(); break;
    case 'shuriken': for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr2 = i % 2 ? r * .25 : r * .95; c.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } c.closePath(); break;
    case 'hook': c.arc(r * .2, r * .2, r * .55, Math.PI * .1, Math.PI * 1.3); c.strokeStyle = col; c.lineWidth = r * .22; c.stroke(); c.beginPath(); c.moveTo(r * .55, -r * .2); c.lineTo(r * .9, -r * .9); c.stroke(); return;
    case 'skull': c.arc(0, -r * .1, r * .7, Math.PI * .9, Math.PI * 2.1); c.lineTo(r * .4, r * .8); c.lineTo(-r * .4, r * .8); c.closePath(); c.fillStyle = '#e8e0c8'; c.fill(); c.stroke(); circ(c, -r * .25, -r * .05, r * .18, col); circ(c, r * .25, -r * .05, r * .18, col); return;
    case 'trophy': c.moveTo(-r * .6, -r * .8); c.lineTo(r * .6, -r * .8); c.quadraticCurveTo(r * .6, r * .2, 0, r * .25); c.quadraticCurveTo(-r * .6, r * .2, -r * .6, -r * .8); c.rect(-r * .12, r * .2, r * .24, r * .4); c.rect(-r * .45, r * .55, r * .9, r * .25); c.fillStyle = '#ffd34a'; c.fill(); c.stroke(); circ(c, 0, -r * .35, r * .2, col); return;
    case 'helm': c.arc(0, r * .1, r * .8, Math.PI, 0); c.lineTo(r * .8, r * .4); c.lineTo(-r * .8, r * .4); c.closePath(); c.fillStyle = col; c.fill(); c.stroke(); c.beginPath(); c.rect(-r * .55, -r * .05, r * 1.1, r * .18); c.fillStyle = 'rgba(0,0,0,.5)'; c.fill(); return;
    case 'chestA': c.moveTo(-r * .9, -r * .6); c.lineTo(-r * .35, -r * .85); c.quadraticCurveTo(0, -r * .55, r * .35, -r * .85); c.lineTo(r * .9, -r * .6); c.lineTo(r * .65, -r * .1); c.lineTo(r * .6, r * .85); c.lineTo(-r * .6, r * .85); c.lineTo(-r * .65, -r * .1); c.closePath(); c.fillStyle = col; c.fill(); c.stroke(); c.beginPath(); c.moveTo(0, -r * .5); c.lineTo(0, r * .8); c.strokeStyle = 'rgba(255,255,255,.35)'; c.stroke(); return;
    case 'legsA': c.moveTo(-r * .6, -r * .85); c.lineTo(r * .6, -r * .85); c.lineTo(r * .65, r * .85); c.lineTo(r * .1, r * .85); c.lineTo(0, -r * .1); c.lineTo(-r * .1, r * .85); c.lineTo(-r * .65, r * .85); c.closePath(); break;
    case 'bootsA': c.moveTo(-r * .8, -r * .7); c.lineTo(-r * .2, -r * .7); c.lineTo(-r * .2, r * .3); c.lineTo(r * .85, r * .4); c.lineTo(r * .85, r * .8); c.lineTo(-r * .8, r * .8); c.closePath(); break;
    case 'excav': handle(c, r, -.7, .9, .1, -.1); c.beginPath(); c.rect(-r * .35, -r * .95, r * 1.25, r * .8); ink(c); break;
    case 'potion': c.moveTo(-r * .18, -r * .9); c.lineTo(r * .18, -r * .9); c.lineTo(r * .18, -r * .35); c.arc(0, r * .2, r * .62, -Math.PI / 2 + .3, Math.PI * 1.5 - .3); c.closePath(); c.fillStyle = 'rgba(220,235,255,.35)'; c.fill(); c.stroke(); c.beginPath(); c.arc(0, r * .2, r * .52, -.2, Math.PI + .2); c.closePath(); c.fillStyle = col; c.fill(); circ(c, -r * .2, r * .05, r * .1, 'rgba(255,255,255,.6)'); return;
    case 'scroll': c.rect(-r * .65, -r * .7, r * 1.3, r * 1.4); c.fillStyle = '#e8dcb8'; c.fill(); c.stroke(); c.beginPath(); c.rect(-r * .85, -r * .85, r * 1.7, r * .3); c.rect(-r * .85, r * .55, r * 1.7, r * .3); break;
    case 'rune': c.moveTo(-r * .6, -r * .85); c.lineTo(r * .6, -r * .85); c.lineTo(r * .8, r * .6); c.lineTo(0, r * .9); c.lineTo(-r * .8, r * .6); c.closePath(); c.fillStyle = '#6a6e76'; c.fill(); c.stroke(); c.beginPath(); c.moveTo(0, -r * .55); c.lineTo(0, r * .55); c.moveTo(0, -r * .1); c.lineTo(r * .35, -r * .45); c.moveTo(0, r * .1); c.lineTo(-r * .35, r * .35); c.strokeStyle = col; c.lineWidth = r * .16; c.stroke(); return;
    case 'book': c.rect(-r * .75, -r * .85, r * 1.5, r * 1.7); c.fillStyle = col; c.fill(); c.stroke(); c.beginPath(); c.fillStyle = '#efe6cc'; c.fillRect(r * .55, -r * .7, r * .15, r * 1.4); c.fillStyle = 'rgba(255,230,140,.8)'; c.fillRect(-r * .35, -r * .4, r * .6, r * .12); return;
    case 'amulet': c.arc(0, -r * .3, r * .55, Math.PI, 0); c.strokeStyle = '#c8a040'; c.lineWidth = r * .1; c.stroke(); c.beginPath(); c.moveTo(0, -r * .1); c.lineTo(r * .45, r * .35); c.lineTo(0, r * .9); c.lineTo(-r * .45, r * .35); c.closePath(); ink(c); break;
    case 'orb': c.arc(0, 0, r * .8, 0, 7); c.fillStyle = col; c.fill(); c.stroke(); circ(c, -r * .28, -r * .3, r * .22, 'rgba(255,255,255,.55)'); return;
    case 'fang': c.moveTo(-r * .55, -r * .8); c.quadraticCurveTo(r * .9, -r * .6, r * .2, r * .9); c.quadraticCurveTo(r * .1, -r * .2, -r * .55, -r * .8); break;
    case 'scale': c.arc(0, -r * .1, r * .75, Math.PI, 0); c.quadraticCurveTo(r * .5, r * .5, 0, r * .9); c.quadraticCurveTo(-r * .5, r * .5, -r * .75, -r * .1); break;
    case 'eye': c.ellipse(0, 0, r * .9, r * .5, 0, 0, 7); c.fillStyle = '#f4f0e0'; c.fill(); c.stroke(); c.beginPath(); c.arc(0, 0, r * .35, 0, 7); c.fillStyle = col; c.fill(); circ(c, 0, 0, r * .12, '#111'); return;
    case 'feather': c.moveTo(-r * .8, r * .8); c.quadraticCurveTo(-r * .4, -r * .6, r * .8, -r * .85); c.quadraticCurveTo(r * .5, r * .3, -r * .8, r * .8); break;
    case 'herb': c.moveTo(0, r * .9); c.lineTo(0, -r * .2); c.strokeStyle = '#4a7a2a'; c.lineWidth = r * .14; c.stroke(); c.beginPath(); for (const [a, b] of [[-.45, -.35], [.45, -.3], [0, -.7]]) { c.moveTo(a * r + r * .3, b * r); c.ellipse(a * r, b * r, r * .3, r * .2, a, 0, 7); } break;
    default: c.moveTo(-r * .8, -r * .2); c.lineTo(-r * .2, -r * .85); c.lineTo(r * .7, -r * .5); c.lineTo(r * .85, r * .4); c.lineTo(0, r * .85); c.lineTo(-r * .75, r * .5); c.closePath();
  }
  c.fillStyle = sh === 'ore' ? '#80848b' : col; c.fill(); c.stroke();
  if (sh === 'ore') { c.fillStyle = col; for (const [a, b] of [[-.3, -.2], [.3, .1], [-.05, .4]]) { c.beginPath(); c.arc(a * r, b * r, r * .2, 0, 7); c.fill(); } }
  if (sh === 'log') { c.beginPath(); c.arc(0, 0, r * .45, 0, 7); c.strokeStyle = 'rgba(0,0,0,.35)'; c.stroke(); }
  if (sh === 'ingot' || sh === 'sheet') { c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-r * .5, -r * .3, r * .8, r * .15); }
  if (sh === 'coil') { c.strokeStyle = 'rgba(80,30,10,.6)'; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * r * .28, -r * .7); c.lineTo(i * r * .28, r * .7); c.stroke(); } circ(c, 0, 0, r * .25, '#5a5a5a'); }
  if (sh === 'chip') { c.fillStyle = '#d9c36a'; for (let i = -1; i <= 1; i++) { c.fillRect(-r, i * r * .45 - 1, r * .3, 2); c.fillRect(r * .7, i * r * .45 - 1, r * .3, 2); } c.fillStyle = '#1b3d25'; c.fillRect(-r * .35, -r * .35, r * .7, r * .7); }
  if (sh === 'cell') { c.fillStyle = '#d8d8d8'; c.fillRect(-r * .2, -r, r * .4, r * .2); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(-r * .3, -r * .6, r * .15, r * 1.2); }
}
const _items = new Map();
function itemSprite(id) {
  let s = _items.get(id);
  if (!s) {
    s = mkCanvas(20 * SPR_S, 20 * SPR_S); const c = s.getContext('2d'); c.scale(SPR_S, SPR_S); c.translate(10, 10);
    if (BD[id]) { c.scale(18 / 36, 18 / 36); drawBlockIcon(c, id); } else drawItemPath(c, id, 16);
    _items.set(id, s);
  }
  return s;
}
function drawItem(c, id, x, y, s) { c.drawImage(itemSprite(id), x - s * .625, y - s * .625, s * 1.25, s * 1.25); }
// Iconos para el HTML (dataURL), en caché
const _icons = new Map();
function iconURL(id) {
  let u = _icons.get(id);
  if (!u) {
    const px = 48, cv = mkCanvas(px, px), c = cv.getContext('2d');
    c.translate(px / 2, px / 2);
    if (BD[id]) { c.scale(px / 38, px / 38); drawBlockIcon(c, id); } else { c.scale(px / 20, px / 20); drawItemPath(c, id, 16); }
    // URL de blob (corta) en vez de base64 dentro del HTML: el DOM se construye mucho más rápido
    const b64 = cv.toDataURL().split(',')[1], bin = atob(b64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    u = URL.createObjectURL(new Blob([arr], { type: 'image/png' })); _icons.set(id, u);
  }
  return u;
}
// Atlas de iconos: todos los objetos dibujados en UNA imagen que se codifica una sola vez.
// En el HTML cada icono es un <i class="ic"> que recorta su trozo con CSS (rapidísimo).
const ATLAS = { ready: false, cols: 32, rows: 1, pos: new Map(), style: new Map() };
function buildAtlas() {
  const ids = ITEM_ORDER, cols = 32, rows = Math.ceil(ids.length / cols), C2 = 48;
  const cv = mkCanvas(cols * C2, rows * C2), c = cv.getContext('2d'); let i = 0;
  const step = () => {
    const end = Math.min(ids.length, i + 50);
    for (; i < end; i++) {
      const id = ids[i]; c.save(); c.translate((i % cols) * C2 + C2 / 2, ((i / cols) | 0) * C2 + C2 / 2);
      try { if (BD[id]) { c.scale(C2 / 38, C2 / 38); drawBlockIcon(c, id); } else { c.scale(C2 / 20, C2 / 20); drawItemPath(c, id, 16); } } catch (e) { console.warn('Icono', id, e); }
      c.restore(); ATLAS.pos.set(id, i);
    }
    if (i < ids.length) { setTimeout(step, 0); return; }
    cv.toBlob(bl => {
      ATLAS.cols = cols; ATLAS.rows = rows; document.documentElement.style.setProperty('--atlas', `url(${URL.createObjectURL(bl)})`);
      ATLAS.ready = true; invVersion++; _panelVer++;
    });
  };
  step();
}
function iconStyle(id) {
  let s = ATLAS.style.get(id); if (s) return s;
  const i = ATLAS.ready ? ATLAS.pos.get(id) : undefined; if (i === undefined) return `background-image:url(${iconURL(id)});background-size:contain`;
  const col = i % ATLAS.cols, row = (i / ATLAS.cols) | 0;
  s = `background-size:${ATLAS.cols * 100}% ${ATLAS.rows * 100}%;background-position:${col / (ATLAS.cols - 1) * 100}% ${row / Math.max(1, ATLAS.rows - 1) * 100}%`;
  ATLAS.style.set(id, s); return s;
}
setTimeout(buildAtlas, 300);
// Brillo (para luces de noche)
const glowSprite = (() => {
  const s = mkCanvas(128, 128), c = s.getContext('2d'), g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.5, 'rgba(0,0,0,.7)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128); return s;
})();
const warmGlow = (() => {
  const s = mkCanvas(128, 128), c = s.getContext('2d'), g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,200,110,.35)'); g.addColorStop(1, 'rgba(255,170,60,0)');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128); return s;
})();
