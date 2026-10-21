'use strict';
// =====================================================================================
//  Recetario inteligente: en la ficha de cada objeto, un «plan de fabricación» que dice
//  qué te falta y de dónde sale (árbol de ingredientes), si necesitas mesa o máquina y si
//  la tienes, y botones para fabricarlo ya, abrir el banco más cercano con la receta puesta
//  o fabricar en cadena los ingredientes intermedios que se puedan hacer en el bolsillo.
// =====================================================================================
const distT = b => Math.round(Math.hypot(b.x * T + 16 - S.player.x, b.y * T + 16 - S.player.y) / T);
function nearestOf(type) { if (dirty.lists) rebuildLists(); let best = null, bd = 1e9; for (const b of L[type] || []) { const d = distT(b); if (d < bd) { bd = d; best = b; } } return best ? { b: best, d: bd, n: (L[type] || []).length } : null; }
// Máquinas que hacen una receta (bloques que la llevan dentro)
function machineBlocksFor(k) { const m = machInfo()[k]; return m ? m.blocks : []; }
// De dónde sale un objeto, en una línea (con enlaces)
function sourceLine(id) {
  const out = [], r = RECIPE_FOR[id];
  if (r) out.push(r.tier > S.tier ? `🔒 banco (nivel ${r.tier + 1})` : pocketOK(r) ? (crTimes(r) > 0 ? '<span class="good">✓ se fabrica en el bolsillo</span>' : '🎒 bolsillo') : `🔧 banco${r.rpm ? ' ≥' + r.rpm + ' RPM' : ''}`);
  for (const k in RECIPES) if (RECIPES[k].some(rc => rc.out && rc.out[id])) { const bl = machineBlocksFor(k), have = bl.some(t => (L[t] || []).length); out.push(`<span class="tag2 ${have ? 'okm' : ''}" data-sec="m:${k}">${have ? '✓ ' : ''}${esc(MACHINE_NAME[k] || k)}</span>`); if (out.length > 3) break; }
  const tile = GI.find(g => g.drop === id); if (tile) out.push(`⛏ ${esc(tile.n)}`);
  const an = Object.values(SPECIES).find(s => s.drops.some(d => d[0] === id)); if (an) out.push(`🐾 ${esc(an.n)}`);
  return out.length ? out.join(' · ') : '<span class="mut">se encuentra en el mundo</span>';
}
// Árbol de lo que falta (2 niveles)
function missTree(need, times, depth) {
  let h = '';
  for (const id in need) {
    const want = need[id] * times, have = invCount(id); if (have >= want) continue;
    const r = RECIPE_FOR[id], sub = depth < 2 && r && r.tier <= S.tier ? missTree(benchNeed(r), Math.ceil((want - have) / r.n), depth + 1) : '';
    h += `<li><span class="ib lack" data-id="${id}" data-go="${id}">${itemImg(id, 20)}</span> <b>${want - have}</b> ${esc(ITEMS[id].n)} <span class="small">← ${sourceLine(id)}</span>${sub ? `<ul>${sub}</ul>` : ''}</li>`;
  }
  return h;
}
// ¿Se puede conseguir todo en el bolsillo, fabricando lo intermedio? (simulado)
function chainPossible(id, n, depth = 0, pool = null) {
  pool = pool || {}; const have = () => invCount(id) + (pool[id] || 0);
  if (have() >= n) { pool[id] = (pool[id] || 0) - n; return true; }
  if (depth > 4) return false; const r = RECIPE_FOR[id]; if (!r || r.tier > S.tier || !pocketOK(r)) return false;
  const times = Math.ceil((n - have()) / r.n), need = benchNeed(r);
  for (const k in need) if (!chainPossible(k, need[k] * times, depth + 1, pool)) return false;
  pool[id] = (pool[id] || 0) + times * r.n - n; return true;
}
function ensureItem(id, n, depth = 0) {
  if (invCount(id) >= n) return true; if (depth > 4) return false;
  const r = RECIPE_FOR[id]; if (!r || r.tier > S.tier || !pocketOK(r)) return false;
  const times = Math.ceil((n - invCount(id)) / r.n), need = benchNeed(r);
  for (const k in need) if (!ensureItem(k, need[k] * times, depth + 1)) return false;
  craftDirect(r, times); return invCount(id) >= n;
}
function craftPlanHTML(id) {
  const r = RECIPE_FOR[id], mk = Object.keys(RECIPES).filter(k => RECIPES[k].some(rc => rc.out && rc.out[id]));
  if (!r && !mk.length) return '';
  let h = '<div class="plan"><div class="plant">🧭 Plan de fabricación</div>';
  if (r) {
    const need = benchNeed(r), t = r.tier <= S.tier ? crTimes(r) : 0, lock = r.tier > S.tier, pocket = pocketOK(r);
    const bench = nearestOf('bench'), tree = lock ? '' : missTree(need, 1, 0);
    if (lock) h += `<p class="bad">🔒 Se desbloquea en el nivel ${r.tier + 1} del Núcleo. Entrega lo que pide el panel de objetivos.</p>`;
    else if (pocket) {
      h += `<p>${t > 0 ? `<span class="good">✓ Puedes fabricarlo ahora mismo en el bolsillo</span> (hasta ${t} veces).` : 'Se fabrica en el <b>bolsillo</b> (inventario, <kbd>E</kbd>): no necesitas mesa.'}</p>`;
      h += `<div class="planb">${t > 0 ? `<button class="pri" data-pa="mk:1">🔨 Fabricar</button><button data-pa="mk:5" ${t >= 5 ? '' : 'disabled'}>×5</button><button data-pa="mk:max">Máx (${t})</button>` : ''}${t < 1 && chainPossible(id, r.n) ? `<button class="pri" data-pa="chain">⚡ Fabricar todo (con lo intermedio)</button>` : ''}<button data-pa="pocket">🎒 Abrir en el bolsillo</button></div>`;
    } else {
      h += `<p>Necesita el <b>Banco de ensamblaje</b>${r.rpm ? ` girando a <b>≥ ${r.rpm} RPM</b>` : ''}${r.cat ? ` y el catalizador <b>${esc(ITEMS[r.cat].n)}</b>` : ''}.</p>`;
      if (!bench) {
        const br = RECIPE_FOR.bench, bt = br ? crTimes(br) : 0;
        h += `<p class="bad">⚠ No tienes ningún Banco de ensamblaje construido.</p><div class="planb"><button data-go="bench">Ver cómo se hace el banco</button>${invCount('bench') ? '<span class="good small">Llevas uno en el inventario: colócalo en el suelo.</span>' : bt > 0 ? '<button class="pri" data-pa="mkbench">🔨 Fabricar un banco</button>' : ''}</div>`;
      } else {
        const rpm = bench.b.rpm || 0, rpmOk = !r.rpm || rpm >= r.rpm, near = bench.d <= 7;
        h += `<p>🔧 Tu banco más cercano está a <b>${bench.d} casillas</b>${bench.n > 1 ? ` (tienes ${bench.n})` : ''} · ${r.rpm ? (rpmOk ? `<span class="good">gira a ${Math.round(rpm)} RPM ✓</span>` : `<span class="bad">gira a ${Math.round(rpm)} RPM: le faltan ${Math.round(r.rpm - rpm)}</span>`) : 'no necesita rotación'}</p>`;
        h += `<div class="planb">${near ? `<button class="pri" data-pa="bench">🔧 Abrir el banco con la receta puesta</button>` : `<span class="mut small">Acércate (a menos de 7 casillas) para abrirlo desde aquí.</span>`}<button data-pa="mark">📍 Marcar el banco en el mapa</button></div>`;
      }
    }
    if (tree) h += `<div class="small mut" style="margin-top:6px">Te falta:</div><ul class="tree">${tree}</ul>`;
  }
  for (const k of mk.slice(0, 3)) {
    const bl = machineBlocksFor(k), have = bl.find(t => (L[t] || []).length), nb = have ? nearestOf(have) : null;
    h += `<p class="small">⚙ También sale de <span class="tag2" data-sec="m:${k}">${esc(MACHINE_NAME[k] || k)}</span>: ${nb ? `<span class="good">tienes ${nb.n}, la más cercana a ${nb.d} casillas</span>` : `<span class="bad">no tienes ninguna</span> — <span class="lnk" data-go="${bl[0]}">ver cómo se hace</span>`}</p>`;
  }
  return h + '</div>';
}
document.getElementById('bookBody').addEventListener('click', e => {
  const b = e.target.closest('[data-pa]'); if (!b || b.disabled) return;
  const id = _bookSec.startsWith('i:') ? _bookSec.slice(2) : null, r = id && RECIPE_FOR[id]; if (!r) return;
  const a = b.dataset.pa; ui.panel = null;
  if (a.startsWith('mk:')) { const k = a.slice(3); craftDirect(r, k === 'max' ? 999 : +k); }
  else if (a === 'chain') { if (ensureItem(id, invCount(id) + r.n)) toast(`⚡ Fabricado en cadena: ${ITEMS[id].n}`, true); else toastErr('No se pudo completar la cadena'); }
  else if (a === 'mkbench') { craftDirect(RECIPE_FOR.bench, 1); }
  else if (a === 'pocket') { closeModal(); fillRecipe(r, ui.pocket, [0, 1, 2, 3]); openInventory(null); CR.sel = BENCH.indexOf(r); return; }
  else if (a === 'bench') { const n = nearestOf('bench'); if (!n) return; closeModal(); fillRecipe(r, n.b.slots, [0, 1, 2, 3, 4, 5, 6]); if (r.cat) moveInto(n.b.slots, 7, r.cat, 8); openInventory(n.b); return; }
  else if (a === 'mark') { const n = nearestOf('bench'); if (n && !S.marks.some(m => m.x === n.b.x && m.y === n.b.y)) { S.marks.push({ x: n.b.x, y: n.b.y, n: 'Banco' }); toast('Banco marcado en el mapa (M)'); } }
  _keepScroll = true; renderBook();
});
