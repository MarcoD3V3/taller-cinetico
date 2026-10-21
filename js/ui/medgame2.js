'use strict';
// =====================================================================================
//  Medicina, segunda parte.
//  1) Las heridas evolucionan con lo que haces (cada pocos segundos, con lógica):
//     · Empeoran: infección sin tratar (se agrava, da fiebre y puede envenenar la sangre),
//       correr o trabajar con una fractura, un esguince o una luxación sin sujetar, cortes
//       que se reabren al picar con ese brazo, quemaduras junto al fuego, congelación con
//       frío, quemadura solar al sol, venda empapada por la lluvia, algo clavado al moverte.
//     · Mejoran: reposar (quieto o durmiendo), comer y beber bien, el calor sobre la
//       congelación, la lluvia o el agua sobre las quemaduras, la sombra y la noche sobre el sol.
//     La ficha muestra si cada herida «mejora» o «empeora» y por qué.
//  2) Estados nuevos: shock (mucha sangre perdida), fiebre y golpe de calor.
//  3) 10 actividades nuevas: trazar pomada, sacar piedrecillas, masaje cardíaco, mantener
//     el equilibrio inmovilizando, quitar puntos, drenar un absceso, elegir la medicina,
//     atar con nudo, abanicar y beber a sorbos.
// =====================================================================================
Object.assign(WT, {
  shock: { n: 'Shock', i: '⚠', heal: 160, bleed: 0, pain: 20, dmg: 6 },
  fever: { n: 'Fiebre', i: '🌡', heal: 300, bleed: 0, pain: 12, dmg: 4 },
  heatstroke: { n: 'Golpe de calor', i: '♨', heal: 200, bleed: 0, pain: 16, dmg: 6 },
});
Object.assign(PROCS, {
  ointment: { n: 'Untar pomada', i: '〰', mech: 'trace', parts: ALL_P, use: ['salve', 'itchCream', 'arnica', 'burnGel'], fx: 'gel', how: 'Con el botón pulsado, sigue la línea de la herida de punta a punta sin salirte.' },
  debris: { n: 'Sacar piedrecillas', i: '⦁', mech: 'sort', parts: ALL_P, tool: ['tweezers'], fx: 'clean', how: 'Arrastra cada piedrecilla de la herida a la bandeja.' },
  cpr: { n: 'Masaje cardíaco', i: '♥', mech: 'pump', parts: ['torso'], fx: 'cpr', how: 'Pulsa al ritmo del corazón (un compás constante, ni rápido ni lento): 12 compresiones.' },
  immobilize: { n: 'Inmovilizar', i: '⊖', mech: 'balance', parts: ['head', 'torso', 'legL', 'legR'], fx: 'immob', how: 'Mantén la burbuja en el centro moviendo el ratón a los lados mientras el cuerpo se tambalea.' },
  removeStitches: { n: 'Quitar los puntos', i: '✂', mech: 'snip', parts: ALL_P, tool: ['scalpel', 'tweezers'], fx: 'unstitch', extra: w => w.st && wFrac(w) < 0.45, how: 'Corta cada punto haciendo clic justo en su nudo.' },
  drainAbscess: { n: 'Drenar el absceso', i: '◎', mech: 'squeeze', parts: ALL_P, use: ['gauze', 'bandage'], tool: ['scalpel'], fx: 'drain2', extra: w => w.inf >= 2, how: 'Mantén pulsado para apretar y suelta cuando el círculo toque el anillo verde.' },
  medicine: { n: 'Elegir la medicina', i: '💊', mech: 'match', parts: ['head', 'torso'], use: ['painkiller', 'herbalTea', 'antidote', 'poultice'], fx: 'meds', how: 'Lee el síntoma y elige el remedio correcto (3 veces).' },
  tieSplint: { n: 'Atar la férula', i: '➿', mech: 'knot', parts: EXT_P, use: ['rope', 'twine'], fx: 'splint', how: 'Dibuja un lazo alrededor del nudo y luego tira hacia fuera para apretarlo.' },
  fanBurn: { n: 'Abanicar', i: '🪭', mech: 'fan', parts: ALL_P, fx: 'cool', how: 'Mueve el ratón deprisa de lado a lado sobre la zona para refrescarla.' },
  drinkSlow: { n: 'Beber a sorbos', i: '🥤', mech: 'sip', parts: ['head'], use: ['waterBottle', 'isotonic', 'coconutWater'], fx: 'sip', how: 'Pulsa para beber cuando el vaso esté en la zona segura; si bebes de golpe te atragantas.' },
  blanket: { n: 'Abrigar con manta', i: '🛏', mech: 'place', parts: ['torso'], use: ['cloth', 'wool', 'fur'], fx: 'warm', how: 'Arrastra la manta sobre el cuerpo.' },
});
Object.assign(W_STEPS, {
  shock: [['press', 'tourniquet'], ['cpr'], ['blanket']],
  fever: [['medicine'], ['coldPack', 'drinkSlow']],
  heatstroke: [['fanBurn', 'coolBurn'], ['drinkSlow']],
});
// Más formas de cumplir los pasos de siempre
const addOpt = (t, step, id) => { const st = W_STEPS[t]; if (st && st[step] && !st[step].includes(id)) st[step].push(id); };
addOpt('scratch', 1, 'ointment'); addOpt('rash', 1, 'ointment'); addOpt('burn', 1, 'ointment'); addOpt('sunburn', 0, 'fanBurn'); addOpt('sunburn', 0, 'ointment'); addOpt('bruise', 0, 'ointment');
addOpt('deepCut', 1, 'debris'); addOpt('cut', 1, 'debris'); addOpt('puncture', 1, 'debris'); addOpt('scratch', 0, 'debris');
addOpt('fracture', 1, 'tieSplint'); addOpt('dislocation', 1, 'tieSplint'); addOpt('concussion', 0, 'immobilize'); addOpt('burn', 0, 'fanBurn');
if (W_STEPS.concussion) W_STEPS.concussion.push(['immobilize', 'drinkSlow']);
// Procedimientos extra según el estado (quitar puntos, drenar abscesos)
{ const pf0 = procsFor; procsFor = (w, part) => { const out = pf0(w, part); for (const id in PROCS) { const p = PROCS[id]; if (p.extra && p.extra(w) && p.parts.includes(part) && !out.some(o => o.id === id)) out.push({ id, step: -1, next: false }); } return out; }; }
{ const ap0 = applyProc; applyProc = (id, part, wi, q = 1) => {
  const w = wi >= 0 && S.pc.parts[part] ? S.pc.parts[part][wi] : null, fx = PROCS[id] && PROCS[id].fx;
  const r = ap0(id, part, wi, q); if (!r || !w) return r;
  if (fx === 'unstitch') { w.st = 0; w.left *= 0.4; toast('✂ Puntos fuera: cicatriza limpia'); }
  if (fx === 'drain2') { w.inf = 0; w.dis = 1; w.left *= 0.7; S.pc.poison = Math.max(0, S.pc.poison - 10); }
  if (fx === 'cpr') S.pc.hp = Math.min(maxHp(), S.pc.hp + 12);
  if (fx === 'meds') S.pc.pk = Math.max(S.pc.pk || 0, 120);
  if (fx === 'sip') { S.pc.water = Math.min(100, S.pc.water + 25); }
  if (fx === 'warm') S.pc.temp = Math.min(37, S.pc.temp + 0.6);
  return r; }; }
