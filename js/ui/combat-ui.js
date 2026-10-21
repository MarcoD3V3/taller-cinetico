'use strict';
// Dibujo del jugador (con cuerpo), enemigos, jefes, proyectiles, peligros, mascotas y NPC;
// barra de jefe, barra de hechizos, pantallas numéricas y eventos de las ventanas nuevas.
// ---------- Jugador ----------
function drawPlayer(ctx) {
  // Mirada: al caminar, hacia donde vas; parado, hacia el cursor (también al atacar)
  // Al pararse sigue mirando hacia donde iba hasta que el cursor se mueva (o ataque)
  const p = S.player, mw = mouseWorld(), moving = pmove.moving;
  if (moving) { P.faceA = pmove.ang; P.faceMx = mouse.x; P.faceMy = mouse.y; }
  else if (P.swing > 0) P.faceA = P.swingA;
  else if (P.faceA === undefined || Math.abs(mouse.x - P.faceMx) + Math.abs(mouse.y - P.faceMy) > 3) { P.faceA = Math.atan2(mw.y - p.y, mw.x - p.x); P.faceMx = -1e9; }
  if (FSH.st) P.faceA = Math.atan2(FSH.by - p.y, FSH.bx - p.x); // pescando: mira al corcho
  const fa = P.faceA;
  const sw = moving ? Math.sin(P.walk) : 0, ca = Math.cos(fa), sa = Math.sin(fa), px = -sa, py = ca; // (px,py) = lado derecho
  const m = mountPet();
  if (m) { const spr = animalSprite(m.sp), s = spr.size; ctx.save(); ctx.translate(p.x, p.y + 6); if (Math.cos(fa) < 0) ctx.scale(-1, 1); ctx.drawImage(spr.f[0], -s / 2, s / 2 - spr.h, s, spr.h); ctx.restore(); }
  // Salto (z), nado (sw) y balanceo en el agua profunda
  const z = P.z || 0, swm = m ? 0 : P.swim || 0, bob = swm === 2 ? Math.sin(performance.now() / 320) * 1.3 : 0;
  const by = m ? -8 : 0, x = p.x, y = p.y + by;
  drawRipples(ctx);
  for (const f of FX) if (f.ghost) { ctx.globalAlpha = f.t * 1.5; circ(ctx, f.x, f.y + by, 8, '#7ab0ff'); } ctx.globalAlpha = 1;
  if (!swm) { const k = 1 / (1 + z / 22); ctx.fillStyle = `rgba(0,0,0,${0.3 * k})`; ctx.beginPath(); ctx.ellipse(x, p.y + 8, 10 * k, 4 * k, 0, 0, 7); ctx.fill(); }
  // Sprite por capas (pelo, ropa y armadura incluidos); el objeto de la mano gira al atacar
  const ch = charData(), sw2 = P.swing > 0 ? (1 - P.swing / 0.2) * 2.2 - 1.1 : 0;
  if (P.hurtT > 0 && ((P.hurtT * 30) | 0) % 2) ctx.globalAlpha = 0.55;
  // En el aire: piernas abiertas (fotograma de zancada). En el agua: solo asoma lo que queda sobre la superficie
  const air = z > 0.5, wl = swm === 2 ? y + 1 + bob : y + 6, held = !ui.hand && swm !== 2 ? heldId() : null;
  if (swm) { ctx.save(); ctx.beginPath(); ctx.rect(x - 60, y - 90, 120, wl - (y - 90)); ctx.clip(); }
  drawAvatar(ctx, ch.look, S.equip, x, y + 8 - z + (swm === 2 ? 9 + bob : swm ? 2 : 0), fa, air ? 1.2 : P.walk, (moving || air) && !m, 1.6, held, sw2);
  if (swm) { ctx.restore(); ctx.globalAlpha = 1;
    // Superficie alrededor del cuerpo: anillo claro y brillo que se mueve con el oleaje
    const t = performance.now() / 400; ctx.fillStyle = 'rgba(120,180,230,.35)'; ctx.beginPath(); ctx.ellipse(x, wl, 11, 3.6, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(230,246,255,.75)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, wl, 11 + Math.sin(t) * 0.8, 3.6, 0, 0, 7); ctx.stroke();
    if (moving) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); const ca2 = Math.cos(pmove.ang), sa2 = Math.sin(pmove.ang); ctx.moveTo(x - ca2 * 10 - sa2 * 6, wl - sa2 * 3 + ca2 * 2); ctx.lineTo(x - ca2 * 18, wl - sa2 * 6); ctx.lineTo(x - ca2 * 10 + sa2 * 6, wl - sa2 * 3 - ca2 * 2); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
  drawFishing(ctx, x, y - z);
  const hr = { x: x + ca * 10, y: y - 6 + sa * 10 };
  if (P.shield > 0) { ctx.strokeStyle = 'rgba(200,168,255,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 15, 0, 7); ctx.stroke(); }
  if (P.grap) { ctx.strokeStyle = '#9aa0a8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(hr.x, hr.y); ctx.lineTo(P.grap.x, P.grap.y); ctx.stroke(); }
  if (P.chill > 0) { ctx.strokeStyle = 'rgba(138,216,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.stroke(); }
}
// ---------- Sprites de enemigos ----------
const _foeSpr = new Map();
function foeSprite(D) {
  const key = D.n + D.c + D.s; let s = _foeSpr.get(key); if (s) return s;
  const R = D.s, sz = R * 2.8 + 8, cv2 = mkCanvas(sz * SPR_S, sz * SPR_S), c = cv2.getContext('2d');
  c.scale(SPR_S, SPR_S); c.translate(sz / 2, sz / 2);
  const ol = 'rgba(0,0,0,.55)', eye = D.el === 'fire' ? '#ffd040' : D.el === 'frost' ? '#bff0ff' : D.undead ? '#7af0ff' : '#ff3a2a';
  const body = (x, y, w, h, col) => { c.beginPath(); c.ellipse(x, y, w, h, 0, 0, 7); c.fillStyle = col; c.fill(); c.strokeStyle = ol; c.lineWidth = 1; c.stroke(); };
  const lighter = tintMix(D.c, '#ffffff', 0.25), darker = tintMix(D.c, '#000000', 0.3);
  if (D.shape !== 'fly' && D.shape !== 'ghost') { c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(1, R * 0.75, R * 0.85, R * 0.3, 0, 0, 7); c.fill(); }
  switch (D.shape) {
    case 'hum': case 'skel': {
      const sk = D.shape === 'skel', col = sk ? D.c : D.c;
      for (const s2 of [-1, 1]) { c.fillStyle = darker; c.fillRect(s2 * R * 0.3 - R * 0.13, R * 0.25, R * 0.26, R * 0.55); }
      if (sk) { c.strokeStyle = D.c; c.lineWidth = R * 0.14; c.beginPath(); c.moveTo(0, -R * 0.2); c.lineTo(0, R * 0.35); for (let i = 0; i < 3; i++) { c.moveTo(-R * 0.3, -R * 0.05 + i * R * 0.13); c.lineTo(R * 0.3, -R * 0.05 + i * R * 0.13); } c.stroke(); }
      else body(0, R * 0.05, R * 0.48, R * 0.42, col);
      for (const s2 of [-1, 1]) body(s2 * R * 0.6, R * 0.05, R * 0.16, R * 0.32, sk ? D.c : lighter);
      body(0, -R * 0.45, R * 0.36, R * 0.34, sk ? '#f0ece0' : lighter);
      for (const s2 of [-1, 1]) circ(c, s2 * R * 0.13, -R * 0.47, Math.max(1.2, R * 0.07), sk ? '#111' : eye);
      if (D.crown) { c.fillStyle = '#ffd34a'; c.beginPath(); c.moveTo(-R * 0.3, -R * 0.72); for (let i = 0; i <= 4; i++) c.lineTo(-R * 0.3 + i * R * 0.15, -R * (i % 2 ? 0.78 : 0.98)); c.lineTo(R * 0.3, -R * 0.72); c.fill(); }
      if (D.horns) { c.fillStyle = '#2a1a1a'; for (const s2 of [-1, 1]) { c.beginPath(); c.moveTo(s2 * R * 0.2, -R * 0.7); c.lineTo(s2 * R * 0.5, -R * 1.05); c.lineTo(s2 * R * 0.32, -R * 0.62); c.fill(); } }
      break;
    }
    case 'blob': {
      c.beginPath(); c.moveTo(-R, R * 0.5); c.quadraticCurveTo(-R * 1.05, -R * 0.9, 0, -R * 0.85); c.quadraticCurveTo(R * 1.05, -R * 0.9, R, R * 0.5); c.closePath();
      c.fillStyle = D.c; c.globalAlpha = 0.9; c.fill(); c.globalAlpha = 1; c.strokeStyle = ol; c.stroke();
      circ(c, -R * 0.35, -R * 0.45, R * 0.18, 'rgba(255,255,255,.35)');
      for (const s2 of [-1, 1]) { circ(c, s2 * R * 0.28, -R * 0.1, R * 0.14, '#111'); circ(c, s2 * R * 0.28 - 1, -R * 0.14, R * 0.05, '#fff'); }
      if (D.crown) { c.fillStyle = '#ffd34a'; c.beginPath(); c.moveTo(-R * 0.35, -R * 0.75); for (let i = 0; i <= 4; i++) c.lineTo(-R * 0.35 + i * R * 0.175, -R * (i % 2 ? 0.82 : 1.08)); c.lineTo(R * 0.35, -R * 0.75); c.fill(); }
      break;
    }
    case 'quad': {
      for (const [lx, ly] of [[-0.55, 0.35], [0.55, 0.35], [-0.35, 0.45], [0.35, 0.45]]) { c.fillStyle = darker; c.fillRect(lx * R - R * 0.08, ly * R - R * 0.1, R * 0.16, R * 0.4); }
      body(0, 0, R * 0.9, R * 0.48, D.c);
      if (D.heads) for (let i = 0; i < D.heads; i++) { const a = -0.6 + i * 0.6; body(Math.cos(a - 1.57 + 1.57) * R * 0.9, -R * 0.4 + Math.sin(a) * R * 0.5, R * 0.3, R * 0.24, lighter); circ(c, Math.cos(a) * R * 0.95 + R * 0.08, -R * 0.45 + Math.sin(a) * R * 0.5, 1.6, eye); }
      else { body(R * 0.85, -R * 0.25, R * 0.36, R * 0.3, lighter); circ(c, R * 1, -R * 0.32, Math.max(1.3, R * 0.07), eye); }
      if (D.el === 'fire' || D.shape === 'quad' && D.s > 30) { c.fillStyle = D.c2; c.globalAlpha = 0.8; c.beginPath(); c.moveTo(-R * 0.3, -R * 0.2); c.lineTo(-R * 0.9, -R * 0.95); c.lineTo(R * 0.1, -R * 0.35); c.fill(); c.beginPath(); c.moveTo(R * 0.1, -R * 0.2); c.lineTo(-R * 0.2, -R * 1); c.lineTo(R * 0.45, -R * 0.35); c.fill(); c.globalAlpha = 1; }
      break;
    }
    case 'fly': {
      c.fillStyle = D.c2 && D.c2 !== '#1a1a1a' ? D.c2 : darker; c.globalAlpha = 0.85;
      for (const s2 of [-1, 1]) { c.beginPath(); c.moveTo(0, -R * 0.1); c.quadraticCurveTo(s2 * R * 1.3, -R * 0.9, s2 * R * 1.2, R * 0.2); c.quadraticCurveTo(s2 * R * 0.6, 0, 0, R * 0.1); c.fill(); }
      c.globalAlpha = 1; body(0, 0, R * 0.42, R * 0.5, D.c); body(0, -R * 0.45, R * 0.28, R * 0.26, lighter);
      for (const s2 of [-1, 1]) circ(c, s2 * R * 0.1, -R * 0.48, Math.max(1.1, R * 0.06), eye);
      break;
    }
    case 'bug': {
      c.strokeStyle = darker; c.lineWidth = Math.max(1, R * 0.08);
      for (let i = 0; i < 4; i++) for (const s2 of [-1, 1]) { c.beginPath(); c.moveTo(s2 * R * 0.2, -R * 0.2 + i * R * 0.18); c.quadraticCurveTo(s2 * R * 0.9, -R * 0.5 + i * R * 0.3, s2 * R * 1.05, R * 0.1 + i * R * 0.25); c.stroke(); }
      body(0, R * 0.25, R * 0.5, R * 0.55, D.c); body(0, -R * 0.4, R * 0.32, R * 0.28, lighter);
      for (let i = 0; i < 4; i++) circ(c, -R * 0.15 + (i % 2) * R * 0.3, -R * 0.5 + (i >> 1) * R * 0.12, Math.max(1, R * 0.05), eye);
      if (D.crown) { c.fillStyle = D.c2; c.beginPath(); c.arc(0, R * 0.25, R * 0.22, 0, 7); c.fill(); }
      break;
    }
    case 'ghost': {
      c.globalAlpha = 0.75; c.beginPath(); c.moveTo(-R * 0.6, R * 0.6); c.lineTo(-R * 0.6, -R * 0.2); c.arc(0, -R * 0.2, R * 0.6, Math.PI, 0); c.lineTo(R * 0.6, R * 0.6);
      for (let i = 0; i < 4; i++) c.lineTo(R * 0.6 - (i + 0.5) * R * 0.3, R * (i % 2 ? 0.6 : 0.35)); c.closePath(); c.fillStyle = D.c; c.fill(); c.globalAlpha = 1;
      for (const s2 of [-1, 1]) { c.beginPath(); c.ellipse(s2 * R * 0.22, -R * 0.25, R * 0.1, R * 0.16, 0, 0, 7); c.fillStyle = D.c === '#14141a' ? '#a060ff' : '#1a1a2a'; c.fill(); }
      break;
    }
    case 'golem': {
      c.fillStyle = darker; c.fillRect(-R * 0.5, R * 0.2, R * 0.35, R * 0.55); c.fillRect(R * 0.15, R * 0.2, R * 0.35, R * 0.55);
      c.fillStyle = D.c; c.strokeStyle = ol; c.fillRect(-R * 0.65, -R * 0.4, R * 1.3, R * 0.75); c.strokeRect(-R * 0.65, -R * 0.4, R * 1.3, R * 0.75);
      c.fillStyle = lighter; c.fillRect(-R * 1, -R * 0.35, R * 0.32, R * 0.7); c.fillRect(R * 0.68, -R * 0.35, R * 0.32, R * 0.7);
      c.fillStyle = D.c; c.fillRect(-R * 0.35, -R * 0.85, R * 0.7, R * 0.5); c.strokeRect(-R * 0.35, -R * 0.85, R * 0.7, R * 0.5);
      c.fillStyle = D.c2 || eye; c.fillRect(-R * 0.22, -R * 0.68, R * 0.14, R * 0.1); c.fillRect(R * 0.08, -R * 0.68, R * 0.14, R * 0.1);
      c.fillStyle = D.c2 || eye; c.globalAlpha = 0.6; c.beginPath(); c.arc(0, -R * 0.05, R * 0.14, 0, 7); c.fill(); c.globalAlpha = 1;
      break;
    }
  }
  _foeSpr.set(key, cv2); return cv2;
}
// ---------- Dibujo del combate (en coordenadas del mundo) ----------
function drawCombat(ctx, k, ox, oy, x0, y0, x1, y1) {
  const inView = (x, y, r) => x + r > x0 * T && x - r < (x1 + 1) * T && y + r > y0 * T && y - r < (y1 + 1) * T;
  // Peligros y avisos
  for (const h of HAZ) {
    if (h.kind === 'line') { ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.ang); ctx.fillStyle = h.c + '33'; ctx.fillRect(0, -h.w / 2, h.len, h.w); ctx.fillStyle = h.c + '88'; ctx.fillRect(0, -h.w / 2, h.len * (1 - h.t / h.dl), h.w); ctx.restore(); continue; }
    if (!inView(h.x, h.y, h.r)) continue;
    if (h.kind === 'warn') { ctx.fillStyle = h.c + '30'; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, 7); ctx.fill(); ctx.strokeStyle = h.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(h.x, h.y, h.r * (1 - h.t / h.dl), 0, 7); ctx.stroke(); }
    else { ctx.globalAlpha = Math.min(1, h.t) * (h.kind === 'hole' ? 0.85 : 0.45); ctx.fillStyle = h.c; ctx.beginPath(); ctx.arc(h.x, h.y, h.r * (h.kind === 'hole' ? 0.5 + 0.1 * Math.sin(S.time * 8) : 1), 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  }
  // Mascotas y NPC
  for (const pt of S.pets || []) { if (pt.ride || !inView(pt.x, pt.y, 30)) continue; const spr = animalSprite(pt.sp), s = spr.size; ctx.save(); ctx.translate(pt.x, pt.y + Math.sin(pt.ph || 0) * 1); if ((pt.face || 1) < 0) ctx.scale(-1, 1); ctx.drawImage(spr.f[0], -s / 2, s / 2 - spr.h, s, spr.h); ctx.restore(); ctx.font = '9px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = pt.mode === 'stay' ? '#aaa' : '#ff6a8a'; ctx.fillText(pt.mode === 'stay' ? '■' : '❤', pt.x, pt.y - SPECIES[pt.sp].s - 6); if (pt.hp < pt.mhp) bar(ctx, pt.x, pt.y - SPECIES[pt.sp].s - 3, 18, pt.hp / pt.mhp, '#7fd07a'); }
  for (const s of SUMMONS) { const spr = animalSprite(s.sp), z = spr.size; ctx.globalAlpha = 0.7; ctx.save(); ctx.translate(s.x, s.y); if ((s.face || 1) < 0) ctx.scale(-1, 1); ctx.drawImage(spr.f[0], -z / 2, z / 2 - spr.h, z, spr.h); ctx.restore(); ctx.globalAlpha = 1; }
  for (const n of S.npcs || []) { if (!inView(n.x, n.y, 20)) continue; drawNpc(ctx, n); }
  // Enemigos
  for (const f of FOES) {
    const D = f.D; if (!inView(f.x, f.y, D.s * 1.5)) continue;
    const spr = foeSprite(D), s = spr.width / SPR_S, bob = Math.sin(f.ph) * (D.shape === 'fly' || D.shape === 'ghost' ? 3 : 1);
    if (f.boss || D.elite || D.glow) { ctx.globalAlpha = 0.25 + 0.1 * Math.sin(f.ph); ctx.fillStyle = f.boss ? D.c2 : D.elite ? '#ffd34a' : D.c; ctx.beginPath(); ctx.arc(f.x, f.y, D.s * 1.25, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(f.x, f.y + bob); if (f.face < 0) ctx.scale(-1, 1);
    if (f.clone) ctx.globalAlpha = 0.6; if (f.frz > 0) ctx.globalAlpha = 0.7;
    ctx.drawImage(spr, -s / 2, -s / 2, s, s); ctx.globalAlpha = 1;
    if (f.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.drawImage(spr, -s / 2, -s / 2, s, s); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    ctx.restore();
    if (f.frz > 0) { ctx.strokeStyle = '#bff0ff'; ctx.lineWidth = 2; ctx.strokeRect(f.x - D.s, f.y - D.s, D.s * 2, D.s * 2); }
    if (f.tele > 0 || f.fuse > 0) { ctx.strokeStyle = '#ff3a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, D.s + 4 + Math.sin(S.time * 30) * 2, 0, 7); ctx.stroke(); }
    if (f.shieldT > 0) { ctx.strokeStyle = 'rgba(200,168,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y, D.s * 1.3, 0, 7); ctx.stroke(); }
    if (!f.boss && f.hp < f.mhp) bar(ctx, f.x, f.y - D.s - 6, Math.max(18, D.s * 1.6), f.hp / f.mhp, D.elite ? '#ffd34a' : '#e05050');
    if (D.elite && !f.boss) { ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd34a'; ctx.fillText('★', f.x, f.y - D.s - 10); }
  }
  // Proyectiles
  for (const pj of PROJ) {
    if (!inView(pj.x, pj.y, 10)) continue;
    if (pj.arrow) { const a = Math.atan2(pj.vy, pj.vx); ctx.strokeStyle = pj.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pj.x - Math.cos(a) * 9, pj.y - Math.sin(a) * 9); ctx.lineTo(pj.x, pj.y); ctx.stroke(); continue; }
    if (pj.glow || pj.team === 'e') { ctx.globalAlpha = 0.35; circ(ctx, pj.x, pj.y, pj.r * 2, pj.c); ctx.globalAlpha = 1; }
    circ(ctx, pj.x, pj.y, pj.r, pj.c);
  }
  // Efectos
  for (const f of FX) {
    if (f.ghost) continue;
    if (f.ring) { ctx.globalAlpha = Math.min(1, f.t * 2.5); ctx.strokeStyle = f.c; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y, f.ring * (1.1 - f.t), 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    else if (f.bolt) { ctx.strokeStyle = f.c; ctx.lineWidth = f.wide || 2.5; ctx.globalAlpha = Math.min(1, f.t * 5); ctx.beginPath(); ctx.moveTo(f.x, f.y); const n = f.wide ? 1 : 5; for (let i = 1; i <= n; i++) { const t = i / n; ctx.lineTo(f.x + (f.x2 - f.x) * t + (i < n ? (Math.random() - 0.5) * 14 : 0), f.y + (f.y2 - f.y) * t + (i < n ? (Math.random() - 0.5) * 14 : 0)); } ctx.stroke(); ctx.globalAlpha = 1; }
    else if (f.txt) { ctx.font = f.big ? 'bold 16px "Chakra Petch",system-ui' : 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.globalAlpha = Math.min(1, f.t * 2); ctx.fillStyle = '#000'; ctx.fillText(f.txt, f.x + 1, f.y + 1); ctx.fillStyle = f.c; ctx.fillText(f.txt, f.x, f.y); ctx.globalAlpha = 1; }
  }
  // Radio de las protecciones: al llevarlas en la mano o al apuntar a una
  { const sel = selectedBlock(), hb = at(mouse.tx, mouse.ty), wk = sel && WARD_DEF[sel] ? sel : hb && WARD_DEF[hb.type] ? hb.type : null;
    if (wk) { const cx = (hb && hb.type === wk ? hb.x : mouse.tx) * T + 16, cy = (hb && hb.type === wk ? hb.y : mouse.ty) * T + 16, r = WARD_DEF[wk].r * T; ctx.strokeStyle = 'rgba(255,246,176,.6)'; ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = 'rgba(255,246,176,.05)'; ctx.fill(); } }
  for (const z of S.wards || []) if (inView(z.x, z.y, z.r * T)) { ctx.strokeStyle = 'rgba(255,246,176,.35)'; ctx.setLineDash([4, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(z.x, z.y, z.r * T, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  // Pantallas numéricas y torretas
  if (L.display) { ctx.font = 'bold 14px "Chakra Petch",monospace'; ctx.textAlign = 'center'; for (const b of L.display) { if (b.x < x0 || b.x > x1 || b.y < y0 || b.y > y1) continue; const v = b.num !== undefined && b.num !== '' ? b.num : (b.pv || 0); ctx.fillStyle = '#7fff8a'; ctx.fillText(String(typeof v === 'number' ? Math.round(v * 10) / 10 : v).slice(0, 5), b.x * T + 16, b.y * T + 21); } }
  if (L.turret) for (const b of L.turret) { if (b.aim === undefined) continue; ctx.strokeStyle = '#2a3a4a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(b.x * T + 16, b.y * T + 16); ctx.lineTo(b.x * T + 16 + Math.cos(b.aim) * 13, b.y * T + 16 + Math.sin(b.aim) * 13); ctx.stroke(); }
}
function bar(ctx, x, y, w, f, c) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - w / 2, y, w, 3); ctx.fillStyle = c; ctx.fillRect(x - w / 2, y, w * clamp(f, 0, 1), 3); }
function drawNpc(ctx, n) {
  const N = NPCS[n.type], L3 = npcLook(n.type), moving = n.tx !== undefined && Math.hypot(n.tx - n.x, n.ty - n.y) > 2;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(n.x, n.y + 8, 9, 4, 0, 0, 7); ctx.fill();
  const near = Math.hypot(S.player.x - n.x, S.player.y - n.y) < 4 * T, a = near ? Math.atan2(S.player.y - n.y, S.player.x - n.x) : moving ? Math.atan2(n.ty - n.y, n.tx - n.x) : Math.PI / 2;
  drawAvatar(ctx, L3.look, L3.equip, n.x, n.y + 8, a, n.ph || 0, moving, 1.6);
  ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(N.n, n.x + 1, n.y - 33); ctx.fillStyle = '#ffd34a'; ctx.fillText(N.n, n.x, n.y - 34);
}
// ---------- Barra de hechizos ----------
let _spSig = '';
function refreshSpellBar() {
  const st = S && S.spells, el = $('spellBar'); if (!el) return;
  if (!st || !st.known.length || ui.open === 'title') { el.hidden = true; return; } el.hidden = false;
  const sig = st.slots.join() + Object.keys(P.scd).map(k => P.scd[k] > 0 ? Math.ceil(P.scd[k] * 4) : 0).join() + (S.pc ? Math.floor(S.pc.mana) : 0);
  if (sig === _spSig) return; _spSig = sig;
  el.innerHTML = st.slots.map((k, i) => { const s = k && SPELLS[k], cd = k ? Math.max(0, P.scd[k] || 0) : 0, low = s && S.pc && S.pc.mana < s.m; return `<div class="spl ${low ? 'low' : ''}" title="${s ? esc(s.n) + ' · ' + s.m + ' maná' : 'Vacío'}" style="--c:${s ? s.c : '#444'}"><span>${s ? s.i : ''}</span><kbd>${SPELL_KEYS[i].toUpperCase()}</kbd>${cd > 0 ? `<i style="height:${Math.min(100, cd / s.cd * 100)}%"></i>` : ''}</div>`; }).join('');
}
// Ficha del personaje: hechizos y mascotas
function charExtraHTML() {
  const ch = charData(), cm = CM(), pf = PROFS[ch.prof] || PROFS.vagabond;
  let h = `<div class="cat row">${esc(ch.name)} · ${pf.i} ${esc(pf.n)} <button data-look="1">Apariencia</button></div><div class="tchips">${ch.traits.map(t => `<span class="chip ${TRAITS[t].c > 0 ? 'good' : 'bad'}" title="${esc(TRAITS[t].d)}">${TRAITS[t].i} ${esc(TRAITS[t].n)}</span>`).join('') || '<span class="mut small">Sin rasgos</span>'}</div>`;
  h += `<div class="cstats"><span title="Defensa de la armadura">🛡 ${cm.def}</span><span title="Daño cuerpo a cuerpo">⚔ ${Math.round(cm.melee * 100)} %</span><span title="Velocidad por rasgos y armadura">👟 ${Math.round(cm.speed * 100)} %</span><span title="Abrigo">🧥 ${cm.warm >= 0 ? '+' : ''}${cm.warm}°</span></div>`;
  const st = spellState(); h += '<div class="cat">Hechizos</div>';
  if (!st.known.length) h += '<div class="mut small">Lee pergaminos de hechizo (F) para aprenderlos.</div>';
  for (const k of st.known) { const s = SPELLS[k]; h += `<div class="spr"><span style="color:${s.c}">${s.i}</span><span>${esc(s.n)} <span class="mut">· ${s.m} ✦</span></span><span>${SPELL_KEYS.map((key, i) => `<button class="${st.slots[i] === k ? 'on' : ''}" data-slot="${k}|${i}">${key.toUpperCase()}</button>`).join('')}</span></div>`; }
  h += '<div class="cat">Mascotas</div>';
  if (!(S.pets || []).length) h += '<div class="mut small">Pulsa F sobre un animal con su comida favorita en la mano.</div>';
  (S.pets || []).forEach((pt, i) => { const tm = TAME[pt.sp]; h += `<div class="spr"><span>${tm.role === 'mount' ? '🐎' : tm.role === 'farm' ? '🌾' : '⚔'}</span><span>${esc(SPECIES[pt.sp].n)} <span class="mut">· ${Math.round(pt.hp)}/${pt.mhp}</span></span><span><button data-pet="${i}">${pt.ride ? 'Bajar' : pt.mode === 'stay' ? 'Seguir' : 'Quieto'}</button><button data-free="${i}" title="Liberar">✕</button></span></div>`; });
  return h;
}
$('mChar').addEventListener('click', e => {
  if (e.target.closest('[data-look]')) { closeModal(); openCharCreator('look'); return; }
  const sl = e.target.closest('[data-slot]'); if (sl) { const [k, i] = sl.dataset.slot.split('|'), st = spellState(); for (let j = 0; j < 4; j++) if (st.slots[j] === k) st.slots[j] = null; st.slots[+i] = k; _charSig = ''; _spSig = ''; refreshChar(); return; }
  const pb = e.target.closest('[data-pet]'); if (pb) { const pt = S.pets[+pb.dataset.pet]; if (pt.ride) pt.ride = false; else pt.mode = pt.mode === 'stay' ? 'follow' : 'stay'; _charSig = ''; refreshChar(); return; }
  const fr = e.target.closest('[data-free]'); if (fr) { const pt = S.pets.splice(+fr.dataset.free, 1)[0]; ANIMALS.push({ sp: pt.sp, x: pt.x, y: pt.y, tx: 0, ty: 0, t: 0, face: 1, ph: 0 }); _charSig = ''; refreshChar(); }
});
// Terminal y comercio
$('mComp').addEventListener('click', e => {
  const b = _compB; if (!b) return;
  if (e.target.id === 'compRun') { b.code = $('compCode').value; if (b.run) compStop(b); else compStart(b); refreshComp(); }
});
$('mComp').addEventListener('input', e => { if (e.target.id === 'compCode' && _compB) _compB.code = e.target.value; });
$('mComp').addEventListener('change', e => { if (e.target.id === 'compEx' && e.target.value && _compB) { _compB.code = COMP_EX[e.target.value]; $('compCode').value = _compB.code; e.target.value = ''; } });
$('mComp').addEventListener('keydown', e => { if (e.key === 'Tab' && e.target.id === 'compCode') { e.preventDefault(); const t = e.target, s = t.selectionStart; t.value = t.value.slice(0, s) + '  ' + t.value.slice(t.selectionEnd); t.selectionStart = t.selectionEnd = s + 2; } });
$('bMute').onclick = () => { if (!S) return; S.mute = !S.mute; $('bMute').textContent = S.mute ? 'Sonido: no' : 'Sonido: sí'; if (S.mute) bossMusic(false); else if (BOSS) bossMusic(true, BOSS.k); };
