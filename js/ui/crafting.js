'use strict';
// =====================================================================================
//  Mesa de fabricación interactiva (bolsillo y Banco de ensamblaje):
//  buscador con pestañas (puedo hacer, favoritos, recientes, por tipo), lista con cuántas
//  veces puedes fabricar cada receta, ficha con lo que tienes y lo que falta, siluetas de
//  los ingredientes en el engranaje, y botones para rellenar o fabricar ×1, ×5 o el máximo.
// =====================================================================================
const CR = { tab: 'can', q: '', sel: -1, ver: -1 };
const CR_TABS = [['can', '✓', 'Puedo hacer'], ['fav', '★', 'Favoritos'], ['recent', '🕘', 'Recientes'], ['all', '∗', 'Todo'], ['tool', '⛏', 'Herramientas'], ['weapon', '⚔', 'Armas'], ['gear', '🛡', 'Equipo'], ['build', '🧱', 'Construcción'], ['surv', '🍖', 'Supervivencia'], ['tech', '⚙', 'Máquinas y piezas']];
function crKind(r) {
  const it = ITEMS[r.out]; if (!it) return 'tech';
  if (it.tool) return 'tool'; if (it.weapon) return 'weapon'; if (it.armor || it.gear) return 'gear';
  if (BD[r.out] && (BD[r.out].cat === BUILD_CAT || BD[r.out].cat === HOUSE_CAT)) return 'build';
  if (it.food || it.med || it.medItem || it.cat === S_CAT || it.cat === X_CAT) return 'surv';
  return 'tech';
}
const crTimes = r => { const need = benchNeed(r); let k = 999; for (const id in need) k = Math.min(k, Math.floor(invCount(id) / need[id])); return k; };
const crMode = () => ui.panel && ui.panel.type === 'bench' ? 'bench' : 'pocket';
const crUsable = r => r.tier <= S.tier && (crMode() === 'bench' || pocketOK(r));
function craftHTML() {
  return `<div class="crf"><div class="crhead"><input id="crQ" type="search" placeholder="Buscar receta u objeto…" value="${esc(CR.q)}" aria-label="Buscar receta"><div class="crtabs">${CR_TABS.map(([k, i, n]) => `<button data-crt="${k}" class="${CR.tab === k ? 'on' : ''}" title="${n}">${i}</button>`).join('')}</div></div>
  <div class="crlist" id="crList"></div><div class="crdet" id="crDet"></div></div>`;
}
function crList() {
  const favs = new Set(S.favs || []), recent = S.recent || [], q = CR.q.trim().toLowerCase(), out = [];
  const order = CR.tab === 'recent' ? recent.map(k => BENCH.findIndex(r => r.key === k)).filter(i => i >= 0) : BENCH.map((_, i) => i);
  for (const i of order) {
    const r = BENCH[i]; if (!r || !ITEMS[r.out]) continue;
    if (q && !ITEMS[r.out].n.toLowerCase().includes(q) && ![r.core, ...r.teeth].some(id => ITEMS[id].n.toLowerCase().includes(q))) continue;
    const usable = crUsable(r), t = usable ? crTimes(r) : 0;
    if (CR.tab === 'can' && t < 1) continue;
    if (CR.tab === 'fav' && !favs.has(r.key)) continue;
    if (!['can', 'fav', 'recent', 'all'].includes(CR.tab) && crKind(r) !== CR.tab) continue;
    if (CR.tab !== 'all' && !q && !usable && CR.tab !== 'fav') continue;
    out.push([i, t, usable]); if (out.length >= 160) break;
  }
  if (CR.tab !== 'recent') out.sort((a, b) => (b[1] > 0) - (a[1] > 0) || (favs.has(BENCH[b[0]].key) - favs.has(BENCH[a[0]].key)));
  return out;
}
function renderCraft(force) {
  const L3 = $('crList'); if (!L3) return;
  if (!force && CR.ver === invVersion) return; CR.ver = invVersion;
  const favs = new Set(S.favs || []), list = crList();
  L3.innerHTML = list.length ? list.map(([i, t, ok]) => { const r = BENCH[i]; return `<button class="crit ${t > 0 ? 'can' : ''} ${ok ? '' : 'lock'} ${CR.sel === i ? 'on' : ''}" data-cr="${i}" data-id="${r.out}">${itemImg(r.out, 30)}${t > 0 ? `<span class="q">×${t > 99 ? '99+' : t}</span>` : ''}${favs.has(r.key) ? '<span class="fv">★</span>' : ''}</button>`; }).join('')
    : `<p class="mut small">${CR.tab === 'can' ? 'Con lo que llevas no puedes fabricar nada aquí. Prueba la pestaña ∗ Todo.' : CR.tab === 'fav' ? 'Marca recetas con ★ para tenerlas a mano.' : CR.tab === 'recent' ? 'Aún no has fabricado nada.' : 'Nada coincide.'}</p>`;
  renderCraftDet();
}
function renderCraftDet() {
  const D2 = $('crDet'); if (!D2) return; const r = BENCH[CR.sel];
  if (!r) { D2.innerHTML = '<p class="mut small">Elige una receta de la lista: verás qué necesitas, lo que te falta y podrás fabricarla de golpe. También puedes colocar los objetos a mano en el engranaje.</p>'; return; }
  const need = benchNeed(r), t = crTimes(r), usable = crUsable(r), it = ITEMS[r.out], fav = (S.favs || []).includes(r.key), bench = crMode() === 'bench';
  const ing = Object.keys(need).map(id => { const h = invCount(id), ok = h >= need[id]; return `<span class="ib ${ok ? 'own' : 'lack'}" data-id="${id}" data-go="${id}">${itemImg(id, 24)}<span class="q ${ok ? 'ok' : 'no'}">${Math.min(h, 99)}/${need[id]}</span></span>`; }).join('');
  const miss = Object.keys(need).filter(id => invCount(id) < need[id]);
  const why = r.tier > S.tier ? `🔒 Se desbloquea en el nivel ${r.tier + 1}` : !bench && !pocketOK(r) ? `⚙ Necesita el Banco de ensamblaje${r.rpm ? ` (≥${r.rpm} RPM)` : ''}` : miss.length ? `Falta: ${miss.map(id => `${need[id] - invCount(id)} ${ITEMS[id].n}`).join(', ')}` : bench ? `Lista para el banco${r.rpm ? ` · necesita ${r.rpm} RPM` : ''}` : `Puedes fabricar ${t}`;
  const chainOK = usable && miss.length > 0 && chainAll(need, 1);
  const gearMini = `<div class="crgear"><span class="mini core" data-id="${r.core}">${itemImg(r.core, 22)}</span>${r.teeth.map((tid, k) => `<span class="mini tooth" style="--a:${k * 60}deg" data-id="${tid}">${itemImg(tid, 18)}</span>`).join('')}</div>`;
  D2.innerHTML = `<div class="crtop2">${gearMini}<div class="crname"><span class="crout" data-id="${r.out}">${itemImg(r.out, 34)}</span><div><b>${esc(it.n)}</b> <span class="mut">×${r.n}</span><div class="small mut">${esc((it.d || '').split('. ')[0])}</div></div><button class="fav ${fav ? 'on' : ''}" data-cra="fav" title="Favorito">${fav ? '★' : '☆'}</button></div></div>
    <div class="cring">${ing}</div><div class="small ${miss.length || !usable ? 'bad' : 'good'}">${esc(why)}</div>${miss.length && usable ? crMissHTML(need, miss) : ''}
    <div class="crfacts">${itemFacts(r.out)}</div>
    <div class="crbtns">${chainOK ? `<button class="pri" data-cra="chain" title="Fabrica en el bolsillo los ingredientes intermedios que faltan y luego ${bench ? 'rellena el banco' : 'el objeto'}">⚡ ${bench ? 'Hacer lo que falta y rellenar' : 'Fabricar todo'}</button>` : ''}<button data-cra="fill" ${usable ? '' : 'disabled'} title="Coloca los ingredientes en el engranaje">⇢ Rellenar</button>${bench ? '' : `<button class="pri" data-cra="1" ${usable && t >= 1 ? '' : 'disabled'}>Fabricar</button><button data-cra="5" ${usable && t >= 5 ? '' : 'disabled'}>×5</button><button data-cra="max" ${usable && t >= 2 ? '' : 'disabled'}>Máx (${t})</button>`}<button data-cra="book" title="Ver en el recetario">📖</button></div>`;
}
// ¿Se pueden conseguir todos los que faltan fabricando lo intermedio en el bolsillo? (simulado, con lo mismo para todos)
function chainAll(need, times) { const pool = {}; for (const id in need) if (!chainPossible(id, need[id] * times, 0, pool)) return false; return true; }
// Una línea por ingrediente que falta: se puede fabricar ya (clic), en cadena, o de dónde sale
function crMissHTML(need, miss) {
  return `<div class="crmiss">${miss.slice(0, 3).map(id => {
    const n = need[id] - invCount(id), r = RECIPE_FOR[id], now = r && r.tier <= S.tier && pocketOK(r) && crTimes(r) * r.n >= n, chain = !now && chainPossible(id, need[id]);
    const act = now ? `<button class="mk" data-mkid="${id}" data-n="${need[id]}">🔨 Fabricar ${n}</button>` : chain ? `<button class="mk" data-mkid="${id}" data-n="${need[id]}">⚡ Fabricar ${n} en cadena</button>` : r && r.tier <= S.tier ? `<button class="mk ghost" data-pick="${id}">Ver receta</button>` : '';
    return `<div class="cm">${itemImg(id, 20)}<span class="cmn"><b>${n}</b> ${esc(ITEMS[id].n)}<span class="small mut"> ← ${sourceLine(id)}</span></span>${act}</div>`;
  }).join('')}</div>`;
}
// Fabricar directamente desde el inventario (bolsillo)
function craftDirect(r, k) {
  if (!crUsable(r)) return;
  let made = 0;
  for (let n = 0; n < k; n++) {
    const need = benchNeed(r); if (Object.keys(need).some(id => invCount(id) < need[id])) break;
    if (slotsAdd(S.inv, r.out, r.n, true) > 0) { toastErr('Inventario lleno'); break; }
    const keep = Math.random() < 0.03 * lvOf('craft') + CM().craftKeep;
    for (const id in need) invTake(id, need[id] - (keep && id === r.core ? 1 : 0));
    invAdd(r.out, r.n); made++; gainXP('craft', 2);
  }
  if (!made) return;
  const rec = S.recent || (S.recent = []); const i = rec.indexOf(r.key); if (i >= 0) rec.splice(i, 1); rec.unshift(r.key); if (rec.length > 16) rec.pop();
  toast(`Fabricado: ${made * r.n} × ${ITEMS[r.out].n}`); sfx('beep');
  const g = document.querySelector('#invRight .gear'); if (g) { g.classList.remove('spin'); void g.offsetWidth; g.classList.add('spin'); }
  invVersion++; refreshInvUI(true);
}
// Siluetas de los ingredientes en las ranuras vacías del engranaje
function craftGhosts() {
  const r = BENCH[CR.sel], bench = crMode() === 'bench';
  const keys = bench ? ['c:0', 'c:1', 'c:2', 'c:3', 'c:4', 'c:5', 'c:6'] : ['pk:0', 'pk:1', 'pk:2', 'pk:3'];
  const want = r && crUsable(r) ? [r.core, ...r.teeth] : [];
  keys.forEach((k, i) => {
    const el = document.querySelector(`#mInv .s[data-k="${k}"]`); if (!el) return;
    const ref = slotRef(k), g = !ref.get() && want[i] ? want[i] : '';
    if (el.dataset.gh === g) return; el.dataset.gh = g;
    let gi = el.querySelector('.gh'); if (!g) { if (gi) gi.remove(); return; }
    if (!gi) { gi = document.createElement('i'); gi.className = 'ic gh'; el.appendChild(gi); }
    gi.setAttribute('style', iconStyle(g));
  });
}
$('mInv').addEventListener('click', e => {
  const t = e.target.closest('[data-crt]'); if (t) { CR.tab = t.dataset.crt; document.querySelectorAll('[data-crt]').forEach(b => b.classList.toggle('on', b === t)); renderCraft(true); return; }
  const it = e.target.closest('[data-cr]'); if (it) { CR.sel = +it.dataset.cr; if (e.detail === 2 && crMode() === 'pocket') craftDirect(BENCH[CR.sel], 1); renderCraft(true); craftGhosts(); return; }
  // Ingrediente que falta: fabricarlo ya (en cadena si hace falta) o saltar a su receta
  const mk = e.target.closest('[data-mkid]');
  if (mk) { const id = mk.dataset.mkid; if (ensureItem(id, +mk.dataset.n)) { toast(`⚡ Listo: ${ITEMS[id].n}`); if (crMode() === 'bench') { const r0 = BENCH[CR.sel]; if (r0) { fillRecipe(r0, ui.panel.slots, [0, 1, 2, 3, 4, 5, 6]); } } } else toastErr('No se pudo fabricar: falta material base'); invVersion++; refreshInvUI(true); renderCraft(true); craftGhosts(); return; }
  const pk = e.target.closest('[data-pick], #crDet [data-go]');
  if (pk) { const id = pk.dataset.pick || pk.dataset.go, i = BENCH.indexOf(RECIPE_FOR[id]); if (i >= 0) { CR.sel = i; if (CR.tab === 'can' && crTimes(BENCH[i]) < 1) CR.tab = 'all'; document.querySelectorAll('[data-crt]').forEach(b => b.classList.toggle('on', b.dataset.crt === CR.tab)); renderCraft(true); craftGhosts(); } else { closeModal(); openBook(); goBook('i:' + id); } return; }
  const a = e.target.closest('[data-cra]'); if (!a || a.disabled) return; const r = BENCH[CR.sel]; if (!r) return;
  switch (a.dataset.cra) {
    case 'fav': { const f = S.favs || (S.favs = []), i = f.indexOf(r.key); if (i >= 0) f.splice(i, 1); else f.push(r.key); renderCraft(true); break; }
    case 'fill': if (crMode() === 'bench') { const b = ui.panel; fillRecipe(r, b.slots, [0, 1, 2, 3, 4, 5, 6]); if (r.cat) moveInto(b.slots, 7, r.cat, 8); } else fillRecipe(r, ui.pocket, [0, 1, 2, 3]); refreshInvUI(true); renderCraft(true); break;
    case 'chain': { const need = benchNeed(r); let ok = true; for (const id in need) if (!ensureItem(id, need[id])) { ok = false; break; }
      if (!ok) { toastErr('No se pudo completar la cadena'); break; }
      if (crMode() === 'bench') { fillRecipe(r, ui.panel.slots, [0, 1, 2, 3, 4, 5, 6]); if (r.cat) moveInto(ui.panel.slots, 7, r.cat, 8); toast('⚡ Ingredientes hechos y colocados en el banco'); } else { craftDirect(r, 1); }
      refreshInvUI(true); renderCraft(true); craftGhosts(); break; }
    case '1': craftDirect(r, 1); break;
    case '5': craftDirect(r, 5); break;
    case 'max': craftDirect(r, 999); break;
    case 'book': closeModal(); openBook(); goBook('i:' + r.out); break;
  }
});
$('mInv').addEventListener('input', e => { if (e.target.id === 'crQ') { CR.q = e.target.value; renderCraft(true); } });
