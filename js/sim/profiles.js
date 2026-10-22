'use strict';
// =====================================================================================
//  Personajes como en Terraria: hasta 5 por cuenta, cada uno con su nombre, aspecto, raza,
//  profesión, inventario, equipo, salud y habilidades. Viajan contigo entre mundos y servidores:
//  lo que lleves al salir de un mundo es lo que tendrás al entrar en otro.
//   · Sin sesión: personajes y mundos de este navegador ('' en WNS).
//   · Con sesión de Discord: los de tu cuenta (en el servidor y en caché aquí). Al cerrar sesión
//     vuelven los de sin cuenta.
// =====================================================================================
const MAX_CHARS = 5;
const CH_KEYS = ['inv', 'equip', 'pc', 'sel', 'buffs', 'lore', 'seenRec', 'autoSort'];
const PF = { list: [], active: null, ns: null, dirty: 0, pushT: 0 };
const charsKey = () => WNS ? 'tc@' + WNS + ':chars' : 'tc-chars';
const clone = o => o === undefined ? undefined : JSON.parse(JSON.stringify(o));
const newCharId = () => 'pj' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const activeChar = () => PF.list.find(c => c.id === PF.active) || null;
function pfLoad() {
  try { const d = JSON.parse(lsGet(charsKey())) || {}; PF.list = Array.isArray(d.list) ? d.list : []; PF.active = d.active || null; } catch (e) { PF.list = []; PF.active = null; }
  if (PF.active && !activeChar()) PF.active = null; PF.ns = WNS;
}
function pfSaveLocal() { lsSet(charsKey(), JSON.stringify({ list: PF.list, active: PF.active })); }
// ---------- Cuenta en el servidor ----------
const pfAccount = () => NET.kind === 'ws' && NET.room && NET.room.me && NET.room.me.verified && NET.room.chars;
async function pfSync() {
  if (!pfAccount()) return;
  try {
    const remote = await NET.room.chars(), byId = new Map(PF.list.map(c => [c.id, c]));
    for (const r of remote) { const l = byId.get(r.id); if (!l || (r.played || 0) > (l.played || 0)) byId.set(r.id, r); }
    for (const [id, c] of byId) if (!remote.find(r => r.id === id) || (c.played || 0) > ((remote.find(r => r.id === id) || {}).played || 0)) NET.room.charPut(id, c).catch(() => { });
    PF.list = [...byId.values()].filter(c => !c._del).sort((a, b) => (a.created || 0) - (b.created || 0)).slice(0, MAX_CHARS);
    if (PF.active && !activeChar()) PF.active = null; pfSaveLocal(); pfRefresh();
  } catch (e) { }
}
function pfPush(c, now) { PF.dirty = 1; pfSaveLocal(); if (!pfAccount()) return; clearTimeout(PF.pushT); PF.pushT = setTimeout(() => NET.room.charPut(c.id, c).catch(() => { }), now ? 0 : 1500); }
// Cambiar de cuenta: se guarda y se cierra lo abierto, y aparecen los personajes y mundos de la otra
const nsOf = id => String(id || '').replace(/[^a-z0-9:_-]/gi, '').slice(0, 40);
function pfSetNS(ns, why) {
  ns = ns || ''; if (ns === WNS && PF.ns === ns) return false;
  if (S && currentWorld) { saveGame(true); if (inGame()) netLeave(true, false); S = null; currentWorld = null; FOES = []; ANIMALS = []; if (ui.open !== 'title') openTitle(); }
  WNS = ns; pfLoad(); if (!ns) pfMigrate();
  if (why) toast(why); pfRefresh(); return true;
}
// La primera vez (sin cuenta): el personaje del último mundo jugado pasa a ser tu primer perfil
function pfMigrate() {
  if (PF.list.length || lsGet('tc-chars-migrated')) return; lsSet('tc-chars-migrated', '1');
  const w = worldIndex().sort((a, b) => (b.played || 0) - (a.played || 0))[0]; if (!w) return;
  try { const d = JSON.parse(lsGet(WKEY(w.id))); if (!d || !d.char || !d.char.made) return;
    const c = { id: newCharId(), char: d.char, created: Date.now(), played: Date.now(), playMs: 0, worlds: {} }; for (const k of CH_KEYS) if (d[k] !== undefined) c[k] = d[k];
    PF.list.push(c); PF.active = c.id; pfSaveLocal(); } catch (e) { }
}
// ---------- Del personaje al mundo y del mundo al personaje ----------
const worldKeyNow = () => currentWorld && String(currentWorld).startsWith('mp-') ? null : currentWorld;
function pfApply() {
  const c = activeChar(); if (!c || !S) return;
  S._cid = c.id; // de quién son el inventario y la salud que hay ahora en el mundo
  S.char = { ...clone(c.char), made: true }; for (const k of CH_KEYS) { if (c[k] !== undefined) S[k] = clone(c[k]); else if (k === 'inv') S.inv = new Array(INV_N).fill(null); else if (k === 'equip') S.equip = {}; else delete S[k]; }
  delete S.nick; charData(); if (!S.pc) pcInit(); _cmKey = '';
  const wk = worldKeyNow(), wd = wk && c.worlds && c.worlds[wk];
  if (wd && wd.x !== undefined) { S.player.x = wd.x; S.player.y = wd.y; }
  // Primera vez en un mundo creado con «kit rico»: el regalo va a este personaje
  if (wk) (c.worlds || (c.worlds = {}))[wk] = { ...(wd || {}), kit: 1, name: S.name, at: Date.now() };
  invVersion++; vitalsDirty = true;
}
let _pfT0 = performance.now();
function pfCapture() {
  // Siempre al personaje que entró en este mundo, aunque ya hayas elegido otro en el menú
  const c = S && PF.list.find(x => x.id === S._cid); if (!c || !S.char) return;
  c.char = clone(S.char); for (const k of CH_KEYS) if (S[k] !== undefined) c[k] = clone(S[k]);
  const now = performance.now(); c.playMs = (c.playMs || 0) + Math.max(0, now - _pfT0); _pfT0 = now; c.played = Date.now();
  const wk = worldKeyNow(); if (wk) (c.worlds || (c.worlds = {}))[wk] = { ...((c.worlds || {})[wk] || {}), x: Math.round(S.player.x), y: Math.round(S.player.y), name: S.name, at: Date.now(), kit: 1 };
  else if (inGame()) (c.worlds || (c.worlds = {}))['online'] = { name: 'En línea · ' + (S.name || ''), at: Date.now() };
  pfPush(c);
}
// Guardar el mundo también guarda el personaje; entrar en un mundo pone el personaje elegido
{ const s0 = saveGame; saveGame = quiet => { if (S && currentWorld) pfCapture(); return s0(quiet); }; }
{ const e0 = enterWorld; enterWorld = () => {
  if (!activeChar()) { toastErr('Elige o crea un personaje'); S = null; currentWorld = null; openTitle(); showChars(); return; }
  pfApply(); _pfT0 = performance.now(); e0();
}; }
// «Volver a la partida» con otro personaje elegido: se guarda y se reabre con el nuevo
{ const w0 = worldAction; worldAction = (act, btn) => { const [k] = act.split(':');
  if ((k === 'play' || k === 'resume') && S && currentWorld && S._cid !== PF.active) { const id = k === 'resume' ? currentWorld : act.split(':')[1]; saveGame(true); if (inGame()) netLeave(true); S = null; currentWorld = null; return w0('play:' + id, btn); }
  return w0(act, btn); }; }
