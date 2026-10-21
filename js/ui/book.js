'use strict';
// Recetario: recetas del banco por categoría, galería de máquinas (qué aceptan, qué necesitan,
// qué puedes hacer ya) y ficha de cada objeto (cómo se consigue y para qué sirve).
let _bookFrom = null; // banco abierto (o 'pocket' = bolsillo)
let _bookSec = 'b:Materiales', _bookHist = [], _mFilter = 'all', _mItem = null, _mCan = false;
function openBook() {
  _bookFrom = ui.open === 'inv' ? (ui.panel && ui.panel.type === 'bench' ? ui.panel : 'pocket') : null;
  if (ui.open === 'inv') closeModal();
  ui.open = 'book'; $('mBook').hidden = false; $('bookQ').value = ''; renderBook(); setTimeout(() => $('bookQ').focus(), 0);
}
function openBookAt(k) { openBook(); goBook('m:' + k); }
function goBook(sec) { if (sec !== _bookSec) { _bookHist.push(_bookSec); if (_bookHist.length > 30) _bookHist.shift(); } _bookSec = sec; _mItem = null; $('bookQ').value = ''; renderBook(); const m = document.querySelector('#bookBody .bmain'); if (m) m.scrollTop = 0; }

// ---------- Datos de máquinas (se calculan una vez) ----------
let _MI = null;
function machInfo() {
  if (_MI) return _MI; _MI = {};
  for (const id in BD) { const d = BD[id]; if (!d.machine || !RECIPES[d.machine]) continue; (_MI[d.machine] = _MI[d.machine] || { blocks: [], tier: 99 }).blocks.push(id); _MI[d.machine].tier = Math.min(_MI[d.machine].tier, d.tier || 0); }
  for (const k in _MI) {
    const m = _MI[k], tags = new Set();
    for (const id of m.blocks) { const d = BD[id]; if (d.kin) tags.add('kin'); if (d.pw) tags.add('pw'); if (d.burn || id === 'furnace' || (d.fuel && d.fuel.length)) tags.add('fu'); if (d.fl) tags.add('fl'); }
    if (RECIPES[k].some(r => r.fin || r.fout)) tags.add('fl');
    m.tags = tags; m.ins = [...(MACHINE_INPUTS[k] || [])];
  }
  return _MI;
}
function reqTags(k) {
  const m = machInfo()[k]; let h = '';
  for (const id of m.blocks) {
    const d = BD[id], t = [];
    if (d.kin) t.push(`<span class="tag2 kin">⚙ ${d.impact || 0}×RPM SU${d.minRpm ? ' · ≥' + d.minRpm + ' RPM' : ''}</span>`);
    if (d.pw) t.push(`<span class="tag2 pw">⚡ ${d.pw.rate} FE/s</span>`);
    if (d.burn || id === 'furnace') t.push(`<span class="tag2 fu">🔥 combustible</span>`);
    if (d.fl) t.push(`<span class="tag2 fl">💧 fluidos</span>`);
    if (!t.length) t.push(`<span class="tag2">sin energía</span>`);
    h += t.join('');
  }
  return h;
}
const canMake = r => { for (const i in r.in) if (invCount(i) < r.in[i]) return false; return true; };
const ib = (id, n, own, chk) => `<span class="ib ${own ? 'own' : chk ? 'lack' : ''}" data-id="${id}" data-go="${id}">${itemImg(id, 24)}${n > 1 || chk ? `<span class="q ${chk ? (own ? 'ok' : 'no') : ''}">${chk ? Math.min(invCount(id), 99) + '/' : ''}${n}</span>` : ''}</span>`;
const flu = o => o ? Object.keys(o).map(f => `<span class="ib flu" title="${esc(FLUIDS[f].n)}"><i class="fdot" style="background:${FLUIDS[f].c}"></i>${o[f]} mB</span>`).join('') : '';
function rcard(k, r, showM) {
  const ins = Object.keys(r.in), outs = Object.keys(r.out || {}), can = ins.length > 0 && canMake(r);
  return `<div class="rcard ${can ? 'can' : ''}"><span class="side">${ins.map(i => ib(i, r.in[i], invCount(i) >= r.in[i], 1)).join('')}${flu(r.fin)}</span><span class="arrow">${showM ? `<span class="tag2" data-sec="m:${k}" style="cursor:pointer">${esc(MACHINE_NAME[k] || k)}</span>` : ''}→<span>${r.t || 1} s</span></span><span class="side o">${outs.map(o => ib(o, r.out[o])).join('')}${flu(r.fout)}</span></div>`;
}
// Cuánto pide una receta del banco y cuánto llevas
function benchNeed(r) { const need = { [r.core]: 1 }; for (const t of r.teeth) need[t] = (need[t] || 0) + 1; return need; }
function recipeCard(r, i) {
  const lock = r.tier > S.tier, pocket = pocketOK(r), need = benchNeed(r);
  const miss = Object.keys(need).filter(id => invCount(id) < need[id]), can = !lock && !miss.length;
  const q = (id, n) => { const h = invCount(id), ok = h >= n; return `<span class="q ${ok ? 'ok' : 'no'}">${Math.min(h, 99)}/${n}</span>`; };
  const seen = new Set(), teeth = r.teeth.filter(t => !seen.has(t) && seen.add(t)).map(t => `<span class="mini ${invCount(t) >= need[t] ? '' : 'miss'}" data-id="${t}">${itemImg(t, 22)}${q(t, need[t])}</span>`).join('');
  const where = pocket ? 'Bolsillo o banco' : `Banco${r.rpm ? ' · ≥' + r.rpm + ' RPM' : ''}`;
  const status = lock ? `<span class="bad">🔒 nivel ${r.tier + 1}</span>` : can ? '<span class="good">✓ Puedes fabricarlo</span>' : `<span class="bad">Falta: ${miss.map(id => `${need[id] - invCount(id)} ${esc(ITEMS[id].n)}`).join(', ')}</span>`;
  return `<button class="card ${lock ? 'locked' : can ? 'can' : 'miss'}" data-r="${i}"><span class="rgear"><span class="mini core ${invCount(r.core) >= need[r.core] ? '' : 'miss'}" data-id="${r.core}">${itemImg(r.core, 26)}${q(r.core, need[r.core])}</span><span class="teeth">${teeth || '<span class="mut small">sin dientes</span>'}</span></span>
  <span class="rinfo"><span class="t" data-id="${r.out}">${itemImg(r.out, 20)} ${esc(ITEMS[r.out].n)} ×${r.n}</span><span class="d">${where}${r.cat ? ' · catalizador ' + esc(ITEMS[r.cat].n) : ''}</span><span class="d">${status}</span></span></button>`;
}
function benchGroup(r) { const it = ITEMS[r.out]; if (BD[r.out]) return CATS[BD[r.out].cat]; return it && it.cat >= 5 ? ICATS[it.cat] : 'Materiales'; }

