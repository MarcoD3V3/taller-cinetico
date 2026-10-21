'use strict';
// =====================================================================================
//  El final: la Ciudadela del Primer Engranaje (Gran Ruina), santuarios con tablillas,
//  los Ocho Sellos, la Puerta del Ocaso, el Corazón del Mundo (una región aparte, muy lejos
//  en el mapa) y el epílogo. Los textos están en data/endgame.js.
//
//  Cómo se llega al final:
//   1) Completa los 8 niveles del Núcleo → la Chispa despierta y marca la Ciudadela en el mapa.
//   2) Vence a los 8 Guardianes → cada uno suelta su sello.
//   3) Coloca los sellos en sus pedestales (F) → se abre la Puerta del Ocaso.
//   4) Cruza la Puerta, recorre el puente sobre el abismo y vence a Herrumbre.
//   5) Elige: reavivar el Corazón o liberar la Chispa (cada final da una bendición distinta).
// =====================================================================================
const DIM_X = 300000, ARENA_DX = 84, RUIN_R = 31;
const endS = () => S.end || (S.end = { seals: {}, lore: {}, choice: null, beat: false });
const inDim = (tx = Math.floor(S.player.x / T)) => tx >= DIM_X - 512;
const portalActive = () => S.tier >= TIERS.length && SEALS.every(([, k]) => endS().seals[k]);

// ---------- Dónde está la Ciudadela (determinista por semilla, en tierra firme) ----------
function ruinPos() {
  if (S.ruin && S.ruin.seed === S.gen.seed) return S.ruin;
  const P = S.gen, a0 = hash2(P.seed | 0, 7, 4242) * Math.PI * 2;
  const land = (x, y) => { const t = genTile(x, y, P); return !isLiquid(t); };
  let best = null;
  search: for (let d = 560; d <= 1100; d += 45) for (let k = 0; k < 12; k++) {
    const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.35, x = Math.round(Math.cos(a) * d), y = Math.round(Math.sin(a) * d);
    let n = 0; for (let j = 0; j < 12; j++) { const b = j / 12 * Math.PI * 2; if (land(x + Math.round(Math.cos(b) * 22), y + Math.round(Math.sin(b) * 22))) n++; }
    if (land(x, y)) n += 2;
    if (n >= 12) { best = { x, y }; break search; }
  }
  if (!best) best = { x: Math.round(Math.cos(a0) * 640), y: Math.round(Math.sin(a0) * 640) };
  S.ruin = { ...best, seed: S.gen.seed };
  return S.ruin;
}
// Columnas y pedestales (posiciones relativas al centro, calculadas una vez)
const PILLARS = new Map(), SOCKETS = new Map();
for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; PILLARS.set(Math.round(Math.cos(a) * 15.5) + ',' + Math.round(Math.sin(a) * 15.5), k); }
for (let k = 0; k < 8; k++) { const a = -Math.PI / 2 + k / 8 * Math.PI * 2; SOCKETS.set(Math.round(Math.cos(a) * 7) + ',' + Math.round(Math.sin(a) * 7), k); }
function socketAt(x, y) { const r = ruinPos(); const k = SOCKETS.get((x - r.x) + ',' + (y - r.y)); return k === undefined ? -1 : k; }

