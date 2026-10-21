'use strict';
// =====================================================================================
//  Texturas de la Ciudadela del Primer Engranaje y del otro lado de la Puerta.
//  Se dibujan una vez dentro del chunk pre-renderizado; lo animado (portal, sellos,
//  Corazón) va en endDraw (sim/endgame.js).
// =====================================================================================
// Losas grandes de 2×2 casillas, cada una con su tono, juntas, grietas y musgo
function slab(c, x, y, px, py, base, seam) {
  const sx = x >> 1, sy = y >> 1, v = (hash2(sx, sy, 41) - 0.5) * 18;
  c.fillStyle = `rgb(${base[0] + v | 0},${base[1] + v | 0},${base[2] + v * 0.8 | 0})`; c.fillRect(px, py, T, T);
  c.fillStyle = seam; if (!(x & 1)) c.fillRect(px, py, 2, T); if (!(y & 1)) c.fillRect(px, py, T, 2);
  c.fillStyle = 'rgba(255,255,255,.06)'; if (!(x & 1)) c.fillRect(px + 2, py, 1, T); if (!(y & 1)) c.fillRect(px, py + 2, T, 1);
  for (let k = 0; k < 3; k++) { c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(px + hash2(x, y, k + 60) * 28, py + hash2(x, y, k + 70) * 28, 2 + hash2(x, y, k) * 3, 1.5); }
  if (hash2(x, y, 81) < 0.22) { c.strokeStyle = 'rgba(20,16,12,.45)'; c.lineWidth = 1; c.beginPath(); const a = hash2(x, y, 82) * 28; c.moveTo(px + a, py + 2); c.lineTo(px + a + 5, py + 12); c.lineTo(px + a - 2, py + 20); c.stroke(); }
  if (hash2(x, y, 83) < 0.18) for (let k = 0; k < 5; k++) circ(c, px + 2 + hash2(x, y, k + 90) * 28, py + 2 + hash2(x, y, k + 95) * 28, 1.2 + hash2(x, y, k) * 1.4, k & 1 ? '#5a7a3a' : '#4a6a32');
}
const RUIN_SEAM = 'rgba(30,26,22,.55)', RUIN_BASE = [96, 90, 82];
function drawRuin(c, x, y, g, px, py) {
  const h = k => hash2(x, y, k), cx = px + 16, cy = py + 16;
  switch (g.ruin || 'abyss') {
    case 'floor': slab(c, x, y, px, py, RUIN_BASE, RUIN_SEAM); break;
    case 'canal': // canal seco con bordes de latón
      slab(c, x, y, px, py, [90, 84, 74], RUIN_SEAM);
      c.fillStyle = '#2a2420'; c.fillRect(px + 9, py, 14, T); c.fillStyle = '#b08a3a'; c.fillRect(px + 7, py, 2, T); c.fillRect(px + 23, py, 2, T);
      c.fillStyle = 'rgba(80,60,30,.6)'; c.fillRect(px + 11, py + (h(3) * 20 | 0), 10, 4); break;
    case 'rune': // losa de pizarra con un glifo que brilla
      c.fillStyle = '#3e3a4a'; c.fillRect(px, py, T, T); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(px, py, T, 2); c.fillRect(px, py, 2, T);
      c.fillStyle = 'rgba(90,240,255,.12)'; c.fillRect(px + 2, py + 2, T - 4, T - 4);
      c.strokeStyle = 'rgba(90,240,255,.85)'; c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath();
      for (let k = 0; k < 3; k++) { const a = h(k) * 6.28, r1 = 4 + h(k + 3) * 4; c.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.lineTo(cx + Math.cos(a + 1.6) * 10, cy + Math.sin(a + 1.6) * 10); }
      c.stroke(); c.beginPath(); c.arc(cx, cy, 3 + h(9) * 2, 0, 7); c.stroke(); break;
    case 'wall': { // sillares grandes, franja de latón con remaches, hiedra y sombra
      c.fillStyle = '#4a4540'; c.fillRect(px, py, T, T);
      for (let r = 0; r < 3; r++) {
        const off = (r + y) & 1 ? 0 : 10;
        for (let k = -1; k < 2; k++) {
          const bx = Math.max(px, px + off + k * 20 + 1), bw = Math.min(px + T, px + off + k * 20 + 19) - bx, by = py + r * 11, v = (hash2(x * 3 + k, y * 3 + r, 7) - 0.5) * 20;
          if (bw <= 0) continue;
          c.fillStyle = `rgb(${82 + v | 0},${77 + v | 0},${70 + v | 0})`; c.fillRect(bx, by + 1, bw, 9);
          c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(bx, by + 1, bw, 1.5);
        }
      }
      if ((x + y) % 5 === 0) { c.fillStyle = '#9a7a3a'; c.fillRect(px, py + 14, T, 3); for (let k = 0; k < 3; k++) circ(c, px + 5 + k * 11, py + 15.5, 1.6, '#e0b54c'); }
      if (h(5) < 0.3) { const vx = px + h(6) * 28; c.strokeStyle = '#3e6a2e'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(vx, py); for (let k = 1; k < 5; k++) c.lineTo(vx + Math.sin(k * 1.7) * 4, py + k * 7); c.stroke(); for (let k = 0; k < 4; k++) circ(c, vx + Math.sin(k * 1.7) * 4 + 2, py + k * 7 + 3, 2.2, '#4e8a3a'); }
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(px, py + T - 4, T, 4); break;
    }
    case 'rubble': // montón de piedras talladas (a veces con un trozo de latón)
      slab(c, x, y, px, py, RUIN_BASE, RUIN_SEAM);
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(cx + 2, cy + 6, 13, 6, 0, 0, 7); c.fill();
      for (let k = 0; k < 6; k++) {
        const bx = px + 5 + h(k) * 20, by = py + 6 + h(k + 7) * 16, s2 = 4 + h(k + 3) * 6, v = h(k + 11) * 30;
        c.fillStyle = `rgb(${100 + v | 0},${94 + v | 0},${86 + v | 0})`; c.beginPath(); c.moveTo(bx, by + s2); c.lineTo(bx + s2 * 0.3, by); c.lineTo(bx + s2, by + s2 * 0.2); c.lineTo(bx + s2 * 1.1, by + s2); c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(bx + 1, by + 1, s2 * 0.5, 1);
      }
      if (h(20) < 0.3) { c.fillStyle = '#9a7a3a'; c.fillRect(cx - 6, cy - 2, 12, 2); }
      break;
    case 'pillar': // columna de piedra con anillo de latón y cardenillo
      slab(c, x, y, px, py, RUIN_BASE, RUIN_SEAM);
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(cx + 4, cy + 5, 14, 9, 0, 0, 7); c.fill();
      circ(c, cx, cy, 13, '#6a6258'); circ(c, cx, cy, 11, '#8a8276');
      c.strokeStyle = '#b08a3a'; c.lineWidth = 2.5; c.beginPath(); c.arc(cx, cy, 12, 0, 7); c.stroke();
      c.strokeStyle = 'rgba(90,160,130,.6)'; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, 12, h(1) * 6, h(1) * 6 + 1.6); c.stroke();
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(cx + Math.cos(a) * 7 - 1, cy + Math.sin(a) * 7 - 1, 2, 2); }
      circ(c, cx - 3, cy - 3, 4, 'rgba(255,255,255,.12)'); break;
    case 'socket': { // pedestal octogonal; el aro tiene el color de su sello
      slab(c, x, y, px, py, RUIN_BASE, RUIN_SEAM);
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(cx + 3, cy + 5, 15, 9, 0, 0, 7); c.fill();
      c.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28 + 0.39; c.lineTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14); } c.closePath();
      c.fillStyle = '#5a5248'; c.fill(); c.strokeStyle = '#c8a04a'; c.lineWidth = 2; c.stroke();
      const k = socketAt(x, y), sk = k >= 0 ? SEALS[k][1] : null, col = sk ? ITEMS['seal_' + sk].c : '#888';
      circ(c, cx, cy, 7, '#1e1a16'); c.strokeStyle = col; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, 9.5, 0, 7); c.stroke();
      if (sk && S.end && S.end.seals[sk]) circ(c, cx, cy, 6, col);
      break;
    }
    case 'frame': // bloques del arco: basalto con engranajes de latón y un ojo de cristal
      c.fillStyle = '#2a2420'; c.fillRect(px, py, T, T); c.fillStyle = '#3e342a'; c.fillRect(px + 2, py + 2, T - 4, T - 4);
      c.strokeStyle = '#c8a04a'; c.lineWidth = 2; c.strokeRect(px + 3, py + 3, T - 6, T - 6);
      c.strokeStyle = '#e0b54c'; c.lineWidth = 1.5; c.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * 6.28, r = k & 1 ? 7 : 9; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } c.closePath(); c.stroke();
      circ(c, cx, cy, 3, '#5af0ff'); break;
    case 'portal': case 'return': {
      const gr = c.createRadialGradient(cx, cy, 2, cx, cy, 22); gr.addColorStop(0, g.ruin === 'portal' ? '#3a2a5a' : '#2a4a7a'); gr.addColorStop(1, '#0a0812');
      c.fillStyle = gr; c.fillRect(px, py, T, T);
      for (let k = 0; k < 5; k++) circ(c, px + h(k) * 32, py + h(k + 5) * 32, 0.8 + h(k + 2), 'rgba(200,170,255,.7)');
      break;
    }
    case 'stone': // piedra rúnica en pie (suelta una tablilla)
      slab(c, x, y, px, py, RUIN_BASE, RUIN_SEAM);
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(cx + 4, cy + 10, 11, 5, 0, 0, 7); c.fill();
      c.fillStyle = '#5a5866'; c.beginPath(); c.moveTo(cx - 8, cy + 11); c.lineTo(cx - 9, cy - 8); c.quadraticCurveTo(cx, cy - 16, cx + 9, cy - 8); c.lineTo(cx + 8, cy + 11); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(cx - 8, cy - 7, 3, 17);
      c.strokeStyle = '#5af0ff'; c.lineWidth = 1.4; c.beginPath(); for (let k = 0; k < 4; k++) { const yy = cy - 6 + k * 4.5; c.moveTo(cx - 4, yy); c.lineTo(cx - 4 + h(k) * 8, yy + 2); } c.stroke();
      break;
    case 'heart': { // placas de metal rojizo con venas incandescentes
      const v = (hash2(x >> 1, y >> 1, 4) - 0.5) * 16;
      c.fillStyle = `rgb(${62 + v | 0},${44 + v * 0.6 | 0},${40 + v * 0.5 | 0})`; c.fillRect(px, py, T, T);
      c.fillStyle = 'rgba(0,0,0,.4)'; if (!(x & 1)) c.fillRect(px, py, 2, T); if (!(y & 1)) c.fillRect(px, py, T, 2);
      for (let k = 0; k < 4; k++) circ(c, px + 4 + (k & 1) * 24, py + 4 + (k >> 1) * 24, 1.4, '#9a7a5a');
      if (h(2) < 0.35) { c.strokeStyle = 'rgba(255,120,40,.7)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(px, py + h(3) * 32); c.quadraticCurveTo(cx, cy + (h(4) - 0.5) * 20, px + T, py + h(5) * 32); c.stroke(); }
      break;
    }
    case 'bridge': // tablones con barandillas de latón sobre el abismo
      c.fillStyle = '#0a0812'; c.fillRect(px, py, T, T);
      c.fillStyle = '#6a5038'; c.fillRect(px, py + 2, T, T - 4); c.fillStyle = 'rgba(30,20,10,.55)'; for (let k = 1; k < 4; k++) c.fillRect(px + k * 8, py + 2, 1, T - 4);
      c.fillStyle = '#b08a3a'; c.fillRect(px, py + 2, T, 2); c.fillRect(px, py + T - 4, T, 2);
      for (let k = 0; k < 4; k++) { circ(c, px + 4 + k * 8, py + 3, 1.2, '#e0b54c'); circ(c, px + 4 + k * 8, py + T - 3, 1.2, '#e0b54c'); }
      break;
    case 'core': { const gr = c.createRadialGradient(cx, cy, 2, cx, cy, 24); gr.addColorStop(0, '#ff9a4a'); gr.addColorStop(1, '#5a1a0a'); c.fillStyle = gr; c.fillRect(px, py, T, T); break; }
    default: // abismo: negro, nebulosa y estrellas quietas
      c.fillStyle = '#07060e'; c.fillRect(px, py, T, T);
      if (hash2(x >> 3, y >> 3, 12) < 0.4) { c.fillStyle = `rgba(${90 + h(1) * 60 | 0},40,${120 + h(2) * 80 | 0},.1)`; c.fillRect(px, py, T, T); }
      for (let k = 0; k < 3; k++) if (h(k + 20) < 0.35) circ(c, px + h(k) * 32, py + h(k + 9) * 32, 0.5 + h(k + 4) * 1.1, k ? 'rgba(220,210,255,.8)' : 'rgba(255,230,180,.9)');
  }
}
