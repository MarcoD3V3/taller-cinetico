'use strict';
// =====================================================================================
//  Monturas, segunda parte.
//  · Nuevas: delfín e hipocampo (nadan: por el agua van rápido y sin cansarte), raptor (corre
//    mucho), guiverno (vuela, en las Cumbres de la Tormenta), mamut (lento pero no le afecta el
//    frío), salamandra de magma (no te quemas) y escarabajo gigante (las esporas no te afectan).
//  · Todas tienen una habilidad con Espacio mientras las montas: embestida (por tierra), picado
//    (las que vuelan) o turbo (las que nadan). Arrolla y empuja a los enemigos del camino.
//  · Un marcador abajo dice qué montas y cuándo puedes volver a usar la habilidad.
// =====================================================================================
Object.assign(SPECIES, {
  hippocampus: { glow: 1, n: 'Hipocampo', c: '#3ac8c0', c2: '#e0fff8', s: 9, v: 3.6, drops: [['shell', 2], ['scales', 2]], aq: 1, tail: 1 },
  raptor: { n: 'Raptor', c: '#6a8a3a', c2: '#e0d070', s: 8, v: 3.8, drops: [['meat', 2], ['scales', 1]], tail: 1 },
  wyvern: { n: 'Guiverno', c: '#4a6a9a', c2: '#9ae8ff', s: 10, v: 3.6, drops: [['stormShard', 1], ['drakeScale', 1]], bird: 1, fly: 1, tail: 1 },
  mammoth: { n: 'Mamut', c: '#7a5a3a', c2: '#f0e8d0', s: 13, v: 1.3, drops: [['fur', 4], ['meat', 3]], fluffy: 1, horn: 1 },
  salamander: { glow: 1, n: 'Salamandra de magma', c: '#c83a1a', c2: '#ffd040', s: 8, v: 2.2, drops: [['magmaCore', 1], ['scales', 1]], tail: 1 },
  beetle: { n: 'Escarabajo gigante', c: '#3a2a4a', c2: '#a070c8', s: 9, v: 1.8, drops: [['chitin', 2], ['sporeSilk', 1]], legs8: 1 },
});
for (const id in SPECIES) for (const d of SPECIES[id].drops || []) if (!ITEMS[d[0]]) d[0] = 'meat'; // por si algún material no existe
Object.assign(TAME, {
  dolphin: { food: ['fish', 'cookedFish'], role: 'mount', spd: 2.4, swim: 1, ch: 0.3, ab: 'turbo' },
  hippocampus: { food: ['kelp', 'fish'], role: 'mount', spd: 3, swim: 1, ch: 0.15, ab: 'turbo' },
  raptor: { food: ['meat', 'cookedMeat'], role: 'mount', spd: 2.6, ch: 0.2 },
  wyvern: { food: ['meat', 'stormShard'], role: 'mount', spd: 2.8, fly: 1, ch: 0.12, ab: 'dive' },
  mammoth: { food: ['berries', 'herbs'], role: 'mount', spd: 1.5, ch: 0.25, cold: 1 },
  salamander: { food: ['magmaCore', 'cookedMeat'], role: 'mount', spd: 2, ch: 0.2, fire: 1 },
  beetle: { food: ['mushroom', 'glowcap'], role: 'mount', spd: 1.9, ch: 0.3, spore: 1 },
});
for (const k in TAME) TAME[k].food = TAME[k].food.filter(f => ITEMS[f]);
TAME.griffin.ab = 'dive';
// El hipocampo vive en los mares cálidos y profundos; el raptor en selvas y sabanas
for (const [bk, sp, w] of [['warmOcean', 'hippocampus', 0.5], ['deepOcean', 'hippocampus', 0.4], ['jungle', 'raptor', 0.5], ['savanna', 'raptor', 0.4]]) { const b = BIOMES[BI_[bk]]; if (!b) continue; b.fauna = (b.fauna || []).concat([[sp, w]]); b.faunaSum = b.fauna.reduce((s, f) => s + f[1], 0); }