// ---------- Vistas ----------
function machineGallery() {
  const MI = machInfo(), keys = Object.keys(MI).sort((a, b) => MI[a].tier - MI[b].tier || (MACHINE_NAME[a] || a).localeCompare(MACHINE_NAME[b] || b));
  const F = { all: 'Todas', kin: '⚙ Rotación', pw: '⚡ Eléctricas', fu: '🔥 Combustible', fl: '💧 Fluidos', can: '✓ Puedo usar ya' };
  let h = `<div class="mtools">${Object.entries(F).map(([k, n]) => `<button data-mf="${k}" class="${_mFilter === k ? 'on' : ''}">${n}</button>`).join('')}</div><div class="mgal">`;
  for (const k of keys) {
    const m = MI[k], L2 = RECIPES[k], nCan = L2.reduce((s, r) => s + (Object.keys(r.in).length && canMake(r) ? 1 : 0), 0);
    if (_mFilter === 'can' ? !nCan : _mFilter !== 'all' && !m.tags.has(_mFilter)) continue;
    const lock = m.tier > S.tier;
    h += `<button class="mcard ${lock ? 'locked' : ''} ${nCan ? 'have' : ''}" data-sec="m:${k}"><span class="mico">${itemImg(m.blocks[0], 36)}</span><span class="mt">${esc(MACHINE_NAME[k] || k)}</span><span class="md">${L2.length} recetas${nCan ? ` · <span class="good">${nCan} posibles ya</span>` : ''}${lock ? ` · <span class="bad">nivel ${m.tier + 1}</span>` : ''}</span><span class="mreq">${[...m.tags].map(t => `<span class="tag2 ${t}">${F[t]}</span>`).join('')}</span></button>`;
  }
  return h + `</div>`;
}
function machineDetail(k) {
  const m = machInfo()[k]; if (!m) return '<p class="mut">Máquina desconocida.</p>';
  const d0 = BD[m.blocks[0]], lock = m.tier > S.tier;
  let h = `<div class="mhead"><span class="mico">${itemImg(m.blocks[0], 52)}</span><div><h3>${esc(MACHINE_NAME[k] || k)}</h3><p class="mut small">${m.blocks.map(id => `<b>${esc(BD[id].n)}</b>: ${esc(BD[id].d || '')}`).join('<br>')}</p><div class="mreq" style="margin-top:6px">${reqTags(k)}</div></div><div class="mut small" style="text-align:right">${RECIPES[k].length} recetas<br>${lock ? `<span class="bad">Nivel ${m.tier + 1}</span>` : '<span class="good">Disponible</span>'}</div></div>`;
  const ins = m.ins.slice().sort((a, b) => (invCount(b) > 0) - (invCount(a) > 0) || ORDER_IDX[a] - ORDER_IDX[b]);
  h += `<div class="cat">Acepta (${ins.length}) · clic en uno para ver solo sus recetas · el punto verde indica que lo llevas</div><div class="accepts">${ins.map(id => `<span class="mini ${invCount(id) > 0 ? 'own' : ''} ${_mItem === id ? 'on' : ''}" data-id="${id}" data-mi="${id}">${itemImg(id, 24)}</span>`).join('')}</div>`;
  if (d0.fuel) h += `<div class="cat">Combustible</div><div class="accepts">${d0.fuel.map(id => `<span class="mini ${invCount(id) > 0 ? 'own' : ''}" data-id="${id}" data-go="${id}">${itemImg(id, 24)}</span>`).join('')}</div>`;
  else if (m.blocks.includes('furnace')) h += `<div class="cat">Combustible (horno de carbón)</div><div class="accepts"><span class="mini ${invCount('coal') ? 'own' : ''}" data-id="coal" data-go="coal">${itemImg('coal', 24)}</span></div>`;
  let list = RECIPES[k];
  if (_mItem) list = list.filter(r => r.in[_mItem]);
  if (_mCan) list = list.filter(r => Object.keys(r.in).length && canMake(r));
  h += `<div class="mtools"><button data-mcan="1" class="${_mCan ? 'on' : ''}">✓ Solo lo que puedo hacer</button>${_mItem ? `<button data-mi="">✕ Quitar filtro: ${esc(ITEMS[_mItem].n)}</button>` : ''}<span class="mut small">${list.length} recetas · clic en un objeto para ver de dónde sale y para qué sirve</span></div>`;
  h += `<div class="rgrid">${list.map(r => rcard(k, r)).join('') || '<p class="mut">Ninguna receta con ese filtro.</p>'}</div>`;
  return h;
}
function itemDetail(id) {
  const it = ITEMS[id]; if (!it) return '<p class="mut">Objeto desconocido.</p>';
  const LIM = 60;
  const rar = it.rarity;
  let h = `<div class="mhead"><span class="mico">${itemImg(id, 52)}</span><div><h3>${esc(it.n)}</h3><div class="tags"><span class="tag2">${esc(ICATS[it.cat] || '')}</span>${rar ? `<span class="tag2" style="color:${RARITY[rar].c}">${RARITY_N[rar]}</span>` : ''}${BD[id] ? `<span class="tag2">${BD[id].walk ? 'Se pisa' : 'Sólido'}</span>` : ''}</div><p class="mut small">${esc(it.d || '')}</p></div><div class="mut small" style="text-align:right">Llevas<br><b>${invCount(id)}</b></div></div>`;
  h += craftPlanHTML(id) + itemFacts(id); // ui/bookplan.js
  // Cómo se consigue
  const get = [], src = [];
  BENCH.forEach((r, i) => { if (r.out === id) get.push(recipeCard(r, i)); });
  for (const k in RECIPES) for (const r of RECIPES[k]) if (r.out && r.out[id]) src.push(rcard(k, r, true));
  const tiles = GI.filter(g => g.drop === id).map(g => g.n + tileWhere(g)), anim = Object.values(SPECIES).filter(s => s.drops.some(d => d[0] === id)).map(s => s.n);
  h += `<div class="cat">Cómo se consigue</div>`;
  if (tiles.length) h += `<p class="small">⛏ Picando o talando: <b>${esc(tiles.join(', '))}</b></p>`;
  if (anim.length) h += `<p class="small">🐾 Cazando: <b>${esc(anim.join(', '))}</b></p>`;
  if (get.length) h += `<div class="cards">${get.join('')}</div>`;
  if (src.length) h += `<div class="rgrid" style="margin-top:6px">${src.slice(0, LIM).join('')}</div>`;
  if (!tiles.length && !anim.length && !get.length && !src.length) h += '<p class="mut small">No se fabrica: búscalo en el mundo.</p>';
  // Para qué sirve
  const use = [], usem = [];
  BENCH.forEach((r, i) => { if (use.length < LIM && (r.core === id || r.teeth.includes(id) || r.cat === id)) use.push(recipeCard(r, i)); });
  for (const k in RECIPES) for (const r of RECIPES[k]) if (usem.length < LIM && r.in[id]) usem.push(rcard(k, r, true));
  h += `<div class="cat">Para qué sirve</div>`;
  if (it.tool || it.weapon || it.use) h += `<p class="small">${esc(it.d || '')}</p>`;
  if (use.length) h += `<div class="cards">${use.join('')}</div>`;
  if (usem.length) h += `<div class="rgrid" style="margin-top:6px">${usem.join('')}</div>`;
  if (!use.length && !usem.length && !(it.tool || it.weapon || it.use)) h += '<p class="mut small">No es ingrediente de nada (todavía).</p>';
  return h;
}
function renderBook() {
  const q = $('bookQ').value.trim().toLowerCase();
  const match = id => ITEMS[id] && ITEMS[id].n.toLowerCase().includes(q);
  const benchGroups = {}; BENCH.forEach((r, i) => { const g = benchGroup(r); (benchGroups[g] = benchGroups[g] || []).push(i); });
  const nm = Object.keys(machInfo()).length;
  let side = `<div class="bsec"><div class="cat">Máquinas</div><button data-sec="mach" class="${(_bookSec === 'mach' || _bookSec.startsWith('m:')) && !q ? 'on' : ''}">⚙ Todas las máquinas <span class="mut">${nm}</span></button><div class="cat">Banco</div>`;
  for (const g in benchGroups) side += `<button data-sec="b:${g}" class="${_bookSec === 'b:' + g && !q ? 'on' : ''}">${esc(g)} <span class="mut">${benchGroups[g].length}</span></button>`;
  side += `</div>`;
  let h = '';
  const back = _bookHist.length ? `<div class="crumb"><button data-back="1">← Volver</button></div>` : '';
  const LIMIT = 90;
  if (q) {
    const items = []; for (const id of ITEM_ORDER) { if (items.length >= 40) break; if (match(id)) items.push(id); }
    const cards = []; BENCH.forEach((r, i) => { if (cards.length < LIMIT && (match(r.out) || match(r.core) || r.teeth.some(match))) cards.push(recipeCard(r, i)); });
    let rows = '', count = 0; for (const k in RECIPES) for (const r of RECIPES[k]) { if (count >= LIMIT) break; if (Object.keys(r.in).concat(Object.keys(r.out || {})).some(match) || (MACHINE_NAME[k] || '').toLowerCase().includes(q)) { rows += rcard(k, r, true); count++; } }
    const ms = Object.keys(machInfo()).filter(k => (MACHINE_NAME[k] || k).toLowerCase().includes(q));
    if (ms.length) h += `<div class="cat">Máquinas</div><div class="mtools">${ms.map(k => `<button data-sec="m:${k}">${itemImg(machInfo()[k].blocks[0], 18)} ${esc(MACHINE_NAME[k] || k)}</button>`).join('')}</div>`;
    if (items.length) h += `<div class="cat">Objetos (${items.length}${items.length >= 40 ? '+' : ''}) · clic para ver su ficha</div><div class="accepts">${items.map(id => `<span class="mini" data-id="${id}" data-go="${id}">${itemImg(id, 24)}</span>`).join('')}</div>`;
    if (cards.length) h += `<div class="cat">Banco (${cards.length}${cards.length >= LIMIT ? '+' : ''})</div><div class="cards">${cards.join('')}</div>`;
    if (rows) h += `<div class="cat">Máquinas (${count}${count >= LIMIT ? '+' : ''})</div><div class="rgrid">${rows}</div>`;
    if (!h) h = '<p class="mut">Nada coincide con la búsqueda.</p>';
  } else if (_bookSec === 'mach') h = back + machineGallery();
  else if (_bookSec.startsWith('m:')) h = back + machineDetail(_bookSec.slice(2));
  else if (_bookSec.startsWith('i:')) h = back + itemDetail(_bookSec.slice(2));
  else { const g = _bookSec.slice(2); h = back + `<div class="cat">${esc(g)}</div><div class="cards">${(benchGroups[g] || []).map(i => recipeCard(BENCH[i], i)).join('')}</div>`; }
  const main = document.querySelector('#bookBody .bmain'), st = main ? main.scrollTop : 0, sideEl = document.querySelector('#bookBody .bsec'), ss = sideEl ? sideEl.scrollTop : 0;
  $('bookBody').innerHTML = `<div class="bookgrid">${side}<div class="bmain">${h}</div></div>`;
  if (_keepScroll) { document.querySelector('#bookBody .bmain').scrollTop = st; _keepScroll = false; }
  document.querySelector('#bookBody .bsec').scrollTop = ss;
  $('bookCount').textContent = `${Object.keys(ITEMS).length} objetos · ${BENCH.length} recetas de banco · ${Object.values(RECIPES).reduce((s, l) => s + l.length, 0)} de máquinas`;
  $('bookHint').textContent = _bookFrom === 'pocket' ? 'Clic en una receta de bolsillo para rellenar tu banco de bolsillo.' : _bookFrom ? 'Clic en una receta para rellenar el banco con tu inventario.' : 'Abre un banco (F) o tu inventario (E) y vuelve aquí para rellenar recetas con un clic.';
}
let _keepScroll = false;
let _bq = 0; $('bookQ').addEventListener('input', () => { clearTimeout(_bq); _bq = setTimeout(renderBook, 80); });
$('bookBody').addEventListener('click', e => {
  const t = e.target;
  if (t.closest('[data-back]')) { _bookSec = _bookHist.pop() || 'mach'; _mItem = null; renderBook(); return; }
  const mf = t.closest('[data-mf]'); if (mf) { _mFilter = mf.dataset.mf; _keepScroll = true; renderBook(); return; }
  const mi = t.closest('[data-mi]'); if (mi) { _mItem = mi.dataset.mi && _mItem !== mi.dataset.mi ? mi.dataset.mi : null; _keepScroll = true; renderBook(); return; }
  if (t.closest('[data-mcan]')) { _mCan = !_mCan; _keepScroll = true; renderBook(); return; }
  const go = t.closest('[data-go]'); if (go) { goBook('i:' + go.dataset.go); return; }
  const sb = t.closest('[data-sec]'); if (sb) { goBook(sb.dataset.sec); return; }
  const c = t.closest('.card[data-r]'); if (!c) return;
  const r = BENCH[+c.dataset.r];
  if (!_bookFrom) { goBook('i:' + r.out); return; }
  if (r.tier > S.tier) { toast(`Se desbloquea en el nivel ${r.tier + 1}`); return; }
  if (_bookFrom === 'pocket') { if (!pocketOK(r)) { toast('Esa receta necesita el Banco de ensamblaje'); return; } fillRecipe(r, ui.pocket, [0, 1, 2, 3]); openInventory(null); }
  else { if (!blocks.includes(_bookFrom)) return; fillRecipe(r, _bookFrom.slots, [0, 1, 2, 3, 4, 5, 6]); if (r.cat) moveInto(_bookFrom.slots, 7, r.cat, 8); openInventory(_bookFrom); }
});
// Clic derecho en una receta del banco: ficha del objeto que fabrica
$('bookBody').addEventListener('contextmenu', e => { const c = e.target.closest('.card[data-r]'); if (c) { e.preventDefault(); goBook('i:' + BENCH[+c.dataset.r].out); } });
// Devuelve lo que haya en las ranuras y coloca la receta tantas veces como permita el inventario
function fillRecipe(r, arr, idx) {
  for (const i of idx) if (arr[i]) { invAdd(arr[i].id, arr[i].n); arr[i] = null; }
  const need = { [r.core]: 1 }; for (const t of r.teeth) need[t] = (need[t] || 0) + 1;
  let k = STACK; for (const id in need) k = Math.min(k, Math.floor(invCount(id) / need[id]));
  if (k <= 0) { const miss = Object.keys(need).filter(id => invCount(id) < need[id]).map(id => ITEMS[id].n); toast('Te falta: ' + miss.join(', ')); return; }
  arr[idx[0]] = { id: r.core, n: invTake(r.core, k) };
  r.teeth.forEach((t, j) => { arr[idx[j + 1]] = { id: t, n: invTake(t, k) }; });
  invVersion++;
}
function moveInto(arr, i, id, n) { if (arr[i]) return; const g = invTake(id, Math.min(n, invCount(id))); if (g) arr[i] = { id, n: g }; }

