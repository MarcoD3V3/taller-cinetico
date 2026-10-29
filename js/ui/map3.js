'use strict';
// =====================================================================================
//  Más mapa:
//   · Clic en un bioma de la leyenda: se ilumina dónde está (lo demás se oscurece y su borde
//     brilla), una línea te lleva a la zona más cercana y puedes centrarla o marcarla.
//   · Menas encontradas: al explorar se apuntan las vetas de cada zona (icono con su color;
//     de cerca, su nombre). Lista en el panel, clic para ir.
//   · Otros jugadores en línea, dónde moriste la última vez y anillos de distancia.
// =====================================================================================
Object.assign(MP.show, { ores: true, peers: true, death: true, rings: false, ...(() => { try { return JSON.parse(localStorage.getItem('tc-mapshow') || '{}'); } catch (e) { return {}; } })() });
MP.sel = null; MP.near = null; MP.nearT = 0;
const mpRect = (k, w, h, s) => { const [cx, cy] = ckeyXY(k), [x, y] = mpToS(cx * CS, cy * CS, w, h, s); return [x, y, CS * s]; };
// ---------- Bioma elegido: oscurecer lo demás y bordear lo suyo (en la capa guardada) ----------
{ const b0 = mpBase; mpBase = (w, h, s) => {
  const cv = b0(w, h, s); if (!MP.sel || MP._selK === MP.baseK) return cv; MP._selK = MP.baseK;
  const c = cv.getContext('2d'), B = mpB(MP.sel), col = (B && B.mc) || '#f0c75e', sel = new Set();
  const here = mpHere(); for (const k of MAPT.keys()) if (mpBiome(k) === MP.sel && mpLay(k) === here) sel.add(k);
  // Una sola figura por capa: si se rellenaba trozo a trozo, los bordes se oscurecían dos veces y se veían cuadros
  c.save(); c.fillStyle = 'rgba(4,5,8,.62)'; c.beginPath();
  for (const k of MAPT.keys()) { if (sel.has(k)) continue; const [x, y, z] = mpRect(k, w, h, s); if (x > w || y > h || x + z < 0 || y + z < 0) continue; c.rect(Math.round(x), Math.round(y), Math.round(x + z) - Math.round(x), Math.round(y + z) - Math.round(y)); }
  c.fill(); c.globalAlpha = 0.22; c.fillStyle = col; c.beginPath(); for (const k of sel) { const [x, y, z] = mpRect(k, w, h, s); c.rect(Math.round(x), Math.round(y), Math.round(x + z) - Math.round(x), Math.round(y + z) - Math.round(y)); } c.fill();
  c.globalAlpha = 1; c.strokeStyle = col; c.lineWidth = 2.5 * dpr; c.shadowColor = col; c.shadowBlur = 8 * dpr; c.beginPath();
  for (const k of sel) { const [cx, cy] = ckeyXY(k), [x, y, z] = mpRect(k, w, h, s); if (x > w + z || y > h + z || x + z < -z || y + z < -z) continue;
    if (!sel.has(ckey(cx, cy - 1))) { c.moveTo(x, y); c.lineTo(x + z, y); } if (!sel.has(ckey(cx, cy + 1))) { c.moveTo(x, y + z); c.lineTo(x + z, y + z); }
    if (!sel.has(ckey(cx - 1, cy))) { c.moveTo(x, y); c.lineTo(x, y + z); } if (!sel.has(ckey(cx + 1, cy))) { c.moveTo(x + z, y); c.lineTo(x + z, y + z); } }
  c.stroke(); c.restore(); return cv; }; }
