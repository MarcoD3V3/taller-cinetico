'use strict';
// Inventario con ranuras (clic, clic derecho = mitad/uno, Shift+clic = mover rápido),
// banco de bolsillo y paneles de bloques (cofres, banco, máquinas, configuración).
const MODE_N = ['Ambos', 'Entrada', 'Salida', 'Bloqueada'];
const RS_N = ['Ignorar redstone', 'Parar con señal', 'Solo con señal'];
let _panelVer = 0;
function slotHTML(k, cls = '') { return `<div class="s ${cls}" data-k="${k}"><i class="ic"></i><span class="n"></span></div>`; }

// ---------- Acceso genérico a ranuras ----------
function arrRef(arr, i, canPut, out) { return { get: () => arr[i], set: v => { arr[i] = v && v.n > 0 ? v : null; }, canPut: canPut || (() => true), out }; }
function slotRef(key) {
  const [kind, a] = key.split(':'), b = ui.panel;
  switch (kind) {
    case 'inv': return arrRef(S.inv, +a);
    case 'pk': return arrRef(ui.pocket, +a);
    case 'c': if (!b || !b.slots) return null;
      if (b.type === 'bench') return arrRef(b.slots, +a, null, +a === 8);
      return arrRef(b.slots, +a);
    case 'mi': return { machineIn: 1, get: () => a && b.inv[a] ? { id: a, n: b.inv[a] } : null, set: v => { if (!v) delete b.inv[a]; else b.inv[v.id] = v.n; } };
    case 'mo': return { out: 1, get: () => b.out[a] ? { id: a, n: b.out[a] } : null, set: v => { if (!v) delete b.out[a]; else b.out[a] = v.n; } };
    case 'dp': return { get: () => b.item, set: v => { b.item = v && v.n > 0 ? v : null; }, canPut: id => !b.item || b.item.id === id };
    case 'flt': return { filter: 1 };
    case 'eq': return { eq: a, get: () => S.equip && S.equip[a] ? { id: S.equip[a], n: 1 } : null, set: v => { S.equip[a] = v ? v.id : null; }, canPut: id => slotAccepts(a, id) };
  }
  return null;
}
function handAccepts(b, id) {
  const d = BD[b.type];
  if (d.fuel && d.fuel.includes(id)) return true;
  if (b.type === 'furnace' && id === 'coal') return true;
  if (d.machine) return MACHINE_INPUTS[d.machine].has(id);
  if (b.type === 'assembler') { const r = BENCH[b.recipe]; return !!(r && benchReq(r)[id]); }
  return false;
}
function insertHeldInto(b) {
  const h = ui.held; if (!h) return;
  if (!handAccepts(b, h.id)) { toastErr(BD[b.type].n + ' no acepta ' + ITEMS[h.id].n); return; }
  const m = Math.min(h.n, 64 - (b.inv[h.id] || 0)); if (m <= 0) return;
  dictAdd(b.inv, h.id, m); h.n -= m; if (h.n <= 0) ui.held = null;
}
// Clic simple sobre una ranura (estilo Minecraft):
//  izquierdo: coger pila / soltar pila / juntar / intercambiar
//  derecho:   coger la mitad / soltar uno
function slotClick(key, btn) {
  const r = slotRef(key); if (!r) return;
  if (r.filter) { ui.panel.filter = ui.held ? ui.held.id : null; _panelVer++; return; }
  if (r.eq) { // ranuras de armadura: una pieza por ranura
    charData(); const old = S.equip[r.eq], h = ui.held;
    if (h) { if (!r.canPut(h.id)) { toastErr('Ahí solo va: ' + EQ_N[slotType(r.eq)].toLowerCase()); return; } S.equip[r.eq] = h.id; if (--h.n <= 0) ui.held = old ? { id: old, n: 1 } : null; else if (old) invAdd(old, 1); }
    else if (old) { ui.held = { id: old, n: 1 }; S.equip[r.eq] = null; }
    return done();
  }
  if (r.machineIn && ui.held) {
    const b = ui.panel, h = ui.held;
    if (!handAccepts(b, h.id)) toastErr(BD[b.type].n + ' no acepta ' + ITEMS[h.id].n);
    else { const m = Math.min(btn === 1 ? 1 : h.n, 64 - (b.inv[h.id] || 0)); if (m > 0) { dictAdd(b.inv, h.id, m); h.n -= m; if (!h.n) ui.held = null; } }
    return done();
  }
  const s = r.get(), h = ui.held;
  if (r.out) {
    if (!s) return;
    if (!h) { ui.held = { id: s.id, n: s.n }; r.set(null); }
    else if (h.id === s.id && h.n + s.n <= STACK) { h.n += s.n; r.set(null); }
    return done();
  }
  const can = id => !r.canPut || r.canPut(id);
  if (btn === 0) {
    if (!h) { if (s) { ui.held = { id: s.id, n: s.n }; r.set(null); } }
    else if (!s) { if (can(h.id)) { r.set({ id: h.id, n: h.n }); ui.held = null; } }
    else if (s.id === h.id) { const m = Math.min(STACK - s.n, h.n); s.n += m; h.n -= m; if (!h.n) ui.held = null; r.set(s); }
    else if (can(h.id) && !r.machineIn) { r.set({ id: h.id, n: h.n }); ui.held = { id: s.id, n: s.n }; }
  } else {
    if (!h) { if (s) { const half = Math.ceil(s.n / 2); ui.held = { id: s.id, n: half }; s.n -= half; r.set(s.n ? s : null); } }
    else if (!s) { if (can(h.id)) { r.set({ id: h.id, n: 1 }); if (--h.n <= 0) ui.held = null; } }
    else if (s.id === h.id && s.n < STACK) { s.n++; r.set(s); if (--h.n <= 0) ui.held = null; }
  }
  done();
}
// Mover a mano nunca reordena el inventario
function done() { invVersion++; _panelVer++; refreshHeld(); }
// Añade n objetos al "otro lado" de una ranura (inventario ↔ bloque abierto, o barra ↔ mochila).
// Devuelve lo que no cupo.
function addToOther(key, id, n) {
  const kind = key.split(':')[0], b = ui.panel;
  if (kind !== 'inv') return slotsAdd(S.inv, id, n, false, FILL_ORDER);
  const i = +key.split(':')[1];
  if (b && b.slots && b.type !== 'bench') return slotsAdd(b.slots, id, n);
  if (b && b.type === 'bench') {
    const sl = b.slots; let left = n;
    for (let j = 0; j <= 6 && left > 0; j++) if (sl[j] && sl[j].id === id) { const m = Math.min(STACK - sl[j].n, left); sl[j].n += m; left -= m; }
    for (let j = 0; j <= 6 && left > 0; j++) if (!sl[j]) { sl[j] = { id, n: left }; left = 0; }
    return left;
  }
  if (b && b.inv) { if (!handAccepts(b, id)) return n; const m = Math.min(n, 64 - (b.inv[id] || 0)); if (m > 0) dictAdd(b.inv, id, m); return n - m; }
  if (b && b.type === 'depot') { if (!b.item) { const m = Math.min(n, STACK); b.item = { id, n: m }; return n - m; } if (b.item.id !== id) return n; const m = Math.min(STACK - b.item.n, n); b.item.n += m; return n - m; }
  // Sin bloque abierto: de la barra rápida a la mochila y al revés
  const dst = i < 9 ? range(9, INV_N) : range(0, 9), sub = dst.map(j => S.inv[j]);
  const left = slotsAdd(sub, id, n); dst.forEach((j, k) => S.inv[j] = sub[k]); return left;
}
// Mueve hasta n objetos de una ranura al otro lado (Shift+clic = todos)
function sendToOther(key, n = Infinity) {
  const r = slotRef(key); if (!r || r.filter) return false;
  const s = r.get(); if (!s) return false;
  const m = Math.min(n, s.n), id = s.id, rest = s.n - m;
  r.set(null); // libera la ranura antes, para que no se sume a sí misma
  const notFit = addToOther(key, id, m), left = rest + notFit;
  r.set(left > 0 ? { id, n: left } : null);
  if (notFit === m) toastErr('No cabe en el otro lado');
  return notFit < m;
}
function quickMove(key) { if (key === 'pko') return craftPocket(true);
  if (key.startsWith('eq:')) { unequip(key.slice(3)); return done(); }
  if (key.startsWith('inv:') && !ui.panel) { const s = S.inv[+key.slice(4)]; if (s && (ITEMS[s.id].armor || ITEMS[s.id].gear)) { const id = s.id; if (--s.n <= 0) S.inv[+key.slice(4)] = null; equipItem(id, 'held'); return done(); } } sendToOther(key); done(); }
