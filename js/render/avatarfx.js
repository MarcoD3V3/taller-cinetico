'use strict';
// =====================================================================================
//  Animación del cuerpo (por encima de la hoja de sprites, sirve para todos los personajes):
//   · Caminar: rebote en cada paso, inclinación hacia donde vas (más al correr) y un leve
//     aplastamiento al apoyar el pie. Parado: respira.
//   · Saltar: se estira en el aire y se aplasta al caer.
//   · Tú, además: al atacar te preparas, te lanzas hacia el golpe y vuelves; al acertar la
//     pantalla tiembla un poco; al recibir un golpe retrocedes; polvo y huellas al andar
//     (huellas en arena, nieve y barro).
//  Todo es una transformación del dibujo: no cuesta FPS.
// =====================================================================================
const AFX = { me: false, land: 0, wasAir: false, kick: 0, kickA: 0, step: -1, prints: [] };
{ const a0 = drawAvatar; drawAvatar = (ctx, look, equip, x, y, ang, walk, moving, sc = 2, held, swing) => {
  const t = performance.now() / 1000, me = AFX.me, cs = Math.cos(ang);
  let bob = 0, lean = 0, sx = 1, sy = 1, dx = 0, dy = 0;
  if (moving && walk !== 1.2) { const ph = walk * Math.PI / 2, run = me && pmove.sprint ? 1.6 : 1; bob = -Math.abs(Math.sin(ph)) * 1.6 * run; lean = cs * 0.06 * run; const stomp = Math.max(0, Math.cos(ph * 2)) * 0.035 * run; sy = 1 - stomp; sx = 1 + stomp * 0.6; }
  else if (!moving) { const br = Math.sin(t * 2.2 + x * 0.01) * 0.012; sy = 1 + br; sx = 1 - br * 0.5; }
  if (me) {
    // Salto y caída
    const air = (P.z || 0) > 0.5; if (air) { sy *= 1.05; sx *= 0.96; } if (AFX.wasAir && !air) AFX.land = 0.14; AFX.wasAir = air;
    if (AFX.land > 0) { const k = AFX.land / 0.14; sy *= 1 - 0.14 * k; sx *= 1 + 0.12 * k; }
    // Ataque: preparación (atrás) → golpe (adelante) → vuelta
    if (P.swing > 0) { const p = 1 - P.swing / 0.2, a = P.swingA ?? ang, off = p < 0.25 ? -p / 0.25 * 2 : Math.sin((p - 0.25) / 0.75 * Math.PI) * 5; dx += Math.cos(a) * off; dy += Math.sin(a) * off * 0.6; lean += Math.cos(a) * (p < 0.25 ? -0.05 : 0.12) * Math.sin(p * Math.PI); }
    // Golpe recibido: retrocede y se encoge
    if (AFX.kick > 0) { const k = AFX.kick / 0.18; dx += Math.cos(AFX.kickA) * 4 * k; dy += Math.sin(AFX.kickA) * 2 * k; lean -= Math.cos(AFX.kickA) * 0.1 * k; sy *= 1 - 0.05 * k; }
  }
  if (!bob && !lean && sx === 1 && sy === 1 && !dx && !dy) return a0(ctx, look, equip, x, y, ang, walk, moving, sc, held, swing);
  ctx.save(); ctx.translate(Math.round(x + dx), Math.round(y + dy)); if (lean) ctx.rotate(lean); ctx.scale(sx, sy);
  a0(ctx, look, equip, 0, bob, ang, walk, moving, sc, held, swing); ctx.restore();
}; }
// El personaje propio se marca para las animaciones que solo son tuyas
let _afxT = performance.now();
{ const d0 = drawPlayer; drawPlayer = ctx => {
  const n = performance.now(), dt = Math.min(0.05, (n - _afxT) / 1000); _afxT = n;
  AFX.land = Math.max(0, AFX.land - dt); AFX.kick = Math.max(0, AFX.kick - dt);
  // Pasos: polvo y huellas al apoyar cada pie
  if (S && pmove.moving && !(P.z > 0.5) && !P.swim && !mountPet()) { const st = Math.floor(P.walk / 2); if (st !== AFX.step) { AFX.step = st; const p = S.player, g = GI[gnd(Math.floor(p.x / T), Math.floor((p.y + 6) / T))], k = g.key || '';
    const soft = /SAND|SNOW|MUD|PEAT|ASH|DIRT|FARM/.test(k); if (soft || pmove.sprint) dust(p.x + (st & 1 ? 3 : -3), p.y + 8, soft ? 3 : 2);
    if (soft) { AFX.prints.push({ x: p.x + Math.cos(pmove.ang + Math.PI / 2) * (st & 1 ? 2.5 : -2.5), y: p.y + 8, a: pmove.ang, t: 9, c: /SNOW/.test(k) ? '120,140,170' : '60,40,25' }); if (AFX.prints.length > 50) AFX.prints.shift(); } } }
  AFX.me = true; try { d0(ctx); } finally { AFX.me = false; }
}; }
// Huellas (debajo de los personajes)
function drawPrints(c, dt) {
  for (let i = AFX.prints.length - 1; i >= 0; i--) { const f = AFX.prints[i]; f.t -= dt; if (f.t <= 0) { AFX.prints.splice(i, 1); continue; }
    c.save(); c.translate(f.x, f.y); c.rotate(f.a); c.fillStyle = `rgba(${f.c},${Math.min(0.35, f.t / 9 * 0.35)})`; c.beginPath(); c.ellipse(0, 0, 2.6, 1.4, 0, 0, 7); c.fill(); c.restore(); }
}
let _afxPrT = performance.now();
{ const a0 = drawAnimals; drawAnimals = (c, k, ox, oy, x0, y0, x1, y1) => { if (AFX.prints.length) { const n = performance.now(); drawPrints(c, Math.min(0.05, (n - _afxPrT) / 1000)); _afxPrT = n; } else _afxPrT = performance.now(); a0(c, k, ox, oy, x0, y0, x1, y1); }; }
// Al recibir un golpe: retroceso desde el enemigo más cercano
{ const h0 = hitPlayer; hitPlayer = (dmg, wound, cause, el) => { const r = h0(dmg, wound, cause, el); if (S && dmg > 0) { const p = S.player, f = typeof nearestFoe === 'function' ? nearestFoe(p.x, p.y, 4 * T) : null; AFX.kickA = f ? Math.atan2(p.y - f.y, p.x - f.x) : Math.PI / 2; AFX.kick = 0.18; } return r; }; }
// Al acertar: la pantalla tiembla un poco (más con armas pesadas)
{ const d0 = damageFoe; damageFoe = (f, dmg, el) => { const r = d0(f, dmg, el); if (typeof _atkW !== 'undefined' && _atkW && typeof shake !== 'undefined') shake = Math.max(shake, (_atkW.spd || 1) > 1.2 ? 0.07 : 0.03); return r; }; }