// Mundo nuevo: ya no se crea personaje aquí (va antes, en Personajes)
createFromForm = () => {
  if (!activeChar()) { showChars(); return; }
  const gen = previewGen(), id = newWorldId(); if (S && currentWorld) saveGame(true);
  newGame(gen, { name: (cwS.name || '').trim() || 'Mi mundo', kit: 'empty', alwaysDay: cwS.alwaysDay, sandbox: cwS.sandbox, surv: cwS.surv !== false });
  S.created = Date.now(); currentWorld = id; { const dl = S.gen.dayLen || DAY_LEN; S.time = ((cwS.startHour ?? 7) / 24) * dl; }
  enterWorld(); if (!saveGame(true)) toast('Aviso: este navegador no permite guardar; la partida se perderá al cerrar'); openModal('help');
};
// ---------- Crear personaje (sin mundo abierto: se usa un mundo de mentira solo para montarlo) ----------
function pfCreate() {
  if (PF.list.length >= MAX_CHARS) { toastErr(`Como mucho ${MAX_CHARS} personajes: borra uno antes`); return; }
  if (S && currentWorld) { saveGame(true); S = null; currentWorld = null; }
  const prevS = S;
  S = { v: 3, gen: { ...GEN_DEFAULT }, inv: new Array(INV_N).fill(null), sel: 0, tier: 0, del: {}, player: { x: 0, y: 0 }, time: 200, equip: {}, _fake: 1 };
  openCharCreator('new', () => {
    const c = { id: newCharId(), char: clone(S.char), created: Date.now(), played: Date.now(), playMs: 0, worlds: {} };
    for (const k of CH_KEYS) if (S[k] !== undefined) c[k] = clone(S[k]);
    PF.list.push(c); PF.active = c.id; pfPush(c, true); S = prevS && !prevS._fake ? prevS : null;
    ui.open = 'title'; $('mTitle').hidden = false; showChars(); toast('¡' + c.char.name + ' está listo!');
  });
}
// Cerrar el creador con el «mundo de mentira» (cancelar, o terminar de cambiar el aspecto): se vuelve a Personajes.
// Con «keep» (crear personaje) lo termina pfCreate, que todavía necesita S.
{ const c0 = closeCC; closeCC = keep => { const f = S && S._fake ? S : null; c0(keep); if (f && !keep) { if (f._onClose) f._onClose(f); S = null; ui.open = 'title'; $('mTitle').hidden = false; showChars(); } }; }
addEventListener('keydown', e => { if (e.key === 'Escape' && CC && S && S._fake) { e.stopImmediatePropagation(); closeCC(); } }, true);
// ---------- El nombre del jugador es el del personaje ----------
const pfName = () => { const c = activeChar(); return c ? c.char.name : ''; };
// ---------- Pantalla de personajes ----------
const RACE_OF = c => raceOf(c.char.look), PROF_OF = c => PROFS[c.char.prof] || PROFS.vagabond;
const lvSum = c => Object.values((c.pc && c.pc.lv) || {}).reduce((s, v) => s + v, 0);
const fmtHours = ms => { const m = Math.round((ms || 0) / 60000); return m < 60 ? m + ' min' : (m / 60).toFixed(1).replace('.0', '') + ' h'; };
let _chAnim = 0, _chSel = null;
function showChars() {
  if (S && currentWorld && ui.open === 'title') { /* el mundo abierto queda detrás */ }
  _chSel = _chSel || PF.active;
  const slots = []; for (let i = 0; i < MAX_CHARS; i++) slots.push(PF.list[i] || null);
  const acc = WNS ? (NET.me.name || 'tu cuenta') : null;
  $('tBody').innerHTML = `<div class="mpw wide chw"><header class="mph"><button class="ico" data-pf="back" aria-label="Volver">${svgI('M15 5l-7 7 7 7', 18)}</button><h2>Personajes</h2><span class="chns">${acc ? `☁ ${esc(acc)}` : '💾 Sin cuenta'}</span></header>
    <p class="mut small center">${acc ? 'Los personajes de tu cuenta te siguen a cualquier ordenador.' : 'Guardados en este navegador. Inicia sesión con Discord para tener personajes en tu cuenta.'} Cada uno lleva su propio inventario entre mundos y servidores.</p>
    <div class="pfgrid">${slots.map((c, i) => c ? `<div class="chc ${c.id === PF.active ? 'act' : ''}" data-pf="sel:${c.id}" role="button" tabindex="0" style="--d:${i * 50}ms">
        <canvas class="chav" data-av="${c.id}" width="120" height="132"></canvas>
        <b>${esc(c.char.name)}</b><span class="mut small">${esc(RACE_OF(c).n)} · ${esc(PROF_OF(c).n)}</span>
        <span class="chbar"><i style="width:${Math.round(100 * clamp(((c.pc && c.pc.hp) ?? 100) / 100, 0, 1))}%"></i></span>
        <span class="mut tiny">Nv. ${lvSum(c)} · ${fmtHours(c.playMs)} · ${c.played ? fmtDate(c.played) : ''}</span>
        <span class="chbtns"><button data-pf="info:${c.id}">Ficha</button><button class="pri" data-pf="use:${c.id}">${c.id === PF.active ? '✓ Elegido' : 'Elegir'}</button></span></div>`
      : `<button class="chc empty" data-pf="new" style="--d:${i * 50}ms"><span class="chplus">+</span><b>Nuevo personaje</b><span class="mut small">Hueco ${i + 1} de ${MAX_CHARS}</span></button>`).join('')}</div>
    <div class="chfoot">${activeChar() ? `<button class="pri" data-pf="go">Continuar con ${esc(pfName())} →</button>` : '<span class="mut small">Elige o crea un personaje para jugar.</span>'}</div></div>`;
  chAnimate();
}
function chAnimate() {
  cancelAnimationFrame(_chAnim); const t0 = performance.now();
  const step = now => {
    const cvs = document.querySelectorAll('canvas[data-av]'); if (!cvs.length) return;
    for (const cv of cvs) { const c = PF.list.find(x => x.id === cv.dataset.av); if (!c) continue; const g = cv.getContext('2d'), hover = cv.closest('.chc:hover'), big = cv.classList.contains('chbig');
      g.clearRect(0, 0, cv.width, cv.height); g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(cv.width / 2, cv.height - 14, big ? 40 : 26, big ? 10 : 7, 0, 0, 7); g.fill();
      const t = (now - t0) / 1000, ang = cv._ang ?? (hover ? 1.57 + Math.sin(t * 1.5) * 0.9 : 1.57);
      try { drawAvatar(g, c.char.look, c.equip || {}, cv.width / 2, cv.height - 12, ang, hover || big ? t * 7 : 0, !!(hover || cv._walk), big ? 6 : 3.6); } catch (e) { } }
    _chAnim = requestAnimationFrame(step);
  };
  _chAnim = requestAnimationFrame(step);
}
// ---------- Ficha completa (ventana) ----------
const mChar = document.createElement('div'); mChar.id = 'mCharInfo'; mChar.className = 'modal chm'; mChar.hidden = true; document.body.appendChild(mChar);
let _chInfo = null;
function openCharInfo(id) {
  const c = PF.list.find(x => x.id === id); if (!c) return; _chInfo = id; const R = RACE_OF(c), pf = PROF_OF(c), pc = c.pc || {}, eq = c.equip || {}, inv = c.inv || [];
  const bar = (lab, v, max, col) => `<div class="chst"><span>${lab}</span><span class="cb"><i style="width:${(clamp(v / max, 0, 1) * 100).toFixed(0)}%;background:${col}"></i></span><b>${Math.round(v)}</b></div>`;
  const slot = (id2, n, k) => `<div class="chs ${id2 ? '' : 'emp'}" ${id2 ? `data-tip="${esc(id2)}"` : `title="${esc(k || '')}"`}>${id2 ? itemImg(id2, 26) : ''}${n > 1 ? `<span class="n">${n > 999 ? fmt(n) : n}</span>` : ''}</div>`;
  // Equipo como muñeco: armadura a la izquierda, figura con capa/guantes/escudo, joyas a la derecha y runas en arco
  const eqName = k => (EQ_N[slotType(k)] || k) + (/\d$/.test(k) ? ' ' + k.slice(-1) : '');
  const eqs = (k, cls = '') => { const id2 = eq[k]; return `<div class="chs eqs ${cls} ${id2 ? '' : 'emp'}" ${id2 ? `data-tip="${esc(id2)}"` : `title="${esc(eqName(k))} · vacío"`}>${id2 ? itemImg(id2, 26) : `<span class="ph">${EQ_ICON[slotType(k)] || ''}</span>`}</div>`; };
  const eqRow = k => `<div class="eqrow">${eqs(k)}<div><small>${esc(eqName(k))}</small><b class="${eq[k] ? '' : 'mut'}">${eq[k] ? esc(ITEMS[eq[k]].n) : 'Vacío'}</b></div></div>`;
  const eqN = EQ_SLOTS.filter(k => eq[k]).length;
  const eqH = `<div class="eqdoll">
    <div class="eqgrp eqarm"><small class="eqt">Armadura</small>${['head', 'chest', 'legs', 'feet'].map(eqRow).join('')}</div>
    <div class="eqfig"><svg viewBox="0 0 120 200" class="eqsil"><circle cx="60" cy="26" r="15"/><path d="M38 52Q60 44 82 52L92 104 81 107 76 72 74 120 78 192H64L60 130 56 192H42L46 120 44 72 39 107 28 104Z"/></svg>
      <div class="eqat" style="left:4px;top:30px">${eqs('back')}</div><div class="eqat" style="right:4px;top:30px">${eqs('costume')}</div>
      <div class="eqat" style="left:0;top:112px">${eqs('hands')}</div><div class="eqat" style="right:0;top:112px">${eqs('shield')}</div>
      <div class="eqat" style="left:50%;bottom:0;transform:translateX(-50%)">${eqs('totem', 'eqtot')}</div></div>
    <div class="eqgrp eqjew"><small class="eqt">Joyas</small><div class="eqrings">${eqs('ring1', 'eqring')}${eqs('ring2', 'eqring')}</div><div class="eqaccs">${['acc1', 'acc2', 'acc3', 'acc4'].map(k => eqs(k)).join('')}</div></div>
  </div><div class="eqrunebar"><small class="eqt">Runas engarzadas</small><div>${[1, 2, 3, 4, 5, 6].map(i => eqs('rune' + i, 'eqrune')).join('')}</div></div>`;
  const invH = Array.from({ length: INV_N }, (_, i) => { const s = inv[i]; return slot(s && s.id, s && s.n) + (i === 8 ? '<div class="chsep"></div>' : ''); }).join('');
  const skills = Object.entries(SKILLS).map(([k, s]) => { const lv = (pc.lv && pc.lv[k]) || 0; return `<div class="chsk" title="${esc(s[2])}"><span>${s[1]}</span><span>${esc(s[0])}</span><b>${lv}</b><span class="cb"><i style="width:${Math.min(100, lv * 5)}%"></i></span></div>`; }).join('');
  const worlds = Object.entries(c.worlds || {}).sort((a, b) => (b[1].at || 0) - (a[1].at || 0)).slice(0, 8);
  const items = inv.filter(Boolean).reduce((s, x) => s + x.n, 0);
  mChar.innerHTML = `<div class="modal-in chin"><header class="pzh"><div><h2 class="chname"><span id="chNameT">${esc(c.char.name)}</span> <button class="ico sm" data-pf="ren:${c.id}" title="Cambiar nombre">✎</button></h2><div class="chtags"><span>${R.i} ${esc(R.n)}</span><span>${esc(pf.n)}</span><span>${moodOf(c.char.look).i} ${esc(moodOf(c.char.look).n)}</span>${(c.char.traits || []).slice(0, 4).map(t => TRAITS[t] ? `<span title="${esc(TRAITS[t].d)}">${esc(TRAITS[t].n)}</span>` : '').join('')}</div></div><button data-pf="close">Cerrar <kbd>Esc</kbd></button></header>
    <div class="chcols"><div class="chleft"><canvas class="chav chbig" data-av="${c.id}" width="200" height="230"></canvas><div class="row center"><button class="ico" data-pf="rot:-1">⟲</button><button class="ico" data-pf="walk">🚶</button><button class="ico" data-pf="rot:1">⟳</button></div>
      ${bar('❤ Vida', pc.hp ?? 100, 100 + 2 * ((pc.lv && pc.lv.fit) || 0), '#e05050')}${bar('🍖 Hambre', pc.food ?? 100, 100, '#e0a040')}${bar('💧 Sed', pc.water ?? 100, 100, '#4aa8ec')}${bar('🌙 Energía', pc.energy ?? 100, 100, '#a47ae8')}
      <div class="chfacts"><div><small>Jugado</small><b>${fmtHours(c.playMs)}</b></div><div><small>Objetos</small><b>${fmt(items)}</b></div><div><small>Nivel total</small><b>${lvSum(c)}</b></div><div><small>Creado</small><b>${fmtDate(c.created).split(',')[0]}</b></div></div></div>
    <div class="chright"><div class="cssub">Equipo · ${eqN}/${EQ_SLOTS.length}</div>${eqH}<div class="cssub">Inventario · ${inv.filter(Boolean).length}/${INV_N} huecos</div><div class="chinv">${invH}</div>
      <div class="cssub">Habilidades</div><div class="chskg">${skills}</div>
      ${worlds.length ? `<div class="cssub">Mundos visitados</div><div class="chworlds">${worlds.map(([k, w]) => `<span>${esc(w.name || k)}<small>${fmtDate(w.at)}</small></span>`).join('')}</div>` : ''}</div></div>
    <footer class="chmf"><button class="danger" data-pf="del:${c.id}">Borrar…</button><span class="grow"></span><button data-pf="look:${c.id}">Cambiar aspecto</button><button class="pri" data-pf="use:${c.id}">${c.id === PF.active ? '✓ Elegido' : 'Elegir'}</button></footer></div>`;
  mChar.hidden = false; chAnimate();
}
function closeCharInfo() { mChar.hidden = true; _chInfo = null; hideTip(); if ($('tBody') && document.querySelector('.pfgrid')) showChars(); }
// Pista de cada objeto de la ficha (sin depender de un mundo abierto)
function chTip(id, x, y) { const it = ITEMS[id]; if (!it) return; const t = $('tip'); t.innerHTML = `<b>${esc(it.n)}</b><div class="mut small">${esc(ICATS[it.cat] || '')}</div><div>${esc(it.d || '')}</div>${it.weapon ? `<div class="small">⚔ Daño ${it.weapon.dmg}${it.weapon.el ? ' · ' + it.weapon.el : ''}</div>` : ''}${it.armor ? `<div class="small">🛡 Defensa ${it.armor.def}</div>` : ''}${it.food ? `<div class="small">🍖 Alimenta</div>` : ''}`; t.hidden = false; const right = x > innerWidth - 320, below = y < 260; t.style.transform = `translate(${right ? x - 14 : x + 14}px,${below ? y + 18 : y - 10}px) translate(${right ? '-100%' : '0'},${below ? '0' : '-100%'})`; }
mChar.addEventListener('mousemove', e => { const s = e.target.closest('[data-tip]'); if (s) chTip(s.dataset.tip, e.clientX, e.clientY); else hideTip(); });
mChar.addEventListener('mouseleave', hideTip);
mChar.addEventListener('mousedown', e => { if (e.target === mChar) closeCharInfo(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !mChar.hidden) { e.stopImmediatePropagation(); closeCharInfo(); } }, true);
// ---------- Clics ----------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-pf]'); if (!b) return; const [a, id] = b.dataset.pf.split(':');
  if (a === 'sel' && e.target.closest('button')) return;
  if (a === 'back') { showMain(); return; }
  if (a === 'new') { pfCreate(); return; }
  if (a === 'sel') { openCharInfo(id); return; }
  if (a === 'info') { openCharInfo(id); return; }
  if (a === 'use') { if (S && currentWorld && PF.active !== id) { saveGame(true); if (inGame()) netLeave(true); S = null; currentWorld = null; } PF.active = id; pfSaveLocal(); if (!mChar.hidden) openCharInfo(id); else showChars(); toast('Personaje: ' + pfName()); netRefreshUI(); return; }
  if (a === 'go') { showMain(); return; }
  if (a === 'close') { closeCharInfo(); return; }
  if (a === 'rot') { const cv = mChar.querySelector('.chbig'); if (cv) cv._ang = (cv._ang ?? 1.57) + (+id) * Math.PI / 4; return; }
  if (a === 'walk') { const cv = mChar.querySelector('.chbig'); if (cv) cv._walk = !cv._walk; return; }
  if (a === 'ren') { const c = PF.list.find(x => x.id === id); const n = prompt('Nuevo nombre del personaje', c.char.name); if (n && n.trim()) { c.char.name = n.trim().slice(0, 24); c.played = Date.now(); pfPush(c, true); openCharInfo(id); } return; }
  if (a === 'del') { const c = PF.list.find(x => x.id === id); const n = prompt(`Para borrar a «${c.char.name}» para siempre (con todo su inventario), escribe su nombre:`); if (n !== c.char.name) { if (n !== null) toastErr('El nombre no coincide: no se ha borrado'); return; }
    if (S && currentWorld && PF.active === id) { saveGame(true); S = null; currentWorld = null; }
    PF.list = PF.list.filter(x => x.id !== id); if (PF.active === id) PF.active = PF.list[0] ? PF.list[0].id : null; pfSaveLocal(); if (pfAccount()) NET.room.charDel(id).catch(() => { }); closeCharInfo(); toast('Personaje borrado'); return; }
  if (a === 'look') { const c = PF.list.find(x => x.id === id); closeCharInfo(); pfEditLook(c); return; }
});
document.addEventListener('dblclick', e => { const c = e.target.closest('.chc[data-pf^="sel:"]'); if (c) { const id = c.dataset.pf.slice(4); PF.active = id; pfSaveLocal(); showMain(); } });
// Cambiar el aspecto de un personaje desde la pantalla de personajes
function pfEditLook(c) {
  if (S && currentWorld) { saveGame(true); S = null; currentWorld = null; }
  S = { v: 3, gen: { ...GEN_DEFAULT }, inv: clone(c.inv) || [], equip: clone(c.equip) || {}, char: clone(c.char), tier: 0, del: {}, player: { x: 0, y: 0 }, time: 200, _fake: 1 };
  S._onClose = f => { c.char = { ...clone(f.char), made: true }; c.played = Date.now(); pfPush(c, true); };
  openCharCreator('look');
}
// ---------- Al conectar: espacio de la cuenta (con sesión de Discord) o el de sin cuenta ----------
function pfRefresh() { if (ui.open === 'title') { if (document.querySelector('.pfgrid')) showChars(); else if (document.querySelector('.mmain')) showMain(); } }
{ const c0 = netConnectWs; netConnectWs = async url => { await c0(url); const acc = NET.kind === 'ws' && NET.me.verified; if (pfSetNS(acc ? nsOf(NET.me.id) : '', acc ? 'Cuenta: ' + NET.me.name : '') || acc) pfSync(); }; }
pfLoad(); pfMigrate();
// La conexión llega cuando llega (al arrancar, al iniciar o cerrar sesión): se vigila y se cambia de espacio
setInterval(() => { if (!NET.kind) return; if (NET.kind === 'ws' && !NET.me.verified && typeof dcSess === 'function' && dcSess() && WNS) return; const want = NET.kind === 'ws' && NET.me.verified ? nsOf(NET.me.id) : ''; if (want !== WNS) { pfSetNS(want, want ? 'Cuenta: ' + NET.me.name : 'Sin sesión: personajes y mundos de este navegador'); if (want) pfSync(); } }, 400);
// Cerrar sesión: fuera de cualquier mundo en línea o de la cuenta, y vuelven los de sin cuenta
{ const o0 = dcLogout; dcLogout = () => { const was = WNS; if (inGame()) netLeave(true); o0(); if (was) pfSetNS('', 'Sesión cerrada: personajes y mundos de este navegador'); }; }
