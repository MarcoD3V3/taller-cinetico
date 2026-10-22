'use strict';
// Personaje: rasgos y profesión → modificadores; equipo (armadura) → defensa y aspecto.
// Los modificadores se calculan una vez y se guardan hasta que cambian los rasgos o el equipo.
const EQ_SLOTS = ['head', 'chest', 'legs', 'feet', 'back', 'hands', 'shield', 'ring1', 'ring2', 'acc1', 'acc2', 'acc3', 'acc4', 'totem', 'costume', 'rune1', 'rune2', 'rune3', 'rune4', 'rune5', 'rune6'];
const EQ_N = { head: 'Cabeza', chest: 'Pecho', legs: 'Piernas', feet: 'Pies', back: 'Capa', hands: 'Guantes', shield: 'Escudo', ring: 'Anillo', acc: 'Accesorio', totem: 'Tótem', costume: 'Disfraz', rune: 'Runa' };
const slotType = k => k.replace(/\d$/, '');
// ¿Este objeto va en esta ranura?
function slotAccepts(k, id) {
  const it = ITEMS[id]; if (!it) return false; const t = slotType(k);
  if (it.armor) return it.armor.slot === t;
  return !!(it.gear && it.gear.slot === t);
}
function charData() {
  if (!S.char) S.char = { name: 'Superviviente', look: { ...DEFAULT_LOOK }, prof: 'vagabond', traits: [], made: false };
  if (!S.equip) S.equip = {};
  for (const k of EQ_SLOTS) if (!(k in S.equip)) S.equip[k] = null;
  while (S.inv.length < INV_N) S.inv.push(null); // partidas de antes: 36 / 54 → 72 huecos
  return S.char;
}
const hasTrait = t => !!(S && S.char && S.char.traits.includes(t));
let _cm = null, _cmKey = '', _cmEq = null, _cmCh = null, _cmProf = null, _cmTr = null, _cmTrN = -1, _cmEnd = null, _cmRM = null; const _cmVals = [];
function _cmSnap(ch, EQ) { _cmEq = EQ; _cmCh = ch; _cmProf = ch.prof; _cmTr = ch.traits; _cmTrN = ch.traits.length; _cmEnd = S.end && S.end.choice; _cmRM = lookSig(ch.look); for (let i = 0; i < EQ_SLOTS.length; i++) _cmVals[i] = EQ[EQ_SLOTS[i]]; }
// Multiplicadores neutros (1 o 0) y lo que aportan los rasgos y la armadura
function charMods(eqOver) {
  const ch = charData(), EQ = eqOver || S.equip;
  // Vía rápida: comparar hueco a hueco sin construir cadenas (se llama muchas veces por frame)
  if (!eqOver && _cm && _cmEq === EQ && _cmCh === ch && _cmProf === ch.prof && _cmTr === ch.traits && _cmTrN === ch.traits.length && _cmEnd === (S.end && S.end.choice) && _cmRM === lookSig(ch.look)) { let same = true; for (let i = 0; i < EQ_SLOTS.length; i++) if (_cmVals[i] !== EQ[EQ_SLOTS[i]]) { same = false; break; } if (same) return _cm; }
  const key = ch.traits.join() + '|' + ch.prof + '|' + lookSig(ch.look) + '|' + Object.values(EQ).join() + '|' + (S.end && S.end.choice);
  if (!eqOver && _cm && key === _cmKey) { _cmSnap(ch, EQ); return _cm; }
  const m = { melee: 1, ranged: 1, work: 1, hp: 0, stam: 0, sprintCost: 1, speed: 1, dash: 1, reach: 1, hunger: 1, thirst: 1, wound: 1, heal: 1, mana: 0, manaRegen: 1, mine: 1, wood: 1, hunt: 1, tame: 1, craftKeep: 0, xp: 1, xpCraft: 1, detect: 1, warm: 0, rawSafe: 0, luck: 0, night: 0, energy: 1, pain: 1, bleed: 1, sick: 1, foes: 1, price: 1, petHp: 1, nightWork: 1, heavyOk: 0, zoomOut: 0, def: 0, fire: 0, heavy: 0, block: 0, gdef: 0 };
  const mul = new Set(['melee', 'ranged', 'work', 'sprintCost', 'speed', 'dash', 'reach', 'hunger', 'thirst', 'wound', 'heal', 'manaRegen', 'mine', 'wood', 'hunt', 'tame', 'xp', 'xpCraft', 'detect', 'energy', 'pain', 'bleed', 'sick', 'foes', 'price', 'petHp', 'nightWork']);
  for (const t of ch.traits) { const tr = TRAITS[t]; if (!tr) continue; for (const k in tr.m) { if (mul.has(k)) m[k] *= tr.m[k]; else m[k] += tr.m[k]; } }
  const pf = PROFS[ch.prof]; if (pf && pf.price) m.price *= pf.price;
  // Raza y personalidad (data/races.js)
  for (const src of lookMods(ch.look)) for (const k in src.m) { if (mul.has(k)) m[k] *= src.m[k]; else m[k] += src.m[k]; }
  // Equipo: capas, guantes, escudo, anillos, accesorios (uno de cada tipo), tótem, disfraz y runas
  const seenAcc = new Set();
  for (const sl in EQ) { const g = EQ[sl] && ITEMS[EQ[sl]] && ITEMS[EQ[sl]].gear; if (!g) continue;
    if (g.slot === 'acc') { if (seenAcc.has(EQ[sl])) continue; seenAcc.add(EQ[sl]); }
    if (g.def) { m.def += g.def; m.gdef += g.def; } if (g.block) m.block = Math.min(0.5, m.block + g.block);
    if (g.mods) for (const k in g.mods) { if (mul.has(k)) m[k] *= g.mods[k]; else m[k] += g.mods[k]; } }
  for (const sl in EQ) { const a = EQ[sl] && ITEMS[EQ[sl]] && ITEMS[EQ[sl]].armor; if (!a) continue; m.def += a.def; m.warm += a.warm || 0; m.fire = m.fire || a.fire || 0; if (a.heavy) m.heavy++; if (a.speed) m.speed *= 1 + a.speed; }
  if (m.heavy && !m.heavyOk) m.speed *= 1 - 0.02 * m.heavy;
  // Bendición del final elegido
  const ec = S.end && S.end.choice;
  if (ec === 'revive') { m.hp += 40; m.work *= 1.15; m.speed *= 1.05; } else if (ec === 'free') { m.mana += 60; m.luck += 0.15; m.xp *= 1.25; }
  if (eqOver) return m;
  _cm = m; _cmKey = key; _cmSnap(ch, EQ); return m;
}
const CM = () => (S ? charMods() : { melee: 1 });
// Defensa de una parte del cuerpo: reduce el daño de esa herida
const PART_SLOT = { head: 'head', torso: 'chest', armL: 'chest', armR: 'chest', handL: 'chest', handR: 'chest', legL: 'legs', legR: 'legs', footL: 'feet', footR: 'feet' };
function partDef(part) { const id = S.equip && S.equip[PART_SLOT[part]], a = id && ITEMS[id] && ITEMS[id].armor, h = S.equip && S.equip.hands && ITEMS[S.equip.hands].gear; return (a ? a.def : 0) + ((part === 'handL' || part === 'handR') && h && h.def ? h.def * 2 : 0) + CM().gdef / 3; }
// ---------- Equipo ----------
function equipItem(id, from) {
  const it = ITEMS[id]; if (!it || !(it.armor || it.gear)) return false; charData();
  const cand = EQ_SLOTS.filter(k => slotAccepts(k, id)); if (!cand.length) return false;
  const sl = cand.find(k => !S.equip[k]) || cand[0], old = S.equip[sl]; S.equip[sl] = id;
  if (from !== 'held') invTake(id, 1);
  if (old) invAdd(old, 1);
  invVersion++; toast(`Te pones: ${it.n}`); return true;
}
function unequip(sl) { const id = S.equip[sl]; if (!id) return; if (invAdd(id, 1) > 0) { toastErr('Inventario lleno'); return; } S.equip[sl] = null; invVersion++; }
// ---------- Creación ----------
function traitPoints(prof, traits) { let p = (PROFS[prof] || PROFS.vagabond).pts; for (const t of traits) p -= TRAITS[t].c; return p; }
function applyCharacter(ch) {
  S.char = { ...ch, made: true }; charData(); const pc = pcInit(), pf = PROFS[ch.prof];
  for (const k in pf.sk) { pc.lv[k] = Math.max(pc.lv[k] || 0, pf.sk[k]); }
  for (const [id, n] of pf.kit) { if (ITEMS[id] && ITEMS[id].armor && !S.equip[ITEMS[id].armor.slot]) S.equip[ITEMS[id].armor.slot] = id; else invAdd(id, n); }
  for (const [id, n] of bgOf(ch.look).kit) if (ITEMS[id]) invAdd(id, n); // objetos del trasfondo
  pc.hp = maxHp(); pc.stam = maxStam(); pc.mana = maxMana(); _cmKey = ''; invVersion++;
}
// NPC con aspecto propio (generado a partir de su tipo)
const _npcLook = {};
function npcLook(type) {
  if (_npcLook[type]) return _npcLook[type];
  let h = 0; for (const ch of type) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const r = n => { h = (h * 1103515245 + 12345) >>> 0; return (h >>> 8) % n; };
  const N = NPCS[type], ci = LOOK.cloth.indexOf(N.c);
  return (_npcLook[type] = { look: { skin: r(6), hair: r(9), eyes: r(6), hairStyle: r(9), beard: r(5) > 2 ? r(5) : 0, body: r(3), shirt: N.c, pants: r(12), shoes: 9 }, equip: type === 'guard' ? { head: 'ironHelmet', chest: 'ironChest' } : type === 'smith' ? { chest: 'leatherChest' } : {} });
}
