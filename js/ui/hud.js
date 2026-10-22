'use strict';
// HUD: avisos, objetivo, barra rápida, panel de información y tooltips.
// Regla de rendimiento: el DOM solo se toca cuando su contenido cambia.
const ui = { mx: 0, my: 0, invQ: '', open: null, dir: 0, hand: false, mine: { t: 0, x: -1, y: -1 }, goalDirty: true, panel: null, held: null, pocket: [null, null, null, null], copy: null, fps: false };
const $ = id => document.getElementById(id);
function selectedBlock() { if (ui.hand) return null; const s = S.inv[S.sel]; return s && isPlaceable(s.id) ? s.id : null; }

function toast(msg, big) {
  const d = document.createElement('div'); d.textContent = msg; if (big) { d.className = 'big'; d.style.animationDuration = '6s'; }
  const t = $('toast'); t.appendChild(d); while (t.children.length > 4) t.firstChild.remove();
  setTimeout(() => d.remove(), big ? 6000 : 3000);
}
let _lastErr = 0;
function toastErr(msg) { if (performance.now() - _lastErr > 900) { toast(msg); _lastErr = performance.now(); } }
function itemImg(id, sz) { return ATLAS.ready ? `<i class="ic" style="width:${sz}px;height:${sz}px;${iconStyle(id)}"></i>` : `<img src="${iconURL(id)}" width="${sz}" height="${sz}" alt="">`; }
function chip(id, n, ok = true) { return `<span class="chip ${ok ? '' : 'no'}">${itemImg(id, 14)}${n} ${esc(ITEMS[id].n)}</span>`; }

