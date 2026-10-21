'use strict';
// =====================================================================================
//  Ficha de cada bloque (F sobre él). Todos los bloques del juego, sin excepción, tienen:
//   · Familia (procesado, generador, cinética, logística, almacén, energía, fluidos, lógica,
//     defensa, luz, hogar, construcción…) con su propia ventana y opciones.
//   · Rasgo propio y números propios (velocidad, eficiencia, desgaste, calor), que dependen
//     de su nivel y de cómo está hecho: no hay dos tipos iguales. Los rasgos FUNCIONAN.
//   · Pestañas: Uso (lo de siempre) · Ficha (escena viva, datos y modos) · Mantenimiento
//     (estado, calor, reparar, lubricar, limpiar, desatascar, 2 huecos de mejora) ·
//     Aprende (qué hace, qué acepta, con qué conecta, consejos) · Notas (nombre, color,
//     nota y lo que le ha pasado).
//   · Modos: procesado Eco / Normal / Turbo, lote (para tras N piezas) y receta fija;
//     generadores Ahorro / Normal / Máximo; luces con intensidad; almacenes con etiqueta.
// =====================================================================================
// ---------- Familias ----------
const FAM = {
  proc: { n: 'Procesado', i: '⚙', c: '#e0b54c', learn: 'Transforma materiales siguiendo recetas. Mete lo que acepta en la entrada; lo fabricado sale por la salida (o lo recoge un brazo o una cinta).' },
  gen: { n: 'Generador', i: '⚡', c: '#ffd84a', learn: 'Produce energía (FE) o rotación. Conéctalo con cables (energía) o ejes (rotación) a las máquinas que la necesitan.' },
  kin: { n: 'Cinética', i: '⟳', c: '#c8a070', learn: 'Transmite o transforma la rotación (RPM) y su capacidad (SU). Cada máquina conectada consume capacidad; si te pasas, la red se para.' },
  logistic: { n: 'Logística', i: '➜', c: '#7cc4ff', learn: 'Mueve objetos de un sitio a otro. Fíjate en su dirección (R para girar) y en lo que tiene delante y detrás.' },
  storage: { n: 'Almacén', i: '▣', c: '#c89a5a', learn: 'Guarda objetos. Recibe de cintas y brazos y entrega a quien se lo pida. Shift+F guarda todo, Alt+F lo recoge.' },
  energy: { n: 'Energía', i: '🔋', c: '#ffb04a', learn: 'Lleva o guarda energía (FE). Los cables tienen capacidad; las baterías se configuran cara a cara (entrada / salida / bloqueada).' },
  fluid: { n: 'Fluidos', i: '💧', c: '#5aa8ff', learn: 'Bombea, guarda o mueve líquidos y gases por tuberías. Cada tanque solo admite un fluido a la vez.' },
  logic: { n: 'Lógica', i: '⌁', c: '#ff6a5a', learn: 'Señales de redstone: emite, detecta o combina señales para automatizar. Usa T para ajustar sus parámetros.' },
  defense: { n: 'Defensa', i: '🛡', c: '#e06a5a', learn: 'Protege tu base: dispara, daña o impide que los enemigos aparezcan cerca.' },
  light: { n: 'Luz', i: '💡', c: '#ffe08a', learn: 'Da luz: de noche ves y los enemigos no aparecen cerca. En los túneles de la montaña, descubre la roca.' },
  home: { n: 'Hogar', i: '🏠', c: '#d8a0c0', learn: 'Mueble o adorno. En una casa de NPC cuenta como decoración y abarata sus precios. Algunos dan calor.' },
  build: { n: 'Construcción', i: '🧱', c: '#a8a8a4', learn: 'Bloque de construcción: paredes, suelos, columnas y adornos de obra. Los sólidos no se atraviesan.' },
  core: { n: 'Núcleo', i: '✦', c: '#fff4cc', learn: 'El corazón de tu fábrica: entrégale lo que pide cada nivel para desbloquear tecnología.' },
  misc: { n: 'Especial', i: '✧', c: '#c8c0b0', learn: 'Bloque con una función propia: mira su descripción.' },
};
const _famC = {};
function famOf(t) {
  if (t in _famC) return _famC[t]; const d = BD[t] || {}, cat = d.cat, nm = t + ' ' + (d.n || ''); let f = 'misc';
  if (t === 'core') f = 'core';
  else if (d.machine || t === 'bench' || t === 'assembler') f = 'proc';
  else if (/turret|spike|ward|suppress|beacon|scarecrow|trap/i.test(t)) f = 'defense';
  else if (d.pw && d.pw.role === 'gen' || d.gen || cat === 1) f = 'gen';
  else if (d.slots) f = 'storage';
  else if (cat === 0 || d.kin) f = 'kin';
  else if (cat === 3) f = 'logistic';
  else if (cat === 4 || d.cable || (d.pw && d.pw.role === 'store')) f = 'energy';
  else if (cat === 5 || d.pipe || d.fl) f = 'fluid';
  else if (cat === 6 || d.emit || d.rsin || d.logic || d.rsable) f = 'logic';
  else if (d.light) f = 'light';
  else if (typeof HOUSE_CAT !== 'undefined' && cat === HOUSE_CAT || d.decor) f = 'home';
  else if (typeof BUILD_CAT !== 'undefined' && cat === BUILD_CAT || /block|wall|brick|floor|pillar|fence|glass/i.test(nm)) f = 'build';
  return (_famC[t] = f);
}
// ---------- Rasgos (cada uno hace algo de verdad) ----------
const BTRAITS = {
  frugal: { n: 'Ahorradora', d: '8 % de veces no gasta material', fam: ['proc'], fx: { save: 0.08 } },
  generous: { n: 'Generosa', d: '6 % de veces da una pieza de más', fam: ['proc'], fx: { extra: 0.06 } },
  swift: { n: 'Ágil', d: '+15 % de velocidad', fam: ['proc', 'gen'], fx: { spd: 1.15 } },
  sturdy: { n: 'Robusta', d: 'Se desgasta la mitad', fam: ['proc', 'gen', 'kin', 'logistic', 'defense', 'energy', 'fluid'], fx: { wear: 0.5 } },
  cool: { n: 'Fresca', d: 'Apenas se calienta', fam: ['proc', 'gen'], fx: { heat: 0.4 } },
  hot: { n: 'Caliente', d: 'Rápida (+20 %) pero se calienta mucho', fam: ['proc', 'gen'], fx: { spd: 1.2, heat: 1.8 } },
  precise: { n: 'Precisa', d: 'Turbo sin pérdida de calidad: +4 % de pieza extra', fam: ['proc'], fx: { extra: 0.04, spd: 1.05 } },
  steady: { n: 'Constante', d: 'Nunca se atasca', fam: ['proc', 'logistic', 'kin'], fx: { nojam: 1 } },
  selfrepair: { n: 'Autorreparable', d: 'Recupera estado sola poco a poco', fam: ['proc', 'gen', 'kin', 'energy', 'defense'], fx: { heal: 1 } },
  efficient: { n: 'Eficiente', d: 'Genera un 12 % más', fam: ['gen'], fx: { gen: 1.12 } },
  surge: { n: 'Impulsos', d: 'A veces da un pico de +50 % unos segundos', fam: ['gen'], fx: { surge: 1 } },
  quiet: { n: 'Silenciosa', d: 'Sin vibraciones: se desgasta un 30 % menos', fam: ['proc', 'gen', 'kin'], fx: { wear: 0.7 } },
  oiled: { n: 'Bien engrasada', d: 'Gira con menos rozamiento (menos desgaste y +5 %)', fam: ['kin', 'logistic'], fx: { wear: 0.6, spd: 1.05 } },
  bright: { n: 'Intensa', d: 'Alumbra una casilla más', fam: ['light'], fx: { light: 1 } },
  cozy: { n: 'Acogedora', d: 'Cuenta doble como decoración', fam: ['home'], fx: { decor: 2 } },
  warm: { n: 'Cálida', d: 'Da un poco de calor cerca', fam: ['home', 'light', 'build'], fx: { warmB: 1 } },
  solid: { n: 'Maciza', d: 'Cuesta el doble romperla', fam: ['build', 'home', 'storage', 'defense', 'logic'], fx: { hard: 2 } },
  light2: { n: 'Ligera', d: 'Se quita en la mitad de tiempo', fam: ['build', 'home', 'logistic', 'logic', 'energy', 'fluid', 'storage'], fx: { hard: 0.5 } },
  sorted: { n: 'Ordenada', d: 'Se ordena sola al abrirla', fam: ['storage'], fx: { autosort: 1 } },
  sharp: { n: 'Afilada', d: '+25 % de daño', fam: ['defense'], fx: { dmg: 1.25 } },
  keen: { n: 'Vigilante', d: '+2 casillas de alcance', fam: ['defense'], fx: { range: 2 } },
  lucky: { n: 'Afortunada', d: '3 % de veces da una pieza de más', fam: ['proc'], fx: { extra: 0.03 } },
  sacred: { n: 'Venerable', d: 'Cuesta el triple romperla', fam: ['misc', 'core'], fx: { hard: 3 } },
  ancient: { n: 'Antigua', d: 'Lenta (−10 %) pero casi no se gasta', fam: ['proc', 'kin', 'gen'], fx: { spd: 0.9, wear: 0.3 } },
};
// Asignación estable: dentro de cada familia, los tipos se reparten los rasgos y cada uno
// lleva además pequeñas variaciones propias (no hay dos con los mismos números)
const _prof = {};
function profileRaw(t) {
  const d = BD[t] || {}, f = famOf(t);
  const pool = Object.keys(BTRAITS).filter(k => BTRAITS[k].fam.includes(f)), same = Object.keys(BD).filter(k => famOf(k) === f).sort(), i = same.indexOf(t);
  const tr = pool.length ? pool[(i + (hash2(i, 7, 11) * pool.length | 0)) % pool.length] : null;
  let sh = 0; for (const c of t) sh = (sh * 31 + c.charCodeAt(0)) | 0;
  const h = k => hash2(sh, k + i, 77), tier = d.tier || 0;
  return { fam: f, trait: tr, spd: +(0.92 + h(1) * 0.16 + tier * 0.02).toFixed(2), eff: +(0.9 + h(2) * 0.2 + tier * 0.015).toFixed(2), wear: +(0.7 + h(3) * 0.6 - tier * 0.04).toFixed(2), heat: +(0.6 + h(4) * 0.8 + (d.burn || t.includes('furnace') || t.includes('blast') ? 0.6 : 0)).toFixed(2) };
}
// Todos a la vez y en orden fijo: si dos bloques salen iguales, al segundo se le ajusta la velocidad.
function profileOf(t) {
  if (_prof[t]) return _prof[t];
  const seen = new Set();
  for (const k of Object.keys(BD).sort()) { const p = profileRaw(k); let key; while (seen.has(key = p.fam + p.trait + p.spd + p.eff + p.wear + p.heat)) p.spd = +(p.spd + 0.01).toFixed(2); seen.add(key); _prof[k] = p; }
  return _prof[t] || (_prof[t] = profileRaw(t));
}
// Cada familia enseña sus propias cifras (un interruptor no "fabrica piezas").
function famStats(b, f, P, d, st) {
  const pc = v => Math.round(v * 100) + ' %', N = ['Nivel', 'N' + ((d.tier || 0) + 1)], run = Math.round((st.run || 0) / 60) + ' min';
  switch (f) {
    case 'proc': return [['Velocidad', pc(P.spd)], ['Eficiencia', pc(P.eff)], ['Desgaste', pc(P.wear)], ['Calor', pc(P.heat)], N, ['Piezas hechas', fmt(Math.round(st.made || 0))]];
    case 'gen': return [['Potencia', pc(P.spd)], ['Rendimiento', pc(P.eff)], ['Desgaste', pc(P.wear)], ['Calor', pc(P.heat)], N, ['En marcha', run]];
    case 'kin': case 'energy': return [['Transmisión', pc(P.spd)], ['Pérdidas', Math.max(0, Math.round((1.1 - P.eff) * 100)) + ' %'], ['Desgaste', pc(P.wear)], ['Fricción', pc(P.heat)], N, ['Carga ahora', Math.round(b.E || 0) + ' E']];
    case 'logistic': case 'fluid': return [['Caudal', pc(P.spd)], ['Precisión', pc(P.eff)], ['Desgaste', pc(P.wear)], ['Atascos', P.wear > 1 ? 'Frecuentes' : 'Raros'], N, ['Activa', run]];
    case 'defense': return [['Cadencia', pc(P.spd)], ['Puntería', pc(P.eff)], ['Desgaste', pc(P.wear)], ['Alcance', '+' + trFx(b, 'range', 0)], N, ['Disparos', fmt(Math.round(st.made || 0))]];
    case 'logic': return [['Respuesta', Math.round(100 / P.spd) + ' ms'], ['Sensibilidad', pc(P.eff)], ['Fiabilidad', pc(Math.max(0.5, 2 - P.wear))], ['Estado', b.lit || b.on ? 'Encendido' : 'Apagado'], N, ['Ruido', P.heat > 1 ? 'Clic fuerte' : 'Silencioso']];
    case 'light': return [['Brillo', pc(P.eff)], ['Alcance', lightOf(b) + ' casillas'], ['Duración', pc(Math.max(0.4, 2 - P.wear))], ['Calor', pc(P.heat)], N, ['Color', P.heat > 1 ? 'Cálido' : 'Frío']];
    case 'storage': return [['Acceso', pc(P.spd)], ['Orden', pc(P.eff)], ['Robustez', pc(Math.max(0.4, 2 - P.wear))], ['Ocupación', b.slots ? Math.round(b.slots.filter(Boolean).length / b.slots.length * 100) + ' %' : '—'], N, ['Aislamiento', pc(1.4 - P.heat * 0.3)]];
    case 'home': return [['Confort', pc(P.eff)], ['Acabado', pc(P.spd)], ['Robustez', pc(Math.max(0.4, 2 - P.wear))], ['Calidez', pc(P.heat)], N, ['Decoración', '+' + trFx(b, 'decor', BD[b.type].decor || 1)]];
    default: return [['Dureza', pc(Math.max(0.4, 2 - P.wear))], ['Acabado', pc(P.eff)], ['Peso', pc(P.spd)], ['Aislamiento', pc(P.heat)], N, ['Material', P.wear < 1 ? 'Denso' : 'Ligero']];
  }
}
const TR_ADD = new Set(['save', 'extra', 'range', 'light', 'auto', 'heal', 'nojam', 'autosort', 'surge', 'warmB']);
const trFx = (b, k, def) => { const p = profileOf(b.type), tr = p.trait && BTRAITS[p.trait].fx; let v = tr && tr[k] !== undefined ? tr[k] : def; for (const id of b.up || []) { const u = id && ITEMS[id] && ITEMS[id].upgrade; if (u && u[k] !== undefined) v = TR_ADD.has(k) ? v + u[k] : v * u[k]; } const sm = b.synM; if (sm && sm[k] !== undefined) v = TR_ADD.has(k) ? v + sm[k] : v * sm[k]; return v; };
const MODES = { proc: [['eco', 'Eco', 'Más lenta (×0,7), se desgasta la mitad y a veces ahorra material'], ['norm', 'Normal', 'Equilibrada'], ['turbo', 'Turbo', 'Más rápida (×1,6) pero se calienta y se desgasta mucho']], gen: [['eco', 'Ahorro', 'Da menos (×0,7) y apenas se gasta'], ['norm', 'Normal', 'Equilibrado'], ['turbo', 'Máximo', 'Da más (×1,3) pero se calienta y se gasta']] };
const MODE_FX = { eco: { spd: 0.7, wear: 0.5, save: 0.1, heat: 0.4, gen: 0.7 }, norm: { spd: 1, wear: 1, save: 0, heat: 1, gen: 1 }, turbo: { spd: 1.6, wear: 2.5, save: 0, heat: 2.4, gen: 1.3 } };
const modeOf = b => MODE_FX[b.mode || 'norm'];
const hasCond = f => ['proc', 'gen', 'kin', 'logistic', 'energy', 'fluid', 'defense'].includes(f);
function condMul(b) { const c = b.cond ?? 100; return c <= 0 ? 0 : c < 50 ? 0.5 + c / 100 : 1; }
function blogEv(b, t) { const L2 = b.log2 || (b.log2 = []); L2.unshift([Math.floor(S.time), t]); if (L2.length > 8) L2.pop(); }
// ---------- Procesado: velocidad, ahorro, extra, desgaste, calor, lote, receta fija ----------
{ const p0 = procTick; procTick = (b, dt) => {
  const st = b.st || (b.st = { made: 0, run: 0, saved: 0, extra: 0 });
  if ((b.over || 0) > 0) { b.over -= dt; b.heat = Math.max(0, (b.heat || 0) - 12 * dt); return; }
  if ((b.cond ?? 100) <= 0 || b.jam) return;
  const m = modeOf(b), P2 = profileOf(b.type), mul = P2.spd * m.spd * trFx(b, 'spd', 1) * condMul(b);
  if (b.lockR >= 0 && b.cur < 0) { const r = RECIPES[BD[b.type].machine][b.lockR]; if (r && canStart(b, r)) { b.cur = b.lockR; b.prog = 0; } }
  const cur0 = b.cur, prog0 = b.prog, r0 = cur0 >= 0 ? RECIPES[BD[b.type].machine][cur0] : null, inv0 = r0 ? { ...b.inv } : null;
  p0(b, dt * mul);
  if (b.lockR >= 0 && b.cur >= 0 && b.cur !== b.lockR) { b.cur = -1; b.prog = 0; }
  if (b.cur >= 0 || (cur0 >= 0 && b.prog > 0)) { st.run += dt; b.heat = Math.min(130, (b.heat || 0) + dt * 2.2 * m.heat * P2.heat * trFx(b, 'heat', 1)); }
  b.heat = Math.max(0, (b.heat || 0) - dt * 3);
  if (b.heat >= 100) { b.over = 10; blogEv(b, '🔥 Sobrecalentada: parada 10 s'); if (ui.panel === b) toastErr(BD[b.type].n + ': ¡sobrecalentada!'); }
  // ¿Ha terminado una pieza?
  if (r0 && cur0 >= 0 && b.cur === -1 && b.prog === 0 && prog0 > 0) {
    st.made++;
    const save = trFx(b, 'save', 0) + m.save; if (Math.random() < save) { for (const k in r0.in) dictAdd(b.inv, k, r0.in[k]); st.saved++; }
    if (r0.out && Math.random() < trFx(b, 'extra', 0)) { give(b.out, r0.out); st.extra++; }
    b.cond = Math.max(0, (b.cond ?? 100) - 0.6 * P2.wear * m.wear * trFx(b, 'wear', 1));
    if (b.cond <= 0) blogEv(b, '💥 Averiada: necesita reparación');
    if (!trFx(b, 'nojam', 0) && b.cond < 40 && Math.random() < 0.04) { b.jam = 1; blogEv(b, '⚠ Atascada'); }
    if (trFx(b, 'auto', 0)) autoDump(b);
    if (b.batch > 0) { b.batch--; if (!b.batch) { b.off = true; blogEv(b, '✓ Lote terminado'); toast(`✓ ${b.name || BD[b.type].n}: lote terminado`); } }
  }
  if (trFx(b, 'heal', 0)) b.cond = Math.min(100, (b.cond ?? 100) + dt * 0.05);
}; }
function autoDump(b) { for (let d = 0; d < 4; d++) { const n = at(b.x + DX[d], b.y + DY[d]); if (!n || !n.slots) continue; for (const k in b.out) { const q = b.out[k]; if (q > 0) { const l = slotsAdd(n.slots, k, q); b.out[k] = l; } } return; } }
// ---------- Generadores: más o menos salida según modo, rasgo, mejoras y estado ----------
{ const g0 = genTick; genTick = dt => {
  const gens = blocks.filter(b => famOf(b.type) === 'gen' && b.E !== undefined), E0 = gens.map(b => b.E);
  g0(dt);
  gens.forEach((b, i) => { const dE = b.E - E0[i]; if (dE <= 0) return; const m = modeOf(b), P2 = profileOf(b.type);
    if ((b.cond ?? 100) <= 0) { b.E = E0[i]; return; }
    let k = m.gen * P2.eff * trFx(b, 'gen', 1) * condMul(b); if (trFx(b, 'surge', 0) && (b.surgeT || 0) > S.time) k *= 1.5; else if (trFx(b, 'surge', 0) && Math.random() < dt / 60) b.surgeT = S.time + 6;
    const cap = BD[b.type].pw ? BD[b.type].pw.cap : Infinity; b.E = Math.min(cap, E0[i] + dE * k);
    const st = b.st || (b.st = { made: 0, run: 0 }); st.run += dt; st.made += dE * k;
    b.cond = Math.max(0, (b.cond ?? 100) - dt * 0.008 * P2.wear * m.wear * trFx(b, 'wear', 1));
    b.heat = Math.max(0, Math.min(130, (b.heat || 0) + dt * (m.heat - 0.8) * P2.heat * trFx(b, 'heat', 1)));
    if (trFx(b, 'heal', 0)) b.cond = Math.min(100, b.cond + dt * 0.05); }); }; }
