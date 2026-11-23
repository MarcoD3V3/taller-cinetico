'use strict';
// =====================================================================================
//  Escalones de terraza y puentes de madera
//   · Escalones de terraza: se ponen al pie de una pared de tierra o piedra de 1 o 2 capas (en la casilla de
//     abajo, donde se ve la pared). Por ellos se sube y se baja andando, sin saltar y sin caerse. Se tallan
//     en la propia pared: peldaños de píxeles con luz arriba y sombra en la contrahuella.
//   · Puente de madera: va sobre el agua (no sobre lava ni ácido). Se cruza andando, sin nadar; tablones con
//     juntas, postes y sombra sobre el agua.
//  Los dos se quitan con clic izquierdo y se recuperan, como el resto de bloques de construcción.
// =====================================================================================
const ESC_CAT = BD.stoneBricks ? BD.stoneBricks.cat : (BD.woodPlatform ? BD.woodPlatform.cat : 3);
XB('escalonTerraza', { n: 'Escalones de terraza', cat: ESC_CAT, walk: 1, place: 'escalon', look: { c: '#8f8270', g: '', a: '' },
  d: 'Ponlos al pie de una pared de 1 o 2 capas: subes y bajas andando, sin saltar. Clic izquierdo para quitarlos (los recuperas).' });
XB('puenteMadera', { n: 'Puente de madera', cat: ESC_CAT, walk: 1, place: 'puente', look: { c: '#a07848', g: '', a: '' },
  d: 'Va sobre el agua: la cruzas andando, sin nadar. Pon varios seguidos para hacer un puente. Clic izquierdo para quitarlo (lo recuperas).' });
for (const id of ['escalonTerraza', 'puenteMadera']) if (!ITEMS[id]) ITEMS[id] = { n: BD[id].n, block: 1, cat: 4, d: BD[id].d };
try { RB('escalonTerraza', 2, 'stone', 'stone*2,stick', 0, 0); } catch (e) { console.warn(e); }
try { RB('puenteMadera', 2, 'planks', 'planks*2,stick*2', 0, 0); } catch (e) { console.warn(e); }

// Dibujo del bloque: en el inventario, un icono propio; en el mundo no dibuja nada aquí (lo hace dibEscalones/dibPuente
// encima del suelo, para que encaje con la pared o el agua)
if (typeof DRAW !== 'undefined') {
  DRAW.escalonTerraza = { k: () => '0', b: (c, b) => { if (b && b.x !== undefined && typeof at === "function" && at(b.x, b.y) === b) return;
    for (let i = 0; i < 4; i++) { c.fillStyle = ['#6a6258', '#7c7468', '#8f8676', '#a39a88'][i]; c.fillRect(-10, -10 + i * 5, 20, 5); c.fillStyle = '#c4baa6'; c.fillRect(-10, -10 + i * 5, 20, 1); }
    c.fillStyle = '#4a443c'; c.fillRect(-10, -10, 1, 20); c.fillRect(9, -10, 1, 20); } };
  DRAW.puenteMadera = { k: () => '0', b: (c, b) => { if (b && b.x !== undefined && typeof at === "function" && at(b.x, b.y) === b) return;
    c.fillStyle = '#3a6aa8'; c.fillRect(-10, -10, 20, 20);
    for (let i = 0; i < 5; i++) { c.fillStyle = i & 1 ? '#a07848' : '#b08654'; c.fillRect(-10 + i * 4, -7, 3, 14); c.fillStyle = '#c89a64'; c.fillRect(-10 + i * 4, -7, 3, 1); }
    c.fillStyle = '#6a4a2a'; c.fillRect(-10, -8, 20, 1); c.fillRect(-10, 7, 20, 1); } };
}
const _escAt = (tx, ty, tipo) => { const b = typeof at === 'function' ? at(tx, ty) : null; return !!(b && b.type === tipo); };
function escalonEn(px, py) { return _escAt(Math.floor(px / T), Math.floor(py / T), 'escalonTerraza'); }
function puenteEn(px, py) { return _escAt(Math.floor(px / T), Math.floor(py / T), 'puenteMadera'); }

// Dónde se pueden poner
{ const c0 = canPlace; canPlace = (type, x, y) => {
  if (type === 'escalonTerraza') { const d = lvAt(x, y - 1) - lvAt(x, y), g = GI[gnd(x, y)];
    if (at(x, y)) return 'Casilla ocupada'; if (g.liquid || g.solid) return 'Va sobre el suelo, al pie de una pared';
    if (d < 1 || d > 2 || esRocaM(x, y - 1)) return 'Va al pie de una pared de 1 o 2 capas (en la casilla de abajo)';
    if (invCount(type) <= 0) return 'No te quedan'; return null; }
  if (type === 'puenteMadera') { const g = GI[gnd(x, y)];
    if (at(x, y)) return 'Casilla ocupada'; if (g.liquid !== 'water') return 'Va sobre el agua';
    if (invCount(type) <= 0) return 'No te quedan'; return null; }
  return c0(type, x, y); }; }

// Sobre los escalones la pared no frena (se sube por ellos)
{ const p0 = paredEn; paredEn = (px, py) => escalonEn(px, py) ? null : p0(px, py); }

