'use strict';
// Controles: colocar/quitar/extraer, atajos de bloques y de interfaz.
const mouse = { x: 0, y: 0, down: false, rdown: false, tx: -1, ty: -1, last: null, dragged: [] };
const keys = new Set();
const mineTime = g => GI[g].mt || (GI[g].tree ? 0.7 : GI[g].plant ? 0.3 : 0.55);
function updateHover() { const w = mouseWorld(); mouse.tx = Math.floor(w.x / T); mouse.ty = Math.floor(w.y / T); }

function canPlace(type, x, y) {
  const d = BD[type];
  if ((d.tier || 0) > S.tier) return `Se desbloquea en el nivel ${d.tier + 1}`;
  if (at(x, y)) return 'Casilla ocupada';
  const g = gnd(x, y);
  if (isLiquid(g)) return 'No se puede construir sobre ' + GI[g].n.toLowerCase();
  if (GI[g].solid && d.place !== 'res' && d.place !== 'tree') return 'Hay ' + GI[g].n.toLowerCase() + ': pícalo antes';
  switch (d.place) {
    case 'res': if (!GI[g].drop) return 'Va sobre piedra, menas, arena o árboles'; break;
    case 'tree': if (!GI[g].tree) return 'Va sobre un árbol'; break;
    case 'oil': if (g !== G.OIL) return 'Va sobre un pozo de petróleo'; break;
    case 'gas': if (g !== G.GAS) return 'Va sobre un géiser de gas'; break;
    case 'water': if (!nearWater(x, y)) return 'Necesita agua al lado'; break;
    case 'pump': if (g !== G.OIL && !nearLiquid(x, y)) return 'Junto a un líquido o sobre petróleo'; break;
    case 'liquid': if (!nearLiquid(x, y)) return 'Necesita un líquido al lado (agua, lava, ácido…)'; break;
    case 'lava': if (nearLiquid(x, y) !== 'lava') return 'Necesita lava al lado'; break;
  }
  if ((GI[g].flora || GI[g].vent2) && d.place !== 'res' && d.place !== 'tree') return 'Hay ' + GI[g].n.toLowerCase() + ': quítalo con la mano';
  if (!d.walk && S && Math.abs((x + 0.5) * T - S.player.x) < T * 0.5 + 5 && Math.abs((y + 0.5) * T - S.player.y - 3) < T * 0.5 + 3) return 'Estás en medio';
  if (invCount(type) <= 0) return 'No te quedan';
  return null;
}
function tryPlace(type, x, y, dir, quiet) {
  const err = canPlace(type, x, y);
  if (err) { if (!quiet && err !== 'Casilla ocupada') toastErr(err); return null; }
  invTake(type, 1); gainXP('build', 1);
  const b = makeB(type, x, y, dir);
  if (ui.copy && ui.copy.type === type && keys.has('shift')) pasteCfg(b, ui.copy);
  addBlock(b); return b;
}
function removeAt(x, y) {
  const b = at(x, y); if (!b) return;
  if (b.type === 'core') { toastErr('El Núcleo no se puede quitar'); return; }
  const back = [[b.type, 1]];
  for (const o of [b.inv, b.out]) if (o) for (const k in o) back.push([k, o[k]]);
  if (b.slots) for (const s of b.slots) if (s) back.push([s.id, s.n]);
  if (b.items) for (const it of b.items) back.push([it.id, 1]);
  if (b.buf) back.push([b.buf, 1]);
  if (b.item) back.push([b.item.id, b.item.n]);
  let lost = 0; for (const [id, n] of back) lost += invAdd(id, n);
  if (lost) toast(`Inventario lleno: se perdieron ${lost} objetos`);
  if (ui.panel === b) closeModal();
  delBlock(b);
}
function interact(shift, ctrl) {
  const b = at(mouse.tx, mouse.ty);
  if (!b) {
    if (endInteract(mouse.tx, mouse.ty)) return;
    const mw = mouseWorld(), near = (x, y) => Math.hypot(x - S.player.x, y - S.player.y) < 3.5 * T;
    const n = npcAt(mw.x, mw.y); if (n && near(n.x, n.y)) { openTrade(n); return; }
    const pt = petAt(mw.x, mw.y); if (pt && near(pt.x, pt.y)) { petInteract(pt); return; }
    const m = mountPet(); if (m) { m.ride = false; m.x = S.player.x + 20; toast('Te bajas'); return; }
    const an = animalAt(mw.x, mw.y); if (an && near(an.x, an.y) && S.inv[S.sel] && (TAME[an.sp] || []).food && (TAME[an.sp].food.includes(S.inv[S.sel].id) || S.inv[S.sel].id === 'tameTreat')) { tryTame(an); return; }
    if (!drinkAt(mouse.tx, mouse.ty)) useItem(); return;
  }
  if (b.type === 'door') { doorCheck(b); return; }
  if (b.type === 'computer') { openComp(b); return; }
  if (b.type === 'altar') { const s = S.inv[S.sel], it = s && ITEMS[s.id]; if (it && it.summon) { if (summonBoss(it.summon, false, { x: b.x * T + 16, y: b.y * T - 4 * T })) { if (--s.n <= 0) S.inv[S.sel] = null; invVersion++; } } else toast('Altar: lleva en la mano un objeto de invocación de jefe y pulsa F. Jefes vencidos: ' + Object.keys(S.bossesDown || {}).length + '/' + Object.keys(BOSSES).length); return; }
  if (useBlock(b)) return;
  if (b.type === 'core') {
    const tier = TIERS[S.tier]; if (!tier) return; let n = 0;
    for (const k in tier.goal) { const need = tier.goal[k] - (S.del[k] || 0); const c = invTake(k, Math.min(need, invCount(k))); if (c > 0) { S.del[k] = (S.del[k] || 0) + c; n += c; } }
    ui.goalDirty = true; checkTier(); toast(n ? `Entregaste ${n} objetos al Núcleo` : 'No tienes nada que necesite el Núcleo'); return;
  }
  if (b.slots && b.type !== 'bench' && (shift || ctrl)) {
    if (shift) { let n = 0; for (let i = 9; i < INV_N; i++) { const s = S.inv[i]; if (!s) continue; const l = slotsAdd(b.slots, s.id, s.n); n += s.n - l; S.inv[i] = l ? { id: s.id, n: l } : null; } invVersion++; toast(`Guardaste ${n} objetos (la barra rápida no se toca)`); }
    else { let n = 0; for (let i = 0; i < b.slots.length; i++) { const s = b.slots[i]; if (!s) continue; const l = invAdd(s.id, s.n); n += s.n - l; b.slots[i] = l ? { id: s.id, n: l } : null; } toast(`Recogiste ${n} objetos`); }
    return;
  }
  if (b.items) { for (const it of b.items) invAdd(it.id, 1); b.items = []; return; }
  openInventory(b);
}
function configure(back) {
  const b = at(mouse.tx, mouse.ty); if (!b) return;
  const d = BD[b.type];
  if (d.cfg) { toast(cycleParam(b, d.cfg[0], back ? -1 : 1)); return; }
  if (b.type === 'assembler') { let i = b.recipe; for (let k = 0; k < BENCH.length; k++) { i = (i + (back ? -1 : 1) + BENCH.length) % BENCH.length; if (BENCH[i].tier <= S.tier) break; } for (const k in b.inv) invAdd(k, b.inv[k]); b.inv = {}; b.recipe = i; toast('Receta: ' + ITEMS[BENCH[i].out].n); return; }
  if (d.filter) {
    const s = S.inv[S.sel];
    if (s && !keys.has('alt')) { b.filter = b.filter === s.id ? null : s.id; }
    else { const list = [null, ...ITEM_ORDER.filter(k => !ITEMS[k].block)]; let i = list.indexOf(b.filter); b.filter = list[(i + (back ? -1 : 1) + list.length) % list.length]; }
    toast('Filtro: ' + (b.filter ? ITEMS[b.filter].n : 'cualquiera')); return;
  }
  if (d.rsable) { b.rs = ((b.rs || 0) + 1) % 3; dirty.lists = true; toast(RS_N[b.rs]); return; }
  if (d.sides) { toast('Abre el bloque con F para configurar sus caras'); }
}
function copyCfg(b) {
  const o = { type: b.type }; for (const k of ['filter', 'rs', 'sides', 'recipe', 'dir', ...(BD[b.type].cfg || [])]) if (b[k] !== undefined) o[k] = Array.isArray(b[k]) ? b[k].slice() : b[k];
  return o;
}
function pasteCfg(b, c) { for (const k in c) if (k !== 'type' && k !== 'dir') b[k] = Array.isArray(c[k]) ? c[k].slice() : c[k]; markAll(); }
function pickBlock() {
  const b = at(mouse.tx, mouse.ty); if (!b || b.type === 'core') return;
  for (let i = 0; i < 9; i++) if (S.inv[i] && S.inv[i].id === b.type) { S.sel = i; ui.hand = false; ui.dir = b.dir; return; }
  for (let i = 9; i < INV_N; i++) if (S.inv[i] && S.inv[i].id === b.type) { const t = S.inv[S.sel]; S.inv[S.sel] = S.inv[i]; S.inv[i] = t; ui.hand = false; ui.dir = b.dir; invVersion++; return; }
  toastErr('No tienes ' + BD[b.type].n);
}
// ---------- Modales ----------
const MODALS = { inv: 'mInv', book: 'mBook', help: 'mHelp', map: 'mMap', char: 'mChar', comp: 'mComp', trade: 'mTrade' };
function openModal(k) { if (!S) return; closeModal(); ui.open = k; $(MODALS[k]).hidden = false; mouse.down = mouse.rdown = false; }
function closeModal() { if (!ui.open || ui.open === 'title' || ui.open === 'dead' || ui.open === 'sleep') return; if (ui.open === 'inv') closeInventory(); const m = $(MODALS[ui.open]); if (m) m.hidden = true; ui.open = null; hideTip(); }
// Clic en el fondo: si llevas algo en la mano, vuelve al inventario (no se cierra la ventana)
document.querySelectorAll('.modal').forEach(m => m.addEventListener('mousedown', e => {
  if (e.target === m && ui.open === 'inv' && ui.held) { const l = invAdd(ui.held.id, ui.held.n); ui.held = l ? { id: ui.held.id, n: l } : null; refreshHeld(); refreshInvUI(true); return; }
  if (e.target === m || e.target.closest('[data-close]')) closeModal();
}));

