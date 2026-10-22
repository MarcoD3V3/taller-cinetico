'use strict';
// =====================================================================================
//  Escalar sin escalera: subir por un pozo hacia la capa de arriba (o salir de un hoyo
//  hondo) es un minijuego de unos 20 segundos. Hay 10 distintos, todos de escalada, y
//  cada uno enseña algo real (presas, tres apoyos, descansar, lances, chimeneas, chapar,
//  fisuras, desprendimientos, respirar, leer la vía). La dificultad y el ambiente dependen
//  de la capa: roca mojada, frío que entumece, esporas que tapan la vista, presas que
//  queman, oscuridad casi total. Si se te acaba el agarre, caes y te haces daño (más cuanto
//  más alto ibas). Se juega con teclado, ratón o dedo. Esc: soltarse.
// =====================================================================================
const CL_W = 560, CL_H = 380;
// Ambiente de cada capa (0 = superficie y hoyos)
const CL_ENV = [
  { n: 'Tierra', a: '#6e5a42', b: '#4a3a2a', c: '#8a7458', drain: 0, bad: 'crack', hz: 'stone' },
  { n: 'Roca mojada', a: '#4e5862', b: '#323a42', c: '#6a7884', drain: 0.012, bad: 'wet', hz: 'drip', fx: 'drip', note: 'La roca está mojada: las presas brillantes resbalan.' },
  { n: 'Frío que entumece', a: '#3e4260', b: '#282a40', c: '#7a7aa8', drain: 0.016, bad: 'ice', hz: 'icicle', fx: 'frost', note: 'El frío entumece las manos: el agarre se gasta antes.' },
  { n: 'Esporas', a: '#4a5432', b: '#2e3420', c: '#7a8a4a', drain: 0.01, bad: 'spore', hz: 'acid', fx: 'spores', note: 'Las esporas tapan la vista a ratos.' },
  { n: 'Roca ardiente', a: '#5e2e20', b: '#3a1a12', c: '#a04a2a', drain: 0.014, bad: 'hot', hz: 'lava', fx: 'embers', note: 'Las presas al rojo queman: no te agarres a ellas.' },
  { n: 'Oscuridad', a: '#2a2240', b: '#16121e', c: '#5a4a8a', drain: 0.012, bad: 'fake', hz: 'shard', fx: 'dark', note: 'Casi no ves: solo lo que alumbras de cerca.' },
];
const CL_BAD = { crack: ['Presa agrietada', '#9a8a70', 'Las presas agrietadas se sueltan: tócalas antes de cargar el peso.'], wet: ['Presa mojada', '#8ac8f0', 'La roca mojada resbala: busca presas secas y rugosas.'],
  ice: ['Presa helada', '#c8e8ff', 'El hielo no sujeta: busca roca desnuda.'], spore: ['Vaina de esporas', '#b8e040', 'Las vainas revientan y sueltan esporas: no las toques.'],
  hot: ['Presa al rojo', '#ff6a2a', 'La roca al rojo quema: espera a que se enfríe o busca otra.'], fake: ['Sombra de presa', '#6a5aa8', 'En la oscuridad, lo que parece una presa puede ser una sombra: fíjate en si brilla de verdad.'] };
const mClimb = document.createElement('div'); mClimb.id = 'mClimb'; mClimb.hidden = true; document.body.appendChild(mClimb);
let CL = null;
const clRand = (a, b) => a + Math.random() * (b - a);
// Lo bien que agarras: forma física, guantes, aguante y salud de las manos
function clGripMul() {
  let m = 1 - 0.025 * (typeof lvOf === 'function' ? lvOf('fit') : 0);
  if (S.equip && S.equip.hands) m -= 0.18;
  if (survOn() && S.pc && S.pc.stam < 20) m += 0.3;
  return clamp(m, 0.45, 1.4);
}
function clLose(a, why) { if (!CL || CL.phase !== 'play') return; CL.grip -= a * CL.gm; CL.shake = 0.25; CL.misses++; if (why) clFlash(why, '#ff8a6a'); tone(140, 0.1, 'square', 0.03, 0.6); }
function clGood(why) { if (why) clFlash(why, '#a8f08a'); tone(520 + CL.prog * 300, 0.06, 'sine', 0.03, 1.4); }
function clFlash(t, c) { CL.fl.push({ t, c, a: 1.4 }); if (CL.fl.length > 3) CL.fl.shift(); }

