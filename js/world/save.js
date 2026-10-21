'use strict';
// Guardado compacto: solo se guardan los chunks modificados (suelo y árboles en RLE);
// el resto se regenera igual a partir de la semilla. Los bloques se guardan sin datos derivados.
const SAVE_KEY = 'taller-cinetico-v3';
const SKIP = new Set(['comp', 'f', 'rpm', 'angle', 'phase', 'powered', 'pv', 'genOn', 'net', 'mask', 'io', 'flowT', 'no', 'lit', '_spr', '_tv', 'tang', 'spin', 'kick', 'rcp', 'ep', '_c', 'log', 'pulse', 'tcd', 'aim', 'lastP']);
function rle(arr) { let s = '', i = 0; while (i < arr.length) { const v = arr[i]; let n = 1; while (i + n < arr.length && arr[i + n] === v && n < 9999) n++; s += v.toString(36) + (n > 1 ? '*' + n : '') + ','; i += n; } return s; }
function unrle(s, out) { let i = 0; for (const p of s.split(',')) { if (!p) continue; const [v, n] = p.split('*'); const val = parseInt(v, 36), c = n ? +n : 1; for (let k = 0; k < c; k++) out[i++] = val; } }
function serialize() {
  const bs = blocks.map(b => { const o = {}; for (const k in b) if (!SKIP.has(k)) o[k] = b[k]; return o; });
  const ch = []; for (const c of WORLD.values()) if (c.mod) ch.push([c.cx, c.cy, rle(c.g), rle(c.t)]);
  const { _sortPending, ...rest } = S;
  return JSON.stringify({ ...rest, ch, seen: [...MAPT.keys()], bs });
}
function deserialize(str) {
  const d = JSON.parse(str); if (!d || d.v !== 3) return false;
  const { ch, seen, bs, ...rest } = d;
  S = { ...rest, gen: { ...GEN_DEFAULT, ...rest.gen } };
  WORLD.clear(); _lk = -1; _lc = null; blocks = [];
  worldReset();
  for (const [cx, cy, g, t] of ch) { const c = newChunk(cx, cy); unrle(g, c.g); unrle(t, c.t); c.mod = true; computeChunkBiomes(c); WORLD.set(ckey(cx, cy), c); onChunkGen(c); }
  for (const o of bs) { if (!BD[o.type]) continue; const b = makeB(o.type, o.x, o.y, o.dir); Object.assign(b, o); setBlockAt(b.x, b.y, b); blocks.push(b); }
  for (const b of blocks) mapPixel(b.x, b.y);
  if (seen) queueMapTiles(seen);
  markAll(); return true;
}
// ---------- Varias partidas ----------
// Índice: lista de mundos con sus datos resumidos. Cada mundo se guarda en su propia clave.
const IDX_KEY = 'taller-worlds-v1', WKEY = id => 'taller-world-' + id;
let currentWorld = null;
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { } }
function worldIndex() { try { return JSON.parse(lsGet(IDX_KEY)) || []; } catch (e) { return []; } }
function saveIndex(list) { return lsSet(IDX_KEY, JSON.stringify(list)); }
const newWorldId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function indexEntry(id, data) {
  return { id, name: S.name, seed: S.gen.seed, created: S.created || Date.now(), played: Date.now(), tier: S.tier, sandbox: !!S.sandbox, blocks: blocks.length, kb: Math.round(data.length / 1024) };
}
function saveGame(quiet) {
  if (!S || !currentWorld) return false;
  const data = serialize(), ok = lsSet(WKEY(currentWorld), data);
  const list = worldIndex(), i = list.findIndex(w => w.id === currentWorld), e = indexEntry(currentWorld, data);
  if (i >= 0) { e.created = list[i].created; list[i] = e; } else list.unshift(e);
  saveIndex(list);
  if (!quiet) toast(ok ? 'Partida guardada' : 'No se pudo guardar: el navegador no permite guardar o está lleno');
  return ok;
}
function loadWorld(id) {
  const s = lsGet(WKEY(id)); if (!s) return false;
  try { if (!deserialize(s)) return false; } catch (e) { console.warn(e); return false; }
  currentWorld = id; return true;
}
function deleteWorld(id) { lsDel(WKEY(id)); saveIndex(worldIndex().filter(w => w.id !== id)); }
// La partida de la versión anterior (una sola) pasa a ser un mundo más de la lista
function migrateOldSave() {
  const old = lsGet(SAVE_KEY); if (!old) return;
  try {
    const d = JSON.parse(old), id = newWorldId();
    if (lsSet(WKEY(id), old)) {
      const list = worldIndex();
      list.unshift({ id, name: d.name || 'Mundo anterior', seed: d.gen && d.gen.seed, created: Date.now(), played: Date.now(), tier: d.tier || 0, blocks: (d.bs || []).length, kb: Math.round(old.length / 1024) });
      saveIndex(list); lsDel(SAVE_KEY);
    }
  } catch (e) { console.warn(e); }
}
