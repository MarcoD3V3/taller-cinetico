'use strict';
// =====================================================================================
//  Tarjeta flotante junto al cursor: qué es lo que señalas (enemigo, animal, bloque, suelo
//  o agua) con su estado en vivo — vida, comportamiento y carácter, energía, progreso,
//  contenido, altura, botín, qué se puede pescar — y las acciones posibles. Sigue al ratón
//  con suavidad, aparece tras un instante quieto y cambia con un fundido. En el mundo, un
//  marco con esquinas se desliza entre casillas y un anillo marca a la criatura señalada.
// =====================================================================================
const HC = { el: null, key: '', html: '', x: 0, y: 0, tx: 0, ty: 0, show: 0, still: 0, lmx: 0, lmy: 0, on: false, target: null, mx: 0, my: 0, mk: 0 };
const _icon = new Map();
const hicon = id => { let u = _icon.get(id); if (!u) { try { u = itemSprite(id).toDataURL(); } catch (e) { u = ''; } _icon.set(id, u); } return u ? `<img class="hci" src="${u}" alt="">` : ''; };
const hchip = (t, cls = '') => `<span class="hcc ${cls}">${t}</span>`;
const hcbar = (f, col, lab) => `<div class="hcb"><i style="width:${Math.round(clamp(f, 0, 1) * 100)}%;background:${col}"></i>${lab ? `<span>${lab}</span>` : ''}</div>`;
const hkeys = list => `<div class="hck">${list.map(([k, t]) => `<span><kbd>${k}</kbd>${t}</span>`).join('')}</div>`;
// Rasgos de carácter (sim/mobai.js) en palabras
function persChips(p) {
  if (!p) return ''; const c = [];
  if (p.spd > 1.07) c.push('Veloz'); else if (p.spd < 0.93) c.push('Lento');
  if (p.skit > 0.72) c.push('Asustadizo'); if (p.bold > 0.75) c.push('Valiente'); else if (p.bold < 0.2) c.push('Cauto');
  if (p.cur > 0.75) c.push('Curioso'); if (p.lazy > 0.75) c.push('Perezoso'); if (p.soc > 0.78) c.push('Sociable');
  return c.slice(0, 3).map(t => hchip(t, 'soft')).join('');
}
const AMODE_N = { idle: 'Tranquilo', alert: '¡Alerta!', flee: 'Huyendo', chase: 'Te persigue' };
const EL_C = { fire: '#ff8a3a', frost: '#8ad8ff', storm: '#f0e05a', poison: '#8ad84a', void: '#b07aff', holy: '#ffe8a0', time: '#c8b0ff', life: '#7ae07a' };
const EL_NAME = { fire: 'Fuego', frost: 'Hielo', storm: 'Tormenta', poison: 'Veneno', void: 'Vacío', holy: 'Sagrado', time: 'Tiempo', life: 'Vida' };
// ¿Qué hay bajo el cursor?
function hoverTarget() {
  const mw = mouseWorld(), f = nearestFoe(mw.x, mw.y, 26, o => dist(mw.x, mw.y, o.x, o.y) < o.D.s + 8);
  if (f) return { k: 'foe', o: f, key: 'f' + FOES.indexOf(f) };
  const an = animalAt(mw.x, mw.y); if (an) return { k: 'an', o: an, key: 'a' + ANIMALS.indexOf(an) };
  const b = at(mouse.tx, mouse.ty); if (b) return { k: 'block', o: b, key: 'b' + mouse.tx + ',' + mouse.ty };
  return { k: 'tile', key: 't' + mouse.tx + ',' + mouse.ty };
}
function foeCard(f) {
  const D = f.D, el = D.el ? hchip(EL_NAME[D.el] || D.el, 'el" style="--c:' + (EL_C[D.el] || '#ccc')) : '';
  const st = f.retT > 0 ? 'Se retira' : f.ag ? 'Te ha visto' : 'Patrulla', lvl = Math.round(D.hp / 12 + D.dmg);
  let h = `<div class="hch"><b>${esc(D.n)}</b>${f.boss ? hchip('JEFE', 'boss') : ''}${el}</div>`;
  h += hcbar(f.hp / f.mhp, f.hp / f.mhp > 0.5 ? '#7fd07a' : f.hp / f.mhp > 0.25 ? '#e0b54c' : '#ff6b5b', `${Math.ceil(f.hp)} / ${f.mhp}`);
  h += `<div class="hcr">${hchip(st, f.ag ? 'bad' : '')}${persChips(f.pers)}</div>`;
  h += `<div class="hcs"><span>⚔ ${fmt(D.dmg)}</span><span>👟 ${fmt(D.v)}</span><span>☠ ${'★'.repeat(clamp(Math.round(lvl / 6), 1, 5))}</span>${D.undead ? '<span>Muerto viviente: el sol lo quema</span>' : ''}</div>`;
  const st2 = [f.burn > 0 && '🔥 Ardiendo', f.poison > 0 && '☣ Envenenado', f.frz > 0 && '❄ Congelado', f.stun > 0 && '✦ Aturdido', f.slow > 0 && '🐌 Lento'].filter(Boolean);
  if (st2.length) h += `<div class="hcr">${st2.map(t => hchip(t, 'soft')).join('')}</div>`;
  return h + hkeys([['Clic', 'atacar'], ['⇧␣', 'esquivar']]);
}
function animalCard(a) {
  const sp = SPECIES[a.sp], hz = HOSTILE[a.sp], mode = a.sleep ? 'Durmiendo' : a.mode === 'idle' && a.rest ? 'Descansando' : a.mode === 'idle' ? (sp.aq ? 'Nadando' : sp.fly ? 'Volando' : 'Paseando') : AMODE_N[a.mode] || '';
  let h = `<div class="hch"><b>${esc(sp.n)}</b>${hz ? hchip('Peligroso', 'bad') : hchip(sp.s >= 11 ? 'Grande' : sp.s < 6 ? 'Pequeño' : 'Mediano', 'soft')}</div>`;
  h += `<div class="hcr">${hchip(mode, a.mode === 'flee' || a.mode === 'chase' ? 'bad' : a.mode === 'alert' ? 'warn' : 'ok')}${persChips(a.pers)}</div>`;
  h += `<div class="hcd">${sp.drops.map(([id, n]) => `<span>${hicon(id)}${n}</span>`).join('')}</div>`;
  const tame = typeof TAME !== 'undefined' && TAME[a.sp];
  if (tame) h += `<div class="hcm">Domesticable con ${tame.food.slice(0, 2).map(id => esc(ITEMS[id].n)).join(' o ')}</div>`;
  if (!hz && a.pers && a.pers.cur > 0.75) h += '<div class="hcm">Si te quedas quieto, se acerca a curiosear</div>';
  return h + hkeys([['Clic', 'cazar'], ['Trampa', 'en su camino']]);
}
function blockCard(b) {
  const d = BD[b.type]; let h = `<div class="hch">${hicon(b.type)}<b>${esc(d.n)}</b>${b.off ? hchip('Apagado', 'bad') : d.machine || d.kin || d.pw ? hchip('Activo', 'ok') : ''}</div>`;
  if (d.kin) h += `<div class="hcs"><span>⟳ ${fmt(b.rpm)} RPM</span>${b.comp ? `<span class="${b.comp.used > b.comp.cap ? 'bad' : ''}">${fmt(b.comp.used)}/${fmt(b.comp.cap)} SU</span>` : ''}</div>`;
  if (d.pw) h += hcbar((b.E || 0) / d.pw.cap, '#7cc4ff', `${fmt(b.E || 0)} / ${fmt(d.pw.cap)} FE`);
  if (b.tanks) for (const k in b.tanks) { const t = b.tanks[k]; h += hcbar(t.a / t.c, t.t && FLUIDS[t.t] ? FLUIDS[t.t].c : '#555', `${t.t ? esc(FLUIDS[t.t].n) : 'Vacío'} ${fmt(t.a)}/${fmt(t.c)}`); }
  if (d.machine && b.cur >= 0) h += hcbar(progressOf(b), '#e0b54c', 'Procesando ' + Math.round(progressOf(b) * 100) + ' %');
  if (b.fuel > 0) h += `<div class="hcm">🔥 Combustible: ${b.type === 'furnace' ? Math.ceil(b.fuel) + ' piezas' : b.fuel.toFixed(1) + ' s'}</div>`;
  const inv = {}; for (const o of [b.inv, b.out]) for (const k in o || {}) if (o[k] > 0) inv[k] = (inv[k] || 0) + o[k];
  if (b.slots) for (const s of b.slots) if (s) inv[s.id] = (inv[s.id] || 0) + s.n;
  if (b.items) for (const i of b.items) inv[i.id] = (inv[i.id] || 0) + 1;
  const ks = Object.keys(inv); if (ks.length) h += `<div class="hcd">${ks.slice(0, 8).map(k => `<span title="${esc(ITEMS[k].n)}">${hicon(k)}${fmt(inv[k])}</span>`).join('')}${ks.length > 8 ? `<span class="mut">+${ks.length - 8}</span>` : ''}</div>`;
  const extra = blockInfo(b, true).replace(/<div class="mut">(Entrada|Salida|Tanque|Combustible|En la cinta)[^<]*<\/div>/g, '').replace(/<div>(Velocidad|Energía|Procesando)[^]*?<\/div>/g, '');
  if (extra.trim()) h += `<div class="hcx">${extra}</div>`;
  const k = [['F', 'usar']]; if (d.dir) k.push(['R', 'girar']); if (d.cfg) k.push(['T', 'ajustar']); k.push(['X', b.off ? 'encender' : 'apagar']); if (b.type !== 'core') k.push(['Clic der.', `romper · ${breakTime(b).toFixed(1)} s (${BR_N[blockMat(b.type)]})`]);
  return h + hkeys(k);
}
function tileCard(tx, ty) {
  if (fogHidden(tx, ty)) return `<div class="hch"><b>Roca sin explorar</b>${hchip('Oscuro', 'soft')}</div><div class="hcm">No sabes qué hay dentro. Pica las paredes que ves para ir descubriendo la montaña.</div>`;
  const g = gnd(tx, ty), gi = GI[g], B = BIOMES[biomeOf(tx, ty)], lv = lvAt(tx, ty), held = heldId(), sel = selectedBlock();
  let h = `<div class="hch">${gi.drop ? hicon(gi.drop) : ''}<b>${esc(gi.n)}</b>${hchip(esc(B.n), 'soft')}</div>`;
  const lk = typeof layerOf === 'function' ? layerOf(ty) : 0, meta = [`X ${tx} · Y ${lk ? surfY(ty) : ty}`]; if (lk) meta.push(`${LAYERS[lk].i} Capa ${lk} · ${depthLabel(tx, ty)}`); else if (lv) meta.push(`⛰ Terraza ${lv}`); const dp = depthAt(tx, ty); if (dp) meta.push(`⛏ Profundidad ${dp}`);
  h += `<div class="hcs">${meta.map(t => `<span>${t}</span>`).join('')}</div>`;
  if (gi.liquid === 'water' && !gi.walk) {
    const deep = gi.key === 'DEEP' || !nearShore(tx, ty);
    h += `<div class="hcr">${hchip(deep ? '🏊 Profunda: gasta aguante' : '🚶 Poco profunda: se vadea', deep ? 'warn' : 'ok')}</div>`;
    if (held && ITEMS[held].rod) {
      const kind = waterKind(tx, ty), rod = ITEMS[held].rod, night = daylight() < 0.3;
      const can = Object.keys(FISH_TABLE).filter(id => { const f = FISH_TABLE[id]; return (f.w[kind] || 0) > 0 && !f.junk && (f.tier || 0) <= rod.tier && (!f.nightOnly || night) && ITEMS[id]; });
      h += `<div class="hcm">🎣 ${esc(WATER_N[kind])}: pueden picar</div><div class="hcd">${can.slice(0, 9).map(id => `<span title="${esc(ITEMS[id].n)}">${hicon(id)}</span>`).join('')}</div>`;
    }
  } else if (gi.liquid && FLUIDS[gi.liquid]) h += `<div class="hcm">Líquido: ${esc(FLUIDS[gi.liquid].n)} (se puede bombear)</div>`;
  if (gi.drop) {
    const t = TOOLS[held], ok = toolOK(gi, t), hp = gi.hp ? treeHp(tx, ty) || gi.hp : 0;
    if (hp && gi.hp > 1) h += hcbar(hp / gi.hp, '#e0b54c', `${hp} / ${gi.hp} golpes`);
    h += `<div class="hcr">${hchip(ok ? '✓ Puedes picarlo' : '✗ Herramienta inadecuada', ok ? 'ok' : 'bad')}${inReach(tx, ty) ? '' : hchip('Lejos', 'warn')}${gi.extra ? hchip('A veces ' + esc(ITEMS[gi.extra[0]].n), 'soft') : ''}</div>`;
  }
  if (sel) { const e = canPlace(sel, tx, ty); h += `<div class="hcr">${hchip(e ? esc(e) : 'Clic para colocar ' + esc(BD[sel].n), e ? 'bad' : 'ok')}</div>`; }
  return h;
}
function hoverHTML(t) { return t.k === 'foe' ? foeCard(t.o) : t.k === 'an' ? animalCard(t.o) : t.k === 'block' ? blockCard(t.o) : tileCard(mouse.tx, mouse.ty); }
// Contenido: cada 0,15 s (lo llama updateInfo)
function hoverRefresh() {
  if (!HC.el) { HC.el = document.createElement('div'); HC.el.id = 'hcard'; HC.el.className = 'hcard'; document.body.appendChild(HC.el); }
  const canShow = !ui.open && HC.on && S;
  if (!canShow) { HC.target = null; return; }
  const t = hoverTarget(); HC.target = t;
  const html = hoverHTML(t);
  if (t.key !== HC.key) { HC.key = t.key; HC.el.classList.remove('swap'); void HC.el.offsetWidth; HC.el.classList.add('swap'); clearTimeout(HC.swT); HC.swT = setTimeout(() => HC.el.classList.remove('swap'), 300); /* solo anima al cambiar de objetivo: si no, cada número que cambia (progreso, combustible…) la hacía parpadear */ HC.still = t.k === 'tile' ? 0 : Math.max(HC.still, 0.12); }
  if (html !== HC.html) { HC.html = html; HC.el.innerHTML = html; }
}
// Posición y visibilidad: cada fotograma, con suavizado
function hoverFrame(dt) {
  if (!HC.el) return;
  const moved = Math.abs(mouse.x - HC.lmx) + Math.abs(mouse.y - HC.lmy) > 2; HC.lmx = mouse.x; HC.lmy = mouse.y;
  HC.still = moved ? Math.min(HC.still, 0.05) : HC.still + dt;
  const t = HC.target, want = !!t && !ui.open && HC.on && (t.k !== 'tile' ? HC.still > 0.12 : HC.still > 0.45);
  HC.show += ((want ? 1 : 0) - HC.show) * Math.min(1, dt * (want ? 10 : 14));
  const el = HC.el, w = el.offsetWidth || 220, h = el.offsetHeight || 80;
  let x = mouse.x + 20, y = mouse.y + 18; if (x + w > innerWidth - 8) x = mouse.x - w - 16; if (y + h > innerHeight - 90) y = Math.max(8, mouse.y - h - 14);
  if (HC.show < 0.02) { HC.x = x; HC.y = y; } else { const k = Math.min(1, dt * 16); HC.x += (x - HC.x) * k; HC.y += (y - HC.y) * k; }
  el.style.transform = `translate(${Math.round(HC.x)}px,${Math.round(HC.y)}px) scale(${0.96 + HC.show * 0.04})`;
  el.style.opacity = HC.show.toFixed(3); el.style.visibility = HC.show < 0.02 ? 'hidden' : 'visible';
}
cv.addEventListener('mouseenter', () => { HC.on = true; });
cv.addEventListener('mouseleave', () => { HC.on = false; HC.target = null; });
cv.addEventListener('mousemove', () => { HC.on = true; });
// ---------- En el mundo: marco que se desliza y anillo bajo la criatura ----------
function drawHoverMark(ctx) {
  const t = HC.target, now = performance.now() / 1000, dt = Math.min(0.05, now - (HC.mk || now)); HC.mk = now;
  if (!t || ui.open) return;
  const pulse = 0.5 + 0.5 * Math.sin(now * 5);
  if (t.k === 'foe' || t.k === 'an') {
    const o = t.o, r = (t.k === 'foe' ? o.D.s : SPECIES[o.sp].s) + 6, col = t.k === 'foe' || HOSTILE[o.sp] ? '255,107,91' : '127,208,122';
    ctx.strokeStyle = `rgba(${col},${0.5 + pulse * 0.4})`; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -now * 12;
    ctx.beginPath(); ctx.ellipse(o.x, o.y + r * 0.55, r, r * 0.38, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); return;
  }
  // Esquinas que se deslizan suavemente de casilla en casilla
  const gx = mouse.tx * T, gy = mouse.ty * T; if (HC.mx === undefined || Math.abs(HC.mx - gx) > T * 6 || Math.abs(HC.my - gy) > T * 6) { HC.mx = gx; HC.my = gy; }
  const k = Math.min(1, dt * 22); HC.mx += (gx - HC.mx) * k; HC.my += (gy - HC.my) * k;
  const x = HC.mx, y = HC.my, s = T, c = 7 + pulse * 1.5, o = -1 - pulse;
  ctx.strokeStyle = t.k === 'block' ? 'rgba(224,181,76,.95)' : 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath();
  for (const [cx, cy, sx, sy] of [[x + o, y + o, 1, 1], [x + s - o, y + o, -1, 1], [x + o, y + s - o, 1, -1], [x + s - o, y + s - o, -1, -1]]) { ctx.moveTo(cx, cy + sy * c); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * c, cy); }
  ctx.stroke();
}
