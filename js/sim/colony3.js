'use strict';
// =====================================================================================
//  Tu pueblo de colonos (fase 3): la vida del pueblo.
//   · Ánimo (0-100) con sus motivos: comida, cama bajo techo, casa decorada, amigos, pareja,
//     fiestas, enfermedad… Con buen ánimo trabajan más rápido (y a veces les llega la
//     inspiración); con mal ánimo van lentos, tienen rabietas y, si dura, se marchan.
//   · Relaciones: al caer la tarde se juntan en la plaza a charlar. Según sus rasgos se hacen
//     amigos o rivales; los muy amigos pueden hacerse pareja, casarse (¡boda!) y tener hijos,
//     que crecen con los días y a los 14 años empiezan a trabajar.
//   · Eventos cada mañana: fiesta de la cosecha, mercader ambulante, viajero que quiere
//     quedarse, enfermedad contagiosa, heladas o sequía en los cultivos, ladrones nocturnos.
//   · Diario del pueblo en la ventana «Mi pueblo».
// =====================================================================================
const COL_PROPS = new Set(typeof PROPS !== 'undefined' ? PROPS.map(p => p[0]) : []);
const colLog = (txt, ic = '•') => { const C = colS(), L = C.log || (C.log = []); L.unshift({ d: Math.floor(S.time / colDay()) + 1, t: ic + ' ' + txt }); if (L.length > 40) L.length = 40; };
const colDayN = () => Math.floor(S.time / colDay());
const colRelK = (a, b) => a < b ? a + ':' + b : b + ':' + a;
const colRel = (a, b) => (colS().rel || {})[colRelK(a.id, b.id)] || 0;
function colRelAdd(a, b, v) { const R = colS().rel || (colS().rel = {}), k = colRelK(a.id, b.id); R[k] = clamp((R[k] || 0) + v, -100, 100); return R[k]; }
const colById = id => colS().list.find(c => c.id === id);
const colAdd = (c, k, v, txt, secs) => { const M = c.mods || (c.mods = {}); M[k] = { v, txt, until: secs ? S.time + secs : 0 }; };
// Afinidad de una pareja: rasgos, cultura y un poco de «química» fija
function colCompat(a, b) { let v = (colHash(colRelK(a.id, b.id), 21) - 0.35) * 1.2;
  if (a.cult && a.cult === b.cult) v += 0.25; for (const [p, q] of [[a, b], [b, a]]) { if (p.traits.includes('social')) v += 0.3; if (p.traits.includes('loner')) v -= 0.35; if (p.traits.includes('lazy') && q.traits.includes('hard')) v -= 0.25; }
  return v; }
