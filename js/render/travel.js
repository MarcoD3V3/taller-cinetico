'use strict';
// =====================================================================================
//  Viajar entre capas sin tirones: en vez de saltar de golpe (y ver cómo el suelo de la otra
//  capa aparece a trozos), la pantalla funde a negro un instante, mientras tanto se prepara lo
//  que vas a ver (terreno y suelo dibujado, repartido en varios fotogramas) y vuelve con todo listo.
// =====================================================================================
const TRV = { on: false, el: null };
function trvEl() { if (!TRV.el) { TRV.el = document.createElement('div'); TRV.el.id = 'travelFx'; document.body.appendChild(TRV.el); } return TRV.el; }
const trvWait = ms => new Promise(r => setTimeout(r, ms));
const trvFrame = () => new Promise(r => { let done = false; const go = () => { if (!done) { done = true; r(); } }; requestAnimationFrame(go); setTimeout(go, 50); });
// Trozos de suelo de la vista actual que aún no están dibujados (con la misma escala que usa render())
function trvPending(m = 0, cxv = view.x, cyv = view.y) {
  const z = view.z, k = z * dpr, sc = k <= 0.35 ? 0.25 : k <= 0.75 ? 0.5 : 1, cm = sc === 1 ? chunks : sc === 0.5 ? chunksH : chunksQ;
  const x0 = Math.floor((view.x - cw / 2 / z) / T) - 1 - m, x1 = Math.ceil((view.x + cw / 2 / z) / T) + 1 + m, y0 = Math.floor((view.y - ch / 2 / z) / T) - 1 - m, y1 = Math.ceil((view.y + ch / 2 / z) / T) + 1 + m;
  const out = []; for (let cy = Math.floor(y0 / CH); cy <= Math.floor(y1 / CH); cy++) for (let cx = Math.floor(x0 / CH); cx <= Math.floor(x1 / CH); cx++) if (!cm.has(chunkKey(cx, cy)) || (sc === 1 && _staleCh.has(chunkKey(cx, cy)))) out.push([cx, cy, sc]);
  // primero lo del centro, que es lo que miras
  const mx = cxv / T / CH, my = cyv / T / CH; out.sort((a, b) => Math.hypot(a[0] + 0.5 - mx, a[1] + 0.5 - my) - Math.hypot(b[0] + 0.5 - mx, b[1] + 0.5 - my));
  return out;
}
// Dibuja lo que falta en tandas de ~8 ms por fotograma (como mucho 0,8 s; lo que quede se hace luego como siempre)
async function trvPrebuild(maxMs = 800) {
  const t0 = performance.now();
  while (performance.now() - t0 < maxMs) {
    const list = trvPending(); if (!list.length) return;
    const f0 = performance.now(); for (const [cx, cy, sc] of list) { buildChunk(cx, cy, sc); if (performance.now() - f0 > 8) break; }
    await trvFrame();
  }
}
async function trvGo(fn, args) {
  if (TRV.on) return; // ya estás viajando (layerTick lo pide en cada fotograma mientras pisas el pozo)
  const p = S.player, x = p.x, y = p.y;
  if (BOSS || document.hidden) return fn(...args); // con un jefe se niega al momento; en segundo plano no hay nada que ocultar
  TRV.on = true; const el = trvEl();
  try {
    el.classList.add('on'); await trvWait(130);
    fn(...args);
    if (S && (S.player.x !== x || S.player.y !== y)) { await trvFrame(); await trvPrebuild(); }
  } catch (e) { console.warn('viaje', e); }
  finally { el.classList.remove('on'); TRV.on = false; }
}
{ const d0 = goDown; goDown = (...a) => trvGo(d0, a); }
{ const u0 = goUp; goUp = (...a) => trvGo(u0, a); }
// Al caminar: el suelo de alrededor se dibuja por adelantado (un trozo de margen, primero hacia donde vas)
// en los ratos libres del navegador, en vez de esperar a que entre en pantalla y aparezca a trozos.
{ let last = 0, px = 0, py = 0;
  const ric = window.requestIdleCallback || (f => setTimeout(() => f({ timeRemaining: () => 8 }), 120));
  const ahead = dl => {
    try {
      const now = performance.now();
      if (S && S.player && !TRV.on && !ui.open && now - last > 140 && dl.timeRemaining() > 4) {
        const vx = S.player.x - px, vy = S.player.y - py; px = S.player.x; py = S.player.y;
        const list = trvPending(CH, view.x + vx * 8, view.y + vy * 8); // CH casillas = un trozo de margen
        if (list.length) { last = now; const [cx, cy, sc] = list[0]; buildChunk(cx, cy, sc); }
      }
    } catch (e) { }
    ric(ahead, { timeout: 1000 });
  };
  ric(ahead, { timeout: 1000 });
}
