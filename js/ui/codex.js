'use strict';
// =====================================================================================
//  Recetario → Enciclopedia del Taller. Pestañas: Inicio · Objetos · Máquinas · Criaturas ·
//  Biomas · Jefes, con un buscador global. Cada ficha se explica con dibujos:
//   · Objetos: tarjeta con barras de sus números, la receta del banco dibujada como el
//     engranaje del banco (núcleo en el centro y dientes alrededor), las de máquina como un
//     flujo entra → máquina → sale, el árbol completo de ingredientes (clic para abrir cada
//     rama), de dónde sale (casillas, biomas, animales, enemigos, jefes…) y para qué sirve.
//   · Criaturas, jefes y biomas con su dibujo, barras, dónde viven y qué sueltan.
//  Rendimiento: solo se dibuja al navegar; los retratos de criaturas se pintan cuando entran
//  en pantalla (y se guardan); las listas largas usan content-visibility.
//  La lógica de fabricar (rellenar el banco, plan de fabricación) es la de book.js y bookplan.js.
// =====================================================================================
const CX = { filter: 'all', mobF: 'foe', open: new Set(), recent: [] };
_bookSec = 'home';
const cxE = s => esc(String(s == null ? '' : s));
const cxRar = id => { const it = ITEMS[id]; if (!it) return null; if (typeof it.rar === 'number') return [['Común', '#d8d2c4'], ['Poco común', '#7fd07a'], ['Raro', '#6ab8ff'], ['Épico', '#c08aff'], ['Legendario', '#f0c75e']][it.rar]; if (it.rarity && RARITY[it.rarity]) return [RARITY_N[it.rarity], RARITY[it.rarity].c]; return null; };
const cxGroup = id => BD[id] ? CATS[BD[id].cat] || 'Bloques' : ICATS[ITEMS[id].cat] || 'Otros';
// ---------- Índices (una vez) ----------
let _CXI = null;
function cxIndex() {
  if (_CXI) return _CXI; const groups = {}, X = icIndex();
  for (const id of ITEM_ORDER) { const it = ITEMS[id]; if (!it || String(id).includes('~')) continue; const g = cxGroup(id); (groups[g] || (groups[g] = [])).push(id); }
  const foeBio = {}; for (const k in ENEMIES) for (const b of ENEMIES[k].bio || []) (foeBio[b] || (foeBio[b] = [])).push(k);
  const spBio = {}; for (const b of BIOMES) if (b) for (const [sp] of b.fauna || []) (spBio[sp] || (spBio[sp] = [])).push(b.key);
  let wMax = 1, hpMax = 1, dmgMax = 1, vMax = 1; for (const k in WEAPONS) if (!k.includes('~') && WEAPONS[k].dmg > wMax) wMax = WEAPONS[k].dmg;
  for (const k in ENEMIES) { const e = ENEMIES[k]; hpMax = Math.max(hpMax, e.hp || 0); dmgMax = Math.max(dmgMax, e.dmg || 0); vMax = Math.max(vMax, e.v || 0); }
  return (_CXI = { groups, X, foeBio, spBio, wMax, hpMax, dmgMax, vMax });
}
// ---------- Piezas visuales ----------
const cxIco = (id, sz = 28, cls = '') => ITEMS[id] ? `<span class="cxi ${cls}" data-id="${id}" data-go="${id}">${itemImg(id, sz)}</span>` : '';
function cxHave(id, n) { const h = invCount(id); return `<b class="cxq ${h >= n ? 'ok' : 'no'}">${Math.min(h, 999)}/${n}</b>`; }
function cxBar(label, v, max, col, txt, log) { const p = Math.max(3, Math.min(100, log ? Math.log(1 + v) / Math.log(1 + max) * 100 : v / max * 100)); return `<div class="cxbar"><span>${label}</span><i><u style="width:${p.toFixed(1)}%;background:${col}"></u></i><b>${txt}</b></div>`; }
const cxSpr = (kind, k, sz = 56) => `<canvas class="cxspr" width="${sz * 2}" height="${sz * 2}" style="width:${sz}px;height:${sz}px" data-spr="${kind}:${k}"></canvas>`;
// Retratos: se pintan al entrar en pantalla
let _cxObs = null; const _cxSprDone = new Map();
function cxPaint(cv) {
  const [kind, k] = cv.dataset.spr.split(':'); let src = null;
  try { if (kind === 'a') { const s = animalSprite(k); src = s && s.f[0]; } else { const D = kind === 'j' ? BOSSES[k] : ENEMIES[k]; if (D) src = foeSprite(D); } } catch (e) { }
  if (!src) return; const g = cv.getContext('2d'), W = cv.width, H = cv.height, s = Math.min(W / src.width, H / src.height) * 0.95;
  g.imageSmoothingEnabled = false; g.clearRect(0, 0, W, H); g.drawImage(src, (W - src.width * s) / 2, (H - src.height * s) / 2, src.width * s, src.height * s);
}
function cxSprites(root) {
  const list = root.querySelectorAll('canvas[data-spr]'); if (!list.length) return;
  if (!_cxObs && 'IntersectionObserver' in window) _cxObs = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { _cxObs.unobserve(e.target); cxPaint(e.target); } }, { root: null, rootMargin: '120px' });
  for (const cv of list) _cxObs ? _cxObs.observe(cv) : cxPaint(cv);
}
// ---------- Estado de una receta del banco ----------
function cxBench(r) { const need = benchNeed(r), lock = r.tier > S.tier; let miss = 0, kinds = 0; for (const id in need) { kinds++; if (invCount(id) < need[id]) miss++; } return { need, lock, miss, kinds, can: !lock && !miss }; }
function cxItemState(id) {
  const r = RECIPE_FOR[id]; if (!r) { const X = cxIndex().X; return (X.src[id] || []).some(s => s.k === 'mach') ? 'mach' : 'raw'; }
  const b = cxBench(r); return b.lock ? 'lock' : b.can ? 'can' : b.miss === 1 ? 'near' : 'miss';
}
function cxTile(id, extra = '') {
  const it = ITEMS[id], rr = cxRar(id), st = cxItemState(id);
  const badge = st === 'can' ? '<em class="ok">✓</em>' : st === 'near' ? '<em class="near">◐</em>' : st === 'lock' ? `<em class="lk">🔒${(RECIPE_FOR[id].tier || 0) + 1}</em>` : st === 'raw' ? '<em class="raw">⛏</em>' : st === 'mach' ? '<em class="raw">⚙</em>' : '';
  return `<button class="cxtile st-${st}" data-go="${id}" data-id="${id}" style="${rr ? `--rc:${rr[1]}` : ''}">${itemImg(id, 32)}<span>${cxE(it.n)}</span>${badge}${extra}</button>`;
}
// ---------- Receta del banco dibujada ----------
function cxGear(r, i) {
  const b = cxBench(r), teeth = r.teeth, n = Math.max(teeth.length, 3), R = 62;
  const slots = teeth.map((t, k) => { const a = -Math.PI / 2 + k / n * Math.PI * 2, x = Math.cos(a) * R, y = Math.sin(a) * R; const ok = invCount(t) >= b.need[t];
    return `<span class="gslot ${ok ? 'ok' : 'no'}" style="transform:translate(${x.toFixed(1)}px,${y.toFixed(1)}px)" data-go="${t}" data-id="${t}">${itemImg(t, 26)}</span>`; }).join('');
  const spokes = teeth.map((t, k) => { const a = -Math.PI / 2 + k / n * Math.PI * 2; return `<line x1="80" y1="80" x2="${(80 + Math.cos(a) * R).toFixed(1)}" y2="${(80 + Math.sin(a) * R).toFixed(1)}"/>`; }).join('');
  const coreOk = invCount(r.core) >= b.need[r.core], pocket = pocketOK(r);
  const bench = !pocket && typeof nearestOf === 'function' ? nearestOf('bench') : null, rpm = bench ? Math.round(bench.b.rpm || 0) : 0;
  const gauge = r.rpm ? cxGauge(rpm, r.rpm) : '';
  const list = Object.keys(b.need).map(id => `<li data-go="${id}" data-id="${id}">${itemImg(id, 18)}<span>${cxE(ITEMS[id].n)}</span>${cxHave(id, b.need[id])}</li>`).join('');
  return `<div class="cxgear ${b.can ? 'can' : b.lock ? 'lock' : ''}">
    <div class="gwheel"><svg viewBox="0 0 160 160"><circle cx="80" cy="80" r="${R}" class="ring"/>${spokes}<circle cx="80" cy="80" r="74" class="teethring"/></svg>${slots}<span class="gslot core ${coreOk ? 'ok' : 'no'}" data-go="${r.core}" data-id="${r.core}">${itemImg(r.core, 34)}</span></div>
    <div class="garrow"><span>${pocket ? '🎒 Bolsillo o banco' : '🔧 Banco de ensamblaje'}</span><i></i>${r.cat ? `<small>catalizador ${cxIco(r.cat, 18)}</small>` : ''}</div>
    <div class="gout" data-go="${r.out}">${itemImg(r.out, 44)}<b>×${r.n}</b></div>
    <div class="gside"><ul class="gneed">${list}</ul>
      <div class="greq">${b.lock ? `<span class="pill bad">🔒 Nivel ${r.tier + 1} del Núcleo</span>` : '<span class="pill good">✓ Desbloqueada</span>'}${r.rpm ? `<span class="pill">⚙ ≥ ${r.rpm} RPM</span>` : '<span class="pill">sin giro</span>'}${gauge}</div>
      ${b.can ? '<p class="good small">✓ Tienes todo lo necesario</p>' : b.lock ? '' : `<p class="bad small">Te faltan ${b.miss} de ${b.kinds} ingredientes</p>`}
      ${_bookFrom ? `<button class="pri" data-cxfill="${i}">${_bookFrom === 'pocket' ? '🎒 Poner en el bolsillo' : '🔧 Poner en el banco'}</button>` : ''}</div></div>`;
}
// Reloj de RPM: aguja en tu banco más cercano y la marca de lo que pide la receta
function cxGauge(v, need) {
  const max = Math.max(need * 1.5, v, 32), ang = x => Math.PI * (1 - Math.min(1, x / max)), p = (a, r) => `${(40 + Math.cos(a) * r).toFixed(1)},${(38 - Math.sin(a) * r).toFixed(1)}`;
  const an = ang(need), av = ang(v), ok = v >= need;
  return `<span class="gauge" title="Tu banco más cercano gira a ${v} RPM; esta receta pide ${need}"><svg viewBox="0 0 80 44"><path d="M6 38 A34 34 0 0 1 74 38" class="g0"/><path d="M${p(an, 34)} A34 34 0 0 1 74 38" class="g1"/><line x1="40" y1="38" x2="${p(av, 28).split(',')[0]}" y2="${p(av, 28).split(',')[1]}" class="${ok ? 'gok' : 'gno'}"/><circle cx="40" cy="38" r="3"/></svg><small>${v}/${need} RPM</small></span>`;
}
// Receta de máquina: entra → máquina → sale
function cxFlow(k, r) {
  const ins = Object.keys(r.in || {}), outs = Object.keys(r.out || {}), m = machInfo()[k], bl = m && m.blocks[0], have = m && m.blocks.some(t => (L[t] || []).length);
  const can = ins.length && ins.every(i => invCount(i) >= r.in[i]);
  const fl = o => o ? Object.keys(o).map(f => `<span class="cxflu" title="${cxE(FLUIDS[f].n)}"><i style="background:${FLUIDS[f].c}"></i>${o[f]} mB</span>`).join('') : '';
  return `<div class="cxflow ${can ? 'can' : ''}"><div class="fin">${ins.map(i => `<span class="fslot ${invCount(i) >= r.in[i] ? 'ok' : 'no'}" data-go="${i}" data-id="${i}">${itemImg(i, 24)}<b>${r.in[i]}</b></span>`).join('')}${fl(r.fin)}</div>
    <div class="fmach" data-sec="m:${k}">${bl ? itemImg(bl, 26) : ''}<span>${cxE(MACHINE_NAME[k] || k)}</span><small>${r.t || 1} s${have ? ' · ✓ tienes' : ''}</small></div>
    <div class="fout">${outs.map(o => `<span class="fslot" data-go="${o}" data-id="${o}">${itemImg(o, 24)}<b>${r.out[o]}</b></span>`).join('')}${fl(r.fout)}</div></div>`;
}
// ---------- Árbol de ingredientes ----------
function cxTree(id, n, depth, path) {
  const r = RECIPE_FOR[id], have = invCount(id), ok = have >= n, key = path + '/' + id, X = cxIndex().X;
  const src = (X.src[id] || []).find(s => s.k !== 'bench'), glyph = !r ? (src ? { tile: '⛏', animal: '🐾', foe: '☠', mach: '⚙', boss: '👑', fish: '🎣' }[src.k] || '🔎' : '🔎') : '';
  const kids = r && depth < 6 ? Object.entries(benchNeed(r)) : [], open = depth < 1 || CX.open.has(key);
  const node = `<div class="tnode ${ok ? 'ok' : 'no'}"><span data-go="${id}" data-id="${id}">${itemImg(id, 22)}</span><b>${cxE(ITEMS[id].n)}</b><small>${Math.min(have, 999)}/${n}</small>${glyph ? `<em title="Se consigue en el mundo">${glyph}</em>` : ''}${kids.length ? `<button class="ttog" data-tt="${key}">${open ? '−' : '+'}</button>` : ''}</div>`;
  if (!kids.length || !open) return `<li>${node}</li>`;
  const times = Math.max(1, Math.ceil(Math.max(0, n - (depth ? have : 0)) / r.n)) || 1;
  return `<li>${node}<ul>${kids.map(([c, q]) => cxTree(c, q * times, depth + 1, key)).join('')}</ul></li>`;
}
// ---------- Ficha de objeto ----------
function cxItemPage(id) {
  const it = ITEMS[id]; if (!it) return '<p class="mut">Objeto desconocido.</p>';
  const rr = cxRar(id), I = cxIndex(), X = I.X, col = it.c || '#888';
  let h = `<div class="cxhero" style="--hc:${col};--rc:${rr ? rr[1] : 'var(--line)'}"><div class="hico">${itemImg(id, 64)}</div><div class="htxt"><h3>${cxE(it.n)}</h3><div class="hbad">${rr ? `<span class="pill" style="color:${rr[1]};border-color:${rr[1]}">★ ${cxE(rr[0])}</span>` : ''}<span class="pill" data-sec="items:${cxE(cxGroup(id))}">${cxE(cxGroup(id))}</span>${BD[id] ? `<span class="pill">🧱 Bloque${BD[id].tier ? ' · nivel ' + (BD[id].tier + 1) : ''}</span>` : ''}</div><p>${cxE(it.d || '')}</p></div><div class="hhave"><small>Llevas</small><b>${invCount(id)}</b></div></div>`;
  // Barras de sus números
  const bars = [], w = it.weapon || WEAPONS[id];
  if (w && w.dmg) { const pr = weaponProfile(id); bars.push(cxBar('Daño', w.dmg, I.wMax, '#ff6b5b', pr ? Math.round(pr.dmg) : w.dmg, true)); if (pr && pr.cd) bars.push(cxBar('Ritmo', 1 / pr.cd, 6, '#f0c75e', (1 / pr.cd).toFixed(1) + '/s')); if (w.reach || (w.whip && w.whip.reach) || (w.yoyo && w.yoyo.range)) { const rch = w.whip ? w.whip.reach : w.yoyo ? w.yoyo.range : w.reach / 32; bars.push(cxBar('Alcance', rch, 12, '#6ab8ff', (+rch).toFixed(1) + ' c')); } if (pr && pr.mana) bars.push(cxBar('Maná', pr.mana, 40, '#6a8aff', pr.mana)); }
  if (it.tool && it.tool.kind !== 'util') { bars.push(cxBar('Velocidad', it.tool.mult, 12, '#7fd07a', '×' + it.tool.mult.toFixed(1))); bars.push(cxBar('Nivel', it.tool.lv || 1, 8, '#c08aff', it.tool.lv || 1)); }
  if (it.armor) bars.push(cxBar('Defensa', it.armor.def, 20, '#9aa0a8', it.armor.def));
  if (it.ammoDmg) bars.push(cxBar('Daño de flecha', it.ammoDmg, 60, '#ff6b5b', '+' + it.ammoDmg));
  if (it.food) { if (it.food.f) bars.push(cxBar('Hambre', it.food.f, 60, '#e8a03a', '+' + it.food.f)); if (it.food.w) bars.push(cxBar('Sed', it.food.w, 60, '#5ab0e8', '+' + it.food.w)); if (it.food.hp) bars.push(cxBar('Vida', it.food.hp, 60, '#ff5a6a', '+' + it.food.hp)); }
  if (bars.length) h += `<div class="cxbars">${bars.join('')}</div>`;
  h += itemFacts(id);
  h += craftPlanHTML(id);
  // Cómo se fabrica
  const bench = []; BENCH.forEach((r, i) => { if (r.out === id && bench.length < 3) bench.push(cxGear(r, i)); });
  const flows = []; for (const k in RECIPES) for (const r of RECIPES[k]) if (r.out && r.out[id] && flows.length < 8) flows.push(cxFlow(k, r));
  if (bench.length || flows.length) {
    h += `<h4 class="cxh">🔨 Cómo se fabrica</h4>${bench.join('')}${flows.length ? `<div class="cxflows">${flows.join('')}</div>` : ''}`;
    if (RECIPE_FOR[id]) h += `<h4 class="cxh">🌳 Árbol de ingredientes <small>verde: lo tienes · rojo: te falta · + abre la rama · ⛏🐾☠ se consigue en el mundo</small></h4><ul class="cxtree">${cxTree(id, RECIPE_FOR[id].n, 0, '')}</ul>`;
  }
  // Dónde se consigue
  const src = X.src[id] || [], cards = [], seen = new Set();
  const TB = typeof tileBiomes === 'function' ? tileBiomes() : {};
  for (const s of src) {
    const sig = s.k + ':' + (s.g ? s.g.key : s.sp || s.e || s.b || ''); if (seen.has(sig) || cards.length > 14) continue; seen.add(sig);
    if (s.k === 'tile') { const g = s.g, bios = [...(TB[g.key] || [])].slice(0, 5); cards.push(`<div class="cxsrc"><span class="swatch" style="background:rgb(${(g.c || [120, 120, 120]).join(',')})"></span><div><b>⛏ ${cxE(g.n)}</b><small>${g.tree ? 'Tálalo con hacha' : g.need ? 'Pícalo con pico de nivel ' + g.need.lv : 'Pícalo o recógelo'}${s.p ? ` · ${Math.round(s.p * 100)} %` : ''}</small>${bios.length ? `<div class="chips">${bios.map(n => { const B = BIOMES.find(b => b && b.n === n); return `<span class="pill" ${B ? `data-sec="z:${B.key}"` : ''} style="--bc:${B ? B.mc : '#888'}">${cxE(n)}</span>`; }).join('')}</div>` : ''}</div></div>`); }
    else if (s.k === 'animal') { const sp = SPECIES[s.sp]; cards.push(`<div class="cxsrc lnk" data-sec="a:${s.sp}">${cxSpr('a', s.sp, 40)}<div><b>🐾 ${cxE(sp.n)}</b><small>Cázalo</small></div></div>`); }
    else if (s.k === 'foe') { const e = ENEMIES[s.e]; cards.push(`<div class="cxsrc lnk" data-sec="f:${s.e}">${cxSpr('f', s.e, 40)}<div><b>☠ ${cxE(e.n)}</b><small>${Math.round((s.p || 1) * 100)} % al vencerlo${e.night ? ' · de noche' : ''}</small></div></div>`); }
    else if (s.k === 'boss') { const B = BOSSES[s.b]; cards.push(`<div class="cxsrc lnk boss" data-sec="j:${s.b}">${cxSpr('j', s.b, 40)}<div><b>👑 ${cxE(B.n)}</b><small>Jefe${B.summonItem ? ' · se invoca con' : ''}</small>${B.summonItem ? cxIco(B.summonItem, 18) : ''}</div></div>`); }
    else if (s.k === 'mach') { if (!seen.has('m' + s.m)) { seen.add('m' + s.m); const m = machInfo()[s.m]; cards.push(`<div class="cxsrc lnk" data-sec="m:${s.m}">${m ? itemImg(m.blocks[0], 34) : ''}<div><b>⚙ ${cxE(MACHINE_NAME[s.m] || s.m)}</b><small>Sale de esta máquina</small></div></div>`); } }
  }
  const more = typeof itemWaysMore === 'function' ? itemWaysMore(id).filter(x => !/Jefe|Dónde/.test(x)) : [];
  if (cards.length || more.length) h += `<h4 class="cxh">📍 Dónde se consigue</h4><div class="cxsrcs">${cards.join('')}</div>${more.length ? `<div class="cxmore">${more.join('')}</div>` : ''}`;
  else if (!bench.length && !flows.length) h += `<h4 class="cxh">📍 Dónde se consigue</h4><p class="mut small">No se fabrica: búscalo explorando, comerciando o en cofres.</p>`;
  // Para qué sirve
  const use = (X.use[id] || []).filter(o => ITEMS[o]);
  if (use.length) h += `<h4 class="cxh">🧩 Para qué sirve <small>${use.length} cosa${use.length > 1 ? 's' : ''} se fabrican con esto</small></h4><div class="cxgrid sm">${use.slice(0, 80).map(o => cxTile(o)).join('')}</div>${use.length > 80 ? `<p class="mut small">… y ${use.length - 80} más.</p>` : ''}`;
  return h;
}
// ---------- Inicio ----------
function cxHome() {
  const tier = TIERS[S.tier], goal = tier ? tier.goal : {}, can = [], near = [], next = [];
  for (const r of BENCH) { if (!ITEMS[r.out]) continue; if (r.tier === S.tier + 1 && next.length < 18) next.push(r.out); if (r.tier > S.tier) continue; const b = cxBench(r); if (b.can && can.length < 24) can.push(r.out); else if (b.miss === 1 && b.kinds > 1 && near.length < 18) near.push(r.out); }
  const unlocked = BENCH.filter(r => r.tier <= S.tier).length, pct = unlocked / BENCH.length;
  const donut = (p, c) => `<svg viewBox="0 0 42 42" class="donut"><circle cx="21" cy="21" r="16" class="d0"/><circle cx="21" cy="21" r="16" class="d1" style="stroke:${c};stroke-dasharray:${(p * 100.5).toFixed(1)} 100.5"/></svg>`;
  let gsum = 0, gdone = 0; const gl = Object.keys(goal).map(k => { const d = Math.min(goal[k], (S.del && S.del[k]) || 0); gsum += goal[k]; gdone += d; return `<li data-go="${k}" data-id="${k}">${itemImg(k, 20)}<span>${cxE(ITEMS[k] ? ITEMS[k].n : k)}</span><i><u style="width:${(d / goal[k] * 100).toFixed(0)}%"></u></i><b>${d}/${goal[k]}</b></li>`; }).join('');
  let h = `<div class="cxhome"><div class="cxstat">${donut(pct, '#f0c75e')}<div><b>${unlocked}</b> de ${BENCH.length}<small>recetas desbloqueadas</small></div></div>
    <div class="cxstat">${donut(gsum ? gdone / gsum : 1, '#7fd07a')}<div><b>Nivel ${S.tier + 1}</b>${tier ? cxE(tier.n.split('·')[1] || '') : ''}<small>${tier ? 'entrega al Núcleo para subir' : 'Fábrica completa'}</small></div></div>
    <div class="cxstat">${donut(Math.min(1, can.length / 24), '#6ab8ff')}<div><b>${can.length}${can.length >= 24 ? '+' : ''}</b> recetas<small>puedes fabricar ya</small></div></div></div>`;
  if (gl) h += `<h4 class="cxh">🎯 Objetivo del nivel</h4><ul class="cxgoal">${gl}</ul>`;
  if (can.length) h += `<h4 class="cxh">✓ Puedes fabricar ahora</h4><div class="cxgrid">${can.map(id => cxTile(id)).join('')}</div>`;
  if (near.length) h += `<h4 class="cxh">◐ Te falta solo un ingrediente</h4><div class="cxgrid">${near.map(id => cxTile(id)).join('')}</div>`;
  if (next.length) h += `<h4 class="cxh">🔓 Al subir de nivel desbloqueas</h4><div class="cxgrid">${next.map(id => cxTile(id)).join('')}</div>`;
  const tabs = [['items', '📦 Objetos', Object.keys(ITEMS).length + ' objetos', ['ironIngot', 'tSword33', 'tPotHeal4', 'gear']], ['mach', '⚙ Máquinas', Object.keys(machInfo()).length + ' máquinas', ['furnace', 'crusher', 'press', 'saw']], ['mobs', '🐾 Criaturas', Object.keys(ENEMIES).length + Object.keys(SPECIES).length + ' criaturas'], ['bio', '🗺 Biomas', BIOMES.filter(Boolean).length + ' biomas'], ['boss', '👑 Jefes', Object.keys(BOSSES).length + ' jefes']];
  h += `<h4 class="cxh">🧭 Explora la enciclopedia</h4><div class="cxexp">${tabs.map(([k, n, d, ic]) => `<button data-sec="${k}"><b>${n}</b><small>${d}</small><span>${(ic || []).filter(x => ITEMS[x]).map(x => itemImg(x, 22)).join('')}</span></button>`).join('')}</div>`;
  if (CX.recent.length) h += `<h4 class="cxh">🕘 Visto hace poco</h4><div class="cxgrid sm">${CX.recent.filter(id => ITEMS[id]).map(id => cxTile(id)).join('')}</div>`;
  return h;
}
// ---------- Objetos ----------
function cxItems(g) {
  const I = cxIndex(), all = g ? I.groups[g] || [] : ITEM_ORDER.filter(id => ITEMS[id] && !String(id).includes('~'));
  const F = { all: 'Todos', can: '✓ Puedo fabricar', near: '◐ Me falta poco', lock: '🔒 Bloqueados', raw: '⛏ Se recogen' };
  const list = CX.filter === 'all' ? all : all.filter(id => { const s = cxItemState(id); return CX.filter === 'raw' ? s === 'raw' || s === 'mach' : s === CX.filter; });
  return `<div class="cxtools">${Object.entries(F).map(([k, n]) => `<button data-cxf="${k}" class="${CX.filter === k ? 'on' : ''}">${n}</button>`).join('')}<span class="mut small">${list.length} de ${all.length}</span></div>
    <div class="cxgrid">${list.slice(0, 600).map(id => cxTile(id)).join('') || '<p class="mut">Nada con ese filtro.</p>'}</div>${list.length > 600 ? '<p class="mut small">Usa el buscador o un filtro para ver el resto.</p>' : ''}`;
}
// ---------- Criaturas ----------
const AI_N = { melee: 'Cuerpo a cuerpo', ranged: 'A distancia', caster: 'Mago', summoner: 'Invocador', charger: 'Embiste', swarm: 'En enjambre' };
function cxMobs() {
  const I = cxIndex(), F = { foe: '☠ Enemigos', night: '🌙 De noche', undead: '💀 No muertos', animal: '🐾 Animales' };
  let h = `<div class="cxtools">${Object.entries(F).map(([k, n]) => `<button data-cxm="${k}" class="${CX.mobF === k ? 'on' : ''}">${n}</button>`).join('')}</div><div class="cxcards">`;
  if (CX.mobF === 'animal') for (const k in SPECIES) { const s = SPECIES[k]; h += `<button class="cxcard" data-sec="a:${k}">${cxSpr('a', k, 52)}<b>${cxE(s.n)}</b><small>${(s.drops || []).slice(0, 3).map(d => ITEMS[d[0]] ? itemImg(d[0], 16) : '').join('')}</small></button>`; }
  else { const ks = Object.keys(ENEMIES).filter(k => { const e = ENEMIES[k]; return CX.mobF === 'night' ? e.night : CX.mobF === 'undead' ? e.undead : true; }).sort((a, b) => (ENEMIES[a].tier || 0) - (ENEMIES[b].tier || 0) || ENEMIES[a].hp - ENEMIES[b].hp);
    for (const k of ks) { const e = ENEMIES[k]; h += `<button class="cxcard" data-sec="f:${k}">${cxSpr('f', k, 52)}<b>${cxE(e.n)}</b><span class="mb"><i style="width:${Math.max(4, Math.log(1 + e.hp) / Math.log(1 + I.hpMax) * 100).toFixed(0)}%"></i></span><small>❤ ${e.hp} · ⚔ ${e.dmg}${e.night ? ' · 🌙' : ''}</small></button>`; } }
  return h + '</div>';
}
function cxDrops(drops) { return (drops || []).filter(d => ITEMS[d[0]]).map(([id, n, p]) => `<div class="cxdrop" data-go="${id}" data-id="${id}">${itemImg(id, 24)}<span>${cxE(ITEMS[id].n)}${n > 1 ? ' ×' + n : ''}</span><i><u style="width:${Math.round((p ?? 1) * 100)}%"></u></i><b>${Math.round((p ?? 1) * 100)} %</b></div>`).join(''); }
const cxBioChips = keys => (keys || []).map(k => { const B = BIOMES[BI_[k]]; return B ? `<span class="pill" data-sec="z:${k}" style="--bc:${B.mc}">${cxE(B.n)}</span>` : ''; }).join('');
function cxFoePage(k, boss) {
  const D = boss ? BOSSES[k] : ENEMIES[k]; if (!D) return '<p class="mut">Desconocido.</p>'; const I = cxIndex();
  const flags = [D.night && '🌙 Sale de noche', D.undead && '💀 No muerto (la luz y la plata le hacen el doble)', D.venom && '🧪 Envenena', D.drain && '🩸 Roba vida', D.split && '🧫 Se divide', D.regen && '✚ Se regenera', D.blink && '↯ Se teletransporta', D.phase && '👻 Atraviesa muros', D.glow && '✨ Brilla', D.elite && '⭐ Élite'].filter(Boolean);
  let h = `<div class="cxhero mob" style="--hc:${D.c}"><div class="hico big">${cxSpr(boss ? 'j' : 'f', k, 96)}</div><div class="htxt"><h3>${cxE(D.n)}</h3><div class="hbad">${boss ? '<span class="pill" style="color:#f0c75e;border-color:#f0c75e">👑 Jefe</span>' : `<span class="pill">Nivel de peligro ${(D.tier || 0) + 1}</span>`}${D.ai ? `<span class="pill">${cxE(AI_N[D.ai] || D.ai)}</span>` : ''}${D.el ? `<span class="pill" style="color:${(typeof TR_EL !== 'undefined' && TR_EL[D.el]) || '#ccc'}">Elemento ${cxE((typeof TR_ELN !== 'undefined' && TR_ELN[D.el]) || D.el)}</span>` : ''}</div><p>${flags.map(cxE).join(' · ') || 'Sin trucos especiales.'}</p></div></div>`;
  h += `<div class="cxbars">${cxBar('Vida', D.hp, boss ? 120000 : I.hpMax, '#ff5a6a', D.hp, true)}${cxBar('Daño', D.dmg, boss ? 95 : I.dmgMax, '#ff8a3a', D.dmg)}${cxBar('Velocidad', D.v || 1, Math.max(I.vMax, 4), '#6ab8ff', (D.v || 1).toFixed(1))}${cxBar('Tamaño', D.s, boss ? 60 : 30, '#c8a060', D.s)}</div>`;
  if (boss) {
    if (D.ab && D.ab.length) h += `<h4 class="cxh">⚡ Habilidades</h4><div class="chips">${D.ab.map(a => `<span class="pill">${cxE({ summon: 'Invoca ' + (ENEMIES[a[1]] ? ENEMIES[a[1]].n : '') + (a[2] ? ' ×' + a[2] : ''), charge: 'Embestida', slam: 'Golpe al suelo', ring: 'Anillo de proyectiles', nova: 'Nova', beam: 'Rayo', meteor: 'Lluvia de meteoritos', teleport: 'Teletransporte', heal: 'Se cura', shield: 'Escudo', rage: 'Furia', pool: 'Charcos peligrosos', laser: 'Láser' }[a[0]] || a[0])}</span>`).join('')}</div>`;
    if (D.summonItem && ITEMS[D.summonItem]) h += `<h4 class="cxh">🔮 Cómo invocarlo</h4><div class="cxsrcs"><div class="cxsrc lnk" data-go="${D.summonItem}">${itemImg(D.summonItem, 36)}<div><b>${cxE(ITEMS[D.summonItem].n)}</b><small>Úsalo con F${typeof ASC !== 'undefined' && ASC[k] && ASC[k].env ? ' en su sitio: ' + cxE((typeof ASC_ENV !== 'undefined' && ASC_ENV[ASC[k].env] && ASC_ENV[ASC[k].env].n) || ASC[k].env) : ''} · clic para ver la receta</small></div></div></div>`;
  } else if (D.bio && D.bio.length) h += `<h4 class="cxh">🗺 Dónde vive</h4><div class="chips">${cxBioChips(D.bio)}</div>`;
  if (D.drops && D.drops.length) h += `<h4 class="cxh">🎁 Qué suelta</h4><div class="cxdrops">${cxDrops(D.drops)}</div>`;
  return h;
}
function cxAnimalPage(k) {
  const s = SPECIES[k]; if (!s) return '<p class="mut">Desconocido.</p>'; const bios = cxIndex().spBio[k] || [];
  let h = `<div class="cxhero mob" style="--hc:${s.c}"><div class="hico big">${cxSpr('a', k, 96)}</div><div class="htxt"><h3>${cxE(s.n)}</h3><div class="hbad"><span class="pill">🐾 Animal</span>${s.fly || s.bird ? '<span class="pill">Vuela</span>' : ''}${s.aq ? '<span class="pill">Acuático</span>' : ''}</div><p>Mantén el clic sobre él para cazarlo, o pon una trampa en su camino.</p></div></div>`;
  h += `<div class="cxbars">${cxBar('Tamaño', s.s, 30, '#c8a060', s.s)}${cxBar('Velocidad', s.v || 1, 4, '#6ab8ff', (s.v || 1).toFixed(1))}</div>`;
  if (bios.length) h += `<h4 class="cxh">🗺 Dónde vive</h4><div class="chips">${cxBioChips(bios)}</div>`;
  if (s.drops && s.drops.length) h += `<h4 class="cxh">🎁 Qué da al cazarlo</h4><div class="cxdrops">${cxDrops(s.drops.map(d => [d[0], d[1], 1]))}</div>`;
  return h;
}
// ---------- Biomas ----------
function cxBiomes() {
  const seen = typeof seenBiomes === 'function' ? seenBiomes() : new Set();
  return `<div class="cxcards">${BIOMES.filter(b => b && b.n).map(b => `<button class="cxcard bio" data-sec="z:${b.key}" style="--bc:${b.mc || '#888'}"><span class="bsw"></span><b>${cxE(b.n)}</b><small>${b.legend ? '★ Maravilla' : b.rare ? 'Raro' : b.ocean ? 'Océano' : 'Común'}${seen.has(b.key) ? ' · ✓ visto' : ''}</small></button>`).join('')}</div>`;
}
function cxBiomePage(k) {
  const b = BIOMES[BI_[k]]; if (!b) return '<p class="mut">Bioma desconocido.</p>'; const I = cxIndex(), seen = typeof seenBiomes === 'function' ? seenBiomes() : new Set();
  const tileItem = gi => { const g = GI[gi]; return g && g.drop && ITEMS[g.drop] ? g.drop : null; };
  let h = `<div class="cxhero" style="--hc:${b.mc || '#888'}"><div class="hico bsw2"></div><div class="htxt"><h3>${cxE(b.n)}</h3><div class="hbad">${b.legend ? '<span class="pill" style="color:#f0c75e;border-color:#f0c75e">★ Maravilla: solo hay 2 por mundo, muy lejos</span>' : b.rare ? '<span class="pill" style="color:#6ab8ff;border-color:#6ab8ff">Raro</span>' : '<span class="pill">Común</span>'}${b.ocean ? '<span class="pill">🌊 Océano</span>' : ''}<span class="pill ${seen.has(k) ? 'good' : ''}">${seen.has(k) ? '✓ Ya lo has visto' : 'Aún no lo has visto'}</span></div><p>Suelo: <b>${cxE(GI[b.gI] ? GI[b.gI].n : '—')}</b> · roca: <b>${cxE(GI[b.rockI] ? GI[b.rockI].n : '—')}</b>${b.lakeI != null && GI[b.lakeI] ? ` · lagos de <b>${cxE(GI[b.lakeI].n)}</b>` : ''}${b.riverI != null && GI[b.riverI] ? ` · ríos de <b>${cxE(GI[b.riverI].n)}</b>` : ''}</p></div></div>`;
  const ores = (b.oreT || []).map(([gi, wt]) => [tileItem(gi), wt]).filter(o => o[0]), sum = ores.reduce((s, o) => s + o[1], 0) || 1;
  if (ores.length) h += `<h4 class="cxh">⛏ Menas en su roca <small>probabilidad de cada una</small></h4><div class="cxdrops">${ores.sort((a, c) => c[1] - a[1]).slice(0, 16).map(([id, wt]) => `<div class="cxdrop" data-go="${id}" data-id="${id}">${itemImg(id, 24)}<span>${cxE(ITEMS[id].n)}</span><i><u style="width:${(wt / sum * 100).toFixed(0)}%"></u></i><b>${(wt / sum * 100).toFixed(0)} %</b></div>`).join('')}</div>`;
  const flora = [...new Set([...(b.treeI || []), ...(b.plantI || [])].map(([gi]) => tileItem(gi)).filter(Boolean))];
  if (flora.length) h += `<h4 class="cxh">🌿 Árboles y plantas</h4><div class="cxgrid sm">${flora.map(id => cxTile(id)).join('')}</div>`;
  if (b.fauna && b.fauna.length) h += `<h4 class="cxh">🐾 Fauna</h4><div class="cxcards">${b.fauna.filter(([sp]) => SPECIES[sp]).map(([sp]) => `<button class="cxcard" data-sec="a:${sp}">${cxSpr('a', sp, 44)}<b>${cxE(SPECIES[sp].n)}</b></button>`).join('')}</div>`;
  const foes = I.foeBio[k] || []; if (foes.length) h += `<h4 class="cxh">☠ Enemigos</h4><div class="cxcards">${foes.map(e => `<button class="cxcard" data-sec="f:${e}">${cxSpr('f', e, 44)}<b>${cxE(ENEMIES[e].n)}</b><small>❤ ${ENEMIES[e].hp}${ENEMIES[e].night ? ' · 🌙' : ''}</small></button>`).join('')}</div>`;
  return h;
}
// ---------- Jefes ----------
function cxBosses() {
  const order = typeof ASC_ORDER !== 'undefined' ? ASC_ORDER : [], rest = Object.keys(BOSSES).filter(k => !order.includes(k));
  const card = (k, rank) => { const B = BOSSES[k]; return `<button class="cxcard boss" data-sec="j:${k}">${cxSpr('j', k, 56)}<b>${rank ? '<em>' + rank + '</em> ' : ''}${cxE(B.n)}</b><small>❤ ${B.hp} · ⚔ ${B.dmg}</small>${B.summonItem && ITEMS[B.summonItem] ? `<span class="sumi">${itemImg(B.summonItem, 18)}</span>` : ''}</button>`; };
  return `<h4 class="cxh">👑 Jefes de siempre <small>viven en guaridas y mazmorras</small></h4><div class="cxcards">${rest.map(k => card(k)).join('')}</div>${order.length ? `<h4 class="cxh">⛰ El Ascenso <small>del 1 al ${order.length}, cada uno más difícil</small></h4><div class="cxcards">${order.map((k, i) => card(k, i + 1)).join('')}</div>` : ''}`;
}
// ---------- Búsqueda global ----------
function cxSearch(q) {
  const m = s => String(s || '').toLowerCase().includes(q); let h = '';
  const items = []; for (const id of ITEM_ORDER) { if (items.length >= 60) break; if (ITEMS[id] && !String(id).includes('~') && m(ITEMS[id].n)) items.push(id); }
  const ms = Object.keys(machInfo()).filter(k => m(MACHINE_NAME[k] || k)), fs = Object.keys(ENEMIES).filter(k => m(ENEMIES[k].n)).slice(0, 24), as = Object.keys(SPECIES).filter(k => m(SPECIES[k].n)).slice(0, 24), bs = BIOMES.filter(b => b && m(b.n)), js = Object.keys(BOSSES).filter(k => m(BOSSES[k].n)).slice(0, 24);
  if (items.length) h += `<h4 class="cxh">📦 Objetos ${items.length >= 60 ? '(60+)' : '(' + items.length + ')'}</h4><div class="cxgrid">${items.map(id => cxTile(id)).join('')}</div>`;
  if (ms.length) h += `<h4 class="cxh">⚙ Máquinas</h4><div class="cxcards">${ms.map(k => `<button class="cxcard" data-sec="m:${k}">${itemImg(machInfo()[k].blocks[0], 40)}<b>${cxE(MACHINE_NAME[k] || k)}</b></button>`).join('')}</div>`;
  if (fs.length || as.length) h += `<h4 class="cxh">🐾 Criaturas</h4><div class="cxcards">${fs.map(k => `<button class="cxcard" data-sec="f:${k}">${cxSpr('f', k, 44)}<b>${cxE(ENEMIES[k].n)}</b></button>`).join('')}${as.map(k => `<button class="cxcard" data-sec="a:${k}">${cxSpr('a', k, 44)}<b>${cxE(SPECIES[k].n)}</b></button>`).join('')}</div>`;
  if (js.length) h += `<h4 class="cxh">👑 Jefes</h4><div class="cxcards">${js.map(k => `<button class="cxcard boss" data-sec="j:${k}">${cxSpr('j', k, 44)}<b>${cxE(BOSSES[k].n)}</b></button>`).join('')}</div>`;
  if (bs.length) h += `<h4 class="cxh">🗺 Biomas</h4><div class="cxcards">${bs.map(b => `<button class="cxcard bio" data-sec="z:${b.key}" style="--bc:${b.mc}"><span class="bsw"></span><b>${cxE(b.n)}</b></button>`).join('')}</div>`;
  return h || '<p class="mut">Nada coincide con la búsqueda.</p>';
}
// ---------- Ventana ----------
const CX_TABS = [['home', '🏠 Inicio'], ['items', '📦 Objetos'], ['mach', '⚙ Máquinas'], ['mobs', '🐾 Criaturas'], ['bio', '🗺 Biomas'], ['boss', '👑 Jefes']];
function cxTabOf(sec) { const p = sec.split(':')[0]; return { cre: 'cre', prog: 'prog', i: 'items', items: 'items', m: 'mach', mach: 'mach', f: 'mobs', a: 'mobs', mobs: 'mobs', z: 'bio', bio: 'bio', j: 'boss', boss: 'boss', b: 'items' }[p] || 'home'; }
renderBook = function () {
  const q = $('bookQ').value.trim().toLowerCase(), sec = _bookSec, tab = q ? null : cxTabOf(sec), I = cxIndex();
  if (sec.startsWith('b:')) _bookSec = 'items:' + sec.slice(2); // enlaces antiguos a grupos del banco
  // Lateral según la pestaña
  let side = '';
  if (tab === 'items') { const cur = _bookSec.startsWith('items:') ? _bookSec.slice(6) : sec.startsWith('i:') ? cxGroup(sec.slice(2)) : ''; side = `<button data-sec="items" class="${_bookSec === 'items' ? 'on' : ''}">Todos <span class="mut">${ITEM_ORDER.length}</span></button>` + Object.keys(I.groups).sort().map(g => `<button data-sec="items:${cxE(g)}" class="${cur === g ? 'on' : ''}">${itemImg(I.groups[g][0], 16)} ${cxE(g)} <span class="mut">${I.groups[g].length}</span></button>`).join(''); }
  else if (tab === 'mach') side = Object.keys(machInfo()).sort((a, b) => (MACHINE_NAME[a] || a).localeCompare(MACHINE_NAME[b] || b)).map(k => `<button data-sec="m:${k}" class="${sec === 'm:' + k ? 'on' : ''}">${itemImg(machInfo()[k].blocks[0], 16)} ${cxE(MACHINE_NAME[k] || k)}</button>`).join('');
  else if (tab === 'bio') side = BIOMES.filter(b => b && b.n).map(b => `<button data-sec="z:${b.key}" class="${sec === 'z:' + b.key ? 'on' : ''}"><i class="sw" style="background:${b.mc}"></i> ${cxE(b.n)}</button>`).join('');
  else if (typeof cxSideExtra === 'function' && cxSideExtra(tab)) side = cxSideExtra(tab);
  else side = `<div class="cxhelp"><b>¿Cómo se usa?</b><p>Pasa el ratón por cualquier icono para ver qué es; haz clic para abrir su ficha.</p><p>En cada objeto verás su receta dibujada, el árbol de ingredientes y de dónde sale cada cosa.</p><p>${_bookFrom ? 'Has abierto el recetario desde un banco: en la ficha de un objeto, «Poner en el banco» coloca la receta.' : 'Ábrelo desde un banco (F) o tu inventario (E) para poner las recetas con un clic.'}</p></div>`;
  let main;
  if (q) main = cxSearch(q);
  else if (sec === 'home') main = cxHome();
  else if (sec === 'items' || _bookSec.startsWith('items:')) main = cxItems(_bookSec.startsWith('items:') ? _bookSec.slice(6) : null);
  else if (sec.startsWith('i:')) { const id = sec.slice(2); CX.recent = [id, ...CX.recent.filter(x => x !== id)].slice(0, 12); main = cxItemPage(id); }
  else if (sec === 'mach') main = machineGallery();
  else if (sec.startsWith('m:')) main = machineDetail(sec.slice(2));
  else if (sec === 'mobs') main = cxMobs();
  else if (sec.startsWith('f:')) main = cxFoePage(sec.slice(2), false);
  else if (sec.startsWith('a:')) main = cxAnimalPage(sec.slice(2));
  else if (sec.startsWith('j:')) main = cxFoePage(sec.slice(2), true);
  else if (sec === 'bio') main = cxBiomes();
  else if (sec.startsWith('z:')) main = cxBiomePage(sec.slice(2));
  else if (sec === 'boss') main = cxBosses();
  else main = (typeof cxRouteExtra === 'function' && cxRouteExtra(sec)) || cxHome();
  const back = _bookHist.length && !q ? `<button class="cxback" data-back="1">← Volver</button>` : '';
  const crumbs = sec.includes(':') && !q ? `<span class="cxcrumb">${back}<span class="mut small">${cxE(CX_TABS.find(t => t[0] === tab)[1])} › ${cxE(sec.startsWith('i:') ? (ITEMS[sec.slice(2)] || {}).n : sec.startsWith('m:') ? MACHINE_NAME[sec.slice(2)] || sec.slice(2) : sec.startsWith('f:') ? (ENEMIES[sec.slice(2)] || {}).n : sec.startsWith('a:') ? (SPECIES[sec.slice(2)] || {}).n : sec.startsWith('j:') ? (BOSSES[sec.slice(2)] || {}).n : sec.startsWith('z:') ? (BIOMES[BI_[sec.slice(2)]] || {}).n : sec.split(':')[1])}</span></span>` : back ? `<span class="cxcrumb">${back}</span>` : '';
  const mainEl = document.querySelector('#bookBody .bmain'), st = mainEl ? mainEl.scrollTop : 0;
  $('bookBody').innerHTML = `<div class="cx"><nav class="cxtabs">${CX_TABS.map(([k, n]) => `<button data-sec="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</nav><div class="cxbody"><aside class="cxside bsec">${side}</aside><main class="bmain cxmain">${crumbs}${main}</main></div></div>`;
  const nm = document.querySelector('#bookBody .bmain'); if (_keepScroll) { nm.scrollTop = st; _keepScroll = false; }
  cxSprites(nm);
  $('bookCount').textContent = `${Object.keys(ITEMS).length} objetos · ${BENCH.length} recetas de banco · ${Object.values(RECIPES).reduce((s, l) => s + l.length, 0)} de máquinas · ${Object.keys(ENEMIES).length + Object.keys(SPECIES).length} criaturas`;
  $('bookHint').textContent = _bookFrom === 'pocket' ? 'Abierto desde el bolsillo: en la ficha de un objeto pulsa «Poner en el bolsillo».' : _bookFrom ? 'Abierto desde un banco: en la ficha de un objeto pulsa «Poner en el banco».' : 'Pasa el ratón por un icono para verlo; clic para abrir su ficha.';
};
{ const h = document.querySelector('#mBook header h2'); if (h) h.textContent = 'Enciclopedia del Taller'; const q = $('bookQ'); if (q) q.placeholder = 'Buscar objetos, máquinas, criaturas, biomas…'; }
// Al abrir desde el banco o el bolsillo se va directo a lo que puedes fabricar
{ const o0 = openBook; openBook = () => { o0(); if (_bookFrom && _bookSec === 'home') { _keepScroll = false; } }; }
// Controles propios
$('bookBody').addEventListener('click', e => {
  const t = e.target; if (!t.closest) return;
  const f = t.closest('[data-cxf]'); if (f) { CX.filter = f.dataset.cxf; _keepScroll = true; renderBook(); return; }
  const m = t.closest('[data-cxm]'); if (m) { CX.mobF = m.dataset.cxm; renderBook(); return; }
  const tt = t.closest('[data-tt]'); if (tt) { e.stopPropagation(); const k = tt.dataset.tt; CX.open.has(k) ? CX.open.delete(k) : CX.open.add(k); _keepScroll = true; renderBook(); return; }
  const fl = t.closest('[data-cxfill]'); if (fl) { const r = BENCH[+fl.dataset.cxfill]; if (!r) return; if (r.tier > S.tier) { toast(`Se desbloquea en el nivel ${r.tier + 1}`); return; }
    if (_bookFrom === 'pocket') { if (!pocketOK(r)) { toast('Esa receta necesita el Banco de ensamblaje'); return; } fillRecipe(r, ui.pocket, [0, 1, 2, 3]); openInventory(null); }
    else if (_bookFrom && blocks.includes(_bookFrom)) { fillRecipe(r, _bookFrom.slots, [0, 1, 2, 3, 4, 5, 6]); if (r.cat) moveInto(_bookFrom.slots, 7, r.cat, 8); openInventory(_bookFrom); } }
}, true);
// Si cambia lo que llevas (fabricas, recoges…), los números de la ficha se ponen al día
{ let v = -1; setInterval(() => { if (ui.open === 'book' && typeof invVersion !== 'undefined' && invVersion !== v) { if (v >= 0 && !document.querySelector('#bookBody:hover')) { _keepScroll = true; renderBook(); } v = invVersion; } }, 700); }
