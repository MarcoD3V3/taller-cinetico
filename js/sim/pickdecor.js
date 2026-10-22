'use strict';
// =====================================================================================
//  Recoger lo pequeño del suelo: las flores, matas, helechos, setas, ramitas, piedrecitas,
//  conchas o huesos que adornan el suelo se cogen con un clic corto (como romper una
//  planta) y dan su objeto. Las matas de hierba a veces sueltan semillas.
//  Lo recogido no vuelve a salir en esa casilla (se guarda con el mundo).
// =====================================================================================
const DECOR_PICK = {
  flowerY: ['petals', 'Flor amarilla'], flowerR: ['petals', 'Flor roja'], flowerW: ['petals', 'Flor blanca'], flowerB: ['petals', 'Flor azul'], flowerP: ['petals', 'Flor rosa'],
  clump: ['herbs', 'Mata de hierba', 1], dryTuft: ['herbs', 'Hierba seca', 1], fern: ['herbs', 'Helecho', 1], leaves: ['herbs', 'Hojas caídas'], reedS: ['reeds', 'Juncos'],
  pebble: ['stone', 'Piedrecita'], mossy: ['stone', 'Piedra con musgo'], icePeb: ['ice', 'Trozo de hielo'], snowLump: ['ice', 'Montoncito de nieve'],
  twig: ['stick', 'Ramita'], bone: ['bone', 'Hueso'], shell: ['shell', 'Concha'], crystalS: ['crystal', 'Cristalito'], ember: ['coal', 'Ascua'],
  mushR: ['mushroom', 'Seta roja'], mushB: ['mushroom', 'Seta parda'], mushG: ['mushroom', 'Seta verde'], mushP: ['glowcap', 'Seta morada'],
};
// Qué adorno hay en la casilla (o null)
function decorAt(x, y) {
  const g = GI[gnd(x, y)], list = DECOR_BY[g.key]; if (!list || g.solid || g.liquid || at(x, y)) return null;
  if (hash2(x, y, 333) > DECOR_DENS || (S && S.picked && S.picked[x + ',' + y])) return null;
  const k = list[(hash2(x, y, 334) * list.length) | 0]; return DECOR_PICK[k] && ITEMS[DECOR_PICK[k][0]] ? k : null;
}
// Lo recogido ya no se dibuja
{ const d0 = drawDecor; drawDecor = (c, x, y, t, px, py) => { if (S && S.picked && S.picked[x + ',' + y]) return; d0(c, x, y, t, px, py); }; }
function pickDecor(x, y) {
  const k = decorAt(x, y); if (!k) return false; const [id, n, grass] = DECOR_PICK[k];
  (S.picked || (S.picked = {}))[x + ',' + y] = 1;
  const got = [[id, 1]]; if (grass && typeof grassSeed === 'function') { const sd = grassSeed(x, y); if (sd) got.push([sd, 1]); }
  let lost = 0; for (const [i, q] of got) lost += invAdd(i, q);
  fxText(x * T + 16, y * T, got.map(([i, q]) => '+' + q + ' ' + ITEMS[i].n).join(' · '), '#c8e08a'); burst(x, y, GI[gnd(x, y)].c);
  tone(640, 0.04, 'sine', 0.025, 1.3); gainXP('gather', 1); if (lost) toastErr('Inventario lleno');
  if (got.length > 1 && typeof seedTutorial === 'function') seedTutorial();
  onTileChange(x, y, false); return true;
}
// Clic mantenido sobre el adorno: se recoge en un momento (antes de cavar la casilla)
{ const m0 = updateMining; updateMining = fdt => {
  if (S && mouse.down && !ui.hand && !selectedBlock()) {
    const id = heldId(), it = id && ITEMS[id], busy = it && (it.seed || (typeof FTOOLS !== 'undefined' && FTOOLS[id]) || (typeof WEAPONS !== 'undefined' && WEAPONS[id]));
    const x = mouse.tx, y = mouse.ty, k = !busy && inReach(x, y) && decorAt(x, y);
    if (k) {
      if (!ui.mine || ui.mine.x !== x || ui.mine.y !== y || !ui.mine.pick) ui.mine = { t: 0, x, y, pick: 1 };
      ui.mine.need = 0.25; ui.mine.t += fdt; if (ui.mine.t >= ui.mine.need) { pickDecor(x, y); ui.mine = { t: 0, x: -1e9, y: 0 }; }
      return;
    }
  }
  if (ui.mine && ui.mine.pick) ui.mine = { t: 0, x: -1e9, y: 0 };
  m0(fdt);
}; }
// La tarjeta del cursor lo dice
{ const t0 = tileCard; tileCard = (tx, ty) => { const k = decorAt(tx, ty), h = t0(tx, ty); return k ? h + `<div class="small good">🌼 ${esc(DECOR_PICK[k][1])}: clic para recoger (${esc(ITEMS[DECOR_PICK[k][0]].n)})</div>` : h; }; }