// La zona más cercana de ese bioma
function mpNearest() {
  const now = performance.now(); if (MP.near && MP.near.b === MP.sel && now - MP.nearT < 1000) return MP.near; MP.nearT = now;
  const px = S.player.x / T, py = S.player.y / T; let best = null, bd = 1e9, n = 0;
  const here = mpHere(); for (const k of MAPT.keys()) { if (mpBiome(k) !== MP.sel || mpLay(k) !== here) continue; n++; const [cx, cy] = ckeyXY(k), x = cx * CS + CS / 2, y = cy * CS + CS / 2, d = Math.hypot(x - px, y - py); if (d < bd) { bd = d; best = { x, y }; } }
  return (MP.near = best ? { b: MP.sel, x: best.x, y: best.y, d: Math.round(bd), n } : null);
}
// Viaje suave del mapa hasta un punto (unos 0,35 s)
function mpFly(x, y, z) { const a = { x: mv.x, y: mv.y, z: mv.z }, t0 = performance.now(); cancelAnimationFrame(MP.fly);
  const st = t => { const k = Math.min(1, (t - t0) / 350), e = 1 - Math.pow(1 - k, 3); mv.x = a.x + (x - a.x) * e; mv.y = a.y + (y - a.y) * e; mv.z = a.z + (z - a.z) * e; MP.dirty = true; if (k < 1 && ui.open === 'map') MP.fly = requestAnimationFrame(st); };
  MP.fly = requestAnimationFrame(st); }