// ---------- Evolución ----------
const WOUND_OPEN = new Set(['cut', 'deepCut', 'bite', 'scratch', 'puncture', 'embedded']);
const LEG_P = new Set(['legL', 'legR', 'footL', 'footR']), ARMS = new Set(['armL', 'armR', 'handL', 'handR']);
let _evoT = 0, _restT = 0;
function woundTrend(w, p) {
  const pc = S.pc, t = w.t, mov = pmove.moving, run = pmove.sprint, work = ui.mine && ui.mine.t > 0, why = [];
  let k = 0; // > 0 empeora (s por s de curación que se pierden), < 0 mejora más rápido
  if (w.inf) { k += 0.6 * w.inf; why.push(w.inf >= 2 ? 'infección grave' : 'infección'); }
  if ((t === 'fracture' && !w.sp) || ((t === 'sprain' || t === 'dislocation') && !w.b && !w.sl)) { if (LEG_P.has(p) && mov) { k += run ? 1.6 : 0.7; why.push(run ? 'corres sin sujetarla' : 'andas sin sujetarla'); } if (ARMS.has(p) && work) { k += 0.9; why.push('trabajas con ese brazo'); } }
  if (WOUND_OPEN.has(t) && ARMS.has(p) && work && !w.b && !w.st) { k += 0.5; why.push('se reabre al trabajar'); if (Math.random() < 0.04) w.pr = 0; }
  if ((w.obj ?? WT[t].obj) && mov) { k += 0.4; why.push('lo clavado se mueve'); }
  if (t === 'burn' || t === 'sunburn') { if (_warm) { k += 0.8; why.push('junto al fuego'); } if (WX.wet > 30 || P.swim) { k -= 1; why.push('el agua la refresca'); } }
  if (t === 'sunburn' && _hot && daylight() > 0.6 && !buff('sunproof')) { k += 0.7; why.push('sigues al sol'); }
  if (t === 'frostbite') { if (ambient() < 5) { k += 0.9; why.push('sigue haciendo frío'); } else if (_warm) { k -= 1.2; why.push('el calor la cura'); } }
  if (t === 'heatstroke' && _hot && daylight() > 0.5) { k += 0.8; why.push('el calor la agrava'); }
  if (w.b && WX.wet > 75 && WOUND_OPEN.has(t)) { k += 0.3; why.push('venda empapada'); if (Math.random() < 0.02) { w.b = 0; toast('💧 Se te ha empapado la venda: cámbiala'); } }
  // Lo que ayuda
  if (_restT > 4) { k -= 0.6; why.push('reposas'); }
  if (pc.food > 60 && pc.water > 60) k -= 0.2; else if (pc.food < 20 || pc.water < 20) { k += 0.3; why.push('hambre o sed'); }
  w.trend = k > 0.15 ? 1 : k < -0.15 ? -1 : 0; w.why = why.slice(0, 2).join(', ');
  return k;
}
function evoTick(dt) {
  if (!survOn() || !S.pc) return; const pc = S.pc;
  _restT = pmove.moving || (ui.mine && ui.mine.t > 0) ? 0 : _restT + dt;
  _evoT -= dt; if (_evoT > 0) return; const step = 1 - _evoT; _evoT = 1;
  for (const p of PARTS) for (const w of pc.parts[p]) {
    const k = woundTrend(w, p), H = WT[w.t].heal;
    if (k > 0) { w.left = Math.min(H * 1.25, w.left + k * step * 1.5); w.d = Math.min(WT[w.t].dmg * 2, w.d * (1 + 0.004 * k)); }
    else if (k < 0) w.left = Math.max(0, w.left + k * step * 1.2);
    // La infección sin tratar se agrava: fiebre y, al final, sangre envenenada
    if (w.inf) { w.infT = (w.infT || 0) + step; if (w.inf === 1 && w.infT > 150) { w.inf = 2; toast(`⚠ ${WT[w.t].n}: la infección se agrava (absceso). Drénala o desinféctala`); if (!hasWound('fever')) medEvent('fever', ['head'], 'Infección'); } if (w.inf === 2 && w.infT > 360) { pc.poison = Math.max(pc.poison, 12); pc.cause = 'Sangre envenenada'; } }
  }
  // Estados nuevos
  if (pc.hp < maxHp() * 0.22 && bleedOf() > 0.05 && !hasWound('shock')) medEvent('shock', ['torso'], 'Pérdida de sangre');
  if (WX.type === 'heat' && pc.water < 30 && !hasWound('heatstroke') && Math.random() < 0.08) medEvent('heatstroke', ['torso'], 'Golpe de calor');
  if (hasWound('shock')) { pc.stam = Math.max(0, pc.stam - 4); }
}
{ const s0 = survTick; survTick = (dt, m, s) => { s0(dt, m, s); evoTick(dt); }; }
// Tendencia en la ficha (junto a cada herida)
// (la etiqueta se añade aquí para no tocar la plantilla original)
{ const h0 = CS_PANE.health; CS_PANE.health = () => { let h = h0(); const L2 = []; for (const p of PARTS) { if (_charPart && p !== _charPart) continue; S.pc.parts[p].forEach(w => L2.push(w)); }
  let i = 0; return h.replace(/<span class="wb">/g, m => { const w = L2[i++]; if (!w) return m; const tr = w.trend > 0 ? `<span class="bad" title="${esc(w.why || '')}">▼ empeora${w.why ? ' · ' + esc(w.why) : ''}</span>` : w.trend < 0 ? `<span class="good" title="${esc(w.why || '')}">▲ mejora${w.why ? ' · ' + esc(w.why) : ''}</span>` : ''; return tr + m; }); }; }
