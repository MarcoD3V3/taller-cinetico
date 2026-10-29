'use strict';
// =====================================================================================
//  Enciclopedia, segunda parte (ideas de JEI/NEI/REI de Minecraft, la guía de Terraria y las
//  calculadoras de Factorio y Satisfactory):
//   · R / U sobre cualquier objeto (mochila, cofres, máquinas, barra, recetario): cómo se
//     consigue / para qué sirve.
//   · Panel de objetos junto al inventario (como JEI): buscar, ver la ficha o, en creativo, coger.
//   · Recetas por categoría (banco y cada máquina) con páginas y «qué bloques lo hacen».
//   · Calculadora: cuánta materia prima hace falta para N unidades y en qué orden fabricar.
//   · Favoritos (★), pestaña de Progreso (los 8 niveles como un árbol tecnológico) y
//     pestaña de Creativo: todo el catálogo para sacar sin límites (y el interruptor del modo).
// =====================================================================================
CX_TABS.push(['prog', '🏆 Progreso'], ['cre', '🎨 Creativo']);
CX.fav = (() => { try { return JSON.parse(localStorage.getItem('tc-fav') || '[]'); } catch (e) { return []; } })();
CX.rc = {}; CX.qty = {}; CX.calcOwn = true; CX.creQ = ''; CX.creG = '';
const cxSaveFav = () => { try { localStorage.setItem('tc-fav', JSON.stringify(CX.fav)); } catch (e) { } };
const cxStackOf = id => (typeof maxDur === 'function' && maxDur(id)) || TOOLS[id] || (ITEMS[id] && (ITEMS[id].armor || ITEMS[id].weapon && !ITEMS[id].arrowFx)) ? 1 : STACK;
// ---------- Modo creativo ----------
function cxCreAllowed() {
  if (!S) return false; if (typeof inGame !== 'function' || !inGame()) return true;
  const g = NET.game; if (g && g.host) return !!(g.opt && (g.opt.cheats || g.opt.mode === 'creative'));
  return !!(g && g.perm && g.perm.mode === 'creative');
}
function cxSetCreative(on) {
  if (on && !cxCreAllowed()) { toastErr('En esta partida en línea el anfitrión no permite el modo creativo'); return; }
  S.creative = S.sandbox = !!on; vitalsDirty = true; toast(on ? '🎨 Modo creativo: saca lo que quieras del recetario, construir no gasta y no recibes daño' : '⚔ Modo supervivencia', true); renderBook();
}
let _cxGiveT = 0, _cxGiveN = 0, _cxGiveId = null;
function cxGive(id, n) {
  if (!S || !S.creative) { toastErr('Activa el modo creativo para sacar objetos'); return; }
  const k = n || cxStackOf(id), left = invAdd(id, k); if (left >= k) { toastErr('Inventario lleno'); return; }
  tone(660, 0.05, 'sine', 0.03, 1.4); invVersion++;
  const now = performance.now(); if (_cxGiveId === id && now - _cxGiveT < 1500) _cxGiveN += k - left; else _cxGiveN = k - left; _cxGiveId = id; _cxGiveT = now;
  toast(`🎨 +${_cxGiveN} ${ITEMS[id].n}`);
}
// En creativo cada icono del recetario lleva su botón «+»
{ const t0 = cxTile; cxTile = (id, extra = '') => t0(id, extra + (S && S.creative ? `<b class="give" data-cxgive="${id}" title="Coger ${cxStackOf(id)} (Mayús: 1)">+</b>` : '')); }
function cxCreative() {
  const on = !!(S && S.creative), I = cxIndex(), q = CX.creQ.toLowerCase();
  let h = `<div class="crehead ${on ? 'on' : ''}"><div><b>${on ? '🎨 Modo creativo activado' : '⚔ Estás en supervivencia'}</b><small>${on ? 'Clic en un objeto: una pila · Mayús+clic: 1 · clic derecho: 10. Construir no gasta y no recibes daño. Mover cosas entre la mochila, cofres y máquinas sí es real.' : 'Actívalo para sacar cualquier objeto sin límites (también con /modo creativo en el chat).'}${!cxCreAllowed() ? '<br><span class="bad">En esta partida en línea el anfitrión no lo permite.</span>' : ''}</small></div><button class="${on ? '' : 'pri'}" data-cxcre="${on ? 0 : 1}">${on ? 'Volver a supervivencia' : 'Activar creativo'}</button>${on ? '<button class="danger" data-cxclear="1" title="Tira todo lo que llevas en la mochila (no el equipo)">🗑 Vaciar mochila</button>' : ''}</div>`;
  if (!on) return h;
  const groups = Object.keys(I.groups).sort();
  h += `<div class="cxtools"><input type="search" id="creQ" placeholder="Filtrar el catálogo…" value="${cxE(CX.creQ)}"><button data-cxcg="" class="${!CX.creG ? 'on' : ''}">Todo</button>${groups.map(g => `<button data-cxcg="${cxE(g)}" class="${CX.creG === g ? 'on' : ''}">${itemImg(I.groups[g][0], 14)} ${cxE(g)}</button>`).join('')}</div>`;
  const list = (CX.creG ? I.groups[CX.creG] || [] : ITEM_ORDER.filter(id => ITEMS[id] && !String(id).includes('~'))).filter(id => !q || ITEMS[id].n.toLowerCase().includes(q));
  h += `<div class="cregrid">${list.slice(0, 900).map(id => `<button class="cres" data-cxgive="${id}" data-id="${id}" title="${cxE(ITEMS[id].n)}">${itemImg(id, 30)}</button>`).join('')}</div>${list.length > 900 ? `<p class="mut small">${list.length - 900} más: filtra por categoría o nombre.</p>` : ''}`;
  return h;
}
// ---------- Progreso: los niveles como árbol tecnológico ----------
function cxProgress() {
  let h = '<div class="progtree">';
  TIERS.forEach((t, i) => {
    const done = S.tier > i, cur = S.tier === i, unl = BENCH.filter(r => r.tier === i + 1 && ITEMS[r.out]).map(r => r.out), uniq = [...new Set(unl)];
    const goal = Object.keys(t.goal).map(k => { const d = done ? t.goal[k] : cur ? Math.min(t.goal[k], (S.del && S.del[k]) || 0) : 0; return `<li data-go="${k}" data-id="${k}">${itemImg(k, 18)}<i><u style="width:${(d / t.goal[k] * 100).toFixed(0)}%"></u></i><b>${d}/${t.goal[k]}</b></li>`; }).join('');
    h += `<div class="ptier ${done ? 'done' : cur ? 'cur' : 'next'}"><div class="pnum">${done ? '✓' : i + 1}</div><div class="pbody"><b>${cxE(t.n)}</b><small>${done ? 'Completado' : cur ? 'En curso: entrega al Núcleo' : 'Bloqueado'}</small><ul class="pgoal">${goal}</ul>${uniq.length ? `<div class="punl"><small>Al completarlo desbloqueas ${uniq.length} receta${uniq.length > 1 ? 's' : ''}:</small><div class="cxgrid sm">${uniq.slice(0, 16).map(id => cxTile(id)).join('')}</div>${uniq.length > 16 ? `<small class="mut">… y ${uniq.length - 16} más</small>` : ''}</div>` : ''}</div></div>`;
  });
  return h + '</div>';
}
// ---------- Calculadora de materiales ----------
function cxCalc(id, qty, own) {
  const pool = {}, raw = {}, steps = {}, order = [], getPool = k => pool[k] !== undefined ? pool[k] : (pool[k] = own ? invCount(k) : 0);
  const need = (k, n, depth, path) => {
    const use = Math.min(getPool(k), n); pool[k] -= use; const rest = n - use; if (rest <= 0) return;
    const r = RECIPE_FOR[k]; if (r && depth < 9 && !path.has(k) && r.tier <= 99) { const times = Math.ceil(rest / r.n); steps[k] = (steps[k] || 0) + times; const p2 = new Set(path).add(k); for (const [c, q] of Object.entries(benchNeed(r))) need(c, q * times, depth + 1, p2); pool[k] += times * r.n - rest; if (!order.includes(k)) order.push(k); }
    else raw[k] = (raw[k] || 0) + rest;
  };
  need(id, qty, 0, new Set()); return { raw, steps, order: order.reverse() };
}
function cxCalcHTML(id) {
  const r = RECIPE_FOR[id]; if (!r) return '';
  const qty = CX.qty[id] || r.n, C = cxCalc(id, qty, CX.calcOwn), X = cxIndex().X;
  const rawL = Object.entries(C.raw).sort((a, b) => b[1] - a[1]), glyph = k => { const s = (X.src[k] || []).find(s2 => s2.k !== 'bench'); return s ? { tile: '⛏', animal: '🐾', foe: '☠', mach: '⚙', boss: '👑', fish: '🎣' }[s.k] || '🔎' : '🔎'; };
  const total = rawL.reduce((s, [, n]) => s + n, 0), crafts = Object.values(C.steps).reduce((s, n) => s + n, 0);
  return `<div class="calc"><div class="calchead"><b>🧮 Calculadora</b><span>Quiero</span><input type="number" min="1" max="9999" value="${qty}" data-cxqty="${id}"><span>${cxE(ITEMS[id].n)}</span>${[1, 8, 64].map(n => `<button data-cxqb="${id}:${n * r.n}">×${n * r.n}</button>`).join('')}<label><input type="checkbox" data-cxown="1" ${CX.calcOwn ? 'checked' : ''}> contar lo que llevo</label></div>
    <div class="calcbody"><div><small>${CX.calcOwn ? 'Te falta conseguir' : 'Materia prima total'} · ${total} unidades</small><div class="cxdrops">${rawL.map(([k, n]) => `<div class="cxdrop" data-go="${k}" data-id="${k}">${itemImg(k, 22)}<span>${glyph(k)} ${cxE(ITEMS[k] ? ITEMS[k].n : k)}</span><i><u style="width:${(n / (rawL[0][1] || 1) * 100).toFixed(0)}%"></u></i><b>${n}</b></div>`).join('') || '<p class="good small">✓ Con lo que llevas te llega para todo</p>'}</div></div>
    <div><small>Orden de fabricación · ${crafts} fabricaciones</small><ol class="calcsteps">${C.order.map(k => { const rr = RECIPE_FOR[k]; return `<li data-go="${k}" data-id="${k}">${itemImg(k, 20)}<span>${cxE(ITEMS[k].n)}</span><b>×${C.steps[k]}</b><em>${pocketOK(rr) ? '🎒' : '🔧'}${rr.rpm ? ' ' + rr.rpm + ' RPM' : ''}${rr.tier > S.tier ? ' 🔒' : ''}</em></li>`; }).join('')}</ol></div></div></div>`;
}
// ---------- Recetas por categoría, con páginas ----------
function cxCatTabs(id, cats, which) {
  const st = CX.rc[id + which] || (CX.rc[id + which] = { c: cats[0].k, p: 0 }); if (!cats.some(c => c.k === st.c)) st.c = cats[0].k;
  return { st, tabs: `<div class="rctabs">${cats.map(c => `<button data-rcat="${id + which}|${c.k}" class="${st.c === c.k ? 'on' : ''}">${c.ico || ''}<span>${cxE(c.n)}</span><b>${c.list.length}</b></button>`).join('')}</div>` };
}
function cxPager(key, p, n) { return n > 1 ? `<div class="rcpager"><button data-rpg="${key}|${p - 1}" ${p <= 0 ? 'disabled' : ''}>‹</button><span>${p + 1} / ${n}</span><button data-rpg="${key}|${p + 1}" ${p >= n - 1 ? 'disabled' : ''}>›</button></div>` : ''; }
function cxCatalysts(k) {
  if (k === 'bench') { const L2 = (L.bench || []).length; return `<div class="rccat"><small>Se hace en</small><span class="cxi" data-go="bench" data-id="bench">${itemImg('bench', 24)}</span>${L2 ? `<em class="good">✓ tienes ${L2}</em>` : '<em class="bad">no tienes ninguno</em>'}</div>`; }
  const m = machInfo()[k]; if (!m) return '';
  return `<div class="rccat"><small>Lo hace</small>${m.blocks.map(b => `<span class="cxi" data-go="${b}" data-id="${b}">${itemImg(b, 24)}</span>`).join('')}${m.blocks.some(b => (L[b] || []).length) ? '<em class="good">✓ tienes</em>' : '<em class="bad">no tienes</em>'}<span class="mreq">${reqTags(k)}</span></div>`;
}
function cxHowSection(id) {
  const cats = [], bl = []; BENCH.forEach((r, i) => { if (r.out === id) bl.push(i); });
  if (bl.length) cats.push({ k: 'bench', n: 'Banco', ico: itemImg('bench', 16), list: bl });
  for (const k in RECIPES) { const L2 = RECIPES[k].filter(r => r.out && r.out[id]); if (L2.length) { const m = machInfo()[k]; cats.push({ k, n: MACHINE_NAME[k] || k, ico: m ? itemImg(m.blocks[0], 16) : '', list: L2 }); } }
  if (!cats.length) return '';
  const { st, tabs } = cxCatTabs(id, cats, 'h'), c = cats.find(x => x.k === st.c), per = c.k === 'bench' ? 1 : 6, pages = Math.ceil(c.list.length / per); st.p = Math.min(st.p, pages - 1);
  const items = c.list.slice(st.p * per, st.p * per + per), body = c.k === 'bench' ? items.map(i => cxGear(BENCH[i], i)).join('') : `<div class="cxflows">${items.map(r => cxFlow(c.k, r)).join('')}</div>`;
  return `<h4 class="cxh" data-anchor="how">🔨 Cómo se fabrica <small>tecla R sobre cualquier objeto</small></h4>${tabs}${cxCatalysts(c.k)}${cxPager(id + 'h', st.p, pages)}${body}`;
}
function cxUseSection(id) {
  const cats = [], bl = []; for (const r of BENCH) if (r.core === id || r.teeth.includes(id) || r.cat === id) bl.push(r.out);
  if (bl.length) cats.push({ k: 'bench', n: 'Banco', ico: itemImg('bench', 16), list: [...new Set(bl)] });
  for (const k in RECIPES) { const outs = []; for (const r of RECIPES[k]) if (r.in && r.in[id]) outs.push(r); if (outs.length) { const m = machInfo()[k]; cats.push({ k, n: MACHINE_NAME[k] || k, ico: m ? itemImg(m.blocks[0], 16) : '', list: outs }); } }
  if (!cats.length) return '';
  const { st, tabs } = cxCatTabs(id, cats, 'u'), c = cats.find(x => x.k === st.c), per = c.k === 'bench' ? 40 : 6, pages = Math.ceil(c.list.length / per); st.p = Math.min(st.p, pages - 1);
  const items = c.list.slice(st.p * per, st.p * per + per), body = c.k === 'bench' ? `<div class="cxgrid sm">${items.filter(o => ITEMS[o]).map(o => cxTile(o)).join('')}</div>` : `<div class="cxflows">${items.map(r => cxFlow(c.k, r)).join('')}</div>`;
  return `<h4 class="cxh" data-anchor="use">🧩 Para qué sirve <small>tecla U sobre cualquier objeto</small></h4>${tabs}${cxCatalysts(c.k)}${cxPager(id + 'u', st.p, pages)}${body}`;
}
// La ficha: se cambian sus secciones de recetas y usos por las de categorías, y se añaden
// favorito, botones de creativo y la calculadora
{ const p0 = cxItemPage; cxItemPage = id => {
  let h = p0(id); const it = ITEMS[id]; if (!it) return h;
  const how = h.indexOf('<h4 class="cxh">🔨 Cómo se fabrica'), tree = h.indexOf('<h4 class="cxh">🌳'), src = h.indexOf('<h4 class="cxh">📍'), use = h.indexOf('<h4 class="cxh">🧩');
  const treeHTML = tree >= 0 ? h.slice(tree, src >= 0 ? src : use >= 0 ? use : h.length) : '';
  const srcHTML = src >= 0 ? h.slice(src, use >= 0 ? use : h.length) : '';
  const head = h.slice(0, how >= 0 ? how : src >= 0 ? src : use >= 0 ? use : h.length);
  const fav = CX.fav.includes(id), cre = S && S.creative ? `<div class="hcre"><button class="pri" data-cxgive="${id}">🎨 Coger ${cxStackOf(id)}</button><button data-cxgive1="${id}">Coger 1</button></div>` : '';
  const head2 = head.replace('<div class="hhave">', `<button class="hfav ${fav ? 'on' : ''}" data-cxfav="${id}" title="${fav ? 'Quitar de favoritos' : 'Añadir a favoritos'}">${fav ? '★' : '☆'}</button>${cre}<div class="hhave">`);
  return head2 + cxHowSection(id) + cxCalcHTML(id) + treeHTML + srcHTML.replace('<h4 class="cxh">📍', '<h4 class="cxh" data-anchor="src">📍') + cxUseSection(id);
}; }
// ---------- Rutas, lateral e inicio ----------
cxRouteExtra = sec => sec === 'cre' ? cxCreative() : sec === 'prog' ? cxProgress() : null;
cxSideExtra = tab => {
  if (tab === 'cre' || tab === 'prog' || tab === 'home' || !tab) {
    const fav = CX.fav.filter(id => ITEMS[id]);
    return `<div class="cxhelp"><b>Atajos</b><p><kbd>R</kbd> sobre cualquier objeto: cómo se consigue.<br><kbd>U</kbd>: para qué sirve.<br><kbd>Retroceso</kbd>: volver.</p><p>${_bookFrom ? 'Abierto desde un banco: en la ficha, «Poner en el banco» coloca la receta.' : 'Ábrelo desde un banco (F) o tu inventario (E) para poner recetas con un clic.'}</p></div>
      <div class="sidefav"><b>★ Favoritos</b>${fav.length ? fav.map(id => `<button data-go="${id}" data-id="${id}">${itemImg(id, 18)} ${cxE(ITEMS[id].n)}</button>`).join('') : '<p class="mut small">Pulsa ☆ en la ficha de un objeto para tenerlo a mano.</p>'}</div>`;
  }
  return null;
};
// Mientras se elige rellenar el banco, también salen los favoritos en el inicio
var cxRouteExtra, cxSideExtra;
{ const h0 = cxHome; cxHome = () => { const fav = CX.fav.filter(id => ITEMS[id]); return (fav.length ? `<h4 class="cxh">★ Favoritos</h4><div class="cxgrid">${fav.map(id => cxTile(id)).join('')}</div>` : '') + h0(); }; }
// ---------- Clics ----------
$('bookBody').addEventListener('click', e => {
  const t = e.target; if (!t.closest) return;
  const g = t.closest('[data-cxgive]'); if (g) { e.preventDefault(); e.stopPropagation(); cxGive(g.dataset.cxgive, e.shiftKey ? 1 : 0); return; }
  const g1 = t.closest('[data-cxgive1]'); if (g1) { e.stopPropagation(); cxGive(g1.dataset.cxgive1, 1); return; }
  const cr = t.closest('[data-cxcre]'); if (cr) { e.stopPropagation(); cxSetCreative(cr.dataset.cxcre === '1'); return; }
  if (t.closest('[data-cxclear]')) { e.stopPropagation(); if (confirm('¿Tirar todo lo que llevas en la mochila? (el equipo se queda)')) { for (let i = 0; i < S.inv.length; i++) S.inv[i] = null; invVersion++; toast('🗑 Mochila vacía'); } return; }
  const cg = t.closest('[data-cxcg]'); if (cg) { e.stopPropagation(); CX.creG = cg.dataset.cxcg; renderBook(); return; }
  const fv = t.closest('[data-cxfav]'); if (fv) { e.stopPropagation(); const id = fv.dataset.cxfav, i = CX.fav.indexOf(id); if (i >= 0) CX.fav.splice(i, 1); else CX.fav.unshift(id); cxSaveFav(); _keepScroll = true; renderBook(); return; }
  const rc = t.closest('[data-rcat]'); if (rc) { e.stopPropagation(); const [k, c] = rc.dataset.rcat.split('|'); CX.rc[k] = { c, p: 0 }; _keepScroll = true; renderBook(); return; }
  const pg = t.closest('[data-rpg]'); if (pg && !pg.disabled) { e.stopPropagation(); const [k, p] = pg.dataset.rpg.split('|'); if (CX.rc[k]) CX.rc[k].p = +p; _keepScroll = true; renderBook(); return; }
  const qb = t.closest('[data-cxqb]'); if (qb) { e.stopPropagation(); const [id, n] = qb.dataset.cxqb.split(':'); CX.qty[id] = +n; _keepScroll = true; renderBook(); return; }
}, true);
$('bookBody').addEventListener('contextmenu', e => { const g = e.target.closest && e.target.closest('.cres[data-cxgive]'); if (g) { e.preventDefault(); cxGive(g.dataset.cxgive, 10); } });
$('bookBody').addEventListener('change', e => {
  const q = e.target.dataset && e.target.dataset.cxqty; if (q) { CX.qty[q] = clamp(Math.round(+e.target.value || 1), 1, 9999); _keepScroll = true; renderBook(); return; }
  if (e.target.dataset && e.target.dataset.cxown) { CX.calcOwn = e.target.checked; _keepScroll = true; renderBook(); }
});
let _creQT = 0; $('bookBody').addEventListener('input', e => { if (e.target.id !== 'creQ') return; CX.creQ = e.target.value; clearTimeout(_creQT); _creQT = setTimeout(() => { _keepScroll = true; renderBook(); const i = $('creQ'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 140); });
// Interruptor de creativo en la cabecera de la ventana
{ const row = document.querySelector('#mBook header .row'); if (row && !$('cxCreBtn')) { row.insertAdjacentHTML('afterbegin', '<button id="cxCreBtn" title="Modo creativo: sacar objetos sin límites">🎨</button>'); $('cxCreBtn').onclick = () => goBook('cre'); } }
{ const r0 = renderBook; renderBook = () => { r0(); const b = $('cxCreBtn'); if (b) b.classList.toggle('on', !!(S && S.creative)); if (CX.focus) { const a = document.querySelector(`#bookBody [data-anchor="${CX.focus}"]`); if (a) a.scrollIntoView({ block: 'start' }); CX.focus = null; } }; }
// ---------- R / U sobre cualquier objeto ----------
let _cxHov = null;
document.addEventListener('mouseover', e => { const el = e.target.closest && e.target.closest('[data-id], [data-hv]'); _cxHov = el; }, { passive: true });
addEventListener('keydown', e => {
  if (!S || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return; const k = e.key.toLowerCase();
  const tg = e.target && e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
  if (ui.open === 'book' && k === 'backspace' && _bookHist.length) { e.preventDefault(); _bookSec = _bookHist.pop(); renderBook(); return; }
  if (k !== 'r' && k !== 'u') return;
  const el = _cxHov && document.contains(_cxHov) ? _cxHov : null; if (!el || !(ui.open || el.closest('#hotbar'))) return;
  const id = String(el.dataset.id || el.dataset.hv || '').split('~')[0]; if (!ITEMS[id]) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (ui.open !== 'book') openBook(); CX.focus = k === 'r' ? (RECIPE_FOR[id] || Object.values(RECIPES).some(l => l.some(r => r.out && r.out[id])) ? 'how' : 'src') : 'use';
  goBook('i:' + id);
}, true);
// ---------- Panel de objetos junto al inventario (como JEI) ----------
const JP = { el: null, q: '', page: 0, open: innerWidth >= 1500 };
function jpBuild() {
  if (JP.el) return; const el = document.createElement('div'); el.id = 'jeiPanel'; el.hidden = true;
  el.innerHTML = `<button class="jptog" title="Panel de objetos">📖</button><div class="jpin"><div class="jphead"><input type="search" placeholder="Buscar objeto… (R/U sobre él)"><span class="jpn"></span></div><div class="jpgrid"></div><div class="jpfoot"><button data-jp="-1">‹</button><span></span><button data-jp="1">›</button></div><small class="jphint"></small></div>`;
  document.body.appendChild(el); JP.el = el;
  el.querySelector('.jptog').onclick = () => { JP.open = !JP.open; jpRender(); };
  let tq = 0; el.querySelector('input').addEventListener('input', e => { JP.q = e.target.value.toLowerCase(); JP.page = 0; clearTimeout(tq); tq = setTimeout(jpRender, 90); });
  el.addEventListener('click', e => { const p = e.target.closest('[data-jp]'); if (p) { JP.page = Math.max(0, JP.page + +p.dataset.jp); jpRender(); return; }
    const s = e.target.closest('[data-jpi]'); if (!s) return; const id = s.dataset.jpi; if (S.creative && !e.altKey) { cxGive(id, e.shiftKey ? 1 : 0); return; } openBook(); CX.focus = 'how'; goBook('i:' + id); });
  el.addEventListener('contextmenu', e => { const s = e.target.closest('[data-jpi]'); if (!s) return; e.preventDefault(); openBook(); CX.focus = 'use'; goBook('i:' + s.dataset.jpi); });
}
function jpRender() {
  jpBuild(); const el = JP.el, show = ui.open === 'inv' && !!S; el.hidden = !show; if (!show) return; el.classList.toggle('open', JP.open); if (!JP.open) return;
  const list = ITEM_ORDER.filter(id => ITEMS[id] && !String(id).includes('~') && (!JP.q || ITEMS[id].n.toLowerCase().includes(JP.q))), per = 120, pages = Math.max(1, Math.ceil(list.length / per)); JP.page = Math.min(JP.page, pages - 1);
  el.querySelector('.jpgrid').innerHTML = list.slice(JP.page * per, JP.page * per + per).map(id => `<button class="jps" data-jpi="${id}" data-id="${id}">${itemImg(id, 26)}</button>`).join('');
  el.querySelector('.jpfoot span').textContent = `${JP.page + 1} / ${pages}`; el.querySelector('.jpn').textContent = list.length;
  el.querySelector('.jphint').textContent = S.creative ? '🎨 Clic: coger una pila · Mayús: 1 · clic derecho: usos' : 'Clic: cómo se hace · clic derecho: para qué sirve';
}
{ let last = null, cre = null; setInterval(() => { const st = ui.open === 'inv'; if (st !== last || (S && S.creative) !== cre) { last = st; cre = S && S.creative; jpRender(); } }, 250); }
