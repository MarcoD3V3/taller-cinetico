'use strict';
// =====================================================================================
//  Redibujo a alta resolución del personaje (sobre la hoja ya ampliada al doble).
//  La base (render/avatar.js) define la silueta de cada raza, ropa, armadura y accesorio;
//  aquí se pintan a resolución completa los detalles que dan calidad: ojos con esclerótica,
//  iris, pupila, brillo y párpado; nariz; boca según la personalidad; rubor; brillo y
//  mechones del pelo; cuello, botones, puños y costuras; cinturón con hebilla; botas con
//  suela y cordones; dedos; armaduras con filos, remaches y emblema; capa con broche y
//  pliegues; detalles de raza (oreja de elfo, vetas de los cuernos, escamas).
// =====================================================================================
function paintHD(cv, sp, anchors, FW, FH, PAD) {
  const W = cv.width, H = cv.height, c = cv.getContext('2d', { willReadFrequently: true }), img = c.getImageData(0, 0, W, H), u = new Uint32Array(img.data.buffer);
  const px = col => hexPx(col) >>> 0, rgbOf = p => [p & 255, (p >> 8) & 255, (p >> 16) & 255];
  const near = (p, col, tol = 70) => { if ((p >>> 24) < 100) return false; const a = rgbOf(p), b = rgbOf(px(col)); return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < tol; };
  const SK = sp.skin, skD = px(shade(SK, -0.3)), skL = px(shade(SK, 0.25)), lash = px('#22161a'), white = px('#f6f2ea'), hi = px('#ffffff');
  for (const A of anchors) {
    if (!A) continue;
    const ox = (A.f * FW + PAD + AV_M) * 2, oy = (A.d * FH + PAD + AV_M) * 2;
    const ok = (X, Y) => X >= 0 && Y >= 0 && X < W && Y < H;
    const set = (X, Y, p) => { if (ok(X, Y)) u[Y * W + X] = p; };
    const get = (X, Y) => ok(X, Y) ? u[Y * W + X] : 0;
    const opaque = (X, Y) => (get(X, Y) >>> 24) > 100;
    const setIf = (X, Y, p, test) => { if (ok(X, Y) && test(get(X, Y))) u[Y * W + X] = p; };
    const mix = (X, Y, col, a) => { if (!opaque(X, Y)) return; const q = u[Y * W + X], s = rgbOf(q), t = rgbOf(px(col)); u[Y * W + X] = ((q & 0xff000000) | (Math.round(s[2] + (t[2] - s[2]) * a) << 16) | (Math.round(s[1] + (t[1] - s[1]) * a) << 8) | Math.round(s[0] + (t[0] - s[0]) * a)) >>> 0; };
    // coordenadas de la base → píxeles de la hoja al doble (cabeza con su desplazamiento propio)
    const HX = x => ox + (x + A.hox) * 2, HY = y => oy + (y + A.yo + A.hoy) * 2, BX = x => ox + x * 2, BY = y => oy + (y + A.yo) * 2;
    const helmFace = sp.helm && !['leather', 'fur', 'bronze', 'iron'].includes(sp.helm.set), hat = A.cs && A.cs.hat, covered = helmFace || ['skull', 'sheet', 'pumpkin', 'knight'].includes(hat);
    // ---------------- Cara ----------------
    if (A.front && !covered) {
      const ex = A.d === 1 ? 7 : 6, ex2 = A.d === 1 ? 10 : 9, mx = (ex + ex2) >> 1;
      const glow = sp.race && sp.race.glow, iris = px(sp.eyes), irisD = px(shade(toHex(sp.eyes[0] === '#' ? sp.eyes : '#888888'), -0.35));
      // cejas finas: la fila de abajo de cada ceja vuelve a ser piel
      const brow = shade(sp.hair, -0.35), isBrow = p => near(p, brow, 50);
      for (let X = HX(A.hx); X < HX(A.hx + A.hw); X++) for (let Y = HY(3); Y < HY(5) + 1; Y++) if (isBrow(get(X, Y)) && isBrow(get(X, Y - 1))) set(X, Y, px(SK));
      if (sp.face === 'happy' || sp.face === 'sleepy') { // ojos cerrados en arco (alegre) o entornados (somnoliento)
        for (const e of [ex, ex2]) { const X0 = HX(e), Y0 = HY(5);
          for (let r = -1; r < 4; r++) for (let k = -1; k < 3; k++) setIf(X0 + k, Y0 + r, px(SK), p => !near(p, SK, 45) && !isBrow(p));
          if (sp.face === 'happy') { set(X0 - 1, Y0 + 2, lash); set(X0, Y0 + 1, lash); set(X0 + 1, Y0 + 1, lash); set(X0 + 2, Y0 + 2, lash); }
          else { for (let k = -1; k < 3; k++) set(X0 + k, Y0 + 1, lash); set(X0, Y0 + 2, px(sp.eyes)); set(X0 + 1, Y0 + 2, px(sp.eyes)); } }
      }
      if (sp.face !== 'sleepy' && sp.face !== 'happy' && !(sp.marks && sp.marks.has('bandage'))) {
        for (const [e, outer] of [[ex, -1], [ex2, 1]]) {
          const X0 = HX(e), Y0 = HY(5);
          // esclerótica, iris de 2×3 con pupila y brillo, párpado superior y sombra inferior
          const sx = outer < 0 ? X0 - 1 : X0 + 2;
          for (let r = 0; r < 3; r++) set(sx, Y0 + r, glow ? iris : white);
          for (let r = 0; r < 3; r++) for (let k = 0; k < 2; k++) set(X0 + k, Y0 + r, r === 2 ? irisD : iris);
          if (!glow) { set(X0 + (outer < 0 ? 1 : 0), Y0 + 1, px('#120c0e')); set(X0 + (outer < 0 ? 1 : 0), Y0 + 2, px('#120c0e')); }
          set(X0 + (outer < 0 ? 0 : 1), Y0, hi);
          for (let k = -1; k <= 2; k++) set(X0 + k, Y0 - 1, lash);
          set(outer < 0 ? X0 - 2 : X0 + 3, Y0 - 1, lash); // pestaña exterior
          for (let k = 0; k < 2; k++) setIf(X0 + k, Y0 + 3, skD, p => near(p, SK, 90));
        }
      }
      // nariz: sombra y brillo
      const NX = HX(mx) + 1, NY = HY(6) + 1; setIf(NX, NY, skD, p => near(p, SK, 90)); setIf(NX - 1, NY - 1, skL, p => near(p, SK, 90)); setIf(NX + 1, NY, px(shade(SK, -0.15)), p => near(p, SK, 90));
      // boca según la personalidad (solo si no la tapa la barba o una máscara)
      if (!(sp.beard >= 1) && sp.acc !== 'mask' && !(sp.race && sp.race.snout)) {
        const MY = HY(7), MX = HX(mx), lip = px(shade(SK, -0.45)), dark = px('#3a1a1a'), tooth = px('#fbf6ea'), tongue = px('#d8606a');
        const chin = shade(SK, -0.25);
        for (let k = -2; k <= 3; k++) for (let r = 0; r < 4; r++) setIf(MX + k, MY + r, px(r >= 2 ? chin : SK), p => (p >>> 24) > 100 && !near(p, SK, 45) && !near(p, chin, 40) && !near(p, '#f4f0e0', 40));
        const line = (pts, col) => { for (const [dx, dy] of pts) set(MX + dx, MY + dy, col); };
        switch (sp.face) {
          case 'happy': line([[-1, 0], [0, 1], [1, 1], [2, 1], [3, 0]], lip); line([[0, 0], [1, 0], [2, 0]], tooth); break;
          case 'sad': line([[-1, 1], [0, 0], [1, 0], [2, 0], [3, 1]], lip); break;
          case 'angry': case 'grumpy': line([[-1, 1], [0, 1], [1, 1], [2, 1], [3, 1]], lip); line([[-1, 0], [3, 0]], px(shade(SK, -0.2))); break;
          case 'sly': line([[0, 1], [1, 1], [2, 0], [3, 0]], lip); break;
          case 'wild': line([[0, 0], [1, 0], [2, 0], [0, 1], [2, 1]], dark); line([[1, 1]], tongue); break;
          case 'shy': line([[1, 1], [2, 1]], lip); break;
          case 'curious': line([[1, 0], [1, 1], [2, 0], [2, 1]], dark); break;
          case 'brave': line([[-1, 1], [0, 1], [1, 1], [2, 0], [3, 0]], lip); break;
          default: line([[0, 1], [1, 1], [2, 1]], lip);
        }
      }
      // rubor suave en las mejillas
      for (const e of [ex - 1, ex2 + 1]) { mix(HX(e), HY(7), '#f08a8a', 0.22); mix(HX(e) + 1, HY(7), '#f08a8a', 0.18); }
    }
    if (A.side && !covered) { const X0 = HX(10), Y0 = HY(5); set(X0, Y0, white); set(X0 + 1, Y0, px(sp.eyes)); set(X0 + 1, Y0 + 1, px('#120c0e')); set(X0, Y0 + 1, px(sp.eyes)); set(X0 + 1, Y0, hi); for (let k = 0; k < 3; k++) set(X0 - 1 + k, Y0 - 1, lash); }
    // ---------------- Pelo: brillo en arco y mechones ----------------
    if (!sp.helm && !hat && sp.hs !== 9 && sp.hs !== 4) {
      const isHair = p => near(p, sp.hair, 80), shine = px(shade(sp.hair, 0.45)), dark = px(shade(sp.hair, -0.35));
      const x0 = HX(A.hx), w = A.hw * 2, y0 = HY(1);
      for (let k = 2; k < w - 3; k++) { const yy = y0 + 1 + Math.round(Math.pow((k - w * 0.4) / (w * 0.5), 2) * 2); if (k % 5 !== 4) setIf(x0 + k, yy, shine, isHair); }
      for (let k = 1; k < w - 1; k += 3) for (let r = 3; r < 7; r++) setIf(x0 + k + (r >> 2), y0 + r, dark, isHair);
    }
    // ---------------- Ropa, cinturón y botas ----------------
    const bx = A.bx, bw = A.bw, cx2 = BX(bx) + bw; // centro del torso en píxeles al doble
    if (A.front && !sp.chest && !(A.cs)) {
      const sh = sp.shirt, isShirt = p => near(p, sh, 80), btn = px('#efe2c0'), btnD = px(shade(sh, -0.45)), seam = px(shade(sh, -0.3));
      for (let r = BY(10) + 2; r < BY(15) - 1; r += 3) { setIf(cx2, r, btn, isShirt); setIf(cx2, r + 1, btnD, isShirt); }  // botones
      for (const X of [BX(bx) + 1, BX(bx + bw) - 2]) for (let r = BY(9) + 1; r < BY(9) + 4; r++) setIf(X, r, seam, isShirt);   // costura de hombros
      for (let k = -3; k <= 3; k++) setIf(cx2 + k, BY(9) + 1 + Math.abs(k) / 2 | 0, px(shade(sh, 0.3)), isShirt);             // cuello
    }
    if (A.front || A.back) { // puños de las mangas y dedos
      const arms = [BX(bx - 2), BX(bx + bw)];
      for (const X of arms) { for (let k = 0; k < 4; k++) setIf(X + k, BY(14) - 1, px(shade(A.sleeve, -0.4)), p => near(p, A.sleeve, 100)); if (!sp.gloves) { setIf(X + 1, BY(16) - 1, skD, p => near(p, A.armSk, 90)); setIf(X + 2, BY(16) - 1, skD, p => near(p, A.armSk, 90)); } }
    }
    if (!(sp.race && sp.race.horse)) { // cinturón con hebilla
      const BYb = BY(15), belt = px('#3a2616'), beltL = px('#6a4a2a');
      for (let k = 0; k < bw * 2; k++) { setIf(BX(bx) + k, BYb, beltL, p => near(p, '#4a3420', 60)); setIf(BX(bx) + k, BYb + 1, belt, p => near(p, '#4a3420', 60)); }
      if (A.front) { const g = px('#ffd86a'), gD = px('#a8822a'); for (let k = -2; k <= 1; k++) { set(cx2 + k, BYb - 1, g); set(cx2 + k, BYb + 2, gD); } set(cx2 - 2, BYb, g); set(cx2 - 2, BYb + 1, gD); set(cx2 + 1, BYb, g); set(cx2 + 1, BYb + 1, gD); set(cx2 - 1, BYb, px('#2a1a10')); set(cx2, BYb + 1, px('#2a1a10')); }
    }
    if (!(sp.race && sp.race.horse)) { // botas: suela, cordones y brillo de la puntera
      const isShoe = p => near(p, A.shoes, 90), sole = px('#1e140e'), lace = px(shade(A.shoes, 0.5));
      for (let X = BX(0); X < BX(16); X++) { const Y = BY(23) - 1; if (isShoe(get(X, Y)) || isShoe(get(X, Y - 1))) set(X, Y, sole); }
      if (A.front) for (let X = BX(0); X < BX(16); X += 2) setIf(X, BY(21) + 1, lace, isShoe);
    }
    if (A.front && !sp.legs && !(sp.race && sp.race.horse)) { // costura lateral del pantalón
      const isP = p => near(p, A.pants, 80), seam = px(shade(A.pants, -0.3));
      for (let r = BY(16) + 1; r < BY(21); r++) { setIf(BX(A.tx + 1), r, seam, isP); setIf(BX(A.tx + A.tw - 1) - 1, r, seam, isP); }
    }
    // ---------------- Armaduras ----------------
    const metal = a => a && a.set !== 'leather' && a.set !== 'fur';
    if (sp.chest && (A.front || A.back)) {
      const a = sp.chest.c, isA = p => near(p, a, 110), edge = px(shade(a, 0.55)), riv = px(shade(a, 0.7)), rivD = px(shade(a, -0.5));
      if (metal(sp.chest)) {
        for (const X of [BX(bx) + 1, BX(bx + bw) - 2]) { setIf(X, BY(9) + 1, riv, isA); setIf(X, BY(9) + 2, rivD, isA); }       // remaches de hombro
        for (let r = BY(9) + 2; r < BY(14); r++) setIf(BX(bx) + 2, r, edge, isA);                                               // filo con brillo
        if (A.front) { const ec = px('#ffd34a'); set(cx2, BY(11), ec); set(cx2 - 1, BY(11) + 1, ec); set(cx2 + 1, BY(11) + 1, ec); set(cx2, BY(11) + 2, ec); set(cx2, BY(11) + 1, px('#e02a3a')); } // emblema
      } else for (let r = BY(10); r < BY(14); r += 2) { setIf(cx2 - 1, r, px(shade(a, -0.4)), isA); setIf(cx2 + 1, r + 1, px(shade(a, -0.4)), isA); } // cordones de cuero
    }
    if (sp.helm && metal(sp.helm) && !A.back) {
      const a = sp.helm.c, isA = p => near(p, a, 110);
      for (let X = HX(A.hx) - 2; X < HX(A.hx + A.hw) + 2; X += 3) { setIf(X, HY(0) + 3, px(shade(a, 0.65)), isA); setIf(X, HY(0) + 4, px(shade(a, -0.4)), isA); }
      if (helmFace && A.front) for (let X = HX(A.hx + 1); X < HX(A.hx + A.hw - 1); X++) if ((X & 1) === 0) setIf(X, HY(5), px('#7a7a82'), p => (p >>> 24) > 100); // rejilla de la visera
    }
    if (sp.legs && metal(sp.legs) && A.front) { const a = sp.legs.c; for (const X of [BX(A.tx + 1) + 2, BX(A.tx + A.tw - 4) + 2]) { set(X, BY(18), px(shade(a, 0.7))); set(X + 1, BY(18), px(shade(a, 0.4))); set(X, BY(18) + 1, px(shade(a, -0.4))); } } // rodilleras
    // ---------------- Capa ----------------
    if (sp.cape) {
      const isC = p => near(p, sp.cape, 90), fold = px(shade(sp.cape, -0.35));
      if (A.back) for (let X = BX(3) + 3; X < BX(13); X += 4) for (let r = BY(10); r < BY(21); r++) setIf(X + ((r >> 3) & 1), r, fold, isC);
      if (A.front) { const g = px('#ffd34a'); set(BX(bx) - 1, BY(9) + 1, g); set(BX(bx + bw), BY(9) + 1, g); }
    }
    // ---------------- Detalles de raza ----------------
    if (sp.race && sp.race.horns) { const ridge = px('#6a5a60'); for (let Y = HY(-2); Y < HY(2); Y += 2) for (let X = HX(A.hx) - 4; X < HX(A.hx + A.hw) + 4; X++) setIf(X, Y, ridge, p => near(p, '#2a2024', 40)); }
    if (sp.race && sp.race.ears === 'elf' && A.front) { const inner = px(shade(SK, -0.25)); setIf(HX(A.hx) - 3, HY(4), inner, p => near(p, SK, 90)); setIf(HX(A.hx + A.hw) + 2, HY(4), inner, p => near(p, SK, 90)); }
    if (sp.race && sp.race.scales && !A.back) for (let Y = HY(3); Y < HY(8); Y += 3) for (let X = HX(A.hx) + 1; X < HX(A.hx + A.hw) - 1; X += 3) setIf(X + ((Y >> 1) & 1), Y, px(shade(SK, -0.2)), p => near(p, SK, 70));
  }
  c.putImageData(img, 0, 0);
}
