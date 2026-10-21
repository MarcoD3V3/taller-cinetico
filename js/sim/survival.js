'use strict';
// =====================================================================================
//  Supervivencia: vida, hambre, sed, energía (sueño), aguante, maná y temperatura,
//  cuerpo por partes con heridas (al estilo Project Zomboid) y habilidades con niveles.
//  Calibrado (dificultad normal, sin habilidades):
//   hambre llena → vacía en 30 min · sed en 20 min · energía en 24 min despierto
//   correr agota el aguante en ~11 s · la vida se regenera de 0 a 100 en ~14 min
// =====================================================================================
const PARTS = ['head', 'torso', 'armL', 'armR', 'handL', 'handR', 'legL', 'legR', 'footL', 'footR'];
const PART_N = { head: 'Cabeza', torso: 'Torso', armL: 'Brazo izquierdo', armR: 'Brazo derecho', handL: 'Mano izquierda', handR: 'Mano derecha', legL: 'Pierna izquierda', legR: 'Pierna derecha', footL: 'Pie izquierdo', footR: 'Pie derecho' };
// Dónde golpean los animales (los bajos muerden piernas y pies)
const HIT_W = [['head', 8], ['torso', 22], ['armL', 12], ['armR', 12], ['handL', 8], ['handR', 8], ['legL', 12], ['legR', 12], ['footL', 3], ['footR', 3]];
// heal: segundos en curarse · bleed: vida/s mientras sangra · pain: dolor · dmg: daño · inf: probabilidad de infección
const WT = {
  bruise: { n: 'Contusión', i: '●', heal: 60, bleed: 0, pain: 6, dmg: 4 },
  scratch: { n: 'Rasguño', i: '≈', heal: 90, bleed: 0.02, pain: 8, dmg: 5 },
  cut: { n: 'Corte', i: '/', heal: 240, bleed: 0.1, pain: 18, dmg: 10 },
  bite: { n: 'Mordedura', i: 'ʌ', heal: 300, bleed: 0.12, pain: 25, dmg: 14, inf: 0.3 },
  sting: { n: 'Picadura', i: '•', heal: 120, bleed: 0, pain: 12, dmg: 4, poison: 25 },
  burn: { n: 'Quemadura', i: '♨', heal: 300, bleed: 0, pain: 28, dmg: 12 },
  fracture: { n: 'Fractura', i: '✕', heal: 900, bleed: 0, pain: 45, dmg: 20 },
};
const SKILLS = {
  mining: ['Minería', '⛏', 'Picas roca, menas y suelo un 6 % más rápido por nivel.'],
  wood: ['Tala', '🪓', 'Talas árboles un 6 % más rápido por nivel.'],
  gather: ['Recolección', '🌿', 'Cosechas plantas más rápido y con +3 % de botín doble por nivel.'],
  hunt: ['Caza', '🏹', 'Cazas un 6 % más rápido y desde más lejos por nivel.'],
  build: ['Construcción', '🧱', 'Trabajar te cansa un 4 % menos por nivel.'],
  craft: ['Ingeniería', '⚙', '3 % por nivel de recuperar el núcleo al fabricar en el bolsillo.'],
  magic: ['Magia', '✦', '+10 de maná máximo, más regeneración y hechizos más baratos.'],
  surv: ['Supervivencia', '🔥', 'Hambre y sed un 3 % más lentas; heridas un 5 % más rápidas.'],
  combat: ['Combate', '⚔', '+5 % de daño con armas y hechizos por nivel.'],
  fit: ['Forma física', '🏃', '+5 de aguante, +2 de vida máxima y correr cansa menos.'],
};
const MAX_LV = 10, xpNeed = l => Math.round(40 * Math.pow(l + 1, 1.7));
// Animales que atacan: [tipo de herida, daño, venenoso]
const HOSTILE = { wolf: ['bite', 1], frostwolf: ['bite', 1.3], polarbear: ['cut', 1.6], drake: ['burn', 1.4], basilisk: ['bite', 1.1, 1], scorpion: ['sting', 1], snake: ['sting', 1.1], spider: ['bite', 0.8, 1], shadowcat: ['scratch', 1.4], golem: ['fracture', 0.9] };

