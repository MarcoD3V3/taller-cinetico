'use strict';
// =====================================================================================
//  Atributos, críticos, resistencias y efectos de estado (se ven en el árbol de talentos, K).
//  · 9 atributos. La base sale de tus habilidades (y lo que ya te dan no se cuenta dos veces);
//    cada punto EXTRA que ganas con talentos suma:
//      Fuerza +1,5 % cuerpo a cuerpo, +2 de aplomo, +1 de carga · Destreza +1,5 % a distancia, +0,4 % de crítico
//      Poder +2 % a hechizos, +0,4 % de crítico mágico · Espíritu +4 de maná, +2 % de recarga
//      Aguante +4 de aguante, +3 % de recarga, +0,6 de carga · Conocimiento +1,5 % de experiencia, +2 % de daño crítico
//      Constitución +5 de vida · Defensa +0,6 de armadura, +1 % menos control · Vigor +2 % de curación, +0,5 % a cada resistencia
//  · Crítico físico y mágico: 5 % de base; daño crítico ×1,5.
//  · Resistencias (fuego, sangrado, veneno, escarcha, vacío, física y salvaje): como mucho 75 %.
//  · Al golpear: sangrado, quemadura, marca de luz (recibe más daño), veneno, enraizar y debilidad (pega menos).
//  · Combo: golpes seguidos, hasta 5 (+3 % de daño cada uno). Adrenalina: sube al pelear; al llenarse, furia 6 s.
//  · Aplomo: a veces no te mueven ni te congelan. Aturdimiento: a veces aturdes al golpear.
//  · Carga de equipo: lo que pesa tu armadura; por encima del máximo vas más lento.
// =====================================================================================
const ATTR = { str: ['Fuerza', '💪', '#ff7a5a'], dex: ['Destreza', '✋', '#7fd07a'], pow: ['Poder', '⚡', '#c88cff'], spi: ['Espíritu', '✺', '#e0e070'], end: ['Aguante', '🦶', '#7fd07a'], kno: ['Conocimiento', '📘', '#5ab8ff'], con: ['Constitución', '❤', '#ff6a8a'], dfn: ['Defensa', '🛡', '#9ab8d0'], vig: ['Vigor', '💗', '#ffb070'] };
const ATTR_TIP = { str: 'Cada punto extra: +1,5 % de daño cuerpo a cuerpo, +2 de aplomo y +1 de carga', dex: 'Cada punto extra: +1,5 % de daño a distancia y +0,4 % de crítico físico', pow: 'Cada punto extra: +2 % de poder de hechizos y +0,4 % de crítico mágico', spi: 'Cada punto extra: +4 de maná y +2 % de recarga de maná', end: 'Cada punto extra: +4 de aguante, +3 % de recarga y +0,6 de carga', kno: 'Cada punto extra: +1,5 % de experiencia y +2 % de daño crítico', con: 'Cada punto extra: +5 de vida máxima', dfn: 'Cada punto extra: +0,6 de armadura y +1 % de reducción de control', vig: 'Cada punto extra: +2 % de curación y +0,5 % a todas las resistencias' };
const RES_LIST = [['resF', 'Fuego', '🔥', '#ff8a3a'], ['resB', 'Sangrado', '🩸', '#ff5a6a'], ['resP', 'Veneno', '☠', '#8ad84a'], ['resC', 'Escarcha', '❄', '#7ac8ff'], ['resV', 'Vacío', '🌀', '#b07aff'], ['resPh', 'Física', '🪨', '#c8b8a0'], ['resW', 'Salvaje', '🌿', '#5ad8a0']];
const RES_K = RES_LIST.map(r => r[0]), CH_K = ['chBleed', 'chBurn', 'chLight', 'chPoison', 'chRoot', 'chWeak'];
const MAGIC_EL = new Set(['fire', 'frost', 'storm', 'holy', 'void', 'life', 'poison', 'time', 'arcane', 'light', 'shadow', 'nature', 'water', 'wind', 'earth']);
// Base de cada atributo según tus habilidades
const attrBase = () => { const l = lvOf; return { str: 5 + l('combat') + (l('build') >> 1), dex: 3 + l('hunt') + (l('gather') >> 1), pow: 3 + Math.round(l('magic') * 1.5), spi: 3 + l('magic') + (l('surv') >> 1), end: 5 + Math.round(l('fit') * 1.5), kno: 3 + l('craft') + ((l('mining') + l('wood')) >> 2), con: 5 + l('fit') + (l('surv') >> 1), dfn: 2 + (l('combat') >> 1), vig: 5 + l('surv') }; };
// Lo llama charMods (sim/character.js) después de los talentos
function attrApply(m, EQ) {
  const b = k => m[k] || 0;
  m.melee *= 1 + 0.015 * b('str'); m.poise += 2 * b('str'); m.carry += b('str');
  m.ranged *= 1 + 0.015 * b('dex'); m.critP += 0.004 * b('dex');
  m.spell += 0.02 * b('pow'); m.critM += 0.004 * b('pow');
  m.mana += 4 * b('spi'); m.manaRegen *= 1 + 0.02 * b('spi');
  m.stam += 4 * b('end'); m.stamRegen += 0.03 * b('end'); m.carry += 0.6 * b('end');
  m.xp *= 1 + 0.015 * b('kno'); m.critD += 0.02 * b('kno');
  m.hp += 5 * b('con');
  m.def += 0.6 * b('dfn'); m.ccRed += 0.01 * b('dfn');
  m.heal *= 1 + 0.02 * b('vig'); for (const k of RES_K) m[k] += 0.005 * b('vig');
  // La armadura también protege: la que aguanta el fuego y la que abriga
  if (m.fire) m.resF += 0.25; m.resC += Math.min(0.3, (m.warm || 0) * 0.01);
  for (const k of RES_K) m[k] = Math.max(0, Math.min(0.75, m[k])); for (const k of CH_K) m[k] = Math.min(0.5, m[k]);
  m.critP = Math.min(0.6, m.critP); m.critM = Math.min(0.6, m.critM); m.ccRed = Math.min(0.6, m.ccRed);
  m.bleed *= 1 - m.resB;
  // Carga de equipo
  let load = 0; for (const sl in EQ || {}) { const it = EQ[sl] && ITEMS[EQ[sl]]; if (!it) continue; if (it.armor) load += 1.5 + (it.armor.def || 0) * 0.25 + (it.armor.heavy ? 3 : 0); else if (it.gear) load += 0.6; }
  const B = S && S.pc ? attrBase() : { str: 5, end: 5 }; m.load = load; m.loadMax = 30 + m.carry + 0.8 * B.str + 0.5 * B.end;
  if (load > m.loadMax && !m.heavyOk) m.speed *= Math.max(0.7, 1 - (load / m.loadMax - 1) * 0.5);
}
// ---------- Combate ----------
const ATS = { combo: 0, comboT: 0, gainT: 0, adr: 0, idle: 0, fury: 0, pz: 0, chill: 0 };
const atsProc = (f, txt, c) => fxText(f.x + (Math.random() - 0.5) * 12, f.y - f.D.s - 14, txt, c);
{ const d0 = damageFoe; damageFoe = (f, dmg, el, src) => {
  if (!S || !S.pc || !f || f.hp <= 0 || f.inv || f.clone || !(dmg > 0)) return d0(f, dmg, el, src);
  const m = CM(), mag = MAGIC_EL.has(el); let k = 1;
  if (mag) k *= 1 + m.spell;
  k *= 1 + 0.03 * ATS.combo; if (ATS.fury > 0) k *= 1.15; if (f.lightT > 0) k *= f.D.undead ? 1.5 : 1.25;
  const crit = Math.random() < (mag ? m.critM : m.critP); if (crit) { k *= m.critD; fxText(f.x, f.y - f.D.s - 18, '¡Crítico!', '#ffd34a'); }
  if (ATS.gainT <= 0) { ATS.gainT = 0.25; ATS.combo = Math.min(5, ATS.combo + 1); ATS.adr = Math.min(100, ATS.adr + 3); } ATS.comboT = 2.5; ATS.idle = 0;
  d0(f, dmg * k, el, src);
  if (f.hp <= 0) return; const big = typeof bigFoe === 'function' && bigFoe(f), r = () => Math.random();
  if (r() < m.chBleed) { f.bleedT = 4; f.bleedD = Math.max(2, dmg * k * 0.08); atsProc(f, 'sangrado', '#ff5a6a'); }
  if (r() < m.chBurn) { f.burn = Math.max(f.burn || 0, 3); atsProc(f, 'quemado', '#ff9a4a'); }
  if (r() < m.chPoison) { f.poison = Math.max(f.poison || 0, 4); atsProc(f, 'envenenado', '#8ad84a'); }
  if (r() < m.chRoot) { f.root = Math.max(f.root || 0, big ? 0.4 : 1.4); atsProc(f, 'enraizado', '#7fd07a'); }
  if (r() < m.chWeak) { f.weak = 5; atsProc(f, 'debilitado', '#c87aa0'); }
  if (r() < m.chLight) { f.lightT = 5; atsProc(f, 'marca de luz', '#fff6b0'); }
  if (!big && r() < Math.min(0.35, m.stagger / 400)) { f.stun = Math.max(f.stun || 0, 0.35); atsProc(f, 'aturdido', '#f0f05a'); }
}; }
const resFor = (el, m) => el === 'fire' ? m.resF : el === 'frost' ? m.resC : el === 'poison' ? m.resP : el === 'void' || el === 'time' || el === 'shadow' ? m.resV : MAGIC_EL.has(el) ? m.resV * 0.5 : m.resPh;
{ const h0 = hitPlayer; hitPlayer = (dmg, wound, cause, el) => {
  if (!S || !S.pc || !survOn() || P.iframe > 0 || ui.open === 'dead') return h0(dmg, wound, cause, el);
  const m = CM(), px = S.player.x, py = S.player.y;
  if (FOES.some(f => f.weak > 0 && dist(f.x, f.y, px, py) < 4 * T)) dmg *= 0.7; // un enemigo debilitado pega menos
  h0(dmg * (1 - resFor(el, m)), wound, cause, el);
  if (el === 'void' && Math.random() < m.poise / (m.poise + 100)) { S.player.x = px; S.player.y = py; } // aplomo: no te arrastra
  ATS.adr = Math.min(100, ATS.adr + 6); ATS.idle = 0;
}; }
// Quemaduras y mordiscos de animales salvajes
{ const h0 = hurt; hurt = (t, part, mult = 1, cause = '') => { if (S && S.pc) { const m = CM(); if (t === 'burn') mult *= 1 - m.resF; if (/^Atacado por/.test(cause || '')) mult *= 1 - m.resW; } return h0(t, part, mult, cause); }; }
function atsTick(dt) {
  const pc = S.pc; if (!pc || !survOn()) return; const m = CM();
  ATS.gainT -= dt; if ((ATS.comboT -= dt) <= 0) ATS.combo = 0;
  if ((ATS.idle += dt) > 4) ATS.adr = Math.max(0, ATS.adr - 6 * dt);
  if (ATS.fury > 0) ATS.fury -= dt; else if (ATS.adr >= 100) { ATS.adr = 0; ATS.fury = 6; const b = S.buffs || (S.buffs = {}); b.swift = Math.max(b.swift || 0, 6); toast('🔥 ¡Furia! +15 % de daño y más velocidad durante 6 s', true); tone(110, 0.3, 'sawtooth', 0.05, 2); screenFlash('#ff6a2a', 0.12); }
  // Veneno y frío: la resistencia frena lo que entra (venga de donde venga)
  if (pc.poison > ATS.pz) pc.poison = ATS.pz + (pc.poison - ATS.pz) * (1 - m.resP); ATS.pz = pc.poison;
  const ch = P.chill || 0; if (ch > ATS.chill + 0.05) { P.chill = Math.random() < m.poise / (m.poise + 400) ? ATS.chill : ATS.chill + (ch - ATS.chill) * (1 - m.resC) * (1 - m.ccRed); } ATS.chill = P.chill || 0;
  if (pc.rest > 0.8 && m.stamRegen > 0) pc.stam = Math.min(maxStam(), pc.stam + 14 * dt * m.stamRegen);
  // Sangrado, debilidad y marca de luz en los enemigos
  for (const f of FOES.slice()) { if (f.weak > 0) f.weak -= dt; if (f.lightT > 0) { f.lightT -= dt; if (Math.random() < dt * 4) fxAdd({ x: f.x + (Math.random() - 0.5) * f.D.s, y: f.y - f.D.s * Math.random(), vx: 0, vy: -20, life: 0.5, t: 0, size: 1.6, col: '#fff6b0', glow: 1, drag: 1 }); }
    if (f.bleedT > 0 && f.hp > 0) { f.bleedT -= dt; f.hp -= f.bleedD * dt; if (Math.random() < dt * 5) fxAdd({ x: f.x + (Math.random() - 0.5) * f.D.s, y: f.y, vx: 0, vy: 15, life: 0.5, t: 0, size: 1.5, col: '#c02030', drag: 1 }); if (f.hp <= 0) killFoe(f); } }
}
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); if (S) atsTick(fdt); }; }
// Hoja de estadísticas para el árbol de talentos
function statSheet() {
  const m = CM(), pc = S.pc, B = attrBase(), s = S.inv[S.sel], pr = s && typeof weaponProfile === 'function' ? weaponProfile(s.id) : null;
  const wd = (pr ? pr.dmg * (pr.kind === 'melee' ? m.melee : m.ranged) : 3 * m.melee) * (1 + 0.05 * lvOf('combat'));
  let ess = 0, need = 0; for (const k in SKILLS) { const lv = pc.lv[k] || 0, xp = pc.xp[k] || 0; ess += Math.floor(xp); for (let i = 0; i < lv; i++) ess += xpNeed(i); if (lv < MAX_LV) { const n = Math.ceil(xpNeed(lv) - xp); if (!need || n < need) need = n; } }
  return { m, B, wd, ess, need, stamRegen: 14 * (1 + m.stamRegen), combo: ATS.combo, adr: typeof PIL !== 'undefined' && PIL.adr > 0 ? 100 : ATS.adr, fury: ATS.fury > 0, spirit: (B.spi + (m.spi || 0)) * 5 + m.mana * 0.5 };
}