// ---------- Menas: se apuntan al explorar ----------
const ORE_G = new Set(); GI.forEach((g, i) => { if (!g || !g.drop || g.tree || g.liquid || g.key === 'STONE' || !ITEMS[g.drop]) return; if (/ore|Ore/.test(g.drop) || ['ore', 'gem'].includes(ITEMS[g.drop].s) || /^M_/.test(g.key || '')) ORE_G.add(i); });
const _oreSeen = new Set();
setInterval(() => {
  if (!S || ui.open === 'title') return; const R = S.mapOres || (S.mapOres = {}); let n = 0;
  for (const c of WORLD.values()) { const k = ckey(c.cx, c.cy); if (_oreSeen.has(k) || !MAPT.has(k)) continue; _oreSeen.add(k); if (++n > 30) break;
    const cnt = new Map(); for (let i = 0; i < c.g.length; i++) if (ORE_G.has(c.g[i])) cnt.set(c.g[i], (cnt.get(c.g[i]) || 0) + 1);
    let best = null; for (const [g, m] of cnt) { if (m < 3) continue; const lv = (GI[g].need && GI[g].need.lv) || 0; if (!best || lv > best[2] || (lv === best[2] && m > best[1])) best = [GI[g].drop, m, lv, GI[g].n]; }
    if (best) R[k] = best; else delete R[k]; }
}, 1500);
{ const d0 = die; die = () => { if (S && S.player && ui.open !== 'dead') S.lastDeath = { x: S.player.x / T, y: S.player.y / T, t: S.time }; d0(); }; }
// ---------- Lo nuevo encima del mapa ----------
{ const d0 = drawBig; drawBig = () => {
  d0(); if (ui.open !== 'map' || !S) return; const c = bigX, w = big.width, h = big.height, s = mv.z * dpr, now = performance.now() / 1000, toS = (x, y) => mpToS(x, y, w, h, s), [px, py] = toS(S.player.x / T, S.player.y / T);
  // Anillos de distancia
  if (MP.show.rings) { c.save(); c.setLineDash([4 * dpr, 6 * dpr]); c.strokeStyle = 'rgba(255,255,255,.18)'; c.fillStyle = 'rgba(255,255,255,.45)'; c.font = `600 ${10 * dpr}px system-ui`; c.textAlign = 'center';
    for (const r of [50, 100, 200, 400]) { const rr = r * s; if (rr < 20 * dpr || rr > Math.max(w, h) * 1.5) continue; c.beginPath(); c.arc(px, py, rr, 0, 7); c.stroke(); c.fillText(r + ' c', px, py - rr - 4 * dpr); } c.restore(); }
  // Menas
  if (MP.show.ores && S.mapOres) { c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const k in S.mapOres) { const [id, n, lv, nm] = S.mapOres[k], [cx, cy] = ckeyXY(k), [x, y] = toS(cx * CS + CS / 2, cy * CS + CS / 2); if (x < -20 || y < -20 || x > w + 20 || y > h + 20) continue;
      const r = (3 + Math.min(4, lv)) * dpr * Math.min(1.4, Math.max(0.7, s / dpr)); c.fillStyle = (ITEMS[id] && ITEMS[id].c) || '#ccc'; c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 1.2 * dpr;
      c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r, y); c.lineTo(x, y + r); c.lineTo(x - r, y); c.closePath(); c.fill(); c.stroke();
      if (s / dpr > 4.5) { c.font = `600 ${9.5 * dpr}px system-ui`; c.lineWidth = 3 * dpr; c.strokeStyle = 'rgba(0,0,0,.6)'; const t = `${nm} ×${n}`; c.strokeText(t, x, y + r + 8 * dpr); c.fillStyle = '#fff'; c.fillText(t, x, y + r + 8 * dpr); } }
    c.restore(); }
  // Dónde moriste
  if (MP.show.death && S.lastDeath) { const [x, y] = toS(S.lastDeath.x, S.lastDeath.y); mpPin(c, x, y, '#9a8a8a', '✝', 'Moriste aquí'); }
  // Otros jugadores
  if (MP.show.peers && typeof NET !== 'undefined' && NET.peers) for (const o of NET.peers.values()) { if (!o.pr || o.pr.x === undefined) continue; const [x, y] = toS(o.pr.x / T, o.pr.y / T); c.save(); c.fillStyle = o.c || '#7af0ff'; c.strokeStyle = '#111'; c.lineWidth = 2 * dpr; c.beginPath(); c.arc(x, y, 6 * dpr, 0, 7); c.fill(); c.stroke();
    c.font = `700 ${11 * dpr}px system-ui`; c.textAlign = 'center'; c.lineWidth = 3 * dpr; c.strokeStyle = 'rgba(0,0,0,.65)'; c.strokeText(o.nick, x, y - 11 * dpr); c.fillStyle = '#fff'; c.fillText(o.nick, x, y - 11 * dpr); c.restore(); }
  // Camino a la zona más cercana del bioma elegido
  if (MP.sel) { const N = mpNearest(); if (N) { const [x, y] = toS(N.x, N.y), B = mpB(MP.sel), col = (B && B.mc) || '#f0c75e';
    c.save(); c.strokeStyle = col; c.lineWidth = 2.5 * dpr; c.setLineDash([8 * dpr, 6 * dpr]); c.lineDashOffset = -now * 30; c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke(); c.setLineDash([]);
      const pu = (now % 1.2) / 1.2; c.globalAlpha = 1 - pu; c.beginPath(); c.arc(x, y, (8 + pu * 22) * dpr, 0, 7); c.stroke(); c.globalAlpha = 1; c.fillStyle = col; c.beginPath(); c.arc(x, y, 5 * dpr, 0, 7); c.fill(); c.restore(); } }
  mpSelBar();
}; }
// ---------- Barra del bioma elegido ----------
{ const st = $('mMap').querySelector('.mapstage'); if (st && !$('mapSel')) st.insertAdjacentHTML('beforeend', '<div id="mapSel" hidden></div>'); }
let _selSig = '';
function mpSelBar() {
  const el = $('mapSel'); if (!el) return; if (!MP.sel) { if (!el.hidden) el.hidden = true; _selSig = ''; return; }
  const B = mpB(MP.sel), N = mpNearest(), sig = MP.sel + (N ? N.d + ':' + N.n : ''); if (sig === _selSig) return; _selSig = sig;
  el.hidden = false; el.style.setProperty('--bc', (B && B.mc) || '#f0c75e');
  el.innerHTML = `<i></i><div><b>${esc(B ? B.n : MP.sel)}</b><span>${N ? `${N.n} zona${N.n > 1 ? 's' : ''} descubierta${N.n > 1 ? 's' : ''} · la más cercana a <b>${N.d}</b> casillas` : 'Aún no lo has visto'}</span></div>${N ? '<button data-mps="go">Centrar</button><button data-mps="mark">📍 Marcar</button>' : ''}<button data-mps="off" title="Quitar">✕</button>`;
}
// ---------- Panel: menas, jugadores y más capas ----------
{ const s0 = mpSide; mpSide = () => { s0(); const el = $('mapSide'); if (!el || !S) return; const p = S.player, px = p.x / T, py = p.y / T;
  const ores = Object.entries(S.mapOres || {}).map(([k, v]) => { const [cx, cy] = ckeyXY(k); return { k, v, d: Math.round(Math.hypot(cx * CS + 16 - px, cy * CS + 16 - py)) }; }).sort((a, b) => b.v[2] - a.v[2] || a.d - b.d).slice(0, 8);
  const peers = typeof NET !== 'undefined' && NET.peers ? [...NET.peers.values()].filter(o => o.pr && o.pr.x !== undefined) : [];
  const extra = `<section><small>Menas encontradas</small><ul class="mpores">${ores.map(o => `<li data-mpore="${o.k}"><i style="background:${(ITEMS[o.v[0]] || {}).c || '#ccc'}"></i><span>${esc(o.v[3])} ×${o.v[1]}</span>${o.v[2] ? `<u>nv ${o.v[2]}</u>` : ''}<em>${o.d} c</em></li>`).join('') || '<li class="mut">Explora: las vetas se apuntan solas</li>'}</ul></section>
    ${peers.length ? `<section><small>Jugadores</small><ul class="mpores">${peers.map(o => `<li data-mppeer="${o.peer}"><i style="background:${o.c}"></i><span>${esc(o.nick)}</span><em>${Math.round(Math.hypot(o.pr.x / T - px, o.pr.y / T - py))} c</em></li>`).join('')}</ul></section>` : ''}
    <section><small>Más capas</small><div class="mptog">${[['ores', 'Menas'], ['peers', 'Jugadores'], ['death', 'Dónde moriste'], ['rings', 'Anillos de distancia']].map(([k, t]) => `<label><input type="checkbox" data-mpt="${k}" ${MP.show[k] ? 'checked' : ''}> ${t}</label>`).join('')}</div></section>`;
  const hint = el.querySelector('p.mut.small'); if (hint) hint.insertAdjacentHTML('beforebegin', extra); else el.insertAdjacentHTML('beforeend', extra); }; }