const survOn = () => !!S && !S.sandbox && S.surv !== false;
function newPC() { const parts = {}; for (const p of PARTS) parts[p] = []; return { hp: 100, food: 100, water: 100, energy: 100, stam: 100, mana: 50, temp: 37, poison: 0, pk: 0, parts, xp: {}, lv: {}, deaths: 0, alive: 0, lock: 0, rest: 0, cause: '' }; }
function pcInit() {
  if (!S.pc) {
    S.pc = newPC();
    // Las partidas antiguas reciben un pico de madera: ahora la roca necesita herramienta
  }
  return S.pc;
}
const lvOf = k => (S.pc && S.pc.lv[k]) || 0;
const maxHp = () => 100 + 2 * lvOf('fit') + CM().hp, maxStam = () => 100 + 5 * lvOf('fit') + CM().stam, maxMana = () => 50 + 10 * lvOf('magic') + CM().mana;
// ---------- Cuerpo ----------
// Velocidad de curación de una herida (sim/medical.js la amplía con los pasos de cada cura)
let woundRate = w => (w.b ? 2 : 1) * (w.inf ? 0.3 : 1);
const wFrac = w => Math.max(0, w.left / WT[w.t].heal);
function partHp(p) { let h = 100; for (const w of S.pc.parts[p]) h -= w.d * wFrac(w) * 1.6; return clamp(h, 0, 100); }
function painOf() { let s = 0; for (const p of PARTS) for (const w of S.pc.parts[p]) s += WT[w.t].pain * wFrac(w) * (w.sp ? 0.5 : 1); return s * (S.pc.pk > 0 ? 0.35 : 1) * CM().pain; }
function bleedOf() { let s = 0; for (const p of PARTS) for (const w of S.pc.parts[p]) if (!w.b && wFrac(w) > 0.75) s += WT[w.t].bleed; return s * CM().bleed; }
const hasWound = t => PARTS.some(p => S.pc.parts[p].some(w => w.t === t));
const infected = () => PARTS.some(p => S.pc.parts[p].some(w => w.inf));
function legFactor() {
  const avg = (partHp('legL') + partHp('legR') + partHp('footL') + partHp('footR')) / 400;
  let f = 0.55 + 0.45 * avg;
  for (const p of ['legL', 'legR']) for (const w of S.pc.parts[p]) if (w.t === 'fracture') f *= w.sp ? 0.85 : 0.6;
  return f;
}
const armFactor = () => 0.5 + 0.5 * (partHp('armL') + partHp('armR') + partHp('handL') + partHp('handR')) / 400;
// Multiplicadores que usa el resto del juego
function speedMul() {
  if (!survOn()) return 1; const pc = pcInit(), pain = painOf();
  return legFactor() * (pain > 60 ? 0.75 : pain > 30 ? 0.88 : 1) * (pc.energy < 10 ? 0.75 : 1) * (pc.temp < 35 ? 0.85 : 1);
}
function workMul() {
  if (!survOn()) return 1; const pc = pcInit();
  return CM().work * (daylight() < 0.3 && !CM().night ? CM().nightWork : 1) * armFactor() * (pc.energy < 25 ? 0.8 : 1) * (painOf() > 50 ? 0.8 : 1) * (pc.stam < 5 ? 0.7 : 1);
}
const canSprint = () => !survOn() || (pcInit().stam > 0 && !S.pc.lock);
// ---------- Daño ----------
function pickPart() { let r = Math.random() * 100; for (const [p, w] of HIT_W) { r -= w; if (r <= 0) return p; } return 'torso'; }
function hurt(t, part, mult = 1, cause = '') {
  if (!survOn()) return; const pc = pcInit(), w = WT[t]; part = part || pickPart();
  // Rasgos y armadura de esa parte del cuerpo
  const pd = partDef(part), cm = CM();
  const d = w.dmg * mult * diff() * cm.wound * (1 - pd / (pd + 12)) * (t === 'burn' && cm.fire ? 0.4 : 1), list = pc.parts[part];
  if (list.length >= 6) list.shift();
  list.push({ t, left: w.heal, d, b: 0, sp: 0, inf: Math.random() < (w.inf || 0) * (t === 'bite' ? 1 : 0) ? 1 : 0 });
  pc.hp -= d * 0.6; if (w.poison) pc.poison = Math.max(pc.poison, w.poison);
  if (cause) pc.cause = cause;
  hurtFx(Math.min(1, d / 15));
}
function animalAttack(a, hz) {
  const sp = SPECIES[a.sp], [t, m, venom] = hz;
  if (Math.random() < CM().block) { fxText(S.player.x, S.player.y - 22, '¡Bloqueado!', '#9ad8ff'); return; }
  const part = sp.s < 7 ? ['legL', 'legR', 'footL', 'footR'][(Math.random() * 4) | 0] : pickPart();
  hurt(t, part, m * (0.6 + sp.s * 0.06), 'Atacado por: ' + sp.n);
  if (venom) S.pc.poison = Math.max(S.pc.poison, 15);
}
// ---------- XP y niveles ----------
function gainXP(k, n) {
  if (!survOn() || !n) return; const pc = pcInit(), lv = pc.lv[k] || 0; if (lv >= MAX_LV) return;
  n *= CM().xp * (k === 'craft' || k === 'build' ? CM().xpCraft : 1);
  pc.xp[k] = (pc.xp[k] || 0) + n;
  if (pc.xp[k] >= xpNeed(lv)) { pc.xp[k] -= xpNeed(lv); pc.lv[k] = lv + 1; toast(`${SKILLS[k][1]} ${SKILLS[k][0]} sube a nivel ${lv + 1}`, true); vitalsDirty = true; }
}
const charLevel = () => 1 + Object.values(S.pc ? S.pc.lv : {}).reduce((s, v) => s + v, 0);
// ---------- Comer, beber y curarse ----------
function survUse(s) {
  const it = ITEMS[s.id]; if (!it.food && !it.med) return false;
  if (!survOn()) { toast('La supervivencia está desactivada en este mundo'); return true; }
  const pc = pcInit();
  if (it.food) {
    const f = it.food;
    if ((f.f || 0) > 0 && pc.food > 97 && !(f.w > 0 && pc.water < 95)) { toastErr('No tienes hambre'); return true; }
    pc.food = Math.min(100, pc.food + (f.f || 0)); pc.water = Math.min(100, pc.water + (f.w || 0)); pc.hp = Math.min(maxHp(), pc.hp + (f.hp || 0));
    if (f.raw && !CM().rawSafe && Math.random() < f.raw) { pc.poison = Math.max(pc.poison, 12); pc.cause = 'Intoxicación'; toast('Te ha sentado mal: estás intoxicado'); }
    if (f.back) invAdd(f.back, 1);
    gainXP('surv', 1);
  } else if (!treat(it.med, null)) return true;
  if (--s.n <= 0) S.inv[S.inv.indexOf(s)] = null; invVersion++;
  return true;
}
// Aplica una cura. part = null → la herida que más la necesita. Devuelve false si no hacía falta.
function treat(med, part, wi) {
  const pc = S.pc, all = [];
  for (const p of PARTS) if (!part || p === part) pc.parts[p].forEach((w, i) => { if (wi === undefined || wi === i) all.push([p, w]); });
  const best = f => all.filter(([, w]) => f(w)).sort((a, b) => WT[b[1].t].bleed - WT[a[1].t].bleed || b[1].d - a[1].d)[0];
  let ok = false;
  if (med === 'bandage' || med === 'kit') { const x = best(w => !w.b && w.t !== 'fracture' && w.t !== 'bruise'); if (x) { x[1].b = 1; ok = true; } if (med === 'kit') for (const [, w] of all) if (w.t !== 'fracture' && w.t !== 'bruise') { w.b = 1; ok = true; } }
  if (med === 'splint') { const x = best(w => w.t === 'fracture' && !w.sp); if (x) { x[1].sp = 1; ok = true; } }
  if (med === 'disinfect' || med === 'kit') { for (const [, w] of all) if (w.inf || (w.t === 'bite' && !w.dis)) { w.inf = 0; w.dis = 1; ok = true; } }
  if (med === 'pain' || med === 'kit') { if (painOf() > 1 || med === 'pain') { pc.pk = 180; ok = true; } }
  if (med === 'antidote') { if (pc.poison > 0) { pc.poison = 0; ok = true; } }
  if (med === 'mana') { if (pc.mana < maxMana()) { pc.mana = Math.min(maxMana(), pc.mana + 60); ok = true; } }
  if (med === 'holy') { for (const [, w] of all) w.inf = 0; pc.hp = Math.min(maxHp(), pc.hp + 20); ok = true; }
  if (!ok) { toastErr('No lo necesitas ahora'); return false; }
  if (S.char && S.char.prof === 'medic') for (const [, w] of all) if (w.b) w.left *= 0.7; // la médica cura mejor
  gainXP('surv', 4); vitalsDirty = true; return true;
}
// Usa una cura del inventario sobre una herida concreta (desde la ficha del personaje)
function treatWith(id, part, wi) {
  const i = S.inv.findIndex(s => s && s.id === id); if (i < 0) { toastErr('No tienes ' + ITEMS[id].n); return; }
  if (!treat(ITEMS[id].med, part, wi)) return;
  if (--S.inv[i].n <= 0) S.inv[i] = null; invVersion++;
}
// Beber de un río o lago (F sin bloque delante); con un frasco en la mano, lo llena
function drinkAt(x, y) {
  const g = GI[gnd(x, y)]; if (!g.liquid || g.liquid !== 'water') return false;
  if (Math.hypot((x + 0.5) * T - S.player.x, (y + 0.5) * T - S.player.y) > 2.6 * T) { toastErr('Acércate al agua'); return true; }
  const s = S.inv[S.sel];
  if (s && s.id === 'vial') { if (--s.n <= 0) S.inv[S.sel] = null; invAdd('waterBottle', 1); invVersion++; toast('Has llenado una botella de agua'); return true; }
  if (!survOn()) return false;
  const pc = pcInit(); if (pc.water > 97) { toastErr('No tienes sed'); return true; }
  pc.water = Math.min(100, pc.water + 25);
  if (gnd(x, y) === G.SWAMPWATER && !CM().rawSafe && Math.random() < 0.35) { pc.poison = Math.max(pc.poison, 10); pc.cause = 'Agua de pantano'; toast('El agua del pantano te ha sentado mal'); }
  return true;
}
// ---------- Dormir ----------
function sleepIn(b) {
  if (!survOn()) { toast('La supervivencia está desactivada en este mundo'); return; }
  const pc = pcInit();
  if (ANIMALS.some(a => a.ag)) { toastErr('No puedes dormir con enemigos cerca'); return; }
  pc.bed = { x: b.x, y: b.y };
  if (pc.energy > 80 && daylight() > 0.5) { toast('Punto de reaparición guardado. No tienes sueño todavía.'); return; }
  const dl = S.gen.dayLen || DAY_LEN, base = Math.floor(S.time / dl) * dl;
  let to = base + 0.22 * dl; if (to <= S.time + 5) to += dl;
  const slept = daylight() > 0.5 ? dl * 0.2 : to - S.time;
  ui.open = 'sleep'; $('sleepFx').hidden = false; $('sleepFx').classList.add('on');
  setTimeout(() => {
    if (daylight() <= 0.5) S.time = to; else S.time += slept;
    pc.energy = 100; pc.stam = maxStam(); pc.food = Math.max(0, pc.food - slept * 0.012); pc.water = Math.max(0, pc.water - slept * 0.018);
    pc.hp = Math.min(maxHp(), pc.hp + slept * 0.05);
    for (const p of PARTS) for (const w of pc.parts[p]) w.left -= slept * 0.5;
    gainXP('surv', 10); $('sleepFx').classList.remove('on');
    setTimeout(() => { $('sleepFx').hidden = true; if (ui.open === 'sleep') ui.open = null; toast('Has dormido. Buenos días.'); }, 600);
  }, 1800);
}
// ---------- Muerte ----------
function die() {
  const pc = S.pc; ui.open = 'dead';
  $('deathCause').textContent = pc.cause || (pc.food <= 0 ? 'Hambre' : pc.water <= 0 ? 'Sed' : pc.temp < 35 ? 'Hipotermia' : 'Heridas');
  $('deathStats').textContent = `Sobreviviste ${Math.floor(pc.alive / 60)} min · nivel ${charLevel()}` + (diff() > 1 ? ' · Pierdes lo que llevas en la mochila (la barra rápida se salva)' : ' · Conservas tu inventario');
  $('death').hidden = false;
}
function respawn() {
  const pc = S.pc, bed = pc.bed && at(pc.bed.x, pc.bed.y), core = blocks.find(b => b.type === 'core'), to = bed && bed.type === 'bed' ? bed : core;
  if (to) { S.player.x = (to.x + 0.5) * T; S.player.y = (to.y + 1.6) * T; view.x = S.player.x; view.y = S.player.y; }
  if (diff() > 1) { for (let i = 9; i < INV_N; i++) S.inv[i] = null; invVersion++; }
  for (const p of PARTS) pc.parts[p] = [];
  if (BOSS) { FOES.splice(FOES.indexOf(BOSS), 1); bossEnd(); }
  for (const f of FOES.slice()) if (dist(f.x, f.y, S.player.x, S.player.y) < 20 * T) FOES.splice(FOES.indexOf(f), 1);
  Object.assign(pc, { hp: maxHp() * 0.6, food: Math.max(pc.food, 50), water: Math.max(pc.water, 50), energy: Math.max(pc.energy, 60), stam: maxStam(), poison: 0, temp: 37, alive: 0, cause: '' });
  pc.deaths++; $('death').hidden = true; ui.open = null; vitalsDirty = true;
}
// ---------- Ambiente ----------
let _envT = 0, _amb = 20, _warm = false, _hot = false;
function envCheck() {
  const px = Math.floor(S.player.x / T), py = Math.floor(S.player.y / T), c = climate(px, py, S.gen, _cl);
  _amb = -20 + c[1] * 70 - (1 - daylight()) * 5;
  _warm = false;
  for (let dy = -3; dy <= 3 && !_warm; dy++) for (let dx = -3; dx <= 3; dx++) {
    const b = at(px + dx, py + dy), g = GI[gnd(px + dx, py + dy)];
    if (g.liquid === 'lava' || (b && (b.type === 'furnace' || b.type === 'alloySmelter' || b.type === 'blastFurnace' || b.type === 'boiler' || b.type === 'campfire' || BD[b.type].heat || (typeof trFx === 'function' && trFx(b, 'warmB', 0))))) { _warm = true; break; }
  }
  _hot = _amb > 33;
  // Pisar tierra tóxica o cactus
  const g = gnd(px, py);
  if (g === G.TOXIC && Math.random() < 0.25) { S.pc.poison = Math.max(S.pc.poison, 6); S.pc.cause = 'Tierra tóxica'; }
  if ((g === G.CACTUS || g === G.REDCACTUS) && Math.random() < 0.3) hurt('thorn', Math.random() < 0.5 ? 'footL' : 'footR', 0.6, 'Espinas de cactus');
}
let ambient = () => _amb + CM().warm + (_warm ? 20 : 0);
// ---------- Bucle (llamado cada fotograma con el juego en marcha) ----------
let vitalsDirty = true, _sprintXP = 0;
function survTick(dt, moving, sprinting) {
  if (!survOn()) return;
  const pc = pcInit(), d = diff(), sv = 1 - 0.03 * lvOf('surv'), fit = lvOf('fit');
  pc.alive += dt;
  _envT -= dt; if (_envT <= 0) { _envT = 1; envCheck(); if (Math.random() < 1 / 60) gainXP('surv', 1); }
  const amb = ambient(), cold = amb < 5, hot = _hot && !_warm;
  // Necesidades
  const cm = CM();
  pc.food = Math.max(0, pc.food - 0.055 * dt * sv * d * cm.hunger * (sprinting ? 1.6 : 1) * (cold ? 1.3 : 1));
  pc.water = Math.max(0, pc.water - 0.083 * dt * sv * d * cm.thirst * (sprinting ? 1.5 : 1) * (hot ? 1.7 : 1));
  pc.energy = Math.max(0, pc.energy - 0.07 * dt * d * cm.energy * (sprinting ? 1.4 : 1));
  // Aguante: correr lo gasta; si llega a 0 no puedes correr hasta recuperar 25
  if (sprinting) { pc.stam -= 9 * dt * (1 - 0.03 * fit) * cm.sprintCost; pc.rest = 0; _sprintXP += dt; if (_sprintXP > 2) { _sprintXP = 0; gainXP('fit', 1); } }
  else { pc.rest += dt; if (pc.rest > 0.8) pc.stam += 14 * dt * (pc.energy < 10 ? 0.5 : 1) * (pc.food < 10 ? 0.5 : 1); }
  pc.stam = clamp(pc.stam, 0, maxStam());
  if (pc.stam <= 0) pc.lock = 1; else if (pc.stam > 25) pc.lock = 0;
  pc.mana = Math.min(maxMana(), pc.mana + (0.8 + 0.15 * lvOf('magic')) * cm.manaRegen * dt);
  if (pc.pk > 0) pc.pk -= dt;
  // Temperatura del cuerpo
  if (cold) pc.temp -= (5 - amb) * 0.0012 * dt; else pc.temp += (37 - pc.temp) * 0.05 * dt;
  pc.temp = clamp(pc.temp, 30, 37.5);
  // Heridas
  const heal = (1 + 0.05 * lvOf('surv')) * cm.heal * (pc.food > 30 && pc.water > 30 ? 1 : 0.4);
  let inf = 0;
  for (const p of PARTS) { const L2 = pc.parts[p]; for (let i = L2.length - 1; i >= 0; i--) { const w = L2[i]; if (w.inf) inf++; w.left -= dt * heal * woundRate(w); if (w.left <= 0) { L2.splice(i, 1); vitalsDirty = true; } } }
  // Vida
  const bleed = bleedOf();
  let dh = 0;
  if (pc.food > 40 && pc.water > 40 && !bleed && pc.poison <= 0 && pc.temp >= 35.5 && !inf) dh += (0.12 + 0.02 * lvOf('surv')) * (pc.energy > 20 ? 1 : 0.5);
  if (pc.food <= 0) { dh -= 0.25; pc.cause = 'Hambre'; }
  if (pc.water <= 0) { dh -= 0.4; pc.cause = 'Sed'; }
  if (bleed) { dh -= bleed; pc.cause = pc.cause || 'Desangrado'; }
  if (pc.poison > 0) { dh -= 0.3 * cm.sick; pc.poison -= dt; }
  if (inf) dh -= 0.05 * inf * cm.sick;
  if (pc.temp < 35) { dh -= 0.12; pc.cause = 'Hipotermia'; }
  if (pc.energy <= 0) dh -= 0.05;
  pc.hp = Math.min(maxHp(), pc.hp + dh * dt);
  if (pc.hp <= 0) { pc.hp = 0; die(); }
}
// ---------- Fauna hostil (llamado desde faunaTick) ----------
function hostileStep(a, sp, d2, dt) {
  const hz = HOSTILE[a.sp]; if (!hz || !survOn() || ui.open === 'dead') { a.ag = 0; return false; }
  const dist = Math.sqrt(d2), aggro = (daylight() < 0.3 ? 8 : 5) * T;
  if (dist < aggro || (a.ag && dist < 12 * T)) {
    a.ag = 1; a.tx = S.player.x; a.ty = S.player.y; a.rest = false; a.t = 1;
    if (dist < sp.s + 16) { a.cd = (a.cd || 0.6) - dt; if (a.cd <= 0) { a.cd = 2; animalAttack(a, hz); } return 'hold'; }
    return 'chase';
  }
  a.ag = 0; return false;
}