// ---------- Los 10 juegos ----------
// Cada juego: init(C), step(C, dt), draw(g, C), key(C, k), ptr(C, tipo, x, y)
const CLIMB_GAMES = {
  // 1. Elegir presas sanas
  holds: { n: 'Elige la presa', i: '🪨', how: 'Haz clic en la presa siguiente (o ← ↑ →). Solo llegas a la columna de al lado. Evita las presas malas.', tip: 'Prueba cada presa con un toque antes de cargar el peso: si suena hueca o se mueve, no te fíes.',
    init(C) { C.col = 2; C.need = 12 + C.d * 2; C.done = 0; C.rows = []; C.anim = 0; for (let i = 0; i < 5; i++) C.rows.push(clRow(C)); clFix(C); },
    step(C, dt) { C.anim = Math.max(0, C.anim - dt * 5); C.grip -= 0.012 * C.d * dt * C.gm; },
    draw(g, C) {
      for (let r = 0; r < C.rows.length; r++) for (let c = 0; c < 5; c++) { const h = C.rows[r][c]; if (!h) continue; const x = 80 + c * 100, y = 300 - (r + 1) * 72 + C.anim * 72;
        clHold(g, x, y, h.bad ? CL_BAD[h.bad][1] : CL.env.c, h.bad, r === 0 && Math.abs(c - C.col) <= 1); }
      clClimber(g, 80 + C.col * 100, 330 + C.anim * 10, C.anim > 0);
    },
    key(C, k) { const m = { arrowleft: -1, a: -1, arrowup: 0, w: 0, arrowright: 1, d: 1 }[k]; if (m !== undefined) clPick(C, C.col + m); },
    ptr(C, ty, x, y) { if (ty !== 'down') return; const c = Math.round((x - 80) / 100); if (Math.abs(y - (300 - 72)) < 50 && c >= 0 && c < 5) clPick(C, c); },
  },
  // 2. Tres puntos de apoyo
  three: { n: 'Tres apoyos', i: '✋', how: 'Mueve la extremidad que se indica: Q mano izq., E mano der., Z pie izq., C pie der. (o tócala). Una cada vez.', tip: 'Mantén siempre tres puntos de apoyo: mueve una sola extremidad cada vez y no sueltes la siguiente hasta tener firme la anterior.',
    init(C) { C.need = 14 + C.d * 2; C.done = 0; C.win = Math.max(0.75, 1.7 - 0.17 * C.d); C.tw = C.win; C.cur = 2; C.lift = 0; clNextLimb(C); },
    step(C, dt) { C.tw -= dt; C.lift = Math.max(0, C.lift - dt * 4); if (C.tw <= 0) { clLose(0.14, 'Tarde: se te cansa el brazo'); clNextLimb(C); } },
    draw(g, C) {
      const cx = CL_W / 2, cy = 230; clClimber(g, cx, cy + 40, C.lift > 0);
      const L = clLimbs(); for (let i = 0; i < 4; i++) { const [lx, ly, key, nm] = L[i], on = i === C.cur, hint = C.d < 3 || !on;
        g.fillStyle = on && hint ? '#e0b54c' : '#ffffff22'; g.beginPath(); g.arc(cx + lx, cy + ly, 26, 0, 7); g.fill();
        if (on && C.d < 3) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(cx + lx, cy + ly, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (C.tw / C.win)); g.stroke(); }
        g.fillStyle = on && hint ? '#141517' : '#e8e4dc'; g.font = 'bold 16px system-ui'; g.textAlign = 'center'; g.fillText(key, cx + lx, cy + ly + 6); }
      g.fillStyle = '#fff'; g.font = 'bold 18px system-ui'; g.textAlign = 'center'; g.fillText('Mueve: ' + L[C.cur][3], cx, 60);
      if (C.d >= 3) { g.fillStyle = '#ffffffaa'; g.font = '12px system-ui'; g.fillText('(lee la orden: ya no se ilumina)', cx, 80); }
    },
    key(C, k) { const i = ['q', 'e', 'z', 'c'].indexOf(k); if (i >= 0) clLimb(C, i); },
    ptr(C, ty, x, y) { if (ty !== 'down') return; const L = clLimbs(); for (let i = 0; i < 4; i++) if (Math.hypot(x - (CL_W / 2 + L[i][0]), y - (230 + L[i][1])) < 34) clLimb(C, i); },
  },
  // 3. Aguante: subir y descansar en los buenos agarres
  pump: { n: 'Antebrazos', i: '💪', how: 'Mantén pulsado (Espacio o el ratón) para subir. Suelta al llegar a un saliente grande para descansar los brazos.', tip: 'Descansa en los agarres buenos y sacude los brazos por turnos: si se te cargan los antebrazos, la mano se abre sola.',
    init(C) { C.pump = 0; C.jugs = []; for (let p = 0.14; p < 0.98; p += clRand(0.13, 0.19)) C.jugs.push(p); },
    step(C, dt) {
      const near = C.jugs.some(j => Math.abs(j - C.prog) < 0.025);
      if (C.hold) { C.prog += 0.065 * dt; C.pump += (0.1 + 0.025 * C.d) * dt; }
      else if (near) C.pump = Math.max(0, C.pump - 0.4 * dt);
      else { C.pump += 0.05 * dt; C.prog = Math.max(0, C.prog - 0.025 * dt); if (Math.random() < dt) clFlash('Aquí no hay donde descansar', '#ffd27a'); }
      if (C.pump >= 1) { clLose(0.4, '¡Se te abren las manos!'); C.pump = 0.55; C.prog = Math.max(0, C.prog - 0.06); }
    },
    draw(g, C) {
      for (const j of C.jugs) { const y = 300 - (j - C.prog) * 900; if (y < -20 || y > CL_H + 20) continue; g.fillStyle = CL.env.c; g.fillRect(CL_W / 2 - 60, y - 6, 120, 14); g.fillStyle = '#00000055'; g.fillRect(CL_W / 2 - 60, y + 8, 120, 5); g.fillStyle = '#fff8'; g.font = '11px system-ui'; g.textAlign = 'left'; g.fillText('saliente', CL_W / 2 + 66, y + 5); }
      clClimber(g, CL_W / 2, 320, C.hold);
      g.fillStyle = '#ffffff22'; g.fillRect(CL_W - 60, 60, 18, 240); g.fillStyle = C.pump > 0.75 ? '#ff6b5b' : C.pump > 0.45 ? '#e0b54c' : '#7fd07a'; g.fillRect(CL_W - 60, 300 - 240 * C.pump, 18, 240 * C.pump);
      g.fillStyle = '#fff'; g.font = '11px system-ui'; g.textAlign = 'center'; g.fillText('Brazos', CL_W - 51, 316);
    },
    key(C, k, up) { if (k === ' ' || k === 'arrowup' || k === 'w') C.hold = !up; },
    ptr(C, ty) { if (ty === 'down') C.hold = true; else if (ty === 'up') C.hold = false; },
  },
  // 4. Lances con balanceo
  dyno: { n: 'Lances', i: '🤸', how: 'Te balanceas colgado. Suelta (clic, Espacio o ↑) cuando la flecha apunte a la presa dorada.', tip: 'En un lance, sal en el punto muerto del balanceo: el impulso va hacia donde apunta tu cuerpo, no hacia donde miras.',
    init(C) { C.need = 7 + C.d; C.done = 0; C.w = 1.6 + C.d * 0.25; C.ph = 0; C.fly = 0; clDynoTarget(C); },
    step(C, dt) { C.ph += dt * C.w; C.ang = Math.sin(C.ph) * 1.0; if (C.fly > 0) C.fly = Math.max(0, C.fly - dt * 3); },
    draw(g, C) {
      const px = CL_W / 2, py = 90, len = 150, a = C.ang + Math.PI / 2, x = px + Math.cos(a) * len, y = py + Math.sin(a) * len;
      clHold(g, px, py, CL.env.c); g.strokeStyle = '#d8c8a8'; g.lineWidth = 4; g.beginPath(); g.moveTo(px, py); g.lineTo(x, y); g.stroke();
      const ta = C.tAng - Math.PI / 2, tx = x + Math.cos(ta) * 120, ty = y + Math.sin(ta) * 120, vis = CL.k < 5 || Math.sin(CL.t * 6) > -0.3;
      if (vis) { clHold(g, px + Math.sin(C.tAng) * 230, 40, '#e0b54c'); }
      const ok = Math.abs(C.ang - C.tAng) < C.tw; g.strokeStyle = ok ? '#7fd07a' : '#ffffff88'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(-Math.PI / 2 + C.ang) * 70, y + Math.sin(-Math.PI / 2 + C.ang) * 70); g.stroke();
      clClimber(g, x, y + 40, true); void tx; void ty;
      g.fillStyle = '#fff'; g.font = '12px system-ui'; g.textAlign = 'left'; g.fillText(`Lance ${C.done + 1} de ${C.need}`, 16, 30);
    },
    key(C, k) { if (k === ' ' || k === 'arrowup' || k === 'w' || k === 'enter') clDyno(C); },
    ptr(C, ty) { if (ty === 'down') clDyno(C); },
  },
  // 5. Chimenea: espalda y pies alternos
  chimney: { n: 'Chimenea', i: '🧱', how: 'Estás entre dos paredes. Alterna empujar con la espalda (A, ← o mitad izquierda) y con los pies (D, → o mitad derecha). La aguja debe quedar en el centro.', tip: 'En una chimenea, la presión contraria de espalda y pies te sujeta: sube alternando y sin dejar de empujar nunca contra las dos paredes.',
    init(C) { C.need = 16 + C.d * 2; C.done = 0; C.nd = 0; C.drift = 0; C.last = null; },
    step(C, dt) { C.drift += clRand(-1, 1) * dt * (0.6 + C.d * 0.25); C.drift = clamp(C.drift, -0.5, 0.5); C.nd += C.drift * dt; if (Math.abs(C.nd) > 1) { clLose(0.3, C.nd > 0 ? 'Empujas de más con los pies' : 'Te pegas demasiado a la pared'); C.nd = 0; C.drift = 0; } },
    draw(g, C) {
      g.fillStyle = CL.env.b; g.fillRect(0, 0, 150, CL_H); g.fillRect(CL_W - 150, 0, 150, CL_H); g.fillStyle = '#ffffff0c'; for (let i = 0; i < 12; i++) { const y = ((i * 37 + C.prog * 600) % CL_H); g.fillRect(140, y, 10, 4); g.fillRect(CL_W - 150, (y + 18) % CL_H, 10, 4); }
      clClimber(g, CL_W / 2 + C.nd * 50, 290, true);
      const gx = CL_W / 2, gy = 60; g.fillStyle = '#ffffff22'; g.fillRect(gx - 120, gy, 240, 10); g.fillStyle = '#7fd07a55'; g.fillRect(gx - 40, gy, 80, 10); g.fillStyle = '#fff'; g.fillRect(gx + C.nd * 120 - 2, gy - 6, 4, 22);
      g.font = '12px system-ui'; g.textAlign = 'center'; g.fillText('espalda ← equilibrio → pies', gx, gy + 32);
    },
    key(C, k) { if (k === 'a' || k === 'arrowleft') clPush(C, 'L'); if (k === 'd' || k === 'arrowright') clPush(C, 'R'); },
    ptr(C, ty, x) { if (ty === 'down') clPush(C, x < CL_W / 2 ? 'L' : 'R'); },
  },
  // 6. Asegurar: chapar cada anclaje
  rope: { n: 'Asegurar la cuerda', i: '🪢', how: 'Subes solo. Pulsa Espacio o haz clic cuando un anclaje pase por el aro de tu arnés para chapar. Si resbalas (¡aviso!), pulsa enseguida.', tip: 'Chapa cada anclaje que pases: si resbalas, solo caes hasta la última chapa. Cuanto más lejos esté, peor la caída.',
    init(C) { C.anc = []; const n = 7 + C.d; for (let i = 1; i <= n; i++) C.anc.push({ p: i / (n + 1), st: 0 }); C.lastClip = 0; C.slip = 0; C.nextSlip = clRand(3, 5); },
    step(C, dt) {
      if (C.slip > 0) { C.slip -= dt; if (C.slip <= 0) { const fall = C.prog - C.lastClip; clLose(0.12 + fall * 1.6, fall > 0.15 ? '¡Caída larga! No tenías chapa cerca' : 'Resbalas: la cuerda te para'); C.prog = Math.max(C.lastClip, C.prog - Math.min(0.12, fall)); C.nextSlip = clRand(3, 6) - C.d * 0.3; } return; }
      C.prog += 0.05 * dt;
      for (const a of C.anc) if (!a.st && C.prog - a.p > 0.035) { a.st = -1; clLose(0.12, 'Anclaje sin chapar'); }
      C.nextSlip -= dt; if (C.nextSlip <= 0) { C.slip = Math.max(0.45, 0.9 - C.d * 0.08); clFlash('¡Resbalas! ¡Pulsa!', '#ffd27a'); }
    },
    draw(g, C) {
      g.strokeStyle = '#e0c060'; g.lineWidth = 2; g.beginPath(); g.moveTo(CL_W / 2 + 6, 300); let lastY = 300;
      for (const a of C.anc) { const y = 300 - (a.p - C.prog) * 900; if (a.st === 1) { g.lineTo(CL_W / 2 + 40, y); lastY = y; } } void lastY; g.stroke();
      for (const a of C.anc) { const y = 300 - (a.p - C.prog) * 900; if (y < -20 || y > CL_H + 20) continue; g.strokeStyle = a.st === 1 ? '#7fd07a' : a.st < 0 ? '#ff6b5b' : '#d8d8d8'; g.lineWidth = 3; g.beginPath(); g.arc(CL_W / 2 + 40, y, 9, 0, 7); g.stroke(); }
      g.strokeStyle = '#e0b54c88'; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.arc(CL_W / 2 + 40, 300, 26, 0, 7); g.stroke(); g.setLineDash([]);
      clClimber(g, CL_W / 2, 330 + (C.slip > 0 ? Math.sin(CL.t * 60) * 3 : 0), C.slip <= 0);
    },
    key(C, k) { if (k === ' ' || k === 'enter') clClip(C); },
    ptr(C, ty) { if (ty === 'down') clClip(C); },
  },
  // 7. Fisura: seguir la grieta
  crack: { n: 'Fisura', i: '⚡', how: 'Sigue la grieta con la mano: mueve el ratón (o el dedo, o ← →) para mantenerte dentro. Dentro subes; fuera pierdes agarre.', tip: 'En las fisuras se empotra la mano: gírala dentro de la grieta hasta que quede trabada y sigue su línea, no la pared lisa.',
    init(C) { C.hx = CL_W / 2; C.v = 0; C.s = Math.random() * 100; C.w = Math.max(20, 50 - C.d * 5); },
    step(C, dt) { C.hx = clamp(C.hx + C.v * dt, 30, CL_W - 30); const cx = clCrackX(C, 300); const inside = Math.abs(C.hx - cx) < C.w / 2;
      if (inside) C.prog += 0.052 * dt; else { C.grip -= 0.22 * dt * C.gm; C.out = (C.out || 0) + dt; if (C.out > 0.6) { clFlash('¡Fuera de la grieta!', '#ff8a6a'); C.out = 0; } } C.inside = inside; },
    draw(g, C) {
      g.fillStyle = '#0a0a0c'; for (let y = 0; y < CL_H; y += 6) { const x = clCrackX(C, y); g.fillRect(x - C.w / 2, y, C.w, 7); }
      g.fillStyle = '#ffffff10'; for (let y = 0; y < CL_H; y += 6) { const x = clCrackX(C, y); g.fillRect(x - C.w / 2 - 3, y, 3, 7); }
      clClimber(g, C.hx, 340, C.inside); g.fillStyle = C.inside ? '#7fd07a' : '#ff6b5b'; g.beginPath(); g.arc(C.hx, 300, 7, 0, 7); g.fill();
    },
    key(C, k, up) { if (k === 'arrowleft' || k === 'a') C.v = up ? 0 : -220; if (k === 'arrowright' || k === 'd') C.v = up ? 0 : 220; },
    ptr(C, ty, x) { if (ty === 'move' || ty === 'down') C.hx = clamp(x, 30, CL_W - 30); },
  },
  // 8. Desprendimientos: esquivar lo que cae
  rocks: { n: 'Desprendimientos', i: '🌋', how: 'Mantén ↑ (o pulsa) para subir y muévete a los lados (← →, ratón o dedo) para esquivar lo que cae. El polvo avisa antes.', tip: 'Mira hacia arriba de vez en cuando: el polvo y los crujidos avisan de que algo va a caer. Apártate de su línea, no intentes adelantarlo.',
    init(C) { C.lane = 2; C.lx = 2; C.objs = []; C.sp = 0; },
    step(C, dt) {
      C.lx += (C.lane - C.lx) * Math.min(1, dt * 12); if (C.hold) C.prog += 0.058 * dt;
      C.sp -= dt; if (C.sp <= 0) { C.sp = clRand(0.9, 1.5) / (0.7 + C.d * 0.25); C.objs.push({ l: (Math.random() * 5) | 0, y: -30, warn: 0.6, v: 260 + C.d * 30 }); }
      for (const o of C.objs) { if (o.warn > 0) { o.warn -= dt; continue; } o.y += o.v * dt; if (!o.hit && o.y > 290 && o.y < 340 && Math.abs(o.l - C.lx) < 0.5) { o.hit = 1; clLose(0.3, { stone: '¡Te golpea una piedra!', drip: '¡Un chorro helado!', icicle: '¡Un carámbano!', acid: '¡Una gota de ácido!', lava: '¡Una gota de lava!', shard: '¡Una esquirla del vacío!' }[CL.env.hz]); } }
      C.objs = C.objs.filter(o => o.y < CL_H + 40);
    },
    draw(g, C) {
      for (let l = 0; l < 5; l++) { g.fillStyle = '#ffffff06'; g.fillRect(40 + l * 100, 0, 80, CL_H); }
      for (const o of C.objs) { const x = 80 + o.l * 100; if (o.warn > 0) { g.fillStyle = `rgba(220,200,170,${0.3 + 0.3 * Math.sin(CL.t * 20)})`; for (let i = 0; i < 6; i++) g.fillRect(x - 20 + i * 7, 6 + (i % 2) * 5, 4, 4); continue; }
        g.fillStyle = { stone: '#9a8a70', drip: '#8ac8f0', icicle: '#d8f0ff', acid: '#b8f040', lava: '#ff6a1a', shard: '#a080ff' }[CL.env.hz]; g.beginPath(); g.arc(x, o.y, 13, 0, 7); g.fill(); }
      clClimber(g, 80 + C.lx * 100, 340, C.hold);
    },
    key(C, k, up) { if (k === 'arrowup' || k === 'w' || k === ' ') C.hold = !up; if (up) return; if (k === 'arrowleft' || k === 'a') C.lane = Math.max(0, C.lane - 1); if (k === 'arrowright' || k === 'd') C.lane = Math.min(4, C.lane + 1); },
    ptr(C, ty, x) { if (ty === 'down') C.hold = true; if (ty === 'up') C.hold = false; if (ty === 'down' || ty === 'move') C.lane = clamp(Math.round((x - 80) / 100), 0, 4); },
  },
  // 9. Respiración contra el vértigo
  breath: { n: 'Respira', i: '🫁', how: 'Subes solo. Mantén pulsado (Espacio o ratón) mientras el círculo crece (inspirar) y suelta mientras encoge (espirar). Así baja el pulso.', tip: 'Respira lento y hondo, sobre todo si miras abajo: controlar la respiración baja el pulso y el miedo, y las manos dejan de temblar.',
    init(C) { C.hr = 0.35; C.ph = 0; C.look = clRand(4, 7); },
    step(C, dt) {
      const per = 4.2, inh = (C.ph % per) < per / 2; C.ph += dt; C.inh = inh;
      C.hr += (C.hold === inh ? -0.13 : 0.16) * dt + 0.012 * C.d * dt;
      C.look -= dt; if (C.look <= 0) { C.look = clRand(4, 7); C.hr += 0.15; clFlash('¡Miras abajo! Respira', '#ffd27a'); }
      C.hr = clamp(C.hr, 0, 1.05); C.prog += (0.028 + 0.05 * (1 - C.hr)) * dt;
      if (C.hr >= 1) { clLose(0.33, '¡Pánico! Te tiemblan las manos'); C.hr = 0.6; }
    },
    draw(g, C) {
      const per = 4.2, f = (C.ph % per) / per, r = 30 + 60 * (f < 0.5 ? f * 2 : 2 - f * 2);
      g.strokeStyle = C.inh ? '#8ad8ff' : '#c8a8ff'; g.lineWidth = 4; g.beginPath(); g.arc(CL_W / 2, 150, r, 0, 7); g.stroke();
      g.fillStyle = '#fff'; g.font = 'bold 16px system-ui'; g.textAlign = 'center'; g.fillText(C.inh ? 'Inspira (mantén)' : 'Espira (suelta)', CL_W / 2, 156);
      g.fillStyle = '#ffffff22'; g.fillRect(40, 60, 18, 240); g.fillStyle = C.hr > 0.75 ? '#ff6b5b' : C.hr > 0.5 ? '#e0b54c' : '#7fd07a'; g.fillRect(40, 300 - 240 * Math.min(1, C.hr), 18, 240 * Math.min(1, C.hr));
      g.font = '11px system-ui'; g.fillStyle = '#fff'; g.fillText('Pulso', 49, 316); clClimber(g, CL_W / 2, 340 + Math.sin(CL.t * 30) * C.hr * 2, true);
    },
    key(C, k, up) { if (k === ' ' || k === 'arrowup' || k === 'w') C.hold = !up; },
    ptr(C, ty) { if (ty === 'down') C.hold = true; else if (ty === 'up') C.hold = false; },
  },
  // 10. Leer la vía y recordarla
  route: { n: 'Leer la vía', i: '🧭', how: 'Primero mira la vía: las presas se iluminan en orden. Luego tócalas en ese orden (o ← → para elegir y Espacio).', tip: 'Lee la vía desde abajo antes de empezar: memoriza las presas y dónde irá cada mano. Arriba no hay tiempo para pensar.',
    init(C) { C.len = 7 + C.d; C.hs = []; let tries = 0; while (C.hs.length < 14 + C.d && tries++ < 400) { const x = clRand(50, CL_W - 50), y = clRand(40, 310); if (C.hs.every(h => Math.hypot(h.x - x, h.y - y) > 52)) C.hs.push({ x, y }); }
      const order = C.hs.map((h, i) => i).sort((a, b) => C.hs[b].y - C.hs[a].y); C.seq = []; let last = null;
      for (const i of order) { if (C.seq.length >= C.len) break; if (last === null || Math.abs(C.hs[i].x - C.hs[last].x) < 230) { C.seq.push(i); last = i; } }
      C.len = C.seq.length; C.at = 0; C.show = 0; C.showT = Math.max(0.35, 0.75 - C.d * 0.06); C.sel = 0; C.reveal = 0; C.pos = { x: CL_W / 2, y: 360 }; },
    step(C, dt) { if (C.show < C.len) { C.st = (C.st || 0) + dt; if (C.st > C.showT) { C.st = 0; C.show++; } } C.reveal = Math.max(0, C.reveal - dt); const t = C.at ? C.hs[C.seq[C.at - 1]] : { x: CL_W / 2, y: 360 }; C.pos.x += (t.x - C.pos.x) * Math.min(1, dt * 8); C.pos.y += (t.y + 30 - C.pos.y) * Math.min(1, dt * 8); },
    draw(g, C) {
      const showing = C.show < C.len;
      C.hs.forEach((h, i) => { const k = C.seq.indexOf(i), lit = showing ? k >= 0 && k <= C.show - 1 && k > C.show - 3 : C.reveal > 0 && k === C.at, done = !showing && k >= 0 && k < C.at;
        clHold(g, h.x, h.y, lit ? '#e0b54c' : done ? '#7fd07a' : CL.env.c); if (!showing && i === C.sel) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(h.x, h.y, 22, 0, 7); g.stroke(); } });
      g.fillStyle = '#fff'; g.font = 'bold 14px system-ui'; g.textAlign = 'center'; g.fillText(showing ? 'Memoriza la vía…' : `Presa ${C.at + 1} de ${C.len}`, CL_W / 2, 24);
      clClimber(g, C.pos.x, C.pos.y + 30, false);
    },
    key(C, k) { if (C.show < C.len) return; if (k === 'arrowleft' || k === 'a') C.sel = (C.sel + C.hs.length - 1) % C.hs.length; if (k === 'arrowright' || k === 'd') C.sel = (C.sel + 1) % C.hs.length; if (k === ' ' || k === 'enter') clRoute(C, C.sel); },
    ptr(C, ty, x, y) { if (ty !== 'down' || C.show < C.len) return; let best = -1, bd = 30; C.hs.forEach((h, i) => { const d = Math.hypot(h.x - x, h.y - y); if (d < bd) { bd = d; best = i; } }); if (best >= 0) { C.sel = best; clRoute(C, best); } },
  },
};
// ---------- Ayudantes de cada juego ----------
function clRow(C) { const r = []; for (let c = 0; c < 5; c++) if (Math.random() < 0.72) r.push({ bad: Math.random() < 0.18 + C.d * 0.06 ? (Math.random() < 0.5 ? 'crack' : CL.env.bad) : null }); else r.push(null); return r; }
function clFix(C) { const r = C.rows[0]; if (![-1, 0, 1].some(m => r[C.col + m] && !r[C.col + m].bad)) { const c = clamp(C.col + ((Math.random() * 3) | 0) - 1, 0, 4); r[c] = { bad: null }; } }
function clPick(C, c) {
  if (c < 0 || c > 4) return; if (Math.abs(c - C.col) > 1) { clFlash('Demasiado lejos', '#ffd27a'); return; }
  const h = C.rows[0][c]; if (!h) { clLose(0.08, 'Ahí no hay presa'); return; }
  if (h.bad) { const B = CL_BAD[h.bad]; clLose(h.bad === 'crack' ? 0.3 : 0.22, B[0] + '!'); C.lesson = B[2]; C.rows[0][c] = null; clFix(C); return; }
  C.col = c; C.rows.shift(); C.rows.push(clRow(C)); clFix(C); C.done++; C.prog = C.done / C.need; C.anim = 1; C.grip = Math.min(1, C.grip + 0.05); clGood();
}
function clLimbs() { return [[-70, -70, 'Q', 'mano izquierda'], [70, -70, 'E', 'mano derecha'], [-55, 80, 'Z', 'pie izquierdo'], [55, 80, 'C', 'pie derecho']]; }
function clNextLimb(C) { let n; do n = (Math.random() * 4) | 0; while (n === C.cur); C.cur = n; C.tw = C.win; }
function clLimb(C, i) { if (i === C.cur) { C.done++; C.prog = C.done / C.need; C.lift = 1; clGood(); clNextLimb(C); } else clLose(0.22, '¡Has soltado dos apoyos a la vez!'); }
function clDynoTarget(C) { C.tAng = clRand(-0.7, 0.7); C.tw = Math.max(0.09, 0.24 - C.d * 0.025); }
function clDyno(C) { if (C.fly > 0) return; if (Math.abs(C.ang - C.tAng) < C.tw) { C.done++; C.prog = C.done / C.need; C.fly = 1; clGood('¡Lance!'); C.ph = 0; clDynoTarget(C); } else { clLose(0.3, '¡Fallas el lance! Te quedas de una mano'); C.ph = Math.PI; } }
function clPush(C, s) { if (s === C.last) { clLose(0.16, 'Dos veces el mismo lado: resbalas'); C.nd += s === 'L' ? -0.3 : 0.3; return; } C.last = s; C.nd += s === 'L' ? -0.28 : 0.28; C.done++; C.prog = C.done / C.need; clGood(); }
function clClip(C) { if (C.slip > 0) { C.slip = 0; C.nextSlip = clRand(3, 6) - C.d * 0.3; clGood('¡Te sujetas!'); return; } const a = C.anc.find(x => !x.st && Math.abs(x.p - C.prog) < 0.03); if (a) { a.st = 1; C.lastClip = a.p; clGood('Chapado'); } else clFlash('No hay anclaje en el aro', '#ffd27a'); }
function clCrackX(C, y) { const s = C.s + (C.prog * 900 + (300 - y)) / 90; return CL_W / 2 + Math.sin(s) * (60 + C.d * 18) + Math.sin(s * 2.3 + 1) * (20 + C.d * 10); }
function clRoute(C, i) { if (C.seq[C.at] === i) { C.at++; C.prog = C.at / C.len; clGood(); } else { clLose(0.25, 'Esa no es la presa de la vía'); C.reveal = 0.8; } }
// Presa y escalador
function clHold(g, x, y, col, bad, reach) {
  g.fillStyle = '#00000055'; g.beginPath(); g.ellipse(x + 3, y + 5, 20, 12, 0, 0, 7); g.fill();
  g.fillStyle = col; g.beginPath(); g.ellipse(x, y, 20, 12, 0, 0, 7); g.fill(); g.fillStyle = '#ffffff30'; g.beginPath(); g.ellipse(x - 5, y - 4, 9, 4, 0, 0, 7); g.fill();
  if (bad === 'crack') { g.strokeStyle = '#2a2018'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 10, y - 6); g.lineTo(x - 2, y + 2); g.lineTo(x + 8, y - 3); g.stroke(); }
  if (bad === 'wet' || bad === 'ice') { g.fillStyle = '#ffffffaa'; g.fillRect(x + 6, y - 7, 4, 4); g.fillRect(x - 12, y + 1, 3, 3); }
  if (bad === 'spore') { g.fillStyle = '#e8ff90'; for (let i = 0; i < 4; i++) g.fillRect(x - 10 + i * 6, y - 3 + (i % 2) * 4, 3, 3); }
  if (bad === 'hot') { g.fillStyle = `rgba(255,200,80,${0.4 + 0.3 * Math.sin(CL.t * 8)})`; g.beginPath(); g.ellipse(x, y, 12, 6, 0, 0, 7); g.fill(); }
  if (bad === 'fake') { g.globalAlpha = 0.5 + 0.5 * Math.sin(CL.t * 3 + x); g.fillStyle = CL.env.b; g.beginPath(); g.ellipse(x, y, 20, 12, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
  if (reach) { g.strokeStyle = '#ffffff55'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, 25, 17, 0, 0, 7); g.stroke(); }
}
function clClimber(g, x, y, moving) {
  try { const ch = charData(); drawAvatar(g, ch.look, S.equip, x, y, -Math.PI / 2, CL.t * 8, !!moving, 2.4); }
  catch (e) { g.fillStyle = '#e0b54c'; g.beginPath(); g.arc(x, y - 30, 10, 0, 7); g.fill(); g.fillRect(x - 6, y - 20, 12, 22); }
}
// Pared de fondo (se desplaza al subir)
function clWall(k) {
  const E = CL_ENV[k], c = mkCanvas(CL_W, CL_H * 2), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, CL_H * 2); gr.addColorStop(0, E.a); gr.addColorStop(1, E.b); g.fillStyle = gr; g.fillRect(0, 0, CL_W, CL_H * 2);
  for (let i = 0; i < 260; i++) { g.fillStyle = Math.random() < 0.5 ? '#ffffff0a' : '#0000001a'; const s = 4 + Math.random() * 26; g.fillRect(Math.random() * CL_W, Math.random() * CL_H * 2, s, s * 0.5); }
  g.strokeStyle = '#00000040'; g.lineWidth = 1.5; for (let i = 0; i < 16; i++) { let x = Math.random() * CL_W, y = Math.random() * CL_H * 2; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 5; j++) { x += clRand(-20, 20); y += clRand(8, 26); g.lineTo(x, y); } g.stroke(); }
  for (let y = 0; y < CL_H * 2; y += 46) { g.fillStyle = '#ffffff06'; g.fillRect(0, y, CL_W, 3); }
  return c;
}