document.addEventListener('click', e => {
  if (ui.open !== 'map' || !e.target.closest) return;
  const b = e.target.closest('[data-mpbio]'); if (b) { MP.sel = MP.sel === b.dataset.mpbio ? null : b.dataset.mpbio; MP.baseK = ''; MP._selK = ''; MP.near = null; mpSide();
    const N = MP.sel && mpNearest(); if (N) mpFly(N.x, N.y, Math.max(mv.z, 2)); return; }
  const a = e.target.closest('[data-mps]'); if (a) { const N = mpNearest(); if (a.dataset.mps === 'off') { MP.sel = null; MP.baseK = ''; mpSide(); }
    else if (N && a.dataset.mps === 'go') mpFly(N.x, N.y, Math.max(mv.z, 2));
    else if (N && a.dataset.mps === 'mark') { const B = mpB(MP.sel); S.marks.push({ x: Math.floor(N.x), y: Math.floor(N.y), n: B ? B.n : 'Bioma' }); toast('📍 Marcado: ' + (B ? B.n : '')); mpSide(); } return; }
  const o = e.target.closest('[data-mpore]'); if (o) { const [cx, cy] = ckeyXY(o.dataset.mpore); mv.x = cx * CS + 16; mv.y = cy * CS + 16; mv.z = Math.max(mv.z, 3); return; }
  const pp = e.target.closest('[data-mppeer]'); if (pp && NET.peers.get(pp.dataset.mppeer)) { const q = NET.peers.get(pp.dataset.mppeer).pr; mv.x = q.x / T; mv.y = q.y / T; }
});
// Al pasar el ratón: la veta de esa zona
big.addEventListener('mousemove', e => {
  const hv = $('mapHover'); if (hv.hidden || !S || !S.mapOres) return; const r = big.getBoundingClientRect(), tx = Math.floor(mv.x + (e.clientX - r.left - r.width / 2) / mv.z), ty = Math.floor(mv.y + (e.clientY - r.top - r.height / 2) / mv.z);
  const o = S.mapOres[ckey(tx >> CSH, ty >> CSH)]; if (o) hv.insertAdjacentHTML('beforeend', `<span>⛏ ${esc(o[3])} ×${o[1]}${o[2] ? ' · pico nivel ' + o[2] : ''}</span>`);
});
// Los datos del panel se refrescan mientras está abierto (jugadores y distancias)
setInterval(() => { if (ui.open === 'map' && !document.querySelector('#mapSide:hover')) mpSide(); }, 2000);