addEventListener('keydown', e => {
  if (ui.open === 'title') { if (e.key === 'Escape') { if (cwS && $('cwPrev')) showList(); else if (S && currentWorld) closeTitle(); } return; }
  if ((e.target.tagName === 'INPUT' && e.target.type === 'search') || e.target.tagName === 'TEXTAREA') { if (e.key === 'Escape') closeModal(); return; }
  if (!S) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') { closeModal(); return; }
  if (ui.open) {
    if (ui.open === 'inv' && invKey(k)) return;
    if ((k === 'c' && ui.open === 'char') || (k === 'e' && ui.open === 'inv') || (k === 'b' && ui.open === 'book') || (k === 'm' && ui.open === 'map') || (k === 'h' && ui.open === 'help') || (k === 'j' && ui.open === 'lore')) closeModal();
    else if (k === 'b' && ui.open === 'inv') openBook();
    else if (k === 'o' && ui.open === 'inv') { sortInv(); refreshInvUI(true); }
    return;
  }
  if (e.ctrlKey || e.metaKey) {
    if (k === 'c') { const b = at(mouse.tx, mouse.ty); if (b) { ui.copy = copyCfg(b); toast('Ajustes copiados de ' + BD[b.type].n + ' (Shift al colocar para aplicarlos)'); } e.preventDefault(); }
    else if (k === 'v') { const b = at(mouse.tx, mouse.ty); if (b && ui.copy && ui.copy.type === b.type) { pasteCfg(b, ui.copy); toast('Ajustes pegados'); } else if (b) toastErr('Copia antes un bloque del mismo tipo'); e.preventDefault(); }
    else if (k === 's') { saveGame(); e.preventDefault(); }
    return;
  }
  keys.add(k); if (e.shiftKey) keys.add('shift');
  if (k >= '1' && k <= '9') { S.sel = +k - 1; ui.hand = false; }
  else if (k === 'q') ui.hand = !ui.hand;
  else if (k === 'r') { const b = at(mouse.tx, mouse.ty); if (selectedBlock() || !b) ui.dir = (ui.dir + (e.shiftKey ? 3 : 1)) & 3; else rotateBlock(b, e.shiftKey ? -1 : 1); }
  else if (k === 'f') interact(e.shiftKey, e.altKey);
  else if (k === 't') configure(e.shiftKey);
  else if (k === 'x') { const b = at(mouse.tx, mouse.ty); if (b && b.type !== 'core') { b.off = !b.off; toast(BD[b.type].n + (b.off ? ' apagado' : ' encendido')); } }
  else if (k === 'g') { const b = at(mouse.tx, mouse.ty); if (b && BD[b.type].rsable) { b.rs = ((b.rs || 0) + 1) % 3; dirty.lists = true; toast(RS_N[b.rs]); } }
  else if (k === 'e') openInventory(null);
  else if (k === 'b') openBook();
  else if (k === 'm') openMap();
  else if (k === 'h') openModal('help');
  else if (k === 'c') openChar();
  else if (k === 'j') openLore();
  else if (k === ' ') { if (e.shiftKey) dash(); else tryJump(); }
  else if (SPELL_KEYS.includes(k)) castSpell(SPELL_KEYS.indexOf(k));
  else if (k === 'n') { $('mini').hidden = !$('mini').hidden; }
  else if (k === 'p' || k === 'f3') { ui.fps = !ui.fps; $('fps').hidden = !ui.fps; e.preventDefault(); }
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab', 'alt'].includes(k)) e.preventDefault();
});
addEventListener('keyup', e => { keys.delete(e.key.toLowerCase()); if (!e.shiftKey) keys.delete('shift'); });
addEventListener('blur', () => { keys.clear(); mouse.down = mouse.rdown = false; });
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('mousedown', e => {
  mouse.x = e.clientX; mouse.y = e.clientY; updateHover(); ui.mlock = null; // nueva pulsación: se vuelve a fijar la capa
  if (e.button === 0) {
    // Llave inglesa: clic gira, Shift+clic recoge el bloque
    if (heldId() === 'wrench') { const b = at(mouse.tx, mouse.ty); if (b) { if (e.shiftKey) removeAt(mouse.tx, mouse.ty); else rotateBlock(b, 1); return; } }
    mouse.down = true; mouse.last = null; mouse.dragged = [];
    const sel = selectedBlock();
    if (sel) { if (e.altKey) { const b = at(mouse.tx, mouse.ty); if (b) { openInventory(b); mouse.down = false; return; } } placeDrag(mouse.tx, mouse.ty); }
    else if (e.altKey) { const b = at(mouse.tx, mouse.ty); if (b) { openInventory(b); mouse.down = false; } }
  } else if (e.button === 2) { mouse.rdown = true; mouse.rblock = !!at(mouse.tx, mouse.ty); ui.bb = null; } // se rompe manteniendo (sim/breaking.js)
  else if (e.button === 1) { e.preventDefault(); pickBlock(); }
});
addEventListener('mouseup', e => { if (e.button === 0) { mouse.down = false; mouse.grapDone = false; } if (e.button === 2) mouse.rdown = false; if (!mouse.down && !mouse.rdown) ui.mlock = null; });
cv.addEventListener('mousemove', e => {
  mouse.x = e.clientX; mouse.y = e.clientY; const ox = mouse.tx, oy = mouse.ty; updateHover();
  if (mouse.tx === ox && mouse.ty === oy) return;
  if (mouse.down && selectedBlock()) placeDrag(mouse.tx, mouse.ty);
});
cv.addEventListener('wheel', e => {
  e.preventDefault();
  const inv = typeof OPT !== 'undefined' && OPT.wheelInvert ? -1 : 1, zs = typeof OPT !== 'undefined' ? OPT.zoomSens : 1;
  if (e.shiftKey !== (typeof OPT !== 'undefined' && OPT.wheelHotbar)) { S.sel = (S.sel + (e.deltaY * inv > 0 ? 1 : 8)) % 9; ui.hand = false; return; }
  view.z = clamp(view.z * Math.pow(e.deltaY * inv > 0 ? 0.9 : 1.1, zs), heldId() === 'spyglass' ? 0.15 : CM().zoomOut ? 0.28 : 0.4, 3); updateHover();
}, { passive: false });
// Arrastrar: coloca en línea y orienta cintas/ejes/cables según la dirección del arrastre
function placeDrag(tx, ty) {
  const sel = selectedBlock(); if (!sel) return;
  const l = mouse.last;
  if (!l) { const b = tryPlace(sel, tx, ty, ui.dir); if (b) mouse.dragged.push(b); mouse.last = { x: tx, y: ty, b }; return; }
  let cx = l.x, cy = l.y, prev = l.b;
  const orient = BD[sel].kin === 'belt' || BD[sel].kin === 'axis';
  while (cx !== tx || cy !== ty) {
    let d; if (cx !== tx) { d = tx > cx ? 0 : 2; cx += tx > cx ? 1 : -1; } else { d = ty > cy ? 1 : 3; cy += ty > cy ? 1 : -1; }
    if (orient) { ui.dir = d; if (prev && prev.type === sel && mouse.dragged.includes(prev) && prev.dir !== d) { prev.dir = d; markAll(); } }
    if (!selectedBlock()) break;
    const b = tryPlace(sel, cx, cy, ui.dir, true); if (b) mouse.dragged.push(b); prev = b || at(cx, cy);
  }
  mouse.last = { x: tx, y: ty, b: prev };
}