// ---------- Marco común: abrir, bucle, dibujo, final ----------
function climbStart(o) {
  if (CL) return;
  const gks = Object.keys(CLIMB_GAMES), last = S._lastClimb; let g; do g = gks[(Math.random() * gks.length) | 0]; while (g === last && gks.length > 1); if (o.game && CLIMB_GAMES[o.game]) g = o.game; S._lastClimb = g;
  const k = clamp(o.k || 0, 0, CL_ENV.length - 1), env = CL_ENV[k];
  CL = { g, G: CLIMB_GAMES[g], k, env, d: clamp(o.d || 1, 1, 6), t: 0, prog: 0, grip: 1, phase: 'intro', fl: [], misses: 0, shake: 0, o, wall: clWall(k), parts: [] };
  CL.gm = clGripMul(); CL.G.init(CL);
  const G = CL.G;
  mClimb.innerHTML = `<div class="clin"><header><span class="cgi">${G.i}</span><div><b>${esc(o.title || 'Escalar')} · ${esc(G.n)}</b><small>${esc(CL.env.n)} · dificultad ${'●'.repeat(CL.d)}${'○'.repeat(6 - CL.d)}</small></div><button class="ghost sm" id="clQuit">Soltarse <kbd>Esc</kbd></button></header>
    <canvas id="clCv" width="${CL_W}" height="${CL_H}"></canvas>
    <div class="clfoot"><div class="clhow"><b>Cómo:</b> ${esc(G.how)}${CL.env.note ? `<br><span class="mut">${esc(CL.env.note)}</span>` : ''}</div><div class="cltip">💡 ${esc(G.tip)}</div></div></div>`;
  mClimb.hidden = false; ui.open = 'climb'; document.body.classList.add('climbing'); keys.clear(); P.mvx = P.mvy = 0;
  $('clQuit').onclick = () => climbEnd(CL.prog > 0.1 ? 'fall' : 'cancel', 'Te sueltas');
  const cv = $('clCv'), pt = (ty, e) => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * CL_W / r.width, y = (e.clientY - r.top) * CL_H / r.height; clPtr(ty, x, y); };
  cv.addEventListener('pointerdown', e => { e.preventDefault(); cv.setPointerCapture && cv.setPointerCapture(e.pointerId); pt('down', e); });
  cv.addEventListener('pointermove', e => pt('move', e)); cv.addEventListener('pointerup', e => pt('up', e)); cv.addEventListener('pointercancel', e => pt('up', e));
  requestAnimationFrame(clLoop);
}
function clPtr(ty, x, y) { if (!CL) return; if (CL.phase === 'intro') { if (ty === 'down') clGo(); return; } if (CL.phase === 'play' && CL.G.ptr) CL.G.ptr(CL, ty, x, y); }
function clGo() { CL.phase = 'play'; CL.t0 = CL.t; tone(330, 0.12, 'sine', 0.04, 1.5); }
addEventListener('keydown', e => {
  if (!CL) return; const k = e.key.toLowerCase(); e.preventDefault(); e.stopImmediatePropagation();
  if (k === 'escape') { climbEnd(CL.prog > 0.1 ? 'fall' : 'cancel', 'Te sueltas'); return; }
  if (e.repeat) return;
  if (CL.phase === 'intro') { if (k === ' ' || k === 'enter') clGo(); return; }
  if (CL.phase === 'play') CL.G.key(CL, k, false);
}, true);
addEventListener('keyup', e => { if (!CL) return; if (CL.phase === 'play') CL.G.key(CL, e.key.toLowerCase(), true); }, true);
function clLoop(now) {
  if (!CL) return; const cv = $('clCv'); if (!cv) return;
  const dt = Math.min(0.05, (now - (CL.lt || now)) / 1000); CL.lt = now; CL.t += dt;
  if (CL.phase === 'play') {
    CL.G.step(CL, dt); CL.grip -= CL.env.drain * dt * CL.gm; CL.prog = clamp(CL.prog, 0, 1);
    if (CL.k === 4 && CL.hold && Math.random() < dt * 0.15) clLose(0.06, 'La roca quema');
    if (CL.prog >= 1) climbEnd('win'); else if (CL.grip <= 0) climbEnd('fall', 'Se te acaba el agarre'); else if (CL.t - CL.t0 > 50) climbEnd('fall', 'Te agotas');
  }
  CL.shake = Math.max(0, CL.shake - dt);
  try { clDraw(cv.getContext('2d'), dt); } catch (e) { window._clErr = String(e.stack || e); }
  if (CL) requestAnimationFrame(clLoop);
}
function clDraw(g, dt) {
  const C = CL; g.setTransform(1, 0, 0, 1, C.shake > 0 ? clRand(-4, 4) : 0, 0);
  const off = (C.prog * 900) % CL_H; g.drawImage(C.wall, 0, -CL_H + off); g.drawImage(C.wall, 0, off, CL_W, CL_H, 0, off, CL_W, CL_H); g.drawImage(C.wall, 0, -2 * CL_H + off);
  C.G.draw(g, C);
  // Ambiente: goteo, escarcha, esporas, brasas u oscuridad
  const fx = C.env.fx;
  if (fx && fx !== 'dark') { if (Math.random() < dt * 12) C.parts.push({ x: Math.random() * CL_W, y: fx === 'embers' ? CL_H : Math.random() * CL_H, t: 0 }); }
  for (const p of C.parts) { p.t += dt; if (fx === 'drip') p.y += dt * 160; else if (fx === 'embers') p.y -= dt * 50; else p.y -= dt * 8; g.fillStyle = fx === 'drip' ? '#a8d0f0aa' : fx === 'frost' ? '#e0f0ffaa' : fx === 'spores' ? '#d8f07099' : '#ffa040cc'; g.fillRect(p.x, p.y, fx === 'drip' ? 2 : 3, fx === 'drip' ? 8 : 3); }
  C.parts = C.parts.filter(p => p.t < 3);
  if (fx === 'frost') { const v = g.createLinearGradient(0, 0, 60, 0); v.addColorStop(0, '#c8e8ff40'); v.addColorStop(1, '#c8e8ff00'); g.fillStyle = v; g.fillRect(0, 0, 60, CL_H); g.save(); g.translate(CL_W, 0); g.scale(-1, 1); g.fillRect(0, 0, 60, CL_H); g.restore(); }
  if (fx === 'spores') { const a = 0.25 + 0.2 * Math.sin(C.t * 0.7); for (let i = 0; i < 3; i++) { const x = (C.t * 30 + i * 200) % (CL_W + 200) - 100, y = 80 + i * 90; const r = g.createRadialGradient(x, y, 10, x, y, 120); r.addColorStop(0, `rgba(150,180,60,${a})`); r.addColorStop(1, 'rgba(150,180,60,0)'); g.fillStyle = r; g.fillRect(x - 120, y - 120, 240, 240); } }
  if (fx === 'dark') { const lr = heldId && (heldId() === 'lantern' || heldId() === 'lightWand') ? 260 : 170, r = g.createRadialGradient(CL_W / 2, CL_H * 0.62, 30, CL_W / 2, CL_H * 0.62, lr); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(4,2,10,0.93)'); g.fillStyle = r; g.fillRect(0, 0, CL_W, CL_H); }
  g.setTransform(1, 0, 0, 1, 0, 0);
  // Altura (izquierda), agarre (abajo) y tiempo
  g.fillStyle = '#00000088'; g.fillRect(8, 40, 10, CL_H - 80); g.fillStyle = '#e0b54c'; g.fillRect(8, 40 + (CL_H - 80) * (1 - C.prog), 10, (CL_H - 80) * C.prog);
  g.fillStyle = '#fff'; g.font = '10px system-ui'; g.textAlign = 'left'; g.fillText('▲', 8, 34); g.fillText(Math.round(C.prog * 100) + '%', 4, CL_H - 26);
  const gw = 200, gx = CL_W / 2 - gw / 2, gy = CL_H - 16; g.fillStyle = '#00000099'; g.fillRect(gx, gy, gw, 8); g.fillStyle = C.grip > 0.5 ? '#7fd07a' : C.grip > 0.25 ? '#e0b54c' : '#ff6b5b'; g.fillRect(gx, gy, gw * Math.max(0, C.grip), 8);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('Agarre', CL_W / 2, gy - 4);
  if (C.phase === 'play') { g.textAlign = 'right'; g.fillText(Math.floor(C.t - C.t0) + ' s', CL_W - 10, 18); }
  let fy = 110; for (const f of C.fl) { f.a -= dt; g.globalAlpha = clamp(f.a, 0, 1); g.fillStyle = f.c; g.font = 'bold 16px system-ui'; g.textAlign = 'center'; g.fillText(f.t, CL_W / 2, fy); fy += 22; } g.globalAlpha = 1; C.fl = C.fl.filter(f => f.a > 0);
  if (C.phase === 'intro') { g.fillStyle = '#000000b0'; g.fillRect(0, 0, CL_W, CL_H); g.fillStyle = '#e0b54c'; g.font = 'bold 24px system-ui'; g.textAlign = 'center'; g.fillText(C.G.i + ' ' + C.G.n, CL_W / 2, CL_H / 2 - 40);
    g.fillStyle = '#e8e4dc'; g.font = '14px system-ui'; clWrap(g, C.G.how, CL_W / 2, CL_H / 2 - 6, 460, 19); g.fillStyle = '#fff'; g.font = 'bold 15px system-ui'; g.fillText('Espacio o toca para empezar', CL_W / 2, CL_H / 2 + 86); }
  if (C.phase === 'end') { g.fillStyle = '#000000c0'; g.fillRect(0, 0, CL_W, CL_H); g.textAlign = 'center'; g.fillStyle = C.res === 'win' ? '#7fd07a' : '#ff6b5b'; g.font = 'bold 26px system-ui'; g.fillText(C.res === 'win' ? '¡Arriba!' + ' ' + '★'.repeat(C.stars) : '¡Caes!', CL_W / 2, CL_H / 2 - 40);
    g.fillStyle = '#e8e4dc'; g.font = '14px system-ui'; clWrap(g, C.why || '', CL_W / 2, CL_H / 2 - 10, 460, 19); g.fillStyle = '#e0b54c'; g.font = '13px system-ui'; clWrap(g, '💡 ' + (C.lesson || C.G.tip), CL_W / 2, CL_H / 2 + 26, 470, 18); }
}
function clWrap(g, text, x, y, w, lh) { const words = String(text).split(' '); let line = ''; for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > w && line) { g.fillText(line, x, y); y += lh; line = wd; } else line = t; } if (line) g.fillText(line, x, y); }
function climbEnd(res, why) {
  if (!CL || CL.phase === 'end') return;
  const C = CL; C.phase = 'end'; C.res = res; C.why = why || '';
  if (res === 'win') { const tm = C.t - C.t0; C.stars = 1 + (C.grip > 0.45 ? 1 : 0) + (tm < 22 && C.misses <= 2 ? 1 : 0); C.why = `${Math.round(tm)} s · agarre ${Math.round(C.grip * 100)} % · ${C.misses} fallos`; tone(660, 0.25, 'sine', 0.05, 1.5); }
  else if (res === 'fall') tone(110, 0.4, 'sawtooth', 0.05, 0.4);
  const wait = res === 'cancel' ? 0 : 2200;
  setTimeout(() => {
    mClimb.hidden = true; document.body.classList.remove('climbing'); if (ui.open === 'climb') ui.open = null; CL = null; keys.clear(); P.mvx = P.mvy = 0;
    if (res === 'win') { gainXP('fit', 3 + C.d * 2); C.o.onWin && C.o.onWin(C); }
    else if (res === 'fall') { clFallHurt(C); C.o.onFall && C.o.onFall(C); }
  }, wait);
}
// Caer: el daño depende de lo alto que ibas y de la capa
function clFallHurt(C) {
  const p = C.prog, legs = ['legL', 'legR', 'footL', 'footR'], leg = legs[(Math.random() * 4) | 0];
  if (!survOn()) { toastErr('Caes al fondo'); return; }
  hurt('bruise', leg, 0.5 + p * 1.3 + C.d * 0.1, 'Caída escalando');
  if (p > 0.55 && Math.random() < 0.25 + C.d * 0.08) { hurt('fracture', leg, 0.7, 'Caída escalando'); toastErr('💥 Caes desde muy alto: ¡te has roto algo! Cúrate en la ficha (C › Salud)'); }
  else toastErr(p > 0.3 ? 'Caes y te das un buen golpe. Descansa y vuelve a intentarlo, o usa una escalera' : 'Resbalas al empezar: un golpe pequeño');
  shake = 0.3; dust(S.player.x, S.player.y + 8, 10);
}