// ---------- Ánimo ----------
function colMoodParts(c) {
  const out = [], add = (v, t) => { if (v) out.push([v, t]); }, C = colS();
  add(c.hun < 20 ? -14 : c.hun > 70 ? 4 : 0, c.hun < 20 ? 'Pasa hambre' : 'Bien comido');
  add(c.slp < 15 ? -9 : 0, 'Agotado');
  const bed = c.bed && at(c.bed.x, c.bed.y);
  if (!bed) add(-14, 'No tiene cama');
  else { const roof = S.roof && S.roof[bed.x + ',' + bed.y]; add(roof ? 8 : -5, roof ? 'Duerme bajo techo' : 'Duerme a la intemperie');
    let dec = 0; for (const b of blocks) if (Math.abs(b.x - bed.x) <= 4 && Math.abs(b.y - bed.y) <= 4 && (COL_PROPS.has(b.type) || BD[b.type].decor || BD[b.type].light)) dec++;
    add(Math.min(10, dec * 2), 'Su casa es bonita'); }
  const ate = c.ate || []; const varied = new Set(ate).size; add(varied >= 3 ? 6 : ate.length >= 4 && varied === 1 ? -4 : 0, varied >= 3 ? 'Come variado' : 'Siempre come lo mismo');
  if (ate.some(id => ITEMS[id] && ITEMS[id].food && ITEMS[id].food.raw)) add(-5, 'Comió algo crudo');
  if (c.sick) add(-12, 'Enfermedad');
  let fr = 0, rv = 0; for (const o of C.list) if (o !== c) { const r = colRel(c, o); if (r >= 30) fr++; if (r <= -30) rv++; }
  add(Math.min(12, fr * 4), fr === 1 ? 'Tiene un amigo' : 'Tiene amigos'); add(-Math.min(10, rv * 4), rv === 1 ? 'Tiene un rival' : 'Tiene rivales');
  if (c.partner && colById(c.partner)) add(10, 'Tiene pareja: ' + colById(c.partner).name);
  if (!C.list.some(o => o !== c) && c.traits.includes('social')) add(-6, 'Echa de menos compañía');
  if (c.traits.includes('loner') && C.list.length > 6) add(-5, 'Demasiada gente');
  if (c.gear) add(3, 'Buenas herramientas');
  for (const k in c.mods || {}) { const m = c.mods[k]; if (m.until && m.until < S.time) { delete c.mods[k]; continue; } add(m.v, m.txt); }
  return out.sort((a, b) => Math.abs(b[0]) - Math.abs(a[0]));
}
const colMoodTarget = c => clamp(50 + colMoodParts(c).reduce((a, p) => a + p[0], 0), 0, 100);
const colMoodN = m => m >= 85 ? 'Muy alto' : m >= 65 ? 'Alto' : m >= 40 ? 'Normal' : m >= 20 ? 'Bajo' : 'Muy bajo';
// Más ánimo, más rápido (×0,75 a ×1,25) · inspiración ×1,4 · enfermo ×0,5
{ const s0 = colSpd; colSpd = (c, j) => s0(c, j) * (0.75 + (c.mood ?? 50) / 200) * (c.insp > S.time ? 1.4 : 1) * (c.sick ? 0.5 : 1); }
// Los niños no trabajan
{ const j0 = colJobs; colJobs = c => c.kid ? [] : j0(c); }
// ---------- La tarde: a la plaza a charlar · rabietas ----------
function colGather() { const [hx, hy] = colHome(); const fire = blocks.find(b => b.type === 'campfire' && Math.hypot(b.x - hx, b.y - hy) < 25); return fire ? [fire.x, fire.y + 1] : [hx, hy]; }
{ const t0 = colTick; colTick = (c, dt) => {
  if (c.tantrum > 0 && !c.sleeping) { c.tantrum -= dt; c.st = 'Tiene una rabieta 😤'; c.w = null; colIdle(c, dt); return; }
  const h = colHour(), C = colS();
  const party = C.party && C.party.day === colDayN();
  if (!c.sleeping && !c.w && c.hun > 30 && (h >= (party ? 17 : 19) && h < 21 || c.kid && h >= 8 && h < 21)) {
    if (colCarryN(c) && !c.kid) return t0(c, dt);
    const [gx, gy] = colGather(); if (Math.hypot(c.x / T - gx, c.y / T - gy) > 4) { colGo(c, gx + ((colHash(String(c.id), 4) - 0.5) * 6 | 0), gy + ((colHash(String(c.id), 5) - 0.5) * 4 | 0), 0.5); const r = colMove(c, dt); c.st = c.kid ? 'Jugando' : party ? 'Va a la fiesta' : 'Va a la plaza'; if (r !== 'stuck') return; }
    c.st = c.kid ? 'Jugando en la plaza' : party ? '🎉 De fiesta' : 'Charla en la plaza'; c.moving = false; c.chat = (c.chat || 0) + dt; return;
  }
  return t0(c, dt); }; }
