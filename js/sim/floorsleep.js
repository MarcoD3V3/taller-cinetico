'use strict';
// =====================================================================================
//  Dormir en el suelo (Z): en cualquier sitio, sin cama. Descansas menos que en una cama,
//  no guarda dónde reapareces y puedes despertar con algo: tortícolis, lumbago, resfriado
//  o gripe. Más riesgo a la intemperie, con frío o mojado; menos bajo techo o junto al fuego.
// =====================================================================================
ILL_DIRECT.add('dormir en el suelo');
function sleepFloor() {
  if (!S || !survOn()) { toast('La supervivencia está desactivada en este mundo'); return; }
  const pc = pcInit(), p = S.player;
  if (ANIMALS.some(a => a.ag) || FOES.some(f => dist(f.x, f.y, p.x, p.y) < 10 * T)) { toastErr('No puedes dormir con enemigos cerca'); return; }
  if (P.swim) { toastErr('No puedes dormir en el agua'); return; }
  if (pc.energy > 85 && daylight() > 0.5) { toast('No tienes sueño todavía.'); return; }
  const dl = S.gen.dayLen || DAY_LEN, base = Math.floor(S.time / dl) * dl; let to = base + 0.22 * dl; if (to <= S.time + 5) to += dl;
  const slept = daylight() > 0.5 ? dl * 0.2 : to - S.time;
  const roof = typeof indoorRegion === 'function' && !!indoorRegion(), warm = typeof _heatV !== 'undefined' && _heatV > 4, cold = ambient() < 10, wet = WX.wet > 30;
  ui.open = 'sleep'; $('sleepFx').hidden = false; $('sleepFx').classList.add('on');
  setTimeout(() => {
    if (daylight() <= 0.5) S.time = to; else S.time += slept;
    pc.energy = Math.max(pc.energy, 70); pc.stam = maxStam() * 0.8; pc.food = Math.max(0, pc.food - slept * 0.012); pc.water = Math.max(0, pc.water - slept * 0.018);
    pc.hp = Math.min(maxHp(), pc.hp + slept * 0.02);
    for (const pt of PARTS) for (const w of pc.parts[pt]) w.left -= slept * 0.25;
    // ¿Con qué amaneces?
    const risk = (roof ? 0.45 : 1) * (warm ? 0.6 : 1) * (cold ? 1.6 : 1) * (wet ? 1.5 : 1), got = [];
    const roll = (id, pr) => { if (got.length < 2 && Math.random() < Math.min(0.9, pr * risk)) { const had = pc.ills && pc.ills[id]; catchIll(id, 'dormir en el suelo'); if (!had && pc.ills && pc.ills[id]) got.push(ILLS[id].n); } };
    roll('stiffNeck', 0.45); roll('lumbago', 0.3); roll(cold || wet ? 'flu' : 'cold', cold || wet ? 0.3 : 0.25);
    $('sleepFx').classList.remove('on');
    setTimeout(() => { $('sleepFx').hidden = true; if (ui.open === 'sleep') ui.open = null; toast(got.length ? `Has dormido en el suelo y amaneces con: ${got.join(' y ')}. Una cama lo evita.` : 'Has dormido en el suelo. Te duele un poco todo, pero estás bien.', got.length > 0); }, 600);
  }, 1800);
}
addEventListener('keydown', e => { if (e.key.toLowerCase() !== 'z' || e.ctrlKey || e.metaKey || e.repeat || !S || ui.open) return; const t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return; e.preventDefault(); sleepFloor(); });
KH_ALL[1][1].push([['z'], 'Dormir en el suelo']);
if (typeof KEY_ACTIONS !== 'undefined') KEY_ACTIONS[1][1].push(['z', 'Dormir en el suelo']);