// Ranuras del mismo "lado" que una clave (para mover todo o juntar)
function sideKeys(key) {
  const kind = key.split(':')[0], b = ui.panel;
  if (kind === 'inv') return range(0, INV_N).map(i => 'inv:' + i);
  if (kind === 'c' && b && b.slots) return range(0, b.type === 'bench' ? 8 : b.slots.length).map(i => 'c:' + i);
  if (kind === 'pk') return range(0, 4).map(i => 'pk:' + i);
  return [key];
}
// Ctrl+clic (o Shift+doble clic): mueve todas las pilas de ese tipo
function moveAllOfType(key) {
  const s = slotRef(key) && slotRef(key).get(); if (!s) return;
  for (const k of sideKeys(key)) { const t = slotRef(k).get(); if (t && t.id === s.id) sendToOther(k); }
  done();
}
// Doble clic con una pila en la mano: junta todas las del mismo tipo (pilas pequeñas primero)
function collectSame() {
  const h = ui.held; if (!h) return;
  const keys = [...range(0, INV_N).map(i => 'inv:' + i)];
  if (ui.panel && ui.panel.slots) keys.push(...range(0, ui.panel.type === 'bench' ? 8 : ui.panel.slots.length).map(i => 'c:' + i));
  if (!ui.panel) keys.push('pk:0', 'pk:1', 'pk:2', 'pk:3');
  const refs = keys.map(slotRef).filter(r => r && r.get() && r.get().id === h.id).sort((a, b) => a.get().n - b.get().n);
  for (const r of refs) { if (h.n >= STACK) break; const s = r.get(), m = Math.min(STACK - h.n, s.n); h.n += m; s.n -= m; r.set(s.n ? s : null); }
  done();
}
// Teclas 1-9 sobre una ranura: intercambia con esa ranura de la barra rápida
function swapWithHotbar(key, i) {
  const r = slotRef(key); if (!r || r.filter || r.machineIn || key === 'inv:' + i) return;
  const s = r.get(), h = S.inv[i];
  if (r.out) { if (!s || (h && (h.id !== s.id || h.n + s.n > STACK))) return; S.inv[i] = h ? { id: h.id, n: h.n + s.n } : { id: s.id, n: s.n }; r.set(null); return done(); }
  if (h && r.canPut && !r.canPut(h.id)) return;
  r.set(h ? { id: h.id, n: h.n } : null); S.inv[i] = s ? { id: s.id, n: s.n } : null; done();
}
// Rueda del ratón sobre una ranura: abajo = manda 1 al otro lado; arriba = trae 1 igual
function wheelSlot(key, down) {
  const r = slotRef(key); if (!r || r.filter) return;
  if (down) { if (sendToOther(key, 1)) done(); return; }
  const s = r.get(); if (!s || s.n >= STACK || r.out || r.machineIn) return;
  const kind = key.split(':')[0], b = ui.panel;
  let src = [];
  if (kind !== 'inv') src = range(0, INV_N).map(i => 'inv:' + i);
  else if (b && b.slots && b.type !== 'bench') src = range(0, b.slots.length).map(i => 'c:' + i);
  else if (b && b.out) src = Object.keys(b.out).map(k => 'mo:' + k);
  else { const i = +key.split(':')[1]; src = (i < 9 ? range(9, INV_N) : range(0, 9)).map(j => 'inv:' + j); }
  for (const k of src) { const rr = slotRef(k), t = rr && rr.get(); if (t && t.id === s.id) { t.n--; rr.set(t.n ? t : null); s.n++; r.set(s); return done(); } }
}
// ---------- Banco de bolsillo (núcleo + 3 dientes, sin rotación) ----------
function pocketRecipe() {
  const p = ui.pocket; if (!p[0]) return null;
  const r = benchMatch(p[0].id, p.slice(1).filter(Boolean).map(s => s.id));
  return r && pocketOK(r) && r.tier <= S.tier ? r : null;
}
function craftPocket(all) {
  let made = 0;
  do {
    const r = pocketRecipe(); if (!r) break;
    if (all) { if (slotsAdd(S.inv, r.out, r.n, true) > 0) { toastErr('Inventario lleno'); break; } }
    else if (ui.held && (ui.held.id !== r.out || ui.held.n + r.n > STACK)) break;
    const keep = Math.random() < 0.03 * lvOf('craft') + CM().craftKeep;
    for (let i = keep ? 1 : 0; i < 4; i++) { const s = ui.pocket[i]; if (s && --s.n <= 0) ui.pocket[i] = null; }
    gainXP('craft', 2);
    if (all) invAdd(r.out, r.n); else if (ui.held) ui.held.n += r.n; else ui.held = { id: r.out, n: r.n };
    made++;
  } while (all && made < 64);
  done();
}
// Mete en la máquina una pila (o todo con Shift) de un objeto del inventario
function feedMachine(b, id, all) {
  const n = Math.min(64 - (b.inv[id] || 0), all ? invCount(id) : Math.min(STACK, invCount(id)));
  if (n <= 0) { toastErr('La máquina ya tiene bastante ' + ITEMS[id].n); return; }
  dictAdd(b.inv, id, invTake(id, n)); done();
}
// ---------- Apertura ----------
function openInventory(b) {
  closeModal(); ui.open = 'inv'; ui.panel = b || null;
  $('mInv').hidden = false; buildInvPanel(); mouse.down = mouse.rdown = false;
}
function closeInventory() {
  if (ui.held) { const l = invAdd(ui.held.id, ui.held.n); if (l) toast('Inventario lleno: se perdieron ' + l + ' objetos'); ui.held = null; }
  for (let i = 0; i < 4; i++) if (ui.pocket[i]) { invAdd(ui.pocket[i].id, ui.pocket[i].n); ui.pocket[i] = null; }
  ui.panel = null; refreshHeld(); hideTip();
}
function buildInvPanel() {
  let h = `<header class="invhead"><h2>Inventario</h2><div class="invtools"><label class="invsearch ${ui.invQ ? 'on' : ''}" title="Buscar en la mochila"><span>🔎</span><input type="search" id="invQ" placeholder="Buscar…" aria-label="Buscar en el inventario" value="${esc(ui.invQ || '')}"></label><button id="bSort" class="ico" title="Ordenar la mochila (O)">⇅</button><button data-close class="ico" title="Cerrar (Esc)">✕</button></div></header>`;
  h += equipPanelHTML();
  h += `<div class="invgrid">`; for (let i = 9; i < INV_N; i++) h += slotHTML('inv:' + i); h += `</div><div class="invgrid hot">`; for (let i = 0; i < 9; i++) h += slotHTML('inv:' + i); h += `</div>`;
  h += `<details class="hints"><summary>Opciones y controles</summary><label class="chk" title="Ordena la mochila al recoger un objeto nuevo (nunca mientras la tienes abierta)"><input type="checkbox" id="autoSort" ${S.autoSort ? 'checked' : ''}> Ordenar la mochila al recoger</label><ul>
    <li><b>Clic</b>: coger / soltar / juntar / intercambiar · <b>Clic derecho</b>: coger la mitad / soltar uno</li>
    <li><b>Arrastrar</b> con una pila: reparte a partes iguales · <b>con clic derecho</b>: deja 1 en cada ranura</li>
    <li><b>Doble clic</b>: junta en la mano todas las del mismo tipo</li>
    <li><b>Shift+clic</b>: mover al otro lado · <b>Shift+arrastrar</b>: mover varias · <b>Ctrl+clic</b>: mover todas las de ese tipo</li>
    <li><b>Rueda</b> sobre una ranura: abajo manda 1 al otro lado, arriba trae 1 · <b>1–9</b> sobre una ranura: intercambia con la barra</li>
    <li><b>L</b> sobre una ranura: suelta 1 al suelo · <b>Shift+L</b>: la pila entera · o arrástrala a «Soltar al suelo»</li>
    <li>Lo que recoges va primero a un hueco libre de la barra rápida · <b>O</b>: ordenar la mochila</li>
    <li>Clic fuera de las ventanas: devuelve lo que llevas en la mano</li></ul></details>`;
  $('invLeft').innerHTML = h;
  $('invRight').innerHTML = ui.panel ? blockPanelHTML(ui.panel) : pocketHTML();
  if (ui.panel) stationOpen(ui.panel);
  _panelVer++; CR.ver = -1; refreshInvUI(true);
}
function pocketHTML() {
  return `<h3>Mesa de bolsillo</h3><div class="pkrow"><div class="gear small3">${slotHTML('pk:0', 'core')}${slotHTML('pk:1', 't t0')}${slotHTML('pk:2', 't t2')}${slotHTML('pk:3', 't t4')}</div>
  <div class="pkout"><span class="mut">→</span>${slotHTML('pko', 'outslot')}<span id="pkName" class="mut small"></span><span class="mut small">Clic: fabricar · Shift: todo</span></div></div>
  ${craftHTML()}`;
}
function cfgHTML(b) {
  const d = BD[b.type]; let h = '';
  const row = (lab, ctl) => `<div class="cfg"><span>${lab}</span>${ctl}</div>`;
  if (d.dir || d.kin === 'axis') h += row('Orientación', `<span class="row gap"><button data-act="rot:-1">⟲</button><span class="num">${DIR_N[b.dir]}</span><button data-act="rot:1">⟳</button></span>`);
  if (d.rsable || d.machine || d.inv || d.kin) h += row('Funcionamiento', `<button data-act="off">${b.off ? 'Apagado' : 'Encendido'}</button>`);
  if (d.rsable) h += row('Redstone', `<button data-act="rs">${RS_N[b.rs || 0]}</button>`);
  if (d.cfg) for (const p of d.cfg) h += row(PARAMS[p].n, `<span class="row gap"><button data-act="cfg:${p}:-1">‹</button><span class="num">${PARAMS[p].f(b[p])}</span><button data-act="cfg:${p}:1">›</button></span>`);
  if (d.filter) h += row('Filtro (suelta un objeto)', slotHTML('flt', 'filter'));
  if (d.sides) { h += `<div class="cfg"><span>Caras <span class="mut small">(clic para cambiar)</span></span><div class="sides">`; for (const [dd, cls] of [[3, 'n'], [2, 'w'], [0, 'e'], [1, 'so']]) h += `<button class="sd ${cls} m${b.sides[dd]}" data-act="side:${dd}">${DIR_A[dd]}: ${MODE_N[b.sides[dd]]}</button>`; h += `</div></div>`; }
  if (b.type === 'assembler') { const opts = BENCH.map((r, i) => r.tier <= S.tier ? `<option value="${i}" ${i === b.recipe ? 'selected' : ''}>${esc(ITEMS[r.out].n)}${r.rpm ? ' (≥' + r.rpm + ' RPM)' : ''}</option>` : '').join(''); h += row('Receta', `<select id="asmSel">${opts}</select>`); }
  if (b.type === 'lever') h += row('Palanca', `<button data-act="use">${b.on ? 'Apagar' : 'Encender'}</button>`);
  if (b.type === 'button') h += row('Botón', `<button data-act="use">Pulsar</button>`);
  if (b.type === 'crank') h += row('Manivela', `<button data-act="use">Girar</button>`);
  return h ? `<div class="cat">Ajustes</div>${h}` : '';
}
function blockPanelHTML(b) {
  const d = BD[b.type]; let h = `<h3>${esc(d.n)}</h3><p class="mut small">${esc(d.d)}</p>` + ((d.machine && RECIPES[d.machine]) || b.type === 'bench' ? stationHTML(b) : '');
  if (b.type === 'bench') {
    h += `<div class="gear">${slotHTML('c:0', 'core')}`; for (let i = 1; i <= 6; i++) h += slotHTML('c:' + i, 't t' + (i - 1)); h += `<div class="gring" id="gring"></div></div>`;
    h += `<div class="row gap center"><span class="mut small">Catalizador</span>${slotHTML('c:7', 'cat')}<span class="mut">→</span>${slotHTML('c:8', 'outslot')}</div><div id="benchInfo" class="small"></div><div class="bar big"><i id="benchBar"></i></div>` + craftHTML();
  } else if (b.slots) {
    h += `<div class="row gap wrap cbtns"><button id="cTake" title="Pasa todo el cofre a tu inventario">Coger todo</button><button id="cAll" title="Guarda la mochila (no la barra rápida)">Guardar todo</button><button id="cSame" title="Guarda solo los tipos que ya hay en el cofre">Guardar iguales</button><button id="cSort">Ordenar cofre</button></div>`;
    h += `<div class="invgrid">`; for (let i = 0; i < b.slots.length; i++) h += slotHTML('c:' + i); h += `</div>`;
  } else if (b.type === 'depot') h += `<div class="row gap">${slotHTML('dp')}</div>`;
  else if (b.inv) {
    // Siempre 4 ranuras de entrada y 4 de salida: el panel no cambia de tamaño al llenarse
    h += `<div class="iorow"><div><div class="cat">Entrada</div><div class="mslots" id="mIn">${slotHTML('mi:', 'add').repeat(4)}</div></div><span class="mut">→</span><div><div class="cat">Salida</div><div class="mslots out" id="mOut">${slotHTML('mo:').repeat(4)}</div></div></div>`;
    if (d.machine) h += `<div class="cat row">Puedes meter (clic: mete la pila) <button id="mRec" title="Todas las recetas de esta máquina">Ver recetas</button></div><div class="row gap wrap mhave" id="mHave"></div>`;
  }
  h += `<div id="liveInfo" class="small"></div>` + cfgHTML(b);
  return h;
}
// Ranuras de máquina en número fijo (múltiplos de 4): solo cambia su clave, no el DOM
function fixedSlots(box, ids, pre, need) {
  const n = Math.max(4, Math.ceil(need / 4) * 4);
  if (box.children.length !== n) box.innerHTML = slotHTML(pre).repeat(n);
  [...box.children].forEach((el, i) => { el.dataset.k = pre + (ids[i] || ''); el.classList.toggle('add', pre === 'mi:' && !ids[i]); });
}
const fmtN = n => n >= 1000 ? (n / 1000).toFixed(n >= 1e4 ? 0 : 1) + 'k' : String(n);
// Actualiza solo los valores (sin reconstruir el DOM) — llamada a ~6 Hz
let _invSeen = -1, _panSeen = -1;
function refreshInvUI(force) {
  if (ui.open !== 'inv') return;
  const b = ui.panel;
  if (b && !blocks.includes(b)) { closeModal(); return; }
  if (force || _invSeen !== invVersion || _panSeen !== _panelVer || b) {
    _invSeen = invVersion; _panSeen = _panelVer;
    if (b && b.inv && b.type !== 'depot') {
      const ins = Object.keys(b.inv).filter(k => b.inv[k] > 0), outs = Object.keys(b.out).filter(k => b.out[k] > 0);
      const sig = ins.join() + '|' + outs.join();
      if ($('mIn') && $('mIn').dataset.sig !== sig) { $('mIn').dataset.sig = sig; fixedSlots($('mIn'), ins, 'mi:', Math.max(4, ins.length)); fixedSlots($('mOut'), outs, 'mo:', outs.length); }
      const mh = $('mHave');
      if (mh && mh._v !== invVersion) {
        mh._v = invVersion; const seen = new Set(), ids = [];
        for (const s of S.inv) if (s && !seen.has(s.id)) { seen.add(s.id); if (handAccepts(b, s.id)) ids.push(s.id); }
        mh.innerHTML = ids.length ? ids.map(id => `<div class="s" data-hv="${id}" data-id="${id}">${itemImg(id, 28)}<span class="n">${fmtN(invCount(id))}</span></div>`).join('') : '<span class="mut small">No llevas nada que esta máquina acepte. Mira sus recetas.</span>';
      }
    }
    document.querySelectorAll('#mInv .s[data-k]').forEach(el => {
      const k = el.dataset.k;
      if (k === 'pko') { const r = pocketRecipe(); fillSlot(el, r ? { id: r.out, n: r.n } : null); $('pkName').textContent = r ? ITEMS[r.out].n : (ui.pocket[0] ? 'Sin receta' : ''); return; }
      if (k === 'flt') { fillSlot(el, b.filter ? { id: b.filter, n: 1 } : null); return; }
      const r = slotRef(k); if (!r) return;
      const s = r.get(); fillSlot(el, s); if (r.eq) el.classList.toggle('has', !!s);
      el.classList.toggle('dragging', drag.on && drag.keys.includes(k));
      el.classList.toggle('dim', !!ui.invQ && !(s && ITEMS[s.id].n.toLowerCase().includes(ui.invQ)));
    });
  }
  drawEqPreview(); renderCraft(); craftGhosts();
  if (b) {
    const li = $('liveInfo'); if (li) { const t = blockInfo(b, true); if (li._h !== t) { li._h = t; li.innerHTML = t; } }
    if (b.type === 'bench') {
      const r = b.rcp, bi = $('benchInfo');
      let t = r ? `Receta: <b>${esc(ITEMS[r.out].n)} ×${r.n}</b>${r.rpm ? ` · necesita <b>${r.rpm} RPM</b> (tiene ${fmt(b.rpm)})` : ''}${r.cat ? ' · catalizador: ' + esc(ITEMS[r.cat].n) : ''}${r.tier > S.tier ? ' · <span class="bad">bloqueada</span>' : ''}` : (b.slots[0] ? '<span class="mut">Sin receta con estos dientes</span>' : '<span class="mut">Pon un núcleo en el centro</span>');
      if (bi._h !== t) { bi._h = t; bi.innerHTML = t; }
      const tt = r ? (r.rpm >= 64 ? 3 : r.rpm >= 32 ? 2 : 1) : 1; $('benchBar').style.width = Math.min(100, (b.prog || 0) / tt * 100) + '%';
      $('gring').style.transform = `rotate(${(b.angle || 0) * 30}deg)`;
    }
  }
}
// ---------- Arrastre estilo Minecraft ----------
// Con una pila en la mano, mantén el botón y pasa por varias ranuras:
//  izquierdo → reparte la pila a partes iguales · derecho → deja 1 en cada una.
// Con Shift y la mano vacía, arrastrar mueve rápido cada ranura que tocas.
const drag = { on: false, btn: 0, mode: null, keys: [], snap: new Map(), held: null };
let _last = { k: null, t: 0 };
const isSpreadTarget = k => { const kind = k.split(':')[0]; return kind === 'inv' || kind === 'pk' || kind === 'dp' || (kind === 'c' && !(ui.panel && ui.panel.type === 'bench' && k === 'c:8')); };
function canSpreadInto(k, id) {
  const r = slotRef(k); if (!r || r.out || r.machineIn || r.filter) return false;
  if (r.canPut && !r.canPut(id)) return false;
  const s = r.get(); return !s || (s.id === id && s.n < STACK);
}
function applySpread() {
  for (const [k, v] of drag.snap) slotRef(k).set(v ? { id: v.id, n: v.n } : null);
  const h = { id: drag.held.id, n: drag.held.n }, n = drag.keys.length;
  const per = drag.btn === 0 ? Math.floor(h.n / n) : 1;
  for (const k of drag.keys) {
    const r = slotRef(k), s = r.get(), room = STACK - (s ? s.n : 0), m = Math.min(per, room, h.n);
    if (m > 0) { r.set({ id: h.id, n: (s ? s.n : 0) + m }); h.n -= m; }
  }
  ui.held = h.n > 0 ? h : null; done();
}
function slotDown(k, e) {
  const btn = e.button === 2 ? 1 : 0, now = performance.now(), r = slotRef(k);
  if (k === 'pko') { craftPocket(e.shiftKey); return; }
  if (!r) return;
  const dbl = _last.k === k && now - _last.t < 330 && btn === 0; _last = { k, t: now };
  if (e.ctrlKey || (e.shiftKey && dbl)) { moveAllOfType(k); return; }
  if (e.shiftKey && !ui.held) { quickMove(k); Object.assign(drag, { on: true, mode: 'shift', btn, keys: [k] }); return; }
  if (dbl && ui.held && !r.out) { collectSame(); return; }
  if (ui.held && isSpreadTarget(k) && !r.filter) {
    drag.snap.clear(); const s = r.get();
    drag.snap.set(k, s ? { id: s.id, n: s.n } : null);
    Object.assign(drag, { on: true, mode: 'spread', btn, keys: [k], held: { id: ui.held.id, n: ui.held.n } });
    return;
  }
  slotClick(k, btn);
}
function slotEnter(k) {
  if (!drag.on || drag.keys.includes(k)) return;
  if (drag.mode === 'shift') { drag.keys.push(k); quickMove(k); return; }
  const id = drag.held.id;
  if (!isSpreadTarget(k) || !canSpreadInto(k, id)) return;
  if (drag.btn === 0 && drag.keys.length >= drag.held.n) return; // no hay objetos para más ranuras
  if (drag.btn === 1 && drag.keys.length >= drag.held.n) return;
  const s = slotRef(k).get(); drag.snap.set(k, s ? { id: s.id, n: s.n } : null);
  drag.keys.push(k); applySpread();
}
function dragEnd() {
  if (!drag.on) return;
  const d = drag; drag.on = false;
  if (d.mode === 'spread' && d.keys.length === 1) { slotClick(d.keys[0], d.btn); } // fue un clic normal
  d.keys = []; d.snap.clear(); refreshInvUI(true);
}
// Eventos del panel
let _hoverKey = null;
$('mInv').addEventListener('mousedown', e => {
  const hv = e.target.closest('[data-hv]');
  if (hv && e.button === 0 && ui.panel) { e.preventDefault(); feedMachine(ui.panel, hv.dataset.hv, e.shiftKey); refreshInvUI(true); return; }
  const s = e.target.closest('.s[data-k]');
  if (s) { e.preventDefault(); slotDown(s.dataset.k, e); refreshInvUI(true); return; }
  const a = e.target.closest('[data-act]'); if (a && e.button === 0) { blockAction(ui.panel, a.dataset.act); return; }
});
$('mInv').addEventListener('mouseover', e => {
  const s = e.target.closest('.s[data-k]'); _hoverKey = s ? s.dataset.k : null;
  if (s && drag.on) { slotEnter(s.dataset.k); refreshInvUI(true); }
});
// Si el ratón va muy rápido se saltaría ranuras: se recorre la línea entre dos posiciones
let _dragPt = null;
addEventListener('mousemove', e => {
  if (!drag.on) { _dragPt = null; return; }
  const p = { x: e.clientX, y: e.clientY };
  if (_dragPt) {
    const dx = p.x - _dragPt.x, dy = p.y - _dragPt.y, steps = Math.ceil(Math.hypot(dx, dy) / 12);
    for (let i = 1; i < steps; i++) {
      const el = document.elementFromPoint(_dragPt.x + dx * i / steps, _dragPt.y + dy * i / steps);
      const s = el && el.closest && el.closest('#mInv .s[data-k]'); if (s) slotEnter(s.dataset.k);
    }
  }
  _dragPt = p;
});
addEventListener('mousedown', e => { _dragPt = { x: e.clientX, y: e.clientY }; }, true);
addEventListener('mouseup', () => { dragEnd(); _dragPt = null; });
$('mInv').addEventListener('wheel', e => {
  const s = e.target.closest('.s[data-k]'); if (!s) return;
  e.preventDefault(); wheelSlot(s.dataset.k, e.deltaY > 0); refreshInvUI(true);
}, { passive: false });
$('mInv').addEventListener('contextmenu', e => e.preventDefault());
$('mInv').addEventListener('change', e => {
  if (e.target.id === 'autoSort') { S.autoSort = e.target.checked; if (S.autoSort) sortInv(); refreshInvUI(true); }
  if (e.target.id === 'asmSel' && ui.panel) { const b = ui.panel; for (const k in b.inv) invAdd(k, b.inv[k]); b.inv = {}; b.recipe = +e.target.value; b.prog = 0; refreshInvUI(true); }
});
$('mInv').addEventListener('input', e => { if (e.target.id === 'invQ') { ui.invQ = e.target.value.trim().toLowerCase(); refreshInvUI(true); } });
$('mInv').addEventListener('click', e => {
  const id = e.target.id, b = ui.panel;
  if (id === 'bSort') { sortInv(); refreshInvUI(true); }
  if (id === 'mRec' && b) { openBookAt(BD[b.type].machine); return; }
  if (!b || !b.slots) return;
  if (id === 'cSort') { sortSlots(b.slots); done(); }
  if (id === 'cAll') { for (let i = 9; i < INV_N; i++) { const s = S.inv[i]; if (!s) continue; const l = slotsAdd(b.slots, s.id, s.n); S.inv[i] = l ? { id: s.id, n: l } : null; } done(); }
  if (id === 'cSame') { const have = new Set(b.slots.filter(Boolean).map(s => s.id)); for (let i = 0; i < INV_N; i++) { const s = S.inv[i]; if (!s || !have.has(s.id)) continue; const l = slotsAdd(b.slots, s.id, s.n); S.inv[i] = l ? { id: s.id, n: l } : null; } done(); }
  if (id === 'cTake') { for (let i = 0; i < b.slots.length; i++) { const s = b.slots[i]; if (!s) continue; const l = slotsAdd(S.inv, s.id, s.n, false, FILL_ORDER); b.slots[i] = l ? { id: s.id, n: l } : null; } done(); }
  refreshInvUI(true);
});
// Teclado dentro del inventario: 1-9 sobre una ranura la intercambia con la barra rápida
function invKey(k) {
  if (k >= '1' && k <= '9' && _hoverKey) { swapWithHotbar(_hoverKey, +k - 1); refreshInvUI(true); return true; }
  return false;
}
function sortSlots(arr) {
  const tot = {}; for (let i = 0; i < arr.length; i++) { const s = arr[i]; if (s) { tot[s.id] = (tot[s.id] || 0) + s.n; arr[i] = null; } }
  let i = 0; for (const id of Object.keys(tot).sort((a, b) => (ITEMS[a].cat - ITEMS[b].cat) || (ORDER_IDX[a] - ORDER_IDX[b]))) { let n = tot[id]; while (n > 0 && i < arr.length) { const m = Math.min(n, STACK); arr[i++] = { id, n: m }; n -= m; } }
}
function blockAction(b, act) {
  if (!b) return; const [k, a, c] = act.split(':'), d = BD[b.type];
  switch (k) {
    case 'rot': rotateBlock(b, +a); break;
    case 'off': b.off = !b.off; break;
    case 'rs': b.rs = ((b.rs || 0) + 1) % 3; dirty.lists = true; break;
    case 'cfg': cycleParam(b, a, +c); break;
    case 'side': b.sides[+a] = (b.sides[+a] + 1) % 4; dirty.net = true; break;
    case 'use': useBlock(b); break;
  }
  $('invRight').innerHTML = blockPanelHTML(b); stationOpen(b); _panelVer++; refreshInvUI(true);
}
function rotateBlock(b, s) { if (!(BD[b.type].dir || BD[b.type].kin === 'axis')) return; b.dir = (b.dir + (s < 0 ? 3 : 1)) & 3; markAll(); }
function cycleParam(b, p, s) { const vals = PARAMS[p].vals; let i = vals.indexOf(b[p]); i = (i + s + vals.length) % vals.length; b[p] = vals[i]; if (PARAMS[p].kin) dirty.kin = true; if (p === 'period') b.t = 0; return PARAMS[p].n + ': ' + PARAMS[p].f(b[p]); }
function useBlock(b) {
  b._tv = -1;
  if (b.type === 'lever') { b.on = !b.on; return true; }
  if (b.type === 'button') { b.t = 1; return true; }
  if (b.type === 'crank') { b.timer = Math.min(30, b.timer + 8); return true; }
  if (b.type === 'bed') { sleepIn(b); return true; }
  if (b.type === 'computer') { openComp(b); return true; }
  if (b.type === 'door') { doorCheck(b); return true; }
  return false;
}

