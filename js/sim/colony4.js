'use strict';
// =====================================================================================
//  Tu pueblo de colonos (fase 4): de campamento a ciudad.
//   · Niveles: ⛺ Campamento (1-3) · 🏡 Aldea (4-10) · 🏘 Pueblo (11-25) · 🏰 Ciudad (26+).
//     Al subir, la plaza del núcleo se adorna más y se desbloquean edificios.
//   · Edificios (bloques): Ayuntamiento (leyes), Taberna, Armero (Aldea) · Mercado, Pupitre,
//     Camilla (Pueblo). En Ciudad, todo el pueblo trabaja un 10 % más rápido por orgullo.
//   · Leyes: raciones (escasas / normales / abundantes), jornada (corta / normal / larga) e
//     impuestos (ninguno / bajos / altos): cada una cambia el ánimo, la comida o las monedas.
//   · Guardias: un oficio nuevo que patrulla y dispara a los enemigos cerca del pueblo.
//   · Ataques: de noche pueden venir bandidos, más cuanto más rico es el pueblo. Si siguen
//     vivos al amanecer roban de los cofres; si los echáis, el pueblo lo celebra.
// =====================================================================================
const COL_LV = [{ n: 'Campamento', i: '⛺', min: 0 }, { n: 'Aldea', i: '🏡', min: 4 }, { n: 'Pueblo', i: '🏘', min: 11 }, { n: 'Ciudad', i: '🏰', min: 26 }];
const COL_BLD = { townHall: 1, tavernBar: 1, armory: 1, marketStall: 2, schoolDesk: 2, hospitalBed: 2 };
const COL_LAWS = {
  food: { n: '🍖 Raciones', o: { scarce: ['Escasas', 'Comen menos (ahorras comida) · −6 ánimo'], normal: ['Normales', 'Sin cambios'], rich: ['Abundantes', 'Comen más · +6 ánimo'] } },
  day: { n: '⏰ Jornada', o: { short: ['Corta', 'Terminan a las 17 h · +5 ánimo'], normal: ['Normal', 'Terminan a las 19 h'], long: ['Larga', 'Trabajan hasta las 21 h, sin tarde libre · −8 ánimo'] } },
  tax: { n: '🪙 Impuestos', o: { none: ['Ninguno', 'Sin cambios'], low: ['Bajos', '+1 moneda por colono al día · −2 ánimo'], high: ['Altos', '+3 monedas por colono al día · −8 ánimo'] } },
};
const colLv = () => { const n = colS().list.length; let l = 0; COL_LV.forEach((L, i) => { if (n >= L.min) l = i; }); return l; };
const colHasB = id => blocks.some(b => b.type === id);
const colBld = id => colHasB(id) && colLv() >= COL_BLD[id];
const colLaw = k => { const C = colS(); return colBld('townHall') && C.laws && C.laws[k] || ({ food: 'normal', day: 'normal', tax: 'none' })[k]; };
// ---------- Oficio nuevo: guardia ----------
COL_JOBS.guard = { n: 'Guardia', i: '🛡', c: 0, tool: ['ironSword', 'bronzeSword', 'woodSword'], sk: 'guard' };
if (!COL_WORKJOBS.includes('guard')) COL_WORKJOBS.push('guard');
COL_SK.guard = '🛡 Defensa';
// ---------- Leyes y edificios en el ánimo, la comida y la jornada ----------
{ const t0 = colTrait; colTrait = (c, k) => t0(c, k) * (k === 'hun' ? ({ scarce: 0.75, normal: 1, rich: 1.2 })[colLaw('food')] : 1); }
colEveH = () => ({ short: 17, normal: 19, long: 21 })[colLaw('day')];
{ const m0 = colMoodParts; colMoodParts = c => { const out = m0(c), add = (v, t) => out.push([v, t]);
  const f = colLaw('food'), d = colLaw('day'), t = colLaw('tax'); if (f === 'scarce') add(-6, 'Raciones escasas'); if (f === 'rich') add(6, 'Raciones abundantes');
  if (d === 'short') add(5, 'Jornada corta'); if (d === 'long') add(-8, 'Jornada larga'); if (t === 'low') add(-2, 'Impuestos'); if (t === 'high') add(-8, 'Impuestos altos');
  if (c.tavern > S.time) add(6, 'Tarde en la taberna'); if (colLv() >= 3) add(5, 'Orgullo de la ciudad'); if (c.defended > S.time) add(6, 'Defendimos el pueblo');
  return out.sort((a, b) => Math.abs(b[0]) - Math.abs(a[0])); }; }
{ const s0 = colSpd; colSpd = (c, j) => s0(c, j) * (colLv() >= 3 ? 1.1 : 1); }
{ const g0 = colGather; colGather = () => { if (colBld('tavernBar')) { const b = blocks.find(b => b.type === 'tavernBar'); if (b) return [b.x, b.y + 1]; } return g0(); }; }
// ---------- Guardias ----------
const colRaiders = () => FOES.filter(f => f.raid && f.hp > 0);
{ const t0 = colTick; colTick = (c, dt) => {
  // en la taberna: se apunta el buen rato
  if (c.chat !== undefined && colBld('tavernBar') && /plaza|Charla/.test(c.st || '')) c.tavern = S.time + colDay() * 0.5;
  const isGuard = !c.kid && colJobs(c)[0] === 'guard', raid = colRaiders().length > 0;
  if (!isGuard || c.hun < 25 && !raid) return t0(c, dt);
  const h = colHour(); if (!raid && (h < 6.5 || h >= 21) || c.sleeping && !raid) return t0(c, dt);
  if (c.sleeping) { c.sleeping = false; c.st = '¡Se despierta por el ataque!'; }
  const [hx, hy] = colHome(), arm = colBld('armory'), R = (arm ? 13 : 9) * T, f = nearestFoe(c.x, c.y, R) || (raid ? nearestFoe(hx * T, hy * T, 40 * T, q => q.raid) : null);
  c.gcd = (c.gcd || 0) - dt;
  if (f) { const d = Math.hypot(f.x - c.x, f.y - c.y);
    if (d > R * 0.8) { colGo(c, Math.floor(f.x / T), Math.floor(f.y / T), 3); const r = colMove(c, dt); c.st = '🛡 Va a por el enemigo'; if (r === 'stuck') c.gx = undefined; return; }
    c.moving = false; c.face = f.x > c.x ? 1 : -1; c.st = '🛡 Defendiendo el pueblo'; c.work = (c.work || 0) + dt;
    if (c.gcd <= 0) { c.gcd = 1.1 / (1 + (c.sk.guard || 0) * 0.05); const a = Math.atan2(f.y - c.y, f.x - c.x), dmg = (10 + (c.sk.guard || 0) * 1.5) * (arm ? 1.5 : 1) * (c.gear ? 1.2 : 1);
      PROJ.push({ x: c.x, y: c.y, vx: Math.cos(a) * 22 * T, vy: Math.sin(a) * 22 * T, r: 4, dmg, c: '#e8e0c8', team: 'p', life: 1.4, arrow: 0, hit: new Set() }); if (Math.random() < 0.3) colGain(c, 'guard'); }
    return; }
  c.work = 0;
  // patrulla alrededor del núcleo
  if (c.gx === undefined || colMove(c, dt) === true) { if ((c.patT = (c.patT || 0) - dt) <= 0) { c.patT = 5 + Math.random() * 6; const a = Math.random() * 6.28, r = 6 + Math.random() * 8; colGo(c, Math.round(hx + Math.cos(a) * r), Math.round(hy + Math.sin(a) * r), 0.5); } }
  c.st = raid ? '🛡 Busca a los bandidos' : '🛡 Patrulla'; }; }