// Ejes, cintas y demás: se desgastan girando; mantenerlos al día también cuenta
{ let _kw = 0; const k0 = machinesTick; machinesTick = dt => { k0(dt); _kw += dt; if (_kw < 1) return; const st = _kw; _kw = 0;
  for (const b of blocks) { const f = famOf(b.type); if ((f === 'kin' && b.rpm > 0) || (f === 'logistic' && (b.items && b.items.length))) { const P2 = profileOf(b.type); b.cond = Math.max(0, (b.cond ?? 100) - st * 0.004 * P2.wear * trFx(b, 'wear', 1)); (b.st || (b.st = { run: 0 })).run += st; } } }; }
// Romper: macizas y ligeras
{ const t0 = breakTime; breakTime = b => t0(b) * trFx(b, 'hard', 1); }
// Luces: intensidad (y rasgo Intensa)
const lightOf = b => Math.max(1, (b.lightR ?? BD[b.type].light) + trFx(b, 'light', 0));
// ---------- La ventana ----------
const BT_TABS = [['uso', 'Uso'], ['ficha', 'Ficha'], ['mant', 'Mantenimiento'], ['learn', 'Aprende'], ['notes', 'Notas']];
let _btTab = 'uso', _btTimer = 0;
{ const h0 = blockPanelHTML; blockPanelHTML = b => {
  const P2 = profileOf(b.type), F2 = FAM[P2.fam], tabs = BT_TABS.filter(([k]) => k !== 'mant' || hasCond(P2.fam));
  if (!tabs.some(t => t[0] === _btTab)) _btTab = 'uso';
  const head = `<div class="bthead" style="--fc:${F2.c}"><span class="btfam">${F2.i} ${F2.n}</span>${b.name ? `<b class="btname">«${esc(b.name)}»</b>` : ''}${b.tag ? `<i class="bttag" style="background:${b.tag}"></i>` : ''}${P2.trait ? `<span class="bttr" title="${esc(BTRAITS[P2.trait].d)}">✦ ${BTRAITS[P2.trait].n}</span>` : ''}</div>`;
  const bar = `<nav class="bttabs">${tabs.map(([k, n]) => `<button data-bt="${k}" class="${_btTab === k ? 'on' : ''}">${n}</button>`).join('')}</nav>`;
  return head + bar + `<div class="btpane" data-bp="uso" ${_btTab === 'uso' ? '' : 'hidden'}>${h0(b)}</div>` + tabs.filter(([k]) => k !== 'uso').map(([k]) => `<div class="btpane" data-bp="${k}" ${_btTab === k ? '' : 'hidden'}>${BT_PANE[k](b)}</div>`).join('');
}; }
const pct = v => Math.round(v * 100) + ' %';
function statRow(lab, v, max, col, txt) { return `<div class="btst"><span>${lab}</span><span class="cb"><i style="width:${(clamp(v / max, 0, 1) * 100).toFixed(0)}%;background:${col}"></i></span><b>${txt}</b></div>`; }
const BT_PANE = {
  ficha(b) {
    const P2 = profileOf(b.type), d = BD[b.type], f = P2.fam, m = MODES[f], st = b.st || {};
    let h = `<canvas class="btscene" id="btScene" width="300" height="120"></canvas><div id="btLive"></div>`;
    if (m) h += `<div class="cssub">Modo</div><div class="btmodes">${m.map(([k, n, dd]) => `<button data-bm="${k}" class="${(b.mode || 'norm') === k ? 'on' : ''}" title="${esc(dd)}">${n}</button>`).join('')}</div>`;
    if (f === 'proc' && d.machine && RECIPES[d.machine]) {
      const list = RECIPES[d.machine].map((r, i) => r.out ? `<option value="${i}" ${b.lockR === i ? 'selected' : ''}>${esc(Object.keys(r.out).map(k => ITEMS[k] ? ITEMS[k].n : k).join(' + '))}</option>` : '').join('');
      h += `<div class="btrow"><label>Receta fija <select id="btLock"><option value="-1">Automática (la primera que pueda)</option>${list}</select></label></div>`;
      h += `<div class="btrow"><label>Lote: parar tras <input id="btBatch" type="number" min="0" max="999" value="${b.batch || 0}"> piezas <span class="mut small">(0 = sin límite)</span></label></div>`;
    }
    if (f === 'light' || d.light) { const base = BD[b.type].light || 1; h += `<div class="btrow"><label>Intensidad <input id="btLight" type="range" min="1" max="${base + 3}" value="${b.lightR ?? base}"> <b id="btLightV">${lightOf(b)}</b> casillas</label></div>`; }
    if (f === 'storage') h += `<div class="btrow"><button data-ba="sort">Ordenar ahora</button><button data-ba="compact">Juntar pilas</button><span class="mut small">${b.slots ? b.slots.filter(Boolean).length + ' / ' + b.slots.length + ' ranuras usadas' : ''}</span></div>`;
    h += `<div class="cssub">Características de este modelo</div><div class="btgrid">${famStats(b, f, P2, d, st).map(([a, v]) => `<div><small>${a}</small><b>${v}</b></div>`).join('')}</div>`;
    return h;
  },
  mant(b) {
    const ups = b.up || [null, null], have = Object.keys(UPGRADES).filter(id => invCount(id) > 0);
    return `<div id="btMant"></div><div class="btrow"><button data-ba="repair">🔧 Reparar</button><button data-ba="oil">🛢 Lubricar</button><button data-ba="clean">🧽 Limpiar</button>${b.jam ? '<button data-ba="unjam" class="pri">⚠ Desatascar</button>' : ''}</div>
      <p class="mut small">Reparar usa un <b>kit de mantenimiento</b> (o una llave inglesa y una lámina de hierro). Lubricar usa lubricante. Limpiar es gratis: quita suciedad y algo de calor.</p>
      <div class="cssub">Mejoras (2 huecos)</div><div class="btups">${ups.map((id, i) => id ? `<button class="btup on" data-bu="${i}" title="Quitar">${itemImg(id, 22)} ${esc(ITEMS[id].n)}</button>` : `<span class="btup">Hueco libre</span>`).join('')}</div>
      <div class="btrow wrap">${have.length ? have.map(id => `<button data-bi="${id}" title="${esc(ITEMS[id].d)}">${itemImg(id, 18)} Instalar ${esc(ITEMS[id].n)}</button>`).join('') : '<span class="mut small">No llevas módulos de mejora (se fabrican con circuitos).</span>'}</div>`;
  },
  learn(b) {
    const d = BD[b.type], P2 = profileOf(b.type), F2 = FAM[P2.fam], tips = [];
    let h = `<p>${esc(d.d || '')}</p><p class="mut small">${esc(F2.learn)}</p>`;
    if (P2.trait) h += `<p class="small">✦ <b>${BTRAITS[P2.trait].n}</b>: ${esc(BTRAITS[P2.trait].d)}.</p>`;
    if (d.machine && RECIPES[d.machine]) { const ins = new Set(), outs = new Set(); for (const r of RECIPES[d.machine]) { for (const k in r.in || {}) ins.add(k); for (const k in r.out || {}) outs.add(k); }
      h += `<div class="cssub">Acepta (${ins.size})</div><div class="btic">${[...ins].slice(0, 24).map(k => ITEMS[k] ? `<span data-id="${k}">${itemImg(k, 20)}</span>` : '').join('')}</div><div class="cssub">Fabrica (${outs.size})</div><div class="btic">${[...outs].slice(0, 24).map(k => ITEMS[k] ? `<span data-id="${k}">${itemImg(k, 20)}</span>` : '').join('')}</div>`; }
    const need = d.kin ? 'rotación (ejes desde un generador cinético)' + (d.minRpm ? `, mínimo ${d.minRpm} RPM` : '') : d.pw && d.pw.role === 'use' ? `energía (${d.pw.rate} FE/s por cable)` : d.burn || b.type === 'furnace' ? 'combustible (carbón, troncos…)' : d.fl ? 'fluidos por tubería' : null;
    if (need) tips.push('Necesita ' + need + '.');
    if (d.dir) tips.push('Tiene dirección: R para girarlo; la flecha indica hacia dónde saca.');
    if (d.rsable) tips.push('Se puede controlar con redstone (G cambia el modo).');
    if (d.cfg) tips.push('T ajusta: ' + d.cfg.map(p => PARAMS[p].n.toLowerCase()).join(', ') + '.');
    if (hasCond(P2.fam)) tips.push('Con el uso se gasta: por debajo del 50 % va más lento y a 0 se para. Repárala en Mantenimiento.');
    if (MODES[P2.fam]) tips.push('Turbo/Máximo rinde más pero se calienta: si llega a 100 °, se para un rato. Un disipador ayuda.');
    if (P2.fam === 'home') tips.push('Pon varios adornos en una casa con NPC: cada uno abarata sus precios.');
    if (P2.fam === 'light') tips.push('Antorchas y lámparas descubren la roca oscura de la montaña.');
    return h + (tips.length ? `<div class="cssub">Consejos</div><ul class="bttips">${tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '');
  },
  notes(b) {
    const cols = ['', '#e05a4a', '#e0b54c', '#7fd07a', '#5aa8ff', '#b07aff', '#f4f4f4'];
    return `<div class="btrow"><label>Nombre <input id="btName" maxlength="24" value="${esc(b.name || '')}" placeholder="${esc(BD[b.type].n)}"></label></div>
      <div class="btrow">Etiqueta ${cols.map(c => `<button class="btcol ${b.tag === c || (!b.tag && !c) ? 'on' : ''}" data-bc="${c}" style="background:${c || 'transparent'}">${c ? '' : '✕'}</button>`).join('')}</div>
      <div class="btrow"><label class="wide">Nota<textarea id="btNote" maxlength="200" rows="2" placeholder="Para qué la usas, qué falta…">${esc(b.note || '')}</textarea></label></div>
      <div class="cssub">Historial</div><div class="btlog">${(b.log2 || []).map(([t, s]) => `<div><span class="mut">día ${Math.floor(t / (S.gen.dayLen || DAY_LEN)) + 1}</span> ${esc(s)}</div>`).join('') || '<span class="mut small">Nada destacable todavía.</span>'}</div>`;
  },
};
// Datos que cambian (sin reconstruir la ventana)
function btLive() {
  const b = ui.panel; if (!b || ui.open !== 'inv') return; const P2 = profileOf(b.type), d = BD[b.type], st = b.st || {};
  const live = $('btLive');
  if (live) { const prog = progressOf(b), rows = [];
    if (d.machine) rows.push(statRow('Progreso', prog, 1, '#e0b54c', pct(prog)));
    if (d.pw) rows.push(statRow('Energía', b.E || 0, d.pw.cap, '#7cc4ff', fmt(Math.round(b.E || 0)) + ' FE'));
    if (d.kin) rows.push(statRow('Rotación', b.rpm || 0, 256, '#c8a070', (b.rpm || 0) + ' RPM'));
    if (hasCond(P2.fam)) { rows.push(statRow('Estado', b.cond ?? 100, 100, (b.cond ?? 100) > 50 ? '#7fd07a' : (b.cond ?? 100) > 20 ? '#e0b54c' : '#ff6b5b', Math.round(b.cond ?? 100) + ' %')); rows.push(statRow('Calor', b.heat || 0, 100, (b.heat || 0) > 75 ? '#ff6b5b' : '#ff9a4a', Math.round(b.heat || 0) + ' °')); }
    if (st.run) rows.push(`<div class="mut small">En marcha ${Math.floor(st.run / 60)} min${st.saved ? ` · ahorró material ${st.saved} veces` : ''}${st.extra ? ` · ${st.extra} piezas de regalo` : ''}${b.over > 0 ? ' · <span class="bad">enfriándose</span>' : ''}${b.jam ? ' · <span class="bad">atascada</span>' : ''}${b.batch ? ` · quedan ${b.batch} del lote` : ''}</div>`);
    const h = rows.join(''); if (live._h !== h) { live._h = h; live.innerHTML = h; } }
  const mt = $('btMant'); if (mt) { const h = statRow('Estado', b.cond ?? 100, 100, (b.cond ?? 100) > 50 ? '#7fd07a' : '#ff6b5b', Math.round(b.cond ?? 100) + ' %') + statRow('Calor', b.heat || 0, 100, '#ff9a4a', Math.round(b.heat || 0) + ' °') + statRow('Suciedad', b.dirt || 0, 100, '#8a6a4a', Math.round(b.dirt || 0) + ' %'); if (mt._h !== h) { mt._h = h; mt.innerHTML = h; } }
  btScene();
}
// Escena viva: el propio bloque en grande, animado según lo que hace
function btScene() {
  const cv = $('btScene'); if (!cv) return; const b = ui.panel, c = cv.getContext('2d'), t = performance.now() / 1000, P2 = profileOf(b.type), F2 = FAM[P2.fam];
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 300, 120);
  const g = c.createLinearGradient(0, 0, 0, 120); g.addColorStop(0, '#1c1e22'); g.addColorStop(1, '#121315'); c.fillStyle = g; c.fillRect(0, 0, 300, 120);
  c.strokeStyle = F2.c + '22'; for (let x = 0; x < 300; x += 20) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 120); c.stroke(); }
  const working = (b.cur >= 0) || b.rpm > 0 || (b.E > 0 && P2.fam === 'gen') || litOf(b) || (b.items && b.items.length);
  c.save(); c.translate(150, 62 + (working ? Math.sin(t * 8) * 0.8 : 0)); c.scale(2.4, 2.4);
  try { c.drawImage(blockSprite(b), -20, -20, 40, 40); const dr = DRAW[b.type]; if (dr && dr.a) dr.a(c, b, 0); } catch (e) { }
  c.restore();
  // Indicadores alrededor según la familia
  if (P2.fam === 'gen' && working) for (let i = 0; i < 6; i++) { const a = t * 2 + i; c.fillStyle = '#ffd84a'; c.globalAlpha = 0.6; c.fillRect(150 + Math.cos(a) * 70, 60 + Math.sin(a) * 40, 3, 3); c.globalAlpha = 1; }
  if (P2.fam === 'kin' && b.rpm) { c.strokeStyle = '#c8a070'; c.lineWidth = 2; c.beginPath(); c.arc(150, 62, 58, t * b.rpm / 20, t * b.rpm / 20 + 1.2); c.stroke(); c.lineWidth = 1; }
  if ((b.heat || 0) > 40) { c.fillStyle = `rgba(255,120,60,${(b.heat - 40) / 150})`; c.fillRect(0, 0, 300, 120); }
  if ((b.cond ?? 100) < 30 && Math.random() < 0.3) { c.fillStyle = '#ffd060'; c.fillRect(120 + Math.random() * 60, 40 + Math.random() * 40, 2, 2); }
  c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '11px system-ui'; c.textAlign = 'left'; c.fillText(working ? '● En marcha' : b.off ? '○ Apagada' : '○ En espera', 8, 14);
}
// Abrir ficha: arranca el refresco
{ const o0 = openInventory; openInventory = b => { o0(b); clearInterval(_btTimer); if (b) { if (trFx(b, 'autosort', 0) && b.slots) sortSlots(b.slots); _btTimer = setInterval(() => { if (ui.open !== 'inv' || ui.panel !== b) { clearInterval(_btTimer); return; } btLive(); }, 120); btLive(); } }; }
// Interacción
$('mInv').addEventListener('click', e => {
  const b = ui.panel; if (!b) return;
  const tb = e.target.closest('[data-bt]'); if (tb) { _btTab = tb.dataset.bt; document.querySelectorAll('[data-bt]').forEach(x => x.classList.toggle('on', x === tb)); document.querySelectorAll('[data-bp]').forEach(p => p.hidden = p.dataset.bp !== _btTab); btLive(); return; }
  const bm = e.target.closest('[data-bm]'); if (bm) { b.mode = bm.dataset.bm; blogEv(b, 'Modo: ' + bm.textContent); rerender(b); return; }
  const bc = e.target.closest('[data-bc]'); if (bc) { b.tag = bc.dataset.bc || null; rerender(b); return; }
  const bi = e.target.closest('[data-bi]'); if (bi) { const id = bi.dataset.bi; b.up = b.up || [null, null]; const i = b.up.indexOf(null); if (i < 0) { toastErr('No quedan huecos: quita un módulo antes'); return; } if (invTake(id, 1)) { b.up[i] = id; blogEv(b, 'Instalado: ' + ITEMS[id].n); toast('Instalado ' + ITEMS[id].n); } rerender(b); return; }
  const bu = e.target.closest('[data-bu]'); if (bu) { const i = +bu.dataset.bu, id = b.up[i]; if (id) { invAdd(id, 1); b.up[i] = null; blogEv(b, 'Quitado: ' + ITEMS[id].n); } rerender(b); return; }
  const ba = e.target.closest('[data-ba]'); if (!ba) return;
  switch (ba.dataset.ba) {
    case 'repair': if (invCount('maintKit')) invTake('maintKit', 1); else if (invCount('wrench') && invCount(MF.iron.plate)) invTake(MF.iron.plate, 1); else { toastErr('Necesitas un kit de mantenimiento (o llave inglesa + lámina de hierro)'); return; } b.cond = 100; b.jam = 0; blogEv(b, '🔧 Reparada'); toast('🔧 Reparada como nueva'); if (typeof fxBurst === 'function') fxBurst(b.x * T + 16, b.y * T + 16, 14, { col: '#ffd34a', sp: 60, life: 0.6, glow: 1 }); gainXP('craft', 4); break;
    case 'oil': if (!invTake('lubricant', 1)) { toastErr('No llevas lubricante'); return; } b.cond = Math.min(100, (b.cond ?? 100) + 40); b.heat = Math.max(0, (b.heat || 0) - 30); blogEv(b, '🛢 Lubricada'); toast('🛢 Lubricada: +40 % de estado'); break;
    case 'clean': b.dirt = 0; b.heat = Math.max(0, (b.heat || 0) - 10); b.cond = Math.min(100, (b.cond ?? 100) + 3); blogEv(b, '🧽 Limpiada'); toast('🧽 Limpia'); break;
    case 'unjam': b.jam = 0; b.cond = Math.max(1, (b.cond ?? 100) - 5); blogEv(b, 'Desatascada'); toast('Desatascada'); break;
    case 'sort': if (b.slots) { sortSlots(b.slots); invVersion++; toast('Ordenado'); } break;
    case 'compact': if (b.slots) { const all = {}; for (const s of b.slots) if (s) all[s.id] = (all[s.id] || 0) + s.n; b.slots.fill(null); for (const k in all) slotsAdd(b.slots, k, all[k]); invVersion++; toast('Pilas juntas'); } break;
  }
  rerender(b);
});
$('mInv').addEventListener('change', e => {
  const b = ui.panel; if (!b) return;
  if (e.target.id === 'btLock') { b.lockR = +e.target.value; b.cur = -1; b.prog = 0; blogEv(b, b.lockR >= 0 ? 'Receta fija' : 'Receta automática'); }
  if (e.target.id === 'btBatch') { b.batch = clamp(+e.target.value | 0, 0, 999); if (b.batch) { b.off = false; blogEv(b, 'Lote de ' + b.batch); } }
  if (e.target.id === 'btName') { b.name = e.target.value.trim().slice(0, 24) || null; }
  if (e.target.id === 'btNote') { b.note = e.target.value.slice(0, 200) || null; }
});
$('mInv').addEventListener('input', e => { const b = ui.panel; if (b && e.target.id === 'btLight') { b.lightR = +e.target.value; const v = $('btLightV'); if (v) v.textContent = lightOf(b); _fogDirty = true; } });
$('mInv').addEventListener('keydown', e => { if (e.target.id === 'btName' || e.target.id === 'btNote' || e.target.id === 'btBatch') e.stopPropagation(); });
function rerender(b) { invVersion++; $('invRight').innerHTML = blockPanelHTML(b); stationOpen(b); _panelVer++; refreshInvUI(true); btLive(); }
// Nombre y estado en la tarjeta del cursor
{ const b0 = blockCard; blockCard = b => { let h = b0(b); const P2 = profileOf(b.type), extra = [];
  if (b.name) extra.push(`«${esc(b.name)}»`); if (P2.trait) extra.push('✦ ' + BTRAITS[P2.trait].n); if (hasCond(P2.fam) && (b.cond ?? 100) < 100) extra.push(`estado ${Math.round(b.cond ?? 100)} %`); if (b.mode && b.mode !== 'norm') extra.push('modo ' + (MODES[P2.fam] || []).find(m => m[0] === b.mode)?.[1]); if (b.jam) extra.push('<span class="bad">atascada</span>'); if ((b.over || 0) > 0) extra.push('<span class="bad">enfriándose</span>');
  return extra.length ? h.replace('</div>', `</div><div class="hcm">${extra.join(' · ')}</div>`) : h; }; }
