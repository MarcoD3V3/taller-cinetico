'use strict';
// =====================================================================================
//  Animales en pixel art (perfil, mirando a la derecha; se voltean al andar).
//  Se pintan a doble resolución (ANIM_RES píxeles por unidad del mundo) con luces, sombras,
//  textura de pelaje y contorno; 2 fotogramas de andar. Cada especie usa una plantilla de
//  cuerpo y sus rasgos (astas, crin, rayas, manchas, joroba, trompa…). Se dibuja una vez y
//  queda en caché. Los animales grandes (jirafa, elefante…) tienen un lienzo más alto.
// =====================================================================================
const ANIM_RES = 2;
for (const k in NEW_SPECIES) SPECIES[k] = NEW_SPECIES[k];
// Tamaños más realistas para algunos (el tamaño también decide cuánto cuesta cazarlos)
Object.assign(SPECIES.elephant, { s: 20 }); Object.assign(SPECIES.polarbear, { s: 13 }); Object.assign(SPECIES.buffalo, { s: 13 });
Object.assign(SPECIES.camel, { s: 13 }); Object.assign(SPECIES.horse, { s: 11 }); Object.assign(SPECIES.unicorn, { s: 11 }); Object.assign(SPECIES.griffin, { s: 12 });
Object.assign(SPECIES.panda, { s: 10 }); Object.assign(SPECIES.deer, { s: 9 }); Object.assign(SPECIES.reindeer, { s: 9 }); Object.assign(SPECIES.mooshroom, { s: 10 });
// Escala de dibujo extra para los pequeños (que se vean bien)
const animVS = sp => sp.s <= 3 ? 1.6 : sp.s <= 4 ? 1.4 : sp.s <= 5 ? 1.2 : 1;
// k: plantilla · resto: rasgos (ver ANIM_PAINT.quad)
const ANIM_LOOK = {
  wisp: { k: 'wisp' }, golem: { k: 'golem' }, slime: { k: 'slime' }, jellyfish: { k: 'jelly' }, squid: { k: 'squid' },
  fish: { k: 'fish' }, dolphin: { k: 'fish', dolphin: 1 }, snake: { k: 'snake' }, basilisk: { k: 'snake', crest: 1 },
  spider: { k: 'spider' }, crab: { k: 'crab' }, scorpion: { k: 'scorpion' }, beetle: { k: 'bug' }, crystalbeetle: { k: 'bug', crystal: 1 },
  moth: { k: 'flyer', moth: 1 }, bee: { k: 'flyer', bee: 1 }, butterfly: { k: 'flyer' }, frog: { k: 'frog' }, turtle: { k: 'turtle' },
  penguin: { k: 'penguin' }, seal: { k: 'seal' }, kangaroo: { k: 'roo' }, koala: { k: 'koala' },
  parrot: { k: 'bird', tailL: 5 }, seagull: { k: 'bird', tailL: 3 }, heron: { k: 'bird', legs: 7, neck: 5, beakL: 4 }, flamingo: { k: 'bird', legs: 8, neck: 6, beakL: 3, bentBeak: 1 },
  vulture: { k: 'bird', bald: 1, tailL: 3 }, phoenix: { k: 'bird', flame: 1, tailL: 7, crest: 1 }, griffin: { k: 'griffin' },
  chicken: { k: 'bird', comb: 1, tailL: 3, legs: 2 }, duck: { k: 'bird', duck: 1, beakL: 3, tailL: 2, legs: 1 }, owl: { k: 'bird', owl: 1, tailL: 2 }, eagle: { k: 'bird', whiteHead: 1, hook: 1, tailL: 4 },
  deer: { k: 'quad', legs: 1.1, neck: 1, snout: 2, ears: 'point', horns: 'antler', tail: 'short', pat: 'spots' },
  reindeer: { k: 'quad', legs: 1, neck: 0.9, snout: 2, ears: 'point', horns: 'antler', tail: 'short', pat: 'belly' },
  moose: { k: 'quad', legs: 1.25, neck: 0.7, snout: 4, ears: 'side', horns: 'palmate', tail: 'short', bell: 1, body: 1.1 },
  antelope: { k: 'quad', legs: 1.2, neck: 1, snout: 2, ears: 'point', horns: 'straight', tail: 'thin', pat: 'belly' },
  giraffe: { k: 'quad', legs: 1.9, neck: 3.6, snout: 2, ears: 'point', horns: 'ossicone', tail: 'tuft', pat: 'patches', mane: 1, body: 0.95 },
  zebra: { k: 'quad', legs: 1.1, neck: 1.2, snout: 3, ears: 'point', tail: 'tuft', pat: 'stripes', mane: 1 },
  rabbit: { k: 'quad', legs: 0.5, neck: 0, snout: 1, ears: 'long', tail: 'puff', body: 0.8 },
  boar: { k: 'quad', legs: 0.6, neck: 0, snout: 3, ears: 'point', horns: 'tusk', tail: 'thin', pat: 'bristle', body: 1.15 },
  pig: { k: 'quad', legs: 0.45, neck: 0, snout: 2, ears: 'point', tail: 'curlS', pigNose: 1, body: 1.1 },
  sheep: { k: 'quad', legs: 0.6, neck: 0.3, snout: 1, ears: 'side', tail: 'short', wool: 1, darkHead: 1 },
  goat: { k: 'quad', legs: 0.8, neck: 0.5, snout: 2, ears: 'side', horns: 'curved', tail: 'short', beard: 1 },
  cow: { k: 'quad', legs: 0.8, neck: 0.3, snout: 2, ears: 'side', horns: 'short', tail: 'tuft', pat: 'patches', udder: 1, body: 1.15 },
  horse: { k: 'quad', legs: 1.1, neck: 1.3, snout: 3, ears: 'point', tail: 'long', mane: 1, body: 1.1 },
  unicorn: { k: 'quad', legs: 1.1, neck: 1.3, snout: 3, ears: 'point', horns: 'unicorn', tail: 'long', mane: 1, body: 1.1 },
  wolf: { k: 'quad', legs: 0.8, neck: 0.4, snout: 3, ears: 'point', tail: 'bushy', pat: 'belly' },
  frostwolf: { k: 'quad', legs: 0.8, neck: 0.4, snout: 3, ears: 'point', tail: 'bushy', pat: 'belly', frost: 1 },
  fox: { k: 'quad', legs: 0.6, neck: 0.3, snout: 3, ears: 'point', tail: 'bushyTip', pat: 'belly' },
  lion: { k: 'quad', legs: 0.85, neck: 0.3, snout: 2, ears: 'round', tail: 'tuft', pat: 'belly', maneBig: 1 },
  tiger: { k: 'quad', legs: 0.75, neck: 0.2, snout: 2, ears: 'round', tail: 'long', pat: 'stripes' },
  shadowcat: { k: 'quad', legs: 0.7, neck: 0.2, snout: 1, ears: 'point', tail: 'long', glowEye: 1 },
  bear: { k: 'quad', legs: 0.7, neck: 0.2, snout: 2, ears: 'round', tail: 'short', body: 1.2, hump: 0.3 },
  polarbear: { k: 'quad', legs: 0.7, neck: 0.2, snout: 2, ears: 'round', tail: 'short', body: 1.25 },
  panda: { k: 'quad', legs: 0.6, neck: 0.1, snout: 1, ears: 'round', tail: 'short', pat: 'panda', body: 1.15 },
  camel: { k: 'quad', legs: 1.3, neck: 1.4, snout: 2, ears: 'side', tail: 'thin', hump: 1 },
  buffalo: { k: 'quad', legs: 0.8, neck: 0.2, snout: 2, ears: 'side', horns: 'curved', tail: 'tuft', hump: 0.6, body: 1.2 },
  elephant: { k: 'quad', legs: 0.9, neck: 0, snout: 0, ears: 'big', horns: 'tusk', tail: 'thin', trunk: 1, body: 1.25, wrinkle: 1 },
  rhino: { k: 'quad', legs: 0.7, neck: 0, snout: 3, ears: 'point', horns: 'rhino', tail: 'thin', pat: 'plates', body: 1.3 },
  hippo: { k: 'quad', legs: 0.45, neck: 0, snout: 4, ears: 'round', tail: 'thin', body: 1.45, bigMouth: 1 },
  crocodile: { k: 'quad', legs: 0.3, neck: 0, snout: 7, tail: 'lizard', low: 1, pat: 'scutes', body: 1.5, teeth: 1 },
  mooshroom: { k: 'quad', legs: 0.7, neck: 0.3, snout: 2, ears: 'side', horns: 'short', tail: 'tuft', pat: 'spots', shrooms: 1, body: 1.15 },
  monkey: { k: 'quad', legs: 0.7, neck: 0.4, snout: 1, ears: 'round', tail: 'curl', face: 1 },
  hedgehog: { k: 'quad', legs: 0.25, neck: 0, snout: 2, ears: 'round', tail: 'short', pat: 'spines', body: 0.95 },
  otter: { k: 'quad', legs: 0.3, neck: 0.1, snout: 2, ears: 'round', tail: 'thick', low: 1, body: 1.25, pat: 'belly' },
  raccoon: { k: 'quad', legs: 0.5, neck: 0.1, snout: 2, ears: 'point', tail: 'ringed', mask: 1 },
  lizard: { k: 'quad', legs: 0.3, neck: 0, snout: 2, tail: 'lizard', low: 1, pat: 'spots' },
  salamander: { k: 'quad', legs: 0.3, neck: 0, snout: 2, tail: 'lizard', low: 1, pat: 'spots', glowSpots: 1 },
  drake: { k: 'quad', legs: 0.7, neck: 0.9, snout: 3, horns: 'curved', tail: 'lizard', wingsQ: 1, pat: 'belly' },
};
const _animSpr = new Map();
// Devuelve { f: [fotograma0, fotograma1], size (ancho en el mundo), h (alto), gy (pies, desde arriba) }
function animalSprite(id) {
  let s = _animSpr.get(id); if (s) return s;
  const sp = SPECIES[id], L = ANIM_LOOK[id] || { k: sp.aq ? 'fish' : sp.bird ? 'bird' : 'quad' }, q = ANIM_RES;
  const R = sp.s * q, base = (sp.s * 2 + 10) * q;
  // Cuerpos largos (elefante, cocodrilo, rinoceronte…): el lienzo crece para que quepan cabeza, hocico y cola
  const W = L.k === 'quad' ? Math.max(base, 2 * Math.round(R * (0.75 * (L.body || 1) + 0.75) + ((L.snout || 0) + 8) * q)) : base;
  const tall = L.k === 'quad' ? Math.max(0, Math.round(R * (0.55 * (L.neck || 0) + 0.7 * ((L.legs ?? 1) - 1)) - R * 0.4)) + (L.horns === 'antler' || L.horns === 'palmate' ? 4 * q : 0) : 0;
  const H = W + tall, gy = Math.round(H - (W / 2 - R * 0.6)), frames = [];
  for (let fr = 0; fr < 2; fr++) {
    const cv2 = mkCanvas(W, H), c = cv2.getContext('2d', { willReadFrequently: true });
    const P = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    (ANIM_PAINT[L.k] || ANIM_PAINT.quad)(P, sp, L, R, W >> 1, gy, fr, q, c);
    shadeVolume(cv2); animOutline(c, W, H); // volumen (render/hires.js) y contorno
    frames.push(cv2);
  }
  s = { f: frames, size: W / q, h: H / q, gy: gy / q }; _animSpr.set(id, s); return s;
}
function animOutline(c, w, h) {
  const img = c.getImageData(0, 0, w, h), px = new Uint32Array(img.data.buffer), src = px.slice(), OUT = 0xE6141018;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (src[i] >>> 24) continue;
    if ((x + 1 < w && src[i + 1] >>> 24 > 180) || (x > 0 && src[i - 1] >>> 24 > 180) || (y + 1 < h && src[i + w] >>> 24 > 180) || (y > 0 && src[i - w] >>> 24 > 180)) px[i] = OUT;
  }
  c.putImageData(img, 0, 0);
}
// Cuerpo redondeado con luz arriba, sombra abajo y textura de pelaje (motas deterministas)
function blob(P, x, y, w, h, col, light = 0.22, dark = -0.25, fur = 0.5) {
  w = Math.round(w); h = Math.round(h); const rad = Math.max(1, Math.floor(Math.min(w, h) * 0.32));
  for (let r = 0; r < h; r++) {
    // esquinas curvas proporcionales al tamaño (los cuerpos grandes no quedan cuadrados)
    const e = r < rad ? rad - r - 0.5 : r >= h - rad ? r - (h - rad) + 0.5 : 0, ins = e > 0 ? Math.round(rad - Math.sqrt(Math.max(0, rad * rad - e * e))) : 0;
    const t = r / Math.max(1, h - 1), cc = t < 0.18 ? shade(col, light) : t > 0.72 ? shade(col, dark * (t - 0.6) * 2.5) : col;
    P(x + ins, y + r, w - ins * 2, 1, cc);
    if (fur && w > 6) for (let i = 2; i < w - 2; i += 3) { const hh = Math.sin((x + i) * 12.9898 + (y + r) * 78.233) * 43758.5453; if (hh - Math.floor(hh) < fur * 0.25) P(x + i, y + r, 1, 1, shade(col, t < 0.5 ? 0.1 : -0.12)); }
  }
}
const ANIM_PAINT = {
  quad(P, sp, L, R, cx, gy, fr, q) {
    const c1 = sp.c, c2 = sp.c2, sz = L.body || 1;
    const bl = Math.round(R * 1.5 * sz), bh = Math.max(3 * q, Math.round(R * (L.low ? 0.42 : 0.72) * Math.min(1.2, sz))), ll = Math.max(q, Math.round(R * 0.7 * (L.legs ?? 1)));
    const x0 = cx - (bl >> 1) - q, by = gy - ll - bh, lw = Math.max(q, Math.round(R * 0.16)), st = fr ? q : -q;
    const legX = [x0 + q, x0 + bl - 2 * q - lw], far = shade(c1, -0.35);
    for (const lx of legX) P(lx + q + (fr ? -st : 0), by + bh - q, lw, ll + q, far);
    const tl = L.tail, tc = L.frost ? '#e8f4ff' : c1;
    if (tl === 'short') P(x0 - q, by + q, 2 * q, 2 * q, tc);
    else if (tl === 'puff') blob(P, x0 - 2 * q, by, 4 * q, 4 * q, '#f8f4ee', 0.1, -0.1, 0);
    else if (tl === 'thin') { P(x0 - q, by + q, q, Math.round(bh * 0.9), shade(tc, -0.2)); }
    else if (tl === 'tuft') { P(x0 - q, by + q, q, bh, shade(tc, -0.2)); P(x0 - 2 * q, by + bh, 2 * q, 3 * q, shade(c2, -0.3)); }
    else if (tl === 'long') { const lc = L.mane ? c2 : tc; P(x0 - 2 * q, by, 2 * q, 2 * q, lc); P(x0 - 3 * q, by + q, 2 * q, bh + 3 * q, lc); P(x0 - 3 * q, by + q, q, bh + 3 * q, shade(lc, -0.25)); if (L.pat === 'stripes') for (let i = 0; i < 4; i++) P(x0 - 3 * q, by + 2 * q + i * 3 * q, 2 * q, q, c2); }
    else if (tl === 'bushy' || tl === 'bushyTip') { blob(P, x0 - 6 * q, by - q, 7 * q, 4 * q, tc, 0.2, -0.2); if (tl === 'bushyTip') P(x0 - 7 * q, by, 2 * q, 2 * q, '#f8f4ee'); }
    else if (tl === 'curl') { P(x0 - 2 * q, by + q, 2 * q, q, tc); P(x0 - 3 * q, by - 2 * q, q, 4 * q, tc); P(x0 - 2 * q, by - 3 * q, 2 * q, q, tc); }
    else if (tl === 'curlS') { P(x0 - q, by + q, q, q, c2); P(x0 - 2 * q, by, q, q, c2); P(x0 - q, by - q, q, q, c2); }
    else if (tl === 'ringed') { for (let i = 0; i < 6; i++) P(x0 - 2 * q - i * q, by + i * q, 2 * q, 2 * q, i & 1 ? '#2a2a2a' : '#b8b8b8'); }
    else if (tl === 'thick') { for (let i = 0; i < 5; i++) P(x0 - q - i * q, by + Math.round(bh * 0.4) + (i >> 1) * q, 2 * q, Math.max(q, 3 * q - (i >> 1) * q), shade(c1, -0.1)); }
    else if (tl === 'lizard') { const n = Math.round(R * 0.8); for (let i = 0; i < n; i++) P(x0 - q - i, by + Math.round(bh * 0.45) + Math.round(i * 0.35), q, Math.max(1, Math.round(bh * 0.45 * (1 - i / n))), i < n / 2 ? c1 : shade(c1, -0.15)); }
    if (L.wingsQ) { P(x0 + 2 * q, by - 3 * q, bl - 5 * q, 3 * q, shade(c2, -0.2)); P(x0 + 3 * q, by - 5 * q, 3 * q, 2 * q, shade(c2, -0.1)); P(x0 + 6 * q, by - 4 * q, 2 * q, q, shade(c2, -0.1)); }
    blob(P, x0, by, bl, bh, c1, 0.22, -0.28, L.wool || L.pat === 'scutes' ? 0 : 0.6);
    if (L.hump) { const hw = Math.round(bl * 0.4), hh = Math.round(R * 0.5 * L.hump); blob(P, x0 + Math.round(bl * (L.hump < 0.5 ? 0.55 : 0.3)), by - hh + q, hw, hh + q, c1, 0.25, 0); }
    if (L.wool) { for (let i = 0; i < bl; i += 3 * q) for (let j = -q; j < bh - q; j += 3 * q) blob(P, x0 + i, by + j, 3 * q + 1, 3 * q + 1, (i + j) % 2 ? '#fbf8f0' : '#ebe4d6', 0.15, -0.1, 0); }
    if (L.pat === 'belly') P(x0 + 2 * q, by + bh - 2 * q, bl - 4 * q, 2 * q, c2);
    if (L.pat === 'spots') for (let i = 0; i < 7; i++) P(x0 + 2 * q + ((i * 7 * q) % (bl - 3 * q)), by + q + ((i * 5 * q) % Math.max(q, bh - 2 * q)), q + (i & 1) * q, q, L.glowSpots ? '#ffd060' : c2);
    if (L.pat === 'patches') for (let i = 0; i < 6; i++) { const px = x0 + q + ((i * 11 * q) % Math.max(q, bl - 5 * q)), py = by + q + ((i * 7 * q) % Math.max(q, bh - 3 * q)); blob(P, px, py, 3 * q + (i % 2) * q, 2 * q + (i % 3 ? q : 0), c2, 0.1, -0.1, 0); }
    if (L.pat === 'stripes') for (let i = 2 * q; i < bl - q; i += 3 * q) { P(x0 + i, by + q, q, bh - 2 * q, c2); P(x0 + i + (i % 2 ? q : -q), by + Math.round(bh / 2), q, Math.round(bh / 3), c2); }
    if (L.pat === 'bristle') for (let i = 0; i < bl - 2 * q; i += 2 * q) P(x0 + q + i, by - q, q, q, shade(c1, -0.4));
    if (L.pat === 'panda') blob(P, x0, by + q, Math.round(bl * 0.45), bh - q, c2, 0.1, -0.1, 0);
    if (L.pat === 'scutes') for (let i = 0; i < bl - 2 * q; i += 2 * q) { P(x0 + q + i, by - q, q, q, shade(c1, -0.3)); P(x0 + q + i, by + Math.round(bh * 0.4), q, q, shade(c1, 0.15)); }
    if (L.pat === 'plates') { P(x0 + Math.round(bl * 0.3), by + q, q, bh - 2 * q, shade(c1, -0.25)); P(x0 + Math.round(bl * 0.65), by + q, q, bh - 2 * q, shade(c1, -0.25)); }
    if (L.pat === 'spines') for (let i = 0; i < bl; i += q) { const hgt = 2 * q + ((i / q) % 3) * q; P(x0 + i, by - hgt + 2 * q, q, hgt, i % (2 * q) ? '#4a3420' : '#e8d8b8'); }
    if (L.wrinkle) for (let i = 2 * q; i < bl - 2 * q; i += 4 * q) P(x0 + i, by + Math.round(bh * 0.3), q, Math.round(bh * 0.5), shade(c1, -0.15));
    if (L.shrooms) { for (const sx of [3 * q, bl - 6 * q]) { P(x0 + sx, by - 2 * q, 3 * q, 2 * q, '#e8e0d4'); P(x0 + sx - q, by - 4 * q, 5 * q, 2 * q, '#c83a32'); P(x0 + sx, by - 4 * q, q, q, '#f4f4f4'); } }
    if (L.udder) { P(x0 + Math.round(bl * 0.55), by + bh - q, 3 * q, 2 * q, '#f0a8b0'); }
    const hoofed = ['antler', 'straight', 'curved', 'short', 'palmate', 'ossicone', 'rhino'].includes(L.horns) || L.mane || L.hump, hoof = hoofed ? shade(c2, -0.5) : shade(c1, -0.3);
    for (const lx of legX) { const o = fr ? st : 0, lc = L.pat === 'panda' ? c2 : c1; P(lx + o, by + bh - q, lw, ll + q, lc); P(lx + o, by + bh, 1, ll, shade(lc, 0.15)); if (L.pat === 'stripes') for (let i = 2 * q; i < ll; i += 3 * q) P(lx + o, by + bh + i, lw, q, c2); P(lx + o, gy - q, lw + (L.low ? q : 0), q, hoof); }
    const nk = Math.round(R * 0.55 * (L.neck ?? 0.5)), hs = Math.max(3 * q, Math.round(R * (L.trunk ? 0.78 : L.neck > 2 ? 0.45 : 0.6))), hx = x0 + bl - Math.round(hs * 0.4), hy = by - nk - Math.round(hs * 0.4);
    if (nk > 0) {
      const nw = Math.max(3 * q, Math.round(hs * 0.6)), nc = L.pat === 'panda' ? c2 : c1;
      for (let i = 0; i < nk + 2 * q; i++) { const sh = Math.round(i * 0.25); P(x0 + bl - nw - sh + q, hy + 2 * q + i, nw, 1, i < 2 ? shade(nc, 0.15) : nc); }
      if (L.pat === 'patches') for (let i = 0; i < nk; i += 4 * q) P(x0 + bl - nw + q, hy + 3 * q + i, 2 * q, 2 * q, c2);
      if (L.pat === 'stripes') for (let i = 0; i < nk; i += 3 * q) P(x0 + bl - nw + q, hy + 3 * q + i, nw, q, c2);
      if (L.mane) for (let i = 0; i < nk + q; i += q) P(x0 + bl - nw - Math.round(i * 0.25), hy + 2 * q + i, 2 * q, q, L.pat === 'stripes' ? '#1a1a1a' : c2);
    }
    if (L.maneBig) blob(P, hx - 3 * q, hy - 2 * q, hs + 4 * q, hs + 5 * q, '#8a5a2a', 0.15, -0.2, 0.8);
    const headC = L.darkHead ? '#3a3430' : c1;
    blob(P, hx, hy, hs, hs, headC, 0.25, -0.2);
    const sn = (L.snout || 0) * q; if (sn) { const sh2 = Math.max(2 * q, Math.round(hs * (L.bigMouth ? 0.7 : 0.5))); P(hx + hs - q, hy + Math.round(hs * 0.45), sn + q, sh2, headC); P(hx + hs - q, hy + Math.round(hs * 0.45), sn + q, 1, shade(headC, 0.2)); P(hx + hs + sn - q, hy + Math.round(hs * 0.45), q, q, '#1a1214');
      if (L.teeth) for (let i = 0; i < sn; i += 2 * q) P(hx + hs + i, hy + Math.round(hs * 0.45) + sh2 - q, q, q, '#f4f0e0');
      if (L.bigMouth) P(hx + hs, hy + Math.round(hs * 0.45) + sh2 - 2 * q, sn, q, shade(c2, -0.2)); }
    if (L.pigNose) { P(hx + hs - q, hy + Math.round(hs * 0.4), 3 * q, 3 * q, c2); P(hx + hs, hy + Math.round(hs * 0.5), q, q, '#8a4a4a'); P(hx + hs + q, hy + Math.round(hs * 0.5), q, q, '#8a4a4a'); }
    if (L.pat === 'belly' && sn) P(hx + hs - q, hy + hs - q, sn, q, c2);
    if (L.trunk) { const tlen = Math.round(hs * 0.9) + ll; for (let i = 0; i < tlen; i++) P(hx + hs - q + Math.round(i * 0.12), hy + Math.round(hs * 0.5) + i, Math.max(q, 3 * q - Math.round(i * 2 * q / tlen)), 1, i % (2 * q) ? headC : shade(headC, -0.12)); }
    if (L.mask) { P(hx + q, hy + Math.round(hs * 0.3), hs + q, 2 * q, '#1a1a1a'); }
    const ex = hx + hs - 2 * q, ey = hy + Math.round(hs * 0.32);
    if (L.pat === 'panda') blob(P, ex - q, ey - q, 3 * q, 3 * q, '#1a1a1a', 0, 0, 0);
    P(ex, ey, q, q, L.glowEye ? '#c8a0ff' : '#140e10'); P(ex, ey, 1, 1, L.glowEye ? '#ffffff' : '#f0f0f0');
    if (L.face) P(hx + hs - 3 * q, hy + 2 * q, 3 * q, hs - 2 * q, c2);
    const e = L.ears;
    if (e === 'point') { P(hx + q, hy - 2 * q, 2 * q, 2 * q, headC); P(hx + q, hy - 3 * q, q, q, headC); P(hx + 2 * q, hy - q, 1, q, '#e8a8a0'); }
    else if (e === 'long') { P(hx + q, hy - 6 * q, q, 6 * q, headC); P(hx + 2 * q, hy - 6 * q, q, 6 * q, shade(headC, -0.2)); P(hx + q, hy - 5 * q, 1, 4 * q, '#f0b0b0'); }
    else if (e === 'round') { blob(P, hx, hy - q, 2 * q + 1, 2 * q + 1, L.pat === 'panda' ? c2 : headC, 0.1, -0.1, 0); }
    else if (e === 'side') { P(hx - q, hy + q, 2 * q, q, headC); P(hx - 2 * q, hy + q, q, q, shade(headC, -0.2)); }
    else if (e === 'big') { blob(P, hx - 2 * q, hy, Math.round(hs * 0.75), Math.round(hs * 1.15), shade(c1, -0.08), 0.1, -0.2, 0.3); P(hx, hy + 2 * q, q, Math.round(hs * 0.7), shade(c1, -0.25)); }
    const hc = '#e8dcc0', h = L.horns, ac = '#c8a878';
    if (h === 'antler') { P(hx + q, hy - 2 * q, q, 2 * q, ac); P(hx, hy - 5 * q, q, 3 * q, ac); P(hx + q, hy - 7 * q, q, 2 * q, ac); P(hx - 2 * q, hy - 4 * q, 2 * q, q, ac); P(hx + 2 * q, hy - 6 * q, 2 * q, q, ac); P(hx - 3 * q, hy - 6 * q, q, 2 * q, ac); P(hx + 4 * q, hy - 8 * q, q, 2 * q, ac); }
    else if (h === 'palmate') { P(hx + q, hy - 2 * q, q, 2 * q, ac); P(hx - 4 * q, hy - 5 * q, 7 * q, 3 * q, ac); P(hx - 4 * q, hy - 5 * q, 7 * q, 1, shade(ac, 0.2)); for (let i = 0; i < 4; i++) P(hx - 4 * q + i * 2 * q, hy - 7 * q, q, 2 * q, ac); }
    else if (h === 'curved') { P(hx + q, hy - q, 2 * q, q, hc); P(hx, hy - 2 * q, 2 * q, q, hc); P(hx - q, hy - q, q, 2 * q, hc); }
    else if (h === 'straight') { P(hx + q, hy - 5 * q, q, 5 * q, '#3a2a1a'); P(hx + 2 * q, hy - 4 * q, q, 4 * q, '#3a2a1a'); }
    else if (h === 'short') { P(hx + q, hy - q, q, q, hc); P(hx + hs - 2 * q, hy - q, q, q, hc); }
    else if (h === 'ossicone') { P(hx + q, hy - 3 * q, q, 3 * q, c2); P(hx + 3 * q, hy - 3 * q, q, 3 * q, c2); P(hx + q, hy - 4 * q, q, q, '#2a1a10'); P(hx + 3 * q, hy - 4 * q, q, q, '#2a1a10'); }
    else if (h === 'unicorn') { for (let i = 0; i < 6; i++) P(hx + hs - 2 * q + Math.round(i * q / 2), hy - q - i * q, q, q, i & 1 ? '#ffe8a0' : '#fff8e0'); }
    else if (h === 'rhino') { const bx2 = hx + hs + sn - 2 * q; for (let i = 0; i < 4; i++) P(bx2 - i * q / 2, hy + Math.round(hs * 0.45) - (i + 1) * q, Math.max(q, 2 * q - (i >> 1) * q), q, i > 2 ? '#f4f0e0' : c2); }
    else if (h === 'tusk') { P(hx + hs + sn - 2 * q, hy + hs - q, 3 * q, q, '#f8f4e8'); P(hx + hs + sn, hy + hs - 2 * q, q, q, '#f8f4e8'); }
    if (L.beard) P(hx + hs - q, hy + hs, q, 2 * q, shade(c2, -0.1));
    if (L.bell) P(hx + hs - q, hy + hs, 2 * q, 3 * q, shade(c1, -0.15));
    if (L.frost) P(x0 + 2 * q, by, bl - 4 * q, q, '#ffffff');
  },
  bird(P, sp, L, R, cx, gy, fr, q) {
    const c1 = sp.c, c2 = sp.c2, bw = Math.round(R * 1.3), bh = Math.round(R * (L.owl ? 1.15 : 0.85)), ll = (L.legs || Math.max(2, Math.round(sp.s * 0.35))) * q, fly = sp.fly;
    const x0 = cx - (bw >> 1), by = gy - ll - bh, legC = L.duck ? '#f0a030' : L.flame ? '#ffb030' : '#c88a3a';
    if (!fly || fr === 0) { P(x0 + (bw >> 1) - q + (fr ? q : 0), gy - ll, q, ll, shade(legC, -0.2)); P(x0 + (bw >> 1) + q - (fr ? q : 0), gy - ll, q, ll, legC); P(x0 + (bw >> 1) + q - (fr ? q : 0), gy - q, 3 * q, q, legC); }
    const tl = (L.tailL || 3) * q; for (let i = 0; i < tl; i++) P(x0 - i, by + q + Math.round(i * 0.5), 2 * q, 2 * q, L.flame ? (i % (2 * q) < q ? '#ffe040' : '#ff7a2a') : L.comb && i > tl / 2 ? '#3a3a3a' : shade(c1, -0.1 - i * 0.02));
    blob(P, x0, by, bw, bh, c1, 0.25, -0.25, 0.4);
    if (fly && fr) { blob(P, x0 + 2 * q, by - 4 * q, bw - 4 * q, 4 * q, shade(c1, -0.15), 0.2, -0.1, 0); P(x0 + 3 * q, by - 6 * q, bw - 6 * q, 2 * q, shade(c1, 0.1)); }
    else { blob(P, x0 + 2 * q, by + q, bw - 4 * q, bh - 2 * q, shade(c1, -0.18), 0.1, -0.15, 0); for (let i = 0; i < bw - 5 * q; i += 2 * q) P(x0 + 3 * q + i, by + bh - 2 * q, q, q, shade(c1, -0.4)); }
    if (sp.n === 'Loro') P(x0 + 2 * q, by + 2 * q, bw - 5 * q, 2 * q, c2);
    if (L.owl) { for (let i = 0; i < bh - 3 * q; i += 2 * q) P(x0 + bw - 4 * q, by + 2 * q + i, 2 * q, q, '#e8d8b8'); }
    const nk = (L.neck || 0) * q, hs = Math.max(3 * q, Math.round(R * (L.owl ? 0.75 : 0.55))), hx = x0 + bw - 2 * q - (L.owl ? q : 0), hy = by - nk - hs + 2 * q;
    if (nk) P(hx, hy + hs - q, 2 * q, nk + q, c1);
    const headC = L.bald ? '#e8b8a0' : L.whiteHead ? '#f4f0e8' : L.duck ? '#2a6a3a' : c1;
    blob(P, hx, hy, hs, hs, headC, 0.25, -0.15, 0);
    const bl = (L.beakL || 2) * q, bc = L.bald ? '#c8b080' : L.duck || L.hook || L.whiteHead ? '#f0b020' : c2 === '#2a2a2a' || c2 === '#2a2a30' ? '#e8a030' : L.comb ? '#e8b030' : c2, my = hy + Math.round(hs / 2) - q;
    P(hx + hs, my, bl, q, bc); P(hx + hs, my + q, Math.max(q, bl - q), q, shade(bc, -0.25));
    if (L.bentBeak) P(hx + hs + bl - q, my + q, q, 2 * q, '#2a2a2a');
    if (L.hook) P(hx + hs + bl - q, my + q, q, q, bc);
    if (L.owl) { blob(P, hx + q, hy + q, 3 * q, 3 * q, '#f0d070', 0, 0, 0); P(hx + 2 * q, hy + 2 * q, q, q, '#140e10'); P(hx, hy - 2 * q, q, 2 * q, headC); P(hx + hs - q, hy - 2 * q, q, 2 * q, headC); }
    else { P(hx + hs - 2 * q, hy + q, q, q, '#140e10'); P(hx + hs - 2 * q, hy + q, 1, 1, '#ffffff'); }
    if (L.comb) { P(hx + q, hy - 2 * q, 3 * q, 2 * q, '#e02a2a'); P(hx + hs, my + 2 * q, q, 2 * q, '#e02a2a'); }
    if (L.crest) { P(hx + q, hy - 2 * q, q, 2 * q, L.flame ? '#ffe040' : c2); P(hx + 2 * q, hy - 3 * q, q, 3 * q, L.flame ? '#ff7a2a' : c2); }
  },
  griffin(P, sp, L, R, cx, gy, fr, q) {
    ANIM_PAINT.quad(P, sp, { legs: 0.8, neck: 0.6, snout: 0, ears: 'point', tail: 'tuft', pat: 'belly' }, R, cx, gy, fr, q);
    const x0 = cx - Math.round(R * 0.75), by = gy - Math.round(R * 0.56) - Math.round(R * 0.72);
    blob(P, x0 + 2 * q, by - 5 * q, Math.round(R * 1.1), 5 * q, sp.c2, 0.25, -0.15, 0); for (let i = 0; i < 5; i++) P(x0 + 2 * q + i * 3 * q, by - q, q, 2 * q, shade(sp.c2, -0.3));
    const hx = cx + Math.round(R * 0.55), hy = by - Math.round(R * 0.55); blob(P, hx, hy, 6 * q, 6 * q, sp.c2, 0.25, -0.15, 0); P(hx + 6 * q, hy + 2 * q, 3 * q, 2 * q, '#e8a030'); P(hx + 8 * q, hy + 4 * q, q, q, '#e8a030'); P(hx + 4 * q, hy + q, q, q, '#140e10');
  },
  roo(P, sp, L, R, cx, gy, fr, q) { // canguro: erguido sobre patas grandes, cola gruesa
    const c1 = sp.c, c2 = sp.c2, bw = Math.round(R * 0.9), bh = Math.round(R * 1.3), x0 = cx - (bw >> 1), by = gy - bh - Math.round(R * 0.25) - (fr ? 2 * q : 0);
    for (let i = 0; i < 6; i++) P(x0 - q - i * q, gy - 3 * q - Math.round(i * 0.4 * q), 2 * q, Math.max(q, 4 * q - i * q / 2), shade(c1, -0.1));
    blob(P, x0 - q, gy - 4 * q - (fr ? 2 * q : 0), Math.round(bw * 0.8), 4 * q, shade(c1, -0.1)); P(x0 + Math.round(bw * 0.4), gy - q - (fr ? 2 * q : 0), Math.round(bw * 0.6), q, shade(c1, -0.3));
    blob(P, x0, by, bw, bh, c1, 0.2, -0.25, 0.5); blob(P, x0 + Math.round(bw * 0.45), by + 2 * q, Math.round(bw * 0.45), bh - 4 * q, c2, 0.1, -0.1, 0);
    P(x0 + bw - q, by + Math.round(bh * 0.35), 2 * q, 3 * q, c1);
    const hs = Math.round(R * 0.5), hx = x0 + Math.round(bw * 0.4), hy = by - hs + q; blob(P, hx, hy, hs, hs, c1, 0.25, -0.15, 0); P(hx + hs - q, hy + Math.round(hs / 2), 2 * q, 2 * q, c1); P(hx + hs + q, hy + Math.round(hs / 2), q, q, '#1a1214');
    P(hx + q, hy - 3 * q, q, 3 * q, c1); P(hx + 2 * q, hy - 3 * q, q, 3 * q, shade(c1, -0.2)); P(hx + hs - 2 * q, hy + 2 * q, q, q, '#140e10');
  },
  koala(P, sp, L, R, cx, gy, fr, q) {
    const c1 = sp.c, c2 = sp.c2, bw = Math.round(R * 1.4), bh = Math.round(R * 1.2), x0 = cx - (bw >> 1), by = gy - bh;
    P(x0 + q + (fr ? q : 0), gy - 2 * q, 3 * q, 2 * q, shade(c1, -0.2)); P(x0 + bw - 4 * q - (fr ? q : 0), gy - 2 * q, 3 * q, 2 * q, shade(c1, -0.2));
    blob(P, x0, by, bw, bh, c1, 0.2, -0.2, 0.7); blob(P, x0 + Math.round(bw * 0.5), by + 2 * q, Math.round(bw * 0.4), bh - 4 * q, c2, 0.05, -0.05, 0);
    const hs = Math.round(R * 1.0), hx = x0 + Math.round(bw * 0.35), hy = by - Math.round(hs * 0.6);
    blob(P, hx - 2 * q, hy - q, 4 * q, 4 * q, c1, 0.1, -0.1, 0.5); blob(P, hx + hs - 2 * q, hy - q, 4 * q, 4 * q, c1, 0.1, -0.1, 0.5); P(hx - q, hy, 2 * q, 2 * q, c2); P(hx + hs - q, hy, 2 * q, 2 * q, c2);
    blob(P, hx, hy, hs, hs, c1, 0.25, -0.15, 0.4); blob(P, hx + Math.round(hs * 0.45), hy + Math.round(hs * 0.4), 3 * q, 4 * q, '#2a2a2e', 0.15, 0, 0); P(hx + Math.round(hs * 0.3), hy + Math.round(hs * 0.35), q, q, '#140e10'); P(hx + Math.round(hs * 0.8), hy + Math.round(hs * 0.35), q, q, '#140e10');
  },
  fish(P, sp, L, R, cx, gy, fr, q) {
    const c1 = sp.c, c2 = sp.c2, bw = Math.round(R * 1.8), bh = Math.round(R * (L.dolphin ? 0.7 : 0.9)), x0 = cx - (bw >> 1), y0 = gy - R - (bh >> 1);
    const tw = fr ? q : 0; P(x0 - 3 * q, y0 - q + tw, 3 * q, 2 * q, c1); P(x0 - 4 * q, y0 - 2 * q + tw, 2 * q, q, c1); P(x0 - 3 * q, y0 + bh - q - tw, 3 * q, 2 * q, c1); P(x0 - 4 * q, y0 + bh - tw, 2 * q, q, c1);
    blob(P, x0, y0, bw, bh, c1, 0.3, -0.2, 0); P(x0 + q, y0 + bh - 2 * q, bw - 3 * q, 2 * q, c2);
    if (L.dolphin) { P(x0 + (bw >> 1) - q, y0 - 3 * q, 3 * q, 3 * q, c1); P(x0 + bw - q, y0 + (bh >> 1), 3 * q, 2 * q, c1); } else { P(x0 + (bw >> 1) - q, y0 - 2 * q, 4 * q, 2 * q, shade(c1, -0.2)); for (let i = 2 * q; i < bw - 3 * q; i += 2 * q) for (let j = 2 * q; j < bh - 2 * q; j += 2 * q) P(x0 + i + (j % (4 * q) ? q : 0), y0 + j, q, 1, shade(c1, 0.15)); }
    P(x0 + bw - 3 * q, y0 + q, q, q, '#140e10'); P(x0 + bw - 3 * q, y0 + q, 1, 1, '#ffffff');
  },
  snake(P, sp, L, R, cx, gy, fr, q) {
    const c1 = sp.c, c2 = sp.c2, n = Math.round(R * 2.6), x0 = cx - (n >> 1), th = Math.max(2 * q, Math.round(R * 0.4));
    const yAt = i => gy - th - q + Math.round(Math.sin(i / q * 0.55 + fr * 1.5) * R * 0.3);
    for (let i = 0; i < n; i++) { const y = yAt(i); P(x0 + i, y, 1, th, (i / q) % 4 < 2 ? c1 : shade(c1, -0.15)); P(x0 + i, y, 1, 1, shade(c1, 0.25)); P(x0 + i, y + th - q, 1, q, c2); if ((i / q) % 5 === 2) P(x0 + i, y + q, q, q, c2); }
    const hy = yAt(n) - q; blob(P, x0 + n - q, hy, th + 2 * q, th + q, c1, 0.25, -0.15, 0); P(x0 + n + th - q, hy + q, q, q, '#140e10'); P(x0 + n + th + q, hy + th - q, 2 * q, 1, '#e02040');
    if (L.crest) { P(x0 + n, hy - 2 * q, q, 2 * q, c2); P(x0 + n + q, hy - 3 * q, q, 3 * q, c2); }
  },
  spider(P, sp, L, R, cx, gy, fr, q) {
    const c1 = sp.c, c2 = sp.c2, bw = Math.round(R * 1.2);
    for (let i = 0; i < 4; i++) { const lx = cx - 4 * q + i * 3 * q, sh2 = ((i + fr) & 1) * q; P(lx - 2 * q, gy - 4 * q - sh2, q, 4 * q + sh2, shade(c1, -0.2)); P(lx - 3 * q, gy - q, q, q, shade(c1, -0.2)); P(lx + 2 * q, gy - 4 * q - sh2, q, 4 * q + sh2, c1); P(lx + 3 * q, gy - q, q, q, c1); }
    blob(P, cx - bw, gy - Math.round(R * 1.1) - 2 * q, bw + q, Math.round(R * 1.1), c1, 0.3, -0.2, 0.4); P(cx - bw + 2 * q, gy - Math.round(R * 0.8) - 2 * q, 2 * q, 2 * q, c2); P(cx - bw + 3 * q, gy - Math.round(R * 0.5) - 2 * q, q, 2 * q, c2);
    blob(P, cx + q, gy - Math.round(R * 0.7) - 2 * q, Math.round(R * 0.7) + q, Math.round(R * 0.7), shade(c1, 0.1), 0.3, -0.2, 0); for (let i = 0; i < 3; i++) P(cx + Math.round(R * 0.4) + i * q, gy - Math.round(R * 0.5) - 2 * q - (i & 1) * q, 1, 1, c2);
  },
  crab(P, sp, L, R, cx, gy, fr, q) {
    const c1 = sp.c, c2 = sp.c2, bw = Math.round(R * 2), bh = Math.round(R * 0.9), x0 = cx - (bw >> 1), y0 = gy - bh - 2 * q;
    for (let i = 0; i < 3; i++) { P(x0 + q + i * 2 * q, gy - 2 * q - ((i + fr) & 1) * q, q, 2 * q, shade(c1, -0.2)); P(x0 + bw - 2 * q - i * 2 * q, gy - 2 * q - ((i + fr) & 1) * q, q, 2 * q, shade(c1, -0.2)); }
    blob(P, x0, y0, bw, bh, c1, 0.3, -0.2, 0); P(x0 + 2 * q, y0 + bh - 2 * q, bw - 4 * q, q, c2);
    blob(P, x0 - 3 * q, y0 - 3 * q + fr * q, 4 * q, 4 * q, c1, 0.3, -0.2, 0); blob(P, x0 + bw - q, y0 - 3 * q - fr * q, 4 * q, 4 * q, c1, 0.3, -0.2, 0);
    P(cx - 2 * q, y0 - 2 * q, q, 2 * q, c1); P(cx + q, y0 - 2 * q, q, 2 * q, c1); P(cx - 2 * q, y0 - 3 * q, q, q, '#140e10'); P(cx + q, y0 - 3 * q, q, q, '#140e10');
  },
  scorpion(P, sp, L, R, cx, gy, fr, q) {
    const c1 = sp.c, c2 = sp.c2, bw = Math.round(R * 1.6), x0 = cx - (bw >> 1), y0 = gy - 4 * q;
    for (let i = 0; i < 3; i++) P(x0 + 2 * q + i * 2 * q, gy - 2 * q + ((i + fr) & 1) * q, q, 2 * q, shade(c1, -0.2));
    blob(P, x0, y0, bw, 3 * q, c1, 0.3, -0.2, 0); for (let i = 0; i < bw; i += 2 * q) P(x0 + i, y0 + q, 1, 2 * q, shade(c1, -0.3));
    P(x0 - q, y0 - q, 2 * q, 2 * q, c1); P(x0 - 2 * q, y0 - 3 * q, 2 * q, 2 * q, c1); P(x0 - q, y0 - 5 * q, 2 * q, 2 * q, c1); P(x0 + q, y0 - 6 * q, 2 * q, q, c1); P(x0 + 3 * q, y0 - 6 * q, q, 2 * q, c2);
    P(x0 + bw, y0 - q, 3 * q, 2 * q, c2); P(x0 + bw + 2 * q, y0 - 2 * q, q, q, c2); P(x0 + bw - 2 * q, y0, q, q, '#140e10');
  },
  bug(P, sp, L, R, cx, gy, fr, q) {
    const c1 = sp.c, c2 = sp.c2, bw = Math.round(R * 1.8), bh = Math.round(R * 1.1), x0 = cx - (bw >> 1), y0 = gy - bh - q;
    for (let i = 0; i < 3; i++) P(x0 + q + i * 3 * q, gy - q, q, 2 * q - ((i + fr) & 1) * q, shade(c1, -0.3));
    blob(P, x0, y0, bw, bh, c1, 0.45, -0.25, 0); P(x0 + (bw >> 1), y0, q, bh - q, shade(c1, -0.35)); P(x0 + q, y0 + q, 2 * q, q, c2); P(x0 + 2 * q, y0 + 2 * q, q, 1, '#ffffff');
    if (L.crystal) { P(x0 + 2 * q, y0 - 2 * q, q, 2 * q, '#e0d0ff'); P(x0 + 4 * q, y0 - 3 * q, q, 3 * q, '#c8b0ff'); P(x0 + 6 * q, y0 - 2 * q, q, 2 * q, '#e0d0ff'); }
    blob(P, x0 + bw - q, y0 + q, 3 * q, bh - q, shade(c1, -0.2), 0.2, -0.1, 0); P(x0 + bw + q, y0, 2 * q, q, shade(c1, -0.3)); P(x0 + bw, y0 + 2 * q, q, q, c2);
  },
  flyer(P, sp, L, R, cx, gy, fr, q) {
    const c1 = sp.c, c2 = sp.c2, y0 = gy - R * 2, wy = fr ? -2 * q : 0, ws = Math.round(R * 1.2) + q;
    if (L.bee) { blob(P, cx - 2 * q, y0 - 3 * q + wy, 3 * q, ws, 'rgba(230,245,255,.85)', 0, 0, 0); blob(P, cx, y0 - 3 * q + wy, 3 * q, ws - q, 'rgba(210,235,255,.85)', 0, 0, 0); }
    else { blob(P, cx - ws, y0 - ws + 2 * q + wy, ws, ws + q, c1, 0.2, -0.1, 0); blob(P, cx + q, y0 - ws + 2 * q + wy, ws, ws + q, shade(c1, -0.1), 0.2, -0.1, 0); P(cx - ws + q, y0 - ws + 3 * q + wy, 2 * q, 2 * q, c2); P(cx + ws - 2 * q, y0 - ws + 3 * q + wy, 2 * q, 2 * q, c2); if (L.moth) { P(cx - ws + 2 * q, y0 + wy, q, q, '#2a1a10'); P(cx + ws - 2 * q, y0 + wy, q, q, '#2a1a10'); } }
    const bc = L.bee ? c1 : c2; P(cx - q, y0 - q, 2 * q, Math.max(3 * q, R + q), bc); if (L.bee) { P(cx - q, y0 + q, 2 * q, q, c2); P(cx - q, y0 + 3 * q, 2 * q, q, c2); }
    P(cx - q, y0 - 2 * q, 2 * q, q, shade(bc, -0.3)); P(cx - 2 * q, y0 - 4 * q, q, 2 * q, shade(bc, -0.3)); P(cx + q, y0 - 4 * q, q, 2 * q, shade(bc, -0.3));
  },
  frog(P, sp, L, R, cx, gy, fr, q) {
    const c1 = sp.c, c2 = sp.c2, bw = Math.round(R * 2.2), bh = Math.round(R * 1.4), x0 = cx - (bw >> 1), y0 = gy - bh - (fr ? 2 * q : 0);
    P(x0 - q, gy - 2 * q, 3 * q, 2 * q, shade(c1, -0.2)); blob(P, x0, y0, bw, bh, c1, 0.3, -0.2, 0); P(x0 + q, y0 + bh - 2 * q, bw - 2 * q, 2 * q, c2);
    for (let i = 0; i < 3; i++) P(x0 + 2 * q + i * 2 * q, y0 + q + (i & 1) * q, q, q, shade(c1, -0.25));
    blob(P, x0 + bw - 3 * q, y0 - q, 3 * q, 3 * q, c1, 0.3, 0, 0); P(x0 + bw - 2 * q, y0, q, q, '#140e10'); P(x0 + bw - q, gy - 2 * q, 2 * q, 2 * q, shade(c1, -0.1));
  },
  turtle(P, sp, L, R, cx, gy, fr, q) {
    const c1 = sp.c, c2 = sp.c2, bw = Math.round(R * 1.8), bh = Math.round(R * 0.9), x0 = cx - (bw >> 1), y0 = gy - bh - 2 * q;
    P(x0 + q + fr * q, gy - 2 * q, 2 * q, 2 * q, c2); P(x0 + bw - 3 * q - fr * q, gy - 2 * q, 2 * q, 2 * q, c2);
    blob(P, x0, y0, bw, bh, c1, 0.35, -0.2, 0); for (let i = 2 * q; i < bw - 2 * q; i += 3 * q) { P(x0 + i, y0 + q, q, bh - 2 * q, shade(c1, -0.25)); P(x0 + i + q, y0 + 2 * q, q, q, shade(c1, 0.2)); } P(x0, y0 + bh - q, bw, q, shade(c1, -0.4));
    blob(P, x0 + bw - q, y0 + q, 4 * q, 3 * q, c2, 0.2, -0.1, 0); P(x0 + bw + q, y0 + 2 * q, q, q, '#140e10'); P(x0 - 2 * q, y0 + bh - 2 * q, 2 * q, q, c2);
  },
  penguin(P, sp, L, R, cx, gy, fr, q) {
    const c1 = sp.c, c2 = sp.c2, bw = Math.round(R * 1.1), bh = Math.round(R * 1.8), x0 = cx - (bw >> 1), y0 = gy - bh - q;
    P(x0 + q + fr * q, gy - q, 2 * q, q, '#e8a030'); P(x0 + bw - 3 * q - fr * q, gy - q, 2 * q, q, '#e8a030');
    blob(P, x0, y0, bw, bh, c1, 0.2, -0.2, 0); blob(P, x0 + q, y0 + 3 * q, bw - 2 * q, bh - 4 * q, c2, 0.1, -0.1, 0); P(x0 - q, y0 + 4 * q, q, bh - 6 * q, c1);
    P(x0 + bw - 2 * q, y0 + q, q, q, '#140e10'); P(x0 + bw, y0 + 2 * q, 2 * q, q, '#e8a030'); P(x0 + q, y0 + 2 * q, bw - 3 * q, q, '#f0c040');
  },
  seal(P, sp, L, R, cx, gy, fr, q) {
    const c1 = sp.c, c2 = sp.c2, bw = Math.round(R * 2), bh = Math.round(R * 0.8), x0 = cx - (bw >> 1), y0 = gy - bh;
    P(x0 - 3 * q, gy - 2 * q - fr * q, 3 * q, 2 * q, shade(c1, -0.2)); blob(P, x0, y0, bw, bh, c1, 0.3, -0.2, 0.3); P(x0 + 2 * q, gy - q, bw - 5 * q, q, c2);
    for (let i = 0; i < 5; i++) P(x0 + 3 * q + i * 3 * q, y0 + q + (i & 1) * q, q, q, shade(c1, -0.2));
    blob(P, x0 + bw - 3 * q, y0 - 3 * q, 5 * q, 5 * q, c1, 0.3, -0.1, 0); P(x0 + bw, y0 - 2 * q, q, q, '#140e10'); P(x0 + bw + q, y0, q, q, '#140e10'); P(x0 + bw - 2 * q, gy - 3 * q, 3 * q, 2 * q, shade(c1, -0.2));
  },
  slime(P, sp, L, R, cx, gy, fr, q) {
    const c1 = sp.c, c2 = sp.c2, bw = Math.round(R * 2.2) + (fr ? q : 0), bh = Math.round(R * 1.4) - (fr ? q : 0), x0 = cx - (bw >> 1), y0 = gy - bh;
    blob(P, x0, y0, bw, bh, c1, 0.4, -0.15, 0); P(x0 + 2 * q, y0 + q, 2 * q, q, '#ffffff'); P(x0 + q, y0 + bh - 2 * q, bw - 2 * q, q, c2);
    P(x0 + bw - 4 * q, y0 + 2 * q, q, 2 * q, '#140e10'); P(x0 + bw - 2 * q, y0 + 2 * q, q, 2 * q, '#140e10'); P(x0 + (bw >> 1), y0 + Math.round(bh * 0.5), 2 * q, q, shade(c2, -0.2));
  },
  wisp(P, sp, L, R, cx, gy, fr, q) {
    const y0 = gy - R * 2; for (let r = R + 2 * q; r > 0; r--) P(cx - r, y0 - r + (fr ? q : 0), r * 2, r * 2, r > R ? 'rgba(154,240,255,.18)' : r > R / 2 ? sp.c : sp.c2);
    P(cx - q, y0 + R + q, 2 * q, 3 * q + fr * q, 'rgba(154,240,255,.5)');
  },
  golem(P, sp, L, R, cx, gy, fr, q) {
    const c1 = sp.c, c2 = sp.c2, bw = Math.round(R * 1.4), bh = Math.round(R * 1.2), x0 = cx - (bw >> 1), y0 = gy - bh - 4 * q;
    P(x0 + q + fr * q, gy - 4 * q, 3 * q, 4 * q, shade(c1, -0.2)); P(x0 + bw - 4 * q - fr * q, gy - 4 * q, 3 * q, 4 * q, shade(c1, -0.2));
    blob(P, x0, y0, bw, bh, c1, 0.35, -0.25, 0); P(x0 + 2 * q, y0 + 2 * q, 2 * q, 3 * q, c2); P(x0 + bw - 4 * q, y0 + 3 * q, 2 * q, 2 * q, c2); P(x0 + (bw >> 1) - q, y0 + (bh >> 1), 3 * q, 3 * q, '#ffffff');
    blob(P, x0 - 2 * q, y0 + 2 * q + fr * q, 3 * q, bh - q, shade(c1, 0.1), 0.3, -0.2, 0); blob(P, x0 + bw - q, y0 + 2 * q - fr * q, 3 * q, bh - q, shade(c1, -0.1), 0.3, -0.2, 0);
    blob(P, x0 + (bw >> 1) - 3 * q, y0 - 5 * q, 6 * q, 5 * q, c1, 0.35, -0.2, 0); P(x0 + (bw >> 1) - 2 * q, y0 - 3 * q, q, q, c2); P(x0 + (bw >> 1) + q, y0 - 3 * q, q, q, c2); P(x0 + (bw >> 1) - q, y0 - 7 * q, 2 * q, 2 * q, c2);
  },
  jelly(P, sp, L, R, cx, gy, fr, q) {
    const c1 = sp.c, c2 = sp.c2, bw = Math.round(R * 2), x0 = cx - (bw >> 1), y0 = gy - R * 2 - 2 * q;
    blob(P, x0, y0, bw, R + q, c1, 0.4, -0.1, 0); P(x0 + 2 * q, y0 + q, 2 * q, q, c2);
    for (let i = q; i < bw - q; i += 2 * q) P(x0 + i, y0 + R + q, q, R - q + (((i / q) + fr) % 3) * q, shade(c1, 0.2));
  },
  squid(P, sp, L, R, cx, gy, fr, q) {
    const c1 = sp.c, c2 = sp.c2, bw = Math.round(R * 1.2), x0 = cx - (bw >> 1), y0 = gy - R * 2 - 2 * q;
    blob(P, x0, y0, bw, R + 2 * q, c1, 0.3, -0.2, 0); P(x0 + q, y0 + 2 * q, q, q, c2); P(x0 + bw - 2 * q, y0 + 2 * q, q, q, c2); P(x0 + q, y0 + 4 * q, q, q, '#140e10'); P(x0 + bw - 2 * q, y0 + 4 * q, q, q, '#140e10');
    for (let i = 0; i < bw; i += 2 * q) P(x0 + i, y0 + R + 2 * q, q, R - q + ((((i / q) >> 1) + fr) % 2) * q, shade(c1, -0.15));
  },
};
// Dibujo en el mundo: los pies del animal en su posición; los pequeños, algo más grandes
function drawAnimals(c, k, ox, oy, x0, y0, x1, y1) {
  const sm = c.imageSmoothingEnabled; c.imageSmoothingEnabled = false;
  for (const a of ANIMALS) {
    if (a.x < x0 * T - 80 || a.x > (x1 + 1) * T + 80 || a.y < y0 * T - 80 || a.y > (y1 + 1) * T + 80) continue;
    const sp = SPECIES[a.sp], spr = animalSprite(a.sp), vs = animVS(sp), w = spr.size * vs, h = spr.h * vs, feet = sp.s * 0.6 * vs;
    const bob = a.rest ? 0 : Math.sin(a.ph) * (sp.hop ? 3 : 0.6), fr = a.rest && !sp.fly ? 0 : (Math.floor(a.ph * 1.3) & 1);
    c.setTransform(k * a.face, 0, 0, k, ox + a.x * k, oy + (a.y - (sp.fly ? 8 : 0) - Math.abs(bob)) * k);
    if (!sp.fly && !sp.aq) { c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(0, feet, sp.s * 0.95 * vs, sp.s * 0.3 * vs, 0, 0, 7); c.fill(); }
    c.drawImage(spr.f[fr], -w / 2, feet - spr.gy * vs, w, h);
  }
  c.imageSmoothingEnabled = sm;
}