// ---------- Dibujo (en píxeles, encima del suelo y del agua, debajo de los personajes) ----------
const _escSc = (hex, f) => { const m = hex.match(/\w\w/g).map(v => parseInt(v, 16)); return `rgb(${Math.min(255, m[0] * f) | 0},${Math.min(255, m[1] * f) | 0},${Math.min(255, m[2] * f) | 0})`; };
function dibEscalones(ctx, b) {
  const X = b.x * T, Y = b.y * T, d = Math.max(1, lvAt(b.x, b.y - 1) - lvAt(b.x, b.y)), fh = Math.min(T - 2, faceH(d) + 3), n = d > 1 ? 5 : 3, sh = fh / n;
  const g = GI[gnd(b.x, b.y - 1)], piedra = !!(g && (g.rock || g.dot || rawLv(b.x, b.y - 1) > LV_FOOT)), base = piedra ? '#8c8478' : '#8a6a48';
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(X + 3, Y, T - 6, fh + 2);                        // hueco tallado en la pared
  for (let i = 0; i < n; i++) { const y0 = Y + Math.round(i * sh), h = Math.max(2, Math.round(sh)), f = 0.78 + (i / n) * 0.3; // de arriba (al fondo) a abajo (delante)
    ctx.fillStyle = _escSc(base, f * 0.82); ctx.fillRect(X + 4, y0, T - 8, h);                      // contrahuella
    ctx.fillStyle = _escSc(base, f * 1.12); ctx.fillRect(X + 4, y0, T - 8, 1);                      // huella con luz
    ctx.fillStyle = _escSc(base, f * 0.6); ctx.fillRect(X + 4, y0 + h - 1, T - 8, 1);               // sombra bajo el peldaño
    for (let q = 0; q < 3; q++) { ctx.fillStyle = _escSc(base, f * (0.7 + ihash(b.x * 13 + q, b.y + i) * 0.25)); ctx.fillRect(X + 6 + ((ihash(b.x + q, b.y * 7 + i) * (T - 14)) | 0), y0 + 1, 2, 1); } } // piedritas/vetas
  ctx.fillStyle = _escSc(base, 0.5); ctx.fillRect(X + 3, Y, 1, fh + 1); ctx.fillRect(X + T - 4, Y, 1, fh + 1); // laterales
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(X + 3, Y + fh + 1, T - 6, 2);                     // sombra al pie
}
function dibPuente(ctx, b) {
  const X = b.x * T, Y = b.y * T, horiz = !!(at(b.x - 1, b.y) && at(b.x - 1, b.y).type === 'puenteMadera') || !!(at(b.x + 1, b.y) && at(b.x + 1, b.y).type === 'puenteMadera');
  ctx.fillStyle = 'rgba(0,10,30,.28)'; ctx.fillRect(X + 2, Y + 4, T - 2, T - 2);                     // sombra sobre el agua
  const tab = 4;
  for (let i = 0; i < T / tab; i++) { const f = 0.9 + ihash(b.x * 9 + i, b.y) * 0.22;              // tablones
    ctx.fillStyle = _escSc('#a07848', f); if (horiz) ctx.fillRect(X + i * tab, Y + 3, tab - 1, T - 8); else ctx.fillRect(X + 3, Y + i * tab, T - 8, tab - 1);
    ctx.fillStyle = _escSc('#a07848', f * 1.2); if (horiz) ctx.fillRect(X + i * tab, Y + 3, tab - 1, 1); else ctx.fillRect(X + 3, Y + i * tab, T - 8, 1);
    ctx.fillStyle = _escSc('#a07848', 0.5); if (horiz) ctx.fillRect(X + i * tab + tab - 1, Y + 3, 1, T - 8); else ctx.fillRect(X + 3, Y + i * tab + tab - 1, T - 8, 1); }
  ctx.fillStyle = _escSc('#6a4a2a', 1);                                                            // vigas y postes
  if (horiz) { ctx.fillRect(X, Y + 2, T, 1); ctx.fillRect(X, Y + T - 5, T, 1); ctx.fillRect(X + 2, Y + T - 5, 3, 4); ctx.fillRect(X + T - 5, Y + T - 5, 3, 4); }
  else { ctx.fillRect(X + 2, Y, 1, T); ctx.fillRect(X + T - 5, Y, 1, T); ctx.fillRect(X + 2, Y + T - 4, 3, 3); ctx.fillRect(X + T - 5, Y + T - 4, 3, 3); }
}
if (typeof drawGroundDecor === 'function') { const d0 = drawGroundDecor; drawGroundDecor = (ctx, k, ox, oy, x0, y0, x1, y1) => {
  try { if (typeof _vis !== 'undefined') { const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    for (const b of _vis) { if (b.type === 'puenteMadera') dibPuente(ctx, b); else if (b.type === 'escalonTerraza') dibEscalones(ctx, b); }
    ctx.imageSmoothingEnabled = sm; } } catch (e) { console.warn(e); }
  return d0(ctx, k, ox, oy, x0, y0, x1, y1); }; }
