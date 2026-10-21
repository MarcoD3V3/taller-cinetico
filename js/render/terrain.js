'use strict';
// Dibujo de una casilla de terreno dentro de un chunk pre-renderizado (se hace una sola vez).
// px,py: esquina de la casilla en el canvas · h: usos restantes (tamaño de la vegetación)
const rgbs = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
function drawGround(c, x, y, t, px, py) {
  const g = GI[t];
  if (!g.ruin && !g.abyss) { // textura detallada ya pintada (render/tiletex.js) + hoyos y bordes
    if (!_baseDone) c.drawImage(tileTex(t, (hash2(x, y, 51) * TEX_VARS) | 0), px, py);
    if (g.hole) { const dp = depthAt(x, y); if (dp > 1) { c.fillStyle = `rgba(0,0,0,${Math.min(0.5, (dp - 1) * 0.12)})`; c.fillRect(px, py, T, T); } }
    tileEdges(c, x, y, t, px, py);
    return;
  }
  const col = groundRGB(x, y, t);
  c.fillStyle = rgbs(col); c.fillRect(px, py, T, T);
  if (g.ruin || g.abyss) { drawRuin(c, x, y, g, px, py); return; } // render/ruins.js
  if (g.liquid) {
    if (g.glow) { // lava: manchas incandescentes
      for (let k = 0; k < 3; k++) { c.fillStyle = k ? 'rgba(255,200,80,.55)' : 'rgba(120,20,10,.4)'; c.beginPath(); c.ellipse(px + 4 + hash2(x, y, k) * 24, py + 4 + hash2(x, y, k + 5) * 24, 3 + hash2(x, y, k + 9) * 5, 2 + hash2(x, y, k + 2) * 3, 0, 0, 7); c.fill(); }
    } else if (g.bubble) { c.strokeStyle = g.bubble; c.lineWidth = 1; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(px + 5 + hash2(x, y, k) * 22, py + 5 + hash2(x, y, k + 5) * 22, 1.5 + hash2(x, y, k + 3) * 1.8, 0, 7); c.stroke(); } }
    else if (hash2(x, y, 9) < 0.3) { c.strokeStyle = g.wave + '30'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(px + 6, py + 14); c.quadraticCurveTo(px + 12, py + 10, px + 18, py + 14); c.stroke(); }
    if (g.coral) for (let k = 0; k < 4; k++) { const cc = ['#ff7a7a', '#ffb05a', '#e86ad0', '#7ae0d0'][(hash2(x, y, k + 40) * 4) | 0]; circ(c, px + 5 + hash2(x, y, k + 20) * 22, py + 5 + hash2(x, y, k + 30) * 22, 2 + hash2(x, y, k) * 2.5, cc); }
    if (g.kelp) { c.strokeStyle = '#2e6a3a'; c.lineWidth = 2; for (let k = 0; k < 3; k++) { const kx = px + 6 + hash2(x, y, k) * 20; c.beginPath(); c.moveTo(kx, py + 28); c.quadraticCurveTo(kx + 5, py + 18, kx - 2, py + 6); c.stroke(); } }
    return;
  }
  if (g.dot) for (let k = 0; k < 4; k++) circ(c, px + 5 + hash2(x, y, k) * 22, py + 5 + hash2(x, y, k + 9) * 22, 2.6 + hash2(x, y, k + 3) * 1.8, g.dot);
  else if (g.rock && hash2(x, y, 4) < 0.5) { c.fillStyle = 'rgba(0,0,0,.13)'; c.fillRect(px + 8 + hash2(x, y, 5) * 12, py + 8 + hash2(x, y, 6) * 12, 6, 4); }
  else if (g.tuft && hash2(x, y, 3) < 0.2) { c.fillStyle = g.tuft + '50'; c.fillRect(px + hash2(x, y, 1) * 26, py + hash2(x, y, 2) * 26, 2, 5); }
  else if (g.speck) { for (let k = 0; k < 3; k++) { c.fillStyle = g.speck + '66'; c.fillRect(px + hash2(x, y, k) * 28, py + hash2(x, y, k + 4) * 28, 2, 2); } }
  else if (g.crack && hash2(x, y, 7) < 0.4) { c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(px + 4 + hash2(x, y, 1) * 10, py + 6); c.lineTo(px + 14, py + 16); c.lineTo(px + 26, py + 22 + hash2(x, y, 2) * 6); c.stroke(); }
  else if (g.band) { c.fillStyle = 'rgba(255,220,180,.12)'; c.fillRect(px, py + ((y * 7) & 15) + 4, T, 4); }
  if (g.solid && !g.tree && !g.plant) { c.fillStyle = 'rgba(255,255,255,.16)'; c.fillRect(px, py, T, 3); c.fillRect(px, py, 2, T); c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(px, py + T - 5, T, 5); c.fillRect(px + T - 2, py, 2, T); }
  if (g.hole) { const dp = depthAt(x, y); if (dp > 1) { c.fillStyle = `rgba(0,0,0,${Math.min(0.5, (dp - 1) * 0.12)})`; c.fillRect(px, py, T, T); } c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(px + 2, py + 2, T - 4, T - 4); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(px + 2, py + 2, T - 4, 5); }
  if (g.cobble) { c.strokeStyle = 'rgba(40,38,36,.55)'; c.lineWidth = 1.2; for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(px + 8 + (k & 1) * 16 + (hash2(x, y, k) - 0.5) * 3, py + 8 + (k >> 1) * 16, 6.5, 5.5, 0, 0, 7); c.stroke(); } }
  if (g.planks) { c.fillStyle = 'rgba(60,36,16,.45)'; for (let k = 1; k < 4; k++) c.fillRect(px, py + k * 8, T, 1); c.fillRect(px + ((x * 13 + y * 7) & 15) + 4, py, 1, T); }
  if (g.bricks) { c.fillStyle = 'rgba(230,210,190,.35)'; for (let k = 0; k < 4; k++) { c.fillRect(px, py + k * 8, T, 1); c.fillRect(px + (k & 1 ? 8 : 0) + 4, py + k * 8, 1, 8); c.fillRect(px + (k & 1 ? 8 : 0) + 20, py + k * 8, 1, 8); } }
  if (g.pit) for (let k = 0; k < 2; k++) { c.fillStyle = 'rgba(15,10,8,.75)'; c.beginPath(); c.ellipse(px + 8 + hash2(x, y, k) * 16, py + 8 + hash2(x, y, k + 4) * 16, 6, 4, hash2(x, y, k + 7) * 3, 0, 7); c.fill(); }
  if (g.vent) { circ(c, px + 16, py + 16, 9, '#5b5638', '#2a2818'); circ(c, px + 16, py + 16, 4, '#1a1a12'); }
  if (g.vent2) { circ(c, px + 16, py + 16, 8, '#2a2622', '#1a1612'); circ(c, px + 16, py + 16, 4, '#e8e04a'); c.fillStyle = 'rgba(232,224,74,.3)'; circ(c, px + 16, py + 16, 11, 'rgba(232,224,74,.18)'); }
}
function drawTree(c, x, y, tr, px, py, h) {
  const cx = px + 16 + (hash2(x, y, 31) - 0.5) * 4, cy = py + 16 + (hash2(x, y, 32) - 0.5) * 4, k = 0.6 + 0.4 * h;
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(cx + 3, cy + 6, 13 * k, 8 * k, 0, 0, 7); c.fill();
  switch (tr.s) {
    case 'round': { const r = (tr.big ? 13 : 10) * k; if (tr.trunk) { c.fillStyle = tr.trunk; c.fillRect(cx - 2, cy, 4, 9); c.fillStyle = '#2a2a2a'; c.fillRect(cx - 2, cy + 3, 4, 1); } circ(c, cx, cy, r + 3, tr.a); circ(c, cx - 3, cy - 3, r * 0.7, tr.b); if (tr.vine) { c.strokeStyle = '#3a5a24'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx - r, cy); c.lineTo(cx - r, cy + 8); c.moveTo(cx + r - 2, cy + 2); c.lineTo(cx + r - 2, cy + 10); c.stroke(); } break; }
    case 'cone': for (let i = 0; i < 3; i++) { const w = (12 - i * 3) * k, yy = cy + 6 - i * 6 * k; c.beginPath(); c.moveTo(cx - w, yy + 4); c.lineTo(cx, yy - 8 * k); c.lineTo(cx + w, yy + 4); c.closePath(); c.fillStyle = i === 2 && tr.b === '#e8f0f2' ? tr.b : i % 2 ? tr.b : tr.a; c.fill(); } break;
    case 'palm': c.strokeStyle = '#8a6a3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(cx, cy + 10); c.quadraticCurveTo(cx + 3, cy + 2, cx, cy - 4); c.stroke(); c.fillStyle = tr.a; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.beginPath(); c.ellipse(cx + Math.cos(a) * 8, cy - 4 + Math.sin(a) * 6, 8 * k, 2.6, a, 0, 7); c.fill(); } circ(c, cx, cy - 3, 2.5, '#6a4a2a'); break;
    case 'jungle': circ(c, cx, cy, 14 * k, tr.a); circ(c, cx - 5, cy - 4, 8 * k, tr.b); circ(c, cx + 5, cy + 3, 7 * k, tr.b); break;
    case 'flat': c.fillStyle = '#6a4a2a'; c.fillRect(cx - 1.5, cy - 2, 3, 12); c.beginPath(); c.ellipse(cx, cy - 4, 15 * k, 6 * k, 0, 0, 7); c.fillStyle = tr.a; c.fill(); c.beginPath(); c.ellipse(cx - 2, cy - 6, 10 * k, 3.5 * k, 0, 0, 7); c.fillStyle = tr.b; c.fill(); break;
    case 'mangrove': c.strokeStyle = '#5a4030'; c.lineWidth = 1.5; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(cx, cy + 2); c.quadraticCurveTo(cx + i * 8, cy + 6, cx + i * 11, cy + 13); c.stroke(); } circ(c, cx, cy - 2, 10 * k, tr.a); circ(c, cx - 3, cy - 5, 6 * k, tr.b); break;
    case 'dead': c.strokeStyle = tr.a; c.lineWidth = 2.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx, cy + 10); c.lineTo(cx, cy - 6); c.moveTo(cx, cy - 1); c.lineTo(cx - 7, cy - 8); c.moveTo(cx, cy + 2); c.lineTo(cx + 7, cy - 5); c.stroke(); break;
    case 'baobab': c.fillStyle = '#8a7058'; c.fillRect(cx - 5, cy - 4, 10, 14); circ(c, cx, cy - 7, 11 * k, tr.a); circ(c, cx - 3, cy - 9, 6 * k, tr.b); break;
    case 'mush': c.fillStyle = '#e8dcc8'; c.fillRect(cx - 3, cy - 2, 6, 11); c.beginPath(); c.ellipse(cx, cy - 3, 13 * k, 9 * k, 0, 0, 7); c.fillStyle = tr.a; c.fill(); for (let i = 0; i < 4; i++) circ(c, cx - 7 + hash2(x, y, i) * 14, cy - 8 + hash2(x, y, i + 4) * 8, 1.8, tr.b); break;
    case 'crystal': for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.45, l = (11 + i % 2 * 4) * k; c.beginPath(); c.moveTo(cx - 3, cy + 6); c.lineTo(cx + Math.cos(a) * l, cy + 6 + Math.sin(a) * l * 1.3); c.lineTo(cx + 3, cy + 6); c.closePath(); c.fillStyle = i % 2 ? tr.b : tr.a; c.fill(); } break;
  }
}
function drawPlant(c, x, y, p, px, py) {
  const cx = px + 16 + (hash2(x, y, 33) - 0.5) * 6, cy = py + 16 + (hash2(x, y, 34) - 0.5) * 6;
  switch (p.s) {
    case 'bamboo': for (let i = 0; i < 4; i++) { const bx = px + 5 + i * 7 + hash2(x, y, i) * 3; c.fillStyle = i % 2 ? '#6aa83a' : '#8ac850'; c.fillRect(bx, py + 2, 3, 28); c.fillStyle = '#4a7a2a'; c.fillRect(bx, py + 10, 3, 1.5); c.fillRect(bx, py + 20, 3, 1.5); } break;
    case 'cactus': c.fillStyle = '#3e7a34'; rr(c, cx - 3, cy - 10, 6, 20, 3); c.fill(); rr(c, cx - 9, cy - 4, 4, 8, 2); c.fill(); rr(c, cx + 5, cy - 7, 4, 7, 2); c.fill(); c.fillStyle = '#2a5a24'; c.fillRect(cx - 0.5, cy - 9, 1, 18); break;
    case 'bush': circ(c, cx, cy, 8, '#2e5e2a'); circ(c, cx - 3, cy - 2, 5, '#3e7a34'); for (let i = 0; i < 5; i++) circ(c, cx - 6 + hash2(x, y, i) * 12, cy - 5 + hash2(x, y, i + 3) * 10, 1.6, p.c); break;
    case 'flowers': for (let i = 0; i < 6; i++) { const fx = px + 4 + hash2(x, y, i) * 24, fy = py + 4 + hash2(x, y, i + 6) * 24, col = ['#f4e04a', '#e84a6a', '#f4f4f4', '#7a6ae8', '#f49a3a'][(hash2(x, y, i + 12) * 5) | 0]; c.fillStyle = '#3e7a34'; c.fillRect(fx - 0.5, fy, 1, 4); circ(c, fx, fy, 2.2, col); } break;
    case 'tall': c.strokeStyle = p.c; c.lineWidth = 1.2; for (let i = 0; i < 6; i++) { const gx = px + 4 + hash2(x, y, i) * 24; c.beginPath(); c.moveTo(gx, py + 26); c.lineTo(gx + (hash2(x, y, i + 9) - 0.5) * 6, py + 10 + hash2(x, y, i + 4) * 8); c.stroke(); } break;
    case 'dead': c.strokeStyle = '#8a6a3a'; c.lineWidth = 1; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.5; c.beginPath(); c.moveTo(cx, cy + 6); c.lineTo(cx + Math.cos(a) * 9, cy + 6 + Math.sin(a) * 9); c.stroke(); } break;
    case 'mush': c.fillStyle = '#e8dcc8'; c.fillRect(cx - 1, cy - 1, 2, 6); c.beginPath(); c.ellipse(cx, cy - 1, 5, 3.5, 0, Math.PI, 0); c.fillStyle = p.c; c.fill(); circ(c, cx + 6, cy + 5, 2.5, p.c); break;
    case 'puff': c.strokeStyle = '#6a7a3a'; c.lineWidth = 1; for (let i = 0; i < 3; i++) { const fx = cx - 6 + i * 6; c.beginPath(); c.moveTo(fx, cy + 8); c.lineTo(fx, cy - 2); c.stroke(); circ(c, fx, cy - 3, 3, '#f6f4ee'); } break;
    case 'reeds': c.strokeStyle = '#7a8a3a'; c.lineWidth = 1.6; for (let i = 0; i < 5; i++) { const rx = px + 5 + i * 5; c.beginPath(); c.moveTo(rx, py + 28); c.lineTo(rx + 1, py + 6); c.stroke(); c.fillStyle = '#6a4a2a'; c.fillRect(rx - 1, py + 6, 3, 6); } break;
    case 'shard': for (let i = 0; i < 3; i++) { const sx = cx - 6 + i * 6, l = 10 + i % 2 * 5; c.beginPath(); c.moveTo(sx - 3, cy + 7); c.lineTo(sx, cy + 7 - l); c.lineTo(sx + 3, cy + 7); c.closePath(); c.fillStyle = i % 2 ? '#d4c0ff' : '#9a7ae0'; c.fill(); } break;
    case 'spike': c.beginPath(); c.moveTo(cx - 7, cy + 9); c.lineTo(cx, cy - 14); c.lineTo(cx + 7, cy + 9); c.closePath(); c.fillStyle = '#c8ecff'; c.fill(); c.strokeStyle = '#8ac0e0'; c.stroke(); break;
    case 'lily': circ(c, cx, cy, 6, '#4a8a3a'); c.fillStyle = GI[G.SWAMPWATER] ? rgbs(GI[G.SWAMPWATER].c) : '#333'; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, 6, -0.3, 0.3); c.fill(); if (hash2(x, y, 5) < 0.4) circ(c, cx - 2, cy - 1, 1.8, '#f4b0d0'); break;
  }
}
function drawTerrainTile(c, x, y, t, px, py, hpLeft) {
  const g = GI[t];
  if (g.flora) {
    drawGround(c, x, y, g.u >= 0 ? g.u : G.GRASS, px, py);
    if (g.tree && _treeLayer) { // árbol grande en su propia capa: aquí solo la base del tronco
      const sz = g.hp ? clamp(Math.round((hpLeft || g.hp) / g.hp * 3), 0, 3) : 3; _treeList.push(x, y, t, ((hash2(x, y, 61) * 4) | 0) | (sz << 2));
      c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(px + 18, py + 25, 11, 4, 0, 0, 7); c.fill(); return;
    }
    if (g.tree) drawTree(c, x, y, g.tree, px, py, g.hp ? clamp(hpLeft / g.hp, 0.3, 1) : 1);
    else drawPlant(c, x, y, g.plant, px, py);
  } else { drawGround(c, x, y, t, px, py); if (_treeLayer) drawDecor(c, x, y, t, px, py); } // ambiente (render/decor.js)
}