// Casilla de la Ciudadela en (dx,dy) respecto al centro; -1 = deja el terreno natural
function ruinTile(dx, dy, x, y, nat) {
  const ax = Math.abs(dx), ay = Math.abs(dy), ch = Math.max(ax, ay), r = Math.hypot(dx, dy), h = hash2(x, y, 913);
  if (ch > RUIN_R) return -1;
  if (ch > 27) return isLiquid(nat) || h < 0.25 ? (h < 0.06 ? G.RUINRUBBLE : G.RUINFLOOR) : -1; // escombros fuera de la muralla
  if (ch >= 25) return ax <= 2 || ay <= 2 ? G.RUINFLOOR : h < 0.1 ? G.RUINRUBBLE : G.RUINWALL; // muralla con 4 puertas y brechas
  if (ax >= 20 && ay >= 20) { // torres de las esquinas, con una piedra rúnica dentro
    if (ax === 20 || ay === 20) return (ax === 20 && ay === 23) || (ay === 20 && ax === 23) ? G.RUINFLOOR : G.RUINWALL;
    return ax === 23 && ay === 23 ? G.RUNESTONE : G.RUINFLOOR;
  }
  if (ax <= 2 && ay <= 2) return ax === 2 || ay === 2 ? (dx === 0 && dy === 2 ? G.PORTALCORE : G.PORTALFRAME) : G.PORTALCORE; // la Puerta del Ocaso
  if (SOCKETS.has(dx + ',' + dy)) return G.SOCKET;
  const pk = PILLARS.get(dx + ',' + dy); if (pk !== undefined) return hash2(pk, 3, 77) < 0.25 ? G.RUINRUBBLE : G.RUINPILLAR;
  if ((ax === 0 && ay > 12) || (ay === 0 && ax > 12)) return G.RUINCANAL;
  if ((r >= 9.5 && r < 10.5) || (r >= 4 && r < 4.8)) return G.RUINRUNE;
  if (r < 12) return G.RUINFLOOR;
  if (h < 0.05) return G.RUINRUBBLE;
  if (h < 0.16 && !isLiquid(nat) && GI[nat].flora && !GI[nat].solid) return -1; // la vegetación se come la ruina
  return G.RUINFLOOR;
}
// El otro lado de la Puerta: plataformas y puentes sobre el abismo
function dimTile(x, y) {
  const dx = x - DIM_X, dy = y;
  if (Math.hypot(dx, dy) <= 6.5) return dy === -5 && Math.abs(dx) <= 1 ? G.RETURNPORTAL : G.HEARTFLOOR;
  const ad = Math.hypot(dx - ARENA_DX, dy);
  if (ad <= 2.2) return G.HEARTCORE;
  if (ad <= 20.5) return G.HEARTFLOOR;
  if (dx > 5 && dx < ARENA_DX - 19) {
    const cy = Math.round(Math.sin(dx / 7) * 5);
    if (Math.abs(dy - cy) <= 1) return G.HEARTBRIDGE;
    for (const ix of [22, 42]) { const icy = Math.round(Math.sin(ix / 7) * 5) + 6; if (Math.hypot(dx - ix, dy - icy) <= 3.2) return dx === ix && dy === icy ? G.RUNESTONE : G.HEARTFLOOR; if (dx === ix && dy > Math.round(Math.sin(ix / 7) * 5) && dy < icy) return G.HEARTBRIDGE; }
  }
  if (hash2(x >> 2, y >> 2, 77) < 0.02 && hash2(x, y, 5) < 0.7) return G.HEARTFLOOR; // restos flotando
  return G.ABYSS;
}
// Se llama al generar cada chunk (world/biomes.js)
function endOverlay(c) {
  const x0 = c.cx * CS, y0 = c.cy * CS;
  if (x0 >= DIM_X - 512) {
    for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) { const i = (y << CSH) | x, t = dimTile(x0 + x, y0 + y); c.g[i] = t; c.t[i] = GI[t].hp || 0; }
    c.faunaDone = true; return;
  }
  const R = ruinPos();
  if (x0 + CS > R.x - RUIN_R && x0 <= R.x + RUIN_R && y0 + CS > R.y - RUIN_R && y0 <= R.y + RUIN_R) {
    for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) { const i = (y << CSH) | x, t = ruinTile(x0 + x - R.x, y0 + y - R.y, x0 + x, y0 + y, c.g[i]); if (t >= 0) { c.g[i] = t; c.t[i] = GI[t].hp || 0; } }
    return;
  }
  // Santuarios de los Forjadores: una piedra rúnica entre columnas rotas (tablillas de lore)
  const hs = hash2(c.cx, c.cy, (S.gen.seed | 0) + 555);
  if (hs < 0.055 && Math.hypot(x0, y0) > 80) {
    const lx = 6 + ((hash2(c.cx, c.cy, 9) * 20) | 0), ly = 6 + ((hash2(c.cx, c.cy, 10) * 20) | 0);
    if (isLiquid(c.g[(ly << CSH) | lx])) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const i = ((ly + dy) << CSH) | (lx + dx), corner = Math.abs(dx) === 2 && Math.abs(dy) === 2;
      const t = !dx && !dy ? G.RUNESTONE : corner ? (hash2(lx + dx, ly + dy, c.cx) < 0.5 ? G.RUINPILLAR : G.RUINRUBBLE) : G.RUINFLOOR;
      c.g[i] = t; c.t[i] = GI[t].hp || 0;
    }
  }
}