// ---------- Datos útiles de un objeto: qué hace, cómo se usa y en qué ayuda ----------
const MOD_N = { speed: ['Velocidad', 'pct'], hp: ['Vida máx.', 'add'], stam: ['Aguante', 'add'], mana: ['Maná', 'add'], manaRegen: ['Regeneración de maná', 'pct'], def: ['Defensa', 'add'], warm: ['Abrigo', 'deg'], heal: ['Curación', 'pct'], hunger: ['Hambre', 'inv'], thirst: ['Sed', 'inv'], energy: ['Cansancio', 'inv'], mine: ['Picar', 'pct'], wood: ['Talar', 'pct'], hunt: ['Cazar', 'pct'], melee: ['Daño cuerpo a cuerpo', 'pct'], ranged: ['Daño a distancia', 'pct'], reach: ['Alcance', 'pct'], luck: ['Botín doble', 'pp'], xp: ['Experiencia', 'pct'], detect: ['Te detectan a', 'pct'], price: ['Precios', 'pct'], tame: ['Domesticar', 'pct'], petHp: ['Vida de mascotas', 'pct'], sick: ['Daño de veneno', 'pct'], bleed: ['Sangrado', 'pct'], wound: ['Gravedad de heridas', 'pct'], dash: ['Coste del impulso', 'pct'], sprintCost: ['Coste de correr', 'pct'], night: ['Visión nocturna', 'flag'], fire: ['Resistencia al fuego', 'flag'] };
function modChips(mods) {
  return Object.entries(mods).map(([k, v]) => { const n = MOD_N[k]; if (!n) return ''; const [lab, f] = n;
    const t = f === 'add' ? (v > 0 ? '+' : '') + v : f === 'deg' ? (v > 0 ? '+' : '') + v + ' °C' : f === 'pp' ? '+' + Math.round(v * 100) + ' %' : f === 'flag' ? 'sí' : f === 'inv' ? (v < 1 ? '−' : '+') + Math.round(Math.abs(1 - v) * 100) + ' %' : (v >= 1 ? '+' : '−') + Math.round(Math.abs(v - 1) * 100) + ' %';
    const good = f === 'inv' || ['detect', 'price', 'sick', 'bleed', 'wound', 'dash', 'sprintCost'].includes(k) ? v < 1 : f === 'flag' || v > (f === 'add' || f === 'deg' || f === 'pp' ? 0 : 1);
    return `<span class="fact ${good ? 'up' : 'down'}"><b>${t}</b> ${lab}</span>`; }).join('');
}
// Biomas donde aparece una casilla (menas, plantas y árboles) y su rareza
function tileWhere(g) {
  const gi = GI.indexOf(g), bs = BIOMES.filter(b => (b.oreT || []).some(o => o[0] === gi) || (b.plantI || []).some(o => o[0] === gi) || (b.treeI || []).some(o => o[0] === gi) || (b.altI || []).some(o => o[0] === gi) || b.gI === gi);
  if (!bs.length || bs.length > 12) return '';
  return ` (${bs.map(b => b.n).slice(0, 6).join(', ')}${bs.length > 6 ? '…' : ''}${g.need ? ` · pico nivel ${g.need.lv}` : ''})`;
}
function itemFacts(id) {
  const it = ITEMS[id], f = [], how = [];
  const fact = (v, lab) => f.push(`<span class="fact"><b>${v}</b> ${lab}</span>`);
  if (it.tool && it.tool.kind !== 'util') { fact(TOOL_KIND_N[it.tool.kind] || 'Herramienta', ''); fact('×' + it.tool.mult.toFixed(1), 'velocidad'); fact(it.tool.lv || 1, 'nivel de extracción'); if (it.tool.area) fact(it.tool.area * 2 + 1 + '×' + (it.tool.area * 2 + 1), 'área'); if (it.tool.fort) fact('+' + Math.round(it.tool.fort * 100) + ' %', 'botín doble'); how.push('Llévala en la mano: clic izquierdo o derecho mantenido sobre el terreno.'); }
  if (it.weapon) { const w = it.weapon, pr = weaponProfile(id); fact(Math.round(pr.dmg), 'daño'); if (pr.cd) fact((1 / pr.cd).toFixed(1), 'golpes/s'); if (pr.ammo) fact(ITEMS[pr.ammo].n, 'munición'); if (pr.mana) fact(pr.mana, 'maná por disparo'); if (w.el) fact(ELEM_N[w.el] ? w.el : w.el, 'elemento'); if (w.sweep) fact('sí', 'golpe en área'); how.push(pr.kind === 'melee' ? 'En la mano: clic izquierdo para atacar en arco hacia el cursor.' : 'En la mano: clic izquierdo para disparar hacia el cursor.'); }
  if (it.armor) { fact(it.armor.def, 'defensa'); fact(ARMOR_SLOTS[it.armor.slot], 'ranura'); if (it.armor.warm) fact('+' + it.armor.warm + ' °C', 'abrigo'); if (it.armor.heavy) fact('sí', 'pesada (−2 % velocidad)'); how.push('Equípala en el inventario (E) o con Shift+clic.'); }
  if (it.food) { if (it.food.f) fact('+' + it.food.f, 'hambre'); if (it.food.w) fact('+' + it.food.w, 'sed'); if (it.food.hp) fact('+' + it.food.hp, 'vida'); if (it.food.raw) fact(Math.round(it.food.raw * 100) + ' %', 'riesgo de intoxicación'); how.push('Pulsa F sin bloque delante para comer o beber.'); }
  if (it.med) how.push('Pulsa F para usarla o cúrate desde la ficha del personaje (C).');
  if (it.charm) { f.push(modChips(it.charm)); how.push('Basta con llevarlo en el inventario (uno de cada tipo).'); }
  if (it.use && it.use.buff) { fact(Math.round(it.use.t / 60 * 10) / 10 + ' min', BUFF_N[it.use.buff] || 'efecto'); how.push('Pulsa F para usarlo.'); }
  if (it.learn) { const sp = SPELLS[it.learn]; fact(sp.m, 'maná'); fact(sp.cd + ' s', 'recarga'); fact(sp.el, 'elemento'); how.push('Léelo con F y asígnalo a Z, V, Y o U en la ficha (C).'); }
  if (it.summon) { const B = BOSSES[it.summon]; fact(B.hp, 'vida del jefe'); how.push('Úsalo con F (o en un altar) para invocar a ' + B.n + '.'); }
  if (BD[id]) { const d = BD[id]; if (d.pw) fact(d.pw.rate + ' FE/s', d.pw.role === 'gen' ? 'genera' : 'consume'); if (d.impact) fact(d.impact + '×RPM', 'carga'); if (d.light) fact(d.light, 'luz'); if (d.machine) fact((RECIPES[d.machine] || []).length, 'recetas'); how.push(d.walk ? 'Colócalo con clic; se puede pisar.' : 'Colócalo con clic; no se atraviesa. Clic derecho para quitarlo.'); }
  if (!how.length && !f.length) return '';
  return `${f.length ? `<div class="facts">${f.join('')}</div>` : ''}${how.length ? `<p class="small how">💡 ${how.map(esc).join(' ')}</p>` : ''}`;
}