// ---------- Ataques de noche ----------
function colWealth() { let n = 0; for (const b of colChests()) for (const s of b.slots) if (s) n += s.n; return n; }
function colRaid(force) {
  const C = colS(), L = C.list, [hx, hy] = colHome(); if (!L.length) return false;
  if (Math.hypot(S.player.x / T - hx, S.player.y / T - hy) > 110 && !force) return false; // solo si estás cerca (así lo ves y puedes ayudar)
  const n = Math.min(12, 2 + Math.floor(L.length / 3) + Math.floor(colWealth() / 800)), kinds = ['bandit'].filter(k => ENEMIES[k]); if (!kinds.length) return false;
  let made = 0; for (let k = 0; k < n * 6 && made < n; k++) { const a = Math.random() * 6.28, r = 26 + Math.random() * 6, x = Math.round(hx + Math.cos(a) * r), y = Math.round(hy + Math.sin(a) * r);
    if (!walkable(gnd(x, y)) || GI[gnd(x, y)].solid || at(x, y)) continue; spawnFoe(kinds[(Math.random() * kinds.length) | 0], (x + 0.5) * T, (y + 0.5) * T, { raid: 1, ag: 1 }); made++; }
  if (!made) return false; C.raid = { day: colDayN(), n: made };
  if (typeof wvBanner === 'function') wvBanner('⚔ ¡Ataque al pueblo!', `${made} bandidos rodean ${C.name || 'tu pueblo'} · tus guardias y tú debéis echarlos antes del amanecer`, '#e05050', 4);
  toast(`⚔ ¡${made} bandidos atacan el pueblo! Si siguen aquí al amanecer, robarán de los cofres.`, true); colLog(`${made} bandidos atacaron el pueblo`, '⚔'); return true; }
