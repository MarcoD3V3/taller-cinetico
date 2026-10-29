'use strict';
// =====================================================================================
//  Collares buscabiomas (datos en data/wonders.js). Con uno equipado, el mapa enseña dónde
//  está la zona más cercana de cada bioma que aún NO has descubierto (los que te deja ver
//  su nivel), con un «?» de su color; en el panel salen en una lista y con clic vas a mirar.
//  Sin collar el mapa solo enseña lo que has visto tú. Solo funcionan en la superficie.
// =====================================================================================
const collarTier = () => { if (!S || !S.equip) return 0; let t = 0; for (const k of ['acc1', 'acc2', 'acc3', 'acc4']) { const id = S.equip[k], it = id && ITEMS[id]; if (it && it.collar > t) t = it.collar; } return t; };
const WZ = { list: [], key: '', t: 0 };
// Biomas que ya has visto en la superficie
function seenBiomes() { const s = new Set(); for (const k of MAPT.keys()) if (!mpLay(k)) { const b = mpBiome(k); if (b) s.add(b); } return s; }
// Busca alrededor de ti (en la superficie) la zona más cercana de cada bioma que tu collar deja ver
function collarScan() {
  const tier = collarTier(); if (!tier || !S || mpHere()) { WZ.list = []; WZ.key = ''; return WZ.list; }
  const px = Math.floor(S.player.x / T), py = Math.floor(S.player.y / T), seen = seenBiomes();
  const key = [tier, px >> 7, py >> 7, seen.size, MAPT.size >> 6].join('|'); if (key === WZ.key) return WZ.list; WZ.key = key;
  const R = tier === 1 ? 700 : tier === 2 ? 1800 : 2500, st = tier === 1 ? 40 : 64, maxT = Math.min(2, tier), best = new Map();
  for (let y = -R; y <= R; y += st) for (let x = -R; x <= R; x += st) {
    const d = Math.hypot(x, y); if (d > R) continue;
    const b = BIOMES[biomeAt(px + x, py + y)]; if (!b || b.legend || seen.has(b.key) || BIO_TIER(b.key) > maxT) continue;
    const o = best.get(b.key); if (!o || d < o.d) best.set(b.key, { k: b.key, x: px + x, y: py + y, d });
  }
  const out = [...best.values()];
  if (tier >= 3) for (const w of wonderSites(S.gen)) out.push({ k: w.k, x: w.x, y: w.y, d: Math.hypot(w.x - px, w.y - py), wonder: 1, seen: seen.has(w.k) });
  out.sort((a, b) => (b.wonder || 0) - (a.wonder || 0) || a.d - b.d);
  return (WZ.list = out);
}
// Al ponerte o quitarte un collar, aviso y nueva búsqueda
{ let last = -1; setInterval(() => { if (!S || ui.open === 'title') return; const t = collarTier(); if (t !== last) { if (last >= 0 && t > last) toast(['', '📿 Collar del caminante: el mapa (M) marca los biomas comunes sin descubrir', '📿 Collar del buscador: el mapa (M) marca también los biomas raros', '📿 Collar de las Maravillas: el mapa (M) marca las 2 Maravillas de este mundo'][t], true); last = t; WZ.key = ''; } }, 1000); }
// ---------- En el mapa: un «?» de su color en cada uno ----------
{ const d0 = drawBig; drawBig = () => {
  d0(); if (ui.open !== 'map' || !S || !collarTier()) return; const c = bigX, w = big.width, h = big.height, s = mv.z * dpr, now = performance.now() / 1000;
  for (const z of collarScan()) { const B = mpB(z.k), col = (B && B.mc) || '#f0c75e'; let [x, y] = mpToS(z.x, z.y, w, h, s);
    const off = x < 0 || y < 0 || x > w || y > h; if (off) { if (!z.wonder) continue; const cx = w / 2, cy = h / 2, a = Math.atan2(y - cy, x - cx), m = 26 * dpr, k2 = Math.min((w / 2 - m) / Math.abs(Math.cos(a) || 1e-6), (h / 2 - m) / Math.abs(Math.sin(a) || 1e-6)); x = cx + Math.cos(a) * k2; y = cy + Math.sin(a) * k2; }
    const pu = (now * (z.wonder ? 0.8 : 0.5)) % 1, r = (z.wonder ? 11 : 8) * dpr;
    c.save(); c.globalAlpha = 0.9 * (1 - pu); c.strokeStyle = col; c.lineWidth = 2 * dpr; c.beginPath(); c.arc(x, y, r + pu * 16 * dpr, 0, 7); c.stroke(); c.globalAlpha = 1;
    c.fillStyle = 'rgba(10,11,14,.85)'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.strokeStyle = col; c.lineWidth = 2.2 * dpr; c.stroke();
    c.fillStyle = col; c.font = `800 ${(z.wonder ? 12 : 10) * dpr}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(z.wonder ? '★' : '?', x, y + 0.5 * dpr);
    const t = `${z.wonder && !z.seen ? '¿' + B.n + '?' : B.n} · ${Math.round(z.d)} c`; c.font = `600 ${10.5 * dpr}px system-ui`; c.lineWidth = 3 * dpr; c.strokeStyle = 'rgba(0,0,0,.7)'; c.strokeText(t, x, y + r + 10 * dpr); c.fillStyle = '#fff'; c.fillText(t, x, y + r + 10 * dpr); c.restore(); }
}; }
// ---------- En el panel: la lista del collar ----------
{ const s0 = mpSide; mpSide = () => { s0(); const el = $('mapSide'), tier = collarTier(); if (!el || !S || !tier) return;
  const L2 = collarScan(), name = ITEMS[['', 'collarWander', 'collarSeeker', 'collarWonder'][tier]].n;
  const h = `<section class="mpcollar t${tier}"><small>📿 ${esc(name)} · por descubrir</small>${mpHere() ? '<p class="mut small">Solo funciona en la superficie.</p>' : `<ul class="mpores">${L2.map((z, i) => { const B = mpB(z.k); return `<li data-mpcol="${i}"><i style="background:${(B && B.mc) || '#ccc'}"></i><span>${z.wonder ? '★ ' : ''}${esc(B ? B.n : z.k)}</span>${z.wonder ? '<u>maravilla</u>' : BIO_TIER(z.k) > 1 ? '<u>raro</u>' : ''}<em>${Math.round(z.d)} c</em></li>`; }).join('') || '<li class="mut">Ya conoces todos los biomas que este collar puede encontrar por aquí</li>'}</ul>`}</section>`;
  const leg = el.querySelector('.mpleg'); if (leg && leg.closest('section')) leg.closest('section').insertAdjacentHTML('afterend', h); else el.insertAdjacentHTML('beforeend', h); }; }
document.addEventListener('click', e => { if (ui.open !== 'map' || !e.target.closest) return; const li = e.target.closest('[data-mpcol]'); if (!li) return; const z = WZ.list[+li.dataset.mpcol]; if (z) mpFly(z.x, z.y, Math.max(mv.z, 1.2)); });
// ---------- Icono: cadena en arco con su piedra ----------
function drawCollarIcon(c, id, s) {
  const C = COLLARS[id], r = s / 2; c.save(); c.lineCap = 'round';
  c.strokeStyle = C.c; c.lineWidth = r * (C.tier === 1 ? 0.13 : 0.1); c.beginPath(); c.arc(0, -r * 0.35, r * 0.62, Math.PI * 0.12, Math.PI * 0.88, true); c.stroke();
  if (C.tier > 1) { c.fillStyle = C.c; for (let i = 0; i <= 8; i++) { const a = Math.PI * 0.12 - i / 8 * Math.PI * 1.24 + Math.PI * 2; c.beginPath(); c.arc(Math.cos(a) * r * 0.62, -r * 0.35 + Math.sin(a) * r * 0.62, r * 0.07, 0, 7); c.fill(); } }
  const gy = r * 0.32, gr = r * (0.2 + C.tier * 0.05);
  if (C.tier === 3) { c.fillStyle = C.c; c.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = i % 2 ? gr * 1.15 : gr * 1.55; c.lineTo(Math.cos(a) * rr, gy + Math.sin(a) * rr); } c.closePath(); c.fill(); c.shadowColor = C.gem; c.shadowBlur = r * 0.5; }
  else { c.fillStyle = C.c; c.beginPath(); c.arc(0, gy, gr * 1.25, 0, 7); c.fill(); }
  c.fillStyle = C.gem; c.beginPath(); if (C.tier === 1) c.arc(0, gy, gr, 0, 7); else { c.moveTo(0, gy - gr); c.lineTo(gr * 0.85, gy); c.lineTo(0, gy + gr); c.lineTo(-gr * 0.85, gy); c.closePath(); } c.fill();
  c.shadowBlur = 0; c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(-gr * 0.3, gy - gr * 0.35, gr * 0.25, 0, 7); c.fill();
  c.restore();
}
{ const d0 = drawItemPath; drawItemPath = (c, id, s) => COLLARS[id] ? drawCollarIcon(c, id, s) : d0(c, id, s); }
