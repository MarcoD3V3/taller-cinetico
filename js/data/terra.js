'use strict';
// =====================================================================================
//  Arsenal del Gran Taller (estilo Terraria): 312 objetos nuevos, cada familia de Común a
//  Legendario. Dentro de una familia cada objeto es mejor que el anterior, o igual de fuerte
//  pero distinto (otro elemento, más rápido, más alcance, perfora, se cura…).
//    40 espadas · 15 espadas ancestrales · 10 pistolas · 10 bumeranes · 10 ganchos · 20 yoyós
//    15 látigos · 10 ballestas · 15 arcos · 20 varitas · 15 explosivos · 100 pociones
//    12 varas de invocación · 20 objetos de maná
//  Rareza → receta: Común (nivel 1, cobre/hierro) · Poco común (2-3, acero/plata/oro, giro)
//  · Raro (4, mithril/arcanita/plata estelar) · Épico (5-6, adamantita/acero de dragón/vacío)
//  · Legendario (7, oricalco y éter + el alma de un jefe del Ascenso).
//  La mecánica nueva (yoyó, gancho, látigo, rayos de espada, invocaciones, pociones, maná)
//  está en sim/terra.js y los dibujos de cada objeto en render/terraicons.js.
// =====================================================================================
const TR_RAR = [['Común', '#d8d2c4'], ['Poco común', '#7fd07a'], ['Raro', '#6ab8ff'], ['Épico', '#c08aff'], ['Legendario', '#f0c75e']];
const TR = {}; // id → { fam, i, n: total, r, p (0..1), art }
const TR_EL = { fire: '#ff7a2a', frost: '#8ad8ff', storm: '#f0f05a', life: '#7ae05a', void: '#a060ff', earth: '#c8843a', holy: '#fff2a0', mind: '#e0a0ff', time: '#ffe0ff', poison: '#8ad84a' };
const TR_ELN = { fire: 'fuego', frost: 'escarcha', storm: 'tormenta', life: 'vida', void: 'vacío', earth: 'tierra', holy: 'luz', mind: 'mente', time: 'tiempo', poison: 'veneno' };
// Materiales por rareza (el primero que exista)
const trHas = id => !!(ITEMS[id] || (typeof BD !== 'undefined' && BD[id]));
const trM = (m, f) => (MF[m] && MF[m][f]) || null;
const TR_MAT = [['copper', 'iron', 'bronze', 'tin'], ['steel', 'silver', 'gold', 'brass'], ['mithril', 'arcanite', 'starsilver', 'elvensilver'], ['adamantite', 'runesteel', 'dragonsteel', 'voidsteel'], ['orichalcum', 'etherium', 'aetherium', 'chronium']];
const TR_EXTRA = [['leather', 'stick', 'thread', 'feather'], ['silk', 'manaDust', 'glass', 'gunpowder'], ['manaCrystal', 'enchantedCloth', 'griffinFeather', 'resonantCrystal'], ['dragonHeart', 'drakeScale', 'soulGem', 'arcaneCore'], ['timeCrystal', 'voidCore', 'singularity', 'phoenixFeather']];
const TR_TIER = [1, 3, 4, 6, 7], TR_RPM = [0, 24, 64, 128, 192];
const trPick = (list, i) => { for (let k = 0; k < list.length; k++) { const id = list[(i + k) % list.length]; if (id && trHas(id)) return id; } return 'stick'; };
// Alma de jefe para los legendarios: cuanto más alto en la familia, más arriba en el Ascenso
const trSoul = p => { if (typeof ASC_ORDER === 'undefined') return null; const k = ASC_ORDER[Math.min(ASC_ORDER.length - 1, Math.round(24 + p * (ASC_ORDER.length - 25)))]; return k && ITEMS[k + 'Soul'] ? k + 'Soul' : null; };
function trRecipe(id, r, i, p, form, extra) {
  const mats = TR_MAT[r], m = mats[i % mats.length], m2 = mats[(i + 1) % mats.length];
  const core = trM(m, form || 'rod') || trM(m, 'ingot') || trPick(TR_EXTRA[r], i);
  // Dientes uno a uno (el banco tiene 6 y RX puede necesitar uno más si la combinación ya existe): lo
  // importante primero (el alma del jefe en los legendarios y la pieza propia de la familia)
  const pl = trM(m, 'plate'), fx = trPick(TR_EXTRA[r], i), teeth = [];
  if (r === 4) { const s = trSoul(p); if (s) teeth.push(s); }
  if (extra) teeth.push(...extra.filter(trHas).slice(0, 1));
  teeth.push(pl || fx, trM(m2, 'ingot') || trPick(TR_EXTRA[r], i + 1), fx);
  if (r >= 1) teeth.push(pl || fx); if (r >= 2) teeth.push(fx);
  RX(id, core, teeth.slice(0, 5), TR_RPM[r] + (i % 3) * 8 * (r > 0), TR_TIER[r]);
}
const trGeo = (a, b, p) => a * Math.pow(b / a, p);
function trDesc(r, d, bits) { return `【${TR_RAR[r][0]}】 ${d}${bits.length ? ' ' + bits.join(' · ') + '.' : ''}`; }
// Registra una familia de armas: [nombre, color base, color de acento, elemento, extras] por objeto
function trFamily(fam, shape, list, stat, form, extra) {
  list.forEach(([n, c, c2, el, more, d], i) => {
    const N = list.length, p = N > 1 ? i / (N - 1) : 1, r = Math.min(4, Math.floor(i / N * 5)), id = 't' + fam[0].toUpperCase() + fam.slice(1) + (i + 1);
    const st = stat(p, r, i); if (el) st.el = el; for (const k in more || {}) st[k] = more[k] && typeof more[k] === 'object' && st[k] && typeof st[k] === 'object' ? { ...st[k], ...more[k] } : more[k];
    const bits = []; if (st.el) bits.push('elemento ' + TR_ELN[st.el]);
    weapon(id, n, c, shape, st, '');
    ITEMS[id].d = trDesc(r, d || '', bits.concat((typeof AX_N !== 'undefined' ? Object.keys(AX_N).filter(k => st[k]).map(k => AX_N[k](st[k])) : [])));
    ITEMS[id].rar = r; TR[id] = { fam, i, N, r, p, c, c2: c2 || c, el: st.el };
    trRecipe(id, r, i, p, form, extra);
  });
}
// ---------- 40 espadas ----------
trFamily('sword', 'sword', [
  ['Espada corta de cobre', '#d8854a', '#8a5a2a'], ['Gladius de hierro', '#b8bcc4', '#6a4a2a'], ['Espada de bronce', '#c8964a', '#5a3a1a'], ['Sable del soldado', '#c8ccd4', '#3a5a8a', null, { spd: 0.85 }],
  ['Espada del leñador', '#a8acb4', '#7a5a2a', null, { sweep: 30 }], ['Cuchilla de estaño', '#d8dce0', '#4a4a50', null, { crit: 0.15 }], ['Espada de la guardia', '#c0c4cc', '#a82a2a', null, { kb: 1 }], ['Espada ancha de hierro', '#9aa0a8', '#5a3a1a', null, { sweep: 40, spd: 1.15 }],
  ['Sable de acero', '#dfe3ea', '#2a3a5a', null, { spd: 0.8 }], ['Espada de plata', '#eef2f8', '#6a8ab8', 'holy'], ['Cimitarra dorada', '#f0c75e', '#8a2a2a', null, { crit: 0.2 }], ['Espada lunar', '#c8d8ff', '#3a3a7a', 'mind'],
  ['Hoja dentada', '#b0b4bc', '#7a2a2a', null, { bleed: 0.3 }], ['Espada de cristal', '#b8e8ff', '#6a8ad8', null, { crit: 0.25, spd: 0.9 }], ['Hoja de escarcha', '#a8e0ff', '#3a6a9a', 'frost'], ['Espada ardiente', '#ff8a3a', '#5a1a0a', 'fire'],
  ['Hoja de mithril', '#bfe8f0', '#3a7a8a', null, { spd: 0.75 }], ['Katana del alba', '#f8f0e0', '#c83a3a', null, { crit: 0.3, reach: 12 }], ['Espada estelar', '#d8d0ff', '#4a3aaa', 'holy', { beam: 0.5 }], ['Hoja arcana', '#c8a0ff', '#4a2a8a', 'mind', { beam: 0.4 }],
  ['Espada del bosque élfico', '#9ae0a0', '#2a6a3a', 'life', { drain: 0.05 }], ['Colmillo de jade', '#6ad8a0', '#1a4a3a', 'poison', { bleed: 0.25 }], ['Hoja del vendaval', '#c8f0ff', '#2a5a7a', 'storm', { spd: 0.8, chain: 1 }], ['Espada de las mareas', '#5ab0e8', '#1a3a6a', 'frost', { sweep: 44 }],
  ['Espada de adamantita', '#e86a6a', '#3a1a1a', null, { crit: 0.25 }], ['Hoja rúnica', '#8ab8ff', '#2a2a5a', 'mind', { beam: 0.6 }], ['Rompedragones', '#c8c0b0', '#8a2a0a', 'fire', { sweep: 50, kb: 1, spd: 1.1 }], ['Hoja del vacío', '#7a4ac8', '#1a0a2a', 'void', { drain: 0.06 }],
  ['Espada sangrienta', '#c8203a', '#2a0a0a', null, { bleed: 0.4, drain: 0.08 }], ['Hoja de la tormenta', '#f0f05a', '#2a2a5a', 'storm', { chain: 2, beam: 0.5 }], ['Sable del eclipse', '#3a2a4a', '#f0c75e', 'void', { crit: 0.3, spd: 0.75 }], ['Espada de magma', '#ff6a1a', '#3a0a0a', 'fire', { beam: 0.6, sweep: 40 }],
  ['Excalibur del Taller', '#f8f4e0', '#f0c75e', 'holy', { beam: 0.8, crit: 0.2 }], ['Hoja del Primer Motor', '#e0b54c', '#5a3a1a', 'time', { beam: 0.7, spd: 0.7 }], ['Terrasable', '#7ae05a', '#2a6a2a', 'life', { beam: 1, drain: 0.06 }], ['Hoja de las Estrellas Caídas', '#b8a8ff', '#2a1a6a', 'holy', { beam: 0.9, chain: 2 }],
  ['Espada del Amanecer Eterno', '#ffd28a', '#c84a2a', 'fire', { beam: 1, sweep: 50 }], ['Filo del Fin de los Tiempos', '#ffe0ff', '#4a2a6a', 'time', { beam: 1, crit: 0.3 }], ['Hoja de Aurora', '#8af0d0', '#7a4ac8', 'mind', { beam: 1.1, spd: 0.7 }], ['Espada del Corazón del Mundo', '#ff7ad8', '#f0c75e', 'earth', { beam: 1.2, sweep: 56, drain: 0.05 }],
], p => ({ dmg: +trGeo(1.6, 17, p).toFixed(2) }), 'rod');
// ---------- 15 espadas ancestrales (grandes, con rayo propio y un poder) ----------
trFamily('ancient', 'sword', [
  ['Hoja de la Primera Forja', '#d8a868', '#5a3a1a', 'fire', null, 'Forjada antes que los hornos: su golpe lanza una chispa que corta.'],
  ['Espada del Rey Olvidado', '#c8c8b0', '#6a5a2a', 'holy', { crit: 0.15 }, 'Aún obedece a quien la empuña con nobleza.'],
  ['Filo de las Runas Viejas', '#9ab0d8', '#2a3a6a', 'mind', { spd: 0.9 }, 'Las runas brillan al cortar el aire.'],
  ['Hoja de los Gigantes', '#a8a090', '#4a3a2a', 'earth', { sweep: 60, kb: 1, spd: 1.2 }, 'Pesa como un menhir y golpea como uno.'],
  ['Espada del Faraón Dormido', '#f0d060', '#2a6a8a', 'time', { drain: 0.05 }, 'Arena dorada que no termina de caer.'],
  ['Hoja del Templo Hundido', '#5ad0c8', '#1a3a4a', 'frost', { sweep: 46 }, 'Gotea agua que nunca se seca.'],
  ['Espada de los Titanes', '#c8b8a8', '#8a2a2a', 'earth', { sweep: 64, kb: 1 }, 'Hecha para manos más grandes que las tuyas.'],
  ['Filo del Dragón Ancestral', '#ff6a3a', '#3a0a0a', 'fire', { bleed: 0.3 }, 'Una escama del primer dragón, afilada.'],
  ['Hoja del Oráculo', '#d8c0ff', '#4a2a7a', 'mind', { crit: 0.3 }, 'Sabe dónde vas a golpear antes que tú.'],
  ['Hoja del Imperio Perdido', '#e8d8a8', '#7a1a2a', 'holy', { crit: 0.25, drain: 0.06 }, 'El último estandarte de un reino que nadie recuerda.'],
  ['Espada del Dios Herrero', '#ffb04a', '#3a2a1a', 'fire', { sweep: 56, chain: 1 }, 'Aún está caliente del yunque divino.'],
  ['Filo del Abismo Antiguo', '#6a3aa8', '#0a0a1a', 'void', { drain: 0.08, crit: 0.2 }, 'Lo que corta no vuelve.'],
  ['Hoja del Origen', '#fff6d8', '#f0c75e', 'holy', { sweep: 60, crit: 0.25 }, 'La primera espada del mundo.'],
  ['Espada del Tiempo Inmemorial', '#ffe0ff', '#7a4ac8', 'time', { spd: 0.7, drain: 0.06 }, 'Corta ayer, hoy y mañana a la vez.'],
  ['Filo de la Creación', '#ff7ad8', '#8af0d0', 'life', { sweep: 70, drain: 0.1, crit: 0.3 }, 'De esta hoja salieron las estrellas.'],
], p => ({ dmg: +trGeo(5, 21.5, p).toFixed(2), beam: +(0.7 + p * 0.6).toFixed(2), reach: 14, ancient: 1 }), 'longRod', ['enchantedBook']);
// ---------- 10 pistolas ----------
trFamily('gun', 'gun', [
  ['Pistola de chispa', '#8a6a4a', '#c8c0b0'], ['Pistola de bronce', '#c8964a', '#5a3a1a', null, { ranged: { n: 1, cd: 0.42 } }],
  ['Revólver de acero', '#b8bcc4', '#3a2a1a', null, { ranged: { cd: 0.28 } }], ['Trabuco', '#7a5a3a', '#a8acb4', null, { ranged: { n: 4, spread: 0.22, cd: 0.8 } }],
  ['Pistola de plata estelar', '#d8d0ff', '#3a3a7a', 'holy', { ranged: { pierce: 1 } }], ['Pistola de rayos', '#5af0ff', '#2a3a4a', 'storm', { ranged: { pierce: 2, spd: 34 } }],
  ['Cañón de mano', '#6a6a72', '#e86a2a', 'fire', { ranged: { boom: 40, cd: 0.7 } }], ['Revólver del dragón', '#c83a2a', '#f0c75e', 'fire', { ranged: { cd: 0.22 } }],
  ['Bláster del vacío', '#7a4ac8', '#1a0a2a', 'void', { ranged: { pierce: 3, spd: 36, homing: 1 } }], ['Pistola del Primer Motor', '#e0b54c', '#3a2a1a', 'time', { ranged: { n: 2, spread: 0.06, cd: 0.18, pierce: 2 } }],
], (p, r, i) => ({ dmg: +trGeo(1.4, 14, p).toFixed(2), ranged: { ammo: 'bullet', cd: +(0.5 - p * 0.24).toFixed(2), spd: 26 + p * 8 } }), 'rod');
// ---------- 10 bumeranes ----------
trFamily('boomer', 'boomer', [
  ['Bumerán de roble', '#a07848', '#5a3a1a'], ['Bumerán de hierro', '#a8acb4', '#5a4a3a'],
  ['Chakram de acero', '#d8dce4', '#3a3a4a', null, { ranged: { pierce: 3 } }], ['Bumerán de hielo', '#a8e0ff', '#3a6a9a', 'frost'],
  ['Bumerán de las llamas', '#ff8a3a', '#5a1a0a', 'fire'], ['Chakram élfico', '#9ae0a0', '#2a6a3a', 'life', { ranged: { pierce: 4 } }],
  ['Bumerán estelar', '#d8d0ff', '#4a3aaa', 'holy', { ranged: { homing: 1 } }], ['Tríada de adamantita', '#e86a6a', '#3a1a1a', null, { ranged: { n: 3, spread: 0.25 } }],
  ['Bumerán del vendaval eterno', '#c8f0ff', '#2a5a7a', 'storm', { ranged: { n: 2, spread: 0.3, homing: 1 } }], ['Chakram del Fin', '#ff7ad8', '#2a1a4a', 'void', { ranged: { n: 3, spread: 0.3, pierce: 8 } }],
], p => ({ dmg: +trGeo(1.4, 12, p).toFixed(2), ranged: { cd: +(0.9 - p * 0.45).toFixed(2), spd: 12 + p * 8, ret: 1, pierce: 1 + Math.round(p * 4) } }), 'plate');
// ---------- 10 ganchos (te llevan hasta donde se clavan) ----------
trFamily('hook', 'boomer', [
  ['Gancho de cuerda', '#a07848', '#c8b890'], ['Gancho de hierro', '#a8acb4', '#7a6a5a'], ['Garfio de acero', '#d8dce4', '#5a5a6a'], ['Gancho de plata', '#eef2f8', '#8a9ab8'],
  ['Gancho de mithril', '#bfe8f0', '#3a7a8a'], ['Gancho de cristal', '#b8e8ff', '#6a8ad8'], ['Gancho de adamantita', '#e86a6a', '#5a2a2a'], ['Gancho del dragón', '#c83a2a', '#f0c75e'],
  ['Gancho del vacío', '#7a4ac8', '#2a1a4a'], ['Gancho estelar', '#d8d0ff', '#f0c75e'],
], p => ({ dmg: +trGeo(0.5, 3, p).toFixed(2), hook: { range: Math.round(9 + p * 19), spd: Math.round(22 + p * 34), fly: Math.round(28 + p * 30) } }), 'ring');
// ---------- 20 yoyós (mantén el clic: va hacia el ratón y golpea sin parar) ----------
trFamily('yoyo', 'boomer', [
  ['Yoyó de madera', '#a07848', '#d8c8a0'], ['Yoyó de cobre', '#d8854a', '#8a5a2a'], ['Yoyó de hierro', '#a8acb4', '#5a5a6a'], ['Yoyó de hueso', '#ece4cc', '#8a7a5a', null, { bleed: 0.2 }],
  ['Yoyó de acero', '#d8dce4', '#3a3a4a'], ['Yoyó de plata', '#eef2f8', '#6a8ab8', 'holy'], ['Yoyó de cristal', '#b8e8ff', '#6a8ad8', null, { crit: 0.2 }], ['Yoyó de escarcha', '#a8e0ff', '#3a6a9a', 'frost'],
  ['Yoyó de mithril', '#bfe8f0', '#3a7a8a'], ['Yoyó estelar', '#d8d0ff', '#4a3aaa', 'holy'], ['Yoyó arcano', '#c8a0ff', '#4a2a8a', 'mind'], ['Yoyó del vendaval', '#c8f0ff', '#2a5a7a', 'storm', { chain: 1 }],
  ['Yoyó de adamantita', '#e86a6a', '#3a1a1a'], ['Yoyó de magma', '#ff6a1a', '#3a0a0a', 'fire'], ['Yoyó del vacío', '#7a4ac8', '#1a0a2a', 'void', { drain: 0.04 }], ['Yoyó rúnico', '#8ab8ff', '#2a2a5a', 'mind', { crit: 0.25 }],
  ['Yoyó de las galaxias', '#b8a8ff', '#1a1a4a', 'holy', { chain: 2 }], ['Yoyó del Primer Motor', '#e0b54c', '#5a3a1a', 'time'], ['Yoyó de la Aurora', '#8af0d0', '#7a4ac8', 'life', { drain: 0.05 }], ['Yoyó del Fin de los Tiempos', '#ffe0ff', '#4a2a6a', 'time', { chain: 2, crit: 0.25 }],
], p => ({ dmg: +trGeo(1.2, 13, p).toFixed(2), yoyo: { range: +(4 + p * 8).toFixed(1), rate: +(0.38 - p * 0.22).toFixed(2), spd: +(9 + p * 9).toFixed(1) } }), 'ring');
// ---------- 15 látigos (largos; marcan al enemigo: tus invocaciones y tú le hacéis más daño) ----------
trFamily('whip', 'spear', [
  ['Látigo de cuero', '#8a5a2a', '#c8a070'], ['Látigo de espinas', '#5a8a3a', '#2a4a1a', 'poison'], ['Látigo de cadena', '#a8acb4', '#5a5a6a', null, { kb: 1 }],
  ['Látigo de plata', '#eef2f8', '#6a8ab8', 'holy'], ['Látigo de fuego', '#ff8a3a', '#5a1a0a', 'fire'], ['Látigo de escarcha', '#a8e0ff', '#3a6a9a', 'frost'],
  ['Látigo élfico', '#9ae0a0', '#2a6a3a', 'life'], ['Látigo de mithril', '#bfe8f0', '#3a7a8a', null, { spd: 0.8 }], ['Látigo de la tormenta', '#f0f05a', '#2a2a5a', 'storm', { chain: 1 }],
  ['Látigo del dragón', '#c83a2a', '#f0c75e', 'fire', { bleed: 0.3 }], ['Látigo del vacío', '#7a4ac8', '#1a0a2a', 'void'], ['Látigo rúnico', '#8ab8ff', '#2a2a5a', 'mind', { crit: 0.25 }],
  ['Látigo de las estrellas', '#d8d0ff', '#4a3aaa', 'holy', { chain: 2 }], ['Látigo del Amanecer', '#ffd28a', '#c84a2a', 'fire', { spd: 0.75 }], ['Látigo del Primer Motor', '#e0b54c', '#5a3a1a', 'time', { chain: 2, crit: 0.2 }],
], p => ({ dmg: +trGeo(1.2, 11, p).toFixed(2), whip: { reach: +(4 + p * 4.5).toFixed(1), tag: Math.round(trGeo(2, 30, p)) } }), 'wire');
// ---------- 10 ballestas ----------
trFamily('xbow', 'xbow', [
  ['Ballesta de madera', '#a07848', '#5a3a1a'], ['Ballesta de hierro', '#a8acb4', '#5a4a3a'], ['Ballesta de acero', '#d8dce4', '#3a3a4a', null, { ranged: { pierce: 2 } }], ['Ballesta de repetición', '#b8bcc4', '#7a5a2a', null, { ranged: { cd: 0.35 } }],
  ['Ballesta élfica', '#9ae0a0', '#2a6a3a', 'life', { ranged: { n: 2, spread: 0.08 } }], ['Ballesta de cristal', '#b8e8ff', '#6a8ad8', 'frost', { ranged: { pierce: 3 } }],
  ['Ballesta de adamantita', '#e86a6a', '#3a1a1a', null, { ranged: { n: 2, spread: 0.06, pierce: 2 } }], ['Ballesta del dragón', '#c83a2a', '#f0c75e', 'fire', { ranged: { boom: 36 } }],
  ['Ballesta del vacío', '#7a4ac8', '#1a0a2a', 'void', { ranged: { pierce: 5, homing: 1 } }], ['Ballesta estelar', '#d8d0ff', '#4a3aaa', 'holy', { ranged: { n: 3, spread: 0.1, pierce: 3 } }],
], p => ({ dmg: +trGeo(2, 15, p).toFixed(2), ranged: { ammo: 'bolt', cd: +(0.9 - p * 0.4).toFixed(2), spd: 26 + p * 8, pierce: 1 } }), 'rod');
// ---------- 15 arcos ----------
trFamily('bow', 'bow', [
  ['Arco de roble', '#8a6238', '#e8e0d0'], ['Arco de hueso', '#e8e0c8', '#8a7a5a'], ['Arco de cobre', '#d8854a', '#e8e0d0'],
  ['Arco de acero', '#c8ccd4', '#e8e0d0', null, { ranged: { cd: 0.42 } }], ['Arco de plata', '#eef2f8', '#6a8ab8', 'holy'], ['Arco de fuego', '#ff8a3a', '#ffd060', 'fire'],
  ['Arco élfico', '#9ae0a0', '#e8f0e0', 'life', { ranged: { cd: 0.32 } }], ['Arco de mithril', '#bfe8f0', '#3a7a8a', null, { ranged: { n: 2, spread: 0.08 } }], ['Arco de la tormenta', '#f0f05a', '#2a2a5a', 'storm', { ranged: { pierce: 2 } }],
  ['Arco del dragón', '#c83a2a', '#f0c75e', 'fire', { ranged: { n: 2, spread: 0.1 } }], ['Arco del vacío', '#7a4ac8', '#1a0a2a', 'void', { ranged: { homing: 1, pierce: 2 } }], ['Arco rúnico', '#8ab8ff', '#2a2a5a', 'mind', { ranged: { n: 3, spread: 0.12 } }],
  ['Arco de las estrellas', '#d8d0ff', '#f0c75e', 'holy', { ranged: { n: 3, spread: 0.14, homing: 1 } }], ['Arco de la Aurora', '#8af0d0', '#7a4ac8', 'life', { ranged: { n: 4, spread: 0.16, pierce: 2 } }], ['Arco del Fin', '#ff7ad8', '#2a1a4a', 'time', { ranged: { n: 5, spread: 0.2, pierce: 3, homing: 1 } }],
], p => ({ dmg: +trGeo(1.3, 15, p).toFixed(2), ranged: { ammo: 'arrow', cd: +(0.55 - p * 0.25).toFixed(2), spd: 20 + p * 10 } }), 'longRod', ['thread']);
// ---------- 20 varitas (gastan maná) ----------
trFamily('wand', 'wand', [
  ['Varita de roble', '#8a6238', '#7ae05a', 'life'], ['Varita de cobre', '#d8854a', '#5af0ff', 'storm'], ['Varita de chispas', '#c8a060', '#ff8a3a', 'fire'], ['Varita de musgo', '#5a8a3a', '#8ad84a', 'poison'],
  ['Varita de escarcha', '#a8e0ff', '#ffffff', 'frost', { ranged: { slow: 2 } }], ['Varita de fuego', '#c83a2a', '#ffd060', 'fire', { ranged: { boom: 30 } }], ['Varita de plata', '#eef2f8', '#fff2a0', 'holy', { ranged: { homing: 1 } }], ['Varita del rayo', '#f0f05a', '#ffffff', 'storm', { ranged: { pierce: 3, spd: 30 } }],
  ['Varita arcana', '#7a4ac8', '#e0a0ff', 'mind', { ranged: { n: 3, spread: 0.2, homing: 1 } }], ['Varita estelar', '#d8d0ff', '#fff6b0', 'holy', { ranged: { homing: 1, pierce: 1 } }], ['Varita de cristal', '#b8e8ff', '#c8a0ff', 'frost', { ranged: { n: 2, spread: 0.1, pierce: 2 } }], ['Varita de la luna', '#c8d8ff', '#ffffff', 'mind', { ranged: { boom: 40 } }],
  ['Varita del vacío', '#3a1a6a', '#a060ff', 'void', { ranged: { boom: 50, homing: 1 } }], ['Varita del dragón', '#c83a2a', '#ff8a2a', 'fire', { ranged: { n: 3, spread: 0.2, boom: 34 } }], ['Varita rúnica', '#8ab8ff', '#2a2a5a', 'mind', { ranged: { n: 4, spread: 0.24, homing: 1 } }], ['Varita de la tormenta', '#f0f05a', '#5af0ff', 'storm', { ranged: { pierce: 6, spd: 36 } }],
  ['Varita de las galaxias', '#2a1a4a', '#d8d0ff', 'holy', { ranged: { n: 5, spread: 0.3, homing: 1 } }], ['Varita del tiempo', '#ffe0ff', '#e0b54c', 'time', { ranged: { pierce: 8, slow: 3 } }], ['Varita del Origen', '#fff6d8', '#f0c75e', 'holy', { ranged: { boom: 70, homing: 1 } }], ['Varita de la Aurora', '#8af0d0', '#ff7ad8', 'life', { ranged: { n: 5, spread: 0.26, pierce: 3, homing: 1 } }],
], p => ({ dmg: +trGeo(1.4, 14, p).toFixed(2), ranged: { mana: Math.round(trGeo(3, 14, p)), cd: +(0.34 - p * 0.14).toFixed(2), spd: 16 + p * 8, glow: 1 } }), 'rod', ['manaDust']);
// ---------- 15 explosivos (se lanzan y se gastan) ----------
trFamily('bomb', 'boomer', [
  ['Petardo', '#c83a2a', '#e8e0c8'], ['Bomba de mano', '#3a3a3a', '#ff8a3a'], ['Granada de pólvora', '#5a6a3a', '#c8c0a0'],
  ['Dinamita', '#c8302a', '#f0e0a0', null, { post: 'big' }], ['Bomba de fragmentación', '#6a6a72', '#c8c0b0', null, { post: 'frag' }], ['Bomba pegajosa', '#5ac85a', '#2a4a1a', 'poison', { post: 'poison' }],
  ['Granada de fuego', '#ff6a1a', '#5a1a0a', 'fire', { post: 'fire' }], ['Granada de escarcha', '#8ad8ff', '#2a4a6a', 'frost', { post: 'frost' }], ['Bomba de racimo', '#8a5a3a', '#ffd060', null, { post: 'cluster' }],
  ['Bomba arcana', '#7a4ac8', '#e0a0ff', 'mind', { post: 'cluster' }], ['Carga de adamantita', '#e86a6a', '#3a1a1a', null, { post: 'big' }], ['Bomba del vacío', '#2a1a4a', '#a060ff', 'void', { post: 'void' }],
  ['Bomba solar', '#ffd060', '#ff6a1a', 'fire', { post: 'fire' }], ['Granada estelar', '#d8d0ff', '#4a3aaa', 'holy', { post: 'cluster' }], ['Bomba del Fin del Mundo', '#ff3a2a', '#1a0a0a', 'void', { post: 'void' }],
], p => ({ dmg: +trGeo(4, 40, p).toFixed(2), noWear: 1, ranged: { cd: 0.7, spd: 11 + p * 4, boom: Math.round(40 + p * 100), life: 0.9, throw: 1 } }), 'plate', ['gunpowder']);
// Los explosivos se lanzan de 1 en 1: munición de sí mismos y se fabrican de 4 en 4
for (const id in TR) if (TR[id].fam === 'bomb') { WEAPONS[id].ranged.ammo = id; ITEMS[id].weapon.ranged = WEAPONS[id].ranged; const r = RECIPE_FOR[id]; if (r) r.n = 4; }
// ---------- 12 varas de invocación (criaturas que pelean contigo un rato) ----------
const TR_SUMN = { wolf: 'un lobo', spider: 'una araña gigante', owl: 'un búho', bee: 'un enjambre de abejas', fox: 'un zorro de fuego', bear: 'un oso', eagle: 'un águila', golem: 'un gólem', wisp: 'un fuego fatuo', drake: 'un draco', griffin: 'un grifo', phoenix: 'un fénix' };
const TR_SUM = [
  ['Vara del lobo', '#8a8a90', 'wolf', 0], ['Vara de la araña', '#5a4a3a', 'spider', 0], ['Vara del búho', '#c8a060', 'owl', 0],
  ['Vara del enjambre', '#f0c040', 'bee', 1], ['Vara del zorro', '#d8742a', 'fox', 1], ['Vara del oso', '#6a4a2a', 'bear', 1],
  ['Vara del águila', '#a88a5a', 'eagle', 2], ['Vara del gólem', '#8a8a7a', 'golem', 2], ['Vara del fuego fatuo', '#9af0ff', 'wisp', 3],
  ['Vara del draco', '#c83a2a', 'drake', 3], ['Vara del grifo', '#c8a060', 'griffin', 4], ['Vara del fénix', '#ff6a1a', 'phoenix', 4],
];
TR_SUM.forEach(([n, c, sp, r], i) => { const p = i / (TR_SUM.length - 1), id = 'tSummon' + (i + 1);
  const st = { dmg: +trGeo(1, 6, p).toFixed(2), summon: { sp, hp: Math.round(trGeo(40, 600, p)), dmg: Math.round(trGeo(6, 62, p)), max: 1 + Math.floor(r / 2) + (i === TR_SUM.length - 1 ? 1 : 0), mana: Math.round(trGeo(10, 40, p)), t: 300 } };
  weapon(id, n, c, 'staff', st, ''); ITEMS[id].rar = r; TR[id] = { fam: 'summon', i, N: TR_SUM.length, r, p, c, c2: '#f0c75e', sp };
  ITEMS[id].d = trDesc(r, `Clic: invoca ${TR_SUMN[sp]} que pelea a tu lado 5 minutos.`, [`${st.summon.hp} de vida`, `${st.summon.dmg} de daño`, `hasta ${st.summon.max} a la vez`, `${st.summon.mana} de maná`]);
  trRecipe(id, r, i, p, 'longRod', ['manaDust', 'bone']); });
