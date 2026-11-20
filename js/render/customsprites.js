'use strict';
// =====================================================================================
//  Sprites propios (PixelLab u otros programas). Si en la carpeta «sprites/» hay una imagen para
//  algo, el juego la usa en lugar de su dibujo; si no, se dibuja como siempre. Guía: sprites/LEEME.md
//   · sprites/jugador/…          tu personaje (abajo/arriba/izquierda/derecha o south/north/west/east)
//   · sprites/animales/<id>.png  animales, mascotas y monturas (mirando a la derecha)
//   · sprites/enemigos/<id>.png  enemigos y jefes (mirando a la derecha)
//   · sprites/bloques/<id>.png   bloques colocados (ocupa la casilla entera)
//   · sprites/objetos/<id>.png   iconos de objetos (inventario, barra, suelo)
//  <id> vale el código (wolf) o el nombre que sale en el juego (Lobo → lobo.png). Una imagen ancha
//  hecha de cuadros iguales (tira) se toma como animación. La lista de archivos (sprites/lista.json)
//  la escribe el servidor al arrancar (sprites-lista.js).
// =====================================================================================
const CSPR = { ready: false, sets: new Map(), n: 0, err: [] };
const _cslug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const CS_DIRS = { abajo: ['abajo', 'south', 'sur', 'down', 'frente', 's'], arriba: ['arriba', 'north', 'norte', 'up', 'espalda', 'n'], izquierda: ['izquierda', 'west', 'oeste', 'left', 'w', 'o'], derecha: ['derecha', 'east', 'este', 'right', 'e'] };
const CS_WALK = /^(caminar|andar|walk|walking|run|running|correr)/;
const CS_AV_H = 38; // alto (en el mundo) del personaje dibujado a escala 1.6, como el de serie
// ---------- Lienzos ----------
function csCanvas(w, h) { const c = mkCanvas(w, h); c.getContext('2d').imageSmoothingEnabled = false; return c; }
// Una imagen → sus cuadros (tira horizontal de cuadros cuadrados, o uno solo)
function csFrames(img) {
  const w = img.naturalWidth, h = img.naturalHeight, n = w > h && w % h === 0 ? w / h : 1, fw = w / n, out = [];
  for (let i = 0; i < n; i++) { const c = csCanvas(fw, h); c.getContext('2d').drawImage(img, i * fw, 0, fw, h, 0, 0, fw, h); out.push(c); }
  return out;
}
function csMirror(fr) { return fr.map(f => { const c = csCanvas(f.width, f.height), g = c.getContext('2d'); g.translate(f.width, 0); g.scale(-1, 1); g.drawImage(f, 0, 0); return c; }); }
// Caja de lo que se ve (sin el fondo transparente ni sombras suaves)
function csBox(cv, minA = 100) {
  const w = cv.width, h = cv.height; let d; try { d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data; } catch (e) { return { x: 0, y: 0, w, h }; }
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] >= minA) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? { x: 0, y: 0, w, h } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
function csUnion(frames) { let b = null; for (const f of frames) { const q = csBox(f, 24); if (!b) { b = { ...q }; continue; } const x1 = Math.max(b.x + b.w, q.x + q.w), y1 = Math.max(b.y + b.h, q.y + q.h); b.x = Math.min(b.x, q.x); b.y = Math.min(b.y, q.y); b.w = x1 - b.x; b.h = y1 - b.y; } return b; }
// ---------- Un «set»: cuadros por dirección (quieto + caminar) ----------
function csBuild(entries) {
  const dirs = {}, single = entries.find(e => !e.rest.length);
  for (const d in CS_DIRS) {
    const al = CS_DIRS[d]; let idle = null, strip = null; const seq = [];
    for (const e of entries) {
      const r = e.rest, L = r.length; if (!L) continue;
      const last = r[L - 1], walk = r.some(s => CS_WALK.test(s));
      if (al.includes(last)) { if (walk) strip = strip || e.fr; else idle = idle || e.fr; } // derecha.png · rotations/east.png · caminar/derecha.png
      else if (L >= 2 && al.includes(r[L - 2]) && walk) seq.push({ k: last, f: e.fr[0] }); // animations/walking/east/frame_000.png
    }
    seq.sort((a, b) => a.k < b.k ? -1 : a.k > b.k ? 1 : 0);
    const walkFr = seq.length ? seq.map(s => s.f) : strip || (idle && idle.length > 1 ? idle : null);
    if (idle || walkFr) dirs[d] = { idle: (idle || walkFr)[0], walk: walkFr || [idle[0]] };
  }
  if (single) for (const d in CS_DIRS) if (!dirs[d]) dirs[d] = { idle: single.fr[0], walk: single.fr };
  // Lo que falte: izquierda ↔ derecha en espejo; de frente y de espaldas, lo que haya
  const mir = s => s && { idle: csMirror([s.idle])[0], walk: csMirror(s.walk) };
  if (!dirs.izquierda && dirs.derecha) dirs.izquierda = mir(dirs.derecha);
  if (!dirs.derecha && dirs.izquierda) dirs.derecha = mir(dirs.izquierda);
  const any = dirs.abajo || dirs.derecha || dirs.arriba || dirs.izquierda; if (!any) return null;
  for (const d in CS_DIRS) if (!dirs[d]) dirs[d] = d === 'arriba' ? (dirs.abajo || any) : d === 'abajo' ? (dirs.arriba || any) : any;
  const all = []; for (const d in dirs) all.push(dirs[d].idle, ...dirs[d].walk);
  return { dirs, box: csUnion(all), raw: (single || entries[0]).fr[0] };
}
// ---------- Carga ----------
async function csLoad() {
  let list; try { const r = await fetch('sprites/lista.json', { cache: 'no-cache' }); if (!r.ok) return; list = await r.json(); } catch (e) { return; }
  const files = (list && list.files) || []; if (!files.length) return;
  const groups = new Map();
  await Promise.all(files.map(([path, v]) => new Promise(res => {
    const img = new Image(); img.onload = () => {
      const segs = path.replace(/\.[a-z0-9]+$/i, '').split('/').map(_cslug), folder = segs[0];
      const base = folder === 'jugador' ? 'jugador' : folder + '/' + segs[1], rest = segs.slice(folder === 'jugador' ? 1 : 2);
      if (!groups.has(base)) groups.set(base, []); groups.get(base).push({ rest, fr: csFrames(img) }); res();
    };
    img.onerror = () => { CSPR.err.push(path); res(); };
    img.src = 'sprites/' + path.split('/').map(encodeURIComponent).join('/') + '?v=' + (v || 0);
  })));
  for (const [base, ent] of groups) { try { const s = csBuild(ent); if (s) CSPR.sets.set(base, s); } catch (e) { console.warn('Sprite', base, e); } }
  CSPR.n = CSPR.sets.size; CSPR.ready = CSPR.n > 0; if (!CSPR.ready) return;
  // Bloques con dibujo propio: sin la capa animada de serie (engranajes, luces…), que iría encima de tu imagen
  if (typeof DRAW !== 'undefined') for (const t in DRAW) if (csBlock(t)) DRAW[t].a = () => { };
  csRefresh();
  if (CSPR.err.length) console.warn('Sprites que no se pudieron abrir:', CSPR.err);
}
// Se rehacen los dibujos guardados en caché para que salgan las imágenes nuevas
function csRefresh() {
  try { _base.clear(); _items.clear(); _icons.clear(); bchunks.clear(); _csFit.clear(); } catch (e) { }
  try { if (typeof blocks !== 'undefined') for (const b of blocks) if (b) b._spr = null; if (typeof markAll === 'function' && typeof S !== 'undefined' && S) markAll(); } catch (e) { }
  try { if (typeof buildAtlas === 'function') buildAtlas(); if (typeof invVersion !== 'undefined') invVersion++; } catch (e) { }
}
// ---------- Buscar el sprite de algo (por código o por nombre) ----------
const csGet = (folder, ...names) => { if (!CSPR.ready) return null; for (const n of names) { if (!n) continue; const s = CSPR.sets.get(folder + '/' + _cslug(n)); if (s) return s; } return null; };
const csBlock = t => csGet('bloques', t, BD[t] && BD[t].n);
const csItem = id => csGet('objetos', id, ITEMS[id] && ITEMS[id].n) || (BD[id] ? csBlock(id) : null);
let _csFoeIds = null;
function csFoeId(D) {
  if (!_csFoeIds) { _csFoeIds = new Map(); for (const T2 of [typeof ENEMIES !== 'undefined' && ENEMIES, typeof BOSSES !== 'undefined' && BOSSES]) if (T2) for (const k in T2) _csFoeIds.set(T2[k], k); }
  return _csFoeIds.get(D);
}
// Mete los cuadros del sprite dentro de la caja de lo que se veía antes (mismo tamaño de lienzo):
// así todo lo demás del juego (sombras, choques, barras de vida) sigue igual.
const _csFit = new Map();
function csFit(key, orig, set, frames) {
  let out = _csFit.get(key); if (out) return out;
  const ob = csBox(orig), bb = set.box, s = Math.min(ob.w / bb.w, ob.h / bb.h), dw = bb.w * s, dh = bb.h * s;
  out = frames.map(f => { const c = csCanvas(orig.width, orig.height); c.getContext('2d').drawImage(f, bb.x, bb.y, bb.w, bb.h, ob.x + (ob.w - dw) / 2, ob.y + ob.h - dh, dw, dh); return c; });
  _csFit.set(key, out); return out;
}
// Icono: lo que se ve de la imagen, centrado en una caja de lado «r»
function csIcon(c, set, r) { const b = csBox(set.raw, 24), s0 = r / Math.max(b.w, b.h), s = s0 >= 1 ? Math.floor(s0) : s0, // escala entera: píxeles iguales y nítidos
  sm =c.imageSmoothingEnabled; c.imageSmoothingEnabled = false; c.drawImage(set.raw, b.x, b.y, b.w, b.h, -b.w * s / 2, -b.h * s / 2, b.w * s, b.h * s); c.imageSmoothingEnabled = sm; }
