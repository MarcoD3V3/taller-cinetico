'use strict';
// =====================================================================================
//  Durabilidad: herramientas, armas, armaduras, escudos y guantes se gastan con el uso.
//  El desgaste se guarda por tipo de objeto (S.wear[id] = usos gastados de la pieza que
//  estás usando de ese tipo). Así sobrevive a mover, ordenar o guardar en cofres. Cuando
//  llega al máximo, esa pieza se rompe (se pierde una unidad) y la siguiente empieza nueva.
// =====================================================================================
const NO_WEAR = new Set(['wrench', 'spyglass', 'compass', 'prospector', 'veinStaff', 'lightWand', 'lantern']);
const _durC = {};
function maxDur(id) {
  if (id in _durC) return _durC[id];
  const it = ITEMS[id]; let d = 0;
  if (it && !NO_WEAR.has(id)) {
    const t = TOOLS[id];
    if (t) d = t.kind === 'util' ? (id === 'grapple' ? 150 : 0) : Math.round(40 * Math.pow(1.6, (t.lv || 1) - 1) * (t.area ? 1.5 : 1));
    else if (it.weapon) d = Math.round(60 + it.weapon.dmg * 30);
    else if (it.armor) d = Math.round(50 + (it.armor.def || 0) * 25);
    else if (it.gear && (it.gear.def || it.gear.block)) d = Math.round(60 + (it.gear.def || 0) * 25 + (it.gear.block || 0) * 400);
  }
  return (_durC[id] = d);
}
const wearOf = id => (S.wear && S.wear[id]) || 0;
const durLeft = id => maxDur(id) - wearOf(id);
// Gasta n usos del objeto id. where: 'inv' (se pierde una unidad del inventario) o un hueco de equipo
function wearItem(id, n = 1, where = 'inv') {
  const mx = maxDur(id); if (!mx || !S || S.sandbox) return;
  const W = S.wear || (S.wear = {});
  const before = W[id] || 0; W[id] = before + n;
  // Aviso al 10 % y al romperse
  if (before < mx * 0.9 && W[id] >= mx * 0.9 && W[id] < mx) toast(`⚠ ${ITEMS[id].n} está a punto de romperse`);
  if (W[id] < mx) { invVersion++; return; }
  W[id] = 0;
  if (where === 'inv') { const s = S.inv[S.sel]; if (s && s.id === id) { if (--s.n <= 0) S.inv[S.sel] = null; } else invTake(id, 1); }
  else if (S.equip[where] === id) { S.equip[where] = null; vitalsDirty = true; }
  toast(`💥 ¡Se ha roto: ${ITEMS[id].n}!`, true); sfx('boom'); invVersion++;
  if (where === 'inv' ? invCount(id) === 0 : !Object.values(S.equip).includes(id)) delete W[id];
}
// Lo que llevas en la mano
function wearHeld(n = 1) { const s = S.inv[S.sel]; if (s && !ui.hand && maxDur(s.id)) wearItem(s.id, n, 'inv'); }
// Golpe recibido: cada pieza de armadura (y guantes, capa, escudo con defensa) pierde un uso
function wearArmor() { for (const sl of EQ_SLOTS) { const id = S.equip[sl]; if (id && (ITEMS[id].armor || (ITEMS[id].gear && ITEMS[id].gear.def))) wearItem(id, 1, sl); } }
function wearShield() { for (const sl of EQ_SLOTS) { const id = S.equip[sl]; if (id && ITEMS[id].gear && ITEMS[id].gear.block) wearItem(id, 2, sl); } }
// Reparar: kits, piedras de afilar y esencia restauradora
function repairWith(s) {
  const r = ITEMS[s.id].repair; if (!r) return false;
  const W = S.wear || {}, cand = new Set();
  for (const x of S.inv) if (x && W[x.id] && (r.only !== 'tool' || TOOLS[x.id] || ITEMS[x.id].weapon)) cand.add(x.id);
  if (r.only !== 'tool') for (const sl of EQ_SLOTS) { const id = S.equip[sl]; if (id && W[id]) cand.add(id); }
  if (!cand.size) { toast('No llevas nada gastado que se pueda reparar con esto'); return true; }
  const list = [...cand].sort((a, b) => W[b] / maxDur(b) - W[a] / maxDur(a)), done = [];
  for (const id of r.all ? list : list.slice(0, 1)) { W[id] = Math.max(0, W[id] - Math.ceil(maxDur(id) * r.amt)); if (!W[id]) delete W[id]; done.push(ITEMS[id].n); }
  if (--s.n <= 0) S.inv[S.sel] = null;
  toast(`🔧 Reparado: ${done.slice(0, 4).join(', ')}${done.length > 4 ? '…' : ''}`); sfx('beep'); invVersion++; _tipCache.clear();
  return true;
}
// Barra de durabilidad en las ranuras (sin elementos extra: una variable CSS)
function durStyle(el, id) {
  const mx = id ? maxDur(id) : 0, w = mx ? wearOf(id) : 0;
  if (!w) { if (el._du) { el._du = 0; el.classList.remove('wd'); } return; }
  const f = Math.max(0, 1 - w / mx); if (el._du === f) return; el._du = f;
  el.classList.add('wd'); el.style.setProperty('--du', f.toFixed(3));
}
// Línea dinámica del tooltip
function durTip(id) { const mx = maxDur(id); if (!mx) return ''; const l = mx - wearOf(id), f = l / mx; return `<div class="dur ${f < 0.25 ? 'bad' : f < 0.6 ? 'warn' : 'good'}">Durabilidad: ${l}/${mx} usos</div>`; }
