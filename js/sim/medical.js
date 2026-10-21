'use strict';
// =====================================================================================
//  Medicina (lógica). Cada herida recuerda qué pasos de su cura has hecho (w.done) y eso
//  cambia de verdad cómo evoluciona: deja de sangrar, no se infecta, cura más rápido, duele
//  menos… Hasta que no sacas lo que tiene clavado o colocas el hueso, no empieza a curar.
//  Causas nuevas en el mundo: sol fuerte (quemadura solar), mosquitos en pantanos y selvas,
//  garrapatas en la hierba, congelación con hipotermia, calambres al agotarte, ampollas y
//  contracturas de tanto trabajar, esguinces y luxaciones al caer, proyectiles que se quedan
//  clavados, conmociones por golpes en la cabeza, polvo y ceniza en los ojos.
// =====================================================================================
Object.assign(WT, WT_NEW);
let _projHit = false;
Object.assign(BUFF_N, { sunproof: 'Protector solar', bugproof: 'Repelente', warmth: 'Calor interior', regen: 'Regeneración', vigor: 'Vigor', calm: 'Calma' });
// ---------- Pasos de la cura ----------
const wSteps = w => { const st = (W_STEPS[w.t] || []).slice(); if (w.ven) st.unshift(VENOM_STEP); return st; };
const wDone = w => w.done || (w.done = {});
// Índice del siguiente paso pendiente (o -1 si ya está todo)
function nextStep(w) { const st = wSteps(w), d = wDone(w); for (let i = 0; i < st.length; i++) if (!d[i]) return i; return -1; }
const curedAll = w => nextStep(w) < 0;
// Qué procedimientos se pueden hacer ahora sobre esta herida (el paso siguiente; los demás pasos también se pueden adelantar)
function procsFor(w, part) {
  const st = wSteps(w), d = wDone(w), out = [];
  st.forEach((opts, i) => { if (d[i]) return; for (const id of opts) { const p = PROCS[id]; if (p && p.parts.includes(part) && !out.some(o => o.id === id)) out.push({ id, step: i, next: i === nextStep(w) }); } });
  return out;
}
// ¿Tienes lo necesario? Devuelve { ok, use, tool, miss }
function procNeeds(id) {
  const p = PROCS[id], use = (p.use || []).find(x => invCount(x) > 0) || null, tool = (p.tool || []).find(x => invCount(x) > 0) || null;
  const miss = []; if (p.use && p.use.length && !use) miss.push(p.use[0]); if (p.tool && p.tool.length && !tool) miss.push(p.tool[0]);
  return { ok: !miss.length, use, tool, miss };
}
// ---------- Efectos al terminar un procedimiento ----------
function applyProc(id, part, wi, quality = 1) {
  const pc = S.pc, p = PROCS[id], need = procNeeds(id);
  if (!need.ok) { toastErr('Te falta: ' + need.miss.map(x => ITEMS[x].n).join(', ')); return false; }
  if (need.use) invTake(need.use, 1); if (p.opt) { const o = p.opt.find(x => invCount(x) > 0); if (o) { invTake(o, 1); quality += 0.25; } }
  if (need.tool && Math.random() < 0.04) wearItem(need.tool, 1);
  gainXP('surv', 3 + Math.round(quality * 3));
  // Prevención: sobre todo el cuerpo
  if (p.prevent) { const b = S.buffs || (S.buffs = {}), k = p.fx === 'sun' ? 'sunproof' : 'bugproof'; b[k] = Math.max(b[k] || 0, 360 * quality); toast(`${p.i} ${BUFF_N[k]}: ${Math.round(6 * quality)} min`); vitalsDirty = true; return true; }
  const w = pc.parts[part][wi]; if (!w) return false;
  const st = wSteps(w), d = wDone(w), si = st.findIndex((opts, i) => !d[i] && opts.includes(id));
  if (si >= 0) d[si] = 1;
  switch (p.fx) {
    case 'press': w.pr = 50 * quality; break;
    case 'tq': w.tq = 1; break;
    case 'caut': w.st = 1; w.pr = 999; pc.pk = 0; hurt('burn', part, 0.25, 'Cauterizar'); break;
    case 'clean': case 'wash': w.dirt = 0; w.clean = 1; break;
    case 'dis': case 'honey': w.inf = 0; w.dis = 1; if (p.fx === 'honey') w.b = 1; break;
    case 'stitch': w.st = 1; break;
    case 'band': case 'plast': case 'elastic': w.b = 1; break;
    case 'splint': w.sp = 1; break;
    case 'sling': w.sl = 1; break;
    case 'extract': w.obj = 0; break;
    case 'suck': case 'inject': w.ven = 0; pc.poison = Math.max(0, pc.poison - (p.fx === 'inject' ? 999 : 12)); break;
    case 'reset': w.set = 1; break;
    case 'cold': case 'warm': case 'massage': case 'stretch': case 'cool': case 'gel': case 'itch': case 'arnica': case 'drain': case 'eye': case 'salts': break;
  }
  // Calidad: cuanto mejor lo hagas, más se acorta la curación
  w.left *= 0.9 - 0.08 * quality;
  if (curedAll(w)) { w.left = Math.min(w.left, WT[w.t].heal * 0.12); toast(`✓ ${WT[w.t].n}: curada como es debido`, true); }
  if (S.char && S.char.prof === 'medic') w.left *= 0.85;
  vitalsDirty = true; return true;
}
// ---------- Cómo evoluciona cada herida ----------
woundRate = w => {
  const T0 = WT[w.t]; if (w.obj ?? T0.obj) return 0.15; // con algo clavado apenas cura
  if (T0.set && !w.set) return 0.2;                      // articulación fuera de sitio
  if (w.t === 'fracture' && !w.set && !w.sp) return 0.35;
  const done = Object.keys(w.done || {}).length;
  return (w.b ? 2 : 1) * (w.st ? 1.6 : 1) * (w.inf ? 0.3 : 1) * (1 + done * 0.35) * (buff('regen') ? 1.6 : 1);
};
function bleedOf() {
  let s = 0;
  for (const p of PARTS) for (const w of S.pc.parts[p]) { const b = WT[w.t].bleed; if (!b || w.b || w.st || w.tq || w.pr > 0 || wFrac(w) <= 0.75 && !(w.obj ?? WT[w.t].obj)) continue; s += b * ((w.obj ?? WT[w.t].obj) ? 0.6 : 1); }
  return s * CM().bleed;
}
function painOf() {
  let s = 0;
  for (const p of PARTS) for (const w of S.pc.parts[p]) { const T0 = WT[w.t], done = Object.keys(w.done || {}).length; s += T0.pain * wFrac(w) * (w.sp || w.sl ? 0.5 : 1) * ((w.obj ?? T0.obj) ? 1.4 : 1) * Math.max(0.25, 1 - done * 0.18); }
  return s * (S.pc.pk > 0 || buff('calm') ? 0.35 : 1) * CM().pain;
}
// ---------- Al herirte: convierte el daño en la lesión concreta ----------
const _hurt0 = hurt;
hurt = (t, part, mult = 1, cause = '') => {
  if (!survOn()) return;
  const pc = pcInit(); part = part || pickPart();
  if (_projHit && (t === 'cut' || t === 'sting' || t === 'bite')) t = Math.random() < 0.55 ? 'embedded' : 'puncture';
  else if (t === 'cut' && mult > 1.25 && Math.random() < 0.6) t = 'deepCut';
  else if (t === 'bruise' && cause === 'Caída') t = mult > 1.2 || Math.random() < 0.25 ? 'dislocation' : 'sprain';
  else if ((t === 'bruise' || t === 'fracture') && part === 'head' && mult > 0.9 && Math.random() < 0.5) t = 'concussion';
  _hurt0(t, part, mult, cause);
  const L2 = pc.parts[part], w = L2 && L2[L2.length - 1]; if (!w || w.t !== t) return;
  w.done = {};
  if (WT[t].obj) w.obj = 1;
  if (WT[t].dirty || t === 'bite' || t === 'scratch' || t === 'cut') w.dirt = 1;
  if (t === 'bite' && WT_VENOM_CAUSE.test(cause)) w.ven = 1;
  if (t === 'sting') w.obj = 1;
};
const WT_VENOM_CAUSE = /serpiente|víbora|basilisco|escorpi|araña|cobra/i;
// ---------- Causas en el mundo, infección y efectos de los nuevos estados ----------
let _medT = 0, _medLast = -999, _wasLock = false, _workT = 0;
function medEvent(t, parts, cause) {
  if (!survOn() || S.pc.alive - _medLast < 45) return; _medLast = S.pc.alive;
  const part = parts[(Math.random() * parts.length) | 0]; hurt(t, part, 1, cause); toast(`${WT[t].i} ${WT[t].n} (${PART_N[part].toLowerCase()}) — ábrete la ficha (C) para curarla`);
}
// Protección del equipo (gear.prot: sun, bugs, cold, eyes, blister, fall)
function protOf(k) { let v = 0; for (const sl in S.equip) { const id = S.equip[sl], g = id && ITEMS[id] && (ITEMS[id].gear || ITEMS[id].armor); if (g && g.prot && g.prot[k]) v = Math.max(v, g.prot[k]); } return v; }
function medTick(dt) {
  if (!survOn()) return; const pc = S.pc;
  // Temporizadores de cada herida
  for (const p of PARTS) for (const w of pc.parts[p]) {
    if (w.pr > 0) w.pr -= dt;
    w.age = (w.age || 0) + dt;
    // Sucia y sin desinfectar: a los 90 s puede infectarse
    if (w.dirt && !w.dis && !w.inf && w.age > 90 && !w.infTry) { w.infTry = 1; if (Math.random() < 0.35) { w.inf = 1; toast(`⚠ ${WT[w.t].n} se ha infectado: desinféctala`); } }
    // La garrapata, si no la quitas, transmite fiebre
    if (w.t === 'tick' && w.obj && w.age > 180 && !w.fever) { w.fever = 1; pc.poison = Math.max(pc.poison, 20); pc.cause = 'Fiebre por garrapata'; toast('🌡 La garrapata te ha dado fiebre'); }
    // El torniquete mucho rato hace daño
    if (w.tq && !w.st && !w.b && w.age > 240 && Math.random() < dt / 30) { hurt('bruise', p, 0.5, 'Torniquete demasiado tiempo'); w.tq = 0; }
  }
  // Estados buenos
  if (buff('regen')) pc.hp = Math.min(maxHp(), pc.hp + 0.25 * dt);
  if (buff('vigor')) pc.stam = Math.min(maxStam(), pc.stam + 5 * dt);
  if (buff('warmth') && pc.temp < 37) pc.temp = Math.min(37, pc.temp + 0.02 * dt);
  // Calambre al quedarte sin aliento corriendo o nadando
  if (pc.lock && !_wasLock && Math.random() < 0.3) medEvent('cramp', ['legL', 'legR', 'footL', 'footR'], 'Agotamiento');
  _wasLock = !!pc.lock;
  // Trabajo duro sin guantes: ampollas; mucho rato: contracturas
  if (ui.mine && ui.mine.t > 0) { _workT += dt; if (_workT > 150) { _workT = 0; const gl = protOf('blister'); if (Math.random() > gl) medEvent(Math.random() < 0.5 ? 'blister' : 'knot', Math.random() < 0.6 ? ['handL', 'handR'] : ['torso', 'armL', 'armR'], 'Trabajo duro'); } }
  _medT -= dt; if (_medT > 0) return; _medT = 5;
  const tx = Math.floor(S.player.x / T), ty = Math.floor(S.player.y / T), B = BIOMES[biomeOf(tx, ty)] || {}, key = B.key || '', g = GI[gnd(tx, ty)], day = daylight(), sw = P.swim;
  // Sol fuerte en zonas cálidas a mediodía
  if (_hot && day > 0.75 && !buff('sunproof') && !sw && Math.random() < 0.035 * (1 - protOf('sun'))) medEvent('sunburn', ['head', 'armL', 'armR', 'torso'], 'Sol fuerte');
  // Mosquitos en pantanos, selvas y manglares (más al atardecer y de noche)
  if (/swamp|jungle|mangrove|bamboo|marsh|bog/i.test(key) && !buff('bugproof') && Math.random() < (day < 0.5 ? 0.05 : 0.02) * (1 - protOf('bugs'))) medEvent('insectBite', EXT_P, 'Mosquitos');
  // Garrapatas al andar por hierba alta y bosques
  if (pmove.moving && /GRASS|MOSS/.test(g.key || '') && /forest|plains|meadow|taiga|grove|savanna/i.test(key) && !buff('bugproof') && Math.random() < 0.006 * (1 - protOf('bugs'))) medEvent('tick', ['legL', 'legR', 'footL', 'footR', 'armL', 'armR', 'torso'], 'Garrapata');
  // Congelación con hipotermia
  if (pc.temp < 34.8 && Math.random() < 0.08 * (1 - protOf('cold'))) medEvent('frostbite', ['handL', 'handR', 'footL', 'footR', 'head'], 'Congelación');
  // Ceniza y arena en los ojos (volcanes, desiertos)
  if (/volcan|ash|desert|dune|badland/i.test(key) && Math.random() < 0.01 * (1 - protOf('eyes'))) medEvent('eyeDust', ['head'], 'Polvo en los ojos');
}
{ const s0 = survTick; survTick = (dt, m, s) => { s0(dt, m, s); medTick(dt); }; }
// Caídas: las rodilleras y coderas protegen
{ const l0 = land; land = v => { if (v > 300 && protOf('fall') && Math.random() < protOf('fall')) v = 250; l0(v); }; }
// ---------- Comida con efectos (data/items300.js: food.buff = [efecto, segundos]) ----------
// Material médico con F: busca la herida que lo necesita y abre la actividad (no se aplica de golpe)
function medTargetFor(id) {
  for (const p of PARTS) { const L2 = S.pc.parts[p]; for (let i = 0; i < L2.length; i++) { const pr = procsFor(L2[i], p).find(x => (PROCS[x.id].use || []).includes(id) || (PROCS[x.id].tool || []).includes(id)); if (pr) return [pr.id, p, i]; } }
  const pv = Object.keys(PROCS).find(k => PROCS[k].prevent && PROCS[k].use.includes(id)); return pv ? [pv, 'armL', -1] : null;
}
{ const u0 = survUse; survUse = s => { const id = s && s.id, before = id ? invCount(id) : 0;
  if (id && ITEMS[id].medItem && survOn() && ITEMS[id].med !== 'pain' && ITEMS[id].med !== 'antidote' && ITEMS[id].med !== 'kit' && ITEMS[id].med !== 'mana') { pcInit(); const tg = medTargetFor(id); if (tg) { openMedGame(...tg); return true; } if (!ITEMS[id].med) { toast('Ahora no tienes nada que curar con esto'); return true; } }
  const r = u0(s), f = id && ITEMS[id].food;
  if (r && f && f.buff && invCount(id) < before) { const b = S.buffs || (S.buffs = {}), [k, t] = f.buff; b[k] = Math.max(b[k] || 0, t); toast(`✦ ${BUFF_N[k]} durante ${Math.round(t / 60 * 10) / 10} min`); if (k === 'calm') S.pc.pk = Math.max(S.pc.pk || 0, t); }
  return r; }; }
// Usar con F un material médico abre su cura en la ficha (en vez de aplicarlo de golpe)
{ const t0 = treatWith; treatWith = (id, part, wi) => { const w = S.pc.parts[part] && S.pc.parts[part][wi]; if (w && typeof openMedGame === 'function') { const pr = procsFor(w, part).find(x => (PROCS[x.id].use || []).includes(id)); if (pr) { openMedGame(pr.id, part, wi); return; } } t0(id, part, wi); }; }
