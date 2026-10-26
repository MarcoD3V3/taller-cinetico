'use strict';
// =====================================================================================
//  Minijuegos al fabricar: cada familia de piezas tiene el suyo, parecidos pero distintos.
//   · Forjar la hoja (espadas, dagas, colmillos): golpea cuando la marca pise el oro.
//   · Afilar el filo (hachas, hoces, guadañas, lanzas): mantén la presión en la franja.
//   · Templar (picos, martillos, mazas): enfría el metal cuando tenga el color pedido.
//   · Remachar (palas, multiherramientas, excavadoras, arrojadizas): clava cada remache a tiempo.
//   · Tensar y apuntar (arcos, ballestas, armas de fuego): suelta con la tensión justa.
//   · Grabar runas (bastones, varitas): une las estrellas de la runa en orden.
//   · Cocina, Engarce y Mezcla para comidas, joyas/armaduras y pociones.
//  Primero explica cómo se juega y qué mejora; durante la partida, un medidor enseña la
//  calidad que vas sacando; al final se revela la pieza. En armas y herramientas la nota
//  (y tu nivel de fabricación) decide la calidad y sus rasgos (sim/quality.js).
//  Se puede saltar (Esc) y desactivar en Opciones › Juego. Solo al fabricar de uno en uno.
// =====================================================================================
if (OPT.craftGames === undefined) OPT.craftGames = 'auto';
OPT_UI.game[1].push(['craftGames', 'Minijuegos al fabricar', 'select', [['auto', 'Sí, al fabricar de uno en uno'], ['never', 'No, fabricar directo']]]);
{ const r0 = optRow; optRow = row => row[2] === 'select' ? `<label class="orow"><span>${row[1]}</span><select data-optsel="${row[0]}">${row[3].map(([v, n]) => `<option value="${v}" ${OPT[row[0]] === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>` : r0(row); }
document.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.optsel; if (k) { OPT[k] = e.target.value; optSave(); } });
const CG_W = 480, CG_H = 230, GOLD = '#f0c75e';
const cgEase = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const cgRR = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };
// Temperatura del metal: de rojo oscuro a blanco
const HEAT = [['Rojo oscuro', '#7a1a10'], ['Rojo cereza', '#c8231a'], ['Naranja', '#f06a1a'], ['Amarillo', '#f5c030'], ['Blanco', '#fff4d8']];
const heatCol = f => { const n = HEAT.length - 1, i = Math.min(n - 1, Math.floor(f * n)), t = f * n - i; return mixHex(HEAT[i][1], HEAT[i + 1][1], t); };
function mixHex(a, b, t) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
// ---------- Los juegos ----------
// Cada uno: n, i, goal (una frase), steps (cómo se juega), gain (qué mejora), init, draw, y press/release/move
const CG_GAMES = {
  forge: {
    n: 'Forjar la hoja', i: '🔨', goal: 'Da forma a la hoja golpeando el metal caliente en el punto justo.',
    steps: [['👁', 'La marca blanca va y viene'], ['␣', 'Golpea (clic o Espacio) cuando pise el oro'], ['5×', 'Cinco golpes: el oro se estrecha y cambia de sitio']], gain: 'Golpes precisos → más daño y más usos',
    init: G => { G.hits = []; G.N = 5; G.zone = 0.5; G.zw = 0.2; G.ph = 0; G.hammer = 0; },
    draw: (g, G, dt) => {
      const n = G.hits.length, sp = 0.9 + n * 0.22; G.ph += dt * sp; const x = 0.5 + 0.5 * Math.sin(G.ph * Math.PI); G.x = x;
      const L = 60, R = CG_W - 60, y = 92, zx = L + (R - L) * G.zone, zw = (R - L) * G.zw;
      cgRR(g, L, y, R - L, 14, 7); g.fillStyle = '#ffffff10'; g.fill();
      g.save(); g.shadowColor = GOLD; g.shadowBlur = 14; cgRR(g, zx - zw / 2, y, zw, 14, 7); g.fillStyle = GOLD; g.fill(); g.restore();
      cgRR(g, zx - 3, y - 4, 6, 22, 3); g.fillStyle = '#fff8'; g.fill();
      const mx = L + (R - L) * x; g.fillStyle = '#fff'; cgRR(g, mx - 2.5, y - 10, 5, 34, 3); g.fill();
      // Yunque y hoja que va tomando forma
      const ay = 186; g.fillStyle = '#3a3c42'; cgRR(g, CG_W / 2 - 70, ay, 140, 16, 4); g.fill(); g.fillStyle = '#2c2e33'; g.fillRect(CG_W / 2 - 30, ay + 16, 60, 18);
      const f = n / G.N, len = 40 + f * 110, hot = Math.max(0.2, 1 - G.t * 0.03); g.save(); g.shadowColor = heatCol(hot); g.shadowBlur = 18;
      g.fillStyle = heatCol(hot); g.beginPath(); g.moveTo(CG_W / 2 - len / 2, ay - 2); g.lineTo(CG_W / 2 + len / 2 - 12 * f, ay - 2); g.lineTo(CG_W / 2 + len / 2, ay - 6 - 2 * f); g.lineTo(CG_W / 2 + len / 2 - 12 * f, ay - 10 - 4 * f); g.lineTo(CG_W / 2 - len / 2, ay - 10); g.closePath(); g.fill(); g.restore();
      // Martillo
      G.hammer = Math.max(0, G.hammer - dt * 5); const ha = -0.9 + (1 - G.hammer) * 0.9 * (G.hammer > 0 ? 1 : 0) - (G.hammer > 0 ? 0 : 0);
      g.save(); g.translate(CG_W / 2 + 70, ay - 30); g.rotate(G.hammer > 0 ? -1.2 * G.hammer : -0.5 + Math.sin(G.t * 3) * 0.05); g.fillStyle = '#6b4a2a'; g.fillRect(-3, 0, 6, 46); g.fillStyle = '#8a8f99'; cgRR(g, -16, -8, 32, 14, 3); g.fill(); g.restore(); void ha;
    },
    press: G => {
      const d = Math.abs(G.x - G.zone) / (G.zw / 2), s = clamp(1.15 - d * 0.75, 0, 1); G.hits.push(s); G.hammer = 1; G.shake = 4 + s * 4;
      G.burst(CG_W / 2 + 10, 178, s > 0.4 ? heatCol(0.8) : '#888', 10 + s * 22, { up: 1 }); G.judge(s, CG_W / 2, 150);
      G.zw = Math.max(0.07, G.zw * 0.8); G.zone = 0.2 + Math.random() * 0.6;
      if (G.hits.length >= G.N) G.finish(G.avg());
    },
  },
  sharpen: {
    n: 'Afilar el filo', i: '🪨', goal: 'Apoya el filo en la piedra con la presión justa hasta dejarlo como una cuchilla.',
    steps: [['⏺', 'Mantén pulsado para apretar, suelta para aflojar'], ['▮', 'Deja la aguja dentro de la franja verde'], ['🔥', 'Si aprietas de más, el acero se recalienta']], gain: 'Presión constante → más rapidez y filo',
    init: G => { G.p = 0; G.band = 0.55; G.sharp = 0; G.burnT = 0; G.inT = 0; G.rot = 0; },
    draw: (g, G, dt) => {
      G.p = clamp(G.p + (G.down ? 0.75 : -0.6) * dt, 0, 1); G.band = 0.5 + Math.sin(G.t * 0.7) * 0.22; const bw = 0.16;
      const inB = Math.abs(G.p - G.band) < bw / 2, hi = G.p > G.band + bw / 2;
      if (inB) { G.sharp += dt * 0.16; G.inT += dt; } if (hi) G.burnT += dt; G.rot += dt * (4 + G.p * 10);
      if (G.down && G.p > 0.15 && Math.random() < G.p) G.burst(212, 128, hi ? '#ff7a3a' : GOLD, 1, { dir: -0.4, sp: 120, life: 0.4 });
      // Piedra
      const cx = 170, cy = 130, r = 62; g.fillStyle = '#4a4d55'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.strokeStyle = '#ffffff12'; g.lineWidth = 2;
      for (let i = 0; i < 10; i++) { const a = G.rot + i * 0.63; g.beginPath(); g.moveTo(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18); g.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6)); g.stroke(); }
      g.fillStyle = '#2c2e33'; g.beginPath(); g.arc(cx, cy, 10, 0, 7); g.fill();
      // Hoja apoyada
      const bx = 205 - G.p * 12; g.save(); g.translate(bx, 118); g.rotate(-0.25); g.fillStyle = mixHex('#c8ccd4', '#5a7aff', clamp(G.burnT / 3, 0, 1)); g.beginPath(); g.moveTo(0, 0); g.lineTo(150, -6); g.lineTo(160, 6); g.lineTo(0, 12); g.fill(); g.fillStyle = '#6b4a2a'; g.fillRect(150, -4, 40, 12); g.restore();
      // Medidor de presión
      const mx = 400, top = 40, h = 150; cgRR(g, mx, top, 18, h, 9); g.fillStyle = '#ffffff10'; g.fill();
      const by = top + h * (1 - G.band - bw / 2); cgRR(g, mx, by, 18, h * bw, 6); g.fillStyle = '#7fd07a55'; g.fill(); g.strokeStyle = '#7fd07a'; g.lineWidth = 1.5; g.stroke();
      const py = top + h * (1 - G.p); g.fillStyle = hi ? '#ff7a5a' : '#fff'; g.beginPath(); g.moveTo(mx - 10, py); g.lineTo(mx - 2, py - 6); g.lineTo(mx - 2, py + 6); g.fill();
      g.fillStyle = '#ccc'; g.font = '600 11px system-ui'; g.textAlign = 'center'; g.fillText('Presión', mx + 9, top - 8);
      G.progress = clamp(G.sharp, 0, 1); G.live = clamp(1 - G.burnT / 4 - Math.max(0, G.t - 9) / 14, 0, 1);
      g.fillStyle = inB ? '#7fd07a' : hi ? '#ff8a6a' : '#aaa'; g.font = '600 13px system-ui'; g.fillText(inB ? 'Así, constante' : hi ? '¡Demasiado fuerte!' : 'Aprieta más', 290, 214);
      if (inB && ((G.inT * 3) | 0) !== ((G.inT * 3 - dt * 3) | 0)) G.tick();
      if (G.sharp >= 1) G.finish(G.live); else if (G.t > 25) G.finish(G.live * G.sharp);
    },
  },
  temper: {
    n: 'Templar', i: '🌡', goal: 'El acero se endurece al enfriarlo de golpe. Mételo en el agua cuando tenga el color que se pide.',
    steps: [['🎨', 'Mira el color objetivo'], ['〰', 'El metal se calienta y se enfría solo'], ['␣', 'Pulsa justo cuando el color coincida (3 veces)']], gain: 'Color exacto → dureza: más usos y rapidez',
    init: G => { G.hits = []; G.N = 3; G.h = 0; G.dir = 1; G.tg = [0.25, 0.5, 0.75].sort(() => Math.random() - 0.5); G.steam = 0; },
    draw: (g, G, dt) => {
      const n = G.hits.length, sp = 0.32 + n * 0.1; G.h += G.dir * dt * sp; if (G.h > 1) { G.h = 1; G.dir = -1; } if (G.h < 0) { G.h = 0; G.dir = 1; }
      const tg = G.tg[n] ?? 0.5, col = heatCol(G.h);
      // Pieza
      g.save(); g.shadowColor = col; g.shadowBlur = 30 * G.h + 6; g.fillStyle = col; cgRR(g, 150, 70, 180, 34, 8); g.fill(); g.restore();
      // Vapor
      G.steam = Math.max(0, G.steam - dt); if (G.steam > 0) for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(230,235,240,${G.steam * 0.3})`; g.beginPath(); g.arc(170 + i * 28, 60 - (1 - G.steam) * 40 - i % 2 * 8, 10 + (1 - G.steam) * 12, 0, 7); g.fill(); }
      // Cinta de colores con la marca del objetivo y la temperatura
      const L = 60, R = CG_W - 60, y = 150, gr = g.createLinearGradient(L, 0, R, 0); HEAT.forEach(([, c], i) => gr.addColorStop(i / (HEAT.length - 1), c));
      cgRR(g, L, y, R - L, 16, 8); g.fillStyle = gr; g.fill();
      const tx = L + (R - L) * tg; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(tx, y - 6); g.lineTo(tx, y + 22); g.stroke();
      g.fillStyle = heatCol(tg); g.beginPath(); g.arc(tx, y + 32, 7, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
      const hx = L + (R - L) * G.h; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(hx, y - 2); g.lineTo(hx - 6, y - 12); g.lineTo(hx + 6, y - 12); g.fill();
      const name = HEAT[Math.round(tg * (HEAT.length - 1))][0]; g.fillStyle = '#ddd'; g.font = '600 13px system-ui'; g.textAlign = 'center'; g.fillText(`Objetivo: ${name}`, CG_W / 2, 214);
      G.x = G.h; G.zone = tg;
    },
    press: G => { const d = Math.abs(G.h - G.zone), s = clamp(1 - d * 6, 0, 1); G.hits.push(s); G.steam = 1; G.shake = 2; G.burst(240, 88, '#dfe8f0', 14, { up: 1, sp: 60 }); G.judge(s, CG_W / 2, 50); sfx('swing'); if (G.hits.length >= G.N) G.finish(G.avg()); },
  },
  rivet: {
    n: 'Remachar', i: '🔩', goal: 'Une las piezas clavando cada remache cuando el aro se cierre sobre él.',
    steps: [['◯', 'Un aro se encoge sobre cada remache'], ['🖱', 'Haz clic en el remache (o Espacio) cuando el aro lo toque'], ['6×', 'Seis remaches, cada vez más rápidos']], gain: 'Buen ritmo → piezas firmes: más usos y rapidez',
    init: G => { G.hits = []; G.N = 6; G.pts = []; for (let i = 0; i < G.N; i++) G.pts.push({ x: 130 + (i % 3) * 110 + (Math.random() - 0.5) * 30, y: 90 + ((i / 3) | 0) * 70 + (Math.random() - 0.5) * 16 }); G.ct = 0; },
    draw: (g, G, dt) => {
      g.fillStyle = '#3a3c42'; cgRR(g, 90, 60, 300, 140, 16); g.fill(); g.strokeStyle = '#ffffff14'; g.lineWidth = 2; g.stroke();
      const n = G.hits.length, dur = 1.25 - n * 0.1; G.ct += dt;
      G.pts.forEach((p, i) => {
        const done = i < n; g.fillStyle = done ? (G.hits[i] > 0.4 ? GOLD : '#77706a') : i === n ? '#d8dbe2' : '#55585f';
        g.beginPath(); g.arc(p.x, p.y, 9, 0, 7); g.fill(); g.fillStyle = '#0006'; g.beginPath(); g.arc(p.x + 2, p.y + 2, 3, 0, 7); g.fill();
        if (i === n) { const f = 1 - G.ct / dur, rr = 9 + 40 * Math.max(0, f); g.strokeStyle = f < 0.12 && f > -0.08 ? GOLD : '#fff'; g.lineWidth = 2.5; g.beginPath(); g.arc(p.x, p.y, rr, 0, 7); g.stroke(); if (f < -0.25) cgRivetHit(G, 0); }
      });
      G.dur = dur;
    },
    press: (G, x, y) => { const p = G.pts[G.hits.length]; if (!p) return; if (x !== undefined && Math.hypot(x - p.x, y - p.y) > 34) return; const f = 1 - G.ct / G.dur; cgRivetHit(G, clamp(1 - Math.abs(f) * 4.5, 0, 1)); },
  },
  string: {
    n: 'Tensar y apuntar', i: '🎯', goal: 'Tensa la cuerda hasta la fuerza justa y suelta: la flecha irá al centro.',
    steps: [['⏺', 'Mantén pulsado para tensar'], ['⌒', 'La franja dorada marca la tensión justa'], ['↗', 'Suelta dentro de ella (3 tiros)']], gain: 'Tiros al centro → más daño y rapidez',
    init: G => { G.hits = []; G.N = 3; G.ten = 0; G.tz = 0.6; G.arrow = null; },
    draw: (g, G, dt) => {
      if (G.down && !G.arrow) G.ten = Math.min(1.1, G.ten + dt * (0.7 + G.hits.length * 0.15)); else if (!G.arrow) G.ten = Math.max(0, G.ten - dt * 2);
      // Diana
      const dx = 400, dy = 115; [[46, '#e8e0c8'], [34, '#c8231a'], [22, '#e8e0c8'], [10, GOLD]].forEach(([r, c]) => { g.fillStyle = c; g.beginPath(); g.arc(dx, dy, r, 0, 7); g.fill(); });
      (G.marks || []).forEach(m => { g.fillStyle = '#222'; g.beginPath(); g.arc(dx + m.x, dy + m.y, 3, 0, 7); g.fill(); });
      // Arco
      const ax = 90, ay = 115, pull = Math.min(1, G.ten) * 34, bc = ax - 40, tx = bc + Math.cos(0.28 * Math.PI) * 70, ty = Math.sin(0.28 * Math.PI) * 70, sx = tx - pull;
      g.strokeStyle = '#a8784a'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.arc(bc, ay, 70, -0.28 * Math.PI, 0.28 * Math.PI); g.stroke(); g.lineCap = 'butt';
      g.strokeStyle = '#eee'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(tx, ay - ty); g.lineTo(sx, ay); g.lineTo(tx, ay + ty); g.stroke();
      if (!G.arrow) { g.strokeStyle = '#ddd'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(sx, ay); g.lineTo(sx + 84, ay); g.stroke(); g.fillStyle = '#ddd'; g.beginPath(); g.moveTo(sx + 90, ay); g.lineTo(sx + 82, ay - 4); g.lineTo(sx + 82, ay + 4); g.fill(); }
      else { const a = G.arrow; a.t += dt * 3; const k = Math.min(1, a.t), x = ax + 70 + (dx + a.ox - ax - 70) * k, y = ay + (a.oy) * k - Math.sin(k * Math.PI) * 18; g.strokeStyle = '#ddd'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 50, y); g.lineTo(x, y); g.stroke(); if (k >= 1) { (G.marks = G.marks || []).push({ x: a.ox, y: a.oy }); G.burst(dx + a.ox, dy + a.oy, '#fff', 8); G.arrow = null; G.ten = 0; if (G.hits.length >= G.N) G.finish(G.avg()); } }
      // Medidor de tensión
      const L = 60, R = 300, y = 205, zw = 0.14 - G.hits.length * 0.025; cgRR(g, L, y, R - L, 10, 5); g.fillStyle = '#ffffff10'; g.fill();
      g.save(); g.shadowColor = GOLD; g.shadowBlur = 10; cgRR(g, L + (R - L) * (G.tz - zw / 2), y, (R - L) * zw, 10, 5); g.fillStyle = GOLD; g.fill(); g.restore();
      g.fillStyle = G.ten > 1 ? '#ff6b5b' : '#fff'; cgRR(g, L, y + 2, (R - L) * Math.min(1, G.ten), 6, 3); g.fill(); G.zw2 = zw;
    },
    press: () => { },
    release: G => { if (G.arrow || G.ten < 0.05) return; const d = Math.abs(G.ten - G.tz) / (G.zw2 / 2), s = G.ten > 1 ? 0 : clamp(1.1 - d * 0.55, 0, 1); G.hits.push(s); const r = (1 - s) * 44, a = Math.random() * 7; G.arrow = { t: 0, ox: Math.cos(a) * r, oy: Math.sin(a) * r }; G.judge(s, 400, 50); sfx('shoot'); G.tz = 0.35 + Math.random() * 0.5; },
  },
  rune: {
    n: 'Grabar runas', i: '✨', goal: 'Graba la runa que da poder al arma uniendo sus estrellas en orden.',
    steps: [['①', 'Empieza en la estrella 1'], ['🖱', 'Mantén pulsado y pasa por cada estrella en orden'], ['⏳', 'Dos runas, antes de que se apague la luz']], gain: 'Runas limpias y rápidas → más daño y rapidez',
    init: G => { G.hits = []; G.N = 2; cgNewRune(G); },
    draw: (g, G, dt) => {
      G.rt += dt; const lim = 7, f = 1 - G.rt / lim;
      g.strokeStyle = '#b07aff'; g.lineWidth = 3; g.shadowColor = '#b07aff'; g.shadowBlur = 12; g.beginPath(); G.path.forEach((i, k) => { const p = G.stars[i]; k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); }); if (G.down && G.path.length) g.lineTo(G.mx, G.my); g.stroke(); g.shadowBlur = 0;
      G.stars.forEach((p, i) => { const on = G.path.includes(i), nx = i === G.path.length; g.fillStyle = on ? '#e0c8ff' : nx ? '#fff' : '#ffffff55'; g.beginPath(); g.arc(p.x, p.y, nx ? 8 + Math.sin(G.t * 8) * 1.5 : 6, 0, 7); g.fill(); g.fillStyle = '#1a1520'; g.font = '700 9px system-ui'; g.textAlign = 'center'; g.fillText(i + 1, p.x, p.y + 3); });
      cgRR(g, 60, 210, 360, 6, 3); g.fillStyle = '#ffffff10'; g.fill(); cgRR(g, 60, 210, 360 * Math.max(0, f), 6, 3); g.fillStyle = '#b07aff'; g.fill();
      if (f <= 0) cgRuneDone(G, G.path.length / G.stars.length * 0.5);
    },
    press: (G, x, y) => { if (x === undefined) return; G.mx = x; G.my = y; cgRuneTry(G); },
    move: (G, x, y) => { G.mx = x; G.my = y; if (G.down) cgRuneTry(G); },
    release: G => { if (G.path.length && G.path.length < G.stars.length) { G.path = []; G.miss++; G.judge(0, CG_W / 2, 30); } },
  },
  cook: {
    n: 'Cocina', i: '🍳', goal: 'Cocina a fuego justo: ni crudo ni quemado.',
    steps: [['⏺', 'Mantén pulsado para avivar el fuego'], ['◠', 'Deja la aguja en la franja verde'], ['▬', 'Así se llena la barra hasta que esté hecho']], gain: 'Buen punto → a veces sale una ración de más',
    init: G => { G.heat = 0.3; G.fill = 0; G.off = 0; },
    draw: (g, G, dt) => {
      G.heat = clamp(G.heat + (G.down ? 0.55 : -0.42) * dt + Math.sin(G.t * 2.3) * 0.12 * dt, 0, 1); const band = [0.45, 0.65], inB = G.heat >= band[0] && G.heat <= band[1];
      G.fill = clamp(G.fill + (inB ? 0.25 : -0.04) * dt, 0, 1); G.off += inB ? 0 : dt; G.progress = G.fill; G.live = clamp(1 - G.off / 8, 0, 1);
      const cx = CG_W / 2, cy = 150, r = 80; g.lineCap = 'round'; g.lineWidth = 12; g.strokeStyle = '#ffffff12'; g.beginPath(); g.arc(cx, cy, r, Math.PI, 0); g.stroke();
      g.strokeStyle = '#7fd07a'; g.beginPath(); g.arc(cx, cy, r, Math.PI + band[0] * Math.PI, Math.PI + band[1] * Math.PI); g.stroke(); g.lineCap = 'butt';
      const a = Math.PI + G.heat * Math.PI; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (r - 8), cy + Math.sin(a) * (r - 8)); g.stroke();
      for (let i = 0; i < 7; i++) { g.fillStyle = `rgba(255,${110 + i * 18},40,${0.25 + G.heat * 0.6})`; g.beginPath(); g.ellipse(cx - 60 + i * 20, cy + 30 + Math.sin(G.t * 9 + i) * 3, 4 + G.heat * 5, 7 + G.heat * 9, 0, 0, 7); g.fill(); }
      g.fillStyle = inB ? '#7fd07a' : '#ccc'; g.font = '600 13px system-ui'; g.textAlign = 'center'; g.fillText(G.heat < band[0] ? 'Falta fuego' : G.heat > band[1] ? '¡Se quema!' : 'En su punto', cx, 60);
      if (G.fill >= 1) G.finish(G.live); else if (G.t > 25) G.finish(G.fill * 0.6);
    },
  },
  gem: {
    n: 'Engarce', i: '💎', goal: 'Encaja cada gema en el hueco del aro que gira.',
    steps: [['↻', 'El aro gira con un hueco'], ['▼', 'Pulsa cuando el hueco pase por la flecha'], ['3×', 'Tres gemas, cada vez más rápido']], gain: 'Gemas bien puestas → a veces te sobra material',
    init: G => { G.hits = []; G.N = 3; G.ang = 0; G.gems = []; },
    draw: (g, G, dt) => {
      const cx = CG_W / 2, cy = 120, r = 62; G.ang += dt * (1.6 + G.hits.length * 0.55);
      g.lineWidth = 10; g.strokeStyle = '#c8a050'; g.beginPath(); g.arc(cx, cy, r, G.ang + 0.35, G.ang + Math.PI * 2 - 0.35); g.stroke();
      for (const a of G.gems) { g.save(); g.shadowColor = '#8ad0ff'; g.shadowBlur = 10; g.fillStyle = '#8ad0ff'; g.beginPath(); g.arc(cx + Math.cos(a + G.ang) * r, cy + Math.sin(a + G.ang) * r, 7, 0, 7); g.fill(); g.restore(); }
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx, cy - r - 12); g.lineTo(cx - 8, cy - r - 26); g.lineTo(cx + 8, cy - r - 26); g.fill();
    },
    press: G => { const rel = ((Math.PI * 1.5 - G.ang) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2), d = Math.min(rel, Math.PI * 2 - rel), s = clamp(1 - d / 0.6, 0, 1); G.hits.push(s); if (s > 0) G.gems.push(Math.PI * 1.5 - G.ang); G.judge(s, CG_W / 2, 210); G.burst(CG_W / 2, 50, '#8ad0ff', 6 + s * 12); if (G.hits.length >= G.N) G.finish(G.avg()); },
  },
  mix: {
    n: 'Mezcla', i: '⚗', goal: 'Remueve el caldero en círculos hasta que la mezcla cambie de color.',
    steps: [['🖱', 'Mueve el ratón dando vueltas dentro del caldero'], ['🌈', 'El color avanza con cada vuelta'], ['⏱', 'Cuanto antes, mejor']], gain: 'Mezcla rápida → a veces sale una de más',
    init: G => { G.stir = 0; G.last = null; },
    draw: (g, G, dt) => {
      const cx = CG_W / 2, cy = 120, r = 70, p = clamp(G.stir / (Math.PI * 2 * 5), 0, 1); G.progress = p; G.live = clamp(1.15 - G.t / 14, 0.3, 1);
      g.fillStyle = '#2c2e33'; g.beginPath(); g.arc(cx, cy, r + 10, 0, 7); g.fill();
      g.save(); g.shadowColor = `hsl(${120 + p * 160} 70% 50%)`; g.shadowBlur = 24 * p; g.fillStyle = `hsl(${120 + p * 160} 60% ${32 + p * 18}%)`; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.restore();
      for (let i = 0; i < 9; i++) { const a = G.t * (0.8 + p * 3) + i; g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(cx + Math.cos(a) * r * 0.62 * Math.sin(i + 1), cy + Math.sin(a) * r * 0.5, 3, 0, 7); g.fill(); }
      if (p >= 1) G.finish(G.live); else if (G.t > 30) G.finish(p * 0.5);
    },
    move: (G, x, y) => { const dx = x - CG_W / 2, dy = y - 120, a = Math.atan2(dy, dx); if (G.last !== null && Math.hypot(dx, dy) < 95) { let d = a - G.last; if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; G.stir += Math.abs(d); if (Math.random() < 0.15) G.burst(x, y, '#ffffff88', 1, { sp: 20, life: 0.4 }); } G.last = a; },
  },
};
function cgRivetHit(G, s) { const p = G.pts[G.hits.length]; G.hits.push(s); G.ct = 0; G.shake = 2 + s * 3; G.burst(p.x, p.y, s > 0.4 ? GOLD : '#999', 6 + s * 14); G.judge(s, p.x, p.y - 22); sfx(s > 0.4 ? 'beep' : 'swing'); if (G.hits.length >= G.N) G.finish(G.avg()); }
function cgNewRune(G) { const k = 5 + G.hits.length, pts = []; for (let i = 0; i < k; i++) { let p, tries = 0; do { p = { x: 90 + Math.random() * 300, y: 30 + Math.random() * 160 }; } while (tries++ < 40 && pts.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 60)); pts.push(p); } G.stars = pts; G.path = []; G.rt = 0; G.miss = 0; }
function cgRuneTry(G) { const i = G.path.length, p = G.stars[i]; if (!p) return; if (Math.hypot(G.mx - p.x, G.my - p.y) < 16) { G.path.push(i); G.tick(); G.burst(p.x, p.y, '#d8b8ff', 8); if (G.path.length === G.stars.length) cgRuneDone(G, clamp(1.15 - G.rt / 7 * 0.6 - G.miss * 0.15, 0, 1)); } }
function cgRuneDone(G, s) { G.hits.push(s); G.judge(s, CG_W / 2, 30); if (G.hits.length >= G.N) G.finish(G.avg()); else cgNewRune(G); }
function cgKindOf(id) {
  const it = ITEMS[id]; if (!it) return null; const s = it.s || '', T2 = TOOLS[id];
  if (it.weapon || (T2 && T2.kind !== 'util')) {
    if (/^(sword|dagger|fang)$/.test(s)) return 'forge';
    if (/^(baxe|scythe|spear|axe|sickle)$/.test(s) || T2 && /axe|sickle/.test(T2.kind)) return 'sharpen';
    if (/^(mace|hammer|pick)$/.test(s) || T2 && /pick|hammer/.test(T2.kind)) return 'temper';
    if (/^(bow|xbow|gun|sling)$/.test(s)) return 'string';
    if (/^(staff|wand)$/.test(s)) return 'rune';
    return 'rivet';
  }
  if (/plate|rod|gear|ingot|wire|ring|sheet|block/i.test(s) && /Lingote|Placa|Barra|Engranaje|Alambre/.test(it.n)) return 'forge';
  if (it.food) return it.food.w > (it.food.f || 0) && !it.food.f ? 'mix' : 'cook';
  if (it.armor || it.gear || it.rare && /amulet|ring|gem|rune|coin|feather|helm|bootsA|sheet/.test(s)) return 'gem';
  if (it.use || /potion|dust|drop/.test(s)) return 'mix';
  return null;
}
// Compatibilidad con lo que ya llamaba a CG_KIND
const CG_KIND = new Proxy({}, { get: (t, k) => CG_GAMES[k] && { n: CG_GAMES[k].n, i: CG_GAMES[k].i, tip: CG_GAMES[k].goal } });
// ---------- Ventana y bucle ----------
const mCG = document.createElement('div'); mCG.id = 'mCG'; mCG.hidden = true; document.body.appendChild(mCG);
let CG = null;
const cgQual = id => typeof qCanHave === 'function' && qCanHave(id);
function cgLadder(cur) { return `<div class="cgld">${['-2', '-1', '0', '1', '2', '3'].map(k => `<span style="--qc:${Q_TIERS[k].c}" class="${String(cur) === k ? 'on' : ''}">${Q_TIERS[k].n}</span>`).join('')}</div>`; }
function cgOpen(kind, id, done) {
  const K = CG_GAMES[kind], qual = cgQual(id), lv = typeof lvOf === 'function' ? lvOf('craft') : 0;
  CG = { kind, K, id, done, qual, phase: 'intro', t: 0, down: false, fx: [], ft: [], shake: 0, combo: 0, hits: [], N: 0, progress: 0, live: 1, mx: 0, my: 0, over: false };
  const G = CG;
  G.avg = () => G.hits.length ? G.hits.reduce((a, b) => a + b, 0) / G.hits.length : 0;
  G.burst = (x, y, col, n, o = {}) => { for (let i = 0; i < n; i++) { const a = o.dir !== undefined ? o.dir + (Math.random() - 0.5) * 1.2 + Math.PI : o.up ? -Math.PI / 2 + (Math.random() - 0.5) * 2.2 : Math.random() * 7, sp = (o.sp || 140) * (0.4 + Math.random() * 0.8); G.fx.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: o.life || 0.6, l0: o.life || 0.6, c: col, r: 1 + Math.random() * 2 }); } };
  G.tick = () => tone(520 + Math.min(12, G.combo) * 40, 0.04, 'sine', 0.025, 1.2);
  G.judge = (s, x, y) => {
    const tx = s > 0.85 ? '¡Perfecto!' : s > 0.55 ? 'Muy bien' : s > 0.25 ? 'Vale' : 'Fallo', c = s > 0.85 ? GOLD : s > 0.55 ? '#7fd07a' : s > 0.25 ? '#ddd' : '#ff6b5b';
    G.combo = s > 0.55 ? G.combo + 1 : 0; G.ft.push({ x, y, t: 0, tx: tx + (G.combo > 1 ? ` ×${G.combo}` : ''), c, big: s > 0.85 });
    tone(s > 0.85 ? 660 + G.combo * 60 : s > 0.25 ? 440 : 160, s > 0.85 ? 0.12 : 0.07, s > 0.25 ? 'triangle' : 'sawtooth', 0.04, s > 0.85 ? 1.5 : 1);
  };
  G.finish = q => { if (G.phase !== 'play') return; G.q = q; cgResult(); };
  K.init(G);
  const steps = K.steps.map(([ic, tx], i) => `<li><span class="cgsi">${ic}</span><span><small>Paso ${i + 1}</small>${esc(tx)}</span></li>`).join('');
  mCG.innerHTML = `<div class="cgin" style="--cga:${qual ? GOLD : '#8ad0ff'}">
    <header><span class="cgi">${itemImg(id, 32)}</span><div><small>${K.i} ${esc(K.n)}</small><b>${esc(ITEMS[id].n)}</b></div><button class="cgx" data-cg="skip" title="Saltar (Esc)">✕</button></header>
    <div class="cgstage"><canvas id="cgCv"></canvas>
      <div class="cgov" id="cgIntro"><p class="cggoal">${esc(K.goal)}</p><ol class="cgsteps">${steps}</ol>
        <div class="cggain">📈 ${esc(K.gain)}</div>
        ${qual ? `<div class="cgq"><small>Calidad posible · tu nivel de fabricación: ${lv}</small>${cgLadder()}</div>` : ''}
        <button class="cgbtn" data-cg="go">Empezar <kbd>Espacio</kbd></button></div>
      <div class="cgov" id="cgRes" hidden></div>
    </div>
    <div class="cgfoot"><div class="cgmeter"><span id="cgMtxt">Prepárate…</span><i><b id="cgMbar"></b></i></div><span class="mut small"><kbd>Esc</kbd> saltar</span></div></div>`;
  const cv = $('cgCv'), dpr = Math.min(2, devicePixelRatio || 1); cv.width = CG_W * dpr; cv.height = CG_H * dpr; cv._k = dpr;
  mCG.hidden = false; requestAnimationFrame(cgLoop);
}
function cgStart() { if (!CG || CG.phase !== 'intro') return; CG.phase = 'play'; CG.t = 0; const el = $('cgIntro'); if (el) el.classList.add('gone'); setTimeout(() => el && (el.hidden = true), 250); tone(520, 0.08, 'sine', 0.03, 1.5); }
// Medidor en vivo: la calidad hacia la que vas
function cgEstimate(G) { if (G.N && !G.hits.length) return null; const done = G.hits.length ? G.avg() : null, q = done !== null ? done : G.progress > 0 || G.t > 1 ? G.live : null; return q; }
function cgMeter(G) {
  const txt = $('cgMtxt'), bar = $('cgMbar'); if (!txt || !bar) return; const q = cgEstimate(G);
  if (G.phase === 'intro') return; if (q === null) { txt.textContent = 'Vamos…'; return; }
  const p = G.N ? G.hits.length / G.N : G.progress;
  if (G.qual) { const lv = typeof lvOf === 'function' ? lvOf('craft') : 0, s = 0.8 * q + 0.2 * (1 - Math.exp(-lv / 8)), tier = s < 0.16 ? -2 : s < 0.34 ? -1 : s < 0.6 ? 0 : s < 0.78 ? 1 : s < 0.92 ? 2 : 3; txt.innerHTML = `Vas hacia: <b style="color:${Q_TIERS[tier].c}">${Q_TIERS[tier].n}</b>`; bar.style.background = Q_TIERS[tier].c; bar.style.width = (s * 100).toFixed(1) + '%'; }
  else { const st = q >= 0.85 ? 3 : q >= 0.5 ? 2 : 1; txt.innerHTML = `Nota: <b>${'★'.repeat(st)}${'☆'.repeat(3 - st)}</b>`; bar.style.background = GOLD; bar.style.width = (q * 100).toFixed(1) + '%'; }
  bar.parentNode.style.setProperty('--p', (p * 100).toFixed(0) + '%');
}
function cgLoop(now) {
  if (!CG || CG.over) return; const G = CG, cv = $('cgCv'); if (!cv) return;
  const g = cv.getContext('2d'), dt = Math.min(0.05, (now - (G.lt || now)) / 1000); G.lt = now; G.t += dt;
  g.setTransform(cv._k, 0, 0, cv._k, 0, 0); g.clearRect(0, 0, CG_W, CG_H);
  // Fondo: degradado suave y polvo flotando
  const bg = g.createRadialGradient(CG_W / 2, CG_H * 0.6, 20, CG_W / 2, CG_H * 0.6, 320); bg.addColorStop(0, '#22242a'); bg.addColorStop(1, '#141518'); g.fillStyle = bg; g.fillRect(0, 0, CG_W, CG_H);
  for (let i = 0; i < 14; i++) { const x = (i * 97 + G.t * 6 * (1 + i % 3)) % CG_W, y = (i * 53 + Math.sin(G.t * 0.5 + i) * 10 + CG_H) % CG_H; g.fillStyle = '#ffffff08'; g.beginPath(); g.arc(x, y, 1 + i % 2, 0, 7); g.fill(); }
  g.save(); if (G.shake > 0) { g.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake); G.shake = Math.max(0, G.shake - dt * 30); }
  const playing = G.phase === 'play'; if (!playing) { const t0 = G.t; G.K.draw(g, { ...G, down: false, hits: G.hits, burst() { }, finish() { }, tick() { }, judge() { } }, 0); G.t = t0; } else G.K.draw(g, G, dt);
  // Progreso (puntos) arriba
  if (G.N) for (let i = 0; i < G.N; i++) { const h = G.hits[i], x = CG_W / 2 + (i - (G.N - 1) / 2) * 16; g.fillStyle = h === undefined ? '#ffffff22' : h > 0.85 ? GOLD : h > 0.55 ? '#7fd07a' : h > 0.25 ? '#bbb' : '#ff6b5b'; g.beginPath(); g.arc(x, 16, h === undefined ? 3.5 : 5, 0, 7); g.fill(); }
  else if (playing) { cgRR(g, CG_W / 2 - 60, 12, 120, 6, 3); g.fillStyle = '#ffffff14'; g.fill(); cgRR(g, CG_W / 2 - 60, 12, 120 * G.progress, 6, 3); g.fillStyle = GOLD; g.fill(); }
  // Partículas y textos
  for (let i = G.fx.length - 1; i >= 0; i--) { const p = G.fx[i]; p.l -= dt; if (p.l <= 0) { G.fx.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.vx *= 0.98; g.globalAlpha = p.l / p.l0; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  for (let i = G.ft.length - 1; i >= 0; i--) { const f = G.ft[i]; f.t += dt; if (f.t > 0.9) { G.ft.splice(i, 1); continue; } const k = cgEase(Math.min(1, f.t * 4)); g.globalAlpha = 1 - Math.max(0, f.t - 0.5) / 0.4; g.font = `800 ${f.big ? 20 : 15}px system-ui`; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = '#000a'; const y = f.y - f.t * 26; g.save(); g.translate(f.x, y); g.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); g.strokeText(f.tx, 0, 0); g.fillStyle = f.c; g.fillText(f.tx, 0, 0); g.restore(); }
  g.globalAlpha = 1; if (G.combo > 2 && playing) { g.font = '800 12px system-ui'; g.textAlign = 'right'; g.fillStyle = GOLD; g.fillText(`Racha ×${G.combo}`, CG_W - 14, 20); }
  g.restore(); cgMeter(G);
  requestAnimationFrame(cgLoop);
}
// ---------- Final: se revela la pieza ----------
function cgResult() {
  const G = CG; G.phase = 'result'; const q = G.q, id = G.id;
  G.roll = G.qual ? qRoll(id, q) : null;
  const box = $('cgRes'); if (!box) return;
  let body;
  if (G.roll) {
    const r = G.roll, T2 = Q_TIERS[r.tier], vid = r.id, diff = typeof qDiff === 'function' ? qDiff(vid) : [];
    body = `<div class="cgrev" style="--qc:${T2.c}"><div class="cgstars">${[0, 1, 2, 3, 4].map(i => `<span style="animation-delay:${0.15 + i * 0.12}s" class="${i < T2.st ? 'on' : ''}">★</span>`).join('')}</div>
      <div class="cgtier">${T2.n}</div><div class="cgname">${itemImg(id, 28)} ${esc(ITEMS[vid].n)}</div>
      ${r.traits.length ? `<div class="qtr">${r.traits.map(k => `<span class="${Q_TRAITS[k].good ? 'up' : 'down'}">${Q_TRAITS[k].n}</span>`).join('')}</div>` : ''}
      <div class="qdf">${diff.map(([a, v, g]) => `<span class="${g ? 'up' : 'down'}">${a} ${v}</span>`).join('') || '<span class="mut">Igual que una normal</span>'}</div>
      ${cgLadder(r.tier)}
      <p class="cgwhy">Minijuego <b>${q < 0 ? 'saltado' : Math.round(q * 100) + ' %'}</b> · nivel de fabricación <b>${Math.round(r.skill * 100)} %</b>${q < 0 ? '<br>Si juegas, la calidad suele ser mejor.' : ''}</p></div>`;
    tone(r.tier >= 2 ? 880 : r.tier >= 0 ? 600 : 260, 0.25, 'triangle', 0.05, r.tier >= 0 ? 1.5 : 0.7);
    if (r.tier >= 2) setTimeout(() => { if (CG === G) for (let i = 0; i < 4; i++) G.burst(CG_W / 2 + (Math.random() - 0.5) * 200, 120, T2.c, 18, { up: 1, sp: 200 }); }, 500);
  } else {
    const st = q >= 0.85 ? 3 : q >= 0.5 ? 2 : q >= 0 ? 1 : 0, txt = q >= 0.85 ? '¡Perfecto! Te llevas un extra' : q >= 0.5 ? 'Bien hecho: +experiencia' : q >= 0 ? 'Hecho' : 'Fabricado sin minijuego';
    body = `<div class="cgrev" style="--qc:${GOLD}"><div class="cgstars">${[0, 1, 2].map(i => `<span style="animation-delay:${0.15 + i * 0.12}s" class="${i < st ? 'on' : ''}">★</span>`).join('')}</div><div class="cgtier">${txt}</div><div class="cgname">${itemImg(id, 28)} ${esc(ITEMS[id].n)}</div></div>`;
  }
  box.innerHTML = body + `<button class="cgbtn" data-cg="ok">Continuar <kbd>Espacio</kbd></button>`; box.hidden = false;
  if (q < 0) cgClose(); // saltado: sin pantalla final
}
function cgClose() { const G = CG; if (!G || G.over) return; G.over = true; mCG.hidden = true; CG = null; G.done(G.q, G.roll); }
function cgSkip() { if (!CG) return; if (CG.phase === 'result') return cgClose(); CG.phase = 'play'; CG.finish(-1); }
// ---------- Controles ----------
const cgPos = e => { const r = $('cgCv').getBoundingClientRect(); return [(e.clientX - r.left) * CG_W / r.width, (e.clientY - r.top) * CG_H / r.height]; };
function cgPress(x, y) { const G = CG; if (!G) return; if (G.phase === 'intro') return cgStart(); if (G.phase === 'result') return cgClose(); G.down = true; G.K.press && G.K.press(G, x, y); }
function cgRelease() { const G = CG; if (!G || !G.down) return; G.down = false; if (G.phase === 'play' && G.K.release) G.K.release(G); }
mCG.addEventListener('mousedown', e => { const b = e.target.closest('[data-cg]'); if (b) { e.preventDefault(); const a = b.dataset.cg; if (a === 'skip') cgSkip(); else if (a === 'go') cgStart(); else if (a === 'ok') cgClose(); return; } if (!e.target.closest('.cgstage')) return; e.preventDefault(); const [x, y] = cgPos(e); if (CG) { CG.mx = x; CG.my = y; } cgPress(x, y); });
addEventListener('mouseup', () => cgRelease());
mCG.addEventListener('mousemove', e => { if (!CG || CG.phase !== 'play' || !$('cgCv')) return; const [x, y] = cgPos(e); CG.mx = x; CG.my = y; CG.K.move && CG.K.move(CG, x, y); });
addEventListener('keydown', e => { if (!CG) return; e.stopImmediatePropagation(); if (e.key === 'Escape') { e.preventDefault(); cgSkip(); } else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) cgPress(); } }, true);
addEventListener('keyup', e => { if (CG && (e.key === ' ' || e.key === 'Enter')) cgRelease(); }, true);
// ---------- Enganche con el banco / la fabricación en el bolsillo ----------
{ const c0 = craftDirect; craftDirect = (r, k) => {
  const kind = cgKindOf(r.out);
  if (k !== 1 || OPT.craftGames === 'never' || !kind || CG || !crUsable(r)) return c0(r, k);
  const need = benchNeed(r); if (Object.keys(need).some(id => invCount(id) < need[id])) return c0(r, k);
  cgOpen(kind, r.out, (q, roll) => {
    const before = c0own2(r.out); c0(r, 1); if (c0own2(r.out) <= before) return;
    // Armas y herramientas: la pieza fabricada pasa a tener su calidad
    if (roll && roll.id !== r.out) { const i = S.inv.findIndex(s => s && s.id === r.out); if (i >= 0) { const s = S.inv[i]; if (s.n > 1) { s.n--; invAdd(roll.id, 1); } else S.inv[i] = { id: roll.id, n: 1 }; invVersion++; refreshInvUI(true); } }
    if (roll) { gainXP('craft', 2 + Math.max(0, roll.tier) * 2); if (roll.tier >= 2) toast(`${qStars(roll.tier)} ¡${Q_TIERS[roll.tier].n}! ${ITEMS[roll.id].n}`, true); return; }
    if (q >= 0.85) { const it = ITEMS[r.out], stack = !(it.tool || it.weapon || it.armor || it.gear); if (stack) { invAdd(r.out, r.n); toast(`★★★ ¡Perfecto! +${r.n} ${it.n} de regalo`); } else { const back = r.teeth && r.teeth[0]; if (back) { invAdd(back, 1); toast(`★★★ ¡Perfecto! Te sobra 1 ${ITEMS[back].n}`); } } gainXP('craft', 6); }
    else if (q >= 0.5) gainXP('craft', 3);
  });
}; }
const c0own2 = id => { let n = 0; for (const s of S.inv) if (s && s.id === id) n += s.n; return n; };
// Con un minijuego abierto, Esc lo salta (no abre el menú de pausa por debajo) y nada lo tapa
let _cgEsc = 0; const cgEscNow = () => { _cgEsc = performance.now(); cgSkip(); };
{ const p0 = openPause; openPause = pane => { if (CG) { cgEscNow(); return; } if (performance.now() - _cgEsc < 400 || (typeof CL !== 'undefined' && CL)) return; return p0(pane); }; }
{ const c0 = closeModal; closeModal = () => { if (CG) { cgEscNow(); return; } if (performance.now() - _cgEsc < 400) return; return c0(); }; }
// Seguridad: si un fotograma falla, el minijuego sigue (no se queda congelado) y siempre se puede salir
{ const l0 = cgLoop; cgLoop = now => { try { l0(now); } catch (e) { console.warn('minijuego', e); if (CG && !CG.over) requestAnimationFrame(cgLoop); } }; }
{ const c0 = cgClose; cgClose = () => { const G = CG; try { c0(); } catch (e) { console.warn('minijuego', e); } if (CG === G && G) { CG = null; mCG.hidden = true; try { G.done(G.q ?? -1, G.roll); } catch (e) { } } }; }
mCG.addEventListener('click', e => { if (e.target.closest('[data-cg="skip"]') && CG) { if (CG.phase === 'result') cgClose(); else cgSkip(); } });