// ---------- Enganches ----------
{ const b0 = blockSprite; blockSprite = b => {
  const set = b && csBlock(b.type); if (!set) return b0(b);
  const k = 'B|' + b.type; let c = _csFit.get(k);
  if (!c) { c = csCanvas(40 * SPR_S, 40 * SPR_S); const q = SPR_S; c.getContext('2d').drawImage(set.raw, 4 * q, 4 * q, 32 * q, 32 * q); _csFit.set(k, c); }
  return c;
}; }
{ const d0 = drawBlockIcon; drawBlockIcon = (c, id) => { const set = csItem(id); if (set) return csIcon(c, set, 34); return d0(c, id); }; }
// Motor píxel: los objetos con sprite propio se dibujan en el mundo sin suavizado, desde la imagen original
// (no desde una copia reescalada), así sus píxeles salen nítidos y del mismo tamaño que los del personaje.
{ const d0 = drawItem; drawItem = (c, id, x, y, s) => {
  const set = !BD[id] && csItem(id); if (!set) return d0(c, id, x, y, s);
  const im = set.raw, sm = c.imageSmoothingEnabled, sz = s * 1.25; c.imageSmoothingEnabled = false;
  c.drawImage(im, x - sz / 2, y - sz / 2, sz, sz * im.height / im.width); c.imageSmoothingEnabled = sm;
}; }
{ const d0 = drawItemPath; drawItemPath = (c, id, s) => { const set = csItem(id); if (set) return csIcon(c, set, s * 1.15); return d0(c, id, s); }; }
{ const a0 = animalSprite; animalSprite = id => {
  const s = a0(id), sp = SPECIES[id], set = csGet('animales', id, sp && sp.n); if (!set) return s;
  const d = set.dirs.derecha, fr = d.walk.length > 1 ? [d.walk[0], d.walk[1]] : [d.idle, d.idle];
  const key = 'A|' + id; let o = _csFit.get(key + '|o');
  if (!o) { o = { ...s, f: csFit(key, s.f[0], set, fr) }; _csFit.set(key + '|o', o); }
  return o;
}; }
{ const f0 = foeSprite; foeSprite = D => {
  const s = f0(D), set = csGet('enemigos', csFoeId(D), D && D.n); if (!set) return s;
  return csFit('F|' + (csFoeId(D) || D.n), s, set, [set.dirs.derecha.idle])[0];
}; }
// Tu personaje (también en el inventario, la ficha y las estelas). Los demás jugadores y aldeanos, como siempre.
{ const v0 = drawAvatar; drawAvatar = (ctx, look, equip, x, y, ang, walk, moving, sc = 2, held, swing) => {
  const set = CSPR.ready && CSPR.sets.get('jugador');
  let me = false; try { me = !!set && typeof S !== 'undefined' && S && S.char && look === S.char.look; } catch (e) { }
  if (!me) return v0(ctx, look, equip, x, y, ang, walk, moving, sc, held, swing);
  const ca = Math.cos(ang || 0), sa = Math.sin(ang || 0);
  const d = set.dirs[Math.abs(ca) > 0.7 ? (ca > 0 ? 'derecha' : 'izquierda') : (sa > 0 ? 'abajo' : 'arriba')];
  const n = d.walk.length, ph = ((walk || 0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  const f = moving && n > 1 ? d.walk[Math.floor(ph / (Math.PI * 2) * n) % n] : d.idle;
  const bb = set.box, k = CS_AV_H * sc / 1.6 / bb.h, w = bb.w * k, h = bb.h * k;
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  if (held && AV_PASS !== 1 && sa < -0.3) drawItem(ctx, held, x + ca * w * 0.35, y - h * 0.45, 12 * sc / 1.6); // mirando hacia arriba: el objeto queda detrás
  if (AV_PASS !== 2) ctx.drawImage(f, bb.x, bb.y, bb.w, bb.h, x - w / 2, y + 3 - h, w, h); // los pies, donde los del dibujo de serie
  if (held && AV_PASS !== 1 && sa >= -0.3) { ctx.save(); ctx.translate(x + ca * w * 0.38, y - h * 0.42); ctx.rotate((swing || 0) * (ca >= 0 ? 1 : -1)); drawItem(ctx, held, 0, 0, 12 * sc / 1.6); ctx.restore(); }
  ctx.imageSmoothingEnabled = sm;
}; }
// Árboles propios: sprites/arboles/<nombre>.png, o <nombre>_1.png, <nombre>_2.png… (variantes; Roble → roble_1.png).
// Escala: 1 píxel de la imagen = 1,6 unidades del mundo, el mismo píxel grande del personaje (un árbol de
// 2×3 casillas mide unos 40×60 píxeles), sin suavizado. La parte de abajo de la imagen (sombra incluida)
// va donde nace el árbol de serie.
const CS_TREE_PX = 1.6, _csTreeImgs = new Map(), _csTreeSpr = new Map();
function csTreeImgs(t) {
  if (!CSPR.ready) return null; if (_csTreeImgs.has(t)) return _csTreeImgs.get(t);
  const g = GI[t], n = g && _cslug(g.n), L = [];
  if (n) { const one = csGet('arboles', n); if (one) L.push(one.raw); for (let i = 1; i <= 8; i++) { const s = csGet('arboles', n + '_' + i); if (s) L.push(s.raw); } }
  const r = L.length ? L : null; _csTreeImgs.set(t, r); return r;
}
{ const t0 = treeSprite; treeSprite = (t, v, size) => {
  const imgs = csTreeImgs(t); if (!imgs) return t0(t, v, size);
  const key = t * 16 + v * 4 + size; let s = _csTreeSpr.get(key); if (s) return s;
  const im = imgs[v % imgs.length], b = csBox(im, 100), k = [0.62, 0.78, 0.9, 1][size] || 1; // talado a medias: más pequeño
  // El lienzo va a la escala de la imagen (1 píxel = 1,6 unidades): se amplía al dibujar, sin suavizado y sin deformar
  const S2 = CS_TREE_PX * k, cw = Math.ceil(TREE_W / S2), ch = Math.ceil(TREE_H / S2), cv = csCanvas(cw, ch), c = cv.getContext('2d');
  c.drawImage(im, b.x, b.y, b.w, b.h, Math.round(TREE_AX / S2 - b.w / 2), Math.round((TREE_AY + 6) / S2) - b.h, b.w, b.h);
  s = { cv, k }; _csTreeSpr.set(key, s); return s;
}; }
csLoad();