// ---------- Cada segundo: ánimo, relaciones · cada mañana: eventos ----------
let _colLifeT = 0;
{ const k0 = colonyTick; colonyTick = dt => { k0(dt); const C = S && S.colony; if (!C || !C.list.length) return;
  if ((_colLifeT -= dt) > 0) return; const step = 1 - _colLifeT; _colLifeT = 1;
  for (const c of C.list) { if (Math.abs(c.x - S.player.x) > 110 * T || Math.abs(c.y - S.player.y) > 110 * T) continue;
    const tg = colMoodTarget(c); c.mood = c.mood ?? 55; c.mood += clamp(tg - c.mood, -step * 0.4, step * 0.4);
    // con muy mal ánimo: rabietas y, si dura un día, se va
    if (c.mood < 20 && !c.tantrum && Math.random() < step / 240) { c.tantrum = 25; colLog(`${c.name} tuvo una rabieta`, '😤'); }
    if (c.mood < 10) { c.sad = (c.sad || 0) + step; if (c.sad > colDay()) { colLeave(c, 'no aguantaba más en el pueblo'); return; } } else c.sad = 0;
    if (c.mood > 85 && !(c.insp > S.time) && Math.random() < step / (colDay() * 0.8)) { c.insp = S.time + colDay() * 0.4; toast(`✨ ${c.name} siente inspiración: trabaja mucho más rápido un rato`); colLog(`${c.name} tuvo un momento de inspiración`, '✨'); }
    // enfermedad: se pasa durmiendo (y antes con hierbas) · contagio a los que están cerca
    if (c.sick) { if (c.sleeping) c.sick -= step * 2; c.sick -= step; if (c.sick <= 0) { c.sick = 0; colLog(`${c.name} se ha curado`, '💚'); }
      else for (const o of C.list) if (o !== c && !o.sick && Math.hypot(o.x - c.x, o.y - c.y) < 2.5 * T && Math.random() < step / 400) { o.sick = colDay() * 0.6; colLog(`${o.name} se contagió de ${c.name}`, '🤒'); }
      if (c.sick > colDay() * 0.25 && !c.herbT) { const ch = colNearChest(c.x / T, c.y / T, b => slotsCount(b.slots, 'herbs') > 0); if (ch) { slotsTake(ch.slots, 'herbs', 1); c.sick = Math.min(c.sick, colDay() * 0.2); c.herbT = 1; colLog(`${c.name} tomó hierbas medicinales`, '🌿'); } } } }
  // charlas: los que están juntos (en la plaza o trabajando cerca) se conocen mejor
  const L = C.list.filter(c => !c.sleeping && Math.abs(c.x - S.player.x) < 110 * T);
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const a = L[i], b = L[j], d = Math.hypot(a.x - b.x, a.y - b.y) / T; if (d > (a.chat && b.chat ? 8 : 4)) continue;
    const talk = a.chat && b.chat ? 1 : 0.25, r0 = colRel(a, b), r = colRelAdd(a, b, step * talk * (colCompat(a, b) + 0.15) * 0.6);
    if (r0 < 30 && r >= 30) colLog(`${a.name} y ${b.name} se han hecho amigos`, '🤝'); if (r0 > -30 && r <= -30) colLog(`${a.name} y ${b.name} no se soportan`, '😠');
    if (r >= 75 && !a.partner && !b.partner && !a.kid && !b.kid && a.age >= 18 && b.age >= 18 && Math.random() < step / 300) { a.partner = b.id; b.partner = a.id; a.wedT = b.wedT = 0; colLog(`${a.name} y ${b.name} son pareja`, '💕'); toast(`💕 ${a.name} y ${b.name} se han enamorado`); }
    if (r <= -60 && Math.random() < step / 500) { colAdd(a, 'fight', -8, 'Discutió con ' + b.name, colDay() * 0.5); colAdd(b, 'fight', -8, 'Discutió con ' + a.name, colDay() * 0.5); colLog(`${a.name} y ${b.name} discutieron`, '💢'); } }
  for (const c of C.list) c.chat = 0;
  // un día nuevo
  const day = colDayN(); if (C.day === undefined) C.day = day; if (day !== C.day && colHour() >= 7) { C.day = day; colNewDay(); }
}; }
function colLeave(c, why) { const C = colS(), i = C.list.indexOf(c); if (i < 0) return; C.list.splice(i, 1);
  for (const o of C.list) { if (colRel(o, c) >= 30) colAdd(o, 'miss' + c.id, -10, 'Echa de menos a ' + c.name, colDay()); if (o.partner === c.id) o.partner = null; }
  toast(`😢 ${c.name} se ha ido de tu pueblo: ${why}`, true); colLog(`${c.name} se marchó (${why})`, '😢'); }
