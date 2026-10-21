'use strict';
// =====================================================================================
//  Mundo estable: cada chunk que ya se generó se guarda tal cual, aunque no lo hayas tocado.
//  Así, al reabrir el mundo (o tras una actualización del juego que cambie el generador),
//  lo explorado sigue idéntico; solo lo nunca visto se genera nuevo.
//  CHARCH guarda, comprimido (RLE), los chunks explorados que se descargaron de memoria.
// =====================================================================================
const CHARCH = new Map(); // clave del chunk → [suelo, golpes] en RLE
// Generar: si ya existe en el archivo, se restaura en vez de generarse otra vez
{ const g0 = genChunk; genChunk = (cx, cy) => {
  const k = ckey(cx, cy), a = CHARCH.get(k); if (!a) { const c = g0(cx, cy); c.seen = 1; return c; }
  const c = newChunk(cx, cy); unrle(a[0], c.g); unrle(a[1], c.t); c.seen = 1; computeChunkBiomes(c);
  WORLD.set(k, c); onChunkGen(c); return c;
}; }
// Al descargarse un chunk explorado sin cambios, pasa al archivo (los modificados no se descargan)
{ const u0 = onChunkUnload; onChunkUnload = c => { if (!c.mod) CHARCH.set(ckey(c.cx, c.cy), [rle(c.g), rle(c.t)]); u0(c); }; }
// Guardar: además de los chunks modificados, todo lo explorado («ar»)
{ const s0 = serialize; serialize = () => {
  const d = JSON.parse(s0()), ar = [];
  for (const c of WORLD.values()) if (!c.mod) ar.push([c.cx, c.cy, rle(c.g), rle(c.t)]);
  for (const [k, a] of CHARCH) { if (!WORLD.has(k)) { const [cx, cy] = ckeyXY(k); ar.push([cx, cy, a[0], a[1]]); } }
  d.ar = ar; return JSON.stringify(d);
}; }
// Cargar: primero se llena el archivo y luego se carga el mundo como siempre
// (cargar llama a worldReset por dentro: mientras carga, el archivo no se vacía)
let _chLoading = false;
{ const d0 = deserialize; deserialize = str => {
  CHARCH.clear(); try { const d = JSON.parse(str); for (const [cx, cy, g, t] of d.ar || []) CHARCH.set(ckey(cx, cy), [g, t]); } catch (e) { }
  _chLoading = true; try { return d0(str); } finally { _chLoading = false; }
}; }
// Mundo nuevo: archivo vacío
{ const w0 = worldReset; worldReset = () => { if (!_chLoading) CHARCH.clear(); w0(); }; }