// ---------- 100 pociones: 20 efectos × 5 grados ----------
const TR_POT_G = ['menor', '', 'mayor', 'superior', 'legendaria'], TR_POT_T = [120, 180, 240, 300, 480];
// [clave, nombre, color, forma del frasco, efecto (grado 0..4) → { mods, heal, mana, regen, manaRegenFx }, ingrediente]
const TR_POTS = [
  ['heal', 'Poción de curación', '#e8384a', 0, g => ({ heal: [25, 50, 90, 150, 250][g] }), 'berries'],
  ['mana', 'Poción de maná', '#4a6aff', 0, g => ({ mana: [30, 60, 110, 180, 300][g] }), 'manaDust'],
  ['regen', 'Poción de regeneración', '#ff7a9a', 1, g => ({ regen: [0.6, 1, 1.6, 2.5, 4][g] }), 'herbs'],
  ['might', 'Poción de fuerza', '#c8302a', 2, g => ({ mods: { melee: [1.08, 1.14, 1.2, 1.28, 1.4][g] } }), 'bone'],
  ['aim', 'Poción de puntería', '#e8a03a', 2, g => ({ mods: { ranged: [1.08, 1.14, 1.2, 1.28, 1.4][g] } }), 'feather'],
  ['iron', 'Poción de piel de hierro', '#9aa0a8', 3, g => ({ mods: { def: [3, 5, 8, 12, 20][g] } }), '@iron.nugget'],
  ['swiftT', 'Poción de rapidez', '#5af0ff', 1, g => ({ mods: { speed: [1.08, 1.12, 1.18, 1.25, 1.35][g] } }), 'griffinFeather'],
  ['mining', 'Poción de minería', '#ffb020', 3, g => ({ mods: { mine: [1.25, 1.45, 1.7, 1.95, 2.3][g] } }), 'coal'],
  ['logger', 'Poción del leñador', '#8a6a3a', 1, g => ({ mods: { wood: [1.25, 1.45, 1.7, 1.95, 2.3][g] } }), 'log'],
  ['vital', 'Poción de vitalidad', '#ff5a6a', 4, g => ({ mods: { hp: [20, 35, 55, 80, 120][g] } }), 'berries'],
  ['mind', 'Poción de mente clara', '#8a7aff', 4, g => ({ mods: { mana: [20, 40, 65, 100, 150][g] } }), 'moonflower'],
  ['flow', 'Poción de flujo', '#5ad0ff', 0, g => ({ mods: { manaRegen: [1.3, 1.5, 1.8, 2.1, 2.6][g] } }), 'glowcap'],
  ['owl', 'Poción de ojos de búho', '#c8d8ff', 2, g => ({ mods: { night: 1, detect: [1, 0.97, 0.94, 0.9, 0.85][g] } }), 'glowcap'],
  ['fortune', 'Poción de fortuna', '#20c860', 3, g => ({ mods: { luck: [0.05, 0.09, 0.14, 0.2, 0.3][g] } }), 'emerald'],
  ['shadow', 'Poción de sigilo', '#4a3a5a', 1, g => ({ mods: { detect: [0.85, 0.75, 0.65, 0.55, 0.45][g] } }), 'nightshade'],
  ['warmth', 'Poción de calor', '#ff8a3a', 0, g => ({ mods: { warm: [4, 7, 10, 14, 20][g] } }), 'fireblossom'],
  ['fireproofT', 'Poción ignífuga', '#e8502a', 2, g => ({ mods: { fire: 1, warm: [0, 1, 2, 3, 5][g] } }), 'essenceFire'],
  ['hunterT', 'Poción del cazador', '#c8203a', 4, g => ({ mods: { hunt: [1.3, 1.45, 1.6, 1.8, 2.1][g] } }), 'frostFang'],
  ['builder', 'Poción del artesano', '#c8a060', 3, g => ({ mods: { work: [1.08, 1.14, 1.2, 1.3, 1.45][g] } }), 'planks'],
  ['stamina', 'Poción de aguante', '#7ae05a', 1, g => ({ mods: { stam: [20, 35, 55, 75, 100][g], sprintCost: [0.9, 0.82, 0.74, 0.65, 0.5][g] } }), 'honeycomb'],
];
const TR_POT = {};
TR_POTS.forEach(([k, n, c, shape, fx, ing], pi) => { for (let g = 0; g < 5; g++) {
  const id = 'tPot' + k[0].toUpperCase() + k.slice(1) + g, e = fx(g), name = n + (TR_POT_G[g] ? ' ' + TR_POT_G[g] : ''), t = e.mods || e.regen ? TR_POT_T[g] : 0;
  IT(id, name, c, 'potion', F_CAT, ''); ITEMS[id].rar = g; ITEMS[id].tpot = { k, g, ...e, t }; TR_POT[id] = ITEMS[id].tpot; TR[id] = { fam: 'potion', i: pi * 5 + g, N: 100, r: g, p: g / 4, c, c2: '#ffffff', shape };
  const bits = []; if (e.heal) bits.push(`+${e.heal} de vida al instante`); if (e.mana) bits.push(`+${e.mana} de maná al instante`); if (e.regen) bits.push(`+${e.regen} de vida por segundo`);
  if (e.mods) for (const m in e.mods) bits.push(TR_MODN(m, e.mods[m])); if (t) bits.push(`dura ${t / 60} min`);
  ITEMS[id].d = trDesc(g, 'Bébela con F.', bits);
  // Receta: las menores y normales en el banco; desde «mayor», en la mesa de alquimia (necesita agua)
  const ingI = ing.startsWith('@') ? trM(ing.slice(1).split('.')[0], ing.split('.')[1]) : ing, base = trHas(ingI) ? ingI : 'herbs', prev = g ? 'tPot' + k[0].toUpperCase() + k.slice(1) + (g - 1) : null;
  const up = [null, 'herbs', 'manaDust', 'manaCrystal', 'timeCrystal'][g];
  if (g < 2) RX(id, 'vial', [base + (g ? '*2' : ''), ...(prev ? [prev] : ['herbs'])], 0, g + 1);
  else RM('alchemy', { [prev]: 2, [base]: g, ...(up && trHas(up) ? { [up]: 1 } : {}) }, { [id]: 2 }, 3 + g, { water: 100 });
} });
function TR_MODN(m, v) {
  const pct = x => Math.round(Math.abs(x - 1) * 100) + ' %';
  return ({ melee: `+${pct(v)} de daño cuerpo a cuerpo`, ranged: `+${pct(v)} de daño a distancia y mágico`, def: `+${v} de defensa`, speed: `+${pct(v)} de velocidad`, mine: `picas un ${pct(v)} más rápido`, wood: `talas un ${pct(v)} más rápido`, hp: `+${v} de vida máxima`, mana: `+${v} de maná máximo`, manaRegen: `+${pct(v)} de regeneración de maná`, night: 'ves en la oscuridad', detect: v < 1 ? `los enemigos te ven un ${pct(v)} peor` : '', luck: `+${Math.round(v * 100)} % de botín doble`, warm: v ? `+${v} de abrigo` : '', fire: 'no te quemas', hunt: `cazas un ${pct(v)} más rápido`, work: `trabajas un ${pct(v)} más rápido`, stam: `+${v} de aguante`, sprintCost: `correr gasta un ${pct(v)} menos` })[m] || m;
}
// ---------- 20 objetos de maná ----------
// acc: accesorio (ranura de accesorio) · inst: maná al momento · perm: maná máximo para siempre (con tope de usos) · buff: regeneración un rato
const TR_MANA = [
  ['manaRing', 'Anillo de maná', '#6a8aff', 'ring', 0, { acc: { mana: 20 } }],
  ['apprenticeAmulet', 'Amuleto del aprendiz', '#8ab8ff', 'amulet', 0, { acc: { manaRegen: 1.15, mana: 5 } }],
  ['manaDrop', 'Gota de maná', '#5a8aff', 'drop', 0, { inst: 25 }],
  ['manaShard', 'Esquirla de maná', '#7a9aff', 'shard', 0, { perm: 5, cap: 10 }],
  ['crystalPendant', 'Colgante de cristal', '#a8d8ff', 'amulet', 1, { acc: { mana: 40 } }],
  ['flowBracelet', 'Brazalete del flujo', '#5ad0ff', 'ring', 1, { acc: { manaRegen: 1.3, mana: 10 } }],
  ['manaTea', 'Té de maná', '#6ab0c8', 'cup', 1, { buff: { manaRegen: 1.7 }, t: 240 }],
  ['vitalManaCrystal', 'Cristal de maná vital', '#4a6aff', 'shard', 1, { perm: 10, cap: 8 }],
  ['starCloak', 'Broche estelar', '#d8d0ff', 'amulet', 2, { acc: { mana: 50, manaRegen: 1.2 } }],
  ['sageCirclet', 'Diadema del sabio', '#f0c75e', 'crown', 2, { acc: { mana: 75 } }],
  ['etherFlask', 'Frasco de éter', '#8af0ff', 'drop', 2, { inst: 120 }],
  ['manaStar', 'Estrella de maná', '#fff2a0', 'star', 2, { perm: 15, cap: 5 }],
  ['voidOrb', 'Orbe del vacío', '#7a4ac8', 'orb', 3, { acc: { mana: 90, manaRegen: 1.35 } }],
  ['archmageCrown', 'Corona del archimago', '#c8a0ff', 'crown', 3, { acc: { mana: 115, manaRegen: 1.25 } }],
  ['etherElixir', 'Elixir de éter', '#5af0e8', 'drop', 3, { inst: 9999, buff: { manaRegen: 2 }, t: 120 }],
  ['arcaneFruit', 'Fruto arcano', '#ff7ad8', 'fruit', 3, { perm: 25, cap: 3 }],
  ['arcaneHeart', 'Corazón arcano', '#ff5ab0', 'heart', 4, { acc: { mana: 160, manaRegen: 1.6 } }],
  ['eternalSpring', 'Manantial eterno', '#5ad0ff', 'orb', 4, { acc: { mana: 60, manaRegen: 2.2 } }],
  ['primeManaCore', 'Núcleo de maná primordial', '#e0b54c', 'star', 4, { perm: 50, cap: 2 }],
  ['infinityDraught', 'Trago del infinito', '#ffe0ff', 'drop', 4, { inst: 9999, buff: { manaRegen: 3, mana: 50 }, t: 180 }],
];
TR_MANA.forEach(([id, n, c, shape, r, e], i) => {
  IT(id, n, c, e.acc ? 'gem' : 'potion', e.acc ? 9 : F_CAT, ''); ITEMS[id].rar = r; ITEMS[id].tmana = e; TR[id] = { fam: 'mana', i, N: 20, r, p: i / 19, c, c2: '#ffffff', shape };
  if (e.acc) ITEMS[id].gear = { slot: 'acc', mods: e.acc };
  const bits = []; if (e.acc) for (const m in e.acc) bits.push(TR_MODN(m, e.acc[m])); if (e.inst) bits.push(e.inst > 5000 ? 'rellena todo tu maná' : `+${e.inst} de maná al instante`);
  if (e.perm) bits.push(`+${e.perm} de maná máximo para siempre (hasta ${e.cap} veces: +${e.perm * e.cap})`); if (e.buff) for (const m in e.buff) bits.push(TR_MODN(m, e.buff[m])); if (e.t) bits.push(`dura ${e.t / 60} min`);
  ITEMS[id].d = trDesc(r, e.acc ? 'Equípalo en una ranura de accesorio.' : e.perm ? 'Consúmelo con F.' : 'Tómalo con F.', bits);
  trRecipe(id, r, i, i / 19, e.acc ? 'ring' : 'nugget', ['manaDust']);
});