// ---------- Eventos de cada mañana ----------
function colNewDay() {
  const C = colS(), L = C.list, R = Math.random;
  for (const c of L) { c.herbT = 0; if (c.kid) { c.age++; if (c.age >= 14) { c.kid = false; toast(`🎓 ${c.name} ya tiene 14 años: puede tener un oficio`); colLog(`${c.name} cumplió 14 años y puede trabajar`, '🎓'); } } }
  // bodas: las parejas se casan al cabo de unos días (fiesta para todos)
  for (const c of L) if (c.partner && !c.wed) { const p = colById(c.partner); if (!p) { c.partner = null; continue; } c.wedT = (c.wedT || 0) + 1; if (c.wedT >= 3 && c.id < p.id) { c.wed = p.wed = 1; C.party = { day: colDayN(), why: 'boda' };
      for (const o of L) colAdd(o, 'party', 12, `Boda de ${c.name} y ${p.name}`, colDay()); toast(`💍 ¡${c.name} y ${p.name} se casan hoy! Esta tarde hay fiesta en la plaza.`, true); colLog(`Boda de ${c.name} y ${p.name}`, '💍'); } }
  // hijos: las parejas casadas, si hay una cama libre
  for (const c of L) { const p = c.wed && colById(c.partner); if (!p || c.id > p.id || L.length >= 30) continue; if (R() < 0.18 && colFreeBed()) colBirth(c, p); }
  if (!L.length) return;
  const ev = R(); const farmers = L.filter(c => colJobs(c).includes('farm')).length;
  if (ev < 0.14 && farmers && colFoodStock() > 30) { C.party = { day: colDayN(), why: 'cosecha' }; for (const c of L) colAdd(c, 'party', 15, 'Fiesta de la cosecha', colDay()); toast('🎉 ¡Hoy es la fiesta de la cosecha! Esta tarde todo el pueblo se junta en la plaza.', true); colLog('Fiesta de la cosecha', '🎉'); }
  else if (ev < 0.28) colVisit('merchant');
  else if (ev < 0.38) colVisit('traveler');
  else if (ev < 0.5 && L.length >= 2) { const c = L[(R() * L.length) | 0]; if (!c.sick) { c.sick = colDay() * 0.7; toast(`🤒 ${c.name} ha enfermado: trabaja más lento y puede contagiar. Descansar o unas hierbas en un cofre le curan.`, true); colLog(`${c.name} enfermó`, '🤒'); } }
  else if (ev < 0.58) { const crops = blocks.filter(b => b.type === 'crop' && colS().zones[b.x + ',' + b.y]); if (crops.length) { const frost = BIOMES[biomeOf(crops[0].x, crops[0].y)]; const cold = frost && /snow|tundra|taiga|ice/i.test(frost.key);
      let n = 0; for (const b of crops) if (R() < 0.5) { b.g = Math.max(0, (b.g || 0) - 0.35); b._tv = -1; n++; } if (n) { toast(cold ? `❄ Heladas esta noche: ${n} cultivos han retrocedido` : `☀ Sequía: ${n} cultivos se han secado un poco`); colLog(cold ? 'Heladas en los cultivos' : 'Sequía en los cultivos', cold ? '❄' : '☀'); for (const c of L) colAdd(c, 'crop', -4, 'Malas noticias del campo', colDay() * 0.5); } } }
  else if (ev < 0.66) { const chs = colChests().filter(b => b.slots.some(Boolean)); if (chs.length) { const ch = chs[(R() * chs.length) | 0], got = []; for (let k = 0; k < 6; k++) { const sl = ch.slots.filter(Boolean); if (!sl.length) break; const s = sl[(R() * sl.length) | 0], n = Math.min(s.n, 1 + ((R() * 6) | 0)); slotsTake(ch.slots, s.id, n); got.push(n + ' ' + (ITEMS[s.id] ? ITEMS[s.id].n.toLowerCase() : s.id)); }
      toast(`🦹 Ladrones esta noche: se llevaron ${got.slice(0, 3).join(', ')}${got.length > 3 ? '…' : ''}`, true); colLog('Ladrones robaron de un cofre', '🦹'); for (const c of L) colAdd(c, 'thief', -5, 'Les robaron', colDay() * 0.6); } }
}
function colBirth(a, b) { const C = colS(), R = Math.random, base = R() < 0.5 ? a : b, other = base === a ? b : a;
  const tr = [a.traits[(R() * 2) | 0], b.traits[(R() * 2) | 0]].filter((v, i, arr) => arr.indexOf(v) === i); while (tr.length < 2) { const k = Object.keys(COL_TRAITS)[(R() * 10) | 0]; if (!tr.includes(k)) tr.push(k); }
  const sk = {}; for (const k in COL_SK) sk[k] = Math.round(((a.sk[k] || 0) + (b.sk[k] || 0)) / 4 * 10) / 10;
  const names = ['Lía', 'Teo', 'Nora', 'Iker', 'Alba', 'Leo', 'Vera', 'Hugo', 'Elia', 'Bruno', 'Iris', 'Dante', 'Luna', 'Marco', 'Sol', 'Tobías'];
  const kid = { id: ++C.n, name: names[(R() * names.length) | 0], look: { ...base.look, hair: other.look.hair, eyes: (R() * 6) | 0, beard: 0 }, equip: {}, from: 'tu pueblo', cult: a.cult, age: 0, kid: true, traits: tr, sk, job: 'none', bed: null, x: a.x, y: a.y, hun: 90, slp: 90, st: 'Recién nacido', carry: {}, starve: 0, mood: 70, parents: [a.id, b.id] };
  const bed = colFreeBed(); if (bed) kid.bed = { x: bed.x, y: bed.y }; C.list.push(kid); colRelAdd(kid, a, 80); colRelAdd(kid, b, 80);
  for (const o of C.list) colAdd(o, 'baby', 6, 'Ha nacido ' + kid.name, colDay()); toast(`👶 ¡Ha nacido ${kid.name}, bebé de ${a.name} y ${b.name}!`, true); colLog(`Nació ${kid.name}, de ${a.name} y ${b.name}`, '👶'); }