let _colRaidT = 0;
{ const k0 = colonyTick; colonyTick = dt => { k0(dt); const C = S && S.colony; if (!C || !C.list.length) return;
  if ((_colRaidT -= dt) > 0) return; _colRaidT = 2; const h = colHour(), day = colDayN();
  // ¿ataque esta noche?
  if (h >= 21.5 && C.raidCheck !== day && !(C.raid && C.raid.day === day)) { C.raidCheck = day; const p = Math.min(0.35, 0.04 + colWealth() / 5000 + C.list.length * 0.01); if (C.list.length >= 3 && Math.random() < p) colRaid(); }
  // fin del ataque
  if (C.raid && !C.raid.done) { const left = colRaiders();
    if (!left.length) { C.raid.done = 1; for (const c of C.list) c.defended = S.time + colDay(); toast('🛡 ¡Habéis echado a los bandidos! El pueblo lo celebra.', true); colLog('El pueblo rechazó el ataque', '🛡'); }
    else if (h >= 6 && h < 12 && colDayN() !== C.raid.day) { C.raid.done = 1; for (const f of left) { f.hp = 0; f.raid = 0; const i = FOES.indexOf(f); if (i >= 0) FOES.splice(i, 1); }
      const chs = colChests().filter(b => b.slots.some(Boolean)); let lost = 0; for (const ch of chs.slice(0, 3)) for (let k = 0; k < 4; k++) { const sl = ch.slots.filter(Boolean); if (!sl.length) break; const s = sl[(Math.random() * sl.length) | 0]; lost += slotsTake(ch.slots, s.id, Math.min(s.n, 3 + ((Math.random() * 8) | 0))); }
      for (const c of C.list) colAdd(c, 'raided', -8, 'Los bandidos saquearon el pueblo', colDay()); toast(`🦹 Al amanecer los bandidos huyeron con ${lost} objetos de tus cofres`, true); colLog(`Los bandidos saquearon ${lost} objetos`, '🦹'); } }
  // ¿ha subido de nivel?
  const lv = colLv(); if ((C.lv ?? lv) < lv) { C.lv = lv; colLevelUp(lv); } else C.lv = lv;
}; }
// ---------- Cada mañana: impuestos, mercado, escuela, hospital ----------
{ const n0 = colNewDay; colNewDay = () => { n0(); const C = colS(), L = C.list; if (!L.length) return;
  const tax = { none: 0, low: 1, high: 3 }[colLaw('tax')] * L.filter(c => !c.kid).length, mk = colBld('marketStall') ? 2 + Math.floor(L.length / 2) : 0, coins = tax + mk;
  if (coins && ITEMS.coin) { const st = blocks.find(b => b.type === 'marketStall'), ch = colNearChest(st ? st.x : colHome()[0], st ? st.y : colHome()[1], b => slotsAdd(b.slots, 'coin', coins, true) === 0);
    if (ch) { slotsAdd(ch.slots, 'coin', coins); colLog(`El pueblo recaudó ${coins} monedas${mk ? ' (mercado ' + mk + ')' : ''}`, '🪙'); } }
  if (colBld('marketStall') && Math.random() < 0.2) colVisit('merchant');
  if (colBld('schoolDesk')) { for (const c of L) { if (c.kid) { for (const k in COL_SK) c.sk[k] = Math.min(10, Math.round(((c.sk[k] || 0) + 0.3) * 10) / 10); } else { const j = colJobs(c)[0], k = j && COL_JOBS[j].sk; if (k) c.sk[k] = Math.min(10, Math.round(((c.sk[k] || 0) + 0.2) * 10) / 10); } } colLog('Clases en la escuela: todos aprenden un poco', '📚'); } }; }
{ const k0 = colonyTick; colonyTick = dt => { k0(dt); if (!S || !S.colony || !colBld('hospitalBed')) return; for (const c of S.colony.list) if (c.sick > 0) c.sick = Math.max(0, c.sick - dt * 2); }; }
// ---------- Subir de nivel: aviso y la plaza se adorna ----------
function colLevelUp(lv) { const L = COL_LV[lv], C = colS();
  if (typeof wvBanner === 'function') wvBanner(`${L.i} ¡${C.name || 'Tu pueblo'} ya es ${L.n.toLowerCase() === 'aldea' ? 'una aldea' : L.n.toLowerCase() === 'ciudad' ? 'una ciudad' : 'un ' + L.n.toLowerCase()}!`, lv === 1 ? 'Desbloqueados: Ayuntamiento (leyes), Taberna y Armero' : lv === 2 ? 'Desbloqueados: Mercado, Pupitre y Camilla' : 'Todo el pueblo trabaja un 10 % más rápido por orgullo', '#e0b54c', 5);
  colLog(`El pueblo ya es ${L.n.toLowerCase()}`, L.i); colDecorate(lv); }
