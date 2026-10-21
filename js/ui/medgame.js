'use strict';
// =====================================================================================
//  Curas con las manos: cada procedimiento es una actividad sobre la parte del cuerpo
//  dibujada en grande (tu tono de piel, la herida tal y como está, lo que ya has hecho).
//  16 maneras de hacerlo: presionar, frotar, pintar, coser, vendar dando vueltas, colocar
//  piezas, tirar despacio, girar, ritmo, inyectar con pulso firme, alinear un hueso, tensar
//  y soltar a tiempo, calentar sin pasarse, verter agua, echar gotas y rociar.
//  Hacerlo bien (sin errores) cura más. Los errores duelen un poco.
// =====================================================================================
const MGS = { on: false };
const MG_W = 640, MG_H = 360;
(function () {
  const m = document.createElement('div'); m.id = 'mMed'; m.className = 'modal'; m.hidden = true;
  m.innerHTML = `<div class="modal-in medm"><header><h2 id="mgT"></h2><button id="mgX">Cancelar <kbd>Esc</kbd></button></header><p class="mgh" id="mgH"></p>
    <div class="mgc"><canvas id="mgC" width="${MG_W}" height="${MG_H}"></canvas><div class="mgmsg" id="mgM"></div></div>
    <div class="mgf"><div class="mgp"><i id="mgP"></i></div><span id="mgU" class="mut small"></span></div></div>`;
  document.body.appendChild(m); MODALS.med = 'mMed';
  $('mgX').onclick = () => { closeModal(); };
})();
const mgSkin = () => { const l = charData().look || {}; const pal = (raceOf(l).skin) || LOOK.skin; return pal[l.skin] || LOOK.skin[l.skin] || '#e8b98f'; };
const mgDk = (c, f) => shade(c, f);
// ---------- Abrir ----------
function openMedGame(id, part, wi) {
  const p = PROCS[id]; if (!p) return;
  const need = procNeeds(id); if (!need.ok) { toastErr('Te falta: ' + need.miss.map(x => ITEMS[x].n).join(', ')); return; }
  openModal('med');
  const w = wi >= 0 ? S.pc.parts[part][wi] : null;
  Object.assign(MGS, { on: true, id, p, part, wi, w, mech: p.mech, t: 0, prog: 0, err: 0, done: 0, end: 0, mx: 320, my: 180, down: false, click: false, up: false, lx: 320, ly: 180, shake: 0, flash: 0, msg: '', msgT: 0, wx: 320, wy: 190, seed: Math.random() * 1000 });
  if (part === 'head') { MGS.wx = id === 'eyeDrops' ? 260 : 320; MGS.wy = id === 'eyeDrops' ? 160 : 120; }
  $('mgT').textContent = `${p.i} ${p.n} · ${PART_N[part]}`;
  $('mgH').textContent = p.how + (w ? `  (${WT[w.t].n})` : '');
  $('mgU').textContent = [need.use && 'Gastas: ' + ITEMS[need.use].n, need.tool && 'Usas: ' + ITEMS[need.tool].n].filter(Boolean).join(' · ') || 'Solo tus manos';
  MGMECH[MGS.mech].init(MGS);
  cancelAnimationFrame(MGS.raf); MGS.last = performance.now(); MGS.raf = requestAnimationFrame(mgLoop);
}
function mgLoop(now) {
  if (ui.open !== 'med') { MGS.on = false; return; }
  const dt = Math.min(0.05, (now - MGS.last) / 1000); MGS.last = now; MGS.t += dt;
  if (!MGS.end) { MGMECH[MGS.mech].update(MGS, dt); MGS.prog = clamp(MGS.prog, 0, 1); if (MGS.prog >= 1) mgFinish(); }
  else if ((MGS.end -= dt) <= 0.0001) { closeModal(); CS2.tab = MGS.wi >= 0 ? 'health' : CS2.tab; openChar(); return; }
  if (MGS.shake > 0) MGS.shake -= dt; if (MGS.flash > 0) MGS.flash -= dt; if (MGS.msgT > 0 && (MGS.msgT -= dt) <= 0) MGS.msg = '';
  mgDraw(); MGS.click = MGS.up = false; MGS.lx = MGS.mx; MGS.ly = MGS.my;
  MGS.raf = requestAnimationFrame(mgLoop);
}
function mgErr(msg) { MGS.err++; MGS.shake = 0.3; MGS.flash = 0.35; mgSay(msg || '¡Ay!'); if (survOn()) S.pc.hp = Math.max(1, S.pc.hp - 0.6); tone(160, 0.12, 'sawtooth', 0.04, 0.6); }
function mgSay(m, t = 1.4) { MGS.msg = m; MGS.msgT = t; }
function mgFinish() {
  const q = clamp(1.2 - MGS.err * 0.15, 0.5, 1.2), ok = applyProc(MGS.id, MGS.part, MGS.wi, q);
  MGS.end = 1.1; mgSay(ok ? (q >= 1.1 ? '¡Perfecto!' : q >= 0.85 ? '¡Bien hecho!' : 'Hecho, aunque con algún fallo') : 'No se pudo', 1.2);
  if (ok) { tone(660, 0.1, 'triangle', 0.05, 1.5); tone(990, 0.12, 'triangle', 0.05, 1, 0.1); }
}
// ---------- Ratón ----------
{ const cv = () => $('mgC');
  const pos = e => { const r = cv().getBoundingClientRect(); MGS.mx = (e.clientX - r.left) / r.width * MG_W; MGS.my = (e.clientY - r.top) / r.height * MG_H; };
  document.addEventListener('mousemove', e => { if (MGS.on) pos(e); });
  document.addEventListener('mousedown', e => { if (!MGS.on || e.target.id !== 'mgC') return; pos(e); MGS.down = true; MGS.click = true; e.preventDefault(); });
  document.addEventListener('mouseup', () => { if (MGS.on && MGS.down) { MGS.down = false; MGS.up = true; } });
}
const mgd = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const mgmv = G => mgd(G.mx, G.my, G.lx, G.ly);
// ---------- Mecánicas ----------
const MGMECH = {
  // Mantener pulsado dentro del círculo, sin moverse
  hold: { init(G) { G.dur = G.id === 'press' ? 3 : G.id === 'cauterize' ? 2.4 : 3.5; G.r = 42; },
    update(G, dt) { const tx = G.wx + (G.p.hard ? Math.sin(G.t * 3) * 14 : 0), ty = G.wy + (G.p.hard ? Math.cos(G.t * 2.3) * 8 : 0); G.tx = tx; G.ty = ty;
      const inside = mgd(G.mx, G.my, tx, ty) < G.r;
      if (G.down && inside && mgmv(G) < 4) G.prog += dt / G.dur; else { G.prog -= dt * 0.2; if (G.down && !inside && G.prog > 0.15 && !G.out) { G.out = 1; mgErr('¡Se te ha ido la mano!'); } }
      if (!G.down || inside) G.out = 0; },
    draw(c, G) { mgRing(c, G.tx || G.wx, G.ty || G.wy, G.r, G.prog, G.id === 'coldPack' ? '#8ad8ff' : G.id === 'cauterize' ? '#ff8a3a' : '#e0b54c'); if (G.down) mgTool(c, G); } },
  // Frotar sobre cada grano de suciedad
  scrub: { init(G) { G.dots = Array.from({ length: 11 }, (_, i) => { const a = i * 2.4 + G.seed, r = 15 + (i * 37 % 60); return { x: G.wx + Math.cos(a) * r * 1.4, y: G.wy + Math.sin(a) * r * 0.7, h: 1 }; }); },
    update(G) { if (G.down) for (const d of G.dots) if (d.h > 0 && mgd(G.mx, G.my, d.x, d.y) < 18) d.h -= mgmv(G) * 0.025; G.prog = G.dots.filter(d => d.h <= 0).length / G.dots.length; },
    draw(c, G) { for (const d of G.dots) if (d.h > 0) { c.globalAlpha = 0.35 + d.h * 0.6; c.fillStyle = '#5a4030'; c.beginPath(); c.arc(d.x, d.y, 4 + d.h * 3, 0, 7); c.fill(); } c.globalAlpha = 1; if (G.down) { c.fillStyle = 'rgba(200,230,255,.5)'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(G.mx + Math.sin(G.t * 9 + i) * 8, G.my + Math.cos(G.t * 7 + i * 2) * 8, 2.5, 0, 7); c.fill(); } } } },
  // Pintar: cubrir toda la zona
  paint: { init(G) { G.rx = G.p.big ? 260 : 95; G.ry = G.p.big ? 95 : 55; if (G.part === 'head' && G.p.big) { G.rx = 120; G.ry = 140; G.wy = 190; } G.cells = []; for (let y = -G.ry; y <= G.ry; y += 12) for (let x = -G.rx; x <= G.rx; x += 12) if ((x / G.rx) ** 2 + (y / G.ry) ** 2 <= 1) G.cells.push({ x: G.wx + x, y: G.wy + y, on: 0 }); },
    update(G) { if (G.down) for (const k of G.cells) if (!k.on && mgd(G.mx, G.my, k.x, k.y) < (G.p.big ? 26 : 18)) k.on = 1; G.prog = G.cells.filter(k => k.on).length / G.cells.length / 0.92; },
    draw(c, G) { const col = { burnGel: 'rgba(150,230,160,.45)', itchCream: 'rgba(240,210,240,.5)', sunscreen: 'rgba(255,250,235,.55)', disinfect: G.p.use && invCount('iodine') && !invCount('alcohol') ? 'rgba(160,82,45,.45)' : 'rgba(200,220,255,.4)' }[G.id] || 'rgba(255,255,255,.4)';
      c.setLineDash([5, 5]); c.strokeStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(G.wx, G.wy, G.rx, G.ry, 0, 0, 7); c.stroke(); c.setLineDash([]);
      c.fillStyle = col; for (const k of G.cells) if (k.on) { c.beginPath(); c.arc(k.x, k.y, 9, 0, 7); c.fill(); } if (G.down) mgTool(c, G); } },
  // Coser punto a punto, en orden
  stitch: { init(G) { G.pts = Array.from({ length: 7 }, (_, i) => ({ x: G.wx - 96 + i * 32, y: G.wy + (i % 2 ? 20 : -20) + Math.sin(i + G.seed) * 3 })); G.k = 0; },
    update(G) { if (!G.click) return; const i = G.pts.findIndex(p => mgd(G.mx, G.my, p.x, p.y) < 13); if (i === G.k) { G.k++; tone(900 + G.k * 40, 0.04, 'square', 0.02); } else if (i >= 0) mgErr('Ese no: sigue el orden'); else if (mgd(G.mx, G.my, G.wx, G.wy) < 120) mgErr('Pincha en el punto marcado'); G.prog = G.k / G.pts.length; },
    draw(c, G) { c.strokeStyle = '#2a2a3a'; c.lineWidth = 2; c.beginPath(); G.pts.slice(0, G.k).forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke();
      G.pts.forEach((p, i) => { c.fillStyle = i < G.k ? '#2a2a3a' : i === G.k ? '#ffd34a' : 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(p.x, p.y, i === G.k ? 6 + Math.sin(G.t * 8) * 1.5 : 4, 0, 7); c.fill(); }); } },
  // Vendar: dar vueltas alrededor de la herida
  wrap: { init(G) { G.turns = G.p.turns || 3; G.acc = 0; G.pa = null; },
    update(G) { const r = mgd(G.mx, G.my, G.wx, G.wy), a = Math.atan2(G.my - G.wy, G.mx - G.wx);
      if (G.down && r > 35 && r < 190) { if (G.pa !== null) { let da = a - G.pa; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; if (Math.abs(da) < 1) G.acc += da; } G.pa = a; } else G.pa = null;
      G.prog = Math.abs(G.acc) / (Math.PI * 2 * G.turns); },
    draw(c, G) { const n = Math.floor(G.prog * G.turns * 3); c.strokeStyle = 'rgba(255,255,255,.3)'; c.setLineDash([6, 6]); c.beginPath(); c.arc(G.wx, G.wy, 100, 0, 7); c.stroke(); c.setLineDash([]);
      for (let i = 0; i < n; i++) { c.fillStyle = i % 2 ? '#efe9dc' : '#f8f4ea'; c.save(); c.translate(G.wx - 60 + i * 120 / Math.max(1, G.turns * 3), G.wy); c.rotate(-0.25); c.fillRect(-14, -85, 26, 170); c.restore(); }
      c.fillStyle = '#ffd34a'; const a = Math.atan2(G.my - G.wy, G.mx - G.wx); c.beginPath(); c.arc(G.wx + Math.cos(a) * 100, G.wy + Math.sin(a) * 100, 6, 0, 7); c.fill(); } },
  // Colocar piezas en su sitio
  place: { init(G) { const two = G.p.pieces === 2; G.items = two ? [{ x: 150, y: 320, tx: G.wx, ty: G.wy - 78, w: 230, h: 22, c: '#b08a5a' }, { x: 490, y: 320, tx: G.wx, ty: G.wy + 78, w: 230, h: 22, c: '#b08a5a' }]
      : [{ x: 560, y: 315, tx: G.wx, ty: G.wy, w: G.id === 'sling' ? 200 : 110, h: G.id === 'sling' ? 90 : 42, c: G.id === 'honeyDress' ? '#e8b040' : G.id === 'sling' ? '#c8c0b0' : '#e8c8a0' }]; G.drag = null; },
    update(G) { if (G.click) G.drag = G.items.find(it => !it.ok && Math.abs(G.mx - it.x) < it.w / 2 && Math.abs(G.my - it.y) < it.h / 2 + 6) || null;
      if (G.drag && G.down) { G.drag.x = G.mx; G.drag.y = G.my; }
      if (G.drag && G.up) { const it = G.drag; if (mgd(it.x, it.y, it.tx, it.ty) < 28) { it.ok = 1; it.x = it.tx; it.y = it.ty; tone(500, 0.06, 'triangle', 0.03); } else if (mgd(it.x, it.y, it.tx, it.ty) < 120) mgErr('Un poco más preciso'); G.drag = null; }
      G.prog = G.items.filter(i => i.ok).length / G.items.length; },
    draw(c, G) { for (const it of G.items) { if (!it.ok) { c.setLineDash([5, 4]); c.strokeStyle = 'rgba(255,211,74,.7)'; c.strokeRect(it.tx - it.w / 2, it.ty - it.h / 2, it.w, it.h); c.setLineDash([]); }
      c.fillStyle = it.c; c.strokeStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.roundRect(it.x - it.w / 2, it.y - it.h / 2, it.w, it.h, 6); c.fill(); c.stroke();
      if (G.id === 'plaster' || G.id === 'honeyDress') { c.fillStyle = G.id === 'plaster' ? '#f4e8d8' : '#f8d880'; c.fillRect(it.x - 18, it.y - it.h / 2 + 6, 36, it.h - 12); } } } },
  // Tirar despacio en la dirección del objeto clavado
  pull: { init(G) { G.a = -0.5 - (G.seed % 1) * 2.1; G.L = G.p.long ? 150 : G.p.short ? 30 : 60; G.need = G.p.long ? 210 : G.p.short ? 70 : 120; G.vmax = G.p.long ? 260 : G.p.short ? 520 : 380; G.out = 0; G.grab = false; G.hx = G.wx + Math.cos(G.a) * G.L; G.hy = G.wy + Math.sin(G.a) * G.L; },
    update(G, dt) { const ca = Math.cos(G.a), sa = Math.sin(G.a), bx = G.wx + ca * (G.L + G.out), by = G.wy + sa * (G.L + G.out); G.hx = bx; G.hy = by;
      if (G.click && mgd(G.mx, G.my, bx, by) < 20) G.grab = true; if (!G.down) G.grab = false;
      if (G.grab) { const proj = (G.mx - G.wx) * ca + (G.my - G.wy) * sa - G.L, lat = Math.abs(-(G.mx - G.wx) * sa + (G.my - G.wy) * ca), sp = mgmv(G) / dt;
        if (sp > G.vmax) { G.grab = false; G.out *= 0.5; mgErr(G.p.long ? '¡Demasiado rápido! Se ha movido dentro' : '¡Se ha partido! Vuelve a pinzar'); }
        else if (G.p.long && lat > 22) { G.grab = false; mgErr('Mantén la línea recta'); }
        else G.out = clamp(Math.max(G.out, proj), 0, G.need); }
      G.prog = G.out / G.need; },
    draw(c, G) { c.strokeStyle = 'rgba(255,255,255,.25)'; c.setLineDash([4, 6]); c.beginPath(); c.moveTo(G.wx, G.wy); c.lineTo(G.wx + Math.cos(G.a) * (G.L + G.need + 30), G.wy + Math.sin(G.a) * (G.L + G.need + 30)); c.stroke(); c.setLineDash([]);
      if (!G.grab) { c.strokeStyle = '#ffd34a'; c.lineWidth = 2; c.beginPath(); c.arc(G.hx, G.hy, 12 + Math.sin(G.t * 6) * 2, 0, 7); c.stroke(); c.lineWidth = 1; }
      if (G.grab) mgTool(c, G); } },
  // Girar alrededor (torniquete, garrapata)
  twist: { init(G) { G.turns = 2; G.acc = 0; G.pa = null; G.vmax = G.id === 'tickRemove' ? 7 : 14; },
    update(G, dt) { const r = mgd(G.mx, G.my, G.wx, G.wy), a = Math.atan2(G.my - G.wy, G.mx - G.wx);
      if (G.down && r > 20 && r < 140) { if (G.pa !== null) { let da = a - G.pa; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; if (Math.abs(da) / dt > G.vmax) { G.acc *= 0.6; G.pa = null; mgErr(G.id === 'tickRemove' ? '¡Más despacio, que se rompe!' : 'Gira con más control'); return; } G.acc += da; } G.pa = a; } else G.pa = null;
      G.prog = Math.abs(G.acc) / (Math.PI * 2 * G.turns); },
    draw(c, G) { c.save(); c.translate(G.wx, G.wy); c.rotate(G.acc); c.strokeStyle = G.id === 'tourniquet' ? '#8a5a3a' : '#c8ccd0'; c.lineWidth = 5; c.beginPath(); c.moveTo(-34, 0); c.lineTo(34, 0); c.stroke(); c.restore(); c.lineWidth = 1; mgRing(c, G.wx, G.wy, 70, G.prog, '#e0b54c'); } },
  // Ritmo: clic cuando el anillo pasa por la marca
  rhythm: { init(G) { G.hits = 0; G.need = 4; },
    update(G) { const r = 10 + ((G.t * 85) % 120); G.rr = r; if (G.click) { if (Math.abs(r - 70) < 11) { G.hits++; tone(400 + G.hits * 80, 0.06, 'sine', 0.04); mgSay(G.hits < G.need ? 'Escupe… otra vez' : '¡Limpio!', 0.6); } else { G.hits = Math.max(0, G.hits - 1); mgErr('A destiempo'); } } G.prog = G.hits / G.need; },
    draw(c, G) { c.strokeStyle = 'rgba(122,224,160,.7)'; c.lineWidth = 6; c.beginPath(); c.arc(G.wx, G.wy, 70, 0, 7); c.stroke(); c.lineWidth = 2; c.strokeStyle = '#fff'; c.beginPath(); c.arc(G.wx, G.wy, G.rr, 0, 7); c.stroke(); c.lineWidth = 1; } },
  // Inyectar: lleva la jeringa a la vena y mantén el pulso
  inject: { init(G) { G.vx = G.wx + 60; G.vy = G.wy - 12; G.ph = 0; G.sx = 560; G.sy = 300; },
    update(G, dt) { if (G.ph === 0) { if (G.click && mgd(G.mx, G.my, G.sx, G.sy) < 40) G.ph = 1; }
      else if (G.ph === 1) { if (G.down) { G.sx = G.mx; G.sy = G.my; } if (G.up) { if (mgd(G.sx, G.sy, G.vx, G.vy) < 14) { G.ph = 2; mgSay('Ahora mantén pulsado sin moverte'); } else { G.ph = 0; G.sx = 560; G.sy = 300; mgErr('Fuera de la vena'); } } }
      else { if (G.down && mgmv(G) < 2.5) G.prog += dt / 2.2; else if (G.down) { G.prog -= dt * 0.5; if (mgmv(G) > 7) mgErr('¡Pulso firme!'); } } },
    draw(c, G) { c.strokeStyle = 'rgba(90,120,200,.7)'; c.lineWidth = 4; c.beginPath(); c.moveTo(G.wx - 150, G.wy - 30); c.quadraticCurveTo(G.wx, G.wy + 10, G.wx + 160, G.wy - 20); c.stroke(); c.lineWidth = 1;
      if (G.ph < 2) { c.strokeStyle = '#ffd34a'; c.beginPath(); c.arc(G.vx, G.vy, 9 + Math.sin(G.t * 6) * 2, 0, 7); c.stroke(); }
      const x = G.ph === 2 ? G.vx : G.sx, y = G.ph === 2 ? G.vy : G.sy; c.save(); c.translate(x, y); c.rotate(-0.6); c.fillStyle = '#e0f0f8'; c.fillRect(0, -6, 70, 12); c.fillStyle = '#9af0c0'; c.fillRect(4, -4, 60 * (1 - G.prog), 8); c.fillStyle = '#c8ccd0'; c.fillRect(-18, -1, 18, 2); c.restore(); } },
  // Alinear el hueso: arrastra el extremo a su sitio
  align: { init(G) { const a = (G.seed % 1) * 6.28; G.ox = Math.cos(a) * 55; G.oy = Math.sin(a) * 40; G.bx = G.wx + 40 + G.ox; G.by = G.wy + G.oy; G.grab = false; },
    update(G) { if (G.click && mgd(G.mx, G.my, G.bx, G.by) < 24) G.grab = true;
      if (G.grab && G.down) { G.bx = G.mx; G.by = G.my; }
      if (G.grab && G.up) { G.grab = false; const d = mgd(G.bx, G.by, G.wx + 40, G.wy); if (d < 12) { G.okA = 1; tone(220, 0.1, 'square', 0.05); mgSay('¡Crac! En su sitio'); } else { mgErr('No ha encajado'); G.bx = G.wx + 40 + G.ox; G.by = G.wy + G.oy; } }
      G.prog = G.okA ? 1 : 0.9 * (1 - Math.min(1, mgd(G.bx, G.by, G.wx + 40, G.wy) / 80)); },
    draw(c, G) { c.fillStyle = 'rgba(255,255,255,.18)'; c.strokeStyle = 'rgba(255,255,255,.5)'; c.setLineDash([4, 4]); c.beginPath(); c.roundRect(G.wx - 10, G.wy - 9, 110, 18, 9); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#f0ece0'; c.beginPath(); c.roundRect(G.wx - 180, G.wy - 9, 170, 18, 9); c.fill(); c.save(); c.translate(G.bx - 40, G.by); c.beginPath(); c.roundRect(-10, -9, 110, 18, 9); c.fill(); c.restore();
      c.strokeStyle = '#ffd34a'; c.lineWidth = 2; c.beginPath(); c.arc(G.bx, G.by, 14, 0, 7); c.stroke(); c.lineWidth = 1; } },
  // Tensar y soltar a tiempo (luxación) o respirar al ritmo (sales)
  timing: { init(G) { G.ok = 0; G.need = G.id === 'relocate' ? 2 : 2; G.v = 0; G.z0 = 0.64; G.z1 = 0.8; },
    update(G, dt) { if (G.id === 'relocate') { G.v = G.down ? Math.min(1, G.v + dt * 0.55) : Math.max(0, G.v - dt * 1.5); if (G.v >= 1) { G.v = 0; mgErr('¡Demasiada fuerza!'); } if (G.up) { if (G.v > G.z0 && G.v < G.z1) { G.ok++; G.v = 0; tone(260, 0.1, 'square', 0.05); mgSay(G.ok < G.need ? 'Casi… otra vez' : '¡Clac!'); } else if (G.v > 0.15) mgErr('No ha entrado'); } }
      else { G.v = 0.5 + 0.5 * Math.sin(G.t * 2.2); if (G.click) { if (G.v > G.z0 && G.v < G.z1) { G.ok++; mgSay('Respira hondo'); } else mgErr('A destiempo'); } }
      G.prog = G.ok / G.need; },
    draw(c, G) { mgGauge(c, G.v, G.z0, G.z1); } },
  // Calentar sin pasarse (congelación)
  gauge: { init(G) { G.v = 0.2; G.in = 0; },
    update(G, dt) { G.v = clamp(G.v + (G.down ? 0.38 : -0.22) * dt, 0, 1); if (G.v > 0.92 && !G.hot) { G.hot = 1; mgErr('¡Quema! Demasiado calor'); G.v = 0.6; } if (G.v < 0.85) G.hot = 0; if (G.v > 0.55 && G.v < 0.78) G.in += dt; G.prog = G.in / 4; },
    draw(c, G) { mgGauge(c, G.v, 0.55, 0.78); c.fillStyle = `rgba(255,140,60,${G.v * 0.35})`; c.beginPath(); c.arc(G.wx, G.wy, 80, 0, 7); c.fill(); } },
  // Masajear / frotar de lado a lado
  rub: { init(G) { G.need = G.id === 'massage' ? 8 : 6; G.n = 0; G.dir = 0; G.lastX = null; G.run = 0; },
    update(G) { const inside = ((G.mx - G.wx) / 120) ** 2 + ((G.my - G.wy) / 70) ** 2 < 1;
      if (G.down && inside) { if (G.lastX !== null) { const dx = G.mx - G.lastX, s = Math.sign(dx); if (s && s !== G.dir) { if (G.run > 45) { G.n++; tone(300 + G.n * 20, 0.03, 'sine', 0.02); } G.dir = s; G.run = 0; } G.run += Math.abs(dx); } G.lastX = G.mx; } else G.lastX = null;
      G.prog = G.n / G.need; },
    draw(c, G) { c.setLineDash([5, 5]); c.strokeStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(G.wx, G.wy, 120, 70, 0, 0, 7); c.stroke(); c.setLineDash([]); c.fillStyle = 'rgba(255,255,255,.55)'; c.font = '20px system-ui'; c.textAlign = 'center'; c.fillText('⟷', G.wx, G.wy - 82); if (G.down) mgTool(c, G); } },
  // Verter agua sobre la quemadura
  pour: { init(G) { G.px = 320; G.py = 120; },
    update(G, dt) { G.px += (G.mx - G.px) * Math.min(1, dt * 5); G.py = G.wy; if (G.down && mgd(G.px, G.py, G.wx, G.wy) < 50) G.prog += dt / 4; else G.prog -= dt * 0.08; },
    draw(c, G) { if (!G.down) { c.fillStyle = 'rgba(255,255,255,.5)'; c.font = '13px system-ui'; c.textAlign = 'center'; c.fillText('Mantén pulsado para verter', G.mx, 30); return; } c.strokeStyle = 'rgba(160,210,255,.75)'; c.lineWidth = 7; c.beginPath(); c.moveTo(G.mx, 0); c.quadraticCurveTo(G.mx, G.py - 60, G.px, G.py); c.stroke(); c.lineWidth = 1;
      c.fillStyle = 'rgba(200,235,255,.6)'; for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(G.px + Math.sin(G.t * 13 + i) * 30, G.py + Math.abs(Math.cos(G.t * 9 + i)) * 26, 2.5, 0, 7); c.fill(); } } },
  // Un pinchazo preciso en el borde (ampolla)
  precise: { init(G) { G.a = (G.seed % 1) * 6.28; },
    update(G) { const tx = G.wx + Math.cos(G.a) * 30, ty = G.wy + Math.sin(G.a) * 22; G.tx = tx; G.ty = ty;
      if (G.click) { if (mgd(G.mx, G.my, tx, ty) < 7) { G.prog = 1; mgSay('Sale el líquido'); } else if (mgd(G.mx, G.my, G.wx, G.wy) < 26) mgErr('En el centro no: en el borde'); else mgErr('Más cerca del borde marcado'); } },
    draw(c, G) { c.strokeStyle = '#ffd34a'; c.lineWidth = 1.5; c.beginPath(); c.arc(G.tx, G.ty, 5 + Math.sin(G.t * 7) * 1.5, 0, 7); c.stroke(); c.lineWidth = 1; } },
  // Gotas en el ojo: cuando esté abierto y encima de la pupila
  drops: { init(G) { G.hits = 0; G.need = 3; G.drop = null; G.open = 1; G.blinkT = 1.5; },
    update(G, dt) { G.blinkT -= dt; if (G.blinkT <= 0) { G.open = !G.open; G.blinkT = G.open ? 0.9 + Math.random() * 1.2 : 0.35; }
      G.pux = G.wx + Math.sin(G.t * 1.3) * 10; G.puy = G.wy;
      if (G.click && !G.drop) G.drop = { x: G.mx, y: 40, v: 0 };
      if (G.drop) { G.drop.v += 900 * dt; G.drop.y += G.drop.v * dt; if (G.drop.y >= G.puy) { if (G.open && Math.abs(G.drop.x - G.pux) < 14) { G.hits++; mgSay('¡Dentro!', 0.6); } else mgErr(G.open ? 'Fuera de la pupila' : '¡Has parpadeado!'); G.drop = null; } }
      G.prog = G.hits / G.need; },
    draw(c, G) { c.fillStyle = '#e8f6ff'; c.fillRect(G.mx - 8, 18, 16, 22); c.fillStyle = '#8ac8ff'; c.fillRect(G.mx - 3, 40, 6, 6); if (G.drop) { c.fillStyle = '#8ad8ff'; c.beginPath(); c.arc(G.drop.x, G.drop.y, 5, 0, 7); c.fill(); } } },
  // Rociar hasta cubrir todas las marcas
  spray: { init(G) { G.spots = Array.from({ length: 9 }, (_, i) => ({ x: 90 + (i % 5) * 115 + (i > 4 ? 55 : 0), y: i > 4 ? 245 : 140, on: 0 })); G.puffs = []; },
    update(G, dt) { if (G.click) { G.puffs.push({ x: G.mx, y: G.my, t: 0.8 }); tone(1800, 0.05, 'triangle', 0.015); for (const s of G.spots) if (mgd(G.mx, G.my, s.x, s.y) < 48) s.on = 1; } for (const p of G.puffs) p.t -= dt; G.puffs = G.puffs.filter(p => p.t > 0); G.prog = G.spots.filter(s => s.on).length / G.spots.length; },
    draw(c, G) { for (const s of G.spots) { c.strokeStyle = s.on ? 'rgba(200,224,112,.9)' : 'rgba(255,255,255,.6)'; c.setLineDash(s.on ? [] : [3, 3]); c.beginPath(); c.arc(s.x, s.y, 10, 0, 7); c.stroke(); } c.setLineDash([]); for (const p of G.puffs) { c.fillStyle = `rgba(210,235,150,${p.t * 0.35})`; c.beginPath(); c.arc(p.x, p.y, 50 * (1.2 - p.t * 0.4), 0, 7); c.fill(); } } },
  // Estirar: arrastra hasta la marca y aguanta
  stretch: { init(G) { G.hx = 560; G.hy = G.wy; G.tx = 560; G.ty = G.wy - 110; G.grab = false; G.hold = 0; },
    update(G, dt) { if (G.click && mgd(G.mx, G.my, G.hx, G.hy) < 26) G.grab = true; if (!G.down) { if (G.grab && G.hold < 2.5 && G.hold > 0.2) mgErr('Aguanta un poco más'); G.grab = false; G.hold = 0; G.hx += (560 - G.hx) * 0.2; G.hy += (G.wy - G.hy) * 0.2; }
      if (G.grab) { G.hx = G.mx; G.hy = G.my; if (mgd(G.hx, G.hy, G.tx, G.ty) < 22) G.hold += dt; else G.hold = Math.max(0, G.hold - dt); }
      G.prog = G.hold / 2.5; },
    draw(c, G) { c.strokeStyle = 'rgba(255,211,74,.8)'; c.setLineDash([4, 4]); c.beginPath(); c.arc(G.tx, G.ty, 22, 0, 7); c.stroke(); c.setLineDash([]); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 3; c.beginPath(); c.moveTo(G.wx, G.wy); c.lineTo(G.hx, G.hy); c.stroke(); c.lineWidth = 1; c.fillStyle = '#ffd34a'; c.beginPath(); c.arc(G.hx, G.hy, 12, 0, 7); c.fill(); } },
};
// ---------- Dibujo ----------
function mgRing(c, x, y, r, f, col) { c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); c.strokeStyle = col; c.lineWidth = 5; c.beginPath(); c.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); c.stroke(); c.lineWidth = 1; }
function mgGauge(c, v, z0, z1) { const x = 140, y = 320, w = 360; c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(x, y, w, 14); c.fillStyle = 'rgba(122,224,122,.75)'; c.fillRect(x + w * z0, y, w * (z1 - z0), 14); c.fillStyle = 'rgba(255,107,91,.6)'; c.fillRect(x + w * 0.9, y, w * 0.1, 14); c.fillStyle = '#fff'; c.fillRect(x + w * v - 2, y - 5, 4, 24); }
function mgTool(c, G) { const id = (procNeeds(G.id).tool) || (procNeeds(G.id).use); if (!id) { c.fillStyle = 'rgba(255,220,190,.5)'; c.beginPath(); c.arc(G.mx, G.my, 14, 0, 7); c.fill(); return; } drawItem(c, id, G.mx + 10, G.my - 10, 26); }
function drawPartBig(c, part, skin) {
  const sh = mgDk(skin, -0.25), hi = mgDk(skin, 0.15); c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.35)';
  const grad = (y0, y1) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, hi); g.addColorStop(0.5, skin); g.addColorStop(1, sh); return g; };
  if (part === 'head') { c.fillStyle = grad(30, 340); c.beginPath(); c.ellipse(320, 190, 150, 165, 0, 0, 7); c.fill(); c.stroke();
    for (const ex of [260, 380]) { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, 160, 30, 16, 0, 0, 7); c.fill(); c.fillStyle = '#3a2a1a'; c.beginPath(); c.arc(ex, 160, 9, 0, 7); c.fill(); }
    c.strokeStyle = mgDk(skin, -0.35); c.beginPath(); c.moveTo(320, 175); c.lineTo(310, 225); c.lineTo(325, 228); c.stroke(); c.beginPath(); c.arc(320, 262, 32, 0.2, Math.PI - 0.2); c.stroke(); return; }
  if (part === 'torso') { c.fillStyle = grad(50, 340); c.beginPath(); c.roundRect(110, 40, 420, 300, 70); c.fill(); c.stroke(); c.strokeStyle = mgDk(skin, -0.2); c.beginPath(); c.moveTo(320, 70); c.lineTo(320, 300); c.stroke(); return; }
  if (part === 'handL' || part === 'handR') { c.fillStyle = grad(60, 330); c.beginPath(); c.roundRect(210, 150, 220, 170, 50); c.fill(); c.stroke(); for (let i = 0; i < 4; i++) { c.beginPath(); c.roundRect(222 + i * 52, 40, 42, 130, 20); c.fill(); c.stroke(); } c.beginPath(); c.save(); c.translate(part === 'handL' ? 440 : 200, 220); c.rotate(part === 'handL' ? -0.6 : 0.6); c.roundRect(-20, -70, 40, 110, 20); c.fill(); c.stroke(); c.restore(); return; }
  if (part === 'footL' || part === 'footR') { c.fillStyle = grad(90, 320); c.beginPath(); c.ellipse(320, 220, 230, 95, 0, 0, 7); c.fill(); c.stroke(); for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(part === 'footL' ? 120 + i * 0 : 520, 150 + i * 32, 22 - i * 2, 15, 0, 0, 7); } for (let i = 0; i < 5; i++) { c.beginPath(); c.arc((part === 'footR' ? 530 : 110) + (part === 'footR' ? -1 : 1) * i * 4, 160 + i * 28, 16 - i * 1.5, 0, 7); c.fill(); c.stroke(); } return; }
  // brazos y piernas: miembro horizontal con articulación
  const th = part.startsWith('leg') ? 150 : 120; c.fillStyle = grad(190 - th / 2, 190 + th / 2); c.beginPath(); c.roundRect(20, 190 - th / 2, 600, th, th / 2); c.fill(); c.stroke();
  c.strokeStyle = mgDk(skin, -0.18); c.beginPath(); c.arc(330, 190, th * 0.32, -0.7, 0.7); c.stroke();
}
// La herida tal y como está ahora
function drawWound(c, G) {
  const w = G.w; if (!w) return; const x = G.wx, y = G.wy, t = w.t, s = G.seed, red = '#b8241e', done = w.done || {};
  c.save();
  const blot = (col, rx, ry) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill(); };
  switch (t) {
    case 'scratch': c.strokeStyle = red; c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x - 70, y - 20 + i * 12); c.lineTo(x + 60, y - 30 + i * 14); c.stroke(); } break;
    case 'cut': case 'deepCut': c.strokeStyle = '#7a0e0a'; c.lineWidth = t === 'deepCut' ? 12 : 6; c.beginPath(); c.moveTo(x - 100, y + 4); c.quadraticCurveTo(x, y - 8, x + 100, y); c.stroke(); c.strokeStyle = red; c.lineWidth = t === 'deepCut' ? 6 : 3; c.stroke(); break;
    case 'bite': for (const [dx, dy] of [[-40, -18], [-15, -24], [15, -24], [40, -18], [-35, 20], [-10, 26], [12, 26], [36, 20]]) { c.fillStyle = '#7a0e0a'; c.beginPath(); c.ellipse(x + dx, y + dy, 7, 5, 0, 0, 7); c.fill(); } if (w.ven) blot('rgba(120,200,80,.25)', 80, 50); break;
    case 'sting': blot('rgba(230,80,80,.35)', 30, 22); break;
    case 'burn': blot('rgba(200,60,30,.55)', 95, 55); blot('rgba(255,220,180,.5)', 40, 22); break;
    case 'sunburn': blot('rgba(255,90,80,.28)', 250, 90); break;
    case 'fracture': case 'dislocation': case 'sprain': blot(t === 'sprain' ? 'rgba(120,60,140,.35)' : 'rgba(150,70,110,.4)', 90, 55); if (t === 'fracture' && !w.set) { c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 20, y - 30); c.lineTo(x + 5, y); c.lineTo(x - 10, y + 30); c.stroke(); } break;
    case 'bruise': blot('rgba(90,50,140,.45)', 70, 45); blot('rgba(60,110,80,.2)', 90, 60); break;
    case 'frostbite': blot('rgba(200,220,255,.6)', 90, 50); break;
    case 'rash': case 'insectBite': for (let i = 0; i < (t === 'rash' ? 26 : 8); i++) { const a = i * 2.39 + s, r = 10 + (i * 29 % 70); c.fillStyle = 'rgba(220,60,60,.6)'; c.beginPath(); c.arc(x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 0.7, t === 'rash' ? 3 : 7, 0, 7); c.fill(); } break;
    case 'blister': c.fillStyle = 'rgba(255,245,220,.85)'; c.strokeStyle = 'rgba(200,120,100,.6)'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, 32, 24, 0, 0, 7); c.fill(); c.stroke(); break;
    case 'cramp': case 'knot': c.strokeStyle = 'rgba(180,60,60,.5)'; c.lineWidth = 3; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x - 60, y - 20 + i * 12); for (let k = 0; k < 8; k++) c.lineTo(x - 60 + k * 17, y - 20 + i * 12 + (k % 2 ? 6 : -6)); c.stroke(); } break;
    case 'concussion': blot('rgba(150,70,110,.4)', 60, 30); break;
    case 'eyeDust': for (let i = 0; i < 9; i++) { c.fillStyle = '#6a6a6a'; c.beginPath(); c.arc(x - 20 + (i * 13 % 40), y - 8 + (i * 7 % 16), 2, 0, 7); c.fill(); } break;
    case 'puncture': case 'embedded': blot('#5a0a08', 12, 10); break;
  }
  // Lo que tiene clavado (mientras no lo saques)
  if (w.obj && G.mech !== 'pull' && G.mech !== 'twist' || (G.mech === 'pull' || G.mech === 'twist') && G.prog < 1) {
    const a = G.a ?? -1.1, L = (G.L || (t === 'embedded' ? 150 : t === 'splinter' ? 60 : t === 'thorn' ? 55 : 30)) + (G.out || 0), ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L;
    if (t === 'tick') { c.save(); c.translate(x, y); c.rotate(G.acc || 0); c.fillStyle = '#2a1a10'; c.beginPath(); c.ellipse(0, 0, 13, 9, 0, 0, 7); c.fill(); c.strokeStyle = '#2a1a10'; c.lineWidth = 2; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-6 + i * 4, -6); c.lineTo(-12 + i * 8, -16); c.moveTo(-6 + i * 4, 6); c.lineTo(-12 + i * 8, 16); c.stroke(); } c.restore(); }
    else if (w.obj || G.mech === 'pull') { c.strokeStyle = t === 'embedded' || t === 'puncture' ? '#6a4a2a' : t === 'thorn' ? '#4a7a3a' : t === 'sting' ? '#2a2a2a' : '#8a5a3a'; c.lineWidth = t === 'embedded' ? 6 : 4; c.beginPath(); c.moveTo(x + Math.cos(a) * (G.out || 0), y + Math.sin(a) * (G.out || 0)); c.lineTo(ex, ey); c.stroke();
      if (t === 'embedded') { c.fillStyle = '#e8e0d0'; c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex + Math.cos(a + 2.6) * 18, ey + Math.sin(a + 2.6) * 18); c.lineTo(ex + Math.cos(a - 2.6) * 18, ey + Math.sin(a - 2.6) * 18); c.fill(); } }
  }
  // Suciedad, puntos, vendaje… (lo ya hecho)
  if (w.dirt && G.mech !== 'scrub') for (let i = 0; i < 7; i++) { c.fillStyle = 'rgba(90,64,48,.7)'; c.beginPath(); c.arc(x - 60 + (i * 23 % 120), y - 20 + (i * 17 % 40), 4, 0, 7); c.fill(); }
  if (w.inf) blot('rgba(220,200,60,.25)', 110, 65);
  if (w.st) { c.strokeStyle = '#2a2a3a'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(x - 80 + i * 32, y - 16); c.lineTo(x - 80 + i * 32 + 10, y + 16); c.stroke(); } }
  if (w.sp) { c.fillStyle = '#b08a5a'; c.fillRect(x - 115, y - 90, 230, 20); c.fillRect(x - 115, y + 70, 230, 20); }
  if (w.b && G.mech !== 'wrap') { c.fillStyle = 'rgba(248,244,234,.88)'; c.fillRect(x - 70, y - 95, 140, 190); c.strokeStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(x - 70, y - 90 + i * 32); c.lineTo(x + 70, y - 70 + i * 32); c.stroke(); } }
  c.restore();
}
function mgDraw() {
  const cv = $('mgC'); if (!cv) return; const c = cv.getContext('2d'), G = MGS;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, MG_W, MG_H);
  const bg = c.createRadialGradient(320, 180, 40, 320, 180, 420); bg.addColorStop(0, '#2a2c30'); bg.addColorStop(1, '#141517'); c.fillStyle = bg; c.fillRect(0, 0, MG_W, MG_H);
  if (G.shake > 0) c.translate((Math.random() - 0.5) * 10 * G.shake / 0.3, (Math.random() - 0.5) * 6 * G.shake / 0.3);
  drawPartBig(c, G.part, mgSkin()); drawWound(c, G); MGMECH[G.mech].draw(c, G);
  if (G.flash > 0) { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = `rgba(255,40,30,${G.flash * 0.5})`; c.fillRect(0, 0, MG_W, MG_H); }
  $('mgP').style.width = (G.prog * 100).toFixed(1) + '%';
  const m = $('mgM'); m.textContent = G.msg; m.classList.toggle('on', !!G.msg); m.classList.toggle('ok', !!G.end);
}