function renderGoal() {
  const el = $('goal'), tier = TIERS[S.tier];
  if (!tier) { el.innerHTML = endGoalHTML(); ui.goalDirty = false; return; }
  let h = `<h3>${esc(tier.n)}</h3><div class="mut" style="margin-bottom:6px">Entrega al Núcleo (cinta, brazo o <kbd>F</kbd>):</div>`;
  for (const k in tier.goal) { const d = S.del[k] || 0, g = tier.goal[k]; h += `<div class="row"><span class="l">${itemImg(k, 16)}${esc(ITEMS[k].n)}</span><span class="num">${d}/${g}</span></div><div class="bar"><i style="width:${Math.min(100, d / g * 100)}%"></i></div>`; }
  const un = unlocksOf(S.tier); if (un.length) h += `<div class="mut small">Desbloquea ${un.length} bloques: ${un.slice(0, 6).map(u => esc(BD[u].n)).join(', ')}${un.length > 6 ? '…' : ''}</div>`;
  el.innerHTML = h; ui.goalDirty = false;
}
// ---------- Barra rápida ----------
let _hotVer = -1, _hotSel = -1, _hotHand = null;
function buildHotbar() {
  let h = ''; for (let i = 0; i < 9; i++) h += `<div class="s hs" data-k="inv:${i}"><span class="key">${i + 1}</span><i class="ic"></i><span class="n"></span></div>`;
  $('hotbar').innerHTML = h + `<div class="hand ${ui.hand ? 'on' : ''}" id="handBtn" title="Mano (Q): extraer recursos aunque lleves un bloque">✋</div>`;
}
function fillSlot(el, s) {
  const ic = el.querySelector('.ic'), n = el.querySelector('.n');
  const id = s ? s.id : '', sig = id + (ATLAS.ready ? '*' : '');
  if (el._sig !== sig) { el._sig = sig; el.dataset.id = id; if (s) { ic.style.cssText = iconStyle(s.id); ic.style.visibility = 'visible'; } else ic.style.visibility = 'hidden'; }
  const t = s && s.n > 1 ? s.n : ''; if (n.textContent != t) n.textContent = t;
  durStyle(el, s && s.id);
}
function refreshHotbar() {
  if (_hotVer === invVersion && _hotSel === S.sel && _hotHand === ui.hand) return;
  _hotVer = invVersion; _hotSel = S.sel; _hotHand = ui.hand;
  const els = $('hotbar').querySelectorAll('.hs');
  els.forEach((el, i) => { fillSlot(el, S.inv[i]); el.classList.toggle('on', i === S.sel && !ui.hand); });
  $('handBtn').classList.toggle('on', ui.hand);
}
// ---------- Tooltips ----------
function itemTip(id) {
  const it = ITEMS[id]; if (!it) return '';
  let h = `<b>${esc(it.n)}</b><div class="mut small">${ICATS[it.cat]}</div><div>${esc(it.d || '')}</div>`;
  if (BD[id]) { const st = blockStats(id); if (st.length) h += `<ul>${st.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`; const t = BD[id].tier || 0; if (t > S.tier) h += `<div class="bad">Se desbloquea en el nivel ${t + 1}</div>`; h += `<div class="mut small">Clic izquierdo en el mapa para colocar</div>`; }
  const r = RECIPE_FOR[id];
  if (r) h += `<div class="mut small">Banco: núcleo ${esc(ITEMS[r.core].n)}${r.teeth.length ? ' + ' + r.teeth.length + ' dientes' : ''}${r.rpm ? ' · ≥' + r.rpm + ' RPM' : ''}</div>`;
  for (const k in RECIPES) for (const rc of RECIPES[k]) if (rc.out && rc.out[id]) { h += `<div class="mut small">Se obtiene en: ${MACHINE_NAME[k]}</div>`; break; }
  return h;
}
let _tipDu = '', _tipId = null, _tipW = 0, _tipH = 0, _tipRaf = 0, _mvTarget = null;
// El texto de cada tooltip se calcula una vez (cambia solo al subir de nivel)
const _tipCache = new Map(); let _tipTier = -1;
function tipHTML(id) { if (_tipTier !== S.tier) { _tipCache.clear(); _tipTier = S.tier; } let h = _tipCache.get(id); if (h === undefined) { h = itemTip(id); _tipCache.set(id, h); } return h; }
function showTip(id, x, y) {
  const t = $('tip');
  const du = durTip(id); // el desgaste cambia: va fuera de la caché
  if (_tipId !== id || _tipDu !== du) { t.innerHTML = tipHTML(id) + du; _tipId = id; _tipDu = du; }
  if (t.hidden) t.hidden = false;
  // Sin medir el tooltip (medir obliga a recalcular toda la página): el lado se elige con CSS
  const right = x > innerWidth - 320, below = y < 260;
  t.style.transform = `translate(${right ? x - 14 : x + 14}px,${below ? y + 18 : y - 10}px) translate(${right ? '-100%' : '0'},${below ? '0' : '-100%'})`;
}
function hideTip() { if (_tipId === null && $('tip').hidden) return; $('tip').hidden = true; _tipId = null; }
// La pila de la mano sigue al cursor con transform (sin recálculo de layout)
function placeHeld() { $('held').style.transform = `translate(${ui.mx - 18}px,${ui.my - 18}px)`; }
// El ratón se procesa como mucho una vez por fotograma
function tipFrame() {
  _tipRaf = 0;
  const s = !ui.held && !drag.on && _mvTarget && _mvTarget.closest && _mvTarget.closest('[data-id]');
  if (s && s.dataset.id) showTip(s.dataset.id, ui.mx, ui.my); else if (_tipId) hideTip();
  if (ui.held) placeHeld();
}
document.addEventListener('mousemove', e => { ui.mx = e.clientX; ui.my = e.clientY; _mvTarget = e.target; if (!_tipRaf) _tipRaf = requestAnimationFrame(tipFrame); });
// Al desplazar una lista el objeto bajo el cursor cambia: se oculta el tooltip (barato)
document.addEventListener('scroll', () => { if (_tipId) hideTip(); }, true);
let _heldSig = '';
function refreshHeld() {
  const hd = $('held');
  if (!ui.held) { hd.hidden = true; _heldSig = ''; return; }
  const sig = ui.held.id + '|' + ui.held.n;
  if (sig !== _heldSig) { _heldSig = sig; hd.innerHTML = `${itemImg(ui.held.id, 32)}<span class="n">${ui.held.n > 1 ? ui.held.n : ''}</span>`; }
  hd.hidden = false; placeHeld(); hideTip();
}
// ---------- Panel de información del cursor ----------
let _infoHTML = '';
function infoHTML() {
  const tx = mouse.tx, ty = mouse.ty;
  const b = at(tx, ty), g = gnd(tx, ty);
  if (heldId() === 'biomeScanner') { const c = climate(tx, ty, S.gen, [0, 0, 0, 0, 0]), B = BIOMES[pickBiome(c[0], c[1], c[2], c[3], c[4], S.gen)]; return `<b>${esc(B.n)}</b><div class="small">Temperatura ${Math.round(c[1] * 100)} % · Humedad ${Math.round(c[2] * 100)} % · Rareza ${Math.round(c[3] * 100)} % · Interior ${Math.round(c[0] * 100)} %</div><div class="mut small">Fauna: ${(B.fauna || []).map(f => esc(SPECIES[f[0]].n)).join(', ') || '—'}</div>`; }
  const mw = mouseWorld(), an = animalAt(mw.x, mw.y);
  if (an) { const sp = SPECIES[an.sp]; return `<b>${esc(sp.n)}</b><div class="mut">Mano + clic mantenido para cazar: ${sp.drops.map(([id, n]) => n + ' ' + esc(ITEMS[id].n)).join(', ')}</div><div class="mut small">O ponle una trampa en su camino</div>`; }
  if (!b) {
    let h = `<b>${GI[g].n}</b> <span class="mut small">X ${tx} · Y ${(typeof surfY === 'function' ? surfY(ty) : ty)}</span><div class="inf small">${esc(BIOMES[biomeOf(tx, ty)].n)}</div>`;
    const dp = depthAt(tx, ty); if (dp) h += `<div class="small">Profundidad ${dp}: ${g === G.PIT ? `hacen falta ${dp} bloques de suelo para taparlo` : 'cavado en parte'}</div>`;
    if (GI[g].drop) h += `<div class="mut">Mano + clic mantenido: ${esc(ITEMS[GI[g].drop].n)}${GI[g].hp ? ` (${treeHp(tx, ty)} restantes)` : ''}${GI[g].extra ? ' · a veces ' + esc(ITEMS[GI[g].extra[0]].n) : ''}</div>`;
    if (GI[g].liquid && FLUIDS[GI[g].liquid]) h += `<div class="mut small">Líquido: ${esc(FLUIDS[GI[g].liquid].n)} (se puede bombear)</div>`;
    const sel = selectedBlock(); if (sel) { const e = canPlace(sel, tx, ty); h += `<div class="${e ? 'bad' : 'good'}">${e ? esc(e) : 'Clic para colocar ' + esc(BD[sel].n)}</div>`; }
    return h;
  }
  return blockInfo(b, false);
}
function blockInfo(b, full) {
  const d = BD[b.type]; let h = full ? '' : `<b>${esc(d.n)}</b>`;
  if (b.off) h += '<div class="bad">Apagado (X)</div>';
  if (d.kin) {
    const c = b.comp; h += `<div>Velocidad: <span class="inf">${fmt(b.rpm)} RPM</span></div>`;
    if (c) {
      h += `<div>Estrés: <span class="${c.used > c.cap ? 'bad' : ''}">${fmt(c.used)} / ${fmt(c.cap)} SU</span> · ${c.n} piezas</div>`;
      if (c.broken) h += '<div class="bad">Conflicto de velocidades</div>'; else if (c.braked) h += '<div class="bad">Frenado</div>'; else if (c.gens === 0) h += '<div class="mut">Sin generador activo</div>'; else if (c.used > c.cap) h += '<div class="bad">Red sobrecargada</div>';
    }
    if (d.gen) h += `<div class="mut">Genera ${d.gen.rpm} RPM · ${d.gen.cap} SU — ${b.genOn ? '<span class="good">activo</span>' : '<span class="bad">inactivo</span>'}</div>`;
  }
  if (d.pw) h += `<div>Energía: <span class="inf">${fmt(b.E)} / ${fmt(d.pw.cap)} FE</span></div>`;
  if (d.cable) h += b.net ? `<div>Flujo: ${fmt(b.net.flow)} / ${fmt(b.net.cap)} FE/s · ${b.net.atts.length} aparatos</div>` : '<div class="bad">Cortado</div>';
  if (d.pipe) h += b.net ? `<div>Flujo: ${fmt(b.net.flow)} mB/s${b.net.ft ? ' · ' + FLUIDS[b.net.ft].n : ''}</div>` : '<div class="bad">Cerrada</div>';
  if (b.tanks) for (const k in b.tanks) { const t = b.tanks[k]; h += `<div class="mut">Tanque: ${t.t ? esc(FLUIDS[t.t].n) : 'vacío'} ${fmt(t.a)}/${fmt(t.c)} mB</div>`; }
  if (b.fuel > 0) h += `<div class="mut">Combustible: ${b.type === 'furnace' ? Math.ceil(b.fuel) + ' piezas' : (typeof fmtFuelT === 'function' ? fmtFuelT(b) : b.fuel.toFixed(1) + ' s')}</div>`;
  if (d.cfg) for (const p of d.cfg) h += `<div>${PARAMS[p].n}: ${PARAMS[p].f(b[p])} <kbd>T</kbd></div>`;
  if (d.filter) h += `<div>Filtro: ${b.filter ? esc(ITEMS[b.filter].n) : 'cualquiera'}</div>`;
  if (d.rsin || d.rsable) h += b.powered ? `<div class="inf">Señal de redstone: ${b.pv}</div>` : '';
  if (d.emit) h += `<div>Salida: ${b.o}</div>`;
  if (b.type === 'wire') h += `<div>Señal: ${b.sig}</div>`;
  if (b.type === 'crank') h += `<div>Cuerda: ${Math.max(0, b.timer).toFixed(1)} s · <kbd>F</kbd></div>`;
  if (b.type === 'lever') h += `<div>${b.on ? '<span class="good">Encendida</span>' : 'Apagada'} · <kbd>F</kbd></div>`;
  if (b.type === 'assembler') { const r = BENCH[b.recipe]; h += `<div>Receta: ${r ? esc(ITEMS[r.out].n) : '—'}${r && r.rpm ? ' (≥' + r.rpm + ' RPM)' : ''}</div>`; }
  if (b.type === 'bench' && b.rcp) h += `<div>Fabrica: ${esc(ITEMS[b.rcp.out].n)}${b.rcp.rpm ? ' · necesita ' + b.rcp.rpm + ' RPM' : ''}</div>`;
  const list = (o, lab) => { const ks = Object.keys(o || {}).filter(k => o[k] > 0); return ks.length ? `<div class="mut">${lab}: ${ks.map(k => `${o[k]} ${esc(ITEMS[k].n)}`).join(', ')}</div>` : ''; };
  if (b.slots && b.type !== 'bench') h += `<div class="mut">${Math.round(slotsFill(b.slots) * 100)} % lleno</div>`;
  if (b.inv) { h += list(b.inv, 'Entrada'); h += list(b.out, 'Salida'); }
  if (d.machine && b.cur >= 0) h += `<div>Procesando… ${Math.round(progressOf(b) * 100)} %</div>`;
  if (b.items && b.items.length) h += `<div class="mut">En la cinta: ${b.items.map(i => esc(ITEMS[i.id].n)).join(', ')}</div>`;
  if (!full) h += `<div class="mut small">F: abrir/usar · R: girar · T: ajustar · X: apagar · Ctrl+C/V: copiar ajustes</div>`;
  return h;
}
function buffHTML() {
  const b = S.buffs; if (!b) return '';
  const ks = Object.keys(b); if (!ks.length) return '';
  return `<div class="small inf">${ks.map(k => `✦ ${BUFF_N[k]} ${Math.floor(b[k] / 60)}:${String(Math.floor(b[k] % 60)).padStart(2, '0')}`).join(' · ')}</div>`;
}
function updateInfo() {
  // Lo que señalas va en la tarjeta del cursor (ui/hovercard.js); aquí quedan los efectos activos y el escáner de biomas
  const h = ui.open ? _infoHTML : buffHTML() + (heldId() === 'biomeScanner' ? infoHTML() : '');
  if (h !== _infoHTML) { _infoHTML = h; $('info').innerHTML = h; } $('info').hidden = !h;
  hoverRefresh();
}
