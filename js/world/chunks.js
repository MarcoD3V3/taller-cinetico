'use strict';
// Mundo infinito por chunks de 32×32 casillas. Cada chunk se genera bajo demanda a partir de la
// semilla (determinista), y se descarta de memoria cuando está lejos y nadie lo ha modificado.
// Los chunks con bloques o cambios (y sus vecinos) se quedan cargados y se guardan.
const CS = 32, CSH = 5, CMASK = 31;
const WORLD = new Map();
const ckey = (cx, cy) => (cx + 32768) * 65536 + (cy + 32768);
const ckeyXY = k => [Math.floor(k / 65536) - 32768, (k % 65536) - 32768];
let _lk = -1, _lc = null;
let onChunkGen = () => { }, onChunkUnload = () => { };

function peekChunk(cx, cy) {
  const k = ckey(cx, cy); if (k === _lk) return _lc;
  const c = WORLD.get(k); if (c) { _lk = k; _lc = c; } return c || null;
}
function getChunk(cx, cy) { return peekChunk(cx, cy) || genChunk(cx, cy); }
function at(x, y) { const c = peekChunk(x >> CSH, y >> CSH); return c && c.b ? c.b[((y & CMASK) << CSH) | (x & CMASK)] : null; }
function gnd(x, y) { return getChunk(x >> CSH, y >> CSH).g[((y & CMASK) << CSH) | (x & CMASK)]; }
function treeHp(x, y) { return getChunk(x >> CSH, y >> CSH).t[((y & CMASK) << CSH) | (x & CMASK)]; }
function setGround(x, y, t, hp = 0) {
  const c = getChunk(x >> CSH, y >> CSH), i = ((y & CMASK) << CSH) | (x & CMASK);
  c.g[i] = t; c.t[i] = hp; c.mod = true; onTileChange(x, y, false);
}
// Picar vegetación u otras casillas con usos limitados: al agotarse se convierte en su suelo
function damageTile(x, y) {
  const c = getChunk(x >> CSH, y >> CSH), i = ((y & CMASK) << CSH) | (x & CMASK), g = GI[c.g[i]];
  if (!g.hp) return;
  if (!c.t[i]) c.t[i] = g.hp; // casillas de partidas antiguas: empiezan con sus golpes completos
  c.mod = true; if (--c.t[i] <= 0) { c.g[i] = g.u >= 0 ? g.u : G.GRASS; c.t[i] = GI[c.g[i]].hp || 0; } onTileChange(x, y, false);
}
const damageTree = damageTile;
function biomeOf(x, y) { const c = peekChunk(x >> CSH, y >> CSH); return c ? c.bio[((y & CMASK) << CSH) | (x & CMASK)] : biomeAt(x, y); }
function setBlockAt(x, y, b) {
  const c = getChunk(x >> CSH, y >> CSH), i = ((y & CMASK) << CSH) | (x & CMASK);
  if (!c.b) c.b = new Array(CS * CS).fill(null);
  if (c.b[i] && !b) c.nb--; else if (!c.b[i] && b) c.nb++;
  c.b[i] = b;
}
function newChunk(cx, cy) { return { cx, cy, g: new Uint8Array(CS * CS), t: new Uint8Array(CS * CS), bio: new Uint8Array(CS * CS), b: null, nb: 0, mod: false }; }
function genChunk(cx, cy) {
  const c = newChunk(cx, cy);
  genChunkTiles(c);
  WORLD.set(ckey(cx, cy), c); onChunkGen(c);
  return c;
}
// Un chunk se puede descargar si ni él ni sus 8 vecinos tienen bloques o cambios
function chunkPinned(cx, cy) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const c = WORLD.get(ckey(cx + dx, cy + dy)); if (c && (c.mod || c.nb > 0)) return true;
  }
  return false;
}
// Genera por adelantado los chunks cercanos (poco a poco) y libera los lejanos
let _maintT = 0;
function chunkMaintenance(px, py, radius, dt) {
  const pcx = Math.floor(px / T / CS), pcy = Math.floor(py / T / CS);
  let budget = WORLD.size < 9 ? 9 : 1; // al principio carga de golpe; luego 1 por fotograma
  for (let r = 0; r <= radius && budget > 0; r++) for (let dy = -r; dy <= r && budget > 0; dy++) for (let dx = -r; dx <= r && budget > 0; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    if (!WORLD.has(ckey(pcx + dx, pcy + dy))) { genChunk(pcx + dx, pcy + dy); budget--; }
  }
  _maintT += dt; if (_maintT < 2) return; _maintT = 0;
  const keep = radius + 3;
  for (const [k, c] of WORLD) {
    if (Math.abs(c.cx - pcx) <= keep && Math.abs(c.cy - pcy) <= keep) continue;
    if (c.mod || c.nb > 0 || chunkPinned(c.cx, c.cy)) continue;
    WORLD.delete(k); if (k === _lk) { _lk = -1; _lc = null; } onChunkUnload(c);
  }
}

// La generación del terreno y los biomas están en world/biomes.js

// ---------- Profundidad de los hoyos ----------
// Cada golpe que saca tierra, arena, grava… suma 1; cada bloque de suelo que pones resta 1.
// Así, para tapar un hoyo hacen falta tantos bloques como sacaste.
const dkey = (x, y) => x + ',' + y;
function depthAt(x, y) { return (S && S.depth && S.depth[dkey(x, y)]) || 0; }
function setDepth(x, y, d) { const D = S.depth || (S.depth = {}), k = dkey(x, y); if (d > 0) D[k] = Math.min(250, d); else delete D[k]; onTileChange(x, y, false); }