// ---------- Crónicas ----------
function unlockLore(id, show) {
  const E = endS(), e = LORE_BY[id]; if (!e || E.lore[id]) return false;
  E.lore[id] = Date.now(); toast(`📜 Nueva crónica: ${e.t} (J para leer)`, true); sfx('beep');
  if (show) setTimeout(() => { if (S && !ui.open) openLore(id); }, 600);
  return true;
}
function loreOn(on, show) { for (const e of LORE) if (e.on === on) unlockLore(e.id, show); }
// Objetos con uso especial (F)
function endUse(s) {
  if (s.id === 'loreTablet') {
    const E = endS(), next = TABLET_ORDER.find(id => !E.lore[id]);
    if (!next) { toast('Ya conoces todo lo que cuentan las tablillas. Esta se desmorona en tus manos.'); }
    else unlockLore(next, true);
    if (--s.n <= 0) S.inv[S.sel] = null; invVersion++; return true;
  }
  if (s.id.startsWith('seal_')) { toast(revealed() ? 'Llévalo a su pedestal en la Gran Ruina y pulsa F sobre él.' : 'Un sello de la Puerta del Ocaso. Tu Núcleo todavía no recuerda dónde está.'); return true; }
  return false;
}
const revealed = () => S.tier >= TIERS.length;
function endOnTier(t) {
  loreOn('tier:' + t, t >= TIERS.length);
  if (t >= TIERS.length) revealRuin();
}
function revealRuin() {
  const R = ruinPos(); if (!S.marks.some(m => m.ruin)) S.marks.push({ x: R.x, y: R.y, n: 'Ciudadela del Primer Engranaje', ruin: 1 });
  toast('✨ La Chispa ha despertado: la Ciudadela del Primer Engranaje está marcada en tu mapa (M).', true); ui.goalDirty = true;
}
function endOnBoss(k) {
  const B = BOSSES[k];
  if (B.seal) { const sk = B.seal.slice(5); if (!endS().seals[sk] && !invCount(B.seal)) { invAdd(B.seal, 1); toast(`🔶 ${B.n} te entrega el ${ITEMS[B.seal].n}`, true); } unlockLore('g_' + k); ui.goalDirty = true; }
  if (B.final) { const E = endS(); E.beat = true; unlockLore('devour'); setTimeout(openEnding, 2500); }
}

