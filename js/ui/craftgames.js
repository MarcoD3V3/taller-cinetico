'use strict';
// =====================================================================================
//  Minijuegos al fabricar: fabricar una pieza no es solo un clic.
//   · Forja (armas, herramientas, metal): golpea cuando la marca pase por la zona dorada.
//   · Cocina (comidas y bebidas): mantén la temperatura en su punto (pulsa para calentar).
//   · Engarce (joyas, accesorios, armaduras, rarezas): encaja cada gema en el hueco que gira.
//   · Mezcla (pociones, abonos, tintes): remueve en círculos hasta que se una.
//  Bien hecho: «perfecto» da una pieza de más (o devuelve un material si no se apila),
//  «bien» da experiencia extra. Se puede saltar (Esc) y desactivar en Opciones › Juego.
//  Solo al fabricar de uno en uno; las tandas van directas.
// =====================================================================================
if (OPT.craftGames === undefined) OPT.craftGames = 'auto';
OPT_UI.game[1].push(['craftGames', 'Minijuegos al fabricar', 'select', [['auto', 'Sí, al fabricar de uno en uno'], ['never', 'No, fabricar directo']]]);
{ const r0 = optRow; optRow = row => row[2] === 'select' ? `<label class="orow"><span>${row[1]}</span><select data-optsel="${row[0]}">${row[3].map(([v, n]) => `<option value="${v}" ${OPT[row[0]] === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>` : r0(row); }
document.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.optsel; if (k) { OPT[k] = e.target.value; optSave(); } });
const CG_KIND = {
  forge: { n: 'Forja', i: '🔨', tip: 'Golpea el metal cuando la marca cruce la zona dorada (clic o Espacio). Tres golpes: la zona se estrecha.' },
  cook: { n: 'Cocina', i: '🍳', tip: 'Mantén pulsado para avivar el fuego y suelta para bajarlo: deja la aguja en la franja verde hasta llenar la barra.' },
  gem: { n: 'Engarce', i: '💎', tip: 'El aro gira: haz clic cuando el hueco pase por la flecha para encajar cada gema.' },
  mix: { n: 'Mezcla', i: '⚗', tip: 'Remueve con el ratón dando vueltas dentro del caldero hasta que la mezcla cambie de color.' },
};
function cgKindOf(id) {
  const it = ITEMS[id]; if (!it) return null;
  if (it.weapon || it.tool || /plate|rod|gear|ingot|wire|ring|sheet|block/i.test(it.s || '') && /Lingote|Placa|Barra|Engranaje|Alambre/.test(it.n)) return 'forge';
  if (it.food) return it.food.w > (it.food.f || 0) && !it.food.f ? 'mix' : 'cook';
  if (it.armor || it.gear || it.rare && /amulet|ring|gem|rune|coin|feather|helm|bootsA|sheet/.test(it.s)) return 'gem';
  if (it.use || /potion|dust|drop/.test(it.s)) return 'mix';
  return null;
}
const mCG = document.createElement('div'); mCG.id = 'mCG'; mCG.hidden = true; document.body.appendChild(mCG);
let CG = null;
function cgOpen(kind, id, done) {
  const K = CG_KIND[kind];
  CG = { kind, id, done, t: 0, score: 0, hits: [], n: 0, stage: 0, heat: 0.3, fill: 0, ang: 0, gaps: [], mx: 0, my: 0, last: null, stir: 0, down: false, over: false };
  mCG.innerHTML = `<div class="cgin"><header><span class="cgi">${K.i}</span><div><b>${K.n}: ${esc(ITEMS[id].n)}</b><small>${esc(K.tip)}</small></div></header><canvas id="cgCv" width="420" height="170"></canvas><div class="cgfoot"><span id="cgMsg" class="mut small"></span><button data-cg="skip">Saltar <kbd>Esc</kbd></button></div></div>`;
  mCG.hidden = false; requestAnimationFrame(cgLoop);
}
function cgEnd(q) {
  if (!CG || CG.over) return; CG.over = true; const d = CG.done, id = CG.id;
  const msg = q >= 0.85 ? '★★★ ¡Perfecto!' : q >= 0.5 ? '★★ Bien hecho' : q >= 0 ? '★ Regular' : 'Hecho';
  const el = $('cgMsg'); if (el) el.textContent = msg;
  setTimeout(() => { mCG.hidden = true; CG = null; d(q, msg); }, q >= 0 ? 650 : 0);
}
function cgLoop(now) {
  if (!CG || CG.over) return; const cv = $('cgCv'); if (!cv) return; const g = cv.getContext('2d'), W = cv.width, H = cv.height, dt = Math.min(0.05, (now - (CG.lt || now)) / 1000); CG.lt = now; CG.t += dt;
  g.clearRect(0, 0, W, H); g.fillStyle = '#141517'; g.fillRect(0, 0, W, H);
  if (CG.kind === 'forge') {
    const zw = [70, 48, 30][CG.n] || 30, zx = W / 2 - zw / 2, speed = 1.2 + CG.n * 0.45, x = 30 + (W - 60) * (0.5 + 0.5 * Math.sin(CG.t * speed * Math.PI));
    g.fillStyle = '#2a2b2e'; g.fillRect(30, 70, W - 60, 26); g.fillStyle = '#ff7a2a55'; g.fillRect(zx - 30, 70, zw + 60, 26); g.fillStyle = '#e0b54c'; g.fillRect(zx, 70, zw, 26);
    g.fillStyle = '#fff'; g.fillRect(x - 2, 62, 4, 42); CG.x = x; CG.zx = zx; CG.zw = zw;
    // yunque y pieza
    g.fillStyle = '#5a5a5a'; g.fillRect(W / 2 - 40, 130, 80, 14); g.fillStyle = `hsl(${20 + CG.n * 8} 90% ${55 - CG.n * 6}%)`; g.fillRect(W / 2 - 24, 120, 48, 10);
    g.fillStyle = '#e0b54c'; g.font = '12px system-ui'; g.textAlign = 'left'; g.fillText(`Golpe ${CG.n + 1}/3`, 30, 40); g.textAlign = 'right'; g.fillText(CG.hits.map(h => h > 0.85 ? '★' : h > 0.4 ? '☆' : '·').join(' '), W - 30, 40);
  } else if (CG.kind === 'cook') {
    CG.heat += (CG.down ? 0.55 : -0.42) * dt + Math.sin(CG.t * 2.3) * 0.12 * dt; CG.heat = clamp(CG.heat, 0, 1);
    const band = [0.45, 0.65], inB = CG.heat >= band[0] && CG.heat <= band[1]; CG.fill = clamp(CG.fill + (inB ? 0.28 : -0.05) * dt, 0, 1); CG.off = (CG.off || 0) + (inB ? 0 : dt);
    const cx = W / 2, cy = 120, r = 70; g.lineWidth = 12; g.strokeStyle = '#2a2b2e'; g.beginPath(); g.arc(cx, cy, r, Math.PI, 0); g.stroke();
    g.strokeStyle = '#7fd07a'; g.beginPath(); g.arc(cx, cy, r, Math.PI + band[0] * Math.PI, Math.PI + band[1] * Math.PI); g.stroke();
    const a = Math.PI + CG.heat * Math.PI; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4)); g.stroke();
    g.fillStyle = '#2a2b2e'; g.fillRect(30, 150, W - 60, 8); g.fillStyle = '#e0b54c'; g.fillRect(30, 150, (W - 60) * CG.fill, 8);
    for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(255,${120 + i * 15},40,${0.2 + CG.heat * 0.6})`; g.beginPath(); g.arc(cx - 50 + i * 20, cy + 22 + Math.sin(CG.t * 9 + i) * 3, 3 + CG.heat * 4, 0, 7); g.fill(); }
    g.fillStyle = '#ccc'; g.font = '12px system-ui'; g.textAlign = 'center'; g.fillText(CG.heat < band[0] ? 'Falta fuego' : CG.heat > band[1] ? '¡Se quema!' : 'En su punto', cx, 40);
    if (CG.fill >= 1) cgEnd(clamp(1 - CG.off / 8, 0, 1)); if (CG.t > 25) cgEnd(clamp(CG.fill * 0.6, 0, 1));
  } else if (CG.kind === 'gem') {
    const cx = W / 2, cy = 90, r = 55; CG.ang += dt * (1.6 + CG.n * 0.5); const gap = CG.ang % (Math.PI * 2);
    g.lineWidth = 10; g.strokeStyle = '#c8a050'; g.beginPath(); g.arc(cx, cy, r, gap + 0.35, gap + Math.PI * 2 - 0.35); g.stroke();
    for (const a of CG.gaps) { g.fillStyle = '#8ad0ff'; g.beginPath(); g.arc(cx + Math.cos(a + CG.ang) * r, cy + Math.sin(a + CG.ang) * r, 6, 0, 7); g.fill(); }
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx, cy - r - 20); g.lineTo(cx - 7, cy - r - 32); g.lineTo(cx + 7, cy - r - 32); g.fill();
    g.fillStyle = '#ccc'; g.font = '12px system-ui'; g.textAlign = 'center'; g.fillText(`Gema ${CG.n + 1}/3`, cx, 165);
  } else if (CG.kind === 'mix') {
    const cx = W / 2, cy = 95, r = 58; const p = clamp(CG.stir / (Math.PI * 2 * 5), 0, 1);
    g.fillStyle = '#3a3a3a'; g.beginPath(); g.arc(cx, cy, r + 8, 0, 7); g.fill();
    g.fillStyle = `hsl(${120 + p * 160} 60% ${35 + p * 15}%)`; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    for (let i = 0; i < 8; i++) { const a = CG.t * 0.8 + i; g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(cx + Math.cos(a) * r * 0.6 * Math.sin(i), cy + Math.sin(a) * r * 0.5, 3, 0, 7); g.fill(); }
    g.fillStyle = '#2a2b2e'; g.fillRect(30, 160, W - 60, 6); g.fillStyle = '#e0b54c'; g.fillRect(30, 160, (W - 60) * p, 6);
    g.fillStyle = '#ccc'; g.font = '12px system-ui'; g.textAlign = 'center'; g.fillText(p < 1 ? 'Remueve dando vueltas' : '¡Listo!', cx, 22);
    if (p >= 1) cgEnd(clamp(1.15 - CG.t / 14, 0.3, 1)); if (CG.t > 30) cgEnd(p * 0.5);
  }
  requestAnimationFrame(cgLoop);
}
function cgAct() {
  if (!CG || CG.over) return;
  if (CG.kind === 'forge') { const c = CG.zx + CG.zw / 2, d = Math.abs(CG.x - c) / (CG.zw / 2 + 30); const s = clamp(1 - d, 0, 1); CG.hits.push(s); CG.n++; fxCG(s); if (CG.n >= 3) cgEnd(CG.hits.reduce((a, b) => a + b, 0) / 3); }
  if (CG.kind === 'gem') { const rel = ((Math.PI * 1.5 - CG.ang) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2), d = Math.min(rel, Math.PI * 2 - rel); const s = clamp(1 - d / 0.6, 0, 1); CG.hits.push(s); if (s > 0) CG.gaps.push(Math.PI * 1.5 - CG.ang); CG.n++; fxCG(s); if (CG.n >= 3) cgEnd(CG.hits.reduce((a, b) => a + b, 0) / 3); }
}
function fxCG(s) { const el = $('cgMsg'); if (el) el.textContent = s > 0.85 ? '¡Clavado!' : s > 0.4 ? 'Bien' : 'Fallo'; sfx && sfx(s > 0.4 ? 'beep' : 'swing'); }
mCG.addEventListener('mousedown', e => { if (e.target.closest('[data-cg]')) return; CG && (CG.down = true); cgAct(); });
addEventListener('mouseup', () => { if (CG) CG.down = false; });
mCG.addEventListener('mousemove', e => { if (!CG || CG.kind !== 'mix') return; const r = $('cgCv').getBoundingClientRect(), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height * 95 / 170; const a = Math.atan2(y, x); if (CG.last !== null && Math.hypot(x, y) < 90) { let d = a - CG.last; if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; CG.stir += Math.abs(d); } CG.last = a; });
mCG.addEventListener('click', e => { if (e.target.closest('[data-cg="skip"]')) cgEnd(-1); });
addEventListener('keydown', e => { if (!CG) return; e.stopImmediatePropagation(); if (e.key === 'Escape') cgEnd(-1); else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) { CG.down = true; cgAct(); } } }, true);
addEventListener('keyup', e => { if (CG && (e.key === ' ' || e.key === 'Enter')) CG.down = false; }, true);
// ---------- Enganche con el banco / la fabricación en el bolsillo ----------
{ const c0 = craftDirect; craftDirect = (r, k) => {
  const kind = cgKindOf(r.out);
  if (k !== 1 || OPT.craftGames === 'never' || !kind || CG || !crUsable(r)) return c0(r, k);
  const need = benchNeed(r); if (Object.keys(need).some(id => invCount(id) < need[id])) return c0(r, k);
  cgOpen(kind, r.out, (q, msg) => {
    const before = invCount(r.out); c0(r, 1); if (invCount(r.out) <= before) return;
    if (q >= 0.85) { const it = ITEMS[r.out], stack = !(it.tool || it.weapon || it.armor || it.gear); if (stack) { invAdd(r.out, r.n); toast(`★★★ ¡Perfecto! +${r.n} ${it.n} de regalo`); } else { const back = r.teeth && r.teeth[0]; if (back) { invAdd(back, 1); toast(`★★★ ¡Perfecto! Te sobra 1 ${ITEMS[back].n}`); } } gainXP('craft', 6); }
    else if (q >= 0.5) { gainXP('craft', 3); toast('★★ Bien hecho: +experiencia'); }
  });
}; }