const MNT = { cd: 0, dash: 0, ang: 0, hit: null };
const mountTame = () => { const m = mountPet(); return m ? TAME[m.sp] : null; };
const mountSwim = () => { const t = mountTame(); return !!(t && t.swim); };
const onWater = (x, y) => { const c = peekChunk(Math.floor(x / T) >> CSH, Math.floor(y / T) >> CSH); if (!c) return false; const tx = Math.floor(x / T), ty = Math.floor(y / T), g = GI[c.g[((ty & CMASK) << CSH) | (tx & CMASK)]]; return g.liquid === 'water' && !g.walk; };
// Las que nadan entran al agua contigo (las demás no); fuera del agua, torpes
{ const p0 = passable; passable = (x, y, who) => { if (who === 'player' && S && mountSwim() && onWater(x, y)) return true; return p0(x, y, who); }; }
{ const s0 = speedMul; speedMul = () => { const v = s0(), t = mountTame(); if (!t || !t.swim) return v; return onWater(S.player.x, S.player.y + 5) ? v * 1.3 : v * 0.5 / t.spd; }; }
{ const s0 = swimState; swimState = () => mountSwim() ? 0 : s0(); }
{ const m0 = moveFactors; moveFactors = () => mountSwim() && onWater(S.player.x, S.player.y + 5) ? { mul: 1, grip: 6, slip: 0 } : m0(); }
// Montura que protege de su bioma: cuenta como llevar su talismán (lo mira sim/extreme.js)
const mountGuards = k => { const t = mountTame(); return !!t && ((k === 'eternalGlacier' && t.cold) || (k === 'infernalCaldera' && t.fire) || (k === 'fungalForest' && t.spore)); };
// ---------- Habilidad con Espacio ----------
const MNT_AB = { charge: ['Embestida', '💨'], dive: ['Picado', '🦅'], turbo: ['Turbo', '🌊'] };
{ const j0 = tryJump; tryJump = () => { if (S && mountPet()) { mountDash(); return; } return j0(); }; }
function mountDash() {
  const t = mountTame(); if (MNT.cd > 0) { fxText(S.player.x, S.player.y - 34, `${Math.ceil(MNT.cd)} s`, '#aaa'); return; }
  const mx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0), my = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  MNT.ang = mx || my ? Math.atan2(my, mx) : (P.faceA || 0); MNT.dash = 0.32; MNT.cd = 3.5; MNT.hit = new Set(); P.iframe = Math.max(P.iframe || 0, 0.35);
  const ab = t.ab || 'charge', c = ab === 'turbo' ? '#9ad8ff' : ab === 'dive' ? '#f0f0ff' : '#e8d8b0';
  fxBurst(S.player.x, S.player.y + 4, 22, { col: c, sp: 140, life: 0.45, size: 2.4, drag: 3 }); tone(ab === 'turbo' ? 300 : 160, 0.25, 'sawtooth', 0.05, 2); shake = Math.max(shake || 0, 0.2);
  if (ab === 'turbo' && typeof ripple === 'function') ripple(S.player.x, S.player.y + 4, 22, 1);
}
function mountTick(dt) {
  if (MNT.cd > 0) MNT.cd -= dt; if (!mountPet()) { MNT.dash = 0; return; }
  if (MNT.dash > 0) { MNT.dash -= dt; const sp = 15 * T * (mountTame().spd / 2), p = S.player; movePlayer(Math.cos(MNT.ang) * sp * dt, Math.sin(MNT.ang) * sp * dt);
    fxAdd({ x: p.x + (Math.random() - 0.5) * 10, y: p.y + 6, vx: -Math.cos(MNT.ang) * 60, vy: -Math.sin(MNT.ang) * 60, life: 0.35, t: 0, size: 2, col: 'rgba(230,220,200,.6)', drag: 2 });
    for (const f of FOES) { if (MNT.hit.has(f) || Math.hypot(f.x - p.x, f.y - p.y) > (f.D.s + 16)) continue; MNT.hit.add(f); damageFoe(f, 14 + mountTame().spd * 8, null, 'melee'); if (typeof knock === 'function') knock(f, f.x - p.x, f.y - p.y, 520); else { f.x += Math.cos(MNT.ang) * 30; f.y += Math.sin(MNT.ang) * 30; } } }
}
{ const u0 = updatePlayer; updatePlayer = fdt => { u0(fdt); if (S) { mountTick(fdt); mountHud(); } }; }
function mountHud() {
  let e = $('mountHud'); if (!e) { e = document.createElement('div'); e.id = 'mountHud'; document.body.appendChild(e); }
  const m = mountPet(), show = !!m && !ui.open; if (e.hidden === show) e.hidden = !show; if (!show) return;
  const t = TAME[m.sp], ab = MNT_AB[t.ab || 'charge'], extra = t.swim ? 'nada' : t.fly ? 'vuela' : t.cold ? 'inmune al frío' : t.fire ? 'inmune al calor' : t.spore ? 'inmune a las esporas' : 'corre', cd = Math.max(0, MNT.cd);
  const h = `<b>${esc(SPECIES[m.sp].n)}</b><span>${extra} · ×${t.spd} de velocidad</span><span class="${cd > 0 ? 'cd' : 'ok'}">${ab[1]} Espacio: ${ab[0]}${cd > 0 ? ` (${Math.ceil(cd)} s)` : ''}</span>`;
  if (e._h !== h) { e._h = h; e.innerHTML = h; }
}
