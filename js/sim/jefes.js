'use strict';
// =====================================================================================
//  Jefes que se sienten enormes (los jefes y Colosos ya existen: sim/combat.js y sim/worldboss.js):
//   · Al pisar levantan polvo y el suelo tiembla un poco si estás cerca.
//   · Cuando atacan, el golpe agrieta el suelo: grietas de píxeles que salen del impacto, tierra levantada y
//     temblor de pantalla. Las grietas se van borrando poco a poco.
//   · Barra de vida en pixel art: el daño recién hecho se queda en claro un momento y baja despacio.
//  Solo es imagen y sensación: no cambia la vida ni el daño de nadie.
// =====================================================================================
const JF = { grietas: [], polvo: [], ult: null, paso: 0, cd: null, trail: 1 };
function jfTick(dt) {
  if (typeof BOSS === 'undefined' || !BOSS || !S) { JF.ult = null; JF.cd = null; } else {
    const b = BOSS, R = (b.D && b.D.s) || 20, p = S.player, d = Math.hypot(p.x - b.x, p.y - b.y);
    // pasos: polvo a los pies y un temblor suave si está cerca
    if (JF.ult) { const mov = Math.hypot(b.x - JF.ult.x, b.y - JF.ult.y); JF.paso += mov;
      if (JF.paso > R * 1.4) { JF.paso = 0; for (let i = 0; i < 6; i++) JF.polvo.push({ x: b.x + (Math.random() - 0.5) * R * 1.4, y: b.y + R * 0.7, vx: (Math.random() - 0.5) * 30, vy: -6 - Math.random() * 10, t: 0, d: 0.7 + Math.random() * 0.5 });
        if (d < 10 * T) shake = Math.max(shake, 0.08 * (1 - d / (10 * T)) + 0.02); if (d < 14 * T) tone(48 + Math.random() * 10, 0.12, 'sine', 0.05 * (1 - d / (14 * T)), 0.6); } }
    JF.ult = { x: b.x, y: b.y };
    // golpe: cuando su espera entre ataques se reinicia (sube de golpe), el suelo se agrieta donde pega
    if (JF.cd !== null && b.cd > JF.cd + 0.25) jfGolpe(b, R, d);
    JF.cd = b.cd;
    const f = Math.max(0, b.hp / b.mhp); JF.trail = Math.max(f, JF.trail - dt * 0.18); if (JF.trail < f) JF.trail = f;
    const el = document.getElementById('bossBar'), bar = el && el.querySelector('.bbb'); if (bar) { let t = bar.querySelector('b.bbt'); if (!t) { t = document.createElement('b'); t.className = 'bbt'; bar.appendChild(t); } t.style.width = (JF.trail * 100).toFixed(1) + '%'; } }
  for (let i = JF.grietas.length - 1; i >= 0; i--) if ((JF.grietas[i].t += dt) > 20) JF.grietas.splice(i, 1);
  for (let i = JF.polvo.length - 1; i >= 0; i--) { const q = JF.polvo[i]; q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy *= 0.96; if (q.t > q.d) JF.polvo.splice(i, 1); }
  if (JF.polvo.length > 200) JF.polvo.splice(0, JF.polvo.length - 200);
}
function jfGolpe(b, R, d) {
  const p = S.player, a = Math.atan2(p.y - b.y, p.x - b.x), lejos = Math.min(R * 1.6, d), x = b.x + Math.cos(a) * lejos * 0.6, y = b.y + Math.sin(a) * lejos * 0.6 + R * 0.4;
  const ramas = []; const n = 5 + ((Math.random() * 3) | 0);
  for (let i = 0; i < n; i++) { let ang = (i / n) * Math.PI * 2 + Math.random() * 0.6, px = 0, py = 0; const pts = [0, 0], L = R * (0.9 + Math.random() * 1.3);
    for (let s = 0; s < L; s += 3) { ang += (Math.random() - 0.5) * 0.7; px += Math.cos(ang) * 3; py += Math.sin(ang) * 3 * 0.6; pts.push(Math.round(px), Math.round(py)); } ramas.push(pts); }
  JF.grietas.push({ x, y, ramas, t: 0, r: R });
  for (let i = 0; i < 16; i++) JF.polvo.push({ x: x + (Math.random() - 0.5) * R, y: y + (Math.random() - 0.5) * R * 0.5, vx: (Math.random() - 0.5) * 80, vy: -20 - Math.random() * 40, t: 0, d: 0.8 + Math.random() * 0.6, roca: Math.random() < 0.4 });
  shake = Math.max(shake, d < 12 * T ? 0.32 : 0.12); noise(0.35, 0.1, 90); tone(42, 0.4, 'sawtooth', 0.05, 0.5);
}
function jfSuelo(ctx) { // grietas y tierra levantada, bajo los personajes
  if (!JF.grietas.length) return; const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  for (const g of JF.grietas) { const a = Math.min(1, (20 - g.t) / 6), X = Math.round(g.x), Y = Math.round(g.y);
    ctx.fillStyle = `rgba(30,20,14,${(0.32 * a).toFixed(3)})`; for (let dy = -6; dy <= 6; dy++) { const w = Math.round(g.r * 0.55 * Math.sqrt(1 - (dy / 6.5) ** 2)); ctx.fillRect(X - w, Y + dy, w * 2, 1); } // hundimiento
    for (const pts of g.ramas) for (let i = 2; i < pts.length; i += 2) { const k = i / pts.length; ctx.fillStyle = `rgba(16,10,8,${(0.85 * a * (1 - k * 0.6)).toFixed(3)})`; ctx.fillRect(X + pts[i], Y + pts[i + 1], k < 0.4 ? 2 : 1, 1);
      if (i % 6 === 0) { ctx.fillStyle = `rgba(200,180,150,${(0.4 * a).toFixed(3)})`; ctx.fillRect(X + pts[i], Y + pts[i + 1] - 1, 1, 1); } } } // borde con luz
  ctx.imageSmoothingEnabled = sm;
}
function jfEncima(ctx) { // polvo y piedritas que saltan
  if (!JF.polvo.length) return; const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  for (const q of JF.polvo) { const a = 1 - q.t / q.d, s = q.roca ? 2 : 2 + Math.floor(q.t * 4); ctx.fillStyle = q.roca ? `rgba(110,96,80,${a.toFixed(2)})` : `rgba(180,165,140,${(a * 0.45).toFixed(2)})`; ctx.fillRect(Math.round(q.x), Math.round(q.y), s, s); }
  ctx.imageSmoothingEnabled = sm;
}
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); try { jfTick(fdt); } catch (e) { console.warn(e); } }; }
if (typeof drawGroundDecor === 'function') { const d0 = drawGroundDecor; drawGroundDecor = (ctx, ...a) => { try { jfSuelo(ctx); } catch (e) { console.warn(e); } return d0(ctx, ...a); }; }
{ const d0 = drawCombat; drawCombat = (ctx, ...a) => { const r = d0(ctx, ...a); try { jfEncima(ctx); } catch (e) { console.warn(e); } return r; }; }
