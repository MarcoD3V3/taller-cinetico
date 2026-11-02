'use strict';
// =====================================================================================
//  Encargos de los aldeanos.
//  · Cada día hay encargos nuevos en el Tablón de encargos (bloque: tablones + palo) o hablando
//    con cualquier aldeano: traer cosas, cazar, pescar, cosechar, picar o despejar una mazmorra.
//  · Aceptas hasta 3 a la vez. El progreso se ve siempre (tecla Y), pero para aceptar y cobrar hay
//    que estar en el tablón o con un aldeano.
//  · Pagan monedas y aprecio. Con más aprecio, los aldeanos te hacen rebaja en sus tiendas.
//    Más aldeanos viviendo en tus casas = más encargos para elegir cada día.
// =====================================================================================
const QB_MAX = 3;
const QB_NAMES = ['la granjera Marta', 'el viejo Tomás', 'la pequeña Lía', 'el guarda Bruno', 'la tabernera Rosa', 'el pescador Iker', 'la herbolaria Nuria', 'el leñador Ramón', 'la abuela Carmen', 'el minero Darío'];
const QB_FETCH = [['log', 20, 40], ['stone', 30, 64], ['coal', 10, 24], ['ironOre', 8, 16], ['copperOre', 8, 16], ['wheat', 10, 24], ['carrot', 8, 20], ['potato', 8, 20], ['cookedMeat', 5, 12], ['leather', 4, 10], ['wool', 4, 10], ['feather', 6, 14], ['bone', 6, 14], ['slimeGel', 6, 14], ['flour', 6, 12], ['planks', 20, 40], ['trout', 5, 20], ['carp', 5, 15], ['salmon', 3, 10]];
const qbData = () => S.qb || (S.qb = { day: -1, offers: [], on: [], rep: 0, done: 0, reroll: -1, seq: 0 });
function repLevel() { const r = S ? qbData().rep : 0; let i = 0; while (i + 1 < REP_LV.length && r >= REP_LV[i + 1][0]) i++; return i; }
const repDisc = () => S && S.qb ? REP_LV[repLevel()][2] : 0;
const qbGiver = () => { const n = (S.npcs || []).filter(x => NPCS[x.type]); if (n.length && Math.random() < 0.6) return 'el ' + NPCS[n[(Math.random() * n.length) | 0].type].n.toLowerCase().replace(/^el |^la /, ''); return QB_NAMES[(Math.random() * QB_NAMES.length) | 0]; };
// Enemigos «de base» que hay por el mundo (cuentan todas sus variantes)
const qbFoeBase = k => { for (const a of ARCH) { const id = a[0]; if (k === id || (k.startsWith(id) && /^[A-Z]/.test(k.slice(id.length)))) return id; } return k; };
function qbMake() {
  const Q = qbData(), tier = S.tier || 0, mul = 1 + tier * 0.35, r = Math.random(), giver = qbGiver(), id = ++Q.seq;
  const kinds = ['fetch', 'fetch', 'kill', 'kill', 'fish', 'crop', 'mine', 'dungeon'], k = kinds[(Math.random() * kinds.length) | 0];
  if (k === 'fetch') { const L = QB_FETCH.filter(([i]) => ITEMS[i]), [it, a, b] = L[(Math.random() * L.length) | 0], n = a + ((Math.random() * (b - a)) | 0);
    return { id, k, it, n, prog: 0, giver, txt: `Trae ${n} × ${ITEMS[it].n}`, coin: Math.round((8 + n * 0.5) * mul), rep: 8 }; }
  if (k === 'kill') { const L = ARCH.filter(a => (a[11].tier || 0) <= tier + 1 && ENEMIES[a[0]] && !/mimic/.test(a[0])), a = L[(Math.random() * L.length) | 0], n = 5 + ((Math.random() * 11) | 0);
    return { id, k, foe: a[0], n, prog: 0, giver, txt: `Derrota a ${n} × ${ENEMIES[a[0]].n} (cualquier variante)`, coin: Math.round((10 + n * 2) * mul), rep: 10 }; }
  if (k === 'fish') { const n = 5 + ((Math.random() * 10) | 0); return { id, k, n, prog: 0, giver, txt: `Pesca ${n} veces`, coin: Math.round((8 + n * 1.5) * mul), rep: 8 }; }
  if (k === 'crop') { const n = 10 + ((Math.random() * 20) | 0); return { id, k, n, prog: 0, giver, txt: `Cosecha ${n} cultivos maduros`, coin: Math.round((8 + n) * mul), rep: 8 }; }
  if (k === 'mine') { const n = 40 + ((Math.random() * 80) | 0); return { id, k, n, prog: 0, giver, txt: `Pica ${n} bloques de roca`, coin: Math.round((8 + n * 0.25) * mul), rep: 8 }; }
  const e = typeof dgPickTarget === 'function' ? dgPickTarget() : null; if (!e) return qbMake();
  const dx = e.x * T - S.player.x, dy = e.y * T - S.player.y, dir = ['este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste', 'norte', 'noreste'][((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
  return { id, k: 'dungeon', ent: e.key, n: 1, prog: 0, giver, txt: `Despeja ${e.name} (nivel ${e.lvl}), a unas ${Math.round(Math.hypot(dx, dy) / T)} casillas al ${dir}`, coin: Math.round((60 + e.lvl * 50) * mul), rep: 20 + e.lvl * 4, x: e.x, y: e.y };
}
function qbRefresh(force) {
  const Q = qbData(), day = dgDay(); if (Q.day === day && !force) return; Q.day = day;
  const n = Math.min(5, 3 + Math.floor((S.npcs || []).length / 2)), sig = q => q.k + (q.it || q.foe || q.ent || ''); Q.offers = [];
  for (let i = 0, tries = 0; Q.offers.length < n && tries < 40; tries++) { const q = qbMake(); if (Q.offers.concat(Q.on).some(o => sig(o) === sig(q) || o.giver === q.giver) && tries < 30) continue; Q.offers.push(q); } // sin repetir encargo ni quién lo pide
}
// ---------- Progreso ----------
function questEvent(kind, d) {
  if (!S || !S.qb) return; let any = false;
  for (const q of S.qb.on) { if (q.prog >= q.n) continue;
    const hit = (q.k === kind && kind !== 'kill' && kind !== 'dungeon') || (kind === 'kill' && q.k === 'kill' && qbFoeBase(d.k) === q.foe) || (kind === 'dungeon' && q.k === 'dungeon' && d && d.key === q.ent);
    if (!hit) continue; q.prog++; any = true;
    if (q.prog >= q.n) { toast(`📜 Encargo cumplido: «${q.txt.split(' (')[0]}». Ve al tablón o a un aldeano a cobrar.`, true); tone(700, 0.15, 'triangle', 0.05, 1.3); } }
  if (any) qbTrack();
}
{ const k0 = killFoe; killFoe = f => { const was = FOES.includes(f); k0(f); if (was && !FOES.includes(f) && !f.clone && !f.summoned && !f.small) questEvent('kill', f); }; }
{ const g0 = gainXP; gainXP = (k, n) => { if (n) { if (k === 'fish') questEvent('fish'); else if (k === 'mining') questEvent('mine'); } return g0(k, n); }; }
{ const h0 = harvestCrop; harvestCrop = (b, o) => { const ripe = b && CROP[b.crop] && cropStage(b) >= 3; const r = h0(b, o); if (ripe) questEvent('crop'); return r; }; }
// ---------- Aceptar, entregar y cobrar ----------
function qbAccept(id) { const Q = qbData(), i = Q.offers.findIndex(q => q.id === id); if (i < 0) return; if (Q.on.length >= QB_MAX) { toastErr(`Como mucho ${QB_MAX} encargos a la vez`); return; } const q = Q.offers.splice(i, 1)[0]; if (q.k === 'fetch') q.prog = Math.min(q.n, invCount(q.it)); Q.on.push(q); toast(`📜 Aceptas el encargo de ${q.giver}: ${q.txt}`); qbTrack(); }
function qbClaim(id) {
  const Q = qbData(), i = Q.on.findIndex(q => q.id === id); if (i < 0) return; const q = Q.on[i];
  if (q.k === 'fetch') { if (invCount(q.it) < q.n) { toastErr(`Te faltan ${q.n - invCount(q.it)} × ${ITEMS[q.it].n}`); return; } invTake(q.it, q.n); }
  else if (q.prog < q.n) { toastErr('Aún no has terminado este encargo'); return; }
  Q.on.splice(i, 1); const lv0 = repLevel(); Q.rep += q.rep; Q.done++; const lost = invAdd('coin', q.coin); invVersion++;
  toast(`💰 ${q.giver} te paga ${q.coin} monedas · +${q.rep} de aprecio${lost ? ' (inventario lleno)' : ''}`, true); sfx('beep'); sparkRing(S.player.x, S.player.y - 10, 20, '#ffd34a', 100, { up: 40 });
  const lv = repLevel(); if (lv > lv0) setTimeout(() => wvBanner(`❤ Ahora eres «${REP_LV[lv][1]}»`, `Los aldeanos te hacen un ${Math.round(REP_LV[lv][2] * 100)} % de rebaja`, '#ff9ab0', 3.5), 600);
  if (typeof achAdd === 'function') achAdd('quests'); qbTrack();
}
function qbAbandon(id) { const Q = qbData(), i = Q.on.findIndex(q => q.id === id); if (i >= 0) { Q.on.splice(i, 1); toast('Encargo abandonado'); qbTrack(); } }
function qbReroll() { const Q = qbData(), d = dgDay(); if (Q.reroll === d) { toastErr('Ya pediste otros encargos hoy: vuelve mañana'); return; } Q.reroll = d; qbRefresh(true); toast('Los aldeanos tienen otros encargos para ti'); }
// ---------- Tablón y aldeanos ----------
{ const i0 = interact; interact = (shift, ctrl) => { const b = S && at(mouse.tx, mouse.ty); if (b && b.type === 'questBoard') { advOpen('quest', true); return; } return i0(shift, ctrl); }; }
{ const r0 = renderTrade; renderTrade = () => { r0(); const h = $('tradeBody').querySelector('header .row'); if (h && !h.querySelector('[data-qopen]')) h.insertAdjacentHTML('afterbegin', '<button data-qopen>📜 Encargos</button>'); }; }
document.addEventListener('click', e => { const b = e.target.closest('[data-qopen],[data-qacc],[data-qclaim],[data-qdrop],[data-qreroll]'); if (!b || !S) return;
  if (b.dataset.qopen !== undefined) { advOpen('quest', true); return; }
  if (!ADV.at) { toastErr('Para eso ve al Tablón de encargos o habla con un aldeano'); return; }
  if (b.dataset.qacc) qbAccept(+b.dataset.qacc); else if (b.dataset.qclaim) qbClaim(+b.dataset.qclaim); else if (b.dataset.qdrop) qbAbandon(+b.dataset.qdrop); else if (b.dataset.qreroll !== undefined) qbReroll();
  advRender(); });
ADV.tabs.quest = { n: '📜 Encargos', render() {
  qbRefresh(); const Q = qbData(), lv = repLevel(), L = REP_LV[lv], nx = REP_LV[lv + 1], p = nx ? (Q.rep - L[0]) / (nx[0] - L[0]) : 1, at = ADV.at;
  const prog = q => { const v = q.k === 'fetch' ? Math.min(q.n, invCount(q.it)) : q.prog; return [v, v >= q.n]; };
  const row = (q, on) => { const [v, ok] = prog(q); return `<div class="qc ${on && ok ? 'ok' : ''}"><div class="qt"><small>Encargo de ${esc(q.giver)}</small><b>${esc(q.txt)}</b>${on ? `<div class="ab"><i style="transform:scaleX(${(v / q.n).toFixed(3)})"></i></div><span class="av">${v} / ${q.n}</span>` : ''}</div><div class="qr"><span>${itemImg('coin', 14)} ${q.coin}</span><span>❤ ${q.rep}</span></div>
    <div class="qb">${on ? `<button class="${ok ? 'pri' : ''}" data-qclaim="${q.id}" ${at ? '' : 'disabled'}>${q.k === 'fetch' ? 'Entregar' : 'Cobrar'}</button><button data-qdrop="${q.id}" title="Abandonar">✕</button>` : `<button data-qacc="${q.id}" ${at && Q.on.length < QB_MAX ? '' : 'disabled'}>Aceptar</button>`}</div></div>`; };
  return `<div class="reptop"><div><b>❤ ${L[1]}</b> <span class="mut">· ${Q.rep} de aprecio${nx ? ` · ${nx[0] - Q.rep} más para «${nx[1]}»` : ' · ¡el máximo!'}</span></div><div class="ab"><i style="transform:scaleX(${p.toFixed(3)})"></i></div><small class="mut">${L[2] ? `Rebaja en las tiendas de los aldeanos: ${Math.round(L[2] * 100)} %` : 'Con más aprecio, los aldeanos te hacen rebaja en sus tiendas'} · Encargos cumplidos: ${Q.done}</small></div>
    ${at ? '' : '<p class="advwarn">Aquí solo ves tu progreso. Para aceptar o cobrar, ve a un <b>Tablón de encargos</b> (se fabrica con tablones y un palo) o habla con un aldeano.</p>'}
    <h4 class="cxh">En curso <small>${Q.on.length} / ${QB_MAX}</small></h4>${Q.on.length ? `<div class="qlist">${Q.on.map(q => row(q, true)).join('')}</div>` : '<p class="mut">Ninguno. Acepta alguno de abajo.</p>'}
    <h4 class="cxh">Encargos de hoy <small>${(S.npcs || []).length ? `más aldeanos en tus casas = más encargos` : 'atrae aldeanos a tus casas para tener más'}</small></h4>${Q.offers.length ? `<div class="qlist">${Q.offers.map(q => row(q, false)).join('')}</div>` : '<p class="mut">Ya has cogido todos los de hoy. Mañana habrá más.</p>'}
    <div class="row gap" style="margin-top:8px"><button data-qreroll ${at ? '' : 'disabled'}>🔄 Pedir otros encargos (una vez al día)</button></div>`;
} };
// ---------- Lista de encargos en pantalla ----------
function qbTrack() {
  let e = $('qTrack'); if (!e) { e = document.createElement('div'); e.id = 'qTrack'; document.body.appendChild(e); }
  const on = S && S.qb ? S.qb.on : [], show = on.length && !ui.open && !(DGX && DGX.run); e.hidden = !show; if (!show) return;
  const h = on.map(q => { const v = q.k === 'fetch' ? Math.min(q.n, invCount(q.it)) : q.prog; return `<div class="${v >= q.n ? 'ok' : ''}"><span>${esc(q.txt.split(' (')[0].split(', a unas')[0])}</span><b>${v >= q.n ? '✓' : v + '/' + q.n}</b></div>`; }).join('');
  if (e._h !== h) { e._h = h; e.innerHTML = `<small>📜 Encargos</small>${h}`; }
}
{ let t = 0; const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); if (S && (t -= fdt) <= 0) { t = 0.5; qbTrack(); } }; }
cmd('encargos', { a: ['misiones', 'quests'], u: '/encargos', d: 'Muestra tus encargos de los aldeanos.', run() { advOpen('quest'); } });