// ---------- Interacción con la ruina (F apuntando a una casilla) ----------
function endInteract(tx, ty) {
  const gi = GI[gnd(tx, ty)], kind = gi.ruin; if (!kind) return false;
  const E = endS();
  if (kind === 'socket') {
    const k = socketAt(tx, ty); if (k < 0) return false; const [boss, sk, n] = SEALS[k];
    if (!inReach(tx, ty)) { toastErr('Acércate al pedestal'); return true; }
    if (E.seals[sk]) { toast(`Aquí descansa el ${n}.`); return true; }
    if (invCount('seal_' + sk) > 0) {
      invTake('seal_' + sk, 1); E.seals[sk] = 1; invalidateRuin(); sfx('spell'); ui.goalDirty = true;
      const placed = SEALS.filter(([, s]) => E.seals[s]).length; toast(`${n} colocado (${placed}/8)`, true);
      FX.push({ x: tx * T + 16, y: ty * T + 16, ring: 90, t: 1, c: ITEMS['seal_' + sk].c }); shake = 0.3;
      unlockLore('firstSeal');
      if (portalActive()) { unlockLore('portal', true); toast('🌀 ¡La Puerta del Ocaso se ha abierto!', true); bossRoar(); }
      else if (placed === 8) toast('Los ocho sellos brillan, pero la Puerta no responde: tu Núcleo aún no ha despertado (completa los 8 niveles).', true);
    } else toast(`Pedestal vacío: falta el ${n}. Lo guarda ${BOSSES[boss].n}.`);
    return true;
  }
  if (kind === 'frame' || kind === 'portal') { toast(portalActive() ? 'La Puerta del Ocaso está abierta. Entra por el lado sur.' : `La Puerta del Ocaso está sellada · Núcleo ${revealed() ? 'despierto ✓' : 'dormido ✗'} · Sellos ${SEALS.filter(([, s]) => E.seals[s]).length}/8`); return true; }
  if (kind === 'core') { toast(E.beat ? 'El Corazón late tranquilo.' : 'El Corazón del Mundo apenas late. Algo se lo está comiendo.'); return true; }
  if (kind === 'wall' || kind === 'pillar') { toast('Piedra de los Forjadores: ninguna herramienta la araña.'); return true; }
  return false;
}
function invalidateRuin() { const R = ruinPos(); for (let y = -8; y <= 8; y += 4) for (let x = -8; x <= 8; x += 4) invalidateTile(R.x + x, R.y + y); }
function tpTo(wx, wy) {
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) getChunk(Math.floor(wx / T / CS) + dx, Math.floor(wy / T / CS) + dy);
  S.player.x = wx; S.player.y = wy; view.x = wx; view.y = wy; P.iframe = 1; FX.push({ x: wx, y: wy, ring: 60, t: 0.8, c: '#c8a8ff' }); sfx('spell');
}
// ---------- Cada fotograma (solo con el mundo activo) ----------
let _endT = 0, _portalMsg = 0;
function endTick(fdt) {
  _endT -= fdt; _portalMsg -= fdt; if (_endT > 0) return; _endT = 0.2;
  const E = endS(), px = Math.floor(S.player.x / T), py = Math.floor((S.player.y + 6) / T), g = gnd(px, py), kind = GI[g].ruin;
  if (!E.lore.spark) unlockLore('spark');
  if (revealed() && !S.marks.some(m => m.ruin)) revealRuin();
  if (!TIERS[S.tier]) ui.goalDirty = true; // la distancia a la Ciudadela cambia al moverte
  const R = ruinPos();
  if (!E.lore.ruin && Math.max(Math.abs(px - R.x), Math.abs(py - R.y)) < 25) unlockLore('ruin', true);
  if (kind === 'portal') {
    if (portalActive()) { tpTo(DIM_X * T + 16, 2 * T); unlockLore('dim', true); toast('Has cruzado la Puerta del Ocaso', true); }
    else if (_portalMsg <= 0) { _portalMsg = 4; toast('El arco está frío. Faltan sellos o tu Núcleo aún no ha despertado.'); }
  } else if (kind === 'return') { tpTo((R.x) * T + 16, (R.y + 5) * T + 16); toast('Vuelves a la Ciudadela'); }
  if (inDim(px) && !E.beat && !BOSS && Math.hypot(px - DIM_X - ARENA_DX, py) < 17 && !E._summoning) {
    E._summoning = true; summonBoss('rustHeart', false, { x: (DIM_X + ARENA_DX) * T + 16, y: -6 * T }); setTimeout(() => { E._summoning = false; }, 6000);
  }
}
// ---------- Objetivo en el panel cuando ya no quedan niveles ----------
function endGoalHTML() {
  const E = endS(), R = ruinPos(), dx = R.x - S.player.x / T, dy = R.y - S.player.y / T, d = Math.round(Math.hypot(dx, dy));
  const dir = ['este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste', 'norte', 'noreste'][(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8];
  if (E.choice) return `<h3>El mundo gira</h3><div class="mut">${esc(LORE_BY[E.choice === 'revive' ? 'endA' : 'endB'].t)}. Sigue construyendo: la historia completa está en tus Crónicas (<kbd>J</kbd>).</div>`;
  if (E.beat) return `<h3>El Corazón espera</h3><div class="mut">Herrumbre ha caído. <button class="pri" onclick="openEnding()">Decidir el destino</button></div>`;
  const placed = SEALS.filter(([, s]) => E.seals[s]).length;
  let h = `<h3>La Puerta del Ocaso</h3><div class="mut" style="margin-bottom:6px">${inDim() ? 'Estás al otro lado. Sigue el puente hacia el Corazón.' : `Ciudadela: ${d} casillas al ${dir}`}</div>`;
  h += `<div class="row"><span class="l">✓ Núcleo despierto</span></div><div class="row"><span class="l">Sellos colocados</span><span class="num">${placed}/8</span></div><div class="bar"><i style="width:${placed / 8 * 100}%"></i></div><div class="sealrow">`;
  for (const [boss, sk, n] of SEALS) { const st = E.seals[sk] ? 'on' : invCount('seal_' + sk) ? 'have' : ''; h += `<span class="seal ${st}" data-id="seal_${sk}" title="${esc(n)} · ${esc(BOSSES[boss].n)}">${itemImg('seal_' + sk, 18)}</span>`; }
  return h + `</div><div class="mut small">${portalActive() ? '🌀 La Puerta está abierta' : 'Vence a los Guardianes y coloca sus sellos (F en cada pedestal).'}</div>`;
}

// ---------- Ventanas: Crónicas y epílogo ----------
(function () {
  const mk = (id, cls) => { const m = document.createElement('div'); m.id = id; m.className = 'modal'; m.hidden = true; m.innerHTML = `<div class="modal-in ${cls}"></div>`; document.body.appendChild(m); m.addEventListener('mousedown', e => { if (e.target === m || e.target.closest('[data-close]')) closeModal(); }); return m; };
  mk('mLore', 'lorem'); mk('mEnd', 'endm');
  MODALS.lore = 'mLore'; MODALS.end = 'mEnd';
  const top = $('bHelp'); if (top) { const b = document.createElement('button'); b.id = 'bLore'; b.innerHTML = 'Crónicas <kbd>J</kbd>'; b.onclick = () => openLore(); top.parentNode.insertBefore(b, top); }
})();
const LORE_HINT = { start: 'Desde el principio', tablet: 'Tablilla de los Forjadores', ruin: 'Entra en la Ciudadela del Primer Engranaje', seal: 'Coloca tu primer sello', portal: 'Abre la Puerta del Ocaso', dim: 'Cruza la Puerta', end: 'El final' };
function loreHint(on) { if (on.startsWith('tier:')) return `Completa el nivel ${on.slice(5)} del Núcleo`; if (on.startsWith('boss:')) return `Vence a ${BOSSES[on.slice(5)].n}`; if (on.startsWith('end:')) return 'Elige el destino del Corazón'; return LORE_HINT[on] || ''; }
let _loreSel = null;
function openLore(sel) {
  const E = endS(); openModal('lore'); if (sel) _loreSel = sel;
  const got = LORE.filter(e => E.lore[e.id]); if (!_loreSel || !E.lore[_loreSel]) _loreSel = got.length ? got[got.length - 1].id : null;
  const cur = _loreSel && LORE_BY[_loreSel];
  $('mLore').firstChild.innerHTML = `<header><h2>Crónicas de los Forjadores</h2><span class="mut small">${got.length}/${LORE.length} páginas</span><button data-close>Cerrar <kbd>J</kbd></button></header>
    <div class="lorebody"><nav class="lorelist">${LORE.map(e => E.lore[e.id] ? `<button data-lore="${e.id}" class="${e.id === _loreSel ? 'on' : ''}">${esc(e.t)}</button>` : `<div class="lk" title="${e.on === 'tablet' ? 'Las tablillas salen de las piedras rúnicas de los santuarios, de los escombros de la Ciudadela y de los puentes del abismo' : ''}">🔒 ${esc(loreHint(e.on))}</div>`).join('')}</nav>
    <article class="loretext">${cur ? `<h3>${esc(cur.t)}</h3><p>${esc(cur.x)}</p>` : '<p class="mut">Aún no has descubierto nada.</p>'}</article></div>`;
}
$('mLore').addEventListener('click', e => { const b = e.target.closest('[data-lore]'); if (b) openLore(b.dataset.lore); });
function openEnding() {
  const E = endS(); if (!E.beat) return; openModal('end');
  const body = $('mEnd').firstChild;
  if (E.choice) { const e = LORE_BY[E.choice === 'revive' ? 'endA' : 'endB']; body.innerHTML = `<h1>${esc(e.t)}</h1><p>${esc(e.x)}</p><p class="mut small">${E.choice === 'revive' ? 'Bendición del Segundo Giro: +40 de vida máxima, +15 % de velocidad de trabajo y +5 % de velocidad.' : 'Bendición de la Chispa Libre: +60 de maná, +15 % de suerte y +25 % de experiencia.'}</p><p class="credits">Taller Cinético · Gracias por jugar. El mundo sigue girando: tu fábrica también.</p><button class="pri big" data-close>Volver al mundo</button>`; return; }
  body.innerHTML = `<h1>${esc(LORE_BY.devour.t)}</h1><p>${esc(LORE_BY.devour.x)}</p>
    <div class="endch"><button data-end="revive"><b>Reavivar el Corazón</b><span>El mundo vuelve a girar como lo soñaron los Forjadores. Bendición: más vida, trabajo y velocidad.</span></button>
    <button data-end="free"><b>Liberar la Chispa</b><span>El Corazón se reparte por todo el mundo y la magia fluye libre. Bendición: más maná, suerte y experiencia.</span></button></div>`;
}
$('mEnd').addEventListener('click', e => {
  const b = e.target.closest('[data-end]'); if (!b) return; const E = endS(); if (E.choice) return;
  E.choice = b.dataset.end; unlockLore(E.choice === 'revive' ? 'endA' : 'endB'); ui.goalDirty = true; vitalsDirty = true; invVersion++;
  toast(E.choice === 'revive' ? '❤ El Corazón vuelve a latir' : '✨ La Chispa es libre', true); openEnding(); saveGame(true);
});

// ---------- Dibujo animado (portal, sellos, runas, Corazón) ----------
function endDraw(ctx, x0, y0, x1, y1) {
  const now = performance.now() / 1000, E = endS(), R = ruinPos();
  const vis = (x, y, m) => x >= x0 - m && x <= x1 + m && y >= y0 - m && y <= y1 + m;
  if (vis(R.x, R.y, 16)) {
    const cx = R.x * T + 16, cy = R.y * T + 16, on = portalActive();
    // Engranaje gigante incrustado en la plaza: gira más deprisa con cada sello
    const placed = SEALS.filter(([, s]) => E.seals[s]).length;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(now * (0.02 + placed * 0.03)); ctx.strokeStyle = `rgba(224,181,76,${0.12 + placed * 0.04})`; ctx.lineWidth = 3;
    ctx.beginPath(); for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, rr = i % 2 ? 12.2 * T : 12.8 * T; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 11.4 * T, 0, 7); ctx.stroke(); ctx.restore();
    // Sellos en sus pedestales
    for (const [key, k] of SOCKETS) { const [sx, sy] = key.split(',').map(Number), sk = SEALS[k][1], id = 'seal_' + sk, px = (R.x + sx) * T + 16, py = (R.y + sy) * T + 16;
      if (E.seals[sk]) { ctx.globalAlpha = 0.35 + 0.25 * Math.sin(now * 2 + k); circ(ctx, px, py, 16, ITEMS[id].c); ctx.globalAlpha = 1; drawItem(ctx, id, px, py - 4 + Math.sin(now * 2 + k) * 2, 16);
        if (on) { ctx.strokeStyle = ITEMS[id].c; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(cx, cy); ctx.stroke(); ctx.globalAlpha = 1; } } }
    // La Puerta: remolino de engranajes y luz
    ctx.save(); ctx.translate(cx, cy);
    const n = on ? 7 : 3; for (let i = 0; i < n; i++) { ctx.rotate(now * (on ? 1.2 : 0.2) * (i % 2 ? -1 : 1) * 0.3); ctx.strokeStyle = on ? `hsla(${270 + i * 12},90%,${60 + i * 4}%,${0.75 - i * 0.08})` : 'rgba(120,100,160,.25)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 8 + i * 6, i, i + 4.2); ctx.stroke(); }
    if (on) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite, -70, -70, 140, 140); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
  }
  if (x1 >= DIM_X - 40) {
    const cx = (DIM_X + ARENA_DX) * T + 16, beat = E.beat ? 1 : 0.4, pulse = 0.5 + 0.5 * Math.sin(now * (E.beat ? 2.4 : 1.1));
    if (vis(DIM_X + ARENA_DX, 0, 30)) {
      ctx.save(); ctx.translate(cx, 16); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 + 0.4 * pulse * beat; ctx.drawImage(glowSprite, -180, -180, 360, 360); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 3; i++) { ctx.rotate(now * 0.15 * (i % 2 ? -1 : 1)); ctx.strokeStyle = E.beat ? 'rgba(255,190,90,.55)' : 'rgba(150,70,40,.5)'; ctx.lineWidth = 4; ctx.setLineDash([22, 10]); ctx.beginPath(); ctx.arc(0, 0, (6 + i * 5) * T, 0, 7); ctx.stroke(); }
      ctx.setLineDash([]); circ(ctx, 0, 0, 30 + pulse * 6, E.beat ? '#ffb050' : '#a0401a'); circ(ctx, 0, 0, 16 + pulse * 4, E.beat ? '#fff0c0' : '#ff7a2a'); ctx.restore();
    }
    if (vis(DIM_X, -5, 6)) { ctx.save(); ctx.translate(DIM_X * T + 16, -5 * T + 16); for (let i = 0; i < 4; i++) { ctx.rotate(now * 0.8 * (i % 2 ? -1 : 1) * 0.4); ctx.strokeStyle = `hsla(${200 + i * 15},90%,65%,.7)`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 8 + i * 6, i, i + 4); ctx.stroke(); } ctx.restore(); }
  }
}