function colDecorate(lv) { const H = S.hearth; if (!H || typeof hearthEdge !== 'function') return; const sets = { 1: ['banner', 'banner', 'flowerCart', 'lampPost'], 2: ['parkBench', 'parkBench', 'lampPost', 'lampPost', 'statue', 'flowerCart'], 3: ['statue', 'statue', 'lampPost', 'lampPost', 'lampPost', 'lampPost', 'banner', 'banner'] }[lv] || [];
  let n = 0; for (let tries = 0; tries < 300 && n < sets.length; tries++) { const a = Math.random() * 6.28, e = hearthEdge(H, a), r = 4.5 + Math.random() * Math.max(1, e - 5), x = Math.round(H.x + Math.cos(a) * r), y = Math.round(H.y + Math.sin(a) * r);
    if (hOnPlat(H, x, y) || hOnPath(H, x, y) || at(x, y) || !BD[sets[n]]) continue; const g = GI[gnd(x, y)]; if (g.liquid || g.solid) continue; let near = false; for (let yy = y - 1; yy <= y + 1 && !near; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (at(xx, yy)) { near = true; break; } if (near) continue;
    addBlock(makeB(sets[n], x, y, 0)); n++; } }
// ---------- Ventana: nombre, nivel, edificios y leyes ----------
{ const r0 = colRender; colRender = () => { r0(); const C = colS(), lv = colLv(), L = COL_LV[lv], nx = COL_LV[lv + 1], pop = C.list.length;
  const hdr = $('colBody').querySelector('header'); if (!hdr) return;
  const blds = Object.keys(COL_BLD).map(id => { const have = colHasB(id), ok = lv >= COL_BLD[id]; return `<span class="${have && ok ? 'good' : have ? 'warn' : 'mut'}" title="${esc(BD[id] ? BD[id].d : '')}">${BD[id] ? BD[id].look.g : ''} ${esc(BD[id] ? BD[id].n : id)} ${have && ok ? '✔' : !ok ? '🔒 ' + COL_LV[COL_BLD[id]].n : '· sin construir'}</span>`; }).join('');
  const laws = colBld('townHall') ? `<div class="collaws">${Object.keys(COL_LAWS).map(k => `<label>${COL_LAWS[k].n}<select data-collaw="${k}">${Object.keys(COL_LAWS[k].o).map(o => `<option value="${o}"${colLaw(k) === o ? ' selected' : ''}>${COL_LAWS[k].o[o][0]} — ${COL_LAWS[k].o[o][1]}</option>`).join('')}</select></label>`).join('')}</div>` : `<p class="small mut">🏛 Con una <b>Mesa del ayuntamiento</b> (desde Aldea) podrás dictar leyes.</p>`;
  const raid = colRaiders().length ? `<p class="small bad">⚔ ¡Ataque en curso! Quedan ${colRaiders().length} bandidos.</p>` : '';
  hdr.insertAdjacentHTML('afterend', `<div class="coltown"><div class="coltn"><span class="lvl">${L.i} ${L.n}</span><input data-colname maxlength="28" placeholder="Nombre de tu pueblo" value="${esc(C.name || '')}">
    <small>${pop} habitante${pop === 1 ? '' : 's'}${nx ? ` · ${nx.i} ${nx.n} con ${nx.min}` : ' · nivel máximo'}</small></div>${nx ? colBar(Math.min(100, (pop - L.min) / (nx.min - L.min) * 100), '#e0b54c') : ''}
    <div class="colblds">${blds}</div>${laws}${raid}</div>`); }; }
document.addEventListener('change', e => { const s = e.target.closest && e.target.closest('[data-collaw]'); if (!s || !S) return; const C = colS(); (C.laws || (C.laws = {}))[s.dataset.collaw] = s.value; colLog(`Nueva ley: ${COL_LAWS[s.dataset.collaw].n.slice(2).trim()} ${COL_LAWS[s.dataset.collaw].o[s.value][0].toLowerCase()}`, '📜'); });
document.addEventListener('input', e => { const s = e.target.closest && e.target.closest('[data-colname]'); if (!s || !S) return; colS().name = s.value.trim(); });
// no refrescar la ventana mientras escribes el nombre o eliges una ley
{ const ae = () => document.activeElement; const r0 = colRender; colRender = () => { const a = ae(); if (ui.open === 'colony' && a && (a.matches('[data-colname]') || a.matches('[data-collaw]')) && $('colBody').contains(a)) return; r0(); }; }
cmd('ataque', { a: ['raid'], u: '/ataque', d: 'Truco: lanza un ataque de bandidos a tu pueblo de colonos.', cheat: 1, run() { return colRaid(true) ? '' : 'No se pudo (¿tienes colonos?)'; } });
