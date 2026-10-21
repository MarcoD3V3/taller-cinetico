'use strict';
// =====================================================================================
//  Más calidad para los sprites, sin cambiar cómo se pintan:
//   · hiRes2x: amplía al doble con EPX/Scale2x (redondea curvas y diagonales como un pixel
//     art hecho a mano, sin emborronar) y añade volumen (luz arriba-izquierda, sombra
//     abajo-derecha) y una trama suave en las zonas lisas (tela, piel).
//   · shadeVolume: solo el volumen, para sprites que ya están a doble resolución.
//  Se usa una vez al crear cada hoja de sprites (queda en caché): no cuesta FPS.
// =====================================================================================
function hiRes2x(src, mats) {
  const w = src.width, h = src.height, sp = new Uint32Array(src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data.buffer);
  for (let i = 0; i < sp.length; i++) if ((sp[i] >>> 24) < 8) sp[i] = 0; // transparente = un único valor
  const W = w * 2, H = h * 2, out = mkCanvas(W, H), oc = out.getContext('2d', { willReadFrequently: true }), img = oc.createImageData(W, H), dp = new Uint32Array(img.data.buffer);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = sp[y * w + x], A = y > 0 ? sp[(y - 1) * w + x] : 0, B = x < w - 1 ? sp[y * w + x + 1] : 0, C = x > 0 ? sp[y * w + x - 1] : 0, D = y < h - 1 ? sp[(y + 1) * w + x] : 0;
    let p1 = P, p2 = P, p3 = P, p4 = P;
    if (C === A && C !== D && A !== B) p1 = A; if (A === B && A !== C && B !== D) p2 = B;
    if (D === C && D !== B && C !== A) p3 = C; if (B === D && B !== A && D !== C) p4 = D;
    const o = y * 2 * W + x * 2; dp[o] = p1; dp[o + 1] = p2; dp[o + W] = p3; dp[o + W + 1] = p4;
  }
  if (mats) materialDetail(dp, W, H, mats);
  oc.putImageData(img, 0, 0); shadeVolume(out, true); return out;
}
// Color (#rrggbb) → valor del píxel (ABGR)
const hexPx = h0 => { const h = h0 && h0[0] === "r" ? toHex(h0) : h0; if (!h || h[0] !== "#" || h.length !== 7) return -1; const v = parseInt(h.slice(1), 16); return ((255 << 24) | ((v & 255) << 16) | (v & 0xff00) | (v >> 16)) >>> 0; };
const pxMul = (p, f) => { let r = p & 255, g = (p >> 8) & 255, b = (p >> 16) & 255; if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; } return ((p & 0xff000000) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0; };
// Textura según el material de cada zona: mechones de pelo, tejido y pliegues, metal con brillo y remaches, cuero
function materialDetail(dp, W, H, mats) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, m = mats.get(dp[i]); if (!m) continue; let f = 0;
    switch (m) {
      case 'hair': if ((x + (y >> 1)) % 3 === 0) f = -0.2; else if ((x * 2 - y) % 7 === 0) f = 0.18; break;
      case 'cloth': if (x % 9 === 4) f = -0.12; else if ((x + y) % 4 === 0 && y & 1) f = -0.06; else if (y % 6 === 0 && x % 3 === 0) f = 0.06; break;
      case 'metal': if (y % 6 === 1) f = 0.3; else if (y % 6 === 5) f = -0.2; else if (x % 6 === 2 && y % 6 === 3) f = 0.45; break;
      case 'leather': if ((x * 3 + y * 5) % 11 === 0) f = -0.18; else if (y % 5 === 0) f = 0.08; break;
      case 'fur': if ((x + y * 2) % 5 === 0) f = 0.16; else if ((x * 2 + y) % 4 === 0) f = -0.12; break;
      case 'skin': if ((x + y) % 13 === 0) f = -0.04; break;
    }
    if (f) dp[i] = pxMul(dp[i], f);
  }
}
// Luz y sombra en los bordes de cada forma + trama ligera en las zonas lisas
function shadeVolume(cv, weave) {
  const W = cv.width, H = cv.height, c = cv.getContext('2d', { willReadFrequently: true }), img = c.getImageData(0, 0, W, H), d = img.data, src = new Uint32Array(d.buffer).slice();
  const op = i => (src[i] >>> 24) > 120;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!op(i)) continue;
    const up = y > 0 && op(i - W), dn = y < H - 1 && op(i + W), lf = x > 0 && op(i - 1), rt = x < W - 1 && op(i + 1);
    let f = 0;
    if (!up) f += 0.2; else if (y > 1 && !op(i - 2 * W)) f += 0.08;
    if (!lf) f += 0.08;
    if (!dn) f -= 0.24; else if (y < H - 2 && !op(i + 2 * W)) f -= 0.1;
    if (!rt) f -= 0.12;
    // trama de tela/piel en el interior de cada zona del mismo color
    if (weave && up && dn && lf && rt && src[i] === src[i - W] && src[i] === src[i + 1] && ((x + y * 3) & 3) === 0) f -= 0.06;
    if (!f) continue;
    const k = i * 4;
    for (let j = 0; j < 3; j++) { const v = d[k + j]; d[k + j] = f > 0 ? v + (255 - v) * f : v * (1 + f); }
  }
  c.putImageData(img, 0, 0);
}
