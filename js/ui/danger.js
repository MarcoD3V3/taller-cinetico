'use strict';
// =====================================================================================
//  Peligro y muerte:
//   · Registro de la vida y de quién te la quita (golpes, enfermedad, hambre, sed, frío,
//     sangrado, veneno, ahogo…), cada segundo, los últimos 3 minutos.
//   · Aviso cuando algo te quita vida poco a poco (enfermedad, hambre, frío…), con el ritmo.
//   · Vida baja: viñeta roja que late como un corazón, más fuerte y rápida cuanto peor,
//     latidos que se oyen y la pantalla que pierde color.
//   · Pantalla de muerte: gráfica de tu vida hasta el final, de qué te quitaba vida (con
//     porcentajes), datos de la partida y cómo evitarlo la próxima vez.
// =====================================================================================
const DG = { hist: [], src: {}, last: 0, warnT: {}, beatT: 0 };
const dgSrc = (k, v) => { if (v > 0) DG.src[k] = (DG.src[k] || 0) + v; };
// Golpes: se apuntan con su causa
{ const h0 = hitPlayer; hitPlayer = (dmg, wound, cause, el) => { const b = S && S.pc ? S.pc.hp : 0; const r = h0(dmg, wound, cause, el); if (S && S.pc) { const lost = b - S.pc.hp; if (lost > 0) { DG.hitLost = (DG.hitLost || 0) + lost; dgSrc(String(cause || 'Golpes').replace(/^Atacado por: /, '⚔ '), lost); DG.hist.push({ t: S.pc.alive || 0, hp: Math.max(0, S.pc.hp), max: maxHp(), hit: true }); if (DG.hist.length > 240) DG.hist.shift(); } } return r; }; }
// Lo que va bajando solo: a qué se debe ahora mismo
function dgDrains() {
  const pc = S.pc, out = [];
  const ill = typeof illFx === 'function' ? illFx('hp', 0) : 0; if (ill > 0) out.push(['🤒 Enfermedad', ill]);
  if (pc.food <= 0) out.push(['🍖 Hambre', 0.25]); if (pc.water <= 0) out.push(['💧 Sed', 0.4]);
  const bl = typeof bleedOf === 'function' ? bleedOf() : 0; if (bl > 0) out.push(['🩸 Sangrado', bl]);
  if (pc.poison > 0) out.push(['🤢 Veneno', 0.3]); if (pc.temp < 35) out.push(['🥶 Frío', 0.12]);
  if (pc.cause === 'Ahogado' && P.swim === 2 && pc.stam <= 0) out.push(['🌊 Ahogo', 2.2]);
  return out;
}
setInterval(() => {
  if (!S || !S.pc || typeof survOn !== 'function' || !survOn() || ui.open === 'dead') return;
  const pc = S.pc, now = pc.alive || 0, drains = dgDrains();
  // Reparto de lo perdido este segundo (lo que no fue golpe, a los desgastes)
  const lost = Math.max(0, (DG.prevHp ?? pc.hp) - pc.hp - (DG.hitLost || 0)); DG.hitLost = 0; DG.prevHp = pc.hp;
  if (lost > 0 && drains.length) { const tot = drains.reduce((s, d) => s + d[1], 0); for (const [k, v] of drains) dgSrc(k, lost * v / tot); }
  DG.hist.push({ t: now, hp: pc.hp, max: maxHp(), hit: lost > 0 || false }); if (DG.hist.length > 180) DG.hist.shift();
  // Aviso de lo que te quita vida poco a poco
  for (const [k, v] of drains) if (v > 0.03 && (DG.warnT[k] || 0) < now) { DG.warnT[k] = now + 25; toastErr(`${k} te está quitando vida (−${(v * 60).toFixed(0)} por minuto)`); fxText(S.player.x, S.player.y - 26, '−' + k.split(' ')[0], '#ff8a7a'); }
}, 1000);
// ---------- Vida baja: viñeta que late, latidos y sin color ----------
const dgV = document.createElement('div'); dgV.id = 'lowLife'; document.body.appendChild(dgV);
function dgBeat() { try { tone(62, 0.09, 'sine', 0.09, 0.7); setTimeout(() => tone(55, 0.08, 'sine', 0.07, 0.7), 140); } catch (e) { } }
let _dgOn = 0;
setInterval(() => {
  const on = S && S.pc && survOn() && ui.open !== 'dead' && !(ui.open === 'title'); const f = on ? S.pc.hp / maxHp() : 1;
  const lv = !on ? 0 : f < 0.12 ? 3 : f < 0.22 ? 2 : f < 0.35 ? 1 : 0;
  if (lv !== _dgOn) { _dgOn = lv; dgV.className = lv ? 'l' + lv : ''; document.body.classList.toggle('dying', lv >= 2); if (lv >= 2) toastErr(lv === 3 ? '❤ ¡Estás a punto de morir! Cúrate o huye ya' : '❤ Vida muy baja: aléjate del peligro y cúrate'); }
  if (lv) { DG.beatT -= 0.25; if (DG.beatT <= 0) { DG.beatT = [0, 1.3, 0.85, 0.55][lv]; dgBeat(); dgV.classList.remove('beat'); void dgV.offsetWidth; dgV.classList.add('beat'); } }
}, 250);
// ---------- Pantalla de muerte ----------
const DEATH_TIPS = {
  '⚔': ['Lleva un arma y un escudo (hay de madera y hueso para empezar).', 'Ponte armadura: casco, peto y botas de piel ya ayudan mucho.', 'Golpea en abanico: la espada alcanza a todos los que tienes delante.', 'De noche salen más enemigos: refúgiate en casa con techo.'],
  '🤒': ['Cura las enfermedades con su remedio (pasa el ratón por el icono).', 'Bajo techo y junto al fuego no te resfrías.', 'Comido, bebido y descansado te curas antes.'],
  '🍖': ['Lleva siempre comida: pan, carne cocinada, bayas…', 'Siembra un huerto cerca del agua.'],
  '💧': ['Lleva agua y bebe antes de tener sed.', 'Hierve el agua del río.'],
  '🥶': ['Enciende una hoguera y quédate cerca.', 'Ropa de abrigo y no te mojes con frío.'],
  '🩸': ['Venda las heridas en cuanto sangres (ficha › Salud).'],
  '🤢': ['Lleva antídotos y no comas crudo.'],
  '🌊': ['No nades lejos de la orilla con poco aguante.'],
};
function dgChart(W, H) {
  const h = DG.hist.slice(-120); if (h.length < 2) return '';
  const max = Math.max(...h.map(p => p.max)), x = i => (i / (h.length - 1)) * W, y = v => H - 4 - (v / max) * (H - 10);
  const pts = h.map((p, i) => `${x(i).toFixed(1)},${y(p.hp).toFixed(1)}`).join(' ');
  const hits = h.map((p, i) => p.hit ? `<circle cx="${x(i).toFixed(1)}" cy="${y(p.hp).toFixed(1)}" r="2.2" />` : '').join('');
  return `<svg class="dgchart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="dgg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b5b" stop-opacity=".45"/><stop offset="1" stop-color="#ff6b5b" stop-opacity="0"/></linearGradient></defs>
    <line x1="0" x2="${W}" y1="${y(max * 0.25)}" y2="${y(max * 0.25)}" class="dgl" /><polygon points="0,${H} ${pts} ${W},${H}" fill="url(#dgg)" /><polyline points="${pts}" class="dgp" /><g class="dgh">${hits}</g></svg>`;
}
function dgDonut(list, tot) {
  const C = ['#ff6b5b', '#f0c75e', '#6ab8ff', '#7fd07a', '#c88aff', '#ff9a4a', '#4ad0c8']; let a = 0;
  const arcs = list.map(([, v], i) => { const f = v / tot, a0 = a; a += f; const big = f > 0.5 ? 1 : 0, p = t => [50 + 40 * Math.cos(2 * Math.PI * t - Math.PI / 2), 50 + 40 * Math.sin(2 * Math.PI * t - Math.PI / 2)], [x0, y0] = p(a0), [x1, y1] = p(a - 0.0001);
    return `<path d="M${x0} ${y0} A40 40 0 ${big} 1 ${x1} ${y1}" stroke="${C[i % C.length]}" style="animation-delay:${i * 0.12}s" />`; }).join('');
  return { svg: `<svg class="dgdonut" viewBox="0 0 100 100">${arcs}</svg>`, C };
}
{ const d0 = die; die = () => {
  d0(); if (!S || !S.pc) return;
  const pc = S.pc; DG.hist.push({ t: pc.alive || 0, hp: 0, max: maxHp(), hit: true }); if (DG.hist.length < 2) DG.hist.unshift({ t: 0, hp: maxHp(), max: maxHp() });
  if (!Object.keys(DG.src).length) DG.src[pc.cause || 'Heridas'] = 1;
  const src = Object.entries(DG.src).sort((a, b) => b[1] - a[1]), tot = src.reduce((s, [, v]) => s + v, 0) || 1, top = src.slice(0, 5);
  const D = dgDonut(top, tot), main = top[0] ? top[0][0] : (pc.cause || 'Heridas'), icon = main.split(' ')[0];
  const tips = DEATH_TIPS[icon] || DEATH_TIPS['⚔'];
  const box = $('death').querySelector('.dbox'); let ex = $('dgMore'); if (!ex) { ex = document.createElement('div'); ex.id = 'dgMore'; box.querySelector('#bRespawn').before(ex); }
  ex.innerHTML = `<div class="dggrid">
    <section class="dgcard wide"><small>Tu vida hasta el final</small>${dgChart(420, 90) || '<p class="mut small">Sin datos</p>'}<div class="dgleg"><span><i class="l1"></i>vida</span><span><i class="l2"></i>golpe</span><span><i class="l3"></i>zona de peligro (25 %)</span></div></section>
    <section class="dgcard"><small>Qué te quitó la vida</small><div class="dgdon">${top.length ? D.svg : ''}<ul>${top.map(([k, v], i) => `<li><i style="background:${D.C[i % D.C.length]}"></i>${esc(k)}<b>${Math.round(v / tot * 100)} %</b></li>`).join('') || `<li>${esc(main)}</li>`}</ul></div></section>
    <section class="dgcard"><small>Tu partida</small><div class="dgstats"><div><b>${Math.floor(pc.alive / 60)}</b><span>min vivo</span></div><div><b>${typeof charLevel === 'function' ? charLevel() : 1}</b><span>nivel</span></div><div><b>${(pc.deaths || 0) + 1}</b><span>muertes</span></div><div><b>${FOES.filter(f => dist(f.x, f.y, S.player.x, S.player.y) < 12 * T).length}</b><span>enemigos cerca</span></div></div></section>
    <section class="dgcard wide tips"><small>Para la próxima</small><ul>${tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul></section></div>`;
  DG.src = {}; DG.hist = []; _dgOn = 0; dgV.className = ''; document.body.classList.remove('dying');
}; }
