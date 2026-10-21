'use strict';
// Bucle principal: simulación a paso fijo, render a la tasa del monitor, UI a baja frecuencia.
// Objeto en la mano (herramientas y objetos de uso)
const heldId = () => { const s = S.inv[S.sel]; return s ? s.id : null; };
// Objetos que actúan solo por llevarlos en el inventario (se recalcula al cambiar el inventario)
let _flagVer = -1; const _flags = {};
const hasFlag = id => { if (_flagVer !== invVersion) { _flagVer = invVersion; for (const k of ['speedBoots', 'hasteStaff', 'fortuneAmulet', 'hunterCharm', 'magnetGlove', 'dashBoots', 'phoenixWings']) _flags[k] = invCount(k) > 0 || !!(S.equip && Object.values(S.equip).includes(k)); } return _flags[id]; };
const hasBoots = () => hasFlag('speedBoots');
// Efectos temporales (pociones y pergaminos)
let buff = k => { const b = S.buffs; return !!b && (b[k] > 0 || (b.chrono > 0 && (k === 'swift' || k === 'miner' || k === 'hunter'))); };
const BUFF_N = { stealth: 'Sigilo', swift: 'Presteza', miner: 'Minero', night: 'Visión nocturna', luck: 'Fortuna', hunter: 'Cazador', chrono: 'Crónica', reveal: 'Revelación' };
function tickBuffs(fdt) { const b = S.buffs; if (!b) return; for (const k in b) { b[k] -= fdt; if (b[k] <= 0) { delete b[k]; toast('Se acabó el efecto: ' + BUFF_N[k]); } } }
const diff = () => S.gen.diff || 1;
function useItem() {
  const s = S.inv[S.sel]; if (!s) return false;
  if (repairWith(s) || endUse(s) || fishUse(s)) return true;
  if (survUse(s)) return true;
  const it0 = ITEMS[s.id];
  if (it0.learn) { if (learnSpell(it0.learn)) { if (--s.n <= 0) S.inv[S.sel] = null; invVersion++; } return true; }
  if (it0.summon) { if (summonBoss(it0.summon)) { if (--s.n <= 0) S.inv[S.sel] = null; invVersion++; } return true; }
  const u = it0.use; if (!u) return false;
  if (u.tp) {
    const c = blocks.find(b => b.type === 'core'); if (!c) { toastErr('No hay ningún Núcleo al que volver'); return true; }
    S.player.x = c.x * T + 16; S.player.y = c.y * T + 64; view.x = S.player.x; view.y = S.player.y; toast('Has vuelto al Núcleo');
  }
  if (u.ward) addWard(S.player.x, S.player.y, u.ward[0], u.ward[1], ITEMS[s.id].n);
  if (u.buff) { const b = S.buffs || (S.buffs = {}); b[u.buff] = Math.max(b[u.buff] || 0, u.t); toast(`${BUFF_N[u.buff]} durante ${Math.round(u.t / 60 * 10) / 10} min`); }
  if (--s.n <= 0) S.inv[S.sel] = null; invVersion++;
  return true;
}
let _rT = 0, acc = 0, lastT = 0, uiT = 0, miniT = 0, saveT = 0, fpsN = 0, fpsT = 0, magT = 0;
const pmove = { moving: false, sprint: false, ang: 0 };
// Velocidad realista: andar ~3,3 casillas/s y correr ~5,6 (antes 6,5 y 11). Acelera y frena con
// inercia (en el hielo resbalas), el terreno frena o acelera y el paso de la animación va con la distancia.
function updatePlayer(fdt) {
  let mx = 0, my = 0;
  if (keys.has('w') || keys.has('arrowup')) my--; if (keys.has('s') || keys.has('arrowdown')) my++;
  if (keys.has('a') || keys.has('arrowleft')) mx--; if (keys.has('d') || keys.has('arrowright')) mx++;
  const want = !!(mx || my), p = S.player;
  pmove.sprint = want && keys.has('shift') && canSprint();
  motionPre(fdt);
  const mf = moveFactors(); let tvx = 0, tvy = 0;
  if (want) {
    pmove.ang = Math.atan2(my, mx);
    const boost = (hasBoots() ? 1.5 : 1) * (hasFlag('hasteStaff') ? 1.25 : 1) * (buff('swift') ? 1.4 : 1) * speedMul() * CM().speed * mountSpeed() * (P.chill > 0 ? 0.6 : 1) * (hasFlag('phoenixWings') ? 1.15 : 1);
    const l = Math.hypot(mx, my), sp = (pmove.sprint ? 5.6 : 3.3) * boost * mf.mul * T;
    tvx = mx / l * sp; tvy = my / l * sp;
  }
  const a = Math.min(1, mf.grip * fdt);
  P.mvx = (P.mvx || 0) + (tvx - (P.mvx || 0)) * a; P.mvy = (P.mvy || 0) + (tvy - (P.mvy || 0)) * a;
  if (!want && Math.hypot(P.mvx, P.mvy) < 4) P.mvx = P.mvy = 0;
  const ox = p.x, oy = p.y, fromLv = lvPoint(p.x, p.y + 5), dx = P.mvx * fdt, dy = P.mvy * fdt;
  // Si ya estás dentro de algo sólido (partida antigua), puedes salir en cualquier dirección
  const stuck = !playerFree(p.x, p.y);
  if (dx) { if (stuck || playerFree(p.x + dx, p.y)) p.x += dx; else P.mvx = 0; }
  if (dy) { if (stuck || playerFree(p.x, p.y + dy)) p.y += dy; else P.mvy = 0; }
  motionPost(fromLv);
  const moved = Math.hypot(p.x - ox, p.y - oy);
  pmove.moving = want && moved > 0.2;
  // Un fotograma de la animación cada ~10 px (zancada de ~42 px por ciclo): los pies no patinan
  if (pmove.moving) P.walk += moved / (P.swim === 2 ? 15 : pmove.sprint ? 13 : 10.5);
}
// Guante imantado: recoge lo que llevan las cintas cercanas
function magnetTick() {
  if (!hasFlag('magnetGlove')) return;
  const px = Math.floor(S.player.x / T), py = Math.floor(S.player.y / T); let n = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const b = at(px + dx, py + dy); if (b && b.items && b.items.length) { for (const it of b.items) if (!invAdd(it.id, 1)) n++; b.items = []; } }
  if (n) toast(`Guante imantado: +${n}`);
}
// Eficacia y área de cada tipo de herramienta
const TK_EFF = { pick: 1, axe: 1, shovel: 1, hammer: 0.6, sickle: 0.8, paxel: 0.9, excav: 0.45 }, TK_AREA = { hammer: 1, sickle: 1, excav: 2 };
let _smelt = null;
function smeltOf(id) {
  if (!_smelt) { _smelt = {}; for (const r of RECIPES.furnace) { const k = Object.keys(r.in); if (k.length === 1 && r.in[k[0]] === 1 && !_smelt[k[0]]) _smelt[k[0]] = Object.keys(r.out)[0]; } }
  return _smelt[id] || id;
}
// Alcance: se pica a 5,5 casillas; se caza a 2,5 casillas más lo que dé el arma
const REACH = 5.5;
const inReach = (tx, ty, r = REACH) => Math.hypot((tx + 0.5) * T - S.player.x, (ty + 0.5) * T - S.player.y) <= r * T;
// Clase de casilla: roca/mena, madera, planta o suelo
let tileClass = gi => gi.floorK ? gi.floorK : gi.rock || gi.dot || (gi.need && gi.need.k === 'pick' && !gi.tree && !gi.plant) ? 'rock' : gi.tree ? 'tree' : gi.plant ? 'plant' : 'ground';
const CLASS_KINDS = { rock: ['pick', 'hammer', 'paxel', 'excav'], tree: ['axe', 'sickle', 'paxel'], plant: ['axe', 'sickle', 'paxel'], ground: ['shovel', 'paxel'] };
const CLASS_SKILL = { rock: 'mining', tree: 'wood', plant: 'gather', ground: 'mining' };
// Coste de maná de las armas mágicas
const manaCost = id => { const it = ITEMS[id]; if (!it || !it.weapon) return 0; return it.s === 'staff' ? 10 : it.s === 'wand' ? 6 : it.weapon.el && it.weapon.el !== 'holy' && it.weapon.dmg >= 5 ? 15 : 0; };
// Colocar suelo con tierra, arena, piedra, tablones… sobre hoyos, roca pelada o agua
// Qué pasa al poner un bloque de suelo (tierra, arena, piedra, tablones…) en una casilla:
//  hoyo → se rellena 1 nivel (hace falta 1 bloque por cada nivel cavado) · agua o lava → suelo
//  la misma tierra a medio cavar → recupera 1 nivel · suelo natural → lo cubre (te devuelve lo que había)
//  null = no se puede (ya hay otro suelo construido: quítalo antes)
const NATURAL_SOIL = new Set(['GRASS', 'DRYGRASS', 'JUNGLEGRASS', 'DARKGRASS', 'SWAMPGRASS', 'MOSS', 'MYCELIUM', 'AMETHYST', 'TOXIC', 'SAND', 'REDSAND', 'BLACKSAND', 'SNOW', 'ASH', 'MUD', 'PEAT', 'CLAY', 'SALT', 'GRAVEL', 'DIRT']);
function groundTarget(id, g, x, y) {
  const to = GROUND_PLACE[id]; if (!to) return null; const gi = GI[g], T2 = G[to];
  if (gi.liquid === 'void') return null; // el abismo no se rellena
  if (gi.liquid) return { kind: 'fill', to: gi.liquid === 'lava' ? G.BASALT : T2 };
  if (g === G.PIT) return { kind: 'pit', to: T2 };
  if (g === G.ROCKFLOOR) return { kind: 'fill', to: T2 };
  if (T2 === g && gi.hp && (treeHp(x, y) < gi.hp || depthAt(x, y) > 0)) return { kind: 'repair', to: T2 };
  if (FLOOR_ITEMS.has(id) && NATURAL_SOIL.has(gi.key) && T2 !== g) return { kind: 'cover', to: T2, back: gi.drop };
  return null;
}
function placeGround(id, tx, ty, g) {
  const r = groundTarget(id, g, tx, ty); if (!r) return false;
  if (r.kind === 'pit') { const d = depthAt(tx, ty); if (d > 1) setDepth(tx, ty, d - 1); else { setDepth(tx, ty, 0); setGround(tx, ty, r.to, GI[r.to].hp ? 1 : 0); } }
  else if (r.kind === 'repair') { if (treeHp(tx, ty) < GI[g].hp) setGround(tx, ty, g, treeHp(tx, ty) + 1); setDepth(tx, ty, depthAt(tx, ty) - 1); }
  else { if (r.back) invAdd(r.back, 1); setGround(tx, ty, r.to, GI[r.to].hp ? 1 : 0); }
  invTake(id, 1); gainXP('build', 1); burst(tx, ty, GI[r.to].c); return true;
}
let _placeT = 0;
function updateMining(fdt) {
  _placeT -= fdt;
  const tx = mouse.tx, ty = mouse.ty, onBlock = !!at(tx, ty);
  // Clic izquierdo con la mano libre o un objeto que no es bloque · clic derecho mantenido en el terreno
  const active = (mouse.down && !selectedBlock()) || (mouse.rdown && !onBlock && !mouse.rblock);
  if (!active) { ui.mine.t = 0; return; }
  const id = heldId(), mw = mouseWorld();
  if (heldRod()) { ui.mine.t = 0; return; } // con la caña, el clic es para pescar (sim/fishing.js)
  // Combate: con arma ataca siempre; sin arma, puñetazo si apuntas a un enemigo cercano
  if (mouse.down && !selectedBlock()) {
    if (id === 'grapple') { if (!P.grap && !mouse.grapDone) { grappleTo(mw); mouse.grapDone = true; wearHeld(1); } return; }
    if (WEAPONS[id] || (!TOOLS[id] && nearestFoe(mw.x, mw.y, 30))) { if (playerAttack(id, mw) !== false || WEAPONS[id]) { ui.mine.t = 0; return; } }
  }
  // Cazar
  let w = WEAPONS[id] || null;
  const cost = manaCost(id), weak = cost && survOn() && pcInit().mana < cost;
  if (w && weak) w = { dmg: w.dmg * 0.35, reach: (w.reach || 0) * 0.5 };
  const huntR = CM().reach * 2.5 * T + (w ? (w.reach || 0) * 3 : 0) + lvOf('hunt') * 0.15 * T;
  const an = animalAt(mw.x, mw.y, w ? w.reach || 0 : 0);
  if (an && Math.hypot(an.x - S.player.x, an.y - S.player.y) <= huntR) {
    if (ui.mine.a !== an) ui.mine = { t: 0, x: -1e9, y: 0, a: an };
    ui.mine.t += fdt;
    const need = w && w.el === 'time' ? 0.05 : (0.35 + SPECIES[an.sp].s * 0.06) / (w ? w.dmg : 1) / ((buff('hunter') ? 1.6 : 1) * (hasFlag('hunterCharm') ? 1.3 : 1) * (1 + 0.06 * lvOf('hunt')) * workMul() * CM().hunt) * diff();
    ui.mine.need = need;
    if (ui.mine.t >= need) {
      const sp = SPECIES[an.sp]; huntWith(an, w); if (w) wearHeld(1); ui.mine = { t: 0, x: -1e9, y: 0 };
      if (survOn()) { const pc = S.pc; pc.stam = Math.max(0, pc.stam - 4); if (cost && !weak) { pc.mana -= cost * (1 - 0.04 * lvOf('magic')); gainXP('magic', cost / 2); } else if (weak) toastErr('Sin maná: el arma pierde su poder'); }
      gainXP('hunt', 4 + Math.round(sp.s / 2));
    }
    return;
  }
  if (onBlock) {
    const b = at(tx, ty);
    if (!mouse.down || b.type === 'core' || !inReach(tx, ty)) { ui.mine.t = 0; return; }
    if (ui.mine.x !== tx || ui.mine.y !== ty || !ui.mine.blk) ui.mine = { t: 0, x: tx, y: ty, blk: 1 };
    const tool = TOOLS[id], tm = tool && tool.kind !== 'util' ? Math.min(4, tool.mult) : 1;
    ui.mine.need = (BD[b.type].walk ? 0.25 : 0.7) / tm / workMul(); ui.mine.t += fdt;
    if (ui.mine.t >= ui.mine.need) { const look = BD[b.type].look; burst(tx, ty, look ? look.c : '#9a9a9a'); removeAt(tx, ty); gainXP('build', 1); ui.mine = { t: 0, x: tx, y: ty }; }
    return;
  }
  if (!inReach(tx, ty)) { ui.mine.t = 0; ui.mine.far = true; return; }
  ui.mine.far = false;
  const g = gnd(tx, ty), gi = GI[g];
  // Poner suelo (con clic izquierdo)
  if (mouse.down && id) {
    if (groundTarget(id, g, tx, ty)) { if (_placeT <= 0) { _placeT = 0.12; placeGround(id, tx, ty, g); } ui.mine.t = 0; return; }
    if (GROUND_PLACE[id] && !gi.drop) { ui.mine.t = 0; return; }
  }
  if (!gi.drop) { ui.mine.t = 0; return; }
  // Mientras mantienes el clic, solo se pica la capa (y el tipo: roca, árbol, planta o suelo) en la que
  // empezaste, o lo que está por encima. Lo de abajo no: para bajar, suelta y vuelve a pulsar.
  const lvNow = lvAt(tx, ty), cls0 = tileClass(gi);
  if (!ui.mlock) ui.mlock = { lv: lvNow, cls: cls0 };
  if (lvNow < ui.mlock.lv || cls0 !== ui.mlock.cls) { ui.mine.t = 0; ui.mine.x = tx; ui.mine.y = ty; ui.mine.lock = true; return; }
  ui.mine.lock = false;
  const tool = TOOLS[id], cls = tileClass(gi), k = tool && tool.kind;
  if (!toolOK(gi, tool)) {
    ui.mine.t = 0; ui.mine.x = tx; ui.mine.y = ty; ui.mine.block = true;
    toastErr(`Necesitas ${NEED_N[gi.need.k]} de nivel ${gi.need.lv} (${LV_MAT[gi.need.lv]}) para ${gi.n.toLowerCase()}`); return;
  }
  ui.mine.block = false;
  if (ui.mine.x !== tx || ui.mine.y !== ty) ui.mine = { t: 0, x: tx, y: ty };
  ui.mine.t += fdt;
  const fits = !!tool && CLASS_KINDS[cls].includes(k);
  let need = mineTime(g) * diff() / (buff('miner') ? 2 : 1) / (1 + 0.06 * lvOf(CLASS_SKILL[cls])) / workMul() / (cls === 'tree' || cls === 'plant' ? CM().wood : CM().mine);
  if (fits) need /= tool.mult * TK_EFF[k];
  ui.mine.need = need;
  if (ui.mine.t >= need) {
    ui.mine.t = 0;
    const fort = CM().luck + (fits && tool.fort || 0) + (hasFlag('fortuneAmulet') ? 0.25 : 0) + (buff('luck') ? 0.5 : 0) + (cls === 'plant' ? 0.03 * lvOf('gather') : 0), smelt = fits && tool.smelt;
    const give = id2 => invAdd(smelt ? smeltOf(id2) : id2, Math.random() < fort ? 2 : 1);
    // Herramientas de área: la roca (o la madera) de alrededor también se pica
    const area = fits ? (tool.area || TK_AREA[k] || 0) : 0;
    for (let dy = -area; dy <= area; dy++) for (let dx = -area; dx <= area; dx++) {
      if (!dx && !dy) continue;
      const x2 = tx + dx, y2 = ty + dy, g2 = GI[gnd(x2, y2)]; if (!g2.drop || at(x2, y2) || !toolOK(g2, tool) || lvAt(x2, y2) < ui.mlock.lv || tileClass(g2) !== ui.mlock.cls) continue;
      if (tileClass(g2) === cls || (cls !== 'rock' && (g2.tree || g2.plant))) { give(g2.drop); if (g2.hp) damageTile(x2, y2); }
    }
    if (give(gi.drop) > 0) { toastErr('Inventario lleno'); return; }
    const ex = gi.extra; if (ex && Math.random() < ex[1]) invAdd(ex[0], 1);
    burst(tx, ty, gi.tree ? hexRGB(gi.tree.a) : gi.c);
    if (gi.hp && !gi.solid && !gi.tree && !gi.plant && !gi.liquid && !gi.built) setDepth(tx, ty, depthAt(tx, ty) + 1);
    // Roca más alta que tu capa: se rebaja una capa por golpe (sigue siendo roca) hasta llegar a la tuya;
    // en tu capa se rompe y queda el suelo del túnel una capa por debajo
    if (cls === 'rock' && gi.solid && lvNow > ui.mlock.lv) setLvMod(tx, ty, lvNow - 1);
    else if (gi.hp) { damageTile(tx, ty); if (gi.solid && !GI[gnd(tx, ty)].solid && lvNow > LV_FOOT) setLvMod(tx, ty, Math.max(LV_FOOT, lvNow - 1)); }
    // Cansancio, experiencia y pequeños accidentes
    if (survOn()) {
      const pc = S.pc; pc.stam = Math.max(0, pc.stam - 1); pc.energy = Math.max(0, pc.energy - 0.04 * (1 - 0.04 * lvOf('build'))); pc.food = Math.max(0, pc.food - 0.03);
      if (!fits && cls === 'tree' && Math.random() < 0.04) hurt('splinter', Math.random() < 0.5 ? 'handL' : 'handR', 0.6, 'Astillas');
      if ((g === G.CACTUS || g === G.REDCACTUS || g === G.BLOODTHORN) && !fits && Math.random() < 0.3) hurt(g === G.BLOODTHORN ? 'rash' : 'thorn', 'handR', 0.7, 'Espinas');
    }
    gainXP(CLASS_SKILL[cls], cls === 'rock' ? (gi.dot ? 6 : 3) : cls === 'tree' ? 3 : cls === 'plant' ? 2 : 1);
    if (tool) wearHeld(1); // cada casilla extraída gasta un uso de la herramienta
  }
}
function frame(now) {
  const fdt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  if (!S || ui.open === 'title') { requestAnimationFrame(frame); return; } // en la pantalla de inicio no se simula nada
  // En multijugador el mundo no se para nunca (como en Minecraft); en solitario, el menú de pausa sí lo para
  if (!ui.open || ui.open === 'inv' || ui.open === 'book' || (typeof inGame === 'function' && inGame())) {
    if (!ui.open) { updatePlayer(fdt); fishTick(fdt); breakTick(fdt); updateMining(fdt); tickBuffs(fdt); magT -= fdt; if (magT <= 0) { magT = 0.25; magnetTick(); } endTick(fdt); } else { pmove.moving = pmove.sprint = false; P.mvx = P.mvy = 0; }
    survTick(fdt, pmove.moving, pmove.sprint); weatherTick(fdt); tickBursts(fdt); combatTick(fdt); npcTick(fdt);
    acc += fdt; let n = 0; while (acc >= DT && n < 4) { tick(DT); acc -= DT; n++; } if (n >= 4) acc = 0;
  }
  const cf = typeof OPT !== 'undefined' ? OPT.camFollow : 8; view.x += (S.player.x - view.x) * Math.min(1, fdt * cf); view.y += (S.player.y - view.y) * Math.min(1, fdt * cf);
  updateHover();
  // Carga progresiva de chunks alrededor del jugador (2 por fotograma como máximo)
  chunkMaintenance(S.player.x, S.player.y, Math.ceil(Math.max(cw, ch) / view.z / T / CS / 2) + 1, fdt);
  mapQueueTick();
  { const pcx = Math.floor(S.player.x / T / CS), pcy = Math.floor(S.player.y / T / CS); for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const c = peekChunk(pcx + dx, pcy + dy); if (c && !c.faunaDone) spawnFauna(c); } }
  // Con una ventana abierta el mundo se ve detrás: no hace falta dibujarlo a 60 FPS
  _rT -= fdt;
  if (ui.open !== 'map' && (!ui.open || _rT <= 0)) { _rT = ui.open === 'inv' || ui.open === 'pause' ? 1 / 30 : ui.open ? 0.25 : 0; render(ui.open ? 0 : fdt); }
  hoverFrame(fdt);
  uiT -= fdt; if (uiT <= 0) {
    uiT = 0.15;
    if (S._sortPending && ui.open !== 'inv') sortInv();
    updateInfo(); weatherHud(); refreshHotbar(); refreshVitals(); refreshSpellBar(); if (ui.goalDirty) renderGoal(); refreshInvUI(false);
  }
  miniT -= fdt; if (miniT <= 0 && !$('mini').hidden) { miniT = 0.1; drawMini(); }
  saveT += fdt; if (saveT > (typeof OPT !== 'undefined' ? OPT.autosave : 30)) { saveT = 0; saveGame(true); }
  fpsN++; fpsT += fdt; if (fpsT >= 0.5) { if (ui.fps) $('fps').textContent = `${Math.round(fpsN / fpsT)} FPS · ${blocks.length} bloques · ${_vis.length} visibles · ${WORLD.size} chunks en memoria`; fpsN = 0; fpsT = 0; }
  requestAnimationFrame(frame);
}
$('bHelp').onclick = () => openModal('help');
$('bBook').onclick = () => openBook();
$('bInv').onclick = () => openInventory(null);
$('bMap').onclick = () => openMap();
$('bSave').onclick = () => saveGame();
$('bWorlds').onclick = () => openTitle();
$('hotbar').addEventListener('mousedown', e => { if (!S) return; const s = e.target.closest('.hs'); if (s) { S.sel = +s.dataset.k.split(':')[1]; ui.hand = false; } else if (e.target.id === 'handBtn') ui.hand = !ui.hand; });

function start(data) {
  resize();
  migrateOldSave();
  // Al actualizar la página publicada se vuelve al mismo mundo; si no, a la pantalla de inicio
  let ok = false;
  if (data && data.worldId && data.save) { try { ok = deserialize(data.save); if (ok) currentWorld = data.worldId; } catch (e) { console.warn(e); } }
  if (ok) enterWorld(); else openTitle();
  window.claude?.hot?.snapshot?.(() => S && currentWorld ? { worldId: currentWorld, save: serialize() } : {});
  addEventListener('beforeunload', () => saveGame(true));
  requestAnimationFrame(t => { lastT = t; frame(t); });
}
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
