'use strict';
// =====================================================================================
//  Mochilas (datos en data/packs.js):
//   · Ranura nueva «Mochila» en el equipo, y se ve en la espalda (más grande y adornada
//     cuanto mejor es; de frente se ven las correas).
//   · V (o el botón junto a la barra rápida) abre su ventana: su propia cuadrícula de huecos
//     y sus módulos, cada uno con su gráfico: cantimplora, fiambrera, batería de maná,
//     botiquín, brújula, termómetro, menas, reloj, tasador, peso, recogida y filtros.
//   · Lo guardado se queda en cada mochila aunque te la quites.
//   · Llena pesa: frena un poco (las buenas casi nada; la mítica nada).
// =====================================================================================
EQ_SLOTS.push('pack'); EQ_N.pack = 'Mochila'; EQ_ICON.pack = '🎒'; GEAR_SLOT_N.pack = 'Mochila';
const packOf = id => id && ITEMS[id] && ITEMS[id].pack ? ITEMS[id].pack : null;
const packOn = () => S && S.equip ? packOf(S.equip.pack) : null;
function packSlots(P) { const all = S.packs || (S.packs = {}); let a = all[P.id]; if (!a) a = all[P.id] = []; while (a.length < P.slots) a.push(null); return a; }
function packSt(P) { const all = S.packSt || (S.packSt = {}); return all[P.id] || (all[P.id] = { water: 0, mana: 0, loot: true, filter: {}, herbs: true, autoDrink: false, autoEat: true, autoHeal: true }); }
let _packVer = 0;
const packCap = { water: P => 30 + P.i * 4, mana: P => 40 + P.i * 5 };
// Grupos para el filtro de recogida
const PACK_GROUPS = {
  ore: ['⛏', 'Menas y minerales', id => { const s = ITEMS[id] && ITEMS[id].s; return /^(ore|rock|gem|dust|ingot|nugget)$/.test(s || '') || /ore|Ore|raw[A-Z]|crushed/.test(id); }],
  plant: ['🌿', 'Plantas y semillas', id => /seed|Seed|herb|flower|Flower|sapling|berr|Berr|moss|lichen|mushroom|Mushroom|reed|fiber/.test(id)],
  food: ['🍖', 'Comida', id => !!(ITEMS[id] && ITEMS[id].food)],
  block: ['🧱', 'Bloques', id => !!BD[id]],
  gear: ['⚔', 'Armas y herramientas', id => !!(TOOLS[id] || (typeof WEAPONS !== 'undefined' && WEAPONS[id]) || (ITEMS[id] && (ITEMS[id].armor || ITEMS[id].gear)))],
  loot: ['💀', 'Restos de criaturas', id => /bone|fang|Fang|scale|Scale|hide|pelt|Pelt|feather|Feather|slime|essence|ectoplasm|Eye|eye|horn|Horn/.test(id)],
};
const packFilterHit = (P, st, id) => { for (const g in st.filter) if (st.filter[g] && PACK_GROUPS[g][2](id)) return true; return P.modules.includes('herbs') && st.herbs && PACK_GROUPS.plant[2](id); };
// ---------- Recoger: al filtro primero; con el inventario lleno, a la mochila ----------
{ const a0 = invAdd; invAdd = (id, n) => {
  const P = S && !ui.open ? packOn() : null; if (!P) return a0(id, n);
  const st = packSt(P);
  if ((P.modules.includes('filter') || P.modules.includes('herbs')) && packFilterHit(P, st, id)) { const l = slotsAdd(packSlots(P), id, n); if (l !== n) { _packVer++; packPop(id, n - l); } n = l; if (!n) return 0; }
  const left = a0(id, n);
  if (left > 0 && st.loot && P.modules.includes('loot')) { const l2 = slotsAdd(packSlots(P), id, left); if (l2 !== left) { _packVer++; packPop(id, left - l2); } return l2; }
  return left;
}; }
let _popT = 0; function packPop(id, n) { const t = performance.now(); if (t - _popT < 700) return; _popT = t; if (S && S.player && typeof fxText === 'function') fxText(S.player.x, S.player.y - 30, `🎒 +${n} ${ITEMS[id] ? ITEMS[id].n : ''}`, '#e0c890'); }
// ---------- Peso: llena frena un poco ----------
let _packFill = 0;
{ const s0 = speedMul; speedMul = () => { const P = packOn(); return P && P.heavy && survOn() ? s0() * (1 - P.heavy * _packFill) : s0(); }; }
// ---------- Usar algo de la mochila (comer, beber, curarse) ----------
function packUse(P, i) {
  const a = packSlots(P), s = a[i]; if (!s) return false; const tmp = { id: s.id, n: 1 };
  survUse(tmp); delete S.inv['-1'];
  if (tmp.n <= 0) { s.n--; if (s.n <= 0) a[i] = null; _packVer++; vitalsDirty = true; return true; } return false;
}
const packBest = (P, f) => { const a = packSlots(P); let bi = -1, bv = 0; a.forEach((s, i) => { if (!s) return; const v = f(ITEMS[s.id] || {}, s.id); if (v > bv) { bv = v; bi = i; } }); return bi; };
const foodVal = it => it.food ? (it.food.f || 0) + (it.food.raw ? -20 : 0) : 0, healVal = it => it.food ? it.food.hp || 0 : 0;
// ---------- Cada segundo: cantimplora, maná, comer y curarse solos ----------
setInterval(() => {
  if (!S || !S.pc || ui.open === 'title' || ui.open === 'dead') return; const P = packOn(); if (!P) { _packFill = 0; return; }
  const st = packSt(P), pc = S.pc, a = packSlots(P), m = P.modules; _packFill = slotsFill(a);
  if (m.includes('water')) { const px = Math.floor(S.player.x / T), py = Math.floor(S.player.y / T), near = typeof farmNearWater === 'function' && farmNearWater(px, py), rain = typeof WX !== 'undefined' && WX_T[WX.type] && WX_T[WX.type].wet;
    st.water = Math.min(packCap.water(P), st.water + (near ? 8 : 0) + (rain ? 2 * rain : 0));
    if (st.autoDrink && survOn() && pc.water < 30 && st.water >= 5) { const g = Math.min(st.water, 100 - pc.water, 25); pc.water += g; st.water -= g; toast(`🫗 Bebes de la cantimplora (+${Math.round(g)})`); } }
  if (m.includes('mana')) st.mana = Math.min(packCap.mana(P), st.mana + 0.4 + P.i * 0.05);
  if (survOn() && m.includes('lunch') && st.autoEat && pc.food < 30) { const i = packBest(P, foodVal); if (i >= 0) { const n = a[i].id; if (packUse(P, i)) toast(`🥫 Comes de la fiambrera: ${ITEMS[n].n}`); } }
  if (survOn() && m.includes('medic') && st.autoHeal && pc.hp < maxHp() * 0.35) { const i = packBest(P, healVal); if (i >= 0) { const n = a[i].id; if (packUse(P, i)) toast(`✚ El botiquín te cura: ${ITEMS[n].n}`); } }
}, 1000);
// ---------- Iconos: cada mochila según su tamaño y adornos; cada emblema con su glifo ----------
function drawPackIcon(c, P, s) {
  const r = s / 2, w = r * (1.05 + P.size * 0.16), h = Math.min(r * 1.85, r * (1.35 + P.size * 0.12)), x = -w / 2, y = -h / 2 + r * 0.12, dk = shade(P.c, -0.35), lt = shade(P.c, 0.25);
  c.save(); c.lineJoin = 'round';
  if (P.deco >= 4) { c.shadowColor = P.a; c.shadowBlur = r * (P.rar >= 5 ? 1.2 : 0.6); }
  // asa
  c.strokeStyle = dk; c.lineWidth = r * 0.16; c.beginPath(); c.arc(0, y + r * 0.05, r * 0.32, Math.PI, 0); c.stroke();
  // saco enrollado arriba (las grandes)
  if (P.size >= 3) { c.fillStyle = shade(P.a, -0.2); c.beginPath(); c.roundRect(x - r * 0.12, y - r * 0.22, w + r * 0.24, r * 0.34, r * 0.17); c.fill(); }
  // cuerpo
  let fill = P.c; if (P.rar >= 5) { const g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#ff9ad8'); g.addColorStop(0.35, '#ffe9a8'); g.addColorStop(0.7, '#9ae8ff'); g.addColorStop(1, '#c09aff'); fill = g; }
  c.fillStyle = fill; c.strokeStyle = 'rgba(0,0,0,.65)'; c.lineWidth = 1.1; c.beginPath(); c.roundRect(x, y, w, h, r * (0.28 + P.size * 0.03)); c.fill(); c.shadowBlur = 0; c.stroke();
  // solapa
  c.fillStyle = P.rar >= 5 ? 'rgba(255,255,255,.35)' : dk; c.beginPath(); c.moveTo(x, y + r * 0.25); c.quadraticCurveTo(0, y + h * 0.55, x + w, y + r * 0.25); c.lineTo(x + w, y + r * 0.2); c.quadraticCurveTo(x + w, y, x + w - r * 0.3, y); c.lineTo(x + r * 0.3, y); c.quadraticCurveTo(x, y, x, y + r * 0.2); c.fill();
  // bolsillos
  if (P.deco >= 1) { c.fillStyle = lt; c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 0.7; c.beginPath(); c.roundRect(-w * 0.32, y + h * 0.58, w * 0.64, h * 0.32, r * 0.12); c.fill(); c.stroke(); }
  if (P.deco >= 2) { c.fillStyle = dk; c.fillRect(x - r * 0.12, y + h * 0.45, r * 0.18, h * 0.38); c.fillRect(x + w - r * 0.06, y + h * 0.45, r * 0.18, h * 0.38); }
  // hebilla
  c.fillStyle = P.a; c.fillRect(-r * 0.13, y + h * 0.32, r * 0.26, r * 0.22);
  // remaches
  if (P.deco >= 3) { c.fillStyle = P.a; for (const [u, v] of [[0.12, 0.2], [0.88, 0.2], [0.12, 0.92], [0.88, 0.92]]) { c.beginPath(); c.arc(x + w * u, y + h * v, r * 0.07, 0, 7); c.fill(); } }
  // emblema
  c.font = `${r * (0.5 + P.size * 0.04)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(P.glyph, 0, y + h * (P.deco >= 1 ? 0.74 : 0.68));
  // destellos (legendarias y mítica)
  if (P.rar >= 4) { c.fillStyle = '#fff'; for (const [u, v] of [[-0.8, -0.7], [0.85, -0.2], [-0.6, 0.85]]) { c.globalAlpha = 0.9; c.beginPath(); c.moveTo(u * r, v * r - r * 0.16); c.lineTo(u * r + r * 0.05, v * r); c.lineTo(u * r, v * r + r * 0.16); c.lineTo(u * r - r * 0.05, v * r); c.fill(); } c.globalAlpha = 1; }
  c.restore();
}
function drawEmblemIcon(c, P, s) {
  const r = s / 2; c.save(); const g = c.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 0.9); g.addColorStop(0, shade(P.a, 0.4)); g.addColorStop(1, shade(P.a, -0.3));
  if (P.rar >= 3) { c.shadowColor = P.a; c.shadowBlur = r * 0.6; }
  c.fillStyle = g; c.strokeStyle = shade(P.c, -0.45); c.lineWidth = r * 0.16; c.beginPath(); c.arc(0, 0, r * 0.82, 0, 7); c.fill(); c.shadowBlur = 0; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 0.8; c.beginPath(); c.arc(0, 0, r * 0.62, 0, 7); c.stroke();
  c.font = `${r * 0.95}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#1a1418'; c.fillText(P.glyph, 0, r * 0.05);
  c.restore();
}
{ const d0 = drawItemPath; drawItemPath = (c, id, s) => { const it = ITEMS[id]; if (it && it.pack) return drawPackIcon(c, it.pack, s); if (it && it.emblem && PACKS[it.emblem]) return drawEmblemIcon(c, PACKS[it.emblem], s); return d0(c, id, s); }; }
// ---------- En la espalda ----------
{ const s0 = avatarSpec; avatarSpec = (look, equip) => { const sp = s0(look, equip); sp.pack = packOf(equip && equip.pack); return sp; }; }
function packBagPx(P2, P, x, y, w, h) {
  const dk = shade(P.c, -0.35), lt = shade(P.c, 0.22), mythic = P.rar >= 5;
  P2(x, y, w, h, mythic ? '#f0d8ff' : P.c); P2(x, y, w, 1, lt); P2(x, y + h - 1, w, 1, dk);
  P2(x, y, w, 2, dk); P2(x + (w >> 1), y + 2, 1, 1, P.a); // solapa y hebilla
  if (P.deco >= 1) { P2(x + 1, y + h - 4, w - 2, 3, lt); P2(x + 1, y + h - 4, w - 2, 1, dk); }
  if (P.deco >= 3) { P2(x, y + 2, 1, 1, P.a); P2(x + w - 1, y + 2, 1, 1, P.a); P2(x, y + h - 1, 1, 1, P.a); P2(x + w - 1, y + h - 1, 1, 1, P.a); }
  if (P.deco >= 4) { P2(x - 1, y + 3, 1, h - 4, P.a); P2(x + w, y + 3, 1, h - 4, P.a); }
  if (P.size >= 3) { P2(x - 1, y + h, w + 2, 2, shade(P.a, -0.25)); P2(x - 1, y + h, w + 2, 1, shade(P.a, 0.1)); } // saco de dormir enrollado debajo
  if (mythic) { P2(x + 1, y + 4, 1, 1, '#ff7ad8'); P2(x + w - 2, y + 5, 1, 1, '#7af0ff'); P2(x + 2, y + h - 3, 1, 1, '#ffe060'); }
}
{ const b0 = paintBackAcc; paintBackAcc = (P2, sp, d, f) => { b0(P2, sp, d, f); const P = sp.pack; if (!P || d !== 2) return;
  const depth = 2 + (P.size >= 2 ? 1 : 0) + (P.size >= 4 ? 1 : 0), h = Math.min(9, 6 + P.size), bob = f ? Math.abs([0, 1, 0, -1, 0][f]) : 0;
  packBagPx(P2, P, 4 - depth, 8 + bob, depth + 1, h); }; }
{ const a0 = paintAcc; paintAcc = (P2, PH, sp, d, hx, hw, bx, bw, front, side, back, f, cs) => { a0(P2, PH, sp, d, hx, hw, bx, bw, front, side, back, f, cs); const P = sp.pack; if (!P) return;
  const strap = shade(P.c, -0.45);
  if (back) { const w = Math.min(bw + 2, 6 + P.size), h = Math.min(9, 6 + P.size), x = bx + ((bw - w) >> 1); packBagPx(P2, P, x, 9, w, h); }
  else if (side) P2(bx + (bw >> 1), 9, 1, 6, strap);
  else { P2(bx + 1, 9, 1, 6, strap); P2(bx + bw - 2, 9, 1, 6, strap); if (P.deco >= 2) { P2(bx + 1, 12, bw - 2, 1, strap); P2(bx + (bw >> 1), 12, 1, 1, P.a); } } }; }
// ---------- Ventana ----------
const mPack = document.createElement('div'); mPack.id = 'mPack'; mPack.className = 'modal'; mPack.hidden = true; mPack.innerHTML = '<div class="modal-in packm" id="packBody"></div>'; document.body.appendChild(mPack);
MODALS.pack = 'mPack';
const PACK_MOD_N = { speed: ['🏃', 'Velocidad'], mana: ['✦', 'Maná'], hp: ['❤', 'Vida'], warm: ['🔥', 'Abrigo'], mine: ['⛏', 'Picar'], work: ['✋', 'Trabajo'], ranged: ['🏹', 'Distancia'], sick: ['🤧', 'Enfermar'], heal: ['✚', 'Curación'], luck: ['🍀', 'Suerte'], price: ['🪙', 'Precios'], detect: ['👁', 'Te ven'], dash: ['💨', 'Impulso'], energy: ['🌙', 'Cansancio'], hunger: ['🍖', 'Hambre'], thirst: ['💧', 'Sed'], fire: ['🔥', 'Inmune al fuego'], manaRegen: ['✦', 'Maná/s'] };
function packModTxt(k, v) { const [i, n] = PACK_MOD_N[k] || ['•', k]; if (k === 'fire') return `${i} ${n}`; if (k === 'mana' || k === 'hp' || k === 'warm') return `${i} ${n} +${v}`; if (k === 'luck') return `${i} ${n} +${Math.round(v * 100)} %`; const p = Math.round((v - 1) * 100); return `${i} ${n} ${p > 0 ? '+' : ''}${p} %`; }
function openPack() {
  if (!S) return; const P = packOn(); if (!P) { toastErr('No llevas mochila: equípala en la ranura de mochila (inventario, E)'); return; }
  openModal('pack'); _packSig = ''; packRender(true);
}
let _packSig = '';
const slotH = (s, k) => s ? `<div class="pks" data-pk="${k}" title="${esc(ITEMS[s.id] ? ITEMS[s.id].n : s.id)}">${itemImg(s.id, 26)}${s.n > 1 ? `<b>${s.n}</b>` : ''}</div>` : `<div class="pks e" data-pk="${k}"></div>`;
function packRender(force) {
  const P = packOn(); if (!P || ui.open !== 'pack') return; const st = packSt(P), a = packSlots(P), pc = S.pc || {};
  const sig = JSON.stringify([P.id, a, S.inv, st, Math.round(pc.water || 0), Math.round(pc.food || 0), Math.round(pc.hp || 0), Math.round(pc.mana || 0), Math.floor((S.time || 0) / 5)]);
  if (!force && sig === _packSig) return; _packSig = sig;
  const used = a.filter(Boolean).length, fill = slotsFill(a), cols = P.slots <= 12 ? 6 : P.slots <= 24 ? 8 : P.slots <= 36 ? 9 : P.slots <= 54 ? 10 : 8;
  const it = ITEMS[P.id], mods = (it.gear && it.gear.mods) || {}, rar = PACK_RAR[P.rar];
  const chips = Object.entries(mods).map(([k, v]) => `<span>${packModTxt(k, v)}</span>`).join('') + (it.gear.def ? `<span>🛡 Defensa +${it.gear.def}</span>` : '');
  const mods2 = P.modules.filter(m => m !== 'grid').map(m => PACK_MODS[m] ? PACK_MODS[m](P, st) : '').join('');
  $('packBody').innerHTML = `<div class="pkwrap d${P.deco} r${P.rar}" style="--pc:${P.c};--pa:${P.a};--rc:${rar[1]}">
    <header class="pkh"><div class="pkicon">${itemImg(P.id, 56)}</div><div class="pkt"><b>${esc(P.n)}</b><div class="pkchips"><span class="pkrar">${rar[0]}</span><span>🎒 ${used}/${P.slots} huecos</span>${P.heavy ? `<span title="Cuanto más llena, más frena">⚖ hasta −${Math.round(P.heavy * 100)} % velocidad</span>` : '<span>⚖ No pesa</span>'}${chips}</div></div><button class="ghost" data-pka="close">Cerrar <kbd>V</kbd></button></header>
    <div class="pkmain"><section class="pkleft"><div class="pkbar"><div class="pkfill"><i style="width:${(fill * 100).toFixed(0)}%"></i></div><button data-pka="sort">Ordenar</button><button data-pka="stash" title="Guarda lo que ya hay en la mochila">Guardar repetidos</button><button data-pka="empty">Sacarlo todo</button></div>
      <div class="pkgrid" style="--cols:${cols}">${a.map((s, i) => slotH(s, 'b' + i)).join('')}</div>
      <div class="pksub">Tu inventario <small>· clic: pasar la pila · clic derecho: pasar 1</small></div><div class="pkgrid inv" style="--cols:12">${S.inv.map((s, i) => slotH(s, 'i' + i)).join('')}</div></section>
      ${mods2 ? `<aside class="pkmods">${mods2}</aside>` : ''}</div></div>`;
  const cv = $('packBody').querySelector('canvas.pkcomp'); if (cv) drawCompass(cv);
}
// Mover entre la mochila y el inventario
mPack.addEventListener('mousedown', e => {
  const P = packOn(); if (!P) return; const el = e.target.closest('[data-pk]'), act = e.target.closest('[data-pka]'), tg = e.target.closest('[data-pkt]');
  if (act) { e.preventDefault(); packAct(P, act.dataset.pka); return; }
  if (tg) { e.preventDefault(); const st = packSt(P), [k, v] = tg.dataset.pkt.split(':'); if (k === 'filter') st.filter[v] = !st.filter[v]; else st[k] = !st[k]; packRender(true); return; }
  if (!el) return; e.preventDefault(); const k = el.dataset.pk, one = e.button === 2, a = packSlots(P);
  if (k[0] === 'b') { const i = +k.slice(1), s = a[i]; if (!s) return; const n = one ? 1 : s.n, left = slotsAdd(S.inv, s.id, n, false, typeof FILL_ORDER !== 'undefined' ? FILL_ORDER : null); const moved = n - left; if (!moved) { toastErr('Inventario lleno'); return; } s.n -= moved; if (!s.n) a[i] = null; }
  else { const i = +k.slice(1), s = S.inv[i]; if (!s) return; if (ITEMS[s.id] && ITEMS[s.id].pack && s.id === S.equip.pack) return; const n = one ? 1 : s.n, left = slotsAdd(a, s.id, n); const moved = n - left; if (!moved) { toastErr('La mochila está llena'); return; } s.n -= moved; if (!s.n) S.inv[i] = null; }
  invVersion++; _packVer++; tone(520 + Math.random() * 80, 0.04, 'sine', 0.025, 1.3); packRender(true);
});
mPack.addEventListener('contextmenu', e => e.preventDefault());
function packAct(P, k) {
  const a = packSlots(P), st = packSt(P), pc = S.pc;
  if (k === 'close') return closeModal();
  if (k === 'sort') { const m = new Map(); for (const s of a) if (s) m.set(s.id, (m.get(s.id) || 0) + s.n); a.fill(null); [...m].sort((x, y) => ((ITEMS[x[0]] || {}).cat ?? 99) - ((ITEMS[y[0]] || {}).cat ?? 99) || x[0].localeCompare(y[0])).forEach(([id, n]) => slotsAdd(a, id, n)); }
  if (k === 'stash') { const ids = new Set(a.filter(Boolean).map(s => s.id)); for (let i = 9; i < INV_N; i++) { const s = S.inv[i]; if (!s || !ids.has(s.id)) continue; const left = slotsAdd(a, s.id, s.n); s.n = left; if (!left) S.inv[i] = null; } invVersion++; }
  if (k === 'empty') { for (let i = 0; i < a.length; i++) { const s = a[i]; if (!s) continue; const left = slotsAdd(S.inv, s.id, s.n, false, typeof FILL_ORDER !== 'undefined' ? FILL_ORDER : null); s.n = left; if (!left) a[i] = null; } invVersion++; }
  if (k === 'drink') { const g = Math.min(st.water, 100 - pc.water, 25); if (g <= 0) return toastErr(st.water <= 0 ? 'La cantimplora está vacía' : 'No tienes sed'); pc.water += g; st.water -= g; vitalsDirty = true; }
  if (k === 'absorb') { const g = Math.min(st.mana, maxMana() - pc.mana); if (g <= 0) return toastErr(st.mana <= 0 ? 'La batería está vacía' : 'Ya tienes el maná lleno'); pc.mana += g; st.mana -= g; if (typeof fxText === 'function') fxText(S.player.x, S.player.y - 30, '+' + Math.round(g) + ' ✦', '#7af0ff'); }
  if (k === 'eat') { const i = packBest(P, foodVal); if (i < 0) return toastErr('No llevas comida en la mochila'); packUse(P, i); }
  if (k === 'heal') { const i = packBest(P, healVal); if (i < 0) return toastErr('No llevas nada que cure en la mochila'); packUse(P, i); }
  _packVer++; tone(640, 0.05, 'sine', 0.03, 1.4); packRender(true);
}
// ---------- Módulos: cada uno con su gráfico ----------
const tog = (k, on, txt) => `<button class="pktog ${on ? 'on' : ''}" data-pkt="${k}"><i></i>${txt}</button>`;
const card = (i, t, body, cls = '') => `<div class="pkm ${cls}"><div class="pkmh"><span>${i}</span>${t}</div>${body}</div>`;
const count = (P, f) => { const m = new Map(); for (const s of packSlots(P)) if (s && f(s.id)) m.set(s.id, (m.get(s.id) || 0) + s.n); return [...m].sort((a, b) => b[1] - a[1]); };
const PACK_MODS = {
  loot: (P, st) => card('📥', 'Recogida', `<p class="small mut">Con el inventario lleno, lo que recoges entra aquí.</p>${tog('loot', st.loot, 'Activada')}`),
  filter: (P, st) => card('🔀', 'Directo a la mochila', `<p class="small mut">Al recogerlos, estos van aquí y no al inventario:</p><div class="pkfil">${Object.entries(PACK_GROUPS).map(([k, [i, n]]) => `<button class="${st.filter[k] ? 'on' : ''}" data-pkt="filter:${k}">${i} ${n}</button>`).join('')}</div>`),
  herbs: (P, st) => { const l = count(P, PACK_GROUPS.plant[2]), tot = l.reduce((s, x) => s + x[1], 0); return card('🌿', 'Herbario', `<div class="pkbig">${tot}<small> plantas y semillas</small></div>${l.slice(0, 4).map(([id, n]) => `<div class="pkrow">${itemImg(id, 16)}<span>${esc(ITEMS[id].n)}</span><b>${n}</b></div>`).join('')}${tog('herbs', st.herbs, 'Guardar plantas al recogerlas')}`); },
  water: (P, st) => { const cap = packCap.water(P), f = st.water / cap; return card('🫗', 'Cantimplora', `<div class="pkflex"><svg class="pkcan" viewBox="0 0 40 60"><defs><clipPath id="pkcc"><rect x="6" y="10" width="28" height="46" rx="9"/></clipPath></defs><rect x="14" y="3" width="12" height="8" rx="2" class="cap"/><rect x="6" y="10" width="28" height="46" rx="9" class="body"/><g clip-path="url(#pkcc)"><path class="wv" d="M0 ${56 - f * 46} q 10 -3 20 0 t 20 0 V60 H0z"/></g></svg>
    <div><div class="pkbig">${Math.round(st.water)}<small> / ${cap}</small></div><p class="small mut">Se llena junto al agua o con lluvia.</p><button data-pka="drink">💧 Beber</button></div></div>${tog('autoDrink', st.autoDrink, 'Beber sola con sed')}`, 'blue'); },
  lunch: (P, st) => { const l = count(P, id => ITEMS[id] && ITEMS[id].food && ITEMS[id].food.f > 0), tot = l.reduce((s, x) => s + x[1], 0); return card('🥫', 'Fiambrera', `<div class="pkflex"><div class="pkplate">${l.slice(0, 5).map(([id]) => itemImg(id, 18)).join('') || '<small class="mut">vacía</small>'}</div><div><div class="pkbig">${tot}<small> raciones</small></div><button data-pka="eat">🍽 Comer</button></div></div>${tog('autoEat', st.autoEat, 'Comer sola con hambre (<30)')}`); },
  mana: (P, st) => { const cap = packCap.mana(P), f = st.mana / cap; return card('🔮', 'Batería de maná', `<div class="pkflex"><svg class="pkcry" viewBox="0 0 40 60"><path class="out" d="M20 2 L36 22 L20 58 L4 22Z"/><clipPath id="pkmc"><path d="M20 2 L36 22 L20 58 L4 22Z"/></clipPath><rect clip-path="url(#pkmc)" x="0" y="${58 - f * 56}" width="40" height="60" class="lvl"/><path class="shine" d="M20 6 L12 22 L20 50"/></svg>
    <div><div class="pkbig">${Math.round(st.mana)}<small> / ${cap}</small></div><p class="small mut">Se carga sola: +${(0.4 + P.i * 0.05).toFixed(1)} por segundo.</p><button data-pka="absorb">✦ Absorber</button></div></div>`, 'violet'); },
  medic: (P, st) => { const l = count(P, id => ITEMS[id] && ITEMS[id].food && ITEMS[id].food.hp > 0), hp = S.pc ? S.pc.hp / maxHp() : 1; return card('✚', 'Botiquín', `<div class="pkflex"><svg class="pkmed" viewBox="0 0 40 40"><rect x="2" y="8" width="36" height="28" rx="6"/><path d="M16 14h8v6h6v8h-6v6h-8v-6h-6v-8h6z"/></svg><div><div class="pkhp"><i style="width:${(hp * 100).toFixed(0)}%"></i></div><p class="small mut">${l.length ? l.slice(0, 3).map(([id, n]) => `${esc(ITEMS[id].n)} ×${n}`).join(' · ') : 'Mete comida que cure (sopas, carne asada…)'}</p><button data-pka="heal">✚ Curarme</button></div></div>${tog('autoHeal', st.autoHeal, 'Curarme sola por debajo del 35 %')}`, 'red'); },
  compass: () => card('🧭', 'Brújula', `<canvas class="pkcomp" width="150" height="150"></canvas><div class="pkleg small"><span style="--k:#ffd34a">🛏 Cama</span><span style="--k:#7af0ff">⚙ Núcleo</span><span style="--k:#ff7ad8">📍 Marca</span></div>`),
  thermo: () => { const pc = S.pc || { temp: 37 }, amb = typeof ambient === 'function' ? ambient() : 20, f = clamp((pc.temp - 33) / 7, 0, 1), fa = clamp((amb + 20) / 60, 0, 1); return card('🌡', 'Termómetro', `<div class="pkflex"><svg class="pkth" viewBox="0 0 30 80"><rect x="11" y="4" width="8" height="58" rx="4" class="tube"/><rect x="13" y="${60 - f * 54}" width="4" height="${f * 54 + 2}" rx="2" style="fill:${pc.temp < 35.5 ? '#6ab0ff' : pc.temp > 37.6 ? '#ff6a4a' : '#7fd07a'}"/><circle cx="15" cy="68" r="8" style="fill:${pc.temp < 35.5 ? '#6ab0ff' : pc.temp > 37.6 ? '#ff6a4a' : '#7fd07a'}"/></svg>
    <div><div class="pkbig">${pc.temp.toFixed(1)}°<small> tu cuerpo</small></div><div class="pkamb"><i style="left:${(fa * 100).toFixed(0)}%"></i></div><p class="small mut">Fuera: ${Math.round(amb)}° · ${amb < 5 ? 'abrígate o enciende fuego' : amb > 32 ? 'bebe más' : 'buena temperatura'}</p></div></div>`); },
  ore: (P) => { const l = count(P, PACK_GROUPS.ore[2]).slice(0, 6), mx = l.length ? l[0][1] : 1; return card('⛏', 'Menas', l.length ? `<div class="pkbars">${l.map(([id, n]) => `<div class="pkrow">${itemImg(id, 16)}<span>${esc(ITEMS[id].n)}</span><i><b style="width:${(n / mx * 100).toFixed(0)}%;background:${ITEMS[id].c || '#ccc'}"></b></i><em>${n}</em></div>`).join('')}</div>` : '<p class="small mut">Aún no llevas menas.</p>'); },
  clock: () => { const dl = S.gen.dayLen || DAY_LEN, ph = ((S.time % dl) / dl), day = Math.floor(S.time / dl) + 1, dayl = typeof daylight === 'function' ? daylight() : 1, toN = ((0.75 - ph + 1) % 1) * dl, a = ph * Math.PI * 2 - Math.PI / 2;
    return card('🕰', 'Reloj', `<div class="pkflex"><svg class="pkclk" viewBox="0 0 60 60"><circle cx="30" cy="30" r="27" class="face"/><path d="M30 30 L30 3 A27 27 0 0 1 30 57Z" class="day"/><circle cx="${30 + Math.cos(a) * 20}" cy="${30 + Math.sin(a) * 20}" r="5" style="fill:${dayl > 0.5 ? '#ffd34a' : '#c8d8ff'}"/><line x1="30" y1="30" x2="${30 + Math.cos(a) * 16}" y2="${30 + Math.sin(a) * 16}" class="hand"/></svg>
    <div><div class="pkbig">Día ${day}</div><p class="small mut">${dayl > 0.5 ? `Anochece en ${Math.max(1, Math.round(toN / 60 * 2))} min de juego` : 'Es de noche: cuidado ahí fuera'}</p></div></div>`); },
  value: (P) => { const a = packSlots(P).filter(Boolean), types = new Set(a.map(s => s.id)).size, tot = a.reduce((s, x) => s + x.n, 0), cats = {}; for (const s of a) { const c = ICATS[(ITEMS[s.id] || {}).cat] || 'Otros'; cats[c] = (cats[c] || 0) + s.n; }
    const C = ['#ffd34a', '#7af0ff', '#ff7ad8', '#7fd07a', '#ff8a4a', '#c08aff'], ent = Object.entries(cats).sort((x, y) => y[1] - x[1]).slice(0, 6); let acc = 0;
    const arcs = ent.map(([, n], i) => { const f = n / Math.max(1, tot), a0 = acc; acc += f; const p = t => `${20 + 15 * Math.cos(t * 6.283 - 1.571)} ${20 + 15 * Math.sin(t * 6.283 - 1.571)}`; return `<path d="M${p(a0)} A15 15 0 ${f > 0.5 ? 1 : 0} 1 ${p(acc - 0.0001)}" style="stroke:${C[i]}"/>`; }).join('');
    return card('⚖', 'Tasador', tot ? `<div class="pkflex"><svg class="pkdon" viewBox="0 0 40 40">${arcs}</svg><div><div class="pkbig">${tot}<small> objetos · ${types} tipos</small></div>${ent.map(([c, n], i) => `<div class="pkrow"><i class="dot" style="background:${C[i]}"></i><span>${esc(c)}</span><b>${n}</b></div>`).join('')}</div></div>` : '<p class="small mut">Vacía.</p>'); },
  gauge: (P) => { const f = slotsFill(packSlots(P)), pen = P.heavy * f, a = Math.PI * (1 - f); return card('🏋', 'Peso', `<div class="pkflex"><svg class="pkgau" viewBox="0 0 60 36"><path d="M6 32 A24 24 0 0 1 54 32" class="bg"/><path d="M6 32 A24 24 0 0 1 54 32" class="fg" style="stroke-dasharray:${(f * 75.4).toFixed(1)} 76"/><line x1="30" y1="32" x2="${30 + Math.cos(a) * 20}" y2="${32 - Math.sin(a) * 20}" class="hand"/></svg><div><div class="pkbig">${Math.round(f * 100)} %<small> llena</small></div><p class="small mut">${pen > 0.005 ? `Te frena un ${(pen * 100).toFixed(1)} %` : 'No te frena'}</p></div></div>`); },
};
function drawCompass(cv) {
  const c = cv.getContext('2d'), W = cv.width, R = W / 2 - 8, p = S.player, P = packOn(); c.clearRect(0, 0, W, W); c.save(); c.translate(W / 2, W / 2);
  const g = c.createRadialGradient(0, 0, 4, 0, 0, R); g.addColorStop(0, '#2a2620'); g.addColorStop(1, '#14120f'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill(); c.strokeStyle = P ? P.a : '#e0b54c'; c.lineWidth = 3; c.stroke();
  c.strokeStyle = '#ffffff22'; c.lineWidth = 1; for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, l = i % 4 ? 5 : 10; c.beginPath(); c.moveTo(Math.cos(a) * (R - l), Math.sin(a) * (R - l)); c.lineTo(Math.cos(a) * R, Math.sin(a) * R); c.stroke(); }
  c.fillStyle = '#d8d2c4'; c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; [['N', 0, -1], ['S', 0, 1], ['E', 1, 0], ['O', -1, 0]].forEach(([t, x, y]) => c.fillText(t, x * (R - 18), y * (R - 18)));
  const tg = []; const pc = S.pc || {}; if (pc.bed) tg.push([(pc.bed.x + 0.5) * T, (pc.bed.y + 0.5) * T, '#ffd34a']); const core = blocks.find(b => b.type === 'core'); if (core) tg.push([(core.x + 0.5) * T, (core.y + 0.5) * T, '#7af0ff']);
  const mk = (S.marks || []).map(m => [(m.x + 0.5) * T, (m.y + 0.5) * T]).sort((a, b) => dist(a[0], a[1], p.x, p.y) - dist(b[0], b[1], p.x, p.y))[0]; if (mk) tg.push([mk[0], mk[1], '#ff7ad8']);
  for (const [x, y, col] of tg) { const a = Math.atan2(y - p.y, x - p.x), d = dist(x, y, p.x, p.y) / T, l = R - 26; c.save(); c.rotate(a); c.fillStyle = col; c.beginPath(); c.moveTo(l, 0); c.lineTo(8, -5); c.lineTo(12, 0); c.lineTo(8, 5); c.fill(); c.restore(); c.fillStyle = col; c.font = '9px sans-serif'; c.fillText(Math.round(d) + ' m', Math.cos(a) * (l - 12), Math.sin(a) * (l - 12) + 10); }
  c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 4, 0, 7); c.fill(); c.restore();
}
// Mientras está abierta, se actualiza sola (y la brújula gira)
setInterval(() => { if (ui.open !== 'pack') return; packRender(false); const cv = $('packBody').querySelector('canvas.pkcomp'); if (cv) drawCompass(cv); }, 400);
// ---------- Abrir: V, o el botón junto a la barra rápida ----------
addEventListener('keydown', e => {
  if (e.key.toLowerCase() !== 'v' || e.ctrlKey || e.metaKey || e.altKey || e.repeat || !S) return; const t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
  if (ui.open === 'pack') { closeModal(); e.preventDefault(); return; } if (ui.open && ui.open !== 'inv') return; e.preventDefault(); openPack();
});
if (typeof KEY_ACTIONS !== 'undefined') KEY_ACTIONS[2][1].push(['v', 'Mochila']);
if (typeof KH_ALL !== 'undefined') try { KH_ALL[1][1].push([['v'], 'Abrir la mochila']); } catch (e) { }
{ const b0 = buildHotbar; buildHotbar = () => { b0(); const hb = $('hotbar'); if (!hb) return; let bt = $('packBtn'); const P = packOn();
  if (!P) { if (bt) bt.remove(); return; } if (!bt) { bt = document.createElement('button'); bt.id = 'packBtn'; bt.title = 'Mochila (V)'; bt.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); openPack(); }); hb.appendChild(bt); }
  bt.innerHTML = itemImg(P.id, 30); bt.style.setProperty('--pa', P.a); }; }
// Al ponerte o quitarte una mochila, la barra se rehace
let _packEq = null; setInterval(() => { if (!S || !S.equip) return; if (S.equip.pack !== _packEq) { _packEq = S.equip.pack; try { buildHotbar(); } catch (e) { } } }, 500);