// ---------- Visitas: mercader ambulante y viajero que quiere quedarse ----------
const COL_VIS = [];
function colVisit(kind) { const [hx, hy] = colHome(), R = Math.random, look = { skin: (R() * 6) | 0, hair: (R() * 9) | 0, eyes: (R() * 6) | 0, hairStyle: (R() * 9) | 0, beard: R() < 0.4 ? (R() * 5) | 0 : 0, body: (R() * 3) | 0, shirt: kind === 'merchant' ? 3 : 7, pants: (R() * 12) | 0, shoes: 9 };
  COL_VIS.length = 0; const until = S.time + colDay() * 0.45, x = (hx + 3.5) * T, y = (hy + 1.5) * T;
  if (kind === 'merchant') { COL_VIS.push({ type: 'merchant', x, y, look, decor: 0, visitor: 1, until, label: '🧳 Mercader ambulante' }); toast('🧳 Ha llegado un mercader ambulante a tu plaza. Habla con él (F) antes de que se vaya.', true); colLog('Pasó un mercader ambulante', '🧳'); }
  else { const nm = ['Ardo', 'Selma', 'Corvin', 'Yara', 'Bastián', 'Mirela', 'Odón', 'Tasia'][(R() * 8) | 0]; COL_VIS.push({ folk: 1, sid: 'via' + colDayN(), fi: 0, role: 'walker', type: 'merchant', x, y, look, equip: {}, label: '✦ ' + nm + ' · Viajero', until, visitor: 1 }); toast(`🎒 ${nm}, un viajero, ha llegado a tu plaza y busca un sitio donde quedarse. Habla con él (F).`, true); colLog(`Llegó ${nm}, un viajero`, '🎒'); }
}
{ const a0 = npcAt; npcAt = (wx, wy) => { for (const v of COL_VIS) if (Math.hypot(v.x - wx, v.y - wy) < 14) return v; return a0(wx, wy); }; }
// el viajero siempre quiere quedarse (y no pide nada)
{ const w0 = colWilling; colWilling = n => n && n.visitor && n.folk ? !(S.colony && S.colony.gone[colFolkKey(n)]) : w0(n); }
{ const c0 = colRecruitCost; colRecruitCost = n => n && n.visitor ? null : c0(n); }
{ const r0 = colRecruit; colRecruit = n => { const ok = r0(n); if (ok && n.visitor) { const i = COL_VIS.indexOf(n); if (i >= 0) COL_VIS.splice(i, 1); } return ok; }; }
{ const d0 = drawCombat; drawCombat = (ctx, ...a) => { const r = d0(ctx, ...a); if (!S || !COL_VIS.length) return r;
  for (let i = COL_VIS.length - 1; i >= 0; i--) { const v = COL_VIS[i]; if (S.time > v.until) { COL_VIS.splice(i, 1); continue; }
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(v.x, v.y + 8, 9, 3.5, 0, 0, 7); ctx.fill();
    drawAvatar(ctx, v.look, v.equip || {}, v.x, v.y + 8, Math.atan2(S.player.y - v.y, S.player.x - v.x), 0, false, 1.6, null, 0);
    ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(v.label, v.x + 1, v.y - 33); ctx.fillStyle = '#ffd34a'; ctx.fillText(v.label, v.x, v.y - 34); }
  return r; }; }
