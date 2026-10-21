'use strict';
// =====================================================================================
//  Estaciones de trabajo: cada máquina tiene su propia escena animada, su propia forma de
//  trabajar (gesto + giro) y sus propios eventos. Funciona mientras miras su panel:
//   · acertar el gesto → la pieza avanza un 35 %, sube la maestría y ganas experiencia
//   · maestría 100 → «obra maestra»: la siguiente pieza sale doble
//   · eventos: aparecen de vez en cuando; haz clic en el destello antes de que se apague
//  Sin mirar, la máquina sigue trabajando sola como siempre.
// =====================================================================================
const SW = 320, SH = 170;
const rnd = (a, b) => a + Math.random() * (b - a);
// ---------- Ayudas de dibujo ----------
const dr = {
  box(c, x, y, w, h, col, r = 3) { c.fillStyle = col; c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); c.fill(); },
  flame(c, x, y, s, t, col = '#ff8a2a') { for (let i = 0; i < 5; i++) { const k = Math.sin(t * 9 + i * 1.7) * 0.5 + 0.5; c.fillStyle = i % 2 ? col : '#ffd060'; c.beginPath(); c.ellipse(x + (i - 2) * s * 0.35, y - k * s * 0.5, s * 0.22, s * (0.5 + k * 0.4), 0, 0, 7); c.fill(); } },
  sparks(c, x, y, t, n = 8, col = '#ffd060') { c.fillStyle = col; for (let i = 0; i < n; i++) { const a = i * 2.4 + t * 3, d = ((t * 60 + i * 13) % 30); c.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d - d * 0.3, 2, 2); } },
  gear(c, x, y, r, n, a, col) { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = col; c.beginPath(); for (let i = 0; i < n * 2; i++) { const rr = i % 2 ? r : r * 0.8, aa = i / (n * 2) * Math.PI * 2; c.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } c.closePath(); c.fill(); c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(0, 0, r * 0.3, 0, 7); c.fill(); c.restore(); },
  bubbles(c, x, y, w, h, t, col, n = 10) { c.fillStyle = col; for (let i = 0; i < n; i++) { const yy = y + h - ((t * 30 + i * 37) % h), xx = x + (i * 53 % w) + Math.sin(t * 3 + i) * 3; c.beginPath(); c.arc(xx, yy, 1.5 + (i % 3), 0, 7); c.fill(); } },
  liquid(c, x, y, w, h, t, col) { c.fillStyle = col; c.beginPath(); c.moveTo(x, y + h); for (let i = 0; i <= w; i += 6) c.lineTo(x + i, y + Math.sin(t * 3 + i * 0.08) * 3); c.lineTo(x + w, y + h); c.fill(); },
  glow(c, x, y, r, col) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); },
  rays(c, x, y, r, n, t, col) { c.strokeStyle = col; c.lineWidth = 1.5; for (let i = 0; i < n; i++) { const a = i / n * 7 + t; c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.stroke(); } },
};
// ---------- Escenas: una por estación ----------
const SCENE = {
  furnace: (c, t, v) => { dr.box(c, 90, 40, 140, 110, '#5a3a2a'); dr.box(c, 115, 70, 90, 70, '#1a0e08'); dr.glow(c, 160, 115, 60 + v * 40, `rgba(255,${120 + v * 80 | 0},40,.6)`); dr.flame(c, 160, 135, 40 + v * 20, t); dr.box(c, 140, 95, 40, 22, '#7a7a80'); for (let i = 0; i < 6; i++) dr.box(c, 92 + i * 23, 40, 20, 8, '#7a4a32'); },
  millstone: (c, t) => { dr.box(c, 60, 120, 200, 30, '#6a5a3a'); c.save(); c.translate(160, 95); c.rotate(t * 1.5); dr.box(c, -50, -12, 100, 24, '#8a8682', 12); c.fillStyle = '#5a5652'; for (let i = -40; i < 40; i += 12) c.fillRect(i, -10, 2, 20); c.restore(); c.fillStyle = '#e8d8a0'; for (let i = 0; i < 20; i++) c.fillRect(70 + (i * 37 % 180), 128 + (i % 3) * 4, 3, 3); },
  crusher: (c, t) => { dr.gear(c, 125, 95, 38, 10, t * 2, '#7a7e86'); dr.gear(c, 195, 95, 38, 10, -t * 2 + 0.3, '#6a6e76'); c.fillStyle = '#9a8a7a'; for (let i = 0; i < 6; i++) { const y = (t * 40 + i * 25) % 70; c.beginPath(); c.arc(160 + Math.sin(i) * 8, y, 5, 0, 7); c.fill(); } dr.sparks(c, 160, 100, t, 6, '#c8b8a0'); },
  saw: (c, t) => { dr.box(c, 20, 100, 280, 26, '#a07848'); c.fillStyle = '#7a5a34'; for (let i = 0; i < 6; i++) c.fillRect(30 + i * 45, 104, 2, 18); dr.gear(c, 160, 90, 34, 24, t * 12, '#c8ccd4'); dr.sparks(c, 160, 115, t, 10, '#e8c890'); },
  press: (c, t, v) => { dr.box(c, 80, 20, 160, 16, '#5a5e66'); dr.box(c, 150, 36, 20, 30 + v * 50, '#9aa0a8'); dr.box(c, 120, 66 + v * 50, 80, 12, '#7a7e86'); dr.box(c, 100, 140, 120, 14, '#3a3e46'); dr.box(c, 115, 132, 90, 8, '#d8d8d8'); },
  lathe: (c, t, v) => { dr.box(c, 40, 80, 240, 30, '#4a4e56'); c.save(); c.translate(160, 95); c.scale(1, 1); for (let i = -90; i < 90; i += 10) { c.fillStyle = (i / 10 + Math.floor(t * 20 * (0.3 + v))) % 2 ? '#c8ccd4' : '#9aa0a8'; c.fillRect(i, -14, 10, 28); } c.restore(); dr.box(c, 150, 115, 12, 30, '#6a4a2a'); c.strokeStyle = '#e8d8a0'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(156 + i * 6, 120 + i * 5, 6, t * 5 + i, t * 5 + i + 3); c.stroke(); } },
  wiremill: (c, t) => { for (let i = 0; i < 3; i++) dr.box(c, 70 + i * 70, 70, 26, 50, '#5a5e66'); c.strokeStyle = '#e8894e'; c.lineWidth = 4; c.beginPath(); c.moveTo(20, 95); c.lineTo(300, 95); c.stroke(); dr.gear(c, 290, 95, 20, 8, t * 4, '#c8843a'); },
  mixer: (c, t) => { dr.box(c, 90, 60, 140, 90, '#7a7e86', 30); dr.liquid(c, 100, 85, 120, 60, t, '#8a7a5a'); c.strokeStyle = '#c8a070'; c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(160, 110, 10 + i * 12, t * 3 + i, t * 3 + i + 2.5); c.stroke(); } dr.box(c, 157, 20, 6, 80, '#9aa0a8'); },
  blast: (c, t, v) => { c.fillStyle = '#4a3a3a'; c.beginPath(); c.moveTo(110, 160); c.lineTo(130, 10); c.lineTo(190, 10); c.lineTo(210, 160); c.fill(); dr.glow(c, 160, 130, 70, `rgba(255,${90 + v * 100 | 0},20,.7)`); c.fillStyle = '#ff7a1a'; c.fillRect(205, 120, 70, 8); dr.flame(c, 160, 150, 34, t, '#ff5a1a'); c.fillStyle = '#aaa'; for (let i = 0; i < 6; i++) c.fillRect(150 + Math.sin(t + i) * 10, 10 - ((t * 20 + i * 8) % 30), 3, 3); },
  vulcan: (c, t) => { dr.box(c, 50, 70, 220, 70, '#2a2a2a', 8); dr.bubbles(c, 55, 70, 210, 70, t, '#e0c840', 14); c.fillStyle = 'rgba(200,200,200,.2)'; for (let i = 0; i < 5; i++) c.fillRect(60 + i * 45, 50 - ((t * 15 + i * 9) % 30), 18, 6); },
  refinery: (c, t) => { for (let i = 0; i < 3; i++) { dr.box(c, 70 + i * 70, 20 + i * 10, 30, 140 - i * 10, ['#7a7e86', '#6a6e76', '#5a5e66'][i]); c.fillStyle = ['#f0d070', '#c8843a', '#3a2a1a'][i]; c.fillRect(74 + i * 70, 150 - ((t * 30 + i * 20) % 120), 22, 4); } c.strokeStyle = '#3a3e46'; c.lineWidth = 3; c.beginPath(); c.moveTo(100, 60); c.lineTo(140, 60); c.moveTo(170, 80); c.lineTo(210, 80); c.stroke(); },
  electro: (c, t) => { dr.box(c, 70, 50, 180, 100, 'rgba(120,180,255,.25)', 6); dr.box(c, 110, 40, 10, 100, '#c84a3a'); dr.box(c, 200, 40, 10, 100, '#3a5ac8'); dr.bubbles(c, 105, 50, 20, 95, t, '#e8f4ff', 6); dr.bubbles(c, 195, 50, 20, 95, t * 1.4, '#ffe8e8', 4); c.strokeStyle = '#f0f05a'; c.beginPath(); c.moveTo(115, 40); c.lineTo(115, 20); c.lineTo(205, 20); c.lineTo(205, 40); c.stroke(); },
  digest: (c, t) => { dr.box(c, 80, 50, 160, 110, '#3a4a2a', 20); dr.liquid(c, 88, 70, 144, 85, t * 0.5, '#5a7a2a'); dr.bubbles(c, 90, 70, 140, 80, t * 0.7, '#9ac84a', 12); c.fillStyle = 'rgba(150,200,80,.3)'; for (let i = 0; i < 4; i++) c.beginPath(), c.arc(120 + i * 25, 40 - ((t * 10 + i * 7) % 20), 8, 0, 7), c.fill(); },
  orewasher: (c, t) => { c.save(); c.translate(160, 100); c.rotate(Math.sin(t * 4) * 0.15); c.fillStyle = '#5a5e66'; c.beginPath(); c.ellipse(0, 0, 90, 40, 0, 0, 7); c.fill(); dr.liquid(c, -80, -10, 160, 40, t, 'rgba(80,140,220,.7)'); c.fillStyle = '#ffd34a'; for (let i = 0; i < 6; i++) { c.globalAlpha = (Math.sin(t * 5 + i * 2) + 1) / 2; c.fillRect(-60 + i * 22, 5 + (i % 2) * 8, 3, 3); } c.globalAlpha = 1; c.restore(); },
  pulverizer: (c, t) => { for (let i = 0; i < 4; i++) { const y = 40 + Math.abs(Math.sin(t * 6 + i * 1.5)) * 50; dr.box(c, 80 + i * 45, 20, 8, y - 20, '#7a7e86'); dr.box(c, 70 + i * 45, y, 28, 18, '#9aa0a8'); } dr.box(c, 60, 130, 200, 20, '#5a4a3a'); c.fillStyle = 'rgba(220,220,200,.4)'; for (let i = 0; i < 12; i++) c.fillRect(70 + i * 16, 120 - (i * 7 + t * 20) % 20, 4, 4); },
  rolling: (c, t, v) => { dr.box(c, 20, 92, 280, 6 - v * 3, '#c8ccd4'); dr.gear(c, 160, 70, 22, 24, t * 3, '#7a7e86'); dr.gear(c, 160, 120, 22, 24, -t * 3, '#7a7e86'); c.fillStyle = '#e8ecf0'; c.fillRect(185, 93, 110, 2); },
  bender: (c, t, v) => { dr.box(c, 140, 100, 40, 40, '#5a5e66', 20); c.strokeStyle = '#b8bcc4'; c.lineWidth = 8; c.beginPath(); c.moveTo(40, 100); c.lineTo(160, 100); const a = -v * Math.PI * 0.6; c.lineTo(160 + Math.cos(a) * 120, 100 + Math.sin(a) * 120); c.stroke(); },
  cutter: (c, t) => { dr.box(c, 40, 100, 240, 14, '#b8bcc4'); c.strokeStyle = '#ff3a3a'; c.setLineDash([4, 4]); for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(100 + i * 60, 80); c.lineTo(100 + i * 60, 130); c.stroke(); } c.setLineDash([]); dr.box(c, 30 + ((t * 60) % 260), 40, 10, 50, '#7a1a1a'); dr.sparks(c, 35 + ((t * 60) % 260), 100, t, 6); },
  gearpress: (c, t, v) => { dr.gear(c, 160, 95, 50, 12, v * 6, '#c8843a'); dr.box(c, 100, 20, 120, 14, '#5a5e66'); dr.box(c, 150, 34, 20, 14, '#7a7e86'); },
  welder: (c, t) => { dr.box(c, 30, 95, 120, 14, '#7f8a96'); dr.box(c, 170, 95, 120, 14, '#7f8a96'); dr.glow(c, 160, 102, 40, 'rgba(180,220,255,.9)'); dr.sparks(c, 160, 102, t, 14, '#e8f4ff'); dr.box(c, 155, 30, 10, 60, '#3a3a4a'); },
  compactor: (c, t, v) => { dr.box(c, 80, 20 + v * 40, 160, 20, '#5a5e66'); dr.box(c, 80, 140 - v * 10, 160, 20, '#5a5e66'); dr.box(c, 120, 40 + v * 40, 80, 100 - v * 50, '#8a8a90'); c.strokeStyle = 'rgba(0,0,0,.3)'; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(120, 50 + i * 15 + v * 30); c.lineTo(200, 50 + i * 15 + v * 30); c.stroke(); } },
  alloy: (c, t, v) => { c.save(); c.translate(100, 60); c.rotate(0.6 + Math.sin(t) * 0.1); dr.box(c, -20, -15, 40, 30, '#7a4a2a'); c.restore(); c.save(); c.translate(220, 60); c.rotate(-0.6 - Math.sin(t) * 0.1); dr.box(c, -20, -15, 40, 30, '#5a5e66'); c.restore(); c.strokeStyle = '#ff9a3a'; c.lineWidth = 4; c.beginPath(); c.moveTo(115, 75); c.quadraticCurveTo(140, 110, 160, 125); c.moveTo(205, 75); c.quadraticCurveTo(180, 110, 160, 125); c.stroke(); dr.box(c, 120, 125, 80, 25, '#3a2a1a'); dr.glow(c, 160, 135, 40 + v * 20, 'rgba(255,160,40,.6)'); },
  centrifuge: (c, t) => { c.save(); c.translate(160, 95); c.rotate(t * 8); for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); dr.box(c, 20, -6, 45, 12, ['#c84a4a', '#4ac87a', '#4a8ac8'][i % 3]); } c.restore(); c.strokeStyle = '#7a7e86'; c.lineWidth = 4; c.beginPath(); c.arc(160, 95, 72, 0, 7); c.stroke(); },
  chemReactor: (c, t) => { const cols = ['#c84a4a', '#4ac87a', '#4a8ac8', '#e0c840']; for (let i = 0; i < 4; i++) { dr.box(c, 50 + i * 60, 80, 34, 70, 'rgba(200,220,240,.25)', 8); dr.liquid(c, 52 + i * 60, 110, 30, 38, t + i, cols[i]); } c.fillStyle = 'rgba(200,255,200,.25)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(160 + Math.sin(t + i) * 60, 50 - (t * 12 + i * 9) % 40, 12, 0, 7); c.fill(); } },
  circuitFab: (c, t) => { dr.box(c, 40, 30, 240, 130, '#1e5a34', 6); c.strokeStyle = '#d9c36a'; c.lineWidth = 2; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(50 + i * 28, 40); c.lineTo(50 + i * 28, 80 + (i % 3) * 15); c.lineTo(90 + i * 22, 140); c.stroke(); } c.fillStyle = '#f0f05a'; const k = (t * 3) % 8 | 0; c.fillRect(46 + k * 28, 36, 8, 8); dr.box(c, 140, 80, 40, 30, '#111'); },
  laserEngraver: (c, t) => { dr.box(c, 90, 70, 140, 80, '#2a2a3a', 6); c.fillStyle = '#5a5aaa'; c.beginPath(); c.arc(160, 110, 30, 0, 7); c.fill(); const x = 160 + Math.cos(t * 3) * 22, y = 110 + Math.sin(t * 2) * 22; c.strokeStyle = '#ff2a6a'; c.lineWidth = 2; c.beginPath(); c.moveTo(160, 10); c.lineTo(x, y); c.stroke(); dr.glow(c, x, y, 10, 'rgba(255,60,120,.9)'); },
  extruder: (c, t, v) => { dr.box(c, 30, 70, 120, 50, '#6a6a4a', 6); dr.box(c, 150, 85, 20, 20, '#3a3a2a'); c.fillStyle = '#c8c8a0'; c.fillRect(170, 89, 30 + ((t * 40 * (0.3 + v)) % 110), 12); dr.box(c, 40, 50, 20 + v * 80, 14, '#9aa0a8'); },
  loom: (c, t) => { c.strokeStyle = '#e8e4dc'; for (let i = 0; i < 14; i++) { c.beginPath(); c.moveTo(60 + i * 15, 20); c.lineTo(60 + i * 15 + Math.sin(t * 4 + i) * 3, 150); c.stroke(); } c.strokeStyle = '#c84a6a'; c.lineWidth = 3; for (let j = 0; j < 6; j++) { c.beginPath(); c.moveTo(55, 140 - j * 12); c.lineTo(270, 140 - j * 12); c.stroke(); } c.lineWidth = 1; dr.box(c, 50 + Math.abs(Math.sin(t)) * 210, 70, 20, 10, '#8a5a2a'); },
  tanner: (c, t) => { dr.box(c, 60, 30, 200, 120, '#5a3a1a'); c.fillStyle = '#c8a070'; c.beginPath(); c.ellipse(160, 90, 80, 50, 0, 0, 7); c.fill(); dr.box(c, 120 + Math.sin(t * 3) * 40, 70, 30, 8, '#9aa0a8'); c.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 0; i < 6; i++) c.fillRect(100 + i * 20, 60 + (i % 2) * 40, 12, 3); },
  grower: (c, t, v) => { dr.box(c, 40, 120, 240, 40, '#5a3a1a'); for (let i = 0; i < 6; i++) { const h = 20 + ((t * 5 + i * 9) % 40); c.strokeStyle = '#3a8a3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(60 + i * 40, 120); c.lineTo(60 + i * 40, 120 - h); c.stroke(); c.fillStyle = '#5ac85a'; c.beginPath(); c.ellipse(60 + i * 40 + 6, 120 - h, 7, 4, 0.5, 0, 7); c.fill(); } dr.glow(c, 280, 20, 40, 'rgba(255,230,120,.6)'); },
  polarizer: (c, t) => { dr.box(c, 110, 80, 50, 30, '#c84a4a'); dr.box(c, 160, 80, 50, 30, '#4a6ac8'); c.strokeStyle = 'rgba(200,220,255,.5)'; for (let i = 1; i < 5; i++) { c.beginPath(); c.ellipse(160, 95, 30 + i * 18 + Math.sin(t * 3) * 3, 15 + i * 12, 0, 0, 7); c.stroke(); } },
  cryoChamber: (c, t) => { dr.box(c, 70, 30, 180, 130, '#2a4a6a', 10); dr.glow(c, 160, 95, 80, 'rgba(180,230,255,.4)'); c.strokeStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 8; i++) { const a = i / 8 * 7 + t * 0.2; c.beginPath(); c.moveTo(160, 95); c.lineTo(160 + Math.cos(a) * 60, 95 + Math.sin(a) * 50); c.stroke(); } },
  distiller: (c, t) => { c.fillStyle = '#c8843a'; c.beginPath(); c.arc(100, 110, 35, 0, 7); c.fill(); c.strokeStyle = '#c8843a'; c.lineWidth = 5; c.beginPath(); c.moveTo(100, 75); c.quadraticCurveTo(160, 20, 230, 70); c.stroke(); dr.box(c, 215, 100, 40, 50, 'rgba(200,220,255,.3)', 6); dr.liquid(c, 217, 125, 36, 24, t, '#c080ff'); dr.flame(c, 100, 150, 20, t); },
  crystalResonator: (c, t) => { c.fillStyle = '#b48cff'; c.beginPath(); c.moveTo(160, 30 + Math.sin(t * 20) * 2); c.lineTo(190, 100); c.lineTo(160, 150); c.lineTo(130, 100); c.fill(); c.strokeStyle = 'rgba(200,170,255,.5)'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(160, 95, ((t * 40 + i * 25) % 100), 0, 7); c.stroke(); } },
  arcaneForge: (c, t) => { c.strokeStyle = 'rgba(160,100,255,.7)'; c.beginPath(); c.arc(160, 100, 60, 0, 7); c.stroke(); for (let i = 0; i < 5; i++) { const a = i / 5 * 7 + t * 0.5, b = (i + 2) / 5 * 7 + t * 0.5; c.beginPath(); c.moveTo(160 + Math.cos(a) * 60, 100 + Math.sin(a) * 60); c.lineTo(160 + Math.cos(b) * 60, 100 + Math.sin(b) * 60); c.stroke(); } dr.box(c, 125, 110, 70, 20, '#3a3a42'); dr.glow(c, 160, 100, 30, 'rgba(200,120,255,.5)'); },
  matterCondenser: (c, t) => { for (let i = 0; i < 40; i++) { const a = i * 0.7 + t * 3, r = 70 - ((t * 30 + i * 7) % 65); c.fillStyle = `rgba(160,120,255,${r / 70})`; c.fillRect(160 + Math.cos(a) * r, 95 + Math.sin(a) * r * 0.7, 3, 3); } dr.glow(c, 160, 95, 20, 'rgba(40,20,80,1)'); },
  collider: (c, t) => { c.strokeStyle = '#5a6a8a'; c.lineWidth = 6; c.beginPath(); c.ellipse(160, 95, 120, 60, 0, 0, 7); c.stroke(); for (const s of [1, -1]) { const a = t * 6 * s; dr.glow(c, 160 + Math.cos(a) * 120, 95 + Math.sin(a) * 60, 14, s > 0 ? 'rgba(255,90,240,.9)' : 'rgba(90,240,255,.9)'); } },
  plasmaFuser: (c, t) => { c.strokeStyle = '#7a7e86'; c.lineWidth = 10; c.beginPath(); c.arc(160, 95, 60, 0, 7); c.stroke(); dr.glow(c, 160 + Math.sin(t * 3) * 8, 95 + Math.cos(t * 4) * 6, 40, 'rgba(255,90,240,.8)'); dr.rays(c, 160, 95, 50, 10, t * 2, 'rgba(255,180,255,.4)'); },
  chronoForge: (c, t) => { c.fillStyle = '#2a2238'; c.beginPath(); c.arc(160, 95, 65, 0, 7); c.fill(); c.strokeStyle = '#e0c8ff'; for (let i = 0; i < 12; i++) { const a = i / 12 * 7; c.beginPath(); c.moveTo(160 + Math.cos(a) * 55, 95 + Math.sin(a) * 55); c.lineTo(160 + Math.cos(a) * 62, 95 + Math.sin(a) * 62); c.stroke(); } dr.gear(c, 110, 50, 16, 8, t, '#8a7aa8'); dr.gear(c, 215, 140, 14, 8, -t * 1.3, '#8a7aa8'); },
  transmuter: (c, t) => { c.strokeStyle = '#ffd34a'; c.beginPath(); c.arc(160, 95, 60, 0, 7); c.moveTo(160, 35); c.lineTo(212, 125); c.lineTo(108, 125); c.closePath(); c.stroke(); for (let i = 0; i < 3; i++) { const a = i / 3 * 7 + t; dr.glow(c, 160 + Math.cos(a) * 60, 95 + Math.sin(a) * 60, 12, ['rgba(220,220,220,.9)', 'rgba(255,211,74,.9)', 'rgba(200,120,80,.9)'][i]); } },
  alchemy: (c, t) => { c.fillStyle = '#2a2a2a'; c.beginPath(); c.ellipse(160, 110, 70, 45, 0, 0, Math.PI); c.fill(); dr.liquid(c, 95, 100, 130, 15, t, '#5ae0a0'); dr.bubbles(c, 100, 60, 120, 45, t, 'rgba(160,255,200,.8)', 10); dr.flame(c, 160, 165, 30, t); },
  runecarve: (c, t) => { dr.box(c, 100, 25, 120, 135, '#6a6e76', 8); c.strokeStyle = `rgba(160,140,255,${0.5 + Math.sin(t * 3) * 0.3})`; c.lineWidth = 4; c.beginPath(); c.moveTo(160, 45); c.lineTo(160, 140); c.moveTo(160, 80); c.lineTo(195, 55); c.moveTo(160, 105); c.lineTo(125, 130); c.stroke(); dr.sparks(c, 160 + Math.sin(t * 2) * 30, 90, t, 5, '#c8b8ff'); },
  enchant: (c, t) => { dr.box(c, 110, 120, 100, 30, '#3a2a4a'); c.save(); c.translate(160, 85 + Math.sin(t * 2) * 5); dr.box(c, -24, -14, 48, 28, '#5a2a6a'); c.fillStyle = '#efe6cc'; c.fillRect(-20, -11, 18, 22); c.fillRect(2, -11, 18, 22); c.restore(); for (let i = 0; i < 6; i++) { const a = i / 6 * 7 + t; c.fillStyle = '#c8a8ff'; c.font = '14px serif'; c.fillText('ᚠᚢᚦᚨᚱᚲ'[i], 155 + Math.cos(a) * 75, 90 + Math.sin(a) * 45); } },
  bench: (c, t, v) => { dr.gear(c, 160, 95, 60, 6, v * 2, '#8a6b45'); dr.gear(c, 240, 50, 22, 8, -v * 5, '#6a5a3a'); dr.gear(c, 85, 140, 18, 8, -v * 6, '#6a5a3a'); },
};
// ---------- Estaciones: gesto, giro y eventos propios ----------
// m: tipo de gesto · p: parámetros (el «giro» de cada una) · ev: [nombre, efecto bueno, efecto malo si lo ignoras]
const STATIONS = {
  furnace: { n: 'Fundición', how: 'Mantén pulsado el fuelle: la temperatura debe quedar en la franja verde.', m: 'zone', p: { up: 0.9, down: 0.5, w: 0.22, move: 0.25 }, ev: [['Escoria en la superficie', 'extra'], ['Chispa del crisol', 'xp', 'burn']] },
  millstone: { n: 'Molienda', how: 'Gira el ratón en círculos sobre la piedra para molerlo todo.', m: 'circle', p: { need: 12, cw: 0 }, ev: [['Grano dorado', 'extra'], ['Piedra suelta', 'mast', 'loss']] },
  crusher: { n: 'Trituración', how: 'Haz clic muy rápido para empujar la roca entre las ruedas.', m: 'mash', p: { inc: 0.07, dec: 0.25 }, ev: [['Veta oculta', 'extra'], ['Atasco de rocas', 'boost', 'loss']] },
  saw: { n: 'Corte de tablas', how: 'Haz clic cuando la sierra pase por la marca.', m: 'stop', p: { sp: 1.6, w: 0.12, axis: 'h', accel: 1 }, ev: [['Madera noble', 'extra'], ['Nudo traicionero', 'mast', 'cut']] },
  press: { n: 'Prensado', how: 'Suelta el pistón (clic) justo cuando esté en la altura correcta.', m: 'stop', p: { sp: 1.2, w: 0.14, axis: 'v' }, ev: [['Golpe perfecto', 'mast'], ['Lámina torcida', 'refund', 'loss']] },
  lathe: { n: 'Torneado', how: 'Mantén pulsado para sostener las RPM dentro de la franja estrecha.', m: 'zone', p: { up: 1.3, down: 1.1, w: 0.12, move: 0 }, ev: [['Viruta en espiral', 'xp'], ['Vibración', 'boost', 'loss']] },
  wiremill: { n: 'Trefilado', how: 'Arrastra el alambre por la línea recta sin salirte.', m: 'trace', p: { path: 'line', tol: 10 }, ev: [['Hilo perfecto', 'extra'], ['Rotura del alambre', 'mast', 'cut']] },
  mixer: { n: 'Mezcla', how: 'Remueve en círculos… y cambia de sentido cuando lo pida.', m: 'circle', p: { need: 9, cw: 1 }, ev: [['Grumo flotante', 'xp'], ['Salpicadura', 'extra', 'burn']] },
  blast: { n: 'Alto horno', how: 'Sopla aire (mantén pulsado) siguiendo la franja que sube y baja deprisa.', m: 'zone', p: { up: 1, down: 0.7, w: 0.2, move: 0.9 }, ev: [['Colada de acero', 'boost'], ['Fuga de gas', 'extra', 'burn']] },
  vulcan: { n: 'Vulcanizado', how: 'Revienta las burbujas de aire del caucho antes de que endurezcan.', m: 'pop', p: { every: 0.7, life: 1.4, goal: 8, col: '#e0c840' }, ev: [['Curado perfecto', 'mast'], ['Humo tóxico', 'xp', 'poison']] },
  refinery: { n: 'Refino', how: 'Mueve el ratón para recoger en el depósito las gotas de la columna.', m: 'catch', p: { sp: 70, goal: 7, col: '#f0d070' }, ev: [['Fracción ligera', 'extra'], ['Sobrepresión', 'boost', 'loss']] },
  electro: { n: 'Electrólisis', how: 'Ajusta la corriente (mueve el ratón a los lados) hasta igualar la onda.', m: 'tune', p: { tol: 0.06, drift: 0 }, ev: [['Burbuja de hidrógeno', 'extra'], ['Cortocircuito', 'mast', 'shock']] },
  digest: { n: 'Fermentación', how: 'Haz estallar las burbujas de gas antes de que se escapen.', m: 'pop', p: { every: 0.5, life: 1, goal: 10, col: '#9ac84a' }, ev: [['Gas muy rico', 'boost'], ['Olor terrible', 'xp', 'poison']] },
  orewasher: { n: 'Lavado de menas', how: 'Mece la batea en círculos lentos y constantes.', m: 'circle', p: { need: 7, cw: 0, slow: 1 }, ev: [['Pepita brillante', 'extra'], ['Corriente fuerte', 'mast', 'loss']] },
  pulverizer: { n: 'Pulverizado', how: 'Haz clic al ritmo de los martillos (sin pasarte: se recalientan).', m: 'mash', p: { inc: 0.12, dec: 0.15, heat: 1 }, ev: [['Polvo finísimo', 'extra'], ['Martillo suelto', 'mast', 'cut']] },
  rolling: { n: 'Laminado', how: 'Mantén pulsado para cargar presión y suelta en la franja verde.', m: 'charge', p: { rate: 0.7, w: 0.14 }, ev: [['Lámina espejo', 'mast'], ['Arruga', 'refund', 'loss']] },
  bender: { n: 'Doblado', how: 'Arrastra a los lados para doblar la barra hasta el ángulo marcado y mantenlo.', m: 'align', p: { tol: 0.05, hold: 0.6 }, ev: [['Ángulo exacto', 'xp'], ['Rebote del metal', 'mast', 'cut']] },
  cutter: { n: 'Corte de precisión', how: 'Tres cortes seguidos: clic cada vez que la cuchilla cruce una línea roja.', m: 'stop', p: { sp: 1.4, w: 0.09, axis: 'h', hits: 3 }, ev: [['Corte limpio', 'extra'], ['Lluvia de chispas', 'boost', 'burn']] },
  gearpress: { n: 'Estampado de engranajes', how: 'Gira el troquel (arrastra a los lados) hasta encajar los dientes.', m: 'align', p: { tol: 0.04, hold: 0.4, ring: 1 }, ev: [['Diente perfecto', 'mast'], ['Rebaba', 'refund', 'loss']] },
  welder: { n: 'Soldadura', how: 'Sigue con el arco el cordón en zigzag sin despegarte.', m: 'trace', p: { path: 'zig', tol: 12 }, ev: [['Arco estable', 'boost'], ['Destello cegador', 'xp', 'burn']] },
  compactor: { n: 'Compactado', how: 'Para la prensa en la franja; cada acierto la estrecha.', m: 'stop', p: { sp: 1.1, w: 0.2, axis: 'v', shrink: 1 }, ev: [['Núcleo denso', 'extra'], ['Grieta', 'mast', 'loss']] },
  alloy: { n: 'Aleación', how: 'Mantén el calor en la franja… que tiembla sin parar.', m: 'zone', p: { up: 0.8, down: 0.6, w: 0.18, move: 0.4, jitter: 1 }, ev: [['Mezcla perfecta', 'mast'], ['Salpicadura de metal', 'extra', 'burn']] },
  centrifuge: { n: 'Centrifugado', how: 'Equilibra el tambor: guía la bola con el ratón para que no salga del círculo.', m: 'balance', p: { drift: 60, r: 26, need: 3 }, ev: [['Separación pura', 'extra'], ['Desequilibrio', 'mast', 'loss']] },
  chemReactor: { n: 'Reacción química', how: 'Añade los reactivos en el mismo orden en que se iluminan.', m: 'seq', p: { n: 4, len: 4, shape: 'flasks' }, ev: [['Catalizador', 'boost'], ['Reacción violenta', 'extra', 'burn']] },
  circuitFab: { n: 'Fabricación de circuitos', how: 'Conecta los nodos en el orden que se encienden.', m: 'seq', p: { n: 6, len: 5, shape: 'nodes' }, ev: [['Soldadura limpia', 'extra'], ['Chispazo', 'mast', 'shock']] },
  laserEngraver: { n: 'Grabado láser', how: 'Guía el láser por la espiral sin salirte.', m: 'trace', p: { path: 'spiral', tol: 9 }, ev: [['Patrón perfecto', 'mast'], ['Reflejo', 'xp', 'burn']] },
  extruder: { n: 'Extrusión', how: 'Presión constante: mantén pulsado, pero la presión cae muy rápido.', m: 'zone', p: { up: 1.6, down: 1.4, w: 0.2, move: 0.15 }, ev: [['Flujo continuo', 'boost'], ['Atasco', 'refund', 'loss']] },
  loom: { n: 'Tejido', how: 'Lanza la lanzadera: clic en el lado que se ilumina, al ritmo.', m: 'weave', p: { lanes: 2, beat: 0.75, goal: 8 }, ev: [['Hilo de oro', 'extra'], ['Nudo', 'mast', 'loss']] },
  tanner: { n: 'Curtido', how: 'Raspa la piel: clic en la franja (de tres) que se marca.', m: 'weave', p: { lanes: 3, beat: 1, goal: 7 }, ev: [['Piel impecable', 'extra'], ['Corte en la piel', 'xp', 'cut']] },
  grower: { n: 'Cultivo', how: 'Arranca las malas hierbas y las plagas que aparecen.', m: 'pop', p: { every: 0.9, life: 2, goal: 6, col: '#7a5a2a' }, ev: [['Floración', 'boost'], ['Plaga', 'extra', 'loss']] },
  polarizer: { n: 'Polarización', how: 'Sintoniza el campo: iguala tu onda con la del imán (que se mueve).', m: 'tune', p: { tol: 0.07, drift: 0.12 }, ev: [['Imán perfecto', 'extra'], ['Descarga', 'mast', 'shock']] },
  cryoChamber: { n: 'Criogenia', how: 'Sella las grietas de hielo que se abren en la cámara.', m: 'pop', p: { every: 1.1, life: 2.6, goal: 5, col: '#bff0ff', crack: 1 }, ev: [['Cristal perfecto', 'mast'], ['Congelación', 'xp', 'freeze']] },
  distiller: { n: 'Destilación de esencias', how: 'Recoge las gotas de esencia con el frasco.', m: 'catch', p: { sp: 50, goal: 6, col: '#c080ff', wobble: 1 }, ev: [['Esencia pura', 'extra'], ['Vapores', 'mast', 'poison']] },
  crystalResonator: { n: 'Resonancia', how: 'Busca la frecuencia del cristal (que cambia sola) y aguanta.', m: 'tune', p: { tol: 0.05, drift: 0.25 }, ev: [['Armonía perfecta', 'mast'], ['Grieta sónica', 'extra', 'loss']] },
  arcaneForge: { n: 'Forja arcana', how: 'Traza el sello: toca las estrellas en el orden en que brillan.', m: 'seq', p: { n: 5, len: 5, shape: 'stars' }, ev: [['Bendición arcana', 'extra'], ['Llama mágica', 'mast', 'burn']] },
  matterCondenser: { n: 'Condensación', how: 'Mantén la materia en el centro del vórtice, que tira muy fuerte.', m: 'balance', p: { drift: 110, r: 22, need: 3.5, pull: 1 }, ev: [['Densidad crítica', 'boost'], ['Implosión', 'extra', 'loss']] },
  collider: { n: 'Colisión de partículas', how: 'Carga el acelerador y suelta en el instante exacto.', m: 'charge', p: { rate: 1.1, w: 0.07 }, ev: [['Partícula exótica', 'extra'], ['Radiación', 'mast', 'poison']] },
  plasmaFuser: { n: 'Fusión de plasma', how: 'Contén el plasma dentro del anillo magnético.', m: 'balance', p: { drift: 80, r: 30, need: 4 }, ev: [['Plasma estable', 'boost'], ['Fuga de plasma', 'extra', 'burn']] },
  chronoForge: { n: 'Forja del tiempo', how: 'Alinea la aguja del reloj con la marca y sostenla (gira sola hacia atrás).', m: 'align', p: { tol: 0.05, hold: 0.8, back: 1 }, ev: [['Bucle temporal', 'refund'], ['Paradoja', 'mast', 'loss']] },
  transmuter: { n: 'Transmutación', how: 'Encuentra las parejas de símbolos alquímicos.', m: 'memory', p: { pairs: 3 }, ev: [['Oro filosofal', 'extra'], ['Inestabilidad', 'mast', 'loss']] },
  alchemy: { n: 'Alquimia', how: 'Revienta SOLO las burbujas del color que pide la receta.', m: 'pop', p: { every: 0.45, life: 1.3, goal: 7, col: 'multi' }, ev: [['Poción brillante', 'extra'], ['Explosión', 'mast', 'burn']] },
  runecarve: { n: 'Tallado de runas', how: 'Repasa con el cincel el trazo de la runa.', m: 'trace', p: { path: 'rune', tol: 11 }, ev: [['Runa viva', 'mast'], ['Esquirla', 'xp', 'cut']] },
  enchant: { n: 'Encantamiento', how: 'Memoriza el orden en que se encienden las runas y repítelo (cada vez una más).', m: 'seq', p: { n: 6, len: 3, shape: 'runes', grow: 1 }, ev: [['Inspiración', 'extra'], ['Maldición', 'mast', 'loss']] },
  bench: { n: 'Ensamblaje', how: 'Gira el engranaje (arrastra a los lados) hasta que los dientes encajen.', m: 'align', p: { tol: 0.06, hold: 0.5, ring: 1 }, ev: [['Pieza perfecta', 'mast'], ['Engranaje roto', 'xp', 'cut']] },
};
// ---------- Motor ----------
let ST = null, _stRaf = 0;
function stationKey(b) { return b.type === 'bench' ? 'bench' : BD[b.type].machine; }
function stationHTML(b) {
  const D = STATIONS[stationKey(b)]; if (!D) return '';
  return `<div class="stn"><div class="stnh"><b>⚒ ${esc(D.n)}</b><span class="stm" title="Maestría: al llegar a 100, la siguiente pieza sale doble"><i id="stMast"></i></span></div><canvas id="stCv" width="${SW}" height="${SH}"></canvas><div class="small mut" id="stMsg">${esc(D.how)}</div></div>`;
}
function stationOpen(b) {
  const k = stationKey(b), D = STATIONS[k]; if (!D || !$('stCv')) { ST = null; return; }
  ST = { b, k, D, t: 0, mx: SW / 2, my: SH / 2, down: false, clicks: [], st: {}, ev: null, evT: rnd(8, 16), fx: [], msgT: 0 };
  mechReset(); cancelAnimationFrame(_stRaf);
  let last = performance.now();
  const loop = now => {
    if (!ST || ui.open !== 'inv' || ui.panel !== ST.b || !$('stCv')) { ST = null; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; stationStep(dt); stationDraw(); _stRaf = requestAnimationFrame(loop);
  };
  _stRaf = requestAnimationFrame(loop);
  const cv = $('stCv'), pos = e => { const r = cv.getBoundingClientRect(); ST.mx = (e.clientX - r.left) / r.width * SW; ST.my = (e.clientY - r.top) / r.height * SH; };
  cv.onmousemove = e => { if (ST) pos(e); };
  cv.onmousedown = e => { if (!ST) return; pos(e); ST.down = true; ST.clicks.push([ST.mx, ST.my]); e.preventDefault(); };
  cv.onmouseup = cv.onmouseleave = () => { if (ST) ST.down = false; };
}
const working = () => { const b = ST.b; return b.type === 'bench' ? !!b.rcp : b.cur >= 0; };
function stMsg(t, col) { const el = $('stMsg'); if (el) { el.textContent = t; el.style.color = col || ''; } ST.msgT = 2.2; }
// Acierto / fallo del gesto
function stationWin() {
  const b = ST.b; sfx('beep');
  if (working()) {
    if (b.type === 'bench') b.prog = (b.prog || 0) + 0.35 * (b.rcp && b.rcp.rpm >= 64 ? 3 : b.rcp && b.rcp.rpm >= 32 ? 2 : 1);
    else { const r = RECIPES[BD[b.type].machine][b.cur]; if (r) b.prog = Math.min(r.t * 0.98, b.prog + r.t * 0.35); }
    b.mast = (b.mast || 0) + 25; gainXP('craft', 2);
    if (b.mast >= 100) { b.mast = 0; b.qual = (b.qual || 0) + 1; stMsg('★ ¡Obra maestra! La siguiente pieza saldrá doble', '#ffd34a'); }
    else stMsg('¡Bien hecho! La pieza avanza', '#7fd07a');
  } else stMsg('¡Bien! (pon materiales para que cuente)', '#9ad8ff');
  for (let i = 0; i < 14; i++) ST.fx.push({ x: ST.mx, y: ST.my, vx: rnd(-80, 80), vy: rnd(-90, 20), t: 0.7, c: '#ffd34a' });
  mechReset();
}
function stationFail(txt) { stMsg(txt || 'Fallaste: vuelve a intentarlo', '#ff8a7a'); mechReset(); }
// Efectos de los eventos
function evEffect(kind, good) {
  const b = ST.b, r = b.type !== 'bench' && b.cur >= 0 ? RECIPES[BD[b.type].machine][b.cur] : null;
  switch (kind) {
    case 'extra': b.qual = (b.qual || 0) + 1; return '¡La próxima pieza saldrá doble!';
    case 'boost': b.boostT = S.time + 12; return 'Velocidad ×2 durante 12 s';
    case 'refund': if (r) { const k = Object.keys(r.in)[0]; if (k) dictAdd(b.inv, k, 1); } return 'Recuperas material';
    case 'mast': b.mast = Math.min(99, (b.mast || 0) + 45); return '+45 de maestría';
    case 'xp': gainXP('craft', 15); return '+15 de experiencia';
    case 'loss': b.prog = (b.prog || 0) * 0.4; return 'La pieza pierde progreso';
    case 'burn': hurt('burn', 'handR', 0.5, 'Accidente en ' + ST.D.n); return 'Te has quemado';
    case 'cut': hurt('cut', 'handL', 0.5, 'Accidente en ' + ST.D.n); return 'Te has cortado';
    case 'shock': hurt('burn', 'armR', 0.6, 'Descarga'); return 'Descarga eléctrica';
    case 'poison': if (survOn()) S.pc.poison = Math.max(S.pc.poison, 8); return 'Te has intoxicado';
    case 'freeze': P.chill = 4; return 'Se te congelan las manos';
  }
  return '';
}
function stationStep(dt) {
  ST.t += dt; const b = ST.b;
  if (ST.msgT > 0 && (ST.msgT -= dt) <= 0) { const el = $('stMsg'); if (el) { el.textContent = ST.D.how; el.style.color = ''; } }
  // Eventos
  if (!ST.ev && working() && (ST.evT -= dt) <= 0) { const e = ST.D.ev[(Math.random() * ST.D.ev.length) | 0]; ST.ev = { n: e[0], good: e[1], bad: e[2], x: rnd(30, SW - 30), y: rnd(25, SH - 30), t: e[2] ? 3.2 : 4.5, max: e[2] ? 3.2 : 4.5 }; stMsg('⚡ ' + e[0] + (e[2] ? ' — ¡reacciona!' : ' — ¡aprovecha!'), '#ffd34a'); }
  if (ST.ev) { const e = ST.ev; e.t -= dt; const hit = ST.clicks.find(([x, y]) => Math.hypot(x - e.x, y - e.y) < 18);
    if (hit) { ST.clicks.splice(ST.clicks.indexOf(hit), 1); stMsg('✓ ' + e.n + ': ' + evEffect(e.good, true), '#7fd07a'); ST.ev = null; ST.evT = rnd(12, 22); sfx('beep'); }
    else if (e.t <= 0) { stMsg(e.bad ? '✗ ' + e.n + ': ' + evEffect(e.bad, false) : 'Se te escapó: ' + e.n, e.bad ? '#ff8a7a' : ''); ST.ev = null; ST.evT = rnd(12, 22); } }
  mechStep(dt); ST.clicks.length = 0;
  for (let i = ST.fx.length - 1; i >= 0; i--) { const f = ST.fx[i]; f.t -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 160 * dt; if (f.t <= 0) ST.fx.splice(i, 1); }
  const m = $('stMast'); if (m) m.style.width = Math.min(100, b.mast || 0) + '%';
}
// ---------- Gestos ----------
const PATHS = {
  line: () => Array.from({ length: 30 }, (_, i) => [30 + i * 9, 95]),
  zig: () => Array.from({ length: 36 }, (_, i) => [30 + i * 7.5, 95 + ((i % 8) < 4 ? (i % 4) * 10 : (4 - i % 4) * 10) - 20]),
  spiral: () => Array.from({ length: 60 }, (_, i) => { const a = i * 0.21, r = 8 + i * 0.95; return [160 + Math.cos(a) * r, 90 + Math.sin(a) * r * 0.75]; }),
  rune: () => [...Array.from({ length: 14 }, (_, i) => [160, 40 + i * 7]), ...Array.from({ length: 8 }, (_, i) => [160 + i * 5, 70 - i * 3]), ...Array.from({ length: 8 }, (_, i) => [200 - i * 5, 46 + i * 3 + 30])],
};
function mechReset() {
  const p = ST.D.p, s = ST.st = {};
  switch (ST.D.m) {
    case 'zone': s.v = 0.2; s.z = rnd(0.35, 0.7); s.acc = 0; s.need = 2.4; break;
    case 'stop': s.x = 0; s.dir = 1; s.hits = 0; s.w = p.w; s.z = rnd(0.2, 0.8); s.sp = p.sp; break;
    case 'mash': s.v = 0; s.heat = 0; break;
    case 'circle': s.a = null; s.acc = 0; s.dir = p.cw ? 1 : 0; s.flip = rnd(3, 5); break;
    case 'trace': s.path = PATHS[p.path](); s.i = 0; break;
    case 'pop': s.items = []; s.n = 0; s.spawn = 0; s.want = p.col === 'multi' ? ['#ff6a6a', '#5ae0a0', '#5a9aff'][(Math.random() * 3) | 0] : null; break;
    case 'catch': s.drops = []; s.n = 0; s.miss = 0; s.spawn = 0; break;
    case 'tune': s.f0 = rnd(0.2, 0.8); s.hold = 0; break;
    case 'balance': s.bx = SW / 2; s.by = SH / 2; s.vx = rnd(-40, 40); s.vy = rnd(-40, 40); s.hold = 0; break;
    case 'charge': s.v = 0; s.z = rnd(0.55, 0.85); s.was = false; break;
    case 'align': s.v = rnd(0, 1); s.z = rnd(0.15, 0.85); s.hold = 0; s.drag = null; break;
    case 'seq': { const len = p.grow ? (ST.lvl = Math.min(8, (ST.lvl || p.len - 1) + 1)) : p.len; s.seq = Array.from({ length: len }, () => (Math.random() * p.n) | 0); s.show = 0; s.idx = 0; s.flash = -1; s.ft = 0.5; s.pts = Array.from({ length: p.n }, (_, i) => p.shape === 'nodes' ? [50 + (i % 3) * 110, 50 + Math.floor(i / 3) * 70] : p.shape === 'flasks' ? [67 + i * 60, 110] : [160 + Math.cos(i / p.n * 6.283 - 1.57) * 60, 92 + Math.sin(i / p.n * 6.283 - 1.57) * 55]); break; }
    case 'weave': s.side = (Math.random() * p.lanes) | 0; s.t = p.beat; s.n = 0; break;
    case 'memory': { const sym = ['☉', '☽', '♀', '♂', '♃', '♄'].slice(0, p.pairs); s.cards = [...sym, ...sym].sort(() => Math.random() - 0.5).map(x => ({ x, open: false, done: false })); s.pick = []; s.wait = 0; break; }
  }
}
function mechStep(dt) {
  const p = ST.D.p, s = ST.st, clicks = ST.clicks, mx = ST.mx / SW, my = ST.my / SH;
  switch (ST.D.m) {
    case 'zone': { s.v = clamp(s.v + (ST.down ? p.up : -p.down) * dt, 0, 1); s.z = clamp(0.5 + Math.sin(ST.t * (0.6 + p.move * 3)) * p.move + (p.jitter ? Math.sin(ST.t * 13) * 0.04 : 0), p.w / 2, 1 - p.w / 2); if (Math.abs(s.v - s.z) < p.w / 2) { s.acc += dt; if (s.acc >= s.need) stationWin(); } else s.acc = Math.max(0, s.acc - dt * 0.5); break; }
    case 'stop': { s.x += s.dir * s.sp * dt; if (s.x > 1 || s.x < 0) { s.dir *= -1; s.x = clamp(s.x, 0, 1); if (p.accel) s.sp *= 1.05; } if (clicks.length) { if (Math.abs(s.x - s.z) < s.w / 2) { s.hits++; if (s.hits >= (p.hits || 1)) stationWin(); else { s.z = rnd(0.15, 0.85); if (p.shrink) s.w *= 0.75; stMsg('Corte ' + s.hits + '/' + p.hits, '#7fd07a'); } } else stationFail('Fuera de la marca'); } break; }
    case 'mash': { s.v = Math.max(0, s.v - p.dec * dt); s.heat = Math.max(0, s.heat - dt * 0.6); for (const _ of clicks) { s.v += p.inc; if (p.heat) { s.heat += 0.18; if (s.heat > 1) { stationFail('¡Se recalentaron los martillos!'); return; } } } if (s.v >= 1) stationWin(); break; }
    case 'circle': { const a = Math.atan2(ST.my - SH / 2, ST.mx - SW / 2); if (s.a !== null) { let d = a - s.a; if (d > Math.PI) d -= 6.283; if (d < -Math.PI) d += 6.283; const want = p.cw ? (s.dir > 0 ? d > 0 : d < 0) : true; const spd = Math.abs(d) / dt; if (want && (!p.slow || spd < 9)) s.acc += Math.abs(d); else if (p.slow && spd >= 9) s.acc = Math.max(0, s.acc - Math.abs(d) * 0.5); } s.a = a; if (p.cw && (s.flip -= dt) <= 0) { s.dir *= -1; s.flip = rnd(3, 5); stMsg(s.dir > 0 ? '↻ ¡Ahora en sentido horario!' : '↺ ¡Ahora al revés!', '#9ad8ff'); } if (s.acc >= p.need * 6.283 / 2) stationWin(); break; }
    case 'trace': { const pt = s.path[s.i]; if (ST.down && pt && Math.hypot(ST.mx - pt[0], ST.my - pt[1]) < p.tol + 6) { s.i++; if (s.i >= s.path.length) stationWin(); } else if (ST.down && pt && s.i > 0 && Math.hypot(ST.mx - s.path[s.i - 1][0], ST.my - s.path[s.i - 1][1]) > p.tol * 2.5) { stationFail('Te saliste del trazo'); } break; }
    case 'pop': { if ((s.spawn -= dt) <= 0) { s.spawn = p.every; const col = p.col === 'multi' ? ['#ff6a6a', '#5ae0a0', '#5a9aff'][(Math.random() * 3) | 0] : p.col; s.items.push({ x: rnd(25, SW - 25), y: rnd(25, SH - 25), t: p.life, col }); } for (let i = s.items.length - 1; i >= 0; i--) { const it = s.items[i]; it.t -= dt; const hit = clicks.find(([x, y]) => Math.hypot(x - it.x, y - it.y) < 16); if (hit) { s.items.splice(i, 1); if (s.want && it.col !== s.want) { stationFail('¡Color equivocado!'); return; } s.n++; } else if (it.t <= 0) s.items.splice(i, 1); } if (s.n >= p.goal) stationWin(); break; }
    case 'catch': { if ((s.spawn -= dt) <= 0) { s.spawn = rnd(0.6, 1.1); s.drops.push({ x: rnd(40, SW - 40), y: 10, ph: rnd(0, 6) }); } for (let i = s.drops.length - 1; i >= 0; i--) { const d = s.drops[i]; d.y += p.sp * dt; if (p.wobble) d.x += Math.sin(ST.t * 4 + d.ph) * 40 * dt; if (d.y > SH - 22) { if (Math.abs(d.x - ST.mx) < 26) s.n++; else if (++s.miss >= 3) { stationFail('Se derramaron demasiadas gotas'); return; } s.drops.splice(i, 1); } } if (s.n >= p.goal) stationWin(); break; }
    case 'tune': { if (p.drift) s.f0 = clamp(s.f0 + Math.sin(ST.t * 0.9) * p.drift * dt, 0.1, 0.9); if (Math.abs(mx - s.f0) < p.tol) { s.hold += dt; if (s.hold > 1.6) stationWin(); } else s.hold = Math.max(0, s.hold - dt); break; }
    case 'balance': { const ax = rnd(-1, 1) * p.drift + (p.pull ? (s.bx - SW / 2) * 1.2 : 0), ay = rnd(-1, 1) * p.drift + (p.pull ? (s.by - SH / 2) * 1.2 : 0); s.vx += (ax + (s.bx - ST.mx) * 2.2) * dt; s.vy += (ay + (s.by - ST.my) * 2.2) * dt; s.vx *= 0.96; s.vy *= 0.96; s.bx += s.vx * dt; s.by += s.vy * dt; const d = Math.hypot(s.bx - SW / 2, s.by - SH / 2); if (d < p.r) { s.hold += dt; if (s.hold >= p.need) stationWin(); } else if (d > 75) stationFail('¡Se salió!'); break; }
    case 'charge': { if (ST.down) { s.v = Math.min(1, s.v + p.rate * dt); s.was = true; } else if (s.was) { if (Math.abs(s.v - s.z) < p.w / 2) stationWin(); else stationFail(s.v < s.z ? 'Le faltó fuerza' : 'Demasiada presión'); } break; }
    case 'align': { if (ST.down) { if (s.drag === null) s.drag = ST.mx - s.v * SW; s.v = clamp((ST.mx - s.drag) / SW, 0, 1); } else s.drag = null; if (p.back && !ST.down) s.v = Math.max(0, s.v - dt * 0.15); if (Math.abs(s.v - s.z) < p.tol) { s.hold += dt; if (s.hold >= p.hold) stationWin(); } else s.hold = 0; break; }
    case 'seq': { if (s.show < s.seq.length) { if ((s.ft -= dt) <= 0) { s.flash = s.flash < 0 ? s.seq[s.show] : -1; s.ft = s.flash < 0 ? 0.15 : 0.45; if (s.flash < 0) s.show++; } return; } for (const [x, y] of clicks) { const i = s.pts.findIndex(([px, py]) => Math.hypot(x - px, y - py) < 20); if (i < 0) continue; if (i === s.seq[s.idx]) { s.idx++; s.flash = i; s.ft = 0.2; if (s.idx >= s.seq.length) { stationWin(); return; } } else { if (ST.D.p.grow) ST.lvl = ST.D.p.len - 1; stationFail('Orden equivocado'); return; } } if (s.ft > 0 && (s.ft -= dt) <= 0) s.flash = -1; break; }
    case 'weave': { s.t -= dt; if (s.t <= 0) { stationFail('¡Tarde! Perdiste el ritmo'); return; } for (const [x] of clicks) { const lane = Math.min(p.lanes - 1, (x / SW * p.lanes) | 0); if (lane === s.side) { s.n++; s.side = (Math.random() * p.lanes) | 0; s.t = p.beat; if (s.n >= p.goal) { stationWin(); return; } } else { stationFail('Lado equivocado'); return; } } break; }
    case 'memory': { if (s.wait > 0 && (s.wait -= dt) <= 0) { const [a, b2] = s.pick; if (s.cards[a].x === s.cards[b2].x) { s.cards[a].done = s.cards[b2].done = true; } else { s.cards[a].open = s.cards[b2].open = false; } s.pick = []; if (s.cards.every(c2 => c2.done)) { stationWin(); return; } } if (s.wait > 0) break; for (const [x, y] of clicks) { const i = s.cards.findIndex((c2, k) => Math.abs(x - (40 + (k % 6) * 48)) < 20 && Math.abs(y - (60 + Math.floor(k / 6) * 60)) < 26); if (i < 0 || s.cards[i].open || s.cards[i].done) continue; s.cards[i].open = true; s.pick.push(i); if (s.pick.length === 2) s.wait = 0.6; break; } break; }
  }
}
// ---------- Dibujo ----------
function stationDraw() {
  const cv = $('stCv'); if (!cv) return; const c = cv.getContext('2d'), s = ST.st, p = ST.D.p, t = ST.t;
  c.clearRect(0, 0, SW, SH); c.fillStyle = '#141617'; c.fillRect(0, 0, SW, SH);
  const v = s.v !== undefined ? s.v : (s.acc || s.hold || 0) / 4;
  try { (SCENE[ST.k] || SCENE.bench)(c, t, clamp(v, 0, 1)); } catch (e) { }
  c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 0, SW, SH);
  const UI = '#ffd34a', OK = '#7fd07a';
  switch (ST.D.m) {
    case 'zone': { const x = SW - 26, y0 = 14, hh = SH - 28; dr.box(c, x, y0, 14, hh, '#222'); c.fillStyle = 'rgba(127,208,122,.5)'; c.fillRect(x, y0 + (1 - s.z - p.w / 2) * hh, 14, p.w * hh); c.fillStyle = UI; c.fillRect(x - 3, y0 + (1 - s.v) * hh - 2, 20, 4); dr.box(c, 14, SH - 12, (SW - 60) * Math.min(1, s.acc / s.need), 5, OK); break; }
    case 'stop': { const vert = p.axis === 'v'; if (vert) { const x = SW - 30, hh = SH - 20; dr.box(c, x, 10, 16, hh, '#222'); c.fillStyle = 'rgba(127,208,122,.55)'; c.fillRect(x, 10 + (s.z - s.w / 2) * hh, 16, s.w * hh); c.fillStyle = UI; c.fillRect(x - 4, 10 + s.x * hh - 2, 24, 4); } else { const y = SH - 22, ww = SW - 20; dr.box(c, 10, y, ww, 12, '#222'); c.fillStyle = 'rgba(255,90,90,.6)'; c.fillRect(10 + (s.z - s.w / 2) * ww, y, s.w * ww, 12); c.fillStyle = UI; c.fillRect(10 + s.x * ww - 2, y - 4, 4, 20); } break; }
    case 'mash': dr.box(c, 14, SH - 18, (SW - 28) * Math.min(1, s.v), 8, OK); if (ST.D.p.heat) dr.box(c, 14, SH - 8, (SW - 28) * Math.min(1, s.heat), 4, '#ff5a3a'); break;
    case 'circle': { c.strokeStyle = UI; c.lineWidth = 3; c.beginPath(); c.arc(SW / 2, SH / 2, 60, -1.57, -1.57 + 6.283 * Math.min(1, s.acc / (p.need * 3.1416))); c.stroke(); if (p.cw) { c.fillStyle = UI; c.font = 'bold 20px system-ui'; c.fillText(s.dir > 0 ? '↻' : '↺', SW / 2 - 8, 26); } break; }
    case 'trace': { c.setLineDash([4, 5]); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; c.beginPath(); s.path.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.setLineDash([]); c.strokeStyle = OK; c.lineWidth = 4; c.beginPath(); s.path.slice(0, s.i).forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); const pt = s.path[s.i]; if (pt) dr.glow(c, pt[0], pt[1], 14, 'rgba(255,211,74,.9)'); break; }
    case 'pop': for (const it of s.items) { c.globalAlpha = Math.min(1, it.t * 2); if (p.crack) { c.strokeStyle = it.col; c.lineWidth = 2; c.beginPath(); c.moveTo(it.x - 12, it.y - 8); c.lineTo(it.x, it.y + 2); c.lineTo(it.x + 10, it.y - 6); c.lineTo(it.x + 4, it.y + 12); c.stroke(); } else { c.fillStyle = it.col; c.beginPath(); c.arc(it.x, it.y, 10 + Math.sin(t * 8) * 2, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.stroke(); } } c.globalAlpha = 1; dr.box(c, 14, SH - 10, (SW - 28) * s.n / p.goal, 5, OK); if (s.want) { c.fillStyle = s.want; c.beginPath(); c.arc(SW - 18, 18, 9, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = '10px system-ui'; c.fillText('solo', SW - 54, 22); } break;
    case 'catch': c.fillStyle = p.col; for (const d of s.drops) { c.beginPath(); c.ellipse(d.x, d.y, 4, 6, 0, 0, 7); c.fill(); } dr.box(c, ST.mx - 26, SH - 18, 52, 10, '#c8ccd4'); dr.box(c, 14, 6, (SW - 28) * s.n / p.goal, 4, OK); c.fillStyle = '#ff8a7a'; for (let i = 0; i < s.miss; i++) c.fillText('✗', SW - 20 - i * 12, 18); break;
    case 'tune': { c.lineWidth = 2; for (const [f, col] of [[s.f0, 'rgba(255,255,255,.6)'], [ST.mx / SW, UI]]) { c.strokeStyle = col; c.beginPath(); for (let x = 0; x <= SW; x += 4) c.lineTo(x, SH / 2 + Math.sin(x * (0.02 + f * 0.1) + t * 3) * 30); c.stroke(); } dr.box(c, 14, SH - 10, (SW - 28) * Math.min(1, s.hold / 1.6), 5, OK); break; }
    case 'balance': c.strokeStyle = OK; c.lineWidth = 2; c.beginPath(); c.arc(SW / 2, SH / 2, p.r, 0, 7); c.stroke(); c.strokeStyle = 'rgba(255,90,90,.6)'; c.beginPath(); c.arc(SW / 2, SH / 2, 75, 0, 7); c.stroke(); dr.glow(c, s.bx, s.by, 14, 'rgba(255,211,74,1)'); dr.box(c, 14, SH - 10, (SW - 28) * Math.min(1, s.hold / p.need), 5, OK); break;
    case 'charge': { const x = 14, w = SW - 28, y = SH - 22; dr.box(c, x, y, w, 12, '#222'); c.fillStyle = 'rgba(127,208,122,.6)'; c.fillRect(x + (s.z - p.w / 2) * w, y, p.w * w, 12); c.fillStyle = UI; c.fillRect(x, y + 3, s.v * w, 6); break; }
    case 'align': { c.save(); c.translate(SW / 2, SH / 2); c.strokeStyle = 'rgba(127,208,122,.8)'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 66, s.z * 6.283 - 1.57 - p.tol * 6.283, s.z * 6.283 - 1.57 + p.tol * 6.283); c.stroke(); c.rotate(s.v * 6.283); c.fillStyle = UI; c.beginPath(); c.moveTo(0, -70); c.lineTo(-7, -54); c.lineTo(7, -54); c.fill(); c.restore(); dr.box(c, 14, SH - 10, (SW - 28) * Math.min(1, s.hold / p.hold), 5, OK); break; }
    case 'seq': s.pts.forEach(([x, y], i) => { const lit = s.flash === i; c.fillStyle = lit ? '#ffe680' : p.shape === 'flasks' ? ['#c84a4a', '#4ac87a', '#4a8ac8', '#e0c840'][i % 4] : p.shape === 'runes' ? '#6a4aaa' : '#3a4a5a'; c.beginPath(); c.arc(x, y, lit ? 17 : 14, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 14px serif'; c.textAlign = 'center'; c.fillText(p.shape === 'runes' ? 'ᚠᚢᚦᚨᚱᚲ'[i] : p.shape === 'stars' ? '✦' : String(i + 1), x, y + 5); }); c.textAlign = 'left'; c.fillStyle = UI; c.font = '11px system-ui'; c.fillText(s.show < s.seq.length ? 'Observa…' : `Tu turno: ${s.idx}/${s.seq.length}`, 10, 16); break;
    case 'weave': { const lw = SW / p.lanes; for (let i = 0; i < p.lanes; i++) { c.fillStyle = i === s.side ? 'rgba(255,211,74,.35)' : 'rgba(255,255,255,.05)'; c.fillRect(i * lw + 4, 10, lw - 8, SH - 30); } dr.box(c, 14, SH - 14, (SW - 28) * (s.t / p.beat), 4, '#ff8a3a'); dr.box(c, 14, SH - 8, (SW - 28) * s.n / p.goal, 4, OK); break; }
    case 'memory': s.cards.forEach((cd, k) => { const x = 40 + (k % 6) * 48, y = 60 + Math.floor(k / 6) * 60; dr.box(c, x - 18, y - 24, 36, 48, cd.done ? '#3a5a2a' : cd.open ? '#5a4a2a' : '#2a2a3a', 6); if (cd.open || cd.done) { c.fillStyle = '#ffd34a'; c.font = '22px serif'; c.textAlign = 'center'; c.fillText(cd.x, x, y + 8); c.textAlign = 'left'; } }); break;
  }
  // Evento activo: destello para hacer clic
  if (ST.ev) { const e = ST.ev, k = e.t / e.max; dr.glow(c, e.x, e.y, 22 + Math.sin(t * 12) * 4, e.bad ? 'rgba(255,90,60,.95)' : 'rgba(255,230,90,.95)'); c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(e.x, e.y, 18, -1.57, -1.57 + 6.283 * k); c.stroke(); c.fillStyle = '#fff'; c.font = 'bold 11px system-ui'; c.textAlign = 'center'; c.fillText(e.n, e.x, e.y - 24); c.textAlign = 'left'; }
  for (const f of ST.fx) { c.globalAlpha = Math.min(1, f.t * 2); c.fillStyle = f.c; c.fillRect(f.x, f.y, 3, 3); } c.globalAlpha = 1;
}
