'use strict';
// =====================================================================================
//  Viento: árboles, arbustos y algunas flores se mecen despacio, todos hacia el mismo lado (el del
//  viento) pero cada uno con su ritmo, y con rachas suaves. El viento cambia de sentido muy despacio.
//  Barato: solo inclina el dibujo al pintarlo (sin imágenes nuevas ni memoria) y se calcula una vez
//  por fotograma. Opciones › Efectos › Viento en la vegetación.
// =====================================================================================
const WIND = { t: 0, dir: 1, str: 0.6, last: 0 };
function windTick() {
  const now = performance.now(); if (now === WIND.last) return; WIND.last = now;
  const t = now / 1000; WIND.t = t;
  // sentido: cambia en varios minutos, pasando suavemente por la calma
  const d = Math.sin(t / 240) * 0.8 + Math.sin(t / 97 + 1.3) * 0.2; WIND.dir = d;
  // rachas: suben y bajan en unos segundos
  WIND.str = 0.55 + 0.3 * Math.sin(t * 0.35) + 0.15 * Math.sin(t * 0.9 + 2);
}
// Cuánto se inclina la punta de algo (en unidades del mundo). amp: lo que se mueve a tope; seed: su ritmo propio
function windSway(seed, amp) {
  if (OPT.wind === false) return 0;
  const t = WIND.t, ph = seed * 6.283;
  const lean = WIND.dir * WIND.str * (0.65 + 0.35 * Math.sin(t * 0.8 + ph));   // hacia el viento
  const wob = Math.sin(t * 1.7 + ph * 1.7) * 0.18;                              // un pequeño vaivén propio
  return (lean + wob) * amp;
}
// Dibuja una imagen inclinada desde su base (la base queda quieta y la punta se mueve)
let WIND_BASE = null; // [k, ox, oy] de la pasada actual: inclina con setTransform (sin save/restore, más barato)
function windDraw(dc, im, x, y, w, h, seed, amp) {
  const sw = windSway(seed, amp);
  if (Math.abs(sw) < 0.05) { dc.drawImage(im, x, y, w, h); return; }
  if (WIND_BASE) { const [k, ox, oy] = WIND_BASE; dc.setTransform(k, 0, -sw / h * k, k, ox + k * x, oy + k * (y + h)); dc.drawImage(im, 0, -h, w, h); dc.setTransform(k, 0, 0, k, ox, oy); return; }
  dc.save(); dc.translate(x, y + h); dc.transform(1, 0, -sw / h, 1, 0, 0); dc.drawImage(im, 0, -h, w, h); dc.restore();
}