// ---------- Ventana: ánimo, relaciones y diario ----------
{ const h0 = colCardHTML; colCardHTML = (c, full) => { let h = h0(c, full); if (!full) return h;
  const m = Math.round(c.mood ?? 55), parts = colMoodParts(c).slice(0, 4), C = colS();
  const rels = C.list.filter(o => o !== c).map(o => [o, colRel(c, o)]).filter(([, r]) => Math.abs(r) >= 30).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const extra = `<div class="colmood"><div><small>😊 Ánimo · ${colMoodN(m)}</small>${colBar(m, m < 25 ? '#e05050' : m < 45 ? '#e0a040' : '#7fd07a')}</div>
    <div class="colwhy">${parts.map(([v, t]) => `<span class="${v > 0 ? 'good' : 'bad'}">${v > 0 ? '+' : ''}${v} ${esc(t)}</span>`).join('')}</div>
    ${c.kid ? `<div class="small mut">👶 ${c.age} año${c.age === 1 ? '' : 's'}: trabajará a los 14</div>` : ''}${c.sick ? '<div class="small bad">🤒 Con fiebre</div>' : ''}${c.insp > S.time ? '<div class="small good">✨ Con inspiración</div>' : ''}
    ${rels.length || c.partner ? `<div class="colrel">${c.partner && colById(c.partner) ? `<span class="love">${c.wed ? '💍' : '💕'} ${esc(colById(c.partner).name)}</span>` : ''}${rels.filter(([o]) => o.id !== c.partner).map(([o, r]) => `<span class="${r > 0 ? 'good' : 'bad'}">${r > 0 ? '🤝' : '😠'} ${esc(o.name)}</span>`).join('')}</div>` : ''}</div>`;
  return h.replace('<div class="colst">', extra + '<div class="colst">'); }; }
{ const r0 = colRender; colRender = () => { r0(); const C = colS(), L = C.log || []; if (!L.length) return; const help = $('colBody').querySelector('.colhelp'); if (!help) return;
  help.insertAdjacentHTML('beforebegin', `<div class="collog"><b>📜 Diario del pueblo</b><ul>${L.slice(0, 12).map(e => `<li><small>Día ${e.d}</small> ${esc(e.t)}</li>`).join('')}</ul></div>`); }; }
// al reclutar, al diario
{ const r0 = colRecruit; colRecruit = n => { const ok = r0(n); if (ok) { const c = colS().list[colS().list.length - 1]; c.mood = 60; colLog(`${c.name} se unió al pueblo${c.from ? ' (venía de ' + c.from + ')' : ''}`, '🏘'); } return ok; }; }
cmd('evento', { a: [], u: '/evento [cosecha|mercader|viajero|enfermedad|ladrones|dia]', d: 'Truco: lanza un evento del pueblo de colonos.', cheat: 1, run(a) { const k = (a[0] || 'dia').toLowerCase(), C = colS();
  if (k === 'cosecha') { C.party = { day: colDayN(), why: 'cosecha' }; for (const c of C.list) colAdd(c, 'party', 15, 'Fiesta de la cosecha', colDay()); return '🎉 Fiesta de la cosecha'; }
  if (k === 'mercader') { colVisit('merchant'); return ''; } if (k === 'viajero') { colVisit('traveler'); return ''; }
  if (k === 'enfermedad' && C.list.length) { C.list[0].sick = colDay() * 0.7; return '🤒 ' + C.list[0].name + ' enfermó'; }
  colNewDay(); return 'Nuevo día del pueblo'; } });
