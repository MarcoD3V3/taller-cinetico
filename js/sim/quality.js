'use strict';
// =====================================================================================
//  Calidad de armas y herramientas. Cada pieza fabricada a mano sale con una calidad
//  (de «Pobre» a «Obra maestra») y a veces con rasgos buenos o malos (filo agudo, peso
//  extra…). Depende de lo bien que hagas el minijuego de fabricar y de tu nivel de
//  fabricación. Una pieza con calidad es otro objeto: «ironSword~2al» = espada de hierro
//  Excelente con filo agudo y ligereza. Así se apila, se guarda, se equipa y viaja en
//  línea como cualquier objeto, sin tocar el inventario.
// =====================================================================================
const Q_TIERS = {
  '-2': { n: 'Pobre', c: '#ff6b5b', st: 0 }, '-1': { n: 'Deficiente', c: '#e0965a', st: 1 }, '0': { n: 'Común', c: '#cfcac0', st: 2 },
  '1': { n: 'Notable', c: '#7fd07a', st: 3 }, '2': { n: 'Excelente', c: '#6ab8ff', st: 4 }, '3': { n: 'Obra maestra', c: '#f0c75e', st: 5 },
};
// Rasgos: dmg (daño del arma), spd (rapidez de golpe o de trabajo), dur (usos)
const Q_TRAITS = {
  a: { n: 'Filo agudo', good: 1, m: { dmg: 0.12 }, w: 1 },
  l: { n: 'Ligereza', good: 1, m: { spd: 0.12 } },
  r: { n: 'Refuerzo', good: 1, m: { dur: 0.35 } },
  e: { n: 'Equilibrio', good: 1, m: { dmg: 0.05, spd: 0.05, dur: 0.1 } },
  m: { n: 'Mellas', good: 0, m: { dmg: -0.12 }, w: 1 },
  p: { n: 'Peso extra', good: 0, m: { spd: -0.12 } },
  f: { n: 'Fragilidad', good: 0, m: { dur: -0.35 } },
};
const Q_STAT_N = { dmg: 'Daño', spd: 'Rapidez', dur: 'Usos' };
const qCanHave = id => { const it = ITEMS[id]; return !!it && !String(id).includes('~') && (!!it.weapon || !!(TOOLS[id] && TOOLS[id].kind !== 'util')); };
const _qDefs = new Map();
// Lee un identificador con calidad: { base, tier, traits, mul }
function qParse(id) {
  if (typeof id !== 'string' || !id.includes('~')) return null;
  if (_qDefs.has(id)) return _qDefs.get(id);
  const m = /^(.+)~(-?\d)([a-z]*)$/.exec(id); let d = null;
  if (m && Q_TIERS[m[2]] && [...m[3]].every(k => Q_TRAITS[k]) && Object.prototype.hasOwnProperty.call(ITEMS, m[1]) && qCanHave(m[1])) {
    const tier = +m[2], traits = [...m[3]], mul = { dmg: 1 + 0.07 * tier, spd: 1 + 0.04 * tier, dur: 1 + 0.15 * tier };
    for (const k of traits) for (const s in Q_TRAITS[k].m) mul[s] += Q_TRAITS[k].m[s];
    for (const s in mul) mul[s] = Math.max(0.3, Math.round(mul[s] * 100) / 100);
    d = { id, base: m[1], tier, traits, mul };
  }
  _qDefs.set(id, d); return d;
}
const qBase = id => { const d = qParse(id); return d ? d.base : id; };
// Las tablas ITEMS, WEAPONS y TOOLS crean la pieza la primera vez que alguien la pide
function qItem(d) {
  const b = ITEMS[d.base], it = { ...b, n: `${b.n} · ${Q_TIERS[d.tier].n}`, q: d };
  // Los datos del arma o herramienta pueden estar solo en WEAPONS o TOOLS (picos de metal, armas nuevas…):
  // sin esto, la pieza con calidad no era herramienta y no podía picar nada que pidiera nivel
  const own = (tab, k) => tab && Object.getOwnPropertyDescriptor(tab, k)?.value, W0 = own(typeof WEAPONS !== 'undefined' ? WEAPONS : null, d.base), T0 = own(TOOLS, d.base);
  const bw = b.weapon || W0 ? { ...(b.weapon || {}), ...(W0 || {}) } : null, bt = b.tool || T0 ? { ...(b.tool || {}), ...(T0 || {}) } : null;
  if (bw) it.weapon = { ...bw, dmg: Math.round(bw.dmg * d.mul.dmg * 100) / 100 };
  if (bt) it.tool = { ...bt, mult: Math.round(bt.mult * d.mul.spd * 100) / 100 };
  return it;
}
function qTable(tab, make) {
  const proto = Object.getPrototypeOf(tab);
  const get = (k, r) => { const d = typeof k === 'string' && k.includes('~') ? qParse(k) : null; if (!d) return undefined; const v = make(d); if (v === undefined) return undefined; Object.defineProperty(r, k, { value: v, enumerable: false, configurable: true, writable: true }); return v; };
  Object.setPrototypeOf(tab, new Proxy(proto, {
    get: (t, k, r) => { if (typeof k === 'string' && k.includes('~')) return get(k, r); return Reflect.get(t, k, r); },
    has: (t, k) => typeof k === 'string' && k.includes('~') ? get(k, tab) !== undefined : Reflect.has(t, k),
  }));
}
qTable(ITEMS, qItem);
qTable(WEAPONS, d => WEAPONS[d.base] ? ITEMS[d.id].weapon : undefined);
qTable(TOOLS, d => TOOLS[d.base] ? ITEMS[d.id].tool : undefined);
// Usos y rapidez de golpe
{ const m0 = maxDur; maxDur = id => { const d = qParse(id); return d ? Math.round(m0(d.base) * d.mul.dur) : m0(id); }; }
{ const w0 = weaponProfile; weaponProfile = id => { const pr = w0(id), d = qParse(id); if (pr && d && pr.cd) pr.cd = pr.cd / d.mul.spd; return pr; }; }
// Se dibuja como la pieza normal
{ const s0 = itemSprite; itemSprite = id => s0(qBase(id)); }
{ const i0 = iconStyle; iconStyle = id => i0(qBase(id)); }
{ const u0 = iconURL; iconURL = id => u0(qBase(id)); }
// Ranuras: un borde del color de la calidad
{ const d0 = durStyle; durStyle = (el, id) => { d0(el, id); const d = id && qParse(id), v = d ? String(d.tier) : ''; if ((el.dataset.q || '') !== v) { if (v) el.dataset.q = v; else delete el.dataset.q; } }; }
// ---------- Tirada de calidad ----------
// q: nota del minijuego (0..1; -1 si se saltó). Pesa más el minijuego que el nivel.
function qRoll(base, q) {
  const lv = typeof lvOf === 'function' ? lvOf('craft') : 0, skill = 1 - Math.exp(-lv / 8);
  const game = q < 0 ? 0.3 : q, s = clamp(0.8 * game + 0.2 * skill + (Math.random() - 0.5) * 0.12, 0, 1);
  const tier = s < 0.16 ? -2 : s < 0.34 ? -1 : s < 0.6 ? 0 : s < 0.78 ? 1 : s < 0.92 ? 2 : 3;
  const isW = !!ITEMS[base].weapon, pick = good => { const ks = Object.keys(Q_TRAITS).filter(k => !!Q_TRAITS[k].good === good && (isW || !Q_TRAITS[k].w)); return ks[(Math.random() * ks.length) | 0]; };
  const traits = new Set();
  if (tier >= 3) { traits.add(pick(true)); traits.add(pick(true)); }
  else if (tier >= 1) { if (Math.random() < 0.65) traits.add(pick(true)); }
  else if (tier <= -1) { traits.add(pick(false)); if (tier === -2 && Math.random() < 0.5) traits.add(pick(false)); }
  else if (Math.random() < 0.45) { traits.add(pick(true)); traits.add(pick(false)); } // común con un pro y un contra
  if (traits.has('e') && traits.size > 1) traits.delete([...traits].find(k => k !== 'e' && Q_TRAITS[k].good));
  const t = [...traits].sort().join('');
  return { id: tier === 0 && !t ? base : `${base}~${tier}${t}`, tier, traits: [...traits], score: s, skill };
}
// Cambios frente a la pieza normal: [[«Daño», «+12 %», bueno]]
function qDiff(id) {
  const d = qParse(id); if (!d) return [];
  const isW = !!ITEMS[d.base].weapon, out = [];
  for (const s of isW ? ['dmg', 'spd', 'dur'] : ['spd', 'dur']) { const p = Math.round((d.mul[s] - 1) * 100); if (p) out.push([Q_STAT_N[s], (p > 0 ? '+' : '') + p + ' %', p > 0]); }
  return out;
}
const qStars = tier => { const n = Q_TIERS[tier].st; return '★'.repeat(n) + '☆'.repeat(5 - n); };
function qBlockHTML(id) {
  const d = qParse(id); if (!d) return ''; const T2 = Q_TIERS[d.tier];
  return `<div class="qblk" style="--qc:${T2.c}"><div class="qtop"><span class="qst">${qStars(d.tier)}</span><b>${T2.n}</b></div>
    ${d.traits.length ? `<div class="qtr">${d.traits.map(k => `<span class="${Q_TRAITS[k].good ? 'up' : 'down'}">${Q_TRAITS[k].n}</span>`).join('')}</div>` : ''}
    <div class="qdf">${qDiff(id).map(([a, v, g]) => `<span class="${g ? 'up' : 'down'}">${a} ${v}</span>`).join('') || '<span class="mut">Igual que una normal</span>'}</div></div>`;
}
// Ficha y tooltip: la calidad arriba; de dónde sale y para qué sirve, como la normal
{ const i0 = icIndex; icIndex = () => { const X = i0(); if (!X._q) { X._q = 1; for (const m of [X.src, X.use]) Object.setPrototypeOf(m, new Proxy(Object.getPrototypeOf(m), { get: (t, k, r) => typeof k === 'string' && k.includes('~') ? r[qBase(k)] : Reflect.get(t, k, r) })); } return X; }; }
{ const c0 = itemCardHTML; itemCardHTML = (id, have) => { const h = c0(id, have); return qParse(id) ? h.replace(/(<\/div><\/div>)/, `$1${qBlockHTML(id)}`) : h; }; }
{ const t0 = itemTip; itemTip = id => { const h = t0(id), d = qParse(id); return d ? h + `<div class="qtip" style="color:${Q_TIERS[d.tier].c}">${qStars(d.tier)} ${Q_TIERS[d.tier].n}${d.traits.length ? ' · ' + d.traits.map(k => Q_TRAITS[k].n).join(', ') : ''}</div>` : h; }; }
// El tooltip mínimo del inventario también dice la calidad
{ const s0 = showTip; showTip = (id, x, y) => { s0(id, x, y); const d = qParse(id), t = $('tip'); if (d && t.classList.contains('tipmini') && !t.querySelector('.qtip')) t.insertAdjacentHTML('beforeend', `<div class="qtip" style="color:${Q_TIERS[d.tier].c}">${qStars(d.tier)} ${Q_TIERS[d.tier].n}</div>`); }; }
// Las recetas que piden una pieza aceptan también la misma pieza con calidad
{ const c0 = invCount; invCount = id => { let n = c0(id); if (qCanHave(id)) for (const s of S.inv) if (s && s.id !== id && qBase(s.id) === id) n += s.n; return n; }; }
{ const t0 = invTake; invTake = (id, n) => { if (!qCanHave(id)) return t0(id, n); const own = Math.min(n, c0own(id)); let r = own ? t0(id, own) : 0; let left = n - own; for (let i = 0; i < S.inv.length && left > 0; i++) { const s = S.inv[i]; if (s && qBase(s.id) === id && s.id !== id) { const m = Math.min(left, s.n); s.n -= m; left -= m; if (s.n <= 0) S.inv[i] = null; } } invVersion++; return r; }; }
function c0own(id) { let n = 0; for (const s of S.inv) if (s && s.id === id) n += s.n; return n; }
// Tablas que van por objeto (orden, dibujo en la mano, mejoras…): la pieza con calidad usa la de la normal
function qAlias(tab) { if (!tab || typeof tab !== 'object' || tab._qa) return; Object.defineProperty(tab, '_qa', { value: 1 }); Object.setPrototypeOf(tab, new Proxy(Object.getPrototypeOf(tab) || Object.prototype, { get: (t, k, r) => typeof k === 'string' && k.includes('~') && qParse(k) ? r[qBase(k)] : Reflect.get(t, k, r), has: (t, k) => typeof k === 'string' && k.includes('~') && qParse(k) ? qBase(k) in tab : Reflect.has(t, k) })); }
for (const f of [() => ORDER_IDX, () => RECIPE_FOR, () => DRAW, () => UPGRADES, () => PROP_OF, () => ANIM_LOOK, () => LORE_BY, () => RUNE_MODS, () => LIGHT_R, () => FUEL]) { try { const t = f(); if (!(t instanceof Map)) qAlias(t); } catch (e) { } }
// Hoja de personaje: el tooltip del equipo también dice la calidad
if (typeof chTip === 'function') { const c0 = chTip; chTip = (id, x, y) => { c0(id, x, y); const d = qParse(id); if (d) $('tip').insertAdjacentHTML('beforeend', `<div class="qtip" style="color:${Q_TIERS[d.tier].c}">${qStars(d.tier)} ${Q_TIERS[d.tier].n}${d.traits.length ? ' · ' + d.traits.map(k => Q_TRAITS[k].n).join(', ') : ''}</div><div class="qdf" style="justify-content:flex-start">${qDiff(id).map(([a, v, g]) => `<span class="${g ? 'up' : 'down'}">${a} ${v}</span>`).join('')}</div>`); }; }
