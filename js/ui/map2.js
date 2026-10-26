'use strict';
// =====================================================================================
//  Mapa grande (M) vivo y didáctico:
//   · Terreno explorado con sombra suave sobre un fondo de cuadrícula con coordenadas y bruma.
//   · Nombres de los biomas encima del terreno, iconos del núcleo, tu cama y tus marcadores,
//     tu flecha con un pulso y el rastro de por dónde has pasado.
//   · Criaturas cerca (rojo: enemigos, verde: animales).
//   · Al pasar el ratón: bioma, terreno, coordenadas y distancia.
//   · Panel lateral: leyenda de los biomas descubiertos (con cuánto has explorado de cada
//     uno), datos (explorado, distancia al núcleo, capa), marcadores (clic para ir) e
//     interruptores; botones de zoom y centrado.
//  Rendimiento: el terreno se pinta una vez en una capa guardada y solo se rehace al mover o
//  hacer zoom (o cada segundo si exploras); lo animado se dibuja encima a 30 FPS, y solo
//  mientras el mapa está abierto.
// =====================================================================================
const MP = { show: { bio: true, trail: true, mobs: true, grid: true }, base: null, baseK: '', hover: null, raf: 0, last: 0, trail: [], trailT: 0, bioC: new Map() };
try { Object.assign(MP.show, JSON.parse(localStorage.getItem('tc-mapshow') || '{}')); } catch (e) { }
// Montar la ventana: lienzo + panel lateral + controles flotantes
{ const box = $('mMap').querySelector('.mapbox'), cvs = $('bigmap');
  const stage = document.createElement('div'); stage.className = 'mapstage'; cvs.before(stage); stage.appendChild(cvs);
  stage.insertAdjacentHTML('beforeend', `<div class="mapctl"><button data-mp="in" title="Acercar">＋</button><button data-mp="out" title="Alejar">－</button><button data-mp="me" title="Centrar en mí">◎</button><button data-mp="core" title="Ir al núcleo">⌂</button></div><div class="maprose"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" /><path d="M20 4l4 16h-8z" class="n"/><path d="M20 36l-4-16h8z"/><text x="20" y="12">N</text></svg></div><div id="mapHover" hidden></div>`);
  const side = document.createElement('aside'); side.id = 'mapSide'; stage.after(side);
  const row = document.createElement('div'); row.className = 'maprow'; stage.before(row); row.append(stage, side);
}
// Rastro: dónde has estado (se guarda cada 2 s, como mucho 400 puntos)
setInterval(() => { if (!S || !S.player || ui.open === 'map') return; const p = S.player, l = MP.trail[MP.trail.length - 1], x = p.x / T, y = p.y / T; if (!l || Math.hypot(l.x - x, l.y - y) > 2) { MP.trail.push({ x, y }); if (MP.trail.length > 400) MP.trail.shift(); } }, 2000);
// Bioma de cada trozo explorado (para leyenda y etiquetas)
function mpBiome(k) { let b = MP.bioC.get(k); if (b === undefined) { const [cx, cy] = ckeyXY(k); const B = BIOMES[biomeOf(cx * CS + 16, cy * CS + 16)]; b = B ? B.key : ''; MP.bioC.set(k, b); } return b; }
const mpB = key => BIOMES.find(b => b && b.key === key);
// Capa base: fondo, terreno, nombres de biomas, cuadrícula
function mpBase(w, h, s) {
  const k = [w, h, s.toFixed(3), mv.x.toFixed(2), mv.y.toFixed(2), MAPT.size, MP.show.bio, MP.show.grid, (performance.now() / 1000) | 0].join('|'); if (k === MP.baseK && MP.base) return MP.base; MP.baseK = k;
  const cv0 = MP.base && MP.base.width === w && MP.base.height === h ? MP.base : (MP.base = mkCanvas(w, h)), c = cv0.getContext('2d');
  // Fondo: degradado oscuro con bruma y cuadrícula
  const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7); g.addColorStop(0, '#161a1f'); g.addColorStop(1, '#0a0b0d'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  const step = CS * s, ox = (w / 2 - mv.x * s) % step, oy = (h / 2 - mv.y * s) % step;
  if (MP.show.grid && step > 18) { c.strokeStyle = 'rgba(255,255,255,.035)'; c.lineWidth = 1; c.beginPath(); for (let x = ox; x < w; x += step) { c.moveTo(x, 0); c.lineTo(x, h); } for (let y = oy; y < h; y += step) { c.moveTo(0, y); c.lineTo(w, y); } c.stroke(); }
  // Terreno con sombra (una sola vez por capa)
  c.save(); if (!mv.drag) { c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 14 * dpr; } c.imageSmoothingEnabled = false; drawMapRegion(c, mv.x, mv.y, s, w, h); c.restore();
  // Nombres de biomas: uno por zona, en el centro de sus trozos visibles
  if (MP.show.bio && s > 0.35) {
    const tx0 = mv.x - w / 2 / s, ty0 = mv.y - h / 2 / s, groups = new Map();
    for (const k of MAPT.keys()) { const [cx, cy] = ckeyXY(k); const sx = (cx * CS + 16 - tx0) * s, sy = (cy * CS + 16 - ty0) * s; if (sx < -50 || sy < -50 || sx > w + 50 || sy > h + 50) continue; const b = mpBiome(k); if (!b) continue; const cell = b + ':' + Math.floor(sx / (420 * dpr)) + ',' + Math.floor(sy / (320 * dpr)); const gr = groups.get(cell) || { b, x: 0, y: 0, n: 0 }; gr.x += sx; gr.y += sy; gr.n++; groups.set(cell, gr); }
    c.font = `600 ${11 * dpr}px system-ui,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const gr of groups.values()) { if (gr.n < 3) continue; const B = mpB(gr.b); if (!B) continue; const x = gr.x / gr.n, y = gr.y / gr.n, t = B.n.toUpperCase(); c.lineWidth = 3 * dpr; c.strokeStyle = 'rgba(0,0,0,.55)'; c.strokeText(t, x, y); c.fillStyle = 'rgba(255,248,230,.85)'; c.fillText(t, x, y); }
  }
  return cv0;
}
const mpToS = (x, y, w, h, s) => [w / 2 + (x - mv.x) * s, h / 2 + (y - mv.y) * s];
function mpPin(c, x, y, col, ch, label) {
  c.save(); c.translate(x, y); c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-7 * dpr, -9 * dpr, -7 * dpr, -18 * dpr, 0, -18 * dpr); c.bezierCurveTo(7 * dpr, -18 * dpr, 7 * dpr, -9 * dpr, 0, 0); c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1.5; c.stroke();
  c.fillStyle = '#1a1a1a'; c.font = `700 ${9 * dpr}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, 0, -12 * dpr);
  if (label) { c.font = `600 ${11 * dpr}px system-ui`; c.textAlign = 'left'; c.lineWidth = 3 * dpr; c.strokeStyle = 'rgba(0,0,0,.6)'; c.strokeText(label, 9 * dpr, -12 * dpr); c.fillStyle = '#fff'; c.fillText(label, 9 * dpr, -12 * dpr); }
  c.restore();
}
drawBig = () => {
  if (ui.open !== 'map' || !S) return;
  const w = big.width, h = big.height, s = mv.z * dpr, now = performance.now() / 1000;
  bigX.setTransform(1, 0, 0, 1, 0, 0); bigX.drawImage(mpBase(w, h, s), 0, 0);
  const toS = (x, y) => mpToS(x, y, w, h, s);
  // Rastro
  if (MP.show.trail && MP.trail.length > 1) { bigX.strokeStyle = 'rgba(240,199,94,.55)'; bigX.lineWidth = 2 * dpr; bigX.setLineDash([3 * dpr, 4 * dpr]); bigX.lineDashOffset = -now * 12; bigX.beginPath(); MP.trail.forEach((p, i) => { const [x, y] = toS(p.x, p.y); i ? bigX.lineTo(x, y) : bigX.moveTo(x, y); }); const [px0, py0] = toS(S.player.x / T, S.player.y / T); bigX.lineTo(px0, py0); bigX.stroke(); bigX.setLineDash([]); }
  // Criaturas cercanas
  if (MP.show.mobs) { for (const a of ANIMALS) { if (Math.hypot(a.x - S.player.x, a.y - S.player.y) > 40 * T) continue; const [x, y] = toS(a.x / T, a.y / T); bigX.fillStyle = 'rgba(127,208,122,.9)'; bigX.fillRect(x - 1.5 * dpr, y - 1.5 * dpr, 3 * dpr, 3 * dpr); }
    for (const f of FOES) { const [x, y] = toS(f.x / T, f.y / T); const r = (f.boss ? 6 : 3) * dpr * (1 + 0.25 * Math.sin(now * 6)); bigX.fillStyle = f.boss ? '#ff3a2a' : 'rgba(255,107,91,.95)'; bigX.beginPath(); bigX.arc(x, y, r, 0, 7); bigX.fill(); } }
  // Núcleo, cama y marcadores
  const core = L.core && L.core[0]; if (core) { const [x, y] = toS(core.x + .5, core.y + .5); mpPin(bigX, x, y, '#fff4cc', '⌂', 'Núcleo'); }
  const bed = S.pc && S.pc.bed; if (bed) { const [x, y] = toS(bed.x + .5, bed.y + .5); mpPin(bigX, x, y, '#c88aff', '☾', 'Cama'); }
  (S.marks || []).forEach((m, i) => { const [x, y] = toS(m.x + .5, m.y + .5); mpPin(bigX, x, y, '#ff6b5b', String(i + 1), m.n); });
  // Tú: flecha hacia donde miras y un pulso
  const [px, py] = toS(S.player.x / T, S.player.y / T), a = P.faceA || 0, pu = (now % 1.6) / 1.6;
  bigX.strokeStyle = `rgba(240,199,94,${1 - pu})`; bigX.lineWidth = 2 * dpr; bigX.beginPath(); bigX.arc(px, py, (6 + pu * 18) * dpr, 0, 7); bigX.stroke();
  bigX.save(); bigX.translate(px, py); bigX.rotate(a); bigX.fillStyle = '#f0c75e'; bigX.strokeStyle = '#1a1a1a'; bigX.lineWidth = 1.5 * dpr; bigX.beginPath(); bigX.moveTo(9 * dpr, 0); bigX.lineTo(-6 * dpr, -6 * dpr); bigX.lineTo(-3 * dpr, 0); bigX.lineTo(-6 * dpr, 6 * dpr); bigX.closePath(); bigX.fill(); bigX.stroke(); bigX.restore();
  $('mapCoords').textContent = `X ${Math.floor(mv.x)} · Y ${(typeof surfY === 'function' ? surfY(Math.floor(mv.y)) : Math.floor(mv.y))} · zoom ×${mv.z.toFixed(1).replace('.', ',')}`;
};
// Animación (30 FPS como mucho, solo con el mapa abierto)
function mpLoop(t) { if (ui.open !== 'map') { MP.raf = 0; return; } MP.raf = requestAnimationFrame(mpLoop); if (t - MP.last < 33) return; MP.last = t; drawBig(); }
// Panel lateral
function mpSide() {
  const el = $('mapSide'); if (!el || !S) return; const cnt = new Map(); let n = 0;
  for (const k of MAPT.keys()) { const b = mpBiome(k); if (!b) continue; cnt.set(b, (cnt.get(b) || 0) + 1); n++; }
  const list = [...cnt].sort((a, b) => b[1] - a[1]), core = L.core && L.core[0], p = S.player, dCore = core ? Math.round(Math.hypot(core.x + .5 - p.x / T, core.y + .5 - p.y / T)) : null, k = typeof layerOf === 'function' ? layerOf(Math.floor(p.y / T)) : 0;
  el.innerHTML = `<section><small>Exploración</small><div class="mpstat"><div><b>${n}</b><span>zonas vistas</span></div><div><b>${list.length}</b><span>biomas</span></div><div><b>${dCore ?? '—'}</b><span>al núcleo</span></div><div><b>${k ? 'Capa ' + k : 'Superficie'}</b><span>dónde estás</span></div></div></section>
    <section><small>Biomas descubiertos</small><ul class="mpleg">${list.map(([b, c]) => { const B = mpB(b); return `<li><i style="background:${B && B.mc || '#888'}"></i><span>${esc(B ? B.n : b)}</span><em><u style="width:${Math.round(c / n * 100)}%"></u></em><b>${Math.round(c / n * 100)} %</b></li>`; }).join('') || '<li class="mut">Explora para descubrirlos</li>'}</ul></section>
    <section><small>Marcadores</small><ul class="mpmarks">${(S.marks || []).map((m, i) => `<li data-mpgo="${i}"><span class="mpnum">${i + 1}</span>${esc(m.n)}<em>${Math.round(Math.hypot(m.x - p.x / T, m.y - p.y / T))} c</em></li>`).join('') || '<li class="mut">Clic en el mapa para poner uno</li>'}</ul></section>
    <section><small>Mostrar</small><div class="mptog">${[['bio', 'Nombres de biomas'], ['trail', 'Tu rastro'], ['mobs', 'Criaturas'], ['grid', 'Cuadrícula']].map(([k2, t]) => `<label><input type="checkbox" data-mpt="${k2}" ${MP.show[k2] ? 'checked' : ''}> ${t}</label>`).join('')}</div></section>
    <p class="mut small">Arrastra · rueda: zoom · clic: marcador · clic derecho: quitarlo</p>`;
}
{ const o0 = openMap; openMap = () => { o0(); MP.baseK = ''; mpSide(); if (!MP.raf) MP.raf = requestAnimationFrame(mpLoop); }; }
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-mp]'); if (b && ui.open === 'map') { const a = b.dataset.mp; if (a === 'in') mv.z = clamp(mv.z * 1.3, 0.3, 16); if (a === 'out') mv.z = clamp(mv.z / 1.3, 0.3, 16); if (a === 'me') { mv.x = S.player.x / T; mv.y = S.player.y / T; } if (a === 'core' && L.core && L.core[0]) { mv.x = L.core[0].x; mv.y = L.core[0].y; } return; }
  const g = e.target.closest && e.target.closest('[data-mpgo]'); if (g) { const m = S.marks[+g.dataset.mpgo]; if (m) { mv.x = m.x; mv.y = m.y; mv.z = Math.max(mv.z, 3); } }
});
document.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.mpt; if (!k) return; MP.show[k] = e.target.checked; MP.baseK = ''; try { localStorage.setItem('tc-mapshow', JSON.stringify(MP.show)); } catch (er) { } });
// Al poner o quitar marcadores, el panel se pone al día
addEventListener('mouseup', () => { if (ui.open === 'map') setTimeout(mpSide, 0); });
// Lo que hay bajo el ratón
big.addEventListener('mousemove', e => {
  const hv = $('mapHover'), r = big.getBoundingClientRect(), tx = Math.floor(mv.x + (e.clientX - r.left - r.width / 2) / mv.z), ty = Math.floor(mv.y + (e.clientY - r.top - r.height / 2) / mv.z);
  if (!MAPT.has(ckey(tx >> CSH, ty >> CSH))) { hv.hidden = true; return; }
  const B = BIOMES[biomeOf(tx, ty)], c = peekChunk(tx >> CSH, ty >> CSH), g = c ? GI[gnd(tx, ty)] : null, bl = c ? at(tx, ty) : null, d = Math.round(Math.hypot(tx - S.player.x / T, ty - S.player.y / T));
  hv.innerHTML = `<b>${esc(B ? B.n : '—')}</b>${bl ? `<span>🧱 ${esc(BD[bl.type].n)}</span>` : g ? `<span>${esc(g.n)}</span>` : ''}<small>X ${tx} · Y ${typeof surfY === 'function' ? surfY(ty) : ty} · a ${d} casillas</small>`;
  hv.hidden = false; hv.style.left = (e.clientX - r.left + 14) + 'px'; hv.style.top = (e.clientY - r.top + 14) + 'px';
});
big.addEventListener('mouseleave', () => { $('mapHover').hidden = true; });
