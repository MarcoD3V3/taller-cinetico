'use strict';
// =====================================================================================
//  Sprites del personaje en pixel art, por capas (como Terraria): raza (orejas, cuernos,
//  colas, alas, cuerpo de caballo…), piernas, botas, cuerpo, ropa, armadura, brazos, cabeza,
//  cara según la personalidad, pelo, barba y casco se pintan píxel a píxel y se juntan en UNA
//  hoja de animación por personaje.
//  Hoja: 5 direcciones (S, SE, E, NE, N; las del oeste en espejo) × 5 fotogramas (quieto +
//  4 de andar). El cuerpo humano mide 16×24 y el lienzo tiene 4 px de margen a cada lado
//  para lo que sobresale. Contorno automático. Solo se regenera al cambiar apariencia o equipo.
// =====================================================================================
const AV_M = 4, AV_W = 16 + AV_M * 2, AV_H = 24 + AV_M, AV_DIRS = 5, AV_FR = 5;
const shade = (hex, f) => { const c = hexRGB(hex); return `rgb(${c.map(v => clamp(Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f), 0, 255)).join(',')})`; };
const toHex = c => { if (c[0] === '#') return c; const m = c.match(/\d+/g); return '#' + m.slice(0, 3).map(v => (+v).toString(16).padStart(2, '0')).join(''); };
// Canas según la edad (el maduro solo en las sienes)
function greyHair(h, a) { if (!a.grey || a.temples) return h; const c = hexRGB(h), g = [226, 222, 214]; return '#' + c.map((v, i) => Math.round(v + (g[i] - v) * a.grey).toString(16).padStart(2, '0')).join(''); }
// Cómo se ve cada parte según la raza, la personalidad y el equipo
function avatarSpec(look, equip) {
  const L2 = { ...DEFAULT_LOOK, ...look }, e = equip || {}, R = raceOf(L2);
  const arm = sl => e[sl] && ITEMS[e[sl]] && ITEMS[e[sl]].armor;
  const gl = (sl, k) => e[sl] && ITEMS[e[sl]] && ITEMS[e[sl]].gear && ITEMS[e[sl]].gear.look ? ITEMS[e[sl]].gear.look[k] || null : null;
  return {
    race: R.f, skin: R.skin[L2.skin] || R.skin[0], hair: greyHair(LOOK.hair[L2.hair] || LOOK.hair[1], ageOf(L2)), hairBase: LOOK.hair[L2.hair] || LOOK.hair[1],
    acc: bgOf(L2).acc, age: ageOf(L2), tallDy: heightOf(L2).dy, marks: new Set(L2.marks || []), eyes: R.f.glow || LOOK.eyes[L2.eyes] || LOOK.eyes[0],
    hs: L2.hairStyle | 0, beard: L2.beard | 0, body: L2.body ?? 1, face: moodOf(L2).face, extra: L2.face | 0, coat: LOOK.coat[L2.coat] || LOOK.coat[0],
    shirt: typeof L2.shirt === 'string' ? L2.shirt : LOOK.cloth[L2.shirt] || LOOK.cloth[0], pants: LOOK.cloth[L2.pants] || LOOK.cloth[6], shoes: LOOK.cloth[L2.shoes] || LOOK.cloth[9],
    helm: arm('head'), chest: arm('chest'), legs: arm('legs'), feet: arm('feet'),
    cape: gl('back', 'cape'), gloves: gl('hands', 'gloves'), shieldC: gl('shield', 'shield'), costume: e.costume && ITEMS[e.costume] && ITEMS[e.costume].gear ? ITEMS[e.costume].gear.look : null,
  };
}
// Pinta un fotograma. d: 0 S · 1 SE · 2 E · 3 NE · 4 N · f: 0 quieto, 1-4 andar
function paintFrame(c, sp0, d, f) {
  const cs = sp0.costume, sp = cs ? { ...sp0, shirt: cs.shirt, pants: cs.pants, shoes: cs.shoes, chest: null, helm: null, legs: null, feet: null } : sp0;
  const rf = sp.race || {};
  let yo = 0; // desplazamiento vertical del torso y la cabeza (razas bajas o centauros)
  const P2 = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y + yo, w, h); };
  const side = d === 2, back = d >= 3, diag = d === 1 || d === 3, front = d <= 1;
  const step = [0, 1, 0, -1, 0][f] || 0;
  const tw = sp.body === 0 ? 6 : sp.body === 2 ? 10 : 8, tx = (16 - tw) >> 1;
  const pants = sp.legs ? sp.legs.c : sp.pants, shoes = sp.feet ? sp.feet.c : sp.shoes;
  const sk = sp.skin, skD = shade(sk, -0.18), skL = shade(sk, 0.18);
  // ---- Alas (detrás de todo) ----
  if (rf.wings) { // alas de libélula: dos lóbulos que se estrechan, con nervio
    const fl = f ? Math.abs(step) : 0, wc = 'rgba(190,230,255,.72)', wv = 'rgba(120,180,240,.9)';
    const wing = (x0, dir) => { for (let r = 0; r < 9; r++) { const w = r < 4 ? 2 + r : r < 5 ? 3 : 8 - r; const x = dir > 0 ? x0 : x0 - w + 1; P2(x, 6 + r - fl, w, 1, wc); } P2(dir > 0 ? x0 : x0 - 4, 9 - fl, 5, 1, wv); };
    if (side) wing(4, -1); else { wing(2, -1); wing(13, 1); } }
  // ---- Cola (detrás si miras de frente o de lado) ----
  const tail = (over) => {
    if (!rf.tail) return; const tc = rf.tail === 'demon' ? shade(sk, -0.25) : rf.tail === 'cat' ? sk : skD, wag = [0, 1, 0, -1, 0][f] || 0;
    if (side) { if (over) return; P2(2, 13, 3, 2, tc); P2(0, 11 + wag, 2, 3, tc); if (rf.tail === 'demon') P2(-1, 10 + wag, 2, 2, '#2a1418'); if (rf.tail === 'lizard') P2(-1, 14, 3, 2, tc); }
    else if (back === over) { const tx2 = 7 + wag; P2(tx2, 15, 2, 4, tc); P2(tx2 + 1, 19, 2, 2, tc); if (rf.tail === 'demon') P2(tx2 + 1, 21, 2, 1, '#2a1418'); if (rf.tail === 'lizard') P2(tx2, 19, 3, 3, tc); }
  };
  tail(false);
  paintBackAcc(P2, sp, d, f);
  // ---- Capa (detrás del cuerpo) y escudo de espaldas ----
  if (sp.cape && d >= 3) P2(3, 9, 10, 12, sp.cape), P2(3, 9, 10, 1, shade(sp.cape, 0.25)), P2(4, 18, 8, 1, shade(sp.cape, -0.2));
  if (sp.shieldC && (d === 2 || d === 1)) { P2(2, 10, 4, 6, sp.shieldC); P2(3, 11, 2, 4, shade(sp.shieldC, 0.3)); }
  // ---- Piernas: de caballo (centauro) o normales ----
  if (rf.horse) paintHorse(P2, sp, d, f, front, side, back);
  else {
    const sh2 = (rf.short || 0) + Math.max(0, sp.tallDy || 0), tl = Math.max(0, -(sp.tallDy || 0)), top = 16 + sh2 - tl, len = 5 - sh2 + tl;
    if (side) {
      const fl = 7 + step * 2, bl = 7 - step * 2;
      P2(bl, top, 3, len, shade(pants, -0.25)); P2(bl, 21, 3, 2, shade(shoes, -0.25));
      P2(fl, top, 3, len, pants); P2(fl, top, 1, len, shade(pants, 0.15)); P2(fl, 21, 4, 2, shoes); P2(fl + 3, 21, 1, 1, shade(shoes, 0.3));
    } else {
      const ly = step > 0 ? -1 : 0, ry = step < 0 ? -1 : 0, gap = sp.body === 2 ? 1 : 0;
      P2(tx + 1 - gap, top + ly, 3, len - ly, pants); P2(tx + 1 - gap, 21, 3, 2, shoes); P2(tx + 1 - gap, 21, 3, 1, shade(shoes, 0.2));
      P2(tx + tw - 4 + gap, top + ry, 3, len - ry, back ? shade(pants, -0.1) : shade(pants, -0.08)); P2(tx + tw - 4 + gap, 21, 3, 2, shoes); P2(tx + tw - 4 + gap, 21, 3, 1, shade(shoes, 0.2));
      if (len >= 4) { P2(tx + 1 - gap, top + 2 + ly, 1, 1, shade(pants, -0.25)); P2(tx + tw - 2 + gap, top + 2 + ry, 1, 1, shade(pants, -0.25)); } // rodillas
      if (sp.legs) { P2(tx + 1 - gap, top + 1 + ly, 3, 1, shade(pants, 0.35)); P2(tx + tw - 4 + gap, top + 1 + ry, 3, 1, shade(pants, 0.35)); }
    }
    yo = sh2 - tl;
  }
  if (rf.horse) yo = -1 + (sp.tallDy || 0);
  // ---- Brazo de atrás (perfil) ----
  const swing = [0, 1, 0, -1, 0][f] || 0, sleeve = sp.chest ? sp.chest.c : sp.shirt;
  if (side) { P2(6 - swing, 10, 2, 4, shade(sleeve, -0.3)); P2(6 - swing, 14, 2, 2, shade(sk, -0.2)); }
  // ---- Cuerpo: camisa con cuello, pliegue y cinturón ----
  const bx = side ? 5 : tx, bw = side ? 6 : tw;
  P2(bx, 9, bw, 7, sp.shirt); P2(bx + bw - 1, 9, 1, 7, shade(sp.shirt, -0.25)); P2(bx, 9, 1, 7, shade(sp.shirt, 0.12));
  if (front && !sp.chest) { P2(bx + (bw >> 1) - 1, 9, 2, 1, skD); P2(bx + (bw >> 1) - 2, 10, 1, 1, shade(sp.shirt, -0.3)); P2(bx + (bw >> 1) + 1, 10, 1, 1, shade(sp.shirt, -0.3)); P2(bx + (bw >> 1), 12, 1, 2, shade(sp.shirt, -0.15)); }
  if (!rf.horse) { P2(bx, 15, bw, 1, '#4a3420'); if (front) P2(bx + (bw >> 1) - 1, 15, 2, 1, '#e0b54c'); }
  if (sp.chest) {
    const a = sp.chest.c; P2(bx, 9, bw, 6, a); P2(bx + 1, 10, 1, 4, shade(a, 0.4)); P2(bx + bw - 1, 9, 1, 6, shade(a, -0.3));
    if (sp.chest.set !== 'leather' && sp.chest.set !== 'fur') { P2(bx, 9, bw, 1, shade(a, 0.25)); P2(bx, 13, bw, 1, shade(a, -0.2)); if (front) { P2(bx + 2, 11, 1, 1, shade(a, -0.4)); P2(bx + bw - 3, 11, 1, 1, shade(a, -0.4)); } }
    else if (front) P2(bx + (bw >> 1), 10, 1, 4, shade(a, -0.3)); // cordones
    if (sp.chest.set === 'fur') { P2(bx, 9, bw, 2, '#efe6d0'); P2(bx + 1, 10, 1, 1, '#d8ccb0'); }
  }
  if (rf.scales && front && !sp.chest) for (let i = 0; i < 3; i++) P2(bx + 1 + i * 2, 11 + (i & 1), 1, 1, shade(sp.shirt, 0.2));
  if (rf.rivets && !sp.chest) { P2(bx, 12, bw, 1, shade(sk, -0.35)); if (front) { P2(bx + 1, 10, 1, 1, '#e0c070'); P2(bx + bw - 2, 10, 1, 1, '#e0c070'); } }
  // ---- Brazos ----
  const armSk = rf.rivets ? shade(sk, -0.1) : sk;
  if (!side) {
    const ay = [0, 1, 0, -1, 0][f] || 0;
    for (const [ax, dy] of [[bx - 2, ay], [bx + bw, -ay]]) { P2(ax, 10 + dy, 2, 4, ax < bx ? sleeve : shade(sleeve, -0.2)); P2(ax, 10 + dy, 2, 1, shade(sleeve, 0.2)); P2(ax, 14 + dy, 2, 2, armSk); if (rf.stitches) P2(ax, 12 + dy, 2, 1, '#3a2a2a'); }
  } else { P2(8 + swing, 10, 2, 4, sleeve); P2(8 + swing, 10, 2, 1, shade(sleeve, 0.2)); P2(8 + swing, 14, 2, 2, armSk); }
  // Capa vista de frente · guantes · escudo en el brazo
  if (sp.cape && d <= 2) { P2(bx - 1, 9, 1, 9, sp.cape); if (d !== 2) P2(bx + bw, 9, 1, 9, shade(sp.cape, -0.2)); }
  if (sp.gloves) { if (side) P2(8 + swing, 14, 2, 2, sp.gloves); else { const ay2 = [0, 1, 0, -1, 0][f] || 0; P2(bx - 2, 14 + ay2, 2, 2, sp.gloves); P2(bx + bw, 14 - ay2, 2, 2, sp.gloves); } }
  if (sp.shieldC && d === 0) { P2(bx + bw, 11, 4, 6, sp.shieldC); P2(bx + bw + 1, 12, 2, 4, shade(sp.shieldC, 0.3)); P2(bx + bw + 1, 14, 2, 1, shade(sp.shieldC, -0.3)); }
  if (sp.shieldC && d === 4) { P2(bx - 3, 11, 4, 6, shade(sp.shieldC, -0.15)); }
  // ---- Cabeza (el anciano la lleva un poco adelantada y baja) ----
  const stoop = sp.age && sp.age.stoop ? 1 : 0, hox = stoop && side ? 1 : 0, hoy = stoop;
  const PH = (x, y, w, h, col) => P2(x + hox, y + hoy, w, h, col);
  const hx = side ? 5 : 4, hw = side ? 7 : 8;
  // Orejas por detrás de la cabeza (elfo, orco, goblin)
  paintEars(P2, rf, d, hx, hw, sk, skD, false);
  PH(hx, 2, hw, 7, sk); PH(hx, 2, 1, 6, skL); PH(hx + hw - 1, 3, 1, 6, skD); PH(hx, 8, hw, 1, shade(sk, -0.25));
  if (rf.snout) { if (side) { PH(hx + hw, 5, 2, 3, sk); PH(hx + hw + 1, 5, 1, 1, '#1a1418'); } else if (front) { PH(hx + 1, 6, hw - 2, 3, skL); PH(hx + 2, 6, 1, 1, '#1a1418'); PH(hx + hw - 3, 6, 1, 1, '#1a1418'); } }
  if (rf.scales && !back) { PH(hx + 1, 3, 1, 1, skD); PH(hx + hw - 3, 4, 1, 1, skD); }
  if (rf.rivets && !back) { PH(hx, 4, hw, 1, shade(sk, -0.3)); PH(hx + 1, 3, 1, 1, '#f0e0a0'); PH(hx + hw - 2, 3, 1, 1, '#f0e0a0'); }
  if (front) paintFace(P2, sp, d, hx, hw, sk);
  if (side) { PH(10, 5, 1, 2, sp.eyes); PH(10, 5, 1, 1, rf.glow ? sp.eyes : '#fff'); paintBrow(P2, sp.face, 10, 10, 4, sp.hair, true); PH(12, 6, 1, 1, skD); if (rf.whisk) PH(12, 7, 2, 1, '#f0f0f0'); }
  if (rf.stitches && !back) { PH(hx + 1, 3, 3, 1, '#3a2a2a'); PH(hx + 2, 2, 1, 3, '#3a2a2a'); }
  // Barba
  if (sp.beard && !back) { const bc = sp.hair, bd = shade(bc, -0.2); if (sp.beard === 1) PH(side ? 10 : 6, 7, side ? 2 : 4, 1, bc); else if (sp.beard === 2) PH(side ? 10 : 7, 7, 2, 2, bc); else { PH(side ? 8 : hx, 7, side ? 4 : hw, sp.beard === 4 ? 3 : 2, bc); PH(side ? 8 : hx, 8, side ? 4 : hw, 1, bd); if (sp.beard === 4) PH(side ? 9 : hx + 2, 10, side ? 2 : hw - 4, 1, bc); } }
  if (rf.tusks && front) { PH(d === 1 ? 7 : 6, 7, 1, 2, '#f4f0e0'); PH(d === 1 ? 10 : 9, 7, 1, 2, '#f4f0e0'); }
  // Pelo / casco / sombrero
  if (cs && cs.hat) paintHat(P2, cs, d, hx, hw, sp);
  else if (!sp.helm) paintHair(P2, sp, d, hx, hw);
  else paintHelm(P2, sp.helm, d, hx, hw);
  paintEars(P2, rf, d, hx, hw, sk, skD, true);
  if (rf.horns) { const hc = '#2a2024', hl = '#5a4a50'; if (side) { PH(hx + 3, 0, 2, 2, hc); PH(hx + 2, -1, 2, 1, hc); PH(hx + 1, -2, 1, 1, hl); } else { PH(hx, 0, 2, 2, hc); PH(hx - 1, -1, 1, 2, hc); PH(hx - 1, -2, 1, 1, hl); PH(hx + hw - 2, 0, 2, 2, hc); PH(hx + hw, -1, 1, 2, hc); PH(hx + hw, -2, 1, 1, hl); } }
  if (rf.catEars && !sp.helm) { const ec = sk, ei = '#f0a0a8'; if (side) { PH(hx + 2, 0, 2, 2, ec); PH(hx + 2, -1, 1, 1, ec); } else { PH(hx, 0, 2, 2, ec); PH(hx, -1, 1, 1, ec); PH(hx + hw - 2, 0, 2, 2, ec); PH(hx + hw - 1, -1, 1, 1, ec); if (!back) { PH(hx + 1, 1, 1, 1, ei); PH(hx + hw - 2, 1, 1, 1, ei); } } }
  if (front && rf.whisk) { PH(hx - 1, 7, 2, 1, '#f0f0f0'); PH(hx + hw - 1, 7, 2, 1, '#f0f0f0'); }
  paintAge(PH, sp, d, hx, hw, front, side);
  paintMarks(P2, PH, sp, d, hx, hw, bx, bw, front, side, back, f);
  paintAcc(P2, PH, sp, d, hx, hw, bx, bw, front, side, back, f, cs);
  tail(true);
  // posiciones de cada parte para el redibujo a alta resolución (render/avatarhd.js)
  return { d, f, yo, hox, hoy, hx, hw, bx, bw, tx, tw, side, front, back, swing, cs, sleeve, armSk, pants, shoes };
}
// Cejas según la personalidad
function paintBrow(P2, face, x1, x2, y, hair, side) {
  const bc = shade(hair, -0.35);
  const one = (x, l) => { switch (face) {
    case 'angry': case 'grumpy': P2(x, y + (l ? 1 : 0), 1, 1, bc); P2(x + (l ? 1 : -1), y + (l ? 0 : 1), 1, 1, bc); break;
    case 'sad': case 'shy': P2(x, y + (l ? 0 : 1), 1, 1, bc); P2(x + (l ? 1 : -1), y + (l ? 1 : 0), 1, 1, bc); break;
    case 'curious': case 'wild': P2(x, y - (l ? 1 : 0), 2, 1, bc); break;
    case 'sleepy': case 'flat': case 'calm': P2(x, y, 2, 1, bc); break;
    default: P2(x, y, 2, 1, bc);
  } };
  if (side) one(x1, 1); else { one(x1 - 1, 1); one(x2, 0); }
}
function paintFace(P2, sp, d, hx, hw, sk) {
  const ex = d === 1 ? 7 : 6, ex2 = d === 1 ? 10 : 9, fc = sp.face, glow = sp.race && sp.race.glow, mo = shade(sk, -0.4);
  // Ojos (los dormidos y serenos, entornados)
  if (fc === 'sleepy') { P2(ex, 6, 1, 1, sp.eyes); P2(ex2, 6, 1, 1, sp.eyes); }
  else if (fc === 'happy') { P2(ex, 5, 1, 1, sp.eyes); P2(ex2, 5, 1, 1, sp.eyes); P2(ex, 6, 1, 1, shade(sk, -0.2)); P2(ex2, 6, 1, 1, shade(sk, -0.2)); }
  else { P2(ex, 5, 1, 2, sp.eyes); P2(ex2, 5, 1, 2, sp.eyes); P2(ex, 5, 1, 1, glow ? sp.eyes : '#fff'); P2(ex2, 5, 1, 1, glow ? sp.eyes : '#fff'); }
  paintBrow(P2, fc, ex, ex2, 4, sp.hair);
  // Boca
  const mx = (ex + ex2) >> 1;
  switch (fc) {
    case 'happy': P2(mx - 1, 7, 3, 1, mo); P2(mx - 1, 7, 1, 1, shade(sk, -0.2)); P2(mx, 8, 1, 1, '#c84a4a'); break;
    case 'sad': P2(mx, 7, 2, 1, mo); P2(mx - 1, 8, 1, 1, mo); P2(ex, 7, 1, 1, '#8ac8ff'); break; // una lágrima
    case 'angry': case 'grumpy': P2(mx - 1, 8, 3, 1, mo); break;
    case 'sly': P2(mx, 7, 2, 1, mo); P2(mx + 2, 6, 1, 1, mo); break;
    case 'wild': P2(mx - 1, 7, 3, 2, mo); P2(mx, 7, 1, 1, '#fff'); break;
    case 'shy': P2(ex - 1, 7, 1, 1, '#e88a8a'); P2(ex2 + 1, 7, 1, 1, '#e88a8a'); P2(mx, 7, 1, 1, mo); break;
    case 'curious': P2(mx, 7, 1, 1, mo); break;
    case 'brave': P2(mx - 1, 7, 3, 1, mo); P2(mx + 1, 6, 1, 1, mo); break;
    default: P2(mx, 7, 2, 1, mo);
  }
  // Detalles de la cara
  switch (sp.extra) {
    case 1: P2(ex - 1, 6, 1, 1, shade(sk, -0.3)); P2(ex2 + 1, 6, 1, 1, shade(sk, -0.3)); P2(ex - 1, 7, 1, 1, shade(sk, -0.25)); break; // pecas
    case 2: P2(ex2, 3, 1, 1, '#a84a4a'); P2(ex2, 4, 1, 1, '#c86a6a'); P2(ex2 + 1, 6, 1, 1, '#a84a4a'); break; // cicatriz
    case 3: P2(ex2 - 1, 5, 3, 2, '#1a1418'); P2(hx, 4, hw, 1, 'rgba(26,20,24,.8)'); break; // parche
    case 4: P2(ex - 1, 5, 3, 2, 'rgba(200,230,255,.55)'); P2(ex2 - 1, 5, 3, 2, 'rgba(200,230,255,.55)'); P2(ex + 2, 5, ex2 - ex - 2, 1, '#2a2024'); break; // gafas
    case 5: P2(ex - 1, 6, 2, 1, '#c83a3a'); P2(ex2, 6, 2, 1, '#c83a3a'); P2(mx, 3, 1, 2, '#3a6ac8'); break; // pintura de guerra
    case 6: P2(ex2 + 1, 7, 1, 1, '#3a2014'); break; // lunar
    case 7: P2(ex, 7, 1, 1, '#6a4a6a'); P2(ex2, 7, 1, 1, '#6a4a6a'); break; // ojeras
  }
}
function paintEars(P2, rf, d, hx, hw, sk, skD, over) {
  const e = rf.ears; if (!e) return; const back = d >= 3, side = d === 2;
  if (side) { if (over) return; if (e === 'elf') { P2(hx + 1, 4, 2, 2, sk); P2(hx, 3, 1, 2, sk); P2(hx - 1, 2, 1, 1, sk); } else if (e === 'goblin') { P2(hx - 2, 4, 4, 2, sk); P2(hx - 1, 5, 2, 1, skD); } else P2(hx + 1, 4, 2, 2, sk); return; }
  if (over !== back) return; // de frente se ven delante del pelo; de espaldas también, por encima
  if (e === 'elf') { P2(hx - 1, 4, 1, 2, sk); P2(hx - 2, 3, 1, 2, sk); P2(hx - 3, 2, 1, 1, sk); P2(hx + hw, 4, 1, 2, skD); P2(hx + hw + 1, 3, 1, 2, skD); P2(hx + hw + 2, 2, 1, 1, skD); }
  else if (e === 'goblin') { P2(hx - 3, 4, 3, 2, sk); P2(hx - 4, 3, 1, 2, sk); P2(hx + hw, 4, 3, 2, skD); P2(hx + hw + 3, 3, 1, 2, skD); if (!back) { P2(hx - 2, 5, 1, 1, '#e88a8a'); P2(hx + hw + 1, 5, 1, 1, '#c86a6a'); } }
  else if (e === 'orc') { P2(hx - 1, 4, 1, 2, sk); P2(hx - 2, 3, 1, 1, sk); P2(hx + hw, 4, 1, 2, skD); P2(hx + hw + 1, 3, 1, 1, skD); }
}
// Cuerpo de caballo del centauro. La armadura de piernas se vuelve barda y las botas, herraduras
function paintHorse(P2, sp, d, f, front, side, back) {
  const co = sp.coat, coD = shade(co, -0.25), coL = shade(co, 0.15), bard = sp.legs ? sp.legs.c : null, hoof = sp.feet ? sp.feet.c : '#2a2420';
  const st = [0, 1, 0, -1, 0][f] || 0;
  if (side) {
    // patas traseras, cuerpo, patas delanteras y cola
    P2(-3, 13, 2, 7, sp.hair); P2(-4, 15, 1, 5, shade(sp.hair, -0.2));
    P2(-1 - st, 18, 2, 4, coD); P2(-1 - st, 22, 2, 1, hoof); P2(1 + st, 18, 2, 4, co); P2(1 + st, 22, 2, 1, hoof);
    P2(-2, 13, 14, 6, co); P2(-2, 13, 14, 1, coL); P2(-2, 18, 14, 1, coD);
    if (bard) { P2(-1, 13, 12, 4, bard); P2(-1, 13, 12, 1, shade(bard, 0.35)); P2(-1, 16, 12, 1, shade(bard, -0.3)); }
    P2(8 + st, 18, 2, 4, coD); P2(8 + st, 22, 2, 1, hoof); P2(10 - st, 18, 2, 4, co); P2(10 - st, 22, 2, 1, hoof);
  } else {
    // de frente/espalda: pecho ancho y cuatro patas escalonadas
    const lx = 3, rx = 11;
    if (back) { P2(7, 15, 2, 7, sp.hair); }
    P2(2, 14, 12, 5, co); P2(2, 14, 12, 1, coL); P2(13, 14, 1, 5, coD);
    if (bard) { P2(2, 14, 12, 3, bard); P2(2, 14, 12, 1, shade(bard, 0.35)); }
    P2(lx + 1, 19, 2, 3 + (st > 0 ? -1 : 0), coD); P2(rx - 1, 19, 2, 3 + (st < 0 ? -1 : 0), coD);
    P2(lx - 1, 19 + (st > 0 ? -1 : 0), 2, 4, co); P2(rx + 1, 19 + (st < 0 ? -1 : 0), 2, 4, co);
    P2(lx - 1, 22, 2, 1, hoof); P2(rx + 1, 22, 2, 1, hoof); P2(lx + 1, 22, 2, 1, hoof); P2(rx - 1, 22, 2, 1, hoof);
  }
}
function paintHair(P2, sp, d, hx, hw) {
  const h = sp.hair, hd = shade(h, -0.25), hl = shade(h, 0.2), s = sp.hs, side = d === 2, back = d >= 3;
  if (s === 9) return; // calvo
  if (s === 4) { P2(hx, 2, hw, 1, shade(h, -0.4)); return; } // rapado
  const long = s === 1 || s === 11, big = s === 12;
  // Base: casquete con brillo
  P2(hx - (s === 7 || big ? 1 : 0), big ? 0 : 1, hw + (s === 7 || big ? 2 : 0), big ? 3 : 2, h); P2(hx + 1, 1, hw - 3, 1, hl);
  if (back) { P2(hx, 2, hw, long ? 9 : 6, h); P2(hx + hw - 1, 2, 1, long ? 9 : 6, hd); P2(hx + 2, 3, 1, long ? 7 : 4, hd); }
  else if (side) { P2(hx, 2, 4, long ? 8 : 4, h); P2(hx, 2, 1, long ? 8 : 4, hd); P2(hx + 4, 2, 2, 1, h); }
  else { P2(hx, 2, 1, long ? 8 : 3, h); P2(hx + hw - 1, 2, 1, long ? 8 : 3, hd); if (s === 8) P2(hx + 1, 3, hw - 3, 1, h); else P2(hx + 1, 2, hw - 2, 1, h); }
  if (s === 2 && d !== 0) P2(side ? hx - 1 : hx + 3, side ? 4 : 8, 2, 4, h); // coleta
  if (s === 13) { P2(hx + 3, -1, 2, 2, h); if (!front2(d)) P2(side ? hx - 1 : hx + 3, 1, 2, 6, hd); } // coleta alta
  if (s === 3) for (let i = 0; i < hw; i += 2) P2(hx + i, 0, 1, 1, h); // puntas
  if (s === 5) { P2(hx + (hw >> 1) - 1, -1, 2, 4, h); P2(hx + (hw >> 1) - 1, -1, 1, 4, hl); } // cresta
  if (s === 6) { P2(hx + (hw >> 1) - 1, -1, 3, 3, shade(h, 0.1)); P2(hx + (hw >> 1), -1, 1, 1, hl); } // moño
  if (s === 7) { P2(hx - 1, 3, 1, 3, h); P2(hx + hw, 3, 1, 3, hd); } // rizado
  if (s === 10 && !back) { P2(hx - 1, 4, 1, 6, h); P2(hx + hw, 4, 1, 6, hd); P2(hx - 1, 7, 1, 1, hl); P2(hx + hw, 7, 1, 1, hl); } // trenzas
  if (s === 10 && back) { P2(hx + 1, 8, 2, 4, h); P2(hx + hw - 3, 8, 2, 4, h); }
  if (s === 11 && !back && !side) { P2(hx - 1, 3, 1, 7, h); P2(hx + hw, 3, 1, 7, hd); } // melena
  if (big) { P2(hx - 2, 1, 1, 6, h); P2(hx + hw + 1, 1, 1, 6, hd); P2(hx - 1, 0, hw + 2, 1, hl); } // afro
  if (s === 14) { P2(hx, 2, 2, 2, shade(h, -0.4)); P2(hx + 2, 0, hw - 2, 3, h); } // rapado lateral
}
const front2 = d => d <= 1;
// Sombreros y cabezas de disfraz
function paintHat(P2, cs, d, hx, hw, sp) {
  const back = d >= 3, side = d === 2;
  switch (cs.hat) {
    case 'wizard': P2(hx - 1, 2, hw + 2, 1, cs.shirt); P2(hx + 1, 0, hw - 2, 2, cs.shirt); P2(hx + 2, -2, hw - 4, 2, cs.shirt); P2(hx + 3, -3, 2, 1, shade(cs.shirt, 0.3)); P2(hx + 2, 1, hw - 4, 1, '#ffd34a'); break;
    case 'pirate': P2(hx - 2, 1, hw + 4, 2, '#1a1410'); P2(hx + 1, 0, hw - 2, 1, '#1a1410'); if (!back) P2(hx + (hw >> 1), 1, 1, 1, '#f0f0f0'); break;
    case 'crown': paintHair(P2, sp, d, hx, hw); P2(hx, 0, hw, 2, '#ffd34a'); for (let i = 0; i < hw; i += 2) P2(hx + i, -1, 1, 1, '#ffd34a'); if (!back) P2(hx + (hw >> 1), 1, 1, 1, '#e02040'); break;
    case 'hood': P2(hx - 1, 1, hw + 2, back ? 8 : 4, cs.shirt); P2(hx - 1, 1, hw + 2, 1, shade(cs.shirt, 0.2)); if (!back) { P2(hx - 1, 5, 1, 4, cs.shirt); P2(hx + hw, 5, 1, 4, cs.shirt); P2(hx, 6, hw, 2, cs.shirt); } break;
    case 'knight': P2(hx - 1, 0, hw + 2, 6, '#b8bcc4'); P2(hx - 1, 0, hw + 2, 1, '#e8ecf0'); if (!back) P2(side ? hx + 4 : hx + 1, 4, side ? 3 : hw - 2, 1, '#1a1418'); P2(hx + (hw >> 1) - 1, -1, 2, 1, '#c83a3a'); break;
    case 'skull': P2(hx, 1, hw, 8, '#e8e0c8'); if (!back) { P2(side ? 9 : hx + 1, 4, 2, 2, '#1a1418'); if (!side) P2(hx + hw - 3, 4, 2, 2, '#1a1418'); P2(side ? 10 : hx + 2, 7, side ? 2 : hw - 4, 1, '#1a1418'); } break;
    case 'sheet': P2(hx - 1, 1, hw + 2, 8, cs.shirt); if (!back) { P2(side ? 9 : hx + 1, 4, 1, 2, '#1a1418'); if (!side) P2(hx + hw - 2, 4, 1, 2, '#1a1418'); } break;
    case 'pumpkin': P2(hx - 1, 1, hw + 2, 8, '#e8842a'); P2(hx + 2, 1, 1, 8, '#c86a1a'); P2(hx + hw - 3, 1, 1, 8, '#c86a1a'); P2(hx + (hw >> 1) - 1, 0, 2, 1, '#3a6a2a'); if (!back) { P2(side ? 9 : hx + 1, 4, 2, 1, '#ffe060'); if (!side) P2(hx + hw - 3, 4, 2, 1, '#ffe060'); P2(side ? 9 : hx + 2, 6, side ? 3 : hw - 4, 1, '#ffe060'); } break;
  }
}
function paintHelm(P2, a, d, hx, hw) {
  const c = a.c, hi = shade(c, 0.35), lo = shade(c, -0.3), back = d >= 3, side = d === 2;
  if (a.set === 'leather' || a.set === 'fur') { P2(hx - 1, 1, hw + 2, 3, c); P2(hx - 1, 1, hw + 2, 1, hi); P2(hx - 1, 3, hw + 2, 1, lo); return; }
  P2(hx - 1, 0, hw + 2, 5, c); P2(hx - 1, 0, hw + 2, 1, hi); P2(hx, 1, 1, 3, hi); P2(hx + hw, 1, 1, 4, lo);
  if (back) P2(hx - 1, 4, hw + 2, 4, c);
  else if (a.set === 'bronze' || a.set === 'iron') P2(hx - 2, 4, hw + 4, 1, lo); // ala
  else { P2(side ? hx + 3 : hx, 4, side ? 4 : hw, 3, c); P2(side ? hx + 4 : hx + 1, 5, side ? 3 : hw - 2, 1, a.set === 'voidsteel' ? '#a060ff' : '#1a1418'); } // yelmo con visera
  if (a.set === 'dragonsteel') { P2(hx - 2, 0, 1, 3, '#2a1a1a'); P2(hx + hw + 1, 0, 1, 3, '#2a1a1a'); }
  if (a.set === 'mithril') P2(hx + (hw >> 1), 0, 1, 1, '#ffffff');
}
// Contorno de 1 píxel alrededor de lo dibujado (da el aspecto de pixel art)
function outline(c, w, h) {
  const img = c.getImageData(0, 0, w, h), px = new Uint32Array(img.data.buffer), src = px.slice(), OUT = 0xEB18141A; // ABGR: #1a1418 casi opaco
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (src[i] >>> 24) continue;
    if ((x + 1 < w && src[i + 1] >>> 24 > 200) || (x > 0 && src[i - 1] >>> 24 > 200) || (y + 1 < h && src[i + w] >>> 24 > 200) || (y > 0 && src[i - w] >>> 24 > 200)) px[i] = OUT;
  }
  c.putImageData(img, 0, 0);
}
const _avCache = new Map();
function avatarSheet(look, equip) {
  const key = JSON.stringify(look) + '|' + JSON.stringify(equip || {}); let s = _avCache.get(key); if (s) return s;
  const PAD = 1, FW = AV_W + PAD * 2, FH = AV_H + PAD * 2, W = FW * AV_FR, H = FH * AV_DIRS, sp = avatarSpec(look, equip);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d', { willReadFrequently: true });
  // Todas las capas de todos los fotogramas en una sola hoja (el cuerpo empieza en el margen)…
  const anchors = [];
  for (let d = 0; d < AV_DIRS; d++) for (let f = 0; f < AV_FR; f++) { c.setTransform(1, 0, 0, 1, f * FW + PAD + AV_M, d * FH + PAD + AV_M); anchors.push(paintFrame(c, sp, d, f)); }
  c.setTransform(1, 0, 0, 1, 0, 0);
  // …ampliada al doble con suavizado de pixel art y volumen (render/hires.js), y contorno fino
  // Materiales por color: pelo, ropa, metal, cuero, pelaje y piel
  const mats = new Map(), add = (col, m) => { const k = hexPx(col); if (k >= 0 && !mats.has(k)) mats.set(k, m); };
  add(sp.hair, 'hair'); add(sp.skin, 'skin'); for (const k of ['shirt', 'pants', 'cape']) add(sp[k], 'cloth'); add(sp.shoes, 'leather'); add(sp.coat, 'fur');
  for (const a of [sp.helm, sp.chest, sp.legs, sp.feet]) if (a) add(a.c, a.set === 'leather' ? 'leather' : a.set === 'fur' ? 'fur' : 'metal');
  if (sp.gloves) add(sp.gloves, 'leather'); if (sp.shieldC) add(sp.shieldC, 'metal');
  const hi = hiRes2x(cv, mats); paintHD(hi, sp, anchors, FW, FH, PAD); outline(hi.getContext('2d', { willReadFrequently: true }), W * 2, H * 2);
  s = { cv: hi, FW, FH, an: anchors }; _avCache.set(key, s); if (_avCache.size > 40) _avCache.delete(_avCache.keys().next().value);
  return s;
}
// Ángulo → dirección de la hoja (y si hay que dibujarla en espejo)
function avatarDir(a) { const o = Math.round(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8; return [[2, 0], [1, 0], [0, 0], [1, 1], [2, 1], [3, 1], [4, 0], [3, 0]][o]; }
// Mano que sujeta el objeto en cada dirección (en píxeles del cuerpo, sin margen)
const AV_HAND = [[3, 15], [12, 15], [10, 15], [12, 13], [12, 14]];
function drawAvatar(ctx, look, equip, x, y, ang, walk, moving, sc = 2, held, swing) {
  const sh = avatarSheet(look, equip), [d, flip] = avatarDir(ang), f = moving ? 1 + (Math.floor(walk) & 3) : 0;
  const w = sh.FW * sc, h = sh.FH * sc, ox = -w / 2, oy = -h + 4 * sc;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (flip) ctx.scale(-1, 1);
  const smooth = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  const drawHeld = () => { if (!held) return; const [hx, hy] = AV_HAND[d], an = sh.an && sh.an[d * AV_FR + f], px = ox + (hx + 1 + AV_M) * sc, py = oy + (hy + 1 + AV_M + (an ? an.yo || 0 : 0)) * sc;
    if (typeof avHeld === 'function') { ctx.imageSmoothingEnabled = smooth; avHeld(ctx, held, d, flip, ang, swing, px, py, sc, f); ctx.imageSmoothingEnabled = false; return; }
    ctx.save(); ctx.translate(px, py); const base = d === 0 ? 2.4 : d === 4 ? -0.8 : 0.6; ctx.rotate(base + (swing || 0)); const s = ITEMS[held] && (ITEMS[held].weapon || ITEMS[held].tool) ? 20 : 12; ctx.imageSmoothingEnabled = smooth; drawItem(ctx, held, s * 0.3, -s * 0.3, s); ctx.restore(); };
  if (d >= 3) drawHeld();
  ctx.drawImage(sh.cv, f * sh.FW * 2, d * sh.FH * 2, sh.FW * 2, sh.FH * 2, ox, oy, w, h); // hoja a doble resolución
  if (d < 3) drawHeld();
  ctx.imageSmoothingEnabled = smooth; ctx.restore();
}

// ---------- Edad: canas en las sienes y arrugas ----------
function paintAge(PH, sp, d, hx, hw, front, side) {
  const a = sp.age; if (!a) return; const wr = shade(sp.skin, -0.28);
  if (a.temples && !sp.helm) { const g = '#d8d4cc'; if (side) PH(hx, 4, 1, 2, g); else { PH(hx, 3, 1, 2, g); PH(hx + hw - 1, 3, 1, 2, g); } }
  if (a.wrinkles && front) { PH(hx + 2, 3, 1, 1, wr); PH(hx + hw - 3, 3, 1, 1, wr); if (a.wrinkles > 1) { PH(hx + 1, 7, 1, 1, wr); PH(hx + hw - 2, 7, 1, 1, wr); PH(hx + 3, 3, 2, 1, wr); } }
  if (a.wrinkles && side) PH(hx + hw - 2, 7, 1, 1, wr);
}
// ---------- Marcas: tatuajes, cicatrices, joyas… ----------
function paintMarks(P2, PH, sp, d, hx, hw, bx, bw, front, side, back, f) {
  const M = sp.marks; if (!M || !M.size) return;
  const ex = d === 1 ? 7 : 6, ex2 = d === 1 ? 10 : 9, mx = (ex + ex2) >> 1, gold = '#ffd34a', arm = [0, 1, 0, -1, 0][f] || 0;
  if (front) {
    if (M.has('tribal')) { PH(hx, 5, 1, 3, '#2a3a5a'); PH(hx + hw - 1, 5, 1, 3, '#2a3a5a'); PH(hx + 1, 7, 1, 1, '#2a3a5a'); }
    if (M.has('runes')) { PH(hx + 2, 3, 1, 1, '#5af0ff'); PH(mx, 3, 1, 1, '#5af0ff'); PH(hx + hw - 3, 3, 1, 1, '#5af0ff'); }
    if (M.has('scar')) { PH(ex - 1, 4, 1, 1, '#a84a4a'); PH(ex, 5, 1, 1, '#c86a6a'); PH(ex + 1, 6, 1, 1, '#a84a4a'); PH(ex + 2, 7, 1, 1, '#a84a4a'); }
    if (M.has('starmark')) PH(ex2 + 1, 7, 1, 1, gold);
    if (M.has('hetero')) PH(ex2, 6, 1, 1, '#5ac8ff');
    if (M.has('earrings')) { PH(hx - 1, 6, 1, 1, gold); PH(hx + hw, 6, 1, 1, gold); }
    if (M.has('nosering')) PH(mx, 6, 1, 1, gold);
    if (M.has('warpaint')) { PH(ex - 1, 6, 2, 1, '#3a6ac8'); PH(ex2, 6, 2, 1, '#3a6ac8'); }
    if (M.has('soot')) { PH(hx + 1, 6, 1, 1, '#2a2622'); PH(hx + hw - 2, 5, 1, 1, '#2a2622'); P2(bx + 1, 13, 2, 1, 'rgba(30,26,22,.7)'); }
    if (M.has('bandage')) { PH(ex - 1, 4, 3, 1, '#f0ece0'); PH(ex - 1, 5, 3, 2, '#e8e2d4'); PH(hx, 4, hw, 1, '#e8e2d4'); }
    if (M.has('blush')) { PH(ex - 1, 7, 1, 1, '#f08a9a'); PH(ex2 + 1, 7, 1, 1, '#f08a9a'); }
    if (M.has('goldTooth')) PH(mx, 7, 1, 1, gold);
    if (M.has('frostbite')) { PH(mx, 6, 1, 1, '#a8d8ff'); PH(hx + 1, 4, 1, 1, '#c8e8ff'); }
    if (M.has('fangs')) for (let i = 0; i < bw; i += 2) P2(bx + i, 9, 1, 1, '#f4f0e0');
  } else if (side) {
    if (M.has('earrings')) PH(hx + 1, 6, 1, 1, gold);
    if (M.has('scar')) { PH(9, 4, 1, 1, '#a84a4a'); PH(10, 7, 1, 1, '#a84a4a'); }
    if (M.has('tribal')) PH(hx + 3, 5, 1, 3, '#2a3a5a');
    if (M.has('warpaint')) PH(9, 6, 2, 1, '#3a6ac8');
  }
  // brazos: tatuajes y venas luminosas en las manos
  const hands = side ? [[8 + arm, 14]] : [[bx - 2, 14 + arm], [bx + bw, 14 - arm]];
  for (const [x, y] of hands) { if (M.has('armTattoo')) P2(x, y, 1, 1, '#2a5a3a'); if (M.has('veins')) P2(x + 1, y, 1, 2, '#7af0ff'); if (M.has('tribal')) P2(x, y + 1, 2, 1, '#2a3a5a'); }
}
// ---------- Trasfondo: lo que llevas a la espalda ----------
function paintBackAcc(P2, sp, d, f) {
  const a = sp.acc; if (!a) return; const back = d >= 3, side = d === 2;
  if (a === 'quiver' && (back || side)) { const qx = back ? 10 : 3; P2(qx, 8, 3, 8, '#7a4a2a'); P2(qx, 8, 3, 1, '#a86a3a'); P2(qx, 6, 1, 2, '#e8e0c8'); P2(qx + 2, 6, 1, 2, '#c83a3a'); P2(qx + 1, 7, 1, 1, '#e8e0c8'); }
  if (a === 'lute' && (back || side)) { const lx = back ? 4 : 2; P2(lx, 11, 5, 5, '#b07a3a'); P2(lx + 1, 12, 3, 3, '#8a5a2a'); P2(lx + 2, 13, 1, 1, '#2a1a10'); P2(lx + 2, 6, 1, 5, '#6a4a2a'); }
  if (a === 'tatter' && back) { P2(3, 9, 10, 11, '#5a4a40'); for (let i = 0; i < 10; i += 2) P2(3 + i, 20, 1, 1 + ((i >> 1) & 1), '#5a4a40'); P2(3, 9, 10, 1, '#7a6a5a'); }
}
// ---------- Trasfondo: accesorios visibles sobre el cuerpo y la cabeza ----------
function paintAcc(P2, PH, sp, d, hx, hw, bx, bw, front, side, back, f, cs) {
  const a = sp.acc; if (!a) return; const noHead = sp.helm || (cs && cs.hat), gold = '#ffd34a';
  switch (a) {
    case 'collar': P2(bx, 9, bw, 1, gold); if (front) P2(bx + (bw >> 1), 10, 1, 1, '#e02040'); break;
    case 'bandana': if (!noHead) { PH(hx - 1, 1, hw + 2, 2, '#c83a3a'); PH(hx, 1, hw, 1, '#e85a5a'); if (back) PH(hx + 3, 3, 2, 2, '#c83a3a'); else if (side) PH(hx - 2, 2, 2, 2, '#c83a3a'); } if (front) PH(hx - 1, 6, 1, 1, gold); break;
    case 'rag': if (!noHead) { PH(hx - 1, 0, hw + 2, back ? 8 : 3, '#8a7a5a'); PH(hx - 1, 0, hw + 2, 1, '#a8987a'); if (!back) { PH(hx - 1, 3, 1, 5, '#8a7a5a'); PH(hx + hw, 3, 1, 5, '#7a6a4a'); } } break;
    case 'pauldron': if (side) { P2(bx + 1, 8, 4, 3, '#c8843a'); P2(bx + 1, 8, 4, 1, '#e8a85a'); } else { const px = back ? bx - 2 : bx + bw - 1; P2(px, 8, 4, 3, '#c8843a'); P2(px, 8, 4, 1, '#e8a85a'); P2(px + 1, 10, 2, 1, '#8a5a2a'); } break;
    case 'monocle': if (front) { const ex2 = d === 1 ? 10 : 9; PH(ex2 - 1, 4, 3, 1, gold); PH(ex2 + 1, 5, 1, 2, gold); PH(ex2 + 1, 7, 1, 2, '#c8a040'); } P2(side ? 5 : bx, 14, 3, 3, '#6a3a1a'); P2(side ? 5 : bx, 14, 3, 1, '#c8a040'); break;
    case 'apron': if (!back) { if (side) P2(10, 10, 2, 9, '#6a4a2a'); else { P2(bx + 1, 10, bw - 2, 9, '#7a5030'); P2(bx + 1, 10, bw - 2, 1, '#9a6a40'); P2(bx + 2, 14, bw - 4, 2, '#5a3a20'); } } break;
    case 'scarf': { const sw = [0, 1, 0, -1, 0][f] || 0; P2(bx - 1, 9, bw + 2, 2, '#2a8a8a'); P2(bx - 1, 9, bw + 2, 1, '#4ab8b8'); if (side) { P2(bx - 3, 10 + sw, 3, 2, '#2a8a8a'); P2(bx - 4, 11 + sw, 2, 2, '#1a6a6a'); } else if (!back) P2(bx + bw - 2, 10, 2, 4, '#2a8a8a'); break; }
    case 'tatter': if (!back) { P2(bx - 1, 9, 1, 10, '#5a4a40'); if (!side) P2(bx + bw, 9, 1, 10, '#4a3a30'); } break;
    case 'mask': if (!back) { if (side) PH(hx + 3, 6, 5, 3, '#3a3a40'); else { PH(hx, 6, hw, 3, '#3a3a40'); PH(hx, 6, hw, 1, '#5a5a64'); } } break;
    case 'stole': if (!side) { P2(bx + 1, 9, 2, 8, '#f4f0e4'); P2(bx + bw - 3, 9, 2, 8, '#f4f0e4'); if (front) { P2(bx + 1, 15, 2, 1, gold); P2(bx + bw - 3, 15, 2, 1, gold); } } else P2(bx + 3, 9, 2, 8, '#f4f0e4'); break;
    case 'straw': if (!noHead) { PH(hx - 3, 1, hw + 6, 1, '#e8c870'); PH(hx - 2, 2, hw + 4, 1, '#c8a850'); PH(hx, -1, hw, 2, '#e8c870'); PH(hx, 0, hw, 1, '#c84a3a'); } break;
    case 'quiver': if (front) for (let i = 0; i < 6; i++) P2(bx + i * bw / 6, 9 + i, 1, 1, '#6a4a2a'); break;
    case 'lute': if (front) for (let i = 0; i < 6; i++) P2(bx + bw - 1 - i * bw / 6, 9 + i, 1, 1, '#4a3a2a'); break;
    case 'headlamp': if (!noHead) { PH(hx - 1, 0, hw + 2, 3, '#e8c040'); PH(hx - 1, 0, hw + 2, 1, '#fff08a'); if (front) { PH(hx + (hw >> 1) - 1, 1, 2, 2, '#ffffff'); PH(hx + (hw >> 1) - 1, 1, 2, 1, '#bff4ff'); } else if (side) PH(hx + hw - 1, 1, 2, 2, '#ffffff'); } break;
  }
}
