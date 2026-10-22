'use strict';
// =====================================================================================
//  Ficha del objeto en la columna de la mochila: al pasar el ratón por cualquier ranura
//  (mochila, barra, equipo, kit, cofre o máquina) enseña qué es, sus números, para qué se
//  usa (qué se fabrica con él) y cómo se consigue (receta, máquina, mineral, planta,
//  animal o enemigo). Los objetos de la ficha se pueden señalar para ver la suya.
// =====================================================================================
let _icIdx = null;
// Índices: de dónde sale cada objeto y en qué se usa (se calculan una vez)
function icIndex() {
  if (_icIdx) return _icIdx; const src = {}, use = {}, add = (m, k, v) => { (m[k] || (m[k] = [])).push(v); };
  for (const r of BENCH) { add(src, r.out, { k: 'bench', r }); for (const id of new Set([r.core, ...r.teeth])) if (id) add(use, id, r.out); }
  for (const m in RECIPES) for (const r of RECIPES[m]) { for (const o in r.out || {}) add(src, o, { k: 'mach', m, r }); for (const i in r.in || {}) for (const o in r.out || {}) add(use, i, o); }
  GI.forEach(g => { if (!g || g.liquid && !g.drop) return; if (g.drop) add(src, g.drop, { k: 'tile', g }); if (g.extra) add(src, g.extra[0], { k: 'tile', g, p: g.extra[1] }); });
  for (const sp in SPECIES) for (const [id] of SPECIES[sp].drops || []) add(src, id, { k: 'animal', sp });
  for (const e in ENEMIES) for (const [id, , p] of ENEMIES[e].drops || []) add(src, id, { k: 'foe', e, p });
  for (const id in use) use[id] = [...new Set(use[id])];
  return (_icIdx = { src, use });
}
const IC_MOD = { melee: 'Daño cuerpo a cuerpo', ranged: 'Daño a distancia', speed: 'Velocidad', dash: 'Coste del impulso', mana: 'Maná', manaRegen: 'Regeneración de maná', warm: 'Abrigo', def: 'Defensa', block: 'Bloqueo', luck: 'Suerte', mine: 'Picar', wood: 'Talar', hunt: 'Cazar', detect: 'Te detectan', hunger: 'Hambre', thirst: 'Sed', heal: 'Curación', xp: 'Experiencia', xpCraft: 'Exp. al fabricar', stam: 'Aguante', hp: 'Vida máxima', fire: 'Resiste el fuego', night: 'Ve de noche', reach: 'Alcance', price: 'Precios', work: 'Trabajo', sick: 'Enfermedad', wound: 'Heridas', energy: 'Cansancio', tame: 'Domesticar', craftKeep: 'Recuperar al fabricar', pain: 'Dolor', bleed: 'Sangrado' };
const IC_MUL = new Set(['melee', 'ranged', 'speed', 'dash', 'manaRegen', 'mine', 'wood', 'hunt', 'detect', 'hunger', 'thirst', 'heal', 'xp', 'xpCraft', 'reach', 'price', 'work', 'sick', 'wound', 'energy', 'tame', 'pain', 'bleed']);
const IC_LOWER = new Set(['dash', 'detect', 'hunger', 'thirst', 'price', 'sick', 'wound', 'energy', 'pain', 'bleed']);
function icMods(m) {
  return Object.entries(m || {}).filter(([k]) => IC_MOD[k]).map(([k, v]) => {
    if (typeof v !== 'number') return [IC_MOD[k], 'sí', true];
    const pct = IC_MUL.has(k) ? Math.round((v - 1) * 100) : null, good = IC_LOWER.has(k) ? (pct !== null ? pct < 0 : v < 0) : (pct !== null ? pct > 0 : v > 0);
    return [IC_MOD[k], pct !== null ? (pct > 0 ? '+' : '') + pct + ' %' : (k === 'block' ? Math.round(v * 100) + ' %' : (v > 0 ? '+' : '') + v), good];
  });
}
const icIco = (id, sz = 18) => ITEMS[id] ? `<span class="icic" data-id="${id}" title="${esc(ITEMS[id].n)}">${itemImg(id, sz)}</span>` : '';
function itemCardHTML(id, have) {
  const it = ITEMS[id]; if (!it) return '';
  const nums = [], X = icIndex(), d = BD[id];
  const W = typeof WEAPONS !== 'undefined' && WEAPONS[id], T2 = TOOLS[id];
  if (it.weapon) { const w = it.weapon; nums.push(['Daño', fmt(Math.round(w.dmg * 10) / 10)]); if (w.reach) nums.push(['Alcance', '+' + w.reach]); if (w.el) nums.push(['Elemento', (typeof EL_NAME !== 'undefined' && EL_NAME[w.el]) || w.el]); if (w.sweep) nums.push(['Barrido', 'sí']); }
  else if (W && W.dmg) nums.push(['Daño', fmt(W.dmg)]);
  if (T2 && T2.kind !== 'util') { nums.push(['Herramienta', { pick: 'Pico', axe: 'Hacha', shovel: 'Pala', hammer: 'Martillo', sickle: 'Hoz', paxel: 'Multiherramienta', excav: 'Excavadora' }[T2.kind] || T2.kind]); nums.push(['Velocidad', '×' + T2.mult]); if (T2.lv) nums.push(['Nivel', T2.lv + ' (' + (LV_MAT[T2.lv] || '') + ')']); if (T2.area) nums.push(['Área', (T2.area * 2 + 1) + '×' + (T2.area * 2 + 1)]); }
  if (it.armor) { nums.push(['Defensa', it.armor.def]); nums.push(['Ranura', EQ_N[it.armor.slot] || it.armor.slot]); if (it.armor.heavy) nums.push(['Peso', 'pesada']); }
  if (it.gear) { nums.push(['Ranura', EQ_N[it.gear.slot] || it.gear.slot]); if (it.gear.def) nums.push(['Defensa', it.gear.def]); if (it.gear.block) nums.push(['Bloqueo', Math.round(it.gear.block * 100) + ' %']); }
  if (it.food) { const f = it.food; if (f.f) nums.push(['Hambre', '+' + f.f]); if (f.w) nums.push(['Sed', '+' + f.w]); if (f.hp) nums.push(['Vida', '+' + f.hp]); if (f.buff) nums.push(['Efecto', ((typeof BUFF_N !== 'undefined' && BUFF_N[f.buff[0]]) || f.buff[0]) + ' ' + Math.round(f.buff[1] / 60) + ' min']); }
  if (it.use && it.use.buff) nums.push(['Efecto', ((typeof BUFF_N !== 'undefined' && BUFF_N[it.use.buff]) || it.use.buff) + ' ' + Math.round(it.use.t / 60 * 10) / 10 + ' min']);
  if (typeof FUEL !== 'undefined' && FUEL[id]) nums.push(['Combustible', FUEL[id] + ' s']);
  if (typeof maxDur === 'function') { const md = maxDur(id); if (md) nums.push(['Usos', fmt(md)]); }
  if (typeof focusBonus === 'function' && focusBonus(id)) nums.push(['Foco mágico', '+' + focusBonus(id).mana + ' maná']);
  if (typeof LIGHT_R !== 'undefined' && LIGHT_R[id]) nums.push(['Luz de mano', LIGHT_R[id] + ' casillas']);
  if (d) { if (d.tier) nums.push(['Se desbloquea', 'nivel ' + (d.tier + 1)]); if (typeof blockStats === 'function') for (const s of blockStats(id).slice(0, 3)) nums.push(['', s]); }
  const mods = it.gear && it.gear.mods ? icMods(it.gear.mods) : it.armor ? icMods({ warm: it.armor.warm, fire: it.armor.fire }) : [];
  // Para qué sirve
  const uses = (X.use[id] || []).filter(o => ITEMS[o]);
  const how = [];
  if (it.weapon || W) how.push('Arma: llévala en la mano y haz clic para atacar.');
  if (T2 && T2.kind !== 'util') how.push('Herramienta: llévala en la mano y mantén el clic sobre el terreno.');
  if (it.armor || it.gear) how.push('Equípalo en su ranura (Shift+clic).');
  if (it.food || (it.use && it.use.buff) || it.med) how.push('Tómalo con F (o ponlo en las ampollas o los suplementos del kit).');
  if (d && d.cat >= 0) how.push('Bloque: llévalo en la barra y haz clic en el suelo para colocarlo.');
  if (typeof GROUND_PLACE !== 'undefined' && GROUND_PLACE[id]) how.push('Sirve de suelo: rellena hoyos y agua.');
  if (it.seed) how.push('Semilla: plántala en tierra de cultivo (ara con una azada).');
  // Cómo se consigue
  const src = X.src[id] || [], ways = [];
  const bench = src.find(s => s.k === 'bench'); if (bench) { const r = bench.r; ways.push(`<div class="icw"><b>Fabricar</b> ${icIco(r.core)}${r.teeth.map(t => icIco(t)).join('')} → ${r.n > 1 ? r.n + ' ' : ''}${esc(it.n)}${r.rpm ? ` <span class="mut">(${r.rpm} RPM)</span>` : ''}</div>`); }
  for (const s of src.filter(s => s.k === 'mach').slice(0, 2)) ways.push(`<div class="icw"><b>${esc((typeof MACHINE_NAME !== 'undefined' && MACHINE_NAME[s.m]) || s.m)}</b> ${Object.keys(s.r.in || {}).map(i => icIco(i)).join('')} → ${esc(it.n)}</div>`);
  const tiles = [...new Set(src.filter(s => s.k === 'tile').map(s => s.g.n + (s.p ? ` (a veces, ${Math.round(s.p * 100)} %)` : '')))].slice(0, 3); if (tiles.length) ways.push(`<div class="icw"><b>Picar o recoger</b> ${esc(tiles.join(' · '))}</div>`);
  const ans = [...new Set(src.filter(s => s.k === 'animal').map(s => SPECIES[s.sp].n))].slice(0, 3); if (ans.length) ways.push(`<div class="icw"><b>Cazar</b> ${esc(ans.join(' · '))}</div>`);
  const foes = [...new Set(src.filter(s => s.k === 'foe').map(s => ENEMIES[s.e].n.replace(/ (helad|del |ígne|de cristal|sombrí|élite).*$/, '')))].slice(0, 3); if (foes.length) ways.push(`<div class="icw"><b>Vencer</b> ${esc(foes.join(' · '))}</div>`);
  if (!ways.length) ways.push('<div class="icw mut">Se encuentra explorando o comerciando.</div>');
  return `<div class="ich">${itemImg(id, 34)}<div><b>${esc(it.n)}</b><small>${esc(ICATS[it.cat] || '')}${have ? ' · tienes ' + fmt(have) : ''}</small></div></div>
    ${it.d ? `<p class="icd">${esc(it.d)}</p>` : ''}
    ${nums.length ? `<div class="icn">${nums.map(([a, v]) => `<div>${a ? `<small>${esc(a)}</small>` : ''}<b>${esc(String(v))}</b></div>`).join('')}</div>` : ''}
    ${mods.length ? `<div class="icm">${mods.map(([a, v, g]) => `<span class="${g ? 'up' : 'down'}">${esc(a)} ${esc(v)}</span>`).join('')}</div>` : ''}
    ${how.length ? `<div class="ics">Cómo se usa</div><ul class="icu">${how.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
    ${uses.length ? `<div class="ics">Sirve para fabricar (${uses.length})</div><div class="icl">${uses.slice(0, 18).map(o => icIco(o, 20)).join('')}${uses.length > 18 ? `<span class="mut small">+${uses.length - 18}</span>` : ''}</div>` : ''}
    <div class="ics">Cómo se consigue</div>${ways.join('')}`;
}
// Qué ranura (u objeto) está bajo el ratón dentro del inventario
let _icId = null, _icShown = null, _icPin = null;
document.addEventListener('mouseover', e => {
  if (!S || ui.open !== 'inv') return; const t = e.target.closest && e.target.closest('#mInv [data-k], #mInv [data-id], #mInv [data-hv]'); if (!t) return;
  if (t.closest('#iCard')) { const id = t.dataset.id; if (id && ITEMS[id]) _icPin = id; return; }
  let id = null; if (t.dataset.k) { const r = slotRef(t.dataset.k), s = r && r.get && r.get(); id = s && s.id; } else id = t.dataset.id || t.dataset.hv;
  if (id && ITEMS[id]) { _icId = id; _icPin = null; }
});
setInterval(() => {
  const box = document.getElementById('iCard'); if (!box || ui.open !== 'inv') return;
  const id = _icPin || _icId; if (id === _icShown && box._v === invVersion) return; const newId = id !== _icShown; _icShown = id; box._v = invVersion;
  box.innerHTML = id ? itemCardHTML(id, invCount(id)) : '<p class="mut small">Pasa el ratón por un objeto para ver qué hace, sus números, para qué sirve y cómo se consigue.</p>';
  box.classList.toggle('pin', !!_icPin); if (newId) box.scrollTop = 0;
}, 120);
// Con la ficha a la vista, el tooltip del inventario es mínimo (nombre, cantidad y desgaste) para no taparla
{ const s0 = showTip; showTip = (id, x, y) => {
  const t = $('tip'), mini = ui.open === 'inv' && document.getElementById('iCard') && _mvTarget && _mvTarget.closest && _mvTarget.closest('#mInv');
  t.classList.toggle('tipmini', !!mini); if (!mini) return s0(id, x, y);
  const du = durTip(id), key = 'm' + id + du; if (_tipId !== key) { t.innerHTML = `<b>${esc(ITEMS[id] ? ITEMS[id].n : id)}</b>${du}`; _tipId = key; _tipDu = du; }
  if (t.hidden) t.hidden = false; t.style.transform = `translate(${x + 12}px,${y + 14}px)`;
}; }
// La ficha va arriba en la columna de la mochila
{ const b0 = buildInvPanel; buildInvPanel = (...a) => { b0(...a); const side = document.querySelector('#invLeft .invside'); if (side && !side.querySelector('#iCard')) { side.insertAdjacentHTML('afterbegin', '<div class="icard" id="iCard"></div>'); _icShown = undefined; } }; }
// Si la ficha tiene más contenido del que cabe, un degradado abajo lo indica (sin barra de scroll)
const icMore = () => { const b = document.getElementById('iCard'); if (b) b.classList.toggle('more', b.scrollTop + b.clientHeight < b.scrollHeight - 4); };
document.addEventListener('scroll', e => { if (e.target && e.target.id === 'iCard') icMore(); }, true);
setInterval(icMore, 300);
