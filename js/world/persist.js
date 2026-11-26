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
  const c = newChunk(cx, cy); unrle(a[0], c.g); unrle(a[1], c.t); if (a[2]) t16Fix(c); c.seen = 1; computeChunkBiomes(c);
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
  CHARCH.clear(); try { const d = JSON.parse(str); for (const [cx, cy, g, t] of d.ar || []) CHARCH.set(ckey(cx, cy), d.t16 ? [g, t] : [g, t, 1]); /* 1 = guardado antes de los 16 bits: se repara al cargarlo */ } catch (e) { }
  _chLoading = true; try { return d0(str); } finally { _chLoading = false; }
}; }
// Mundo nuevo: archivo vacío
{ const w0 = worldReset; worldReset = () => { if (!_chLoading) CHARCH.clear(); w0(); }; }
// ---------- Reparar partidas guardadas con el suelo en 8 bits ----------
// Antes el tipo de suelo se guardaba en 8 bits y los tipos por encima de 255 (suelo y roca de las cuevas, pozos,
// mazmorras…) se guardaban como tipo − 256: el pozo salía como «Pozo de petróleo» y las cuevas con menas raras.
// Al cargar una partida de antes se recuperan: en las cuevas se compara con lo que genera el mundo; en la superficie,
// un «petróleo» que tiene hoyo cavado era un pozo.
function t16Fix(c) {
  const maxW = GI.length - 256; if (maxW <= 0) return;
  const y0 = c.cy * CS, k = typeof layerOf === 'function' ? layerOf(y0 + 16) : 0;
  const esp = (typeof dgChunk === 'function' && dgChunk(c)) || (typeof flChunk === 'function' && flChunk(c));
  if (esp) { for (let i = 0; i < c.g.length; i++) { const v = c.g[i]; if (v < maxW && /^(DG|FLOOR_AIR)/.test(GI[v + 256].key || '')) c.g[i] = v + 256; } return; }
  if (!k) { for (let i = 0; i < c.g.length; i++) if (c.g[i] === G.OIL) { const x = c.cx * CS + (i & CMASK), y = y0 + (i >> CSH); if (depthAt(x, y) > 0) c.g[i] = G.SHAFT; } return; }
  const tmp = newChunk(c.cx, c.cy); try { genCaveChunk(tmp, k); } catch (e) { return; }
  const puestos = new Set(Object.values(GROUND_PLACE).map(n => G[n])); for (const g of GI) if (g.u >= 0) puestos.add(g.u);
  for (let i = 0; i < c.g.length; i++) { const v = c.g[i]; if (v >= maxW) continue; const gen = tmp.g[i];
    if (gen === v) continue; if (gen === v + 256) { c.g[i] = gen; continue; }
    const gi = GI[v]; if (!puestos.has(v) && !gi.liquid) c.g[i] = v + 256; } // cambiado por el jugador: lo que no se puede poner a mano era de las cuevas
}