// ---------- Cuándo se escala ----------
// Pozo hacia la capa de abajo en tu casilla o en una de al lado
function downShaftNear(tx, ty) { for (const [dx, dy] of [[0, 0], [0, 1], [0, -1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) if (isShaft(tx + dx, ty + dy)) return [tx + dx, ty + dy]; return null; }
// En un hoyo del que no se sale saltando (todas las casillas de alrededor están más de 2 niveles por encima)
function stuckInHole(tx, ty) {
  const lp = lvAt(tx, ty); let any = false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const g = GI[gnd(tx + dx, ty + dy)]; if (g.solid && !g.flora) continue; if (g.liquid && !g.walk) continue; any = true; if (lvAt(tx + dx, ty + dy) - lp <= 2) return false; }
  return any;
}
function holeExit(tx, ty) { let best = null, bl = 99; for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const g = GI[gnd(tx + dx, ty + dy)]; if ((g.solid && !g.flora) || (g.liquid && !g.walk) || g.shaft) continue; const l = lvAt(tx + dx, ty + dy); if (l < bl) { bl = l; best = [tx + dx, ty + dy]; } } return best; }
// Subir por el pozo sin escalera: arriba tiene que estar abierto
function climbShaft(tx, ty, wet) {
  const k = layerOf(ty), uy = ty - LAY_OFF; prepArea(tx, uy);
  if (!GI[gnd(tx, uy)].shaft) { toastErr('El pozo de arriba está tapado: no hay por dónde salir'); return; }
  climbStart({ k, d: k + 1 + (wet ? 1 : 0) - (S.equip && S.equip.hands ? 1 : 0), title: (wet ? 'Trepar desde el agua · ' : '') + (k > 1 ? `Escalar a ${LAYERS[k - 1].n}` : 'Escalar a la superficie'), onWin: () => {
    let ax = null, ay = null; for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) if (freeTile(tx + dx, uy + dy)) { ax = tx + dx; ay = uy + dy; break; }
    if (ax === null) { ax = tx; ay = uy + 1; setGround(ax, ay, k - 1 ? LAYERS[k - 1].floorI : G.ROCKFLOOR); }
    moveTo(ax, ay); toast(k > 1 ? `🧗 Sales escalando a ${LAYERS[k - 1].n}` : '🧗 Sales escalando a la superficie'); layerArrive(k - 1);
  } });
}
{ const j0 = tryJump; tryJump = () => {
  if (!S || ui.open || CL) return j0();
  const p = S.player, tx = Math.floor(p.x / T), ty = Math.floor((p.y + 5) / T), g = GI[gnd(tx, ty)], k = layerOf(ty);
  // Espacio sin moverte: escalar · Espacio mientras te mueves: saltar (por ejemplo, dentro de un pozo)
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].some(kk => keys.has(kk))) return j0();
  // Un pozo hacia abajo al lado (o bajo tus pies) manda: Espacio te lanza dentro, aunque estés bajo el hueco de subida
  const dn = downShaftNear(tx, ty);
  if (dn) { j0(); const [sx, sy] = dn, p0 = S.player; P.mvx = ((sx + 0.5) * T - p0.x) * 4; P.mvy = ((sy + 0.5) * T - p0.y) * 4; setTimeout(() => { if (S && !ui.open && isShaft(sx, sy) && layerOf(Math.floor(S.player.y / T)) === layerOf(sy)) { moveTo(sx, sy); goDown(sx, sy, false); } }, 320); return; }
  const sh = k && shaftNear(tx, ty);
  if (sh) { const b = at(sh[0], sh[1]); if (b && b.type === 'ladder') { toast('Hay una escalera: úsala con clic derecho'); return; } climbShaft(sh[0], sh[1], !!g.liquid); return; }
  if (g.hole && stuckInHole(tx, ty)) {
    const ex = holeExit(tx, ty); if (!ex) return j0();
    climbStart({ k, d: Math.max(1, k), title: 'Salir del hoyo', onWin: () => { moveTo(ex[0], ex[1]); toast('🧗 Sales del hoyo'); } });
    return;
  }
  return j0();
}; }