// ---------- 10 mecánicas nuevas ----------
Object.assign(MGMECH, {
  // Trazar: sigue la línea con el botón pulsado
  trace: { init(G) { G.pts = Array.from({ length: 40 }, (_, i) => ({ x: G.wx - 150 + i * 7.7, y: G.wy + Math.sin(i / 6 + G.seed) * 22 })); G.k = 0; },
    update(G) { if (!G.down) return; const p = G.pts[G.k]; if (!p) return; const d = mgd(G.mx, G.my, p.x, p.y); if (d < 16) { G.k++; } else if (d > 40 && G.k > 0 && mgd(G.mx, G.my, G.pts[G.k - 1].x, G.pts[G.k - 1].y) > 40) { mgErr('Te has salido de la línea'); G.k = Math.max(0, G.k - 6); G.down = false; } G.prog = G.k / G.pts.length; },
    draw(c, G) { c.setLineDash([4, 5]); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; c.beginPath(); G.pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke(); c.setLineDash([]); c.strokeStyle = 'rgba(200,240,200,.8)'; c.lineWidth = 9; c.beginPath(); G.pts.slice(0, G.k + 1).forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke(); c.lineWidth = 1; const p = G.pts[G.k]; if (p) { c.fillStyle = '#ffd34a'; c.beginPath(); c.arc(p.x, p.y, 6 + Math.sin(G.t * 8) * 1.5, 0, 7); c.fill(); } } },
  // Clasificar: arrastra cada piedrecilla a la bandeja
  sort: { init(G) { G.items = Array.from({ length: 5 }, (_, i) => ({ x: G.wx - 50 + i * 25 + Math.sin(i * 7) * 6, y: G.wy + Math.cos(i * 5) * 12, ok: 0 })); G.tray = { x: 560, y: 300 }; G.drag = null; },
    update(G) { if (G.click) G.drag = G.items.find(s => !s.ok && mgd(G.mx, G.my, s.x, s.y) < 12) || null; if (G.drag && G.down) { G.drag.x = G.mx; G.drag.y = G.my; } if (G.drag && G.up) { if (mgd(G.drag.x, G.drag.y, G.tray.x, G.tray.y) < 45) { G.drag.ok = 1; tone(700, 0.04, 'square', 0.02); } else if (mgd(G.drag.x, G.drag.y, G.wx, G.wy) > 60) mgErr('Se ha caído: a la bandeja'); G.drag = null; } G.prog = G.items.filter(s => s.ok).length / G.items.length; },
    draw(c, G) { c.fillStyle = '#c8ccd0'; c.beginPath(); c.ellipse(G.tray.x, G.tray.y, 50, 22, 0, 0, 7); c.fill(); c.fillStyle = '#9aa0a8'; c.beginPath(); c.ellipse(G.tray.x, G.tray.y, 40, 15, 0, 0, 7); c.fill(); for (const s of G.items) { c.fillStyle = '#6a5a4a'; c.beginPath(); c.arc(s.x, s.y, 5, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(s.x - 2, s.y - 3, 2, 2); } if (G.drag) mgTool(c, G); } },
  // Masaje cardíaco: compresiones a ritmo constante
  pump: { init(G) { G.n = 0; G.need = 12; G.last = 0; G.beat = 0.6; },
    update(G) { if (!G.click) return; const dtb = G.t - G.last; G.last = G.t; if (G.n === 0 || Math.abs(dtb - G.beat) < 0.16) { G.n++; tone(140, 0.06, 'sine', 0.06); } else { G.n = Math.max(0, G.n - 2); mgErr(dtb < G.beat ? 'Demasiado rápido' : 'Demasiado lento'); } G.prog = G.n / G.need; },
    draw(c, G) { const ph = ((G.t - G.last) / G.beat) % 1, r = 30 + (1 - Math.min(1, (G.t - G.last) / G.beat)) * 12; c.strokeStyle = 'rgba(255,90,80,.8)'; c.lineWidth = 4; c.beginPath(); c.arc(G.wx, G.wy, r, 0, 7); c.stroke(); c.lineWidth = 1; c.fillStyle = ph > 0.8 || ph < 0.1 ? 'rgba(122,224,122,.9)' : 'rgba(255,255,255,.3)'; c.beginPath(); c.arc(G.wx, G.wy, 10, 0, 7); c.fill(); } },
  // Equilibrio: la burbuja se escapa, la devuelves al centro
  balance: { init(G) { G.b = 0; G.v = 0; G.hold = 0; },
    update(G, dt) { G.v += (Math.sin(G.t * 1.7) * 0.9 + Math.sin(G.t * 3.1) * 0.5) * dt * 1.4; G.v *= 0.98; const push = (G.mx - 320) / 220; G.b = clamp(G.b + (G.v - push * 0.9) * dt, -1, 1); if (Math.abs(G.b) < 0.25) G.hold += dt; else { G.hold = Math.max(0, G.hold - dt * 0.5); if (Math.abs(G.b) >= 0.99) { mgErr('¡Se ha movido!'); G.b = 0; G.v = 0; } } G.prog = G.hold / 4; },
    draw(c, G) { c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(120, 300, 400, 24); c.fillStyle = 'rgba(122,224,122,.6)'; c.fillRect(270, 300, 100, 24); c.fillStyle = '#8ad8ff'; c.beginPath(); c.arc(320 + G.b * 190, 312, 10, 0, 7); c.fill(); } },
  // Quitar puntos: clic en cada nudo
  snip: { init(G) { G.k = Array.from({ length: 6 }, (_, i) => ({ x: G.wx - 80 + i * 32, y: G.wy + (i % 2 ? 8 : -8), cut: 0 })); },
    update(G) { if (!G.click) return; const s = G.k.find(k => !k.cut && mgd(G.mx, G.my, k.x, k.y) < 7); if (s) { s.cut = 1; tone(1500, 0.03, 'square', 0.02); } else if (mgd(G.mx, G.my, G.wx, G.wy) < 110) mgErr('Corta justo en el nudo'); G.prog = G.k.filter(k => k.cut).length / G.k.length; },
    draw(c, G) { for (const k of G.k) { c.strokeStyle = k.cut ? 'rgba(42,42,58,.25)' : '#2a2a3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(k.x - 5, k.y - 14); c.lineTo(k.x + 5, k.y + 14); c.stroke(); if (!k.cut) { c.fillStyle = '#ffd34a'; c.beginPath(); c.arc(k.x, k.y, 3.5, 0, 7); c.fill(); } } c.lineWidth = 1; } },
  // Apretar: el círculo encoge mientras aprietas; suelta al tocar el anillo
  squeeze: { init(G) { G.r = 60; G.ok = 0; G.need = 2; },
    update(G, dt) { G.r = G.down ? Math.max(4, G.r - 34 * dt) : Math.min(60, G.r + 50 * dt); if (G.up) { if (Math.abs(G.r - 26) < 6) { G.ok++; mgSay('Sale el pus…'); G.r = 60; } else if (G.r < 60) { mgErr(G.r < 26 ? 'Demasiado fuerte' : 'Aprieta más'); G.r = 60; } } if (G.r <= 4) { mgErr('¡Demasiado fuerte!'); G.r = 60; G.down = false; } G.prog = G.ok / G.need; },
    draw(c, G) { c.fillStyle = 'rgba(220,200,60,.45)'; c.beginPath(); c.arc(G.wx, G.wy, 22, 0, 7); c.fill(); c.strokeStyle = 'rgba(122,224,122,.9)'; c.lineWidth = 4; c.beginPath(); c.arc(G.wx, G.wy, 26, 0, 7); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(G.wx, G.wy, G.r, 0, 7); c.stroke(); c.lineWidth = 1; } },
  // Elegir la medicina correcta según el síntoma
  match: { init(G) { G.q = this.next(); G.ok = 0; G.need = 3; },
    next() { const Q = [['Dolor de cabeza fuerte', 'Infusión calmante'], ['Fiebre alta', 'Infusión de hierbas'], ['Herida infectada', 'Cataplasma'], ['Mordedura venenosa', 'Antídoto'], ['Mucho dolor de un golpe', 'Infusión calmante']], o = ['Infusión calmante', 'Infusión de hierbas', 'Cataplasma', 'Antídoto'], q = Q[(Math.random() * Q.length) | 0]; return { s: q[0], a: q[1], o }; },
    update(G) { if (!G.click) return; for (let i = 0; i < 4; i++) { const x = 90 + i * 150, y = 250; if (Math.abs(G.mx - x) < 65 && Math.abs(G.my - y) < 30) { if (G.q.o[i] === G.q.a) { G.ok++; mgSay('¡Correcto!', 0.7); G.q = this.next(); } else mgErr('Ese no es el remedio'); } } G.prog = G.ok / G.need; },
    draw(c, G) { c.fillStyle = 'rgba(14,15,17,.8)'; c.fillRect(120, 70, 400, 60); c.fillStyle = '#ffd34a'; c.font = 'bold 18px system-ui'; c.textAlign = 'center'; c.fillText('Síntoma: ' + G.q.s, 320, 108); c.font = '13px system-ui'; G.q.o.forEach((n, i) => { const x = 90 + i * 150; c.fillStyle = Math.abs(G.mx - x) < 65 && Math.abs(G.my - 250) < 30 ? '#3a3e46' : '#24262a'; c.fillRect(x - 65, 220, 130, 60); c.strokeStyle = '#ffffff22'; c.strokeRect(x - 65, 220, 130, 60); c.fillStyle = '#ece6d8'; c.fillText(n, x, 254); }); } },
  // Nudo: dibuja un lazo y tira hacia fuera
  knot: { init(G) { G.acc = 0; G.pa = null; G.ph = 0; },
    update(G) { const a = Math.atan2(G.my - G.wy, G.mx - G.wx), r = mgd(G.mx, G.my, G.wx, G.wy);
      if (G.ph === 0) { if (G.down && r > 20 && r < 80) { if (G.pa !== null) { let da = a - G.pa; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; G.acc += da; } G.pa = a; } else G.pa = null; if (Math.abs(G.acc) > 6.28) { G.ph = 1; mgSay('Ahora tira hacia fuera'); } G.prog = Math.abs(G.acc) / 6.28 * 0.6; }
      else { if (G.down && r > 150) { G.prog = 1; tone(400, 0.08, 'triangle', 0.04); } else G.prog = 0.6 + Math.min(0.39, Math.max(0, r - 80) / 180); } },
    draw(c, G) { c.strokeStyle = '#c8a870'; c.lineWidth = 3; c.beginPath(); c.arc(G.wx, G.wy, 50, 0, Math.min(6.28, Math.abs(G.acc))); c.stroke(); c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,.3)'; c.setLineDash([4, 4]); c.beginPath(); c.arc(G.wx, G.wy, G.ph ? 150 : 50, 0, 7); c.stroke(); c.setLineDash([]); } },
  // Abanicar: movimiento rápido de lado a lado
  fan: { init(G) { G.e = 0; },
    update(G, dt) { const sp = Math.abs(G.mx - G.lx) / Math.max(dt, 0.001), over = mgd(G.mx, G.my, G.wx, G.wy) < 170; if (over && sp > 900) G.e += dt; else G.e = Math.max(0, G.e - dt * 0.3); G.prog = G.e / 3; },
    draw(c, G) { c.save(); c.translate(G.mx, G.my); c.rotate(Math.sin(G.t * 20) * 0.4); c.fillStyle = '#e8d8b0'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 34, -2.4, -0.7); c.closePath(); c.fill(); c.restore(); c.strokeStyle = 'rgba(200,230,255,.5)'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(G.wx, G.wy, 40 + ((G.t * 60 + i * 25) % 100), -0.6, 0.6); c.stroke(); } } },
  // Beber a sorbos: el vaso se inclina solo; bebe cuando está en zona segura
  sip: { init(G) { G.ok = 0; G.need = 4; },
    update(G) { G.tilt = 0.5 + 0.5 * Math.sin(G.t * 1.9); if (G.click) { if (G.tilt > 0.35 && G.tilt < 0.6) { G.ok++; tone(500, 0.05, 'sine', 0.03); mgSay('Glup', 0.4); } else mgErr(G.tilt >= 0.6 ? '¡Te atragantas! Despacio' : 'Casi no llega el agua'); } G.prog = G.ok / G.need; },
    draw(c, G) { c.save(); c.translate(420, 200); c.rotate(-G.tilt * 1.3); c.fillStyle = 'rgba(200,230,255,.6)'; c.fillRect(-18, -40, 36, 70); c.fillStyle = 'rgba(90,160,230,.7)'; c.fillRect(-18, -10 + G.tilt * 20, 36, 40 - G.tilt * 20); c.restore(); mgGauge(c, G.tilt, 0.35, 0.6); } },
});
