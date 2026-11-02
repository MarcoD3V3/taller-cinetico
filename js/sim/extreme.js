'use strict';
// =====================================================================================
//  Biomas extremos (datos en data/explore.js).
//  · Cumbres de la Tormenta, Bosque de Hongos Gigantes, Caldera Infernal y Glaciar Eterno.
//  · Salen por el mundo a partir de ~450 casillas del inicio: en casi la mitad de las regiones
//    de 640×640 hay uno (nunca en el mar). Las Maravillas tienen prioridad.
//  · Cada uno tiene su peligro, sus 2 criaturas, su material (vetas o vainas) y un talismán que,
//    llevándolo encima, te protege del peligro.
//  · De lejos se oye: al quedar a ~200 casillas, un aviso dice hacia dónde queda.
// =====================================================================================
const XR = 640, XT = { sites: new Map(), cur: null, bolt: 3, gey: 4, spore: 5, heat: 2, pend: [], heard: null, amb: [], chk: 0 };
const xtrSite = (rx, ry, P) => {
  const seed = (P && P.seed) || 0, key = seed + ':' + rx + ',' + ry; if (XT.sites.has(key)) return XT.sites.get(key);
  let s = null; const h = i => hash2(rx, ry, seed + 611 + i);
  if (h(0) < 0.45) { const x = rx * XR + 120 + Math.floor(h(1) * (XR - 240)), y = ry * XR + 120 + Math.floor(h(2) * (XR - 240));
    if (Math.hypot(x, y) > 450 && Math.abs(y) < 38000) { const c = climate(x, y, P, [0, 0, 0, 0, 0]), b = BIOMES[pickBiome(c[0], c[1], c[2], c[3], c[4], P)];
      if (b && !b.ocean && !b.legend) { const k = XTR_KEYS[Math.floor(h(3) * XTR_KEYS.length)]; s = { k, bi: BI_[k], x, y, r: 60 + h(4) * 40 }; } } }
  XT.sites.set(key, s); return s;
};
function xtrAt(x, y, P) {
  if (Math.abs(y) > 40000) return -1;
  const s = xtrSite(Math.floor(x / XR), Math.floor(y / XR), P); if (!s) return -1; const dx = x - s.x, dy = y - s.y; if (Math.abs(dx) > s.r + 16 || Math.abs(dy) > s.r + 16) return -1;
  return Math.hypot(dx, dy) + (vnoise(x / 19, y / 19, (P.seed || 0) + 1201) - 0.5) * 30 < s.r ? s.bi : -1;
}
{ const w0 = wonderAt; wonderAt = (x, y, P) => { const w = w0(x, y, P); return w >= 0 ? w : xtrAt(x, y, P); }; }
const xtrHere = () => { const p = S.player, b = BIOMES[biomeOf(Math.floor(p.x / T), Math.floor((p.y + 4) / T))]; return b && XTR[b.key] ? b.key : null; };
const xtrSafe = k => invCount(XTR[k].tal) > 0 || (typeof mountGuards === 'function' && mountGuards(k));
const xtrDir = (dx, dy) => ['este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste', 'norte', 'noreste'][((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];

// ---------- Cada fotograma: peligros ----------
function xtrTick(dt) {
  const p = S.player; if ((typeof inDungeon === 'function' && inDungeon()) || (typeof inArena === 'function' && inArena())) { XT.cur = null; return; }
  // Rayos que ya avisaron
  for (let i = XT.pend.length - 1; i >= 0; i--) { const o = XT.pend[i]; if ((o.t -= dt) > 0) continue; XT.pend.splice(i, 1); xtrStrike(o); }
  // Aviso de lejos (una vez por bioma)
  if ((XT.chk -= dt) <= 0) { XT.chk = 3; const P = S.gen, rx = Math.floor(p.x / T / XR), ry = Math.floor(p.y / T / XR), heard = S.xtrHeard || (S.xtrHeard = {});
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const s = xtrSite(rx + dx, ry + dy, P); if (!s) continue; const k = s.x + ',' + s.y, ddx = s.x - p.x / T, ddy = s.y - p.y / T, d = Math.hypot(ddx, ddy);
      if (d < 220 && d > s.r + 10 && !heard[k]) { heard[k] = 1; const X = XTR[s.k]; toast(`${X.i} ${{ stormPeaks: 'Retumban truenos', fungalForest: 'El aire huele a moho', infernalCaldera: 'El suelo tiembla y huele a azufre', eternalGlacier: 'Sopla un viento helado' }[s.k]} hacia el ${xtrDir(ddx, ddy)}: ${BIOMES[s.bi].n}, a unas ${Math.round(d - s.r)} casillas.`, true); } } }
  const k = xtrHere();
  if (k !== XT.cur) { XT.cur = k; if (k) { const X = XTR[k], safe = xtrSafe(k); wvBanner(`${X.i} ${BIOMES[BI_[k]].n}`, `${X.hz}. ${safe ? `Tu ${ITEMS[X.tal].n.toLowerCase()} te protege.` : `Protégete llevando un ${ITEMS[X.tal].n.toLowerCase()} (se fabrica con ${ITEMS[X.mat].n.toLowerCase()} de aquí).`}`, X.c, 4.5); } }
  if (!k || !survOn() || ui.open === 'dead') return; const safe = xtrSafe(k), r = Math.random;
  if (k === 'stormPeaks' && (XT.bolt -= dt) <= 0) { XT.bolt = 3.5 + r() * 4; const n = 1 + (r() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i++) { const a = r() * 6.28, d = i ? 2 + r() * 5 : r() * 2.5, x = p.x + Math.cos(a) * d * T, y = p.y + Math.sin(a) * d * T; HAZ.push({ x, y, r: 30, t: 1.1, dl: 1.1, kind: 'warn', c: '#f0f05a' }); XT.pend.push({ x, y, t: 1.1, k }); } }
  if (k === 'infernalCaldera') {
    if ((XT.heat -= dt) <= 0) { XT.heat = 3; if (!safe) { hitPlayer(5, 'burn', 'Calor de la caldera', 'fire'); fxText(p.x, p.y - 30, '🔥 ¡Quema!', '#ff7a2a'); } }
    if ((XT.gey -= dt) <= 0) { XT.gey = 3 + r() * 4; const a = r() * 6.28, d = r() * 4, x = p.x + Math.cos(a) * d * T, y = p.y + Math.sin(a) * d * T; HAZ.push({ x, y, r: 34, t: 1.2, dl: 1.2, kind: 'warn', c: '#ff5a1a' }); XT.pend.push({ x, y, t: 1.2, k }); } }
  if (k === 'fungalForest' && (XT.spore -= dt) <= 0) { XT.spore = 5 + r() * 4; fxBurst(p.x + (r() - 0.5) * 60, p.y + (r() - 0.5) * 60, 40, { col: '#c8a0e8', sp: 70, life: 1.6, size: 3, drag: 1.5 });
    if (!safe) { S.pc.poison = Math.max(S.pc.poison || 0, 6); fxText(p.x, p.y - 30, '☁ Esporas', '#c8a0e8'); vitalsDirty = true; } }
  if (k === 'eternalGlacier' && !safe) { S.pc.temp = Math.max(30, S.pc.temp - 0.22 * dt); P.chill = Math.max(P.chill || 0, 0.3); }
}
function xtrStrike(o) {
  const p = S.player, near = Math.hypot(p.x - o.x, p.y - o.y) < 1.4 * T, safe = xtrSafe(o.k);
  if (o.k === 'stormPeaks') { addBolt(o.x + (Math.random() - 0.5) * 40, o.y - 320, o.x, o.y, '#f0f05a', 0.3); screenFlash('#f0f8ff', 0.18); tone(70, 0.5, 'sawtooth', 0.07, 0.4); noise(0.4, 0.08, 1400); fxBurst(o.x, o.y, 24, { col: '#f0f05a', sp: 160, life: 0.4, glow: 1, size: 2 });
    if (near) { if (safe) { S.pc.mana = Math.min(maxMana(), (S.pc.mana || 0) + 25); fxText(p.x, p.y - 34, '⚡ +25 maná', '#9ae8ff', true); vitalsDirty = true; } else hitPlayer(16, 'burn', 'Rayo', 'storm'); } }
  else { fxBurst(o.x, o.y, 50, { col: '#ff7a2a', sp: 200, life: 0.8, glow: 1, size: 3, up: 120 }); noise(0.5, 0.07, 300); shake = Math.max(shake || 0, 0.25);
    if (near && !safe) hitPlayer(14, 'burn', 'Géiser de fuego', 'fire'); }
  for (const f of FOES) if (Math.hypot(f.x - o.x, f.y - o.y) < 1.4 * T && !f.boss) damageFoe(f, 25, o.k === 'stormPeaks' ? 'storm' : 'fire'); // también les cae a ellos
}
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); if (S) xtrTick(fdt); }; }
// ---------- En pantalla: tormenta, esporas, calima de calor y ventisca ----------
{ const w0 = drawWeatherScreen; drawWeatherScreen = (ctx, dt) => { w0(ctx, dt); if (!ctx || !S || !XT.cur) return;
  const W = ctx.canvas.width, H = ctx.canvas.height, k = XT.cur, safe = xtrSafe(k), L = XT.amb, d = dt || 0.016;
  if (L.k !== k) { L.length = 0; L.k = k; for (let i = 0; i < 110; i++) L.push({ x: Math.random() * W, y: Math.random() * H, s: 0.5 + Math.random(), p: Math.random() * 6 }); }
  ctx.save();
  if (k === 'stormPeaks') { ctx.fillStyle = 'rgba(20,30,50,.22)'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = 'rgba(180,210,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); for (const o of L) { o.y += 700 * o.s * d; o.x -= 120 * d; if (o.y > H) { o.y = -10; o.x = Math.random() * W; } if (o.x < 0) o.x += W; ctx.moveTo(o.x, o.y); ctx.lineTo(o.x - 4, o.y + 12); } ctx.stroke(); }
  else if (k === 'fungalForest') { ctx.fillStyle = safe ? 'rgba(120,80,160,.06)' : 'rgba(120,80,160,.14)'; ctx.fillRect(0, 0, W, H); for (const o of L) { o.p += d; o.y -= 10 * o.s * d; o.x += Math.sin(o.p) * 12 * d; if (o.y < 0) o.y = H; ctx.globalAlpha = 0.4 + 0.3 * Math.sin(o.p * 2); ctx.fillStyle = '#d8b8ff'; ctx.beginPath(); ctx.arc(o.x, o.y, 1.5 * o.s + 0.5, 0, 7); ctx.fill(); } }
  else if (k === 'infernalCaldera') { ctx.fillStyle = safe ? 'rgba(255,90,20,.05)' : 'rgba(255,90,20,.12)'; ctx.fillRect(0, 0, W, H); for (const o of L) { o.p += d; o.y -= 40 * o.s * d; o.x += Math.sin(o.p * 2) * 15 * d; if (o.y < 0) { o.y = H; o.x = Math.random() * W; } ctx.globalAlpha = 0.5 + 0.5 * Math.sin(o.p * 5); ctx.fillStyle = o.s > 1 ? '#ffb040' : '#ff5a1a'; ctx.fillRect(o.x, o.y, 2 * o.s, 2 * o.s); } }
  else if (k === 'eternalGlacier') { ctx.fillStyle = safe ? 'rgba(230,245,255,.08)' : 'rgba(230,245,255,.2)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#ffffffd0'; for (const o of L) { o.x -= (safe ? 120 : 320) * o.s * d; o.y += 60 * o.s * d + Math.sin(o.p += d) * 10 * d; if (o.x < 0) { o.x = W; o.y = Math.random() * H; } if (o.y > H) o.y = 0; ctx.fillRect(o.x, o.y, 2 * o.s + 1, 2 * o.s + 1); } }
  ctx.restore(); }; }
// ---------- Pestaña en la ventana de Aventura ----------
ADV.tabs.xtr = { n: '🌋 Biomas extremos', render() {
  const P = S.gen, rx = Math.floor(S.player.x / T / XR), ry = Math.floor(S.player.y / T / XR), heard = S.xtrHeard || {}, L = [];
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const s = xtrSite(rx + dx, ry + dy, P); if (s && heard[s.x + ',' + s.y]) L.push(s); }
  const card = k => { const X = XTR[k], b = BIOMES[BI_[k]], foes = Object.keys(ENEMIES).filter(e => ENEMIES[e].bio && ENEMIES[e].bio.length === 1 && ENEMIES[e].bio[0] === k).map(e => ENEMIES[e].n);
    return `<div class="dgc" style="--c:${X.c}"><b>${X.i} ${esc(b.n)}</b><small>⚠ ${X.hz}</small><small>Criaturas: ${foes.join(', ')}</small><small>Material: ${ITEMS[X.mat].n} · Protección: <b style="color:#fff">${ITEMS[X.tal].n}</b> ${xtrSafe(k) ? '✓ la llevas' : ''}</small></div>`; };
  return `<p class="mut">Cuatro biomas peligrosos repartidos por el mundo, lejos del inicio. Cada uno tiene su material y un talismán que te protege de su peligro (basta con llevarlo encima). Cuando te acerques a unas 200 casillas de uno, oirás hacia dónde queda.</p><div class="dglist">${XTR_KEYS.map(card).join('')}</div>
    <h4 class="cxh">Los que has oído</h4>${L.length ? `<div class="dglist">${L.map(s => { const ddx = s.x - S.player.x / T, ddy = s.y - S.player.y / T; return `<div class="dgc" style="--c:${XTR[s.k].c}"><b>${XTR[s.k].i} ${esc(BIOMES[s.bi].n)}</b><small>A unas ${Math.max(0, Math.round(Math.hypot(ddx, ddy) - s.r))} casillas al ${xtrDir(ddx, ddy)}</small></div>`; }).join('')}</div>` : '<p class="mut">Todavía ninguno. Explora lejos del inicio.</p>'}`;
} };
