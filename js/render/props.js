'use strict';
// =====================================================================================
//  Dibujo propio para muebles, luces, paredes y adornos (antes salían como una caja con
//  un símbolo) y una carcasa de máquina más detallada para el resto. Las luces (antorcha,
//  velas, lámparas, hoguera, chimenea…) tienen llama animada y ahora SÍ alumbran.
// =====================================================================================
// Luces sin interruptor: siempre encendidas (antes litOf las daba por apagadas y no alumbraban)
const LIT_SWITCH = new Set(['lamp', 'furnace', 'efurnace', 'blastFurnace', 'elamp', 'combGen', 'gasGen', 'boiler', 'geotherm', 'reactor', 'voidGen', 'chronoAccel', 'welder', 'laserEngraver', 'arcaneForge', 'plasmaFuser', 'collider', 'alloySmelter', 'cryoChamber', 'distiller', 'chronoForge', 'transmuter', 'grower']);
{ const l0 = litOf; litOf = b => { if (LIT_SWITCH.has(b.type)) return l0(b); const d = BD[b.type]; return !!(d && d.light) && !b.off; }; }
// ---------- Ayudas de dibujo (espacio de -16 a 16) ----------
const pr = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const pline = (c, x0, y0, x1, y1, col, w = 1) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
const prr = (c, x, y, w, h, r, col, st) => { c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = col; c.fill(); if (st) { c.strokeStyle = st; c.lineWidth = 1; c.stroke(); } };
const pell = (c, x, y, rx, ry, col) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fillStyle = col; c.fill(); };
const shadowUnder = (c, w = 12, y = 13) => pell(c, 0, y, w, 3, 'rgba(0,0,0,.28)');
const OL = 'rgba(0,0,0,.55)';
function woodTex(c, x, y, w, h, col) { pr(c, x, y, w, h, col); for (let i = 1; i < h / 4; i++) pr(c, x, y + i * 4, w, 1, shade(col, -0.18)); pr(c, x, y, w, 1, shade(col, 0.25)); c.strokeStyle = OL; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
// Llama animada (t en segundos)
function flame(c, x, y, s, t, seed = 0) {
  const f = 1 + Math.sin(t * 11 + seed) * 0.12 + Math.sin(t * 17 + seed * 2) * 0.08, sw = Math.sin(t * 7 + seed) * 0.8;
  c.save(); c.translate(x, y); c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(0, -s * 0.4, 0, 0, -s * 0.4, s * 2.4); g.addColorStop(0, 'rgba(255,190,90,.45)'); g.addColorStop(1, 'rgba(255,120,40,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, -s * 0.4, s * 2.4, 0, 7); c.fill();
  c.globalCompositeOperation = 'source-over';
  c.beginPath(); c.moveTo(-s * 0.55, 0); c.quadraticCurveTo(-s * 0.6 + sw, -s * f, sw * 1.2, -s * 1.7 * f); c.quadraticCurveTo(s * 0.6 + sw, -s * f, s * 0.55, 0); c.closePath(); c.fillStyle = '#ff8a2a'; c.fill();
  c.beginPath(); c.moveTo(-s * 0.3, 0); c.quadraticCurveTo(-s * 0.3 + sw, -s * 0.6 * f, sw, -s * 1.05 * f); c.quadraticCurveTo(s * 0.3 + sw, -s * 0.6 * f, s * 0.3, 0); c.closePath(); c.fillStyle = '#ffe08a'; c.fill();
  c.restore();
}
const T_NOW = () => performance.now() / 1000;
// ---------- Familias de dibujo ----------
const PROP = {
  wall: (c, col, id) => { const stone = /stone|brick/i.test(id); pr(c, -16, -16, 32, 32, col);
    if (stone) { for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) { const x = -16 + k * 12 + (r & 1 ? 6 : 0), y = -16 + r * 8; prr(c, x + 0.5, y + 0.5, 11, 7, 1, shade(col, ((r * 3 + k) % 3 - 1) * 0.07), 'rgba(0,0,0,.35)'); } }
    else { for (let k = 0; k < 4; k++) { pr(c, -16 + k * 8, -16, 8, 32, shade(col, (k % 2 ? -0.06 : 0.04))); pr(c, -16 + k * 8, -16, 1, 32, shade(col, -0.3)); } for (let k = 0; k < 4; k++) pr(c, -14 + k * 8, -12 + (k % 2) * 14, 2, 2, shade(col, -0.45)); }
    pr(c, -16, -16, 32, 2, shade(col, 0.25)); pr(c, -16, 12, 32, 4, shade(col, -0.35)); },
  door: (c, col) => { pr(c, -16, -16, 32, 32, shade(col, -0.45)); woodTex(c, -11, -14, 22, 29, col); pr(c, -11, -2, 22, 2, shade(col, -0.3)); pell(c, 6, 2, 1.8, 1.8, '#e0c060'); },
  table: (c, col) => { shadowUnder(c, 14); pr(c, -12, -2, 3, 14, shade(col, -0.3)); pr(c, 9, -2, 3, 14, shade(col, -0.3)); woodTex(c, -15, -9, 30, 9, col); },
  counter: (c, col) => { shadowUnder(c, 15); pr(c, -15, -6, 30, 19, shade(col, -0.2)); pr(c, -15, -10, 30, 5, shade(col, 0.2)); for (const x of [-12, 2]) { pr(c, x, -2, 11, 13, shade(col, -0.32)); pr(c, x + 4, 3, 3, 1, '#d8d0c0'); } },
  chair: (c, col) => { shadowUnder(c, 9); pr(c, -7, -14, 14, 11, shade(col, -0.1)); pr(c, -7, -3, 14, 5, col); pr(c, -7, 2, 2, 10, shade(col, -0.3)); pr(c, 5, 2, 2, 10, shade(col, -0.3)); pr(c, -7, -14, 14, 2, shade(col, 0.2)); },
  stool: (c, col) => { shadowUnder(c, 8); pr(c, -6, -1, 2, 12, shade(col, -0.3)); pr(c, 4, -1, 2, 12, shade(col, -0.3)); pell(c, 0, -3, 9, 4, col); pell(c, 0, -4, 7, 2.5, shade(col, 0.2)); },
  sofa: (c, col) => { shadowUnder(c, 15); prr(c, -16, -10, 32, 14, 4, shade(col, -0.15), OL); prr(c, -16, -1, 32, 12, 3, col, OL); prr(c, -16, -6, 6, 16, 3, shade(col, -0.1), OL); prr(c, 10, -6, 6, 16, 3, shade(col, -0.1), OL); pr(c, -9, 1, 18, 1, shade(col, -0.3)); },
  bench: (c, col) => { shadowUnder(c, 15); for (let i = 0; i < 3; i++) woodTex(c, -15, -8 + i * 5, 30, 4, col); pr(c, -13, 7, 3, 7, '#4a4a4a'); pr(c, 10, 7, 3, 7, '#4a4a4a'); },
  bed: (c, col) => { shadowUnder(c, 13, 15); woodTex(c, -13, -16, 26, 32, '#7a5232'); prr(c, -11, -14, 22, 28, 2, col, OL); prr(c, -9, -13, 18, 7, 3, '#f4f0e8', OL); pr(c, -11, -3, 22, 2, shade(col, 0.2)); },
  hammock: (c, col) => { pline(c, -16, -10, -12, -6, '#8a6a42', 2); pline(c, 16, -10, 12, -6, '#8a6a42', 2); c.beginPath(); c.moveTo(-12, -6); c.quadraticCurveTo(0, 14, 12, -6); c.quadraticCurveTo(0, 4, -12, -6); c.fillStyle = col; c.fill(); c.strokeStyle = OL; c.stroke(); },
  shelf: (c, col, id) => { shadowUnder(c, 14, 15); pr(c, -14, -16, 28, 31, shade(col, -0.25)); c.strokeStyle = OL; c.strokeRect(-13.5, -15.5, 27, 30);
    const fill = /book|case/.test(id) ? ['#b03a3a', '#3a6ab0', '#3a9a4a', '#c8a040', '#7a3aa0'] : /alchem/.test(id) ? ['#7af0ff', '#e07ae0', '#7ae07a', '#ffd34a'] : /herb/.test(id) ? ['#4a8a3a', '#6aa04a', '#8ab060'] : /wine/.test(id) ? ['#6a1a3a', '#3a1a2a'] : /kitchen/.test(id) ? ['#b8784a', '#f4f6f8', '#c8a060'] : /weapon/.test(id) ? ['#c8ccd0', '#9aa0a8'] : ['#c8a040'];
    for (let r = 0; r < 3; r++) { pr(c, -13, -6 + r * 10, 26, 2, shade(col, 0.15)); for (let i = 0; i < 6; i++) { const h = 5 + ((i * 7 + r * 3) % 4); pr(c, -12 + i * 4, -6 + r * 10 - h, 3, h, fill[(i + r) % fill.length]); } } },
  wardrobe: (c, col) => { shadowUnder(c, 14, 15); woodTex(c, -13, -16, 26, 31, col); pline(c, 0, -15, 0, 14, shade(col, -0.45)); pell(c, -2.5, 0, 1.2, 1.2, '#e0c060'); pell(c, 2.5, 0, 1.2, 1.2, '#e0c060'); },
  dresser: (c, col) => { shadowUnder(c, 14); woodTex(c, -14, -10, 28, 23, col); for (let i = 0; i < 3; i++) { pr(c, -12, -7 + i * 7, 24, 1, shade(col, -0.4)); pr(c, -2, -5 + i * 7, 4, 1.5, '#e0c060'); } },
  cabinet: (c, col) => { shadowUnder(c, 13, 15); woodTex(c, -12, -16, 24, 31, col); pr(c, -9, -13, 18, 22, 'rgba(180,220,240,.55)'); pr(c, -9, -3, 18, 1, shade(col, -0.2)); for (const [x, y, k] of [[-6, -8, '#e8c0d0'], [3, -8, '#c8ccd0'], [-2, 3, '#ffd34a']]) pell(c, x, y, 2, 2, k); },
  torch: (c, col) => { pr(c, -1.5, -4, 3, 16, '#6a4a2a'); pr(c, -1.5, -4, 1, 16, '#8a6a42'); pr(c, -2.5, -6, 5, 3, '#3a2a1a'); },
  candle: (c, col) => { pell(c, 0, 10, 6, 2, '#c8a040'); pr(c, -2.5, -4, 5, 14, col); pr(c, -2.5, -4, 1.5, 14, shade(col, 0.3)); pline(c, 0, -4, 0, -6, '#2a2a2a'); },
  candelabra: (c, col) => { pr(c, -1, -2, 2, 13, col); pr(c, -9, -4, 18, 2, col); for (const x of [-8, 0, 8]) { pr(c, x - 1.5, -10, 3, 6, '#f0e8c8'); } pell(c, 0, 12, 5, 2, shade(col, -0.2)); },
  chandelier: (c, col) => { pline(c, 0, -16, 0, -6, '#6a5a3a'); pell(c, 0, -4, 11, 3, col); for (const x of [-10, -3, 4, 10]) pr(c, x - 1, -9, 2, 4, '#f0e8c8'); for (let i = 0; i < 5; i++) pell(c, -8 + i * 4, 0, 1, 2, 'rgba(200,230,255,.7)'); },
  floorLamp: (c, col) => { shadowUnder(c, 6); pr(c, -1, -6, 2, 18, '#5a5e66'); pell(c, 0, 12, 5, 2, '#5a5e66'); c.beginPath(); c.moveTo(-7, -6); c.lineTo(-4, -15); c.lineTo(4, -15); c.lineTo(7, -6); c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = OL; c.stroke(); },
  streetLamp: (c, col) => { shadowUnder(c, 6, 15); pr(c, -1.5, -10, 3, 25, '#3a3e46'); pr(c, -5, -15, 10, 6, '#3a3e46'); pr(c, -4, -14, 8, 4, 'rgba(255,230,160,.9)'); pell(c, 0, 14, 6, 2, '#3a3e46'); },
  paperLantern: (c, col) => { pline(c, 0, -16, 0, -11, '#6a4a2a'); pell(c, 0, -2, 9, 10, col); for (let i = -1; i <= 1; i++) pline(c, -9, -2 + i * 5, 9, -2 + i * 5, shade(col, -0.25)); pr(c, -4, -12, 8, 2, '#3a2a1a'); pr(c, -4, 7, 8, 2, '#3a2a1a'); },
  campfire: (c) => { pell(c, 0, 6, 13, 5, 'rgba(0,0,0,.3)'); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; pell(c, Math.cos(a) * 11, 6 + Math.sin(a) * 4, 3, 2.4, '#7a7a76'); } c.save(); c.translate(0, 4); for (const a of [-0.5, 0.5, 0]) { c.save(); c.rotate(a); pr(c, -10, -1.5, 20, 3, '#6a4a2a'); c.restore(); } c.restore(); pell(c, 0, 4, 5, 2, '#ff6a1a'); },
  fireplace: (c, col) => { pr(c, -16, -16, 32, 32, col); for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) prr(c, -16 + k * 12 + (r & 1 ? 6 : 0) + 0.5, -16 + r * 8 + 0.5, 11, 7, 1, shade(col, ((r + k) % 3 - 1) * 0.08), 'rgba(0,0,0,.3)'); pr(c, -9, -2, 18, 14, '#1a1210'); pr(c, -12, -6, 24, 4, shade(col, 0.15)); for (const x of [-5, 1]) pr(c, x, 9, 6, 2, '#6a4a2a'); },
  stove: (c, col) => { shadowUnder(c, 14); prr(c, -14, -10, 28, 24, 2, col, OL); pr(c, -14, -12, 28, 3, shade(col, 0.2)); pr(c, -9, -2, 18, 10, '#1a1210'); for (const x of [-7, 7]) pell(c, x, -11, 3.5, 1.4, '#2a2a2a'); pr(c, 9, -16, 4, 6, shade(col, -0.2)); },
  rug: (c, col, id) => { const fur = /fur/.test(id); prr(c, -15, -11, 30, 22, fur ? 9 : 2, col, OL); if (!fur) { prr(c, -11, -7, 22, 14, 1, shade(col, -0.2)); prr(c, -6, -3, 12, 6, 1, shade(col, 0.2)); for (let i = 0; i < 6; i++) { pr(c, -15 + i * 6, 11, 1, 3, shade(col, 0.3)); pr(c, -15 + i * 6, -14, 1, 3, shade(col, 0.3)); } } else for (let i = 0; i < 12; i++) pline(c, -12 + (i * 7 % 24), -8 + (i * 5 % 16), -10 + (i * 7 % 24), -6 + (i * 5 % 16), shade(col, -0.2)); },
  painting: (c, col) => { pr(c, -13, -12, 26, 20, '#a07a3a'); pr(c, -11, -10, 22, 16, '#8ac0e8'); pr(c, -11, -1, 22, 7, '#5a9a4a'); pell(c, 5, -5, 3, 3, '#ffd34a'); c.beginPath(); c.moveTo(-11, 2); c.lineTo(-4, -6); c.lineTo(3, 2); c.fillStyle = '#7a8a9a'; c.fill(); c.strokeStyle = OL; c.strokeRect(-12.5, -11.5, 25, 19); },
  banner: (c, col) => { pr(c, -1, -16, 2, 30, '#6a4a2a'); pr(c, -10, -15, 20, 2, '#6a4a2a'); c.beginPath(); c.moveTo(-9, -13); c.lineTo(9, -13); c.lineTo(9, 8); c.lineTo(0, 3); c.lineTo(-9, 8); c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = OL; c.stroke(); pell(c, 0, -5, 3, 3, shade(col, 0.4)); },
  curtains: (c, col) => { pr(c, -16, -15, 32, 2, '#6a4a2a'); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 2, -13); c.lineTo(s * 15, -13); c.lineTo(s * 15, 14); c.quadraticCurveTo(s * 8, 10, s * 4, 14); c.closePath(); c.fillStyle = col; c.fill(); for (let i = 0; i < 3; i++) pline(c, s * (6 + i * 3), -12, s * (6 + i * 3), 12, shade(col, -0.25)); } },
  stainedGlass: (c) => { pr(c, -14, -15, 28, 30, '#2a2a2a'); const cols = ['#e04848', '#4a8ae0', '#e0c040', '#4ab060', '#a04ae0']; for (let i = 0; i < 9; i++) pr(c, -12 + (i % 3) * 8.5, -13 + Math.floor(i / 3) * 9, 7.5, 8, cols[(i * 2) % 5]); },
  plant: (c, col, id) => { shadowUnder(c, 8); c.beginPath(); c.moveTo(-7, 3); c.lineTo(7, 3); c.lineTo(5, 13); c.lineTo(-5, 13); c.closePath(); c.fillStyle = /vase/.test(id) ? '#e8eef4' : '#b8784a'; c.fill(); c.strokeStyle = OL; c.stroke(); pr(c, -8, 2, 16, 2, /vase/.test(id) ? '#c8d0d8' : '#8a5232');
    if (/cactus/.test(id)) { prr(c, -3, -12, 6, 15, 3, '#5a9a4a', OL); prr(c, 3, -7, 5, 3, 1.5, '#5a9a4a'); prr(c, 6, -11, 3, 6, 1.5, '#5a9a4a'); }
    else if (/palm/.test(id)) { pr(c, -1, -8, 2, 11, '#8a6a42'); for (let i = 0; i < 5; i++) { c.save(); c.translate(0, -9); c.rotate(-1.2 + i * 0.6); pell(c, 7, 0, 7, 2, '#3a8a3a'); c.restore(); } }
    else if (/bonsai/.test(id)) { pline(c, 0, 3, -2, -5, '#6a4a2a', 2); pline(c, -2, -5, 4, -8, '#6a4a2a', 1.5); pell(c, -5, -7, 6, 4, '#3a7a3a'); pell(c, 5, -10, 5, 3.5, '#4a8a3a'); }
    else if (/flower|vase/.test(id)) { for (let i = 0; i < 6; i++) { const x = -6 + i * 2.4, y = -6 - (i % 3) * 3; pline(c, 0, 3, x, y, '#3e7a34'); pell(c, x, y, 2.4, 2.4, ['#f4e04a', '#e84a6a', '#f4f4f4', '#7a6ae8', '#f49a3a'][i % 5]); } }
    else { for (let i = 0; i < 7; i++) { c.save(); c.translate(0, 3); c.rotate(-1.4 + i * 0.47); pell(c, 0, -8, 2.5, 8, i % 2 ? '#3a8a3a' : '#4aa04a'); c.restore(); } } },
  water: (c, col, id) => { shadowUnder(c, 14, 14);
    if (/well/.test(id)) { pell(c, 0, 4, 13, 9, '#7a7a76'); pell(c, 0, 3, 9, 6, '#2a4a7a'); pr(c, -12, -14, 2, 18, '#6a4a2a'); pr(c, 10, -14, 2, 18, '#6a4a2a'); c.beginPath(); c.moveTo(-15, -12); c.lineTo(0, -18); c.lineTo(15, -12); c.fillStyle = '#8a3a2a'; c.fill(); pline(c, 0, -12, 0, 1, '#c8a870'); }
    else if (/aquarium/.test(id)) { prr(c, -14, -10, 28, 22, 2, 'rgba(90,170,230,.55)', '#c8d8e8'); pr(c, -14, 8, 28, 4, '#c8b080'); pell(c, -4, -2, 4, 2, '#ff8a3a'); pell(c, 6, 3, 3, 1.6, '#ffd34a'); pline(c, 9, 8, 9, -4, '#3a8a3a', 2); }
    else if (/bath/.test(id)) { prr(c, -15, -8, 30, 20, 8, col, OL); pell(c, 0, 0, 12, 6, '#8ac8ff'); pr(c, 10, -12, 3, 5, '#c8ccd0'); }
    else if (/sink/.test(id)) { prr(c, -13, -4, 26, 14, 3, col, OL); pell(c, 0, 2, 9, 4, '#8ac8ff'); pr(c, -1, -12, 2, 8, '#c8ccd0'); pr(c, -1, -12, 5, 2, '#c8ccd0'); }
    else { pell(c, 0, 6, 14, 7, '#9a9a96'); pell(c, 0, 5, 11, 5, '#6ab0e0'); pr(c, -2, -10, 4, 15, '#a8a8a4'); pell(c, 0, -10, 6, 3, '#9a9a96'); if (/fountain/.test(id)) pell(c, 0, -12, 3, 2, '#8ad0ff'); } },
  statue: (c, col, id) => { shadowUnder(c, 10, 14); pr(c, -9, 6, 18, 8, shade(col, -0.2)); if (/gnome/.test(id)) { pell(c, 0, 0, 6, 7, '#3a6ab0'); pell(c, 0, -6, 4, 4, '#f0c8a0'); c.beginPath(); c.moveTo(-5, -8); c.lineTo(0, -18); c.lineTo(5, -8); c.fillStyle = col; c.fill(); pell(c, 0, -3, 3, 2.5, '#f4f4f4'); }
    else { pell(c, 0, -9, 5, 5, col); prr(c, -6, -5, 12, 12, 3, col); if (!/bust/.test(id)) { pr(c, -8, -4, 3, 9, col); pr(c, 5, -4, 3, 9, col); } pell(c, -2, -10, 1, 1, shade(col, -0.4)); pell(c, 2, -10, 1, 1, shade(col, -0.4)); } },
  barrel: (c, col) => { shadowUnder(c, 11, 14); prr(c, -10, -13, 20, 26, 5, col, OL); for (const y of [-8, 6]) pr(c, -10, y, 20, 2, '#5a5e66'); for (let i = -1; i <= 1; i++) pline(c, i * 5, -12, i * 5, 12, shade(col, -0.25)); pell(c, 0, -12, 9, 2.5, shade(col, 0.2)); },
  crate: (c, col) => { shadowUnder(c, 13); woodTex(c, -13, -13, 26, 26, col); pline(c, -12, -12, 12, 12, shade(col, -0.35), 2); pline(c, 12, -12, -12, 12, shade(col, -0.35), 2); },
  hay: (c, col) => { shadowUnder(c, 14); prr(c, -14, -10, 28, 22, 4, col, OL); for (let i = 0; i < 12; i++) pline(c, -12 + i * 2.2, -8 + (i % 3), -11 + i * 2.2, 10 - (i % 2), shade(col, -0.2)); pr(c, -14, -2, 28, 2, '#8a6a42'); },
  instrument: (c, col, id) => { shadowUnder(c, 14);
    if (/piano/.test(id)) { prr(c, -15, -12, 30, 22, 2, col, OL); pr(c, -13, -2, 26, 6, '#f4f4f0'); for (let i = 0; i < 8; i++) pr(c, -12 + i * 3.4, -2, 1.6, 3.5, '#1a1a1a'); }
    else if (/drum/.test(id)) { pell(c, 0, 4, 11, 8, col); pell(c, 0, -2, 11, 4, '#f0e8d8'); pline(c, -11, -2, -11, 4, OL); pline(c, 11, -2, 11, 4, OL); pline(c, -8, -10, 2, -4, '#c8a870', 1.5); }
    else if (/lute/.test(id)) { pell(c, -3, 4, 8, 9, col); pr(c, 3, -14, 3, 16, shade(col, -0.2)); pell(c, -3, 4, 2.5, 2.5, '#2a1a10'); }
    else { c.beginPath(); c.moveTo(-10, 12); c.quadraticCurveTo(-12, -14, 10, -14); c.lineTo(10, 12); c.closePath(); c.strokeStyle = col; c.lineWidth = 3; c.stroke(); c.lineWidth = 1; for (let i = 0; i < 6; i++) pline(c, -6 + i * 3, -10 + i, -6 + i * 3, 11, '#f0e8c8'); } },
  clock: (c, col, id) => { if (/grand/.test(id)) { shadowUnder(c, 8, 15); woodTex(c, -8, -16, 16, 31, col); pell(c, 0, -8, 5.5, 5.5, '#f4f0e4'); } else pell(c, 0, -2, 11, 11, col); const cy = /grand/.test(id) ? -8 : -2, r = /grand/.test(id) ? 5 : 9; pell(c, 0, cy, r, r, '#f4f0e4'); pline(c, 0, cy, 0, cy - r * 0.7, '#2a2a2a', 1.2); pline(c, 0, cy, r * 0.5, cy, '#2a2a2a', 1.2); },
  misc: (c, col, id) => { shadowUnder(c, 10);
    if (/globe/.test(id)) { pr(c, -1, 4, 2, 8, '#a08040'); pell(c, 0, 12, 6, 2, '#a08040'); pell(c, 0, -4, 9, 9, '#3a7ac8'); pell(c, -3, -6, 4, 3, '#4aa04a'); pell(c, 4, -1, 3, 2, '#4aa04a'); }
    else if (/telescope/.test(id)) { pline(c, -6, 13, 0, 0, '#5a4a3a', 1.5); pline(c, 6, 13, 0, 0, '#5a4a3a', 1.5); c.save(); c.rotate(-0.6); prr(c, -4, -3, 22, 6, 2, col, OL); c.restore(); }
    else if (/mirror/.test(id)) { prr(c, -8, -15, 16, 26, 7, '#8a6a42'); prr(c, -6, -13, 12, 22, 6, '#c8e0f0'); pline(c, -3, -9, 2, -3, '#ffffff', 1.5); }
    else if (/mailbox/.test(id)) { pr(c, -1, 0, 2, 13, '#6a4a2a'); prr(c, -8, -10, 16, 10, 5, col, OL); pr(c, 6, -12, 2, 6, '#ffd34a'); }
    else if (/sign/.test(id)) { pr(c, -1, -6, 2, 19, '#6a4a2a'); c.beginPath(); c.moveTo(-12, -12); c.lineTo(9, -12); c.lineTo(13, -8); c.lineTo(9, -4); c.lineTo(-12, -4); c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = OL; c.stroke(); }
    else if (/flag/.test(id)) { pr(c, -8, -16, 2, 30, '#c8ccd0'); c.beginPath(); c.moveTo(-6, -15); c.quadraticCurveTo(2, -17, 12, -13); c.lineTo(12, -5); c.quadraticCurveTo(2, -9, -6, -6); c.closePath(); c.fillStyle = '#c03a3a'; c.fill(); }
    else if (/coat/.test(id)) { pr(c, -1, -14, 2, 27, '#7a5232'); pline(c, 0, -12, -7, -9, '#7a5232', 2); pline(c, 0, -12, 7, -9, '#7a5232', 2); pell(c, 0, 12, 6, 2, '#7a5232'); prr(c, -9, -9, 7, 12, 2, '#5a6a8a'); }
    else if (/doll/.test(id)) { pr(c, -12, -2, 24, 15, '#f4e0e0'); c.beginPath(); c.moveTo(-14, -2); c.lineTo(0, -14); c.lineTo(14, -2); c.fillStyle = col; c.fill(); pr(c, -8, 2, 5, 5, '#8ac8ff'); pr(c, 3, 4, 5, 9, '#8a5a3a'); }
    else if (/chime/.test(id)) { pr(c, -8, -14, 16, 2, '#8a6a42'); for (let i = 0; i < 4; i++) { pline(c, -6 + i * 4, -12, -6 + i * 4, -6 + i * 2, '#c8a870'); pr(c, -7 + i * 4, -6 + i * 2, 2, 8, col); } }
    else if (/dream/.test(id)) { c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(0, -4, 9, 0, 7); c.stroke(); c.lineWidth = 0.6; for (let i = 0; i < 6; i++) pline(c, 0, -4, Math.cos(i) * 9, -4 + Math.sin(i) * 9, '#e8e0d0', 0.6); for (const x of [-5, 0, 5]) { pline(c, x, 5, x, 11, '#c8a080'); pell(c, x, 12, 1.5, 2.5, '#f4f0ec'); } c.lineWidth = 1; }
    else if (/cage/.test(id)) { pell(c, 0, 12, 8, 2, col); c.beginPath(); c.moveTo(-8, 11); c.lineTo(-8, -6); c.quadraticCurveTo(0, -16, 8, -6); c.lineTo(8, 11); c.strokeStyle = col; c.stroke(); for (let i = -1; i <= 1; i++) pline(c, i * 4, -10, i * 4, 11, col); pell(c, 0, 4, 3, 2.5, '#f0c040'); }
    else if (/tea/.test(id)) { pell(c, 0, 8, 13, 4, '#d8d0c0'); pell(c, -4, 2, 6, 5, col); pr(c, 1, 0, 6, 1.5, col); pell(c, 7, 5, 3, 2, col); pell(c, -10, 6, 2.5, 2, col); }
    else if (/trophy/.test(id)) { woodTex(c, -12, 0, 24, 13, '#8a6a42'); c.beginPath(); c.moveTo(-6, -12); c.lineTo(6, -12); c.lineTo(3, -3); c.lineTo(-3, -3); c.closePath(); c.fillStyle = col; c.fill(); pr(c, -1, -3, 2, 3, col); pr(c, -4, 0, 8, 1.5, col); }
    else if (/shield/.test(id)) { woodTex(c, -13, -14, 26, 27, '#7a5232'); c.beginPath(); c.moveTo(-8, -10); c.lineTo(8, -10); c.lineTo(8, 0); c.quadraticCurveTo(0, 10, -8, 0); c.closePath(); c.fillStyle = '#b8bcc4'; c.fill(); c.strokeStyle = OL; c.stroke(); pline(c, -10, -12, 10, 10, '#c8ccd0', 2); }
    else if (/sundial/.test(id)) { pell(c, 0, 4, 12, 7, '#a8a8a4'); pell(c, 0, 3, 10, 5.5, col); c.beginPath(); c.moveTo(0, 3); c.lineTo(0, -9); c.lineTo(5, 3); c.fillStyle = shade(col, -0.3); c.fill(); }
    else if (/map/.test(id)) { PROP.table(c, '#8a6a42'); pr(c, -12, -11, 24, 7, '#e8d8a8'); pline(c, -8, -8, 6, -6, '#c03a3a'); }
    else if (/anvil/.test(id)) { pr(c, -5, 2, 10, 10, '#4a4a4a'); prr(c, -12, -6, 24, 8, 2, '#5a5e66', OL); c.beginPath(); c.moveTo(12, -6); c.lineTo(16, -4); c.lineTo(12, -2); c.fillStyle = '#5a5e66'; c.fill(); pr(c, -10, -6, 20, 2, '#8a8e96'); }
    else if (/kennel/.test(id)) { pr(c, -12, -4, 24, 17, col); c.beginPath(); c.moveTo(-14, -4); c.lineTo(0, -15); c.lineTo(14, -4); c.fillStyle = shade(col, -0.25); c.fill(); prr(c, -5, 2, 10, 11, 5, '#1a1210'); }
    else if (/scarecrow/.test(id)) { pr(c, -1, -10, 2, 24, '#6a4a2a'); pr(c, -12, -6, 24, 2, '#6a4a2a'); prr(c, -6, -6, 12, 12, 2, '#6a8a3a'); pell(c, 0, -11, 5, 5, '#d8c080'); pr(c, -7, -15, 14, 2, '#8a6a42'); pr(c, -4, -18, 8, 4, '#8a6a42'); }
    else if (/totem|altar|beacon/.test(id)) { prr(c, -7, -15, 14, 28, 3, col, OL); pell(c, 0, -8, 3, 2, '#ffd34a'); pell(c, 0, 0, 3, 2, '#ffd34a'); pr(c, -9, 10, 18, 4, shade(col, -0.3)); }
    else if (/spike/.test(id)) { pr(c, -14, 6, 28, 6, '#5a5e66'); for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-13 + i * 6, 6); c.lineTo(-10 + i * 6, -8); c.lineTo(-7 + i * 6, 6); c.fillStyle = '#c8ccd0'; c.fill(); } }
    else { prr(c, -10, -10, 20, 20, 3, col, OL); } },
};
// Qué familia usa cada bloque
const PROP_OF = {
  woodWall: 'wall', stoneWall: 'wall', logWall: 'wall', door: 'door',
  table: 'table', desk: 'table', nightstand: 'table', mapTable: 'misc', kitchenCounter: 'counter',
  chair: 'chair', stool: 'stool', armchair: 'sofa', sofa: 'sofa', parkBench: 'bench', bed: 'bed', hammock: 'hammock',
  bookshelf: 'shelf', bookcase: 'shelf', kitchenShelf: 'shelf', alchemyShelf: 'shelf', herbRack: 'shelf', herbDryer: 'shelf', wineRack: 'shelf', weaponRack: 'shelf',
  wardrobe: 'wardrobe', dresser: 'dresser', cabinet: 'cabinet',
  torch: 'torch', candle: 'candle', candelabra: 'candelabra', chandelier: 'chandelier', floorLamp: 'floorLamp', streetLamp: 'streetLamp', paperLantern: 'paperLantern',
  campfire: 'campfire', fireplace: 'fireplace', woodStove: 'stove',
  rug: 'rug', rugRed: 'rug', rugBlue: 'rug', furRug: 'rug', painting: 'painting', pictureFrame: 'painting', tapestry: 'banner', curtains: 'curtains', stainedGlass: 'stainedGlass',
  bannerRed: 'banner', bannerBlue: 'banner', bannerGreen: 'banner',
  flowerPot: 'plant', pottedFern: 'plant', pottedPalm: 'plant', pottedCactus: 'plant', bonsai: 'plant', flowerVase: 'plant',
  well: 'water', fountain: 'water', birdbath: 'water', aquarium: 'water', bathtub: 'water', sink: 'water',
  statue: 'statue', bust: 'statue', gardenGnome: 'statue',
  barrel: 'barrel', crate: 'crate', haybale: 'hay', piano: 'instrument', drum: 'instrument', lute: 'instrument', harp: 'instrument',
  grandClock: 'clock', wallClock: 'clock', chainLamp: 'streetLamp', solarLamp: 'floorLamp', photonLamp: 'floorLamp', concreteBench: 'bench', panRack: 'shelf', windVane: 'misc', toyTrain: 'misc', radioDeco: 'misc',
  globeDeco: 'misc', telescopeDeco: 'misc', standMirror: 'misc', mailbox: 'misc', signpost: 'misc', flagPole: 'misc', coatRack: 'misc', dollhouse: 'misc', windChime: 'misc', dreamcatcher: 'misc', birdcage: 'misc', teaSet: 'misc', trophyStand: 'misc', shieldDisplay: 'misc', sundial: 'misc', anvil: 'misc', kennel: 'misc', scarecrow: 'misc', wardTotem: 'misc', altar: 'misc', holyBeacon: 'misc', spikeTrap: 'misc',
};
// Llama de cada luz (posición relativa y tamaño)
const FLAMES = { torch: [[0, -6, 3.2]], candle: [[0, -6, 2.2]], candelabra: [[-8, -10, 2], [0, -10, 2], [8, -10, 2]], chandelier: [[-10, -9, 1.6], [-3, -9, 1.6], [4, -9, 1.6], [10, -9, 1.6]], campfire: [[-3, 4, 5], [3, 4, 4]], fireplace: [[0, 9, 5]], woodStove: [[0, 6, 3.5]] };
for (const id in PROP_OF) {
  const d = BD[id]; if (!d) continue; const fam = PROP[PROP_OF[id]], col = (d.look && d.look.c) || '#9a7448', fl = FLAMES[id], glowy = d.light && !fl;
  DRAW[id] = {
    k: () => '', b: (c) => fam(c, col, id),
    a: fl || glowy ? (c, b) => { const t = T_NOW(); if (fl) fl.forEach(([x, y, s], i) => flame(c, x, y, s, t, b.x * 3 + b.y * 7 + i));
      else { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(0, -6, 0, 0, -6, 18); g.addColorStop(0, `rgba(255,220,150,${0.32 + Math.sin(t * 2 + b.x) * 0.05})`); g.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = g; c.fillRect(-20, -24, 40, 40); c.restore(); } } : null,
  };
}
// ---------- Máquinas y demás con carcasa genérica: más detalle ----------
// (borde metálico con remaches, rejilla de ventilación y placa con su símbolo)
{
  for (const k in BD) {
    if (PROP_OF[k] || !DRAW[k] || !BD[k].look || BD[k].look.tex || BD[k].look.a === 'led') continue;
    const d = BD[k], L2 = d.look, dr = DRAW[k]; if (!String(dr.k).includes('litOf')) continue;
    const g0 = dr.b;
    dr.b = (c, b) => {
      const col = L2.c; prr(c, -15, -15, 30, 30, 4, shade(col, -0.35)); prr(c, -14, -14, 28, 27, 3, col, 'rgba(0,0,0,.55)');
      const gr = c.createLinearGradient(0, -14, 0, 13); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(0,0,0,.22)'); c.fillStyle = gr; c.fillRect(-14, -14, 28, 27);
      for (const [x, y] of [[-11, -11], [11, -11], [-11, 10], [11, 10]]) { pell(c, x, y, 1.3, 1.3, shade(col, -0.5)); pell(c, x - 0.4, y - 0.4, 0.6, 0.6, 'rgba(255,255,255,.5)'); }
      for (let i = 0; i < 4; i++) pr(c, -8 + i * 4.4, 8, 2.6, 3, 'rgba(0,0,0,.45)');
      prr(c, -8, -9, 16, 14, 2, 'rgba(0,0,0,.35)'); label(c, L2.g || '', -2, '#f4ead0', (L2.g || '').length > 1 ? 9 : 12);
      if (d.dir) dirArrow(c, b.dir);
      if (d.pw) pr(c, -13, 11, 4, 2, '#d9733a');
    };
  }
}