// ---------- Panel de equipo: muñeco en el centro, ranuras alrededor y estadísticas ----------
const EQ_ICON = { head: '⛑', chest: '👕', legs: '👖', feet: '🥾', back: '🧣', hands: '🧤', shield: '🛡', ring: '💍', acc: '📿', totem: '🗿', costume: '🎭', rune: 'ᚱ' };
let _dollAng = Math.PI / 2;
function eqSlot(k, cls = '') { return `<div class="s eq ${cls}" data-k="eq:${k}" data-ph="${EQ_ICON[slotType(k)]}" title="${EQ_N[slotType(k)]}"><i class="ic"></i><span class="n"></span></div>`; }
function equipPanelHTML() {
  return `<div class="eqp"><div class="eqc">${['head', 'back', 'chest', 'hands', 'legs', 'feet'].map(k => eqSlot(k)).join('')}</div>
  <div class="eqmid"><canvas id="eqPrev" width="112" height="150" title="Clic para girar"></canvas><div class="eqrunes">${[1, 2, 3, 4, 5, 6].map(i => eqSlot('rune' + i, 'rune')).join('')}</div></div>
  <div class="eqc">${['shield', 'ring1', 'ring2', 'totem', 'costume'].map(k => eqSlot(k)).join('')}</div>
  <div class="eqside"><div class="eqacc">${[1, 2, 3, 4].map(i => eqSlot('acc' + i)).join('')}</div><div class="eqstats" id="eqStats"></div></div></div>`;
}
// Estadísticas (con vista previa al pasar el ratón por una pieza del inventario)
const STAT_ROWS = [['def', '🛡', 'Defensa', v => v], ['block', '⛨', 'Bloqueo', v => Math.round(v * 100) + '%'], ['melee', '⚔', 'Daño', v => Math.round(v * 100) + '%'], ['ranged', '🏹', 'Distancia', v => Math.round(v * 100) + '%'], ['speed', '👟', 'Velocidad', v => Math.round(v * 100) + '%'], ['hp', '❤', 'Vida máx.', v => maxHpBase() + v], ['mana', '✦', 'Maná máx.', v => 50 + 10 * lvOf('magic') + v], ['warm', '🧥', 'Abrigo', v => (v >= 0 ? '+' : '') + v + '°'], ['luck', '🍀', 'Suerte', v => '+' + Math.round(v * 100) + '%'], ['detect', '👁', 'Te detectan', v => Math.round(v * 100) + '%']];
const maxHpBase = () => 100 + 2 * lvOf('fit');
const LOWER_BETTER = new Set(['detect']);
let _eqKey = '', _hoverPrev = null;
function drawEqPreview(force) {
  const cv = $('eqPrev'); if (!cv) return; const ch = charData();
  // ¿Se está apuntando a una pieza equipable del inventario? → mostrar cómo cambiarían las estadísticas
  let prevEq = null; const hk = _hoverKey && _hoverKey.startsWith('inv:') ? S.inv[+_hoverKey.slice(4)] : null;
  if (hk && (ITEMS[hk.id].armor || ITEMS[hk.id].gear)) { const cand = EQ_SLOTS.filter(k => slotAccepts(k, hk.id)); if (cand.length) { const sl = cand.find(k => !S.equip[k]) || cand[0]; prevEq = { ...S.equip, [sl]: hk.id }; } }
  const key = JSON.stringify(ch.look) + Object.values(S.equip).join() + (prevEq ? '|' + hk.id : '') + _dollAng;
  if (key === _eqKey && !force && cv._d) return; _eqKey = key; cv._d = 1;
  const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height);
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(56, 140, 30, 8, 0, 0, 7); c.fill();
  drawAvatar(c, ch.look, prevEq || S.equip, 56, 142, _dollAng, 0, false, 4.4);
  const cur = charMods(), nxt = prevEq ? charMods(prevEq) : null;
  $('eqStats').innerHTML = STAT_ROWS.map(([k, i, n, f]) => {
    const a = cur[k], b = nxt ? nxt[k] : a, diff = nxt && Math.abs(b - a) > 1e-6, better = LOWER_BETTER.has(k) ? b < a : b > a;
    if (!diff && (k === 'block' || k === 'luck' || k === 'ranged') && !a) return '';
    return `<div class="st ${diff ? (better ? 'up' : 'down') : ''}" title="${n}"><span>${i}</span><b>${f(diff ? b : a)}</b>${diff ? `<em>${better ? '▲' : '▼'}</em>` : ''}</div>`;
  }).join('');
}
$('mInv').addEventListener('click', e => { if (e.target.id === 'eqPrev') { _dollAng += Math.PI / 4; drawEqPreview(true); } });
$('mInv').addEventListener('mouseover', () => drawEqPreview());
