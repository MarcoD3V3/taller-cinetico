'use strict';
// =====================================================================================
//  «Cómo se consigue» completo en la ficha del objeto: además de recetas, máquinas,
//  animales y enemigos, dice en qué biomas crece o aparece cada planta, árbol o mena,
//  qué jefe lo suelta (y con qué se le llama), dónde se pesca, qué sale del suelo
//  (flores, ramitas…) y las semillas que da la hierba alta.
// =====================================================================================
const SRC_WATER_N = { fresh: 'ríos y lagos', sea: 'mar', warm: 'aguas cálidas', cold: 'aguas frías', deep: 'aguas profundas', swamp: 'pantano' };
let _tileBio = null;
// Casilla → biomas donde aparece (plantas, árboles y suelo propio del bioma)
function tileBiomes() {
  if (_tileBio) return _tileBio; _tileBio = {};
  const add = (k, b) => { if (!k) return; (_tileBio[k] || (_tileBio[k] = new Set())).add(b.n); };
  for (const b of BIOMES) { if (!b || !b.n) continue; for (const [k] of b.plants || []) add(k, b); for (const [k] of b.trees || []) add(k, b); for (const [k] of b.alt || []) add(k, b); add(b.g, b); }
  return _tileBio;
}
{ const i0 = icIndex; icIndex = () => {
  const X = i0(); if (X._more) return X; X._more = 1; const add = (id, v) => { if (ITEMS[id]) (X.src[id] || (X.src[id] = [])).push(v); };
  if (typeof BOSSES !== 'undefined') for (const k in BOSSES) { const B = BOSSES[k]; for (const d of B.drops || []) add(d[0], { k: 'boss', b: k }); if (B.seal) add(B.seal, { k: 'boss', b: k }); }
  if (typeof FISH_TABLE !== 'undefined') for (const id in FISH_TABLE) add(id, { k: 'fish', w: Object.keys(FISH_TABLE[id].w || {}), tier: FISH_TABLE[id].tier, night: FISH_TABLE[id].nightOnly });
  if (typeof DECOR_PICK !== 'undefined') { const by = {}; for (const k in DECOR_PICK) (by[DECOR_PICK[k][0]] || (by[DECOR_PICK[k][0]] = [])).push(DECOR_PICK[k][1]); for (const id in by) add(id, { k: 'decor', n: by[id] }); }
  if (typeof CROP !== 'undefined') for (const c in CROP) add(CROP[c].seed, { k: 'grass', common: c === 'wheat' });
  add('depletedRod', { k: 'note', t: 'Sale del reactor al gastarse una barra de combustible' });
  return X;
}; }
function itemWaysMore(id) {
  const X = icIndex(), src = X.src[id] || [], out = [], TB = tileBiomes();
  // Biomas de las casillas de donde sale (plantas silvestres, árboles, menas de superficie)
  const bios = new Set(); for (const s of src) if (s.k === 'tile' && TB[s.g.key]) for (const n of TB[s.g.key]) bios.add(n);
  if (bios.size) out.push(`<div class="icw"><b>📍 Dónde</b> ${esc([...bios].slice(0, 6).join(' · '))}${bios.size > 6 ? ' …' : ''}</div>`);
  const bosses = [...new Set(src.filter(s => s.k === 'boss').map(s => s.b))];
  for (const b of bosses.slice(0, 3)) { const B = BOSSES[b], call = B.item && ITEMS[B.item[0]]; out.push(`<div class="icw"><b>Jefe</b> ${esc(B.n)}${call ? ` <span class="mut">(se le llama con</span> ${icIco(B.item[0])}<span class="mut">)</span>` : B.final ? ' <span class="mut">(el jefe final)</span>' : ''}</div>`); }
  const fish = src.find(s => s.k === 'fish'); if (fish) out.push(`<div class="icw"><b>Pescar</b> ${esc(fish.w.map(w => SRC_WATER_N[w] || w).join(', '))}${fish.tier ? ' <span class="mut">(caña de hierro o mejor)</span>' : ''}${fish.night ? ' <span class="mut">(de noche)</span>' : ''}</div>`);
  const dec = src.find(s => s.k === 'decor'); if (dec) out.push(`<div class="icw"><b>Del suelo</b> ${esc(dec.n.slice(0, 4).join(' · '))} <span class="mut">(clic para recoger)</span></div>`);
  const gr = src.find(s => s.k === 'grass'); if (gr) out.push(`<div class="icw"><b>Hierba alta</b> <span class="mut">${gr.common ? 'a menudo al romperla' : 'a veces al romperla, en su bioma'}</span></div>`);
  for (const s of src.filter(s => s.k === 'note')) out.push(`<div class="icw">${esc(s.t)}</div>`);
  return out;
}
{ const c0 = itemCardHTML; itemCardHTML = (id, have) => {
  let h = c0(id, have); const more = itemWaysMore(typeof qBase === 'function' ? qBase(id) : id); if (!more.length) return h;
  h = h.replace('<div class="icw mut">Se encuentra explorando o comerciando.</div>', '');
  return h + more.join('');
}; }
