'use strict';
// =====================================================================================
//  Cómo se lleva y cómo se usa lo que tienes en la mano, según lo que es. Apunta al ángulo
//  exacto en el que miras (no solo a las 8 direcciones del dibujo):
//   · Espadas, dagas y hoces: en guardia, hacia arriba; tajo en abanico con estela.
//   · Martillos, mazas, hachas grandes, guadañas, picos y hachas: al hombro; se levantan
//     y caen de golpe, con impacto al final.
//   · Lanzas: en horizontal; estocada hacia delante.
//   · Arcos: cruzados delante; se tensa la cuerda con la flecha y se suelta.
//   · Ballestas y armas de fuego: apuntando; retroceso y fogonazo al disparar.
//   · Bastones y varitas: de pie a tu lado; al lanzar apuntan y brilla la punta.
//   · Palas y demás herramientas: bajas; golpe corto. Cualquier otro objeto: en la mano.
//  Andando, lo que llevas se balancea con el paso; quieto, se mueve al respirar. Al picar
//  o talar, el golpe se repite mientras trabajas. Sirve igual para tu personaje, los demás
//  jugadores, los NPC y cualquier raza, tamaño o disfraz.
// =====================================================================================
const AVX_EL = { fire: '#ff8a3a', ice: '#9ad8ff', shock: '#ffe860', poison: '#8aff6a', holy: '#fff2a8', void: '#c08aff', arcane: '#c08aff', water: '#6ab8ff', earth: '#c8a060' };
function avGrip(id) {
  const it = ITEMS[id]; if (!it) return 'item'; const s = it.s || '', w = typeof WEAPONS !== 'undefined' ? WEAPONS[id] : null;
  if (it.weapon || w) {
    if (s === 'bow') return 'bow'; if (s === 'xbow') return 'xbow'; if (s === 'staff' || s === 'wand') return 'staff';
    if (w && w.ranged) return /bullet|shell/.test(w.ranged.ammo || '') ? 'gun' : 'xbow';
    if (s === 'spear') return 'spear'; if (/hammer|mace|baxe|scythe/.test(s)) return 'heavy'; return 'blade';
  }
  const tk = typeof TOOLS !== 'undefined' && TOOLS[id] ? TOOLS[id].kind : /^(pick|axe|hammer|paxel|excav|shovel|sickle)$/.test(s) ? s : null;
  if (tk) return /pick|axe|hammer|paxel|excav/.test(tk) ? 'heavy' : 'tool';
  return 'item';
}
const _gripC = new Map(); const gripOf = id => { let g = _gripC.get(id); if (!g) { g = avGrip(id); _gripC.set(id, g); } return g; };
const lerp2 = (a, b, k) => a + (b - a) * k, eOut = k => 1 - Math.pow(1 - k, 3), eIn = k => k * k * k;
// Estela de un golpe: arco desde «a0» hasta «a1» a la distancia «r»
function avTrail(ctx, a0, a1, r, col, al) {
  if (al <= 0.02 || Math.abs(a1 - a0) < 0.05) return; ctx.save(); ctx.globalAlpha = al; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) { ctx.strokeStyle = i ? 'rgba(255,255,255,.85)' : col; ctx.lineWidth = [5, 2.4, 1][i]; ctx.globalAlpha = al * [0.35, 0.7, 1][i]; ctx.beginPath(); ctx.arc(0, 0, r - i, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke(); }
  ctx.restore();
}
// Dibuja el objeto con el mango en el origen apuntando hacia «th»
function avItem(ctx, id, th, s) { ctx.save(); ctx.rotate(th + Math.PI / 4); drawItem(ctx, id, s * 0.3, -s * 0.3, s); ctx.restore(); }
function avHeld(ctx, id, d, flip, ang, swing, px, py, sc, f) {
  const g = gripOf(id), it = ITEMS[id] || {}, w = (typeof WEAPONS !== 'undefined' && WEAPONS[id]) || it.weapon || {}, t = performance.now() / 1000;
  const a = flip ? Math.PI - ang : ang, ca = Math.cos(a), sa = Math.sin(a), k = sc / 1.6;
  const p = swing ? clamp((swing + 1.1) / 2.2, 0, 1) : -1, atk = p >= 0;
  const step = f ? [0, 1, 0, -1, 0][f] : 0, breath = Math.sin(t * 2.2 + px * 0.05) * 0.04, bobY = f ? Math.abs(step) * 0.8 * k : 0;
  const glow = AVX_EL[w.el] || it.c || '#ffffff';
  ctx.save(); ctx.translate(px, py + bobY);
  switch (g) {
    case 'blade': { const s = 20 * k, rest = a - 0.95 + breath + step * 0.08, w0 = a - 1.55, w1 = a + 1.25;
      let th = rest; if (atk) { if (p < 0.2) th = lerp2(rest, w0, eOut(p / 0.2)); else { const q = (p - 0.2) / 0.8; th = lerp2(w0, w1, eOut(q)); ctx.translate(ca * 3 * k * Math.sin(q * Math.PI), sa * 3 * k * Math.sin(q * Math.PI)); avTrail(ctx, w0 + 0.2, th, s * 1.05, glow, (1 - q) * 0.9); } }
      avItem(ctx, id, th, s); break; }
    case 'heavy': { const s = 22 * k, rest = a - 2.0 + breath + step * 0.05, up = a - 2.7, down = a + 0.55;
      let th = rest; if (atk) { if (p < 0.35) { const q = p / 0.35; th = lerp2(rest, up, eOut(q)); ctx.translate(-ca * 2 * k * q, -2 * k * q); }
        else { const q = (p - 0.35) / 0.65, e = q < 0.5 ? eIn(q / 0.5) : 1; th = lerp2(up, down, e); avTrail(ctx, up + 0.4, th, s * 1.1, glow, q < 0.6 ? 0.8 : (1 - q) * 2);
          if (q > 0.5) { const r = (q - 0.5) * 2, tx = Math.cos(down) * s * 1.05, ty = Math.sin(down) * s * 1.05; ctx.save(); ctx.globalAlpha = (1 - r) * 0.7; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(tx, ty, 3 + r * 9 * k, 1.5 + r * 4 * k, 0, 0, 7); ctx.stroke(); ctx.restore(); } } }
      avItem(ctx, id, th, s); break; }
    case 'spear': { const s = 26 * k; let off = -3 * k + step * 0.6, th = a - 0.18 + breath * 0.5;
      if (atk) { th = a; if (p < 0.2) off = lerp2(off, -7 * k, eOut(p / 0.2)); else { const q = (p - 0.2) / 0.8; off = -7 * k + 19 * k * Math.sin(Math.min(1, q * 1.6) * Math.PI / 2) * (q < 0.6 ? 1 : 1 - (q - 0.6) / 0.4 * 0.8);
        ctx.save(); ctx.globalAlpha = (1 - q) * 0.6; ctx.strokeStyle = glow; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ca * (off + s * 0.4), sa * (off + s * 0.4)); ctx.lineTo(ca * (off + s * 1.2), sa * (off + s * 1.2)); ctx.stroke(); ctx.restore(); } }
      ctx.translate(ca * off, sa * off); avItem(ctx, id, th, s); break; }
    case 'bow': { // el icono del arco está en vertical, con la cuerda a la izquierda y la panza hacia donde dispara
      const s = 20 * k, pull = atk ? (p < 0.75 ? eOut(p / 0.75) : 0) : 0, snap = atk && p >= 0.75 ? 1 - (p - 0.75) / 0.25 : 0;
      ctx.translate(ca * 6 * k, sa * 6 * k + breath * 4); ctx.rotate(a); drawItem(ctx, id, 0, 0, s);
      const sx0 = -0.26 * s, ty = 0.46 * s, bx = sx0 - pull * 7 * k;
      if (pull > 0.05) { ctx.strokeStyle = 'rgba(240,236,224,.95)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(sx0, -ty); ctx.lineTo(bx, 0); ctx.lineTo(sx0, ty); ctx.stroke();
        ctx.strokeStyle = '#c8a070'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(0.42 * s, 0); ctx.stroke(); ctx.fillStyle = '#e8e8f0'; ctx.beginPath(); ctx.moveTo(0.55 * s, 0); ctx.lineTo(0.4 * s, -2 * k); ctx.lineTo(0.4 * s, 2 * k); ctx.fill(); }
      if (snap > 0) { ctx.globalAlpha = snap * 0.7; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; for (const o of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0.5 * s, o * 3 * k); ctx.lineTo((0.5 + snap * 0.6) * s, o * 3 * k); ctx.stroke(); } ctx.globalAlpha = 1; }
      break; }
    case 'xbow': { const s = 20 * k, rec = atk ? Math.pow(1 - p, 2) : 0, th = a - rec * 0.3 + breath * 0.4;
      ctx.translate(ca * (4 - rec * 5) * k, sa * (4 - rec * 5) * k); avItem(ctx, id, th, s);
      if (atk && p < 0.7) { const q = p / 0.7, mx = Math.cos(th) * s * 1.05, my = Math.sin(th) * s * 1.05; ctx.globalAlpha = 1 - q; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(th) * 8 * (1 - q), my + Math.sin(th) * 8 * (1 - q)); ctx.stroke(); ctx.globalAlpha = 1; }
      break; }
    case 'gun': { // el icono del arma de fuego está en horizontal, con la culata abajo a la izquierda
      const s = 18 * k, rec = atk ? Math.pow(1 - p, 2) : 0, th = a - rec * 0.35 + breath * 0.4;
      ctx.translate(ca * (3 - rec * 5) * k, sa * (3 - rec * 5) * k); ctx.rotate(th); if (Math.cos(th) < 0) ctx.scale(1, -1); drawItem(ctx, id, 0.38 * s, -0.05 * s, s);
      if (atk && p < 0.7) { const q = p / 0.7, mx = 0.9 * s, my = -0.17 * s; ctx.save(); ctx.globalAlpha = 1 - q;
        ctx.fillStyle = '#ffd860'; ctx.beginPath(); ctx.arc(mx, my, (4 - q * 2) * k, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(mx, my, 1.6 * k, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(200,200,200,.5)'; ctx.beginPath(); ctx.arc(mx + q * 8, my - q * 5, 2 + q * 4, 0, 7); ctx.fill(); ctx.restore(); }
      break; }
    case 'staff': { const s = 22 * k, rest = -Math.PI / 2 + 0.18 + breath + step * 0.05; let th = rest, lit = 0.25 + 0.15 * Math.sin(t * 3);
      if (atk) { const q = p < 0.3 ? eOut(p / 0.3) : 1 - Math.max(0, (p - 0.6) / 0.4) * 0.6; th = lerp2(rest, a - 0.3, q); lit = 0.5 + q * 0.5; }
      avItem(ctx, id, th, s); const tx = Math.cos(th) * s * 1.02, ty = Math.sin(th) * s * 1.02;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(tx, ty, 0, tx, ty, 7 * k * (0.6 + lit)); gr.addColorStop(0, glow); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = lit; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(tx, ty, 7 * k * (0.6 + lit), 0, 7); ctx.fill(); ctx.restore();
      break; }
    case 'tool': { const s = 18 * k, rest = a - 0.55 + breath + step * 0.1; let th = rest;
      if (atk) { const q = p < 0.25 ? -eOut(p / 0.25) : eOut((p - 0.25) / 0.75); th = q < 0 ? rest - 0.8 * -q : lerp2(rest - 0.8, a + 0.6, q); if (q > 0) avTrail(ctx, rest - 0.6, th, s, glow, (1 - q) * 0.5); }
      avItem(ctx, id, th, s); break; }
    default: { const s = 12 * k, th = a - 0.4 + breath; let off = 1 * k; if (atk) off += Math.sin(p * Math.PI) * 4 * k; ctx.translate(ca * off, sa * off); avItem(ctx, id, th, s); }
  }
  ctx.restore();
}
// Al picar, talar o romper: el golpe se repite mientras trabajas (tú; los demás ya lo mandan)
{ const a0 = drawAvatar; drawAvatar = (ctx, look, equip, x, y, ang, walk, moving, sc = 2, held, swing) => {
  if (held && !swing && typeof AFX !== 'undefined' && AFX.me && ((ui.mine && ui.mine.t > 0) || (ui.bb && ui.bb.t > 0))) { const g = gripOf(held), per = g === 'heavy' ? 0.5 : 0.36; swing = ((performance.now() / 1000 % per) / per) * 2.2 - 1.1 || 0.001; }
  return a0(ctx, look, equip, x, y, ang, walk, moving, sc, held, swing);
}; }
